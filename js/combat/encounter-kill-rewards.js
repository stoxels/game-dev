import { CHARM_DROP_CHANCE_NORMAL, _charmTryMonsterDrop } from '../skills/skill-charms.js';
import { rollTetherStoneDrop } from '../skills/summon-cast.js';
import { LOOT_DROP_CHANCE_NORMAL } from './combat-grid-pickups.js';
import { ITEM_DROP_CHANCE_NORMAL } from './combat-grid-pickups-items.js';
import { CURRENCY_DROP_CHANCE_NORMAL } from '../loot/loot-currency-drops.js';
import { ESSENCE_DROP_CHANCE_NORMAL } from '../loot/loot-essences-drops.js';
import { EG_MAP_DROP_CHANCE_NORMAL } from '../loot/loot-map-config.js';
import { _egMapLootQuantityMult } from '../endgame/endgame-map-launch.js';
import { _scheduleRespawn } from './encounter-spawn-scheduler.js';
import { _tryDropCurrency } from '../loot/loot-currency-drops.js';
import { _bossDefeated, _onAllBossesDead, _scheduleArenaAdvance, _updateObjectivesHUD } from './encounter-chain.js';
import { _tryDropEssence } from '../loot/loot-essences-drops.js';
import { _dropHeartPickup } from './combat-grid-pickups-spawner.js';
import { _spawnItemDrop } from './combat-grid-pickups-items.js';
import { _egTryDropMap } from '../loot/loot-map-drops.js';
import { _isCampaignRun } from './combat-state.js';
import { GOLD_DROP_CHANCE_NORMAL, _tryDropGold } from '../loot/loot-gold-drops.js';

//------------------------------------------------------------------------
//-------------------KILL REWARDS-------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Prevents random monster drops during the tutorial quest.
function _tutorialSuppressesDrops() {
    try {
        const c = globalThis.cur;
        return !!(c && c.isTutorialQuest);
    } catch (e) { return false; }
}

// ONE DROP PER CREATURE. A normal kill used to roll every loot bucket
// (equipment, puzzle item, currency, essence, map, charm) independently, so a
// single monster could shower several drops and the board filled with loot.
// Now a kill first rolls "does anything drop" and, if so, picks exactly ONE
// bucket, weighted by each bucket's own base chance (so the relative
// frequencies players know are preserved). Charms and gold coins carry
// deliberately small weights. The chosen bucket's own chance roll is skipped (force = true);
// its other rules (board caps, free cells, level gates) still apply.
const KILL_DROP_CHANCE_NORMAL = 0.6;   // P(something drops) per normal kill

// Late campaign: Tier 1 maps drop from regular monsters in the second half of
// world 12 and in all of worlds 13 and 14 (the Nexus world). This is the main
// way into the endgame now that the vendor no longer sells a free map.
const CAMPAIGN_MAP_DROP_WORLD = 12;   // 1-based first world with map drops (second half only)

// True when the current campaign world allows map drops (looked up from the
// world list).
function _campaignMapDropsOpen() {
    try {
        const c = globalThis.cur;
        const starts = globalThis.WORLD_START_GI;
        const worlds = globalThis.WORLDS;
        if (!c || typeof c.gIdx !== 'number' || !Array.isArray(starts) || !worlds) return false;
        let wi = 0;
        for (let i = 0; i < starts.length; i++) if (starts[i] <= c.gIdx) wi = i;
        const world = wi + 1;
        if (world > CAMPAIGN_MAP_DROP_WORLD) return true;
        if (world < CAMPAIGN_MAP_DROP_WORLD) return false;
        const len = (worlds[wi] && worlds[wi].data && worlds[wi].data.length) || 0;
        return (c.gIdx - starts[wi]) >= Math.floor(len / 2);
    } catch (e) { return false; }
}

// Returns the bucket id to drop, or null for "nothing". `rng` is injectable
// for tests (defaults to Math.random).
export function _rollKillDropBucket(opts, rng) {
    const rand = rng || Math.random;
    const o = opts || {};
    const qty = Math.max(1, Number(o.quantityMult) || 1);
    if (rand() >= Math.min(1, KILL_DROP_CHANCE_NORMAL * qty)) return null;

    const buckets = [
        ['loot', LOOT_DROP_CHANCE_NORMAL],
        ['currency', CURRENCY_DROP_CHANCE_NORMAL],
        ['essence', ESSENCE_DROP_CHANCE_NORMAL],
        ['charm', CHARM_DROP_CHANCE_NORMAL],
        ['gold', GOLD_DROP_CHANCE_NORMAL],
    ];
    // Puzzle items never spawn on Ironman; the passive tree boosts their weight.
    if (!o.ironman) buckets.push(['item', ITEM_DROP_CHANCE_NORMAL * (1 + (Number(o.itemDropPct) || 0) / 100)]);
    // Maps: map runs from level-55+ monsters; in the campaign only in the
    // late worlds (see _campaignMapDropsOpen) and always Tier 1.
    if (o.campaign ? !!o.campaignMapsOpen : (Number(o.monsterLevel) || 0) >= 55) buckets.push(['map', EG_MAP_DROP_CHANCE_NORMAL]);

    const total = buckets.reduce((s, b) => s + b[1], 0);
    let roll = rand() * total;
    for (const [id, w] of buckets) {
        roll -= w;
        if (roll <= 0) return id;
    }
    return buckets[0][0];
}

// Handles all post-kill logic for a normal (non-boss) monster death.
export function _handleNormalMonsterKill(dying) {
    globalThis._chainKillCount++;

    // Campaign kills never feed map objectives or respawns.
    const campaign = (typeof _isCampaignRun === 'function') && _isCampaignRun();
    if (!campaign) _updateObjectivesHUD();

    // Keep the field populated: replacements spawn until the player enters
    // the boss arena (not just until the kill objective is reached - extra
    // kills after the objective are intentional free XP/loot, see
    // _shouldSuppressRespawn).
    if (!campaign) _scheduleRespawn();

    // Sacrificial zombie adds (Brutus) never drop loot - their only reward is
    // a chance to drop a healing heart onto the grid when the PLAYER kills
    // them (a slam-devoured zombie drops nothing; it feeds Brutus instead).
    if (dying && dying.noLoot) {
        const heartChance = dying.zombieHeartDropChance || 0;
        if (heartChance > 0 && Math.random() * 100 < heartChance * 100
            && !_tutorialSuppressesDrops()
            && typeof _dropHeartPickup === 'function') {
            _dropHeartPickup();
        }
    } else if (!_tutorialSuppressesDrops()) {
        let itemDropPct = 0;
        try {
            if (typeof globalThis._computePlayerStats === 'function') {
                itemDropPct = Number(globalThis._computePlayerStats().itemDropPct) || 0;
            }
        } catch (e) { /* tree bonus is best-effort */ }
        const bucket = _rollKillDropBucket({
            quantityMult: (typeof _egMapLootQuantityMult === 'function') ? _egMapLootQuantityMult() : 1,
            ironman: !!(typeof globalThis.curMods !== 'undefined' && globalThis.curMods && globalThis.curMods.ironman),
            itemDropPct,
            campaign,
            campaignMapsOpen: campaign && _campaignMapDropsOpen(),
            monsterLevel: dying.level,
        });
        switch (bucket) {
            case 'loot': if (typeof globalThis._spawnLootDrop === 'function') globalThis._spawnLootDrop(false, dying.level, true); break;
            case 'item': if (typeof _spawnItemDrop === 'function') _spawnItemDrop(false, true); break;
            case 'currency': if (typeof _tryDropCurrency === 'function') _tryDropCurrency(false, true); break;
            case 'essence': if (typeof _tryDropEssence === 'function') _tryDropEssence(false, true); break;
            case 'map':
                if (typeof _egTryDropMap === 'function') {
                    if (campaign) _egTryDropMap(false, dying.level, true, { campaignTier1: true });
                    else _egTryDropMap(false, dying.level, true);
                }
                break;
            case 'charm': if (typeof _charmTryMonsterDrop === 'function') _charmTryMonsterDrop(false, dying.level, true); break;
            case 'gold': _tryDropGold(false, dying.level, true); break;
            default: break;
        }
        // Tether Stones (pay for Summon charms) drop on top of the normal roll.
        rollTetherStoneDrop(false);
    }
}

// Handles all post-kill logic for a boss monster death.
// During the boss arena chain this advances the chain: more bosses left →
// roll into the next arena; last boss dead → loot party + Complete Map.
export function _handleBossKill(dying) {
    if (typeof _bossPhaseActive !== 'undefined' && globalThis._bossPhaseActive) {
        globalThis._bossKilledCount++;

        const allDead = typeof _bossDefeated === 'function' && _bossDefeated();
        if (allDead) {
            if (typeof _onAllBossesDead === 'function') _onAllBossesDead();
        } else if (typeof _scheduleArenaAdvance === 'function') {
            _scheduleArenaAdvance();
        }
    }

    _updateObjectivesHUD();
    // Tutorial quest: no random kill drops (see _tutorialSuppressesDrops
    // above) - the lessons place their own rewards explicitly.
    if (!_tutorialSuppressesDrops()) {
        if (typeof _spawnLootDrop === 'function') globalThis._spawnLootDrop(true, dying.level);
        if (typeof _spawnItemDrop === 'function') _spawnItemDrop(true);
        if (typeof _tryDropEssence === 'function') _tryDropEssence(true);
        if (typeof _egTryDropMap === 'function') _egTryDropMap(true, dying.level);
        // Bosses always drop a charm (see skill-charms.js).
        if (typeof _charmTryMonsterDrop === 'function') _charmTryMonsterDrop(true, dying.level);
        // ...and a boss coin worth several regular ones.
        _tryDropGold(true, dying.level, true);
        rollTetherStoneDrop(true);
    }
}
