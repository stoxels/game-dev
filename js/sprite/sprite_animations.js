//------------------------------------------------------------------------
//-------------------SPRITE ANIMATIONS-------------------------------------
//------------------------------------------------------------------------
// Central home for all sprite-frame animation data and playback logic:
//   - Walk cycles (per character, per class/ascendency state)
//   - Combat / puzzle-skill animations (per character, per ascendency, per skill)
//
// player_sprite.js stays responsible for *where* the avatar sits and how
// it's dragged/positioned. This file is responsible for *what frames play
// on the sprite image* and *when*.
//
// Expected filename convention (place in animations/<Char>/):
//   <Char>_<state>_<animKey>_<frameIndex>.png
// e.g. animations/Trix/abilities/Trix_random_walker_swing_1.webp
// (legacy flat files directly under walk/ and abilities/ keep working;
// see ANIMATION CATALOG below for the canonical nested layout, e.g.
// animations/Trix/abilities/random_walker/brownian/Trix_random_walker_brownian_1.png)
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//-------------------GENERIC FRAME-SEQUENCE RUNNER-------------------------
//------------------------------------------------------------------------

// Plays an ordered list of frame sources on a target <img>, each frame
// shown at the given offset (ms from animation start), then restores
// idleSrc once the sequence finishes (after idleDelayMs).
//
// imgElementId : id of the <img> element to animate
// frames       : array of image src strings, in playback order
// timings      : array of ms offsets, same length as frames (frames[i]
//                shows at timings[i] ms after call)
// idleSrc      : src to restore once the animation completes
// idleDelayMs  : ms after the last frame before restoring idleSrc
// onComplete   : optional callback fired when idleSrc is restored
//
// Returns nothing; all scheduling is done via setTimeout against the
// element id (re-queried each frame) so it's safe even if the element
// is briefly replaced/re-rendered mid-animation.
function _playSpriteAnimation(imgElementId, frames, timings, idleSrc, idleDelayMs, onComplete) {
    if (!frames || frames.length === 0) return;
    if (!timings || timings.length !== frames.length) {
        console.warn(`_playSpriteAnimation: timings length mismatch for ${imgElementId}`);
        return;
    }

    const el = document.getElementById(imgElementId);
    if (!el) return;

    frames.forEach((src, i) => {
        setTimeout(() => {
            const frameEl = document.getElementById(imgElementId);
            if (frameEl) frameEl.src = src;
        }, timings[i]);
    });

    const lastTiming = timings[timings.length - 1];
    setTimeout(() => {
        const finalEl = document.getElementById(imgElementId);
        if (finalEl) finalEl.src = idleSrc;
        if (onComplete) onComplete();
    }, lastTiming + idleDelayMs);
}


//------------------------------------------------------------------------
//-------------------WALK CYCLE FRAME REGISTRY-----------------------------
//------------------------------------------------------------------------
// Keyed by character -> state (noclass / base class / ascendency) -> frames.
// Populate as walk-cycle art is added for each of the 3 characters x 10
// sprite states (no class, 3 base classes, 6 ascendencies).

// PLACEHOLDER FILENAMES — swap these for real walk-cycle art per
// character/state. Order matters: frame 1 = contact (left foot forward),
// frame 2 = passing (mid-stride), frame 3 = contact (right foot forward).
// Playback wraps through these in time order (1,2,3,1,2,3,...) — see
// _advanceWalkFrameIndex() below. Pick frames as a closed loop so the
// last frame flows back into the first.
const _WALK_FRAMES = {
    stox: {
        noclass: [
            'animations/Stox/walk/Stox_noclass_walk_1.webp', // contact: left foot forward
            'animations/Stox/walk/Stox_noclass_walk_2.webp', // passing: mid-stride
            'animations/Stox/walk/Stox_noclass_walk_3.webp', // contact: right foot forward
        ],
        statistician: [
            'animations/Stox/walk/Stox_statistician_walk_1.webp', // contact: left foot forward
            'animations/Stox/walk/Stox_statistician_walk_2.webp', // passing: mid-stride
            'animations/Stox/walk/Stox_statistician_walk_3.webp', // contact: right foot forward
        ],
        outlier: [
            'animations/Stox/walk/Stox_outlier_walk_1.webp', // contact: left foot forward
            'animations/Stox/walk/Stox_outlier_walk_2.webp', // passing: mid-stride
            'animations/Stox/walk/Stox_outlier_walk_3.webp', // contact: right foot forward
        ],
        actuary: [
            'animations/Stox/walk/Stox_actuary_walk_1.webp', // contact: left foot forward
            'animations/Stox/walk/Stox_actuary_walk_2.webp', // passing: mid-stride
        ],
        mathmagician: [
            'animations/Stox/walk/Stox_mathmagician_walk_1.webp', // contact: left foot forward
            'animations/Stox/walk/Stox_mathmagician_walk_2.webp', // passing: mid-stride
            'animations/Stox/walk/Stox_mathmagician_walk_3.webp', // contact: right foot forward
        ],
        recursionist: [
            'animations/Stox/walk/Stox_recursionist_walk_1.webp', // contact: left foot forward
            'animations/Stox/walk/Stox_recursionist_walk_2.webp', // passing: mid-stride
        ],
        markovian: [
            'animations/Stox/walk/Stox_markovian_walk_1.webp', // contact: left foot forward
            'animations/Stox/walk/Stox_markovian_walk_2.webp', // passing: mid-stride
        ],
        probabilist: [
            'animations/Stox/walk/Stox_probabilist_walk_1.webp', // contact: left foot forward
            'animations/Stox/walk/Stox_probabilist_walk_2.webp', // passing: mid-stride
            'animations/Stox/walk/Stox_probabilist_walk_3.webp', // contact: right foot forward
        ],
        bayesian: [
            'animations/Stox/walk/Stox_bayesian_walk_1.webp', // contact: left foot forward
            'animations/Stox/walk/Stox_bayesian_walk_2.webp', // passing: mid-stride
            'animations/Stox/walk/Stox_bayesian_walk_3.webp', // contact: right foot forward
        ],
        random_walker: [
            'animations/Stox/walk/Stox_random_walker_walk_1.webp', // contact: left foot forward
            'animations/Stox/walk/Stox_random_walker_walk_2.webp', // passing: mid-stride
            'animations/Stox/walk/Stox_random_walker_walk_3.webp', // contact: right foot forward
        ],


    },


    trix: {
        noclass: [
            'animations/Trix/walk/Trix_noclass_walk_1.webp', // contact: left foot forward
            'animations/Trix/walk/Trix_noclass_walk_2.webp', // passing: mid-stride
            'animations/Trix/walk/Trix_noclass_walk_3.webp', // contact: right foot forward
        ],
        statistician: [
            'animations/Trix/walk/Trix_statistician_walk_1.webp', // contact: left foot forward
            'animations/Trix/walk/Trix_statistician_walk_2.webp', // passing: mid-stride
        ],
        outlier: [
            'animations/Trix/walk/Trix_outlier_walk_1.webp', // contact: left foot forward
            'animations/Trix/walk/Trix_outlier_walk_2.webp', // passing: mid-stride
            'animations/Trix/walk/Trix_outlier_walk_3.webp', // contact: right foot forward
        ],
        actuary: [
            'animations/Trix/walk/Trix_actuary_walk_1.webp', // contact: left foot forward
            'animations/Trix/walk/Trix_actuary_walk_2.webp', // passing: mid-stride
            'animations/Trix/walk/Trix_actuary_walk_3.webp', // contact: right foot forward
        ],
        mathmagician: [
            'animations/Trix/walk/Trix_mathmagician_walk_1.webp', // contact: left foot forward
            'animations/Trix/walk/Trix_mathmagician_walk_2.webp', // passing: mid-stride
        ],
        recursionist: [
            'animations/Trix/walk/Trix_recursionist_walk_1.webp', // contact: left foot forward
            'animations/Trix/walk/Trix_recursionist_walk_2.webp', // passing: mid-stride
            'animations/Trix/walk/Trix_recursionist_walk_3.webp', // contact: right foot forward
        ],
        markovian: [
            'animations/Trix/walk/Trix_markovian_walk_1.webp', // contact: left foot forward
            'animations/Trix/walk/Trix_markovian_walk_2.webp', // passing: mid-stride
            'animations/Trix/walk/Trix_markovian_walk_3.webp', // contact: right foot forward
        ],
        probabilist: [
            'animations/Trix/walk/Trix_probabilist_walk_1.webp', // contact: left foot forward
            'animations/Trix/walk/Trix_probabilist_walk_2.webp', // passing: mid-stride
            'animations/Trix/walk/Trix_probabilist_walk_3.webp', // contact: right foot forward
        ],
        bayesian: [
            'animations/Trix/walk/Trix_bayesian_walk_1.webp', // contact: left foot forward
            'animations/Trix/walk/Trix_bayesian_walk_2.webp', // passing: mid-stride
            'animations/Trix/walk/Trix_bayesian_walk_3.webp', // contact: right foot forward
        ],
        random_walker: [
            'animations/Trix/walk/Trix_random_walker_walk_1.webp', // contact: left foot forward
            'animations/Trix/walk/Trix_random_walker_walk_2.webp', // passing: mid-stride
            'animations/Trix/walk/Trix_random_walker_walk_3.webp', // contact: right foot forward
        ],
    },

    syla: {
        noclass: [
            'animations/Syla/walk/Syla_noclass_walk_1.webp', // contact: left foot forward
            'animations/Syla/walk/Syla_noclass_walk_2.webp', // passing: mid-stride
            'animations/Syla/walk/Syla_noclass_walk_3.webp', // contact: right foot forward
        ],
        statistician: [
            'animations/Syla/walk/Syla_statistician_walk_1.webp', // contact: left foot forward
            'animations/Syla/walk/Syla_statistician_walk_2.webp', // passing: mid-stride
        ],
        outlier: [
            'animations/Syla/walk/Syla_outlier_walk_1.webp', // contact: left foot forward
            'animations/Syla/walk/Syla_outlier_walk_2.webp', // passing: mid-stride
        ],
        actuary: [
            'animations/Syla/walk/Syla_actuary_walk_1.webp', // contact: left foot forward
            'animations/Syla/walk/Syla_actuary_walk_2.webp', // passing: mid-stride
            'animations/Syla/walk/Syla_actuary_walk_3.webp', // contact: right foot forward
        ],
        mathmagician: [
            'animations/Syla/walk/Syla_mathmagician_walk_1.webp', // contact: left foot forward
            'animations/Syla/walk/Syla_mathmagician_walk_2.webp', // passing: mid-stride
            'animations/Syla/walk/Syla_mathmagician_walk_3.webp', // contact: right foot forward
        ],
        recursionist: [
            'animations/Syla/walk/Syla_recursionist_walk_1.webp', // contact: left foot forward
            'animations/Syla/walk/Syla_recursionist_walk_2.webp', // passing: mid-stride
            'animations/Syla/walk/Syla_recursionist_walk_3.webp', // contact: right foot forward
        ],
        markovian: [
            'animations/Syla/walk/Syla_markovian_walk_1.webp', // contact: left foot forward
            'animations/Syla/walk/Syla_markovian_walk_2.webp', // passing: mid-stride
        ],
        probabilist: [
            'animations/Syla/walk/Syla_probabilist_walk_1.webp', // contact: left foot forward
            'animations/Syla/walk/Syla_probabilist_walk_2.webp', // passing: mid-stride
            'animations/Syla/walk/Syla_probabilist_walk_3.webp', // contact: right foot forward
        ],
        bayesian: [
            'animations/Syla/walk/Syla_bayesian_walk_1.webp', // contact: left foot forward
            'animations/Syla/walk/Syla_bayesian_walk_2.webp', // passing: mid-stride
            'animations/Syla/walk/Syla_bayesian_walk_3.webp', // contact: right foot forward
        ],
        random_walker: [
            'animations/Syla/walk/Syla_random_walker_walk_1.webp', // contact: left foot forward
            'animations/Syla/walk/Syla_random_walker_walk_2.webp', // passing: mid-stride
            'animations/Syla/walk/Syla_random_walker_walk_3.webp', // contact: right foot forward
        ],
    },

};

const _WALK_FRAME_INTERVAL_MS = 150; // ms between each walk frame while looping
const _WALK_IDLE_DEBOUNCE_MS = 180;  // ms of no movement before snapping back to idle

// Internal loop/debounce state. Keyed nothing — only one avatar walks at
// a time, so a single shared state object is fine.
const _walkState = {
    intervalId: null,
    frameIndex: 0,
    direction: 1, // legacy ping-pong stepper, unused since the walk loop wraps
    idleTimeoutId: null,
    imgElementId: null,
    dirName: null, // 'up' | 'down' | 'left' | 'right' | null (omni)
    frames: null,  // resolved frame list for the active loop
    usesDirectional: false, // true when frames are true directional art (never mirror)
};

// Advances _walkState.frameIndex by one step of a wrapping sequence
// across the given frame count. For a 4-frame set this produces the
// cycle: 0,1,2,3,0,1,2,3,0,... (each frame shows once per loop, in
// time order). Pick walk frames as a closed loop — the last frame
// must flow back into the first — otherwise the wrap point visibly
// "snaps" rather than stepping naturally.
function _advanceWalkFrameIndex(frameCount) {
    if (frameCount <= 1) return 0;

    return (_walkState.frameIndex + 1) % frameCount;
}

// Starts (or keeps alive) the looping walk animation on the current
// character's sprite. Safe to call on every movement tick — it only
// actually starts the interval once, and just resets the idle debounce
// on subsequent calls.
//
// direction is optional ('up' | 'down' | 'left' | 'right'). When
// directional frames were discovered for that direction they are used,
// otherwise the omnidirectional set plays. Draw walk frames facing
// right — the avatar flip in player_sprite.js mirrors them when needed.
function _startAvatarWalkAnimation(imgElementId = 'avatar-sprite-img-simple', direction = null) {
    const char = STATE?.playerCharacter;
    const asc = STATE?.playerAscendency || STATE?.playerClass || 'noclass';
    if (!char) return;

    // Remember facing so the sprite keeps looking its travel direction
    // once it stops (directional idle). Updated on every directed step.
    if (direction && ANIM_DIRECTIONS.indexOf(direction) !== -1) {
        try { _lastFacingDir = direction; } catch (e) { /* pre-init: ignore */ }
    }

    // Pause the idle loop while walking (no src restore — we take over below).
    if (typeof _stopAvatarIdleAnimation === 'function') _stopAvatarIdleAnimation(false);

    const frames = (typeof _animGetWalkFramesSync === 'function')
        ? _animGetWalkFramesSync(char, asc, direction)
        : (_WALK_FRAMES[char]?.[asc] || []);
    // True directional art is already drawn facing its travel direction and
    // must NEVER be mirrored. Omni fallback art is drawn facing right, so
    // leftward movement still needs the scaleX(-1) mirror (handled by the
    // _animShouldMirrorFor() helper consumed in player_sprite.js / map code).
    let usesDirectional = false;
    if (direction && ANIM_DIRECTIONS.indexOf(direction) !== -1) {
        const charCap = _animCharCap(char);
        const dk = `walk|${charCap}|${asc}|${direction}`;
        usesDirectional = !!(_animCache[dk] && _animCache[dk].length);
    }
    if (!frames || frames.length === 0) {
        // No walk art at all — hand back to idle (static portrait fallback).
        if (typeof _startAvatarIdleAnimation === 'function') _startAvatarIdleAnimation(imgElementId);
        return;
    }

    // Always cancel any pending "return to idle" — we're moving again.
    if (_walkState.idleTimeoutId) {
        clearTimeout(_walkState.idleTimeoutId);
        _walkState.idleTimeoutId = null;
    }

    // Loop already running for this element, frames and direction — nothing else to do.
    if (_walkState.intervalId && _walkState.imgElementId === imgElementId && _walkState.dirName === (direction || null)) return;

    // Switching elements, frames or direction — stop the old loop first.
    if (_walkState.intervalId) {
        clearInterval(_walkState.intervalId);
        _walkState.intervalId = null;
    }

    _walkState.imgElementId = imgElementId;
    _walkState.dirName = direction || null;
    _walkState.frames = frames;
    _walkState.usesDirectional = usesDirectional;
    _walkState.frameIndex = 0;
    _walkState.direction = 1;

    const el = document.getElementById(imgElementId);
    if (!el) return;
    el.src = frames[0];

    _walkState.intervalId = setInterval(() => {
        const frameEl = document.getElementById(imgElementId);
        const liveFrames = _walkState.frames || frames;
        if (!frameEl) return;
        _walkState.frameIndex = _advanceWalkFrameIndex(liveFrames.length);
        frameEl.src = liveFrames[_walkState.frameIndex];
    }, _WALK_FRAME_INTERVAL_MS);
}

// Call on every movement tick alongside _startAvatarWalkAnimation(). If no
// further movement happens within _WALK_IDLE_DEBOUNCE_MS, the loop stops
// and the sprite returns to its idle image. Re-arms on every call, so
// rapid tap-tap-tap movement keeps the walk cycle going smoothly.
function _scheduleAvatarWalkIdle() {
    if (_walkState.idleTimeoutId) clearTimeout(_walkState.idleTimeoutId);

    _walkState.idleTimeoutId = setTimeout(() => {
        _stopAvatarWalkAnimation();
    }, _WALK_IDLE_DEBOUNCE_MS);
}

// Immediately stops the walk loop and hands the sprite to the idle
// loop, keeping the last travel direction so the sprite stands facing
// where it was heading (directional idle art) instead of the portrait.
function _stopAvatarWalkAnimation() {
    const lastDir = _walkState.dirName;
    if (_walkState.intervalId) {
        clearInterval(_walkState.intervalId);
        _walkState.intervalId = null;
    }
    if (_walkState.idleTimeoutId) {
        clearTimeout(_walkState.idleTimeoutId);
        _walkState.idleTimeoutId = null;
    }

    _walkState.frameIndex = 0;
    _walkState.direction = 1;
    _walkState.dirName = null;
    _walkState.frames = null;
    _walkState.usesDirectional = false;

    const imgElementId = _walkState.imgElementId;
    _walkState.imgElementId = null;
    if (!imgElementId) return;

    if (typeof _startAvatarIdleAnimation === 'function') {
        _startAvatarIdleAnimation(imgElementId, lastDir);
        return;
    }
    const el = document.getElementById(imgElementId);
    const idleSrc = typeof _getPlayerCharacterImage === 'function'
        ? _getPlayerCharacterImage()
        : undefined;
    if (el && idleSrc) el.src = idleSrc;
}

// Single entry point movement code should call on every position change:
// starts the loop if needed and (re)arms the idle debounce.
// direction is optional ('up' | 'down' | 'left' | 'right').
function _playAvatarWalkAnimation(imgElementId, direction) {
    _startAvatarWalkAnimation(imgElementId, direction);
    _scheduleAvatarWalkIdle();
}


//------------------------------------------------------------------------
//-------------------SKILL ANIMATION FRAME REGISTRY-------------------------
//------------------------------------------------------------------------
// Keyed by character -> ascendency -> skillKey -> frames. Combat and
// puzzle-skill animations both live here, distinguished by skillKey.

const _SKILL_FRAMES = {
    trix: {
        random_walker: {
            swing: [
                'animations/Trix/abilities/Trix_random_walker_swing_1.webp',
                'animations/Trix/abilities/Trix_random_walker_swing_2.webp',
                'animations/Trix/abilities/Trix_random_walker_swing_3.webp',
            ],
        },
    },
};

// Per-skill timing config: ms offset for each frame, plus delay before
// returning to idle. Keyed the same way as _SKILL_FRAMES so each skill
// can have its own pacing.
const _SKILL_TIMINGS = {
    trix: {
        random_walker: {
            swing: {
                frameOffsets: [0, 500, 1000],
                idleDelay: 1000,
            },
        },
    },
};

// Plays the named skill animation for the current character/ascendency.
// Now a thin wrapper over the generic per-spell player below, so new
// per-spell folders under animations/<Char>/abilities/ are picked up
// without touching this function. Falls back to doing nothing (the
// static portrait keeps showing) if no frames are defined yet.
function _playAvatarSkillAnimation(skillKey, imgElementId) {
    if (typeof _playAvatarSkillAnimationGeneric === 'function') {
        const char = STATE?.playerCharacter;
        const asc = STATE?.playerAscendency || STATE?.playerClass || 'noclass';
        _playAvatarSkillAnimationGeneric(char, asc, skillKey, imgElementId);
        return;
    }
    const char = STATE?.playerCharacter;
    const asc = STATE?.playerAscendency;
    if (!char || !asc) return;

    const frames = _SKILL_FRAMES[char]?.[asc]?.[skillKey];
    const timingCfg = _SKILL_TIMINGS[char]?.[asc]?.[skillKey];
    if (!frames || frames.length === 0 || !timingCfg) return;

    const idleSrc = typeof _getPlayerCharacterImage === 'function'
        ? _getPlayerCharacterImage()
        : undefined;
    if (!idleSrc) return;

    _playSpriteAnimation(
        imgElementId || 'avatar-sprite-img-simple',
        frames,
        timingCfg.frameOffsets,
        idleSrc,
        timingCfg.idleDelay
    );
}

// Backwards-compatible wrapper: existing call sites use
// _playAvatarSwingAnimation() directly for Trix/random_walker's swing.
// Kept as a thin wrapper so player_sprite.js and any other callers don't
// need to change.
function _playAvatarSwingAnimation() {
    _playAvatarSkillAnimation('swing');
}


//------------------------------------------------------------------------
//-------------------ANIMATION CATALOG (animations/ folder)----------------
//------------------------------------------------------------------------
// Canonical on-disk layout for the new `animations/` main folder:
//
//   idle (looping, ping-pong):
//     animations/<Char>/idle/<variant>/<Char>_<variant>_idle_<N>.png
//   idle, per-direction override = gameplay standing pose (static):
//     animations/<Char>/idle/<variant>/<dir>/<Char>_<variant>_idle_<dir>_<N>.png
//     (played when movement stops; menus always use the static portrait)
//   movement, omnidirectional fallback (looping, wrap-around):
//     animations/<Char>/walk/<variant>/<Char>_<variant>_walk_<N>.png
//   movement, per-direction override (looping, wrap-around):
//     animations/<Char>/walk/<variant>/<dir>/<Char>_<variant>_walk_<dir>_<N>.png
//   combat, one spell each (played once, then back to idle):
//     animations/<Char>/abilities/<variant>/<spell>/<Char>_<variant>_<spell>_<N>.png
//   suggested future sets (same <variant> pattern, see hooks below):
//     animations/<Char>/hurt/<variant>/, defeat/<variant>/,
//     victory/<variant>/, emote/<variant>/, spawn/<variant>/
//
// <Char> is capitalized (Stox/Trix/Syla) to match the existing art,
// <variant> is noclass, a base class or an ascendency id (lowercase,
// e.g. random_walker), <dir> is up/down/left/right, <N> counts from 1
// with NO gaps — discovery stops at the first missing file, so any
// animation may hold anywhere from 1 to ANIM_MAX_FRAMES images.
//
// Spell folder names per variant (HUD slot in brackets):
//   statistician: data_strike [1], diagonal_strike [2]
//   mathmagician: arcane_reveal [1], absolute_zero [2]
//   probabilist:  precision_shot [1], rain_arrows [2]
//   outlier:      tail_risk [3], speedforce [4]
//   actuary:      regression [3], significance [4]
//   recursionist: residual [3], degrees_of_freedom [4]
//   markovian:    rollback [3], transition_matrix [4]
//   bayesian:     traps [3], type1_shield [4]
//   random_walker: brownian [3], drifter [4]  (legacy 'swing' art plays
//                for both until dedicated folders exist)
//   any variant:  heartbloom [5]  (also checked under
//                abilities/_shared/heartbloom/ so one shared set works
//                for all variants of a character)
//
// Resolution order everywhere: nested canonical → legacy flat files
// (animations/<Char>/walk/ and animations/<Char>/abilities/) → static
// character-class portrait from _getPlayerCharacterImage(). Missing art
// therefore never breaks anything: the regular portrait keeps showing.
//------------------------------------------------------------------------

const ANIM_BASE_PATH = 'animations';
// Upper bound probed per animation — raise if you ever need longer cuts.
const ANIM_MAX_FRAMES = 12;
const ANIM_DIRECTIONS = ['up', 'down', 'left', 'right'];
const ANIM_VARIANTS = ['noclass', 'statistician', 'mathmagician', 'probabilist', 'outlier', 'actuary', 'recursionist', 'markovian', 'bayesian', 'random_walker'];
const ANIM_IDLE_INTERVAL_MS = 450;   // ms between idle frames (ping-pong loop)
const ANIM_SKILL_FRAME_MS = 120;     // default pacing for one-shot spell anims
const ANIM_SKILL_IDLE_DELAY_MS = 400;// ms on the last spell frame before idle resumes

// key -> frames[] (empty array = checked, nothing on disk). Warmed
// fire-and-forget so gameplay never blocks on file probing.
const _animCache = {};
const _animWarmStarted = {};

// Capitalizes the character id to match folder/file casing (stox -> Stox).
function _animCharCap(char) {
    if (!char) return null;
    return char.charAt(0).toUpperCase() + char.slice(1);
}

// Ascendency wins over base class, mirroring _getPlayerCharacterImage().
function _animVariant() {
    if (typeof STATE === 'undefined' || !STATE) return 'noclass';
    return STATE.playerAscendency || STATE.playerClass || 'noclass';
}

// Which avatar <img> should animate right now? Only one of the two
// avatars exists at a time (simple vs. full endgame avatar).
function _animTargetImgId(preferred) {
    if (typeof document === 'undefined') return preferred || null;
    if (preferred && document.getElementById(preferred)) return preferred;
    if (document.getElementById('avatar-sprite-img-simple')) return 'avatar-sprite-img-simple';
    if (document.getElementById('avatar-sprite-img')) return 'avatar-sprite-img';
    return null;
}

// Probes one file without adding it to the DOM.
function _animProbe(src) {
    return new Promise((resolve) => {
        try {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = src;
        } catch (e) {
            resolve(false);
        }
    });
}

// Collects <dir>/<prefix>_1.png, _2.png, ... stopping at the first gap.
async function _animDiscoverFrames(dir, prefix) {
    const frames = [];
    for (let i = 1; i <= ANIM_MAX_FRAMES; i++) {
        const src = `${dir}/${prefix}_${i}.webp`;
        let ok = false;
        try {
            ok = await _animProbe(src);
        } catch (e) {
            ok = false;
        }
        if (!ok) break;
        frames.push(src);
    }
    return frames;
}

// Warms idle + walk caches for a character/variant in the background.
// Abilities are warmed on demand at cast time instead (18 spells x up to
// 12 probes would be wasteful up front).
function _animWarmCacheFor(char, variant) {
    if (!char || !variant) return;
    const charCap = _animCharCap(char);
    if (!charCap) return;
    const jobs = [];
    jobs.push([`idle|${charCap}|${variant}`, `${ANIM_BASE_PATH}/${charCap}/idle/${variant}`, `${charCap}_${variant}_idle`]);
    for (const d of ANIM_DIRECTIONS) {
        jobs.push([`idle|${charCap}|${variant}|${d}`, `${ANIM_BASE_PATH}/${charCap}/idle/${variant}/${d}`, `${charCap}_${variant}_idle_${d}`]);
    }
    jobs.push([`walk|${charCap}|${variant}|`, `${ANIM_BASE_PATH}/${charCap}/walk/${variant}`, `${charCap}_${variant}_walk`]);
    for (const d of ANIM_DIRECTIONS) {
        jobs.push([`walk|${charCap}|${variant}|${d}`, `${ANIM_BASE_PATH}/${charCap}/walk/${variant}/${d}`, `${charCap}_${variant}_walk_${d}`]);
    }
    for (const [key, dir, prefix] of jobs) {
        if (_animWarmStarted[key]) continue;
        _animWarmStarted[key] = true;
        _animDiscoverFrames(dir, prefix).then(
            (frames) => { _animCache[key] = frames; },
            () => { _animCache[key] = []; }
        );
    }
}

// Drops cached entries for a character/variant so freshly added art is
// picked up (e.g. after class selection), then warms again.
function _animRefreshCacheFor(char, variant) {
    if (!char || !variant) return;
    const charCap = _animCharCap(char);
    if (!charCap) return;
    for (const k of Object.keys(_animWarmStarted)) {
        if (k.indexOf(`|${charCap}|`) !== -1) delete _animWarmStarted[k];
    }
    for (const k of Object.keys(_animCache)) {
        if (k.indexOf(`|${charCap}|`) !== -1) delete _animCache[k];
    }
    _animWarmCacheFor(char, variant);
}

// Sync walk-frame lookup: directional nested art (if already discovered)
// → omnidirectional nested art (if already discovered) → legacy
// _WALK_FRAMES table (covers all current flat files on day one).
function _animGetWalkFramesSync(char, variant, direction) {
    const charCap = _animCharCap(char);
    if (!charCap) return [];
    if (direction && ANIM_DIRECTIONS.indexOf(direction) !== -1) {
        const dk = `walk|${charCap}|${variant}|${direction}`;
        if (_animCache[dk] && _animCache[dk].length) return _animCache[dk];
    }
    const ok = `walk|${charCap}|${variant}|`;
    if (_animCache[ok] && _animCache[ok].length) return _animCache[ok];
    return (_WALK_FRAMES[char] && _WALK_FRAMES[char][variant]) || [];
}

// Sync idle-frame lookup: directional idle art (already discovered) ->
// omnidirectional idle art (already discovered). Empty when neither exists,
// and callers fall back to the static portrait. Menus always use the static
// portrait via _getPlayerCharacterImage() directly and never call this.
function _animGetIdleFramesSync(char, variant, direction) {
    const charCap = _animCharCap(char);
    if (!charCap) return [];
    if (direction && ANIM_DIRECTIONS.indexOf(direction) !== -1) {
        const dk = `idle|${charCap}|${variant}|${direction}`;
        if (_animCache[dk] && _animCache[dk].length) return _animCache[dk];
    }
    return _animCache[`idle|${charCap}|${variant}`] || [];
}

// True when directional WALK art has already been discovered for this
// char/variant/dir. Directional art is drawn facing its travel direction,
// so callers must NOT mirror it (no scaleX(-1) / scale '-1 1'). Omni
// fallback art is drawn facing right and still needs the mirror for left.
function _animHasDirectionalWalkSync(char, variant, direction) {
    if (!direction || ANIM_DIRECTIONS.indexOf(direction) === -1) return false;
    const charCap = (typeof _animCharCap === 'function') ? _animCharCap(char) : null;
    if (!charCap || !variant) return false;
    const dk = `walk|${charCap}|${variant}|${direction}`;
    return !!(_animCache[dk] && _animCache[dk].length);
}

// Should the sprite <img> be mirrored for this movement direction?
// Returns false when directional art is active (never mirror — this is the
// Trix left/right swap fix), true only for the omni right-facing fallback
// moving left.
function _animShouldMirrorFor(char, variant, direction) {
    if (!direction) return false;
    if (_animHasDirectionalWalkSync(char, variant, direction)) return false;
    // Omni fallback faces right: mirror only when heading left.
    return direction === 'left';
}

// Whether the currently running walk loop (if any) uses true directional
// art for the given element. Lets facing helpers skip the mirror even when
// they don't know the char/variant (e.g. map sprites).
function _animWalkIsDirectionalFor(imgElementId) {
    if (!_walkState.intervalId) return false;
    if (imgElementId && _walkState.imgElementId && _walkState.imgElementId !== imgElementId) return false;
    return !!_walkState.usesDirectional;
}

// Cached down-facing frame for gameplay defaults (standing pose preferred):
// directional idle-down frame 1, else directional walk-down frame 1.
// Null when nothing directional has been discovered yet (cold cache).
function _animGetDownFallbackSrc(char, variant) {
    const charCap = (typeof _animCharCap === 'function') ? _animCharCap(char) : null;
    if (!charCap || !variant) return null;
    const idleDk = `idle|${charCap}|${variant}|down`;
    if (_animCache[idleDk] && _animCache[idleDk].length) return _animCache[idleDk][0];
    const walkDk = `walk|${charCap}|${variant}|down`;
    if (_animCache[walkDk] && _animCache[walkDk].length) return _animCache[walkDk][0];
    return null;
}

// Optimistic down-facing src for cold-cache first paint (before async
// discovery finishes). Points at the canonical idle-down frame 1, which the
// browser loads directly when the art exists. Callers chain onerror to the
// walk-down frame and finally the menu portrait, so variants without
// directional art still land on the portrait instead of a broken image.
function _animExpectedDownSrc(char, variant) {
    const charCap = (typeof _animCharCap === 'function') ? _animCharCap(char) : null;
    if (!charCap || !variant) return null;
    return `${ANIM_BASE_PATH}/${charCap}/idle/${variant}/down/${charCap}_${variant}_idle_down_1.webp`;
}

function _animExpectedWalkDownSrc(char, variant) {
    const charCap = (typeof _animCharCap === 'function') ? _animCharCap(char) : null;
    if (!charCap || !variant) return null;
    return `${ANIM_BASE_PATH}/${charCap}/walk/${variant}/down/${charCap}_${variant}_walk_down_1.webp`;
}

// Gameplay default image: move-down art, never the menu portrait.
// Prefers already-discovered down frames (instant, no 404), otherwise the
// optimistic idle-down path (with onerror chain handled by the caller via
// _animSetDefaultDownImage), otherwise the menu portrait.
function _getPlayerPuzzleDefaultImage() {
    const st = (typeof STATE !== 'undefined' && STATE) ? STATE : null;
    const char = st ? st.playerCharacter : null;
    const variant = (typeof _animVariant === 'function') ? _animVariant() : 'noclass';
    if (!char) {
        return (typeof _getPlayerCharacterImage === 'function') ? _getPlayerCharacterImage() : '';
    }
    if (typeof _animWarmCacheFor === 'function') _animWarmCacheFor(char, variant);
    const cached = (typeof _animGetDownFallbackSrc === 'function') ? _animGetDownFallbackSrc(char, variant) : null;
    if (cached) return cached;
    const expected = (typeof _animExpectedDownSrc === 'function') ? _animExpectedDownSrc(char, variant) : null;
    if (expected) return expected;
    return (typeof _getPlayerCharacterImage === 'function') ? _getPlayerCharacterImage() : '';
}

// Sets an <img> to the gameplay default (move-down) with a safe fallback
// chain: idle-down → walk-down → menu portrait. Covers the cold-cache first
// paint where discovery hasn't confirmed the art yet.
function _animSetDefaultDownImage(imgEl) {
    if (!imgEl) return;
    const st = (typeof STATE !== 'undefined' && STATE) ? STATE : null;
    const char = st ? st.playerCharacter : null;
    const variant = (typeof _animVariant === 'function') ? _animVariant() : 'noclass';
    const menuSrc = (typeof _getPlayerCharacterImage === 'function') ? _getPlayerCharacterImage() : '';
    if (!char) {
        if (menuSrc) imgEl.src = menuSrc;
        return;
    }
    if (typeof _animWarmCacheFor === 'function') _animWarmCacheFor(char, variant);
    const cached = (typeof _animGetDownFallbackSrc === 'function') ? _animGetDownFallbackSrc(char, variant) : null;
    if (cached) {
        imgEl.src = cached;
        return;
    }
    const idleDown = (typeof _animExpectedDownSrc === 'function') ? _animExpectedDownSrc(char, variant) : null;
    const walkDown = (typeof _animExpectedWalkDownSrc === 'function') ? _animExpectedWalkDownSrc(char, variant) : null;
    imgEl.onerror = function () {
        imgEl.onerror = function () {
            imgEl.onerror = null;
            if (menuSrc) imgEl.src = menuSrc;
        };
        if (walkDown && imgEl.src !== walkDown) imgEl.src = walkDown;
        else if (menuSrc) { imgEl.onerror = null; imgEl.src = menuSrc; }
    };
    if (idleDown) imgEl.src = idleDown;
    else if (walkDown) {
        imgEl.onerror = function () { imgEl.onerror = null; if (menuSrc) imgEl.src = menuSrc; };
        imgEl.src = walkDown;
    }
    else if (menuSrc) imgEl.src = menuSrc;
}


//------------------------------------------------------------------------
//-------------------IDLE LOOP---------------------------------------------
//------------------------------------------------------------------------

const _idleState = {
    intervalId: null,
    frameIndex: 0,
    direction: 1, // ping-pong direction through frames
    imgElementId: null,
    key: null,    // char|variant|facing the loop was started for
    faceResetTimeoutId: null, // pending turn-to-player (look-down) timer
};

// After this long without moving, an idle sprite turns to face the player
// (default look-down / standing image) instead of holding its last travel
// direction. Rearmed every time the idle loop (re)starts; cancelled as soon
// as walking resumes.
const _IDLE_FACE_RESET_MS = 3000;

// Last movement facing, so the gameplay sprite keeps looking its travel
// direction when it stops (directional idle art) instead of snapping back
// to the static portrait. Menus are unaffected: they render
// _getPlayerCharacterImage() on separate elements and never go through
// the idle loop.
let _lastFacingDir = 'down';

// Retry state for the cold-cache case below (first spawn before art
// discovery finishes). Bounded: at most _IDLE_RETRY_MAX attempts.
let _idleRetryKey = null;
let _idleRetryCount = 0;
const _idleRetryDelays = [600, 1500];
const _IDLE_RETRY_MAX = 2;

// True while the idle art for this char/variant/facing may still be
// probing (warming started, no result yet) rather than confirmed missing.
function _animIdlePending(charCap, variant, face) {
    if (!charCap || !variant) return false;
    const keys = [`idle|${charCap}|${variant}`];
    if (face && ANIM_DIRECTIONS.indexOf(face) !== -1) {
        keys.push(`idle|${charCap}|${variant}|${face}`);
    }
    return keys.some((k) => _animWarmStarted[k] && typeof _animCache[k] === 'undefined');
}

function _stopAvatarIdleAnimation() {
    if (_idleState.intervalId) {
        clearInterval(_idleState.intervalId);
        _idleState.intervalId = null;
    }
    if (_idleState.faceResetTimeoutId) {
        clearTimeout(_idleState.faceResetTimeoutId);
        _idleState.faceResetTimeoutId = null;
    }
    _idleState.frameIndex = 0;
    _idleState.direction = 1;
    _idleState.imgElementId = null;
    _idleState.key = null;
}

// Clears any pending turn-to-player timer without touching the loop itself.
function _clearIdleFaceReset() {
    if (_idleState.faceResetTimeoutId) {
        clearTimeout(_idleState.faceResetTimeoutId);
        _idleState.faceResetTimeoutId = null;
    }
}

// Schedules the turn-to-player: after _IDLE_FACE_RESET_MS of uninterrupted
// idling the sprite switches to its default look-down image. No-op when
// already facing down. The timer self-cancels if walking resumes or the
// facing changed meanwhile (movement rearms idle with a new facing).
function _scheduleIdleFaceReset(imgElementId, face) {
    _clearIdleFaceReset();
    if (!face || face === 'down') return;
    const capturedFace = face;
    const capturedId = imgElementId;
    _idleState.faceResetTimeoutId = setTimeout(() => {
        _idleState.faceResetTimeoutId = null;
        if (_walkState.intervalId) return; // moving again — walk owns the sprite
        try {
            if (typeof _lastFacingDir === 'string' && _lastFacingDir !== capturedFace) return;
        } catch (e) { /* pre-init: fall through and reset */ }
        try { _lastFacingDir = 'down'; } catch (e) { /* pre-init: ignore */ }
        _startAvatarIdleAnimation(capturedId, 'down');
    }, _IDLE_FACE_RESET_MS);
}

// Starts the looping idle animation. Safe to call liberally (avatar
// creation, class selection, walk end, spell end): it no-ops when the
// right loop already runs, and falls back to the static portrait when
// no idle frames exist yet.
//
// direction is optional ('up' | 'down' | 'left' | 'right'). When omitted,
// the last movement facing is used, so a sprite that just stopped walking
// keeps looking its travel direction. Menu-adjacent callers pass nothing
// and get the portrait fallback exactly as before whenever no directional
// idle art was discovered.
function _startAvatarIdleAnimation(imgElementId, direction) {
    const id = (typeof _animTargetImgId === 'function') ? _animTargetImgId(imgElementId) : imgElementId;
    if (!id || typeof document === 'undefined') return;
    const char = (typeof STATE !== 'undefined' && STATE) ? STATE.playerCharacter : null;
    const variant = (typeof _animVariant === 'function') ? _animVariant() : 'noclass';
    if (!char) return;
    const face = (direction && ANIM_DIRECTIONS.indexOf(direction) !== -1)
        ? direction
        : ((typeof _lastFacingDir === 'string' && ANIM_DIRECTIONS.indexOf(_lastFacingDir) !== -1) ? _lastFacingDir : null);
    const key = `${char}|${variant}|${face || 'portrait'}`;

    if (_idleState.intervalId && _idleState.imgElementId === id && _idleState.key === key) return;
    _stopAvatarIdleAnimation();

    if (typeof _animWarmCacheFor === 'function') _animWarmCacheFor(char, variant);
    const frames = (typeof _animGetIdleFramesSync === 'function') ? _animGetIdleFramesSync(char, variant, face) : [];

    const el = document.getElementById(id);
    if (!el) return;
    if (!frames || frames.length === 0) {
        // Turn toward the player after a while idle, even when there is no
        // directional idle art to hold (keeps _lastFacingDir consistent so a
        // late-discovered directional set still resolves back to down).
        _scheduleIdleFaceReset(id, face);
        // Gameplay fallback: move-down art, NOT the menu portrait. The menu
        // portrait stays reserved for save slots, level-select topbar and
        // quiz/exercise modals (they render _getPlayerCharacterImage()
        // directly and never go through the idle loop). Cold-cache first
        // paint uses the optimistic down path with a safe chain back to the
        // portrait for variants without directional art.
        if (typeof _animSetDefaultDownImage === 'function') {
            const cur = el.getAttribute('src') || '';
            const wantCached = (typeof _animGetDownFallbackSrc === 'function')
                ? _animGetDownFallbackSrc(char, variant) : null;
            if (wantCached) {
                if (cur !== wantCached) el.src = wantCached;
            } else if (typeof _animExpectedDownSrc === 'function' && _animExpectedDownSrc(char, variant)) {
                // Only install the optimistic default when the element isn't
                // already showing a directional frame (avoids clobbering a
                // walk frame that just played before discovery finished).
                const isAnimFrame = /_(idle|walk)_(up|down|left|right)_/i.test(cur);
                if (!isAnimFrame) _animSetDefaultDownImage(el);
            } else if (typeof _getPlayerCharacterImage === 'function') {
                const idleSrc = _getPlayerCharacterImage();
                if (idleSrc && cur !== idleSrc) el.src = idleSrc;
            }
        } else if (typeof _getPlayerCharacterImage === 'function') {
            const idleSrc = _getPlayerCharacterImage();
            if (idleSrc && el.getAttribute('src') !== idleSrc) el.src = idleSrc;
        }
        // Cold cache: the facing art may still be probing (first spawn
        // right after load). Retry shortly so the sprite upgrades from
        // the portrait to its facing idle once discovery lands. Skipped
        // once walking takes over, and bounded so confirmed-missing art
        // never retries forever.
        if (_idleRetryKey !== key) { _idleRetryKey = key; _idleRetryCount = 0; }
        if (_idleRetryCount < _IDLE_RETRY_MAX
            && (typeof _animIdlePending === 'function')
            && _animIdlePending(_animCharCap(char), variant, face)) {
            const attempt = _idleRetryCount++;
            const retryId = id, retryFace = face;
            setTimeout(() => {
                if (_walkState.intervalId) return;
                if (_lastFacingDir !== retryFace) return;
                _startAvatarIdleAnimation(retryId, retryFace);
            }, _idleRetryDelays[Math.min(attempt, _idleRetryDelays.length - 1)]);
        } else {
            _idleRetryKey = null;
            _idleRetryCount = 0;
        }
        return;
    }
    _idleRetryKey = null;
    _idleRetryCount = 0;

    _idleState.imgElementId = id;
    _idleState.key = key;
    _idleState.frameIndex = 0;
    _idleState.direction = 1;
    el.src = frames[0];
    // Idle facing is temporary: turn toward the player (look-down) after
    // _IDLE_FACE_RESET_MS without moving.
    _scheduleIdleFaceReset(id, face);
    if (frames.length < 2) return;

    _idleState.intervalId = setInterval(() => {
        const frameEl = document.getElementById(id);
        if (!frameEl) return;
        let next = _idleState.frameIndex + _idleState.direction;
        if (next >= frames.length) {
            _idleState.direction = -1;
            next = frames.length - 2 >= 0 ? frames.length - 2 : 0;
        } else if (next < 0) {
            _idleState.direction = 1;
            next = frames.length > 1 ? 1 : 0;
        }
        _idleState.frameIndex = next;
        frameEl.src = frames[next];
    }, ANIM_IDLE_INTERVAL_MS);
}


//------------------------------------------------------------------------
//-------------------SPELL SLOT → ANIMATION--------------------------------
//------------------------------------------------------------------------
// Maps a HUD ability slot to its animation folder name. active1/2 ride
// on the base class, active3/4 on the ascendency, active5 is Heartbloom.
function _animSpellKeyForSlot(slot) {
    if (slot === 'active5') return 'heartbloom';
    const st = (typeof STATE !== 'undefined' && STATE) ? STATE : null;
    const cls = st ? st.playerClass : null;
    const asc = st ? st.playerAscendency : null;
    const base = {
        statistician: { active1: 'data_strike', active2: 'diagonal_strike' },
        mathmagician: { active1: 'arcane_reveal', active2: 'absolute_zero' },
        probabilist: { active1: 'precision_shot', active2: 'rain_arrows' },
    };
    const ascMap = {
        outlier: { active3: 'tail_risk', active4: 'speedforce' },
        actuary: { active3: 'regression', active4: 'significance' },
        recursionist: { active3: 'residual', active4: 'degrees_of_freedom' },
        markovian: { active3: 'rollback', active4: 'transition_matrix' },
        bayesian: { active3: 'traps', active4: 'type1_shield' },
        random_walker: { active3: 'brownian', active4: 'drifter' },
    };
    if ((slot === 'active1' || slot === 'active2') && cls && base[cls]) return base[cls][slot] || null;
    if ((slot === 'active3' || slot === 'active4') && asc && ascMap[asc]) return ascMap[asc][slot] || null;
    return null;
}

// Central hook for combat: resolves the spell folder for a HUD slot and
// plays it on whichever avatar is currently visible. Called from the
// ability dispatchers in class-abilities.js so every base/ascendency
// spell (instant or targeted) animates through this one path.
function _playAvatarSkillAnimationForSlot(slot, imgElementId) {
    const char = (typeof STATE !== 'undefined' && STATE) ? STATE.playerCharacter : null;
    const spell = (typeof _animSpellKeyForSlot === 'function') ? _animSpellKeyForSlot(slot) : null;
    if (!char || !spell) return;
    const st = STATE;
    const variant = (slot === 'active1' || slot === 'active2')
        ? (st.playerClass || 'noclass')
        : (slot === 'active5' ? _animVariant() : (st.playerAscendency || 'noclass'));
    _playAvatarSkillAnimationGeneric(char, variant, spell, imgElementId);
}

// Generic one-shot spell player. Prefers legacy sync tables (instant,
// preserves the Trix swing pacing), otherwise discovers the
// abilities/<variant>/<spell>/ folder. Heartbloom additionally falls
// back to the shared folder so one set can serve all variants.
// No art → no-op, the static portrait keeps showing.
async function _playAvatarSkillAnimationGeneric(char, variant, spell, imgElementId) {
    const id = (typeof _animTargetImgId === 'function') ? _animTargetImgId(imgElementId) : (imgElementId || 'avatar-sprite-img-simple');
    if (!id || !char || !variant || !spell) return;
    const charCap = (typeof _animCharCap === 'function') ? _animCharCap(char) : null;
    if (!charCap) return;

    let frames = null;
    let timingCfg = null;
    const legF = (_SKILL_FRAMES[char] && _SKILL_FRAMES[char][variant] && _SKILL_FRAMES[char][variant][spell])
        || ((spell === 'brownian' || spell === 'drifter') ? (_SKILL_FRAMES[char] && _SKILL_FRAMES[char][variant] && _SKILL_FRAMES[char][variant]['swing']) : null);
    const legT = (_SKILL_TIMINGS[char] && _SKILL_TIMINGS[char][variant] && _SKILL_TIMINGS[char][variant][spell])
        || ((spell === 'brownian' || spell === 'drifter') ? (_SKILL_TIMINGS[char] && _SKILL_TIMINGS[char][variant] && _SKILL_TIMINGS[char][variant]['swing']) : null);
    if (legF && legF.length) {
        frames = legF;
        timingCfg = legT;
    } else {
        const key = `ability|${charCap}|${variant}|${spell}`;
        if (!_animCache[key]) {
            let found = [];
            try {
                found = await _animDiscoverFrames(
                    `${ANIM_BASE_PATH}/${charCap}/abilities/${variant}/${spell}`,
                    `${charCap}_${variant}_${spell}`
                );
            } catch (e) {
                found = [];
            }
            if ((!found || !found.length) && spell === 'heartbloom') {
                try {
                    found = await _animDiscoverFrames(
                        `${ANIM_BASE_PATH}/${charCap}/abilities/_shared/heartbloom`,
                        `${charCap}_heartbloom`
                    );
                } catch (e) {
                    found = [];
                }
            }
            _animCache[key] = found;
        }
        frames = _animCache[key];
    }
    if (!frames || !frames.length) return;

    // Pause walk/idle loops without restoring static — this sequence owns
    // the sprite until it hands back to idle in onComplete.
    if (_walkState.intervalId) {
        clearInterval(_walkState.intervalId);
        _walkState.intervalId = null;
    }
    if (_walkState.idleTimeoutId) {
        clearTimeout(_walkState.idleTimeoutId);
        _walkState.idleTimeoutId = null;
    }
    if (typeof _stopAvatarIdleAnimation === 'function') _stopAvatarIdleAnimation();

    const idleSrc = (typeof _getPlayerCharacterImage === 'function') ? _getPlayerCharacterImage() : undefined;
    if (!idleSrc) return;
    const offsets = (timingCfg && timingCfg.frameOffsets) || frames.map((_, i) => i * ANIM_SKILL_FRAME_MS);
    const idleDelay = (timingCfg && typeof timingCfg.idleDelay === 'number') ? timingCfg.idleDelay : ANIM_SKILL_IDLE_DELAY_MS;
    _playSpriteAnimation(id, frames, offsets, idleSrc, idleDelay, () => {
        if (typeof _startAvatarIdleAnimation === 'function') _startAvatarIdleAnimation(id);
    });
}