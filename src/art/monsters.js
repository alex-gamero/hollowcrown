// Monster pixel art, grouped by wing. Symmetric sprites are authored as their left half.
(function (HC) {
  'use strict';
  const S = HC.sprites;
  const M = (left) => S.mirror(left);
  const VM = (top) => top.concat(top.slice(0, -1).reverse()); // vertical mirror (shared middle row)
  const pad = (rows, w) => rows.map((r) => (r + '.'.repeat(w)).slice(0, w));
  const GLOW = ['R', 'r', 'e', 'E', 'y', 'o', 'i', 'I'];
  const make = (name, frames, pal, glow) => {
    const norm = S.normalize(frames);
    return norm.map((f, i) => S.compile(name + i, f, pal, { glow: glow || GLOW }));
  };
  HC.art = HC.art || {};

  // ======================= WING I: THE GILDED HALLS =======================
  const PORC = {
    k: '#07040c', m: '#2a1f3c', n: '#181026', N: '#3c2e52', p: '#ece4d4', P: '#aa9e90',
    c: '#4a3a48', R: '#ff2a3c', r: '#ffc0c8', q: '#6e6070',
  };

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
  const legs = (rows) => rows.map((r) => r.split('').map((ch, i) => (ch === 'k' && (i < 5 || i > 14) ? 'q' : ch)).join(''));
  HC.art.skitter = make('skit', [legs(SKITTER), legs(SKITTER_B)], PORC);

  // The Hollow Doll: a porcelain maid. Frozen in light, rushes you in the dark.
  const DOLL_PAL = {
    k: '#07040c', p: '#efe7d8', P: '#b0a494', c: '#5a4858', R: '#ff2a3c', h: '#1c1224', H: '#3e2c4c',
    d: '#2c2040', D: '#1a1228', a: '#cfc6d8', A: '#8a8298', b: '#7a1a2c',
  };
  const DOLL_TOP = [
    '......kkkk', '....kkhhhh', '...khhHhhh', '..khhHhhhh', '..khHhpppp', '..khhppppp', '..khpkkppp', '..khpkRppp',
    '..khpppppc', '..khPppppk', '...khPPPPP', '....kkPPPP', '.....kaAab', '....kaAaAa', '...kddkaaa', '..kdDdkaaa',
    '..kdDdkaAa', '..kpkdkaAa', '..kkddkaaa', '..kdDdkAaa', '.kdDddkaaa', '.kdDdddkAa', 'kdDDdddkaa', 'kdDddddkaA',
    'kddDddDkaa', '.kkkkkkkkk',
  ];
  HC.art.doll = make('doll', [M(DOLL_TOP.concat(['...kpk....', '...kk.....'])), M(DOLL_TOP.concat(['....kpk...', '....kk....']))], DOLL_PAL);

  // The Gilded Sentinel: an empty suit of armor that slams the floor.
  const ARMOR_PAL = {
    k: '#07040c', s: '#6a6480', S: '#3e3a50', l: '#b0aac8', g: '#d9b050', G: '#7a5c22', r: '#a02838', R: '#ff2a3c',
  };
  const ARMOR_TOP = [
    '..........k', '.........kr', '........krr', '.......kkrr', '......klsss', '.....klssss', '.....klsggg', '.....ksssss',
    '.....kSkRkk', '.....ksssss', '......kSSSS', '...kkklssss', '..klllssggg', '.klssSSssgg', '.ksSkkSsssg', '.kSk.kSsgsg',
    '.kgk.ksssss', '.kkk.kSsSss', '.....kSsSss', '.....kgggGg', '.....ksSk..', '.....ksSk..', '.....ksSk..', '....kssSk..',
  ];
  HC.art.armor = make('armor', [M(ARMOR_TOP.concat(['....kkkkk..'])), M(ARMOR_TOP.slice(0, 22).concat(['.....ksSk..', '....kssSk..', '....kkkkk..']))], ARMOR_PAL);

  // ======================= WING II: THE DROWNED LIBRARY =======================
  // Leafling: a torn page that learned to fly. Comes in flocks.
  const PAGE_PAL = { k: '#0a0e14', w: '#ddd4b4', W: '#a89e80', i: '#1a2a3a', R: '#ff2a3c' };
  HC.art.page = make('page', [
    pad(['k........k', 'kwk....kwk', 'kwwkkkkwwk', '.kwwwwwwk.', '.kwiRiWwk.', '..kwwwWk..', '...kwwk...', '....kk....'], 10),
    pad(['..........', '..kkkkkk..', '.kwwwwwwk.', 'kwwwwwwwWk', 'kwwiRiwwWk', '.kwwwwwWk.', '..kwkkwk..', '...k..k...'], 10),
  ], PAGE_PAL, ['R']);

  // Ink Lurker: hides as a puddle, rises when you come close.
  const INK_PAL = { k: '#020608', i: '#0e1e2a', I: '#1e3a4e', e: '#9ff3ff', w: '#d0fcff' };
  const INK_TOP = [
    '.....kkkk', '...kkiiii', '..kiiIiii', '.kiiIiiii', '.kiieeiii', '.kiieeiii', '.kiiiiiii', 'kiiIikkkk', 'kiIiikiki',
    'kiiiiiiii', 'kiiIiiiii', '.kiiiIiii', '.kiiiiiii', '..kiiiiii', '.kiik.kii', 'kiik...ki', 'kik.....k',
  ];
  HC.art.ink = make('ink', [M(INK_TOP), M(INK_TOP.slice(0, 14).concat(['.kiiik.ki', '.kik...ki', '.kk.....k']))], INK_PAL, ['e', 'w']);
  HC.art.puddle = S.compile('puddle', pad(['....kkkkkkkkkk....', '..kkiiiiiiiiiikk..', '.kiiIiiiiiiIiiiik.', '..kkiiiiiiiiiikk..', '....kkkkkkkkkk....'], 18), INK_PAL);

  // The Weeper: a drowned librarian that hurls ink.
  const WEEP_PAL = { k: '#04080c', H: '#3a6a76', h: '#1c3c46', d: '#0c1c22', e: '#9ff3ff', b: '#6a3a20', B: '#d8d0b0', w: '#5ad4e8' };
  const WEEP_TOP = [
    '.....kkk', '....kHHH', '...kHHhh', '..kHhhhh', '..kHhddd', '..kHhded', '..kHhddd', '..kHhhdd', '.kHhhhhh', '.kHhhhhh',
    'kHhhbbbb', 'kHhhbBBB', 'kHhhbbbb', 'kHhhhhhh', '.kHhhhhh', '.kHhhhhh', '..kHhhhh',
  ];
  HC.art.weeper = make('weep', [M(WEEP_TOP.concat(['..khkhkh', '...k.k.k'])), M(WEEP_TOP.concat(['..kHkhkh', '..k.k.k.']))], WEEP_PAL, ['e']);

  // ======================= WING III: THE BONE GARDEN =======================
  const BONE_PAL = { k: '#0a0806', b: '#d6ccb6', B: '#8c8270', R: '#ff2a3c', g: '#4a5a2e', w: '#5a4026', W: '#3a2a18', l: '#7a5a36', y: '#d8ff6a', r: '#7a1a2a', o: '#ff6a1e', t: '#e8dcc0', G: '#6a7a3a' };
  // Bone Hound (side view, faces right)
  const HOUND = [
    '..................kk..', '................kkbbk.', '...............kbbbbbk', '..............kbRbbkkk', '.k............kbbbBkbk',
    'kbk.....kkkkkkbbBk.kk.', '.kbkkkkkbbbbbbbbk.....', '..kbbbbkbkbkbkbBk.....', '...kBbbkbkbkbkBk......', '....kbbkkkkkkbbk......',
  ];
  HC.art.hound = make('hound', [
    pad(HOUND.concat(['....kbk.....kbbk......', '...kbk.......kbk......', '...kk........kk.......']), 22),
    pad(HOUND.concat(['.....kbk...kbk........', '......kbk.kbk.........', '......kk..kk..........']), 22),
  ], BONE_PAL, ['R']);

  // Rootling: burrows, then bursts up beneath you.
  const ROOT_TOP = ['......kk', '..k..kwk', '.kwk.kwk', '.kwkkwwk', '..kwwwlw', '..kwwlww', '.kwwwykw', '.kwwkkkk', '.kwktktk', '.kwwwwwg', '..kwWwwg', '..kwWwwk', '.kwWkkwk', 'kwk..kwk', 'kk....kk'];
  HC.art.root = make('root', [M(ROOT_TOP), M(ROOT_TOP.slice(0, 12).concat(['.kwWkkwk', '.kwk.kwk', '.kk...kk']))], BONE_PAL, ['y']);
  HC.art.mound = S.compile('mound', pad(['...kkkkkk...', '.kkWwWWwWkk.', 'kWwWwWWwWwWk'], 12), BONE_PAL);

  // Thorn Bloom: a rooted flower that spits thorns in every direction.
  const BLOOM_TOP = ['....kk...', '...krRk..', '.kkkrRkkk', 'krRkrrkRr', 'krRRkkRRr', '.krrkookk', '..kkooooo', '.krkoyyoo', 'krRkoyyyo', '.krrkooook', '..kkkkkkk', '....kGgk.', '...kgGgk.', '.kGkgGkGk', 'kgggGgggk', '.kkkkkkkk'];
  HC.art.bloom = make('bloom', [M(BLOOM_TOP), M(BLOOM_TOP.slice(0, 6).concat(['..kkooooo', '.krkoyyyo', 'krRkoyyyo', '.krrkoooo'], BLOOM_TOP.slice(10)))], BONE_PAL, ['o', 'y']);

  // ======================= WING IV: THE SUNLESS SPIRE =======================
  // Shade: invisible unless your light touches it.
  const SHADE_PAL = { k: '#000000', n: '#0e0a16', N: '#1e1830', e: '#ffffff' };
  const SHADE_TOP = ['.....kkk', '....knnn', '...knnnn', '...knNnn', '...knnen', '...knnnn', '....knnn', '...knnnn', '..knNnnn', '.knnnNnn', 'kn.knnnn', 'kn.knnnn', 'k..knNnn', 'k..knnnn', '...knnnn', '...knnNn', '..knnnnn', '..knnnnn'];
  HC.art.shade = make('shade', [M(SHADE_TOP.concat(['.knnn.nn', '.kn.n.nn', '.k..n..n', '....n...'])), M(SHADE_TOP.concat(['.knn.nnn', '..kn.n.n', '..k.n..n', '.....n..']))], SHADE_PAL, ['e']);

  // Eclipse Eye: stares, then fires a beam.
  const EYE_PAL = { k: '#000000', c: '#1a1024', C: '#5b3fd0', w: '#e8e0f0', i: '#9a7cff', I: '#e0d0ff', p: '#000000' };
  const EYE_Q = ['....k...k', '.....k.kC', '..k..kCCC', '...kCCccc', '.k.Ccckkk', '..Cckwwww', '.kCckwwii', '..Cckwiii', 'kCckwwiIp'];
  HC.art.eye = make('eye', [VM(M(EYE_Q)), VM(M(EYE_Q.slice(0, 8).concat(['kCckwwiip'])))], EYE_PAL, ['C', 'i', 'I']);

  // ======================= BOSSES =======================
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
  HC.art.king = make('king', [M(KING_LEFT)], Object.assign({}, PORC, { g: '#c9a24a', G: '#7a5c22' }));

  // The Archivist: drowned keeper of the library, many-eyed, books in hand.
  const ARCH_PAL = { k: '#04080c', H: '#3a6a76', h: '#1c3c46', d: '#06121a', e: '#9ff3ff', E: '#ffffff', b: '#6a3a20', B: '#3a1e10', p: '#d8d0b0', P: '#a89e80', a: '#22404a' };
  const ARCH_LEFT = [
    '...................kkk', '.................kkhhh', '...............kkhhHHh', '.............kkhhHHhhh', '............khhHHhhhhh',
    '...........khHHhhhhhhh', '..........khHhhhhhhhhh', '..........khHhhhdddddd', '.........khHhhdddddddd', '.........khHhhddedddde',
    '.........khHhhdddddddd', '.........khHhhhddddddd', '........khHhhhhhdddddd', '........khHhhhhhhhdddd', '.......khHhhhhhhhhhhhh',
    '......khHhhhhhhhhhhhhh', '..kkkkkhHhhhhhhhhhhhhh', '.kbbbbkaahHhhhhhhhhhhh', 'kbpppbkaaahHhhhhhhhkkk', 'kbpPpbkkaaahHhhhhhkbbb',
    'kbpppbk.kaahHhhhhhkbpp', 'kbbbbbk..kahHhhhhhkbpP', '.kkkkk....khHhhhhhkbbb', '.........khHhhhhhhhkkk', '.........khHhhhhhhhhhh',
    '........khHhhhhhhhhhhh', '........khHhhhhhhhhhhh', '.......khHhhhhhhhhhhhh', '.......khHhhhhhhhhhhhh', '......khHhhhhhhhhhhhhh',
    '......khHhhhhhhhhhhhhh', '.....khHhhhhhhhhhhhhhh', '.....khHhhhhhhhhhhhhhh', '....khHhhhhhhhhhhhhhhh', '....khkhkhkhkhkhkhkhkh',
    '....k.k.k.k.k.k.k.k.k.',
  ];
  HC.art.archivist = make('arch', [M(ARCH_LEFT)], ARCH_PAL, ['e', 'E']);

  // The Gardener: a scarecrow that tends the dead. Its scythe is drawn in code.
  const GARD_PAL = { k: '#0a0806', t: '#2a2018', T: '#4a3a28', s: '#8a7050', S: '#5e4a34', y: '#d8ff6a', c: '#2a3020', C: '#3e4630', r: '#a89060', g: '#4a5a2e', h: '#3a2a1a' };
  const GARD_LEFT = [
    '................kkkk', '..............kkTTTT', '.............kTTtttt', '............kTttttTT', '.......kkkkkkTtttttt',
    '.....kkTTTTTTTtttttt', '....kTttttttttttttTT', '.....kkkkkkkkkkkkkkk', '..........ksssssssss', '..........kssSssssss',
    '..........kssyyskSss', '..........kssyyksSss', '..........ksSssssSss', '..........kssskskksk', '..........kSsssssssS',
    '...........kSSSSSSSS', '.........kkkrrrrrrrr', '.......kkCcccccccccc', '.....kkCcccccCcccccc', '....kCccccccccCccccc',
    '...kCcckkkcccccCcccc', '..kCcck..kcccccCcccc', '..kCck...kccccccCccc', '.kCck....kcccccccCcc', '.kck.....kccgcccccCc',
    'khhk.....kcccccccccC', 'khk......kccccgccccc', '.k.......kcccccccccc', '.........kccgccccccc', '.........kcccccccccc',
    '........kccccccccccc', '........kcCccccccgcc', '.......kccCccccccccc', '.......kcccCcccccccc', '......kccgcCcccccccc',
    '......kcccccCccccccc', '.....kcccccccCcccccc', '.....kckckckckckckck', '.....k.k.k.k.k.k.k.k', '..........kk.....kk.',
    '..........kh.....kh.', '..........kh.....kh.', '.........khh.....khh',
  ];
  HC.art.gardener = make('gard', [M(GARD_LEFT)], GARD_PAL, ['y']);

  // The Hollow Crown: the crown itself, hungry and floating.
  const CROWN_PAL = { k: '#07040c', g: '#e0b850', G: '#8a6424', l: '#fff0a0', v: '#05020a', V: '#1a0a24', R: '#ff2a3c', r: '#ffc0c8', j: '#5ad4e8', J: '#c8ffff' };
  const CROWN_LEFT = [
    '.......k................', '......klk...............', '......kgk.........k.....', '.....kglGk.......klk....', '.....kgGGk.......kgk....',
    '....kglgGGk....kkglGk...', '....kgGgGGGk..kgGgGGk...', '...kglgGgGGGkkglgGgGk...', '...kgGgGGgGGGggGgGGGGk..', '..kgljJgGgGGgGjJgGgGGGkk',
    '..kgGjjGgGGGGgGjjGgGGGGg', '..kglGgGgGGGkkkkkkkkkkkk', '..kgGgGgGGGkvvvvvvvvvvvv', '..kglgGgGGkvVvvvvvvvvvvv', '..kgGgGgGGkvvvvvvvRRRRvv',
    '..kglgGgGGkvVvvvvRRrrRRv', '..kgGgGgGGkvvvvvvRRrrRRv', '..kglgGgGGkvvVvvvvRRRRvv', '..kgGgGgGGkvvvvvvvvvvvvv', '..kglgGgGGGkkkkkkkkkkkkk',
    '..kgGgGgGGGGgGgGgGgGgGgG', '..kglljlGgllJllGgljlGgGg', '..kgGgGgGGgGgGgGgGgGgGgG', '...kkkkkkkkkkkkkkkkkkkkk',
  ];
  HC.art.crown = make('crown', [M(CROWN_LEFT)], CROWN_PAL, ['R', 'r', 'j', 'J', 'l']);
  // Porcelain masks that orbit the crown.
  HC.art.mask = make('mask', [M(['..kkk', '.kppp', 'kpppp', 'kpRkp', 'kpppp', 'kPppk', '.kPPP', '..kkk'])], PORC);
})(window.HC);
