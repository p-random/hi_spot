import { getSupabaseClient } from "../_shared/supabase-client.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";
import { haversineDistance } from "../_shared/haversine.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  const { user_id, event_id, lat, lng } = await req.json();

  if (!user_id || !event_id || lat == null || lng == null) {
    return errorResponse("user_id, event_id, lat, lng are required", 400);
  }

  const supabase = getSupabaseClient();

  // 1. Check event exists and is ACTIVE
  const { data: event, error: eventErr } = await supabase
    .from("events")
    .select("id, lat, lng, join_radius_m, status")
    .eq("id", event_id)
    .single();

  if (eventErr || !event) {
    return errorResponse("Event not found", 404);
  }

  if (event.status !== "ACTIVE") {
    return errorResponse("참여할 수 없는 이벤트입니다", 400);
  }

  // 2. Geofence check
  const distance = haversineDistance(lat, lng, event.lat, event.lng);
  if (distance > event.join_radius_m) {
    return errorResponse("이벤트 반경 밖에 있습니다", 403);
  }

  // 3. Duplicate participation check
  const { data: existing } = await supabase
    .from("participations")
    .select("id")
    .eq("user_id", user_id)
    .eq("event_id", event_id)
    .maybeSingle();

  if (existing) {
    return errorResponse("이미 참여한 이벤트입니다", 409);
  }

  // 4. Atomic transaction via RPC
  const { data, error } = await supabase.rpc("join_event_tx", {
    p_user_id: user_id,
    p_event_id: event_id,
  }).single();

  if (error) {
    if (error.message.includes("SLOTS_FULL")) {
      return errorResponse("참여 인원이 마감되었습니다", 409);
    }
    return errorResponse(error.message, 500);
  }

  return jsonResponse({
    participation_id: data.participation_id,
    current_slots: data.current_slots,
    max_slots: data.max_slots,
  });
});
