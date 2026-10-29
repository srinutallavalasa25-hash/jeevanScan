-- ==============================================================================
-- JEEVASCAN AI — PHASE 9.1 SECURITY HARDENING MIGRATION
-- Team: RakshaFly AI | Tagline: Find Faster. Rescue Smarter.
-- 
-- Objectives:
-- 1. Accuracy Boundary: Max 500m accuracy constraint on location updates.
-- 2. Incident Expiry & Status RLS: Reject updates for expired or terminal incidents.
-- 3. Abuse Protection: 10s interval & 500-update ceiling trigger.
-- 4. Token Hashing: Store only SHA-256 digests; scrub/hash incoming bearer tokens.
-- 5. Scoped Read RPC: Secure SECURITY DEFINER function for citizen/operator telemetry.
-- 6. Privacy Retention: Safe purge procedure for expired/closed telemetry.
-- ==============================================================================

-- 1. ACCURACY CONSTRAINT (Enforce <= 500m ceiling at database level)
ALTER TABLE public.jeevascan_location_updates 
DROP CONSTRAINT IF EXISTS chk_location_max_accuracy;

ALTER TABLE public.jeevascan_location_updates 
ADD CONSTRAINT chk_location_max_accuracy 
CHECK (accuracy_meters IS NULL OR (accuracy_meters >= 0 AND accuracy_meters <= 500));

-- 2. MIGRATION OF EXISTING TOKENS: Convert legacy plaintext 'tok_...' tokens to SHA-256
UPDATE public.jeevascan_incidents 
SET update_token_hash = encode(digest(update_token_hash, 'sha256'), 'hex')
WHERE update_token_hash IS NOT NULL 
AND update_token_hash LIKE 'tok_%';

UPDATE public.jeevascan_location_updates 
SET update_token_hash = encode(digest(update_token_hash, 'sha256'), 'hex')
WHERE update_token_hash IS NOT NULL 
AND update_token_hash LIKE 'tok_%';

-- 3. SERVER-SIDE RATE LIMITING, QUOTA & TOKEN NORMALIZATION TRIGGER
CREATE OR REPLACE FUNCTION public.jeevascan_enforce_location_rate_limit_and_hash()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, pg_temp
AS $$
DECLARE
    v_count INT;
    v_last_reported_at TIMESTAMPTZ;
BEGIN
    -- 1. Check lifetime update quota per incident (max 500 updates)
    SELECT COUNT(*), MAX(reported_at)
    INTO v_count, v_last_reported_at
    FROM public.jeevascan_location_updates
    WHERE sos_id = NEW.sos_id;

    IF v_count >= 500 THEN
        RAISE EXCEPTION 'Update quota exceeded: Maximum 500 location updates allowed per incident (current: %)', v_count;
    END IF;

    -- 2. Enforce minimum interval between updates (10 seconds)
    IF v_last_reported_at IS NOT NULL AND NEW.reported_at < (v_last_reported_at + INTERVAL '10 seconds') THEN
        RAISE EXCEPTION 'Rate limit exceeded: Location updates must be at least 10 seconds apart';
    END IF;

    -- 3. Normalize update_token_hash to SHA-256 so raw bearer token is never stored in plaintext
    IF NEW.update_token_hash IS NOT NULL THEN
        IF LENGTH(NEW.update_token_hash) = 64 AND NEW.update_token_hash ~ '^[0-9a-f]{64}$' THEN
            -- Already 64-character lowercase SHA-256 hex string, keep as-is
            NULL;
        ELSE
            -- Hash raw bearer token into SHA-256 hex string
            NEW.update_token_hash := encode(digest(NEW.update_token_hash, 'sha256'), 'hex');
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_jeevascan_location_rate_limit ON public.jeevascan_location_updates;
CREATE TRIGGER trg_jeevascan_location_rate_limit
    BEFORE INSERT ON public.jeevascan_location_updates
    FOR EACH ROW
    EXECUTE FUNCTION public.jeevascan_enforce_location_rate_limit_and_hash();

-- 4. HARDENED RLS INSERT POLICY ON public.jeevascan_location_updates
DROP POLICY IF EXISTS "Authorized reporters can insert live location updates" ON public.jeevascan_location_updates;
CREATE POLICY "Authorized reporters can insert live location updates"
    ON public.jeevascan_location_updates FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.jeevascan_incidents i
            WHERE i.sos_id = jeevascan_location_updates.sos_id
            -- A. Incident TTL Enforcement (Must be within 24h validity window)
            AND i.valid_until > NOW()
            -- B. Incident Status Enforcement (Must be active, NOT resolved or cancelled)
            AND i.status IN ('pending', 'acknowledged', 'dispatched')
            -- C. Authorization Verification
            AND (
                -- Authenticated user who originally submitted incident:
                (auth.uid() IS NOT NULL AND i.reporter_user_id = auth.uid())
                OR
                -- Anonymous reporter presenting matching token:
                (
                    i.update_token_hash IS NOT NULL 
                    AND jeevascan_location_updates.update_token_hash IS NOT NULL
                    AND (
                        -- Match against normalized SHA-256 hash
                        i.update_token_hash = jeevascan_location_updates.update_token_hash
                        OR
                        -- Fallback if trigger has not fired yet or direct comparison
                        i.update_token_hash = encode(digest(jeevascan_location_updates.update_token_hash, 'sha256'), 'hex')
                        OR
                        -- Backward compatibility for unmigrated legacy incident tokens
                        (i.update_token_hash LIKE 'tok_%' AND i.update_token_hash = jeevascan_location_updates.update_token_hash)
                    )
                )
            )
        )
    );

-- 5. HARDENED SCOPED LOCATION HISTORY RPC FUNCTION
CREATE OR REPLACE FUNCTION public.jeevascan_get_incident_location_history(
    p_sos_id UUID,
    p_token TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    sos_id UUID,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    accuracy_meters DOUBLE PRECISION,
    reported_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_is_operator BOOLEAN;
    v_is_reporter BOOLEAN;
    v_token_matches BOOLEAN := FALSE;
    v_incident_exists BOOLEAN := FALSE;
    v_is_expired BOOLEAN := FALSE;
    v_stored_hash TEXT;
    v_reporter_id UUID;
BEGIN
    -- 1. Check if caller is an authorized operator
    v_is_operator := public.jeevascan_is_authorized_operator();

    -- 2. Inspect incident metadata
    SELECT 
        TRUE, 
        i.reporter_user_id, 
        i.update_token_hash, 
        (i.valid_until <= NOW())
    INTO 
        v_incident_exists, 
        v_reporter_id, 
        v_stored_hash, 
        v_is_expired
    FROM public.jeevascan_incidents i
    WHERE i.sos_id = p_sos_id;

    IF NOT v_incident_exists THEN
        RETURN; -- Non-existent incident: return 0 rows
    END IF;

    -- 3. Check authenticated reporter ownership
    v_is_reporter := (auth.uid() IS NOT NULL AND v_reporter_id = auth.uid());

    -- 4. Check anonymous token verification
    IF p_token IS NOT NULL AND v_stored_hash IS NOT NULL THEN
        IF v_stored_hash = encode(digest(p_token, 'sha256'), 'hex') 
           OR v_stored_hash = p_token 
           OR (LENGTH(p_token) = 64 AND v_stored_hash = p_token) THEN
            v_token_matches := TRUE;
        END IF;
    END IF;

    -- 5. Authorization gate: Caller must be operator, authenticated creator, or provide valid token
    IF NOT (v_is_operator OR v_is_reporter OR v_token_matches) THEN
        RETURN; -- Unauthorized: return 0 rows
    END IF;

    -- 6. For non-operators, verify incident is not expired
    IF NOT v_is_operator AND v_is_expired THEN
        RETURN; -- Expired: return 0 rows
    END IF;

    -- 7. Return sanitized location telemetry (strictly omitting update_token_hash)
    RETURN QUERY
    SELECT 
        loc.id,
        loc.sos_id,
        loc.latitude,
        loc.longitude,
        loc.accuracy_meters,
        loc.reported_at
    FROM public.jeevascan_location_updates loc
    WHERE loc.sos_id = p_sos_id
    ORDER BY loc.reported_at DESC;
END;
$$;

-- Restrict function execution: Only anon and authenticated roles may execute; revoke from public
REVOKE ALL ON FUNCTION public.jeevascan_get_incident_location_history(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.jeevascan_get_incident_location_history(UUID, TEXT) TO anon, authenticated;

-- 6. DATA RETENTION & PURGE FUNCTION
CREATE OR REPLACE FUNCTION public.jeevascan_purge_expired_location_updates()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_deleted_count INT := 0;
BEGIN
    -- Purge location updates older than 7 days where incident has expired or is resolved/cancelled
    WITH deleted_rows AS (
        DELETE FROM public.jeevascan_location_updates loc
        WHERE loc.reported_at < (NOW() - INTERVAL '7 days')
        AND loc.sos_id IN (
            SELECT i.sos_id 
            FROM public.jeevascan_incidents i
            WHERE i.valid_until < (NOW() - INTERVAL '7 days')
            OR (i.status IN ('resolved', 'cancelled') AND i.updated_at < (NOW() - INTERVAL '7 days'))
        )
        RETURNING loc.id
    )
    SELECT COUNT(*) INTO v_deleted_count FROM deleted_rows;

    RETURN v_deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.jeevascan_purge_expired_location_updates() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.jeevascan_purge_expired_location_updates() TO authenticated;

