const PAUSE_BUTTON = { size: 44, edge: 8 };

export function hudInsets({ stage, viewportWidth, safe, viewW }) {
  const scale = viewW / stage.width;
  const left = Math.max(0, safe.left - stage.left);
  const corner = Math.max(0, safe.right - (viewportWidth - stage.right));
  const buttonLeft = viewportWidth - Math.max(PAUSE_BUTTON.edge, safe.right) - PAUSE_BUTTON.size;
  const pause = Math.max(0, stage.right - buttonLeft + PAUSE_BUTTON.edge);
  return { left: left * scale, right: pause * scale, corner: corner * scale };
}
