import { renderHook, act } from '@testing-library/react';
import { useDeviceOrientation } from '../useDeviceOrientation';

beforeEach(() => {
  jest.clearAllMocks();
});

test('iOS: sets permissionState to needs-request', () => {
  (window as any).DeviceOrientationEvent = { requestPermission: jest.fn() };
  const { result } = renderHook(() => useDeviceOrientation());
  expect(result.current.permissionState).toBe('needs-request');
});

test('non-iOS: registers listener immediately and sets granted', () => {
  (window as any).DeviceOrientationEvent = {};
  const addSpy = jest.spyOn(window, 'addEventListener');
  const { result } = renderHook(() => useDeviceOrientation());
  expect(addSpy).toHaveBeenCalledWith('deviceorientation', expect.any(Function));
  expect(result.current.permissionState).toBe('granted');
  addSpy.mockRestore();
});

test('iOS: requestPermission granted → registers listener and sets granted', async () => {
  (window as any).DeviceOrientationEvent = { requestPermission: jest.fn().mockResolvedValue('granted') };
  const addSpy = jest.spyOn(window, 'addEventListener');
  const { result } = renderHook(() => useDeviceOrientation());
  await act(async () => { await result.current.requestPermission(); });
  expect(result.current.permissionState).toBe('granted');
  expect(addSpy).toHaveBeenCalledWith('deviceorientation', expect.any(Function));
  addSpy.mockRestore();
});

test('iOS: requestPermission denied → sets denied', async () => {
  (window as any).DeviceOrientationEvent = { requestPermission: jest.fn().mockResolvedValue('denied') };
  const { result } = renderHook(() => useDeviceOrientation());
  await act(async () => { await result.current.requestPermission(); });
  expect(result.current.permissionState).toBe('denied');
});

test('removes listener on unmount', () => {
  (window as any).DeviceOrientationEvent = {};
  const removeSpy = jest.spyOn(window, 'removeEventListener');
  const { unmount } = renderHook(() => useDeviceOrientation());
  unmount();
  expect(removeSpy).toHaveBeenCalledWith('deviceorientation', expect.any(Function));
  removeSpy.mockRestore();
});

test('missing DeviceOrientationEvent: heading stays null, no error', () => {
  delete (window as any).DeviceOrientationEvent;
  const { result } = renderHook(() => useDeviceOrientation());
  expect(result.current.heading).toBeNull();
  expect(result.current.permissionState).toBe('unknown');
});
