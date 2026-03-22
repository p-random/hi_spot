'use client';

import dynamic from 'next/dynamic';

// Skip server-side rendering entirely for MapView.
// Mapbox GL JS requires the DOM (canvas, WebGL) and cannot render on the server.
// Importing it with ssr:false avoids React hydration mismatches and ensures
// the map container has valid dimensions when Mapbox initializes.
const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5',
      }}
    >
      <span style={{ color: '#888', fontSize: 14 }}>지도 로딩 중...</span>
    </div>
  ),
});

export default MapView;
