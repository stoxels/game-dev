//------------------------------------------------------------------------
//-------------------BOSS: THE MARKSMAN (boss_marksman)---------------------------
//------------------------------------------------------------------------
// Aimed strikes land where you stand — never stand still.
//
// MARKED STRIKES: a crosshair reticle locks onto the player's position and
// an arrow flies in on a concave (gravity) arc — damage lands WHEN THE
// ARROW IMPACTS the mark, not at lock-on. The ring is just the aim; the
// arrow is the hit.
//
// ARROW GAUNTLET (HP-gated set-piece at 66% / 33%, Viper Napuatzi-style):
// a 5-4-3-2-1 countdown announces the gauntlet, then a rectangle of
// conjured bows walls the player in — impassable until the formation is
// survived. The bows fire arrow walls with gaps to dodge through; the 33%
// gauntlet is faster and meaner than the 66% one. Arrows deal heavy
// PHYSICAL damage (no element = armour-only mitigation). The auto-attack
// charge bar is paused for the whole gauntlet (countdown included) — see
// _egMarksGauntletChargePaused in endgame-encounter.js.
//
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule + onInit)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics (corrupt_cells, probability_shift, prior_bomb,
// frozen_cells, clue_swap, grid_invert, summons) live in
// shared-boss-abilities.js and are referenced by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_marksman: {
        id: 'boss_marksman', name: 'The Marksman', emoji: '🎯',
        baseHP: 960, baseDamage: 24, chargeMax: 10,
        element: 'lightning', resistances: { fire: 15, cold: 15, lightning: 30, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_marksman: {
        phases: [
            { threshold: 1.00, chargeMax: 10, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 8, damageMultiplier: 1.55 },
            { threshold: 0.30, chargeMax: 5, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'marked_strikes', intervalBase: 19000, intervalVariance: 4000, handler: '_egMechMarkedStrikes' },
            { name: 'probability_shift', intervalBase: 18000, intervalVariance: 4000, handler: '_egMechProbabilityShift' },
        ],
        onInit: _egMarksmanArenaInit,
    },
});


// ── Marked Strikes tuning ───────────────────────────────────────────────
const EG_MARKS_SHOTS = [0, 4, 4, 6];        // volleys per cast by phase
const EG_MARKS_INTERVAL_MS = 1500;          // ms between volleys
const EG_MARKS_AIM_MS = 900;                // crosshair lock → arrow release
const EG_MARKS_FLIGHT_MS = 620;             // arrow arc duration (release → impact)
const EG_MARKS_RADIUS = 70;                 // impact circle radius
const EG_MARKS_DMG = [0, 0.10, 0.12, 0.15]; // %maxHP per impact (lightning)

// ── Arrow Gauntlet tuning ───────────────────────────────────────────────
const EG_GAUNTLET_PCTS = [0.66, 0.33];      // HP gates: stage 2 at 66%, stage 3 at 33%
const EG_GAUNTLET_CD_SEC = 5;               // 5-4-3-2-1 countdown
const EG_GAUNTLET_SPEED = [0, 0, 360, 460]; // arrow px/s — 66% easy, 33% hard
const EG_GAUNTLET_HIT = [0, 0, 0.16, 0.22]; // %maxHP per arrow — HEAVY physical
const EG_GAUNTLET_HIT_CD_MS = 450;          // global player hit cooldown
const EG_GAUNTLET_ARROW_GAP = 52;           // px between arrows in a wall
const EG_GAUNTLET_WALL_T = 34;              // wall thickness (bows box)
const EG_GAUNTLET_ARM_LEAD_MS = 550;        // bows glow this long before their volley releases


let _egMarksWatcher = null;  // per-fight HP-gate watcher state
let _egMarksGauntlet = null; // non-null while a gauntlet (countdown + waves) runs


// Read by endgame-encounter.js: the whole gauntlet — countdown AND waves —
// is a dodge set-piece, so the auto-attack charge bar stays paused.
function _egMarksGauntletChargePaused() {
    return !!_egMarksGauntlet;
}


// The gauntlet makes the boss temporarily immune. Applied/restored via
// explicit flags so it composes with (never clobbers) the framework's own
// phase-transition immunity windows: we only ever clear what we set.
function _egMarksGauntletApplyImmunity(monsterId) {
    const m = (typeof _egMonsters !== 'undefined' && _egMonsters)
        ? _egMonsters.find(x => x && x.id === monsterId) : null;
    if (!m) return;
    if (!m._egMarksImmuneApplied) {
        m._egMarksImmuneApplied = true;
        m._egMarksImmuneBefore = !!m.bossImmune;
    }
    m.bossImmune = true;
}


// Releases ONLY the immunity this system applied (framework windows,
// e.g. a phase transition that ends after the gauntlet, stay untouched).
// Safe on every path — missing monster (boss died) is a no-op.
function _egMarksGauntletReleaseImmunity(monsterId) {
    const m = (typeof _egMonsters !== 'undefined' && _egMonsters)
        ? _egMonsters.find(x => x && x.id === monsterId) : null;
    if (!m || !m._egMarksImmuneApplied) return;
    m._egMarksImmuneApplied = false;
    if (!m._egMarksImmuneBefore) m.bossImmune = false;
    m._egMarksImmuneBefore = null;
}


// True while a gauntlet (or its countdown) is running. Marked Strikes
// stand down during it — the bows own the arena.
function _egMarksGauntletActive() {
    return !!_egMarksGauntlet;
}


//------------------------------------------------------------------------
//-------------------MECHANIC: MARKED STRIKES------------------------------
//------------------------------------------------------------------------

function _egMechMarkedStrikes(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    if (_egMarksGauntletActive()) return; // the bows own the arena mid-gauntlet
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const marks = [];
    let left = EG_MARKS_SHOTS[p] || 4, nextAt = 0, e = 0;
    _egNkToast('eg_mech_marks', '🎯 The Marksman: Marked Strikes! Never stand still!');
    _egNkLoop(run, (dtS) => {
        if (_egMarksGauntletActive()) {
            // The gauntlet started mid-volley: the bows own the arena —
            // abort any in-flight marks so their damage can't stack with
            // the gauntlet walls.
            marks.forEach(m => { try { if (m.arrow) m.arrow.remove(); } catch (e2) {} try { m.el.remove(); } catch (e2) {} });
            return false;
        }
        e += dtS * 1000;
        if (left > 0 && e >= nextAt) {
            nextAt = e + EG_MARKS_INTERVAL_MS;
            left--;
            // Aim at where the player IS now: the aim + flight time is the
            // dodge window — keep moving.
            const c = _egNkPlayerCenter();
            const x = c ? c.x : window.innerWidth / 2;
            const y = c ? c.y : window.innerHeight / 2;
            // Crosshair reticle: ring + cross ticks + center dot (CSS).
            const el = _egNkEl(run, 'div', 'eg-nk-mark');
            el.style.left = Math.round(x - EG_MARKS_RADIUS) + 'px';
            el.style.top = Math.round(y - EG_MARKS_RADIUS) + 'px';
            el.style.width = EG_MARKS_RADIUS * 2 + 'px';
            el.style.height = EG_MARKS_RADIUS * 2 + 'px';
            marks.push({ x, y, t: 0, ft: 0, launched: false, struck: false, el, arrow: null });
        }
        const pr = _egNkPlayerRect();
        for (let i = marks.length - 1; i >= 0; i--) {
            const m = marks[i];
            m.t += dtS * 1000;
            if (!m.launched && m.t >= EG_MARKS_AIM_MS) {
                // Release: the arrow arcs in from the OPPOSITE top corner so
                // the concave curve crosses the screen readably.
                m.launched = true;
                m.arrow = _egNkEl(run, 'div', 'eg-marks-arrow');
                m.sx = (m.x < window.innerWidth / 2) ? window.innerWidth + 50 : -50;
                // Spawn just inside the top edge: with the quadratic ease-in
                // the arrow would otherwise spend the first ~40% of its
                // flight ABOVE the viewport (arc invisible until impact).
                m.sy = 36;
            }
            if (m.launched && !m.struck) {
                m.ft = Math.min(1, m.ft + dtS * 1000 / EG_MARKS_FLIGHT_MS);
                const ft = m.ft;
                // Projectile motion: horizontal ease-OUT (fast release),
                // vertical ease-IN (gravity) → a concave arc onto the mark.
                const ex = 1 - Math.pow(1 - ft, 2);
                const fx = m.sx + (m.x - m.sx) * ex;
                const fy = m.sy + (m.y - m.sy) * (ft * ft);
                // Rotate along the tangent so the arrowhead leads.
                const vx = (m.x - m.sx) * 2 * (1 - ft);
                const vy = (m.y - m.sy) * 2 * ft;
                const ang = Math.atan2(vy, vx) * 180 / Math.PI;
                m.arrow.style.transform = 'translate(' + Math.round(fx) + 'px,' + Math.round(fy) + 'px) rotate(' + Math.round(ang) + 'deg)';
                if (ft >= 1) {
                    // IMPACT — this is when the damage happens.
                    m.struck = true;
                    m.el.classList.add('eg-nk-mark-hit');
                    try { m.arrow.remove(); } catch (e2) {}
                    if (pr && _egNkCircleHit(m.x, m.y, EG_MARKS_RADIUS, pr, 0)) {
                        const dealt = _egNkHit(EG_MARKS_DMG[p] || EG_MARKS_DMG[1], 'lightning', level);
                        _egNkAbilityHitToast(dealt, 'The Marksman', 'Marked Strikes');
                    }
                }
            }
            if (m.t >= EG_MARKS_AIM_MS + EG_MARKS_FLIGHT_MS + 450) {
                try { if (m.arrow) m.arrow.remove(); } catch (e2) {}
                m.el.remove();
                marks.splice(i, 1);
            }
        }
        return left > 0 || marks.length > 0;
    });
}


//------------------------------------------------------------------------
//-------------------SET-PIECE: ARROW GAUNTLET-----------------------------
//------------------------------------------------------------------------

// Persistent per-fight watcher (onInit): fires the gauntlet once per HP
// gate. Non-dodge run on purpose so the scheduled mechanics keep firing
// alongside it between gauntlets.
function _egMarksmanArenaInit(monster) {
    if (_egMarksWatcher) return;
    const monsterId = monster ? monster.id : null;
    const level = monster ? monster.level : 1;
    const st = { monsterId, level, fired66: false, fired33: false, missingSince: 0 };
    _egMarksWatcher = st;
    _egNkToast('eg_mech_gauntlet_intro',
        '🏹 The Marksman: At 66% and 33% the bows surround you — survive the ARROW GAUNTLET!');
    const run = _egNkNewRun(monsterId, false);
    st.run = run;
    run.onKill = () => {
        // Boss death / encounter stop: the gauntlet dies with the fight.
        _egMarksGauntletEnd();
        if (_egMarksWatcher && _egMarksWatcher.run === run) _egMarksWatcher = null;
    };
    _egNkLoop(run, (dtS, now) => {
        const live = (typeof _egMonsters !== 'undefined' && _egMonsters)
            ? (_egMonsters.find(m => m && m.id === st.monsterId) || null) : null;
        if (!live) {
            // Grace window: _egMonsters is rebuilt during encounter setup.
            st.missingSince = st.missingSince || now;
            if (now - st.missingSince > 3000) return false;
            return true;
        }
        st.missingSince = 0;
        const hpPct = live.maxHP > 0 ? live.currentHP / live.maxHP : 1;
        // Start() returns false while another gauntlet is still running —
        // retry on later ticks so a burst through both gates fires both.
        if (!st.fired66 && hpPct <= EG_GAUNTLET_PCTS[0]) {
            if (_egMarksGauntletStart(2)) st.fired66 = true;
        } else if (!st.fired33 && hpPct <= EG_GAUNTLET_PCTS[1]) {
            if (_egMarksGauntletStart(3)) st.fired33 = true;
        }
        return true;
    });
}


// Builds the wave program for one gauntlet. Each event: { t (ms into the
// wave phase), side ('left'|'right'|'top'|'bottom' — where the bows FIRE
// FROM), gapFrac (gap width as a fraction of the side span), gapCenter
// (fractional position of the gap along that side) }.
function _egMarksGauntletWaves(stage) {
    const W = [];
    const push = (t, side, gapFrac, gapCenter) => W.push({ t, side, gapFrac, gapCenter, armed: false, fired: false });
    if (stage >= 3) {
        // Stage 3 (33%) — DEADLY VOLLEY: faster arrows, harder patterns.
        push(0, 'left', 0.34, Math.random());
        // Adjacent pincers — offset gaps, only a diagonal pocket is safe.
        push(2400, 'top', 0.38, Math.random());
        push(2400, 'left', 0.38, Math.random());
        // Sweep: the volley rotates around the whole box.
        const sweepGap = Math.random();
        push(4800, 'top', 0.42, sweepGap);
        push(5250, 'right', 0.42, sweepGap);
        push(5700, 'bottom', 0.42, sweepGap);
        push(6150, 'left', 0.42, sweepGap);
        // Hard pincers from opposite walls. PARALLEL walls must share a
        // (jittered) gap center: two independent random gaps on the same
        // axis can end up disjoint → no safe pocket exists at all. With a
        // shared center the 0.36+0.36 gaps always overlap somewhere.
        const pinchGap = Math.random();
        push(8400, 'top', 0.36, Math.max(0.08, Math.min(0.92, pinchGap + (Math.random() - 0.5) * 0.16)));
        push(8400, 'bottom', 0.36, Math.max(0.08, Math.min(0.92, pinchGap + (Math.random() - 0.5) * 0.16)));
        // Finale: rapid double wall, the gap SHIFTS between volleys. The
        // shift is sized so a base-walk-speed player (320 px/s) can cross
        // to the new gap inside the 1.7s between volleys — gear must not
        // be the price of admission.
        push(10400, 'right', 0.30, 0.25);
        push(12100, 'right', 0.30, 0.75);
    } else {
        // Stage 2 (66%) — still learnable: one wall at a time, generous
        // gaps, a short breather between walls (~2.8s apart, wall crosses
        // in ~2.6s at 360 px/s).
        push(0, 'left', 0.40, Math.random());
        push(2800, 'top', 0.40, Math.random());
        push(5600, 'right', 0.46, Math.random());
        push(8400, 'bottom', 0.46, Math.random());
    }
    return W;
}


// Live bounding rect of the interactive puzzle cells (clue rows/columns
// excluded). Uses getBoundingClientRect so CSS scaling of the table is
// already baked in. Returns null when no usable grid is on screen.
function _egMarksGauntletGridRect() {
    let L = Infinity, T = Infinity, R = -Infinity, B = -Infinity;
    document.querySelectorAll('#ptable .gc[id^="g-"]').forEach(cell => {
        const r = cell.getBoundingClientRect();
        if (!r.width || !r.height) return;
        if (r.left < L) L = r.left;
        if (r.top < T) T = r.top;
        if (r.right > R) R = r.right;
        if (r.bottom > B) B = r.bottom;
    });
    if (!isFinite(L) || (R - L) < 120 || (B - T) < 120) return null;
    return { L, T, R, B };
}


// Spawns the bow-wall rectangle around the EDGES OF THE PUZZLE GRID (the
// arena IS the grid — the player is sealed inside the puzzle itself) and
// returns its geometry (the wall elements come back too, so per-bow fire
// telegraphs can address the right wall). Falls back to a viewport-centered
// box if no grid is measurable (defensive only).
function _egMarksGauntletBuildBox(run) {
    const gr = _egMarksGauntletGridRect();
    if (gr) {
        const box = { L: gr.L, T: gr.T, R: gr.R, B: gr.B, walls: {} };
        _egMarksGauntletBuildWalls(run, box);
        return box;
    }
    const W = window.innerWidth, H = window.innerHeight;
    const c = _egNkPlayerCenter() || { x: W / 2, y: H / 2 };
    const bw = Math.min(920, W * 0.82), bh = Math.min(640, H * 0.74);
    const L = Math.max(24, Math.min(W - bw - 24, Math.round(c.x - bw / 2)));
    const T = Math.max(24, Math.min(H - bh - 24, Math.round(c.y - bh / 2)));
    const box = { L, T, R: L + bw, B: T + bh, walls: {} };
    _egMarksGauntletBuildWalls(run, box);
    return box;
}


// Builds the four bow walls for a box, straddling its boundary lines so
// the frame reads as sitting ON the grid edges.
function _egMarksGauntletBuildWalls(run, box) {
    const L = box.L, T = box.T, R = box.R, B = box.B;
    const bw = R - L, bh = B - T;
    const h = EG_GAUNTLET_WALL_T, half = h / 2;
    const wall = (cls, css, vertical) => {
        const el = _egNkEl(run, 'div', 'eg-gauntlet-wall ' + cls);
        Object.assign(el.style, css);
        const span = vertical ? bh : bw;
        const n = Math.max(2, Math.floor(span / 58));
        for (let i = 0; i < n; i++) {
            const b = document.createElement('span');
            b.className = 'eg-gauntlet-bow';
            b.textContent = '🏹';
            el.appendChild(b);
        }
        box.walls[cls] = el;
        return el;
    };
    wall('top', { left: L + 'px', top: (T - half) + 'px', width: bw + 'px', height: h + 'px' }, false);
    wall('bottom', { left: L + 'px', top: (B - half) + 'px', width: bw + 'px', height: h + 'px' }, false);
    wall('left', { left: (L - half) + 'px', top: T + 'px', width: h + 'px', height: bh + 'px' }, true);
    wall('right', { left: (R - half) + 'px', top: T + 'px', width: h + 'px', height: bh + 'px' }, true);
    return box;
}


// Arms (lights up) exactly the bows whose arrows are about to spawn for
// this volley — a subtle per-bow tell of which lane turns deadly, not a
// full row/column band. Bows in the gap never arm (they don't shoot).
function _egMarksGauntletArmBows(g, ev) {
    if (!g.box || !g.box.walls) return;
    const wallEl = g.box.walls[ev.side];
    if (!wallEl) return;
    const bows = Array.from(wallEl.children);
    if (!bows.length) return;
    const span = (ev.side === 'left' || ev.side === 'right') ? (g.box.B - g.box.T) : (g.box.R - g.box.L);
    const min = 56, max = span - 40;
    ev.armedEls = [];
    bows.forEach((bow, i) => {
        // Bow centers sit at (i+1)/(n+1) of the span (space-evenly layout).
        const bowD = span * (i + 1) / (bows.length + 1);
        const frac = (bowD - min) / Math.max(1, max - min);
        if (frac < -0.05 || frac > 1.05) return;                              // outside the arrow band
        if (Math.abs(frac - ev.gapCenter) < ev.gapFrac / 2) return;           // the gap — this bow holds fire
        bow.classList.add('eg-gauntlet-bow-arm');
        ev.armedEls.push(bow);
    });
}


// Releases the armed glow right as the volley leaves the strings.
function _egMarksGauntletDisarmBows(g, ev) {
    if (!ev.armedEls) return;
    ev.armedEls.forEach(el => { try { el.classList.remove('eg-gauntlet-bow-arm'); } catch (e) {} });
    ev.armedEls = null;
}


// Volley release sting — the same drawn-bow twang the Probabilist's
// Precision Mark plays, so every gauntlet volley reads as a bow loosing.
function _egMarksGauntletVolleySfx() {
    try {
        if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('precisionMark');
    } catch (e) {}
}


// Once-per-gauntlet hint for the frozen grid (see checkSpecialIntercepts
// in mouse-button-handlers.js).
function _egMarksGauntletGridLockToast() {
    const g = _egMarksGauntlet;
    if (!g || g.gridToastShown) return;
    g.gridToastShown = true;
    _egNkToast('eg_gauntlet_grid_locked', '🏹 The bows hold the arena — the grid is sealed until the gauntlet ends!');
}


// Launches one gauntlet. Returns false if one is already running.
function _egMarksGauntletStart(stage) {
    if (_egMarksGauntlet) return false;
    const w = _egMarksWatcher;
    if (!w) return false;
    const run = _egNkNewRun(w.monsterId, true);
    _egMarksGauntlet = { stage, run, level: w.level, monsterId: w.monsterId };
    run.onKill = () => {
        if (_egMarksGauntlet && _egMarksGauntlet.run === run) _egMarksGauntlet = null;
        // Gauntlet immunity always releases with the run — boss death,
        // encounter stop or survival can never leave the boss locked.
        _egMarksGauntletReleaseImmunity(w.monsterId);
    };

    // The gauntlet owns the fight: the boss draws no auto-attack charge
    // (both bars frozen, see _egMarksGauntletChargePaused) and shrugs off
    // all damage while the bows hold the arena — beating on him mid-volley
    // would skip the set-piece.
    _egMarksGauntletApplyImmunity(w.monsterId);

    _egNkToast(stage >= 3 ? 'eg_mech_gauntlet_stage3' : 'eg_mech_gauntlet',
        stage >= 3 ? '🏹 ARROW GAUNTLET — Deadly Volley! No mercy this time!'
                   : '🏹 ARROW GAUNTLET — survive the storm of arrows!');

    // Countdown UI: "ARROW GAUNTLET" + a big 5-4-3-2-1 above the arena.
    let title = 'ARROW GAUNTLET';
    try { const raw = t('eg_gauntlet_title'); if (raw && raw !== 'eg_gauntlet_title') title = raw; } catch (e) {}
    const cdBox = _egNkEl(run, 'div', 'eg-gauntlet-countdown');
    const cdTitle = document.createElement('div');
    cdTitle.className = 'eg-gauntlet-cd-title';
    cdTitle.textContent = '🏹 ' + title;
    cdBox.appendChild(cdTitle);

    const g = _egMarksGauntlet;
    g.cdBox = cdBox;
    g.phase = 'countdown';
    g.cdTimer = EG_GAUNTLET_CD_SEC * 1000;
    g.cdShown = EG_GAUNTLET_CD_SEC + 1;
    g.waves = null;
    g.evIdx = 0;
    g.armIdx = 0;
    g.waveT = 0;
    g.arrows = [];
    g.lastHitAt = 0;
    g.box = null;
    g.wallEls = [];

    _egNkLoop(run, (dtS, now) => {
        if (g.phase === 'countdown') {
            g.cdTimer -= dtS * 1000;
            const secs = Math.max(0, Math.ceil(g.cdTimer / 1000));
            if (secs !== g.cdShown && secs > 0) {
                g.cdShown = secs;
                // Fresh node per tick so the pop animation re-triggers.
                const num = document.createElement('div');
                num.className = 'eg-gauntlet-cd-num';
                num.textContent = String(secs);
                cdBox.appendChild(num);
                while (cdBox.children.length > 2) cdBox.removeChild(cdBox.children[1]);
            }
            if (!g.box && g.cdTimer <= (EG_GAUNTLET_CD_SEC - 1) * 1000 + 400) {
                // The bows snap into formation while the countdown runs —
                // the box is sealed from this moment on.
                g.box = _egMarksGauntletBuildBox(run);
                g.wallEls = Array.from(document.querySelectorAll('.eg-gauntlet-wall'));
            }
            if (g.box) _egMarksGauntletClampPlayer(g);
            if (g.cdTimer <= 0) {
                g.phase = 'waves';
                if (cdBox) { try { cdBox.remove(); } catch (e) {} g.cdBox = null; }
                g.waves = _egMarksGauntletWaves(g.stage);
                g.evIdx = 0;
                g.armIdx = 0;
                g.waveT = 0;
            }
            return true;
        }

        // ── Wave phase ──
        g.waveT += dtS * 1000;
        // Arm (glow) every volley whose lead window opened — independent
        // of the fire pointer, so SIMULTANEOUS pincer events (same t) arm
        // together instead of the second one losing its telegraph.
        while (g.armIdx < g.waves.length && g.waveT >= g.waves[g.armIdx].t - EG_GAUNTLET_ARM_LEAD_MS) {
            const ev = g.waves[g.armIdx];
            if (!ev.armed) {
                ev.armed = true;
                _egMarksGauntletArmBows(g, ev);
            }
            g.armIdx++;
        }
        // Fire every volley whose time has come.
        while (g.evIdx < g.waves.length && g.waveT >= g.waves[g.evIdx].t) {
            const ev = g.waves[g.evIdx];
            ev.fired = true;
            _egMarksGauntletDisarmBows(g, ev);
            _egMarksGauntletFireWall(g, ev);
            _egMarksGauntletVolleySfx();
            g.evIdx++;
        }

        const pr = _egNkPlayerRect();

        // Arrows: fly, hit, despawn past the far wall.
        for (let i = g.arrows.length - 1; i >= 0; i--) {
            const a = g.arrows[i];
            a.t += dtS * 1000;
            if (a.t < a.delay) continue;
            a.x += a.vx * dtS;
            a.y += a.vy * dtS;
            a.el.style.transform = 'translate(' + Math.round(a.x) + 'px,' + Math.round(a.y) + 'px) rotate(' + a.rot + 'deg)';
            if (pr && now >= g.lastHitAt && _egNkCircleHit(a.x, a.y, 12, pr, 0)) {
                g.lastHitAt = now + EG_GAUNTLET_HIT_CD_MS;
                // element null → no resist mitigation: HEAVY PHYSICAL hit.
                const dealt = _egNkHit(EG_GAUNTLET_HIT[g.stage] || EG_GAUNTLET_HIT[2], null, g.level);
                _egNkAbilityHitToast(dealt, 'The Marksman', 'Arrow Gauntlet');
            }
            if (a.x < g.box.L - 90 || a.x > g.box.R + 90 || a.y < g.box.T - 90 || a.y > g.box.B + 90) {
                try { a.el.remove(); } catch (e) {}
                g.arrows.splice(i, 1);
            }
        }

        // The bow wall is impassable: clamp the player inside the box.
        _egMarksGauntletClampPlayer(g);

        // Done when every wave fired and the air is clear of arrows.
        if (g.evIdx >= g.waves.length && g.arrows.length === 0) {
            _egMarksGauntletEnd();
            return false;
        }
        return true;
    });
    return true;
}


// The bow wall is impassable: clamp the player just inside the grid
// edges (the wall band straddles the boundary at ± half).
function _egMarksGauntletClampPlayer(g) {
    if (!g.box) return;
    const pr = _egNkPlayerRect();
    if (!pr) return;
    const m = EG_GAUNTLET_WALL_T / 2 + 4;
    if (pr.left < g.box.L + m) _egNkNudgeAvatar(g.box.L + m - pr.left, 0);
    if (pr.right > g.box.R - m) _egNkNudgeAvatar((g.box.R - m) - pr.right, 0);
    if (pr.top < g.box.T + m) _egNkNudgeAvatar(0, g.box.T + m - pr.top);
    if (pr.bottom > g.box.B - m) _egNkNudgeAvatar(0, (g.box.B - m) - pr.bottom);
}


// Fires one arrow wall from `ev.side`, leaving a readable gap at
// ev.gapCenter (± ev.gapFrac/2 of the side's span).
function _egMarksGauntletFireWall(g, ev) {
    const box = g.box;
    const speed = EG_GAUNTLET_SPEED[g.stage] || EG_GAUNTLET_SPEED[2];
    const s = ev.side;
    const rot = s === 'left' ? 0 : (s === 'right' ? 180 : (s === 'top' ? 90 : 270));
    const along = (s === 'left' || s === 'right') ? box.B - box.T : box.R - box.L;
    const min = 56, max = along - 40;
    for (let d = min; d <= max; d += EG_GAUNTLET_ARROW_GAP) {
        const frac = (d - min) / Math.max(1, (max - min));
        if (Math.abs(frac - ev.gapCenter) < ev.gapFrac / 2) continue; // the gap
        const el = _egNkEl(g.run, 'div', 'eg-gauntlet-arrow');
        const a = {
            t: 0, delay: Math.random() * 120, vx: 0, vy: 0, rot, el,
            x: 0, y: 0,
        };
        // Spawn just inside the wall band: the walls straddle the grid
        // edges (± half), so `half` puts each arrow at the boundary line.
        const half = EG_GAUNTLET_WALL_T / 2;
        if (s === 'left') { a.x = box.L + half; a.y = box.T + d; a.vx = speed; }
        else if (s === 'right') { a.x = box.R - half; a.y = box.T + d; a.vx = -speed; }
        else if (s === 'top') { a.x = box.L + d; a.y = box.T + half; a.vy = speed; }
        else { a.x = box.L + d; a.y = box.B - half; a.vy = -speed; }
        a.el.style.transform = 'translate(' + Math.round(a.x) + 'px,' + Math.round(a.y) + 'px) rotate(' + rot + 'deg)';
        g.arrows.push(a);
    }
}


// Tears the gauntlet down: walls fade, arrows clear, charge pause lifts.
// Safe to call from every end path (survived, boss died, encounter stop).
function _egMarksGauntletEnd() {
    const g = _egMarksGauntlet;
    if (!g) return;
    _egMarksGauntlet = null;
    if (g.cdBox) { try { g.cdBox.remove(); } catch (e) {} }
    g.wallEls.forEach(el => {
        try {
            el.classList.add('eg-gauntlet-wall-out');
            setTimeout(() => { try { el.remove(); } catch (e) {} }, 520);
        } catch (e) {}
    });
    if (g.arrows) g.arrows.forEach(a => { try { a.el.remove(); } catch (e) {} });
    if (g.run) { try { _egNkKillRun(g.run); } catch (e) {} }
    _egNkToast('eg_mech_gauntlet_done', '🎯 The bows lower — the gauntlet is survived!');
}


// Defensive teardown (mirrors the other bosses' pattern).
function _egMarksmanTeardown() {
    try { _egMarksGauntletEnd(); } catch (e) { _egMarksGauntlet = null; }
    _egMarksWatcher = null;
}
