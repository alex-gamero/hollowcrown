// Room generation. Every exit leads to a freshly generated room: doors can sit on any
// wall, you always enter through the wall opposite the one you left by, and there is
// no way back.
(function (HC) {
  'use strict';
  const R = HC.ROOM;

  const LORE = [
    'THE KING WORE THE CROWN UNTIL THE CROWN WORE HIM.',
    'WE SEALED THE WINDOWS. THE SUN WAS TOO LOUD.',
    'THE MASKS SMILE SO WE DO NOT HAVE TO.',
    'SHE WAS BORN OF THE LAST DAWN. THEY HID HER BELOW.',
    'DO NOT LOOK AWAY FROM THE PALE ONES.',
    'EVERY DOOR IS A NEW ROOM. EVERY ROOM IS THE SAME HUNGER.',
    'THE BOOKS DROWNED FIRST. THEN THE LIBRARIANS.',
    'COUNT THE DOORS. THEY COUNT YOU BACK.',
    'LIGHT IS NOT KIND. IT ONLY REMEMBERS.',
    'THE GARDEN GROWS WHAT YOU BURY.',
    'AT THE TOP OF THE SPIRE THE CROWN WAITS FOR A HEAD.',
    'SOME WALLS ARE ONLY WALLS UNTIL YOU LOOK CLOSER.',
  ];

  // Monsters per wing: [kind, cost]
  const POOLS = [
    [['skitter', 1], ['doll', 2], ['armor', 3]],
    [['page', 2], ['ink', 2], ['weeper', 2]],
    [['hound', 2], ['root', 2], ['bloom', 2]],
    [['shade', 2], ['eye', 2], ['self', 3]],
  ];
  const BOSSES = ['king', 'archivist', 'gardener', 'crown'];

  const ARCHETYPES = [
    ['hall', 'throne', 'gallery', 'dining', 'chapel', 'pit'],
    ['library', 'flooded', 'reading', 'hall', 'pit'],
    ['garden', 'crypt', 'garden', 'hall', 'pit'],
    ['spire', 'spire', 'pit', 'gallery', 'hall'],
  ];
  const OPP = { N: 'S', S: 'N', E: 'W', W: 'E' };

  // ---------- geometry helpers ----------
  function doorRect(d) { // the walkable opening for a door
    if (d.wall === 'N') return { x: d.x - R.doorW / 2, y: R.top + R.cap, w: R.doorW, h: R.wallH };
    if (d.wall === 'S') return { x: d.x - R.doorW / 2, y: R.floorBottom, w: R.doorW, h: R.bottom };
    if (d.wall === 'E') return { x: R.floorRight, y: d.y - R.doorH / 2, w: R.side, h: R.doorH };
    return { x: 0, y: d.y - R.doorH / 2, w: R.side, h: R.doorH };
  }
  function spawnPoint(room) {
    const e = room.entryDoor;
    if (e.wall === 'S') return { x: e.x, y: R.floorBottom - 6 };
    if (e.wall === 'N') return { x: e.x, y: R.floorTop + 16 };
    if (e.wall === 'E') return { x: R.floorRight - 12, y: e.y + 10 };
    return { x: R.floorLeft + 12, y: e.y + 10 };
  }
  function approach(d) { // a point just inside the room in front of a door
    if (d.wall === 'N') return { x: d.x, y: R.floorTop + 14 };
    if (d.wall === 'S') return { x: d.x, y: R.floorBottom - 6 };
    if (d.wall === 'E') return { x: R.floorRight - 12, y: d.y + 10 };
    return { x: R.floorLeft + 12, y: d.y + 10 };
  }
  HC.roomGeo = { doorRect, spawnPoint, approach };

  function blocked(room, r) {
    if (room.obstacles.some((o) => HC.overlap(r, o.rect))) return true;
    if (room.pits.some((p) => HC.overlap(r, p))) return true;
    return false;
  }
  function nearDoors(room, x, y, dist) {
    return room.doors.concat([room.entryDoor]).some((d) => { const a = approach(d); return HC.dist(a.x, a.y, x, y) < dist; });
  }
  function freeSpot(rng, room, w, h, opts) {
    opts = opts || {};
    for (let t = 0; t < 60; t++) {
      const x = rng.int(R.floorLeft + 16 + w / 2, R.floorRight - 16 - w / 2);
      const y = rng.int(R.floorTop + 18 + h, R.floorBottom - 10);
      const r = { x: x - w / 2 - 4, y: y - h - 4, w: w + 8, h: h + 8 };
      if (blocked(room, r)) continue;
      if (room.pools.some((p) => HC.overlap(r, p)) && !opts.allowWater) continue;
      if (nearDoors(room, x, y, opts.doorGap || 46)) continue;
      if (opts.avoid && opts.avoid.some((a) => HC.dist(a.x, a.y, x, y) < a.r)) continue;
      if (room.runes.some((u) => HC.dist(u.x, u.y, x, y) < 28)) continue;
      return { x, y };
    }
    return null;
  }

  // Flood-fill on a coarse grid to make sure every exit is reachable.
  function reachable(room) {
    const C = 6, gx0 = R.floorLeft, gy0 = R.floorTop;
    const GW = Math.floor((R.floorRight - R.floorLeft) / C), GH = Math.floor((R.floorBottom - R.floorTop) / C);
    const ok = (cx, cy) => cx >= 0 && cy >= 0 && cx < GW && cy < GH && !blocked(room, { x: gx0 + cx * C - 5, y: gy0 + cy * C - 3, w: 10, h: 6 });
    const s = spawnPoint(room);
    const start = [HC.clamp(Math.floor((s.x - gx0) / C), 0, GW - 1), HC.clamp(Math.floor((s.y - gy0) / C), 0, GH - 1)];
    const seen = new Uint8Array(GW * GH), q = [start];
    if (!ok(start[0], start[1])) return false;
    seen[start[1] * GW + start[0]] = 1;
    while (q.length) {
      const [x, y] = q.pop();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (ok(nx, ny) && !seen[ny * GW + nx]) { seen[ny * GW + nx] = 1; q.push([nx, ny]); }
      }
    }
    return room.doors.every((d) => {
      const a = approach(d);
      const cx = HC.clamp(Math.floor((a.x - gx0) / C), 0, GW - 1), cy = HC.clamp(Math.floor((a.y - gy0) / C), 0, GH - 1);
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        const nx = cx + ox, ny = cy + oy;
        if (nx >= 0 && ny >= 0 && nx < GW && ny < GH && seen[ny * GW + nx]) return true;
      }
      return false;
    });
  }

  function addObstacle(room, kind, x, y, w, h, extra) {
    room.obstacles.push(Object.assign({ kind, x, y, rect: { x: x - w / 2, y: y - h, w, h } }, extra || {}));
  }

  // ---------- layouts per archetype ----------
  function layout(room, rng) {
    const A = room.archetype, cx = HC.W / 2, midY = (R.floorTop + R.floorBottom) / 2;
    const tryAdd = (kind, w, h, n, opts) => { for (let i = 0; i < n; i++) { const s = freeSpot(rng, room, w, h, opts); if (s) addObstacle(room, kind, s.x, s.y, w, h); } };
    if (A === 'hall') tryAdd(rng.pick(['pillar', 'urn', 'statue']), 18, 8, rng.int(1, 4));
    else if (A === 'throne') {
      if (!room.doors.concat([room.entryDoor]).some((d) => d.wall === 'N' && Math.abs(d.x - cx) < 60)) addObstacle(room, 'throne', cx, R.floorTop + 30, 30, 12);
      for (const dx of [-110, 110]) for (const y of [midY - 20, midY + 36]) {
        const r = { x: cx + dx - 13, y: y - 12, w: 26, h: 16 };
        if (!blocked(room, r) && !nearDoors(room, cx + dx, y, 40)) addObstacle(room, 'pillar', cx + dx, y, 18, 8);
      }
    } else if (A === 'gallery') tryAdd('statue', 20, 8, rng.int(2, 4));
    else if (A === 'dining') {
      if (!nearDoors(room, cx, midY, 70)) addObstacle(room, 'table', cx, midY + 8, 130, 14);
      tryAdd('urn', 10, 6, rng.int(0, 2));
    } else if (A === 'chapel') {
      for (let row = 0; row < 3; row++) for (const side of [-1, 1]) {
        const x = cx + side * 70, y = R.floorTop + 58 + row * 40;
        if (!nearDoors(room, x, y, 50)) addObstacle(room, 'pew', x, y, 90, 8);
      }
    } else if (A === 'library' || A === 'reading') {
      if (A === 'library') for (let row = 0; row < 2; row++) for (const side of [-1, 1]) {
        const x = cx + side * 105, y = R.floorTop + 64 + row * 64;
        if (!nearDoors(room, x, y, 60)) addObstacle(room, 'shelf', x, y, 96, 10);
      } else tryAdd('desk', 36, 10, rng.int(2, 3));
      tryAdd('urn', 10, 6, rng.int(0, 1));
    } else if (A === 'flooded') {
      for (let i = 0; i < rng.int(2, 3); i++) {
        const w = rng.int(60, 110), h = rng.int(30, 46), x = rng.int(R.floorLeft + 10, R.floorRight - w - 10), y = rng.int(R.floorTop + 16, R.floorBottom - h - 10);
        room.pools.push({ x, y, w, h });
      }
      tryAdd('pillar', 18, 8, rng.int(0, 2));
    } else if (A === 'garden') {
      tryAdd('tree', 14, 8, rng.int(2, 4));
      tryAdd('grave', 12, 6, rng.int(2, 5));
    } else if (A === 'crypt') {
      tryAdd('coffin', 14, 22, rng.int(3, 5));
      tryAdd('candles', 10, 4, rng.int(1, 2));
    } else if (A === 'spire' || A === 'pit') {
      const n = A === 'pit' ? 1 : rng.int(1, 2);
      for (let i = 0; i < n; i++) {
        const w = A === 'pit' ? rng.int(110, 160) : rng.int(50, 90), h = A === 'pit' ? rng.int(46, 64) : rng.int(30, 50);
        const x = A === 'pit' ? cx - w / 2 + rng.int(-30, 30) : rng.int(R.floorLeft + 30, R.floorRight - w - 30);
        const y = A === 'pit' ? midY - h / 2 + rng.int(-10, 10) : rng.int(R.floorTop + 30, R.floorBottom - h - 30);
        if (!nearDoors(room, x + w / 2, y + h / 2, Math.max(w, h) / 2 + 40)) room.pits.push({ x, y, w, h });
      }
      if (A === 'spire') tryAdd('obelisk', 14, 8, rng.int(1, 3));
    }
    // keep every exit reachable: drop obstacles (then pits) until it is
    let guard = 0;
    while (!reachable(room) && guard++ < 30) {
      if (room.obstacles.length) room.obstacles.splice(rng.int(0, room.obstacles.length - 1), 1);
      else if (room.pits.length) room.pits.pop();
      else break;
    }
  }

  // ---------- doors ----------
  function placeDoor(rng, wall, taken) {
    for (let t = 0; t < 20; t++) {
      const d = wall === 'N' || wall === 'S' ? { wall, x: rng.int(5, 19) * 20 } : { wall, y: rng.int(R.floorTop + 30, R.floorBottom - 26) };
      if (!taken.some((o) => o.wall === wall)) return d;
    }
    return null;
  }

  function generate(run, number, risky, entryWall, special) {
    entryWall = entryWall || 'S';
    const seed = (run.seed * 7919 + number * 104729 + (risky ? 31337 : 0) + entryWall.charCodeAt(0) * 97 + (special ? 555 : 0)) >>> 0;
    const rng = HC.makeRng(seed);
    const zone = Math.floor((number - 1) / 10);
    const wing = zone % 4;
    const tier = zone + (risky ? 1 : 0);

    let type;
    if (special === 'secret') type = 'secret';
    else if (number === 1) type = 'intro';
    else if (number % 10 === 0) type = 'boss';
    else if (number % 10 === 1) type = 'shrine';
    else if (run.sinceTreasure >= 5) type = 'treasure';
    else {
      const roll = rng();
      type = roll < 0.44 ? 'combat' : roll < 0.64 ? 'puzzle' : roll < 0.76 ? 'treasure' : roll < 0.88 ? 'ambush' : 'shrine';
      if (type === 'treasure' && run.sinceTreasure < 3) type = 'combat';
      if (risky && type === 'shrine') type = 'combat';
    }

    const theme = type === 'secret' ? HC.SECRET_THEME : HC.THEMES[wing];
    const room = {
      number, seed, theme, zone, wing, tier, type, risky, doors: [], obstacles: [], pits: [], pools: [], runes: [], torches: [], enemies: [], text: null,
      archetype: type === 'boss' || type === 'intro' || type === 'secret' ? 'hall' : rng.pick(ARCHETYPES[wing]),
    };
    if (type === 'shrine' || type === 'treasure') room.archetype = rng.pick(['hall', 'gallery', 'hall']);
    if (type === 'puzzle' && ['pit', 'spire', 'library', 'chapel', 'dining'].includes(room.archetype)) room.archetype = 'hall';

    // entry door
    room.entryDoor = entryWall === 'S' ? { wall: 'S', x: HC.W / 2 } : placeDoor(rng, entryWall, []);

    // exits
    if (type === 'boss' || type === 'intro' || type === 'secret') {
      const wall = entryWall === 'N' ? 'E' : 'N';
      room.doors.push(Object.assign(wall === 'N' ? { wall, x: HC.W / 2 } : placeDoor(rng, wall, [room.entryDoor]), { risky: false }));
    } else {
      // one way forward, on a random wall (never the one you came in by)
      const wall = rng.pick(['N', 'N', 'E', 'W', 'S'].filter((w) => w !== entryWall));
      room.doors.push(Object.assign(placeDoor(rng, wall, [room.entryDoor]), { risky: false }));
    }

    // a hidden passage to the green room (at most once per wing)
    if (!['boss', 'secret', 'intro'].includes(type) && number % 10 >= 3 && !run.secretWings[zone] && rng() < 0.2) {
      const free = ['N', 'E', 'W'].filter((w) => w !== entryWall && !room.doors.some((d) => d.wall === w));
      if (free.length) { const d = placeDoor(rng, rng.pick(free), room.doors.concat([room.entryDoor])); if (d) room.doors.push(Object.assign(d, { secret: true, risky: false })); }
    }

    // wall torches on the north wall
    if (type !== 'secret') [100, 196, 284, 380].forEach((x) => {
      if (room.doors.concat([room.entryDoor]).some((d) => d.wall === 'N' && Math.abs(d.x - x) < 40)) return;
      room.torches.push({ x, y: R.top + R.cap + 22, lit: type === 'ambush' ? rng() < 0.15 : rng() < (wing === 3 ? 0.45 : 0.7) });
    });

    if (!['boss', 'intro', 'secret'].includes(type)) layout(room, rng);
    const spawn = spawnPoint(room);

    // content
    if (type === 'combat' || type === 'ambush') {
      const pos = number % 10;
      let budget = Math.min(10, 2 + Math.floor(pos / 2) + tier * 2 + (type === 'ambush' ? 1 : 0));
      const pool = POOLS[wing].filter((p, i) => pos >= 4 || i < 2 || zone >= 4);
      while (budget > 0) {
        const [kind, cost] = rng.pick(pool);
        if (cost > budget) { room.enemies.push({ kind: POOLS[wing][0][0] }); break; }
        room.enemies.push({ kind }); budget -= cost;
        if (kind === 'page') { room.enemies.push({ kind }); room.enemies.push({ kind }); }
      }
      room.enemies.forEach((e) => {
        const s = freeSpot(rng, room, 16, 8, { avoid: [{ x: spawn.x, y: spawn.y, r: 110 }], allowWater: true, doorGap: 30 }) || { x: rng.int(80, 400), y: R.floorTop + 40 };
        e.x = s.x; e.y = s.y;
      });
    } else if (type === 'puzzle') {
      room.puzzle = { kind: rng.pick(['fade', 'order']), solved: false, seq: [], step: 0, showT: 1.2, showI: -1, fails: 0 };
      const n = 3 + Math.min(2, zone + (risky ? 1 : 0));
      for (let i = 0; i < n; i++) {
        const s = freeSpot(rng, room, 24, 16, { avoid: [{ x: spawn.x, y: spawn.y, r: 40 }] });
        if (s) room.runes.push({ x: s.x, y: s.y, lit: false, litT: 0, pulse: 0, id: i });
      }
      if (room.runes.length < 3) {
        type = room.type = 'shrine'; room.runes = []; room.puzzle = null;
      } else {
        room.puzzle.seq = rng.shuffle(room.runes.map((r) => r.id));
        room.text = room.puzzle.kind === 'fade' ? 'LIGHT RUNES: STEP ON EVERY RUNE BEFORE THEY FADE' : 'MEMORY RUNES: WATCH THE ORDER, THEN WALK IT';
      }
    }
    if (type === 'treasure') {
      const picks = rng.shuffle(HC.BLESSINGS.filter((b) => !(b.id === 'mend' && run.hp === run.maxHp))).slice(0, 3);
      const n = picks.length, y = (R.floorTop + R.floorBottom) / 2 - 4;
      room.offers = picks.map((b, i) => ({ blessing: b, x: HC.W / 2 + (i - (n - 1) / 2) * 64, y, taken: false }));
      room.obstacles = room.obstacles.filter((o) => !room.offers.some((f) => HC.dist(f.x, f.y, o.x, o.y) < 40));
      room.pits = room.pits.filter((p) => !room.offers.some((f) => HC.overlap({ x: f.x - 30, y: f.y - 30, w: 60, h: 60 }, p)));
      room.offers.forEach((o) => addObstacle(room, 'pedestalBlock', o.x, o.y + 6, 12, 6, { invisible: true }));
      room.text = 'BLESSING ALTAR: CHOOSE ONE GIFT FOR THIS RUN';
    } else if (type === 'shrine') {
      const sy = (R.floorTop + R.floorBottom) / 2 - 10;
      room.shrine = { x: HC.W / 2, y: sy, used: false };
      room.obstacles = room.obstacles.filter((o) => HC.dist(o.x, o.y, HC.W / 2, sy) > 50);
      room.pits = room.pits.filter((p) => !HC.overlap({ x: HC.W / 2 - 40, y: sy - 40, w: 80, h: 80 }, p));
      addObstacle(room, 'shrineBlock', HC.W / 2, sy + 2, 36, 12, { invisible: true });
      room.text = room.text || rng.pick(LORE);
    } else if (type === 'boss') {
      room.enemies.push({ kind: BOSSES[wing], x: HC.W / 2, y: R.floorTop + 80 });
    } else if (type === 'intro') {
      room.text = 'THE CROWN IS HOLLOW. THE HALLS FORGET THE SUN.';
    } else if (type === 'secret') {
      room.keyAltar = { x: HC.W / 2, y: (R.floorTop + R.floorBottom) / 2, taken: false };
      addObstacle(room, 'pedestalBlock', room.keyAltar.x, room.keyAltar.y + 6, 12, 6, { invisible: true });
      room.text = 'A GREEN KEY. IT HUMS FOR A DOOR YOU HAVE NOT FOUND.';
    }

    room.locked = ['combat', 'ambush', 'boss', 'puzzle'].includes(type);
    room.bg = HC.roomArt.bake(room);
    return room;
  }

  HC.rooms = { generate, OPP };
})(window.HC);
