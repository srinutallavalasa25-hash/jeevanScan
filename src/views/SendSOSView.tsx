import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Waves, 
  UserCheck, 
  HeartPulse, 
  Flame, 
  Building2, 
  UserX, 
  UtensilsCrossed, 
  HelpCircle,
  MapPin, 
  Navigation, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ArrowRight,
  ShieldAlert,
  Compass,
  Copy,
  Check
} from 'lucide-react';
import type { TranslationDict } from '../lib/i18n';
import type { NavView } from '../components/Navbar';
import type { EmergencyType, IncidentPriority, CreateIncidentPayload } from '../types/database';
import type { LocalDeliveryState } from '../lib/offline/localQueueTypes';
import { enqueueOfflineSOS, getAllLocalQueueItems } from '../lib/offline/localQueueManager';
import { formatSOSTextForClipboard } from '../lib/offline/memoryQueue';
import { TemporaryMemoryModal } from '../components/TemporaryMemoryModal';
import { LiveLocationSharingCard } from '../components/LiveLocationSharingCard';
import { hashBearerToken, saveCitizenToken } from '../lib/location/liveLocationManager';

interface SendSOSViewProps {
  t: TranslationDict;
  onNavigate: (view: NavView) => void;
  onTrackSos?: (sosId: string) => void;
}

export const SendSOSView: React.FC<SendSOSViewProps> = ({ t, onNavigate, onTrackSos }) => {
  // Form State
  const [selectedCategory, setSelectedCategory] = useState<EmergencyType>('flood');
  const [description, setDescription] = useState<string>('');
  const [priority, setPriority] = useState<IncidentPriority>('high');
  
  // Location State
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'capturing' | 'success' | 'denied' | 'timeout' | 'error'>('idle');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [landmark, setLandmark] = useState<string>('');
  const [showManualCoords, setShowManualCoords] = useState<boolean>(false);
  const [manualLatInput, setManualLatInput] = useState<string>('');
  const [manualLngInput, setManualLngInput] = useState<string>('');

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [memoryModalPayload, setMemoryModalPayload] = useState<CreateIncidentPayload | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [submissionResult, setSubmissionResult] = useState<{
    success: boolean;
    incidentId: string;
    isDuplicate: boolean;
    isMemoryOnly: boolean;
    deliveryStatus: LocalDeliveryState;
    message: string;
    timestamp: string;
    category: EmergencyType;
    priority: IncidentPriority;
    payload: CreateIncidentPayload;
    rawBearerToken?: string;
  } | null>(null);

  const categories: { id: EmergencyType; label: string; icon: React.ReactNode; defaultPriority: IncidentPriority }[] = [
    { id: 'flood', label: t.sosForm.categories.flood, icon: <Waves size={20} />, defaultPriority: 'high' },
    { id: 'trapped', label: t.sosForm.categories.trapped, icon: <UserCheck size={20} />, defaultPriority: 'critical' },
    { id: 'medical', label: t.sosForm.categories.medical, icon: <HeartPulse size={20} />, defaultPriority: 'critical' },
    { id: 'fire', label: t.sosForm.categories.fire, icon: <Flame size={20} />, defaultPriority: 'high' },
    { id: 'building_collapse', label: t.sosForm.categories.building_collapse, icon: <Building2 size={20} />, defaultPriority: 'critical' },
    { id: 'missing_person', label: t.sosForm.categories.missing_person, icon: <UserX size={20} />, defaultPriority: 'medium' },
    { id: 'food_water_shortage', label: t.sosForm.categories.food_water_shortage, icon: <UtensilsCrossed size={20} />, defaultPriority: 'medium' },
    { id: 'other', label: t.sosForm.categories.other, icon: <HelpCircle size={20} />, defaultPriority: 'high' },
  ];

  const handleSelectCategory = (cat: EmergencyType, defPriority: IncidentPriority) => {
    setSelectedCategory(cat);
    setPriority(defPriority);
    setValidationError(null);
  };

  // Browser Geolocation capture with 10s timeout
  const handleCaptureGPS = () => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      setShowManualCoords(true);
      return;
    }

    setGpsStatus('capturing');
    setValidationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setAccuracy(position.coords.accuracy);
        setGpsStatus('success');
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setGpsStatus('denied');
        } else if (error.code === error.TIMEOUT) {
          setGpsStatus('timeout');
        } else {
          setGpsStatus('error');
        }
        setShowManualCoords(true);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // 1. Validate required fields
    if (!description.trim()) {
      setValidationError(t.sosForm.requiredField);
      return;
    }

    // 2. Resolve coordinates (GPS or manual)
    let finalLat = latitude;
    let finalLng = longitude;

    if (manualLatInput.trim() || manualLngInput.trim()) {
      const parsedLat = parseFloat(manualLatInput);
      const parsedLng = parseFloat(manualLngInput);

      if (isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90 || isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180) {
        setValidationError(t.sosForm.invalidCoordinates);
        return;
      }

      finalLat = parsedLat;
      finalLng = parsedLng;
    }

    setIsSubmitting(true);

    try {
      // Generate client-side unique SOS ID and timestamps
      const sos_id = crypto.randomUUID();
      const now = new Date();
      const validUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // 24h TTL
      const rawBearerToken = `tok_${crypto.randomUUID().replace(/-/g, '')}`;
      const hashedToken = await hashBearerToken(rawBearerToken);

      // Persist raw token locally in citizen storage map for authorized live location tracking
      saveCitizenToken(sos_id, rawBearerToken);

      const incidentPayload = {
        sos_id,
        payload_version: 1,
        emergency_type: selectedCategory,
        description: description.trim(),
        status: 'pending' as const,
        priority,
        latitude: finalLat,
        longitude: finalLng,
        accuracy_meters: accuracy,
        location_name: landmark.trim() || null,
        hop_count: 0,
        device_fingerprint_hash: `dev_${Date.now().toString(36)}`,
        update_token_hash: hashedToken,
        valid_until: validUntil,
      };

      const queueResult = await enqueueOfflineSOS(incidentPayload);

      if (queueResult.isMemoryOnly) {
        setMemoryModalPayload(incidentPayload);
      }

      setSubmissionResult({
        success: true,
        incidentId: sos_id,
        isDuplicate: false,
        isMemoryOnly: queueResult.isMemoryOnly,
        deliveryStatus: queueResult.status,
        message: queueResult.message,
        timestamp: now.toLocaleTimeString(),
        category: selectedCategory,
        priority,
        payload: incidentPayload,
        rawBearerToken,
      });
    } catch (err: unknown) {
      setValidationError(err instanceof Error ? err.message : 'SOS submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Requirement: Dynamically update delivery status when local background processor commits
  useEffect(() => {
    if (!submissionResult) return;

    const handleQueueUpdated = async (e: Event) => {
      const customEvent = e as CustomEvent<{ sos_id?: string; status?: LocalDeliveryState }>;
      if (customEvent.detail && customEvent.detail.sos_id === submissionResult.incidentId) {
        const nextStatus = customEvent.detail.status as LocalDeliveryState;
        if (nextStatus) {
          setSubmissionResult((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              deliveryStatus: nextStatus,
              message: nextStatus === 'LOCAL_DEMO_COMMITTED'
                ? t.offlineQueue.statusCommitted
                : prev.message,
            };
          });
        }
      } else {
        try {
          const items = await getAllLocalQueueItems();
          const found = items.find((i) => i.sos_id === submissionResult.incidentId);
          if (found && found.delivery_status !== submissionResult.deliveryStatus) {
            setSubmissionResult((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                deliveryStatus: found.delivery_status,
                message: found.delivery_status === 'LOCAL_DEMO_COMMITTED'
                  ? t.offlineQueue.statusCommitted
                  : prev.message,
              };
            });
          }
        } catch {
          // ignore lookup error
        }
      }
    };

    window.addEventListener('jeevascan_local_queue_updated', handleQueueUpdated);
    return () => {
      window.removeEventListener('jeevascan_local_queue_updated', handleQueueUpdated);
    };
  }, [submissionResult, t]);

  const handleReset = () => {
    setSubmissionResult(null);
    setDescription('');
    setLandmark('');
    setLatitude(null);
    setLongitude(null);
    setManualLatInput('');
    setManualLngInput('');
    setGpsStatus('idle');
    setValidationError(null);
  };

  return (
    <div className="container" style={{ padding: '2.5rem 1.25rem 4rem', maxWidth: '820px' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <span className="badge badge-red" style={{ marginBottom: '0.75rem' }}>
          <span className="pulse-dot pulse-dot-red" />
          {t.nav.sendSos}
        </span>
        <h1 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', marginBottom: '0.5rem' }}>
          {t.sosForm.title}
        </h1>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
          {t.sosForm.subtitle}
        </p>
      </div>

      {/* Mandatory Demo Warning Banner */}
      <div
        style={{
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem 1.25rem',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
        }}
      >
        <ShieldAlert size={22} style={{ color: '#EF4444', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong style={{ color: '#FCA5A5', fontSize: '0.9rem', display: 'block', marginBottom: '0.2rem' }}>
            HACKATHON LOCAL DEMO NOTICE (Rule 9 & 16)
          </strong>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            {t.sosForm.demoWarning}
          </p>
        </div>
      </div>

      {/* Submission Success / Duplicate Confirmation Card */}
      {submissionResult ? (
        <div 
          className="glass-panel" 
          style={{ 
            border: submissionResult.isDuplicate 
              ? '1px solid var(--amber-warning)' 
              : '1px solid var(--emerald-live)',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: submissionResult.isDuplicate ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
              color: submissionResult.isDuplicate ? '#FBBF24' : '#34D399',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
            }}
          >
            {submissionResult.isDuplicate ? <AlertTriangle size={32} /> : <CheckCircle2 size={32} />}
          </div>

          <h2 style={{ fontSize: '1.6rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            {submissionResult.isDuplicate ? t.sosForm.duplicateTitle : t.sosForm.submittedTitle}
          </h2>

          <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
            <span 
              className={`badge ${
                submissionResult.deliveryStatus === 'LOCAL_DEMO_COMMITTED'
                  ? 'badge-emerald'
                  : submissionResult.isMemoryOnly
                  ? 'badge-red'
                  : 'badge-amber'
              }`} 
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
            >
              {submissionResult.deliveryStatus === 'LOCAL_DEMO_COMMITTED'
                ? t.offlineQueue.statusCommitted
                : submissionResult.isMemoryOnly
                ? t.offlineQueue.memoryOnlyLabel
                : t.offlineQueue.durableLabel}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {t.sosForm.demoNotice}
            </span>
          </div>

          <div
            style={{
              background: '#F8FAFC',
              border: submissionResult.isMemoryOnly 
                ? '1px solid var(--color-red)' 
                : '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              maxWidth: '540px',
              margin: '0 auto 2rem',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              fontSize: '0.875rem',
            }}
          >
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--text-muted)' }}>{t.sosForm.sosIdLabel}:</span>
              <strong style={{ color: 'var(--color-teal)', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                {submissionResult.incidentId}
              </strong>
            </div>

            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--text-muted)' }}>{t.sosForm.timestampLabel}:</span>
              <span style={{ color: 'var(--text-primary)' }}>{submissionResult.timestamp}</span>
            </div>

            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--text-muted)' }}>Storage / Delivery:</span>
              <span className={`badge ${
                submissionResult.deliveryStatus === 'LOCAL_DEMO_COMMITTED'
                  ? 'badge-emerald'
                  : submissionResult.isMemoryOnly
                  ? 'badge-red'
                  : 'badge-amber'
              }`}>
                {submissionResult.deliveryStatus === 'LOCAL_DEMO_COMMITTED'
                  ? t.offlineQueue.statusCommitted
                  : submissionResult.isMemoryOnly
                  ? t.offlineQueue.statusMemoryOnly
                  : t.offlineQueue.statusQueuedLocal}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--text-muted)' }}>Result Details:</span>
              <span style={{ color: 'var(--text-secondary)' }}>{submissionResult.message}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-3" style={{ flexWrap: 'wrap' }}>
            <button
              onClick={async () => {
                const text = formatSOSTextForClipboard(submissionResult.payload);
                await navigator.clipboard.writeText(text);
                setCopiedCode(true);
                setTimeout(() => setCopiedCode(false), 2000);
              }}
              className="btn btn-outline"
              style={{ padding: '0.75rem 1.25rem', borderColor: '#38BDF8', color: '#38BDF8' }}
              title="Copy SOS details to clipboard"
            >
              {copiedCode ? <Check size={16} /> : <Copy size={16} />}
              <span>{copiedCode ? t.offlineQueue.copiedSuccess : t.offlineQueue.copyPayload}</span>
            </button>

            <button
              id="sos-track-status-cta"
              onClick={() => {
                if (onTrackSos) {
                  onTrackSos(submissionResult.incidentId);
                } else {
                  onNavigate('citizen-tracker');
                }
              }}
              className="btn btn-primary"
              style={{ padding: '0.75rem 1.5rem', backgroundColor: '#0284C7' }}
            >
              <span>{t.statusTracker.searchBtn}</span>
              <ArrowRight size={16} />
            </button>

            <button
              onClick={() => onNavigate('operator-dashboard')}
              className="btn btn-outline"
              style={{ padding: '0.75rem 1.5rem' }}
            >
              <span>{t.sosForm.viewInDashboard}</span>
            </button>

            <button
              onClick={handleReset}
              className="btn btn-outline"
              style={{ padding: '0.75rem 1.25rem' }}
            >
              <span>{t.sosForm.submitAnother}</span>
            </button>
          </div>

          {/* Phase 9 Live Location Sharing */}
          <div style={{ marginTop: '2rem', textAlign: 'left' }}>
            <LiveLocationSharingCard
              t={t}
              sosId={submissionResult.incidentId}
              updateTokenHash={submissionResult.rawBearerToken || submissionResult.payload.update_token_hash}
            />
          </div>
        </div>
      ) : (
        /* Emergency Form */
        <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '2rem' }}>
          {/* Validation Alert */}
          {validationError && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.75rem 1rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#F87171',
                fontSize: '0.875rem',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{validationError}</span>
            </div>
          )}

          {/* Step 1: Emergency Category */}
          <div style={{ marginBottom: '2rem' }}>
            <label 
              style={{ 
                display: 'block', 
                fontSize: '1rem', 
                fontWeight: 700, 
                color: 'var(--text-primary)', 
                marginBottom: '0.75rem' 
              }}
            >
              {t.sosForm.stepCategory}
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '0.65rem' }}>
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    type="button"
                    key={cat.id}
                    onClick={() => handleSelectCategory(cat.id, cat.defaultPriority)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: '0.5rem',
                      padding: '0.85rem',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                      border: isSelected ? '2px solid #EF4444' : '1px solid var(--border-subtle)',
                      color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ color: isSelected ? '#EF4444' : '#38BDF8' }}>
                      {cat.icon}
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: isSelected ? 700 : 500, lineHeight: 1.3 }}>
                      {cat.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Description */}
          <div style={{ marginBottom: '2rem' }}>
            <label 
              htmlFor="emergency-description"
              style={{ 
                display: 'block', 
                fontSize: '1rem', 
                fontWeight: 700, 
                color: 'var(--text-primary)', 
                marginBottom: '0.5rem' 
              }}
            >
              {t.sosForm.stepDescription}
            </label>
            <textarea
              id="emergency-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.sosForm.descriptionPlaceholder}
              rows={4}
              required
              style={{
                width: '100%',
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                padding: '0.85rem',
                fontSize: '0.95rem',
                fontFamily: 'var(--font-sans)',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Step 3: Location Capture & Manual Fallback */}
          <div style={{ marginBottom: '2.5rem' }}>
            <label 
              style={{ 
                display: 'block', 
                fontSize: '1rem', 
                fontWeight: 700, 
                color: 'var(--text-primary)', 
                marginBottom: '0.75rem' 
              }}
            >
              {t.sosForm.stepLocation}
            </label>

            {/* GPS Capture Button */}
            <div style={{ marginBottom: '1rem' }}>
              <button
                type="button"
                onClick={handleCaptureGPS}
                disabled={gpsStatus === 'capturing'}
                className="btn btn-cyan"
                style={{ width: '100%', padding: '0.75rem 1.25rem', fontSize: '0.95rem' }}
              >
                {gpsStatus === 'capturing' ? (
                  <>
                    <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>{t.sosForm.gpsCapturing}</span>
                  </>
                ) : (
                  <>
                    <Navigation size={18} />
                    <span>{t.sosForm.gpsButton}</span>
                  </>
                )}
              </button>
            </div>

            {/* GPS Feedback Banners */}
            {gpsStatus === 'success' && latitude !== null && longitude !== null && (
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem 1rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                  color: '#34D399',
                }}
              >
                <CheckCircle2 size={18} />
                <div>
                  <strong>{t.sosForm.gpsSuccess}: </strong>
                  <span>Lat {latitude.toFixed(5)}, Lng {longitude.toFixed(5)} (±{Math.round(accuracy || 0)}m)</span>
                </div>
              </div>
            )}

            {gpsStatus === 'denied' && (
              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem 1rem',
                  marginBottom: '1rem',
                  fontSize: '0.85rem',
                  color: '#FBBF24',
                }}
              >
                {t.sosForm.gpsDenied}
              </div>
            )}

            {(gpsStatus === 'timeout' || gpsStatus === 'error') && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem 1rem',
                  marginBottom: '1rem',
                  fontSize: '0.85rem',
                  color: '#F87171',
                }}
              >
                {gpsStatus === 'timeout' ? t.sosForm.gpsTimeout : t.sosForm.gpsUnsupported}
              </div>
            )}

            {/* Landmark & Manual Coordinates Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label 
                  htmlFor="landmark-input"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}
                >
                  <MapPin size={14} style={{ color: '#F59E0B' }} />
                  <span>Landmark / Address Description</span>
                </label>
                <input
                  id="landmark-input"
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder={t.sosForm.landmarkPlaceholder}
                  style={{
                    width: '100%',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    padding: '0.75rem',
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              {/* Toggle Manual Coordinates Entry */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowManualCoords(!showManualCoords)}
                  className="btn btn-outline"
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
                >
                  <Compass size={14} />
                  <span>{showManualCoords ? 'Hide Coordinate Inputs' : t.sosForm.manualToggle}</span>
                </button>
              </div>

              {showManualCoords && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', padding: '0.75rem', background: '#F8FAFC', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                      {t.sosForm.latitudeLabel}
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="-90"
                      max="90"
                      placeholder="e.g. 17.3850"
                      value={manualLatInput}
                      onChange={(e) => setManualLatInput(e.target.value)}
                      style={{
                        width: '100%',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-primary)',
                        padding: '0.5rem',
                        fontSize: '0.85rem',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                      {t.sosForm.longitudeLabel}
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="-180"
                      max="180"
                      placeholder="e.g. 78.4867"
                      value={manualLngInput}
                      onChange={(e) => setManualLngInput(e.target.value)}
                      style={{
                        width: '100%',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-primary)',
                        padding: '0.5rem',
                        fontSize: '0.85rem',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-sos"
            style={{ width: '100%', padding: '0.95rem 1.5rem', fontSize: '1.1rem' }}
          >
            {isSubmitting ? (
              <>
                <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
                <span>{t.sosForm.submitting}</span>
              </>
            ) : (
              <>
                <AlertTriangle size={20} />
                <span>{t.sosForm.submitButton}</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* Requirement 6: Temporary Memory Only Alert Modal */}
      <TemporaryMemoryModal
        t={t}
        payload={memoryModalPayload}
        onClose={() => setMemoryModalPayload(null)}
      />
    </div>
  );
};
