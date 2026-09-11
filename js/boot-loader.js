//------------------------------------------------------------------------
//-------------------BOOT LOADER----------------------------------------
//------------------------------------------------------------------------
// Drives the #boot-loader overlay: progress over the boot asset set,
// then fades into the (already active) title screen and starts the idle
// preload of everything else. Never hangs: per-image errors settle, and
// a fail-safe reveals the title no matter what.

(function () {
    var layer = document.getElementById('boot-loader');
    if (!layer) return;

    var LABELS = {
        'Title_Screen': 'Title',
        'Highscore_Screen': 'Highscores',
        'Moodle_Codes_Screen': 'Moodle Codes',
        'Tutorial': 'Tutorial',
        'Settings': 'Settings',
        'Achievement_Screen': 'Achievements',
        'Replay_Cutscene_Screen': 'Replay',
        'Game_Setup': 'Game Setup',
        'sprites': 'Characters',
        'Inference': 'Inference',
        'Convergence_Screen': 'Convergence',
        'Game-Reset': 'Menus',
        'Level_Select_Topbar': 'Level Select',
        'Class_Selection': 'Classes'
    };

    function labelFor(url) {
        var m = /images\/([^/]+)\//.exec(url || '');
        return (m && LABELS[m[1]]) || 'Assets';
    }

    var idleStarted = false;
    function ensureIdle() {
        if (idleStarted) return;
        idleStarted = true;
        try {
            if (typeof AssetPreload !== 'undefined') {
                AssetPreload.startIdle();
                AssetPreload.surfaceShown('screen-title');
            }
        } catch (e) { /* title works without preloading */ }
    }

    function reveal() {
        if (!layer || layer.classList.contains('done')) return;
        layer.classList.add('done');
        setTimeout(function () {
            if (layer.parentNode) layer.parentNode.removeChild(layer);
        }, 450);
        ensureIdle();
    }

    // Fail-safe: title always reveals, even if scripts stall.
    var revealed = false;
    function revealOnce() {
        if (!revealed) { revealed = true; reveal(); }
        ensureIdle();
    }
    setTimeout(revealOnce, 15000);

    try {
        if (typeof AssetPreload === 'undefined' || !AssetPreload.preloadBoot) {
            revealOnce();
            return;
        }
        if (typeof AssetPreload.installHooks === 'function') AssetPreload.installHooks();
        var fill = document.getElementById('boot-fill');
        var status = document.getElementById('boot-status');
        AssetPreload.preloadBoot(function (done, total, url) {
            if (fill) fill.style.width = Math.round(done / total * 100) + '%';
            if (status) status.textContent = 'Loading ' + labelFor(url) + '…';
        }, function () {
            if (fill) fill.style.width = '100%';
            if (status) status.textContent = 'Ready';
            revealOnce();
        });
    } catch (e) {
        revealOnce();
    }
})();


// ---------------------------------------------------------------------
// LOAD-ORDER SANITY CHECK (added 2026-09).
// Warns loudly if a script failed to load or was ordered wrongly, so a
// regression surfaces in the console instead of as silent breakage.
// typeof never throws, so this is safe to run even when globals are
// missing. Indirect eval resolves through the global lexical scope, which
// also covers top-level const/let (STATE, PT, EG_BOSS_DEFS, ...).
// ---------------------------------------------------------------------
(function () {
    var expected = [
        ['STATE', 'core state (js/state.js)'],
        ['ITEM_DEFS', 'item definitions (js/puzzle-items/item-definitions.js)'],
        ['PT', 'passive tree (js/passive-tree/passive-tree.js)'],
        ['STORY_BEATS', 'storyline beats (js/storyline/storyline-beats.js — loads last by design)'],
        ['EG_BOSS_DEFS', 'boss registry (js/endgame/bosses/boss-framework.js)'],
        ['EG_BOSS_MECHANICS', 'boss mechanics registry (boss-framework.js)'],
        ['_egShowTooltip', 'single tooltip implementation (js/endgame/endgame-currency.js)'],
        ['_egRenderCurrencyCell', 'currency cell renderer (js/endgame/endgame-hub-drag-and-drop.js)'],
        ['_egGenerateEquipmentDrop', 'equipment generator (js/endgame/endgame-equipment-generator.js)'],
        ['_egGetElementalDamageBonus', 'elemental damage helper (js/endgame/endgame-combat-calculations.js)'],
        ['_egRemoveVeil', 'shared veil cleanup (js/endgame/bosses/shared-boss-abilities.js)'],
        ['_egPtSegDist', 'shared geometry helper (shared-boss-abilities.js)'],
        ['_shuffleArray', 'shared shuffle helper (js/classes/class-probabilist.js)'],
        ['questStat_revealItemUsed', 'quest stats (js/quests/quests-logic.js)'],
        ['renderLevelSelect', 'level select screen (js/screens/screens-level-select.js)'],
        ['isMaxCleared', 'level select helpers (screens-level-select.js)'],
        ['getStars', 'level select helpers (screens-level-select.js)'],
        ['showEndgameGate', 'endgame gate screen (js/endgame/endgame-gate.js)'],
        ['showEndgameNexus', 'endgame nexus screen (js/endgame/endgame-nexus.js)'],
        ['showEndgameAtlas', 'endgame atlas screen (js/endgame/endgame-atlas.js)'],
    ];
    function safeTypeof(name) {
        // typeof throws a ReferenceError for lexical bindings still in
        // their temporal dead zone (e.g. STATE if state.js crashed mid-
        // load), so probe defensively and treat a throw as "missing".
        try { return (0, eval)('typeof ' + name); }
        catch (err) { return 'undefined'; }
    }
    var missing = expected.filter(function (entry) {
        return safeTypeof(entry[0]) === 'undefined';
    });
    if (missing.length) {
        console.warn('[load-order] ' + missing.length + ' expected global(s) missing — a script failed to load or is ordered wrong: ' +
            missing.map(function (entry) { return entry[0] + ' (' + entry[1] + ')'; }).join(', '));
    }
})();
