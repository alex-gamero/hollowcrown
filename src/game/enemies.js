// Monsters of the hollow castle.
(function (HC) {
  'use strict';

  class Enemy {
    constructor(x, y, opts) {
      this.x = x; this.y = y;
      this.hp = this.maxHp = opts.hp;
      this.w = opts.w || 12; this.h = opts.h || 6;
      this.frames = opts.frames;
      this.frame = 0; this.animT = 0;
      this.kx = 0; this.ky = 0;
      this.flash = 0; this.dead = false;
      this.spawnT = 0.7;
      this.contact = opts.contact !== undefined ? opts.contact : 1;
      this.heavy = opts.heavy || 1;
      this.flip = false;
      this.t = Math.random() * 10;
    }
    get rect() { return { x: this.x - this.w / 2, y: this.y - this.h, w: this.w, h: this.h }; }
    get hurtRect() { const s = this.frames[0]; return { x: this.x - s.w / 2 + 3, y: this.y - s.h + 2, w: s.w - 6, h: s.h - 2 }; }

    damage(n, dx, dy, g) {
      if (this.dead || this.spawnT > 0) return;
      this.hp -= n;
      this.flash = 0.1;
      this.kx = dx * 160 / this.heavy; this.ky = dy * 160 / this.heavy;
      HC.audio.play('hit');
      g.hitstop(0.04); g.shake(2, 0.1);
      g.particles.burst(this.x, this.y - this.frames[0].h / 2, 8, { color: ['#ece4d4', '#aa9e90', '#ffffff'], speed: 70, life: 0.35, glow: false });
      if (this.hp <= 0) this.die(g);
    }
    die(g) {
      this.dead = true;
      HC.audio.play('kill');
      const cy = this.y - this.frames[0].h / 2;
      g.particles.burst(this.x, cy, 26, { color: ['#2a1f3c', '#181026', '#3c2e52'], speed: 50, life: 0.9, glow: false, up: 20 });
      g.particles.burst(this.x, cy, 10, { color: ['#ff2a3c', '#ffc0c8'], speed: 40, life: 0.5 });
      g.onEnemyKilled(this);
    }
    baseUpdate(dt, g) {
      this.t += dt;
      this.flash = Math.max(0, this.flash - dt);
      if (this.spawnT > 0) { this.spawnT -= dt; return false; }
      if (this.kx || this.ky) {
        g.moveEntity(this, this.kx * dt, this.ky * dt);
        this.kx *= 0.82; this.ky *= 0.82;
        if (Math.abs(this.kx) < 4) this.kx = 0;
        if (Math.abs(this.ky) < 4) this.ky = 0;
      }
      const p = g.player;
      if (this.contact && !p.dead && HC.overlap(this.hurtRect, p.hurtRect)) p.hurt(g, this.x, this.y);
      return true;
    }
    animate(dt, speed) { this.animT += dt; if (this.animT > speed) { this.animT = 0; this.frame = (this.frame + 1) % this.frames.length; } }
    sprite() { return this.frames[this.frame]; }
    shadow(ctx, w) {
      ctx.fillStyle = 'rgba(6,4,12,0.5)';
      ctx.fillRect(Math.round(this.x - w / 2), Math.round(this.y - 2), w, 3);
    }
    draw(ctx) {
      const s = this.sprite();
      if (this.spawnT > 0) {
        // materialize from the dark with a dithered reveal
        if (Math.random() > 1 - this.spawnT / 0.7) return;
      }
      this.shadow(ctx, s.w * 0.6);
      HC.sprites.draw(ctx, s, this.x, this.y, this.flash > 0 ? 'flash' : 'base', this.flip);
    }
    drawGlow(ctx) {
      if (this.spawnT > 0.35) return;
      HC.sprites.draw(ctx, this.sprite(), this.x, this.y, 'glow', this.flip);
    }
  }

  // Frozen while bathed in light; rushes forward in darkness.
  class Hollow extends Enemy {
    constructor(x, y, tier) { super(x, y, { hp: 3 + tier, frames: HC.art.hollow, w: 12, h: 6, heavy: 1.3 }); this.frozen = false; this.speed = 62 + tier * 8; }
    update(dt, g) {
      if (!this.baseUpdate(dt, g)) return;
      const p = g.player;
      const lit = HC.light.levelAt(this.x, this.y - 28, g.lights, g.theme.ambient);
      const wasFrozen = this.frozen;
      this.frozen = lit > 0.42;
      if (this.frozen && !wasFrozen && Math.random() < 0.3) HC.audio.play('whisper');
      if (!this.frozen && !p.dead) {
        const dx = p.x - this.x, dy = p.y - this.y, l = Math.hypot(dx, dy) || 1;
        g.moveEntity(this, (dx / l) * this.speed * dt, (dy / l) * this.speed * dt);
        this.flip = dx < 0;
        this.animate(dt, 0.2);
      }
    }
    draw(ctx) {
      // a frozen Hollow trembles very slightly
      const ox = this.frozen ? (Math.random() < 0.15 ? (Math.random() < 0.5 ? -1 : 1) : 0) : 0;
      this.x += ox; super.draw(ctx); this.x -= ox;
    }
    drawGlow(ctx) {
      // its pale mask is faintly visible even in full darkness
      if (this.spawnT <= 0.35) HC.sprites.draw(ctx, this.sprite(), this.x, this.y, 'base', this.flip, 0.14);
      super.drawGlow(ctx);
    }
  }

  // Waits, then lunges.
  class Skitter extends Enemy {
    constructor(x, y, tier) { super(x, y, { hp: 2 + Math.floor(tier / 2), frames: HC.art.skitter, w: 14, h: 6, heavy: 0.8 }); this.state = 'wait'; this.timer = 0.5 + Math.random(); this.dir = [0, 0]; this.tier = tier; }
    update(dt, g) {
      if (!this.baseUpdate(dt, g)) return;
      const p = g.player;
      this.timer -= dt;
      if (this.state === 'wait') {
        this.animate(dt, 0.3);
        if (this.timer <= 0 && !p.dead) {
          this.state = 'lunge'; this.timer = 0.32;
          const dx = p.x - this.x + (Math.random() - 0.5) * 30, dy = p.y - this.y + (Math.random() - 0.5) * 30, l = Math.hypot(dx, dy) || 1;
          this.dir = [dx / l, dy / l]; this.flip = dx < 0;
        }
      } else {
        this.animate(dt, 0.05);
        const sp = 190 + this.tier * 15;
        const moved = g.moveEntity(this, this.dir[0] * sp * dt, this.dir[1] * sp * dt);
        if (this.timer <= 0 || !moved) { this.state = 'wait'; this.timer = 0.6 + Math.random() * 0.7; }
      }
    }
  }

  // Floats at a distance and weeps orbs of darkness.
  class Lament extends Enemy {
    constructor(x, y, tier) { super(x, y, { hp: 3 + tier, frames: HC.art.lament, w: 12, h: 6, contact: 1 }); this.fireT = 1.5 + Math.random(); this.tier = tier; this.orbit = Math.random() < 0.5 ? 1 : -1; }
    update(dt, g) {
      if (!this.baseUpdate(dt, g)) return;
      const p = g.player;
      this.animate(dt, 0.25);
      const dx = p.x - this.x, dy = p.y - this.y, l = Math.hypot(dx, dy) || 1;
      const want = 110;
      let mx = (dx / l) * (l - want) * 0.8, my = (dy / l) * (l - want) * 0.8;
      mx += (-dy / l) * 25 * this.orbit; my += (dx / l) * 25 * this.orbit;
      const ml = Math.hypot(mx, my); const cap = 45;
      if (ml > cap) { mx = (mx / ml) * cap; my = (my / ml) * cap; }
      if (!g.moveEntity(this, mx * dt, my * dt)) this.orbit *= -1;
      this.flip = dx < 0;
      this.fireT -= dt;
      if (this.fireT <= 0 && !p.dead) {
        this.fireT = 2.4 - Math.min(0.9, this.tier * 0.2);
        const base = Math.atan2(dy, dx);
        const n = this.tier >= 2 ? 5 : 3;
        for (let i = 0; i < n; i++) {
          const a = base + (i - (n - 1) / 2) * 0.28;
          g.spawnOrb(this.x, this.y - 16, Math.cos(a) * 85, Math.sin(a) * 85);
        }
        HC.audio.play('shoot');
      }
    }
    draw(ctx) { const oy = Math.round(Math.sin(this.t * 3) * 2); this.y += oy - 6; super.draw(ctx); this.y -= oy - 6; }
    drawGlow(ctx) { const oy = Math.round(Math.sin(this.t * 3) * 2); this.y += oy - 6; super.drawGlow(ctx); this.y -= oy - 6; }
    shadow(ctx, w) { ctx.fillStyle = 'rgba(6,4,12,0.35)'; ctx.fillRect(Math.round(this.x - w / 2), Math.round(this.y + 4), w, 2); }
  }

  // Boss: the Hollow King.
  class King extends Enemy {
    constructor(x, y, tier) {
      super(x, y, { hp: 46 + tier * 22, frames: HC.art.king, w: 30, h: 10, heavy: 6 });
      this.tier = tier; this.state = 'intro'; this.timer = 1.6; this.pattern = 0; this.isBoss = true; this.spawnT = 0;
      this.charge = [0, 0];
    }
    get hurtRect() { return { x: this.x - 18, y: this.y - 62, w: 36, h: 62 }; }
    update(dt, g) {
      if (!this.baseUpdate(dt, g)) return;
      const p = g.player;
      this.timer -= dt;
      const enraged = this.hp < this.maxHp / 2;
      if (this.state === 'intro') { if (this.timer <= 0) { this.state = 'drift'; this.timer = 1.2; } return; }
      if (this.state === 'drift') {
        const tx = HC.clamp(p.x, 120, 360), ty = HC.ROOM.floorTop + 70;
        g.moveEntity(this, (tx - this.x) * 0.9 * dt, (ty - this.y) * 0.9 * dt);
        if (this.timer <= 0) {
          const moves = ['ring', 'summon', 'charge', enraged ? 'ring' : 'charge'];
          this.state = moves[this.pattern++ % moves.length];
          this.timer = this.state === 'charge' ? 0.8 : 0.6;
          if (this.state === 'charge') HC.audio.play('boss');
        }
      } else if (this.state === 'ring') {
        if (this.timer <= 0) {
          const n = enraged ? 18 : 12, off = Math.random();
          for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + off; g.spawnOrb(this.x, this.y - 34, Math.cos(a) * 75, Math.sin(a) * 75); }
          if (enraged) for (let i = 0; i < n; i++) { const a = ((i + 0.5) / n) * Math.PI * 2 + off; g.spawnOrb(this.x, this.y - 34, Math.cos(a) * 55, Math.sin(a) * 55); }
          HC.audio.play('shoot'); g.shake(3, 0.2);
          this.state = 'drift'; this.timer = enraged ? 1.1 : 1.6;
        }
      } else if (this.state === 'summon') {
        if (this.timer <= 0) {
          const n = enraged ? 3 : 2;
          for (let i = 0; i < n; i++) g.spawnEnemy('skitter', this.x + (i - (n - 1) / 2) * 40, this.y + 20, this.tier);
          g.darkPulse = 2.2;
          this.state = 'drift'; this.timer = 1.8;
        }
      } else if (this.state === 'charge') {
        if (this.timer > 0) {
          this.charge = [p.x - this.x, p.y - this.y];
          if (Math.random() < 0.5) g.particles.add({ x: this.x + (Math.random() - 0.5) * 30, y: this.y - Math.random() * 50, vy: -30, life: 0.5, color: '#ff2a3c' });
        } else {
          const l = Math.hypot(this.charge[0], this.charge[1]) || 1;
          const sp = enraged ? 260 : 210;
          const moved = g.moveEntity(this, (this.charge[0] / l) * sp * dt, (this.charge[1] / l) * sp * dt);
          if (this.timer < -0.7 || !moved) { this.state = 'drift'; this.timer = 1.3; g.shake(4, 0.25); }
        }
      }
    }
    draw(ctx) {
      const ox = this.state === 'charge' && this.timer > 0 ? Math.round((Math.random() - 0.5) * 2) : 0;
      const oy = Math.round(Math.sin(this.t * 1.5) * 1.5);
      ctx.fillStyle = 'rgba(6,4,12,0.5)'; ctx.fillRect(Math.round(this.x - 20), Math.round(this.y - 3), 40, 4);
      HC.sprites.draw(ctx, this.sprite(), this.x + ox, this.y + oy, this.flash > 0 ? 'flash' : 'base');
    }
    drawGlow(ctx) {
      const oy = Math.round(Math.sin(this.t * 1.5) * 1.5);
      HC.sprites.draw(ctx, this.sprite(), this.x, this.y + oy, 'base', false, 0.12);
      HC.sprites.draw(ctx, this.sprite(), this.x, this.y + oy, 'glow');
    }
    die(g) {
      super.die(g);
      g.particles.burst(this.x, this.y - 30, 80, { color: ['#ffd650', '#fff7d0', '#ff2a3c', '#ece4d4'], speed: 140, life: 1.4 });
      g.shake(8, 0.6);
    }
  }

  HC.ENEMIES = { hollow: Hollow, skitter: Skitter, lament: Lament, king: King };
})(window.HC);
