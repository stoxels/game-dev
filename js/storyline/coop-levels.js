import { STATE, cur, save } from '../state.js';
import { LANG } from '../translation/translations.js';
import { ALL } from '../levels/levels.js';
import { Audio_Manager } from '../audio/audio.js';
import { stopTimer } from '../timer/timer.js';
import { _doStartLevel } from '../start-level.js';
import { goToLevelSelect } from '../screens/screens.js';
import { companionBotSay, dismissCompanionBot, summonCompanionBot } from '../companion-bot/companion-bot.js';
import { grantSummonCharm } from '../skills/summon-cast.js';
import { startCoopBoss, stopCoopBoss } from './coop-boss.js';
import { grantQuestItem, hasQuestItem, questIconHtml, questItemFor } from './quest-items.js';
import { COMPANION_CAST, hasMetCompanion } from './companion-scenes.js';
import { getAffinityPoints, recordCoopClear } from './companion-affinity.js';
import { buildAffinityGainCard } from './affinity-gain-card.js';

//------------------------------------------------------------------------
//-------------------CO-OP ENCOUNTERS--------------------------------------
//------------------------------------------------------------------------
// Special levels played together with a friend (see dev/docs/STORYLINE.md
// section 4f). A co-op node sits on the world map next to a story meeting and
// opens once that meeting has been watched. The level is a normal Stoxel
// puzzle with the friend's bot already helping for free (companion-bot/). The
// first clear with a friend gives affinity (2 points); replays are just for fun.
// Co-op levels never touch the campaign record (levels done, score, XP).

//------------------------------------------------------------------------
// DATA
//------------------------------------------------------------------------

// All co-op encounters. `friendFor` says which friend plays along for each
// player hero (every hero meets each friend equally often over the six
// encounters). `grid` is the picture to solve (1 = filled).
export const COOP_ENCOUNTERS = {
    coop_w4: {
        world: 4,
        anchor: 'w4_forest',
        kind: 'puzzle',
        friendFor: { stox: 'syla', trix: 'stox', syla: 'trix' },
        nameEn: 'Through the Vortex, Together',
        nameDE: 'Gemeinsam durch den Strudel',
        introEn: 'The paths here bend back on themselves. Two heads see more than one: {friend} will help with hints, fills and marks in their own colour.',
        introDE: 'Die Wege hier winden sich in sich selbst zurück. Zwei Köpfe sehen mehr als einer: {friend} hilft mit Hinweisen, Füllungen und Markierungen in der eigenen Farbe.',
        timer: 900,
        // A square spiral winding into the vortex (one single solution).
        grid: [
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
            [1, 0, 0, 0, 0, 0, 0, 0, 1, 0],
            [1, 0, 1, 1, 1, 1, 1, 0, 1, 0],
            [1, 0, 1, 0, 0, 0, 1, 0, 1, 0],
            [1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
            [1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
            [1, 0, 1, 0, 0, 1, 1, 0, 1, 0],
            [1, 0, 1, 0, 0, 0, 0, 0, 1, 0],
            [1, 0, 1, 1, 1, 1, 1, 1, 1, 0],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        ],
    },
    coop_w6: {
        world: 6,
        anchor: 'home_syla',
        kind: 'monsters',
        // The monsters are sized like the story level the Grove meeting follows (level 4).
        monsterRefLevel: 4,
        // The first clear hands over the Summon charm of this friend.
        unlocksSummon: true,
        friendFor: { stox: 'syla', trix: 'syla', syla: 'stox' },
        nameEn: 'The Grove Does Not Sing Alone',
        nameDE: 'Der Hain singt nicht allein',
        introEn: 'Something stirs between the trees, repeating the old song a little too well. Beasts are about. {friend} fights beside you, and helps with the puzzle too.',
        introDE: 'Zwischen den Bäumen regt sich etwas, das das alte Lied ein bisschen zu gut nachsingt. Bestien sind unterwegs. {friend} kämpft an deiner Seite und hilft auch beim Rätsel.',
        timer: 900,
        // An old tree of the Grove (one single solution).
        grid: [
            [0, 0, 0, 1, 1, 0, 0, 0, 0, 0],
            [0, 0, 1, 1, 1, 1, 0, 0, 0, 0],
            [0, 1, 1, 1, 1, 1, 1, 0, 0, 0],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
            [0, 1, 1, 1, 1, 1, 1, 0, 0, 0],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [0, 0, 1, 1, 1, 1, 1, 0, 0, 0],
            [0, 0, 0, 1, 1, 0, 0, 0, 0, 0],
            [0, 0, 0, 1, 1, 0, 0, 0, 0, 0],
            [0, 0, 1, 1, 1, 1, 0, 0, 0, 0],
        ],
    },
    coop_w9: {
        world: 9,
        anchor: 'w9_vortex',
        kind: 'boss',
        monsterRefLevel: 'last',
        friendFor: { stox: 'syla', trix: 'stox', syla: 'trix' },
        // One big beast. Its shield breaks only while both heroes stand on the two runes.
        boss: {
            monsterId: 'cyclone', bossNameEn: 'The Delta Whirl', bossNameDE: 'Der Delta-Wirbel',
            hpMult: 7, dmgMult: 1.0, rounds: 1, holdMs: 3000, spotWaitMs: 22000,
            firstMs: 12000, everyMs: 26000, openMs: 9000, convergenceShare: 0.2,
        },
        nameEn: 'The Whirl at the Delta',
        nameDE: 'Der Wirbel im Delta',
        introEn: 'A whirl of data guards the delta, and its shield will not break for one hero alone. When the two runes light up, {friend} walks to one: you step on the other, and hold. Beat the whirl, then finish the picture.',
        introDE: 'Ein Datenwirbel bewacht das Delta, und sein Schild bricht nicht für einen Helden allein. Wenn die zwei Runen aufleuchten, geht {friend} auf die eine: du stellst dich auf die andere und hältst. Besiege den Wirbel, dann vollende das Bild.',
        timer: 900,
        // A diamond over the delta (one single solution).
        grid: [
            [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
            [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
            [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
            [0, 1, 1, 1, 0, 0, 1, 1, 1, 0],
            [1, 1, 1, 0, 0, 0, 0, 1, 1, 1],
            [1, 1, 0, 0, 1, 1, 0, 0, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
            [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
            [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
        ],
    },
    coop_w13: {
        world: 13,
        anchor: 'w13_peak',
        kind: 'boss',
        monsterRefLevel: 'last',
        friendFor: { stox: 'trix', trix: 'syla', syla: 'stox' },
        // The finale: two rounds in a row, the heroes swap sides in the second.
        boss: {
            monsterId: 'starspawn', bossNameEn: 'The Plateau Sentinel', bossNameDE: 'Der Plateau-Sentinel',
            hpMult: 9, dmgMult: 1.15, rounds: 2, holdMs: 2500, spotWaitMs: 24000,
            firstMs: 12000, everyMs: 24000, openMs: 9000, convergenceShare: 0.25,
        },
        nameEn: 'The Sentinel on the Plateau',
        nameDE: 'Der Sentinel auf dem Plateau',
        introEn: 'The last climb. The Sentinel raises its shield twice over: stand on the runes together, then again on the other side. {friend} knows the way. Beat the Sentinel, then finish the picture.',
        introDE: 'Der letzte Aufstieg. Der Sentinel hebt seinen Schild doppelt: steht gemeinsam auf den Runen, dann noch einmal auf der anderen Seite. {friend} kennt den Weg. Besiege den Sentinel, dann vollende das Bild.',
        timer: 900,
        // A peak above the plateau (one single solution).
        grid: [
            [0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
            [0, 0, 0, 0, 1, 1, 1, 0, 0, 0],
            [0, 0, 0, 1, 1, 1, 1, 1, 0, 0],
            [0, 0, 1, 1, 1, 0, 1, 1, 1, 0],
            [0, 1, 1, 1, 0, 0, 0, 1, 1, 1],
            [1, 1, 1, 0, 0, 1, 1, 1, 1, 1],
            [1, 1, 0, 0, 1, 1, 1, 0, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 0, 1, 1, 1, 0, 1, 1, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        ],
    },
    coop_w11: {
        world: 11,
        anchor: 'w11_ghost',
        kind: 'mist',
        // The friend leans on wrong-marks: it calls out what is NOT filled.
        markFocus: 3,
        // Mist hangs over the screen (looks only).
        mist: true,
        // The first clear hands over the second Summon charm (this friend's).
        unlocksSummon: true,
        friendFor: { stox: 'trix', trix: 'stox', syla: 'trix' },
        nameEn: 'What the Mist Hides',
        nameDE: 'Was der Nebel verbirgt',
        introEn: 'In the Void it is easy to miss what is there, and just as easy to see what is not. {friend} points out the empty cells with wrong-marks in their own colour, so you can trust the blanks and fill the rest.',
        introDE: 'In der Leere übersieht man leicht, was da ist, und sieht ebenso leicht, was nicht da ist. {friend} zeigt dir mit Falsch-Markierungen in der eigenen Farbe die leeren Felder, damit du den Lücken trauen und den Rest füllen kannst.',
        timer: 900,
        // A ghost in the mist (one single solution).
        grid: [
            [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
            [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
            [1, 1, 0, 1, 1, 1, 1, 0, 1, 1],
            [1, 1, 0, 1, 1, 1, 1, 0, 1, 1],
            [1, 1, 1, 1, 0, 0, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 0, 1, 1, 0, 1, 1, 0, 1],
            [1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
        ],
    },
    coop_w8: {
        world: 8,
        anchor: 'w8_fieldbase',
        kind: 'rescue',
        friendFor: { stox: 'trix', trix: 'syla', syla: 'stox' },
        nameEn: 'Before the Lantern Goes Out',
        nameDE: 'Bevor die Laterne erlischt',
        introEn: 'The camp is abandoned, but the lantern still burns, and the last researcher\'s tent map is half torn. Finish it before the light fails. {friend} helps, and the clock is short.',
        introDE: 'Das Lager ist verlassen, doch die Laterne brennt noch, und die Zeltkarte des letzten Forschers ist halb zerrissen. Vervollständige sie, bevor das Licht schwindet. {friend} hilft, und die Zeit ist knapp.',
        // A short clock: 6 minutes (the normal budget of a 10x10 is about 10), which is only comfortable with the friend's help.
        timer: 360,
        // The torn tent map (one single solution).
        grid: [
            [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
            [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
            [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
            [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
            [1, 1, 1, 1, 0, 0, 1, 1, 1, 1],
            [1, 1, 1, 0, 0, 0, 0, 1, 1, 1],
            [1, 1, 0, 0, 1, 1, 0, 0, 1, 1],
            [1, 1, 0, 0, 1, 1, 0, 0, 1, 1],
            [1, 1, 0, 0, 1, 1, 0, 0, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        ],
    },
};

// Gi (index in ALL) of each co-op level once it has been created.
const _levelGi = {};

//------------------------------------------------------------------------
// LOOKUPS
//------------------------------------------------------------------------

// The friend who plays along with the current player's hero, or null.
export function coopFriend(coopId) {
    const def = COOP_ENCOUNTERS[coopId];
    return (def && def.friendFor[STATE && STATE.playerCharacter]) || null;
}

// The story node (meeting scene) this encounter follows on the map, or null.
export function coopAnchor(coopId) {
    const def = COOP_ENCOUNTERS[coopId];
    return def ? def.anchor : null;
}

// True once the player has cleared this encounter with its friend (affinity was earned).
export function coopCleared(coopId) {
    const friend = coopFriend(coopId);
    const rec = friend && STATE.companionAffinity && STATE.companionAffinity[`${STATE.playerCharacter}>${friend}`];
    return !!(rec && rec.coop && rec.coop[coopId]);
}

// True when the encounter is on the map: the player has a friend for it and
// has watched the story meeting it hangs off.
export function coopAvailable(coopId) {
    const def = COOP_ENCOUNTERS[coopId];
    return !!def && !!coopFriend(coopId) && hasMetCompanion(def.anchor);
}

// Name of the encounter in the player's language.
export function coopName(coopId) {
    const def = COOP_ENCOUNTERS[coopId];
    return LANG === 'de' ? def.nameDE : def.nameEn;
}

//------------------------------------------------------------------------
// LEVEL
//------------------------------------------------------------------------

// The level object of an encounter in ALL (created on first use, then reused).
function _levelFor(coopId) {
    if (_levelGi[coopId] != null) return ALL[_levelGi[coopId]];
    const def = COOP_ENCOUNTERS[coopId];
    const gi = ALL.length;
    const level = {
        world: def.world, li: 0, gIdx: gi, size: def.grid[0].length, grid: def.grid, timer: def.timer,
        hint: def.nameEn, hintDE: def.nameDE,
        reveal: 'The way opens when two walk it together.',
        revealDE: 'Der Weg öffnet sich, wenn zwei ihn gemeinsam gehen.',
        bonusType: 'nomiss', bonusParam: 0, bonusHint: 'Finish without mistakes', bonusHintDE: 'Beende das Level ohne Fehler',
        isCoop: true, coopId,
    };
    // A rescue runs on its own short clock instead of the usual grid-size budget.
    if (def.kind === 'rescue') level.coopFixedTimer = true;
    if (def.kind === 'monsters' || def.kind === 'boss') {
        const inWorld = ALL.filter(l => l.world === def.world && l.li > 0);
        const refLi = def.monsterRefLevel === 'last' ? Math.max(...inWorld.map(l => l.li)) : def.monsterRefLevel;
        const ref = inWorld.find(l => l.li === refLi);
        level.coopMonsters = true;
        level.monsterRefGi = ref ? ref.gIdx : null;
        if (def.boss) level.coopBoss = def.boss;
    }
    ALL.push(level);
    _levelGi[coopId] = gi;
    return ALL[gi];
}

// Called at the start of every level: clears any leftover mist, and on a
// co-op level (also on a retry) the friend is there from the first second and
// helps for free.
export function onCoopLevelStart() {
    _removeMist();
    stopCoopBoss();
    if (!cur || !cur.isCoop) return;
    const def = COOP_ENCOUNTERS[cur.coopId];
    const friend = coopFriend(cur.coopId);
    cur.coopPuzzleDone = false;
    cur.coopBossDown = false;
    dismissCompanionBot();
    if (friend) summonCompanionBot(friend, { markFocus: def.markFocus });
    if (def.mist) _addMist();
    if (def.boss && friend) startCoopBoss(def, friend, _onBossDown);
}

// A slow drifting mist laid over the level screen (looks only, never blocks clicks).
function _addMist() {
    const screen = document.getElementById('screen-game');
    if (!screen) return;
    if (!document.getElementById('coop-mist-style')) {
        const st = document.createElement('style');
        st.id = 'coop-mist-style';
        st.textContent = `@keyframes coopMistDrift { from { background-position: 0 0, 30% 0; } to { background-position: 400px 0, calc(30% - 300px) 0; } }
        #coop-mist { position: fixed; inset: 0; pointer-events: none; z-index: 40; opacity: .55;
            background: radial-gradient(ellipse at 20% 80%, rgba(190,200,230,.35), transparent 60%),
                        radial-gradient(ellipse at 80% 30%, rgba(170,185,225,.3), transparent 55%);
            background-size: 800px 400px, 900px 500px; animation: coopMistDrift 60s linear infinite; }`;
        document.head.appendChild(st);
    }
    const mist = document.createElement('div');
    mist.id = 'coop-mist';
    screen.appendChild(mist);
}

// Takes the mist away (a new level start, or leaving the result box).
function _removeMist() {
    const m = document.getElementById('coop-mist');
    if (m) m.remove();
}

//------------------------------------------------------------------------
// DIALOGS
//------------------------------------------------------------------------

// A framed box with a title plaque, a text and buttons, drawn over the game (same look as the story
// catch-up question). `extra` (optional) is an element shown between the text and the buttons.
function _showBox(title, text, buttons, extra) {
    const root = document.createElement('div');
    root.className = 'cmp-ask';
    root.innerHTML = `<div class="cmp-ask-box"><div class="cmp-ask-title"></div><div class="cmp-ask-text"></div><div class="cmp-ask-buttons"></div></div>`;
    root.querySelector('.cmp-ask-title').textContent = title;
    const textEl = root.querySelector('.cmp-ask-text');
    textEl.textContent = text;
    textEl.style.whiteSpace = 'pre-line';
    if (!text) textEl.remove();
    if (extra) root.querySelector('.cmp-ask-buttons').before(extra);
    const row = root.querySelector('.cmp-ask-buttons');
    for (const [label, cls, action] of buttons) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = cls;
        b.textContent = label;
        b.addEventListener('click', () => { root.remove(); action(); });
        row.appendChild(b);
    }
    document.body.appendChild(root);
}

// The result after the puzzle is solved: the affinity bar filling up (first clear
// only), the charm and quest item earned, then back to the map.
function _showResult(friend, firstClear, pointsBefore, pointsAfter, unlockedCharm, questItem) {
    const de = LANG === 'de';
    const friendName = COMPANION_CAST[friend].name;
    const affinity = firstClear ? ''
        : (de ? 'Schon geschafft: keine weitere Verbundenheit, nur zum Spaß.' : 'Done before: no more affinity, just for fun.');
    const charm = !unlockedCharm ? ''
        : (de ? `Neues Amulett: Beschwöre ${friendName}. Bindungssteine droppen bei Bestien.` : `New charm: Summon ${friendName}. Tether Stones drop from beasts.`);
    const title = de ? `Gemeinsam mit ${friendName} gelöst!` : `Solved together with ${friendName}!`;
    const text = [affinity, charm].filter(Boolean).join('\n');
    _showBox(title, text, [[de ? 'Zurück zur Karte' : 'Back to the map', 'cmp-ask-yes', () => { dismissCompanionBot(); _removeMist(); stopCoopBoss(); goToLevelSelect(); }]],
        _resultExtras(friend, firstClear, pointsBefore, pointsAfter, friendName, questItem));
}

// What the result box shows below its text: the affinity bar of a first clear
// and the quest item, or nothing.
function _resultExtras(friend, firstClear, pointsBefore, pointsAfter, friendName, questItem) {
    const parts = [];
    if (firstClear) parts.push(buildAffinityGainCard(friend, pointsBefore, pointsAfter));
    if (questItem) parts.push(_buildRewardCard(friendName, questItem));
    if (!parts.length) return null;
    const wrap = document.createElement('div');
    parts.forEach(p => wrap.appendChild(p));
    return wrap;
}

// The reward block of a first clear: "You found:", the item's picture and
// name (hover it for its story) and where to find it again.
function _buildRewardCard(friendName, item) {
    const de = LANG === 'de';
    const card = document.createElement('div');
    card.style.cssText = 'margin: 14px 0 18px; text-align: center;';
    card.innerHTML = `<div style="font-family:var(--C,serif); font-weight:700; letter-spacing:.14em; text-transform:uppercase; font-size:16px; color:#d6c99f; margin-bottom:10px;">${de ? 'Du hast gefunden' : 'You found'}</div>
        <div class="coop-reward-item" style="display:inline-block; padding:12px 26px; background:linear-gradient(180deg,#16301f,#0e1d14); border:2px solid #7fe0b0; border-radius:8px; cursor:help; box-shadow:0 0 18px rgba(127,224,176,.45);">
            <div style="font-size:54px; line-height:1.1;">${questIconHtml(item, 80)}</div>
            <div style="margin-top:8px; font-family:var(--C,serif); font-weight:700; font-size:21px; color:#9af0c4;">${de ? item.nameDE : item.nameEn}</div>
        </div>
        <div style="color:#cfc6ad; font-size:16px; line-height:1.4; margin-top:12px;">${de
        ? `Du findest ihn im Reiter QUEST deines Inventars. Sprich auf der Karte mit ${friendName} darüber.`
        : `You can find it in the QUEST tab of your inventory. Talk to ${friendName} on the map about it.`}</div>`;
    const tile = card.querySelector('.coop-reward-item');
    tile.addEventListener('mouseenter', (e) => globalThis._onQuestCellEnter(item.id, e));
    tile.addEventListener('mousemove', (e) => globalThis._onQuestCellMove(e));
    tile.addEventListener('mouseleave', () => globalThis._onQuestCellLeave());
    return card;
}

//------------------------------------------------------------------------
// ENTRY POINTS
//------------------------------------------------------------------------

// Opens the encounter: a short introduction, then the level with the friend.
export function startCoopEncounter(coopId) {
    const def = COOP_ENCOUNTERS[coopId];
    const friend = coopFriend(coopId);
    if (!def || !friend) return false;
    const de = LANG === 'de';
    const name = COMPANION_CAST[friend].name;
    const intro = (de ? def.introDE : def.introEn).replace('{friend}', name);
    // The first time, hint at the story item waiting here (it is explained afterwards, in the scene after the clear).
    const item = questItemFor(coopId);
    const hint = item && !hasQuestItem(STATE.questItems, item.id)
        ? (de ? '\n\nHier wartet ein Gegenstand für eure Geschichte (Reiter QUEST im Inventar).' : '\n\nA story item waits here (see the QUEST tab in your inventory).')
        : '';
    _showBox(coopName(coopId), `${intro}${hint.replace(/^\n\n/, '\n')}`, [
        [de ? 'Beginnen' : 'Begin', 'cmp-ask-yes', () => _doStartLevel(_levelFor(coopId).gIdx)],
        [de ? 'Abbrechen' : 'Cancel', 'cmp-ask-no', () => {}],
    ]);
    return true;
}

// The puzzle was solved: stops the level, gives the affinity on the first clear
// and shows the result. Never records anything in the campaign progress.
export function onCoopSolved() {
    // A boss encounter is won by both: the boss down AND the picture finished.
    if (COOP_ENCOUNTERS[cur.coopId].boss && !cur.coopBossDown) {
        if (!cur.coopPuzzleDone) {
            cur.coopPuzzleDone = true;
            globalThis.showCombatToast(LANG === 'de' ? 'Das Bild ist fertig. Jetzt besiegt den Gegner!' : 'The picture is done. Now beat the beast together!');
        }
        return;
    }
    _finishCoop();
}

// The boss fell: if the picture is already finished the encounter is won,
// otherwise the puzzle is all that is left.
function _onBossDown() {
    if (!cur || !cur.isCoop) return;
    cur.coopBossDown = true;
    if (cur.coopPuzzleDone) { _finishCoop(); return; }
    globalThis.showCombatToast(LANG === 'de' ? 'Der Gegner ist besiegt. Vollendet das Bild!' : 'The beast is down. Finish the picture!');
}

// Both goals reached: stops the level, gives the affinity (and the charm) on the
// first clear and shows the result.
function _finishCoop() {
    globalThis.dead = true;
    stopTimer();
    Audio_Manager.playSFX('win');
    companionBotSay('win');
    const friend = coopFriend(cur.coopId);
    const pointsBefore = getAffinityPoints(STATE.companionAffinity, STATE.playerCharacter, friend);
    const first = recordCoopClear(STATE.companionAffinity, cur.coopId, STATE.playerCharacter, friend);
    const unlocked = first && COOP_ENCOUNTERS[cur.coopId].unlocksSummon && grantSummonCharm(friend);
    const questItem = grantQuestItem(STATE.questItems, cur.coopId);
    save();
    const points = getAffinityPoints(STATE.companionAffinity, STATE.playerCharacter, friend);
    setTimeout(() => _showResult(friend, first, pointsBefore, points, unlocked, questItem), 2600);
}
