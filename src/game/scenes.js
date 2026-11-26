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

  class Title {
    constructor() {
      this.t = 0; this.sel = 0;
      this.particles = new HC.Particles();
      this.glow1 = glowDisc(70, 'rgba(255,214,120,0.10)');
      this.glow2 = glowDisc(40, 'rgba(255,240,190,0.16)');
    }
    items() { return ['BEGIN', 'ALTAR OF DAWN', 'SOUND: ' + (HC.audio.muted ? 'OFF' : 'ON')]; }
    update(dt) {
      this.t += dt;
      if (Math.random() < 0.5) this.particles.add({ x: HC.W / 2 + (Math.random() - 0.5) * 60, y: 160 + Math.random() * 20, vx: (Math.random() - 0.5) * 8, vy: -12 - Math.random() * 14, life: 2 + Math.random() * 2, color: Math.random() < 0.5 ? '#fff7d0' : '#ffe48a' });
      if (Math.random() < 0.08) this.particles.add({ x: Math.random() * HC.W, y: Math.random() * HC.H, vy: 2, life: 4, color: '#3a2a5a' });
      this.particles.update(dt);
      const n = this.items().length;
      if (I.pressed('up')) { this.sel = (this.sel + n - 1) % n; HC.audio.play('select'); }
      if (I.pressed('down')) { this.sel = (this.sel + 1) % n; HC.audio.play('select'); }
      if (I.pressed('confirm') || I.pressed('attack')) {
        HC.audio.play('confirm');
        if (this.sel === 0) HC.scenes.set(new HC.Game((Math.random() * 1e9) >>> 0));
        else if (this.sel === 1) HC.scenes.set(new Altar());
        else HC.audio.toggleMute();
      }
    }
    draw(ctx) {
      ctx.fillStyle = '#07040e'; ctx.fillRect(0, 0, HC.W, HC.H);
      const pulse = Math.sin(this.t * 1.5) * 2;
      ctx.drawImage(this.glow1, HC.W / 2 - 70, 112 - 70 + pulse);
      ctx.drawImage(this.glow2, HC.W / 2 - 40, 116 - 40);
      this.particles.draw(ctx, true);
      // the princess, drawn at 2x
      const s = HC.art.princess.down[0];
      ctx.drawImage(s.base, HC.W / 2 - s.w, 148 - s.h * 2 + Math.round(Math.sin(this.t * 2) * 2), s.w * 2, s.h * 2);
      F.draw(ctx, 'HOLLOWCROWN', HC.W / 2, 26, '#ffd650', { align: 'center', scale: 3, shadow: '#5a3a10' });
      F.draw(ctx, 'A PRINCESS OF LIGHT. A CASTLE THAT FORGOT THE SUN.', HC.W / 2, 56, '#8a7a9a', { align: 'center' });
      this.items().forEach((t, i) => {
        const on = this.sel === i;
        F.draw(ctx, (on ? '> ' : '') + t + (on ? ' <' : ''), HC.W / 2, 178 + i * 14, on ? '#fff7d0' : '#6a5a7e', { align: 'center' });
      });
      const sv = HC.save;
      F.draw(ctx, 'SHARDS ' + sv.shards + '    DEEPEST ROOM ' + sv.best + (sv.kingsSlain ? '    KINGS SLAIN ' + sv.kingsSlain : ''), HC.W / 2, 230, '#5ad4e8', { align: 'center' });
      F.draw(ctx, 'WASD MOVE   J SLASH   K DASH   E USE', HC.W / 2, 252, '#4a3a5a', { align: 'center' });
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
