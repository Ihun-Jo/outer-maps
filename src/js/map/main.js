// 지도 진입점. data.json만 읽는다 (build-guide 1장).
// WebGL이나 모듈이 안 되면 아무것도 바꾸지 않고, 빌드에서 그린 정적 8분면과 목록이 그대로 남는다.

import { createScene } from './scene.js';
import { createCard } from './card.js';
import { bindControls } from './controls.js';

const stage = document.getElementById('map-stage');
const aside = document.getElementById('map-card');
const bar = document.getElementById('map-bar');

if (stage && aside && bar) {
  try {
    const data = await fetch('data.json').then((r) => r.json());
    // 이니셜을 캔버스에 그리기 전에 서체를 기다린다
    await Promise.all(['400 16px Velvelyne', '400 16px Pretendard'].map((f) => document.fonts.load(f).catch(() => {})));
    const map = createScene(stage, data);
    let controls = null;
    const card = createCard(aside, data, { onClose: () => controls?.deselect() });
    controls = bindControls({ stage, bar, map, card, data });
    stage.classList.add('is-live');
  } catch (err) {
    console.warn('지도를 띄우지 못해 정적 그림을 보여 준다.', err);
  }
}
