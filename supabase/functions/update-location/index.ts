import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  const { user_id, lat, lng } = await req.json().catch(() => ({}));

  if (!user_id || lat == null || lng == null) {
    return Response.json({ error: 'user_id, lat, lng are required' }, { status: 400, headers: CORS });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data, error } = await supabase
    .from('users')
    .update({ last_lat: lat, last_lng: lng, updated_at: new Date().toISOString() })
    .eq('id', user_id)
    .select('updated_at')
    .single();

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500;
    const message = status === 404 ? 'User not found' : 'Internal server error';
    return Response.json({ error: message }, { status, headers: CORS });
  }

  return Response.json({ success: true, updated_at: data.updated_at }, { headers: CORS });
});
