# Outer Maps

**Outer Maps: 창의적 구름, 그 너머를 상상하는 대안적 플랫폼 지도**

구름 너머의 창작 플랫폼(대안적인 예술 플랫폼, 자유 소프트웨어, 서체 파운드리, 공동체)을 데이터 시각화로 소개하고 공부할 수 있게 하는 웹 아카이브. 회전하는 8분면, 관계도, 대응표 같은 여러 형태로 지형을 보여 주는 이정표 역할을 한다. 같은 리서치로 만드는 미니 진(v0.1)의 확장판이기도 하다.

작업을 시작하기 전에 다음을 순서대로 읽는다.

1. `docs/research.md` — 리서치 요약
2. `docs/scoring.md` — 포함 기준, 세 개의 층, 축별 점수 기준, 8분면 축 정의
3. `docs/build-guide.md` — 페이지별 설계와 기술 지침 (**만들기 전에 반드시**)
4. `docs/design-guide.md` — 서체, 색, 형태 등 시각 언어 (**화면을 만들기 전에 반드시**)
5. `docs/devlog.md` — 지금까지 만든 것, 사람과 정한 것, 남은 일, 다른 컴퓨터에서 시작하는 법 (**이어 작업할 때 먼저**)

빌드와 미리보기: `npm install` → `npm run build` → `npm run serve` (http://localhost:4173). `main`에 push하면 GitHub Pages로 배포된다.

## 이 사이트가 말하려는 것

- 대안성은 하나의 기준이 아니라 여러 축의 조합이다. 인터페이스가 이 주장을 보여 줘야 한다. 사용자가 축을 바꿔 가며 같은 사례가 다른 자리에 놓이는 것을 볼 수 있게 한다.
- "대안이다/아니다"로 판정하지 않는다. 사례를 세 층(`case`, `grey` ◐, `contrast`)으로 놓고, 회색지대와 모순, 빈 칸도 지도의 일부로 보여 준다.
- 무료와 자유는 다르다. 무료의 근거(라이선스인가, 회사 정책인가)를 구분해 보여 준다.
- 다섯 개의 질문이 지도의 뼈대다. 누가 소유하고 결정하는가 / 어떻게 돈을 버는가 / 코드와 콘텐츠가 얼마나 열려 있는가 / 무엇에 맞서는가 / 사용자는 참여자인가 소비자인가. 지도의 여러 보기와 축 선택으로 이 질문들을 오가며 볼 수 있게 한다.

## 데이터

`data/`의 CSV가 유일한 데이터 원천이다. 페이지에 사례 정보를 하드코딩하지 않는다. 데이터를 고칠 때는 CSV를 직접 고친다 (UTF-8 BOM 포함, CRLF 줄바꿈, 쉼표 구분, 첫 줄은 열 이름. BOM이 있어야 윈도우 엑셀에서 한글이 깨지지 않는다. 빌드 스크립트는 읽을 때 BOM을 제거한다). 구글 시트 「Outer Maps: 대안 플랫폼 목록」은 CSV 이전의 초안이라 구조가 다르다. 시트에서 CSV를 다시 내보내 덮어쓰지 않는다.

CSV를 고치면 빌드 스크립트의 검사(점수 범위, id 연결)를 통과하는지 확인하고, `CHANGELOG.md`에 한 줄 남긴다.

### `data/platforms.csv` (사례 26개)

| 열 | 뜻 |
|---|---|
| `id` | 고유 키 (영문 소문자) |
| `name` | 표시 이름 |
| `kind` | `tool` 프로그램 / `service` 서비스·플랫폼 |
| `domain` | 창작 영역 |
| `cloud_counterparts` | 대응하는 구름 속 툴·서비스의 id, 세미콜론 구분 (`nodes_external.csv` 참조) |
| `owner`, `ownership_type` | 운영 주체와 그 형태 (`foundation`, `cooperative`, `collective`, `community`, `small-team`, `company`) |
| `license`, `license_family` | 라이선스와 계열 (`proprietary`, `permissive`, `copyleft-weak`, `copyleft-strong`, `copyleft-network`, `font-libre`, `unknown`) |
| `funding` | 재정 모델 설명 |
| `zine_pick` | 진에 실린 대표 사례 여부 (`yes`/`no`) |
| `grey_zone` | 회색지대 여부 (`yes`/`no`), 화면에서는 ◐로 표시 |
| `status` | 현재 상태 메모 |
| `url`, `source` | 공식 사이트, 사실 확인 출처 |
| `note` | 메모 |
| `score_ownership`, `score_funding`, `score_openness`, `score_community`, `score_solidarity` | 0~3 점수 (`docs/scoring.md`) |
| `alt_target` | 무엇에 대한 대안인가 (범주) |
| `layer` | 지도 위의 층: `case` 사례 / `grey` 회색지대 / `contrast` 대조 사례 |
| `category` | 큰 분류: `tool` 창작 도구 / `sale` 판매·유통 / `archive` 아카이빙·큐레이션 / `social` 공유·연결 / `publishing` 웹 출판·호스팅 / `type` 자원 배포(서체). 여러 값이면 `;` |
| `subcategory` | 창작 도구 하위 (`tool`일 때만): `image` / `video` / `animation` / `audio` / `3d-game` / `design-publishing` |

값이 "확인 필요"인 칸은 아직 검증되지 않은 정보다. 화면에 그대로 노출하거나 비워 두고, 추측으로 채우지 않는다.

### `data/solidarity_evidence.csv`

`score_solidarity`의 근거. `id`, `name`, `confidence`(높음/중/낮음), `evidence`, `tension`(한계·모순), `source_solidarity`(출처 URL, ` ; `로 구분). 사례 페이지에서 연대 근거와 출처로 보여 준다. 확신도 "낮음"인 0점은 "근거를 못 찾음"이라고 표기한다.

### `data/descriptions.csv`

사례 페이지의 소개 줄글. `id`, `name`, `intro`(무엇을 위한 곳인가), `history`(역사), `now`(지금의 운영), `events`(주요 사건), `relations`(다른 플랫폼과의 관계), `sources`(출처 URL, ` ; `로 구분), `checked`(확인 날짜). 일반 독자가 읽을 수 있게 칸마다 두세 문장으로 쓴다. 확인하지 못한 사실은 쓰지 않고, 근거가 없으면 칸을 비운다 (화면에서 소제목째 생략). 지도용 `data.json`에는 넣지 않는다. 지도 카드는 사례마다 따로 내보낸 `site/acf/{id}/description.json`을 카드가 열릴 때 불러온다.

### `data/nodes_external.csv`

구름 속 툴·서비스(`cloud-tool`, `cloud-service`), 기타 독점 서비스, 기업 등 사례가 아닌 노드. 관계도와 대응표에 쓴다.

### `data/relations.csv`

`source`, `target`, `type`, `note`. 관계 종류: `alternative_to`, `fork_of`, `acquired_by`, `owned_by`, `distributes_via`, `community_of`, `used_together`, `contrast`.

### 아직 없는 열

`tagline`, `download_url`(지도와 사례 카드에 필요, `docs/build-guide.md` 7장)과 `data_portability`, `funding_types`, `score_independence`(`docs/scoring.md` 5장)는 아직 없다. 열이 필요한 기능은 빈 값으로 두고 화면에서 생략하거나, 열이 생기기 전에 만들지 않고 필요하다고 알린다.

## 사이트 구조

중심은 **지도 한 화면**이다. ACF(구름 너머의 창작 플랫폼) 26개의 아이콘은 늘 같고, 사용자가 고른 **보기**에 따라 배치만 바뀐다. 상세 설계는 `docs/build-guide.md`.

- **지도** `/`: three.js 캔버스.
  - 보기 다섯 가지: **8분면**(기본, 참여 × 독립 × 연대, 드래그로 회전) / **단면**(두 축 2D) / **한 줄**(한 축) / **분류**(카테고리별 묶음) / **지형도**(Adobe 구름과 ACF, 관계선)
  - **모아보기** 칩: 창작 도구(하위: 이미지·영상·애니·사운드·3D/게임·디자인), 판매·유통, 아카이빙·큐레이션, 공유·연결, 웹 출판·호스팅, 자원 배포(서체)
  - 아이콘 호버(모바일은 탭) → 사례 카드: 아이콘, 이름, 한 줄 소개, 세 축 점수, 공식 사이트·다운로드·자세히
  - 축 라벨에 기준 한 줄, 누르면 "왜 이 세 축인가" 설명
  - 지도 아래에 같은 내용의 목록 (JS 없어도 보임)
- **사례 페이지** `/acf/{id}/` ×26
- **소개** `/about/`: 왜 세 축인가, 포함 기준, 세 개의 층, 점수 기준
- **읽을거리** `/reading/`, **크레딧** `/credits/`

만드는 순서: 빌드 스크립트와 목록·사례 페이지 → 8분면과 카드 → 단면·한 줄 → 모아보기·분류 → 지형도 → 나머지. 한 번에 다 만들지 않는다. 하나씩 만들고 확인한다.

나중에 검토할 보조 시각화 (지금은 만들지 않음): 누가 소유하는가(원 안의 원), 돈의 흐름(생키, `funding_types` 필요), 라이선스 스펙트럼("GPL은 프로그램에 적용되지, 그 프로그램으로 만든 작업물에는 적용되지 않는다" 안내 포함), 참여의 사다리.

## 기술 원칙

- 빌드 도구 없이도 열리는 **정적 사이트**를 기본으로 한다. CSV → HTML/SVG 생성은 의존성 최소의 Node 스크립트 하나로 한다.
- 지도는 **three.js**로 만든다. 아이콘은 `THREE.Sprite`(늘 정면), 라벨은 `CSS2DRenderer`. three.js 파일은 `src/vendor/three/`에 직접 두고 import map으로 불러온다 (CDN 금지, 필요한 모듈만). 그 밖의 정적 그림(JS 없을 때의 8분면, 글리프)은 빌드 단계에서 SVG로 미리 그린다.
- **모바일 우선**: 360px 폭부터 설계. 호버는 탭으로 대신하고, 사례 카드는 아래 시트로. 캔버스 터치는 기본으로 페이지 스크롤에 양보하고 "둘러보기"를 켰을 때만 회전.
- **퍼마컴퓨팅 원칙**: 오래된 컴퓨터와 느린 인터넷에서도 잘 열리게. 이미지 최소화, 페이지 용량을 작게, 자바스크립트 없이도 핵심 정보(목록과 사례 페이지)는 읽을 수 있게.
- 추적, 광고, 외부 분석 스크립트, 외부 폰트 CDN을 넣지 않는다.
- 접근성: 색만으로 정보를 구분하지 않는다. 키보드로 조작 가능하게. `prefers-reduced-motion`을 존중한다. 시각화마다 같은 내용을 담은 표나 목록을 함께 둔다.
- 호스팅 후보: Neocities, Codeberg Pages. 지도 안의 대안 인프라로 지도 자체를 운영한다.

## 디자인

시각 언어(서체, 색, 형태, 크기, 움직임)는 **`docs/design-guide.md`**를 따른다. 요약:

- 방향: fuse.kiwi의 바이브. 밝은 회색 바탕, 검정 글자, 형광 강조색 하나, 검정 알약 라벨, 1px 선 그리드, 그 위를 떠다니는 3D 지도. 진처럼 작고 손으로 만든 느낌. 기업 랜딩 페이지처럼 보이지 않게.
- 사이트는 **한국어**. 서체는 두 개만: 영문 디스플레이 **Velvelyne**(Velvetyne, **CUTE 라이선스**), 그 밖의 모든 글자 **Pretendard**(OFL). 서체는 자체 호스팅·서브셋하고 `/credits/`에 크레딧. Velvelyne는 라이선스 문서·FONTLOG를 함께 두고, 서브셋 때 탈이분법 글자를 지우지 않는다.
- 시안 v0.1은 `docs/mockups/`에 있다. 화면 구성과 비율의 참고용이며, 값(색·크기)은 design-guide의 토큰이 우선한다.
- 아이콘: 실제 로고를 쓰지 않고 **직접 그린 단순한 SVG** 한 세트 (`src/icons/{id}.svg`). 준비 전에는 이니셜 원판.
- 회색지대는 ◐, 대조 사례는 점선 테두리와 "대조" 알약으로 일관되게. 강조색은 선택·포커스에만, 의미 구분에는 쓰지 않는다.

## 글쓰기

- 기본 언어는 한국어. 고유명사와 라이선스 이름은 원어 병기.
- 책과 기사 내용은 자기 말로 요약한다. 원문을 길게 옮기지 않는다.
- 사실에는 출처를 단다 (`source`, `source_solidarity` 열).

## 버전

진과 마찬가지로 사이트도 버전을 붙인다. 첫 공개는 v0.1. 데이터나 기준이 바뀌면 `CHANGELOG.md`에 짧게 기록한다.
