import { trackAchStat } from '../achievements/achievements.js';
import { Audio_Manager } from '../audio/audio.js';
import { t } from '../translation/translations.js';
import { GAME_ART } from './combat-art.js';
import { _getElementCentre } from './combat-class-projectiles.js';
import { _tryDropCurrency } from '../loot/loot-currency-drops.js';
import { _updateObjectivesHUD } from './encounter-chain.js';
import { _spawnItemDrop } from './combat-grid-pickups-items.js';
import { _generateEquipmentDrop } from '../loot/loot-equipment-generator.js';
import { _tryDropEssence } from '../loot/loot-essences-drops.js';
import { _addUniqueToCollection } from '../hub/hub-uniques.js';
import { INV_COLS, _addItemToStash, _inventory, _rebuildInventoryGrid, _renderInventory, _renderUniqueStash, saveHubState } from '../hub/hub.js';
import { _lootFilterAutoVendor } from '../loot/loot-filter.js';
import { _egMapLootQuantityMult } from '../endgame/endgame-map-launch.js';
import { _egTryDropMap } from '../loot/loot-map-drops.js';

import { _tryGenerateUniqueDrop } from '../loot/unique-items.js';
import { _isActive, _lootDrops } from './combat-state.js';
import {

//------------------------------------------------------------------------
//-------------------GRID LOOT DROPS--------------------------------------
//------------------------------------------------------------------------
// Equipment and loot drops on grid cells.
//------------------------------------------------------------------------
    LOOT_DROP_CHANCE_BOSS,
    LOOT_DROP_CHANCE_NORMAL,
    LOOT_DROP_LIFETIME_MS,
    _animatePickupDiscard,
    _buildPickupEligiblePool,
    _cancelTrackedExpiry,
    _cellHasAnyDrop,
    _rarityToastColor,
    _scheduleTrackedExpiry,
} from './combat-grid-pickups.js';


try { Object.defineProperty(globalThis, '_checkLootClaim', { get() { return _checkLootClaim; }, set(v) { _checkLootClaim = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_spawnLootDrop', { get() { return _spawnLootDrop; }, set(v) { _spawnLootDrop = v; }, configurable: true }); } catch (e) {}

// Loot drops are placed on the grid when a monster dies (chance-based).
// They use the same eligible-cell pool as hearts but have their own
// lifetime, visual, and - on claim - go into a per-run temp inventory
// instead of granting immediate HP.
//------------------------------------------------------------------------

// Unlimited stash: always has space (grows on demand). Kept for compat - callers no longer need to gate drops.
export function _stashHasFreeSlot() {
    return true;
}

// Resolves grid art for an equipment drop: base-type art first, then the
// slot silhouette (covers uniques, whose baseId is the unique id with no
// art of its own), else null so callers show the emoji fallback.
function _lootArtId(item) {
    if (!item) return null;
    try {
        if (GAME_ART.url('item', item.baseId)) return item.baseId;
        const slotKey = item.slotType ? 'slot_' + item.slotType : null;
        if (slotKey && GAME_ART.url('item', slotKey)) return slotKey;
    } catch (e) { /* art system not ready - emoji fallback */ }
    return null;
}

// Injects the loot overlay span into the cell's DOM element.
// Re-uses the pickup overlay class but adds a dedicated loot modifier class.
// The glow class is chosen from the item's own rarity so the drop shines
// in its rarity color.
export function _renderLootOverlay(row, col, item) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;
    const span = document.createElement('span');
    // Uniques get an extra class for their signature golden ray/sparkle look.
    const uniqueCls = item.isUnique ? ' sx-unique-drop' : '';
    span.className = `sx-pickup-overlay sx-pickup-rarity-${item.rarity || 'common'} sx-loot-overlay${uniqueCls}`;
    span.id = `sx-loot-${row}-${col}`;
    GAME_ART.fillElement(span, 'item', _lootArtId(item), item.icon || '📦');
    el.appendChild(span);
}

// Removes the loot overlay from the DOM.
export function _removeLootOverlay(key) {
    const [r, c] = key.split('-').map(Number);
    const span = document.getElementById(`sx-loot-${r}-${c}`);
    if (span) span.remove();
}

// Plays the floating icon animation when a loot drop is claimed.
export function _animateLootClaim(row, col, item) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;
    const centre = _getElementCentre(el);
    const floater = document.createElement('div');
    floater.className = 'sx-pickup-floater';
    GAME_ART.fillElement(floater, 'item', _lootArtId(item), item.icon || '📦');
    floater.style.left = `${centre.x}px`;
    floater.style.top = `${centre.y}px`;
    document.body.appendChild(floater);
    setTimeout(() => floater.remove(), 800);
}

// Attempts to place one loot drop on the grid after a monster dies.
// isBoss - pass true for guaranteed drop chance.
// force  - skip the chance roll (the kill handler already picked THIS bucket
//          as the creature's one drop, see _rollKillDropBucket).
function _spawnLootDrop(isBoss = false, monsterLevel = 1, force = false) {
    if (!_isActive()) return;

    // Unlimited stash: no longer gated - _stashHasFreeSlot() always true

    const baseChance = isBoss ? LOOT_DROP_CHANCE_BOSS : LOOT_DROP_CHANCE_NORMAL;
    // Active map's loot quantity bonus scales the drop chance up.
    const qtyMult = (typeof _egMapLootQuantityMult === 'function') ? _egMapLootQuantityMult() : 1;
    const dropChance = Math.min(1, baseChance * qtyMult);
    if (!force && Math.random() > dropChance) return;

    // Don't place a second loot drop if one is already on the board.
    if (_lootDrops.size >= 1) return;

    const pool = _buildPickupEligiblePool();
    // Exclude every cell that already hosts any other drop type.
    const filtered = pool.filter(([r, c]) => !_cellHasAnyDrop(r, c));
    if (filtered.length === 0) return;

    const [r, c] = filtered[Math.floor(Math.random() * filtered.length)];
    const key = `${r}-${c}`;

    // Generate the item that will drop (uses the equipment generator if available,
    // otherwise falls back to a simple placeholder object).
    let item;
    // Uniques first - a small golden-tier chance replaces the regular roll.
    if (typeof _tryGenerateUniqueDrop === 'function') {
        item = _tryGenerateUniqueDrop(monsterLevel);
    }
    if (!item && typeof _generateEquipmentDrop === 'function') {
        item = _generateEquipmentDrop(monsterLevel);
    }

    _lootDrops.set(key, item);
    _renderLootOverlay(r, c, item);
    // Escalating drop sting: uniques > rare/epic > everything else.
    Audio_Manager.playSFX(item && item.isUnique ? 'loot_drop_unique'
        : (item && (item.rarity === 'rare' || item.rarity === 'epic')) ? 'loot_drop_rare'
        : 'loot_drop_normal');

    _scheduleTrackedExpiry(_lootDrops, key, item, LOOT_DROP_LIFETIME_MS, `sx-loot-${r}-${c}`, _removeLootOverlay);
}

// ── Loot explosion ───────────────────────────────────────────────────────────
// Boss-clear reward: scatters MANY items onto the grid at once, bypassing
// the normal one-drop-at-a-time cap. Items cascade in with a short stagger
// so it reads as an explosion rather than a silent bulk placement.

export const LOOT_EXPLOSION_EQUIPMENT = 5;      // equipment pieces
export const LOOT_EXPLOSION_STAGGER_MS = 150;   // cascade delay between drops

// Places a single loot item on a free cell - no chance roll, no board cap.
// Used by the loot explosion. Returns true when the item was placed.
export function _placeLootDropForce(item) {
    const pool = _buildPickupEligiblePool();
    const filtered = pool.filter(([r, c]) => !_cellHasAnyDrop(r, c));
    if (filtered.length === 0) return false;

    const [r, c] = filtered[Math.floor(Math.random() * filtered.length)];
    const key = `${r}-${c}`;

    _lootDrops.set(key, item);
    _renderLootOverlay(r, c, item);

    _scheduleTrackedExpiry(_lootDrops, key, item, LOOT_DROP_LIFETIME_MS, `sx-loot-${r}-${c}`, _removeLootOverlay);
    return true;
}

// Called when the final map boss dies. Rains equipment plus currency, gold,
// essence and a usable item onto the grid in a staggered cascade.
export function _spawnLootExplosion(monsterLevel = 1) {
    if (!_isActive()) return;
    Audio_Manager.playSFX('loot_explosion');

    const tryScheduleOne = () => {
        // Unlimited stash: always has room

        let item = null;
        if (typeof _tryGenerateUniqueDrop === 'function') {
            item = _tryGenerateUniqueDrop(monsterLevel);
        }
        if (!item && typeof _generateEquipmentDrop === 'function') {
            item = _generateEquipmentDrop(monsterLevel);
        }
        if (!item) return false;

        return _placeLootDropForce(item);
    };

    // Cascade the equipment drops in one by one.
    for (let i = 0; i < LOOT_EXPLOSION_EQUIPMENT; i++) {
        setTimeout(() => {
            if (!_isActive()) return;
            if (!tryScheduleOne()) return;
            if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) {
                Audio_Manager.playSFX('player_equip_pickup');
            }
        }, i * LOOT_EXPLOSION_STAGGER_MS);
    }

    // Side drops ride the same wave (their own board caps keep things sane).
    setTimeout(() => {
        if (!_isActive()) return;
        for (let i = 0; i < 2; i++) {
            if (typeof _tryDropCurrency === 'function') _tryDropCurrency(true);
        }
        if (typeof _tryDropEssence === 'function') _tryDropEssence(true);
        if (typeof _spawnItemDrop === 'function') _spawnItemDrop(true);
        if (typeof _egTryDropMap === 'function') _egTryDropMap(true, monsterLevel);
    }, LOOT_EXPLOSION_STAGGER_MS);

    globalThis.showToast(t('eg_loot_explosion'), '#f5d98a');
}

// Called when the player correctly claims the cell that holds a loot drop.
// Adds the item to the run's temporary loot bag AND instantly to the stash
// (mirroring currency/item drops) so pressing B mid-puzzle shows it at once.
// The run bag keeps the reference for the leave-map summary; _flushRunLootToStash
// skips already-stashed items via item._stashed, so no duplication occurs.
// Returns true if a loot drop was present and claimed.
export function _checkLootClaim(row, col) {
    if (!_isActive()) return false;
    const key = `${row}-${col}`;
    const item = _lootDrops.get(key);
    if (!item) return false;

    _cancelTrackedExpiry(_lootDrops, key, item);
    _lootDrops.delete(key);
    _removeLootOverlay(key);
    _animateLootClaim(row, col, item);

    // ── Loot filter: auto-vendor non-matching equipment at pickup ──
    // If the filter is enabled and the item matches no keep rule, it is
    // destroyed for a rolled shard right here (Ctrl+click behaviour) and
    // never reaches the run loot bag or the stash.
    if (typeof _lootFilterAutoVendor === 'function') {
        try {
            if (_lootFilterAutoVendor(item)) {
                _updateObjectivesHUD();
                return true;
            }
        } catch (e) { /* filter failure must never block a normal pickup */ }
    }

    globalThis._runLoot.push(item);
    // Instant stash (campaign + endgame): the B overlay reads _inventory,
    // so the item must land there now - not only at map clear. Uniques route
    // to the collection via _addItemToStash; failures fall back to the bag.
    try {
        if (typeof _addItemToStash === 'function') {
            const prevMute = (typeof window !== 'undefined' ? window._muteUniqueToast : false);
            if (typeof window !== 'undefined') window._muteUniqueToast = true;
            _addItemToStash(item, { uniqueToInventory: true });
            if (typeof window !== 'undefined') window._muteUniqueToast = prevMute;
            item._stashed = true;
            if (typeof saveHubState === 'function') saveHubState();
        }
    } catch (e) { /* stash failure must never block the claim - flush retries at map end */ }
    _updateObjectivesHUD();

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
        .replace('{name}', item.name + nameSuffix), _rarityToastColor(item.rarity));
    Audio_Manager.playSFX('player_equip_pickup');
    return true;
}

// Called when the player makes a WRONG action on a cell that has a loot drop.
// The drop is silently discarded.
export function _discardLootDrop(row, col) {
    if (!_isActive()) return;
    const key = `${row}-${col}`;
    if (!_lootDrops.has(key)) return;
    const item = _lootDrops.get(key);
    _cancelTrackedExpiry(_lootDrops, key, item);
    _lootDrops.delete(key);
    _removeLootOverlay(key);
    _animatePickupDiscard(row, col, { emoji: item.icon || '📦', artId: _lootArtId(item) }); // reuse broken-heart anim

    Audio_Manager.playSFX('player_equip_not_pickup');
}

// Clears all active loot drops from the board (called by _stopPickupSpawner).
export function _stopLootDrops() {
    Array.from(_lootDrops.entries()).forEach(([key, item]) => _cancelTrackedExpiry(_lootDrops, key, item));
    _lootDrops.forEach((item, key) => _removeLootOverlay(key));
    _lootDrops.clear();
}

// Flushes all run loot into the first available stash slots.
// Call this on successful map clear, BEFORE _chainCleanup resets the state.
// Unlimited stash: grows rows as needed so nothing is ever lost.
// Idempotent: items already stashed instantly on claim (item._stashed)
// are skipped so a mid-run B-open flush + the end-of-run flush never duplicate.
export function _flushRunLootToStash() {
    if (globalThis._runLoot.length === 0) return;

    const pending = globalThis._runLoot.filter((it) => it && !it._stashed);
    if (pending.length === 0) return;

    let placedInv = 0, placedUniq = 0;
    for (const item of pending) {
        const isUniq = !!(item && item.isUnique);
        if (typeof _addItemToStash === 'function') {
            // _addItemToStash routes uniques to the collection (which toasts itself); suppress its internal toast during bulk flush
            // Temporarily mute unique toasts by flag
            const prevMute = (typeof window !== 'undefined' ? window._muteUniqueToast : false);
            if (isUniq && typeof window !== 'undefined') window._muteUniqueToast = true;
            _addItemToStash(item, { uniqueToInventory: true });
            if (typeof window !== 'undefined') window._muteUniqueToast = prevMute;
            item._stashed = true;
            if (isUniq) placedUniq++; else placedInv++;
        } else {
            if (isUniq && typeof _addUniqueToCollection === 'function') { _addUniqueToCollection(item); item._stashed = true; placedUniq++; }
            else {
                let done = false;
                for (let r = 0; r < _inventory.length && !done; r++) {
                    for (let c = 0; c < INV_COLS && !done; c++) if (!_inventory[r][c]) { _inventory[r][c] = item; done = true; placedInv++; }
                }
                if (!done) {
                    _inventory.push(Array(INV_COLS).fill(null));
                    _inventory[_inventory.length - 1][0] = item;
                    placedInv++;
                }
                item._stashed = true;
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
        if (typeof _renderInventory === 'function') _renderInventory();
        if (typeof _renderUniqueStash === 'function') _renderUniqueStash();
        if (typeof _rebuildInventoryGrid === 'function') _rebuildInventoryGrid();
        if (typeof saveHubState === 'function') saveHubState();
    }
}


// Re-places items that were on the grid when a chain transition happened.
// Called at the start of a new chained puzzle so loot is never silently lost.
export function _replaceCarriedLootDrops(items) {
    if (!items || items.length === 0) return;

    items.forEach(item => {
        // Unlimited stash: no cap - always re-place carried loot

        // Carry-over must preserve every pending drop - even the 5-item
        // loot explosion. The normal "1 on board" cap only applies to
        // fresh spawns, not to loot we are rescuing from a solved grid.
        const pool = _buildPickupEligiblePool();
        const filtered = pool.filter(([r, c]) => !_cellHasAnyDrop(r, c));
        if (filtered.length === 0) return;

        const [r, c] = filtered[Math.floor(Math.random() * filtered.length)];
        const key = `${r}-${c}`;

        _lootDrops.set(key, item);
        _renderLootOverlay(r, c, item);

        _scheduleTrackedExpiry(_lootDrops, key, item, LOOT_DROP_LIFETIME_MS, `sx-loot-${r}-${c}`, _removeLootOverlay);
    });

    if (items.length > 0) globalThis.showToast(t('eg_loot_carried'));
}
