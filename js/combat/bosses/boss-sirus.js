import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkAbilityHitToast, _nkDodgeBusy, _nkDotHit, _nkEl, _nkFrozen, _nkHit, _nkKillRun, _nkLoop, _nkNewRun, _nkPlayerCenter, _nkPlayerRect, _nkRuns, _nkToast, _ptSegDist } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE STORMCALLER (boss_sirus)--------------------
//------------------------------------------------------------------------
// Tier-8 rework "The Eye of the Storm": ion fronts sweep the arena (step
// into each front's TANGENT opening) and get harder the lower his life
// falls, getting zapped CHARGES you, lightning strikes rain down on telegraphed
// circles, chain lightning hunts the charged faster (lure it into a pond),
// and the storm eye - a calm circle that drifts through a raging storm -
// shelters you. PERFECT STORM at <=10%: lightning strike circles (get out),
// a closing storm wall (get in), charged bullets, then one reachable eye
// before the final strike.
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
    // Phase 1 (100% → 60%): Ion Current + Storm Strikes + Probability Shift
    // Phase 2 ( 60% → 30%): immune window; Chain Lightning + Storm Eye join
    // Phase 3 ( 30% →  0%): ion pincer finish, bigger strike volleys, faster
    //                        eye; at 10% PERFECT STORM begins
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
            { name: 'ion_current', intervalBase: 21000, intervalVariance: 4000, handler: '_mechSirIon' },
            { name: 'storm_strikes', intervalBase: 15000, intervalVariance: 4000, handler: '_mechSirStrikes' },
            { name: 'probability_shift', intervalBase: 20000, intervalVariance: 5000, handler: '_mechProbabilityShift' },
            { name: 'chain_lightning', intervalBase: 18000, intervalVariance: 4000, handler: '_mechSirChain', phase2Only: true },
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

// How far the fight has progressed, 0 (full life) to 1 (nearly dead). The
// ion currents and strike volleys scale with it, so the fight ramps up
// smoothly instead of only at the three phase borders.
function _sirProgress(monster) {
    if (!monster || !(monster.maxHP > 0)) return 0;
    return Math.max(0, Math.min(1, (1 - monster.currentHP / monster.maxHP) / 0.9));
}

// Clamps a point so a box/circle of half-size `h` stays on screen.
function _sirClampPt(x, y, h) {
    return {
        x: Math.max(h + 20, Math.min(window.innerWidth - h - 20, x)),
        y: Math.max(h + 20, Math.min(window.innerHeight - h - 20, y)),
    };
}

// Picks a point a short walk away from `from` (distance between lo and hi).
function _sirPointNear(from, lo, hi, margin) {
    const a = Math.random() * Math.PI * 2, d = lo + Math.random() * (hi - lo);
    return _sirClampPt(from.x + Math.cos(a) * d, from.y + Math.sin(a) * d, margin);
}


//------------------------------------------------------------------------
//-------------------STORM STRIKE CIRCLES (strikes + finale)---------------
//------------------------------------------------------------------------
// A volley is a set of round zones. A dark cloud gathers inside each one
// while the telegraph runs, then lightning hits all of them at once; being
// inside any zone at that moment is one real hit. Driven by the caller's
// loop (volley.tick(dtMs)) so a pause freezes it with everything else.
const SIR_STRIKE_FLASH_MS = 700;

function _sirMakeVolley(run, pts, radius, teleMs, level, dmgPct, label) {
    const els = pts.map(pt => {
        const el = _nkEl(run, 'div', 'sx-sir-zone');
        el.style.left = Math.round(pt.x - radius) + 'px';
        el.style.top = Math.round(pt.y - radius) + 'px';
        el.style.width = el.style.height = (radius * 2) + 'px';
        el.style.setProperty('--k', '0');
        el.innerHTML = '<i class="sx-sir-zone-cloud"></i><i class="sx-sir-zone-bolt"></i>';
        return el;
    });
    const v = { t: 0, struck: false, done: false };
    v.tick = (dtMs) => {
        v.t += dtMs;
        if (!v.struck) {
            const k = Math.min(1, v.t / teleMs);
            els.forEach(el => el.style.setProperty('--k', k.toFixed(3)));
            if (v.t >= teleMs) {
                v.struck = true;
                els.forEach(el => el.classList.add('sx-sir-zone-strike'));
                const pc = _sirPC();
                if (_nkPlayerRect() && pts.some(pt => Math.hypot(pc.x - pt.x, pc.y - pt.y) < radius * 0.94)) {
                    const dealt = _nkHit(dmgPct, 'lightning', level);
                    _nkAbilityHitToast(dealt, 'The Stormcaller', label);
                }
            }
        }
        if (v.t >= teleMs + SIR_STRIKE_FLASH_MS) {
            els.forEach(el => { try { el.remove(); } catch (e) {} });
            v.done = true;
        }
        return !v.done;
    };
    return v;
}

// One zone sits exactly on the player (they must move); the others ring it
// at 2.1 radii, so the way out is through the gaps between them.
function _sirRingZones(center, count, radius) {
    const pts = [_sirClampPt(center.x, center.y, radius)];
    const others = count - 1;
    const base = Math.random() * Math.PI * 2;
    for (let i = 0; i < others; i++) {
        const ang = base + (i / others) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
        pts.push(_sirClampPt(center.x + Math.cos(ang) * radius * 2.1, center.y + Math.sin(ang) * radius * 2.1, radius));
    }
    return pts;
}


//------------------------------------------------------------------------
//-------------------SIGNATURE: ION CURRENT (all fight)---------------------
//------------------------------------------------------------------------
// Crackling ion fronts sweep the arena one after the other. Each front has
// ONE opening - the TANGENT - where the current is cool; anywhere else the
// front zaps you once (a real hit) and puts 2 CHARGE stacks on you. Charge
// decays one stack per 4s and makes the Chain Lightning balls hunt you
// faster. The cast grows with the fight: the lower his life, the more
// fronts per cast, the faster they move, the narrower the openings and the
// shorter the gap between them. From phase 2 a cast may sweep sideways
// instead of down; in phase 3 it ends with a PINCER (one front from each
// side sharing a single tangent) after a short breather. Every timer runs on
// the cast's own clock, so a pause can never make two fronts pile up.
export const SIR_ION_N      = [0, 2, 2, 2]; // base fronts per cast (+0..3 with progress)
export const SIR_ION_WARN   = 1500;         // telegraph before the first front moves
export const SIR_ION_SPD    = [0, 190, 210, 230]; // px/s front travel (+40 with progress)
export const SIR_ION_HOT    = [0, 6.5, 7.5, 9.0]; // (legacy) old DoT %/s - fronts now hit once
export const SIR_TANGENT_MS = 900;          // (legacy) old tangent window
export const SIR_CHARGE_MAX = 5;            // charge stacks
export const SIR_CHARGE_DECAY_MS = 4000;    // stacks fall off one per this
export const SIR_AURA_DPS   = [0, 2.0, 2.5, 3.0]; // (legacy) old self-aura DoT - removed
const SIR_ION_DMG    = [0, 0.15, 0.175, 0.20];    // %maxHP when a front catches you
const SIR_ION_BAND   = 56;                       // front thickness (px)
const SIR_ION_GAP    = [0, 210, 190, 180];       // tangent opening width (px), -35 with progress
const SIR_ION_TELE_MS = 700;                     // later fronts show up this long before moving
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
    chip.className = 'sx-sir-charge-chip';
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
        chip.classList.toggle('sx-sir-charge-full', stacks >= SIR_CHARGE_MAX);
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

// Picks a tangent centre the player can walk to in `msLeft`: within walk
// speed x (time left - reaction), kept on screen (`size` is the screen
// length along the tangent's axis) and, when there is room, at least
// `minShift` px away so there is something to do.
function _sirReachableX(fromX, msLeft, gapW, minShift, size) {
    const edge = gapW / 2 + 10;
    // Never more than ~450px away: the tangent is a step or two, not a sprint.
    const reach = Math.min(450, Math.max(gapW * 0.5, SIR_WALK_PX_S * Math.max(0, msLeft - SIR_REACT_MS) / 1000 * 0.85));
    const lo = Math.max(edge, fromX - reach), hi = Math.min(size - edge, fromX + reach);
    let x = lo + Math.random() * Math.max(0, hi - lo);
    if (Math.abs(x - fromX) < minShift) {
        const a1 = fromX + (x < fromX ? -minShift : minShift);
        const a2 = fromX + (x < fromX ? minShift : -minShift);
        if (a1 >= lo && a1 <= hi) x = a1;
        else if (a2 >= lo && a2 <= hi) x = a2;
    }
    return Math.max(edge, Math.min(size - edge, x));
}

// Plans one ion cast: which way it sweeps, how many fronts, and where each
// tangent opens. Every front is { dir, gapC, startAt (ms on the cast clock) }.
function _sirPlanIon(monster, p) {
    const W = window.innerWidth, H = window.innerHeight;
    const d = _sirProgress(monster);
    const mult = _SIR_DEBUG_MULT;
    const vertical = !(p >= 2 && Math.random() < 0.15 + 0.4 * d);
    const travel = vertical ? H : W, across = vertical ? W : H;
    const band = SIR_ION_BAND;
    const plan = {
        vertical, travel, across,
        spd: SIR_ION_SPD[p] + d * 40,
        gapW: SIR_ION_GAP[p] - d * 35,
        warn: SIR_ION_WARN * mult,
        fronts: [],
    };
    const stagger = Math.max(1250, 1700 - d * 350) * mult;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const waves = SIR_ION_N[p] + Math.round(d * 3);
    const pc0 = _sirPC();
    const along = vertical ? pc0.y : pc0.x;
    const acrossP = vertical ? pc0.x : pc0.y;
    // Time until the first front reaches the player's line (if they stand still).
    const toPlayer = dir > 0 ? along - band : travel - band - along;
    let gapC = _sirReachableX(acrossP, plan.warn + Math.max(0, toPlayer) / plan.spd * 1000, plan.gapW, plan.gapW / 2 + 50, across);
    for (let i = 0; i < waves; i++) {
        if (i > 0) gapC = _sirReachableX(gapC, stagger, plan.gapW, 140, across);
        plan.fronts.push({ dir, gapC, startAt: plan.warn + i * stagger });
    }
    if (p >= 3) {
        // Pincer: after the last single front has left the arena, one front
        // from each side shares a single tangent column.
        const lastStart = plan.fronts[plan.fronts.length - 1].startAt;
        const pincerAt = lastStart + (travel - band) / plan.spd * 1000 + 300 * mult;
        const mid = Math.min(toPlayer, travel - band - toPlayer);
        const gc = _sirReachableX(gapC, 2200 * mult + Math.max(0, mid) / plan.spd * 1000, plan.gapW, plan.gapW / 2 + 50, across);
        plan.fronts.push({ dir: 1, gapC: gc, startAt: pincerAt }, { dir: -1, gapC: gc, startAt: pincerAt });
    }
    return plan;
}

export function _mechSirIon(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    _sirEnsureFinalWatcher(monster);
    _sirEnsureChip();
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _nkNewRun(monster && monster.id, true);
    const band = SIR_ION_BAND;
    const plan = _sirPlanIon(monster, p);
    const { vertical, spd, gapW } = plan;
    const tele = SIR_ION_TELE_MS * _SIR_DEBUG_MULT;

    _nkToast('eg_mech_sir_ion', '⛈️ ION CURRENT', '#fde047');

    const fronts = plan.fronts.map((f, i) => {
        const cls = 'sx-sir-ion sx-sir-ion-warn ' + (vertical ? 'sx-sir-ion-v' : 'sx-sir-ion-h');
        const el = _nkEl(run, 'div', cls);
        const gapEl = _nkEl(run, 'div', 'sx-sir-gap ' + (vertical ? 'sx-sir-gap-v' : 'sx-sir-gap-h'));
        el.style.display = gapEl.style.display = 'none';   // shown just before its start
        return { ...f, pos: f.dir > 0 ? 0 : plan.travel - band, el, gapEl, hit: false, moving: false, done: false, index: i };
    });

    const draw = (f) => {
        const lo = Math.round(f.gapC - gapW / 2), hi = Math.round(f.gapC + gapW / 2);
        // The band is one element with a clip-path hole for the tangent, so
        // the painted band and the hit test (outside the gap) always agree.
        if (vertical) {
            f.el.style.left = '0px'; f.el.style.width = W + 'px';
            f.el.style.top = Math.round(f.pos) + 'px'; f.el.style.height = band + 'px';
            f.el.style.clipPath = 'polygon(0 0, ' + lo + 'px 0, ' + lo + 'px 100%, ' + hi + 'px 100%, ' + hi + 'px 0, 100% 0, 100% 100%, 0 100%)';
            f.gapEl.style.left = lo + 'px'; f.gapEl.style.width = (hi - lo) + 'px';
            f.gapEl.style.top = Math.round(f.pos) + 'px'; f.gapEl.style.height = band + 'px';
        } else {
            f.el.style.top = '0px'; f.el.style.height = H + 'px';
            f.el.style.left = Math.round(f.pos) + 'px'; f.el.style.width = band + 'px';
            f.el.style.clipPath = 'polygon(0 0, 100% 0, 100% ' + lo + 'px, 0 ' + lo + 'px, 0 ' + hi + 'px, 100% ' + hi + 'px, 100% 100%, 0 100%)';
            f.gapEl.style.top = lo + 'px'; f.gapEl.style.height = (hi - lo) + 'px';
            f.gapEl.style.left = Math.round(f.pos) + 'px'; f.gapEl.style.width = band + 'px';
        }
    };
    fronts.forEach(draw);

    let T = 0;   // the cast's own clock (ms): frozen while the game is paused
    _nkLoop(run, (dtS) => {
        T += dtS * 1000;
        const pc = _sirPC();
        let live = false;
        for (const f of fronts) {
            if (f.done) continue;
            live = true;
            const showAt = f.index === 0 ? 0 : f.startAt - tele;
            if (T < showAt) continue;
            if (f.el.style.display === 'none') { f.el.style.display = ''; f.gapEl.style.display = ''; }
            if (!f.moving && T >= f.startAt) {
                f.moving = true;
                f.el.classList.remove('sx-sir-ion-warn');
                f.el.classList.add('sx-sir-ion-front');
            }
            if (!f.moving) continue;
            f.pos += f.dir * spd * dtS;
            draw(f);
            // One real hit when the band passes over you outside the tangent.
            const a = vertical ? pc.y : pc.x, c = vertical ? pc.x : pc.y;
            const inBand = a > f.pos && a < f.pos + band;
            const inGap = c > f.gapC - gapW / 2 + 12 && c < f.gapC + gapW / 2 - 12;
            if (inBand && !inGap && !f.hit) {
                f.hit = true;
                const dealt = _nkHit(SIR_ION_DMG[p], 'lightning', level);
                _nkAbilityHitToast(dealt, 'The Stormcaller', 'Ion Current');
                _sirAddCharge(2);
            }
            if (f.pos < -band - 10 || f.pos > plan.travel + 10) {
                f.done = true;
                try { f.el.remove(); } catch (e) {}
                try { f.gapEl.remove(); } catch (e) {}
            }
        }
        return live;
    });
}


//------------------------------------------------------------------------
//-------------------STORM STRIKES (all fight)-----------------------------
//------------------------------------------------------------------------
// Dark clouds gather over several circles for ~2s, then lightning hits them
// all at once. One circle always sits on you, the rest are scattered close
// by - read the picture, step out. More volleys and circles as he weakens.
const SIR_STRIKE_DMG = [0, 0.12, 0.14, 0.16];   // %maxHP when a strike catches you
const SIR_STRIKE_GAP_MS = 900;                   // pause between volleys of one cast

export function _mechSirStrikes(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    _sirEnsureFinalWatcher(monster);
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const d = _sirProgress(monster);
    const run = _nkNewRun(monster && monster.id, true);
    const R = Math.round(Math.min(window.innerWidth, window.innerHeight) * 0.085);
    const volleys = 1 + (d > 0.45 ? 1 : 0) + (p >= 3 ? 1 : 0);
    const count = 3 + (p - 1) + Math.round(d * 2);
    const teleMs = (1900 - d * 300) * _SIR_DEBUG_MULT;
    let launched = 0, current = null, gapLeft = 0;

    const launch = () => {
        const pc = _sirPC();
        const pts = [_sirClampPt(pc.x, pc.y, R)];
        for (let i = 1; i < count; i++) pts.push(_sirPointNear(pc, R * 1.6, R * 5.5, R));
        current = _sirMakeVolley(run, pts, R, teleMs, level, SIR_STRIKE_DMG[p], 'Lightning Strike');
        launched++;
    };
    launch();
    _nkLoop(run, (dtS) => {
        if (current) {
            if (!current.tick(dtS * 1000)) { current = null; gapLeft = SIR_STRIKE_GAP_MS * _SIR_DEBUG_MULT; }
            return true;
        }
        if (launched >= volleys) return false;
        gapLeft -= dtS * 1000;
        if (gapLeft <= 0) launch();
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------ACT II: CHAIN LIGHTNING (60%)-------------------------
//------------------------------------------------------------------------
// A few ponds mark the ground (dashed rings that fill with water after 2s);
// then a ball of chain lightning charges up on the arena edge farthest from
// you (1.2s telegraph) and hunts you. It is almost as fast as you - faster
// while you carry CHARGE - so you beat it by luring it across a pond: it
// grounds itself in the water. The ponds never sit on the straight line
// between the ball and you, so standing still never works, and they are
// always within a short walk. Cold pools (shared frozen_cells) ground it
// too. Phase 3: TWO balls, more ponds.
export const SIR_BOLT_SPD   = [0, 0, 245, 260]; // px/s hunting ball (+18 per charge stack)
export const SIR_BOLT_DMG   = [0, 0, 0.14, 0.16]; // %maxHP ball hit
export const SIR_BOLT_LIFE  = [0, 0, 8000, 9000]; // ms the ball hunts
export const SIR_GROUND_R   = 30;                 // distance at which the ball grounds
const SIR_POND_N = [0, 0, 3, 4];                   // ponds per cast
const SIR_POND_R = [0, 0, 88, 78];                 // pond radius (px)
const SIR_POND_MS = 2000;                          // dashed ring -> standing water
const SIR_BOLT_CHARGE_MS = 1200;                   // ball charges before it hunts

// Chooses pond centres: a short walk from the player, clear of every
// ball->player line and of each other (relaxed a little if the screen is cramped).
function _sirPlacePonds(pc, spots, count, radius) {
    const ponds = [];
    for (let i = 0; i < count; i++) {
        let best = null;
        for (let tries = 0; tries < 60; tries++) {
            const slack = tries > 40 ? 0.6 : 1;
            const pt = _sirPointNear(pc, 150, 460, radius + 10);
            const clearOfLines = spots.every(s => _ptSegDist(pt.x, pt.y, s[0], s[1], pc.x, pc.y) > (radius + 45) * slack);
            const clearOfPonds = ponds.every(o => Math.hypot(pt.x - o.x, pt.y - o.y) > (radius * 2 + 20) * slack);
            if (clearOfLines && clearOfPonds) { best = pt; break; }
            if (!best) best = pt;
        }
        ponds.push({ x: best.x, y: best.y });
    }
    return ponds;
}

export function _mechSirChain(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    _sirEnsureFinalWatcher(monster);
    _sirEnsureChip();
    const p = Math.max(2, Math.min(3, Number(phase) || 2));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _nkNewRun(monster && monster.id, true);

    _nkToast('eg_mech_sir_chain', '⛈️ CHAIN LIGHTNING - lure it over WATER', '#fde047');

    // ── The hunting ball(s): spawn on the edge far from you, charge, hunt.
    const nBolts = p >= 3 ? 2 : 1;
    const bolts = [];
    const pc0 = _sirPC();
    const spots = [[60, 60], [W - 60, 60], [60, H - 60], [W - 60, H - 60], [W / 2, 60], [W / 2, H - 60]];
    spots.sort((a, b) => Math.hypot(b[0] - pc0.x, b[1] - pc0.y) - Math.hypot(a[0] - pc0.x, a[1] - pc0.y));
    const pondMs = SIR_POND_MS * _SIR_DEBUG_MULT;
    for (let i = 0; i < nBolts; i++) {
        const [bx, by] = spots[i];
        const el = _nkEl(run, 'div', 'sx-nk-dot sx-sir-bolt sx-sir-bolt-charging');
        el.innerHTML = '<i class="sx-sir-bolt-arc"></i><i class="sx-sir-bolt-core"></i>';
        el.style.transform = 'translate(' + Math.round(bx - 17) + 'px,' + Math.round(by - 17) + 'px)';
        bolts.push({
            x: bx, y: by, el, done: false,
            huntAt: pondMs + (SIR_BOLT_CHARGE_MS + i * 900) * _SIR_DEBUG_MULT,
            life: SIR_BOLT_LIFE[p] * _SIR_DEBUG_MULT,
        });
    }

    // ── Ponds: a dashed ring first, then standing water. ─────────────────
    const radius = SIR_POND_R[p];
    const ponds = _sirPlacePonds(pc0, spots.slice(0, nBolts), SIR_POND_N[p], radius).map(pt => {
        const el = _nkEl(run, 'div', 'sx-sir-pond sx-sir-pond-ring');
        el.style.left = Math.round(pt.x - radius) + 'px';
        el.style.top = Math.round(pt.y - radius) + 'px';
        el.style.width = el.style.height = (radius * 2) + 'px';
        return { x: pt.x, y: pt.y, el, filled: false };
    });

    // Grounding: over standing water or a cold pool, the ball grounds.
    const groundedBy = (bx, by) => {
        for (const o of ponds) {
            if (o.filled && Math.hypot(bx - o.x, by - o.y) < radius - 4) return o;
        }
        const cold = document.querySelectorAll('.sx-frozen-cell, .sx-nk-frozen-cell');
        for (const c of cold) {
            const cr = c.getBoundingClientRect();
            if (bx > cr.left - 10 && bx < cr.right + 10 && by > cr.top - 10 && by < cr.bottom + 10) return c;
        }
        return null;
    };

    let T = 0;   // the cast's own clock (ms): frozen while the game is paused
    _nkLoop(run, (dtS) => {
        T += dtS * 1000;
        const pc = _sirPC();
        const pr = _nkPlayerRect();

        if (T >= pondMs) {
            for (const o of ponds) {
                if (!o.filled) { o.filled = true; o.el.classList.remove('sx-sir-pond-ring'); o.el.classList.add('sx-sir-pond-pool'); }
            }
        }

        let pending = false;
        for (const b of bolts) {
            if (b.done) continue;
            pending = true;
            if (T < b.huntAt) continue;          // still charging at the edge
            b.el.classList.remove('sx-sir-bolt-charging');
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
                    const fx = _nkEl(run, 'div', 'sx-sir-ground');
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
// The Stormcaller holds the sky (immune). The whole arena turns into a
// raging storm - dark cloud, driving rain, flashing lightning - except one
// calm circle: the EYE. 3-2-1 first (the eye is already visible), then the
// storm rages and every 0.7s outside the eye is a real hit. The eye drifts
// slowly across the arena and shrinks as it goes, so you have to follow it.
export const SIR_EYE_DPS    = [0, 0, 8.5, 10]; // %/s in the storm (paid as hits on the touch cooldown)
export const SIR_EYE_LIFE   = 8000;  // ms the storm rages (after the telegraph)
export const SIR_EYE_IMMUNE = true;  // he holds the sky: immune while it stands
const SIR_EYE_WARN_MS = 3000;        // 3-2-1 before the storm rages
const SIR_EYE_R_START = [0, 0, 200, 170];   // eye radius when the storm breaks
const SIR_EYE_R_END   = [0, 0, 140, 115];   // eye radius when it fades
const SIR_EYE_SPEED   = [0, 0, 55, 80];     // px/s the eye drifts

// Spawns one decorative lightning bolt somewhere in the storm (no damage).
function _sirStormBolt(run, eye) {
    const W = window.innerWidth, H = window.innerHeight;
    let x = 30 + Math.random() * (W - 60);
    if (Math.abs(x - eye.x) < eye.r + 30) x = x < eye.x ? Math.max(30, eye.x - eye.r - 40) : Math.min(W - 30, eye.x + eye.r + 40);
    const el = _nkEl(run, 'div', 'sx-sir-bolt-fx');
    el.style.left = Math.round(x - 40) + 'px';
    el.style.height = Math.round(H * (0.5 + Math.random() * 0.45)) + 'px';
    setTimeout(() => { try { el.remove(); } catch (e) {} }, 260);
}

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
    const p = Math.max(2, Math.min(3, Number(phase) || 2));
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const run = _nkNewRun(monster && monster.id, true);

    _nkToast('eg_mech_sir_eye', '⛈️ STORM EYE - stay inside the calm eye!', '#fde047');

    // The storm fills the arena; the eye is a hole cut out of it.
    const field = _nkEl(run, 'div', 'sx-sir-stormfield sx-sir-stormfield-arming');
    const ring = _nkEl(run, 'div', 'sx-sir-eyering');
    ring.innerHTML = '<i class="sx-sir-eyering-swirl"></i><span class="sx-sir-eye-count"></span>';
    const countEl = ring.querySelector('.sx-sir-eye-count');

    const pc0 = _sirPC();
    const start = _sirPointNear(pc0, 90, 220, SIR_EYE_R_START[p]);
    const eye = { x: start.x, y: start.y, r: SIR_EYE_R_START[p] };
    let target = null;
    const pickTarget = () => { target = _sirClampPt(60 + Math.random() * (W - 120), 60 + Math.random() * (H - 120), eye.r); };
    pickTarget();
    const place = () => {
        field.style.setProperty('--ex', Math.round(eye.x) + 'px');
        field.style.setProperty('--ey', Math.round(eye.y) + 'px');
        field.style.setProperty('--er', Math.round(eye.r) + 'px');
        ring.style.left = Math.round(eye.x - eye.r) + 'px';
        ring.style.top = Math.round(eye.y - eye.r) + 'px';
        ring.style.width = ring.style.height = Math.round(eye.r * 2) + 'px';
    };
    place();

    // He holds the sky: immune while the set-piece stands (released on
    // every kill path too).
    if (monster && SIR_EYE_IMMUNE) { try { monster.bossImmune = true; } catch (e) {} }
    run.onKill = () => { if (monster) { try { monster.bossImmune = false; } catch (e) {} } };

    const warnMs = SIR_EYE_WARN_MS * _SIR_DEBUG_MULT;
    const lifeMs = SIR_EYE_LIFE * _SIR_DEBUG_MULT;
    let T = 0, raging = false, boltIn = 0;   // T: the cast's own clock (ms), frozen on pause
    _nkLoop(run, (dtS) => {
        T += dtS * 1000;
        if (!raging) {
            const left = warnMs - T;
            if (countEl) countEl.textContent = left > 0 ? String(Math.ceil(left / 1000)) : '';
            if (left <= 0) {
                raging = true;
                field.classList.remove('sx-sir-stormfield-arming');
                ring.classList.add('sx-sir-eyering-live');
            }
            return true;
        }
        // The eye drifts toward its next waypoint and slowly closes.
        const k = Math.min(1, (T - warnMs) / lifeMs);
        eye.r = SIR_EYE_R_START[p] + (SIR_EYE_R_END[p] - SIR_EYE_R_START[p]) * k;
        const dx = target.x - eye.x, dy = target.y - eye.y, dist = Math.hypot(dx, dy);
        if (dist < 12) pickTarget();
        else { const step = Math.min(dist, SIR_EYE_SPEED[p] * dtS); eye.x += dx / dist * step; eye.y += dy / dist * step; }
        place();
        boltIn -= dtS * 1000;
        if (boltIn <= 0) { boltIn = 350 + Math.random() * 500; _sirStormBolt(run, eye); }
        const pc = _sirPC();
        if (Math.hypot(pc.x - eye.x, pc.y - eye.y) > eye.r) {
            _sirTouch(SIR_EYE_DPS[p] / 100 * (SIR_TOUCH_CD_MS / 1000), level, 'Raging Storm');
        }
        return T - warnMs < lifeMs;
    });
}


//------------------------------------------------------------------------
//-------------------FINALE: PERFECT STORM (≤10%, one-shot)----------------
//------------------------------------------------------------------------
// The sky goes dark. First a volley of lightning strike circles: one sits
// on you, the rest ring it - be OUTSIDE every circle when it lands. Then a
// STORM WALL closes in from the edges around one calm square: be INSIDE it,
// everything else is struck. Another, bigger volley follows. Then the storm
// grows TEETH: charged bullets fly through the spot you stand on for 6s
// (faster while you carry charge) - keep moving. Last, THE EYE OPENS: one
// green circle within reach is the only shelter from the final strike. Boss
// immune throughout.
export const SIR_FIN_BOXES    = 3;      // set-piece waves (strikes, wall, strikes)
export const SIR_FIN_BOX_DMG  = 0.19;   // %maxHP caught by a strike / the wall
export const SIR_FIN_BULLET_DMG = 0.09; // %maxHP per bullet hit
export const SIR_FIN_BULLET_SPD = 260;  // px/s charged bullets
export const SIR_FIN_BULLET_DPS = 3.5;  // (legacy) old self-aura DoT - removed
export const SIR_FIN_FAILSAFE_MS = 45000;
const SIR_FIN_CLOSE_MS = 4500;          // the storm wall closes in this long
const SIR_FIN_STRIKE_MS = [0, 2900, 0, 2300];   // strike telegraph per wave
const SIR_FIN_STRIKE_N  = [0, 3, 0, 5];         // circles per strike wave
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

// Pause-safe timeout (mirrors the other finales): the countdown only
// advances while the game is running.
export function _sirAfter(g, ms, fn) {
    const TICK = 100;
    let left = ms;
    const step = () => {
        if (g.finished || !_sirFinal) return;
        if (!_nkFrozen()) left -= TICK;
        if (left <= 0) fn();
        else setTimeout(step, TICK);
    };
    setTimeout(step, Math.min(TICK, ms));
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
        volley: null,
        wave: 0,
        teeth: false,
    };
    _sirFinal = g;

    ['avatar-charge-fill', 'sx-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('sx-charge-paused');
    });

    // FX run (passive): holds the finale timeline.
    g.fxRun = _nkNewRun(monster.id, true);
    g.fxRun.passive = true;

    // The sky goes dark and starts to flash for the whole finale.
    _nkEl(g.fxRun, 'div', 'sx-sir-sky');

    // Banner at the top - the arena below must stay readable.
    const ov = document.createElement('div');
    ov.className = 'sx-sir-cd';
    ov.innerHTML =
        '<div class="sx-sir-cd-label">⛈️ PERFECT STORM</div>' +
        '<div class="sx-sir-cd-hint">Get out of the lightning circles.</div>';
    document.body.appendChild(ov);
    g.overlay = ov;
    g.fxRun.els.push(ov);
    const hintEl = ov.querySelector('.sx-sir-cd-hint');
    const hint = (txt) => { if (hintEl) hintEl.textContent = txt; };

    _nkToast('eg_mech_sir_final_cd', '⛈️💀 PERFECT STORM', '#fde047');

    monster.bossImmune = true;

    const card = document.getElementById('sx-card-' + monster.id);
    const wrap = card ? (card.querySelector('.sx-emoji-wrapper') || card) : null;
    if (wrap) {
        wrap.classList.add('sx-sir-allin');
        wrap.classList.add('sx-nk-shielded');
    }

    const level = monster.level || 1;

    // ── Wave (red): lightning circles - one on you, the rest ring it. ────
    const runStrikeWave = () => {
        const teleMs = SIR_FIN_STRIKE_MS[g.wave] * _SIR_DEBUG_MULT;
        hint('Lightning circles! Get OUT of every circle before the strike.');
        const R = Math.round(Math.min(W, H) * 0.12);
        const pts = _sirRingZones(_sirPC(), SIR_FIN_STRIKE_N[g.wave], R);
        g.volley = _sirMakeVolley(g.fxRun, pts, R, teleMs, level, SIR_FIN_BOX_DMG, 'Lightning Strike');
        _sirAfter(g, teleMs + SIR_STRIKE_FLASH_MS + 400 * _SIR_DEBUG_MULT, runBoxWave);
    };

    // ── Wave (green): a storm wall closes in around one calm square. ─────
    const runWallWave = () => {
        hint('The storm closes in! Get INSIDE the calm square.');
        const side = Math.round(Math.min(W, H) * 0.24);
        const closeMs = SIR_FIN_CLOSE_MS * _SIR_DEBUG_MULT;
        // The calm square opens within walking reach (but never right on you).
        const c = _sirPointNear(_sirPC(), 170, 400, side / 2);
        const tgt = { l: c.x - side / 2, t: c.y - side / 2, r: c.x + side / 2, b: c.y + side / 2 };
        const mark = _nkEl(g.fxRun, 'div', 'sx-sir-fin-mark sx-sir-fin-safe');
        mark.style.left = Math.round(tgt.l) + 'px'; mark.style.top = Math.round(tgt.t) + 'px';
        mark.style.width = mark.style.height = side + 'px';
        mark.innerHTML = '<span>GET IN</span>';
        // Four storm panels fill everything outside the hole; the edge glows.
        const panels = [0, 1, 2, 3].map(() => _nkEl(g.fxRun, 'div', 'sx-sir-storm sx-sir-storm-live'));
        const edge = _nkEl(g.fxRun, 'div', 'sx-sir-box sx-sir-box-in');
        const setBox = (el, l, t, w, h) => {
            el.style.left = Math.round(l) + 'px'; el.style.top = Math.round(t) + 'px';
            el.style.width = Math.max(0, Math.round(w)) + 'px'; el.style.height = Math.max(0, Math.round(h)) + 'px';
        };
        let T = 0;
        const wave = _nkNewRun(monster.id, false);
        wave.passive = true;
        _nkLoop(wave, (dtS) => {
            if (g.finished) return false;
            T += dtS * 1000;
            const k = Math.min(1, T / closeMs);
            const l = tgt.l * k, t = tgt.t * k, r = W - (W - tgt.r) * k, b = H - (H - tgt.b) * k;
            setBox(panels[0], 0, 0, W, t);
            setBox(panels[1], 0, b, W, H - b);
            setBox(panels[2], 0, t, l, b - t);
            setBox(panels[3], r, t, W - r, b - t);
            setBox(edge, l, t, r - l, b - t);
            if (k < 1) return true;
            const pc = _sirPC();
            const inside = pc.x > tgt.l && pc.x < tgt.r && pc.y > tgt.t && pc.y < tgt.b;
            if (!inside) {
                const dealt = _nkHit(SIR_FIN_BOX_DMG, 'lightning', level);
                _nkAbilityHitToast(dealt, 'The Stormcaller', 'Storm Wall');
            }
            panels.concat([edge]).forEach(el => el.classList.add('sx-sir-box-final'));
            setTimeout(() => { panels.concat([edge, mark]).forEach(el => { try { el.remove(); } catch (e) {} }); }, 700);
            return false;
        });
        _sirAfter(g, closeMs + 1100 * _SIR_DEBUG_MULT, runBoxWave);
    };

    const runBoxWave = () => {
        if (g.finished) return;
        g.wave++;
        if (g.wave > SIR_FIN_BOXES) { runTeeth(); return; }
        if (g.wave === 2) runWallWave(); else runStrikeWave();
    };

    // ── THE STORM GROWS TEETH: charged bullets aim at you. ───────────────
    const runTeeth = () => {
        if (g.finished) return;
        _nkToast('eg_mech_sir_teeth', '⛈️🦷 STORM GROWS TEETH - keep moving!', '#f97316');
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
        const eyeMs = SIR_FIN_EYE_MS * _SIR_DEBUG_MULT;
        // 3s countdown at 320 px/s minus 0.7s reaction leaves ~730 px of
        // walking; the eye opens 180-380 px away.
        const e = _sirPointNear(_sirPC(), 180, 380, SIR_FIN_EYE_R);
        const eye = _nkEl(g.fxRun, 'div', 'sx-sir-fin-eye sx-sir-fin-safe');
        eye.style.left = Math.round(e.x - SIR_FIN_EYE_R) + 'px';
        eye.style.top = Math.round(e.y - SIR_FIN_EYE_R) + 'px';
        eye.style.width = eye.style.height = (SIR_FIN_EYE_R * 2) + 'px';
        eye.innerHTML = '<span class="sx-sir-eye-count"></span>';
        const dark = _nkEl(g.fxRun, 'div', 'sx-sir-fin-dark');
        dark.style.setProperty('--ex', Math.round(e.x) + 'px');
        dark.style.setProperty('--ey', Math.round(e.y) + 'px');
        dark.style.setProperty('--er', SIR_FIN_EYE_R + 'px');
        const countEl = eye.querySelector('.sx-sir-eye-count');
        let leftMs = eyeMs;
        const tick = () => {
            if (g.finished) return;
            if (countEl) countEl.textContent = leftMs > 0 ? String(Math.ceil(leftMs / 1000)) : '';
            if (leftMs > 0) { leftMs -= 100; _sirAfter(g, 100, tick); return; }
            const pc = _sirPC();
            if (Math.hypot(pc.x - e.x, pc.y - e.y) > SIR_FIN_EYE_R) {
                const dealt = _nkHit(SIR_FIN_FINAL_DMG, 'lightning', level);
                _nkAbilityHitToast(dealt, 'The Stormcaller', 'Perfect Storm');
            } else {
                _nkToast('eg_mech_sir_survived', '⛈️ You rode out the perfect storm!', '#86efac');
            }
            dark.classList.add('sx-sir-fin-flash');
            _sirAfter(g, 1200 * _SIR_DEBUG_MULT, () => _sirFinalEnd(g, monster));
        };
        tick();
    };

    // ── Main finale loop: strike circles + charged bullets (teeth). ──────
    let finaleMs = 0, bulletCd = 0;
    _nkLoop(g.fxRun, (dtS) => {
        if (g.finished) return false;
        finaleMs += dtS * 1000;
        const pc = _sirPC();
        if (g.volley && !g.volley.tick(dtS * 1000)) g.volley = null;
        if (g.teeth && finaleMs >= bulletCd) {
            const charged = _sirChargeNow() >= 3;
            bulletCd = finaleMs + (charged ? 380 : 520) * _SIR_DEBUG_MULT;
            const el = _nkEl(g.fxRun, 'div', 'sx-nk-dot sx-sir-bullet');
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
        if (finaleMs > SIR_FIN_FAILSAFE_MS) { _sirFinalEnd(g, monster); return false; }
        return true;
    });

    runBoxWave();
}

// Every CSS class this boss puts on the board (used by finale end + teardown).
const SIR_BOARD_SELECTOR = '.sx-sir-cd, .sx-sir-box, .sx-sir-bullet, .sx-sir-pond, .sx-sir-stormfield, .sx-sir-eyering, ' +
    '.sx-sir-bolt-fx, .sx-sir-storm, .sx-sir-zone, .sx-sir-sky, ' +
    '.sx-sir-ion, .sx-sir-gap, .sx-sir-bolt, .sx-sir-ground, .sx-sir-fin-mark, .sx-sir-fin-eye, .sx-sir-fin-dark';

// Ends the finale: releases immunity + charge bar and cleans the board.
export function _sirFinalEnd(g, monster) {
    if (!g || g.finished) return;
    g.finished = true;
    try { if (g.fxRun) _nkKillRun(g.fxRun); } catch (e) {}
    document.querySelectorAll(SIR_BOARD_SELECTOR).forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    const card = document.getElementById('sx-card-' + g.monsterId);
    const wrap = card ? (card.querySelector('.sx-emoji-wrapper') || card) : null;
    if (wrap) {
        wrap.classList.remove('sx-sir-allin');
        wrap.classList.remove('sx-nk-shielded');
    }
    ['avatar-charge-fill', 'sx-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('sx-charge-paused');
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
    document.querySelectorAll('.sx-sir-charge-chip').forEach(el => { try { el.remove(); } catch (e) {} });
    // The Storm Eye grants immunity while it stands - release it if the
    // fight ended mid-cast (teardown kills the run before its loop ends).
    try {
        if (typeof _monsters !== 'undefined') {
            globalThis._monsters.forEach(m => { if (m && m.baseId === 'boss_sirus') m.bossImmune = false; });
        }
    } catch (e) {}
    document.querySelectorAll(SIR_BOARD_SELECTOR).forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    document.querySelectorAll('.sx-sir-allin').forEach(el => el.classList.remove('sx-sir-allin'));
    ['avatar-charge-fill', 'sx-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('sx-charge-paused');
    });
}


//------------------------------------------------------------------------
//-------------------PLAYTEST CONSOLE HOOK (dev only)----------------------
//------------------------------------------------------------------------
// Tiny console API for playtesting with stretched debug timings:
//   _SIR_DEBUG.fire('ion'|'strikes'|'chain'|'eye', phase) - runs one now
//   _SIR_DEBUG.final()                                    - PERFECT STORM now
if (typeof window !== 'undefined') {
    window._SIR_DEBUG = {
        fire: (name, phase) => {
            const monster = (typeof _monsters !== 'undefined')
                ? globalThis._monsters.find(m => m && m.baseId === 'boss_sirus') : null;
            if (!monster) return 'no stormcaller alive';
            const fn = name === 'ion' ? _mechSirIon
                : name === 'strikes' ? _mechSirStrikes
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
