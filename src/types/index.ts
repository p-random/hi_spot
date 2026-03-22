// Enums
export type EventStatus = 'SCHEDULED' | 'ACTIVE' | 'CLOSED';
export type ParticipationStatus = 'WAITING_PROOF' | 'COMPLETED' | 'REJECTED';
export type PointLogType = 'EARN' | 'REVOKE';
export type PointLogStatus = 'PENDING' | 'FINALIZED' | 'REJECTED';

// Domain models
export interface User {
  id: string;
  nickname: string;
  total_points: number;
  last_lat: number | null;
  last_lng: number | null;
  fcm_token: string | null;
  updated_at: string;
}

export interface Event {
  id: string;
  title: string;
  description: string | null;
  lat: number;
  lng: number;
  notify_radius_km: number;
  join_radius_m: number;
  max_slots: number;
  current_slots: number;
  reward_points: number;
  status: EventStatus;
  scheduled_at: string | null;
  recruit_duration_min: number;
  activated_at: string;
}

export interface Participation {
  id: string;
  user_id: string;
  event_id: string;
  status: ParticipationStatus;
  proof_img_url: string | null;
  created_at: string;
}

export interface PointLog {
  id: string;
  user_id: string;
  amount: number;
  type: PointLogType;
  status: PointLogStatus;
  ref_participation_id: string;
  created_at: string;
}

export interface GeofenceResult {
  within_radius: boolean;
  distance_m: number;
}

// Edge Function request/response interfaces

// update-location
export interface UpdateLocationRequest {
  user_id: string;
  lat: number;
  lng: number;
}
export interface UpdateLocationResponse {
  success: true;
  updated_at: string;
}

// create-event
export interface CreateEventRequest {
  title: string;
  description?: string;
  lat: number;
  lng: number;
  notify_radius_km: number;
  join_radius_m: number;
  max_slots: number;
  reward_points: number;
  recruit_duration_min?: number;
}
export interface CreateEventResponse {
  event_id: string;
  notified_count: number;
}

// list-active-events
export interface ListActiveEventsResponse {
  events: Pick<Event, 'id' | 'title' | 'description' | 'lat' | 'lng' | 'join_radius_m' | 'max_slots' | 'current_slots' | 'reward_points' | 'recruit_duration_min' | 'activated_at' | 'status'>[];
}

// check-geofence
export interface CheckGeofenceRequest {
  user_id: string;
  event_id: string;
  lat: number;
  lng: number;
}
export type CheckGeofenceResponse = GeofenceResult;

// join-event
export interface JoinEventRequest {
  user_id: string;
  event_id: string;
  lat: number;
  lng: number;
}
export interface JoinEventResponse {
  participation_id: string;
  current_slots: number;
  max_slots: number;
}

// upload-proof
export interface UploadProofResponse {
  proof_img_url: string;
  points_earned: number;
  total_points: number;
}

// verify-point
export interface VerifyPointRequest {
  participation_id: string;
  action: 'APPROVE' | 'REJECT';
}
export interface VerifyPointResponse {
  success: true;
  action: 'APPROVE' | 'REJECT';
}
