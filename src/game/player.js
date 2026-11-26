// The princess: moves, slashes with a blade of light, dashes through danger.
(function (HC) {
  'use strict';
  const I = HC.input;

  const DIRS = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };

  class Player {
    constructor(x, y) {
      this.x = x; this.y = y;
      this.vx = 0; this.vy = 0;
      this.facing = 'up';
      this.walkT = 0; this.frame = 0; this.moving = false;
      this.attackT = 0; this.attackCd = 0; this.hitSet = new Set();
      this.dashT = 0; this.dashCd = 0; this.dashDir = [0, -1];
      this.invuln = 0; this.hurtFlash = 0;
      this.ghosts = [];
      this.moteT = 0;
      this.dead = false;
      this.w = 10; this.h = 6;
    }
    get rect() { return { x: this.x - this.w / 2, y: this.y - this.h, w: this.w, h: this.h }; }
    get hurtRect() { return { x: this.x - 6, y: this.y - 22, w: 12, h: 22 }; }

    attackBox(run) {
      const r = run.reach, d = DIRS[this.facing];
      const cx = this.x + d[0] * 16 * r, cy = this.y - 12 + d[1] * 15 * r;
      const w = (d[0] ? 26 : 34) * r, h = (d[0] ? 30 : 24) * r;
      return { x: cx - w / 2, y: cy - h / 2, w, h };
    }

    update(dt, g) {
      const run = g.run;
      this.invuln = Math.max(0, this.invuln - dt);
      this.hurtFlash = Math.max(0, this.hurtFlash - dt);
      this.attackCd = Math.max(0, this.attackCd - dt);
      this.dashCd = Math.max(0, this.dashCd - dt);
      for (const gh of this.ghosts) gh.life -= dt;
      this.ghosts = this.ghosts.filter((gh) => gh.life > 0);
      if (this.dead) return;

      const ax = I.axis();
      this.moving = !!(ax.x || ax.y);
      if (this.moving && this.attackT <= 0) {
        if (Math.abs(ax.x) > Math.abs(ax.y) + 0.01) this.facing = ax.x > 0 ? 'right' : 'left';
        else if (ax.y) this.facing = ax.y > 0 ? 'down' : 'up';
      }

      // dash
      if (I.pressed('dash') && this.dashCd <= 0 && this.dashT <= 0) {
        this.dashDir = this.moving ? [ax.x, ax.y] : DIRS[this.facing];
        const len = Math.hypot(this.dashDir[0], this.dashDir[1]) || 1;
        this.dashDir = [this.dashDir[0] / len, this.dashDir[1] / len];
        this.dashT = 0.16; this.dashCd = run.dashCd; this.invuln = Math.max(this.invuln, 0.22);
        HC.audio.play('dash');
        g.particles.burst(this.x, this.y - 4, 10, { color: ['#fff7d0', '#ffe48a'], speed: 40, life: 0.4, glow: true });
      }

      // attack
      if (I.pressed('attack') && this.attackCd <= 0 && this.dashT <= 0) {
        this.attackT = 0.22; this.attackCd = 0.34; this.hitSet.clear();
        HC.audio.play('slash');
      }

      let speed = run.speed * (this.attackT > 0 ? 0.45 : 1);
      if (this.dashT > 0) {
        this.dashT -= dt;
        this.vx = this.dashDir[0] * 280; this.vy = this.dashDir[1] * 280;
        if (Math.random() < 0.6) this.ghosts.push({ x: this.x, y: this.y, spr: this.sprite(), flip: this.facing === 'left', life: 0.25 });
      } else {
        this.vx = ax.x * speed; this.vy = ax.y * speed;
      }
      g.moveEntity(this, this.vx * dt, this.vy * dt, true);

      if (this.attackT > 0) {
        this.attackT -= dt;
        const box = this.attackBox(run);
        for (const e of g.enemies) {
          if (e.dead || this.hitSet.has(e)) continue;
          if (HC.overlap(box, e.hurtRect)) {
            this.hitSet.add(e);
            const kx = e.x - this.x, ky = e.y - this.y, kl = Math.hypot(kx, ky) || 1;
            e.damage(run.damage, kx / kl, ky / kl, g);
          }
        }
        for (const p of g.projectiles) {
          if (!p.dead && p.hostile && HC.overlap(box, { x: p.x - 3, y: p.y - 3, w: 6, h: 6 })) {
            p.dead = true; g.particles.burst(p.x, p.y, 6, { color: ['#fff7d0', '#c8b0ff'], speed: 50, life: 0.3 });
          }
        }
      }

      // animation
      if (this.moving) {
        this.walkT += dt;
        if (this.walkT > 0.17) { this.walkT = 0; this.frame ^= 1; }
      } else { this.frame = 0; this.walkT = 0.12; }

      // drifting motes of light
      this.moteT -= dt;
      if (this.moteT <= 0) {
        this.moteT = 0.09;
        g.particles.add({ x: this.x + (Math.random() - 0.5) * 18, y: this.y - 4 - Math.random() * 24, vx: (Math.random() - 0.5) * 6, vy: -10 - Math.random() * 10, life: 1 + Math.random(), color: Math.random() < 0.5 ? '#fff7d0' : '#ffe48a', glow: true });
      }
    }

    hurt(g, fromX, fromY) {
      if (this.invuln > 0 || this.dead) return false;
      const run = g.run;
      run.hp--;
      this.invuln = 1.1; this.hurtFlash = 0.15;
      const kx = this.x - fromX, ky = this.y - fromY, kl = Math.hypot(kx, ky) || 1;
      g.moveEntity(this, (kx / kl) * 14, (ky / kl) * 14, true);
      HC.audio.play('hurt');
      g.shake(5, 0.25); g.hitstop(0.08);
      g.particles.burst(this.x, this.y - 12, 14, { color: ['#ff6a7a', '#ffe48a', '#ffffff'], speed: 80, life: 0.5 });
      if (run.thorns) {
        for (const e of g.enemies) if (!e.dead && HC.dist(e.x, e.y, this.x, this.y) < 60) e.damage(run.thorns, 0, 0, g);
      }
      if (run.hp <= 0) { this.dead = true; g.onPlayerDeath(); }
      return true;
    }

    sprite() {
      const A = HC.art.princess;
      const set = this.facing === 'up' ? A.up : this.facing === 'down' ? A.down : A.side;
      return set[this.frame];
    }

    lightRadius(run) {
      const f = run.light / run.lightMax;
      return (70 + 85 * f) * run.radiusMul;
    }

    draw(ctx) {
      const s = this.sprite(), flip = this.facing === 'left';
      const bob = this.moving && this.frame ? -1 : 0;
      if (this.dead) return;
      if (this.invuln > 0 && this.dashT <= 0 && Math.floor(this.invuln * 20) % 2) return;
      // soft shadow
      ctx.fillStyle = 'rgba(6,4,12,0.45)';
      ctx.fillRect(Math.round(this.x - 8), Math.round(this.y - 2), 16, 3);
      ctx.fillRect(Math.round(this.x - 6), Math.round(this.y - 3), 12, 5);
      HC.sprites.draw(ctx, s, this.x, this.y + bob, this.hurtFlash > 0 ? 'flash' : 'base', flip);
    }

    // After lighting: afterimages, a soft luminous overlay and the blade of light.
    drawGlow(ctx, run, t) {
      for (const gh of this.ghosts) HC.sprites.draw(ctx, gh.spr, gh.x, gh.y, 'base', gh.flip, gh.life * 1.6 * 0.5);
      if (!this.dead && !(this.invuln > 0 && this.dashT <= 0 && Math.floor(this.invuln * 20) % 2)) {
        const bob = this.moving && this.frame ? -1 : 0;
        HC.sprites.draw(ctx, this.sprite(), this.x, this.y + bob, 'base', this.facing === 'left', 0.55);
      }
      if (this.attackT > 0) {
        const p = 1 - this.attackT / 0.22;
        const d = DIRS[this.facing], base = Math.atan2(d[1], d[0]);
        const r = run.reach, cx = this.x, cy = this.y - 12;
        const sweep = Math.PI * 1.1, a0 = base - sweep / 2, a1 = a0 + sweep * Math.min(1, p * 1.6);
        for (let a = a0; a <= a1; a += 0.05) {
          const fade = (a - a0) / (a1 - a0 + 0.001);
          for (let rr = 12; rr <= 22; rr++) {
            const edge = rr >= 20 ? '#ffffff' : rr >= 16 ? '#fff3a6' : '#ffd24a';
            if (rr < 15 && fade < 0.6) continue;
            if (p > 0.6 && Math.random() < (p - 0.6) * 2.5) continue;
            ctx.fillStyle = edge;
            ctx.fillRect(Math.round(cx + Math.cos(a) * rr * r), Math.round(cy + Math.sin(a) * rr * r * 0.9), 1, 1);
          }
        }
      }
    }
  }

  HC.Player = Player;
})(window.HC);
