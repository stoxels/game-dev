import { _getAscendencySlotData } from './class-abilities.js';
import { CLASS_DEFS, ENDGAME_HEARTBLOOM_DEF } from './class-defs.js';
import { buildClassHUD } from './class-hud.js';
import { getSkillRankManaMultForSlot } from '../skills/skill-charms.js';
import { _hotbarClasslessHasSpells } from '../skills/skill-hotbar.js';
import { STATE } from '../state.js';
// class-mana.js
// Runtime mana pool, ability costs, regeneration, and the shared mana bar.

//------------------------------------------------------------------------
//----------------------------CONSTANTS & STATE----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

const MANA_REGEN_INTERVAL_MS = 5000;

// Flat regen applied on top of gear manaRegen so the pool always refills
// outside endgame (story levels have no equipment). Tunable in one place.
const MANA_BASE_REGEN = 4;

// Scales flat ability costs as max mana grows; each divisor step above the
// day-one baseline adds 100% to every cost.
const MANA_COST_SCALE_BASELINE = 100;
const MANA_COST_SCALE_DIVISOR = 340;

// Global balance multiplier applied inside _scaleAbilityManaCost so every
// cost source and tooltip uses the same value.
const MANA_COST_GLOBAL_MULT = 1.5;

// Lazily created handle for the passive regen tick (null until first use).
let _manaRegenInterval = null;


//------------------------------------------------------------------------
//------------------------------COST HELPERS------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Applies the gear-aware cost multiplier to a def's flat manaCost.
// Active map runs can further inflate costs; tooltips and actual charges
// both use this helper.
export function _scaleAbilityManaCost(cost) {
    if (!cost || cost <= 0) return 0;
    const maxMana = _getPlayerMaxMana();
    const mult = 1 + Math.max(0, maxMana - MANA_COST_SCALE_BASELINE) / MANA_COST_SCALE_DIVISOR;
    let scaled = cost * mult * MANA_COST_GLOBAL_MULT;
    if (typeof globalThis._egGetActiveMapModValue === 'function') {
        const costPct = globalThis._egGetActiveMapModValue('map_mana_costs');
        if (costPct > 0) scaled *= (1 + costPct / 100);
    }
    return Math.round(scaled);
}


// Mana is enabled in both story levels and endgame maps.
function _manaEnabled() {
    return true;
}


// Returns the current maximum mana from the base pool and live gear stats.
export function _getPlayerMaxMana() {
    if (!_manaEnabled()) return 0;
    const base = (typeof globalThis.EG_PLAYER_STATS !== 'undefined') ? globalThis.EG_PLAYER_STATS.baseMana : 0;
    const gearBonus = (typeof globalThis._egComputePlayerStats === 'function')
        ? globalThis._egComputePlayerStats().mana : 0;
    return Math.max(0, Math.round(base + gearBonus));
}


// Returns the mana cost of the ability in the given HUD slot, or 0 when the
// slot has no cost defined. Charm rank is applied after gear scaling.
export function _getAbilityManaCost(hudSlot) {
    const base = _getAbilityScaledBaseCost(hudSlot);
    if (!base) return base;
    const rankMult = getSkillRankManaMultForSlot(hudSlot);
    return Math.round(base * rankMult);
}

// Resolves a slot's gear-scaled cost before charm rank is applied.
function _getAbilityScaledBaseCost(hudSlot) {
    if (hudSlot === 'active5') {
        if (!STATE.playerClass || !_manaEnabled()) return 0;
        const def = ENDGAME_HEARTBLOOM_DEF;
        return _scaleAbilityManaCost((def && def.manaCost) || 0);
    }

    // Tutorial Fireball (active6): castable before any class is chosen, so
    // its cost must resolve ahead of the no-class gate. Kept in sync with
    // _tqEnsureFireball's manaCost in js/tutorial-quest.js.
    if (hudSlot === 'active6') {
        if (!_manaEnabled()) return 0;
        return _scaleAbilityManaCost(16);
    }

    if (!STATE.playerClass || !_manaEnabled()) return 0;

    if (hudSlot === 'active1' || hudSlot === 'active2') {
        const def = CLASS_DEFS[STATE.playerClass];
        return _scaleAbilityManaCost((def && def[hudSlot] && def[hudSlot].manaCost) || 0);
    }

    // Ascendency slots (active3 / active4)
    const slotData = _getAscendencySlotData(hudSlot);
    if (!slotData) return 0;
    const skill = slotData.asc[slotData.ascSlot];
    return _scaleAbilityManaCost((skill && skill.manaCost) || 0);
}


//------------------------------------------------------------------------
//--------------------------AFFORDABILITY & PAYMENT-----------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns true when the current mana pool covers a cost.
export function canAffordMana(cost) {
    return Math.round(globalThis.playerCurrentMana) >= cost;
}


// True when Blood Magic makes the current map charge abilities from life.
export function _bloodMagicActive() {
    return (typeof globalThis._egMapHasBloodMagic === 'function') && globalThis._egMapHasBloodMagic();
}


// Returns true when life can pay a cost without reducing the player to zero.
export function canAffordLifeCost(cost) {
    if (!cost || cost <= 0) return true;
    return globalThis.playerCurrentHP > cost;
}


// Checks an ability against mana, or life when Blood Magic is active.
export function _abilityCanAfford(hudSlot) {
    const cost = _getAbilityManaCost(hudSlot);
    if (_bloodMagicActive()) return canAffordLifeCost(cost);
    return canAffordMana(cost);
}


// True when every HUD skill slot can currently be paid for. Slots without
// an ability/cost resolve to affordable, so this reflects the worst case.
function _allSlotsAffordable() {
    if (!STATE.playerClass) return true;
    return ['active1', 'active2', 'active3', 'active4', 'active5']
        .every((slot) => _abilityCanAfford(slot));
}

// Rebuilds the class HUD after a pool change affects button availability.
function _refreshHUDIfAffordabilityChanged(wasAffordable) {
    buildClassHUD();
}


// Adds mana, clamps it to the current maximum, and returns the amount gained.
export function gainMana(amount) {
    if (!amount || amount <= 0) return 0;
    if (typeof globalThis._egMapManaGainMult === 'function') amount *= globalThis._egMapManaGainMult();
    amount = Math.round(amount);
    if (amount <= 0) return 0;
    const max = _getPlayerMaxMana();
    if (max <= 0) return 0;
    const wasAffordable = _allSlotsAffordable();
    const before = Math.round(globalThis.playerCurrentMana);
    globalThis.playerCurrentMana = Math.min(max, Math.round(globalThis.playerCurrentMana + amount));
    updateClassHUDManaBar();
    _refreshHUDIfAffordabilityChanged(wasAffordable);
    return globalThis.playerCurrentMana - before;
}


// Deducts mana only when the pool can cover the full cost.
export function spendMana(cost) {
    if (!cost || cost <= 0) return true;
    if (!canAffordMana(cost)) return false;
    const wasAffordable = _allSlotsAffordable();
    globalThis.playerCurrentMana = Math.round(globalThis.playerCurrentMana - cost);
    updateClassHUDManaBar();
    _refreshHUDIfAffordabilityChanged(wasAffordable);
    return true;
}


// Pays an ability from life on Blood Magic maps, otherwise from mana.
export function payAbilityCost(cost) {
    if (!cost || cost <= 0) return true;
    if (_bloodMagicActive()) {
        if (!canAffordLifeCost(cost)) return false;
        globalThis.playerCurrentHP -= cost;
        if (typeof globalThis._renderPlayerHealth === 'function') globalThis._renderPlayerHealth();
        return true;
    }
    return spendMana(cost);
}


//------------------------------------------------------------------------
//-------------------------------MANA BAR---------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Updates the sprite mana bar and the legacy HUD bar when either exists.
export function updateClassHUDManaBar() {
    const max = _getPlayerMaxMana();
    const cur = Math.round(Math.max(0, Math.min(globalThis.playerCurrentMana, max)));
    const pct = max > 0 ? (cur / max) * 100 : 0;

    const avatarWrap = document.getElementById('avatar-mana-bar-wrap');
    if (avatarWrap) {
        // Keep the bar visible for the tutorial and classless spells.
        const tqActive = (typeof globalThis._tqIsTutorialActive === 'function') && globalThis._tqIsTutorialActive();
        let classlessSpells = false;
        try {
            classlessSpells = _hotbarClasslessHasSpells();
        } catch (e) { /* best-effort */ }
        if (!STATE.playerClass && !tqActive && !classlessSpells) {
            avatarWrap.style.display = 'none';
        } else {
            avatarWrap.style.display = '';
            const fill = document.getElementById('avatar-mana-fill');
            const text = document.getElementById('avatar-mana-text');
            if (fill) fill.style.width = pct + '%';
            // Value only; the bar's shape carries the maximum.
            if (text) text.innerText = `${cur}`;
        }
    }

    const legacyWrap = document.getElementById('chud-mana-bar-wrap');
    if (legacyWrap) {
        if (max <= 0) legacyWrap.style.display = 'none';
        else legacyWrap.style.display = '';
        const fill = document.getElementById('chud-mana-fill');
        const text = document.getElementById('chud-mana-text');
        if (fill) fill.style.width = pct + '%';
        if (text) text.innerText = `${cur} / ${max}`;
    }
}


//------------------------------------------------------------------------
//-----------------------------REGENERATION & RESET-----------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Passive regen tick - applies the gear manaRegen stat every 5 seconds.
// The loop is created once per page load and skips full or dead pools.
function _ensureManaRegenLoop() {
    if (_manaRegenInterval) return;
    _manaRegenInterval = setInterval(() => {
        if (globalThis.dead) return;
        const stats = (typeof globalThis._egComputePlayerStats === 'function')
            ? globalThis._egComputePlayerStats() : null;
        const regen = MANA_BASE_REGEN + (stats ? (stats.manaRegen || 0) : 0);
        if (regen > 0 && globalThis.playerMaxMana > 0 && globalThis.playerCurrentMana < globalThis.playerMaxMana) {
            gainMana(regen);
        }
    }, MANA_REGEN_INTERVAL_MS);
}


// Resets the live maximum and current pools, then starts regeneration.
export function _resetPlayerMana() {
    const wasAffordable = _allSlotsAffordable();
    globalThis.playerMaxMana = _getPlayerMaxMana();
    globalThis.playerCurrentMana = globalThis.playerMaxMana;
    _ensureManaRegenLoop();
    setTimeout(updateClassHUDManaBar, 0);
    _refreshHUDIfAffordabilityChanged(wasAffordable);
}
