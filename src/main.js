// Boot: canvas scaling, fixed-step loop, scene start.
(function (HC) {
  'use strict';

  const canvas = document.getElementById('screen');
  canvas.width = HC.W; canvas.height = HC.H;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  function fit() {
    const s = Math.max(1, Math.floor(Math.min(window.innerWidth / HC.W, window.innerHeight / HC.H)));
    const fs = Math.min(window.innerWidth / HC.W, window.innerHeight / HC.H);
    const scale = fs >= 1 ? s : fs;
    canvas.style.width = HC.W * scale + 'px';
    canvas.style.height = HC.H * scale + 'px';
  }
  window.addEventListener('resize', fit);
  fit();

  HC.input.onAnyKey(() => HC.audio.init());

  // URL options: ?seed=123&room=9 starts a run directly (handy for testing).
  const params = new URLSearchParams(location.search);
  const debug = params.has('debug');
  if (params.has('room') || params.has('seed')) {
    const g = new HC.Game(Number(params.get('seed')) || 1);
    const room = Number(params.get('room')) || 1;
    if (room > 1 || params.has('secret') || params.has('greendoor')) { g.enterRoom(room, params.has('risky'), params.get('entry') || 'S', params.has('secret') ? 'secret' : params.has('greendoor') ? 'forceSecret' : null); if (room % 10 !== 1) g.banner = null; }
    HC.scenes.set(g);
  } else HC.scenes.set(new HC.scenes.Title());

  let last = performance.now(), acc = 0, fpsT = 0, frames = 0, fps = 0;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now; acc += dt;
    while (acc >= HC.DT) {
      HC.input.update();
      HC.scenes.current.update(HC.DT);
      acc -= HC.DT;
    }
    HC.scenes.current.draw(ctx);
    if (debug) {
      frames++; fpsT += dt;
      if (fpsT >= 0.5) { fps = Math.round(frames / fpsT); frames = 0; fpsT = 0; }
      HC.font.draw(ctx, fps + ' FPS', 4, HC.H - 9, '#5ad4e8');
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})(window.HC);
