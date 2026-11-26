// Turns text pixel maps + palettes into canvases.
// Each sprite gets: base (lit by the world), glow (drawn after lighting, always
// bright: eyes, flames), flash (solid white, for hit feedback) and mirrored copies.
(function (HC) {
  'use strict';

  const cache = new Map();

  // Symmetric sprites are authored as their left half.
  function mirror(left) { return left.map((r) => r + r.split('').reverse().join('')); }

  // Pads every frame to the same size, anchored bottom-center, so frames line up.
  function normalize(frames) {
    const w = Math.max(...frames.flat().map((r) => r.length));
    const h = Math.max(...frames.map((f) => f.length));
    return frames.map((f) => {
      const rows = f.map((r) => {
        const pad = w - r.length, l = Math.floor(pad / 2);
        return '.'.repeat(l) + r + '.'.repeat(pad - l);
      });
      while (rows.length < h) rows.unshift('.'.repeat(w));
      return rows;
    });
  }

  function paint(rows, pal, keep) {
    const w = rows[0].length, h = rows.length;
    const [c, ctx] = HC.makeCanvas(w, h);
    const img = ctx.createImageData(w, h);
    let any = false;
    rows.forEach((r, y) => {
      for (let x = 0; x < w; x++) {
        const ch = r[x];
        if (ch === '.' || ch === ' ' || !pal[ch] || !keep(ch)) continue;
        const col = typeof pal[ch] === 'string' ? HC.hex(pal[ch]) : pal[ch];
        const p = (y * w + x) * 4;
        img.data[p] = col[0]; img.data[p + 1] = col[1]; img.data[p + 2] = col[2]; img.data[p + 3] = 255;
        any = true;
      }
    });
    ctx.putImageData(img, 0, 0);
    return any ? c : null;
  }

  function flipCanvas(src) {
    if (!src) return null;
    const [c, ctx] = HC.makeCanvas(src.width, src.height);
    ctx.translate(src.width, 0); ctx.scale(-1, 1); ctx.drawImage(src, 0, 0);
    return c;
  }

  function compile(name, rows, pal, opts) {
    opts = opts || {};
    const glowKeys = new Set(opts.glow || []);
    const white = {}; for (const k in pal) white[k] = '#ffffff';
    const s = {
      w: rows[0].length, h: rows.length,
      base: paint(rows, pal, (ch) => !glowKeys.has(ch)),
      glow: glowKeys.size ? paint(rows, pal, (ch) => glowKeys.has(ch)) : null,
      flash: paint(rows, white, () => true),
    };
    s.fbase = flipCanvas(s.base); s.fglow = flipCanvas(s.glow); s.fflash = flipCanvas(s.flash);
    cache.set(name, s);
    return s;
  }

  // Draws a sprite with its feet at (x, y). layer: 'base' | 'glow' | 'flash'.
  function draw(ctx, s, x, y, layer, flip, alpha) {
    const key = (flip ? 'f' : '') + (layer || 'base');
    const c = s[key];
    if (!c) return;
    if (alpha !== undefined && alpha < 1) { ctx.globalAlpha = Math.max(0, alpha); }
    ctx.drawImage(c, Math.round(x - s.w / 2), Math.round(y - s.h));
    ctx.globalAlpha = 1;
  }

  HC.sprites = { mirror, normalize, compile, draw, get: (n) => cache.get(n) };
})(window.HC);
