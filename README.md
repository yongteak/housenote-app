# 발품 (housenote-app)

네이버 부동산 링크 + 현장 평가를 함께 기록하는 모바일 우선 매물 노트 앱입니다.

## 실행

```bash
bun install
bun run dev
```

## 환경변수

`.env` 파일을 만들고 아래 값을 채워주세요.

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

## Supabase 구성

- 로컬 마이그레이션:
  - `supabase/migrations/20260622153000_balpoom_initial_tables.sql` (초기)
  - `supabase/migrations/20260623174500_hnote_rpc_foundation.sql` (현재 RPC 기준)
- Edge Function: `supabase/functions/extract-property-preview/index.ts`
- Dashboard `Settings > API > Exposed schemas`에 `hnote`를 추가해야 `hnote_*` RPC를 호출할 수 있습니다.

## 크롤 워커

- 모바일 앱은 URL을 `pending` 큐로 저장하고, 실제 크롤은 PC 워커가 처리합니다.
- 워커는 TypeScript CLI `scripts/crawl.ts`를 사용합니다. (구 `.mjs` 스크립트는 `scripts/legacy/`)

```bash
bun run crawl:once
# 또는 폴링 모드
bun run crawl

# 옵션: --actor-id <uuid> --batch-limit 20 --interval-ms 5000 --wait-ms 40000
```

## 현재 MVP 화면

- 저장자 선택(1111 아빠 / 2222 엄마)
- 매물 목록 + 필터
- 매물 입력/수정/삭제
- 링크 메타 정보 자동 채우기
