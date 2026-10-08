import { trackAchStat } from '../achievements/achievements.js';
import { Audio_Manager } from '../audio/audio.js';
import { t } from '../translation/translations.js';
import { EG_ART } from '../endgame/endgame-art.js';
import { _egGetElementCentre } from './combat-class-projectiles.js';
import { _egTryDropCurrency } from '../loot/loot-currency-drops.js';
import { _egUpdateObjectivesHUD } from './encounter-chain.js';
import { _egSpawnItemDrop } from './combat-grid-pickups-items.js';
import { _egGenerateEquipmentDrop } from '../loot/loot-equipment-generator.js';
import { _egTryDropEssence } from '../loot/loot-essences-drops.js';
import { _egAddUniqueToCollection } from '../endgame/endgame-hub-uniques.js';
import { EG_INV_COLS, _egAddItemToStash, _egInventory, _egRebuildInventoryGrid, _egRenderInventory, _egRenderUniqueStash, egSaveHubState } from '../endgame/endgame-hub.js';
import { _egLootFilterAutoVendor } from '../loot/loot-filter.js';
import { _egMapLootQuantityMult } from '../endgame/endgame-map-launch.js';
import { _egTryDropMap } from '../loot/loot-map-drops.js';

import { _egTryGenerateUniqueDrop } from '../loot/unique-items.js';
import { _egIsActive, _egLootDrops } from './combat-state.js';
import {
    EG_LOOT_DROP_CHANCE_BOSS,
    EG_LOOT_DROP_CHANCE_NORMAL,
    EG_LOOT_DROP_LIFETIME_MS,
    _egAnimatePickupDiscard,
    _egBuildPickupEligiblePool,
    _egCancelTrackedExpiry,
    _egCellHasAnyDrop,
    _egRarityToastColor,
    _egScheduleTrackedExpiry,
} from './combat-grid-pickups.js';


try { Object.defineProperty(globalThis, '_egCheckLootClaim', { get() { return _egCheckLootClaim; }, set(v) { _egCheckLootClaim = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egSpawnLootDrop', { get() { return _egSpawnLootDrop; }, set(v) { _egSpawnLootDrop = v; }, configurable: true }); } catch (e) {}

// Loot drops are placed on the grid when a monster dies (chance-based).
// They use the same eligible-cell pool as hearts but have their own
// lifetime, visual, and - on claim - go into a per-run temp inventory
// instead of granting immediate HP.
//------------------------------------------------------------------------

// Unlimited stash: always has space (grows on demand). Kept for compat - callers no longer need to gate drops.
export function _egStashHasFreeSlot() {
    return true;
}

// Resolves grid art for an equipment drop: base-type art first, then the
// slot silhouette (covers uniques, whose baseId is the unique id with no
// art of its own), else null so callers show the emoji fallback.
function _egLootArtId(item) {
    if (!item) return null;
    try {
        if (EG_ART.url('item', item.baseId)) return item.baseId;
        const slotKey = item.slotType ? 'slot_' + item.slotType : null;
        if (slotKey && EG_ART.url('item', slotKey)) return slotKey;
    } catch (e) { /* art system not ready - emoji fallback */ }
    return null;
}

// Injects the loot overlay span into the cell's DOM element.
// Re-uses the pickup overlay class but adds a dedicated loot modifier class.
// The glow class is chosen from the item's own rarity so the drop shines
// in its rarity color.
export function _egRenderLootOverlay(row, col, item) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;
    const span = document.createElement('span');
    // Uniques get an extra class for their signature golden ray/sparkle look.
    const uniqueCls = item.isUnique ? ' eg-unique-drop' : '';
    span.className = `eg-pickup-overlay eg-pickup-rarity-${item.rarity || 'common'} eg-loot-overlay${uniqueCls}`;
    span.id = `eg-loot-${row}-${col}`;
    EG_ART.fillElement(span, 'item', _egLootArtId(item), item.icon || '📦');
    el.appendChild(span);
}

// Removes the loot overlay from the DOM.
export function _egRemoveLootOverlay(key) {
    const [r, c] = key.split('-').map(Number);
    const span = document.getElementById(`eg-loot-${r}-${c}`);
    if (span) span.remove();
}

// Plays the floating icon animation when a loot drop is claimed.
export function _egAnimateLootClaim(row, col, item) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;
    const centre = _egGetElementCentre(el);
    const floater = document.createElement('div');
    floater.className = 'eg-pickup-floater';
    EG_ART.fillElement(floater, 'item', _egLootArtId(item), item.icon || '📦');
    floater.style.left = `${centre.x}px`;
    floater.style.top = `${centre.y}px`;
    document.body.appendChild(floater);
    setTimeout(() => floater.remove(), 800);
}

// Attempts to place one loot drop on the grid after a monster dies.
// isBoss - pass true for guaranteed drop chance.
function _egSpawnLootDrop(isBoss = false, monsterLevel = 1) {
    if (!_egIsActive()) return;

    // Unlimited stash: no longer gated - _egStashHasFreeSlot() always true

    const baseChance = isBoss ? EG_LOOT_DROP_CHANCE_BOSS : EG_LOOT_DROP_CHANCE_NORMAL;
    // Active map's loot quantity bonus scales the drop chance up.
    const qtyMult = (typeof _egMapLootQuantityMult === 'function') ? _egMapLootQuantityMult() : 1;
    const dropChance = Math.min(1, baseChance * qtyMult);
    if (Math.random() > dropChance) return;

    // Don't place a second loot drop if one is already on the board.
    if (_egLootDrops.size >= 1) return;

    const pool = _egBuildPickupEligiblePool();
    // Exclude every cell that already hosts any other drop type.
    const filtered = pool.filter(([r, c]) => !_egCellHasAnyDrop(r, c));
    if (filtered.length === 0) return;

    const [r, c] = filtered[Math.floor(Math.random() * filtered.length)];
    const key = `${r}-${c}`;

    // Generate the item that will drop (uses the equipment generator if available,
    // otherwise falls back to a simple placeholder object).
    let item;
    // Uniques first - a small golden-tier chance replaces the regular roll.
    if (typeof _egTryGenerateUniqueDrop === 'function') {
        item = _egTryGenerateUniqueDrop(monsterLevel);
    }
    if (!item && typeof _egGenerateEquipmentDrop === 'function') {
        item = _egGenerateEquipmentDrop(monsterLevel);
    }

    _egLootDrops.set(key, item);
    _egRenderLootOverlay(r, c, item);

    _egScheduleTrackedExpiry(_egLootDrops, key, item, EG_LOOT_DROP_LIFETIME_MS, `eg-loot-${r}-${c}`, _egRemoveLootOverlay);
}

// ── Loot explosion ───────────────────────────────────────────────────────────
// Boss-clear reward: scatters MANY items onto the grid at once, bypassing
// the normal one-drop-at-a-time cap. Items cascade in with a short stagger
// so it reads as an explosion rather than a silent bulk placement.

export const EG_LOOT_EXPLOSION_EQUIPMENT = 5;      // equipment pieces
export const EG_LOOT_EXPLOSION_STAGGER_MS = 150;   // cascade delay between drops

// Places a single loot item on a free cell - no chance roll, no board cap.
// Used by the loot explosion. Returns true when the item was placed.
export function _egPlaceLootDropForce(item) {
    const pool = _egBuildPickupEligiblePool();
    const filtered = pool.filter(([r, c]) => !_egCellHasAnyDrop(r, c));
    if (filtered.length === 0) return false;

    const [r, c] = filtered[Math.floor(Math.random() * filtered.length)];
    const key = `${r}-${c}`;

    _egLootDrops.set(key, item);
    _egRenderLootOverlay(r, c, item);

    _egScheduleTrackedExpiry(_egLootDrops, key, item, EG_LOOT_DROP_LIFETIME_MS, `eg-loot-${r}-${c}`, _egRemoveLootOverlay);
    return true;
}

// Called when the final map boss dies. Rains equipment plus currency, gold,
// essence and a usable item onto the grid in a staggered cascade.
export function _egSpawnLootExplosion(monsterLevel = 1) {
    if (!_egIsActive()) return;

    const tryScheduleOne = () => {
        // Unlimited stash: always has room

        let item = null;
        if (typeof _egTryGenerateUniqueDrop === 'function') {
            item = _egTryGenerateUniqueDrop(monsterLevel);
        }
        if (!item && typeof _egGenerateEquipmentDrop === 'function') {
            item = _egGenerateEquipmentDrop(monsterLevel);
        }
        if (!item) return false;

        return _egPlaceLootDropForce(item);
    };

    // Cascade the equipment drops in one by one.
    for (let i = 0; i < EG_LOOT_EXPLOSION_EQUIPMENT; i++) {
        setTimeout(() => {
            if (!_egIsActive()) return;
            if (!tryScheduleOne()) return;
            if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) {
                Audio_Manager.playSFX('player_equip_pickup');
            }
        }, i * EG_LOOT_EXPLOSION_STAGGER_MS);
    }

    // Side drops ride the same wave (their own board caps keep things sane).
    setTimeout(() => {
        if (!_egIsActive()) return;
        for (let i = 0; i < 2; i++) {
            if (typeof _egTryDropCurrency === 'function') _egTryDropCurrency(true);
        }
        if (typeof _egTryDropEssence === 'function') _egTryDropEssence(true);
        if (typeof _egSpawnItemDrop === 'function') _egSpawnItemDrop(true);
        if (typeof _egTryDropMap === 'function') _egTryDropMap(true, monsterLevel);
    }, EG_LOOT_EXPLOSION_STAGGER_MS);

    globalThis.showToast(t('eg_loot_explosion'), '#f5d98a');
}

// Called when the player correctly claims the cell that holds a loot drop.
// Adds the item to the run's temporary loot bag AND instantly to the stash
// (mirroring currency/item drops) so pressing B mid-puzzle shows it at once.
// The run bag keeps the reference for the leave-map summary; _egFlushRunLootToStash
// skips already-stashed items via item._egStashed, so no duplication occurs.
// Returns true if a loot drop was present and claimed.
export function _egCheckLootClaim(row, col) {
    if (!_egIsActive()) return false;
    const key = `${row}-${col}`;
    const item = _egLootDrops.get(key);
    if (!item) return false;

    _egCancelTrackedExpiry(_egLootDrops, key, item);
    _egLootDrops.delete(key);
    _egRemoveLootOverlay(key);
    _egAnimateLootClaim(row, col, item);

    // ── Loot filter: auto-vendor non-matching equipment at pickup ──
    // If the filter is enabled and the item matches no keep rule, it is
    // destroyed for a rolled shard right here (Ctrl+click behaviour) and
    // never reaches the run loot bag or the stash.
    if (typeof _egLootFilterAutoVendor === 'function') {
        try {
            if (_egLootFilterAutoVendor(item)) {
                _egUpdateObjectivesHUD();
                return true;
            }
        } catch (e) { /* filter failure must never block a normal pickup */ }
    }

    globalThis._egRunLoot.push(item);
    // Instant stash (campaign + endgame): the B overlay reads _egInventory,
    // so the item must land there now - not only at map clear. Uniques route
    // to the collection via _egAddItemToStash; failures fall back to the bag.
    try {
        if (typeof _egAddItemToStash === 'function') {
            const prevMute = (typeof window !== 'undefined' ? window._egMuteUniqueToast : false);
            if (typeof window !== 'undefined') window._egMuteUniqueToast = true;
            _egAddItemToStash(item);
            if (typeof window !== 'undefined') window._egMuteUniqueToast = prevMute;
            item._egStashed = true;
            if (typeof egSaveHubState === 'function') egSaveHubState();
        }
    } catch (e) { /* stash failure must never block the claim - flush retries at map end */ }
    _egUpdateObjectivesHUD();

    if (typeof trackAchStat === 'function') try {
        if (item.rarity === 'epic') trackAchStat('egEpicLooted', 1);
        if (item.rarity === 'epic' && Array.isArray(item.mods) && item.mods.length >= 6) trackAchStat('egSixModLooted', 1);
        if (item.isUnique) trackAchStat('egUniquesCollected', 1);
    } catch(e){}

    const requiredLevel = item.requirements && item.requirements.level;
    const nameSuffix = (item.category === 'equip' && Number.isFinite(requiredLevel))
        ? ` [${requiredLevel}]`
        : '';
    globalThis.showToast(t('eg_loot_claimed')
        .replace('{icon}', item.isUnique ? '✨' : (item.icon || ''))
        .replace('{name}', item.name + nameSuffix), _egRarityToastColor(item.rarity));
    Audio_Manager.playSFX('player_equip_pickup');
    return true;
}

// Called when the player makes a WRONG action on a cell that has a loot drop.
// The drop is silently discarded.
export function _egDiscardLootDrop(row, col) {
    if (!_egIsActive()) return;
    const key = `${row}-${col}`;
    if (!_egLootDrops.has(key)) return;
    const item = _egLootDrops.get(key);
    _egCancelTrackedExpiry(_egLootDrops, key, item);
    _egLootDrops.delete(key);
    _egRemoveLootOverlay(key);
    _egAnimatePickupDiscard(row, col, { emoji: item.icon || '📦', artId: _egLootArtId(item) }); // reuse broken-heart anim

    Audio_Manager.playSFX('player_equip_not_pickup');
}

// Clears all active loot drops from the board (called by _egStopPickupSpawner).
export function _egStopLootDrops() {
    Array.from(_egLootDrops.entries()).forEach(([key, item]) => _egCancelTrackedExpiry(_egLootDrops, key, item));
    _egLootDrops.forEach((item, key) => _egRemoveLootOverlay(key));
    _egLootDrops.clear();
}

// Flushes all run loot into the first available stash slots.
// Call this on successful map clear, BEFORE _egChainCleanup resets the state.
// Unlimited stash: grows rows as needed so nothing is ever lost.
// Idempotent: items already stashed instantly on claim (item._egStashed)
// are skipped so a mid-run B-open flush + the end-of-run flush never duplicate.
export function _egFlushRunLootToStash() {
    if (globalThis._egRunLoot.length === 0) return;

    const pending = globalThis._egRunLoot.filter((it) => it && !it._egStashed);
    if (pending.length === 0) return;

    let placedInv = 0, placedUniq = 0;
    for (const item of pending) {
        const isUniq = !!(item && item.isUnique);
        if (typeof _egAddItemToStash === 'function') {
            // _egAddItemToStash routes uniques to the collection (which toasts itself); suppress its internal toast during bulk flush
            // Temporarily mute unique toasts by flag
            const prevMute = (typeof window !== 'undefined' ? window._egMuteUniqueToast : false);
            if (isUniq && typeof window !== 'undefined') window._egMuteUniqueToast = true;
            _egAddItemToStash(item);
            if (typeof window !== 'undefined') window._egMuteUniqueToast = prevMute;
            item._egStashed = true;
            if (isUniq) placedUniq++; else placedInv++;
        } else {
            if (isUniq && typeof _egAddUniqueToCollection === 'function') { _egAddUniqueToCollection(item); item._egStashed = true; placedUniq++; }
            else {
                let done = false;
                for (let r = 0; r < _egInventory.length && !done; r++) {
                    for (let c = 0; c < EG_INV_COLS && !done; c++) if (!_egInventory[r][c]) { _egInventory[r][c] = item; done = true; placedInv++; }
                }
                if (!done) {
                    _egInventory.push(Array(EG_INV_COLS).fill(null));
                    _egInventory[_egInventory.length - 1][0] = item;
                    placedInv++;
                }
                item._egStashed = true;
            }
        }
    }

    if (placedInv > 0 || placedUniq > 0) {
        if (placedUniq > 0 && placedInv === 0) {
            // uniques only - single aggregate toast handled via collection helper? Provide one aggregate
            globalThis.showToast(placedUniq === 1
                ? t('eg_unique_added_to_collection').replace('{name}', pending.find(i=>i.isUnique)?.name || 'Unique')
                : t('eg_stash_added_many').replace('{n}', placedUniq) + ' → Unique Collection');
        } else if (placedUniq > 0 && placedInv > 0) {
            globalThis.showToast(t('eg_stash_added_many').replace('{n}', placedInv) + ` + ${placedUniq} Unique(s) → Collection`);
        } else {
            globalThis.showToast(placedInv === 1
                ? t('eg_stash_added_one')
                : t('eg_stash_added_many').replace('{n}', placedInv));
        }
        // Re-render the stash grids if the hub screen is currently visible
        if (typeof _egRenderInventory === 'function') _egRenderInventory();
        if (typeof _egRenderUniqueStash === 'function') _egRenderUniqueStash();
        if (typeof _egRebuildInventoryGrid === 'function') _egRebuildInventoryGrid();
        if (typeof egSaveHubState === 'function') egSaveHubState();
    }
}


// Re-places items that were on the grid when a chain transition happened.
// Called at the start of a new chained puzzle so loot is never silently lost.
export function _egReplaceCarriedLootDrops(items) {
    if (!items || items.length === 0) return;

    items.forEach(item => {
        // Unlimited stash: no cap - always re-place carried loot

        // Carry-over must preserve every pending drop - even the 5-item
        // loot explosion. The normal "1 on board" cap only applies to
        // fresh spawns, not to loot we are rescuing from a solved grid.
        const pool = _egBuildPickupEligiblePool();
        const filtered = pool.filter(([r, c]) => !_egCellHasAnyDrop(r, c));
        if (filtered.length === 0) return;

        const [r, c] = filtered[Math.floor(Math.random() * filtered.length)];
        const key = `${r}-${c}`;

        _egLootDrops.set(key, item);
        _egRenderLootOverlay(r, c, item);

        _egScheduleTrackedExpiry(_egLootDrops, key, item, EG_LOOT_DROP_LIFETIME_MS, `eg-loot-${r}-${c}`, _egRemoveLootOverlay);
    });

    if (items.length > 0) globalThis.showToast(t('eg_loot_carried'));
}
