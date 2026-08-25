//------------------------------------------------------------------------
//-------------------ENDGAME ORB SHARDS (SELL SYSTEM)---------------------
//------------------------------------------------------------------------
// Orb shards are fragments of currency orbs obtained by "selling" an item
// from the main stash via Ctrl + left-click. The sold item is destroyed
// without any confirmation popup and grants exactly one shard.
//
// Shard quality scales with the number of stats on the sold item — the
// more stats, the higher the chance for a better shard ("better" = a shard
// that transmutes into an orb affecting epic-grade gear).
//
// Shards live in the runes & orbs strip like normal currency. They stack
// up to 20; reaching 20 automatically converts the stack into the matching
// orb (or just bumps the existing orb counter).
//
// Load AFTER endgame-hub.js and endgame-hub-drag-and-drop.js (needs
// _egInventory, _egRenderInventoryCell, egAddCurrency, egSaveHubState,
// showToast) and AFTER endgame-currency.js (needs _egPendingCurrencyUse).
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//-------------------SHARD DEFINITIONS------------------------------------
//------------------------------------------------------------------------

// Each shard maps 1:1 to its parent orb. name/description are resolved
// through t() so translations stay in translations-strings.js.

const EG_SHARD_STACK_MAX = 10;

const EG_SHARD_DEFS = {
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
};


//------------------------------------------------------------------------
//-------------------SHARD ROLL (QUALITY BY STAT COUNT)-------------------
//------------------------------------------------------------------------

// Base drop weights — ordered from worst to best. `statScale` determines
// how strongly the sold item's stat count boosts that shard's weight:
// effectiveWeight = weight * (1 + statCount * statScale).
// The epic-affecting shards (ascension / elevation / cataclysm) have the
// highest scaling so stat-rich items yield better shards more often.
const EG_SHARD_ROLL_TABLE = [
    { id: 'shard_transmutation', weight: 400, statScale: 0.00 },
    { id: 'shard_alchemy',       weight: 200, statScale: 0.06 },
    { id: 'shard_chaos',         weight: 90,  statScale: 0.14 },
    { id: 'shard_elevation',     weight: 45,  statScale: 0.24 },
    { id: 'shard_ascension',     weight: 30,  statScale: 0.32 },
    { id: 'shard_cataclysm',     weight: 15,  statScale: 0.42 },
];

// Counts the total number of rolled stats on an item (each mod carries one
// or more rolledStats entries; hybrid mods roll two stats at once).
function _egCountItemStats(item) {
    if (!item || !Array.isArray(item.mods)) return 0;
    let count = 0;
    for (const mod of item.mods) {
        if (Array.isArray(mod.rolledStats)) count += mod.rolledStats.length;
    }
    return count;
}

// Rolls a random shard def for the given item. Higher stat counts shift
// probability toward the better (epic-grade) shards.
function _egRollShardForItem(item) {
    const statCount = _egCountItemStats(item);

    const weights = EG_SHARD_ROLL_TABLE.map(entry => ({
        id: entry.id,
        w: entry.weight * (1 + statCount * entry.statScale),
    }));
    const total = weights.reduce((s, e) => s + e.w, 0);

    let roll = Math.random() * total;
    for (const entry of weights) {
        roll -= entry.w;
        if (roll <= 0) return EG_SHARD_DEFS[entry.id];
    }
    return EG_SHARD_DEFS.shard_transmutation;
}


//------------------------------------------------------------------------
//-------------------ADD SHARD TO RUNES & ORBS STRIP----------------------
//------------------------------------------------------------------------

// Adds `amount` of a shard type to the currency stash with a stack cap of
// EG_SHARD_STACK_MAX. Every full stack automatically converts into the
// shard's parent orb via egAddCurrency() (which merges into an existing
// orb stack if present). Returns true when the shard was granted.
function egAddShard(id, amount = 1, def = null) {
    const shardDef = def || EG_SHARD_DEFS[id];
    if (!shardDef) return false;

    // Try to add to an existing stack first.
    for (let r = 0; r < EG_CURRENCY_ROWS; r++) {
        for (let c = 0; c < EG_CURRENCY_COLS; c++) {
            const cell = _egCurrencyStash[r][c];
            if (!cell || cell.id !== id) continue;

            cell.count = (cell.count || 0) + amount;
            while (cell.count >= EG_SHARD_STACK_MAX) {
                cell.count -= EG_SHARD_STACK_MAX;
                _egConvertShardsToOrb(shardDef);
            }
            if (cell.count <= 0) _egCurrencyStash[r][c] = null;
            _egRenderCurrencyCell(r, c);
            return true;
        }
    }

    // No existing stack — place a new one in the first free cell.
    for (let r = 0; r < EG_CURRENCY_ROWS; r++) {
        for (let c = 0; c < EG_CURRENCY_COLS; c++) {
            if (_egCurrencyStash[r][c]) continue;
            _egCurrencyStash[r][c] = {
                id,
                name: shardDef.name,
                icon: shardDef.icon,
                rarity: 'currency',
                category: 'currency',
                description: shardDef.description,
                count: amount,
            };
            _egRenderCurrencyCell(r, c);
            return true;
        }
    }

    console.warn(`[Shards] Currency stash is full, could not add "${id}".`);
    return false;
}

// Resolves the translation key of a shard's parent orb name.
function _egShardOrbNameKey(orbId) {
    switch (orbId) {
        case 'orb_transmutation': return 'eg_orb_transmutation';
        case 'orb_alchemy':       return 'eg_orb_alchemy';
        case 'orb_chaos':         return 'eg_orb_chaos';
        case 'orb_elevation':     return 'eg_orb_elevation';
        case 'orb_ascension':     return 'eg_orb_ascension';
        case 'orb_cataclysm':     return 'eg_orb_cataclysm';
        default:                  return null;
    }
}

// Consumes one full shard stack and grants the parent orb. The orb is
// added through egAddCurrency so an existing orb stack just increments.
function _egConvertShardsToOrb(shardDef) {
    const nameKey = _egShardOrbNameKey(shardDef.orbId);
    egAddCurrency(shardDef.orbId, 1, {
        id: shardDef.orbId,
        name: nameKey ? t(nameKey) : shardDef.orbId,
        icon: shardDef.orbIcon,
        rarity: 'currency',
        category: 'currency',
        description: nameKey ? t(nameKey + '_desc') : '',
    });
    showToast(t('eg_shards_converted')
        .replace('{shard}', shardDef.name)
        .replace('{icon}', shardDef.orbIcon)
        .replace('{orb}', nameKey ? t(nameKey) : shardDef.orbId));
}


//------------------------------------------------------------------------
//-------------------SELLING (CTRL + LEFT-CLICK ON STASH ITEM)------------
//------------------------------------------------------------------------

// Destroys the stash item in the given cell and grants one rolled shard.
// No confirmation popup — the sale is instant. Returns true on success.
function _egSellStashItem(row, col) {
    const item = _egInventory[row][col];
    if (!item) return false;

    const shardDef = _egRollShardForItem(item);
    if (!egAddShard(shardDef.id, 1)) {
        // Could not grant the shard (runes & orbs strip full) — keep the item.
        const grid = document.getElementById('eg-inv-grid');
        if (grid) {
            grid.classList.add('eg-slot-reject');
            setTimeout(() => grid.classList.remove('eg-slot-reject'), 600);
        }
        return false;
    }

    // Item is consumed — clear its cell and close any open tooltip.
    _egInventory[row][col] = null;
    _egRenderInventoryCell(row, col);
    _egUpdateInvCount();
    _egClearTooltip();
    egSaveHubState();

    if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) {
        Audio_Manager.playSFX('player_equip_pickup');
    }
    showToast(t('eg_sell_item_sold')
        .replace('{name}', item.name || '???')
        .replace('{icon}', shardDef.icon)
        .replace('{shard}', shardDef.name));
    return true;
}

// Capture-phase mousedown handler — intercepts Ctrl + left-click on items
// in the MAIN stash only (not paperdoll, map stash or runes & orbs cells).
// Registered at script load time so it fires before the DnD pick-up
// listener (bound later at hub-open time); stopImmediatePropagation keeps
// the drag system from also picking the item up.
document.addEventListener('mousedown', function (e) {
    if (!e.ctrlKey || e.button !== 0) return;

    const chip = e.target.closest('.eg-item-chip');
    if (!chip || !chip.closest('#screen-endgame-hub')) return;

    // Don't sell while an orb "use mode" selection is active — the click
    // belongs to applying the orb.
    if (typeof _egPendingCurrencyUse !== 'undefined' && _egPendingCurrencyUse) return;

    const invCell = chip.closest('.eg-inv-cell:not(.eg-currency-cell):not(.eg-map-stash-cell)');
    if (!invCell) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    const r = +invCell.dataset.row, c = +invCell.dataset.col;
    _egSellStashItem(r, c);
}, true);
