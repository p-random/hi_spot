'use client';

import { createContext, useContext } from 'react';
import type mapboxgl from 'mapbox-gl';

const MapContext = createContext<mapboxgl.Map | null>(null);

export const MapProvider = MapContext.Provider;

export function useMap(): mapboxgl.Map | null {
  return useContext(MapContext);
}
