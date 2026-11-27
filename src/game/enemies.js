// Monsters of the hollow castle, grouped by wing.
(function (HC) {
  'use strict';
  const R = () => HC.ROOM;

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
      this.flying = !!opts.flying;
      this.flip = false; this.stun = 0;
      this.t = Math.random() * 10;
    }
    get rect() { return { x: this.x - this.w / 2, y: this.y - this.h, w: this.w, h: this.h }; }
    get hurtRect() { const s = this.frames[0]; return { x: this.x - s.w / 2 + 3, y: this.y - s.h + 2, w: s.w - 6, h: s.h - 2 }; }
    get targetable() { return this.spawnT <= 0; }
    get cy() { return this.y - this.frames[0].h / 2; }

    damage(n, dx, dy, g, src) {
      if (this.dead || !this.targetable) return false;
      this.hp -= n;
      this.flash = 0.1;
      this.kx = dx * 160 / this.heavy; this.ky = dy * 160 / this.heavy;
      if (src === 'bolt') this.stun = Math.max(this.stun, 0.6);
      HC.audio.play('hit');
      g.hitstop(0.04); g.shake(2, 0.1);
      g.particles.burst(this.x, this.cy, 8, { color: this.bloodColors || ['#ece4d4', '#aa9e90', '#ffffff'], speed: 70, life: 0.35, glow: false });
      if (this.hp <= 0) this.die(g);
      return true;
    }
    die(g) {
      this.dead = true;
      HC.audio.play('kill');
      g.particles.burst(this.x, this.cy, 26, { color: this.dustColors || ['#2a1f3c', '#181026', '#3c2e52'], speed: 50, life: 0.9, glow: false, up: 20 });
      g.particles.burst(this.x, this.cy, 10, { color: ['#ff2a3c', '#ffc0c8'], speed: 40, life: 0.5 });
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
      if (this.contact && this.targetable && !p.dead && HC.overlap(this.hurtRect, p.hurtRect)) p.hurt(g, this.x, this.y);
      if (this.stun > 0) { this.stun -= dt; return false; }
      return true;
    }
    toward(g, speed, dt) {
      const p = g.player, dx = p.x - this.x, dy = p.y - this.y, l = Math.hypot(dx, dy) || 1;
      this.flip = dx < 0;
      return g.moveEntity(this, (dx / l) * speed * dt, (dy / l) * speed * dt);
    }
    animate(dt, speed) { this.animT += dt; if (this.animT > speed) { this.animT = 0; this.frame = (this.frame + 1) % this.frames.length; } }
    sprite() { return this.frames[this.frame]; }
    shadow(ctx, w) { ctx.fillStyle = 'rgba(6,4,12,0.5)'; ctx.fillRect(Math.round(this.x - w / 2), Math.round(this.y - 2), Math.round(w), 3); }
    draw(ctx) {
      if (this.spawnT > 0 && Math.random() > 1 - this.spawnT / 0.7) return;
      const s = this.sprite();
      this.shadow(ctx, s.w * 0.6);
      HC.sprites.draw(ctx, s, this.x, this.y - (this.flying ? 6 : 0), this.flash > 0 ? 'flash' : 'base', this.flip);
    }
    drawGlow(ctx) {
      if (this.spawnT > 0.35) return;
      HC.sprites.draw(ctx, this.sprite(), this.x, this.y - (this.flying ? 6 : 0), 'glow', this.flip);
      if (this.stun > 0) { ctx.fillStyle = '#fff3a6'; const a = this.t * 8; ctx.fillRect(Math.round(this.x + Math.cos(a) * 6), Math.round(this.y - this.frames[0].h - 2), 1, 1); ctx.fillRect(Math.round(this.x - Math.cos(a) * 6), Math.round(this.y - this.frames[0].h - 2), 1, 1); }
    }
  }

  // ======================= WING I =======================
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
        if (!g.moveEntity(this, this.dir[0] * sp * dt, this.dir[1] * sp * dt) || this.timer <= 0) { this.state = 'wait'; this.timer = 0.6 + Math.random() * 0.7; }
      }
    }
  }

  // Frozen while bathed in light; rushes you in the dark.
  class Doll extends Enemy {
    constructor(x, y, tier) { super(x, y, { hp: 3 + tier, frames: HC.art.doll, w: 12, h: 6, heavy: 1.3 }); this.frozen = false; this.speed = 66 + tier * 8; }
    update(dt, g) {
      if (!this.baseUpdate(dt, g)) return;
      const lit = HC.light.levelAt(this.x, this.y - 20, g.lights, g.theme.ambient);
      const was = this.frozen;
      this.frozen = lit > 0.42;
      if (this.frozen && !was && Math.random() < 0.3) HC.audio.play('whisper');
      if (!this.frozen && !g.player.dead) { this.toward(g, this.speed, dt); this.animate(dt, 0.2); }
    }
    draw(ctx) { const ox = this.frozen && Math.random() < 0.15 ? (Math.random() < 0.5 ? -1 : 1) : 0; this.x += ox; super.draw(ctx); this.x -= ox; }
    drawGlow(ctx) { if (this.spawnT <= 0.35) HC.sprites.draw(ctx, this.sprite(), this.x, this.y, 'base', this.flip, 0.14); super.drawGlow(ctx); }
  }

  // Slow armored sentinel: winds up, then slams a shockwave, then needs a moment to recover.
  class Armor extends Enemy {
    constructor(x, y, tier) { super(x, y, { hp: 6 + tier * 2, frames: HC.art.armor, w: 14, h: 6, heavy: 4 }); this.state = 'walk'; this.timer = 2; this.tier = tier; this.bloodColors = ['#a8a2c0', '#6a6480', '#d9b050']; }
    update(dt, g) {
      if (!this.baseUpdate(dt, g)) { this.state = 'walk'; return; }
      const p = g.player, d = HC.dist(p.x, p.y, this.x, this.y);
      this.timer -= dt;
      if (this.state === 'walk') {
        this.toward(g, 26 + this.tier * 4, dt); this.animate(dt, 0.35);
        if (this.timer <= 0 && d < 100) { this.state = 'wind'; this.timer = 0.75; HC.audio.play('armor'); }
      } else if (this.state === 'wind') {
        if (this.timer <= 0) {
          this.state = 'walk'; this.timer = 2.4 - Math.min(1, this.tier * 0.25);
          g.addWave(this.x, this.y - 2, 78 + this.tier * 8, 150);
          g.shake(4, 0.25); HC.audio.play('slam');
          this.stun = 1.0; // open to attack right after the slam
        }
      }
    }
    draw(ctx) {
      const lift = this.state === 'wind' ? Math.round((1 - this.timer / 0.75) * 4) : 0;
      this.y -= lift; super.draw(ctx); this.y += lift;
    }
    drawGlow(ctx) {
      super.drawGlow(ctx);
      if (this.state === 'wind' && Math.floor(this.timer * 12) % 2) { ctx.fillStyle = '#ff2a3c'; ctx.fillRect(Math.round(this.x - 6), Math.round(this.y - 34), 12, 1); }
    }
  }

  // ======================= WING II =======================
  // Leafling: a torn page that flutters in flocks.
  class Page extends Enemy {
    constructor(x, y, tier) { super(x, y, { hp: 1 + (tier >= 3 ? 1 : 0), frames: HC.art.page, w: 8, h: 4, heavy: 0.6, flying: true }); this.phase = Math.random() * 6; this.speed = 62 + tier * 6; this.bloodColors = ['#ddd4b4', '#a89e80']; this.dustColors = ['#ddd4b4', '#a89e80', '#1a2a3a']; }
    update(dt, g) {
      if (!this.baseUpdate(dt, g)) return;
      const p = g.player, dx = p.x - this.x, dy = p.y - 10 - this.y, l = Math.hypot(dx, dy) || 1;
      const wob = Math.sin(this.t * 6 + this.phase) * 60;
      g.moveEntity(this, ((dx / l) * this.speed + (-dy / l) * wob) * dt, ((dy / l) * this.speed + (dx / l) * wob) * dt);
      this.flip = dx < 0; this.animate(dt, 0.1);
    }
  }

  // Ink Lurker: a puddle that rises when you come close, then sinks again.
  class Ink extends Enemy {
    constructor(x, y, tier) { super(x, y, { hp: 3 + tier, frames: HC.art.ink, w: 14, h: 6, heavy: 1.2 }); this.state = 'hidden'; this.timer = 1; this.tier = tier; this.contact = 0; this.bloodColors = ['#1e3a4e', '#0e1e2a', '#9ff3ff']; }
    get targetable() { return this.spawnT <= 0 && this.state !== 'hidden'; }
    update(dt, g) {
      if (!this.baseUpdate(dt, g)) return;
      const p = g.player, d = HC.dist(p.x, p.y, this.x, this.y);
      this.timer -= dt;
      if (this.state === 'hidden') {
        this.contact = 0;
        this.toward(g, 22, dt);
        if (d < 46 && this.timer <= 0) { this.state = 'rise'; this.timer = 0.45; HC.audio.play('splash'); }
      } else if (this.state === 'rise') {
        if (this.timer <= 0) { this.state = 'hunt'; this.timer = 2.6; this.contact = 1; }
      } else if (this.state === 'hunt') {
        this.toward(g, 70 + this.tier * 6, dt); this.animate(dt, 0.18);
        if (this.timer <= 0) { this.state = 'sink'; this.timer = 0.45; this.contact = 0; }
      } else if (this.state === 'sink' && this.timer <= 0) { this.state = 'hidden'; this.timer = 1.4; }
    }
    draw(ctx) {
      if (this.spawnT > 0 && Math.random() > 1 - this.spawnT / 0.7) return;
      if (this.state === 'hidden') { HC.sprites.draw(ctx, HC.art.puddle, this.x, this.y + 1); return; }
      const t = this.state === 'rise' ? 1 - this.timer / 0.45 : this.state === 'sink' ? this.timer / 0.45 : 1;
      const s = this.sprite(), h = Math.max(2, Math.round(s.h * t));
      HC.sprites.draw(ctx, HC.art.puddle, this.x, this.y + 1);
      ctx.drawImage(this.flash > 0 ? s.flash : s.base, 0, 0, s.w, h, Math.round(this.x - s.w / 2), Math.round(this.y - h), s.w, h);
    }
    drawGlow(ctx) {
      if (this.state === 'hidden') { if (Math.sin(this.t * 2) > 0.85) { ctx.fillStyle = '#9ff3ff'; ctx.fillRect(Math.round(this.x - 3), Math.round(this.y - 2), 1, 1); ctx.fillRect(Math.round(this.x + 2), Math.round(this.y - 2), 1, 1); } return; }
      if (this.state === 'hunt') super.drawGlow(ctx);
    }
  }

  // The Weeper: floats out of reach and hurls ink.
  class Weeper extends Enemy {
    constructor(x, y, tier) { super(x, y, { hp: 3 + tier, frames: HC.art.weeper, w: 12, h: 6, flying: true }); this.fireT = 1.5 + Math.random(); this.tier = tier; this.orbit = Math.random() < 0.5 ? 1 : -1; this.volley = 0; this.bloodColors = ['#3a6a76', '#1c3c46', '#9ff3ff']; }
    update(dt, g) {
      if (!this.baseUpdate(dt, g)) return;
      const p = g.player;
      this.animate(dt, 0.25);
      const dx = p.x - this.x, dy = p.y - this.y, l = Math.hypot(dx, dy) || 1;
      let mx = (dx / l) * (l - 110) * 0.8 + (-dy / l) * 25 * this.orbit, my = (dy / l) * (l - 110) * 0.8 + (dx / l) * 25 * this.orbit;
      const ml = Math.hypot(mx, my); if (ml > 45) { mx = (mx / ml) * 45; my = (my / ml) * 45; }
      if (!g.moveEntity(this, mx * dt, my * dt)) this.orbit *= -1;
      this.flip = dx < 0;
      this.fireT -= dt;
      if (this.fireT <= 0 && !p.dead) {
        this.fireT = 2.4 - Math.min(0.8, this.tier * 0.15);
        const base = Math.atan2(dy, dx);
        if (this.volley++ % 2 === 0) for (let i = -1; i <= 1; i++) g.shoot(this.x, this.y - 18, Math.cos(base + i * 0.3) * 85, Math.sin(base + i * 0.3) * 85, 'ink');
        else for (let i = 0; i < 4; i++) g.shoot(this.x, this.y - 18, Math.cos(base) * (60 + i * 18), Math.sin(base) * (60 + i * 18), 'ink');
        HC.audio.play('shoot');
      }
      if (Math.random() < 0.05) g.particles.add({ x: this.x + (Math.random() - 0.5) * 10, y: this.y - 4, vy: 30, life: 0.5, color: '#5ad4e8', glow: false });
    }
    shadow(ctx, w) { ctx.fillStyle = 'rgba(6,4,12,0.35)'; ctx.fillRect(Math.round(this.x - w / 2), Math.round(this.y + 2), Math.round(w), 2); }
    draw(ctx) { const oy = Math.round(Math.sin(this.t * 3) * 2); this.y += oy; super.draw(ctx); this.y -= oy; }
    drawGlow(ctx) { const oy = Math.round(Math.sin(this.t * 3) * 2); this.y += oy; super.drawGlow(ctx); this.y -= oy; }
  }

  // ======================= WING III =======================
  // Bone Hound: circles you, then darts in to bite.
  class Hound extends Enemy {
    constructor(x, y, tier) { super(x, y, { hp: 3 + tier, frames: HC.art.hound, w: 16, h: 6, heavy: 1 }); this.state = 'circle'; this.timer = 1.5 + Math.random(); this.ang = Math.random() * 6; this.dir = 1; this.tier = tier; this.bloodColors = ['#d6ccb6', '#8c8270']; this.dustColors = ['#d6ccb6', '#8c8270', '#3a3430']; }
    get hurtRect() { return { x: this.x - 10, y: this.y - 12, w: 20, h: 12 }; }
    update(dt, g) {
      if (!this.baseUpdate(dt, g)) return;
      const p = g.player;
      this.timer -= dt;
      if (this.state === 'circle') {
        this.ang += dt * 1.1 * this.dir;
        const tx = p.x + Math.cos(this.ang) * 75, ty = p.y + Math.sin(this.ang) * 55;
        const dx = tx - this.x, dy = ty - this.y, l = Math.hypot(dx, dy) || 1, sp = Math.min(85, l * 2);
        if (!g.moveEntity(this, (dx / l) * sp * dt, (dy / l) * sp * dt)) this.dir *= -1;
        this.flip = dx < 0; this.animate(dt, 0.1);
        if (this.timer <= 0) { this.state = 'crouch'; this.timer = 0.6; this.flip = p.x < this.x; HC.audio.play('bark'); }
      } else if (this.state === 'crouch') {
        if (this.timer <= 0) { this.state = 'bite'; this.timer = 0.32; const dx = p.x - this.x, dy = p.y - this.y, l = Math.hypot(dx, dy) || 1; this.bd = [dx / l, dy / l]; }
      } else {
        this.animate(dt, 0.05);
        if (!g.moveEntity(this, this.bd[0] * 200 * dt, this.bd[1] * 200 * dt) || this.timer <= 0) { this.state = 'circle'; this.timer = 2 + Math.random(); this.ang = Math.atan2(this.y - p.y, this.x - p.x); }
      }
    }
    draw(ctx) { const ox = this.state === 'crouch' ? Math.round((Math.random() - 0.5) * 2) : 0; this.x += ox; super.draw(ctx); this.x -= ox; }
    drawGlow(ctx) {
      super.drawGlow(ctx);
      if (this.state === 'crouch' && Math.floor(this.timer * 10) % 2 === 0) {
        ctx.fillStyle = '#ff3a4a'; ctx.fillRect(Math.round(this.x - 1), Math.round(this.y - 22), 2, 5); ctx.fillRect(Math.round(this.x - 1), Math.round(this.y - 15), 2, 2);
      }
    }
  }

  // Rootling: travels underground as a mound, then bursts up beneath you.
  class Root extends Enemy {
    constructor(x, y, tier) { super(x, y, { hp: 3 + tier, frames: HC.art.root, w: 12, h: 6, heavy: 1.5 }); this.state = 'under'; this.timer = 1.5; this.tier = tier; this.contact = 0; this.bloodColors = ['#5a4026', '#3a2a18', '#7a5a36']; }
    get targetable() { return this.spawnT <= 0 && this.state === 'up'; }
    update(dt, g) {
      if (!this.baseUpdate(dt, g)) return;
      const p = g.player;
      this.timer -= dt;
      if (this.state === 'under') {
        this.toward(g, 42 + this.tier * 4, dt);
        if (Math.random() < 0.3) g.particles.add({ x: this.x + (Math.random() - 0.5) * 8, y: this.y - 1, vy: -10, life: 0.4, color: '#5a4026', glow: false });
        if (this.timer <= 0 || HC.dist(p.x, p.y, this.x, this.y) < 8) { this.state = 'warn'; this.timer = 0.85; }
      } else if (this.state === 'warn') {
        if (this.timer <= 0) {
          this.state = 'up'; this.timer = 2.3;
          if (HC.dist(p.x, p.y, this.x, this.y) < 16) p.hurt(g, this.x, this.y + 4);
          g.particles.burst(this.x, this.y - 4, 12, { color: ['#5a4026', '#3a2a18'], speed: 70, life: 0.4, glow: false, up: 30 });
          g.shake(2, 0.12); HC.audio.play('slam');
        }
      } else if (this.state === 'up') {
        this.animate(dt, 0.2); this.contact = 1;
        if (this.timer <= 0) { this.state = 'under'; this.timer = 2 + Math.random(); this.contact = 0; }
      }
    }
    draw(ctx) {
      if (this.spawnT > 0 && Math.random() > 1 - this.spawnT / 0.7) return;
      if (this.state === 'under') { HC.sprites.draw(ctx, HC.art.mound, this.x, this.y + 1); return; }
      if (this.state === 'warn') {
        // a widening ring of cracks marks where it will burst out
        const k = 1 - this.timer / 0.85;
        ctx.fillStyle = '#1a120a';
        for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + 0.4; ctx.fillRect(Math.round(this.x + Math.cos(a) * (6 + k * 8)), Math.round(this.y - 2 + Math.sin(a) * (3 + k * 4)), 2, 1); }
        HC.sprites.draw(ctx, HC.art.mound, this.x + (Math.random() < 0.5 ? 1 : -1), this.y + 1);
        return;
      }
      super.draw(ctx);
    }
    drawGlow(ctx) {
      if (this.state === 'up') super.drawGlow(ctx);
      if (this.state === 'warn') {
        const k = 1 - this.timer / 0.85;
        ctx.fillStyle = Math.floor(this.timer * 12) % 2 ? '#d8ff6a' : '#8aa040';
        for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; ctx.fillRect(Math.round(this.x + Math.cos(a) * 15), Math.round(this.y - 2 + Math.sin(a) * 7), 1, 1); }
        if (k > 0.5) { ctx.fillStyle = '#d8ff6a'; ctx.fillRect(Math.round(this.x - 1), Math.round(this.y - 4), 2, 2); }
      }
    }
  }

  // Thorn Bloom: rooted in place, spits thorns in every direction.
  class Bloom extends Enemy {
    constructor(x, y, tier) { super(x, y, { hp: 5 + tier, frames: HC.art.bloom, w: 14, h: 8, heavy: 99 }); this.fireT = 1.5 + Math.random(); this.tier = tier; this.volley = 0; this.bloodColors = ['#7a1a2a', '#b0283c', '#4a5a2e']; }
    update(dt, g) {
      if (!this.baseUpdate(dt, g)) return;
      this.kx = this.ky = 0;
      this.fireT -= dt;
      this.frame = this.fireT < 0.45 ? 1 : 0;
      if (this.fireT <= 0) {
        this.fireT = 2.6 - Math.min(0.9, this.tier * 0.2);
        const n = 8 + (this.tier >= 3 ? 4 : 0), off = (this.volley++ % 2) * Math.PI / n;
        for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + off; g.shoot(this.x, this.y - 9, Math.cos(a) * 80, Math.sin(a) * 80, 'thorn'); }
        HC.audio.play('shoot');
      }
    }
    draw(ctx) { const sq = this.fireT < 0.45 && Math.floor(this.fireT * 20) % 2 ? 1 : 0; this.x += sq; super.draw(ctx); this.x -= sq; }
  }

  // ======================= WING IV =======================
  // Shade: only visible when your light touches it.
  class Shade extends Enemy {
    constructor(x, y, tier) { super(x, y, { hp: 3 + tier, frames: HC.art.shade, w: 10, h: 6 }); this.tier = tier; this.vis = 0; this.bloodColors = ['#1e1830', '#0e0a16', '#ffffff']; }
    update(dt, g) {
      if (!this.baseUpdate(dt, g)) return;
      const lit = HC.light.levelAt(this.x, this.y - 14, g.lights, g.theme.ambient);
      this.vis = HC.approach(this.vis, lit > 0.45 ? 1 : 0, dt * 3);
      this.toward(g, lit > 0.45 ? 42 : 88 + this.tier * 6, dt);
      this.animate(dt, 0.2);
    }
    draw(ctx) {
      if (this.spawnT > 0) return;
      if (this.vis > 0.05) { ctx.globalAlpha = this.vis; HC.sprites.draw(ctx, this.sprite(), this.x, this.y, this.flash > 0 ? 'flash' : 'base', this.flip); ctx.globalAlpha = 1; }
    }
    drawGlow(ctx) { if (this.spawnT <= 0) HC.sprites.draw(ctx, this.sprite(), this.x, this.y, 'glow', this.flip, 0.35 + this.vis * 0.65); }
  }

  // Eclipse Eye: stares, then fires a beam.
  class Eye extends Enemy {
    constructor(x, y, tier) { super(x, y, { hp: 4 + tier, frames: HC.art.eye, w: 12, h: 6, flying: true, contact: 1 }); this.state = 'drift'; this.timer = 1.5 + Math.random(); this.tier = tier; this.aim = 0; this.bloodColors = ['#5b3fd0', '#9a7cff', '#e8e0f0']; }
    update(dt, g) {
      if (!this.baseUpdate(dt, g)) { this.state = 'drift'; return; }
      const p = g.player, dx = p.x - this.x, dy = p.y - 12 - (this.y - 14), l = Math.hypot(dx, dy) || 1;
      this.timer -= dt;
      if (this.state === 'drift') {
        g.moveEntity(this, ((dx / l) * (l - 100) * 0.6 + Math.cos(this.t) * 20) * dt, ((dy / l) * (l - 100) * 0.6 + Math.sin(this.t * 1.3) * 20) * dt);
        this.frame = 0;
        if (this.timer <= 0) { this.state = 'stare'; this.timer = 1.0; HC.audio.play('charge'); }
      } else if (this.state === 'stare') {
        this.aim = Math.atan2(dy, dx); this.frame = 1;
        if (this.timer <= 0) { this.state = 'fire'; this.timer = 0.35; HC.audio.play('beam'); }
      } else if (this.state === 'fire') {
        const ex = this.x, ey = this.y - 14, ux = Math.cos(this.aim), uy = Math.sin(this.aim);
        const px = p.x - ex, py = p.y - 12 - ey, along = px * ux + py * uy, perp = Math.abs(px * uy - py * ux);
        if (along > 0 && perp < 6) p.hurt(g, ex, ey);
        if (this.timer <= 0) { this.state = 'drift'; this.timer = 2 + Math.random() - Math.min(0.8, this.tier * 0.15); }
      }
    }
    drawGlow(ctx) {
      super.drawGlow(ctx);
      if (this.state === 'stare' || this.state === 'fire') {
        const ex = this.x, ey = this.y - 14, ux = Math.cos(this.aim), uy = Math.sin(this.aim);
        const thick = this.state === 'fire';
        for (let s = 8; s < 520; s += thick ? 1 : 3) {
          const x = Math.round(ex + ux * s), y = Math.round(ey + uy * s);
          if (x < 0 || x > HC.W || y < HC.HUD_H || y > HC.H) break;
          ctx.fillStyle = thick ? (s % 4 < 2 ? '#e0d0ff' : '#9a7cff') : '#5b3fd0';
          ctx.fillRect(x, y, 1, 1);
          if (thick) { ctx.fillRect(Math.round(x - uy), Math.round(y + ux), 1, 1); ctx.fillRect(Math.round(x + uy), Math.round(y - ux), 1, 1); }
        }
      }
    }
  }

  // The Hollow Self: your dark reflection. It mirrors your movement across the room.
  class Self extends Enemy {
    constructor(x, y, tier) { super(x, y, { hp: 5 + tier, frames: HC.art.self.down, w: 10, h: 6 }); this.facing = 'down'; this.cd = 1; this.atk = 0; this.tier = tier; this.walk = 0; this.wf = 0; this.bloodColors = ['#d8d4e0', '#2a2236']; }
    get hurtRect() { return { x: this.x - 6, y: this.y - 22, w: 12, h: 22 }; }
    update(dt, g) {
      if (!this.baseUpdate(dt, g)) return;
      const p = g.player, Rm = R();
      const tx = Rm.floorLeft + Rm.floorRight - p.x, ty = p.y;
      const near = HC.dist(p.x, p.y, this.x, this.y) < 70;
      const gx = near ? p.x : tx, gy = near ? p.y : ty;
      const dx = gx - this.x, dy = gy - this.y, l = Math.hypot(dx, dy);
      if (l > 4) {
        const sp = near ? 70 + this.tier * 6 : 110;
        g.moveEntity(this, (dx / l) * sp * dt, (dy / l) * sp * dt);
        if (Math.abs(dx) > Math.abs(dy)) this.facing = dx > 0 ? 'right' : 'left'; else this.facing = dy > 0 ? 'down' : 'up';
        this.walk += dt; if (this.walk > 0.17) { this.walk = 0; this.wf ^= 1; }
      }
      this.cd -= dt;
      if (this.atk > 0) {
        this.atk -= dt;
        if (this.atk < 0.12 && !this.hitDone) {
          this.hitDone = true;
          if (HC.dist(p.x, p.y, this.x, this.y) < 30) p.hurt(g, this.x, this.y);
        }
      } else if (this.cd <= 0 && HC.dist(p.x, p.y, this.x, this.y) < 28) { this.atk = 0.4; this.cd = 1.1; this.hitDone = false; HC.audio.play('slash'); }
    }
    sprite() { const A = HC.art.self; const set = this.facing === 'up' ? A.up : this.facing === 'down' ? A.down : A.side; return set[this.wf]; }
    draw(ctx) {
      if (this.spawnT > 0 && Math.random() > 1 - this.spawnT / 0.7) return;
      this.shadow(ctx, 14);
      HC.sprites.draw(ctx, this.sprite(), this.x, this.y, this.flash > 0 ? 'flash' : 'base', this.facing === 'left');
    }
    drawGlow(ctx) {
      if (this.spawnT > 0.35) return;
      HC.sprites.draw(ctx, this.sprite(), this.x, this.y, 'glow', this.facing === 'left');
      if (this.atk > 0 && this.atk < 0.25) {
        ctx.fillStyle = '#ff2a3c';
        for (let a = 0; a < 20; a++) { const ang = (a / 20) * Math.PI * 2; if (Math.random() < 0.6) ctx.fillRect(Math.round(this.x + Math.cos(ang) * 20), Math.round(this.y - 12 + Math.sin(ang) * 16), 1, 1); }
      }
    }
  }

  // ======================= BOSSES =======================
  class Boss extends Enemy {
    constructor(x, y, opts) { super(x, y, opts); this.isBoss = true; this.spawnT = 0; this.state = 'intro'; this.timer = 1.6; this.pattern = 0; }
    get enraged() { return this.hp < this.maxHp / 2; }
    die(g) {
      super.die(g);
      g.particles.burst(this.x, this.y - 30, 90, { color: ['#ffd650', '#fff7d0', '#ff2a3c', '#ece4d4'], speed: 150, life: 1.4 });
      g.shake(8, 0.6);
    }
  }

  class King extends Boss {
    constructor(x, y, tier) { super(x, y, { hp: 46 + tier * 22, frames: HC.art.king, w: 30, h: 10, heavy: 6 }); this.tier = tier; this.charge = [0, 0]; this.name = 'THE HOLLOW KING'; }
    get hurtRect() { return { x: this.x - 18, y: this.y - 62, w: 36, h: 62 }; }
    update(dt, g) {
      if (!this.baseUpdate(dt, g)) return;
      const p = g.player;
      this.timer -= dt;
      if (this.state === 'intro') { if (this.timer <= 0) { this.state = 'drift'; this.timer = 1.2; } return; }
      if (this.state === 'drift') {
        const tx = HC.clamp(p.x, 120, 360), ty = R().floorTop + 70;
        g.moveEntity(this, (tx - this.x) * 0.9 * dt, (ty - this.y) * 0.9 * dt);
        if (this.timer <= 0) {
          const moves = ['ring', 'summon', 'charge', this.enraged ? 'ring' : 'charge'];
          this.state = moves[this.pattern++ % moves.length];
          this.timer = this.state === 'charge' ? 0.8 : 0.6;
          if (this.state === 'charge') HC.audio.play('boss');
        }
      } else if (this.state === 'ring') {
        if (this.timer <= 0) {
          const n = this.enraged ? 18 : 12, off = Math.random();
          for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + off; g.shoot(this.x, this.y - 34, Math.cos(a) * 75, Math.sin(a) * 75, 'orb'); }
          if (this.enraged) for (let i = 0; i < n; i++) { const a = ((i + 0.5) / n) * Math.PI * 2 + off; g.shoot(this.x, this.y - 34, Math.cos(a) * 55, Math.sin(a) * 55, 'orb'); }
          HC.audio.play('shoot'); g.shake(3, 0.2);
          this.state = 'drift'; this.timer = this.enraged ? 1.1 : 1.6;
        }
      } else if (this.state === 'summon') {
        if (this.timer <= 0) {
          const n = this.enraged ? 3 : 2;
          for (let i = 0; i < n; i++) g.spawnEnemy('skitter', this.x + (i - (n - 1) / 2) * 40, this.y + 20, this.tier);
          g.darkPulse = 2.2;
          this.state = 'drift'; this.timer = 1.8;
        }
      } else if (this.state === 'charge') {
        if (this.timer > 0) {
          this.charge = [p.x - this.x, p.y - this.y];
          if (Math.random() < 0.5) g.particles.add({ x: this.x + (Math.random() - 0.5) * 30, y: this.y - Math.random() * 50, vy: -30, life: 0.5, color: '#ff2a3c' });
        } else {
          const l = Math.hypot(this.charge[0], this.charge[1]) || 1, sp = this.enraged ? 260 : 210;
          if (!g.moveEntity(this, (this.charge[0] / l) * sp * dt, (this.charge[1] / l) * sp * dt) || this.timer < -0.7) { this.state = 'drift'; this.timer = 1.3; g.shake(4, 0.25); }
        }
      }
    }
    draw(ctx) {
      const ox = this.state === 'charge' && this.timer > 0 ? Math.round((Math.random() - 0.5) * 2) : 0, oy = Math.round(Math.sin(this.t * 1.5) * 1.5);
      ctx.fillStyle = 'rgba(6,4,12,0.5)'; ctx.fillRect(Math.round(this.x - 20), Math.round(this.y - 3), 40, 4);
      HC.sprites.draw(ctx, this.sprite(), this.x + ox, this.y + oy, this.flash > 0 ? 'flash' : 'base');
    }
    drawGlow(ctx) {
      const oy = Math.round(Math.sin(this.t * 1.5) * 1.5);
      HC.sprites.draw(ctx, this.sprite(), this.x, this.y + oy, 'base', false, 0.3);
      HC.sprites.draw(ctx, this.sprite(), this.x, this.y + oy, 'glow');
    }
  }

  // The Archivist: floats along the top of the room, unleashing pages and ink.
  class Archivist extends Boss {
    constructor(x, y, tier) { super(x, y, { hp: 60 + tier * 18, frames: HC.art.archivist, w: 30, h: 10, heavy: 8, flying: true }); this.tier = tier; this.name = 'THE ARCHIVIST'; this.spin = 0; this.bloodColors = ['#3a6a76', '#d8d0b0', '#9ff3ff']; }
    get hurtRect() { return { x: this.x - 20, y: this.y - 64, w: 40, h: 62 }; }
    update(dt, g) {
      if (!this.baseUpdate(dt, g)) return;
      const p = g.player;
      this.timer -= dt;
      const tx = HC.W / 2 + Math.sin(this.t * 0.5) * 130, ty = R().floorTop + 60;
      g.moveEntity(this, (tx - this.x) * 1.2 * dt, (ty - this.y) * 1.2 * dt);
      if (this.state === 'intro') { if (this.timer <= 0) { this.state = 'idle'; this.timer = 1; } return; }
      if (this.state === 'idle' && this.timer <= 0) {
        const moves = ['pages', 'wave', 'spiral', 'wave'];
        this.state = moves[this.pattern++ % moves.length];
        this.timer = this.state === 'spiral' ? 2.2 : 0.7; this.spin = 0;
      }
      if (this.state === 'pages' && this.timer <= 0) {
        for (let i = 0; i < (this.enraged ? 5 : 4); i++) g.spawnEnemy('page', this.x + (i - 2) * 22, this.y - 20, this.tier);
        this.state = 'idle'; this.timer = 1.8;
      } else if (this.state === 'wave' && this.timer <= 0) {
        // a wall of ink falls from the top with a single gap to slip through
        const gap = HC.clamp(p.x + (Math.random() - 0.5) * 120, 60, 420);
        for (let x = R().floorLeft + 8; x < R().floorRight; x += 14) if (Math.abs(x - gap) > 22) g.shoot(x, R().floorTop + 4, 0, 70 + (this.enraged ? 20 : 0), 'ink');
        HC.audio.play('shoot');
        this.state = 'idle'; this.timer = this.enraged ? 1.0 : 1.5;
      } else if (this.state === 'spiral') {
        this.spin += dt;
        if (this.spin > 0.12) { this.spin = 0; const a = this.t * 4; for (let k = 0; k < (this.enraged ? 3 : 2); k++) { const b = a + (k * Math.PI * 2) / (this.enraged ? 3 : 2); g.shoot(this.x, this.y - 40, Math.cos(b) * 80, Math.sin(b) * 80, 'ink'); } }
        if (this.timer <= 0) { this.state = 'idle'; this.timer = 1.4; }
      }
    }
    shadow(ctx) { ctx.fillStyle = 'rgba(6,4,12,0.4)'; ctx.fillRect(Math.round(this.x - 18), Math.round(this.y + 4), 36, 3); }
    draw(ctx) { const oy = Math.round(Math.sin(this.t * 2) * 2); this.shadow(ctx); HC.sprites.draw(ctx, this.sprite(), this.x, this.y + oy, this.flash > 0 ? 'flash' : 'base'); }
    drawGlow(ctx) { const oy = Math.round(Math.sin(this.t * 2) * 2); HC.sprites.draw(ctx, this.sprite(), this.x, this.y + oy, 'base', false, 0.35); HC.sprites.draw(ctx, this.sprite(), this.x, this.y + oy, 'glow'); }
  }

  // The Gardener: stalks you and reaps with its scythe.
  class Gardener extends Boss {
    constructor(x, y, tier) { super(x, y, { hp: 70 + tier * 18, frames: HC.art.gardener, w: 24, h: 8, heavy: 8 }); this.tier = tier; this.name = 'THE GARDENER'; this.swing = 0; this.dirA = 0; this.bloodColors = ['#8a7050', '#2a3020', '#a89060']; }
    get hurtRect() { return { x: this.x - 16, y: this.y - 60, w: 32, h: 60 }; }
    update(dt, g) {
      if (!this.baseUpdate(dt, g)) return;
      const p = g.player, d = HC.dist(p.x, p.y, this.x, this.y);
      this.timer -= dt;
      if (this.state === 'intro') { if (this.timer <= 0) { this.state = 'walk'; this.timer = 1.5; } return; }
      if (this.state === 'walk') {
        this.toward(g, this.enraged ? 50 : 38, dt);
        this.dirA = Math.atan2(p.y - 10 - (this.y - 30), p.x - this.x);
        if (d < 64 && this.timer <= 0) { this.state = 'raise'; this.timer = 0.6; HC.audio.play('armor'); }
        else if (this.timer <= -1.5) { this.state = this.pattern++ % 2 ? 'thorns' : 'roots'; this.timer = 0.5; }
      } else if (this.state === 'raise') {
        if (this.timer <= 0) { this.state = 'reap'; this.timer = 0.3; this.swing = 0; HC.audio.play('slash'); }
      } else if (this.state === 'reap') {
        this.swing = 1 - this.timer / 0.3;
        const ang = Math.atan2(p.y - 10 - (this.y - 30), p.x - this.x);
        let diff = Math.abs(((ang - this.dirA + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        if (d < 62 && diff < Math.PI * 0.6) p.hurt(g, this.x, this.y);
        if (this.timer <= 0) { this.state = 'walk'; this.timer = this.enraged ? 0.8 : 1.4; }
      } else if (this.state === 'thorns' && this.timer <= 0) {
        const n = this.enraged ? 20 : 14;
        for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + Math.random() * 0.2; g.shoot(this.x, this.y - 30, Math.cos(a) * 85, Math.sin(a) * 85, 'thorn'); }
        HC.audio.play('shoot'); this.state = 'walk'; this.timer = 1.2;
      } else if (this.state === 'roots' && this.timer <= 0) {
        for (let i = 0; i < (this.enraged ? 3 : 2); i++) g.spawnEnemy('root', p.x + (Math.random() - 0.5) * 120, p.y + (Math.random() - 0.5) * 60, this.tier);
        this.state = 'walk'; this.timer = 1.4;
      }
    }
    drawScythe(ctx, glow) {
      const hx = this.x + Math.cos(this.dirA) * 14, hy = this.y - 34;
      let a = this.dirA - 1.3;
      if (this.state === 'raise') a = this.dirA - 2.2;
      if (this.state === 'reap') a = this.dirA - 2.2 + this.swing * 3.6;
      const ux = Math.cos(a), uy = Math.sin(a);
      if (!glow) {
        ctx.fillStyle = '#3a2a1a';
        for (let s = -10; s < 30; s++) ctx.fillRect(Math.round(hx + ux * s), Math.round(hy + uy * s), 1, 1);
      }
      const bx = hx + ux * 30, by = hy + uy * 30;
      ctx.fillStyle = glow ? (this.state === 'raise' ? '#ff6a1e' : '#c8c0b0') : '#8a8478';
      for (let k = 0; k < 20; k++) {
        const b = a + Math.PI / 2 + (k / 20) * 1.4;
        const r = 4 + k * 1.1;
        ctx.fillRect(Math.round(bx + Math.cos(b) * r * 0.9 - ux * k * 0.6), Math.round(by + Math.sin(b) * r * 0.9 - uy * k * 0.6), 1, 1);
      }
    }
    draw(ctx) { this.shadow(ctx, 26); this.drawScythe(ctx, false); HC.sprites.draw(ctx, this.sprite(), this.x, this.y, this.flash > 0 ? 'flash' : 'base'); }
    drawGlow(ctx) { HC.sprites.draw(ctx, this.sprite(), this.x, this.y, 'base', false, 0.3); HC.sprites.draw(ctx, this.sprite(), this.x, this.y, 'glow'); if (this.state === 'raise' || this.state === 'reap') this.drawScythe(ctx, true); }
  }

  // The Hollow Crown: the final boss. Orbited by masks; slams down and swallows the light.
  class Crown extends Boss {
    constructor(x, y, tier) {
      super(x, y, { hp: 90 + tier * 15, frames: HC.art.crown, w: 36, h: 10, heavy: 10, flying: true });
      this.tier = tier; this.name = 'THE HOLLOW CROWN'; this.lift = 0; this.slamT = [0, 0];
      this.masks = [0, 1, 2, 3].map((i) => ({ a: (i / 4) * Math.PI * 2, hp: 3, fire: 1 + i * 0.6, dead: false, respawn: 0 }));
      this.bloodColors = ['#e0b850', '#8a6424', '#ff2a3c'];
    }
    get hurtRect() { return { x: this.x - 22, y: this.y - 26 - this.lift, w: 44, h: 26 }; }
    get targetable() { return this.lift < 20; }
    maskPos(m) { return { x: this.x + Math.cos(m.a) * 46, y: this.y - 14 - this.lift + Math.sin(m.a) * 30 }; }
    damage(n, dx, dy, g, src) {
      // the masks shield the crown: hit them first if one is closer
      return super.damage(n, dx * 0.2, dy * 0.2, g, src);
    }
    hitMask(box, n, g) {
      for (const m of this.masks) {
        if (m.dead) continue;
        const mp = this.maskPos(m);
        if (HC.overlap(box, { x: mp.x - 5, y: mp.y - 5, w: 10, h: 10 })) {
          m.hp -= n; g.particles.burst(mp.x, mp.y, 6, { color: ['#efe7d8', '#ff2a3c'], speed: 60, life: 0.3 });
          HC.audio.play('hit');
          if (m.hp <= 0) { m.dead = true; m.respawn = this.enraged ? 6 : 9; HC.audio.play('kill'); }
          return true;
        }
      }
      return false;
    }
    update(dt, g) {
      if (!this.baseUpdate(dt, g)) return;
      const p = g.player;
      this.timer -= dt;
      for (const m of this.masks) {
        m.a += dt * (this.enraged ? 1.3 : 0.9);
        if (m.dead) { m.respawn -= dt; if (m.respawn <= 0) { m.dead = false; m.hp = 3; } continue; }
        const mp = this.maskPos(m);
        if (HC.overlap({ x: mp.x - 4, y: mp.y - 4, w: 8, h: 8 }, p.hurtRect)) p.hurt(g, mp.x, mp.y);
        m.fire -= dt;
        if (m.fire <= 0 && this.state !== 'rise' && this.state !== 'fall') {
          m.fire = 2.8 + Math.random();
          const a = Math.atan2(p.y - 12 - mp.y, p.x - mp.x);
          g.shoot(mp.x, mp.y, Math.cos(a) * 90, Math.sin(a) * 90, 'orb');
        }
      }
      if (this.state === 'intro') { if (this.timer <= 0) { this.state = 'hover'; this.timer = 1.5; } return; }
      if (this.state === 'hover') {
        const tx = HC.clamp(p.x, 100, 380), ty = R().floorTop + 70;
        g.moveEntity(this, (tx - this.x) * 0.8 * dt, (ty - this.y) * 0.8 * dt);
        if (this.timer <= 0) {
          const moves = ['rise', 'eclipse', 'rain', 'rise'];
          this.state = moves[this.pattern++ % moves.length];
          this.timer = this.state === 'rise' ? 0.9 : 0.6;
        }
      } else if (this.state === 'rise') {
        this.lift = Math.min(90, this.lift + 200 * dt);
        this.slamT = [p.x, p.y];
        if (this.timer <= 0) { this.state = 'fall'; this.timer = 0.6; this.x = this.slamT[0]; this.y = this.slamT[1]; }
      } else if (this.state === 'fall') {
        if (this.timer < 0.25) this.lift = Math.max(0, this.lift - 500 * dt);
        if (this.timer <= 0 && this.lift <= 0) {
          g.addWave(this.x, this.y, 90, 170); g.shake(7, 0.4); HC.audio.play('slam');
          this.y = HC.clamp(this.y, R().floorTop + 30, R().floorBottom - 10);
          this.state = 'hover'; this.timer = this.enraged ? 1.0 : 1.6;
        }
      } else if (this.state === 'eclipse' && this.timer <= 0) {
        g.darkPulse = 3.2; HC.audio.play('boss');
        for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; g.shoot(this.x, this.y - 14, Math.cos(a) * 60, Math.sin(a) * 60, 'orb'); }
        this.state = 'hover'; this.timer = 1.6;
      } else if (this.state === 'rain') {
        if (Math.random() < (this.enraged ? 0.5 : 0.3)) g.shoot(R().floorLeft + Math.random() * (R().floorRight - R().floorLeft), R().floorTop + 2, 0, 95, 'orb');
        if (this.timer <= -1.6) { this.state = 'hover'; this.timer = 1.2; }
      }
    }
    draw(ctx) {
      // landing shadow / telegraph
      const sw = 22 + Math.round(this.lift * 0.2);
      ctx.fillStyle = this.state === 'fall' ? 'rgba(90,10,20,0.6)' : 'rgba(6,4,12,0.5)';
      const sx = this.state === 'rise' ? this.slamT[0] : this.x, sy = this.state === 'rise' ? this.slamT[1] : this.y;
      ctx.fillRect(Math.round(sx - sw), Math.round(sy - 3), sw * 2, 5);
      HC.sprites.draw(ctx, this.sprite(), this.x, this.y - this.lift + Math.round(Math.sin(this.t * 2) * 2) - 4, this.flash > 0 ? 'flash' : 'base');
    }
    drawGlow(ctx) {
      const oy = this.y - this.lift + Math.round(Math.sin(this.t * 2) * 2) - 4;
      HC.sprites.draw(ctx, this.sprite(), this.x, oy, 'base', false, 0.25);
      HC.sprites.draw(ctx, this.sprite(), this.x, oy, 'glow');
      for (const m of this.masks) {
        if (m.dead) continue;
        const mp = this.maskPos(m);
        HC.sprites.draw(ctx, HC.art.mask[0], mp.x, mp.y + 4, 'base');
        HC.sprites.draw(ctx, HC.art.mask[0], mp.x, mp.y + 4, 'glow');
      }
    }
  }

  HC.ENEMIES = { skitter: Skitter, doll: Doll, armor: Armor, page: Page, ink: Ink, weeper: Weeper, hound: Hound, root: Root, bloom: Bloom, shade: Shade, eye: Eye, self: Self, king: King, archivist: Archivist, gardener: Gardener, crown: Crown };
})(window.HC);
