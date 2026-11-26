// Dithered, banded lighting. The world is drawn unlit, then this pass darkens it
// per pixel with an ordered-dither quantization so light falls off in crunchy
// pixel-art steps instead of smooth gradients.
(function (HC) {
  'use strict';

  const W = HC.W, H = HC.H;
  const LW = W >> 1, LH = H >> 1;           // light map is half resolution
  const Lm = new Float32Array(LW * LH);
  const Tr = new Float32Array(LW * LH), Tg = new Float32Array(LW * LH), Tb = new Float32Array(LW * LH);
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
  const LEVELS = [0.0, 0.16, 0.32, 0.52, 0.76, 1.0];

  // Precomputed vignette.
  const VIG = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const vx = (x / W - 0.5) * 2, vy = (y / H - 0.5) * 2;
    VIG[y * W + x] = Math.max(0.35, 1 - Math.max(0, Math.sqrt(vx * vx * 0.55 + vy * vy * 0.75) - 0.6) * 1.1);
  }

  // Analytic light level at a point (used by AI: monsters that fear the light).
  function levelAt(x, y, lights, ambient) {
    let L = ambient;
    for (const l of lights) {
      const dx = x - l.x, dy = (y - l.y) * 1.15;
      const d = Math.sqrt(dx * dx + dy * dy) / l.r;
      if (d < 1) L += Math.pow(1 - d, 1.4) * l.i;
    }
    return L;
  }

  function apply(ctx, lights, opts) {
    const ambient = opts.ambient, night = opts.night, top = opts.top || 0;
    Lm.fill(ambient); Tr.fill(0); Tg.fill(0); Tb.fill(0);
    for (const l of lights) {
      const r = l.r;
      const x0 = Math.max(0, ((l.x - r) >> 1)), x1 = Math.min(LW - 1, ((l.x + r) >> 1) + 1);
      const y0 = Math.max(0, ((l.y - r) >> 1)), y1 = Math.min(LH - 1, ((l.y + r) >> 1) + 1);
      const c = l.c || [1, 1, 1];
      for (let ly = y0; ly <= y1; ly++) {
        const dy = (ly * 2 + 1 - l.y) * 1.15;
        for (let lx = x0; lx <= x1; lx++) {
          const dx = lx * 2 + 1 - l.x;
          const d = Math.sqrt(dx * dx + dy * dy) / r;
          if (d >= 1) continue;
          const f = Math.pow(1 - d, 1.4) * l.i;
          const k = ly * LW + lx;
          Lm[k] += f; Tr[k] += c[0] * f; Tg[k] += c[1] * f; Tb[k] += c[2] * f;
        }
      }
    }

    const img = ctx.getImageData(0, top, W, H - top);
    const d = img.data;
    const nr = night[0], ng = night[1], nb = night[2];
    for (let y = top; y < H; y++) {
      const by = (y & 3) * 4;
      const lrow = (y >> 1) * LW;
      for (let x = 0; x < W; x++) {
        const k = lrow + (x >> 1);
        let L = Lm[k];
        if (L > 1.3) L = 1.3;
        // ordered dither between the two nearest bands
        const th = BAYER[by + (x & 3)];
        let q;
        if (L >= 1) q = 1 + (L - 1) * 0.5;
        else {
          let i = 0;
          while (i < LEVELS.length - 2 && L >= LEVELS[i + 1]) i++;
          const a = LEVELS[i], b = LEVELS[i + 1];
          q = (L - a) / (b - a) > th ? b : a;
        }
        const w = Lm[k] - ambient;
        let tr = 0.8, tg = 0.8, tb = 1;
        if (w > 0.001) { const iw = 1 / (Tr[k] + Tg[k] + Tb[k] > 0 ? w : 1); tr = Tr[k] * iw; tg = Tg[k] * iw; tb = Tb[k] * iw; }
        const p = ((y - top) * W + x) * 4;
        const v = VIG[y * W + x];
        const m = Math.min(1, q * 1.15 + 0.08);
        const kr = q * (0.6 + 0.4 * tr), kg = q * (0.6 + 0.4 * tg), kb = q * (0.6 + 0.4 * tb);
        d[p] = (nr + (d[p] * kr - nr) * m) * v;
        d[p + 1] = (ng + (d[p + 1] * kg - ng) * m) * v;
        d[p + 2] = (nb + (d[p + 2] * kb - nb) * m) * v;
      }
    }
    ctx.putImageData(img, 0, top);
  }

  HC.light = { apply, levelAt };
})(window.HC);
