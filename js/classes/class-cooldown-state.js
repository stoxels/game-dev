//------------------------------------------------------------------------
//----------------------------STATE / CONFIG-------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Whether an active ability is currently armed and waiting for player input
let activeAbilityMode = false;

// Per-slot independent cooldown state.
// active1 / active2 = base class skill slots
// active3 / active4 = ascendency skill slots
// active5 = endgame heartbloom (spawns 3 hearts)
// Each slot tracks its own remaining seconds and its own tick interval handle.
let cooldownState = {
    active1: { remaining: 0, interval: null },
    active2: { remaining: 0, interval: null },
    active3: { remaining: 0, interval: null },
    active4: { remaining: 0, interval: null },
    active5: { remaining: 0, interval: null },
};

// Lookup: slot key → display number shown in UI and toasts
const SLOT_DISPLAY_INDEX = {
    active1: '1',
    active2: '2',
    active3: '3',
    active4: '4',
    active5: '5',
};

// All slot keys in one place so loops don't need to repeat the list
const ALL_SLOTS = ['active1', 'active2', 'active3', 'active4', 'active5'];


// Maps each base class to its two ascendency options (IDs)
const ASCENDENCY_LIST = {
    statistician: ['outlier', 'actuary'],
    mathmagician: ['recursionist', 'markovian'],
    probabilist: ['bayesian', 'random_walker'],
};

// Flat cooldown reduction (seconds) granted by class-specific passives,
// keyed by class → slot → [skillId, seconds]. Drives _getClassCooldownReduction
// below instead of one hand-written function per class.
const CLASS_COOLDOWN_REDUCTIONS = {
    statistician: {
        // active1 = Data Strike, active2 = Diagonal Strike
        active1: [
            ['advanced_data_strike', 30],
            ['swift_strike', 15],
            ['accelerated_computation', 15],
        ],
        active2: [
            ['quick_strike', 15],
            ['accelerated_striking', 15],
        ],
    },
    mathmagician: {
        // active1 = Arcane Reveal, active2 = Absolute Zero
        active1: [
            ['rapid_revelation', 15],
            ['accelerated_revelation', 15],
        ],
        active2: [
            ['hastened_zero', 15],
            ['accelerated_zero', 15],
        ],
    },
    probabilist: {
        // active1 = Precision Mark, active2 = Field Scan
        active1: [
            ['swift_marking', 15],
            ['accelerated_marking', 15],
        ],
        active2: [
            ['swift_scan', 15],
            ['accelerated_scan', 15],
        ],
    },
};


//------------------------------------------------------------------------
//----------------------STATE HELPERS ------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


// Returns true if all 3 base class skills are at max level (Rank 3)
function isBaseClassMaxed() {
    if (!STATE.playerClass) return false;
    return (STATE.classPassiveLevel || 1) >= 3 &&
        (STATE.classActive1Level || 1) >= 3 &&
        (STATE.classActive2Level || 1) >= 3;
}

// Returns true if the player has chosen an ascendency
function hasAscendency() {
    return !!STATE.playerAscendency;
}

// Returns true if both ascendency skills are at max level (Rank 3)
function isAscendencyMaxed() {
    if (!STATE.playerAscendency) return false;
    return (STATE.ascendencySkill1Level || 1) >= 3 &&
        (STATE.ascendencySkill2Level || 1) >= 3;
}




//------------------------------------------------------------------------
//----------------------FORMATTING HELPERS--------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Converts raw seconds into a human-readable cooldown string.
// Below 60s: "12s"   |   60s and above: "1:05"
function _formatCooldown(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
}

// Returns the localised "Ready" label used in the minimized bar and toasts.
function _getReadyLabel() {
    return t('cls_ready');
}




//------------------------------------------------------------------------
//-------------------ABILITY DATA LOOKUP HELPERS--------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns the ability definition object for a base class slot (active1 / active2).
// Returns null if the class definition can't be found.
function _getBaseClassAbilityData(slot) {
    const def = CLASS_DEFS[STATE.playerClass];
    if (!def) return null;
    return def[slot] ?? null;
}

// Returns the ability definition object for an ascendency slot (active3 / active4).
// active3 maps to the ascendency's first active, active4 to the second.
// Returns null if no ascendency is set or the definition is missing.
function _getAscendencyAbilityData(slot) {
    const asc = STATE.playerAscendency ? ASCENDENCY_DEFS[STATE.playerAscendency] : null;
    if (!asc) return null;
    return slot === 'active3' ? asc.active1 : asc.active2;
}

// Returns the ability definition for any slot, routing to the correct source.
function _getAbilityData(slot) {
    if (slot === 'active5') {
        return (typeof ENDGAME_HEARTBLOOM_DEF !== 'undefined') ? ENDGAME_HEARTBLOOM_DEF : null;
    }
    if (slot === 'active3' || slot === 'active4') {
        return _getAscendencyAbilityData(slot);
    }
    return _getBaseClassAbilityData(slot);
}

// Returns the localised display name for an ability data object.
function _getAbilityName(abilityData) {
    return LANG === 'de'
        ? (abilityData.nameDE || abilityData.nameEn)
        : abilityData.nameEn;
}




//------------------------------------------------------------------------
//------------------COOLDOWN REDUCTION HELPERS----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns the total flat cooldown reduction (in seconds) from global passives
// that apply to every active ability regardless of class or slot.
function _getGlobalCooldownReduction() {
    let reduction = 0;
    if (ptHasSkill('celerity')) reduction += 30;
    if (ptHasSkill('keystone_signal_to_noise')) reduction += 15;
    if (ptHasSkill('keystone_the_oracle') && window._oracleActive === true) reduction += 30;
    if (ptHasSkill('keystone_degrees_of_freedom')) reduction += 30;
    if (ptHasSkill('keystone_entropy_drain')) reduction += 30;
    if (ptHasSkill('keystone_frequentists_burden')) reduction += 15;
    return reduction;
}

// Returns the flat cooldown reduction from passives specific to the current
// class and slot, looked up from CLASS_COOLDOWN_REDUCTIONS above.
// Returns 0 for unknown classes/slots or slots with no listed passives.
function _getClassCooldownReduction(slot) {
    const slotEntries = CLASS_COOLDOWN_REDUCTIONS[STATE.playerClass]?.[slot];
    if (!slotEntries) return 0;
    return slotEntries.reduce(
        (total, [skillId, seconds]) => total + (ptHasSkill(skillId) ? seconds : 0),
        0
    );
}

// Maps every class/ascendency active slot to its arcane cooldown family.
// One family per skill — mods roll on the arcane slot (EG_MOD_TABLE_ARCANE).
const BASE_SKILL_COOLDOWN_FAMILY = {
    mathmagician: { active1: 'cooldown_arcane_reveal', active2: 'cooldown_absolute_zero' },
    statistician: { active1: 'cooldown_data_strike', active2: 'cooldown_diagonal_strike' },
    probabilist: { active1: 'cooldown_precision_shot', active2: 'cooldown_rain_of_arrows' },
};

const ASCENDENCY_SKILL_COOLDOWN_FAMILY = {
    outlier: { active1: 'cooldown_tail_risk', active2: 'cooldown_speedforce' },
    actuary: { active1: 'cooldown_regression_to_prior', active2: 'cooldown_significance_threshold' },
    recursionist: { active1: 'cooldown_residual', active2: 'cooldown_degrees_of_freedom' },
    markovian: { active1: 'cooldown_state_rollback', active2: 'cooldown_transition_matrix' },
    bayesian: { active1: 'cooldown_bayes_traps', active2: 'cooldown_type_i_error_shield' },
    random_walker: { active1: 'cooldown_brownian_motion', active2: 'cooldown_drifter' },
};

// Returns total flat cooldown reduction (seconds) from equipped arcane items
// for the given ability slot. Sums all mods whose familyId matches the
// slot's skill. Handles both the arcane slot and any other slot that might
// carry the mod (future-proof — loop all equipped items).
function _getEquipmentCooldownReduction(slot) {
    if (slot === 'active5') return 0;
    if (typeof _egEquipped === 'undefined' || !_egEquipped) return 0;

    let familyId = null;
    if (slot === 'active1' || slot === 'active2') {
        const map = BASE_SKILL_COOLDOWN_FAMILY[STATE.playerClass];
        if (map) familyId = map[slot];
    } else if (slot === 'active3' || slot === 'active4') {
        if (!STATE.playerAscendency) return 0;
        const ascSlot = slot === 'active3' ? 'active1' : 'active2';
        const map = ASCENDENCY_SKILL_COOLDOWN_FAMILY[STATE.playerAscendency];
        if (map) familyId = map[ascSlot];
    }
    if (!familyId) return 0;

    let total = 0;
    for (const item of Object.values(_egEquipped)) {
        if (!item || !Array.isArray(item.mods)) continue;
        for (const mod of item.mods) {
            if (mod.familyId !== familyId) continue;
            for (const stat of (mod.rolledStats || [])) {
                if (stat.key === familyId && stat.value != null) total += Number(stat.value) || 0;
            }
        }
    }
    return total;
}




//------------------------------------------------------------------------
//--------------------EFFECTIVE COOLDOWN CALCULATION----------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns the final cooldown duration (in seconds) for a given slot after
// applying all global, class-specific and equipment reductions.
// Equipment mods roll on the arcane slot (one family per skill, up to 90s on T1).
// The result is clamped to a minimum of 0 — cooldowns can't go negative.
function getEffectiveCooldown(slot, baseSeconds) {
    const globalReduction = _getGlobalCooldownReduction();
    const classReduction = _getClassCooldownReduction(slot);
    const equipmentReduction = _getEquipmentCooldownReduction(slot);
    return Math.max(0, baseSeconds - globalReduction - classReduction - equipmentReduction);
}




//------------------------------------------------------------------------
//----------------------DOM PATCH HELPERS---------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Updates only the cooldown text element inside a single skill button.
// This avoids rebuilding the entire HUD on every tick — we just swap the text.
// Falls back silently if the button can't be found (e.g. panel was re-rendered).
function _patchCooldownButton(slot) {
    const btn = document.querySelector(
        `#class-hud-panel .chud-skill-btn[data-slot="${slot}"]`
    );
    if (!btn) return;
    const cdEl = btn.querySelector('.chud-btn-cd');
    if (cdEl) {
        cdEl.textContent = _formatCooldown(cooldownState[slot].remaining);
    }
}

// Builds a single slot's HTML fragment for the minimized cooldown bar.
// Shows "Ready ✓" when the cooldown has expired, otherwise shows the remaining time.
function _buildMiniBarSlotHTML(slot, displayIndex) {
    const cd = cooldownState[slot].remaining;
    const isReady = cd <= 0;
    const label = String(displayIndex);
    return isReady
        ? `<span class="chud-mini-ready">${label}: ${_getReadyLabel()} ✓</span>`
        : `<span class="chud-mini-cd">${label}: ${_formatCooldown(cd)}</span>`;
}

// Rebuilds the minimized HUD cooldown bar in-place without a full HUD rebuild.
// Only covers the two base class slots (active1 / active2).
// Falls back silently if the bar element isn't present in the DOM.
function patchMinimizedBar() {
    const bar = document.getElementById('chud-mini-bar');
    if (!bar) return;
    if (!CLASS_DEFS[STATE.playerClass]) return;

    const baseSlots = ['active1', 'active2'];
    const parts = baseSlots.map((slot, i) => _buildMiniBarSlotHTML(slot, i + 1));
    bar.innerHTML = parts.join('<span class="chud-mini-sep">|</span>');
}




//------------------------------------------------------------------------
//----------------------TOAST NOTIFICATION HELPER-------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Fires a toast message and plays a sound effect when an ability comes off cooldown.
// Silently aborts if the player has already navigated away from the game screen.
function _showCooldownReadyToast(slot) {
    if (!document.getElementById('screen-game')?.classList.contains('active')) return;

    const abilityData = _getAbilityData(slot);
    if (!abilityData) return;

    const name = _getAbilityName(abilityData);
    const slotIndex = SLOT_DISPLAY_INDEX[slot] ?? slot;
    const readyLabel = t('cls_ready_excl');

    showToast(`✅ [${slotIndex}] ${name} — ${readyLabel}`);
    Audio_Manager.playSFX('abilityReady');
}




//------------------------------------------------------------------------
//------------------------SLOT COOLDOWN TIMER-----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Handles the expiry of a slot's cooldown: clears the interval, fires the ready
// toast, and triggers a full HUD rebuild to restore the ACTIVATE button.
function _onSlotCooldownExpired(slot) {
    const state = cooldownState[slot];
    state.remaining = 0;
    clearInterval(state.interval);
    state.interval = null;
    _showCooldownReadyToast(slot);
    buildClassHUD();
}

// Ticks a slot's countdown by one second.
// If the cooldown has reached zero, delegates to _onSlotCooldownExpired.
// Otherwise, patches only the affected button to avoid a full HUD rebuild.
function _tickSlotCooldown(slot) {

    // If the game is paused or the player is dead, skip the tick
    if (typeof _gamePaused !== 'undefined' && _gamePaused) return;
    if (typeof dead !== 'undefined' && dead) return;
    const decrement = window._chronoFractureActive ? 2 : 1;
    cooldownState[slot].remaining -= decrement;

    if (cooldownState[slot].remaining <= 0) {
        _onSlotCooldownExpired(slot);
    } else {
        _patchCooldownButton(slot);
    }
}

// Starts an independent per-second countdown for a single skill slot.
// If a countdown for this slot is already running it is cancelled first.
// Immediately patches the button to show the initial countdown value,
// then ticks once per second until the cooldown expires.
function startSlotCooldown(slot, seconds) {
    const state = cooldownState[slot];

    if (state.interval) clearInterval(state.interval);
    state.remaining = seconds;

    _patchCooldownButton(slot);
    state.interval = setInterval(() => _tickSlotCooldown(slot), 1000);
}




//------------------------------------------------------------------------
//---------------------------RESET COOLDOWNS------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Clears the interval and remaining time for a single slot.
function _clearSlotCooldown(slot) {
    if (cooldownState[slot].interval) clearInterval(cooldownState[slot].interval);
    cooldownState[slot].interval = null;
    cooldownState[slot].remaining = 0;
}

// Resets all cooldowns, disarms any armed ability, clears the fill streak,
// and restores the default cursor on the puzzle area.
// Called when a round ends or the player's state is wiped.
function resetActiveCooldown() {
    ALL_SLOTS.forEach(_clearSlotCooldown);
    activeAbilityMode = false;
    correctFillStreak = 0;
    nextPenaltyHalved = false;
    const wrap = document.getElementById('puzzle-scaler-wrap');
    if (wrap) wrap.style.cursor = '';
}




//------------------------------------------------------------------------
//---------------------------KEYBOARD SHORTCUTS---------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns true when a key press should be ignored because a modal is open.
function _isModalOpen() {
    return !!document.querySelector(
        '.modal-bg.show, .cs-overlay.show, #class-selection-overlay.show'
    );
}

// Returns true when the player is in a state where ability hotkeys should be inactive.
function _abilityHotkeysBlocked() {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
    if (_isModalOpen()) return true;
    if (!STATE.playerClass || isClassless() || dead) return true;
    return false;
}

// Handles a key press bound to an ability slot (ability-1…ability-5, keys
// 1–5 by default) by toggling the corresponding ability slot.
function _handleAbilityKeyPress(key, e) {
    let slot = null;
    if (typeof keybindKeyFor === 'function') {
        for (let i = 1; i <= 5; i++) {
            if (keybindKeyFor(`ability-${i}`) === key) {
                slot = `active${i}`;
                break;
            }
        }
    } else {
        const slotMap = { '1': 'active1', '2': 'active2', '3': 'active3', '4': 'active4', '5': 'active5' };
        slot = slotMap[key] ?? null;
    }
    if (slot) {
        e.preventDefault();
        toggleActiveAbility(slot);
    }
}

// Sets up keyboard shortcuts for ability activation (ability-1…ability-5,
// keys 1–5 by default) and Escape to disarm.
// Registered once at file load time.
function _initClassAbilityHotkeys() {
    document.addEventListener('keydown', (e) => {
        if (_abilityHotkeysBlocked()) return;

        if (typeof keybindMatches === 'function') {
            for (let i = 1; i <= 5; i++) {
                if (keybindMatches(e, `ability-${i}`)) {
                    _handleAbilityKeyPress(e.key, e);
                    return;
                }
            }
        } else if (['1', '2', '3', '4', '5'].includes(e.key)) {
            _handleAbilityKeyPress(e.key, e);
            return;
        }

        if (e.key === 'Escape' && activeAbilityMode) {
            _setAbilityMode(false);
            buildClassHUD();
        }
    });
}

_initClassAbilityHotkeys();