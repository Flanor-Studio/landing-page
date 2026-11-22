import type { DriveInput } from './driving';

const bindings = new Map([
  ['KeyW', 'forward'], ['ArrowUp', 'forward'], ['KeyS', 'back'], ['ArrowDown', 'back'],
  ['KeyA', 'left'], ['ArrowLeft', 'left'], ['KeyD', 'right'], ['ArrowRight', 'right'],
  ['ShiftLeft', 'boost'], ['ShiftRight', 'boost'], ['Space', 'jump'], ['KeyX', 'brake'],
]);

export function createControls(root: HTMLElement, enabled: () => boolean, signal: AbortSignal) {
  const keys = new Set<string>();
  const touches = new Map<number, string>();

  function clear() {
    keys.clear();
    touches.clear();
    root.querySelectorAll('[data-pressed]').forEach(button => button.removeAttribute('data-pressed'));
  }

  window.addEventListener('keydown', event => {
    if (!enabled() || !bindings.has(event.code) || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.target instanceof HTMLElement) {
      if (event.target.closest('input, textarea, select, [contenteditable]')) return;
      if (event.code === 'Space' && event.target.closest('button, a, summary')) return;
    }
    event.preventDefault();
    keys.add(event.code);
  }, { signal });

  window.addEventListener('keyup', event => keys.delete(event.code), { signal });
  window.addEventListener('blur', clear, { signal });
  root.addEventListener('pointerdown', event => {
    if (!enabled() || event.button !== 0 || !(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLElement>('[data-drive]');
    if (!button?.dataset.drive) return;
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    touches.set(event.pointerId, button.dataset.drive);
    button.dataset.pressed = '';
  }, { signal });

  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    root.addEventListener(type, event => {
      if (!(event instanceof PointerEvent)) return;
      touches.delete(event.pointerId);
      if (event.target instanceof HTMLElement) delete event.target.dataset.pressed;
    }, { signal });
  }

  function read(): DriveInput {
    const actions = new Set(touches.values());
    for (const key of keys) {
      const action = bindings.get(key);
      if (action) actions.add(action);
    }
    return {
      throttle: Number(actions.has('forward')) - Number(actions.has('back')),
      steering: Number(actions.has('left')) - Number(actions.has('right')),
      brake: actions.has('brake'),
      boost: actions.has('boost'),
      jump: actions.has('jump'),
    };
  }

  return { read, clear };
}
