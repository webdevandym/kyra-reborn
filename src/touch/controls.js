export const SCHEMES = ['slide', 'stick'];
export const DEFAULT_SCHEME = 'slide';
export const DEAD_ZONE = 0.12;

const SLIDE_RANGE = 0.1;

export function stickLayout({ width, height }) {
  const margin = height * 0.06;
  const r = height * 0.17;
  const jr = height * 0.15;
  return {
    stick: { x: width - margin - r, y: height - margin - r, r },
    jump: { x: margin + jr, y: height - margin - jr, r: jr },
  };
}

export function mergeSnapshots(a, b) {
  return {
    left: a.left || b.left,
    right: a.right || b.right,
    jumpHeld: a.jumpHeld || b.jumpHeld,
    jumpPressed: a.jumpPressed || b.jumpPressed,
  };
}

const clamp = (value, limit) => Math.max(-limit, Math.min(limit, value));

export function createTouchControls({ scheme = DEFAULT_SCHEME, size = { width: 960, height: 540 } } = {}) {
  let current = SCHEMES.includes(scheme) ? scheme : DEFAULT_SCHEME;
  let box = size;
  let jumpId = null;
  let jumpPressed = false;
  let walk = null;

  const slideRange = () => box.width * SLIDE_RANGE;

  function range() {
    return current === 'stick' ? stickLayout(box).stick.r : slideRange();
  }

  function direction() {
    if (!walk) return 0;
    const dx = walk.x - walk.anchorX;
    if (Math.abs(dx) <= range() * DEAD_ZONE) return 0;
    return Math.sign(dx);
  }

  function reset() {
    jumpId = null;
    jumpPressed = false;
    walk = null;
  }

  return {
    pointerDown(id, x, y) {
      if (id === jumpId || walk?.id === id) return;
      if (x < box.width / 2) {
        if (jumpId !== null) return;
        jumpId = id;
        jumpPressed = true;
        return;
      }
      if (walk) return;
      const anchor = current === 'stick' ? stickLayout(box).stick : { x, y };
      walk = { id, anchorX: anchor.x, anchorY: anchor.y, x, y };
    },
    pointerMove(id, x, y) {
      if (walk?.id !== id) return;
      walk.x = x;
      walk.y = y;
      if (current !== 'slide') return;
      const reach = slideRange();
      const dx = x - walk.anchorX;
      if (Math.abs(dx) > reach) walk.anchorX = x - Math.sign(dx) * reach;
    },
    pointerUp(id) {
      if (id === jumpId) jumpId = null;
      if (walk?.id === id) walk = null;
    },
    reset,
    setScheme(next) {
      if (!SCHEMES.includes(next) || next === current) return;
      current = next;
      reset();
    },
    setSize(next) {
      box = next;
    },
    snapshot() {
      const dir = direction();
      const pressed = jumpPressed;
      jumpPressed = false;
      return { left: dir < 0, right: dir > 0, jumpHeld: jumpId !== null, jumpPressed: pressed };
    },
    clearPressed() {
      jumpPressed = false;
    },
    view() {
      if (!walk) return { jump: jumpId !== null, walk: null };
      const dir = direction();
      if (current === 'stick') {
        const reach = stickLayout(box).stick.r;
        return {
          jump: jumpId !== null,
          walk: {
            anchorX: walk.anchorX,
            anchorY: walk.anchorY,
            x: walk.anchorX + clamp(walk.x - walk.anchorX, reach),
            y: walk.anchorY + clamp(walk.y - walk.anchorY, reach),
            dir,
          },
        };
      }
      return {
        jump: jumpId !== null,
        walk: {
          anchorX: walk.anchorX,
          anchorY: walk.anchorY,
          x: walk.anchorX + clamp(walk.x - walk.anchorX, slideRange()),
          y: walk.y,
          dir,
        },
      };
    },
  };
}
