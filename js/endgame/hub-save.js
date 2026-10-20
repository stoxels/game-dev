//------------------------------------------------------------------------
// PHASE 4 split (2026-09-16): extracted into a focused module. The original
// path is now a facade that re-exports this module, so existing import sites
// are unaffected. See MIGRATION.md "splitting giants".
//------------------------------------------------------------------------

// Endgame hub: save/load of the hub mirrors - the single source of truth
// for STATE <-> mirror transfers. saveHubState() writes every mirror back
// into STATE; _loadHubState() (boot, DOMContentLoaded) rebinds the mirrors
// - including lets that live in the split stash/currency/map modules; those
// rebinds flow through the owning modules' accessors.

// Phase 4 split: write-through globalThis accessors. The facade and sibling
// split modules rebind these lets through globalThis.<name> assignment
// (imported module bindings are read-only views) - the established
// step-9/step-10 pattern.
import { STATE } from '../state.js';
try { Object.defineProperty(globalThis, '_pendingHandMigrationToast', { get() { return _pendingHandMigrationToast; }, set(v) { _pendingHandMigrationToast = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_loadHubState', { get() { return _loadHubState; }, set(v) { _loadHubState = v; }, configurable: true }); } catch (e) {}

import { ACH_STATE, setAchStat } from '../achievements/achievements.js';
import { save } from '../state.js';
import { t } from '../translation/translations.js';
import { egAtlasNodeById, egAtlasProgress } from './endgame-atlas.js';
import { CURRENCY_DEFS } from '../loot/loot-currency.js';
import { ESSENCE_COLS, ESSENCE_ROWS, _essenceIdForSlot, _essenceSlotForId } from '../loot/loot-essences.js';
import { ESSENCE_DEFS, _essenceDefForId } from '../loot/loot-essences-defs.js';
import { getGold } from '../loot/loot-gold.js';
import { _ensureUniqueStash } from './endgame-hub-uniques.js';
import { _showStashInfo } from './endgame-hub.js';
import { _healItemImplicits } from '../loot/loot-implicits.js';
import { _getPlayerLevel } from './endgame-leveling.js';
import { _loadLootFilter } from '../loot/loot-filter.js';
import { _healWeaponHands, _isTwoHandedWeapon, _migrateIllegalHandsToStash } from '../loot/loot-requirements.js';
import { SHARD_DEFS } from '../loot/loot-shards.js';
import { CURRENCY_COLS, CURRENCY_ROWS, _currencyDefForId, _currencySlotForId, _currencyStash } from '../loot/hub-currency.js';
import { EG_MAP_STASH_COLS, EG_MAP_STASH_INITIAL_ROWS, EG_MAP_TIER_COUNT, _egIsTieredMapStash, _egMakeAllMapStashes, _egMakeMapTierGrid, _egMapStash, _egMapTierToIndex } from './hub-map-stash.js';
import { _loadMassSellSettings, _massSellKeep, _massSellKeepUnique, _massSellMinItemLevel, _massSellMinReqLevel } from './hub-mass-sell.js';
import { INV_COLS, INV_INITIAL_ROWS, _ensureInvRows, _equipped, _inventory } from './hub-stash.js';
import { _healUniqueItem } from '../loot/unique-item-logic.js';
import { _healItemRequirements } from '../loot/equipment-base-types.js';







//------------------------------------------------------------------------
//-------------------PERSISTENCE------------------------------------------
//------------------------------------------------------------------------

// Writes all hub state variables back into the global STATE object and saves.
export function saveHubState() {
    // Safety interlock (2026-09): refuse to write while the hub load failed
    // or has not completed - the mirrors may still hold their empty defaults,
    // and writing them back would wipe the player's real stash. Writes made
    // FROM INSIDE the load itself are the exception: they persist heal /
    // migration results computed from mirrors that were just read from STATE
    // (flagged via _hubLoadInProgress). This is the path that destroyed a
    // level-97 stash once; it stays closed until the hub load succeeds (the
    // state.js save() degraded guard is the second net).
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
    // Mass-sell filter (persisted alongside the stash so reconstructing the
    // hub after a reload restores the player's protection choices).
    if (_massSellKeep) STATE.egMassSellKeep = { ..._massSellKeep };
    if (typeof _massSellKeepUnique !== 'undefined') STATE.egMassSellKeepUnique = _massSellKeepUnique;
    STATE.egMassSellMinItemLevel = _massSellMinItemLevel;
    STATE.egMassSellMinReqLevel = _massSellMinReqLevel;
    save();
}

// Heals a stashed currency/shard item that was persisted without its
// full fields (legacy saves, vendor/drop race during save). Fills missing
// name/icon/description/category/rarity from the canonical defs so tooltips
// and right-click use-mode keep working.
export function _healCurrencyItem(item) {
    if (!item || !item.id) return item;
    const def = (typeof CURRENCY_DEFS !== 'undefined' && CURRENCY_DEFS[item.id])
        || (typeof SHARD_DEFS !== 'undefined' && SHARD_DEFS[item.id])
        || null;
    if (!def) return item;
    if (!item.name) item.name = def.name;
    if (!item.icon) item.icon = def.icon;
    if (!item.description) item.description = def.description;
    if (!item.category) item.category = def.category || 'currency';
    if (!item.rarity) item.rarity = def.rarity || 'currency';
    return item;
}
export function _healEssenceItem(item) {
    if (!item || !item.id) return item;
    const def = (typeof ESSENCE_DEFS !== 'undefined' && ESSENCE_DEFS[item.id]) || null;
    if (!def) return item;
    if (!item.name) item.name = def.name;
    if (!item.icon) item.icon = def.icon;
    if (!item.description) item.description = def.description;
    if (!item.category) item.category = def.category || 'essence';
    if (!item.rarity) item.rarity = def.rarity || 'essence';
    // Critical for slot-type filtering: without these, _renderEssenceCell
    // can't determine what the essence can be applied to, and the item
    // silently bypasses the filter (shows up under every slot type).
    if (!item.guaranteedFamily && def.guaranteedFamily) item.guaranteedFamily = def.guaranteedFamily;
    if ((!item.guaranteedFamilies || !item.guaranteedFamilies.length) && def.guaranteedFamilies) {
        item.guaranteedFamilies = def.guaranteedFamilies;
    }
    return item;
}

// Deferred notice for the legacy hand migration below: _loadHubState also
// runs at script parse time (no visible screen yet), so the message waits
// here until showEndgameHub renders the sheet.
export let _pendingHandMigrationToast = null;

// Reads hub state from the global STATE object into local variables.
// Missing entries are initialised to their default empty structures.

// Explains a legacy hand migration (2H + shield equipped before the 1H/2H
// split): the off-hand was moved to the stash. One toast per moved item.
export function _showHandMigrationToast(moves) {
    if (!Array.isArray(moves) || !moves.length) return;
    for (const mv of moves) {
        const nm = (mv.item && mv.item.name) || '?';
        let msg = null;
        try {
            if (mv.slotId === 'weapon2' && typeof _isTwoHandedWeapon === 'function'
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
        try { if (typeof showToast === 'function') globalThis.showToast(msg, '#f5b642'); } catch (e) {}
        try { if (typeof _showStashInfo === 'function') _showStashInfo(msg, { type: 'info' }); } catch (e) {}
    }
}

function _loadHubState() {
    // Guard (2026-09): a fully loaded session never re-runs this (each re-run
    // would re-apply migrations against an already-normalised state). If a
    // previous attempt FAILED midway, also skip: the mirrors may be half-
    // loaded, and saveHubState is interlocked to refuse writes until the
    // page is reloaded and the load succeeds.
    if (window._hubStateLoaded) return;
    if (window._hubLoadFailed) {
        console.error('[hub] skipping _loadHubState - previous attempt failed midway; save-writes stay blocked until reload');
        return;
    }
    // Mark the load as in progress: saveHubState's interlock must ALLOW the
    // internal persistence calls below (heal/migration results), because at
    // this point the mirrors hold exactly what was just read from STATE.
    window._hubLoadInProgress = true;
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
    // ── Map stash: tiered 16× infinite stashes ──
    (function _migrateMapStash() {
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
    })();
    if (STATE.egMapStashActiveTier != null) globalThis._egMapStashActiveTier = Math.max(1, Math.min(EG_MAP_TIER_COUNT, Math.round(STATE.egMapStashActiveTier)));

    // ── Currency stash migration to fixed slots ──
    // Old saves were 1×30; new is 6×5 with fixed positions. Migrate by collecting items
    // and re-inserting them into their assigned slots (stacking counts).
    (function _migrateCurrency() {
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
    })();
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
    // ESSENCE_ROWS/COLS are defined in endgame-essences.js which loads
    // after this file - guard so first-load initialisation never throws.
    // The stash is always normalised to the CURRENT grid dimensions: saves
    // created with an older (smaller) essence tab would otherwise leave
    // rows/cols undefined and crash the essence renderer.
    {
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
    }
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
    // Mass-sell filter - load (or default-initialise) from the persisted save.
    _loadMassSellSettings();
    // Loot filter - load (or default-initialise) from the persisted save.
    if (typeof _loadLootFilter === 'function') _loadLootFilter();

    // Refresh attribute requirements of saved gear from its base type, so a
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

    // Heal legacy equipment items that were saved before implicits existed.
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

    // Heal legacy uniques that were saved before base armor/damage was added.
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

    // ── Legacy weapon hands heal (pre-1H/2H saves) ──────────────────────
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

    // ── Legacy hand migration (pre-1H/2H saves) ────────────────────────
    // A 2H weapon + shield equipped before the patch is illegal now. Free the
    // off-hand into the stash so the very next sheet visit shows a legal,
    // working loadout (offense without block, as designed). Nothing is lost
    // (stash is unlimited); the notice toast is deferred to showEndgameHub so
    // it fires on the visible sheet.
    try {
        if (typeof _migrateIllegalHandsToStash === 'function') {
            const _handMoves = _migrateIllegalHandsToStash();
            if (_handMoves && _handMoves.length) {
                if (typeof saveHubState === 'function') { try { saveHubState(); } catch (e) {} }
                _pendingHandMigrationToast = _handMoves;
            }
        }
    } catch (e) { /* ignore */ }

    // ── Unique Collection load + legacy migration ────────────────────────
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

    // Evict any unique that leaked onto the crafting bench. Older builds
    // allowed uniques onto the bench, persisting one in BOTH the bench and
    // the Unique Collection → a duplicate after reload. Uniques are never
    // craftable, so clear the slot; if it isn't already collected, recover
    // it into the collection so nothing is lost. Placed OUTSIDE the unique-
    // stash try above so a migration hiccup can't skip it.
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

    // Endgame achievements - retroactive sync for existing saves
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

// Call this immideatly so the player does NOT have to open the hub first to re-load his item state.
// This way it runs on game restart automatically.
// Guard (2026-09): this load must SUCCEED before anything may write back to
// STATE via saveHubState. If it throws, the session is marked degraded:
// the mirrors may hold half-loaded/empty data, and writing them back would
// wipe the player's real stash. state.js save() refuses that case as well.
// _hubLoadInProgress is cleared in finally so the interlock can never be
// left in "load running" state by a throw midway.
// Module era: hub.js evaluates inside an import cycle, so running the load
// HERE would read uninitialized bindings (GAME_ART via the render chain) and
// mark the session load-failed, blocking save-writes. Classic order (art and
// state long before hub) always succeeded. Defer to DOMContentLoaded: every
// module plus the concatenated body is initialized by then, still before any
// user interaction (established step-5 passive-tree pattern).
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
