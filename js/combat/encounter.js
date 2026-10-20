//------------------------------------------------------------------------
//-------------------ENCOUNTER MONSTER PANEL------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// The real-time combat overlay: the monster panel, its HTML builders, the
// damage numbers and hit bursts, and the per-frame bar updates. Spawning,
// attacks, targeting, damage and kills live in the focused encounter-*
// modules, re-exported below so existing import sites keep working.

import { t } from '../translation/translations.js';
import { DAMAGE_NUMBER_DURATION_MS, IMMUNE_FLASH_DURATION_MS, IMMUNE_LABEL_DURATION_MS, MONSTER_ZONES } from './encounter-constants.js';
import { _getDominantElement } from './encounter-monster-damage.js';
import { _renderMonsterStatusStrip } from './combat-ailments-core.js';
import { GAME_ART } from '../endgame/endgame-art.js';
import { _roamShouldRoam, _roamSync, _roamTeardown } from './combat-monster-roam.js';
import { _isActive } from './combat-state.js';



//------------------------------------------------------------------------
//-------------------VISUAL EFFECTS---------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Appends a floating "-N" damage number to the monster's card that fades out.
// `isCrit` and `elements` drive the RPG pop: crits are bigger/gold, elemental
// dominance tints the number and its glow (shadow/fire/cold/lightning).
export function _showDamageNumber(monsterId, amount, isCrit, elements) {
    const card = document.getElementById(`sx-card-${monsterId}`);
    if (!card) return;

    const dmgText = document.createElement('div');
    const domEl = _getDominantElement(elements);
    let cls = 'sx-damage-number';
    if (domEl && domEl !== 'physical') cls += ' sx-dmg-' + domEl;
    else cls += ' sx-dmg-physical';
    if (isCrit) cls += ' sx-dmg-crit';
    else if (amount != null && amount > 0 && amount < 8) cls += ' sx-dmg-small';
    dmgText.className = cls;
    dmgText.textContent = `-${amount}`;
    // random horizontal jitter + tiny vertical stagger so rapid hits fan out
    dmgText.style.marginLeft = `${(Math.random() * 18 - 9).toFixed(1)}px`;
    dmgText.style.marginTop = `${(Math.random() * 6 - 3).toFixed(1)}px`;
    card.appendChild(dmgText);
    // crit numbers linger longer (matches damage-float-crit, 1.5s)
    setTimeout(() => dmgText.remove(), isCrit ? DAMAGE_NUMBER_DURATION_MS + 480 : DAMAGE_NUMBER_DURATION_MS);
}

// Removes and re-adds a CSS flash class to force the animation to restart.
// Works for any flash class on any card element.
export function _restartFlashClass(card, cssClass) {
    card.classList.remove(cssClass);
    void card.offsetWidth; // force reflow so the CSS animation restarts
    card.classList.add(cssClass);
}

// Triggers the damage flash CSS animation on the monster's card.
export function _flashDamageCard(monsterId) {
    const card = document.getElementById(`sx-card-${monsterId}`);
    if (!card) return;
    _restartFlashClass(card, 'sx-flash-damage');
}

// Adds the kill flash class to the monster's card (plays the death animation).
export function _flashKillCard(monsterId) {
    const card = document.getElementById(`sx-card-${monsterId}`);
    if (card) card.classList.add('sx-flash-kill');
}

// Shows the IMMUNE label and flashes the immunity animation on the monster's card.
export function _flashImmune(monsterId) {
    const card = document.getElementById(`sx-card-${monsterId}`);
    if (!card) return;

    _restartFlashClass(card, 'sx-flash-immune');
    setTimeout(() => card.classList.remove('sx-flash-immune'), IMMUNE_FLASH_DURATION_MS);

    const label = document.createElement('div');
    label.className = 'sx-damage-number sx-immune-label';
    label.textContent = t('eg_immune');
    card.appendChild(label);
    setTimeout(() => label.remove(), IMMUNE_LABEL_DURATION_MS);
}

// Particle colour per damage element (falls back to white for physical).
export const HIT_ELEMENT_COLORS = {
    physical: '#ffffff',
    fire: '#ff6b35',
    cold: '#4fc3f7',
    lightning: '#ffe066',
    shadow: '#b06bff'
};

export const HIT_BURST_SPARK_COUNT = 14;
export const HIT_BURST_DURATION_MS = 750;

// Spawns a short spark burst + expanding shockwave ring at the monster's
// card centre when damage lands. `elements` optionally maps each element to
// its share of the hit; the dominant element picks the burst colour.
// `isCrit` enlarges the burst.
export function _spawnHitBurst(monsterId, elements, isCrit) {
    const card = document.getElementById(`sx-card-${monsterId}`);
    if (!card) return;

    let color = HIT_ELEMENT_COLORS.physical;
    if (elements) {
        let best = null;
        Object.keys(elements).forEach(el => {
            if (HIT_ELEMENT_COLORS[el] && (!best || elements[el] > elements[best])) best = el;
        });
        if (best) color = HIT_ELEMENT_COLORS[best];
    }

    const rect = card.getBoundingClientRect();
    const burst = document.createElement('div');
    burst.className = 'sx-hit-burst';
    burst.style.left = `${rect.left + rect.width / 2}px`;
    burst.style.top = `${rect.top + rect.height / 2}px`;

    // Expanding shockwave ring
    const ring = document.createElement('div');
    ring.className = 'sx-hit-ring';
    ring.style.setProperty('--sx-hit-color', color);
    burst.appendChild(ring);

    if (isCrit) {
        // Crit: bigger, brighter ring
        ring.style.transform = 'scale(1.35)';
        ring.style.borderWidth = '4px';
        ring.style.filter = 'brightness(1.5)';
    }

    // Outward-flying sparks in a ring with slight random jitter
    const sparkCount = isCrit ? HIT_BURST_SPARK_COUNT + 8 : HIT_BURST_SPARK_COUNT;
    for (let i = 0; i < sparkCount; i++) {
        const spark = document.createElement('div');
        spark.className = 'sx-hit-spark';
        const angle = (Math.PI * 2 * i) / sparkCount + Math.random() * 0.5;
        const dist = isCrit ? 52 + Math.random() * 36 : 40 + Math.random() * 30;
        spark.style.setProperty('--sx-hit-color', color);
        spark.style.setProperty('--spark-dx', `${(Math.cos(angle) * dist).toFixed(1)}px`);
        spark.style.setProperty('--spark-dy', `${(Math.sin(angle) * dist).toFixed(1)}px`);
        if (isCrit) spark.style.width = '10px';
        if (isCrit) spark.style.height = '10px';
        if (isCrit) spark.style.marginLeft = '-5px';
        if (isCrit) spark.style.marginTop = '-5px';
        burst.appendChild(spark);
    }

    document.body.appendChild(burst);
    setTimeout(() => burst.remove(), isCrit ? HIT_BURST_DURATION_MS + 150 : HIT_BURST_DURATION_MS);
}


//------------------------------------------------------------------------
//-------------------RENDER-----------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns the CSS class for an HP bar based on the percentage remaining.
export function _hpBarClass(hpPct) {
    if (hpPct > 60) return 'sx-hp-high';
    if (hpPct > 30) return 'sx-hp-mid';
    return 'sx-hp-low';
}

// Builds the badge HTML for a monster's name row (level, boss phase, immune, target).
// NOTE: _buildMonsterBadgesHTML is kept for any external callers.
export function _buildMonsterBadgesHTML(m, isTarget) {
    let html = `<span class="sx-level-badge">${t('eg_lv_badge').replace('{n}', m.level)}</span>`;
    if (m.isBoss && m.bossPhase)
        html += `<span class="sx-boss-phase-badge sx-boss-phase-${m.bossPhase}">${t('eg_phase_badge').replace('{n}', m.bossPhase)}</span>`;
    if (m.bossImmune)
        html += `<span class="sx-boss-immune-badge">${t('eg_immune')}</span>`;
    if (isTarget)
        html += `<span class="sx-target-badge">${t('eg_target_badge')}</span>`;
    return html;
}

// Calculates HP and charge percentages clamped to [0, 100] for a given monster.
export function _calcBarPercentages(m) {
    return {
        hpPct: Math.max(0, Math.round((m.currentHP / m.maxHP) * 100)),
        chargePct: Math.min(100, Math.max(0, (m.currentCharge / m.chargeMax) * 100)),
    };
}

// Builds the compact emoji card HTML for a single monster.
export function _buildMonsterCardHTML(m) {
    const { hpPct, chargePct } = _calcBarPercentages(m);
    const isTarget = (m.id === globalThis._targetId);
    const bossCls = m.isBoss ? ' sx-boss-card' : '';
    const targetedCls = isTarget ? ' sx-card-targeted' : '';
    const traitCls = m.gauntletTrait ? ` ga-trait-${m.gauntletTrait}` : '';

    return `
    <div class="sx-monster-card-compact${bossCls}${targetedCls}${traitCls}" id="sx-card-${m.id}" onclick="_selectTarget('${m.id}')" style="--sx-art:${m.artScale || 1}">
        <!-- Bars stacked top-to-bottom: Charge bar then HP bar above the icon -->
        <div class="sx-compact-bars">
            <div class="sx-charge-track-compact">
                <div class="sx-charge-bar" id="sx-charge-bar-${m.id}" style="width:${chargePct}%"></div>
            </div>
            <div class="sx-hp-track-compact">
                <div class="sx-hp-bar-compact ${_hpBarClass(hpPct)}" id="sx-hp-bar-${m.id}" style="width:${hpPct}%"></div>
            </div>
        </div>

        <!-- Elemental ailment icons (ignite/chill/frozen/shocked/shadowburn) -->
        <div class="sx-status-strip" id="sx-status-${m.id}"></div>

        <!-- Emoji icon with level badge and hover tooltip -->
        <div class="sx-emoji-wrapper${m.isBoss ? ' sx-boss-emoji-wrapper' : ''}${((m.enrageStacks || 0) > 0 || m.enraged) ? ' sx-boss-enraged' : ''} ${isTarget ? 'sx-compact-targeted' : ''}">
            ${m.isBoss ? '<span class="sx-boss-crown">👑</span><span class="sx-boss-rage-fire"></span><span class="sx-boss-rage-badge">😡</span>' : ''}
            <span class="sx-monster-emoji-compact${m.isBoss ? ' sx-boss-emoji' : ''}">${GAME_ART.html('monster', m.artId || m.baseId, m.emoji)}</span>
            <span class="sx-level-bottom-left">${m.level}</span>
            <span class="sx-grace-badge" id="sx-grace-${m.id}" style="display:none"></span>
            ${m.gauntletTrait ? `<span class="ga-trait-badge" title="${m.gauntletTrait === 'warded' ? 'Spell Ward: takes 65% less damage from spells - melee works best' : (m.gauntletTrait === 'champion' ? 'Champion: tougher and hits harder' : 'Phased: takes 65% less damage from melee - spells work best')}">${m.gauntletTrait === 'warded' ? '🛡' : (m.gauntletTrait === 'champion' ? '👑' : '👻')}</span>` : ''}

            <div class="sx-monster-compact-tooltip">
                <div class="sx-tooltip-name">${m.name}</div>
                <div class="sx-tooltip-hp" id="sx-hp-label-${m.id}">${m.currentHP} / ${m.maxHP} HP</div>
            </div>
        </div>

    </div>`;
}





// Mirrors a monster's art so it looks toward the player's avatar. Art is
// drawn facing right; ids in ART_FACES_LEFT are drawn facing left and
// get the opposite flip. A small dead-zone stops flicker when the player
// is roughly above/below the monster.
const ART_FACES_LEFT = new Set([]);
const FACE_DEADZONE_PX = 14;

function _faceMonsterTowardPlayer(m) {
    const card = document.getElementById(`sx-card-${m.id}`);
    const art = card && card.querySelector('.sx-monster-emoji-compact');
    const player = document.getElementById('player-avatar-wrapper');
    if (!art || !player) return;
    const c = card.getBoundingClientRect();
    const p = player.getBoundingClientRect();
    if (!c.width || !p.width) return;
    const dx = (p.left + p.width / 2) - (c.left + c.width / 2);
    if (Math.abs(dx) < FACE_DEADZONE_PX) return;
    const playerIsLeft = dx < 0;
    const nativeLeft = ART_FACES_LEFT.has(m.artId || m.baseId);
    const flip = (playerIsLeft !== nativeLeft) ? -1 : 1;
    if (art._flip === flip) return;
    art._flip = flip;
    art.style.transform = flip === -1 ? 'scaleX(-1)' : '';
}

// Grace period (firstStepUntil): 👣 countdown on the card + teal charge bar.
function _updateGraceBadge(m) {
    const badge = document.getElementById(`sx-grace-${m.id}`);
    if (!badge) return;
    const left = m.firstStepUntil ? m.firstStepUntil - Date.now() : 0;
    badge.style.display = left > 0 ? '' : 'none'; badge.textContent = left > 0 ? '👣 ' + Math.ceil(left / 1000) + 's' : '';
    badge.parentElement.parentElement.classList.toggle('sx-card-grace', left > 0);
}

// Updates the HP bar, charge bar, and HP label for a single monster.
// Cheap DOM update used by the 10Hz tick loop - no full rebuild.
export function _updateMonsterBars(m) {
    const { hpPct, chargePct } = _calcBarPercentages(m);

    const hpBar = document.getElementById(`sx-hp-bar-${m.id}`);
    const chargeBar = document.getElementById(`sx-charge-bar-${m.id}`);
    const hpLabel = document.getElementById(`sx-hp-label-${m.id}`);

    if (hpBar) {
        hpBar.style.width = hpPct + '%';
        hpBar.className = `sx-hp-bar-compact ${_hpBarClass(hpPct)}`;
    }
    if (chargeBar) {
        chargeBar.style.width = chargePct + '%';
        // Danger glow when the attack is about to fire (>75% charged) - matches RPG pop
        if (chargePct >= 75) chargeBar.classList.add('sx-charge-danger');
        else chargeBar.classList.remove('sx-charge-danger');
    }
    if (hpLabel) hpLabel.textContent = `${m.currentHP} / ${m.maxHP} HP`;

    _faceMonsterTowardPlayer(m);
    _updateGraceBadge(m);

    // Elemental ailment icon strip (only rebuilds when statuses change)
    _renderMonsterStatusStrip(m);
}

// High-frequency bar update (10Hz). Only touches bar widths and HP text -
// no DOM rebuilds. Keeps the tick loop cheap.
export function _updateBars() {
    if (!_isActive()) return;
    globalThis._monsters.forEach(_updateMonsterBars);
}

// Clears all monster zone elements and hides the wrapper.
export function _hideMonsterPanel() {
    MONSTER_ZONES.forEach(zone => {
        const el = document.getElementById(zone);
        if (el) el.innerHTML = '';
    });
    // Legacy roam layer cleanup (encounter over).
    try { _roamTeardown(); } catch (e) {}
    const wrapper = document.getElementById('sx-monster-wrapper');
    if (wrapper) wrapper.classList.add('sx-hidden');
}

// Clears the HTML content of every monster zone panel.
export function _clearAllZones() {
    MONSTER_ZONES.forEach(zone => {
        const el = document.getElementById(zone);
        if (el) el.innerHTML = '';
    });
}

// Renders each monster's card into its assigned zone panel.
// Uses += so multiple monsters assigned to the same zone stack correctly.
// Only Brutus zombies / Dynamo conductors (own layers) and the legacy
// roam hook skip panels; every other monster renders in its static panel.
export function _renderMonstersIntoZones() {
    globalThis._monsters.forEach(m => {
        // Brutus's sacrificial zombies render as roaming cards in the fixed
        // #sx-zombie-layer, not in the static monster panel.
        if (m.isSacrificialZombie) return;
        // The Dynamo's Lightning Conductors render as roaming cards in the
        // fixed #sx-dynamo-layer (beam-network anchors must stay at their
        // spawn spots) - never in the static monster panel.
        if (m.isDynamoConductor) return;
        // Legacy patrol hook (always false now): normal monsters stay put.
        // Occasional melee sidesteps (endgame-monster-roam.js) just change
        // zoneId and re-render here - no separate layer.
        if (_roamShouldRoam(m)) return;
        const zoneEl = document.getElementById(m.zoneId || 'sx-monster-panel');
        if (zoneEl) zoneEl.innerHTML += _buildMonsterCardHTML(m);
    });
}

// Full panel rebuild. Only called on spawn, death, or target change -
// never from the tick loop.
export function _renderPanel() {
    const wrapper = document.getElementById('sx-monster-wrapper');

    if (!_isActive()) {
        _clearAllZones();
        if (wrapper) wrapper.classList.add('sx-hidden');
        return;
    }

    if (wrapper) wrapper.classList.remove('sx-hidden');

    _clearAllZones();
    _renderMonstersIntoZones();
    // Legacy patrol cleanup (clears the old #sx-roam-layer if present).
    try { _roamSync(); } catch (e) {}
    _startGridOverlapSync();
}

// Cards overlapping the grid get `sx-over-grid` (CSS: click-through and
// see-through art) so monsters can draw above the grid without blocking
// cells. One light interval per encounter; it stops itself afterwards.
let _gridOverlapTimer = null;
function _syncGridOverlap() {
    const grid = document.getElementById('ptable');
    const gr = grid ? grid.getBoundingClientRect() : null;
    const cards = document.querySelectorAll('#sx-monster-wrapper .sx-monster-card-compact, .sx-floating-panel .sx-monster-card-compact');
    cards.forEach(card => {
        let over = false;
        if (gr && gr.width > 0 && gr.height > 0) {
            const r = card.getBoundingClientRect();
            over = r.right > gr.left + 4 && r.left < gr.right - 4 && r.bottom > gr.top + 4 && r.top < gr.bottom - 4;
        }
        card.classList.toggle('sx-over-grid', over);
    });
}

function _startGridOverlapSync() {
    _syncGridOverlap();
    if (_gridOverlapTimer) return;
    _gridOverlapTimer = setInterval(() => {
        if (!_isActive()) {
            clearInterval(_gridOverlapTimer);
            _gridOverlapTimer = null;
            return;
        }
        _syncGridOverlap();
    }, 200);
}

// ---- re-exports from the focused split modules (public surface preserved) ----

export {
    BLOCK_LOCKOUT_BASE_MS,
    BOSS_SPAWN_DELAY_MS,
    DAMAGE_NUMBER_DURATION_MS,
    DEFAULT_MONSTER_CAP,
    DEFLECT_BASE_DMG_PCT,
    DEFLECT_BASE_PCT,
    IMMUNE_FLASH_DURATION_MS,
    IMMUNE_LABEL_DURATION_MS,
    INITIAL_SPAWN_STAGGER_BASE_MS,
    MELEE_ANIM_DURATION_MS,
    MONSTER_PROJ_DURATION_MS,
    MONSTER_ZONES,
    PANEL_RERENDER_DELAY_MS,
    PARRY_BASE_PCT,
    PLAYER_DAMAGE_NUMBER_DURATION_MS,
    PLAYER_HIT_FLASH_MS,
    RESPAWN_DELAY_MIN_MS,
    RESPAWN_DELAY_RANGE_MS,
    _getDefaultMonsterCap,
    _getRespawnDelayMs,
} from './encounter-constants.js';

export {
    EARLY_VARIANCE_FREE_LEVEL,
    MONSTER_VARIANCE_DOWN,
    MONSTER_VARIANCE_UP_MAX,
    MONSTER_VARIANCE_UP_MIN,
    _buildBossSpawnList,
    _buildBossSpawnListFromDef,
    _buildFixedBossList,
    _buildFixedNormalList,
    _buildNormalSpawnList,
    _buildRandomBossList,
    _buildRandomNormalList,
    _buildSpawnList,
    _categorizeMonsterTier,
    _getEncounterBaseLevel,
    _isPuzzleSolved,
    _pickWeightedMonster,
    _rollMonsterLevel,
} from './encounter-spawn-rules.js';

export {
    CAMPAIGN_MONSTER_CONFIG,
    CAMPAIGN_STAMPED_FIELDS,
    _buildCampaignMonsterList,
    _campaignRefDamage,
    _clearCampaignLevelFields,
    _countSolutionCells,
    _earlyEaseBlend,
    _prepareCampaignEncounter,
} from './encounter-campaign-spawns.js';

export {
    INITIAL_SPAWN_STAGGER_STEP_MS,
    _calcSpawnDelay,
    _respawnRandomMonster,
    _scheduleMonsterSpawns,
    _scheduleRespawn,
    _shouldSuppressRespawn,
} from './encounter-spawn-scheduler.js';

export {
    LIFE_REGEN_INTERVAL_MS,
    STAGGER_DURATION_MS,
    _attachBossStylesheet,
    _cancelSpawnTimers,
    _resetEncounterState,
    _startEncounter,
    _startTickLoop,
    _stopEncounter,
    _stopTickLoop,
} from './encounter-lifecycle.js';

export {
    _animateMonsterMelee,
    _animateMonsterProjectile,
    _applyMeleeImpact,
    _fireMonsterAttack,
    _flashMonsterAttackCard,
    _resolveAttackType,
    _rollPreemptiveDodge,
} from './encounter-monster-attacks.js';

export {
    _applyPlayerBlockFeedback,
    _applyPlayerBlockLockoutFeedback,
    _applyPlayerHitFeedback,
    _applyPlayerMissFeedback,
    _blockLockoutOverlayTimer,
    _hideBlockLockoutOverlay,
    _showBlockLockoutOverlay,
} from './encounter-monster-attack-feedback.js';

export {
    _animatePlayerProjectile,
    _consumeOnHitGearBonus,
    _onMistake,
    _releaseChannelAtMax,
    _resolveProjectileImpact,
    _tickCorrectCellGearProcs,
    _trackRecentFill,
} from './encounter-player-attacks.js';

export {
    _applyGroundedReduction,
    _applyPlayerDeflectFeedback,
    _applyPlayerParryFeedback,
    _getDeflectChancePct,
    _getDeflectDamagePct,
    _getDualWieldParryChancePct,
    _getParryChancePct,
    _isDualWieldParryActive,
    _rollFateNegation,
    _rollParry,
    _tryDeflectProjectile,
} from './encounter-player-mitigation.js';

export {
    DRAG_CHARGE_BASE_SIZE_PX,
    DRAG_CHARGE_MAX_VISUAL_STACKS,
    DRAG_CHARGE_SCALE_PER_STACK,
    DRAG_CHARGE_SIZE_PER_STACK_PX,
    _aimChargingProjectile,
    _clearChargedProjectileVisual,
    _clearDragBonusLabel,
    _getTarget,
    _releaseChargedShot,
    _rollPlayerMiss,
    _tryMultishot,
    _updateChargedProjectileVisual,
    _updateDragBonusLabel,
} from './encounter-charged-shot.js';

export {
    MELEE_OVERCHARGE_MULT,
    MELEE_OVERCHARGE_RATIO,
    MELEE_OVERCHARGE_RATE_PER_TIER,
    _meleeDashVisual,
    _meleeGrandFlash,
    _meleeLeapVisual,
    _meleeNovaVisual,
    _meleeTierArt,
    _meleeTierForCharge,
    _meleeTierLabel,
    _overchargeRateForTier,
} from './encounter-melee-arts.js';

export {
    MELEE_DELIVERY_ARRIVAL_BEAT_MS,
    MELEE_DELIVERY_LEAP_MS,
    MELEE_DELIVERY_OUT_MAX_MS,
    MELEE_DELIVERY_OUT_MIN_MS,
    MELEE_DELIVERY_RETURN_MS,
    _meleeDashOut,
    _meleeDeliveryAvailable,
    _meleeGlideHome,
    _meleeLeapTo,
    _meleeRaiseAvatar,
} from './encounter-melee-delivery.js';

export {
    MELEE_HOLD_VULNERABILITY_MULT,
    _cycleTarget,
    _playerTakeDamage,
    _selectTarget,
    _initEgTargetHotkeys,
} from './encounter-damage.js';

export {
    CHARGED_RICOCHET_DURATION_MS,
    CHARGED_RICOCHET_SCALE,
    ECHO_DELAY_MS,
    _applyHitToMonster,
    _damageTarget,
    _damageTargetById,
    _getDominantElement,
    _showStatusLabel,
    _tryChargedOverkillRicochet,
    _tryEchoHit,
    _tryOverkillSpread,
} from './encounter-monster-damage.js';

export {
    _gameOver,
    _killMonster,
    _onAllMonstersDead,
    _updateTargetAfterKill,
} from './encounter-kills.js';

export {
    _handleBossKill,
    _handleNormalMonsterKill,
} from './encounter-kill-rewards.js';

export {
    _assignRandomSpawnZone,
    _buildMonsterOrBoss,
    _notifyMonsterArrival,
    _spawnMonster,
} from './encounter-monster-spawning.js';
