import { t } from '../../translation/translations.js';
import { _egRenderPanel } from '../encounter.js';
import { _egApplyMapModsToMonster, _egGetActiveMapModValue } from '../../endgame/endgame-map-launch.js';
import { _egBossTimers, _egIsActive } from '../combat-state.js';
// NOTE: no imports from per-boss boss files here on purpose (the data
// table ./boss-teardown-hooks.js is exempt - it imports nothing, so it
// cannot cycle). The per-boss teardown fns resolve lazily via globalThis
// (same dynamic dispatch
// as window[mech.handler]): a static import would cycle framework ->
// boss -> framework, running the boss's top-level Object.assign(EG_BOSS_*)
// while these consts are still in their temporal dead zone and aborting
// the whole entry (the step-5 SKILL_REGISTRY lesson).
import { _egBlastTeardownAll, _egClearAllCorruptedCells, _egClearAllFrozenCells, _egClearPriorBombFuses, _egClearShiftGlows, _egNkTeardownBoss, _egRemoveClueSwap, _egRemoveGridInvert } from './shared-boss-abilities.js';
import { _egClearFateMarks, _egRemoveClueScramble, _egRemoveFogBank, _egRemoveVeil, _egTitheTeardown } from './shared-puzzle-mechanics.js';
import { EG_BOSS_TEARDOWN_HOOKS } from './boss-teardown-hooks.js';

//------------------------------------------------------------------------
//-------------------ENDGAME BOSS FRAMEWORK-------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Registries, scaling, lifecycle, phases and scheduling for all bosses.
// Per-boss files register via Object.assign(EG_BOSS_DEFS/MECHANICS); the
// teardown table lives in ./boss-teardown-hooks.js. To add a boss, copy
// boss-template.js, list exports + handler bridges in module-manifest.json,
// then run the full gate (lint + tests + phase2:verify + build).
//------------------------------------------------------------------------


// ── Boss registries ──────────────────────────────────────────────────────────
// Populated by the per-boss files via Object.assign. Kept empty here so file
// load order is simply framework → shared → bosses (any boss order works).
export const EG_BOSS_DEFS = {};
export const EG_BOSS_MECHANICS = {};

// Boss level scaling 
// Applied per level above 1. 
export const EG_BOSS_LEVEL_HP_SCALE = 0.28; // +28% HP per level above 1


export const EG_BOSS_LEVEL_DAMAGE_SCALE = 0.12; // +12% damage per level above 1


// ── Late-endgame HP explosion ────────────────────────────────────────────
// Linear 28% alone is not enough to outrun late gear scaling - bosses at
// L85+ die in seconds on well-geared characters (player DPS roughly doubles
// every ~30 levels from weapon + phys/power creep). A convex multiplier
// on top of the linear curve keeps early bosses (≈L1-40) almost unchanged
// but massively inflates HP towards the true endgame (T13-T16, L71-90).
// Anchors: 1→1.0, 50→1.15, 60→1.7, 75→3.0, 85→4.8, 90→6.0, 95→7.2
// Result at L87 (T15): ~5.2× the old linear HP (~135k vs ~26k for a 1k base).
export const EG_BOSS_LATE_HP_ANCHORS = [[1,1.0],[50,1.15],[60,1.7],[75,3.0],[85,4.8],[90,6.0],[95,7.2]];


export function _egGetBossLateHpMult(lvl) {
    const l = Math.max(1, Number(lvl) || 1);
    const a = EG_BOSS_LATE_HP_ANCHORS;
    if (l <= a[0][0]) return a[0][1];
    if (l >= a[a.length-1][0]) return a[a.length-1][1];
    for (let i = 0; i < a.length - 1; i++) {
        const [x0,y0] = a[i], [x1,y1] = a[i+1];
        if (l >= x0 && l <= x1) {
            const t = (l - x0) / (x1 - x0);
            return y0 + (y1 - y0) * t;
        }
    }
    return 1;
}


// ── Soft enrage ──────────────────────────────────────────────────────────────
// If a boss fight drags on too long, the boss starts stacking damage buffs.
// Prevents bosses from being trivialised by pure attrition/turtling.
export const EG_BOSS_SOFT_ENRAGE_DELAY_MS = 150000;   // grace period before stacks begin (2.5 min)


export const EG_BOSS_SOFT_ENRAGE_INTERVAL_MS = 30000; // a new stack every 30s after the delay


export const EG_BOSS_SOFT_ENRAGE_DMG_STEP = 0.08;     // +8% damage per stack


export const EG_BOSS_SOFT_ENRAGE_MAX_STACKS = 10;     // hard cap: +80% damage


// ── Phase display names (translation keys, indexed by phase number) ──────────
// Index 0 is unused. Add entries here as you add more phases to any boss.
export const EG_BOSS_PHASE_NAMES = ['', 'eg_phase_1', 'eg_phase_2_enrage', 'eg_phase_3_fury', 'eg_phase_4_finale'];


// ── Recent fill tracker capacity ─────────────────────────────────────────────
// Used by the Prior Bomb mechanic. Increase if you want it to reach further back.
export const EG_RECENT_FILLS_CAPACITY = 20;


// Global boss attack-speed tuning - all bosses charge their attack bar this
// much faster than the chargeMax values in their defs (0.8 = 25% faster).
export const EG_BOSS_CHARGE_SPEED_MULT = 0.8;

// Scales a raw boss chargeMax by the global attack-speed tuning, keeping a
// sane minimum so the fastest bosses never attack faster than 3 ticks.
export function _egScaleBossChargeMax(raw) {
    return Math.max(3, Math.round(raw * EG_BOSS_CHARGE_SPEED_MULT));
}

// Returns the scaled stats for a boss at the given level.
// Accepts either a string id (looks up EG_BOSS_DEFS) or a def object directly.
// hpMult: optional multiplier for boss max HP only (e.g., 500k HP test
// mode). Damage is intentionally left at its normal scaled value so the
// test boost never inflates the boss's attacks.
export function _egBuildBoss(defOrId, level = 1, hpMult = 1) {
    const def = (typeof defOrId === 'string') ? EG_BOSS_DEFS[defOrId] : defOrId;
    if (!def) { console.warn('Unknown Boss id:', defOrId); return null; }

    const lvl = Math.max(1, level);
    const baseHpScale = 1 + EG_BOSS_LEVEL_HP_SCALE * (lvl - 1);
    const lateMult = (typeof _egGetBossLateHpMult === 'function') ? _egGetBossLateHpMult(lvl) : 1;
    const hpScale = baseHpScale * lateMult;
    const dmgScale = 1 + EG_BOSS_LEVEL_DAMAGE_SCALE * (lvl - 1);

    const maxHP = Math.round(def.baseHP * hpScale * hpMult);
    const damage = Math.round(def.baseDamage * dmgScale);

    const monster = {
        id: `${def.id}_${++globalThis._egMonsterSpawnCounter}`,
        baseId: def.id,
        artId: def.id, // bosses have no variants - always the base id
        artScale: 1, // bosses keep their fixed (large) frame size
        name: def.name,
        emoji: def.emoji,
        level: lvl,
        maxHP,
        currentHP: maxHP,
        chargeMax: _egScaleBossChargeMax(def.chargeMax),
        currentCharge: 0,
        damageValue: damage,
        element: def.element || null,
        resistances: def.resistances || null,
        isBoss: true
    };

    if (typeof _egApplyMapModsToMonster === 'function') _egApplyMapModsToMonster(monster);

    return monster;
}


// Returns the current soft-enrage damage multiplier for a boss (1.0 if none).
export function _egBossEnrageMultiplier(monster) {
    return 1 + EG_BOSS_SOFT_ENRAGE_DMG_STEP * (monster.enrageStacks || 0);
}


// Recomputes a boss's damageValue from its base damage, phase multiplier and
// soft-enrage stacks. Called on phase transitions and enrage stack ticks.
export function _egBossRecalcDamage(monster) {
    const phaseData = monster.bossDef.phases[monster.bossPhase - 1];
    monster.damageValue = Math.round(
        monster.bossBaseDamage * phaseData.damageMultiplier * _egBossEnrageMultiplier(monster)
    );
}


// Per-tick boss logic, called from _egTickLoop every 100ms.
// Handles the soft-enrage damage stacking for all live bosses.
export function _egBossTick() {
    if (typeof _egIsActive === 'function' && !_egIsActive()) return;

    const now = Date.now();
    let anyNewlyEnraged = false;
    globalThis._egMonsters.forEach(m => {
        if (!m.isBoss || !m.bossDef) return;

        if (!m.bossSpawnTime) m.bossSpawnTime = now;
        const elapsed = now - m.bossSpawnTime - EG_BOSS_SOFT_ENRAGE_DELAY_MS;
        if (elapsed < 0) return;

        const targetStacks = Math.min(
            EG_BOSS_SOFT_ENRAGE_MAX_STACKS,
            1 + Math.floor(elapsed / EG_BOSS_SOFT_ENRAGE_INTERVAL_MS)
        );
        if (targetStacks > (m.enrageStacks || 0)) {
            m.enrageStacks = targetStacks;
            _egBossRecalcDamage(m);
            anyNewlyEnraged = true;

            const card = document.getElementById(`eg-card-${m.id}`);
            const wrapper = card ? card.querySelector('.eg-emoji-wrapper') : null;
            if (wrapper) wrapper.classList.add('eg-boss-enraged');
        }
    });

    if (anyNewlyEnraged && typeof showToast === 'function') {
        globalThis.showToast(t('eg_boss_soft_enrage'));
    }
}


// Attaches boss runtime state to a newly spawned boss monster object
// and kicks off its phase 1 mechanics.
export function _egBossInit(monster) {
    // Runtime monster ids are suffixed (e.g. "boss_null_7") - look the
    // mechanics entry up via the unsuffixed base id.
    const def = EG_BOSS_MECHANICS[monster.baseId || monster.id];
    if (!def) return; // not all bosses need special mechanics

    monster.bossPhase = 1;
    monster.bossImmune = false;
    monster.bossDef = def;
    monster.bossBaseDamage = monster.damageValue; // store base so phases can scale it
    monster.bossSpawnTime = Date.now();
    monster.enrageStacks = 0;

    _egBossTimers[monster.id] = [];
    // Persistent arena systems (such as The Firefly's lights) start before
    // scheduled mechanics, so they are present from the opening second.
    if (typeof def.onInit === 'function') {
        try { def.onInit(monster); } catch (e) { console.warn('Boss init hook failed:', monster.baseId, e); }
    }
    _egBossScheduleMechanics(monster, 1);
}


// Teardown registry lives in ./boss-teardown-hooks.js (imported above).
// _egBossCleanup + _egValidateAllBossHandlers read it from there.


// Cancels all mechanic timers for a specific boss and cleans up any
// active field effects it created (corrupted cells, veil, blackout).
export function _egBossCleanup(monsterId) {
    const timers = _egBossTimers[monsterId];
    if (timers) {
        timers.forEach(t => { clearTimeout(t); clearInterval(t); });
        delete _egBossTimers[monsterId];
    }
    if (typeof _egClearAllCorruptedCells === 'function') _egClearAllCorruptedCells();
    if (typeof _egClearPriorBombFuses === 'function') _egClearPriorBombFuses();
    if (typeof _egClearShiftGlows === 'function') _egClearShiftGlows();
    if (typeof _egClearAllFrozenCells === 'function') _egClearAllFrozenCells();
    if (typeof _egRemoveVeil === 'function') _egRemoveVeil();
    if (typeof globalThis._egRemoveBlackout === 'function') globalThis._egRemoveBlackout();
    if (typeof _egRemoveClueSwap === 'function') _egRemoveClueSwap();
    if (typeof _egRemoveGridInvert === 'function') _egRemoveGridInvert();
    if (typeof globalThis._egVoidSurgeTeardown === 'function') globalThis._egVoidSurgeTeardown();
    if (typeof _egBlastTeardownAll === 'function') _egBlastTeardownAll();
    if (typeof window._egCrushTeardown === 'function') window._egCrushTeardown();
    if (typeof _egClearFateMarks === 'function') _egClearFateMarks();
    if (typeof _egRemoveFogBank === 'function') _egRemoveFogBank();
    if (typeof _egRemoveClueScramble === 'function') _egRemoveClueScramble();
    if (typeof _egTitheTeardown === 'function') _egTitheTeardown(monsterId);
    if (typeof _egNkTeardownBoss === 'function') _egNkTeardownBoss(monsterId);
    if (typeof globalThis._egFireflyTeardown === 'function') globalThis._egFireflyTeardown(monsterId);
    // The Snail: slimes + broom live outside nk runs - tear them down too.
    if (typeof globalThis._egSnailTeardown === 'function') globalThis._egSnailTeardown();
    // The Demolitionist: the Bomb Maze owns body-level state (countdown
    // overlay, banner, charge-bar freeze) while it runs - drop it with the
    // boss. Runs on boss death and on encounter stop via _egBossCleanupAll.
    if (typeof globalThis._egCrashTeardown === 'function') globalThis._egCrashTeardown();
    // Per-boss field-effect teardowns - registry-driven (table in
    // ./boss-teardown-hooks.js; entries keep their own typeof guard).
    for (let i = 0; i < EG_BOSS_TEARDOWN_HOOKS.length; i++) {
        const hook = EG_BOSS_TEARDOWN_HOOKS[i];
        const matches = hook[2] ? monsterId === hook[0] : monsterId.startsWith(hook[0]);
        if (matches && typeof window[hook[1]] === 'function') window[hook[1]]();
    }
}


// Cleans up all tracked bosses at once. Called on encounter stop.
export function _egBossCleanupAll() {
    Object.keys(_egBossTimers).forEach(id => _egBossCleanup(id));
}


// Determines which phase the boss should be in based on current HP%.
// Returns the target phase number (1-indexed).
export function _egBossCalcTargetPhase(monster) {
    const hpPct = monster.currentHP / monster.maxHP;
    const phases = monster.bossDef.phases;
    let targetPhase = 1;
    for (let i = phases.length - 1; i >= 0; i--) {
        if (hpPct <= phases[i].threshold && i > 0) {
            targetPhase = i + 1;
            break;
        }
    }
    return targetPhase;
}


// Applies the stat changes for a new boss phase to the monster object.
// (chargeMax, damageValue). Does not touch timers or UI.
export function _egBossApplyPhaseStats(monster, newPhase) {
    const phaseData = monster.bossDef.phases[newPhase - 1];
    monster.bossPhase = newPhase;
    monster.bossImmune = true;
    monster.chargeMax = _egScaleBossChargeMax(phaseData.chargeMax);

    // Active map run: re-apply the attack-speed mod, the raw phase value
    // just overwrote it.
    const spdPct = (typeof _egGetActiveMapModValue === 'function')
        ? _egGetActiveMapModValue('map_monster_speed') : 0;
    if (spdPct > 0 && monster.chargeMax > 0) {
        monster.chargeMax = Math.max(3, Math.ceil(monster.chargeMax / (1 + spdPct / 100)));
    }

    _egBossRecalcDamage(monster);
}


// Cancels existing mechanic timers for a boss so they can be rescheduled
// at the new phase's speed when the immunity window expires.
export function _egBossClearMechanicTimers(monster) {
    const timers = _egBossTimers[monster.id] || [];
    timers.forEach(t => { clearTimeout(t); clearInterval(t); });
    _egBossTimers[monster.id] = [];
}


// Shows the phase transition toast and triggers the transition CSS animation on the card.
export function _egBossPlayTransitionFeedback(monster, newPhase) {
    const label = EG_BOSS_PHASE_NAMES[newPhase] ? t(EG_BOSS_PHASE_NAMES[newPhase]) : t('eg_phase_badge').replace('{n}', newPhase);
    globalThis.showToast(`⚡ ${monster.name}: ${label}!`);

    const card = document.getElementById(`eg-card-${monster.id}`);
    if (card) {
        card.classList.add('eg-boss-transition');
        setTimeout(() => card.classList.remove('eg-boss-transition'), 1500);
    }
}


// Orchestrates a full boss phase transition:
//   1. Applies stat changes
//   2. Cancels old mechanic timers
//   3. Plays feedback (toast + card flash)
//   4. Waits for the immunity window, then re-schedules mechanics at new phase speed
export function _egBossTransition(monster, newPhase) {
    _egBossApplyPhaseStats(monster, newPhase);
    _egBossClearMechanicTimers(monster);
    _egBossPlayTransitionFeedback(monster, newPhase);
    _egRenderPanel();

    // Optional per-boss phase-enter hook. A boss can define
    // `onPhaseEnter(monster, newPhase)` in its EG_BOSS_MECHANICS entry to run
    // phase-specific logic (gate events, special spawns) right at the moment
    // the phase begins - before the generic immunity window. Returning true
    // takes over the phase entirely: the boss owns its immunity release and
    // mechanic rescheduling (the default immunity timer is skipped). This is
    // how The Jelly keeps its Ice Shell up until a hop blob slips on the ice
    // (see boss-jelly.js) instead of fading after immunityDuration.
    if (monster.bossDef && typeof monster.bossDef.onPhaseEnter === 'function') {
        try {
            if (monster.bossDef.onPhaseEnter(monster, newPhase)) return;
        } catch (e) {
            // A buggy hook must never break the phase transition itself.
        }
    }

    setTimeout(() => {
        if (!globalThis._egMonsters.find(m => m.id === monster.id)) return; // boss died mid-window
        monster.bossImmune = false;
        _egBossScheduleMechanics(monster, newPhase);
        _egRenderPanel();
    }, monster.bossDef.immunityDuration);
}


// Checks whether a damage hit should trigger a phase transition and, if so, fires it.
// Called after every hit on a boss. No-op during existing immunity windows.
export function _egBossCheckPhase(monster) {
    if (!monster.bossDef || monster.bossImmune) return;

    const targetPhase = _egBossCalcTargetPhase(monster);
    if (targetPhase > monster.bossPhase) {
        _egBossTransition(monster, targetPhase);
    }
}


// Returns the delay (ms) for the next trigger of a mechanic at the given phase.
// Higher phases reduce the interval by 20% per phase above 1, capped at 5s minimum.
export function _egCalcMechanicInterval(mech, phase) {
    const speedFactor = 1 - (phase - 1) * 0.20;
    const rawInterval = mech.intervalBase
        + (Math.random() * mech.intervalVariance - mech.intervalVariance / 2);
    return Math.max(5000, rawInterval * speedFactor);
}


// Mechanic → activation-sting category. Shared mechanics (used by 2+ bosses)
// are mapped explicitly; boss-unique names fall back to a keyword heuristic
// (most one-off moves are hazard-style attacks).
export const _EG_MECH_CATEGORY = {
    corrupt_cells: 'grid', prior_bomb: 'grid', probability_shift: 'grid',
    fated_cell: 'grid', frozen_cells: 'grid', clue_scramble: 'grid',
    clue_swap: 'grid', grid_invert: 'grid',
    fog_bank: 'hazard', soul_tithe: 'hazard',
    prior_summons: 'summon', sacrificial_zombies: 'summon',
};

// Resolves any mechanic name to a category so the activation sting's pitch
// identifies the mechanic TYPE by ear: grid-affecting (mid) vs hazard (low)
// vs summon (high). Uncategorized names return undefined → generic sting.
export function _egBossMechCategory(name) {
    if (_EG_MECH_CATEGORY[name]) return _EG_MECH_CATEGORY[name];
    if (/clue|grid|cell|invert|pattern|thread/.test(name)) return 'grid';
    if (/summon|sprout|wisp|seek|ghost|guard|dive/.test(name)) return 'summon';
    return 'hazard';
}


// Schedules a single mechanic for the given boss at the given phase.
// Self-reschedules after each trigger so the mechanic keeps firing until the boss dies.
export function _egBossScheduleSingleMechanic(monster, mech, phase) {
    // phase2Only mechanics are skipped unless we're already in phase 2 or later
    if (mech.phase2Only && phase < 2) return;

    // Runs one trigger of the mechanic - pause-aware, skipped only when the boss
    // is gone or mid-immunity - then lines up the next trigger.
    const fireTrigger = () => {
        if (typeof _gamePaused !== 'undefined' && globalThis._gamePaused) {
            // Game is paused - retry after the pause lifts so the trigger isn't lost
            const retry = setInterval(() => {
                if (typeof _gamePaused !== 'undefined' && globalThis._gamePaused) return;
                clearInterval(retry);
                fireTrigger();
            }, 200);
            return;
        }
        const stillAlive = _egIsActive() && globalThis._egMonsters.find(m => m.id === monster.id);
        if (stillAlive && !monster.bossImmune) {
            const fn = window[mech.handler];
            if (typeof fn === 'function') {
                fn(monster, phase);
            }
        }
        scheduleNext();
    };

    const scheduleNext = () => {
        // Bail out if the encounter ended or this boss is already dead
        if (!_egIsActive() || !globalThis._egMonsters.find(m => m.id === monster.id)) return;

        const interval = _egCalcMechanicInterval(mech, phase);
        const t = setTimeout(fireTrigger, interval);
        if (_egBossTimers[monster.id]) _egBossTimers[monster.id].push(t);
    };

    // The FIRST trigger fires after a short opening delay instead of waiting out
    // a full interval, so a fresh boss - or a fresh phase - starts using its
    // specials a few seconds after arriving. The random spread just staggers a
    // multi-mechanic boss so its abilities don't all fire simultaneously on spawn;
    // every later trigger keeps the full per-mechanic interval above.
    const initialDelay = 3000 + Math.random() * 5000;
    const t0 = setTimeout(fireTrigger, initialDelay);
    if (_egBossTimers[monster.id]) _egBossTimers[monster.id].push(t0);
}


// Schedules all mechanics defined for a boss at the given phase.
// Called on boss spawn (phase 1) and again after each phase transition.
export function _egBossScheduleMechanics(monster, phase) {
    const def = monster.bossDef;
    if (!def) return;
    def.mechanics.forEach(mech => _egBossScheduleSingleMechanic(monster, mech, phase));
}


// Sweeps every registered boss and warns about mechanic handler names that
// do not resolve to a global function. Called once after all boss files
// have loaded (end of boss-rosters.js) so a typo'd handler string can
// never silently disable a mechanic. Dispatch happens via
// window[mech.handler] in _egBossScheduleSingleMechanic, so every handler
// must be a top-level function declaration.
export function _egValidateAllBossHandlers() {
    const missing = [];
    Object.keys(EG_BOSS_MECHANICS).forEach(bossId => {
        const def = EG_BOSS_MECHANICS[bossId];
        (def.mechanics || []).forEach(mech => {
            if (mech.handler && typeof window[mech.handler] !== 'function') {
                missing.push(`${bossId}: ${mech.handler} (${mech.name || 'unnamed mechanic'})`);
            }
        });
    });
    // Teardown hooks are dispatched via window[name] in _egBossCleanup.
    EG_BOSS_TEARDOWN_HOOKS.forEach(hook => {
        if (typeof window[hook[1]] !== 'function') {
            missing.push(`${hook[0]}: teardown ${hook[1]}`);
        }
    });
    if (missing.length) {
        console.warn(`[boss-framework] ${missing.length} mechanic handler(s) do not resolve to a global function:`, missing.join(', '));
    }
}
