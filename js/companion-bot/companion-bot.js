import { STATE, cur } from '../state.js';
import { LANG } from '../translation/translations.js';
import { renderCell, updClues } from '../grid.js';
import { _applyCellEffect } from '../puzzle-mechanics/cell-fx.js';
import { _damageTargetById, _showStatusLabel } from '../combat/encounter-monster-damage.js';
import { getAffinityLevel } from '../storyline/companion-affinity.js';
import { COMPANION_CAST } from '../storyline/companion-scenes.js';
import {
    botSpriteCast, botSpriteGesture, botSpriteSay, botSpriteStrike, removeBotSprite, spawnBotSprite,
} from './companion-bot-sprite.js';
import { banterLine, findTip, tipText } from './companion-bot-banter.js';
import {
    BOT_TINTS, botTuning, chooseAction, fillCandidates, markCandidates, pickCell,
} from './companion-bot-profiles.js';

//------------------------------------------------------------------------
//-------------------COMPANION BOT-----------------------------------------
//------------------------------------------------------------------------
// A friend summoned onto the grid. While a level runs it now and then helps
// the player: it points at a correct cell (hint), fills a correct cell, or
// marks a cell that is certainly empty, each in the friend's own colour, and
// it hits the monsters in its own style (Stox melee, Trix spells, Syla's
// fills shoot reveal projectiles). It never does anything that hurts the
// player. How often it helps depends on the affinity between the two heroes
// (see companion-bot-profiles.js). Summon and dismiss are the entry points.

//------------------------------------------------------------------------
// STATE
//------------------------------------------------------------------------

// The running bot, or null: { heroId, tuning, timer, nextActionAt, nextHitAt,
// fills, marks, hints (Map 'r-c' -> expiry ms), levelRef, deadSince }.
let _bot = null;

const TICK_MS = 500;
const HINT_LIFETIME_MS = 8000;
const MAX_HINTS = 2;
// How long the level may stay "over" before the friend leaves on their own.
const LEAVE_AFTER_MS = 2500;
// Banter: least time between two lines, and the wait before the next tip or advice.
const SAY_GAP_MS = 7000;
// Least mark weight of a friend in a mark-focus encounter (hints weigh about 1).
const MARK_FOCUS_FLOOR = 0.5;
// Least share of the picture such a friend may mark (the normal cap at affinity 1 is 10%).
const MARK_FOCUS_CAP_SHARE = 0.2;
const IDLE_TALK_MIN_MS = 16000;
const IDLE_TALK_MAX_MS = 28000;

//------------------------------------------------------------------------
// LOW-LEVEL HELPERS
//------------------------------------------------------------------------

// The grid cell element of (row, col), or null.
function _cellEl(r, c) {
    return document.getElementById(`g-${r}-${c}`);
}

// Marks a cell as the friend's work (colour comes from the style sheet).
function _tagCell(r, c, heroId) {
    const el = _cellEl(r, c);
    if (el) el.dataset.companion = heroId;
}

// Adds the style sheet for the friend's colours and the hint glow, once.
function _ensureStyles() {
    if (document.getElementById('companion-bot-style')) return;
    const style = document.createElement('style');
    style.id = 'companion-bot-style';
    const rules = Object.entries(BOT_TINTS).map(([id, c]) => `
    .gc.revealed[data-companion="${id}"] { background: ${c}; border-color: #fff; }
    .gc.marked[data-companion="${id}"]::after { color: ${c}; opacity: 1; text-shadow: 0 0 6px ${c}; }
    .gc[data-companion-hint="${id}"]:not(.filled) { animation: companionHint 1.1s ease-in-out infinite; --cb-c: ${c}; }
    #companion-bot-badge[data-hero="${id}"] { border-color: ${c}; color: ${c}; }
    .companion-bubble[data-hero="${id}"] { border-color: ${c}; }
    .companion-bubble[data-hero="${id}"]::after { border-top-color: ${c}; }`).join('');
    style.textContent = `${rules}
    @keyframes companionHint {
        0%, 100% { box-shadow: inset 0 0 0 2px var(--cb-c), 0 0 4px var(--cb-c); }
        50% { box-shadow: inset 0 0 0 3px var(--cb-c), 0 0 14px 3px var(--cb-c); }
    }
    #companion-bot-badge {
        position: fixed; left: 12px; top: 66px; z-index: 9000; padding: 6px 14px;
        background: rgba(10, 14, 24, 0.88); border: 2px solid; border-radius: 6px;
        font: 700 16px var(--C, serif); letter-spacing: 0.06em; pointer-events: none;
    }
    /* inside the top-left HUD stack it sits under the clock, mistakes, clue buttons and objectives */
    #companion-bot-badge.in-hud { position: static; align-self: flex-start; margin-top: 6px; }`;
    document.head.appendChild(style);
}

// Shows (or refreshes) the small badge with the friend's name and affinity level.
function _renderBadge() {
    let badge = document.getElementById('companion-bot-badge');
    if (!_bot) { if (badge) badge.remove(); return; }
    if (!badge) {
        badge = document.createElement('div');
        badge.id = 'companion-bot-badge';
        document.body.appendChild(badge);
    }
    // Park the badge in the HUD stack (top left) so it never overlaps the mistakes / clue buttons.
    const host = document.getElementById('game-hud-corner');
    badge.classList.toggle('in-hud', !!host);
    if (host && badge.parentElement !== host) host.appendChild(badge);
    badge.dataset.hero = _bot.heroId;
    badge.textContent = `${COMPANION_CAST[_bot.heroId].name} · ${LANG === 'de' ? 'Verbundenheit' : 'Affinity'} ${_bot.tuning.level}`;
}

// Takes every hint glow off the grid.
function _clearHints() {
    if (!_bot) return;
    for (const key of _bot.hints.keys()) {
        const el = document.getElementById('g-' + key);
        if (el) delete el.dataset.companionHint;
    }
    _bot.hints.clear();
}

//------------------------------------------------------------------------
// BANTER
//------------------------------------------------------------------------

// The friend says a line for `event` in a speech bubble, unless they spoke
// less than `gapMs` ago. Returns true when something was said.
function _say(event, gapMs = SAY_GAP_MS) {
    const bot = _bot;
    if (!bot) return false;
    const now = Date.now();
    if (now - bot.lastSayAt < gapMs) return false;
    const text = banterLine(bot.heroId, event, LANG === 'de', Math.random);
    if (!text) return false;
    bot.lastSayAt = now;
    botSpriteSay(text, COMPANION_CAST[bot.heroId].name);
    return true;
}

// The friend points out something useful about the puzzle as it stands (a
// line that is fully determined, certain cells, an empty line). Falls back
// to general advice when the clues have nothing more to give.
function _sayTip() {
    const bot = _bot;
    const { sol, user, revealed } = _gridView();
    const tip = findTip(sol, user, revealed, Math.random);
    if (!tip) { _say('idle', 0); return; }
    bot.lastSayAt = Date.now();
    botSpriteSay(tipText(bot.heroId, tip, LANG === 'de'), COMPANION_CAST[bot.heroId].name, 7000);
}

// Lets the friend react to the player's mistakes and, now and then, speak up
// with a tip or a piece of advice.
function _banterTick(now) {
    const bot = _bot;
    const mistakes = Number(globalThis.mistakeCount) || 0;
    if (mistakes > bot.lastMistakes) {
        bot.lastMistakes = mistakes;
        if (Math.random() < 0.8) _say('mistake', 3000);
    }
    if (now >= bot.nextIdleAt) {
        bot.nextIdleAt = now + IDLE_TALK_MIN_MS + Math.random() * (IDLE_TALK_MAX_MS - IDLE_TALK_MIN_MS);
        if (now - bot.lastSayAt < SAY_GAP_MS) return;
        if (Math.random() < 0.65) _sayTip();
        else _say('idle', 0);
    }
}

//------------------------------------------------------------------------
// PUZZLE HELP
//------------------------------------------------------------------------

// Builds the current picture of the grid for the cell-choice rules.
function _gridView() {
    return { sol: cur.grid, user: globalThis.userGrid, revealed: globalThis.revealedGrid, wrong: globalThis.wrongGrid };
}

// Drops hints that ran out of time or whose cell the player has since filled.
function _expireHints(now) {
    const { user, revealed } = _gridView();
    for (const [key, until] of [..._bot.hints]) {
        const [r, c] = key.split('-').map(Number);
        if (now >= until || user[r][c] === 1 || revealed[r][c]) {
            const el = document.getElementById('g-' + key);
            if (el) delete el.dataset.companionHint;
            _bot.hints.delete(key);
        }
    }
}

// Lets a glow appear on a correct cell the player has not filled yet.
function _doHint(cell) {
    const [r, c] = cell;
    const el = _cellEl(r, c);
    if (!el) return;
    el.dataset.companionHint = _bot.heroId;
    _bot.hints.set(`${r}-${c}`, Date.now() + HINT_LIFETIME_MS);
}

// Fills a correct cell for the player like a reveal: permanent, counted for
// the win, and it shoots a reveal projectile at the current monster.
function _doFill(cell) {
    const [r, c] = cell;
    globalThis.revealedGrid[r][c] = true;
    globalThis.userGrid[r][c] = 1;
    renderCell(r, c);
    updClues(r, c);
    _tagCell(r, c, _bot.heroId);
    // A friend's fill is only a fill: no reveal projectile at the monsters.
    _applyCellEffect([`g-${r}-${c}`], 'reveal', 'companion', { skip: true });
    _bot.fills++;
    globalThis.checkWin();
}

// Marks a cell that is certainly empty with a cross in the friend's colour.
function _doMark(cell) {
    const [r, c] = cell;
    globalThis.userGrid[r][c] = 2;
    globalThis.systemMarkedGrid[r][c] = true;
    renderCell(r, c);
    _tagCell(r, c, _bot.heroId);
    _applyCellEffect([`g-${r}-${c}`], 'mark');
    _bot.marks++;
}

// One puzzle action: picks hint / fill / mark by affinity and personality and
// does it. Does nothing when there is nothing useful left.
function _puzzleAction() {
    const { sol, user, revealed, wrong } = _gridView();
    const cap = Math.max(1, Math.floor(sol.flat().filter(v => v === 1).length * _bot.tuning.fillCapShare));
    const fills = fillCandidates(sol, user, revealed);
    const hintable = fills.filter(([r, c]) => !_bot.hints.has(`${r}-${c}`));
    const marks = markCandidates(sol, user, wrong);
    const available = {
        hint: _bot.hints.size < MAX_HINTS && hintable.length > 0,
        fill: _bot.fills < cap && fills.length > 1,   // never the very last cell: the win stays the player's
        mark: _bot.marks < cap && marks.length > 0,
    };
    const action = chooseAction(_bot.tuning, available, Math.random);
    if (!action) return;
    const pool = action === 'mark' ? marks : action === 'hint' ? hintable : fills;
    const cell = pickCell(_bot.heroId, pool, sol, user, revealed, Math.random);
    if (!cell) return;
    botSpriteGesture();
    if (action === 'hint') _doHint(cell);
    else if (action === 'fill') _doFill(cell);
    else _doMark(cell);
    if (Math.random() < 0.3) _say(action);
}

//------------------------------------------------------------------------
// MONSTER HELP
//------------------------------------------------------------------------

// The monster to hit: the one the player targets, else the first alive.
function _monsterTarget() {
    const list = globalThis._monsters || [];
    return list.find(m => m.id === globalThis._targetId && m.currentHP > 0) || list.find(m => m.currentHP > 0) || null;
}

// Applies the friend's hit to a monster when it lands: a melee strike or a
// lightning spell, as `style` says. Does nothing if the monster is already gone.
function _landHit(bot, targetId, amount, style) {
    if (_bot !== bot || !(globalThis._monsters || []).some(m => m.id === targetId && m.currentHP > 0)) return;
    _showStatusLabel(targetId, `${COMPANION_CAST[bot.heroId].name} -${amount}`);
    if (Math.random() < 0.35) _say('strike');
    if (style === 'melee') _damageTargetById(targetId, amount, {}, { isMelee: true, isCompanion: true });
    else _damageTargetById(targetId, amount, { lightning: amount }, { isPlayerSpell: true, isCompanion: true });
}

// One hit on a monster in the friend's style (Syla picks melee or a spell each
// time). The friend is seen running to the monster or throwing a spell; the
// damage lands at the moment of impact. Damage is a share of the monster's max life.
async function _monsterAction() {
    const bot = _bot;
    const fightStyle = bot.tuning.monsterStyle;
    const style = fightStyle === 'mixed' ? (Math.random() < 0.5 ? 'melee' : 'spell') : fightStyle;
    const target = _monsterTarget();
    // A shielded monster (a co-op boss before its shield breaks) cannot be hurt: the friend waits.
    if (!style || !target || bot.busy || target.bossImmune) return;
    const amount = Math.max(1, Math.round(target.maxHP * bot.tuning.monsterHitShare));
    bot.busy = true;
    try {
        const play = style === 'melee' ? botSpriteStrike : botSpriteCast;
        await play(target.id, () => _landHit(bot, target.id, amount, style));
    } finally {
        bot.busy = false;
    }
}

//------------------------------------------------------------------------
// LOOP
//------------------------------------------------------------------------

// True while a level is on screen and still running.
function _levelRunning() {
    return !!cur && !globalThis.dead && !!globalThis.userGrid;
}

// Every half second: lets the friend leave when the level is over, drops old
// hints, and does the next puzzle action / monster hit when it is due.
function _tick() {
    if (!_bot) return;
    const now = Date.now();
    // The character sheet opened over the running puzzle (B): the friend waits
    // out of sight and carries on when it closes, instead of leaving.
    const sprite = document.getElementById('companion-bot-sprite');
    const sheetOpen = typeof globalThis.isHubGameOverlay === 'function' && globalThis.isHubGameOverlay();
    if (sprite) sprite.style.visibility = sheetOpen ? 'hidden' : '';
    if (sheetOpen) {
        _bot.nextActionAt += TICK_MS;
        _bot.nextHitAt += TICK_MS;
        return;
    }
    // The friend leaves with the player: off the level screen, or the level is over.
    const onLevelScreen = !!document.getElementById('screen-game')?.classList.contains('active');
    if (!cur || !onLevelScreen) { dismissCompanionBot(); return; }
    if (globalThis.dead) {
        _bot.deadSince = _bot.deadSince || now;
        // A co-op friend stays for the result screen (it says its closing line).
        if (now - _bot.deadSince > LEAVE_AFTER_MS && !cur.isChainedPuzzle && !cur.isCoop) dismissCompanionBot();
        return;
    }
    _bot.deadSince = 0;
    if (!_levelRunning()) return;
    _expireHints(now);
    _banterTick(now);
    if (now >= _bot.nextActionAt) {
        _bot.nextActionAt = now + _bot.tuning.actionMs;
        _puzzleAction();
    }
    if (_bot.tuning.monsterStyle && !_bot.busy && now >= _bot.nextHitAt) {
        _bot.nextHitAt = now + _bot.tuning.monsterMs;
        _monsterAction();
    }
}

//------------------------------------------------------------------------
// ENTRY POINTS
//------------------------------------------------------------------------

// Calls the friend onto the running level. The player cannot call themselves,
// only one friend at a time, and only while a level is running. Affinity with
// that friend sets how strong they are. Returns true when the friend came.
// `opts.markFocus` (a multiplier) makes them favour wrong-marks.
export function summonCompanionBot(friendId, opts = {}) {
    if (_bot || !_levelRunning() || !BOT_TINTS[friendId] || friendId === STATE.playerCharacter) return false;
    const affinity = getAffinityLevel(STATE.companionAffinity || {}, STATE.playerCharacter, friendId);
    const tuning = botTuning(friendId, affinity);
    // `markFocus` makes the friend lean on wrong-marks (special encounters),
    // even at low affinity where they would not mark at all.
    if (opts.markFocus) {
        tuning.weights = { ...tuning.weights, mark: Math.max(tuning.weights.mark * opts.markFocus, MARK_FOCUS_FLOOR) };
        // Marks share the fill cap, which is tiny at low affinity: give a mark-focus friend room to mark.
        tuning.fillCapShare = Math.max(tuning.fillCapShare, MARK_FOCUS_CAP_SHARE);
    }
    _ensureStyles();
    const now = Date.now();
    _bot = {
        heroId: friendId, tuning, fills: 0, marks: 0, hints: new Map(), deadSince: 0, busy: false,
        lastSayAt: 0, lastMistakes: Number(globalThis.mistakeCount) || 0, nextIdleAt: now + 11000,
        nextActionAt: now + 2000, nextHitAt: now + 3000, timer: setInterval(_tick, TICK_MS),
    };
    _renderBadge();
    spawnBotSprite(friendId, STATE);
    const bot = _bot;
    setTimeout(() => { if (_bot === bot) _say('arrive', 0); }, 1800);
    return true;
}

// Keeps the friend from striking or casting while they stand at a standing
// spot (true), or lets them fight again (false). No effect without a friend.
export function holdCompanionBot(on) {
    if (_bot) _bot.busy = !!on;
}

// The friend says a line for an event from outside (the co-op win), right away.
export function companionBotSay(event) {
    return _say(event, 0);
}

// Sends the friend away: stops the loop, removes the hint glows and the badge.
// Fills and marks they already placed stay.
export function dismissCompanionBot() {
    if (!_bot) return;
    clearInterval(_bot.timer);
    _clearHints();
    removeBotSprite();
    _bot = null;
    _renderBadge();
}

// The hero id of the friend who is here now, or null.
export function activeCompanionBot() {
    return _bot ? _bot.heroId : null;
}
