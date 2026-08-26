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

// Scales flat ability mana costs up as the pool grows from gear so late-game
// costs stay meaningful. Below the baseline the def's manaCost is charged as
// defined; every DIVISOR points of max mana beyond the baseline adds +100%
// to all ability costs (e.g. ~900 max mana -> 3x base cost).
// Baseline is the day-one effective pool: 60 base mana + 20 Int x 2.
const MANA_COST_SCALE_BASELINE = 100;
const MANA_COST_SCALE_DIVISOR = 400;

// Lazily created handle for the passive regen tick (null until first use).
let _manaRegenInterval = null;


// Applies the gear-aware cost multiplier to a def's flat manaCost.
// Active map runs can further inflate costs ("% more Mana" mod) — the
// tooltip display and payAbilityCost() both go through here, so they
// always agree.
function _scaleAbilityManaCost(cost) {
    if (!cost || cost <= 0) return 0;
    const maxMana = _getPlayerMaxMana();
    const mult = 1 + Math.max(0, maxMana - MANA_COST_SCALE_BASELINE) / MANA_COST_SCALE_DIVISOR;
    let scaled = cost * mult;
    if (typeof _egGetActiveMapModValue === 'function') {
        const costPct = _egGetActiveMapModValue('map_mana_costs');
        if (costPct > 0) scaled *= (1 + costPct / 100);
    }
    return Math.round(scaled);
}


// Mana is an endgame-only mechanic: in story/campaign levels the pool stays
// empty, the HUD bar hides itself and every ability cost resolves to zero.
function _manaEnabled() {
    return (typeof isEndgameLevel === 'function') && isEndgameLevel();
}


// Returns the player's current maximum mana: base pool + gear/attribute bonus.
// Zero while mana is disabled (storymode), which disables the whole system.
function _getPlayerMaxMana() {
    if (!_manaEnabled()) return 0;
    const base = (typeof EG_PLAYER_STATS !== 'undefined') ? EG_PLAYER_STATS.baseMana : 0;
    const gearBonus = (typeof _egComputePlayerStats === 'function')
        ? _egComputePlayerStats().mana : 0;
    return Math.max(0, Math.round(base + gearBonus));
}


// Returns the mana cost of the ability in the given HUD slot, or 0 when the
// slot has no cost defined (e.g. legacy defs or missing data).
function _getAbilityManaCost(hudSlot) {
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
function canAffordMana(cost) {
    return Math.round(playerCurrentMana) >= cost;
}


// True while a map with the Blood Magic mod is active: ability costs are
// paid from the life pool instead of mana.
function _bloodMagicActive() {
    return (typeof _egMapHasBloodMagic === 'function') && _egMapHasBloodMagic();
}


// Returns true if the current life pool covers the given cost without
// killing the player (casting down to 1 HP is allowed, never to 0).
function canAffordLifeCost(cost) {
    if (!cost || cost <= 0) return true;
    return playerCurrentHP > cost;
}


// Returns true if the ability in the given HUD slot can be paid for right now
// (life under Blood Magic, otherwise mana).
function _abilityCanAfford(hudSlot) {
    const cost = _getAbilityManaCost(hudSlot);
    if (_bloodMagicActive()) return canAffordLifeCost(cost);
    return canAffordMana(cost);
}


// True when every HUD skill slot can currently be paid for. Slots without
// an ability/cost resolve to affordable, so this reflects the worst case.
function _allSlotsAffordable() {
    if (typeof STATE === 'undefined' || !STATE.playerClass) return true;
    return ['active1', 'active2', 'active3', 'active4'].every(
        (s) => (typeof _abilityCanAfford === 'function') ? _abilityCanAfford(s) : true
    );
}

// Rebuilds the class HUD when a pool change flipped any ability between
// affordable and unaffordable, so disabled buttons re-enable (or newly
// unaffordable ones get locked) instead of waiting for an unrelated rebuild.
function _refreshHUDIfAffordabilityChanged(wasAffordable) {
    if (wasAffordable !== _allSlotsAffordable()
        && typeof buildClassHUD === 'function') {
        buildClassHUD();
    }
}


// Adds mana to the pool (clamped to max) and refreshes the bar.
// Reduced by the active map's "% reduced Mana gained" mod during device runs.
// Returns the amount actually gained.
function gainMana(amount) {
    if (!amount || amount <= 0) return 0;
    if (typeof _egMapManaGainMult === 'function') amount *= _egMapManaGainMult();
    amount = Math.round(amount);
    if (amount <= 0) return 0;
    const max = _getPlayerMaxMana();
    if (max <= 0) return 0;
    const wasAffordable = _allSlotsAffordable();
    const before = Math.round(playerCurrentMana);
    playerCurrentMana = Math.min(max, Math.round(playerCurrentMana + amount));
    updateClassHUDManaBar();
    _refreshHUDIfAffordabilityChanged(wasAffordable);
    return playerCurrentMana - before;
}


// Deducts the cost from the pool and refreshes the bar.
// Returns false (pool untouched) when the cost can't be covered.
function spendMana(cost) {
    if (!cost || cost <= 0) return true;
    if (!canAffordMana(cost)) return false;
    const wasAffordable = _allSlotsAffordable();
    playerCurrentMana = Math.round(playerCurrentMana - cost);
    updateClassHUDManaBar();
    _refreshHUDIfAffordabilityChanged(wasAffordable);
    return true;
}


// Pays an active ability's cost: from the life pool under Blood Magic
// (refreshing the HP display), otherwise from mana. Used exclusively by the
// ability cast paths — gear effects like mana-to-damage keep using spendMana()
// so they stay mana-based even on Blood Magic maps.
// Returns false (pools untouched) when the cost can't be covered.
function payAbilityCost(cost) {
    if (!cost || cost <= 0) return true;
    if (_bloodMagicActive()) {
        if (!canAffordLifeCost(cost)) return false;
        playerCurrentHP -= cost;
        if (typeof _renderPlayerHealth === 'function') _renderPlayerHealth();
        return true;
    }
    return spendMana(cost);
}


// Patches the mana bar fill width / label on the class HUD. Safe to call
// any time — no-ops when the bar isn't in the DOM yet.
function updateClassHUDManaBar() {
    const wrap = document.getElementById('chud-mana-bar-wrap');
    if (!wrap) return;

    const max = _getPlayerMaxMana();
    if (max <= 0) { wrap.style.display = 'none'; return; }

    const cur = Math.round(Math.max(0, Math.min(playerCurrentMana, max)));
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
    const wasAffordable = _allSlotsAffordable();
    playerMaxMana = _getPlayerMaxMana();
    playerCurrentMana = playerMaxMana;
    _ensureManaRegenLoop();
    setTimeout(updateClassHUDManaBar, 0);
    _refreshHUDIfAffordabilityChanged(wasAffordable);
}
