const R = 6371000; // Earth radius in meters
const rad = (d: number) => (d * Math.PI) / 180;

export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return R * Math.acos(
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) *
    Math.cos(rad(lng2) - rad(lng1)) +
    Math.sin(rad(lat1)) * Math.sin(rad(lat2)),
  );
}
