import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Minus,
  Maximize2,
  Navigation,
  Compass,
  Building2,
  HeartPulse,
  Tent,
  AlertTriangle,
  Waves,
  UserCheck,
  Flame,
  EyeOff,
  WifiOff,
  Crosshair,
} from 'lucide-react';
import type { TranslationDict } from '../lib/i18n';
import type { IncidentRecord, ShelterRecord, LocationUpdateRecord, EmergencyType, IncidentPriority } from '../types/database';
import { isEffectiveOnline } from '../lib/offline/localWorker';
import { calculateDirectDistanceKm } from '../lib/location/liveLocationManager';
import {
  latLngToWorldPixel,
  worldPixelToLatLng,
  getMetersPerPixel,
  isValidCoordinate,
  hasValidCoordinates,
} from '../lib/map/mapUtils';

export interface RescueMapProps {
  t: TranslationDict;
  incidents: IncidentRecord[];
  shelters?: ShelterRecord[];
  liveLocationsMap?: Record<string, LocationUpdateRecord>;
  selectedIncidentId?: string | null;
  onSelectIncident?: (incident: IncidentRecord | null) => void;
  onSelectShelter?: (shelter: ShelterRecord | null) => void;
  showEvacRoute?: boolean;
  simulatedDroneVector?: {
    base: { lat: number; lng: number; name?: string };
    target: { lat: number; lng: number; name?: string };
    droneProgressPercent?: number;
  } | null;
}

export const RescueMap: React.FC<RescueMapProps> = ({
  t,
  incidents,
  shelters = [],
  liveLocationsMap = {},
  selectedIncidentId = null,
  onSelectIncident,
  onSelectShelter,
  showEvacRoute = false,
  simulatedDroneVector = null,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Map viewport state: center & zoom
  const [center, setCenter] = useState<{ lat: number; lng: number }>({ lat: 17.385, lng: 78.4867 });
  const [zoom, setZoom] = useState<number>(13);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 800, height: 600 });

  // Layer visibility toggles
  const [showSheltersLayer, setShowSheltersLayer] = useState<boolean>(true);
  const [showLiveLayer, setShowLiveLayer] = useState<boolean>(true);
  const [showLegend, setShowLegend] = useState<boolean>(true);

  // Panning drag state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; centerPx: { x: number; y: number } } | null>(null);

  // User location state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Tile load error / offline detection
  const [tilesFailed, setTilesFailed] = useState<boolean>(false);
  const isOnline = isEffectiveOnline();

  // Resize listener
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth || 800,
          height: containerRef.current.clientHeight || 600,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Center on selected incident when it changes
  useEffect(() => {
    if (!selectedIncidentId) return;
    const target = incidents.find((i) => i.sos_id === selectedIncidentId);
    if (target && typeof target.latitude === 'number' && typeof target.longitude === 'number') {
      const live = liveLocationsMap[target.sos_id];
      const targetLat = live && typeof live.latitude === 'number' ? live.latitude : target.latitude;
      const targetLng = live && typeof live.longitude === 'number' ? live.longitude : target.longitude;
      const timer = setTimeout(() => {
        setCenter({ lat: targetLat, lng: targetLng });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [selectedIncidentId, incidents, liveLocationsMap]);

  // Coordinate projection from lat/lng to container screen pixels
  const project = useCallback(
    (lat: number, lng: number): { x: number; y: number } => {
      const centerWorld = latLngToWorldPixel(center.lat, center.lng, zoom);
      const pointWorld = latLngToWorldPixel(lat, lng, zoom);
      return {
        x: dimensions.width / 2 + (pointWorld.x - centerWorld.x),
        y: dimensions.height / 2 + (pointWorld.y - centerWorld.y),
      };
    },
    [center, zoom, dimensions]
  );

  // Zoom controls
  const handleZoomIn = () => setZoom((z) => Math.min(18, z + 1));
  const handleZoomOut = () => setZoom((z) => Math.max(4, z - 1));

  // Fit all active incident coordinates in viewport
  const handleFitBounds = useCallback(() => {
    const validCoords = incidents
      .filter((i) => typeof i.latitude === 'number' && typeof i.longitude === 'number')
      .map((i) => ({ lat: i.latitude as number, lng: i.longitude as number }));

    if (validCoords.length === 0) {
      setCenter({ lat: 17.385, lng: 78.4867 });
      setZoom(13);
      return;
    }

    let minLat = 90;
    let maxLat = -90;
    let minLng = 180;
    let maxLng = -180;

    validCoords.forEach((c) => {
      if (c.lat < minLat) minLat = c.lat;
      if (c.lat > maxLat) maxLat = c.lat;
      if (c.lng < minLng) minLng = c.lng;
      if (c.lng > maxLng) maxLng = c.lng;
    });

    const avgLat = (minLat + maxLat) / 2;
    const avgLng = (minLng + maxLng) / 2;
    setCenter({ lat: avgLat, lng: avgLng });

    // Choose appropriate zoom based on coordinate delta
    const latSpan = maxLat - minLat;
    const lngSpan = maxLng - minLng;
    const maxSpan = Math.max(latSpan, lngSpan);

    if (maxSpan > 2) setZoom(8);
    else if (maxSpan > 0.5) setZoom(10);
    else if (maxSpan > 0.1) setZoom(12);
    else if (maxSpan > 0.02) setZoom(14);
    else setZoom(15);
  }, [incidents]);

  // Request browser geolocation on explicit button click
  const handleUseMyLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationError(t.map.locationUnavailable);
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude, accuracy } = pos.coords;
        if (accuracy > 500) {
          setLocationError(t.map.locationInaccurate);
          return;
        }
        setUserLocation({ lat: latitude, lng: longitude, accuracy });
        setCenter({ lat: latitude, lng: longitude });
        setZoom(15);
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError(t.map.locationDenied);
        } else {
          setLocationError(t.map.locationUnavailable);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );
  };

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Left click only
    setIsDragging(true);
    const centerWorld = latLngToWorldPixel(center.lat, center.lng, zoom);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      centerPx: centerWorld,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const newCenterWorld = {
      x: dragStartRef.current.centerPx.x - dx,
      y: dragStartRef.current.centerPx.y - dy,
    };
    const newLatLng = worldPixelToLatLng(newCenterWorld.x, newCenterWorld.y, zoom);
    setCenter(newLatLng);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  // Touch pan handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      const touch = e.touches[0];
      const centerWorld = latLngToWorldPixel(center.lat, center.lng, zoom);
      dragStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        centerPx: centerWorld,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !dragStartRef.current || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dx = touch.clientX - dragStartRef.current.x;
    const dy = touch.clientY - dragStartRef.current.y;
    const newCenterWorld = {
      x: dragStartRef.current.centerPx.x - dx,
      y: dragStartRef.current.centerPx.y - dy,
    };
    const newLatLng = worldPixelToLatLng(newCenterWorld.x, newCenterWorld.y, zoom);
    setCenter(newLatLng);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoom((z) => Math.min(18, z + 1));
    } else if (e.deltaY > 0) {
      setZoom((z) => Math.max(4, z - 1));
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const panStepPixels = 60;
    const centerWorld = latLngToWorldPixel(center.lat, center.lng, zoom);

    if (e.key === 'ArrowUp') {
      const next = worldPixelToLatLng(centerWorld.x, centerWorld.y - panStepPixels, zoom);
      setCenter(next);
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      const next = worldPixelToLatLng(centerWorld.x, centerWorld.y + panStepPixels, zoom);
      setCenter(next);
      e.preventDefault();
    } else if (e.key === 'ArrowLeft') {
      const next = worldPixelToLatLng(centerWorld.x - panStepPixels, centerWorld.y, zoom);
      setCenter(next);
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      const next = worldPixelToLatLng(centerWorld.x + panStepPixels, centerWorld.y, zoom);
      setCenter(next);
      e.preventDefault();
    } else if (e.key === '+' || e.key === '=') {
      handleZoomIn();
      e.preventDefault();
    } else if (e.key === '-' || e.key === '_') {
      handleZoomOut();
      e.preventDefault();
    }
  };

  // Calculate visible OSM tiles
  const visibleTiles = useMemo(() => {
    if (!isOnline || tilesFailed) return [];
    const centerWorld = latLngToWorldPixel(center.lat, center.lng, zoom);
    const numTiles = Math.pow(2, zoom);

    const minPxX = centerWorld.x - dimensions.width / 2;
    const maxPxX = centerWorld.x + dimensions.width / 2;
    const minPxY = centerWorld.y - dimensions.height / 2;
    const maxPxY = centerWorld.y + dimensions.height / 2;

    const minTileX = Math.floor(minPxX / 256);
    const maxTileX = Math.floor(maxPxX / 256);
    const minTileY = Math.max(0, Math.floor(minPxY / 256));
    const maxTileY = Math.min(numTiles - 1, Math.floor(maxPxY / 256));

    const tiles: { key: string; url: string; x: number; y: number; left: number; top: number }[] = [];

    for (let ty = minTileY; ty <= maxTileY; ty++) {
      for (let tx = minTileX; tx <= maxTileX; tx++) {
        const wrappedTx = ((tx % numTiles) + numTiles) % numTiles;
        const left = dimensions.width / 2 + tx * 256 - centerWorld.x;
        const top = dimensions.height / 2 + ty * 256 - centerWorld.y;
        tiles.push({
          key: `${zoom}-${wrappedTx}-${ty}`,
          url: `https://tile.openstreetmap.org/${zoom}/${wrappedTx}/${ty}.png`,
          x: wrappedTx,
          y: ty,
          left,
          top,
        });
      }
    }
    return tiles;
  }, [center, zoom, dimensions, isOnline, tilesFailed]);

  // Selected incident reference
  const selectedIncident = useMemo(
    () => incidents.find((i) => i.sos_id === selectedIncidentId) || null,
    [incidents, selectedIncidentId]
  );

  // Find nearest shelter to selected incident
  const nearestShelter = useMemo<{ shelter: ShelterRecord; distanceKm: number } | null>(() => {
    if (!hasValidCoordinates(selectedIncident)) {
      return null;
    }
    const live = liveLocationsMap[selectedIncident.sos_id];
    const srcLat = hasValidCoordinates(live) ? live.latitude : selectedIncident.latitude;
    const srcLng = hasValidCoordinates(live) ? live.longitude : selectedIncident.longitude;

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
  }, [selectedIncident, shelters, liveLocationsMap]);

  // Evacuation route coordinates
  const evacRoutePoints = useMemo(() => {
    if (!showEvacRoute || !hasValidCoordinates(selectedIncident) || !nearestShelter || !hasValidCoordinates(nearestShelter.shelter)) {
      return null;
    }
    const live = liveLocationsMap[selectedIncident.sos_id];
    const srcLat = hasValidCoordinates(live) ? live.latitude : selectedIncident.latitude;
    const srcLng = hasValidCoordinates(live) ? live.longitude : selectedIncident.longitude;
    return {
      src: { lat: srcLat, lng: srcLng },
      dest: { lat: nearestShelter.shelter.latitude, lng: nearestShelter.shelter.longitude },
    };
  }, [showEvacRoute, selectedIncident, nearestShelter, liveLocationsMap]);

  // Marker icon helper
  const getCategoryIcon = (category: EmergencyType) => {
    switch (category) {
      case 'flood':
        return <Waves size={14} />;
      case 'trapped':
        return <UserCheck size={14} />;
      case 'medical':
        return <HeartPulse size={14} />;
      case 'fire':
        return <Flame size={14} />;
      case 'building_collapse':
        return <Building2 size={14} />;
      default:
        return <AlertTriangle size={14} />;
    }
  };

  // Priority color helper
  const getPriorityColor = (priority: IncidentPriority) => {
    switch (priority) {
      case 'critical':
        return '#DC2626'; // Red
      case 'high':
        return '#EA580C'; // Amber-Orange
      case 'medium':
        return '#2563EB'; // Blue
      case 'low':
      default:
        return '#059669'; // Green
    }
  };

  return (
    <div
      ref={containerRef}
      className="rescue-map-wrapper"
      role="region"
      aria-label="Interactive Tactical Rescue Map"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '480px',
        backgroundColor: '#1E293B',
        overflow: 'hidden',
        userSelect: 'none',
        touchAction: 'none',
        cursor: isDragging ? 'grabbing' : 'grab',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-medium)',
      }}
    >
      {/* 1. TILE LAYER */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {visibleTiles.map((tile) => (
          <img
            key={tile.key}
            src={tile.url}
            alt=""
            loading="lazy"
            onError={() => setTilesFailed(true)}
            style={{
              position: 'absolute',
              width: '256px',
              height: '256px',
              left: `${tile.left}px`,
              top: `${tile.top}px`,
              opacity: 0.92,
              filter: 'brightness(0.95) contrast(1.05)',
            }}
          />
        ))}

        {/* Tactical Coordinate Grid Fallback (When offline or tiles fail) */}
        {(!isOnline || tilesFailed) && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle at center, #1E293B 0%, #0F172A 100%)',
              backgroundImage:
                'linear-gradient(rgba(56, 189, 248, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(56, 189, 248, 0.08) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
        )}
      </div>

      {/* 2. VECTOR OVERLAYS (SVG LAYER for Accuracy halos & Evacuation vectors) */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        {/* Simulated Evacuation Route Vector */}
        {evacRoutePoints && (
          (() => {
            const p1 = project(evacRoutePoints.src.lat, evacRoutePoints.src.lng);
            const p2 = project(evacRoutePoints.dest.lat, evacRoutePoints.dest.lng);

            return (
              <g key="evac-vector">
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke="#38BDF8"
                  strokeWidth={3}
                  strokeDasharray="8 6"
                  strokeLinecap="round"
                  opacity={0.85}
                />
                <circle cx={p1.x} cy={p1.y} r={6} fill="#38BDF8" opacity={0.9} />
                <circle cx={p2.x} cy={p2.y} r={6} fill="#059669" opacity={0.9} />
              </g>
            );
          })()
        )}

        {/* Simulated Drone Flight Vector (Phase 11) */}
        {simulatedDroneVector &&
          isValidCoordinate(simulatedDroneVector.base.lat, simulatedDroneVector.base.lng) &&
          isValidCoordinate(simulatedDroneVector.target.lat, simulatedDroneVector.target.lng) && (
            (() => {
              const pBase = project(simulatedDroneVector.base.lat, simulatedDroneVector.base.lng);
              const pTarget = project(simulatedDroneVector.target.lat, simulatedDroneVector.target.lng);
              const progress = Math.max(0, Math.min(100, simulatedDroneVector.droneProgressPercent ?? 0)) / 100;
              const pDrone = {
                x: pBase.x + (pTarget.x - pBase.x) * progress,
                y: pBase.y + (pTarget.y - pBase.y) * progress,
              };

              return (
                <g key="drone-vector">
                  <line
                    x1={pBase.x}
                    y1={pBase.y}
                    x2={pTarget.x}
                    y2={pTarget.y}
                    stroke="#F59E0B"
                    strokeWidth={2.5}
                    strokeDasharray="6 4"
                    opacity={0.85}
                  />
                  {/* Drone Base Marker */}
                  <circle cx={pBase.x} cy={pBase.y} r={7} fill="#102A43" stroke="#F59E0B" strokeWidth={2} />
                  {/* Target Crosshair */}
                  <circle cx={pTarget.x} cy={pTarget.y} r={9} fill="none" stroke="#DC2626" strokeWidth={2} strokeDasharray="3 3" />
                  {/* Moving Simulated Drone Dot */}
                  <circle cx={pDrone.x} cy={pDrone.y} r={6} fill="#F59E0B" />
                  <circle cx={pDrone.x} cy={pDrone.y} r={12} fill="none" stroke="#F59E0B" strokeWidth={1.5} opacity={0.6} />
                </g>
              );
            })()
          )}

        {/* Trajectory lines from Original SOS to Latest Live Location */}
        {showLiveLayer &&
          incidents.map((inc) => {
            if (!hasValidCoordinates(inc)) return null;
            const live = liveLocationsMap[inc.sos_id];
            if (!hasValidCoordinates(live)) return null;

            const pOrig = project(inc.latitude, inc.longitude);
            const pLive = project(live.latitude, live.longitude);

            return (
              <g key={`traj-${inc.sos_id}`}>
                <line
                  x1={pOrig.x}
                  y1={pOrig.y}
                  x2={pLive.x}
                  y2={pLive.y}
                  stroke="#0D9488"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  opacity={0.8}
                />
              </g>
            );
          })}

        {/* Accuracy Circles for Incidents */}
        {incidents.map((inc) => {
          if (!hasValidCoordinates(inc)) return null;
          const pos = project(inc.latitude, inc.longitude);
          if (pos.x < -100 || pos.x > dimensions.width + 100 || pos.y < -100 || pos.y > dimensions.height + 100) return null;

          const accuracy = inc.accuracy_meters || 15;
          const mPerPx = getMetersPerPixel(inc.latitude, zoom);
          const rPx = Math.max(8, Math.min(120, accuracy / mPerPx));
          const isSelected = inc.sos_id === selectedIncidentId;

          return (
            <circle
              key={`acc-${inc.sos_id}`}
              cx={pos.x}
              cy={pos.y}
              r={rPx}
              fill={getPriorityColor(inc.priority)}
              fillOpacity={isSelected ? 0.22 : 0.12}
              stroke={getPriorityColor(inc.priority)}
              strokeWidth={1}
              strokeDasharray={isSelected ? 'none' : '3 3'}
              strokeOpacity={0.6}
            />
          );
        })}

        {/* Accuracy Halo for User Location */}
        {userLocation && (
          (() => {
            const pos = project(userLocation.lat, userLocation.lng);
            const mPerPx = getMetersPerPixel(userLocation.lat, zoom);
            const rPx = Math.max(12, Math.min(150, userLocation.accuracy / mPerPx));
            return (
              <circle
                key="user-accuracy"
                cx={pos.x}
                cy={pos.y}
                r={rPx}
                fill="#0284C7"
                fillOpacity={0.18}
                stroke="#0284C7"
                strokeWidth={1.5}
              />
            );
          })()
        )}
      </svg>

      {/* 3. HTML MARKERS LAYER */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {/* Incident Original Location Markers */}
        {incidents.map((inc) => {
          if (!hasValidCoordinates(inc)) return null;
          const pos = project(inc.latitude, inc.longitude);
          if (pos.x < -40 || pos.x > dimensions.width + 40 || pos.y < -40 || pos.y > dimensions.height + 40) return null;

          const isSelected = inc.sos_id === selectedIncidentId;
          const priorityColor = getPriorityColor(inc.priority);

          return (
            <div
              key={`marker-${inc.sos_id}`}
              onClick={(e) => {
                e.stopPropagation();
                if (onSelectIncident) onSelectIncident(inc);
              }}
              style={{
                position: 'absolute',
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                transform: `translate(-50%, -100%) scale(${isSelected ? 1.25 : 1})`,
                transition: 'transform 0.15s ease-out',
                pointerEvents: 'auto',
                cursor: 'pointer',
                zIndex: isSelected ? 40 : 20,
              }}
              title={`SOS: ${inc.sos_id.slice(0, 8)} (${inc.emergency_type} - ${inc.priority})`}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: isSelected ? '#FFFFFF' : priorityColor,
                  color: isSelected ? priorityColor : '#FFFFFF',
                  padding: '4px 8px',
                  borderRadius: '16px',
                  boxShadow: isSelected
                    ? `0 0 0 3px ${priorityColor}, 0 6px 16px rgba(0,0,0,0.4)`
                    : '0 2px 8px rgba(0,0,0,0.3)',
                  border: isSelected ? `2px solid ${priorityColor}` : '1px solid rgba(255,255,255,0.4)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}
              >
                {getCategoryIcon(inc.emergency_type)}
                <span>{inc.sos_id.slice(0, 6)}</span>
              </div>
              {/* Anchor Pin Tip */}
              <div
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent',
                  borderTop: `6px solid ${isSelected ? priorityColor : priorityColor}`,
                  margin: '0 auto',
                }}
              />
            </div>
          );
        })}

        {/* Live Location Telemetry Markers (Phase 9/9.1) */}
        {showLiveLayer &&
          incidents.map((inc) => {
            const live = liveLocationsMap[inc.sos_id];
            if (!hasValidCoordinates(live)) return null;
            const pos = project(live.latitude, live.longitude);
            if (pos.x < -40 || pos.x > dimensions.width + 40 || pos.y < -40 || pos.y > dimensions.height + 40) return null;

            const isSelected = inc.sos_id === selectedIncidentId;

            return (
              <div
                key={`live-${inc.sos_id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSelectIncident) onSelectIncident(inc);
                }}
                style={{
                  position: 'absolute',
                  left: `${pos.x}px`,
                  top: `${pos.y}px`,
                  transform: `translate(-50%, -50%) scale(${isSelected ? 1.25 : 1})`,
                  pointerEvents: 'auto',
                  cursor: 'pointer',
                  zIndex: isSelected ? 45 : 25,
                }}
                title={`Live GPS Telemetry: ${inc.sos_id.slice(0, 8)}`}
              >
                <div
                  style={{
                    position: 'relative',
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    backgroundColor: '#0D9488',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 10px rgba(13, 148, 136, 0.6), 0 2px 6px rgba(0,0,0,0.3)',
                    border: '2px solid #FFFFFF',
                  }}
                >
                  <Navigation size={14} className="animate-pulse" />
                  <span
                    style={{
                      position: 'absolute',
                      inset: '-6px',
                      borderRadius: '50%',
                      border: '2px solid #0D9488',
                      opacity: 0.7,
                      animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
                    }}
                  />
                </div>
              </div>
            );
          })}

        {/* Shelters & Hospitals Markers */}
        {showSheltersLayer &&
          shelters.map((s) => {
            if (!hasValidCoordinates(s)) return null;
            const pos = project(s.latitude, s.longitude);
            if (pos.x < -40 || pos.x > dimensions.width + 40 || pos.y < -40 || pos.y > dimensions.height + 40) return null;

            const isHospital = s.type === 'hospital';
            const isCamp = s.type === 'relief_camp';
            const iconBg = isHospital ? '#DC2626' : isCamp ? '#D97706' : '#0284C7';

            return (
              <div
                key={`shelter-${s.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSelectShelter) onSelectShelter(s);
                }}
                style={{
                  position: 'absolute',
                  left: `${pos.x}px`,
                  top: `${pos.y}px`,
                  transform: 'translate(-50%, -50%)',
                  pointerEvents: 'auto',
                  cursor: 'pointer',
                  zIndex: 15,
                }}
                title={`${s.name} (${s.type.replace('_', ' ')})`}
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    backgroundColor: iconBg,
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                    border: '2px solid #FFFFFF',
                  }}
                >
                  {isHospital ? <HeartPulse size={16} /> : isCamp ? <Tent size={16} /> : <Building2 size={16} />}
                </div>
              </div>
            );
          })}

        {/* User Current Position Marker */}
        {userLocation && (
          (() => {
            const pos = project(userLocation.lat, userLocation.lng);
            return (
              <div
                key="user-pos-marker"
                style={{
                  position: 'absolute',
                  left: `${pos.x}px`,
                  top: `${pos.y}px`,
                  transform: 'translate(-50%, -50%)',
                  pointerEvents: 'none',
                  zIndex: 35,
                }}
                title="Your Current Location"
              >
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: '#0284C7',
                    border: '3px solid #FFFFFF',
                    boxShadow: '0 0 12px rgba(2, 132, 199, 0.8)',
                  }}
                />
              </div>
            );
          })()
        )}
      </div>

      {/* 4. OVERLAY MAP CONTROLS */}
      {/* Top Left: Status Indicators & Tile Mode */}
      <div style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 30, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {(!isOnline || tilesFailed) && (
          <div
            style={{
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(239, 68, 68, 0.95)',
              color: '#FFFFFF',
              fontSize: '0.75rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              maxWidth: '300px',
            }}
          >
            <WifiOff size={14} style={{ flexShrink: 0 }} />
            <span>{t.map.offlineMapNotice}</span>
          </div>
        )}

        {locationError && (
          <div
            style={{
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(245, 158, 11, 0.95)',
              color: '#FFFFFF',
              fontSize: '0.75rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            <AlertTriangle size={14} style={{ flexShrink: 0 }} />
            <span>{locationError}</span>
          </div>
        )}
      </div>

      {/* Top Right: Zoom & Center Controls */}
      <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 30, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <button
          onClick={handleZoomIn}
          className="btn"
          title={t.map.zoomIn}
          aria-label={t.map.zoomIn}
          style={{
            width: '36px',
            height: '36px',
            padding: 0,
            borderRadius: 'var(--radius-sm)',
            backgroundColor: '#FFFFFF',
            color: 'var(--color-navy)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Plus size={18} />
        </button>

        <button
          onClick={handleZoomOut}
          className="btn"
          title={t.map.zoomOut}
          aria-label={t.map.zoomOut}
          style={{
            width: '36px',
            height: '36px',
            padding: 0,
            borderRadius: 'var(--radius-sm)',
            backgroundColor: '#FFFFFF',
            color: 'var(--color-navy)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Minus size={18} />
        </button>

        <button
          onClick={handleFitBounds}
          className="btn"
          title={t.map.fitBounds}
          aria-label={t.map.fitBounds}
          style={{
            width: '36px',
            height: '36px',
            padding: 0,
            borderRadius: 'var(--radius-sm)',
            backgroundColor: '#FFFFFF',
            color: 'var(--color-navy)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Maximize2 size={16} />
        </button>

        <button
          onClick={handleUseMyLocation}
          className="btn"
          title={t.map.myLocation}
          aria-label={t.map.myLocation}
          disabled={isLocating}
          style={{
            width: '36px',
            height: '36px',
            padding: 0,
            borderRadius: 'var(--radius-sm)',
            backgroundColor: userLocation ? '#0284C7' : '#FFFFFF',
            color: userLocation ? '#FFFFFF' : 'var(--color-navy)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Crosshair size={18} className={isLocating ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Bottom Left: Layer Toggles */}
      <div style={{ position: 'absolute', bottom: '12px', left: '12px', zIndex: 30, display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setShowSheltersLayer((v) => !v)}
          className="btn"
          style={{
            padding: '6px 10px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: showSheltersLayer ? '#0284C7' : '#FFFFFF',
            color: showSheltersLayer ? '#FFFFFF' : 'var(--text-secondary)',
            fontSize: '0.75rem',
            fontWeight: 600,
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Building2 size={14} />
          <span>{t.map.toggleShelters}</span>
        </button>

        <button
          onClick={() => setShowLiveLayer((v) => !v)}
          className="btn"
          style={{
            padding: '6px 10px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: showLiveLayer ? '#0D9488' : '#FFFFFF',
            color: showLiveLayer ? '#FFFFFF' : 'var(--text-secondary)',
            fontSize: '0.75rem',
            fontWeight: 600,
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Navigation size={14} />
          <span>{t.map.toggleLiveUpdates}</span>
        </button>

        <button
          onClick={() => setShowLegend((v) => !v)}
          className="btn"
          style={{
            padding: '6px 10px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: showLegend ? '#334155' : '#FFFFFF',
            color: showLegend ? '#FFFFFF' : 'var(--text-secondary)',
            fontSize: '0.75rem',
            fontWeight: 600,
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Compass size={14} />
          <span>{t.map.toggleLegend}</span>
        </button>
      </div>

      {/* Bottom Right: Expandable Floating Legend */}
      {showLegend && (
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            zIndex: 30,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            border: '1px solid var(--border-medium)',
            fontSize: '0.75rem',
            maxWidth: '280px',
            color: 'var(--color-navy)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px' }}>
            <strong style={{ fontSize: '0.8rem' }}>{t.map.legendTitle}</strong>
            <button
              onClick={() => setShowLegend(false)}
              className="btn"
              style={{ padding: '2px', background: 'transparent', border: 'none', color: 'var(--text-muted)' }}
            >
              <EyeOff size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#DC2626' }} />
              <span>Critical SOS Incident</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#EA580C' }} />
              <span>High / Urgent Priority</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#0D9488', border: '1px solid #FFF' }} />
              <span>{t.map.legendLiveLocation}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#0284C7' }} />
              <span>{t.map.legendShelter}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF' }}>+</span>
              <span>{t.map.legendHospital}</span>
            </div>
            {showEvacRoute && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '14px', height: '2px', borderTop: '2px dashed #38BDF8' }} />
                <span>{t.map.legendEvacVector}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
