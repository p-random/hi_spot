import React from 'react';
import { render } from '@testing-library/react';
import fc from 'fast-check';
import InfoPanel from '../InfoPanel';

// Feature: user-tracking-campus-map, Property 4: 좌표 소수점 6자리 포맷팅
test('Property 4: latitude and longitude are displayed with exactly 6 decimal places', () => {
  fc.assert(
    fc.property(
      fc.float({ min: -90, max: 90, noNaN: true }),
      fc.float({ min: -180, max: 180, noNaN: true }),
      (lat, lng) => {
        const { container } = render(
          <InfoPanel latitude={lat} longitude={lng} accuracy={10} />
        );
        const text = container.textContent ?? '';
        const latStr = lat.toFixed(6);
        const lngStr = lng.toFixed(6);
        expect(text).toContain(latStr);
        expect(text).toContain(lngStr);
        // verify exactly 6 decimal places
        expect(latStr.split('.')[1]).toHaveLength(6);
        expect(lngStr.split('.')[1]).toHaveLength(6);
      }
    ),
    { numRuns: 100 }
  );
});
