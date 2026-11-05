// CSV → site/ (목록 페이지, 사례 페이지 ×26, data.json).
// Node 기본 모듈과 아래의 작은 CSV 파서만 쓴다. 번들러·프레임워크 없음 (docs/build-guide.md 2장).
// 실행: node build/build.mjs  (또는 npm run build)

import { readFile, writeFile, mkdir, rm, cp, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MAX, CENTER, AXIS_DEFS, OCTANT_AXES, VIEWS, DEFAULT_STATE, CELLS, octantPoint, octantOf, octantLabel,
  CATEGORIES, SUBCATEGORIES, categoriesOf, categoryName, subcategoryName,
  toWorld, axisGeometry, arrange, project, initials,
} from '../src/js/map/layouts.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'data');
const SRC = join(ROOT, 'src');
const OUT = join(ROOT, 'site');
const VERSION = 'v0.1';

const errors = [];
const warnings = [];

// ── CSV ─────────────────────────────────────────────

// RFC 4180 정도의 작은 파서. 따옴표 안의 쉼표·줄바꿈·"" 이스케이프를 처리하고 BOM을 지운다.
function parseCSV(text) {
  text = text.replace(/^﻿/, '');
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\r' || c === '\n') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row);
      row = []; field = '';
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.some((v) => v.trim() !== ''));
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

async function readCSV(name) {
  return parseCSV(await readFile(join(DATA, name), 'utf8'));
}

const splitList = (v, sep = ';') => v.split(sep).map((s) => s.trim()).filter(Boolean);

// ── 어휘 ───────────────────────────────────────────

const AXES = [
  { key: 'score_ownership', ko: '소유' },
  { key: 'score_funding', ko: '재정' },
  { key: 'score_openness', ko: '개방' },
  { key: 'score_community', ko: '참여' },
  { key: 'score_solidarity', ko: '연대' },
];

const KIND = { tool: '프로그램', service: '서비스·플랫폼' };

const OWNERSHIP = {
  foundation: '재단', cooperative: '협동조합', collective: '콜렉티브',
  community: '커뮤니티', 'small-team': '소규모 팀', company: '기업',
};

const LICENSE_FAMILY = {
  proprietary: '독점', permissive: '허용형 오픈소스', 'copyleft-weak': '약한 카피레프트',
  'copyleft-strong': '강한 카피레프트', 'copyleft-network': '네트워크 카피레프트',
  'font-libre': '자유 서체 라이선스', unknown: '확인 필요',
};

// 무료와 자유는 다르다: 쓸 권리의 근거가 라이선스인가, 운영 주체의 정책인가 (CLAUDE.md)
const FREEDOM_BASIS = {
  proprietary: '자유 라이선스가 아니다. 무료로 쓸 수 있다면 그 근거는 라이선스가 아니라 운영 주체의 정책이고, 정책은 바뀔 수 있다.',
  unknown: '라이선스를 아직 확인하지 못했다. 무료의 근거가 라이선스인지 정책인지 알 수 없다.',
  free: '쓰고 고치고 나눌 권리를 라이선스가 보장한다. 운영 주체가 바뀌어도 이 권리는 남는다.',
};

const LAYER = {
  case: { ko: '사례', about: '포함 기준 세 가지를 분명히 충족한다.' },
  grey: { ko: '회색지대', about: '포함 기준을 충족하지만 긴장이나 모순이 있다.' },
  contrast: { ko: '대조 사례', about: '포함 기준을 충족하지 않지만 비교를 위해 지도에 둔다.' },
};

const RELATION = {
  alternative_to: '대안', fork_of: '포크', acquired_by: '인수', owned_by: '소유',
  distributes_via: '배급', community_of: '커뮤니티 소속', used_together: '함께 쓰기', contrast: '대조',
};

// ── 읽기와 검사 ─────────────────────────────────────

const [platformsRaw, solidarityRows, nodes, relations] = await Promise.all([
  readCSV('platforms.csv'),
  readCSV('solidarity_evidence.csv'),
  readCSV('nodes_external.csv'),
  readCSV('relations.csv'),
]);
// 사례 소개 줄글 (선택). 파일이 없으면 소개 섹션을 생략한다
const descriptionRows = existsSync(join(DATA, 'descriptions.csv')) ? await readCSV('descriptions.csv') : [];

const platformIds = new Set();
for (const p of platformsRaw) {
  if (!/^[a-z0-9-]+$/.test(p.id)) errors.push(`platforms.csv: id "${p.id}"는 영문 소문자·숫자·-만 쓴다`);
  if (platformIds.has(p.id)) errors.push(`platforms.csv: id "${p.id}" 중복`);
  platformIds.add(p.id);
  for (const { key } of AXES) {
    if (!/^[0-3]$/.test(p[key])) errors.push(`platforms.csv ${p.id}: ${key} = "${p[key]}" (0~3 정수여야 함)`);
  }
  if (!LAYER[p.layer]) errors.push(`platforms.csv ${p.id}: layer = "${p.layer}" (case/grey/contrast 중 하나)`);
  if (p.ownership_type && !OWNERSHIP[p.ownership_type]) errors.push(`platforms.csv ${p.id}: ownership_type = "${p.ownership_type}"`);
  if (p.license_family && !LICENSE_FAMILY[p.license_family]) errors.push(`platforms.csv ${p.id}: license_family = "${p.license_family}"`);
  // category는 정해진 목록 안이어야 한다 (build-guide 2장). 여러 값이면 ;
  const cats = categoriesOf(p);
  if (!cats.length) errors.push(`platforms.csv ${p.id}: category가 비어 있음`);
  for (const c of cats) {
    if (!CATEGORIES.some((k) => k.key === c)) errors.push(`platforms.csv ${p.id}: category "${c}" (${CATEGORIES.map((k) => k.key).join('/')} 중 하나)`);
  }
  if (p.subcategory) {
    if (!cats.includes('tool')) errors.push(`platforms.csv ${p.id}: subcategory는 category가 tool일 때만`);
    if (!SUBCATEGORIES.some((s) => s.key === p.subcategory)) errors.push(`platforms.csv ${p.id}: subcategory "${p.subcategory}"`);
  }
}

const nodeById = new Map(nodes.map((n) => [n.id, n]));
const knownId = (id) => platformIds.has(id) || nodeById.has(id);

for (const p of platformsRaw) {
  for (const c of splitList(p.cloud_counterparts)) {
    if (!nodeById.has(c)) errors.push(`platforms.csv ${p.id}: cloud_counterparts "${c}"가 nodes_external.csv에 없음`);
  }
}
for (const r of relations) {
  if (!knownId(r.source)) errors.push(`relations.csv: source "${r.source}"가 없음`);
  if (!knownId(r.target)) errors.push(`relations.csv: target "${r.target}"가 없음`);
  if (!RELATION[r.type]) errors.push(`relations.csv: 관계 종류 "${r.type}" (${r.source} → ${r.target})`);
}
for (const s of solidarityRows) {
  if (!platformIds.has(s.id)) errors.push(`solidarity_evidence.csv: id "${s.id}"가 platforms.csv에 없음`);
}
for (const d of descriptionRows) {
  if (!platformIds.has(d.id)) errors.push(`descriptions.csv: id "${d.id}"가 platforms.csv에 없음`);
}

// 아직 없는 열 (CLAUDE.md, build-guide 7장): 화면에서 생략하고 경고만
const columns = Object.keys(platformsRaw[0] ?? {});
const missingColumns = ['tagline', 'download_url'].filter((c) => !columns.includes(c));
if (missingColumns.length) warnings.push(`platforms.csv에 아직 없는 열: ${missingColumns.join(', ')} (화면에서 생략)`);

const missingIcons = platformsRaw.filter((p) => !existsSync(join(SRC, 'icons', `${p.id}.svg`))).map((p) => p.id);
if (missingIcons.length) warnings.push(`아이콘 없음 ${missingIcons.length}개 (src/icons/{id}.svg): 이니셜 원판으로 대체`);

if (errors.length) {
  console.error(`빌드 중단: 데이터 오류 ${errors.length}건`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}

// ── 파생 값 ────────────────────────────────────────

const solidarityById = new Map(solidarityRows.map((s) => [s.id, s]));
const descriptionById = new Map(descriptionRows.map((d) => [d.id, d]));

const platforms = platformsRaw.map((raw) => {
  const p = { ...raw };
  for (const { key } of AXES) p[key] = Number(raw[key]);
  p.cloud_counterparts = splitList(raw.cloud_counterparts);
  const point = octantPoint(p);
  p.octant = { ...point, ...octantOf(point) };
  p.solidarity = solidarityById.get(p.id) ?? null;
  p.description = descriptionById.get(p.id) ?? null;
  p.icon = missingIcons.includes(p.id) ? null : `icons/${p.id}.svg`;
  return p;
});

const nameOf = (id) => platforms.find((p) => p.id === id)?.name ?? nodeById.get(id)?.name ?? id;

// ── HTML 조각 ──────────────────────────────────────

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const UNVERIFIED = '확인 필요';

// "확인 필요"는 추측으로 채우지 않고 그대로 드러낸다
function val(v) {
  if (!v) return '';
  if (v === UNVERIFIED) return `<span class="unverified">${UNVERIFIED}</span>`;
  return esc(v);
}

const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

function host(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

function disc(p, base, cls = 'disc') {
  if (p.icon) return `<span class="${cls}" aria-hidden="true"><img src="${base}${p.icon}" alt="" width="28" height="28"></span>`;
  return `<span class="${cls}" aria-hidden="true">${esc(initials(p.name))}</span>`;
}

function layerMark(p) {
  if (p.layer === 'grey') return `<span class="label" title="회색지대"><span aria-hidden="true">◐</span><span class="visually-hidden">회색지대</span></span>`;
  if (p.layer === 'contrast') return `<span class="pill">대조</span>`;
  return '';
}

const threeAxes = (p) =>
  `참여 ${fmt(p.octant.x)} · 독립 ${fmt(p.octant.y)} · 연대 ${fmt(p.octant.z)}`;

// 카드 왼쪽 위의 소문자 분류 라벨 (design-guide 4-3: "tool · image")
const categoryTag = (p) => [categoriesOf(p).join('·'), p.subcategory].filter(Boolean).join(' · ');
const categoryText = (p) => categoriesOf(p).map(categoryName).join(', ') + (p.subcategory ? ` · ${subcategoryName(p.subcategory)}` : '');

const fiveAxesText = (p) => AXES.map(({ key, ko }) => `${ko} ${p[key]}`).join(' · ');

function glyph(p) {
  const cols = AXES.map(({ key, ko }) => {
    const bars = [0, 1, 2].map((i) => `<i style="--f:${Math.min(1, Math.max(0, p[key] - i))}"></i>`).join('');
    return `<div class="glyph-axis"><span class="label">${ko}</span><span class="bars">${bars}</span><span class="label">${p[key]} / 3</span></div>`;
  }).join('');
  return `<div class="glyph" aria-hidden="true">${cols}</div>\n<p class="label">${fiveAxesText(p)}</p>`;
}

// three.js는 CDN 없이 site/vendor/three/에서 import map으로 불러온다 (CLAUDE.md 기술 원칙)
const MAP_SCRIPTS = `<script type="importmap">{"imports":{"three":"./vendor/three/three.module.js","three/addons/":"./vendor/three/addons/"}}</script>
<script type="module" src="js/map/main.js"></script>`;

function page({ title, description, base, body, head = '' }) {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="stylesheet" href="${base}fonts/fonts.css">
<link rel="stylesheet" href="${base}css/site.css">
${head}
</head>
<body>
<a class="skip" href="#main">본문으로 건너뛰기</a>
<header class="site-header">
  <a class="site-name display-en" href="${base}index.html">Outer Maps</a>
  <span class="site-sub">창의적 구름, 그 너머를 상상하는 대안적 플랫폼 지도</span>
  <span class="label version">${VERSION}</span>
</header>
<main id="main">
${body}
</main>
<footer class="site-footer">
  <span class="label">Outer Maps ${VERSION} · 점수는 판정이 아니라 관점이며, 지금 값은 검토 중인 초안이다.</span>
  <span class="label">추적·광고·외부 스크립트 없음</span>
</footer>
</body>
</html>
`;
}

// ── 목록 페이지 ────────────────────────────────────

// 분류가 여럿인 사례는 분류마다 목록에 나오지만, id 앵커는 처음 나올 때만 붙인다
const anchored = new Set();
function listCard(p) {
  const id = anchored.has(p.id) ? '' : ` id="acf-${p.id}"`;
  anchored.add(p.id);
  return `<li class="layer-${p.layer}" data-id="${p.id}"${id}>
  <a class="card" href="acf/${p.id}/index.html">
    <span class="card-top"><span class="label">${esc(categoryTag(p))}</span>${layerMark(p)}</span>
    ${disc(p, '')}
    <span class="card-name display-en">${esc(p.name)}</span>
    <span class="card-ko">${val(p.domain)}</span>
    <span class="card-meta">
      <span class="label">${threeAxes(p)}</span>
      <span class="label">${esc(octantLabel(p.octant))}</span>
      <span class="label">${esc(host(p.url))}</span>
    </span>
  </a>
</li>`;
}

// 목록: 분류별 소제목과 앵커. JS가 없으면 위의 앵커 링크가 모아보기를 대신한다 (build-guide 4-7)
function listGroups() {
  const inCat = (key) => platforms.filter((p) => categoriesOf(p).includes(key));
  const nav = CATEGORIES
    .map((c) => `<a href="#cat-${c.key}">${c.name} ${inCat(c.key).length}</a>`).join('<span aria-hidden="true"> · </span>');
  const groups = CATEGORIES.map((c) => {
    const items = inCat(c.key);
    if (!items.length) return '';
    let rows;
    if (c.key === 'tool') {
      // 창작 도구는 하위 분류마다 소제목 줄
      const subs = [...SUBCATEGORIES, { key: '', name: '기타' }];
      rows = subs.map((s) => {
        const sub = items.filter((p) => (s.key ? p.subcategory === s.key : !SUBCATEGORIES.some((k) => k.key === p.subcategory)));
        if (!sub.length) return '';
        return `<li class="grid-sub" data-sub="${s.key}"${s.key ? ` id="sub-${s.key}"` : ''}><span class="label">${s.name} ${sub.length}</span></li>\n${sub.map(listCard).join('\n')}`;
      }).join('\n');
    } else rows = items.map(listCard).join('\n');
    return `<section class="list-group" id="cat-${c.key}" data-cat="${c.key}" aria-labelledby="cat-${c.key}-h">
  <h3 class="list-group-head" id="cat-${c.key}-h">${c.name} <span class="label">${items.length}</span></h3>
  <ul class="grid">
${rows}
  </ul>
</section>`;
  }).join('\n');
  return `<nav class="list-nav label" aria-label="분류로 가기">${nav}</nav>\n${groups}`;
}

// ── 지도 (JS가 없을 때의 정적 8분면 SVG와 지도 자리) ─────

function octantSvg() {
  const W = 760, H = 640, S = 105, D = 24;
  const n = (v) => v.toFixed(1);
  const at = (o) => {
    const q = project(toWorld(o));
    return { x: W / 2 + q.x * S, y: H / 2 + q.y * S, depth: q.depth };
  };
  const path = (segs) => segs.map(([a, b]) => {
    const p = at(a), q = at(b);
    return `M${n(p.x)} ${n(p.y)}L${n(q.x)} ${n(q.y)}`;
  }).join('');

  // 중심을 지나는 세 축과 눈금, 축 끝마다 그 끝이 뜻하는 기준
  const C = CENTER;
  const lines = [];
  let ends = '';
  for (const [along, key, at3, tick] of [
    ['x', OCTANT_AXES.x, { y: C, z: C }, 'z'],
    ['y', OCTANT_AXES.y, { x: C, z: C }, 'z'],
    ['z', OCTANT_AXES.z, { x: C, y: C }, 'x'],
  ]) {
    const a = axisGeometry(along, at3, tick);
    lines.push(a.line, ...a.ticks);
    const def = AXIS_DEFS[key];
    for (const end of ['low', 'high']) {
      const q = at(a[end]);
      ends += `<text class="svg-axis svg-axis-${end}" x="${n(q.x)}" y="${n(q.y)}" text-anchor="middle">${def.name}<tspan class="axis-score"> ${end === 'high' ? MAX : 0}</tspan></text><text class="svg-hint" x="${n(q.x)}" y="${n(q.y + 16)}" text-anchor="middle">${esc(def[end])}</text>\n`;
    }
  }

  const cellCount = (key) => platforms.filter((p) => !p.octant.onBoundary && p.octant.key === key).length;
  const cells = CELLS.map((c) => {
    const q = at(c.corner);
    return `<text class="svg-cell" x="${n(q.x)}" y="${n(q.y)}" text-anchor="middle">${esc(c.name ?? '이름 미정')} · ${cellCount(c.key)}</text>`;
  }).join('\n');

  const placed = arrange(platforms, { ...DEFAULT_STATE, view: 'octant' });
  const dots = platforms
    .map((p) => {
      const { pos, off } = placed.get(p.id);
      const q = at(pos);
      return { p, x: q.x + off.dx * D, y: q.y + off.dy * D, depth: q.depth };
    })
    .sort((a, b) => a.depth - b.depth)
    .map(({ p, x, y }) => `<g class="svg-dot layer-${p.layer}"><circle cx="${n(x)}" cy="${n(y)}" r="${D / 2}"/><text x="${n(x)}" y="${n(y)}" dy="0.35em" text-anchor="middle">${esc(initials(p.name))}</text>${p.layer === 'grey' ? `<text class="svg-badge" x="${n(x + D * 0.42)}" y="${n(y - D * 0.3)}" text-anchor="middle">◐</text>` : ''}</g>`)
    .join('\n');

  return `<svg class="map-static" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="map-static-title">
<title id="map-static-title">8분면 정적 그림: 참여 × 독립 × 연대. 같은 내용은 아래 목록에 있다.</title>
<path class="svg-axis-line" d="${path(lines)}"/>
${cells}
${ends}
${dots}
</svg>`;
}

function mapBar() {
  const options = Object.entries(AXIS_DEFS)
    .map(([key, d]) => `<option value="${key}">${d.name} · ${esc(d.low)} ↔ ${esc(d.high)}</option>`).join('');
  const views = Object.entries(VIEWS)
    .map(([key, v]) => `<button type="button" class="chip" data-view="${key}" aria-pressed="${key === DEFAULT_STATE.view}">${v.name}</button>`).join('');
  const count = (pred) => platforms.filter(pred).length;
  const cats = CATEGORIES
    .map((c) => `<button type="button" class="chip chip-sm" data-cat="${c.key}" aria-pressed="false">${c.name} <span class="chip-n">${count((p) => categoriesOf(p).includes(c.key))}</span></button>`).join('');
  const subs = SUBCATEGORIES
    .map((s) => `<button type="button" class="chip chip-sm" data-sub="${s.key}" aria-pressed="false">${s.name} <span class="chip-n">${count((p) => p.subcategory === s.key)}</span></button>`).join('');
  // 보기 전환과 모아보기는 JS가 있어야 하므로 처음엔 숨겨 두고 지도 JS가 연다.
  // JS가 없으면 목록 위의 분류 앵커 링크가 모아보기를 대신한다 (build-guide 4-7)
  return `<div class="map-bar" id="map-bar" hidden>
    <div class="map-bar-group" role="group" aria-label="보기"><span class="label">보기</span>${views}</div>
    <div class="map-bar-group" data-for="slice line" hidden>
      <label class="axis-pick"><span class="label">가로</span><select name="x">${options}</select></label>
      <label class="axis-pick" data-for="slice" hidden><span class="label">세로</span><select name="y">${options}</select></label>
    </div>
    <div class="map-bar-group map-bar-row" role="group" aria-label="모아보기 (여러 개 고를 수 있음)"><span class="label">모아</span><button type="button" class="chip chip-sm" data-cat="" aria-pressed="true">전체 <span class="chip-n">${platforms.length}</span></button>${cats}</div>
    <div class="map-bar-group map-bar-row map-bar-sub" data-sub-row role="group" aria-label="창작 도구 하위 분류" hidden><span class="label">└ 창작 도구</span>${subs}</div>
  </div>`;
}

function mapSection() {
  return `<section class="map" aria-label="지도">
  ${mapBar()}
  <div class="map-stage" id="map-stage" tabindex="0" aria-label="지도. 8분면에서는 화살표 키로 돌리고, Tab으로 사례를 고른다.">
    ${octantSvg()}
    <div class="map-tools" hidden>
      <button type="button" class="btn" data-action="explore" aria-pressed="false" hidden>둘러보기</button>
      <button type="button" class="btn" data-action="rotate">회전 멈추기</button>
      <button type="button" class="btn" data-action="reset">정면에서 보기</button>
    </div>
    <a class="why-link" href="#why" data-action="why"><span class="why-i" aria-hidden="true">i</span>왜 이 세 축인가?</a>
  </div>
  <aside class="map-card" id="map-card" aria-label="사례 카드">
    <p class="map-card-empty label">아이콘에 마우스를 올리면 이름이, 누르면 사례 카드가 여기 열린다. 키보드로는 Tab으로 사례를 고르고 Enter로 연다.</p>
  </aside>
</section>`;
}

// "왜 이 세 축인가" (build-guide 4-4). 전체 글은 /about/에 둘 예정
function whySection() {
  return `<details class="why" id="why">
  <summary>왜 이 세 축인가?</summary>
  <div class="why-body">
    <p>지도는 다섯 개의 질문에서 출발한다. 누가 소유하고 결정하는가, 어떻게 돈을 버는가, 코드와 콘텐츠가 얼마나 열려 있는가, 무엇에 맞서는가, 사용자는 참여자인가 소비자인가. 8분면은 그중 사람과 돈과 바깥 세계에 관한 것을 세 축으로 묶었다. 개방성은 사례 페이지의 다섯 축에서 함께 본다.</p>
    <dl class="facts">
      <div><dt>재귀적 공중 (참여) →</dt><dd>쓰는 사람인가, 함께 고치고 결정하는 사람인가. <span class="label">0 사용만 한다 · 1 피드백과 버그 신고 · 2 기여가 실제로 반영된다 · 3 운영과 방향 결정에 참여한다</span></dd></div>
      <div><dt>자본으로부터의 독립 ↗</dt><dd>기업의 것인가, 공동의 것인가. 소유와 재정 점수의 평균이다. <span class="label">소유: 0 대기업 · 1 독립 영리 기업 · 2 커뮤니티·콜렉티브 · 3 재단·협동조합 / 재정: 0 광고·투자 회수·회사 정책 · 1 판매·수수료 · 2 구독·원하는 만큼 내기 · 3 기부·개발 기금</span></dd></div>
      <div><dt>연대 감각 ↑</dt><dd>도구 안에 머무는가, 세계와 함께하는가. 창작 도구 바깥의 의제와 연대하는지를 본다. 말보다 행동의 증거로 본다. <span class="label">0 도구에만 집중하거나 근거를 못 찾음 · 1 가치를 밝힌다 · 2 행동으로 연대한다 · 3 연대가 정체성의 일부</span></dd></div>
      <div><dt>단면과 한 줄</dt><dd>같은 사례를 두 축(단면)이나 한 축(한 줄)으로 눌러 펴서 본다. 여기서는 소유·재정·개방까지 여섯 축 중 아무것이나 고를 수 있다. 축을 바꾸면 같은 사례가 다른 자리로 옮겨 간다.</dd></div>
      <div><dt>여덟 칸</dt><dd>세 축을 1.5에서 잘라 여덟 칸을 만든다. 칸 이름은 가설이고, 빈 칸도 숨기지 않는다. 독립이 정확히 1.5인 사례는 칸의 경계 위에 놓인다.</dd></div>
      <div><dt>세 개의 층</dt><dd>◐ 회색지대는 기준을 충족하지만 긴장이나 모순이 있는 사례, 점선 원판과 <span class="pill">대조</span>는 기준을 충족하지 않지만 비교를 위해 둔 사례다.</dd></div>
    </dl>
    <p class="label">점수는 판정이 아니라 관점이며, 지금 값은 검토 중인 초안이다.</p>
  </div>
</details>`;
}

function indexPage() {
  const count = (layer) => platforms.filter((p) => p.layer === layer).length;
  const body = `${mapSection()}
<section class="intro">
  <h1>구름 너머의 창작 플랫폼</h1>
  <p>창작자가 작업물과 데이터를 지키며 쓸 수 있는 구름 너머의 창작 플랫폼 ${platforms.length}개. 누가 소유하는가, 어떻게 돈을 버는가, 얼마나 열려 있는가, 사용자는 참여하는가, 무엇과 연대하는가를 0~3 점수로 읽는다.</p>
  ${whySection()}
</section>
<section aria-labelledby="list-title">
  <div class="list-head">
    <h2 id="list-title">목록</h2>
    <span class="label" id="list-count">${platforms.length}개 · 사례 ${count('case')} · 회색지대 ${count('grey')} · 대조 ${count('contrast')}</span>
  </div>
  ${listGroups()}
  <div class="legend">
    <span class="label">◐ 회색지대: 기준을 충족하지만 긴장이나 모순이 있음</span>
    <span class="label"><span class="pill">대조</span> 점선 원판: 비교를 위해 둔 대조 사례</span>
    <span class="label">참여·독립·연대 0~3, 독립 = (소유 + 재정) ÷ 2, 칸의 경계 = 1.5</span>
  </div>
</section>`;
  return page({
    title: 'Outer Maps: 창의적 구름, 그 너머를 상상하는 대안적 플랫폼 지도',
    description: `구름 너머의 창작 플랫폼 ${platforms.length}개를 소유·재정·개방·참여·연대 다섯 축으로 읽는 지도.`,
    base: '',
    body,
    head: MAP_SCRIPTS,
  });
}

// ── 사례 페이지 ────────────────────────────────────

function fact(label, html) {
  if (!html) return '';
  return `<div><dt>${label}</dt><dd>${html}</dd></div>`;
}

function link(url, text = url) {
  return `<a href="${esc(url)}" rel="noopener">${esc(text)}</a>`;
}

function relationsOf(p, base) {
  const rows = relations.filter((r) => r.source === p.id || r.target === p.id);
  if (!rows.length) return '<p>기록된 관계가 아직 없다.</p>';
  const nameLink = (id) => platformIds.has(id) && id !== p.id
    ? `<a href="${base}acf/${id}/index.html">${esc(nameOf(id))}</a>`
    : esc(nameOf(id));
  const items = rows.map((r) =>
    `<li><span class="label rel-type">${RELATION[r.type]}</span> ${nameLink(r.source)} → ${nameLink(r.target)}${r.note ? ` <span class="label">· ${esc(r.note)}</span>` : ''}</li>`);
  return `<ul class="plain-list">\n${items.join('\n')}\n</ul>`;
}

function solidaritySection(p) {
  const s = p.solidarity;
  if (!s) return '<p>연대 근거 기록이 아직 없다.</p>';
  const notFound = s.confidence === '낮음' && p.score_solidarity === 0;
  const sources = splitList(s.source_solidarity);
  return `<dl class="facts">
  ${fact('연대 점수', `${p.score_solidarity} / 3${notFound ? ' · <strong>근거를 못 찾음</strong> (없음이 확인된 것은 아니다)' : ''}`)}
  ${fact('확신도', esc(s.confidence))}
  ${fact('근거', val(s.evidence))}
  ${fact('한계·모순', val(s.tension))}
  ${fact('출처', sources.length ? `<ul class="plain-list sources">${sources.map((u) => `<li>${link(u)}</li>`).join('')}</ul>` : '')}
</dl>`;
}

// 소개 줄글: 빈 칸은 소제목째 생략한다
const DESCRIPTION_PARTS = [
  { key: 'intro', ko: '무엇을 위한 곳인가' },
  { key: 'history', ko: '역사' },
  { key: 'now', ko: '지금은 어떻게 운영되나' },
  { key: 'events', ko: '주요 사건' },
  { key: 'relations', ko: '다른 플랫폼과의 관계' },
];

function descriptionSection(p) {
  const d = p.description;
  if (!d) return '';
  const parts = DESCRIPTION_PARTS.filter(({ key }) => d[key]).map(({ key, ko }) =>
    `<h3 class="label">${ko}</h3>\n    <p>${esc(d[key])}</p>`);
  const sources = splitList(d.sources);
  return `<section aria-labelledby="about" class="about">
    <h2 id="about">소개</h2>
    ${parts.join('\n    ')}
    ${sources.length ? `<p class="label">참고: ${sources.map((u) => link(u, host(u))).join(' · ')}${d.checked ? ` · ${esc(d.checked)} 확인` : ''}</p>` : ''}
  </section>`;
}

function casePage(p) {
  const base = '../../';
  const counterparts = p.cloud_counterparts.map(nameOf).map(esc).join(', ');
  const basis = p.license_family === 'proprietary' ? FREEDOM_BASIS.proprietary
    : p.license_family === 'unknown' || !p.license_family ? FREEDOM_BASIS.unknown
    : FREEDOM_BASIS.free;
  const license = p.license
    ? `${val(p.license)}${p.license_family ? ` <span class="label">· ${LICENSE_FAMILY[p.license_family]}</span>` : ''}<br><span class="label">${basis}</span>`
    : '';
  const owner = p.owner
    ? `${esc(p.owner)}${p.ownership_type ? ` <span class="label">· ${OWNERSHIP[p.ownership_type]}</span>` : ''}`
    : '';
  const layerPill = p.layer === 'case' ? ''
    : p.layer === 'grey' ? '<span class="pill pill-outline"><span aria-hidden="true">◐</span> 회색지대</span>'
    : '<span class="pill">대조</span>';

  const body = `<nav class="crumbs" aria-label="경로"><a href="${base}index.html">← 목록</a></nav>
<article class="case layer-${p.layer}">
  <header class="case-head">
    <div class="card-top"><span class="label">${esc(categoryText(p))} · ${KIND[p.kind] ?? ''}</span>${layerPill}</div>
    <div class="case-title">
      ${disc(p, base, 'disc disc-lg')}
      <div>
        <h1 class="case-name display-en">${esc(p.name)}</h1>
        <p class="case-ko">${val(p.domain)}</p>
      </div>
    </div>
    <p class="label">칸: ${esc(octantLabel(p.octant))}<br>${threeAxes(p)}</p>
  </header>

  ${descriptionSection(p)}

  <section aria-labelledby="axes">
    <h2 id="axes">다섯 축</h2>
    ${glyph(p)}
  </section>

  <section aria-labelledby="who">
    <h2 id="who">누가, 어떻게</h2>
    <dl class="facts">
      ${fact('운영 주체', owner)}
      ${fact('라이선스', license)}
      ${fact('재정', val(p.funding))}
      ${fact('무엇에 맞서는가', val(p.alt_target))}
      ${fact('구름 속 대응', counterparts)}
      ${fact('진 v0.1', p.zine_pick === 'yes' ? '대표 사례로 실림' : '')}
    </dl>
  </section>

  <section aria-labelledby="sustain">
    <h2 id="sustain">지속 가능성과 한계</h2>
    <dl class="facts">
      ${fact('층', `${LAYER[p.layer].ko} <span class="label">· ${LAYER[p.layer].about}</span>`)}
      ${fact('현재 상태', val(p.status))}
      ${fact('메모', val(p.note))}
    </dl>
  </section>

  <section aria-labelledby="solidarity">
    <h2 id="solidarity">연대 근거</h2>
    ${solidaritySection(p)}
  </section>

  <section aria-labelledby="relations">
    <h2 id="relations">관계</h2>
    ${relationsOf(p, base)}
  </section>

  <section aria-labelledby="sources">
    <h2 id="sources">출처</h2>
    <dl class="facts sources">
      ${fact('공식 사이트', p.url ? link(p.url, host(p.url)) : '')}
      ${fact('사실 확인', p.source ? link(p.source) : '<span class="label">기록 없음</span>')}
    </dl>
  </section>

  <section>
    <a class="to-map" href="${base}index.html#focus=${p.id}">지도에서 보기</a>
  </section>
</article>`;

  return page({
    title: `${p.name} · Outer Maps`,
    description: `${p.name}: ${p.domain}. ${fiveAxesText(p)}.`,
    base,
    body,
  });
}

// ── 서체 ───────────────────────────────────────────

// Pretendard: npm 패키지의 공식 동적 서브셋을 쓰는 굵기만 골라 자체 호스팅 (design-guide 2-3, 2-5)
const PRETENDARD_WEIGHTS = ['200', '400', '700'];

async function copyPretendard() {
  const pkg = join(ROOT, 'node_modules', 'pretendard');
  const staticDir = join(pkg, 'dist', 'web', 'static');
  const cssPath = join(staticDir, 'pretendard-dynamic-subset.css');
  if (!existsSync(cssPath)) {
    warnings.push('Pretendard 없음: npm install 후 다시 빌드 (지금은 시스템 서체로 대체)');
    return '';
  }
  const css = await readFile(cssPath, 'utf8');
  const faces = css.match(/@font-face\s*{[^}]*}/g) ?? [];
  const outDir = join(OUT, 'fonts', 'pretendard');
  const kept = [];
  for (const face of faces) {
    if (!PRETENDARD_WEIGHTS.includes(face.match(/font-weight:\s*(\d+)/)?.[1])) continue;
    // woff 대체본은 버리고 woff2만 싣는다 (용량 절반)
    const rel = face.match(/url\(\s*['"]?(?:\.\/)?(woff2-dynamic-subset\/[^'")]+)['"]?\s*\)/)?.[1];
    if (!rel) continue;
    const to = join(outDir, rel);
    await mkdir(dirname(to), { recursive: true });
    await cp(join(staticDir, rel), to);
    kept.push(face.replace(/src:[^;]+;/, `src: url(pretendard/${rel}) format('woff2');`));
  }
  await cp(join(pkg, 'dist', 'LICENSE.txt'), join(outDir, 'LICENSE.txt'));
  return `/* Pretendard ${PRETENDARD_WEIGHTS.join('·')} — Copyright (c) 2021 Kil Hyung-jin, SIL OFL 1.1. 라이선스: pretendard/LICENSE.txt */\n${kept.join('\n')}\n`;
}

// Velvelyne: 사람이 src/fonts/velvelyne/에 패키지 전체를 넣었을 때만 싣는다 (CUTE 라이선스, design-guide 2-3·2-4)
const VELVELYNE_FACES = [['Light', 300], ['Regular', 400]];

async function copyVelvelyne() {
  const src = join(SRC, 'fonts', 'velvelyne');
  if (!existsSync(join(src, 'fonts', 'woff2'))) {
    warnings.push('Velvelyne 없음 (src/fonts/velvelyne/): Pretendard 200으로 대체');
    return '';
  }
  await cp(src, join(OUT, 'fonts', 'velvelyne'), { recursive: true });
  const faces = VELVELYNE_FACES.map(([style, weight]) =>
    `@font-face{font-family:"Velvelyne";src:url(velvelyne/fonts/woff2/Velvelyne-${style}.woff2) format("woff2");font-weight:${weight};font-display:swap}`);
  return `/* Velvelyne (CUTE 라이선스), Velvetyne. 라이선스 문서와 FONTLOG는 velvelyne/에 */\n${faces.join('\n')}\n`;
}

// ── 쓰기 ───────────────────────────────────────────

async function write(rel, content) {
  const to = join(OUT, rel);
  await mkdir(dirname(to), { recursive: true });
  await writeFile(to, content, 'utf8');
}

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const fontsCss = (await copyPretendard()) + (await copyVelvelyne());
await write('fonts/fonts.css', fontsCss);
await cp(join(SRC, 'css'), join(OUT, 'css'), { recursive: true });
// 지도 JS: 한 줄 주석과 들여쓰기만 덜어 낸다 (번들러 없이 용량 줄이기). 원본은 src/js/에서 읽는다
let jsBytes = 0;
for (const name of await readdir(join(SRC, 'js', 'map'))) {
  const code = (await readFile(join(SRC, 'js', 'map', name), 'utf8'))
    .split('\n')
    .filter((line) => !/^\s*\/\//.test(line) && line.trim() !== '')
    .map((line) => line.trimStart())
    .join('\n');
  jsBytes += Buffer.byteLength(code);
  await write(`js/map/${name}`, code);
}
if (jsBytes > 30 * 1024) warnings.push(`지도 JS ${(jsBytes / 1024).toFixed(1)}KB: 목표 30KB 초과 (build-guide 4-6)`);
await cp(join(SRC, 'vendor'), join(OUT, 'vendor'), { recursive: true });
if (existsSync(join(SRC, 'icons'))) await cp(join(SRC, 'icons'), join(OUT, 'icons'), { recursive: true });

await write('index.html', indexPage());
for (const p of platforms) {
  await write(`acf/${p.id}/index.html`, casePage(p));
  // 지도 카드는 카드를 열 때 이 사례의 소개 줄글만 따로 불러온다 (data.json을 가볍게)
  if (p.description) {
    const d = p.description;
    await write(`acf/${p.id}/description.json`, JSON.stringify({
      ...Object.fromEntries(DESCRIPTION_PARTS.map(({ key }) => [key, d[key] ?? ''])),
      sources: splitList(d.sources ?? ''),
      checked: d.checked ?? '',
    }));
  }
}

await write('data.json', JSON.stringify({
  version: VERSION,
  axes: AXES,
  labels: {
    kind: KIND,
    licenseFamily: LICENSE_FAMILY,
    ownership: OWNERSHIP,
    layer: Object.fromEntries(Object.entries(LAYER).map(([k, v]) => [k, v.ko])),
  },
  platforms: platforms.map(({ description, ...rest }) => rest), // 소개 줄글은 사례 페이지에만 (지도 JSON을 가볍게)
  nodes,
  relations,
}, null, 2));

const pages = (await readdir(join(OUT, 'acf'))).length;
console.log(`site/ 빌드 완료: 목록 1 + 사례 ${pages} + data.json`);
for (const w of warnings) console.log(`  ! ${w}`);
