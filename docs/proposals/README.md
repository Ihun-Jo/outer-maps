# 제안: 관계도 보강 (2026-11-03, 아직 data/에 합치지 않음)

`relations_additions.csv`(관계 19개)와 `nodes_additions.csv`(새 노드 12개)는 **검토용 제안**이다. 빌드는 이 폴더를 읽지 않는다. 확정되면 `data/relations.csv`, `data/nodes_external.csv`에 합치고, CLAUDE.md의 관계 종류 목록과 지형도 범례를 함께 고친다.

새 관계 종류:
- `member_of` 같은 우산 조직 (GNU, Software Freedom Conservancy, 연합우주)
- `funded_by` 후원·투자 (Epic MegaGrant, FLOSS/fund, NLnet, Anthropic, 벤처 투자)
- `opens_format_of` 구름 툴의 파일을 열 수 있음 = 떠날 수 있는 출구 (PSD, IDML)
- `shares_format` 같은 열린 포맷을 공유 (OpenRaster)
- `spin_off_of` 프로젝트에서 갈라져 나온 영리 회사 (W4 Games)
기존 종류 추가분: `fork_of` 2개 (Tenacity, OpenToonz), `distributes_via` 1개 (Krita 스토어 판매).

`source_url`은 관계마다의 출처. GIMP·Krita의 PSD 지원은 공식 사이트·문서 첫 화면만 걸어 두었으니 해당 문서 페이지로 바꿔야 한다.
