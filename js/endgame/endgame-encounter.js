//------------------------------------------------------------------------
// PHASE 4 split (2026-09-16): extracted into a focused module. The original
// path is now a facade that re-exports this module, so existing import sites
// are unaffected. See MIGRATION.md "splitting giants".
//------------------------------------------------------------------------

// ENDGAME ENCOUNTER - facade module. The real-time combat overlay:
// monster panel rendering, damage numbers, hit bursts, flash cards and
// bar updates live here; spawning, attacks, gear procs, targeting, damage
// and kill handling live in the focused encounter-* modules, all
// re-exported below unchanged (public surface preserved).

import { t } from '../translation/translations.js';
import { EG_DAMAGE_NUMBER_DURATION_MS, EG_IMMUNE_FLASH_DURATION_MS, EG_IMMUNE_LABEL_DURATION_MS, EG_MONSTER_ZONES } from './encounter-constants.js';
import { _egGetDominantElement } from './encounter-damage.js';
import { _egRenderMonsterStatusStrip } from './endgame-ailments.js';
import { EG_ART } from './endgame-art.js';
import { _egRoamShouldRoam, _egRoamSync, _egRoamTeardown } from './endgame-monster-roam.js';
import { _egIsActive } from './endgame-state.js';



//------------------------------------------------------------------------
//-------------------VISUAL EFFECTS---------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Appends a floating "-N" damage number to the monster's card that fades out.
// `isCrit` and `elements` drive the RPG pop: crits are bigger/gold, elemental
// dominance tints the number and its glow (shadow/fire/cold/lightning).
export function _egShowDamageNumber(monsterId, amount, isCrit, elements) {
    const card = document.getElementById(`eg-card-${monsterId}`);
    if (!card) return;

    const dmgText = document.createElement('div');
    const domEl = (typeof _egGetDominantElement === 'function') ? _egGetDominantElement(elements) : 'physical';
    let cls = 'eg-damage-number';
    if (domEl && domEl !== 'physical') cls += ' eg-dmg-' + domEl;
    else cls += ' eg-dmg-physical';
    if (isCrit) cls += ' eg-dmg-crit';
    else if (amount != null && amount > 0 && amount < 8) cls += ' eg-dmg-small';
    dmgText.className = cls;
    dmgText.textContent = `-${amount}`;
    // random horizontal jitter + tiny vertical stagger so rapid hits fan out
    dmgText.style.marginLeft = `${(Math.random() * 18 - 9).toFixed(1)}px`;
    dmgText.style.marginTop = `${(Math.random() * 6 - 3).toFixed(1)}px`;
    card.appendChild(dmgText);
    // crit numbers linger a touch longer
    setTimeout(() => dmgText.remove(), isCrit ? EG_DAMAGE_NUMBER_DURATION_MS + 180 : EG_DAMAGE_NUMBER_DURATION_MS);
}

// Removes and re-adds a CSS flash class to force the animation to restart.
// Works for any flash class on any card element.
export function _egRestartFlashClass(card, cssClass) {
    card.classList.remove(cssClass);
    void card.offsetWidth; // force reflow so the CSS animation restarts
    card.classList.add(cssClass);
}

// Triggers the damage flash CSS animation on the monster's card.
export function _egFlashDamageCard(monsterId) {
    const card = document.getElementById(`eg-card-${monsterId}`);
    if (!card) return;
    _egRestartFlashClass(card, 'eg-flash-damage');
}

// Adds the kill flash class to the monster's card (plays the death animation).
export function _egFlashKillCard(monsterId) {
    const card = document.getElementById(`eg-card-${monsterId}`);
    if (card) card.classList.add('eg-flash-kill');
}

// Shows the IMMUNE label and flashes the immunity animation on the monster's card.
export function _egFlashImmune(monsterId) {
    const card = document.getElementById(`eg-card-${monsterId}`);
    if (!card) return;

    _egRestartFlashClass(card, 'eg-flash-immune');
    setTimeout(() => card.classList.remove('eg-flash-immune'), EG_IMMUNE_FLASH_DURATION_MS);

    const label = document.createElement('div');
    label.className = 'eg-damage-number eg-immune-label';
    label.textContent = t('eg_immune');
    card.appendChild(label);
    setTimeout(() => label.remove(), EG_IMMUNE_LABEL_DURATION_MS);
}

// Particle colour per damage element (falls back to white for physical).
export const EG_HIT_ELEMENT_COLORS = {
    physical: '#ffffff',
    fire: '#ff6b35',
    cold: '#4fc3f7',
    lightning: '#ffe066',
    shadow: '#b06bff'
};

export const EG_HIT_BURST_SPARK_COUNT = 14;
export const EG_HIT_BURST_DURATION_MS = 750;

// Spawns a short spark burst + expanding shockwave ring at the monster's
// card centre when damage lands. Both melee strikes and projectiles funnel
// through _egDamageTargetById, so this fires for every player hit.
// `elements` optionally maps each element to its share of the hit; the
// dominant element picks the burst colour. `isCrit` enlarges the burst.
export function _egSpawnHitBurst(monsterId, elements, isCrit) {
    const card = document.getElementById(`eg-card-${monsterId}`);
    if (!card) return;

    let color = EG_HIT_ELEMENT_COLORS.physical;
    if (elements) {
        let best = null;
        Object.keys(elements).forEach(el => {
            if (EG_HIT_ELEMENT_COLORS[el] && (!best || elements[el] > elements[best])) best = el;
        });
        if (best) color = EG_HIT_ELEMENT_COLORS[best];
    }

    const rect = card.getBoundingClientRect();
    const burst = document.createElement('div');
    burst.className = 'eg-hit-burst';
    burst.style.left = `${rect.left + rect.width / 2}px`;
    burst.style.top = `${rect.top + rect.height / 2}px`;

    // Expanding shockwave ring
    const ring = document.createElement('div');
    ring.className = 'eg-hit-ring';
    ring.style.setProperty('--eg-hit-color', color);
    burst.appendChild(ring);

    if (isCrit) {
        // Crit: bigger, brighter ring
        ring.style.transform = 'scale(1.35)';
        ring.style.borderWidth = '4px';
        ring.style.filter = 'brightness(1.5)';
    }

    // Outward-flying sparks in a ring with slight random jitter
    const sparkCount = isCrit ? EG_HIT_BURST_SPARK_COUNT + 8 : EG_HIT_BURST_SPARK_COUNT;
    for (let i = 0; i < sparkCount; i++) {
        const spark = document.createElement('div');
        spark.className = 'eg-hit-spark';
        const angle = (Math.PI * 2 * i) / sparkCount + Math.random() * 0.5;
        const dist = isCrit ? 52 + Math.random() * 36 : 40 + Math.random() * 30;
        spark.style.setProperty('--eg-hit-color', color);
        spark.style.setProperty('--spark-dx', `${(Math.cos(angle) * dist).toFixed(1)}px`);
        spark.style.setProperty('--spark-dy', `${(Math.sin(angle) * dist).toFixed(1)}px`);
        if (isCrit) spark.style.width = '10px';
        if (isCrit) spark.style.height = '10px';
        if (isCrit) spark.style.marginLeft = '-5px';
        if (isCrit) spark.style.marginTop = '-5px';
        burst.appendChild(spark);
    }

    document.body.appendChild(burst);
    setTimeout(() => burst.remove(), isCrit ? EG_HIT_BURST_DURATION_MS + 150 : EG_HIT_BURST_DURATION_MS);
}


//------------------------------------------------------------------------
//-------------------RENDER-----------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns the CSS class for an HP bar based on the percentage remaining.
export function _egHpBarClass(hpPct) {
    if (hpPct > 60) return 'eg-hp-high';
    if (hpPct > 30) return 'eg-hp-mid';
    return 'eg-hp-low';
}

// Builds the badge HTML for a monster's name row (level, boss phase, immune, target).
// NOTE: _egBuildMonsterBadgesHTML is kept for any external callers.
export function _egBuildMonsterBadgesHTML(m, isTarget) {
    let html = `<span class="eg-level-badge">${t('eg_lv_badge').replace('{n}', m.level)}</span>`;
    if (m.isBoss && m.bossPhase)
        html += `<span class="eg-boss-phase-badge eg-boss-phase-${m.bossPhase}">${t('eg_phase_badge').replace('{n}', m.bossPhase)}</span>`;
    if (m.bossImmune)
        html += `<span class="eg-boss-immune-badge">${t('eg_immune')}</span>`;
    if (isTarget)
        html += `<span class="eg-target-badge">${t('eg_target_badge')}</span>`;
    return html;
}

// Calculates HP and charge percentages clamped to [0, 100] for a given monster.
export function _egCalcBarPercentages(m) {
    return {
        hpPct: Math.max(0, Math.round((m.currentHP / m.maxHP) * 100)),
        chargePct: Math.min(100, Math.max(0, (m.currentCharge / m.chargeMax) * 100)),
    };
}

// Builds the compact emoji card HTML for a single monster.
export function _egBuildMonsterCardHTML(m) {
    const { hpPct, chargePct } = _egCalcBarPercentages(m);
    const isTarget = (m.id === globalThis._egTargetId);
    const bossCls = m.isBoss ? ' eg-boss-card' : '';
    const targetedCls = isTarget ? ' eg-card-targeted' : '';

    return `
    <div class="eg-monster-card-compact${bossCls}${targetedCls}" id="eg-card-${m.id}" onclick="_egSelectTarget('${m.id}')" style="--eg-art:${m.artScale || 1}">
        <!-- Bars stacked top-to-bottom: Charge bar then HP bar above the icon -->
        <div class="eg-compact-bars">
            <div class="eg-charge-track-compact">
                <div class="eg-charge-bar" id="eg-charge-bar-${m.id}" style="width:${chargePct}%"></div>
            </div>
            <div class="eg-hp-track-compact">
                <div class="eg-hp-bar-compact ${_egHpBarClass(hpPct)}" id="eg-hp-bar-${m.id}" style="width:${hpPct}%"></div>
            </div>
        </div>

        <!-- Elemental ailment icons (ignite/chill/frozen/shocked/shadowburn) -->
        <div class="eg-status-strip" id="eg-status-${m.id}"></div>

        <!-- Emoji icon with level badge and hover tooltip -->
        <div class="eg-emoji-wrapper${m.isBoss ? ' eg-boss-emoji-wrapper' : ''}${(m.enrageStacks || 0) > 0 ? ' eg-boss-enraged' : ''} ${isTarget ? 'eg-compact-targeted' : ''}">
            ${m.isBoss ? '<span class="eg-boss-crown">👑</span>' : ''}
            <span class="eg-monster-emoji-compact${m.isBoss ? ' eg-boss-emoji' : ''}">${EG_ART.html('monster', m.artId || m.baseId, m.emoji)}</span>
            <span class="eg-level-bottom-left">${m.level}</span>

            <div class="eg-monster-compact-tooltip">
                <div class="eg-tooltip-name">${m.name}</div>
                <div class="eg-tooltip-hp" id="eg-hp-label-${m.id}">${m.currentHP} / ${m.maxHP} HP</div>
            </div>
        </div>

    </div>`;
}





// Updates the HP bar, charge bar, and HP label for a single monster.
// Cheap DOM update used by the 10Hz tick loop - no full rebuild.
export function _egUpdateMonsterBars(m) {
    const { hpPct, chargePct } = _egCalcBarPercentages(m);

    const hpBar = document.getElementById(`eg-hp-bar-${m.id}`);
    const chargeBar = document.getElementById(`eg-charge-bar-${m.id}`);
    const hpLabel = document.getElementById(`eg-hp-label-${m.id}`);

    if (hpBar) {
        hpBar.style.width = hpPct + '%';
        hpBar.className = `eg-hp-bar-compact ${_egHpBarClass(hpPct)}`;
    }
    if (chargeBar) {
        chargeBar.style.width = chargePct + '%';
        // Danger glow when the attack is about to fire (>75% charged) - matches RPG pop
        if (chargePct >= 75) chargeBar.classList.add('eg-charge-danger');
        else chargeBar.classList.remove('eg-charge-danger');
    }
    if (hpLabel) hpLabel.textContent = `${m.currentHP} / ${m.maxHP} HP`;

    // Elemental ailment icon strip (only rebuilds when statuses change)
    if (typeof _egRenderMonsterStatusStrip === 'function') _egRenderMonsterStatusStrip(m);
}

// High-frequency bar update (10Hz). Only touches bar widths and HP text -
// no DOM rebuilds. Keeps the tick loop cheap.
export function _egUpdateBars() {
    if (!_egIsActive()) return;
    globalThis._egMonsters.forEach(_egUpdateMonsterBars);
}

// Clears all monster zone elements and hides the wrapper.
export function _egHideMonsterPanel() {
    EG_MONSTER_ZONES.forEach(zone => {
        const el = document.getElementById(zone);
        if (el) el.innerHTML = '';
    });
    // Legacy roam layer cleanup (encounter over).
    if (typeof _egRoamTeardown === 'function') {
        try { _egRoamTeardown(); } catch (e) {}
    }
    const wrapper = document.getElementById('eg-monster-wrapper');
    if (wrapper) wrapper.classList.add('eg-hidden');
}

// Clears the HTML content of every monster zone panel.
export function _egClearAllZones() {
    EG_MONSTER_ZONES.forEach(zone => {
        const el = document.getElementById(zone);
        if (el) el.innerHTML = '';
    });
}

// Renders each monster's card into its assigned zone panel.
// Uses += so multiple monsters assigned to the same zone stack correctly.
// Monsters hold ground here - the old perimeter patrol is disabled, so every
// normal monster renders in its static panel. Only Brutus zombies / Dynamo
// conductors (own layers) and the legacy roam hook skip panels.
export function _egRenderMonstersIntoZones() {
    globalThis._egMonsters.forEach(m => {
        // Brutus's sacrificial zombies render as roaming cards in the fixed
        // #eg-zombie-layer, not in the static monster panel.
        if (m.isSacrificialZombie) return;
        // The Dynamo's Lightning Conductors render as roaming cards in the
        // fixed #eg-dynamo-layer (beam-network anchors must stay at their
        // spawn spots) - never in the static monster panel.
        if (m.isDynamoConductor) return;
        // Legacy patrol hook (always false now): normal monsters stay put.
        // Occasional melee sidesteps (endgame-monster-roam.js) just change
        // zoneId and re-render here - no separate layer.
        if (typeof _egRoamShouldRoam === 'function' && _egRoamShouldRoam(m)) return;
        const zoneEl = document.getElementById(m.zoneId || 'eg-monster-panel');
        if (zoneEl) zoneEl.innerHTML += _egBuildMonsterCardHTML(m);
    });
}

// Full panel rebuild. Only called on spawn, death, or target change -
// never from the tick loop.
export function _egRenderPanel() {
    const wrapper = document.getElementById('eg-monster-wrapper');

    if (!_egIsActive()) {
        _egClearAllZones();
        if (wrapper) wrapper.classList.add('eg-hidden');
        return;
    }

    if (wrapper) wrapper.classList.remove('eg-hidden');

    _egClearAllZones();
    _egRenderMonstersIntoZones();
    // Legacy patrol cleanup (clears the old #eg-roam-layer if present).
    if (typeof _egRoamSync === 'function') {
        try { _egRoamSync(); } catch (e) {}
    }
}

// ---- re-exports from the focused split modules (public surface preserved) ----

export {
    EG_BLOCK_LOCKOUT_BASE_MS,
    EG_BOSS_SPAWN_DELAY_MS,
    EG_DAMAGE_NUMBER_DURATION_MS,
    EG_DEFAULT_MONSTER_CAP,
    EG_DEFLECT_BASE_DMG_PCT,
    EG_DEFLECT_BASE_PCT,
    EG_IMMUNE_FLASH_DURATION_MS,
    EG_IMMUNE_LABEL_DURATION_MS,
    EG_INITIAL_SPAWN_STAGGER_BASE_MS,
    EG_MELEE_ANIM_DURATION_MS,
    EG_MONSTER_PROJ_DURATION_MS,
    EG_MONSTER_ZONES,
    EG_PANEL_RERENDER_DELAY_MS,
    EG_PARRY_BASE_PCT,
    EG_PLAYER_DAMAGE_NUMBER_DURATION_MS,
    EG_PLAYER_HIT_FLASH_MS,
    EG_RESPAWN_DELAY_MIN_MS,
    EG_RESPAWN_DELAY_RANGE_MS,
    _egGetDefaultMonsterCap,
    _egGetRespawnDelayMs,
} from './encounter-constants.js';

export {
    EG_CAMPAIGN_MONSTER_CONFIG,
    EG_CAMPAIGN_STAMPED_FIELDS,
    EG_EARLY_VARIANCE_FREE_LEVEL,
    EG_INITIAL_SPAWN_STAGGER_STEP_MS,
    EG_MONSTER_VARIANCE_DOWN,
    EG_MONSTER_VARIANCE_UP_MAX,
    EG_MONSTER_VARIANCE_UP_MIN,
    _egBuildBossSpawnList,
    _egBuildBossSpawnListFromDef,
    _egBuildCampaignMonsterList,
    _egBuildFixedBossList,
    _egBuildFixedNormalList,
    _egBuildNormalSpawnList,
    _egBuildRandomBossList,
    _egBuildRandomNormalList,
    _egBuildSpawnList,
    _egCalcSpawnDelay,
    _egCategorizeMonsterTier,
    _egCountSolutionCells,
    _egGetEncounterBaseLevel,
    _egIsPuzzleSolved,
    _egPickWeightedMonster,
    _egPrepareCampaignEncounter,
    _egRespawnRandomMonster,
    _egRollMonsterLevel,
    _egScheduleMonsterSpawns,
    _egScheduleRespawn,
    _egShouldSuppressRespawn,
} from './encounter-spawn-rules.js';

export {
    EG_LIFE_REGEN_INTERVAL_MS,
    EG_STAGGER_DURATION_MS,
    _egAttachBossStylesheet,
    _egCancelSpawnTimers,
    _egFlashMonsterAttackCard,
    _egResetEncounterState,
    _egStartEncounter,
    _egStartTickLoop,
    _egStopEncounter,
    _egStopTickLoop,
} from './encounter-lifecycle.js';

export {
    _egAnimateMonsterMelee,
    _egAnimateMonsterProjectile,
    _egApplyMeleeImpact,
    _egApplyPlayerBlockFeedback,
    _egApplyPlayerBlockLockoutFeedback,
    _egApplyPlayerHitFeedback,
    _egApplyPlayerMissFeedback,
    _egBlockLockoutOverlayTimer,
    _egFireMonsterAttack,
    _egHideBlockLockoutOverlay,
    _egResolveAttackType,
    _egRollPreemptiveDodge,
    _egShowBlockLockoutOverlay,
} from './encounter-monster-attacks.js';

export {
    EG_ECHO_DELAY_MS,
    _egAnimatePlayerProjectile,
    _egApplyGroundedReduction,
    _egApplyPlayerDeflectFeedback,
    _egApplyPlayerParryFeedback,
    _egConsumeOnHitGearBonus,
    _egGetDeflectChancePct,
    _egGetDeflectDamagePct,
    _egGetDualWieldParryChancePct,
    _egGetParryChancePct,
    _egIsDualWieldParryActive,
    _egOnMistake,
    _egReleaseChannelAtMax,
    _egResolveProjectileImpact,
    _egRollFateNegation,
    _egRollParry,
    _egTickCorrectCellGearProcs,
    _egTrackRecentFill,
    _egTryDeflectProjectile,
} from './encounter-player-attacks.js';

export {
    EG_DRAG_CHARGE_BASE_SIZE_PX,
    EG_DRAG_CHARGE_MAX_VISUAL_STACKS,
    EG_DRAG_CHARGE_SCALE_PER_STACK,
    EG_DRAG_CHARGE_SIZE_PER_STACK_PX,
    EG_MELEE_EXECUTE_HP_PCT,
    EG_MELEE_EXECUTE_MULT,
    EG_MELEE_MANA_PER_HIT,
    EG_MELEE_MANA_PER_KILL,
    EG_MELEE_OVERCHARGE_MULT,
    EG_MELEE_OVERCHARGE_RATIO,
    _egAimChargingProjectile,
    _egAnimatePlayerMelee,
    _egApplyPlayerMeleeImpact,
    _egClearChargedProjectileVisual,
    _egClearDragBonusLabel,
    _egCurrentMeleeDamage,
    _egGetTarget,
    _egGrantMeleeMana,
    _egReleaseChargedShot,
    _egRollPlayerMiss,
    _egShowManaGain,
    _egTryCleaveHit,
    _egTryMultishot,
    _egUpdateChargedProjectileVisual,
    _egUpdateDragBonusLabel,
} from './encounter-charged-shot.js';

export {
    EG_CHARGED_RICOCHET_DURATION_MS,
    EG_CHARGED_RICOCHET_SCALE,
    _egApplyHitToMonster,
    _egCycleTarget,
    _egDamageTarget,
    _egDamageTargetById,
    _egGetDominantElement,
    _egPlayerTakeDamage,
    _egSelectTarget,
    _egShowStatusLabel,
    _egTryChargedOverkillRicochet,
    _egTryEchoHit,
    _egTryOverkillSpread,
    _initEgTargetHotkeys,
} from './encounter-damage.js';

export {
    _egGameOver,
    _egHandleBossKill,
    _egHandleNormalMonsterKill,
    _egKillMonster,
    _egOnAllMonstersDead,
    _egUpdateTargetAfterKill,
} from './encounter-kills.js';

export {
    _egAssignRandomSpawnZone,
    _egBuildMonsterOrBoss,
    _egNotifyMonsterArrival,
    _egSpawnMonster,
} from './encounter-monster-spawning.js';
