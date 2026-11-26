// Keyboard + gamepad input with "pressed this frame" tracking.
(function (HC) {
  'use strict';

  const BINDINGS = {
    up: ['KeyW', 'ArrowUp'],
    down: ['KeyS', 'ArrowDown'],
    left: ['KeyA', 'ArrowLeft'],
    right: ['KeyD', 'ArrowRight'],
    attack: ['KeyJ', 'KeyZ'],
    dash: ['KeyK', 'KeyX', 'Space', 'ShiftLeft'],
    interact: ['KeyE', 'KeyL', 'KeyC'],
    confirm: ['Enter', 'KeyJ', 'KeyZ', 'Space'],
    back: ['Escape', 'Backspace'],
    pause: ['Escape', 'KeyP'],
  };
  const PAD = { attack: [2], dash: [0, 5], interact: [3], confirm: [0], back: [1], pause: [9] };

  const down = new Set();
  const tapped = new Set(); // keys pressed and released between two updates still count
  let held = {}, prev = {};
  let anyKeyHandler = null;

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    down.add(e.code); tapped.add(e.code);
    if (anyKeyHandler) anyKeyHandler();
  });
  window.addEventListener('keyup', (e) => down.delete(e.code));
  window.addEventListener('blur', () => down.clear());
  window.addEventListener('pointerdown', () => { if (anyKeyHandler) anyKeyHandler(); });

  HC.input = {
    onAnyKey(fn) { anyKeyHandler = fn; },
    update() {
      prev = held;
      held = {};
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      const pad = pads && Array.from(pads).find((p) => p);
      for (const action in BINDINGS) {
        let on = BINDINGS[action].some((k) => down.has(k) || tapped.has(k));
        if (pad && PAD[action]) on = on || PAD[action].some((b) => pad.buttons[b] && pad.buttons[b].pressed);
        held[action] = on;
      }
      if (pad) {
        const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
        if (ax < -0.4 || (pad.buttons[14] && pad.buttons[14].pressed)) held.left = true;
        if (ax > 0.4 || (pad.buttons[15] && pad.buttons[15].pressed)) held.right = true;
        if (ay < -0.4 || (pad.buttons[12] && pad.buttons[12].pressed)) held.up = true;
        if (ay > 0.4 || (pad.buttons[13] && pad.buttons[13].pressed)) held.down = true;
      }
      tapped.clear();
    },
    held: (a) => !!held[a],
    pressed: (a) => !!held[a] && !prev[a],
    axis() {
      let x = (held.right ? 1 : 0) - (held.left ? 1 : 0);
      let y = (held.down ? 1 : 0) - (held.up ? 1 : 0);
      if (x && y) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
      return { x, y };
    },
  };
})(window.HC);
