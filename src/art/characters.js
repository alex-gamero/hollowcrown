// Character pixel art. Each string row is one line of pixels; letters map to palette colors.
(function (HC) {
  'use strict';
  const S = HC.sprites;

  // ---------------- The princess: a being of light ----------------
  const PRINCESS_PAL = {
    k: '#7a4e34', K: '#4a2c22', H: '#fff7d0', h: '#ffe48a', j: '#e9b85a', s: '#fff1e6', S: '#f6cdb8',
    e: '#3b2a63', E: '#6a54a8', w: '#ffffff', b: '#ffb3bd', m: '#e07a8a', D: '#fffef8', d: '#f3ead6',
    f: '#dcc79a', g: '#ffd650', G: '#d9a530', c: '#a8f6ff', C: '#5ad4e8',
  };

  const DOWN_TOP = [
    '............', '...........k', '..........kc', '.......kkkkC', '.....kkHHHgg', '....kHHHHgGg',
    '...kHHHHHHHH', '...kHhHHHHhH', '..kHHhHHHhHH', '..kHhHhhHhhH', '..kHhhsHsshs', '..kHhhsKKKss',
    '..kHhjseeess', '..kHhjsEEess', '..kHhjsbSsss', '..kHhjjsssSm', '..kHhjjjkSss', '..kHhhjjjkkS',
    '..kHhhjjkdgD', '.kHhhjkdDDDg', '.kHhhjkdDDDD', '.kHhjjkdDDss', '..kjjkddDDsS', '..kkkddDDDDD',
    '...kfddDDDDD', '..kffddDDDDD', '..kfddDDDDgD',
  ];
  const HEM_A = ['.kffddDDDDDD', '.kffdddDDDDD', 'kgfgdgDgDgDg', '.kkkkkkkkkkk'];
  const HEM_B = ['..kfddDDDDDD', '.kffddDDDDDD', '.kgfgdgDgDgD', '..kkkkkkkkkk'];

  const UP_TOP = [
    '............', '............', '...........k', '.......kkkkk', '.....kkHHHgg', '....kHHHHgGg',
    '...kHHHHHHHH', '...kHhHHHhHH', '..kHHhHHhHHh', '..kHhHhHHhHH', '..kHhhHhHHhH', '..kHhhHhhHhH',
    '..kHhjhHhhHh', '..kHhjhhHhhH', '..kHhjhhhHhh', '..kHhjjhhhHh', '..kHhjjhjhhH', '..kHhhjjhjhh',
    '..kHhhjjjhjh', '.kHhhjjjjhjj', '.kHhhjjkjjjk', '.kHhhjkdjjkD', '.kHhjjkddkDD', '..kjjkddDDDD',
    '..kkkddDDDDD', '...kfddDDDDD', '..kffddDDDDD',
  ];
  const UP_HEM_A = ['..kfddDDDDdD', '.kffddDDDDDD', 'kgfgdgDgDgDg', '.kkkkkkkkkkk'];
  const UP_HEM_B = ['..kfddDDDDDD', '..kfddDDDDdD', '.kgfgdgDgDgD', '..kkkkkkkkkk'];

  // Side view (facing right). Authored at full width.
  const SIDE_TOP = [
    '........................',
    '...........kk...........',
    '..........kcck..........',
    '.......kkkkCCkk.........',
    '.....kkHHHHggggk........',
    '....kHHHHHHHHHHHk.......',
    '...kHHhHHHHHHHHHHk......',
    '...kHhHHhHHHHHhHHHk.....',
    '..kHHhHHhHHHHhHhHHk.....',
    '..kHhHHhHHHhHhsHhsk.....',
    '..kHhHhHHHhHssssssk.....',
    '..kHhhHHhHhsssKKKsk.....',
    '..kHhjhHhHhssseesk......',
    '..kHhjhhHhjsssEesk......',
    '..kHhjhhhHjssbSssk......',
    '..kHhjjhhhjjsssmk.......',
    '..kHhjjhhjjjkSSk........',
    '..kHhhjjhjjjkSk.........',
    '..kHhhjjjjjkdgDk........',
    '.kHhhjjjjjkdDDDDk.......',
    '.kHhhjjjjkdDDDDDDk......',
    '.kHhjjjjkddDDDssDk......',
    '..kjjjjkddDDDDsSDk......',
    '..kkjjkdddDDDDDDDk......',
    '...kkkddddDDDDDDDDk.....',
    '....kffdddDDDDDDDDk.....',
    '...kfffdddDDDDDDDDDk....',
  ];
  const SIDE_HEM_A = ['...kffddddDDDDDDDDDk....', '..kffdddddDDDDDDDDDDk...', '..kgfgfgdgDgDgDgDgDgk...', '...kkkkkkkkkkkkkkkkk....'];
  const SIDE_HEM_B = ['...kffddddDDDDDDDDk.....', '...kffdddddDDDDDDDDk....', '...kgfgfgdgDgDgDgDgk....', '....kkkkkkkkkkkkkkk.....'];

  const frames = S.normalize([
    S.mirror(DOWN_TOP.concat(HEM_A)), S.mirror(DOWN_TOP.concat(HEM_B)),
    S.mirror(UP_TOP.concat(UP_HEM_A)), S.mirror(UP_TOP.concat(UP_HEM_B)),
    SIDE_TOP.concat(SIDE_HEM_A), SIDE_TOP.concat(SIDE_HEM_B),
  ]);
  HC.art = HC.art || {};
  HC.art.princess = {
    down: [S.compile('p_d0', frames[0], PRINCESS_PAL), S.compile('p_d1', frames[1], PRINCESS_PAL)],
    up: [S.compile('p_u0', frames[2], PRINCESS_PAL), S.compile('p_u1', frames[3], PRINCESS_PAL)],
    side: [S.compile('p_s0', frames[4], PRINCESS_PAL), S.compile('p_s1', frames[5], PRINCESS_PAL)],
  };

  // The Hollow Self: a dark reflection of the princess (Sunless Spire).
  const SELF_PAL = Object.assign({}, PRINCESS_PAL, {
    k: '#07040c', K: '#07040c', H: '#d8d4e0', h: '#a8a2b8', j: '#6a6480', s: '#b8b0c4', S: '#7a7288',
    e: '#ff2a3c', E: '#ff2a3c', b: '#4a3a5a', m: '#2a1a30', D: '#2a2236', d: '#1a1424', f: '#120c1a', g: '#5a4a60', G: '#3a2a44', c: '#ff2a3c', C: '#a01828',
  });
  HC.art.self = {
    down: [S.compile('self_d0', frames[0], SELF_PAL, { glow: ['e', 'E', 'c'] }), S.compile('self_d1', frames[1], SELF_PAL, { glow: ['e', 'E', 'c'] })],
    up: [S.compile('self_u0', frames[2], SELF_PAL, { glow: ['c'] }), S.compile('self_u1', frames[3], SELF_PAL, { glow: ['c'] })],
    side: [S.compile('self_s0', frames[4], SELF_PAL, { glow: ['e', 'E', 'c'] }), S.compile('self_s1', frames[5], SELF_PAL, { glow: ['e', 'E', 'c'] })],
  };

  // ---------------- Small items ----------------
  const ITEM_PAL = {
    k: '#2a1a10', y: '#fff3a6', Y: '#ffd24a', o: '#e09a2a', w: '#ffffff', c: '#a8f6ff', C: '#4fd0e0', b: '#2a7ab0',
    r: '#ff5a6a', R: '#c0283c', p: '#ffd0d8', s: '#6a6080', S: '#9a90b0', t: '#3a3248',
  };
  HC.art.shard = S.compile('shard', ['..w..', '.wcC.', 'wccCb', '.cCb.', '..b..'], ITEM_PAL, { glow: ['w', 'c', 'C', 'b'] });
  HC.art.heart = S.compile('heart', ['.kk.kk.', 'krpkrrk', 'kprrrRk', 'krrrrRk', '.krrRk.', '..kRk..', '...k...'], ITEM_PAL, { glow: ['r', 'p', 'R'] });
  HC.art.mote = S.compile('mote', ['.y.', 'yYy', '.y.'], ITEM_PAL, { glow: ['y', 'Y'] });
  HC.art.key = S.compile('key', ['.kkk.', 'kgGgk', 'kG.Gk', 'kgGgk', '.kgk.', '.kgk.', '.kggk', '.kgk.', '.kggk', '..k..'],
    { k: '#06140a', g: '#5aff8a', G: '#b8ffc8' }, { glow: ['g', 'G'] });
  HC.art.pedestal = S.compile('pedestal', [
    '.kkkkkkkkkk.', 'kSSSSSSSSSSk', 'ksssssssssSk', '.kttsssssSk.', '..ktssssSk..', '..ktssssSk..', '..ktssssSk..',
    '..ktssssSk..', '.kttsssssSk.', 'kSSSSSSSSSSk', 'kttttttttttk', '.kkkkkkkkkk.',
  ], ITEM_PAL);
})(window.HC);
