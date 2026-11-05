// 사례 카드: 데스크톱은 지도 오른쪽 패널, 모바일은 아래에서 올라오는 시트 (build-guide 4-5).

import { initials, octantLabel, categoriesOf, categoryName, subcategoryName } from './layouts.js';

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const UNVERIFIED = '확인 필요';
const val = (v) => (v === UNVERIFIED ? `<span class="unverified">${UNVERIFIED}</span>` : esc(v));
const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

function host(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

// 무료와 자유는 다르다: 쓸 권리의 근거가 라이선스인가, 운영 주체의 정책인가 (CLAUDE.md)
function freedomNote(family) {
  if (family === 'proprietary') return '자유 라이선스 아님 · 무료라면 운영 주체의 정책';
  if (!family || family === 'unknown') return '';
  return '쓰고 고치고 나눌 권리를 라이선스가 보장';
}

// 연대 근거를 한 문단으로. 확신도 "낮음"인 0점은 "근거를 못 찾음" (CLAUDE.md)
function solidarityProse(p) {
  const s = p.solidarity;
  if (!s) return '';
  if (s.confidence === '낮음' && p.score_solidarity === 0) {
    return `창작 도구 바깥의 의제와 연대한 근거는 아직 찾지 못했다. 없음이 확인된 것은 아니다.${s.tension && s.tension !== UNVERIFIED ? ` (${esc(s.tension)})` : ''}`;
  }
  const end = (t) => (/[.。)]$/.test(t) ? t : `${t}.`);
  const source = (s.source_solidarity || '').split(';').map((u) => u.trim()).filter(Boolean)[0];
  return `${end(esc(s.evidence))}${s.tension ? ` 한계도 있다: ${end(val(s.tension))}` : ''} <span class="map-card-meta">연대 ${p.score_solidarity}/3 · 확신도 ${esc(s.confidence)}${source ? ` · <a href="${esc(source)}" rel="noopener">출처</a>` : ''}</span>`;
}

// 줄글: 소개(data/descriptions.csv)를 열 순서대로, 소개는 머리말 없이. 끝에 연대 근거와 출처.
// 소개는 data.json에 없고 acf/{id}/description.json을 카드가 열릴 때 불러온다
const DESC_PARTS = [['intro', ''], ['history', '역사'], ['now', '지금'], ['events', '주요 사건'], ['relations', '다른 플랫폼과의 관계']];
const head = (label) => (label ? `<span class="prose-head">${label}</span> ` : '');

function proseHTML(p, d) {
  const parts = d ? DESC_PARTS.filter(([k]) => d[k]).map(([k, label]) => `<p>${head(label)}${esc(d[k])}</p>`) : [];
  if (p.solidarity) parts.push(`<p>${head('연대')}${solidarityProse(p)}</p>`);
  if (d?.sources?.length) {
    const links = d.sources.map((u) => `<a href="${esc(u)}" rel="noopener">${esc(host(u))}</a>`).join(' · ');
    parts.push(`<p class="map-card-meta">출처 ${links}${d.checked ? ` · ${esc(d.checked)} 확인` : ''}</p>`);
  }
  return parts.join('');
}

const descCache = new Map();
function loadDescription(id) {
  if (!descCache.has(id)) {
    descCache.set(id, fetch(`acf/${id}/description.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null));
  }
  return descCache.get(id);
}

function cardHTML(p, labels) {
  const o = p.octant;
  const axes = [['참여', o.x], ['독립', o.y], ['연대', o.z]];
  const layer = p.layer === 'grey' ? '<span class="pill pill-outline"><span aria-hidden="true">◐</span> 회색지대</span>'
    : p.layer === 'contrast' ? '<span class="pill">대조</span>' : '';
  const owner = [p.owner && esc(p.owner), labels.ownership[p.ownership_type]].filter(Boolean).join(' · ');
  const license = [p.license && val(p.license), p.license_family !== 'unknown' && labels.licenseFamily[p.license_family]]
    .filter(Boolean).join(' · ');
  const note = freedomNote(p.license_family);
  const rows = [
    ['누가', owner],
    ['라이선스', license + (note ? `<br><span class="map-card-meta">${note}</span>` : '')],
    ['재정', p.funding && val(p.funding)],
    ['맞서는 것', p.alt_target && val(p.alt_target)],
    ['칸', esc(octantLabel(o))],
  ].filter(([, v]) => v);
  const prose = proseHTML(p, null);
  // 다운로드 버튼은 download_url 열이 생기면 넣는다
  const download = p.download_url ? `<a class="btn" href="${esc(p.download_url)}" rel="noopener">다운로드</a>` : '';
  return `<div class="sheet-handle" aria-hidden="true"><span></span></div>
<div class="card-top">
  <span class="label">${esc(categoriesOf(p).map(categoryName).join(', '))}${p.subcategory ? ` · ${esc(subcategoryName(p.subcategory))}` : ''}</span>
  <span class="map-card-actions">${layer}<button type="button" class="card-close" aria-label="카드 닫기">×</button></span>
</div>
<div class="case-title">
  <span class="disc disc-lg${p.layer === 'contrast' ? ' disc-contrast' : ''}" aria-hidden="true">${esc(initials(p.name))}</span>
  <div>
    <h2 class="map-card-name display-en" tabindex="-1">${esc(p.name)}</h2>
    <p class="case-ko">${val(p.domain)}</p>
  </div>
</div>
${p.tagline ? `<p class="map-card-tagline">${esc(p.tagline)}</p>` : ''}
<dl class="score-rows" aria-label="${axes.map(([k, v]) => `${k} ${fmt(v)}`).join(', ')} (각 0~3)">${axes.map(([k, v]) =>
  `<div><dt>${k}</dt><dd><span class="score-bar" style="--f:${v / 3}" aria-hidden="true"></span><span class="score-n">${fmt(v)}</span></dd></div>`).join('')}</dl>
<dl class="card-table">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
<div class="map-card-prose">${prose}</div>
<div class="map-card-links">
  ${p.url ? `<a class="btn" href="${esc(p.url)}" rel="noopener">공식 사이트<span class="visually-hidden"> ${esc(host(p.url))}</span></a>` : ''}
  ${download}
  <a class="btn btn-ink" href="acf/${esc(p.id)}/index.html">자세히 →</a>
</div>`;
}

export function createCard(aside, data, { onClose }) {
  const empty = aside.innerHTML;
  const mobile = matchMedia('(max-width: 899px)');
  let current = null;

  function open(p, { focus = false } = {}) {
    current = p;
    aside.innerHTML = cardHTML(p, data.labels);
    aside.classList.add('is-open');
    aside.classList.remove('is-full');
    aside.querySelector('.card-close').addEventListener('click', () => onClose());
    bindHandle(aside.querySelector('.sheet-handle'));
    if (focus) aside.querySelector('.map-card-name').focus({ preventScroll: !mobile.matches });
    // 소개 줄글이 오면 연대 문단 앞에 채운다. 그사이 다른 카드를 열었으면 버린다
    loadDescription(p.id).then((d) => {
      if (d && current === p) aside.querySelector('.map-card-prose').innerHTML = proseHTML(p, d);
    });
  }

  function close() {
    current = null;
    aside.classList.remove('is-open', 'is-full');
    aside.innerHTML = empty;
  }

  // 시트 손잡이: 위로 끌면 전체 펼침, 아래로 끌면 반으로 접거나 닫음
  function bindHandle(handle) {
    let start = null;
    handle.addEventListener('pointerdown', (e) => {
      start = e.clientY;
      handle.setPointerCapture(e.pointerId);
      aside.classList.add('is-dragging');
    });
    handle.addEventListener('pointermove', (e) => {
      if (start === null) return;
      aside.style.translate = `0 ${Math.max(-80, e.clientY - start)}px`;
    });
    const end = (e) => {
      if (start === null) return;
      const dy = e.clientY - start;
      start = null;
      aside.style.translate = '';
      aside.classList.remove('is-dragging');
      if (dy < -40) aside.classList.add('is-full');
      else if (dy > 60) {
        if (aside.classList.contains('is-full')) aside.classList.remove('is-full');
        else onClose();
      }
    };
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  }

  return { open, close, current: () => current, isSheet: () => mobile.matches };
}
