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

const MANA_REGEN_INTERVAL_MS = 5000; // Matches "Mana regenerated every 5 seconds"

// Lazily created handle for the passive regen tick (null until first use).
let _manaRegenInterval = null;


// Returns the player's current maximum mana: base pool + gear/attribute bonus.
function _getPlayerMaxMana() {
    const base = (typeof EG_PLAYER_STATS !== 'undefined') ? EG_PLAYER_STATS.baseMana : 0;
    const gearBonus = (typeof _egComputePlayerStats === 'function')
        ? _egComputePlayerStats().mana : 0;
    return Math.max(0, Math.round(base + gearBonus));
}


// Returns the mana cost of the ability in the given HUD slot, or 0 when the
// slot has no cost defined (e.g. legacy defs or missing data).
function _getAbilityManaCost(hudSlot) {
    if (!STATE.playerClass) return 0;

    if (hudSlot === 'active1' || hudSlot === 'active2') {
        const def = (typeof CLASS_DEFS !== 'undefined') ? CLASS_DEFS[STATE.playerClass] : null;
        return (def && def[hudSlot] && def[hudSlot].manaCost) || 0;
    }

    // Ascendency slots (active3 / active4)
    if (typeof _getAscendencySlotData !== 'function') return 0;
    const slotData = _getAscendencySlotData(hudSlot);
    if (!slotData) return 0;
    const skill = slotData.asc[slotData.ascSlot];
    return (skill && skill.manaCost) || 0;
}


// Returns true if the current mana pool covers the given cost.
function canAffordMana(cost) {
    return playerCurrentMana >= cost;
}


// Returns true if the ability in the given HUD slot can be paid for right now.
function _abilityCanAfford(hudSlot) {
    return canAffordMana(_getAbilityManaCost(hudSlot));
}


// Adds mana to the pool (clamped to max) and refreshes the bar.
// Returns the amount actually gained.
function gainMana(amount) {
    if (!amount || amount <= 0) return 0;
    const max = _getPlayerMaxMana();
    if (max <= 0) return 0;
    const before = playerCurrentMana;
    playerCurrentMana = Math.min(max, playerCurrentMana + amount);
    updateClassHUDManaBar();
    return playerCurrentMana - before;
}


// Deducts the cost from the pool and refreshes the bar.
// Returns false (pool untouched) when the cost can't be covered.
function spendMana(cost) {
    if (!cost || cost <= 0) return true;
    if (!canAffordMana(cost)) return false;
    playerCurrentMana -= cost;
    updateClassHUDManaBar();
    return true;
}


// Patches the mana bar fill width / label on the class HUD. Safe to call
// any time — no-ops when the bar isn't in the DOM yet.
function updateClassHUDManaBar() {
    const wrap = document.getElementById('chud-mana-bar-wrap');
    if (!wrap) return;

    const max = _getPlayerMaxMana();
    if (max <= 0) { wrap.style.display = 'none'; return; }

    const cur = Math.max(0, Math.min(playerCurrentMana, max));
    const pct = (cur / max) * 100;
    document.getElementById('chud-mana-fill').style.width = pct + '%';
    document.getElementById('chud-mana-text').innerText = `${cur} / ${max}`;
}


// Passive regen tick — applies the gear manaRegen stat every 5 seconds.
// The loop is created once per page load and simply no-ops while the pool
// is full or empty.
function _ensureManaRegenLoop() {
    if (_manaRegenInterval) return;
    _manaRegenInterval = setInterval(() => {
        if (dead) return;
        const stats = (typeof _egComputePlayerStats === 'function')
            ? _egComputePlayerStats() : null;
        const regen = stats ? (stats.manaRegen || 0) : 0;
        if (regen > 0 && playerMaxMana > 0 && playerCurrentMana < playerMaxMana) {
            gainMana(regen);
        }
    }, MANA_REGEN_INTERVAL_MS);
}


// Resets the mana pool to full based on base mana plus the current gear
// bonus. Called at level start alongside _resetPlayerHP(). Chain puzzle
// transitions deliberately keep both pools topped up as they were.
function _resetPlayerMana() {
    playerMaxMana = _getPlayerMaxMana();
    playerCurrentMana = playerMaxMana;
    _ensureManaRegenLoop();
    setTimeout(updateClassHUDManaBar, 0);
}
