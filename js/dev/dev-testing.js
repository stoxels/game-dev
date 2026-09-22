import { WORLD_START_GI } from '../levels/levels.js';
import { showToast } from '../puzzle-mechanics/toasts-and-popups.js';
import { showMapView } from '../screens/screens-map-view.js';
import { onSaveSlotChosen, renderSaveSlotScreen, showSaveSlotSelect } from '../screens/screens-save-slots.js';
import { showWorldDetail } from '../screens/screens-world-levels.js';
import { launchExistingGame, showSetup, showTitle, switchScreen } from '../screens/screens.js';
import { _doStartLevel } from '../start-level.js';
import { getActiveSlot, getSlotSummary, save, wipeSlot, STATE } from '../state.js';
import { markSeen } from '../storyline/storyline-progress.js';

//------------------------------------------------------------------------
//-------------------DEV TESTING HARNESS (dev-testing.js)------------------
//------------------------------------------------------------------------
// Dev-time only. Inert for normal players: without a ?devtest/devscale URL
// param nothing runs and the only trace is the DevTest console object.
//
// 1) INSTANT BOOT - the whole boot chain (save slot → intro → character
//    → tutorial → setup → mode → maps) can be skipped by loading a URL
//    like index.html?devtest=game&w=0&l=0. The AUTO-BOOT section at the
//    bottom lists every param. It calls the same flow functions the
//    buttons call, so the state machine is traversed properly, not
//    simulated. Runs on window 'load', when every game global exists.
//
// 2) RUNTIME API - in the console (preview tool / devtools):
//       DevTest.goto({ screen:'game', world:0, level:2, character:'trix' })
//       DevTest.map() / DevTest.world(1) / DevTest.game(0, 0)
//       DevTest.setup() / DevTest.title() / DevTest.screen('screen-codes')
//       DevTest.state()                       → position/save summary
//       DevTest.timeScale(10)                 → 10× all scalable durations
//       DevTest.wipeSlots([1,2,3])            → wipe dev test slots
//
// 3) EFFECT TIME SCALE - short effects (ailments, cooldowns, buffs) are
//    impossible to observe at real speed. Every wiring site multiplies its
//    duration by DEV_EFFECT_TIME_SCALE (default 1 = exact game behaviour);
//    see the constants section for the current site list. scale > 1 =
//    LONGER effects (observe them), scale < 1 = shorter. Deliberately NOT
//    scaled: level/puzzle timer, boss-phase timers.
//------------------------------------------------------------------------

//------------------------------------------------------------------------
//-------------------CONSTANTS & STATE-------------------------------------
//------------------------------------------------------------------------

// The global effect-time scale. Multiplied into scalable durations by the
// wiring sites; kept ≥ 0.01 so a typo can't freeze time silently
// (_devTestNormalizeScale enforces the same floor for param/console input).
window.DEV_EFFECT_TIME_SCALE = 1;

// Duration wiring sites for the effect time scale (see header section 3):
//   combat-ailments.js (_egApplyStatusToMap)         - ailment durations
//   class-cooldown-state.js (startSlotCooldown)      - ability cooldowns
//   endgame-quiz-buffs.js (expiry, FX, toast label)  - quiz buff stacks
//   universal-spells.js                              - spell durations
//   shield/shield.js (cursed-ward window)            - shield item
// Deliberately NOT scaled: level/puzzle timer, boss-phase timers.
// DEV_EFFECT_TIME_SCALE lives on window (not a module export) because the
// wiring sites read it there - it is a cross-file runtime setting.

//------------------------------------------------------------------------
//-------------------PARAM + SCALE HELPERS---------------------------------
//------------------------------------------------------------------------

// Reads the string query param or returns the fallback. Safe before the
// game state exists (touches only the browser URL).
export function _devTestParam(name, fallback) {
    try {
        const v = new URLSearchParams(window.location.search).get(name);
        if (v === null || v === '') return fallback;
        return v;
    } catch (e) { return fallback; }
}

// Normalizes the scale param/console value into a finite number ≥ 0.01
// (hard cap 1000). Out-of-range or non-numeric input falls back to 1 =
// exact shipped behaviour.
export function _devTestNormalizeScale(v) {
    const n = Number(v);
    if (!isFinite(n) || n <= 0) return 1;
    return Math.min(1000, Math.max(0.01, n));
}

//------------------------------------------------------------------------
//-------------------RUNTIME API (DevTest)----------------------------------
//------------------------------------------------------------------------

export const DevTest = {
    // Full boot chain. spec: { slot, character, skipIntro, skipTutorial,
    // screen: 'title'|'setup'|'mapview'|'world'|'game', world, level, force }
    goto(spec = {}) {
        const s = Object.assign({
            slot: null, character: 'stox', skipIntro: true, skipTutorial: true,
            screen: 'title', world: 0, level: 0, force: false,
        }, spec);

        const log = (msg) => console.info('%c[devtest] ' + msg, 'color:#7fd4ff');

        // Pick a slot. Default = 20 (the dedicated dev slot - least likely
        // to collide with a real player save, which the preview browser
        // profile SHARES). Explicit &slot=N is honoured, but a slot that
        // already holds real progress triggers a loud console warning.
        let slotNum = s.slot || 20;
        if (getSlotSummary(slotNum).empty) {
            // requested/dev slot is free - use it
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

        // 1. Save slot: load the slot through the real flow so the pending
        //    callback machinery and hub latches behave exactly like a click.
        // Intro cinematic bypass: the title flow shows it only when the
        // slot-scoped seen-flag is absent; marking it seen routes through
        // the same proceed() the SKIP button takes.
        if (s.skipIntro) {
            try { markSeen('intro_cinematic'); } catch (e) {}
        }
        showSaveSlotSelect(() => {
            // 2. Character + tutorial flags, then straight to setup.
            //    (Bypasses character-select UI and tutorial screens via the
            //    same STATE fields those screens write - no state is skipped.)
            if (!STATE) return;
            STATE.playerCharacter = s.character;
            if (s.skipTutorial) STATE.tutorialDone = true;
            save();

            if (s.screen === 'title') { log('done: title (slot ' + slotNum + ', char ' + s.character + ')'); return; }

            showSetup();
            if (s.screen === 'setup') { log('done: setup'); return; }

            // 3. Overworld map.
            launchExistingGame();
            if (s.screen === 'mapview') { log('done: mapview'); return; }

            // 4. World detail.
            showWorldDetail(s.world | 0);
            if (s.screen === 'world') { log('done: world ' + s.world); return; }

            // 5. In-game. startLevel honours math gates; force=1 calls
            //    _doStartLevel directly (same bypass the boss-test screen uses).
            const gi = (WORLD_START_GI[s.world | 0] !== undefined)
                ? WORLD_START_GI[s.world | 0] + (s.level | 0) : (s.level | 0);
            if (s.force) _doStartLevel(gi);
            else globalThis.startLevel(gi);
            log('done: game gi=' + gi + ' (slot ' + slotNum + ', char ' + s.character + ')');
        });
        onSaveSlotChosen(slotNum);
    },

    // --- Screen shortcuts ------------------------------------------------
    map() { showMapView(); },
    world(wi = 0) { showWorldDetail(wi | 0); },
    // level: startLevel respects math gates; force=true bypasses them.
    game(w = 0, l = 0, force = false) {
        const gi = (WORLD_START_GI[w] !== undefined)
            ? WORLD_START_GI[w] + l : l;
        if (force) _doStartLevel(gi);
        else globalThis.startLevel(gi);
    },
    setup() { showSetup(); },
    title() { showTitle(); },
    screen(id) { switchScreen(id); },

    // --- Introspection ----------------------------------------------------
    state() {
        if (!STATE) return 'no STATE';
        return {
            slot: getActiveSlot(),
            character: STATE.playerCharacter,
            class: STATE.playerClass || STATE.playerAscendency || null,
            levelsDone: STATE.done ? STATE.done.length : 0,
            nexusUnlocked: !!STATE.nexusUnlocked,
            activeScreen: document.querySelector('.screen.active')?.id || null,
            timeScale: window.DEV_EFFECT_TIME_SCALE,
        };
    },

    // --- Effect time scale -------------------------------------------------
    // >1 = longer effects (default testing), <1 = shorter. 1 = shipped game.
    timeScale(x) {
        window.DEV_EFFECT_TIME_SCALE = _devTestNormalizeScale(x);
        const msg = '⏱ Effect time scale = ×' + window.DEV_EFFECT_TIME_SCALE;
        showToast(msg);
        return window.DEV_EFFECT_TIME_SCALE;
    },

    // --- Movement control (scripted WASD tests) ------------------------------
    // freezeAvatar(true) pins the simple avatar in place (movement input
    // blocked, automation like knockback glides still render); the frozen
    // position is sampled through _avatarMoveTick's own accumulator. Pass
    // false (or nothing) to release. Only meaningful while the harness is
    // active (LEVEL_FLAGS.devTestActive).
    freezeAvatar(freeze = true) {
        window.LEVEL_FLAGS = window.LEVEL_FLAGS || {};
        window.LEVEL_FLAGS.devTestFreezeAvatar = !!freeze;
        return window.LEVEL_FLAGS.devTestFreezeAvatar;
    },

    // Dispatch a real WASD key event (keyboard-event-equivalent) against the
    // avatar handlers: press('d', 500) holds 'd' for 500 ms and reports the
    // sampled position before/after - the scripted equivalent of the manual
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
        const wiped = [];
        const refused = [];
        (list || []).forEach(n => {
            const s = getSlotSummary(n | 0);
            const realProgress = !s.empty && (s.levelsDone || 0) > 3;
            if (realProgress && !opts.force) { refused.push(n); return; }
            wipeSlot(n | 0);
            wiped.push(n);
        });
        renderSaveSlotScreen();
        let out = 'wiped slots: ' + (wiped.join(', ') || 'none');
        if (refused.length) out += ' - REFUSED (real progress, pass {force:true} to override): ' + refused.join(', ');
        return out;
    },
};
window.DevTest = DevTest;

//------------------------------------------------------------------------
//-------------------AUTO-BOOT (URL driven)---------------------------------
//------------------------------------------------------------------------
// URL params read here (all optional):
//   devtest=title|setup|mapview|map|world|game|level - boot target
//   w=N / l=N          - world / level (game + world targets)
//   slot=N             - save slot (default: 20, or first free slot below)
//   char=stox|trix|syla - character (default stox)
//   force=1            - bypass math gates when starting a level
//   keepintro=1        - let the intro cinematic play
//   keeptutorial=1     - keep the tutorial enabled
//   devscale=N         - preset DEV_EFFECT_TIME_SCALE

(function _devTestAutoBoot() {
    const mode = _devTestParam('devtest', null);
    if (!mode) return; // normal player boot - harness stays inert
    // Register the session in the game's owned flag namespace (see state.js).
    // _resetLevelFlags() deliberately preserves this entry across levels.
    window.LEVEL_FLAGS = window.LEVEL_FLAGS || {};
    window.LEVEL_FLAGS.devTestActive = true;

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
    if (devscale !== null) window.DEV_EFFECT_TIME_SCALE = _devTestNormalizeScale(devscale);
    // Wait for window load: every game script (including ones tagged after
    // this file) has run by then, so all flow functions exist.
    const boot = () => {
        console.info('%c[devtest] auto-boot: ' + JSON.stringify(spec), 'color:#7fd4ff');
        DevTest.goto(spec);
    };
    if (document.readyState === 'complete') boot();
    else window.addEventListener('load', boot);
})();
