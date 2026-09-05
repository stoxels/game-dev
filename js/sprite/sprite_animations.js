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
// e.g. animations/Trix/abilities/Trix_random_walker_swing_1.png
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
// Playback ping-pongs through these (1,2,3,2,1,2,3,...) rather than
// wrapping straight from the last frame back to the first — see
// _advanceWalkFrameIndex() below.
const _WALK_FRAMES = {
    stox: {
        noclass: [
            'animations/Stox/walk/Stox_noclass_walk_1.png', // contact: left foot forward
            'animations/Stox/walk/Stox_noclass_walk_2.png', // passing: mid-stride
            'animations/Stox/walk/Stox_noclass_walk_3.png', // contact: right foot forward
        ],
        statistician: [
            'animations/Stox/walk/Stox_statistician_walk_1.png', // contact: left foot forward
            'animations/Stox/walk/Stox_statistician_walk_2.png', // passing: mid-stride
            'animations/Stox/walk/Stox_statistician_walk_3.png', // contact: right foot forward
        ],
        outlier: [
            'animations/Stox/walk/Stox_outlier_walk_1.png', // contact: left foot forward
            'animations/Stox/walk/Stox_outlier_walk_2.png', // passing: mid-stride
            'animations/Stox/walk/Stox_outlier_walk_3.png', // contact: right foot forward
        ],
        actuary: [
            'animations/Stox/walk/Stox_actuary_walk_1.png', // contact: left foot forward
            'animations/Stox/walk/Stox_actuary_walk_2.png', // passing: mid-stride
        ],
        mathmagician: [
            'animations/Stox/walk/Stox_mathmagician_walk_1.png', // contact: left foot forward
            'animations/Stox/walk/Stox_mathmagician_walk_2.png', // passing: mid-stride
            'animations/Stox/walk/Stox_mathmagician_walk_3.png', // contact: right foot forward
        ],
        recursionist: [
            'animations/Stox/walk/Stox_recursionist_walk_1.png', // contact: left foot forward
            'animations/Stox/walk/Stox_recursionist_walk_2.png', // passing: mid-stride
        ],
        markovian: [
            'animations/Stox/walk/Stox_markovian_walk_1.png', // contact: left foot forward
            'animations/Stox/walk/Stox_markovian_walk_2.png', // passing: mid-stride
        ],
        probabilist: [
            'animations/Stox/walk/Stox_probabilist_walk_1.png', // contact: left foot forward
            'animations/Stox/walk/Stox_probabilist_walk_2.png', // passing: mid-stride
            'animations/Stox/walk/Stox_probabilist_walk_3.png', // contact: right foot forward
        ],
        bayesian: [
            'animations/Stox/walk/Stox_bayesian_walk_1.png', // contact: left foot forward
            'animations/Stox/walk/Stox_bayesian_walk_2.png', // passing: mid-stride
            'animations/Stox/walk/Stox_bayesian_walk_3.png', // contact: right foot forward
        ],
        random_walker: [
            'animations/Stox/walk/Stox_random_walker_walk_1.png', // contact: left foot forward
            'animations/Stox/walk/Stox_random_walker_walk_2.png', // passing: mid-stride
            'animations/Stox/walk/Stox_random_walker_walk_3.png', // contact: right foot forward
        ],


    },


    trix: {
        noclass: [
            'animations/Trix/walk/Trix_noclass_walk_1.png', // contact: left foot forward
            'animations/Trix/walk/Trix_noclass_walk_2.png', // passing: mid-stride
            'animations/Trix/walk/Trix_noclass_walk_3.png', // contact: right foot forward
        ],
        statistician: [
            'animations/Trix/walk/Trix_statistician_walk_1.png', // contact: left foot forward
            'animations/Trix/walk/Trix_statistician_walk_2.png', // passing: mid-stride
        ],
        outlier: [
            'animations/Trix/walk/Trix_outlier_walk_1.png', // contact: left foot forward
            'animations/Trix/walk/Trix_outlier_walk_2.png', // passing: mid-stride
            'animations/Trix/walk/Trix_outlier_walk_3.png', // contact: right foot forward
        ],
        actuary: [
            'animations/Trix/walk/Trix_actuary_walk_1.png', // contact: left foot forward
            'animations/Trix/walk/Trix_actuary_walk_2.png', // passing: mid-stride
            'animations/Trix/walk/Trix_actuary_walk_3.png', // contact: right foot forward
        ],
        mathmagician: [
            'animations/Trix/walk/Trix_mathmagician_walk_1.png', // contact: left foot forward
            'animations/Trix/walk/Trix_mathmagician_walk_2.png', // passing: mid-stride
        ],
        recursionist: [
            'animations/Trix/walk/Trix_recursionist_walk_1.png', // contact: left foot forward
            'animations/Trix/walk/Trix_recursionist_walk_2.png', // passing: mid-stride
            'animations/Trix/walk/Trix_recursionist_walk_3.png', // contact: right foot forward
        ],
        markovian: [
            'animations/Trix/walk/Trix_markovian_walk_1.png', // contact: left foot forward
            'animations/Trix/walk/Trix_markovian_walk_2.png', // passing: mid-stride
            'animations/Trix/walk/Trix_markovian_walk_3.png', // contact: right foot forward
        ],
        probabilist: [
            'animations/Trix/walk/Trix_probabilist_walk_1.png', // contact: left foot forward
            'animations/Trix/walk/Trix_probabilist_walk_2.png', // passing: mid-stride
            'animations/Trix/walk/Trix_probabilist_walk_3.png', // contact: right foot forward
        ],
        bayesian: [
            'animations/Trix/walk/Trix_bayesian_walk_1.png', // contact: left foot forward
            'animations/Trix/walk/Trix_bayesian_walk_2.png', // passing: mid-stride
            'animations/Trix/walk/Trix_bayesian_walk_3.png', // contact: right foot forward
        ],
        random_walker: [
            'animations/Trix/walk/Trix_random_walker_walk_1.png', // contact: left foot forward
            'animations/Trix/walk/Trix_random_walker_walk_2.png', // passing: mid-stride
            'animations/Trix/walk/Trix_random_walker_walk_3.png', // contact: right foot forward
        ],
    },

    syla: {
        noclass: [
            'animations/Syla/walk/Syla_noclass_walk_1.png', // contact: left foot forward
            'animations/Syla/walk/Syla_noclass_walk_2.png', // passing: mid-stride
            'animations/Syla/walk/Syla_noclass_walk_3.png', // contact: right foot forward
        ],
        statistician: [
            'animations/Syla/walk/Syla_statistician_walk_1.png', // contact: left foot forward
            'animations/Syla/walk/Syla_statistician_walk_2.png', // passing: mid-stride
        ],
        outlier: [
            'animations/Syla/walk/Syla_outlier_walk_1.png', // contact: left foot forward
            'animations/Syla/walk/Syla_outlier_walk_2.png', // passing: mid-stride
        ],
        actuary: [
            'animations/Syla/walk/Syla_actuary_walk_1.png', // contact: left foot forward
            'animations/Syla/walk/Syla_actuary_walk_2.png', // passing: mid-stride
            'animations/Syla/walk/Syla_actuary_walk_3.png', // contact: right foot forward
        ],
        mathmagician: [
            'animations/Syla/walk/Syla_mathmagician_walk_1.png', // contact: left foot forward
            'animations/Syla/walk/Syla_mathmagician_walk_2.png', // passing: mid-stride
            'animations/Syla/walk/Syla_mathmagician_walk_3.png', // contact: right foot forward
        ],
        recursionist: [
            'animations/Syla/walk/Syla_recursionist_walk_1.png', // contact: left foot forward
            'animations/Syla/walk/Syla_recursionist_walk_2.png', // passing: mid-stride
            'animations/Syla/walk/Syla_recursionist_walk_3.png', // contact: right foot forward
        ],
        markovian: [
            'animations/Syla/walk/Syla_markovian_walk_1.png', // contact: left foot forward
            'animations/Syla/walk/Syla_markovian_walk_2.png', // passing: mid-stride
        ],
        probabilist: [
            'animations/Syla/walk/Syla_probabilist_walk_1.png', // contact: left foot forward
            'animations/Syla/walk/Syla_probabilist_walk_2.png', // passing: mid-stride
            'animations/Syla/walk/Syla_probabilist_walk_3.png', // contact: right foot forward
        ],
        bayesian: [
            'animations/Syla/walk/Syla_bayesian_walk_1.png', // contact: left foot forward
            'animations/Syla/walk/Syla_bayesian_walk_2.png', // passing: mid-stride
            'animations/Syla/walk/Syla_bayesian_walk_3.png', // contact: right foot forward
        ],
        random_walker: [
            'animations/Syla/walk/Syla_random_walker_walk_1.png', // contact: left foot forward
            'animations/Syla/walk/Syla_random_walker_walk_2.png', // passing: mid-stride
            'animations/Syla/walk/Syla_random_walker_walk_3.png', // contact: right foot forward
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
    direction: 1, // +1 advancing forward through frames, -1 bouncing back
    idleTimeoutId: null,
    imgElementId: null,
    dirName: null, // 'up' | 'down' | 'left' | 'right' | null (omni)
    frames: null,  // resolved frame list for the active loop
};

// Advances _walkState.frameIndex by one step of a ping-pong sequence
// across the given frame count. For a 3-frame set this produces the
// cycle: 0,1,2,1,0,1,2,1,0,... (i.e. contact,passing,contact,passing,...)
// instead of a hard wrap from the last frame back to the first, which
// would visually "snap" rather than step naturally.
//
// Works for any frame count >= 2. A 2-frame set simply alternates
// 0,1,0,1,... since there's no distinct middle frame to bounce through.
function _advanceWalkFrameIndex(frameCount) {
    if (frameCount <= 1) return 0;

    let next = _walkState.frameIndex + _walkState.direction;

    if (next >= frameCount) {
        _walkState.direction = -1;
        next = frameCount - 2 >= 0 ? frameCount - 2 : 0;
    } else if (next < 0) {
        _walkState.direction = 1;
        next = frameCount > 1 ? 1 : 0;
    }

    return next;
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

    // Pause the idle loop while walking (no src restore — we take over below).
    if (typeof _stopAvatarIdleAnimation === 'function') _stopAvatarIdleAnimation(false);

    const frames = (typeof _animGetWalkFramesSync === 'function')
        ? _animGetWalkFramesSync(char, asc, direction)
        : (_WALK_FRAMES[char]?.[asc] || []);
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

// Immediately stops the walk loop and hands the sprite back to the idle
// loop (which restores the static portrait when no idle frames exist).
function _stopAvatarWalkAnimation() {
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

    const imgElementId = _walkState.imgElementId;
    _walkState.imgElementId = null;
    if (!imgElementId) return;

    if (typeof _startAvatarIdleAnimation === 'function') {
        _startAvatarIdleAnimation(imgElementId);
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
                'animations/Trix/abilities/Trix_random_walker_swing_1.png',
                'animations/Trix/abilities/Trix_random_walker_swing_2.png',
                'animations/Trix/abilities/Trix_random_walker_swing_3.png',
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
//   movement, omnidirectional fallback (looping, ping-pong):
//     animations/<Char>/walk/<variant>/<Char>_<variant>_walk_<N>.png
//   movement, per-direction override (looping, ping-pong):
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
        const src = `${dir}/${prefix}_${i}.png`;
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

// Sync idle-frame lookup (discovered nested art only; static portrait is
// the fallback and needs no table).
function _animGetIdleFramesSync(char, variant) {
    const charCap = _animCharCap(char);
    if (!charCap) return [];
    return _animCache[`idle|${charCap}|${variant}`] || [];
}


//------------------------------------------------------------------------
//-------------------IDLE LOOP---------------------------------------------
//------------------------------------------------------------------------

const _idleState = {
    intervalId: null,
    frameIndex: 0,
    direction: 1, // ping-pong direction through frames
    imgElementId: null,
    key: null,    // char|variant the loop was started for
};

function _stopAvatarIdleAnimation() {
    if (_idleState.intervalId) {
        clearInterval(_idleState.intervalId);
        _idleState.intervalId = null;
    }
    _idleState.frameIndex = 0;
    _idleState.direction = 1;
    _idleState.imgElementId = null;
    _idleState.key = null;
}

// Starts the looping idle animation. Safe to call liberally (avatar
// creation, class selection, walk end, spell end): it no-ops when the
// right loop already runs, and falls back to the static portrait when
// no idle frames exist yet.
function _startAvatarIdleAnimation(imgElementId) {
    const id = (typeof _animTargetImgId === 'function') ? _animTargetImgId(imgElementId) : imgElementId;
    if (!id || typeof document === 'undefined') return;
    const char = (typeof STATE !== 'undefined' && STATE) ? STATE.playerCharacter : null;
    const variant = (typeof _animVariant === 'function') ? _animVariant() : 'noclass';
    if (!char) return;
    const key = `${char}|${variant}`;

    if (_idleState.intervalId && _idleState.imgElementId === id && _idleState.key === key) return;
    _stopAvatarIdleAnimation();

    if (typeof _animWarmCacheFor === 'function') _animWarmCacheFor(char, variant);
    const frames = (typeof _animGetIdleFramesSync === 'function') ? _animGetIdleFramesSync(char, variant) : [];

    const el = document.getElementById(id);
    if (!el) return;
    if (!frames || frames.length === 0) {
        if (typeof _getPlayerCharacterImage === 'function') {
            const idleSrc = _getPlayerCharacterImage();
            if (idleSrc && el.getAttribute('src') !== idleSrc) el.src = idleSrc;
        }
        return;
    }

    _idleState.imgElementId = id;
    _idleState.key = key;
    _idleState.frameIndex = 0;
    _idleState.direction = 1;
    el.src = frames[0];
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