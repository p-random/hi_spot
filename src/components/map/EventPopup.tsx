'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { useMap } from '@/hooks/useMap';
import { PIN_COLORS } from '@/lib/constants';
import type { EventStatus } from '@/types';

interface EventPopupProps {
  id: string;
  lat: number;
  lng: number;
  title: string;
  status: EventStatus;
  currentSlots: number;
  maxSlots: number;
  rewardPoints: number;
  onDetailClick: (eventId: string) => void;
  onClose: () => void;
}

// Module-level singleton so only one popup is open at a time
let activePopup: mapboxgl.Popup | null = null;

const STATUS_LABEL: Record<EventStatus, string> = {
  ACTIVE: '모집 중',
  CLOSED: '마감',
  SCHEDULED: '예정',
};

function buildPopupHTML(
  id: string,
  title: string,
  status: EventStatus,
  currentSlots: number,
  maxSlots: number,
  rewardPoints: number
): string {
  const color = PIN_COLORS[status];
  const label = STATUS_LABEL[status];
  return `
    <div style="font-family:sans-serif;min-width:160px;padding:4px 0">
      <div style="font-size:14px;font-weight:700;margin-bottom:6px">${title}</div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
        <span style="background:${color};color:white;font-size:11px;font-weight:600;padding:2px 6px;border-radius:9999px">${label}</span>
        <span style="font-size:12px;color:#555">${currentSlots}/${maxSlots}명</span>
      </div>
      <div style="font-size:12px;color:#555;margin-bottom:8px">🎁 ${rewardPoints}pt</div>
      <button
        data-event-id="${id}"
        style="width:100%;padding:6px 0;background:#22C55E;color:white;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer"
      >자세히 보기</button>
    </div>
  `;
}

export default function EventPopup({
  id, lat, lng, title, status, currentSlots, maxSlots, rewardPoints, onDetailClick, onClose,
}: EventPopupProps) {
  const map = useMap();
  const popupRef = useRef<mapboxgl.Popup | null>(null);

  useEffect(() => {
    if (!map) return;

    // Close any existing popup before opening a new one
    if (activePopup) {
      activePopup.remove();
      activePopup = null;
    }

    const popup = new mapboxgl.Popup({ closeButton: true, maxWidth: '220px' })
      .setLngLat([lng, lat])
      .setHTML(buildPopupHTML(id, title, status, currentSlots, maxSlots, rewardPoints))
      .addTo(map);

    // Wire up the "자세히 보기" button after the popup is in the DOM
    popup.on('open', () => {
      const btn = popup.getElement()?.querySelector<HTMLButtonElement>('[data-event-id]');
      btn?.addEventListener('click', () => onDetailClick(id));
    });

    popup.on('close', () => {
      if (activePopup === popup) activePopup = null;
      onClose();
    });

    activePopup = popup;
    popupRef.current = popup;

    return () => {
      popup.remove();
      if (activePopup === popup) activePopup = null;
      popupRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  // Update popup content when slots or status change
  useEffect(() => {
    const popup = popupRef.current;
    if (!popup?.isOpen()) return;
    popup.setHTML(buildPopupHTML(id, title, status, currentSlots, maxSlots, rewardPoints));
    // Re-wire button after HTML replacement
    const btn = popup.getElement()?.querySelector<HTMLButtonElement>('[data-event-id]');
    btn?.addEventListener('click', () => onDetailClick(id));
  }, [status, currentSlots, maxSlots, id, title, rewardPoints, onDetailClick]);

  return null;
}
