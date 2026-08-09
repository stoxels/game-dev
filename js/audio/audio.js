// ============================================================
//  audio.js  —  Sound effects and background music manager
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
//  now live in audio-data.js, loaded before this file.
// ============================================================

const Audio_Manager = (() => {

    //------------------------------------------------------------------------
    //-------------------VOLUME & STATE VARIABLES-----------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------

    // Default volume levels (0.0 – 1.0)
    let BGM_VOLUME = 0.4;
    let SFX_VOLUME = 0.7;

    // Master on/off switches — kept in sync with SETTINGS when available
    let bgmEnabled = true;
    let sfxEnabled = true;
    let bgmLocked = false;   // true while a story beat/cutscene owns BGM

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
    function _syncBGMEnabledFromSettings() {
        if (typeof SETTINGS !== 'undefined') {
            bgmEnabled = SETTINGS.bgmEnabled;
        }
    }

    // Returns true if the given src is already playing as the active BGM track.
    function _isBGMAlreadyPlaying(src) {
        return currentBGMSrc === src && currentBGM && !currentBGM.paused;
    }

    // Creates a new looping Audio element for the given src,
    // sets its volume, and stores it as the active BGM track.
    function _createBGMAudioElement(src) {
        const audio = new Audio(src);
        audio.loop = true;
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
    // Priority: LEVEL_BGM entry → WORLD_BGM fallback → 'world1' last resort.
    function trackForLevel(worldNum, levelNum) {
        const levelKey = `${worldNum}-${levelNum}`;
        if (LEVEL_BGM[levelKey]) return LEVEL_BGM[levelKey];
        return WORLD_BGM[worldNum] || 'world1';
    }

    // Returns an array of all keys in BGM_TRACKS, optionally excluding
    // special tracks (title, convergence) that are not regular gameplay music.
    function _getAllBGMKeys(excludeSpecial = true) {
        const specialKeys = new Set(['title', 'convergence']);
        return Object.keys(BGM_TRACKS).filter(k => !excludeSpecial || !specialKeys.has(k));
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
        if (!bgmEnabled) return;
        if (bgmLocked) return;

        const src = BGM_TRACKS[trackKey];
        if (!src) return;

        _lastBGMKey = trackKey;

        if (_isBGMAlreadyPlaying(src)) return;

        // Clean up any stale resume listeners before switching tracks
        _cancelPendingResumeListeners();
        stopBGM();

        const audio = _createBGMAudioElement(src);

        // Browser autoplay policy may block play() — register a fallback
        // that retries on the next user interaction if needed.
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


    //------------------------------------------------------------------------
    //-------------------SFX PLAYBACK FUNCTIONS---------------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------

    // Plays the sound effect identified by key.
    // Clones the preloaded Audio object so the same sound can overlap itself.
    // The played instance is stored in _sfxInstances so it can be stopped early.
    function playSFX(key) {
        if (!sfxEnabled) return;

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

    // Locks BGM so playBGM() calls are ignored — used while a story
    // beat/cutscene owns the music.
    function lockBGM() {
        bgmLocked = true;
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
        stopBGM,
        trackForLevel,
        lockBGM,
        unlockBGM,

        get lastBGMKey() { return _lastBGMKey; },

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