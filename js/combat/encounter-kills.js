//------------------------------------------------------------------------
// PHASE 4 split (2026-09-16): extracted into a focused module. The original
// path is now a facade that re-exports this module, so existing import sites
// are unaffected. See MIGRATION.md "splitting giants".
//------------------------------------------------------------------------

// Kill handling: target cycling, normal/boss kill rewards (XP, loot,
// charms, achievements), full-clear detection and game over.

import { ACH_STATE, saveAchState, setAchStat, trackAchStat } from '../achievements/achievements.js';
import { Audio_Manager } from '../audio/audio.js';
import { gainMana } from '../classes/class-mana.js';
import { _charmTryMonsterDrop } from '../skills/skill-charms.js';
import { stopTimer } from '../timer.js';
import { t } from '../translation/translations.js';
import { EG_PANEL_RERENDER_DELAY_MS } from './encounter-constants.js';
import { _egPlayerTakeDamage } from './encounter-damage.js';
import { _egScheduleRespawn } from './encounter-spawn-rules.js';
import { _egTryDropCurrency } from '../loot/loot-currency.js';
import { _egBossDefeated, _egEndMapDefeated, _egOnAllBossesDead, _egScheduleArenaAdvance, _egUpdateObjectivesHUD } from './encounter-chain.js';
import { _egFlashKillCard, _egRenderPanel } from './encounter.js';
import { _egTryDropEssence } from '../loot/loot-essences.js';
import { _egDropHeartPickup, _egSpawnItemDrop } from './combat-grid-pickups.js';
import { _egGrantMonsterXP } from '../endgame/endgame-leveling.js';
import { _egMapKillRecoveryMult } from '../endgame/endgame-map-launch.js';
import { _egTryDropMap } from '../loot/loot-maps.js';
import { _egComputePlayerStats } from '../endgame/endgame-player-stats.js';
import { _egIsActive, _egIsCampaignRun } from './combat-state.js';



//------------------------------------------------------------------------
//-------------------KILL HANDLING----------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Auto-selects the first remaining monster after a kill, or clears the target.
export function _egUpdateTargetAfterKill() {
    if (globalThis._egMonsters.length > 0) {
        globalThis._egTargetId = globalThis._egMonsters[0].id;
    } else {
        globalThis._egTargetId = null;
        _egOnAllMonstersDead();
    }
}

// Handles all post-kill logic for a normal (non-boss) monster death.
export function _egHandleNormalMonsterKill(dying) {
    globalThis._egChainKillCount++;

    // Campaign kills never feed map objectives or respawns.
    const campaign = (typeof _egIsCampaignRun === 'function') && _egIsCampaignRun();
    if (!campaign) _egUpdateObjectivesHUD();

    // Keep the field populated: replacements spawn until the player enters
    // the boss arena (not just until the kill objective is reached - extra
    // kills after the objective are intentional free XP/loot, see
    // _egShouldSuppressRespawn).
    if (!campaign) _egScheduleRespawn();

    // Sacrificial zombie adds (Brutus) never drop loot - their only reward is
    // a chance to drop a healing heart onto the grid when the PLAYER kills
    // them (a slam-devoured zombie drops nothing; it feeds Brutus instead).
    if (dying && dying.noLoot) {
        const heartChance = dying.zombieHeartDropChance || 0;
        if (heartChance > 0 && Math.random() * 100 < heartChance * 100
            && typeof _egDropHeartPickup === 'function') {
            _egDropHeartPickup();
        }
    } else {
        if (typeof _egSpawnLootDrop === 'function') globalThis._egSpawnLootDrop(false, dying.level);
        if (typeof _egSpawnItemDrop === 'function') _egSpawnItemDrop(false);
        if (typeof _egTryDropCurrency === 'function') _egTryDropCurrency(false);
        if (typeof _egTryDropEssence === 'function') _egTryDropEssence(false);
        // Map items are endgame-only - never drop them in the campaign.
        if (!campaign && typeof _egTryDropMap === 'function') _egTryDropMap(false, dying.level);
        // Charm drops (js/skills/skill-charms.js) - chance-based like loot.
        if (typeof _charmTryMonsterDrop === 'function') _charmTryMonsterDrop(false, dying.level);
    }
}

// Handles all post-kill logic for a boss monster death.
// During the boss arena chain this advances the chain: more bosses left →
// roll into the next arena; last boss dead → loot party + Complete Map.
export function _egHandleBossKill(dying) {
    if (typeof _egBossPhaseActive !== 'undefined' && globalThis._egBossPhaseActive) {
        globalThis._egBossKilledCount++;

        const allDead = typeof _egBossDefeated === 'function' && _egBossDefeated();
        if (allDead) {
            if (typeof _egOnAllBossesDead === 'function') _egOnAllBossesDead();
        } else if (typeof _egScheduleArenaAdvance === 'function') {
            _egScheduleArenaAdvance();
        }
    }

    _egUpdateObjectivesHUD();
    if (typeof _egSpawnLootDrop === 'function') globalThis._egSpawnLootDrop(true,dying.level);
    if (typeof _egSpawnItemDrop === 'function') _egSpawnItemDrop(true);
    if (typeof _egTryDropEssence === 'function') _egTryDropEssence(true);
    if (typeof _egTryDropMap === 'function') _egTryDropMap(true, dying.level);
    // Bosses always drop a charm (see skill-charms.js).
    if (typeof _charmTryMonsterDrop === 'function') _charmTryMonsterDrop(true, dying.level);
}

// Removes a monster from the encounter after its death animation fires.
// Delegates to the appropriate normal or boss kill handler.
export function _egKillMonster(monsterId) {
    const dying = globalThis._egMonsters.find(m => m.id === monsterId);

    // Active map run: Second Wind - the monster rises back up once instead.
    if (dying && dying.secondWindPct > 0 && !dying.secondWindUsed
        && typeof _egIsActive === 'function' && _egIsActive()) {
        dying.secondWindUsed = true;
        if (Math.random() * 100 < dying.secondWindPct) {
            dying.currentHP = Math.max(1, Math.round((dying.maxHP || 1) * 0.25));
            dying.currentCharge = 0;
            globalThis.showToast(`✨ ${dying.name || ''} ${t('eg_mm_toast_second_wind') || 'rises again!'}`.trim());
            return;
        }
    }

    // Active map run: exploding monsters - deal #% of their own maximum
    // life as damage to the player on death (dodgeable / blockable).
    if (dying && dying.explodeOnDeathPct > 0 && typeof _egIsActive === 'function' && _egIsActive()) {
        const blast = Math.max(1, Math.round((dying.maxHP || 0) * dying.explodeOnDeathPct / 100));
        if (blast > 0) {
            globalThis.showToast(`💥 ${dying.name || ''} ${t('eg_mm_toast_explode') || 'explodes!'} (-${blast})`);
            _egPlayerTakeDamage(blast, false, dying.element, dying.level);
            if (typeof dead !== 'undefined' && globalThis.dead) return;
        }
    }

    globalThis._egBossCleanup(monsterId);
    _egFlashKillCard(monsterId);

    // Dynamo conductors: beam-network sockets whose power source is gone.
    // _egRemoveConductor fires the destruction burst and lets the roaming
    // card linger briefly so the kill-flash animation can play out.
    if (dying && dying.isDynamoConductor && typeof _egRemoveConductor === 'function') {
        globalThis._egRemoveConductor(monsterId);
    }

    globalThis._egMonsters = globalThis._egMonsters.filter(m => m.id !== monsterId);

    _egUpdateTargetAfterKill();

    // Endgame achievements - combat
    if (typeof trackAchStat === 'function') try {
        if (dying && !dying.isBoss) trackAchStat('egMonstersSlain', 1);
        if (dying && dying.isBoss) {
            trackAchStat('egBossKills', 1);
            // Track distinct boss types slain: maintain a set in ACH_STATE
            const _bossBase = dying.baseId || dying.id || '';
            const _bossStatKey = 'egBossTypesSlain';
            // Use a helper stat per boss id to dedup
            const _bossSeenKey = '_egBossSeen_' + _bossBase;
            if (typeof ACH_STATE !== 'undefined' && ACH_STATE.stats && !ACH_STATE.stats[_bossSeenKey]) {
                ACH_STATE.stats[_bossSeenKey] = 1;
                if (typeof saveAchState === 'function') saveAchState();
                // Count distinct seen keys
                let _distinct = 0;
                for (const k in ACH_STATE.stats) if (k.indexOf('_egBossSeen_') === 0 && ACH_STATE.stats[k]) _distinct++;
                if (typeof setAchStat === 'function') setAchStat(_bossStatKey, _distinct);
                else trackAchStat(_bossStatKey, 1);
            }
        }
    } catch(e){}

    if (dying && !dying.isBoss) _egHandleNormalMonsterKill(dying);
    if (dying && dying.isBoss) _egHandleBossKill(dying);

    // On-kill gear stats: mana, life and absorption on kill
    if (typeof _egComputePlayerStats === 'function') {
        const killStats = _egComputePlayerStats();

        if (typeof gainMana === 'function' && globalThis.playerMaxMana > 0 && (killStats.manaOnKill || 0) > 0) {
            gainMana(killStats.manaOnKill);
        }

        if ((killStats.lifeOnKill || 0) > 0 && globalThis.playerCurrentHP > 0 && globalThis.playerCurrentHP < globalThis.playerMaxHP) {
            // Active map run: "#% less Life gained from Kills".
            const recoveryMult = (typeof _egMapKillRecoveryMult === 'function')
                ? _egMapKillRecoveryMult() : 1;
            const lifeGain = Math.round(killStats.lifeOnKill * recoveryMult);
            if (lifeGain > 0) {
                globalThis.playerCurrentHP = Math.min(globalThis.playerMaxHP, globalThis.playerCurrentHP + lifeGain);
                if (typeof _renderPlayerHealth === 'function') globalThis._renderPlayerHealth();
            }
        }

        if ((killStats.absorptionOnKill || 0) > 0 && typeof _egIsActive === 'function' && _egIsActive()) {
            const maxAbsorption = killStats.absorption;
            if (globalThis._egPlayerAbsorptionCurrent < maxAbsorption) {
                globalThis._egPlayerAbsorptionCurrent = Math.min(maxAbsorption, globalThis._egPlayerAbsorptionCurrent + killStats.absorptionOnKill);
            }
        }
    }

    // Experience (endgame-leveling.js) - scaled by the monster's level
    if (dying && typeof _egGrantMonsterXP === 'function') {
        _egGrantMonsterXP(dying.level, !!dying.isBoss);
    }

    setTimeout(() => _egRenderPanel(), EG_PANEL_RERENDER_DELAY_MS);
}

// Called when the last monster in the encounter is killed.
// Currently intentionally empty - kill toasts handle all feedback.
export function _egOnAllMonstersDead() { }

// Triggers the game-over sequence when the player's HP reaches zero.
export function _egGameOver() {
    // Campaign defeat: fall back to the normal lose overlay (retry/levels)
    // instead of the endgame map-failed screen, which routes to the Nexus.
    if (typeof _egIsCampaignRun === 'function' && _egIsCampaignRun()) {
        globalThis.dead = true;
        if (typeof stopTimer === 'function') stopTimer();
        if (globalThis.cur) window._lastFailedGi = globalThis.cur.gIdx;
        const lose = document.getElementById('ov-lose');
        if (lose) {
            const titleEl = document.getElementById('lose-title');
            const subEl = document.getElementById('lose-sub');
            if (titleEl && typeof t === 'function') titleEl.textContent = t('eg_game_over');
            if (subEl && typeof t === 'function') subEl.textContent = t('eg_monsters_overwhelmed');
            lose.classList.add('show');
        }
        if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('lose');
        return;
    }
    // Central defeat handler - the player keeps the loot collected so far.
    _egEndMapDefeated(t('eg_game_over'), t('eg_monsters_overwhelmed'));
}
