// three.js 장면: 축과 눈금, 축 끝 라벨(CSS2D), 아이콘 스프라이트, 보기 전환, 렌더 루프.
// 아이콘은 늘 정면을 보고(Sprite), 화면에서 크기가 일정하다(sizeAttenuation 끔).
// 보기가 바뀌면 아이콘은 같은 것이고 자리만 0.8초 동안 옮겨 간다 (build-guide 0장, 4-2).

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import {
  VIEW, MAX, CENTER, LINE_Z, AXIS_DEFS, OCTANT_AXES, CELLS, DEFAULT_STATE,
  toWorld, axisGeometry, arrange, categoryLayout, layoutToOctant, initials,
} from './layouts.js';

const DEG = Math.PI / 180;
const FOV = 30;
const SPRITE_RATIO = 1.4;   // 스프라이트 한 변 = 원판 지름 × 1.4 (선택 테두리·◐ 배지 자리)
const DISC_PX = { wide: 26, narrow: 24 };  // 원판 지름 (시안 44·40의 3/5)
const PICK_PX = 22;         // 원판이 작아서, 빗맞아도 이 거리 안의 가장 가까운 아이콘을 고른다
const IDLE_MS = 4000;       // 손을 뗀 뒤 자동 회전을 다시 시작하기까지
const TRANSITION_MS = 800;  // design-guide 6장

// 화면에 다 들어와야 하는 반지름 (축 + 라벨). 좁은 화면은 라벨이 잘리지 않게 여유를 더 둔다
const fitRadius = (width) => (width < 600 ? 3.6 : 3.2);

const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const worldOf = (o) => new THREE.Vector3(...toWorld(o));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const lerp = (a, b, t) => a + (b - a) * t;

export function createScene(stage, data) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = matchMedia('(pointer: coarse)').matches;
  const colors = {
    ink: token('--ink'), surface: token('--surface'), bg: token('--bg'), accent: token('--accent'), rule: token('--rule'),
  };
  const hooks = {};
  const platforms = data.platforms;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.className = 'map-canvas';
  stage.prepend(canvas);

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.className = 'map-labels';
  canvas.after(labelRenderer.domElement);

  const scene = new THREE.Scene();
  const persp = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  let camera = persp;

  const controls = new OrbitControls(persp, canvas);
  controls.enablePan = false;
  controls.enableDamping = !reduced.matches;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.6;
  controls.minPolarAngle = 10 * DEG;
  controls.maxPolarAngle = 170 * DEG;
  controls.autoRotateSpeed = 0.8;  // 한 바퀴 75초 (design-guide 6장: 60초 이상)

  let state = { ...DEFAULT_STATE };
  let width = 1, height = 1, disc = 44;

  // ── 축과 라벨 (보기마다 새로 만든다) ──

  const css2d = (el, pos) => {
    const obj = new CSS2DObject(el);
    obj.position.copy(pos);
    return obj;
  };

  function segments(pairs, color = colors.ink) {
    const geo = new THREE.BufferGeometry().setFromPoints(pairs.flatMap(([a, b]) => [worldOf(a), worldOf(b)]));
    return new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color }));
  }

  // 분류 보기: 구획마다 가는 선 상자와 이름 알약. 단위는 아이콘 한 칸, 한 칸의 화면 크기를 정해 줄바꿈 폭을 계산한다
  const cellPx = () => (width < 600 ? 38 : 46);
  const categoryMaxWidth = () => Math.max(4, width / cellPx() - 0.4);
  let blockLabels = [];

  function buildCategoryGuides(group) {
    const L = categoryLayout(platforms, categoryMaxWidth());
    const at = (cx, cy) => layoutToOctant({ cx, cy }, L);
    const rects = [];
    blockLabels = [];
    for (const b of L.blocks) {
      const { x, y, w, h } = b.rect;
      const [a, c, d, e] = [at(x, y), at(x + w, y), at(x + w, y + h), at(x, y + h)];
      rects.push([a, c], [c, d], [d, e], [e, a]);
      const el = document.createElement('div');
      el.className = 'block-label';
      el.innerHTML = `<span class="pill">${b.title}</span>${b.subtitle ? `<span class="label">${b.subtitle}</span>` : ''}<span class="label block-count">${b.items.length}</span>`;
      const obj = css2d(el, worldOf(at(x + 0.1, y + 0.08)));
      obj.center.set(0, 0);  // 상자 왼쪽 위에 붙인다
      group.add(obj);
      blockLabels.push({ el, ids: b.items.map((p) => p.id) });
    }
    group.add(segments(rects, colors.rule));
    applyFilter();
  }

  // 축 끝: 그 끝이 뜻하는 기준을 적는다 (낮은 끝 0 · 높은 끝 3)
  function axisEnd(key, end, pos) {
    const def = AXIS_DEFS[key];
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `axis-end axis-end-${end}`;
    const score = end === 'high' ? MAX : 0;
    el.innerHTML = `<span class="pill${end === 'low' ? ' pill-outline' : ''}">${def.name}<span class="axis-score"> ${score}</span></span><span class="label">${def[end]}</span>`;
    el.setAttribute('aria-label', `${def.name} ${score}: ${def[end]}. 축 설명 열기`);
    el.addEventListener('click', () => hooks.why?.());
    return css2d(el, worldOf(pos));
  }

  function buildGuides(st) {
    const group = new THREE.Group();
    if (st.view === 'category') { buildCategoryGuides(group); return group; }
    blockLabels = [];
    const C = CENTER;
    const axes = st.view === 'octant'
      ? [['x', OCTANT_AXES.x, { y: C, z: C }, 'z'], ['y', OCTANT_AXES.y, { x: C, z: C }, 'z'], ['z', OCTANT_AXES.z, { x: C, y: C }, 'x']]
      : st.view === 'slice'
        ? [['x', st.x, { y: C, z: C }, 'z'], ['z', st.y, { x: C, y: C }, 'x']]
        : [['x', st.x, { y: C, z: LINE_Z }, 'z']];
    const lines = [];
    for (const [along, key, at, tick] of axes) {
      const a = axisGeometry(along, at, tick);
      lines.push(a.line, ...a.ticks);
      group.add(axisEnd(key, 'low', a.low), axisEnd(key, 'high', a.high));
      // 평면 보기에는 눈금 숫자를 단다
      if (st.view !== 'octant') {
        for (let t = 0; t <= MAX; t++) {
          const el = document.createElement('span');
          el.className = 'tick-num';
          el.textContent = t;
          const pos = a.tickAt(t);
          pos[tick] -= 0.28;
          group.add(css2d(el, worldOf(pos)));
        }
      }
    }
    group.add(segments(lines));

    if (st.view === 'octant') {
      for (const c of CELLS) {
        const count = platforms.filter((p) => !p.octant.onBoundary && p.octant.key === c.key).length;
        const el = document.createElement('div');
        el.className = `cell-label${c.name ? '' : ' is-unnamed'}`;
        el.textContent = `${c.name ?? '이름 미정'} · ${count}`;
        group.add(css2d(el, worldOf(c.corner)));
      }
    }
    return group;
  }

  let guides = null;
  function setGuides(st) {
    if (guides) {
      scene.remove(guides);
      guides.traverse((o) => {
        if (o.isCSS2DObject) o.element.remove();
        o.geometry?.dispose();
        o.material?.dispose();
      });
    }
    guides = st ? buildGuides(st) : null;
    if (guides) scene.add(guides);
  }

  // HTML 라벨은 늘 캔버스 위에 그려지므로, 8분면에서 중심보다 뒤에 있는 라벨은 흐리게 한다
  const forward = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  function fadeBehind() {
    if (!guides) return;
    camera.getWorldDirection(forward);
    const center = tmp.copy(controls.target).sub(camera.position).dot(forward);
    const on = state.view === 'octant' && !anim;
    guides.traverse((o) => {
      if (!o.isCSS2DObject) return;
      const depth = tmp.copy(o.position).sub(camera.position).dot(forward);
      o.element.classList.toggle('is-behind', on && depth > center + 0.4);
    });
  }

  // ── 아이콘 스프라이트 ──

  const textures = new Map();

  function drawTexture(p, state) {
    const size = 128;
    const k = size / (SPRITE_RATIO * DISC_PX.wide);  // 화면 1px당 텍스처 픽셀
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const mid = size / 2;
    const r = size / SPRITE_RATIO / 2;
    if (state === 'selected') {
      g.beginPath(); g.arc(mid, mid, r + 2.5 * k, 0, Math.PI * 2);
      g.fillStyle = colors.ink; g.fill();
    }
    g.beginPath(); g.arc(mid, mid, r - 0.5 * k, 0, Math.PI * 2);
    g.fillStyle = state === 'idle' ? colors.surface : colors.accent;
    g.fill();
    g.strokeStyle = colors.ink;
    if (p.layer === 'contrast') { g.lineWidth = 1.2 * k; g.setLineDash([2.5 * k, 2 * k]); } else g.lineWidth = 1 * k;
    g.stroke();
    g.setLineDash([]);
    g.fillStyle = colors.ink;
    g.font = `400 ${10.5 * k}px Velvelyne, Pretendard, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(initials(p.name), mid, mid + 0.5 * k);
    if (p.layer === 'grey') {
      // ◐ 배지: 색이 아니라 모양으로 회색지대를 알린다
      const bx = mid + r * 0.74, by = mid - r * 0.74, br = 4.5 * k;
      g.beginPath(); g.arc(bx, by, br, 0, Math.PI * 2);
      g.fillStyle = colors.bg; g.fill();
      g.lineWidth = k; g.strokeStyle = colors.ink; g.stroke();
      g.beginPath(); g.arc(bx, by, br, Math.PI / 2, Math.PI * 1.5);
      g.fillStyle = colors.ink; g.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function texture(p, state) {
    const key = `${p.id}|${state}`;
    if (!textures.has(key)) textures.set(key, drawTexture(p, state));
    return textures.get(key);
  }

  const sprites = platforms.map((p) => {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture(p, 'idle'), sizeAttenuation: false, alphaTest: 0.05, toneMapped: false,
    }));
    sprite.userData = { p, off: { dx: 0, dy: 0 } };
    if (p.layer === 'contrast') {
      const el = document.createElement('div');
      el.className = 'contrast-tag';
      el.innerHTML = '<span class="pill">대조</span>';
      sprite.add(new CSS2DObject(el));
      sprite.userData.tag = el.firstChild;
    }
    scene.add(sprite);
    return sprite;
  });
  const spriteById = new Map(sprites.map((s) => [s.userData.p.id, s]));

  // 같은 좌표의 사례는 화면 기준으로 둘레에 놓는다: 스프라이트의 기준점을 옮긴다
  function setOffset(sprite, off) {
    sprite.userData.off = off;
    sprite.center.set(0.5 - off.dx / SPRITE_RATIO, 0.5 + off.dy / SPRITE_RATIO);
    const tag = sprite.userData.tag;
    if (tag) tag.style.translate = `calc(${off.dx} * var(--disc)) calc(${off.dy} * var(--disc) + var(--disc) * 0.5 + 8px)`;
  }

  function updateSpriteScale() {
    // sizeAttenuation 끈 스프라이트는 화면 높이에 대한 비율로 크기를 준다
    const s = (2 * disc * SPRITE_RATIO) / (camera.projectionMatrix.elements[5] * height);
    for (const sprite of sprites) sprite.scale.set(s, s, 1);
  }

  // 모아보기: 빠진 아이콘은 흐리게(15%) 남기고 고를 수 없게 한다 (build-guide 4-3). 사라지지 않는다
  let visibleIds = null;  // null이면 전체
  function applyFilter() {
    for (const s of sprites) {
      const on = !visibleIds || visibleIds.has(s.userData.p.id);
      s.userData.dim = !on;
      s.material.transparent = true;
      s.material.opacity = on ? 1 : 0.15;
      if (s.userData.tag) s.userData.tag.style.opacity = on ? '' : '0.15';
    }
    for (const b of blockLabels) b.el.classList.toggle('is-dim', !!visibleIds && !b.ids.some((id) => visibleIds.has(id)));
    invalidate();
  }

  let hoverId = null;
  let selectedId = null;
  function paint() {
    for (const s of sprites) {
      const id = s.userData.p.id;
      const st = id === selectedId ? 'selected' : id === hoverId ? 'hover' : 'idle';
      s.material.map = texture(s.userData.p, st);
      s.renderOrder = st === 'idle' ? 0 : 1;
    }
    invalidate();
  }

  // ── 카메라 ──
  // 8분면은 원근 카메라로 돌려 보고, 평면 보기는 정사영으로 정면에서 본다.
  // 전환 중에는 원근 카메라를 정면으로 돌리며 물러나게 해 "입체가 납작해지는" 느낌을 낸다.

  const tanHalf = Math.tan((FOV * DEG) / 2);

  function octantDistance() {
    const h = Math.atan(tanHalf * persp.aspect);
    return fitRadius(width) / Math.sin(Math.min(FOV * DEG / 2, h));
  }

  // 평면 보기의 화면 틀: 정사영의 위쪽 반높이(top)와 중심 높이(ty)
  function flatFrame(st) {
    const aspect = width / height;
    if (st.view === 'category') {
      const L = categoryLayout(platforms, categoryMaxWidth());
      return { top: Math.max(L.height / 2 + 0.4, (L.width / 2 + 0.4) / aspect), ty: 0 };
    }
    const halfW = width < 600 ? 3.1 : 2.9;
    if (st.view === 'line') {
      const top = Math.max(2.2, halfW / aspect);
      const lineY = LINE_Z - CENTER;
      return { top, ty: lineY + top * 0.62 };  // 띠를 화면 아래쪽에 두고 위로 쌓을 자리를 남긴다
    }
    return { top: Math.max(2.7, halfW / aspect), ty: 0 };
  }

  // 카메라 상태를 하나의 꼴로: 원근의 (theta, phi, r, ty). 정사영은 r을 top으로 바꿔 쓴다
  function poseFor(st) {
    if (st.view === 'octant') return { theta: VIEW.yaw * DEG, phi: (90 - VIEW.pitch) * DEG, r: octantDistance(), ty: 0 };
    const f = flatFrame(st);
    return { theta: 0, phi: Math.PI / 2, r: f.top / tanHalf, ty: f.ty };
  }

  function currentPose() {
    const sph = new THREE.Spherical().setFromVector3(persp.position.clone().sub(controls.target));
    if (camera === ortho) return { theta: 0, phi: Math.PI / 2, r: ortho.top / tanHalf, ty: ortho.position.y };
    return { theta: sph.theta, phi: sph.phi, r: sph.radius, ty: controls.target.y };
  }

  function applyPose(pose, kind) {
    const target = new THREE.Vector3(0, pose.ty, 0);
    if (kind === 'persp') {
      camera = persp;
      persp.aspect = width / height;
      persp.position.setFromSphericalCoords(pose.r, pose.phi, pose.theta).add(target);
      persp.lookAt(target);
      persp.updateProjectionMatrix();
      controls.target.copy(target);
    } else {
      camera = ortho;
      const top = pose.r * tanHalf;
      ortho.top = top; ortho.bottom = -top;
      ortho.right = top * (width / height); ortho.left = -ortho.right;
      ortho.position.set(0, pose.ty, 20);
      ortho.lookAt(target);
      ortho.updateProjectionMatrix();
      controls.target.copy(target);
    }
    camera.updateMatrixWorld();
    updateSpriteScale();
  }

  // ── 보기 전환 ──

  let anim = null;

  function layoutTargets(st) {
    return arrange(platforms, st, { maxRows: width < 600 ? 12 : 7, maxWidth: categoryMaxWidth() });
  }

  // 분류 보기가 화면보다 길면(좁은 화면) 지도 높이를 늘린다. 아이콘이 겹치지 않게 한 칸을 cellPx로 지킨다
  function fitStage(st) {
    let min = '';
    if (st.view === 'category') {
      const L = categoryLayout(platforms, categoryMaxWidth());
      const unit = Math.min(cellPx(), width / (L.width + 0.8));
      min = `${Math.ceil((L.height + 0.8) * unit)}px`;
    }
    if (stage.style.minHeight !== min) stage.style.minHeight = min;
  }

  function setView(next, { instant = false } = {}) {
    const prev = state;
    state = { ...state, ...next };
    fitStage(state);
    const targets = layoutTargets(state);
    const fromPose = currentPose();
    const toPose = poseFor(state);
    const toOctant = state.view === 'octant';
    const usePersp = toOctant || prev.view === 'octant';
    // 각도는 짧은 쪽으로 돈다
    let dTheta = (toPose.theta - fromPose.theta) % (2 * Math.PI);
    if (dTheta > Math.PI) dTheta -= 2 * Math.PI;
    if (dTheta < -Math.PI) dTheta += 2 * Math.PI;

    for (const s of sprites) {
      const t = targets.get(s.userData.p.id);
      s.userData.from = { pos: s.position.clone(), off: { ...s.userData.off } };
      s.userData.to = { pos: worldOf(t.pos), off: t.off };
    }
    setGuides(null);
    controls.enabled = false;
    controls.autoRotate = false;

    const finish = () => {
      anim = null;
      // 전환 중에 지도 크기가 바뀌었을 수 있으므로 끝 자리를 다시 계산한다
      width = stage.clientWidth || width;
      height = stage.clientHeight || height;
      renderer.setSize(width, height, false);
      labelRenderer.setSize(width, height);
      const final = layoutTargets(state);
      for (const s of sprites) {
        const t = final.get(s.userData.p.id);
        s.position.copy(worldOf(t.pos));
        setOffset(s, t.off);
      }
      applyPose(poseFor(state), toOctant ? 'persp' : 'ortho');
      if (toOctant) { controls.object = persp; controls.update(); }
      setGuides(state);
      setExplore(exploring);
      syncAutoRotate();
      hooks.viewChanged?.(state);
      invalidate();
    };

    if (instant || reduced.matches) { finish(); return; }
    const start = performance.now();
    anim = (now) => {
      const k = ease(Math.min(1, (now - start) / TRANSITION_MS));
      for (const s of sprites) {
        const { from, to } = s.userData;
        s.position.lerpVectors(from.pos, to.pos, k);
        setOffset(s, { dx: lerp(from.off.dx, to.off.dx, k), dy: lerp(from.off.dy, to.off.dy, k) });
      }
      applyPose({
        theta: fromPose.theta + dTheta * k,
        phi: lerp(fromPose.phi, toPose.phi, k),
        r: lerp(fromPose.r, toPose.r, k),
        ty: lerp(fromPose.ty, toPose.ty, k),
      }, usePersp ? 'persp' : 'ortho');
      if (k >= 1) finish();
    };
    invalidate();
  }

  // ── 크기 ──

  function resize() {
    width = stage.clientWidth || 1;
    height = stage.clientHeight || 1;
    disc = width < 600 ? DISC_PX.narrow : DISC_PX.wide;
    stage.style.setProperty('--disc', `${disc}px`);
    renderer.setSize(width, height, false);
    labelRenderer.setSize(width, height);
    if (anim) return;
    fitStage(state);
    if (state.view === 'octant') {
      // 화면 크기가 바뀌어도 줌 비율은 유지한다
      const pose = currentPose();
      const prevFit = pose.r ? octantDistance() : 0;
      persp.aspect = width / height;
      const fit = octantDistance();
      controls.minDistance = fit * 0.45;
      controls.maxDistance = fit * 1.6;
      applyPose({ ...pose, r: prevFit ? pose.r * (fit / prevFit) : fit }, 'persp');
    } else {
      // 평면 보기는 틀을 다시 맞추고, 한 줄 보기는 쌓는 높이가 화면 폭에 달려 있어 다시 배치한다
      const targets = layoutTargets(state);
      for (const s of sprites) {
        const t = targets.get(s.userData.p.id);
        s.position.copy(worldOf(t.pos));
        setOffset(s, t.off);
      }
      applyPose(poseFor(state), 'ortho');
      // 분류 보기는 폭에 따라 구획 줄바꿈이 달라지므로 상자도 다시 그린다
      if (state.view === 'category') setGuides(state);
    }
    invalidate();
  }

  function resetView() {
    if (state.view !== 'octant') return;
    applyPose(poseFor(state), 'persp');
    controls.update();
    invalidate();
  }

  const spherical = new THREE.Spherical();
  function rotateBy(dTheta, dPhi) {
    if (state.view !== 'octant' || anim) return;
    spherical.setFromVector3(persp.position.clone().sub(controls.target));
    spherical.theta += dTheta;
    spherical.phi = THREE.MathUtils.clamp(spherical.phi + dPhi, controls.minPolarAngle, controls.maxPolarAngle);
    persp.position.setFromSpherical(spherical).add(controls.target);
    controls.update();
    nudgeIdle();
  }

  // ── 자동 회전 (8분면에서만) ──
  let paused = false;
  let idle = true;
  let holdForCard = false;
  let idleTimer = 0;

  function syncAutoRotate() {
    controls.autoRotate = state.view === 'octant' && !anim && !reduced.matches && !paused && idle && !holdForCard;
    invalidate();
  }
  function nudgeIdle() {
    idle = false;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { idle = true; syncAutoRotate(); }, IDLE_MS);
    syncAutoRotate();
  }
  controls.addEventListener('start', () => { idle = false; clearTimeout(idleTimer); syncAutoRotate(); hooks.interact?.(); });
  controls.addEventListener('end', () => nudgeIdle());
  reduced.addEventListener?.('change', () => { controls.enableDamping = !reduced.matches; syncAutoRotate(); });

  // ── 렌더 루프: 움직임이 없으면 다시 그리지 않는다 ──
  let raf = 0;
  let dirty = true;
  let last = 0;
  let inView = true;

  function invalidate() {
    dirty = true;
    if (!raf && inView && !document.hidden) raf = requestAnimationFrame(frame);
  }
  function frame(t) {
    raf = 0;
    const dt = last ? Math.min((t - last) / 1000, 0.1) : 1 / 60;
    last = t;
    if (anim) { anim(t); dirty = true; }
    else if (camera === persp) controls.update(dt);  // 움직였으면 'change' → invalidate
    if (dirty) {
      dirty = false;
      renderer.render(scene, camera);
      fadeBehind();
      labelRenderer.render(scene, camera);
      hooks.render?.();
    }
    if ((anim || controls.autoRotate) && !raf) invalidate();
    if (!raf) last = 0;
  }
  controls.addEventListener('change', invalidate);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) invalidate(); });
  new IntersectionObserver(([e]) => { inView = e.isIntersecting; if (inView) invalidate(); }).observe(stage);

  // ── 고르기 ──
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pick(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const live = sprites.filter((s) => !s.userData.dim);
    const hit = raycaster.intersectObjects(live, false)[0]?.object.userData.p;
    if (hit) return hit;
    // 빗맞았으면 화면에서 가장 가까운 아이콘 (손가락 터치 대상 44px 보완)
    const x = e.clientX - r.left, y = e.clientY - r.top;
    let best = null, bestD = PICK_PX;
    for (const s of live) {
      const q = screenOf(s.userData.p.id);
      const d = Math.hypot(q.x - x, q.y - y);
      if (d < bestD) { bestD = d; best = s.userData.p; }
    }
    return best;
  }

  const v = new THREE.Vector3();
  function screenOf(id) {
    const s = spriteById.get(id);
    camera.updateMatrixWorld();  // 첫 렌더 전에 불려도 맞는 값이 나오게
    v.copy(s.position).project(camera);
    return {
      x: ((v.x + 1) / 2) * width + s.userData.off.dx * disc,
      y: ((1 - v.y) / 2) * height + s.userData.off.dy * disc,
    };
  }

  let down = null;
  canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointercancel', () => { down = null; });
  canvas.addEventListener('pointerup', (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    if (moved > 6 || anim) return;
    hooks.select?.(pick(e)?.id ?? null);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || e.buttons || anim) return;
    const p = pick(e);
    canvas.style.cursor = p ? 'pointer' : '';
    if ((p?.id ?? null) !== hoverId) hooks.hover?.(p?.id ?? null);
  });
  canvas.addEventListener('pointerleave', () => { if (hoverId) hooks.hover?.(null); });

  // 터치 기기에서는 캔버스 터치를 페이지 스크롤에 양보하고, 둘러보기를 켤 때만 회전 (build-guide 4-6)
  let exploring = false;
  function setExplore(on) {
    exploring = on;
    const active = state.view === 'octant' && !anim && (on || !coarse);
    controls.enabled = active;
    canvas.style.touchAction = active ? 'none' : 'pan-y';
  }

  // ── 시작 ──
  width = stage.clientWidth || 1;
  height = stage.clientHeight || 1;
  persp.aspect = width / height;
  new ResizeObserver(resize).observe(stage);
  resize();
  setView(state, { instant: true });

  return {
    coarse,
    reducedMotion: () => reduced.matches,
    state: () => ({ ...state }),
    on(name, fn) { hooks[name] = fn; },
    setView,
    setFilter(ids) { visibleIds = ids; applyFilter(); },
    setHover(id) { hoverId = id; paint(); },
    setSelected(id) { selectedId = id; holdForCard = !!id; paint(); syncAutoRotate(); },
    setPaused(on) { paused = on; syncAutoRotate(); },
    setExplore,
    resetView,
    rotateBy,
    screenOf,
  };
}
