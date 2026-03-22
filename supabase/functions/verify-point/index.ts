import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  const { participation_id, action } = await req.json().catch(() => ({}));

  if (!participation_id || !action) {
    return Response.json({ error: 'participation_id and action are required' }, { status: 400, headers: CORS });
  }

  if (action !== 'APPROVE' && action !== 'REJECT') {
    return Response.json({ error: 'action must be APPROVE or REJECT' }, { status: 400, headers: CORS });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { error } = await supabase.rpc('verify_point', {
    p_participation_id: participation_id,
    p_action: action,
  });

  if (error) {
    const msg = error.message ?? '';
    if (msg.includes('NOT_FOUND')) {
      return Response.json({ error: 'Participation not found' }, { status: 404, headers: CORS });
    }
    if (msg.includes('NO_POINT_LOG')) {
      return Response.json({ error: 'No EARN point log found for this participation' }, { status: 400, headers: CORS });
    }
    if (msg.includes('ALREADY_PROCESSED')) {
      return Response.json({ error: 'Point log already finalized or rejected' }, { status: 409, headers: CORS });
    }
    console.error('verify_point rpc error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500, headers: CORS });
  }

  return Response.json({ success: true, action }, { headers: CORS });
});
