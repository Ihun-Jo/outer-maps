# Outer Maps

**창의적 구름, 그 너머를 상상하는 대안적 플랫폼 지도**

구름 너머의 창작 플랫폼 26개(자유 소프트웨어, 대안 예술 플랫폼, 서체 파운드리, 공동체)를 재귀적 공중 × 자본으로부터의 독립 × 연대 감각의 3D 8분면과 단면·한 줄·분류 보기로 읽는 웹 아카이브. v0.1, 작업 중.

- 사이트: https://ihun-jo.github.io/outer-maps/
- 데이터: `data/*.csv` (유일한 원천)
- 설계와 기록: `CLAUDE.md`, `docs/`, `CHANGELOG.md`, `docs/devlog.md`

## 만들기

```
npm install
npm run build   # data/ → site/
npm run serve   # http://localhost:4173
```

빌드 도구 없이 Node 스크립트 하나로 정적 HTML을 만든다. 지도는 three.js(자체 호스팅). 자바스크립트가 없어도 목록과 사례 페이지는 읽힌다.

## 서체

- Velvelyne — Manon Van der Borght, Mariel Nils (Velvetyne), CUTE 라이선스. `src/fonts/velvelyne/`에 라이선스 문서와 FONTLOG를 함께 둔다.
- Pretendard — 길형진, SIL OFL 1.1.
