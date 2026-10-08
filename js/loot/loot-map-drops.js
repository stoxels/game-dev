import { Audio_Manager } from '../audio/audio.js';
import { t } from '../translation/translations.js';
import { EG_ART } from '../endgame/endgame-art.js';
import { egAtlasAdjacentBonusChance, egAtlasAdjacentBonusPercent, egAtlasPickAdjacentBonusNodeId } from '../endgame/endgame-atlas.js';
import { _egGetElementCentre } from '../combat/combat-class-projectiles.js';
import { _egRenderMapStashCell, _egUpdateMapStashTabCounts } from '../endgame/endgame-gate.js';
import { EG_LOOT_DROP_LIFETIME_MS, _egAnimatePickupDiscard, _egBuildPickupEligiblePool, _egCancelTrackedExpiry, _egCellHasAnyDrop, _egRarityToastColor, _egScheduleTrackedExpiry, _egStartDropExpireCountdown } from '../combat/combat-grid-pickups.js';
import { EG_MAP_STASH_COLS, EG_MAP_STASH_ROWS, EG_MAP_TIER_COUNT, _egFindFreeMapCellForTier, _egGetMapTierGrid, _egMapStash, _egRebuildMapStashGrid, egSaveHubState } from '../endgame/endgame-hub.js';
import { _egActiveMapItem, _egMapLootQuantityMult } from '../endgame/endgame-map-launch.js';
import { _egIsActive } from '../combat/combat-state.js';
import { _egGetMapRewardBonuses } from './loot-map-mod-rewards.js';
import { _egGenerateMapDrop, _egResolveAtlasDropTarget } from './loot-maps.js';
import { EG_MAP_DROP_CHANCE_NORMAL } from './loot-map-config.js';

//----------------------------------------------------------------------
//----------------------------MAP GRID DROPS----------------------------
//----------------------------------------------------------------------

// Maps land on the puzzle grid when monsters die. Claiming one banks it
// into the Probability Gate map stash. This file owns the live drop map,
// so it also re-exposes the handful of names the concatenated grid code
// reaches for through globalThis.

// Maps land on the grid when monsters die. Claiming a map drop banks it
// directly into the Probability Gate map stash (_egMapStash).

export const _egMapDrops = new Map();          // "row-col" → map item
export let _egMapStashFullToastAt = 0;         // throttle for the stash-full toast

// The concatenated grid code (screens.js, mouse-button-handlers.js,
// title-bindings.js) predates the module split and reaches for these five
// names through globalThis, so re-expose them as live getters. They are
// deliberately NOT entry-scope exports - the owner lists them under
// accessorGlobals instead, so entry.mjs never imports them.
try { Object.defineProperty(globalThis, '_egMapDrops', { get() { return _egMapDrops; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egCheckMapDropClaim', { get() { return _egCheckMapDropClaim; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egDiscardMapDrop', { get() { return _egDiscardMapDrop; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egBankUnclaimedMapDrops', { get() { return _egBankUnclaimedMapDrops; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egReplaceCarriedMapDrops', { get() { return _egReplaceCarriedMapDrops; }, configurable: true }); } catch (e) {}
// Returns true when the gate screen map stash has at least one free slot.
// Per-tier stashes are infinite (auto-expand), so this is always true.
// Kept for legacy vendor / claim callers that guard before adding.
export function _egMapStashHasFreeSlot(tier) {
    return true;
}
// Writes a map into the first free cell of its tier's stash (infinite).
// Returns true on success. If item has a mapTier, it routes to that tier;
// otherwise falls back to tierOverride or the active tab.
export function _egAddMapToMapStash(item, tierOverride) {
    if (!item) return false;
    let tier = tierOverride != null ? tierOverride : (item.mapTier != null ? item.mapTier : (globalThis._egMapStashActiveTier || 1));
    tier = Math.max(1, Math.min(EG_MAP_TIER_COUNT || 16, Math.round(tier)));
    try {
        if (typeof _egFindFreeMapCellForTier === 'function' && typeof _egGetMapTierGrid === 'function') {
            const pos = _egFindFreeMapCellForTier(tier);
            _egGetMapTierGrid(tier)[pos.r][pos.c] = item;
            // if the target tier is currently visible, render that cell; otherwise just sync count
            if (tier === (globalThis._egMapStashActiveTier || 1) && document.getElementById('eg-map-stash-grid')) {
                // ensure grid has enough DOM rows - rebuild if needed
                const gridLen = _egGetMapTierGrid(tier).length;
                const domCells = document.querySelectorAll('.eg-map-stash-cell').length;
                const needed = gridLen * EG_MAP_STASH_COLS;
                if (domCells < needed && typeof _egRebuildMapStashGrid === 'function') {
                    _egRebuildMapStashGrid();
                } else {
                    _egRenderMapStashCell(pos.r, pos.c);
                }
            } else if (typeof _egUpdateMapStashTabCounts === 'function') {
                _egUpdateMapStashTabCounts();
            }
            return true;
        }
    } catch(e) {}
    // fallback flat grid (should not happen after migration)
    for (let r = 0; r < EG_MAP_STASH_ROWS; r++) {
        for (let c = 0; c < EG_MAP_STASH_COLS; c++) {
            if (!_egMapStash[r][c]) {
                _egMapStash[r][c] = item;
                _egRenderMapStashCell(r, c);
                return true;
            }
        }
    }
    return false;
}

// Called by the kill handlers in endgame-encounter.js.
// PoE-style sustain: while running a map the drop chance is multiplied by the
// active map's Quantity bonus (EG_MAP_MOD_REWARDS.quantity). Harder maps
// (more / higher-tier mods) therefore sustain maps much better.
export function _egTryDropMap(isBoss, monsterLevel) {
    // PoE-style: map items only drop from monsters level 55 or higher
    // (allows drops in late campaign: World 13 EXPECTATION PLATEAU and Nexus World)
    const MIN_MONSTER_LEVEL_FOR_MAP_DROPS = 55;
    if ((monsterLevel || 0) < MIN_MONSTER_LEVEL_FOR_MAP_DROPS) return;

    // Resolve Quantity multiplier from the active device map, if any.
    let qtyMult = 1;
    if (typeof _egMapLootQuantityMult === 'function') {
        qtyMult = _egMapLootQuantityMult();
    } else if (typeof _egActiveMapItem !== 'undefined' && _egActiveMapItem
        && typeof _egGetMapRewardBonuses === 'function') {
        const rw = _egGetMapRewardBonuses(_egActiveMapItem);
        qtyMult = 1 + (rw.quantity || 0) / 100;
    }

    // PoE-style drop rules: the atlas region a dropped map belongs to is
    // resolved per kill source (see _egResolveAtlasDropTarget). When no
    // device run is active this is null and the legacy tier roll applies.
    const targetNodeId = _egResolveAtlasDropTarget(isBoss);

    if (isBoss) {
        // Bosses always drop at least one map. When running a difficult map
        // (high Quantity) they have a bonus chance for a second map.
        const map = _egGenerateMapDrop(monsterLevel, null, { atlasNodeId: targetNodeId });
        if (typeof _egSpawnMapDrop === 'function') _egSpawnMapDrop(map);
        if (qtyMult > 1) {
            const extraChance = Math.min(0.35, (qtyMult - 1) * 0.30);
            if (Math.random() < extraChance) {
                const extra = _egGenerateMapDrop(monsterLevel, null, { atlasNodeId: targetNodeId });
                if (typeof _egSpawnMapDrop === 'function') _egSpawnMapDrop(extra);
            }
        }
        return;
    }

    const baseChance = Math.min(1, EG_MAP_DROP_CHANCE_NORMAL * qtyMult);
    if (Math.random() > baseChance) return;

    const map = _egGenerateMapDrop(monsterLevel, null, { atlasNodeId: targetNodeId });
    if (typeof _egSpawnMapDrop === 'function') _egSpawnMapDrop(map);
}

// Atlas completion bonus (PoE-style): after a SUCCESSFUL map run there is
// one independent extra roll for an additional ADJACENT map drop. Chance =
// +1% per completed atlas region (see egAtlasAdjacentBonusChance).
// The bonus map comes from a region linked to the just-finished run's
// region - preferring an uncompleted +1-tier link so the bonus can climb
// to higher tiers (see egAtlasPickAdjacentBonusNodeId) - and is banked
// straight into the map stash (+ _egRunMaps so it shows in the leave-map
// summary). Must be called from _egEndMap() AFTER _egAtlasOnMapCompleted()
// so a fresh first clear already counts.
// Returns the bonus map item when the roll succeeded, else null.
export function _egRollAtlasAdjacentBonusDrop(activeMapItem) {
    if (typeof egAtlasAdjacentBonusChance !== 'function') return null;
    let chance = 0;
    try { chance = egAtlasAdjacentBonusChance(); } catch (e) { chance = 0; }
    if (!(chance > 0)) return null;
    if (Math.random() >= chance) return null;

    let bonusNodeId = null;
    try {
        bonusNodeId = egAtlasPickAdjacentBonusNodeId(
            activeMapItem ? activeMapItem.atlasNodeId : null);
    } catch (e) { bonusNodeId = null; }

    const monsterLevel = (activeMapItem && (activeMapItem.monsterLevel || activeMapItem.itemLevel))
        ? (activeMapItem.monsterLevel || activeMapItem.itemLevel) : 1;
    const bonusMap = _egGenerateMapDrop(monsterLevel, null, { atlasNodeId: bonusNodeId });
    if (!bonusMap) return null;

    _egAddMapToMapStash(bonusMap);
    if (typeof _egRunMaps !== 'undefined' && Array.isArray(globalThis._egRunMaps)) globalThis._egRunMaps.push(bonusMap);

    let pct = 0;
    try { pct = egAtlasAdjacentBonusPercent(); } catch (e) { pct = Math.round(chance * 100); }
    if (typeof showToast === 'function') {
        try {
            globalThis.showToast(t('eg_atlas_bonus_drop')
                .replace('{p}', pct)
                .replace('{name}', bonusMap.name || ''), '#7fd67f');
        } catch (e) {}
    }
    return bonusMap;
}

// Places a map drop on an eligible grid cell (mirrors _egSpawnLootDrop).
export function _egSpawnMapDrop(map) {
    if (!_egIsActive() || !map) return;
    if (_egMapDrops.size >= 1) return; // one map drop on the board at a time

    const pool = typeof _egBuildPickupEligiblePool === 'function'
        ? _egBuildPickupEligiblePool()
        : [];
    const filtered = typeof _egCellHasAnyDrop === 'function'
        ? pool.filter(([r, c]) => !_egCellHasAnyDrop(r, c))
        : pool;
    if (filtered.length === 0) return;

    const [r, c] = filtered[Math.floor(Math.random() * filtered.length)];
    const key = `${r}-${c}`;

    _egMapDrops.set(key, map);

    // Overlay visual - reuses the loot overlay styling with a map tint class.
    // Glow class follows the map's own rarity color. Shows the tier-specific
    // map art (map_tNN via EG_ART.artIdForItem) when available, else emoji.
    const el = document.getElementById(`g-${r}-${c}`);
    if (el) {
        const span = document.createElement('span');
        span.className = `eg-pickup-overlay eg-pickup-rarity-${map.rarity || 'common'} eg-loot-overlay eg-mapdrop-overlay`;
        span.id = `eg-mapdrop-${r}-${c}`;
        EG_ART.fillElement(span, 'item', EG_ART.artIdForItem(map), map.icon || '🗺️');
        el.appendChild(span);
    }

    // Auto-expire after the shared loot lifetime (pause-aware).
    const lifetime = EG_LOOT_DROP_LIFETIME_MS;
    if (typeof _egScheduleTrackedExpiry === 'function') {
        _egScheduleTrackedExpiry(_egMapDrops, key, map, lifetime, `eg-mapdrop-${r}-${c}`, _egRemoveMapDropOverlay);
    } else {
        const timer = setTimeout(() => {
            if (_egMapDrops.get(key) === map) {
                _egMapDrops.delete(key);
                _egRemoveMapDropOverlay(key);
            }
        }, lifetime);
        if (typeof _egPickupTimers !== 'undefined') globalThis._egPickupTimers.push(timer);
        if (typeof _egStartDropExpireCountdown === 'function') {
            _egStartDropExpireCountdown(`eg-mapdrop-${r}-${c}`, lifetime);
        }
    }
}

export function _egRemoveMapDropOverlay(key) {
    const [r, c] = key.split('-').map(Number);
    const span = document.getElementById(`eg-mapdrop-${r}-${c}`);
    if (span) span.remove();
}

export function _egAnimateMapDropClaim(row, col, item) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;
    const centre = typeof _egGetElementCentre === 'function' ? _egGetElementCentre(el) : { x: 0, y: 0 };
    const floater = document.createElement('div');
    floater.className = 'eg-pickup-floater';
    EG_ART.fillElement(floater, 'item', EG_ART.artIdForItem(item), item.icon || '🗺️');
    floater.style.left = `${centre.x}px`;
    floater.style.top = `${centre.y}px`;
    document.body.appendChild(floater);
    setTimeout(() => floater.remove(), 800);
}

// Called from _egCheckAllClaims (mouse-button-handlers.js) and
// _egAutoClaimDropsOnReveal (endgame-grid-pickups.js). Banks the claimed map
// straight into the Probability Gate map stash.
export function _egCheckMapDropClaim(row, col) {
    if (!_egIsActive()) return false;
    const key = `${row}-${col}`;
    const map = _egMapDrops.get(key);
    if (!map) return false;

    // Tiered stashes are infinite - no capacity check needed.

    if (typeof _egCancelTrackedExpiry === 'function') _egCancelTrackedExpiry(_egMapDrops, key, map);
    _egMapDrops.delete(key);
    _egRemoveMapDropOverlay(key);
    _egAnimateMapDropClaim(row, col, map);

    _egAddMapToMapStash(map);

    // Track for the leave-map summary screen (mirrors _egTrackRunCurrency)
    if (typeof _egRunMaps !== 'undefined') globalThis._egRunMaps.push(map);

    globalThis.showToast(t('eg_map_claimed')
        .replace('{icon}', map.icon || '')
        .replace('{name}', map.name)
        .replace('{tier}', map.mapTier != null ? map.mapTier : '?'), _egRarityToastColor(map.rarity));
    Audio_Manager.playSFX('player_equip_pickup');
    egSaveHubState();
    return true;
}

// Called from _egDiscardAllDrops (mouse-button-handlers.js).
export function _egDiscardMapDrop(row, col) {
    if (!_egIsActive()) return;
    const key = `${row}-${col}`;
    if (!_egMapDrops.has(key)) return;
    const map = _egMapDrops.get(key);
    if (typeof _egCancelTrackedExpiry === 'function') _egCancelTrackedExpiry(_egMapDrops, key, map);
    _egMapDrops.delete(key);
    _egRemoveMapDropOverlay(key);
    if (typeof _egAnimatePickupDiscard === 'function') {
        _egAnimatePickupDiscard(row, col, { emoji: map.icon || '🗺️', artId: EG_ART.artIdForItem(map) });
    }
    Audio_Manager.playSFX('player_equip_not_pickup');
}

// Banks any unclaimed map drops still sitting on the grid. Called on
// map leave / forfeit / defeat so maps never silently vanish when the run ends.
export function _egBankUnclaimedMapDrops() {
    if (_egMapDrops.size === 0) return;
    let banked = 0;
    for (const [, map] of Array.from(_egMapDrops.entries())) {
        if (_egAddMapToMapStash(map)) banked++;
    }
    _egMapDrops.clear();
    document.querySelectorAll('[id^="eg-mapdrop-"]').forEach(el => el.remove());
    if (banked > 0) egSaveHubState();
}

// Clears all active map drops from the board (called by _egStopPickupSpawner).
export function _egStopMapDrops() {
    if (typeof _egCancelTrackedExpiry === 'function') {
        Array.from(_egMapDrops.entries()).forEach(([key, map]) => _egCancelTrackedExpiry(_egMapDrops, key, map));
    }
    _egMapDrops.forEach((map, key) => _egRemoveMapDropOverlay(key));
    _egMapDrops.clear();
}

// Carries unclaimed map drops into the next chained puzzle
// (mirrors _egReplaceCarriedLootDrops / _egReplaceCarriedCurrencyDrops).
export function _egReplaceCarriedMapDrops(maps) {
    if (!maps || maps.length === 0) return;

    maps.forEach(map => {
        if (_egMapDrops.size >= 1) return;

        const pool = typeof _egBuildPickupEligiblePool === 'function'
            ? _egBuildPickupEligiblePool()
            : [];
        const filtered = typeof _egCellHasAnyDrop === 'function'
            ? pool.filter(([r, c]) => !_egCellHasAnyDrop(r, c))
            : pool;
        if (filtered.length === 0) return;

        const [r, c] = filtered[Math.floor(Math.random() * filtered.length)];
        const key = `${r}-${c}`;

        _egMapDrops.set(key, map);

        const el = document.getElementById(`g-${r}-${c}`);
        if (el) {
            const span = document.createElement('span');
            span.className = `eg-pickup-overlay eg-pickup-rarity-${map.rarity || 'common'} eg-loot-overlay eg-mapdrop-overlay`;
            span.id = `eg-mapdrop-${r}-${c}`;
            EG_ART.fillElement(span, 'item', EG_ART.artIdForItem(map), map.icon || '🗺️');
            el.appendChild(span);
        }

        const lifetime = typeof EG_LOOT_DROP_LIFETIME_MS !== 'undefined' ? EG_LOOT_DROP_LIFETIME_MS : 60000;
        if (typeof _egScheduleTrackedExpiry === 'function') {
            _egScheduleTrackedExpiry(_egMapDrops, key, map, lifetime, `eg-mapdrop-${r}-${c}`, _egRemoveMapDropOverlay);
        } else {
            const timer = setTimeout(() => {
                if (_egMapDrops.get(key) === map) {
                    _egMapDrops.delete(key);
                    _egRemoveMapDropOverlay(key);
                }
            }, lifetime);
            if (typeof _egPickupTimers !== 'undefined') globalThis._egPickupTimers.push(timer);
            if (typeof _egStartDropExpireCountdown === 'function') {
                _egStartDropExpireCountdown(`eg-mapdrop-${r}-${c}`, lifetime);
            }
        }
    });
}


