// Permanent progression (saved in localStorage), death gifts and per-run blessings.
(function (HC) {
  'use strict';

  const KEY = 'hollowcrown.save.v1';
  const DEFAULT = {
    shards: 0, best: 0, runs: 0, kingsSlain: 0, victories: 0, greenKeys: 0, streak: 0, pendingGift: null,
    up: { heart: 0, light: 0, blade: 0, veil: 0 },
  };

  HC.UPGRADES = [
    { id: 'heart', name: 'Vessel of Dawn', desc: '+1 max heart', costs: [30, 70, 130] },
    { id: 'light', name: 'Kindled Soul', desc: '+15% light radius', costs: [25, 60, 110] },
    { id: 'blade', name: 'Sunforged Edge', desc: '+1 blade damage', costs: [45, 110] },
    { id: 'veil', name: 'Silken Veil', desc: 'Dash recovers 20% faster', costs: [30, 80] },
  ];

  HC.BLESSINGS = [
    { id: 'heart', name: 'Radiant Heart', desc: '+1 max heart, heal 1', apply: (r) => { r.maxHp++; r.hp = Math.min(r.maxHp, r.hp + 1); } },
    { id: 'blade', name: 'Sunblade', desc: '+1 blade damage', apply: (r) => { r.damage++; } },
    { id: 'veil', name: 'Swift Veil', desc: 'Dash recovers 30% faster', apply: (r) => { r.dashCd *= 0.7; } },
    { id: 'radiance', name: 'Radiance', desc: '+25% light radius', apply: (r) => { r.radiusMul += 0.25; } },
    { id: 'halo', name: 'Wide Halo', desc: 'Bigger slash', apply: (r) => { r.reach *= 1.3; } },
    { id: 'mend', name: 'Mending Light', desc: 'Heal to full', apply: (r) => { r.hp = r.maxHp; } },
    { id: 'swift', name: 'Featherstep', desc: '+12% move speed', apply: (r) => { r.speed *= 1.12; } },
    { id: 'thorns', name: 'Thorned Crown', desc: 'Getting hit burns nearby foes', apply: (r) => { r.thorns = (r.thorns || 0) + 2; } },
    { id: 'vigil', name: 'Vigil', desc: 'Heal half a heart per cleared room', apply: (r) => { r.vigil = true; } },
    { id: 'mirror', name: 'Mirrored Edge', desc: 'Reflected orbs hit twice as hard', apply: (r) => { r.reflectMul = (r.reflectMul || 1) * 2; } },
  ];

  // Gifts are offered after a death and only last for the next run.
  HC.GIFTS = [
    { id: 'heart', name: 'Ember of Dawn', desc: '+1 max heart', apply: (r, p) => { r.maxHp += p; r.hp += p; } },
    { id: 'bless', name: 'Bright Start', desc: 'Start with a blessing', apply: (r, p) => { for (let i = 0; i < p; i++) { const b = HC.BLESSINGS[Math.floor(Math.random() * HC.BLESSINGS.length)]; b.apply(r); r.blessings.push(b.id); } } },
    { id: 'light', name: 'Bright Soul', desc: '+25% light radius', apply: (r, p) => { r.radiusMul += 0.25 * p; } },
    { id: 'pouch', name: 'Shard Pouch', desc: '+50% shards', apply: (r, p) => { r.shardMul += 0.5 * p; } },
    { id: 'wind', name: 'Second Wind', desc: 'Revive once', apply: (r, p) => { r.revives += p; } },
    { id: 'edge', name: 'Keen Edge', desc: '+1 blade damage', apply: (r, p) => { r.damage += p; } },
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
    affordable() { return HC.UPGRADES.filter((u) => { const c = this.cost(u); return c !== null && c <= HC.save.shards; }).length; },
    buy(up) {
      const c = this.cost(up);
      if (c === null || HC.save.shards < c) return false;
      HC.save.shards -= c; HC.save.up[up.id]++; save(); return true;
    },
    giftPower() { return HC.save.streak >= 3 ? 2 : 1; },
    // Fresh run stats, including permanent upgrades and any pending death gift.
    newRun(seed) {
      const u = HC.save.up;
      const run = {
        seed, room: 0, hp: 3 + u.heart, maxHp: 3 + u.heart,
        radiusMul: 1 + 0.15 * u.light,
        damage: 1 + u.blade, dashCd: 0.6 * Math.pow(0.8, u.veil), reach: 1, speed: 92,
        reflectMul: 1,
        shards: 0, shardMul: 1, kills: 0, blessings: [], thorns: 0, revives: 0, keys: 0,
        sinceTreasure: 0, secretWings: {}, gift: null,
      };
      const g = HC.save.pendingGift;
      if (g) {
        const gift = HC.GIFTS.find((x) => x.id === g.id);
        if (gift) { gift.apply(run, g.power); run.gift = gift.name + (g.power > 1 ? ' X2' : ''); }
        HC.save.pendingGift = null; save();
      }
      return run;
    },
  };
})(window.HC);
