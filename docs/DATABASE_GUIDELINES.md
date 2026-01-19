# 데브냥 데이터베이스 운영 지침

## 1. RPC 함수 수정 시 주의사항

### 반드시 확인할 것
- **관련 컬럼 모두 업데이트하는지 확인** - `select_winning_bid` 사례처럼 `status`만 바꾸고 `awarded_bid_id`를 누락하면 데이터 불일치 발생
- **트랜잭션 원자성** - 여러 테이블 수정 시 하나라도 실패하면 전체 롤백되어야 함
- **권한 검증** - `SECURITY DEFINER` 사용 시 함수 내부에서 반드시 권한 체크

### RPC 함수 수정 절차
1. 기존 함수 백업 (SQL Editor에서 함수 정의 복사)
2. 테스트 환경에서 먼저 실행
3. 프로덕션 적용 전 영향받는 기능 목록 작성
4. 적용 후 즉시 기능 테스트

---

## 2. RLS (Row Level Security) 정책

### 현재 적용된 테이블
- `profiles` - 본인 데이터만 수정 가능
- `requests` - 본인 의뢰만 수정/삭제 가능
- `bids` - 본인 입찰만 수정/삭제 가능
- `messages` - 채팅방 참여자만 조회/작성 가능
- `chat_rooms` - 참여자만 조회 가능

### RLS 우회 시 주의
- `SECURITY DEFINER` 함수는 RLS 우회함
- 함수 내부에서 **반드시 수동으로 권한 검증** 필요
- 예: `select_winning_bid`에서 `client_id` 확인

---

## 3. 마이그레이션 규칙

### 파일 명명 규칙
```
supabase/migrations/YYYYMMDD_description.sql
```

### 마이그레이션 작성 시
- **롤백 스크립트 함께 작성** - 문제 시 빠른 복구
- **NOT NULL 추가 시** - 기존 데이터 기본값 먼저 설정
- **컬럼 삭제 금지** - deprecated 마킹 후 일정 기간 유지

### 예시
```sql
-- 마이그레이션
ALTER TABLE requests ADD COLUMN awarded_bid_id UUID REFERENCES bids(id);

-- 롤백
ALTER TABLE requests DROP COLUMN awarded_bid_id;
```

---

## 4. 쿼리 성능

### 인덱스 필수인 컬럼
- `requests.client_id` - 내 의뢰 목록
- `requests.status` - 상태별 필터링
- `bids.request_id` - 의뢰별 입찰 목록
- `bids.developer_id` - 개발자별 입찰 목록
- `messages.room_id` - 채팅방별 메시지
- `chat_rooms.client_id`, `chat_rooms.developer_id` - 내 채팅방 목록

### 쿼리 최적화
- **N+1 방지** - Supabase의 관계 쿼리 사용 (`select('*, profile:profiles(*)')`)
- **불필요한 컬럼 제외** - `select('id, title')` 명시
- **페이지네이션** - `.range(0, 19)` 사용

---

## 5. 데이터 정합성

### 외래 키 관계
```
requests.client_id → profiles.id
requests.awarded_bid_id → bids.id
bids.request_id → requests.id
bids.developer_id → profiles.id
chat_rooms.request_id → requests.id
chat_rooms.client_id → profiles.id
chat_rooms.developer_id → profiles.id
messages.room_id → chat_rooms.id
messages.sender_id → profiles.id
payments.request_id → requests.id
payments.bid_id → bids.id
reviews.request_id → requests.id
reviews.reviewer_id → profiles.id
reviews.reviewee_id → profiles.id
```

### 상태 전이 규칙
```
requests.status:
  open → awarded (낙찰 시)
  awarded → completed (완료 시)
  open → cancelled (취소 시)
  
  ※ awarded → open 불가 (되돌리기 금지)
```

### 데이터 불일치 감지 쿼리
```sql
-- awarded 상태인데 awarded_bid_id가 없는 의뢰
SELECT * FROM requests 
WHERE status = 'awarded' AND awarded_bid_id IS NULL;

-- is_selected=true인데 해당 의뢰가 awarded가 아닌 경우
SELECT b.* FROM bids b
JOIN requests r ON b.request_id = r.id
WHERE b.is_selected = true AND r.status != 'awarded' AND r.status != 'completed';
```

---

## 6. 백업 및 복구

### 정기 백업
- Supabase 자동 백업 (Pro 플랜)
- 중요 변경 전 수동 백업 권장

### 수동 백업 방법
```bash
# Supabase CLI 사용
supabase db dump -f backup.sql
```

### 프로덕션 데이터 수정 시
1. **SELECT로 먼저 확인**
2. **트랜잭션으로 감싸기**
3. **LIMIT 사용**

```sql
-- 나쁜 예
UPDATE requests SET status = 'cancelled';

-- 좋은 예
BEGIN;
SELECT * FROM requests WHERE id = 'xxx'; -- 확인
UPDATE requests SET status = 'cancelled' WHERE id = 'xxx';
-- 확인 후 COMMIT 또는 ROLLBACK
COMMIT;
```

---

## 7. 환경 분리

| 환경 | 용도 | Supabase 프로젝트 |
|------|------|------------------|
| Local | 개발 | supabase start (로컬) |
| Staging | 테스트 | 별도 프로젝트 권장 |
| Production | 운영 | 현재 프로젝트 |

### 환경별 주의사항
- **Production에서 직접 스키마 수정 금지**
- 마이그레이션 파일로 관리
- Staging에서 먼저 테스트 후 Production 적용

---

## 8. 체크리스트

### 새 기능 추가 시
- [ ] 필요한 테이블/컬럼 설계
- [ ] RLS 정책 설정
- [ ] 인덱스 필요 여부 검토
- [ ] 마이그레이션 파일 작성
- [ ] 롤백 스크립트 작성

### RPC 함수 수정 시
- [ ] 기존 함수 백업
- [ ] 모든 관련 컬럼 업데이트 확인
- [ ] 권한 검증 로직 확인
- [ ] 에러 메시지 한글화
- [ ] Staging 테스트
- [ ] Production 적용 후 기능 테스트

### 프로덕션 데이터 수정 시
- [ ] SELECT로 대상 데이터 먼저 확인
- [ ] 트랜잭션 사용
- [ ] 백업 확인
- [ ] 수정 후 검증 쿼리 실행
