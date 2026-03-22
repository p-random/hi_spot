'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import MapView from '@/components/map/DynamicMapView';
import EventPin from '@/components/map/EventPin';
import EventPopup from '@/components/map/EventPopup';
import EventDetailPanel from '@/components/event/EventDetailPanel';
import { useEvents } from '@/hooks/useEvents';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useMap } from '@/hooks/useMap';
import type { Event } from '@/types';

// Stable demo user id for MVP (no auth)
const USER_ID = 'demo-user-00000000-0000-0000-0000-000000000001';

type ActiveEvent = Pick<
  Event,
  'id' | 'title' | 'description' | 'lat' | 'lng' | 'join_radius_m' |
  'max_slots' | 'current_slots' | 'reward_points' | 'recruit_duration_min' | 'activated_at' | 'status'
>;

// ─── Location dot rendered inside MapView context ────────────────────────────

interface LocationDotProps {
  lat: number;
  lng: number;
  accuracy: number;
}

function LocationDot({ lat, lng, accuracy }: LocationDotProps) {
  const map = useMap();
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const circleIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!map) return;

    // Blue dot marker
    const el = document.createElement('div');
    el.style.cssText = `
      width:16px;height:16px;border-radius:50%;
      background:#3B82F6;border:2px solid white;
      box-shadow:0 0 0 4px rgba(59,130,246,0.25);
    `;
    const marker = new mapboxgl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
    markerRef.current = marker;

    // Accuracy circle as a GeoJSON source + fill layer
    const sourceId = `location-accuracy-${Date.now()}`;
    circleIdRef.current = sourceId;

    const radiusKm = accuracy / 1000;
    const steps = 64;
    const coords: [number, number][] = Array.from({ length: steps + 1 }, (_, i) => {
      const angle = (i / steps) * 2 * Math.PI;
      const dLat = (radiusKm / 111.32) * Math.cos(angle);
      const dLng = (radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180))) * Math.sin(angle);
      return [lng + dLng, lat + dLat];
    });

    map.addSource(sourceId, {
      type: 'geojson',
      data: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] }, properties: {} },
    });
    map.addLayer({
      id: sourceId,
      type: 'fill',
      source: sourceId,
      paint: { 'fill-color': '#3B82F6', 'fill-opacity': 0.12 },
    });

    return () => {
      marker.remove();
      if (map.getLayer(sourceId)) map.removeLayer(sourceId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [map, lat, lng, accuracy]);

  return null;
}

// ─── Inner page that has access to MapContext ─────────────────────────────────

interface InnerPageProps {
  events: ActiveEvent[];
  userId: string;
  userLat: number | null;
  userLng: number | null;
  userAccuracy: number | null;
  locationError: string | null;
  locationLoading: boolean;
  onRequestLocation: () => void;
}

function InnerPage({
  events, userId, userLat, userLng, userAccuracy,
  locationError, locationLoading, onRequestLocation,
}: InnerPageProps) {
  const map = useMap();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [panelEventId, setPanelEventId] = useState<string | null>(null);
  const hasFlyRef = useRef(false);

  // Fly the map to the user's location when coordinates arrive
  useEffect(() => {
    if (map && userLat != null && userLng != null) {
      map.flyTo({ center: [userLng, userLat], zoom: 16.5, speed: 1.5 });
      hasFlyRef.current = true;
    }
  }, [map, userLat, userLng]);

  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null;
  const panelEvent = events.find((e) => e.id === panelEventId) ?? null;

  function handlePinClick(eventId: string) {
    setSelectedEventId(eventId);
  }

  function handleDetailClick(eventId: string) {
    setPanelEventId(eventId);
    setSelectedEventId(null);
  }

  function handlePopupClose() {
    setSelectedEventId(null);
  }

  function handlePanelClose() {
    setPanelEventId(null);
  }

  return (
    <>
      {/* Event pins */}
      {events.map((event) => (
        <EventPin
          key={event.id}
          id={event.id}
          lat={event.lat}
          lng={event.lng}
          status={event.status}
          currentSlots={event.current_slots}
          maxSlots={event.max_slots}
          onPinClick={handlePinClick}
        />
      ))}

      {/* Active popup */}
      {selectedEvent && (
        <EventPopup
          key={selectedEvent.id}
          id={selectedEvent.id}
          lat={selectedEvent.lat}
          lng={selectedEvent.lng}
          title={selectedEvent.title}
          status={selectedEvent.status}
          currentSlots={selectedEvent.current_slots}
          maxSlots={selectedEvent.max_slots}
          rewardPoints={selectedEvent.reward_points}
          onDetailClick={handleDetailClick}
          onClose={handlePopupClose}
        />
      )}

      {/* User location dot */}
      {userLat != null && userLng != null && userAccuracy != null && (
        <LocationDot lat={userLat} lng={userLng} accuracy={userAccuracy} />
      )}

      {/* Location button */}
      <button
        onClick={onRequestLocation}
        disabled={locationLoading}
        aria-label="내 위치 보기"
        className="
          absolute bottom-8 right-4 z-10
          w-12 h-12 rounded-full bg-white shadow-lg
          flex items-center justify-center text-xl
          disabled:opacity-50 transition-opacity
        "
      >
        {locationLoading ? '⏳' : '📍'}
      </button>

      {/* Location error toast */}
      {locationError && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 bg-zinc-800 text-white text-sm px-4 py-2 rounded-full shadow-lg whitespace-nowrap">
          {locationError}
        </div>
      )}

      {/* Detail panel */}
      {panelEvent && (
        <EventDetailPanel
          event={panelEvent}
          userId={userId}
          userLat={userLat}
          userLng={userLng}
          onClose={handlePanelClose}
        />
      )}
    </>
  );
}

// ─── Page root ────────────────────────────────────────────────────────────────

export default function Home() {
  const { events } = useEvents();
  const {
    lat: userLat,
    lng: userLng,
    accuracy: userAccuracy,
    error: locationError,
    loading: locationLoading,
    requestLocation,
  } = useGeolocation(USER_ID);

  return (
    <MapView>
      <InnerPage
        events={events}
        userId={USER_ID}
        userLat={userLat}
        userLng={userLng}
        userAccuracy={userAccuracy}
        locationError={locationError}
        locationLoading={locationLoading}
        onRequestLocation={requestLocation}
      />
    </MapView>
  );
}
