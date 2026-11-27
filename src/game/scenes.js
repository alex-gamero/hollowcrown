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
    items() { const a = HC.meta.affordable(); return ['BEGIN', 'ALTAR OF DAWN' + (a ? ' (' + a + ')' : ''), 'SOUND: ' + (HC.audio.muted ? 'OFF' : 'ON')]; }
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
      F.draw(ctx, 'SHARDS ' + sv.shards + '   DEEPEST ROOM ' + sv.best + (sv.kingsSlain ? '   BOSSES SLAIN ' + sv.kingsSlain : '') + (sv.greenKeys ? '   GREEN KEYS ' + sv.greenKeys : ''), HC.W / 2, 259, '#3a8a9a', { align: 'center' });
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

  // After a death: stats, then a gift for the next run, then where to go.
  class Dead {
    constructor(stats) {
      this.s = stats; this.t = 0; this.phase = 'stats'; this.sel = 0;
      this.power = HC.meta.giftPower();
      this.gifts = HC.GIFTS.slice().sort(() => Math.random() - 0.5).slice(0, 3);
    }
    update(dt) {
      this.t += dt;
      const go = I.pressed('confirm') || I.pressed('attack');
      if (this.phase === 'stats') { if (this.t > 1.4 && go) { this.phase = 'gift'; this.sel = 1; HC.audio.play('confirm'); } return; }
      if (this.phase === 'gift') {
        if (I.pressed('left')) { this.sel = (this.sel + 2) % 3; HC.audio.play('select'); }
        if (I.pressed('right')) { this.sel = (this.sel + 1) % 3; HC.audio.play('select'); }
        if (go) {
          HC.save.pendingGift = { id: this.gifts[this.sel].id, power: this.power }; HC.meta.save();
          HC.audio.play('blessing'); this.phase = 'menu'; this.sel = 0;
        }
        return;
      }
      const n = 3;
      if (I.pressed('up') || I.pressed('left')) { this.sel = (this.sel + n - 1) % n; HC.audio.play('select'); }
      if (I.pressed('down') || I.pressed('right')) { this.sel = (this.sel + 1) % n; HC.audio.play('select'); }
      if (go) {
        HC.audio.play('confirm');
        if (this.sel === 0) HC.scenes.set(new HC.Game((Math.random() * 1e9) >>> 0));
        else if (this.sel === 1) HC.scenes.set(new Altar());
        else HC.scenes.set(new Title());
      }
    }
    draw(ctx) {
      ctx.fillStyle = '#030206'; ctx.fillRect(0, 0, HC.W, HC.H);
      ctx.globalAlpha = Math.min(1, this.t);
      F.draw(ctx, 'THE LIGHT FADES', HC.W / 2, 22, '#ffd650', { align: 'center', scale: 2, shadow: '#3a2408' });
      const s = this.s;
      [['ROOM REACHED', s.room], ['MONSTERS BANISHED', s.kills], ['SHARDS KEPT', '+' + s.shards + '  (TOTAL ' + HC.save.shards + ')'], ['DEEPEST ROOM', s.best]].forEach(([k, v], i) => {
        if (this.t < 0.3 + i * 0.2) return;
        F.draw(ctx, k, 130, 52 + i * 12, '#8a7a9a');
        F.draw(ctx, String(v), HC.W - 130, 52 + i * 12, '#e8dcc0', { align: 'right' });
      });
      if (s.record && Math.floor(this.t * 3) % 2) F.draw(ctx, 'A NEW DEPTH!', HC.W / 2, 104, '#ff8a5a', { align: 'center' });
      if (this.phase === 'stats') {
        if (this.t > 1.4) F.draw(ctx, 'PRESS J', HC.W / 2, 240, '#6a5a7e', { align: 'center' });
      } else {
        F.draw(ctx, this.phase === 'gift' ? 'THE DAWN OFFERS A GIFT FOR YOUR NEXT RUN' + (this.power > 1 ? ' - X2 (YOU KEEP FALLING)' : '') : 'GIFT CHOSEN', HC.W / 2, 120, '#c8b0ff', { align: 'center' });
        this.gifts.forEach((g, i) => {
          const x = HC.W / 2 + (i - 1) * 140, y = 136, on = this.phase === 'gift' ? this.sel === i : HC.save.pendingGift && HC.save.pendingGift.id === g.id;
          ctx.fillStyle = on ? '#2a2040' : '#120c1c'; ctx.fillRect(x - 62, y, 124, 46);
          ctx.fillStyle = on ? '#ffd650' : '#3a2a4a'; ctx.fillRect(x - 62, y, 124, 1); ctx.fillRect(x - 62, y + 45, 124, 1); ctx.fillRect(x - 62, y, 1, 46); ctx.fillRect(x + 61, y, 1, 46);
          F.draw(ctx, g.name, x, y + 10, on ? '#fff7d0' : '#8a7a9a', { align: 'center' });
          F.draw(ctx, g.desc + (this.power > 1 ? ' X2' : ''), x, y + 26, on ? '#ffd650' : '#5a4a6a', { align: 'center' });
        });
        if (this.phase === 'menu') {
          const aff = HC.meta.affordable();
          ['RISE AGAIN', 'ALTAR OF DAWN' + (aff ? '  (' + aff + ' UPGRADE' + (aff > 1 ? 'S' : '') + ' READY)' : ''), 'TITLE'].forEach((t, i) => {
            F.draw(ctx, (this.sel === i ? '> ' : '') + t, HC.W / 2, 200 + i * 14, this.sel === i ? '#fff7d0' : i === 1 && aff ? '#a8f6ff' : '#6a5a7e', { align: 'center' });
          });
        } else F.draw(ctx, '< >  CHOOSE    J  CONFIRM', HC.W / 2, 200, '#6a5a7e', { align: 'center' });
      }
      ctx.globalAlpha = 1;
    }
  }

  // Beating the Hollow Crown.
  class Victory {
    constructor(game) { this.g = game; this.t = 0; this.sel = 0; this.particles = new HC.Particles(); HC.save.victories++; HC.meta.save(); HC.audio.play('blessing'); }
    update(dt) {
      this.t += dt;
      if (Math.random() < 0.8) this.particles.add({ x: Math.random() * HC.W, y: HC.H + 2, vy: -20 - Math.random() * 30, vx: (Math.random() - 0.5) * 10, life: 6, color: Math.random() < 0.5 ? '#ffd650' : '#fff7d0' });
      this.particles.update(dt);
      if (this.t < 2) return;
      if (I.pressed('up') || I.pressed('down')) { this.sel ^= 1; HC.audio.play('select'); }
      if (I.pressed('confirm') || I.pressed('attack')) {
        HC.audio.play('confirm');
        const g = this.g;
        if (this.sel === 0) {
          const pd = g.pending; g.enterRoom(pd.number, pd.risky, pd.entry, pd.special); g.fade = 1; g.fadeDir = -1;
          HC.audio.startDrone(g.theme.drone); HC.scenes.set(g);
        } else {
          const run = g.run, sv = HC.save;
          sv.shards += run.shards; sv.best = Math.max(sv.best, run.room); sv.runs++; sv.streak = 0; HC.meta.save();
          HC.scenes.set(new Title());
        }
      }
    }
    draw(ctx) {
      ctx.fillStyle = '#0a0612'; ctx.fillRect(0, 0, HC.W, HC.H);
      this.particles.draw(ctx, true);
      const sun = HC.art.sun;
      HC.sprites.draw(ctx, sun, HC.W / 2, 20 + sun.h, 'glow');
      ctx.globalAlpha = Math.min(1, this.t);
      F.draw(ctx, 'THE SUN REMEMBERS', HC.W / 2, 96, '#ffd650', { align: 'center', scale: 2, shadow: '#5a3a10' });
      F.draw(ctx, 'THE CROWN IS BROKEN. FOR NOW, THE SPIRE IS QUIET.', HC.W / 2, 122, '#a89ab8', { align: 'center' });
      F.draw(ctx, 'ROOMS ' + this.g.run.room + '   MONSTERS ' + this.g.run.kills + '   SHARDS ' + this.g.run.shards, HC.W / 2, 140, '#e8dcc0', { align: 'center' });
      if (this.t > 2) ['CONTINUE INTO THE DARK (ENDLESS)', 'RETURN TO THE TITLE'].forEach((t, i) => F.draw(ctx, (this.sel === i ? '> ' : '') + t, HC.W / 2, 186 + i * 14, this.sel === i ? '#fff7d0' : '#6a5a7e', { align: 'center' }));
      ctx.globalAlpha = 1;
    }
  }

  let current = null;
  HC.scenes = {
    set(s) { current = s; if (!(s instanceof HC.Game)) HC.audio.stopDrone(); },
    get current() { return current; },
    Title, Altar, Dead, Victory,
    victory(game) { this.set(new Victory(game)); },
    endRun(game) {
      const run = game.run, sv = HC.save;
      const record = run.room > sv.best;
      sv.streak = record ? 0 : sv.streak + 1;
      sv.shards += run.shards; sv.best = Math.max(sv.best, run.room); sv.runs++;
      HC.meta.save();
      this.set(new Dead({ room: run.room, kills: run.kills, shards: run.shards, best: sv.best, record }));
    },
  };
})(window.HC);
