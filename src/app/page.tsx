'use client';

import { useEffect, useRef, useState } from 'react';
import MapView from '@/components/map/DynamicMapView';
import EventPin from '@/components/map/EventPin';
import EventPopup from '@/components/map/EventPopup';
import EventDetailPanel from '@/components/event/EventDetailPanel';
import InfoPanel from '@/components/map/InfoPanel';
import PermissionPanel from '@/components/map/PermissionPanel';
import { useEvents } from '@/hooks/useEvents';
import { useWatchGeolocation } from '@/hooks/useWatchGeolocation';
import { useDeviceOrientation } from '@/hooks/useDeviceOrientation';
import { useMap } from '@/hooks/useMap';
import { useUserMarker } from '@/components/map/MapView';
import { updateAccuracyCircle } from '@/lib/mapboxUtils';
import type { Event } from '@/types';

// Stable demo user id for MVP (no auth)
const USER_ID = 'demo-user-00000000-0000-0000-0000-000000000001';

type ActiveEvent = Pick<
  Event,
  'id' | 'title' | 'description' | 'lat' | 'lng' | 'join_radius_m' |
  'max_slots' | 'current_slots' | 'reward_points' | 'recruit_duration_min' | 'activated_at' | 'status'
>;

// ─── Inner page that has access to MapContext ─────────────────────────────────

interface InnerPageProps {
  events: ActiveEvent[];
  userId: string;
  position: GeolocationPosition | null;
  locationError: GeolocationPositionError | null;
  heading: number | null;
  needsCompassPermission: boolean;
  compassDenied: boolean;
  onRequestCompass: () => Promise<void>;
}

function InnerPage({
  events, userId, position, locationError, heading,
  needsCompassPermission, compassDenied, onRequestCompass,
}: InnerPageProps) {
  const map = useMap();
  const { marker, indicator } = useUserMarker();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [panelEventId, setPanelEventId] = useState<string | null>(null);
  const initialFlyDone = useRef(false);

  // ── GPS → map center + marker + accuracy circle ────────────────────
  useEffect(() => {
    if (!map || !position || !marker) return;

    const { latitude: lat, longitude: lng, accuracy } = position.coords;
    const center: [number, number] = [lng, lat];

    // First time: fly to position; subsequent: smooth ease
    if (!initialFlyDone.current) {
      map.flyTo({ center, zoom: 17, speed: 1.5 });
      initialFlyDone.current = true;
    } else {
      map.easeTo({ center, duration: 300 });
    }

    marker.setLngLat(center);
    updateAccuracyCircle(map, lng, lat, accuracy);
  }, [map, position, marker]);

  // ── Heading → map bearing + indicator rotation ─────────────────────
  useEffect(() => {
    if (!map || heading === null) return;

    map.easeTo({ bearing: -heading, duration: 100 });

    if (indicator) {
      indicator.style.transform = `translateX(-50%) rotate(${heading}deg)`;
    }
  }, [map, heading, indicator]);

  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null;
  const panelEvent = events.find((e) => e.id === panelEventId) ?? null;

  const locationDenied = locationError?.code === 1;
  const userLat = position?.coords.latitude ?? null;
  const userLng = position?.coords.longitude ?? null;

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

      {/* Active popup (shown when a pin is clicked) */}
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

      {/* Info panel (top-left): lat/lng/accuracy */}
      <InfoPanel
        latitude={position?.coords.latitude ?? null}
        longitude={position?.coords.longitude ?? null}
        accuracy={position?.coords.accuracy ?? null}
      />

      {/* Permission panel (center overlay) */}
      <PermissionPanel
        needsCompassPermission={needsCompassPermission}
        locationDenied={locationDenied}
        compassDenied={compassDenied}
        onRequestCompass={onRequestCompass}
        onRetryLocation={() => window.location.reload()}
      />

      {/* Location error toast */}
      {locationError && !locationDenied && (
        <div style={{
          position: 'absolute', bottom: 96, left: '50%', transform: 'translateX(-50%)',
          zIndex: 20, background: '#27272a', color: 'white', fontSize: 14,
          padding: '8px 16px', borderRadius: 9999, boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          whiteSpace: 'nowrap',
        }}>
          위치를 가져올 수 없습니다.
        </div>
      )}

      {/* Detail panel (bottom sheet) */}
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
  const { position, error: locationError } = useWatchGeolocation();
  const { heading, permissionState, requestPermission } = useDeviceOrientation();

  const needsCompassPermission = permissionState === 'needs-request';
  const compassDenied = permissionState === 'denied';

  return (
    <MapView>
      <InnerPage
        events={events}
        userId={USER_ID}
        position={position}
        locationError={locationError}
        heading={heading}
        needsCompassPermission={needsCompassPermission}
        compassDenied={compassDenied}
        onRequestCompass={requestPermission}
      />
    </MapView>
  );
}
