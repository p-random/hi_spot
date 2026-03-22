import { getSupabaseClient } from "../_shared/supabase-client.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  const body = await req.json();
  const { title, lat, lng, notify_radius_km, join_radius_m, max_slots, reward_points } = body;

  if (!title || lat == null || lng == null || notify_radius_km == null || join_radius_m == null || max_slots == null || reward_points == null) {
    return errorResponse("title, lat, lng, notify_radius_km, join_radius_m, max_slots, reward_points are required", 400);
  }

  const recruit_duration_min = body.recruit_duration_min ?? 5;
  const supabase = getSupabaseClient();

  // Insert event
  const { data: event, error: insertErr } = await supabase
    .from("events")
    .insert({
      title,
      description: body.description ?? null,
      lat,
      lng,
      notify_radius_km,
      join_radius_m,
      max_slots,
      reward_points,
      recruit_duration_min,
      status: "ACTIVE",
      activated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertErr || !event) {
    return errorResponse("Failed to create event", 500);
  }

  // Find nearby users via Haversine SQL
  const { data: nearbyUsers, error: queryErr } = await supabase.rpc("find_nearby_users", {
    event_lat: lat,
    event_lng: lng,
    radius_km: notify_radius_km,
  });

  if (queryErr) {
    console.error("Nearby users query failed:", queryErr);
  }

  const tokens: { id: string; fcm_token: string }[] = nearbyUsers ?? [];
  let notified_count = 0;

  // Send FCM push notifications
  const fcmKey = Deno.env.get("FIREBASE_SERVER_KEY");
  for (const user of tokens) {
    try {
      const res = await fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `key=${fcmKey}`,
        },
        body: JSON.stringify({
          to: user.fcm_token,
          notification: { title, body: body.description ?? "새로운 이벤트가 근처에 있습니다!" },
        }),
      });

      if (res.status === 404 || res.status === 410) {
        // Expired token — nullify
        await supabase.from("users").update({ fcm_token: null }).eq("id", user.id);
        console.error(`FCM token expired for user ${user.id}, cleared.`);
      } else {
        notified_count++;
      }
    } catch (err) {
      console.error(`FCM send failed for user ${user.id}:`, err);
    }
  }

  return jsonResponse({ event_id: event.id, notified_count }, 201);
});
