//------------------------------------------------------------------------
// PHASE 4 split (2026-09-16): extracted into a focused module. The original
// path is now a facade that re-exports this module, so existing import sites
// are unaffected. See MIGRATION.md "splitting giants".
//------------------------------------------------------------------------

// Kill orchestration: target cycling, monster removal, achievements,
// on-kill stats, full-clear detection, and game over.

import { ACH_STATE, saveAchState, setAchStat, trackAchStat, trackAchUnique } from '../achievements/achievements.js';
import { Audio_Manager } from '../audio/audio.js';
import { gainMana } from '../classes/class-mana.js';

import { stopTimer } from '../timer/timer.js';
import { addTimeSecs } from '../timer/timer-adjust.js';
import { t } from '../translation/translations.js';
import { PANEL_RERENDER_DELAY_MS } from './encounter-constants.js';
import { _playerTakeDamage } from './encounter-damage.js';


import { _endMapDefeated } from './encounter-chain.js';
import { _gauntletOnDefeat } from './gauntlet.js';
import { _flashKillCard, _renderPanel } from './encounter.js';

// Live binding of the current level's puzzle object (state.js exports the
// binding itself, so this always reads the CURRENT level, not a snapshot).
// Phase-4 split leftover: this file used to read `cur` bare through the
// classic-script shared scope; the import is the module-era equivalent
// (same pattern as combat-ailments.js / combat-class-projectiles.js).
import { cur } from '../state.js';


import { _grantMonsterXP, _showXpGainText } from '../hub/hub-leveling.js';
import { _egActiveMapItem, _egMapKillRecoveryMult } from '../endgame/endgame-map-launch.js';

import { _computePlayerStats } from './combat-player-stats.js';
import { _isActive, _isCampaignRun } from './combat-state.js';
import { _gainEnduranceCharge, _gainFrenzyCharge, _gainOnslaught, _gainPowerCharge } from './combat-ailments-state.js';
import { _handleBossKill, _handleNormalMonsterKill } from './encounter-kill-rewards.js';
import { CAMPAIGN_MONSTER_CONFIG } from './encounter-campaign-spawns.js';



//------------------------------------------------------------------------
//-------------------KILL HANDLING----------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Auto-selects the first remaining monster after a kill, or clears the target.
export function _updateTargetAfterKill() {
    if (globalThis._monsters.length > 0) {
        globalThis._targetId = globalThis._monsters[0].id;
    } else {
        globalThis._targetId = null;
        _onAllMonstersDead();
    }
}

// Pantheon achievement: remembers which of the four Tier 16 region bosses
// (the ones the atlas assigns to its tier-16 regions) were defeated, counting
// only kills inside a Tier 16 map - never in the campaign or lower maps.
function _trackPantheonBoss(dying) {
    const tier = (_egActiveMapItem && _egActiveMapItem.mapTier) || (globalThis._mapDef && globalThis._mapDef.mapTier) || 0;
    if (tier < 16 || _isCampaignRun()) return;
    const roster = globalThis.EG_ATLAS_REGION_BOSSES || {};
    const t16Bosses = Object.keys(roster).filter(k => k.indexOf('atlas_t16_') === 0).map(k => roster[k]);
    const bossId = dying.baseId || dying.id || '';
    if (t16Bosses.includes(bossId)) trackAchUnique('egT16BossTypesSlain', bossId);
}

// Puzzle rewards for a kill: timer seconds (a flat bonus for each campaign
// monster, plus passive-tree extras, more for bosses and elites), and a chance to reveal one correct / mark one wrong cell.
function _treeKillPuzzleLines(dying, stats) {
    if (!dying) return;
    const isElite = !!(dying.isBoss || dying.isElite || (Number(dying.baseHP) || 0) >= 110);
    const baseSecs = (!dying.isBoss && _isCampaignRun()) ? CAMPAIGN_MONSTER_CONFIG.killTimeBonusSecs : 0;
    const secs = baseSecs + (Number(stats.timeOnKill) || 0) + (isElite ? (Number(stats.timeOnElite) || 0) : 0);
    if (secs > 0) addTimeSecs(secs);
    if (!cur || !cur.grid || !globalThis.userGrid) return;
    const reveal = Math.min(100, Number(stats.cellOnKillPct) || 0);
    if (reveal > 0 && Math.random() * 100 < reveal && typeof globalThis.revealTiles === 'function') globalThis.revealTiles(1, 'item');
    const mark = Math.min(100, Number(stats.markOnKillPct) || 0);
    if (mark > 0 && Math.random() * 100 < mark && typeof globalThis.markWrongTiles === 'function') globalThis.markWrongTiles(1);
}

// Removes a monster from the encounter after its death animation fires.
// Delegates to the appropriate normal or boss kill handler.
export function _killMonster(monsterId) {
    const dying = globalThis._monsters.find(m => m.id === monsterId);

    // Active map run: Second Wind - the monster rises back up once instead.
    if (dying && dying.secondWindPct > 0 && !dying.secondWindUsed
        && typeof _isActive === 'function' && _isActive()) {
        dying.secondWindUsed = true;
        if (Math.random() * 100 < dying.secondWindPct) {
            dying.currentHP = Math.max(1, Math.round((dying.maxHP || 1) * 0.25));
            dying.currentCharge = 0;
            globalThis.showCombatToast(`✨ ${dying.name || ''} ${t('eg_mm_toast_second_wind') || 'rises again!'}`.trim());
            return;
        }
    }

    // Active map run: exploding monsters - deal #% of their own maximum
    // life as damage to the player on death (dodgeable / blockable).
    if (dying && dying.explodeOnDeathPct > 0 && typeof _isActive === 'function' && _isActive()) {
        const blast = Math.max(1, Math.round((dying.maxHP || 0) * dying.explodeOnDeathPct / 100));
        if (blast > 0) {
            globalThis.showCombatToast(`💥 ${dying.name || ''} ${t('eg_mm_toast_explode') || 'explodes!'} (-${blast})`);
            _playerTakeDamage(blast, false, dying.element, dying.level);
            if (typeof dead !== 'undefined' && globalThis.dead) return;
        }
    }

    globalThis._bossCleanup(monsterId);
    _flashKillCard(monsterId);
    if (dying) Audio_Manager.playSFX(dying.isBoss ? 'boss_killed' : 'monster_killed');

    // Dynamo conductors: beam-network sockets whose power source is gone.
    // _removeConductor fires the destruction burst and lets the roaming
    // card linger briefly so the kill-flash animation can play out.
    if (dying && dying.isDynamoConductor && typeof _removeConductor === 'function') {
        globalThis._removeConductor(monsterId);
    }

    globalThis._monsters = globalThis._monsters.filter(m => m.id !== monsterId);

    _updateTargetAfterKill();

    // Lifetime tally of this save for the save-slot tooltip (the achievement counters below are
    // shared by every save).
    if (dying) globalThis._incDirect(dying.isBoss ? 'bossesSlain' : 'monstersSlain');

    // Character banter: kill / kill-streak / boss-down quips.
    if (dying && typeof globalThis.triggerKillBanter === 'function') globalThis.triggerKillBanter(!!dying.isBoss);

    // Endgame achievements - combat
    if (typeof trackAchStat === 'function') try {
        if (dying && !dying.isBoss) trackAchStat('egMonstersSlain', 1);
        if (dying && Number(dying.level) > 0 && typeof setAchStat === 'function') setAchStat('combatHighestMonsterLevel', Number(dying.level));
        if (dying && dying.isBoss) {
            trackAchStat('egBossKills', 1);
            // Track distinct boss types slain: maintain a set in ACH_STATE
            const _bossBase = dying.baseId || dying.id || '';
            const _bossStatKey = 'egBossTypesSlain';
            // Use a helper stat per boss id to dedup
            const _bossSeenKey = '_bossSeen_' + _bossBase;
            if (typeof ACH_STATE !== 'undefined' && ACH_STATE.stats && !ACH_STATE.stats[_bossSeenKey]) {
                ACH_STATE.stats[_bossSeenKey] = 1;
                if (typeof saveAchState === 'function') saveAchState();
                // Count distinct seen keys
                let _distinct = 0;
                for (const k in ACH_STATE.stats) if (k.indexOf('_bossSeen_') === 0 && ACH_STATE.stats[k]) _distinct++;
                if (typeof setAchStat === 'function') setAchStat(_bossStatKey, _distinct);
                else trackAchStat(_bossStatKey, 1);
            }
        }
        if (dying && dying.isBoss) _trackPantheonBoss(dying);
    } catch(e){}

    // Score: campaign kills add to the level's combat tally (see scoring-core.js)
    if (dying && typeof globalThis.recordMonsterKillScore === 'function') globalThis.recordMonsterKillScore(dying);

    if (dying && !dying.isBoss) _handleNormalMonsterKill(dying);
    if (dying && dying.isBoss) _handleBossKill(dying);

    // On-kill gear stats: mana, life and absorption on kill
    if (typeof _computePlayerStats === 'function') {
        const killStats = _computePlayerStats();

        // Shield batch (node 285): chance to gain an Endurance Charge on
        // kill while holding a shield (see combat-ailments-state.js).
        if (killStats.isShieldEquipped && (killStats.enduranceOnKillShieldPct || 0) > 0
            && Math.random() * 100 < killStats.enduranceOnKillShieldPct) {
            _gainEnduranceCharge(killStats.enduranceChargesMax, killStats.enduranceDurationPct);
        }
        globalThis._lastKillAt = Date.now();
        if ((killStats.onslaughtOnKillPct || 0) > 0 && Math.random() * 100 < Math.min(100, killStats.onslaughtOnKillPct)) {
            _gainOnslaught();
        }
        if ((killStats.enduranceOnKillPct || 0) > 0 && Math.random() * 100 < Math.min(100, killStats.enduranceOnKillPct)) {
            _gainEnduranceCharge(killStats.enduranceChargesMax, killStats.enduranceDurationPct);
        }
        // Phase B: Power / Frenzy charges on kill.
        if ((killStats.powerOnKillPct || 0) > 0 && Math.random() * 100 < Math.min(100, killStats.powerOnKillPct)) {
            _gainPowerCharge(killStats.powerChargesMax, killStats.powerDurationPct);
        }
        if ((killStats.frenzyOnKillPct || 0) > 0 && Math.random() * 100 < Math.min(100, killStats.frenzyOnKillPct)) {
            _gainFrenzyCharge(killStats.frenzyChargesMax, killStats.frenzyDurationPct);
        }

        if (typeof gainMana === 'function' && globalThis.playerMaxMana > 0 && (killStats.manaOnKill || 0) > 0) {
            gainMana(killStats.manaOnKill);
        }

        if ((killStats.lifeOnKill || 0) > 0 && globalThis.playerCurrentHP > 0 && globalThis.playerCurrentHP < globalThis.playerMaxHP) {
            // Active map run: "#% less Life gained from Kills".
            const recoveryMult = (typeof _egMapKillRecoveryMult === 'function')
                ? _egMapKillRecoveryMult() : 1;
            const lifeGain = Math.round(killStats.lifeOnKill * recoveryMult);
            if (lifeGain > 0) {
                globalThis.playerCurrentHP = Math.min(globalThis.playerMaxHP, globalThis.playerCurrentHP + (globalThis._lifeGain ? globalThis._lifeGain(lifeGain) : (lifeGain)));
                if (typeof _renderPlayerHealth === 'function') globalThis._renderPlayerHealth();
            }
        }

        _treeKillPuzzleLines(dying, killStats);

        if ((killStats.absorptionOnKill || 0) > 0 && typeof _isActive === 'function' && _isActive()) {
            const maxAbsorption = killStats.absorption;
            if (globalThis._playerAbsorptionCurrent < maxAbsorption) {
                globalThis._playerAbsorptionCurrent = Math.min(maxAbsorption, globalThis._playerAbsorptionCurrent + killStats.absorptionOnKill);
            }
        }
    }

    // Experience (hub-leveling.js) - scaled by the monster's level
    if (dying && typeof _grantMonsterXP === 'function') {
        const xpGained = _grantMonsterXP(dying.level, !!dying.isBoss);
        _showXpGainText(monsterId, xpGained);
    }

    setTimeout(() => _renderPanel(), PANEL_RERENDER_DELAY_MS);
}

// Called when the last monster in the encounter is killed.
// Currently intentionally empty - kill toasts handle all feedback.
export function _onAllMonstersDead() { }

// Triggers the game-over sequence when the player's HP reaches zero.
// Number of tips there are (eg_death_hint_1 ... N) and which one comes next,
// so repeated defeats show different advice.
const DEATH_HINT_COUNT = 4;
let _deathHintNext = 0;

// Shows a short "how to get stronger" tip under the defeat message, cycling
// through the tips on each defeat.
function _showDeathHint(subEl) {
    let hint = document.getElementById('lose-hint');
    if (!hint) {
        hint = document.createElement('div');
        hint.id = 'lose-hint';
        hint.className = 'ov-sub lose-hint';
        subEl.insertAdjacentElement('afterend', hint);
    }
    hint.textContent = t('eg_death_hint_' + (_deathHintNext % DEATH_HINT_COUNT + 1));
    _deathHintNext++;
}

export function _gameOver() {
    // Gauntlet arena: dying only forfeits the bonus (the level is already won).
    if (_gauntletOnDefeat()) return;
    if (typeof globalThis.triggerBanter === 'function') globalThis.triggerBanter('player_defeat');
    // Campaign defeat: fall back to the normal lose overlay (retry/levels)
    // instead of the endgame map-failed screen, which routes to the Nexus.
    if (typeof _isCampaignRun === 'function' && _isCampaignRun()) {
        globalThis.dead = true;
        if (typeof stopTimer === 'function') stopTimer();
        if (cur) window.LEVEL_FLAGS.lastFailedGi = cur.gIdx;
        const lose = document.getElementById('ov-lose');
        if (lose) {
            const titleEl = document.getElementById('lose-title');
            const subEl = document.getElementById('lose-sub');
            if (titleEl && typeof t === 'function') titleEl.textContent = t('eg_game_over');
            if (subEl && typeof t === 'function') subEl.textContent = t('eg_monsters_overwhelmed');
            if (subEl) _showDeathHint(subEl);
            lose.classList.add('show');
            if (globalThis.RunStats) globalThis.RunStats.renderInto('lose');
        }
        if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('lose');
        return;
    }
    // Central defeat handler - the player keeps the loot collected so far.
    _endMapDefeated(t('eg_game_over'), t('eg_monsters_overwhelmed'));
}
