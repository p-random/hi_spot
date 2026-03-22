'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MAP_CONFIG } from '@/lib/constants';
import { MapProvider } from '@/hooks/useMap';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

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

  useEffect(() => {
    const el = mapContainerRef.current;
    if (!el) return;

    // Defer map creation so the browser has painted the container with its
    // final dimensions.  Without this, Mapbox may see a 0×0 rect and skip
    // tile fetching entirely, resulting in a blank white canvas.
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
        // Force Mapbox to recalculate canvas size after the style loads
        instance!.resize();
        add3DBuildings(instance!);
        setMap(instance);
      });

      // Also resize once the map is idle (safety net)
      instance.once('idle', () => {
        instance?.resize();
      });
    });

    return () => {
      cancelAnimationFrame(rafId);
      instance?.remove();
      setMap(null);
    };
  }, []);

  return (
    <MapProvider value={map}>
      {/* Outer wrapper: full viewport height via inline style (avoids Tailwind compilation issues) */}
      <div
        ref={containerRef}
        style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}
      >
        {/* Map canvas container: absolutely fills parent */}
        <div
          ref={mapContainerRef}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        />
        {map && children}
      </div>
    </MapProvider>
  );
}
