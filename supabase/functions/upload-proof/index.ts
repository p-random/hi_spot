import { getSupabaseClient } from "../_shared/supabase-client.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  const formData = await req.formData();
  const participationId = formData.get("participation_id") as string;
  const file = formData.get("file") as File | null;

  if (!participationId || !file) {
    return errorResponse("participation_id and file are required", 400);
  }

  const supabase = getSupabaseClient();

  // 1. Look up participation to get event_id for storage path and validate status
  const { data: participation, error: pErr } = await supabase
    .from("participations")
    .select("id, event_id, status")
    .eq("id", participationId)
    .single();

  if (pErr || !participation) {
    return errorResponse("Participation not found", 404);
  }

  if (participation.status !== "WAITING_PROOF") {
    return errorResponse("사진을 업로드할 수 없는 상태입니다", 400);
  }

  // 2. Upload file to Storage
  const ext = file.name.split(".").pop() || "jpg";
  const storagePath = `${participation.event_id}/${participationId}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from("proof-images")
    .upload(storagePath, file, { contentType: file.type, upsert: true });

  if (uploadErr) {
    return errorResponse("File upload failed", 500);
  }

  const { data: urlData } = supabase.storage
    .from("proof-images")
    .getPublicUrl(storagePath);

  // 3. Atomic transaction via RPC
  const { data, error } = await supabase
    .rpc("upload_proof_tx", {
      p_participation_id: participationId,
      p_proof_img_url: urlData.publicUrl,
    })
    .single();

  if (error) {
    if (error.message.includes("NOT_FOUND")) {
      return errorResponse("Participation not found", 404);
    }
    if (error.message.includes("INVALID_STATUS")) {
      return errorResponse("사진을 업로드할 수 없는 상태입니다", 400);
    }
    return errorResponse(error.message, 500);
  }

  return jsonResponse({
    proof_img_url: urlData.publicUrl,
    points_earned: data.points_earned,
    total_points: data.total_points,
  });
});
