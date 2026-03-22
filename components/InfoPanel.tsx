'use client';

interface InfoPanelProps {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
}

export default function InfoPanel({ latitude, longitude, accuracy }: InfoPanelProps) {
  return (
    <div style={{
      position: 'absolute', top: 16, left: 16, zIndex: 10,
      background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.14)',
      color: '#f8fafc', padding: '10px 14px', borderRadius: 8, fontSize: 13,
      fontFamily: 'monospace', lineHeight: 1.8,
    }}>
      <div>위도: {latitude != null ? latitude.toFixed(6) : '—'}</div>
      <div>경도: {longitude != null ? longitude.toFixed(6) : '—'}</div>
      <div>정확도: {accuracy != null ? `${Math.round(accuracy)}m` : '—'}</div>
    </div>
  );
}
