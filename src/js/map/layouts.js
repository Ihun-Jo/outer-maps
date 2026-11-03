// 보기별 배치 계산. three.js에 기대지 않는 순수 함수라서
// 빌드(정적 SVG, 목록의 칸 이름)와 지도 JS가 같은 계산을 쓴다.

export const MAX = 3;
export const CENTER = 1.5;

// 처음 보는 각도. 시안 v0.1은 yaw 38°였지만, 그 각도에서는 대조 사례(Cavalry)가
// 화면에서 사례 무리와 겹쳐 보여서 반대쪽(−38°)에서 본다
export const VIEW = { yaw: -38, pitch: 22 };

// 축: 이름과 양 끝의 대조되는 기준 (docs/scoring.md 2·3장)
export const AXIS_DEFS = {
  community:    { name: '재귀적 공중',          low: '쓰는 사람',      high: '고치는 사람',     value: (p) => p.score_community },
  independence: { name: '자본으로부터의 독립', low: '기업의 것',      high: '공동의 것',       value: (p) => (p.score_ownership + p.score_funding) / 2 },
  solidarity:   { name: '연대 감각',            low: '도구 안',        high: '세계와 함께',     value: (p) => p.score_solidarity },
  ownership:    { name: '소유', low: '대기업',         high: '재단·협동조합',   value: (p) => p.score_ownership },
  funding:      { name: '재정', low: '광고·투자 회수', high: '기부·개발 기금',  value: (p) => p.score_funding },
  openness:     { name: '개방', low: '독점',           high: '강한 카피레프트', value: (p) => p.score_openness },
};

// 8분면의 세 축: x 참여(오른쪽), y 독립(깊이), z 연대(위)
export const OCTANT_AXES = { x: 'community', y: 'independence', z: 'solidarity' };

// 8분면 칸 이름 (docs/scoring.md 3장). 키 순서는 참여·독립·연대, h 높음 / l 낮음.
// 나머지 네 칸은 실제 배치를 보고 정한다.
export const OCTANT_NAMES = {
  hhh: '운동하는 공유지',
  hhl: '조용한 공유지',
  llh: '가치를 내건 가게',
  lll: '무료지만 자유롭지 않은',
};

export function octantPoint(p) {
  return {
    x: AXIS_DEFS[OCTANT_AXES.x].value(p),
    y: AXIS_DEFS[OCTANT_AXES.y].value(p),
    z: AXIS_DEFS[OCTANT_AXES.z].value(p),
  };
}

const side = (v) => (v > CENTER ? 'h' : v < CENTER ? 'l' : 'm');

export function octantOf({ x, y, z }) {
  const key = side(x) + side(y) + side(z);
  const arrow = (s) => ({ h: '↑', l: '↓', m: '=' })[s];
  const where = `참여${arrow(key[0])} 독립${arrow(key[1])} 연대${arrow(key[2])}`;
  const onBoundary = key.includes('m');
  return { key, where, onBoundary, name: onBoundary ? null : OCTANT_NAMES[key] ?? null };
}

export function octantLabel(o) {
  if (o.onBoundary) return `칸 경계 위 · ${o.where}`;
  return `${o.name ?? '이름 미정 칸'} · ${o.where}`;
}

// 장면 좌표: x 오른쪽(X), z 위(Y), y 깊이(Z). 중심 1.5가 원점.
export function toWorld({ x, y, z }) {
  return [x - CENTER, z - CENTER, y - CENTER];
}

// 여덟 칸. 꼭짓점(corner)은 칸 이름을 붙일 자리다.
export const CELLS = ['h', 'l'].flatMap((a) => ['h', 'l'].flatMap((b) => ['h', 'l'].map((c) => {
  const end = (s) => (s === 'h' ? MAX : 0);
  return { key: a + b + c, corner: { x: end(a), y: end(b), z: end(c) }, name: OCTANT_NAMES[a + b + c] ?? null };
})));

// ── 축 (큐브 대신 중심을 지나는 축 세 개) ──

export const AXIS_OVERHANG = 0.3;  // 축선이 0과 3 바깥으로 나가는 길이
export const LABEL_GAP = 1.1;      // 축 끝에서 라벨까지 (아이콘 무리와 겹치지 않게 넉넉히)

// 한 축을 이루는 선과 눈금. along: 'x' | 'y' | 'z', at: 나머지 두 좌표의 값, tick: 눈금이 뻗는 방향
export function axisGeometry(along, at, tick) {
  const point = (t, extra = {}) => ({ ...at, [along]: t, ...extra });
  const line = [point(-AXIS_OVERHANG), point(MAX + AXIS_OVERHANG)];
  const ticks = [];
  for (let i = 0; i <= MAX * 2; i++) {
    const t = i / 2;
    const len = Number.isInteger(t) ? 0.09 : 0.05;
    ticks.push([point(t, { [tick]: at[tick] - len }), point(t, { [tick]: at[tick] + len })]);
  }
  return {
    line, ticks,
    low: point(-AXIS_OVERHANG - LABEL_GAP),
    high: point(MAX + AXIS_OVERHANG + LABEL_GAP),
    tickAt: (t) => point(t),
  };
}

// ── 분류 (CLAUDE.md platforms.csv의 category, subcategory) ──

export const CATEGORIES = [
  { key: 'tool', name: '창작 도구' },
  { key: 'sale', name: '판매·유통' },
  { key: 'archive', name: '아카이빙·큐레이션' },
  { key: 'social', name: '공유·연결' },
  { key: 'publishing', name: '웹 출판·호스팅' },
  { key: 'type', name: '자원 배포(서체)' },
];
export const SUBCATEGORIES = [
  { key: 'image', name: '이미지' },
  { key: 'video', name: '영상' },
  { key: 'animation', name: '애니메이션' },
  { key: 'audio', name: '사운드' },
  { key: '3d-game', name: '3D·게임' },
  { key: 'design-publishing', name: '디자인·출판' },
];
export const categoryName = (key) => CATEGORIES.find((c) => c.key === key)?.name ?? key;
export const subcategoryName = (key) => SUBCATEGORIES.find((s) => s.key === key)?.name ?? key;

export function categoriesOf(p) {
  return String(p.category ?? '').split(';').map((s) => s.trim()).filter(Boolean);
}

// 모아보기: 고른 분류 중 하나에 들면 남는다. 창작 도구 하위를 고르면 그 하위만.
// 아무것도 안 고르면 전체.
export function matchesFilter(p, { cats = [], subs = [] }) {
  if (!cats.length) return true;
  const mine = categoriesOf(p);
  return cats.some((c) => mine.includes(c) && (c !== 'tool' || !subs.length || subs.includes(p.subcategory)));
}

// 분류 보기의 구획: 창작 도구는 하위 분류마다, 나머지는 분류마다 하나.
// 분류가 여럿인 사례는 첫 분류의 구획에 놓는다 (아이콘은 하나뿐이므로).
export function categoryBlocks(platforms) {
  const primary = (p) => categoriesOf(p)[0];
  const byName = (a, b) => a.name.localeCompare(b.name, 'en');
  const blocks = [];
  for (const s of SUBCATEGORIES) {
    blocks.push({ key: `tool/${s.key}`, cat: 'tool', sub: s.key, title: categoryName('tool'), subtitle: s.name,
      items: platforms.filter((p) => primary(p) === 'tool' && p.subcategory === s.key).sort(byName) });
  }
  blocks.push({ key: 'tool/', cat: 'tool', sub: '', title: categoryName('tool'), subtitle: '기타',
    items: platforms.filter((p) => primary(p) === 'tool' && !SUBCATEGORIES.some((s) => s.key === p.subcategory)).sort(byName) });
  for (const c of CATEGORIES.slice(1)) {
    blocks.push({ key: c.key, cat: c.key, sub: '', title: c.name, subtitle: '',
      items: platforms.filter((p) => primary(p) === c.key).sort(byName) });
  }
  return blocks.filter((b) => b.items.length);
}

// 구획을 왼쪽에서 오른쪽으로 놓고 maxWidth를 넘으면 다음 줄로. 단위는 아이콘 한 칸.
// 구획 폭은 모두 같게(세 칸) 해서 이름 알약이 옆 구획으로 넘치지 않고, 아이콘은 가운데로 모은다
const BLOCK = { pad: 0.2, head: 0.75, gap: 0.4, cols: 3 };
export function categoryLayout(platforms, maxWidth) {
  const blocks = categoryBlocks(platforms);
  const pos = new Map();
  let x = 0, y = 0, rowH = 0, width = 0;
  for (const b of blocks) {
    const n = b.items.length;
    const cols = Math.min(n, BLOCK.cols);
    const rows = Math.ceil(n / cols);
    const w = BLOCK.cols + BLOCK.pad * 2;
    const h = rows + BLOCK.head + BLOCK.pad;
    if (x > 0 && x + w > maxWidth) { x = 0; y += rowH + BLOCK.gap; rowH = 0; }
    b.rect = { x, y, w, h };
    b.items.forEach((p, i) => {
      const row = Math.floor(i / cols);
      const inRow = Math.min(cols, n - row * cols);
      pos.set(p.id, { cx: x + (w - inRow) / 2 + (i % cols) + 0.5, cy: y + BLOCK.head + row + 0.5 });
    });
    x += w + BLOCK.gap;
    width = Math.max(width, x - BLOCK.gap);
    rowH = Math.max(rowH, h);
  }
  return { blocks, pos, width, height: y + rowH };
}

// 분류 보기의 배치 좌표(가운데 정렬, 위가 +) → 8분면 좌표계
export function layoutToOctant({ cx, cy }, { width, height }) {
  return { x: cx - width / 2 + CENTER, y: CENTER, z: -(cy - height / 2) + CENTER };
}

// ── 보기 ──

export const VIEWS = {
  octant: { name: '8분면' },
  slice: { name: '단면' },
  line: { name: '한 줄' },
  category: { name: '분류' },
};
export const LINE_Z = 0.15;  // 한 줄 보기의 띠 높이 (위로 쌓는다)

export const DEFAULT_STATE = { view: 'octant', x: 'community', y: 'solidarity' };

// 보기 상태 → 각 사례의 좌표(8분면 좌표계)와 화면 기준 오프셋(원판 지름 단위)
export function arrange(platforms, state, { maxRows = 7, maxWidth = 14 } = {}) {
  const A = (key) => AXIS_DEFS[key].value;
  const out = new Map();
  if (state.view === 'category') {
    const layout = categoryLayout(platforms, maxWidth);
    for (const p of platforms) out.set(p.id, { pos: layoutToOctant(layout.pos.get(p.id), layout), off: { dx: 0, dy: 0 } });
    return out;
  }
  if (state.view === 'line') {
    const groups = groupBy(platforms, (p) => A(state.x)(p));
    for (const [, ps] of groups) {
      const cols = Math.ceil(ps.length / maxRows);
      ps.forEach((p, i) => {
        const col = Math.floor(i / maxRows), row = i % maxRows;
        out.set(p.id, {
          pos: { x: A(state.x)(p), y: CENTER, z: LINE_Z },
          off: { dx: (col - (cols - 1) / 2) * 1.06, dy: -(row + 0.75) * 1.06 },
        });
      });
    }
    return out;
  }
  const point = state.view === 'slice'
    ? (p) => ({ x: A(state.x)(p), y: CENTER, z: A(state.y)(p) })
    : (p) => (p.layer === 'contrast' ? pushOut(octantPoint(p)) : octantPoint(p));
  const groups = groupBy(platforms, (p) => { const o = point(p); return `${o.x}|${o.y}|${o.z}`; });
  for (const [, ps] of groups) {
    const offs = ring(ps.length);
    ps.forEach((p, i) => out.set(p.id, { pos: point(p), off: offs[i] }));
  }
  return out;
}

// 대조 사례(layer = contrast)는 포함 기준 밖이라, 8분면에서는 중심에서 바깥으로 더 밀어 내
// 사례 무리와 떨어져 보이게 한다. 표시만 바꾸고 점수(카드·단면·한 줄)는 그대로다
export const CONTRAST_PUSH = 1.4;
function pushOut(o) {
  const out = (v) => CENTER + (v - CENTER) * CONTRAST_PUSH;
  return { x: out(o.x), y: out(o.y), z: out(o.z) };
}

// 같은 키끼리 묶고 각 묶음 안은 id 순서로. 무작위 없음 → 새로 고쳐도 같은 자리
function groupBy(platforms, keyOf) {
  const groups = new Map();
  for (const p of platforms) {
    const k = keyOf(p);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(p);
  }
  for (const ps of groups.values()) ps.sort((a, b) => (a.id < b.id ? -1 : 1));
  return groups;
}

// 같은 좌표의 n개를 그 점 둘레의 원 위에 고르게
function ring(n) {
  const r = n > 1 ? Math.max(0.62, (n * 1.05) / (2 * Math.PI)) : 0;
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * 2 * Math.PI - Math.PI / 2;
    return { dx: Math.cos(a) * r, dy: Math.sin(a) * r };
  });
}

// 정적 SVG용 투영 (시안 Main.dc.html renderVals와 같은 계산). x 오른쪽, y 아래쪽, depth 클수록 앞.
export function project([X, Y, Z], { yaw, pitch } = VIEW) {
  const th = (yaw * Math.PI) / 180;
  const ph = (pitch * Math.PI) / 180;
  const x1 = X * Math.cos(th) - Z * Math.sin(th);
  const z1 = X * Math.sin(th) + Z * Math.cos(th);
  const y2 = Y * Math.cos(ph) - z1 * Math.sin(ph);
  const z2 = Y * Math.sin(ph) + z1 * Math.cos(ph);
  return { x: x1, y: -y2, depth: z2 };
}

// 아이콘이 없을 때 원판에 넣는 이니셜
export function initials(name) {
  return Array.from(name).slice(0, 2).join('');
}
