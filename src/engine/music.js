// Tiny chiptune sequencer: songs are written as text patterns and synthesized live.
(function (root) {
  'use strict';
  const HC = root.HC = root.HC || {};

  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function freq(tok) {
    const m = /^([A-G])([#b]?)(-?\d)$/.exec(tok);
    if (!m) return null;
    const midi = 12 * (parseInt(m[3], 10) + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    return 440 * Math.pow(2, (midi - 69) / 12);
  }
  // "D5 - F5 . A5+C6" -> [{f:[..], len}, ...] per step ("-" holds, "." rests)
  function parse(str) {
    const toks = str.trim().split(/\s+/), out = new Array(toks.length).fill(null);
    toks.forEach((t, i) => {
      if (t === '-' || t === '.') return;
      let len = 1; while (toks[i + len] === '-') len++;
      out[i] = { f: t.split('+').map(freq).filter(Boolean), len };
    });
    return out;
  }

  let ctx = null, master = null, delay = null, current = null, timer = null, muted = false;
  const waves = {};
  function ensure(existing) {
    if (ctx) return ctx;
    ctx = existing || new (root.AudioContext || root.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.55;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4;
    master.connect(comp); comp.connect(ctx.destination);
    delay = ctx.createDelay(1); delay.delayTime.value = 0.36;
    const fb = ctx.createGain(); fb.gain.value = 0.32;
    const dl = ctx.createGain(); dl.gain.value = 0.35;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
    delay.connect(lp); lp.connect(fb); fb.connect(delay); lp.connect(dl); dl.connect(master);
    // pulse waves with narrow duty cycles, the classic 8-bit lead sound
    [0.125, 0.25].forEach((d) => {
      const n = 32, re = new Float32Array(n), im = new Float32Array(n);
      for (let k = 1; k < n; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * d);
      waves[d] = ctx.createPeriodicWave(re, im);
    });
    return ctx;
  }

  let noiseBuf = null;
  function noise() {
    if (noiseBuf) return noiseBuf;
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }

  // ---------- instruments ----------
  function env(g, t, a, peak, hold, rel) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.setValueAtTime(peak, t + a + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + rel);
    return t + a + hold + rel;
  }
  const INST = {
    lead(f, t, dur, vol, send) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.setPeriodicWave(waves[0.25]); o.frequency.value = f;
      const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = 5.5; vg.gain.value = f * 0.006;
      vib.connect(vg); vg.connect(o.frequency);
      const end = env(g, t, 0.01, vol, Math.max(0, dur - 0.06), 0.08);
      o.connect(g); g.connect(master); if (send) g.connect(delay);
      o.start(t); vib.start(t + 0.12); o.stop(end + 0.02); vib.stop(end + 0.02);
    },
    arp(f, t, dur, vol, send) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.setPeriodicWave(waves[0.125]); o.frequency.value = f;
      const end = env(g, t, 0.005, vol, 0.02, Math.min(0.25, dur));
      o.connect(g); g.connect(master); if (send) g.connect(delay);
      o.start(t); o.stop(end + 0.02);
    },
    bass(f, t, dur, vol) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = f;
      const end = env(g, t, 0.005, vol, Math.max(0, dur - 0.05), 0.06);
      o.connect(g); g.connect(master); o.start(t); o.stop(end + 0.02);
    },
    bell(f, t, dur, vol, send) {
      [[1, 1], [2.76, 0.35], [5.4, 0.12]].forEach(([m, a]) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = f * m;
        const end = env(g, t, 0.003, vol * a, 0, 1.2 / m + dur * 0.4);
        o.connect(g); g.connect(master); if (send) g.connect(delay);
        o.start(t); o.stop(end + 0.02);
      });
    },
    pad(f, t, dur, vol) {
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
      const g = ctx.createGain();
      const end = env(g, t, Math.min(0.6, dur * 0.4), vol, dur * 0.5, 0.8);
      [-6, 6].forEach((c) => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = c; o.connect(lp); o.start(t); o.stop(end + 0.02); });
      lp.connect(g); g.connect(master); g.connect(delay);
    },
  };
  const DRUM = {
    k(t, v) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12); env(g, t, 0.002, v, 0.02, 0.14); o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.2); },
    s(t, v) {
      const s = ctx.createBufferSource(); s.buffer = noise(); const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.8;
      const g = ctx.createGain(); env(g, t, 0.002, v * 0.8, 0.01, 0.12); s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + 0.2);
    },
    h(t, v) {
      const s = ctx.createBufferSource(); s.buffer = noise(); const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
      const g = ctx.createGain(); env(g, t, 0.001, v * 0.35, 0, 0.04); s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + 0.08);
    },
  };

  // ---------- songs (all original) ----------
  const SONGS = {
    // Option A: a driving 8-bit adventure loop
    halls: {
      name: 'Halls of Dusk', bpm: 132, spb: 2,
      tracks: [
        { inst: 'lead', vol: 0.09, send: true, notes:
          'D5 - F5 - A5 - G5 F5  F5 - D5 - Bb4 - C5 D5  E5 - C5 - G4 - A4 Bb4  C#5 - A4 - E5 - - -  ' +
          'D5 - F5 - A5 - D6 C6  Bb5 - A5 - G5 - F5 G5  A5 - G5 F5 E5 - C#5 -  D5 - - - . . . .' },
        { inst: 'bass', vol: 0.2, notes:
          'D2 D3 D2 D3 D2 D3 D2 D3  Bb1 Bb2 Bb1 Bb2 Bb1 Bb2 Bb1 Bb2  C2 C3 C2 C3 C2 C3 C2 C3  A1 A2 A1 A2 A1 A2 A1 A2  ' +
          'D2 D3 D2 D3 D2 D3 D2 D3  Bb1 Bb2 Bb1 Bb2 Bb1 Bb2 Bb1 Bb2  A1 A2 A1 A2 A1 A2 A1 A2  D2 D3 D2 D3 D2 D3 D2 D3' },
        { inst: 'arp', vol: 0.035, send: true, notes:
          'D4 F4 A4 F4 D4 F4 A4 F4  Bb3 D4 F4 D4 Bb3 D4 F4 D4  C4 E4 G4 E4 C4 E4 G4 E4  A3 C#4 E4 C#4 A3 C#4 E4 C#4  ' +
          'D4 F4 A4 F4 D4 F4 A4 F4  Bb3 D4 F4 D4 Bb3 D4 F4 D4  A3 C#4 E4 C#4 A3 C#4 E4 C#4  D4 F4 A4 F4 D4 . . .' },
      ],
      drums: { k: 'x...x...', s: '..x...x.', h: 'xxxxxxxx', vol: 0.5 },
    },
    // Option B: a music-box waltz, sad and royal
    waltz: {
      name: 'The Hollow Waltz', bpm: 92, spb: 2,
      tracks: [
        { inst: 'bell', vol: 0.13, send: true, notes:
          'E5 - A4 C5 E5 D5  C5 - B4 A4 B4 C5  A4 - F4 A4 C5 B4  B4 - G#4 B4 E5 -  ' +
          'E5 - A4 C5 E5 G5  F5 - E5 D5 C5 D5  E5 - D5 C5 B4 G#4  A4 - - - - -' },
        { inst: 'pad', vol: 0.03, notes:
          'A3+C4+E4 - - - - -  A3+C4+E4 - - - - -  F3+A3+C4 - - - - -  E3+G#3+B3 - - - - -  ' +
          'A3+C4+E4 - - - - -  F3+A3+D4 - - - - -  E3+G#3+B3 - - - - -  A3+C4+E4 - - - - -' },
        { inst: 'bass', vol: 0.16, notes:
          'A2 - - . E3 .  A2 - - . E3 .  F2 - - . C3 .  E2 - - . B2 .  A2 - - . E3 .  D2 - - . A2 .  E2 - - . B2 .  A2 - - - - -' },
      ],
      drums: null,
    },
    // Option C: slow, eerie candlelight arpeggios
    candles: {
      name: 'Candles in the Deep', bpm: 76, spb: 2,
      tracks: [
        { inst: 'arp', vol: 0.05, send: true, notes:
          'E3 B3 E4 G4 B4 G4 E4 B3  C3 G3 C4 E4 G4 E4 C4 G3  A2 E3 A3 C4 E4 C4 A3 E3  B2 F#3 B3 D#4 F#4 D#4 B3 F#3  ' +
          'E3 B3 E4 G4 B4 G4 E4 B3  C3 G3 C4 E4 G4 E4 C4 G3  A2 E3 A3 C4 E4 C4 A3 E3  B2 F#3 B3 D#4 F#4 D#4 B3 F#3' },
        { inst: 'bell', vol: 0.09, send: true, notes:
          'B5 - - - G5 - - -  E5 - - - - - G5 -  A5 - - - C6 - B5 -  F#5 - - - - - - -  ' +
          'B5 - - - D6 - - -  C6 - B5 - G5 - - -  A5 - G5 - F#5 - E5 -  D#5 - - - - - - -' },
        { inst: 'bass', vol: 0.13, notes:
          'E2 - - - - - - -  C2 - - - - - - -  A1 - - - - - - -  B1 - - - - - - -  E2 - - - - - - -  C2 - - - - - - -  A1 - - - - - - -  B1 - - - - - - -' },
      ],
      drums: { k: 'x..x....', s: '........', h: '........', vol: 0.35 },
    },
  };
  Object.values(SONGS).forEach((s) => { s.parsed = s.tracks.map((t) => Object.assign({}, t, { steps: parse(t.notes) })); s.len = Math.max(...s.parsed.map((t) => t.steps.length)); });

  function play(id, audioCtx) {
    ensure(audioCtx);
    if (ctx.state === 'suspended') ctx.resume();
    stop();
    const song = SONGS[id]; if (!song) return;
    const stepDur = 60 / song.bpm / song.spb;
    let step = 0, next = ctx.currentTime + 0.08;
    current = id;
    const gain = muted ? 0 : 1;
    timer = setInterval(() => {
      while (next < ctx.currentTime + 0.15) {
        const s = step % song.len;
        for (const t of song.parsed) { const n = t.steps[s]; if (n && gain) n.f.forEach((f) => INST[t.inst](f, next, n.len * stepDur, t.vol, t.send)); }
        if (song.drums && gain) { const d = song.drums, i = s % d.k.length; ['k', 's', 'h'].forEach((k) => { if (d[k][i] === 'x') DRUM[k](next, d.vol); }); }
        step++; next += stepDur;
      }
    }, 25);
  }
  function stop() { if (timer) clearInterval(timer); timer = null; current = null; }

  HC.music = { play, stop, songs: SONGS, get output() { return master; }, get current() { return current; }, setMuted(m) { muted = m; if (m) stop(); } };
})(typeof window !== 'undefined' ? window : this);
