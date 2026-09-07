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
