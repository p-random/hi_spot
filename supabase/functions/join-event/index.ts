import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  const { user_id, event_id, lat, lng } = await req.json().catch(() => ({}));

  if (!user_id || !event_id || lat == null || lng == null) {
    return Response.json(
      { error: 'user_id, event_id, lat, lng are required' },
      { status: 400, headers: CORS },
    );
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data, error } = await supabase.rpc('join_event', {
    p_user_id: user_id,
    p_event_id: event_id,
    p_lat: lat,
    p_lng: lng,
  });

  if (error) {
    const msg = error.message ?? '';
    if (msg.includes('NOT_ACTIVE')) {
      return Response.json({ error: 'Event is not active' }, { status: 400, headers: CORS });
    }
    if (msg.includes('OUTSIDE_GEOFENCE')) {
      return Response.json({ error: 'Outside event radius' }, { status: 403, headers: CORS });
    }
    if (msg.includes('DUPLICATE')) {
      return Response.json({ error: 'Already joined this event' }, { status: 409, headers: CORS });
    }
    if (msg.includes('FULL')) {
      return Response.json({ error: 'Event is full' }, { status: 409, headers: CORS });
    }
    console.error('join_event rpc error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500, headers: CORS });
  }

  const row = Array.isArray(data) ? data[0] : data;
  return Response.json(
    {
      participation_id: row.participation_id,
      current_slots: row.current_slots,
      max_slots: row.max_slots,
    },
    { headers: CORS },
  );
});
