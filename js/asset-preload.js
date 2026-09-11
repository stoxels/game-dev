//------------------------------------------------------------------------
//-------------------ASSET PRELOAD ENGINE-------------------------------
//------------------------------------------------------------------------
// Kills the "~0.5s of missing images" flash when opening a screen.
//
// Background: browsers only fetch CSS background images once the owning
// element actually renders. Hidden screens (display:none) therefore fetch
// their art on first open — mid-transition. This engine warms the HTTP
// cache ahead of time:
//   1. boot list (js/boot-loader.js) — title + title-reachable surfaces,
//      with progress, before the title is revealed;
//   2. one-ahead — whenever a surface shows, assets of its likely-next
//      surfaces jump to the front of the queue (see AHEAD);
//   3. idle rest — everything else streams in, 3-at-a-time, while the
//      player sits on the title screen.
//
// Only ever requests files the game would fetch anyway — no extra bytes,
// just earlier. Failed loads settle silently (never retried, never block).

var AssetPreload = (function () {
    'use strict';

    var MAX_CONCURRENT = 3;
    var BOOT_TIMEOUT_MS = 12000;

    // Documented 404s (referenced but never shipped) — never requested.
    var BANNED = {
        'images/Class_Selection/title_banner.png': 1,
        'images/Class_Selection/spells/statistician_momentum.png': 1,
        'images/level-selection-screen.png': 1
    };

    // Surface id -> art shown on it. Keys match switchScreen ids and
    // showModal ids. Every url must exist on disk (see preflight check).
    var SURFACE_ASSETS = {
        'screen-title': [
            'images/Title_Screen/RiseOfTheBeasts_TitleScreen_Background.webp',
            'images/Title_Screen/STOXELS.webp',
            'images/Title_Screen/RiseOfTheBeasts_EnglishLogo.webp',
            'images/Title_Screen/RiseOfTheBeasts_GermanLogo.webp',
            'images/Title_Screen/Language-Block.webp',
            'images/Title_Screen/Play-Block.webp',
            'images/Title_Screen/General-Block.webp',
            'images/Title_Screen/Reset-Block.webp'
        ],
        'screen-hs': [
            'images/Highscore_Screen/highscores_header_stone.webp',
            'images/Highscore_Screen/return_to_menu_button.webp',
            'images/Highscore_Screen/vertical_scroll_mover.webp',
            'images/Highscore_Screen/highscore_background.webp',
            'images/Highscore_Screen/highscores_header.webp',
            'images/Inference/inference-header.webp',
            'images/Level_Select_Topbar/score-pts-scroll.webp'
        ],
        'screen-codes': [
            'images/Moodle_Codes_Screen/Moodle_Codes_Background.webp',
            'images/Moodle_Codes_Screen/codes_ribbon.webp',
            'images/Moodle_Codes_Screen/return_to_menu_button.webp',
            'images/Moodle_Codes_Screen/Moodle_Codes_logo.webp',
            'images/Moodle_Codes_Screen/icon_1.webp',
            'images/Moodle_Codes_Screen/icon_2.webp',
            'images/Moodle_Codes_Screen/icon_3.webp',
            'images/Moodle_Codes_Screen/icon_4.webp',
            'images/Moodle_Codes_Screen/icon_5.webp'
        ],
        'screen-tutorial': [
            'images/Tutorial/Stox/step1.webp',
            'images/Tutorial/Stox/step2.webp',
            'images/Tutorial/Stox/step3.webp',
            'images/Tutorial/Stox/step4.webp',
            'images/Tutorial/Stox/step5.webp',
            'images/Tutorial/Syla/step1.webp',
            'images/Tutorial/Syla/step2.webp',
            'images/Tutorial/Syla/step3.webp',
            'images/Tutorial/Syla/step4.webp',
            'images/Tutorial/Syla/step5.webp',
            'images/Tutorial/Trix/step1.webp',
            'images/Tutorial/Trix/step2.webp',
            'images/Tutorial/Trix/step3.webp',
            'images/Tutorial/Trix/step4.webp',
            'images/Tutorial/Trix/step5.webp'
        ],
        'settings-modal': [
            'images/Settings/on-off-stone.webp',
            'images/Settings/settings_background.webp',
            'images/Settings/settings_close_button.webp',
            'images/Settings/settings_slider.webp',
            'images/Settings/settings_slider_thumb.webp',
            'images/Settings/settings_title_plague.webp'
        ],
        'changelog-modal': 'settings-modal',
        'keybinds-modal': 'settings-modal',
        'achievements-modal': [
            'images/Game_Setup/Button-Block-1.webp',
            'images/Game_Setup/Button-Block-2.webp',
            'images/Game_Setup/back-slab.webp',
            'images/Inference/inference-header.webp',
            'images/Settings/settings_background.webp',
            'images/Settings/settings_close_button.webp',
            'images/Settings/settings_title_plague.webp',
            'images/Convergence_Screen/convergence-book.webp',
            'images/Convergence_Screen/convergence-border.webp',
            'images/Convergence_Screen/convergence-coins.webp',
            'images/Convergence_Screen/convergence-shard.webp',
            'images/Convergence_Screen/convergence-stone-behind-whirl.webp',
            'images/Convergence_Screen/convergence-total.webp',
            'images/Convergence_Screen/convergence-tree.webp',
            'images/Convergence_Screen/convergence-whirl.webp',
            'images/Game-Reset/Button-Stone.webp',
            'images/Achievement_Screen/Achievements_Category_ClassesAbilities.webp',
            'images/Achievement_Screen/Achievements_Category_Completion.webp',
            'images/Achievement_Screen/Achievements_Category_Difficulty.webp',
            'images/Achievement_Screen/Achievements_Category_Endgame.webp',
            'images/Achievement_Screen/Achievements_Category_GridPuzzles.webp',
            'images/Achievement_Screen/Achievements_Category_Header.webp',
            'images/Achievement_Screen/Achievements_Category_Inference.webp',
            'images/Achievement_Screen/Achievements_Category_ItemsInventory.webp',
            'images/Achievement_Screen/Achievements_Category_main_Panel.webp',
            'images/Achievement_Screen/Achievements_category_MistakesComeback.webp',
            'images/Achievement_Screen/Achievements_Category_ProbabilityTree.webp',
            'images/Achievement_Screen/Achievements_Category_QuizExcercises.webp',
            'images/Achievement_Screen/Achievements_Category_Score.webp'
        ],
        'replay-modal': [
            'images/Replay_Cutscene_Screen/Replay_Start_Button.webp',
            'images/Replay_Cutscene_Screen/Replay_Track_Background.webp',
            'images/Replay_Cutscene_Screen/Replay_Tutorial_Background.webp',
            'images/Settings/settings_background.webp',
            'images/Settings/settings_close_button.webp',
            'images/Settings/settings_title_plague.webp'
        ],
        'screen-save-slots': [
            'images/Game_Setup/Book-Frame.webp',
            'images/Game_Setup/Game_Setup_New_Background.webp',
            'images/Game_Setup/Stox.webp',
            'images/Game_Setup/Trix.webp',
            'images/Game_Setup/Syla.webp',
            'images/sprites/Stox_noclass.webp',
            'images/sprites/Trix_noclass.webp',
            'images/sprites/Syla_noclass.webp'
        ],
        'screen-setup': [
            'images/Game_Setup/Button-Block-1.webp',
            'images/Game_Setup/Button-Block-2.webp',
            'images/Game_Setup/Icon-Classless.webp',
            'images/Game_Setup/Icon-Hardcore.webp',
            'images/Game_Setup/Icon-Ironman.webp',
            'images/Game_Setup/Icon-TimeTrial.webp',
            'images/Game_Setup/Icon-Treeless.webp',
            'images/Game_Setup/Modifier-Block-1.webp',
            'images/Game_Setup/Modifier-Block-2.webp',
            'images/Game_Setup/Modifier_Plate.webp',
            'images/Game_Setup/Ribbon-Banner.webp'
        ],
        'screen-character-select': [
            'images/sprites/Stox_noclass.webp',
            'images/sprites/Trix_noclass.webp',
            'images/sprites/Syla_noclass.webp',
            'images/Class_Selection/class_selection_bg.webp',
            'images/Class_Selection/bow_weapon_locker.webp',
            'images/Class_Selection/staff_weapon_locker.webp',
            'images/Class_Selection/sword_weapon_locker.webp',
            'images/Class_Selection/mathmagician_pillar.webp',
            'images/Class_Selection/probabilist_pillar.webp',
            'images/Class_Selection/statistician_pillar.webp',
            'images/Class_Selection/class_select_title.webp'
        ],
        'screen-levels': [
            'images/level-selection-screen.webp',
            'images/Level_Select_Topbar/topbar-stone-tile2.webp',
            'images/Level_Select_Topbar/back-arrow.webp',
            'images/Level_Select_Topbar/banner-title-plaque.webp',
            'images/Level_Select_Topbar/score-pts-scroll.webp',
            'images/Level_Select_Topbar/Inference-Block.webp',
            'images/Level_Select_Topbar/Probability-Tree-Block.webp'
        ],
        'screen-map-view': 'screen-levels',
        'screen-world-detail': 'screen-levels',
        'screen-game': [
            'images/Bayesian-Bay.webp',
            'images/Data-Delta.webp',
            'images/Distribution-Den.webp',
            'images/Expectation-Plateau.webp',
            'images/Frequency-Forest.webp',
            'images/Hypothesis-Hinterlands.webp',
            'images/Null-Hypothesis-Void.webp',
            'images/Parameter-Plains.webp',
            'images/Probability-Peaks.webp',
            'images/Regression-Rift.webp',
            'images/Sampling-Savanna.webp',
            'images/Stochapolis.webp',
            'images/The-Nexus.webp',
            'images/Vortex-of-Possibilities.webp'
        ],
        // Deep sets (no single surface): spell upgrades, ascendency picks,
        // inference art. Streamed last during idle.
        'deep-spells': [
            'images/Class_Spell_Upgrade/absolute_zero.webp',
            'images/Class_Spell_Upgrade/actuary_upgrade_bg.webp',
            'images/Class_Spell_Upgrade/arcane_reveal.webp',
            'images/Class_Spell_Upgrade/bayes_traps.webp',
            'images/Class_Spell_Upgrade/bayesian_insight.webp',
            'images/Class_Spell_Upgrade/bayesian_upgrade_bg.webp',
            'images/Class_Spell_Upgrade/brownian_motion.webp',
            'images/Class_Spell_Upgrade/data_strike.webp',
            'images/Class_Spell_Upgrade/degrees_of_freedom.webp',
            'images/Class_Spell_Upgrade/diagonal_strike.webp',
            'images/Class_Spell_Upgrade/drifter.webp',
            'images/Class_Spell_Upgrade/markovian_upgrade_bg.webp',
            'images/Class_Spell_Upgrade/mathmagician_upgrade_bg.webp',
            'images/Class_Spell_Upgrade/momentum.webp',
            'images/Class_Spell_Upgrade/outlier_upgrade_bg.webp',
            'images/Class_Spell_Upgrade/precision_shot.webp',
            'images/Class_Spell_Upgrade/probabilist_upgrade_bg.webp',
            'images/Class_Spell_Upgrade/rain_of_arrows.webp',
            'images/Class_Spell_Upgrade/random_walker_upgrade_bg.webp',
            'images/Class_Spell_Upgrade/recursionist_upgrade_bg.webp',
            'images/Class_Spell_Upgrade/regression_to_prior.webp',
            'images/Class_Spell_Upgrade/residual.webp',
            'images/Class_Spell_Upgrade/significance_threshold.webp',
            'images/Class_Spell_Upgrade/speedforce.webp',
            'images/Class_Spell_Upgrade/state_rollback.webp',
            'images/Class_Spell_Upgrade/statistician_upgrade_bg.webp',
            'images/Class_Spell_Upgrade/tail_risk.webp',
            'images/Class_Spell_Upgrade/transition_matrix.webp',
            'images/Class_Spell_Upgrade/type1_error_shield.webp',
            'images/Class_Spell_Upgrade/variance_shield.webp'
        ],
        'deep-ascendency': [
            'images/Class_Ascendency_Selection/actuary_weapons.webp',
            'images/Class_Ascendency_Selection/bayesian_weapons.webp',
            'images/Class_Ascendency_Selection/markovian_weapons.webp',
            'images/Class_Ascendency_Selection/mathmagician_ascendency_selection.webp',
            'images/Class_Ascendency_Selection/outlier_weapons.webp',
            'images/Class_Ascendency_Selection/probabilist_ascendency_selection.webp',
            'images/Class_Ascendency_Selection/random_walker_weapons.webp',
            'images/Class_Ascendency_Selection/recursionist_weapons.webp',
            'images/Class_Ascendency_Selection/statistician_ascendency_selection.webp'
        ],
        'deep-inference': [
            'images/Inference/card-art-frame-stone.webp',
            'images/Inference/category_button_active.webp',
            'images/Inference/category_button_inactive.webp',
            'images/Inference/close-button.webp',
            'images/Inference/detailed-title-banner.webp',
            'images/Inference/icon_claimable_dot.webp',
            'images/Inference/icon_claimable_star.webp',
            'images/Inference/icon_convergence_points.webp',
            'images/Inference/icon_milestones_claimed.webp',
            'images/Inference/inference-header.webp',
            'images/Inference/ledger-parchment-bg.webp',
            'images/Inference/row-parchment-strip.webp',
            'images/Inference/stone_divider.webp',
            'images/Inference/summary_parchment.webp'
        ]
    };

    // Shown surface -> surfaces to prioritize (load one screen ahead).
    var AHEAD = {
        'screen-title': ['screen-hs', 'screen-codes', 'screen-tutorial',
            'settings-modal', 'achievements-modal', 'replay-modal',
            'screen-save-slots'],
        'screen-hs': ['screen-title'],
        'screen-codes': ['screen-title'],
        'screen-tutorial': ['screen-title'],
        'settings-modal': ['screen-title'],
        'achievements-modal': ['screen-title'],
        'replay-modal': ['screen-title'],
        'changelog-modal': ['screen-title'],
        'keybinds-modal': ['screen-title'],
        'screen-save-slots': ['screen-setup', 'screen-character-select'],
        'screen-setup': ['screen-character-select', 'screen-levels'],
        'screen-character-select': ['screen-setup', 'screen-levels'],
        'screen-levels': ['screen-map-view', 'screen-world-detail'],
        'screen-map-view': ['screen-levels', 'screen-game'],
        'screen-world-detail': ['screen-game', 'screen-map-view'],
        'screen-game': ['screen-levels']
    };

    // Boot-blocking set: title + everything reachable from it (sans tutorial
    // steps, which stream right after). ~3 MB.
    var BOOT_SURFACES = ['screen-title', 'settings-modal', 'screen-hs',
        'screen-codes', 'replay-modal', 'achievements-modal', 'screen-save-slots'];

    // Idle order after boot: neighbors first, deep sets later.
    var IDLE_SURFACES = ['screen-tutorial', 'screen-setup',
        'screen-character-select', 'screen-levels', 'screen-game'];

    var _settled = {};
    var _queued = {};
    var _pending = [];
    var _active = 0;
    var _bootDone = null;
    var _bootTotal = 0;
    var _bootSettled = 0;
    var _bootTimer = null;

    function _assetsOf(id) {
        var entry = SURFACE_ASSETS[id];
        if (!entry) return [];
        if (typeof entry === 'string') return _assetsOf(entry);
        return entry;
    }

    function _enqueue(urls, hot) {
        var added = 0;
        for (var i = 0; i < urls.length; i++) {
            var u = urls[i];
            if (!u || BANNED[u] || _settled[u] || _queued[u]) continue;
            _queued[u] = true;
            if (hot) _pending.unshift({ url: u });
            else _pending.push({ url: u });
            added++;
        }
        if (added) _schedule();
    }

    function _schedule() {
        if (typeof requestIdleCallback === 'function') {
            requestIdleCallback(function () { _pump(); }, { timeout: 2000 });
        } else {
            setTimeout(_pump, 0);
        }
    }

    function _pump() {
        while (_active < MAX_CONCURRENT && _pending.length) {
            var job = _pending.shift();
            if (_settled[job.url]) continue;
            _active++;
            (function (url) {
                var img = new Image();
                var done = function () {
                    img.onload = img.onerror = null;
                    _settled[url] = true;
                    delete _queued[url];
                    _active--;
                    if (_bootDone) _onBootOne(url);
                    _pump();
                };
                img.onload = done;
                img.onerror = done;
                img.src = url;
            })(job.url);
        }
    }

    function _onBootOne(url) {
        _bootSettled++;
        var cb = _bootDone;
        if (_bootSettled >= _bootTotal) {
            _bootDone = null;
            if (_bootTimer) { clearTimeout(_bootTimer); _bootTimer = null; }
            cb(true);
        } else {
            cb(false, _bootSettled, _bootTotal, url);
        }
    }

    // Blocking preload with progress. onProgress(done,total,url),
    // onDone() — always fires (fail-safe timeout).
    function preloadBoot(onProgress, onDone) {
        var urls = [];
        BOOT_SURFACES.forEach(function (id) {
            urls = urls.concat(_assetsOf(id));
        });
        var seen = {};
        urls = urls.filter(function (u) {
            if (!u || BANNED[u] || seen[u]) return false;
            seen[u] = true;
            return true;
        });
        _bootTotal = urls.length;
        _bootSettled = 0;
        if (!urls.length) { onDone(); return; }
        _bootDone = function (finished, done, total, url) {
            if (finished) onDone();
            else onProgress(done, total, url);
        };
        _bootTimer = setTimeout(function () {
            _bootTimer = null;
            if (_bootDone) {
                var cb = _bootDone;
                _bootDone = null;
                cb(true);
            }
        }, BOOT_TIMEOUT_MS);
        _enqueue(urls, true);
    }

    // Streams everything else after boot (neighbors before deep sets).
    function startIdle() {
        var urls = [];
        IDLE_SURFACES.forEach(function (id) {
            urls = urls.concat(_assetsOf(id));
        });
        // Deep sets not tied to one surface (spell upgrades, ascendency,
        // inference art) — last, still before the player can reach them.
        urls = urls.concat(_assetsOf('screen-game'));
        urls = urls.concat(_assetsOf('deep-spells'));
        urls = urls.concat(_assetsOf('deep-ascendency'));
        urls = urls.concat(_assetsOf('deep-inference'));
        _enqueue(urls, false);
    }

    // One-ahead: prioritize the likely-next surfaces of the one just shown.
    function surfaceShown(id) {
        if (!id) return;
        _enqueue(_assetsOf(id), true);
        var next = AHEAD[id] || [];
        for (var i = 0; i < next.length; i++) {
            _enqueue(_assetsOf(next[i]), true);
        }
    }

    // Hook navigation so every surface change re-prioritizes its neighbors.
    function _hook(fnName) {
        try {
            if (typeof window[fnName] === 'function' && !window[fnName]._apHooked) {
                (function (orig, name) {
                    var wrapped = function (id) {
                        var r = orig.apply(this, arguments);
                        surfaceShown(id);
                        return r;
                    };
                    wrapped._apHooked = true;
                    window[fnName] = wrapped;
                })(window[fnName], fnName);
            }
        } catch (e) { /* navigation works untouched without preloading */ }
    }

    function installHooks() {
        _hook('switchScreen');
        _hook('showModal');
    }

    return {
        preloadBoot: preloadBoot,
        startIdle: startIdle,
        surfaceShown: surfaceShown,
        installHooks: installHooks
    };
})();
