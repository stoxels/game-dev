//------------------------------------------------------------------------
// PHASE 4 split (2026-09-16): extracted into a focused module. The original
// path is now a facade that re-exports this module, so existing import sites
// are unaffected. See MIGRATION.md "splitting giants".
//------------------------------------------------------------------------

// Endgame hub: save/load of the hub mirrors - the single source of truth
// for STATE <-> mirror transfers. egSaveHubState() writes every mirror back
// into STATE; _egLoadHubState() (boot, DOMContentLoaded) rebinds the mirrors
// - including lets that live in the split stash/currency/map modules; those
// rebinds flow through the owning modules' accessors.

// Phase 4 split: write-through globalThis accessors. The facade and sibling
// split modules rebind these lets through globalThis.<name> assignment
// (imported module bindings are read-only views) - the established
// step-9/step-10 pattern.
try { Object.defineProperty(globalThis, '_egPendingHandMigrationToast', { get() { return _egPendingHandMigrationToast; }, set(v) { _egPendingHandMigrationToast = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egLoadHubState', { get() { return _egLoadHubState; }, set(v) { _egLoadHubState = v; }, configurable: true }); } catch (e) {}

import { ACH_STATE, setAchStat } from '../achievements/achievements.js';
import { save } from '../state.js';
import { t } from '../translation/translations.js';
import { egAtlasNodeById, egAtlasProgress } from './endgame-atlas.js';
import { EG_CURRENCY_DEFS } from './endgame-currency.js';
import { EG_ESSENCE_COLS, EG_ESSENCE_DEFS, EG_ESSENCE_ROWS, _egEssenceDefForId, _egEssenceIdForSlot, _egEssenceSlotForId } from './endgame-essences.js';
import { egGetGold } from './endgame-gold.js';
import { _egEnsureUniqueStash } from './endgame-hub-uniques.js';
import { _egShowStashInfo } from './endgame-hub.js';
import { _egHealItemImplicits } from './endgame-implicits.js';
import { _egGetPlayerLevel } from './endgame-leveling.js';
import { _egLoadLootFilter } from './endgame-loot-filter.js';
import { _egHealWeaponHands, _egIsTwoHandedWeapon, _egMigrateIllegalHandsToStash } from './endgame-requirements.js';
import { EG_SHARD_DEFS } from './endgame-shards.js';
import { EG_CURRENCY_COLS, EG_CURRENCY_ROWS, _egCurrencyDefForId, _egCurrencySlotForId, _egCurrencyStash } from './hub-currency.js';
import { EG_MAP_STASH_COLS, EG_MAP_STASH_INITIAL_ROWS, EG_MAP_TIER_COUNT, _egIsTieredMapStash, _egMakeAllMapStashes, _egMakeMapTierGrid, _egMapStash, _egMapTierToIndex } from './hub-map-stash.js';
import { _egLoadMassSellSettings, _egMassSellKeep, _egMassSellKeepUnique, _egMassSellMinItemLevel, _egMassSellMinReqLevel } from './hub-mass-sell.js';
import { EG_INV_COLS, EG_INV_INITIAL_ROWS, _egEnsureInvRows, _egEquipped, _egInventory } from './hub-stash.js';
import { _egHealUniqueItem } from './unique-item-logic.js';







//------------------------------------------------------------------------
//-------------------PERSISTENCE------------------------------------------
//------------------------------------------------------------------------

// Writes all hub state variables back into the global STATE object and saves.
export function egSaveHubState() {
    // Safety interlock (2026-09): refuse to write while the hub load failed
    // or has not completed - the mirrors may still hold their empty defaults,
    // and writing them back would wipe the player's real stash. Writes made
    // FROM INSIDE the load itself are the exception: they persist heal /
    // migration results computed from mirrors that were just read from STATE
    // (flagged via _stoxHubLoadInProgress). This is the path that destroyed a
    // level-97 stash once; it stays closed until the hub load succeeds (the
    // state.js save() degraded guard is the second net).
    if (window._stoxHubLoadFailed) {
        console.error('[hub] egSaveHubState REFUSED - hub state failed to load this session; reload the page');
        return;
    }
    if (!window._stoxHubStateLoaded && !window._stoxHubLoadInProgress) {
        console.error('[hub] egSaveHubState REFUSED - hub state has not finished loading');
        return;
    }
    globalThis.STATE.egEquipped = _egEquipped;
    globalThis.STATE.egInventory = _egInventory;
    globalThis.STATE.egMapStash = _egMapStash;
    globalThis.STATE.egCurrencyStash = _egCurrencyStash;
    globalThis.STATE.egEssenceStash = globalThis._egEssenceStash;
    globalThis.STATE.egMapSlotItem = globalThis._egMapSlotItem;
    globalThis.STATE.egMapStashActiveTier = globalThis._egMapStashActiveTier;
    globalThis.STATE.egCraftingBenchItem = globalThis._egCraftingBenchItem;
    // Unique collection
    globalThis.STATE.egUniqueStash = globalThis._egUniqueStash || {};
    globalThis.STATE.egUniqueCollected = globalThis._egUniqueCollected ? Array.from(globalThis._egUniqueCollected) : [];
    // Mass-sell filter (persisted alongside the stash so reconstructing the
    // hub after a reload restores the player's protection choices).
    if (_egMassSellKeep) globalThis.STATE.egMassSellKeep = { ..._egMassSellKeep };
    if (typeof _egMassSellKeepUnique !== 'undefined') globalThis.STATE.egMassSellKeepUnique = _egMassSellKeepUnique;
    globalThis.STATE.egMassSellMinItemLevel = _egMassSellMinItemLevel;
    globalThis.STATE.egMassSellMinReqLevel = _egMassSellMinReqLevel;
    save();
}

// Heals a stashed currency/shard item that was persisted without its
// full fields (legacy saves, vendor/drop race during save). Fills missing
// name/icon/description/category/rarity from the canonical defs so tooltips
// and right-click use-mode keep working.
export function _egHealCurrencyItem(item) {
    if (!item || !item.id) return item;
    const def = (typeof EG_CURRENCY_DEFS !== 'undefined' && EG_CURRENCY_DEFS[item.id])
        || (typeof EG_SHARD_DEFS !== 'undefined' && EG_SHARD_DEFS[item.id])
        || null;
    if (!def) return item;
    if (!item.name) item.name = def.name;
    if (!item.icon) item.icon = def.icon;
    if (!item.description) item.description = def.description;
    if (!item.category) item.category = def.category || 'currency';
    if (!item.rarity) item.rarity = def.rarity || 'currency';
    return item;
}
export function _egHealEssenceItem(item) {
    if (!item || !item.id) return item;
    const def = (typeof EG_ESSENCE_DEFS !== 'undefined' && EG_ESSENCE_DEFS[item.id]) || null;
    if (!def) return item;
    if (!item.name) item.name = def.name;
    if (!item.icon) item.icon = def.icon;
    if (!item.description) item.description = def.description;
    if (!item.category) item.category = def.category || 'essence';
    if (!item.rarity) item.rarity = def.rarity || 'essence';
    // Critical for slot-type filtering: without these, _egRenderEssenceCell
    // can't determine what the essence can be applied to, and the item
    // silently bypasses the filter (shows up under every slot type).
    if (!item.guaranteedFamily && def.guaranteedFamily) item.guaranteedFamily = def.guaranteedFamily;
    if ((!item.guaranteedFamilies || !item.guaranteedFamilies.length) && def.guaranteedFamilies) {
        item.guaranteedFamilies = def.guaranteedFamilies;
    }
    return item;
}

// Deferred notice for the legacy hand migration below: _egLoadHubState also
// runs at script parse time (no visible screen yet), so the message waits
// here until showEndgameHub renders the sheet.
export let _egPendingHandMigrationToast = null;

// Reads hub state from the global STATE object into local variables.
// Missing entries are initialised to their default empty structures.

// Explains a legacy hand migration (2H + shield equipped before the 1H/2H
// split): the off-hand was moved to the stash. One toast per moved item.
export function _egShowHandMigrationToast(moves) {
    if (!Array.isArray(moves) || !moves.length) return;
    for (const mv of moves) {
        const nm = (mv.item && mv.item.name) || '?';
        let msg = null;
        try {
            if (mv.slotId === 'weapon2' && typeof _egIsTwoHandedWeapon === 'function'
                && _egEquipped && _egIsTwoHandedWeapon(_egEquipped.weapon1)) {
                const mainNm = (_egEquipped.weapon1 && _egEquipped.weapon1.name) || '?';
                let tpl = null;
                try { const s = t('eg_migrate_offhand_two_handed'); if (s && s !== 'eg_migrate_offhand_two_handed') tpl = s; } catch (e) {}
                msg = (tpl || '⚠️ {off} moved to your stash - {main} is two-handed and needs a free off-hand')
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
        try { if (typeof _egShowStashInfo === 'function') _egShowStashInfo(msg, { type: 'info' }); } catch (e) {}
    }
}

function _egLoadHubState() {
    // Guard (2026-09): a fully loaded session never re-runs this (each re-run
    // would re-apply migrations against an already-normalised state). If a
    // previous attempt FAILED midway, also skip: the mirrors may be half-
    // loaded, and egSaveHubState is interlocked to refuse writes until the
    // page is reloaded and the load succeeds.
    if (window._stoxHubStateLoaded) return;
    if (window._stoxHubLoadFailed) {
        console.error('[hub] skipping _egLoadHubState - previous attempt failed midway; save-writes stay blocked until reload');
        return;
    }
    // Mark the load as in progress: egSaveHubState's interlock must ALLOW the
    // internal persistence calls below (heal/migration results), because at
    // this point the mirrors hold exactly what was just read from STATE.
    window._stoxHubLoadInProgress = true;
    globalThis._egEquipped = globalThis.STATE.egEquipped || {};
    // Unlimited stash: keep whatever rows were saved; ensure at least the initial minimum
    if (Array.isArray(globalThis.STATE.egInventory) && globalThis.STATE.egInventory.length > 0) {
        globalThis._egInventory = globalThis.STATE.egInventory;
        // Normalise column count and guarantee minimum rows
        if (_egInventory.length < EG_INV_INITIAL_ROWS) _egEnsureInvRows(EG_INV_INITIAL_ROWS);
        // Ensure every row has the correct column width
        for (let r = 0; r < _egInventory.length; r++) {
            if (!Array.isArray(_egInventory[r])) _egInventory[r] = Array(EG_INV_COLS).fill(null);
            else if (_egInventory[r].length < EG_INV_COLS) {
                while (_egInventory[r].length < EG_INV_COLS) _egInventory[r].push(null);
            } else if (_egInventory[r].length > EG_INV_COLS) {
                _egInventory[r] = _egInventory[r].slice(0, EG_INV_COLS);
            }
        }
    } else {
        globalThis._egInventory = Array.from({ length: EG_INV_INITIAL_ROWS }, () => Array(EG_INV_COLS).fill(null));
    }
    // Heal legacy equipment cells: any item that looks like gear (has a
    // slotType) but lost its category would be rejected by currency/essence
    // application with a confusing "cannot be used" error.
    if (Array.isArray(_egInventory)) {
        for (let r = 0; r < _egInventory.length; r++) {
            if (!Array.isArray(_egInventory[r])) continue;
            for (let c = 0; c < _egInventory[r].length; c++) {
                const it = _egInventory[r][c];
                if (it && it.slotType && !it.category) it.category = 'equip';
            }
        }
    }
    if (_egEquipped && typeof _egEquipped === 'object') {
        for (const k of Object.keys(_egEquipped)) {
            const it = _egEquipped[k];
            if (it && it.slotType && !it.category) it.category = 'equip';
        }
    }
    // ── Map stash: tiered 16× infinite stashes ──
    (function _migrateMapStash() {
        const saved = globalThis.STATE.egMapStash;
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
            globalThis.STATE.egMapStash = _egMapStash;
            try { if (typeof save === 'function') save(); } catch(e) {}
        } else {
            globalThis._egMapStash = _egMakeAllMapStashes();
        }
        // restore active tier if persisted
        if (globalThis.STATE.egMapStashActiveTier != null) {
            const at = Math.max(1, Math.min(EG_MAP_TIER_COUNT, Math.round(globalThis.STATE.egMapStashActiveTier)));
            globalThis._egMapStashActiveTier = at;
        }
    })();
    if (globalThis.STATE.egMapStashActiveTier != null) globalThis._egMapStashActiveTier = Math.max(1, Math.min(EG_MAP_TIER_COUNT, Math.round(globalThis.STATE.egMapStashActiveTier)));

    // ── Currency stash migration to fixed PoE-style slots ──
    // Old saves were 1×30; new is 6×5 with fixed positions. Migrate by collecting items
    // and re-inserting them into their assigned slots (stacking counts).
    (function _migrateCurrency() {
        const saved = globalThis.STATE.egCurrencyStash;
        let needMigration = !Array.isArray(saved)
            || saved.length !== EG_CURRENCY_ROWS
            || (saved[0] && saved[0].length !== EG_CURRENCY_COLS);
        // Also migrate when items are not in their assigned fixed slots
        // (e.g. layout changed from old ordering to new requested ordering).
        if (!needMigration && Array.isArray(saved)) {
            outer: for (let r = 0; r < saved.length; r++) {
                if (!Array.isArray(saved[r])) continue;
                for (let c = 0; c < saved[r].length; c++) {
                    const it = saved[r][c];
                    if (!it || !it.id) continue;
                    const pos = _egCurrencySlotForId(it.id);
                    if (!pos || pos.r !== r || pos.c !== c) { needMigration = true; break outer; }
                }
            }
        }
        if (!needMigration) {
            globalThis._egCurrencyStash = saved;
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
                        _egHealCurrencyItem(it);
                        _egHealEssenceItem(it);
                        items.push(it);
                    }
                }
            }
        }
        // Build fresh fixed-slot grid
        globalThis._egCurrencyStash = Array.from({ length: EG_CURRENCY_ROWS }, () => Array(EG_CURRENCY_COLS).fill(null));
        // Merge stacks by id into assigned slot
        const merged = new Map(); // id → total count
        for (const it of items) {
            const key = it.id;
            const cnt = it.count || 1;
            merged.set(key, (merged.get(key) || 0) + cnt);
        }
        for (const [id, total] of merged.entries()) {
            const pos = _egCurrencySlotForId(id);
            if (!pos) continue; // unknown / unassigned currency - drop (should not happen)
            const def = _egCurrencyDefForId(id);
            // Preserve first item's full object as template (with heals)
            const template = items.find(x => x.id === id) || { id, category: 'currency', rarity: 'currency' };
            _egCurrencyStash[pos.r][pos.c] = {
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
        globalThis.STATE.egCurrencyStash = _egCurrencyStash;
        try { if (typeof save === 'function') save(); } catch(e) {}
    })();
    // Heal after migration as well
    if (Array.isArray(_egCurrencyStash)) {
        for (let r = 0; r < _egCurrencyStash.length; r++) {
            if (!Array.isArray(_egCurrencyStash[r])) { _egCurrencyStash[r] = Array(EG_CURRENCY_COLS).fill(null); continue; }
            // ensure row length
            if (_egCurrencyStash[r].length < EG_CURRENCY_COLS) while(_egCurrencyStash[r].length < EG_CURRENCY_COLS) _egCurrencyStash[r].push(null);
            if (_egCurrencyStash[r].length > EG_CURRENCY_COLS) _egCurrencyStash[r] = _egCurrencyStash[r].slice(0, EG_CURRENCY_COLS);
            for (let c = 0; c < _egCurrencyStash[r].length; c++) {
                const it = _egCurrencyStash[r][c];
                if (it) {
                    _egHealCurrencyItem(it);
                    _egHealEssenceItem(it);
                }
            }
        }
    }
    if (_egCurrencyStash.length < EG_CURRENCY_ROWS) {
        while(_egCurrencyStash.length < EG_CURRENCY_ROWS) _egCurrencyStash.push(Array(EG_CURRENCY_COLS).fill(null));
    }
    // EG_ESSENCE_ROWS/COLS are defined in endgame-essences.js which loads
    // after this file - guard so first-load initialisation never throws.
    // The stash is always normalised to the CURRENT grid dimensions: saves
    // created with an older (smaller) essence tab would otherwise leave
    // rows/cols undefined and crash the essence renderer.
    {
        const essR = typeof EG_ESSENCE_ROWS !== 'undefined' ? EG_ESSENCE_ROWS : 12;
        const essC = typeof EG_ESSENCE_COLS !== 'undefined' ? EG_ESSENCE_COLS : 8;
        const freshEssGrid = Array.from({ length: essR }, () => Array(essC).fill(null));
        const savedEssGrid = globalThis.STATE.egEssenceStash;
        let needsFixedMigration = false;
        if (Array.isArray(savedEssGrid)) {
            // Detect old fixed-slot vs free-form: if any item is not in its assigned slot, migrate
            try {
                if (typeof _egEssenceSlotForId === 'function') {
                    for (let r = 0; r < savedEssGrid.length; r++) {
                        if (!Array.isArray(savedEssGrid[r])) continue;
                        for (let c = 0; c < savedEssGrid[r].length; c++) {
                            const it = savedEssGrid[r][c];
                            if (!it || !it.id) continue;
                            const pos = _egEssenceSlotForId(it.id);
                            if (!pos || pos.r !== r || pos.c !== c) { needsFixedMigration = true; break; }
                        }
                        if (needsFixedMigration) break;
                    }
                    // also if grid size differs from current
                    if (savedEssGrid.length !== essR || (savedEssGrid[0] && savedEssGrid[0].length !== essC)) needsFixedMigration = true;
                }
            } catch(e) { needsFixedMigration = false; }
            if (needsFixedMigration && typeof _egEssenceSlotForId === 'function') {
                // Collect all essence items and re-insert into correct fixed slots
                const allItems = [];
                for (let r = 0; r < savedEssGrid.length; r++) {
                    if (!Array.isArray(savedEssGrid[r])) continue;
                    for (let c = 0; c < savedEssGrid[r].length; c++) {
                        const it = savedEssGrid[r][c];
                        if (it && it.id) {
                            if (typeof _egHealEssenceItem === 'function') _egHealEssenceItem(it);
                            allItems.push(it);
                        }
                    }
                }
                const merged = new Map(); // id -> total count
                const leftover = []; // items with no assigned slot
                const LEGACY_ESSENCE_DISCARD = new Set(['essence_vitality','essence_might','essence_sorcery','essence_swiftness','essence_fortress','essence_elements','essence_puzzle']);
                for (const it of allItems) {
                    if (LEGACY_ESSENCE_DISCARD.has(it.id)) continue; // drop legacy group essences - replaced by per-modifier essences
                    const pos = _egEssenceSlotForId(it.id);
                    if (!pos) { leftover.push(it); continue; }
                    const cnt = it.count || 1;
                    merged.set(it.id, (merged.get(it.id) || 0) + cnt);
                }
                for (const [id, total] of merged.entries()) {
                    const pos = _egEssenceSlotForId(id);
                    if (!pos) continue;
                    const def = (typeof _egEssenceDefForId === 'function') ? _egEssenceDefForId(id) : null;
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
                            const assigned = (typeof _egEssenceIdForSlot === 'function') ? _egEssenceIdForSlot(r,c) : null;
                            if (assigned) continue; // reserved
                            freshEssGrid[r][c] = it;
                            placed = true;
                        }
                    }
                    if (!placed) console.warn('[ESSENCE] leftover essence could not be placed', it.id);
                }
                // Persist migrated shape
                globalThis.STATE.egEssenceStash = freshEssGrid;
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
        globalThis._egEssenceStash = freshEssGrid;
    }
    globalThis._egMapSlotItem = globalThis.STATE.egMapSlotItem || null;
    globalThis._egCraftingBenchItem = globalThis.STATE.egCraftingBenchItem || null;
    // Heal legacy essence cells too (description/category missing from old saves).
    if (Array.isArray(globalThis._egEssenceStash)) {
        for (let r = 0; r < globalThis._egEssenceStash.length; r++) {
            if (!Array.isArray(globalThis._egEssenceStash[r])) continue;
            for (let c = 0; c < globalThis._egEssenceStash[r].length; c++) {
                const it = globalThis._egEssenceStash[r][c];
                if (it) _egHealEssenceItem(it);
            }
        }
    }
    // Mass-sell filter - load (or default-initialise) from the persisted save.
    _egLoadMassSellSettings();
    // Loot filter - load (or default-initialise) from the persisted save.
    if (typeof _egLoadLootFilter === 'function') _egLoadLootFilter();

    // Heal legacy equipment items that were saved before implicits existed.
    try {
        if (typeof _egHealItemImplicits === 'function') {
            if (Array.isArray(_egInventory)) {
                for (let r = 0; r < _egInventory.length; r++) {
                    for (let c = 0; c < EG_INV_COLS; c++) {
                        const it = _egInventory[r][c];
                        if (it && it.category === 'equip' && !it.isUnique) _egHealItemImplicits(it);
                    }
                }
            }
            if (typeof _egEquipped === 'object' && _egEquipped) {
                Object.values(_egEquipped).forEach(it => { if (it && !it.isUnique) _egHealItemImplicits(it); });
            }
        }
    } catch (e) { /* ignore */ }

    // Heal legacy uniques that were saved before base armor/damage was added.
    // Retroactively fills missing defenses/damage/blockChance from the
    // updated EG_UNIQUE_ITEMS definitions (or fallback). Persists if changed.
    try {
        if (typeof _egHealUniqueItem === 'function') {
            let uniqueChanged = false;
            const healGrid = (grid) => {
                if (!Array.isArray(grid)) return;
                for (let r = 0; r < grid.length; r++) {
                    if (!Array.isArray(grid[r])) continue;
                    for (let c = 0; c < grid[r].length; c++) {
                        const it = grid[r][c];
                        if (it && it.isUnique && _egHealUniqueItem(it)) uniqueChanged = true;
                    }
                }
            };
            healGrid(_egInventory);
            if (typeof _egEquipped === 'object' && _egEquipped) {
                for (const it of Object.values(_egEquipped)) if (it && it.isUnique && _egHealUniqueItem(it)) uniqueChanged = true;
            }
            if (globalThis._egMapSlotItem && globalThis._egMapSlotItem.isUnique && _egHealUniqueItem(globalThis._egMapSlotItem)) uniqueChanged = true;
            if (typeof _egCraftingBenchItem !== 'undefined' && globalThis._egCraftingBenchItem && globalThis._egCraftingBenchItem.isUnique && _egHealUniqueItem(globalThis._egCraftingBenchItem)) uniqueChanged = true;
            if (uniqueChanged && typeof egSaveHubState === 'function') { try { egSaveHubState(); } catch (e) {} }
        }
    } catch (e) { /* ignore */ }

    // ── Legacy weapon hands heal (pre-1H/2H saves) ──────────────────────
    try {
        if (typeof _egHealWeaponHands === 'function') {
            let handsChanged = false;
            const healWeaponGrid = (grid) => {
                if (!Array.isArray(grid)) return;
                for (let r = 0; r < grid.length; r++) {
                    if (!Array.isArray(grid[r])) continue;
                    for (let c = 0; c < grid[r].length; c++) {
                        const it = grid[r][c];
                        // _egHealWeaponHands returns TRUE when it CHANGED the
                        // item - non-weapon items must NOT count as changed.
                        if (it && _egHealWeaponHands(it)) handsChanged = true;
                    }
                }
            };
            healWeaponGrid(_egInventory);
            if (typeof _egEquipped === 'object' && _egEquipped) {
                for (const it of Object.values(_egEquipped)) if (it && _egHealWeaponHands(it)) handsChanged = true;
            }
            if (typeof _egCraftingBenchItem !== 'undefined' && globalThis._egCraftingBenchItem && _egHealWeaponHands(globalThis._egCraftingBenchItem)) handsChanged = true;
            if (handsChanged && typeof egSaveHubState === 'function') { try { egSaveHubState(); } catch (e) {} }
        }
    } catch (e) { /* ignore */ }

    // ── Legacy hand migration (pre-1H/2H saves) ────────────────────────
    // A 2H weapon + shield equipped before the patch is illegal now. Free the
    // off-hand into the stash so the very next sheet visit shows a legal,
    // working loadout (offense without block, as designed). Nothing is lost
    // (stash is unlimited); the notice toast is deferred to showEndgameHub so
    // it fires on the visible sheet.
    try {
        if (typeof _egMigrateIllegalHandsToStash === 'function') {
            const _handMoves = _egMigrateIllegalHandsToStash();
            if (_handMoves && _handMoves.length) {
                if (typeof egSaveHubState === 'function') { try { egSaveHubState(); } catch (e) {} }
                _egPendingHandMigrationToast = _handMoves;
            }
        }
    } catch (e) { /* ignore */ }

    // ── Unique Collection load + legacy migration ────────────────────────
    try {
        _egEnsureUniqueStash();
        // Load from STATE
        if (globalThis.STATE.egUniqueStash && typeof globalThis.STATE.egUniqueStash === 'object' && !Array.isArray(globalThis.STATE.egUniqueStash)) {
            globalThis._egUniqueStash = globalThis.STATE.egUniqueStash;
            // ensure arrays
            for (const k of Object.keys(globalThis._egUniqueStash)) if (!Array.isArray(globalThis._egUniqueStash[k])) globalThis._egUniqueStash[k] = globalThis._egUniqueStash[k] ? [globalThis._egUniqueStash[k]] : [];
        } else {
            globalThis._egUniqueStash = {};
        }
        if (Array.isArray(globalThis.STATE.egUniqueCollected)) {
            globalThis._egUniqueCollected = new Set(globalThis.STATE.egUniqueCollected);
        } else {
            globalThis._egUniqueCollected = new Set();
        }
        // Legacy migration: move any isUnique items still sitting in regular inventory into the unique stash
        let migrated = false;
        if (Array.isArray(_egInventory)) {
            for (let r = 0; r < _egInventory.length; r++) {
                for (let c = 0; c < EG_INV_COLS; c++) {
                    const it = _egInventory[r][c];
                    if (it && it.isUnique && it.baseId) {
                        const uid = it.baseId;
                        if (!globalThis._egUniqueStash[uid]) globalThis._egUniqueStash[uid] = [];
                        globalThis._egUniqueStash[uid].push(it);
                        globalThis._egUniqueCollected.add(uid);
                        _egInventory[r][c] = null;
                        migrated = true;
                    }
                }
            }
        }
        // Also ensure collected set contains every key present in stash
        for (const uid of Object.keys(globalThis._egUniqueStash)) globalThis._egUniqueCollected.add(uid);
        // Heal implicits/downsides on unique stash items as well
        if (typeof _egHealUniqueItem === 'function') {
            for (const arr of Object.values(globalThis._egUniqueStash)) {
                for (const it of arr) _egHealUniqueItem(it);
            }
        }
        if (migrated) {
            globalThis.STATE.egUniqueStash = globalThis._egUniqueStash;
            globalThis.STATE.egUniqueCollected = Array.from(globalThis._egUniqueCollected);
            try { if (typeof save === 'function') save(); } catch(e){}
            // persist via egSaveHubState shape (ensures other fields consistent)
            try { egSaveHubState(); } catch(e){}
        }
    } catch(e) { /* ignore unique load */ }

    // Evict any unique that leaked onto the crafting bench. Older builds
    // allowed uniques onto the bench, persisting one in BOTH the bench and
    // the Unique Collection → a duplicate after reload. Uniques are never
    // craftable, so clear the slot; if it isn't already collected, recover
    // it into the collection so nothing is lost. Placed OUTSIDE the unique-
    // stash try above so a migration hiccup can't skip it.
    try {
        if (globalThis._egCraftingBenchItem && globalThis._egCraftingBenchItem.isUnique) {
            if (typeof _egEnsureUniqueStash === 'function') _egEnsureUniqueStash();
            const buid = globalThis._egCraftingBenchItem.baseId || globalThis._egCraftingBenchItem.uniqueId || globalThis._egCraftingBenchItem.id;
            const present = buid && Array.isArray(globalThis._egUniqueStash[buid]) && globalThis._egUniqueStash[buid].length > 0;
            if (buid && !present) {
                if (!globalThis._egUniqueStash[buid]) globalThis._egUniqueStash[buid] = [];
                globalThis._egUniqueStash[buid].push(globalThis._egCraftingBenchItem);
                globalThis._egUniqueCollected.add(buid);
            }
            if (typeof _egHealUniqueItem === 'function') _egHealUniqueItem(globalThis._egCraftingBenchItem);
            globalThis._egCraftingBenchItem = null;
            globalThis.STATE.egCraftingBenchItem = null;
            globalThis.STATE.egUniqueStash = globalThis._egUniqueStash;
            globalThis.STATE.egUniqueCollected = Array.from(globalThis._egUniqueCollected || []);
            try { if (typeof save === 'function') save(); } catch(e){}
        }
    } catch(e) { /* never break hub load for a bench cleanup */ }

    // Endgame achievements - retroactive sync for existing saves
    try {
        if (typeof setAchStat === 'function' && typeof egAtlasProgress === 'function' && globalThis.STATE.egAtlasCompleted) {
            const _ap = egAtlasProgress();
            setAchStat('egAtlasRegions', _ap.completed);
            setAchStat('egAtlasHighestTier', _ap.highestTier);
            // count T16 regions separately
            let _pinn = 0;
            for (const _id in globalThis.STATE.egAtlasCompleted) {
                const _node = (typeof egAtlasNodeById === 'function') ? egAtlasNodeById(_id) : null;
                if (_node && _node.tier === 16 && globalThis.STATE.egAtlasCompleted[_id]) _pinn++;
            }
            setAchStat('egAtlasPinnacle', _pinn);
        }
        if (typeof setAchStat === 'function' && typeof _egUniqueCollected !== 'undefined' && globalThis._egUniqueCollected) {
            setAchStat('egUniquesCollected', globalThis._egUniqueCollected.size);
        }
        if (typeof setAchStat === 'function' && typeof _egGetPlayerLevel === 'function') {
            setAchStat('egPlayerLevel', _egGetPlayerLevel());
        }
        if (typeof setAchStat === 'function' && typeof egGetGold === 'function') {
            // gold earned is cumulative - can't reconstruct, seed with current balance as floor
            const _curGold = egGetGold();
            if (_curGold > 0 && (!ACH_STATE.stats.egGoldEarned || ACH_STATE.stats.egGoldEarned < _curGold)) {
                // use setAchStat to at least reflect balance; real earned will grow via _egAddGold
                setAchStat('egGoldEarned', _curGold);
            }
        }
    } catch(e){}
}

// Call this immideatly so the player does NOT have to open the hub first to re-load his item state.
// This way it runs on game restart automatically.
// Guard (2026-09): this load must SUCCEED before anything may write back to
// STATE via egSaveHubState. If it throws, the session is marked degraded:
// the mirrors may hold half-loaded/empty data, and writing them back would
// wipe the player's real stash. state.js save() refuses that case as well.
// _stoxHubLoadInProgress is cleared in finally so the interlock can never be
// left in "load running" state by a throw midway.
// Module era: hub.js evaluates inside an import cycle, so running the load
// HERE would read uninitialized bindings (EG_ART via the render chain) and
// mark the session load-failed, blocking save-writes. Classic order (art and
// state long before hub) always succeeded. Defer to DOMContentLoaded: every
// module plus the concatenated body is initialized by then, still before any
// user interaction (established step-5 passive-tree pattern).
function _egBootLoadHubState() {
    window._stoxHubLoadInProgress = false;
    try {
        _egLoadHubState();
        window._stoxHubStateLoaded = true;
    } catch (e) {
        window._stoxHubLoadFailed = true;
        console.error('[hub] load failed - save-writes BLOCKED for this session to protect your stash (reload the page)', e);
    } finally {
        window._stoxHubLoadInProgress = false;
    }
}
if (typeof document !== 'undefined' && document.readyState !== 'complete') {
    document.addEventListener('DOMContentLoaded', _egBootLoadHubState);
} else {
    _egBootLoadHubState();
}
