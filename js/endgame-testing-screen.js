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
        egTimeLimit: 900,     // 15 min baseline, in seconds
        egMaxMistakes: 5,
    },


    {
        id: 'training_grounds2',
        tier: 2,
        icon: '🌱',
        name: 'Training Grounds 2',
        desc: '---',
        monsterLevel: 10,
        maxMonsters: 5,
        totalMonsters: 20,
        hasBoss: false,
        requiredPuzzles: 3,
        requiredQuestions: 0,
        puzzlePool: { minCells: 10, maxCells: 150 },
        egTimeLimit: 900,     // 10 min baseline, in seconds
        egMaxMistakes: 5,
    },

    {
        id: 'training_grounds3',
        tier: 3,
        icon: '🌱',
        name: 'Training Grounds 3',
        desc: '---',
        monsterLevel: 15,
        maxMonsters: 5,
        totalMonsters: 20,
        hasBoss: false,
        requiredPuzzles: 3,
        requiredQuestions: 0,
        puzzlePool: { minCells: 10, maxCells: 150 },
        egTimeLimit: 900,     // 10 min baseline, in seconds
        egMaxMistakes: 5,
    },

    {
        id: 'training_grounds4',
        tier: 4,
        icon: '🌱',
        name: 'Training Grounds 4',
        desc: '---',
        monsterLevel: 20,
        maxMonsters: 5,
        totalMonsters: 25,
        hasBoss: false,
        requiredPuzzles: 3,
        requiredQuestions: 0,
        puzzlePool: { minCells: 10, maxCells: 150 },
        egTimeLimit: 900,     // 10 min baseline, in seconds
        egMaxMistakes: 5,
    },

    {
        id: 'training_grounds5',
        tier: 5,
        icon: '🌱',
        name: 'Training Grounds 5',
        desc: '---',
        monsterLevel: 25,
        maxMonsters: 5,
        totalMonsters: 25,
        hasBoss: false,
        requiredPuzzles: 3,
        requiredQuestions: 0,
        puzzlePool: { minCells: 10, maxCells: 150 },
        egTimeLimit: 900,     // 10 min baseline, in seconds
        egMaxMistakes: 7,
    },

    {
        id: 'training_grounds6',
        tier: 6,
        icon: '🌱',
        name: 'Training Grounds 6',
        desc: '---',
        monsterLevel: 30,
        maxMonsters: 6,
        totalMonsters: 25,
        hasBoss: false,
        requiredPuzzles: 3,
        requiredQuestions: 0,
        puzzlePool: { minCells: 10, maxCells: 150 },
        egTimeLimit: 900,     // 10 min baseline, in seconds
        egMaxMistakes: 7,
    },

    {
        id: 'training_grounds7',
        tier: 7,
        icon: '🌱',
        name: 'Training Grounds 7',
        desc: '---',
        monsterLevel: 35,
        maxMonsters: 6,
        totalMonsters: 25,
        hasBoss: false,
        requiredPuzzles: 3,
        requiredQuestions: 0,
        puzzlePool: { minCells: 10, maxCells: 150 },
        egTimeLimit: 900,     // 10 min baseline, in seconds
        egMaxMistakes: 7,
    },

    {
        id: 'training_grounds8',
        tier: 8,
        icon: '🌱',
        name: 'Training Grounds 8',
        desc: '---',
        monsterLevel: 40,
        maxMonsters: 6,
        totalMonsters: 30,
        hasBoss: false,
        requiredPuzzles: 3,
        requiredQuestions: 0,
        puzzlePool: { minCells: 10, maxCells: 150 },
        egTimeLimit: 900,     // 10 min baseline, in seconds
        egMaxMistakes: 7,
    },


    {
        id: 'training_grounds9',
        tier: 9,
        icon: '🌱',
        name: 'Training Grounds 9',
        desc: '---',
        monsterLevel: 45,
        maxMonsters: 7,
        totalMonsters: 35,
        hasBoss: false,
        requiredPuzzles: 3,
        requiredQuestions: 0,
        puzzlePool: { minCells: 10, maxCells: 150 },
        egTimeLimit: 900,
        egMaxMistakes: 8,
    },

    {
        id: 'training_grounds10',
        tier: 10,
        icon: '🌱',
        name: 'Training Grounds 10',
        desc: '---',
        monsterLevel: 50,
        maxMonsters: 7,
        totalMonsters: 35,
        hasBoss: false,
        requiredPuzzles: 3,
        requiredQuestions: 0,
        puzzlePool: { minCells: 10, maxCells: 150 },
        egTimeLimit: 900,
        egMaxMistakes: 8,
    },

    {
        id: 'training_grounds11',
        tier: 11,
        icon: '🌱',
        name: 'Training Grounds 11',
        desc: '---',
        monsterLevel: 55,
        maxMonsters: 8,
        totalMonsters: 40,
        hasBoss: false,
        requiredPuzzles: 3,
        requiredQuestions: 0,
        puzzlePool: { minCells: 10, maxCells: 150 },
        egTimeLimit: 1200,
        egMaxMistakes: 9,
    },

    {
        id: 'training_grounds12',
        tier: 12,
        icon: '🌱',
        name: 'Training Grounds 12',
        desc: '---',
        monsterLevel: 60,
        maxMonsters: 8,
        totalMonsters: 40,
        hasBoss: false,
        requiredPuzzles: 3,
        requiredQuestions: 0,
        puzzlePool: { minCells: 10, maxCells: 150 },
        egTimeLimit: 1200,
        egMaxMistakes: 9,
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

    {
        id: 'iterative_isle',
        tier: 13,
        icon: '🏝️',
        name: 'Iterative Isle',
        desc: '---',
        monsterLevel: 65,
        maxMonsters: 8,
        totalMonsters: 45,
        hasBoss: false,
        requiredPuzzles: 4,
        requiredQuestions: 0,
        puzzlePool: { minCells: 10, maxCells: 200 },
        egTimeLimit: 1200,
        egMaxMistakes: 9,
    },

    {
        id: 'recursive_ridge',
        tier: 14,
        icon: '⛰️',
        name: 'Recursive Ridge',
        desc: '---',
        monsterLevel: 70,
        maxMonsters: 8,
        totalMonsters: 45,
        hasBoss: true,
        requiredPuzzles: 6,
        requiredQuestions: 1,
        puzzlePool: { minCells: 10, maxCells: 200 },
        egTimeLimit: 1200,
        egMaxMistakes: 8,
    },

    {
        id: 'variance_valley',
        tier: 15,
        icon: '🏞️',
        name: 'Variance Valley',
        desc: '---',
        monsterLevel: 75,
        maxMonsters: 9,
        totalMonsters: 50,
        hasBoss: false,
        requiredPuzzles: 4,
        requiredQuestions: 0,
        puzzlePool: { minCells: 20, maxCells: 250 },
        egTimeLimit: 1200,
        egMaxMistakes: 10,
    },

    {
        id: 'convergence_canyon',
        tier: 16,
        icon: '🏜️',
        name: 'Convergence Canyon',
        desc: '---',
        monsterLevel: 80,
        maxMonsters: 9,
        totalMonsters: 50,
        hasBoss: false,
        requiredPuzzles: 5,
        requiredQuestions: 0,
        puzzlePool: { minCells: 20, maxCells: 250 },
        egTimeLimit: 1200,
        egMaxMistakes: 10,
    },

    {
        id: 'entropy_expanse',
        tier: 17,
        icon: '🌪️',
        name: 'Entropy Expanse',
        desc: '',
        monsterLevel: 85,
        maxMonsters: 9,
        totalMonsters: 55,
        hasBoss: true,
        requiredPuzzles: 7,
        requiredQuestions: 1,
        puzzlePool: { minCells: 20, maxCells: 300 },
        egTimeLimit: 1500,
        egMaxMistakes: 8,
    },

    {
        id: 'markov_marsh',
        tier: 18,
        icon: '🐸',
        name: 'Markov Marsh',
        desc: '---',
        monsterLevel: 90,
        maxMonsters: 10,
        totalMonsters: 55,
        hasBoss: false,
        requiredPuzzles: 5,
        requiredQuestions: 0,
        puzzlePool: { minCells: 20, maxCells: 300 },
        egTimeLimit: 1500,
        egMaxMistakes: 10,
    },

    {
        id: 'gradient_glade',
        tier: 19,
        icon: '🌳',
        name: 'Gradient Glade',
        desc: '---',
        monsterLevel: 95,
        maxMonsters: 10,
        totalMonsters: 60,
        hasBoss: false,
        requiredPuzzles: 5,
        requiredQuestions: 0,
        puzzlePool: { minCells: 20, maxCells: 300 },
        egTimeLimit: 1500,
        egMaxMistakes: 10,
    },

    {
        id: 'outlier_outpost',
        tier: 20,
        icon: '🚩',
        name: 'Outlier Outpost',
        desc: '',
        monsterLevel: 100,
        maxMonsters: 10,
        totalMonsters: 60,
        hasBoss: true,
        requiredPuzzles: 8,
        requiredQuestions: 1,
        puzzlePool: { minCells: 20, maxCells: 350 },
        egTimeLimit: 1500,
        egMaxMistakes: 9,
    },

    {
        id: 'stochastic_steppes',
        tier: 21,
        icon: '🐎',
        name: 'Stochastic Steppes',
        desc: '---',
        monsterLevel: 105,
        maxMonsters: 11,
        totalMonsters: 65,
        hasBoss: false,
        requiredPuzzles: 6,
        requiredQuestions: 0,
        puzzlePool: { minCells: 30, maxCells: 350 },
        egTimeLimit: 1500,
        egMaxMistakes: 10,
    },

    {
        id: 'residual_reef',
        tier: 22,
        icon: '🪸',
        name: 'Residual Reef',
        desc: '---',
        monsterLevel: 110,
        maxMonsters: 11,
        totalMonsters: 65,
        hasBoss: false,
        requiredPuzzles: 6,
        requiredQuestions: 0,
        puzzlePool: { minCells: 30, maxCells: 350 },
        egTimeLimit: 1500,
        egMaxMistakes: 10,
    },

    {
        id: 'quartile_quarry',
        tier: 23,
        icon: '⛏️',
        name: 'Quartile Quarry',
        desc: '',
        monsterLevel: 115,
        maxMonsters: 11,
        totalMonsters: 70,
        hasBoss: true,
        requiredPuzzles: 8,
        requiredQuestions: 1,
        puzzlePool: { minCells: 30, maxCells: 400 },
        egTimeLimit: 1800,
        egMaxMistakes: 9,
    },

    {
        id: 'lattice_lowlands',
        tier: 24,
        icon: '🌾',
        name: 'Lattice Lowlands',
        desc: '---',
        monsterLevel: 120,
        maxMonsters: 12,
        totalMonsters: 70,
        hasBoss: false,
        requiredPuzzles: 6,
        requiredQuestions: 0,
        puzzlePool: { minCells: 30, maxCells: 400 },
        egTimeLimit: 1800,
        egMaxMistakes: 10,
    },

    {
        id: 'permutation_pass',
        tier: 25,
        icon: '🗻',
        name: 'Permutation Pass',
        desc: '---',
        monsterLevel: 125,
        maxMonsters: 12,
        totalMonsters: 75,
        hasBoss: false,
        requiredPuzzles: 7,
        requiredQuestions: 0,
        puzzlePool: { minCells: 30, maxCells: 400 },
        egTimeLimit: 1800,
        egMaxMistakes: 10,
    },

    {
        id: 'covariance_coast',
        tier: 26,
        icon: '🏖️',
        name: 'Covariance Coast',
        desc: '',
        monsterLevel: 130,
        maxMonsters: 12,
        totalMonsters: 75,
        hasBoss: true,
        requiredPuzzles: 9,
        requiredQuestions: 1,
        puzzlePool: { minCells: 40, maxCells: 450 },
        egTimeLimit: 1800,
        egMaxMistakes: 9,
    },

    {
        id: 'heuristic_highlands',
        tier: 27,
        icon: '⛰️',
        name: 'Heuristic Highlands',
        desc: '---',
        monsterLevel: 135,
        maxMonsters: 13,
        totalMonsters: 80,
        hasBoss: false,
        requiredPuzzles: 7,
        requiredQuestions: 0,
        puzzlePool: { minCells: 40, maxCells: 450 },
        egTimeLimit: 1800,
        egMaxMistakes: 10,
    },

    {
        id: 'asymptote_archipelago',
        tier: 28,
        icon: '🏝️',
        name: 'Asymptote Archipelago',
        desc: '',
        monsterLevel: 140,
        maxMonsters: 13,
        totalMonsters: 80,
        hasBoss: true,
        maxBosses: 2,
        requiredPuzzles: 9,
        requiredQuestions: 2,
        puzzlePool: { minCells: 40, maxCells: 500 },
        egTimeLimit: 2100,
        egMaxMistakes: 9,
    },

    {
        id: 'fractal_fjords',
        tier: 29,
        icon: '🧊',
        name: 'Fractal Fjords',
        desc: '---',
        monsterLevel: 145,
        maxMonsters: 13,
        totalMonsters: 85,
        hasBoss: false,
        requiredPuzzles: 8,
        requiredQuestions: 0,
        puzzlePool: { minCells: 40, maxCells: 500 },
        egTimeLimit: 2100,
        egMaxMistakes: 10,
    },

    {
        id: 'eigenvalley',
        tier: 30,
        icon: '🌄',
        name: 'Eigenvalley',
        desc: '---',
        monsterLevel: 150,
        maxMonsters: 14,
        totalMonsters: 85,
        hasBoss: false,
        requiredPuzzles: 8,
        requiredQuestions: 0,
        puzzlePool: { minCells: 50, maxCells: 500 },
        egTimeLimit: 2100,
        egMaxMistakes: 10,
    },

    {
        id: 'singularity_spire',
        tier: 31,
        icon: '🗼',
        name: 'Singularity Spire',
        desc: '',
        monsterLevel: 155,
        maxMonsters: 14,
        totalMonsters: 90,
        hasBoss: true,
        requiredPuzzles: 10,
        requiredQuestions: 2,
        puzzlePool: { minCells: 50, maxCells: 550 },
        egTimeLimit: 2100,
        egMaxMistakes: 9,
    },

    {
        id: 'terminus_theorem',
        tier: 32,
        icon: '🏆',
        name: 'Terminus Theorem',
        desc: '',
        monsterLevel: 160,
        maxMonsters: 15,
        totalMonsters: 100,
        hasBoss: true,
        maxBosses: 3,
        requiredPuzzles: 12,
        requiredQuestions: 3,
        puzzlePool: { minCells: 50 },
        egTimeLimit: 2400,
        egMaxMistakes: 12,
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