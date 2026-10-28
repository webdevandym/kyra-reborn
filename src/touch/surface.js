export function createTouchSurface(stage, controls, { isActive, size = null }) {
  const tracked = new Set();

  function point(event) {
    const rect = stage.getBoundingClientRect();
    const width = size?.width ?? rect.width;
    const height = size?.height ?? rect.height;
    return [((event.clientX - rect.left) * width) / rect.width, ((event.clientY - rect.top) * height) / rect.height];
  }

  function onDown(event) {
    if (event.pointerType !== 'touch') return;
    if (event.target?.closest?.('button')) return;
    if (!isActive()) return;
    try {
      stage.setPointerCapture?.(event.pointerId);
    } catch {}
    tracked.add(event.pointerId);
    controls.pointerDown(event.pointerId, ...point(event));
    event.preventDefault();
  }

  function onMove(event) {
    if (!tracked.has(event.pointerId)) return;
    controls.pointerMove(event.pointerId, ...point(event));
    event.preventDefault();
  }

  function onEnd(event) {
    if (!tracked.has(event.pointerId)) return;
    tracked.delete(event.pointerId);
    controls.pointerUp(event.pointerId);
  }

  const onTouchMove = (event) => event.preventDefault();

  stage.addEventListener('pointerdown', onDown);
  stage.addEventListener('pointermove', onMove);
  stage.addEventListener('pointerup', onEnd);
  stage.addEventListener('pointercancel', onEnd);
  stage.addEventListener('touchmove', onTouchMove, { passive: false });

  return {
    releaseAll() {
      tracked.clear();
      controls.reset();
    },
    dispose() {
      stage.removeEventListener('pointerdown', onDown);
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerup', onEnd);
      stage.removeEventListener('pointercancel', onEnd);
      stage.removeEventListener('touchmove', onTouchMove);
    },
  };
}
