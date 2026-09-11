//------------------------------------------------------------------------
//-------------------BOSS: BAYES (boss_bayes)------------------------------
//------------------------------------------------------------------------
// TIER 7 REWORK — "The Grand Prior". Evidence updates beliefs — the fight
// literally re-weights. Bayes holds a visible BELIEF METER between two
// hypotheses (SAFE LEFT / SAFE RIGHT); its casts strike the side the meter
// currently favours. Your job is feeding evidence to flip the meter before
// each big cast. Element: lightning.
//   • POSTERIOR BOLTS (signature, all fight) — every cast, lightning waves
//     land across the currently-BELIEVED-SAFE side in wide columns; the
//     meter then shifts toward the OTHER side (getting hit by your own
//     belief's evidence). A glowing EVIDENCE RING spawns on the opposite
//     side: stand in it when a bolt lands to shift the meter strongly your
//     way — risk = reward, because that side is being punished next.
//   • EVIDENCE WISPS (60%) — 🔮 wisps drift along wide readable loops;
//     touching one flips the meter 15 points toward the wisp's own side
//     (pull the next cast away from you). Wisps on the non-favoured side
//     glow — those are the free flips; wisps on the favoured side sting.
//   • BELIEF VEIL (60%, once) — the classic Grid Veil returns, upgraded:
//     the puzzle grid is hidden AS BAYES BELIEVES IT — the veil is tinted
//     toward the favoured side, and a belief chip shows the current lean.
//     The closer the meter sits to 50/50, the clearer the veil reads
//     (a balanced belief sees clearly — the hidden lesson of the boss).
//   • 🔮 THEOMERE'S GAMBIT (≤10%, one-shot finale) — Bayes bets everything
//     on one final hypothesis: the arena splits into a 3×3 of districts,
//     each showing a truthful danger-probability chip. Stand on a chip to
//     flip it to its complement (one flip per district — a gamble). Three
//     cast waves strike the true danger districts; survive all three and
//     Bayes updates its prior to "the player wins" and CONCEDES — every
//     chip reveals, and the boss takes its own remaining HP as the price
//     of a lost bet. Charge bar frozen (gate in _egTickPlayer via
//     _egBayFinalActive).
//
// Tier scaling: every dodge run uses the shared EG_NK_TIER_FACTOR clock, so
// gentle tiers get longer telegraphs and brutal tiers tighter ones.
//
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule + hooks)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics (prior_bomb) live in shared-boss-abilities.js and are
// referenced by handler-name string.
//------------------------------------------------------------------------

// DEBUG: slow Bayes' timing 2.5x so manual playtests / screenshot
// automation can catch mid-animation states. Flip to false for ship.
const _EG_BAY_DEBUG_SLOW = true;
const _EG_BAY_DEBUG_MULT = _EG_BAY_DEBUG_SLOW ? 2.5 : 1;

Object.assign(EG_BOSS_DEFS, {
    boss_bayes: {
        id: 'boss_bayes', name: 'Bayes', emoji: '🔮',
        baseHP: 1100, baseDamage: 20, chargeMax: 12,
        element: 'lightning', resistances: { fire: 15, cold: 15, lightning: 30, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {

    // boss_bayes — "The Grand Prior" (rework)
    // Phase 1 (100% → 60%): Posterior Bolts + Prior Bomb
    // Phase 2 ( 60% → 30%): immune window, Belief Veil activates, Evidence Wisps join
    // Phase 3 ( 30% →  0%): everything intensifies; at 10% the GAMBIT begins
    boss_bayes: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 8, damageMultiplier: 1.55 },
            { threshold: 0.30, chargeMax: 5, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'posterior_bolts', intervalBase: 19000, intervalVariance: 4500, handler: '_egMechBayBolts' },
            { name: 'prior_bomb', intervalBase: 18000, intervalVariance: 4000, handler: '_egMechPriorBomb' },
            { name: 'evidence_wisps', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechBayWisps', phase2Only: true },
            // belief_veil fires once on phase 2 activation; intervalBase is set
            // absurdly high so it never self-reschedules after that first trigger.
            { name: 'belief_veil', intervalBase: 999999999, intervalVariance: 0, handler: '_egMechBayVeil', phase2Only: true },
        ],
        onPhaseEnter: _egBayOnPhaseEnter,
    },
});


// ── Shared tuning (per-mechanic constants live with their mechanics) ────────
const EG_BAY_BOLT_DMG   = [0, 0.15, 0.17, 0.20]; // %maxHP bolt wave hit
const EG_BAY_WISP_DMG   = 0.10;                  // %maxHP favoured-side wisp
const EG_BAY_WISP_FLIP  = 15;                    // meter points per wisp flip
const EG_BAY_WISP_LIFE  = 4.2;                   // s a wisp drifts
const EG_BAY_DISTRICT_HIT = 0.18;                // %maxHP caught in a wave
const EG_BAY_WAVES      = 3;                     // gambit cast waves
const EG_BAY_WAVE_GAP   = 4200;                  // ms per gambit wave
const EG_BAY_HIT_CD_MS  = 700;                   // shared touch cooldown


//------------------------------------------------------------------------
//-------------------BELIEF METER (shared state)---------------------------
//------------------------------------------------------------------------
// Lean: −100 = absolutely certain SAFE LEFT, +100 = absolutely certain
// SAFE RIGHT, 0 = 50/50 (maximum clarity). Lives in a per-run global so the
// veil chip, the wisps and the bolts all read one truth.
let _egBayLean = 0;
let _egBayMeterEl = null;

function _egBayMeterApply() {
    if (!_egBayMeterEl) {
        _egBayMeterEl = document.createElement('div');
        _egBayMeterEl.className = 'eg-bay-meter';
        _egBayMeterEl.innerHTML =
            '<div class="eg-bay-meter-half eg-bay-meter-left">SAFE LEFT</div>' +
            '<div class="eg-bay-meter-needle"></div>' +
            '<div class="eg-bay-meter-half eg-bay-meter-right">SAFE RIGHT</div>';
        document.body.appendChild(_egBayMeterEl);
    }
    _egBayMeterEl.style.setProperty('--bay-lean', String(Math.round(_egBayLean)));
    _egBayMeterEl.classList.toggle('eg-bay-meter-balanced', Math.abs(_egBayLean) < 10);
}

function _egBayMeterShift(delta) {
    _egBayLean = Math.max(-100, Math.min(100, _egBayLean + delta));
    _egBayMeterApply();
}

function _egBayMeterShow() { _egBayMeterApply(); }

function _egBayMeterHide() {
    if (_egBayMeterEl) { try { _egBayMeterEl.remove(); } catch (e) {} _egBayMeterEl = null; }
}

// Which side does the meter currently favour? (0 → coin flip, that IS the
// 50/50 state — Bayes must still believe something.)
function _egBayFavouredSide() {
    if (_egBayLean < 0) return 'left';
    if (_egBayLean > 0) return 'right';
    return Math.random() < 0.5 ? 'left' : 'right';
}

function _egBaySideX(side) {
    const W = window.innerWidth;
    return side === 'left' ? W * 0.28 : W * 0.72;
}


//------------------------------------------------------------------------
//-------------------SHARED VISUAL HELPERS---------------------------------
//------------------------------------------------------------------------

// Touch damage helper shared by all Bayes hazards. Returns true if a hit
// was rolled (respects the per-touch cooldown).
let _egBayHitCd = 0;
function _egBayTouch(pct, level, label) {
    const now = performance.now();
    if (now < _egBayHitCd) return false;
    const pr = _egNkPlayerRect();
    if (!pr) return false;
    _egBayHitCd = now + EG_BAY_HIT_CD_MS;
    const dealt = _egNkHit(pct, 'lightning', level);
    _egNkAbilityHitToast(dealt, 'Bayes', label);
    return true;
}

// Player centre with a screen-centre fallback.
function _egBayPC() { const c = _egNkPlayerCenter(); return c || { x: window.innerWidth / 2, y: window.innerHeight / 2 }; }


//------------------------------------------------------------------------
//-------------------SIGNATURE: POSTERIOR BOLTS (all fight)----------------
//------------------------------------------------------------------------
// Lightning waves strike the currently-BELIEVED-SAFE side in wide columns;
// after the cast the meter shifts toward the other side (evidence updates).
// The EVIDENCE RING on the punished side pays out meter shifts if you hold
// it through a bolt landing.
const EG_BAY_BOLTS = [0, 2, 3, 4];   // bolt columns per cast, by phase
const EG_BAY_BOLT_W = 170;           // column width
const EG_BAY_BOLT_WARN_MS = 900;     // per-column telegraph
const EG_BAY_BOLT_GAP_MS = 560;      // stagger between columns
const EG_BAY_EVIDENCE_SHIFT = 25;    // meter points per bolt held in the ring
const EG_BAY_SELF_UPDATE = 20;       // meter points Bayes shifts after a cast

function _egMechBayBolts(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const H = window.innerHeight;
    const run = _egNkNewRun(monster && monster.id, true);
    const favoured = _egBayFavouredSide();
    const punished = favoured === 'left' ? 'right' : 'left';
    _egNkToast('eg_mech_bay_bolts', '🔮⚡ POSTERIOR BOLTS — Bayes strikes its ' + favoured.toUpperCase() + ' belief!', '#c4b5fd');

    // Evidence ring on the punished side (hold it = flip the meter your way).
    const ringX = _egBaySideX(punished) + (Math.random() * 120 - 60);
    const ringY = H * (0.3 + Math.random() * 0.4);
    const ring = _egNkEl(run, 'div', 'eg-bay-evidence');
    ring.style.left = Math.round(ringX - 70) + 'px';
    ring.style.top = Math.round(ringY - 70) + 'px';

    // Columns: random positions within the favoured half.
    const favX = _egBaySideX(favoured);
    const columns = [];
    for (let i = 0; i < EG_BAY_BOLTS[p]; i++) {
        columns.push({
            x: favX + (Math.random() * 320 - 160),
            warnAt: i * EG_BAY_BOLT_GAP_MS,
            strikeAt: i * EG_BAY_BOLT_GAP_MS + EG_BAY_BOLT_WARN_MS,
            warnEl: null, struck: false,
        });
    }

    let t = 0, lastShifted = 0;
    _egNkLoop(run, (dtS, now) => {
        t += dtS * 1000;
        const pr = _egNkPlayerRect();
        const pc = _egBayPC();
        let pending = false;
        columns.forEach(col => {
            if (col.struck) return;
            pending = true;
            if (t >= col.warnAt && !col.warnEl) {
                col.warnEl = _egNkEl(run, 'div', 'eg-bay-bolt-warn');
                col.warnEl.style.left = Math.round(col.x - EG_BAY_BOLT_W / 2) + 'px';
                col.warnEl.style.top = '0px';
                col.warnEl.style.width = EG_BAY_BOLT_W + 'px';
                col.warnEl.style.height = H + 'px';
            }
            if (t >= col.strikeAt) {
                // STRIKE.
                if (col.warnEl) { try { col.warnEl.remove(); } catch (e) {} col.warnEl = null; }
                const bolt = _egNkEl(run, 'div', 'eg-bay-bolt');
                bolt.style.left = Math.round(col.x - EG_BAY_BOLT_W / 2) + 'px';
                bolt.style.top = '0px';
                bolt.style.width = EG_BAY_BOLT_W + 'px';
                bolt.style.height = H + 'px';
                setTimeout(() => { try { bolt.remove(); } catch (e) {} }, _EG_BAY_DEBUG_SLOW ? 1200 : 500);
                if (pr && Math.abs(pc.x - col.x) < EG_BAY_BOLT_W / 2 + 12) {
                    _egBayTouch(EG_BAY_BOLT_DMG[p], level, 'Posterior Bolt');
                }
                // Evidence pay-out: holding the ring while a bolt lands.
                if (pr && Math.hypot(pc.x - ringX, pc.y - ringY) < 78 && now - lastShifted > 300) {
                    lastShifted = now;
                    _egBayMeterShift(punished === 'left' ? -EG_BAY_EVIDENCE_SHIFT : EG_BAY_EVIDENCE_SHIFT);
                    ring.classList.remove('eg-bay-evidence-pop');
                    void ring.offsetWidth;
                    ring.classList.add('eg-bay-evidence-pop');
                }
                col.struck = true;
            }
        });
        if (t >= EG_BAY_BOLT_GAP_MS * EG_BAY_BOLTS[p] + EG_BAY_BOLT_WARN_MS + 400) {
            try { ring.remove(); } catch (e) {}
            // Bayes updates itself against the evidence: the meter drifts
            // toward the OTHER side after every cast.
            _egBayMeterShift(favoured === 'left' ? EG_BAY_SELF_UPDATE : -EG_BAY_SELF_UPDATE);
            return false;
        }
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------ACT II: EVIDENCE WISPS (60%)--------------------------
//------------------------------------------------------------------------
// 🔮 wisps drift along wide readable loops. Touching one flips the meter
// 15 points toward the wisp's own side of the screen: wisps on the
// non-favoured side glow (free evidence — pull the next cast away from
// you); wisps on the favoured side sting on contact. Two spawn on the
// non-favoured side, one on the favoured side.
const EG_BAY_WISP_COUNT = 3;
const EG_BAY_WISP_SPEED = 120;      // px/s drift (divided by mult)

function _egMechBayWisps(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _egNkNewRun(monster && monster.id, true);
    const favoured = _egBayFavouredSide();
    _egNkToast('eg_mech_bay_wisps', '🔮 EVIDENCE WISPS — touch the glowing side to flip the belief!', '#c4b5fd');

    const wisps = [];
    for (let i = 0; i < EG_BAY_WISP_COUNT; i++) {
        // 2 on the punished (glowing) side, 1 on the favoured (stinging) side.
        const side = i < 2 ? (favoured === 'left' ? 'right' : 'left') : favoured;
        const glow = side !== favoured;
        const cx = _egBaySideX(side) + (Math.random() * 160 - 80);
        const cy = H * (0.25 + Math.random() * 0.5);
        const el = _egNkEl(run, 'div', 'eg-bay-wisp' + (glow ? ' eg-bay-wisp-glow' : ''), '🔮');
        el.style.left = Math.round(cx - 22) + 'px';
        el.style.top = Math.round(cy - 22) + 'px';
        wisps.push({ cx, cy, r: 90 + Math.random() * 70, spd: (0.9 + Math.random() * 0.7), ph: Math.random() * Math.PI * 2, glow, el, done: false, t: 0 });
    }

    _egNkLoop(run, (dtS, now) => {
        const pr = _egNkPlayerRect();
        const pc = _egBayPC();
        let active = false;
        for (const w of wisps) {
            if (w.done) continue;
            active = true;
            w.t += dtS;
            const a = w.ph + w.t * w.spd;
            const x = w.cx + Math.cos(a) * w.r;
            const y = w.cy + Math.sin(a) * w.r * 0.6;
            w.el.style.left = Math.round(x - 22) + 'px';
            w.el.style.top = Math.round(y - 22) + 'px';
            if (pr && Math.hypot(pc.x - x, pc.y - y) < 44) {
                w.done = true;
                try { w.el.remove(); } catch (e) {}
                if (w.glow) {
                    // Free evidence: flip toward the wisp's side.
                    _egBayMeterShift(w.cx < W / 2 ? -EG_BAY_WISP_FLIP : EG_BAY_WISP_FLIP);
                    _egNkToast('eg_mech_bay_evidence', '🔮 Evidence accepted — the belief shifts!', '#4ade80');
                } else {
                    _egBayTouch(EG_BAY_WISP_DMG, level, 'Belief Wisp');
                }
            }
            if (w.t >= EG_BAY_WISP_LIFE * _EG_BAY_DEBUG_MULT) {
                w.done = true;
                try { w.el.remove(); } catch (e) {}
            }
        }
        return active;
    });
}


//------------------------------------------------------------------------
//-------------------GRID VEIL (owned by Bayes)----------------------------
//------------------------------------------------------------------------
// The old Bayes owned the Grid Veil machinery; the rework keeps it here so
// the framework's typeof-guarded teardown call still resolves. Creates and
// shows the veil overlay element over the puzzle table.
function _egActivateVeil() {
    _egVeilActive = true;
    const tbl = document.getElementById('ptable');
    if (!tbl) return;
    const parent = tbl.parentElement;
    if (!parent) return;

    let veil = document.getElementById('eg-grid-veil');
    if (!veil) {
        veil = document.createElement('div');
        veil.id = 'eg-grid-veil';
        veil.className = 'eg-grid-veil';
        parent.style.position = 'relative';
        parent.appendChild(veil);
    }
    veil.classList.remove('eg-hidden');
    showToast(t('eg_mech_grid_veil'));
}


// Removes the veil overlay element entirely (framework calls on any cleanup).
// _egRemoveVeil is defined ONCE, in shared-boss-abilities.js (consolidated
// 2026-09 from this file and boss-bloom.js — the copies used to shadow
// each other via load order, and bloom's superset already won).


//------------------------------------------------------------------------
//-------------------ACT II: BELIEF VEIL (60%, once)-----------------------
//------------------------------------------------------------------------
// The classic Grid Veil, upgraded: the puzzle grid is hidden AS BAYES
// BELIEVES IT — the veil tints toward the favoured side and a belief chip
// shows the lean. Near 50/50 the tint fades (clarity = balance).
function _egMechBayVeil(monster, phase) {
    if (_egVeilActive) return;
    _egActivateVeil();

    // Bayes' tint layer over the shared veil + belief chip.
    const veil = document.getElementById('eg-grid-veil');
    if (veil) veil.classList.add('eg-bay-veil-tinted');
    const chip = document.createElement('div');
    chip.className = 'eg-bay-veil-chip';
    document.body.appendChild(chip);

    // One passive run keeps the chip honest and clears itself with the boss.
    const run = _egNkNewRun(monster && monster.id, false);
    run.passive = true;
    run.els.push(chip);
    _egNkLoop(run, () => {
        const v = document.getElementById('eg-grid-veil');
        if (!v) return false;   // veil removed (phase 3 never lifts it; teardown does)
        const abs = Math.abs(_egBayLean);
        chip.textContent = '🔮 BELIEF → ' + (_egBayLean < 0 ? 'LEFT ' : 'RIGHT ') + Math.round(abs) + '%';
        chip.classList.toggle('eg-bay-veil-chip-clear', abs < 10);
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------FINALE: THEOMERE'S GAMBIT (≤10%, one-shot)------------
//------------------------------------------------------------------------
// Bayes bets everything: a 3×3 of districts, each with a truthful danger-
// probability chip. Stand on a chip to flip it to its complement (once per
// district — a gamble). Three cast waves strike the TRUE danger districts.
// Survive all three → Bayes concedes: full-board reveal, and the boss pays
// its own remaining HP for the lost bet. Charge bar frozen (gate in
// _egTickPlayer via _egBayFinalActive).
const EG_BAY_DISTRICT_COLS = [0.16, 0.5, 0.84];
const EG_BAY_DISTRICT_ROWS = [0.24, 0.5, 0.76];
const EG_BAY_STRIKES_PER_WAVE = 3;

// Set while the finale runs (read by _egTickPlayer's charge-freeze gate).
let _egBayFinal = null;

function _egBayFinalActive() {
    return !!_egBayFinal && !_egBayFinal.finished;
}

// Phase-enter hook: starts the ≤10% HP watcher (the framework only calls
// onPhaseEnter on transitions, so a dive from 30% → 10% needs its own gate).
function _egBayOnPhaseEnter(monster, newPhase) {
    if (newPhase !== 3) return false;
    try { _egBayStartFinalWatcher(monster); } catch (e) {}
    return false;
}

function _egBayStartFinalWatcher(monster) {
    if (!monster || _egBayFinal) return;
    const run = _egNkNewRun(monster.id, true);
    run.passive = true;
    _egNkLoop(run, () => {
        if (_egBayFinal) return false;
        try {
            if (monster.currentHP <= monster.maxHP * 0.10) {
                _egBayFinalStart(monster);
                return false;
            }
        } catch (e) { return false; }
        return true;
    });
}

// Pause-safe timeout: if the game freezes mid-wait, retry until thawed
// instead of firing during the pause (mirrors the other finales).
function _egBayAfter(g, ms, fn) {
    const t0 = performance.now();
    const step = () => {
        if (g.finished || !_egBayFinal) return;
        if (_egNkFrozen()) { setTimeout(step, 120); return; }
        if (performance.now() - t0 >= ms) fn();
        else setTimeout(step, Math.min(120, ms - (performance.now() - t0)));
    };
    setTimeout(step, Math.min(120, ms));
}

function _egBayFinalStart(monster) {
    if (_egBayFinal || !monster) return;

    // The oracle goes quiet: kill every other run of this boss (the finale
    // owns the board).
    Array.from(_egNkRuns.values()).forEach(r => {
        if (r.bossId === monster.id) { try { _egNkKillRun(r); } catch (e) {} }
    });

    const W = window.innerWidth, H = window.innerHeight;
    const g = {
        monsterId: monster.id,
        finished: false,
        wave: 0,                    // 0..EG_BAY_WAVES
        districts: [],              // { x, y, shown, flipped, strike, chipEl }
        fxRun: null, overlay: null, boardEl: null,
    };
    _egBayFinal = g;

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
    ov.className = 'eg-bay-cd';
    ov.innerHTML =
        '<div class="eg-bay-cd-label">🔮 THEOMERE\u2019S GAMBIT</div>' +
        '<div class="eg-bay-cd-hint">Chips show TRUE danger — stand on one to gamble on its complement!</div>';
    document.body.appendChild(ov);
    g.overlay = ov;

    _egNkToast('eg_mech_bay_final_cd', '🔮💀 THEOMERE\u2019S GAMBIT — read the board, flip the odds!', '#c4b5fd');

    // Boss immunity for the whole set-piece (released at the end).
    monster.bossImmune = true;

    // The boss card wears the all-in oracle while the finale runs.
    const card = document.getElementById('eg-card-' + monster.id);
    const wrap = card ? (card.querySelector('.eg-emoji-wrapper') || card) : null;
    if (wrap) {
        wrap.classList.add('eg-bay-allin');
        wrap.classList.add('eg-nk-shielded');
    }

    const level = monster.level || 1;

    // The 3×3 board: districts + chips.
    EG_BAY_DISTRICT_ROWS.forEach(ry => {
        EG_BAY_DISTRICT_COLS.forEach(rx => {
            const el = document.createElement('div');
            el.className = 'eg-bay-district';
            el.style.left = Math.round(W * rx - 105) + 'px';
            el.style.top = Math.round(H * ry - 82) + 'px';
            const chip = document.createElement('div');
            chip.className = 'eg-bay-chip';
            chip.textContent = '?';
            el.appendChild(chip);
            document.body.appendChild(el);
            g.fxRun.els.push(el);
            g.districts.push({ x: W * rx, y: H * ry, shown: null, flipped: false, strike: false, el, chipEl: chip });
        });
    });

    // ── One wave of the gambit. ──────────────────────────────────────────
    const runWave = () => {
        if (g.finished) return;
        g.wave++;
        if (g.wave > EG_BAY_WAVES) {
            // Survived every wave: Bayes concedes the bet.
            _egBayConcede(g, monster);
            return;
        }
        _egNkToast('eg_mech_bay_wave', '🔮 Wave ' + g.wave + '/' + EG_BAY_WAVES + ' — the board shows the TRUE odds!', '#c4b5fd');

        // Choose 3 strike districts; chips show TRUTHFUL probabilities
        // (strikes read hot, safes read cool) until the player flips them.
        const order = g.districts.map((d, i) => i).sort(() => Math.random() - 0.5);
        const strikes = order.slice(0, EG_BAY_STRIKES_PER_WAVE);
        g.districts.forEach((d, i) => {
            d.strike = strikes.includes(i);
            d.flipped = false;
            d.shown = d.strike ? (55 + Math.floor(Math.random() * 40)) : (8 + Math.floor(Math.random() * 22));
            d.chipEl.textContent = d.shown + '%';
            d.el.classList.remove('eg-bay-district-strike', 'eg-bay-district-flipped');
        });

        // Bayes swings its belief between waves (cosmetic pressure).
        _egBayLean = -_egBayLean + (Math.random() * 30 - 15);
        _egBayMeterApply();

        _egBayAfter(g, EG_BAY_WAVE_GAP * _EG_BAY_DEBUG_MULT, () => {
            if (g.finished) return;
            // STRIKE the true danger districts (a flipped chip never lies —
            // the district beneath it still burns).
            g.districts.forEach(d => {
                if (d.strike) d.el.classList.add('eg-bay-district-strike');
            });
            const pc = _egBayPC();
            let caught = false;
            for (const d of g.districts) {
                if (!d.strike) continue;
                if (Math.abs(pc.x - d.x) < 110 && Math.abs(pc.y - d.y) < 88) { caught = true; break; }
            }
            if (caught) {
                const dealt = _egNkHit(EG_BAY_DISTRICT_HIT, 'lightning', level);
                _egNkAbilityHitToast(dealt, 'Bayes', 'Gambit Wave ' + g.wave);
            }
            _egBayAfter(g, 900 * _EG_BAY_DEBUG_MULT, () => {
                if (g.finished) return;
                g.districts.forEach(d => {
                    d.strike = false;
                    d.el.classList.remove('eg-bay-district-strike');
                    d.chipEl.textContent = '?';
                    d.shown = null;
                });
                runWave();
            });
        });
    };

    // Flip watch: standing on a chip with a shown value flips it ONCE.
    _egNkLoop(g.fxRun, (dtS) => {
        if (g.finished) return false;
        const pc = _egBayPC();
        for (const d of g.districts) {
            if (d.shown === null || d.flipped) continue;
            if (Math.abs(pc.x - d.x) < 100 && Math.abs(pc.y - d.y) < 80) {
                d.flipped = true;
                d.shown = 100 - d.shown;
                d.chipEl.textContent = d.shown + '%';
                d.el.classList.add('eg-bay-district-flipped');
                _egNkToast('eg_mech_bay_flip', '🔮 Chip flipped — you bet on the complement!', '#facc15');
                break;  // one flip per moment — re-evaluate next frame
            }
        }
        return true;
    });

    runWave();
}

// Concession: the lost bet — full reveal, release, and the boss pays its
// own remaining HP through the canonical damage path (a real kill).
function _egBayConcede(g, monster) {
    if (g.finished) return;
    _egNkToast('eg_mech_bay_concede', '🔮 THE PRIOR COLLAPSES — Bayes concedes the round!', '#4ade80');
    // Full-board reveal: every true probability laid bare.
    g.districts.forEach(d => {
        d.chipEl.textContent = d.strike ? '100%' : '0%';
        d.el.classList.add(d.strike ? 'eg-bay-district-strike' : 'eg-bay-district-safe-reveal');
    });
    _egBayFinalEnd(g, monster);
    // The price of a lost bet: remaining HP, through the canonical path so
    // resistances/phase checks/death flow all apply. Immunity is already
    // released by _egBayFinalEnd.
    try {
        const m = (typeof _egMonsters !== 'undefined') ? _egMonsters.find(x => x && x.id === g.monsterId) : null;
        if (m && typeof _egDamageTargetById === 'function' && m.currentHP > 0) {
            _egDamageTargetById(g.monsterId, m.currentHP, ['lightning'], {});
        }
    } catch (e) {}
}

// Ends the finale: releases immunity + charge bar and cleans the board.
function _egBayFinalEnd(g, monster) {
    if (!g || g.finished) return;
    g.finished = true;
    try { if (g.fxRun) _egNkKillRun(g.fxRun); } catch (e) {}
    document.querySelectorAll('.eg-bay-district, .eg-bay-chip, .eg-bay-cd').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    const card = document.getElementById('eg-card-' + g.monsterId);
    const wrap = card ? (card.querySelector('.eg-emoji-wrapper') || card) : null;
    if (wrap) {
        wrap.classList.remove('eg-bay-allin');
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
function _egBayTeardown() {
    if (_egBayFinal) { try { _egBayFinalEnd(_egBayFinal, null); } catch (e) {} _egBayFinal = null; }
    _egBayMeterHide();
    document.querySelectorAll('.eg-bay-bolt-warn, .eg-bay-bolt, .eg-bay-evidence, ' +
        '.eg-bay-wisp, .eg-bay-veil-chip, .eg-bay-district, .eg-bay-chip, .eg-bay-cd').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    document.querySelectorAll('.eg-bay-allin').forEach(el => el.classList.remove('eg-bay-allin'));
    const veil = document.getElementById('eg-grid-veil');
    if (veil) veil.classList.remove('eg-bay-veil-tinted');
    _egBayLean = 0;
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('eg-charge-paused');
    });
}


//------------------------------------------------------------------------
//-------------------PLAYTEST CONSOLE HOOK (dev only)----------------------
//------------------------------------------------------------------------
// Tiny console API for playtesting with stretched debug timings:
//   _EG_BAY_DEBUG.fire('bolts'|'wisps'|'veil', phase) — runs one now
//   _EG_BAY_DEBUG.lean(n)                             — set the meter by hand
//   _EG_BAY_DEBUG.final()                             — THE GAMBIT now
if (typeof window !== 'undefined') {
    window._EG_BAY_DEBUG = {
        fire: (name, phase) => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? _egMonsters.find(m => m && m.baseId === 'boss_bayes') : null;
            if (!monster) return 'no bayes alive';
            const fn = name === 'bolts' ? _egMechBayBolts
                : name === 'wisps' ? _egMechBayWisps
                : name === 'veil' ? _egMechBayVeil : null;
            if (!fn) return 'unknown: ' + name;
            if (name !== 'bolts' && name !== 'veil' && _egNkDodgeBusy()) return 'BLOCKED: dodge-busy (wait for the field to clear)';
            fn(monster, phase || monster.bossPhase || 1);
            return 'fired ' + name;
        },
        lean: (n) => { _egBayLean = Math.max(-100, Math.min(100, Number(n) || 0)); _egBayMeterApply(); return 'lean = ' + _egBayLean; },
        final: () => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? _egMonsters.find(m => m && m.baseId === 'boss_bayes') : null;
            if (!monster) return 'no bayes alive';
            _egBayFinalStart(monster);
            return 'THEOMERE\u2019S GAMBIT started';
        },
    };
}
