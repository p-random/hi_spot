'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { useGeolocation } from '../hooks/useGeolocation';
import { useDeviceOrientation } from '../hooks/useDeviceOrientation';
import { initMap, addTerrain, createUserMarkerElement } from '../lib/mapbox';
import InfoPanel from './InfoPanel';
import PermissionPanel from './PermissionPanel';

const ACCURACY_SOURCE = 'accuracy-source';
const ACCURACY_LAYER = 'accuracy-layer';

export default function CampusMap() {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const indicatorRef = useRef<HTMLElement | null>(null);

  const { position, error: locationError } = useGeolocation();
  const { heading, permissionState, requestPermission } = useDeviceOrientation();

  // Map initialization
  useEffect(() => {
    if (!token || !containerRef.current) return;

    const map = initMap(containerRef.current, token);
    mapRef.current = map;

    map.on('style.load', () => addTerrain(map));

    map.on('load', () => {
      map.addSource(ACCURACY_SOURCE, {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: { accuracy: 0 } },
      });
      map.addLayer({
        id: ACCURACY_LAYER,
        type: 'circle',
        source: ACCURACY_SOURCE,
        paint: {
          'circle-radius': ['interpolate', ['exponential', 2], ['zoom'], 0, ['*', ['get', 'accuracy'], 0.008], 17, ['*', ['get', 'accuracy'], 1.055]],
          'circle-color': 'rgba(56,189,248,0.15)',
          'circle-stroke-width': 1,
          'circle-stroke-color': 'rgba(56,189,248,0.4)',
          'circle-pitch-alignment': 'map',
        },
      });

      const markerEl = createUserMarkerElement();
      indicatorRef.current = markerEl.querySelector('.direction-indicator') as HTMLElement;

      const marker = new mapboxgl.Marker({ element: markerEl, anchor: 'center' })
        .setLngLat([0, 0])
        .addTo(map);
      markerRef.current = marker;
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      indicatorRef.current = null;
    };
  }, [token]);

  // Location updates
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !position) return;

    const { latitude: lat, longitude: lng, accuracy } = position.coords;
    const center: [number, number] = [lng, lat];

    map.easeTo({ center, duration: 300 });
    marker?.setLngLat(center);

    if (map.getSource(ACCURACY_SOURCE)) {
      (map.getSource(ACCURACY_SOURCE) as mapboxgl.GeoJSONSource).setData({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: center },
        properties: { accuracy },
      });
    }
  }, [position]);

  // Heading updates
  useEffect(() => {
    const map = mapRef.current;
    if (!map || heading === null) return;

    map.easeTo({ bearing: -heading, duration: 100 });

    if (indicatorRef.current) {
      indicatorRef.current.style.transform = `translateX(-50%) rotate(${heading}deg)`;
    }
  }, [heading]);

  if (!token) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#f8fafc', background: '#0f172a' }}>
        NEXT_PUBLIC_MAPBOX_TOKEN이 설정되지 않았습니다.
      </div>
    );
  }

  const locationDenied = locationError?.code === 1;
  const needsCompassPermission = permissionState === 'needs-request';
  const compassDenied = permissionState === 'denied';

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <InfoPanel
        latitude={position?.coords.latitude ?? null}
        longitude={position?.coords.longitude ?? null}
        accuracy={position?.coords.accuracy ?? null}
      />
      <PermissionPanel
        needsCompassPermission={needsCompassPermission}
        locationDenied={locationDenied}
        compassDenied={compassDenied}
        onRequestCompass={requestPermission}
        onRetryLocation={() => window.location.reload()}
      />
    </div>
  );
}
