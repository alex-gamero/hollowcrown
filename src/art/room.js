// Procedural room painting: floors, walls, doors, carpets, pits, water and wall
// decoration are painted once per room. Furniture is drawn per frame (y-sorted).
(function (HC) {
  'use strict';
  const hex = HC.hex;

  HC.THEMES = [
    {
      name: 'The Gilded Halls', drone: 55, floor: 'slab',
      floorA: '#2a2a3e', floorB: '#24243a', grout: '#15121f', hi: '#3a3a52',
      wall: '#3a2f4c', wallDark: '#231b30', wallHi: '#54466a', mortar: '#18121f',
      carpet: ['#5a1626', '#3e0e1a'], trim: ['#b08a3a', '#6e5424'], moss: '#2c3d33',
      night: '#07040e', ambient: 0.2, banner: '#6a1a2c', wood: ['#4a2e1e', '#2e1c12'],
    },
    {
      name: 'The Drowned Library', drone: 49, floor: 'planks',
      floorA: '#1d2b36', floorB: '#192530', grout: '#0c141c', hi: '#2c4050',
      wall: '#22384a', wallDark: '#132230', wallHi: '#36546a', mortar: '#0a1520',
      carpet: ['#16403f', '#0f2f30'], trim: ['#7ab0a8', '#3e6460'], moss: '#2a5a70',
      night: '#02070e', ambient: 0.18, banner: '#1d4a5a', wood: ['#2e3a3a', '#1a2424'],
    },
    {
      name: 'The Bone Garden', drone: 41, floor: 'dirt',
      floorA: '#2a2922', floorB: '#24231c', grout: '#11100c', hi: '#3a392c',
      wall: '#34302a', wallDark: '#201c18', wallHi: '#4e4838', mortar: '#100e0b',
      carpet: ['#3a2a1c', '#2a1e14'], trim: ['#a89a78', '#5e5440'], moss: '#3a4a26',
      night: '#060504', ambient: 0.18, banner: '#4a3a20', wood: ['#3a2a1a', '#22180e'],
    },
    {
      name: 'The Sunless Spire', drone: 36, floor: 'obsidian',
      floorA: '#1c1626', floorB: '#17121f', grout: '#07050b', hi: '#2e2440',
      wall: '#241a34', wallDark: '#130d1c', wallHi: '#3e2e58', mortar: '#08050c',
      carpet: ['#2a0e2e', '#1c0820'], trim: ['#8a6ab0', '#4a3470'], moss: '#3a1a4a',
      night: '#030106', ambient: 0.14, banner: '#3a1050', wood: ['#2a1e30', '#160f1c'],
    },
  ];
  HC.SECRET_THEME = {
    name: 'The Verdant Hollow', drone: 62, floor: 'slab',
    floorA: '#16261a', floorB: '#132116', grout: '#060d08', hi: '#24402a',
    wall: '#1a3020', wallDark: '#0c1a10', wallHi: '#2e5236', mortar: '#050a06',
    carpet: ['#0e2a14', '#0a1e0e'], trim: ['#5aff8a', '#2a8a44'], moss: '#2e6a34',
    night: '#010402', ambient: 0.05, banner: '#0e3a18', wood: ['#1a2a1a', '#0e180e'],
  };

  // Room geometry shared with gameplay code.
  const G = HC.ROOM = { top: HC.HUD_H, cap: 10, wallH: 52, side: 18, bottom: 12, doorW: 44, doorH: 40 };
  G.floorTop = G.top + G.cap + G.wallH;
  G.floorBottom = HC.H - G.bottom;
  G.floorLeft = G.side;
  G.floorRight = HC.W - G.side;

  function bake(room) {
    const T = room.theme;
    const rng = HC.makeRng(room.seed);
    const [c, ctx] = HC.makeCanvas(HC.W, HC.H);
    const img = ctx.createImageData(HC.W, HC.H);
    const D = img.data;
    const put = (x, y, col) => {
      x |= 0; y |= 0; if (x < 0 || y < 0 || x >= HC.W || y >= HC.H) return;
      const p = (y * HC.W + x) * 4; D[p] = col[0]; D[p + 1] = col[1]; D[p + 2] = col[2]; D[p + 3] = 255;
    };
    const get = (x, y) => { const p = (y * HC.W + x) * 4; return [D[p], D[p + 1], D[p + 2]]; };
    const shade = (col, f) => [col[0] * f, col[1] * f, col[2] * f];
    const blend = (x, y, col, a) => {
      x |= 0; y |= 0; if (x < 0 || y < 0 || x >= HC.W || y >= HC.H) return;
      const o = get(x, y); put(x, y, [o[0] + (col[0] - o[0]) * a, o[1] + (col[1] - o[1]) * a, o[2] + (col[2] - o[2]) * a]);
    };
    const rect = (x, y, w, h, col) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, col); };

    // --- floor ---
    const A = room.archetype;
    let floor = T.floor;
    if (A === 'throne') floor = 'checker';
    else if (A === 'dining' || A === 'library' || A === 'reading') floor = 'planks';
    else if (A === 'garden') floor = 'dirt';
    else if (A === 'crypt' || A === 'gallery' || A === 'chapel') floor = room.wing === 3 ? 'obsidian' : 'slab';
    const fa = hex(T.floorA), fb = hex(T.floorB), grout = hex(T.grout), hi = hex(T.hi), moss = hex(T.moss);
    const fy0 = G.floorTop - 6;
    if (floor === 'slab' || floor === 'obsidian' || floor === 'checker') {
      const TS = floor === 'checker' ? 16 : 24;
      for (let ty = 0; fy0 + ty * TS < HC.H; ty++) for (let tx = 0; tx * TS < HC.W; tx++) {
        let base = (tx + ty) & 1 ? fa : fb;
        if (floor === 'checker') base = (tx + ty) & 1 ? shade(hex(T.hi), 1.15) : shade(fb, 0.8);
        const v = 0.9 + rng() * 0.16;
        const ox = tx * TS, oy = fy0 + ty * TS;
        for (let j = 0; j < TS; j++) for (let i = 0; i < TS; i++) {
          let col = shade(base, v + (rng() < 0.025 ? -0.06 : 0));
          if (floor === 'obsidian' && (i + j * 2) % 11 === 0 && rng() < 0.5) col = shade(hi, 1.3);
          if (i === 0 || j === 0) col = shade(hi, 0.85 * v);
          if (i === TS - 1 || j === TS - 1) col = grout;
          put(ox + i, oy + j, col);
        }
        if (rng() < 0.3) {
          let cx = ox + 3 + rng.int(0, TS - 6), cy = oy + 3 + rng.int(0, TS - 6);
          for (let n = rng.int(5, 12); n > 0; n--) { put(cx, cy, grout); cx += rng() < 0.55 ? 1 : 0; cy += rng() < 0.6 ? 1 : 0; if (rng() < 0.25) cx--; }
        }
        if (rng() < 0.12) {
          const mx = ox + rng.int(0, TS), my = oy + rng.int(0, TS);
          for (let n = 0; n < 14; n++) put(mx + rng.int(-4, 4), my + rng.int(-2, 3), shade(moss, 0.8 + rng() * 0.4));
        }
      }
    } else if (floor === 'planks') {
      const wd = hex(T.wood[0]), wdd = hex(T.wood[1]);
      for (let y = fy0; y < HC.H; y++) {
        const row = Math.floor((y - fy0) / 8), off = (row * 37) % 60;
        for (let x = 0; x < HC.W; x++) {
          const seg = Math.floor((x + off) / 60), sv = HC.makeRng(seg * 31 + row * 7 + room.seed)();
          let col = shade(wd, 0.8 + sv * 0.3);
          if ((y - fy0) % 8 === 7) col = wdd;
          else if ((x + off) % 60 === 0) col = wdd;
          else if (((x * 7 + y * 3) % 23) === 0) col = shade(wd, 0.7);
          put(x, y, col);
        }
      }
    } else { // dirt
      for (let y = fy0; y < HC.H; y++) for (let x = 0; x < HC.W; x++) {
        const n = rng();
        put(x, y, n < 0.08 ? shade(fa, 0.75) : n < 0.12 ? shade(hi, 0.9) : shade(fb, 0.92 + n * 0.1));
      }
      for (let n = 0; n < 120; n++) {
        const x = rng.int(G.floorLeft, G.floorRight), y = rng.int(G.floorTop, G.floorBottom);
        const g = hex(rng.pick(['#4a5a2e', '#3a4a26', '#5a6034']));
        for (let k = 0; k < 3; k++) put(x + k - 1, y - (k === 1 ? 2 : 1), g);
      }
      for (let n = 0; n < 14; n++) { const x = rng.int(G.floorLeft, G.floorRight), y = rng.int(G.floorTop, G.floorBottom); put(x, y, hex('#c8bea8')); put(x + 1, y, hex('#8c8270')); }
    }

    // --- carpet paths: entry -> center -> exits ---
    const geo = HC.roomGeo;
    if (room.wing <= 1 && room.type !== 'secret' && !['garden', 'spire', 'flooded', 'pit', 'library'].includes(A) && room.type !== 'boss') {
      const red = hex(T.carpet[0]), redD = hex(T.carpet[1]), gold = hex(T.trim[0]), goldD = hex(T.trim[1]);
      const cw = 30, ccx = HC.W / 2, ccy = (G.floorTop + G.floorBottom) / 2;
      const strip = (x0, y0, x1, y1) => {
        const minx = Math.min(x0, x1) - cw / 2, maxx = Math.max(x0, x1) + cw / 2, miny = Math.min(y0, y1) - cw / 2, maxy = Math.max(y0, y1) + cw / 2;
        const vertical = Math.abs(x1 - x0) < Math.abs(y1 - y0);
        for (let y = Math.round(miny); y < maxy; y++) for (let x = Math.round(minx); x < maxx; x++) {
          if (y < G.floorTop || y >= G.floorBottom || x < G.floorLeft || x >= G.floorRight) continue;
          const e = vertical ? Math.min(x - minx, maxx - 1 - x) : Math.min(y - miny, maxy - 1 - y);
          let col = ((x >> 1) + (y >> 1)) & 1 ? red : redD;
          if (e < 1) col = shade(redD, 0.6); else if (e < 2) col = gold; else if (e < 3) col = goldD;
          if (rng() < 0.012) col = shade(redD, 0.5);
          put(x, y, col);
        }
      };
      const ends = room.doors.filter((d) => !d.secret).concat([room.entryDoor]).map((d) => geo.approach(d));
      ends.forEach((a) => { strip(a.x, a.y, a.x, ccy); strip(a.x, ccy, ccx, ccy); });
    }

    // stains
    for (let s = 0; s < rng.int(0, 2); s++) {
      const sx = rng.int(60, 420), sy = rng.int(G.floorTop + 20, G.floorBottom - 20);
      for (let j = -4; j <= 4; j++) for (let i = -9; i <= 9; i++) if ((i * i) / 81 + (j * j) / 16 < 1 - rng() * 0.35) blend(sx + i, sy + j, hex(room.type === 'secret' ? '#0e2a14' : '#3a1420'), 0.7);
    }

    // --- water pools ---
    for (const p of room.pools) {
      for (let y = p.y; y < p.y + p.h; y++) for (let x = p.x; x < p.x + p.w; x++) {
        const ex = Math.min(x - p.x, p.x + p.w - 1 - x), ey = Math.min(y - p.y, p.y + p.h - 1 - y);
        if (ex + ey < 2) continue;
        let col = hex('#0e2a3a');
        if (ex < 1 || ey < 1) col = hex('#3a6a7a');
        else if (y < p.y + 3) col = hex('#061620');
        else if (((x * 3 + y * 5) % 17) === 0) col = hex('#1e4a5e');
        put(x, y, col);
      }
    }
    // --- pits (bottomless) ---
    for (const p of room.pits) {
      for (let y = p.y; y < p.y + p.h; y++) for (let x = p.x; x < p.x + p.w; x++) {
        const ey = y - p.y, ex = Math.min(x - p.x, p.x + p.w - 1 - x), eb = p.y + p.h - 1 - y;
        let col = [2, 1, 4];
        if (ey < 6) col = shade(hex(T.wallDark), 0.9 - ey * 0.14);
        if (ex < 1 || eb < 1) col = hex(T.hi);
        else if (ey < 1) col = hex(T.wallHi);
        if (ey >= 6 && ey < 14 && ((x + y) & 1) && ey < 6 + rng() * 8) col = [10, 6, 16];
        put(x, y, col);
      }
    }

    // --- north wall ---
    const wb = hex(T.wall), wd = hex(T.wallDark), wh = hex(T.wallHi), mortar = hex(T.mortar);
    for (let y = G.top; y < G.top + G.cap; y++) for (let x = 0; x < HC.W; x++) put(x, y, y === G.top + G.cap - 1 ? wh : shade(wd, 0.85 + 0.15 * ((x >> 2) & 1)));
    const bh = 6, bw = 12;
    for (let y = G.top + G.cap; y < G.floorTop; y++) {
      const row = Math.floor((y - G.top - G.cap) / bh), off = row & 1 ? bw / 2 : 0, ry = (y - G.top - G.cap) % bh;
      for (let x = 0; x < HC.W; x++) {
        const bx = Math.floor((x + off) / bw), rx = (x + off) % bw;
        const r2 = HC.makeRng(bx * 131 + row * 977 + room.seed)();
        let col = shade(wb, 0.75 + r2 * 0.3);
        if (ry === 0) col = shade(wh, 0.8 + r2 * 0.2);
        if (ry === bh - 1 || rx === bw - 1) col = mortar;
        put(x, y, shade(col, 1 - ((y - G.top - G.cap) / G.wallH) * 0.35));
      }
    }
    for (let x = 0; x < HC.W; x++) for (let j = 0; j < 4; j++) blend(x, G.floorTop + j, [4, 2, 8], 0.65 - j * 0.15);

    // wall decoration
    const allDoors = room.doors.concat([room.entryDoor]);
    const freeWallX = (x, w) => !allDoors.some((d) => d.wall === 'N' && Math.abs(d.x - x) < w);
    const decoXs = [62, 148, 240, 332, 418].filter((x) => freeWallX(x, 44) && !room.torches.some((t) => Math.abs(t.x - x) < 14));
    decoXs.forEach((dx) => {
      const kind = A === 'gallery' ? 'painting' : A === 'chapel' ? 'window' : room.type === 'secret' ? 'vines'
        : room.wing === 0 ? (rng() < 0.7 ? 'banner' : 'painting') : room.wing === 1 ? 'shelf' : room.wing === 2 ? 'roots' : (rng() < 0.5 ? 'window' : 'chains');
      const y0 = G.top + G.cap + 4;
      if (kind === 'banner') {
        const b = hex(T.banner), bd = shade(b, 0.6), gold = hex(T.trim[0]), h = 34;
        for (let j = 0; j < h; j++) for (let i = 0; i < 16; i++) {
          if (j > h - 6 && Math.abs(i - 7.5) < (j - (h - 6)) * 1.4) continue;
          put(dx - 8 + i, y0 + j, i < 2 || i > 13 ? bd : j === 2 ? gold : b);
        }
        [[5, 12], [7, 10], [8, 12], [10, 10], [11, 12]].forEach(([i, j]) => put(dx - 8 + i, y0 + j, gold));
        for (let i = 5; i <= 11; i++) put(dx - 8 + i, y0 + 13, gold);
        rect(dx - 10, y0 - 1, 20, 2, hex('#5a4a40'));
      } else if (kind === 'painting') {
        const fw = 24, fh = 20, gold = hex(T.trim[0]), goldD = hex(T.trim[1]);
        rect(dx - fw / 2 - 2, y0 + 4, fw + 4, fh + 4, goldD); rect(dx - fw / 2 - 1, y0 + 5, fw + 2, fh + 2, gold);
        rect(dx - fw / 2, y0 + 6, fw, fh, hex(rng.pick(['#2a1a2a', '#1a2a3a', '#2a2a1a'])));
        // a portrait whose face has been scratched out
        rect(dx - 4, y0 + 10, 8, 8, hex('#c8b8a8')); rect(dx - 6, y0 + 18, 12, 8, hex('#3a2030'));
        for (let k = 0; k < 6; k++) put(dx - 3 + k, y0 + 11 + (k % 3) * 2, hex('#1a0a10'));
      } else if (kind === 'window') {
        const cols = room.wing === 3 ? ['#5a2a8a', '#2a1a5a', '#8a4ab0'] : ['#8a1a2a', '#1a3a8a', '#c0902a', '#2a6a3a'];
        for (let j = 0; j < 34; j++) for (let i = 0; i < 14; i++) {
          const cxx = i - 6.5, cyy = j - 7;
          if (j < 7 && cxx * cxx + cyy * cyy > 49) continue;
          let col = hex(cols[((i >> 2) + (j >> 2)) % cols.length]);
          if (i % 5 === 0 || j % 6 === 0) col = hex('#1a1420');
          if (i === 0 || i === 13) col = hex('#3a3048');
          put(dx - 7 + i, y0 + j, col);
        }
        room.windows = (room.windows || []).concat([{ x: dx, y: y0 + 17 }]);
      } else if (kind === 'shelf') {
        const wood = hex('#3a2a20'), woodD = hex('#22160f');
        rect(dx - 16, y0, 32, 46, woodD);
        for (let s = 0; s < 3; s++) {
          const sy = y0 + 2 + s * 15;
          rect(dx - 14, sy + 12, 28, 2, wood);
          let bx = dx - 14;
          while (bx < dx + 12) {
            const w = rng.int(2, 4), h = rng.int(8, 12);
            if (rng() < 0.85) rect(bx, sy + 12 - h, w, h, hex(rng.pick(['#5a2a2a', '#2a4a5a', '#4a4a2a', '#3a2a4a', '#6a5a3a'])));
            bx += w + (rng() < 0.2 ? 2 : 0);
          }
        }
      } else if (kind === 'roots' || kind === 'vines') {
        const col = hex(kind === 'vines' ? '#1e5a2a' : '#2e2418');
        for (let s = 0; s < 2; s++) {
          let x = dx + rng.int(-12, 12), y = G.top + G.cap;
          for (let n = 0; n < rng.int(30, 52); n++) { put(x, y, col); put(x + 1, y, col); y++; x += rng.int(-1, 1); if (kind === 'vines' && n % 6 === 0) put(x + 2, y, hex('#3a9a4a')); }
        }
      } else if (kind === 'chains') {
        for (const ox of [-6, 6]) { const len = rng.int(16, 34); for (let j = 0; j < len; j++) put(dx + ox, y0 + j, j % 3 === 0 ? hex('#151018') : hex('#6c6478')); rect(dx + ox - 1, y0 + len, 3, 2, hex('#4a4250')); }
      }
    });

    // side + bottom walls
    for (let y = G.top; y < HC.H; y++) for (let x = 0; x < G.side; x++) {
      const col = x === G.side - 1 ? wh : shade(wd, 0.7 + 0.1 * (((y >> 2) + x) & 1));
      put(x, y, col); put(HC.W - 1 - x, y, col);
    }
    for (let y = G.floorBottom; y < HC.H; y++) for (let x = G.side; x < HC.W - G.side; x++) put(x, y, y === G.floorBottom ? wh : wd);

    // cobwebs
    const web = hex(room.type === 'secret' ? '#4a8a5a' : '#9a92a8');
    for (let i = 0; i < 12; i++) {
      blend(G.side + i, G.floorTop, web, 0.35); blend(G.side, G.floorTop + i, web, 0.35); blend(G.side + i, G.floorTop + 11 - i, web, 0.5);
      blend(HC.W - G.side - 1 - i, G.floorTop, web, 0.35); blend(HC.W - G.side - 1, G.floorTop + i, web, 0.35); blend(HC.W - G.side - 1 - i, G.floorTop + 11 - i, web, 0.5);
    }

    // --- doors ---
    room.plaques = [];
    const frame = hex('#6a5a7e'), frameD = hex('#3e3350');
    const drawDoor = (d, closed) => {
      if (d.secret) {
        // a cracked patch of wall: only noticeable up close, in your light
        const crack = hex('#0a0610'), mossC = hex('#2e6a34');
        const cx0 = d.wall === 'N' ? d.x : d.wall === 'E' ? HC.W - G.side / 2 : G.side / 2;
        const cy0 = d.wall === 'N' ? G.top + G.cap + 30 : d.y;
        let x = cx0, y = cy0 - 14;
        for (let n = 0; n < 26; n++) { put(x, y, crack); if (n % 5 === 2) put(x + 1, y, mossC); y++; x += rng.int(-1, 1); }
        x = cx0 - 4; y = cy0 - 4;
        for (let n = 0; n < 9; n++) { put(x, y, crack); x++; y += rng.int(-1, 1); }
        return;
      }
      if (d.wall === 'N') {
        const dW = G.doorW, dX = Math.round(d.x - dW / 2), dTop = G.top + G.cap + 8, dBot = G.floorTop;
        for (let y = dTop - 3; y < dBot; y++) for (let x = dX - 3; x < dX + dW + 3; x++) {
          const cx = x - (dX + dW / 2), cy = y - (dTop + dW / 2), upper = y < dTop + dW / 2;
          const outer = upper ? cx * cx + cy * cy <= (dW / 2 + 3) ** 2 : Math.abs(cx) <= dW / 2 + 3;
          const inner = upper ? cx * cx + cy * cy <= (dW / 2) ** 2 : Math.abs(cx) < dW / 2;
          if (inner) put(x, y, closed ? ((x >> 2) & 1 ? hex('#2a1a12') : hex('#3a2418')) : [5 + (y - dTop) * 0.25, 3 + (y - dTop) * 0.12, 8 + (y - dTop) * 0.35]);
          else if (outer) put(x, y, (x + y) & 3 ? frame : frameD);
        }
        if (!closed) {
          const plW = 22, plX = Math.round(d.x - plW / 2), plY = dTop - 13;
          rect(plX - 1, plY - 1, plW + 2, 11, hex('#1a1424'));
          rect(plX, plY, plW, 9, d.risky ? hex('#6a1a24') : hex('#8a7340'));
          room.plaques.push({ x: d.x, y: plY + 1, label: String(room.number + 1).padStart(3, '0'), risky: d.risky });
        }
      } else if (d.wall === 'S') {
        for (let y = G.floorBottom; y < HC.H; y++) for (let x = d.x - G.doorW / 2; x < d.x + G.doorW / 2; x++) {
          const edge = Math.abs(x - d.x) > G.doorW / 2 - 3;
          put(x, y, edge ? frame : closed ? hex('#2a1a12') : [4, 2, 6]);
        }
      } else {
        const x0 = d.wall === 'E' ? HC.W - G.side : 0;
        for (let y = d.y - G.doorH / 2 - 3; y < d.y + G.doorH / 2 + 3; y++) for (let x = x0; x < x0 + G.side; x++) {
          const edge = y < d.y - G.doorH / 2 || y >= d.y + G.doorH / 2;
          put(x, y, edge ? ((x + y) & 3 ? frame : frameD) : closed ? ((y >> 2) & 1 ? hex('#2a1a12') : hex('#3a2418')) : [4 + (x - x0) * 0.2, 2, 7]);
        }
      }
    };
    room.doors.forEach((d) => drawDoor(d, false));
    drawDoor(room.entryDoor, true);

    ctx.putImageData(img, 0, 0);
    room.plaques.forEach((p) => HC.font.draw(ctx, p.label, p.x, p.y, p.risky ? '#ffb0b0' : '#2a1c10', { align: 'center' }));
    return c;
  }

  // ---------------- furniture (y-sorted with characters) ----------------
  const cache = new Map();
  function px(ctx, col, x, y, w, h) { ctx.fillStyle = col; ctx.fillRect(x, y, w || 1, h || 1); }
  function obstacle(o, theme) {
    const key = o.kind + theme.name + (o.kind === 'tree' ? o.x : '');
    if (cache.has(key)) return cache.get(key);
    let c, ctx;
    const base = theme.wall, hi = theme.wallHi, dark = theme.wallDark, wood = theme.wood[0], woodD = theme.wood[1];
    switch (o.kind) {
      case 'pillar': {
        [c, ctx] = HC.makeCanvas(22, 44);
        const b = hex(base);
        px(ctx, dark, 1, 36, 20, 8);
        for (let x = 0; x < 18; x++) { const f = 0.65 + 0.45 * Math.sin((x / 17) * Math.PI); px(ctx, HC.rgb([b[0] * f, b[1] * f, b[2] * f]), 2 + x, 6, 1, 32); }
        px(ctx, hi, 0, 2, 22, 5); px(ctx, hi, 1, 36, 20, 3);
        px(ctx, dark, 0, 6, 22, 1); px(ctx, dark, 5, 12, 1, 22); px(ctx, dark, 10, 8, 1, 26); px(ctx, dark, 15, 12, 1, 22);
        px(ctx, '#0a0612', 0, 0, 22, 2); px(ctx, theme.moss, 3, 30, 4, 2); px(ctx, theme.moss, 14, 22, 3, 2);
        break;
      }
      case 'urn': {
        [c, ctx] = HC.makeCanvas(14, 18);
        const rows = ['....kkkkkk....', '...kgGGGGgk...', '....kccccK....', '...kcccccccK..', '..kccCccccccK.', '.kcCcccccccccK', '.kcCccccgccccK', '.kccccgGgccccK',
          '.kcccccgcccccK', '.kccccccccccK.', '..kcccccccccK.', '...kccccccK...', '....kcccccK...', '...kggggggk...', '...kkkkkkkk...'];
        const pal = { k: '#140c1c', K: '#1e1420', c: '#4a3a5a', C: '#7a6a8a', g: '#b08a3a', G: '#e0c070' };
        rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] !== '.') px(ctx, pal[r[x]], x, y + 3); });
        break;
      }
      case 'statue': {
        [c, ctx] = HC.makeCanvas(24, 40);
        px(ctx, '#3a3448', 1, 32, 22, 8); px(ctx, '#7a7488', 3, 31, 18, 6); px(ctx, '#a8a2b4', 3, 31, 18, 1);
        // a robed figure with its head broken off
        px(ctx, '#7a7488', 7, 10, 10, 21); px(ctx, '#a8a2b4', 7, 10, 3, 21); px(ctx, '#5a5468', 14, 12, 3, 19);
        px(ctx, '#7a7488', 5, 12, 3, 10); px(ctx, '#7a7488', 16, 12, 3, 10); px(ctx, '#3a3448', 9, 9, 6, 2);
        px(ctx, '#3a3448', 12, 14, 1, 8); px(ctx, '#3a3448', 10, 24, 1, 6);
        break;
      }
      case 'throne': {
        [c, ctx] = HC.makeCanvas(34, 44);
        px(ctx, '#2a1a12', 2, 30, 30, 14); px(ctx, '#5a1626', 4, 6, 26, 30); px(ctx, '#3e0e1a', 4, 6, 3, 30);
        px(ctx, '#b08a3a', 2, 4, 30, 3); px(ctx, '#b08a3a', 2, 4, 3, 36); px(ctx, '#b08a3a', 29, 4, 3, 36);
        [[4, 0], [10, 1], [16, 0], [22, 1], [28, 0]].forEach(([x, y]) => px(ctx, '#e0c070', x, y, 2, 4));
        px(ctx, '#3e0e1a', 7, 30, 20, 4); px(ctx, '#e0c070', 15, 12, 4, 4);
        break;
      }
      case 'table': {
        [c, ctx] = HC.makeCanvas(134, 30);
        px(ctx, woodD, 4, 18, 4, 12); px(ctx, woodD, 126, 18, 4, 12); px(ctx, woodD, 64, 18, 4, 12);
        px(ctx, wood, 0, 8, 134, 12); px(ctx, '#d8d0c0', 4, 9, 126, 6); px(ctx, '#a89e90', 4, 14, 126, 1); px(ctx, woodD, 0, 19, 134, 2);
        for (let x = 14; x < 126; x += 26) { px(ctx, '#c0b0a0', x, 10, 8, 3); px(ctx, '#7a1a2a', x + 2, 10, 4, 2); }
        for (const x of [30, 66, 102]) { px(ctx, '#b08a3a', x, 6, 3, 4); px(ctx, '#e8dcc0', x + 1, 1, 1, 5); }
        break;
      }
      case 'pew': {
        [c, ctx] = HC.makeCanvas(92, 20);
        px(ctx, woodD, 0, 4, 92, 12); px(ctx, wood, 1, 4, 90, 4); px(ctx, wood, 1, 10, 90, 3);
        px(ctx, woodD, 2, 14, 4, 6); px(ctx, woodD, 86, 14, 4, 6); px(ctx, woodD, 44, 14, 4, 6);
        break;
      }
      case 'shelf': {
        [c, ctx] = HC.makeCanvas(98, 40);
        px(ctx, '#22160f', 0, 0, 98, 40); px(ctx, '#3a2a20', 0, 0, 98, 2);
        const rr = HC.makeRng(7);
        for (let s = 0; s < 3; s++) {
          const sy = 3 + s * 12; let bx = 2;
          while (bx < 94) { const w = rr.int(2, 4), h = rr.int(6, 10); if (rr() < 0.8) px(ctx, rr.pick(['#5a2a2a', '#2a4a5a', '#4a4a2a', '#3a2a4a', '#6a5a3a']), bx, sy + 10 - h, w, h); bx += w + (rr() < 0.15 ? 3 : 0); }
          px(ctx, '#3a2a20', 0, sy + 10, 98, 2);
        }
        break;
      }
      case 'desk': {
        [c, ctx] = HC.makeCanvas(38, 22);
        px(ctx, woodD, 2, 12, 3, 10); px(ctx, woodD, 33, 12, 3, 10); px(ctx, wood, 0, 6, 38, 8); px(ctx, woodD, 0, 13, 38, 2);
        px(ctx, '#d8d0b0', 6, 7, 10, 5); px(ctx, '#a89e80', 11, 7, 1, 5); px(ctx, '#2a4a5a', 20, 6, 6, 6); px(ctx, '#e8dcc0', 30, 2, 1, 5); px(ctx, '#b08a3a', 29, 6, 3, 2);
        break;
      }
      case 'tree': {
        [c, ctx] = HC.makeCanvas(36, 56);
        const rr = HC.makeRng(o.x * 13 + o.y);
        px(ctx, '#1a120a', 15, 20, 6, 34); px(ctx, '#2e2418', 15, 20, 2, 34); px(ctx, '#1a120a', 11, 52, 14, 4);
        const branch = (x, y, dx, n) => { for (let i = 0; i < n; i++) { px(ctx, '#1a120a', Math.round(x), Math.round(y)); x += dx; y -= 0.7; if (rr() < 0.3) dx *= -0.4 + rr(); } };
        branch(18, 24, -1.2, 14); branch(18, 22, 1.2, 15); branch(17, 30, -1, 10); branch(19, 34, 1.1, 9); branch(18, 18, 0.2, 16);
        break;
      }
      case 'grave': {
        [c, ctx] = HC.makeCanvas(14, 18);
        px(ctx, '#2a2620', 1, 14, 12, 4); px(ctx, '#6a645a', 2, 3, 10, 12); px(ctx, '#6a645a', 3, 1, 8, 2);
        px(ctx, '#8a8478', 2, 3, 2, 12); px(ctx, '#3a3430', 6, 6, 2, 6); px(ctx, '#3a3430', 4, 8, 6, 2); px(ctx, '#3a4a26', 1, 14, 4, 2);
        break;
      }
      case 'coffin': {
        [c, ctx] = HC.makeCanvas(16, 30);
        const rows = ['...kkkkkkkk.....', '..kwwwwwwwwk....', '.kwWWWWWWWwwk...', 'kwWwwwwwwwWwwk..', 'kwWwwwgwwwWwwk..', 'kwWwwgggwwWwwk..', 'kwWwwwgwwwWwwk..', 'kwWwwwgwwwWwk...',
          '.kwWwwwwwWwwk...', '.kwWwwwwwWwwk...', '.kwWwwwwwWwwk...', '.kwWwwwwwWwk....', '..kwWwwwWwwk....', '..kwWwwwWwk.....', '..kwWwwwWwk.....', '...kwWwWwk......', '...kkkkkkk......'];
        const pal = { k: '#0a0806', w: '#3a2418', W: '#5a3a24', g: '#a89060' };
        rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] !== '.') px(ctx, pal[r[x]], x, y + 10); });
        break;
      }
      case 'candles': {
        [c, ctx] = HC.makeCanvas(12, 14);
        [[1, 6], [5, 9], [9, 5]].forEach(([x, h]) => { px(ctx, '#e8dcc0', x, 14 - h, 2, h); px(ctx, '#b0a488', x + 1, 14 - h, 1, h); });
        break;
      }
      case 'obelisk': {
        [c, ctx] = HC.makeCanvas(16, 48);
        px(ctx, '#0a0612', 1, 42, 14, 6);
        for (let y = 2; y < 44; y++) { const w = Math.round(4 + (y / 44) * 8); px(ctx, '#2a1e3e', 8 - w / 2, y, w, 1); px(ctx, '#4a3a68', 8 - w / 2, y, 1, 1); }
        px(ctx, '#8a6ab0', 7, 10, 2, 2); px(ctx, '#8a6ab0', 7, 20, 2, 2); px(ctx, '#8a6ab0', 7, 30, 2, 2);
        break;
      }
      default: return null;
    }
    cache.set(key, c);
    return c;
  }

  HC.roomArt = { bake, obstacle };
})(window.HC);
