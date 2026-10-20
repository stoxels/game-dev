import { ASCENDENCY_LIST } from '../classes/class-cooldown-state.js';
import { CLASS_LIST } from '../classes/class-defs.js';
import { ALL, WORLD_START_GI } from '../levels/levels.js';
import { CURRENCY_COLS, CURRENCY_ROWS, CURRENCY_SLOT_MAP, _currencyDefForId } from '../loot/hub-currency-layout.js';
import { ESSENCE_COLS, ESSENCE_ROWS, ESSENCE_SLOT_MAP } from '../loot/loot-essences.js';
import { _essenceDefForId } from '../loot/loot-essences-defs.js';
import { _isActive } from '../combat/combat-state.js';
import { SLOT_ACCEPTS } from '../hub/hub-drag-and-drop.js';
import { ALL_BASE_TYPES } from '../loot/equipment-base-items.js';
import { _baseWeaponFields } from '../loot/equipment-base-types.js';
import { SLOT_ICONS } from '../loot/equipment-slot-icons.js';
import { _rollModCounts } from '../loot/loot-equipment-generator.js';
import { _getModTable } from '../loot/loot-equipment-mod-tables.js';
import { _rollImplicitsForBase } from '../loot/loot-implicits.js';
import { _buildItemName } from '../loot/loot-mod-naming.js';
import { _rollMods } from '../loot/loot-mod-application.js';
import { _computePlayerStats } from '../combat/combat-player-stats.js';
import { _quizDamageBuffMult } from '../combat/combat-quiz-buffs.js';
import { showToast } from '../puzzle-mechanics/toasts-and-popups.js';
import { showMapView } from '../screens/screens-map-view.js';
import { onSaveSlotChosen, renderSaveSlotScreen, showSaveSlotSelect } from '../screens/screens-save-slots.js';
import { showWorldDetail } from '../screens/screens-world-levels.js';
import { launchExistingGame, showSetup, showTitle, switchScreen } from '../screens/screens.js';
import { _doStartLevel } from '../start-level.js';
import { SAVE_SLOT_COUNT, buildFreshState, getActiveSlot, getSlotSummary, save, setSlotName, wipeSlot, STATE } from '../state.js';
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
//   combat-ailments-core.js (_applyStatusToMap)   - ailment durations
//   class-cooldown-state.js (startSlotCooldown)      - ability cooldowns
//   combat-quiz-buffs.js (expiry, FX, toast label)  - quiz buff stacks
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
//-------------------CHEAT: TEST SLOTS (boss-testing roster)---------------
//------------------------------------------------------------------------
// One click on the dev mode-select screen ("🧪 Fill 15 Test Slots") writes
// up to 15 ready-to-play characters into EMPTY save slots: every campaign
// level + the Nexus unlocked, tutorial done, level-appropriate gear (L3-7 =
// just the tutorial sword; slots fill up gradually to all 19 by L100), 100M gold, 999 of every orb /
// shard (Cores tab) and 999 of every essence. Levels run 3 -> 100 and the
// characters rotate through all three heroes and every class/ascendency, so
// any boss can be tested at any power level.
//
// Slots holding anything are NEVER touched - run it again after wiping some
// slots to refill them. Trials stay un-cleared on purpose, so their
// first-clear rewards and boss fights are still testable. The written saves
// are plain data in the real save format; migrateOldSave() fills the rest
// when a slot is first loaded.

// Roster levels, low -> high (15 entries = 15 slots).
const DEV_TEST_SLOT_LEVELS = [3, 8, 12, 18, 24, 30, 36, 42, 50, 58, 66, 75, 85, 95, 100];
const DEV_TEST_CHARACTERS = ['stox', 'trix', 'syla'];
const DEV_TEST_GOLD = 100000000;
const DEV_TEST_STACK = 999;

// Slot key mirror of state.js _slotKey (slot 1 reuses the legacy key).
function _devTestSlotKey(n) { return n === 1 ? 'stoxels' : `stoxels_slot_${n}`; }

// Fixed-slot stash grid with 999 of every id in `slotMap`.
function _devTestStash(rows, cols, slotMap, defFor, category, rarity) {
    const grid = Array.from({ length: rows }, () => Array(cols).fill(null));
    for (const id of Object.keys(slotMap)) {
        const pos = slotMap[id];
        const def = defFor(id);
        if (!def || !grid[pos.r]) continue;
        grid[pos.r][pos.c] = { ...def, id, category, rarity, count: DEV_TEST_STACK };
    }
    return grid;
}

// Level-appropriate gear: for each paperdoll slot, the highest-tier base the
// level qualifies for (preferring the class's attribute archetype or 'any'),
// rolled through the SAME mod / implicit / naming pipeline as real drops so
// the items are indistinguishable from found loot. Rarity follows the level:
// green early, blue mid, purple late - roughly what a player would wear.
const DEV_TEST_CLASS_ARCHETYPE = { statistician: 'strength', mathmagician: 'intellect', probabilist: 'agility' };

function _devTestRarityForLevel(level) {
    if (level < 15) return 'uncommon';
    if (level < 40) return 'rare';
    return 'epic';
}

function _devTestMakeItem(base, level, rarity) {
    const table = _getModTable(base);
    const { prefixCount, suffixCount } = _rollModCounts(rarity);
    const mods = (table && prefixCount + suffixCount > 0)
        ? _rollMods(prefixCount, suffixCount, table, level, base.defenses) : [];
    const baseName = base.name;
    let implicits = [];
    try { implicits = _rollImplicitsForBase(base) || []; } catch (e) { implicits = []; }
    return {
        id: `${base.id}_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
        baseId: base.id,
        name: _buildItemName(baseName, rarity, mods),
        baseName,
        icon: base.icon || SLOT_ICONS[base.slotType] || '📦',
        category: 'equip',
        slotType: base.slotType,
        archetype: base.archetype,
        rarity,
        itemLevel: level,
        requirements: { ...base.requirements },
        defenses: { ...base.defenses },
        ..._baseWeaponFields(base),
        ...(base.hands ? { hands: base.hands } : {}),
        ...(base.blockChance ? { blockChance: base.blockChance } : {}),
        mods,
        implicits,
    };
}

// Order a real player tends to fill the paperdoll in (weapon first, then the
// armour the tutorial hands out, then everything else).
const DEV_TEST_SLOT_PRIORITY = [
    'weapon1', 'chest', 'pants', 'boots', 'head', 'gloves', 'belt', 'weapon2', 'bracers', 'shoulders',
    'cloak', 'amulet', 'ring1', 'ring2', 'earring1', 'earring2', 'arcane', 'talisman', 'ranged',
];
const DEV_TEST_STARTER_SWORD_ID = 'wpn_1h_1'; // the tutorial's starter weapon

// How many paperdoll slots a character of this level realistically has
// filled: 1 at level 3, all 19 by level 100.
function _devTestFilledSlotCount(level) {
    return Math.min(DEV_TEST_SLOT_PRIORITY.length,
        1 + Math.floor(Math.max(0, level - 3) * (DEV_TEST_SLOT_PRIORITY.length - 1) / 97));
}

function _devTestGear(level, cls) {
    // Brand-new characters own only the tutorial's starter sword.
    if (level < 8) {
        const sword = ALL_BASE_TYPES.find(b => b.id === DEV_TEST_STARTER_SWORD_ID);
        if (!sword) return {};
        const item = _devTestMakeItem(sword, sword.minLevel, 'common');
        item.noSellValue = true;
        return { weapon1: item };
    }
    const want = DEV_TEST_CLASS_ARCHETYPE[cls] || 'any';
    const rarity = _devTestRarityForLevel(level);
    const equipped = {};
    const slotsBySlotType = {};
    for (const [slotId, slotType] of Object.entries(SLOT_ACCEPTS)) {
        (slotsBySlotType[slotType] = slotsBySlotType[slotType] || []).push(slotId);
    }
    for (const [slotType, slotIds] of Object.entries(slotsBySlotType)) {
        let pool = ALL_BASE_TYPES.filter(b => b.slotType === slotType && b.minLevel <= level);
        if (slotType === 'weapon') pool = pool.filter(b => b.hands !== 2); // 1H main hand so the shield slot stays usable
        if (!pool.length) continue;
        const pref = pool.filter(b => b.archetype === want || b.archetype === 'any');
        const use = pref.length ? pref : pool;
        const top = Math.max(...use.map(b => b.minLevel));
        const best = use.filter(b => b.minLevel === top);
        slotIds.forEach((slotId, i) => {
            equipped[slotId] = _devTestMakeItem(best[i % best.length], level, rarity);
        });
    }
    const keep = new Set(DEV_TEST_SLOT_PRIORITY.slice(0, _devTestFilledSlotCount(level)));
    for (const slotId of Object.keys(equipped)) if (!keep.has(slotId)) delete equipped[slotId];
    return equipped;
}

// Class variant for roster position i: first 6 = base classes, the rest
// cycle through the six ascendencies (with their parent base class).
function _devTestVariant(i) {
    const asc = CLASS_LIST.flatMap(c => ASCENDENCY_LIST[c].map(a => ({ cls: c, asc: a })));
    if (i < 6) return { cls: CLASS_LIST[i % CLASS_LIST.length], asc: null };
    return asc[(i - 6) % asc.length];
}

function devCheatFillTestSlots() {
    const empties = [];
    for (let n = 1; n <= SAVE_SLOT_COUNT; n++) if (getSlotSummary(n).empty) empties.push(n);
    const targets = empties.slice(0, DEV_TEST_SLOT_LEVELS.length);
    if (!targets.length) {
        showToast('🧪 No empty save slots - wipe some first');
        return 0;
    }
    if (typeof window.confirm === 'function' &&
        !window.confirm(`Create ${targets.length} cheat test characters in empty slots ${targets.join(', ')}?\n(Existing saves are not touched.)`)) {
        return 0;
    }

    const allGi = ALL.map((_, gi) => gi);
    const lvlName = (c) => c.charAt(0).toUpperCase() + c.slice(1);
    targets.forEach((slotNum, i) => {
        const level = DEV_TEST_SLOT_LEVELS[i];
        const { cls, asc } = _devTestVariant(i);
        const character = DEV_TEST_CHARACTERS[i % DEV_TEST_CHARACTERS.length];
        const rank = level >= 40 ? 3 : level >= 15 ? 2 : 1;

        const s = buildFreshState();
        s.passiveTreeAllocated = [];
        s.playerCharacter = character;
        s.playerClass = cls;
        s.playerAscendency = asc;
        s.tutorialDone = true;
        s.done = allGi.slice();
        s.mathGatePassed = allGi.slice();
        s.nexusUnlocked = true;
        s.playerLevel = level;
        s.playerXP = 0;
        s.passiveTreePoints = level - 1;
        s.classPassiveLevel = rank;
        s.classActive1Level = rank;
        s.classActive2Level = rank;
        s.classActiveLevel = rank;
        s.ascendencySkill1Level = asc ? rank : 1;
        s.ascendencySkill2Level = asc ? rank : 1;
        s.egGold = DEV_TEST_GOLD;
        s.egHubVisited = true;
        s.egCurrencyStash = _devTestStash(CURRENCY_ROWS, CURRENCY_COLS, CURRENCY_SLOT_MAP, _currencyDefForId, 'currency', 'currency');
        s.egEquipped = _devTestGear(level, cls);
        s.egEssenceStash = _devTestStash(ESSENCE_ROWS, ESSENCE_COLS, ESSENCE_SLOT_MAP, _essenceDefForId, 'essence', 'essence');

        try {
            localStorage.setItem(_devTestSlotKey(slotNum), JSON.stringify(s));
            setSlotName(slotNum, `TEST L${level} ${lvlName(character)} ${lvlName(asc || cls)}`);
        } catch (e) {
            console.error('[devtest] could not write slot ' + slotNum, e);
        }
    });

    try { renderSaveSlotScreen(); } catch (e) { /* screen not built yet */ }
    showToast(`🧪 ${targets.length} test slots created (${targets.join(', ')})`);
    return targets.length;
}
DevTest.fillTestSlots = devCheatFillTestSlots;

//------------------------------------------------------------------------
//-------------------FIGHT LOG (boss-balance telemetry)--------------------
//------------------------------------------------------------------------
// Records one entry per boss fight - win, loss or left - and exports them
// as one JSON file ("📊 Export Fight Log" on the dev mode-select screen, or
// DevTest.fightLog()). Each entry carries the build snapshot, duration,
// damage taken (total + by source + biggest hits), the HP timeline of
// player and boss, and time spent in danger, so balance can be tuned from
// real fights instead of guesses.
//
// Pure observer: a 250 ms poll of the live combat globals plus one guarded
// call from _playerTakeDamage (encounter-damage.js) for attribution.
// Nothing here changes how a fight plays. Stored in localStorage under
// FIGHTLOG_KEY, capped at FIGHTLOG_MAX entries.

const FIGHTLOG_KEY = 'stoxels_fightlog';
const FIGHTLOG_MAX = 60;
const FIGHTLOG_POLL_MS = 250;
const FIGHTLOG_SAMPLE_MS = 1000;
const FIGHTLOG_TOP_HITS = 8;

let _flCur = null; // the fight currently being recorded

function _flRead() {
    try { return JSON.parse(localStorage.getItem(FIGHTLOG_KEY) || '[]') || []; } catch (e) { return []; }
}
function _flWrite(list) {
    try { localStorage.setItem(FIGHTLOG_KEY, JSON.stringify(list.slice(-FIGHTLOG_MAX))); } catch (e) { /* storage full - log is optional */ }
}

// Active quiz damage buff as a percentage (stacks x 10); 0 when none.
function _flQuizBuffPct() {
    try { return Math.round((_quizDamageBuffMult() - 1) * 1000) / 10; } catch (e) { return 0; }
}

function _flBuildSnapshot() {
    const S = STATE || {};
    const sheet = {};
    try {
        const stats = _computePlayerStats() || {};
        for (const [k, v] of Object.entries(stats)) {
            if (typeof v === 'number' && Number.isFinite(v) && v !== 0) sheet[k] = Math.round(v * 100) / 100;
        }
    } catch (e) { /* sheet is optional */ }
    return {
        slot: getActiveSlot(),
        character: S.playerCharacter || null,
        playerClass: S.playerClass || null,
        ascendency: S.playerAscendency || null,
        level: S.playerLevel || 1,
        levelLocked: !!window.__devLevelLock,
        // Quiz reward buff (+10% damage per correct-answer stack, reset every
        // run): not part of the stat sheet, but it changes damage dealt a lot.
        quizDamageBuffPct: _flQuizBuffPct(),
        maxHP: globalThis.playerMaxHP,
        maxMana: globalThis.playerMaxMana,
        gold: S.egGold || 0,
        skillRanks: {
            passive: S.classPassiveLevel, active1: S.classActive1Level, active2: S.classActive2Level,
            asc1: S.ascendencySkill1Level, asc2: S.ascendencySkill2Level,
        },
        passivePointsAllocated: S.passiveTreeAllocated ? Array.from(S.passiveTreeAllocated).length : 0,
        equippedCount: Object.keys(globalThis._equipped || S.egEquipped || {}).length,
        sheet,
    };
}

function _flStart(boss) {
    const trial = (typeof globalThis._isTrialRun === 'function') ? globalThis._isTrialRun() : null;
    const now = Date.now();
    _flCur = {
        v: 1,
        at: new Date(now).toISOString(),
        startedMs: now,
        lastSampleMs: 0,
        bossId: boss.id,
        boss: {
            name: boss.name || boss.baseId || String(boss.id),
            baseId: boss.baseId || boss.defId || null,
            level: boss.level,
            maxHP: boss.maxHP,
            element: boss.element || null,
        },
        trial: trial ? { kind: trial.kind || null, world: trial.wi != null ? trial.wi + 1 : (trial.world || null) } : null,
        killsBefore: Number(globalThis._bossKilledCount) || 0,
        player: _flBuildSnapshot(),
        damageTaken: 0,
        hitCount: 0,
        bySource: {},
        topHits: [],
        timeline: [],
        lowHPMs: 0,
        lastPollMs: now,
        minHPPct: 100,
        bossHalfAtSec: null,
    };
}

function _flFinish(result) {
    const f = _flCur;
    _flCur = null;
    if (!f) return;
    const endMs = Date.now();
    const rec = {
        v: f.v,
        at: f.at,
        result,
        durationSec: Math.round((endMs - f.startedMs) / 100) / 10,
        boss: f.boss,
        trial: f.trial,
        player: f.player,
        quizDamageBuffPctAtEnd: _flQuizBuffPct(),
        damageTaken: f.damageTaken,
        // share of damageTaken that came from ailment DoT (shadow burn etc.)
        ailmentDamage: f.ailmentDamage || 0,
        hitCount: f.hitCount,
        avgHit: f.hitCount ? Math.round((f.damageTaken - (f.ailmentDamage || 0)) / Math.max(1, f.hitCount)) : 0,
        // damage the boss fight cost, as a share of the player's max life
        damageTakenPctOfMaxHP: f.player.maxHP ? Math.round(f.damageTaken / f.player.maxHP * 100) : null,
        minPlayerHPPct: f.minHPPct,
        secondsBelow30PctHP: Math.round(f.lowHPMs / 100) / 10,
        bossHalfAtSec: f.bossHalfAtSec,
        bySource: f.bySource,
        topHits: f.topHits,
        timeline: f.timeline, // [tSec, playerHP, absorption, bossHPPct]
    };
    const list = _flRead();
    list.push(rec);
    _flWrite(list);
    try {
        showToast(`📊 Fight logged: ${rec.boss.name} - ${result} in ${rec.durationSec}s (${list.length} stored)`);
    } catch (e) { /* toast optional */ }
}

// Attribution hook called from _playerTakeDamage with the HP actually lost.
window.__fightLogHit = function (amount, isSpell, element, isBossAbility, attacker) {
    const f = _flCur;
    if (!f || !(amount > 0)) return;
    const who = (attacker && (attacker.name || attacker.baseId)) || (isBossAbility ? f.boss.name : 'unknown');
    const key = `${who}${isBossAbility ? ' (boss ability)' : ''}${isSpell ? ' [spell]' : ''}${element ? ' ' + element : ''}`;
    const e = f.bySource[key] || (f.bySource[key] = { hits: 0, total: 0 });
    e.hits++;
    e.total += amount;
    f.damageTaken += amount;
    f.hitCount++;
    const top = { t: Math.round((Date.now() - f.startedMs) / 100) / 10, amount, src: key };
    f.topHits.push(top);
    f.topHits.sort((a, b) => b.amount - a.amount);
    if (f.topHits.length > FIGHTLOG_TOP_HITS) f.topHits.length = FIGHTLOG_TOP_HITS;
    f.lastHit = { key, amount, top, at: Date.now(), element };
};

// Names the hit _playerTakeDamage just recorded: boss abilities report
// their mechanic ("Void Line", "Null Ray", ...) right after the damage lands,
// so the generic "(boss ability) [spell]" bucket is split per mechanic.
window.__fightLogAbility = function (dealt, bossName, abilityName) {
    const f = _flCur;
    const last = f && f.lastHit;
    if (!last || !(dealt > 0) || Date.now() - last.at > 150) return;
    const src = bossName ? `${bossName} - ${abilityName}` : String(abilityName);
    const key = `${src}${last.element ? ' ' + last.element : ''}`;
    const old = f.bySource[last.key];
    if (old) {
        old.hits--;
        old.total -= last.amount;
        if (old.hits <= 0) delete f.bySource[last.key];
    }
    const e = f.bySource[key] || (f.bySource[key] = { hits: 0, total: 0 });
    e.hits++;
    e.total += last.amount;
    last.top.src = key;
    f.lastHit = null;
};

// HP lost to ailment damage over time (burn, shadow burn, bleed, poison...):
// it never passes through _playerTakeDamage, so it needs its own hook.
window.__fightLogDot = function (amount, keys) {
    const f = _flCur;
    if (!f || !(amount > 0)) return;
    const key = `ailment: ${keys}`;
    const e = f.bySource[key] || (f.bySource[key] = { hits: 0, total: 0 });
    e.hits++;
    e.total += amount;
    f.damageTaken += amount;
    f.ailmentDamage = (f.ailmentDamage || 0) + amount;
};

function _flPoll() {
    let active = false;
    try { active = !!_isActive(); } catch (e) { active = false; }
    const monsters = Array.isArray(globalThis._monsters) ? globalThis._monsters : [];

    if (!_flCur) {
        if (!active) return;
        const boss = monsters.find(m => m.isBoss && m.currentHP > 0);
        if (boss) _flStart(boss);
        return;
    }

    const f = _flCur;
    const now = Date.now();
    const hp = Number(globalThis.playerCurrentHP) || 0;
    const maxHP = Number(globalThis.playerMaxHP) || 1;
    const boss = monsters.find(m => m.id === f.bossId);

    if (hp <= 0) { _flFinish('loss'); return; }

    if (!boss || boss.currentHP <= 0) {
        const killed = (Number(globalThis._bossKilledCount) || 0) > f.killsBefore || (boss && boss.currentHP <= 0);
        _flFinish(killed ? 'win' : 'left');
        return;
    }
    if (!active) { _flFinish('left'); return; }

    // time in danger
    const dt = now - f.lastPollMs;
    f.lastPollMs = now;
    const pct = hp / maxHP * 100;
    if (pct < 30) f.lowHPMs += dt;
    if (pct < f.minHPPct) f.minHPPct = Math.round(pct);
    const bossPct = boss.maxHP ? boss.currentHP / boss.maxHP * 100 : 100;
    if (f.bossHalfAtSec === null && bossPct <= 50) f.bossHalfAtSec = Math.round((now - f.startedMs) / 100) / 10;

    if (now - f.lastSampleMs >= FIGHTLOG_SAMPLE_MS && f.timeline.length < 900) {
        f.lastSampleMs = now;
        f.timeline.push([
            Math.round((now - f.startedMs) / 100) / 10,
            Math.round(hp),
            Math.round(Number(globalThis._playerAbsorptionCurrent) || 0),
            Math.round(bossPct * 10) / 10,
        ]);
    }
}
setInterval(_flPoll, FIGHTLOG_POLL_MS);

DevTest.fightLog = function () {
    const list = _flRead();
    if (!list.length) { showToast('📊 Fight log is empty - fight a boss first'); return 0; }
    const blob = new Blob([JSON.stringify({ exportVersion: 1, exportedAt: new Date().toISOString(), game: document.title, fights: list }, null, 1)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stoxels-fightlog-${list.length}fights.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    showToast(`📊 Fight log exported (${list.length} fights) - send me the file`);
    return list.length;
};
DevTest.clearFightLog = function () {
    try { localStorage.removeItem(FIGHTLOG_KEY); } catch (e) { /* ignore */ }
    showToast('📊 Fight log cleared');
};

//------------------------------------------------------------------------
//-------------------LEVEL LOCK (constant-level balance tests)-------------
//------------------------------------------------------------------------
// While locked, _awardXP (hub-leveling.js) awards nothing, so the
// character stays at exactly its level through monster kills, trial chains
// and level clears - fights stay comparable. Persisted across reloads.
// Button: "🔒 Level Lock" on the dev mode-select screen; console:
// DevTest.lockLevel(true|false).

const LEVELLOCK_KEY = 'stoxels_devlevellock';
try { window.__devLevelLock = localStorage.getItem(LEVELLOCK_KEY) === '1'; } catch (e) { window.__devLevelLock = false; }

function _levelLockRenderButton() {
    const el = document.getElementById('btn-dev-levellock');
    if (!el) return;
    const title = el.querySelector('.dms-card-title');
    if (title) title.textContent = window.__devLevelLock ? '🔒 Level Lock: ON (click to unlock)' : '🔓 Level Lock: OFF (click to lock)';
}

DevTest.lockLevel = function (on) {
    window.__devLevelLock = (on === undefined) ? !window.__devLevelLock : !!on;
    try { localStorage.setItem(LEVELLOCK_KEY, window.__devLevelLock ? '1' : '0'); } catch (e) { /* session-only */ }
    _levelLockRenderButton();
    showToast(window.__devLevelLock ? '🔒 Level locked - no XP will be gained' : '🔓 Level unlocked - XP works again');
    return window.__devLevelLock;
};

(function _bindLevelLockButton() {
    const el = document.getElementById('btn-dev-levellock');
    if (el) el.addEventListener('click', () => DevTest.lockLevel());
    _levelLockRenderButton();
})();

(function _bindFightLogButtons() {
    const exp = document.getElementById('btn-dev-fightlog');
    if (exp) exp.addEventListener('click', () => DevTest.fightLog());
    const clr = document.getElementById('btn-dev-fightlog-clear');
    if (clr) clr.addEventListener('click', () => { if (window.confirm('Clear all stored fight logs?')) DevTest.clearFightLog(); });
})();

(function _bindTestSlotsButton() {
    const el = document.getElementById('btn-dev-test-slots');
    if (el) el.addEventListener('click', devCheatFillTestSlots);
})();

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
