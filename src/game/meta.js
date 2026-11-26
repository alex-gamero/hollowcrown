// Permanent progression (saved in localStorage) and per-run blessings.
(function (HC) {
  'use strict';

  const KEY = 'hollowcrown.save.v1';
  const DEFAULT = { shards: 0, best: 0, runs: 0, kingsSlain: 0, up: { heart: 0, light: 0, blade: 0, veil: 0 } };

  HC.UPGRADES = [
    { id: 'heart', name: 'Vessel of Dawn', desc: '+1 max heart', costs: [30, 70, 130] },
    { id: 'light', name: 'Kindled Soul', desc: '+20% light and radius', costs: [25, 60, 110] },
    { id: 'blade', name: 'Sunforged Edge', desc: '+1 blade damage', costs: [45, 110] },
    { id: 'veil', name: 'Silken Veil', desc: 'Dash recovers 20% faster', costs: [30, 80] },
  ];

  HC.BLESSINGS = [
    { id: 'heart', name: 'Radiant Heart', desc: '+1 max heart, heal 1', apply: (r) => { r.maxHp++; r.hp = Math.min(r.maxHp, r.hp + 1); } },
    { id: 'blade', name: 'Sunblade', desc: '+1 blade damage', apply: (r) => { r.damage++; } },
    { id: 'veil', name: 'Swift Veil', desc: 'Dash recovers 30% faster', apply: (r) => { r.dashCd *= 0.7; } },
    { id: 'flame', name: 'Everflame', desc: 'Light fades 40% slower', apply: (r) => { r.lightDrain *= 0.6; r.lightMax += 15; r.light += 15; } },
    { id: 'halo', name: 'Wide Halo', desc: 'Bigger slash', apply: (r) => { r.reach *= 1.3; } },
    { id: 'mend', name: 'Mending Light', desc: 'Heal to full', apply: (r) => { r.hp = r.maxHp; r.light = r.lightMax; } },
    { id: 'swift', name: 'Featherstep', desc: '+12% move speed', apply: (r) => { r.speed *= 1.12; } },
    { id: 'thorns', name: 'Thorned Crown', desc: 'Getting hit burns nearby foes', apply: (r) => { r.thorns = (r.thorns || 0) + 2; } },
  ];

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULT));
      const s = JSON.parse(raw);
      return Object.assign(JSON.parse(JSON.stringify(DEFAULT)), s, { up: Object.assign({}, DEFAULT.up, s.up || {}) });
    } catch (e) { return JSON.parse(JSON.stringify(DEFAULT)); }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(HC.save)); } catch (e) { /* storage may be blocked */ } }

  HC.save = load();
  HC.meta = {
    save,
    cost(up) { const lvl = HC.save.up[up.id]; return lvl < up.costs.length ? up.costs[lvl] : null; },
    buy(up) {
      const c = this.cost(up);
      if (c === null || HC.save.shards < c) return false;
      HC.save.shards -= c; HC.save.up[up.id]++; save(); return true;
    },
    // Fresh run stats, including permanent upgrades.
    newRun(seed) {
      const u = HC.save.up;
      const lightMax = 100 * (1 + 0.2 * u.light);
      return {
        seed, room: 0, hp: 3 + u.heart, maxHp: 3 + u.heart,
        light: lightMax, lightMax, lightDrain: 0.9, radiusMul: 1 + 0.12 * u.light,
        damage: 1 + u.blade, dashCd: 0.6 * Math.pow(0.8, u.veil), reach: 1, speed: 92,
        shards: 0, kills: 0, blessings: [], thorns: 0,
      };
    },
  };
})(window.HC);
