import { _charmTryMonsterDrop } from '../skills/skill-charms.js';
import { _egScheduleRespawn } from './encounter-spawn-scheduler.js';
import { _egTryDropCurrency } from '../loot/loot-currency-drops.js';
import { _egBossDefeated, _egOnAllBossesDead, _egScheduleArenaAdvance, _egUpdateObjectivesHUD } from './encounter-chain.js';
import { _egTryDropEssence } from '../loot/loot-essences-drops.js';
import { _egDropHeartPickup } from './combat-grid-pickups-spawner.js';
import { _egSpawnItemDrop } from './combat-grid-pickups-items.js';
import { _egTryDropMap } from '../loot/loot-map-drops.js';
import { _egIsCampaignRun } from './combat-state.js';

//------------------------------------------------------------------------
//-------------------KILL REWARDS-------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Prevents random monster drops during the tutorial quest.
function _egTutorialSuppressesDrops() {
    try {
        const c = globalThis.cur;
        return !!(c && c.isTutorialQuest);
    } catch (e) { return false; }
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
            && !_egTutorialSuppressesDrops()
            && typeof _egDropHeartPickup === 'function') {
            _egDropHeartPickup();
        }
    } else if (!_egTutorialSuppressesDrops()) {
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
    // Tutorial quest: no random kill drops (see _egTutorialSuppressesDrops
    // above) - the lessons place their own rewards explicitly.
    if (!_egTutorialSuppressesDrops()) {
        if (typeof _egSpawnLootDrop === 'function') globalThis._egSpawnLootDrop(true, dying.level);
        if (typeof _egSpawnItemDrop === 'function') _egSpawnItemDrop(true);
        if (typeof _egTryDropEssence === 'function') _egTryDropEssence(true);
        if (typeof _egTryDropMap === 'function') _egTryDropMap(true, dying.level);
        // Bosses always drop a charm (see skill-charms.js).
        if (typeof _charmTryMonsterDrop === 'function') _charmTryMonsterDrop(true, dying.level);
    }
}
