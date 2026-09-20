//------------------------------------------------------------------------
// GRIP RENDER — shared, DOM-free placement logic for weapon/shield gear
//------------------------------------------------------------------------
// ONE source of truth used by three consumers:
//   - the grip lab (dev/scratch/grip-lab/lab.js) — imported as a module
//   - the game runtime (js/sprite/gear_overlays.js)
//   - the export/validator (tools/build-grip-data.mjs, runs in Node)
//
// What lives here:
//   - the data-model v2 semantics: category defaults (D1), resolution
//     chain item → category → global, per-item pose stash, flipX (F2),
//     squash sx (F3), tint (F4), hand-patch config (F1)
//   - body-side defaults (layers / hand anchors / rot) shared with the lab
//   - mirrored-set fallback: when a direction has no authored data but the
//     opposite does, resolve against the opposite set and mirror the
//     RESULT (x → 1−x, rot → −rot, layers swapped, flipX toggled) — the
//     game plays flipped right-art for missing left art (G3)
//   - pure placement math: resolvePlacement() → everything a renderer
//     needs to draw one slot (position, size, transform, tint, patch)
//
// No DOM access in here — consumers translate the returned numbers into
// CSS (lab + game) or canvas ops. All coordinates are normalized 0..1 to
// the body frame image box and the item image box respectively.
//
// Data model v2 (dev grips.json; the game loads the resolved export):
//   version: 2,
//   handedness: { <char>: 'right' | 'left' },
//   items: { <id>: { ...only OVERRIDES (B7): handle, scale, rot, axis,
//                    flipX, bbox:[x0,y0,x1,y1], nat:[w,h], tuned:true } },
//   sprites: { '<char>|<class>': { '<state>:<dir>': { frames: [{
//       img, weaponHand, shieldHand,
//       weapon|shield: { layer, rot, scale, flipX, sx, tint, patch:{on,r} },
//       poses: { <itemId>: { rot, scale, flipX, sx } }   // per-item stash
//   } } } } }
//------------------------------------------------------------------------

export const GRIP_DATA_VERSION = 2;

//------------------------------------------------------------------------
// Categories (D1): defaults keyed by id pattern. Order matters — first
// match wins. Consumers persist only overrides; these values fill the rest.
// handle: grip point inside the item image (0..1) · scale: VISIBLE item
// width as a fraction of the body sprite width (bbox-aware, see
// resolveItemMeta) · axis: handle→tip direction in image space, used by
// the two-handed aim solver (F5).
//------------------------------------------------------------------------

export const ITEM_CATEGORIES = [
    // Visual categories only — two-handed-ness is per-TIER in the game
    // (early battle blades are 2H, later ones 1H), so it must come from the
    // game's own tables (EG_BASE_TYPES_WEAPON.hands), never from a pattern.
    { id: 'blade', re: /_battle_blade_/, role: 'weapon',
      handle: [0.5, 0.85], scale: 0.5, axis: [0.5, 0.12] },
    { id: '2h', re: /^(wpn_2h_|wpn_int_)/, role: 'weapon',
      handle: [0.5, 0.85], scale: 0.62, axis: [0.5, 0.12] },
    { id: 'fang', re: /_swift_fang_/, role: 'weapon',
      handle: [0.5, 0.85], scale: 0.42, axis: [0.5, 0.15] },
    { id: 'rod', re: /_arcane_rod_/, role: 'weapon',
      handle: [0.5, 0.85], scale: 0.5, axis: [0.5, 0.1] },
    { id: '1h', re: /^wpn_1h_/, role: 'weapon',
      handle: [0.5, 0.85], scale: 0.5, axis: [0.5, 0.12] },
    // bows: front art held in one hand, arrow aside — keep visible scale
    // modest like the 1h family until tuned
    { id: 'ranged', re: /^ranged_/, role: 'weapon',
      handle: [0.5, 0.6], scale: 0.55, axis: [0.5, 0.15] },
    { id: 'shield', re: /^shield_/, role: 'shield',
      handle: [0.5, 0.5], scale: 0.55, axis: [0.5, 0.5] },
];

export function categoryForId(id) {
    const s = String(id || '');
    for (const c of ITEM_CATEGORIES) {
        if (c.re.test(s)) return c;
    }
    return { id: 'misc', re: null, role: /^shield/.test(s) ? 'shield' : 'weapon',
        handle: [0.5, 0.85], scale: 0.5, axis: [0.5, 0.12] };
}

// Two-handed detection for ids without an item object (lab lists, export
// validation). The authoritative list comes from the game data via
// build-grip-data.mjs and travels in the export as `twoHandedIds` — this
// pattern check is the fallback so the runtime still works standalone.
export function looksTwoHanded(id) {
    return categoryForId(id).id === '2h';
}

//------------------------------------------------------------------------
// Item meta resolution (D1 + D2): item override → category default.
// bbox (trimmed alpha box, 0..1, measured by the lab) refines the VISIBLE
// size: `scale` means visible width / sprite width, so equal scale values
// give equal visible sizes regardless of transparent margins.
//------------------------------------------------------------------------

export function resolveItemMeta(data, id) {
    const cat = categoryForId(id);
    const ov = (data && data.items && data.items[id]) || {};
    const bbox = Array.isArray(ov.bbox) && ov.bbox.length === 4 ? ov.bbox : [0, 0, 1, 1];
    const bw = Math.max(0.05, bbox[2] - bbox[0]);
    const bh = Math.max(0.05, bbox[3] - bbox[1]);
    // stored scale is VISIBLE-width based; the drawn image box must be
    // blown up by the trim factors so the visible part hits the target.
    const fullScale = (typeof ov.scale === 'number' ? ov.scale : cat.scale) / bw;
    return {
        id,
        role: ov.role || cat.role,
        category: cat.id,
        handle: Array.isArray(ov.handle) ? ov.handle.slice() : cat.handle.slice(),
        scale: fullScale,
        visibleScale: typeof ov.scale === 'number' ? ov.scale : cat.scale,
        rot: typeof ov.rot === 'number' ? ov.rot : (cat.rot || 0),
        axis: Array.isArray(ov.axis) ? ov.axis.slice() : (cat.axis || [0.5, 0.5]).slice(),
        flipX: !!ov.flipX,
        bbox,
        bboxW: bw,
        bboxH: bh,
        nat: Array.isArray(ov.nat) ? ov.nat.slice() : null,
        tuned: !!ov.tuned,
    };
}

//------------------------------------------------------------------------
// Body-side defaults (shared with the legacy lab behavior; B11 fixed:
// the facing-right comment now matches defaultLayers, and rot respects
// handedness).
//------------------------------------------------------------------------

export function defaultLayers(dir, handed) {
    if (dir === 'up') return { weapon: 'back', shield: 'back' };
    if (!dir || dir === 'down') return { weapon: 'front', shield: 'front' };
    // side view: the weapon-hand side of the body faces the viewer, so the
    // weapon renders in front and the off-hand item behind it.
    const weaponNear = (dir === 'right') === (handed === 'right');
    return weaponNear
        ? { weapon: 'front', shield: 'back' }
        : { weapon: 'back', shield: 'front' };
}

export function defaultHands(dir, handed) {
    const right = handed === 'right';
    if (!dir || dir === 'down') {
        return right
            ? { weaponHand: [0.34, 0.48], shieldHand: [0.66, 0.50] }
            : { weaponHand: [0.66, 0.48], shieldHand: [0.34, 0.50] };
    }
    if (dir === 'up') {
        return right
            ? { weaponHand: [0.68, 0.50], shieldHand: [0.32, 0.48] }
            : { weaponHand: [0.32, 0.50], shieldHand: [0.68, 0.48] };
    }
    if (dir === 'right') {
        // facing right: the weapon hand is the NEAR arm for a right-handed
        // character (defaultLayers above puts the weapon in front).
        return right
            ? { weaponHand: [0.62, 0.46], shieldHand: [0.40, 0.50] }
            : { weaponHand: [0.40, 0.46], shieldHand: [0.62, 0.50] };
    }
    // facing left: mirror image of facing right
    return right
        ? { weaponHand: [0.38, 0.46], shieldHand: [0.60, 0.50] }
        : { weaponHand: [0.60, 0.46], shieldHand: [0.38, 0.50] };
}

export function defaultRot(dir, role, handed) {
    const right = (handed || 'right') === 'right';
    if (role === 'shield') {
        if (dir === 'right') return right ? 6 : -6;
        if (dir === 'left') return right ? -6 : 6;
        return 0;
    }
    // side views: blade tips up-forward on the weapon side; a left-handed
    // character mirrors the pose (B11).
    let sign = 0;
    if (dir === 'right') sign = -1;
    else if (dir === 'left') sign = 1;
    if (sign === 0) return 0;
    return right ? sign * 30 : -sign * 30;
}

export function setDir(setKey) {
    const i = String(setKey || '').indexOf(':');
    return i === -1 ? null : String(setKey).slice(i + 1);
}

export function setState(setKey) {
    const i = String(setKey || '').indexOf(':');
    return i === -1 ? String(setKey || '') : String(setKey).slice(0, i);
}

//------------------------------------------------------------------------
// Mirroring (B8 / G3): produce the mirrored equivalent of a frame's
// placement values. With flipX the layer swap + rot negation alone are
// NOT enough for asymmetric items — the item image must flip too.
//------------------------------------------------------------------------

export function mirrorPoint(p) { return [1 - p[0], p[1]]; }

export function mirrorSlotCfg(cfg) {
    const c = cfg || {};
    return {
        ...c,
        rot: -wrapDeg(c.rot || 0),
        layer: c.layer === 'back' ? 'front' : 'back',
        flipX: !c.flipX,
    };
}

export function mirrorFrame(frame) {
    return {
        ...frame,
        weaponHand: mirrorPoint(frame.weaponHand),
        shieldHand: mirrorPoint(frame.shieldHand),
        weapon: mirrorSlotCfg(frame.weapon),
        shield: mirrorSlotCfg(frame.shield),
    };
}

export function wrapDeg(r) {
    return ((r + 180) % 360 + 360) % 360 - 180;
}

//------------------------------------------------------------------------
// Sprite/frame resolution with the class-inheritance chain (D3) and the
// mirrored-set fallback (G3).
//
//   data.sprites keys are '<char>|<class>'; lookup order:
//     char|class → char|noclass → _default
//   Within a set, frames match by index (B6 — never by img string; art
//   renames must not wipe tuning).
//
// resolveFrames(data, { char, cls, set }) → { frames, mirrored: bool, fromSet }
//   mirrored=true means the returned frames are the OPPOSITE direction's
//   data and every placement must be run through mirrorFrame semantics
//   (resolvePlacement does that via the mirrored flag).
//------------------------------------------------------------------------

const spriteChainCache = new Map();

export function spriteChain(char, cls) {
    const key = char + '|' + cls;
    let chain = spriteChainCache.get(key);
    if (!chain) {
        chain = [key];
        if (cls && cls !== 'noclass') chain.push(char + '|noclass');
        chain.push('_default');
        spriteChainCache.set(key, chain);
    }
    return chain;
}

export function resolveFrames(data, req) {
    const sprites = (data && data.sprites) || {};
    const dir = setDir(req.set);
    const opp = { up: 'down', down: 'up', left: 'right', right: 'left' }[dir];
    const trySets = [req.set];
    if (opp && req.allowMirror !== false) trySets.push(setState(req.set) + ':' + opp);

    for (const setKey of trySets) {
        for (const sk of spriteChain(req.char, req.cls)) {
            const set = sprites[sk] && sprites[sk][setKey];
            if (set && Array.isArray(set.frames) && set.frames.length) {
                return { frames: set.frames, mirrored: setKey !== req.set, fromSet: setKey };
            }
        }
    }
    return null;
}

// Frame for a given walk index: exact index when it exists, else modulo
// (idle sets have 1 frame; a 4-frame walk resolves fine against a 3-frame
// authored set by wrapping).
export function frameAt(frames, idx) {
    if (!frames || !frames.length) return null;
    return frames[((idx % frames.length) + frames.length) % frames.length];
}

//------------------------------------------------------------------------
// resolvePlacement — the one true placement function.
//
// req = {
//   data, char, cls, set, frameIdx,
//   slot: 'weapon' | 'off',
//   itemId,                      // equipped item base id
//   twoHanded: bool,             // main weapon occupies both hands
//   offRole: 'shield'|'weapon'|null,
//   nat: [w, h],                 // body frame natural size (for aspect)
//   bodyAspect: h/w,             // for item height fraction math
// }
//
// returns {
//   hand: [x, y], rot, scale (visible width / sprite width), flipX, sx,
//   tint, layer: 'front'|'back', patch: { on, r }, mirrored,
//   mirroredSet: bool, item: resolvedMeta
// } or null when nothing should draw (2H off-hand, no item, no frame).
//------------------------------------------------------------------------

export function resolvePlacement(req) {
    const { data, slot, itemId } = req;
    if (!itemId) return null;

    const dir = setDir(req.set);
    const handed = (data && data.handedness && data.handedness[req.char]) || 'right';

    // two-handed rule: the off-hand never draws while a 2H weapon is out
    if (slot === 'off' && req.twoHanded) return null;

    const res = resolveFrames(data, req);
    if (!res) return null;
    const frame = frameAt(res.frames, req.frameIdx);
    if (!frame) return null;

    const handKey = slot === 'weapon' ? 'weaponHand' : 'shieldHand';
    const cfgKey = slot === 'weapon' ? 'weapon' : 'shield';
    const cfg = frame[cfgKey] || {};
    const pose = (frame.poses && frame.poses[itemId]) || {};
    const item = resolveItemMeta(data, itemId);
    const role = slot === 'off' ? (req.offRole || 'shield') : 'weapon';

    // ---- resolution chain: pose (per-item edit) → frame cfg → defaults
    const rotSrc = typeof pose.rot === 'number' ? pose.rot
        : (typeof cfg.rot === 'number' ? cfg.rot : defaultRot(dir, role, handed));
    const scaleSrc = typeof pose.scale === 'number' ? pose.scale
        : (typeof cfg.scale === 'number' ? cfg.scale : item.visibleScale);
    const flipSrc = typeof pose.flipX === 'boolean' ? pose.flipX
        : (typeof cfg.flipX === 'boolean' ? cfg.flipX : item.flipX);
    const sxSrc = typeof pose.sx === 'number' ? pose.sx
        : (typeof cfg.sx === 'number' ? cfg.sx : 1);

    let layer = cfg.layer || defaultLayers(dir, handed)[cfgKey];
    let rot = rotSrc;
    let flipX = flipSrc;

    // mirrored-set fallback: the whole placement mirrors in screen space
    if (res.mirrored) {
        rot = -wrapDeg(rot);
        layer = layer === 'back' ? 'front' : 'back';
        flipX = !flipX;
    }

    // tint (F4): explicit value, else auto-darken what sits behind the body
    let tint = typeof pose.tint === 'number' ? pose.tint
        : (typeof cfg.tint === 'number' ? cfg.tint : null);
    if (tint === null) tint = (layer === 'back' || dir === 'up') ? 0.65 : 1;

    // hand patch (F1): only front-layer items get the fist overlay
    const patchCfg = cfg.patch || {};
    const patchOn = typeof pose.patchOn === 'boolean' ? pose.patchOn
        : (typeof patchCfg.on === 'boolean' ? patchCfg.on : layer === 'front');
    const patchR = typeof patchCfg.r === 'number' ? patchCfg.r : 0.045;

    // the weapon ALWAYS grips at its own hand anchor; the second fist of a
    // two-hander is a patch at shieldHand handled by the renderer (F5)
    const hand = frame[handKey];
    if (!hand) return null;

    return {
        hand: hand.slice(),
        rot,
        scale: scaleSrc,
        flipX: !!flipX,
        sx: Math.min(1, Math.max(0.2, sxSrc)),
        tint,
        layer,
        patch: { on: !!patchOn && layer === 'front', r: patchR },
        mirrored: !!res.mirrored,
        fromSet: res.fromSet,
        item,
        dir,
    };
}

//------------------------------------------------------------------------
// Pure geometry: where does the item image go inside the body box?
// Body box is w×h px (already zoomed). Returns CSS-ready numbers.
// transform order (CSS applies right-to-left): rotate first, then the
// screen-space squash/mirror around the grip point — matching the brief's
// `scaleX(sx) rotate(rot)` with transform-origin at the grip.
//------------------------------------------------------------------------

export function placeItem(placement, boxW, boxH) {
    const item = placement.item;
    const natW = item.nat ? item.nat[0] : 1;
    const natH = item.nat ? item.nat[1] : 1;
    const itemW = boxW * placement.scale;              // VISIBLE width
    const fullW = itemW / item.bboxW;                  // drawn image width
    const fullH = fullW * (natH / natW || 1);
    const gripX = item.handle[0] * fullW;
    const gripY = item.handle[1] * fullH;
    return {
        width: fullW,
        height: fullH,
        left: placement.hand[0] * boxW - gripX,
        top: placement.hand[1] * boxH - gripY,
        transformOrigin: (item.handle[0] * 100) + '% ' + (item.handle[1] * 100) + '%',
        transform: 'scaleX(' + (placement.sx * (placement.flipX ? -1 : 1)).toFixed(4)
            + ') rotate(' + placement.rot.toFixed(2) + 'deg)',
        filter: placement.tint !== 1 ? 'brightness(' + placement.tint + ')' : '',
    };
}

//------------------------------------------------------------------------
// Two-handed aim solver (F5): rot that points the item's axis (handle→tip)
// from the main hand anchor at the off-hand anchor. Screen space, y down.
// Returns degrees for cfg.rot (null when the hands coincide).
//------------------------------------------------------------------------

export function solveTwoHandRot(itemMeta, handA, handB, bodyAspect) {
    const ax = (itemMeta.axis[0] - itemMeta.handle[0]);
    const ay = (itemMeta.axis[1] - itemMeta.handle[1]) * (bodyAspect || 2);
    const axisAngle = Math.atan2(ay, ax) * 180 / Math.PI;
    const bx = (handB[0] - handA[0]);
    const by = (handB[1] - handA[1]) * (bodyAspect || 2);
    if (Math.abs(bx) < 1e-6 && Math.abs(by) < 1e-6) return null;
    const targetAngle = Math.atan2(by, bx) * 180 / Math.PI;
    return wrapDeg(targetAngle - axisAngle);
}
