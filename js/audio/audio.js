// ============================================================
//  audio.js  -  Sound effects and background music manager
// ============================================================
//  Structure:
//    1. Volume & State Variables
//    2. SFX Preload Cache
//    3. BGM Helper Functions
//    4. BGM Playback Functions
//    5. SFX Playback Functions
//    6. Volume & Toggle Controls
//    7. Public API
//
//  Track/SFX file registries (BGM_TRACKS, LEVEL_BGM, WORLD_BGM, SFX)
//  now live in audio-data.js, imported below.
//
//  PHASE 3 (2026-09-15): first real ES module. entry.mjs imports
//  Audio_Manager and (while consumers still read it as a global) keeps
//  ONE bridge line: globalThis.Audio_Manager = Audio_Manager.
//  See MIGRATION.md §3.1.
// ============================================================

import { BGM_TRACKS, BOSS_BGM, TUTORIAL_BGM, LEVEL_BGM, WORLD_BGM, SFX } from './audio-data.js';

export const Audio_Manager = (() => {

    //------------------------------------------------------------------------
    //-------------------VOLUME & STATE VARIABLES-----------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------

    // Default volume levels (0.0 – 1.0)
    let BGM_VOLUME = 0.4;
    let SFX_VOLUME = 0.7;

    // Master on/off switches - kept in sync with SETTINGS when available
    let bgmEnabled = true;
    let sfxEnabled = true;
    let bgmLocked = false;   // true while a story beat/cutscene owns BGM

    let randomBgmEnabled = false;   // true when "random BGM" setting is on
    let _randomTrackActive = false;   // true while a random-chain track is the one currently playing

    // True while the window is unfocused and the "mute when unfocused"
    // setting is active. Pauses BGM and suppresses SFX until restored.
    let focusMuted = false;

    // Currently playing BGM track
    let currentBGM = null;      // active HTMLAudioElement
    let currentBGMSrc = '';     // file path of the active track (used for same-track guard)
    let _lastBGMKey = '';       // track key of the last requested BGM (used for resume after re-enable)

    // Holds the cleanup function that removes the autoplay-resume listeners,
    // so we can cancel them if a new track is requested before the user interacts.
    let _pendingResumeCleanup = null;

    // Stores the most recently played instance of each SFX key,
    // so individual sounds can be stopped via stopSFX(key).
    const _sfxInstances = {};

    // Preloaded Audio objects, one per SFX entry (populated by preload()).
    const _sfxCache = {};


    //------------------------------------------------------------------------
    //-------------------SFX PRELOAD CACHE------------------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------

    // Creates one Audio object per SFX entry and stores it in _sfxCache.
    // Call this once during game init (e.g. on the title screen).
    function preload() {
        Object.entries(SFX).forEach(([key, src]) => {
            const a = new Audio(src);
            a.preload = 'auto';
            _sfxCache[key] = a;
        });
    }


    //------------------------------------------------------------------------
    //-------------------BGM HELPER FUNCTIONS-----------------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------

    // Reads bgmEnabled from the global SETTINGS object if it exists.
    // This keeps the internal flag in sync even if SETTINGS was changed
    // without going through toggleBGM().
    //
    // PHASE3 note: reads go through globalThis so this module can never
    // capture a TDZ/dead binding from the concatenated core (settings.js
    // still lives there and exports nothing). When settings.js converts
    // (Phase 3 step 3) these become a real import; SETTINGS is only ever
    // MUTATED (never reassigned), so the live-object read stays correct.
    function _syncBGMEnabledFromSettings() {
        if (typeof globalThis.SETTINGS !== 'undefined') {
            bgmEnabled = globalThis.SETTINGS.bgmEnabled;
        }
    }

    function _syncRandomBGMFromSettings() {
        if (typeof globalThis.SETTINGS !== 'undefined') {
            randomBgmEnabled = globalThis.SETTINGS.randomBgmEnabled;
        }
    }

    // Returns true if the given src is already playing as the active BGM track.
    function _isBGMAlreadyPlaying(src) {
        return currentBGMSrc === src && currentBGM && !currentBGM.paused;
    }

    // Creates a new looping Audio element for the given src,
    // sets its volume, and stores it as the active BGM track.
    function _createBGMAudioElement(src, loop = true) {
        const audio = new Audio(src);
        audio.loop = loop;
        audio.volume = BGM_VOLUME;
        currentBGM = audio;
        currentBGMSrc = src;
        return audio;
    }

    // Cancels the pending autoplay-resume event listeners if they exist.
    // Must be called before switching tracks so stale listeners don't fire.
    function _cancelPendingResumeListeners() {
        if (_pendingResumeCleanup) {
            _pendingResumeCleanup();
            _pendingResumeCleanup = null;
        }
    }

    // Registers click / keydown listeners that will retry audio.play() once
    // the user interacts with the page (required by browser autoplay policy).
    // Stores a cleanup function in _pendingResumeCleanup so it can be cancelled
    // if a new track is requested before the user interacts.
    function _registerAutoplayResumeListeners(audio) {
        const resume = () => {
            // Only resume if this audio element is still the active BGM track
            if (currentBGM === audio) {
                audio.play().catch(() => { });
            }
            document.removeEventListener('click', resume);
            document.removeEventListener('keydown', resume);
            _pendingResumeCleanup = null;
        };

        _pendingResumeCleanup = () => {
            document.removeEventListener('click', resume);
            document.removeEventListener('keydown', resume);
        };

        document.addEventListener('click', resume, { once: true });
        document.addEventListener('keydown', resume, { once: true });
    }

    // Returns the track key for a given world and level number.
    // Priority: LEVEL_BGM entry → WORLD_BGM fallback → 'level_1_1' last resort.
    function trackForLevel(worldNum, levelNum) {
        const levelKey = `${worldNum}-${levelNum}`;
        if (LEVEL_BGM[levelKey]) return LEVEL_BGM[levelKey];
        return WORLD_BGM[worldNum] || 'level_1_1';
    }

    // Returns an array of all keys in BGM_TRACKS, optionally excluding
    // special tracks (title, overworld, convergence, tutorial_*) that are
    // not regular gameplay music. Tracks whose file previously failed to
    // load (404 / decode error) are also excluded so the random chain can
    // never get stuck on silence. Campaign level keys (level_*) and boss
    // keys (boss_*) share the same files - deduped by src so no track is
    // double-weighted in random mode.
    const _badBgmSrcs = new Set();
    function _getAllBGMKeys(excludeSpecial = true) {
        const specialKeys = new Set(['title', 'overworld', 'convergence', 'tutorial_1', 'tutorial_2']);
        const seenSrcs = new Set();
        return Object.keys(BGM_TRACKS).filter(k => {
            if (excludeSpecial && specialKeys.has(k)) return false;
            const src = BGM_TRACKS[k];
            if (_badBgmSrcs.has(src)) return false;
            if (seenSrcs.has(src)) return false;
            seenSrcs.add(src);
            return true;
        });
    }

    // Plays one random tutorial track (tutorial_1 / tutorial_2).
    // Used when the player enters the tutorial. Tutorial tracks bypass the
    // random-BGM chain below (see playBGM): the tutorial owns the music
    // channel while it runs, no matter the player's random-BGM setting.
    function playTutorialBGM() {
        if (typeof TUTORIAL_BGM === 'undefined' || !TUTORIAL_BGM.length) return;
        const key = TUTORIAL_BGM[Math.floor(Math.random() * TUTORIAL_BGM.length)];
        playBGM(key);
    }

    // Plays the theme music for an endgame boss: one random track from
    // BOSS_BGM[bossId] (e.g. boss_voidborn → voidborn_1 / voidborn_2).
    // Unknown ids (e.g. boss_brutus, which ships no music yet) fall back
    // to a random boss theme so the arena never goes silent.
    function playBossBGM(bossId) {
        let keys = (typeof BOSS_BGM !== 'undefined') ? BOSS_BGM[bossId] : null;
        if (!keys || !keys.length) {
            const allBossKeys = Object.keys(BGM_TRACKS).filter(k => k.startsWith('boss_'));
            if (!allBossKeys.length) return;
            keys = [allBossKeys[Math.floor(Math.random() * allBossKeys.length)]];
        }
        const key = keys[Math.floor(Math.random() * keys.length)];
        playBGM(key);
    }


    //------------------------------------------------------------------------
    //-------------------BGM PLAYBACK FUNCTIONS---------------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------

    // Stops the current BGM with an optional fade-out.
    // fadeMs: duration of the linear fade in milliseconds (0 = instant stop).
    function stopBGM(fadeMs = 500) {
        if (!currentBGM) return;

        const dying = currentBGM;
        currentBGM = null;
        currentBGMSrc = '';
        _randomTrackActive = false; 

        if (fadeMs <= 0) {
            dying.pause();
            return;
        }

        // Tick every 50 ms and lower volume linearly until silence, then pause.
        const step = dying.volume / (fadeMs / 50);
        const fade = setInterval(() => {
            if (dying.volume > step) {
                dying.volume -= step;
            } else {
                dying.pause();
                clearInterval(fade);
            }
        }, 50);
    }

    // Starts playing the BGM track identified by trackKey.
    // If the same track file is already playing, this is a no-op.
    // If BGM is disabled in SETTINGS or internally, the call is ignored.
    function playBGM(trackKey) {
        _syncBGMEnabledFromSettings();
        _syncRandomBGMFromSettings();
        if (!bgmEnabled) return;
        if (bgmLocked) return;

        const src = BGM_TRACKS[trackKey];
        if (!src) return;

        _lastBGMKey = trackKey; // always remember the "real" level track

        // While focus-muted, only queue the track - it starts on unmute
        if (focusMuted) return;

        // Level track file previously failed to load (missing bgm_48+):
        // fall back to a working random track so we never go silent.
        if (_badBgmSrcs.has(src)) {
            if (randomBgmEnabled) {
                if (_randomTrackActive && currentBGM && !currentBGM.paused) return;
                _playRandomBGMTrack();
            } else if (trackKey !== 'level_1_1' && BGM_TRACKS['level_1_1']) {
                playBGM('level_1_1');
            }
            return;
        }

        if (randomBgmEnabled && !(typeof trackKey === 'string' && trackKey.indexOf('tutorial_') === 0)) {
            // Already mid-chain - don't interrupt it. playBGM() just means
            // "make sure appropriate music is playing"; when random mode is
            // on, a currently-playing random track already satisfies that,
            // no matter what triggered this call (level start, next-level,
            // or anything else). Tutorial tracks are exempt: the tutorial
            // owns the channel while it runs (see playTutorialBGM).
            if (_randomTrackActive && currentBGM && !currentBGM.paused) return;
            _playRandomBGMTrack();
            return;
        }

        if (_isBGMAlreadyPlaying(src)) return;

        _cancelPendingResumeListeners();
        stopBGM();

        const audio = _createBGMAudioElement(src, true);
        audio.addEventListener('error', () => {
            _badBgmSrcs.add(src);
            if (currentBGM === audio) {
                currentBGM = null;
                currentBGMSrc = '';
            }
            if (trackKey !== 'level_1_1' && BGM_TRACKS['level_1_1']) {
                playBGM('level_1_1');
            }
        });
        audio.play().catch(() => {
            _registerAutoplayResumeListeners(audio);
        });
    }

    // Plays a random BGM track from BGM_TRACKS.
    // Pass excludeSpecial = false to also include title / convergence tracks.
    // Useful for menus, random events, or any context without a fixed track.
    function playRandomBGM(excludeSpecial = true) {
        const keys = _getAllBGMKeys(excludeSpecial);
        if (keys.length === 0) return;
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        playBGM(randomKey);
    }


    // Picks a random track (excluding special tracks), plays it without looping,
    // and wires an 'ended' listener so the next random track auto-chains.
    // Missing audio files (e.g. unshipped bgm_48+ tracks) fire 'error' instead
    // of 'ended' - those are remembered in _badBgmSrcs and skipped so the
    // chain never gets stuck on silence after a puzzle finishes.
    function _playRandomBGMTrack(attemptsLeft) {
        const keys = _getAllBGMKeys(true);
        if (keys.length === 0) return;
        if (attemptsLeft === undefined) attemptsLeft = keys.length;
        if (attemptsLeft <= 0) return;

        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        const src = BGM_TRACKS[randomKey];
        if (!src) return;

        _cancelPendingResumeListeners();
        stopBGM(0);

        const audio = _createBGMAudioElement(src, false);
        _randomTrackActive = true;
        audio.addEventListener('ended', _onRandomTrackEnded);
        audio.addEventListener('error', () => {
            // File missing / undecodable - never pick it again this session.
            _badBgmSrcs.add(src);
            _randomTrackActive = false;
            if (currentBGM === audio) {
                currentBGM = null;
                currentBGMSrc = '';
            }
            _playRandomBGMTrack(attemptsLeft - 1);
        });
        audio.play().catch(() => {
            // Autoplay-blocked: wait for user gesture. If the element later
            // errors (404), the 'error' handler above skips to the next track.
            _registerAutoplayResumeListeners(audio);
        });
    }

    // Fires when a random track finishes. Chains into another random track,
    // unless random mode or BGM got turned off in the meantime.
    function _onRandomTrackEnded() {
        _syncBGMEnabledFromSettings();
        _syncRandomBGMFromSettings();
        if (!randomBgmEnabled || !bgmEnabled) return;
        if (bgmLocked || focusMuted) return;
        _playRandomBGMTrack();
    }

    // Called by settings.js whenever the "random BGM" toggle changes.
    // Immediately switches the currently playing track to match the new mode.
    function toggleRandomBGM(enabled) {
        randomBgmEnabled = enabled;
        if (_lastBGMKey) playBGM(_lastBGMKey);
    }


    //------------------------------------------------------------------------
    //-------------------SFX PLAYBACK FUNCTIONS---------------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------

    // Plays the sound effect identified by key.
    // Clones the preloaded Audio object so the same sound can overlap itself.
    // The played instance is stored in _sfxInstances so it can be stopped early.
    function playSFX(key) {
        if (!sfxEnabled || focusMuted) return;

        const src = SFX[key];
        if (!src) return;

        // Use the preloaded cache entry if available, otherwise create a fresh element
        const base = _sfxCache[key];
        const a = base ? base.cloneNode() : new Audio(src);
        a.volume = SFX_VOLUME;
        a.play().catch(() => { });

        // Keep track of the latest instance for this key so it can be cancelled
        _sfxInstances[key] = a;
    }

    // Immediately stops and resets the most recently played instance of the
    // given SFX key. Has no effect if the sound is not currently playing.
    function stopSFX(key) {
        const a = _sfxInstances[key];
        if (!a) return;

        a.pause();
        a.currentTime = 0;
        delete _sfxInstances[key];
    }

    // Returns a random key from the SFX registry, or null if it's empty.
    function _getRandomSFXKey() {
        const keys = Object.keys(SFX);
        if (keys.length === 0) return null;
        return keys[Math.floor(Math.random() * keys.length)];
    }

    // Plays a random sound effect from the SFX registry.
    // Useful for previewing SFX volume changes in the settings modal.
    function playRandomSFX() {
        const key = _getRandomSFXKey();
        if (key) playSFX(key);
    }


    //------------------------------------------------------------------------
    //-------------------VOLUME & TOGGLE CONTROLS-------------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------

    // Sets the BGM volume and applies it to the currently playing track.
    // Value is clamped to [0, 1].
    function setBGMVolume(v) {
        BGM_VOLUME = Math.max(0, Math.min(1, v));
        if (currentBGM) currentBGM.volume = BGM_VOLUME;
    }

    // Sets the SFX volume applied to all future playSFX() calls.
    // Value is clamped to [0, 1].
    function setSFXVolume(v) {
        SFX_VOLUME = Math.max(0, Math.min(1, v));
    }

    // Enables or disables BGM playback.
    // When re-enabling, resumes the last track that was requested via playBGM().
    function toggleBGM(enabled) {
        bgmEnabled = enabled;

        if (!bgmEnabled) {
            _cancelPendingResumeListeners();
            stopBGM(0);
        } else {
            if (_lastBGMKey) playBGM(_lastBGMKey);
        }
    }

    // Enables or disables SFX playback.
    // Does not affect sounds already in progress.
    function toggleSFX(enabled) {
        sfxEnabled = enabled;
    }

    // Locks BGM so playBGM() calls are ignored - used while a story
    // beat/cutscene owns the music.
    function lockBGM() {
        bgmLocked = true;
    }

    // Pauses/resumes all audio for the "mute when unfocused" setting.
    // Muting pauses the current track (it resumes where it left off);
    // unmuting restarts the paused track, or the last requested one if
    // a new track was queued while muted.
    function setFocusMuted(muted) {
        focusMuted = muted;
        if (muted) {
            if (currentBGM && !currentBGM.paused) currentBGM.pause();
        } else {
            if (currentBGM && currentBGM.paused && bgmEnabled) {
                currentBGM.play().catch(() => { });
            } else if (_lastBGMKey) {
                playBGM(_lastBGMKey);
            }
        }
    }

    // Releases the BGM lock set by lockBGM().
    function unlockBGM() {
        bgmLocked = false;
    }


    //------------------------------------------------------------------------
    //-------------------PUBLIC API---------------------------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------

    return {
        // BGM
        playBGM,
        playRandomBGM,
        playTutorialBGM,
        playBossBGM,
        stopBGM,
        trackForLevel,
        lockBGM,
        unlockBGM,
        toggleRandomBGM,
        setFocusMuted,

        get lastBGMKey() { return _lastBGMKey; },
        // Legacy alias - storyline-engine.js reads Audio_Manager._lastBGMKey.
        get _lastBGMKey() { return _lastBGMKey; },

        // SFX
        playSFX,
        stopSFX,
        playRandomSFX,
        preload,

        // Volume & toggles
        toggleBGM,
        toggleSFX,
        setBGMVolume,
        setSFXVolume,
    };

})();