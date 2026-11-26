// Pure Haversine math — no external API needed
const EARTH_RADIUS_METERS = 6371000;

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Returns distance in meters between two lat/lng coordinates.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

/**
 * Returns true if the given coordinates are within the college geofence.
 * Reads COLLEGE_LAT, COLLEGE_LNG, GEOFENCE_RADIUS_METERS, GEOFENCE_ENABLED from env.
 */
export function isWithinCampus(lat: number, lng: number): boolean {
  if (process.env.GEOFENCE_ENABLED !== 'true') return true; // disabled = always allow

  const collegeLat = parseFloat(process.env.COLLEGE_LAT ?? '0');
  const collegeLng = parseFloat(process.env.COLLEGE_LNG ?? '0');
  const radius = parseFloat(process.env.GEOFENCE_RADIUS_METERS ?? '300');

  const distance = haversineDistance(collegeLat, collegeLng, lat, lng);
  return distance <= radius;
}
