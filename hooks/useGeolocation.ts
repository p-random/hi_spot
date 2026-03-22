import { useState, useEffect } from 'react';

interface GeolocationState {
  position: GeolocationPosition | null;
  error: GeolocationPositionError | null;
  isWatching: boolean;
}

export function useGeolocation(): GeolocationState {
  const [state, setState] = useState<GeolocationState>({
    position: null,
    error: null,
    isWatching: false,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState(s => ({
        ...s,
        error: { code: 2, message: 'Geolocation not supported', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError,
      }));
      return;
    }

    setState(s => ({ ...s, isWatching: true }));

    const watchId = navigator.geolocation.watchPosition(
      (position) => setState(s => ({ ...s, position, error: null })),
      (error) => setState(s => ({ ...s, error })),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      setState(s => ({ ...s, isWatching: false }));
    };
  }, []);

  return state;
}
