import { LANG } from '../translation/translations.js';
import { COMPANION_CAST, getCompanionPairing, resolveCompanionLayout } from './companion-scenes.js';
import { STATE, save } from '../state.js';
import { _setReplayGloballyUnlocked, markSeen, markStoryReplayUnlocked } from './storyline-progress.js';
import { recordMeetingWatched } from './companion-affinity.js';
import { grantSceneQuestItem } from './quest-items.js';

//------------------------------------------------------------------------
//-------------------COMPANION STAGE---------------------------------------
//------------------------------------------------------------------------
// Full-screen dialogue scene: the world's painted background, the player's
// hero on the left, the companion on the right, and one speech bubble at a
// time above whoever is talking. Click / Space / Enter moves on; Skip ends
// the scene early (it still counts as seen, but earns no affinity).
//
// A script item { beat: 'character_intro' } pauses the dialogue and plays the
// player's own intro as a private flashback (what the hero remembers while
// talking); the conversation then carries on. A script item
// { beat: 'background', bg } fades the backdrop to another picture.

//------------------------------------------------------------------------
// STATE
//------------------------------------------------------------------------

// Everything the running scene needs; null when no scene is open.
let _stage = null;

//------------------------------------------------------------------------
// LOW-LEVEL HELPERS
//------------------------------------------------------------------------

// Picture of a hero wearing the given class look (e.g. 'noclass'): the
// standing frame from the animations folder, facing `pose` ('down' unless the
// story editor picked 'up', 'left' or 'right' for this spot).
function _spritePath(characterId, look, pose = 'down') {
    const cap = characterId.charAt(0).toUpperCase() + characterId.slice(1);
    return `animations/${cap}/idle/${look}/${pose}/${cap}_${look}_idle_${pose}_1.webp`;
}

// The same picture for the player's own hero, in the class they currently wear
// (ascendency first, like the menu portrait).
function _playerSpritePath(playerId, pose = 'down') {
    const look = STATE.playerAscendency || STATE.playerClass || 'noclass';
    return _spritePath(playerId, look, pose);
}

// Picture of the player's hero on the left. In a replay the hero wears the look the scene was
// written for, since the save may be another hero's or at another stage.
function _playerSpot(pairing, playerId, replay, pose = 'down') {
    if (replay) return _spritePath(playerId, pairing.looks[playerId], pose);
    return pairing.stage === 'none' ? _spritePath(playerId, 'noclass', pose) : _playerSpritePath(playerId, pose);
}

// Picture of whoever stands on `spot` ('left' = the player, 'right' = the
// companion, 'mid' = the second companion), facing `pose`.
function _spotSpritePath(spot, pose) {
    const { pairing, playerId, replay } = _stage;
    if (spot === 'left') return _playerSpot(pairing, playerId, replay, pose);
    const heroId = spot === 'right' ? pairing.companion : pairing.companion2;
    return _spritePath(heroId, pairing.looks[heroId], pose);
}

// The line text in the current language.
function _lineText(line) {
    return (LANG === 'de' && line.de) ? line.de : line.en;
}

// Normal height of a sprite as a share of the screen; a layout's `s` scales it.
const SPRITE_HEIGHT = { left: 54, right: 54, mid: 54, pet: 22, item: 24 };
// Sprites that face the other way (drawn mirrored).
const MIRRORED = { left: false, right: true, mid: true, pet: false, item: false };

// CSS value for a backdrop: the story image, with the scene's default image
// underneath so a picture that is not made yet never leaves the stage empty.
function _bgCss(path, fallback) {
    return `url('${path}')` + (fallback && fallback !== path ? `,url('${fallback}')` : '');
}

//------------------------------------------------------------------------
// LAYOUT (custom positions from the story editor)
//------------------------------------------------------------------------

// Puts one sprite where the layout says: (x, y) is the middle of its feet in percent of
// the screen, `s` scales its height, `r` rotates it around its feet. `spot` is
// 'left' | 'right' | 'mid' | 'pet'. Without a layout entry the stylesheet's own place is used.
// Heroes drawn looking left or right are shown as drawn; only front/back views get mirrored.
function _placeSprite(img, spot, v) {
    const props = ['left', 'right', 'top', 'bottom', 'height', 'transform', 'transformOrigin'];
    if (!v) { props.forEach(p => { img.style[p] = ''; }); return; }
    img.style.left = v.x + '%';
    img.style.right = 'auto';
    img.style.top = v.y + '%';
    img.style.bottom = 'auto';
    img.style.height = (SPRITE_HEIGHT[spot] * v.s) + '%';
    img.style.transformOrigin = '50% 100%';
    img.style.transform = `translate(-50%, -100%) rotate(${v.r}deg)` + (MIRRORED[spot] && (!v.pose || v.pose === 'down' || v.pose === 'up') ? ' scaleX(-1)' : '');
}

// Moves a speech bubble's top-middle to (x, y) percent; without an entry the stylesheet decides.
function _placeBubble(bubble, v) {
    ['left', 'right', 'top', 'marginLeft'].forEach(p => { bubble.style[p] = ''; });
    if (!v) return;
    bubble.style.left = `calc(${v.x}% - var(--cmp-bw) / 2)`;
    bubble.style.right = 'auto';
    bubble.style.top = v.y + '%';
    bubble.style.marginLeft = '0';
}

// Applies the layout for the picture that is on screen to all sprites.
function _applySpriteLayout() {
    const { root, pairing, pic } = _stage;
    const layout = resolveCompanionLayout(pairing, pic);
    ['left', 'right', 'mid'].forEach(spot => {
        const img = root.querySelector('.cmp-' + spot);
        if (!img) return;
        const src = _spotSpritePath(spot, (layout.sprites[spot] || {}).pose || 'down');
        if (!img.src.endsWith(src)) img.src = src;
        _placeSprite(img, spot, layout.sprites[spot]);
    });
    const pet = root.querySelector('.cmp-pet');
    if (pet) _placeSprite(pet, 'pet', layout.sprites.pet);
    _applyQuestItem(root, pairing, layout.sprites.item);
}

// The quest item of a scene after a co-op encounter: drawn only where the story editor
// placed it (a layout entry `item`), and removed again on pictures that have none. It stands
// in front of the heroes and the pet and behind the speech bubble.
function _applyQuestItem(root, pairing, v) {
    let img = root.querySelector('.cmp-item');
    if (!v || !pairing.questItem) {
        if (img) img.remove();
        return;
    }
    if (!img) {
        img = document.createElement('img');
        img.className = 'cmp-item';
        img.alt = '';
        img.draggable = false;
        root.querySelector('.cmp-bubble').before(img);
    }
    if (!img.src.endsWith(pairing.questItem.art)) img.src = pairing.questItem.art;
    _placeSprite(img, 'item', v);
}

//------------------------------------------------------------------------
// DOM
//------------------------------------------------------------------------

// Syla's pet (Browney or Drifter) standing next to her, when the scene has
// one and Syla is on stage. Returns '' otherwise.
function _petHtml(pairing, playerId) {
    if (!pairing.pet) return '';
    const spot = playerId === 'syla' ? 'left'
        : pairing.companion === 'syla' ? 'right'
            : pairing.companion2 === 'syla' ? 'mid' : null;
    if (!spot) return '';
    return `<img class="cmp-pet cmp-pet-${spot}" src="images/sprites/companion_${pairing.pet}.webp" alt="" draggable="false">`;
}

// Builds the overlay: background, two hero sprites, the bubble and the skip
// button. Returns the root element (not yet attached).
function _buildOverlay(pairing, playerId, replay) {
    const root = document.createElement('div');
    root.className = 'cmp-stage';
    root.innerHTML = `
        <div class="cmp-bg" style="background-image:${_bgCss(pairing.bg, pairing.fallbackBg)}"></div>
        <div class="cmp-vignette"></div>
        <img class="cmp-hero cmp-left" src="${_playerSpot(pairing, playerId, replay)}" alt="" draggable="false">
        <img class="cmp-hero cmp-right" src="${_spritePath(pairing.companion, pairing.looks[pairing.companion])}" alt="" draggable="false">
        ${pairing.companion2 ? `<img class="cmp-hero cmp-mid" src="${_spritePath(pairing.companion2, pairing.looks[pairing.companion2])}" alt="" draggable="false">` : ''}
        ${_petHtml(pairing, playerId)}
        <div class="cmp-bubble"><div class="cmp-name"></div><div class="cmp-text"></div></div>
        <button class="cmp-skip" type="button">${LANG === 'de' ? 'überspringen' : 'skip'}</button>
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
    _placeBubble(bubble, resolveCompanionLayout(pairing, _stage.pic).bubbles[side]);
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

// Gives the player's affinity with the heroes in this scene one point, once per
// scene, and saves it. Only called when the scene was played to its end.
function _earnAffinity(sceneId, playerId, pairing) {
    if (!STATE.companionAffinity) STATE.companionAffinity = {};
    const friends = [pairing.companion, pairing.companion2].filter(Boolean);
    if (recordMeetingWatched(STATE.companionAffinity, sceneId, playerId, friends)) save();
}

// Closes the scene, marks it seen and hands control back to the caller.
// `watched` is true when the last line was reached, false when the player
// skipped; only a watched scene earns affinity.
function _finish(watched) {
    if (!_stage) return;
    const { root, sceneId, onComplete, onKey, playerId, pairing, replay } = _stage;
    _stage = null;
    document.removeEventListener('keydown', onKey, true);
    if (replay) {
        // A replay from the title screen changes nothing: no seen mark, no quest item, no affinity.
        root.classList.add('cmp-out');
        setTimeout(() => root.remove(), 250);
        if (typeof onComplete === 'function') onComplete();
        return;
    }
    markSeen('companion_scene', { sceneId });
    markStoryReplayUnlocked(sceneId, playerId);
    // The meetings in worlds 12 and 13 hand over the Nexus key halves, watched or skipped.
    if (STATE.questItems && grantSceneQuestItem(STATE.questItems, sceneId)) save();
    // Only meetings earn affinity: the scenes after a co-op encounter never do.
    if (watched && !pairing.noAffinity) _earnAffinity(sceneId, playerId, pairing);
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

// Fades the backdrop over to another story image (a { beat: 'background' } item).
function _changeBackground(path) {
    const { root, pairing } = _stage;
    const old = root.querySelector('.cmp-bg');
    const next = document.createElement('div');
    next.className = 'cmp-bg cmp-bg-in';
    next.style.backgroundImage = _bgCss(path, pairing.fallbackBg);
    old.after(next);
    _stage.pic = path;
    _applySpriteLayout();
    setTimeout(() => { old.remove(); next.classList.remove('cmp-bg-in'); }, 700);
}

// Shows script item `i`: a spoken line, the flashback, or a silent backdrop
// change (which moves straight on to the next item).
function _showItem(i) {
    const { pairing } = _stage;
    if (i >= pairing.lines.length) { _finish(true); return; }
    const item = pairing.lines[i];
    _stage.index = i;
    if (item.beat === 'character_intro') { _playFlashback(); return; }
    if (item.beat === 'background') { _changeBackground(item.bg); _showItem(i + 1); return; }
    _showLine(i);
}

// Moves to the next script item, or ends the scene after the last one.
function _advance() {
    if (!_stage || _stage.flashback) return;
    _showItem(_stage.index + 1);
}

// Plays the companion scene `sceneId` for the current player's character, or for the hero in
// `options.asHero` as a replay (the Replay gallery: changes no progress). Does nothing (but
// still calls onComplete) when there is no script for them.
export function playCompanionScene(sceneId, onComplete, options = {}) {
    const playerId = options.asHero || STATE.playerCharacter;
    const replay = !!options.asHero;
    const pairing = getCompanionPairing(sceneId, playerId);
    if (!pairing || _stage) { if (typeof onComplete === 'function') onComplete(); return; }

    const root = _buildOverlay(pairing, playerId, replay);
    const onKey = (e) => {
        if (_stage && _stage.flashback) return;
        if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); e.stopPropagation(); _advance(); }
        else if (e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); _finish(false); }
    };
    _stage = { root, pairing, playerId, sceneId, onComplete, onKey, index: 0, pic: pairing.bg, replay };
    _applySpriteLayout();

    root.addEventListener('click', _advance);
    root.querySelector('.cmp-skip').addEventListener('click', (e) => { e.stopPropagation(); _finish(false); });
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(root);
    _showItem(0);
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
