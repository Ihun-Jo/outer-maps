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

function bars(v) {
  return [0, 1, 2].map((i) => `<i style="--f:${Math.min(1, Math.max(0, v - i))}"></i>`).join('');
}

function cardHTML(p, labels) {
  const o = p.octant;
  const axes = [['참여', o.x], ['독립', o.y], ['연대', o.z]];
  const layer = p.layer === 'grey' ? '<span class="pill pill-outline"><span aria-hidden="true">◐</span> 회색지대</span>'
    : p.layer === 'contrast' ? '<span class="pill">대조</span>' : '';
  const license = [p.license && val(p.license), labels.licenseFamily[p.license_family], p.funding && val(p.funding)]
    .filter(Boolean).join(' · ');
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
<div class="glyph glyph-3" aria-hidden="true">${axes.map(([k, v]) =>
  `<div class="glyph-axis"><span class="label">${k}</span><span class="bars">${bars(v)}</span><span class="label">${fmt(v)} / 3</span></div>`).join('')}</div>
<p class="label">${axes.map(([k, v]) => `${k} ${fmt(v)}`).join(' · ')}</p>
<p class="label map-card-facts">칸: ${esc(octantLabel(o))}<br>${license}</p>
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
