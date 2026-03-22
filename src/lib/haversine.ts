const EARTH_RADIUS_M = 6371000;

/** Returns the great-circle distance in meters between two coordinates. */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lng2 - lng1);

  const cosAngle =
    Math.cos(φ1) * Math.cos(φ2) * Math.cos(Δλ) +
    Math.sin(φ1) * Math.sin(φ2);

  // clamp to [-1, 1] to guard against floating-point drift at identical coords
  return EARTH_RADIUS_M * Math.acos(Math.min(1, Math.max(-1, cosAngle)));
}
