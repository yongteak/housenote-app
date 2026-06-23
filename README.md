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

- 로컬 마이그레이션: `supabase/migrations/20260622153000_balpoom_initial_tables.sql`
- Edge Function: `supabase/functions/extract-property-preview/index.ts`
- Dashboard `Settings > API > Exposed schemas`에 `balpoom`을 추가해야 프런트에서 `supabase.schema("balpoom")` 조회가 가능합니다.

## 현재 MVP 화면

- 저장자 선택(1111 아빠 / 2222 엄마)
- 매물 목록 + 필터
- 매물 입력/수정/삭제
- 링크 메타 정보 자동 채우기
