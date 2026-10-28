const CAPTURE = { capture: true };

export function createTouchMode({ coarse, target, onChange }) {
  let active = Boolean(coarse);

  function set(next) {
    if (next === active) return;
    active = next;
    onChange(active);
  }

  const onPointerDown = (event) => {
    if (event.pointerType === 'touch') set(true);
  };
  const onKeyDown = (event) => {
    if (event.code) set(false);
  };

  target.addEventListener('pointerdown', onPointerDown, CAPTURE);
  target.addEventListener('keydown', onKeyDown, CAPTURE);

  return {
    isActive: () => active,
    dispose() {
      target.removeEventListener('pointerdown', onPointerDown, CAPTURE);
      target.removeEventListener('keydown', onKeyDown, CAPTURE);
    },
  };
}
