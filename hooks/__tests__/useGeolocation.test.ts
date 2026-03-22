import { renderHook, act } from '@testing-library/react';
import { useGeolocation } from '../useGeolocation';

const mockWatchPosition = jest.fn();
const mockClearWatch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(navigator, 'geolocation', {
    value: { watchPosition: mockWatchPosition, clearWatch: mockClearWatch },
    configurable: true,
  });
});

test('calls watchPosition with correct options', () => {
  mockWatchPosition.mockReturnValue(42);
  renderHook(() => useGeolocation());
  expect(mockWatchPosition).toHaveBeenCalledWith(
    expect.any(Function),
    expect.any(Function),
    { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
  );
});

test('sets isWatching true after mount', () => {
  mockWatchPosition.mockReturnValue(1);
  const { result } = renderHook(() => useGeolocation());
  expect(result.current.isWatching).toBe(true);
});

test('sets error state on permission denied', () => {
  const permissionError = { code: 1, message: 'denied', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError;
  mockWatchPosition.mockImplementation((_s: unknown, err: (e: GeolocationPositionError) => void) => { err(permissionError); return 1; });
  const { result } = renderHook(() => useGeolocation());
  expect(result.current.error?.code).toBe(1);
});

test('calls clearWatch on unmount', () => {
  mockWatchPosition.mockReturnValue(99);
  const { unmount } = renderHook(() => useGeolocation());
  unmount();
  expect(mockClearWatch).toHaveBeenCalledWith(99);
});

test('sets error when navigator.geolocation is missing', () => {
  Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true });
  const { result } = renderHook(() => useGeolocation());
  expect(result.current.error).not.toBeNull();
  expect(result.current.isWatching).toBe(false);
});
