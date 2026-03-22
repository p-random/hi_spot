import { getSupabaseClient } from "../_shared/supabase-client.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";

Deno.serve(async (req) => {
  if (req.method !== "GET") {
    return errorResponse("Method not allowed", 405);
  }

  const supabase = getSupabaseClient();

  // Fetch all ACTIVE events
  const { data: activeEvents, error } = await supabase
    .from("events")
    .select("id, title, description, lat, lng, join_radius_m, max_slots, current_slots, reward_points, recruit_duration_min, activated_at")
    .eq("status", "ACTIVE");

  if (error) {
    return errorResponse("Failed to fetch events", 500);
  }

  const now = Date.now();
  const expired: string[] = [];
  const remaining: typeof activeEvents = [];

  for (const e of activeEvents ?? []) {
    const expiresAt = new Date(e.activated_at).getTime() + e.recruit_duration_min * 60_000;
    if (expiresAt <= now) {
      expired.push(e.id);
    } else {
      remaining.push(e);
    }
  }

  // Lazy Close: mark expired events as CLOSED
  if (expired.length > 0) {
    await supabase
      .from("events")
      .update({ status: "CLOSED" })
      .in("id", expired);
  }

  return jsonResponse({ events: remaining });
});
