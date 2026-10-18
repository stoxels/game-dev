import { EG_BOSS_DEFS, EG_BOSS_MECHANICS } from './boss-framework.js';
import { _egBossCorrupted } from '../combat-state.js';
import { _egNkAbilityHitToast, _egNkDodgeBusy, _egNkDotHit, _egNkEl, _egNkFrozen, _egNkHit, _egNkKillRun, _egNkLoop, _egNkMaxHP, _egNkNewRun, _egNkPlayerCenter, _egNkPlayerRect, _egNkRuns, _egNkToast } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE BARRAGE (boss_barrage)---------------------------
//------------------------------------------------------------------------
// Fire artillery siege: a creeping shelling curtain rolls across the arena
// all fight while you clear cells between the shell lines. Supply-drop
// jammers and shot-shell shrapnel join at 60%; at ≤10% the FINAL BOMBARDMENT
// detonates everything except one untouched safe tile.
//
// Shared mechanics (corrupt_cells) live in shared-boss-abilities.js and are
// referenced by handler-name string.
//------------------------------------------------------------------------

// DEBUG: slow The Barrage's timing 2.5x so manual playtests / screenshot
// automation can catch mid-animation states. Off for ship.
export const _EG_BAR_DEBUG_SLOW = false;
export const _EG_BAR_DEBUG_MULT = _EG_BAR_DEBUG_SLOW ? 2.5 : 1;

Object.assign(EG_BOSS_DEFS, {
    boss_barrage: {
        id: 'boss_barrage', name: 'The Barrage', emoji: '🍎',
        baseHP: 1000, baseDamage: 22, chargeMax: 12,
        element: 'fire', resistances: { fire: 30, cold: 15, lightning: 15, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {

    // boss_barrage - "The War-Machine Brute" (rework)
    // Phase 1 (100% → 60%): Shelling Curtain + Corrupt Cells
    // Phase 2 ( 60% → 30%): immune window; Supply Drop + Shot Shells + Bomb
    //                        Barrage (hide next to the crates) join
    // Phase 3 ( 30% →  0%): curtain comes from the top as well; at 10% the
    //                        FINAL BOMBARDMENT begins
    boss_barrage: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 8, damageMultiplier: 1.55 },
            { threshold: 0.30, chargeMax: 5, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'shelling_curtain', intervalBase: 12000, intervalVariance: 3000, handler: '_egMechBarCurtain' },
            { name: 'corrupt_cells', intervalBase: 15000, intervalVariance: 3500, handler: '_egMechCorruptCells' },
            { name: 'supply_drop', intervalBase: 17000, intervalVariance: 4000, handler: '_egMechBarSupplyDrop', phase2Only: true },
            { name: 'shot_shells', intervalBase: 15000, intervalVariance: 4000, handler: '_egMechBarShotShells', phase2Only: true },
            { name: 'bomb_barrage', intervalBase: 30000, intervalVariance: 6000, handler: '_egMechBarBombBarrage', phase2Only: true },
        ],
        onPhaseEnter: _egBarOnPhaseEnter,
    },
});


// ── Shared tuning (per-mechanic constants live with their mechanics) ────────
export const EG_BAR_TOUCH_CD_MS = 700;       // shared touch cooldown
export const EG_BAR_HEAL_PCT    = 0.15;      // %maxHP crate-clear heal (proven reward pattern)


//------------------------------------------------------------------------
//-------------------SHARED VISUAL HELPERS---------------------------------
//------------------------------------------------------------------------

// Touch damage helper shared by all Barrage hazards. Returns true if a hit
// was rolled (respects the per-touch cooldown).
export let _egBarHitCd = 0;
export function _egBarTouch(pct, level, label) {
    const now = performance.now();
    if (now < _egBarHitCd) return false;
    const pr = _egNkPlayerRect();
    if (!pr) return false;
    _egBarHitCd = now + EG_BAR_TOUCH_CD_MS;
    const dealt = _egNkHit(pct, 'fire', level);
    _egNkAbilityHitToast(dealt, 'The Barrage', label);
    return true;
}

// Player centre with a screen-centre fallback.
export function _egBarPC() { const c = _egNkPlayerCenter(); return c || { x: window.innerWidth / 2, y: window.innerHeight / 2 }; }

// Proven reward pattern (Siren echo zones / Swarm royal jelly): heals go
// through a guarded clamp + rerender.
export function _egBarHeal(amount) {
    if (typeof playerCurrentHP === 'undefined') return;
    const before = globalThis.playerCurrentHP;
    globalThis.playerCurrentHP = Math.min(globalThis.playerMaxHP || before, before + (globalThis._egLifeGain ? globalThis._egLifeGain(amount) : (amount)));
    if (globalThis.playerCurrentHP !== before && typeof _renderPlayerHealth === 'function') globalThis._renderPlayerHealth();
}


//------------------------------------------------------------------------
//-------------------SIGNATURE: SHELLING CURTAIN (all fight)---------------
//------------------------------------------------------------------------
// A creeping wall of shell splashes advances across the arena each cast, from
// the left OR the right edge (random). The telegraph stays visible while it
// rolls - fight INSIDE the barrage.
// Phase 3: the wall may also sweep top→bottom or bottom→top.
// The opening shrinks with every corrupted cell on the grid, so leaving the
// corruption alone makes the wall nearly impassable - dispel it.
export const EG_BAR_CURTAIN_W   = 120;        // splash band width (px)
export const EG_BAR_CURTAIN_DMG = [0, 0.13, 0.15, 0.17];  // %maxHP when the wall catches you
export const EG_BAR_CURTAIN_ROWS = [0, 4, 6]; // (legacy) splash rows per cast, by phase
const EG_BAR_GAP_MAX = 280;            // px opening with no corruption on the grid
const EG_BAR_GAP_MIN = 96;             // px opening floor (still passable)
const EG_BAR_GAP_PER_CORRUPT = 26;     // px the opening shrinks per corrupted cell
const EG_BAR_CURTAIN_SPEED = 0.30;     // screen widths per second

// Opening size for the current number of corrupted cells.
export function _egBarCurtainGapSize() {
    const corrupted = _egBossCorrupted ? _egBossCorrupted.size : 0;
    return Math.max(EG_BAR_GAP_MIN, EG_BAR_GAP_MAX - corrupted * EG_BAR_GAP_PER_CORRUPT);
}

export function _egMechBarCurtain(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _egNkNewRun(monster && monster.id, true);
    const speed = (W * EG_BAR_CURTAIN_SPEED) * _EG_BAR_DEBUG_MULT;      // px/s sweep speed
    const dirs = p >= 3 ? ['lr', 'rl', 'tb', 'bt'] : ['lr', 'rl'];
    const dir = dirs[Math.floor(Math.random() * dirs.length)];
    const fromTop = dir === 'tb' || dir === 'bt';     // wall runs along the top/bottom axis
    const reverse = dir === 'rl' || dir === 'bt';     // sweeping against the axis
    const span = fromTop ? W : H;        // length of the wall along its own axis
    const reach = fromTop ? H : W;       // distance the wall travels
    const GAP = _egBarCurtainGapSize();
    const corrupted = _egBossCorrupted ? _egBossCorrupted.size : 0;

    if (corrupted > 0) {
        _egNkToast('eg_mech_bar_curtain_corrupt', '🍎 SHELLING CURTAIN - ' + corrupted + ' corrupted cell' + (corrupted > 1 ? 's' : '') + ' shrink the gap - dispel them!', '#ff6b35');
    } else {
        _egNkToast('eg_mech_bar_curtain', '🍎 SHELLING CURTAIN - get into the GAP before the wall reaches you!', '#ff6b35');
    }

    // The wall has one opening. Stand inside it when the wall passes.
    const gapC = span * (0.2 + Math.random() * 0.6);
    const gapLo = gapC - GAP / 2;
    const gapHi = gapC + GAP / 2;
    const cls = 'eg-bar-curtain' + (fromTop ? ' eg-bar-curtain-v' : '') + (reverse ? ' eg-bar-curtain-rev' : '');
    const pieces = [[0, gapLo], [gapHi, span]].map(([lo, hi]) => ({
        lo, hi, el: _egNkEl(run, 'div', cls),
    }));
    const gapEl = _egNkEl(run, 'div', 'eg-bar-gap' + (fromTop ? ' eg-bar-gap-v' : ''), 'GAP');

    let x = reverse ? reach : -EG_BAR_CURTAIN_W;
    const sign = reverse ? -1 : 1;
    let hit = false;
    const splashes = [];
    let lastSplash = 0;
    _egNkLoop(run, (dtS, now) => {
        x += sign * speed * dtS;
        // Splash dots inside the wall for readability (never inside the gap).
        if (now - lastSplash > 90) {
            lastSplash = now;
            for (let i = 0; i < 3; i++) {
                const along = Math.random() * span;
                if (along > gapLo && along < gapHi) continue;
                const el = _egNkEl(run, 'div', 'eg-bar-splash');
                const sw = fromTop
                    ? [Math.round(along - 6), Math.round(x - 8)]
                    : [Math.round(x - 8), Math.round(along - 6)];
                el.style.left = sw[0] + 'px';
                el.style.top = sw[1] + 'px';
                splashes.push({ el, born: now });
            }
        }
        for (let i = splashes.length - 1; i >= 0; i--) {
            if (now - splashes[i].born > 700) { try { splashes[i].el.remove(); } catch (e) {} splashes.splice(i, 1); }
        }
        // Draw the advancing wall (two pieces around the gap).
        pieces.forEach(pc2 => {
            const len = Math.max(0, pc2.hi - pc2.lo);
            if (fromTop) {
                pc2.el.style.left = Math.round(pc2.lo) + 'px'; pc2.el.style.top = Math.round(x) + 'px';
                pc2.el.style.width = Math.round(len) + 'px'; pc2.el.style.height = EG_BAR_CURTAIN_W + 'px';
            } else {
                pc2.el.style.left = Math.round(x) + 'px'; pc2.el.style.top = Math.round(pc2.lo) + 'px';
                pc2.el.style.width = EG_BAR_CURTAIN_W + 'px'; pc2.el.style.height = Math.round(len) + 'px';
            }
        });
        if (fromTop) {
            gapEl.style.left = Math.round(gapLo) + 'px'; gapEl.style.top = Math.round(x) + 'px';
            gapEl.style.width = GAP + 'px'; gapEl.style.height = EG_BAR_CURTAIN_W + 'px';
        } else {
            gapEl.style.left = Math.round(x) + 'px'; gapEl.style.top = Math.round(gapLo) + 'px';
            gapEl.style.width = EG_BAR_CURTAIN_W + 'px'; gapEl.style.height = GAP + 'px';
        }
        // One real hit (with feedback) if the wall passes over you outside the gap.
        const pc = _egBarPC();
        const across = fromTop ? pc.y : pc.x;
        const along = fromTop ? pc.x : pc.y;
        const inBand = across > x && across < x + EG_BAR_CURTAIN_W;
        const inGap = along > gapLo + 12 && along < gapHi - 12;
        if (inBand && !inGap && !hit) {
            hit = true;
            const dealt = _egNkHit(EG_BAR_CURTAIN_DMG[p], 'fire', level);
            _egNkAbilityHitToast(dealt, 'The Barrage', 'Shelling Curtain');
        }
        // Done once the wall crosses the far edge.
        if (reverse ? x < -EG_BAR_CURTAIN_W : x > reach + EG_BAR_CURTAIN_W) return false;
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------ACT II: SUPPLY DROP (60%)-----------------------------
//------------------------------------------------------------------------
// Cargo crates crash down (slam telegraphs); each flips open into a small
// artillery JAMMER that lobs slow mortar shells at your last position.
// Destructible: step into one to smash it (small heal - proven reward
// pattern). Two crates in phase 2, three in phase 3.
export const EG_BAR_DROP_WARN_MS  = 1500;
export const EG_BAR_JAMMER_LIFE   = 12000;     // ms a jammer stays live
export const EG_BAR_JAMMER_SHELL_DMG = [0, 0, 0.09, 0.10];
export const EG_BAR_JAMMER_SHELL_SPD = 150;    // px/s
export const EG_BAR_JAMMER_LOB_MS = 2600;      // ms between mortar lobs

// Live supply-drop crates (read by the Bomb Barrage, which uses them as cover).
export const _egBarCrates = [];

export function _egMechBarSupplyDrop(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _egNkNewRun(monster && monster.id, true);
    const count = p >= 3 ? 3 : 2;

    _egNkToast('eg_mech_bar_supply', '📦 SUPPLY DROP - artillery jammers landing! Smash them before they dig in!', '#ff6b35');

    const spots = [];
    for (let i = 0; i < count; i++) {
        // Prefer grid-ish spots away from the player's current position.
        let sx = W * (0.18 + Math.random() * 0.64);
        let sy = H * (0.18 + Math.random() * 0.5);
        if (i > 0 && Math.hypot(sx - spots[i-1].x, sy - spots[i-1].y) < 180) { sx += 220; sy += 90; }
        spots.push({ x: sx, y: sy });
    }

    const warnEls = [];
    spots.forEach(s => {
        const el = _egNkEl(run, 'div', 'eg-bar-drop-warn');
        el.style.left = Math.round(s.x - 42) + 'px';
        el.style.top = Math.round(s.y - 42) + 'px';
        warnEls.push(el);
    });

    let t = 0;
    let landed = false;
    _egNkLoop(run, (dtS, now) => {
        t += dtS * 1000;
        if (!landed && t >= EG_BAR_DROP_WARN_MS * _EG_BAR_DEBUG_MULT) {
            landed = true;
            warnEls.forEach(el => { try { el.remove(); } catch (e) {} });
            // Landed crates → artillery jammers.
            spots.forEach(s => {
                const el = _egNkEl(run, 'div', 'eg-bar-jammer', '📦');
                el.style.left = Math.round(s.x - 26) + 'px';
                el.style.top = Math.round(s.y - 26) + 'px';
                s.jammerEl = el;
                s.lastLob = 0;
                s.born = now;
                s.dead = false;
                _egBarCrates.push(s);
            });
        }
        if (!landed) return true;

        const pr = _egNkPlayerRect();
        const pc = _egBarPC();
        let active = false;
        for (const s of spots) {
            if (s.dead) continue;
            active = true;
            // Player smash: step into the crate to destroy it (heal reward).
            // Not while a bomb barrage runs - then the crates are your cover.
            if (!_egBarBombLive() && pr && Math.hypot(pc.x - s.x, pc.y - s.y) < 46) {
                s.dead = true;
                try { s.jammerEl.remove(); } catch (e) {}
                _egBarHeal(_egNkMaxHP() * EG_BAR_HEAL_PCT);
                _egNkToast('eg_mech_bar_crate', '📦 Crate smashed! The supplies patch you up!', '#4ade80');
                continue;
            }
            // Mortar lobs at your last position: a slow shell arcs in and
            // lands at a remembered spot.
            if (now - (s.lastLob || 0) > EG_BAR_JAMMER_LOB_MS * _EG_BAR_DEBUG_MULT) {
                s.lastLob = now;
                const targetX = pc.x + (Math.random() * 160 - 80);
                const targetY = pc.y + (Math.random() * 160 - 80);
                const shell = _egNkEl(run, 'div', 'eg-nk-dot eg-bar-mortar', '💥');
                shell.style.left = Math.round(s.x - 9) + 'px';
                shell.style.top = Math.round(s.y - 9) + 'px';
                const dist = Math.hypot(targetX - s.x, targetY - s.y);
                const flightMs = Math.max(600, (dist / EG_BAR_JAMMER_SHELL_SPD) * 1000) * _EG_BAR_DEBUG_MULT;
                s.lob = { shell, sx: s.x, sy: s.y, tx: targetX, ty: targetY, t: 0, flightMs, done: false };
            }
            // Advance the in-flight shell.
            if (s.lob && !s.lob.done) {
                const L = s.lob;
                L.t += dtS * 1000;
                const f = Math.min(1, L.t / L.flightMs);
                const cx = L.sx + (L.tx - L.sx) * f;
                const cy = L.sy + (L.ty - L.sy) * f;
                // Arc: rise then fall, purely cosmetic but sells the lob.
                const lift = Math.sin(f * Math.PI) * 60;
                L.shell.style.left = Math.round(cx - 9) + 'px';
                L.shell.style.top = Math.round(cy - 9 - lift) + 'px';
                if (f >= 1) {
                    L.done = true;
                    try { L.shell.remove(); } catch (e) {}
                    // Impact ring at the landing spot.
                    const boom = _egNkEl(run, 'div', 'eg-bar-mortar-boom');
                    boom.style.left = Math.round(L.tx - 34) + 'px';
                    boom.style.top = Math.round(L.ty - 34) + 'px';
                    setTimeout(() => { try { boom.remove(); } catch (e) {} }, 500 * _EG_BAR_DEBUG_MULT);
                    if (pr && Math.hypot(pc.x - L.tx, pc.y - L.ty) < 44) {
                        _egBarTouch(EG_BAR_JAMMER_SHELL_DMG[p], level, 'Mortar Shell');
                    }
                }
            }
            // Jammers expire after their battery runs dry (never mid-barrage:
            // they are the player's shelter).
            if (!_egBarBombLive() && now - (s.born || 0) > EG_BAR_JAMMER_LIFE * _EG_BAR_DEBUG_MULT) {
                s.dead = true;
                try { s.jammerEl.remove(); } catch (e) {}
            }
        }
        return active;
    });
}


//------------------------------------------------------------------------
//-------------------ACT II: SHOT SHELLS (60%)-----------------------------
//------------------------------------------------------------------------
// Heavy shells fall on telegraphed rings; each burst scatters hot shrapnel
// that keeps travelling. Impact ring + fragment lanes - read both.
export const EG_BAR_SHELL_COUNT  = [0, 0, 3, 4];
export const EG_BAR_SHELL_WARN_MS = 1600;
export const EG_BAR_SHELL_DMG    = [0, 0, 0.15, 0.17];   // %maxHP caught in the ring
export const EG_BAR_SHRAP_DMG    = [0, 0, 0.055, 0.065]; // %maxHP shrapnel touch
export const EG_BAR_SHRAP_SPD    = 190;                  // px/s
export const EG_BAR_SHRAP_LIFE   = 2600;                 // ms shrapnel stays hot

export function _egMechBarShotShells(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _egNkNewRun(monster && monster.id, true);
    _egNkToast('eg_mech_bar_shells', '🍎 SHOT SHELLS - heavy shells incoming, mind the shrapnel!', '#ff6b35');

    const shells = [];
    for (let i = 0; i < EG_BAR_SHELL_COUNT[p]; i++) {
        // Most shells aim near where you are (or were), one random.
        const pc = _egBarPC();
        const near = i < EG_BAR_SHELL_COUNT[p] - 1;
        const x = near ? pc.x + (Math.random() * 260 - 130) : Math.random() * W;
        const y = near ? pc.y + (Math.random() * 260 - 130) : Math.random() * H;
        const warn = _egNkEl(run, 'div', 'eg-bar-shell-warn');
        warn.style.left = Math.round(x - 46) + 'px';
        warn.style.top = Math.round(y - 46) + 'px';
        shells.push({ x, y, warn, born: performance.now(), struck: false });
    }

    const shrap = [];
    _egNkLoop(run, (dtS, now) => {
        const pr = _egNkPlayerRect();
        const pc = _egBarPC();
        let pending = false;
        for (const s of shells) {
            if (s.struck) continue;
            pending = true;
            if (now - s.born >= EG_BAR_SHELL_WARN_MS * _EG_BAR_DEBUG_MULT) {
                s.struck = true;
                try { s.warn.remove(); } catch (e) {}
                const boom = _egNkEl(run, 'div', 'eg-bar-shell-boom');
                boom.style.left = Math.round(s.x - 52) + 'px';
                boom.style.top = Math.round(s.y - 52) + 'px';
                setTimeout(() => { try { boom.remove(); } catch (e) {} }, 500 * _EG_BAR_DEBUG_MULT);
                if (pr && Math.hypot(pc.x - s.x, pc.y - s.y) < 52) {
                    _egBarTouch(EG_BAR_SHELL_DMG[p], level, 'Shot Shell');
                }
                // Shrapnel scatter: 6 spokes per burst, keeps travelling.
                for (let k = 0; k < 6; k++) {
                    const a = (k / 6) * Math.PI * 2 + Math.random() * 0.35;
                    const el = _egNkEl(run, 'div', 'eg-nk-dot eg-bar-shrap', '🔥');
                    shrap.push({ x: s.x, y: s.y, vx: Math.cos(a) * EG_BAR_SHRAP_SPD, vy: Math.sin(a) * EG_BAR_SHRAP_SPD, t: 0, hitDone: false, el });
                }
            }
        }
        // Advance shrapnel dots.
        for (let i = shrap.length - 1; i >= 0; i--) {
            const o = shrap[i];
            o.t += dtS * 1000;
            o.x += o.vx * dtS;
            o.y += o.vy * dtS;
            if (o.t > EG_BAR_SHRAP_LIFE * _EG_BAR_DEBUG_MULT || o.x < -30 || o.x > W + 30 || o.y < -30 || o.y > H + 30) {
                try { o.el.remove(); } catch (e) {}
                shrap.splice(i, 1);
                continue;
            }
            o.el.style.transform = 'translate(' + Math.round(o.x - 9) + 'px,' + Math.round(o.y - 9) + 'px)';
            if (!o.hitDone && pr && now >= (_egBarShrapCd || 0)) {
                if (_egNkDotHit(o.el, pr)) {
                    o.hitDone = true;
                    _egBarShrapCd = now + 500;
                    const dealt = _egNkHit(EG_BAR_SHRAP_DMG[p], 'fire', level);
                    _egNkAbilityHitToast(dealt, 'The Barrage', 'Shell Shrapnel');
                }
            }
        }
        return pending || shrap.length > 0;
    });
}
export let _egBarShrapCd = 0;


//------------------------------------------------------------------------
//-------------------ACT II: BOMB BARRAGE (60%)----------------------------
//------------------------------------------------------------------------
// The boss opens up with a dense rain of telegraphed explosive bombs - too
// many to simply dodge. The answer is the supply-drop CRATES: standing in a
// crate's shelter makes you immune to the bombs, but every bomb that lands on
// a crate chews it up (3 hits and it is gone), so you have to hop between
// shelters. Sheltering also heals a little each second. If fewer than two
// crates are standing, the barrage drops cover crates first.
export const EG_BAR_BOMB_DMG      = [0, 0, 0.12, 0.14];   // %maxHP when a bomb catches you
export const EG_BAR_BOMB_WARN_MS  = 1050;                 // ring telegraph before the blast
export const EG_BAR_BOMB_TOTAL    = [0, 0, 26, 38];       // bombs per barrage
export const EG_BAR_BOMB_EVERY_MS = [0, 0, 250, 190];     // gap between bombs
const EG_BAR_BOMB_RADIUS   = 62;    // blast radius (px)
const EG_BAR_COVER_RADIUS  = 112;   // you are safe this close to a live crate
const EG_BAR_CRATE_HP      = 3;     // bombs a crate soaks up
const EG_BAR_COVER_DROP_MS = 1100;  // cover crates falling in
const EG_BAR_COVER_HEAL_PCT = 0.03; // %maxHP restored per second while sheltered
let _egBarBombRun = null;

// True while a barrage is running (supply-drop crates then act as cover).
export function _egBarBombLive() {
    return !!_egBarBombRun && Array.from(_egNkRuns.values()).includes(_egBarBombRun);
}

export function _egMechBarBombBarrage(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen() || _egBarBombRun) return;
    const p = Math.max(2, Math.min(3, Number(phase) || 2));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _egNkNewRun(monster && monster.id, true);
    _egBarBombRun = run;

    // Shelter: the live supply-drop crates, topped up to two with cover crates.
    for (let i = _egBarCrates.length - 1; i >= 0; i--) if (_egBarCrates[i].dead) _egBarCrates.splice(i, 1);
    const crates = _egBarCrates.slice();
    const coverCrates = [];
    for (let i = crates.length; i < 2; i++) {
        let sx = W * (0.2 + Math.random() * 0.6);
        const sy = H * (0.22 + Math.random() * 0.46);
        if (coverCrates.length && Math.abs(sx - coverCrates[0].x) < 260) sx = coverCrates[0].x + (sx < coverCrates[0].x ? -260 : 260);
        sx = Math.max(W * 0.1, Math.min(W * 0.9, sx));
        const warn = _egNkEl(run, 'div', 'eg-bar-drop-warn');
        warn.style.left = Math.round(sx - 42) + 'px';
        warn.style.top = Math.round(sy - 42) + 'px';
        coverCrates.push({ x: sx, y: sy, warn, el: null, ring: null, landed: false, cover: true, dead: false, hp: EG_BAR_CRATE_HP });
    }
    _egNkToast('eg_mech_bar_bombs', '💣 BOMB BARRAGE - TAKE COVER next to a crate! Bombs wear the crates down - keep moving between them!', '#ff6b35');

    const ringFor = (c) => {
        const ring = _egNkEl(run, 'div', 'eg-bar-cover-ring');
        ring.style.left = Math.round(c.x - EG_BAR_COVER_RADIUS) + 'px';
        ring.style.top = Math.round(c.y - EG_BAR_COVER_RADIUS) + 'px';
        ring.style.width = ring.style.height = (EG_BAR_COVER_RADIUS * 2) + 'px';
        return ring;
    };
    crates.forEach(c => { c.hp = EG_BAR_CRATE_HP; c.ring = ringFor(c); });

    const total = EG_BAR_BOMB_TOTAL[p];
    const every = EG_BAR_BOMB_EVERY_MS[p] * _EG_BAR_DEBUG_MULT;
    const bombs = [];
    let t = 0, spawned = 0, nextSpawn = 0, bombCd = 0, finished = false, healAcc = 0;

    const standing = () => crates.concat(coverCrates).filter(c => !c.dead && (!c.cover || c.landed));
    const sheltered = (pc) => standing().some(c => Math.hypot(pc.x - c.x, pc.y - c.y) < EG_BAR_COVER_RADIUS);
    const wearCrate = (c) => {
        c.hp -= 1;
        if (c.cover && c.el) {
            c.el.classList.add('eg-bar-crate-hit');
            setTimeout(() => { try { c.el.classList.remove('eg-bar-crate-hit'); } catch (e) {} }, 220);
        }
        if (c.hp <= 0) {
            c.dead = true;
            try { if (c.cover && c.el) c.el.remove(); } catch (e) {}
            try { if (!c.cover && c.jammerEl) c.jammerEl.remove(); } catch (e) {}
            try { if (c.ring) c.ring.remove(); } catch (e) {}
        }
    };

    _egNkLoop(run, (dtS) => {
        t += dtS * 1000;
        // Sheltering behind a crate patches you up: a steady trickle of Life
        // for as long as you stand in its cover (the supplies work for you).
        if (sheltered(_egBarPC())) {
            healAcc += dtS;
            if (healAcc >= 1) {
                healAcc -= 1;
                _egBarHeal(_egNkMaxHP() * EG_BAR_COVER_HEAL_PCT);
            }
        } else {
            healAcc = 0;
        }
        // Cover crates land after their warning.
        if (t >= EG_BAR_COVER_DROP_MS * _EG_BAR_DEBUG_MULT) {
            coverCrates.forEach(c => {
                if (c.landed) return;
                c.landed = true;
                try { c.warn.remove(); } catch (e) {}
                c.el = _egNkEl(run, 'div', 'eg-bar-jammer eg-bar-cover-crate', '📦');
                c.el.style.left = Math.round(c.x - 26) + 'px';
                c.el.style.top = Math.round(c.y - 26) + 'px';
                c.ring = ringFor(c);
            });
        }
        const ready = t >= (EG_BAR_COVER_DROP_MS + 300) * _EG_BAR_DEBUG_MULT;
        // Bomb after bomb: every third one is aimed straight at the player.
        if (ready && spawned < total && t >= nextSpawn) {
            nextSpawn = t + every;
            const pc = _egBarPC();
            const aimed = spawned % 3 === 0;
            const bx = aimed ? pc.x + (Math.random() * 60 - 30) : W * (0.05 + Math.random() * 0.9);
            const by = aimed ? pc.y + (Math.random() * 60 - 30) : H * (0.08 + Math.random() * 0.84);
            const warn = _egNkEl(run, 'div', 'eg-bar-bomb-warn', '💣');
            warn.style.left = Math.round(bx - EG_BAR_BOMB_RADIUS) + 'px';
            warn.style.top = Math.round(by - EG_BAR_BOMB_RADIUS) + 'px';
            bombs.push({ x: bx, y: by, warn, born: t });
            spawned++;
        }
        // Detonations.
        for (let i = bombs.length - 1; i >= 0; i--) {
            const b = bombs[i];
            if (t - b.born < EG_BAR_BOMB_WARN_MS * _EG_BAR_DEBUG_MULT) continue;
            bombs.splice(i, 1);
            try { b.warn.remove(); } catch (e) {}
            const boom = _egNkEl(run, 'div', 'eg-bar-bomb-boom');
            boom.style.left = Math.round(b.x - EG_BAR_BOMB_RADIUS) + 'px';
            boom.style.top = Math.round(b.y - EG_BAR_BOMB_RADIUS) + 'px';
            setTimeout(() => { try { boom.remove(); } catch (e) {} }, 450 * _EG_BAR_DEBUG_MULT);
            // A crate caught in the blast soaks it up.
            standing().forEach(c => { if (Math.hypot(b.x - c.x, b.y - c.y) < EG_BAR_BOMB_RADIUS + 22) wearCrate(c); });
            const pc = _egBarPC();
            if (_egNkPlayerRect() && Math.hypot(pc.x - b.x, pc.y - b.y) < EG_BAR_BOMB_RADIUS && !sheltered(pc) && t >= bombCd) {
                bombCd = t + 350;
                const dealt = _egNkHit(EG_BAR_BOMB_DMG[p], 'fire', level);
                _egNkAbilityHitToast(dealt, 'The Barrage', 'Explosive Bomb');
            }
        }
        if (spawned >= total && !bombs.length && !finished) {
            finished = true;
            coverCrates.forEach(c => {
                c.dead = true;
                try { if (c.el) c.el.remove(); } catch (e) {}
                try { if (c.ring) c.ring.remove(); } catch (e) {}
                try { c.warn.remove(); } catch (e) {}
            });
            crates.forEach(c => { try { if (c.ring) c.ring.remove(); } catch (e) {} });
            _egBarBombRun = null;
            return false;
        }
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------FINALE: FINAL BOMBARDMENT (≤10%, one-shot)------------
//------------------------------------------------------------------------
// The whole arena becomes the target zone: THREE massive strikes light up
// one at a time (each a widening volley of safe gaps), then the ALL-OUT
// SALVO detonates everything except the single untouched safe tile. Charge
// bar frozen (gate in _egTickPlayer via _egBarFinalActive).
export const EG_BAR_VOLLEYS   = 3;       // big strikes before the salvo
const EG_BAR_WALK_PX_S = 320;     // avatar speed (AVATAR_MOVE_SPEED_PX_PER_SEC)
const EG_BAR_REACT_MS  = 700;     // reaction time we always leave the player

// Picks a tile index whose centre the player can really reach before the
// strike lands: within walk-speed x (telegraph - reaction), but not the tile
// they already stand on (so there is something to do).
function _egBarReachableTile(cols, rows, cw, rh, telegraphMs) {
    const pc = _egBarPC();
    const reach = Math.max(150, EG_BAR_WALK_PX_S * Math.max(0, telegraphMs - EG_BAR_REACT_MS) / 1000 * 0.9);
    const ok = [], near = [];
    for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
            const d = Math.hypot(pc.x - (c * cw + cw / 2), pc.y - (r * rh + rh / 2));
            if (d <= reach) { near.push([c, r]); if (d >= Math.max(cw, rh) * 0.9) ok.push([c, r]); }
        }
    }
    const pool = ok.length ? ok : (near.length ? near : [[Math.floor(cols / 2), Math.floor(rows / 2)]]);
    return pool[Math.floor(Math.random() * pool.length)];
}
export const EG_BAR_VOLLEY_GAP = 4600;   // ms between strikes

// Set while the finale runs (read by _egTickPlayer's charge-freeze gate).
export let _egBarFinal = null;

export function _egBarFinalActive() {
    return !!_egBarFinal && !_egBarFinal.finished;
}

// Phase-enter hook: starts the ≤10% HP watcher (the framework only calls
// onPhaseEnter on transitions, so a dive from 30% → 10% needs its own gate).
export function _egBarOnPhaseEnter(monster, newPhase) {
    if (newPhase !== 3) return false;
    try { _egBarStartFinalWatcher(monster); } catch (e) {}
    return false;
}

export function _egBarStartFinalWatcher(monster) {
    if (!monster || _egBarFinal) return;
    const run = _egNkNewRun(monster.id, true);
    run.passive = true;
    _egNkLoop(run, () => {
        if (_egBarFinal) return false;
        try {
            if (monster.currentHP <= monster.maxHP * 0.10) {
                _egBarFinalStart(monster);
                return false;
            }
        } catch (e) { return false; }
        return true;
    });
}

// Pause-safe timeout: if the game freezes mid-wait, retry until thawed
// instead of firing during the pause (mirrors the other finales).
export function _egBarAfter(g, ms, fn) {
    const t0 = performance.now();
    const step = () => {
        if (g.finished || !_egBarFinal) return;
        if (_egNkFrozen()) { setTimeout(step, 120); return; }
        if (performance.now() - t0 >= ms) fn();
        else setTimeout(step, Math.min(120, ms - (performance.now() - t0)));
    };
    setTimeout(step, Math.min(120, ms));
}

export function _egBarFinalStart(monster) {
    if (_egBarFinal || !monster) return;

    // The guns go quiet for everything else: kill every other run of this
    // boss (the finale owns the board).
    Array.from(_egNkRuns.values()).forEach(r => {
        if (r.bossId === monster.id) { try { _egNkKillRun(r); } catch (e) {} }
    });

    const W = window.innerWidth, H = window.innerHeight;
    const g = {
        monsterId: monster.id,
        finished: false,
        volley: 0,
        overlay: null, fxRun: null,
        salvoTiles: [], safe: null, salvoEl: null,
    };
    _egBarFinal = g;

    // Freeze the auto-attack charge bar for the whole set-piece (the gate
    // lives in _egTickPlayer; this class is the visual twin).
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('eg-charge-paused');
    });

    // FX run (passive): holds the finale timeline.
    g.fxRun = _egNkNewRun(monster.id, true);
    g.fxRun.passive = true;

    // Countdown overlay.
    const ov = document.createElement('div');
    ov.className = 'eg-bar-cd';
    ov.innerHTML =
        '<div class="eg-bar-cd-label">🍎 FINAL BOMBARDMENT</div>' +
        '<div class="eg-bar-cd-hint">Three strikes - then the ALL-OUT SALVO. Run to a GREEN tile each time!</div>';
    document.body.appendChild(ov);
    g.overlay = ov;

    _egNkToast('eg_mech_bar_final_cd', '🍎💀 FINAL BOMBARDMENT - read the volleys, find the safe tile!', '#ff6b35');

    // Boss immunity for the whole set-piece (released at the end).
    monster.bossImmune = true;

    // The boss card wears the all-out war-machine while the finale runs.
    const card = document.getElementById('eg-card-' + monster.id);
    const wrap = card ? (card.querySelector('.eg-emoji-wrapper') || card) : null;
    if (wrap) {
        wrap.classList.add('eg-bar-allin');
        wrap.classList.add('eg-nk-shielded');
    }

    const level = monster.level || 1;

    // ── One massive strike: a widening volley with safe gaps. ────────────
    const runVolley = () => {
        if (g.finished) return;
        g.volley++;
        if (g.volley > EG_BAR_VOLLEYS) {
            runSalvo();
            return;
        }
        _egNkToast('eg_mech_bar_volley', '🍎 Strike ' + g.volley + '/' + EG_BAR_VOLLEYS + ' - read the gaps!', '#ff6b35');

        // Each strike: a full-screen shelling grid with 2 safe gaps that
        // wander slightly between volleys. Telegraphed 2.2s.
        const cols = 8, rows = 6;
        const cw = W / cols, rh = H / rows;
        // One safe cell is always within the player's reach; the second is random.
        const reach1 = _egBarReachableTile(cols, rows, cw, rh, 2200 * _EG_BAR_DEBUG_MULT);
        const safeCols = [reach1[0], Math.floor(Math.random() * cols)];
        const safeRows = [reach1[1], Math.floor(Math.random() * rows)];
        g.fxRun.els.forEach(el => { try { if (el.classList && el.classList.contains('eg-bar-strike')) el.remove(); } catch (e) {} });
        const cells = [];
        for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
                const isSafe = (c === safeCols[0] && r === safeRows[0]) || (c === safeCols[1] && r === safeRows[1]);
                const el = _egNkEl(g.fxRun, 'div', 'eg-bar-strike' + (isSafe ? ' eg-bar-strike-safe' : ''));
                el.style.left = Math.round(c * cw) + 'px';
                el.style.top = Math.round(r * rh) + 'px';
                el.style.width = Math.ceil(cw) + 'px';
                el.style.height = Math.ceil(rh) + 'px';
                cells.push({ isSafe, el, x: c * cw + cw / 2, y: r * rh + rh / 2, hw: cw / 2, hh: rh / 2 });
            }
        }

        _egBarAfter(g, 2200 * _EG_BAR_DEBUG_MULT, () => {
            if (g.finished) return;
            // STRIKE: every non-safe cell erupts.
            cells.forEach(c => { if (!c.isSafe) c.el.classList.add('eg-bar-strike-hot'); });
            const pc = _egBarPC();
            let caught = false;
            for (const c of cells) {
                if (c.isSafe) continue;
                if (Math.abs(pc.x - c.x) < c.hw && Math.abs(pc.y - c.y) < c.hh) { caught = true; break; }
            }
            if (caught) {
                const dealt = _egNkHit(0.20, 'fire', level);
                _egNkAbilityHitToast(dealt, 'The Barrage', 'Bombardment Strike ' + g.volley);
            }
            _egBarAfter(g, 900 * _EG_BAR_DEBUG_MULT, () => {
                if (g.finished) return;
                g.fxRun.els.forEach(el => { try { if (el.classList && el.classList.contains('eg-bar-strike')) el.remove(); } catch (e) {} });
                runVolley();
            });
        });
    };

    // ── The ALL-OUT SALVO: everything detonates except one safe tile. ────
    const runSalvo = () => {
        if (g.finished) return;
        _egNkToast('eg_mech_bar_salvo', '🍎💀 ALL-OUT SALVO - run to the GREEN tile!', '#ff6b35');

        const cols = 10, rows = 7;
        const cw = W / cols, rh = H / rows;
        // The one safe tile is always within reach of where the player stands.
        const [safeC, safeR] = _egBarReachableTile(cols, rows, cw, rh, 3300 * _EG_BAR_DEBUG_MULT);
        g.safe = { x: safeC * cw + cw / 2, y: safeR * rh + rh / 2, hw: cw / 2, hh: rh / 2 };
        g.salvoTiles = [];
        for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
                const isSafe = c === safeC && r === safeR;
                const el = _egNkEl(g.fxRun, 'div', 'eg-bar-strike' + (isSafe ? ' eg-bar-strike-safe eg-bar-safe-pulse' : ''));
                el.style.left = Math.round(c * cw) + 'px';
                el.style.top = Math.round(r * rh) + 'px';
                el.style.width = Math.ceil(cw) + 'px';
                el.style.height = Math.ceil(rh) + 'px';
                g.salvoTiles.push({ isSafe, el, x: c * cw + cw / 2, y: r * rh + rh / 2, hw: cw / 2, hh: rh / 2 });
            }
        }

        _egBarAfter(g, 3300 * _EG_BAR_DEBUG_MULT, () => {
            if (g.finished) return;
            g.salvoTiles.forEach(t => { if (!t.isSafe) t.el.classList.add('eg-bar-strike-hot'); });
            const pc = _egBarPC();
            let caught = true;
            for (const t of g.salvoTiles) {
                if (!t.isSafe) continue;
                if (Math.abs(pc.x - t.x) < t.hw && Math.abs(pc.y - t.y) < t.hh) { caught = false; break; }
    }
            if (caught) {
                const dealt = _egNkHit(0.35, 'fire', level);
                _egNkAbilityHitToast(dealt, 'The Barrage', 'All-Out Salvo');
            }
            _egBarAfter(g, 1400 * _EG_BAR_DEBUG_MULT, () => {
                _egBarFinalEnd(g, monster);
            });
        });
    };

    runVolley();
}


//------------------------------------------------------------------------
//-------------------FINALE END--------------------------------------------
//------------------------------------------------------------------------
// Ends the finale: releases immunity + charge bar and cleans the board.
export function _egBarFinalEnd(g, monster) {
    if (!g || g.finished) return;
    g.finished = true;
    try { if (g.fxRun) _egNkKillRun(g.fxRun); } catch (e) {}
    document.querySelectorAll('.eg-bar-strike, .eg-bar-cd').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    const card = document.getElementById('eg-card-' + g.monsterId);
    const wrap = card ? (card.querySelector('.eg-emoji-wrapper') || card) : null;
    if (wrap) {
        wrap.classList.remove('eg-bar-allin');
        wrap.classList.remove('eg-nk-shielded');
    }
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('eg-charge-paused');
    });
    try {
        const m = (typeof _egMonsters !== 'undefined') ? globalThis._egMonsters.find(x => x && x.id === g.monsterId) : null;
        if (m) m.bossImmune = false;
    } catch (e) {}
    void monster;
}


//------------------------------------------------------------------------
//-------------------TEARDOWN----------------------------------------------
//------------------------------------------------------------------------
// Called from _egBossCleanup on boss death AND from the encounter stop -
// removes every run element, overlay and body class this boss ever created.
export function _egBarTeardown() {
    if (_egBarFinal) { try { _egBarFinalEnd(_egBarFinal, null); } catch (e) {} _egBarFinal = null; }
    _egBarBombRun = null;
    _egBarCrates.length = 0;
    document.querySelectorAll('.eg-bar-curtain, .eg-bar-splash, .eg-bar-drop-warn, .eg-bar-jammer, ' +
        '.eg-bar-bomb-warn, .eg-bar-bomb-boom, .eg-bar-cover-ring, ' +
        '.eg-bar-mortar, .eg-bar-mortar-boom, .eg-bar-shell-warn, .eg-bar-shell-boom, .eg-bar-shrap, ' +
        '.eg-bar-strike, .eg-bar-cd').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    document.querySelectorAll('.eg-bar-allin').forEach(el => el.classList.remove('eg-bar-allin'));
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('eg-charge-paused');
    });
}


//------------------------------------------------------------------------
//-------------------PLAYTEST CONSOLE HOOK (dev only)----------------------
//------------------------------------------------------------------------
// Tiny console API for playtesting with stretched debug timings:
//   _EG_BAR_DEBUG.fire('curtain'|'supply'|'shells'|'bombs', phase) - runs one now
//   _EG_BAR_DEBUG.final()                                  - FINAL BOMBARDMENT now
if (typeof window !== 'undefined') {
    window._EG_BAR_DEBUG = {
        fire: (name, phase) => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? globalThis._egMonsters.find(m => m && m.baseId === 'boss_barrage') : null;
            if (!monster) return 'no barrage alive';
            const fn = name === 'curtain' ? _egMechBarCurtain
                : name === 'supply' ? _egMechBarSupplyDrop
                : name === 'shells' ? _egMechBarShotShells
                : name === 'bombs' ? _egMechBarBombBarrage : null;
            if (!fn) return 'unknown: ' + name;
            if (name !== 'curtain' && _egNkDodgeBusy()) return 'BLOCKED: dodge-busy (wait for the field to clear)';
            fn(monster, phase || monster.bossPhase || 1);
            return 'fired ' + name;
        },
        final: () => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? globalThis._egMonsters.find(m => m && m.baseId === 'boss_barrage') : null;
            if (!monster) return 'no barrage alive';
            _egBarFinalStart(monster);
            return 'FINAL BOMBARDMENT started';
        },
    };
}
