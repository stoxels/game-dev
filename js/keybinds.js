//------------------------------------------------------------------------
//-------------------KEYBINDS: CONSTANTS & STATE---------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// localStorage key used to persist keybinds across sessions and reloads.
const KEYBINDS_KEY = 'stoxels_keybinds';

// Canonical action list. Each entry:
//   id      — stable action identifier (persisted in localStorage)
//   label   — display name in the keybind setup screen
//   keys    — default key (KeyboardEvent.key, lowercased). Use 'escape',
//             'space', 'arrowup'… for named keys; single chars otherwise.
const KEYBIND_DEFAULTS = [
    // Sprite movement (WASD by default). The sprite systems read these
    // live via keybindKeyFor(), so rebinding takes effect immediately.
    // Listed in the on-screen WASD arrangement: up, then left/down/right.
    { id: 'move-up',     label: 'Move up',     keys: 'w' },
    { id: 'move-left',   label: 'Move left',   keys: 'a' },
    { id: 'move-down',   label: 'Move down',   keys: 's' },
    { id: 'move-right',  label: 'Move right',  keys: 'd' },

    // Endgame parry (hold E by default).
    { id: 'eg-parry',    label: 'Endgame parry (hold)',  keys: 'e' },

    // Endgame special abilities. Ability 1 is live today (The Firefly's
    // command key); Ability 2 is The Firefly's fairy-selection cycle; Ability
    // 3 is The Firefly's recall-all. Future endgame bosses re-point these
    // SAME channels at their own mechanics WITHOUT new plumbing: any system
    // can bind to the 'eg-special-N' action via
    // onKeybindAction('eg-special-N', …) and the player's chosen key just
    // works (conflict-checked like every other binding).
    { id: 'eg-special',   label: 'Endgame Special Ability 1', keys: 'f' },
    { id: 'eg-special-2', label: 'Endgame Special Ability 2', keys: 'g' },
    { id: 'eg-special-3', label: 'Endgame Special Ability 3', keys: 'h' },

    // Class abilities (keys 1-5 by default).
    { id: 'ability-1',   label: 'Class Ability 1',       keys: '1' },
    { id: 'ability-2',   label: 'Class Ability 2',       keys: '2' },
    { id: 'ability-3',   label: 'Class Ability 3',       keys: '3' },
    { id: 'ability-4',   label: 'Class Ability 4',       keys: '4' },
    { id: 'ability-5',   label: 'Class Ability 5',       keys: '5' },
];

// Live keybind map: action id -> key string. Rebuilt by loadKeybinds().
let KEYBINDS = {};

// While non-null, the next keydown captures into this action id
// (the "press a key" state of the setup screen).
let _keybindCapturing = null;

// Key -> action ids that currently claim it (multiple actions may share a key;
// the dispatcher calls every handler bound to the pressed key).
const KEYBIND_KEY_INDEX = {};


//------------------------------------------------------------------------
//-------------------PERSISTENCE-------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Reads saved keybinds from localStorage and merges with defaults.
// Unknown saved actions are dropped; missing ones keep their default.
function loadKeybinds() {
    KEYBINDS = {};
    for (const def of KEYBIND_DEFAULTS) KEYBINDS[def.id] = def.keys;
    try {
        const raw = localStorage.getItem(KEYBINDS_KEY);
        const saved = raw ? JSON.parse(raw) : {};
        for (const def of KEYBIND_DEFAULTS) {
            const k = saved[def.id];
            if (typeof k === 'string' && k.length > 0) KEYBINDS[def.id] = k;
        }
    } catch {
        // corrupt payload — defaults already applied above
    }
    _rebuildKeybindIndex();
    return KEYBINDS;
}

// Writes the current keybind map to localStorage.
function saveKeybinds() {
    localStorage.setItem(KEYBINDS_KEY, JSON.stringify(KEYBINDS));
}

// Resets every binding to its default, persists, and refreshes the UI.
function resetKeybinds() {
    for (const def of KEYBIND_DEFAULTS) KEYBINDS[def.id] = def.keys;
    saveKeybinds();
    _rebuildKeybindIndex();
    renderKeybindsUI();
}

// Rebuilds the key -> actions index used by the central dispatcher.
function _rebuildKeybindIndex() {
    for (const k in KEYBIND_KEY_INDEX) delete KEYBIND_KEY_INDEX[k];
    for (const def of KEYBIND_DEFAULTS) {
        const key = KEYBINDS[def.id];
        (KEYBIND_KEY_INDEX[key] ??= []).push(def.id);
    }
}


//------------------------------------------------------------------------
//-------------------LOOKUP HELPERS-----------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Normalizes a KeyboardEvent.key for comparison against stored bindings.
function _keybindNormalize(e) {
    return (e.key || '').length === 1 ? e.key.toLowerCase() : (e.key || '').toLowerCase();
}

// Returns the action ids bound to the given keyboard event, or [].
function keybindActionsFor(e) {
    return KEYBIND_KEY_INDEX[_keybindNormalize(e)] || [];
}

// Returns the currently bound key for an action id (falls back to the
// default so callers stay safe even if loadKeybinds() has not run yet).
function keybindKeyFor(actionId) {
    if (KEYBINDS[actionId]) return KEYBINDS[actionId];
    const def = KEYBIND_DEFAULTS.find((d) => d.id === actionId);
    return def ? def.keys : null;
}

// True if the given keyboard event matches the action's bound key.
function keybindMatches(e, actionId) {
    const bound = keybindKeyFor(actionId);
    return bound !== null && _keybindNormalize(e) === bound;
}

// Human-readable label for a stored key (' ', 'escape' → 'Space', 'Esc').
function keybindDisplayLabel(key) {
    if (key === ' ') return 'Space';
    if (key === 'escape') return 'Esc';
    if (key.length === 1) return key.toUpperCase();
    return key.charAt(0).toUpperCase() + key.slice(1);
}


//------------------------------------------------------------------------
//-------------------HELP TEXT INTEGRATION----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Fills {k1} {k2} … placeholders in translated help texts with the
// player's CURRENT keybinds. Called after applyTranslationsToDOM() (which
// overwrites innerHTML with the raw dictionary string) and whenever a
// binding changes, so screens like the How-To-Play modal always show the
// keys the player actually bound instead of hardcoded defaults.
//
// Placeholder → action mapping (index into KEYBIND_TUT_ACTIONS):
//   {k1}…{k4} → ability-1…ability-4, {k5} → 'escape' (hard pause key).
const KEYBIND_TUT_ACTIONS = [
    'ability-1', 'ability-2', 'ability-3', 'ability-4',
    null, // {k5} — the pause key is fixed, shown as its key-cap label
];

function tutUpdateKeybinds() {
    document.querySelectorAll('[data-t]').forEach((el) => {
        const value = t(el.getAttribute('data-t'));
        if (!value || !value.includes('{k')) return;
        const filled = value.replace(/\{k(\d+)\}/g, (m, idx) => {
            const i = Number(idx);
            const actionId = KEYBIND_TUT_ACTIONS[i - 1];
            if (actionId) return keybindDisplayLabel(keybindKeyFor(actionId));
            if (i === 5) return keybindDisplayLabel('escape');
            return m; // unknown placeholder — leave it visible
        });
        el.innerHTML = filled;
    });
}


//------------------------------------------------------------------------
//-------------------SETUP SCREEN (MODAL)-----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Builds the keybind rows inside the setup modal and wires click-to-capture.
// Called every time the modal opens so rows always reflect live bindings.
function renderKeybindsUI() {
    const list = document.getElementById('keybind-list');
    if (!list) return;
    list.innerHTML = '';
    for (const def of KEYBIND_DEFAULTS) {
        const row = document.createElement('div');
        row.className = 'keybind-row';
        const label = document.createElement('span');
        label.className = 'keybind-label';
        label.textContent = def.label;
        const btn = document.createElement('button');
        btn.className = 'keybind-key';
        btn.id = `keybind-btn-${def.id}`;
        btn.textContent = keybindDisplayLabel(KEYBINDS[def.id]);
        btn.addEventListener('click', () => _startKeybindCapture(def.id));
        row.appendChild(label);
        row.appendChild(btn);
        list.appendChild(row);
    }
    // Keep {k*} placeholders in help screens (How-To-Play etc.) in sync —
    // this also fires after captures, resets and cross-tab storage sync,
    // since they all re-render through here.
    if (typeof tutUpdateKeybinds === 'function') tutUpdateKeybinds();
}

// Puts the UI into capture mode for the given action: the next keydown
// anywhere becomes that action's new binding.
function _startKeybindCapture(actionId) {
    _keybindCapturing = actionId;
    const btn = document.getElementById(`keybind-btn-${actionId}`);
    if (btn) {
        btn.textContent = (typeof t === 'function') ? t('keybinds_capturing') : 'Press a key…';
        btn.classList.add('keybind-capturing');
    }
}

// Applies a captured key to the capturing action. Refuses keys already
// bound to a *different* action to avoid silent conflicts.
function _applyKeybindCapture(key) {
    const actionId = _keybindCapturing;
    _keybindCapturing = null;
    if (!actionId) return;

    const conflict = KEYBIND_DEFAULTS.find(
        (d) => d.id !== actionId && KEYBINDS[d.id] === key
    );
    if (conflict) {
        const reason = (typeof t === 'function')
            ? t('keybinds_conflict').replace('{action}', conflict.label)
            : `"${keybindDisplayLabel(key)}" is already used for ${conflict.label}`;
        showToast(reason);
        renderKeybindsUI();
        return;
    }

    KEYBINDS[actionId] = key;
    saveKeybinds();
    _rebuildKeybindIndex();
    renderKeybindsUI();
}

// Cancels an in-progress capture (Escape pressed while capturing, or the
// modal closing mid-capture).
function _cancelKeybindCapture() {
    if (!_keybindCapturing) return;
    _keybindCapturing = null;
    renderKeybindsUI();
}


//------------------------------------------------------------------------
//-------------------CENTRAL DISPATCHER-------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Single document-level keydown listener. Priority order:
//   1. Capture mode      → bind the pressed key, swallow everything else
//   2. Text fields       → never intercept typing in inputs/textareas
//   3. Bound actions     → dispatch to the registered handler, if any
// Gameplay handlers register themselves via onKeybindAction() below.
function _keybindDispatch(e) {
    if (_keybindCapturing) {
        e.preventDefault();
        e.stopPropagation();
        if (e.key === 'Escape') {
            _cancelKeybindCapture();
        } else {
            _applyKeybindCapture(_keybindNormalize(e));
        }
        return;
    }

    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;

    // The setup modal handles its own Escape-to-close via the shared modal
    // machinery; don't double-dispatch while it is open.
    if (document.getElementById('keybinds-modal')?.classList.contains('show')) return;

    const actions = keybindActionsFor(e);
    if (actions.length === 0) return;

    for (const actionId of actions) {
        const handler = KEYBIND_HANDLERS[actionId];
        if (handler && handler(e) === false) {
            // Handler claims the event: stop propagation and prevent default
            // (e.g. space scrolling the page while painting).
            e.preventDefault();
            e.stopPropagation();
        }
    }
}

// Action id -> handler(e). Handlers return false to claim the keypress
// (prevents default + stops propagation); anything else lets it pass.
const KEYBIND_HANDLERS = {};

// Registers (or replaces) the handler for a keybind action. Called by the
// owning system at init time; the dispatcher reads the table live, so
// handlers can be registered or swapped at any point.
function onKeybindAction(actionId, handler) {
    KEYBIND_HANDLERS[actionId] = handler;
}


//------------------------------------------------------------------------
//-------------------WIRING-------------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Loads persisted bindings and installs the global listener. Called once
// from the bootstrap sequence (before any screen can need a keypress).
function initKeybinds() {
    loadKeybinds();
    document.addEventListener('keydown', _keybindDispatch, { capture: true });
    // Cross-tab sync: the storage event fires in every OTHER tab when
    // saveKeybinds() writes localStorage there, so a rebinding made in one
    // tab (or window) takes effect immediately in all the others.
    window.addEventListener('storage', (e) => {
        if (e.key !== KEYBINDS_KEY) return;
        loadKeybinds();
        // Keep the open setup UI in sync with the new bindings.
        if (document.getElementById('keybinds-modal')?.classList.contains('show')) {
            renderKeybindsUI();
        }
    });
}

// Closes the keybinds modal (wired to the close button / Escape inside it).
function closeKeybindsModal() {
    const modal = document.getElementById('keybinds-modal');
    if (modal) modal.classList.remove('show');
    _cancelKeybindCapture();
}

// Opens the keybinds modal and renders the current bindings.
function openKeybindsModal() {
    renderKeybindsUI();
    const modal = document.getElementById('keybinds-modal');
    if (modal) modal.classList.add('show');
}


//------------------------------------------------------------------------
//-------------------ENTRY POINT-------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Load bindings immediately so the map is ready before any screen boots;
// the keydown listener is installed here too (capture phase, before the
// per-screen listeners registered later — they check KEYBINDS themselves
// where needed).
initKeybinds();
