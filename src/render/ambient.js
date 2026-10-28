export function ambientNeeded(stage, viewport) {
  return stage.left > 1 || stage.top > 1 || stage.left + stage.width < viewport.width - 1 || stage.top + stage.height < viewport.height - 1;
}

export function reflectionStrips(stage, viewport, k, source) {
  const strips = [];
  const right = stage.left + stage.width;
  const bottom = stage.top + stage.height;
  const rightBar = viewport.width - right;
  const bottomBar = viewport.height - bottom;

  if (stage.left > 1) {
    const mirror = Math.min(stage.left, stage.width);
    strips.push({ sx: 0, sy: 0, sw: (source.width * mirror) / stage.width, sh: source.height, dx: (stage.left - mirror) * k, dy: stage.top * k, dw: mirror * k, dh: stage.height * k, flipX: true, flipY: false, side: 'left' });
  }
  if (rightBar > 1) {
    const mirror = Math.min(rightBar, stage.width);
    const sw = (source.width * mirror) / stage.width;
    strips.push({ sx: source.width - sw, sy: 0, sw, sh: source.height, dx: right * k, dy: stage.top * k, dw: mirror * k, dh: stage.height * k, flipX: true, flipY: false, side: 'right' });
  }
  if (stage.top > 1) {
    const mirror = Math.min(stage.top, stage.height);
    strips.push({ sx: 0, sy: 0, sw: source.width, sh: (source.height * mirror) / stage.height, dx: stage.left * k, dy: (stage.top - mirror) * k, dw: stage.width * k, dh: mirror * k, flipX: false, flipY: true, side: 'top' });
  }
  if (bottomBar > 1) {
    const mirror = Math.min(bottomBar, stage.height);
    const sh = (source.height * mirror) / stage.height;
    strips.push({ sx: 0, sy: source.height - sh, sw: source.width, sh, dx: stage.left * k, dy: bottom * k, dw: stage.width * k, dh: mirror * k, flipX: false, flipY: true, side: 'bottom' });
  }
  return strips;
}
