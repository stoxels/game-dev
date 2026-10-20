//------------------------------------------------------------------------
//-------------------BOSS TEST ARENA LAUNCH-------------------------------
//------------------------------------------------------------------------
// Seed selection, boss-test level stamping, and the single-boss launch path.

import { _spawnNextArenaBoss, _updateObjectivesHUD } from './encounter-chain.js';
import { _buildChainPool } from './encounter-chain-pool.js';
import { _ensureLoseOverlayCombatUI } from './encounter-defeat-overlay.js';
import { _createGeneratedLevel } from './combat-puzzle-generator.js';
import { t } from '../translation/translations.js';
import {
    BOSS_TEST_ARENA_MAX_COLS,
    BOSS_TEST_ARENA_MAX_ROWS,
    BOSS_TEST_ARENA_MIN_CELLS,
    BOSS_TEST_TIME_LIMIT,
    _bossTestLevelForBoss,
} from './combat-boss-test-core.js';

//------------------------------------------------------------------------
//-------------------SEED RESTORE-----------------------------------------
//------------------------------------------------------------------------

// Strips all stamped run fields off the boss-test seed level. Called from
// _chainCleanup() so a story level returns to its pristine state -
// including when the seed is still `cur` (forfeiting mid-first-arena is
// the common case when testing, and there is no same-level retry flow
// that would need the fields preserved).
export function _cleanupBossTestSeedLevel() {
    // Launch guard: _chainCleanup also fires from _stopEncounter
    // during the launch's own startLevel() call - wiping the stamp there
    // would kill the run before the first encounter begins (same pattern
    // as _egMapDeviceLaunching in endgame-map-launch.js).
    if (window._bossTestLaunching) return;

    const seedGi = window._bossTestSeedGi;
    window._bossTestSeedGi = null;
    if (seedGi == null) return;

    const level = (typeof ALL !== 'undefined') ? globalThis.ALL[seedGi] : null;
    if (!level) return;

    delete level.isBossTestSeed;
    delete level.isMonsterLevel;
    delete level.isBossArena;
    ['monsterLevel', 'maxMonsters', 'totalMonsters', 'hasBoss', 'maxBosses',
     'bosses', 'requiredPuzzles', 'requiredQuestions', 'puzzlePool',
     'chainTimeLimit', 'chainMaxMistakes'].forEach(key => delete level[key]);
}

//------------------------------------------------------------------------
//-------------------ARENA SEED PICK--------------------------------------
//------------------------------------------------------------------------

// Picks a small generated puzzle for the test arena. Falls back to a
// small story puzzle when generation is unavailable.
export function _bossTestPickArenaGi() {
    if (typeof _createGeneratedLevel === 'function') {
        const gi = _createGeneratedLevel({
            mode: 'mixed',
            tier: 1,
            maxRows: BOSS_TEST_ARENA_MAX_ROWS,
            maxCols: BOSS_TEST_ARENA_MAX_COLS,
            minCells: BOSS_TEST_ARENA_MIN_CELLS,
        });
        if (gi !== null) return gi;
    }

    if (typeof _buildChainPool === 'function') {
        let pool = _buildChainPool({
            maxRows: BOSS_TEST_ARENA_MAX_ROWS,
            maxCols: BOSS_TEST_ARENA_MAX_COLS,
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
export function _launchBossTest(bossId, level, hpMult) {
    if (typeof BOSS_DEFS === 'undefined' || !globalThis.BOSS_DEFS[bossId]) return;

    const lvl = Math.max(1, Math.min(95, Math.round(level != null ? level : _bossTestLevelForBoss(bossId))));
    const boost = hpMult && hpMult > 1 ? hpMult : 1;

    const gi = _bossTestPickArenaGi();
    if (gi === null) {
        if (typeof showToast === 'function') globalThis.showToast(t('eg_no_more_puzzles'));
        return;
    }

    const seed = globalThis.ALL[gi];
    seed.isMonsterLevel = true;
    seed.isBossTestSeed = true;
    seed.isBossArena = true;
    window._bossTestSeedGi = gi;

    // A boss test is never a campaign trial: drop stale trial routing from
    // an abandoned trial so the leave-map return button routes here again.
    window._campaignTrial = null;
    window._trialReturnWi = null;
    window._trialReturnKind = null;

    seed.monsterLevel = lvl;
    seed.maxMonsters = 0;
    seed.totalMonsters = 0;
    seed.hasBoss = true;
    seed.bosses = [{ id: bossId, level: lvl, hpMult: boost }];
    seed.maxBosses = 1;
    seed.requiredPuzzles = 0;
    seed.requiredQuestions = 0;
    seed.puzzlePool = {};
    seed.chainTimeLimit = BOSS_TEST_TIME_LIMIT;
    delete seed.chainMaxMistakes;      // unlimited mistakes while testing

    // Routes forfeit-via-levels-button back to this screen
    // (see goToLevelSelect in screens.js).
    window._isBossTestRun = true;

    // Lose-overlay hardening so every defeat path inside the test is
    // covered (same call the map device makes on launch).
    if (typeof _ensureLoseOverlayCombatUI === 'function') {
        try { _ensureLoseOverlayCombatUI(); } catch (e) {}
    }

    window._bossTestLaunching = true;
    try {
        globalThis.startLevel(gi);
    } finally {
        window._bossTestLaunching = false;
    }

    // Spawn the chosen boss straight onto this arena - no extra arena
    // transition. _mapDef is already `cur` (set by _resetEncounterState).
    // hpMult rides the queue entry so _spawnNextArenaBoss applies the
    // 500k test boost to the spawned boss (entry.hpMult || 1).
    globalThis._bossPhaseQueue = [{ id: bossId, level: lvl, hpMult: boost, isBossSpawn: true }];
    globalThis._bossTotalCount = 1;
    globalThis._bossKilledCount = 0;
    globalThis._bossPhaseActive = true;

    if (typeof _updateObjectivesHUD === 'function') _updateObjectivesHUD();
    if (typeof _spawnNextArenaBoss === 'function') _spawnNextArenaBoss();
}
