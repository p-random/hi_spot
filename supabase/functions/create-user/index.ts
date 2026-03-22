import { getSupabaseClient } from "../_shared/supabase-client.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  const { nickname, fcm_token } = await req.json();

  if (!nickname) {
    return errorResponse("nickname is required", 400);
  }

  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("users")
    .insert({ nickname, fcm_token: fcm_token ?? null })
    .select("id, nickname, total_points")
    .single();

  if (error) {
    return errorResponse(error.message, 500);
  }

  return jsonResponse(data, 201);
});
