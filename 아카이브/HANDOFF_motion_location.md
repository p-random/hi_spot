# 핸드오프 문서: 휴대폰 움직임 연동 위치 추적 기능

## 개요

이 기능은 두 가지를 실시간으로 연동합니다.

1. **기기 방향(나침반)** → 지도 회전 + 방향 인디케이터 회전
2. **GPS 위치** → 지도 중심 이동 + 마커 위치 업데이트

---

## 관련 파일 구조

```
hi_spot/
├── hooks/
│   ├── useDeviceOrientation.ts   # 기기 방향(heading) 추적
│   └── useGeolocation.ts         # GPS 위치 추적
├── components/
│   ├── CampusMap.tsx             # 핵심 조합 컴포넌트 (두 훅을 연결)
│   ├── InfoPanel.tsx             # 위도/경도/정확도 표시 UI
│   └── PermissionPanel.tsx       # 권한 요청/거부 안내 UI
└── lib/
    └── mapbox.ts                 # 지도 초기화, 마커 생성 유틸
```

---

## 각 파일 역할

### `hooks/useDeviceOrientation.ts`

`DeviceOrientationEvent`를 구독해서 `heading` (alpha 값, 0~360°)을 반환합니다.

- iOS Safari는 `DeviceOrientationEvent.requestPermission()`이 필요 → `permissionState: 'needs-request'`로 분기
- Android/데스크탑은 자동으로 리스너 등록 → `permissionState: 'granted'`
- 반환값: `{ heading, permissionState, requestPermission }`

```ts
const { heading, permissionState, requestPermission } = useDeviceOrientation();
```

### `hooks/useGeolocation.ts`

`navigator.geolocation.watchPosition()`으로 실시간 GPS를 구독합니다.

- `enableHighAccuracy: true`로 고정밀 모드
- 반환값: `{ position, error, isWatching }`

```ts
const { position, error } = useGeolocation();
```

---

### `components/CampusMap.tsx`

두 훅을 받아서 Mapbox 지도에 반영하는 핵심 컴포넌트입니다.

**세 개의 useEffect로 분리되어 있습니다:**

| useEffect | 트리거 | 동작 |
|---|---|---|
| 지도 초기화 | 마운트 시 1회 | `initMap()`, accuracy 레이어 추가, 마커 생성 |
| 위치 업데이트 | `position` 변경 시 | `map.easeTo({ center })`, 마커 이동, accuracy 원 업데이트 |
| 방향 업데이트 | `heading` 변경 시 | `map.easeTo({ bearing: -heading })`, 인디케이터 CSS 회전 |

**방향 인디케이터 동작 방식:**

```ts
// 지도 자체를 heading 반대 방향으로 회전 (지도가 진행 방향을 위로 향하게)
map.easeTo({ bearing: -heading, duration: 100 });

// 마커 위의 삼각형 인디케이터는 heading 방향으로 회전
indicatorRef.current.style.transform = `translateX(-50%) rotate(${heading}deg)`;
```

---

### `lib/mapbox.ts`

지도 관련 순수 유틸 함수 3개:

- `initMap(container, token)` → Mapbox 지도 인스턴스 생성 (pitch 60°, zoom 17)
- `addTerrain(map)` → 3D 지형 추가
- `createUserMarkerElement()` → 파란 점 + 방향 삼각형으로 구성된 마커 DOM 생성

---

### `components/InfoPanel.tsx`

좌상단에 위도/경도/정확도를 표시하는 단순 표시 컴포넌트입니다.

### `components/PermissionPanel.tsx`

아래 세 가지 상태를 처리합니다:

- `needsCompassPermission` → 나침반 권한 요청 버튼 표시 (iOS)
- `locationDenied` → 위치 권한 거부 안내
- `compassDenied` → 나침반 권한 거부 안내

---

## 데이터 흐름 요약

```
DeviceOrientationEvent (브라우저 이벤트)
    └─▶ useDeviceOrientation → heading
            └─▶ CampusMap
                    ├─▶ map.easeTo({ bearing: -heading })   // 지도 회전
                    └─▶ indicatorRef rotate(heading)        // 인디케이터 회전

GPS (watchPosition)
    └─▶ useGeolocation → position
            └─▶ CampusMap
                    ├─▶ map.easeTo({ center })              // 지도 이동
                    ├─▶ marker.setLngLat(center)            // 마커 이동
                    └─▶ GeoJSONSource.setData(accuracy)     // 정확도 원 업데이트
```

---

## 환경 설정

`.env.local`에 Mapbox 토큰이 필요합니다:

```
NEXT_PUBLIC_MAPBOX_TOKEN=pk.ey...
```

---

## 테스트 파일 위치

```
hooks/__tests__/useDeviceOrientation.test.ts
hooks/__tests__/useDeviceOrientation.property.test.ts
hooks/__tests__/useGeolocation.test.ts
components/__tests__/CampusMap.property.test.tsx
lib/__tests__/mapbox.test.ts
```

테스트 실행:
```bash
cd hi_spot
npx jest --run
```
