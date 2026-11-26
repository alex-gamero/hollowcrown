// Procedural WebAudio sound: every effect is synthesized, no audio files needed.
(function (HC) {
  'use strict';

  let ctx = null, master = null, sfxBus = null, musicBus = null, drone = null;
  let muted = false;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.7; master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.8; sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.35; musicBus.connect(master);
  }

  function tone(freq, dur, opts) {
    if (!ctx || muted) return;
    opts = opts || {};
    const t = ctx.currentTime + (opts.delay || 0);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = opts.type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (opts.slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * opts.slide), t + dur);
    const v = opts.vol || 0.2;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + (opts.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = o;
    if (opts.filter) {
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = opts.filter; o.connect(f); node = f;
    }
    node.connect(g); g.connect(opts.bus || sfxBus);
    o.start(t); o.stop(t + dur + 0.05);
  }

  let noiseBuf = null;
  function noise(dur, opts) {
    if (!ctx || muted) return;
    opts = opts || {};
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = ctx.currentTime + (opts.delay || 0);
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = opts.type || 'bandpass';
    f.frequency.setValueAtTime(opts.freq || 1200, t);
    if (opts.sweep) f.frequency.exponentialRampToValueAtTime(opts.sweep, t + dur);
    f.Q.value = opts.q || 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(opts.vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(sfxBus);
    s.start(t); s.stop(t + dur + 0.05);
  }

  const SFX = {
    slash() { noise(0.14, { freq: 3000, sweep: 900, q: 0.8, vol: 0.25 }); tone(880, 0.12, { type: 'sine', slide: 1.6, vol: 0.06 }); },
    hit() { noise(0.08, { freq: 600, vol: 0.35, q: 2 }); tone(140, 0.1, { type: 'square', slide: 0.5, vol: 0.12 }); },
    kill() { tone(320, 0.25, { type: 'triangle', slide: 0.3, vol: 0.18 }); noise(0.3, { freq: 400, sweep: 80, vol: 0.25 }); },
    dash() { noise(0.18, { freq: 500, sweep: 2500, q: 1.5, vol: 0.18 }); },
    hurt() { tone(220, 0.25, { type: 'sawtooth', slide: 0.4, vol: 0.16, filter: 1400 }); noise(0.2, { freq: 300, vol: 0.3 }); },
    door() { tone(110, 0.5, { type: 'triangle', slide: 0.7, vol: 0.2 }); noise(0.5, { freq: 200, sweep: 80, vol: 0.2, type: 'lowpass' }); },
    unlock() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, { type: 'triangle', vol: 0.1, delay: i * 0.07 })); },
    rune() { tone(660, 0.3, { type: 'sine', vol: 0.12 }); tone(990, 0.3, { type: 'sine', vol: 0.06, delay: 0.05 }); },
    runeBad() { tone(180, 0.35, { type: 'square', slide: 0.6, vol: 0.1, filter: 900 }); },
    pickup() { tone(880, 0.12, { type: 'sine', vol: 0.1 }); tone(1320, 0.15, { type: 'sine', vol: 0.08, delay: 0.06 }); },
    shard() { tone(1500 + Math.random() * 400, 0.08, { type: 'sine', vol: 0.05 }); },
    blessing() { [392, 494, 587, 784, 988].forEach((f, i) => tone(f, 0.5, { type: 'sine', vol: 0.08, delay: i * 0.08 })); },
    shoot() { tone(300, 0.2, { type: 'sine', slide: 0.5, vol: 0.08 }); },
    boss() { tone(55, 1.6, { type: 'sawtooth', vol: 0.2, filter: 400 }); tone(58, 1.6, { type: 'sawtooth', vol: 0.15, filter: 400 }); },
    death() { [440, 370, 311, 262, 196].forEach((f, i) => tone(f, 0.5, { type: 'triangle', vol: 0.12, delay: i * 0.18 })); },
    select() { tone(660, 0.06, { type: 'square', vol: 0.05, filter: 2000 }); },
    confirm() { tone(523, 0.08, { type: 'square', vol: 0.06, filter: 2400 }); tone(784, 0.12, { type: 'square', vol: 0.06, delay: 0.07, filter: 2400 }); },
    whisper() { noise(1.2, { freq: 900, sweep: 300, q: 6, vol: 0.06 }); },
  };

  // Ambient drone: two detuned low oscillators through a slowly breathing filter.
  function startDrone(root) {
    if (!ctx || drone) return;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300; f.Q.value = 4;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 180;
    lfo.connect(lfoGain); lfoGain.connect(f.frequency);
    const g = ctx.createGain(); g.gain.value = 0.0001;
    const oscs = [root, root * 1.007, root * 1.5].map((fr, i) => {
      const o = ctx.createOscillator(); o.type = i === 2 ? 'sine' : 'sawtooth'; o.frequency.value = fr; o.connect(f); o.start(); return o;
    });
    f.connect(g); g.connect(musicBus);
    lfo.start();
    g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 3);
    drone = { oscs, lfo, g };
  }
  function stopDrone() {
    if (!drone) return;
    const d = drone; drone = null;
    d.g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.5);
    setTimeout(() => { d.oscs.forEach((o) => o.stop()); d.lfo.stop(); }, 1700);
  }
  function setDroneRoot(root) {
    if (!drone) return;
    drone.oscs.forEach((o, i) => o.frequency.exponentialRampToValueAtTime([root, root * 1.007, root * 1.5][i], ctx.currentTime + 2));
  }

  HC.audio = {
    init,
    play(name) { try { SFX[name] && SFX[name](); } catch (e) { /* audio is best-effort */ } },
    startDrone, stopDrone, setDroneRoot,
    toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.7; return muted; },
    get muted() { return muted; },
  };
})(window.HC);
