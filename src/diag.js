export function createDiag({ desk, stage, layer, probe, view, touchActive }) {
  const el = document.createElement('pre');
  el.className = 'diag';
  document.body.append(el);

  const box = (node) => {
    const b = node.getBoundingClientRect();
    return `${Math.round(b.left)},${Math.round(b.top)} ${Math.round(b.width)}x${Math.round(b.height)}`;
  };

  function update() {
    const vv = window.visualViewport;
    const safe = getComputedStyle(probe);
    el.textContent = [
      navigator.userAgent.match(/(CriOS|Version|Safari)\/[\d.]+/g)?.join(' ') ?? navigator.userAgent,
      `inner ${innerWidth}x${innerHeight} screen ${screen.width}x${screen.height} dpr ${devicePixelRatio}`,
      `client ${document.documentElement.clientWidth}x${document.documentElement.clientHeight} scroll ${Math.round(scrollX)},${Math.round(scrollY)}`,
      vv ? `vv ${Math.round(vv.width)}x${Math.round(vv.height)} at ${Math.round(vv.offsetLeft)},${Math.round(vv.offsetTop)} scale ${vv.scale}` : 'vv none',
      `safe L${safe.paddingLeft} R${safe.paddingRight} T${safe.paddingTop} B${safe.paddingBottom}`,
      `desk ${box(desk)}`,
      `stage ${box(stage)}`,
      `layer ${box(layer)}`,
      `view ${view()} touch ${touchActive()}`,
    ].join('\n');
  }

  setInterval(update, 500);
  update();
}
