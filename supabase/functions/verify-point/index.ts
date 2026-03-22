import { getSupabaseClient } from "../_shared/supabase-client.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  const { participation_id, action } = await req.json();

  if (action !== "APPROVE" && action !== "REJECT") {
    return errorResponse("action must be APPROVE or REJECT", 400);
  }

  if (!participation_id) {
    return errorResponse("participation_id is required", 400);
  }

  const supabase = getSupabaseClient();

  // 1. Participation lookup
  const { data: participation, error: pErr } = await supabase
    .from("participations")
    .select("id, user_id")
    .eq("id", participation_id)
    .single();

  if (pErr || !participation) {
    return errorResponse("Participation not found", 404);
  }

  // 2. EARN Point_Log lookup
  const { data: pointLog, error: plErr } = await supabase
    .from("point_logs")
    .select("id, status, amount")
    .eq("ref_participation_id", participation_id)
    .eq("type", "EARN")
    .single();

  if (plErr || !pointLog) {
    return errorResponse("검증할 포인트 기록이 없습니다", 400);
  }

  // 3. Already processed check
  if (pointLog.status === "FINALIZED" || pointLog.status === "REJECTED") {
    return errorResponse("이미 처리된 검증입니다", 409);
  }

  // 4. Execute action
  if (action === "APPROVE") {
    const { error } = await supabase
      .from("point_logs")
      .update({ status: "FINALIZED" })
      .eq("id", pointLog.id);

    if (error) return errorResponse(error.message, 500);
  } else {
    const { error } = await supabase.rpc("reject_point_tx", {
      p_participation_id: participation_id,
      p_point_log_id: pointLog.id,
      p_user_id: participation.user_id,
      p_amount: pointLog.amount,
    });

    if (error) return errorResponse(error.message, 500);
  }

  return jsonResponse({ success: true, action });
});
