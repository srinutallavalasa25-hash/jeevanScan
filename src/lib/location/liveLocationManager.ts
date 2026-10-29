/**
 * JEEVASCAN AI — LIVE LOCATION SHARING MANAGER
 * Team: RakshaFly AI
 * Tagline: Find Faster. Rescue Smarter.
 *
 * Implements Phase 9 live location sharing:
 * 1. Explicit user consent only (zero silent background tracking).
 * 2. Instant termination on Stop Sharing (clearWatch + cancel timers).
 * 3. Throttled transmissions: 15-second minimum window + 10-metre displacement filter.
 * 4. Coordinate & accuracy validation (rejects NaN, out-of-bounds, accuracy > 500m).
 * 5. Bounded offline pause: respects isEffectiveOnline(), retains single latest reading in memory.
 * 6. Dual-mode routing: live Supabase vs local demo store.
 * 7. Original SOS coordinates in incident records remain 100% immutable.
 */

import { backend } from '../supabase';
import { isEffectiveOnline, isSimulatedOffline } from '../offline/localWorker';
import { hashBearerToken, isSha256Hex } from '../crypto/tokenHash';

export { hashBearerToken, isSha256Hex };

export type LocationSharingStatus =
  | 'stopped'
  | 'requesting_permission'
  | 'active'
  | 'denied'
  | 'unavailable'
  | 'timeout'
  | 'paused_offline'
  | 'inaccurate';

export interface LiveLocationReading {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  timestamp: number;
  transmitted: boolean;
  transmissionError?: string | null;
}

export interface LocationSharingState {
  status: LocationSharingStatus;
  sosId: string | null;
  updateTokenHash: string | null;
  currentReading: LiveLocationReading | null;
  updateCount: number;
  lastTransmittedAt: number | null;
  isOnline: boolean;
  isSimulatedOffline: boolean;
  isDemo: boolean;
}

export const MIN_TRANSMISSION_INTERVAL_MS = 15000; // 15 seconds
export const MIN_DISPLACEMENT_METERS = 10; // 10 meters
export const MAX_ALLOWED_ACCURACY_METERS = 500; // 500 meters

const CITIZEN_TOKENS_STORAGE_KEY = 'jeevascan_citizen_tokens';

/**
 * Stores a citizen's secret bearer token locally in browser storage.
 */
export function saveCitizenToken(sosId: string, token: string): void {
  if (typeof window === 'undefined' || !window.localStorage || !sosId || !token) return;
  try {
    const raw = window.localStorage.getItem(CITIZEN_TOKENS_STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[sosId] = token;
    window.localStorage.setItem(CITIZEN_TOKENS_STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.warn('Could not save citizen token locally:', err);
  }
}

/**
 * Retrieves a citizen's secret bearer token from local browser storage.
 */
export function getCitizenToken(sosId: string): string | null {
  if (typeof window === 'undefined' || !window.localStorage || !sosId) return null;
  try {
    const raw = window.localStorage.getItem(CITIZEN_TOKENS_STORAGE_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw);
    return map[sosId] || null;
  } catch {
    return null;
  }
}

/**
 * Calculates geographical displacement in meters using the Haversine formula.
 */
export function calculateDisplacementMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates direct geographical distance in kilometers.
 */
export function calculateDirectDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  return calculateDisplacementMeters(lat1, lon1, lat2, lon2) / 1000;
}

/**
 * Validates a location reading against safety rules.
 */
export function validateLocationReading(
  latitude: number,
  longitude: number,
  accuracy?: number | null
): { valid: boolean; reason?: string } {
  if (typeof latitude !== 'number' || isNaN(latitude) || latitude < -90 || latitude > 90) {
    return { valid: false, reason: 'Latitude must be a valid number between -90 and 90' };
  }
  if (typeof longitude !== 'number' || isNaN(longitude) || longitude < -180 || longitude > 180) {
    return { valid: false, reason: 'Longitude must be a valid number between -180 and 180' };
  }
  if (accuracy !== undefined && accuracy !== null) {
    if (typeof accuracy !== 'number' || isNaN(accuracy) || accuracy < 0) {
      return { valid: false, reason: 'Accuracy must be a non-negative number' };
    }
    if (accuracy > MAX_ALLOWED_ACCURACY_METERS) {
      return {
        valid: false,
        reason: `Accuracy (${Math.round(accuracy)}m) exceeds maximum allowable threshold (${MAX_ALLOWED_ACCURACY_METERS}m)`,
      };
    }
  }
  return { valid: true };
}

// Internal Singleton State
let activeWatchId: number | null = null;
let currentSosId: string | null = null;
let currentUpdateTokenHash: string | null = null;
let currentStatus: LocationSharingStatus = 'stopped';
let latestReading: LiveLocationReading | null = null;
let successfulUpdateCount = 0;
let lastTransmittedTimestamp: number | null = null;
let lastTransmittedCoords: { lat: number; lng: number } | null = null;
let isTransmitting = false;

const stateListeners = new Set<(state: LocationSharingState) => void>();

function notifyStateChange(): void {
  const state = getLiveLocationState();
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(new CustomEvent('jeevascan:location_sharing_updated', { detail: state }));
    } catch {
      // Ignore in non-DOM test runners
    }
  }
  stateListeners.forEach((listener) => {
    try {
      listener(state);
    } catch (err) {
      console.warn('Location state listener error:', err);
    }
  });
}

/**
 * Returns a snapshot of the current location sharing manager state.
 */
export function getLiveLocationState(): LocationSharingState {
  const effectiveOnline = isEffectiveOnline();
  return {
    status: currentStatus,
    sosId: currentSosId,
    updateTokenHash: currentUpdateTokenHash,
    currentReading: latestReading ? { ...latestReading } : null,
    updateCount: successfulUpdateCount,
    lastTransmittedAt: lastTransmittedTimestamp,
    isOnline: effectiveOnline,
    isSimulatedOffline: isSimulatedOffline(),
    isDemo: !backend.isConfigured,
  };
}

/**
 * Subscribes to location sharing state changes. Returns an unsubscribe function.
 */
export function subscribeToLocationState(callback: (state: LocationSharingState) => void): () => void {
  stateListeners.add(callback);
  callback(getLiveLocationState());
  return () => {
    stateListeners.delete(callback);
  };
}

/**
 * Internal worker to transmit a valid reading to the backend adapter.
 */
async function transmitReading(
  reading: LiveLocationReading,
  sosId: string,
  updateTokenHash: string | null
): Promise<boolean> {
  if (isTransmitting) return false;
  isTransmitting = true;

  try {
    const result = await backend.submitLocationUpdate({
      sos_id: sosId,
      latitude: reading.latitude,
      longitude: reading.longitude,
      accuracy_meters: reading.accuracyMeters,
      update_token_hash: updateTokenHash || null,
    });

    if (result.success) {
      reading.transmitted = true;
      reading.transmissionError = null;
      lastTransmittedTimestamp = Date.now();
      lastTransmittedCoords = { lat: reading.latitude, lng: reading.longitude };
      successfulUpdateCount += 1;
      currentStatus = 'active';
      notifyStateChange();
      return true;
    } else {
      reading.transmitted = false;
      reading.transmissionError = result.message || 'Transmission rejected';
      if (
        result.message?.toLowerCase().includes('expired') ||
        result.message?.toLowerCase().includes('resolved') ||
        result.message?.toLowerCase().includes('cancelled')
      ) {
        stopLocationSharing();
      }
      notifyStateChange();
      return false;
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Network failure';
    reading.transmitted = false;
    reading.transmissionError = errorMsg;
    notifyStateChange();
    return false;
  } finally {
    isTransmitting = false;
  }
}

/**
 * Handles incoming Geolocation coordinates from the browser.
 */
async function handlePositionUpdate(position: GeolocationPosition): Promise<void> {
  // If sharing was stopped while callback was in flight, abort immediately
  if (currentStatus === 'stopped' || !currentSosId) {
    return;
  }

  const { latitude, longitude, accuracy } = position.coords;
  const timestamp = position.timestamp || Date.now();

  // 1. Validate readings
  const validation = validateLocationReading(latitude, longitude, accuracy);
  if (!validation.valid) {
    latestReading = {
      latitude,
      longitude,
      accuracyMeters: accuracy,
      timestamp,
      transmitted: false,
      transmissionError: validation.reason,
    };
    if (accuracy > MAX_ALLOWED_ACCURACY_METERS) {
      currentStatus = 'inaccurate';
    }
    notifyStateChange();
    return;
  }

  const reading: LiveLocationReading = {
    latitude,
    longitude,
    accuracyMeters: accuracy,
    timestamp,
    transmitted: false,
    transmissionError: null,
  };
  latestReading = reading;

  // 2. Connectivity check
  const online = isEffectiveOnline();
  if (!online) {
    currentStatus = 'paused_offline';
    reading.transmitted = false;
    reading.transmissionError = 'Paused: Device is offline or simulated offline. Reading held in memory.';
    notifyStateChange();
    return;
  }

  // 3. Throttling and displacement check
  const now = Date.now();
  if (lastTransmittedTimestamp !== null && lastTransmittedCoords !== null) {
    const timeSinceLast = now - lastTransmittedTimestamp;
    const displacement = calculateDisplacementMeters(
      lastTransmittedCoords.lat,
      lastTransmittedCoords.lng,
      latitude,
      longitude
    );

    // If less than 15 seconds have passed, skip remote transmission
    if (timeSinceLast < MIN_TRANSMISSION_INTERVAL_MS) {
      reading.transmitted = false;
      reading.transmissionError = `Throttled: Minimum interval is 15s (${Math.round((MIN_TRANSMISSION_INTERVAL_MS - timeSinceLast) / 1000)}s remaining)`;
      currentStatus = 'active';
      notifyStateChange();
      return;
    }

    // If 15 seconds passed but displacement is less than 10 meters, skip remote transmission
    if (displacement < MIN_DISPLACEMENT_METERS) {
      reading.transmitted = false;
      reading.transmissionError = `Displacement threshold: ${displacement.toFixed(1)}m < 10m minimum`;
      currentStatus = 'active';
      notifyStateChange();
      return;
    }
  }

  // 4. Transmit reading
  await transmitReading(reading, currentSosId, currentUpdateTokenHash);
}

/**
 * Handles browser Geolocation errors.
 */
function handlePositionError(error: GeolocationPositionError): void {
  if (currentStatus === 'stopped') return;

  if (error.code === error.PERMISSION_DENIED) {
    currentStatus = 'denied';
  } else if (error.code === error.TIMEOUT) {
    currentStatus = 'timeout';
  } else {
    currentStatus = 'unavailable';
  }
  notifyStateChange();
}

/**
 * Initiates live location sharing for an incident upon explicit user request.
 */
export async function startLocationSharing(
  sosId: string,
  updateTokenHash?: string | null
): Promise<{ success: boolean; error?: string }> {
  if (!sosId || typeof sosId !== 'string') {
    return { success: false, error: 'Valid SOS ID required for live location sharing' };
  }

  // If already tracking another SOS, stop previous watch
  if (activeWatchId !== null) {
    stopLocationSharing();
  }

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    currentStatus = 'unavailable';
    notifyStateChange();
    return { success: false, error: 'Geolocation API is unsupported on this browser' };
  }

  currentSosId = sosId;
  currentUpdateTokenHash = updateTokenHash || null;
  currentStatus = 'requesting_permission';
  latestReading = null;
  notifyStateChange();

  try {
    activeWatchId = navigator.geolocation.watchPosition(
      (pos) => void handlePositionUpdate(pos),
      (err) => handlePositionError(err),
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      }
    );

    return { success: true };
  } catch (err: unknown) {
    currentStatus = 'unavailable';
    notifyStateChange();
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to initialize Geolocation watch',
    };
  }
}

/**
 * Immediately terminates live location sharing and clears the browser watch.
 * Guarantees zero background transmissions.
 */
export function stopLocationSharing(): void {
  if (activeWatchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
    try {
      navigator.geolocation.clearWatch(activeWatchId);
    } catch {
      // Ignore
    }
    activeWatchId = null;
  }

  currentStatus = 'stopped';
  currentSosId = null;
  currentUpdateTokenHash = null;
  isTransmitting = false;
  notifyStateChange();
}

/**
 * Checks for retained readings on reconnection and securely flushes if eligible.
 */
export async function checkAndFlushPendingLocationUpdate(): Promise<void> {
  if (
    currentStatus === 'paused_offline' &&
    currentSosId &&
    latestReading &&
    !latestReading.transmitted &&
    isEffectiveOnline()
  ) {
    const now = Date.now();
    if (lastTransmittedTimestamp === null || now - lastTransmittedTimestamp >= MIN_TRANSMISSION_INTERVAL_MS) {
      await transmitReading(latestReading, currentSosId, currentUpdateTokenHash);
    }
  }
}

// Wire reconnection listener
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    void checkAndFlushPendingLocationUpdate();
  });
  window.addEventListener('jeevascan_local_queue_updated', () => {
    void checkAndFlushPendingLocationUpdate();
  });
}

/**
 * Resets the location manager for test isolation.
 */
export function resetLocationManagerForTesting(): void {
  stopLocationSharing();
  latestReading = null;
  successfulUpdateCount = 0;
  lastTransmittedTimestamp = null;
  lastTransmittedCoords = null;
  stateListeners.clear();
}

