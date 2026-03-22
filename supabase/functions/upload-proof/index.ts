import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return Response.json({ error: 'multipart/form-data required' }, { status: 400, headers: CORS });
  }

  const participation_id = formData.get('participation_id') as string | null;
  const file = formData.get('file') as File | null;

  if (!participation_id || !file) {
    return Response.json({ error: 'participation_id and file are required' }, { status: 400, headers: CORS });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Fetch participation to get event_id (needed for storage path)
  const { data: part, error: partError } = await supabase
    .from('participations')
    .select('id, event_id, status')
    .eq('id', participation_id)
    .single();

  if (partError || !part) {
    return Response.json({ error: 'Participation not found' }, { status: 404, headers: CORS });
  }

  if (part.status !== 'WAITING_PROOF') {
    return Response.json({ error: 'Participation is not in WAITING_PROOF status' }, { status: 400, headers: CORS });
  }

  // Upload to Storage: {event_id}/{participation_id}.{ext}
  const ext = file.name.split('.').pop() ?? 'jpg';
  const storagePath = `${part.event_id}/${participation_id}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('proof-images')
    .upload(storagePath, file, { upsert: true });

  if (uploadError) {
    console.error('Storage upload error:', uploadError);
    return Response.json({ error: 'Failed to upload file' }, { status: 500, headers: CORS });
  }

  const { data: { publicUrl } } = supabase.storage
    .from('proof-images')
    .getPublicUrl(storagePath);

  // Atomic transaction via RPC
  const { data, error } = await supabase.rpc('upload_proof', {
    p_participation_id: participation_id,
    p_proof_img_url: publicUrl,
  });

  if (error) {
    const msg = error.message ?? '';
    if (msg.includes('NOT_FOUND')) {
      return Response.json({ error: 'Participation not found' }, { status: 404, headers: CORS });
    }
    if (msg.includes('WRONG_STATUS')) {
      return Response.json({ error: 'Participation is not in WAITING_PROOF status' }, { status: 400, headers: CORS });
    }
    console.error('upload_proof rpc error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500, headers: CORS });
  }

  const row = Array.isArray(data) ? data[0] : data;
  return Response.json(
    {
      proof_img_url: publicUrl,
      points_earned: row.points_earned,
      total_points: row.total_points,
    },
    { headers: CORS },
  );
});
