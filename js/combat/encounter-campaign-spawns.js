//------------------------------------------------------------------------
// Encounter campaign-spawn owner: campaign pack budgeting, level stamping,
// and the reusable monsterless/tutorial preparation gates.
//------------------------------------------------------------------------

import { cur } from '../state.js';
import { _campaignMonsterLevel } from '../endgame/endgame-leveling.js';
import { MONSTER_DEFS } from './combat-monsters-data.js';

try { Object.defineProperty(globalThis, '_clearCampaignLevelFields', { get() { return _clearCampaignLevelFields; }, set(v) { _clearCampaignLevelFields = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_shouldPrepareCampaignEncounter', { get() { return _shouldPrepareCampaignEncounter; }, set(v) { _shouldPrepareCampaignEncounter = v; }, configurable: true }); } catch (e) {}

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
export const CAMPAIGN_MONSTER_CONFIG = {
    // Per-monster HP = refHit(level) * hitsToKill * early ramp * spread.
    // refHit anchors [level, best single-action damage] were measured from
    // real character exports (L7 geared 138, L10 spell build 176, L42 melee
    // build 370); between anchors it is linear, past the last it keeps
    // refHitSlopeBeyond per level. L1 is the un-geared base spell (22).
    // Balance pass: anchors past L42 follow the high-level target (average geared
    // build ~11k per main action at L90, so a campaign monster ~33k).
    refHitAnchors: [[1, 22], [7, 138], [10, 176], [42, 370], [50, 520], [68, 1200], [80, 4500], [90, 11000]],
    refHitSlopeBeyond: 300,
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
    // Raw per-hit damage is LEVEL-driven, never a share of the player's own
    // life (that made every point of max life raise the damage taken, so life
    // never paid off and gear could not be balanced). Anchors are the old
    // "14% of max life" floor evaluated for a level-appropriate character
    // (about 150 + 10 life per level), so the reference fight feels the same;
    // a character with more life or better defences now simply takes less
    // than before. Linear between anchors, refDamageSlopeBeyond per level
    // past the last. Retune the anchors, not the formula.
    refDamageAnchors: [[1, 17], [6, 27], [12, 38], [30, 63], [50, 91], [90, 147]],
    refDamageSlopeBeyond: 2.5,
    chargeMult: 0.65,         // campaign monsters wind up as fast as atlas ones (pass 2: was 1.15; player hits already push the bar back)
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
export function _earlyEaseBlend(level) {
    const n = Math.max(2, CAMPAIGN_MONSTER_CONFIG.earlyEaseLevels);
    return Math.max(0, Math.min(1, 1 - (Math.max(1, Number(level) || 1) - 1) / (n - 1)));
}

// Best single-action damage of a level-appropriate character (see
// refHitAnchors). Gear-independent by design.
function _campaignRefHit(level) {
    const cfg = CAMPAIGN_MONSTER_CONFIG;
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

// Raw per-hit damage of a campaign monster at `level` (see refDamageAnchors).
// Shared with the gauntlet arena, which scales it by its own share.
export function _campaignRefDamage(level) {
    const cfg = CAMPAIGN_MONSTER_CONFIG;
    const pts = cfg.refDamageAnchors;
    const l = Math.max(1, Number(level) || 1);
    if (l <= pts[0][0]) return pts[0][1];
    for (let i = 0; i < pts.length - 1; i++) {
        const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
        if (l <= x1) return y0 + (y1 - y0) * (l - x0) / (x1 - x0);
    }
    const [xn, yn] = pts[pts.length - 1];
    return yn + cfg.refDamageSlopeBeyond * (l - xn);
}

// Fields _prepareCampaignEncounter stamps onto the level object. Listed so
// _clearCampaignLevelFields can restore the story level to its pristine
// state once the encounter ends (the same level objects are reused as
// endgame map seeds, so nothing may leak).
export const CAMPAIGN_STAMPED_FIELDS = [
    'campaignMonsters', 'campaignMonsterCount', 'campaignMonsterHp',
    'campaignMonsterDamage', 'monsters', 'monsterLevel', 'maxMonsters',
];

// Counts the solution cells (value 1) of the current puzzle.
export function _countSolutionCells() {
    if (!cur || !cur.grid) return 0;
    let n = 0;
    for (const row of cur.grid) for (const v of row) if (v === 1) n++;
    return n;
}

// Picks `count` weak monsters for the campaign pack. The pool widens with
// monster level so early worlds stay to fragile creatures while late worlds
// can roll tankier ones (their HP is overridden by the campaign budget
// anyway, but baseId drives the sprite and resistances).
export function _buildCampaignMonsterList(count, level) {
    const defs = (typeof MONSTER_DEFS !== 'undefined') ? Object.values(MONSTER_DEFS) : [];
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
function _shouldPrepareCampaignEncounter() {
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
// Called from start-level.js right before _startEncounter().
export function _prepareCampaignEncounter() {
    if (!_shouldPrepareCampaignEncounter()) return false;
    if (typeof globalThis.isMonsterless === 'function' && globalThis.isMonsterless()) return false;
    if (cur.campaignMonsters) return true;   // already prepared (retry / chain)

    const cfg = CAMPAIGN_MONSTER_CONFIG;
    const cells = _countSolutionCells();
    const level = (typeof _campaignMonsterLevel === 'function')
        ? _campaignMonsterLevel(cur.gIdx) : 1;
    const world = cur.world || 1;
    let count = cfg.countBase + Math.floor((world - 1) / cfg.countPerWorlds);
    count = Math.max(1, Math.min(cfg.countMax, count));
    count += Math.min(cfg.sizeBonusMax, Math.floor(cells / cfg.cellsPerExtraMonster));
    count = Math.min(count, cfg.earlyCountBase + Math.ceil(level / cfg.earlyCountLevelDivisor));
    count = Math.min(count, Math.max(1, Math.floor(cells / cfg.minCellsPerMonster)));

    const ramp = Math.max(0, Math.min(1, (level - 1) / Math.max(1, cfg.earlyHpRampLevels)));
    const hits = cfg.hitsToKill * (cfg.earlyHitsFraction + (1 - cfg.earlyHitsFraction) * ramp);
    const perHp = Math.max(cfg.minHp, Math.round(_campaignRefHit(level) * hits));
    const easeDamage = 1 - (1 - cfg.earlyDamageMult) * _earlyEaseBlend(level);
    const damage = Math.max(1, Math.round(_campaignRefDamage(level) * easeDamage));

    cur.campaignMonsters = true;
    cur.isMonsterLevel = true;
    cur.monsterLevel = level;
    cur.maxMonsters = count;
    cur.campaignMonsterCount = count;
    cur.campaignMonsterHp = perHp;
    cur.campaignMonsterDamage = damage;
    cur.monsters = _buildCampaignMonsterList(count, level);
    return true;
}

// Restores a campaign level object to its pristine story-level state after
// its encounter ends. Safe to call with a non-campaign level (no-op).
export function _clearCampaignLevelFields(level) {
    if (!level || !level.campaignMonsters) return;
    CAMPAIGN_STAMPED_FIELDS.forEach(k => { delete level[k]; });
    delete level.isMonsterLevel;
}
