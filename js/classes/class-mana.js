import { _getAscendencySlotData } from './class-abilities.js';
import { CLASS_DEFS, ENDGAME_HEARTBLOOM_DEF } from './class-defs.js';
import { buildClassHUD } from './class-hud.js';
import { getSkillRankManaMultForSlot } from '../skills/skill-charms.js';
import { _hotbarClasslessHasSpells } from '../skills/skill-hotbar.js';
import { STATE } from '../state.js';
// class-mana.js
//------------------------------------------------------------------------
//------------------------PLAYER MANA SYSTEM------------------------------
//------------------------------------------------------------------------
// Runtime mana pool used by class abilities. The maximum is derived from
// EG_PLAYER_STATS.baseMana plus the aggregated mana bonus of the equipped
// gear and attributes (_egComputePlayerStats().mana).
//
// Casting an active ability spends its def's manaCost; abilities cannot be
// armed or fired while the pool can't cover the cost.
//
// Loaded after class-abilities.js (uses _getAscendencySlotData) and before
// any gameplay runs. The mana bar itself is rendered by class-hud.js above
// the class HUD drag handle and patched by updateClassHUDManaBar().
//------------------------------------------------------------------------
//------------------------------------------------------------------------

export const MANA_REGEN_INTERVAL_MS = 5000; // Matches "Mana regenerated every 5 seconds"

// Flat regen applied on top of gear manaRegen so the pool always refills
// outside endgame (story levels have no equipment). Tunable in one place.
export const MANA_BASE_REGEN = 4;

// Scales flat ability mana costs up as the pool grows from gear so late-game
// costs stay meaningful. Below the baseline the def's manaCost is charged as
// defined; every DIVISOR points of max mana beyond the baseline adds +100%
// to all ability costs (e.g. ~700 max mana -> 3x base cost).
// Baseline is the day-one effective pool: 60 base mana + 20 Int x 2.
export const MANA_COST_SCALE_BASELINE = 100;
export const MANA_COST_SCALE_DIVISOR = 340;

// Global mana-cost multiplier - the balance lever for "spells cost too
// little". Applied inside _scaleAbilityManaCost, so EVERY cost source
// (class abilities, universal spells, Heartbloom, tutorial Fireball)
// scales identically and tooltips always match what the cast charges.
export const MANA_COST_GLOBAL_MULT = 1.5;

// Lazily created handle for the passive regen tick (null until first use).
export let _manaRegenInterval = null;


// Applies the gear-aware cost multiplier to a def's flat manaCost.
// Active map runs can further inflate costs ("% more Mana" mod) - the
// tooltip display and payAbilityCost() both go through here, so they
// always agree.
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


// Mana is active everywhere: the pool, the bar and ability costs all run in
// story levels as well as endgame maps. (It used to be endgame-only, which
// meant every story-mode ability was free - the spell hotbar now shows a
// mana cost and an unaffordable indicator for every skill.)
export function _manaEnabled() {
    return true;
}


// Returns the player's current maximum mana: base pool + gear/attribute bonus.
// Zero while mana is disabled (storymode), which disables the whole system.
export function _getPlayerMaxMana() {
    if (!_manaEnabled()) return 0;
    const base = (typeof globalThis.EG_PLAYER_STATS !== 'undefined') ? globalThis.EG_PLAYER_STATS.baseMana : 0;
    const gearBonus = (typeof globalThis._egComputePlayerStats === 'function')
        ? globalThis._egComputePlayerStats().mana : 0;
    return Math.max(0, Math.round(base + gearBonus));
}


// Returns the mana cost of the ability in the given HUD slot, or 0 when the
// slot has no cost defined (e.g. legacy defs or missing data).
//
// The cost includes the spell's RANK multiplier (js/skills/skill-charms.js):
// a rank-10 charm costs ~4.45× the rank-1 price. `canAfford` checks, the
// spellbook/hotbar tooltips and the actual spend all funnel through here,
// so the displayed cost is always what gets charged.
export function _getAbilityManaCost(hudSlot) {
    const base = _getAbilityScaledBaseCost(hudSlot);
    if (!base) return base;
    const rankMult = (typeof getSkillRankManaMultForSlot === 'function')
        ? getSkillRankManaMultForSlot(hudSlot) : 1;
    return Math.round(base * rankMult);
}

// Gear-scaled cost before the rank multiplier.
export function _getAbilityScaledBaseCost(hudSlot) {
    if (hudSlot === 'active5') {
        if (!STATE.playerClass || !_manaEnabled()) return 0;
        const def = (typeof ENDGAME_HEARTBLOOM_DEF !== 'undefined') ? ENDGAME_HEARTBLOOM_DEF : null;
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
        const def = (typeof CLASS_DEFS !== 'undefined') ? CLASS_DEFS[STATE.playerClass] : null;
        return _scaleAbilityManaCost((def && def[hudSlot] && def[hudSlot].manaCost) || 0);
    }

    // Ascendency slots (active3 / active4)
    if (typeof _getAscendencySlotData !== 'function') return 0;
    const slotData = _getAscendencySlotData(hudSlot);
    if (!slotData) return 0;
    const skill = slotData.asc[slotData.ascSlot];
    return _scaleAbilityManaCost((skill && skill.manaCost) || 0);
}


// Returns true if the current mana pool covers the given cost.
export function canAffordMana(cost) {
    return Math.round(globalThis.playerCurrentMana) >= cost;
}


// True while a map with the Blood Magic mod is active: ability costs are
// paid from the life pool instead of mana.
export function _bloodMagicActive() {
    return (typeof globalThis._egMapHasBloodMagic === 'function') && globalThis._egMapHasBloodMagic();
}


// Returns true if the current life pool covers the given cost without
// killing the player (casting down to 1 HP is allowed, never to 0).
export function canAffordLifeCost(cost) {
    if (!cost || cost <= 0) return true;
    return globalThis.playerCurrentHP > cost;
}


// Returns true if the ability in the given HUD slot can be paid for right now
// (life under Blood Magic, otherwise mana).
export function _abilityCanAfford(hudSlot) {
    const cost = _getAbilityManaCost(hudSlot);
    if (_bloodMagicActive()) return canAffordLifeCost(cost);
    return canAffordMana(cost);
}


// True when every HUD skill slot can currently be paid for. Slots without
// an ability/cost resolve to affordable, so this reflects the worst case.
export function _allSlotsAffordable() {
    if (typeof STATE === 'undefined' || !STATE.playerClass) return true;
    return ['active1', 'active2', 'active3', 'active4', 'active5'].every(
        (s) => (typeof _abilityCanAfford === 'function') ? _abilityCanAfford(s) : true
    );
}

// Rebuilds the class HUD when a pool change flipped any ability between
// affordable and unaffordable, so disabled buttons re-enable (or newly
// unaffordable ones get locked) instead of waiting for an unrelated rebuild.
export function _refreshHUDIfAffordabilityChanged(wasAffordable) {
    if (typeof buildClassHUD === 'function') {
        buildClassHUD();
    }
}


// Adds mana to the pool (clamped to max) and refreshes the bar.
// Reduced by the active map's "% reduced Mana gained" mod during device runs.
// Returns the amount actually gained.
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


// Deducts the cost from the pool and refreshes the bar.
// Returns false (pool untouched) when the cost can't be covered.
export function spendMana(cost) {
    if (!cost || cost <= 0) return true;
    if (!canAffordMana(cost)) return false;
    const wasAffordable = _allSlotsAffordable();
    globalThis.playerCurrentMana = Math.round(globalThis.playerCurrentMana - cost);
    updateClassHUDManaBar();
    _refreshHUDIfAffordabilityChanged(wasAffordable);
    return true;
}


// Pays an active ability's cost: from the life pool under Blood Magic
// (refreshing the HP display), otherwise from mana. Used exclusively by the
// ability cast paths - gear effects like mana-to-damage keep using spendMana()
// so they stay mana-based even on Blood Magic maps.
// Returns false (pools untouched) when the cost can't be covered.
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


// Patches the mana bar that now lives on the player sprite (see
// _renderPlayerAvatarSimple in player_sprite.js). Safe to call any time -
// no-ops when the bar isn't in the DOM yet. The old class-HUD element ids
// are still honoured in case a stale element lingers during a rebuild.
export function updateClassHUDManaBar() {
    const max = _getPlayerMaxMana();
    const cur = Math.round(Math.max(0, Math.min(globalThis.playerCurrentMana, max)));
    const pct = max > 0 ? (cur / max) * 100 : 0;

    const avatarWrap = document.getElementById('avatar-mana-bar-wrap');
    if (avatarWrap) {
        // Hide the whole bar while there is no class / pool (menus, classless) -
        // EXCEPT during the tutorial (its puzzle-3 mana lesson points at the
        // bar while the player is still classless) and for pre-class
        // characters that already own something castable (a hotbar spell, a
        // slotted charm, or an inventory charm) - universal spells cost mana
        // and need the bar visible (base pool exists either way).
        const tqActive = (typeof globalThis._tqIsTutorialActive === 'function') && globalThis._tqIsTutorialActive();
        let classlessSpells = false;
        try {
            if (typeof _hotbarClasslessHasSpells === 'function') classlessSpells = _hotbarClasslessHasSpells();
        } catch (e) { /* best-effort */ }
        if (!STATE.playerClass && !tqActive && !classlessSpells) {
            avatarWrap.style.display = 'none';
        } else {
            avatarWrap.style.display = '';
            const fill = document.getElementById('avatar-mana-fill');
            const text = document.getElementById('avatar-mana-text');
            if (fill) fill.style.width = pct + '%';
            // Value only - the bar's shape carries the maximum (same label
            // recipe as the health bar above the sprite).
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


// Passive regen tick - applies the gear manaRegen stat every 5 seconds.
// The loop is created once per page load and simply no-ops while the pool
// is full or empty.
export function _ensureManaRegenLoop() {
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


// Resets the mana pool to full based on base mana plus the current gear
// bonus. Called at level start alongside _resetPlayerHP(). Chain puzzle
// transitions deliberately keep both pools topped up as they were.
export function _resetPlayerMana() {
    const wasAffordable = _allSlotsAffordable();
    globalThis.playerMaxMana = _getPlayerMaxMana();
    globalThis.playerCurrentMana = globalThis.playerMaxMana;
    _ensureManaRegenLoop();
    setTimeout(updateClassHUDManaBar, 0);
    _refreshHUDIfAffordabilityChanged(wasAffordable);
}
