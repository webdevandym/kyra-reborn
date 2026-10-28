export function coverRect(srcW, srcH, dstW, dstH) {
  const scale = Math.max(dstW / srcW, dstH / srcH);
  const w = srcW * scale;
  const h = srcH * scale;
  return { x: (dstW - w) / 2, y: (dstH - h) / 2, w, h };
}

export function ambientNeeded(stage, viewport) {
  return stage.left > 1 || stage.top > 1 || stage.left + stage.width < viewport.width - 1 || stage.top + stage.height < viewport.height - 1;
}
