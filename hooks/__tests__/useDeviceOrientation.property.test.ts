import { renderHook, act } from '@testing-library/react';
import fc from 'fast-check';
import { useDeviceOrientation } from '../useDeviceOrientation';

// Feature: user-tracking-campus-map, Property 3: alpha 값의 CompassHeading 추출
test('Property 3: extracted heading equals alpha for any valid alpha value', () => {
  (window as any).DeviceOrientationEvent = {};

  fc.assert(
    fc.property(
      fc.float({ min: 0, max: Math.fround(359.99), noNaN: true }),
      (alpha) => {
        const { result } = renderHook(() => useDeviceOrientation());
        act(() => {
          window.dispatchEvent(new Event('deviceorientation'));
          // Dispatch with alpha value via custom event
          const event = new Event('deviceorientation') as DeviceOrientationEvent;
          Object.defineProperty(event, 'alpha', { value: alpha });
          window.dispatchEvent(event);
        });
        // heading should equal alpha
        expect(result.current.heading).toBeCloseTo(alpha, 5);
      }
    ),
    { numRuns: 100 }
  );
});
