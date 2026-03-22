import type {
  UpdateLocationRequest,
  UpdateLocationResponse,
  CreateEventRequest,
  CreateEventResponse,
  ListActiveEventsResponse,
  CheckGeofenceRequest,
  CheckGeofenceResponse,
  JoinEventRequest,
  JoinEventResponse,
  UploadProofResponse,
  VerifyPointRequest,
  VerifyPointResponse,
} from '@/types';

const BASE_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`;

async function call<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as { error: string }).error ?? res.statusText);
  return data as T;
}

export function updateLocation(body: UpdateLocationRequest): Promise<UpdateLocationResponse> {
  return call('/update-location', { method: 'PATCH', body: JSON.stringify(body) });
}

export function createEvent(body: CreateEventRequest): Promise<CreateEventResponse> {
  return call('/create-event', { method: 'POST', body: JSON.stringify(body) });
}

export function listActiveEvents(): Promise<ListActiveEventsResponse> {
  return call('/list-active-events', { method: 'GET', headers: { 'Content-Type': '' } });
}

export function checkGeofence(body: CheckGeofenceRequest): Promise<CheckGeofenceResponse> {
  return call('/check-geofence', { method: 'POST', body: JSON.stringify(body) });
}

export function joinEvent(body: JoinEventRequest): Promise<JoinEventResponse> {
  return call('/join-event', { method: 'POST', body: JSON.stringify(body) });
}

export function uploadProof(participationId: string, file: File): Promise<UploadProofResponse> {
  const form = new FormData();
  form.append('participation_id', participationId);
  form.append('file', file);
  // FormData sets its own Content-Type with boundary; omit the default JSON header
  return call('/upload-proof', { method: 'POST', body: form, headers: { 'Content-Type': '' } });
}

export function verifyPoint(body: VerifyPointRequest): Promise<VerifyPointResponse> {
  return call('/verify-point', { method: 'POST', body: JSON.stringify(body) });
}
