import mapboxgl, { mockMap } from 'mapbox-gl';
import { initMap, addTerrain, createUserMarkerElement } from '../mapbox';

beforeEach(() => jest.clearAllMocks());

test('initMap sets token and creates Map with correct options', () => {
  const container = document.createElement('div');
  initMap(container, 'test-token');
  expect((mapboxgl as any).accessToken).toBe('test-token');
  expect(mapboxgl.Map).toHaveBeenCalledWith(expect.objectContaining({
    container,
    style: 'mapbox://styles/mapbox/standard',
    zoom: 17,
    pitch: 60,
    bearing: 0,
  }));
});

test('addTerrain adds dem source and sets terrain with exaggeration 1.3', () => {
  addTerrain(mockMap as any);
  expect(mockMap.addSource).toHaveBeenCalledWith('mapbox-dem', expect.objectContaining({
    type: 'raster-dem',
    url: expect.stringContaining('mapbox-terrain-dem-v1'),
  }));
  expect(mockMap.setTerrain).toHaveBeenCalledWith(expect.objectContaining({
    source: 'mapbox-dem',
    exaggeration: 1.3,
  }));
});

test('createUserMarkerElement returns element with direction-indicator and dot', () => {
  const el = createUserMarkerElement();
  expect(el).toBeInstanceOf(HTMLElement);
  expect(el.querySelector('.direction-indicator')).not.toBeNull();
  // has a child dot element (the blue circle)
  expect(el.children.length).toBeGreaterThanOrEqual(2);
});
