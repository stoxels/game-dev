//------------------------------------------------------------------------
//-------------------CONSTANTS & DATA DEFINITIONS-------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


// Boss level scaling 
// Applied per level above 1. 
const EG_BOSS_LEVEL_HP_SCALE = 0.15; // +15% HP per level above 1
const EG_BOSS_LEVEL_DAMAGE_SCALE = 0.12; // +12% damage per level above 1




//------------------------------------------------------------------------
//----------------------BOSS DEFINITIONS----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------



// baseHP / baseDamage are level-1 values.
// chargeMax (seconds to fill the attack bar) does NOT scale with level.
// isBoss: true entries are only spawned via cur.hasBoss / cur.bosses.

const EG_BOSS_DEFS = {

    // BOSSES — spawned only via cur.hasBoss / cur.bosses
    boss_null: {
        id: 'boss_null', name: 'The Null', emoji: '🧿',
        baseHP: 600, baseDamage: 20, chargeMax: 15,
        element: 'shadow', resistances: { fire: 15, cold: 15, lightning: 15, shadow: 30 }
    },
    boss_bayes: {
        id: 'boss_bayes', name: 'Bayes', emoji: '🔮',
        baseHP: 800, baseDamage: 15, chargeMax: 12,
        element: 'lightning', resistances: { fire: 15, cold: 15, lightning: 30, shadow: 15 }
    },
};






//------------------------------------------------------------------------
//----------------------BOSS FACTORY--------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns the scaled stats for a boss at the given level.
// Accepts either a string id (looks up EG_BOSS_DEFS) or a def object directly.
function _egBuildBoss(defOrId, level = 1) {
    const def = (typeof defOrId === 'string') ? EG_BOSS_DEFS[defOrId] : defOrId;
    if (!def) { console.warn('Unknown Boss id:', defOrId); return null; }

    const lvl = Math.max(1, level);
    const hpScale = 1 + EG_BOSS_LEVEL_HP_SCALE * (lvl - 1);
    const dmgScale = 1 + EG_BOSS_LEVEL_DAMAGE_SCALE * (lvl - 1);

    const maxHP = Math.round(def.baseHP * hpScale);
    const damage = Math.round(def.baseDamage * dmgScale);

    const monster = {
        id: `${def.id}_${++_egMonsterSpawnCounter}`,
        name: def.name,
        emoji: def.emoji,
        level: lvl,
        maxHP,
        currentHP: maxHP,
        chargeMax: def.chargeMax,
        currentCharge: 0,
        damageValue: damage,
        element: def.element || null,
        resistances: def.resistances || null
    };

    // Active map run: apply the rolled monster-strengthening mods.
    if (typeof _egApplyMapModsToMonster === 'function') _egApplyMapModsToMonster(monster);

    return monster;
}





//------------------------------------------------------------------------
//-------------------BOSS ENGINE------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Hook called from _egTickLoop every 10Hz.
// Currently a no-op — exists as an extension point for future per-tick boss logic.
function _egBossTick() {
    // Nothing needed here yet.
}

// Attaches boss runtime state to a newly spawned boss monster object
// and kicks off its phase 1 mechanics.
function _egBossInit(monster) {
    const def = EG_BOSS_MECHANICS[monster.id];
    if (!def) return; // not all bosses need special mechanics

    monster.bossPhase = 1;
    monster.bossImmune = false;
    monster.bossDef = def;
    monster.bossBaseDamage = monster.damageValue; // store base so phases can scale it

    _egBossTimers[monster.id] = [];
    _egBossScheduleMechanics(monster, 1);
}

// Cancels all mechanic timers for a specific boss and cleans up any
// active field effects it created (corrupted cells, veil, blackout).
function _egBossCleanup(monsterId) {
    const timers = _egBossTimers[monsterId];
    if (timers) {
        timers.forEach(t => { clearTimeout(t); clearInterval(t); });
        delete _egBossTimers[monsterId];
    }
    _egClearAllCorruptedCells();
    _egRemoveVeil();
    _egRemoveBlackout();
    _egVoidSurgeTeardown();
}

// Cleans up all tracked bosses at once. Called on encounter stop.
function _egBossCleanupAll() {
    Object.keys(_egBossTimers).forEach(id => _egBossCleanup(id));
}


//------------------------------------------------------------------------
//-------------------BOSS PHASE TRANSITIONS-------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Determines which phase the boss should be in based on current HP%.
// Returns the target phase number (1-indexed).
function _egBossCalcTargetPhase(monster) {
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
function _egBossApplyPhaseStats(monster, newPhase) {
    const phaseData = monster.bossDef.phases[newPhase - 1];
    monster.bossPhase = newPhase;
    monster.bossImmune = true;
    monster.chargeMax = phaseData.chargeMax;

    // Active map run: re-apply the attack-speed mod, the raw phase value
    // just overwrote it.
    const spdPct = (typeof _egGetActiveMapModValue === 'function')
        ? _egGetActiveMapModValue('map_monster_speed') : 0;
    if (spdPct > 0 && monster.chargeMax > 0) {
        monster.chargeMax = Math.max(3, Math.ceil(monster.chargeMax / (1 + spdPct / 100)));
    }

    monster.damageValue = Math.round(monster.bossBaseDamage * phaseData.damageMultiplier);
}

// Cancels existing mechanic timers for a boss so they can be rescheduled
// at the new phase's speed when the immunity window expires.
function _egBossClearMechanicTimers(monster) {
    const timers = _egBossTimers[monster.id] || [];
    timers.forEach(t => { clearTimeout(t); clearInterval(t); });
    _egBossTimers[monster.id] = [];
}

// Shows the phase transition toast and triggers the transition CSS animation on the card.
function _egBossPlayTransitionFeedback(monster, newPhase) {
    const label = EG_BOSS_PHASE_NAMES[newPhase] ? t(EG_BOSS_PHASE_NAMES[newPhase]) : t('eg_phase_badge').replace('{n}', newPhase);
    showToast(`⚡ ${monster.name}: ${label}!`);

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
function _egBossTransition(monster, newPhase) {
    _egBossApplyPhaseStats(monster, newPhase);
    _egBossClearMechanicTimers(monster);
    _egBossPlayTransitionFeedback(monster, newPhase);
    _egRenderPanel();

    setTimeout(() => {
        monster.bossImmune = false;
        _egBossScheduleMechanics(monster, newPhase);
        _egRenderPanel();
    }, monster.bossDef.immunityDuration);
}

// Checks whether a damage hit should trigger a phase transition and, if so, fires it.
// Called after every hit on a boss. No-op during existing immunity windows.
function _egBossCheckPhase(monster) {
    if (!monster.bossDef || monster.bossImmune) return;

    const targetPhase = _egBossCalcTargetPhase(monster);
    if (targetPhase > monster.bossPhase) {
        _egBossTransition(monster, targetPhase);
    }
}
