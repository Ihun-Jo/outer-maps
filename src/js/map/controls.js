// 지도 조작: 보기 전환·축 고르기, 모아보기 칩, 버튼(둘러보기·회전·정면), 키보드, 아이콘마다 하나씩 겹쳐 둔
// 보이지 않는 포커스 버튼, 호버 말풍선,
// URL 해시(#view=slice&x=community&y=solidarity&filter=tool,sale&sub=image&focus=krita).

import { AXIS_DEFS, VIEWS, DEFAULT_STATE, CATEGORIES, SUBCATEGORIES, matchesFilter, octantLabel } from './layouts.js';

const STEP = (10 * Math.PI) / 180;
const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export function bindControls({ stage, bar, map, card, data }) {
  const byId = new Map(data.platforms.map((p) => [p.id, p]));
  const tools = stage.querySelector('.map-tools');
  const exploreBtn = tools.querySelector('[data-action="explore"]');
  const rotateBtn = tools.querySelector('[data-action="rotate"]');
  const resetBtn = tools.querySelector('[data-action="reset"]');
  let selected = null;
  let filter = { cats: [], subs: [] };

  const listOf = (q, keys) => (q ?? '').split(',').filter((k) => keys.some((c) => c.key === k));

  // ── URL 해시: 보기 상태는 공유와 뒤로 가기를 위해 남긴다 (build-guide 4-2) ──
  function readHash() {
    const q = new URLSearchParams(location.hash.slice(1));
    const st = { ...DEFAULT_STATE };
    if (VIEWS[q.get('view')]) st.view = q.get('view');
    if (AXIS_DEFS[q.get('x')]) st.x = q.get('x');
    if (AXIS_DEFS[q.get('y')]) st.y = q.get('y');
    if (st.x === st.y) st.y = st.x === DEFAULT_STATE.y ? DEFAULT_STATE.x : DEFAULT_STATE.y;
    const cats = listOf(q.get('filter'), CATEGORIES);
    const subs = cats.includes('tool') ? listOf(q.get('sub'), SUBCATEGORIES) : [];
    return { st, filter: { cats, subs }, focus: byId.has(q.get('focus')) ? q.get('focus') : null };
  }

  function writeHash({ push = false } = {}) {
    const st = map.state();
    const q = new URLSearchParams();
    if (st.view !== 'octant') {
      q.set('view', st.view);
      q.set('x', st.x);
      if (st.view === 'slice') q.set('y', st.y);
    }
    if (filter.cats.length) q.set('filter', filter.cats.join(','));
    if (filter.subs.length) q.set('sub', filter.subs.join(','));
    if (selected) q.set('focus', selected);
    const hash = q.toString().replace(/%2C/g, ',');  // filter=tool,sale 처럼 읽히게
    const url = hash ? `#${hash}` : location.pathname + location.search;
    if (url === (location.hash || location.pathname + location.search)) return;
    history[push ? 'pushState' : 'replaceState'](null, '', url);
  }

  // ── 고르기 ──
  function select(id, { focus = false, write = true } = {}) {
    const p = id ? byId.get(id) : null;
    if (!p) return deselect();
    selected = p.id;
    map.setSelected(p.id);
    card.open(p, { focus });
    tip.hidden = true;
    // 모바일 시트가 고른 아이콘을 가리지 않도록, 아이콘이 화면 위쪽 1/4에 오게 스크롤한다
    if (card.isSheet()) {
      const y = stage.getBoundingClientRect().top + window.scrollY + map.screenOf(p.id).y;
      window.scrollTo({ top: Math.max(0, y - innerHeight * 0.25), behavior: map.reducedMotion() ? 'auto' : 'smooth' });
    }
    if (write) writeHash();
  }

  function deselect({ restoreFocus = false, write = true } = {}) {
    const was = selected;
    selected = null;
    map.setSelected(null);
    card.close();
    if (exploreBtn.getAttribute('aria-pressed') === 'true') setExplore(false);  // 카드를 닫으면 둘러보기도 끈다
    if (write) writeHash();
    if (restoreFocus && was) focusButtons.get(was)?.focus();
  }

  map.on('select', (id) => (id ? select(id) : deselect()));
  map.on('hover', (id) => {
    map.setHover(id);
    showTip(id);
  });
  map.on('interact', () => { tip.hidden = true; });

  // ── 보기 전환과 축 고르기 ──
  const viewButtons = [...bar.querySelectorAll('[data-view]')];
  const pickX = bar.querySelector('select[name="x"]');
  const pickY = bar.querySelector('select[name="y"]');

  function syncBar(st) {
    for (const b of viewButtons) b.setAttribute('aria-pressed', String(b.dataset.view === st.view));
    for (const el of bar.querySelectorAll('[data-for]')) el.hidden = !el.dataset.for.split(' ').includes(st.view);
    pickX.value = st.x;
    pickY.value = st.y;
    // 같은 축을 가로·세로에 함께 고를 수 없다
    for (const o of pickY.options) o.disabled = o.value === st.x;
    for (const o of pickX.options) o.disabled = st.view === 'slice' && o.value === st.y;
    const octant = st.view === 'octant';
    exploreBtn.hidden = !octant || !map.coarse;
    rotateBtn.hidden = !octant || map.reducedMotion();
    resetBtn.hidden = !octant;
    stage.dataset.view = st.view;
  }

  function changeView(next) {
    tip.hidden = true;
    map.setView(next);
    syncBar(map.state());
    writeHash({ push: true });
  }

  for (const b of viewButtons) b.addEventListener('click', () => changeView({ view: b.dataset.view }));
  pickX.addEventListener('change', () => changeView({ x: pickX.value }));
  pickY.addEventListener('change', () => changeView({ y: pickY.value }));
  map.on('viewChanged', () => { if (selected) map.setSelected(selected); });

  // ── 모아보기: 지도와 아래 목록에 함께 반영한다 ──
  const catChips = [...bar.querySelectorAll('[data-cat]')];
  const subChips = [...bar.querySelectorAll('[data-sub]')];
  const subRow = bar.querySelector('[data-sub-row]');
  const listItems = [...document.querySelectorAll('.list-group li[data-id]')];
  const listCount = document.getElementById('list-count');
  const listCountAll = listCount?.textContent;
  document.querySelector('.list-nav')?.setAttribute('hidden', '');  // 칩이 앵커 링크를 대신한다

  const sameList = (a, b) => a.length === b.length && a.every((k) => b.includes(k));

  function setFilter(next, { write = true } = {}) {
    filter = { cats: next.cats, subs: next.cats.includes('tool') ? next.subs : [] };
    const ids = filter.cats.length
      ? new Set(data.platforms.filter((p) => matchesFilter(p, filter)).map((p) => p.id))
      : null;
    const shows = (id) => !ids || ids.has(id);
    map.setFilter(ids);

    for (const b of catChips) b.setAttribute('aria-pressed', String(b.dataset.cat ? filter.cats.includes(b.dataset.cat) : !filter.cats.length));
    for (const b of subChips) b.setAttribute('aria-pressed', String(filter.subs.includes(b.dataset.sub)));
    subRow.hidden = !filter.cats.includes('tool');
    // 빠진 아이콘은 고를 수 없으므로 키보드 순서에서도 뺀다
    for (const [id, b] of focusButtons) b.hidden = !shows(id);

    // 목록: 빠진 사례를 숨기고, 비는 소제목과 분류도 숨긴다
    for (const li of listItems) li.hidden = !shows(li.dataset.id);
    for (const li of document.querySelectorAll('.list-group .grid-sub')) {
      let n = li.nextElementSibling, any = false;
      while (n && !n.classList.contains('grid-sub')) { if (!n.hidden) any = true; n = n.nextElementSibling; }
      li.hidden = !any;
    }
    for (const g of document.querySelectorAll('.list-group')) g.hidden = !g.querySelector('li[data-id]:not([hidden])');
    if (listCount) listCount.textContent = ids ? `모아보기 ${ids.size}개 · 전체 ${data.platforms.length}개` : listCountAll;

    if (selected && !shows(selected)) deselect({ write: false });
    if (write) writeHash({ push: true });
  }

  const toggle = (list, key) => (list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);
  for (const b of catChips) {
    b.addEventListener('click', () => {
      const key = b.dataset.cat;
      setFilter(key ? { cats: toggle(filter.cats, key), subs: filter.subs } : { cats: [], subs: [] });
    });
  }
  for (const b of subChips) b.addEventListener('click', () => setFilter({ cats: filter.cats, subs: toggle(filter.subs, b.dataset.sub) }));

  // ── 호버 말풍선 (데스크톱) ──
  const tip = document.createElement('div');
  tip.className = 'map-tip';
  tip.hidden = true;
  stage.append(tip);

  function showTip(id) {
    const p = id && byId.get(id);
    if (!p || id === selected) { tip.hidden = true; return; }
    const s = map.screenOf(id);
    tip.innerHTML = `<span class="map-tip-name display-en">${p.name}</span><span class="label">${p.domain} · 참여 ${fmt(p.octant.x)} · 독립 ${fmt(p.octant.y)} · 연대 ${fmt(p.octant.z)}</span>`;
    tip.style.translate = `${Math.round(s.x)}px ${Math.round(s.y)}px`;
    tip.hidden = false;
  }

  // ── 키보드: 아이콘 위에 보이지 않는 버튼을 겹쳐 Tab으로 고른다 ──
  const layer = document.createElement('div');
  layer.className = 'map-focus';
  const focusButtons = new Map();
  for (const p of data.platforms) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'map-focus-btn';
    const layerNote = p.layer === 'grey' ? ', 회색지대' : p.layer === 'contrast' ? ', 대조 사례' : '';
    b.setAttribute('aria-label', `${p.name}${layerNote}. 참여 ${fmt(p.octant.x)}, 독립 ${fmt(p.octant.y)}, 연대 ${fmt(p.octant.z)}. ${octantLabel(p.octant)}`);
    b.addEventListener('click', () => select(p.id, { focus: true }));
    b.addEventListener('focus', () => map.setHover(p.id));
    b.addEventListener('blur', () => map.setHover(null));
    layer.append(b);
    focusButtons.set(p.id, b);
  }
  stage.querySelector('.map-labels').after(layer);

  map.on('render', () => {
    for (const [id, b] of focusButtons) {
      const s = map.screenOf(id);
      b.style.translate = `${Math.round(s.x)}px ${Math.round(s.y)}px`;
    }
  });

  stage.addEventListener('keydown', (e) => {
    const turn = { ArrowLeft: [-STEP, 0], ArrowRight: [STEP, 0], ArrowUp: [0, -STEP], ArrowDown: [0, STEP] }[e.key];
    if (turn && map.state().view === 'octant' && !e.target.closest('.map-tools')) {
      e.preventDefault();
      map.rotateBy(...turn);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && selected) deselect({ restoreFocus: true });
  });

  // 모바일: 시트 바깥(지도 밖)을 누르면 닫는다. 지도 위 빈 곳은 scene의 select(null)이 처리한다
  document.addEventListener('pointerdown', (e) => {
    if (!selected || !card.isSheet()) return;
    if (e.target.closest('.map-card, .map-stage, .map-bar')) return;
    deselect();
  });

  // ── 버튼 ──
  tools.hidden = false;
  bar.hidden = false;

  function setExplore(on) {
    exploreBtn.setAttribute('aria-pressed', String(on));
    exploreBtn.textContent = on ? '둘러보기 끄기' : '둘러보기';
    map.setExplore(on);
  }
  exploreBtn.addEventListener('click', () => setExplore(exploreBtn.getAttribute('aria-pressed') !== 'true'));

  let paused = false;
  rotateBtn.addEventListener('click', () => {
    paused = !paused;
    rotateBtn.textContent = paused ? '다시 돌리기' : '회전 멈추기';
    map.setPaused(paused);
  });
  resetBtn.addEventListener('click', () => map.resetView());

  // 축 끝 라벨과 ⓘ는 "왜 이 세 축인가"를 연다
  const why = document.getElementById('why');
  const openWhy = (e) => {
    e?.preventDefault();
    why.open = true;
    why.scrollIntoView({ behavior: map.reducedMotion() ? 'auto' : 'smooth', block: 'start' });
    why.querySelector('summary').focus({ preventScroll: true });
  };
  stage.querySelector('[data-action="why"]').addEventListener('click', openWhy);
  map.on('why', openWhy);

  // ── 해시에서 상태 읽기: 처음 들어올 때, 뒤로 가기, 사례 페이지의 "지도에서 보기"(/#focus=id) ──
  function fromHash({ instant = false } = {}) {
    const { st, filter: f, focus } = readHash();
    const cur = map.state();
    if (st.view !== cur.view || st.x !== cur.x || st.y !== cur.y) map.setView(st, { instant });
    syncBar(map.state());
    if (instant || !sameList(f.cats, filter.cats) || !sameList(f.subs, filter.subs)) setFilter(f, { write: false });
    if (focus && focus !== selected) select(focus, { write: false });
    else if (!focus && selected) deselect({ write: false });
  }
  window.addEventListener('popstate', () => fromHash());
  window.addEventListener('hashchange', () => fromHash());
  fromHash({ instant: true });

  return { deselect: () => deselect({ restoreFocus: true }) };
}
