import type { IncidentRecord, ShelterRecord } from '../../types/database';
import { calculateDirectDistanceKm } from '../location/liveLocationManager';

/**
 * Checks if a coordinate pair is numerically valid and within Earth lat/lng boundaries.
 */
export function isValidCoordinate(lat: unknown, lng: unknown): lat is number {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) return false;
  if (lat < -85.0511 || lat > 85.0511) return false;
  if (lng < -180 || lng > 180) return false;
  return true;
}

/**
 * Type guard for objects with latitude/longitude fields ensuring they are valid numbers.
 */
export function hasValidCoordinates<T extends { latitude?: number | null; longitude?: number | null }>(
  obj: T | null | undefined
): obj is T & { latitude: number; longitude: number } {
  if (!obj) return false;
  return isValidCoordinate(obj.latitude, obj.longitude);
}

/**
 * Web Mercator projection: (lat, lng) -> world pixel coordinates at given zoom.
 */
export function latLngToWorldPixel(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const S = 256 * Math.pow(2, zoom);
  const xNorm = (lng + 180) / 360;
  const sinLat = Math.max(-0.9999, Math.min(0.9999, Math.sin((lat * Math.PI) / 180)));
  const yNorm = 0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI);
  return {
    x: xNorm * S,
    y: yNorm * S,
  };
}

/**
 * Inverse Web Mercator projection: world pixel coordinates -> (lat, lng).
 */
export function worldPixelToLatLng(px: number, py: number, zoom: number): { lat: number; lng: number } {
  const S = 256 * Math.pow(2, zoom);
  const xNorm = px / S;
  const yNorm = py / S;
  const lng = xNorm * 360 - 180;
  const n = Math.PI - 2 * Math.PI * yNorm;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return {
    lat: Math.max(-85.0511, Math.min(85.0511, lat)),
    lng: Math.max(-180, Math.min(180, lng)),
  };
}

/**
 * Returns ground resolution in meters per screen pixel for a given latitude and zoom level.
 */
export function getMetersPerPixel(lat: number, zoom: number): number {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
}

/**
 * Projects a lat/lng to viewport container pixel coordinates { x, y } relative to center.
 */
export function projectToScreen(
  lat: number,
  lng: number,
  center: { lat: number; lng: number },
  zoom: number,
  viewportWidth: number,
  viewportHeight: number
): { x: number; y: number; isVisible: boolean } {
  if (!isValidCoordinate(lat, lng)) {
    return { x: -9999, y: -9999, isVisible: false };
  }
  const pt = latLngToWorldPixel(lat, lng, zoom);
  const c = latLngToWorldPixel(center.lat, center.lng, zoom);
  const x = viewportWidth / 2 + (pt.x - c.x);
  const y = viewportHeight / 2 + (pt.y - c.y);
  const margin = 100;
  const isVisible = x >= -margin && x <= viewportWidth + margin && y >= -margin && y <= viewportHeight + margin;
  return { x, y, isVisible };
}

export interface IncidentFilters {
  priority?: string;
  status?: string;
  category?: string;
  searchQuery?: string;
}

/**
 * Pure filter function for incident list based on priority, status, category, and text query.
 */
export function filterIncidents(
  incidents: IncidentRecord[],
  filters: IncidentFilters
): IncidentRecord[] {
  const { priority = 'all', status = 'all', category = 'all', searchQuery = '' } = filters;
  return incidents.filter((inc) => {
    // Priority filter
    if (priority !== 'all' && inc.priority !== priority) return false;
    // Status filter
    if (status !== 'all' && inc.status !== status) return false;
    // Category filter
    if (category !== 'all' && inc.emergency_type !== category) return false;
    // Search query filter (matches sos_id, description, or landmark)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchId = inc.sos_id.toLowerCase().includes(q);
      const matchDesc = inc.description?.toLowerCase().includes(q);
      const matchLandmark = inc.location_name?.toLowerCase().includes(q);
      if (!matchId && !matchDesc && !matchLandmark) return false;
    }
    return true;
  });
}

/**
 * Finds the closest shelter to a source location using direct spherical distance.
 */
export function findNearestShelter(
  srcLat: number | null | undefined,
  srcLng: number | null | undefined,
  shelters: ShelterRecord[]
): { shelter: ShelterRecord; distanceKm: number } | null {
  if (typeof srcLat !== 'number' || typeof srcLng !== 'number' || !isValidCoordinate(srcLat, srcLng)) {
    return null;
  }
  let closest: { shelter: ShelterRecord; distanceKm: number } | null = null;
  shelters.forEach((s) => {
    if (hasValidCoordinates(s)) {
      const dist = calculateDirectDistanceKm(srcLat, srcLng, s.latitude, s.longitude);
      if (!closest || dist < closest.distanceKm) {
        closest = { shelter: s, distanceKm: dist };
      }
    }
  });
  return closest;
}
