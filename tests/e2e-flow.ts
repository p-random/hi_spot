/**
 * Hi Spot 백엔드 E2E 플로우 테스트
 *
 * 실행 방법:
 *   deno run --allow-net --allow-env tests/e2e-flow.ts
 *
 * 환경변수:
 *   SUPABASE_URL        — Supabase 프로젝트 URL
 *   SUPABASE_ANON_KEY   — Supabase anon/public key (Edge Function 호출용)
 *
 * 사전 조건:
 *   - DB 마이그레이션 완료 (00001~00005)
 *   - Edge Functions 배포 완료
 *   - 테스트용 유저가 없으면 자동 생성
 */

const BASE = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

if (!BASE || !ANON_KEY) {
  console.error("❌ SUPABASE_URL, SUPABASE_ANON_KEY 환경변수를 설정하세요.");
  Deno.exit(1);
}

const fn = (name: string) => `${BASE}/functions/v1/${name}`;

// ─── helpers ───

async function call(
  url: string,
  opts: { method?: string; body?: unknown; formData?: FormData } = {},
) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${ANON_KEY}`,
    apikey: ANON_KEY,
  };

  let reqBody: BodyInit | undefined;
  if (opts.formData) {
    reqBody = opts.formData;
  } else if (opts.body) {
    headers["Content-Type"] = "application/json";
    reqBody = JSON.stringify(opts.body);
  }

  const res = await fetch(url, {
    method: opts.method ?? "POST",
    headers,
    body: reqBody,
  });

  const json = await res.json();
  return { status: res.status, json };
}

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${msg}`);
    Deno.exit(1);
  }
  console.log(`  ✅ ${msg}`);
}

// Supabase REST API로 직접 테스트 유저 생성
async function createTestUser(nickname: string): Promise<string> {
  const res = await fetch(`${BASE}/rest/v1/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ANON_KEY}`,
      apikey: ANON_KEY,
      Prefer: "return=representation",
    },
    body: JSON.stringify({ nickname, total_points: 0 }),
  });
  const [user] = await res.json();
  return user.id;
}

// ─── 테스트 시작 ───

console.log("\n🚀 Hi Spot E2E 플로우 테스트 시작\n");

// ── Step 0: 테스트 유저 생성 ──
console.log("📌 Step 0: 테스트 유저 생성");
const userId = await createTestUser("테스트유저");
assert(!!userId, `유저 생성 완료 (id: ${userId})`);

// 한양대 좌표 (서울)
const USER_LAT = 37.5579;
const USER_LNG = 127.0472;

// ── Step 1: 위치 업데이트 ──
console.log("\n📌 Step 1: PATCH /update-location");
const loc = await call(fn("update-location"), {
  method: "PATCH",
  body: { user_id: userId, lat: USER_LAT, lng: USER_LNG },
});
assert(loc.status === 200, `status 200 (got ${loc.status})`);
assert(loc.json.success === true, "success: true");
assert(!!loc.json.updated_at, `updated_at: ${loc.json.updated_at}`);

// 400 테스트 — lat 누락
const locBad = await call(fn("update-location"), {
  method: "PATCH",
  body: { user_id: userId },
});
assert(locBad.status === 400, `lat 누락 시 400 (got ${locBad.status})`);

// 404 테스트 — 없는 유저
const locNotFound = await call(fn("update-location"), {
  method: "PATCH",
  body: { user_id: "00000000-0000-0000-0000-000000000000", lat: 0, lng: 0 },
});
assert(locNotFound.status === 404, `없는 유저 404 (got ${locNotFound.status})`);

// ── Step 2: 이벤트 생성 ──
console.log("\n📌 Step 2: POST /create-event");
const ev = await call(fn("create-event"), {
  body: {
    title: "E2E 테스트 이벤트",
    description: "자동 테스트용",
    lat: USER_LAT,
    lng: USER_LNG,
    notify_radius_km: 1,
    join_radius_m: 500,
    max_slots: 3,
    reward_points: 100,
    recruit_duration_min: 10,
  },
});
assert(ev.status === 201, `status 201 (got ${ev.status})`);
assert(!!ev.json.event_id, `event_id: ${ev.json.event_id}`);
assert(ev.json.notified_count >= 0, `notified_count: ${ev.json.notified_count}`);
const eventId = ev.json.event_id;

// 400 테스트 — 필수 필드 누락
const evBad = await call(fn("create-event"), {
  body: { title: "누락 테스트" },
});
assert(evBad.status === 400, `필수 필드 누락 시 400 (got ${evBad.status})`);

// ── Step 3: ACTIVE 이벤트 목록 조회 ──
console.log("\n📌 Step 3: GET /list-active-events");
const list = await call(fn("list-active-events"), { method: "GET" });
assert(list.status === 200, `status 200 (got ${list.status})`);
assert(Array.isArray(list.json.events), "events는 배열");
const found = list.json.events.find((e: { id: string }) => e.id === eventId);
assert(!!found, `방금 생성한 이벤트가 목록에 존재`);

// ── Step 4: 지오펜싱 검증 ──
console.log("\n📌 Step 4: POST /check-geofence");

// 반경 안 (동일 좌표)
const geoIn = await call(fn("check-geofence"), {
  body: { user_id: userId, event_id: eventId, lat: USER_LAT, lng: USER_LNG },
});
assert(geoIn.status === 200, `status 200 (got ${geoIn.status})`);
assert(geoIn.json.within_radius === true, `within_radius: true (distance: ${geoIn.json.distance_m}m)`);

// 반경 밖 (먼 좌표)
const geoOut = await call(fn("check-geofence"), {
  body: { user_id: userId, event_id: eventId, lat: 35.0, lng: 129.0 },
});
assert(geoOut.status === 200, `status 200 (got ${geoOut.status})`);
assert(geoOut.json.within_radius === false, `within_radius: false (distance: ${Math.round(geoOut.json.distance_m)}m)`);

// 404 테스트 — 없는 이벤트
const geoNotFound = await call(fn("check-geofence"), {
  body: { user_id: userId, event_id: "00000000-0000-0000-0000-000000000000", lat: 0, lng: 0 },
});
assert(geoNotFound.status === 404, `없는 이벤트 404 (got ${geoNotFound.status})`);

// ── Step 5: 이벤트 참여 ──
console.log("\n📌 Step 5: POST /join-event");
const join = await call(fn("join-event"), {
  body: { user_id: userId, event_id: eventId, lat: USER_LAT, lng: USER_LNG },
});
assert(join.status === 200, `status 200 (got ${join.status})`);
assert(!!join.json.participation_id, `participation_id: ${join.json.participation_id}`);
assert(join.json.current_slots === 1, `current_slots: ${join.json.current_slots}`);
assert(join.json.max_slots === 3, `max_slots: ${join.json.max_slots}`);
const participationId = join.json.participation_id;

// 409 테스트 — 중복 참여
const joinDup = await call(fn("join-event"), {
  body: { user_id: userId, event_id: eventId, lat: USER_LAT, lng: USER_LNG },
});
assert(joinDup.status === 409, `중복 참여 409 (got ${joinDup.status})`);
assert(joinDup.json.error === "이미 참여한 이벤트입니다", `메시지: ${joinDup.json.error}`);

// 403 테스트 — 반경 밖
const userId2 = await createTestUser("반경밖유저");
const joinFar = await call(fn("join-event"), {
  body: { user_id: userId2, event_id: eventId, lat: 35.0, lng: 129.0 },
});
assert(joinFar.status === 403, `반경 밖 403 (got ${joinFar.status})`);
assert(joinFar.json.error === "이벤트 반경 밖에 있습니다", `메시지: ${joinFar.json.error}`);

// ── Step 6: 사진 업로드 + 포인트 선지급 ──
console.log("\n📌 Step 6: POST /upload-proof");
const formData = new FormData();
formData.append("participation_id", participationId);
// 1x1 PNG 바이너리 (최소 유효 PNG)
const pngBytes = new Uint8Array([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82,
  0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0, 144, 119, 83,
  222, 0, 0, 0, 12, 73, 68, 65, 84, 8, 215, 99, 248, 207, 192, 0,
  0, 0, 2, 0, 1, 226, 33, 188, 51, 0, 0, 0, 0, 73, 69, 78,
  68, 174, 66, 96, 130,
]);
formData.append("file", new File([pngBytes], "proof.png", { type: "image/png" }));

const upload = await call(fn("upload-proof"), { formData });
assert(upload.status === 200, `status 200 (got ${upload.status})`);
assert(!!upload.json.proof_img_url, `proof_img_url: ${upload.json.proof_img_url}`);
assert(upload.json.points_earned === 100, `points_earned: ${upload.json.points_earned}`);
assert(upload.json.total_points === 100, `total_points: ${upload.json.total_points}`);

// 400 테스트 — 이미 COMPLETED 상태에서 재업로드
const formData2 = new FormData();
formData2.append("participation_id", participationId);
formData2.append("file", new File([pngBytes], "proof2.png", { type: "image/png" }));
const uploadBad = await call(fn("upload-proof"), { formData: formData2 });
assert(uploadBad.status === 400, `재업로드 400 (got ${uploadBad.status})`);

// ── Step 7: 관리자 포인트 검증 — APPROVE ──
console.log("\n📌 Step 7: POST /verify-point (APPROVE)");
const approve = await call(fn("verify-point"), {
  body: { participation_id: participationId, action: "APPROVE" },
});
assert(approve.status === 200, `status 200 (got ${approve.status})`);
assert(approve.json.success === true, "success: true");
assert(approve.json.action === "APPROVE", `action: ${approve.json.action}`);

// 409 테스트 — 이미 처리됨
const approveDup = await call(fn("verify-point"), {
  body: { participation_id: participationId, action: "APPROVE" },
});
assert(approveDup.status === 409, `이미 처리 409 (got ${approveDup.status})`);
assert(approveDup.json.error === "이미 처리된 검증입니다", `메시지: ${approveDup.json.error}`);

// ── Step 8: REJECT 플로우 (새 유저로 전체 재현) ──
console.log("\n📌 Step 8: REJECT 플로우 (새 유저)");
const userId3 = await createTestUser("리젝트유저");

// 위치 업데이트
await call(fn("update-location"), {
  method: "PATCH",
  body: { user_id: userId3, lat: USER_LAT, lng: USER_LNG },
});

// 참여
const join3 = await call(fn("join-event"), {
  body: { user_id: userId3, event_id: eventId, lat: USER_LAT, lng: USER_LNG },
});
assert(join3.status === 200, `참여 성공 (slots: ${join3.json.current_slots}/${join3.json.max_slots})`);
const pid3 = join3.json.participation_id;

// 사진 업로드
const fd3 = new FormData();
fd3.append("participation_id", pid3);
fd3.append("file", new File([pngBytes], "proof3.png", { type: "image/png" }));
const up3 = await call(fn("upload-proof"), { formData: fd3 });
assert(up3.status === 200, `업로드 성공 (total_points: ${up3.json.total_points})`);

// REJECT
const reject = await call(fn("verify-point"), {
  body: { participation_id: pid3, action: "REJECT" },
});
assert(reject.status === 200, `REJECT 성공 (got ${reject.status})`);
assert(reject.json.action === "REJECT", `action: ${reject.json.action}`);

// REJECT 후 포인트 차감 확인 (REST API로 직접 조회)
const userCheck = await fetch(`${BASE}/rest/v1/users?id=eq.${userId3}&select=total_points`, {
  headers: { Authorization: `Bearer ${ANON_KEY}`, apikey: ANON_KEY },
});
const [userData] = await userCheck.json();
assert(userData.total_points === 0, `REJECT 후 total_points: ${userData.total_points} (기대: 0)`);

// ── Step 9: 슬롯 마감 자동 CLOSED 테스트 ──
console.log("\n📌 Step 9: 슬롯 마감 → 자동 CLOSED");
const evSmall = await call(fn("create-event"), {
  body: {
    title: "1슬롯 이벤트",
    lat: USER_LAT,
    lng: USER_LNG,
    notify_radius_km: 1,
    join_radius_m: 500,
    max_slots: 1,
    reward_points: 50,
    recruit_duration_min: 10,
  },
});
const smallEventId = evSmall.json.event_id;

const userId4 = await createTestUser("마감유저");
const joinLast = await call(fn("join-event"), {
  body: { user_id: userId4, event_id: smallEventId, lat: USER_LAT, lng: USER_LNG },
});
assert(joinLast.status === 200, `마지막 슬롯 참여 성공`);
assert(joinLast.json.current_slots === 1, `current_slots == max_slots (${joinLast.json.current_slots})`);

// 마감 후 참여 시도
const userId5 = await createTestUser("마감후유저");
const joinClosed = await call(fn("join-event"), {
  body: { user_id: userId5, event_id: smallEventId, lat: USER_LAT, lng: USER_LNG },
});
assert(
  joinClosed.status === 400 || joinClosed.status === 409,
  `마감 후 참여 거부 (got ${joinClosed.status}: ${joinClosed.json.error})`,
);

// ── Step 10: 잘못된 action 400 테스트 ──
console.log("\n📌 Step 10: verify-point 잘못된 action");
const badAction = await call(fn("verify-point"), {
  body: { participation_id: participationId, action: "INVALID" },
});
assert(badAction.status === 400, `잘못된 action 400 (got ${badAction.status})`);

// ── 완료 ──
console.log("\n" + "=".repeat(50));
console.log("🎉 전체 E2E 플로우 테스트 통과!");
console.log("=".repeat(50) + "\n");
