# 디자인 지침 (Design Guide)

Outer Maps의 시각 언어. 화면 구조와 기능은 `docs/build-guide.md`, 이 문서는 "어떻게 보이는가"를 다룬다. 시안이 확정되면 이 문서를 고쳐 쓴다.

---

## 1. 방향: fuse.kiwi의 바이브, 진의 손맛

참고 사이트 [fuse.kiwi](https://www.fuse.kiwi/) 메인에서 가져올 것과 가져오지 않을 것.

| 가져올 것 | 가져오지 않을 것 |
|---|---|
| 밝은 회색 바탕 위 검정 글자, 형광 강조색 **하나** | 구글 애널리틱스 등 추적 스크립트 |
| 3D 공간에서 정면을 보는 납작한 점들이 천천히 도는 히어로 | 큰 제목 글자 뒤 블러 효과 (가독성, 성능) |
| 검정 알약 모양 카테고리 라벨이 점구름 위에 떠 있음 | 이미지 썸네일 중심 카드 (우리는 아이콘과 글) |
| 아래쪽 카드 그리드: 1px 가는 선으로 칸을 나눔 | 국기 아이콘 |
| 카드 왼쪽 위 모노스페이스 소문자 라벨, 오른쪽 위 작은 기호 | |
| 크고 단단한 이름, 그 아래 모노스페이스 URL과 날짜 | |

한 줄로: **밝고 평평하고 가는 선으로 짠 웹 디렉터리, 그 위에서 떠다니는 3D 지도.** 기업 랜딩 페이지 문법(그라데이션 버튼, 숫자 카운터, 그림자 카드)은 쓰지 않는다.

## 2. 서체

### 2-1. 조합

| 역할 | 서체 | 라이선스 | 쓰는 곳 |
|---|---|---|---|
| 영문 디스플레이 | **Velvelyne** (Velvetyne) | CUTE | 사이트 이름, 영문 제목, ACF 영문 이름 |
| 그 밖의 모든 글자 | **Pretendard** | SIL OFL 1.1 | 한글 본문·제목, 버튼, 칩, 카드, 라벨, 숫자 |

- 서체는 **두 개만** 쓴다. 한글은 Pretendard 하나로 통일한다 (2026-11-03 결정, 시안 v0.1 이후 Galmuri·IBM Plex 후보 제외).
- **Velvelyne**는 Liberation Sans의 뼈대에서 획을 한 줄로 뽑아낸 "스켈레톤" 서체다. 굵기 4가지, 탈이분법(post-binary) 합자가 들어 있다. 2023년 Manon Van der Borght, Mariel Nils가 디자인했고, 뼈대 생성 스크립트는 Benjamin Dumond, 과정 감독은 Raphaël Bastide다. 한 줄 획이라 **긴 글에는 쓰지 않는다.**
- **라벨**(카테고리, 점수, URL, 날짜, 버전)도 Pretendard로 쓴다. fuse.kiwi의 모노스페이스 라벨 느낌은 서체 대신 이렇게 낸다:
  - 12px, 굵기 400, 색 `--ink-soft`보다 진한 `#3a3a36`
  - 숫자는 `font-variant-numeric: tabular-nums` (자릿수 정렬)
  - 영문 라벨은 소문자, `letter-spacing: 0.02em`
- Velvelyne가 준비되기 전(시안, 초기 개발)에는 같은 자리에 Pretendard 200(ExtraLight)을 쓴다.

### 2-2. 섞어 쓰는 규칙

- 기본 `font-family`는 Pretendard. 한국어 문장 속 영어 단어도 Pretendard의 라틴 글자로 나온다.
- Velvelyne는 `.display-en` 클래스가 붙은 요소에만 적용한다 (`font-family: Velvelyne, Pretendard, sans-serif`).
- 한글 제목은 Pretendard 700, 그 위나 옆에 Velvelyne 영문을 짝짓는 방식도 쓸 수 있다 (예: "구름 너머의 지도 / Outer Maps").

### 2-3. 파일 구하기

- Pretendard: npm `pretendard` 패키지의 `dist/web/static/woff2/` 또는 동적 서브셋(`dist/web/variable/woff2-dynamic-subset/`). 라이선스 파일을 함께 복사한다.
- Velvelyne: [velvetyne.fr/fonts/velvelyne](https://velvetyne.fr/fonts/velvelyne/)에서 사람이 직접 내려받아 `src/fonts/velvelyne/`에 **패키지 전체**(폰트, 라이선스 문서, FONTLOG)를 넣는다. 파일이 없으면 Pretendard 200으로 대체하고 빌드에서 경고만 낸다.

### 2-4. 라이선스와 크레딧

- **Velvelyne는 SIL OFL이 아니라 CUTE 라이선스**다 (Bye Bye Binary가 쓴 "Conditions d'Utilisation Typographiques Engageantes").
  - 디자이너 이름과 원 배포처 링크를 크레딧에 남긴다.
  - 서체 파일을 다시 배포할 때는 폰트 파일 하나만이 아니라 라이선스 문서와 FONTLOG를 포함한 **전체 패키지**로 둔다. 웹폰트로 자체 호스팅할 때도 `src/fonts/velvelyne/`에 라이선스 문서와 FONTLOG를 함께 둔다.
  - 수정(서브셋 포함)하면 이름에 덧붙임을 하고, 탈이분법 글자와 그것을 켜는 OpenType 기능은 지우지 않는다. **서브셋을 만들 때 이 글자들을 남긴다.**
  - 상업적 사용에는 기관 유형별 기부 안내가 있다 (소규모 기업·문화 단체 50~500유로 등). 비영리 리서치 사이트는 해당 여부를 확인하고, 가능하면 기부한다.
- Pretendard는 SIL OFL 1.1. 라이선스 파일을 같이 둔다.
- `/credits/`에 서체마다: 이름, 디자이너, 파운드리·배포처, 라이선스, 링크.

### 2-5. 용량 (퍼마컴퓨팅)

- 한글 서체는 크다. Pretendard는 공식 **동적 서브셋** woff2를 자체 호스팅하거나, 빌드 단계에서 사이트에 실제로 쓰인 글자만 남기는 서브셋을 만든다 (`pyftsubset`).
- 쓰는 굵기만 싣는다: Pretendard 400·700 (+ 대체용 200), Velvelyne 2가지.
- `font-display: swap`. 서체가 늦게 와도 글은 먼저 보인다.

## 3. 색

밝은 바탕, 검정, 강조색 하나. 강조색은 **선택·포커스·현재 상태**에만 쓰고, 의미 구분(층, 카테고리)에는 쓰지 않는다.

```css
:root {
  --bg:        #f1f1ee;  /* 밝은 회색 바탕 (약간 따뜻하게) */
  --surface:   #ffffff;  /* 카드, 시트 */
  --ink:       #111111;  /* 글자, 알약 라벨 바탕 */
  --ink-soft:  #6b6b66;  /* 보조 글자, 흐려진 아이콘 */
  --rule:      #c9c9c3;  /* 1px 구분선 */
  --accent:    #9dff3a;  /* 형광 연두: 선택, 포커스, 호버 */
  --on-accent: #111111;
}
```

- 강조색은 시안에서 2~3개 후보를 비교해 확정한다. fuse.kiwi와 똑같은 연두를 그대로 쓰지 않고, 우리 것을 하나 고른다.
- 강조색 위 글자는 늘 `--ink`. 흰 글자 금지 (대비 부족).
- 다크 모드는 v0.1 이후. 넣을 때는 같은 토큰을 다시 정의한다.

## 4. 형태 요소

### 4-1. 알약 라벨 (pill)

- 검정 바탕 + 흰 글자 + 완전히 둥근 모서리. fuse.kiwi의 카테고리 라벨 그대로의 문법.
- 쓰는 곳: 지도 위 칸 이름·카테고리 묶음 이름, 보기 전환 버튼의 선택된 상태, 모아보기 칩의 켜진 상태.
- 꺼진 칩은 테두리만 있는 알약 (1px `--ink`, 바탕 투명).

### 4-2. 가는 선 그리드

- 지도 아래 목록은 **카드 그리드**: 모바일 1~2열, 태블릿 2열, 데스크톱 3~4열. 칸 사이는 여백이 아니라 1px `--rule` 선.
- 그림자, 둥근 카드 모서리 없음.

### 4-3. 카드 (목록 칸과 사례 카드 공통)

```
┌────────────────────────────┐
│ tool·image            ◐   │  ← 왼쪽 위: Pretendard 12px 소문자 카테고리 / 오른쪽 위: 층 기호
│                            │
│      [아이콘 원판]           │
│                            │
│ Krita                      │  ← Velvelyne 큰 영문 이름
│ 크리타 · 디지털 페인팅        │  ← Pretendard 한글
│                            │
│ 참여 3  독립 3  연대 2       │  ← Pretendard 12px 점수 (tabular-nums)
│ krita.org                  │  ← Pretendard 12px URL
└────────────────────────────┘
```

- 층 기호: `grey` = ◐, `contrast` = 점선 테두리 + "대조" 알약. 색에만 의존하지 않는다.

### 4-4. 아이콘

- 실제 로고를 쓰지 않는다. **직접 그린 한 세트**의 SVG (`src/icons/{id}.svg`).
- 그리드 24×24, 선 굵기 1.5px 통일, 끝 둥글게. 채움 없이 선으로. Velvelyne의 한 줄 획과 어울리게.
- 각 ACF가 하는 일이나 성격을 상징 (붓, 필름, 활자, 상점 차양, 서랍, 집 등). 회의에서 목록을 정한다.
- 지도에서는 흰 원판(지름 40~48px, 1px `--ink` 테두리) 안에 아이콘. 선택되면 원판이 `--accent`로 채워진다.
- 아이콘이 없으면 원판 안에 이름 이니셜 (Velvelyne, 없으면 Pretendard 200).

### 4-5. 지도 캔버스

- 바탕은 `--bg` 그대로. 축선과 8칸 경계는 1px `--rule`, 점선.
- 축 라벨: 축 끝에 알약 라벨 + 아래에 12px 라벨로 한 줄 기준 ("소비 ↔ 공동 제작").
- fuse.kiwi처럼 히어로 영역 전체가 지도. 사이트 이름(Velvelyne)은 지도 위 왼쪽 위에 작게, 블러 없이.
- 모아보기에서 빠진 아이콘은 `--ink-soft` 15% 불투명.

### 4-6. 모바일 시트

- 아래에서 올라오는 `--surface` 판, 위쪽에 짧은 손잡이 막대. 모서리는 위쪽만 살짝 둥글게(8px) — 사이트에서 둥근 모서리를 쓰는 유일한 곳.
- 시트 안 구성은 4-3 카드와 같고, 아래에 버튼 줄 (공식 사이트 / 다운로드 / 자세히 →).

## 5. 글자 크기와 간격

| 토큰 | 모바일 | 데스크톱 | 쓰는 곳 |
|---|---|---|---|
| `--fs-display` | 40px | 72px | 사이트 이름, 페이지 제목 (Velvelyne) |
| `--fs-name` | 28px | 36px | 카드의 ACF 이름 |
| `--fs-body` | 16px | 17px | 본문 (Pretendard, 줄간격 1.65) |
| `--fs-label` | 12px | 12px | 라벨 (Pretendard, tabular-nums) |

- 간격 단위 8px. 카드 안쪽 여백 16px(모바일)·24px(데스크톱).
- 본문 한 줄 최대 34em.
- 터치 대상 최소 44×44px.

## 6. 움직임

- 지도의 자동 회전은 아주 천천히 (한 바퀴 60초 이상). 보기 전환 0.8초, ease-in-out.
- 호버·선택 변화 0.15초.
- `prefers-reduced-motion`이면 회전과 전환 모두 끄고 즉시 배치.

## 7. 시안 단계에서 정할 것

- [x] 서체: Velvelyne + Pretendard 하나로 결정
- [ ] 강조색 확정 (후보 2~3개 비교)
- [ ] 아이콘 그림체 샘플 5개 (Blender, GIMP, itch.io, Are.na, Velvetyne)
- [ ] 모바일 지도 화면, 카드 시트, 목록 그리드
- [ ] 데스크톱 지도 화면 + 오른쪽 카드 패널

## 참고

- [fuse.kiwi](https://www.fuse.kiwi/)
- [Velvelyne — Velvetyne](https://velvetyne.fr/fonts/velvelyne/)
- [Velvelyne 출시 소식 (Velvetyne 뉴스레터)](https://velvetyne.getsendstack.com/archive/dBR6MB-lancement-de-velvelyne)
- [CUTE 라이선스 (영문, Bye Bye Binary)](https://hub.xpub.nl/cerealbox/~manetta/license-gestures/2024_BBB_CUTE-EN.pdf)
- [Pretendard](https://www.sandollcloud.com/font/16951/Pretendard)
- 시안 v0.1: `docs/mockups/` (Design 캔버스에서 옮겨 온 HTML)
