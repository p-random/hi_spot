import mapboxgl from 'mapbox-gl';

/**
 * Creates the user-location marker element with a direction indicator
 * (blue dot + heading triangle from the archive).
 */
export function createUserMarkerElement(): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:relative;width:18px;height:18px;';

  const indicator = document.createElement('div');
  indicator.className = 'direction-indicator';
  indicator.style.cssText =
    'position:absolute;left:50%;bottom:100%;transform:translateX(-50%);' +
    'width:0;height:0;' +
    'border-left:6px solid transparent;border-right:6px solid transparent;' +
    'border-bottom:10px solid rgba(56,189,248,0.6);margin-bottom:2px;';

  const dot = document.createElement('div');
  dot.style.cssText =
    'width:18px;height:18px;border-radius:999px;' +
    'background:#38bdf8;border:2px solid #fff;' +
    'box-shadow:0 0 0 8px rgba(56,189,248,0.2);';

  wrapper.appendChild(indicator);
  wrapper.appendChild(dot);
  return wrapper;
}

/** Source/layer IDs for the accuracy circle */
export const ACCURACY_SOURCE = 'user-accuracy-source';
export const ACCURACY_LAYER = 'user-accuracy-layer';

/** Add the accuracy circle source + layer to the map (call once after map load) */
export function addAccuracyLayer(map: mapboxgl.Map) {
  if (map.getSource(ACCURACY_SOURCE)) return; // already added

  map.addSource(ACCURACY_SOURCE, {
    type: 'geojson',
    data: { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: { accuracy: 0 } },
  });
  map.addLayer({
    id: ACCURACY_LAYER,
    type: 'circle',
    source: ACCURACY_SOURCE,
    paint: {
      'circle-radius': [
        'interpolate', ['exponential', 2], ['zoom'],
        0, ['*', ['get', 'accuracy'], 0.008],
        17, ['*', ['get', 'accuracy'], 1.055],
      ],
      'circle-color': 'rgba(56,189,248,0.15)',
      'circle-stroke-width': 1,
      'circle-stroke-color': 'rgba(56,189,248,0.4)',
      'circle-pitch-alignment': 'map',
    },
  });
}

/** Update the accuracy circle position + radius */
export function updateAccuracyCircle(map: mapboxgl.Map, lng: number, lat: number, accuracy: number) {
  const src = map.getSource(ACCURACY_SOURCE) as mapboxgl.GeoJSONSource | undefined;
  if (!src) return;
  src.setData({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [lng, lat] },
    properties: { accuracy },
  });
}
