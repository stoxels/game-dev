import { t } from '../../translation/translations.js';
import { _damageTargetById } from '../encounter-monster-damage.js';
import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkAbilityHitToast, _nkDodgeBusy, _nkEl, _nkFrozen, _nkHit, _nkKillRun, _nkLoop, _nkNewRun, _nkPlayerCenter, _nkPlayerRect, _nkRuns, _nkToast } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: BAYES (boss_bayes)------------------------------
//------------------------------------------------------------------------
// Tier-7 rework "The Grand Prior": a belief meter leans SAFE LEFT/RIGHT
// and casts strike the favoured side - feed evidence (rings, wisps) to
// flip it. Belief veil + wisps join at 60%; THEOMERE'S GAMBIT at ≤10%:
// flip district chips, survive three waves, and Bayes concedes.
//------------------------------------------------------------------------

// DEBUG: slow Bayes' timing 2.5x so manual playtests / screenshot
// automation can catch mid-animation states. Off for ship.
export const _BAY_DEBUG_SLOW = false;
export const _BAY_DEBUG_MULT = _BAY_DEBUG_SLOW ? 2.5 : 1;

Object.assign(BOSS_DEFS, {
    boss_bayes: {
        id: 'boss_bayes', name: 'Bayes', emoji: '🔮',
        baseHP: 1100, baseDamage: 20, chargeMax: 12,
        element: 'lightning', resistances: { fire: 15, cold: 15, lightning: 30, shadow: 15 }
    },
});

Object.assign(BOSS_MECHANICS, {

    // boss_bayes - "The Grand Prior" (rework)
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
            { name: 'posterior_bolts', intervalBase: 19000, intervalVariance: 4500, handler: '_mechBayBolts' },
            { name: 'prior_bomb', intervalBase: 18000, intervalVariance: 4000, handler: '_mechPriorBomb' },
            { name: 'evidence_wisps', intervalBase: 21000, intervalVariance: 5000, handler: '_mechBayWisps', phase2Only: true },
            // belief_veil fires once on phase 2 activation; intervalBase is set
            // absurdly high so it never self-reschedules after that first trigger.
            { name: 'belief_veil', intervalBase: 999999999, intervalVariance: 0, handler: '_mechBayVeil', phase2Only: true },
        ],
        onPhaseEnter: _bayOnPhaseEnter,
    },
});


// ── Shared tuning (per-mechanic constants live with their mechanics) ────────
export const BAY_BOLT_DMG   = [0, 0.15, 0.17, 0.20]; // %maxHP bolt wave hit
export const BAY_WISP_DMG   = 0.10;                  // %maxHP favoured-side wisp
export const BAY_WISP_FLIP  = 15;                    // meter points per wisp flip
export const BAY_WISP_LIFE  = 4.2;                   // s a wisp drifts
export const BAY_DISTRICT_HIT = 0.18;                // %maxHP caught in a wave
export const BAY_WAVES      = 3;                     // gambit cast waves
export const BAY_WAVE_GAP   = 4200;                  // ms per gambit wave
export const BAY_HIT_CD_MS  = 700;                   // shared touch cooldown


//------------------------------------------------------------------------
//-------------------BELIEF METER (shared state)---------------------------
//------------------------------------------------------------------------
// Lean: −100 = absolutely certain SAFE LEFT, +100 = absolutely certain
// SAFE RIGHT, 0 = 50/50 (maximum clarity). Lives in a per-run global so the
// veil chip, the wisps and the bolts all read one truth.
export let _bayLean = 0;
export let _bayMeterEl = null;

export function _bayMeterApply() {
    if (!_bayMeterEl) {
        _bayMeterEl = document.createElement('div');
        _bayMeterEl.className = 'eg-bay-meter';
        _bayMeterEl.innerHTML =
            '<div class="eg-bay-meter-half eg-bay-meter-left">SAFE LEFT</div>' +
            '<div class="eg-bay-meter-needle"></div>' +
            '<div class="eg-bay-meter-half eg-bay-meter-right">SAFE RIGHT</div>';
        document.body.appendChild(_bayMeterEl);
    }
    _bayMeterEl.style.setProperty('--bay-lean', String(Math.round(_bayLean)));
    _bayMeterEl.classList.toggle('eg-bay-meter-balanced', Math.abs(_bayLean) < 10);
}

export function _bayMeterShift(delta) {
    _bayLean = Math.max(-100, Math.min(100, _bayLean + delta));
    _bayMeterApply();
}

export function _bayMeterShow() { _bayMeterApply(); }

export function _bayMeterHide() {
    if (_bayMeterEl) { try { _bayMeterEl.remove(); } catch (e) {} _bayMeterEl = null; }
}

// Which side does the meter currently favour? (0 → coin flip, that IS the
// 50/50 state - Bayes must still believe something.)
export function _bayFavouredSide() {
    if (_bayLean < 0) return 'left';
    if (_bayLean > 0) return 'right';
    return Math.random() < 0.5 ? 'left' : 'right';
}

export function _baySideX(side) {
    const W = window.innerWidth;
    return side === 'left' ? W * 0.28 : W * 0.72;
}


//------------------------------------------------------------------------
//-------------------SHARED VISUAL HELPERS---------------------------------
//------------------------------------------------------------------------

// Touch damage helper shared by all Bayes hazards. Returns true if a hit
// was rolled (respects the per-touch cooldown).
export let _bayHitCd = 0;
export function _bayTouch(pct, level, label) {
    const now = performance.now();
    if (now < _bayHitCd) return false;
    const pr = _nkPlayerRect();
    if (!pr) return false;
    _bayHitCd = now + BAY_HIT_CD_MS;
    const dealt = _nkHit(pct, 'lightning', level);
    _nkAbilityHitToast(dealt, 'Bayes', label);
    return true;
}

// Player centre with a screen-centre fallback.
export function _bayPC() { const c = _nkPlayerCenter(); return c || { x: window.innerWidth / 2, y: window.innerHeight / 2 }; }


//------------------------------------------------------------------------
//-------------------SIGNATURE: POSTERIOR BOLTS (all fight)----------------
//------------------------------------------------------------------------
// Lightning waves strike the currently-BELIEVED-SAFE side in wide columns;
// after the cast the meter shifts toward the other side (evidence updates).
// The EVIDENCE RING on the punished side pays out meter shifts if you hold
// it through a bolt landing.
export const BAY_BOLTS = [0, 2, 3, 4];   // bolt columns per cast, by phase
export const BAY_BOLT_W = 170;           // column width
export const BAY_BOLT_WARN_MS = 900;     // per-column telegraph
export const BAY_BOLT_GAP_MS = 560;      // stagger between columns
export const BAY_EVIDENCE_SHIFT = 25;    // meter points per bolt held in the ring
export const BAY_SELF_UPDATE = 20;       // meter points Bayes shifts after a cast

export function _mechBayBolts(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const H = window.innerHeight;
    const run = _nkNewRun(monster && monster.id, true);
    const favoured = _bayFavouredSide();
    const punished = favoured === 'left' ? 'right' : 'left';
    _nkToast('eg_mech_bay_bolts', '🔮⚡ POSTERIOR BOLTS - Bayes strikes its ' + favoured.toUpperCase() + ' belief!', '#c4b5fd');

    // Evidence ring on the punished side (hold it = flip the meter your way).
    const ringX = _baySideX(punished) + (Math.random() * 120 - 60);
    const ringY = H * (0.3 + Math.random() * 0.4);
    const ring = _nkEl(run, 'div', 'eg-bay-evidence');
    ring.style.left = Math.round(ringX - 70) + 'px';
    ring.style.top = Math.round(ringY - 70) + 'px';

    // Columns: random positions within the favoured half.
    const favX = _baySideX(favoured);
    const columns = [];
    for (let i = 0; i < BAY_BOLTS[p]; i++) {
        columns.push({
            x: favX + (Math.random() * 320 - 160),
            warnAt: i * BAY_BOLT_GAP_MS,
            strikeAt: i * BAY_BOLT_GAP_MS + BAY_BOLT_WARN_MS,
            warnEl: null, struck: false,
        });
    }

    let t = 0, lastShifted = 0;
    _nkLoop(run, (dtS, now) => {
        t += dtS * 1000;
        const pr = _nkPlayerRect();
        const pc = _bayPC();
        columns.forEach(col => {
            if (col.struck) return;
            if (t >= col.warnAt && !col.warnEl) {
                col.warnEl = _nkEl(run, 'div', 'eg-bay-bolt-warn');
                col.warnEl.style.left = Math.round(col.x - BAY_BOLT_W / 2) + 'px';
                col.warnEl.style.top = '0px';
                col.warnEl.style.width = BAY_BOLT_W + 'px';
                col.warnEl.style.height = H + 'px';
            }
            if (t >= col.strikeAt) {
                // STRIKE.
                if (col.warnEl) { try { col.warnEl.remove(); } catch (e) {} col.warnEl = null; }
                const bolt = _nkEl(run, 'div', 'eg-bay-bolt');
                bolt.style.left = Math.round(col.x - BAY_BOLT_W / 2) + 'px';
                bolt.style.top = '0px';
                bolt.style.width = BAY_BOLT_W + 'px';
                bolt.style.height = H + 'px';
                setTimeout(() => { try { bolt.remove(); } catch (e) {} }, _BAY_DEBUG_SLOW ? 1200 : 500);
                if (pr && Math.abs(pc.x - col.x) < BAY_BOLT_W / 2 + 12) {
                    _bayTouch(BAY_BOLT_DMG[p], level, 'Posterior Bolt');
                }
                // Evidence pay-out: holding the ring while a bolt lands.
                if (pr && Math.hypot(pc.x - ringX, pc.y - ringY) < 78 && now - lastShifted > 300) {
                    lastShifted = now;
                    _bayMeterShift(punished === 'left' ? -BAY_EVIDENCE_SHIFT : BAY_EVIDENCE_SHIFT);
                    ring.classList.remove('eg-bay-evidence-pop');
                    void ring.offsetWidth;
                    ring.classList.add('eg-bay-evidence-pop');
                }
                col.struck = true;
            }
        });
        if (t >= BAY_BOLT_GAP_MS * BAY_BOLTS[p] + BAY_BOLT_WARN_MS + 400) {
            try { ring.remove(); } catch (e) {}
            // Bayes updates itself against the evidence: the meter drifts
            // toward the OTHER side after every cast.
            _bayMeterShift(favoured === 'left' ? BAY_SELF_UPDATE : -BAY_SELF_UPDATE);
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
// non-favoured side glow (free evidence - pull the next cast away from
// you); wisps on the favoured side sting on contact. Two spawn on the
// non-favoured side, one on the favoured side.
export const BAY_WISP_COUNT = 3;
export const BAY_WISP_SPEED = 120;      // px/s drift (divided by mult)

export function _mechBayWisps(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _nkNewRun(monster && monster.id, true);
    const favoured = _bayFavouredSide();
    _nkToast('eg_mech_bay_wisps', '🔮 EVIDENCE WISPS - touch the glowing side to flip the belief!', '#c4b5fd');

    const wisps = [];
    for (let i = 0; i < BAY_WISP_COUNT; i++) {
        // 2 on the punished (glowing) side, 1 on the favoured (stinging) side.
        const side = i < 2 ? (favoured === 'left' ? 'right' : 'left') : favoured;
        const glow = side !== favoured;
        const cx = _baySideX(side) + (Math.random() * 160 - 80);
        const cy = H * (0.25 + Math.random() * 0.5);
        const el = _nkEl(run, 'div', 'eg-bay-wisp' + (glow ? ' eg-bay-wisp-glow' : ''), '🔮');
        el.style.left = Math.round(cx - 22) + 'px';
        el.style.top = Math.round(cy - 22) + 'px';
        wisps.push({ cx, cy, r: 90 + Math.random() * 70, spd: (0.9 + Math.random() * 0.7), ph: Math.random() * Math.PI * 2, glow, el, done: false, t: 0 });
    }

    _nkLoop(run, (dtS, now) => {
        const pr = _nkPlayerRect();
        const pc = _bayPC();
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
                    _bayMeterShift(w.cx < W / 2 ? -BAY_WISP_FLIP : BAY_WISP_FLIP);
                    _nkToast('eg_mech_bay_evidence', '🔮 Evidence accepted - the belief shifts!', '#4ade80');
                } else {
                    _bayTouch(BAY_WISP_DMG, level, 'Belief Wisp');
                }
            }
            if (w.t >= BAY_WISP_LIFE * _BAY_DEBUG_MULT) {
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
export function _activateVeil() {
    globalThis._veilActive = true;
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
    globalThis.showCombatToast(t('eg_mech_grid_veil'));
}


// Removes the veil overlay element entirely (framework calls on any cleanup).
// _removeVeil is defined ONCE, in shared-puzzle-mechanics.js (consolidated
// 2026-09 from this file and boss-bloom.js - the copies used to shadow
// each other via load order, and bloom's superset already won).


//------------------------------------------------------------------------
//-------------------ACT II: BELIEF VEIL (60%, once)-----------------------
//------------------------------------------------------------------------
// The classic Grid Veil, upgraded: the puzzle grid is hidden AS BAYES
// BELIEVES IT - the veil tints toward the favoured side and a belief chip
// shows the lean. Near 50/50 the tint fades (clarity = balance).
export function _mechBayVeil(monster, phase) {
    if (globalThis._veilActive) return;
    _activateVeil();

    // Bayes' tint layer over the shared veil + belief chip.
    const veil = document.getElementById('eg-grid-veil');
    if (veil) veil.classList.add('eg-bay-veil-tinted');
    const chip = document.createElement('div');
    chip.className = 'eg-bay-veil-chip';
    document.body.appendChild(chip);

    // One passive run keeps the chip honest and clears itself with the boss.
    const run = _nkNewRun(monster && monster.id, false);
    run.passive = true;
    run.els.push(chip);
    _nkLoop(run, () => {
        const v = document.getElementById('eg-grid-veil');
        if (!v) return false;   // veil removed (phase 3 never lifts it; teardown does)
        const abs = Math.abs(_bayLean);
        chip.textContent = '🔮 BELIEF → ' + (_bayLean < 0 ? 'LEFT ' : 'RIGHT ') + Math.round(abs) + '%';
        chip.classList.toggle('eg-bay-veil-chip-clear', abs < 10);
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------FINALE: THEOMERE'S GAMBIT (≤10%, one-shot)------------
//------------------------------------------------------------------------
// Bayes bets everything: a 3×3 of districts, each with a truthful danger-
// probability chip. Stand on a chip to flip it to its complement (once per
// district - a gamble). Three cast waves strike the TRUE danger districts.
// Survive all three → Bayes concedes: full-board reveal, and the boss pays
// its own remaining HP for the lost bet. Charge bar frozen (gate in
// _tickPlayer via _bayFinalActive).
export const BAY_DISTRICT_COLS = [0.16, 0.5, 0.84];
export const BAY_DISTRICT_ROWS = [0.24, 0.5, 0.76];
export const BAY_STRIKES_PER_WAVE = 3;

// Set while the finale runs (read by _tickPlayer's charge-freeze gate).
export let _bayFinal = null;

export function _bayFinalActive() {
    return !!_bayFinal && !_bayFinal.finished;
}

// Phase-enter hook: starts the ≤10% HP watcher (the framework only calls
// onPhaseEnter on transitions, so a dive from 30% → 10% needs its own gate).
export function _bayOnPhaseEnter(monster, newPhase) {
    if (newPhase !== 3) return false;
    try { _bayStartFinalWatcher(monster); } catch (e) {}
    return false;
}

export function _bayStartFinalWatcher(monster) {
    if (!monster || _bayFinal) return;
    const run = _nkNewRun(monster.id, true);
    run.passive = true;
    _nkLoop(run, () => {
        if (_bayFinal) return false;
        try {
            if (monster.currentHP <= monster.maxHP * 0.10) {
                _bayFinalStart(monster);
                return false;
            }
        } catch (e) { return false; }
        return true;
    });
}

// Pause-safe timeout: if the game freezes mid-wait, retry until thawed
// instead of firing during the pause (mirrors the other finales).
export function _bayAfter(g, ms, fn) {
    const t0 = performance.now();
    const step = () => {
        if (g.finished || !_bayFinal) return;
        if (_nkFrozen()) { setTimeout(step, 120); return; }
        if (performance.now() - t0 >= ms) fn();
        else setTimeout(step, Math.min(120, ms - (performance.now() - t0)));
    };
    setTimeout(step, Math.min(120, ms));
}

export function _bayFinalStart(monster) {
    if (_bayFinal || !monster) return;

    // The oracle goes quiet: kill every other run of this boss (the finale
    // owns the board).
    Array.from(_nkRuns.values()).forEach(r => {
        if (r.bossId === monster.id) { try { _nkKillRun(r); } catch (e) {} }
    });

    const W = window.innerWidth, H = window.innerHeight;
    const g = {
        monsterId: monster.id,
        finished: false,
        wave: 0,                    // 0..BAY_WAVES
        districts: [],              // { x, y, shown, flipped, strike, chipEl }
        fxRun: null, overlay: null, boardEl: null,
    };
    _bayFinal = g;

    // Freeze the auto-attack charge bar for the whole set-piece (the gate
    // lives in _tickPlayer; this class is the visual twin).
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('eg-charge-paused');
    });

    // FX run (passive): holds the finale timeline.
    g.fxRun = _nkNewRun(monster.id, true);
    g.fxRun.passive = true;

    // Countdown overlay.
    const ov = document.createElement('div');
    ov.className = 'eg-bay-cd';
    ov.innerHTML =
        '<div class="eg-bay-cd-label">🔮 THEOMERE\u2019S GAMBIT</div>' +
        '<div class="eg-bay-cd-hint">Chips show TRUE danger - stand on one to gamble on its complement!</div>';
    document.body.appendChild(ov);
    g.overlay = ov;

    _nkToast('eg_mech_bay_final_cd', '🔮💀 THEOMERE\u2019S GAMBIT - read the board, flip the odds!', '#c4b5fd');

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
    BAY_DISTRICT_ROWS.forEach(ry => {
        BAY_DISTRICT_COLS.forEach(rx => {
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
        if (g.wave > BAY_WAVES) {
            // Survived every wave: Bayes concedes the bet.
            _bayConcede(g, monster);
            return;
        }
        _nkToast('eg_mech_bay_wave', '🔮 Wave ' + g.wave + '/' + BAY_WAVES + ' - the board shows the TRUE odds!', '#c4b5fd');

        // Choose 3 strike districts; chips show TRUTHFUL probabilities
        // (strikes read hot, safes read cool) until the player flips them.
        const order = g.districts.map((d, i) => i).sort(() => Math.random() - 0.5);
        const strikes = order.slice(0, BAY_STRIKES_PER_WAVE);
        g.districts.forEach((d, i) => {
            d.strike = strikes.includes(i);
            d.flipped = false;
            d.shown = d.strike ? (55 + Math.floor(Math.random() * 40)) : (8 + Math.floor(Math.random() * 22));
            d.chipEl.textContent = d.shown + '%';
            d.el.classList.remove('eg-bay-district-strike', 'eg-bay-district-flipped');
        });

        // Bayes swings its belief between waves (cosmetic pressure).
        _bayLean = -_bayLean + (Math.random() * 30 - 15);
        _bayMeterApply();

        _bayAfter(g, BAY_WAVE_GAP * _BAY_DEBUG_MULT, () => {
            if (g.finished) return;
            // STRIKE the true danger districts (a flipped chip never lies -
            // the district beneath it still burns).
            g.districts.forEach(d => {
                if (d.strike) d.el.classList.add('eg-bay-district-strike');
            });
            const pc = _bayPC();
            let caught = false;
            for (const d of g.districts) {
                if (!d.strike) continue;
                if (Math.abs(pc.x - d.x) < 110 && Math.abs(pc.y - d.y) < 88) { caught = true; break; }
            }
            if (caught) {
                const dealt = _nkHit(BAY_DISTRICT_HIT, 'lightning', level);
                _nkAbilityHitToast(dealt, 'Bayes', 'Gambit Wave ' + g.wave);
            }
            _bayAfter(g, 900 * _BAY_DEBUG_MULT, () => {
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
    _nkLoop(g.fxRun, (dtS) => {
        if (g.finished) return false;
        const pc = _bayPC();
        for (const d of g.districts) {
            if (d.shown === null || d.flipped) continue;
            if (Math.abs(pc.x - d.x) < 100 && Math.abs(pc.y - d.y) < 80) {
                d.flipped = true;
                d.shown = 100 - d.shown;
                d.chipEl.textContent = d.shown + '%';
                d.el.classList.add('eg-bay-district-flipped');
                _nkToast('eg_mech_bay_flip', '🔮 Chip flipped - you bet on the complement!', '#facc15');
                break;  // one flip per moment - re-evaluate next frame
            }
        }
        return true;
    });

    runWave();
}

// Concession: the lost bet - full reveal, release, and the boss pays its
// own remaining HP through the canonical damage path (a real kill).
export function _bayConcede(g, monster) {
    if (g.finished) return;
    _nkToast('eg_mech_bay_concede', '🔮 THE PRIOR COLLAPSES - Bayes concedes the round!', '#4ade80');
    // Full-board reveal: every true probability laid bare.
    g.districts.forEach(d => {
        d.chipEl.textContent = d.strike ? '100%' : '0%';
        d.el.classList.add(d.strike ? 'eg-bay-district-strike' : 'eg-bay-district-safe-reveal');
    });
    _bayFinalEnd(g, monster);
    // The price of a lost bet: remaining HP, through the canonical path so
    // resistances/phase checks/death flow all apply. Immunity is already
    // released by _bayFinalEnd.
    try {
        const m = (typeof _monsters !== 'undefined') ? globalThis._monsters.find(x => x && x.id === g.monsterId) : null;
        if (m && typeof _damageTargetById === 'function' && m.currentHP > 0) {
            _damageTargetById(g.monsterId, m.currentHP, ['lightning'], {});
        }
    } catch (e) {}
}

// Ends the finale: releases immunity + charge bar and cleans the board.
export function _bayFinalEnd(g, monster) {
    if (!g || g.finished) return;
    g.finished = true;
    try { if (g.fxRun) _nkKillRun(g.fxRun); } catch (e) {}
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
        const m = (typeof _monsters !== 'undefined') ? globalThis._monsters.find(x => x && x.id === g.monsterId) : null;
        if (m) m.bossImmune = false;
    } catch (e) {}
    void monster;
}


//------------------------------------------------------------------------
//-------------------TEARDOWN----------------------------------------------
//------------------------------------------------------------------------
// Called from _bossCleanup on boss death AND from the encounter stop -
// removes every run element, overlay and body class this boss ever created.
export function _bayTeardown() {
    if (_bayFinal) { try { _bayFinalEnd(_bayFinal, null); } catch (e) {} _bayFinal = null; }
    _bayMeterHide();
    document.querySelectorAll('.eg-bay-bolt-warn, .eg-bay-bolt, .eg-bay-evidence, ' +
        '.eg-bay-wisp, .eg-bay-veil-chip, .eg-bay-district, .eg-bay-chip, .eg-bay-cd').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    document.querySelectorAll('.eg-bay-allin').forEach(el => el.classList.remove('eg-bay-allin'));
    const veil = document.getElementById('eg-grid-veil');
    if (veil) veil.classList.remove('eg-bay-veil-tinted');
    _bayLean = 0;
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('eg-charge-paused');
    });
}


//------------------------------------------------------------------------
//-------------------PLAYTEST CONSOLE HOOK (dev only)----------------------
//------------------------------------------------------------------------
// Tiny console API for playtesting with stretched debug timings:
//   _BAY_DEBUG.fire('bolts'|'wisps'|'veil', phase) - runs one now
//   _BAY_DEBUG.lean(n)                             - set the meter by hand
//   _BAY_DEBUG.final()                             - THE GAMBIT now
if (typeof window !== 'undefined') {
    window._BAY_DEBUG = {
        fire: (name, phase) => {
            const monster = (typeof _monsters !== 'undefined')
                ? globalThis._monsters.find(m => m && m.baseId === 'boss_bayes') : null;
            if (!monster) return 'no bayes alive';
            const fn = name === 'bolts' ? _mechBayBolts
                : name === 'wisps' ? _mechBayWisps
                : name === 'veil' ? _mechBayVeil : null;
            if (!fn) return 'unknown: ' + name;
            if (name !== 'bolts' && name !== 'veil' && _nkDodgeBusy()) return 'BLOCKED: dodge-busy (wait for the field to clear)';
            fn(monster, phase || monster.bossPhase || 1);
            return 'fired ' + name;
        },
        lean: (n) => { _bayLean = Math.max(-100, Math.min(100, Number(n) || 0)); _bayMeterApply(); return 'lean = ' + _bayLean; },
        final: () => {
            const monster = (typeof _monsters !== 'undefined')
                ? globalThis._monsters.find(m => m && m.baseId === 'boss_bayes') : null;
            if (!monster) return 'no bayes alive';
            _bayFinalStart(monster);
            return 'THEOMERE\u2019S GAMBIT started';
        },
    };
}
