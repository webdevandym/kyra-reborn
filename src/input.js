export const KEY_ACTIONS = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  Space: 'jump',
  ArrowUp: 'jump',
  KeyW: 'jump',
  Escape: 'pause',
  KeyP: 'pause',
  Enter: 'confirm',
  NumpadEnter: 'confirm',
  KeyM: 'mute',
  KeyL: 'lang',
};

const SCROLL_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space']);
const ONE_SHOT = new Set(['pause', 'confirm', 'mute', 'lang']);

export function actionForCode(code) {
  return KEY_ACTIONS[code] ?? null;
}

const isButton = (target) => target?.tagName === 'BUTTON';

export function createInput(target) {
  const held = new Set();
  const pressed = new Set();
  const handlers = new Set();

  function onKeyDown(event) {
    const action = actionForCode(event.code);
    if (SCROLL_KEYS.has(event.code) && !isButton(event.target)) event.preventDefault();
    if (!action) return;
    if (!event.repeat) {
      if (!held.has(action)) pressed.add(action);
      if (ONE_SHOT.has(action)) {
        if (action === 'confirm' && isButton(event.target)) return;
        for (const handler of handlers) handler(action, event);
      }
    }
    held.add(action);
  }

  function onKeyUp(event) {
    const action = actionForCode(event.code);
    if (action) held.delete(action);
  }

  function reset() {
    held.clear();
    pressed.clear();
  }

  target.addEventListener('keydown', onKeyDown);
  target.addEventListener('keyup', onKeyUp);
  target.addEventListener('blur', reset);

  return {
    isHeld: (action) => held.has(action),
    snapshot() {
      const jumpPressed = pressed.has('jump');
      pressed.clear();
      return {
        left: held.has('left'),
        right: held.has('right'),
        jumpHeld: held.has('jump'),
        jumpPressed,
      };
    },
    clearPressed() {
      pressed.clear();
    },
    onAction(handler) {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
    reset,
    dispose() {
      target.removeEventListener('keydown', onKeyDown);
      target.removeEventListener('keyup', onKeyUp);
      target.removeEventListener('blur', reset);
    },
  };
}
