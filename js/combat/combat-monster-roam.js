import { t } from '../translation/translations.js';
import { MONSTER_ZONES, _renderPanel, _restartFlashClass } from './encounter.js';
import { _showStatusLabel } from './encounter-monster-damage.js';
import { _isActive } from './combat-state.js';
import { setPuzzleMonsterRoom } from '../grid-scaling.js';

// combat-monster-roam.js
// MONSTER POSITIONING - normal monsters now HOLD GROUND in static side
// panels instead of pacing permanently around the puzzle grid.
//
// History: this file used to run a perimeter patrol (every normal monster
// walked a rectangular circuit around #ptable via rAF). That constant
// motion is gone by design - monsters sit still in their spawn zone panel.
//
// What remains:
//   - _roamShouldRoam() always returns false so _renderMonstersIntoZones
//     keeps every normal monster in its static panel.
//   - _roamSync/_roamTeardown only clear the legacy #sx-roam-layer (old
//     saves / cached DOM) and stop the driver.
//   - _tryMonsterMeleeSidestep() is the ONLY movement left: an occasional,
//     melee-triggered sidestep to a different zone panel. Called from
//     _applyPlayerMeleeImpact after a successful hit, so standing still
//     and spamming E sometimes forces the player to walk back into range.
//     Chance is lore-weighted (vermin dart, brutes plod) with a per-monster
//     cooldown so it feels alive but never jittery.
// Loads AFTER encounter.js (calls its render helpers; encounter.js
// calls back into _roamShouldRoam/_roamSync/_roamTeardown guarded).

const ROAM_LAYER_ID = 'sx-roam-layer';

// Minimum time between two sidesteps of the SAME monster (ms). Keeps the
// behaviour occasional even when the player machine-guns E.
const SIDESTEP_COOLDOWN_MS = 5000;
// Grace period after spawn during which a monster never sidesteps (ms) -
// it should first be targetable where it appeared.
const SIDESTEP_SPAWN_GRACE_MS = 3500;

// Lore-weighted sidestep chance per successful melee hit. Small vermin dart
// around, medium beasts shift sometimes, heavy brutes barely move.
const SIDESTEP_NIMBLE = new Set([
    'rat', 'bat', 'bee', 'mosquito', 'ant', 'moth', 'spider', 'ladybug',
    'frog', 'beetle', 'owl'
]);
const SIDESTEP_HEAVY = new Set([
    'golem', 'golem_iron', 'ogre', 'troll', 'rhino', 'bison', 'zombie',
    'oni', 'volcano', 'meteor', 'moon', 'brain'
]);

// Permanent patrol is disabled - monsters hold ground in static panels.
// Always false so the zone renderer never skips normal monsters.
export function _roamShouldRoam(m) {
    return false;
}

// Legacy layer cleanup. The patrol owned #sx-roam-layer; it may still exist
// in a running session after this patch. Empty it so no ghost cards linger.
function _roamClearLegacyLayer() {
    try {
        const layer = document.getElementById(ROAM_LAYER_ID);
        if (layer) layer.innerHTML = '';
    } catch (e) { /* DOM not ready - nothing to clear */ }
    try {
        if (typeof _monsters !== 'undefined') {
            globalThis._monsters.forEach(m => { if (m) m.isRoaming = false; });
        }
    } catch (e) {}
}

// Called from _renderPanel after the static zones render. No roaming cards
// are built anymore - just make sure the legacy layer stays empty.
export function _roamSync() {
    _roamClearLegacyLayer();
    _startZoneLayoutSync();
}

// Removes every legacy roaming card and stops any old driver. Called from
// _hideMonsterPanel (encounter over) and safe to call anytime.
export function _roamTeardown() {
    _roamClearLegacyLayer();
    _zoneBandAsked = false;
}

// No-op kept so any stale rAF handle from a pre-patch session settles.
// The patrol tick is gone; monsters no longer move on their own.
// SUSPECTED DEAD: retained for legacy-session compatibility; no current caller.
function _roamEnsureTick() {}
// SUSPECTED DEAD: retained for legacy-session compatibility; no current caller.
function _roamTick() {}

// Returns the sidestep chance (0..1) for one successful melee hit on `m`.
// Nimble vermin dart often, heavies plod, everyone else sits in between.
// Ranged monsters strafe a touch more - they dislike blades up close.
function _monsterSidestepChance(m) {
    const baseId = (m && (m.baseId || m.id || '')) + '';
    const key = baseId.split('_')[0];
    let chance = 0.20;
    if (SIDESTEP_NIMBLE.has(baseId) || SIDESTEP_NIMBLE.has(key)) chance = 0.32;
    else if (SIDESTEP_HEAVY.has(baseId) || SIDESTEP_HEAVY.has(key)) chance = 0.10;
    if (m && m.attackType === 'ranged') chance += 0.05;
    if (m && m.isBoss) chance = 0;
    return Math.max(0, Math.min(0.45, chance));
}

// Picks a new zone panel for a sidestep: a different panel than `fromZone`
// that still has room, so cards never pile up.
function _pickSidestepZone(monster, fromZone) {
    return _pickRoomyZone(fromZone, monster && monster.id);
}

// The ONLY monster movement left: after a successful melee hit, sometimes
// (chance above, gated by cooldown + spawn grace) the monster darts to a
// different zone panel. Re-renders the panel, keeps the target locked, and
// flashes a small status label so the hop reads as a dodge, not a glitch.
// No-ops for bosses, tutorial runs, dead targets and single-zone layouts.
export function _tryMonsterMeleeSidestep(targetId) {
    try {
        if (typeof _monsters === 'undefined') return;
        if (typeof _isActive === 'function' && !_isActive()) return;
        const m = globalThis._monsters.find(x => x && x.id === targetId);
        if (!m || m.currentHP <= 0) return;
        if (m.isBoss || m.isSacrificialZombie || m.isDynamoConductor) return;
        try {
            if (typeof _tqIsTutorialActive === 'function' && globalThis._tqIsTutorialActive()) return;
        } catch (e) {}
        const now = (typeof Date !== 'undefined' && Date.now) ? Date.now() : 0;
        if (m._sidestepCdUntil && now < m._sidestepCdUntil) return;
        if (m._spawnedAt && (now - m._spawnedAt) < SIDESTEP_SPAWN_GRACE_MS) return;
        const chance = _monsterSidestepChance(m);
        if (!(chance > 0) || Math.random() >= chance) return;
        const fromZone = m.zoneId || 'sx-monster-panel';
        const toZone = _pickSidestepZone(m, fromZone);
        if (!toZone || toZone === fromZone) return;
        m.zoneId = toZone;
        m._sidestepCdUntil = now + SIDESTEP_COOLDOWN_MS
            + Math.floor(Math.random() * 2500);
        if (typeof _renderPanel === 'function') _renderPanel();
        // Small "sidestep!" label on the fresh card so the move reads.
        try {
            const label = (typeof t === 'function' ? t('eg_melee_sidestep') : '') || 'sidesteps!';
            if (label && label !== 'eg_melee_sidestep' && typeof _showStatusLabel === 'function') {
                _showStatusLabel(m.id, '↔ ' + label);
            } else if (typeof _showStatusLabel === 'function') {
                _showStatusLabel(m.id, '↔ …');
            }
        } catch (e) {}
        try {
            const card = document.getElementById('sx-card-' + m.id);
            if (card && typeof _restartFlashClass === 'function') {
                _restartFlashClass(card, 'sx-flash-cleave');
            }
        } catch (e) {}
    } catch (e) {}
}

//------------------------------------------------------------------------
//-------------------FREE-SPACE SPAWN ZONES-------------------------------
//------------------------------------------------------------------------
// The four floating panels (left / right / top band / bottom band) used to
// sit at fixed screen spots, so wide puzzles swallowed them and cards ended
// up on top of the clues. Now each panel is stretched over the free space
// that is REALLY left around the puzzle table (clues included) after the
// HUD, inventory bar, spell hotbar and zoom bar are cut out:
//   left / right  = the margins beside the table
//   top / bottom  = the bands above / below the table
// A zone with no room for even one card is switched off (data-eg-cap="0")
// and is never picked for a spawn. #sx-monster-panel (bottom-right dock)
// stays the tutorial's dock and the last-resort fallback.

const ZONE_GAP = 16;                       // clear space between cards and the puzzle table
const ZONE_EDGE = 8;                       // clear space to the screen edge
// Card model: art frame is R px wide (96 * artScale; bosses 144 * artScale), the
// card adds ~20px of side margin and ~66px of bars / badges below the art.
// Zones shrink their cards (--sx-zs) down to ZONE_MIN_SCALE to fit.
const ZONE_ART_DEFAULT = 125;
const ZONE_CARD_PAD_W = 20;
const ZONE_CARD_PAD_H = 66;
const ZONE_MIN_SCALE = 0.55;
const ZONE_MIN_SLOTS = 3;      // fewer card slots than this around the grid -> shrink the grid a little
const ZONE_FALLBACK = 'sx-monster-panel';
const ZONE_REGIONS = {
    left: 'sx-panel-left',
    right: 'sx-panel-right',
    top: 'sx-panel-top-corner',
    bottom: 'sx-panel-bottom'
};
// Fixed HUD block in the top-left corner (timer, mistakes, CLUES buttons).
const ZONE_TOPLEFT_HUD = { l: 0, t: 0, r: 272, b: 98 };
// Elements that must stay clear (read live, only when visible).
// (#sx-objectives-strip = the trial's objective tracker chips, top-left.)
const ZONE_OBSTACLE_SELECTORS = ['#inv-panel', '.skill-hotbar', '#zoom-bar', '#hud-level-name', '#class-hud-panel', '#sx-objectives-strip'];

let _zoneLayoutTimer = null;
let _zoneLayoutSig = '';
let _zoneBandAsked = false;     // the grid was already shrunk once this encounter to make room

function _zoneRect(el, pad) {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0)) return null;
    return { l: r.left - pad, t: r.top - pad, r: r.right + pad, b: r.bottom + pad };
}

// Cuts `o` out of `reg`, keeping whichever remaining side is largest.
function _clipRegion(reg, o) {
    if (!reg) return null;
    if (o.r <= reg.l || o.l >= reg.r || o.b <= reg.t || o.t >= reg.b) return reg;
    const cands = [
        { l: reg.l, t: reg.t, r: Math.min(reg.r, o.l), b: reg.b },
        { l: Math.max(reg.l, o.r), t: reg.t, r: reg.r, b: reg.b },
        { l: reg.l, t: reg.t, r: reg.r, b: Math.min(reg.b, o.t) },
        { l: reg.l, t: Math.max(reg.t, o.b), r: reg.r, b: reg.b }
    ];
    let best = null;
    let bestArea = 0;
    cands.forEach(c => {
        const a = (c.r - c.l) * (c.b - c.t);
        if (c.r > c.l && c.b > c.t && a > bestArea) { best = c; bestArea = a; }
    });
    return best;
}

// Art size (px) of the biggest monster that is alive, or a typical size when
// none is spawned yet. Bosses use the larger boss frame.
function _zoneRefArt() {
    let r = ZONE_ART_DEFAULT;
    (globalThis._monsters || []).forEach(m => {
        if (!m || m.isSacrificialZombie || m.isDynamoConductor) return;
        r = Math.max(r, (m.isBoss ? 144 : 96) * (Number(m.artScale) || 1));
    });
    return Math.round(r);
}

function _zoneLayoutAllowed() {
    if (typeof MONSTER_ZONES === 'undefined') return false;
    // The gauntlet arena swaps MONSTER_ZONES for its own ga-zone-* spots.
    if (!Object.values(ZONE_REGIONS).some(z => MONSTER_ZONES.includes(z))) return false;
    // The tutorial parks its monster in the bottom dock on purpose.
    try {
        if (typeof _tqIsTutorialActive === 'function' && !globalThis._parryTutorialForce
            && globalThis._tqIsTutorialActive()) return false;
    } catch (e) {}
    return true;
}

// Computes the free regions around the puzzle table: { left, right, top, bottom }.
function _computeFreeRegions(table, vw, vh) {
    const E = ZONE_EDGE;
    const G = ZONE_GAP;
    const regions = {
        left: { l: E, t: Math.max(E, table.t), r: table.l - G, b: Math.min(vh - E, table.b) },
        right: { l: table.r + G, t: Math.max(E, table.t), r: vw - E, b: Math.min(vh - E, table.b) },
        top: { l: E, t: E, r: vw - E, b: table.t - G },
        bottom: { l: E, t: table.b + G, r: vw - E, b: vh - E }
    };
    const obstacles = [ZONE_TOPLEFT_HUD];
    ZONE_OBSTACLE_SELECTORS.forEach(sel => {
        const r = _zoneRect(document.querySelector(sel), 4);
        if (r) obstacles.push(r);
    });
    Object.keys(regions).forEach(k => {
        let reg = regions[k];
        if (reg.r <= reg.l || reg.b <= reg.t) reg = null;
        obstacles.forEach(o => { reg = _clipRegion(reg, o); });
        regions[k] = reg;
    });
    return regions;
}

// Stretches one panel over its free region, shrinking its cards when the
// region is tight. Returns how many cards fit (0 = zone switched off).
function _applyZoneRegion(key, reg, refArt) {
    const el = document.getElementById(ZONE_REGIONS[key]);
    if (!el) return 0;
    let scale = 0;
    let cap = 0;
    if (reg) {
        const fitW = (reg.r - reg.l - ZONE_CARD_PAD_W) / refArt;
        const fitH = (reg.b - reg.t - ZONE_CARD_PAD_H) / refArt;
        scale = Math.min(1, fitW, fitH);
        if (scale >= ZONE_MIN_SCALE) {
            scale = Math.floor(scale * 100) / 100;
            const cols = Math.floor((reg.r - reg.l) / (refArt * scale + ZONE_CARD_PAD_W));
            const rows = Math.floor((reg.b - reg.t) / (refArt * scale + ZONE_CARD_PAD_H));
            cap = Math.max(0, cols) * Math.max(0, rows);
        }
    }
    el.dataset.egCap = String(cap);
    if (cap === 0) {
        el.style.display = 'none';
        return 0;
    }
    // Panels are positioned inside #screen-game; convert from viewport coords.
    const host = el.offsetParent ? el.offsetParent.getBoundingClientRect() : { left: 0, top: 0 };
    const side = key === 'left' || key === 'right';
    const hug = key === 'left' || key === 'top' ? 'flex-end' : 'flex-start';
    const st = el.style;
    st.display = 'flex';
    st.left = Math.round(reg.l - host.left) + 'px';
    st.top = Math.round(reg.t - host.top) + 'px';
    st.right = 'auto';
    st.bottom = 'auto';
    st.width = Math.round(reg.r - reg.l) + 'px';
    st.height = Math.round(reg.b - reg.t) + 'px';
    st.transform = 'none';
    st.flexWrap = 'wrap';
    st.flexDirection = side ? 'column' : 'row';
    st.justifyContent = 'center';
    // Hug the puzzle-table side of each region.
    st.alignContent = hug;
    st.alignItems = hug;
    st.setProperty('--sx-zs', String(scale));
    return cap;
}

// Zones that can currently take a card, with their capacity.
function _usableZoneCaps() {
    const caps = [];
    MONSTER_ZONES.forEach(z => {
        const el = document.getElementById(z);
        const raw = el && el.dataset ? el.dataset.egCap : undefined;
        if (raw === undefined) { caps.push({ id: z, cap: 99 }); return; }   // not ours (arena zone) - always usable
        const cap = Number(raw) || 0;
        if (cap > 0) caps.push({ id: z, cap });
    });
    return caps;
}

// Picks the usable zone with the most free room (random tie-break) so cards
// fan out over the free space instead of stacking. `exceptId` skips a zone
// (sidestep), `exceptMonsterId` ignores that monster when counting.
export function _pickRoomyZone(exceptId, exceptMonsterId) {
    try { _layoutSpawnZones({ noRender: true }); } catch (e) {}
    let caps = _usableZoneCaps().filter(c => c.id !== ZONE_FALLBACK);
    if (!caps.length) caps = [{ id: ZONE_FALLBACK, cap: 1 }];
    if (exceptId) {
        const others = caps.filter(c => c.id !== exceptId);
        if (!others.length) return null;
        caps = others;
    }
    const counts = {};
    (globalThis._monsters || []).forEach(m => {
        if (!m || m.id === exceptMonsterId) return;
        const z = m.zoneId || ZONE_FALLBACK;
        counts[z] = (counts[z] || 0) + 1;
    });
    const score = c => ((counts[c.id] || 0) + 1) / c.cap;
    const best = Math.min.apply(null, caps.map(score));
    const pool = caps.filter(c => score(c) <= best + 1e-9);
    return pool[Math.floor(Math.random() * pool.length)].id;
}

// Lays the four floating panels over the free space around the puzzle table
// and moves any card whose zone just lost its room. Cheap when nothing moved.
export function _layoutSpawnZones(opts) {
    if (!_zoneLayoutAllowed()) return;
    const table = _zoneRect(document.getElementById('ptable'), 0);
    if (!table) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const sig = [table.l, table.t, table.r, table.b, vw, vh].map(Math.round).join(',')
        + '|' + ZONE_OBSTACLE_SELECTORS.map(s => {
            const r = _zoneRect(document.querySelector(s), 0);
            return r ? [r.l, r.t, r.r, r.b].map(Math.round).join('.') : '-';
        }).join(',');
    const refArt = _zoneRefArt();
    const key = sig + '|' + refArt;
    const leftEl = document.getElementById(ZONE_REGIONS.left);
    if (key === _zoneLayoutSig && leftEl && leftEl.dataset.egCap !== undefined) return;
    _zoneLayoutSig = key;

    const regions = _computeFreeRegions(table, vw, vh);
    Object.keys(ZONE_REGIONS).forEach(k => _applyZoneRegion(k, regions[k], refArt));

    // A grid that fills the whole screen leaves no room for any card: shrink it
    // a little (once per encounter) so a band above it can hold them.
    const totalCap = Object.values(ZONE_REGIONS).reduce((n, z) => n + (Number(document.getElementById(z).dataset.egCap) || 0), 0);
    if (totalCap < ZONE_MIN_SLOTS && !_zoneBandAsked) {
        _zoneBandAsked = true;
        const band = Math.min(210, ZONE_EDGE + Math.round(refArt * 0.8) + ZONE_CARD_PAD_H + ZONE_GAP + 6);
        setPuzzleMonsterRoom(true, band);
        _zoneLayoutSig = '';        // measure again on the next tick, the grid just moved
    }

    // Cards whose zone lost its room (zoom / resize) hop to a zone that has room.
    let moved = false;
    const usable = _usableZoneCaps().filter(c => c.id !== ZONE_FALLBACK);
    (globalThis._monsters || []).forEach(m => {
        if (!m || m.isSacrificialZombie || m.isDynamoConductor || !m.zoneId) return;
        const ours = Object.values(ZONE_REGIONS).includes(m.zoneId) || m.zoneId === ZONE_FALLBACK;
        if (!ours) return;
        const here = m.zoneId === ZONE_FALLBACK ? null : document.getElementById(m.zoneId);
        if (here && Number(here.dataset.egCap) > 0) return;
        if (!usable.length) return;
        const to = _pickRoomyZone(m.zoneId, m.id);
        if (to && to !== m.zoneId) { m.zoneId = to; moved = true; }
    });
    if (moved && !(opts && opts.noRender) && typeof _renderPanel === 'function') _renderPanel();
}

// Light poll while an encounter runs: re-lays the zones when the puzzle zoom,
// window size or HUD changes. Stops itself when the encounter is over.
function _startZoneLayoutSync() {
    // Wide, short puzzles leave their free space above AND below the grid, too
    // thin for a card each - gather it into one band above the grid.
    try {
        if (_zoneLayoutAllowed()) setPuzzleMonsterRoom(true);
    } catch (e) {}
    try { _layoutSpawnZones(); } catch (e) {}
    if (_zoneLayoutTimer) return;
    _zoneLayoutTimer = setInterval(() => {
        if (typeof _isActive === 'function' && !_isActive()) {
            clearInterval(_zoneLayoutTimer);
            _zoneLayoutTimer = null;
            return;
        }
        try { _layoutSpawnZones(); } catch (e) {}
    }, 250);
}
