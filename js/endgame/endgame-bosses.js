//------------------------------------------------------------------------
//-------------------CONSTANTS & DATA DEFINITIONS-------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


// Boss level scaling 
// Applied per level above 1. 
const EG_BOSS_LEVEL_HP_SCALE = 0.28; // +28% HP per level above 1 — retuned after the
                                     // global gear-damage buff (~x2) so boss stays a real fight
const EG_BOSS_LEVEL_DAMAGE_SCALE = 0.12; // +12% damage per level above 1

// ── Late-endgame HP explosion ────────────────────────────────────────────
// Linear 28% alone is not enough to outrun late gear scaling — bosses at
// L85+ die in seconds on well-geared characters (player DPS roughly doubles
// every ~30 levels from weapon + phys/power creep). A convex multiplier
// on top of the linear curve keeps early bosses (≈L1-40) almost unchanged
// but massively inflates HP towards the true endgame (T13-T16, L71-90).
// Anchors: 1→1.0, 50→1.15, 60→1.7, 75→3.0, 85→4.8, 90→6.0, 95→7.2
// Result at L87 (T15): ~5.2× the old linear HP (~135k vs ~26k for a 1k base).
const EG_BOSS_LATE_HP_ANCHORS = [[1,1.0],[50,1.15],[60,1.7],[75,3.0],[85,4.8],[90,6.0],[95,7.2]];
function _egGetBossLateHpMult(lvl) {
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
const EG_BOSS_SOFT_ENRAGE_DELAY_MS = 150000;   // grace period before stacks begin (2.5 min)
const EG_BOSS_SOFT_ENRAGE_INTERVAL_MS = 30000; // a new stack every 30s after the delay
const EG_BOSS_SOFT_ENRAGE_DMG_STEP = 0.08;     // +8% damage per stack
const EG_BOSS_SOFT_ENRAGE_MAX_STACKS = 10;     // hard cap: +80% damage




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
        baseHP: 900, baseDamage: 26, chargeMax: 15,
        element: 'shadow', resistances: { fire: 15, cold: 15, lightning: 15, shadow: 30 }
    },
    boss_bayes: {
        id: 'boss_bayes', name: 'Bayes', emoji: '🔮',
        baseHP: 1100, baseDamage: 20, chargeMax: 12,
        element: 'lightning', resistances: { fire: 15, cold: 15, lightning: 30, shadow: 15 }
    },
    boss_entropy: {
        id: 'boss_entropy', name: 'Entropy', emoji: '♾️',
        baseHP: 1000, baseDamage: 22, chargeMax: 13,
        element: 'cold', resistances: { fire: 15, cold: 30, lightning: 15, shadow: 15 }
    },
    boss_laplace: {
        id: 'boss_laplace', name: "Laplace's Demon", emoji: '👁️',
        baseHP: 950, baseDamage: 24, chargeMax: 11,
        element: 'fire', resistances: { fire: 30, cold: 15, lightning: 15, shadow: 15 }
    },
    boss_overfitter: {
        id: 'boss_overfitter', name: 'The Overfitter', emoji: '📈',
        baseHP: 1050, baseDamage: 23, chargeMax: 12,
        element: 'shadow', resistances: { fire: 15, cold: 15, lightning: 15, shadow: 30 }
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
    const baseHpScale = 1 + EG_BOSS_LEVEL_HP_SCALE * (lvl - 1);
    const lateMult = (typeof _egGetBossLateHpMult === 'function') ? _egGetBossLateHpMult(lvl) : 1;
    const hpScale = baseHpScale * lateMult;
    const dmgScale = 1 + EG_BOSS_LEVEL_DAMAGE_SCALE * (lvl - 1);

    const maxHP = Math.round(def.baseHP * hpScale);
    const damage = Math.round(def.baseDamage * dmgScale);

    const monster = {
        id: `${def.id}_${++_egMonsterSpawnCounter}`,
        baseId: def.id, // unsuffixed def id — used for EG_BOSS_MECHANICS lookups
        name: def.name,
        emoji: def.emoji,
        level: lvl,
        maxHP,
        currentHP: maxHP,
        chargeMax: def.chargeMax,
        currentCharge: 0,
        damageValue: damage,
        element: def.element || null,
        resistances: def.resistances || null,
        isBoss: true
    };

    // Active map run: apply the rolled monster-strengthening mods.
    if (typeof _egApplyMapModsToMonster === 'function') _egApplyMapModsToMonster(monster);

    return monster;
}





//------------------------------------------------------------------------
//-------------------BOSS ENGINE------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns the current soft-enrage damage multiplier for a boss (1.0 if none).
function _egBossEnrageMultiplier(monster) {
    return 1 + EG_BOSS_SOFT_ENRAGE_DMG_STEP * (monster.enrageStacks || 0);
}

// Recomputes a boss's damageValue from its base damage, phase multiplier and
// soft-enrage stacks. Called on phase transitions and enrage stack ticks.
function _egBossRecalcDamage(monster) {
    const phaseData = monster.bossDef.phases[monster.bossPhase - 1];
    monster.damageValue = Math.round(
        monster.bossBaseDamage * phaseData.damageMultiplier * _egBossEnrageMultiplier(monster)
    );
}

// Per-tick boss logic, called from _egTickLoop every 100ms.
// Handles the soft-enrage damage stacking for all live bosses.
function _egBossTick() {
    if (typeof _egIsActive === 'function' && !_egIsActive()) return;

    const now = Date.now();
    let anyNewlyEnraged = false;
    _egMonsters.forEach(m => {
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
        showToast(t('eg_boss_soft_enrage'));
    }
}

// Attaches boss runtime state to a newly spawned boss monster object
// and kicks off its phase 1 mechanics.
function _egBossInit(monster) {
    // Runtime monster ids are suffixed (e.g. "boss_null_7") — look the
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
    _egClearAllFrozenCells();
    _egRemoveVeil();
    _egRemoveBlackout();
    _egRemoveClueSwap();
    _egRemoveGridInvert();
    _egVoidSurgeTeardown();
    if (typeof _egBlastTeardownAll === 'function') _egBlastTeardownAll();
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

    _egBossRecalcDamage(monster);
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
