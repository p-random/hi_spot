# 요구사항 문서

## 소개

Hi Spot은 Supabase 기반의 위치 기반 이벤트 참여 시스템이다. 사용자는 실시간 위치를 기반으로 주변 이벤트에 참여하고, 사진 인증을 통해 포인트를 획득한다. 본 스펙은 백엔드 API 7개와 데이터베이스 스키마 구현에 집중하며, 프론트엔드 UI는 별도 팀원이 담당한다. 여러 이벤트가 동시에 ACTIVE 상태로 존재할 수 있으며, 모집 시간 만료 시 lazy 방식으로 자동 마감된다. 해커톤 MVP 기준으로 인증 없이 동작하며, Supabase Edge Functions(TypeScript)로 구현한다.

## 용어 정의

- **System**: Supabase Edge Functions로 구현된 Hi Spot 백엔드 시스템
- **Recruit_Duration**: 이벤트 모집 시간(분 단위). activated_at 기준으로 recruit_duration_min이 경과하면 모집이 종료된다
- **Lazy_Close**: ACTIVE 이벤트 목록 조회 시점에 모집 시간이 만료된 이벤트를 자동으로 CLOSED 처리하는 방식 (pg_cron 없이 조회 시점에 체크)
- **User**: 위치 정보를 공유하고 이벤트에 참여하는 앱 사용자
- **Admin**: 이벤트를 생성하고 포인트를 검증하는 관리자 (MVP에서는 인증 없이 아무나 호출 가능)
- **Event**: 특정 위치에서 진행되는 참여형 이벤트
- **Participation**: User가 Event에 참여한 기록
- **Point_Log**: 포인트 적립(EARN) 또는 회수(REVOKE) 이력
- **Haversine_Formula**: 두 위경도 좌표 간 거리를 계산하는 수학 공식 (PostGIS 없이 순수 SQL로 구현)
- **Geofence**: 이벤트 위치 기준 join_radius_m 반경의 가상 경계
- **FCM**: Firebase Cloud Messaging, 푸시 알림 발송 서비스
- **Supabase_Storage**: Supabase에서 제공하는 파일 저장소 서비스
- **Supabase_Realtime**: Supabase에서 제공하는 실시간 데이터 변경 브로드캐스트 서비스 (Postgres Changes 방식)

## 요구사항

### 요구사항 1: 데이터베이스 스키마 구성

**사용자 스토리:** 개발자로서, 시스템의 모든 데이터를 저장할 수 있는 데이터베이스 스키마를 구성하고 싶다. 이를 통해 API가 안정적으로 데이터를 읽고 쓸 수 있다.

#### 인수 조건

1. THE System SHALL Users 테이블을 id(uuid, PK), nickname(text), total_points(int, 기본값 0), last_lat(float), last_lng(float), fcm_token(text), updated_at(timestamptz) 컬럼으로 생성한다
2. THE System SHALL Events 테이블을 id(uuid, PK), title(text), description(text), lat(float), lng(float), notify_radius_km(float), join_radius_m(int), max_slots(int), current_slots(int, 기본값 0), reward_points(int), status(enum: SCHEDULED/ACTIVE/CLOSED), scheduled_at(timestamptz), recruit_duration_min(int, 기본값 5), activated_at(timestamptz) 컬럼으로 생성한다
3. THE System SHALL Participations 테이블을 id(uuid, PK), user_id(uuid, FK→Users), event_id(uuid, FK→Events), status(enum: WAITING_PROOF/COMPLETED/REJECTED), proof_img_url(text), created_at(timestamptz) 컬럼과 (user_id, event_id) UNIQUE 제약조건으로 생성한다
4. THE System SHALL Point_Logs 테이블을 id(uuid, PK), user_id(uuid, FK→Users), amount(int), type(enum: EARN/REVOKE), status(enum: PENDING/FINALIZED/REJECTED), ref_participation_id(uuid, FK→Participations), created_at(timestamptz) 컬럼으로 생성한다

### 요구사항 2: 유저 위치 업데이트

**사용자 스토리:** 사용자로서, 내 현재 위치를 주기적으로 서버에 전송하고 싶다. 이를 통해 주변 이벤트 알림을 받을 수 있다.

#### 인수 조건

1. WHEN 유효한 user_id, lat, lng가 요청 본문으로 전달되면, THE System SHALL Users 테이블의 해당 사용자 last_lat, last_lng, updated_at를 업데이트한다
2. IF 존재하지 않는 user_id가 전달되면, THEN THE System SHALL 404 상태 코드와 오류 메시지를 반환한다
3. IF lat 또는 lng 값이 누락되면, THEN THE System SHALL 400 상태 코드와 오류 메시지를 반환한다

### 요구사항 3: 이벤트 생성 및 FCM 푸시 알림

**사용자 스토리:** 관리자로서, 이벤트를 생성하고 인근 사용자에게 푸시 알림을 보내고 싶다. 이를 통해 사용자가 이벤트를 인지하고 참여할 수 있다.

#### 인수 조건

1. WHEN 이벤트 생성 요청이 수신되면, THE System SHALL Events 테이블에 status를 ACTIVE로, activated_at을 현재 시각으로 설정하여 새 이벤트를 INSERT한다
2. WHEN 이벤트 생성 요청에 recruit_duration_min 값이 포함되면, THE System SHALL 해당 값을 Events 테이블의 recruit_duration_min에 저장한다. 값이 미포함이면 기본값 5를 사용한다
3. WHEN 이벤트가 생성되면, THE System SHALL Haversine_Formula를 사용하여 이벤트 좌표로부터 notify_radius_km 반경 이내이고 updated_at이 5분 이내인 User 목록을 조회하여 FCM 푸시 알림 대상을 선정한다
4. WHEN FCM 알림 대상 User 목록이 조회되면, THE System SHALL 해당 User의 fcm_token 목록으로 FCM 푸시 알림을 일괄 발송한다. FCM 알림 수신 여부는 이벤트 참여 자격과 무관하다
5. IF FCM 발송이 실패하면, THEN THE System SHALL 오류 로그를 기록하고 나머지 처리를 계속 진행한다
6. IF 필수 필드(title, lat, lng, notify_radius_km, join_radius_m, max_slots, reward_points)가 누락되면, THEN THE System SHALL 400 상태 코드와 오류 메시지를 반환한다

### 요구사항 4: ACTIVE 이벤트 목록 조회

**사용자 스토리:** 사용자로서, 현재 ACTIVE 상태인 이벤트 목록을 조회하고 싶다. 이를 통해 지도에 참여 가능한 이벤트를 표시할 수 있다.

#### 인수 조건

1. WHEN ACTIVE 이벤트 목록 조회 요청이 수신되면, THE System SHALL 먼저 ACTIVE 상태이면서 activated_at + recruit_duration_min이 현재 시각을 초과한 Event를 모두 CLOSED로 변경한다 (Lazy_Close)
2. WHEN Lazy_Close 처리가 완료되면, THE System SHALL status가 ACTIVE인 모든 Event를 id, title, description, lat, lng, join_radius_m, max_slots, current_slots, reward_points, recruit_duration_min, activated_at 정보와 함께 반환한다
3. THE System SHALL 여러 이벤트가 동시에 ACTIVE 상태로 존재하는 경우 모든 ACTIVE 이벤트를 반환한다
4. WHEN ACTIVE 이벤트가 존재하지 않으면, THE System SHALL 빈 배열을 반환한다

### 요구사항 5: 지오펜싱 검증

**사용자 스토리:** 사용자로서, 이벤트 참여 전에 내가 이벤트 반경 안에 있는지 확인하고 싶다. 이를 통해 참여 가능 여부를 미리 알 수 있다.

#### 인수 조건

1. WHEN user_id, event_id, lat, lng가 전달되면, THE System SHALL Haversine_Formula로 사용자 좌표와 이벤트 좌표 간 거리를 미터 단위로 계산한다
2. WHEN 계산된 거리가 Event의 join_radius_m 이하이면, THE System SHALL { "within_radius": true, "distance_m": 계산된 거리 }를 반환한다
3. WHEN 계산된 거리가 Event의 join_radius_m 초과이면, THE System SHALL { "within_radius": false, "distance_m": 계산된 거리 }를 반환한다
4. IF 존재하지 않는 event_id가 전달되면, THEN THE System SHALL 404 상태 코드와 오류 메시지를 반환한다

### 요구사항 6: 선착순 이벤트 참여 (동시성 제어)

**사용자 스토리:** 사용자로서, 이벤트에 선착순으로 참여하고 싶다. 이를 통해 공정하게 참여 기회를 얻을 수 있다.

#### 인수 조건

1. WHEN user_id, event_id, lat, lng가 전달되면, THE System SHALL 먼저 지오펜싱 검증을 수행하여 사용자가 Geofence 내에 있는지 확인한다. 참여 자격은 FCM 알림 수신 여부와 무관하며, join_radius_m 내에 있는 User라면 참여할 수 있다
2. IF 사용자가 Geofence 밖에 있으면, THEN THE System SHALL 403 상태 코드와 "이벤트 반경 밖에 있습니다" 메시지를 반환한다
3. WHEN 지오펜싱 검증을 통과하면, THE System SHALL PostgreSQL Transaction과 SELECT FOR UPDATE를 사용하여 Event의 current_slots를 원자적으로 증가시킨다
4. IF Event의 current_slots가 max_slots 이상이면, THEN THE System SHALL 409 상태 코드와 "참여 인원이 마감되었습니다" 메시지를 반환한다
5. WHEN current_slots 증가 후 current_slots가 max_slots와 같아지면, THE System SHALL Event의 status를 CLOSED로 변경한다
6. WHEN 참여가 성공하면, THE System SHALL Participations 테이블에 status를 WAITING_PROOF로 설정하여 새 레코드를 INSERT한다
7. IF 동일한 user_id와 event_id 조합으로 중복 참여 요청이 수신되면, THEN THE System SHALL 409 상태 코드와 "이미 참여한 이벤트입니다" 메시지를 반환한다
8. IF Event의 status가 ACTIVE가 아니면, THEN THE System SHALL 400 상태 코드와 "참여할 수 없는 이벤트입니다" 메시지를 반환한다
9. WHEN Event의 current_slots 또는 status가 변경되면, THE System SHALL Supabase_Realtime을 통해 변경 사항을 브로드캐스트한다

### 요구사항 7: 사진 업로드 및 포인트 선지급

**사용자 스토리:** 사용자로서, 이벤트 참여 인증 사진을 업로드하고 포인트를 받고 싶다. 이를 통해 참여 보상을 즉시 확인할 수 있다.

#### 인수 조건

1. WHEN participation_id와 사진 파일이 전달되면, THE System SHALL 사진 파일을 Supabase_Storage에 업로드한다
2. WHEN 사진 업로드가 완료되면, THE System SHALL Participations 테이블의 해당 레코드 status를 WAITING_PROOF에서 COMPLETED로 변경하고 proof_img_url을 저장한다
3. WHEN Participation status가 COMPLETED로 변경되면, THE System SHALL Point_Logs 테이블에 type=EARN, status=PENDING, amount=Event의 reward_points 값으로 새 레코드를 INSERT한다
4. WHEN Point_Log가 INSERT되면, THE System SHALL Users 테이블의 해당 사용자 total_points에 reward_points를 즉시 합산한다
5. IF 존재하지 않는 participation_id가 전달되면, THEN THE System SHALL 404 상태 코드와 오류 메시지를 반환한다
6. IF Participation의 status가 WAITING_PROOF가 아니면, THEN THE System SHALL 400 상태 코드와 "사진을 업로드할 수 없는 상태입니다" 메시지를 반환한다

### 요구사항 8: 관리자 포인트 검증 (APPROVE / REJECT)

**사용자 스토리:** 관리자로서, 사용자의 참여 인증을 승인하거나 거절하고 싶다. 이를 통해 부정 참여를 방지하고 포인트를 관리할 수 있다.

#### 인수 조건

1. WHEN participation_id와 action이 APPROVE로 전달되면, THE System SHALL 해당 Participation에 연결된 Point_Log의 status를 PENDING에서 FINALIZED로 변경한다
2. WHEN participation_id와 action이 REJECT로 전달되면, THE System SHALL 단일 트랜잭션 내에서 다음 3가지를 원자적으로 처리한다: (a) 기존 Point_Log의 status를 REJECTED로 변경, (b) type=REVOKE, amount=원래 포인트, status=FINALIZED인 새 Point_Log를 INSERT, (c) Users의 total_points에서 해당 포인트를 차감한다
3. WHEN REJECT 트랜잭션이 완료되면, THE System SHALL Participations 테이블의 해당 레코드 status를 REJECTED로 변경한다
4. IF 존재하지 않는 participation_id가 전달되면, THEN THE System SHALL 404 상태 코드와 오류 메시지를 반환한다
5. IF action 값이 APPROVE 또는 REJECT가 아니면, THEN THE System SHALL 400 상태 코드와 오류 메시지를 반환한다
6. IF 해당 Participation에 연결된 EARN 타입 Point_Log가 존재하지 않으면, THEN THE System SHALL 400 상태 코드와 "검증할 포인트 기록이 없습니다" 메시지를 반환한다
7. IF 해당 Point_Log의 status가 이미 FINALIZED 또는 REJECTED이면, THEN THE System SHALL 409 상태 코드와 "이미 처리된 검증입니다" 메시지를 반환한다
