import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  const body = await req.json().catch(() => ({}));
  const { title, description, lat, lng, notify_radius_km, join_radius_m, max_slots, reward_points, recruit_duration_min } = body;

  if (!title || lat == null || lng == null || notify_radius_km == null || join_radius_m == null || max_slots == null || reward_points == null) {
    return Response.json({ error: 'title, lat, lng, notify_radius_km, join_radius_m, max_slots, reward_points are required' }, { status: 400, headers: CORS });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Insert event
  const { data: event, error: insertError } = await supabase
    .from('events')
    .insert({
      title,
      description: description ?? null,
      lat,
      lng,
      notify_radius_km,
      join_radius_m,
      max_slots,
      reward_points,
      recruit_duration_min: recruit_duration_min ?? 5,
      status: 'ACTIVE',
      activated_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (insertError || !event) {
    return Response.json({ error: 'Failed to create event' }, { status: 500, headers: CORS });
  }

  // Query nearby users with Haversine (within notify_radius_km, active in last 5 minutes)
  const { data: nearbyUsers, error: usersError } = await supabase.rpc('get_nearby_users', {
    p_lat: lat,
    p_lng: lng,
    p_radius_km: notify_radius_km,
  });

  if (usersError) {
    console.error('Failed to query nearby users:', usersError);
    return Response.json({ event_id: event.id, notified_count: 0 }, { status: 201, headers: CORS });
  }

  const users: Array<{ id: string; fcm_token: string }> = nearbyUsers ?? [];

  if (users.length === 0) {
    return Response.json({ event_id: event.id, notified_count: 0 }, { status: 201, headers: CORS });
  }

  // Send FCM notifications
  const fcmServerKey = Deno.env.get('FCM_SERVER_KEY');
  let notifiedCount = 0;

  if (fcmServerKey) {
    const tokens = users.map((u) => u.fcm_token).filter(Boolean);

    for (const token of tokens) {
      try {
        const res = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Authorization': `key=${fcmServerKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: token,
            notification: { title: '새 이벤트', body: title },
            data: { event_id: event.id },
          }),
        });
        if (res.ok) notifiedCount++;
        else console.error('FCM send failed for token:', token, await res.text());
      } catch (err) {
        console.error('FCM send error for token:', token, err);
      }
    }
  }

  return Response.json({ event_id: event.id, notified_count: notifiedCount }, { status: 201, headers: CORS });
});
