/*
    ========================================================================
    ENDGAME-TEST-HUB.JS
    ========================================================================

    Purpose: a lightweight "map select" screen so the endgame combat/loot
    systems (endgame-encounter.js, endgame-encounter-chain.js,
    endgame-player-stats.js, endgame-hub.js) can be tested directly after
    the setup screen, without playing through the full story.

    A "map" here is just a parameter set (monster level, kill count, boss
    presence, puzzle/question requirements, and which puzzles are eligible
    to seed/chain into). Picking a map:
      1. picks a random eligible puzzle from ALL as the seed level
      2. stamps the map's parameters onto that level object
      3. calls startLevel() on it, which (via start-level.js) sees
         isMonsterLevel === true and kicks off _egStartEncounter()
      4. the existing chain system in endgame-encounter-chain.js takes it
         from there (spawns, boss threshold, puzzle chaining, loot, etc.)

    The seed level is flagged isTestMapSeed so _egChainCleanup() (extended
    in endgame-encounter-chain.js) strips all the injected fields back off
    it once the run ends — it returns to being a normal story puzzle.
    ========================================================================
*/

'use strict';


//------------------------------------------------------------------------
//-------------------TEST MAP DEFINITIONS-----------------------------------
//------------------------------------------------------------------------

// Five test maps, roughly increasing in difficulty/juice (PoE-map style).
// puzzlePool criteria are the same shape _egBuildChainPool() already
// understands (minCells/maxCells/minRows/maxRows/minCols/maxCols/worlds/
// excludeWorlds) — see endgame-encounter-chain.js.
const EG_TEST_MAPS = [
    {
        id: 'training_grounds',
        tier: 1,
        icon: '🌱',
        name: 'Training Grounds',
        desc: '---',
        monsterLevel: 3,
        maxMonsters: 5,
        totalMonsters: 20,
        hasBoss: false,
        requiredPuzzles: 3,
        requiredQuestions: 0,
        puzzlePool: { minCells: 10, maxCells: 100 },
        egTimeLimit: 600,     // 10 min baseline, in seconds
        egMaxMistakes: 5,
    },
    {
        id: 'frequency_foothills',
        tier: 3,
        icon: '🌲',
        name: 'Frequency Foothills',
        desc: '---',
        monsterLevel: 15,
        maxMonsters: 5,
        totalMonsters: 30,
        hasBoss: false,
        requiredPuzzles: 5,
        requiredQuestions: 1,
        puzzlePool: { minCells: 10, maxCells: 150 },
        egTimeLimit: 600,     // 10 min baseline, in seconds
        egMaxMistakes: 5,
    },
    {
        id: 'bayesian_depths',
        tier: 6,
        icon: '🌊',
        name: 'Bayesian Depths',
        desc: '',
        monsterLevel: 30,
        maxMonsters: 7,
        totalMonsters: 40,
        hasBoss: true,
        requiredPuzzles: 6,
        requiredQuestions: 1,
        puzzlePool: { minCells: 10, maxCells: 200 },
        egTimeLimit: 600,     // 10 min baseline, in seconds
        egMaxMistakes: 5,
    },
    {
        id: 'null_hypothesis_void',
        tier: 9,
        icon: '🕳️',
        name: 'Null Hypothesis Void',
        desc: '',
        monsterLevel: 45,
        maxMonsters: 7,
        totalMonsters: 50,
        hasBoss: true,
        requiredPuzzles: 8,
        requiredQuestions: 1,
        puzzlePool: { minCells: 10, maxCells: 300 },
        egTimeLimit: 900,     // 15 min baseline, in seconds
        egMaxMistakes: 5,
    },
    {
        id: 'nexus_crucible',
        tier: 12,
        icon: '🌌',
        name: 'The Nexus Crucible',
        desc: '',
        monsterLevel: 60,
        maxMonsters: 10,
        totalMonsters: 60,
        hasBoss: true,
        maxBosses: 2,
        requiredPuzzles: 10,
        requiredQuestions: 2,
        puzzlePool: { minCells: 10 },
        egTimeLimit: 1200,     // 20 min baseline, in seconds
        egMaxMistakes: 10,
    },
];


//------------------------------------------------------------------------
//-------------------SEED PUZZLE SELECTION----------------------------------
//------------------------------------------------------------------------

// Picks a random eligible puzzle (gi) to seed a test map run.
// Reuses _egBuildChainPool() from endgame-encounter-chain.js so the same
// exclusion rules apply (no sandbox levels, no already-map-flagged levels).
// Additionally excludes math-gated levels, since test runs bypass the
// normal gate-check flow entirely.
function _egtPickSeedGi(mapDef) {
    if (typeof _egBuildChainPool !== 'function') return null;

    let pool = _egBuildChainPool(mapDef.puzzlePool || {});
    if (typeof isGatedLevel === 'function') {
        pool = pool.filter(level => !isGatedLevel(level.gIdx));
    }
    if (pool.length === 0) return null;

    return pool[Math.floor(Math.random() * pool.length)].gIdx;
}


//------------------------------------------------------------------------
//-------------------LAUNCH-------------------------------------------------
//------------------------------------------------------------------------

// Stamps a map's parameters onto its chosen seed level and starts it.
// Called from the map card's onclick.
function _egLaunchTestMap(mapId) {
    const mapDef = EG_TEST_MAPS.find(m => m.id === mapId);
    if (!mapDef) return;

    const gi = _egtPickSeedGi(mapDef);
    if (gi === null) {
        showToast(`⚠️ No eligible puzzles found for "${mapDef.name}". Loosen its puzzlePool criteria.`);
        return;
    }

    const level = ALL[gi];
    level.isMonsterLevel = true;
    level.isTestMapSeed = true;   // cleaned up automatically by _egChainCleanup()
    level.monsterLevel = mapDef.monsterLevel;
    level.maxMonsters = mapDef.maxMonsters;
    level.totalMonsters = mapDef.totalMonsters;
    level.hasBoss = mapDef.hasBoss;
    if (mapDef.maxBosses) level.maxBosses = mapDef.maxBosses;
    level.requiredPuzzles = mapDef.requiredPuzzles;
    level.requiredQuestions = mapDef.requiredQuestions;
    level.puzzlePool = mapDef.puzzlePool;
    level.egTimeLimit = mapDef.egTimeLimit;
    level.egMaxMistakes = mapDef.egMaxMistakes;

    // Tells goToLevelSelect() (screens.js) to route back to this hub
    // instead of the normal world/level-select screen when the run ends.
    window._egIsTestRun = true;

    startLevel(gi);
}


//------------------------------------------------------------------------
//-------------------HTML BUILDERS------------------------------------------
//------------------------------------------------------------------------

function _egtBuildMapCardHTML(mapDef) {
    const bossLine = mapDef.hasBoss
        ? `<div class="egt-map-stat">💀 Boss${mapDef.maxBosses > 1 ? ` ×${mapDef.maxBosses}` : ''}</div>`
        : '';
    const questionLine = mapDef.requiredQuestions
        ? `<div class="egt-map-stat">❓ ${mapDef.requiredQuestions} questions</div>`
        : '';

    return `
<div class="egt-map-card" onclick="_egLaunchTestMap('${mapDef.id}')">
    <div class="egt-map-tier">TIER ${mapDef.tier}</div>
    <div class="egt-map-icon">${mapDef.icon}</div>
    <div class="egt-map-name">${mapDef.name}</div>
    <div class="egt-map-stats">
        <div class="egt-map-stat">⚔️ Lv ${mapDef.monsterLevel} · ${mapDef.totalMonsters} kills</div>
        ${bossLine}
        <div class="egt-map-stat">🧩 ${mapDef.requiredPuzzles} puzzles</div>
        ${questionLine}
    </div>
    <div class="egt-map-desc">${mapDef.desc}</div>
    <button class="title-btn egt-enter-btn">▶ RUN MAP</button>
</div>`;
}

function _egtBuildFullScreenHTML() {
    return `
<div class="egt-hub-layout">
    <div class="egt-topbar">
        <button class="title-btn back-btn" onclick="goToPreviousScreen()">◀ BACK</button>
        <span class="egt-topbar-title">🧪 ENDGAME TEST MAPS</span>
        <button class="title-btn sec" onclick="window._egHubReturnScreen='screen-endgame-test-hub'; showEndgameHub();">
            🌌 Stash / Equip
        </button>
    </div>
    <div class="egt-map-grid" id="egt-map-grid">
        ${EG_TEST_MAPS.map(_egtBuildMapCardHTML).join('')}
    </div>
</div>`;
}


//------------------------------------------------------------------------
//-------------------STYLES (INJECTED ONCE)---------------------------------
//------------------------------------------------------------------------
// Injected via JS, same pattern as ensureLSTooltipStyles() in
// screens-level-select.js — avoids needing to touch the (large) main CSS file.

function _egtEnsureStyles() {
    if (document.getElementById('egt-test-hub-style')) return;

    const style = document.createElement('style');
    style.id = 'egt-test-hub-style';
    style.textContent = `
        .egt-hub-layout {
            width: 100%; height: 100%; display: flex; flex-direction: column;
            padding: 16px; box-sizing: border-box; font-family: var(--PX, monospace);
            color: var(--accent2, #e8daef); overflow-y: auto;
        }
        .egt-topbar {
            display: flex; align-items: center; justify-content: space-between;
            margin-bottom: 18px; gap: 10px; flex-wrap: wrap;
        }
        .egt-topbar-title { font-size: 16px; letter-spacing: 2px; color: var(--accent, #c8a84b); }
        .egt-map-grid {
            display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
            gap: 16px;
        }
        .egt-map-card {
            background: rgba(20, 15, 5, 0.6); border: 1px solid var(--accent, #c8a84b);
            border-radius: 6px; padding: 14px; cursor: pointer;
            display: flex; flex-direction: column; gap: 6px;
            transition: transform 0.15s, box-shadow 0.15s;
        }
        .egt-map-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 4px 14px rgba(200, 168, 75, 0.35);
        }
        .egt-map-tier { font-size: 10px; opacity: 0.6; letter-spacing: 1px; }
        .egt-map-icon { font-size: 28px; }
        .egt-map-name { font-size: 13px; color: var(--accent, #c8a84b); }
        .egt-map-stats { display: flex; flex-direction: column; gap: 2px; margin: 4px 0; }
        .egt-map-stat { font-size: 10px; opacity: 0.85; }
        .egt-map-desc { font-size: 9px; opacity: 0.6; line-height: 1.4; flex-grow: 1; }
        .egt-enter-btn { margin-top: 8px; font-size: 10px; padding: 6px; }
    `;
    document.head.appendChild(style);
}


//------------------------------------------------------------------------
//-------------------SCREEN BOOTSTRAP----------------------------------------
//------------------------------------------------------------------------

function _egtCreateScreen() {
    _egtEnsureStyles();
    const screen = document.createElement('div');
    screen.id = 'screen-endgame-test-hub';
    screen.className = 'screen';
    screen.innerHTML = _egtBuildFullScreenHTML();
    document.body.appendChild(screen);
}

function ensureEndgameTestHubScreen() {
    if (!document.getElementById('screen-endgame-test-hub')) _egtCreateScreen();
}

// Entry point — call this to show the map-select screen.
// (History push happens in launchEndgameTestMode() in screens.js on first
// entry; goToLevelSelect() calls this directly to return here after a run.)
function showEndgameTestHub() {
    ensureEndgameTestHubScreen();
    switchScreen('screen-endgame-test-hub');
}