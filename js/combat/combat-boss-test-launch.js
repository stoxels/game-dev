//------------------------------------------------------------------------
//-------------------BOSS TEST ARENA LAUNCH-------------------------------
//------------------------------------------------------------------------
// Seed selection, boss-test level stamping, and the single-boss launch path.

import { _egSpawnNextArenaBoss, _egUpdateObjectivesHUD } from './encounter-chain.js';
import { _egBuildChainPool } from './encounter-chain-pool.js';
import { _egEnsureLoseOverlayEndgameUI } from './encounter-defeat-overlay.js';
import { _egCreateGeneratedLevel } from './combat-puzzle-generator.js';
import { t } from '../translation/translations.js';
import {
    EG_BOSS_TEST_ARENA_MAX_COLS,
    EG_BOSS_TEST_ARENA_MAX_ROWS,
    EG_BOSS_TEST_ARENA_MIN_CELLS,
    EG_BOSS_TEST_TIME_LIMIT,
    _egbtLevelForBoss,
} from './combat-boss-test-core.js';

//------------------------------------------------------------------------
//-------------------SEED RESTORE-----------------------------------------
//------------------------------------------------------------------------

// Strips all stamped run fields off the boss-test seed level. Called from
// _egChainCleanup() so a story level returns to its pristine state -
// including when the seed is still `cur` (forfeiting mid-first-arena is
// the common case when testing, and there is no same-level retry flow
// that would need the fields preserved).
export function _egCleanupBossTestSeedLevel() {
    // Launch guard: _egChainCleanup also fires from _egStopEncounter
    // during the launch's own startLevel() call - wiping the stamp there
    // would kill the run before the first encounter begins (same pattern
    // as _egMapDeviceLaunching in endgame-map-launch.js).
    if (window._egBossTestLaunching) return;

    const seedGi = window._egBossTestSeedGi;
    window._egBossTestSeedGi = null;
    if (seedGi == null) return;

    const level = (typeof ALL !== 'undefined') ? globalThis.ALL[seedGi] : null;
    if (!level) return;

    delete level.isBossTestSeed;
    delete level.isMonsterLevel;
    delete level.isBossArena;
    ['monsterLevel', 'maxMonsters', 'totalMonsters', 'hasBoss', 'maxBosses',
     'bosses', 'requiredPuzzles', 'requiredQuestions', 'puzzlePool',
     'egTimeLimit', 'egMaxMistakes'].forEach(key => delete level[key]);
}

//------------------------------------------------------------------------
//-------------------ARENA SEED PICK--------------------------------------
//------------------------------------------------------------------------

// Picks a small generated puzzle for the test arena. Falls back to a
// small story puzzle when generation is unavailable.
export function _egbtPickArenaGi() {
    if (typeof _egCreateGeneratedLevel === 'function') {
        const gi = _egCreateGeneratedLevel({
            mode: 'mixed',
            tier: 1,
            maxRows: EG_BOSS_TEST_ARENA_MAX_ROWS,
            maxCols: EG_BOSS_TEST_ARENA_MAX_COLS,
            minCells: EG_BOSS_TEST_ARENA_MIN_CELLS,
        });
        if (gi !== null) return gi;
    }

    if (typeof _egBuildChainPool === 'function') {
        let pool = _egBuildChainPool({
            maxRows: EG_BOSS_TEST_ARENA_MAX_ROWS,
            maxCols: EG_BOSS_TEST_ARENA_MAX_COLS,
            avoidRecent: false,
        });
        if (typeof isGatedLevel === 'function') {
            pool = pool.filter(level => !globalThis.isGatedLevel(level.gIdx));
        }
        if (pool.length > 0) {
            return pool[Math.floor(Math.random() * pool.length)].gIdx;
        }
    }

    return null;
}


//------------------------------------------------------------------------
//-------------------LAUNCH------------------------------------------------
//------------------------------------------------------------------------

// Starts a single-boss test fight. Called from a boss card's onclick.
// Falls back to the boss's tier level when no explicit level is passed.
// hpMult: optional multiplier applied to boss max HP only (e.g., ~500k HP
// test mode). Damage is left at its normal scaled value.
export function _egLaunchBossTest(bossId, level, hpMult) {
    if (typeof EG_BOSS_DEFS === 'undefined' || !globalThis.EG_BOSS_DEFS[bossId]) return;

    const lvl = Math.max(1, Math.min(95, Math.round(level != null ? level : _egbtLevelForBoss(bossId))));
    const boost = hpMult && hpMult > 1 ? hpMult : 1;

    const gi = _egbtPickArenaGi();
    if (gi === null) {
        if (typeof showToast === 'function') globalThis.showToast(t('eg_no_more_puzzles'));
        return;
    }

    const seed = globalThis.ALL[gi];
    seed.isMonsterLevel = true;
    seed.isBossTestSeed = true;
    seed.isBossArena = true;
    window._egBossTestSeedGi = gi;

    // A boss test is never a campaign trial: drop stale trial routing from
    // an abandoned trial so the leave-map return button routes here again.
    window._egCampaignTrial = null;
    window._egTrialReturnWi = null;
    window._egTrialReturnKind = null;

    seed.monsterLevel = lvl;
    seed.maxMonsters = 0;
    seed.totalMonsters = 0;
    seed.hasBoss = true;
    seed.bosses = [{ id: bossId, level: lvl, hpMult: boost }];
    seed.maxBosses = 1;
    seed.requiredPuzzles = 0;
    seed.requiredQuestions = 0;
    seed.puzzlePool = {};
    seed.egTimeLimit = EG_BOSS_TEST_TIME_LIMIT;
    delete seed.egMaxMistakes;      // unlimited mistakes while testing

    // Routes forfeit-via-levels-button back to this screen
    // (see goToLevelSelect in screens.js).
    window._egIsBossTestRun = true;

    // Lose-overlay hardening so every defeat path inside the test is
    // covered (same call the map device makes on launch).
    if (typeof _egEnsureLoseOverlayEndgameUI === 'function') {
        try { _egEnsureLoseOverlayEndgameUI(); } catch (e) {}
    }

    window._egBossTestLaunching = true;
    try {
        globalThis.startLevel(gi);
    } finally {
        window._egBossTestLaunching = false;
    }

    // Spawn the chosen boss straight onto this arena - no extra arena
    // transition. _egMapDef is already `cur` (set by _egResetEncounterState).
    // hpMult rides the queue entry so _egSpawnNextArenaBoss applies the
    // 500k test boost to the spawned boss (entry.hpMult || 1).
    globalThis._egBossPhaseQueue = [{ id: bossId, level: lvl, hpMult: boost, isBossSpawn: true }];
    globalThis._egBossTotalCount = 1;
    globalThis._egBossKilledCount = 0;
    globalThis._egBossPhaseActive = true;

    if (typeof _egUpdateObjectivesHUD === 'function') _egUpdateObjectivesHUD();
    if (typeof _egSpawnNextArenaBoss === 'function') _egSpawnNextArenaBoss();
}
