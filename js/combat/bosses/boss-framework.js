import { Audio_Manager } from '../../audio/audio.js';
import { t } from '../../translation/translations.js';
import { _renderPanel } from '../encounter.js';
import { _egApplyMapModsToMonster, _egGetActiveMapModValue } from '../../endgame/endgame-map-launch.js';
import { _bossTimers, _isActive } from '../combat-state.js';
import { _dropHeartPickup } from '../combat-grid-pickups-spawner.js';
// NOTE: no imports from per-boss boss files here on purpose (the data
// table ./boss-teardown-hooks.js is exempt - it imports nothing, so it
// cannot cycle). The per-boss teardown fns resolve lazily via globalThis
// (same dynamic dispatch
// as window[mech.handler]): a static import would cycle framework ->
// boss -> framework, running the boss's top-level Object.assign(BOSS_*)
// while these consts are still in their temporal dead zone and aborting
// the whole entry (the step-5 SKILL_REGISTRY lesson).
import { _blastTeardownAll, _clearAllCorruptedCells, _clearAllFrozenCells, _clearPriorBombFuses, _clearShiftGlows, _nkTeardownBoss, _removeClueSwap, _removeGridInvert } from './shared-boss-abilities.js';
import { _clearFateMarks, _removeClueScramble, _removeFogBank, _removeVeil, _titheTeardown } from './shared-puzzle-mechanics.js';
import { BOSS_TEARDOWN_HOOKS } from './boss-teardown-hooks.js';

//------------------------------------------------------------------------
//-------------------ENDGAME BOSS FRAMEWORK-------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Registries, scaling, lifecycle, phases and scheduling for all bosses.
// Per-boss files register via Object.assign(BOSS_DEFS/MECHANICS); the
// teardown table lives in ./boss-teardown-hooks.js. To add a boss, copy
// boss-template.js, list exports + handler bridges in module-manifest.json,
// then run the full gate (lint + tests + phase2:verify + build).
//------------------------------------------------------------------------


// ── Boss registries ──────────────────────────────────────────────────────────
// Populated by the per-boss files via Object.assign. Kept empty here so file
// load order is simply framework → shared → bosses (any boss order works).
export const BOSS_DEFS = {};
export const BOSS_MECHANICS = {};

// Boss level scaling 
// Applied per level above 1. 
export const BOSS_LEVEL_HP_SCALE = 0.28; // +28% HP per level above 1
const BOSS_HP_GLOBAL_MULT = 1.25;  // every boss (trials, endgame) has 25% more life


export const BOSS_LEVEL_DAMAGE_SCALE = 0.12; // +12% damage per level above 1


// ── Late-endgame HP explosion ────────────────────────────────────────────
// Linear 28% alone is not enough to outrun late gear scaling - bosses at
// L85+ die in seconds on well-geared characters (player DPS roughly doubles
// every ~30 levels from weapon + phys/power creep). A convex multiplier
// on top of the linear curve keeps early bosses (≈L1-40) almost unchanged
// but massively inflates HP towards the true endgame (T13-T16, L71-90).
// Balance pass (high-level builds hit 10-60k per action): up to L68 (T1) the
// curve is unchanged (boss ~50k), then it climbs geometrically (x1.135 per
// level) so an unmodified T16 boss (L90, ~1k base HP) has about 1M HP.
// Anchors: 1→1.0, 50→1.15, 60→1.7, 68→2.4, 75→5.8, 80→11.2, 85→21.6, 90→38.6, 95→70
export const BOSS_LATE_HP_ANCHORS = [[1,1.0],[50,1.15],[60,1.7],[68,2.4],[75,5.8],[80,11.2],[85,21.6],[90,38.6],[95,70]];


export function _getBossLateHpMult(lvl) {
    const l = Math.max(1, Number(lvl) || 1);
    const a = BOSS_LATE_HP_ANCHORS;
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
export const BOSS_SOFT_ENRAGE_DELAY_MS = 150000;   // grace period before stacks begin (2.5 min)


export const BOSS_SOFT_ENRAGE_INTERVAL_MS = 30000; // a new stack every 30s after the delay


export const BOSS_SOFT_ENRAGE_DMG_STEP = 0.08;     // +8% damage per stack


export const BOSS_SOFT_ENRAGE_MAX_STACKS = 10;     // hard cap: +80% damage


// ── Phase display names (translation keys, indexed by phase number) ──────────
// Index 0 is unused. Add entries here as you add more phases to any boss.
export const BOSS_PHASE_NAMES = ['', 'eg_phase_1', 'eg_phase_2_enrage', 'eg_phase_3_fury', 'eg_phase_4_finale'];


// ── Recent fill tracker capacity ─────────────────────────────────────────────
// Used by the Prior Bomb mechanic. Increase if you want it to reach further back.
export const RECENT_FILLS_CAPACITY = 20;


// Global boss attack-speed tuning - all bosses charge their attack bar this
// much faster than the chargeMax values in their defs (0.8 = 25% faster).
export const BOSS_CHARGE_SPEED_MULT = 0.8;

// Scales a raw boss chargeMax by the global attack-speed tuning, keeping a
// sane minimum so the fastest bosses never attack faster than 3 ticks.
export function _scaleBossChargeMax(raw) {
    return Math.max(3, Math.round(raw * BOSS_CHARGE_SPEED_MULT));
}

// Boss life is FIXED per boss and level: it never looks at the character's
// gear, so every player faces the same base difficulty (a stronger build just
// wins faster, a weaker one slower).
// The basic-attack damage floor (a share of the player's life) fades out
// between these levels, where the damage curve itself takes over.
const BOSS_DMG_FLOOR_FADE_FROM = 20;
const BOSS_DMG_FLOOR_FADE_TO = 50;

// Returns the scaled stats for a boss at the given level.
// Accepts either a string id (looks up BOSS_DEFS) or a def object directly.
// hpMult: optional multiplier for boss max HP only (e.g., 500k HP test
// mode). Damage is intentionally left at its normal scaled value so the
// test boost never inflates the boss's attacks.
export function _buildBoss(defOrId, level = 1, hpMult = 1) {
    const def = (typeof defOrId === 'string') ? BOSS_DEFS[defOrId] : defOrId;
    if (!def) { console.warn('Unknown Boss id:', defOrId); return null; }

    const lvl = Math.max(1, level);
    const baseHpScale = 1 + BOSS_LEVEL_HP_SCALE * (lvl - 1);
    const lateMult = (typeof _getBossLateHpMult === 'function') ? _getBossLateHpMult(lvl) : 1;
    const hpScale = baseHpScale * lateMult;
    const dmgScale = 1 + BOSS_LEVEL_DAMAGE_SCALE * (lvl - 1);

    const maxHP = Math.round(def.baseHP * hpScale * hpMult * BOSS_HP_GLOBAL_MULT);
    // Early bosses must always be able to hurt: their level-curve damage can
    // be a rounding error next to a geared character's life pool. Floor the
    // basic attack at a share of the player's max life (fades out by L50,
    // where the curve itself is strong enough).
    let damage = Math.round(def.baseDamage * dmgScale);
    try {
        const pMax = Number(globalThis.playerMaxHP) || 0;
        if (pMax > 0 && lvl < BOSS_DMG_FLOOR_FADE_TO) {
            const fade = lvl <= BOSS_DMG_FLOOR_FADE_FROM ? 1
                : 1 - (lvl - BOSS_DMG_FLOOR_FADE_FROM) / (BOSS_DMG_FLOOR_FADE_TO - BOSS_DMG_FLOOR_FADE_FROM);
            damage = Math.max(damage, Math.round(pMax * 0.13 * fade));
        }
    } catch (e) { /* floor is best-effort */ }

    const monster = {
        id: `${def.id}_${++globalThis._monsterSpawnCounter}`,
        baseId: def.id,
        artId: def.id, // bosses have no variants - always the base id
        artScale: 1, // bosses keep their fixed (large) frame size
        name: def.name,
        emoji: def.emoji,
        level: lvl,
        maxHP,
        currentHP: maxHP,
        chargeMax: _scaleBossChargeMax(def.chargeMax),
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
export function _bossEnrageMultiplier(monster) {
    return 1 + BOSS_SOFT_ENRAGE_DMG_STEP * (monster.enrageStacks || 0);
}


// Recomputes a boss's damageValue from its base damage, phase multiplier and
// soft-enrage stacks. Called on phase transitions and enrage stack ticks.
export function _bossRecalcDamage(monster) {
    const phaseData = monster.bossDef.phases[monster.bossPhase - 1];
    monster.damageValue = Math.round(
        monster.bossBaseDamage * phaseData.damageMultiplier * _bossEnrageMultiplier(monster)
    );
}


// Per-tick boss logic, called from _tickLoop every 100ms.
// Handles the soft-enrage damage stacking for all live bosses.
export function _bossTick() {
    if (typeof _isActive === 'function' && !_isActive()) return;

    const now = Date.now();
    let anyNewlyEnraged = false;
    globalThis._monsters.forEach(m => {
        if (!m.isBoss || !m.bossDef) return;

        if (!m.bossSpawnTime) m.bossSpawnTime = now;
        const elapsed = now - m.bossSpawnTime - BOSS_SOFT_ENRAGE_DELAY_MS;
        if (elapsed < 0) return;

        const targetStacks = Math.min(
            BOSS_SOFT_ENRAGE_MAX_STACKS,
            1 + Math.floor(elapsed / BOSS_SOFT_ENRAGE_INTERVAL_MS)
        );
        if (targetStacks > (m.enrageStacks || 0)) {
            m.enrageStacks = targetStacks;
            _bossRecalcDamage(m);
            anyNewlyEnraged = true;

            const card = document.getElementById(`sx-card-${m.id}`);
            const wrapper = card ? card.querySelector('.sx-emoji-wrapper') : null;
            if (wrapper) wrapper.classList.add('sx-boss-enraged');
            // One-shot red screen pulse (cosmetic, self-removing).
            try {
                const flash = document.createElement('div');
                flash.className = 'sx-rage-flash';
                document.body.appendChild(flash);
                setTimeout(() => { try { flash.remove(); } catch (e) {} }, 1400);
            } catch (e) { /* cosmetic */ }
        }
    });

    if (anyNewlyEnraged && typeof showCombatToast === 'function') {
        Audio_Manager.playSFX('boss_enrage');
        globalThis.showCombatToast(t('eg_boss_soft_enrage'));
    }
}


// Attaches boss runtime state to a newly spawned boss monster object
// and kicks off its phase 1 mechanics.
export function _bossInit(monster) {
    // Runtime monster ids are suffixed (e.g. "boss_null_7") - look the
    // mechanics entry up via the unsuffixed base id.
    const def = BOSS_MECHANICS[monster.baseId || monster.id];
    if (!def) return; // not all bosses need special mechanics

    monster.bossPhase = 1;
    monster.bossImmune = false;
    monster.bossDef = def;
    monster.bossBaseDamage = monster.damageValue; // store base so phases can scale it
    monster.bossSpawnTime = Date.now();
    monster.enrageStacks = 0;

    _bossTimers[monster.id] = [];
    // Persistent arena systems (such as The Firefly's lights) start before
    // scheduled mechanics, so they are present from the opening second.
    if (typeof def.onInit === 'function') {
        try { def.onInit(monster); } catch (e) { console.warn('Boss init hook failed:', monster.baseId, e); }
    }
    _bossScheduleMechanics(monster, 1);
}


// Teardown registry lives in ./boss-teardown-hooks.js (imported above).
// _bossCleanup + _validateAllBossHandlers read it from there.


// Cancels all mechanic timers for a specific boss and cleans up any
// active field effects it created (corrupted cells, veil, blackout).
export function _bossCleanup(monsterId) {
    const timers = _bossTimers[monsterId];
    if (timers) {
        timers.forEach(t => { clearTimeout(t); clearInterval(t); });
        delete _bossTimers[monsterId];
    }
    if (typeof _clearAllCorruptedCells === 'function') _clearAllCorruptedCells();
    if (typeof _clearPriorBombFuses === 'function') _clearPriorBombFuses();
    if (typeof _clearShiftGlows === 'function') _clearShiftGlows();
    if (typeof _clearAllFrozenCells === 'function') _clearAllFrozenCells();
    if (typeof _removeVeil === 'function') _removeVeil();
    if (typeof globalThis._removeBlackout === 'function') globalThis._removeBlackout();
    // Shadow-veiled row/column clues ('?') are timed puzzle effects with their
    // own expiry; if the boss dies first they would stay hidden into the loot
    // phase. Boss death ends them.
    if (typeof globalThis._clearAllPuzzleEffects === 'function') globalThis._clearAllPuzzleEffects();
    if (typeof _removeClueSwap === 'function') _removeClueSwap();
    if (typeof _removeGridInvert === 'function') _removeGridInvert();
    if (typeof globalThis._voidSurgeTeardown === 'function') globalThis._voidSurgeTeardown();
    if (typeof _blastTeardownAll === 'function') _blastTeardownAll();
    if (typeof window._crushTeardown === 'function') window._crushTeardown();
    if (typeof _clearFateMarks === 'function') _clearFateMarks();
    if (typeof _removeFogBank === 'function') _removeFogBank();
    if (typeof _removeClueScramble === 'function') _removeClueScramble();
    if (typeof _titheTeardown === 'function') _titheTeardown(monsterId);
    if (typeof _nkTeardownBoss === 'function') _nkTeardownBoss(monsterId);
    if (typeof globalThis._fireflyTeardown === 'function') globalThis._fireflyTeardown(monsterId);
    // The Snail: slimes + broom live outside nk runs - tear them down too.
    if (typeof globalThis._snailTeardown === 'function') globalThis._snailTeardown();
    // The Demolitionist: the Bomb Maze owns body-level state (countdown
    // overlay, banner, charge-bar freeze) while it runs - drop it with the
    // boss. Runs on boss death and on encounter stop via _bossCleanupAll.
    if (typeof globalThis._crashTeardown === 'function') globalThis._crashTeardown();
    // Per-boss field-effect teardowns - registry-driven (table in
    // ./boss-teardown-hooks.js; entries keep their own typeof guard).
    for (let i = 0; i < BOSS_TEARDOWN_HOOKS.length; i++) {
        const hook = BOSS_TEARDOWN_HOOKS[i];
        const matches = hook[2] ? monsterId === hook[0] : monsterId.startsWith(hook[0]);
        if (matches && typeof window[hook[1]] === 'function') window[hook[1]]();
    }
}


// Cleans up all tracked bosses at once. Called on encounter stop.
export function _bossCleanupAll() {
    Object.keys(_bossTimers).forEach(id => _bossCleanup(id));
}


// Determines which phase the boss should be in based on current HP%.
// Returns the target phase number (1-indexed).
export function _bossCalcTargetPhase(monster) {
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
export function _bossApplyPhaseStats(monster, newPhase) {
    const phaseData = monster.bossDef.phases[newPhase - 1];
    monster.bossPhase = newPhase;
    monster.bossImmune = true;
    monster.chargeMax = _scaleBossChargeMax(phaseData.chargeMax);

    // Active map run: re-apply the attack-speed mod, the raw phase value
    // just overwrote it.
    const spdPct = (typeof _egGetActiveMapModValue === 'function')
        ? _egGetActiveMapModValue('map_monster_speed') : 0;
    if (spdPct > 0 && monster.chargeMax > 0) {
        monster.chargeMax = Math.max(3, Math.ceil(monster.chargeMax / (1 + spdPct / 100)));
    }

    _bossRecalcDamage(monster);
}


// Cancels existing mechanic timers for a boss so they can be rescheduled
// at the new phase's speed when the immunity window expires.
export function _bossClearMechanicTimers(monster) {
    const timers = _bossTimers[monster.id] || [];
    timers.forEach(t => { clearTimeout(t); clearInterval(t); });
    _bossTimers[monster.id] = [];
}


// Plays the phase-change burst on the boss sprite: a flash, shockwave rings
// and flying sparks around it. The look steps up with the phase (amber ->
// red -> white-gold). The overlay removes itself.
function _bossPhaseBurst(card, newPhase) {
    const wrap = card.querySelector('.sx-emoji-wrapper') || card;
    const fx = document.createElement('div');
    fx.className = 'sx-boss-phase-fx sx-boss-phase-fx-' + Math.max(2, Math.min(4, newPhase));
    fx.innerHTML = '<i class="sx-bpf-flash"></i><i class="sx-bpf-ring"></i><i class="sx-bpf-ring sx-bpf-ring-2"></i>' +
        '<i class="sx-bpf-spark" style="--a:20deg"></i><i class="sx-bpf-spark" style="--a:90deg"></i>' +
        '<i class="sx-bpf-spark" style="--a:160deg"></i><i class="sx-bpf-spark" style="--a:230deg"></i>' +
        '<i class="sx-bpf-spark" style="--a:300deg"></i>';
    wrap.appendChild(fx);
    setTimeout(() => { try { fx.remove(); } catch (e) { /* card already gone */ } }, 1500);
}


// Plays the phase transition on the boss card: the card flash plus a burst
// effect on the sprite. No combat toast - the sprite says it.
export function _bossPlayTransitionFeedback(monster, newPhase) {
    const card = document.getElementById(`sx-card-${monster.id}`);
    if (card) {
        card.classList.add('sx-boss-transition');
        setTimeout(() => card.classList.remove('sx-boss-transition'), 1500);
        _bossPhaseBurst(card, newPhase);
    }
}


// Orchestrates a full boss phase transition:
//   1. Applies stat changes
//   2. Cancels old mechanic timers
//   3. Plays feedback (toast + card flash)
//   4. Waits for the immunity window, then re-schedules mechanics at new phase speed
export function _bossTransition(monster, newPhase) {
    _bossApplyPhaseStats(monster, newPhase);
    _bossClearMechanicTimers(monster);
    _bossPlayTransitionFeedback(monster, newPhase);
    Audio_Manager.playSFX('boss_phase_change');
    _renderPanel();

    // Optional per-boss phase-enter hook. A boss can define
    // `onPhaseEnter(monster, newPhase)` in its BOSS_MECHANICS entry to run
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
        if (!globalThis._monsters.find(m => m.id === monster.id)) return; // boss died mid-window
        monster.bossImmune = false;
        _bossScheduleMechanics(monster, newPhase);
        _renderPanel();
    }, monster.bossDef.immunityDuration);
}


// Checks whether a damage hit should trigger a phase transition and, if so, fires it.
// Called after every hit on a boss. No-op during existing immunity windows.
// Hearts dropped onto the grid as a boss falls through these health shares
// (one burst per threshold, per boss) - a breather in the long fights.
const BOSS_HEART_THRESHOLDS = [0.75, 0.5, 0.25];
const BOSS_HEARTS_PER_BURST = 2;
function _bossHeartBursts(monster) {
    if (!monster || !(monster.maxHP > 0) || !(monster.currentHP > 0)) return;
    const ratio = monster.currentHP / monster.maxHP;
    const given = monster._heartBursts || 0;
    let due = 0;
    while (given + due < BOSS_HEART_THRESHOLDS.length && ratio <= BOSS_HEART_THRESHOLDS[given + due]) due++;
    if (!due) return;
    monster._heartBursts = given + due;
    let placed = 0;
    for (let i = 0; i < due * BOSS_HEARTS_PER_BURST; i++) {
        if (_dropHeartPickup({ ignoreCap: true })) placed++;
    }
    if (placed > 0) globalThis.showCombatToast(t('eg_boss_hearts_spawned'), '#f9a8d4');
}

export function _bossCheckPhase(monster) {
    _bossHeartBursts(monster);
    if (!monster.bossDef || monster.bossImmune) return;

    const targetPhase = _bossCalcTargetPhase(monster);
    if (targetPhase > monster.bossPhase) {
        _bossTransition(monster, targetPhase);
    }
}


// Returns the delay (ms) for the next trigger of a mechanic at the given phase.
// Higher phases reduce the interval by 20% per phase above 1, capped at 5s minimum.
export function _calcMechanicInterval(mech, phase) {
    const speedFactor = 1 - (phase - 1) * 0.20;
    const rawInterval = mech.intervalBase
        + (Math.random() * mech.intervalVariance - mech.intervalVariance / 2);
    return Math.max(5000, rawInterval * speedFactor);
}


// Bosses whose mechanics already play bespoke sounds (see their boss-*.js).
const BOSSES_WITH_OWN_SFX = /^boss_(bumper|centipede|clock|coil|dancer|gale|gambler|gourmet|lodestone|puddle|sprout|stack|striker|tactician|thwomp|gust|marksman)/;

// Mechanic → activation-sting category. Shared mechanics (used by 2+ bosses)
// are mapped explicitly; boss-unique names fall back to a keyword heuristic
// (most one-off moves are hazard-style attacks).
export const _MECH_CATEGORY = {
    corrupt_cells: 'grid', prior_bomb: 'grid', probability_shift: 'grid',
    fated_cell: 'grid', frozen_cells: 'grid', clue_scramble: 'grid',
    clue_swap: 'grid', grid_invert: 'grid',
    fog_bank: 'hazard', soul_tithe: 'hazard',
    prior_summons: 'summon', sacrificial_zombies: 'summon',
};

// Resolves any mechanic name to a category so the activation sting's pitch
// identifies the mechanic TYPE by ear: grid-affecting (mid) vs hazard (low)
// vs summon (high). Uncategorized names return undefined → generic sting.
export function _bossMechCategory(name) {
    if (_MECH_CATEGORY[name]) return _MECH_CATEGORY[name];
    if (/clue|grid|cell|invert|pattern|thread/.test(name)) return 'grid';
    if (/summon|sprout|wisp|seek|ghost|guard|dive/.test(name)) return 'summon';
    return 'hazard';
}


// Schedules a single mechanic for the given boss at the given phase.
// Self-reschedules after each trigger so the mechanic keeps firing until the boss dies.
export function _bossScheduleSingleMechanic(monster, mech, phase) {
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
        const stillAlive = _isActive() && globalThis._monsters.find(m => m.id === monster.id);
        if (stillAlive && !monster.bossImmune) {
            const fn = window[mech.handler];
            if (typeof fn === 'function') {
                // Generic activation cue for bosses that have no sounds of
                // their own yet; bosses with bespoke sounds play those in-handler.
                if (!BOSSES_WITH_OWN_SFX.test(String(monster.id || ''))) {
                    const cat = _bossMechCategory(String(mech.name || ''));
                    Audio_Manager.playSFX(cat === 'summon' ? 'boss_summon_adds'
                        : cat === 'grid' ? 'grid_scramble' : 'boss_telegraph_warn');
                }
                // Cosmetic cue for the boss-rig animations (js/combat/boss-rig-anim.js).
                // Fire-and-forget: a listener error must never block the mechanic.
                try {
                    document.dispatchEvent(new CustomEvent('sx-boss-mechanic', {
                        detail: { monsterId: monster.id, mech: mech.name, phase },
                    }));
                } catch (e) { /* cosmetic only */ }
                fn(monster, phase);
            }
        }
        scheduleNext();
    };

    const scheduleNext = () => {
        // Bail out if the encounter ended or this boss is already dead
        if (!_isActive() || !globalThis._monsters.find(m => m.id === monster.id)) return;

        const interval = _calcMechanicInterval(mech, phase);
        const t = setTimeout(fireTrigger, interval);
        if (_bossTimers[monster.id]) _bossTimers[monster.id].push(t);
    };

    // The FIRST trigger fires after a short opening delay instead of waiting out
    // a full interval, so a fresh boss - or a fresh phase - starts using its
    // specials a few seconds after arriving. The random spread just staggers a
    // multi-mechanic boss so its abilities don't all fire simultaneously on spawn;
    // every later trigger keeps the full per-mechanic interval above.
    const initialDelay = 3000 + Math.random() * 5000;
    const t0 = setTimeout(fireTrigger, initialDelay);
    if (_bossTimers[monster.id]) _bossTimers[monster.id].push(t0);
}


// Schedules all mechanics defined for a boss at the given phase.
// Called on boss spawn (phase 1) and again after each phase transition.
export function _bossScheduleMechanics(monster, phase) {
    const def = monster.bossDef;
    if (!def) return;
    def.mechanics.forEach(mech => _bossScheduleSingleMechanic(monster, mech, phase));
}


// Sweeps every registered boss and warns about mechanic handler names that
// do not resolve to a global function. Called once after all boss files
// have loaded (end of boss-rosters.js) so a typo'd handler string can
// never silently disable a mechanic. Dispatch happens via
// window[mech.handler] in _bossScheduleSingleMechanic, so every handler
// must be a top-level function declaration.
export function _validateAllBossHandlers() {
    const missing = [];
    Object.keys(BOSS_MECHANICS).forEach(bossId => {
        const def = BOSS_MECHANICS[bossId];
        (def.mechanics || []).forEach(mech => {
            if (mech.handler && typeof window[mech.handler] !== 'function') {
                missing.push(`${bossId}: ${mech.handler} (${mech.name || 'unnamed mechanic'})`);
            }
        });
    });
    // Teardown hooks are dispatched via window[name] in _bossCleanup.
    BOSS_TEARDOWN_HOOKS.forEach(hook => {
        if (typeof window[hook[1]] !== 'function') {
            missing.push(`${hook[0]}: teardown ${hook[1]}`);
        }
    });
    if (missing.length) {
        console.warn(`[boss-framework] ${missing.length} mechanic handler(s) do not resolve to a global function:`, missing.join(', '));
    }
}
