import { STATE } from '../state.js';
import { LANG } from '../translation/translations.js';
import { COMPANION_CAST, COMPANION_LOOKS } from './companion-scenes.js';
import { AFFINITY_COOP_POINTS, AFFINITY_LEVEL_POINTS, AFFINITY_MEETING_CAP, affinitySummary } from './companion-affinity.js';
import { COOP_ENCOUNTERS } from './coop-levels.js';
import { BOT_TINTS, botTuning } from '../companion-bot/companion-bot-profiles.js';

//------------------------------------------------------------------------
//-------------------AFFINITY SCREEN------------------------------------------
//------------------------------------------------------------------------
// A small window, opened from the world map, that shows how much the
// player's hero is bonded to each of the other two heroes: the level (1 to 5), the
// points, where they came from, what is missing for the next level, and what
// the friend does at the current and the next level (the numbers of the
// friend's helper in the puzzle, see companion-bot-profiles.js). Read-only.

//------------------------------------------------------------------------
// LOW-LEVEL HELPERS
//------------------------------------------------------------------------

// Text in the player's language.
const _tr = (en, de) => (LANG === 'de' ? de : en);

// The two heroes that are not the player.
function _friendsOf(playerId) {
    return ['stox', 'trix', 'syla'].filter(h => h !== playerId);
}

// Adds the window's stylesheet once.
function _ensureStyles() {
    if (document.getElementById('affinity-panel-style')) return;
    const st = document.createElement('style');
    st.id = 'affinity-panel-style';
    st.textContent = `
    /* the button is a stone slab like the six menu buttons (css/map-view-topbar.css); it only needs its spacing here */
    .affinity-panel-btn { flex: 0 0 auto; margin-left: clamp(8px, 1vw, 16px); }
    .affinity-panel-btn .tb-label { font-size: clamp(7px, 0.7vw, 10px); }
    #screen-map-view .affinity-panel-btn + .ls-topbar-right, #screen-world-detail .affinity-panel-btn + .ls-topbar-right { margin-left: clamp(8px, 1vw, 16px); }
    #affinity-panel { position: fixed; inset: 0; z-index: 9500; background: rgba(8,6,4,.78); display: flex; align-items: center; justify-content: center; }
    #affinity-panel .tp-box { position: relative; width: min(1500px, 108vw, calc(105vh * 1376 / 768)); aspect-ratio: 1376 / 768;
        background: url('images/Inference/ledger-parchment-bg.webp') center / 100% 100% no-repeat; filter: drop-shadow(0 14px 40px rgba(0,0,0,.7));
        color: #1f160a; font: clamp(14px, 1.25vw, 17px)/1.45 var(--PX, serif); }
    #affinity-panel .tp-title { position: absolute; left: 50%; top: -3.6%; transform: translateX(-50%); width: 34%; aspect-ratio: 668 / 190;
        background: url('images/Inference/detailed-title-banner.webp') center / 100% 100% no-repeat; display: flex; align-items: center; justify-content: center;
        font: 700 clamp(14px, 2.1vw, 22px) var(--PX, monospace); letter-spacing: 3px; color: #f6e3a8; text-shadow: 0 2px 3px #000, 0 0 10px rgba(224,177,67,.5); }
    #affinity-panel .tp-close { position: absolute; top: 4.4%; left: 85%; width: 9.6%; aspect-ratio: 1; padding: 0; border: none;
        background: url('images/Inference/close-button.webp') center / contain no-repeat; font-size: 0; cursor: pointer; transition: transform .15s; }
    #affinity-panel .tp-close:hover { transform: scale(1.08) rotate(-4deg); }
    #affinity-panel .tp-body { position: absolute; left: 13%; right: 17%; top: 14%; bottom: 11%; overflow-y: auto; padding-right: 6px; scrollbar-width: thin; scrollbar-color: #8a6a30 transparent; }
    #affinity-panel .tp-sub { margin: 0 0 12px; text-align: center; font-size: 1.02em; line-height: 1.5; color: #2c2112; }
    #affinity-panel .tp-row { display: flex; gap: 14px; padding: 12px 14px; margin-bottom: 10px; border-radius: 8px;
        background: rgba(90,70,40,.14); border: 1px solid rgba(90,70,40,.45); box-shadow: inset 0 1px 0 rgba(255,244,214,.35); }
    #affinity-panel .tp-portrait { position: relative; flex: none; width: 140px; height: 110px; align-self: flex-start;
        background: url('images/Inference/card-art-frame-stone.webp') center / 100% 100% no-repeat; }
    #affinity-panel .tp-face { position: absolute; left: 50%; bottom: 14%; height: 108%; width: auto; transform: translateX(-50%); filter: drop-shadow(0 3px 3px rgba(0,0,0,.6)); }
    #affinity-panel .tp-main { flex: 1; min-width: 0; }
    #affinity-panel .tp-head { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    #affinity-panel .tp-name { font: 700 22px var(--C, serif); letter-spacing: 2px; color: #2c2112; text-shadow: 0 1px 0 rgba(255,244,214,.5); }
    #affinity-panel .tp-name b { display: inline-block; width: 10px; height: 10px; margin-right: 8px; transform: rotate(45deg); background: var(--c); border: 1px solid #2c2112; }
    #affinity-panel .tp-pips { display: inline-flex; gap: 5px; }
    #affinity-panel .tp-pip { width: 13px; height: 13px; transform: rotate(45deg); border: 2px solid #5a4526; background: rgba(40,30,16,.35); box-sizing: border-box; }
    #affinity-panel .tp-pip.on { background: var(--c); border-color: #2c2112; box-shadow: 0 0 6px var(--c); }
    #affinity-panel .tp-level { margin-left: auto; font: 700 17px var(--C, serif); color: #3a2a0c; letter-spacing: 2px; }
    #affinity-panel .tp-bar { height: 15px; margin: 8px 0 3px; padding: 2px; background: #2b2217; border: 2px solid #5a4526; border-radius: 8px; box-shadow: inset 0 2px 4px rgba(0,0,0,.6); }
    #affinity-panel .tp-bar i { display: block; height: 100%; border-radius: 5px; background: linear-gradient(var(--c), color-mix(in srgb, var(--c) 55%, #000)); box-shadow: 0 0 8px var(--c); }
    #affinity-panel .tp-progress { font-family: var(--PX, serif); font-size: 1.05em; font-weight: 700; color: #2c2112; }
    #affinity-panel .tp-chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0 8px; }
    #affinity-panel .tp-chip { padding: 3px 11px; font-size: .95em; color: #1f160a; background: rgba(224,177,67,.22); border: 1px solid rgba(139,105,30,.55); border-radius: 10px; }
    #affinity-panel .tp-lv { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    #affinity-panel .tp-lv > div { padding: 8px 11px; font-size: 1em; line-height: 1.45; border-radius: 6px; background: rgba(255,246,222,.62); border: 1px solid rgba(90,70,40,.4); }
    #affinity-panel .tp-lv h4 { margin: 0 0 5px; font: 700 15px var(--C, serif); letter-spacing: 1.5px; text-transform: uppercase; color: #4a3612; }
    #affinity-panel .tp-lv .tp-next { background: rgba(236,196,96,.4); border-color: rgba(139,105,30,.7); }
    #affinity-panel .tp-lv .tp-next h4 { color: #6b3f00; }
    #affinity-panel .tp-lv .tp-solo { grid-column: 1 / -1; }
    @media (max-width: 760px) { #affinity-panel .tp-lv { grid-template-columns: 1fr; } }`;
    document.head.appendChild(st);
}

//------------------------------------------------------------------------
// WHAT A LEVEL MEANS
//------------------------------------------------------------------------

// Joins phrases with commas and a last "or" ("a, b or c").
function _joinOr(parts) {
    if (parts.length < 2) return parts.join('');
    return parts.slice(0, -1).join(', ') + _tr(' or ', ' oder ') + parts[parts.length - 1];
}

// A few plain sentences about what the friend does in a puzzle at a affinity
// level, built from the helper's own numbers so the screen never disagrees
// with the game.
function _levelText(friendId, level) {
    const t = botTuning(friendId, Math.max(1, level));
    const w = t.weights;
    const name = COMPANION_CAST[friendId].name;
    const secs = Math.round(t.actionMs / 1000);
    const share = Math.round(t.fillCapShare * 100);
    const hit = Math.round(t.monsterHitShare * 1000) / 10;
    const acts = [_tr('shows you a correct cell', 'zeigt dir ein richtiges Feld')];
    if (w.fill > 0) acts.push(_tr('fills one in for you', 'füllt eines für dich aus'));
    if (w.mark > 0) acts.push(_tr('crosses out an empty cell', 'streicht ein leeres Feld durch'));
    const parts = [_tr(`About every ${secs} seconds, ${name} ${_joinOr(acts)}.`,
        `Etwa alle ${secs} Sekunden ${_joinOr(acts)} ${name}.`)];
    if (w.fill > 0 || w.mark > 0) {
        parts.push(_tr(`Filled and crossed-out cells together cover at most ${share}% of the picture.`,
            `Ausgefüllte und durchgestrichene Felder zusammen machen höchstens ${share}% des Bildes aus.`));
    }
    parts.push(_tr(`Against monsters, each hit takes ${hit}% of their life.`, `Gegen Monster nimmt jeder Treffer ${hit}% ihres Lebens.`));
    return parts.join(' ');
}

//------------------------------------------------------------------------
// BUILDING THE WINDOW
//------------------------------------------------------------------------

// How many co-op encounters this hero plays with this friend (their possible clears).
function _coopTotal(playerId, friendId) {
    return Object.values(COOP_ENCOUNTERS).filter(d => d.friendFor[playerId] === friendId).length;
}

// One friend's card: portrait, name, level gems, points bar, where the points
// came from, and what the friend does now and at the next level.
function _rowHTML(playerId, friendId) {
    const s = affinitySummary(STATE.companionAffinity, playerId, friendId);
    const cast = COMPANION_CAST[friendId];
    const color = BOT_TINTS[friendId];
    const cap = friendId.charAt(0).toUpperCase() + friendId.slice(1);
    const look = COMPANION_LOOKS[friendId].base;
    const max = AFFINITY_LEVEL_POINTS.length;
    const pips = Array.from({ length: max }, (_, i) => `<span class="tp-pip ${i < s.level ? 'on' : ''}"></span>`).join('');
    const span = s.nextAt === null ? 1 : s.nextAt - s.fromLevel;
    const pct = s.nextAt === null ? 100 : Math.round((s.points - s.fromLevel) / span * 100);
    const progress = s.nextAt === null
        ? _tr('Highest level reached.', 'Höchste Stufe erreicht.')
        : _tr(`${s.points} affinity ${s.points === 1 ? 'point' : 'points'}. ${s.toNext} more to reach level ${s.level + 1}.`,
            `${s.points} Verbundenheitspunkt${s.points === 1 ? '' : 'e'}. Noch ${s.toNext} bis Stufe ${s.level + 1}.`);
    const coopTotal = _coopTotal(playerId, friendId);
    const chips = [
        _tr(`Story meetings: ${s.meetings} of ${AFFINITY_MEETING_CAP} points (1 each)`, `Story-Begegnungen: ${s.meetings} von ${AFFINITY_MEETING_CAP} Punkten (je 1)`),
        _tr(`Co-op encounters: ${s.coopClears} of ${coopTotal} cleared (${AFFINITY_COOP_POINTS} points each)`, `Gemeinsame Abenteuer: ${s.coopClears} von ${coopTotal} geschafft (je ${AFFINITY_COOP_POINTS} Punkte)`),
    ].map(c => `<span class="tp-chip">${c}</span>`).join('');
    const nowText = s.level === 0
        ? _tr(`${cast.name} does not help in puzzles yet. Watch a story meeting or clear a co-op encounter together to earn the first affinity.`,
            `${cast.name} hilft noch nicht bei Rätseln. Seht euch eine Story-Begegnung an oder schafft ein gemeinsames Abenteuer, um die erste Verbundenheit zu verdienen.`)
        : _levelText(friendId, s.level);
    const nextBox = s.level >= max ? ''
        : `<div class="tp-next"><h4>${_tr('At level', 'Auf Stufe')} ${s.level + 1}</h4>${_levelText(friendId, s.level + 1)}</div>`;
    const nowBox = `<div class="${nextBox ? '' : 'tp-solo'}"><h4>${_tr('Right now', 'Aktuell')}</h4>${nowText}</div>`;
    return `<div class="tp-row" style="--c:${color}">
        <div class="tp-portrait"><img class="tp-face" src="animations/${cap}/idle/${look}/down/${cap}_${look}_idle_down_1.webp" alt="" draggable="false"></div>
        <div class="tp-main">
            <div class="tp-head">
                <span class="tp-name"><b></b>${cast.name}</span><span class="tp-pips">${pips}</span>
                <span class="tp-level">${_tr('LEVEL', 'STUFE')} ${s.level} ${_tr('OF', 'VON')} ${max}</span>
            </div>
            <div class="tp-bar"><i style="width:${pct}%"></i></div>
            <div class="tp-progress">${progress}</div>
            <div class="tp-chips">${chips}</div>
            <div class="tp-lv">${nowBox}${nextBox}</div>
        </div>
    </div>`;
}

//------------------------------------------------------------------------
// ENTRY POINTS
//------------------------------------------------------------------------

// Closes the window.
export function closeAffinityPanel() {
    document.removeEventListener('keydown', _onEscape, true);
    const p = document.getElementById('affinity-panel');
    if (p) p.remove();
}

// Escape closes the window.
function _onEscape(e) {
    if (e.key === 'Escape') closeAffinityPanel();
}

// Opens the window for the current player's hero.
export function openAffinityPanel() {
    closeAffinityPanel();
    const playerId = STATE && STATE.playerCharacter;
    if (!playerId) return;
    _ensureStyles();
    const root = document.createElement('div');
    root.id = 'affinity-panel';
    root.innerHTML = `<div class="tp-box">
        <div class="tp-title">${_tr('AFFINITY', 'VERBUNDENHEIT')}</div>
        <button class="tp-close" type="button" aria-label="${_tr('Close', 'Schließen')}">${_tr('Close', 'Schließen')}</button>
        <div class="tp-body">
            <div class="tp-sub">${_tr(`This shows how much affinity ${COMPANION_CAST[playerId].name} has with the other two heroes. Affinity grows when you watch story meetings and clear co-op encounters together, and it never drops. The higher a friend's affinity with you, the more they help when they join you in a puzzle.`,
                `Hier siehst du, wie sehr ${COMPANION_CAST[playerId].name} mit den anderen beiden Helden verbunden ist. Die Verbundenheit wächst, wenn ihr Story-Begegnungen seht und gemeinsame Abenteuer schafft, und es sinkt nie. Je stärker die Verbundenheit mit einem Freund, desto mehr hilft er dir, wenn er dich bei einem Rätsel begleitet.`)}</div>
            ${_friendsOf(playerId).map(f => _rowHTML(playerId, f)).join('')}
        </div>
    </div>`;
    root.addEventListener('click', (e) => { if (e.target === root || e.target.classList.contains('tp-close')) closeAffinityPanel(); });
    document.addEventListener('keydown', _onEscape, true);
    document.body.appendChild(root);
}

// Puts the "Affinity" button on a map screen: one world (the default) or the
// overview of all worlds. Once per screen; later calls only refresh its label.
export function ensureAffinityButton(screenId = 'screen-world-detail') {
    const screen = document.getElementById(screenId);
    if (!screen) return;
    _ensureStyles();
    let btn = screen.querySelector('.affinity-panel-btn');
    if (!btn) {
        btn = document.createElement('button');
        btn.className = 'affinity-panel-btn tb-slab';
        btn.type = 'button';
        btn.setAttribute('data-tip-t', 'tip_tb_affinity');
        btn.addEventListener('click', openAffinityPanel);
        // lives in the top bar, right after the gold balance and before the six menu buttons
        const bar = screen.querySelector('.ls-topbar');
        const gold = bar && bar.querySelector('.tb-gold');
        if (gold) gold.after(btn);
        else (bar || screen).appendChild(btn);
    }
    btn.innerHTML = `<span class="tb-ico">🤝</span><span class="tb-label">${_tr('AFFINITY', 'VERBUNDENHEIT')}</span>`;
}
