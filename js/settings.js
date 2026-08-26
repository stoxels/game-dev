//------------------------------------------------------------------------
//-------------------CONSTANTS & STATE-------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// localStorage key used to persist settings across sessions
const SETTINGS_KEY = 'stoxels_settings';

// Default values — used as fallback for any missing or corrupt saved data
const SETTINGS_DEFAULTS = {
    bgmEnabled: true,
    randomBgmEnabled: false,
    bgmVolume: 0.4,   // 0–1 float, mapped to 0–100% in the UI
    sfxEnabled: true,
    sfxVolume: 0.7,   // 0–1 float, mapped to 0–100% in the UI
    axisLock: true,
    protectMarkedCells: true,
    questionMark: false,
    touchpadModeEnabled: false,
    muteOnFocusLoss: false,     // mute all audio when the window loses focus
    lowTimeVignette: true,      // red screen edge glow while time is running out
    penaltyFlash: true,         // brief red screen flash on a mistake
    toastDuration: 8,           // seconds an on-screen notification stays visible
    invertMouseButtons: false,  // swap fill (left-click) and mark (right-click)
    hidePassiveTrackerInEndgame: false, // hide passive tracker during endgame maps
    lang: 'en',                 // persisted interface language
};

// Describes every toggle control in the settings modal.
// Each entry maps a settings key to its button element ID.
const TOGGLE_CONFIGS = [
    { key: 'bgmEnabled', btnId: 'stt-bgm' },
    { key: 'randomBgmEnabled', btnId: 'stt-randombgm' },
    { key: 'sfxEnabled', btnId: 'stt-sfx' },
    { key: 'muteOnFocusLoss', btnId: 'stt-mutefocus' },
    { key: 'axisLock', btnId: 'stt-axis' },
    { key: 'protectMarkedCells', btnId: 'stt-protectmarks' },
    { key: 'questionMark', btnId: 'stt-qmark' },
    { key: 'touchpadModeEnabled', btnId: 'stt-touchpad' },
    { key: 'invertMouseButtons', btnId: 'stt-invert' },
    { key: 'lowTimeVignette', btnId: 'stt-ltv' },
    { key: 'penaltyFlash', btnId: 'stt-penflash' },
    { key: 'hidePassiveTrackerInEndgame', btnId: 'stt-hidepassiveendgame' },
];

// Describes every slider control in the settings modal.
// Each entry maps a settings key to its slider and display-value element IDs.
// mode: 'percent' (default) stores a 0–1 float and shows a % label;
//       'seconds' stores the raw slider value and shows an "Ns" label.
const SLIDER_CONFIGS = [
    { key: 'bgmVolume', sliderId: 'sld-bgm', valueId: 'val-bgm' },
    { key: 'sfxVolume', sliderId: 'sld-sfx', valueId: 'val-sfx' },
    { key: 'toastDuration', sliderId: 'sld-toast', valueId: 'val-toast', mode: 'seconds' },
];

// Returns the value transforms for a slider config:
//   toStored — converts the raw 0–100 slider integer to the stored settings value
//   toRaw    — converts the stored settings value back to the slider integer
//   label    — formats the stored value for the on-screen text
function _sliderTransforms(cfg) {
    if (cfg.mode === 'seconds') {
        return {
            toStored: raw => parseInt(raw),
            toRaw: stored => Math.round(stored),
            label: stored => `${Math.round(stored)}s`,
        };
    }
    return {
        toStored: raw => parseInt(raw) / 100,
        toRaw: stored => Math.round(stored * 100),
        label: stored => `${Math.round(stored * 100)}%`,
    };
}

// The live settings object — read by other modules throughout the game.
// Relies on function hoisting: loadSettings() is defined further down in
// this file but is available here because `function` declarations are
// hoisted before any top-level code runs.
let SETTINGS = loadSettings();

// Debounce handle for the SFX volume-slider preview sound.
let _sfxPreviewTimeout = null;


//------------------------------------------------------------------------
//-------------------PERSISTENCE------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Reads saved settings from localStorage and merges with defaults.
// Any key missing from the saved data falls back to SETTINGS_DEFAULTS.
function loadSettings() {
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        const saved = raw ? JSON.parse(raw) : {};
        return { ...SETTINGS_DEFAULTS, ...saved };
    } catch {
        return { ...SETTINGS_DEFAULTS };
    }
}

// Writes the current settings object to localStorage.
function saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}


//------------------------------------------------------------------------
//-------------------APPLYING SETTINGS------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Pushes audio settings to the Audio_Manager.
// Called from applySettings whenever audio-related values change.
function applyAudioSettings() {
    Audio_Manager.toggleBGM(SETTINGS.bgmEnabled);
    Audio_Manager.setBGMVolume(SETTINGS.bgmVolume);
    Audio_Manager.toggleSFX(SETTINGS.sfxEnabled);
    Audio_Manager.setSFXVolume(SETTINGS.sfxVolume);
    Audio_Manager.toggleRandomBGM(SETTINGS.randomBgmEnabled);
}

// Registers the window focus/blur listeners used by the "mute when
// unfocused" setting. Called once during init; the handlers re-read
// SETTINGS each time so they always follow the current toggle state.
function _initFocusMuteListeners() {
    window.addEventListener('blur', () => {
        if (SETTINGS.muteOnFocusLoss) Audio_Manager.setFocusMuted(true);
    });
    window.addEventListener('focus', () => {
        if (SETTINGS.muteOnFocusLoss) Audio_Manager.setFocusMuted(false);
    });
}

// Pushes gameplay settings to the relevant game-state variables.
// Called from applySettings whenever gameplay-related values change.
function applyGameplaySettings() {
    if (typeof axisLockEnabled !== 'undefined') {
        axisLockEnabled = SETTINGS.axisLock;
    }

    // show/hide the touchpad mark-mode button immediately when toggled
    if (typeof updateTouchpadModeButtonVisibility === 'function') {
        updateTouchpadModeButtonVisibility();
    }
}

// Applies all current SETTINGS to audio and gameplay systems.
// Call once at startup and again after any setting changes.
function applySettings() {
    applyAudioSettings();
    applyGameplaySettings();
}


//------------------------------------------------------------------------
//-------------------MODAL HELPER FUNCTIONS---------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Updates a single toggle button to reflect the given boolean state.
// Sets the button label and toggles the 'off' CSS class accordingly.
function setToggleUI(btnId, isEnabled) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.classList.toggle('settings-toggle-off', !isEnabled);
}

// Updates a single slider and its displayed value.
// cfg: the matching SLIDER_CONFIGS entry (determines value scaling/label).
function setSliderUI(cfg) {
    const { toRaw, label } = _sliderTransforms(cfg);
    const slider = document.getElementById(cfg.sliderId);
    const labelEl = document.getElementById(cfg.valueId);
    if (slider) slider.value = toRaw(SETTINGS[cfg.key]);
    if (labelEl) labelEl.textContent = label(SETTINGS[cfg.key]);
}

// Reads current SETTINGS and refreshes all modal controls to match.
// Call every time the settings modal opens to keep the UI in sync.
function loadSettingsUI() {
    for (const { key, btnId } of TOGGLE_CONFIGS) {
        setToggleUI(btnId, SETTINGS[key]);
    }
    for (const cfg of SLIDER_CONFIGS) {
        setSliderUI(cfg);
    }
}


//------------------------------------------------------------------------
//-------------------MODAL EVENT LISTENERS----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Wires up a single toggle button: flips its settings key on click,
// then saves, applies, and refreshes the UI.
// Pass applyOnChange = false for toggles that don't need applySettings
// (e.g. purely visual options like questionMark).
function initToggleControl(btnId, settingsKey, applyOnChange = true) {
    document.getElementById(btnId)?.addEventListener('click', () => {
        SETTINGS[settingsKey] = !SETTINGS[settingsKey];
        saveSettings(SETTINGS);
        if (applyOnChange) applySettings();
        loadSettingsUI();
        // Passive tracker endgame hide needs immediate visual update
        if (settingsKey === 'hidePassiveTrackerInEndgame' && typeof PassiveTracker !== 'undefined' && PassiveTracker.refreshVisibility) {
            PassiveTracker.refreshVisibility();
        }
    });
}

// Wires up a single slider: converts its raw value to the stored form
// (see SLIDER_CONFIGS mode), updates the live label, then saves and applies.
function initSliderControl(cfg) {
    document.getElementById(cfg.sliderId)?.addEventListener('input', e => {
        const { toStored, label } = _sliderTransforms(cfg);
        SETTINGS[cfg.key] = toStored(e.target.value);
        const labelEl = document.getElementById(cfg.valueId);
        if (labelEl) labelEl.textContent = label(SETTINGS[cfg.key]);
        saveSettings(SETTINGS);
        applySettings();

        // Preview the new volume with a random SFX (debounced while dragging)
        if (cfg.key === 'sfxVolume') {
            clearTimeout(_sfxPreviewTimeout);
            _sfxPreviewTimeout = setTimeout(() => {
                Audio_Manager.playRandomSFX();
            }, 150);
        }
    });
}

// Registers all settings modal controls.
// Call once on DOMContentLoaded — before the modal is ever opened.
function initSettingsControls() {
    // Toggles — questionMark is visual-only so it skips applySettings
    initToggleControl('stt-bgm', 'bgmEnabled');
    initToggleControl('stt-randombgm', 'randomBgmEnabled');
    initToggleControl('stt-sfx', 'sfxEnabled');
    initToggleControl('stt-mutefocus', 'muteOnFocusLoss');
    initToggleControl('stt-axis', 'axisLock');
    initToggleControl('stt-protectmarks', 'protectMarkedCells', false);
    initToggleControl('stt-qmark', 'questionMark', false);
    initToggleControl('stt-touchpad', 'touchpadModeEnabled');
    initToggleControl('stt-invert', 'invertMouseButtons', false);
    initToggleControl('stt-ltv', 'lowTimeVignette', false);
    initToggleControl('stt-penflash', 'penaltyFlash', false);
    initToggleControl('stt-hidepassiveendgame', 'hidePassiveTrackerInEndgame', false);


    // Sliders (volume + toast duration)
    for (const cfg of SLIDER_CONFIGS) {
        initSliderControl(cfg);
    }

    // Window focus listeners for the mute-when-unfocused setting
    _initFocusMuteListeners();
}