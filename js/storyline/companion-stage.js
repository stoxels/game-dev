import { LANG } from '../translation/translations.js';
import { COMPANION_CAST, getCompanionPairing } from './companion-scenes.js';
import { _getPlayerCharacterImage } from '../sprite/player_sprite.js';
import { STATE } from '../state.js';
import { _setReplayGloballyUnlocked, markSeen } from './storyline-progress.js';

//------------------------------------------------------------------------
//-------------------COMPANION STAGE---------------------------------------
//------------------------------------------------------------------------
// Full-screen dialogue scene: the world's painted background, the player's
// hero on the left, the companion on the right, and one speech bubble at a
// time above whoever is talking. Click / Space / Enter moves on; Skip ends
// the scene early (it still counts as seen).
//
// A script item { beat: 'character_intro' } pauses the dialogue and plays the
// player's own intro as a private flashback (what the hero remembers while
// talking); the conversation then carries on.

//------------------------------------------------------------------------
// STATE
//------------------------------------------------------------------------

// Everything the running scene needs; null when no scene is open.
let _stage = null;

//------------------------------------------------------------------------
// LOW-LEVEL HELPERS
//------------------------------------------------------------------------

// Sprite file of a hero wearing the given class look (e.g. 'noclass').
function _spritePath(characterId, look) {
    const cap = characterId.charAt(0).toUpperCase() + characterId.slice(1);
    return `images/sprites/${cap}_${look}.webp`;
}

// The line text in the current language.
function _lineText(line) {
    return (LANG === 'de' && line.de) ? line.de : line.en;
}

//------------------------------------------------------------------------
// DOM
//------------------------------------------------------------------------

// Builds the overlay: background, two hero sprites, the bubble and the skip
// button. Returns the root element (not yet attached).
function _buildOverlay(pairing, playerId) {
    const root = document.createElement('div');
    root.className = 'cmp-stage';
    root.innerHTML = `
        <div class="cmp-bg" style="background-image:url('${pairing.bg}')"></div>
        <div class="cmp-vignette"></div>
        <img class="cmp-hero cmp-left" src="${_getPlayerCharacterImage()}" alt="" draggable="false">
        <img class="cmp-hero cmp-right" src="${_spritePath(pairing.companion, pairing.look)}" alt="" draggable="false">
        ${pairing.companion2 ? `<img class="cmp-hero cmp-mid" src="${_spritePath(pairing.companion2, pairing.look)}" alt="" draggable="false">` : ''}
        <div class="cmp-bubble"><div class="cmp-name"></div><div class="cmp-text"></div></div>
        <button class="cmp-skip" type="button">${LANG === 'de' ? 'Überspringen ▶' : 'Skip ▶'}</button>
        <div class="cmp-hint">${LANG === 'de' ? 'Klicken zum Fortfahren' : 'Click to continue'}</div>`;
    root.dataset.player = playerId;
    return root;
}

// Shows line `i`: the speaker's bubble sits above their sprite, the other
// heroes are dimmed. `who` is 'player' (left), 'companion' (far right) or
// 'companion2' (between them).
function _showLine(i) {
    const { root, pairing, playerId } = _stage;
    const line = pairing.lines[i];
    const speakerId = line.who === 'player' ? playerId
        : line.who === 'voice' ? 'verun'
            : line.who === 'companion2' ? pairing.companion2 : pairing.companion;
    const cast = COMPANION_CAST[speakerId];
    const side = { player: 'left', companion: 'right', companion2: 'mid', voice: 'voice' }[line.who];

    const bubble = root.querySelector('.cmp-bubble');
    bubble.classList.remove('cmp-bubble-left', 'cmp-bubble-right', 'cmp-bubble-mid', 'cmp-bubble-voice', 'show');
    bubble.classList.add('cmp-bubble-' + side);
    bubble.style.setProperty('--cmp-color', cast.color);
    root.querySelector('.cmp-name').textContent = cast.name;
    root.querySelector('.cmp-text').textContent = _lineText(line);
    // Re-add on the next frame so the pop-in animation replays each line.
    setTimeout(() => bubble.classList.add('show'), 20);

    ['left', 'right', 'mid'].forEach(pos => {
        const hero = root.querySelector('.cmp-' + pos);
        if (hero) hero.classList.toggle('cmp-dim', side !== 'voice' && pos !== side);
    });
}

//------------------------------------------------------------------------
// ENTRY POINTS
//------------------------------------------------------------------------

// Closes the scene, marks it seen and hands control back to the caller.
function _finish() {
    if (!_stage) return;
    const { root, sceneId, onComplete, onKey } = _stage;
    _stage = null;
    document.removeEventListener('keydown', onKey, true);
    markSeen('companion_scene', { sceneId });
    root.classList.add('cmp-out');
    setTimeout(() => root.remove(), 250);
    if (typeof onComplete === 'function') onComplete();
}

// Plays the player's own intro over the hidden stage, then goes on with the
// script. Keys are ignored meanwhile so the intro keeps them for itself.
function _playFlashback() {
    const { root, playerId } = _stage;
    _stage.flashback = true;
    root.style.display = 'none';
    globalThis.showBeat('character_intro', {
        character: playerId,
        force: true,
        onComplete: () => {
            _setReplayGloballyUnlocked('intro_' + playerId);
            if (!_stage) return;
            _stage.flashback = false;
            root.style.display = '';
            _advance();
        }
    });
}

// Moves to the next script item, or ends the scene after the last one.
function _advance() {
    if (!_stage || _stage.flashback) return;
    _stage.index += 1;
    if (_stage.index >= _stage.pairing.lines.length) { _finish(); return; }
    if (_stage.pairing.lines[_stage.index].beat) { _playFlashback(); return; }
    _showLine(_stage.index);
}

// Plays the companion scene `sceneId` for the current player's character.
// Does nothing (but still calls onComplete) when there is no script for them.
export function playCompanionScene(sceneId, onComplete) {
    const pairing = getCompanionPairing(sceneId);
    if (!pairing || _stage) { if (typeof onComplete === 'function') onComplete(); return; }

    const playerId = STATE.playerCharacter;
    const root = _buildOverlay(pairing, playerId);
    const onKey = (e) => {
        if (_stage && _stage.flashback) return;
        if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); e.stopPropagation(); _advance(); }
        else if (e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); _finish(); }
    };
    _stage = { root, pairing, playerId, sceneId, onComplete, onKey, index: 0 };

    root.addEventListener('click', _advance);
    root.querySelector('.cmp-skip').addEventListener('click', (e) => { e.stopPropagation(); _finish(); });
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(root);
    _showLine(0);
}

// Asks whether to watch earlier story scenes first. `count` is how many were
// missed. "Watch first" calls onYes, "Skip them" calls onNo.
export function askStoryCatchUp(count, onYes, onNo) {
    const de = LANG === 'de';
    const root = document.createElement('div');
    root.className = 'cmp-ask';
    root.innerHTML = `
        <div class="cmp-ask-box">
            <div class="cmp-ask-text">${de
        ? `Du hast ${count} frühere Story-Szene(n) nicht gesehen. Ohne sie ist diese vielleicht schwer zu verstehen. Zuerst ansehen?`
        : `You have not seen ${count} earlier story scene${count === 1 ? '' : 's'}. Without ${count === 1 ? 'it' : 'them'} this one may be hard to follow. Watch ${count === 1 ? 'it' : 'them'} first?`}</div>
            <div class="cmp-ask-buttons">
                <button type="button" class="cmp-ask-yes">${de ? 'Zuerst ansehen' : 'Watch first'}</button>
                <button type="button" class="cmp-ask-no">${de ? 'Überspringen' : 'Skip them'}</button>
            </div>
        </div>`;
    const close = (cb) => { root.remove(); if (typeof cb === 'function') cb(); };
    root.querySelector('.cmp-ask-yes').addEventListener('click', () => close(onYes));
    root.querySelector('.cmp-ask-no').addEventListener('click', () => close(onNo));
    document.body.appendChild(root);
}
