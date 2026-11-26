// Procedural room backgrounds: floor, walls, doors and decoration are painted
// once per room into a canvas, then reused every frame.
(function (HC) {
  'use strict';
  const hex = HC.hex;

  HC.THEMES = [
    {
      name: 'The Gilded Halls', drone: 55,
      floorA: '#2a2a3e', floorB: '#24243a', grout: '#15121f', hi: '#3a3a52',
      wall: '#3a2f4c', wallDark: '#231b30', wallHi: '#54466a', mortar: '#18121f',
      carpet: ['#5a1626', '#3e0e1a'], trim: ['#b08a3a', '#6e5424'], moss: '#2c3d33',
      night: '#07040e', ambient: 0.2, banner: '#6a1a2c',
    },
    {
      name: 'The Drowned Library', drone: 49,
      floorA: '#1d2b36', floorB: '#192530', grout: '#0c141c', hi: '#2c4050',
      wall: '#22384a', wallDark: '#132230', wallHi: '#36546a', mortar: '#0a1520',
      carpet: ['#16403f', '#0f2f30'], trim: ['#7ab0a8', '#3e6460'], moss: '#2a5a70',
      night: '#02070e', ambient: 0.18, banner: '#1d4a5a',
    },
    {
      name: 'The Bone Garden', drone: 41,
      floorA: '#2a2922', floorB: '#24231c', grout: '#11100c', hi: '#3a392c',
      wall: '#34302a', wallDark: '#201c18', wallHi: '#4e4838', mortar: '#100e0b',
      carpet: ['#3a2a1c', '#2a1e14'], trim: ['#a89a78', '#5e5440'], moss: '#3a4a26',
      night: '#060504', ambient: 0.16, banner: '#4a3a20',
    },
  ];

  // Room geometry shared with gameplay code.
  const G = HC.ROOM = {
    top: HC.HUD_H, cap: 10, wallH: 52, side: 18, bottom: 12,
  };
  G.floorTop = G.top + G.cap + G.wallH;      // y where the walkable floor starts
  G.floorBottom = HC.H - G.bottom;
  G.floorLeft = G.side;
  G.floorRight = HC.W - G.side;
  G.doorW = 44;

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

    // --- floor: 24px stone slabs ---
    const TS = 24;
    const fa = hex(T.floorA), fb = hex(T.floorB), grout = hex(T.grout), hi = hex(T.hi), moss = hex(T.moss);
    const fy0 = G.floorTop - 6;
    for (let ty = 0; fy0 + ty * TS < HC.H; ty++) for (let tx = 0; tx * TS < HC.W; tx++) {
      const base = (tx + ty) & 1 ? fa : fb;
      const v = 0.9 + rng() * 0.16;
      const ox = tx * TS, oy = fy0 + ty * TS;
      for (let j = 0; j < TS; j++) for (let i = 0; i < TS; i++) {
        let col = shade(base, v + (rng() < 0.025 ? -0.06 : 0));
        if (i === 0 || j === 0) col = shade(hi, 0.85 * v);
        if (i === TS - 1 || j === TS - 1) col = grout;
        put(ox + i, oy + j, col);
      }
      if (rng() < 0.3) {
        let cx = ox + 3 + rng.int(0, TS - 6), cy = oy + 3 + rng.int(0, TS - 6);
        const len = rng.int(6, 14);
        for (let n = 0; n < len; n++) { put(cx, cy, grout); cx += rng() < 0.55 ? 1 : 0; cy += rng() < 0.6 ? 1 : 0; if (rng() < 0.25) cx--; }
      }
      if (rng() < 0.12) {
        const mx = ox + rng.int(0, TS), my = oy + rng.int(0, TS);
        for (let n = 0; n < 14; n++) put(mx + rng.int(-4, 4), my + rng.int(-2, 3), shade(moss, 0.8 + rng() * 0.4));
      }
    }

    // --- carpet runner from each door down (gilded halls / library) ---
    if (T !== HC.THEMES[2]) {
      const red = hex(T.carpet[0]), redD = hex(T.carpet[1]), gold = hex(T.trim[0]), goldD = hex(T.trim[1]);
      const cw = room.doors.length > 1 ? 32 : 40;
      room.doors.forEach((door) => {
      const cx0 = Math.round(door.x - cw / 2);
      for (let y = G.floorTop; y < HC.H; y++) {
        const rot = y > HC.H * 0.62 ? (y - HC.H * 0.62) / (HC.H * 0.38) : 0;
        for (let i = 0; i < cw; i++) {
          if (rot > 0 && rng() < rot * 0.4 && (i < 4 || i > cw - 5 || rng() < rot * 0.25)) continue;
          let col = ((y >> 1) + (i >> 1)) & 1 ? red : redD;
          if (i === 2 || i === cw - 3) col = gold;
          if (i === 3 || i === cw - 4) col = goldD;
          if (i === 0 || i === cw - 1) col = shade(redD, 0.6);
          const my = ((y - G.floorTop) % 40) - 20, mx = i - cw / 2;
          if (Math.abs(Math.abs(my) + Math.abs(mx) - 9) < 0.6) col = goldD;
          put(cx0 + i, y, col);
        }
      }
      });
    } else {
      // bone garden: dead grass tufts and scattered bone fragments
      for (let n = 0; n < 90; n++) {
        const x = rng.int(G.floorLeft, G.floorRight), y = rng.int(G.floorTop, G.floorBottom);
        const g = hex(rng.pick(['#4a5a2e', '#3a4a26', '#5a6034']));
        for (let k = 0; k < 3; k++) put(x + k - 1, y - (k === 1 ? 2 : 1), g);
      }
    }

    // stains
    for (let s = 0; s < rng.int(0, 2); s++) {
      const sx = rng.int(60, 420), sy = rng.int(G.floorTop + 20, G.floorBottom - 20);
      for (let j = -4; j <= 4; j++) for (let i = -9; i <= 9; i++) {
        if ((i * i) / 81 + (j * j) / 16 < 1 - rng() * 0.35) blend(sx + i, sy + j, hex('#3a1420'), 0.7);
      }
    }

    // --- north wall ---
    const wb = hex(T.wall), wd = hex(T.wallDark), wh = hex(T.wallHi), mortar = hex(T.mortar);
    for (let y = G.top; y < G.top + G.cap; y++) for (let x = 0; x < HC.W; x++) {
      put(x, y, y === G.top + G.cap - 1 ? wh : shade(wd, 0.85 + 0.15 * ((x >> 2) & 1)));
    }
    const bh = 6, bw = 12;
    for (let y = G.top + G.cap; y < G.floorTop; y++) {
      const row = Math.floor((y - G.top - G.cap) / bh), off = row & 1 ? bw / 2 : 0, ry = (y - G.top - G.cap) % bh;
      for (let x = 0; x < HC.W; x++) {
        const bx = Math.floor((x + off) / bw), rx = (x + off) % bw;
        const r2 = HC.makeRng(bx * 131 + row * 977 + room.seed)();
        let col = shade(wb, 0.75 + r2 * 0.3);
        if (ry === 0) col = shade(wh, 0.8 + r2 * 0.2);
        if (ry === bh - 1 || rx === bw - 1) col = mortar;
        col = shade(col, 1 - ((y - G.top - G.cap) / G.wallH) * 0.35);
        put(x, y, col);
      }
    }
    for (let x = 0; x < HC.W; x++) for (let j = 0; j < 4; j++) blend(x, G.floorTop + j, [4, 2, 8], 0.65 - j * 0.15);

    // wall decoration: banners / bookshelves / roots
    const decoXs = [70, 140, 340, 410].filter((x) => !room.doors.some((d) => Math.abs(d.x - x) < 44));
    decoXs.forEach((dx) => {
      if (T === HC.THEMES[0] && rng() < 0.75) {
        const b = hex(T.banner), bd = shade(b, 0.6), gold = hex(T.trim[0]);
        const y0 = G.top + G.cap + 4, h = 34;
        for (let j = 0; j < h; j++) for (let i = 0; i < 16; i++) {
          if (j > h - 6 && Math.abs(i - 7.5) < (j - (h - 6)) * 1.4) continue;
          let col = i < 2 || i > 13 ? bd : b;
          if (j === 2) col = gold;
          put(dx - 8 + i, y0 + j, col);
        }
        // crown sigil
        [[5, 12], [7, 10], [8, 12], [10, 10], [11, 12]].forEach(([i, j]) => put(dx - 8 + i, y0 + j, gold));
        for (let i = 5; i <= 11; i++) put(dx - 8 + i, y0 + 13, gold);
        rect(dx - 10, y0 - 1, 20, 2, hex('#5a4a40'));
      } else if (T === HC.THEMES[1]) {
        const wood = hex('#3a2a20'), woodD = hex('#22160f');
        rect(dx - 16, G.top + G.cap + 4, 32, 46, woodD);
        for (let s = 0; s < 3; s++) {
          const sy = G.top + G.cap + 6 + s * 15;
          rect(dx - 14, sy + 12, 28, 2, wood);
          let bx = dx - 14;
          while (bx < dx + 12) {
            const w = rng.int(2, 4), h = rng.int(8, 12);
            if (rng() < 0.85) rect(bx, sy + 12 - h, w, h, hex(rng.pick(['#5a2a2a', '#2a4a5a', '#4a4a2a', '#3a2a4a', '#6a5a3a'])));
            bx += w + (rng() < 0.2 ? 2 : 0);
          }
        }
      } else if (T === HC.THEMES[2]) {
        const root = hex('#2e2418');
        let x = dx, y = G.top + G.cap;
        for (let n = 0; n < 50; n++) { put(x, y, root); put(x + 1, y, root); y++; x += rng.int(-1, 1); }
      }
      if (rng() < 0.5) {
        const len = rng.int(14, 28), cx = dx + rng.int(-20, 20);
        for (let j = 0; j < len; j++) put(cx, G.top + G.cap + j, j % 3 === 0 ? hex('#151018') : hex('#6c6478'));
        rect(cx - 1, G.top + G.cap + len, 3, 2, hex('#4a4250'));
      }
    });

    // side + bottom walls
    for (let y = G.top; y < HC.H; y++) for (let x = 0; x < G.side; x++) {
      const col = x === G.side - 1 ? wh : shade(wd, 0.7 + 0.1 * (((y >> 2) + x) & 1));
      put(x, y, col); put(HC.W - 1 - x, y, col);
    }
    for (let y = G.floorBottom; y < HC.H; y++) for (let x = 0; x < HC.W; x++) put(x, y, y === G.floorBottom ? wh : wd);
    // entry archway (where the princess walks in)
    for (let y = G.floorBottom; y < HC.H; y++) for (let x = HC.W / 2 - 16; x < HC.W / 2 + 16; x++) put(x, y, hex('#050308'));

    // cobwebs
    const web = hex('#9a92a8');
    for (let i = 0; i < 12; i++) {
      blend(G.side + i, G.floorTop, web, 0.35); blend(G.side, G.floorTop + i, web, 0.35); blend(G.side + i, G.floorTop + 11 - i, web, 0.5);
      blend(HC.W - G.side - 1 - i, G.floorTop, web, 0.35); blend(HC.W - G.side - 1, G.floorTop + i, web, 0.35); blend(HC.W - G.side - 1 - i, G.floorTop + 11 - i, web, 0.5);
    }

    // bones in a corner
    if (rng() < 0.7) {
      const bx = rng.pick([G.side + 10, HC.W - G.side - 34]), by = G.floorBottom - 18;
      const bone = hex('#d6ccb6'), boneD = hex('#8c8270');
      for (let i = 0; i < 12; i++) { put(bx + i, by + Math.round(i * 0.35), bone); put(bx + i, by + Math.round(i * 0.35) + 1, boneD); }
      rect(bx + 13, by + 1, 6, 5, bone); rect(bx + 13, by + 5, 6, 1, boneD);
      put(bx + 14, by + 2, hex('#140c1c')); put(bx + 17, by + 2, hex('#140c1c'));
    }

    // --- doors (frames + dark interiors; locks are drawn live) ---
    room.plaques = [];
    room.doors.forEach((d) => {
      const dW = G.doorW, dX = Math.round(d.x - dW / 2), dTop = G.top + G.cap + 8, dBot = G.floorTop;
      const frame = hex('#6a5a7e'), frameD = hex('#3e3350');
      for (let y = dTop - 3; y < dBot; y++) for (let x = dX - 3; x < dX + dW + 3; x++) {
        const cx = x - (dX + dW / 2), cy = y - (dTop + dW / 2);
        const upper = y < dTop + dW / 2;
        const outer = upper ? cx * cx + cy * cy <= (dW / 2 + 3) ** 2 : Math.abs(cx) <= dW / 2 + 3;
        const inner = upper ? cx * cx + cy * cy <= (dW / 2) ** 2 : Math.abs(cx) < dW / 2;
        if (inner) put(x, y, [5 + (y - dTop) * 0.25, 3 + (y - dTop) * 0.12, 8 + (y - dTop) * 0.35]);
        else if (outer) put(x, y, (x + y) & 3 ? frame : frameD);
      }
      // number plaque
      const plW = 22, plX = Math.round(d.x - plW / 2), plY = dTop - 13;
      rect(plX - 1, plY - 1, plW + 2, 11, hex('#1a1424'));
      rect(plX, plY, plW, 9, d.risky ? hex('#6a1a24') : hex('#8a7340'));
      const label = String(room.number + 1).padStart(3, '0');
      room.plaques.push({ x: d.x, y: plY + 1, label, risky: d.risky });
    });

    ctx.putImageData(img, 0, 0);
    (room.plaques || []).forEach((p) => HC.font.draw(ctx, p.label, p.x, p.y, p.risky ? '#ffb0b0' : '#2a1c10', { align: 'center' }));
    return c;
  }

  // Obstacle sprites (y-sorted with characters).
  const obstacleCache = new Map();
  function obstacle(kind, theme) {
    const key = kind + theme.name;
    if (obstacleCache.has(key)) return obstacleCache.get(key);
    let c, ctx;
    if (kind === 'pillar') {
      [c, ctx] = HC.makeCanvas(22, 44);
      const base = hex(theme.wall), hi = hex(theme.wallHi), dark = hex(theme.wallDark);
      ctx.fillStyle = HC.rgb(dark); ctx.fillRect(1, 36, 20, 8);
      for (let x = 0; x < 18; x++) {
        const f = 0.65 + 0.45 * Math.sin((x / 17) * Math.PI);
        ctx.fillStyle = HC.rgb([base[0] * f, base[1] * f, base[2] * f]); ctx.fillRect(2 + x, 6, 1, 32);
      }
      ctx.fillStyle = HC.rgb(hi); ctx.fillRect(0, 2, 22, 5); ctx.fillRect(1, 36, 20, 3);
      ctx.fillStyle = HC.rgb(dark); ctx.fillRect(0, 6, 22, 1); ctx.fillRect(5, 12, 1, 22); ctx.fillRect(10, 8, 1, 26); ctx.fillRect(15, 12, 1, 22);
      ctx.fillStyle = '#0a0612'; ctx.fillRect(0, 0, 22, 2);
      ctx.fillStyle = HC.rgb(theme === HC.THEMES[2] ? hex('#3a4a26') : hex('#2a3d33'));
      ctx.fillRect(3, 30, 4, 2); ctx.fillRect(14, 22, 3, 2);
    } else if (kind === 'urn') {
      [c, ctx] = HC.makeCanvas(14, 18);
      const rows = ['....kkkkkk....', '...kgGGGGgk...', '....kccccK....', '...kcccccccK..', '..kccCccccccK.', '.kcCcccccccccK', '.kcCccccgccccK', '.kccccgGgccccK',
        '.kcccccgcccccK', '.kccccccccccK.', '..kcccccccccK.', '...kccccccK...', '....kcccccK...', '...kggggggk...', '...kkkkkkkk...'];
      const pal = { k: '#140c1c', K: '#1e1420', c: '#4a3a5a', C: '#7a6a8a', g: '#b08a3a', G: '#e0c070' };
      rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] !== '.') { ctx.fillStyle = pal[r[x]]; ctx.fillRect(x, y + 3, 1, 1); } });
    } else {
      // broken statue stump
      [c, ctx] = HC.makeCanvas(24, 26);
      const base = hex('#7a7488'), hi = hex('#a8a2b4'), dark = hex('#3a3448');
      ctx.fillStyle = HC.rgb(dark); ctx.fillRect(1, 18, 22, 8);
      ctx.fillStyle = HC.rgb(base); ctx.fillRect(3, 17, 18, 6); ctx.fillRect(6, 4, 12, 14);
      ctx.fillStyle = HC.rgb(hi); ctx.fillRect(6, 4, 3, 14); ctx.fillRect(3, 17, 18, 1);
      ctx.fillStyle = HC.rgb(dark); ctx.fillRect(12, 4, 1, 6); ctx.fillRect(13, 9, 1, 4); ctx.fillRect(6, 3, 4, 1); ctx.fillRect(14, 2, 4, 2);
    }
    obstacleCache.set(key, c);
    return c;
  }

  HC.roomArt = { bake, obstacle };
})(window.HC);
