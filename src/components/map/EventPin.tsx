'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { useMap } from '@/hooks/useMap';
import { PIN_COLORS } from '@/lib/constants';
import type { EventStatus } from '@/types';

interface EventPinProps {
  id: string;
  lat: number;
  lng: number;
  status: EventStatus;
  currentSlots: number;
  maxSlots: number;
  onPinClick: (eventId: string) => void;
}

function createPinElement(status: EventStatus, currentSlots: number, maxSlots: number): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
  `;

  const pin = document.createElement('div');
  const color = PIN_COLORS[status];
  pin.style.cssText = `
    width: 36px;
    height: 36px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    background-color: ${color};
    border: 2px solid white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  const badge = document.createElement('span');
  badge.style.cssText = `
    transform: rotate(45deg);
    font-size: 9px;
    font-weight: 700;
    color: white;
    line-height: 1;
    text-align: center;
  `;
  badge.textContent = `${currentSlots}/${maxSlots}`;

  pin.appendChild(badge);
  el.appendChild(pin);
  return el;
}

export default function EventPin({ id, lat, lng, status, currentSlots, maxSlots, onPinClick }: EventPinProps) {
  const map = useMap();
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!map) return;

    const el = createPinElement(status, currentSlots, maxSlots);
    el.addEventListener('click', () => onPinClick(id));

    const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat([lng, lat])
      .addTo(map);

    markerRef.current = marker;

    return () => {
      marker.remove();
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  // Update pin element when status or slots change without recreating the marker
  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;

    const el = marker.getElement();
    const pin = el.firstElementChild as HTMLDivElement | null;
    if (!pin) return;

    pin.style.backgroundColor = PIN_COLORS[status];
    const badge = pin.firstElementChild as HTMLSpanElement | null;
    if (badge) badge.textContent = `${currentSlots}/${maxSlots}`;
  }, [status, currentSlots, maxSlots]);

  return null;
}
