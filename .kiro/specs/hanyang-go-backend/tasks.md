# 구현 계획: Hi Spot 백엔드

## 개요

Supabase Edge Functions(TypeScript/Deno) 기반의 위치 기반 이벤트 참여 시스템 백엔드를 구현한다. DB 스키마 → 공통 유틸리티 → 개별 API → 통합 순서로 점진적으로 구축한다.

## Tasks

- [x] 1. DB 스키마 및 프로젝트 구조 설정
  - [x] 1.0 프로젝트 환경 설정
    - `.env` 파일 생성 (SUPABASE_PROJECT_ID, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)
    - `.gitignore` 파일 생성 (.env 포함하여 민감 정보 Git 추적 제외)
  - [x] 1.1 Supabase 프로젝트 구조 생성 및 DDL 마이그레이션 파일 작성
    - `supabase/migrations/` 디렉토리에 DDL 마이그레이션 SQL 파일 생성
    - enum 타입 4개 생성: `event_status`, `participation_status`, `point_log_type`, `point_log_status`
    - Users, Events, Participations, Point_Logs 테이블 생성 (설계 문서 DDL 기준)
    - 인덱스 3개 생성: `idx_events_status`, `idx_participations_user_event`, `idx_point_logs_participation`
    - Supabase Storage 버킷 `proof-images` 생성 SQL 포함
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 1.2 공통 유틸리티 모듈 작성
    - `supabase/functions/_shared/` 디렉토리에 공통 모듈 생성
    - Supabase 클라이언트 생성 헬퍼 (`supabase-client.ts`)
    - JSON 응답 헬퍼 및 에러 응답 헬퍼 (`response.ts`)
    - Haversine 거리 계산 순수 함수 (`haversine.ts`) — 미터 단위 반환
    - _Requirements: 5.1 (Haversine 공식)_

  - [ ]* 1.3 Haversine 순수 함수 속성 테스트 작성
    - **Property 6: 지오펜싱 판정 일관성 (Haversine 순수 함수 부분)**
    - fast-check으로 동일 좌표 거리=0, 대칭성, 비음수 속성 검증
    - **Validates: Requirements 5.1**

- [x] 1.4 유저 생성 API 추가
    - `supabase/functions/create-user/index.ts` 생성
    - POST 메서드, nickname 필수 (400), fcm_token 선택
    - 201 응답: { id, nickname, total_points }

- [x] 2. 유저 위치 업데이트 API 구현
  - [x] 2.1 `update-location` Edge Function 구현
    - `supabase/functions/update-location/index.ts` 생성
    - PATCH 메서드 처리, `user_id`, `lat`, `lng` 필수값 검증 (누락 시 400)
    - Users 테이블에서 user_id 존재 확인 (없으면 404)
    - `last_lat`, `last_lng`, `updated_at` 업데이트
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ]* 2.2 위치 업데이트 속성 테스트 작성
    - **Property 1: 위치 업데이트 round-trip**
    - 임의 위도(-90~90), 경도(-180~180) 생성기 사용
    - 업데이트 후 조회 시 값 일치 검증
    - **Validates: Requirements 2.1**

- [x] 3. 이벤트 생성 + FCM 푸시 알림 API 구현
  - [x] 3.1 `create-event` Edge Function 구현
    - `supabase/functions/create-event/index.ts` 생성
    - POST 메서드 처리, 필수 필드 7개 검증 (누락 시 400)
    - Events INSERT: `status='ACTIVE'`, `activated_at=now()`, `recruit_duration_min` 기본값 5
    - Haversine SQL로 `notify_radius_km` 반경 + `updated_at` 5분 이내 User 조회
    - FCM 푸시 알림 일괄 발송 (실패 시 로그만 기록, 처리 계속)
    - 201 응답: `event_id`, `notified_count` 반환
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ]* 3.2 이벤트 생성 속성 테스트 작성
    - **Property 2: 이벤트 생성 시 ACTIVE 상태 보장**
    - **Property 3: recruit_duration_min 기본값 처리**
    - **Validates: Requirements 3.1, 3.2**

  - [ ]* 3.3 Haversine 알림 대상 필터링 속성 테스트 작성
    - **Property 4: Haversine 알림 대상 필터링**
    - 임의 좌표 쌍 + 반경으로 대상 선정 정확성 검증
    - **Validates: Requirements 3.3**

- [x] 4. Checkpoint — 기본 API 검증
  - All core APIs implemented and reviewed.

- [x] 5. ACTIVE 이벤트 목록 조회 API 구현
  - [x] 5.1 `list-active-events` Edge Function 구현
    - `supabase/functions/list-active-events/index.ts` 생성
    - GET 메서드 처리
    - Lazy Close: `activated_at + recruit_duration_min`이 현재 시각 이전인 ACTIVE 이벤트를 CLOSED로 UPDATE
    - ACTIVE 이벤트 전체 조회 후 반환 (없으면 빈 배열)
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 5.2 Lazy Close 속성 테스트 작성
    - **Property 5: Lazy Close 만료 이벤트 자동 마감**
    - 다양한 `activated_at` 값의 이벤트 집합으로 만료 처리 정확성 검증
    - **Validates: Requirements 4.1, 4.2, 4.3**

- [x] 6. 지오펜싱 검증 API 구현
  - [x] 6.1 `check-geofence` Edge Function 구현
    - `supabase/functions/check-geofence/index.ts` 생성
    - POST 메서드 처리, `user_id`, `event_id`, `lat`, `lng` 검증
    - Events 테이블에서 event_id 조회 (없으면 404)
    - Haversine SQL로 거리(m) 계산
    - `{ within_radius, distance_m }` 반환
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 6.2 지오펜싱 판정 속성 테스트 작성
    - **Property 6: 지오펜싱 판정 일관성**
    - 임의 좌표 쌍 + `join_radius_m`으로 판정 일관성 검증
    - **Validates: Requirements 5.1, 5.2, 5.3**

- [x] 7. 선착순 이벤트 참여 API 구현
  - [x] 7.1 `join-event` Edge Function 구현
    - `supabase/functions/join-event/index.ts` 생성
    - POST 메서드 처리
    - 이벤트 상태 확인 (ACTIVE 아니면 400)
    - Haversine 지오펜싱 검증 (범위 밖이면 403)
    - `(user_id, event_id)` 중복 체크 (이미 존재하면 409)
    - `BEGIN` → `SELECT FOR UPDATE` → `current_slots` 증가 → 마감 시 `CLOSED` → `INSERT participation` → `COMMIT`
    - Supabase Realtime이 events 테이블 변경을 자동 브로드캐스트
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9_

  - [ ]* 7.2 선착순 참여 속성 테스트 작성
    - **Property 7: 선착순 참여 동시성 보장**
    - **Property 8: 마지막 슬롯 자동 마감**
    - **Property 9: 참여 성공 시 올바른 레코드 생성**
    - **Validates: Requirements 6.3, 6.5, 6.1, 6.6**

- [x] 8. Checkpoint — 핵심 참여 로직 검증
  - All participation logic implemented and reviewed.

- [x] 9. 사진 업로드 + 포인트 선지급 API 구현
  - [x] 9.1 `upload-proof` Edge Function 구현
    - `supabase/functions/upload-proof/index.ts` 생성
    - POST 메서드 처리 (multipart/form-data)
    - Participations에서 participation_id 조회 (없으면 404, WAITING_PROOF 아니면 400)
    - Supabase Storage `proof-images` 버킷에 파일 업로드 (`{event_id}/{participation_id}.{ext}`)
    - 트랜잭션: Participation COMPLETED 변경 + Point_Log EARN/PENDING INSERT + Users total_points 합산
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ]* 9.2 사진 업로드 트랜잭션 속성 테스트 작성
    - **Property 10: 사진 업로드 트랜잭션 일관성**
    - **Property 11: 포인트 선지급 합산 정확성**
    - **Validates: Requirements 7.2, 7.3, 7.4**

- [x] 10. 관리자 포인트 검증 API 구현
  - [x] 10.1 `verify-point` Edge Function 구현
    - `supabase/functions/verify-point/index.ts` 생성
    - POST 메서드 처리, `participation_id`, `action` 검증 (APPROVE/REJECT 아니면 400)
    - Participation 조회 (없으면 404), EARN Point_Log 조회 (없으면 400)
    - Point_Log status가 FINALIZED/REJECTED이면 409
    - APPROVE: Point_Log status → FINALIZED
    - REJECT 트랜잭션: Point_Log REJECTED + REVOKE INSERT + total_points 차감 + Participation REJECTED
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [ ]* 10.2 포인트 검증 속성 테스트 작성
    - **Property 12: APPROVE 시 Point_Log FINALIZED**
    - **Property 13: REJECT 트랜잭션 원자성**
    - **Validates: Requirements 8.1, 8.2, 8.3**

- [ ] 11. 통합 및 최종 검증
  - [ ] 11.1 Supabase Realtime 설정 확인 및 연동
    - Events 테이블의 `current_slots`, `status` 변경이 Realtime으로 브로드캐스트되는지 확인
    - 필요 시 Supabase 대시보드 설정 또는 SQL로 Realtime publication 활성화
    - _Requirements: 6.9_

  - [ ]* 11.2 전체 흐름 통합 테스트 작성
    - 이벤트 생성 → 참여 → 사진 업로드 → 검증 전체 흐름 테스트
    - _Requirements: 3.1, 6.1, 7.1, 8.1_

- [ ] 12. Final Checkpoint — 전체 테스트 통과 확인
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- `*` 표시된 태스크는 선택 사항이며 빠른 MVP를 위해 건너뛸 수 있음
- 각 태스크는 특정 요구사항을 참조하여 추적 가능
- 체크포인트에서 점진적 검증 수행
- 속성 테스트는 보편적 정확성 속성을 검증하고, 단위 테스트는 특정 예시와 에지 케이스를 검증
- 인증 없이 동작하는 해커톤 MVP 기준
