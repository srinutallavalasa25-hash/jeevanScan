-- ==============================================================================
-- JEEVASCAN AI — SUPABASE DATABASE MIGRATION SCRIPT
-- Tagline: Find Faster. Rescue Smarter. | Team: RakshaFly AI
-- Safe, Idempotent, High-Security PostgreSQL Schema with Row Level Security (RLS)
-- Table Namespace: 'jeevascan_' prefix to guarantee zero collision with existing tables
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. OPERATOR ROLES & ACCESS CONTROL TABLE
CREATE TABLE IF NOT EXISTS public.jeevascan_user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('citizen', 'operator', 'coordinator', 'admin')),
    organization TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, role)
);

-- Enable RLS
ALTER TABLE public.jeevascan_user_roles ENABLE ROW LEVEL SECURITY;

-- Secure helper functions with fixed search_path to prevent search_path hijacking
CREATE OR REPLACE FUNCTION public.jeevascan_is_admin()
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.jeevascan_user_roles
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.jeevascan_is_authorized_operator()
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.jeevascan_user_roles
        WHERE user_id = auth.uid() 
        AND role IN ('operator', 'coordinator', 'admin')
    );
END;
$$;

-- Restrict function execution: Only authenticated users can call these functions
REVOKE ALL ON FUNCTION public.jeevascan_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.jeevascan_is_admin() TO authenticated;

REVOKE ALL ON FUNCTION public.jeevascan_is_authorized_operator() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.jeevascan_is_authorized_operator() TO authenticated;

-- Policies for jeevascan_user_roles
DROP POLICY IF EXISTS "Users can view their own roles or admins can view all" ON public.jeevascan_user_roles;
CREATE POLICY "Users can view their own roles or admins can view all"
    ON public.jeevascan_user_roles FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR public.jeevascan_is_admin());

DROP POLICY IF EXISTS "Admins can manage roles" ON public.jeevascan_user_roles;
CREATE POLICY "Admins can manage roles"
    ON public.jeevascan_user_roles FOR INSERT
    TO authenticated
    WITH CHECK (public.jeevascan_is_admin());

DROP POLICY IF EXISTS "Admins can update roles" ON public.jeevascan_user_roles;
CREATE POLICY "Admins can update roles"
    ON public.jeevascan_user_roles FOR UPDATE
    TO authenticated
    USING (public.jeevascan_is_admin())
    WITH CHECK (public.jeevascan_is_admin());

DROP POLICY IF EXISTS "Admins can delete roles" ON public.jeevascan_user_roles;
CREATE POLICY "Admins can delete roles"
    ON public.jeevascan_user_roles FOR DELETE
    TO authenticated
    USING (public.jeevascan_is_admin());

-- 3. SOS INCIDENTS TABLE
CREATE TABLE IF NOT EXISTS public.jeevascan_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sos_id UUID UNIQUE NOT NULL,                       -- Idempotency key from client
    payload_version INT DEFAULT 1 NOT NULL,
    reporter_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    emergency_type TEXT NOT NULL CHECK (
        emergency_type IN (
            'flood', 
            'trapped', 
            'medical', 
            'fire', 
            'building_collapse', 
            'missing_person', 
            'food_water_shortage', 
            'other'
        )
    ),
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'acknowledged', 'dispatched', 'resolved', 'cancelled')
    ),
    priority TEXT NOT NULL DEFAULT 'high' CHECK (
        priority IN ('critical', 'high', 'medium', 'low')
    ),
    latitude DOUBLE PRECISION CHECK (latitude IS NULL OR (latitude >= -90.0 AND latitude <= 90.0)),
    longitude DOUBLE PRECISION CHECK (longitude IS NULL OR (longitude >= -180.0 AND longitude <= 180.0)),
    accuracy_meters DOUBLE PRECISION CHECK (accuracy_meters IS NULL OR accuracy_meters >= 0),
    location_name TEXT,                                -- Manual fallback landmark
    hop_count INT DEFAULT 0 CHECK (hop_count >= 0 AND hop_count <= 3), -- Master prompt: max 3 prototype hops
    device_fingerprint_hash TEXT,                      -- Salted anonymous client device hash
    update_token_hash TEXT,                            -- Secret bearer token hash for anonymous location updates
    encrypted_payload TEXT,                            -- E2E payload for intermediate relays
    integrity_hash TEXT,                               -- HMAC / integrity digest
    valid_until TIMESTAMPTZ NOT NULL,                  -- TTL enforcement (24h default)
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for tactical queries
CREATE INDEX IF NOT EXISTS idx_jeevascan_incidents_sos_id ON public.jeevascan_incidents(sos_id);
CREATE INDEX IF NOT EXISTS idx_jeevascan_incidents_status ON public.jeevascan_incidents(status);
CREATE INDEX IF NOT EXISTS idx_jeevascan_incidents_priority ON public.jeevascan_incidents(priority);
CREATE INDEX IF NOT EXISTS idx_jeevascan_incidents_created_at ON public.jeevascan_incidents(created_at DESC);

-- Enable RLS
ALTER TABLE public.jeevascan_incidents ENABLE ROW LEVEL SECURITY;

-- Anyone (anonymous or authenticated) can report an emergency SOS
DROP POLICY IF EXISTS "Anyone can report an SOS incident" ON public.jeevascan_incidents;
CREATE POLICY "Anyone can report an SOS incident"
    ON public.jeevascan_incidents FOR INSERT
    WITH CHECK (
        valid_until > NOW()
    );

-- Sensitive coordinates and details: only viewable by authorized rescue operators or authenticated original reporter
DROP POLICY IF EXISTS "Operators or original reporters can view incidents" ON public.jeevascan_incidents;
CREATE POLICY "Operators or original reporters can view incidents"
    ON public.jeevascan_incidents FOR SELECT
    USING (
        public.jeevascan_is_authorized_operator() 
        OR (auth.uid() IS NOT NULL AND reporter_user_id = auth.uid())
    );

-- Only authorized rescue operators can update incident status/priority
DROP POLICY IF EXISTS "Authorized operators can update incident status" ON public.jeevascan_incidents;
CREATE POLICY "Authorized operators can update incident status"
    ON public.jeevascan_incidents FOR UPDATE
    USING (public.jeevascan_is_authorized_operator())
    WITH CHECK (public.jeevascan_is_authorized_operator());

-- Deletion is strictly prohibited to preserve audit trail
DROP POLICY IF EXISTS "No deletion of incident records" ON public.jeevascan_incidents;
CREATE POLICY "No deletion of incident records"
    ON public.jeevascan_incidents FOR DELETE
    USING (false);

-- 4. LIVE LOCATION UPDATES TABLE
CREATE TABLE IF NOT EXISTS public.jeevascan_location_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sos_id UUID REFERENCES public.jeevascan_incidents(sos_id) ON DELETE CASCADE NOT NULL,
    latitude DOUBLE PRECISION NOT NULL CHECK (latitude >= -90.0 AND latitude <= 90.0),
    longitude DOUBLE PRECISION NOT NULL CHECK (longitude >= -180.0 AND longitude <= 180.0),
    accuracy_meters DOUBLE PRECISION CHECK (accuracy_meters IS NULL OR accuracy_meters >= 0),
    update_token_hash TEXT,                            -- Required for anonymous update verification
    reported_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_jeevascan_location_updates_sos_id ON public.jeevascan_location_updates(sos_id);
CREATE INDEX IF NOT EXISTS idx_jeevascan_location_updates_reported_at ON public.jeevascan_location_updates(reported_at DESC);

ALTER TABLE public.jeevascan_location_updates ENABLE ROW LEVEL SECURITY;

-- Location update insertion policy: Fails closed against arbitrary UUID injection.
-- Requires either:
-- 1. An authenticated session matching the original incident's reporter_user_id, OR
-- 2. An anonymous reporter presenting a matching update_token_hash created during initial SOS.
DROP POLICY IF EXISTS "Authorized reporters can insert live location updates" ON public.jeevascan_location_updates;
CREATE POLICY "Authorized reporters can insert live location updates"
    ON public.jeevascan_location_updates FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.jeevascan_incidents i
            WHERE i.sos_id = jeevascan_location_updates.sos_id
            AND (
                -- Authenticated user who created the incident:
                (auth.uid() IS NOT NULL AND i.reporter_user_id = auth.uid())
                OR
                -- Anonymous reporter with matching update token:
                (
                    i.update_token_hash IS NOT NULL 
                    AND jeevascan_location_updates.update_token_hash IS NOT NULL
                    AND i.update_token_hash = jeevascan_location_updates.update_token_hash
                )
            )
        )
    );

DROP POLICY IF EXISTS "Operators can view live location updates" ON public.jeevascan_location_updates;
CREATE POLICY "Operators can view live location updates"
    ON public.jeevascan_location_updates FOR SELECT
    USING (public.jeevascan_is_authorized_operator());

-- 5. ACKNOWLEDGEMENT RECEIPTS TABLE
CREATE TABLE IF NOT EXISTS public.jeevascan_acknowledgement_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sos_id UUID REFERENCES public.jeevascan_incidents(sos_id) ON DELETE CASCADE NOT NULL,
    operator_id UUID REFERENCES auth.users(id) NOT NULL,
    receipt_signature TEXT NOT NULL,
    operator_notes TEXT,
    acknowledged_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(sos_id, operator_id)
);

ALTER TABLE public.jeevascan_acknowledgement_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Operators can view and issue acknowledgements" ON public.jeevascan_acknowledgement_receipts;
CREATE POLICY "Operators can view and issue acknowledgements"
    ON public.jeevascan_acknowledgement_receipts FOR ALL
    USING (public.jeevascan_is_authorized_operator());

-- 6. RELIEF REQUESTS TABLE (JeevaDrop AI)
CREATE TABLE IF NOT EXISTS public.jeevascan_relief_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sos_id UUID REFERENCES public.jeevascan_incidents(sos_id) ON DELETE SET NULL,
    requester_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    item_type TEXT NOT NULL CHECK (
        item_type IN ('drinking_water', 'food', 'first_aid', 'blankets', 'hygiene', 'other')
    ),
    quantity INT DEFAULT 1 NOT NULL CHECK (quantity >= 1 AND quantity <= 1000),
    urgency TEXT NOT NULL DEFAULT 'standard' CHECK (
        urgency IN ('critical', 'urgent', 'standard')
    ),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'assigned', 'in_transit', 'delivered')
    ),
    delivery_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.jeevascan_relief_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a relief request, BUT it must start in 'pending' status
DROP POLICY IF EXISTS "Anyone can request relief as pending" ON public.jeevascan_relief_requests;
CREATE POLICY "Anyone can request relief as pending"
    ON public.jeevascan_relief_requests FOR INSERT
    WITH CHECK (status = 'pending');

DROP POLICY IF EXISTS "Operators or requesters can view relief requests" ON public.jeevascan_relief_requests;
CREATE POLICY "Operators or requesters can view relief requests"
    ON public.jeevascan_relief_requests FOR SELECT
    USING (
        public.jeevascan_is_authorized_operator() 
        OR (auth.uid() IS NOT NULL AND requester_user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Operators can update relief status" ON public.jeevascan_relief_requests;
CREATE POLICY "Operators can update relief status"
    ON public.jeevascan_relief_requests FOR UPDATE
    USING (public.jeevascan_is_authorized_operator())
    WITH CHECK (public.jeevascan_is_authorized_operator());

-- 7. SHELTERS & HOSPITALS TABLE (Public Safety Directory)
CREATE TABLE IF NOT EXISTS public.jeevascan_shelters_and_hospitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('shelter', 'hospital', 'relief_camp', 'boat_dock')),
    latitude DOUBLE PRECISION NOT NULL CHECK (latitude >= -90.0 AND latitude <= 90.0),
    longitude DOUBLE PRECISION NOT NULL CHECK (longitude >= -180.0 AND longitude <= 180.0),
    capacity INT DEFAULT 100 CHECK (capacity >= 0),
    current_occupancy INT DEFAULT 0 CHECK (current_occupancy >= 0),
    contact_number TEXT,
    is_verified BOOLEAN DEFAULT TRUE NOT NULL,
    is_demo_data BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.jeevascan_shelters_and_hospitals ENABLE ROW LEVEL SECURITY;

-- Shelters and hospitals must be publicly accessible so victims can reach safety
DROP POLICY IF EXISTS "Public can view shelters and hospitals" ON public.jeevascan_shelters_and_hospitals;
CREATE POLICY "Public can view shelters and hospitals"
    ON public.jeevascan_shelters_and_hospitals FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Only operators can manage shelters" ON public.jeevascan_shelters_and_hospitals;
CREATE POLICY "Only operators can manage shelters"
    ON public.jeevascan_shelters_and_hospitals FOR ALL
    USING (public.jeevascan_is_authorized_operator());

-- 8. CASUALTY REVIEWS TABLE (AI-Assisted Human-in-the-Loop Verification)
CREATE TABLE IF NOT EXISTS public.jeevascan_casualty_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID REFERENCES public.jeevascan_incidents(id) ON DELETE SET NULL,
    image_url TEXT,
    model_confidence DOUBLE PRECISION CHECK (model_confidence IS NULL OR (model_confidence >= 0.0 AND model_confidence <= 1.0)),
    review_status TEXT NOT NULL DEFAULT 'pending_review' CHECK (
        review_status IN ('pending_review', 'verified_casualty', 'false_positive')
    ),
    reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewer_notes TEXT,
    reviewed_at TIMESTAMPTZ,
    is_simulated BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.jeevascan_casualty_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Operators can view and review casualties" ON public.jeevascan_casualty_reviews;
CREATE POLICY "Operators can view and review casualties"
    ON public.jeevascan_casualty_reviews FOR ALL
    USING (public.jeevascan_is_authorized_operator());

-- 9. IMMUTABLE AUDIT LOGS TABLE & TRIGGER AUTOMATION
CREATE TABLE IF NOT EXISTS public.jeevascan_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_entity TEXT NOT NULL,
    target_id TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.jeevascan_audit_logs ENABLE ROW LEVEL SECURITY;

-- Read: Authorized operators only
DROP POLICY IF EXISTS "Operators can read audit logs" ON public.jeevascan_audit_logs;
CREATE POLICY "Operators can read audit logs"
    ON public.jeevascan_audit_logs FOR SELECT
    USING (public.jeevascan_is_authorized_operator());

-- Direct Client Insert: Authorized operators only (for manual field notes)
DROP POLICY IF EXISTS "Authorized operators can insert audit logs" ON public.jeevascan_audit_logs;
CREATE POLICY "Authorized operators can insert audit logs"
    ON public.jeevascan_audit_logs FOR INSERT
    WITH CHECK (public.jeevascan_is_authorized_operator());

-- Database Trigger Function: Automatically records status & priority changes in audit logs
CREATE OR REPLACE FUNCTION public.jeevascan_trigger_incident_audit()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, pg_temp
AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) OR (OLD.priority IS DISTINCT FROM NEW.priority) THEN
        INSERT INTO public.jeevascan_audit_logs (
            operator_id,
            action,
            target_entity,
            target_id,
            details,
            created_at
        ) VALUES (
            auth.uid(),
            'STATUS_CHANGE',
            'jeevascan_incidents',
            NEW.sos_id::TEXT,
            jsonb_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status,
                'old_priority', OLD.priority,
                'new_priority', NEW.priority
            ),
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_jeevascan_incident_audit ON public.jeevascan_incidents;
CREATE TRIGGER trg_jeevascan_incident_audit
    AFTER UPDATE ON public.jeevascan_incidents
    FOR EACH ROW
    EXECUTE FUNCTION public.jeevascan_trigger_incident_audit();
