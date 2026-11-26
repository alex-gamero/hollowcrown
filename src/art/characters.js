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
    '..kHhjsewess', '..kHhjsEEess', '..kHhjsbSsss', '..kHhjjsssSm', '..kHhjjjkSss', '..kHhhjjjkkS',
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
    '..kHhjhHhHhssseWsk......',
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

  // ---------------- Monsters ----------------
  const MON_PAL = {
    k: '#07040c', m: '#2a1f3c', n: '#181026', N: '#3c2e52', p: '#ece4d4', P: '#aa9e90',
    c: '#4a3a48', R: '#ff2a3c', r: '#ffc0c8', q: '#6e6070', g: '#c9a24a', G: '#7a5c22', v: '#9a7cff', V: '#5b3fd0',
  };

  // The Hollow: a porcelain-masked stalker. Frozen in light, fast in the dark.
  const HOLLOW = [
    '.........kkkkk..........', '........kpppppk.........', '.......kpppppppk........', '......kpppppppPPk.......',
    '......kppRRppRRPk.......', '......kpprRpprRPk.......', '......kpppcpppPPk.......', '......kPppcppPPPk.......',
    '......kPPpcpPPPqk.......', '.......kPPcPPPqk........', '........kkPPPkk.........', '.......knmmmmmnk........',
    '......knmmNNmmmnk.......', '.....knmNmmmmNmmnk......', '....knmnmmmmmmmnmnk.....', '....kmnkkmmmmmmkknmk....',
    '....kmmk.kmmmmk.kmmk....', '....kmnk.kmmmmk.knmk....', '....kmmk.knmmnk.kmmk....', '....knmk.kmmmmk.kmnk....',
    '....kmmk.kmmmmk.kmmk....', '....kmnk.kmmmmk.knmk....', '....knmk.kmnmmk.kmnk....', '...kmmmk.kmmmmk.kmmmk...',
    '...kpkpk.kmmmmk.kpkpk...', '...k.k.k.kmmmmk.k.k.k...', '........knmmmmnk........', '.......knmmmmmmnk.......',
    '......knmmnmmnmmnk......', '......kmmnmmmmnmmk......', '.....knmmmmnmmmmnmk.....', '.....kmnmmmmmmnmmmk.....',
    '.....knmk.kmmk.kmnk.....', '.....kmk..knnk..kmk.....', '.....k.k...kk...k.k.....',
  ];
  const HOLLOW_B = HOLLOW.slice(0, 31).concat(['.....kmnk.kmmk.knmk.....', '.....knk..knnk..knk.....', '......k...kk....k......', '........................']);

  // Skitter: a low crawling porcelain shell on spindly legs.
  const SKITTER = [
    '....................', '......kkkkkkkk......', '..k..kppppppPPk..k..', '.k.kkppRpppRpPPkk.k.',
    'k.k.kpprppprpPPk.k.k', 'k.k.kPpppcppPPPk.k.k', '.k.k.kPPPcPPPPk.k.k.', '..k..knmmmmmmnk..k..',
    '.k..knmmNmmNmmnk..k.', 'k..k.knmmmmmmnk.k..k', '...k..kkkkkkkk..k...', '..k..............k..',
  ];
  const SKITTER_B = [
    '....................', '......kkkkkkkk......', '.k...kppppppPPk...k.', 'k.kkkppRpppRpPPkkk.k',
    '.k.kkpprppprpPPkk.k.', '.k.k.kPpppcppPPk.k.k', 'k.k..kPPPcPPPPk..k.k', '.k...knmmmmmmnk...k.',
    '..k.knmmNmmNmmnk.k..', '.k.k.knmmmmmmnk.k.k.', '..k...kkkkkkkk...k..', '....................',
  ];

  // Lament: a floating weeping mask that spits shards of darkness.
  const LAMENT = [
    '......kkkk......', '.....kppppk.....', '....kppppppk....', '...kppppppPPk...', '...kpRRppRRPk...', '...kprRpprRPk...',
    '...kpRppppRPk...', '...kpRpccpRPk...', '...kPpRppRPPk...', '....kPPPPPPk....', '...knmmmmmmnk...', '..knmNmmmmNmnk..',
    '..kmnmmmmmmnmk..', '..kmk.mnnm.kmk..', '...k.kmnnmk.k...', '.....kmk.mk.....', '......k...k.....',
  ];
  const LAMENT_B = LAMENT.slice(0, 13).concat(['..kmk.mnnm.kmk..', '..k..kmnnmk..k..', '....kmk..kmk....', '.....k....k.....']);

  // The Hollow King: boss of the first wing. Authored as a left half.
  const KING_LEFT = [
    '....................', '...........k........', '..........kgk...k...', '......k...kgk..kgk..', '.....kgk.kgGgkkgGgk.',
    '.....kgGggGGGgggGGgg', '......kGGGGGGGGGGGGG', '......kkkkkkkkkkkkkk', '.......kpppppppppppp', '......kppppppppppppP',
    '......kpppppppppppPP', '......kpppkkkkppppPc', '......kppkkkRkkppppc', '......kppkkRrkkpppcp', '......kpppkkkkppppcp',
    '......kPppppppppppcp', '......kPPppppppppcpp', '.......kPPpppppppcpp', '.......kPPpkpkpkpkpk', '........kPPPPPPPPPPP',
    '.........kkkkkkkkkkk', '....kkknnnmmmmmmgmmm',
    '..kknmmmmmmmmmmmgmmm', '.knmmmmNmmmmmmmmgmmm', '.kmmNmmmmmmmmmmmgmmm', 'knmmmmmkknmmmmmmgmmm', 'kmmmmmk.knmmmmmmgmmm',
    'kmmNmmk.kmmmmmmmgmmm', 'knmmmmk.kmmmmmmmgmmm', 'kmmmnmk.knmmmmmmgmmm', 'kmmmmmk.kmmmmmmmgmmm', 'knmmmnk.kmmmmmmmgmmm',
    'kpkpkpk.kmmmmmmmgmmm', '.k.k.k..kmmmmmmmgmmm', '........knmmmmmmgmmm', '.......knmmmmmmmgmmm', '.......kmmmNmmmmgmmm',
    '......knmmmmmmmmgmmm', '......kmmmmmmnmmgmmm', '.....knmmNmmmmmmgmmm', '.....kmmmmmmmmmmgmmm', '....knmmmmmnmmmmgmmm',
    '....kgGgGgGgGgGgGgGg', '....kkk.kkk.kkkk.kkk',
  ];

  const GLOW = ['R', 'r'];
  HC.art.hollow = [S.compile('hollow0', HOLLOW, MON_PAL, { glow: GLOW }), S.compile('hollow1', S.normalize([HOLLOW_B, HOLLOW])[0], MON_PAL, { glow: GLOW })];
  const legs = (rows) => rows.map((r) => r.split('').map((ch, i) => (ch === 'k' && (i < 5 || i > 14) ? 'q' : ch)).join(''));
  HC.art.skitter = [S.compile('skit0', legs(SKITTER), MON_PAL, { glow: GLOW }), S.compile('skit1', legs(SKITTER_B), MON_PAL, { glow: GLOW })];
  HC.art.lament = [S.compile('lam0', LAMENT, MON_PAL, { glow: GLOW }), S.compile('lam1', S.normalize([LAMENT_B, LAMENT])[0], MON_PAL, { glow: GLOW })];
  HC.art.king = [S.compile('king0', S.mirror(KING_LEFT), MON_PAL, { glow: GLOW })];

  // ---------------- Small items ----------------
  const ITEM_PAL = {
    k: '#2a1a10', y: '#fff3a6', Y: '#ffd24a', o: '#e09a2a', w: '#ffffff', c: '#a8f6ff', C: '#4fd0e0', b: '#2a7ab0',
    r: '#ff5a6a', R: '#c0283c', p: '#ffd0d8', s: '#6a6080', S: '#9a90b0', t: '#3a3248',
  };
  HC.art.shard = S.compile('shard', ['..w..', '.wcC.', 'wccCb', '.cCb.', '..b..'], ITEM_PAL, { glow: ['w', 'c', 'C', 'b'] });
  HC.art.heart = S.compile('heart', ['.kk.kk.', 'krpkrrk', 'kprrrRk', 'krrrrRk', '.krrRk.', '..kRk..', '...k...'], ITEM_PAL, { glow: ['r', 'p', 'R'] });
  HC.art.mote = S.compile('mote', ['.y.', 'yYy', '.y.'], ITEM_PAL, { glow: ['y', 'Y'] });
  HC.art.pedestal = S.compile('pedestal', [
    '.kkkkkkkkkk.', 'kSSSSSSSSSSk', 'ksssssssssSk', '.kttsssssSk.', '..ktssssSk..', '..ktssssSk..', '..ktssssSk..',
    '..ktssssSk..', '.kttsssssSk.', 'kSSSSSSSSSSk', 'kttttttttttk', '.kkkkkkkkkk.',
  ], ITEM_PAL);
})(window.HC);
