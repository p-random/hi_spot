import { useState, useEffect, useRef } from 'react';

type PermissionState = 'unknown' | 'granted' | 'denied' | 'needs-request';

interface DeviceOrientationState {
  heading: number | null;
  permissionState: PermissionState;
}

interface DeviceOrientationActions {
  requestPermission: () => Promise<void>;
}

export function useDeviceOrientation(): DeviceOrientationState & DeviceOrientationActions {
  const [heading, setHeading] = useState<number | null>(null);
  const [permissionState, setPermissionState] = useState<PermissionState>('unknown');
  const handlerRef = useRef<((e: DeviceOrientationEvent) => void) | null>(null);

  const registerListener = () => {
    const handler = (e: DeviceOrientationEvent) => {
      if (e.alpha !== null) setHeading(e.alpha);
    };
    handlerRef.current = handler;
    window.addEventListener('deviceorientation', handler);
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !window.DeviceOrientationEvent) {
      return;
    }

    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      setPermissionState('needs-request');
    } else {
      registerListener();
      setPermissionState('granted');
    }

    return () => {
      if (handlerRef.current) {
        window.removeEventListener('deviceorientation', handlerRef.current);
      }
    };
  }, []);

  const requestPermission = async () => {
    try {
      const result = await (DeviceOrientationEvent as any).requestPermission();
      if (result === 'granted') {
        registerListener();
        setPermissionState('granted');
      } else {
        setPermissionState('denied');
      }
    } catch {
      setPermissionState('denied');
    }
  };

  return { heading, permissionState, requestPermission };
}
