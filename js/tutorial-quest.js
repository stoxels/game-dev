import { Audio_Manager } from './audio/audio.js';
import { cooldownState, startSlotCooldown } from './classes/class-cooldown-state.js';
import { _getAbilityManaCost, _getPlayerMaxMana, canAffordMana, spendMana, updateClassHUDManaBar } from './classes/class-mana.js';
import { _egOnPause, _egOnResume } from './combat/encounter-tick.js';
import { _egAnimatePlayerProjectile, _egDamageTargetById, _egGetTarget, _egSpawnMonster, _egStopEncounter } from './combat/encounter.js';
import { EG_ALL_BASE_TYPES } from './loot/equipment-base-items.js';
import { _egCellHasAnyDrop, _egDropHeartPickup, _egFlushRunLootToStash, _egRenderLootOverlay } from './combat/combat-grid-pickups.js';
import { _egAddItemToStash, _egInventory, closeHubToGame, egSaveHubState, isHubGameOverlay, openHubFromGame, showEndgameHub } from './endgame/endgame-hub.js';
import { _egGetAllocatedAttributes, _egGetPlayerLevel } from './endgame/endgame-leveling.js';
import { EG_PLAYER_STATS, _egComputePlayerStats, _egGetAllEquippedItems } from './endgame/endgame-player-stats.js';
import { _egResetQuizDamageBuff } from './endgame/endgame-quiz-buffs.js';
import { _egLootDrops, _egPickups } from './combat/combat-state.js';
import { EG_VENDOR_FREE_BASE_IDS, _egvBuildBaseItemFromBase, _egvGetSlotOrder } from './loot/loot-vendor.js';
import { renderCell, updClues } from './grid.js';
import { keybindDisplayLabel, keybindKeyFor, onKeybindAction } from './keybinds.js';
import { ALL } from './levels/levels.js';
import { pval } from './mouse-button-handlers.js';
import { isTreeGameOverlay } from './passive-tree/passive-tree.js';
import { playItemEffect } from './puzzle-items/fx-dispatch.js';
import { buildInventoryPanel, closeInventoryFlyout, openInventoryFlyout } from './puzzle-items/inventory-panel.js';
import { ITEM_DEFS } from './puzzle-items/item-definitions.js';
import { FX_Z, _fxGetPuzzleRectForWrap } from './puzzle-items/shared/fx-helpers.js';
import { showItemGainPopup, showToast } from './puzzle-items/toasts-and-popups.js';
import { _consumeItem } from './puzzle-items/use-item.js';
import { questStat_revealItemUsed } from './quests/quests-stats.js';
import { isPuzzleSolved } from './scoring.js';
import { hideResultOverlays, showSetup } from './screens/screens.js';
import { _charmMake, _charmRenderOverlay, _egCharmDrops, grantCharm, isSkillCharmUnlocked } from './skills/skill-charms.js';
import { renderSkillHotbar } from './skills/skill-hotbar.js';
import { SKILL_REGISTRY, isSkillOnHotbar } from './skills/skill-registry.js';
import { closeSpellbook, isSpellbookOpen } from './skills/skill-spellbook.js';
import { USP_THEME_PROJ } from './skills/universal-spell-fx.js';
import { triggerBanter } from './sprite/character-banter.js';
import { _hidePlayerAvatar, _hidePlayerAvatarSimple } from './sprite/player_sprite.js';
import { save } from './state.js';
import { pauseTimer, resumeTimer, stopTimer } from './timer.js';
import { t } from './translation/translations.js';

//------------------------------------------------------------------------
//-------------------INTERACTIVE TUTORIAL QUEST---------------------------
//------------------------------------------------------------------------
// Replaces the static image tutorial for new players with a playable
// encounter chain of three 5x5 puzzles, guided by the Professor (🎓), who
// appears on the game screen with his own speech bubble and pauses the
// game (without the pause overlay) while explaining each system.
//
//   Puzzle 1 - nonogram basics (clues, timer, mistakes) + the Candle item.
//              The final two cells are genuinely ambiguous (a 50/50 guess),
//              so the player MUST use the candle the Professor gives them.
//   Puzzle 2 - a very weak rat introduces combat: fills deal damage, then a
//              heart drops and is claimed with a left-click to heal.
//   Puzzle 3 - steel and spellcraft, on a sealed grid: claim the Professor's
//              sword (B equips it onto the sheet), melee a bat down with
//              charged E strikes, claim its Fireball charm, slot it in the
//              spellbook (P), hotbar Fireball, and burn down a melee-immune
//              ghost. Then solve and graduate.
//
// The Professor's lines are styled after the game's stochastic storyline
// (probability, inference, deduction - the themes of the worlds and the
// mistake-eraser "Professor/Tutor" items).
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//---------------------------PUZZLE DATA----------------------------------
//------------------------------------------------------------------------

// Three brand-new 5x5 nonograms created for the tutorial.
//   TQ_P1 is fully deducible EXCEPT for a deliberate 2x2-corner ambiguity:
//   the solution fills the diagonal (0,0)+(1,1), but the anti-diagonal swap
//   (0,1)+(1,0) satisfies every row/column clue identically - verified by
//   brute force to yield EXACTLY 2 solutions. Logic alone cannot decide the
//   corner; only the Professor's Candle breaks the tie. Rows 3/4 are fully
//   filled so the player banks early wins while learning.
export const TQ_P1 = [
    [1, 0, 0, 0, 1],
    [0, 1, 0, 1, 0],
    [0, 0, 0, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
];
// All four corner cells: manual fills are blocked until the candle has been
// used (filling the anti-diagonal would be a blind 50/50 mistake). The
// tutorial candle reveals exactly ONE ambiguous cell (TQ_AMBIGUOUS_CELLS[0]
// = the top-left corner); the second cell ([1,1]) then follows from the
// clues - row 0 is complete, so (0,1) stays empty, and column 1 forces
// (1,1) filled. Same as the real candle: one revealed cell per use.
export const TQ_AMBIGUOUS_CELLS = [[0, 0], [1, 1]];
export const TQ_CORNER_CELLS = [[0, 0], [0, 1], [1, 0], [1, 1]];
// Puzzle 2 is a FULL-PICTURE grid: every single cell belongs to the
// solution (25 correct cells). A fresh, un-geared character deals exactly
// EG_PLAYER_STATS.baseDamage (10) per correct fill, and the tutorial rat's
// campaign HP budget (lvl.campaignMonsterHp = 55, ±15% spread → 47-63)
// always dies a few fills in. The moment the rat dies the board locks and
// the Professor's heart drops onto the grid (claimed with a left-click),
// then the board frees up to finish the picture. See the p2 step list.
export const TQ_P2 = [
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
];
// The tutorial rat's hoard: blade, bow and plate only - the armour
// versions of the vendor's free starter set. (The vendor stocks agility /
// intellect chest + pants variants too, but the tutorial keeps one clear
// defensive identity: armour.) Four pieces, all wearable fresh (level 1,
// 20/20/20 base attributes cover every requirement).
export const TQ_STARTER_BASE_IDS = ['wpn_1h_1', 'ranged_1', 'chest_str_1', 'pants_str_1'];
// Fills allowed during the combat lesson before the Professor pauses the
// board - exactly half of the 25 solution cells. The rat always dies well
// inside that cap (see the campaignMonsterHp comment in _tqStampLevel), so
// in practice the kill - not the cap - ends the combat phase; the cap only
// remains as a backstop.
export const TQ_P2_FILLS_LIMIT = 12;
export const TQ_P3 = [
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [1, 1, 1, 1, 1],
    [0, 1, 1, 1, 0],
    [1, 0, 1, 0, 1],
];

export const TQ_LEVEL_GRIDS = [TQ_P1, TQ_P2, TQ_P3];
export const TQ_LEVEL_HINTS = ['Deduction', 'The First Foe', 'Fire and Starlight'];
export const TQ_LEVEL_HINTS_DE = ['Deduktion', 'Der erste Gegner', 'Feuer und Sternenlicht'];

// Builds (once) and returns the global index of tutorial puzzle 0 in ALL.
export function _tqEnsureLevels() {
    if (window._tqLevelBaseG != null && ALL[window._tqLevelBaseG]
        && ALL[window._tqLevelBaseG].isTutorialQuest) {
        return window._tqLevelBaseG;
    }
    const base = ALL.length;
    TQ_LEVEL_GRIDS.forEach((grid, i) => {
        ALL.push({
            world: 15,
            li: i + 1,
            gIdx: base + i,
            size: 5,
            isTutorialQuest: true,
            tqPuzzle: i,
            hint: TQ_LEVEL_HINTS[i],
            hintDE: TQ_LEVEL_HINTS_DE[i],
            reveal: 'Every puzzle is a theorem: the clues are the axioms, the grid is the proof.',
            revealDE: 'Jedes Puzzle ist ein Theorem: Die Hinweise sind die Axiome, das Gitter der Beweis.',
            timer: 1800,
            bonusHint: '',
            bonusHintDE: '',
            grid: grid.map(r => r.slice()),
        });
    });
    window._tqLevelBaseG = base;
    return base;
}

// Re-applies the tutorial monster stamp to puzzles 2 and 3. The encounter
// teardown (_egStopEncounter → _egClearCampaignLevelFields(_egMapDef)) wipes
// the stamped fields off the level object after EVERY p2/p3 run - defeat,
// forfeit or completion alike. The level objects are reused for the whole
// session, so the stamp must be refreshed before any restart. The
// startLevel wrap calls this before every tutorial boot.
export function _tqRefreshMonsterStamps() {
    const base = _tqEnsureLevels();
    _tqStampLevel(ALL[base + 1]);
    _tqStampLevel(ALL[base + 2]);
}


//------------------------------------------------------------------------
//---------------------------QUEST STATE----------------------------------
//------------------------------------------------------------------------

// Active phase: null | 'p1' | 'p2' | 'intermission' | 'p3'.
export let _tqPhase = null;
// Index of the current step within the phase's step list.
export let _tqStepIdx = 0;
// Poll handle driving task-completion checks.
export let _tqPollTimer = null;
// True once the player has used the tutorial candle in puzzle 1.
export let _tqCandleUsed = false;
// True only while the candle-use lesson step is active (puzzle 1 s11): the
// Professor hands the candle over one step earlier (s10), but using it
// before he explains it would skip the lesson - early uses are refused with
// a toast (see the useItem wrap).
export let _tqCandleUsable = false;
// True once the player has cast Fireball at least once.
export let _tqFireballUsed = false;
// True once the player dragged Fireball onto the hotbar.
export let _tqFireballEquipped = false;
// Puzzle 3: true only while the spellbook is open during the drag lesson -
// pauses the encounter so the rat cannot chew on the player while they read
// the book. Cleared when the book closes or the lesson ends.
export let _tqSpellbookPause = false;
// True once the current tutorial puzzle was solved (drives solve tasks).
export let _tqPuzzleSolvedFlag = false;
// Puzzle-1 guided demos: while _tqGridLocked is true, EVERY grid click is
// swallowed (checkSpecialIntercepts wrap) unless it matches the active demo
// cell + button - the player can only interact when the Professor asks.
export let _tqGridLocked = false;
// Active demo: { kind: 'correct'|'mistake'|'cross', row, col, button } or null.
export let _tqActiveDemo = null;
// Per-demo completion flags (poll predicates read these).
export let _tqDemoDone = { correct: false, mistake: false, cross: false };
// Set when a monster was observed on the field (guards kill-task polling).
export let _tqSawMonster = false;

// Puzzle-2 lesson state. The half-fill gate arms with the rat fight: the
// player may fill exactly TQ_P2_FILLS_LIMIT solution cells, and the rat's
// HP budget guarantees it dies inside that cap. When the limit is hit (or
// the rat dies early) the board locks until the Professor has dropped the
// starter gear onto the remaining solution cells. _tqP2GateOpen then marks
// the claim task as active: while it is set, every grid input is swallowed
// unless it is a CORRECT FILL on a cell hosting a gear drop (the empty
// solution cell under the item claims it). _tqP2GearDropped /
// _tqP2GearClaimed / _tqP2GearFillsGate drive the remaining task
// predicates; _tqP2DropsBoardBackstop is a last-resort guard for a board
// filled without picking the gear up (stash grant instead of a dead run).
// _tqP2RatDead/_tqP2RatDeadAt freeze the fill count once the fight is over
// so post-kill fills never consume the lesson cap.
export let _tqP2FillsGate = false;
export let _tqP2FillsCount = 0;
export let _tqP2GateOpen = false;
export let _tqP2GearDropped = false;
export let _tqP2GearClaimed = false;
export let _tqP2GearFillsGate = false;
export let _tqP2SolvedAfterGear = false;
export let _tqP2DropsBoardBackstop = false;
export let _tqP2RatDead = false;
export let _tqP2RatDeadAt = 0;
// Heart lesson gate: while open (the Professor's heart has spawned and is
// still unclaimed), the otherwise-locked post-kill board accepts input ONLY
// on the heart's own cell - every other grid click is swallowed. This keeps
// the "no puzzle interaction until the Professor continues" promise without
// soft-locking the healing lesson. Cleared the moment the heart is claimed
// (or immediately when the spawn found no eligible cell).
export let _tqP2HeartOpen = false;
export let _tqP2HeartCell = null;
// Puzzle-3 drop gate: while open (the Professor's sword / charm has spawned
// and is still unclaimed), the otherwise-locked board accepts input ONLY on
// the drop's own cell, and ONLY via left-click (a right-click would destroy
// the drop). One gate serves both drops - they never overlap.
export let _tqP3DropOpen = false;
export let _tqP3DropCell = null;
// Puzzle-3 sword lesson state.
export let _tqP3SwordKey = null;
export let _tqP3SwordClaimed = false;
// Puzzle-3 charm lesson state.
export let _tqP3CharmKey = null;
export let _tqP3CharmClaimed = false;
// Puzzle-3: set once the ghost (fireball lesson) has spawned - drives the
// solve-time retry gate back to the right fight.
export let _tqP3GhostSpawned = false;
// Settling timestamp for the gear grant: claim-completion checks wait until
// every staggered placement has had its attempt, so a momentary zero count
// between two placements can never complete the task early.
export let _tqP2GearSettleAt = 0;
// Puzzle 2: set once the starter-gear grant step has run.
export let _tqLootForced = false;
// Throttle stamps for the grid-lock / ambiguity toasts (drag-paint safety).
export let _tqLockToastAt = 0;
export let _tqAmbiguityToastAt = 0;
// mistakeCount snapshot taken when the mistake demo starts, so the demo
// predicate can detect exactly the guided mistake.
export let _tqMistakesAtDemoStart = 0;// True while a "paused for explanation" step is showing its Continue button.
export let _tqWaitingForContinue = false;
// Meet-the-Professor circle state (puzzle 1 opener): { el, rafId, done } or null.
export let _tqMeetCircle = null;



//------------------------------------------------------------------------
//---------------------------PAUSE HELPERS---------------------------------
//------------------------------------------------------------------------

// Silent pause: freezes timer, monsters, spawn schedulers and cooldowns by
// setting _gamePaused WITHOUT showing the pause overlay (same pattern the
// encounter-chain interstitial questions use).
// Never resumes over the B sheet overlay: background task completions (e.g.
// the sword-equipped poll firing while the sheet is open) advance the lesson
// and every non-wait line calls _tqSetPaused(false) - without this guard the
// run would unpause behind the sheet, the tick would rebuild the sprite
// through it, and monsters would attack while the player equips. The hub
// owns the pause until closeHubToGame() hands it back.
export function _tqSetPaused(paused) {
    try {
        if (paused) {
            if (typeof pauseTimer === 'function') pauseTimer();
            globalThis._gamePaused = true;
            if (typeof _egOnPause === 'function') { try { _egOnPause(); } catch (e) {} }
        } else {
            if (typeof isHubGameOverlay === 'function' && isHubGameOverlay()) return;
            if (typeof isTreeGameOverlay === 'function' && isTreeGameOverlay()) return;
            globalThis._gamePaused = false;
            if (typeof _egOnResume === 'function') { try { _egOnResume(); } catch (e) {} }
            if (typeof resumeTimer === 'function') resumeTimer();
        }
    } catch (e) {}
}

// Spellbook drag lesson: pause the encounter for as long as the book is
// open (the player is reading a modal, not fighting). The s2 step arms the
// flag + initial pause; the rAF watcher keeps it applied until the lesson
// step advances past s4, which disarms it.
export function _tqSetSpellbookPause(on) {
    _tqSpellbookPause = !!on;
    if (on) {
        try { if (typeof isSpellbookOpen === 'function' && isSpellbookOpen()) _tqSetPaused(true); } catch (e) {}
    } else {
        // Only lift the silent pause if the book is closed by now; a still-
        // open book re-pauses via the watcher below.
        try {
            if (typeof isSpellbookOpen === 'function' && isSpellbookOpen()) return;
            _tqSetPaused(false);
        } catch (e) {}
    }
}

// Keeps the spellbook-pause in sync with open/close while the drag lesson
// is active. Runs on rAF (cheap boolean checks), cleaned up on lesson end.
export function _tqSpellbookPauseWatcher() {
    if (!_tqSpellbookPause) return;
    const open = (typeof isSpellbookOpen === 'function') && isSpellbookOpen();
    if (open && typeof _gamePaused !== 'undefined' && !globalThis._gamePaused) _tqSetPaused(true);
    else if (!open && typeof _gamePaused !== 'undefined' && globalThis._gamePaused) _tqSetPaused(false);
    window._tqSbWatcherRaf = requestAnimationFrame(_tqSpellbookPauseWatcher);
}

export function _tqStartSpellbookWatcher() {
    if (window._tqSbWatcherRaf) return;
    window._tqSbWatcherRaf = requestAnimationFrame(_tqSpellbookPauseWatcher);
}

export function _tqStopSpellbookWatcher() {
    if (window._tqSbWatcherRaf) { cancelAnimationFrame(window._tqSbWatcherRaf); window._tqSbWatcherRaf = null; }
}


//------------------------------------------------------------------------
//---------------------------PROFESSOR UI----------------------------------
//------------------------------------------------------------------------

// Professor portrait (transparent, converted from images/Tutorial/Professor.png).
export const TQ_PROFESSOR_IMAGE = 'images/Tutorial/Professor.webp';

// Properly-capitalized display name for tutorial lines ('Stox'/'Trix'/'Syla').
// Deliberately NOT _getAvatarCharacterName() - that returns the all-caps HUD
// name ('STOX'), which reads wrong mid-sentence.
export function _tqCharacterDisplayName() {
    const id = (globalThis.STATE && globalThis.STATE.playerCharacter) ? String(globalThis.STATE.playerCharacter) : 'stox';
    const name = id.charAt(0).toUpperCase() + id.slice(1).toLowerCase();
    return ['Stox', 'Trix', 'Syla'].includes(name) ? name : 'Stox';
}

// True while the interactive tutorial chain is running (any puzzle phase).
// Non-tutorial code paths use this to admit the classless tutorial player to
// the spellbook / hotbar / hotkeys (see skill-spellbook.js, skill-hotbar.js,
// class-cooldown-state.js, class-mana.js).
export function _tqIsTutorialActive() {
    return typeof _tqPhase !== 'undefined' && !!_tqPhase;
}

// Substitutes the tutorial placeholders into a Professor line:
//   {character_name}      - the selected character (Stox/Trix/Syla)
//   {key_move_up|left|down|right} - the player's actual movement keys from the
//                           persisted keybind map (WASD by default), formatted
//                           via the same keybindDisplayLabel() used elsewhere.
export function _tqFormatLine(textKey) {
    let line = t(textKey)
        .replace(/\{character_name\}/g, _tqCharacterDisplayName());
    if (typeof keybindKeyFor === 'function' && typeof keybindDisplayLabel === 'function') {
        ['up', 'left', 'down', 'right'].forEach((dir) => {
            const key = keybindKeyFor(`move-${dir}`) || { up: 'w', left: 'a', down: 's', right: 'd' }[dir];
            line = line.replace(new RegExp(`\\{key_move_${dir}\\}`, 'g'), keybindDisplayLabel(key));
        });
        // Spellbook + hotbar slots use the player's own keybind map too.
        const sbKey = keybindKeyFor('spellbook');
        if (sbKey) line = line.replace(/\{key_spellbook\}/g, keybindDisplayLabel(sbKey));
        // Melee attack (E), target cycling (Tab) and the character sheet (B)
        // for the puzzle-3 combat lessons.
        const atkKey = keybindKeyFor('eg-attack');
        if (atkKey) line = line.replace(/\{key_attack\}/g, keybindDisplayLabel(atkKey));
        const tgtKey = keybindKeyFor('cycle-target');
        if (tgtKey) line = line.replace(/\{key_target\}/g, keybindDisplayLabel(tgtKey));
        const sheetKey = keybindKeyFor('char-sheet');
        if (sheetKey) line = line.replace(/\{key_charsheet\}/g, keybindDisplayLabel(sheetKey));
        // {key_fireball_slot}: the keybind of whichever hotbar slot the player
        // actually dragged Fireball into (falls back to slot 1).
        const fbSlot = (typeof STATE !== 'undefined' && globalThis.STATE && Array.isArray(globalThis.STATE.skillHotbar))
            ? globalThis.STATE.skillHotbar.indexOf('fireball') : -1;
        const fbIdx = fbSlot >= 0 ? fbSlot : 0;
        const fbKey = keybindKeyFor(`hotbar-${fbIdx + 1}`);
        if (fbKey) line = line.replace(/\{key_fireball_slot\}/g, keybindDisplayLabel(fbKey));
        // Live numbers for the mana lesson: the pool grows with the starter
        // gear granted before puzzle 3, so the copy must not hardcode 60.
        line = line.replace(/\{fireball_cost\}/g, String((typeof _getAbilityManaCost === 'function') ? _getAbilityManaCost('active6') : 12));
        line = line.replace(/\{mana_pool\}/g, String((typeof _getPlayerMaxMana === 'function') ? _getPlayerMaxMana() : 60));
        for (let slot = 1; slot <= 10; slot++) {
            const hk = keybindKeyFor(`hotbar-${slot}`);
            if (hk) line = line.replace(new RegExp(`\\{key_hotbar_${slot}\\}`, 'g'), keybindDisplayLabel(hk));
        }
    }
    return line;
}

// Ensures the Professor's avatar + speech bubble exist on the game screen.
// The bubble reuses the player's banter bubble markup/styles
// (.char-speech-bubble in css/game.css) so both speakers share the same
// comic look and show/hide transition; only the anchoring differs.
export function _tqEnsureBubbleDom() {
    if (document.getElementById('tq-professor-wrap')) return;
    const wrap = document.createElement('div');
    wrap.id = 'tq-professor-wrap';
    wrap.innerHTML = `
        <img class="tq-professor-avatar" id="tq-professor-avatar" src="${TQ_PROFESSOR_IMAGE}" alt="">
        <div class="char-speech-bubble tq-bubble" id="tq-bubble">
            <div class="tq-bubble-name">${t('tq_prof_name')}</div>
            <div class="char-speech-bubble-text tq-bubble-text" id="tq-bubble-text"></div>
            <button class="tq-bubble-continue" id="tq-bubble-continue" style="display:none;">${t('tq_continue')}</button>
        </div>`;
    document.getElementById('screen-game').appendChild(wrap);
    // stopPropagation: the Continue click must not reach document-level
    // handlers - the inventory flyout's "click outside un-pins" listener
    // would otherwise close the flyout the tutorial just pinned open.
    document.getElementById('tq-bubble-continue')
        .addEventListener('click', (e) => { e.stopPropagation(); _tqOnContinue(); });
}

// Shows a Professor line. When `wait` is true the game pauses silently and
// the bubble shows a Continue button; otherwise it stays visible while the
// player performs the current task.
// Placeholders ({character_name}, {key_move_*}) are resolved by _tqFormatLine().
export function _tqSay(textKey, wait) {
    _tqEnsureBubbleDom();
    const wrap = document.getElementById('tq-professor-wrap');
    const bubble = document.getElementById('tq-bubble');
    const text = document.getElementById('tq-bubble-text');
    const cont = document.getElementById('tq-bubble-continue');
    if (!wrap || !bubble) return;
    wrap.style.display = '';
    text.textContent = _tqFormatLine(textKey);
    // Pop the bubble in with the banter-bubble transition (toggled class -
    // identical behaviour to the player's banter bubble).
    requestAnimationFrame(() => bubble.classList.add('show'));
    _tqWaitingForContinue = !!wait;
    cont.style.display = wait ? '' : 'none';
    _tqSetPaused(!!wait);
    // Non-paused steps: the player character replies after a natural pause
    // (paused steps reply on Continue instead).
    if (!wait) _tqPlayerReply(5000);
}

// Player replies to the Professor with a short banter line. eventKey picks
// the context-aware line bank in character-banter.js:
//   tutorial_reply   - acknowledgement after an explanation (default)
//   tutorial_solve   - congratulations right after a puzzle was solved
//   tutorial_mistake - a groan when a real mistake was registered
//   tutorial_cheer   - celebration when a tutorial monster goes down
// All fired with force=true to pass the global banter gap (level_start
// banter fires ~600ms into the level and would otherwise swallow the first
// reply); each event's own cooldown still throttles rapid sequences.
// Timestamp of the last CONTEXT reply (solve/mistake/cheer): context
// replies replace each other when they land together (puzzle 2: the
// killing fill also solves the puzzle) and hold off plain acknowledgements
// for a moment so the character doesn't chatter back-to-back.
// Chatter control ("responds too often with the same sentences"): the
// character no longer replies to EVERY Professor explanation - a global
// pace gate lets roughly every second explanation through, and a quiet
// stretch relaxes the gate so the bubble never goes fully dead. Context
// events (solve/mistake/cheer) additionally share one cooldown window so
// the killing fill doesn't stack solve + cheer + mistake bubbles.
// NOTE: the Professor never answers these replies - his asides were
// removed as confusing; the sprite simply acknowledges after ~5s.
export let _tqLastContextReplyAt = 0;
export let _tqLastReplyAttemptAt = 0;
export function _tqPlayerReply(delayMs, eventKey) {
    const key = eventKey || 'tutorial_reply';
    const fire = () => {
        const now = Date.now();
        if (key === 'tutorial_farewell') {
            // The graduation sign-off must always land - it bypasses the
            // context-arbitration gate entirely (its own per-event config
            // has chance 1.0 / no cooldown).
        } else if (key !== 'tutorial_reply') {
            if (now - _tqLastContextReplyAt < 8000) return;
            _tqLastContextReplyAt = now;
        } else {
            if (now - _tqLastContextReplyAt < 12000) {
                return;   // a context reply just spoke for the character
            }
            // Pace gate: skip plain acknowledgements when they come thick
            // and fast - but after a quiet stretch (2x the window) the
            // gate opens again so long explanations still get answers.
            const since = now - _tqLastReplyAttemptAt;
            if (since < 18000 && since >= 0 && _tqLastReplyAttemptAt) return;
            _tqLastReplyAttemptAt = now;
        }
        try { if (typeof triggerBanter === 'function') triggerBanter(key, true); } catch (e) {}
    };
    if (delayMs) setTimeout(fire, delayMs); else fire();
}

// Continue button → next step (only meaningful on paused steps). The player
// character chimes in right after the Professor's bubble closes.
export function _tqOnContinue() {
    if (!_tqWaitingForContinue) return;
    _tqWaitingForContinue = false;
    _tqSetPaused(false);
    document.getElementById('tq-bubble').classList.remove('show');
    _tqPlayerReply(5000);
    _tqRunCurrentPhase();
}

// Hides the Professor (end of tutorial).
export function _tqHideProfessor() {
    const wrap = document.getElementById('tq-professor-wrap');
    if (wrap) wrap.style.display = 'none';
    _tqHideGridLockBorder();
    _tqHideMeetCircle();
    _tqHidePointerLine();
}

//------------------------------------------------------------------------
//----------------------MEET-THE-PROFESSOR CIRCLE--------------------------
//------------------------------------------------------------------------
// Opening task of puzzle 1: a golden circle appears next to the Professor
// (same mechanic/look as the endgame safe circles, e.g. .eg-shr-safe-circle)
// and the player must WALK the avatar into it. Once the avatar stands inside,
// the circle turns green, disappears and the next Professor line plays.

// Spawns the meet-circle near the Professor's avatar (to his lower-left, on
// the open game area). Radius scales with the viewport.
export function _tqShowMeetCircle() {
    _tqHideMeetCircle();
    _tqEnsureBubbleDom();   // step fns run BEFORE _tqSay - create the wrap here
    const wrap = document.getElementById('tq-professor-wrap');
    if (!wrap) return;
    const r = Math.round(Math.max(48, Math.min(90, window.innerWidth * 0.05)));
    const el = document.createElement('div');
    el.className = 'tq-meet-circle';
    document.body.appendChild(el);
    _tqMeetCircle = { el, rafId: null, done: false };

    const place = () => {
        if (!_tqMeetCircle || _tqMeetCircle.el !== el) return;
        const rect = wrap.getBoundingClientRect();
        // Circle centre: below-left of the Professor, clear of the speech
        // bubble (which floats above him) - comfortably reachable from the
        // avatar's start anchor in the top-left.
        const cx = rect.left - r - 30;
        const cy = Math.min(window.innerHeight - r - 20, rect.bottom + r + 24);
        el.style.left = Math.round(cx - r) + 'px';
        el.style.top = Math.round(cy - r) + 'px';
        el.style.width = (r * 2) + 'px';
        el.style.height = (r * 2) + 'px';
    };
    place();
    window.addEventListener('resize', place);
    el._tqPlace = place;

    // Poll for the avatar entering the circle (same HUD rect sampling the
    // endgame safe circles use). Green flash → shrink → remove.
    const tick = () => {
        if (!_tqMeetCircle || _tqMeetCircle.el !== el) return;
        const avatar = document.getElementById('player-avatar-simple')
            || document.getElementById('player-avatar-wrapper');
        if (avatar) {
            const a = avatar.getBoundingClientRect();
            const c = el.getBoundingClientRect();
            const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
            const cx = c.left + c.width / 2, cy = c.top + c.height / 2;
            if (Math.hypot(ax - cx, ay - cy) < r) {
                _tqMeetCircle.done = true;
                window.removeEventListener('resize', place);
                el.classList.add('tq-meet-circle-done');
                setTimeout(() => { if (el.isConnected) el.remove(); }, 650);
                return; // stop polling - task predicate completes the step
            }
        }
        _tqMeetCircle.rafId = requestAnimationFrame(tick);
    };
    _tqMeetCircle.rafId = requestAnimationFrame(tick);
}

// Removes the meet-circle (idempotent).
export function _tqHideMeetCircle() {
    if (!_tqMeetCircle) return;
    const { el, rafId } = _tqMeetCircle;
    if (rafId) cancelAnimationFrame(rafId);
    if (el) {
        if (el._tqPlace) window.removeEventListener('resize', el._tqPlace);
        if (el.isConnected) el.remove();
    }
    _tqMeetCircle = null;
}


//------------------------------------------------------------------------
//---------------------GUIDED DEMOS & HIGHLIGHTS---------------------------
//------------------------------------------------------------------------
// Puzzle 1 walks the player through three guided clicks (correct fill,
// mistake, cross mark). While _tqGridLocked is true, the checkSpecial-
// Intercepts wrap swallows every grid click except the active demo cell
// with the expected button - the player can only interact where the
// Professor asks. Visual focus comes from pulsing outline highlights.

// Shows the "patience" toast at most once every ~1.2s (drag-paint safety).
export function _tqGridLockToast() {
    const now = Date.now();
    if (now - _tqLockToastAt < 1200) return;
    _tqLockToastAt = now;
    showToast('🎓 ' + t('tq_grid_lock'));
}

// Shown when the player tries to fill the undecidable pair pre-candle.
export function _tqAmbiguityToast() {
    const now = Date.now();
    if (now - _tqAmbiguityToastAt < 1200) return;
    _tqAmbiguityToastAt = now;
    showToast('🎓 ' + t('tq_ambiguity_lock'));
}

// Generic focus highlight (HUD elements, clue cells, inventory slots).
// Accepts a selector string OR an Element (e.g. from _tqPointAtDrop).
export function _tqHighlight(sel) {
    const els = (sel instanceof Element) ? [sel] : document.querySelectorAll(sel);
    els.forEach(el => {
        el.classList.add('tq-hl');
        // Bring the target into view - the spell book list and the charm
        // panel both scroll, and the scroll of Fireball sits near the bottom
        // of the charm grid. `nearest` never scrolls when it is already
        // visible, so this is a no-op for the on-screen highlights.
        try { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { /* older engine */ }
    });
}

// Floating keycap chip teaching a keyboard action (e.g. P for the
// Spellbook). Anchored to the RIGHT of the puzzle grid (same wrap-relative
// rect recipe as the grid-lock border, tracking zoom/resize); falls back to
// the fixed bottom-left corner when the grid rect is unavailable. Shows the
// ACTION's current keybind so rebindings are honoured; cleared with the
// normal highlight sweep.
export function _tqShowKeycapChip(actionId, textOverride) {
    _tqClearKeycapChip();
    const key = (typeof keybindKeyFor === 'function') ? keybindKeyFor(actionId) : null;
    const label = (key != null && typeof keybindDisplayLabel === 'function') ? keybindDisplayLabel(key) : String(key || '?');
    const chip = document.createElement('div');
    chip.id = 'tq-keycap-chip';
    chip.innerHTML = `<span class="tq-keycap-key">${label}</span><span class="tq-keycap-text">${textOverride || ''}</span>`;
    // Grid-anchored placement: right of the grid, vertically centred. If the
    // chip would run past the viewport edge (narrow screens), it drops below
    // the grid instead.
    const wrap = document.getElementById('puzzle-scaler-wrap');
    let gridRect = null;
    try { gridRect = (typeof _fxGetPuzzleRectForWrap === 'function') ? _fxGetPuzzleRectForWrap() : null; } catch (e) { gridRect = null; }
    if (wrap && gridRect) {
        if (!wrap.style.position || wrap.style.position === 'static') wrap.style.position = 'relative';
        chip.classList.add('tq-keycap-right');
        chip.style.position = 'absolute';
        chip.style.bottom = 'auto';
        wrap.appendChild(chip);
        const place = () => {
            if (!chip.isConnected) return;
            let r = null;
            try { r = _fxGetPuzzleRectForWrap(); } catch (e) { r = null; }
            if (!r) return;
            chip.style.left = Math.round(r.left + r.width + 16) + 'px';
            chip.style.top = Math.round(r.top + r.height / 2) + 'px';
            // Narrow-screen fallback: keep the chip on screen by dropping it
            // below the grid when it would overflow the viewport's right edge.
            requestAnimationFrame(() => {
                if (!chip.isConnected) return;
                const c = chip.getBoundingClientRect();
                if (c.right > window.innerWidth - 8) {
                    chip.style.left = Math.round(r.left) + 'px';
                    chip.style.top = Math.round(r.top + r.height + 12) + 'px';
                    chip.classList.add('tq-keycap-below');
                } else {
                    chip.classList.remove('tq-keycap-below');
                }
            });
        };
        place();
        chip._tqReposition = place;
        window.addEventListener('resize', place, { passive: true });
        wrap.addEventListener('wheel', place, { passive: true });
    } else {
        document.getElementById('screen-game').appendChild(chip);
    }
}

export function _tqClearKeycapChip() {
    const chip = document.getElementById('tq-keycap-chip');
    if (!chip) return;
    if (chip._tqReposition) {
        window.removeEventListener('resize', chip._tqReposition);
        const wrap = document.getElementById('puzzle-scaler-wrap');
        if (wrap) wrap.removeEventListener('wheel', chip._tqReposition);
    }
    chip.remove();
}

// Focus highlight for one puzzle cell (the .gc div inside its <td>).
export function _tqHighlightCell(row, col) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (el) el.classList.add('tq-cell-hl');
    _tqUpdatePointerLine();   // aim the pointer line at the new target
}

// Removes every tutorial highlight.
export function _tqClearHighlights() {
    document.querySelectorAll('.tq-hl').forEach(el => el.classList.remove('tq-hl'));
    document.querySelectorAll('.tq-cell-hl').forEach(el => el.classList.remove('tq-cell-hl'));
    _tqHidePointerLine();
    _tqClearKeycapChip();
}

//------------------------------------------------------------------------
//------------------------PROFESSOR POINTER LINE---------------------------
//------------------------------------------------------------------------
// A thin dashed line from the Professor's pointer hand to whatever he is
// currently highlighting (demo cell / clue headers / HUD widget / candle
// slot). Drawn as one fixed SVG overlay so the line can freely cross the
// screen; re-anchored every frame cheaply (one rect read + two attribute
// writes) so it tracks zoom, resize and layout shifts live.
export let _tqPointerSvg = null;
export let _tqPointerLine = null;
export let _tqPointerTipDot = null;
export let _tqPointerEndDot = null;
// Pointer-stick geometry measured from the actual Professor artwork
// (silhouette scan of images/Tutorial/Professor.webp): the drawn stick tip
// sits at ~2.7% across / ~33.6% down the avatar box, sloping up-left at
// roughly -30° (hand at ~16.6% / ~50.7%). Anchoring there instead of the
// avatar's right edge makes the line truly emanate from his pointer.
export const TQ_STICK_TIP = { x: 0.027, y: 0.336 };
export const TQ_STICK_ANGLE_DEG = 30;           // stick axis, up-left, from vertical
export const TQ_STICK_EXTEND_PX = 26;           // straight lead-out along the axis
export const TQ_STICK_HOVER_GAP = 10;           // standoff from the target edge

export function _tqEnsurePointerSvg() {
    if (_tqPointerSvg && _tqPointerSvg.isConnected) return;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'tq-pointer-svg';
    // The line is a <path>: from the stick tip, a short straight segment
    // along the drawn stick's axis, then a smooth curve bending toward the
    // target. Two circles glow at the junction (his stick tip) and at the
    // point being pointed at, so the connection reads as intentional.
    svg.innerHTML =
        '<path class="tq-pointer-line" d=""/>' +
        '<circle class="tq-pointer-dot tq-pointer-dot-tip" r="3.5"/>' +
        '<circle class="tq-pointer-dot tq-pointer-dot-end" r="3"/>';
    document.body.appendChild(svg);
    _tqPointerSvg = svg;
    _tqPointerLine = svg.querySelector('.tq-pointer-line');
    _tqPointerTipDot = svg.querySelector('.tq-pointer-dot-tip');
    _tqPointerEndDot = svg.querySelector('.tq-pointer-dot-end');
}

// Starts the live tracking loop while a pointer line is visible.
export function _tqStartPointerLoop() {
    if (window._tqPointerRaf) return;
    const tick = () => {
        if (!_tqPointerLine) { window._tqPointerRaf = null; return; }
        _tqUpdatePointerLine();
        window._tqPointerRaf = requestAnimationFrame(tick);
    };
    window._tqPointerRaf = requestAnimationFrame(tick);
}

export function _tqStopPointerLoop() {
    if (window._tqPointerRaf) { cancelAnimationFrame(window._tqPointerRaf); window._tqPointerRaf = null; }
}

// Anchors the line: starts at the Professor's pointer hand (upper body of
// his portrait, where he holds it), ends at the first highlighted target.
export function _tqUpdatePointerLine() {
    if (!_tqPointerLine) return;
    const prof = document.getElementById('tq-professor-avatar');
    if (!prof || !prof.isConnected) { _tqHidePointerLine(); return; }
    // Current target: the pulsing cell first (the usual case), else any
    // generic .tq-hl highlight (HUD widget, clue headers, candle slot).
    const cell = document.querySelector('.tq-cell-hl');
    const other = document.querySelector('.tq-hl');
    const target = cell || other;
    if (!target) { _tqHidePointerLine(); return; }
    const p = prof.getBoundingClientRect();
    const t = target.getBoundingClientRect();
    if (!t.width && !t.height) { _tqHidePointerLine(); return; }
    // Start: the drawn pointer stick's tip (left side of the artwork, ~34%
    // down - measured from the image silhouette, see TQ_STICK_TIP).
    const sx = p.left + p.width * TQ_STICK_TIP.x;
    const sy = p.top + p.height * TQ_STICK_TIP.y;
    // Straight lead-out along the stick axis (30° from vertical, up-left in
    // the artwork). The line leaves the tip in the stick's direction so the
    // junction looks continuous with what he is holding.
    const rad = (TQ_STICK_ANGLE_DEG * Math.PI) / 180;
    const dirX = -Math.sin(rad);   // leftward component of the stick axis
    const dirY = -Math.cos(rad);   // upward component
    const jx = sx + dirX * TQ_STICK_EXTEND_PX;
    const jy = sy + dirY * TQ_STICK_EXTEND_PX;
    // End: standoff point just outside the target edge facing the Professor,
    // with the approach direction coming back along the stick axis (so the
    // curve lands naturally at the tip of the arrowless line).
    const ex = (t.left < sx ? t.right : t.left) + (t.left < sx ? TQ_STICK_HOVER_GAP : -TQ_STICK_HOVER_GAP);
    const ey = t.top + t.height / 2;
    const retX = t.left < sx ? 1 : -1;             // approach from his side
    const retY = (ey - jy) < 0 ? -1 : 1;           // approach along last motion
    // One smooth cubic from the lead-out end to the target: control points
    // extend the stick axis and the approach axis respectively.
    const d = `M ${Math.round(sx)} ${Math.round(sy)}` +
        ` L ${Math.round(jx)} ${Math.round(jy)}` +
        ` C ${Math.round(jx + dirX * 30)} ${Math.round(jy + dirY * 30)},` +
        ` ${Math.round(ex + retX * 30)} ${Math.round(ey + retY * 30)},` +
        ` ${Math.round(ex)} ${Math.round(ey)}`;
    _tqEnsurePointerSvg();
    _tqPointerLine.setAttribute('d', d);
    if (_tqPointerTipDot) {
        _tqPointerTipDot.setAttribute('cx', Math.round(sx));
        _tqPointerTipDot.setAttribute('cy', Math.round(sy));
    }
    if (_tqPointerEndDot) {
        _tqPointerEndDot.setAttribute('cx', Math.round(ex));
        _tqPointerEndDot.setAttribute('cy', Math.round(ey));
    }
}

// Shows the pointer line (call after adding highlights).
export function _tqShowPointerLine() {
    _tqEnsurePointerSvg();
    _tqUpdatePointerLine();
    _tqStartPointerLoop();
}

// Hides the line and stops tracking (idempotent).
export function _tqHidePointerLine() {
    _tqStopPointerLoop();
    if (_tqPointerSvg && _tqPointerSvg.isConnected) _tqPointerSvg.remove();
    _tqPointerSvg = null;
    _tqPointerLine = null;
    _tqPointerTipDot = null;
    _tqPointerEndDot = null;
}

// Highlights + aims the pointer line (convenience for step definitions).
export function _tqPointAt(sel) {
    _tqHighlight(sel);
    _tqShowPointerLine();
}

// Highlights the candle slot in the inventory panel + the Reveal category
// button that owns it (so the player learns where the flyout lives).
export function _tqHighlightCandleSlot() {
    _tqHighlight('.inv-slot[data-def-id="reveal1"]');
    _tqHighlight('.inv-cat-btn[data-group="Reveal"]');
}

// Opens (pins) the Reveal inventory flyout so the candle slot actually
// exists in the DOM - the compact inventory bar only renders slots inside
// a flyout, and the tutorial's highlight would otherwise point at nothing.
// Closed again after the candle task (s12).
export function _tqOpenRevealFlyout() {
    try {
        if (typeof openInventoryFlyout !== 'function') return;
        const btn = document.querySelector('.inv-cat-btn[data-group="Reveal"]');
        if (!btn) return;
        window._invPinnedFlyoutGroup = 'Reveal';
        openInventoryFlyout('Reveal', btn);
    } catch (e) {}
}

// Unpins + closes the inventory flyout opened for the candle lesson.
export function _tqCloseInventoryFlyout() {
    try {
        if (window._invPinnedFlyoutGroup === 'Reveal') window._invPinnedFlyoutGroup = null;
        if (typeof closeInventoryFlyout === 'function') closeInventoryFlyout();
    } catch (e) {}
}

// Highlights the cell the candle will reveal (the undecidable top-left
// corner - the second ambiguous cell is the player's own deduction).
export function _tqHighlightAmbiguousCells() {
    const [r, c] = TQ_AMBIGUOUS_CELLS[0];
    _tqHighlightCell(r, c);
}


//------------------------------------------------------------------------
//----------------------GRID-LOCK BORDER (RED)-----------------------------
//------------------------------------------------------------------------
// While the Professor holds the board (guided demos, the puzzle-2 intro,
// the post-kill lock, the heart / gear claim gates, the half-fill cap), a
// red glowing border rings the puzzle grid - the same wrap-relative recipe
// as the shield item's gold border (_fxShieldBorderAdd in
// puzzle-items/shared/fx-helpers.js), recolored. _tqRefreshGridLockBorder()
// derives visibility from the live lock flags, so every mutator just calls
// it instead of tracking on/off. Puzzle 2 is excluded - its locks apply
// silently without the border.

// True when grid input is currently restricted anywhere in the tutorial.
export function _tqIsGridInputLocked() {
    if (typeof cur === 'undefined' || !globalThis.cur || !globalThis.cur.isTutorialQuest) return false;
    if (_tqGridLocked) return true;
    if (_tqPhase === 'p2') {
        if (_tqP2HeartOpen) return true;
    }
    return false;
}

export function _tqRefreshGridLockBorder() {
    try {
        // Puzzle 2 never shows the red border - the input locks still apply,
        // they just aren't visualized.
        if (typeof _tqPhase !== 'undefined' && _tqPhase === 'p2') { _tqHideGridLockBorder(); return; }
        if (_tqIsGridInputLocked()) _tqShowGridLockBorder();
        else _tqHideGridLockBorder();
    } catch (e) {}
}

// Shows the red lock border (idempotent).
export function _tqShowGridLockBorder() {
    if (document.getElementById('tq-grid-lock-border')) return;
    if (typeof _fxGetPuzzleRectForWrap !== 'function') return;
    const wrap = document.getElementById('puzzle-scaler-wrap');
    if (!wrap) return;
    if (!wrap.style.position || wrap.style.position === 'static') {
        wrap.style.position = 'relative';
    }
    const border = document.createElement('div');
    border.id = 'tq-grid-lock-border';
    const z = (typeof FX_Z !== 'undefined' && FX_Z && FX_Z.above != null) ? FX_Z.above : 950;
    border.style.cssText =
        'position:absolute;' +
        'pointer-events:none;' +
        'z-index:' + z + ';' +
        'border-radius:4px;' +
        'box-shadow:' +
        '0 0 0 3px rgba(255,70,70,0.95),' +
        '0 0 12px 4px rgba(255,70,70,0.6),' +
        '0 0 28px 8px rgba(255,70,70,0.35);' +
        'animation:tq-grid-lock-pulse 1.8s ease-in-out infinite;';
    wrap.appendChild(border);
    const place = () => {
        const el = document.getElementById('tq-grid-lock-border');
        if (!el) return;
        let r = null;
        try { r = _fxGetPuzzleRectForWrap(); } catch (e) { r = null; }
        if (!r) return;
        el.style.left = r.left + 'px';
        el.style.top = r.top + 'px';
        el.style.width = r.width + 'px';
        el.style.height = r.height + 'px';
    };
    place();
    border._tqReposition = place;
    window.addEventListener('resize', place, { passive: true });
    wrap.addEventListener('wheel', place, { passive: true });
}

// Hides the red lock border (idempotent).
export function _tqHideGridLockBorder() {
    const border = document.getElementById('tq-grid-lock-border');
    if (!border) return;
    if (border._tqReposition) {
        window.removeEventListener('resize', border._tqReposition);
        const wrap = document.getElementById('puzzle-scaler-wrap');
        if (wrap) wrap.removeEventListener('wheel', border._tqReposition);
    }
    border.remove();
}


//------------------------------------------------------------------------
//---------------------------STEP ENGINE-----------------------------------
//------------------------------------------------------------------------
// Each phase is a list of steps:
//   { say: 'key', wait: bool }        - explanation (optionally paused)
//   { say: 'key', task: 'name' }      - shows the line and polls the task
//   { fn: () => {} }                  - silent action step

// Task predicates - return true when the current task is complete.
export const TQ_TASKS = {
    // Puzzle 1 opener: the avatar reached the Professor's meet-circle.
    meet_professor: () => !!(_tqMeetCircle && _tqMeetCircle.done),
    // Puzzle 1: the candle has been used (its single revealed cell does not
    // complete the puzzle on its own - the lesson continues afterwards).
    use_candle: () => _tqCandleUsed,
    // Puzzle 1: the undecidable corner is fully resolved - every corner cell
    // matches the solution. Normally the candle reveals (0,0) and the clues
    // force the rest; any route that arrives here honestly also counts.
    // Solution-0 corners accept any non-fill state (empty, ✕ mark or ?) so
    // a player who marked the empties while learning is never soft-locked.
    corner_deduced: () => {
        if (typeof userGrid === 'undefined' || !globalThis.userGrid || typeof cur === 'undefined' || !globalThis.cur) return false;
        return TQ_CORNER_CELLS.every(([r, c]) => (globalThis.cur.grid[r][c] === 1 ? globalThis.userGrid[r][c] === 1 : globalThis.userGrid[r][c] !== 1));
    },
    // Puzzle 2: first correct grid reveal during the damage lesson. The
    // damage-explanation bubble stays up until the player has dealt damage
    // once, then the defeat-the-rat bubble takes over.
    first_fill: () => _tqP2FillsCount > 0 || _tqP2RatDead,
    // Puzzle 2: the rat was defeated (fills only). Stamps the death so the
    // fill count freezes. No random drop is forced here (the engine's own
    // rolls are suppressed for the tutorial - the Professor drops his own
    // heart on the kill).
    kill_monster: () => {
        const dead = _tqSawMonster && typeof _egMonsters !== 'undefined' && globalThis._egMonsters.length === 0;
        if (dead && !_tqP2RatDead) { _tqP2RatDead = true; _tqP2RatDeadAt = Date.now(); }
        return dead;
    },
    // Puzzle 2: the spawned heart has been claimed. Clearing the heart gate
    // here (not in the step flow) guarantees the gate resets even if the
    // heart expires on its own instead of being picked up.
    pick_heart: () => {
        const done = typeof _egPickups !== 'undefined' && _egPickups.size === 0;
        if (done && _tqP2HeartOpen) {
            _tqP2HeartOpen = false;
            _tqP2HeartCell = null;
            _tqRefreshGridLockBorder();
        }
        return done;
    },
    // Puzzle 3: the Professor's sword has been picked up. The claim routes
    // through the engine's loot pipeline (run loot bag) - flush it to the
    // stash IMMEDIATELY so the very next lesson (B + equip) can wear it
    // mid-puzzle instead of waiting for the encounter teardown.
    pick_sword: () => {
        if (_tqP3SwordClaimed) return true;
        try {
            if (typeof _egLootDrops !== 'undefined' && _tqP3SwordKey
                && !_egLootDrops.has(_tqP3SwordKey)) {
                _tqP3SwordClaimed = true;
                _tqP3DropOpen = false;
                _tqP3DropCell = null;
                if (typeof _egFlushRunLootToStash === 'function') {
                    try { _egFlushRunLootToStash(); } catch (e) {}
                }
                try { if (typeof egSaveHubState === 'function') egSaveHubState(); } catch (e) {}
                _tqRefreshGridLockBorder();
                return true;
            }
        } catch (e) {}
        return false;
    },
    // Puzzle 3: the Rusted Sword sits in the weapon slot.
    sword_equipped: () => !!(typeof STATE !== 'undefined' && globalThis.STATE
        && globalThis.STATE.egEquipped && globalThis.STATE.egEquipped.weapon1),
    // Puzzle 3: the bat was defeated with melee strikes. Guarded by
    // _tqSawMonster so an empty field at boot can never complete it.
    melee_kill: () => _tqSawMonster
        && typeof _egMonsters !== 'undefined' && globalThis._egMonsters.length === 0,
    // Puzzle 3: the dropped Fireball charm has been picked up (grantCharm
    // lands it straight in the charm inventory - no flush needed).
    pick_charm: () => {
        if (_tqP3CharmClaimed) return true;
        try {
            if (typeof _egCharmDrops !== 'undefined' && _tqP3CharmKey
                && !_egCharmDrops.has(_tqP3CharmKey)) {
                _tqP3CharmClaimed = true;
                _tqP3DropOpen = false;
                _tqP3DropCell = null;
                _tqRefreshGridLockBorder();
                return true;
            }
        } catch (e) {}
        return false;
    },
    // Puzzle 3: the ghost was burned down with Fireball.
    fireball_kill: () => _tqSawMonster
        && typeof _egMonsters !== 'undefined' && globalThis._egMonsters.length === 0,
    // Puzzle 2: the fill-limit gate. The cap arms when the rat appears and
    // counts only fills spent on the rat (frozen at its death). The task
    // resolves once the limit is reached (then the board locks for the gear
    // lesson); it also resolves when the rat dies early, so the Professor
    // never blocks a dead field.
    fills_half: () => !_tqP2FillsGate || _tqP2FillsCount >= TQ_P2_FILLS_LIMIT || _tqP2RatDead,
    // Puzzle 2: the starter gear has been picked up with correct fills on
    // the item cells (the normal empty-solution-cell claim). Completes when
    // the last piece of the set has left the board; the backstop marks it
    // complete if the board was filled without picking the gear up.
    claim_gear: () => {
        if (_tqP2GearDropped) _tqCheckGearFillsBackstop();
        return !_tqP2GearDropped || _tqP2GearClaimed;
    },
    // Puzzle 2: the remaining solution cells are filled - the puzzle is done
    // (the gear fill gate is lifted once the loot lesson task completes).
    fill_remaining: () => !_tqP2GearFillsGate || _tqP2SolvedAfterGear,
    // Puzzle 3: the spellbook was opened.
    open_spellbook: () => typeof isSpellbookOpen === 'function' && isSpellbookOpen(),
    // Puzzle 3: the Scroll of Fireball was dragged into a spell slot, which
    // unlocks the Fireball in the spell book (js/skills/skill-charms.js).
    slot_fireball: () => typeof STATE !== 'undefined' && globalThis.STATE && Array.isArray(globalThis.STATE.charmSlots)
        && globalThis.STATE.charmSlots.indexOf('fireball#1') !== -1,
    // Puzzle 3: Fireball sits on the hotbar.
    drag_fireball: () => typeof isSkillOnHotbar === 'function' && isSkillOnHotbar('fireball'),
    // Puzzle 3: Fireball was cast. If the ghost already died, the cast
    // lesson is moot: auto-skip instead of demanding a cast at nothing.
    cast_fireball: () => _tqFireballUsed
        || (typeof _egMonsters !== 'undefined' && _tqSawMonster && globalThis._egMonsters.length === 0),
    // Puzzle 3: monster defeated.
    kill_monster_2: () => _tqSawMonster && typeof _egMonsters !== 'undefined' && globalThis._egMonsters.length === 0,
    // Puzzle 1: guided demos on the locked grid.
    demo_correct: () => _tqDemoDone.correct,
    demo_mistake: () => _tqDemoDone.mistake,
    demo_cross: () => _tqDemoDone.cross,
    // The 14 deducible solution cells outside the undecidable corner are
    // filled - the "shape" lesson. (The corner cannot be filled before the
    // candle; empty cells stay empty - marks are fine, fills are mistakes.)
    cross_filled: () => {
        if (typeof userGrid === 'undefined' || !globalThis.userGrid || !globalThis.userGrid[0] || typeof cur === 'undefined' || !globalThis.cur) return false;
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                if (TQ_CORNER_CELLS.some(([ar, ac]) => ar === r && ac === c)) continue;
                if (globalThis.cur.grid[r][c] === 1 && globalThis.userGrid[r][c] !== 1) return false;
            }
        }
        return true;
    },
    // Any phase: the current puzzle was solved (checkWin intercept jumps the
    // phase - this predicate only resolves the poll).
    solve_puzzle: () => _tqPuzzleSolvedFlag,
};

// Steps per phase (see keys in translations-strings.js).
export function _tqPhaseSteps() {
    switch (_tqPhase) {
        case 'p1': return [
            { say: 'tq_p1_s0', task: 'meet_professor', fn: () => { _tqGridLocked = true; _tqDemoDone = { correct: false, mistake: false, cross: false }; _tqActiveDemo = null; _tqShowMeetCircle(); } },
            { say: 'tq_p1_s1', wait: true, fn: () => { _tqClearHighlights(); _tqPointAt('.ptable .rct'); _tqHighlight('.ptable .cch'); } },
            { say: 'tq_p1_s2', task: 'demo_correct', fn: () => { _tqClearHighlights(); _tqHighlightCell(3, 2); _tqShowPointerLine(); _tqActiveDemo = { kind: 'correct', row: 3, col: 2, button: 0 }; } },
            { say: 'tq_p1_s3', wait: true, fn: () => { _tqActiveDemo = null; _tqClearHighlights(); } },
            { say: 'tq_p1_s4', task: 'demo_mistake', fn: () => { try { _tqMistakesAtDemoStart = globalThis.mistakeCount; } catch (e) {} _tqHighlightCell(0, 3); _tqShowPointerLine(); _tqActiveDemo = { kind: 'mistake', row: 0, col: 3, button: 0 }; } },
            { say: 'tq_p1_s5', wait: true, fn: () => { _tqActiveDemo = null; _tqClearHighlights(); _tqPointAt('#timer-val'); _tqHighlight('#mistake-counter'); } },
            { say: 'tq_p1_s6', task: 'demo_cross', fn: () => { _tqClearHighlights(); _tqHighlightCell(1, 4); _tqShowPointerLine(); _tqActiveDemo = { kind: 'cross', row: 1, col: 4, button: 2 }; } },
            { say: 'tq_p1_s7', wait: true, fn: () => { _tqActiveDemo = null; _tqClearHighlights(); } },
            { fn: () => { _tqGridLocked = false; _tqClearHighlights(); _tqActiveDemo = null; } },
            { say: 'tq_p1_s8', task: 'cross_filled' },
            { say: 'tq_p1_s9', wait: true, fn: () => _tqClearHighlights() },
            { say: 'tq_p1_s10', wait: true, fn: () => { _tqGiveCandle(); _tqOpenRevealFlyout(); _tqHighlightCandleSlot(); _tqShowPointerLine(); } },
            { say: 'tq_p1_s11', task: 'use_candle', fn: () => { _tqCandleUsable = true; _tqClearHighlights(); _tqHighlightCandleSlot(); _tqHighlightAmbiguousCells(); _tqShowPointerLine(); } },
            { say: 'tq_p1_s11b', task: 'corner_deduced', fn: () => _tqClearHighlights() },  // candle showed one cell; the clues decide the rest
            { say: 'tq_p1_s12', wait: true, fn: () => { _tqClearHighlights(); _tqCloseInventoryFlyout(); } },  // s12 is ALSO the payoff step (corner solve jumps straight here)
        ];
        case 'p2': return [
            // Rat intro (paused) → damage lesson → defeat → heart → finish.
            // No starter gear, no loot lesson, no half-fill cap.
            { say: 'tq_p2_s0', wait: true, fn: () => { _tqGridLocked = true; _tqActiveDemo = null; _tqRefreshGridLockBorder(); } },   // monster appears (board locked - no fighting during the intro)
            { say: 'tq_p2_s1', fn: () => { _tqGridLocked = false; _tqArmFillsGate(); _tqRefreshGridLockBorder(); } },   // dealing damage through grid reveals
            { task: 'first_fill' },   // bubble vanishes on the first correct reveal
            { say: 'tq_p2_s1b', task: 'kill_monster' },   // fully defeat the rat
            { say: 'tq_p2_s2', fn: () => { _tqPointAtDrop('.eg-pickup-overlay:not(.eg-loot-overlay)'); } },   // pick the heart up (left-click only)
            { task: 'pick_heart' },
            { fn: () => { _tqGridLocked = false; _tqP2HeartOpen = false; _tqP2HeartCell = null; _tqClearHighlights(); _tqRefreshGridLockBorder(); } },   // heart healed - free board to finish
            { say: 'tq_p2_s3', task: 'solve_puzzle' },   // excellent - finish the puzzle
        ];
        case 'p3': return [
            // Sword lesson: no monster yet, board locked, sword drops on the
            // grid and is claimed with a single left-click.
            { say: 'tq_p3_s0', wait: true, fn: () => { _tqGridLocked = true; _tqActiveDemo = null; _tqRefreshGridLockBorder(); } },
            { say: 'tq_p3_s1', fn: () => { _tqPlaceSwordDrop(); _tqPointAtDrop('.eg-loot-overlay'); } },
            { task: 'pick_sword' },
            // Equip lesson: B opens the sheet over the paused run.
            { say: 'tq_p3_s2', task: 'sword_equipped', fn: () => { _tqGridLocked = true; _tqClearHighlights(); _tqRefreshGridLockBorder(); } },
            // Melee lesson: the bat arrives, grid stays sealed, blades only.
            { say: 'tq_p3_s3', task: 'melee_kill', fn: () => { _tqSpawnP3Bat(); } },
            // Charm lesson: the bat drops a Fireball charm onto the grid.
            { say: 'tq_p3_s4', fn: () => { _tqPlaceCharmDrop(); _tqPointAtDrop('.eg-charm-overlay, [id^="eg-charm-"]'); } },
            { task: 'pick_charm' },
            // Spellbook lessons: slot the charm, then hotbar the spell. No
            // monster is alive, so no spellbook pause is needed.
            { say: 'tq_p3_s5' },
            { fn: () => { _tqShowKeycapChip('spellbook', t('tq_chip_spellbook')); } },
            { task: 'open_spellbook' },
            { say: 'tq_p3_s6', wait: true, fn: () => { _tqClearHighlights(); _tqPointAtDrop('.charm-item[data-charm-key="fireball#1"]'); } },
            { task: 'slot_fireball' },
            { say: 'tq_p3_s7', wait: true, fn: () => { _tqClearHighlights(); _tqPointAtDrop('.spellbook-entry[data-skill="fireball"]'); } },
            { task: 'drag_fireball' },
            { fn: () => { try { if (typeof isSpellbookOpen === 'function' && isSpellbookOpen() && typeof closeSpellbook === 'function') closeSpellbook(); } catch (e) {} _tqClearHighlights(); try { if (typeof updateClassHUDManaBar === 'function') updateClassHUDManaBar(); } catch (e) {} } },
            // Fireball lesson: the ghost is immune to blades - burn it down.
            { say: 'tq_p3_s8', task: 'fireball_kill', fn: () => { _tqSpawnP3Ghost(); _tqPointAt('.skill-hotbar-slot[data-skill="fireball"]'); } },
            { fn: () => { _tqGridLocked = false; _tqClearHighlights(); _tqRefreshGridLockBorder(); } },
            { say: 'tq_p3_s9', task: 'solve_puzzle' },
            { say: 'tq_p3_s10', wait: true },
        ];
        default: return [];
    }
}

// Runs the step list from _tqStepIdx until it hits a wait, a task or the end.
export function _tqRunCurrentPhase() {
    // A jump (e.g. _tqOnPuzzleSolved retry/payoff) invalidates any poll that
    // is still running for a previous task step - kill it here so the old
    // predicate cannot fire a second advance while the new step is showing.
    if (_tqPollTimer) { clearInterval(_tqPollTimer); _tqPollTimer = null; }
    const steps = _tqPhaseSteps();
    while (_tqStepIdx < steps.length) {
        const st = steps[_tqStepIdx];
        _tqStepIdx++;
        if (st.fn) st.fn();
        // Show the line FIRST - a combined say+task step must display its
        // explanation while the task polls (wait+task never co-exists).
        if (st.say) _tqSay(st.say, !!st.wait);
        if (st.task) { _tqStartTask(st.task); return; }
        if (st.say && st.wait) return;   // resume via the Continue button
    }
    _tqPhaseFinished();
}

// Starts polling for a task's completion.
export function _tqStartTask(name) {
    if (_tqPollTimer) clearInterval(_tqPollTimer);
    const pred = TQ_TASKS[name];
    if (!pred) { _tqRunCurrentPhase(); return; }
    _tqPollTimer = setInterval(() => {
        try { _tqScanDemoOutcome(); } catch (e) {}
        let done = false;
        try { done = pred(); } catch (e) { done = false; }
        if (done) {
            clearInterval(_tqPollTimer);
            _tqPollTimer = null;
            // Puzzle 2 kill: the instant the rat goes down the board locks
            // and the Professor's heart drops onto the grid - only the heart
            // cell accepts input until it is claimed (see _tqSpawnHeart).
            if (name === 'kill_monster' && _tqPhase === 'p2') {
                _tqLockP2Grid();
                _tqSpawnHeart();
            }
            // Celebration when a combat task's monster goes down (puzzle 2
            // fill-combat kill; puzzle 3 melee / fireball kills).
            if (name === 'kill_monster' || name === 'kill_monster_2'
                || name === 'melee_kill' || name === 'fireball_kill') {
                _tqPlayerReply(5000, 'tutorial_cheer');
            }
            _tqRunCurrentPhase();
        }
    }, 400);
}

// Guided-demo outcome scan (puzzle 1). Reads the REAL game grids, so it
// catches clicks and drag-paint strokes alike - no extra engine wraps.
//   correct → the demo cell is now filled in userGrid (engine wrote it)
//   mistake → a real mistake was applied since the demo started
//             (mistakeCount is incremented by applyRealMistake AFTER
//             handleWrongFill, so the poll always sees the increment)
//   cross   → the demo cell now holds a player mark (2) or question mark (3)
export function _tqScanDemoOutcome() {
    const d = _tqActiveDemo;
    if (!d) return;
    if (d.done) return;
    try {
        if (d.kind === 'correct') {
            if (globalThis.userGrid[d.row][d.col] === 1) _tqDemoDone.correct = d.done = true;
        } else if (d.kind === 'mistake') {
            if (typeof mistakeCount === 'number' && globalThis.mistakeCount > _tqMistakesAtDemoStart) {
                _tqDemoDone.mistake = d.done = true;
            }
        } else if (d.kind === 'cross') {
            const v = globalThis.userGrid[d.row][d.col];
            if (v === 2 || v === 3) _tqDemoDone.cross = d.done = true;
        }
    } catch (e) {}
}

// All steps of the phase completed → advance the quest.
export function _tqPhaseFinished() {
    if (_tqPollTimer) { clearInterval(_tqPollTimer); _tqPollTimer = null; }
    // Safety: the grid lock belongs to puzzle 1's guided demos only. Clear
    // it on EVERY phase end (and boot) so a skipped/aborted lesson can never
    // leave the next puzzle's grid silently swallowing input.
    _tqGridLocked = false;
    _tqActiveDemo = null;
    _tqP2HeartOpen = false;
    _tqP2HeartCell = null;
    _tqP3DropOpen = false;
    _tqP3DropCell = null;
    _tqRefreshGridLockBorder();
    _tqClearHighlights();
    if (_tqPhase === 'p1') {
        _tqHideProfessor();
        showToast('🎓 ' + t('tq_toast_p1_done'));
        setTimeout(() => _tqStartPuzzle(1), 1600);
    } else if (_tqPhase === 'p2') {
        // No character sheet intermission - head straight into puzzle 3.
        _tqHideProfessor();
        showToast('🎓 ' + t('tq_toast_p2_done'));
        setTimeout(() => _tqStartPuzzle(2), 1600);
    } else if (_tqPhase === 'p3') {
        globalThis.STATE.tutorialDone = true;
        save();
        _tqHideProfessor();
        // Final farewell: as the Professor's graduation line closes, the
        // player's character signs off BY NAME (tutorial_farewell bank in
        // character-banter.js). The transition waits out the bubble's ~4.2s
        // lifetime so the goodbye plays in full.
        _tqPlayerReply(600, 'tutorial_farewell');
        setTimeout(() => {
            showToast('🎓 ' + t('tq_toast_graduated'));
            showSetup();
        }, 4200);
    }
}


//------------------------------------------------------------------------
//---------------------------PUZZLE FLOW-----------------------------------
//------------------------------------------------------------------------

// Starts tutorial puzzle i (0-based): stamps monster data and launches it
// through the normal level pipeline.
export function _tqStartPuzzle(i) {
    const base = _tqEnsureLevels();
    _tqPhase = i === 0 ? 'p1' : i === 1 ? 'p2' : 'p3';
    _tqStepIdx = 0;
    // Puzzle-2 lesson state resets with every level boot (retries included).
    _tqP2FillsGate = false;
    _tqP2FillsCount = 0;
    _tqP2GateOpen = false;
    _tqP2GearDropped = false;
    _tqP2GearClaimed = false;
    _tqP2GearFillsGate = false;
    _tqP2SolvedAfterGear = false;
    _tqP2DropsBoardBackstop = false;
    _tqP2RatDead = false;
    _tqP2RatDeadAt = 0;
    _tqP2HeartOpen = false;
    _tqP2HeartCell = null;
    // Puzzle-3 lesson state resets with every level boot (retries included).
    _tqP3DropOpen = false;
    _tqP3DropCell = null;
    _tqP3SwordKey = null;
    _tqP3SwordClaimed = false;
    _tqP3CharmKey = null;
    _tqP3CharmClaimed = false;
    _tqP3GhostSpawned = false;
    _tqSawMonster = false;
    _tqPuzzleSolvedFlag = false;
    _tqLootForced = false;
    _tqCandleUsable = false;
    // A fresh puzzle boot is never inside the equip lesson - make sure the
    // hub exits are visible again even if a previous run ended abruptly.
    try { document.body.classList.remove('tq-intermission-active'); } catch (e) {}
    _tqGridLocked = false;   // the lock is re-armed by p1's opener step
    // Puzzles 2 and 3 boot with the board locked (the s0 intro owns the
    // first Continue): without this, fills made during the 900ms boot window
    // or the paused intro could interact before the lesson starts. The old
    // grid is gone with the new level, so drop any stale border here - s0
    // re-shows it against the fresh grid rect.
    _tqHideGridLockBorder();
    if (_tqPhase === 'p2' || _tqPhase === 'p3') _tqGridLocked = true;
    if (_tqPhase === 'p3') _tqEnsureFireball();
    globalThis.startLevel(base + i);
    // Kick off the Professor's explanation once the level has booted (the
    // start pipeline is synchronous, so one tick is enough).
    setTimeout(() => _tqRunCurrentPhase(), 900);
}

// Stamps campaign-monster fields onto a tutorial level before startLevel
// runs. Puzzle 2 gets one very weak level-1 rat; puzzle 3 starts with NO
// monster at all (maxMonsters 0 → empty spawn list) and its lessons spawn a
// bat, then a ghost, on demand via _egSpawnMonster.
export function _tqStampLevel(lvl) {
    if (!lvl || !lvl.isTutorialQuest) return;
    if (lvl.tqPuzzle === 0) {
        // Puzzle 1: no monsters at all.
        delete lvl.campaignMonsters; delete lvl.isMonsterLevel;
        delete lvl.monsters; delete lvl.maxMonsters;
        delete lvl.campaignMonsterHp; delete lvl.campaignMonsterDamage;
        delete lvl.monsterLevel;
        return;
    }
    if (lvl.tqPuzzle === 2) {
        // Puzzle 3: a live encounter with an empty field. The HP/damage
        // budgets below are only defaults - each lesson re-stamps them right
        // before its own spawn (_tqSpawnP3Bat / _tqSpawnP3Ghost).
        lvl.campaignMonsters = true;
        lvl.isMonsterLevel = true;
        lvl.monsterLevel = 1;
        lvl.maxMonsters = 0;
        lvl.monsters = [];
        lvl.campaignMonsterHp = 45;
        lvl.campaignMonsterDamage = 3;
        return;
    }
    lvl.campaignMonsters = true;
    lvl.isMonsterLevel = true;
    lvl.monsterLevel = 1;
    lvl.maxMonsters = 1;
    lvl.monsters = [{ id: 'rat', level: 1 }];
    // The tutorial rat must be beatable by a fresh, un-geared character
    // using ONLY correct fills (reveal projectiles), and the fight must fit
    // inside the puzzle-2 half-fill lesson cap (TQ_P2_FILLS_LIMIT = 12 fills
    // of EG_PLAYER_STATS.baseDamage = 10 → 120 damage ceiling, minus ~5%
    // accuracy misses on a naked level-1 character). A budget of 55 (±15%
    // spread → 47-63) always dies at fill 5-7 - a real multi-stroke fight
    // that can never soft-lock the lesson: even 5 misses out of 12 fills
    // still kill the max roll, so the half-fill board lock can never strand
    // the player with a living rat and no way to deal damage.
    lvl.campaignMonsterHp = 55;
    lvl.campaignMonsterDamage = 5; // visible nibbles on the 100 HP bar - the
                                   // heart lesson needs the bar to actually move
}

// checkWin hook - the entire tutorial bypass of the normal win flow.
export function _tqOnPuzzleSolved() {
    _tqPuzzleSolvedFlag = true;

    // Retry gates: a lesson requirement was skipped - push the player back
    // to the missed task instead of finishing the phase. The encounter keeps
    // running so nothing is lost. p3 only bounces while the creature still
    // lives - at solve time it is always dead (see cast_fireball above), so
    // the bounce can never demand a cast at an empty field.
    if (_tqPhase === 'p1' && !_tqCandleUsed) {
        globalThis.dead = false;
        _tqStepIdx = 11;  // re-run the candle explanation + task (see p1 list: 8=silent, 11=s10 grant, 12=s11 use, 13=s11b deduce)
        _tqRunCurrentPhase();
        return;
    }
    // Puzzle 3: the board filled while a lesson monster still lives (the
    // grid is locked for both fights, so this is only a safety net). Push
    // the player back to the running fight - the encounter keeps running so
    // nothing is lost. New p3 list: 4=s3 melee+kill, 15=s8 fireball+kill.
    if (_tqPhase === 'p3'
        && typeof _egMonsters !== 'undefined' && globalThis._egMonsters.length > 0) {
        globalThis.dead = false;
        _tqStepIdx = _tqP3GhostSpawned ? 15 : 4;   // re-run the live fight
        _tqRunCurrentPhase();
        return;
    }
    // Puzzle 2: the board filled while the rat still lives. Push the player
    // back to the fight instead of finishing the lesson - the encounter
    // keeps running so nothing is lost.
    // New p2 list: 0=s0 intro, 1=s1 damage, 2=first_fill, 3=s1b+kill.
    if (_tqPhase === 'p2' && !_tqP2RatDead
        && typeof _egMonsters !== 'undefined' && globalThis._egMonsters.length > 0) {
        globalThis.dead = false;
        _tqStepIdx = 3;   // re-run the defeat-the-rat task
        _tqRunCurrentPhase();
        return;
    }

    // Phase genuinely finished: freeze everything and jump to the payoff.
    globalThis.dead = true;
    if (typeof stopTimer === 'function') stopTimer();
    if (typeof _egStopEncounter === 'function') _egStopEncounter();
    // Congratulation reply - the character celebrates the solved puzzle
    // after a natural beat, while the Professor's payoff line is up.
    _tqPlayerReply(5000, 'tutorial_solve');

    if (_tqPhase === 'p1') {
        _tqStepIdx = _tqPhaseSteps().length - 1;  // "well done" step
        _tqRunCurrentPhase();
        return;
    }
    if (_tqPhase === 'p2') {
        _tqStepIdx = _tqPhaseSteps().length - 1;  // finish speech step
        _tqRunCurrentPhase();
        return;
    }
    if (_tqPhase === 'p3') {
        _tqStepIdx = _tqPhaseSteps().length - 1;  // graduation
        _tqRunCurrentPhase();
        return;
    }
    // Unknown phase - fall back to the setup screen.
    showSetup();
}


//------------------------------------------------------------------------
//---------------------------REWARDS & GRANTS------------------------------
//------------------------------------------------------------------------

// Adds an ITEM_DEFS item to the player's puzzle-item inventory.
export function _tqGrantPuzzleItem(defId, extraProps) {
    globalThis.STATE.inventory.push(Object.assign({
        defId,
        uid: `item_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    }, extraProps || {}));
    if (typeof buildInventoryPanel === 'function') buildInventoryPanel();
    if (typeof showItemGainPopup === 'function') showItemGainPopup(defId);
}

// Puzzle 1: the Professor hands over his Candle (🕯️) - a tagged tutorial
// variant that reveals exactly ONE undecidable cell when used (the second
// one is the player's own deduction, like the real candle: 1 cell per use).
// Idempotent: the retry path may re-run this step.
export function _tqGiveCandle() {
    if (!globalThis.STATE.inventory.some(i => i.defId === 'reveal1' && i.isTutorialCandle)) {
        _tqGrantPuzzleItem('reveal1', { isTutorialCandle: true });
    }
    showToast('🎓 ' + t('tq_toast_candle'));
}

// The tutorial candle's effect: reveals EXACTLY ONE undecidable cell (the
// top-left corner) - never a random cell, never more than one - consumes
// the item and returns the toast message (same contract as a normal item
// handler). The revealed cell alone never completes the puzzle: the player
// must deduce the second ambiguous cell from the clues themselves.
export function _tqUseTutorialCandle(def) {
    if (typeof questStat_revealItemUsed === 'function') questStat_revealItemUsed();
    const [ar, ac] = TQ_AMBIGUOUS_CELLS[0];
    if (globalThis.cur.grid[ar][ac] === 1 && globalThis.userGrid[ar][ac] !== 1) {
        globalThis.revealedGrid[ar][ac] = true;
        globalThis.userGrid[ar][ac] = 1;
        renderCell(ar, ac);
        updClues(ar, ac);
    }
    playItemEffect('reveal1');
    globalThis.checkWin();
    return `🕯️ ${t('item_revealed').replace('{n}', 1)}`;
}

// Routes candle uses: the tagged tutorial candle performs the targeted
// reveal and consumes itself; a regular candle through the real pipeline
// still sets the flag (its reveal just doesn't break the tie).
export function _tqOnCandleUse(uid) {
    const idx = globalThis.STATE.inventory.findIndex(i => i.uid === uid);
    if (idx < 0) return;
    const item = globalThis.STATE.inventory[idx];
    if (item.isTutorialCandle) {
        const def = ITEM_DEFS[item.defId];
        // Flag BEFORE the reveal: the reveal's checkWin must already see the
        // candle as used, otherwise it takes the retry path mid-reveal.
        _tqCandleUsed = true;
        // Same consumption contract as the real pipeline (banter, Frugal
        // Use, achievements, save, toast, inventory rebuild).
        _consumeItem(idx, def, _tqUseTutorialCandle(def));
        return;
    }
    // Regular candle - the real pipeline already ran; just mark the flag.
    _tqCandleUsed = true;
}

// Puzzle 2: drops one guaranteed heart pickup so the player learns healing.
// Records the heart's cell and opens the heart gate: the post-kill board is
// otherwise fully locked, and only a LEFT-click on this cell is accepted
// until the heart is claimed (see pick_heart). Idempotent: the kill handler
// calls this, so a second call while the gate is open is a no-op. When the
// spawn finds no eligible cell the gate stays closed and the lesson
// completes on its own.
export function _tqSpawnHeart() {
    if (_tqP2HeartOpen) return;
    try {
        if (typeof _egPickups !== 'undefined' && _egPickups.size > 0) {
            const keys = Array.from(_egPickups.keys());
            _tqP2HeartCell = keys[keys.length - 1];
            _tqP2HeartOpen = true;
            _tqRefreshGridLockBorder();
            return;
        }
    } catch (e) {}
    _tqP2HeartOpen = false;
    _tqP2HeartCell = null;
    try {
        if (typeof _egDropHeartPickup === 'function') _egDropHeartPickup();
    } catch (e) {}
    try {
        if (typeof _egPickups !== 'undefined' && _egPickups.size > 0) {
            const keys = Array.from(_egPickups.keys());
            _tqP2HeartCell = keys[keys.length - 1];
            _tqP2HeartOpen = true;
        }
    } catch (e) {}
    _tqRefreshGridLockBorder();
}

// Puzzle 3: the Professor throws a Rusted Sword from the armory onto the
// grid. Placed on the centre solution cell (2,2) with no expiry - the drop
// gate (see the p3 intercept) admits only a left-click on that exact cell,
// so the blade can never be destroyed or missed. Falls back to a direct
// stash grant if the engine drop pipeline is unavailable.
export function _tqPlaceSwordDrop() {
    _tqP3DropOpen = false;
    _tqP3DropCell = null;
    _tqP3SwordKey = null;
    try {
        _tqEnsureFireball();
        if (typeof EG_ALL_BASE_TYPES === 'undefined'
            || typeof _egvBuildBaseItemFromBase !== 'function'
            || typeof cur === 'undefined' || !globalThis.cur || !globalThis.cur.grid
            || typeof userGrid === 'undefined' || !globalThis.userGrid) {
            _tqGrantSwordToStash();
            return;
        }
        const base = EG_ALL_BASE_TYPES.find((b) => b && b.id === 'wpn_1h_1');
        if (!base) { _tqGrantSwordToStash(); return; }
        const stamp = Date.now();
        const item = _egvBuildBaseItemFromBase(base);
        item.id = `wpn_1h_1_tutorial_${stamp}`;
        item.noSellValue = true;   // loot-filter proof, like the starter gear
        item.isTutorialSword = true;
        const key = '2-2';
        if (globalThis.cur.grid[2][2] !== 1 || globalThis.userGrid[2][2] !== 0) { _tqGrantSwordToStash(); return; }
        _egLootDrops.set(key, item);
        if (typeof _egRenderLootOverlay === 'function') _egRenderLootOverlay(2, 2, item);
        // No expiry: unlike normal loot, the lesson drop waits until claimed.
        _tqP3SwordKey = key;
        _tqP3DropCell = key;
        _tqP3DropOpen = true;
    } catch (e) {
        try { _tqGrantSwordToStash(); } catch (e2) {}
    }
    _tqRefreshGridLockBorder();
}

// Fallback used only when the grid-drop pipeline is unavailable: the blade
// goes straight into the persistent stash and the lesson continues at the
// equip step (the claim task completes immediately).
export function _tqGrantSwordToStash() {
    try {
        if (typeof EG_ALL_BASE_TYPES === 'undefined' || typeof _egvBuildBaseItemFromBase !== 'function') return;
        const base = EG_ALL_BASE_TYPES.find((b) => b && b.id === 'wpn_1h_1');
        if (!base) return;
        const item = _egvBuildBaseItemFromBase(base);
        item.id = `wpn_1h_1_tutorial_${Date.now()}`;
        item.noSellValue = true;
        if (typeof _egAddItemToStash === 'function') _egAddItemToStash(item);
        if (typeof egSaveHubState === 'function') egSaveHubState();
    } catch (e) {}
    _tqP3SwordClaimed = true;
}

// Puzzle 3: the defeated bat drops a Fireball charm (rank 1) onto the grid.
// Placed on the solution cell (2,0) with no expiry - claimed with a single
// left-click through the same drop gate as the sword. grantCharm lands it
// straight in the charm inventory, so no stash flush is needed.
export function _tqPlaceCharmDrop() {
    _tqP3DropOpen = false;
    _tqP3DropCell = null;
    _tqP3CharmKey = null;
    try {
        _tqEnsureFireball();
        if (typeof _charmMake !== 'function'
            || typeof _egCharmDrops === 'undefined'
            || typeof cur === 'undefined' || !globalThis.cur || !globalThis.cur.grid
            || typeof userGrid === 'undefined' || !globalThis.userGrid
            || globalThis.cur.grid[2][0] !== 1 || globalThis.userGrid[2][0] !== 0) {
            if (typeof grantCharm === 'function') grantCharm('fireball', 1);
            _tqP3CharmClaimed = true;
            return;
        }
        const charm = _charmMake('fireball', 1);
        const key = '2-0';
        _egCharmDrops.set(key, charm);
        if (typeof _charmRenderOverlay === 'function') _charmRenderOverlay(2, 0, charm);
        // No expiry scheduled: the lesson drop waits until claimed, so the
        // claim task can never complete without the charm being granted.
        _tqP3CharmKey = key;
        _tqP3DropCell = key;
        _tqP3DropOpen = true;
    } catch (e) {
        try { if (typeof grantCharm === 'function') grantCharm('fireball', 1); } catch (e2) {}
        _tqP3CharmClaimed = true;
    }
    _tqRefreshGridLockBorder();
}

// Clears stale fill damage (drag-charge + queued reveal projectiles) left
// over from the sword / charm pickup fills, so the lesson fights start
// clean and pickups never leak free damage into them.
export function _tqClearStaleFillDamage() {
    try { if (typeof _egDragChargeDamage !== 'undefined') globalThis._egDragChargeDamage = 0; } catch (e) {}
    try { if (typeof _egDragChargeStacks !== 'undefined') globalThis._egDragChargeStacks = 0; } catch (e) {}
    try { if (typeof _egPendingRevealQueue !== 'undefined') globalThis._egPendingRevealQueue = []; } catch (e) {}
}

// Puzzle 3 melee lesson: a bat arrives once the sword is equipped. Its HP
// budget (45 ±15% → 38-52) falls to a few fully-charged Rusted Sword strikes
// (4-10 base, doubled for manual pacing); it hits back gently (3).
// Idempotent: the solve-time retry path re-runs this step while the bat
// still lives, which must not double-spawn.
export function _tqSpawnP3Bat() {
    _tqClearStaleFillDamage();
    try {
        if (typeof _egMonsters !== 'undefined' && globalThis._egMonsters.length > 0) { _tqSawMonster = true; return; }
        if (typeof cur !== 'undefined' && globalThis.cur) {
            globalThis.cur.campaignMonsterHp = 45;
            globalThis.cur.campaignMonsterDamage = 3;
        }
        if (typeof _egSpawnMonster === 'function') _egSpawnMonster('bat', 1);
        _tqSawMonster = true;
    } catch (e) {}
}

// Puzzle 3 fireball lesson: a ghost arrives once Fireball sits on the
// hotbar. It is immune to melee (meleeImmune flag - blades flash IMMUNE) so
// only Fireball can bring it down. Three casts (18 each vs 50 ±15%) end it.
export function _tqSpawnP3Ghost() {
    _tqClearStaleFillDamage();
    _tqP3GhostSpawned = true;
    try {
        if (typeof _egMonsters !== 'undefined' && globalThis._egMonsters.length > 0) { _tqSawMonster = true; return; }
        if (typeof cur !== 'undefined' && globalThis.cur) {
            globalThis.cur.campaignMonsterHp = 50;
            globalThis.cur.campaignMonsterDamage = 3;
        }
        if (typeof _egSpawnMonster === 'function') _egSpawnMonster('ghost', 1);
        try {
            const g = (typeof _egMonsters !== 'undefined' && globalThis._egMonsters.length)
                ? globalThis._egMonsters[globalThis._egMonsters.length - 1] : null;
            if (g) g.meleeImmune = true;
        } catch (e) {}
        _tqSawMonster = true;
    } catch (e) {}
}

// Aims the Professor's pointer line at a grid drop (heart / loot overlay).
// The drop may spawn a beat after the step shows, so poll briefly - and the
// rAF pointer loop re-resolves the target every frame, so the line follows
// the drop and vanishes the moment it is claimed or expires.
export function _tqPointAtDrop(selector) {
    let attempts = 0;
    const tryPoint = () => {
        const el = document.querySelector(selector);
        if (el) { _tqHighlight(el); _tqShowPointerLine(); return; }
        if (++attempts < 20) setTimeout(tryPoint, 400);
    };
    tryPoint();
}

// Aims the pointer at the first unclaimed starter-gear drop. The drops sit
// on solution cells and outlive the lesson (60s lifetime, backstopped), so
// there is always something to point at until the set is complete.
export function _tqPointAtGearDrop() {
    let attempts = 0;
    const tryPoint = () => {
        if (_tqP2GearClaimed) return;
        const el = document.querySelector('.eg-loot-overlay');
        if (el) { _tqHighlight(el); _tqShowPointerLine(); return; }
        if (++attempts < 40) setTimeout(tryPoint, 400);
    };
    tryPoint();
}

// Arms the puzzle-2 half-fill gate: the player may fill exactly
// TQ_P2_FILLS_LIMIT solution cells, and the rat's HP budget guarantees the
// fight is won inside that cap. The count freezes when the rat dies.
export function _tqArmFillsGate() {
    _tqP2FillsGate = true;
    _tqP2FillsCount = 0;
    _tqP2RatDead = false;
    _tqP2RatDeadAt = 0;
}

// Locks the whole puzzle-2 board (the rat died and the heart lesson moves
// on). Uses p1's guided-demo lock machinery:
// every grid click is swallowed and the "patience" toast reminds the player
// who is teaching. Also freezes the fill count so post-kill fills never
// consume the lesson cap, and stamps the death time for the kill handler.
export function _tqLockP2Grid() {
    if (!_tqP2RatDead) { _tqP2RatDead = true; _tqP2RatDeadAt = Date.now(); }
    _tqGridLocked = true;
    _tqRefreshGridLockBorder();
}

// Opens the gear-claim gate: the lock narrows from "no input at all" to
// "only correct fills on cells hosting a starter-gear drop". Every other
// input is swallowed until the full set has been picked up.
export function _tqOpenGearGate() {
    _tqGridLocked = false;
    _tqP2GateOpen = true;
    _tqRefreshGridLockBorder();
}

// Gear fills: once the set is claimed, only correct fills on remaining
// solution cells count. Nothing extra is needed - the wrap lets them
// through and the engine takes over; this gate just drives the task.
export function _tqArmGearFillsGate() {
    _tqP2GateOpen = false;
    _tqP2GearFillsGate = true;
    _tqRefreshGridLockBorder();
}

export function _tqLiftGearFillsGate() {
    _tqP2GearFillsGate = false;
    _tqRefreshGridLockBorder();
}

// Counts a correct fill on puzzle 2 (called from the fill wrap). While the
// half-fill gate is armed this drives the fill-limit task; the count is
// frozen once the rat is dead so post-kill fills never consume the cap.
export function _tqCountCorrectFill() {
    if (_tqP2FillsGate && !_tqP2RatDead) _tqP2FillsCount++;
    _tqRefreshGridLockBorder();
}

// Safety backstop, polled by the gear-fills task: fires once when the LAST
// remaining solution cell has been filled while gear drops were still
// unclaimed (drops do not block fills, so this is possible). Marks the
// claim task complete - the puzzle then solves normally and the solve-time
// salvage in _tqOnPuzzleSolved grants the set to the stash.
export function _tqCheckGearFillsBackstop() {
    if (_tqP2DropsBoardBackstop || _tqP2GearClaimed) return;
    if (_tqP2GearSettleAt && Date.now() < _tqP2GearSettleAt) return;   // placements still in flight
    if (_tqCountGearDrops() > 0) return;
    if (typeof cur === 'undefined' || !globalThis.cur || !globalThis.cur.grid
        || typeof userGrid === 'undefined' || !globalThis.userGrid) return;
    for (let r = 0; r < globalThis.cur.grid.length; r++) {
        for (let c = 0; c < globalThis.cur.grid[r].length; c++) {
            if (globalThis.cur.grid[r][c] === 1 && globalThis.userGrid[r][c] === 0) return;   // cells still open
        }
    }
    _tqP2DropsBoardBackstop = true;
    _tqP2GearClaimed = true;
}

// Counts the starter-gear drops still sitting on the board (only items
// carrying the tutorial marker - any stray non-gear drop must not stall
// the claim task). The claim task completes when this reaches 0 - the full
// set has been picked up. (A drop expiring under the 60s lifetime also
// clears the task; the solve-time backstop re-grants the full set to the
// stash in that case, so nothing is permanently lost. Expiry is unlikely -
// the player is actively guided.)
export function _tqCountGearDrops() {
    try {
        if (typeof _egLootDrops === 'undefined') return 0;
        let n = 0;
        _egLootDrops.forEach(item => { if (item && item.isTutorialStarterGear) n++; });
        return n;
    } catch (e) {
        return 0;
    }
}

// Puzzle 2 lesson: the defeated rat drops the full free starter set from
// the atlas vendor DIRECTLY ONTO THE GRID - one item per remaining solution
// cell (4 items on ~18 open cells after a 6-fill kill). The drop happens
// INSTANTLY when the rat dies (see the kill_monster completion in
// _tqStartTask): the board locks at the same moment, so the gear simply
// waits while the Professor talks the player through hearts and loot, and
// the dedicated claim gate opens afterwards. The player picks each piece up
// with the normal solution-cell claim (correct fill), which routes the item
// through the engine's loot pipeline (run loot bag → stash flush) - the
// exact habit the loot lesson is teaching. Drops survive the lesson: unlike
// normal loot they carry no expiry (a mid-lesson expiry would zero the gear
// count and complete the claim task with the set lost), backstopped by the
// solve-time re-grant in _tqOnPuzzleSolved and the gear-fills backstop
// below. Idempotent: the kill handler and the s5 grant step both call this;
// the second call is a no-op.
export function _tqGrantStarterGear() {
    if (_tqP2GearDropped) return;
    try {
        if (typeof EG_VENDOR_FREE_BASE_IDS === 'undefined'
            || typeof EG_ALL_BASE_TYPES === 'undefined'
            || typeof _egvBuildBaseItemFromBase !== 'function') {
            // Engine helpers unavailable - stash-grant fallback so the set
            // is never lost (the lesson step then completes via backstop).
            _tqGrantStarterGearToStash();
            return;
        }
        const slotOrder = (typeof _egvGetSlotOrder === 'function') ? _egvGetSlotOrder() : [];
        const bases = EG_ALL_BASE_TYPES
            .filter(b => EG_VENDOR_FREE_BASE_IDS.has(b.id) && TQ_STARTER_BASE_IDS.indexOf(b.id) !== -1)
            .sort((a, b) => (slotOrder.indexOf(a.slotType) - slotOrder.indexOf(b.slotType)));
        if (!bases.length) { _tqGrantStarterGearToStash(); return; }
        const stamp = Date.now();
        const items = bases.map((base, i) => {
            const item = _egvBuildBaseItemFromBase(base);
            item.id = `${base.id}_${stamp}_${i}`;
            item.noSellValue = true;
            item.isTutorialStarterGear = true;   // safety-net marker
            return item;
        });
        // Stamp synchronously: the claim task's predicate keys off this
        // flag, and a deferred stamp would let the poll complete during
        // the placement stagger (0 drops counted yet) with nothing taught.
        _tqP2GearDropped = true;
        _tqP2GearSettleAt = Date.now();
        // Place every piece synchronously so the whole hoard is on the grid
        // the moment the rat dies - no stagger. A placement that cannot
        // land (no open solution cell left) falls back to the stash
        // immediately - that piece is never lost.
        items.forEach((item) => {
            if (!_tqPlaceGearDrop(item) && typeof _egAddItemToStash === 'function') {
                try { _egAddItemToStash(item); } catch (e) {}
            }
        });
        // _egAddItemToStash is mirror-only (no save) - persist so a
        // stash-fallback piece can never evaporate before the solve-time
        // flush. Refused safely while the hub load latch is unset.
        try { if (typeof egSaveHubState === 'function') egSaveHubState(); } catch (e) {}
    } catch (e) {
        try { _tqGrantStarterGearToStash(); } catch (e2) {}
    }
}

// Places one starter-gear item on the first open remaining solution cell.
// Cells are only eligible while untouched (userGrid 0, no reveal, no
// mistake mark) and host no other drop - the exact engine eligibility rule,
// so a claimed cell is never reused. Returns true on success.
export function _tqPlaceGearDrop(item) {
    try {
        if (typeof cur === 'undefined' || !globalThis.cur || !globalThis.cur.grid
            || typeof userGrid === 'undefined' || !globalThis.userGrid) return false;
        const open = [];
        for (let r = 0; r < globalThis.cur.grid.length; r++) {
            for (let c = 0; c < globalThis.cur.grid[r].length; c++) {
                if (globalThis.cur.grid[r][c] !== 1) continue;             // gear lives on solution cells
                if (globalThis.userGrid[r][c] !== 0) continue;             // untouched only
                if (typeof revealedGrid !== 'undefined' && globalThis.revealedGrid[r] && globalThis.revealedGrid[r][c]) continue;
                if (typeof wrongGrid !== 'undefined' && globalThis.wrongGrid[r] && globalThis.wrongGrid[r][c]) continue;
                if (typeof _egCellHasAnyDrop === 'function' && _egCellHasAnyDrop(r, c)) continue;
                open.push([r, c]);
            }
        }
        if (!open.length) return false;
        const [r, c] = open[Math.floor(Math.random() * open.length)];
        const key = `${r}-${c}`;
        _egLootDrops.set(key, item);
        if (typeof _egRenderLootOverlay === 'function') _egRenderLootOverlay(r, c, item);
        // No expiry scheduling: unlike normal loot, the lesson drops persist
        // until claimed (or until encounter teardown). A mid-lesson expiry
        // would zero the gear count and complete the claim task with the
        // set lost - the solve-time salvage only covers refusal, not silent
        // disappearance. 60s is plenty when the Professor points at them.
        return true;
    } catch (e) {
        return false;
    }
}

// Fallback used only when the grid-drop pipeline is unavailable: the full
// starter set goes straight into the persistent endgame stash, exactly like
// the old grant. The lesson flow completes through the backstop gates.
export function _tqGrantStarterGearToStash() {
    try {
        if (typeof EG_VENDOR_FREE_BASE_IDS === 'undefined'
            || typeof EG_ALL_BASE_TYPES === 'undefined'
            || typeof _egvBuildBaseItemFromBase !== 'function') return;
        const slotOrder = (typeof _egvGetSlotOrder === 'function') ? _egvGetSlotOrder() : [];
        const bases = EG_ALL_BASE_TYPES
            .filter(b => EG_VENDOR_FREE_BASE_IDS.has(b.id) && TQ_STARTER_BASE_IDS.indexOf(b.id) !== -1)
            .sort((a, b) => (slotOrder.indexOf(a.slotType) - slotOrder.indexOf(b.slotType)));
        const stamp = Date.now();
        bases.forEach((base, i) => {
            const item = _egvBuildBaseItemFromBase(base);
            item.id = `${base.id}_${stamp}_${i}`;
            item.noSellValue = true;
            if (typeof _egAddItemToStash === 'function') _egAddItemToStash(item);
        });
        if (typeof egSaveHubState === 'function') egSaveHubState();
    } catch (e) {}
}


//------------------------------------------------------------------------
//---------------------------INTERMISSION----------------------------------
//------------------------------------------------------------------------

// Shows the equip intermission and opens the REAL endgame hub (character
// sheet + inventory, fully synchronized - drag gear onto the paperdoll).
// Advances to puzzle 3 once weapon and chest are equipped.
export function _tqShowIntermission() {
    // Self-healing: the lesson below is only completable with the 4 starter
    // pieces in stash (or already equipped). If any piece went missing on
    // the way here (refused save, discarded drop, stale mirror), rebuild it
    // now so the intermission can never strand the player on an empty sheet.
    _tqEnsureIntermissionGear();
    _tqEnsureIntermissionDom();
    document.getElementById('tq-intermission').classList.add('show');
    // While the lesson runs, the hub's top-bar exits stay hidden (leaving
    // for Nexus/tree/atlas/gate mid-lesson would strand the tutorial with
    // no way back). Restored the moment the gear is equipped.
    try { document.body.classList.add('tq-intermission-active'); } catch (e) {}
    setTimeout(() => {
        try { if (typeof showEndgameHub === 'function') showEndgameHub(); } catch (e) {}
    }, 400);
    // Poll until the essentials are equipped. The checklist in the box ticks
    // along live so a stall is always actionable; a state change is logged
    // for diagnosis.
    if (_tqPollTimer) clearInterval(_tqPollTimer);
    let _tqInterLastSig = '';
    _tqPollTimer = setInterval(() => {
        const eq = (typeof STATE !== 'undefined' && globalThis.STATE && globalThis.STATE.egEquipped) || {};
        const hasWeapon = !!(eq.weapon1);
        const hasArmor = !!(eq.chest || eq.pants);
        _tqUpdateIntermissionChecklist(hasWeapon, hasArmor);
        const sig = `${hasWeapon ? 1 : 0}${hasArmor ? 1 : 0}|${Object.keys(eq).length}`;
        if (sig !== _tqInterLastSig) {
            _tqInterLastSig = sig;
            try { console.info('[tutorial] intermission poll', { hasWeapon, hasArmor, slots: Object.keys(eq) }); } catch (e) {}
        }
        if (hasWeapon && hasArmor) {
            clearInterval(_tqPollTimer);
            _tqPollTimer = null;
            document.getElementById('tq-intermission').classList.remove('show');
            try { document.body.classList.remove('tq-intermission-active'); } catch (e) {}
            showToast('🎓 ' + t('tq_toast_equipped'));
            setTimeout(() => _tqStartPuzzle(2), 1200);
        }
    }, 800);
}

// Ticks the intermission checklist (weapon / armor ✓ or ✗).
export function _tqUpdateIntermissionChecklist(hasWeapon, hasArmor) {
    try {
        const w = document.getElementById('tq-inter-check-weapon');
        const a = document.getElementById('tq-inter-check-armor');
        if (w) {
            w.textContent = `${hasWeapon ? '✓' : '✗'} ${t('tq_inter_check_weapon')}`;
            w.className = `tq-inter-check ${hasWeapon ? 'tq-inter-check-done' : 'tq-inter-check-open'}`;
        }
        if (a) {
            a.textContent = `${hasArmor ? '✓' : '✗'} ${t('tq_inter_check_armor')}`;
            a.className = `tq-inter-check ${hasArmor ? 'tq-inter-check-done' : 'tq-inter-check-open'}`;
        }
    } catch (e) {}
}

// Intermission safety net (see _tqShowIntermission): every starter base id
// must be present in the stash or on the paperdoll when the equip lesson
// starts. Missing pieces are rebuilt silently (white vendor bases, no sell
// value) and persisted - the poll below can always complete.
export function _tqEnsureIntermissionGear() {
    try {
        const have = new Set();
        const scan = (item) => {
            if (item && item.baseId && TQ_STARTER_BASE_IDS.indexOf(item.baseId) !== -1) have.add(item.baseId);
        };
        try {
            if (typeof _egGetAllEquippedItems === 'function') _egGetAllEquippedItems().forEach(scan);
        } catch (e) {}
        try {
            if (typeof _egInventory !== 'undefined' && Array.isArray(_egInventory)) {
                _egInventory.forEach((row) => {
                    if (!Array.isArray(row)) return;
                    row.forEach((it) => { if (it && typeof it === 'object' && !Array.isArray(it)) scan(it); });
                });
            }
        } catch (e) {}
        const missing = TQ_STARTER_BASE_IDS.filter((id) => !have.has(id));
        if (!missing.length) return;
        if (typeof EG_ALL_BASE_TYPES === 'undefined' || typeof _egvBuildBaseItemFromBase !== 'function') return;
        const stamp = Date.now();
        missing.forEach((baseId, k) => {
            const base = EG_ALL_BASE_TYPES.find((b) => b.id === baseId);
            if (!base) return;
            const item = _egvBuildBaseItemFromBase(base);
            item.id = `${base.id}_intermission_${stamp}_${k}`;
            item.noSellValue = true;
            try { if (typeof _egAddItemToStash === 'function') _egAddItemToStash(item); } catch (e) {}
        });
        try { if (typeof egSaveHubState === 'function') egSaveHubState(); } catch (e) {}
        try { console.info('[tutorial] intermission restock', missing); } catch (e) {}
    } catch (e) {}
}

export function _tqEnsureIntermissionDom() {
    if (document.getElementById('tq-intermission')) return;
    const el = document.createElement('div');
    el.id = 'tq-intermission';
    el.innerHTML = `
        <div class="tq-inter-box">
            <div class="tq-inter-title">${t('tq_inter_title')}</div>
            <div class="tq-inter-text">${t('tq_inter_text')}</div>
            <div class="tq-inter-check tq-inter-check-open" id="tq-inter-check-weapon"></div>
            <div class="tq-inter-check tq-inter-check-open" id="tq-inter-check-armor"></div>
            <div class="tq-inter-hint">${t('tq_inter_hint')}</div>
        </div>`;
    document.body.appendChild(el);
}


//------------------------------------------------------------------------
//---------------------------FIREBALL SPELL--------------------------------
//------------------------------------------------------------------------

// Registers Fireball as a real, persistable skill (spellbook + hotbar +
// keybind routing all read the shared skill registry).
// NOTE: the charm itself is no longer granted directly - the defeated bat
// drops a Fireball charm onto the grid and the claim grants it via the
// engine's charm pipeline.
// keybind routing all read the shared skill registry).
export function _tqEnsureFireball() {
    if (typeof SKILL_REGISTRY === 'undefined') return;
    if (SKILL_REGISTRY.fireball) return;
    SKILL_REGISTRY.fireball = {
        id: 'fireball',
        icon: '🔥',
        image: null,
        nameEn: 'Fireball',
        nameDE: 'Feuerball',
        descCursorEn: 'Hurl a fireball at your target',
        descCursorDE: 'Wirf einen Feuerball auf dein Ziel',
        cooldownSeconds: 6,
        manaCost: 16,
        levels: [{
            descEn: 'Hurls a searing fireball at the targeted creature, dealing fire damage.',
            descDE: 'Wirft einen glühenden Feuerball auf das anvisierte Monster und verursacht Feuerschaden.',
            effect: {},
        }],
        source: { kind: 'fireball', ownerId: null, slot: 'active1' },
        legacySlot: 'active6',
        slotKind: 'fireball',
        isPassive: false,
        movable: true,
        endgameOnly: false,
        tags: ['Spell', 'Fire', 'Projectile'],
        scaling: [],
        damage: null,
        // Hold-to-cast (see js/skills/spell-casttime.js): the button must be
        // held for 1.0s while the cast bar fills - then the fireball flies.
        castTime: '1.0s',
        castTimeSeconds: 1.0,
    };
}

// Casts Fireball at the current target: pays mana, starts the cooldown and
// animates a real fire projectile through the shared encounter pipeline.
export function _tqCastFireball() {
    if (typeof dead !== 'undefined' && globalThis.dead) return;
    // The spell stays locked until its scroll sits in a spell slot.
    if (typeof isSkillCharmUnlocked === 'function' && !isSkillCharmUnlocked('fireball')) {
        showToast('🔒 ' + t('charm_locked_toast'), '#ff6b9d');
        return;
    }
    const target = (typeof _egGetTarget === 'function') ? _egGetTarget() : null;
    if (!target) {
        showToast('🔥 ' + t('tq_fireball_no_target'));
        return;
    }
    if (typeof canAffordMana !== 'function' || !canAffordMana(16)) {
        showToast(t('cls_no_mana'));
        return;
    }
    // Cooldown gate (mirrors the class pipeline in class-abilities.js) -
    // without it the spell could be re-cast while the slot was cooling down.
    try {
        const cd = (typeof cooldownState !== 'undefined' && cooldownState)
            ? cooldownState.active6 : null;
        if (cd && cd.remaining > 0) {
            showToast('🔥 ' + t('tq_fireball_cooldown'));
            return;
        }
    } catch (e) {}
    spendMana(16);
    if (typeof startSlotCooldown === 'function') startSlotCooldown('active6', 6);
    _tqFireballUsed = true;
    // Launch from the avatar itself: the default fallback
    // (#class-hud-drag-handle) doesn't exist for classless characters, which
    // skipped the flight animation entirely and resolved the hit instantly.
    const _fbSource = document.getElementById('player-avatar-wrapper')
        || document.getElementById('player-avatar-simple')
        || undefined;
    // Fire the FIRE visual (USP_THEME_PROJ.fire - the molten-comet the
    // universal fire spells use), not the generic reveal projectile:
    // _egAnimatePlayerProjectile defaults to the class/reveal look, which
    // made a cast Fireball indistinguishable from a reveal shot.
    const _fbProj = (typeof USP_THEME_PROJ !== 'undefined' && USP_THEME_PROJ.fire) ? USP_THEME_PROJ.fire : null;
    try {
        _egAnimatePlayerProjectile(18, target.id, undefined, undefined, _fbSource, undefined, ['fire'], _fbProj ? { projDef: _fbProj } : undefined);
    } catch (e) {
        try { _egDamageTargetById(target.id, 18, ['fire']); } catch (e2) {}
    }
    showToast('🔥 ' + t('tq_fireball_cast'));
}


//------------------------------------------------------------------------
//---------------------------INTEGRATION WRAPS-----------------------------
//------------------------------------------------------------------------

(function _tqIntegrate() {
    // The wrapped functions live in scripts that load AFTER this file, so
    // every wrap is deferred to DOMContentLoaded - by then the full global
    // surface exists and gameplay has not started yet.
    function _integrate() {
    // 1. Register Fireball and make it show up in the spellbook + hotbar
    //    seeding for every character. Registration is lazy (the skill
    //    registry may load after this file) - ensured on first roster query.
    if (typeof getPlayerSkillIds === 'function' && !window._tqWrappedSkillIds) {
        window._tqWrappedSkillIds = true;
        const _orig = globalThis.getPlayerSkillIds;
        globalThis.getPlayerSkillIds = function () {
            _tqEnsureFireball();
            const ids = _orig();
            if (!ids.includes('fireball')) ids.push('fireball');
            return ids;
        };
    }
    if (typeof getPlayerSkillGroups === 'function' && !window._tqWrappedSkillGroups) {
        window._tqWrappedSkillGroups = true;
        const _orig = globalThis.getPlayerSkillGroups;
        globalThis.getPlayerSkillGroups = function () {
            const groups = _orig();
            // Put the tutorial Fireball section FIRST so the scroll lesson's
            // "unlocked" entry is visible without scrolling past the whole
            // universal arsenal.
            if (!groups.some(g => g.ids && g.ids.includes('fireball'))) {
                groups.unshift({ labelKey: 'tq_spellbook_group', ids: ['fireball'] });
            }
            return groups;
        };
    }

    // 2. Route hotbar/keybind casts of Fireball to the tutorial handler.
    if (typeof toggleActiveAbility === 'function' && !window._tqWrappedToggle) {
        window._tqWrappedToggle = true;
        const _orig = globalThis.toggleActiveAbility;
        globalThis.toggleActiveAbility = function (slot) {
            if (slot === 'active6') { _tqCastFireball(); return; }
            return _orig(slot);
        };
    }

    // 2b. Prevent the hotbar auto-seeder from placing Fireball on the bar -
    // the player must drag it there themselves (lesson 3). Only the explicit
    // setHotbarSlot drag counts.
    if (typeof ensureSkillHotbar === 'function' && !window._tqWrappedEnsureHotbar) {
        window._tqWrappedEnsureHotbar = true;
        const _orig = globalThis.ensureSkillHotbar;
        globalThis.ensureSkillHotbar = function () {
            const r = _orig();
            if (typeof STATE === 'undefined' || !globalThis.STATE || !Array.isArray(globalThis.STATE.skillHotbar)) return r;
            // A classless tutorial player must not see Heartbloom (endgame-
            // only) auto-seeded onto the bar - it renders locked and clutters
            // exactly the slot the Fireball lesson invites the drop into. It
            // comes back legitimately once a class is chosen.
            if (!globalThis.STATE.playerClass) {
                const hb = globalThis.STATE.skillHotbar.indexOf('heartbloom');
                if (hb !== -1) {
                    globalThis.STATE.skillHotbar[hb] = null;
                    if (typeof renderSkillHotbar === 'function') renderSkillHotbar();
                }
            }
            if (_tqFireballEquipped) return r;
            // The Fireball self-drag lesson only runs inside the tutorial:
            // outside it a classless campaign character may legitimately keep
            // Fireball on the bar (universal charm play), so never strip it
            // there - a reload would otherwise eat the saved loadout.
            try {
                if ((typeof _tqIsTutorialActive === 'function') && !_tqIsTutorialActive()) return r;
            } catch (e) { return r; }
            const idx = globalThis.STATE.skillHotbar.indexOf('fireball');
            if (idx !== -1) {
                globalThis.STATE.skillHotbar[idx] = null;
                if (typeof renderSkillHotbar === 'function') renderSkillHotbar();
            }
            return r;
        };
    }

    // 2c. Losing a tutorial level (mistakes / timer out / monster defeat) and
    //     hitting Retry must FULL-restart the tutorial from puzzle 1 - a plain
    //     replayLevel() would drop the player back into the current puzzle
    //     mid-phase with half-finished lesson state. Routed through the same
    //     wrap for every retry path (btn-lose-retry, mutation-observer
    //     fallback, monster-defeat overlay - all call replayLevel()).
    if (typeof replayLevel === 'function' && !window._tqWrappedReplayLevel) {
        window._tqWrappedReplayLevel = true;
        const _orig = globalThis.replayLevel;
        globalThis.replayLevel = function () {
            if (typeof cur !== 'undefined' && globalThis.cur && globalThis.cur.isTutorialQuest
                && typeof restartTutorialQuest === 'function') {
                restartTutorialQuest();
                return;
            }
            return _orig();
        };
    }

    // 3. Tutorial levels: stamp monster data and bypass the normal win flow.
    //    The startLevel wrap ALSO re-protects the monster stamp: the pipeline
    //    calls _egStopEncounter() during boot, which clears the stamped
    //    campaign fields (_egMapDef still points at this level object on a
    //    retry) - without this, a puzzle-2/3 restart loses the pre-stamped
    //    level-1 rat and falls into the generic campaign preparer, which
    //    derives the monster level from the level index. Tutorial levels sit
    //    at the END of ALL (world 15, gIdx ≈ 68) → level-68 monster pack.
    if (typeof startLevel === 'function' && !window._tqWrappedStartLevel) {
        window._tqWrappedStartLevel = true;
        const _orig = globalThis.startLevel;
        globalThis.startLevel = function (gi) {
            const lvl = (typeof ALL !== 'undefined') ? ALL[gi] : null;
            if (lvl && lvl.isTutorialQuest) {
                // The previous tutorial run's teardown wiped the monster
                // stamps off the level objects - refresh them all first.
                _tqRefreshMonsterStamps();
                _tqStampLevel(lvl);
                _tqPhase = lvl.tqPuzzle === 0 ? 'p1' : lvl.tqPuzzle === 1 ? 'p2' : 'p3';
                _tqSawMonster = false;
                // While this tutorial level boots, its teardown
                // (_egStopEncounter → _egClearCampaignLevelFields(_egMapDef))
                // must not wipe the just-applied stamp - on a same-level
                // re-entry _egMapDef STILL points at this level object. The
                // natural way back is the normal pipeline: an empty stamp
                // would fall into the generic campaign preparer and roll a
                // level-index-derived monster pack (see the level-68 bug).
                const _origClear = globalThis._egClearCampaignLevelFields;
                globalThis._egClearCampaignLevelFields = function (level) {
                    if (level && level.isTutorialQuest) return;   // protect the fresh stamp
                    return _origClear(level);
                };
                try {
                    return _orig(gi);
                } finally {
                    globalThis._egClearCampaignLevelFields = _origClear;
                }
            }
            return _orig(gi);
        };
    }
    if (typeof checkWin === 'function' && !window._tqWrappedCheckWin) {
        window._tqWrappedCheckWin = true;
        const _orig = globalThis.checkWin;
        globalThis.checkWin = function () {
            if (typeof cur !== 'undefined' && globalThis.cur && globalThis.cur.isTutorialQuest) {
                if (!isPuzzleSolved()) return;
                _tqOnPuzzleSolved();
                return;
            }
            return _orig();
        };
    }

    // 4. Campaign-monster suppression for puzzle 1 (no monsters there).
    if (typeof _egShouldPrepareCampaignEncounter === 'function' && !window._tqWrappedPrepEnc) {
        window._tqWrappedPrepEnc = true;
        const _orig = globalThis._egShouldPrepareCampaignEncounter;
        globalThis._egShouldPrepareCampaignEncounter = function () {
            if (typeof cur !== 'undefined' && globalThis.cur && globalThis.cur.isTutorialQuest && globalThis.cur.tqPuzzle === 0) return false;
            return _orig();
        };
    }

    // 4b. Tutorial grid control (puzzles 1 and 2):
    //   • Puzzle-2 heart gate: post-kill, only a left-click on the heart
    //     cell is accepted until the heart is claimed.
    //   • While the Professor walks the demos (_tqGridLocked), every grid
    //     click is swallowed unless it matches the active demo cell+button.
    //   • The undecidable pair refuses manual fills until the candle has
    //     resolved it - the 50/50 guess must go through the candle.
    if (typeof checkSpecialIntercepts === 'function' && !window._tqWrappedIntercepts) {
        window._tqWrappedIntercepts = true;
        const _orig = globalThis.checkSpecialIntercepts;
        globalThis.checkSpecialIntercepts = function (row, col) {
            if (typeof cur !== 'undefined' && globalThis.cur && globalThis.cur.isTutorialQuest) {
                // Puzzle-2 heart gate: the post-kill board is fully locked
                // and only a LEFT-click on the Professor's heart cell is
                // accepted. Right-click is disallowed here - on this full-
                // picture board it would destroy the heart. Everything else
                // is swallowed until the heart is claimed.
                if (_tqPhase === 'p2' && _tqP2HeartOpen) {
                    if (_tqP2HeartCell == null || `${row}-${col}` !== _tqP2HeartCell) {
                        _tqGridLockToast();
                        return true;
                    }
                    if (pval !== 1) { _tqGridLockToast(); return true; }
                    return false;  // genuine handler performs the heart claim
                }
                // Puzzle-3 drop gate: while the Professor's sword / charm is
                // on the grid, only a LEFT-click on its own cell is accepted.
                // A right-click would destroy the drop; everything else is
                // swallowed until it is claimed.
                if (_tqPhase === 'p3' && _tqP3DropOpen) {
                    if (_tqP3DropCell == null || `${row}-${col}` !== _tqP3DropCell) {
                        _tqGridLockToast();
                        return true;
                    }
                    if (pval !== 1) { _tqGridLockToast(); return true; }
                    return false;  // genuine handler performs the drop claim
                }
                // Guided-demo lock (puzzle 1).
                if (_tqGridLocked) {
                    const d = _tqActiveDemo;
                    const expected = d && d.row === row && d.col === col
                        && (d.button === 0 ? (pval === 1) : (pval === 2));
                    if (!expected) { _tqGridLockToast(); return true; }
                    return false;  // let the genuine handler perform the demo
                }
                // Puzzle-2 claim gate: during the loot lesson only gear
                // cells accept input, and only with a CORRECT FILL - the
                // empty solution cell under the item claims it (the
                // Professor literally locks the field to the loot). A ✕
                // mark would be a wrong fill on a solution cell.
                if (_tqP2GateOpen && typeof cur !== 'undefined' && globalThis.cur) {
                    const key = `${row}-${col}`;
                    const isDropCell = (typeof _egLootDrops !== 'undefined' && _egLootDrops.has(key))
                        || (typeof _egPickups !== 'undefined' && _egPickups.has(key));
                    if (!isDropCell || pval !== 1) { _tqGridLockToast(); return true; }
                    return false;  // genuine handler performs the fill claim
                }
                // Puzzle-2 half-fill lock: the limit was reached while the
                // rat still lives - the Professor pauses the board for the
                // gear lesson. Once the rat is down the lock must never
                // fire again (a death at exactly fill 12 would otherwise
                // soft-lock the claim and remaining-fill steps).
                if (_tqPhase === 'p2' && _tqP2FillsGate && !_tqP2RatDead
                    && _tqP2FillsCount >= TQ_P2_FILLS_LIMIT) {
                    _tqGridLockToast();
                    return true;
                }
                // Undecidable corner: no manual fills anywhere in the 2x2
                // corner before the candle - filling the anti-diagonal would
                // be a blind 50/50 mistake (its cells are empty in the
                // canonical solution but unprovable either way).
                if (!_tqCandleUsed && globalThis.cur.tqPuzzle === 0
                    && TQ_CORNER_CELLS.some(([r, c]) => r === row && c === col)
                    && pval === 1) {
                    _tqAmbiguityToast();
                    return true;
                }
            }
            return _orig(row, col);
        };
    }

    // 4e. Correct-fill tracking for puzzle 2: the count drives the
    // first-fill task (damage lesson) and freezes once the rat is dead.
    if (typeof _egOnCorrectCell === 'function' && !window._tqWrappedCorrectCell) {
        window._tqWrappedCorrectCell = true;
        const _orig = globalThis._egOnCorrectCell;
        globalThis._egOnCorrectCell = function (row, col) {
            const r = _orig(row, col);
            if (typeof cur !== 'undefined' && globalThis.cur && globalThis.cur.isTutorialQuest && globalThis.cur.tqPuzzle === 1) {
                _tqCountCorrectFill();
            }
            return r;
        };
    }

    // 4f. Starter-gear claim detection (puzzle 2 loot lesson): after the
    // engine claims a gear drop, check whether the last piece of the set
    // has left the board - if so, mark the claim task complete.
    if (typeof _egCheckLootClaim === 'function' && !window._tqWrappedGearClaim) {
        window._tqGearClaimCheck = () => {
            if (_tqPhase === 'p2' && _tqP2GearDropped && !_tqP2GearClaimed
                && (!_tqP2GearSettleAt || Date.now() >= _tqP2GearSettleAt)
                && _tqCountGearDrops() === 0) {
                _tqP2GearClaimed = true;
            }
        };
        const _orig = globalThis._egCheckLootClaim;
        globalThis._egCheckLootClaim = function (row, col) {
            const r = _orig(row, col);
            window._tqGearClaimCheck();
            return r;
        };
    }

    // 4g. Suppress the engine's random kill-drop during the tutorial combat
    // lessons (puzzle-2 gear lesson, puzzle-3 bat/ghost fights): the lessons
    // place their own drops, and a random drop could land on a
    // non-solution cell - a trap the claim gates would turn into a forced
    // mistake. Lesson drops are placed directly on the drop maps, so
    // blocking the spawner never touches them.
    // (Item / currency / essence / charm kill drops are suppressed
    // separately for the whole tutorial in 4h below.)
    if (typeof _egSpawnLootDrop === 'function' && !window._tqWrappedLootSpawn) {
        window._tqWrappedLootSpawn = true;
        const _orig = globalThis._egSpawnLootDrop;
        globalThis._egSpawnLootDrop = function (...args) {
            if (typeof cur !== 'undefined' && globalThis.cur && globalThis.cur.isTutorialQuest
                && ((globalThis.cur.tqPuzzle === 1 && _tqPhase === 'p2')
                    || (globalThis.cur.tqPuzzle === 2 && _tqPhase === 'p3'))) return;
            return _orig(...args);
        };
    }

    // 4h. Tutorial-wide drop hygiene: while any tutorial phase is active,
    // suppress the ambient pickup spawner and every non-gear kill drop
    // (regular items, currency, essences, charms). The tutorial grants
    // everything explicitly (candle, sword, bat's charm, the Professor's
    // own heart) - a stray random drop on a locked board would be
    // unclaimable (the claim gates only admit the lesson cell) and linger
    // until it expires. The dedicated _tqSpawnHeart calls
    // _egDropHeartPickup directly and is never routed through these
    // spawners, so the healing lesson is unaffected.
    if (typeof _egSpawnPickup === 'function' && !window._tqWrappedAmbientPickup) {
        window._tqWrappedAmbientPickup = true;
        const _orig = globalThis._egSpawnPickup;
        globalThis._egSpawnPickup = function (...args) {
            if (typeof _tqPhase !== 'undefined' && _tqPhase) return;
            return _orig(...args);
        };
    }
    [
        ['_egSpawnItemDrop', '_tqWrappedTutItemDrop'],
        ['_egTryDropCurrency', '_tqWrappedTutCurrencyDrop'],
        ['_egTryDropEssence', '_tqWrappedTutEssenceDrop'],
        ['_charmTryMonsterDrop', '_tqWrappedTutCharmDrop'],
    ].forEach(([fnName, flag]) => {
        if (typeof window[fnName] === 'function' && !window[flag]) {
            window[flag] = true;
            const _orig = window[fnName];
            window[fnName] = function (...args) {
                if (typeof _tqPhase !== 'undefined' && _tqPhase
                    && typeof cur !== 'undefined' && globalThis.cur && globalThis.cur.isTutorialQuest) return;
                return _orig(...args);
            };
        }
    });
    // 5. Candle-use detection for the puzzle-1 task. The tagged tutorial
    //    candle takes the targeted-reveal path; regular candles just set
    //    the flag (the pipeline already ran inside _orig).
    if (typeof useItem === 'function' && !window._tqWrappedUseItem) {
        window._tqWrappedUseItem = true;
        const _orig = globalThis.useItem;
        globalThis.useItem = function (uid) {
            const item = globalThis.STATE.inventory.find(i => i.uid === uid);
            if (item && item.defId === 'reveal1' && item.isTutorialCandle
                && typeof cur !== 'undefined' && globalThis.cur && globalThis.cur.isTutorialQuest) {
                // The candle may only be lit once the Professor's use-candle
                // step is showing (puzzle 1 s11) - lighting it straight after
                // receiving it (s10) would skip the explanation.
                if (!_tqCandleUsable && !_tqCandleUsed && _tqPhase === 'p1') {
                    try { showToast('🎓 ' + t('tq_candle_locked')); } catch (e) {}
                    return;
                }
                _tqOnCandleUse(uid);
                return;
            }
            const wasCandle = item && item.defId === 'reveal1';
            const r = _orig(uid);
            if (wasCandle && typeof cur !== 'undefined' && globalThis.cur && globalThis.cur.isTutorialQuest) {
                _tqCandleUsed = true;
            }
            return r;
        };
    }

    // 5b. Detect the Fireball drag onto the hotbar (lesson 3 task).
    if (typeof setHotbarSlot === 'function' && !window._tqWrappedSetHotbar) {
        window._tqWrappedSetHotbar = true;
        const _orig = globalThis.setHotbarSlot;
        globalThis.setHotbarSlot = function (slotIndex, skillId) {
            const r = _orig(slotIndex, skillId);
            if (skillId === 'fireball' && r) _tqFireballEquipped = true;
            return r;
        };
    }

    // 5c. Groan reply: when a REAL mistake lands during a tutorial lesson
    //      (guided mistake demo included), the character reacts to it.
    //      Wrapped here (not in applyRealMistake) so normal campaign levels
    //      keep their existing mistake banter behaviour untouched.
    if (typeof applyRealMistake === 'function' && !window._tqWrappedRealMistake) {
        window._tqWrappedRealMistake = true;
        const _orig = globalThis.applyRealMistake;
        globalThis.applyRealMistake = function (row, col) {
            const r = _orig(row, col);
            if (typeof cur !== 'undefined' && globalThis.cur && globalThis.cur.isTutorialQuest) {
                _tqPlayerReply(5000, 'tutorial_mistake');
            }
            return r;
        };
    }

    // 6. Track monster presence so kill tasks don't complete before spawns.
    if (!window._tqMonsterWatch) {
        window._tqMonsterWatch = setInterval(() => {
            try {
                if (_tqPhase && typeof _egMonsters !== 'undefined' && globalThis._egMonsters.length > 0) {
                    _tqSawMonster = true;
                }
            } catch (e) {}
        }, 500);
    }
    }

    // Phase 3 (step 10): `!== 'complete'` idiom (see MIGRATION.md step 7).
    // As a real module this file evaluates during the import phase, where
    // readyState is 'interactive' - the old `=== 'loading'` branch would
    // run _integrate() immediately instead of waiting for the full global
    // surface. Both pre-complete states now defer to DOMContentLoaded.
    if (document.readyState !== 'complete') {
        document.addEventListener('DOMContentLoaded', _integrate);
    } else {
        _integrate();
    }
})();


//------------------------------------------------------------------------
//---------------------------ENTRY POINT-----------------------------------
//------------------------------------------------------------------------

// Called from showTutorial() when the player has not completed the tutorial
// yet. Replaces the static image walkthrough with the playable chain.
export function startTutorialQuest() {
    _tqPhase = null;
    _tqStepIdx = 0;
    _tqCandleUsed = false;
    _tqCandleUsable = false;
    _tqFireballUsed = false;
    _tqFireballEquipped = false;
    _tqPuzzleSolvedFlag = false;
    _tqSawMonster = false;
    // Tutorial entry: play one random tutorial track (kept across all three
    // puzzles - _doStartLevel skips BGM for tutorial-quest levels). The
    // channel is unlocked first: a skipped intro beat holds the BGM lock
    // until its own teardown, which would otherwise swallow this request.
    if (typeof Audio_Manager !== 'undefined' && typeof Audio_Manager.playTutorialBGM === 'function') {
        try { if (typeof Audio_Manager.unlockBGM === 'function') Audio_Manager.unlockBGM(); } catch (e) {}
        Audio_Manager.playTutorialBGM();
    }
    // Freshness diagnostic: a truly fresh character is level 1 with nothing
    // equipped and no allocated attribute points (→ 140 HP / 100 mana /
    // 0 absorption / 10 damage per fill). Anything else means the test slot
    // carries state over from earlier runs (gear, levels, attributes) -
    // the tutorial balances around the fresh values (see _tqStampLevel).
    try {
        const _tqStats = (typeof _egComputePlayerStats === 'function') ? _egComputePlayerStats() : null;
        console.info('[tutorial] entry check', {
            level: (typeof _egGetPlayerLevel === 'function') ? _egGetPlayerLevel() : 'n/a',
            equipped: (typeof _egGetAllEquippedItems === 'function') ? _egGetAllEquippedItems().length : 'n/a',
            allocatedAttrs: (typeof _egGetAllocatedAttributes === 'function') ? _egGetAllocatedAttributes() : 'n/a',
            maxHP: (typeof playerMaxHP !== 'undefined') ? globalThis.playerMaxHP : 'n/a',
            maxMana: (typeof _getPlayerMaxMana === 'function') ? _getPlayerMaxMana() : 'n/a',
            absorption: _tqStats ? _tqStats.absorption : 'n/a',
            baseDamage: (typeof EG_PLAYER_STATS !== 'undefined') ? EG_PLAYER_STATS.baseDamage : 'n/a',
        });
    } catch (e) {}
    _tqEnsureLevels();
    _tqStartPuzzle(0);
}

// Full tutorial restart - used by the Retry button when the player loses a
// tutorial level. A plain replayLevel() would only re-run the current puzzle
// mid-phase; the tutorial must restart from puzzle 1 with all lesson flags
// cleared. Called via the retryFromOverlay wrap in the integration section.
export function restartTutorialQuest() {
    // Tear down the failed level like any manual retry does.
    try { hideResultOverlays(); } catch (e) {}
    try { if (typeof _egResetQuizDamageBuff === 'function') _egResetQuizDamageBuff(); } catch (e) {}
    try { if (typeof _hidePlayerAvatarSimple === 'function') _hidePlayerAvatarSimple(); } catch (e) {}
    try { if (typeof _hidePlayerAvatar === 'function') _hidePlayerAvatar(); } catch (e) {}
    // Gear claimed during a lost puzzle-2 lesson sits in the run loot bag
    // and would be wiped by the next level's encounter reset - bank it.
    if (typeof _egFlushRunLootToStash === 'function') { try { _egFlushRunLootToStash(); } catch (e) {} }
    startTutorialQuest();
}


//------------------------------------------------------------------------
//---------------------------KEYBIND: CHARACTER SHEET----------------------
//------------------------------------------------------------------------

// B (rebindable via the keybind setup) toggles the real endgame character
// sheet + inventory over a running puzzle - the same screen the hub uses, so
// everything stays synchronized. Overlay mode (see endgame-hub.js): B opens
// the sheet paused over the run, B again closes it back into the puzzle.
// Phase 3 (step 10): as a real module this file evaluates before
// keybinds.js in the import phase, so a top-level registration would be
// dropped (the old `typeof` guard silently skipped it). Defer to
// DOMContentLoaded - by then every module's bindings exist.
function _tqRegisterCharSheetKeybind() {
    onKeybindAction('char-sheet', () => {
        // Overlay close: the sheet is open over a running puzzle - B closes
        // it and the puzzle continues exactly where it was.
        try {
            if (document.getElementById('screen-endgame-hub')?.classList.contains('active')
                && typeof isHubGameOverlay === 'function' && isHubGameOverlay()
                && typeof closeHubToGame === 'function') {
                closeHubToGame();
                return false;
            }
        } catch (e) {}
        // Overlay open: only from the game screen (or during the tutorial
        // intermission). Any other screen (mode-select, Nexus, ...) keeps
        // the hub's normal full-screen behaviour untouched.
        const gameActive = document.getElementById('screen-game')?.classList.contains('active');
        const interActive = document.getElementById('tq-intermission')?.classList.contains('show');
        if (!gameActive && !interActive) return false;   // let other handlers pass
        try { if (typeof openHubFromGame === 'function') openHubFromGame(); } catch (e) {}
        return false;  // don't claim - harmless either way
    });
}
if (document.readyState !== 'complete') {
    document.addEventListener('DOMContentLoaded', _tqRegisterCharSheetKeybind);
} else {
    _tqRegisterCharSheetKeybind();
}
