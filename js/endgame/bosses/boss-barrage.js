//------------------------------------------------------------------------
//-------------------BOSS: THE BARRAGE (boss_barrage)---------------------------
//------------------------------------------------------------------------
// TIER 8 REWORK — "The War-Machine Brute". artillery barrage theming. The
// fight is a creeping shelling curtain you fight THROUGH, not away from.
// Element: fire (keep — artillery, not apples).
//
//   • SHELLING CURTAIN (signature, all fight) — a creeping wall of shell
//     splashes advances across the arena each cast; the telegraph stays
//     visible while it rolls, so you fight inside the barrage and clear
//     puzzle cells between the shell lines. Phase 3: the curtain comes from
//     the top as well — fight on a diagonal front.
//   • SUPPLY DROP (60%) — cargo crates crash down (slam telegraphs); each
//     one flips open into a small artillery JAMMER that lobs slow mortar
//     shells at your last position. Destructible: step into one to smash it.
//   • SHOT SHELLS (60%) — heavy shells fall on telegraphed rings, each burst
//     scatters hot shrapnel that keeps travelling. Impact ring + fragment
//     lanes — read both.
//   • 💀 FINAL BOMBARDMENT (≤10%, one-shot finale) — the whole arena becomes
//     the target zone: THREE massive strikes light up one at a time (each a
//     widening volley), then the ALL-OUT SALVO detonates everything except
//     the single untouched safe tile. Charge bar frozen (gate in
//     _egTickPlayer via _egBarFinalActive).
//
// Tier scaling: every dodge run uses the shared EG_NK_TIER_FACTOR clock, so
// gentle tiers get longer telegraphs and brutal tiers tighter ones.
//
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule + hooks)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics (corrupt_cells) live in shared-boss-abilities.js and are
// referenced by handler-name string.
//------------------------------------------------------------------------

// DEBUG: slow The Barrage's timing 2.5x so manual playtests / screenshot
// automation can catch mid-animation states. Flip to false for ship.
const _EG_BAR_DEBUG_SLOW = true;
const _EG_BAR_DEBUG_MULT = _EG_BAR_DEBUG_SLOW ? 2.5 : 1;

Object.assign(EG_BOSS_DEFS, {
    boss_barrage: {
        id: 'boss_barrage', name: 'The Barrage', emoji: '🍎',
        baseHP: 1000, baseDamage: 22, chargeMax: 12,
        element: 'fire', resistances: { fire: 30, cold: 15, lightning: 15, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {

    // boss_barrage — "The War-Machine Brute" (rework)
    // Phase 1 (100% → 60%): Shelling Curtain + Corrupt Cells
    // Phase 2 ( 60% → 30%): immune window; Supply Drop + Shot Shells join
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
            { name: 'shelling_curtain', intervalBase: 19000, intervalVariance: 4500, handler: '_egMechBarCurtain' },
            { name: 'corrupt_cells', intervalBase: 17000, intervalVariance: 4000, handler: '_egMechCorruptCells' },
            { name: 'supply_drop', intervalBase: 22000, intervalVariance: 5000, handler: '_egMechBarSupplyDrop', phase2Only: true },
            { name: 'shot_shells', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechBarShotShells', phase2Only: true },
        ],
        onPhaseEnter: _egBarOnPhaseEnter,
    },
});


// ── Shared tuning (per-mechanic constants live with their mechanics) ────────
const EG_BAR_TOUCH_CD_MS = 700;       // shared touch cooldown
const EG_BAR_HEAL_PCT    = 0.15;      // %maxHP crate-clear heal (proven reward pattern)


//------------------------------------------------------------------------
//-------------------SHARED VISUAL HELPERS---------------------------------
//------------------------------------------------------------------------

// Touch damage helper shared by all Barrage hazards. Returns true if a hit
// was rolled (respects the per-touch cooldown).
let _egBarHitCd = 0;
function _egBarTouch(pct, level, label) {
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
function _egBarPC() { const c = _egNkPlayerCenter(); return c || { x: window.innerWidth / 2, y: window.innerHeight / 2 }; }

// Proven reward pattern (Siren echo zones / Swarm royal jelly): heals go
// through a guarded clamp + rerender.
function _egBarHeal(amount) {
    if (typeof playerCurrentHP === 'undefined') return;
    const before = playerCurrentHP;
    playerCurrentHP = Math.min(playerMaxHP || before, before + amount);
    if (playerCurrentHP !== before && typeof _renderPlayerHealth === 'function') _renderPlayerHealth();
}


//------------------------------------------------------------------------
//-------------------SIGNATURE: SHELLING CURTAIN (all fight)---------------
//------------------------------------------------------------------------
// A creeping wall of shell splashes advances across the arena each cast.
// The telegraph stays visible while it rolls — fight INSIDE the barrage.
// Phase 3: a second curtain sweeps from the top edge simultaneously, so the
// safe wedge is a moving diagonal.
const EG_BAR_CURTAIN_W   = 120;        // splash band width (px)
const EG_BAR_CURTAIN_DMG = [0, 0.13, 0.15, 0.17];  // %maxHP standing in the wall
const EG_BAR_CURTAIN_ROWS = [0, 4, 6]; // splash rows per cast, by phase

function _egMechBarCurtain(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _egNkNewRun(monster && monster.id, true);
    const speed = (W * 0.42) * _EG_BAR_DEBUG_MULT;      // px/s sweep speed
    const fromTop = p >= 3;

    _egNkToast('eg_mech_bar_curtain', '🍎 SHELLING CURTAIN — the wall of splashes advances! Fight through it!', '#ff6b35');

    // The curtain sweeps left→right (or top→bottom in phase 3), with the
    // leading edge telegraphed as a live splash band.
    let x = fromTop ? 0 : -EG_BAR_CURTAIN_W;
    const splashes = [];
    let lastSplash = 0;
    _egNkLoop(run, (dtS, now) => {
        x += speed * dtS;
        const isX = !fromTop;
        // Splash dots inside the wall for readability.
        if (now - lastSplash > 90) {
            lastSplash = now;
            for (let i = 0; i < 3; i++) {
                const along = fromTop ? Math.random() * W : Math.random() * H;
                const el = _egNkEl(run, 'div', 'eg-bar-splash');
                const sw = fromTop
                    ? [Math.round(along - 6), Math.round(x - 8)]
                    : [Math.round(x - 8), Math.round(along - 6)];
                el.style.left = sw[0] + 'px';
                el.style.top = sw[1] + 'px';
                splashes.push({ el, born: now });
            }
        }
        // Prune expired splashes.
        for (let i = splashes.length - 1; i >= 0; i--) {
            if (now - splashes[i].born > 700) { try { splashes[i].el.remove(); } catch (e) {} splashes.splice(i, 1); }
        }
        // Draw the advancing wall.
        if (!run.wallEl) {
            run.wallEl = _egNkEl(run, 'div', 'eg-bar-curtain' + (fromTop ? ' eg-bar-curtain-v' : ''));
        }
        const wall = run.wallEl;
        if (fromTop) {
            wall.style.left = '0px'; wall.style.top = Math.round(x) + 'px';
            wall.style.width = W + 'px'; wall.style.height = EG_BAR_CURTAIN_W + 'px';
        } else {
            wall.style.left = Math.round(x) + 'px'; wall.style.top = '0px';
            wall.style.width = EG_BAR_CURTAIN_W + 'px'; wall.style.height = H + 'px';
        }
        // Standing in the wall = heavy DoT chunked through the shared helper.
        const pc = _egBarPC();
        const inWall = fromTop
            ? (pc.y > x && pc.y < x + EG_BAR_CURTAIN_W)
            : (pc.x > x && pc.x < x + EG_BAR_CURTAIN_W);
        if (inWall) _egNkDotTick(run, EG_BAR_CURTAIN_DMG[p], dtS, level, 'fire');
        // Done once the wall crosses the far edge.
        if (x > (fromTop ? H : W) + EG_BAR_CURTAIN_W) return false;
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------ACT II: SUPPLY DROP (60%)-----------------------------
//------------------------------------------------------------------------
// Cargo crates crash down (slam telegraphs); each flips open into a small
// artillery JAMMER that lobs slow mortar shells at your last position.
// Destructible: step into one to smash it (small heal — proven reward
// pattern). Two crates in phase 2, three in phase 3.
const EG_BAR_DROP_WARN_MS  = 1500;
const EG_BAR_JAMMER_LIFE   = 12000;     // ms a jammer stays live
const EG_BAR_JAMMER_SHELL_DMG = [0, 0, 0.09, 0.10];
const EG_BAR_JAMMER_SHELL_SPD = 150;    // px/s
const EG_BAR_JAMMER_LOB_MS = 2600;      // ms between mortar lobs

function _egMechBarSupplyDrop(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _egNkNewRun(monster && monster.id, true);
    const count = p >= 3 ? 3 : 2;

    _egNkToast('eg_mech_bar_supply', '📦 SUPPLY DROP — artillery jammers landing! Smash them before they dig in!', '#ff6b35');

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
            if (pr && Math.hypot(pc.x - s.x, pc.y - s.y) < 46) {
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
            // Jammers expire after their battery runs dry.
            if (now - (s.born || 0) > EG_BAR_JAMMER_LIFE * _EG_BAR_DEBUG_MULT) {
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
// that keeps travelling. Impact ring + fragment lanes — read both.
const EG_BAR_SHELL_COUNT  = [0, 0, 3, 4];
const EG_BAR_SHELL_WARN_MS = 1600;
const EG_BAR_SHELL_DMG    = [0, 0, 0.15, 0.17];   // %maxHP caught in the ring
const EG_BAR_SHRAP_DMG    = [0, 0, 0.055, 0.065]; // %maxHP shrapnel touch
const EG_BAR_SHRAP_SPD    = 190;                  // px/s
const EG_BAR_SHRAP_LIFE   = 2600;                 // ms shrapnel stays hot

function _egMechBarShotShells(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _egNkNewRun(monster && monster.id, true);
    _egNkToast('eg_mech_bar_shells', '🍎 SHOT SHELLS — heavy shells incoming, mind the shrapnel!', '#ff6b35');

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
let _egBarShrapCd = 0;


//------------------------------------------------------------------------
//-------------------FINALE: FINAL BOMBARDMENT (≤10%, one-shot)------------
//------------------------------------------------------------------------
// The whole arena becomes the target zone: THREE massive strikes light up
// one at a time (each a widening volley of safe gaps), then the ALL-OUT
// SALVO detonates everything except the single untouched safe tile. Charge
// bar frozen (gate in _egTickPlayer via _egBarFinalActive).
const EG_BAR_VOLLEYS   = 3;       // big strikes before the salvo
const EG_BAR_VOLLEY_GAP = 4600;   // ms between strikes

// Set while the finale runs (read by _egTickPlayer's charge-freeze gate).
let _egBarFinal = null;

function _egBarFinalActive() {
    return !!_egBarFinal && !_egBarFinal.finished;
}

// Phase-enter hook: starts the ≤10% HP watcher (the framework only calls
// onPhaseEnter on transitions, so a dive from 30% → 10% needs its own gate).
function _egBarOnPhaseEnter(monster, newPhase) {
    if (newPhase !== 3) return false;
    try { _egBarStartFinalWatcher(monster); } catch (e) {}
    return false;
}

function _egBarStartFinalWatcher(monster) {
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
function _egBarAfter(g, ms, fn) {
    const t0 = performance.now();
    const step = () => {
        if (g.finished || !_egBarFinal) return;
        if (_egNkFrozen()) { setTimeout(step, 120); return; }
        if (performance.now() - t0 >= ms) fn();
        else setTimeout(step, Math.min(120, ms - (performance.now() - t0)));
    };
    setTimeout(step, Math.min(120, ms));
}

function _egBarFinalStart(monster) {
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
        '<div class="eg-bar-cd-hint">Three massive strikes — then the ALL-OUT SALVO. Read the volley gaps!</div>';
    document.body.appendChild(ov);
    g.overlay = ov;

    _egNkToast('eg_mech_bar_final_cd', '🍎💀 FINAL BOMBARDMENT — read the volleys, find the safe tile!', '#ff6b35');

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
        _egNkToast('eg_mech_bar_volley', '🍎 Strike ' + g.volley + '/' + EG_BAR_VOLLEYS + ' — read the gaps!', '#ff6b35');

        // Each strike: a full-screen shelling grid with 2 safe gaps that
        // wander slightly between volleys. Telegraphed 2.2s.
        const cols = 8, rows = 6;
        const safeCols = [Math.floor(Math.random() * cols), Math.floor(Math.random() * cols)];
        const safeRows = [Math.floor(Math.random() * rows), Math.floor(Math.random() * rows)];
        const cw = W / cols, rh = H / rows;
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
        _egNkToast('eg_mech_bar_salvo', '🍎💀 ALL-OUT SALVO — one safe tile remains. Reach it!', '#ff6b35');

        const cols = 10, rows = 7;
        const cw = W / cols, rh = H / rows;
        const safeC = Math.floor(Math.random() * cols);
        const safeR = Math.floor(Math.random() * rows);
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

        _egBarAfter(g, 2600 * _EG_BAR_DEBUG_MULT, () => {
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
function _egBarFinalEnd(g, monster) {
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
        const m = (typeof _egMonsters !== 'undefined') ? _egMonsters.find(x => x && x.id === g.monsterId) : null;
        if (m) m.bossImmune = false;
    } catch (e) {}
    void monster;
}


//------------------------------------------------------------------------
//-------------------TEARDOWN----------------------------------------------
//------------------------------------------------------------------------
// Called from _egBossCleanup on boss death AND from the encounter stop —
// removes every run element, overlay and body class this boss ever created.
function _egBarTeardown() {
    if (_egBarFinal) { try { _egBarFinalEnd(_egBarFinal, null); } catch (e) {} _egBarFinal = null; }
    document.querySelectorAll('.eg-bar-curtain, .eg-bar-splash, .eg-bar-drop-warn, .eg-bar-jammer, ' +
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
//   _EG_BAR_DEBUG.fire('curtain'|'supply'|'shells', phase) — runs one now
//   _EG_BAR_DEBUG.final()                                  — FINAL BOMBARDMENT now
if (typeof window !== 'undefined') {
    window._EG_BAR_DEBUG = {
        fire: (name, phase) => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? _egMonsters.find(m => m && m.baseId === 'boss_barrage') : null;
            if (!monster) return 'no barrage alive';
            const fn = name === 'curtain' ? _egMechBarCurtain
                : name === 'supply' ? _egMechBarSupplyDrop
                : name === 'shells' ? _egMechBarShotShells : null;
            if (!fn) return 'unknown: ' + name;
            if (name !== 'curtain' && _egNkDodgeBusy()) return 'BLOCKED: dodge-busy (wait for the field to clear)';
            fn(monster, phase || monster.bossPhase || 1);
            return 'fired ' + name;
        },
        final: () => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? _egMonsters.find(m => m && m.baseId === 'boss_barrage') : null;
            if (!monster) return 'no barrage alive';
            _egBarFinalStart(monster);
            return 'FINAL BOMBARDMENT started';
        },
    };
}
