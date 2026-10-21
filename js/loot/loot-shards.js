import { trackAchStat } from '../achievements/achievements.js';
import { Audio_Manager } from '../audio/audio.js';
import { t } from '../translation/translations.js';
import { _pendingCurrencyUse } from './loot-currency-use.js';
import { _egRenderMapSlot, _egRenderMapStashCell } from '../endgame/endgame-gate.js';
import { _dndChipScreenEl, _renderCurrencyCell, addCurrency } from '../hub/hub-drag-and-drop.js';
import { _clearTooltip } from '../hub/hub-tooltips.js';
import { CURRENCY_COLS, _currencySlotForId, _currencyStash, _egGetMapTierGrid, _inventory, _renderInventoryCell, _updateInvCount, saveHubState } from '../hub/hub.js';

//------------------------------------------------------------------------
//-------------------ORB SHARDS (SELL SYSTEM)-----------------------------
//------------------------------------------------------------------------
// Ctrl + left-click destroys a stash item and grants one orb shard (maps
// grant a Horizon Fragment). Shard quality scales with the item's stat count.
// A full stack (10, or 3 for Horizon) converts into the matching orb.
//------------------------------------------------------------------------

//------------------------------------------------------------------------
//-------------------SHARD DEFINITIONS------------------------------------
//------------------------------------------------------------------------

// Each shard maps 1:1 to its parent orb. Names and descriptions are looked up
// through t() on every read (see the getters below the table).

const SHARD_STACK_MAX = 10;
const SHARD_HORIZON_STACK_MAX = 3;

export const SHARD_DEFS = {
    shard_transmutation: {
        id: 'shard_transmutation', orbId: 'orb_transmutation',
        icon: '🔸', orbIcon: '🔷',
        name: t('eg_shard_transmutation'),
        description: t('eg_shard_transmutation_desc'),
    },
    shard_alchemy: {
        id: 'shard_alchemy', orbId: 'orb_alchemy',
        icon: '🔶', orbIcon: '🟡',
        name: t('eg_shard_alchemy'),
        description: t('eg_shard_alchemy_desc'),
    },
    shard_chaos: {
        id: 'shard_chaos', orbId: 'orb_chaos',
        icon: '🌀', orbIcon: '🟠',
        name: t('eg_shard_chaos'),
        description: t('eg_shard_chaos_desc'),
    },
    shard_elevation: {
        id: 'shard_elevation', orbId: 'orb_elevation',
        icon: '🌟', orbIcon: '✨',
        name: t('eg_shard_elevation'),
        description: t('eg_shard_elevation_desc'),
    },
    // Map-only sell currency: granted when a map item is sold
    // (Ctrl + left-click). 3 fragments merge into an Orb of Horizons.
    shard_horizon: {
        id: 'shard_horizon', orbId: 'orb_horizons',
        icon: '🧭', orbIcon: '🌌',
        name: t('eg_shard_horizon'),
        description: t('eg_shard_horizon_desc'),
        stackSize: SHARD_HORIZON_STACK_MAX,
    },
    shard_ascension: {
        id: 'shard_ascension', orbId: 'orb_ascension',
        icon: '💠', orbIcon: '🔮',
        name: t('eg_shard_ascension'),
        description: t('eg_shard_ascension_desc'),
    },
    shard_cataclysm: {
        id: 'shard_cataclysm', orbId: 'orb_cataclysm',
        icon: '☄️', orbIcon: '💥',
        name: t('eg_shard_cataclysm'),
        description: t('eg_shard_cataclysm_desc'),
    },
    shard_ancient: {
        id: 'shard_ancient', orbId: 'orb_ancient',
        icon: '🪨', orbIcon: '🏺',
        name: t('eg_shard_ancient'),
        description: t('eg_shard_ancient_desc'),
    },
    shard_bloom: {
        id: 'shard_bloom', orbId: 'orb_bloom',
        icon: '🍃', orbIcon: '🌸',
        name: t('eg_shard_bloom'),
        description: t('eg_shard_bloom_desc'),
    },
};

// Replace the fixed name/description with live lookups so a language switch applies.
for (const [id, def] of Object.entries(SHARD_DEFS)) {
    const nameKey = `eg_${id}`;
    Object.defineProperties(def, {
        name: { enumerable: true, get: () => t(nameKey) },
        description: { enumerable: true, get: () => t(`${nameKey}_desc`) },
    });
}


//------------------------------------------------------------------------
//-------------------SHARD ROLL (QUALITY BY STAT COUNT)-------------------
//------------------------------------------------------------------------

// Base drop weights - ordered from worst to best. `statScale` determines
// how strongly the sold item's stat count boosts that shard's weight:
// effectiveWeight = weight * (1 + statCount * statScale).
// The epic-affecting shards (ascension / elevation / cataclysm) have the
// highest scaling so stat-rich items yield better shards more often.
const SHARD_ROLL_TABLE = [
    { id: 'shard_transmutation', weight: 220, statScale: 0.00 },
    { id: 'shard_alchemy',       weight: 200, statScale: 0.06 },
    { id: 'shard_chaos',         weight: 90,  statScale: 0.14 },
    { id: 'shard_bloom',         weight: 85,  statScale: 0.10 },
    { id: 'shard_elevation',     weight: 45,  statScale: 0.24 },
    { id: 'shard_ascension',     weight: 75,  statScale: 0.32 },
    { id: 'shard_cataclysm',     weight: 15,  statScale: 0.42 },
];

// Counts the total number of rolled stats on an item (each mod carries one
// or more rolledStats entries; hybrid mods roll two stats at once).
function _countItemStats(item) {
    if (!item || !Array.isArray(item.mods)) return 0;
    let count = 0;
    for (const mod of item.mods) {
        if (Array.isArray(mod.rolledStats)) count += mod.rolledStats.length;
    }
    return count;
}

// Rolls a random shard def for the given item. Higher stat counts shift
// probability toward the better (epic-grade) shards.
export function _rollShardForItem(item) {
    const statCount = _countItemStats(item);

    const weights = SHARD_ROLL_TABLE.map(entry => ({
        id: entry.id,
        w: entry.weight * (1 + statCount * entry.statScale),
    }));
    const total = weights.reduce((s, e) => s + e.w, 0);

    let roll = Math.random() * total;
    for (const entry of weights) {
        roll -= entry.w;
        if (roll <= 0) return SHARD_DEFS[entry.id];
    }
    return SHARD_DEFS.shard_transmutation;
}


//------------------------------------------------------------------------
//-------------------ADD SHARD TO RUNES & ORBS STRIP----------------------
//------------------------------------------------------------------------

// Adds `amount` of a shard type to its fixed currency slot. Every full stack
// (10, or 3 for Horizon Fragments) converts into the parent orb via
// addCurrency(). Returns true when granted.
export function addShard(id, amount = 1, def = null) {
    const shardDef = def || SHARD_DEFS[id];
    if (!shardDef) return false;
    const stackMax = shardDef.stackSize || SHARD_STACK_MAX;
    const pos = _currencySlotForId(id);
    if (!pos) {
        console.warn(`[Shards] No fixed slot for "${id}".`);
        return false;
    }
    const r = pos.r, c = pos.c;
    if (!_currencyStash[r]) _currencyStash[r] = Array(CURRENCY_COLS).fill(null);
    const cell = _currencyStash[r][c];
    if (cell && cell.id === id) {
        cell.count = (cell.count || 0) + amount;
        while (cell.count >= stackMax) {
            cell.count -= stackMax;
            _convertShardsToOrb(shardDef);
        }
        if (cell.count <= 0) _currencyStash[r][c] = null;
        _renderCurrencyCell(r, c);
        return true;
    }
    if (cell && cell.id !== id) {
        console.warn(`[Shards] Slot [${r},${c}] occupied by different id "${cell.id}"`);
        return false;
    }
    // Empty slot
    let count = amount;
    let orbsFromNew = 0;
    while (count >= stackMax) {
        count -= stackMax;
        orbsFromNew++;
    }
    if (count > 0) {
        _currencyStash[r][c] = {
            id,
            name: shardDef.name,
            icon: shardDef.icon,
            rarity: 'currency',
            category: 'currency',
            description: shardDef.description,
            count: count,
        };
    } else {
        _currencyStash[r][c] = null;
    }
    _renderCurrencyCell(r, c);
    for (let i = 0; i < orbsFromNew; i++) _convertShardsToOrb(shardDef);
    return true;
}

// Returns the translation key of a parent orb's name (null for unknown ids).
function _shardOrbNameKey(orbId) {
    switch (orbId) {
        case 'orb_transmutation': return 'eg_orb_transmutation';
        case 'orb_alchemy':       return 'eg_orb_alchemy';
        case 'orb_chaos':         return 'eg_orb_chaos';
        case 'orb_bloom':         return 'eg_orb_bloom';
        case 'orb_elevation':     return 'eg_orb_elevation';
        case 'orb_horizons':      return 'eg_orb_horizons';
        case 'orb_ascension':     return 'eg_orb_ascension';
        case 'orb_cataclysm':     return 'eg_orb_cataclysm';
        case 'orb_ancient':       return 'eg_orb_ancient';
        default:                  return null;
    }
}

// Consumes one full shard stack and grants the parent orb (an existing orb
// stack just goes up by one).
function _convertShardsToOrb(shardDef) {
    const nameKey = _shardOrbNameKey(shardDef.orbId);
    addCurrency(shardDef.orbId, 1, {
        id: shardDef.orbId,
        name: nameKey ? t(nameKey) : shardDef.orbId,
        icon: shardDef.orbIcon,
        rarity: 'currency',
        category: 'currency',
        description: nameKey ? t(nameKey + '_desc') : '',
    });
    const stackMax = shardDef.stackSize || SHARD_STACK_MAX;
    Audio_Manager.playSFX('shard_convert');
    globalThis.showToast(t('eg_shards_converted')
        .replace('{count}', String(stackMax))
        .replace('{shard}', shardDef.name)
        .replace('{icon}', shardDef.orbIcon)
        .replace('{orb}', nameKey ? t(nameKey) : shardDef.orbId));
    try { trackAchStat('egShardsConverted', 1); } catch(e){}
}


//------------------------------------------------------------------------
//-------------------SELLING (CTRL + LEFT-CLICK ON STASH ITEM)------------
//------------------------------------------------------------------------

// Destroys the stash item in the given cell and grants one rolled shard.
// Selling a UNIQUE item always grants an Ancient Shard (10 → Ancient Orb).
// No confirmation popup - the sale is instant. Returns true on success.
function _sellStashItem(row, col) {
    const item = _inventory[row][col];
    if (!item) return false;

    // Free starter gear has no sell value: it is destroyed without
    // granting a shard (blocks the free-buy → sell-for-shard exploit).
    if (item.noSellValue) {
        _inventory[row][col] = null;
        _renderInventoryCell(row, col);
        _updateInvCount();
        _clearTooltip();
        saveHubState();

        Audio_Manager.playSFX('player_equip_pickup');
        globalThis.showToast(t('eg_sell_item_no_value').replace('{name}', item.name || '???'));
        return true;
    }

    // Unique items → Ancient Shard (bypasses the random roll).
    const shardDef = (item.isUnique && SHARD_DEFS.shard_ancient)
        ? SHARD_DEFS.shard_ancient
        : _rollShardForItem(item);
    if (!addShard(shardDef.id, 1)) {
        // Could not grant the shard (runes & orbs strip full) - keep the item.
        const grid = document.getElementById('sx-inv-grid');
        if (grid) {
            grid.classList.add('sx-slot-reject');
            setTimeout(() => grid.classList.remove('sx-slot-reject'), 600);
        }
        return false;
    }

    // Item is consumed - clear its cell and close any open tooltip.
    _inventory[row][col] = null;
    _renderInventoryCell(row, col);
    _updateInvCount();
    _clearTooltip();
    saveHubState();

    Audio_Manager.playSFX('item_sell');
    globalThis.showToast(t('eg_sell_item_sold')
        .replace('{name}', item.name || '???')
        .replace('{icon}', shardDef.icon)
        .replace('{shard}', shardDef.name));
    try { trackAchStat('egItemsSold', 1); } catch(e){}
    return true;
}

// Destroys a map item and grants exactly one Horizon Fragment (the
// map-only sell currency). Shared by map-stash and map-device sells.
// Returns true on success.
function _sellMapItem(map, sourceEl) {
    if (!map) return false;

    const shardDef = SHARD_DEFS.shard_horizon;
    if (!addShard(shardDef.id, 1)) {
        // Could not grant the fragment (runes & orbs strip full) - keep the map.
        if (sourceEl) {
            sourceEl.classList.add('sx-slot-reject');
            setTimeout(() => sourceEl.classList.remove('sx-slot-reject'), 600);
        }
        return false;
    }

    _clearTooltip();
    Audio_Manager.playSFX('item_sell');
    globalThis.showToast(t('eg_sell_item_sold')
        .replace('{name}', map.name || '???')
        .replace('{icon}', shardDef.icon)
        .replace('{shard}', shardDef.name));
    return true;
}

// Sells the map in the given map stash cell for one Horizon Fragment.
function _egSellMapStashItem(row, col) {
    const activeTier = (typeof _egMapStashActiveTier !== 'undefined' ? globalThis._egMapStashActiveTier : 1);
    let map = null;
    try { map = _egGetMapTierGrid(activeTier)[row][col]; } catch(e) { map = null; }
    if (!map) return false;

    const cellEl = document.querySelector(
        `.eg-map-stash-cell[data-row="${row}"][data-col="${col}"]`);
    if (!_sellMapItem(map, cellEl)) return false;

    try { _egGetMapTierGrid(activeTier)[row][col] = null; } catch(e) {}
    _egRenderMapStashCell(row, col);
    saveHubState();
    return true;
}

// Sells the map currently loaded into the Probability Gate device slot
// for one Horizon Fragment.
function _sellDeviceMap() {
    const map = globalThis._egMapSlotItem;
    if (!map) return false;

    const slotEl = document.getElementById('eg-map-slot');
    if (!_sellMapItem(map, slotEl)) return false;

    globalThis._egMapSlotItem = null;
    _egRenderMapSlot();
    saveHubState();
    return true;
}

// Capture-phase Ctrl + left-click handler for the main stash, the map stash
// and the map device slot. Equipment sells into a random shard, maps into a
// Horizon Fragment. Registered at load so it runs before the drag-and-drop
// pick-up listener, and stops that listener from also grabbing the item.
document.addEventListener('mousedown', function (e) {
    if (!e.ctrlKey || e.button !== 0) return;

    const chip = e.target.closest('.sx-item-chip');
    const onManagedScreen = !!chip && !!_dndChipScreenEl(chip);
    if (!onManagedScreen) return;

    // Don't sell while an orb "use mode" selection is active - the click
    // belongs to applying the orb.
    if (_pendingCurrencyUse) return;

    const invCell = chip.closest('.sx-inv-cell:not(.sx-currency-cell):not(.eg-map-stash-cell)');
    const mapStashCell = chip.closest('.eg-map-stash-cell');
    const mapSlotEl = chip.closest('#eg-map-slot');
    if (!invCell && !mapStashCell && !mapSlotEl) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    if (mapSlotEl) {
        _sellDeviceMap();
        return;
    }
    if (mapStashCell) {
        _egSellMapStashItem(+mapStashCell.dataset.row, +mapStashCell.dataset.col);
        return;
    }
    _sellStashItem(+invCell.dataset.row, +invCell.dataset.col);
}, true);
