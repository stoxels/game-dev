// spell-fx-recipes.js
//------------------------------------------------------------------------
//---------------------------SPELL FX RECIPES-----------------------------
//------------------------------------------------------------------------
// Data only: what each spell's visuals are made of, played by the toolkit
// (js/skills/spell-fx-kit.js). SPELL_FX_THEME holds the school defaults,
// SPELL_FX the per-spell signatures (any field overrides the school's).
// Fields: cast (at the hero), flight + trail, impact / impactBig, tick, nova.
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//------------------------------PALETTES----------------------------------
//------------------------------------------------------------------------

const FIRE = ['#fff4c2', '#ffd25a', '#ff9a1f', '#ff5a1f', '#e8320e'];
const FIRE_HOT = ['#ffffff', '#fff4c2', '#ffd25a', '#ffb347'];
const SMOKE = ['rgba(60,48,44,.75)', 'rgba(40,32,30,.7)', 'rgba(90,70,60,.6)'];
const SMOKE_DARK = ['rgba(30,24,22,.8)', 'rgba(50,40,36,.75)', 'rgba(20,16,14,.8)'];
const FIRE_BILLOW = ['rgba(255,250,220,.95)', 'rgba(255,214,110,.92)', 'rgba(255,150,40,.9)', 'rgba(240,80,20,.88)', 'rgba(190,40,10,.8)'];
const PUFF_C = ['#ffe68a', '#ffc443', '#ffa22e'];
const PUFF_G = ['#ff6a1f', '#e8400e', '#c22a04'];
const MAGMA = ['#fff0a0', '#ffb020', '#ff6a00', '#d63000'];
const SUN = ['#ffffff', '#fff6c8', '#ffe07a', '#ffb43c'];
const STEAM = ['rgba(240,245,250,.75)', 'rgba(220,230,240,.65)'];
const FROST = ['#ffffff', '#e3f6ff', '#9fe0ff', '#5cc4ff', '#2a8fe0'];
const ICE = ['#ffffff', '#d8f3ff', '#a6e3ff', '#73cfff'];
const ARCANE = ['#ffffff', '#f3d9ff', '#d39bff', '#a86bff', '#7a3cff'];
const SHADOW = ['#e6c8ff', '#b071ff', '#7b2fd0', '#4a148c'];
const VOID = ['rgba(26,6,40,.85)', 'rgba(60,14,90,.8)', 'rgba(10,2,18,.85)'];
const HOLY = ['#ffffff', '#fff8d6', '#ffe58a', '#ffc93c', '#ffa41a'];
const NATURE = ['#f1ffe0', '#c8f59a', '#86e05a', '#4cb83a', '#2a7d2a'];
const STORM = ['#ffffff', '#e9f8ff', '#a9e4ff', '#6ec6ff', '#3d8bff'];
const VOLT = ['#ffffff', '#fffbd0', '#ffe45e', '#ffc400'];
const STEEL = ['#ffffff', '#eef2f8', '#c9d3e2', '#9aa7bd'];
const BLOOD = ['#ff8a80', '#ff3b3b', '#d50000', '#8a0000'];
const WOOD = ['#f3e2c0', '#c9a06a', '#8a6236', '#5a3d20'];
const LEAF = ['#e8ffd0', '#b5e07f', '#7cc242', '#4f8f2a'];
const POISON = ['#f4ffb8', '#c6ff52', '#7ee03a', '#3c9a1e'];
const FEL = ['#eaffb0', '#a8ff3c', '#5fd62a', '#2c8a16'];
const ROT = ['#c9d48a', '#8a9a3c', '#5a6a22', '#2e3812'];
const ROT_SMOKE = ['rgba(70,80,30,.7)', 'rgba(50,56,20,.75)', 'rgba(90,96,40,.6)'];
const FROST_MIST = ['rgba(225,245,255,.8)', 'rgba(190,230,255,.7)', 'rgba(160,215,255,.6)'];
const WATER = ['#ffffff', '#c8ecff', '#7fd0ff', '#3da9ff'];
const ARCANE_ASH = ['#f3d9ff', '#c99bff', '#8a52e0', '#5a2aa0'];
const STARLIGHT = ['#ffffff', '#fff6ff', '#ffe9a8', '#e2b8ff'];
const WITHER = ['#c8b0e0', '#8a6aa8', '#5a3a78', '#7a8a50'];
const PAIN = ['#ffd0e8', '#ff6fb0', '#c2185b', '#7b2fd0'];
const PLAGUE = ['rgba(170,230,80,.7)', 'rgba(120,190,50,.65)', 'rgba(80,140,30,.6)'];
const SOUL = ['#ffffff', '#e6f4ff', '#c8e2ff', '#b8b0ff'];
const SPIRIT = ['#ffffff', '#d8fff6', '#8ff0dc', '#3fc7b0'];
const DUST = ['rgba(190,170,140,.65)', 'rgba(160,140,110,.6)', 'rgba(120,100,80,.55)'];


//------------------------------------------------------------------------
//---------------------------SCHOOL DEFAULTS------------------------------
//------------------------------------------------------------------------
// cast: a sigil + sparks at the hero the moment the spell commits.
// trail: particles shed along every projectile flight of the school.
// impact: what blooms on the victim's card; tick: one damage-over-time beat.

export const SPELL_FX_THEME = {
    fire: {
        cast: [
            { css: 'sfx-sigil sfx-sigil-fire', ms: 650 },
            { flash: { color: 'rgba(255,230,160,.85)', color2: 'rgba(255,110,20,.35)', size: 90, dur: 320 } },
            { p: 'ember', n: 10, motion: 'rise', colors: FIRE, size: [2, 5], dist: [30, 70], dur: [450, 800], spread: 14 },
        ],
        trail: { every: 24, steps: [
            { p: 'ember', n: 2, motion: 'drift', colors: FIRE, size: [3, 7], dist: [6, 18], lift: [4, 14], end: 0.15, dur: [260, 480], spread: 4 },
            { p: 'smoke', n: 1, motion: 'drift', colors: SMOKE, size: [8, 14], dist: [4, 10], lift: [10, 20], end: 0.24, dur: [500, 800], opacity: 0.55 },
        ] },
        impact: [
            { flash: { color: 'rgba(255,248,220,.95)', color2: 'rgba(255,120,20,.45)', size: 150, dur: 360 } },
            { ring: { color: '#ffb347', glow: '#ff6a00', size: 120, width: 3, dur: 520 } },
            { p: 'ember', n: 16, motion: 'arc', colors: FIRE, size: [3, 6], dist: [30, 80], lift: [16, 40], grav: [10, 30], dur: [500, 850] },
            { p: 'spark', n: 8, motion: 'streak', colors: FIRE_HOT, size: [2, 3], stretch: [5, 8], dist: [40, 80], dur: [260, 420] },
            { p: 'smoke', n: 4, motion: 'drift', colors: SMOKE, size: [16, 24], dist: [10, 24], lift: [24, 40], end: 0.22, dur: [700, 1000], opacity: 0.6, delay: [80, 160] },
        ],
        tick: [
            { p: 'ember', n: 6, motion: 'rise', colors: FIRE, size: [2, 5], dist: [26, 54], dur: [450, 750], spread: 18, at: [50, 70] },
            { css: 'sfx-lick', ms: 650 },
        ],
    },
    frost: {
        cast: [
            { css: 'sfx-sigil sfx-sigil-frost', ms: 650 },
            { flash: { color: 'rgba(235,250,255,.85)', color2: 'rgba(90,190,255,.35)', size: 90, dur: 320 } },
            { p: 'flake', n: 7, motion: 'burst', colors: ICE, glow: ['#7fd9ff'], size: [6, 10], dist: [24, 52], spin: [90, 220], dur: [500, 800] },
        ],
        trail: { every: 26, steps: [
            { p: 'mote', n: 1, motion: 'drift', colors: ['rgba(200,240,255,.8)', 'rgba(140,210,255,.7)'], size: [8, 14], dist: [4, 10], lift: [2, 8], end: 0.2, dur: [300, 520] },
            { p: 'flake', n: 1, motion: 'drift', colors: ICE, glow: ['#7fd9ff'], size: [4, 7], dist: [6, 16], lift: [0, 8], spin: 180, end: 0.12, dur: [400, 650] },
        ] },
        impact: [
            { flash: { color: 'rgba(255,255,255,.95)', color2: 'rgba(110,200,255,.45)', size: 140, dur: 340 } },
            { ring: { color: '#bfeaff', glow: '#5cc4ff', size: 110, width: 2.5, dur: 480 } },
            { p: 'shard', n: 12, motion: 'arc', colors: ICE, glow: ['#5cc4ff'], size: [4, 8], dist: [30, 75], lift: [10, 30], grav: [14, 34], spin: [180, 480], dur: [480, 800] },
            { p: 'flake', n: 6, motion: 'burst', colors: ICE, glow: ['#7fd9ff'], size: [5, 9], dist: [20, 50], spin: 200, dur: [600, 900] },
            { css: 'sfx-rime', ms: 900 },
        ],
        tick: [
            { p: 'flake', n: 5, motion: 'fall', colors: ICE, glow: ['#7fd9ff'], size: [4, 7], dist: [20, 40], spread: 20, spin: 200, dur: [500, 800] },
            { css: 'sfx-rime sfx-rime-soft', ms: 700 },
        ],
    },
    arcane: {
        cast: [
            { css: 'sfx-sigil sfx-sigil-arcane', ms: 700 },
            { flash: { color: 'rgba(245,225,255,.85)', color2: 'rgba(160,90,255,.35)', size: 90, dur: 320 } },
            { p: 'rune', n: 5, motion: 'orbit', colors: ARCANE, glow: ['#a86bff'], size: [9, 13], dist: [34, 44], spin: 160, end: 0.4, dur: [600, 800], even: true },
            { p: 'mote', n: 8, motion: 'implode', colors: ARCANE, size: [5, 9], dist: [30, 60], dur: [380, 560] },
        ],
        trail: { every: 24, steps: [
            { p: 'mote', n: 1, motion: 'drift', colors: ['rgba(220,180,255,.85)', 'rgba(170,110,255,.75)'], size: [7, 12], dist: [3, 8], lift: [0, 6], end: 0.15, dur: [260, 460] },
            { p: 'star', n: 1, motion: 'pop', colors: ARCANE, size: [5, 9], dist: [4, 14], spin: 90, end: 0.1, dur: [300, 520] },
        ] },
        impact: [
            { flash: { color: 'rgba(250,235,255,.95)', color2: 'rgba(150,80,255,.45)', size: 140, dur: 360 } },
            { ring: { color: '#e2b8ff', glow: '#a86bff', size: 116, width: 2.5, dur: 520 } },
            { ring: { color: '#ffffff', glow: '#c792ff', size: 70, width: 1.5, dur: 420, delay: 60, dashed: true } },
            { p: 'star', n: 9, motion: 'burst', colors: ARCANE, size: [5, 10], dist: [28, 70], spin: 180, dur: [450, 750] },
            { p: 'rune', n: 4, motion: 'rise', colors: ARCANE, glow: ['#a86bff'], size: [10, 14], dist: [26, 50], spread: 22, dur: [600, 900] },
        ],
        tick: [
            { p: 'star', n: 5, motion: 'pop', colors: ARCANE, size: [5, 9], dist: [8, 26], spin: 120, dur: [380, 600] },
        ],
    },
    shadow: {
        cast: [
            { css: 'sfx-sigil sfx-sigil-shadow', ms: 700 },
            { flash: { color: 'rgba(200,150,255,.6)', color2: 'rgba(40,0,70,.45)', size: 90, dur: 360 } },
            { p: 'wisp', n: 6, motion: 'rise', colors: SHADOW, size: [8, 12], dist: [26, 56], spread: 14, dur: [500, 850] },
            { p: 'smoke', n: 4, motion: 'implode', colors: VOID, size: [16, 22], dist: [30, 50], dur: [420, 600], opacity: 0.8 },
        ],
        trail: { every: 26, steps: [
            { p: 'smoke', n: 1, motion: 'drift', colors: VOID, size: [12, 20], dist: [4, 10], lift: [-4, 6], end: 0.22, dur: [420, 700], opacity: 0.85 },
            { p: 'wisp', n: 1, motion: 'drift', colors: SHADOW, size: [5, 8], dist: [6, 14], lift: [4, 12], end: 0.15, dur: [380, 620] },
        ] },
        impact: [
            { flash: { color: 'rgba(225,190,255,.85)', color2: 'rgba(50,0,80,.55)', size: 150, dur: 420 } },
            { css: 'sfx-void-bloom', ms: 800 },
            { ring: { color: '#b071ff', glow: '#4a148c', size: 120, width: 3, dur: 560 } },
            { p: 'wisp', n: 9, motion: 'burst', colors: SHADOW, size: [7, 11], dist: [24, 64], dur: [500, 850] },
            { p: 'smoke', n: 6, motion: 'drift', colors: VOID, size: [18, 26], dist: [14, 34], lift: [10, 24], end: 0.2, dur: [700, 1000], opacity: 0.8 },
        ],
        tick: [
            { p: 'wisp', n: 4, motion: 'rise', colors: SHADOW, size: [6, 10], dist: [24, 46], spread: 18, dur: [500, 800], at: [50, 65] },
            { p: 'smoke', n: 2, motion: 'drift', colors: VOID, size: [14, 20], dist: [6, 14], lift: [10, 20], end: 0.2, dur: [600, 800] },
        ],
    },
    holy: {
        cast: [
            { css: 'sfx-sigil sfx-sigil-holy', ms: 700 },
            { flash: { color: 'rgba(255,255,240,.9)', color2: 'rgba(255,200,60,.35)', size: 100, dur: 340 } },
            { p: 'cross', n: 4, motion: 'rise', colors: HOLY, glow: ['#ffc93c'], size: [7, 10], dist: [28, 50], spread: 16, dur: [600, 900] },
            { p: 'mote', n: 8, motion: 'rise', colors: HOLY, size: [4, 7], dist: [30, 60], spread: 18, dur: [500, 800] },
        ],
        trail: { every: 26, steps: [
            { p: 'mote', n: 1, motion: 'drift', colors: ['rgba(255,250,210,.9)', 'rgba(255,215,90,.8)'], size: [8, 13], dist: [3, 8], end: 0.15, dur: [280, 480] },
        ] },
        impact: [
            { flash: { color: 'rgba(255,255,245,1)', color2: 'rgba(255,200,60,.5)', size: 150, dur: 380 } },
            { css: 'sfx-light-pillar', ms: 700 },
            { ring: { color: '#ffe58a', glow: '#ffb300', size: 120, width: 3, dur: 520 } },
            { p: 'mote', n: 12, motion: 'burst', colors: HOLY, size: [4, 8], dist: [30, 70], dur: [450, 750] },
            { p: 'cross', n: 3, motion: 'rise', colors: HOLY, glow: ['#ffc93c'], size: [7, 10], dist: [30, 50], spread: 20, dur: [600, 900] },
        ],
        tick: [
            { p: 'mote', n: 6, motion: 'rise', colors: HOLY, size: [3, 6], dist: [24, 46], spread: 18, dur: [450, 750] },
        ],
    },
    nature: {
        cast: [
            { css: 'sfx-sigil sfx-sigil-nature', ms: 700 },
            { p: 'leaf', n: 8, motion: 'orbit', colors: LEAF, glow: ['#2f6b1a'], size: [8, 12], dist: [30, 44], spin: 200, end: 0.5, dur: [600, 850], even: true },
            { p: 'mote', n: 6, motion: 'rise', colors: NATURE, size: [4, 7], dist: [24, 50], spread: 16, dur: [500, 800] },
        ],
        trail: { every: 30, steps: [
            { p: 'leaf', n: 1, motion: 'drift', colors: LEAF, glow: ['#2f6b1a'], size: [6, 9], dist: [8, 18], lift: [-6, 6], spin: 240, end: 0.4, dur: [450, 700] },
        ] },
        impact: [
            { flash: { color: 'rgba(240,255,220,.9)', color2: 'rgba(90,200,60,.4)', size: 140, dur: 360 } },
            { ring: { color: '#c8f59a', glow: '#4cb83a', size: 110, width: 2.5, dur: 520 } },
            { p: 'leaf', n: 12, motion: 'arc', colors: LEAF, glow: ['#2f6b1a'], size: [7, 11], dist: [30, 70], lift: [14, 30], grav: [10, 26], spin: 360, dur: [600, 950] },
            { p: 'mote', n: 8, motion: 'burst', colors: NATURE, size: [4, 7], dist: [20, 50], dur: [450, 700] },
        ],
        tick: [
            { p: 'leaf', n: 4, motion: 'fall', colors: LEAF, glow: ['#2f6b1a'], size: [6, 9], dist: [20, 40], spread: 22, spin: 200, dur: [600, 900] },
        ],
    },
    lightning: {
        cast: [
            { css: 'sfx-sigil sfx-sigil-lightning', ms: 600 },
            { flash: { color: 'rgba(240,250,255,.95)', color2: 'rgba(110,180,255,.4)', size: 90, dur: 260 } },
            { p: 'bolt', n: 6, motion: 'streak', colors: STORM, size: [5, 7], stretch: [3, 5], dist: [26, 50], dur: [180, 320] },
            { p: 'spark', n: 8, motion: 'streak', colors: VOLT, size: [2, 3], stretch: [4, 7], dist: [20, 46], dur: [200, 340] },
        ],
        trail: { every: 22, steps: [
            { p: 'spark', n: 2, motion: 'streak', colors: STORM, size: [2, 3], stretch: [3, 6], dist: [8, 20], dur: [140, 260] },
        ] },
        impact: [
            { flash: { color: 'rgba(255,255,255,1)', color2: 'rgba(120,190,255,.5)', size: 150, dur: 260 } },
            { ring: { color: '#e9f8ff', glow: '#6ec6ff', size: 110, width: 2, dur: 380 } },
            { p: 'bolt', n: 7, motion: 'streak', colors: STORM, size: [6, 8], stretch: [4, 6], dist: [30, 64], dur: [200, 360] },
            { p: 'spark', n: 12, motion: 'streak', colors: VOLT, size: [2, 3], stretch: [4, 8], dist: [30, 76], dur: [220, 420] },
            { p: 'mote', n: 4, motion: 'pop', colors: ['rgba(200,235,255,.9)'], size: [10, 16], dist: [10, 30], dur: [200, 360] },
        ],
        tick: [
            { p: 'spark', n: 6, motion: 'streak', colors: VOLT, size: [2, 3], stretch: [3, 6], dist: [16, 36], dur: [160, 300] },
            { p: 'bolt', n: 2, motion: 'streak', colors: STORM, size: [5, 6], stretch: [3, 4], dist: [18, 30], dur: [160, 260] },
        ],
    },
    blade: {
        cast: [
            { p: 'spark', n: 6, motion: 'streak', colors: STEEL, size: [2, 3], stretch: [5, 8], dist: [20, 40], dur: [180, 300] },
        ],
        trail: { every: 26, steps: [
            { p: 'spark', n: 1, motion: 'streak', colors: STEEL, size: [2, 3], stretch: [4, 7], dist: [10, 20], dur: [160, 280] },
        ] },
        impact: [
            { flash: { color: 'rgba(255,240,240,.6)', color2: 'rgba(255,90,90,.2)', size: 100, dur: 220 } },
            { css: 'sfx-slash', ms: 420 },
            { p: 'spark', n: 10, motion: 'streak', colors: STEEL, size: [2, 3], stretch: [5, 9], dist: [30, 70], dur: [220, 380] },
            { p: 'drop', n: 7, motion: 'arc', colors: BLOOD, size: [3, 6], dist: [24, 60], lift: [10, 26], grav: [20, 40], dur: [450, 750] },
        ],
        tick: [
            { p: 'drop', n: 4, motion: 'fall', colors: BLOOD, size: [3, 5], dist: [-24, -10], spread: 16, dur: [400, 650], at: [50, 45] },
        ],
    },
    arrow: {
        cast: [
            { p: 'spark', n: 5, motion: 'streak', colors: ['#ffffff', '#eaf5d0'], size: [1.5, 2.5], stretch: [6, 10], dist: [20, 40], dur: [160, 260], angle: [-30, 30] },
        ],
        trail: { every: 22, steps: [
            { p: 'mote', n: 1, motion: 'drift', colors: ['rgba(240,250,220,.55)'], size: [5, 8], dist: [2, 6], end: 0.15, dur: [200, 340] },
        ] },
        impact: [
            { flash: { color: 'rgba(255,255,240,.85)', color2: 'rgba(160,220,100,.3)', size: 110, dur: 260 } },
            { p: 'ash', n: 8, motion: 'arc', colors: WOOD, size: [2, 4], dist: [20, 50], lift: [10, 24], grav: [16, 30], spin: 400, dur: [450, 700] },
            { p: 'spark', n: 6, motion: 'streak', colors: ['#ffffff', '#f3ffd8'], size: [1.5, 2.5], stretch: [5, 8], dist: [24, 50], dur: [180, 320] },
            { p: 'smoke', n: 3, motion: 'drift', colors: ['rgba(200,190,160,.5)'], size: [12, 18], dist: [10, 20], lift: [8, 16], end: 0.2, dur: [500, 700] },
        ],
        tick: [
            { p: 'drop', n: 4, motion: 'fall', colors: POISON, size: [3, 5], dist: [-22, -8], spread: 16, dur: [400, 650], at: [50, 45] },
        ],
    },
};


//------------------------------------------------------------------------
//---------------------------PER-SPELL SIGNATURES-------------------------
//------------------------------------------------------------------------
// flight: { arc, scaleTo, every } tune the kit flight of that spell.
// noTrail / noCast switch a school default off for one spell.

export const SPELL_FX = {

    // ── FIRE ──────────────────────────────────────────────────────────
    // Fireball: a roaring comet that bursts into a billowing fireball.
    usp_fireball: {
        flight: { scaleTo: 1.55 },
        trail: { every: 16, steps: [
            { p: 'ember', n: 2, motion: 'drift', colors: FIRE, size: [4, 8], dist: [6, 18], lift: [4, 14], end: 0.15, dur: [300, 520], spread: 5 },
            { p: 'puff', n: 1, motion: 'billow', colors: PUFF_C, glow: PUFF_G, size: [12, 18], dist: [2, 6], lift: [2, 8], end: 0.4, dur: [220, 360], opacity: 0.8 },
            { p: 'smoke', n: 1, motion: 'drift', colors: SMOKE, size: [10, 16], dist: [4, 10], lift: [12, 22], end: 0.26, dur: [550, 850], opacity: 0.5 },
        ] },
        impact: [
            { flash: { color: 'rgba(255,250,225,1)', color2: 'rgba(255,120,20,.5)', size: 190, dur: 380 } },
            { p: 'puff', n: 11, motion: 'billow', colors: PUFF_C, glow: PUFF_G, size: [30, 50], dist: [8, 36], angle: [-200, 20], lift: [10, 30], end: 1.6, dur: [420, 640], opacity: 1 },
            { css: 'sfx-fire-core', ms: 420 },
            { ring: { color: '#ffc04d', glow: '#ff6a00', size: 150, width: 3, dur: 560, squash: 0.55, at: [50, 78] } },
            { p: 'ember', n: 24, motion: 'arc', colors: FIRE, size: [4, 8], dist: [40, 110], lift: [20, 50], grav: [10, 34], dur: [550, 950] },
            { p: 'spark', n: 10, motion: 'streak', colors: FIRE_HOT, size: [2, 3], stretch: [6, 9], dist: [46, 90], dur: [260, 440] },
            { p: 'smoke', n: 7, motion: 'billow', colors: SMOKE_DARK, size: [22, 32], dist: [10, 30], angle: [-160, -20], lift: [34, 56], end: 1.7, dur: [850, 1200], opacity: 0.7, delay: [160, 260] },
            { css: 'sfx-scorch', ms: 1300 },
            { shake: 1 },
        ],
    },
    // Magma Shot: a molten boulder dripping lava; lands in a heavy lava
    // splash that leaves a glowing pool and flying slag.
    usp_pyroblast: {
        flight: { scaleTo: 2.2, arc: -26 },
        trail: { every: 20, steps: [
            { p: 'drop', n: 1, motion: 'arc', colors: MAGMA, glow: ['#ff5a00'], size: [4, 7], dist: [4, 14], lift: [-6, 2], grav: [26, 46], dur: [420, 640] },
            { p: 'ember', n: 2, motion: 'drift', colors: FIRE, size: [3, 6], dist: [6, 16], lift: [6, 16], end: 0.15, dur: [320, 520], spread: 6 },
            { p: 'smoke', n: 1, motion: 'billow', colors: SMOKE_DARK, size: [14, 22], dist: [4, 10], lift: [14, 26], end: 1.6, dur: [700, 1000], opacity: 0.6 },
        ] },
        impact: [
            { flash: { color: 'rgba(255,245,210,1)', color2: 'rgba(255,90,0,.55)', size: 220, dur: 420 } },
            { css: 'sfx-magma-pool', ms: 1700 },
            { p: 'puff', n: 10, motion: 'billow', colors: PUFF_C, glow: PUFF_G, size: [40, 62], dist: [10, 40], lift: [6, 18], end: 1.5, dur: [480, 700], opacity: 0.95 },
            { css: 'sfx-fire-core', ms: 480 },
            { ring: { color: '#ff9a1f', glow: '#d6300c', size: 200, width: 5, dur: 650, squash: 0.4, at: [50, 82] } },
            { ring: { color: '#ffd25a', glow: '#ff5a00', size: 150, width: 2, dur: 520, squash: 0.4, at: [50, 82], delay: 90 } },
            { p: 'drop', n: 16, motion: 'arc', colors: MAGMA, glow: ['#ff5a00'], size: [5, 10], dist: [40, 110], lift: [30, 70], grav: [20, 50], dur: [650, 1000] },
            { p: 'rock', n: 8, motion: 'arc', colors: ['#000'], glow: ['#ff6a00'], size: [5, 9], dist: [40, 100], lift: [30, 60], grav: [20, 46], spin: 540, dur: [650, 950] },
            { p: 'smoke', n: 7, motion: 'billow', colors: SMOKE_DARK, size: [26, 38], dist: [10, 34], lift: [36, 60], end: 1.7, dur: [900, 1300], opacity: 0.6, delay: [160, 280] },
            { shake: 3 },
        ],
    },
    // Blazing Column: erupts from under the victim (pillar + extras live in
    // universal-spell-fx.js); the recipe adds the ground ring and sparks.
    usp_flamestrike: {
        impact: [
            { ring: { color: '#ffd25a', glow: '#ff5a1f', size: 170, width: 3, dur: 700, squash: 0.32, at: [50, 92] } },
            { p: 'spark', n: 12, motion: 'streak', colors: FIRE_HOT, size: [2, 3], stretch: [6, 10], dist: [40, 90], angle: [-160, -20], dur: [300, 500] },
            { p: 'smoke', n: 4, motion: 'billow', colors: SMOKE, size: [24, 34], dist: [6, 16], lift: [70, 110], end: 1.6, dur: [900, 1200], opacity: 0.5, delay: [300, 450] },
            { shake: 2 },
        ],
    },
    // Scorching Brand: the brand sigil is built in universal-spell-fx.js;
    // each burn tick licks flames up and sheds ash.
    usp_immolate: {
        impact: [
            { p: 'ember', n: 12, motion: 'arc', colors: FIRE, size: [3, 6], dist: [24, 60], lift: [14, 30], grav: [8, 20], dur: [500, 800] },
        ],
        tick: [
            { css: 'sfx-lick', ms: 650 },
            { css: 'sfx-lick sfx-lick-l', ms: 650, delay: 60 },
            { css: 'sfx-lick sfx-lick-r', ms: 650, delay: 120 },
            { p: 'ember', n: 7, motion: 'rise', colors: FIRE, size: [2, 5], dist: [30, 60], dur: [450, 750], spread: 20, at: [50, 75] },
            { p: 'ash', n: 4, motion: 'rise', colors: ['#3a2a24', '#5a4036'], size: [2, 4], dist: [30, 50], spin: 300, dur: [700, 1000], spread: 18, at: [50, 60] },
        ],
    },
    // Meteor: the fall and the blast are bespoke; the recipe adds slag,
    // a rolling dust cloud and the big quake.
    usp_meteor: {
        impact: [
            { p: 'rock', n: 10, motion: 'arc', colors: ['#000'], glow: ['#ff6a00'], size: [6, 12], dist: [50, 140], lift: [40, 90], grav: [20, 50], spin: 600, dur: [700, 1100] },
            { p: 'smoke', n: 8, motion: 'billow', colors: SMOKE, size: [30, 44], dist: [40, 90], angle: [150, 390], lift: [0, 10], end: 1.6, dur: [900, 1300], opacity: 0.55, at: [50, 90] },
            { shake: 5 },
        ],
    },
    // Ember Shower: a dense downpour of burning embers inside the circle,
    // splashing sparks where they land.
    usp_rain_of_fire: {
        zone: { every: 160, steps: [
            { p: 'ember', n: 4, motion: 'fall', colors: FIRE_HOT, glow: ['#ff6a00'], size: [4, 7], dist: [80, 140], sway: [0, 8], atX: [6, 94], atY: [55, 100], dur: [380, 520] },
            { p: 'spark', n: 9, motion: 'streak', colors: FIRE_HOT, glow: ['#ff6a00'], size: [3, 4], stretch: [6, 9], dist: [120, 170], angle: [96, 104], atX: [4, 96], at: [50, -10], dur: [380, 520] },
            { p: 'ember', n: 4, motion: 'pop', colors: FIRE, size: [5, 9], dist: [0, 6], atX: [8, 92], atY: [40, 92], dur: [260, 420] },
        ] },
        tick: [
            { p: 'spark', n: 6, motion: 'streak', colors: FIRE_HOT, size: [3, 4], stretch: [6, 10], dist: [60, 90], angle: [80, 100], at: [50, -30], spread: 26, dur: [260, 380] },
            { flash: { color: 'rgba(255,220,140,.8)', color2: 'rgba(255,90,0,.3)', size: 90, dur: 300, at: [50, 80], delay: 200 } },
            { p: 'ember', n: 8, motion: 'arc', colors: FIRE, size: [2, 5], dist: [16, 40], lift: [10, 24], grav: [6, 14], dur: [400, 650], at: [50, 80], delay: 200 },
        ],
    },
    // Solar Scorch: a small sun ignites above the victim and stabs down a
    // ray of sunfire; the burn flickers gold.
    usp_holy_fire: {
        impact: [
            { css: 'sfx-sun-disc', ms: 900 },
            { css: 'sfx-sun-ray', ms: 600, delay: 120 },
            { flash: { color: 'rgba(255,255,235,1)', color2: 'rgba(255,170,30,.5)', size: 170, dur: 420, delay: 120 } },
            { ring: { color: '#fff1b0', glow: '#ffa41a', size: 140, width: 3, dur: 560, delay: 140 } },
            { p: 'mote', n: 12, motion: 'burst', colors: SUN, size: [4, 8], dist: [30, 70], dur: [450, 750], delay: 140 },
            { p: 'ember', n: 10, motion: 'rise', colors: SUN, size: [3, 5], dist: [40, 70], spread: 20, dur: [600, 900], delay: 200 },
        ],
        tick: [
            { css: 'sfx-lick sfx-lick-gold', ms: 650 },
            { p: 'mote', n: 6, motion: 'rise', colors: SUN, size: [3, 6], dist: [26, 50], spread: 18, dur: [500, 800], at: [50, 70] },
        ],
    },
    // Inferno Swirl: the bespoke fire tornado plus a ring of fire on the
    // ground and embers whipped round the funnel.
    usp_firestorm: {
        zone: { every: 300, steps: [
            { p: 'ember', n: 6, motion: 'orbit', colors: FIRE, size: [3, 6], dist: [40, 80], spin: 300, end: 0.4, dur: [700, 1000] },
            { p: 'smoke', n: 1, motion: 'billow', colors: SMOKE, size: [26, 36], dist: [10, 30], angle: [-120, -60], lift: [40, 70], end: 1.6, dur: [900, 1200], opacity: 0.45 },
        ] },
        tick: [
            { p: 'ember', n: 8, motion: 'orbit', colors: FIRE, size: [3, 5], dist: [30, 50], spin: 360, end: 0.3, dur: [500, 750] },
            { css: 'sfx-lick', ms: 650 },
        ],
    },
    // Pyre Blast: the charged ring is bespoke; at detonation every victim
    // erupts in a towering blast.
    usp_flameblast: {
        impact: [
            { flash: { color: 'rgba(255,250,225,1)', color2: 'rgba(255,100,10,.55)', size: 230, dur: 420 } },
            { p: 'puff', n: 12, motion: 'billow', colors: PUFF_C, glow: PUFF_G, size: [40, 64], dist: [10, 50], angle: [-170, -10], lift: [20, 50], end: 1.5, dur: [500, 760], opacity: 0.95 },
            { css: 'sfx-fire-core', ms: 480 },
            { p: 'ember', n: 24, motion: 'arc', colors: FIRE, size: [3, 7], dist: [40, 110], lift: [30, 70], grav: [10, 30], dur: [600, 1000] },
            { p: 'smoke', n: 6, motion: 'billow', colors: SMOKE, size: [28, 40], dist: [10, 30], lift: [50, 80], end: 1.6, dur: [900, 1300], opacity: 0.55, delay: [200, 300] },
            { css: 'sfx-scorch', ms: 1300 },
            { shake: 3 },
        ],
    },
    // Fire Torrent: the flamethrower cone is bespoke; every wave scorches
    // the victim with a gout of flame and sparks.
    usp_incinerate: {
        impact: [
            { p: 'puff', n: 5, motion: 'billow', colors: PUFF_C, glow: PUFF_G, size: [24, 36], dist: [10, 30], lift: [6, 14], end: 1.4, dur: [350, 520], opacity: 0.85 },
            { p: 'spark', n: 8, motion: 'streak', colors: FIRE_HOT, size: [2, 3], stretch: [5, 8], dist: [30, 60], angle: [-60, 60], dur: [200, 340] },
            { p: 'smoke', n: 2, motion: 'billow', colors: SMOKE, size: [20, 28], dist: [6, 16], lift: [24, 40], end: 1.5, dur: [700, 900], opacity: 0.45 },
        ],
    },
    // Reprisal Flame: the hero flares up in a ring of punishing fire.
    usp_retribution: {
        cast: [
            { css: 'sfx-sigil sfx-sigil-fire', ms: 650 },
            { ring: { color: '#ffb347', glow: '#ff5a1f', size: 180, width: 4, dur: 600, squash: 0.45, at: [50, 50] } },
            { p: 'puff', n: 10, motion: 'billow', colors: PUFF_C, glow: PUFF_G, size: [22, 32], dist: [24, 50], lift: [4, 12], end: 1.2, dur: [380, 560], opacity: 0.85 },
            { p: 'ember', n: 14, motion: 'rise', colors: FIRE, size: [2, 5], dist: [40, 80], spread: 24, dur: [600, 900] },
        ],
    },
    // Thaw: warm light melts the ice off the hero in hissing steam.
    usp_thaw: {
        cast: [
            { css: 'sfx-sigil sfx-sigil-fire', ms: 650 },
            { flash: { color: 'rgba(255,240,200,.9)', color2: 'rgba(255,150,60,.35)', size: 130, dur: 420 } },
            { p: 'shard', n: 10, motion: 'arc', colors: ICE, glow: ['#5cc4ff'], size: [4, 7], dist: [30, 60], lift: [10, 24], grav: [20, 40], spin: 300, dur: [500, 800] },
            { p: 'smoke', n: 8, motion: 'billow', colors: STEAM, size: [18, 28], dist: [10, 30], lift: [30, 60], end: 1.5, dur: [700, 1000], opacity: 0.7 },
            { p: 'ember', n: 8, motion: 'rise', colors: FIRE, size: [2, 4], dist: [30, 60], spread: 20, dur: [500, 800] },
        ],
    },

    // ── FROST ─────────────────────────────────────────────────────────
    // Frost Shard: a glittering shard that bursts into a star of ice.
    usp_frostbolt: {
        impact: [
            { flash: { color: 'rgba(255,255,255,.95)', color2: 'rgba(110,200,255,.45)', size: 130, dur: 320 } },
            { css: 'sfx-ice-burst', ms: 700 },
            { ring: { color: '#d8f3ff', glow: '#5cc4ff', size: 120, width: 2.5, dur: 480 } },
            { p: 'shard', n: 14, motion: 'arc', colors: ICE, glow: ['#3da9ff'], size: [4, 8], dist: [34, 84], lift: [10, 30], grav: [14, 34], spin: [180, 480], dur: [480, 800] },
            { p: 'flake', n: 6, motion: 'burst', colors: ICE, glow: ['#7fd9ff'], size: [6, 10], dist: [20, 54], spin: 200, dur: [600, 900] },
            { p: 'smoke', n: 4, motion: 'billow', colors: FROST_MIST, size: [20, 30], dist: [8, 24], lift: [4, 12], end: 1.5, dur: [600, 900], opacity: 0.7 },
            { css: 'sfx-rime', ms: 900 },
        ],
    },
    // Rime Needle: the fastest spell - a white needle drawing a razor
    // streak; it pierces clean through with a spray of frost.
    usp_ice_lance: {
        trail: { every: 12, steps: [
            { p: 'mote', n: 1, motion: 'drift', colors: ['rgba(235,250,255,.95)', 'rgba(170,225,255,.8)'], size: [6, 10], dist: [1, 4], end: 0.12, dur: [200, 320] },
            { p: 'flake', n: 1, motion: 'pop', colors: ICE, glow: ['#7fd9ff'], size: [3, 5], dist: [3, 10], spin: 180, end: 0.1, dur: [260, 420] },
        ] },
        impact: [
            { flash: { color: 'rgba(255,255,255,1)', color2: 'rgba(130,210,255,.4)', size: 110, dur: 240 } },
            { css: 'sfx-pierce sfx-pierce-ice', ms: 380 },
            { p: 'shard', n: 12, motion: 'streak', colors: ICE, glow: ['#5cc4ff'], size: [3, 5], stretch: [2, 3], dist: [40, 90], angle: [-40, 40], dur: [260, 420] },
            { p: 'flake', n: 5, motion: 'burst', colors: ICE, glow: ['#7fd9ff'], size: [5, 8], dist: [14, 40], spin: 200, dur: [500, 800] },
            { css: 'sfx-rime sfx-rime-soft', ms: 700 },
        ],
    },
    // Hoarfrost Javelin: a huge lance of ice that impales the victim and
    // splits the ground into a cluster of ice spikes.
    usp_ice_spear: {
        flight: { scaleTo: 2.0 },
        trail: { every: 16, steps: [
            { p: 'smoke', n: 1, motion: 'billow', colors: FROST_MIST, size: [14, 22], dist: [3, 8], lift: [0, 6], end: 1.4, dur: [400, 650], opacity: 0.75 },
            { p: 'flake', n: 1, motion: 'drift', colors: ICE, glow: ['#7fd9ff'], size: [5, 8], dist: [8, 20], lift: [-6, 6], spin: 240, end: 0.2, dur: [450, 700] },
            { p: 'shard', n: 1, motion: 'arc', colors: ICE, glow: ['#3da9ff'], size: [3, 5], dist: [6, 14], lift: [-4, 4], grav: [20, 34], spin: 300, dur: [400, 600] },
        ] },
        impact: [
            { flash: { color: 'rgba(255,255,255,1)', color2: 'rgba(90,190,255,.5)', size: 200, dur: 380 } },
            { css: 'sfx-ice-spikes', ms: 1300 },
            { css: 'sfx-ice-burst sfx-ice-burst-big', ms: 800 },
            { ring: { color: '#e3f6ff', glow: '#2a8fe0', size: 190, width: 4, dur: 620, squash: 0.4, at: [50, 84] } },
            { p: 'shard', n: 20, motion: 'arc', colors: ICE, glow: ['#2a8fe0'], size: [5, 10], dist: [40, 110], lift: [20, 50], grav: [20, 40], spin: [240, 600], dur: [600, 950] },
            { p: 'smoke', n: 6, motion: 'billow', colors: FROST_MIST, size: [26, 40], dist: [20, 50], angle: [150, 390], lift: [0, 8], end: 1.6, dur: [800, 1100], opacity: 0.7, at: [50, 86] },
            { css: 'sfx-rime', ms: 1000 },
            { shake: 2 },
        ],
    },
    // Chill Wave: each pulse rolls over the victim as a ring of frost.
    usp_freezing_pulse: {
        impact: [
            { ring: { color: '#e3f6ff', glow: '#5cc4ff', size: 150, width: 5, dur: 600, fill: 'rgba(150,215,255,.12)' } },
            { ring: { color: '#9fe0ff', glow: '#2a8fe0', size: 110, width: 2, dur: 520, delay: 90 } },
            { p: 'flake', n: 10, motion: 'burst', colors: ICE, glow: ['#7fd9ff'], size: [5, 9], dist: [30, 70], spin: 260, dur: [500, 800], even: true },
            { p: 'smoke', n: 4, motion: 'billow', colors: FROST_MIST, size: [20, 30], dist: [10, 30], lift: [0, 8], end: 1.5, dur: [600, 900], opacity: 0.65 },
            { css: 'sfx-rime sfx-rime-soft', ms: 700 },
        ],
    },
    // Glacial Crack: absolute cold - the ground splits in glowing cracks
    // and ice spikes burst up around every victim.
    usp_cold_snap: {
        cast: [
            { css: 'sfx-sigil sfx-sigil-frost', ms: 650 },
            { ring: { color: '#e3f6ff', glow: '#3da9ff', size: 240, width: 4, dur: 700, squash: 0.45 } },
            { p: 'flake', n: 12, motion: 'burst', colors: ICE, glow: ['#7fd9ff'], size: [6, 10], dist: [40, 100], spin: 260, dur: [600, 900], even: true },
        ],
        impact: [
            { flash: { color: 'rgba(255,255,255,1)', color2: 'rgba(110,200,255,.5)', size: 170, dur: 340 } },
            { css: 'sfx-cracks', ms: 1100 },
            { css: 'sfx-ice-spikes', ms: 1200, delay: 60 },
            { p: 'shard', n: 14, motion: 'arc', colors: ICE, glow: ['#2a8fe0'], size: [4, 8], dist: [30, 80], angle: [-170, -10], lift: [20, 50], grav: [20, 40], spin: 400, dur: [550, 850] },
            { p: 'smoke', n: 5, motion: 'billow', colors: FROST_MIST, size: [22, 34], dist: [14, 40], angle: [150, 390], lift: [0, 6], end: 1.6, dur: [700, 1000], opacity: 0.7, at: [50, 86] },
            { shake: 2 },
        ],
    },
    // Glacial Breath: a freezing gale pours down the cone in mist and
    // streaking frost.
    usp_cone_of_cold: {
        zoneBurst: [
            { p: 'smoke', n: 14, motion: 'billow', colors: FROST_MIST, size: [26, 44], dist: [30, 90], angle: [-8, 8], lift: [0, 4], end: 1.6, dur: [420, 640], opacity: 0.75, atX: [0, 40], atY: [35, 65] },
            { p: 'spark', n: 16, motion: 'streak', colors: ICE, glow: ['#7fd9ff'], size: [2, 3], stretch: [8, 14], dist: [120, 240], angle: [-6, 6], atX: [0, 20], atY: [30, 70], dur: [300, 460] },
            { p: 'flake', n: 12, motion: 'burst', colors: ICE, glow: ['#7fd9ff'], size: [5, 9], dist: [80, 200], angle: [-10, 10], spin: 300, atX: [0, 30], atY: [25, 75], dur: [400, 650] },
        ],
    },
    // Whiteout: a howling snowstorm - drifting snow, mist and gusts that
    // swirl through the circle for the whole duration.
    usp_blizzard: {
        zone: { every: 240, steps: [
            { p: 'flake', n: 5, motion: 'fall', colors: ICE, glow: ['#7fd9ff'], size: [5, 9], dist: [60, 120], sway: [30, 60], spin: 300, atX: [0, 100], atY: [30, 100], dur: [600, 900] },
            { p: 'smoke', n: 2, motion: 'billow', colors: FROST_MIST, size: [34, 54], dist: [30, 60], angle: [-20, 20], lift: [0, 6], end: 1.6, atX: [0, 70], atY: [20, 90], dur: [800, 1100], opacity: 0.55 },
        ] },
        tick: [
            { p: 'flake', n: 6, motion: 'fall', colors: ICE, glow: ['#7fd9ff'], size: [5, 8], dist: [30, 50], spread: 26, spin: 260, dur: [500, 800] },
            { css: 'sfx-rime sfx-rime-soft', ms: 700 },
        ],
    },
    // Frost Whirl: every pulse shatters ice spikes on the victims.
    usp_vortex: {
        impact: [
            { css: 'sfx-ice-burst', ms: 700 },
            { p: 'shard', n: 10, motion: 'arc', colors: ICE, glow: ['#3da9ff'], size: [4, 7], dist: [26, 64], lift: [10, 26], grav: [14, 30], spin: 400, dur: [450, 750] },
            { p: 'flake', n: 6, motion: 'orbit', colors: ICE, glow: ['#7fd9ff'], size: [5, 8], dist: [30, 46], spin: 300, end: 0.3, dur: [500, 800] },
        ],
    },
    // Quench: a splash of cool water douses the flames in a hiss of steam.
    usp_quench: {
        cast: [
            { css: 'sfx-sigil sfx-sigil-frost', ms: 650 },
            { p: 'drop', n: 14, motion: 'arc', colors: WATER, glow: ['#2a8fe0'], size: [4, 7], dist: [26, 64], lift: [24, 50], grav: [20, 40], dur: [550, 850] },
            { p: 'bubble', n: 8, motion: 'rise', colors: ['#bfeaff'], glow: ['#5cc4ff'], size: [5, 10], dist: [30, 70], spread: 18, dur: [600, 1000] },
            { p: 'smoke', n: 8, motion: 'billow', colors: STEAM, size: [20, 30], dist: [10, 30], lift: [30, 60], end: 1.5, dur: [700, 1000], opacity: 0.7, delay: [100, 200] },
        ],
    },

    // ── ARCANE ────────────────────────────────────────────────────────
    // Arcane Darts: homing darts that weave in curving arcs and pop in
    // little rune bursts.
    usp_arcane_missiles: {
        flight: { arc: 46, scaleTo: 1.2 },
        trail: { every: 12, steps: [
            { p: 'mote', n: 2, motion: 'drift', colors: ['rgba(240,210,255,.95)', 'rgba(190,130,255,.9)'], size: [10, 16], dist: [2, 6], end: 0.12, dur: [280, 440] },
            { p: 'star', n: 1, motion: 'pop', colors: ARCANE, size: [6, 10], dist: [3, 12], spin: 90, end: 0.1, dur: [300, 480] },
        ] },
        impact: [
            { flash: { color: 'rgba(250,235,255,.95)', color2: 'rgba(150,80,255,.45)', size: 110, dur: 280 } },
            { ring: { color: '#e2b8ff', glow: '#a86bff', size: 90, width: 2, dur: 400 } },
            { p: 'star', n: 7, motion: 'burst', colors: ARCANE, size: [5, 9], dist: [24, 54], spin: 180, dur: [380, 600] },
            { p: 'rune', n: 2, motion: 'rise', colors: ARCANE, glow: ['#a86bff'], size: [10, 13], dist: [20, 40], spread: 18, dur: [500, 800] },
        ],
    },
    // Mana Burst: arcane force detonates around the hero in a wall of
    // runes; every victim cracks with arcane light.
    usp_arcane_explosion: {
        cast: [
            { css: 'sfx-sigil sfx-sigil-arcane', ms: 700 },
            { flash: { color: 'rgba(250,235,255,.95)', color2: 'rgba(150,80,255,.4)', size: 220, dur: 380 } },
            { ring: { color: '#f3d9ff', glow: '#a86bff', size: 380, width: 5, dur: 650, fill: 'rgba(170,110,255,.1)' } },
            { ring: { color: '#ffffff', glow: '#c792ff', size: 300, width: 2, dur: 560, delay: 80, dashed: true } },
            { p: 'rune', n: 10, motion: 'burst', colors: ARCANE, glow: ['#a86bff'], size: [12, 16], dist: [80, 160], dur: [500, 800], even: true },
            { p: 'star', n: 16, motion: 'burst', colors: ARCANE, size: [5, 10], dist: [60, 170], spin: 200, dur: [450, 750] },
            { shake: 2 },
        ],
        impact: [
            { flash: { color: 'rgba(250,235,255,.95)', color2: 'rgba(150,80,255,.45)', size: 140, dur: 340 } },
            { css: 'sfx-arcane-crack', ms: 650 },
            { p: 'star', n: 10, motion: 'burst', colors: ARCANE, size: [5, 10], dist: [28, 70], spin: 180, dur: [450, 750] },
            { p: 'rune', n: 3, motion: 'rise', colors: ARCANE, glow: ['#a86bff'], size: [10, 14], dist: [26, 50], spread: 22, dur: [600, 900] },
        ],
    },
    // Force Pulse: a lensing sphere of pure force; the victim is crushed
    // inward by collapsing rings before it detonates.
    usp_arcane_blast: {
        flight: { scaleTo: 1.9 },
        trail: { every: 34, steps: [
            { ring: { color: 'rgba(230,200,255,.8)', glow: '#a86bff', size: 34, width: 1.5, dur: 380, from: 0.3 } },
            { p: 'mote', n: 1, motion: 'drift', colors: ['rgba(220,180,255,.85)'], size: [10, 14], dist: [2, 6], end: 0.15, dur: [260, 420] },
        ] },
        impact: [
            { css: 'sfx-force-implode', ms: 520 },
            { flash: { color: 'rgba(255,255,255,1)', color2: 'rgba(150,80,255,.5)', size: 190, dur: 360, delay: 220 } },
            { ring: { color: '#f3d9ff', glow: '#7a3cff', size: 200, width: 4, dur: 600, delay: 230 } },
            { ring: { color: '#ffffff', glow: '#a86bff', size: 140, width: 2, dur: 480, delay: 290 } },
            { p: 'star', n: 14, motion: 'burst', colors: ARCANE, size: [5, 10], dist: [40, 100], spin: 200, dur: [450, 750], delay: 230 },
            { p: 'mote', n: 10, motion: 'implode', colors: ARCANE, size: [6, 10], dist: [50, 90], dur: [220, 300] },
            { shake: 2 },
        ],
    },
    // Unravel Beam: each pulse unravels the victim into drifting violet
    // ash and loose runes.
    usp_disintegrate: {
        impact: [
            { flash: { color: 'rgba(250,235,255,.9)', color2: 'rgba(150,80,255,.4)', size: 110, dur: 260 } },
            { p: 'ash', n: 14, motion: 'rise', colors: ARCANE_ASH, size: [2, 4], dist: [30, 70], spread: 22, spin: 360, dur: [600, 1000] },
            { p: 'rune', n: 3, motion: 'rise', colors: ARCANE, glow: ['#a86bff'], size: [9, 12], dist: [24, 50], spread: 20, dur: [500, 800] },
            { p: 'spark', n: 6, motion: 'streak', colors: ARCANE, size: [2, 3], stretch: [5, 8], dist: [20, 50], dur: [200, 340] },
        ],
    },
    // Star Shower: shooting stars crash down; the area twinkles while it
    // lasts.
    usp_starfall: {
        trail: { every: 14, steps: [
            { p: 'star', n: 1, motion: 'pop', colors: STARLIGHT, size: [5, 9], dist: [2, 10], spin: 120, end: 0.1, dur: [300, 500] },
            { p: 'mote', n: 1, motion: 'drift', colors: ['rgba(255,240,255,.9)', 'rgba(200,160,255,.8)'], size: [6, 10], dist: [2, 6], end: 0.12, dur: [260, 420] },
        ] },
        zone: { every: 200, steps: [
            { p: 'star', n: 3, motion: 'pop', colors: STARLIGHT, size: [5, 10], dist: [0, 4], spin: 120, atX: [5, 95], atY: [5, 95], dur: [400, 700] },
        ] },
        impact: [
            { flash: { color: 'rgba(255,255,255,1)', color2: 'rgba(190,140,255,.5)', size: 150, dur: 320 } },
            { css: 'sfx-star-burst', ms: 600 },
            { ring: { color: '#fff6ff', glow: '#c792ff', size: 130, width: 2.5, dur: 500, squash: 0.5, at: [50, 80] } },
            { p: 'star', n: 12, motion: 'arc', colors: STARLIGHT, size: [5, 10], dist: [30, 80], lift: [20, 40], grav: [10, 26], spin: 300, dur: [500, 800] },
        ],
    },
    // Barrier: a lattice of hex panels flashes into a shell around the hero.
    usp_barrier: {
        cast: [
            { css: 'sfx-sigil sfx-sigil-arcane', ms: 700 },
            { css: 'sfx-hex-shield', ms: 800 },
            { p: 'mote', n: 12, motion: 'implode', colors: ['#9fd8ff', '#c7e9ff', '#ffffff'], size: [5, 8], dist: [50, 80], dur: [380, 560] },
        ],
    },
    // Blink: the sigil flares as the hero is folded through space.
    usp_blink: {
        cast: [
            { flash: { color: 'rgba(245,225,255,.9)', color2: 'rgba(160,90,255,.4)', size: 110, dur: 280 } },
            { p: 'star', n: 10, motion: 'implode', colors: ARCANE, size: [5, 9], dist: [30, 60], dur: [260, 380] },
            { p: 'rune', n: 4, motion: 'burst', colors: ARCANE, glow: ['#a86bff'], size: [10, 13], dist: [30, 60], dur: [400, 600], even: true },
        ],
    },
    // Rift Anchor: a tear in space spins open at the hero.
    usp_rift_anchor: {
        cast: [
            { css: 'sfx-sigil sfx-sigil-arcane', ms: 700 },
            { css: 'sfx-rift', ms: 800 },
            { p: 'mote', n: 10, motion: 'orbit', colors: ARCANE, size: [5, 8], dist: [30, 44], spin: 360, end: 0.2, dur: [600, 800], even: true },
        ],
    },
    // Summon Reveal Cells: a scan of runes ripples out from the hero.
    usp_gauntlet_reveal: {
        cast: [
            { css: 'sfx-sigil sfx-sigil-arcane', ms: 700 },
            { ring: { color: '#e2b8ff', glow: '#a86bff', size: 160, width: 2, dur: 600, dashed: true } },
            { p: 'rune', n: 6, motion: 'burst', colors: ARCANE, glow: ['#a86bff'], size: [10, 14], dist: [40, 80], dur: [500, 800], even: true, glyphs: ['∑', '∫', 'π', 'Ω', '?', '✶'] },
        ],
    },

    // ── SHADOW ────────────────────────────────────────────────────────
    // Gloom Bolt: a smoking orb of darkness that blooms into a void.
    usp_shadow_bolt: {
        flight: { arc: 18 },
    },
    // Withering Curse: a sigil of decay brands the victim; each tick
    // drains its colour away in sinking motes.
    usp_corruption: {
        impact: [
            { css: 'sfx-curse-mark', ms: 1400 },
            { p: 'wisp', n: 8, motion: 'implode', colors: SHADOW, size: [7, 10], dist: [40, 70], dur: [400, 600] },
        ],
        tick: [
            { css: 'sfx-curse-mark sfx-curse-mark-soft', ms: 800 },
            { p: 'mote', n: 7, motion: 'fall', colors: WITHER, size: [4, 7], dist: [-34, -14], spread: 22, dur: [500, 800], at: [50, 30] },
            { p: 'smoke', n: 2, motion: 'billow', colors: VOID, size: [16, 22], dist: [6, 14], lift: [-10, 0], end: 1.4, dur: [600, 800], opacity: 0.6 },
        ],
    },
    // Torment: thorns of pain stab inward on every tick.
    usp_shadow_word_pain: {
        tick: [
            { p: 'blade', n: 8, motion: 'implode', colors: PAIN, size: [5, 7], stretch: [3, 4], dist: [40, 60], dur: [260, 360], even: true },
            { flash: { color: 'rgba(255,120,180,.7)', color2: 'rgba(90,0,60,.4)', size: 90, dur: 260, delay: 240 } },
            { p: 'wisp', n: 3, motion: 'rise', colors: SHADOW, size: [6, 9], dist: [20, 40], spread: 14, dur: [500, 700], delay: 240 },
        ],
    },
    // Ruin Bolt: a cataclysmic fel bolt that erupts in green-violet chaos.
    usp_chaos_bolt: {
        flight: { scaleTo: 2.3 },
        trail: { every: 18, steps: [
            { p: 'puff', n: 1, motion: 'billow', colors: FEL, glow: ['#5a1aa0', '#3b0a66'], size: [14, 22], dist: [3, 10], lift: [0, 8], end: 1.3, dur: [300, 480], opacity: 0.9 },
            { p: 'smoke', n: 1, motion: 'billow', colors: VOID, size: [16, 24], dist: [4, 12], lift: [6, 16], end: 1.5, dur: [500, 800], opacity: 0.8 },
            { p: 'ember', n: 1, motion: 'drift', colors: FEL, size: [3, 6], dist: [8, 20], lift: [4, 14], end: 0.15, dur: [300, 500] },
        ] },
        impact: [
            { flash: { color: 'rgba(235,255,200,1)', color2: 'rgba(110,30,180,.6)', size: 230, dur: 420 } },
            { p: 'puff', n: 12, motion: 'billow', colors: FEL, glow: ['#5a1aa0', '#3b0a66', '#7b2fd0'], size: [36, 58], dist: [10, 46], lift: [6, 20], end: 1.5, dur: [500, 760], opacity: 1 },
            { css: 'sfx-void-bloom', ms: 800, delay: 80 },
            { ring: { color: '#a8ff3c', glow: '#2c8a16', size: 210, width: 4, dur: 650 } },
            { ring: { color: '#b071ff', glow: '#4a148c', size: 160, width: 3, dur: 560, delay: 90 } },
            { p: 'ember', n: 22, motion: 'arc', colors: FEL, size: [3, 7], dist: [40, 110], lift: [20, 50], grav: [10, 30], dur: [550, 950] },
            { p: 'wisp', n: 10, motion: 'burst', colors: SHADOW, size: [8, 12], dist: [40, 100], dur: [550, 900] },
            { p: 'smoke', n: 7, motion: 'billow', colors: VOID, size: [26, 38], dist: [10, 34], lift: [30, 56], end: 1.7, dur: [900, 1300], opacity: 0.75, delay: [160, 260] },
            { tint: { color: 'rgba(90,20,140,.22)', dur: 380 } },
            { shake: 3 },
        ],
    },
    // Blighted Ground: shadow claws and smoke rise from the corrupted
    // earth for as long as it lasts.
    usp_consecration: {
        zone: { every: 280, steps: [
            { p: 'wisp', n: 3, motion: 'rise', colors: SHADOW, size: [8, 12], dist: [30, 70], atX: [5, 95], atY: [30, 95], dur: [700, 1000] },
            { p: 'smoke', n: 2, motion: 'billow', colors: VOID, size: [26, 40], dist: [6, 16], lift: [20, 40], end: 1.6, atX: [10, 90], atY: [40, 90], dur: [900, 1200], opacity: 0.7 },
        ] },
        tick: [
            { css: 'sfx-shadow-claw', ms: 600 },
            { p: 'wisp', n: 4, motion: 'rise', colors: SHADOW, size: [6, 10], dist: [24, 46], spread: 18, dur: [500, 800], at: [50, 80] },
        ],
    },
    // Plague Seed: a festering green miasma bubbling over the victims.
    usp_contagion: {
        impact: [
            { p: 'smoke', n: 8, motion: 'billow', colors: PLAGUE, size: [24, 38], dist: [10, 36], lift: [4, 14], end: 1.6, dur: [700, 1000], opacity: 0.85 },
            { p: 'bubble', n: 10, motion: 'rise', colors: ['#c6ff52'], glow: ['#3c9a1e'], size: [4, 9], dist: [24, 60], spread: 24, dur: [600, 1000] },
            { p: 'drop', n: 6, motion: 'arc', colors: POISON, glow: ['#3c9a1e'], size: [3, 6], dist: [20, 50], lift: [10, 24], grav: [16, 30], dur: [450, 700] },
        ],
        tick: [
            { p: 'bubble', n: 6, motion: 'rise', colors: ['#c6ff52'], glow: ['#3c9a1e'], size: [4, 8], dist: [20, 46], spread: 22, dur: [500, 800] },
            { p: 'smoke', n: 2, motion: 'billow', colors: PLAGUE, size: [18, 26], dist: [6, 16], lift: [8, 18], end: 1.4, dur: [600, 800], opacity: 0.7 },
        ],
    },
    // Dread Wave: the wave crashes into a black bloom; shrieking wraiths
    // scatter from it.
    usp_bane: {
        impact: [
            { flash: { color: 'rgba(200,150,255,.7)', color2: 'rgba(20,0,40,.6)', size: 190, dur: 420 } },
            { css: 'sfx-void-bloom', ms: 800 },
            { ring: { color: '#7b2fd0', glow: '#1a0628', size: 200, width: 6, dur: 700 } },
            { p: 'wisp', n: 12, motion: 'burst', colors: SHADOW, size: [9, 14], dist: [50, 110], dur: [600, 950] },
            { p: 'smoke', n: 8, motion: 'billow', colors: VOID, size: [26, 40], dist: [20, 50], lift: [0, 10], end: 1.6, dur: [800, 1100], opacity: 0.8 },
            { shake: 2 },
        ],
    },
    // Soul Shred: pale souls are torn out of the victim and stream to the
    // hero on every pulse.
    usp_soulrend: {
        impact: [
            { flash: { color: 'rgba(220,240,255,.7)', color2: 'rgba(60,20,90,.4)', size: 110, dur: 300 } },
            { p: 'wisp', n: 5, motion: 'burst', colors: SOUL, size: [8, 12], toHero: true, cone: 10, dur: [500, 700], delay: [0, 160] },
            { p: 'wisp', n: 6, motion: 'burst', colors: SHADOW, size: [6, 10], dist: [20, 50], dur: [400, 650] },
        ],
    },
    // Rot Cloud: dark rot oozes down the victims in thick drops.
    usp_blight: {
        tick: [
            { p: 'drop', n: 6, motion: 'fall', colors: ROT, glow: ['#2e3812'], size: [4, 7], dist: [-30, -12], spread: 22, dur: [500, 800], at: [50, 30] },
            { p: 'smoke', n: 3, motion: 'billow', colors: ROT_SMOKE, size: [18, 28], dist: [6, 16], lift: [6, 14], end: 1.5, dur: [700, 900], opacity: 0.75 },
            { p: 'ash', n: 5, motion: 'orbit', colors: ['#1a1a10', '#2e2e18'], size: [2, 3], dist: [24, 40], spin: 400, end: 0.6, dur: [600, 900] },
        ],
    },
    // Antidote: green bubbles rise and the poison is spat out in drops.
    usp_antidote: {
        cast: [
            { css: 'sfx-sigil sfx-sigil-nature', ms: 650 },
            { p: 'bubble', n: 12, motion: 'rise', colors: ['#c6ff52', '#e8ffb0'], glow: ['#3c9a1e'], size: [5, 10], dist: [30, 70], spread: 18, dur: [600, 1000] },
            { p: 'drop', n: 10, motion: 'arc', colors: POISON, glow: ['#2c6a12'], size: [3, 6], dist: [30, 60], lift: [14, 30], grav: [20, 40], dur: [500, 800] },
            { flash: { color: 'rgba(230,255,200,.85)', color2: 'rgba(90,200,60,.3)', size: 120, dur: 360 } },
        ],
    },
    // Shadow Dash: the hero bursts into smoke as the dash begins.
    usp_dash: {
        cast: [
            { p: 'smoke', n: 8, motion: 'billow', colors: VOID, size: [18, 28], dist: [10, 30], lift: [4, 12], end: 1.5, dur: [500, 750], opacity: 0.85 },
            { p: 'wisp', n: 6, motion: 'burst', colors: SHADOW, size: [6, 10], dist: [20, 46], dur: [400, 650] },
        ],
    },

    // ── LIGHTNING ─────────────────────────────────────────────────────
    // Lightning Bolt: a real forked bolt cracks from the hero to the
    // victim, which explodes in branching sparks.
    usp_lightning_bolt: {
        flight: { bolt: { color: '#8fd0ff', width: 3, ms: 260 } },
        impact: [
            { flash: { color: 'rgba(255,255,255,1)', color2: 'rgba(120,190,255,.55)', size: 170, dur: 260 } },
            { ring: { color: '#e9f8ff', glow: '#3d8bff', size: 130, width: 2.5, dur: 380 } },
            { p: 'bolt', n: 9, motion: 'streak', colors: STORM, size: [6, 9], stretch: [5, 7], dist: [40, 80], dur: [220, 380] },
            { p: 'spark', n: 14, motion: 'streak', colors: VOLT, size: [2, 3], stretch: [5, 9], dist: [36, 90], dur: [240, 440] },
            { tint: { color: 'rgba(170,215,255,.18)', dur: 220 } },
            { shake: 1 },
        ],
    },
    // Chain Lightning: jagged arcs leap card to card.
    usp_chain_lightning: {
        flight: { bolt: { color: '#8fd0ff', width: 3, ms: 240 } },
    },
    // Jolt Chain: thinner, faster arcs across many enemies.
    usp_arc: {
        flight: { bolt: { color: '#b7e4ff', width: 2.2, ms: 200, kinks: 7 } },
    },
    // Storm Smite: a thick bolt hammers down from the sky with a clap of
    // thunder.
    usp_smite: {
        flight: { bolt: { color: '#a9e4ff', width: 4.5, ms: 300, kinks: 11 } },
        impact: [
            { flash: { color: 'rgba(255,255,255,1)', color2: 'rgba(120,190,255,.55)', size: 200, dur: 300 } },
            { ring: { color: '#e9f8ff', glow: '#3d8bff', size: 190, width: 4, dur: 520, squash: 0.4, at: [50, 86] } },
            { p: 'bolt', n: 8, motion: 'streak', colors: STORM, size: [6, 9], stretch: [5, 7], dist: [40, 80], angle: [-180, 0], dur: [220, 380] },
            { p: 'rock', n: 6, motion: 'arc', colors: ['#000'], glow: ['#6ec6ff'], size: [3, 6], dist: [30, 70], lift: [20, 40], grav: [16, 30], spin: 400, dur: [500, 800], at: [50, 86] },
            { p: 'smoke', n: 4, motion: 'billow', colors: ['rgba(160,180,210,.55)'], size: [20, 30], dist: [20, 40], angle: [150, 390], lift: [0, 6], end: 1.5, dur: [600, 900], at: [50, 88] },
            { tint: { color: 'rgba(190,225,255,.25)', dur: 260 } },
            { shake: 2 },
        ],
    },
    // Thunder Mark: every marked enemy is split by a sky bolt at once.
    usp_storm_call: {
        flight: { bolt: { color: '#a9e4ff', width: 5, ms: 340, kinks: 12 } },
        impact: [
            { flash: { color: 'rgba(255,255,255,1)', color2: 'rgba(120,190,255,.6)', size: 220, dur: 320 } },
            { ring: { color: '#e9f8ff', glow: '#3d8bff', size: 210, width: 4, dur: 560, squash: 0.4, at: [50, 86] } },
            { p: 'bolt', n: 10, motion: 'streak', colors: STORM, size: [6, 9], stretch: [5, 7], dist: [40, 90], dur: [220, 400] },
            { p: 'spark', n: 14, motion: 'streak', colors: VOLT, size: [2, 3], stretch: [5, 9], dist: [40, 90], dur: [240, 440] },
            { tint: { color: 'rgba(190,225,255,.3)', dur: 300 } },
            { shake: 3 },
        ],
    },
    // Stray Sparks: crackling sparks zig-zag wildly into random enemies.
    usp_spark: {
        flight: { arc: 54 },
        trail: { every: 14, steps: [
            { p: 'spark', n: 2, motion: 'streak', colors: VOLT, size: [2, 3], stretch: [3, 6], dist: [8, 22], dur: [140, 260] },
        ] },
    },
    // Storm Sphere: a slow ball of lightning lashing arcs around itself;
    // it bursts in a big discharge.
    usp_ball_lightning: {
        flight: { scaleTo: 1.6 },
        trail: { every: 20, steps: [
            { p: 'bolt', n: 2, motion: 'streak', colors: STORM, size: [5, 7], stretch: [3, 5], dist: [16, 34], dur: [140, 240] },
            { p: 'mote', n: 1, motion: 'drift', colors: ['rgba(170,220,255,.8)'], size: [10, 16], dist: [2, 6], end: 0.15, dur: [260, 420] },
        ] },
        impact: [
            { flash: { color: 'rgba(255,255,255,1)', color2: 'rgba(110,180,255,.55)', size: 200, dur: 320 } },
            { ring: { color: '#e9f8ff', glow: '#3d8bff', size: 180, width: 4, dur: 520 } },
            { ring: { color: '#a9e4ff', glow: '#6ec6ff', size: 130, width: 2, dur: 440, delay: 80 } },
            { p: 'bolt', n: 12, motion: 'streak', colors: STORM, size: [6, 9], stretch: [5, 8], dist: [50, 100], dur: [240, 420], even: true },
            { p: 'spark', n: 16, motion: 'streak', colors: VOLT, size: [2, 3], stretch: [5, 9], dist: [40, 100], dur: [240, 440] },
            { tint: { color: 'rgba(170,215,255,.2)', dur: 260 } },
            { shake: 2 },
        ],
    },
    // Voltage Spear: forked arcs crackle up and down the whole lance.
    usp_crackling_lance: {
        zoneBurst: [
            { p: 'bolt', n: 14, motion: 'streak', colors: STORM, size: [6, 9], stretch: [4, 7], dist: [30, 70], angle: [-110, -70], atX: [5, 95], atY: [50, 50], dur: [200, 340] },
            { p: 'bolt', n: 14, motion: 'streak', colors: STORM, size: [6, 9], stretch: [4, 7], dist: [30, 70], angle: [70, 110], atX: [5, 95], atY: [50, 50], dur: [200, 340] },
            { p: 'spark', n: 20, motion: 'streak', colors: VOLT, size: [2, 3], stretch: [6, 10], dist: [60, 160], angle: [-4, 4], atX: [0, 30], atY: [40, 60], dur: [240, 400] },
        ],
    },
    // Surge Release: the hero erupts in a crackling nova; every victim is
    // struck by a discharge arc.
    usp_discharge: {
        cast: [
            { css: 'sfx-sigil sfx-sigil-lightning', ms: 600 },
            { flash: { color: 'rgba(255,255,255,.95)', color2: 'rgba(110,180,255,.45)', size: 200, dur: 300 } },
            { ring: { color: '#e9f8ff', glow: '#3d8bff', size: 340, width: 4, dur: 560 } },
            { p: 'bolt', n: 14, motion: 'streak', colors: STORM, size: [6, 9], stretch: [5, 8], dist: [60, 140], dur: [240, 420], even: true },
            { shake: 2 },
        ],
        flight: { bolt: { color: '#c58fff', width: 3, ms: 260 } },
    },
    // Storm Lash: a whip of green storm energy - leaves and sparks.
    usp_wrath: {
        flight: { arc: 22 },
        trail: { every: 20, steps: [
            { p: 'leaf', n: 1, motion: 'drift', colors: LEAF, glow: ['#2f6b1a'], size: [6, 9], dist: [8, 18], lift: [-6, 6], spin: 260, end: 0.4, dur: [400, 650] },
            { p: 'spark', n: 1, motion: 'streak', colors: ['#f4ffd0', '#c8f59a'], size: [2, 3], stretch: [3, 5], dist: [8, 18], dur: [160, 260] },
        ] },
        impact: [
            { flash: { color: 'rgba(245,255,225,.95)', color2: 'rgba(120,210,80,.45)', size: 150, dur: 300 } },
            { ring: { color: '#e8ffb0', glow: '#4cb83a', size: 130, width: 3, dur: 460 } },
            { p: 'leaf', n: 12, motion: 'arc', colors: LEAF, glow: ['#2f6b1a'], size: [7, 11], dist: [30, 80], lift: [14, 30], grav: [10, 26], spin: 400, dur: [600, 950] },
            { p: 'bolt', n: 6, motion: 'streak', colors: ['#ffffff', '#eaffc0', '#b5f07a'], size: [5, 7], stretch: [4, 6], dist: [30, 64], dur: [200, 340] },
        ],
    },
    // Verdant Bloom: leaves swirl up around the hero as the bloom opens.
    usp_renewal: {
        cast: [
            { css: 'sfx-sigil sfx-sigil-nature', ms: 700 },
            { p: 'leaf', n: 10, motion: 'orbit', colors: LEAF, glow: ['#2f6b1a'], size: [8, 12], dist: [34, 48], spin: 260, end: 0.4, dur: [700, 950], even: true },
            { p: 'petal', n: 8, motion: 'rise', colors: ['#ffd6ec', '#ffffff', '#ffb3d9'], glow: ['#e57fb0'], size: [6, 9], dist: [30, 60], spread: 18, spin: 300, dur: [700, 1000] },
            { p: 'mote', n: 8, motion: 'rise', colors: NATURE, size: [4, 7], dist: [30, 60], spread: 18, dur: [600, 900] },
        ],
    },
    // Windward: a spiral of wind and feathers wraps the hero.
    usp_windward: {
        cast: [
            { ring: { color: 'rgba(230,250,255,.8)', glow: '#bfe9ff', size: 150, width: 2, dur: 600, dashed: true } },
            { p: 'feather', n: 8, motion: 'orbit', colors: ['#ffffff', '#e8f6ff'], glow: ['#bfe9ff'], size: [12, 18], dist: [36, 50], spin: 300, end: 0.5, dur: [700, 950], even: true },
            { p: 'spark', n: 10, motion: 'streak', colors: ['rgba(255,255,255,.9)', 'rgba(210,240,255,.8)'], size: [1.5, 2.5], stretch: [8, 14], dist: [30, 60], dur: [260, 420] },
        ],
    },
    // Windstep: a gust bursts from the hero's feet.
    usp_windstep: {
        cast: [
            { p: 'feather', n: 7, motion: 'burst', colors: ['#ffffff', '#e8f6ff'], glow: ['#bfe9ff'], size: [12, 18], dist: [30, 70], spin: 200, dur: [600, 900], at: [50, 80] },
            { p: 'smoke', n: 6, motion: 'billow', colors: ['rgba(230,240,250,.6)'], size: [18, 26], dist: [20, 40], angle: [150, 390], lift: [0, 6], end: 1.5, dur: [500, 750], at: [50, 85] },
        ],
    },
    // Tempest Halo: each pulse zaps the victim with a crackle.
    usp_orb_of_storms: {
        flight: { bolt: { color: '#9fd8ff', width: 2.5, ms: 220 } },
    },

    // ── HOLY / SUPPORT ────────────────────────────────────────────────
    // Mend Wounds: warm light and rising crosses around the hearts.
    usp_mend_wounds: {
        cast: [
            { css: 'sfx-sigil sfx-sigil-holy', ms: 700 },
            { css: 'sfx-light-pillar sfx-light-pillar-hero', ms: 700 },
            { p: 'cross', n: 6, motion: 'rise', colors: ['#ffffff', '#d8ffe8', '#9ff0c0'], glow: ['#3fcf8e'], size: [8, 12], dist: [36, 70], spread: 20, dur: [700, 1000] },
            { p: 'mote', n: 10, motion: 'rise', colors: ['#ffffff', '#c8ffe0', '#fff6c8'], size: [4, 7], dist: [30, 70], spread: 22, dur: [600, 900] },
        ],
    },
    // Bulwark: shards of stone tear up from the ground around the hero.
    usp_bulwark: {
        cast: [
            { css: 'sfx-sigil sfx-sigil-holy', ms: 700 },
            { ring: { color: '#ffe58a', glow: '#b8860b', size: 180, width: 4, dur: 620, squash: 0.42, at: [50, 50] } },
            { p: 'rock', n: 10, motion: 'arc', colors: ['#000'], glow: ['#c9a227'], size: [5, 9], dist: [30, 60], angle: [-170, -10], lift: [30, 50], grav: [30, 50], spin: 300, dur: [600, 900], at: [50, 80] },
            { p: 'smoke', n: 6, motion: 'billow', colors: ['rgba(170,150,120,.6)'], size: [20, 30], dist: [20, 40], angle: [150, 390], lift: [0, 6], end: 1.5, dur: [600, 900], at: [50, 85] },
            { shake: 1 },
        ],
    },
    // Aegis Ward: golden glass panels flash and lock into a lattice.
    usp_aegis_ward: {
        cast: [
            { css: 'sfx-sigil sfx-sigil-holy', ms: 700 },
            { css: 'sfx-hex-shield sfx-hex-shield-gold', ms: 800 },
            { p: 'shard', n: 8, motion: 'implode', colors: HOLY, glow: ['#ffb300'], size: [5, 8], dist: [50, 80], spin: 200, dur: [380, 560] },
            { p: 'mote', n: 8, motion: 'rise', colors: HOLY, size: [4, 7], dist: [30, 60], spread: 20, dur: [600, 900] },
        ],
    },
    // Staunch: the bleeding is drawn out and sealed with a flash of light.
    usp_staunch: {
        cast: [
            { css: 'sfx-sigil sfx-sigil-holy', ms: 650 },
            { p: 'drop', n: 10, motion: 'implode', colors: BLOOD, glow: ['#8a0000'], size: [3, 6], dist: [30, 60], dur: [380, 520] },
            { flash: { color: 'rgba(255,255,240,.95)', color2: 'rgba(255,200,80,.35)', size: 120, dur: 360, delay: 360 } },
            { p: 'cross', n: 4, motion: 'rise', colors: HOLY, glow: ['#ffc93c'], size: [8, 11], dist: [30, 56], spread: 16, dur: [600, 900], delay: 360 },
        ],
    },
    // Purify: a shaft of light washes every ailment off the hero.
    usp_purify: {
        cast: [
            { css: 'sfx-sigil sfx-sigil-holy', ms: 700 },
            { css: 'sfx-light-pillar sfx-light-pillar-hero', ms: 700 },
            { p: 'mote', n: 14, motion: 'rise', colors: HOLY, size: [4, 8], dist: [40, 90], spread: 24, dur: [600, 1000] },
            { p: 'ash', n: 8, motion: 'burst', colors: ['#5a4a6a', '#3a3046'], size: [2, 4], dist: [30, 60], spin: 300, dur: [500, 800] },
        ],
    },

    // ── BLADE (melee + physical spells) ───────────────────────────────
    // Mighty Blow: a clean sword cut - steel sparks and a spray of blood.
    usp_heroic_strike: {
        swing: [
            { p: 'spark', n: 8, motion: 'streak', colors: STEEL, size: [2, 3], stretch: [6, 10], dist: [50, 90], angle: [-40, 40], dur: [200, 340] },
        ],
    },
    // Fatal Blow: the axe bites down - a heavy vertical cleave that cracks
    // the ground.
    usp_mortal_strike: {
        impact: [
            { css: 'sfx-slash sfx-slash-heavy', ms: 460, vars: { rot: '-78deg' } },
            { flash: { color: 'rgba(255,255,255,.95)', color2: 'rgba(255,70,70,.35)', size: 150, dur: 300 } },
            { css: 'sfx-cracks sfx-cracks-dust', ms: 900 },
            { p: 'spark', n: 12, motion: 'streak', colors: STEEL, size: [2, 3], stretch: [6, 10], dist: [40, 80], dur: [240, 400] },
            { p: 'drop', n: 10, motion: 'arc', colors: BLOOD, size: [3, 6], dist: [30, 70], lift: [16, 34], grav: [20, 40], dur: [500, 800] },
            { p: 'smoke', n: 4, motion: 'billow', colors: DUST, size: [18, 26], dist: [20, 40], angle: [150, 390], lift: [0, 6], end: 1.5, dur: [600, 850], at: [50, 88] },
            { shake: 2 },
        ],
    },
    // Whirlwind: a ring of cuts as the blades sweep past.
    usp_whirlwind: {
        impact: [
            { css: 'sfx-slash', ms: 420, vars: { rot: '12deg' } },
            { p: 'spark', n: 10, motion: 'streak', colors: STEEL, size: [2, 3], stretch: [5, 9], dist: [30, 70], dur: [220, 380] },
            { p: 'drop', n: 6, motion: 'arc', colors: BLOOD, size: [3, 5], dist: [24, 54], lift: [10, 24], grav: [20, 36], dur: [450, 700] },
        ],
    },
    // Gash: the spear rips the wound open; it keeps bleeding.
    usp_rend: {
        impact: [
            { css: 'sfx-pierce', ms: 380 },
            { css: 'sfx-slash', ms: 420, vars: { rot: '-10deg' } },
            { p: 'drop', n: 14, motion: 'arc', colors: BLOOD, size: [3, 6], dist: [30, 80], angle: [-60, 40], lift: [10, 24], grav: [20, 40], dur: [500, 800] },
        ],
        tick: [
            { p: 'drop', n: 5, motion: 'fall', colors: BLOOD, size: [3, 6], dist: [-30, -10], spread: 18, dur: [450, 700], at: [50, 40] },
            { css: 'sfx-blood-splat', ms: 700 },
        ],
    },
    // Finishing Blow: the executioner's greatsword - a blood-red X and a
    // crushing quake.
    usp_execute: {
        impact: [
            { css: 'sfx-slash sfx-slash-heavy sfx-slash-red', ms: 520, vars: { rot: '-40deg' } },
            { css: 'sfx-slash sfx-slash-heavy sfx-slash-red', ms: 520, delay: 90, vars: { rot: '40deg' } },
            { flash: { color: 'rgba(255,230,230,1)', color2: 'rgba(200,0,0,.5)', size: 200, dur: 380, delay: 60 } },
            { p: 'drop', n: 20, motion: 'arc', colors: BLOOD, size: [4, 8], dist: [40, 110], lift: [20, 50], grav: [20, 46], dur: [600, 950], delay: 60 },
            { p: 'spark', n: 12, motion: 'streak', colors: STEEL, size: [2, 3], stretch: [7, 11], dist: [50, 100], dur: [260, 420] },
            { tint: { color: 'rgba(160,0,0,.25)', dur: 380 } },
            { shake: 4 },
        ],
    },
    // Cleave: a broad arc of cuts across the front.
    usp_cleave: {
        impact: [
            { css: 'sfx-slash sfx-slash-wide', ms: 440, vars: { rot: '-8deg' } },
            { p: 'spark', n: 10, motion: 'streak', colors: STEEL, size: [2, 3], stretch: [6, 10], dist: [40, 80], angle: [-50, 50], dur: [220, 380] },
            { p: 'drop', n: 8, motion: 'arc', colors: BLOOD, size: [3, 6], dist: [24, 60], lift: [10, 24], grav: [20, 36], dur: [450, 750] },
            { shake: 1 },
        ],
    },
    // Crushing Blow: the hammer craters the ground and the victim sees
    // stars.
    usp_crushing_blow: {
        impact: [
            { flash: { color: 'rgba(255,255,255,.95)', color2: 'rgba(255,200,120,.35)', size: 160, dur: 300 } },
            { css: 'sfx-cracks sfx-cracks-dust', ms: 1000 },
            { ring: { color: '#e8d8b8', glow: '#8a6a40', size: 180, width: 4, dur: 560, squash: 0.4, at: [50, 86] } },
            { p: 'rock', n: 10, motion: 'arc', colors: ['#000'], glow: ['#6a5030'], size: [4, 8], dist: [30, 80], angle: [-170, -10], lift: [20, 50], grav: [20, 40], spin: 400, dur: [550, 850], at: [50, 86] },
            { p: 'smoke', n: 6, motion: 'billow', colors: DUST, size: [20, 30], dist: [20, 50], angle: [150, 390], lift: [0, 6], end: 1.5, dur: [700, 1000], at: [50, 88] },
            { p: 'star', n: 5, motion: 'orbit', colors: ['#fff6a0', '#ffd25a'], size: [8, 11], dist: [26, 32], spin: 540, end: 0.8, dur: [1100, 1400], at: [50, 10], even: true },
            { shake: 3 },
        ],
    },
    // Rapid Cuts: four slashes from four angles in a blur.
    usp_blade_flurry: {
        impact: [
            { css: 'sfx-slash', ms: 380, vars: { rot: '-30deg' } },
            { css: 'sfx-slash', ms: 380, delay: 70, vars: { rot: '25deg' } },
            { css: 'sfx-slash', ms: 380, delay: 140, vars: { rot: '-70deg' } },
            { css: 'sfx-slash', ms: 380, delay: 210, vars: { rot: '5deg' } },
            { p: 'spark', n: 12, motion: 'streak', colors: STEEL, size: [2, 3], stretch: [5, 9], dist: [30, 70], dur: [200, 340], delay: [0, 240] },
            { p: 'drop', n: 8, motion: 'arc', colors: BLOOD, size: [3, 5], dist: [20, 50], lift: [10, 24], grav: [16, 30], dur: [450, 700], delay: [0, 240] },
        ],
    },
    // Piercing Lunge: a razor thrust straight through the line.
    usp_piercing_lunge: {
        impact: [
            { css: 'sfx-pierce', ms: 380 },
            { p: 'spark', n: 8, motion: 'streak', colors: STEEL, size: [2, 3], stretch: [8, 12], dist: [50, 100], angle: [-12, 12], dur: [220, 360] },
            { p: 'drop', n: 8, motion: 'arc', colors: BLOOD, size: [3, 5], dist: [30, 70], angle: [-30, 30], lift: [6, 16], grav: [16, 30], dur: [450, 700] },
        ],
    },
    // Seismic Slam: the earth heaves - rocks, dust and a rolling quake.
    usp_seismic_slam: {
        impact: [
            { css: 'sfx-cracks sfx-cracks-dust', ms: 1000 },
            { ring: { color: '#e8d8b8', glow: '#8a6a40', size: 200, width: 5, dur: 600, squash: 0.4, at: [50, 86] } },
            { p: 'rock', n: 14, motion: 'arc', colors: ['#000'], glow: ['#5a4020'], size: [5, 10], dist: [30, 90], angle: [-170, -10], lift: [30, 60], grav: [20, 40], spin: 400, dur: [600, 950], at: [50, 86] },
            { p: 'smoke', n: 8, motion: 'billow', colors: DUST, size: [24, 36], dist: [20, 60], angle: [150, 390], lift: [0, 6], end: 1.6, dur: [800, 1100], at: [50, 88] },
            { shake: 3 },
        ],
    },
    // Vampiric Strike: blood is ripped from the wound and streams to the
    // hero.
    usp_vampiric_strike: {
        impact: [
            { css: 'sfx-slash sfx-slash-red', ms: 420, vars: { rot: '-24deg' } },
            { p: 'drop', n: 8, motion: 'arc', colors: BLOOD, size: [3, 6], dist: [24, 60], lift: [10, 24], grav: [16, 30], dur: [450, 700] },
            { p: 'drop', n: 7, motion: 'burst', colors: BLOOD, glow: ['#ff3b3b'], size: [4, 7], toHero: true, cone: 8, end: 0.6, dur: [500, 700], delay: [80, 260] },
        ],
    },
    // Counterstrike: a lightning-fast riposte - an X of light and a glint.
    usp_counterstrike: {
        impact: [
            { css: 'sfx-slash', ms: 360, vars: { rot: '-45deg' } },
            { css: 'sfx-slash', ms: 360, delay: 60, vars: { rot: '45deg' } },
            { p: 'star', n: 1, motion: 'pop', colors: ['#ffffff'], size: [36, 36], dist: [0, 0], spin: 90, end: 1.4, dur: [380, 380] },
            { p: 'spark', n: 12, motion: 'streak', colors: STEEL, size: [2, 3], stretch: [6, 10], dist: [40, 80], dur: [220, 360] },
            { p: 'star', n: 3, motion: 'orbit', colors: ['#fff6a0'], size: [7, 9], dist: [24, 28], spin: 400, end: 0.8, dur: [900, 1000], at: [50, 12], even: true },
            { shake: 2 },
        ],
    },
    // Dance of Blades: glittering cuts from every side.
    usp_blade_dance: {
        impact: [
            { css: 'sfx-slash', ms: 380, vars: { rot: '-50deg' } },
            { css: 'sfx-slash', ms: 380, delay: 120, vars: { rot: '20deg' } },
            { css: 'sfx-slash', ms: 380, delay: 240, vars: { rot: '80deg' } },
            { p: 'star', n: 8, motion: 'pop', colors: ['#ffffff', '#ffe8f6', '#d8e8ff'], size: [5, 9], dist: [10, 40], spin: 180, dur: [400, 700], delay: [0, 300] },
            { p: 'spark', n: 10, motion: 'streak', colors: STEEL, size: [2, 3], stretch: [5, 9], dist: [30, 60], dur: [200, 340], delay: [0, 300] },
        ],
    },
    // Guard Bash: the shield rim smashes in - sparks and a stun.
    usp_shield_slam: {
        impact: [
            { flash: { color: 'rgba(255,255,255,.95)', color2: 'rgba(200,220,255,.4)', size: 160, dur: 300 } },
            { ring: { color: '#ffffff', glow: '#9fb6d8', size: 150, width: 4, dur: 460 } },
            { p: 'spark', n: 16, motion: 'streak', colors: ['#ffffff', '#fff6c8', '#ffd25a'], size: [2, 3], stretch: [5, 9], dist: [40, 90], dur: [220, 380] },
            { p: 'star', n: 4, motion: 'orbit', colors: ['#fff6a0', '#ffd25a'], size: [8, 10], dist: [26, 30], spin: 540, end: 0.8, dur: [1200, 1400], at: [50, 10], even: true },
            { shake: 2 },
        ],
    },
    // Bastion Burst: a golden shockwave of the shield's might.
    usp_bastion_burst: {
        impact: [
            { flash: { color: 'rgba(255,255,240,1)', color2: 'rgba(255,190,40,.45)', size: 170, dur: 340 } },
            { ring: { color: '#ffe58a', glow: '#ffb300', size: 170, width: 4, dur: 560 } },
            { p: 'shard', n: 10, motion: 'arc', colors: HOLY, glow: ['#c98a00'], size: [4, 7], dist: [30, 70], lift: [14, 30], grav: [14, 30], spin: 300, dur: [500, 800] },
            { p: 'star', n: 3, motion: 'orbit', colors: ['#fff6a0'], size: [7, 9], dist: [24, 28], spin: 400, end: 0.8, dur: [1000, 1200], at: [50, 12], even: true },
            { shake: 2 },
        ],
    },
    // Phantom Strike: a ghostly afterimage cuts through in pale violet.
    usp_phantom_strike: {
        impact: [
            { css: 'sfx-slash sfx-slash-ghost', ms: 460, vars: { rot: '-20deg' } },
            { css: 'sfx-slash sfx-slash-ghost', ms: 460, delay: 80, vars: { rot: '-26deg' } },
            { p: 'wisp', n: 8, motion: 'burst', colors: ['#ffffff', '#e8dcff', '#b9a6ff'], size: [7, 11], dist: [30, 70], dur: [500, 800] },
            { p: 'spark', n: 8, motion: 'streak', colors: ['#ffffff', '#e8dcff'], size: [2, 3], stretch: [6, 10], dist: [40, 80], dur: [220, 360] },
        ],
    },
    // Flicker Slash: crescent cuts flashing out of nowhere.
    usp_flicker_slash: {
        impact: [
            { css: 'sfx-slash sfx-slash-ghost', ms: 380, vars: { rot: '30deg' } },
            { css: 'sfx-slash sfx-slash-ghost', ms: 380, delay: 100, vars: { rot: '-35deg' } },
            { p: 'spark', n: 10, motion: 'streak', colors: ['#ffffff', '#e8dcff'], size: [2, 3], stretch: [5, 9], dist: [30, 70], dur: [200, 340] },
        ],
    },
    // Blood Cascade: ribbons of blood are wrenched out and pour to the hero.
    usp_exsanguinate: {
        impact: [
            { flash: { color: 'rgba(255,200,200,.85)', color2: 'rgba(150,0,0,.5)', size: 150, dur: 340 } },
            { css: 'sfx-blood-splat', ms: 900 },
            { p: 'drop', n: 14, motion: 'burst', colors: BLOOD, glow: ['#ff3b3b'], size: [4, 8], toHero: true, cone: 12, end: 0.5, dur: [550, 800], delay: [0, 300] },
            { p: 'drop', n: 10, motion: 'arc', colors: BLOOD, size: [3, 6], dist: [24, 60], lift: [16, 34], grav: [16, 30], dur: [500, 800] },
        ],
    },
    // Spectral Scythe: the reaping arc tears out souls that drift to the
    // hero.
    usp_reap: {
        impact: [
            { css: 'sfx-slash sfx-slash-wide sfx-slash-ghost', ms: 480, vars: { rot: '-14deg' } },
            { p: 'wisp', n: 6, motion: 'burst', colors: SOUL, size: [8, 12], toHero: true, cone: 14, dur: [600, 900], delay: [100, 300] },
            { p: 'smoke', n: 4, motion: 'billow', colors: VOID, size: [18, 26], dist: [10, 30], lift: [4, 12], end: 1.4, dur: [600, 850], opacity: 0.6 },
        ],
    },
    // Spirit Daggers: spectral knives weaving in; each leaves a teal cut.
    usp_ethereal_knives: {
        flight: { arc: 24 },
        trail: { every: 18, steps: [
            { p: 'wisp', n: 1, motion: 'drift', colors: SPIRIT, size: [5, 8], dist: [4, 10], lift: [0, 6], end: 0.2, dur: [300, 480] },
        ] },
        impact: [
            { css: 'sfx-slash sfx-slash-spirit', ms: 380, vars: { rot: '-20deg' } },
            { p: 'spark', n: 8, motion: 'streak', colors: SPIRIT, size: [2, 3], stretch: [5, 8], dist: [30, 60], dur: [200, 340] },
            { p: 'wisp', n: 3, motion: 'rise', colors: SPIRIT, size: [6, 9], dist: [20, 40], spread: 14, dur: [500, 700] },
        ],
    },
    // Blade Downpour: blades rain from the sky and bite into the ground.
    usp_bladefall: {
        impact: [
            { css: 'sfx-blade-stuck', ms: 900 },
            { p: 'spark', n: 10, motion: 'streak', colors: STEEL, size: [2, 3], stretch: [5, 8], dist: [30, 60], angle: [-170, -10], dur: [200, 340] },
            { p: 'smoke', n: 3, motion: 'billow', colors: DUST, size: [16, 24], dist: [10, 24], angle: [150, 390], lift: [0, 6], end: 1.4, dur: [500, 700], at: [50, 90] },
        ],
    },
    // Orbiting Blades: every pass carves sparks off the victims.
    usp_blade_vortex: {
        impact: [
            { css: 'sfx-slash', ms: 380, vars: { rot: '0deg' } },
            { p: 'spark', n: 8, motion: 'streak', colors: STEEL, size: [2, 3], stretch: [5, 8], dist: [30, 60], dur: [200, 340] },
        ],
    },
    // Detonating Blade: the bomb-lashed blade blows the square apart.
    usp_blade_blast: {
        zoneBurst: [
            { flash: { color: 'rgba(255,250,225,1)', color2: 'rgba(255,110,20,.5)', size: 260, dur: 420 } },
            { p: 'puff', n: 14, motion: 'billow', colors: PUFF_C, glow: PUFF_G, size: [40, 64], dist: [10, 70], lift: [10, 30], end: 1.6, dur: [500, 760], opacity: 1 },
            { p: 'blade', n: 14, motion: 'streak', colors: STEEL, size: [5, 8], stretch: [3, 4], dist: [80, 160], dur: [300, 480], even: true },
            { p: 'smoke', n: 8, motion: 'billow', colors: SMOKE_DARK, size: [30, 44], dist: [20, 60], lift: [30, 60], end: 1.7, dur: [900, 1300], opacity: 0.7, delay: [150, 250] },
            { shake: 4 },
        ],
    },
    // Evasive Leap: a kick of dust as the hero springs away.
    usp_disengage: {
        cast: [
            { p: 'smoke', n: 8, motion: 'billow', colors: DUST, size: [18, 28], dist: [20, 50], angle: [150, 390], lift: [0, 8], end: 1.5, dur: [500, 800], at: [50, 85] },
            { p: 'rock', n: 6, motion: 'arc', colors: ['#000'], glow: ['#6a5030'], size: [3, 5], dist: [20, 50], angle: [-160, -20], lift: [20, 40], grav: [20, 40], spin: 300, dur: [500, 750], at: [50, 85] },
        ],
    },
    // Leap Strike: the landing stomp cracks the ground under the victim.
    usp_leap_strike: {
        impact: [
            { css: 'sfx-cracks sfx-cracks-dust', ms: 900 },
            { p: 'rock', n: 8, motion: 'arc', colors: ['#000'], glow: ['#5a4020'], size: [4, 7], dist: [30, 70], angle: [-170, -10], lift: [20, 40], grav: [20, 40], spin: 400, dur: [500, 800], at: [50, 86] },
            { p: 'smoke', n: 5, motion: 'billow', colors: DUST, size: [20, 30], dist: [20, 50], angle: [150, 390], lift: [0, 6], end: 1.5, dur: [600, 900], at: [50, 88] },
            { shake: 2 },
        ],
    },

    // ── ARROW ─────────────────────────────────────────────────────────
    // Deadeye Shot: the perfect arrow tears a ring of air behind it and
    // punches clean through.
    usp_aimed_shot: {
        trail: { every: 40, steps: [
            { ring: { color: 'rgba(255,255,255,.7)', glow: 'rgba(220,240,200,.6)', size: 30, width: 1.5, dur: 320, from: 0.3, squash: 1.6 } },
        ] },
        impact: [
            { flash: { color: 'rgba(255,255,255,1)', color2: 'rgba(200,240,150,.35)', size: 150, dur: 280 } },
            { css: 'sfx-pierce', ms: 400 },
            { ring: { color: '#ffffff', glow: '#cfe8a8', size: 120, width: 3, dur: 380 } },
            { p: 'ash', n: 12, motion: 'arc', colors: WOOD, size: [2, 4], dist: [30, 70], lift: [10, 26], grav: [16, 30], spin: 500, dur: [450, 750] },
            { p: 'spark', n: 10, motion: 'streak', colors: ['#ffffff', '#f3ffd8'], size: [2, 3], stretch: [7, 11], dist: [50, 100], angle: [-25, 25], dur: [220, 360] },
            { shake: 1 },
        ],
    },
    // Arrow Fan: each arrow lands with a snap of splinters.
    usp_multi_shot: {
        impact: [
            { flash: { color: 'rgba(255,255,240,.85)', color2: 'rgba(160,220,100,.3)', size: 100, dur: 240 } },
            { p: 'ash', n: 8, motion: 'arc', colors: WOOD, size: [2, 4], dist: [20, 50], lift: [10, 24], grav: [16, 30], spin: 400, dur: [450, 700] },
            { p: 'spark', n: 5, motion: 'streak', colors: ['#ffffff', '#f3ffd8'], size: [1.5, 2.5], stretch: [5, 8], dist: [24, 50], dur: [180, 320] },
        ],
    },
    // Skyfall Arrows: dust kicks up all over the square as the shafts hit.
    usp_arrow_volley: {
        zone: { every: 220, steps: [
            { p: 'smoke', n: 2, motion: 'billow', colors: DUST, size: [14, 22], dist: [4, 10], lift: [4, 10], end: 1.3, atX: [8, 92], atY: [20, 95], dur: [400, 600], opacity: 0.6 },
            { p: 'ash', n: 3, motion: 'arc', colors: WOOD, size: [2, 3], dist: [8, 20], lift: [8, 16], grav: [8, 14], spin: 300, atX: [8, 92], atY: [20, 95], dur: [300, 500] },
        ] },
    },
    // Poison Arrow: venom drips from the head in flight and splashes the
    // victim; the poison bubbles on.
    usp_serpent_sting: {
        trail: { every: 26, steps: [
            { p: 'drop', n: 1, motion: 'arc', colors: POISON, glow: ['#3c9a1e'], size: [3, 5], dist: [2, 8], lift: [-4, 2], grav: [20, 36], dur: [400, 600] },
            { p: 'mote', n: 1, motion: 'drift', colors: ['rgba(190,255,90,.55)'], size: [7, 11], dist: [2, 6], end: 0.15, dur: [260, 400] },
        ] },
        impact: [
            { flash: { color: 'rgba(240,255,200,.9)', color2: 'rgba(110,210,40,.4)', size: 130, dur: 300 } },
            { p: 'drop', n: 14, motion: 'arc', colors: POISON, glow: ['#3c9a1e'], size: [3, 7], dist: [26, 70], lift: [12, 30], grav: [16, 34], dur: [500, 800] },
            { p: 'smoke', n: 5, motion: 'billow', colors: PLAGUE, size: [20, 30], dist: [10, 26], lift: [6, 14], end: 1.5, dur: [600, 900], opacity: 0.75 },
            { p: 'ash', n: 6, motion: 'arc', colors: WOOD, size: [2, 4], dist: [20, 46], lift: [10, 20], grav: [14, 26], spin: 400, dur: [400, 650] },
        ],
        tick: [
            { p: 'bubble', n: 5, motion: 'rise', colors: ['#c6ff52'], glow: ['#3c9a1e'], size: [4, 8], dist: [20, 44], spread: 20, dur: [500, 800] },
            { p: 'drop', n: 3, motion: 'fall', colors: POISON, glow: ['#3c9a1e'], size: [3, 5], dist: [-24, -10], spread: 16, dur: [400, 650], at: [50, 40] },
        ],
    },
    // Bomb Arrow: the lashed bomb goes off - fireball, shrapnel, quake.
    usp_explosive_shot: {
        trail: { every: 20, steps: [
            { p: 'ember', n: 1, motion: 'drift', colors: FIRE_HOT, size: [3, 5], dist: [6, 14], lift: [4, 12], end: 0.15, dur: [260, 420] },
            { p: 'smoke', n: 1, motion: 'billow', colors: SMOKE, size: [10, 16], dist: [4, 10], lift: [8, 18], end: 1.4, dur: [500, 800], opacity: 0.55 },
        ] },
        impact: [
            { flash: { color: 'rgba(255,250,225,1)', color2: 'rgba(255,110,20,.5)', size: 230, dur: 420 } },
            { p: 'puff', n: 12, motion: 'billow', colors: PUFF_C, glow: PUFF_G, size: [36, 60], dist: [10, 50], lift: [10, 26], end: 1.6, dur: [480, 720], opacity: 1 },
            { css: 'sfx-fire-core', ms: 450 },
            { ring: { color: '#ffd25a', glow: '#ff5a00', size: 200, width: 4, dur: 600 } },
            { p: 'rock', n: 12, motion: 'streak', colors: ['#000'], glow: ['#ff6a00'], size: [3, 5], stretch: [1.5, 2], dist: [60, 130], dur: [300, 480] },
            { p: 'ember', n: 18, motion: 'arc', colors: FIRE, size: [3, 6], dist: [40, 100], lift: [20, 50], grav: [10, 30], dur: [550, 900] },
            { p: 'smoke', n: 7, motion: 'billow', colors: SMOKE_DARK, size: [26, 38], dist: [10, 40], lift: [30, 56], end: 1.7, dur: [900, 1300], opacity: 0.7, delay: [150, 250] },
            { css: 'sfx-scorch', ms: 1300 },
            { shake: 3 },
        ],
    },
    // Arrow Burst: a rapid stream of hits, each a small snap.
    usp_barrage: {
        impact: [
            { p: 'ash', n: 5, motion: 'arc', colors: WOOD, size: [2, 3], dist: [16, 40], lift: [8, 18], grav: [12, 24], spin: 400, dur: [400, 600] },
            { p: 'spark', n: 4, motion: 'streak', colors: ['#ffffff', '#f3ffd8'], size: [1.5, 2.5], stretch: [5, 8], dist: [20, 40], dur: [160, 280] },
        ],
    },
};


//------------------------------------------------------------------------
//---------------------------CLASS SKILL FLOURISHES-----------------------
//------------------------------------------------------------------------
// Played by js/classes/class-skill-fx.js on top of each class skill's own
// grid effects, styled after its hotbar icon. Fields: cell (at the target
// cell, or the grid centre), grid (a layer covering the whole grid - % and
// atX/atY map onto the board), hero, lines ('cross' | 'diag') + lineCss.

const VIOLET = ['#ffffff', '#f0dcff', '#c99bff', '#9d5cff'];
const CYAN = ['#ffffff', '#d8fffb', '#7ff5ea', '#2fd6c8'];
const EMERALD = ['#ffffff', '#d8ffe6', '#7cf0a8', '#2fbf6a'];
const ROSE = ['#ffffff', '#ffe0f2', '#ff9fd2', '#ff5fb0'];
const GOLD = ['#ffffff', '#fff3c4', '#ffd25a', '#ffaa1a'];

export const CLASS_SKILL_FX = {
    // Arcane Reveal: the icon's violet light-cross - beams race along the
    // cell's row and column from a white starburst.
    mathmagician_active1: {
        lines: 'cross', lineCss: 'sfx-cline-violet',
        cell: [
            { css: 'sfx-star-burst sfx-star-burst-xl', ms: 700 },
            { flash: { color: 'rgba(255,255,255,1)', color2: 'rgba(160,90,255,.5)', size: 160, dur: 420 } },
            { ring: { color: '#f0dcff', glow: '#9d5cff', size: 150, width: 3, dur: 600 } },
            { p: 'rune', n: 8, motion: 'burst', colors: VIOLET, glow: ['#9d5cff'], size: [11, 15], dist: [40, 90], dur: [600, 900], even: true, glyphs: ['∑', '∫', 'π', 'Ω', 'Δ', 'μ', 'σ', '∞'] },
            { p: 'star', n: 12, motion: 'burst', colors: VIOLET, size: [5, 9], dist: [30, 100], spin: 200, dur: [500, 800] },
        ],
    },
    // Absolute Zero: a giant ice crystal stamped with the infinity sign
    // freezes the board while snow drifts over it.
    mathmagician_active2: {
        grid: [
            { css: 'sfx-zero-crystal', ms: 1500 },
            { ring: { color: '#e3f6ff', glow: '#3da9ff', size: 420, width: 5, dur: 900, at: [50, 50] } },
            { p: 'flake', n: 26, motion: 'fall', colors: ICE, glow: ['#7fd9ff'], size: [6, 11], dist: [60, 140], sway: [20, 50], spin: 300, atX: [0, 100], atY: [10, 100], dur: [900, 1500], delay: [0, 500] },
            { p: 'shard', n: 14, motion: 'burst', colors: ICE, glow: ['#2a8fe0'], size: [5, 9], dist: [80, 200], spin: 400, dur: [600, 900] },
            { css: 'sfx-grid-frost', ms: 1600 },
        ],
        hero: [{ css: 'sfx-sigil sfx-sigil-frost', ms: 650 }],
    },
    // Data Strike: a cyan blade sweeps the chosen rows or columns.
    statistician_active1: {
        grid: [
            { css: 'sfx-grid-sweep', ms: 700 },
            { p: 'spark', n: 22, motion: 'streak', colors: CYAN, size: [2, 3], stretch: [8, 14], dist: [80, 200], angle: [-6, 6], atX: [0, 30], atY: [5, 95], dur: [300, 500] },
            { p: 'mote', n: 14, motion: 'pop', colors: CYAN, size: [6, 10], dist: [0, 4], atX: [5, 95], atY: [5, 95], dur: [400, 700], delay: [100, 400] },
        ],
        hero: [{ p: 'spark', n: 8, motion: 'streak', colors: CYAN, size: [2, 3], stretch: [6, 10], dist: [24, 50], dur: [200, 340] }],
    },
    // Diagonal Strike: the icon's cyan X - twin blades split the cell and
    // their light runs down both diagonals.
    statistician_active2: {
        lines: 'diag', lineCss: 'sfx-cline-cyan',
        cell: [
            { css: 'sfx-slash sfx-slash-cyan sfx-slash-cell', ms: 460, vars: { rot: '45deg' } },
            { css: 'sfx-slash sfx-slash-cyan sfx-slash-cell', ms: 460, delay: 90, vars: { rot: '-45deg' } },
            { flash: { color: 'rgba(240,255,255,1)', color2: 'rgba(40,220,200,.45)', size: 130, dur: 360 } },
            { p: 'spark', n: 14, motion: 'streak', colors: CYAN, size: [2, 3], stretch: [6, 10], dist: [40, 90], dur: [240, 400] },
        ],
    },
    // Precision Shot: a green arrow lands dead centre; pink crosses fly out
    // along its row and column (the icon's marked-wrong cells).
    probabilist_active1: {
        lines: 'cross', lineCss: 'sfx-cline-green',
        cell: [
            { css: 'sfx-pierce sfx-pierce-green', ms: 400 },
            { ring: { color: '#d8ffe6', glow: '#2fbf6a', size: 110, width: 3, dur: 500 } },
            { p: 'rune', n: 4, motion: 'burst', colors: ROSE, glow: ['#ff5fb0'], size: [14, 18], dist: [50, 110], angle: [0, 360], even: true, dur: [600, 900], glyphs: ['✕'] },
            { p: 'spark', n: 10, motion: 'streak', colors: EMERALD, size: [2, 3], stretch: [6, 10], dist: [30, 70], dur: [220, 360] },
        ],
    },
    // Rain of Arrows: cyan arrows hail down on the scanned area under a
    // ticking clock ring.
    probabilist_active2: {
        cell: [
            { ring: { color: '#d8fffb', glow: '#2fd6c8', size: 170, width: 2, dur: 900, dashed: true } },
            { p: 'spark', n: 18, motion: 'streak', colors: CYAN, glow: ['#2fd6c8'], size: [3, 4], stretch: [6, 9], dist: [90, 140], angle: [80, 100], spread: 60, at: [50, -60], dur: [320, 460], delay: [0, 500] },
            { p: 'mote', n: 10, motion: 'pop', colors: CYAN, size: [6, 10], dist: [10, 60], dur: [300, 500], delay: [300, 800] },
        ],
    },
    // Tail Risk: the Infinite Hunger opens its eye over the board - a violet
    // maw with a green gem pupil and writhing tendrils.
    outlier_active1: {
        grid: [
            { css: 'sfx-maw', ms: 1600 },
            { p: 'wisp', n: 14, motion: 'burst', colors: SHADOW, size: [10, 16], dist: [80, 200], dur: [700, 1100] },
            { p: 'smoke', n: 10, motion: 'billow', colors: VOID, size: [40, 60], dist: [40, 120], lift: [0, 10], end: 1.6, dur: [900, 1300], opacity: 0.7 },
            { tint: { color: 'rgba(70,10,110,.3)', dur: 600 } },
            { shake: 2 },
        ],
    },
    // Speedforce: the hero is swallowed by a violet speed vortex.
    outlier_active2: {
        hero: [
            { css: 'sfx-rift sfx-rift-xl', ms: 900 },
            { p: 'spark', n: 18, motion: 'orbit', colors: VIOLET, size: [2, 3], stretch: [6, 10], dist: [50, 70], spin: 540, end: 0.4, dur: [600, 900], even: true },
            { p: 'spark', n: 12, motion: 'streak', colors: ['#ffffff', '#e2b8ff'], size: [2, 3], stretch: [10, 16], dist: [60, 120], dur: [260, 420] },
        ],
    },
    // Regression to Prior: a clock face spins backwards over the board.
    actuary_active1: {
        grid: [
            { css: 'sfx-clock-rewind', ms: 1500 },
            { p: 'rune', n: 8, motion: 'orbit', colors: VIOLET, glow: ['#9d5cff'], size: [12, 16], dist: [120, 150], spin: -300, end: 0.6, dur: [1000, 1300], even: true, glyphs: ['XII', 'III', 'VI', 'IX', 'I', 'IV', 'VII', 'X'] },
            { ring: { color: '#f0dcff', glow: '#9d5cff', size: 360, width: 3, dur: 900, from: 1.6 } },
        ],
    },
    // Significance Threshold: golden shield panels lock over the board.
    actuary_active2: {
        grid: [
            { css: 'sfx-hex-shield sfx-hex-shield-gold sfx-hex-shield-grid', ms: 1000 },
            { p: 'shard', n: 16, motion: 'implode', colors: GOLD, glow: ['#c98a00'], size: [6, 10], dist: [120, 220], spin: 200, dur: [500, 700] },
            { p: 'mote', n: 14, motion: 'rise', colors: GOLD, size: [5, 8], dist: [40, 90], atX: [5, 95], atY: [30, 100], dur: [700, 1000] },
        ],
    },
    // Residual: a green ghost-flame rises from the mistake as the skeleton
    // answers the call.
    recursionist_active1: {
        cell: [
            { css: 'sfx-ghost-flame', ms: 1200 },
            { ring: { color: '#d8ffe6', glow: '#2fbf6a', size: 120, width: 3, dur: 600, squash: 0.45, at: [50, 70] } },
            { p: 'wisp', n: 8, motion: 'rise', colors: EMERALD, size: [7, 11], dist: [40, 80], spread: 14, dur: [700, 1000] },
            { p: 'ash', n: 8, motion: 'arc', colors: ['#f2ead8', '#cfc4a8'], size: [3, 5], dist: [20, 50], lift: [14, 30], grav: [10, 20], spin: 400, dur: [500, 800] },
        ],
    },
    // Degrees of Freedom: a purple ghost-flame flares as the zombie rises.
    recursionist_active2: {
        cell: [
            { css: 'sfx-ghost-flame sfx-ghost-flame-purple', ms: 1200 },
            { ring: { color: '#f0dcff', glow: '#9d5cff', size: 120, width: 3, dur: 600, squash: 0.45, at: [50, 70] } },
            { p: 'wisp', n: 8, motion: 'rise', colors: VIOLET, size: [7, 11], dist: [40, 80], spread: 14, dur: [700, 1000] },
            { p: 'ember', n: 10, motion: 'rise', colors: ['#f0dcff', '#c99bff', '#ffd25a'], size: [2, 4], dist: [40, 80], spread: 18, dur: [600, 900] },
        ],
    },
    // State Rollback: an hourglass turns inside a violet time-swirl and the
    // board is pulled back.
    markovian_active1: {
        grid: [
            { css: 'sfx-rift sfx-rift-grid', ms: 1200 },
            { css: 'sfx-hourglass', ms: 1300 },
            { ring: { color: '#f0dcff', glow: '#9d5cff', size: 380, width: 3, dur: 800, from: 1.5 } },
            { p: 'star', n: 16, motion: 'implode', colors: VIOLET, size: [5, 9], dist: [120, 220], dur: [500, 800] },
        ],
    },
    // Transition Matrix: a glowing green network of nodes lights up.
    markovian_active2: {
        grid: [
            { css: 'sfx-node-net', ms: 1400 },
            { p: 'star', n: 14, motion: 'pop', colors: EMERALD, size: [8, 13], dist: [0, 4], spin: 90, atX: [8, 92], atY: [8, 92], dur: [600, 1000], delay: [0, 500] },
            { ring: { color: '#d8ffe6', glow: '#2fbf6a', size: 300, width: 2, dur: 800, dashed: true } },
        ],
    },
    // Bayes Traps: the trap square primes with an emerald gem glow.
    bayesian_active1: {
        grid: [
            { css: 'sfx-trap-square', ms: 1200 },
            { p: 'shard', n: 10, motion: 'implode', colors: EMERALD, glow: ['#1e8a4a'], size: [6, 9], dist: [80, 140], spin: 200, dur: [500, 700] },
            { flash: { color: 'rgba(220,255,230,.95)', color2: 'rgba(40,200,110,.4)', size: 200, dur: 500, delay: 450 } },
        ],
        hero: [{ p: 'mote', n: 8, motion: 'rise', colors: EMERALD, size: [5, 8], dist: [30, 60], spread: 16, dur: [600, 900] }],
    },
    // Type I Error Shield: pink shields pop into place across the board.
    bayesian_active2: {
        grid: [
            { p: 'bubble', n: 9, motion: 'pop', colors: ['#ffb3dc'], glow: ['#ff5fb0'], size: [26, 36], dist: [0, 4], atX: [8, 92], atY: [8, 92], end: 1.1, dur: [800, 1100], delay: [0, 500] },
            { p: 'mote', n: 12, motion: 'pop', colors: ROSE, size: [6, 10], dist: [0, 6], atX: [5, 95], atY: [5, 95], dur: [500, 800], delay: [0, 500] },
            { ring: { color: '#ffe0f2', glow: '#ff5fb0', size: 320, width: 2, dur: 800 } },
        ],
    },
    // Brownian Motion: a zig-zag green trail darts away from the hero.
    random_walker_active1: {
        hero: [
            { p: 'bolt', n: 8, motion: 'streak', colors: EMERALD, size: [7, 9], stretch: [4, 6], dist: [40, 100], dur: [300, 500] },
            { p: 'smoke', n: 6, motion: 'billow', colors: DUST, size: [18, 26], dist: [20, 40], angle: [150, 390], lift: [0, 6], end: 1.4, dur: [500, 800], at: [50, 85] },
        ],
        grid: [
            { p: 'mote', n: 16, motion: 'pop', colors: EMERALD, size: [5, 8], dist: [0, 4], atX: [5, 95], atY: [5, 95], dur: [500, 800], delay: [0, 600] },
        ],
    },
    // Drifter: a glowing green path of sparkles marks the walk.
    random_walker_active2: {
        hero: [
            { p: 'leaf', n: 8, motion: 'burst', colors: LEAF, glow: ['#2f6b1a'], size: [8, 11], dist: [30, 60], spin: 300, dur: [600, 900] },
            { p: 'star', n: 6, motion: 'pop', colors: EMERALD, size: [6, 9], dist: [10, 40], dur: [500, 800] },
        ],
        grid: [
            { p: 'star', n: 12, motion: 'pop', colors: EMERALD, size: [6, 10], dist: [0, 4], atX: [5, 95], atY: [5, 95], dur: [500, 900], delay: [0, 700] },
        ],
    },
    // Heartbloom: green hearts bloom out over the board.
    heartbloom: {
        grid: [
            { p: 'rune', n: 10, motion: 'rise', colors: ['#d8ffe6', '#7cf0a8', '#2fbf6a'], glow: ['#1e8a4a'], size: [16, 22], dist: [30, 70], atX: [10, 90], atY: [30, 90], dur: [900, 1300], delay: [0, 400], glyphs: ['♥'] },
            { p: 'petal', n: 12, motion: 'burst', colors: ['#d8ffe6', '#ffffff', '#7cf0a8'], glow: ['#2fbf6a'], size: [7, 10], dist: [60, 150], spin: 300, dur: [700, 1000] },
        ],
    },
};
