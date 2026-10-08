//------------------------------------------------------------------------
// Encounter campaign-spawn owner: campaign pack budgeting, level stamping,
// and the reusable monsterless/tutorial preparation gates.
//------------------------------------------------------------------------

import { cur } from '../state.js';
import { _egCampaignMonsterLevel } from '../endgame/endgame-leveling.js';
import { EG_MONSTER_DEFS } from './combat-monsters-data.js';
import { EG_PLAYER_STATS } from '../endgame/endgame-player-stats.js';

try { Object.defineProperty(globalThis, '_egClearCampaignLevelFields', { get() { return _egClearCampaignLevelFields; }, set(v) { _egClearCampaignLevelFields = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egShouldPrepareCampaignEncounter', { get() { return _egShouldPrepareCampaignEncounter; }, set(v) { _egShouldPrepareCampaignEncounter = v; }, configurable: true }); } catch (e) {}

//------------------------------------------------------------------------
//-------------------CAMPAIGN MONSTER PACK--------------------------------
//------------------------------------------------------------------------
// Every campaign level spawns a small, gently-tuned pack of monsters so the
// player earns XP and loot while solving. Health is budgeted from the
// puzzle's own "damage economy": each correct fill charges a projectile for
// EG_PLAYER_STATS.baseDamage, so a level with S solution cells can deal
// roughly S x baseDamage over a clean solve. Monsters claim a fraction of
// that, split across the pack, so an un-geared player can still clear them
// before the puzzle completes.
//
// Campaign packs never respawn and never include bosses.
export const EG_CAMPAIGN_MONSTER_CONFIG = {
    hpBudgetFraction: 0.85,   // share of the level's total player damage (~2x, so packs survive ~12 hits each with starter gear instead of ~6)
    minHp: 18,
    countBase: 2,
    countPerWorlds: 4,        // +1 monster every N worlds
    countMax: 5,
    minCellsPerMonster: 6,    // small puzzles support fewer monsters
    damageBase: 6,            // per-hit damage at monster level 1 (was 3 - never threatened 100 HP + starter armour)
    damagePerLevel: 0.32,     // +damage per monster level (was 0.18 - mid-campaign now ramps to ~16 at lvl 30)
    chargeMult: 1.15,         // campaign monsters wind up slightly slower than atlas ones (was 1.35 - too slow + pushback meant they rarely attacked)
};

// Fields _egPrepareCampaignEncounter stamps onto the level object. Listed so
// _egClearCampaignLevelFields can restore the story level to its pristine
// state once the encounter ends (the same level objects are reused as
// endgame map seeds, so nothing may leak).
export const EG_CAMPAIGN_STAMPED_FIELDS = [
    'campaignMonsters', 'campaignMonsterCount', 'campaignMonsterHp',
    'campaignMonsterDamage', 'monsters', 'monsterLevel', 'maxMonsters',
];

// Counts the solution cells (value 1) of the current puzzle.
export function _egCountSolutionCells() {
    if (!cur || !cur.grid) return 0;
    let n = 0;
    for (const row of cur.grid) for (const v of row) if (v === 1) n++;
    return n;
}

// Picks `count` weak monsters for the campaign pack. The pool widens with
// monster level so early worlds stay to fragile creatures while late worlds
// can roll tankier ones (their HP is overridden by the campaign budget
// anyway, but baseId drives the sprite and resistances).
export function _egBuildCampaignMonsterList(count, level) {
    const defs = (typeof EG_MONSTER_DEFS !== 'undefined') ? Object.values(EG_MONSTER_DEFS) : [];
    if (!defs.length) return [];
    const maxBaseHp = level <= 12 ? 40 : level <= 30 ? 80 : level <= 50 ? 130 : 200;
    let pool = defs.filter(d => (d.baseHP || 0) <= maxBaseHp);
    if (!pool.length) pool = defs;
    const list = [];
    for (let i = 0; i < count; i++) {
        const def = pool[Math.floor(Math.random() * pool.length)];
        list.push({ id: def.id, level });
    }
    return list;
}

// Returns true when the current level should run a campaign monster pack.
// Excludes endgame sandbox levels and levels already stamped as map seeds.
// MONSTERLESS runs never prepare an encounter - pure puzzles, no Beasts.
function _egShouldPrepareCampaignEncounter() {
    if (!cur) return false;
    if (typeof globalThis.isMonsterless === 'function' && globalThis.isMonsterless()) return false;
    if (cur.isEndgameSandbox) return false;
    // Active map-device run / sandbox seed - already a monster level that is
    // NOT a campaign level.
    if (cur.isMonsterLevel && !cur.campaignMonsters) return false;
    if (cur.isMapRunSeed) return false;
    if (typeof window !== 'undefined' && window._egIsMapDeviceRun) return false;
    return true;
}

// Stamps the current campaign level with everything the shared encounter loop
// needs (monster list, level, HP/damage budget) and returns true on success.
// Called from start-level.js right before _egStartEncounter().
export function _egPrepareCampaignEncounter() {
    if (!_egShouldPrepareCampaignEncounter()) return false;
    if (typeof globalThis.isMonsterless === 'function' && globalThis.isMonsterless()) return false;
    if (cur.campaignMonsters) return true;   // already prepared (retry / chain)

    const cfg = EG_CAMPAIGN_MONSTER_CONFIG;
    const cells = _egCountSolutionCells();
    const perCellDamage = (typeof EG_PLAYER_STATS !== 'undefined' && EG_PLAYER_STATS.baseDamage) || 10;

    const world = cur.world || 1;
    let count = cfg.countBase + Math.floor((world - 1) / cfg.countPerWorlds);
    count = Math.max(1, Math.min(cfg.countMax, count));
    count = Math.min(count, Math.max(1, Math.floor(cells / cfg.minCellsPerMonster)));

    const budget = cells * perCellDamage * cfg.hpBudgetFraction;
    const perHp = Math.max(cfg.minHp, Math.round(budget / Math.max(1, count)));

    const level = (typeof _egCampaignMonsterLevel === 'function')
        ? _egCampaignMonsterLevel(cur.gIdx) : 1;
    const damage = Math.max(1, Math.round(cfg.damageBase + cfg.damagePerLevel * level));

    cur.campaignMonsters = true;
    cur.isMonsterLevel = true;
    cur.monsterLevel = level;
    cur.maxMonsters = count;
    cur.campaignMonsterCount = count;
    cur.campaignMonsterHp = perHp;
    cur.campaignMonsterDamage = damage;
    cur.monsters = _egBuildCampaignMonsterList(count, level);
    return true;
}

// Restores a campaign level object to its pristine story-level state after
// its encounter ends. Safe to call with a non-campaign level (no-op).
export function _egClearCampaignLevelFields(level) {
    if (!level || !level.campaignMonsters) return;
    EG_CAMPAIGN_STAMPED_FIELDS.forEach(k => { delete level[k]; });
    delete level.isMonsterLevel;
}
