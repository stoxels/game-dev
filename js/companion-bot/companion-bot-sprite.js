import { COMPANION_LOOKS } from '../storyline/companion-scenes.js';
import { BOT_TINTS } from './companion-bot-profiles.js';
import { botGearStage, botLoadout, highestWorldFinished } from './companion-bot-gear.js';

//------------------------------------------------------------------------
//-------------------COMPANION BOT SPRITE----------------------------------
//------------------------------------------------------------------------
// The friend's picture on the level screen: it walks in, then wanders around
// the player's hero on its own (never tied to the player's steps), hops when
// it helps with the puzzle, runs to a monster card to strike (Stox), or throws
// a spell shot at it (Trix). Pictures come
// from animations/<Hero>/idle and animations/<Hero>/walk, drawn facing the way
// the friend moves (up, down, left, right). The friend carries a weapon (and
// a shield) that gets better as the story goes on (companion-bot-gear.js); it
// is drawn by the game's gear overlay system, which follows every frame.
// All movement is only drawn: the damage is handed over through the `onHit`
// callback at the moment of impact, and every sequence ends (and calls
// onHit) even when the screen cannot show it.

//------------------------------------------------------------------------
// STATE
//------------------------------------------------------------------------

// The running sprite, or null: { hero, look, root, img, timer, pos, dir, anims, height, busy, moveId }.
let _sprite = null;

// Walk frames found per hero / look / direction: key -> array of picture paths.
const _walkCache = new Map();

const WALK_FRAME_MS = 130;
// Walking speed in pixels per millisecond.
const WALK_SPEED = 0.11;
const Z_IDLE = 8500;
const Z_FLIGHT = 9999;

//------------------------------------------------------------------------
// LOW-LEVEL HELPERS
//------------------------------------------------------------------------

// True when the player asked the system for less motion.
function _reducedMotion() {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
    catch (e) { return false; }
}

// Capitalised hero folder name, e.g. 'syla' -> 'Syla'.
function _cap(heroId) {
    return heroId.charAt(0).toUpperCase() + heroId.slice(1);
}

// Which look the friend wears: no class yet, the base class, or the
// ascendency, following how far the player's own hero has come.
export function botLookFor(heroId, playerClass, playerAscendency) {
    const stage = playerAscendency ? 'ascended' : playerClass ? 'base' : 'none';
    return COMPANION_LOOKS[heroId][stage];
}

// Standing picture of a hero in a look, facing `dir`.
function _idleSrc(heroId, look, dir) {
    const cap = _cap(heroId);
    return `animations/${cap}/idle/${look}/${dir}/${cap}_${look}_idle_${dir}_1.webp`;
}

// The direction a move points in: along the longer side of the move.
function _dirOf(dx, dy) {
    if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'right' : 'left';
    return dy >= 0 ? 'down' : 'up';
}

// Finds the walk pictures that exist for a hero / look / direction (numbered
// from 1, as many as there are) and remembers them. Resolves to a list that may be empty.
function _walkFrames(heroId, look, dir) {
    const key = `${heroId}|${look}|${dir}`;
    if (_walkCache.has(key)) return Promise.resolve(_walkCache.get(key));
    const cap = _cap(heroId);
    const urls = [1, 2, 3, 4].map(n => `animations/${cap}/walk/${look}/${dir}/${cap}_${look}_walk_${dir}_${n}.webp`);
    return Promise.all(urls.map(src => new Promise((resolve) => {
        const im = new Image();
        im.onload = () => resolve(src);
        im.onerror = () => resolve(null);
        im.src = src;
    }))).then((found) => {
        const frames = found.filter(Boolean);
        _walkCache.set(key, frames);
        return frames;
    });
}

// The player's own sprite picture on the level screen: the monster-level one
// (inside the avatar wrapper) or the puzzle-level one, whichever is showing.
function _playerSpriteImg() {
    for (const id of ['avatar-sprite-img', 'avatar-sprite-img-simple']) {
        const img = document.getElementById(id);
        if (img && img.getBoundingClientRect().width > 0) return img;
    }
    return null;
}

// Size of the player's own sprite on the level screen, so the friend matches it.
function _playerSpriteHeight() {
    const img = _playerSpriteImg();
    const h = img ? img.getBoundingClientRect().height : 0;
    return h >= 24 ? h : 64;
}

// Where the player's hero stands right now: the middle of the feet, in screen pixels.
function _playerFeet() {
    const img = _playerSpriteImg();
    const r = img ? img.getBoundingClientRect() : null;
    if (!r || !r.width) return { x: window.innerWidth * 0.3, y: window.innerHeight * 0.3 };
    return { x: r.left + r.width / 2, y: r.bottom };
}

// A random spot for the friend to wander to (as the sprite's top-left corner):
// near the player's hero, not on top of it, always on screen. When the player
// has walked far away the spot is closer, so the friend drifts after them.
function _wanderTarget(s) {
    const feet = _playerFeet();
    const w = s.root.getBoundingClientRect().width || s.height * 0.5;
    const far = Math.hypot(feet.x - (s.pos.x + w / 2), feet.y - (s.pos.y + s.height)) > 340;
    const [rMin, rMax] = far ? [70, 170] : [90, 250];
    const angle = Math.random() * Math.PI * 2;
    const r = rMin + Math.random() * (rMax - rMin);
    let x = feet.x + Math.cos(angle) * r - w / 2;
    let y = feet.y + Math.sin(angle) * r * 0.6 - s.height;
    x = Math.max(8, Math.min(window.innerWidth - w - 8, x));
    y = Math.max(70, Math.min(window.innerHeight - s.height - 90, y));
    return { x, y };
}

// Centre of an element on screen.
function _centre(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

// Puts the sprite at a screen spot (top-left corner) facing `dir`.
function _place(x, y, dir) {
    _sprite.pos = { x, y };
    _sprite.dir = dir || _sprite.dir;
    _sprite.root.style.transform = `translate(${x}px, ${y}px)`;
}

// Cancels motion still running so the next move starts from the laid-out spot.
function _stopMotion() {
    for (const a of _sprite.anims) { try { a.cancel(); } catch (e) { /* already done */ } }
    _sprite.anims = [];
}

// Stops any walk in progress and records where the sprite really is on screen
// right now (the stored spot is only updated when a walk ends), so the next
// move starts from the visible place and never jumps.
function _freezeHere(s) {
    if (!s.anims.length) return;
    const r = s.root.getBoundingClientRect();
    _stopMotion();
    _place(r.left, r.top);
}

// Shows the standing picture facing the current direction, or runs the walk
// cycle for that direction (falls back to standing when no walk pictures exist).
async function _setWalking(on) {
    const s = _sprite;
    if (!s) return;
    clearInterval(s.timer);
    s.timer = null;
    const dir = s.dir;
    const frames = on ? await _walkFrames(s.hero, s.look, dir) : [];
    if (_sprite !== s) return;
    if (!on || !frames.length) { s.img.src = _idleSrc(s.hero, s.look, dir); return; }
    let i = 0;
    s.img.src = frames[0];
    s.timer = setInterval(() => {
        if (_sprite !== s) return;
        i = (i + 1) % frames.length;
        s.img.src = frames[i];
    }, WALK_FRAME_MS);
}

// Slides the sprite to a spot over `ms`, walking toward it (facing the way it
// moves), then settles there standing, facing `faceDir` or the way it walked.
// With `keepWalking` it stays in the walk cycle on arrival (a leg of a longer
// path). A newer move cancels an older one: the older one never settles.
// Resolves when it has arrived (always, even if the screen cannot animate).
function _moveTo(x, y, ms, faceDir, keepWalking = false) {
    const s = _sprite;
    _freezeHere(s);
    const from = s.pos;
    const dir = _dirOf(x - from.x, y - from.y);
    const id = ++s.moveId;
    const settle = () => {
        if (_sprite !== s || s.moveId !== id) return;
        _stopMotion();
        _place(x, y, faceDir || dir);
        if (!keepWalking) _setWalking(false);
    };
    return new Promise((resolve) => {
        if (_reducedMotion() || typeof s.root.animate !== 'function') { settle(); resolve(); return; }
        _stopMotion();
        const turned = s.dir !== dir || !s.timer;
        s.dir = dir;
        if (turned) _setWalking(true);
        let anim;
        try {
            anim = s.root.animate([
                { transform: `translate(${from.x}px, ${from.y}px)` },
                { transform: `translate(${x}px, ${y}px)` },
            ], { duration: ms, easing: 'cubic-bezier(0.3, 0.6, 0.4, 1)', fill: 'forwards' });
        } catch (e) { settle(); resolve(); return; }
        s.anims.push(anim);
        let done = false;
        const fin = () => { if (!done) { done = true; settle(); resolve(); } };
        anim.onfinish = fin;
        setTimeout(fin, ms + 400);
    });
}

// A short waiting time.
function _wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Swings the friend's weapon around its grip (the same turn the player's own
// weapon makes in combat-weapon-swing.js): back, through, and home.
function _swingWeapon(fromDeg, toDeg, ms) {
    const s = _sprite;
    if (!s) return;
    for (const el of s.root.querySelectorAll('.gear-item.gear-weapon')) {
        if (el.style.display !== 'block' || typeof el.animate !== 'function') continue;
        try { el.animate([{ rotate: `${fromDeg}deg` }, { rotate: `${toDeg}deg` }, { rotate: '0deg' }], { duration: ms, easing: 'cubic-bezier(0.15, 0.6, 0.25, 1)' }); }
        catch (e) { /* the swing is only decoration */ }
    }
}

// The friend's speech bubble (same look as the player's own banter bubble),
// created on first use. It follows the friend while it is shown.
let _bubble = null;
let _bubbleHide = null;

// Puts the bubble above the friend's head, kept on screen.
function _placeBubble() {
    const s = _sprite;
    if (!s || !_bubble) return;
    const r = s.root.getBoundingClientRect();
    const w = _bubble.offsetWidth || 200;
    const h = _bubble.offsetHeight || 50;
    _bubble.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width * 0.45)) + 'px';
    _bubble.style.top = Math.max(4, r.top - h - 12) + 'px';
}

// Keeps the bubble glued to the friend (who may be walking) until it fades.
function _followBubble() {
    if (!_bubble || !_bubble.classList.contains('show')) return;
    _placeBubble();
    requestAnimationFrame(_followBubble);
}

// A small coloured flash drawn at a screen point (slash / impact).
function _flash(x, y, color, size) {
    const el = document.createElement('div');
    el.style.cssText = `position:fixed;left:${x - size / 2}px;top:${y - size / 2}px;width:${size}px;height:${size}px;`
        + `border-radius:50%;pointer-events:none;z-index:${Z_FLIGHT};background:radial-gradient(circle, #fff 0%, ${color} 45%, transparent 70%);`;
    document.body.appendChild(el);
    if (typeof el.animate === 'function') {
        const a = el.animate([{ opacity: 1, transform: 'scale(0.4)' }, { opacity: 0, transform: 'scale(1.6)' }], { duration: 320, easing: 'ease-out' });
        a.onfinish = () => el.remove();
    }
    setTimeout(() => el.remove(), 500);
}

// Walks to a spot along two straight legs (the longer way first), so the
// walk picture always faces the way the friend really moves: left, right, up
// or down. Stops early when something else (a strike) takes over. Ends
// standing, facing the way of the last leg.
// With `force` the walk goes on even while the friend is marked busy (the
// caller owns that busy state, e.g. walking to a standing spot).
async function _walkTo(s, x, y, force = false) {
    const dx = x - s.pos.x;
    const dy = y - s.pos.y;
    const legs = Math.abs(dx) >= Math.abs(dy)
        ? [[x, s.pos.y, Math.abs(dx)], [x, y, Math.abs(dy)]]
        : [[s.pos.x, y, Math.abs(dy)], [x, y, Math.abs(dx)]];
    const real = legs.filter(l => l[2] > 6);
    for (let i = 0; i < real.length; i++) {
        if (_sprite !== s || (s.busy && !force)) return;
        const last = i === real.length - 1;
        await _moveTo(real[i][0], real[i][1], Math.max(350, real[i][2] / WALK_SPEED), undefined, !last);
    }
}

// The friend's own life: stands a while, then strolls to a new spot near the
// player's hero, again and again until the sprite is removed. It pauses while
// a strike or spell is playing.
async function _wanderLoop(s) {
    while (_sprite === s) {
        await _wait(2200 + Math.random() * 3200);
        if (_sprite !== s) return;
        if (s.busy || s.anims.length) continue;
        const t = _wanderTarget(s);
        await _walkTo(s, t.x, t.y);
    }
}

//------------------------------------------------------------------------
// ENTRY POINTS
//------------------------------------------------------------------------

// Shows the friend walking in from the left edge to the spot beside the
// player's hero, carrying the gear that fits the story so far. Does nothing
// when a sprite is already there. `state` is the save (class, ascendency, progress).
export function spawnBotSprite(heroId, state) {
    if (_sprite) return;
    const look = botLookFor(heroId, state.playerClass, state.playerAscendency);
    const height = _playerSpriteHeight();
    const root = document.createElement('div');
    root.id = 'companion-bot-sprite';
    root.style.cssText = `position:fixed;left:0;top:0;z-index:${Z_IDLE};pointer-events:none;will-change:transform;`
        + `filter:drop-shadow(0 0 5px ${BOT_TINTS[heroId]});`;
    const img = document.createElement('img');
    img.alt = '';
    img.draggable = false;
    img.style.cssText = `display:block;height:${height}px;width:auto;image-rendering:auto;`;
    // The gear overlay system draws the weapon and shield on any image that carries its own loadout.
    img.__gearLoadout = botLoadout(heroId, botGearStage(highestWorldFinished(state)));
    img.dataset.gearExtra = '1';
    root.appendChild(img);
    document.body.appendChild(root);
    const s = { hero: heroId, look, root, img, timer: null, pos: { x: 0, y: 0 }, dir: 'right', anims: [], height, busy: false, moveId: 0 };
    _sprite = s;
    const feet = _playerFeet();
    _place(-height * 2, feet.y - height, 'right');
    _setWalking(false);
    // Walks in from the left edge to a spot beside the player's hero, then wanders on its own.
    _walkTo(s, feet.x + height * 0.6, feet.y - height).then(() => _wanderLoop(s));
}

// The friend says something: a bubble with their name and the text above their
// head for a few seconds. Does nothing when the friend is not on screen.
export function botSpriteSay(text, name, ms = 5200) {
    const s = _sprite;
    if (!s) return;
    if (!_bubble) {
        _bubble = document.createElement('div');
        _bubble.className = 'char-speech-bubble companion-bubble';
        _bubble.style.zIndex = '8600';
        document.body.appendChild(_bubble);
    }
    _bubble.dataset.hero = s.hero;
    _bubble.textContent = '';
    const who = document.createElement('b');
    who.textContent = name;
    who.style.color = BOT_TINTS[s.hero];
    const body = document.createElement('div');
    body.className = 'char-speech-bubble-text';
    body.append(who, document.createElement('br'), text);
    _bubble.appendChild(body);
    _placeBubble();
    _bubble.classList.add('show');
    requestAnimationFrame(_followBubble);
    clearTimeout(_bubbleHide);
    _bubbleHide = setTimeout(() => { if (_bubble) _bubble.classList.remove('show'); }, ms);
}

// Sends the friend to stand with their feet at a screen point (a standing
// spot) and keeps them there, no wandering, until botSpriteRelease. Resolves
// when they have arrived (false if the friend is gone or something took over).
export async function botSpriteGoTo(cx, cy) {
    const s = _sprite;
    if (!s) return false;
    s.busy = true;
    const w = s.root.getBoundingClientRect().width || s.height * 0.5;
    await _walkTo(s, cx - w / 2, cy - s.height, true);
    return _sprite === s;
}

// Lets the friend wander and fight again after standing at a spot.
export function botSpriteRelease() {
    if (_sprite) _sprite.busy = false;
}

// A little hop: the friend "does something" when it places a hint, fill or mark.
export function botSpriteGesture() {
    const s = _sprite;
    if (!s || _reducedMotion() || typeof s.root.animate !== 'function' || s.anims.length) return;
    const { x, y } = s.pos;
    try {
        const a = s.root.animate([
            { transform: `translate(${x}px, ${y}px)` },
            { transform: `translate(${x}px, ${y - 14}px)`, offset: 0.45 },
            { transform: `translate(${x}px, ${y}px)` },
        ], { duration: 380, easing: 'ease-out' });
        s.anims.push(a);
        a.onfinish = () => { s.anims = s.anims.filter(v => v !== a); };
    } catch (e) { /* hop is only decoration */ }
}

// Melee strike: runs to the monster's card, swings the weapon, calls `onHit`
// at the moment of impact, then walks home. Resolves when back at the home spot.
export async function botSpriteStrike(targetId, onHit) {
    const s = _sprite;
    const card = targetId != null ? document.getElementById(`sx-card-${targetId}`) : null;
    if (!s || !card || _reducedMotion()) { onHit(); return; }
    s.busy = true;
    _freezeHere(s);
    // The friend returns to where it stood before the strike.
    const home = { x: s.pos.x, y: s.pos.y };
    const c = _centre(card);
    const w = s.root.getBoundingClientRect().width || s.height * 0.7;
    // Stop just short of the card's centre so the sprite overlaps its edge.
    const tx = home.x + (c.x - home.x) * 0.82 - w / 2;
    const ty = home.y + (c.y - s.height * 0.5 - home.y) * 0.82;
    s.root.style.zIndex = String(Z_FLIGHT);
    const dist = Math.hypot(tx - home.x, ty - home.y);
    await _moveTo(tx, ty, Math.min(900, Math.max(450, 300 + dist * 0.6)), _dirOf(c.x - tx, c.y - ty));
    if (_sprite !== s) { onHit(); return; }
    // Lunge toward the monster and back with the weapon swung through; the hit lands at the front of the lunge.
    const dirX = c.x >= tx ? 1 : -1;
    const { x, y } = s.pos;
    _swingWeapon(-65, 55, 300);
    try {
        const a = s.root.animate([
            { transform: `translate(${x}px, ${y}px)` },
            { transform: `translate(${x + dirX * 22}px, ${y}px)`, offset: 0.4 },
            { transform: `translate(${x}px, ${y}px)` },
        ], { duration: 300, easing: 'ease-out' });
        s.anims.push(a);
        a.onfinish = () => { s.anims = s.anims.filter(v => v !== a); };
    } catch (e) { /* lunge is only decoration */ }
    await _wait(110);
    onHit();
    _flash(c.x, c.y, BOT_TINTS[s.hero], 70);
    await _wait(260);
    if (_sprite !== s) return;
    await _moveTo(home.x, home.y, 600);
    if (_sprite === s) { s.root.style.zIndex = String(Z_IDLE); s.busy = false; }
}

// Spell shot: the friend faces the monster, raises the weapon and glows, a
// glowing orb flies to the monster's card, and `onHit` is called when it
// lands. Resolves after the orb has landed.
export async function botSpriteCast(targetId, onHit) {
    const s = _sprite;
    const card = targetId != null ? document.getElementById(`sx-card-${targetId}`) : null;
    if (!s || !card || _reducedMotion() || typeof s.root.animate !== 'function') { onHit(); return; }
    s.busy = true;
    _freezeHere(s);
    clearInterval(s.timer);
    s.timer = null;
    s.moveId++;
    const c = _centre(card);
    const r = s.root.getBoundingClientRect();
    const from = { x: r.left + r.width / 2, y: r.top + r.height * 0.4 };
    const color = BOT_TINTS[s.hero];
    // Face the target, then gather the spell.
    s.dir = _dirOf(c.x - from.x, c.y - from.y);
    s.img.src = _idleSrc(s.hero, s.look, s.dir);
    _swingWeapon(-30, 20, 420);
    try {
        s.root.animate([{ filter: `drop-shadow(0 0 5px ${color})` }, { filter: `drop-shadow(0 0 18px ${color}) brightness(1.4)` }, { filter: `drop-shadow(0 0 5px ${color})` }],
            { duration: 420, easing: 'ease-in-out' });
    } catch (e) { /* glow is only decoration */ }
    await _wait(300);
    const orb = document.createElement('div');
    orb.style.cssText = `position:fixed;left:${from.x - 9}px;top:${from.y - 9}px;width:18px;height:18px;border-radius:50%;pointer-events:none;`
        + `z-index:${Z_FLIGHT};background:radial-gradient(circle,#fff 0%,${color} 55%,transparent 75%);box-shadow:0 0 14px 4px ${color};`;
    document.body.appendChild(orb);
    await new Promise((resolve) => {
        let done = false;
        const fin = () => { if (!done) { done = true; resolve(); } };
        try {
            const a = orb.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${c.x - from.x}px, ${c.y - from.y}px)` }],
                { duration: 380, easing: 'ease-in', fill: 'forwards' });
            a.onfinish = fin;
        } catch (e) { fin(); }
        setTimeout(fin, 800);
    });
    orb.remove();
    onHit();
    _flash(c.x, c.y, color, 80);
    await _wait(200);
    if (_sprite === s) { s.img.src = _idleSrc(s.hero, s.look, s.dir); s.busy = false; }
}

// Removes the friend: a quick fade, then the picture is gone.
export function removeBotSprite() {
    const s = _sprite;
    if (!s) return;
    _sprite = null;
    clearInterval(s.timer);
    clearTimeout(_bubbleHide);
    if (_bubble) { _bubble.remove(); _bubble = null; }
    for (const a of s.anims) { try { a.cancel(); } catch (e) { /* already done */ } }
    const gone = () => s.root.remove();
    if (typeof s.root.animate === 'function' && !_reducedMotion()) {
        try { const a = s.root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }); a.onfinish = gone; } catch (e) { gone(); }
        setTimeout(gone, 500);
    } else gone();
}
