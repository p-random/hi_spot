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

  if (!event_id || lat == null || lng == null) {
    return Response.json({ error: 'event_id, lat, lng are required' }, { status: 400, headers: CORS });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('lat, lng, join_radius_m')
    .eq('id', event_id)
    .single();

  if (eventError || !event) {
    return Response.json({ error: 'Event not found' }, { status: 404, headers: CORS });
  }

  const { data: distanceResult, error: distError } = await supabase.rpc('haversine_distance_m', {
    lat1: lat,
    lng1: lng,
    lat2: event.lat,
    lng2: event.lng,
  });

  if (distError || distanceResult == null) {
    return Response.json({ error: 'Internal server error' }, { status: 500, headers: CORS });
  }

  const distance_m = distanceResult as number;

  return Response.json(
    { within_radius: distance_m <= event.join_radius_m, distance_m },
    { headers: CORS },
  );
});
