import { _renderPanel } from '../encounter.js';
import { _bossCorrupted } from '../combat-state.js';
import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _brutusFeedZombies, _brutusSlamBand, _mechSacrificialZombies } from './boss-brutus-zombies.js';
import { _nkAbilityHitToast, _nkBossAlive, _nkDodgeBusy, _nkEl, _nkFrozen, _nkHit, _nkKillRun, _nkLoop, _nkNewRun, _nkPlayerCenter, _nkPlayerRect, _nkRectsOverlap, _nkRuns, _nkSlamShatter } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: BRUTUS (boss_brutus)---------------------------
//------------------------------------------------------------------------
// A plate-armoured brute: the plate soaks physical hits but the metal
// conducts the elements (+25% elemental damage taken).
//  - GROUND SLAM (all fight): a red band through you fills, Brutus rears
//    up and smashes it. Every corrupted cell adds one more slam (max 3).
//    From 30% every slam is a cross (a row AND a column).
//  - SACRIFICIAL ZOMBIES (all fight): boss-brutus-zombies.js.
//  - AFTERSHOCK finale (10%): immune; a long chain of row and column
//    slams aimed at you, crosses near the end.
//------------------------------------------------------------------------

Object.assign(BOSS_DEFS, {
    boss_brutus: {
        id: 'boss_brutus', name: 'Brutus', emoji: '💥',
        baseHP: 1120, baseDamage: 26, chargeMax: 13,
        element: null,
        // Heavy armor: plate soaks physical hits (-30%) but the metal conducts
        // and cracks under the elements (+25% elemental damage taken). The
        // `physical` key is armor on the physical share of every hit; the
        // negative element values are VULNERABILITY (amplification), both
        // supported by _applyTargetResistances.
        resistances: { physical: 30, fire: -25, cold: -25, lightning: -25, shadow: -25 }
    },
});

Object.assign(BOSS_MECHANICS, {
    boss_brutus: {
        phases: [
            // Basic attacks are steady pressure; the slams are the real threat.
            { threshold: 1.00, chargeMax: 13, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 12, damageMultiplier: 1.20 },
            { threshold: 0.30, chargeMax: 11, damageMultiplier: 1.40 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'ground_slam', intervalBase: 15000, intervalVariance: 3500, handler: '_mechGroundSlam' },
            { name: 'sacrificial_zombies', intervalBase: 20000, intervalVariance: 6000, handler: '_mechSacrificialZombies' },
            { name: 'corrupt_cells', intervalBase: 17000, intervalVariance: 4000, handler: '_mechCorruptCells' },
        ],
    },
});


//------------------------------------------------------------------------
//-------------------CONSTANTS AND SHARED HELPERS---------------------------------
//------------------------------------------------------------------------
const HIT_CD_MS = 650;                             // shared hit cooldown
const BAND_W = 130;                                // slam band thickness (px)
const SLAM_CHAIN_MAX_EXTRA = 3;                    // corrupted cells add at most this many slams
const SLAM_BY_PHASE = [
    null,
    { warnMs: 1250, restMs: 550, dmg: 0.24, cross: false },
    { warnMs: 1150, restMs: 500, dmg: 0.27, cross: false },
    { warnMs: 1050, restMs: 450, dmg: 0.30, cross: true },
];
const HOIST_PX = 88;                               // how high the card rises before a slam
const SMASH_MS = 190;                              // how long the downward stomp takes
const FIN_INTRO_MS = 1800;
const FIN_FAILSAFE_MS = 120000;
const FIN_SLAMS = 30;                              // slams in the finale
const FIN_FIRST_GAP_MS = 1150, FIN_LAST_GAP_MS = 800;
const FIN_FIRST_WARN_MS = 1300, FIN_LAST_WARN_MS = 1000;
const FIN_DMG = [0.26, 0.36];                      // first and last slam
let _hitUntil = 0;
let _finale = null;                                // the running finale (one at a time)

// The phase number clamped to 1-3.
function _phase(phase) {
    return Math.max(1, Math.min(3, Number(phase) || 1));
}

// One physical hit with the boss-ability flash and number, behind a short
// shared cooldown so a row and a column landing together never stack.
function _strike(pct, level, label) {
    const now = performance.now();
    if (now < _hitUntil) return;
    _hitUntil = now + HIT_CD_MS;
    _nkAbilityHitToast(_nkHit(pct, null, level), 'Brutus', label, true);
}

// A clock that follows real time (clamped to 0.1 s per frame), so the CSS
// fills and the strikes in code never drift apart.
function _clock() {
    let last = performance.now();
    return (now) => { const dt = Math.min(100, Math.max(0, now - last)); last = now; return dt; };
}

// Player centre, or the screen centre when there is no avatar.
function _pc() {
    return _nkPlayerCenter() || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

// Slow rise curve for the wind-up (hangs at the top right before the smash).
function _easeInOut(k) {
    return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
}

// Stomp path (ms since impact): fast slam down to a small overshoot below
// rest, then a quick settle.
function _slamOffset(ms) {
    const t = Math.min(1, ms / SMASH_MS);
    if (t >= 1) return 0;
    if (t < 0.62) return -HOIST_PX + (HOIST_PX + 8) * (1 - Math.pow(1 - t / 0.62, 3));
    return 8 * (1 - (t - 0.62) / 0.38);
}

// Moves Brutus's card up (negative) or back down.
function _lift(monsterId, yPx) {
    const card = document.getElementById('sx-card-' + monsterId);
    if (card && card.classList.contains('sx-boss-card')) card.style.transform = yPx ? 'translateY(' + yPx.toFixed(1) + 'px)' : '';
}


//------------------------------------------------------------------------
//-------------------SLAM BANDS (a row, a column, or both)------------------------------
//------------------------------------------------------------------------

// Paints one band through the player (a row when horiz, else a column)
// whose red fill wipes across for warnMs. Returns the band with its box.
function _band(run, horiz, warnMs) {
    const W = window.innerWidth, H = window.innerHeight, pc = _pc(), h = BAND_W / 2;
    const c = horiz ? Math.max(h + 20, Math.min(H - h - 20, pc.y)) : Math.max(h + 20, Math.min(W - h - 20, pc.x));
    const box = horiz ? { left: 0, right: W, top: c - h, bottom: c + h } : { left: c - h, right: c + h, top: 0, bottom: H };
    const el = _nkEl(run, 'div', 'sx-brt-band ' + (horiz ? 'row' : 'col'));
    el.style.left = Math.round(box.left) + 'px';
    el.style.top = Math.round(box.top) + 'px';
    el.style.width = Math.round(box.right - box.left) + 'px';
    el.style.height = Math.round(box.bottom - box.top) + 'px';
    el.style.setProperty('--brt-warn', warnMs + 'ms');
    if (horiz) { _brutusSlamBand.active = true; _brutusSlamBand.cy = c; _brutusSlamBand.half = h; }
    return { el, box, horiz };
}

// Lands a group of bands at once: hits the player if any band covers
// them, shakes the ground and lets the zombies in a row band be devoured.
function _land(run, bands, monster, dmg, label) {
    const pr = _nkPlayerRect();
    if (bands.some(b => _nkRectsOverlap(pr, { left: b.box.left + 4, right: b.box.right - 4, top: b.box.top + 4, bottom: b.box.bottom - 4 }))) {
        _strike(dmg, monster ? monster.level : 1, label);
    }
    bands.forEach(b => {
        b.el.classList.add('hot');
        try { _nkSlamShatter(b.el, run); } catch (e) {}
        run.timers.push(setTimeout(() => { try { b.el.remove(); } catch (e) {} }, 450));
    });
    if (bands.some(b => b.horiz)) {
        _brutusSlamBand.active = false;
        try { _brutusFeedZombies(monster); } catch (e) {}
    }
}

// Ground Slam: a band through you fills red while Brutus rears up, then he
// smashes it. One extra slam per corrupted cell (max 3), re-aimed each time.
// From 30% every slam is a cross: a row and a column through you.
export function _mechGroundSlam(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const cfg = SLAM_BY_PHASE[_phase(phase)];
    const corrupt = (_bossCorrupted && _bossCorrupted.size) ? _bossCorrupted.size : 0;
    const total = 1 + Math.min(corrupt, SLAM_CHAIN_MAX_EXTRA);
    const id = monster ? monster.id : null;
    const run = _nkNewRun(id, true);
    run.onKill = () => { _lift(id, 0); _brutusSlamBand.active = false; };
    const clock = _clock();
    let round = 0, stage = 'warn', t = 0, bands = null, horiz = Math.random() < 0.5;
    const aim = () => {
        bands = cfg.cross ? [_band(run, true, cfg.warnMs), _band(run, false, cfg.warnMs)] : [_band(run, horiz, cfg.warnMs)];
        horiz = !horiz;
    };
    aim();
    _nkLoop(run, (dtS, now) => {
        t += clock(now);
        if (stage === 'warn') {
            _lift(id, -HOIST_PX * _easeInOut(Math.min(1, t / cfg.warnMs)));
            if (t < cfg.warnMs) return true;
            _land(run, bands, monster, cfg.dmg, 'Ground Slam');
            stage = 'smash'; t = 0;
        }
        if (stage === 'smash') {
            _lift(id, _slamOffset(t));
            if (t < SMASH_MS + cfg.restMs) return true;
            _lift(id, 0);
            round++;
            if (round >= total) return false;
            aim();
            stage = 'warn'; t = 0;
        }
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------AFTERSHOCK (10% finale)---------------------------------------------
//------------------------------------------------------------------------

// Pauses or resumes the player's auto-attack charge bar.
function _pauseCharge(paused) {
    ['avatar-charge-fill', 'sx-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('sx-charge-paused', paused);
    });
}

// Ends the finale (once): releases Brutus and frees the charge bar.
function _finEnd(g) {
    if (g.finished) return;
    g.finished = true;
    _pauseCharge(false);
    _lift(g.monsterId, 0);
    if (g.wrap) g.wrap.classList.remove('sx-nk-shielded');
    const m = (globalThis._monsters || []).find(x => x && x.id === g.monsterId);
    if (m) { m.bossImmune = false; try { _renderPanel(); } catch (e) {} }
    if (_finale === g) _finale = null;
}

// The k-th finale slam: when it starts, how long it fills, its damage and
// whether it is a row, a column or (every fifth, last third) a cross.
function _finSlam(k) {
    const f = k / (FIN_SLAMS - 1);
    const gap = FIN_FIRST_GAP_MS + (FIN_LAST_GAP_MS - FIN_FIRST_GAP_MS) * f;
    return {
        gap, warnMs: FIN_FIRST_WARN_MS + (FIN_LAST_WARN_MS - FIN_FIRST_WARN_MS) * f,
        dmg: FIN_DMG[0] + (FIN_DMG[1] - FIN_DMG[0]) * f,
        cross: k >= FIN_SLAMS * 0.66 && k % 5 === 4, horiz: k % 2 === 0,
    };
}

// Starts the finale: silences every other run of Brutus, turns him immune
// and fires the slam chain in one loop. Every exit runs _finEnd.
function _finStart(monster) {
    if (_finale || monster._brtFinaleDone) return;
    monster._brtFinaleDone = true;
    Array.from(_nkRuns.values()).forEach(r => { if (r.bossId === monster.id) { try { _nkKillRun(r); } catch (e) {} } });
    const card = document.getElementById('sx-card-' + monster.id);
    const wrap = card ? (card.querySelector('.sx-emoji-wrapper') || card) : null;
    const g = { monsterId: monster.id, finished: false, wrap };
    _finale = g;
    monster.bossImmune = true;
    _pauseCharge(true);
    if (wrap) wrap.classList.add('sx-nk-shielded');
    const run = _nkNewRun(monster.id, true);
    run.onKill = () => { _brutusSlamBand.active = false; _finEnd(g); };
    _nkEl(run, 'div', 'sx-nk-fin-banner sx-nk-fin-brt').innerHTML = '<div class="sx-nk-fin-title">AFTERSHOCK</div>';
    const clock = _clock();
    const pending = [];
    let t = 0, k = 0, nextAt = FIN_INTRO_MS;
    _nkLoop(run, (dtS, now) => {
        t += clock(now);
        if (t > FIN_FAILSAFE_MS || !_nkBossAlive(monster.id)) return false;
        if (k < FIN_SLAMS && t >= nextAt) {
            const s = _finSlam(k);
            const bands = s.cross ? [_band(run, true, s.warnMs), _band(run, false, s.warnMs)] : [_band(run, s.horiz, s.warnMs)];
            pending.push({ bands, at: t + s.warnMs, dmg: s.dmg });
            k++;
            nextAt = t + s.gap;
        }
        for (let i = pending.length - 1; i >= 0; i--) {
            if (t < pending[i].at) continue;
            _land(run, pending[i].bands, monster, pending[i].dmg, 'Aftershock');
            pending.splice(i, 1);
        }
        return k < FIN_SLAMS || pending.length > 0;
    });
}

// Passive HP watcher started when the fight begins: at 10% the finale
// begins, once.
function _brtOnInit(monster) {
    if (!monster || monster._brtWatch) return;
    monster._brtWatch = true;
    const run = _nkNewRun(monster.id, true);
    run.passive = true;
    _nkLoop(run, () => {
        if (monster._brtFinaleDone || !_nkBossAlive(monster.id)) return false;
        if (monster.currentHP > 0 && monster.currentHP <= monster.maxHP * 0.10 && !monster.bossImmune && !_nkFrozen()) {
            _finStart(monster);
            return false;
        }
        return true;
    });
}

BOSS_MECHANICS.boss_brutus.onInit = _brtOnInit;


//------------------------------------------------------------------------
//-------------------TEARDOWN AND DEBUG HOOK------------------------------------------
//------------------------------------------------------------------------

// Called from the boss cleanup on boss death AND on encounter stop: ends
// the finale and removes every slam band.
export function _brtTeardown() {
    if (_finale) { try { _finEnd(_finale); } catch (e) {} }
    _brutusSlamBand.active = false;
    document.querySelectorAll('.sx-brt-band, .sx-nk-fin-brt').forEach(el => { try { el.remove(); } catch (e) {} });
    _pauseCharge(false);
}

// Console hook for playtests: _BRT_DEBUG.fire('slam'|'zombies', phase), _BRT_DEBUG.final().
if (typeof window !== 'undefined') {
    const find = () => (globalThis._monsters || []).find(m => m && m.baseId === 'boss_brutus');
    window._BRT_DEBUG = {
        fire: (name, phase) => {
            const m = find();
            const fn = { slam: _mechGroundSlam, zombies: _mechSacrificialZombies }[name];
            if (!m) return 'no brutus alive';
            if (!fn) return 'unknown: ' + name;
            fn(m, phase || m.bossPhase || 1);
            return 'fired ' + name;
        },
        final: () => { const m = find(); if (!m) return 'no brutus alive'; _finStart(m); return 'finale started'; },
    };
}
