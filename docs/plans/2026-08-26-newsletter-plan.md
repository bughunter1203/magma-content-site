# 뉴스레터 구독 Implementation Plan

> **For agentic workers:** 이 머신에서는 순차 인라인 실행이 안전하므로, 구현 시 `superpowers:executing-plans` 기반의 Inline Execution을 권장한다. Subagent-Driven 방식은 권장하지 않는다.

**Goal:** MAGMA 홈에 이메일 하나만 받는 뉴스레터 구독 흐름을 추가하고, 개발용 로컬 JSONL 저장소까지 테스트 우선으로 검증한다.

**Architecture:** 홈 페이지는 브랜드 소개 섹션 아래, 최신 블로그 섹션 앞에 클라이언트 뉴스레터 폼 컴포넌트를 렌더한다. API 라우트는 요청 검증과 응답 계약만 담당하고, 저장 로직은 `SubscriberStore` 인터페이스 뒤의 개발용 JSONL 구현체로 분리한다. 이메일 정규화·검증·중복 판정은 서버 유틸과 저장소 테스트로 먼저 고정한다.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict mode, Vitest, Node `fs/promises`, 로컬 JSONL 개발 저장소.

## Global Constraints

승인 설계 기준: `docs/design/2026-08-26-newsletter-subscription.md` (commit `64181e4`).

- 폼 위치: 홈 화면 브랜드 소개 섹션 아래, 최신 블로그 섹션 앞에 별도 뉴스레터 섹션을 둔다.
- 받을 정보: 이메일 하나만 받는다. 이름과 태그는 받지 않는다.
- 오류·중복 처리: 이메일 입력값은 앞뒤 공백을 제거하고 영문을 소문자로 변환한다. 브라우저와 서버 양쪽에서 형식 검증을 수행한다. 신규 주소와 이미 등록된 주소에는 같은 성공 메시지를 반환한다.
- 화면 동작: 제출 중에는 버튼을 비활성화한다. 성공 시 인라인 감사 메시지를 표시한다. 실패 시 오류 메시지를 표시하되 입력값은 보존한다.
- 저장 방식: 저장 담당 코드를 `SubscriberStore` 같은 인터페이스로 분리한다. 현재 구현체는 개발용 로컬 파일(JSONL)을 사용한다. 나중에 DB나 외부 이메일 서비스로 교체할 때 폼과 API 계약은 건드리지 않는다.
- 테스트·공개 조건: Vitest를 도입해 정규화·검증·중복 로직을 단위 테스트한다. 폼 동작은 브라우저로 육안 확인한다. 공개 조건은 잘못된 이메일 미저장, 정규화 동작, 재제출해도 1건, 중복 클릭 차단, 성공·실패 메시지 표시, lint·build 통과, 이메일이 클라이언트 번들이나 로그에 노출되지 않음이다.
- 오류 처리 규칙: 빈 값 또는 형식이 잘못된 이메일은 저장하지 않는다. 브라우저 검증 실패 시 API 요청을 보내지 않고 인라인 오류 메시지를 표시한다. 서버 검증 실패 시 오류 응답을 반환하고, 화면은 오류 메시지를 표시하되 입력값을 보존한다. 저장 중 예외가 발생하면 일반 실패 메시지를 표시하고 입력값을 보존한다. 신규 구독과 중복 구독은 같은 성공 메시지를 사용한다. 중복 여부, 저장 파일 경로, 내부 예외 상세, 등록된 이메일 목록은 클라이언트에 노출하지 않는다. 서버 로그에는 이메일 주소를 기록하지 않는다.
- 공개 제한: 개발용 로컬 JSONL 저장을 전제로 하므로 운영 공개는 영속 저장소와 개인정보 운영 기준을 확정한 뒤 진행한다.
- 프로젝트 규칙: `package.json` 수정은 실행 단계에서만 한다. 이 계획 작성 단계에서는 구현 코드를 작성하지 않는다.

## Current Context

- 현재 프로젝트에는 테스트 파일이 없다: `*.test.*` 검색 결과 0건.
- `package.json`에는 `test` 스크립트와 Vitest 의존성이 없다.
- 홈 화면은 `src/app/page.tsx`에서 `Hero`, 브랜드 소개 섹션, 최신 블로그 섹션, 최신 실적 섹션 순서로 구성되어 있다.
- API 예시는 `src/app/api/posts/route.ts`와 `src/lib/publish.ts`에 있으며, 서버 오류 로그는 민감정보가 노출되지 않도록 제한해야 한다.
- 현재 작업 트리에는 기존 변경이 있다: `package-lock.json` 수정, `content/posts/dev-publish-test.md` 미추적. 구현자는 이 변경을 목적 없이 되돌리거나 삭제하지 않는다.

## Execution Mode

권장 실행 방식: Inline Execution.

- 각 단계를 순서대로 진행한다.
- 각 단계에서 테스트를 먼저 작성하고, 특정 테스트가 기대한 이유로 실패하는 RED를 관찰한 뒤 최소 구현을 한다.
- 각 단계 통과 후 관련 좁은 테스트와 전체 검증 명령을 실행한다.
- Subagent-Driven 방식은 이 머신에서 권장하지 않는다.

## Task Interfaces

- `normalizeEmail(input: string): string`
  - 입력: 사용자가 제출한 이메일 문자열.
  - 출력: 앞뒤 공백이 제거되고 ASCII 영문이 소문자로 변환된 이메일 문자열.
- `isValidEmail(email: string): boolean`
  - 입력: 정규화된 이메일 문자열.
  - 출력: 서버 저장 가능 형식이면 `true`, 아니면 `false`.
- `SubscriberStore`
  - 파일: `src/lib/subscribers/store.ts`
  - 메서드: `add(email: string): Promise<{ email: string; inserted: boolean }>`
  - 입력: 정규화·검증 완료된 이메일.
  - 출력: 저장된 정규화 이메일과 신규 삽입 여부. API는 `inserted` 값을 클라이언트에 노출하지 않는다.
- `JsonlSubscriberStore`
  - 파일: `src/lib/subscribers/jsonl-store.ts`
  - 생성자 입력: `{ filePath: string }`
  - 저장 형식: 한 줄당 JSON 객체 1개. 최소 필드 `{ "email": string, "createdAt": string }`.
  - 중복 기준: 정규화된 `email` 문자열 완전 일치.
- `subscribeToNewsletter(input: unknown, store: SubscriberStore): Promise<{ ok: true }>`
  - 파일: `src/lib/subscribers/subscribe.ts`
  - 입력: API 요청 본문에서 파생된 unknown 값과 저장소 구현체.
  - 출력: 신규·중복 모두 `{ ok: true }`.
  - 오류: 유효하지 않은 입력은 `SubscribeError`로 422 계열 오류 정보를 던진다. 저장소 예외는 API에서 일반 실패 메시지로 변환한다.
- `POST /api/newsletter`
  - 파일: `src/app/api/newsletter/route.ts`
  - 요청: `{ "email": string }`.
  - 성공 응답: HTTP 201, `{ "ok": true, "message": "구독 신청이 접수되었습니다." }`.
  - 검증 실패 응답: HTTP 422, `{ "error": "유효한 이메일을 입력하세요." }`.
  - 저장 실패 응답: HTTP 500, `{ "error": "지금은 구독 신청을 저장할 수 없습니다. 잠시 후 다시 시도하세요." }`.
  - 응답 금지: 중복 여부, 저장 파일 경로, 내부 예외 상세, 등록된 이메일 목록, 이메일 원문.
- `NewsletterSignup`
  - 파일: `src/components/NewsletterSignup.tsx`
  - 역할: 이메일 입력, 제출 중 비활성화, 성공·실패 인라인 메시지, 실패 시 입력값 보존.

## Numbered TDD Implementation Steps

### 1. 테스트 도구(Vitest) 설치

- [ ] **바꿀 파일 경로**
  - Modify: `package.json`
  - Modify: `package-lock.json`
  - Create: `vitest.config.ts`
  - Create: `tests/smoke.test.ts`

- [ ] **먼저 쓸 테스트**
  - 테스트 이름: `vitest runs in this project`
  - 기대 동작: Vitest가 TypeScript 테스트 파일을 발견하고 기본 assertion을 실행한다.
  - RED 기대: 설치 전 `npm test -- tests/smoke.test.ts --run`은 `Missing script: "test"` 또는 `vitest: not found`로 실패한다.

- [ ] **꼭 필요한 최소 구현**
  - 실행 단계에서만 `vitest`를 devDependency로 설치한다.
  - `package.json`에 `"test": "vitest"` 스크립트를 추가한다.
  - `vitest.config.ts`는 Node 환경 단위 테스트가 가능한 최소 설정만 둔다.
  - smoke test는 2단계 이후 기능 테스트가 Vitest 실행을 증명하면 삭제해도 된다.

- [ ] **확인 명령**
  - `npm install -D vitest`
  - `npm test -- tests/smoke.test.ts --run`
  - `npm run lint`

### 2. 이메일 정규화·검증 유틸리티

- [ ] **바꿀 파일 경로**
  - Create: `src/lib/subscribers/email.ts`
  - Create: `src/lib/subscribers/email.test.ts`

- [ ] **먼저 쓸 테스트**
  - 테스트 이름: `normalizeEmail trims leading and trailing whitespace`
    - 기대 동작: `"  User@Example.com  "`이 `"User@Example.com"`로 반환된다.
  - 테스트 이름: `normalizeEmail lowercases ascii email letters`
    - 기대 동작: `"User.Name+News@Example.COM"`이 `"user.name+news@example.com"`으로 반환된다.
  - 테스트 이름: `isValidEmail accepts a simple valid address`
    - 기대 동작: `"user@example.com"`은 `true`다.
  - 테스트 이름: `isValidEmail rejects malformed addresses`
    - 기대 동작: 빈 값, `"not-an-email"`, `"user@"`, `"@example.com"`, 공백 포함 주소는 `false`다.
  - RED 기대: `src/lib/subscribers/email.ts`가 없거나 named export가 없어 실패한다.

- [ ] **꼭 필요한 최소 구현**
  - `normalizeEmail(input: string): string`만 추가한다. 동작은 `trim()` 후 소문자 변환으로 제한한다.
  - `isValidEmail(email: string): boolean`만 추가한다. 복잡한 RFC 전체 구현은 하지 않고 현재 요구를 만족하는 실용 정규식으로 판단한다.
  - 이메일 값을 콘솔에 출력하지 않는다.

- [ ] **확인 명령**
  - `npm test -- src/lib/subscribers/email.test.ts --run`
  - `npm run lint`

### 3. 저장 계층 분리: `SubscriberStore` 인터페이스와 JSONL 저장소

- [ ] **바꿀 파일 경로**
  - Create: `src/lib/subscribers/store.ts`
  - Create: `src/lib/subscribers/jsonl-store.ts`
  - Create: `src/lib/subscribers/jsonl-store.test.ts`
  - Modify: `.gitignore`

- [ ] **먼저 쓸 테스트**
  - 테스트 이름: `JsonlSubscriberStore writes one json line for a new email`
    - 기대 동작: 임시 파일 경로에 `user@example.com`을 추가하면 JSONL 파일에 한 줄이 생기고, 해당 줄의 `email` 값이 `user@example.com`이다.
  - 테스트 이름: `JsonlSubscriberStore does not append duplicate normalized email`
    - 기대 동작: 같은 정규화 이메일을 두 번 추가해도 파일 줄 수는 1건이다.
  - 테스트 이름: `JsonlSubscriberStore returns inserted false for duplicates`
    - 기대 동작: 첫 호출은 `{ inserted: true }`, 두 번째 호출은 `{ inserted: false }`를 반환한다.
  - RED 기대: `SubscriberStore`와 `JsonlSubscriberStore`가 없어 import 실패 또는 메서드 미구현 실패가 난다.

- [ ] **꼭 필요한 최소 구현**
  - `SubscriberStore` 인터페이스를 이 단계에서 명확히 도입한다.
  - `JsonlSubscriberStore`는 생성자에서 `filePath`를 주입받아 테스트가 임시 파일을 사용할 수 있게 한다.
  - `add(email)`은 부모 디렉터리를 만들고, 기존 파일이 없으면 새로 만들며, 기존 줄을 읽어 동일 이메일이 있으면 append하지 않는다.
  - 저장 레코드는 최소 `{ email, createdAt }`만 쓴다.
  - `.gitignore`에 개발용 저장 파일 경로 예: `/data/newsletter-subscribers.jsonl`을 추가한다.

- [ ] **확인 명령**
  - `npm test -- src/lib/subscribers/jsonl-store.test.ts --run`
  - `npm test -- src/lib/subscribers/email.test.ts src/lib/subscribers/jsonl-store.test.ts --run`
  - `npm run lint`

### 4. 구독 서비스 계층: 검증 실패 미저장과 중복 성공 응답

- [ ] **바꿀 파일 경로**
  - Create: `src/lib/subscribers/subscribe.ts`
  - Create: `src/lib/subscribers/subscribe.test.ts`

- [ ] **먼저 쓸 테스트**
  - 테스트 이름: `subscribeToNewsletter normalizes before saving`
    - 기대 동작: `{ email: "  USER@Example.COM " }` 입력 시 store에는 `user@example.com`만 전달되고 결과는 `{ ok: true }`다.
  - 테스트 이름: `subscribeToNewsletter rejects malformed email without saving`
    - 기대 동작: `{ email: "not-an-email" }`은 검증 오류를 던지고 store의 `add`는 호출되지 않는다.
  - 테스트 이름: `subscribeToNewsletter returns the same success for duplicate and new emails`
    - 기대 동작: store가 `{ inserted: true }` 또는 `{ inserted: false }`를 반환해도 서비스 결과는 모두 `{ ok: true }`다.
  - 테스트 이름: `subscribeToNewsletter rejects non object payload without saving`
    - 기대 동작: `null`, 문자열, email이 없는 객체는 검증 오류를 던지고 저장하지 않는다.
  - RED 기대: 서비스 파일과 오류 타입이 없어 실패한다.

- [ ] **꼭 필요한 최소 구현**
  - `SubscribeError`를 추가하고 검증 실패 시 상태 코드와 공개 가능한 메시지만 담는다.
  - `subscribeToNewsletter(input, store)`는 unknown 본문에서 문자열 email만 받아 정규화·검증 후 저장한다.
  - `store.add()`의 `inserted` 값은 내부적으로만 소비하고 반환값에는 포함하지 않는다.
  - 저장소 예외를 이 계층에서 이메일 포함 로그로 남기지 않는다.

- [ ] **확인 명령**
  - `npm test -- src/lib/subscribers/subscribe.test.ts --run`
  - `npm test -- src/lib/subscribers/email.test.ts src/lib/subscribers/jsonl-store.test.ts src/lib/subscribers/subscribe.test.ts --run`
  - `npm run lint`

### 5. `POST /api/newsletter` API 라우트

- [ ] **바꿀 파일 경로**
  - Create: `src/app/api/newsletter/route.ts`
  - Create: `src/app/api/newsletter/route.test.ts`

- [ ] **먼저 쓸 테스트**
  - 테스트 이름: `POST returns 201 with generic success for a new email`
    - 기대 동작: `{ email: "user@example.com" }` 요청은 HTTP 201과 `{ ok: true, message: "구독 신청이 접수되었습니다." }`를 반환한다.
  - 테스트 이름: `POST returns the same success for a duplicate email`
    - 기대 동작: 같은 이메일 재요청도 HTTP 201과 같은 body를 반환하며 중복 여부를 노출하지 않는다.
  - 테스트 이름: `POST returns 422 and does not expose email for invalid email`
    - 기대 동작: 잘못된 이메일은 HTTP 422, `{ error: "유효한 이메일을 입력하세요." }`이며 응답 문자열에 제출 이메일이 포함되지 않는다.
  - 테스트 이름: `POST returns 422 for non json body`
    - 기대 동작: JSON 파싱 실패 시 저장 없이 공개 가능한 오류만 반환한다.
  - 테스트 이름: `POST returns 500 without internal details when store fails`
    - 기대 동작: 저장소 예외 발생 시 HTTP 500이고 저장 파일 경로, 내부 예외 메시지, 이메일이 응답에 없다.
  - RED 기대: 라우트 파일이 없어 import 실패하거나 POST export가 없어 실패한다.

- [ ] **꼭 필요한 최소 구현**
  - `NextRequest`를 받아 JSON body를 파싱하고 `subscribeToNewsletter`에 위임한다.
  - 기본 저장소는 `process.cwd()` 아래 `data/newsletter-subscribers.jsonl`을 사용한다.
  - 테스트 가능성을 위해 저장소 생성은 라우트 내부의 작은 factory 함수로 제한하되, 클라이언트 API 계약에 노출하지 않는다.
  - 오류 응답에는 이메일, 중복 여부, 파일 경로, 내부 예외 상세를 담지 않는다.
  - 서버 로그가 필요하면 고정 문자열과 익명 오류 유형만 기록한다. 이메일 원문은 기록하지 않는다.

- [ ] **확인 명령**
  - `npm test -- src/app/api/newsletter/route.test.ts --run`
  - `npm test -- src/lib/subscribers/email.test.ts src/lib/subscribers/jsonl-store.test.ts src/lib/subscribers/subscribe.test.ts src/app/api/newsletter/route.test.ts --run`
  - `npm run lint`

### 6. 클라이언트 뉴스레터 폼 컴포넌트

- [ ] **바꿀 파일 경로**
  - Create: `src/components/NewsletterSignup.tsx`
  - Create: `src/components/NewsletterSignup.test.tsx`
  - Modify: `vitest.config.ts`
  - Modify: `package.json`
  - Modify: `package-lock.json`

- [ ] **먼저 쓸 테스트**
  - 테스트 이름: `NewsletterSignup does not submit malformed email`
    - 기대 동작: 잘못된 이메일 입력 후 제출하면 `fetch`가 호출되지 않고 인라인 오류가 표시된다.
  - 테스트 이름: `NewsletterSignup disables submit button while submitting`
    - 기대 동작: 제출 Promise가 pending인 동안 버튼이 disabled 상태다.
  - 테스트 이름: `NewsletterSignup shows thank you message on success`
    - 기대 동작: API 성공 응답 후 인라인 감사 메시지가 표시된다.
  - 테스트 이름: `NewsletterSignup preserves input value on failure`
    - 기대 동작: API 실패 응답 또는 네트워크 실패 후 오류 메시지가 표시되고 입력값은 유지된다.
  - RED 기대: 컴포넌트 파일이 없어 import 실패한다. DOM 테스트 환경이 아직 없으면 `document is not defined` 또는 matcher 부재로 실패한다.

- [ ] **꼭 필요한 최소 구현**
  - 실행 단계에서 DOM 테스트에 필요한 최소 devDependency를 설치한다: `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom`.
  - `vitest.config.ts`에 React 컴포넌트 테스트용 `environment: "jsdom"` 설정과 setup 파일이 필요하면 최소 setup 파일을 추가한다.
  - `NewsletterSignup`은 `"use client"` 컴포넌트로 만들고 이메일 input 하나와 submit button 하나만 둔다.
  - 제출 전 `trim()`과 브라우저 측 형식 검증을 수행하고, 실패 시 API 요청을 보내지 않는다.
  - 제출 중 버튼을 비활성화하고, 성공 시 감사 메시지, 실패 시 오류 메시지를 같은 섹션 안에 표시한다.
  - 실패 시 입력값을 보존한다.

- [ ] **확인 명령**
  - `npm install -D @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom`
  - `npm test -- src/components/NewsletterSignup.test.tsx --run`
  - `npm run lint`

### 7. 홈 화면 배치: 브랜드 소개 아래, 최신 블로그 앞

- [ ] **바꿀 파일 경로**
  - Modify: `src/app/page.tsx`
  - Create: `src/app/page.test.tsx`

- [ ] **먼저 쓸 테스트**
  - 테스트 이름: `Home renders newsletter section after brand section and before latest posts`
    - 기대 동작: 렌더된 홈 DOM에서 브랜드 섹션 텍스트가 먼저 나오고, 뉴스레터 섹션 heading 또는 landmark가 그 다음, 최신 글 heading이 그 다음 순서로 나온다.
  - 테스트 이름: `Home includes exactly one newsletter email field`
    - 기대 동작: 홈 렌더 결과에 뉴스레터 이메일 입력 필드가 하나만 있다.
  - RED 기대: `NewsletterSignup`이 홈에 연결되지 않아 뉴스레터 섹션을 찾지 못한다.

- [ ] **꼭 필요한 최소 구현**
  - `src/app/page.tsx`에서 브랜드 소개 섹션 종료 직후, 최신 블로그 섹션 주석 직전에 `NewsletterSignup` 섹션을 추가한다.
  - 새 섹션은 기존 `container-page`, `py-*`, `text-primary`, `text-ink-sub`, `bg-card` 등 토큰 유틸리티를 사용하고 hex 값을 직접 쓰지 않는다.
  - 히어로, 브랜드 소개, 최신 블로그, 최신 실적의 기존 구조와 데이터 로딩은 변경하지 않는다.

- [ ] **확인 명령**
  - `npm test -- src/app/page.test.tsx --run`
  - `npm test -- src/components/NewsletterSignup.test.tsx src/app/page.test.tsx --run`
  - `npm run lint`

### 8. 공개 전 보안·저장 검증과 빌드 검증

- [ ] **바꿀 파일 경로**
  - Modify: `README.md` 또는 `docs/` 하위 운영 메모 문서 중 실행 단계에서 확인된 적절한 파일 1개
  - Modify: `.gitignore`가 3단계에서 누락되었을 경우에만 `.gitignore`
  - No production code changes unless earlier validation exposes a defect

- [ ] **먼저 쓸 테스트**
  - 테스트 이름: `newsletter responses never include submitted email`
    - 기대 동작: 성공, 중복, 검증 실패, 저장 실패 응답의 serialized body에 제출 이메일 문자열이 없다.
  - 테스트 이름: `invalid email does not create jsonl file`
    - 기대 동작: 잘못된 이메일 요청 뒤 개발 저장 파일이 생성되지 않거나 빈 상태다.
  - 테스트 이름: `duplicate submissions leave one jsonl record`
    - 기대 동작: 공백·대소문자가 다른 같은 이메일을 두 번 제출해도 JSONL 레코드는 1건이다.
  - RED 기대: 이전 단계에서 빠진 보안/저장 조건이 있으면 해당 조건 테스트가 실패한다. 이미 통과하면 이 단계는 회귀 검증과 문서화 중심으로 진행한다.

- [ ] **꼭 필요한 최소 구현**
  - 3~7단계 테스트에 이미 포함된 공개 조건 중 누락된 조건만 보완한다.
  - 개발용 JSONL 저장 파일이 공개 저장소에 포함되지 않도록 ignore 규칙을 최종 확인한다.
  - 운영 공개가 아직 보류 조건임을 README 또는 docs 메모에 짧게 남긴다. 개인정보 보관 기간, 삭제 요청 처리, 운영 저장소는 이 기능 범위 밖으로 둔다.
  - 수동 브라우저 확인은 `npm run dev`로 수행한다: 뉴스레터 섹션 위치, 버튼 disabled, 성공 메시지, 실패 메시지와 입력값 보존을 확인한다.

- [ ] **확인 명령**
  - `npm test -- --run`
  - `npm run lint`
  - `npm run build`
  - `npm run dev`
  - 브라우저 수동 확인: `http://localhost:3000`에서 브랜드 소개 섹션 아래와 최신 글 섹션 앞의 뉴스레터 섹션을 확인하고, 유효/무효 이메일 제출 동작을 검증한다.
  - 저장 파일 확인: `node -e "const fs=require('fs'); const p='data/newsletter-subscribers.jsonl'; console.log(fs.existsSync(p) ? fs.readFileSync(p,'utf8').split('\n').filter(Boolean).length : 0)"`

## Validation Checklist Before Completion

- [ ] Vitest가 설치되어 `npm test -- --run`으로 전체 테스트가 실행된다.
- [ ] 이메일 정규화: 앞뒤 공백 제거와 영문 소문자 변환이 테스트로 고정됐다.
- [ ] 서버 검증: 잘못된 이메일은 저장되지 않는다.
- [ ] 중복 처리: 같은 이메일을 대소문자나 공백이 다른 형태로 다시 제출해도 저장 결과는 1건이다.
- [ ] 신규 주소와 중복 주소가 같은 성공 응답을 반환한다.
- [ ] 홈 화면 뉴스레터 섹션은 브랜드 소개 아래, 최신 블로그 앞에 있다.
- [ ] 제출 중 버튼 비활성화, 성공 메시지, 실패 메시지, 실패 시 입력값 보존이 확인됐다.
- [ ] 응답·클라이언트 번들·서버 로그에 제출 이메일이 불필요하게 노출되지 않는다.
- [ ] `npm run lint`와 `npm run build`가 통과한다.
- [ ] 개발용 JSONL 파일은 공개 저장소에 실수로 포함되지 않는다.

## Risks and Boundaries

- 운영 공개는 이 계획의 완료 조건이 아니다. 로컬 JSONL은 개발 검증용이며 운영 영속성, 백업, 동시 쓰기, 삭제 요청 처리를 보장하지 않는다.
- 봇·스팸 방어는 설계 문서의 공개 보류 사유에 포함되지만, 이번 구현 범위는 이메일 1개 구독 흐름과 개발 저장소 검증까지다.
- 새 의존성은 테스트 도구 도입에 필요한 범위로 제한한다. 1단계 Vitest와 6단계 DOM 테스트 도구 외 패키지는 추가하지 않는다.
- 기존 사용자 변경인 `package-lock.json` 수정과 `content/posts/dev-publish-test.md`는 구현자가 목적 없이 되돌리거나 삭제하지 않는다.
