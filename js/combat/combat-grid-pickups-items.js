import { Audio_Manager } from '../audio/audio.js';
import { t } from '../translation/translations.js';
import { EG_ART } from '../endgame/endgame-art.js';
import { _egGetElementCentre } from './combat-class-projectiles.js';
import { _egMapLootQuantityMult } from '../endgame/endgame-map-launch.js';
import {
    EG_LOOT_DROP_LIFETIME_MS,
    _egAnimatePickupDiscard,
    _egBuildPickupEligiblePool,
    _egCancelTrackedExpiry,
    _egCellHasAnyDrop,
    _egRarityToastColor,
    _egScheduleTrackedExpiry,
} from './combat-grid-pickups.js';
import { _egIsActive, _egItemDrops } from './combat-state.js';
import { STATE, save } from '../state.js';

// Same idea as loot/currency drops (above), but for the regular puzzle
// items from ITEM_DEFS. A defeated monster has a small chance to drop a
// random weighted item onto the grid. Claiming it adds it directly to
// the player's persistent STATE.inventory.
//------------------------------------------------------------------------

// Chance (0–1) that a defeated monster drops a regular item onto the grid.
// Intentionally rare - items are a bonus, not the expected reward.
export const EG_ITEM_DROP_CHANCE_NORMAL = 0.05;  // 5% per normal monster kill
export const EG_ITEM_DROP_CHANCE_BOSS = 0.25;  // 25% per boss kill

// Hard cap: one regular-item drop on the board at a time.
export const EG_ITEM_DROP_MAX_ON_BOARD = 1;

// Maps an ITEM_DEFS rarity to one of the overlay glow classes that exist
// in CSS. Falls back to common for unknown values.
export function _egItemDropRarityClass(rarity) {
    return ['common', 'uncommon', 'rare', 'epic', 'legendary', 'cursed', 'artifact']
        .includes(rarity) ? rarity : 'common';
}

export function _egRenderItemDropOverlay(row, col, drop) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;
    const def = globalThis.ITEM_DEFS[drop.defId];
    const rarityCls = _egItemDropRarityClass(def && def.rarity);
    const span = document.createElement('span');
    span.className = `eg-pickup-overlay eg-pickup-rarity-${rarityCls} eg-item-drop-overlay`;
    span.id = `eg-item-drop-${row}-${col}`;
    // Puzzle items have no art in the manifest yet - wires the def id so
    // future art shows automatically, emoji fallback until then.
    EG_ART.fillElement(span, 'item', drop && drop.defId, (def && def.icon) || '📦');
    el.appendChild(span);
}

export function _egRemoveItemDropOverlay(key) {
    const [r, c] = key.split('-').map(Number);
    const span = document.getElementById(`eg-item-drop-${r}-${c}`);
    if (span) span.remove();
}

export function _egAnimateItemDropClaim(row, col, drop) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;
    const def = globalThis.ITEM_DEFS[drop.defId];
    const centre = _egGetElementCentre(el);
    const floater = document.createElement('div');
    floater.className = 'eg-pickup-floater';
    EG_ART.fillElement(floater, 'item', drop && drop.defId, (def && def.icon) || '📦');
    floater.style.left = `${centre.x}px`;
    floater.style.top = `${centre.y}px`;
    document.body.appendChild(floater);
    setTimeout(() => floater.remove(), 800);
}

// Attempts to place one regular-item drop on the grid after a monster dies.
// isBoss - pass true for the higher boss drop chance.
// Ironman: puzzle items never spawn - only currency/equipment/maps/hearts/mana/eraser/surge do.
export function _egSpawnItemDrop(isBoss = false) {
    if (!_egIsActive()) return;
    if (typeof curMods !== 'undefined' && globalThis.curMods.ironman) return;

    const baseItemChance = isBoss ? EG_ITEM_DROP_CHANCE_BOSS : EG_ITEM_DROP_CHANCE_NORMAL;
    const itemQtyMult = (typeof _egMapLootQuantityMult === 'function') ? _egMapLootQuantityMult() : 1;
    const dropChance = Math.min(1, baseItemChance * itemQtyMult);
    if (Math.random() > dropChance) return;

    // One regular-item drop on the board at a time.
    if (_egItemDrops.size >= EG_ITEM_DROP_MAX_ON_BOARD) return;

    const pool = _egBuildPickupEligiblePool();
    const filtered = pool.filter(([r, c]) => !_egCellHasAnyDrop(r, c));
    if (filtered.length === 0) return;

    // Pick a random item from the same weighted pool used for lucky tiles.
    // Returns null when suppressed (e.g. Apex Collector filter).
    const itemId = (typeof pickRandomItem === 'function') ? globalThis.pickRandomItem() : null;
    if (!itemId || !globalThis.ITEM_DEFS[itemId]) return;

    const [r, c] = filtered[Math.floor(Math.random() * filtered.length)];
    const key = `${r}-${c}`;
    const drop = { defId: itemId };

    _egItemDrops.set(key, drop);
    _egRenderItemDropOverlay(r, c, drop);

    _egScheduleTrackedExpiry(_egItemDrops, key, drop, EG_LOOT_DROP_LIFETIME_MS, `eg-item-drop-${r}-${c}`, _egRemoveItemDropOverlay);
}

// Called on correct action on the cell holding a regular-item drop.
// Adds the item straight into the player's persistent inventory.
// Returns true if a drop was present and claimed.
export function _egCheckItemDropClaim(row, col) {
    if (!_egIsActive()) return false;
    const key = `${row}-${col}`;
    const drop = _egItemDrops.get(key);
    if (!drop) return false;

    _egCancelTrackedExpiry(_egItemDrops, key, drop);
    _egItemDrops.delete(key);
    _egRemoveItemDropOverlay(key);
    _egAnimateItemDropClaim(row, col, drop);

    const def = globalThis.ITEM_DEFS[drop.defId];
    STATE.inventory.push({
        uid: `item_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        defId: drop.defId,
    });
    save();
    globalThis.buildInventoryPanel();

    // Track for the leave-map summary screen (mirrors _egTrackRunCurrency)
    globalThis._egRunItems.push({
        defId: drop.defId,
        icon: (def && def.icon) || '📦',
        name: def ? globalThis.itemName(def) : '???',
        rarity: (def && def.rarity) || 'common',
    });

    Audio_Manager.playSFX('player_equip_pickup');
    globalThis.showToast(t('eg_item_claimed')
        .replace('{icon}', (def && def.icon) || '')
        .replace('{name}', globalThis.itemName(def)), _egRarityToastColor(def && def.rarity));
    return true;
}

// Called when the player makes a WRONG action on a cell with a regular-item
// drop. The drop is destroyed (mirrors the other drop types).
export function _egDiscardItemDrop(row, col) {
    if (!_egIsActive()) return;
    const key = `${row}-${col}`;
    if (!_egItemDrops.has(key)) return;
    const drop = _egItemDrops.get(key);
    const def = globalThis.ITEM_DEFS[drop.defId];
    _egCancelTrackedExpiry(_egItemDrops, key, drop);
    _egItemDrops.delete(key);
    _egRemoveItemDropOverlay(key);
    _egAnimatePickupDiscard(row, col, { emoji: (def && def.icon) || '📦', id: drop.defId });

    Audio_Manager.playSFX('player_equip_not_pickup');
}

// Clears all active regular-item drops (called by _egStopPickupSpawner).
export function _egStopItemDrops() {
    Array.from(_egItemDrops.entries()).forEach(([key, drop]) => _egCancelTrackedExpiry(_egItemDrops, key, drop));
    _egItemDrops.forEach((drop, key) => _egRemoveItemDropOverlay(key));
    _egItemDrops.clear();
}

// Carries an unclaimed regular-item drop into the next chained puzzle
// (mirrors _egReplaceCarriedCurrencyDrops).
// Ironman: discard carried puzzle items instead of re-placing them.
export function _egReplaceCarriedItemDrops(drops) {
    if (!drops || drops.length === 0) return;
    if (typeof curMods !== 'undefined' && globalThis.curMods.ironman) return;

    drops.forEach(drop => {
        if (_egItemDrops.size >= EG_ITEM_DROP_MAX_ON_BOARD) return;

        const pool = _egBuildPickupEligiblePool();
        const filtered = pool.filter(([r, c]) => !_egCellHasAnyDrop(r, c));
        if (filtered.length === 0) return;

        const [r, c] = filtered[Math.floor(Math.random() * filtered.length)];
        const key = `${r}-${c}`;

        _egItemDrops.set(key, drop);
        _egRenderItemDropOverlay(r, c, drop);

        _egScheduleTrackedExpiry(_egItemDrops, key, drop, EG_LOOT_DROP_LIFETIME_MS, `eg-item-drop-${r}-${c}`, _egRemoveItemDropOverlay);
    });
}
