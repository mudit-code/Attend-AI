import { useState, useEffect, useRef, useCallback } from 'react';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { MapPin, ChevronDown, ChevronUp, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

// ─── Haversine distance (pure JS — no API call) ──────────────────
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Geofence circle overlay using canvas ────────────────────────
function GeofenceCircle({ center, radiusMeters }: { center: google.maps.LatLngLiteral; radiusMeters: number }) {
  const map = useMap();
  const circleRef = useRef<google.maps.Circle | null>(null);

  useEffect(() => {
    if (!map) return;
    circleRef.current = new google.maps.Circle({
      map,
      center,
      radius: radiusMeters,
      strokeColor: '#3B82F6',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: '#3B82F6',
      fillOpacity: 0.1,
    });
    return () => { circleRef.current?.setMap(null); };
  }, [map, center, radiusMeters]);

  return null;
}

// ─── Main Widget ─────────────────────────────────────────────────
const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
const COLLEGE_LAT = parseFloat(import.meta.env.VITE_COLLEGE_LAT ?? '22.7196');
const COLLEGE_LNG = parseFloat(import.meta.env.VITE_COLLEGE_LNG ?? '75.8577');
const GEOFENCE_RADIUS = parseFloat(import.meta.env.VITE_GEOFENCE_RADIUS ?? '300');

type LocationStatus = 'idle' | 'loading' | 'on_campus' | 'off_campus' | 'error';

export default function CampusMapWidget() {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState<LocationStatus>('idle');
  const [userPos, setUserPos] = useState<google.maps.LatLngLiteral | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const collegeCenter: google.maps.LatLngLiteral = { lat: COLLEGE_LAT, lng: COLLEGE_LNG };

  const checkLocation = useCallback(() => {
    setStatus('loading');
    setLocationError(null);
    if (!navigator.geolocation) {
      setStatus('error');
      setLocationError('Geolocation not supported by this browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        setUserPos({ lat: userLat, lng: userLng });
        const dist = haversineDistance(COLLEGE_LAT, COLLEGE_LNG, userLat, userLng);
        setDistance(Math.round(dist));
        setStatus(dist <= GEOFENCE_RADIUS ? 'on_campus' : 'off_campus');
      },
      (err) => {
        setStatus('error');
        setLocationError(err.code === 1 ? 'Location permission denied' : 'Could not get location');
      },
      { timeout: 10000, maximumAge: 30000 }
    );
  }, []);

  // Auto-check when expanded
  useEffect(() => {
    if (expanded && status === 'idle') checkLocation();
  }, [expanded, status, checkLocation]);

  // If no API key configured, don't render the widget at all
  if (!GOOGLE_MAPS_KEY) return null;

  const statusConfig = {
    idle: { color: 'var(--color-text-faint)', bg: 'transparent', label: 'Checking...', icon: null },
    loading: { color: '#3B82F6', bg: 'rgba(59,130,246,0.1)', label: 'Getting location...', icon: <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> },
    on_campus: { color: '#10B981', bg: 'rgba(16,185,129,0.12)', label: `On Campus ✅ (${distance}m from gate)`, icon: <CheckCircle size={14} /> },
    off_campus: { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', label: `Off Campus ⚠️ (${distance}m away)`, icon: <AlertCircle size={14} /> },
    error: { color: '#EF4444', bg: 'rgba(239,68,68,0.12)', label: locationError ?? 'Location error', icon: <AlertCircle size={14} /> },
  }[status];

  return (
    <div style={{
      margin: '0 16px 16px',
      background: 'var(--color-surface)',
      borderRadius: '16px',
      border: '1px solid var(--color-border)',
      overflow: 'hidden',
    }}>
      {/* Toggle Header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--color-text)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MapPin size={16} color="#3B82F6" />
          <span style={{ fontSize: '14px', fontWeight: 700 }}>Campus Map</span>
          {/* Inline status badge when collapsed */}
          {!expanded && (status === 'on_campus' || status === 'off_campus') && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
              background: statusConfig.bg, color: statusConfig.color,
            }}>
              {statusConfig.icon}
              {status === 'on_campus' ? 'On Campus' : 'Off Campus'}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp size={16} color="var(--color-text-faint)" /> : <ChevronDown size={16} color="var(--color-text-faint)" />}
      </button>

      {/* Expandable Content */}
      {expanded && (
        <div>
          {/* Status Bar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 16px 12px',
            background: statusConfig.bg,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: statusConfig.color, fontSize: '13px', fontWeight: 600 }}>
              {statusConfig.icon}
              {statusConfig.label}
            </div>
            <button
              onClick={checkLocation}
              disabled={status === 'loading'}
              style={{
                fontSize: '11px', padding: '4px 10px', borderRadius: '20px',
                border: `1px solid ${statusConfig.color}`, background: 'transparent',
                color: statusConfig.color, cursor: 'pointer', fontWeight: 600,
              }}
            >
              {status === 'loading' ? 'Checking...' : '↻ Refresh'}
            </button>
          </div>

          {/* Google Map */}
          <div style={{ height: '240px', position: 'relative' }}>
            <APIProvider apiKey={GOOGLE_MAPS_KEY}>
              <Map
                defaultCenter={collegeCenter}
                defaultZoom={16}
                mapId="campus_map"
                gestureHandling="greedy"
                disableDefaultUI={true}
                style={{ width: '100%', height: '100%' }}
              >
                {/* College Pin */}
                <AdvancedMarker position={collegeCenter} title="College Campus">
                  <div style={{
                    background: '#1D4ED8', color: '#fff', borderRadius: '50%',
                    width: '36px', height: '36px', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '18px', boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    border: '3px solid #fff',
                  }}>
                    🏫
                  </div>
                </AdvancedMarker>

                {/* User's live location */}
                {userPos && (
                  <AdvancedMarker position={userPos} title="You are here">
                    <div style={{
                      background: status === 'on_campus' ? '#10B981' : '#F59E0B',
                      color: '#fff', borderRadius: '50%',
                      width: '28px', height: '28px', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '14px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)', border: '3px solid #fff',
                    }}>
                      👤
                    </div>
                  </AdvancedMarker>
                )}

                {/* Geofence circle */}
                <GeofenceCircle center={collegeCenter} radiusMeters={GEOFENCE_RADIUS} />
              </Map>
            </APIProvider>
          </div>

          {/* Footer info */}
          <div style={{ padding: '10px 16px', fontSize: '11px', color: 'var(--color-text-faint)', textAlign: 'center' }}>
            Blue circle = {GEOFENCE_RADIUS}m geofence boundary · 🏫 = College · 👤 = You
          </div>
        </div>
      )}
    </div>
  );
}
