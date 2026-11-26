// Title screen, upgrade altar, and the end-of-run screen.
(function (HC) {
  'use strict';
  const I = HC.input, F = HC.font;

  // Dithered glow disc, reused by menus.
  function glowDisc(r, color) {
    const [c, ctx] = HC.makeCanvas(r * 2, r * 2);
    const B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    ctx.fillStyle = color;
    for (let y = 0; y < r * 2; y++) for (let x = 0; x < r * 2; x++) {
      const d = Math.hypot(x - r, y - r) / r;
      if (d < 1 && Math.pow(1 - d, 1.6) * 16 > B[(y & 3) * 4 + (x & 3)] + 0.5) ctx.fillRect(x, y, 1, 1);
    }
    return c;
  }

  // Night sky, distant hills and the silhouette of the hollow castle.
  function buildBackdrop() {
    const [c, ctx] = HC.makeCanvas(HC.W, HC.H);
    const rng = HC.makeRng(2026);
    const B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    const top = HC.hex('#05030b'), hor = HC.hex('#24143a');
    for (let y = 0; y < HC.H; y++) for (let x = 0; x < HC.W; x++) {
      const t = Math.min(1, y / 210) ** 1.6;
      const band = Math.floor(t * 6), frac = t * 6 - band;
      const tt = (band + (frac * 16 > B[(y & 3) * 4 + (x & 3)] ? 1 : 0)) / 6;
      ctx.fillStyle = HC.rgb(top.map((v, i) => v + (hor[i] - v) * tt));
      ctx.fillRect(x, y, 1, 1);
    }
    for (let i = 0; i < 70; i++) { ctx.fillStyle = rng() < 0.2 ? '#8a7aa8' : '#3a3050'; ctx.fillRect(rng.int(0, HC.W), rng.int(0, 150), 1, 1); }
    // hills
    const hill = (base, amp, freq, col, seed) => {
      ctx.fillStyle = col;
      for (let x = 0; x < HC.W; x++) {
        const h = base - Math.round(Math.sin(x * freq + seed) * amp + Math.sin(x * freq * 2.7 + seed * 2) * amp * 0.4);
        ctx.fillRect(x, h, 1, HC.H - h);
      }
    };
    hill(198, 10, 0.013, '#140c22', 1);
    // castle
    const wall = '#0d0818', rim = '#2a1e40', win = '#7a4a20';
    ctx.fillStyle = wall; ctx.fillRect(130, 160, 220, 70);
    for (let x = 130; x < 350; x += 8) ctx.fillRect(x, 156, 5, 4);
    const tower = (x, w, h, roof) => {
      const y = 230 - h;
      ctx.fillStyle = wall; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = rim; ctx.fillRect(x, y, 1, h);
      if (roof) {
        for (let j = 0; j < roof; j++) { const ww = Math.round((w + 4) * (1 - j / roof)); ctx.fillStyle = wall; ctx.fillRect(Math.round(x + w / 2 - ww / 2), y - j, ww, 1); }
        ctx.fillStyle = rim; ctx.fillRect(Math.round(x + w / 2), y - roof - 3, 1, 4);
      } else for (let xx = x; xx < x + w; xx += 4) { ctx.fillStyle = wall; ctx.fillRect(xx, y - 3, 2, 3); }
      for (let n = 0; n < Math.floor(h / 22); n++) if (rng() < 0.55) { ctx.fillStyle = rng() < 0.4 ? '#c08030' : win; ctx.fillRect(Math.round(x + w / 2 - 1), y + 10 + n * 20, 2, 4); }
    };
    tower(118, 18, 92, 24); tower(150, 14, 70, 0); tower(182, 22, 120, 30); tower(276, 22, 112, 28); tower(316, 14, 76, 0); tower(344, 18, 98, 26);
    // the broken crown: central keep with jagged crenels
    ctx.fillStyle = wall; ctx.fillRect(214, 98, 52, 132);
    [[214, 8], [222, 14], [230, 6], [238, 18], [246, 7], [254, 12], [262, 4]].forEach(([x, h]) => ctx.fillRect(x, 98 - h, 4, h));
    ctx.fillStyle = rim; ctx.fillRect(214, 98, 1, 132);
    // great gate
    ctx.fillStyle = '#05030a'; ctx.fillRect(228, 196, 24, 34);
    for (let j = 0; j < 12; j++) { const ww = Math.round(24 * Math.sqrt(1 - (j / 12) ** 2)); ctx.fillRect(240 - ww / 2, 196 - j, ww, 1); }
    ctx.fillStyle = '#3a1830'; ctx.fillRect(238, 206, 1, 1); ctx.fillRect(242, 206, 1, 1);
    // foreground ground + path to the gate
    ctx.fillStyle = '#0a0612'; ctx.fillRect(0, 226, HC.W, HC.H - 226);
    for (let y = 226; y < HC.H; y++) {
      const w = 24 + (y - 226) * 2.2;
      for (let x = Math.round(240 - w / 2); x < 240 + w / 2; x++) if (((x >> 1) + (y >> 1)) & 1 || rng() < 0.3) { ctx.fillStyle = (y - 226) % 9 === 0 ? '#100a1a' : '#1c1428'; ctx.fillRect(x, y, 1, 1); }
    }
    // dead trees at the sides
    const tree = (x, h, dir) => {
      ctx.fillStyle = '#07040c';
      let tx = x;
      for (let y = 0; y < h; y++) { ctx.fillRect(Math.round(tx), 236 - y, y < h * 0.3 ? 3 : 2, 1); tx += dir * 0.08; }
      for (let b = 0; b < 5; b++) {
        let bx = x + dir * h * 0.08 * (0.4 + b * 0.12), by = 236 - h * (0.45 + b * 0.1); const bd = b % 2 ? 1 : -1;
        for (let k = 0; k < 12 - b; k++) { ctx.fillRect(Math.round(bx), Math.round(by), 1, 1); bx += bd; by -= 0.6; }
      }
    };
    tree(40, 90, 1); tree(440, 100, -1); tree(78, 54, -1);
    return c;
  }

  class Title {
    constructor() {
      this.t = 0; this.sel = 0;
      this.particles = new HC.Particles();
      this.bg = buildBackdrop();
      this.glowSun = glowDisc(52, 'rgba(255,210,90,0.12)');
      this.glowP = glowDisc(46, 'rgba(255,240,190,0.14)');
      this.eyes = [{ x: 104, y: 214 }, { x: 392, y: 208 }, { x: 160, y: 222 }];
    }
    items() { return ['BEGIN', 'ALTAR OF DAWN', 'SOUND: ' + (HC.audio.muted ? 'OFF' : 'ON')]; }
    update(dt) {
      this.t += dt;
      if (Math.random() < 0.6) this.particles.add({ x: HC.W / 2 + (Math.random() - 0.5) * 50, y: 196 + Math.random() * 30, vx: (Math.random() - 0.5) * 10, vy: -10 - Math.random() * 16, life: 1.5 + Math.random() * 2, color: Math.random() < 0.5 ? '#fff7d0' : '#ffe48a' });
      if (Math.random() < 0.25) this.particles.add({ x: HC.W / 2 + (Math.random() - 0.5) * 70, y: 40 + (Math.random() - 0.5) * 60, vx: (Math.random() - 0.5) * 6, vy: -4, life: 1.5, color: '#ffd24a' });
      if (Math.random() < 0.3) this.particles.add({ x: Math.random() * HC.W, y: 236 + Math.random() * 30, vx: 6 + Math.random() * 6, life: 3, color: '#2a2040', glow: false });
      this.particles.update(dt);
      const n = this.items().length;
      if (I.pressed('left') || I.pressed('up')) { this.sel = (this.sel + n - 1) % n; HC.audio.play('select'); }
      if (I.pressed('right') || I.pressed('down')) { this.sel = (this.sel + 1) % n; HC.audio.play('select'); }
      if (I.pressed('confirm') || I.pressed('attack')) {
        HC.audio.play('confirm');
        if (this.sel === 0) HC.scenes.set(new HC.Game((Math.random() * 1e9) >>> 0));
        else if (this.sel === 1) HC.scenes.set(new Altar());
        else HC.audio.toggleMute();
      }
    }
    draw(ctx) {
      ctx.drawImage(this.bg, 0, 0);
      this.particles.draw(ctx, false);
      // red eyes blinking in the dark
      this.eyes.forEach((e, i) => {
        const open = Math.sin(this.t * 0.7 + i * 2.3) > -0.6 && Math.sin(this.t * 5 + i) > -0.97;
        if (!open) return;
        ctx.fillStyle = '#ff2a3c'; ctx.fillRect(e.x, e.y, 1, 1); ctx.fillRect(e.x + 3, e.y, 1, 1);
      });
      // the sun emblem
      const sun = HC.art.sun, bob = Math.round(Math.sin(this.t * 1.2) * 1.5);
      ctx.drawImage(this.glowSun, HC.W / 2 - 52, 40 - 52 + bob);
      HC.sprites.draw(ctx, sun, HC.W / 2, 8 + sun.h + bob, 'glow');
      F.draw(ctx, 'HOLLOWCROWN', HC.W / 2, 80, '#ffd650', { align: 'center', scale: 3, shadow: '#5a3a10' });
      F.draw(ctx, 'A PRINCESS OF LIGHT. A CASTLE THAT FORGOT THE SUN.', HC.W / 2, 108, '#a89ab8', { align: 'center', shadow: '#05030b' });
      // the princess, drawn at 2x in front of the gate
      ctx.drawImage(this.glowP, HC.W / 2 - 46, 196 - 46);
      this.particles.draw(ctx, true);
      const s = HC.art.princess.up[0];
      ctx.drawImage(s.base, HC.W / 2 - s.w, 236 - s.h * 2, s.w * 2, s.h * 2);
      // menu
      const items = this.items(), gap = 22;
      const widths = items.map((t) => F.measure(t)), total = widths.reduce((a, b) => a + b, 0) + gap * (items.length - 1);
      let x = HC.W / 2 - total / 2;
      ctx.fillStyle = 'rgba(5,3,11,0.65)'; ctx.fillRect(x - 14, 241, total + 28, 13);
      items.forEach((t, i) => {
        const on = this.sel === i;
        F.draw(ctx, t, x, 244, on ? '#fff7d0' : '#6a5a7e');
        if (on) { ctx.fillStyle = '#ffd650'; ctx.fillRect(x - 6, 246, 3, 3); ctx.fillRect(x + widths[i] + 3, 246, 3, 3); }
        x += widths[i] + gap;
      });
      const sv = HC.save;
      F.draw(ctx, 'SHARDS ' + sv.shards + '   DEEPEST ROOM ' + sv.best + (sv.kingsSlain ? '   KINGS SLAIN ' + sv.kingsSlain : ''), HC.W / 2, 259, '#3a8a9a', { align: 'center' });
    }
  }

  class Altar {
    constructor() { this.sel = 0; this.t = 0; this.msg = null; }
    update(dt) {
      this.t += dt;
      const n = HC.UPGRADES.length + 1;
      if (I.pressed('up')) { this.sel = (this.sel + n - 1) % n; HC.audio.play('select'); }
      if (I.pressed('down')) { this.sel = (this.sel + 1) % n; HC.audio.play('select'); }
      if (I.pressed('back')) { HC.scenes.set(new Title()); return; }
      if (I.pressed('confirm') || I.pressed('attack')) {
        if (this.sel === HC.UPGRADES.length) { HC.audio.play('select'); HC.scenes.set(new Title()); return; }
        const up = HC.UPGRADES[this.sel];
        if (HC.meta.buy(up)) { HC.audio.play('blessing'); this.msg = { text: up.name.toUpperCase() + ' AWAKENS', t: 1.6, ok: true }; }
        else { HC.audio.play('runeBad'); this.msg = { text: HC.meta.cost(up) === null ? 'ALREADY COMPLETE' : 'NOT ENOUGH SHARDS', t: 1.4 }; }
      }
      if (this.msg) { this.msg.t -= dt; if (this.msg.t <= 0) this.msg = null; }
    }
    draw(ctx) {
      ctx.fillStyle = '#07040e'; ctx.fillRect(0, 0, HC.W, HC.H);
      F.draw(ctx, 'ALTAR OF DAWN', HC.W / 2, 22, '#ffd650', { align: 'center', scale: 2, shadow: '#5a3a10' });
      F.draw(ctx, 'OFFER SHARDS. YOUR LIGHT WILL REMEMBER.', HC.W / 2, 46, '#8a7a9a', { align: 'center' });
      HC.sprites.draw(ctx, HC.art.shard, HC.W / 2 - 22, 72, 'glow');
      F.draw(ctx, String(HC.save.shards), HC.W / 2 - 14, 64, '#a8f6ff');
      HC.UPGRADES.forEach((up, i) => {
        const y = 92 + i * 30, on = this.sel === i;
        const lvl = HC.save.up[up.id], cost = HC.meta.cost(up);
        if (on) { ctx.fillStyle = '#1a1428'; ctx.fillRect(70, y - 5, HC.W - 140, 26); }
        F.draw(ctx, up.name, 84, y, on ? '#fff7d0' : '#a89ab8');
        F.draw(ctx, up.desc, 84, y + 10, '#6a5a7e');
        for (let k = 0; k < up.costs.length; k++) { ctx.fillStyle = k < lvl ? '#ffd650' : '#3a2a4a'; ctx.fillRect(300 + k * 8, y + 1, 5, 5); }
        F.draw(ctx, cost === null ? 'DONE' : String(cost), HC.W - 84, y, cost !== null && cost <= HC.save.shards ? '#a8f6ff' : '#5a4a6a', { align: 'right' });
      });
      const on = this.sel === HC.UPGRADES.length;
      F.draw(ctx, (on ? '> ' : '') + 'RETURN', HC.W / 2, 220, on ? '#fff7d0' : '#6a5a7e', { align: 'center' });
      if (this.msg) F.draw(ctx, this.msg.text, HC.W / 2, 246, this.msg.ok ? '#ffd650' : '#ff8a8a', { align: 'center' });
    }
  }

  class Dead {
    constructor(stats) { this.s = stats; this.t = 0; }
    update(dt) {
      this.t += dt;
      if (this.t > 1.2 && (I.pressed('confirm') || I.pressed('attack') || I.pressed('back'))) { HC.audio.play('confirm'); HC.scenes.set(new Title()); }
    }
    draw(ctx) {
      ctx.fillStyle = '#030206'; ctx.fillRect(0, 0, HC.W, HC.H);
      const a = Math.min(1, this.t);
      ctx.globalAlpha = a;
      F.draw(ctx, 'THE LIGHT FADES', HC.W / 2, 50, '#ffd650', { align: 'center', scale: 2, shadow: '#3a2408' });
      const s = this.s;
      const lines = [
        ['ROOM REACHED', s.room], ['MONSTERS BANISHED', s.kills], ['SHARDS GATHERED', '+' + s.shards],
        ['BLESSINGS', s.blessings || '-'], ['DEEPEST ROOM', s.best],
      ];
      lines.forEach(([k, v], i) => {
        if (this.t < 0.4 + i * 0.25) return;
        F.draw(ctx, k, 140, 100 + i * 16, '#8a7a9a');
        F.draw(ctx, String(v), HC.W - 140, 100 + i * 16, '#e8dcc0', { align: 'right' });
      });
      if (s.record && this.t > 1.8 && Math.floor(this.t * 3) % 2) F.draw(ctx, 'A NEW DEPTH!', HC.W / 2, 196, '#ff8a5a', { align: 'center' });
      if (this.t > 1.2) F.draw(ctx, 'PRESS J TO RISE AGAIN', HC.W / 2, 232, '#6a5a7e', { align: 'center' });
      ctx.globalAlpha = 1;
    }
  }

  let current = null;
  HC.scenes = {
    set(s) { current = s; if (!(s instanceof HC.Game)) HC.audio.stopDrone(); },
    get current() { return current; },
    Title, Altar, Dead,
    endRun(game) {
      const run = game.run, sv = HC.save;
      const record = run.room > sv.best;
      sv.shards += run.shards; sv.best = Math.max(sv.best, run.room); sv.runs++;
      HC.meta.save();
      this.set(new Dead({
        room: run.room, kills: run.kills, shards: run.shards, best: sv.best, record,
        blessings: run.blessings.length ? run.blessings.length + ' RECEIVED' : null,
      }));
    },
  };
})(window.HC);
