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

  const { data: event, error } = await supabase
    .from("events")
    .select("lat, lng, join_radius_m")
    .eq("id", event_id)
    .single();

  if (error || !event) {
    return errorResponse("Event not found", 404);
  }

  const distance_m = haversineDistance(lat, lng, event.lat, event.lng);
  const within_radius = distance_m <= event.join_radius_m;

  return jsonResponse({ within_radius, distance_m });
});
