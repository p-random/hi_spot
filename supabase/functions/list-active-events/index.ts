import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Lazy Close: expire ACTIVE events whose recruit window has passed
  await supabase.rpc('lazy_close_events');

  const { data, error } = await supabase
    .from('events')
    .select('id, title, description, lat, lng, join_radius_m, max_slots, current_slots, reward_points, recruit_duration_min, activated_at')
    .eq('status', 'ACTIVE');

  if (error) {
    return Response.json({ error: 'Internal server error' }, { status: 500, headers: CORS });
  }

  return Response.json({ events: data ?? [] }, { headers: CORS });
});
