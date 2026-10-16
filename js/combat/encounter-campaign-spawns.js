//------------------------------------------------------------------------
// Encounter campaign-spawn owner: campaign pack budgeting, level stamping,
// and the reusable monsterless/tutorial preparation gates.
//------------------------------------------------------------------------

import { cur } from '../state.js';
import { _egCampaignMonsterLevel } from '../endgame/endgame-leveling.js';
import { EG_MONSTER_DEFS } from './combat-monsters-data.js';

try { Object.defineProperty(globalThis, '_egClearCampaignLevelFields', { get() { return _egClearCampaignLevelFields; }, set(v) { _egClearCampaignLevelFields = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egShouldPrepareCampaignEncounter', { get() { return _egShouldPrepareCampaignEncounter; }, set(v) { _egShouldPrepareCampaignEncounter = v; }, configurable: true }); } catch (e) {}

//------------------------------------------------------------------------
//-------------------CAMPAIGN MONSTER PACK--------------------------------
//------------------------------------------------------------------------
// Every campaign level spawns a small, gently-tuned pack of monsters so the
// player earns XP and loot while solving. Health is purely LEVEL-driven:
// each monster survives `hitsToKill` full-power actions (a spell cast or a
// charged melee strike) of a level-appropriate character. It does not look
// at the puzzle size, the pack size or the player's gear: projectile reveals,
// spells and melee are all valid ways to deal damage, so no single one of
// them may set the budget (the old projectile-only budget made melee and
// spell builds delete every pack).
//
// Campaign packs never respawn and never include bosses.
export const EG_CAMPAIGN_MONSTER_CONFIG = {
    // Per-monster HP = refHit(level) * hitsToKill * early ramp * spread.
    // refHit anchors [level, best single-action damage] were measured from
    // real character exports (L7 geared 138, L10 spell build 176, L42 melee
    // build 370); between anchors it is linear, past the last it keeps
    // refHitSlopeBeyond per level. L1 is the un-geared base spell (22).
    refHitAnchors: [[1, 22], [7, 138], [10, 176], [42, 370]],
    refHitSlopeBeyond: 6,
    hitsToKill: 3,             // full actions a monster survives
    earlyHitsFraction: 0.65,   // level-1 share of hitsToKill; ramps to 1 by earlyHpRampLevels (tutorial now hands out sword, bow, coat, greaves + Renewal)
    earlyHpRampLevels: 24,
    minHp: 18,
    countBase: 3,
    countPerWorlds: 3,        // +1 monster every N worlds
    countMax: 7,
    // Large puzzles run long, so they get extra monsters: +1 per this many
    // solution cells (up to sizeBonusMax) on top of the world count, beyond
    // countMax. Pack size never changes per-monster HP.
    cellsPerExtraMonster: 35,
    sizeBonusMax: 4,
    // Early packs stay small whatever the puzzle size: count <= base + ceil(level / divisor)
    // (4 at L1-4, 5 at L5-8, 6 at L9-12 ... the world count takes over later).
    earlyCountBase: 3,
    earlyCountLevelDivisor: 4,
    minCellsPerMonster: 5,    // small puzzles support fewer monsters
    damageBase: 9,            // per-hit damage at monster level 1 (pass 2: was 6)
    damagePerLevel: 0.62,     // +damage per monster level (pass 2: was 0.32)
    chargeMult: 0.65,         // campaign monsters wind up as fast as atlas ones (pass 2: was 1.15; player hits already push the bar back)
    // Damage floor as a share of the player's max life: a level-7 character
    // with 280 life, 78 armour and parry could idle next to a lone 10-damage
    // monster forever. Raw hit = max(curve, share * maxHP), capped at
    // damageHpCapMult x the curve so tiny levels never spike.
    // The share ramps in from damageHpShareEarly at monster level 1 to
    // damageHpShare at damageHpShareRampLevels, so a fresh character with
    // little life is not chunked by a share sized for a level-7 build.
    damageHpShareEarly: 0.14,   // = damageHpShare: no early ramp (tutorial now hands out gear + Renewal)
    damageHpShare: 0.14,
    damageHpShareRampLevels: 12,
    damageHpCapMult: 4,
    // Early-game ease (playtest feedback: the first worlds felt rough for
    // newcomers, yet fixed starter gear overshot for experienced players).
    // The first monster levels hit softer and wind up slower; both ease
    // linearly back to 1.0 at earlyEaseLevels, so nothing changes later.
    earlyEaseLevels: 10,
    earlyDamageMult: 1.0,     // monster level 1 damage multiplier (1 = ease off; was 0.9)
    earlyChargeSlow: 1.0,     // monster level 1 charge-time multiplier (1 = ease off; was 1.15)
};

// Multiplier (0..1 blend) for the early-game ease: 1 at monster level 1,
// falling to 0 at earlyEaseLevels. Exported for the charge path and tests.
export function _egEarlyEaseBlend(level) {
    const n = Math.max(2, EG_CAMPAIGN_MONSTER_CONFIG.earlyEaseLevels);
    return Math.max(0, Math.min(1, 1 - (Math.max(1, Number(level) || 1) - 1) / (n - 1)));
}

// Best single-action damage of a level-appropriate character (see
// refHitAnchors). Gear-independent by design.
function _egCampaignRefHit(level) {
    const cfg = EG_CAMPAIGN_MONSTER_CONFIG;
    const pts = cfg.refHitAnchors;
    const l = Math.max(1, Number(level) || 1);
    if (l <= pts[0][0]) return pts[0][1];
    for (let i = 0; i < pts.length - 1; i++) {
        const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
        if (l <= x1) return y0 + (y1 - y0) * (l - x0) / (x1 - x0);
    }
    const [xn, yn] = pts[pts.length - 1];
    return yn + cfg.refHitSlopeBeyond * (l - xn);
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
    const level = (typeof _egCampaignMonsterLevel === 'function')
        ? _egCampaignMonsterLevel(cur.gIdx) : 1;
    const world = cur.world || 1;
    let count = cfg.countBase + Math.floor((world - 1) / cfg.countPerWorlds);
    count = Math.max(1, Math.min(cfg.countMax, count));
    count += Math.min(cfg.sizeBonusMax, Math.floor(cells / cfg.cellsPerExtraMonster));
    count = Math.min(count, cfg.earlyCountBase + Math.ceil(level / cfg.earlyCountLevelDivisor));
    count = Math.min(count, Math.max(1, Math.floor(cells / cfg.minCellsPerMonster)));

    const ramp = Math.max(0, Math.min(1, (level - 1) / Math.max(1, cfg.earlyHpRampLevels)));
    const hits = cfg.hitsToKill * (cfg.earlyHitsFraction + (1 - cfg.earlyHitsFraction) * ramp);
    const perHp = Math.max(cfg.minHp, Math.round(_egCampaignRefHit(level) * hits));
    const curveDamage = cfg.damageBase + cfg.damagePerLevel * level;
    const maxHp = Number(globalThis.playerMaxHP) || 0;
    const shareT = Math.max(0, Math.min(1, (level - 1) / Math.max(1, cfg.damageHpShareRampLevels - 1)));
    const hpShare = cfg.damageHpShareEarly + (cfg.damageHpShare - cfg.damageHpShareEarly) * shareT;
    const floorDamage = Math.min(curveDamage * cfg.damageHpCapMult, maxHp * hpShare);
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
