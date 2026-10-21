//------------------------------------------------------------------------
//-------------------HUB SAVE & LOAD--------------------------------------
//------------------------------------------------------------------------
// Saves the hub mirrors (stash, equipment, currency, essences, uniques, map
// stash) into STATE and loads them back. saveHubState is the single way hub
// data reaches the save; _loadHubState runs once at page load and heals,
// migrates and re-slots legacy saves on the way in. The two lets below are
// reassigned by other files through the globalThis accessors.
//------------------------------------------------------------------------

import { ACH_STATE, setAchStat } from '../achievements/achievements.js';
import { STATE, save } from '../state.js';
import { t } from '../translation/translations.js';
import { egAtlasNodeById, egAtlasProgress } from '../endgame/endgame-atlas.js';
import { CURRENCY_DEFS } from '../loot/loot-currency.js';
import { ESSENCE_COLS, ESSENCE_ROWS, _essenceIdForSlot, _essenceSlotForId } from '../loot/loot-essences.js';
import { ESSENCE_DEFS, _essenceDefForId } from '../loot/loot-essences-defs.js';
import { getGold } from '../loot/loot-gold.js';
import { _ensureUniqueStash } from './hub-uniques.js';
import { _showStashInfo } from './hub.js';
import { _healItemImplicits } from '../loot/loot-implicits.js';
import { _getPlayerLevel } from './hub-leveling.js';
import { _loadLootFilter } from '../loot/loot-filter.js';
import { _healWeaponHands, _isTwoHandedWeapon, _migrateIllegalHandsToStash } from '../loot/loot-requirements.js';
import { SHARD_DEFS } from '../loot/loot-shards.js';
import { CURRENCY_COLS, CURRENCY_ROWS, _currencyDefForId, _currencySlotForId, _currencyStash } from '../loot/hub-currency.js';
import { EG_MAP_STASH_COLS, EG_MAP_STASH_INITIAL_ROWS, EG_MAP_TIER_COUNT, _egIsTieredMapStash, _egMakeAllMapStashes, _egMakeMapTierGrid, _egMapStash, _egMapTierToIndex } from '../endgame/endgame-map-stash.js';
import { _loadMassSellSettings, _massSellKeep, _massSellKeepUnique, _massSellMinItemLevel, _massSellMinReqLevel } from './hub-mass-sell.js';
import { INV_COLS, INV_INITIAL_ROWS, _ensureInvRows, _equipped, _inventory } from './hub-stash.js';
import { _healUniqueItem } from '../loot/unique-item-heal.js';
import { _healItemRequirements } from '../loot/equipment-base-types.js';
try { Object.defineProperty(globalThis, '_pendingHandMigrationToast', { get() { return _pendingHandMigrationToast; }, set(v) { _pendingHandMigrationToast = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_loadHubState', { get() { return _loadHubState; }, set(v) { _loadHubState = v; }, configurable: true }); } catch (e) {}


//------------------------------------------------------------------------
//-------------------SAVING-----------------------------------------------
//------------------------------------------------------------------------

// Writes all hub mirrors back into STATE and saves.
export function saveHubState() {
    // Safety interlock: refuse to write while the hub load failed or has not
    // finished - the mirrors may still be empty defaults and writing them back
    // would wipe the real stash (this once destroyed a level-97 stash). Writes
    // from inside the load are the exception (_hubLoadInProgress): they save
    // heal / migration results from mirrors just read from STATE. The
    // degraded-write guard in state.js save() is the second safety net.
    if (window._hubLoadFailed) {
        console.error('[hub] saveHubState REFUSED - hub state failed to load this session; reload the page');
        return;
    }
    if (!window._hubStateLoaded && !window._hubLoadInProgress) {
        console.error('[hub] saveHubState REFUSED - hub state has not finished loading');
        return;
    }
    STATE.egEquipped = _equipped;
    STATE.egInventory = _inventory;
    STATE.egMapStash = _egMapStash;
    STATE.egCurrencyStash = _currencyStash;
    STATE.egEssenceStash = globalThis._essenceStash;
    STATE.egMapSlotItem = globalThis._egMapSlotItem;
    STATE.egMapStashActiveTier = globalThis._egMapStashActiveTier;
    STATE.egCraftingBenchItem = globalThis._craftingBenchItem;
    // Unique collection
    STATE.egUniqueStash = globalThis._uniqueStash || {};
    STATE.egUniqueCollected = globalThis._uniqueCollected ? Array.from(globalThis._uniqueCollected) : [];
    // Mass-sell filter, saved with the stash so a reload restores the choices.
    if (_massSellKeep) STATE.egMassSellKeep = { ..._massSellKeep };
    STATE.egMassSellKeepUnique = _massSellKeepUnique;
    STATE.egMassSellMinItemLevel = _massSellMinItemLevel;
    STATE.egMassSellMinReqLevel = _massSellMinReqLevel;
    save();
}

//------------------------------------------------------------------------
//-------------------HEALING STORED ITEMS---------------------------------
//------------------------------------------------------------------------

// Fills a stored currency/shard item's missing name/icon/description/category/
// rarity from the definitions (legacy saves, vendor/drop races during save), so
// tooltips and right-click use-mode keep working.
export function _healCurrencyItem(item) {
    if (!item || !item.id) return item;
    const def = CURRENCY_DEFS[item.id] || SHARD_DEFS[item.id] || null;
    if (!def) return item;
    if (!item.name) item.name = def.name;
    if (!item.icon) item.icon = def.icon;
    if (!item.description) item.description = def.description;
    if (!item.category) item.category = def.category || 'currency';
    if (!item.rarity) item.rarity = def.rarity || 'currency';
    return item;
}

// Same for a stored essence item; also restores the guaranteed-family fields
// that slot-type filtering needs.
export function _healEssenceItem(item) {
    if (!item || !item.id) return item;
    const def = ESSENCE_DEFS[item.id] || null;
    if (!def) return item;
    if (!item.name) item.name = def.name;
    if (!item.icon) item.icon = def.icon;
    if (!item.description) item.description = def.description;
    if (!item.category) item.category = def.category || 'essence';
    if (!item.rarity) item.rarity = def.rarity || 'essence';
    // Without these, _renderEssenceCell cannot tell what the essence applies to
    // and the item shows up under every slot-type filter.
    if (!item.guaranteedFamily && def.guaranteedFamily) item.guaranteedFamily = def.guaranteedFamily;
    if ((!item.guaranteedFamilies || !item.guaranteedFamilies.length) && def.guaranteedFamilies) {
        item.guaranteedFamilies = def.guaranteedFamilies;
    }
    return item;
}

//------------------------------------------------------------------------
//-------------------LOADING----------------------------------------------
//------------------------------------------------------------------------

// Notice for the legacy hand migration, held until showHub renders the sheet
// (the load itself runs before any screen is visible).
export let _pendingHandMigrationToast = null;

// Explains a legacy hand migration (2H + shield equipped before the 1H/2H
// split): the off-hand was moved to the stash. One toast per moved item.
export function _showHandMigrationToast(moves) {
    if (!Array.isArray(moves) || !moves.length) return;
    for (const mv of moves) {
        const nm = (mv.item && mv.item.name) || '?';
        let msg = null;
        try {
            if (mv.slotId === 'weapon2'
                && _equipped && _isTwoHandedWeapon(_equipped.weapon1)) {
                const mainNm = (_equipped.weapon1 && _equipped.weapon1.name) || '?';
                let tpl = null;
                try { const s = t('eg_migrate_offhand_two_handed'); if (s && s !== 'eg_migrate_offhand_two_handed') tpl = s; } catch (e) {}
                msg = (tpl || '⚠️ {off} moved to your stash - {main} is a Heavy Weapon and needs a free off-hand')
                    .replace('{off}', nm).replace('{main}', mainNm);
            } else {
                let tpl = null;
                try { const s = t('eg_migrate_hand_generic'); if (s && s !== 'eg_migrate_hand_generic') tpl = s; } catch (e) {}
                msg = (tpl || '⚠️ {name} moved to your stash - it cannot stay equipped in that slot')
                    .replace('{name}', nm);
            }
        } catch (e) {
            msg = `⚠️ ${nm} moved to your stash`;
        }
        try { globalThis.showToast(msg, '#f5b642'); } catch (e) {}
        try { _showStashInfo(msg, { type: 'info' }); } catch (e) {}
    }
}


//------------------------------------------------------------------------
//-------------------LOAD STEPS-------------------------------------------
//------------------------------------------------------------------------

// Loads the equipped items and the main stash, fixing row/column sizes and
// restoring a missing category on gear saved without one (otherwise currency
// and essence application rejects it with a confusing "cannot be used").
function _loadEquipmentMirrors() {
    globalThis._equipped = STATE.egEquipped || {};
    // Unlimited stash: keep whatever rows were saved; ensure at least the initial minimum
    if (Array.isArray(STATE.egInventory) && STATE.egInventory.length > 0) {
        globalThis._inventory = STATE.egInventory;
        // Normalise column count and guarantee minimum rows
        if (_inventory.length < INV_INITIAL_ROWS) _ensureInvRows(INV_INITIAL_ROWS);
        // Ensure every row has the correct column width
        for (let r = 0; r < _inventory.length; r++) {
            if (!Array.isArray(_inventory[r])) _inventory[r] = Array(INV_COLS).fill(null);
            else if (_inventory[r].length < INV_COLS) {
                while (_inventory[r].length < INV_COLS) _inventory[r].push(null);
            } else if (_inventory[r].length > INV_COLS) {
                _inventory[r] = _inventory[r].slice(0, INV_COLS);
            }
        }
    } else {
        globalThis._inventory = Array.from({ length: INV_INITIAL_ROWS }, () => Array(INV_COLS).fill(null));
    }
    // Heal legacy equipment cells: any item that looks like gear (has a
    // slotType) but lost its category would be rejected by currency/essence
    // application with a confusing "cannot be used" error.
    if (Array.isArray(_inventory)) {
        for (let r = 0; r < _inventory.length; r++) {
            if (!Array.isArray(_inventory[r])) continue;
            for (let c = 0; c < _inventory[r].length; c++) {
                const it = _inventory[r][c];
                if (it && it.slotType && !it.category) it.category = 'equip';
            }
        }
    }
    if (_equipped && typeof _equipped === 'object') {
        for (const k of Object.keys(_equipped)) {
            const it = _equipped[k];
            if (it && it.slotType && !it.category) it.category = 'equip';
        }
    }
}

// Loads the 16 tiered map stashes. A legacy flat map grid is spread into the
// tiers by map tier; a missing stash becomes empty tiers.
function _loadMapStash() {
    const saved = STATE.egMapStash;
    if (_egIsTieredMapStash(saved)) {
        globalThis._egMapStash = saved;
        // normalise each tier: ensure correct cols and at least initial rows
        for (let ti = 0; ti < EG_MAP_TIER_COUNT; ti++) {
            if (!Array.isArray(_egMapStash[ti])) _egMapStash[ti] = _egMakeMapTierGrid();
            if (_egMapStash[ti].length < EG_MAP_STASH_INITIAL_ROWS) {
                for (let i = _egMapStash[ti].length; i < EG_MAP_STASH_INITIAL_ROWS; i++) _egMapStash[ti].push(Array(EG_MAP_STASH_COLS).fill(null));
            }
            for (let r = 0; r < _egMapStash[ti].length; r++) {
                if (!Array.isArray(_egMapStash[ti][r])) _egMapStash[ti][r] = Array(EG_MAP_STASH_COLS).fill(null);
                else if (_egMapStash[ti][r].length < EG_MAP_STASH_COLS) while(_egMapStash[ti][r].length < EG_MAP_STASH_COLS) _egMapStash[ti][r].push(null);
                else if (_egMapStash[ti][r].length > EG_MAP_STASH_COLS) _egMapStash[ti][r] = _egMapStash[ti][r].slice(0, EG_MAP_STASH_COLS);
            }
        }
        // also migrate any maps that might be in wrong tier (e.g. tier changed via Horizons)
        // we leave them where they are - player can manually move via device
    } else if (Array.isArray(saved) && saved.length > 0 && Array.isArray(saved[0]) && !Array.isArray(saved[0][0])) {
        // legacy flat grid (e.g. 4×20) - distribute maps into tiered stashes by mapTier
        globalThis._egMapStash = _egMakeAllMapStashes();
        for (let r = 0; r < saved.length; r++) {
            if (!Array.isArray(saved[r])) continue;
            for (let c = 0; c < saved[r].length; c++) {
                const it = saved[r][c];
                if (!it) continue;
                const tier = (it.mapTier != null) ? it.mapTier : 1;
                const idx = _egMapTierToIndex(tier);
                // find first free slot in that tier (may grow)
                let placed = false;
                for (let rr = 0; rr < _egMapStash[idx].length && !placed; rr++) {
                    for (let cc = 0; cc < EG_MAP_STASH_COLS; cc++) {
                        if (!_egMapStash[idx][rr][cc]) { _egMapStash[idx][rr][cc] = it; placed = true; break; }
                    }
                }
                if (!placed) {
                    _egMapStash[idx].push(Array(EG_MAP_STASH_COLS).fill(null));
                    _egMapStash[idx][_egMapStash[idx].length-1][0] = it;
                }
            }
        }
        STATE.egMapStash = _egMapStash;
        try { if (typeof save === 'function') save(); } catch(e) {}
    } else {
        globalThis._egMapStash = _egMakeAllMapStashes();
    }
    // restore active tier if persisted
    if (STATE.egMapStashActiveTier != null) {
        const at = Math.max(1, Math.min(EG_MAP_TIER_COUNT, Math.round(STATE.egMapStashActiveTier)));
        globalThis._egMapStashActiveTier = at;
    }
    if (STATE.egMapStashActiveTier != null) globalThis._egMapStashActiveTier = Math.max(1, Math.min(EG_MAP_TIER_COUNT, Math.round(STATE.egMapStashActiveTier)));
}

// Rebuilds the currency strip into its fixed slots when the saved layout is
// old (1x30 grid) or items sit outside their assigned slot, merging stacks by
// id. Saves immediately after migrating. Does nothing if the layout is current.
function _migrateCurrencyStash() {
    const saved = STATE.egCurrencyStash;
    let needMigration = !Array.isArray(saved)
        || saved.length !== CURRENCY_ROWS
        || (saved[0] && saved[0].length !== CURRENCY_COLS);
    // Also migrate when items are not in their assigned fixed slots
    // (e.g. layout changed from old ordering to new requested ordering).
    if (!needMigration && Array.isArray(saved)) {
        outer: for (let r = 0; r < saved.length; r++) {
            if (!Array.isArray(saved[r])) continue;
            for (let c = 0; c < saved[r].length; c++) {
                const it = saved[r][c];
                if (!it || !it.id) continue;
                const pos = _currencySlotForId(it.id);
                if (!pos || pos.r !== r || pos.c !== c) { needMigration = true; break outer; }
            }
        }
    }
    if (!needMigration) {
        globalThis._currencyStash = saved;
        return;
    }
    // Collect all items from old grid (flat)
    const items = [];
    if (Array.isArray(saved)) {
        for (let r = 0; r < saved.length; r++) {
            if (!Array.isArray(saved[r])) continue;
            for (let c = 0; c < saved[r].length; c++) {
                const it = saved[r][c];
                if (it && it.id) {
                    _healCurrencyItem(it);
                    _healEssenceItem(it);
                    items.push(it);
                }
            }
        }
    }
    // Build fresh fixed-slot grid
    globalThis._currencyStash = Array.from({ length: CURRENCY_ROWS }, () => Array(CURRENCY_COLS).fill(null));
    // Merge stacks by id into assigned slot
    const merged = new Map(); // id → total count
    for (const it of items) {
        const key = it.id;
        const cnt = it.count || 1;
        merged.set(key, (merged.get(key) || 0) + cnt);
    }
    for (const [id, total] of merged.entries()) {
        const pos = _currencySlotForId(id);
        if (!pos) continue; // unknown / unassigned currency - drop (should not happen)
        const def = _currencyDefForId(id);
        // Preserve first item's full object as template (with heals)
        const template = items.find(x => x.id === id) || { id, category: 'currency', rarity: 'currency' };
        _currencyStash[pos.r][pos.c] = {
            ...template,
            id,
            name: (def && def.name) || template.name,
            icon: (def && def.icon) || template.icon,
            description: (def && def.description) || template.description,
            category: 'currency',
            rarity: 'currency',
            count: total,
        };
    }
    // Persist migrated shape immediately
    STATE.egCurrencyStash = _currencyStash;
    try { if (typeof save === 'function') save(); } catch(e) {}
}

// Loads the currency strip (migrating old layouts), then heals each stored
// item's missing fields and pads rows/columns to the current grid size.
function _loadCurrencyStash() {
    _migrateCurrencyStash();
    // Heal after migration as well
    if (Array.isArray(_currencyStash)) {
        for (let r = 0; r < _currencyStash.length; r++) {
            if (!Array.isArray(_currencyStash[r])) { _currencyStash[r] = Array(CURRENCY_COLS).fill(null); continue; }
            // ensure row length
            if (_currencyStash[r].length < CURRENCY_COLS) while(_currencyStash[r].length < CURRENCY_COLS) _currencyStash[r].push(null);
            if (_currencyStash[r].length > CURRENCY_COLS) _currencyStash[r] = _currencyStash[r].slice(0, CURRENCY_COLS);
            for (let c = 0; c < _currencyStash[r].length; c++) {
                const it = _currencyStash[r][c];
                if (it) {
                    _healCurrencyItem(it);
                    _healEssenceItem(it);
                }
            }
        }
    }
    if (_currencyStash.length < CURRENCY_ROWS) {
        while(_currencyStash.length < CURRENCY_ROWS) _currencyStash.push(Array(CURRENCY_COLS).fill(null));
    }
}

// Loads the essence stash into the CURRENT grid size (older saves had a smaller
// tab). Items outside their assigned slot are re-slotted; legacy group
// essences are dropped; unknown ones go to the first free unreserved cell.
// ESSENCE_ROWS/COLS come from a later-loading module, hence the fallbacks.
function _loadEssenceStash() {
    const essR = typeof ESSENCE_ROWS !== 'undefined' ? ESSENCE_ROWS : 12;
    const essC = typeof ESSENCE_COLS !== 'undefined' ? ESSENCE_COLS : 8;
    const freshEssGrid = Array.from({ length: essR }, () => Array(essC).fill(null));
    const savedEssGrid = STATE.egEssenceStash;
    let needsFixedMigration = false;
    if (Array.isArray(savedEssGrid)) {
        // Detect old fixed-slot vs free-form: if any item is not in its assigned slot, migrate
        try {
            if (typeof _essenceSlotForId === 'function') {
                for (let r = 0; r < savedEssGrid.length; r++) {
                    if (!Array.isArray(savedEssGrid[r])) continue;
                    for (let c = 0; c < savedEssGrid[r].length; c++) {
                        const it = savedEssGrid[r][c];
                        if (!it || !it.id) continue;
                        const pos = _essenceSlotForId(it.id);
                        if (!pos || pos.r !== r || pos.c !== c) { needsFixedMigration = true; break; }
                    }
                    if (needsFixedMigration) break;
                }
                // also if grid size differs from current
                if (savedEssGrid.length !== essR || (savedEssGrid[0] && savedEssGrid[0].length !== essC)) needsFixedMigration = true;
            }
        } catch(e) { needsFixedMigration = false; }
        if (needsFixedMigration && typeof _essenceSlotForId === 'function') {
            // Collect all essence items and re-insert into correct fixed slots
            const allItems = [];
            for (let r = 0; r < savedEssGrid.length; r++) {
                if (!Array.isArray(savedEssGrid[r])) continue;
                for (let c = 0; c < savedEssGrid[r].length; c++) {
                    const it = savedEssGrid[r][c];
                    if (it && it.id) {
                        if (typeof _healEssenceItem === 'function') _healEssenceItem(it);
                        allItems.push(it);
                    }
                }
            }
            const merged = new Map(); // id -> total count
            const leftover = []; // items with no assigned slot
            const LEGACY_ESSENCE_DISCARD = new Set(['essence_vitality','essence_might','essence_sorcery','essence_swiftness','essence_fortress','essence_elements','essence_puzzle']);
            for (const it of allItems) {
                if (LEGACY_ESSENCE_DISCARD.has(it.id)) continue; // drop legacy group essences - replaced by per-modifier essences
                const pos = _essenceSlotForId(it.id);
                if (!pos) { leftover.push(it); continue; }
                const cnt = it.count || 1;
                merged.set(it.id, (merged.get(it.id) || 0) + cnt);
            }
            for (const [id, total] of merged.entries()) {
                const pos = _essenceSlotForId(id);
                if (!pos) continue;
                const def = (typeof _essenceDefForId === 'function') ? _essenceDefForId(id) : null;
                const src = allItems.find(x => x.id === id) || {};
                freshEssGrid[pos.r][pos.c] = {
                    ...src,
                    id,
                    name: (def && def.name) || src.name || id,
                    icon: (def && def.icon) || src.icon || '🧬',
                    description: (def && def.description) || src.description || '',
                    category: 'essence',
                    rarity: 'essence',
                    count: total,
                };
            }
            // Leftover unknown essences go to first decorative empty cells
            for (const it of leftover) {
                let placed = false;
                for (let r = 0; r < essR && !placed; r++) {
                    for (let c = 0; c < essC && !placed; c++) {
                        if (freshEssGrid[r][c]) continue;
                        const assigned = (typeof _essenceIdForSlot === 'function') ? _essenceIdForSlot(r,c) : null;
                        if (assigned) continue; // reserved
                        freshEssGrid[r][c] = it;
                        placed = true;
                    }
                }
                if (!placed) console.warn('[ESSENCE] leftover essence could not be placed', it.id);
            }
            // Persist migrated shape
            STATE.egEssenceStash = freshEssGrid;
            try { if (typeof save === 'function') save(); } catch(e) {}
        } else {
            for (let r = 0; r < Math.min(essR, savedEssGrid.length); r++) {
                if (!Array.isArray(savedEssGrid[r])) continue;
                for (let c = 0; c < Math.min(essC, savedEssGrid[r].length); c++) {
                    freshEssGrid[r][c] = savedEssGrid[r][c] || null;
                }
            }
        }
    }
    globalThis._essenceStash = freshEssGrid;
    globalThis._egMapSlotItem = STATE.egMapSlotItem || null;
    globalThis._craftingBenchItem = STATE.egCraftingBenchItem || null;
    // Heal legacy essence cells too (description/category missing from old saves).
    if (Array.isArray(globalThis._essenceStash)) {
        for (let r = 0; r < globalThis._essenceStash.length; r++) {
            if (!Array.isArray(globalThis._essenceStash[r])) continue;
            for (let c = 0; c < globalThis._essenceStash[r].length; c++) {
                const it = globalThis._essenceStash[r][c];
                if (it) _healEssenceItem(it);
            }
        }
    }
}

// Loads the mass-sell and loot-filter settings (or their defaults).
function _loadFilterSettings() {
    _loadMassSellSettings();
    // Loot filter - load (or default-initialise) from the persisted save.
    if (typeof _loadLootFilter === 'function') _loadLootFilter();
}

// Brings saved gear up to date: attribute requirements from the base type (so a
// requirement rebalance reaches old items), missing implicits, legacy uniques
// and the 1H/2H hands field. Each step saves the hub if it changed anything.
function _healLoadedGear() {
    // requirement rebalance (requirement curve in equipment-base-types.js) reaches existing items.
    try {
        let reqChanged = false;
        if (Array.isArray(_inventory)) {
            for (let r = 0; r < _inventory.length; r++) {
                for (let c = 0; c < INV_COLS; c++) {
                    const it = _inventory[r][c];
                    if (it && it.category === 'equip' && _healItemRequirements(it)) reqChanged = true;
                }
            }
        }
        if (typeof _equipped === 'object' && _equipped) {
            Object.values(_equipped).forEach(it => { if (it && _healItemRequirements(it)) reqChanged = true; });
        }
        const _benchItem = globalThis._craftingBenchItem;
        if (_benchItem && _healItemRequirements(_benchItem)) reqChanged = true;
        if (reqChanged && typeof saveHubState === 'function') { try { saveHubState(); } catch (e) {} }
    } catch (e) { /* ignore */ }

    try {
        if (typeof _healItemImplicits === 'function') {
            if (Array.isArray(_inventory)) {
                for (let r = 0; r < _inventory.length; r++) {
                    for (let c = 0; c < INV_COLS; c++) {
                        const it = _inventory[r][c];
                        if (it && it.category === 'equip' && !it.isUnique) _healItemImplicits(it);
                    }
                }
            }
            if (typeof _equipped === 'object' && _equipped) {
                Object.values(_equipped).forEach(it => { if (it && !it.isUnique) _healItemImplicits(it); });
            }
        }
    } catch (e) { /* ignore */ }

    // Retroactively fills missing defenses/damage/blockChance from the
    // updated UNIQUE_ITEMS definitions (or fallback). Persists if changed.
    try {
        if (typeof _healUniqueItem === 'function') {
            let uniqueChanged = false;
            const healGrid = (grid) => {
                if (!Array.isArray(grid)) return;
                for (let r = 0; r < grid.length; r++) {
                    if (!Array.isArray(grid[r])) continue;
                    for (let c = 0; c < grid[r].length; c++) {
                        const it = grid[r][c];
                        if (it && it.isUnique && _healUniqueItem(it)) uniqueChanged = true;
                    }
                }
            };
            healGrid(_inventory);
            if (typeof _equipped === 'object' && _equipped) {
                for (const it of Object.values(_equipped)) if (it && it.isUnique && _healUniqueItem(it)) uniqueChanged = true;
            }
            if (globalThis._egMapSlotItem && globalThis._egMapSlotItem.isUnique && _healUniqueItem(globalThis._egMapSlotItem)) uniqueChanged = true;
            if (typeof _craftingBenchItem !== 'undefined' && globalThis._craftingBenchItem && globalThis._craftingBenchItem.isUnique && _healUniqueItem(globalThis._craftingBenchItem)) uniqueChanged = true;
            if (uniqueChanged && typeof saveHubState === 'function') { try { saveHubState(); } catch (e) {} }
        }
    } catch (e) { /* ignore */ }

    try {
        if (typeof _healWeaponHands === 'function') {
            let handsChanged = false;
            const healWeaponGrid = (grid) => {
                if (!Array.isArray(grid)) return;
                for (let r = 0; r < grid.length; r++) {
                    if (!Array.isArray(grid[r])) continue;
                    for (let c = 0; c < grid[r].length; c++) {
                        const it = grid[r][c];
                        // _healWeaponHands returns TRUE when it CHANGED the
                        // item - non-weapon items must NOT count as changed.
                        if (it && _healWeaponHands(it)) handsChanged = true;
                    }
                }
            };
            healWeaponGrid(_inventory);
            if (typeof _equipped === 'object' && _equipped) {
                for (const it of Object.values(_equipped)) if (it && _healWeaponHands(it)) handsChanged = true;
            }
            if (typeof _craftingBenchItem !== 'undefined' && globalThis._craftingBenchItem && _healWeaponHands(globalThis._craftingBenchItem)) handsChanged = true;
            if (handsChanged && typeof saveHubState === 'function') { try { saveHubState(); } catch (e) {} }
        }
    } catch (e) { /* ignore */ }
}

// Moves an illegal 2H + shield loadout's off-hand into the stash (nothing is
// lost). The notice toast is deferred to showHub so it shows on the sheet.
function _migrateLegacyHands() {
    try {
        if (typeof _migrateIllegalHandsToStash === 'function') {
            const _handMoves = _migrateIllegalHandsToStash();
            if (_handMoves && _handMoves.length) {
                if (typeof saveHubState === 'function') { try { saveHubState(); } catch (e) {} }
                _pendingHandMigrationToast = _handMoves;
            }
        }
    } catch (e) { /* ignore */ }
}

// Loads the Unique Collection, moves stray uniques out of the regular stash
// into it, and heals every collected unique. Failures here never break the load.
function _loadUniqueCollection() {
    try {
        _ensureUniqueStash();
        // Load from STATE
        if (STATE.egUniqueStash && typeof STATE.egUniqueStash === 'object' && !Array.isArray(STATE.egUniqueStash)) {
            globalThis._uniqueStash = STATE.egUniqueStash;
            // ensure arrays
            for (const k of Object.keys(globalThis._uniqueStash)) if (!Array.isArray(globalThis._uniqueStash[k])) globalThis._uniqueStash[k] = globalThis._uniqueStash[k] ? [globalThis._uniqueStash[k]] : [];
        } else {
            globalThis._uniqueStash = {};
        }
        if (Array.isArray(STATE.egUniqueCollected)) {
            globalThis._uniqueCollected = new Set(STATE.egUniqueCollected);
        } else {
            globalThis._uniqueCollected = new Set();
        }
        // Legacy migration: move any isUnique items still sitting in regular inventory into the unique stash
        let migrated = false;
        if (Array.isArray(_inventory)) {
            for (let r = 0; r < _inventory.length; r++) {
                for (let c = 0; c < INV_COLS; c++) {
                    const it = _inventory[r][c];
                    if (it && it.isUnique && it.baseId) {
                        const uid = it.baseId;
                        if (!globalThis._uniqueStash[uid]) globalThis._uniqueStash[uid] = [];
                        globalThis._uniqueStash[uid].push(it);
                        globalThis._uniqueCollected.add(uid);
                        _inventory[r][c] = null;
                        migrated = true;
                    }
                }
            }
        }
        // Also ensure collected set contains every key present in stash
        for (const uid of Object.keys(globalThis._uniqueStash)) globalThis._uniqueCollected.add(uid);
        // Heal implicits/downsides on unique stash items as well
        if (typeof _healUniqueItem === 'function') {
            for (const arr of Object.values(globalThis._uniqueStash)) {
                for (const it of arr) _healUniqueItem(it);
            }
        }
        if (migrated) {
            STATE.egUniqueStash = globalThis._uniqueStash;
            STATE.egUniqueCollected = Array.from(globalThis._uniqueCollected);
            try { if (typeof save === 'function') save(); } catch(e){}
            // persist via saveHubState shape (ensures other fields consistent)
            try { saveHubState(); } catch(e){}
        }
    } catch(e) { /* ignore unique load */ }
}

// Removes a unique that leaked onto the crafting bench (older builds allowed it,
// which duplicated it after a reload). Uniques are never craftable, so the slot
// is cleared and, if not yet collected, the item is recovered into the collection.
// Kept outside the unique-load try so a migration hiccup cannot skip it.
function _evictUniqueFromBench() {
    try {
        if (globalThis._craftingBenchItem && globalThis._craftingBenchItem.isUnique) {
            if (typeof _ensureUniqueStash === 'function') _ensureUniqueStash();
            const buid = globalThis._craftingBenchItem.baseId || globalThis._craftingBenchItem.uniqueId || globalThis._craftingBenchItem.id;
            const present = buid && Array.isArray(globalThis._uniqueStash[buid]) && globalThis._uniqueStash[buid].length > 0;
            if (buid && !present) {
                if (!globalThis._uniqueStash[buid]) globalThis._uniqueStash[buid] = [];
                globalThis._uniqueStash[buid].push(globalThis._craftingBenchItem);
                globalThis._uniqueCollected.add(buid);
            }
            if (typeof _healUniqueItem === 'function') _healUniqueItem(globalThis._craftingBenchItem);
            globalThis._craftingBenchItem = null;
            STATE.egCraftingBenchItem = null;
            STATE.egUniqueStash = globalThis._uniqueStash;
            STATE.egUniqueCollected = Array.from(globalThis._uniqueCollected || []);
            try { if (typeof save === 'function') save(); } catch(e){}
        }
    } catch(e) { /* never break hub load for a bench cleanup */ }
}

// Retroactively sets endgame achievement stats from an existing save.
function _syncEndgameAchievements() {
    try {
        if (typeof setAchStat === 'function' && typeof egAtlasProgress === 'function' && STATE.egAtlasCompleted) {
            const _ap = egAtlasProgress();
            setAchStat('egAtlasRegions', _ap.completed);
            setAchStat('egAtlasHighestTier', _ap.highestTier);
            // count T16 regions separately
            let _pinn = 0;
            for (const _id in STATE.egAtlasCompleted) {
                const _node = (typeof egAtlasNodeById === 'function') ? egAtlasNodeById(_id) : null;
                if (_node && _node.tier === 16 && STATE.egAtlasCompleted[_id]) _pinn++;
            }
            setAchStat('egAtlasPinnacle', _pinn);
        }
        if (typeof setAchStat === 'function' && typeof _uniqueCollected !== 'undefined' && globalThis._uniqueCollected) {
            setAchStat('egUniquesCollected', globalThis._uniqueCollected.size);
        }
        if (typeof setAchStat === 'function' && typeof _getPlayerLevel === 'function') {
            setAchStat('egPlayerLevel', _getPlayerLevel());
        }
        if (typeof setAchStat === 'function' && typeof getGold === 'function') {
            // gold earned is cumulative - can't reconstruct, seed with current balance as floor
            const _curGold = getGold();
            if (_curGold > 0 && (!ACH_STATE.stats.egGoldEarned || ACH_STATE.stats.egGoldEarned < _curGold)) {
                // use setAchStat to at least reflect balance; real earned will grow via _addGold
                setAchStat('egGoldEarned', _curGold);
            }
        }
    } catch(e){}
}

// Loads every hub mirror from STATE, in order. Skips if a load already
// finished (re-running would re-apply migrations to normalised data) or failed
// midway (the mirrors may be half-loaded; saving stays blocked until reload).
function _loadHubState() {
    if (window._hubStateLoaded) return;
    if (window._hubLoadFailed) {
        console.error('[hub] skipping _loadHubState - previous attempt failed midway; save-writes stay blocked until reload');
        return;
    }
    // Let saveHubState through while loading: its writes are heal results from
    // mirrors that were just read from STATE.
    window._hubLoadInProgress = true;
    _loadEquipmentMirrors();
    _loadMapStash();
    _loadCurrencyStash();
    _loadEssenceStash();
    _loadFilterSettings();
    _healLoadedGear();
    _migrateLegacyHands();
    _loadUniqueCollection();
    _evictUniqueFromBench();
    _syncEndgameAchievements();
}

//------------------------------------------------------------------------
//-------------------BOOT-------------------------------------------------
//------------------------------------------------------------------------

// Runs the load once. On failure the session is marked degraded and saves stay
// blocked, so half-loaded mirrors can never overwrite the real stash.
// Deferred to page load: this module evaluates inside an import cycle where
// the render chain's bindings are still uninitialized.
function _bootLoadHubState() {
    window._hubLoadInProgress = false;
    try {
        _loadHubState();
        window._hubStateLoaded = true;
    } catch (e) {
        window._hubLoadFailed = true;
        console.error('[hub] load failed - save-writes BLOCKED for this session to protect your stash (reload the page)', e);
    } finally {
        window._hubLoadInProgress = false;
    }
}
if (typeof document !== 'undefined' && document.readyState !== 'complete') {
    document.addEventListener('DOMContentLoaded', _bootLoadHubState);
} else {
    _bootLoadHubState();
}
