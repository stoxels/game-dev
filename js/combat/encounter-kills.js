//------------------------------------------------------------------------
// PHASE 4 split (2026-09-16): extracted into a focused module. The original
// path is now a facade that re-exports this module, so existing import sites
// are unaffected. See MIGRATION.md "splitting giants".
//------------------------------------------------------------------------

// Kill orchestration: target cycling, monster removal, achievements,
// on-kill stats, full-clear detection, and game over.

import { ACH_STATE, saveAchState, setAchStat, trackAchStat } from '../achievements/achievements.js';
import { Audio_Manager } from '../audio/audio.js';
import { gainMana } from '../classes/class-mana.js';

import { stopTimer } from '../timer/timer.js';
import { t } from '../translation/translations.js';
import { EG_PANEL_RERENDER_DELAY_MS } from './encounter-constants.js';
import { _egPlayerTakeDamage } from './encounter-damage.js';


import { _egEndMapDefeated } from './encounter-chain.js';
import { _egFlashKillCard, _egRenderPanel } from './encounter.js';

// Live binding of the current level's puzzle object (state.js exports the
// binding itself, so this always reads the CURRENT level, not a snapshot).
// Phase-4 split leftover: this file used to read `cur` bare through the
// classic-script shared scope; the import is the module-era equivalent
// (same pattern as combat-ailments.js / combat-class-projectiles.js).
import { cur } from '../state.js';


import { _egGrantMonsterXP } from '../endgame/endgame-leveling.js';
import { _egMapKillRecoveryMult } from '../endgame/endgame-map-launch.js';

import { _egComputePlayerStats } from '../endgame/endgame-player-stats.js';
import { _egIsActive, _egIsCampaignRun } from './combat-state.js';
import { _egHandleBossKill, _egHandleNormalMonsterKill } from './encounter-kill-rewards.js';



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
        if (cur) window.LEVEL_FLAGS.lastFailedGi = cur.gIdx;
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
