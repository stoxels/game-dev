import { sfkPlay, sfkLightning } from './spell-fx-kit.js';
// spell-charge-fx.js
//------------------------------------------------------------------------
//---------------------------SPELL CHARGE FX------------------------------
//------------------------------------------------------------------------
// What the hero does while a hold-to-cast spell is being charged. Every spell
// gets its own build-up - a cupped flame, a spinning ground circle, orbiting
// ice shards, crackling arcs, a dark vortex, a sword raised overhead, a
// closing crosshair - instead of one growing ball. Pieces are CSS shapes
// that follow the hero (css/spell-charge-fx.css, driven by --p = charge 0..1);
// the particles and lightning come from the spell toolkit (spell-fx-kit.js).
// spell-casttime.js starts it with the spell id, paints it every frame and
// ends it on release. Spells without a profile keep the old charge orb.
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//---------------------------CONSTANTS & STATE----------------------------
//------------------------------------------------------------------------

// Particles and arcs are spawned this often while charging.
const CHARGE_TICK_MS = 90;

// Where the layers sit relative to the hero's centre (px, y down).
const LAYER_OFFSETS = { hero: [0, 0], feet: [0, 34], head: [0, -52] };

const FIRE = ['#fff4c2', '#ffd25a', '#ff9a1f', '#ff5a1f', '#e8320e'];
const MAGMA = ['#fff0a0', '#ffb020', '#ff6a00', '#d63000'];
const SMOKE = ['rgba(60,48,44,.75)', 'rgba(40,32,30,.7)', 'rgba(90,70,60,.6)'];
const FROST = ['#ffffff', '#e3f6ff', '#9fe0ff', '#5cc4ff'];
const ARCANE = ['#ffffff', '#f3d9ff', '#d39bff', '#a86bff'];
const SHADOW = ['#e6c8ff', '#b071ff', '#7b2fd0', '#4a148c'];
const CHAOS = ['#ff5ad6', '#b071ff', '#5cff9a', '#ff9a3c', '#7bd7ff'];
const SOUL = ['#ffffff', '#e6f4ff', '#c8e2ff', '#b8b0ff'];
const VOLT = ['#ffffff', '#fffbd0', '#ffe45e', '#ffc400'];
const STORM = ['#ffffff', '#e9f8ff', '#a9e4ff', '#6ec6ff'];
const STEEL = ['#ffffff', '#eef2f8', '#c9d3e2', '#9aa7bd'];
const DUST = ['rgba(190,170,140,.65)', 'rgba(160,140,110,.6)', 'rgba(120,100,80,.55)'];
const POISON = ['#f4ffb8', '#c6ff52', '#7ee03a', '#3c9a1e'];
const ROT = ['#c9d48a', '#8a9a3c', '#5a6a22', '#2e3812'];
const STAR = ['#ffffff', '#fff6ff', '#ffe9a8', '#e2b8ff'];

// The charge visuals, by spell id. Fields:
//   c, c2, c3   main / second / soft-fill colours (CSS custom properties)
//   pieces      persistent shapes: { t, v (variant), at (hero|feet|head), s (scale),
//               n + r (orbit count / radius), kind (orbit element) }
//   emit        particle steps played every tick (see sfkPlay) with extras:
//               layer (hero|feet|head), n: [base, gain] (count grows with the
//               charge), every (play on every Nth tick), minP; or
//               { arcs: {...} } for lightning, { ring: {...} } for a closing ring
//   noOrb       true to drop the old charge orb (the profile replaces it)
//   keepOrb     true to keep the old orb as well (the Ice Spear's spear)
export const SPELL_CHARGE_FX = {
    // ---- fire ----
    usp_fireball: {
        c: '#ff8a2f', c2: '#ffd25a', c3: 'rgba(255,110,30,.4)',
        pieces: [{ t: 'flame', v: 'fire', at: 'hero' }],
        emit: [
            { p: 'ember', motion: 'rise', colors: FIRE, size: [2, 5], dist: [26, 64], dur: [450, 800], spread: 12, n: [0, 3], layer: 'hero' },
            { p: 'ember', motion: 'implode', colors: FIRE, size: [2, 4], dist: [46, 78], dur: [360, 560], n: [0, 2], layer: 'hero' },
        ],
    },
    usp_pyroblast: {
        c: '#ff6a1f', c2: '#ffb020', c3: 'rgba(214,48,0,.45)',
        pieces: [{ t: 'ground', v: 'fire', at: 'feet', s: 0.9 }, { t: 'flame', v: 'magma', at: 'hero', s: 1.35 }],
        emit: [
            { p: 'ember', motion: 'rise', colors: MAGMA, size: [3, 6], dist: [34, 84], dur: [500, 900], spread: 16, n: [0, 4], layer: 'hero' },
            { p: 'smoke', motion: 'drift', colors: SMOKE, size: [10, 16], dist: [4, 10], lift: [24, 40], end: 0.24, dur: [700, 1000], opacity: 0.6, n: [0, 1.2], layer: 'head' },
            { p: 'ash', motion: 'implode', colors: ['#3b2a20', '#1a120c'], size: [3, 5], dist: [50, 86], dur: [420, 620], n: [0, 2], layer: 'hero' },
            { ring: { color: '#ffb347', glow: '#ff6a00', size: 96, width: 2, from: 1.9, dur: 700 }, every: 5, layer: 'hero', minP: 0.25 },
        ],
    },
    usp_incinerate: {
        c: '#ff8a2f', c2: '#fff4c2', c3: 'rgba(255,120,30,.4)',
        pieces: [{ t: 'flame', v: 'jet', at: 'hero' }],
        emit: [
            { p: 'spark', motion: 'streak', colors: FIRE, size: [2, 3], stretch: [5, 9], dist: [34, 70], dur: [240, 380], angle: [-24, 24], n: [0, 3], layer: 'hero' },
            { p: 'ember', motion: 'rise', colors: FIRE, size: [2, 4], dist: [20, 46], dur: [380, 640], spread: 10, n: [0, 2], layer: 'hero' },
        ],
    },
    usp_flamestrike: {
        c: '#ff7a2f', c2: '#ffd25a', c3: 'rgba(255,110,30,.34)',
        noOrb: true,
        pieces: [{ t: 'ground', v: 'fire', at: 'feet', s: 1.25 }],
        emit: [
            { p: 'ember', motion: 'rise', colors: FIRE, size: [3, 6], dist: [40, 96], dur: [500, 900], spread: 54, n: [1, 5], layer: 'feet' },
            { p: 'smoke', motion: 'drift', colors: SMOKE, size: [10, 16], dist: [4, 10], lift: [20, 34], end: 0.22, dur: [600, 900], opacity: 0.5, spread: 40, n: [0, 1.5], layer: 'feet' },
            { ring: { color: '#ffb347', glow: '#ff6a00', size: 150, width: 2.5, from: 1.8, dur: 620 }, every: 4, layer: 'feet', minP: 0.2 },
        ],
    },
    usp_flameblast: {
        c: '#ff7a2f', c2: '#ffd25a', c3: 'rgba(255,110,30,.4)',
        noOrb: true,
        pieces: [{ t: 'ground', v: 'fire', at: 'feet', s: 0.95 }, { t: 'pillar', v: 'fire', at: 'feet' }],
        emit: [
            { p: 'ember', motion: 'rise', colors: FIRE, size: [2, 5], dist: [70, 150], dur: [600, 1000], spread: 14, n: [1, 4], layer: 'feet' },
            { p: 'spark', motion: 'streak', colors: MAGMA, size: [2, 3], stretch: [5, 8], dist: [40, 80], dur: [260, 420], angle: [-100, -80], spread: 18, n: [0, 2], layer: 'feet' },
        ],
    },

    // ---- frost ----
    usp_ice_spear: {
        c: '#7fd9ff', c2: '#e3f6ff', c3: 'rgba(120,210,255,.32)',
        keepOrb: true,
        pieces: [{ t: 'ground', v: 'frost', at: 'feet', s: 0.8 }],
        emit: [
            { p: 'flake', motion: 'fall', colors: FROST, glow: ['#7fd9ff'], size: [4, 7], dist: [36, 66], spread: 26, spin: 200, dur: [600, 900], n: [0, 2.5], layer: 'hero' },
            { p: 'smoke', motion: 'drift', colors: ['rgba(200,240,255,.7)', 'rgba(140,210,255,.6)'], size: [10, 16], dist: [6, 14], lift: [4, 12], end: 0.2, dur: [600, 900], opacity: 0.55, spread: 30, n: [0, 1.2], layer: 'feet' },
        ],
    },
    usp_freezing_pulse: {
        c: '#7fd9ff', c2: '#e3f6ff', c3: 'rgba(120,210,255,.3)',
        noOrb: true,
        pieces: [{ t: 'ground', v: 'frost', at: 'feet', s: 0.85 }, { t: 'orbit', kind: 'shard', n: 5, r: 40, at: 'hero' }],
        emit: [
            { p: 'flake', motion: 'burst', colors: FROST, glow: ['#7fd9ff'], size: [4, 8], dist: [22, 48], spin: 200, dur: [500, 800], n: [0, 2], layer: 'hero' },
            { p: 'mote', motion: 'implode', colors: ['rgba(200,240,255,.85)', 'rgba(140,210,255,.75)'], size: [6, 10], dist: [44, 72], dur: [380, 560], n: [0, 2], layer: 'hero' },
        ],
    },
    usp_cold_snap: {
        c: '#7fd9ff', c2: '#e3f6ff', c3: 'rgba(120,210,255,.34)',
        noOrb: true,
        pieces: [{ t: 'ground', v: 'frost', at: 'feet', s: 1.2 }],
        emit: [
            { p: 'flake', motion: 'fall', colors: FROST, glow: ['#7fd9ff'], size: [5, 9], dist: [60, 100], spread: 56, spin: 220, dur: [700, 1100], n: [1, 4], layer: 'hero' },
            { p: 'smoke', motion: 'drift', colors: ['rgba(200,240,255,.75)', 'rgba(150,215,255,.65)'], size: [12, 18], dist: [6, 16], lift: [4, 12], end: 0.22, dur: [700, 1000], opacity: 0.6, spread: 50, n: [0, 1.6], layer: 'feet' },
            { ring: { color: '#bfeaff', glow: '#5cc4ff', size: 140, width: 2.5, from: 1.8, dur: 640 }, every: 4, layer: 'feet', minP: 0.2 },
        ],
    },

    // ---- arcane ----
    usp_arcane_blast: {
        c: '#c792ff', c2: '#f3d9ff', c3: 'rgba(170,110,255,.36)',
        noOrb: true,
        pieces: [{ t: 'prism', at: 'hero' }],
        emit: [
            { p: 'rune', motion: 'orbit', colors: ARCANE, glow: ['#a86bff'], size: [9, 13], dist: [36, 48], spin: 160, end: 0.5, dur: [600, 800], n: [0, 1.5], layer: 'hero' },
            { p: 'mote', motion: 'implode', colors: ARCANE, size: [5, 9], dist: [44, 76], dur: [380, 560], n: [0, 3], layer: 'hero' },
        ],
    },
    usp_arcane_missiles: {
        c: '#c792ff', c2: '#f3d9ff', c3: 'rgba(170,110,255,.36)',
        noOrb: true,
        pieces: [{ t: 'orbit', kind: 'mote', n: 3, r: 34, at: 'hero', fast: true }],
        emit: [
            { p: 'star', motion: 'pop', colors: ARCANE, size: [5, 9], spin: 90, end: 0.1, dur: [300, 520], spread: 30, n: [0, 2], layer: 'hero' },
            { p: 'mote', motion: 'implode', colors: ARCANE, size: [4, 7], dist: [40, 66], dur: [340, 500], n: [0, 2], layer: 'hero' },
        ],
    },
    usp_disintegrate: {
        c: '#e2b8ff', c2: '#ffffff', c3: 'rgba(200,150,255,.34)',
        noOrb: true,
        pieces: [{ t: 'lens', at: 'hero' }],
        emit: [
            { p: 'spark', motion: 'streak', colors: ARCANE, size: [2, 3], stretch: [7, 12], dist: [30, 64], dur: [200, 320], angle: [-12, 12], n: [0, 3], layer: 'hero' },
            { p: 'mote', motion: 'implode', colors: ARCANE, size: [4, 7], dist: [44, 74], dur: [320, 480], n: [0, 3], layer: 'hero' },
        ],
    },
    usp_arcane_explosion: {
        c: '#c792ff', c2: '#f3d9ff', c3: 'rgba(170,110,255,.36)',
        noOrb: true,
        pieces: [{ t: 'ground', v: 'arcane', at: 'feet', s: 1.2 }],
        emit: [
            { p: 'rune', motion: 'orbit', colors: ARCANE, glow: ['#a86bff'], size: [9, 13], dist: [44, 64], spin: 200, end: 0.4, dur: [700, 900], n: [0, 2], layer: 'feet', even: true },
            { p: 'mote', motion: 'implode', colors: ARCANE, size: [5, 9], dist: [50, 86], dur: [380, 560], n: [1, 3], layer: 'feet' },
            { ring: { color: '#e2b8ff', glow: '#a86bff', size: 130, width: 2.5, from: 1.9, dur: 600 }, every: 3, layer: 'feet', minP: 0.15 },
        ],
    },
    usp_starfall: {
        c: '#ffe9a8', c2: '#e2b8ff', c3: 'rgba(226,184,255,.3)',
        noOrb: true,
        pieces: [{ t: 'pillar', v: 'star', at: 'feet' }],
        emit: [
            { p: 'star', motion: 'fall', colors: STAR, size: [5, 10], dist: [90, 150], spread: 30, spin: 120, end: 0.3, dur: [700, 1100], n: [1, 3], layer: 'head' },
            { p: 'mote', motion: 'implode', colors: STAR, size: [4, 7], dist: [40, 70], dur: [360, 520], n: [0, 2], layer: 'hero' },
        ],
    },

    // ---- shadow ----
    usp_chaos_bolt: {
        c: '#b071ff', c2: '#ff5ad6', c3: 'rgba(60,10,90,.55)',
        noOrb: true,
        pieces: [{ t: 'vortex', v: 'chaos', at: 'hero' }],
        emit: [
            { p: 'shard', motion: 'implode', colors: CHAOS, size: [4, 8], dist: [50, 86], spin: 300, dur: [360, 560], n: [1, 3], layer: 'hero' },
            { p: 'spark', motion: 'streak', colors: CHAOS, size: [2, 3], stretch: [5, 9], dist: [24, 56], dur: [220, 360], n: [0, 2.5], layer: 'hero' },
        ],
    },
    usp_soulrend: {
        c: '#c8e2ff', c2: '#b8b0ff', c3: 'rgba(80,60,160,.5)',
        noOrb: true,
        pieces: [{ t: 'vortex', v: 'soul', at: 'hero' }],
        emit: [
            { p: 'wisp', motion: 'implode', colors: SOUL, size: [6, 10], dist: [50, 84], spin: 120, dur: [440, 680], n: [0, 2.5], layer: 'hero' },
            { p: 'mote', motion: 'rise', colors: SOUL, size: [3, 6], dist: [24, 54], dur: [450, 750], spread: 14, n: [0, 2], layer: 'hero' },
        ],
    },
    usp_bane: {
        c: '#b071ff', c2: '#e6c8ff', c3: 'rgba(40,0,70,.55)',
        noOrb: true,
        pieces: [{ t: 'ground', v: 'shadow', at: 'feet', s: 1.2 }],
        emit: [
            { p: 'wisp', motion: 'rise', colors: SHADOW, size: [6, 10], dist: [40, 84], dur: [600, 1000], spread: 52, n: [1, 3], layer: 'feet' },
            { p: 'smoke', motion: 'drift', colors: ['rgba(26,6,40,.85)', 'rgba(60,14,90,.8)'], size: [14, 20], dist: [6, 14], lift: [8, 18], end: 0.22, dur: [700, 1000], opacity: 0.7, spread: 44, n: [0, 1.5], layer: 'feet' },
            { ring: { color: '#b071ff', glow: '#7b2fd0', size: 130, width: 2.5, from: 1.8, dur: 640 }, every: 4, layer: 'feet', minP: 0.2 },
        ],
    },
    usp_contagion: {
        c: '#9be04a', c2: '#f4ffb8', c3: 'rgba(110,190,50,.38)',
        noOrb: true,
        pieces: [{ t: 'ground', v: 'plague', at: 'feet', s: 1.1 }],
        emit: [
            { p: 'bubble', motion: 'rise', colors: POISON, size: [5, 9], dist: [36, 80], spread: 40, dur: [700, 1100], n: [0, 2.5], layer: 'feet' },
            { p: 'wisp', motion: 'rise', colors: POISON, size: [6, 10], dist: [46, 90], spread: 36, dur: [700, 1100], n: [0, 1.5], layer: 'feet' },
        ],
    },
    usp_blight: {
        c: '#8a9a3c', c2: '#c9d48a', c3: 'rgba(80,96,30,.45)',
        noOrb: true,
        pieces: [{ t: 'ground', v: 'plague', at: 'feet', s: 1.0 }],
        emit: [
            { p: 'ash', motion: 'rise', colors: ROT, size: [3, 6], dist: [30, 70], spread: 40, spin: 160, dur: [700, 1100], n: [1, 3], layer: 'feet' },
            { p: 'smoke', motion: 'drift', colors: ['rgba(70,80,30,.7)', 'rgba(50,56,20,.75)'], size: [12, 18], dist: [4, 10], lift: [14, 26], end: 0.22, dur: [800, 1200], opacity: 0.65, spread: 34, n: [0, 1.5], layer: 'feet' },
        ],
    },

    // ---- lightning ----
    usp_chain_lightning: {
        c: '#9fd8ff', c2: '#ffffff', c3: 'rgba(110,198,255,.3)',
        noOrb: true,
        pieces: [{ t: 'orbit', kind: 'node', n: 2, r: 38, at: 'hero', fast: true }],
        emit: [
            { arcs: { color: '#9fd8ff', from: [0, 18], to: [34, 78], n: [0, 2.2], ms: 170 }, layer: 'hero' },
            { p: 'bolt', motion: 'burst', colors: STORM, size: [5, 8], stretch: [3, 5], dist: [20, 50], dur: [200, 340], n: [0, 1.5], layer: 'hero' },
        ],
    },
    usp_arc: {
        c: '#6ec6ff', c2: '#ffffff', c3: 'rgba(60,140,255,.3)',
        noOrb: true,
        pieces: [{ t: 'orbit', kind: 'node', n: 2, r: 34, at: 'hero', fast: true }],
        emit: [
            { arcs: { color: '#6ec6ff', from: [0, 10], to: [28, 64], n: [0, 2.6], ms: 150, between: true }, layer: 'hero' },
            { p: 'spark', motion: 'streak', colors: STORM, size: [2, 3], stretch: [5, 9], dist: [24, 60], dur: [200, 340], n: [0, 2.5], layer: 'hero' },
        ],
    },
    usp_spark: {
        c: '#ffe45e', c2: '#ffffff', c3: 'rgba(255,200,0,.25)',
        noOrb: true,
        pieces: [{ t: 'core', v: 'volt', at: 'hero', s: 0.8 }],
        emit: [
            { p: 'spark', motion: 'streak', colors: VOLT, size: [2, 3], stretch: [4, 8], dist: [30, 80], dur: [180, 320], n: [1, 5], layer: 'hero' },
            { arcs: { color: '#ffe45e', from: [0, 8], to: [22, 52], n: [0, 1.4], ms: 130 }, layer: 'hero' },
        ],
    },
    usp_ball_lightning: {
        c: '#ffe45e', c2: '#ffffff', c3: 'rgba(255,200,0,.28)',
        noOrb: true,
        pieces: [{ t: 'core', v: 'sphere', at: 'hero', s: 1.1 }],
        emit: [
            { arcs: { color: '#ffe45e', from: [14, 26], to: [34, 64], n: [0, 2.2], ms: 160 }, layer: 'hero' },
            { p: 'spark', motion: 'streak', colors: VOLT, size: [2, 3], stretch: [4, 8], dist: [24, 62], dur: [200, 340], n: [0, 2], layer: 'hero' },
        ],
    },
    usp_discharge: {
        c: '#ce93d8', c2: '#ffe45e', c3: 'rgba(206,147,216,.3)',
        noOrb: true,
        pieces: [],
        emit: [
            { arcs: { color: '#ffe45e', from: [60, 78], to: [8, 24], n: [0, 2.6], ms: 150 }, layer: 'hero' },
            { p: 'spark', motion: 'implode', colors: VOLT, size: [2, 3], stretch: [4, 7], dist: [54, 84], dur: [260, 420], n: [0, 3], layer: 'hero' },
        ],
    },
    usp_storm_call: {
        c: '#9fd8ff', c2: '#ffffff', c3: 'rgba(80,110,170,.45)',
        noOrb: true,
        pieces: [{ t: 'cloud', v: 'storm', at: 'head' }],
        emit: [
            { arcs: { color: '#cfeaff', from: [-64, -54], to: [-8, 12], n: [0, 1.2], ms: 190, fromCloud: true }, layer: 'hero' },
            { p: 'drop', motion: 'fall', colors: ['#9fd8ff', '#c8ecff'], size: [3, 5], dist: [60, 110], spread: 46, dur: [380, 560], n: [1, 4], layer: 'head' },
        ],
    },

    // ---- blade ----
    usp_execute: {
        c: '#ffd0c8', c2: '#ff5a4a', c3: 'rgba(200,40,30,.3)',
        noOrb: true,
        pieces: [{ t: 'sword', at: 'hero' }],
        emit: [
            { p: 'spark', motion: 'streak', colors: STEEL, size: [2, 3], stretch: [6, 10], dist: [24, 56], dur: [220, 340], angle: [-110, -70], spread: 10, n: [0, 2.5], layer: 'head' },
            { p: 'star', motion: 'pop', colors: STEEL, size: [5, 9], spin: 60, end: 0.1, dur: [260, 420], spread: 16, n: [0, 1.5], layer: 'head' },
        ],
    },
    usp_seismic_slam: {
        c: '#c9a06a', c2: '#fff0c8', c3: 'rgba(120,90,60,.35)',
        noOrb: true,
        pieces: [{ t: 'ground', v: 'quake', at: 'feet', s: 1.2 }],
        emit: [
            { p: 'rock', motion: 'rise', colors: ['#8a6a52'], size: [4, 8], dist: [20, 56], spread: 52, spin: 200, dur: [500, 800], n: [0, 2.6], layer: 'feet' },
            { p: 'smoke', motion: 'drift', colors: DUST, size: [12, 18], dist: [6, 16], lift: [6, 14], end: 0.22, dur: [600, 900], opacity: 0.6, spread: 56, n: [1, 2], layer: 'feet' },
            { ring: { color: '#e8c690', glow: '#8a6236', size: 140, width: 3, from: 1.8, dur: 600 }, every: 4, layer: 'feet', minP: 0.2 },
        ],
    },
    usp_ethereal_knives: {
        c: '#cfd6e4', c2: '#ffffff', c3: 'rgba(160,190,230,.3)',
        noOrb: true,
        pieces: [{ t: 'orbit', kind: 'blade', n: 5, r: 44, at: 'hero' }],
        emit: [
            { p: 'wisp', motion: 'rise', colors: ['#e9f0ff', '#cfd6e4'], size: [5, 9], dist: [24, 50], spread: 30, dur: [450, 750], n: [0, 2], layer: 'hero' },
            { p: 'spark', motion: 'streak', colors: STEEL, size: [2, 3], stretch: [5, 9], dist: [28, 60], dur: [220, 360], n: [0, 2], layer: 'hero' },
        ],
    },

    // ---- arrow ----
    usp_aimed_shot: {
        c: '#b5e07f', c2: '#f3e2c0', c3: 'rgba(120,180,60,.25)',
        noOrb: true,
        pieces: [{ t: 'reticle', at: 'hero' }],
        emit: [
            { p: 'feather', motion: 'implode', colors: ['#f3e2c0', '#b5e07f'], size: [6, 10], dist: [56, 90], dur: [320, 480], n: [0, 2], layer: 'hero' },
            { p: 'spark', motion: 'implode', colors: ['#ffffff', '#b5e07f'], size: [2, 3], stretch: [4, 7], dist: [54, 84], dur: [260, 400], n: [0, 2], layer: 'hero' },
        ],
    },
    usp_explosive_shot: {
        c: '#ff8a2f', c2: '#ffd25a', c3: 'rgba(255,110,30,.3)',
        noOrb: true,
        pieces: [{ t: 'reticle', v: 'fire', at: 'hero' }],
        emit: [
            { p: 'ember', motion: 'implode', colors: FIRE, size: [2, 4], dist: [54, 84], dur: [300, 460], n: [0, 3], layer: 'hero' },
            { p: 'ember', motion: 'rise', colors: FIRE, size: [2, 4], dist: [20, 44], dur: [380, 620], spread: 12, n: [0, 1.5], layer: 'hero' },
        ],
    },
    usp_barrage: {
        c: '#b5e07f', c2: '#f3e2c0', c3: 'rgba(120,180,60,.25)',
        noOrb: true,
        pieces: [{ t: 'orbit', kind: 'arrow', n: 6, r: 42, at: 'hero', fan: true }],
        emit: [
            { p: 'feather', motion: 'burst', colors: ['#f3e2c0', '#b5e07f'], size: [6, 10], dist: [24, 54], dur: [380, 600], n: [0, 2], layer: 'hero' },
            { p: 'spark', motion: 'streak', colors: ['#ffffff', '#b5e07f'], size: [2, 3], stretch: [5, 9], dist: [28, 64], dur: [220, 360], angle: [-30, 30], n: [0, 2.5], layer: 'hero' },
        ],
    },
};


//------------------------------------------------------------------------
//---------------------------SMALL HELPERS--------------------------------
//------------------------------------------------------------------------

// A count that grows with the charge: base + gain * p, rounded up or down at random.
function _chargeCount(range, p) {
    if (typeof range === 'number') return range;
    const v = range[0] + range[1] * p;
    return Math.floor(v) + (Math.random() < (v % 1) ? 1 : 0);
}

// A random number between a and b.
function _between(a, b) {
    return a + Math.random() * (b - a);
}

// One zero-size layer inside the root, offset from the hero's centre.
function _addLayer(root, name) {
    const [x, y] = LAYER_OFFSETS[name];
    const layer = document.createElement('div');
    layer.className = 'sfk-layer scf-layer';
    layer.style.cssText = `position:absolute;inset:auto;left:${x}px;top:${y}px;width:0;height:0;`;
    root.appendChild(layer);
    return layer;
}

// Builds one persistent piece (a CSS shape that scales with the charge) and
// returns it. Orbiting pieces get their children here and are revealed one by
// one as the charge grows (see _paintOrbits).
function _addPiece(root, spec) {
    const el = document.createElement('div');
    el.className = `scf-piece scf-${spec.t}${spec.v ? ` scf-${spec.t}-${spec.v}` : ''} scf-at-${spec.at || 'hero'}`;
    el.style.setProperty('--sc', String(spec.s || 1));
    if (spec.t === 'ground') {
        el.innerHTML = '<i class="scf-ring-a"></i><i class="scf-ring-b"></i><i class="scf-glow"></i>';
    } else if (spec.t === 'flame') {
        el.innerHTML = '<i class="scf-fl-outer"></i><i class="scf-fl-mid"></i><i class="scf-fl-core"></i>';
    } else if (spec.t === 'prism') {
        el.innerHTML = '<i class="scf-sq-a"></i><i class="scf-sq-b"></i><i class="scf-glow"></i>';
    } else if (spec.t === 'vortex') {
        el.innerHTML = '<i class="scf-swirl"></i><i class="scf-swirl scf-swirl-b"></i><i class="scf-hole"></i>';
    } else if (spec.t === 'pillar') {
        el.innerHTML = '<i class="scf-shaft"></i><i class="scf-shaft scf-shaft-b"></i>';
    } else if (spec.t === 'reticle') {
        el.innerHTML = '<i class="scf-rt-ring"></i><i class="scf-rt-ring scf-rt-ring-b"></i><i class="scf-rt-h"></i><i class="scf-rt-v"></i><i class="scf-glow"></i>';
    } else if (spec.t === 'sword') {
        el.innerHTML = '<i class="scf-blade"></i><i class="scf-guard"></i><i class="scf-glow"></i>';
    } else if (spec.t === 'lens') {
        el.innerHTML = '<i class="scf-lens-h"></i><i class="scf-lens-v"></i><i class="scf-glow"></i>';
    } else if (spec.t === 'cloud') {
        el.innerHTML = '<i class="scf-cl-a"></i><i class="scf-cl-b"></i><i class="scf-cl-c"></i>';
    } else if (spec.t === 'core') {
        el.innerHTML = '<i class="scf-core-glow"></i><i class="scf-core-hot"></i>';
    } else if (spec.t === 'orbit') {
        el.dataset.n = String(spec.n || 4);
        el.style.setProperty('--r', `${spec.r || 40}px`);
        if (spec.fast) el.classList.add('is-fast');
        if (spec.fan) el.classList.add('is-fan');
        for (let i = 0; i < (spec.n || 4); i++) {
            const kid = document.createElement('i');
            kid.className = `scf-orb scf-orb-${spec.kind || 'mote'}`;
            kid.style.setProperty('--i', String(i));
            kid.style.setProperty('--k', String(i / (spec.n || 4)));
            el.appendChild(kid);
        }
    }
    root.appendChild(el);
    return el;
}

// Reveals an orbit's elements one by one as the charge builds.
function _paintOrbits(root, p) {
    root.querySelectorAll('.scf-orbit').forEach((orbit) => {
        const n = Number(orbit.dataset.n) || 1;
        const shown = Math.max(1, Math.ceil(p * n - 0.0001));
        orbit.querySelectorAll('.scf-orb').forEach((kid, i) => kid.classList.toggle('on', i < shown));
    });
}


//------------------------------------------------------------------------
//---------------------------EMITTING-------------------------------------
//------------------------------------------------------------------------

// Draws a short lightning arc near the hero. `from`/`to` are radius ranges
// (px); fromCloud arcs fall from above, `between` arcs jump from one side of
// the hero to the other (like current passing between two hands).
function _playArc(centre, arcs) {
    const a0 = Math.random() * Math.PI * 2;
    let from;
    let to;
    if (arcs.fromCloud) {
        from = { x: centre.x + _between(-26, 26), y: centre.y + _between(arcs.from[0], arcs.from[1]) };
        to = { x: centre.x + _between(-30, 30), y: centre.y + _between(arcs.to[0], arcs.to[1]) };
    } else if (arcs.between) {
        const r = _between(arcs.to[0], arcs.to[1]);
        from = { x: centre.x - r, y: centre.y + _between(-14, 6) };
        to = { x: centre.x + r, y: centre.y + _between(-14, 6) };
    } else {
        const r0 = _between(arcs.from[0], arcs.from[1]);
        const r1 = _between(arcs.to[0], arcs.to[1]);
        const a1 = a0 + _between(-0.9, 0.9);
        from = { x: centre.x + Math.cos(a0) * r0, y: centre.y + Math.sin(a0) * r0 * 0.9 };
        to = { x: centre.x + Math.cos(a1) * r1, y: centre.y + Math.sin(a1) * r1 * 0.9 };
    }
    sfkLightning(from, to, arcs.color, arcs.ms || 160, 2, 6);
}

// Plays one tick of a profile's emitters at charge p.
function _emitTick(fx, p, tick) {
    for (const step of fx.profile.emit) {
        if (step.minP && p < step.minP) continue;
        if (step.every && tick % step.every !== 0) continue;
        const layer = fx.layers[step.layer || 'hero'];
        if (step.arcs) {
            const count = _chargeCount(step.arcs.n, p);
            for (let i = 0; i < count; i++) _playArc(fx.centre, step.arcs);
        } else if (step.ring) {
            sfkPlay(layer, [{ ring: step.ring }]);
        } else {
            const n = _chargeCount(step.n || [1, 0], p);
            if (n > 0) sfkPlay(layer, [Object.assign({}, step, { n })]);
        }
    }
}


//------------------------------------------------------------------------
//---------------------------ENTRY POINTS---------------------------------
//------------------------------------------------------------------------

// The profile for a skill id, or null when it keeps the plain charge orb.
export function getSpellChargeProfile(skillId) {
    return SPELL_CHARGE_FX[skillId] || null;
}

// Starts the charge visual for a skill. Returns a handle { paint, end } or
// null when the skill has no profile. paint(p, centre) is called every frame
// with the charge 0..1 and the hero's viewport centre; end(cancelled) removes it.
export function startSpellChargeFx(skillId, centre) {
    const profile = getSpellChargeProfile(skillId);
    if (!profile) return null;
    try {
        const root = document.createElement('div');
        root.id = 'spell-charge-fx';
        root.className = 'scf-root';
        root.style.setProperty('--c', profile.c);
        root.style.setProperty('--c2', profile.c2);
        root.style.setProperty('--c3', profile.c3);
        root.style.setProperty('--p', '0');
        const fx = {
            profile, root, centre: centre || { x: window.innerWidth / 2, y: window.innerHeight * 0.4 },
            layers: {}, tick: 0, lastEmit: 0,
        };
        for (const name of Object.keys(LAYER_OFFSETS)) fx.layers[name] = _addLayer(root, name);
        for (const spec of profile.pieces) _addPiece(root, spec);
        document.body.appendChild(root);
        const handle = {
            profile,
            paint(p, c) {
                try { _paintFx(fx, p, c); } catch (e) { /* cosmetic */ }
            },
            end(cancelled) {
                try { _endFx(fx, cancelled); } catch (e) { /* cosmetic */ }
            },
        };
        handle.paint(0, centre);
        return handle;
    } catch (e) { return null; }
}

// One frame: follow the hero, set the charge, spawn particles on the tick.
function _paintFx(fx, p, centre) {
    if (centre) fx.centre = centre;
    fx.root.style.left = `${fx.centre.x}px`;
    fx.root.style.top = `${fx.centre.y}px`;
    fx.root.style.setProperty('--p', p.toFixed(3));
    fx.root.classList.toggle('is-ready', p >= 1);
    _paintOrbits(fx.root, p);
    const now = performance.now();
    if (now - fx.lastEmit >= CHARGE_TICK_MS) {
        fx.lastEmit = now;
        fx.tick++;
        _emitTick(fx, p, fx.tick);
    }
}

// The cast fired (a short pop, the real spell takes over) or was cancelled
// (it fizzles out); either way the root removes itself.
function _endFx(fx, cancelled) {
    fx.root.classList.add(cancelled ? 'is-fizzle' : 'is-fired');
    setTimeout(() => { try { fx.root.remove(); } catch (e) { /* already gone */ } }, cancelled ? 200 : 260);
}
