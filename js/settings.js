

//------------------------------------------------------------------------
//-------------------CONSTANTS & DEFAULTS---------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// localStorage key used to persist settings across sessions
const SETTINGS_KEY = 'stoxels_settings';

// Default values — used as fallback for any missing or corrupt saved data
const SETTINGS_DEFAULTS = {
    bgmEnabled: true,
    bgmVolume: 0.4,   // 0–1 float, mapped to 0–100% in the UI
    sfxEnabled: true,
    sfxVolume: 0.7,   // 0–1 float, mapped to 0–100% in the UI
    axisLock: true,
    questionMark: false,
    touchpadModeEnabled: false,
};

// Describes every toggle control in the settings modal.
// Each entry maps a settings key to its button element ID.
const TOGGLE_CONFIGS = [
    { key: 'bgmEnabled', btnId: 'stt-bgm' },
    { key: 'sfxEnabled', btnId: 'stt-sfx' },
    { key: 'axisLock', btnId: 'stt-axis' },
    { key: 'questionMark', btnId: 'stt-qmark' },
    { key: 'touchpadModeEnabled', btnId: 'stt-touchpad' },
];

// Describes every volume slider control in the settings modal.
// Each entry maps a settings key to its slider and display-value element IDs.
const SLIDER_CONFIGS = [
    { key: 'bgmVolume', sliderId: 'sld-bgm', valueId: 'val-bgm' },
    { key: 'sfxVolume', sliderId: 'sld-sfx', valueId: 'val-sfx' },
];

// The live settings object — read by other modules throughout the game
let SETTINGS = loadSettings();


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
//-------------------MODAL HELPER FUNCTIONS-------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Updates a single toggle button to reflect the given boolean state.
// Sets the button label and toggles the 'off' CSS class accordingly.
function setToggleUI(btnId, isEnabled) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.classList.toggle('settings-toggle-off', !isEnabled);
}

// Updates a single slider and its displayed percentage value.
// volume is a 0–1 float; the slider and label both show 0–100.
function setSliderUI(sliderId, valueId, volume) {
    const pct = Math.round(volume * 100);
    const slider = document.getElementById(sliderId);
    const label = document.getElementById(valueId);
    if (slider) slider.value = pct;
    if (label) label.textContent = pct + '%';
}

// Reads current SETTINGS and refreshes all modal controls to match.
// Call every time the settings modal opens to keep the UI in sync.
function loadSettingsUI() {
    for (const { key, btnId } of TOGGLE_CONFIGS) {
        setToggleUI(btnId, SETTINGS[key]);
    }
    for (const { key, sliderId, valueId } of SLIDER_CONFIGS) {
        setSliderUI(sliderId, valueId, SETTINGS[key]);
    }
}


//------------------------------------------------------------------------
//-------------------MODAL EVENT LISTENERS--------------------------------
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
    });
}

// Wires up a single volume slider: converts its 0–100 integer value
// to a 0–1 float, updates the live label, then saves and applies.
function initSliderControl(sliderId, valueId, settingsKey) {
    document.getElementById(sliderId)?.addEventListener('input', e => {
        SETTINGS[settingsKey] = parseInt(e.target.value) / 100;
        const label = document.getElementById(valueId);
        if (label) label.textContent = e.target.value + '%';
        saveSettings(SETTINGS);
        applySettings();
    });
}

// Registers all settings modal controls.
// Call once on DOMContentLoaded — before the modal is ever opened.
function initSettingsControls() {
    // Toggles — questionMark is visual-only so it skips applySettings
    initToggleControl('stt-bgm', 'bgmEnabled');
    initToggleControl('stt-sfx', 'sfxEnabled');
    initToggleControl('stt-axis', 'axisLock');
    initToggleControl('stt-qmark', 'questionMark', false);
    initToggleControl('stt-touchpad', 'touchpadModeEnabled');

    // Volume sliders
    initSliderControl('sld-bgm', 'val-bgm', 'bgmVolume');
    initSliderControl('sld-sfx', 'val-sfx', 'sfxVolume');
}