# PWS Supabase / 보안 최종 가이드라인

작성일: 2026-05-04  
대상: PWS Expo React Native 앱, iOS Expo Go 데이터/카피 테스트, Android V1.0 초기 출시 준비

## 결론

현재 앱에서 최종 배포 전 가장 중요한 보안 경계는 **Supabase RLS/RPC/env 관리**다. 앱 코드는 Supabase anon key로 직접 DB API를 호출하므로, DB가 “최종 방화벽”이어야 한다.

- `eas update`로 JS/카피/날씨 로직 검수는 가능하다.
- DB 보안은 Supabase 정책이 맞아야만 안전하다.
- `EXPO_PUBLIC_*` 값은 앱 안에 보이는 값이므로 secret으로 취급하면 안 된다.
- `service_role` 키는 절대 앱, `.env`, EAS Update, Git에 넣으면 안 된다.

실행 파일:

- 적용 SQL: `supabase/pws_security_baseline.sql`
- 운영 강화 migration: `supabase/migrations/20260504055409_operational_security_hardening.sql`
- 날씨 Edge Function: `supabase/functions/weather-onecall`
- 확인 SQL: `supabase/pws_security_preflight.sql`

---

## 1. 비개발자용 실행 순서

### 1) 백업/스냅샷 확인

Supabase Dashboard에서 가능하면 DB 백업 상태를 확인한다. 초기 테스터 단계면 위험은 낮지만, `unique index` 생성이 중복 데이터에서 실패할 수 있다.

### 2) 먼저 확인 SQL 실행

Supabase Dashboard → SQL Editor에서 아래 파일을 열어 실행한다.

```text
supabase/pws_security_preflight.sql
```

특히 아래 두 쿼리가 **0 rows**여야 한다.

- `feedback_entries`의 `(user_id, feedback_date, feedback_slot)` 중복
- `weather_cache`의 `(lat, lng)` 중복

중복이 있으면 baseline SQL의 unique index 생성이 실패할 수 있다.

### 3) 보안 baseline SQL 실행

```text
supabase/pws_security_baseline.sql
```

### 4) 다시 확인 SQL 실행

다시 `pws_security_preflight.sql`을 실행해서:

- RLS가 true인지
- 정책이 생성됐는지
- `delete_own_account`가 `security_definer = true`인지 확인한다.

---

## 2. 테이블별 필요한 정책

### `public.users`

앱 사용 목적:

- 본인 프로필 조회
- 온보딩 시 본인 row 생성
- 본인 프로필/알림/가중치 업데이트
- 계정 삭제

정책 원칙:

```text
id = auth.uid()
```

즉 로그인한 사용자는 본인 row만 볼 수 있고, 만들 수 있고, 수정할 수 있고, 삭제할 수 있어야 한다.

### `public.feedback_entries`

앱 사용 목적:

- 본인 체감 피드백 저장
- 오늘 기록 조회
- 히스토리 조회
- 예측 학습용 카운트 조회

정책 원칙:

```text
user_id = auth.uid()
```

추가로 앱은 하루/슬롯당 1개 기록을 전제로 하므로 아래 unique index가 필요하다.

```text
(user_id, feedback_date, feedback_slot)
```

### `public.weather_cache`

앱 사용 목적:

- 날씨 API 호출량을 줄이기 위한 공유 캐시

현재 구조:

- 클라이언트가 읽고 쓴다.
- 개인 데이터는 아니지만, 악의적 사용자가 캐시 값을 오염시킬 가능성은 있다.

초기 테스터 단계 허용 정책:

- authenticated만 select/insert/update
- lat/lng 범위 제한
- expires_at은 fetched_at 이후, 최대 2시간 이내

운영 단계 권장:

- 클라이언트 쓰기 금지
- Supabase Edge Function 또는 서버가 OpenWeather 호출/캐시 쓰기 담당
- 클라이언트는 select만 하거나, 아예 Edge Function만 호출

### `public.tester_feedback`

앱 사용 목적:

- 설정 화면에서 테스터 의견 보내기

정책 원칙:

- insert는 본인 `user_id`만 가능
- select도 본인 row만 가능
- 운영자가 전체 피드백을 보는 것은 Supabase dashboard/service role에서 처리

---

## 3. 계정 삭제 RPC

앱은 이 RPC를 호출한다.

```ts
supabase.rpc('delete_own_account')
```

필수 보안 조건:

1. 함수는 user_id 인자를 받으면 안 된다.
2. 내부에서 무조건 `auth.uid()`만 사용해야 한다.
3. `security definer`를 쓰되 `search_path = ''`로 고정해야 한다.
4. 함수 내부 테이블은 `public.users`처럼 schema를 명시해야 한다.
5. `authenticated`만 execute 가능해야 한다.

이렇게 해야 사용자가 다른 사람 ID를 넘겨서 삭제하는 공격을 막을 수 있다.

---

## 4. 락/트랜잭션 관리

### 이 baseline SQL의 트랜잭션

`pws_security_baseline.sql`은 `begin; ... commit;`으로 묶었다. 중간에 실패하면 전체가 롤백된다.

### 잠금 위험

아래 작업은 짧은 잠금을 잡을 수 있다.

- `alter table ... enable row level security`
- `create unique index if not exists ...`
- `drop/create policy`

초기 테스터 DB에서는 보통 문제 없다. 실제 사용자가 많은 운영 DB라면:

1. 낮은 트래픽 시간에 실행
2. 먼저 중복 데이터 확인
3. unique index는 가능하면 별도 maintenance window에서 실행
4. 대규모 테이블은 `create index concurrently`를 별도 SQL로 실행

주의: `create index concurrently`는 transaction 안에서 실행할 수 없다. 그래서 비개발자용 baseline은 단순성을 위해 일반 `create index`를 사용했다.

---

## 5. SQL Injection 방지

현재 앱 코드는 Supabase JS query builder를 사용한다.

예:

```ts
supabase.from('feedback_entries').select('*').eq('user_id', userId)
```

이 방식은 직접 문자열 SQL을 조립하지 않으므로 일반적인 SQL injection 위험이 낮다.

계속 지켜야 할 금지사항:

- 사용자 입력을 붙여서 raw SQL 만들기 금지
- RPC에서 `execute '...' || user_input` 같은 dynamic SQL 금지
- `delete_own_account(user_id)`처럼 민감한 RPC에 사용자 ID 인자 받기 금지
- admin/service role 키로 클라이언트에서 RPC 호출 금지

---

## 6. 세션/토큰/쿠키 관리

### 현재 앱 구조

- React Native/Expo 앱이다.
- 브라우저 쿠키 기반 앱이 아니다.
- Supabase session은 access token + refresh token으로 관리된다.
- 앱에서는 SecureStore 기반 storage adapter를 사용한다.
- 이번 점검에서 `processLock`을 Supabase client에 추가해 RN 환경의 session refresh 동시성 위험을 줄였다.

현재 코드상 좋은 점:

- `expo-secure-store` 사용
- session chunking 처리 있음
- `detectSessionInUrl: false`
- `autoRefreshToken: true`
- `persistSession: true`
- `lock: processLock`

운영 권장:

- Auth JWT expiry는 너무 길게 두지 말 것. 일반적으로 30분~1시간 권장.
- Refresh token은 Supabase가 관리하므로 앱에서 직접 저장/노출하지 말 것.
- 로그에 access token, refresh token, Supabase anon key, OpenWeather key를 찍지 말 것.
- 로그아웃 시 `supabase.auth.signOut()`이 호출되는지 유지.

### 쿠키 관련

이 앱은 RN 앱이므로 HTTP-only cookie 전략이 핵심이 아니다. Supabase 공식 문서도 client-side JS/RN 앱에서는 token storage를 별도로 설정하는 구조를 설명한다.

---

## 7. 환경변수 / secret 관리

### 절대 secret이 아닌 값

아래 값들은 앱 번들에 들어가므로 사용자에게 보일 수 있다.

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_TEST_PASSWORD
```

`EXPO_PUBLIC_SUPABASE_ANON_KEY`는 RLS가 있으면 공개되어도 되는 publishable key 성격이다. 하지만 RLS가 꺼져 있으면 바로 위험해진다.

`EXPO_PUBLIC_TEST_PASSWORD`는 진짜 비밀번호/보안장치가 아니다. 테스터 계정용 공용 문턱 정도로만 봐야 한다.

### 절대 앱에 넣으면 안 되는 값

```text
SUPABASE_SERVICE_ROLE_KEY
OPENWEATHER_API_KEY
OPENWEATHER_PRIVATE_KEY 류의 서버 전용 키
키스토어 비밀번호
Apple/Google signing secret
```

이런 값은 Supabase Edge Function, EAS secret, 로컬 키체인 등 서버/빌드 전용 위치에만 둬야 한다.

### EAS Update 주의

`eas update`는 로컬 또는 EAS 환경변수를 사용해 JS 번들을 만든다. 실수로 로컬 `.env`가 preview/prod에 섞이지 않도록 가능하면 아래처럼 environment를 명시한다.

```bash
eas update --branch preview --platform ios --environment preview
```

---

## 8. Auth / 테스터 계정 설정

현재 앱은 테스터 ID를 이메일로 바꾼다.

```text
<tester-id>@test.pws
```

권장:

1. Supabase Auth에서 테스터 계정을 미리 생성한다.
2. 앱의 `allowAutoSignup`은 false 유지.
3. 가능하면 Supabase Auth의 public signup을 꺼둔다.
4. 테스터 공용 비밀번호는 유출된다고 가정한다.
5. 테스터 단계가 끝나면 `EXPO_PUBLIC_TEST_PASSWORD` 방식은 제거하거나 더 안전한 초대/OTP/이메일 로그인으로 교체한다.

---

## 9. OpenWeather 키 / 날씨 캐시 보안

운영 구조:

- OpenWeather 키는 Supabase Edge Function secret `OPENWEATHER_API_KEY`로만 보관한다.
- 클라이언트는 `weather-onecall` Edge Function만 호출한다.
- `weather_cache` 쓰기는 Edge Function의 service role client만 수행한다.
- 클라이언트는 `weather_cache`를 직접 insert/update하지 않는다.

배포 순서:

```bash
supabase login
supabase secrets set OPENWEATHER_API_KEY=<openweather-key> --project-ref lmnytisjnyyuxiuespjf
supabase functions deploy weather-onecall --project-ref lmnytisjnyyuxiuespjf
```

그 다음 운영 강화 migration을 적용한다. Edge Function 배포 전 `weather_cache` write를 차단하면 기존 앱의 날씨 갱신이 실패할 수 있다.

---

## 10. 현재 앱 코드 기준 체크 결과

이미 반영된 개선:

- Android release debug signing 제거
- Android 불필요 권한 제거
  - `READ_EXTERNAL_STORAGE`
  - `WRITE_EXTERNAL_STORAGE`
  - `SYSTEM_ALERT_WINDOW`
- `EX_DEV_CLIENT_NETWORK_INSPECTOR=false`
- 날씨 상세 화면이 공통 weather store/cache 사용
- 날씨 데이터 누락 시 crash 방지
- 날씨 신호 없을 때 예측 confidence `cold_start`
- Supabase SecureStore session chunking
- Supabase auth `processLock` 추가

남은 DB 외부 확인:

- RLS 실제 활성화 여부
- `delete_own_account` 함수 owner/권한
- 테스터 Auth 계정 존재 여부
- public signup 설정
- `weather-onecall` Edge Function 배포 여부
- Supabase Edge Function secret `OPENWEATHER_API_KEY` 설정 여부

---

## 11. 최종 GO 조건

### iOS Expo Go 데이터/카피/날씨 테스트

GO 조건:

- baseline SQL 적용
- preview env로 `eas update`
- 테스터 계정 로그인 확인
- 날씨 조회/피드백/히스토리 확인

### Android V1.0 설치형 테스트/초기 출시

GO 조건:

- baseline SQL 적용
- `npm run android:release` 통과 상태 유지
- signing env 또는 EAS Build로 signed APK/AAB 생성
- 실제 기기 smoke test
- Supabase Auth/RLS/RPC 확인

---

## 12. 근거 문서

- Supabase Securing your API: https://supabase.com/docs/guides/api/securing-your-api
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Database Functions: https://supabase.com/docs/guides/database/functions
- Supabase Sessions: https://supabase.com/docs/guides/auth/sessions
- Supabase React Native Auth quickstart: https://supabase.com/docs/guides/auth/quickstarts/react-native
- Expo environment variables: https://docs.expo.dev/guides/environment-variables/
- EAS environment variables: https://docs.expo.dev/eas/environment-variables/
