# 시안 v0.1 (2026-11-03)

Design 캔버스 「Outer Maps 시안 v0.1」에서 옮겨 온 화면 원본. 브라우저로 바로 열리는 페이지가 아니라 **참고용 소스**다 (Design 캔버스 전용 형식, `support.js` 런타임과 업로드된 서체 주소가 필요해 단독으로는 렌더되지 않는다).

| 파일 | 화면 |
|---|---|
| `Main.dc.html` | 모바일 지도 (8분면), 390×844 |
| `MobileSheet.dc.html` | 모바일 사례 카드 시트 (Krita 예시) |
| `MobileList.dc.html` | 모바일 목록 그리드 |
| `Desktop.dc.html` | 데스크톱 지도 + 오른쪽 카드 패널 + 목록 |
| `Compare.dc.html` | 비교판: 서체·강조색·아이콘 후보 |

읽는 법:
- 레이아웃과 스타일은 각 요소의 인라인 `style`에 있다. 화면 구성, 간격, 크기 비율을 여기서 가져간다.
- 8분면 투영(회전각 yaw 38°, pitch 22°)과 같은 좌표 사례를 원형으로 둘러 배치하는 계산은 `Main.dc.html` 아래 `<script>`의 `renderVals()`에 있다. three.js 구현에서 초기 카메라 각도와 겹침 배치의 참고로 쓴다.
- 시안 이후 바뀐 것: 서체는 Velvelyne + Pretendard 두 개로 확정 (시안의 Inter Tight는 Velvelyne 자리, Galmuri·IBM Plex는 제외). 강조색은 아직 후보 3개 (#9dff3a / #ff7a2b / #5ee0ff).
- 값이 `docs/design-guide.md`와 다르면 **design-guide가 우선**한다.
