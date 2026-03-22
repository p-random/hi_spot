import { getSupabaseClient } from "../_shared/supabase-client.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";

Deno.serve(async (req) => {
  if (req.method !== "PATCH") {
    return errorResponse("Method not allowed", 405);
  }

  const { user_id, lat, lng } = await req.json();

  if (!user_id || lat == null || lng == null) {
    return errorResponse("user_id, lat, lng are required", 400);
  }

  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("users")
    .update({ last_lat: lat, last_lng: lng, updated_at: new Date().toISOString() })
    .eq("id", user_id)
    .select("updated_at")
    .single();

  if (error || !data) {
    return errorResponse("User not found", 404);
  }

  return jsonResponse({ success: true, updated_at: data.updated_at });
});
