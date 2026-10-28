import { stickLayout } from './controls.js';

export function createTouchOverlay(layer, controls, { size, scheme = 'slide' }) {
  let box = size;
  let last = '';
  let hintTimer = null;

  const pct = (value, total) => `${((value / total) * 100).toFixed(2)}%`;
  const px = (value) => `${value.toFixed(1)}px`;

  function layout() {
    const { stick, jump } = stickLayout(box);
    const style = layer.style;
    style.setProperty('--stick-x', pct(stick.x, box.width));
    style.setProperty('--stick-y', pct(stick.y, box.height));
    style.setProperty('--stick-size', px(stick.r * 2));
    style.setProperty('--jump-x', pct(jump.x, box.width));
    style.setProperty('--jump-y', pct(jump.y, box.height));
    style.setProperty('--jump-size', px(jump.r * 2));
  }

  function setScheme(next) {
    layer.dataset.scheme = next;
    last = '';
  }

  setScheme(scheme);
  layout();

  return {
    setScheme,
    setSize(next) {
      box = next;
      layout();
      last = '';
    },
    update() {
      const { jump, walk } = controls.view();
      const signature = walk ? `${jump}|${walk.anchorX.toFixed(1)}|${walk.anchorY.toFixed(1)}|${walk.x.toFixed(1)}|${walk.y.toFixed(1)}|${walk.dir}` : `${jump}|-`;
      if (signature === last) return;
      last = signature;
      layer.dataset.jump = jump ? 'on' : 'off';
      layer.dataset.walk = walk ? 'on' : 'off';
      if (!walk) return;
      layer.dataset.dir = String(walk.dir);
      const style = layer.style;
      style.setProperty('--anchor-x', pct(walk.anchorX, box.width));
      style.setProperty('--anchor-y', pct(walk.anchorY, box.height));
      style.setProperty('--thumb-x', pct(walk.x, box.width));
      style.setProperty('--thumb-y', pct(walk.y, box.height));
      style.setProperty('--thumb-dx', px(walk.x - walk.anchorX));
      style.setProperty('--thumb-dy', px(walk.y - walk.anchorY));
    },
    showHint(ms = 4000) {
      layer.dataset.hint = 'on';
      clearTimeout(hintTimer);
      hintTimer = setTimeout(() => {
        layer.dataset.hint = 'off';
      }, ms);
    },
  };
}
