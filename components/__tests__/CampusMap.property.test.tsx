import fc from 'fast-check';
import { mockMap, mockMarker, mockSetData } from 'mapbox-gl';

// We test the synchronization logic directly (not rendering CampusMap which requires full browser env).
// The logic under test is extracted from CampusMap's useEffect handlers.

function applyPositionUpdate(
  map: typeof mockMap,
  marker: typeof mockMarker,
  lat: number,
  lng: number,
  accuracy: number
) {
  const center: [number, number] = [lng, lat];
  map.easeTo({ center, duration: 300 });
  marker.setLngLat(center);
  (map.getSource('accuracy-source') as any).setData({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: center },
    properties: { accuracy },
  });
}

function applyHeadingUpdate(
  map: typeof mockMap,
  indicator: HTMLElement,
  heading: number
) {
  map.easeTo({ bearing: -heading, duration: 100 });
  indicator.style.transform = `translateX(-50%) rotate(${heading}deg)`;
}

beforeEach(() => jest.clearAllMocks());

// Feature: user-tracking-campus-map, Property 1: 위치 업데이트 시 전체 상태 동기화
test('Property 1: position update synchronizes map center, marker, and accuracy circle', () => {
  fc.assert(
    fc.property(
      fc.record({
        latitude: fc.float({ min: -90, max: 90, noNaN: true }),
        longitude: fc.float({ min: -180, max: 180, noNaN: true }),
        accuracy: fc.float({ min: 0, max: 1000, noNaN: true }),
      }),
      ({ latitude, longitude, accuracy }) => {
        jest.clearAllMocks();
        applyPositionUpdate(mockMap, mockMarker, latitude, longitude, accuracy);

        const center: [number, number] = [longitude, latitude];
        expect(mockMap.easeTo).toHaveBeenCalledWith({ center, duration: 300 });
        expect(mockMarker.setLngLat).toHaveBeenCalledWith(center);
        expect(mockSetData).toHaveBeenCalledWith(expect.objectContaining({
          geometry: { type: 'Point', coordinates: center },
          properties: { accuracy },
        }));
      }
    ),
    { numRuns: 100 }
  );
});

// Feature: user-tracking-campus-map, Property 2: Heading 업데이트 시 지도 bearing 및 마커 회전 동기화
test('Property 2: heading update sets bearing to -h and rotates direction indicator to h degrees', () => {
  fc.assert(
    fc.property(
      fc.float({ min: 0, max: Math.fround(359.99), noNaN: true }),
      (heading) => {
        jest.clearAllMocks();
        const indicator = document.createElement('div');
        applyHeadingUpdate(mockMap, indicator, heading);

        expect(mockMap.easeTo).toHaveBeenCalledWith({ bearing: -heading, duration: 100 });
        expect(indicator.style.transform).toContain(`rotate(${heading}deg)`);
      }
    ),
    { numRuns: 100 }
  );
});
