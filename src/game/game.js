// The run itself: rooms, combat, puzzles, lighting and the HUD.
(function (HC) {
  'use strict';
  const R = HC.ROOM;
  const I = HC.input;

  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

  class Game {
    constructor(seed) {
      this.run = HC.meta.newRun(seed);
      this.particles = new HC.Particles();
      [this.world, this.wctx] = HC.makeCanvas(HC.W, HC.H, true);
      this.player = new HC.Player(HC.W / 2, R.floorBottom - 8);
      this.enemies = []; this.projectiles = []; this.pickups = [];
      this.lights = [];
      this.shakeT = 0; this.shakeMag = 0; this.hitstopT = 0;
      this.fade = 1; this.fadeDir = -1; this.pending = null;
      this.state = 'play';
      this.time = 0; this.roomTime = 0;
      this.darkPulse = 0;
      this.banner = null; this.paused = false; this.pauseSel = 0;
      HC.audio.startDrone(55);
      this.enterRoom(1, false);
    }

    get theme() { return this.room.theme; }

    // ---------------- rooms ----------------
    enterRoom(number, risky) {
      this.run.room = number;
      this.room = HC.rooms.generate(this.run, number, risky);
      this.player.x = HC.W / 2; this.player.y = R.floorBottom - 6; this.player.facing = 'up';
      this.player.dashT = 0; this.player.attackT = 0; this.player.invuln = Math.max(this.player.invuln, 0.8);
      this.enemies = this.room.enemies.map((e, i) => {
        const en = this.makeEnemy(e.kind, e.x, e.y, this.room.tier);
        en.spawnT += i * 0.15;
        return en;
      });
      this.projectiles = []; this.pickups = []; this.particles.clear();
      this.roomTime = 0;
      if (number % 10 === 1) {
        this.banner = { title: this.theme.name, sub: 'WING ' + ROMAN[Math.floor((number - 1) / 10) % 10], t: 3.2 };
        HC.audio.setDroneRoot(this.theme.drone);
      }
      if (this.room.type === 'boss') { this.banner = { title: 'THE HOLLOW KING', sub: 'HE REMEMBERS THE CROWN', t: 2.6, red: true }; HC.audio.play('boss'); }
    }

    makeEnemy(kind, x, y, tier) { return new HC.ENEMIES[kind](x, y, tier); }
    spawnEnemy(kind, x, y, tier) {
      x = HC.clamp(x, R.floorLeft + 12, R.floorRight - 12); y = HC.clamp(y, R.floorTop + 14, R.floorBottom - 4);
      this.enemies.push(this.makeEnemy(kind, x, y, tier));
    }
    spawnOrb(x, y, vx, vy) { this.projectiles.push({ x, y, vx, vy, hostile: true, life: 5, dead: false, t: 0 }); }

    // ---------------- feedback ----------------
    shake(mag, t) { this.shakeMag = Math.max(this.shakeMag, mag); this.shakeT = Math.max(this.shakeT, t); }
    hitstop(t) { this.hitstopT = Math.max(this.hitstopT, t); }

    // ---------------- movement & collision ----------------
    moveEntity(e, dx, dy, isPlayer) {
      let full = true;
      const room = this.room;
      const tryAxis = (ax, d) => {
        if (!d) return;
        const ox = e.x, oy = e.y;
        if (ax === 'x') e.x += d; else e.y += d;
        let minX = R.floorLeft + e.w / 2, maxX = R.floorRight - e.w / 2;
        let minY = R.floorTop + e.h + 2, maxY = R.floorBottom - 1;
        if (isPlayer && !room.locked) {
          const door = room.doors.find((dr) => Math.abs(e.x - dr.x) < R.doorW / 2 - 8);
          if (door) minY = R.floorTop - 12;
        }
        if (isPlayer && e.y < R.floorTop + e.h + 2) { // inside a doorway: walls on the sides
          const door = room.doors.find((dr) => Math.abs(ox - dr.x) < R.doorW / 2 - 8);
          if (door) { minX = door.x - R.doorW / 2 + 8 + e.w / 2; maxX = door.x + R.doorW / 2 - 8 - e.w / 2; }
        }
        let blocked = e.x < minX || e.x > maxX || e.y < minY || e.y > maxY;
        if (!blocked) {
          const r = e.rect;
          for (const o of room.obstacles) if (HC.overlap(r, o.rect)) { blocked = true; break; }
        }
        if (blocked) {
          e.x = ax === 'x' ? HC.clamp(ox, minX, maxX) : e.x;
          e.y = ax === 'y' ? HC.clamp(oy, minY, maxY) : e.y;
          full = false;
        }
      };
      // sub-step fast movement so dashes never tunnel through pillars
      const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 4));
      for (let i = 0; i < steps; i++) { tryAxis('x', dx / steps); tryAxis('y', dy / steps); }
      return full;
    }

    // ---------------- events ----------------
    onEnemyKilled(e) {
      const run = this.run;
      run.kills++;
      const shards = (e.isBoss ? 25 : Math.random() < 0.7 ? 1 + (this.room.risky ? 1 : 0) : 0);
      for (let i = 0; i < shards; i++) this.dropPickup('shard', e.x, e.y - 8);
      if (Math.random() < 0.45 || e.isBoss) this.dropPickup('mote', e.x, e.y - 8);
      if (Math.random() < 0.05 || e.isBoss) this.dropPickup('heart', e.x, e.y - 8);
      if (e.isBoss) HC.save.kingsSlain++;
    }
    dropPickup(kind, x, y) {
      const a = Math.random() * Math.PI * 2, sp = 30 + Math.random() * 50;
      this.pickups.push({ kind, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0 });
    }
    onPlayerDeath() {
      this.state = 'dying'; this.dieT = 2.6;
      HC.audio.play('death'); HC.audio.stopDrone();
      this.particles.burst(this.player.x, this.player.y - 14, 60, { color: ['#fff7d0', '#ffe48a', '#ffffff'], speed: 90, life: 1.6, drag: 1.5, up: 10 });
    }
    unlock(reward) {
      if (!this.room.locked) return;
      this.room.locked = false;
      HC.audio.play('unlock');
      this.room.doors.forEach((d) => this.particles.burst(d.x, R.floorTop - 10, 18, { color: ['#c8b0ff', '#ffffff'], speed: 60, life: 0.7 }));
      if (reward) for (let i = 0; i < reward; i++) this.dropPickup('shard', HC.W / 2, R.floorTop + 60);
    }

    // ---------------- update ----------------
    update(dt) {
      this.time += dt;
      if (this.paused) { this.updatePause(); return; }
      if (I.pressed('pause') && this.state === 'play') { this.paused = true; this.pauseSel = 0; HC.audio.play('select'); return; }

      if (this.shakeT > 0) { this.shakeT -= dt; if (this.shakeT <= 0) this.shakeMag = 0; }
      if (this.banner) { this.banner.t -= dt; if (this.banner.t <= 0) this.banner = null; }

      // fades between rooms
      if (this.fadeDir) {
        this.fade = HC.clamp(this.fade + this.fadeDir * dt * 3.2, 0, 1);
        if (this.fadeDir > 0 && this.fade >= 1) { this.enterRoom(this.pending.number, this.pending.risky); this.fadeDir = -1; }
        else if (this.fadeDir < 0 && this.fade <= 0) this.fadeDir = 0;
      }

      if (this.hitstopT > 0) { this.hitstopT -= dt; this.computeLights(); return; }

      this.roomTime += dt;
      const run = this.run, p = this.player, room = this.room;
      this.darkPulse = Math.max(0, this.darkPulse - dt);

      if (this.state === 'dying') {
        this.dieT -= dt;
        this.particles.update(dt);
        this.computeLights();
        if (this.dieT <= 0) HC.scenes.endRun(this);
        return;
      }

      if (this.fadeDir <= 0) p.update(dt, this);
      const danger = this.enemies.some((e) => !e.dead);
      run.light = Math.max(0, run.light - run.lightDrain * dt * (danger ? 1 : 0.35));

      this.computeLights();
      for (const e of this.enemies) if (!e.dead) e.update(dt, this);
      this.enemies = this.enemies.filter((e) => !e.dead);

      // projectiles
      for (const o of this.projectiles) {
        o.t += dt; o.life -= dt;
        o.x += o.vx * dt; o.y += o.vy * dt;
        if (o.life <= 0 || o.x < R.floorLeft || o.x > R.floorRight || o.y < R.floorTop - 6 || o.y > R.floorBottom) o.dead = true;
        for (const ob of room.obstacles) if (HC.overlap({ x: o.x - 1, y: o.y - 1, w: 2, h: 2 }, { x: ob.rect.x, y: ob.rect.y - 20, w: ob.rect.w, h: ob.rect.h + 20 })) o.dead = true;
        if (!o.dead && o.hostile && HC.overlap({ x: o.x - 3, y: o.y - 3, w: 6, h: 6 }, p.hurtRect)) {
          if (p.hurt(this, o.x, o.y)) o.dead = true;
        }
        if (o.dead) this.particles.burst(o.x, o.y, 5, { color: ['#7a5cff', '#2a1f3c'], speed: 30, life: 0.3 });
      }
      this.projectiles = this.projectiles.filter((o) => !o.dead);

      this.updatePickups(dt);
      this.updateRoomLogic(dt);

      // ember particles from lit torches
      for (const t of room.torches) if (t.lit && Math.random() < 0.08) this.particles.add({ x: t.x + (Math.random() - 0.5) * 3, y: t.y - 8, vy: -20 - Math.random() * 15, vx: (Math.random() - 0.5) * 8, life: 0.8, color: Math.random() < 0.5 ? '#ffb02e' : '#ff6a1e' });
      // drifting dust in the dark
      if (Math.random() < 0.15) this.particles.add({ x: R.floorLeft + Math.random() * (R.floorRight - R.floorLeft), y: R.floorTop + Math.random() * 160, vx: (Math.random() - 0.5) * 4, vy: 3, life: 3, color: '#8a809a', glow: false });
      this.particles.update(dt);

      // walking through an open door
      if (!room.locked && this.fadeDir === 0 && p.y < R.floorTop - 4) {
        const door = room.doors.find((d) => Math.abs(p.x - d.x) < R.doorW / 2);
        if (door) {
          this.pending = { number: room.number + 1, risky: door.risky };
          this.fadeDir = 1;
          HC.audio.play('door');
        }
      }
    }

    updatePause() {
      if (I.pressed('up') || I.pressed('down')) { this.pauseSel ^= 1; HC.audio.play('select'); }
      if (I.pressed('pause') && !I.pressed('confirm')) { this.paused = false; return; }
      if (I.pressed('confirm') || I.pressed('attack')) {
        HC.audio.play('confirm');
        if (this.pauseSel === 0) this.paused = false;
        else { this.paused = false; this.player.dead = true; this.onPlayerDeath(); this.dieT = 0.6; }
      }
    }

    updatePickups(dt) {
      const p = this.player, run = this.run;
      for (const k of this.pickups) {
        k.t += dt;
        k.x += k.vx * dt; k.y += k.vy * dt;
        k.vx *= 1 - 4 * dt; k.vy *= 1 - 4 * dt;
        k.x = HC.clamp(k.x, R.floorLeft + 4, R.floorRight - 4); k.y = HC.clamp(k.y, R.floorTop + 6, R.floorBottom - 4);
        const d = HC.dist(k.x, k.y, p.x, p.y - 8);
        if (k.t > 0.4 && d < 52 && k.kind !== 'heart') { k.x += ((p.x - k.x) / d) * 140 * dt; k.y += ((p.y - 8 - k.y) / d) * 140 * dt; }
        if (k.t > 0.3 && d < 10 && !p.dead) {
          if (k.kind === 'shard') { run.shards++; HC.audio.play('shard'); }
          else if (k.kind === 'mote') { run.light = Math.min(run.lightMax, run.light + 12); HC.audio.play('pickup'); }
          else if (k.kind === 'heart') {
            if (run.hp >= run.maxHp) continue;
            run.hp++; HC.audio.play('pickup');
          }
          k.dead = true;
          this.particles.burst(k.x, k.y, 5, { color: k.kind === 'shard' ? '#a8f6ff' : k.kind === 'heart' ? '#ff5a6a' : '#fff3a6', speed: 30, life: 0.3 });
        }
      }
      this.pickups = this.pickups.filter((k) => !k.dead);
    }

    updateRoomLogic(dt) {
      const room = this.room, p = this.player, run = this.run;
      // torches flicker
      for (const t of room.torches) t.f = Math.random();

      if ((room.type === 'combat' || room.type === 'ambush' || room.type === 'boss') && room.locked && this.roomTime > 0.5 && this.enemies.length === 0) {
        this.unlock(room.type === 'boss' ? 0 : room.risky ? 3 : 1);
      }

      if (room.type === 'puzzle') {
        const pz = room.puzzle;
        const feet = { x: p.x - 3, y: p.y - 3, w: 6, h: 4 };
        for (const r of room.runes) {
          const on = HC.overlap(feet, { x: r.x - 11, y: r.y - 7, w: 22, h: 14 });
          r.pulse = Math.max(0, r.pulse - dt);
          if (on && !r.under && !pz.solved) {
            if (pz.kind === 'fade' && !r.lit) { r.lit = true; r.litT = Math.max(4.5, 7 - room.zone); HC.audio.play('rune'); }
            if (pz.kind === 'order' && !r.lit) {
              if (pz.seq[pz.step] === r.id) { r.lit = true; pz.step++; HC.audio.play('rune'); pz.showI = -2; }
              else {
                HC.audio.play('runeBad'); pz.fails++;
                room.runes.forEach((u) => { u.lit = false; }); pz.step = 0; pz.showI = -1; pz.showT = 1;
                this.spawnEnemy('skitter', r.x + 40, r.y - 30, room.tier); this.shake(3, 0.2);
              }
            }
          }
          r.under = on;
          if (pz.kind === 'fade' && r.lit && !pz.solved) {
            r.litT -= dt;
            if (r.litT <= 0) { r.lit = false; HC.audio.play('runeBad'); }
          }
        }
        // order puzzle: replay the sequence until the first correct step
        if (pz.kind === 'order' && pz.step === 0 && pz.showI !== -2) {
          pz.showT -= dt;
          if (pz.showT <= 0) {
            pz.showI++;
            if (pz.showI >= pz.seq.length) { pz.showI = -1; pz.showT = 1.6; }
            else { pz.showT = 0.55; const r = room.runes.find((u) => u.id === pz.seq[pz.showI]); r.pulse = 0.45; HC.audio.play('select'); }
          }
        }
        if (!pz.solved && room.runes.length && room.runes.every((r) => r.lit)) {
          pz.solved = true;
          this.unlock(3 + room.zone * 2 + (room.risky ? 3 : 0));
          this.dropPickup('mote', HC.W / 2, R.floorTop + 60);
        }
      }

      if (room.type === 'treasure') {
        this.nearOffer = null;
        for (const o of room.offers) {
          if (o.taken) continue;
          if (HC.dist(p.x, p.y, o.x, o.y + 6) < 20) {
            this.nearOffer = o;
            if (I.pressed('interact') || I.pressed('attack')) {
              o.blessing.apply(run); run.blessings.push(o.blessing.id);
              room.offers.forEach((x) => { x.taken = true; });
              HC.audio.play('blessing'); this.shake(2, 0.2);
              this.particles.burst(o.x, o.y - 22, 40, { color: ['#fff7d0', '#ffd650', '#ffffff'], speed: 90, life: 1 });
              this.toast = { text: o.blessing.name.toUpperCase(), t: 2 };
            }
          }
        }
      }

      if (room.type === 'shrine' && room.shrine) {
        const s = room.shrine;
        this.nearShrine = HC.dist(p.x, p.y, s.x, s.y + 8) < 30;
        if (this.nearShrine && !s.used && (I.pressed('interact') || I.pressed('attack'))) {
          s.used = true;
          run.light = run.lightMax; run.hp = Math.min(run.maxHp, run.hp + 1);
          HC.audio.play('blessing');
          this.particles.burst(s.x, s.y - 14, 36, { color: ['#ffe48a', '#ffffff'], speed: 70, life: 1 });
          this.toast = { text: 'YOUR LIGHT IS RESTORED', t: 2 };
        }
      }
      if (this.toast) { this.toast.t -= dt; if (this.toast.t <= 0) this.toast = null; }
    }

    computeLights() {
      const run = this.run, p = this.player, room = this.room;
      const L = this.lights = [];
      if (!p.dead || this.state === 'dying') {
        const pulse = this.darkPulse > 0 ? 0.55 + 0.45 * (1 - Math.min(1, this.darkPulse / 2.2)) : 1;
        const dying = this.state === 'dying' ? Math.max(0, this.dieT / 2.6) : 1;
        L.push({ x: p.x, y: p.y - 14, r: p.lightRadius(run) * pulse * (0.97 + Math.sin(this.time * 3) * 0.03) * (0.3 + 0.7 * dying), i: 1.2 * (0.4 + 0.6 * dying), c: [1, 0.93, 0.78] });
      }
      for (const t of room.torches) if (t.lit) L.push({ x: t.x, y: t.y - 4, r: 62 + (t.f || 0) * 6, i: 0.75, c: [1, 0.58, 0.3] });
      for (const r of room.runes) {
        if (r.lit) L.push({ x: r.x, y: r.y, r: 36, i: 0.5, c: [0.35, 1, 0.85] });
        else if (r.pulse > 0) L.push({ x: r.x, y: r.y, r: 46, i: 0.7 * (r.pulse / 0.45), c: [0.6, 0.5, 1] });
        else L.push({ x: r.x, y: r.y, r: 16, i: 0.18, c: [0.6, 0.5, 1] });
      }
      for (const o of this.projectiles) L.push({ x: o.x, y: o.y, r: 16, i: 0.22, c: [0.6, 0.4, 1] });
      if (room.type === 'treasure') for (const o of room.offers) if (!o.taken) L.push({ x: o.x, y: o.y - 22, r: 40, i: 0.5, c: [1, 0.9, 0.6] });
      if (room.shrine) L.push({ x: room.shrine.x, y: room.shrine.y - 12, r: room.shrine.used ? 50 : 80, i: 0.65, c: [1, 0.75, 0.45] });
      if (room.locked) for (const d of room.doors) L.push({ x: d.x, y: R.floorTop - 14, r: 26, i: 0.3, c: [0.6, 0.4, 1] });
      if (p.attackT > 0) { const b = p.attackBox(run); L.push({ x: b.x + b.w / 2, y: b.y + b.h / 2, r: 48, i: 0.45, c: [1, 0.95, 0.7] }); }
      for (const k of this.pickups) if (k.kind === 'mote') L.push({ x: k.x, y: k.y, r: 14, i: 0.3, c: [1, 0.9, 0.6] });
    }

    // ---------------- drawing ----------------
    draw(ctx) {
      const w = this.wctx, room = this.room, p = this.player;
      w.drawImage(room.bg, 0, 0);

      // torch brackets
      for (const t of room.torches) {
        w.fillStyle = '#2a2030'; w.fillRect(t.x - 1, t.y, 3, 7);
        w.fillStyle = '#5a4a40'; w.fillRect(t.x - 2, t.y, 5, 1);
      }
      // rune plates
      for (const r of room.runes) {
        w.fillStyle = '#16131f'; w.fillRect(r.x - 11, r.y - 7, 22, 14);
        w.fillStyle = '#2a2638'; w.fillRect(r.x - 10, r.y - 6, 20, 12);
      }
      // y-sorted world objects
      const list = [];
      for (const o of room.obstacles) list.push({ y: o.y, d: () => { const c = HC.roomArt.obstacle(o.kind, room.theme); w.drawImage(c, Math.round(o.x - c.width / 2), Math.round(o.y - c.height + 2)); } });
      for (const e of this.enemies) list.push({ y: e.y, d: () => e.draw(w) });
      list.push({ y: p.y, d: () => p.draw(w) });
      if (room.type === 'treasure') for (const o of room.offers) list.push({ y: o.y, d: () => HC.sprites.draw(w, HC.art.pedestal, o.x, o.y + 6) });
      if (room.shrine) list.push({ y: room.shrine.y, d: () => this.drawShrine(w, room.shrine) });
      list.sort((a, b) => a.y - b.y).forEach((o) => o.d());
      this.particles.draw(w, false);

      HC.light.apply(w, this.lights, { ambient: this.theme.ambient, night: HC.hex(this.theme.night), top: HC.HUD_H });

      // ---- glow layer (after lighting) ----
      for (const t of room.torches) if (t.lit) this.drawFlame(w, t.x, t.y);
      this.drawDoorSeals(w);
      this.drawRuneGlyphs(w);
      if (room.type === 'treasure') this.drawOffers(w);
      if (room.shrine) this.drawShrineFlames(w, room.shrine);
      for (const k of this.pickups) {
        const bob = Math.round(Math.sin(k.t * 6) * 1);
        const s = k.kind === 'shard' ? HC.art.shard : k.kind === 'heart' ? HC.art.heart : HC.art.mote;
        HC.sprites.draw(w, s, k.x, k.y + 3 + bob, 'glow');
      }
      for (const e of this.enemies) e.drawGlow(w);
      for (const o of this.projectiles) {
        const s = (Math.floor(o.t * 12) % 2);
        w.fillStyle = '#2a1050'; w.fillRect(Math.round(o.x) - 3, Math.round(o.y) - 2, 6, 4); w.fillRect(Math.round(o.x) - 2, Math.round(o.y) - 3, 4, 6);
        w.fillStyle = s ? '#9a7cff' : '#c8b0ff'; w.fillRect(Math.round(o.x) - 2, Math.round(o.y) - 1, 4, 2); w.fillRect(Math.round(o.x) - 1, Math.round(o.y) - 2, 2, 4);
        w.fillStyle = '#ffffff'; w.fillRect(Math.round(o.x), Math.round(o.y) - 1, 1, 1);
      }
      p.drawGlow(w, this.run, this.time);
      this.particles.draw(w, true);

      // ---- compose to screen ----
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, HC.W, HC.H);
      const sx = this.shakeT > 0 ? Math.round((Math.random() - 0.5) * this.shakeMag * 2) : 0;
      const sy = this.shakeT > 0 ? Math.round((Math.random() - 0.5) * this.shakeMag * 2) : 0;
      ctx.drawImage(this.world, 0, HC.HUD_H, HC.W, HC.H - HC.HUD_H, sx, HC.HUD_H + sy, HC.W, HC.H - HC.HUD_H);
      this.drawHud(ctx);
      this.drawOverlays(ctx);
    }

    drawFlame(w, x, y) {
      const t = this.time * 10 + x;
      const pal = ['#ff6a1e', '#ffb02e', '#fff0a0'];
      for (let j = 0; j < 8; j++) {
        const wd = Math.max(0, Math.round((1 - j / 8) * 2.6 + Math.sin(t + j) * 0.5));
        const sway = Math.round(Math.sin(t * 0.7 + j * 0.6) * (j / 8) * 1.5);
        for (let i = -wd; i <= wd; i++) {
          w.fillStyle = pal[Math.abs(i) < wd * 0.4 && j < 5 ? 2 : Math.abs(i) < wd * 0.8 ? 1 : 0];
          w.fillRect(x + i + sway, y - 1 - j, 1, 1);
        }
      }
    }

    drawDoorSeals(w) {
      const room = this.room;
      for (const d of room.doors) {
        const x0 = d.x - R.doorW / 2, yTop = R.top + R.cap + 8 + R.doorW / 2 - 4;
        if (room.locked) {
          w.fillStyle = '#3a2470';
          for (let i = 6; i < R.doorW; i += 8) w.fillRect(x0 + i, yTop, 2, R.floorTop - yTop);
          const glow = 0.5 + 0.5 * Math.sin(this.time * 3);
          w.fillStyle = glow > 0.5 ? '#c8b0ff' : '#9a7cff';
          const cx = d.x, cy = yTop + 14;
          [[0, -5], [0, 5], [-5, 0], [5, 0], [-3, -3], [3, 3], [-3, 3], [3, -3], [0, 0]].forEach(([a, b]) => w.fillRect(cx + a, cy + b, 1, 1));
          w.fillRect(cx - 2, cy, 5, 1); w.fillRect(cx, cy - 2, 1, 5);
        } else if (d.risky) {
          // a red eye watches above risky doors
          const blink = Math.sin(this.time * 2 + d.x) > -0.95;
          if (blink) { w.fillStyle = '#ff2a3c'; w.fillRect(d.x - 3, R.top + R.cap + 2, 7, 2); w.fillStyle = '#ffd0d8'; w.fillRect(d.x, R.top + R.cap + 2, 1, 2); }
        }
        if (d.risky && room.locked) { w.fillStyle = '#ff2a3c'; w.fillRect(d.x - 3, R.top + R.cap + 2, 7, 2); }
      }
    }

    drawRuneGlyphs(w) {
      const room = this.room;
      for (const r of room.runes) {
        const lit = r.lit, pulse = r.pulse > 0;
        let col = lit ? '#4fe3c8' : pulse ? '#e8dcff' : '#4a3a7a';
        if (lit && room.puzzle.kind === 'fade' && r.litT < 2 && Math.floor(this.time * 8) % 2) col = '#2a8a7a';
        w.fillStyle = col;
        const cx = r.x, cy = r.y;
        const shape = [
          [-6, 0], [-5, -2], [-4, -3], [-2, -4], [0, -4], [2, -4], [4, -3], [5, -2], [6, 0], [5, 2], [4, 3], [2, 4], [0, 4], [-2, 4], [-4, 3], [-5, 2],
          [0, -2], [0, -1], [0, 0], [0, 1], [0, 2], [-2, 0], [-1, 0], [1, 0], [2, 0], [-2, -2], [2, 2],
        ];
        for (const [a, b] of shape) w.fillRect(cx + a, cy + b, 1, 1);
        if (room.puzzle.kind === 'order' && lit) HC.font.draw(w, String(room.puzzle.seq.indexOf(r.id) + 1), cx + 8, cy - 9, '#4fe3c8');
      }
    }

    drawOffers(w) {
      for (const o of this.room.offers) {
        if (o.taken) continue;
        const bob = Math.round(Math.sin(this.time * 2.5 + o.x) * 2);
        const cx = o.x, cy = o.y - 22 + bob;
        const ring = ['#fff7d0', '#ffd650', '#ffe48a'];
        for (let a = 0; a < 16; a++) {
          const ang = (a / 16) * Math.PI * 2 + this.time;
          w.fillStyle = ring[a % 3];
          w.fillRect(Math.round(cx + Math.cos(ang) * 7), Math.round(cy + Math.sin(ang) * 7), 1, 1);
        }
        w.fillStyle = '#ffd650'; w.fillRect(cx - 3, cy - 3, 7, 7);
        w.fillStyle = '#fff7d0'; w.fillRect(cx - 2, cy - 2, 5, 5);
        w.fillStyle = '#ffffff'; w.fillRect(cx - 1, cy - 1, 2, 2);
      }
    }

    drawShrine(w, s) {
      w.fillStyle = '#1a1424'; w.fillRect(s.x - 18, s.y - 10, 36, 12);
      w.fillStyle = '#5a5070'; w.fillRect(s.x - 17, s.y - 10, 34, 3);
      w.fillStyle = '#3a3448'; w.fillRect(s.x - 17, s.y - 7, 34, 8);
      w.fillStyle = '#8a7340'; w.fillRect(s.x - 17, s.y - 11, 34, 1);
      [[-11, 7], [0, 10], [11, 6]].forEach(([dx, h]) => { w.fillStyle = '#e8dcc0'; w.fillRect(s.x + dx - 1, s.y - 11 - h, 3, h); w.fillStyle = '#b0a488'; w.fillRect(s.x + dx + 1, s.y - 11 - h, 1, h); });
    }
    drawShrineFlames(w, s) {
      [[-11, 7], [0, 10], [11, 6]].forEach(([dx, h], i) => {
        const fx = s.x + dx, fy = s.y - 12 - h;
        if (s.used && i !== 1) return;
        const f = Math.sin(this.time * 12 + i * 2) > 0;
        w.fillStyle = '#ffb02e'; w.fillRect(fx, fy - 2, 1, 3); w.fillRect(fx - (f ? 1 : 0), fy - 1, 1, 1);
        w.fillStyle = '#fff0a0'; w.fillRect(fx, fy - 1, 1, 1);
      });
    }

    drawHud(ctx) {
      const run = this.run;
      ctx.fillStyle = '#0b0812'; ctx.fillRect(0, 0, HC.W, HC.HUD_H - 1);
      ctx.fillStyle = '#2a2238'; ctx.fillRect(0, HC.HUD_H - 1, HC.W, 1);
      for (let i = 0; i < run.maxHp; i++) {
        const full = i < run.hp;
        const beat = full && run.hp === 1 && Math.sin(this.time * 8) > 0 ? -1 : 0;
        HC.sprites.draw(ctx, HC.art.heart, 10 + i * 9, 13 + beat, 'glow', false, full ? 1 : 0.22);
      }
      let x = 14 + run.maxHp * 9;
      HC.sprites.draw(ctx, HC.art.mote, x, 11, 'glow');
      x += 5;
      const f = run.light / run.lightMax, bw = 54;
      ctx.fillStyle = '#1a1424'; ctx.fillRect(x, 6, bw + 2, 6);
      ctx.fillStyle = '#2a2238'; ctx.fillRect(x + 1, 7, bw, 4);
      const lowFlash = f < 0.2 && Math.floor(this.time * 4) % 2;
      ctx.fillStyle = lowFlash ? '#ff8a5a' : '#f0a830'; ctx.fillRect(x + 1, 7, Math.round(bw * f), 4);
      ctx.fillStyle = '#fff0a0'; ctx.fillRect(x + 1, 7, Math.round(bw * f), 1);
      x += bw + 10;
      HC.sprites.draw(ctx, HC.art.shard, x + 2, 12, 'glow');
      HC.font.draw(ctx, String(run.shards), x + 8, 5, '#a8f6ff');

      const label = 'ROOM ' + String(run.room).padStart(3, '0');
      HC.font.draw(ctx, label, HC.W - 8, 5, this.room.risky ? '#ffb0b0' : '#e8dcc0', { align: 'right' });
      HC.font.draw(ctx, ROMAN[this.room.zone % 10], HC.W - 14 - HC.font.measure(label), 5, '#6a5a7e', { align: 'right' });
      if (HC.audio.muted) HC.font.draw(ctx, 'MUTED', HC.W / 2, 5, '#4a3a5a', { align: 'center' });
    }

    drawOverlays(ctx) {
      const room = this.room;
      // boss health
      const boss = this.enemies.find((e) => e.isBoss);
      if (boss) {
        const bw = 220, x = HC.W / 2 - bw / 2, y = HC.H - 14;
        HC.font.draw(ctx, 'THE HOLLOW KING', HC.W / 2, y - 10, '#e8dcc0', { align: 'center', shadow: '#000' });
        ctx.fillStyle = '#0b0812'; ctx.fillRect(x - 1, y - 1, bw + 2, 6);
        ctx.fillStyle = '#3a1020'; ctx.fillRect(x, y, bw, 4);
        ctx.fillStyle = '#d0283c'; ctx.fillRect(x, y, Math.round(bw * Math.max(0, boss.hp / boss.maxHp)), 4);
        ctx.fillStyle = '#ff8a8a'; ctx.fillRect(x, y, Math.round(bw * Math.max(0, boss.hp / boss.maxHp)), 1);
      }

      // room text / lore
      let msg = null, alpha = 1;
      if (this.nearOffer && room.type === 'treasure') msg = this.nearOffer.blessing.name.toUpperCase() + ' - ' + this.nearOffer.blessing.desc.toUpperCase() + '   [E]';
      else if (this.nearShrine && room.shrine && !room.shrine.used) msg = 'PRAY AT THE SHRINE   [E]';
      else if (this.nearShrine && room.text) msg = room.text;
      else if (room.text && this.roomTime < 5) { msg = room.text; alpha = Math.min(1, (5 - this.roomTime) * 1.5, this.roomTime * 2); }
      if (msg && !boss) {
        ctx.globalAlpha = alpha;
        const mw = HC.font.measure(msg) + 16;
        ctx.fillStyle = 'rgba(5,3,10,0.7)'; ctx.fillRect(HC.W / 2 - mw / 2, HC.HUD_H + 2, mw, 13);
        HC.font.draw(ctx, msg, HC.W / 2, HC.HUD_H + 5, '#e8dcc0', { align: 'center' });
        ctx.globalAlpha = 1;
      }
      if (room.type === 'intro' && this.roomTime < 12) {
        ctx.globalAlpha = Math.min(1, (12 - this.roomTime) / 2);
        HC.font.draw(ctx, 'MOVE: WASD   SLASH: J   DASH: K   USE: E   PAUSE: ESC', HC.W / 2, HC.H - 14, '#8a7a9a', { align: 'center' });
        ctx.globalAlpha = 1;
      }
      if (this.toast) {
        ctx.globalAlpha = Math.min(1, this.toast.t * 2);
        HC.font.draw(ctx, this.toast.text, HC.W / 2, R.floorTop + 10, '#ffd650', { align: 'center', shadow: '#0b0812' });
        ctx.globalAlpha = 1;
      }

      if (this.banner) {
        const b = this.banner, a = Math.min(1, b.t * 1.5, (3.2 - b.t) * 3);
        ctx.globalAlpha = Math.max(0, a);
        ctx.fillStyle = 'rgba(5,3,10,0.6)'; ctx.fillRect(0, 98, HC.W, 50);
        HC.font.draw(ctx, b.title, HC.W / 2, 106, b.red ? '#ff6a7a' : '#ffd650', { align: 'center', scale: 2, shadow: '#000' });
        HC.font.draw(ctx, b.sub, HC.W / 2, 128, '#a89ab8', { align: 'center' });
        ctx.globalAlpha = 1;
      }

      if (this.fade > 0) { ctx.fillStyle = `rgba(0,0,0,${this.fade})`; ctx.fillRect(0, 0, HC.W, HC.H); }
      if (this.state === 'dying' && this.dieT < 1.2) {
        ctx.fillStyle = `rgba(0,0,0,${1 - this.dieT / 1.2})`; ctx.fillRect(0, 0, HC.W, HC.H);
      }

      if (this.paused) {
        ctx.fillStyle = 'rgba(5,3,10,0.75)'; ctx.fillRect(0, 0, HC.W, HC.H);
        HC.font.draw(ctx, 'PAUSED', HC.W / 2, 90, '#ffd650', { align: 'center', scale: 2 });
        ['RESUME', 'ABANDON RUN'].forEach((t, i) => HC.font.draw(ctx, (this.pauseSel === i ? '> ' : '  ') + t, HC.W / 2, 128 + i * 14, this.pauseSel === i ? '#fff7d0' : '#7a6a8a', { align: 'center' }));
        const bl = this.run.blessings.map((id) => HC.BLESSINGS.find((b) => b.id === id).name).join(', ');
        if (bl) HC.font.draw(ctx, 'BLESSINGS: ' + bl, HC.W / 2, 190, '#a89ab8', { align: 'center' });
      }
    }
  }

  HC.Game = Game;
})(window.HC);
