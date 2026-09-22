//------------------------------------------------------------------------
// GEAR OVERLAYS — equipped weapons & shields drawn on the avatar sprites
//------------------------------------------------------------------------
// Wires the grip-lab data model into the live game. The GENERATED data
// module (gear-overlays-data.js, built by tools/build-grip-data.mjs from
// the lab's grips.json) holds fully-resolved frames for every character ×
// class × set, with mirrored side sets baked in; THIS module owns only the
// DOM work:
//
//     back-layer items → body frame (avatar <img>) → front items → fist
//     patches (copies of the body frame clipped to circles over the grips)
//
// Placement math is NOT duplicated here: every slot goes through the
// shared js/sprite/grip-render.js (resolvePlacement + placeItem) — the
// exact same module the grip lab uses, so what is tuned is what renders.
//
// Loadout mapping mirrors the hand rules in loot-requirements.js:
//   weapon1 = main hand · weapon2 = off-hand (shield or 1H weapon).
//   A two-handed main weapon hides the off-hand entirely and draws a
//   second fist patch on the shaft; a 1H weapon in weapon2 renders as
//   dual wield at the shield-hand anchor.
//
// Integration is deliberately side-effect-only: a light poll plus
// MutationObservers keep the overlays glued to the three sprite <img>
// elements as animation loops swap frame srcs, the game mirrors imgs with
// scaleX(-1), and level re-renders rebuild the DOM. Never throws on
// missing data or images (G5) — worst case an item simply doesn't draw.
//------------------------------------------------------------------------

import { EG_ART } from '../endgame/endgame-art.js';
import { _egEquipped } from '../endgame/hub-stash.js';
import { _egGetWeaponHands } from '../loot/loot-requirements.js';
import { GEAR_GRIP_DATA } from './gear-overlays-data.js';
import { resolvePlacement, placeItem } from './grip-render.js';

const DATA = GEAR_GRIP_DATA || {};
const ITEMS_DATA = DATA.items || {};
const SPRITES_DATA = DATA.sprites || {};
const HANDEDNESS = DATA.handedness || {};
const TWO_HANDED = new Set(DATA.twoHandedIds || []);

// The four avatar sprite <img> elements the game animates (full avatar on
// monster levels, simple avatar on puzzle levels, SELECT LEVEL map-view
// world sprite, world-detail sprite on world screens like Probability
// Peaks — wd-sprite-img walks to level nodes there and needs gear too).
const SPRITE_IMG_IDS = ['avatar-sprite-img', 'avatar-sprite-img-simple', 'mv-sprite-img', 'wd-sprite-img'];

const POLL_MS = 250;   // attachment sweep (observers give instant frame sync)
const FRONT_Z = 3;     // above the static body img
const BACK_Z = -1;     // below the body img (parent gets isolation:isolate)
const HAND_Z = 5;      // fist patches above everything of this sprite

//------------------------------------------------------------------------
// Animation src parsing — the frame path encodes char/state/variant/dir.
//   animations/<Char>/<state>/<variant>/<dir>/<file>   directional
//   animations/<Char>/<state>/<variant>/<file>         omni fallback
//   animations/<Char>/<state>/<file>                   legacy flat
//------------------------------------------------------------------------

const ANIM_RE_DIR = /^animations\/([^/]+)\/([^/]+)\/([^/]+)\/(up|down|left|right)\/([^/]+)$/;
const ANIM_RE_OMNI = /^animations\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)$/;
const ANIM_RE_FLAT = /^animations\/([^/]+)\/([^/]+)\/([^/]+)$/;
const FRAME_NUM_RE = /_(\d+)\.[a-z0-9]+$/i;

function parseAnimSrc(src) {
    if (!src || src.indexOf('animations/') !== 0) return null;
    let m = ANIM_RE_DIR.exec(src);
    if (m) return { char: m[1].toLowerCase(), state: m[2], variant: m[3], dir: m[4], file: m[5], src };
    m = ANIM_RE_OMNI.exec(src);
    if (m) return { char: m[1].toLowerCase(), state: m[2], variant: m[3], dir: null, file: m[4], src };
    m = ANIM_RE_FLAT.exec(src);
    if (m) return { char: m[1].toLowerCase(), state: m[2], variant: null, dir: null, file: m[3], src };
    return null;
}

// Set key under which the exporter stored this sprite's frames. Omni and
// legacy art is stored without a direction suffix (the exporter computed
// its defaults from the game's facing conventions).
function setKeyFor(info) {
    return info.dir ? (info.state + ':' + info.dir) : info.state;
}

// Match the current frame within the authored set: exact path, then
// basename, then frame number, then wrap by index.
function pickFrameInfo(frames, info) {
    let idx = -1;
    for (let i = 0; i < frames.length; i++) {
        if (frames[i] && frames[i].img === info.src) { idx = i; break; }
    }
    if (idx === -1) {
        for (let i = 0; i < frames.length; i++) {
            const f = frames[i];
            if (f && f.img && f.img.split('/').pop() === info.file) { idx = i; break; }
        }
    }
    if (idx === -1) {
        const m = FRAME_NUM_RE.exec(info.file);
        idx = m ? (parseInt(m[1], 10) - 1) : 0;
    }
    return ((idx % frames.length) + frames.length) % frames.length;
}

// Frames for a parsed sprite: exact variant first, then any other authored
// variant of the same character (belt-and-braces; the exporter bakes all
// inventory variants so the first lookup normally hits).
function framesFor(info) {
    const setKey = setKeyFor(info);
    const keys = [];
    if (info.variant) keys.push(info.char + '|' + info.variant);
    for (const key of Object.keys(SPRITES_DATA)) {
        if (key.indexOf(info.char + '|') === 0 && keys.indexOf(key) === -1) keys.push(key);
    }
    for (const k of keys) {
        const set = SPRITES_DATA[k] && SPRITES_DATA[k][setKey];
        if (set && Array.isArray(set.frames) && set.frames.length) return set.frames;
    }
    return null;
}

//------------------------------------------------------------------------
// Loadout — straight from the equipped paperdoll (endgame equipment).
//------------------------------------------------------------------------

function readLoadout() {
    let eq = null;
    try { eq = _egEquipped || null; } catch (e) { eq = null; }
    if (!eq) return null;
    const main = eq.weapon1 || null;
    const off = eq.weapon2 || null;
    const mainId = main ? main.baseId : null;
    const offId = off ? off.baseId : null;
    if (!mainId && !offId) return null;
    let mainIsTwoHanded = TWO_HANDED.has(mainId);
    if (main && main.slotType === 'weapon' && !mainIsTwoHanded) {
        try { mainIsTwoHanded = _egGetWeaponHands(main) === 2; } catch (e) { /* table miss */ }
    }
    if (mainIsTwoHanded) return { mainId, offId: null, offRole: null, mode: '2h' };
    const offRole = off ? (off.slotType === 'shield' ? 'shield' : (off.slotType === 'weapon' ? 'weapon' : null)) : null;
    if (offRole === 'weapon') return { mainId, offId, offRole: 'weapon', mode: 'dual' };
    if (offRole === 'shield') return { mainId, offId, offRole: 'shield', mode: '1h' };
    return { mainId, offId: null, offRole: null, mode: 'main' };
}

//------------------------------------------------------------------------
// DOM: back stage, front stage, hand-patch stage around the body img
//------------------------------------------------------------------------

let stylesInjected = false;
function ensureStyles(doc) {
    if (stylesInjected) return;
    const style = doc.createElement('style');
    style.id = 'gear-overlay-styles';
    style.textContent = [
        '.gear-stage { position: absolute; pointer-events: none; }',
        '.gear-stage-back { z-index: ' + BACK_Z + '; }',
        '.gear-stage-front { z-index: ' + FRONT_Z + '; }',
        '.gear-stage-hand { z-index: ' + HAND_Z + '; }',
        '.gear-item { position: absolute; display: none; }',
        '.gear-patch { position: absolute; display: none; pointer-events: none; }',
    ].join('\n');
    doc.head.appendChild(style);
    stylesInjected = true;
}

// Item-art aspect cache (height follows the file once decoded).
const aspectCache = new Map();

function ensureStages(img) {
    const parent = img.parentElement;
    if (!parent) return null;
    let back = null, front = null, hand = null;
    for (const child of parent.children) {
        if (!child.classList) continue;
        if (!back && child.classList.contains('gear-stage-back')) back = child;
        else if (!front && child.classList.contains('gear-stage-front')) front = child;
        else if (!hand && child.classList.contains('gear-stage-hand')) hand = child;
    }
    if (!back || !front || !hand) {
        ensureStyles(img.ownerDocument);
        // isolation creates a stacking context on the parent so the back
        // stage's negative z-index stays above the page background but
        // below the in-flow body img.
        try { parent.style.isolation = 'isolate'; } catch (e) { /* old browser: back layer may overdraw */ }
        // The stages are position:absolute and are placed with
        // img-rect-minus-parent-rect coordinates — the parent must be the
        // containing block, so promote it if it is static (the game's
        // avatar row is not positioned by its own CSS).
        try {
            const pos = img.ownerDocument.defaultView.getComputedStyle(parent).position;
            if (pos === 'static') parent.style.position = 'relative';
        } catch (e) { /* keep computed placement as-is */ }
        back = back || document.createElement('div');
        front = front || document.createElement('div');
        hand = hand || document.createElement('div');
        back.className = 'gear-stage gear-stage-back';
        front.className = 'gear-stage gear-stage-front';
        hand.className = 'gear-stage gear-stage-hand';
        for (const stage of [back, front]) {
            for (const slot of ['weapon', 'off']) {
                const el = img.ownerDocument.createElement('img');
                el.className = 'gear-item gear-' + slot;
                el.alt = '';
                el.draggable = false;
                el.addEventListener('load', () => {
                    if (el.naturalWidth > 0) {
                        aspectCache.set(el.getAttribute('src'), el.naturalHeight / el.naturalWidth);
                    }
                    scheduleSync(img);
                });
                stage.appendChild(el);
            }
        }
        // three fist patches: main hand, off hand, 2H second hand
        for (const kind of ['weapon', 'off', 'second']) {
            const p = img.ownerDocument.createElement('img');
            p.className = 'gear-patch gear-patch-' + kind;
            p.alt = '';
            p.draggable = false;
            hand.appendChild(p);
        }
        if (!back.parentElement) parent.appendChild(back);
        if (!front.parentElement) parent.appendChild(front);
        if (!hand.parentElement) parent.appendChild(hand);
    }
    if (!img.__gearObserver) {
        try {
            const obs = new MutationObserver(() => scheduleSync(img));
            obs.observe(img, { attributes: true, attributeFilter: ['src', 'style', 'class'] });
            img.__gearObserver = obs;
        } catch (e) { /* pre-MutationObserver: the poll covers it */ }
        img.addEventListener('load', () => scheduleSync(img));
    }
    return { back, front, hand };
}

function hideStages(stages) {
    if (!stages) return;
    for (const el of stages.back.children) el.style.display = 'none';
    for (const el of stages.front.children) el.style.display = 'none';
    for (const el of stages.hand.children) el.style.display = 'none';
}

// Position the stages exactly over the body img's element box.
function positionStages(stages, img) {
    const parent = img.parentElement;
    const pr = parent.getBoundingClientRect();
    const ir = img.getBoundingClientRect();
    const left = ir.left - pr.left;
    const top = ir.top - pr.top;
    for (const stage of [stages.back, stages.front, stages.hand]) {
        stage.style.left = left + 'px';
        stage.style.top = top + 'px';
        stage.style.width = ir.width + 'px';
        stage.style.height = ir.height + 'px';
    }
}

// The sprite box is square (object-fit: contain) — compute the letterbox
// rect the frame art actually occupies inside the img element.
function bodyDrawRect(img) {
    const bw = img.clientWidth;
    const bh = img.clientHeight;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    if (!bw || !bh || !nw || !nh) return null;
    const s = Math.min(bw / nw, bh / nh);
    const dw = nw * s;
    const dh = nh * s;
    return { ox: (bw - dw) / 2, oy: (bh - dh) / 2, dw, dh };
}

function isMirrored(img) {
    // The overworld map screens (SELECT LEVEL map-view + world detail)
    // mirror omni fallback art with the CSS `scale` property
    // (img.style.scale = '-1 1', see screens-map-view.js /
    // screens-world-levels.js), NOT `transform` — detect that flip first.
    // getPropertyValue covers engines where `style.scale` isn't a named
    // accessor; a leading '-' on the first scale factor means mirrored.
    const inlineScale = img.style
        && (img.style.scale
            || (typeof img.style.getPropertyValue === 'function'
                && img.style.getPropertyValue('scale')))
        || '';
    if (typeof inlineScale === 'string' && /(^|\s)-/.test(inlineScale)) return true;
    try {
        const cs = img.ownerDocument.defaultView.getComputedStyle(img);
        if (cs && typeof cs.scale === 'string' && cs.scale !== 'none'
            && /(^|\s)-/.test(cs.scale)) return true;
    } catch (e) { /* keep inline-only result */ }
    const inline = img.style && img.style.transform;
    if (inline && inline.indexOf('-1') !== -1) return true;
    if (inline && inline.indexOf('scaleX(1)') !== -1) return false;
    try {
        const m = img.ownerDocument.defaultView.getComputedStyle(img).transform;
        if (m && m.indexOf('matrix') === 0) {
            const parts = m.replace(/^matrix\(|\)$/, '').split(',');
            return parseFloat(parts[0]) < 0;
        }
    } catch (e) { /* keep inline-only result */ }
    return false;
}

//------------------------------------------------------------------------
// Slot rendering through the SHARED placement module (G1)
//------------------------------------------------------------------------

function itemUrl(baseId) {
    try { return EG_ART.url('item', baseId) || null; } catch (e) { return null; }
}

// Draw one slot. Returns the placement (for the fist patch) or null.
// The front-stage elements always carry the placement styles; a back-layer
// item is that same placement re-parented behind the body — clone the FULL
// inline style (geometry, transform, filter, size), not just src.
function mirrorPlacedStyle(fromEl, toEl) {
    toEl.style.cssText = fromEl.style.cssText;
    toEl.setAttribute('src', fromEl.getAttribute('src') || '');
}

function placeGear(el, baseId, req, rect, mirrored) {
    const p = resolvePlacement(req);
    if (!p) { el.style.display = 'none'; return null; }
    const src = itemUrl(baseId);
    if (!src) { el.style.display = 'none'; return null; }
    if (el.getAttribute('src') !== src) {
        el.setAttribute('src', src);
        const aspect = aspectCache.get(src);
        if (typeof aspect !== 'number' && el.naturalWidth > 0) {
            aspectCache.set(src, el.naturalHeight / el.naturalWidth);
        }
    }
    // the resolved item meta needs nat for the aspect; resolveItemMeta took
    // nat from the baked data — reconcile with the actually-decoded image
    const aspect = aspectCache.get(src);
    if (typeof aspect === 'number' && aspect > 0) p.item.nat = [1000, Math.round(1000 * aspect)];
    const geo = placeItem(p, rect.dw, rect.dh);
    // stage-local coordinates (stage spans the img ELEMENT box, the art
    // lives in the centered letterbox rect — add its ox/oy offset)
    const hx = mirrored ? 1 - p.hand[0] : p.hand[0];
    el.style.display = 'block';
    el.style.width = geo.width + 'px';
    el.style.left = (rect.ox + hx * rect.dw - (p.item.handle[0] * geo.width)) + 'px';
    el.style.top = (rect.oy + p.hand[1] * rect.dh - (p.item.handle[1] * geo.height)) + 'px';
    el.style.transformOrigin = geo.transformOrigin;
    el.style.transform = geo.transform + (mirrored ? ' scaleX(-1)' : '');
    el.style.filter = geo.filter || '';
    return p;
}

// Fist patch (F1): a copy of the body frame clipped to a circle over a
// hand anchor, drawn above the front layer. mirrored = the body img is
// CSS-flipped, so normalized x flips while the patch img itself stays put.
function placePatch(patchEl, img, rect, handNorm, rNorm, mirrored, show) {
    if (!show) { patchEl.style.display = 'none'; return; }
    const bodySrc = img.getAttribute('src');
    if (!bodySrc) { patchEl.style.display = 'none'; return; }
    if (patchEl.getAttribute('src') !== bodySrc) patchEl.setAttribute('src', bodySrc);
    const r = rNorm * rect.dw;
    const cx = (mirrored ? 1 - handNorm[0] : handNorm[0]) * rect.dw;
    const cy = handNorm[1] * rect.dh;
    patchEl.style.display = 'block';
    patchEl.style.left = rect.ox + 'px';
    patchEl.style.top = rect.oy + 'px';
    patchEl.style.width = rect.dw + 'px';
    patchEl.style.height = rect.dh + 'px';
    patchEl.style.clipPath = 'circle(' + r.toFixed(1) + 'px at ' + cx.toFixed(1) + 'px ' + cy.toFixed(1) + 'px)';
}

//------------------------------------------------------------------------
// Sync
//------------------------------------------------------------------------

function syncImg(img) {
    if (!img || !img.isConnected) {
        if (img && img.__gearObserver) {
            try { img.__gearObserver.disconnect(); } catch (e) { /* already gone */ }
            delete img.__gearObserver;
        }
        return;
    }
    const stages = ensureStages(img);
    const info = parseAnimSrc(img.getAttribute('src') || '');
    if (!stages || !info) { hideStages(stages); return; }

    const loadout = readLoadout();
    if (!loadout || !loadout.mainId) { hideStages(stages); return; }

    const frames = framesFor(info);
    if (!frames) { hideStages(stages); return; }
    const frameIdx = pickFrameInfo(frames, info);

    const rect = bodyDrawRect(img);
    if (!rect) return; // frame art not decoded yet — keep last placement

    const mirrored = isMirrored(img);
    positionStages(stages, img);

    const weaponEl = stages.front.querySelector('.gear-weapon');
    const backWeaponEl = stages.back.querySelector('.gear-weapon');
    const offEl = stages.front.querySelector('.gear-off');
    const backOffEl = stages.back.querySelector('.gear-off');
    const patchW = stages.hand.querySelector('.gear-patch-weapon');
    const patchO = stages.hand.querySelector('.gear-patch-off');
    const patch2 = stages.hand.querySelector('.gear-patch-second');

    // shared request template for the shared resolver
    const baseReq = {
        data: {
            version: 2,
            handedness: HANDEDNESS,
            items: ITEMS_DATA,
            sprites: { [info.char + '|' + (info.variant || 'noclass')]: { [setKeyFor(info)]: { frames } } },
        },
        char: info.char,
        cls: info.variant || 'noclass',
        set: setKeyFor(info),
        frameIdx,
        nat: [img.naturalWidth || 212, img.naturalHeight || 356],
    };

    // main hand — weapon1 (never a shield; see loot-requirements hand rules)
    const wReq = { ...baseReq, slot: 'weapon', itemId: loadout.mainId, twoHanded: loadout.mode === '2h', offRole: loadout.offRole };
    const wp = placeGear(weaponEl, loadout.mainId, wReq, rect, mirrored);
    if (wp && wp.layer === 'back') { mirrorPlacedStyle(weaponEl, backWeaponEl); weaponEl.style.display = 'none'; } else { backWeaponEl.style.display = 'none'; }

    // off-hand — shield (1h), second one-hander (dual), nothing (2h/main)
    let op = null;
    if (loadout.offId && loadout.offRole) {
        const oReq = { ...baseReq, slot: 'off', itemId: loadout.offId, twoHanded: false, offRole: loadout.offRole };
        op = placeGear(offEl, loadout.offId, oReq, rect, mirrored);
        if (op && op.layer === 'back') { mirrorPlacedStyle(offEl, backOffEl); offEl.style.display = 'none'; } else { backOffEl.style.display = 'none'; }
    } else {
        offEl.style.display = 'none';
        backOffEl.style.display = 'none';
    }

    // fist patches — main hand always (front-layer item), off hand when it
    // draws on the front layer, second hand when a 2H weapon is out
    placePatch(patchW, img, rect, wp ? wp.hand : [0.5, 0.5], wp ? wp.patch.r : 0, mirrored, !!(wp && wp.patch.on));
    placePatch(patchO, img, rect, op ? op.hand : [0.5, 0.5], op ? op.patch.r : 0, mirrored, !!(op && op.patch.on));
    const frame = frames[frameIdx];
    placePatch(patch2, img, rect, frame.shieldHand, wp ? wp.patch.r : 0, mirrored,
        !!(loadout.mode === '2h' && wp && wp.patch.on));
}

// Debounce burst notifications (frame swap + style writes land together).
const pendingImgs = new Set();
let rafId = 0;
function scheduleSync(img) {
    pendingImgs.add(img);
    if (rafId) return;
    const raf = (img.ownerDocument.defaultView && img.ownerDocument.defaultView.requestAnimationFrame)
        || (typeof requestAnimationFrame === 'function' ? requestAnimationFrame : null);
    if (!raf) { pendingImgs.forEach((im) => syncImg(im)); pendingImgs.clear(); return; }
    rafId = raf(() => {
        rafId = 0;
        for (const im of pendingImgs) syncImg(im);
        pendingImgs.clear();
    });
}

//------------------------------------------------------------------------
// Loop wiring
//------------------------------------------------------------------------

let pollTimer = null;

function sweep() {
    for (const id of SPRITE_IMG_IDS) {
        const img = document.getElementById(id);
        if (img) syncImg(img);
    }
}

function startGearOverlays() {
    if (pollTimer) return;
    sweep();
    pollTimer = setInterval(sweep, POLL_MS);
    window.addEventListener('resize', sweep);
    document.addEventListener('eg-art-loaded', sweep);
}

// Test/teardown hook.
function stopGearOverlays() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    try { window.removeEventListener('resize', sweep); } catch (e) { /* noop */ }
    try { document.removeEventListener('eg-art-loaded', sweep); } catch (e) { /* noop */ }
}

// Module scripts are deferred — the DOM is parsed when this runs. Boot
// immediately; the sweep is a no-op until a sprite img exists.
startGearOverlays();

// Exported for the test suite and future consumers (the game itself only
// uses this module's side effects).
export { sweep as gearOverlaysSweep, parseAnimSrc as _parseAnimSrc, framesFor as _framesFor, readLoadout as _readLoadout, stopGearOverlays, isMirrored as _isMirrored, SPRITE_IMG_IDS as _SPRITE_IMG_IDS };
