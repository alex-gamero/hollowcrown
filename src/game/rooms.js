// Room generation: every door leads to a freshly generated room, so no two runs match.
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
  ];

  const ENEMY_COST = { skitter: 1, hollow: 2, lament: 2 };

  function pool(zone, number) {
    if (number < 4) return ['skitter', 'hollow'];
    if (zone === 0) return ['skitter', 'skitter', 'hollow', 'lament'];
    if (zone === 1) return ['skitter', 'hollow', 'lament', 'lament'];
    return ['skitter', 'hollow', 'hollow', 'lament'];
  }

  function freeSpot(rng, room, w, h, tries, maxY) {
    for (let t = 0; t < (tries || 40); t++) {
      const x = rng.int(R.floorLeft + 20, R.floorRight - 20), y = rng.int(R.floorTop + 30, maxY || R.floorBottom - 46);
      if (Math.abs(x - HC.W / 2) < 34) continue;
      const r = { x: x - w / 2 - 6, y: y - h - 6, w: w + 12, h: h + 12 };
      if (room.obstacles.some((o) => HC.overlap(r, o.rect))) continue;
      if (room.runes && room.runes.some((u) => HC.overlap(r, { x: u.x - 16, y: u.y - 12, w: 32, h: 24 }))) continue;
      return { x, y };
    }
    return null;
  }

  function generate(run, number, risky) {
    const seed = (run.seed * 7919 + number * 104729 + (risky ? 31337 : 0)) >>> 0;
    const rng = HC.makeRng(seed);
    const zone = Math.floor((number - 1) / 10);
    const theme = HC.THEMES[Math.min(zone, HC.THEMES.length - 1)];
    const tier = zone + (risky ? 1 : 0);

    let type;
    if (number === 1) type = 'intro';
    else if (number % 10 === 0) type = 'boss';
    else if (number % 10 === 1) type = 'shrine';
    else {
      const roll = rng();
      type = roll < 0.42 ? 'combat' : roll < 0.62 ? 'puzzle' : roll < 0.74 ? 'treasure' : roll < 0.86 ? 'ambush' : 'shrine';
      if (risky && (type === 'shrine' || type === 'treasure') && rng() < 0.6) type = 'combat';
    }

    const room = { number, seed, theme, zone, tier, type, risky, doors: [], obstacles: [], runes: [], torches: [], enemies: [], text: null };

    // doors on the north wall
    if (type === 'boss' || type === 'intro') room.doors.push({ x: HC.W / 2, risky: false });
    else if (rng() < 0.38) {
      const riskyLeft = rng() < 0.5;
      room.doors.push({ x: 150, risky: riskyLeft }, { x: 330, risky: !riskyLeft });
    } else room.doors.push({ x: HC.W / 2, risky: false });

    // wall torches
    const torchXs = [100, 196, 284, 380].filter((x) => !room.doors.some((d) => Math.abs(d.x - x) < 40));
    torchXs.forEach((x) => {
      const lit = type === 'ambush' ? rng() < 0.15 : rng() < 0.7;
      room.torches.push({ x, y: R.top + R.cap + 22, lit });
    });

    // obstacles
    if (type !== 'boss' && type !== 'intro') {
      const n = rng.int(0, type === 'treasure' || type === 'shrine' ? 2 : 4);
      for (let i = 0; i < n; i++) {
        const kind = rng.pick(['pillar', 'pillar', 'urn', 'statue']);
        const size = { pillar: [18, 8], urn: [10, 6], statue: [20, 8] }[kind];
        const spot = freeSpot(rng, room, size[0], size[1]);
        if (!spot) continue;
        room.obstacles.push({ kind, x: spot.x, y: spot.y, rect: { x: spot.x - size[0] / 2, y: spot.y - size[1], w: size[0], h: size[1] } });
      }
    }

    // content
    if (type === 'combat' || type === 'ambush') {
      let budget = Math.min(9, 2 + Math.floor((number % 10) / 3) + tier * 2 + (type === 'ambush' ? 1 : 0));
      const choices = pool(zone, number);
      while (budget > 0) {
        const kind = rng.pick(choices);
        if (ENEMY_COST[kind] > budget && budget < 2) { room.enemies.push({ kind: 'skitter' }); break; }
        room.enemies.push({ kind }); budget -= ENEMY_COST[kind];
      }
      room.enemies.forEach((e) => { const s = freeSpot(rng, room, 16, 8, 60, R.floorBottom - 90) || { x: rng.int(60, 420), y: R.floorTop + 40 }; e.x = s.x; e.y = s.y; });
    } else if (type === 'puzzle') {
      room.puzzle = { kind: rng.pick(['fade', 'order']), solved: false, seq: [], step: 0, showT: 0.8, showI: -1, fails: 0 };
      const n = 3 + Math.min(2, zone + (risky ? 1 : 0));
      for (let i = 0; i < n; i++) {
        const s = freeSpot(rng, room, 24, 16);
        if (s) room.runes.push({ x: s.x, y: s.y, lit: false, litT: 0, pulse: 0, id: i });
      }
      if (room.runes.length < 3) { // not enough floor space for a fair puzzle: make it a calm room
        type = room.type = 'shrine'; room.runes = []; room.puzzle = null;
        room.shrine = { x: HC.W / 2, y: R.floorTop + 46, used: false }; room.text = rng.pick(LORE);
      } else room.puzzle.seq = rng.shuffle(room.runes.map((r) => r.id));
      if (!room.puzzle) { /* converted */ } else if (room.puzzle.kind === 'fade') room.text = 'LIGHT EVERY RUNE BEFORE THEY FADE.';
      else room.text = 'WATCH THE RUNES. WALK THEIR ORDER.';
    } else if (type === 'treasure') {
      const picks = rng.shuffle(HC.BLESSINGS.filter((b) => !(b.id === 'mend' && run.hp === run.maxHp))).slice(0, 3);
      room.offers = picks.map((b, i) => ({ blessing: b, x: HC.W / 2 + (i - 1) * 70, y: R.floorTop + 70, taken: false }));
      room.text = 'CHOOSE ONE BLESSING.';
    } else if (type === 'shrine') {
      room.shrine = { x: HC.W / 2, y: R.floorTop + 46, used: false };
      room.text = rng.pick(LORE);
    } else if (type === 'boss') {
      room.enemies.push({ kind: 'king', x: HC.W / 2, y: R.floorTop + 70 });
    } else if (type === 'intro') {
      room.text = 'THE CROWN IS HOLLOW. THE HALLS FORGET THE SUN.';
    }

    room.locked = ['combat', 'ambush', 'boss', 'puzzle'].includes(type);
    room.bg = HC.roomArt.bake(room);
    return room;
  }

  HC.rooms = { generate };
})(window.HC);
