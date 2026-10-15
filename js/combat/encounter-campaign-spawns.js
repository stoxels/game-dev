//------------------------------------------------------------------------
// Encounter campaign-spawn owner: campaign pack budgeting, level stamping,
// and the reusable monsterless/tutorial preparation gates.
//------------------------------------------------------------------------

import { cur } from '../state.js';
import { _egCampaignMonsterLevel } from '../endgame/endgame-leveling.js';
import { EG_MONSTER_DEFS } from './combat-monsters-data.js';
import { EG_PLAYER_STATS, _egComputePlayerStats } from '../endgame/endgame-player-stats.js';

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
    earlyHpBudgetFraction: 0.8, // level-1 share; ramps up to hpBudgetFraction (tuning pass 1: big early puzzles were HP spikes)
    earlyHpRampLevels: 24,       // monster level at which the full share applies
    hpBudgetFraction: 1.05,   // share of the level's total player damage (~2x, so packs survive ~12 hits each with starter gear instead of ~6)
    minHp: 18,
    // Gear awareness (pass 2): the HP budget used to assume the un-geared
    // base hit, so a level-7 character with a Light Bow (3-4x the base hit)
    // one- or two-shot everything and late bows (15x) made packs trivial.
    // The budget now follows the player's EXPECTED projectile hit, raised to
    // this power so gear still feels strong without deleting the monsters
    // (1 = monsters always take the same number of hits, 0 = old behaviour).
    gearScaleExponent: 0.85,
    countBase: 3,
    countPerWorlds: 3,        // +1 monster every N worlds
    countMax: 7,
    // Large puzzles run long, so they get extra monsters: +1 per this many
    // solution cells (up to sizeBonusMax) on top of the world count, beyond
    // countMax.
    cellsPerExtraMonster: 35,
    sizeBonusMax: 4,
    minCellsPerMonster: 5,    // small puzzles support fewer monsters
    damageBase: 9,            // per-hit damage at monster level 1 (pass 2: was 6)
    damagePerLevel: 0.62,     // +damage per monster level (pass 2: was 0.32)
    chargeMult: 0.65,         // campaign monsters wind up as fast as atlas ones (pass 2: was 1.15; player hits already push the bar back)
    // Damage floor as a share of the player's max life: a level-7 character
    // with 280 life, 78 armour and parry could idle next to a lone 10-damage
    // monster forever. Raw hit = max(curve, share * maxHP), capped at
    // damageHpCapMult x the curve so tiny levels never spike.
    damageHpShare: 0.14,
    damageHpCapMult: 4,
    // Early-game ease (playtest feedback: the first worlds felt rough for
    // newcomers, yet fixed starter gear overshot for experienced players).
    // The first monster levels hit softer and wind up slower; both ease
    // linearly back to 1.0 at earlyEaseLevels, so nothing changes later.
    earlyEaseLevels: 10,
    earlyDamageMult: 0.75,    // monster level 1 damage multiplier
    earlyChargeSlow: 1.3,     // monster level 1 charge-time multiplier
};

// Multiplier (0..1 blend) for the early-game ease: 1 at monster level 1,
// falling to 0 at earlyEaseLevels. Exported for the charge path and tests.
export function _egEarlyEaseBlend(level) {
    const n = Math.max(2, EG_CAMPAIGN_MONSTER_CONFIG.earlyEaseLevels);
    return Math.max(0, Math.min(1, 1 - (Math.max(1, Number(level) || 1) - 1) / (n - 1)));
}

// Expected (non-random, non-crit) projectile hit of the current character:
// base + average flat gear damage, with the physical / elemental / generic /
// projectile "increased" buckets applied the way _egCalcPlayerDamage does.
function _egExpectedProjectileHit() {
    const base = (EG_PLAYER_STATS && EG_PLAYER_STATS.baseDamage) || 10;
    try {
        const st = _egComputePlayerStats() || {};
        const mid = (a, b) => ((Number(a) || 0) + (Number(b) || 0)) / 2;
        const phys = (base + mid(st.physFlatMin, st.physFlatMax)) * (1 + (Number(st.physIncPct) || 0) / 100);
        const elem = (mid(st.fireDmgMin, st.fireDmgMax) + mid(st.coldDmgMin, st.coldDmgMax)
            + mid(st.lightningDmgMin, st.lightningDmgMax) + mid(st.shadowDmgMin, st.shadowDmgMax))
            * (1 + ((Number(st.elementalDamageIncPct) || 0) + (Number(st.projectileElementalDamageIncPct) || 0)) / 100);
        const total = (phys + elem)
            * (1 + (Number(st.damageIncPct) || 0) / 100)
            * (1 + (Number(st.projectileDamageIncPct) || 0) / 100);
        return Math.max(base, total);
    } catch (e) {
        return base;
    }
}

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
    const baseHit = (typeof EG_PLAYER_STATS !== 'undefined' && EG_PLAYER_STATS.baseDamage) || 10;
    const gearRatio = Math.max(1, _egExpectedProjectileHit() / baseHit);
    const perCellDamage = baseHit * Math.pow(gearRatio, cfg.gearScaleExponent);

    const world = cur.world || 1;
    let count = cfg.countBase + Math.floor((world - 1) / cfg.countPerWorlds);
    count = Math.max(1, Math.min(cfg.countMax, count));
    count += Math.min(cfg.sizeBonusMax, Math.floor(cells / cfg.cellsPerExtraMonster));
    count = Math.min(count, Math.max(1, Math.floor(cells / cfg.minCellsPerMonster)));

    const level = (typeof _egCampaignMonsterLevel === 'function')
        ? _egCampaignMonsterLevel(cur.gIdx) : 1;
    const ramp = Math.max(0, Math.min(1, (level - 1) / Math.max(1, cfg.earlyHpRampLevels)));
    const fraction = cfg.earlyHpBudgetFraction + (cfg.hpBudgetFraction - cfg.earlyHpBudgetFraction) * ramp;
    const budget = cells * perCellDamage * fraction;
    const perHp = Math.max(cfg.minHp, Math.round(budget / Math.max(1, count)));
    const curveDamage = cfg.damageBase + cfg.damagePerLevel * level;
    const maxHp = Number(globalThis.playerMaxHP) || 0;
    const floorDamage = Math.min(curveDamage * cfg.damageHpCapMult, maxHp * cfg.damageHpShare);
    const easeDamage = 1 - (1 - cfg.earlyDamageMult) * _egEarlyEaseBlend(level);
    const damage = Math.max(1, Math.round(Math.max(curveDamage, floorDamage) * easeDamage));

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
