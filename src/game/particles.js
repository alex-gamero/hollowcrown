// Lightweight particles. "glow" particles are drawn after lighting (always bright).
(function (HC) {
  'use strict';

  class Particles {
    constructor() { this.list = []; }
    clear() { this.list.length = 0; }
    add(p) {
      if (this.list.length > 900) this.list.shift();
      this.list.push(Object.assign({ vx: 0, vy: 0, life: 1, max: 1, size: 1, grav: 0, drag: 0, glow: true, color: '#ffffff' }, p, { max: p.life || 1 }));
    }
    burst(x, y, n, opts) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, sp = (opts.speed || 60) * (0.3 + Math.random() * 0.7);
        this.add(Object.assign({}, opts, {
          x: x + (Math.random() - 0.5) * (opts.spread || 4), y: y + (Math.random() - 0.5) * (opts.spread || 4),
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.8 - (opts.up || 0),
          life: (opts.life || 0.6) * (0.6 + Math.random() * 0.6),
          color: Array.isArray(opts.color) ? opts.color[(Math.random() * opts.color.length) | 0] : opts.color,
        }));
      }
    }
    update(dt) {
      const L = this.list;
      for (let i = L.length - 1; i >= 0; i--) {
        const p = L[i];
        p.life -= dt;
        if (p.life <= 0) { L.splice(i, 1); continue; }
        p.vy += p.grav * dt;
        if (p.drag) { p.vx *= 1 - p.drag * dt; p.vy *= 1 - p.drag * dt; }
        p.x += p.vx * dt; p.y += p.vy * dt;
      }
    }
    draw(ctx, glowLayer) {
      for (const p of this.list) {
        if (!!p.glow !== glowLayer) continue;
        const t = p.life / p.max;
        if (p.fade !== false && t < 0.35 && Math.random() > t / 0.35) continue; // dithered fade-out
        ctx.fillStyle = p.color;
        const s = p.size > 1 && t < 0.5 ? p.size - 1 : p.size;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), s, s);
      }
    }
  }

  HC.Particles = Particles;
})(window.HC);
