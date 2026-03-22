'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { updateLocation } from '@/lib/api';

interface GeolocationState {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
}

const UPDATE_INTERVAL_MS = 30_000;

export function useGeolocation(userId: string) {
  const [state, setState] = useState<GeolocationState>({
    lat: null,
    lng: null,
    accuracy: null,
    error: null,
    loading: false,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  function stopInterval() {
    if (intervalRef.current != null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  async function pushLocation(lat: number, lng: number) {
    try {
      await updateLocation({ user_id: userId, lat, lng });
    } catch {
      // Non-fatal: location update failure should not surface as an error
    }
  }

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState((s) => ({ ...s, error: '이 브라우저는 위치 서비스를 지원하지 않습니다.' }));
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;

        latestCoordsRef.current = { lat, lng };
        setState({ lat, lng, accuracy, error: null, loading: false });

        // Push immediately, then every 30 s
        pushLocation(lat, lng);
        stopInterval();
        intervalRef.current = setInterval(() => {
          const coords = latestCoordsRef.current;
          if (coords) pushLocation(coords.lat, coords.lng);
        }, UPDATE_INTERVAL_MS);
      },
      (err) => {
        const msg =
          err.code === err.PERMISSION_DENIED
            ? '위치 권한이 필요합니다. 브라우저 설정에서 허용해주세요.'
            : '위치를 가져올 수 없습니다.';
        setState((s) => ({ ...s, error: msg, loading: false }));
        stopInterval();
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clean up interval on unmount
  useEffect(() => () => stopInterval(), []);

  return { ...state, requestLocation };
}
