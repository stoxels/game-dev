import { _renderPanel } from '../encounter.js';
import { BOSS_MECHANICS, _bossScheduleMechanics } from './boss-framework.js';
import { _nkDodgeBusy, _nkEl, _nkFrozen, _nkKillRun, _nkLoop, _nkNewRun, _nkRuns, _nkToast } from './shared-boss-abilities.js';
import { SHP_COLOR, _SHP_DEBUG_MULT, _SHP_DEBUG_SLOW, _mechShpRift, _shpPC, _shpPlace, _shpShards, _shpTouch } from './boss-shaper.js';
import { _mechShpBlizzard, _mechShpIcicles } from './boss-shaper-ice.js';
import { _mechShpMonoliths, _mechShpWalker } from './boss-shaper-guards.js';

//------------------------------------------------------------------------
//-------------------THE FROSTWRIGHT: THE SHAPED WINTER (10% finale)-------------
//------------------------------------------------------------------------
// At 10% the Frostwright wraps itself in an ice dome, raises a colossal
// monolith at the centre and tethers it with frost. Three frost arms sweep
// the arena like a radar blade, faster every beat, and three CORES on the
// monolith light up one at a time. The lit core shelters you from the arms:
// stand on it to crack it (3 touches); a shattered core stops its arm and
// the next one lights at once. Shatter all three before the last beat
// (~19s) to break the sculpture - otherwise the MONOLITH BREAK: a 3-2-1,
// then a full-screen ice shockwave (only the ring at the centre is safe).
//------------------------------------------------------------------------

const WIN_BEATS = 3;                      // beats before the monolith breaks
const WIN_BEAT_MS = 5200;                 // length of one beat
const WIN_CORE_HITS = 3;                  // touches that shatter a core
const WIN_CORE_TOUCH_CD = 420;            // ms between crack touches
const WIN_CORE_R = 120;                   // px from the monolith to its cores
const WIN_CORE_REACH = 58;                // px from a core that counts as touching it
const WIN_SHELTER_R = 70;                 // px from the lit core that shelters you from the arms
const WIN_HUB_R = 90;                     // the arms cannot hurt this close to the monolith
const WIN_ARM_OMEGAS = [70, 100, 135];    // deg/s per beat
const WIN_ARM_WARM_MS = 1600;             // arms are harmless (dashed) this long at the start
const WIN_ARM_REACH = 25;                 // px from an arm's centre line that bites
const WIN_ARM_DMG = 0.12;                 // %maxHP per arm touch
const WIN_BREAK_DMG = 0.35;               // %maxHP for the shockwave
const WIN_BREAK_WARN_MS = 3200;           // the 3-2-1 before the shockwave
const WIN_SAFE_R = 130;                   // px of the safe ring at the centre

// The finale that is running (null otherwise).
let _winter = null;


//------------------------------------------------------------------------
//-------------------BUILDING THE SET-PIECE--------------------------------
//------------------------------------------------------------------------

// Freezes (or releases) the auto-attack charge bars' look for the set-piece.
function _winterPauseCharge(on) {
    ['avatar-charge-fill', 'sx-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('sx-charge-paused', on);
    });
}

// The colossal monolith at the arena centre.
function _winterMonolith(g) {
    const el = _nkEl(g.fxRun, 'div', 'sx-shp-gmonolith');
    el.innerHTML = '<b class="sx-shp-gmono-body"></b>';
    _shpPlace(el, g.px, g.py, 54, 78);
    requestAnimationFrame(() => el.classList.add('sx-shp-gmonolith-on'));
    g.monolith = el;
}

// Three frost arms (120 apart) anchored at the monolith, harmless at first.
function _winterArms(g) {
    const maxR = Math.hypot(window.innerWidth, window.innerHeight);
    g.arms = [0, 1, 2].map(() => {
        const el = _nkEl(g.fxRun, 'div', 'sx-shp-arm sx-shp-arm-warm');
        el.style.left = Math.round(g.px) + 'px';
        el.style.top = Math.round(g.py - 11) + 'px';
        el.style.width = Math.round(maxR) + 'px';
        return el;
    });
}

// Three cores at 120 spacing on the monolith. The lit one is the safe spot.
function _winterCores(g) {
    g.cores = [0, 120, 240].map((ang) => {
        const el = _nkEl(g.fxRun, 'div', 'sx-shp-core', '💎');
        const x = g.px + Math.cos(ang * Math.PI / 180) * WIN_CORE_R;
        const y = g.py + Math.sin(ang * Math.PI / 180) * WIN_CORE_R;
        _shpPlace(el, x, y, 20, 20);
        return { ang, x, y, el, hp: WIN_CORE_HITS, lit: false, shattered: false };
    });
}

// The banner: set-piece name, cores left, and a one-line hint.
function _winterBanner(g) {
    const ov = _nkEl(g.fxRun, 'div', 'sx-shp-cd');
    ov.innerHTML =
        '<div class="sx-shp-cd-label">⛄ THE SHAPED WINTER</div>' +
        '<div class="sx-shp-cd-num sx-bmb-cd-pop">' + g.coresUp + '</div>' +
        '<div class="sx-shp-cd-hint">Shielded! Stand on the lit core - it shelters you from the arms.</div>';
    g.overlay = ov;
}

// The boss channels: an ice dome around its card and a frost tether to the
// monolith, so it is clear WHY it cannot be hurt.
function _winterShield(g, monster) {
    g.dome = _nkEl(g.fxRun, 'div', 'sx-shp-dome');
    g.dome.innerHTML = '<i class="sx-shp-dome-ring"></i><b class="sx-shp-dome-tag">🛡️ SHIELDED</b>';
    g.tether = _nkEl(g.fxRun, 'div', 'sx-shp-tether');
    const card = document.getElementById('sx-card-' + monster.id);
    const wrap = card ? (card.querySelector('.sx-emoji-wrapper') || card) : null;
    if (wrap) {
        wrap.classList.add('sx-shp-channelling');
        wrap.classList.add('sx-nk-shielded');
    }
    g.cardId = 'sx-card-' + monster.id;
}

// Keeps the dome on the boss card and the tether stretched to the monolith.
function _winterShieldFollow(g) {
    const card = document.getElementById(g.cardId);
    if (!card) return;
    const r = card.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const size = Math.max(r.width, r.height) * 1.35 + 20;
    g.dome.style.width = g.dome.style.height = Math.round(size) + 'px';
    _shpPlace(g.dome, cx, cy, size / 2, size / 2);
    const dx = g.px - cx, dy = g.py - cy;
    g.tether.style.left = Math.round(cx) + 'px';
    g.tether.style.top = Math.round(cy) + 'px';
    g.tether.style.width = Math.round(Math.hypot(dx, dy)) + 'px';
    g.tether.style.rotate = (Math.atan2(dy, dx) * 180 / Math.PI) + 'deg';
}


//------------------------------------------------------------------------
//-------------------THE ARMS AND THE CORES--------------------------------
//------------------------------------------------------------------------

// Lights one core (and dims the rest).
function _winterLight(g, core) {
    g.cores.forEach(c => { c.lit = c === core; c.el.classList.toggle('sx-shp-core-lit', c === core); });
}

// The core that is lit and still standing.
function _winterLit(g) {
    return g.cores.find(c => c.lit && !c.shattered) || null;
}

// Do the arms hurt right now? The player is hit if they stand on a live arm
// and are neither in the hub nor sheltered by the lit core.
function _winterArmCheck(g, pc, now, level) {
    const lit = _winterLit(g);
    if (lit && Math.hypot(pc.x - lit.x, pc.y - lit.y) < WIN_SHELTER_R) return;
    const d = Math.hypot(pc.x - g.px, pc.y - g.py);
    if (d <= WIN_HUB_R) return;
    const pa = Math.atan2(pc.y - g.py, pc.x - g.px) * 180 / Math.PI;
    for (let i = 0; i < 3; i++) {
        if (g.cores[i].shattered) continue;
        // Distance to the painted beam, not an angle, so near and far hits match what you see.
        const diff = ((pa - (g.arm + i * 120)) % 360 + 360) % 360;
        const off = Math.abs(Math.sin(diff * Math.PI / 180)) * d;
        if ((diff < 90 || diff > 270) && off < WIN_ARM_REACH) {
            _shpTouch(WIN_ARM_DMG, level, 'Frost Arm');
            return;
        }
    }
}

// Spins the arms, switches them live after the warm-up, and bites.
function _winterArmsStep(g, pc, now, dtS) {
    g.arm += g.omega * dtS;
    g.arms.forEach((el, i) => { el.style.rotate = (g.arm + i * 120) + 'deg'; });
    if (!g.armsLive && g.clock >= WIN_ARM_WARM_MS * _SHP_DEBUG_MULT) {
        g.armsLive = true;
        g.arms.forEach(el => el.classList.remove('sx-shp-arm-warm'));
    }
    if (g.armsLive && !g.breaking) _winterArmCheck(g, pc, now, g.level);
}

// One crack on the lit core; the third shatters it and lights the next.
function _winterCrack(g, core) {
    core.hp--;
    core.el.classList.remove('sx-shp-core-crack1', 'sx-shp-core-crack2');
    if (core.hp === 2) core.el.classList.add('sx-shp-core-crack1');
    if (core.hp === 1) core.el.classList.add('sx-shp-core-crack2');
    _shpShards(core.x, core.y, false);
    if (core.hp > 0) return false;
    core.shattered = true;
    core.lit = false;
    core.el.classList.add('sx-shp-core-shattered');
    g.arms[g.cores.indexOf(core)].classList.add('sx-shp-arm-off');
    _shpShards(core.x, core.y, true);
    g.coresUp--;
    if (g.coresUp <= 0) return true;
    _nkToast('eg_mech_shp_core_down', '❄️ Core shattered - ' + g.coresUp + ' to go!', '#4ade80');
    _winterLight(g, g.cores.find(c => !c.shattered));
    const num = g.overlay && g.overlay.querySelector('.sx-shp-cd-num');
    if (num) num.textContent = g.coresUp;
    return false;
}

// Cracking: body-check the lit core. Returns true once all three are gone.
function _winterCoreStep(g, pc, now) {
    const lit = _winterLit(g);
    if (!lit || now < g.coreCd || Math.hypot(pc.x - lit.x, pc.y - lit.y) >= WIN_CORE_REACH) return false;
    g.coreCd = now + WIN_CORE_TOUCH_CD;
    return _winterCrack(g, lit);
}

// The beat driver: every beat speeds the arms up; after the last one with
// cores left the monolith breaks.
function _winterBeats(g) {
    const beatMs = WIN_BEAT_MS * (_SHP_DEBUG_SLOW ? 8 : 1);
    const lightNext = () => {
        if (_winter !== g || g.finished) return;
        if (_nkFrozen()) { setTimeout(lightNext, 200); return; }
        g.beat++;
        if (g.beat > WIN_BEATS) { _shpBreak(g, g.level); return; }
        g.omega = WIN_ARM_OMEGAS[Math.min(WIN_ARM_OMEGAS.length - 1, g.beat - 1)];
        g.beatTimer = setTimeout(lightNext, beatMs);
    };
    g.beatTimer = setTimeout(lightNext, beatMs * 0.6);
}


//------------------------------------------------------------------------
//-------------------START, BREAK, END-------------------------------------
//------------------------------------------------------------------------

// Kills every other run of this boss: the finale owns the arena.
function _winterClearArena(monster) {
    Array.from(_nkRuns.values()).forEach(r => {
        if (r.bossId === monster.id) { try { _nkKillRun(r); } catch (e) { /* already gone */ } }
    });
}

// THE SHAPED WINTER begins.
function _shpFinalStart(monster) {
    if (_winter || !monster) return;
    _winterClearArena(monster);
    const W = window.innerWidth, H = window.innerHeight;
    const g = {
        monsterId: monster.id, finished: false, level: monster.level || 1,
        beat: 0, coresUp: 3, arm: Math.random() * 360, omega: WIN_ARM_OMEGAS[0],
        px: W / 2, py: H / 2, clock: 0, coreCd: 0, armsLive: false, breaking: false,
        monolith: null, arms: [], cores: [], overlay: null, dome: null, tether: null,
        fxRun: null, beatTimer: null, cardId: '',
    };
    _winter = g;
    _winterPauseCharge(true);
    g.fxRun = _nkNewRun(monster.id, true);
    g.fxRun.passive = true;
    _winterMonolith(g);
    _winterArms(g);
    _winterCores(g);
    _winterLight(g, g.cores[0]);
    _winterBanner(g);
    _winterShield(g, monster);
    monster.bossImmune = true;
    _nkToast('eg_mech_shp_final_cd', '⛄💀 THE SHAPED WINTER - shatter the cores!', SHP_COLOR);
    _nkLoop(g.fxRun, (dtS, now) => {
        if (g.finished) return false;
        g.clock += dtS * 1000;
        const pc = _shpPC();
        _winterShieldFollow(g);
        _winterArmsStep(g, pc, now, dtS);
        if (_winterCoreStep(g, pc, now)) { _shpFinalEnd(g, true); return false; }
        return true;
    });
    _winterBeats(g);
}

// THE MONOLITH BREAK: the sculpture detonates - a full-screen ice shockwave
// with a safe eye at the centre.
function _shpBreak(g, level) {
    if (!g || g.finished) return;
    _nkToast('eg_mech_shp_break', '⛄💀 THE MONOLITH BREAK - get into the ring at the centre!', SHP_COLOR);
    g.breaking = true;
    g.arms.forEach(a => a.classList.add('sx-shp-arm-off'));
    const ring = _nkEl(g.fxRun, 'div', 'sx-shp-breakring');
    ring.style.left = Math.round(g.px) + 'px';
    ring.style.top = Math.round(g.py) + 'px';
    ring.innerHTML = '<span class="sx-shp-break-count"></span>';
    const hint = g.overlay && g.overlay.querySelector('.sx-shp-cd-hint');
    if (hint) hint.textContent = 'MONOLITH BREAK - get into the ring at the centre!';
    const warnMs = WIN_BREAK_WARN_MS * (_SHP_DEBUG_SLOW ? 8 : 1);
    const t0 = performance.now();
    const countEl = ring.querySelector('.sx-shp-break-count');
    const cd = setInterval(() => {
        const left = warnMs - (performance.now() - t0);
        if (countEl) countEl.textContent = left > 0 ? String(Math.ceil(left / 1000)) : '';
        if (left <= 0) clearInterval(cd);
    }, 100);
    if (g.fxRun) g.fxRun.timers.push(cd);
    setTimeout(() => _winterDetonate(g, ring, level), warnMs);
}

// The shockwave lands: flash, shards, and a hit for anyone outside the ring.
function _winterDetonate(g, ring, level) {
    if (!g || g.finished) return;
    try { ring.remove(); } catch (e) { /* run already cleaned up */ }
    _shpShards(g.px, g.py, true);
    document.body.classList.add('sx-shp-flash');
    const fid = setTimeout(() => document.body.classList.remove('sx-shp-flash'), 700);
    if (g.fxRun) g.fxRun.timers.push(fid);
    const pc = _shpPC();
    if (Math.hypot(pc.x - g.px, pc.y - g.py) > WIN_SAFE_R) _shpTouch(WIN_BREAK_DMG, level, 'MONOLITH BREAK', true);
    setTimeout(() => _shpFinalEnd(g, false), _SHP_DEBUG_SLOW ? 5000 : 1100);
}

// Ends the set-piece (success or not): clears everything and hands the boss
// its mechanics back, vulnerable.
function _shpFinalEnd(g, success) {
    if (!g || g.finished) return;
    g.finished = true;
    if (g.beatTimer) { clearTimeout(g.beatTimer); g.beatTimer = null; }
    if (g.fxRun) { try { _nkKillRun(g.fxRun); } catch (e) { /* already gone */ } g.fxRun = null; }
    _winterPauseCharge(false);
    document.body.classList.remove('sx-shp-flash');
    document.querySelectorAll('.sx-shp-channelling').forEach(el => el.classList.remove('sx-shp-channelling'));
    const m = (globalThis._monsters || []).find(x => x && x.id === g.monsterId);
    if (m && m.bossImmune) {
        m.bossImmune = false;
        const card = document.getElementById(g.cardId);
        if (card) card.querySelectorAll('.sx-nk-shielded').forEach(el => el.classList.remove('sx-nk-shielded'));
        if (card) card.classList.remove('sx-nk-shielded');
        try { _bossScheduleMechanics(m, 3); } catch (e) { /* boss already gone */ }
        try { _renderPanel(); } catch (e) { /* panel not on screen */ }
    }
    if (_winter === g) _winter = null;
}

// A passive watcher: at 10% HP (once the Frostwright is vulnerable) the
// finale begins.
function _winterWatch(monster) {
    if (!monster || monster._shpWinterWatch) return;
    monster._shpWinterWatch = true;
    const run = _nkNewRun(monster.id, true);
    run.passive = true;
    _nkLoop(run, () => {
        if (_winter || monster._shpWinterDone) return false;
        if (monster.currentHP > 0 && monster.currentHP <= monster.maxHP * 0.10 && !monster.bossImmune) {
            monster._shpWinterDone = true;
            _shpFinalStart(monster);
            return false;
        }
        return true;
    });
}

// The framework calls onInit when the Frostwright spawns.
BOSS_MECHANICS.boss_shaper.onInit = _winterWatch;


//------------------------------------------------------------------------
//-------------------TEARDOWN-----------------------------------------------
//------------------------------------------------------------------------
// Called from _bossCleanup on boss death AND from the encounter stop -
// removes every run element, overlay and body class this boss ever created.
export function _shpTeardown() {
    if (_winter) { try { _shpFinalEnd(_winter, false); } catch (e) { /* already ended */ } _winter = null; }
    document.querySelectorAll('.sx-shp-shards, .sx-shp-rift-zone, .sx-shp-lane, .sx-shp-rift-edge, .sx-shp-wall-box, ' +
        '.sx-shp-ici, .sx-shp-ici-spike, .sx-shp-crater, .sx-shp-patch, .sx-shp-splinter, .sx-shp-bliz, .sx-shp-hearth, ' +
        '.sx-shp-mono, .sx-shp-wall, .sx-shp-wall-preview, .sx-shp-spawnring, .sx-shp-walker, .sx-shp-print, .sx-shp-shardlet, ' +
        '.sx-shp-gmonolith, .sx-shp-arm, .sx-shp-core, .sx-shp-cd, .sx-shp-breakring, .sx-shp-dome, .sx-shp-tether').forEach(el => {
        try { el.remove(); } catch (e) { /* already gone */ }
    });
    document.body.classList.remove('sx-shp-flash');
    document.querySelectorAll('.sx-shp-channelling').forEach(el => el.classList.remove('sx-shp-channelling'));
    _winterPauseCharge(false);
}


//------------------------------------------------------------------------
//-------------------PLAYTEST CONSOLE HOOK (dev only)----------------------
//------------------------------------------------------------------------
// Tiny console API for playtesting with stretched debug timings:
//   _SHP_DEBUG.fire('rift'|'icicles'|'blizzard'|'monos'|'walker', phase) - runs one now
//   _SHP_DEBUG.final()                                                   - SHAPED WINTER now
const SHP_DEBUG_FIRE = {
    rift: _mechShpRift, icicles: _mechShpIcicles, blizzard: _mechShpBlizzard,
    monos: _mechShpMonoliths, walker: _mechShpWalker,
};

if (typeof window !== 'undefined') {
    const findBoss = () => (globalThis._monsters || []).find(m => m && m.baseId === 'boss_shaper');
    window._SHP_DEBUG = {
        fire: (name, phase) => {
            const monster = findBoss();
            if (!monster) return 'no shaper alive';
            const fn = SHP_DEBUG_FIRE[name];
            if (!fn) return 'unknown: ' + name;
            if (_nkDodgeBusy()) return 'BLOCKED: dodge-busy (wait for the field to clear)';
            fn(monster, phase || monster.bossPhase || 1);
            return 'fired ' + name;
        },
        final: () => {
            const monster = findBoss();
            if (!monster) return 'no shaper alive';
            _shpFinalStart(monster);
            return 'THE SHAPED WINTER started';
        },
    };
}
