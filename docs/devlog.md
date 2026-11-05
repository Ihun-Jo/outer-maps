# 개발 기록 (Dev Log)

다른 컴퓨터나 새 Claude Code 세션에서 이어 작업할 때 먼저 읽는 문서. 대화 기록은 컴퓨터 사이에 옮겨지지 않으므로, 지금까지의 결정과 남은 일을 여기에 모은다. 짧은 변경 목록은 `CHANGELOG.md`, 설계는 `docs/build-guide.md`·`docs/design-guide.md`.

마지막 갱신: 2026-11-05

---

## 1. 다른 컴퓨터에서 시작하기

1. Node.js LTS 설치 (Windows: `winget install OpenJS.NodeJS.LTS`)
2. 저장소 받기: `gh repo clone Ihun-Jo/outer-maps` (또는 `git clone https://github.com/Ihun-Jo/outer-maps.git`)
3. 폴더에서 `npm install` → `npm run build` → `npm run serve`
4. 브라우저에서 http://localhost:4173 을 연다. 지도(ES 모듈·import map·data.json)는 `file://`로 열면 돌아가지 않고 정적 그림과 목록만 보인다.
5. Claude Code에서 이 폴더를 열면 `CLAUDE.md`가 자동으로 읽힌다. 거기서 이 문서를 가리킨다. 데스크톱 앱의 미리보기는 `.claude/launch.json`의 `site` 설정(`npm run serve`)을 쓴다.

**배포**: `main`에 push하면 GitHub Actions(`.github/workflows/pages.yml`)가 빌드해서 GitHub Pages(https://ihun-jo.github.io/outer-maps/)에 올린다. `site/`는 빌드 결과라 저장소에 넣지 않는다.

## 2. 지금까지 한 일 (build-guide 1장의 순서)

| 단계 | 내용 | 상태 |
|---|---|---|
| 1 | `build/build.mjs`: CSV → 목록 + 사례 페이지 26개 + `site/data.json`. 데이터 검사(점수 0~3, id 연결, layer, category) | 완료 |
| 2 | three.js 8분면 지도 + 사례 카드 (데스크톱 오른쪽 패널, 모바일 아래 시트) | 완료 |
| 3 | 단면(두 축)·한 줄(한 축) 보기, 0.8초 전환, URL 해시 상태 | 완료 |
| 4 | 모아보기 칩(하위 분류 포함) + 분류 보기, 목록 분류별 묶음 | 완료 |
| 5 | 지형도 보기 (Adobe 구름 ↔ ACF, 관계선) | **다음 차례** |
| 6 | /about, /reading, /credits | 아직 |

### 코드 지도

- `build/build.mjs` — 빌드. 의존성 없음 (작은 CSV 파서 내장). 지도 JS는 한 줄 주석·들여쓰기만 덜어 내서 `site/js/map/`에 쓴다.
- `build/serve.mjs` — 로컬 정적 서버 (`npm run serve`, 포트 4173).
- `src/js/map/layouts.js` — **배치 계산의 단일 원천**. 축 정의(`AXIS_DEFS`), 보기별 좌표(`arrange`), 칸 이름, 분류·구획 계산, 정적 SVG용 투영. three.js에 기대지 않아 빌드(정적 SVG)와 지도가 함께 쓴다.
- `src/js/map/scene.js` — three.js 장면: 축과 눈금, CSS2D 라벨, 아이콘 스프라이트, 카메라 전환(원근 ↔ 정사영), 렌더 루프(움직임 없으면 안 그림).
- `src/js/map/controls.js` — 보기 막대, 모아보기 칩, 키보드, 보이지 않는 포커스 버튼, 호버 말풍선, URL 해시.
- `src/js/map/card.js` — 사례 카드와 모바일 시트.
- `src/js/map/main.js` — 진입점. WebGL이 안 되면 아무것도 바꾸지 않아 정적 SVG와 목록이 남는다.
- `src/css/site.css` — design-guide 토큰. 맨 아래에 **지도 라벨 숨김 규칙**이 있다 (아래 3장).
- `src/vendor/three/` — three.js r187에서 필요한 모듈만 복사 (CDN 금지).
- `src/fonts/velvelyne/` — Velvelyne 패키지 전체 (CUTE 라이선스, FONTLOG 포함). Pretendard는 빌드 때 npm 패키지에서 동적 서브셋 200·400·700만 복사.

## 3. 사람과 정한 것 (바꾸기 전에 확인)

- **8분면 축 이름** (사람이 정함): x 재귀적 공중(쓰는 사람 ↔ 고치는 사람) = `score_community` / y 자본으로부터의 독립(기업의 것 ↔ 공동의 것) = (소유+재정)/2 / z 연대 감각(도구 안 ↔ 세계와 함께) = `score_solidarity`. 카드·말풍선에서는 짧게 참여·독립·연대.
- **큐브 틀 없음**: 중심 1.5를 지나는 축 세 개와 0.5 간격 눈금. 축 이름은 높은 끝에만, 낮은 끝에는 기준 문구만.
- **숫자 라벨 숨김**: 칸 이름·개수("이름 미정 · 2"), 축 끝 점수("연대 3"), 분류 구획 개수. `site.css` 맨 아래 규칙으로 숨겼을 뿐 코드는 남아 있다. 지우면 다시 보인다.
- **아이콘 원판 3/5 크기** (26px, 좁은 화면 24px). 원판이 작아서 빗맞아도 22px 안의 가장 가까운 아이콘을 고른다.
- **대조 사례(Cavalry)**: 8분면에서만 중심에서 1.4배 바깥에 표시 (`CONTRAST_PUSH`). 점수는 그대로. 첫 각도는 yaw −38°, pitch 22° (시안의 38°에서는 Cavalry가 사례 무리와 겹쳐 보였음).
- **강조색** `#9dff3a` 임시 (후보 #ff7a2b, #5ee0ff 비교 전).
- **칸 경계**: 독립이 정확히 1.5인 Natron·itch.io·Neocities는 경계 위에 둔다. 규칙 미정.
- **사례 카드** (2026-11-05): 점수는 축마다 얇은 한 줄 바(3단 칸 아님). 표 안에 누가·라이선스(무료의 근거)·재정·맞서는 것·칸. 표 밑 줄글은 `data/descriptions.csv`의 소개·역사·지금·주요 사건·관계 순서, 이어서 연대 근거 문단과 출처. 표와 줄글 글자 크기는 하나(14px). 소개는 `data.json`에 넣지 않고 사례별 `description.json`을 카드가 열릴 때 불러온다.
- **첫 화면** (2026-11-05): 머리글은 "Outer Maps" + 작은 부제 두 줄. 지도가 먼저이고, 보기·모아보기 막대와 "왜 이 세 축인가?"는 지도 아래. 둘러보기는 기본으로 켜짐 (모바일에서 지도 위 터치는 회전, 스크롤은 지도 밖에서). build-guide 4-6의 "터치는 스크롤에 양보"와 다르게 정함. "둘러보기"·"정면에서 보기" 버튼 없음.
- **용량**: "일단 코드를 다 만들고 나서 고민" (퍼마컴퓨팅만이 기준은 아님). 지도 JS ≈ 41KB로 목표 30KB 초과, 빌드가 경고만 낸다. three.js가 약 2.1MB(gzip 약 450KB)로 훨씬 크다.

## 4. 남은 일과 알려진 문제

- **5단계 지형도**: `relations.csv`로 시작 가능. 보강 제안이 `docs/proposals/`에 있다 (새 관계 종류 `member_of`, `funded_by`, `opens_format_of`, `shares_format`, `spin_off_of`). 합치면 CLAUDE.md의 관계 종류 목록과 범례를 함께 고친다.
- 첫 화면에서 "자본으로부터의 독립" 축 이름이 독립 점수가 높은 사례 무리 근처에 겹친다.
- 단면에서 한 좌표에 사례가 많이 모이면(예: 소유×개방 (2,3)에 13개) 원이 커져 라벨을 가린다.
- 8분면의 세 축을 바꾸는 고급 옵션(build-guide 4-2)은 아직 없다.
- 아이콘 SVG(`src/icons/{id}.svg`) 없음 → 이니셜 원판. 아이콘 그림체 샘플 5개 결정 필요.
- 아직 없는 데이터 열: `tagline`(카드 한 줄 소개), `download_url`(다운로드 버튼).
- Velvelyne 패키지에 `fonts/otf~fontmeme.com/` 폴더가 있다. 공식 배포처(velvetyne.fr)에서 다시 받아 바꾸는 편이 안전하다. 크레딧 쓰기 전에 확인.
- `/credits/`에 서체 크레딧(Velvelyne: Manon Van der Borght, Mariel Nils, CUTE / Pretendard: 길형진, OFL) 필요.
