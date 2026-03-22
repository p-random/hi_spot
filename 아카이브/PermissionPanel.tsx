'use client';

interface PermissionPanelProps {
  needsCompassPermission: boolean;
  locationDenied: boolean;
  compassDenied: boolean;
  onRequestCompass: () => void;
  onRetryLocation: () => void;
}

export default function PermissionPanel({
  needsCompassPermission, locationDenied, compassDenied,
  onRequestCompass, onRetryLocation,
}: PermissionPanelProps) {
  if (!needsCompassPermission && !locationDenied && !compassDenied) return null;

  const panelStyle: React.CSSProperties = {
    position: 'absolute', top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)', zIndex: 20,
    background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.14)',
    color: '#f8fafc', padding: '20px 24px', borderRadius: 12,
    textAlign: 'center', maxWidth: 300,
  };

  const btnStyle: React.CSSProperties = {
    marginTop: 12, padding: '8px 20px', borderRadius: 6,
    border: 'none', background: '#7dd3fc', color: '#0f172a',
    fontWeight: 600, cursor: 'pointer', fontSize: 14,
  };

  return (
    <div style={panelStyle}>
      {locationDenied && (
        <>
          <p>위치 권한이 거부되었습니다.<br />브라우저 설정에서 권한을 허용해 주세요.</p>
          <button style={btnStyle} onClick={onRetryLocation}>다시 시도</button>
        </>
      )}
      {needsCompassPermission && !compassDenied && (
        <>
          <p>나침반 기능을 사용하려면 권한이 필요합니다.</p>
          <button style={btnStyle} onClick={onRequestCompass}>나침반 권한 허용</button>
        </>
      )}
      {compassDenied && (
        <p>나침반 권한이 거부되었습니다.<br />위치 추적만 동작합니다.</p>
      )}
    </div>
  );
}
