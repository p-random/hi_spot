import mapboxgl from 'mapbox-gl';

export function initMap(container: HTMLElement, token: string): mapboxgl.Map {
  mapboxgl.accessToken = token;
  return new mapboxgl.Map({
    container,
    style: 'mapbox://styles/mapbox/standard',
    zoom: 17,
    pitch: 60,
    bearing: 0,
  });
}

export function addTerrain(map: mapboxgl.Map): void {
  map.addSource('mapbox-dem', {
    type: 'raster-dem',
    url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
  });
  map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.3 });
}

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
