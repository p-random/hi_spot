'use client';

import { useEffect, useRef, useState, createContext, useContext } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MAP_CONFIG } from '@/lib/constants';
import { MapProvider } from '@/hooks/useMap';
import { addAccuracyLayer, createUserMarkerElement } from '@/lib/mapboxUtils';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

// Context for the user marker + direction indicator refs
interface UserMarkerContextValue {
  marker: mapboxgl.Marker | null;
  indicator: HTMLElement | null;
}
const UserMarkerContext = createContext<UserMarkerContextValue>({ marker: null, indicator: null });
export const UserMarkerProvider = UserMarkerContext.Provider;
export function useUserMarker() { return useContext(UserMarkerContext); }

function add3DBuildings(map: mapboxgl.Map) {
  const layers = map.getStyle().layers;
  if (!layers) return;
  const labelLayerId = layers.find(
    (l) => l.type === 'symbol' && (l.layout as { 'text-field'?: unknown })?.['text-field'],
  )?.id;

  map.addLayer(
    {
      id: '3d-buildings',
      source: 'composite',
      'source-layer': 'building',
      filter: ['==', 'extrude', 'true'],
      type: 'fill-extrusion',
      minzoom: 15,
      paint: {
        'fill-extrusion-color': '#aaa',
        'fill-extrusion-height': ['get', 'height'],
        'fill-extrusion-base': ['get', 'min_height'],
        'fill-extrusion-opacity': 0.6,
      },
    },
    labelLayerId,
  );
}

interface MapViewProps {
  children?: React.ReactNode;
}

export default function MapView({ children }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const [userMarkerCtx, setUserMarkerCtx] = useState<UserMarkerContextValue>({ marker: null, indicator: null });

  useEffect(() => {
    const el = mapContainerRef.current;
    if (!el) return;

    let instance: mapboxgl.Map | null = null;
    const rafId = requestAnimationFrame(() => {
      instance = new mapboxgl.Map({
        container: el,
        style: MAP_CONFIG.style,
        center: MAP_CONFIG.center,
        zoom: MAP_CONFIG.zoom,
        pitch: MAP_CONFIG.pitch,
        bearing: MAP_CONFIG.bearing,
      });

      instance.on('load', () => {
        instance!.resize();
        add3DBuildings(instance!);

        // Add accuracy circle layer (from archive)
        addAccuracyLayer(instance!);

        // Create user marker with direction indicator (from archive)
        const markerEl = createUserMarkerElement();
        const indicator = markerEl.querySelector('.direction-indicator') as HTMLElement;
        const marker = new mapboxgl.Marker({ element: markerEl, anchor: 'center' })
          .setLngLat([0, 0])
          .addTo(instance!);

        setUserMarkerCtx({ marker, indicator });
        setMap(instance);
      });

      instance.once('idle', () => {
        instance?.resize();
      });
    });

    return () => {
      cancelAnimationFrame(rafId);
      instance?.remove();
      setMap(null);
      setUserMarkerCtx({ marker: null, indicator: null });
    };
  }, []);

  return (
    <MapProvider value={map}>
      <UserMarkerProvider value={userMarkerCtx}>
        <div
          ref={containerRef}
          style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}
        >
          <div
            ref={mapContainerRef}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
          />
          {map && children}
        </div>
      </UserMarkerProvider>
    </MapProvider>
  );
}

