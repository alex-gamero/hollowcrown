// Hollowcrown — core helpers shared by every module.
// Plain scripts (no bundler) so the game runs by opening index.html directly.
window.HC = window.HC || {};
(function (HC) {
  'use strict';

  HC.W = 480;            // internal resolution
  HC.H = 270;
  HC.HUD_H = 18;         // HUD band at the top of the screen
  HC.DT = 1 / 60;        // fixed update step

  HC.hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  HC.rgb = (c) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
  HC.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  HC.lerp = (a, b, t) => a + (b - a) * t;
  HC.dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  HC.approach = (v, target, step) => (v < target ? Math.min(v + step, target) : Math.max(v - step, target));

  // Seeded RNG (mulberry32) so a run can be replayed from its seed.
  HC.makeRng = function (seed) {
    let s = seed >>> 0;
    const r = function () {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.int = (a, b) => a + Math.floor(r() * (b - a + 1));
    r.pick = (arr) => arr[Math.floor(r() * arr.length)];
    r.chance = (p) => r() < p;
    r.range = (a, b) => a + r() * (b - a);
    r.shuffle = (arr) => {
      for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
      return arr;
    };
    return r;
  };

  HC.makeCanvas = function (w, h, readback) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d', readback ? { willReadFrequently: true } : undefined);
    ctx.imageSmoothingEnabled = false;
    return [c, ctx];
  };

  // Axis-aligned rectangle overlap.
  HC.overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
})(window.HC);
