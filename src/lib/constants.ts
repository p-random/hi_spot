import type { EventStatus } from '@/types';

export const CAMPUS_CENTER = {
  lat: 37.5578,
  lng: 127.0467,
} as const;

export const MAP_CONFIG = {
  center: [CAMPUS_CENTER.lng, CAMPUS_CENTER.lat] as [number, number],
  zoom: 16.5,
  pitch: 45,
  bearing: -17.6,
  style: 'mapbox://styles/mapbox/streets-v12',
} as const;

export const PIN_COLORS: Record<EventStatus, string> = {
  ACTIVE: '#22C55E',
  CLOSED: '#9CA3AF',
  SCHEDULED: '#3B82F6',
};
