/**
 * Drop-off/pick-up geofencing (SDP-3 follow-up): a campus's address is
 * geocoded server-side (see backend/index.js's geocodeAddress) into
 * latitude/longitude, with an admin-configurable radius in meters. This
 * module just answers "is the device within that radius" — a one-shot
 * distance check, not continuous background monitoring, so a plain
 * Haversine calculation is enough; no dedicated geofencing library needed.
 */

export interface Coordinates {
  lat: number;
  lon: number;
  accuracy?: number;
  timestamp?: number;
}

export interface GeofenceTarget {
  latitude?: number | null;
  longitude?: number | null;
  geofenceRadius?: number | null;
}

export const DEFAULT_GEOFENCE_RADIUS_METERS = 150;

const EARTH_RADIUS_METERS = 6371000;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Great-circle distance between two points, in meters. */
export function distanceMeters(a: Coordinates, b: Coordinates): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

/**
 * A campus with no coordinates yet — never geocoded (created before this
 * feature shipped, or its address hasn't been saved since) — has no
 * geofence to enforce. Callers use this to fall back to the old
 * status-only gating rather than blocking every drop-off/pick-up.
 */
export function hasGeofence(target: GeofenceTarget): boolean {
  return target.latitude != null && target.longitude != null;
}

export function isWithinGeofence(device: Coordinates, target: GeofenceTarget): boolean {
  if (!hasGeofence(target) || !device || (device.timestamp != null && Date.now() - device.timestamp > 30000)) return false;
  const center = { lat: target.latitude as number, lon: target.longitude as number };
  const radius = target.geofenceRadius ?? DEFAULT_GEOFENCE_RADIUS_METERS;
  return (device.accuracy ?? 0) <= radius && distanceMeters(device, center) + (device.accuracy ?? 0) <= radius;
}
