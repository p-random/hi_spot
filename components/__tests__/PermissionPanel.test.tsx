import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PermissionPanel from '../PermissionPanel';

const noop = () => {};

test('renders nothing when no flags set', () => {
  const { container } = render(
    <PermissionPanel needsCompassPermission={false} locationDenied={false} compassDenied={false} onRequestCompass={noop} onRetryLocation={noop} />
  );
  expect(container.firstChild).toBeNull();
});

test('shows retry button when locationDenied', () => {
  render(
    <PermissionPanel needsCompassPermission={false} locationDenied={true} compassDenied={false} onRequestCompass={noop} onRetryLocation={noop} />
  );
  expect(screen.getByRole('button', { name: /다시 시도/i })).toBeInTheDocument();
});

test('calls onRetryLocation when retry button clicked', () => {
  const onRetry = jest.fn();
  render(
    <PermissionPanel needsCompassPermission={false} locationDenied={true} compassDenied={false} onRequestCompass={noop} onRetryLocation={onRetry} />
  );
  fireEvent.click(screen.getByRole('button', { name: /다시 시도/i }));
  expect(onRetry).toHaveBeenCalled();
});

test('shows compass permission button when needsCompassPermission', () => {
  render(
    <PermissionPanel needsCompassPermission={true} locationDenied={false} compassDenied={false} onRequestCompass={noop} onRetryLocation={noop} />
  );
  expect(screen.getByRole('button', { name: /나침반 권한/i })).toBeInTheDocument();
});

test('calls onRequestCompass when compass button clicked', () => {
  const onRequest = jest.fn();
  render(
    <PermissionPanel needsCompassPermission={true} locationDenied={false} compassDenied={false} onRequestCompass={onRequest} onRetryLocation={noop} />
  );
  fireEvent.click(screen.getByRole('button', { name: /나침반 권한/i }));
  expect(onRequest).toHaveBeenCalled();
});

test('shows denied message when compassDenied', () => {
  render(
    <PermissionPanel needsCompassPermission={false} locationDenied={false} compassDenied={true} onRequestCompass={noop} onRetryLocation={noop} />
  );
  expect(screen.getByText(/나침반 권한이 거부/i)).toBeInTheDocument();
});
