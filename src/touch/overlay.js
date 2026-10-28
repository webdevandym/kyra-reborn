import { stickLayout } from './controls.js';

export function createTouchOverlay(layer, controls, { size = { width: 960, height: 540 }, scheme = 'slide' } = {}) {
  let last = '';
  let hintTimer = null;

  const pct = (value, total) => `${((value / total) * 100).toFixed(2)}%`;
  const cqi = (value) => `${((value / size.width) * 100).toFixed(2)}cqi`;

  function layout() {
    const { stick, jump } = stickLayout(size);
    const style = layer.style;
    style.setProperty('--stick-x', pct(stick.x, size.width));
    style.setProperty('--stick-y', pct(stick.y, size.height));
    style.setProperty('--stick-size', cqi(stick.r * 2));
    style.setProperty('--jump-x', pct(jump.x, size.width));
    style.setProperty('--jump-y', pct(jump.y, size.height));
    style.setProperty('--jump-size', cqi(jump.r * 2));
  }

  function setScheme(next) {
    scheme = next;
    layer.dataset.scheme = next;
    last = '';
  }

  setScheme(scheme);
  layout();

  return {
    setScheme,
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
      style.setProperty('--anchor-x', pct(walk.anchorX, size.width));
      style.setProperty('--anchor-y', pct(walk.anchorY, size.height));
      style.setProperty('--thumb-x', pct(walk.x, size.width));
      style.setProperty('--thumb-y', pct(walk.y, size.height));
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
