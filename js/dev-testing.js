//------------------------------------------------------------------------
//-------------------DEV TESTING HARNESS (dev-testing.js)------------------
//------------------------------------------------------------------------
// Dev-time only. Inert for normal players.
//
// 1) INSTANT BOOT — every boot screen (save slots, intro cinematic,
//    character select, tutorial, setup, mode select, maps) can be skipped
//    by loading a dev URL:
//
//       index.html?devtest=game&w=0&l=0      → fresh character, in level 0.0
//       index.html?devtest=world&w=0         → world-detail map of world 0
//       index.html?devtest=mapview           → overworld map
//       index.html?devtest=setup             → difficulty/setup screen
//       index.html?devtest=title             → just the title screen
//
//    Extra params: &slot=N (save slot; default = first empty slot ≥ 1),
//    &char=stox|trix|syla (default stox), &force=1 (bypass math gates when
//    starting a level), &keepintro=1 (let the cinematic play).
//
//    It calls the same flow functions the buttons call (showSaveSlotSelect,
//    onSaveSlotChosen, showSetup, launchExistingGame, showWorldDetail,
//    startLevel) — so the state machine is traversed properly, not
//    simulated. Runs on window 'load', when every game global exists.
//
// 2) RUNTIME API — in the console (preview tool / devtools):
//
//       DevTest.goto({ screen:'game', world:0, level:2, character:'trix' })
//       DevTest.map() / DevTest.world(1) / DevTest.game(0, 0)
//       DevTest.setup() / DevTest.title() / DevTest.screen('screen-codes')
//       DevTest.state()                       → position/save summary
//       DevTest.timeScale(10)                 → 10× all scalable durations
//       DevTest.wipeSlots([1,2,3])            → wipe dev test slots
//
// 3) EFFECT TIME SCALE — short effects (ailments, cooldowns, buffs) are
//    impossible to observe at real speed in a test. Every central duration
//    site multiplies by window.STOX_EFFECT_TIME_SCALE (default 1 = exact
//    game behaviour):
//
//       DevTest.timeScale(10)   or   index.html?...&devscale=10
//
//    scale > 1 = LONGER effects (observe them), scale < 1 = shorter.
//    Currently wired: endgame ailment durations (_egApplyStatusToMap),
//    class ability cooldowns (startSlotCooldown), endgame quiz buff stacks
//    (expiry, FX and the toast label), shield cursed-ward window.
//    Deliberately NOT scaled: level/puzzle timer, boss-phase timers.
//
// The guard: without ?devtest / devscale, nothing runs automatically and
// the only trace is the DevTest object itself.
//------------------------------------------------------------------------

// Reads the integer query param or returns fallback. Safe pre-STATE.
function _devTestParam(name, fallback) {
    try {
        const v = new URLSearchParams(window.location.search).get(name);
        if (v === null || v === '') return fallback;
        return v;
    } catch (e) { return fallback; }
}

// The global effect-time scale. Multiplied into scalable durations by the
// wiring sites (see file header). Kept ≥ 0.01 so a typo can't freeze time
// silently; 0 means "0.01×" which is still observable. Default 1 = exact
// shipped behaviour.
window.STOX_EFFECT_TIME_SCALE = 1;

// Normalizes the scale param/console value into a finite number ≥ 0.01.
function _devTestNormalizeScale(v) {
    const n = Number(v);
    if (!isFinite(n) || n <= 0) return 1;
    return Math.min(1000, Math.max(0.01, n));
}

const DevTest = {
    // Full boot chain. spec: { slot, character, skipIntro, skipTutorial,
    // screen: 'title'|'setup'|'mapview'|'world'|'game', world, level, force }
    goto(spec = {}) {
        const s = Object.assign({
            slot: null, character: 'stox', skipIntro: true, skipTutorial: true,
            screen: 'title', world: 0, level: 0, force: false,
        }, spec);

        const log = (msg) => console.info('%c[devtest] ' + msg, 'color:#7fd4ff');

        // Pick a slot. Default = 20 (the dedicated dev slot — least likely
        // to collide with a real player save, which the preview browser
        // profile SHARES). Explicit &slot=N is honoured, but a slot that
        // already holds real progress triggers a loud console warning.
        let slotNum = s.slot || 20;
        if (typeof getSlotSummary === 'function') {
            if (getSlotSummary(slotNum).empty) {
                // requested/dev slot is free — use it
            } else if (!s.slot) {
                for (let i = 20; i >= 1; i--) {
                    if (getSlotSummary(i).empty) { slotNum = i; break; }
                }
            }
            const summary = getSlotSummary(slotNum);
            if (!summary.empty && (summary.levelsDone || 0) > 3) {
                console.warn('[devtest] WARNING: booting on slot ' + slotNum +
                    ' which holds real progress (' + summary.levelsDone + ' levels). ' +
                    'Use a different &slot= or wipe it first.');
            }
        }

        // 1. Save slot: load the slot through the real flow so the pending
        //    callback machinery and hub latches behave exactly like a click.
        if (typeof showSaveSlotSelect !== 'function' || typeof onSaveSlotChosen !== 'function') {
            console.warn('[devtest] save-slot flow unavailable — aborting boot');
            return;
        }
        // Intro cinematic bypass: the title flow shows it only when the
        // slot-scoped seen-flag is absent; marking it seen routes through
        // the same proceed() the SKIP button takes.
        if (s.skipIntro && typeof markSeen === 'function') {
            try { markSeen('intro_cinematic'); } catch (e) {}
        }
        showSaveSlotSelect(() => {
            // 2. Character + tutorial flags, then straight to setup.
            //    (Bypasses character-select UI and tutorial screens via the
            //    same STATE fields those screens write — no state is skipped.)
            if (typeof STATE === 'undefined' || !STATE) return;
            STATE.playerCharacter = s.character;
            if (s.skipTutorial) STATE.tutorialDone = true;
            if (typeof save === 'function') save();

            if (s.screen === 'title') { log('done: title (slot ' + slotNum + ', char ' + s.character + ')'); return; }

            if (typeof showSetup !== 'function') return;
            showSetup();
            if (s.screen === 'setup') { log('done: setup'); return; }

            // 3. Overworld map.
            if (typeof launchExistingGame !== 'function') return;
            launchExistingGame();
            if (s.screen === 'mapview') { log('done: mapview'); return; }

            // 4. World detail.
            if (typeof showWorldDetail !== 'function') return;
            showWorldDetail(s.world | 0);
            if (s.screen === 'world') { log('done: world ' + s.world); return; }

            // 5. In-game. startLevel honours math gates; force=1 calls
            //    _doStartLevel directly (same bypass the boss-test screen uses).
            const gi = (typeof WORLD_START_GI !== 'undefined' && WORLD_START_GI[s.world | 0] !== undefined)
                ? WORLD_START_GI[s.world | 0] + (s.level | 0) : (s.level | 0);
            if (typeof startLevel !== 'function') return;
            if (s.force && typeof _doStartLevel === 'function') _doStartLevel(gi);
            else startLevel(gi);
            log('done: game gi=' + gi + ' (slot ' + slotNum + ', char ' + s.character + ')');
        });
        onSaveSlotChosen(slotNum);
    },

    // --- Screen shortcuts ------------------------------------------------
    map() { if (typeof showMapView === 'function') showMapView(); },
    world(wi = 0) { if (typeof showWorldDetail === 'function') showWorldDetail(wi | 0); },
    // level: startLevel respects math gates; force=true bypasses them.
    game(w = 0, l = 0, force = false) {
        const gi = (typeof WORLD_START_GI !== 'undefined' && WORLD_START_GI[w] !== undefined)
            ? WORLD_START_GI[w] + l : l;
        if (force && typeof _doStartLevel === 'function') _doStartLevel(gi);
        else if (typeof startLevel === 'function') startLevel(gi);
    },
    setup() { if (typeof showSetup === 'function') showSetup(); },
    title() { if (typeof showTitle === 'function') showTitle(); },
    screen(id) { if (typeof switchScreen === 'function') switchScreen(id); },

    // --- Introspection ----------------------------------------------------
    state() {
        if (typeof STATE === 'undefined' || !STATE) return 'no STATE';
        return {
            slot: (typeof getActiveSlot === 'function') ? getActiveSlot() : null,
            character: STATE.playerCharacter,
            class: STATE.playerClass || STATE.playerAscendency || null,
            levelsDone: STATE.done ? STATE.done.length : 0,
            nexusUnlocked: !!STATE.nexusUnlocked,
            activeScreen: document.querySelector('.screen.active')?.id || null,
            timeScale: window.STOX_EFFECT_TIME_SCALE,
        };
    },

    // --- Effect time scale -------------------------------------------------
    // >1 = longer effects (default testing), <1 = shorter. 1 = shipped game.
    timeScale(x) {
        window.STOX_EFFECT_TIME_SCALE = _devTestNormalizeScale(x);
        const msg = '⏱ Effect time scale = ×' + window.STOX_EFFECT_TIME_SCALE;
        if (typeof showToast === 'function') showToast(msg); else console.info(msg);
        return window.STOX_EFFECT_TIME_SCALE;
    },

    // --- Movement control (scripted WASD tests) ------------------------------
    // freezeAvatar(true) pins the simple avatar in place (movement input
    // blocked, automation like knockback glides still render); the frozen
    // position is sampled through _avatarMoveTick's own accumulator. Pass
    // false (or nothing) to release. Only meaningful while the harness is
    // active (STOX_FLAGS.devTestActive).
    freezeAvatar(freeze = true) {
        if (typeof window === 'undefined') return;
        window.STOX_FLAGS = window.STOX_FLAGS || {};
        window.STOX_FLAGS.devTestFreezeAvatar = !!freeze;
        return window.STOX_FLAGS.devTestFreezeAvatar;
    },

    // Dispatch a real WASD key event (keyboard-event-equivalent) against the
    // avatar handlers: press('d', 500) holds 'd' for 500 ms and reports the
    // sampled position before/after — the scripted equivalent of the manual
    // movement checks used during the sprite debugging session.
    press(key, holdMs = 400) {
        return new Promise(resolve => {
            const before = () => {
                const el = document.getElementById('player-avatar-simple') || document.getElementById('player-avatar-wrapper');
                return el ? { left: el.style.left, top: el.style.top } : null;
            };
            const startPos = before();
            document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
            setTimeout(() => {
                document.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }));
                const endPos = before();
                resolve({ key, holdMs, startPos, endPos, moved: JSON.stringify(startPos) !== JSON.stringify(endPos) });
            }, holdMs);
        });
    },

    // --- Slot hygiene (dev only) --------------------------------------------
    // Refuses to wipe slots that hold real progress unless { force: true }.
    // The preview browser profile shares the player's real localStorage, so
    // this guard is the only thing between a test run and a real save.
    wipeSlots(list, opts = {}) {
        if (typeof wipeSlot !== 'function' || typeof getSlotSummary !== 'function') return 'unavailable';
        const wiped = [];
        const refused = [];
        (list || []).forEach(n => {
            const s = getSlotSummary(n | 0);
            const realProgress = !s.empty && (s.levelsDone || 0) > 3;
            if (realProgress && !opts.force) { refused.push(n); return; }
            wipeSlot(n | 0);
            wiped.push(n);
        });
        if (typeof renderSaveSlotScreen === 'function') renderSaveSlotScreen();
        let out = 'wiped slots: ' + (wiped.join(', ') || 'none');
        if (refused.length) out += ' — REFUSED (real progress, pass {force:true} to override): ' + refused.join(', ');
        return out;
    },
};
window.DevTest = DevTest;

//------------------------------------------------------------------------
//-------------------AUTO-BOOT (URL driven)---------------------------------
//------------------------------------------------------------------------

(function _devTestAutoBoot() {
    const mode = _devTestParam('devtest', null);
    if (!mode) return; // normal player boot — harness stays inert
    // Register the session in the game's owned flag namespace (see state.js).
    // _resetStoxFlags() deliberately preserves this entry across levels.
    window.STOX_FLAGS = window.STOX_FLAGS || {};
    window.STOX_FLAGS.devTestActive = true;

    const SCREENS = { title: 'title', setup: 'setup', mapview: 'mapview', map: 'mapview', world: 'world', game: 'game', level: 'game' };
    const spec = {
        screen: SCREENS[mode.toLowerCase()] || 'title',
        world: parseInt(_devTestParam('w', '0'), 10) || 0,
        level: parseInt(_devTestParam('l', '0'), 10) || 0,
        slot: parseInt(_devTestParam('slot', '0'), 10) || null,
        character: (_devTestParam('char', 'stox') || 'stox').toLowerCase(),
        force: _devTestParam('force', '0') === '1',
        skipIntro: _devTestParam('keepintro', '0') !== '1',
        skipTutorial: _devTestParam('keeptutorial', '0') !== '1',
    };
    const devscale = _devTestParam('devscale', null);
    if (devscale !== null) window.STOX_EFFECT_TIME_SCALE = _devTestNormalizeScale(devscale);
    // Wait for window load: every game script (including ones tagged after
    // this file) has run by then, so all flow functions exist.
    const boot = () => {
        console.info('%c[devtest] auto-boot: ' + JSON.stringify(spec), 'color:#7fd4ff');
        DevTest.goto(spec);
    };
    if (document.readyState === 'complete') boot();
    else window.addEventListener('load', boot);
})();
