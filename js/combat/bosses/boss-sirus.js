import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkAbilityHitToast, _nkDodgeBusy, _nkDotHit, _nkEl, _nkFrozen, _nkHit, _nkKillRun, _nkLoop, _nkNewRun, _nkPlayerCenter, _nkPlayerRect, _nkRuns, _nkToast } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE STORMCALLER (boss_sirus)--------------------
//------------------------------------------------------------------------
// Tier-8 rework "The Eye of the Storm": ion fronts sweep the arena (step
// into each front's TANGENT opening), getting zapped CHARGES you, chain
// lightning hunts the charged faster (lure it over water), and the storm
// eye's web of safe cells shelters from the raging storm. PERFECT STORM at
// ≤10%: closing storm walls (red = get out, green = get in), charged
// bullets, then one reachable eye before the final strike.
//------------------------------------------------------------------------

// DEBUG: slow The Stormcaller's timing 2.5x so manual playtests /
// screenshot automation can catch mid-animation states. Off for ship.
export const _SIR_DEBUG_SLOW = false;
export const _SIR_DEBUG_MULT = _SIR_DEBUG_SLOW ? 2.5 : 1;

Object.assign(BOSS_DEFS, {
    boss_sirus: {
        id: 'boss_sirus', name: 'The Stormcaller', emoji: '⛈️',
        baseHP: 1060, baseDamage: 23, chargeMax: 12,
        element: 'lightning', resistances: { fire: 15, cold: 15, lightning: 30, shadow: 15 }
    },
});

Object.assign(BOSS_MECHANICS, {

    // boss_sirus - "The Eye of the Storm" (rework)
    // Phase 1 (100% → 60%): Ion Current + Probability Shift
    // Phase 2 ( 60% → 30%): immune window; Chain Lightning + Storm Eye join
    // Phase 3 ( 30% →  0%): pincer currents, two lightning balls, the storm
    //                        eye returns once; at 10% PERFECT STORM begins
    boss_sirus: {
        phases: [
            // Basic attacks stay a steady pressure (the framework floors
            // them at 13% of max life); the mechanics are the real threat.
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 12, damageMultiplier: 1.15 },
            { threshold: 0.30, chargeMax: 11, damageMultiplier: 1.30 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'ion_current', intervalBase: 14000, intervalVariance: 3000, handler: '_mechSirIon' },
            { name: 'probability_shift', intervalBase: 20000, intervalVariance: 5000, handler: '_mechProbabilityShift' },
            { name: 'chain_lightning', intervalBase: 16000, intervalVariance: 4000, handler: '_mechSirChain', phase2Only: true },
            { name: 'storm_eye', intervalBase: 999999999, intervalVariance: 0, handler: '_mechSirEye', phase2Only: true },
        ],
        onPhaseEnter: _sirOnPhaseEnter,
    },
});


// ── Shared tuning (per-mechanic constants live with their mechanics) ────────
export const SIR_TOUCH_CD_MS = 700;      // shared touch cooldown
// NOTE: all damage constants below are BEFORE the global failed-dodge x2
// (NK_FAIL_MULT in shared-boss-abilities.js).


//------------------------------------------------------------------------
//-------------------SHARED VISUAL HELPERS---------------------------------
//------------------------------------------------------------------------

// Touch damage helper shared by all Stormcaller hazards. Lightning-element
// boss - hits go in with element 'lightning' so the toast palette stays
// yellow.
export let _sirHitCd = 0;
export function _sirTouch(pct, level, label) {
    const now = performance.now();
    if (now < _sirHitCd) return false;
    const pr = _nkPlayerRect();
    if (!pr) return false;
    _sirHitCd = now + SIR_TOUCH_CD_MS;
    const dealt = _nkHit(pct, 'lightning', level);
    _nkAbilityHitToast(dealt, 'The Stormcaller', label);
    return true;
}

// Player centre with a screen-centre fallback.
export function _sirPC() { const c = _nkPlayerCenter(); return c || { x: window.innerWidth / 2, y: window.innerHeight / 2 }; }

// Proven reward pattern (Siren echo zones / Swarm royal jelly): heals go
// through a guarded clamp + rerender.
export function _sirHeal(amount) {
    if (typeof playerCurrentHP === 'undefined') return;
    const before = globalThis.playerCurrentHP;
    globalThis.playerCurrentHP = Math.min(globalThis.playerMaxHP || before, before + (globalThis._lifeGain ? globalThis._lifeGain(amount) : (amount)));
    if (globalThis.playerCurrentHP !== before && typeof _renderPlayerHealth === 'function') globalThis._renderPlayerHealth();
}


//------------------------------------------------------------------------
//-------------------SIGNATURE: ION CURRENT (all fight)---------------------
//------------------------------------------------------------------------
// Glowing ion fronts sweep the arena from the top edge, one after the
// other. Each front has ONE opening - the TANGENT - where the current is
// cool; anywhere else the front zaps you once (a real hit) and puts 2
// CHARGE stacks on you. Charge decays one stack per 4s and makes the Chain
// Lightning balls hunt you faster. The first tangent always opens within
// walking reach; the second one shifts sideways (also within reach) so you
// must step across. Phase 3: a PINCER - one front from the top, one from
// the bottom at the same time, sharing a single tangent column.
export const SIR_ION_N      = [0, 2, 2, 2]; // fronts per cast
export const SIR_ION_WARN   = 1500;         // telegraph before a front moves
export const SIR_ION_SPD    = [0, 190, 210, 230]; // px/s front travel
export const SIR_ION_HOT    = [0, 6.5, 7.5, 9.0]; // (legacy) old DoT %/s - fronts now hit once
export const SIR_TANGENT_MS = 900;          // (legacy) old tangent window
export const SIR_CHARGE_MAX = 5;            // charge stacks
export const SIR_CHARGE_DECAY_MS = 4000;    // stacks fall off one per this
export const SIR_AURA_DPS   = [0, 2.0, 2.5, 3.0]; // (legacy) old self-aura DoT - removed
const SIR_ION_DMG    = [0, 0.15, 0.175, 0.20];    // %maxHP when a front catches you
const SIR_ION_BAND   = 56;                       // front thickness (px)
const SIR_ION_GAP    = [0, 210, 190, 180];       // tangent opening width (px)
const SIR_ION_STAGGER = 1600;                    // ms between the two fronts (phase 1-2)
const SIR_WALK_PX_S  = 320;                      // avatar speed (AVATAR_MOVE_SPEED_PX_PER_SEC)
const SIR_REACT_MS   = 700;                      // reaction time we always leave the player
const SIR_BOLT_PER_STACK = 18;                   // px/s extra ball speed per charge stack

// Fight-global charge (read by Chain Lightning + Perfect Storm).
export let _sirCharge = 0, _sirChargeUntil = 0;
export let _sirChipRun = null;   // the HUD chip's run (teardown kills it)

// The charge HUD chip: ⚡ stacks while charged (Bloom's WILT-chip pattern).
export function _sirEnsureChip() {
    if (_sirChipRun) return;
    const chip = document.createElement('div');
    chip.className = 'eg-sir-charge-chip';
    chip.style.display = 'none';   // hidden until the first tick shows stacks
    document.body.appendChild(chip);
    const run = _nkNewRun('boss_sirus', false);
    run.passive = true;
    run.els.push(chip);
    _sirChipRun = run;
    _nkLoop(run, () => {
        const stacks = _sirChargeNow();
        chip.style.display = stacks > 0 ? '' : 'none';
        chip.textContent = '⚡ CHARGE ' + stacks + '/' + SIR_CHARGE_MAX + ' - the storm hunts you faster';
        chip.classList.toggle('eg-sir-charge-full', stacks >= SIR_CHARGE_MAX);
        return true;
    });
}

// Shared: returns the player's current charge stacks (and applies decay).
export function _sirChargeNow() {
    const now = performance.now();
    // One stack falls off per SIR_CHARGE_DECAY_MS until the clock runs out.
    if (now >= _sirChargeUntil) _sirCharge = 0;
    else _sirCharge = Math.min(_sirCharge, Math.ceil((_sirChargeUntil - now) / SIR_CHARGE_DECAY_MS));
    return _sirCharge;
}

// Adds charge stacks (capped) and restarts the decay clock.
function _sirAddCharge(n) {
    _sirCharge = Math.min(SIR_CHARGE_MAX, _sirChargeNow() + n);
    _sirChargeUntil = performance.now() + _sirCharge * SIR_CHARGE_DECAY_MS;
}

// Picks a tangent centre the player can walk to before the front arrives:
// within walk-speed x (time left - reaction), clamped to the screen, and
// (when there is room) at least `minShift` px away so there is something to do.
function _sirReachableX(fromX, msLeft, gapW, minShift) {
    const W = window.innerWidth;
    const edge = gapW / 2 + 10;
    // Never more than ~450px away: the tangent is a step or two, not a sprint.
    const reach = Math.min(450, Math.max(gapW * 0.5, SIR_WALK_PX_S * Math.max(0, msLeft - SIR_REACT_MS) / 1000 * 0.85));
    const lo = Math.max(edge, fromX - reach), hi = Math.min(W - edge, fromX + reach);
    let x = lo + Math.random() * Math.max(0, hi - lo);
    if (Math.abs(x - fromX) < minShift) {
        const a1 = fromX + (x < fromX ? -minShift : minShift);
        const a2 = fromX + (x < fromX ? minShift : -minShift);
        if (a1 >= lo && a1 <= hi) x = a1;
        else if (a2 >= lo && a2 <= hi) x = a2;
    }
    return Math.max(edge, Math.min(W - edge, x));
}

export function _mechSirIon(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    _sirEnsureFinalWatcher(monster);
    _sirEnsureChip();
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _nkNewRun(monster && monster.id, true);
    const spd = SIR_ION_SPD[p];
    const gapW = SIR_ION_GAP[p];
    const band = SIR_ION_BAND;
    const warn = SIR_ION_WARN * _SIR_DEBUG_MULT;
    const pc0 = _sirPC();

    if (p >= 3) _nkToast('eg_mech_sir_pincer', '⛈️ ION PINCER - two currents close in. Stand in the shared TANGENT column!', '#fde047');
    else _nkToast('eg_mech_sir_ion', '⛈️ ION CURRENT - step into the TANGENT opening of each front!', '#fde047');

    // Fronts: { dir (+1 down, -1 up), y, gapC, startAt, el, gapEl, hit }
    const fronts = [];
    const add = (dir, gapC, startAt) => {
        const el = _nkEl(run, 'div', 'eg-sir-ion eg-sir-ion-warn ' + (dir > 0 ? 'eg-sir-ion-down' : 'eg-sir-ion-up'));
        const gapEl = _nkEl(run, 'div', 'eg-sir-gap ' + (dir > 0 ? 'eg-sir-gap-down' : 'eg-sir-gap-up'), dir > 0 ? '▼ TANGENT ▼' : '▲ TANGENT ▲');
        fronts.push({ dir, y: dir > 0 ? 0 : H - band, gapC, startAt, el, gapEl, hit: false, moving: false, done: false });
    };
    const now0 = performance.now();
    if (p < 3) {
        // Time until front 1 reaches the player's row (if they stand still).
        const t1 = warn + Math.max(0, pc0.y - band) / spd * 1000;
        const g1 = _sirReachableX(pc0.x, t1, gapW, gapW / 2 + 50);
        const stagger = SIR_ION_STAGGER * _SIR_DEBUG_MULT;
        const g2 = _sirReachableX(g1, stagger, gapW, 140);
        add(1, g1, now0 + warn);
        add(1, g2, now0 + warn + stagger);
    } else {
        // Pincer: the two fronts meet in the middle - whoever is not in the
        // shared column is caught by at least one of them.
        const tFirst = warn + Math.min(Math.max(0, pc0.y - band), Math.max(0, H - band - pc0.y)) / spd * 1000;
        const gc = _sirReachableX(pc0.x, tFirst, gapW, gapW / 2 + 50);
        add(1, gc, now0 + warn);
        add(-1, gc, now0 + warn);
    }

    const draw = (f) => {
        const lo = Math.round(f.gapC - gapW / 2), hi = Math.round(f.gapC + gapW / 2);
        // The band is one element with a clip-path hole for the tangent, so
        // the painted band and the hit test (outside the gap) always agree.
        f.el.style.left = '0px'; f.el.style.width = W + 'px';
        f.el.style.top = Math.round(f.y) + 'px'; f.el.style.height = band + 'px';
        f.el.style.clipPath = 'polygon(0 0, ' + lo + 'px 0, ' + lo + 'px 100%, ' + hi + 'px 100%, ' + hi + 'px 0, 100% 0, 100% 100%, 0 100%)';
        f.gapEl.style.left = lo + 'px'; f.gapEl.style.width = (hi - lo) + 'px';
        f.gapEl.style.top = Math.round(f.y) + 'px'; f.gapEl.style.height = band + 'px';
    };
    fronts.forEach(draw);
    // The second front (phase 1-2) waits off-board until the first one moves,
    // so the two telegraphs never stack on top of each other.
    const hold = p < 3 ? fronts[1] : null;
    if (hold) { hold.el.style.display = 'none'; hold.gapEl.style.display = 'none'; }

    _nkLoop(run, (dtS, now) => {
        const pc = _sirPC();
        let live = false;
        for (const f of fronts) {
            if (f.done) continue;
            live = true;
            if (f === hold && fronts[0].moving && f.el.style.display === 'none') {
                f.el.style.display = ''; f.gapEl.style.display = '';
            }
            if (f.el.style.display === 'none') continue;
            if (!f.moving && now >= f.startAt) {
                f.moving = true;
                f.el.classList.remove('eg-sir-ion-warn');
                f.el.classList.add('eg-sir-ion-front');
            }
            if (!f.moving) continue;
            f.y += f.dir * spd * dtS;
            draw(f);
            // One real hit when the band passes over you outside the tangent.
            const inBand = pc.y > f.y && pc.y < f.y + band;
            const inGap = pc.x > f.gapC - gapW / 2 + 12 && pc.x < f.gapC + gapW / 2 - 12;
            if (inBand && !inGap && !f.hit) {
                f.hit = true;
                const dealt = _nkHit(SIR_ION_DMG[p], 'lightning', level);
                _nkAbilityHitToast(dealt, 'The Stormcaller', 'Ion Current');
                _sirAddCharge(2);
            }
            if (f.y < -band - 10 || f.y > H + 10) {
                f.done = true;
                try { f.el.remove(); } catch (e) {}
                try { f.gapEl.remove(); } catch (e) {}
            }
        }
        return live;
    });
}


//------------------------------------------------------------------------
//-------------------ACT II: CHAIN LIGHTNING (60%)-------------------------
//------------------------------------------------------------------------
// Rivers sweep in and leave standing water first; then a ball of chain
// lightning charges up on the arena edge farthest from you (1.2s
// telegraph) and hunts you. It is almost as fast as you - faster while you
// carry CHARGE - so you beat it by luring it across standing water: it
// grounds itself on the shore. Cold pools (shared frozen_cells) ground it
// too. Phase 3: TWO balls.
export const SIR_BOLT_SPD   = [0, 0, 245, 260]; // px/s hunting ball (+18 per charge stack)
export const SIR_BOLT_DMG   = [0, 0, 0.14, 0.16]; // %maxHP ball hit
export const SIR_BOLT_LIFE  = [0, 0, 8000, 9000]; // ms the ball hunts
export const SIR_RIVER_N    = [0, 0, 2, 2];       // water lanes per cast
export const SIR_RIVER_SPD  = 90;                 // (legacy) px/s river sweep
export const SIR_RIVER_W    = 64;                 // standing water width
export const SIR_GROUND_R   = 30;                 // distance at which the ball grounds
const SIR_RIVER_MS = 2000;                         // sweep line → standing water
const SIR_BOLT_CHARGE_MS = 1200;                   // ball charges before it hunts

export function _mechSirChain(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    _sirEnsureFinalWatcher(monster);
    _sirEnsureChip();
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _nkNewRun(monster && monster.id, true);

    _nkToast('eg_mech_sir_chain', '⛈️ CHAIN LIGHTNING - the ball hunts you. Lure it across the WATER to ground it!', '#fde047');

    // ── Water lines: rivers sweep across and LEAVE standing water. ───────
    const rivers = [];
    const nR = SIR_RIVER_N[p];
    const riverMs = SIR_RIVER_MS * _SIR_DEBUG_MULT;
    for (let i = 0; i < nR; i++) {
        const axis = i === 0 ? 'h' : 'v';
        const sweepEl = _nkEl(run, 'div', 'eg-sir-river eg-sir-river-sweep');
        const poolEl = _nkEl(run, 'div', 'eg-sir-river eg-sir-river-pool');
        const pos = axis === 'h' ? H * (0.32 + Math.random() * 0.36) : W * (0.3 + Math.random() * 0.4);
        if (axis === 'h') {
            sweepEl.style.left = '0px'; sweepEl.style.top = Math.round(pos - 3) + 'px';
            sweepEl.style.width = W + 'px'; sweepEl.style.height = '6px';
            poolEl.style.left = '0px'; poolEl.style.top = Math.round(pos - SIR_RIVER_W / 2) + 'px';
            poolEl.style.width = W + 'px'; poolEl.style.height = SIR_RIVER_W + 'px';
        } else {
            sweepEl.style.left = Math.round(pos - 3) + 'px'; sweepEl.style.top = '0px';
            sweepEl.style.width = '6px'; sweepEl.style.height = H + 'px';
            poolEl.style.left = Math.round(pos - SIR_RIVER_W / 2) + 'px'; poolEl.style.top = '0px';
            poolEl.style.width = SIR_RIVER_W + 'px'; poolEl.style.height = H + 'px';
        }
        poolEl.style.display = 'none';
        rivers.push({ axis, pos, sweepEl, poolEl, poolAt: performance.now() + riverMs });
    }

    // ── The hunting ball(s): spawn on the edge far from you, charge, hunt.
    const nBolts = p >= 3 ? 2 : 1;
    const bolts = [];
    const pc0 = _sirPC();
    const spots = [[60, 60], [W - 60, 60], [60, H - 60], [W - 60, H - 60], [W / 2, 60], [W / 2, H - 60]];
    spots.sort((a, b) => Math.hypot(b[0] - pc0.x, b[1] - pc0.y) - Math.hypot(a[0] - pc0.x, a[1] - pc0.y));
    for (let i = 0; i < nBolts; i++) {
        const [bx, by] = spots[i];
        const el = _nkEl(run, 'div', 'eg-nk-dot eg-sir-bolt eg-sir-bolt-charging');
        el.innerHTML = '<i class="eg-sir-bolt-arc"></i><i class="eg-sir-bolt-core"></i>';
        el.style.transform = 'translate(' + Math.round(bx - 17) + 'px,' + Math.round(by - 17) + 'px)';
        bolts.push({
            x: bx, y: by, el, done: false,
            huntAt: performance.now() + riverMs + (SIR_BOLT_CHARGE_MS + i * 900) * _SIR_DEBUG_MULT,
            life: SIR_BOLT_LIFE[p] * _SIR_DEBUG_MULT,
        });
    }

    // Grounding: over standing water or a cold pool, the ball grounds.
    const groundedBy = (bx, by) => {
        for (const r of rivers) {
            if (r.poolEl.style.display === 'none') continue;
            const d = r.axis === 'h' ? Math.abs(by - r.pos) : Math.abs(bx - r.pos);
            if (d < SIR_GROUND_R) return r;
        }
        const cold = document.querySelectorAll('.eg-frozen-cell, .eg-nk-frozen-cell');
        for (const c of cold) {
            const cr = c.getBoundingClientRect();
            if (bx > cr.left - 10 && bx < cr.right + 10 && by > cr.top - 10 && by < cr.bottom + 10) return c;
        }
        return null;
    };

    _nkLoop(run, (dtS, now) => {
        const pc = _sirPC();
        const pr = _nkPlayerRect();

        // Rivers sweep across the arena, then leave standing water.
        for (const r of rivers) {
            if (r.poolEl.style.display !== 'none') continue;
            if (now < r.poolAt) {
                const k = 1 - Math.max(0, (r.poolAt - now) / riverMs);
                r.sweepEl.style.opacity = String(0.3 + 0.7 * Math.min(1, k));
            } else {
                r.poolEl.style.display = '';
                r.sweepEl.style.opacity = '0';
            }
        }

        let pending = false;
        for (const b of bolts) {
            if (b.done) continue;
            pending = true;
            if (now < b.huntAt) continue;          // still charging at the edge
            b.el.classList.remove('eg-sir-bolt-charging');
            b.life -= dtS * 1000;
            const spd = SIR_BOLT_SPD[p] + SIR_BOLT_PER_STACK * _sirChargeNow();
            const dx = pc.x - b.x, dy = pc.y - b.y;
            const d = Math.hypot(dx, dy) || 1;
            const step = Math.min(d, spd * dtS);
            b.x += (dx / d) * step;
            b.y += (dy / d) * step;
            b.el.style.transform = 'translate(' + Math.round(b.x - 17) + 'px,' + Math.round(b.y - 17) + 'px)';
            let boom = false;
            if (groundedBy(b.x, b.y)) {
                boom = true;
            } else if (pr && _nkDotHit(b.el, pr, 0)) {
                boom = true;
                const dealt = _nkHit(SIR_BOLT_DMG[p], 'lightning', level);
                _nkAbilityHitToast(dealt, 'The Stormcaller', 'Chain Lightning');
            }
            if (boom || b.life <= 0) {
                b.done = true;
                try { b.el.remove(); } catch (e) {}
                if (boom) {
                    const fx = _nkEl(run, 'div', 'eg-sir-ground');
                    fx.style.left = Math.round(b.x - 46) + 'px';
                    fx.style.top = Math.round(b.y - 46) + 'px';
                    setTimeout(() => { try { fx.remove(); } catch (e) {} }, 600 * _SIR_DEBUG_MULT);
                }
            }
        }
        return pending;
    });
}


//------------------------------------------------------------------------
//-------------------ACT II: STORM EYE (60% and 30%, once each)------------
//------------------------------------------------------------------------
// The Stormcaller settles into a 4×4 grid of storm cells in the arena
// centre and holds it (immune). 3-2-1, then the storm rages everywhere
// OUTSIDE the grid and in the hot cells. The SAFE cells are the web
// connected to the eye (the eye, its four neighbours and the two far arms
// of the cross); the pattern is rotated each cast. Standing in the storm
// is a real hit every 0.7s.
export const SIR_EYE_N      = 4;     // 4×4 grid
export const SIR_EYE_HOT    = 7;     // hot cells
export const SIR_EYE_DPS    = [0, 0, 8.5, 10]; // %/s in the storm (paid as hits on the touch cooldown)
export const SIR_EYE_LIFE   = 6500;  // ms the storm rages (after the telegraph)
export const SIR_EYE_IMMUNE = true;  // he holds the eye: immune while it stands
const SIR_EYE_WARN_MS = 3000;        // 3-2-1 before the storm rages

export function _mechSirEye(monster, phase) {
    // Scheduled once per phase: if another set-piece holds the field, wait
    // for it instead of losing the eye for the whole phase.
    if (_nkDodgeBusy() || _nkFrozen()) {
        const tries = (monster && monster._sirEyeTries) || 0;
        if (monster && tries < 20) {
            monster._sirEyeTries = tries + 1;
            setTimeout(() => {
                if (globalThis._monsters && globalThis._monsters.includes(monster) && !monster.bossImmune) _mechSirEye(monster, phase);
            }, 1500);
        }
        return;
    }
    if (monster) monster._sirEyeTries = 0;
    _sirEnsureFinalWatcher(monster);
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _nkNewRun(monster && monster.id, true);

    _nkToast('eg_mech_sir_eye', '⛈️ STORM EYE - get onto the BLUE web cells before the storm breaks!', '#fde047');

    // The 4×4 grid, centred.
    const N = SIR_EYE_N;
    const cell = Math.min(W, H) * 0.15;
    const gw = N * cell, gh = N * cell;
    const gx = W / 2 - gw / 2, gy = H / 2 - gh / 2;
    // Base pattern around eye (1,1), rotated by a random quarter turn.
    const rot = Math.floor(Math.random() * 4);
    const rotRC = (r, c) => { for (let k = 0; k < rot; k++) { const t = r; r = c; c = N - 1 - t; } return [r, c]; };
    const cells = [];
    const byKey = {};
    for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
            const isEye = (r === 1 && c === 1);
            const isSafe = isEye || (Math.abs(r - 1) + Math.abs(c - 1) === 1) || (r === 1 && c === 3) || (c === 1 && r === 3);
            const [rr, cc] = rotRC(r, c);
            const o = { r: rr, c: cc, hot: false, eye: isEye, safe: isSafe, d: Math.abs(r - 1) + Math.abs(c - 1), br: r, bc: c, el: null };
            cells.push(o); byKey[rr + ',' + cc] = o;
        }
    }
    // Exactly SIR_EYE_HOT hot cells: the non-web cells closest to the
    // eye; the farthest stay inert (harmless, but not part of the web).
    cells.filter(c => !c.safe)
        .sort((a, b) => a.d - b.d || (a.br - b.br) || (a.bc - b.bc))
        .slice(0, SIR_EYE_HOT)
        .forEach(c => { c.hot = true; });
    cells.forEach(c => {
        const el = _nkEl(run, 'div', 'eg-sir-cell' + (c.eye ? ' eg-sir-cell-eye eg-sir-cell-safe' : c.safe ? ' eg-sir-cell-safe' : c.hot ? ' eg-sir-cell-hot eg-sir-cell-arming' : ' eg-sir-cell-inert'));
        el.style.left = Math.round(gx + c.c * cell + 4) + 'px';
        el.style.top = Math.round(gy + c.r * cell + 4) + 'px';
        el.style.width = Math.round(cell - 8) + 'px';
        el.style.height = Math.round(cell - 8) + 'px';
        if (c.eye) el.innerHTML = '<span class="eg-sir-eye-count"></span>';
        c.el = el;
    });
    // The storm outside the grid: four bands around it (arming → raging).
    const storm = [
        [0, 0, W, gy], [0, gy + gh, W, H - gy - gh], [0, gy, gx, gh], [gx + gw, gy, W - gx - gw, gh],
    ].map(([l, t, w, h]) => {
        const el = _nkEl(run, 'div', 'eg-sir-storm eg-sir-storm-arming');
        el.style.left = Math.round(l) + 'px'; el.style.top = Math.round(t) + 'px';
        el.style.width = Math.round(w) + 'px'; el.style.height = Math.round(h) + 'px';
        return el;
    });
    const countEl = cells.find(c => c.eye).el.querySelector('.eg-sir-eye-count');

    // Boss holds the eye: immune while the set-piece stands (released on
    // every kill path too).
    if (monster && SIR_EYE_IMMUNE) { try { monster.bossImmune = true; } catch (e) {} }
    run.onKill = () => { if (monster) { try { monster.bossImmune = false; } catch (e) {} } };

    const t0 = performance.now();
    const warnMs = SIR_EYE_WARN_MS * _SIR_DEBUG_MULT;
    const endAt = t0 + warnMs + SIR_EYE_LIFE * _SIR_DEBUG_MULT;
    let raging = false;
    _nkLoop(run, (dtS, now) => {
        if (!raging) {
            const left = warnMs - (now - t0);
            if (countEl) countEl.textContent = left > 0 ? String(Math.ceil(left / 1000)) : '';
            if (left <= 0) {
                raging = true;
                storm.forEach(el => { el.classList.remove('eg-sir-storm-arming'); el.classList.add('eg-sir-storm-live'); });
                cells.forEach(c => { if (c.hot) c.el.classList.remove('eg-sir-cell-arming'); if (c.safe) c.el.classList.add('eg-sir-live'); });
            }
        } else {
            const pc = _sirPC();
            const c = Math.floor((pc.x - gx) / cell), r = Math.floor((pc.y - gy) / cell);
            const inGrid = c >= 0 && c < N && r >= 0 && r < N;
            const here = inGrid ? byKey[r + ',' + c] : null;
            if (!inGrid || (here && here.hot)) {
                _sirTouch(SIR_EYE_DPS[p] / 100 * (SIR_TOUCH_CD_MS / 1000), level, inGrid ? 'Storm Cell' : 'Raging Storm');
            }
        }
        return now < endAt;
    });
}


//------------------------------------------------------------------------
//-------------------FINALE: PERFECT STORM (≤10%, one-shot)----------------
//------------------------------------------------------------------------
// Three storm walls: each one closes from the arena edge onto a marked
// square. RED square = the strike lands there - be OUTSIDE it. GREEN
// square = the eye - be INSIDE it, everything else is struck. They
// alternate red / green / red. Then the storm grows TEETH: charged bullets
// fly through the spot you stand on for 6s (faster while you carry
// charge) - keep moving. Last, THE EYE OPENS: one green circle within
// reach is the only shelter from the final strike. Boss immune throughout.
export const SIR_FIN_BOXES    = 3;      // closing storm walls
export const SIR_FIN_BOX_DMG  = 0.19;   // %maxHP caught by a wall
export const SIR_FIN_BULLET_DMG = 0.09; // %maxHP per bullet hit
export const SIR_FIN_BULLET_SPD = 260;  // px/s charged bullets
export const SIR_FIN_BULLET_DPS = 3.5;  // (legacy) old self-aura DoT - removed
export const SIR_FIN_FAILSAFE_MS = 45000;
const SIR_FIN_CLOSE_MS = 4500;          // a wall closes in this long
const SIR_FIN_TEETH_MS = 6000;          // charged-bullet phase
const SIR_FIN_EYE_MS   = 3000;          // final strike countdown
const SIR_FIN_EYE_R    = 110;           // final safe eye radius
const SIR_FIN_FINAL_DMG = 0.30;         // final strike outside the eye

// Set while the finale runs.
export let _sirFinal = null;

export function _sirFinalActive() {
    return !!_sirFinal && !_sirFinal.finished;
}

// Phase-enter hook: starts the ≤10% HP watcher (the framework only calls
// onPhaseEnter on transitions, so a dive from 30% → 10% needs its own gate).
export function _sirOnPhaseEnter(monster, newPhase) {
    if (newPhase !== 3) return false;
    try { _sirEnsureFinalWatcher(monster); } catch (e) {}
    return false;
}

export function _sirEnsureFinalWatcher(monster) {
    if (!monster || _sirFinal || _sirWatcherRun) return;
    const run = _nkNewRun(monster.id, true);
    run.passive = true;
    _sirWatcherRun = run;
    _nkLoop(run, () => {
        if (_sirFinal) return false;
        try {
            if (monster.currentHP <= monster.maxHP * 0.10) {
                _sirFinalStart(monster);
                return false;
            }
        } catch (e) { return false; }
        return true;
    });
}
export let _sirWatcherRun = null;

// Pause-safe timeout (mirrors the other finales).
export function _sirAfter(g, ms, fn) {
    const t0 = performance.now();
    const step = () => {
        if (g.finished || !_sirFinal) return;
        if (_nkFrozen()) { setTimeout(step, 120); return; }
        if (performance.now() - t0 >= ms) fn();
        else setTimeout(step, Math.min(120, ms - (performance.now() - t0)));
    };
    setTimeout(step, Math.min(120, ms));
}

// Clamps a point so a box/circle of half-size `h` stays on screen.
function _sirClampPt(x, y, h) {
    return {
        x: Math.max(h + 20, Math.min(window.innerWidth - h - 20, x)),
        y: Math.max(h + 20, Math.min(window.innerHeight - h - 20, y)),
    };
}

export function _sirFinalStart(monster) {
    if (_sirFinal || !monster) return;

    // The Stormcaller clears the arena for the perfect storm: kill every
    // other run of this boss (the finale owns the board).
    Array.from(_nkRuns.values()).forEach(r => {
        if (r.bossId === monster.id) { try { _nkKillRun(r); } catch (e) {} }
    });

    const W = window.innerWidth, H = window.innerHeight;
    const g = {
        monsterId: monster.id,
        finished: false,
        fxRun: null, overlay: null,
        bullets: [],
        wave: 0,
        teeth: false,
    };
    _sirFinal = g;

    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('eg-charge-paused');
    });

    // FX run (passive): holds the finale timeline.
    g.fxRun = _nkNewRun(monster.id, true);
    g.fxRun.passive = true;

    // Banner at the top - the arena below must stay readable.
    const ov = document.createElement('div');
    ov.className = 'eg-sir-cd';
    ov.innerHTML =
        '<div class="eg-sir-cd-label">⛈️ PERFECT STORM</div>' +
        '<div class="eg-sir-cd-hint">RED square: get OUT. GREEN square: get IN.</div>';
    document.body.appendChild(ov);
    g.overlay = ov;
    g.fxRun.els.push(ov);
    const hintEl = ov.querySelector('.eg-sir-cd-hint');
    const hint = (txt) => { if (hintEl) hintEl.textContent = txt; };

    _nkToast('eg_mech_sir_final_cd', '⛈️💀 PERFECT STORM - red square = get out, green square = get in!', '#fde047');

    monster.bossImmune = true;

    const card = document.getElementById('eg-card-' + monster.id);
    const wrap = card ? (card.querySelector('.eg-emoji-wrapper') || card) : null;
    if (wrap) {
        wrap.classList.add('eg-sir-allin');
        wrap.classList.add('eg-nk-shielded');
    }

    const level = monster.level || 1;

    // ── Wave: a storm wall closes onto a marked square. ──────────────────
    const runBoxWave = () => {
        if (g.finished) return;
        g.wave++;
        if (g.wave > SIR_FIN_BOXES) { runTeeth(); return; }
        const getIn = g.wave === 2;
        _nkToast(getIn ? 'eg_mech_sir_wave_in' : 'eg_mech_sir_wave', '⛈️ STORM WALL ' + g.wave + '/' + SIR_FIN_BOXES
            + (getIn ? ' - GREEN: get INTO the eye!' : ' - RED: get OUT of the square!'), getIn ? '#86efac' : '#f87171');
        hint(getIn ? 'GREEN square: get INSIDE before the wall closes!' : 'RED square: get OUT before the wall closes!');

        const side = Math.round(Math.min(W, H) * 0.24);
        const closeMs = SIR_FIN_CLOSE_MS * _SIR_DEBUG_MULT;
        const pc0 = _sirPC();
        let c;
        if (getIn) {
            // The eye opens within walking reach (but never right on you).
            const a = Math.random() * Math.PI * 2, d = 170 + Math.random() * 230;
            c = _sirClampPt(pc0.x + Math.cos(a) * d, pc0.y + Math.sin(a) * d, side / 2);
        } else {
            // The strike lands where you stand now.
            c = _sirClampPt(pc0.x, pc0.y, side / 2);
        }
        const tgt = { l: c.x - side / 2, t: c.y - side / 2, r: c.x + side / 2, b: c.y + side / 2 };
        const mark = _nkEl(g.fxRun, 'div', 'eg-sir-fin-mark ' + (getIn ? 'eg-sir-fin-safe' : 'eg-sir-fin-danger'));
        mark.style.left = Math.round(tgt.l) + 'px'; mark.style.top = Math.round(tgt.t) + 'px';
        mark.style.width = mark.style.height = side + 'px';
        mark.innerHTML = '<span>' + (getIn ? 'GET IN' : 'GET OUT') + '</span>';
        const el = _nkEl(g.fxRun, 'div', 'eg-sir-box' + (getIn ? ' eg-sir-box-in' : ''));
        const t0 = performance.now();
        const wave = _nkNewRun(monster.id, false);
        wave.passive = true;
        _nkLoop(wave, (dtS, now) => {
            if (g.finished) return false;
            const k = Math.min(1, (now - t0) / closeMs);
            const l = tgt.l * k, t = tgt.t * k, r = W - (W - tgt.r) * k, b = H - (H - tgt.b) * k;
            el.style.left = Math.round(l) + 'px'; el.style.top = Math.round(t) + 'px';
            el.style.width = Math.round(r - l) + 'px'; el.style.height = Math.round(b - t) + 'px';
            if (k < 1) return true;
            const pc = _sirPC();
            const inside = pc.x > tgt.l && pc.x < tgt.r && pc.y > tgt.t && pc.y < tgt.b;
            if (inside !== getIn) {
                const dealt = _nkHit(SIR_FIN_BOX_DMG, 'lightning', level);
                _nkAbilityHitToast(dealt, 'The Stormcaller', 'Storm Wall');
            }
            el.classList.add('eg-sir-box-final');
            setTimeout(() => { try { el.remove(); } catch (e) {} try { mark.remove(); } catch (e) {} }, 700);
            return false;
        });
        _sirAfter(g, closeMs + 1100 * _SIR_DEBUG_MULT, runBoxWave);
    };

    // ── THE STORM GROWS TEETH: charged bullets aim at you. ───────────────
    const runTeeth = () => {
        if (g.finished) return;
        _nkToast('eg_mech_sir_teeth', '⛈️🦷 THE STORM GROWS TEETH - keep moving, the bullets aim where you stand!', '#f97316');
        hint('Keep moving - every bullet flies through the spot you stand on.');
        g.teeth = true;
        _sirAfter(g, SIR_FIN_TEETH_MS * _SIR_DEBUG_MULT, runEye);
    };

    // ── THE EYE OPENS: one reachable safe circle, then the final strike. ─
    const runEye = () => {
        if (g.finished) return;
        g.teeth = false;
        _nkToast('eg_mech_sir_eye_open', '⛈️💀 THE EYE OPENS - stand in the GREEN circle!', '#86efac');
        hint('Stand in the GREEN circle before the count runs out!');
        const pc0 = _sirPC();
        const eyeMs = SIR_FIN_EYE_MS * _SIR_DEBUG_MULT;
        // 3s countdown at 320 px/s minus 0.7s reaction leaves ~730 px of
        // walking; the eye opens 180-380 px away.
        const a = Math.random() * Math.PI * 2, d = 180 + Math.random() * 200;
        const e = _sirClampPt(pc0.x + Math.cos(a) * d, pc0.y + Math.sin(a) * d, SIR_FIN_EYE_R);
        const eye = _nkEl(g.fxRun, 'div', 'eg-sir-fin-eye eg-sir-fin-safe');
        eye.style.left = Math.round(e.x - SIR_FIN_EYE_R) + 'px';
        eye.style.top = Math.round(e.y - SIR_FIN_EYE_R) + 'px';
        eye.style.width = eye.style.height = (SIR_FIN_EYE_R * 2) + 'px';
        eye.innerHTML = '<span class="eg-sir-eye-count"></span>';
        const dark = _nkEl(g.fxRun, 'div', 'eg-sir-fin-dark');
        dark.style.setProperty('--ex', Math.round(e.x) + 'px');
        dark.style.setProperty('--ey', Math.round(e.y) + 'px');
        dark.style.setProperty('--er', SIR_FIN_EYE_R + 'px');
        const countEl = eye.querySelector('.eg-sir-eye-count');
        const t0 = performance.now();
        const tick = () => {
            if (g.finished) return;
            const left = eyeMs - (performance.now() - t0);
            if (countEl) countEl.textContent = left > 0 ? String(Math.ceil(left / 1000)) : '';
            if (left > 0) { _sirAfter(g, 100, tick); return; }
            const pc = _sirPC();
            if (Math.hypot(pc.x - e.x, pc.y - e.y) > SIR_FIN_EYE_R) {
                const dealt = _nkHit(SIR_FIN_FINAL_DMG, 'lightning', level);
                _nkAbilityHitToast(dealt, 'The Stormcaller', 'Perfect Storm');
            } else {
                _nkToast('eg_mech_sir_survived', '⛈️ You rode out the perfect storm!', '#86efac');
            }
            dark.classList.add('eg-sir-fin-flash');
            _sirAfter(g, 1200 * _SIR_DEBUG_MULT, () => _sirFinalEnd(g, monster));
        };
        tick();
    };

    // ── Main finale loop: charged bullets during the teeth phase. ────────
    const startAt = performance.now();
    let bulletCd = 0;
    _nkLoop(g.fxRun, (dtS, now) => {
        if (g.finished) return false;
        const pc = _sirPC();
        if (g.teeth && now >= bulletCd) {
            const charged = _sirChargeNow() >= 3;
            bulletCd = now + (charged ? 380 : 520) * _SIR_DEBUG_MULT;
            const el = _nkEl(g.fxRun, 'div', 'eg-nk-dot eg-sir-bullet');
            // Spawned on a ring around you, flying THROUGH the spot you stand on.
            const ang = Math.random() * Math.PI * 2;
            const ring = Math.min(W, H) * 0.32;
            g.bullets.push({
                x: pc.x + Math.cos(ang) * ring, y: pc.y + Math.sin(ang) * ring,
                vx: -Math.cos(ang) * SIR_FIN_BULLET_SPD, vy: -Math.sin(ang) * SIR_FIN_BULLET_SPD,
                el, hit: false, t: 0,
            });
        }
        const pr = _nkPlayerRect();
        for (let i = g.bullets.length - 1; i >= 0; i--) {
            const b = g.bullets[i];
            b.t += dtS;
            b.x += b.vx * dtS; b.y += b.vy * dtS;
            b.el.style.transform = 'translate(' + Math.round(b.x - 8) + 'px,' + Math.round(b.y - 8) + 'px)';
            const off = b.t > 4 || b.x < -30 || b.x > W + 30 || b.y < -30 || b.y > H + 30;
            if (off) { try { b.el.remove(); } catch (e) {} g.bullets.splice(i, 1); continue; }
            if (!b.hit && pr && _nkDotHit(b.el, pr, 0)) {
                b.hit = true;
                const dealt = _nkHit(SIR_FIN_BULLET_DMG, 'lightning', level);
                _nkAbilityHitToast(dealt, 'The Stormcaller', 'Charged Bullet');
                try { b.el.remove(); } catch (e) {} g.bullets.splice(i, 1);
            }
        }
        if (now - startAt > SIR_FIN_FAILSAFE_MS) { _sirFinalEnd(g, monster); return false; }
        return true;
    });

    runBoxWave();
}

// Ends the finale: releases immunity + charge bar and cleans the board.
export function _sirFinalEnd(g, monster) {
    if (!g || g.finished) return;
    g.finished = true;
    try { if (g.fxRun) _nkKillRun(g.fxRun); } catch (e) {}
    document.querySelectorAll('.eg-sir-cd, .eg-sir-box, .eg-sir-bullet, .eg-sir-river, .eg-sir-cell, .eg-sir-storm, ' +
        '.eg-sir-ion, .eg-sir-gap, .eg-sir-bolt, .eg-sir-ground, .eg-sir-fin-mark, .eg-sir-fin-eye, .eg-sir-fin-dark').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    const card = document.getElementById('eg-card-' + g.monsterId);
    const wrap = card ? (card.querySelector('.eg-emoji-wrapper') || card) : null;
    if (wrap) {
        wrap.classList.remove('eg-sir-allin');
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
export function _sirTeardown() {
    if (_sirFinal) { try { _sirFinalEnd(_sirFinal, null); } catch (e) {} _sirFinal = null; }
    _sirWatcherRun = null;
    try { if (_sirChipRun) { _sirChipRun.els.forEach(el => { try { el.remove(); } catch (e) {} }); _nkKillRun(_sirChipRun); } } catch (e) {}
    _sirChipRun = null;
    _sirCharge = 0; _sirChargeUntil = 0;
    document.querySelectorAll('.eg-sir-charge-chip').forEach(el => { try { el.remove(); } catch (e) {} });
    // The Storm Eye grants immunity while it stands - release it if the
    // fight ended mid-cast (teardown kills the run before its loop ends).
    try {
        if (typeof _monsters !== 'undefined') {
            globalThis._monsters.forEach(m => { if (m && m.baseId === 'boss_sirus') m.bossImmune = false; });
        }
    } catch (e) {}
    document.querySelectorAll('.eg-sir-ion, .eg-sir-gap, .eg-sir-bolt, .eg-sir-ground, .eg-sir-storm, ' +
        '.eg-sir-river, .eg-sir-cell, .eg-sir-box, .eg-sir-bullet, .eg-sir-cd, .eg-sir-fin-mark, .eg-sir-fin-eye, .eg-sir-fin-dark').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    document.querySelectorAll('.eg-sir-allin').forEach(el => el.classList.remove('eg-sir-allin'));
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('eg-charge-paused');
    });
}


//------------------------------------------------------------------------
//-------------------PLAYTEST CONSOLE HOOK (dev only)----------------------
//------------------------------------------------------------------------
// Tiny console API for playtesting with stretched debug timings:
//   _SIR_DEBUG.fire('ion'|'chain'|'eye', phase) - runs one now
//   _SIR_DEBUG.final()                          - PERFECT STORM now
if (typeof window !== 'undefined') {
    window._SIR_DEBUG = {
        fire: (name, phase) => {
            const monster = (typeof _monsters !== 'undefined')
                ? globalThis._monsters.find(m => m && m.baseId === 'boss_sirus') : null;
            if (!monster) return 'no stormcaller alive';
            const fn = name === 'ion' ? _mechSirIon
                : name === 'chain' ? _mechSirChain
                : name === 'eye' ? _mechSirEye : null;
            if (!fn) return 'unknown: ' + name;
            if (_nkDodgeBusy()) return 'BLOCKED: dodge-busy (wait for the field to clear)';
            fn(monster, phase || monster.bossPhase || 1);
            return 'fired ' + name;
        },
        final: () => {
            const monster = (typeof _monsters !== 'undefined')
                ? globalThis._monsters.find(m => m && m.baseId === 'boss_sirus') : null;
            if (!monster) return 'no stormcaller alive';
            _sirFinalStart(monster);
            return 'PERFECT STORM started';
        },
    };
}
