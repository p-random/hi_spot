'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MAP_CONFIG } from '@/lib/constants';
import { MapProvider } from '@/hooks/useMap';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

function add3DBuildings(map: mapboxgl.Map) {
  // Insert the 3D building layer below label layers so labels stay on top
  const labelLayerId = map
    .getStyle()
    .layers.find((l) => l.type === 'symbol' && (l.layout as { 'text-field'?: unknown })?.['text-field'])?.id;

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
    labelLayerId
  );
}

interface MapViewProps {
  children?: React.ReactNode;
}

export default function MapView({ children }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const instance = new mapboxgl.Map({
      container: containerRef.current,
      style: MAP_CONFIG.style,
      center: MAP_CONFIG.center,
      zoom: MAP_CONFIG.zoom,
      pitch: MAP_CONFIG.pitch,
      bearing: MAP_CONFIG.bearing,
    });

    instance.on('load', () => {
      add3DBuildings(instance);
      setMap(instance);
    });

    return () => {
      instance.remove();
      setMap(null);
    };
  }, []);

  return (
    <MapProvider value={map}>
      {/* Full-screen map container, mobile-first */}
      <div className="relative w-full h-dvh">
        <div ref={containerRef} className="absolute inset-0" />
        {map && children}
      </div>
    </MapProvider>
  );
}
