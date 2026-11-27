// The run itself: rooms, combat, puzzles, lighting and the HUD.
(function (HC) {
  'use strict';
  const R = HC.ROOM;
  const I = HC.input;

  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  // Halls = brisk adventure, Library = sad royal waltz, Gardens = crooked jig, Crown = darkest candlelight
  const WING_SONGS = ['halls', 'waltz', 'thorns', 'candles'];
  const FACE_FROM = { S: 'up', N: 'down', E: 'left', W: 'right' };
  const PROJ_LIGHT = { orb: [0.6, 0.4, 1], ink: [0.35, 0.9, 1], thorn: [1, 0.5, 0.3], bolt: [1, 0.95, 0.7] };
  const F_draw = (...a) => HC.font.draw(...a);

  class Game {
    constructor(seed) {
      this.run = HC.meta.newRun(seed);
      this.particles = new HC.Particles();
      [this.world, this.wctx] = HC.makeCanvas(HC.W, HC.H, true);
      this.player = new HC.Player(HC.W / 2, R.floorBottom - 8);
      this.enemies = []; this.projectiles = []; this.pickups = []; this.waves = []; this.floaters = [];
      this.lights = [];
      this.shakeT = 0; this.shakeMag = 0; this.hitstopT = 0;
      this.fade = 1; this.fadeDir = -1; this.pending = null;
      this.state = 'play';
      this.time = 0; this.roomTime = 0;
      this.darkPulse = 0;
      this.banner = null; this.paused = false; this.pauseSel = 0;
      this.enterRoom(1, false, 'S');
      if (this.run.gift) this.toastMsg('GIFT: ' + this.run.gift.toUpperCase(), '#ffd650', 3);
    }

    get theme() { return this.room.theme; }

    // ---------------- rooms ----------------
    enterRoom(number, risky, entryWall, special) {
      const run = this.run;
      run.room = number;
      this.room = HC.rooms.generate(run, number, risky, entryWall || 'S', special);
      const room = this.room;
      run.sinceTreasure = room.type === 'treasure' ? 0 : run.sinceTreasure + 1;
      if (room.type === 'secret' || room.doors.some((d) => d.secret)) run.secretWings[room.zone] = true;
      const sp = HC.roomGeo.spawnPoint(room);
      const p = this.player;
      p.x = sp.x; p.y = sp.y; p.facing = FACE_FROM[room.entryDoor.wall];
      p.dashT = 0; p.attackT = 0; p.holding = false; p.charge = 0; p.invuln = Math.max(p.invuln, 0.8);
      this.enemies = room.enemies.map((e, i) => { const en = this.makeEnemy(e.kind, e.x, e.y, room.tier); en.spawnT += i * 0.12; return en; });
      this.projectiles = []; this.pickups = []; this.waves = []; this.floaters = []; this.particles.clear();
      this.roomTime = 0; this.hinted = false; this.nearOffer = null; this.nearShrine = false;
      if (!run.rootTip && this.enemies.some((e) => e instanceof HC.ENEMIES.root)) { run.rootTip = true; this.toastMsg('ROOTLINGS BURROW TOWARD YOU - STEP AWAY FROM THE CRACKS, HIT THEM WHEN THEY RISE', '#d8ff6a', 5); }
      if (!run.houndTip && this.enemies.some((e) => e instanceof HC.ENEMIES.hound)) { run.houndTip = true; this.toastMsg('BONE HOUNDS CROUCH BEFORE THEY BITE - DASH WHEN THEIR EYES FLASH', '#ff8a8a', 5); }
      HC.audio.music(room.type === 'secret' ? 'verdant' : room.type === 'boss' ? 'boss' : WING_SONGS[room.wing]);
      if (room.doors.some((d) => d.secret)) this.toastMsg('A GREEN DOOR... IT WAS NOT HERE BEFORE', '#5aff8a', 3.5);
      if (room.type === 'secret') this.banner = { title: 'THE VERDANT HOLLOW', sub: 'A ROOM THE CASTLE FORGOT', t: 3, color: '#5aff8a' };
      else if (number % 10 === 1) this.banner = { title: this.theme.name, sub: 'WING ' + ROMAN[room.zone % 12], t: 3.2 };
      if (room.type === 'boss') {
        const b = this.enemies[0];
        this.banner = { title: b.name, sub: ['HE REMEMBERS THE CROWN', 'EVERY WORD IS DROWNED', 'WHAT YOU BURY, IT REAPS', 'IT WAITS FOR A HEAD'][room.wing], t: 2.6, color: '#ff6a7a' };
        HC.audio.play('boss');
      }
    }

    makeEnemy(kind, x, y, tier) { const e = new HC.ENEMIES[kind](x, y, tier); if (['page', 'weeper', 'eye', 'archivist', 'crown'].includes(kind)) e.flying = true; return e; }
    spawnEnemy(kind, x, y, tier) {
      x = HC.clamp(x, R.floorLeft + 12, R.floorRight - 12); y = HC.clamp(y, R.floorTop + 14, R.floorBottom - 4);
      this.enemies.push(this.makeEnemy(kind, x, y, tier));
    }
    shoot(x, y, vx, vy, kind) { this.projectiles.push({ x, y, vx, vy, kind: kind || 'orb', friendly: false, life: 6, dead: false, t: 0, damage: 1 }); }
    addWave(x, y, max, speed) { this.waves.push({ x, y, r: 4, max, speed, hit: false }); }
    toastMsg(text, color, t) { this.toast = { text, color: color || '#ffd650', t: t || 2 }; }
    floatText(x, y, text, color) { this.floaters.push({ x, y, text, color, t: 0.9 }); }

    shake(mag, t) { this.shakeMag = Math.max(this.shakeMag, mag); this.shakeT = Math.max(this.shakeT, t); }
    hitstop(t) { this.hitstopT = Math.max(this.hitstopT, t); }

    // ---------------- movement & collision ----------------
    inWater(e) { return this.room.pools.some((p) => e.x > p.x && e.x < p.x + p.w && e.y > p.y && e.y < p.y + p.h); }
    openDoorAt(e) {
      if (this.room.locked) return null;
      return this.room.doors.find((d) => {
        if (d.wall === 'N' || d.wall === 'S') return Math.abs(e.x - d.x) < R.doorW / 2 - 8;
        return e.y > d.y - R.doorH / 2 + 8 && e.y < d.y + R.doorH / 2 + 2;
      });
    }
    moveEntity(e, dx, dy, isPlayer) {
      let full = true;
      const room = this.room;
      const tryAxis = (ax, d) => {
        if (!d) return;
        const ox = e.x, oy = e.y;
        if (ax === 'x') e.x += d; else e.y += d;
        let minX = R.floorLeft + e.w / 2, maxX = R.floorRight - e.w / 2;
        let minY = R.floorTop + e.h + 2, maxY = R.floorBottom - 1;
        if (isPlayer) {
          const door = this.openDoorAt({ x: ox, y: oy });
          if (door) {
            const nx0 = door.x - R.doorW / 2 + 8 + e.w / 2, nx1 = door.x + R.doorW / 2 - 8 - e.w / 2;
            if (door.wall === 'N') { minY = R.floorTop - 14; if (oy < R.floorTop + e.h + 2) { minX = nx0; maxX = nx1; } }
            if (door.wall === 'S') { maxY = HC.H + 6; if (oy > R.floorBottom - 1) { minX = nx0; maxX = nx1; } }
            if (door.wall === 'E') { maxX = HC.W + 6; if (ox > R.floorRight - e.w / 2) { minY = door.y - R.doorH / 2 + 8; maxY = door.y + R.doorH / 2 + 2; } }
            if (door.wall === 'W') { minX = -6; if (ox < R.floorLeft + e.w / 2) { minY = door.y - R.doorH / 2 + 8; maxY = door.y + R.doorH / 2 + 2; } }
          }
        }
        let blocked = e.x < minX || e.x > maxX || e.y < minY || e.y > maxY;
        if (!blocked && !e.flying) {
          const r = e.rect;
          for (const o of room.obstacles) if (HC.overlap(r, o.rect)) { blocked = true; break; }
          if (!blocked) for (const p of room.pits) if (HC.overlap(r, p)) { blocked = true; break; }
        }
        if (blocked) {
          if (ax === 'x') e.x = HC.clamp(ox, minX, maxX); else e.y = HC.clamp(oy, minY, maxY);
          full = false;
        }
      };
      const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 4));
      for (let i = 0; i < steps; i++) { tryAxis('x', dx / steps); tryAxis('y', dy / steps); }
      return full;
    }

    // ---------------- events ----------------
    onEnemyKilled(e) {
      const run = this.run;
      run.kills++;
      const shards = e.isBoss ? 25 : Math.random() < 0.7 ? 1 + (this.room.risky ? 1 : 0) : 0;
      for (let i = 0; i < shards; i++) this.dropPickup('shard', e.x, e.y - 8);
      if (Math.random() < 0.1 || e.isBoss) this.dropPickup('mote', e.x, e.y - 8);
      if (Math.random() < (this.room.risky ? 0.1 : 0.05) || e.isBoss) this.dropPickup('heart', e.x, e.y - 8);
      if (e.isBoss) { HC.save.kingsSlain++; HC.meta.save(); }
    }
    dropPickup(kind, x, y) {
      const a = Math.random() * Math.PI * 2, sp = 30 + Math.random() * 50;
      this.pickups.push({ kind, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0 });
    }
    onPlayerDeath() {
      this.state = 'dying'; this.dieT = 2.6;
      HC.audio.play('death'); HC.audio.music(null);
      this.particles.burst(this.player.x, this.player.y - 14, 60, { color: ['#fff7d0', '#ffe48a', '#ffffff'], speed: 90, life: 1.6, drag: 1.5, up: 10 });
    }
    unlock(reward) {
      if (!this.room.locked) return;
      this.room.locked = false;
      HC.audio.play('unlock');
      if (this.room.type === 'boss') HC.audio.music(null);
      this.room.doors.forEach((d) => { const a = HC.roomGeo.approach(d); this.particles.burst(a.x, a.y - 10, 18, { color: d.secret ? ['#5aff8a', '#ffffff'] : ['#c8b0ff', '#ffffff'], speed: 60, life: 0.7 }); });
      for (let i = 0; i < reward; i++) this.dropPickup('shard', HC.W / 2, (R.floorTop + R.floorBottom) / 2);
      if (this.run.vigil && this.run.hp < this.run.maxHp) { this.run.hp = Math.min(this.run.maxHp, this.run.hp + 0.5); this.floatText(this.player.x, this.player.y - 30, '+1/2', '#ff8a9a'); }
      this.toastMsg('THE DOOR OPENS', '#c8b0ff', 1.4);
    }

    // ---------------- update ----------------
    update(dt) {
      this.time += dt;
      if (this.paused) { this.updatePause(); return; }
      if (I.pressed('pause') && this.state === 'play') { this.paused = true; this.pauseSel = 0; HC.audio.play('select'); return; }

      if (this.shakeT > 0) { this.shakeT -= dt; if (this.shakeT <= 0) this.shakeMag = 0; }
      if (this.banner) { this.banner.t -= dt; if (this.banner.t <= 0) this.banner = null; }
      if (this.toast) { this.toast.t -= dt; if (this.toast.t <= 0) this.toast = null; }

      if (this.fadeDir) {
        this.fade = HC.clamp(this.fade + this.fadeDir * dt * 3.2, 0, 1);
        if (this.fadeDir > 0 && this.fade >= 1) {
          const pd = this.pending;
          if (pd.victory) { pd.victory = false; HC.scenes.victory(this); return; }
          this.enterRoom(pd.number, pd.risky, pd.entry, pd.special); this.fadeDir = -1;
        } else if (this.fadeDir < 0 && this.fade <= 0) this.fadeDir = 0;
      }

      if (this.hitstopT > 0) { this.hitstopT -= dt; this.computeLights(); return; }

      this.roomTime += dt;
      const run = this.run, p = this.player, room = this.room;
      this.darkPulse = Math.max(0, this.darkPulse - dt);

      if (this.state === 'dying') {
        this.dieT -= dt; this.particles.update(dt); this.computeLights();
        if (this.dieT <= 0) HC.scenes.endRun(this);
        return;
      }

      if (this.fadeDir <= 0) p.update(dt, this);
      const danger = this.enemies.some((e) => !e.dead);

      this.computeLights();
      for (const e of this.enemies) if (!e.dead) e.update(dt, this);
      this.enemies = this.enemies.filter((e) => !e.dead);

      this.updateProjectiles(dt);
      this.updateWaves(dt);
      this.updatePickups(dt);
      this.updateRoomLogic(dt);
      for (const f of this.floaters) { f.t -= dt; f.y -= 14 * dt; }
      this.floaters = this.floaters.filter((f) => f.t > 0);

      for (const t of room.torches) if (t.lit && Math.random() < 0.08) this.particles.add({ x: t.x + (Math.random() - 0.5) * 3, y: t.y - 8, vy: -20 - Math.random() * 15, vx: (Math.random() - 0.5) * 8, life: 0.8, color: Math.random() < 0.5 ? '#ffb02e' : '#ff6a1e' });
      if (Math.random() < 0.15) this.particles.add({ x: R.floorLeft + Math.random() * (R.floorRight - R.floorLeft), y: R.floorTop + Math.random() * 160, vx: (Math.random() - 0.5) * 4, vy: 3, life: 3, color: room.type === 'secret' ? '#3a8a4a' : '#8a809a', glow: room.type === 'secret' });
      this.particles.update(dt);

      // walking out through an open door
      if (!room.locked && this.fadeDir === 0 && !p.dead) {
        const out = room.doors.find((d) => (d.wall === 'N' && p.y < R.floorTop - 4 && Math.abs(p.x - d.x) < R.doorW / 2)
          || (d.wall === 'S' && p.y > R.floorBottom + 4 && Math.abs(p.x - d.x) < R.doorW / 2)
          || (d.wall === 'E' && p.x > R.floorRight + 2 && Math.abs(p.y - d.y) < R.doorH)
          || (d.wall === 'W' && p.x < R.floorLeft - 2 && Math.abs(p.y - d.y) < R.doorH));
        if (out) {
          this.pending = { number: room.number + 1, risky: out.risky, entry: HC.rooms.OPP[out.wall], special: out.secret ? 'secret' : null };
          if (room.type === 'boss' && room.wing === 3 && room.zone === 3) this.pending.victory = true;
          this.fadeDir = 1;
          HC.audio.play(out.secret ? 'secretDoor' : 'door');
        }
      }
    }

    updateProjectiles(dt) {
      const p = this.player, room = this.room;
      for (const o of this.projectiles) {
        o.t += dt; o.life -= dt;
        o.x += o.vx * dt; o.y += o.vy * dt;
        if (o.life <= 0 || o.x < R.floorLeft - 2 || o.x > R.floorRight + 2 || o.y < R.floorTop - 8 || o.y > R.floorBottom + 2) o.dead = true;
        for (const ob of room.obstacles) if (!ob.invisible && HC.overlap({ x: o.x - 1, y: o.y - 1, w: 2, h: 2 }, { x: ob.rect.x, y: ob.rect.y - 18, w: ob.rect.w, h: ob.rect.h + 18 })) o.dead = true;
        const box = { x: o.x - 4, y: o.y - 4, w: 8, h: 8 };
        if (!o.dead && o.friendly) {
          for (const e of this.enemies) {
            if (e.dead || (o.hit && o.hit.has(e))) continue;
            if (e.hitMask && e.hitMask(box, o.damage, this)) { if (o.pierce) o.hit.add(e); else o.dead = true; break; }
            if (e.targetable && HC.overlap(box, e.hurtRect)) {
              const l = Math.hypot(o.vx, o.vy) || 1;
              e.damage(o.damage, o.vx / l, o.vy / l, this, o.kind === 'bolt' ? 'bolt' : 'reflect');
              if (o.pierce) o.hit.add(e); else { o.dead = true; break; }
            }
          }
        } else if (!o.dead && HC.overlap({ x: o.x - 3, y: o.y - 3, w: 6, h: 6 }, p.hurtRect)) {
          if (p.hurt(this, o.x, o.y)) o.dead = true;
        }
        if (o.kind === 'bolt' && Math.random() < 0.8) this.particles.add({ x: o.x, y: o.y, vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20, life: 0.3, color: Math.random() < 0.5 ? '#fff3a6' : '#ffffff' });
        if (o.dead) this.particles.burst(o.x, o.y, 5, { color: o.friendly ? ['#fff3a6', '#ffffff'] : o.kind === 'ink' ? ['#5ad4e8', '#0e1e2a'] : o.kind === 'thorn' ? ['#e8dcc0', '#7a1a2a'] : ['#7a5cff', '#2a1f3c'], speed: 30, life: 0.3 });
      }
      this.projectiles = this.projectiles.filter((o) => !o.dead);
    }

    updateWaves(dt) {
      const p = this.player;
      for (const w of this.waves) {
        w.r += w.speed * dt;
        const d = Math.hypot(p.x - w.x, (p.y - w.y) / 0.7);
        if (!w.hit && Math.abs(d - w.r) < 7 && p.hurt(this, w.x, w.y)) w.hit = true;
      }
      this.waves = this.waves.filter((w) => w.r < w.max);
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
        if (k.t > 0.4 && d < 56 && k.kind !== 'heart') { k.x += ((p.x - k.x) / d) * 150 * dt; k.y += ((p.y - 8 - k.y) / d) * 150 * dt; }
        if (k.t > 0.3 && d < 10 && !p.dead) {
          if (k.kind === 'shard') {
            const n = Math.random() < run.shardMul - 1 ? 2 : 1;
            run.shards += n; HC.audio.play('shard');
            this.floatText(k.x, k.y - 6, '+' + n, '#a8f6ff');
            if (!run.shardTip && HC.save.runs < 3) { run.shardTip = true; this.toastMsg('SHARDS STAY WITH YOU AFTER DEATH - SPEND THEM AT THE ALTAR OF DAWN', '#a8f6ff', 4.5); }
          } else if (k.kind === 'mote') {
            if (run.hp >= run.maxHp) continue;
            run.hp = Math.min(run.maxHp, run.hp + 0.5); HC.audio.play('pickup'); this.floatText(k.x, k.y - 6, '+1/2', '#ff8a9a');
          }
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
      for (const t of room.torches) t.f = Math.random();

      if (['combat', 'ambush', 'boss'].includes(room.type) && room.locked && this.roomTime > 0.5 && this.enemies.length === 0) {
        this.unlock(room.type === 'boss' ? 0 : room.risky ? 3 : 1);
      }

      // explain locked doors when the player walks up to one
      if (room.locked && !this.hinted) {
        const near = room.doors.some((d) => { const a = HC.roomGeo.approach(d); return HC.dist(p.x, p.y, a.x, a.y) < 30; });
        if (near) { this.hinted = true; this.toastMsg(room.type === 'puzzle' ? 'SOLVE THE RUNES TO OPEN THE DOOR' : 'DEFEAT ALL MONSTERS TO OPEN THE DOOR', '#c8b0ff', 2.5); }
      }

      if (room.type === 'puzzle' && room.puzzle) this.updatePuzzle(dt);

      if (room.type === 'treasure') {
        this.nearOffer = null;
        for (const o of room.offers) {
          if (o.taken) continue;
          if (HC.dist(p.x, p.y, o.x, o.y + 6) < 22) {
            this.nearOffer = o;
            if (I.pressed('interact')) {
              o.blessing.apply(run); run.blessings.push(o.blessing.id);
              room.offers.forEach((x) => { x.taken = true; });
              HC.audio.play('blessing'); this.shake(2, 0.2);
              this.particles.burst(o.x, o.y - 22, 40, { color: ['#fff7d0', '#ffd650', '#ffffff'], speed: 90, life: 1 });
              this.toastMsg(o.blessing.name.toUpperCase() + ': ' + o.blessing.desc.toUpperCase());
            }
          }
        }
      }

      if (room.shrine) {
        const s = room.shrine;
        this.nearShrine = HC.dist(p.x, p.y, s.x, s.y + 10) < 30;
        if (this.nearShrine && !s.used && I.pressed('interact')) {
          s.used = true;
          run.hp = Math.min(run.maxHp, run.hp + 1);
          HC.audio.play('blessing');
          this.particles.burst(s.x, s.y - 14, 36, { color: ['#ffe48a', '#ffffff'], speed: 70, life: 1 });
          this.toastMsg('YOUR LIGHT GROWS STRONGER');
        }
      }

      if (room.keyAltar && !room.keyAltar.taken && HC.dist(p.x, p.y, room.keyAltar.x, room.keyAltar.y + 6) < 24 && I.pressed('interact')) {
        room.keyAltar.taken = true; run.keys++; HC.save.greenKeys++; HC.meta.save();
        HC.audio.play('blessing'); this.shake(2, 0.3);
        this.particles.burst(room.keyAltar.x, room.keyAltar.y - 20, 50, { color: ['#5aff8a', '#b8ffc8', '#ffffff'], speed: 90, life: 1.2 });
        this.toastMsg('YOU FOUND A GREEN KEY', '#5aff8a', 3);
      }
    }

    updatePuzzle(dt) {
      const room = this.room, pz = room.puzzle, p = this.player;
      const feet = { x: p.x - 3, y: p.y - 3, w: 6, h: 4 };
      for (const r of room.runes) {
        const on = HC.overlap(feet, { x: r.x - 11, y: r.y - 7, w: 22, h: 14 });
        r.pulse = Math.max(0, r.pulse - dt);
        if (on && !r.under && !pz.solved && !r.lit) {
          if (pz.kind === 'fade') { r.lit = true; r.litT = r.litMax = Math.max(4.5, 7 - room.zone); HC.audio.play('rune'); }
          else if (pz.seq[pz.step] === r.id) { r.lit = true; pz.step++; HC.audio.play('note' + pz.step); pz.showI = -2; }
          else {
            HC.audio.play('runeBad'); pz.fails++;
            room.runes.forEach((u) => { u.lit = false; }); pz.step = 0; pz.showI = -1; pz.showT = 1;
            this.spawnEnemy(['skitter', 'page', 'hound', 'shade'][room.wing], r.x + 40, r.y - 30, room.tier); this.shake(3, 0.2);
            this.toastMsg('WRONG ORDER - WATCH AGAIN', '#ff8a8a', 1.6);
          }
        }
        r.under = on;
        if (pz.kind === 'fade' && r.lit && !pz.solved) { r.litT -= dt; if (r.litT <= 0) { r.lit = false; HC.audio.play('runeBad'); } }
      }
      if (pz.kind === 'order' && pz.step === 0 && pz.showI !== -2) {
        pz.showT -= dt;
        if (pz.showT <= 0) {
          pz.showI++;
          if (pz.showI >= pz.seq.length) { pz.showI = -1; pz.showT = 1.6; }
          else { pz.showT = 0.6; const r = room.runes.find((u) => u.id === pz.seq[pz.showI]); r.pulse = 0.5; HC.audio.play('note' + (pz.showI + 1)); }
        }
      }
      if (!pz.solved && room.runes.every((r) => r.lit)) {
        pz.solved = true;
        this.unlock(3 + room.zone * 2 + (room.risky ? 3 : 0));
        this.dropPickup('mote', HC.W / 2, R.floorTop + 60);
      }
    }

    computeLights() {
      const run = this.run, p = this.player, room = this.room;
      const L = this.lights = [];
      if (!p.dead || this.state === 'dying') {
        const pulse = this.darkPulse > 0 ? 0.5 + 0.5 * (1 - Math.min(1, this.darkPulse / 2.2)) : 1;
        const dying = this.state === 'dying' ? Math.max(0, this.dieT / 2.6) : 1;
        L.push({ x: p.x, y: p.y - 14, r: p.lightRadius(run) * pulse * (0.97 + Math.sin(this.time * 3) * 0.03) * (0.3 + 0.7 * dying), i: 1.35 * (0.4 + 0.6 * dying), c: [1, 0.93, 0.78] });
      }
      for (const t of room.torches) if (t.lit) L.push({ x: t.x, y: t.y - 4, r: 62 + (t.f || 0) * 6, i: 0.75, c: [1, 0.58, 0.3] });
      for (const w of room.windows || []) L.push({ x: w.x, y: R.floorTop + 26, r: 44, i: 0.35, c: room.wing === 3 ? [0.7, 0.4, 1] : [1, 0.5, 0.6] });
      for (const o of room.obstacles) {
        if (o.kind === 'candles' || o.kind === 'table' || o.kind === 'desk') L.push({ x: o.x, y: o.y - 12, r: o.kind === 'table' ? 70 : 40, i: 0.5, c: [1, 0.75, 0.45] });
        if (o.kind === 'obelisk') L.push({ x: o.x, y: o.y - 20, r: 30, i: 0.3, c: [0.6, 0.4, 1] });
      }
      if (room.puzzle) for (const r of room.runes) {
        const col = room.puzzle.kind === 'order' ? [1, 0.8, 0.4] : [0.35, 1, 0.85];
        if (r.lit) L.push({ x: r.x, y: r.y, r: 36, i: 0.55, c: col });
        else if (r.pulse > 0) L.push({ x: r.x, y: r.y, r: 56, i: 0.9 * (r.pulse / 0.5), c: [1, 0.95, 0.7] });
        else L.push({ x: r.x, y: r.y, r: 18, i: 0.22, c: col });
      }
      for (const o of this.projectiles) L.push({ x: o.x, y: o.y, r: o.friendly ? 46 : 16, i: o.friendly ? 0.7 : 0.22, c: o.friendly ? PROJ_LIGHT.bolt : PROJ_LIGHT[o.kind] });
      if (room.type === 'treasure') for (const o of room.offers) if (!o.taken) L.push({ x: o.x, y: o.y - 22, r: 40, i: 0.5, c: [1, 0.9, 0.6] });
      if (room.shrine) L.push({ x: room.shrine.x, y: room.shrine.y - 12, r: room.shrine.used ? 50 : 80, i: 0.65, c: [1, 0.75, 0.45] });
      if (room.keyAltar && !room.keyAltar.taken) L.push({ x: room.keyAltar.x, y: room.keyAltar.y - 20, r: 70, i: 0.7, c: [0.3, 1, 0.5] });
      for (const d of room.doors) {
        const a = HC.roomGeo.approach(d);
        if (d.secret) L.push({ x: a.x, y: a.y - 16, r: 44, i: 0.55 + 0.15 * Math.sin(this.time * 2), c: [0.3, 1, 0.45] });
        if (room.locked) L.push({ x: a.x, y: a.y - 14, r: 26, i: 0.3, c: [0.6, 0.4, 1] });
        else if (d.risky) L.push({ x: a.x, y: a.y - 14, r: 34, i: 0.45, c: [1, 0.25, 0.25] });
      }
      if (p.attackT > 0) { const b = p.attackBox(run); L.push({ x: b.x + b.w / 2, y: b.y + b.h / 2, r: 48, i: 0.45, c: [1, 0.95, 0.7] }); }
      for (const k of this.pickups) if (k.kind === 'mote') L.push({ x: k.x, y: k.y, r: 14, i: 0.3, c: [1, 0.9, 0.6] });
    }

    // ---------------- drawing ----------------
    draw(ctx) {
      const w = this.wctx, room = this.room, p = this.player;
      w.drawImage(room.bg, 0, 0);
      for (const t of room.torches) { w.fillStyle = '#2a2030'; w.fillRect(t.x - 1, t.y, 3, 7); w.fillStyle = '#5a4a40'; w.fillRect(t.x - 2, t.y, 5, 1); }
      if (room.puzzle) for (const r of room.runes) {
        w.fillStyle = '#16131f'; w.fillRect(r.x - 11, r.y - 7, 22, 14);
        w.fillStyle = room.puzzle.kind === 'order' ? '#3a2e22' : '#22303a'; w.fillRect(r.x - 10, r.y - 6, 20, 12);
      }
      for (const wv of this.waves) this.drawWave(w, wv, false);

      const list = [];
      for (const o of room.obstacles) {
        if (o.invisible) continue;
        list.push({ y: o.y, d: () => { const c = HC.roomArt.obstacle(o, room.theme); if (c) w.drawImage(c, Math.round(o.x - c.width / 2), Math.round(o.y - c.height + 2)); } });
      }
      for (const e of this.enemies) list.push({ y: e.y, d: () => e.draw(w) });
      list.push({ y: p.y, d: () => p.draw(w) });
      if (room.type === 'treasure') for (const o of room.offers) list.push({ y: o.y + 6, d: () => HC.sprites.draw(w, HC.art.pedestal, o.x, o.y + 6) });
      if (room.keyAltar) list.push({ y: room.keyAltar.y + 6, d: () => HC.sprites.draw(w, HC.art.pedestal, room.keyAltar.x, room.keyAltar.y + 6) });
      if (room.shrine) list.push({ y: room.shrine.y + 2, d: () => this.drawShrine(w, room.shrine) });
      list.sort((a, b) => a.y - b.y).forEach((o) => o.d());
      this.particles.draw(w, false);

      HC.light.apply(w, this.lights, { ambient: this.theme.ambient, night: HC.hex(this.theme.night), top: HC.HUD_H });

      // ---- glow layer (after lighting) ----
      for (const t of room.torches) if (t.lit) this.drawFlame(w, t.x, t.y);
      for (const o of room.obstacles) if (o.kind === 'candles' || o.kind === 'table' || o.kind === 'desk') this.drawCandleFlames(w, o);
      this.drawDoorMarks(w);
      this.drawRuneGlyphs(w);
      if (room.type === 'treasure') this.drawOffers(w);
      if (room.keyAltar && !room.keyAltar.taken) HC.sprites.draw(w, HC.art.key, room.keyAltar.x, room.keyAltar.y - 12 + Math.round(Math.sin(this.time * 2.5) * 2), 'glow');
      if (room.shrine) this.drawShrineFlames(w, room.shrine);
      for (const k of this.pickups) {
        const s = k.kind === 'shard' ? HC.art.shard : k.kind === 'heart' ? HC.art.heart : HC.art.mote;
        HC.sprites.draw(w, s, k.x, k.y + 3 + Math.round(Math.sin(k.t * 6)), 'glow');
      }
      for (const e of this.enemies) e.drawGlow(w);
      for (const wv of this.waves) this.drawWave(w, wv, true);
      for (const o of this.projectiles) this.drawProjectile(w, o);
      p.drawGlow(w, this.run, this.time);
      this.particles.draw(w, true);
      for (const f of this.floaters) { w.globalAlpha = Math.min(1, f.t * 2); F_draw(w, f.text, f.x, f.y, f.color, { align: 'center' }); w.globalAlpha = 1; }

      // ---- compose ----
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, HC.W, HC.H);
      const sx = this.shakeT > 0 ? Math.round((Math.random() - 0.5) * this.shakeMag * 2) : 0;
      const sy = this.shakeT > 0 ? Math.round((Math.random() - 0.5) * this.shakeMag * 2) : 0;
      ctx.drawImage(this.world, 0, HC.HUD_H, HC.W, HC.H - HC.HUD_H, sx, HC.HUD_H + sy, HC.W, HC.H - HC.HUD_H);
      this.drawHud(ctx);
      this.drawOverlays(ctx);
    }

    drawProjectile(w, o) {
      const x = Math.round(o.x), y = Math.round(o.y), s = Math.floor(o.t * 12) % 2;
      if (o.friendly) {
        w.fillStyle = '#ffd650'; w.fillRect(x - 3, y - 2, 6, 4); w.fillRect(x - 2, y - 3, 4, 6);
        w.fillStyle = '#fff7d0'; w.fillRect(x - 2, y - 1, 4, 2); w.fillRect(x - 1, y - 2, 2, 4);
        w.fillStyle = '#ffffff'; w.fillRect(x, y - 1, 1, 1);
        return;
      }
      if (o.kind === 'thorn') {
        const l = Math.hypot(o.vx, o.vy) || 1, ux = o.vx / l, uy = o.vy / l;
        for (let k = -3; k <= 2; k++) { w.fillStyle = k >= 1 ? '#ffffff' : k >= -1 ? '#e8dcc0' : '#7a1a2a'; w.fillRect(Math.round(o.x + ux * k), Math.round(o.y + uy * k), 1, 1); }
        return;
      }
      const ink = o.kind === 'ink';
      w.fillStyle = ink ? '#06202a' : '#2a1050'; w.fillRect(x - 3, y - 2, 6, 4); w.fillRect(x - 2, y - 3, 4, 6);
      w.fillStyle = ink ? (s ? '#2a8aa0' : '#5ad4e8') : (s ? '#9a7cff' : '#c8b0ff'); w.fillRect(x - 2, y - 1, 4, 2); w.fillRect(x - 1, y - 2, 2, 4);
      w.fillStyle = '#ffffff'; w.fillRect(x, y - 1, 1, 1);
    }

    drawWave(w, wv, glow) {
      const fade = 1 - wv.r / wv.max;
      for (let a = 0; a < 90; a++) {
        if (Math.random() > fade + 0.2) continue;
        const ang = (a / 90) * Math.PI * 2;
        const x = Math.round(wv.x + Math.cos(ang) * wv.r), y = Math.round(wv.y + Math.sin(ang) * wv.r * 0.7);
        w.fillStyle = glow ? (a % 3 ? '#ff8a5a' : '#ffd0a0') : '#1a1010';
        w.fillRect(x, y + (glow ? 0 : 1), glow ? 1 : 2, 1);
      }
    }

    drawFlame(w, x, y) {
      const t = this.time * 10 + x, pal = ['#ff6a1e', '#ffb02e', '#fff0a0'];
      for (let j = 0; j < 8; j++) {
        const wd = Math.max(0, Math.round((1 - j / 8) * 2.6 + Math.sin(t + j) * 0.5));
        const sway = Math.round(Math.sin(t * 0.7 + j * 0.6) * (j / 8) * 1.5);
        for (let i = -wd; i <= wd; i++) { w.fillStyle = pal[Math.abs(i) < wd * 0.4 && j < 5 ? 2 : Math.abs(i) < wd * 0.8 ? 1 : 0]; w.fillRect(x + i + sway, y - 1 - j, 1, 1); }
      }
    }
    drawCandleFlames(w, o) {
      const pts = o.kind === 'candles' ? [[-4, -10], [0, -13], [4, -9]] : o.kind === 'table' ? [[-35, -27], [1, -27], [37, -27]] : [[12, -18]];
      pts.forEach(([dx, dy], i) => {
        const f = Math.sin(this.time * 12 + i * 2 + o.x) > 0;
        w.fillStyle = '#ffb02e'; w.fillRect(o.x + dx, o.y + dy - 2, 1, 3); if (f) w.fillRect(o.x + dx - 1, o.y + dy - 1, 1, 1);
        w.fillStyle = '#fff0a0'; w.fillRect(o.x + dx, o.y + dy - 1, 1, 1);
      });
    }

    // Door seals, risky-door markers.
    drawDoorMarks(w) {
      const room = this.room;
      for (const d of room.doors) {
        const a = HC.roomGeo.approach(d);
        if (room.locked) {
          w.fillStyle = d.secret ? '#1e5a2c' : '#3a2470';
          if (d.wall === 'N') { const yTop = R.top + R.cap + 8 + R.doorW / 2 - 4; for (let i = 6; i < R.doorW; i += 8) w.fillRect(d.x - R.doorW / 2 + i, yTop, 2, R.floorTop - yTop); }
          else if (d.wall === 'S') for (let i = 6; i < R.doorW; i += 8) w.fillRect(d.x - R.doorW / 2 + i, R.floorBottom, 2, R.bottom);
          else { const x0 = d.wall === 'E' ? R.floorRight : 0; for (let j = 4; j < R.doorH; j += 8) w.fillRect(x0, d.y - R.doorH / 2 + j, R.side, 2); }
          const cx = d.wall === 'E' ? R.floorRight + R.side / 2 : d.wall === 'W' ? R.side / 2 : d.x;
          const cy = d.wall === 'N' ? R.top + R.cap + 36 : d.wall === 'S' ? R.floorBottom + 6 : d.y;
          w.fillStyle = Math.sin(this.time * 3) > 0 ? '#c8b0ff' : '#9a7cff';
          w.fillRect(Math.round(cx - 2), Math.round(cy), 5, 1); w.fillRect(Math.round(cx), Math.round(cy - 2), 1, 5);
          [[0, -4], [0, 4], [-4, 0], [4, 0]].forEach(([x, y]) => w.fillRect(Math.round(cx + x), Math.round(cy + y), 1, 1));
        }
        if (d.risky) {
          const on = Math.sin(this.time * 4) > 0;
          w.fillStyle = on ? '#ff3a4a' : '#b0202e';
          if (d.wall === 'N') { const y0 = R.top + R.cap + 30, h = R.floorTop - y0; w.fillRect(d.x - R.doorW / 2 - 5, y0, 2, h); w.fillRect(d.x + R.doorW / 2 + 3, y0, 2, h); }
          else if (d.wall === 'S') { w.fillRect(d.x - R.doorW / 2 - 2, R.floorBottom, 2, R.bottom); w.fillRect(d.x + R.doorW / 2, R.floorBottom, 2, R.bottom); }
          else { const x0 = d.wall === 'E' ? R.floorRight : 0; w.fillRect(x0, d.y - R.doorH / 2 - 5, R.side, 2); w.fillRect(x0, d.y + R.doorH / 2 + 3, R.side, 2); }
          const sx = d.wall === 'E' ? a.x - 16 : d.wall === 'W' ? a.x + 16 : a.x;
          const sy = d.wall === 'N' ? R.top + R.cap + 22 : d.wall === 'S' ? a.y - 24 : a.y - 36;
          this.drawSkull(w, sx, sy);
          F_draw(w, 'HARD X2', sx, d.wall === 'N' ? R.floorTop - 11 : sy + 8, '#ff8a8a', { align: 'center' });
        }
      }
    }
    drawSkull(w, x, y) {
      ['.kkkkk.', 'kwwwwwk', 'kwkwkwk', 'kwwwwwk', '.kwkwk.', '..kkk..'].forEach((r, j) => {
        for (let i = 0; i < 7; i++) if (r[i] !== '.') { w.fillStyle = r[i] === 'k' ? '#3a0a10' : '#ffd0d0'; w.fillRect(Math.round(x - 3 + i), Math.round(y + j), 1, 1); }
      });
    }

    drawRuneGlyphs(w) {
      const room = this.room;
      if (!room.puzzle) return;
      const order = room.puzzle.kind === 'order';
      for (const r of room.runes) {
        const cx = r.x, cy = r.y;
        if (order) {
          // memory runes: golden diamonds that flash white, one after another
          w.fillStyle = r.lit ? '#ffd650' : r.pulse > 0 ? '#ffffff' : '#8a6a30';
          for (let k = -5; k <= 5; k++) { const h = 5 - Math.abs(k); w.fillRect(cx + k, cy - h, 1, 1); w.fillRect(cx + k, cy + h, 1, 1); }
          w.fillRect(cx - 1, cy - 1, 3, 3);
          if (r.pulse > 0) { const rr = 8 + (0.5 - r.pulse) * 30; w.fillStyle = '#fff3a6'; for (let a = 0; a < 24; a++) { const ang = (a / 24) * Math.PI * 2; w.fillRect(Math.round(cx + Math.cos(ang) * rr), Math.round(cy + Math.sin(ang) * rr * 0.7), 1, 1); } }
          if (r.lit) F_draw(w, String(room.puzzle.seq.indexOf(r.id) + 1), cx + 9, cy - 10, '#ffd650');
        } else {
          // light runes: teal circles with a shrinking timer ring
          w.fillStyle = r.lit ? '#4fe3c8' : '#2a7a72';
          const shape = [[-6, 0], [-5, -2], [-4, -3], [-2, -4], [0, -4], [2, -4], [4, -3], [5, -2], [6, 0], [5, 2], [4, 3], [2, 4], [0, 4], [-2, 4], [-4, 3], [-5, 2], [0, -2], [0, -1], [0, 0], [0, 1], [0, 2], [-2, 0], [-1, 0], [1, 0], [2, 0]];
          for (const [a, b] of shape) w.fillRect(cx + a, cy + b, 1, 1);
          if (r.lit) {
            const frac = r.litT / r.litMax;
            w.fillStyle = frac < 0.3 && Math.floor(this.time * 8) % 2 ? '#ff8a5a' : '#b8fff0';
            for (let a = 0; a < 28 * frac; a++) { const ang = -Math.PI / 2 + (a / 28) * Math.PI * 2; w.fillRect(Math.round(cx + Math.cos(ang) * 10), Math.round(cy + Math.sin(ang) * 7), 1, 1); }
          }
        }
      }
    }

    drawOffers(w) {
      for (const o of this.room.offers) {
        if (o.taken) continue;
        const cx = o.x, cy = o.y - 22 + Math.round(Math.sin(this.time * 2.5 + o.x) * 2);
        const ring = ['#fff7d0', '#ffd650', '#ffe48a'];
        for (let a = 0; a < 16; a++) { const ang = (a / 16) * Math.PI * 2 + this.time; w.fillStyle = ring[a % 3]; w.fillRect(Math.round(cx + Math.cos(ang) * 7), Math.round(cy + Math.sin(ang) * 7), 1, 1); }
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
        if (s.used && i !== 1) return;
        const fx = s.x + dx, fy = s.y - 12 - h, f = Math.sin(this.time * 12 + i * 2) > 0;
        w.fillStyle = '#ffb02e'; w.fillRect(fx, fy - 2, 1, 3); w.fillRect(fx - (f ? 1 : 0), fy - 1, 1, 1);
        w.fillStyle = '#fff0a0'; w.fillRect(fx, fy - 1, 1, 1);
      });
    }

    drawHud(ctx) {
      const run = this.run;
      ctx.fillStyle = '#0b0812'; ctx.fillRect(0, 0, HC.W, HC.HUD_H - 1);
      ctx.fillStyle = '#2a2238'; ctx.fillRect(0, HC.HUD_H - 1, HC.W, 1);
      for (let i = 0; i < run.maxHp; i++) {
        const fill = HC.clamp(run.hp - i, 0, 1), beat = run.hp <= 1 && fill > 0 && Math.sin(this.time * 8) > 0 ? -1 : 0;
        const hx = 10 + i * 9, hy = 13 + beat, s = HC.art.heart;
        HC.sprites.draw(ctx, s, hx, hy, 'glow', false, 0.22);
        if (fill >= 1) HC.sprites.draw(ctx, s, hx, hy, 'glow');
        else if (fill > 0) ctx.drawImage(s.glow, 0, 0, Math.ceil(s.w / 2), s.h, Math.round(hx - s.w / 2), Math.round(hy - s.h), Math.ceil(s.w / 2), s.h);
      }
      let x = 12 + run.maxHp * 9;
      HC.sprites.draw(ctx, HC.art.shard, x + 2, 12, 'glow');
      F_draw(ctx, String(run.shards), x + 8, 5, '#a8f6ff');
      x += 20 + HC.font.measure(String(run.shards));
      if (HC.save.greenKeys) { HC.sprites.draw(ctx, HC.art.key, x + 2, 15, 'glow'); F_draw(ctx, String(HC.save.greenKeys), x + 8, 5, '#5aff8a'); }

      const label = 'ROOM ' + String(run.room).padStart(3, '0');
      F_draw(ctx, label, HC.W - 8, 5, this.room.risky ? '#ffb0b0' : this.room.type === 'secret' ? '#5aff8a' : '#e8dcc0', { align: 'right' });
      const wing = ROMAN[this.room.zone % 12];
      F_draw(ctx, wing, HC.W - 14 - HC.font.measure(label), 5, '#6a5a7e', { align: 'right' });
      if (this.room.risky) F_draw(ctx, 'HARD X2', HC.W - 22 - HC.font.measure(label) - HC.font.measure(wing), 5, '#ff6a7a', { align: 'right' });
      if (HC.audio.muted) F_draw(ctx, 'MUTED', HC.W / 2 + 60, 5, '#4a3a5a', { align: 'center' });
    }

    drawOverlays(ctx) {
      const room = this.room;
      const boss = this.enemies.find((e) => e.isBoss);
      if (boss) {
        const bw = 220, x = HC.W / 2 - bw / 2, y = HC.H - 14;
        F_draw(ctx, boss.name, HC.W / 2, y - 10, '#e8dcc0', { align: 'center', shadow: '#000' });
        ctx.fillStyle = '#0b0812'; ctx.fillRect(x - 1, y - 1, bw + 2, 6);
        ctx.fillStyle = '#3a1020'; ctx.fillRect(x, y, bw, 4);
        ctx.fillStyle = '#d0283c'; ctx.fillRect(x, y, Math.round(bw * Math.max(0, boss.hp / boss.maxHp)), 4);
        ctx.fillStyle = '#ff8a8a'; ctx.fillRect(x, y, Math.round(bw * Math.max(0, boss.hp / boss.maxHp)), 1);
      }

      let msg = null, alpha = 1;
      const p = this.player;
      if (this.nearOffer && room.type === 'treasure') msg = this.nearOffer.blessing.name.toUpperCase() + ' - ' + this.nearOffer.blessing.desc.toUpperCase() + '   [E] TAKE';
      else if (this.nearShrine && room.shrine && !room.shrine.used) msg = 'PRAY AT THE SHRINE: +1 HEART   [E]';
      else if (room.keyAltar && !room.keyAltar.taken && HC.dist(p.x, p.y, room.keyAltar.x, room.keyAltar.y) < 32) msg = 'TAKE THE GREEN KEY   [E]';
      else if (this.nearShrine && room.text) msg = room.text;
      else if (room.text && this.roomTime < 5.5) { msg = room.text; alpha = Math.min(1, (5.5 - this.roomTime) * 1.5, this.roomTime * 2); }
      if (msg) {
        ctx.globalAlpha = Math.max(0, alpha);
        const mw = HC.font.measure(msg) + 16;
        ctx.fillStyle = 'rgba(5,3,10,0.75)'; ctx.fillRect(HC.W / 2 - mw / 2, HC.HUD_H + 2, mw, 13);
        const col = room.puzzle ? (room.puzzle.kind === 'order' ? '#ffd650' : '#4fe3c8') : room.type === 'secret' ? '#5aff8a' : '#e8dcc0';
        F_draw(ctx, msg, HC.W / 2, HC.HUD_H + 5, col, { align: 'center' });
        ctx.globalAlpha = 1;
      }
      if (room.type === 'intro' && this.roomTime < 15) {
        ctx.globalAlpha = Math.min(1, (15 - this.roomTime) / 2);
        ['WASD MOVE   J SLASH   K DASH   E USE', 'YOUR LIGHT IS YOUR LIFE - SLASH ORBS TO SEND THEM BACK'].forEach((l, i) => {
          const mw = HC.font.measure(l) + 12;
          ctx.fillStyle = 'rgba(5,3,10,0.7)'; ctx.fillRect(HC.W / 2 - mw / 2, HC.H - 34 + i * 12, mw, 11);
          F_draw(ctx, l, HC.W / 2, HC.H - 32 + i * 12, i ? '#c8b0ff' : '#a89ab8', { align: 'center' });
        });
        ctx.globalAlpha = 1;
      }
      if (this.toast) {
        ctx.globalAlpha = Math.min(1, this.toast.t * 2);
        const mw = HC.font.measure(this.toast.text) + 14, ty = R.floorTop + 8;
        ctx.fillStyle = 'rgba(5,3,10,0.8)'; ctx.fillRect(HC.W / 2 - mw / 2, ty - 3, mw, 13);
        F_draw(ctx, this.toast.text, HC.W / 2, ty, this.toast.color, { align: 'center' });
        ctx.globalAlpha = 1;
      }
      if (this.banner) {
        const b = this.banner, a = Math.min(1, b.t * 1.5, (3.2 - b.t) * 3);
        ctx.globalAlpha = Math.max(0, a);
        ctx.fillStyle = 'rgba(5,3,10,0.6)'; ctx.fillRect(0, 98, HC.W, 50);
        F_draw(ctx, b.title, HC.W / 2, 106, b.color || '#ffd650', { align: 'center', scale: 2, shadow: '#000' });
        F_draw(ctx, b.sub, HC.W / 2, 128, '#a89ab8', { align: 'center' });
        ctx.globalAlpha = 1;
      }
      if (this.fade > 0) { ctx.fillStyle = `rgba(0,0,0,${this.fade})`; ctx.fillRect(0, 0, HC.W, HC.H); }
      if (this.state === 'dying' && this.dieT < 1.2) { ctx.fillStyle = `rgba(0,0,0,${1 - this.dieT / 1.2})`; ctx.fillRect(0, 0, HC.W, HC.H); }
      if (this.paused) {
        ctx.fillStyle = 'rgba(5,3,10,0.8)'; ctx.fillRect(0, 0, HC.W, HC.H);
        F_draw(ctx, 'PAUSED', HC.W / 2, 70, '#ffd650', { align: 'center', scale: 2 });
        ['RESUME', 'ABANDON RUN'].forEach((t, i) => F_draw(ctx, (this.pauseSel === i ? '> ' : '  ') + t, HC.W / 2, 104 + i * 14, this.pauseSel === i ? '#fff7d0' : '#7a6a8a', { align: 'center' }));
        const r = this.run;
        [
          'BLADE DAMAGE ' + r.damage + '   HEARTS ' + r.hp + '/' + r.maxHp,
          r.blessings.length ? 'BLESSINGS: ' + r.blessings.map((id) => HC.BLESSINGS.find((b) => b.id === id).name).join(', ') : 'NO BLESSINGS YET',
          r.gift ? 'GIFT: ' + r.gift : '',
        ].forEach((l, i) => l && F_draw(ctx, l, HC.W / 2, 160 + i * 14, '#a89ab8', { align: 'center' }));
      }
    }
  }

  HC.Game = Game;
})(window.HC);
