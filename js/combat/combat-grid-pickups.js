import { Audio_Manager } from '../audio/audio.js';
import { ALL_SLOTS, SLOT_DISPLAY_INDEX, _getAbilityData, _getAbilityName, _patchCooldownButton, _showCooldownReadyToast, cooldownState } from '../classes/class-cooldown-state.js';
import { buildClassHUD } from '../classes/class-hud.js';
import { _getPlayerMaxMana, gainMana } from '../classes/class-mana.js';
import { _updateMistakeCounterHUD } from '../penalty.js';
import { questStat_mistakesRemoved } from '../inference/inference-stats.js';
import { _charmCellHasDrop } from '../skills/skill-charms.js';
import { t } from '../translation/translations.js';
import { EG_ART } from '../endgame/endgame-art.js';
import { _egGetElementCentre } from './combat-class-projectiles.js';
import { _egActiveMapItem } from '../endgame/endgame-map-launch.js';
import { EG_MAX_MAP_TIER } from '../loot/loot-map-config.js';
import { _egMapDrops } from '../loot/loot-map-drops.js';
import { _egComputePlayerStats } from '../endgame/endgame-player-stats.js';
import { _egCurrencyDrops, _egItemDrops, _egLootDrops, _egPickups } from './combat-state.js';
import { cur } from '../state.js';


//------------------------------------------------------------------------
//-------------------CONSTANTS & DATA DEFINITIONS-------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


// Pickup spawner timing
export const EG_PICKUP_SPAWN_INTERVAL_MIN = 8000;  // ms minimum between spawn attempts
export const EG_PICKUP_SPAWN_INTERVAL_MAX = 18000; // ms maximum between spawn attempts
export const EG_PICKUP_MAX_ON_BOARD = 1;     // hard cap on simultaneous pickups
export const EG_PICKUP_LIFETIME_MS = 20000; // ms before an uncollected pickup disappears

// Hearts are the character's only direct emergency healing source. Do not let
// random pickup rolls consume the pickup slot with a non-healing item while
// the player is critically injured.
export const EG_PICKUP_CRITICAL_HP_RATIO = 0.5;

// ── Monster loot drop constants ──────────────────────────────────────────────
// Chance (0–1) that a defeated monster drops a loot item onto the grid.
// Bosses always use EG_LOOT_DROP_CHANCE_BOSS.
export const EG_LOOT_DROP_CHANCE_NORMAL = 0.35;  // 35% per normal monster kill
export const EG_LOOT_DROP_CHANCE_BOSS = 1.00;  // bosses always drop

// Lifetime of an uncollected loot drop on the grid (ms).
// Intentionally longer than heart pickups - no rush to grab loot.
export const EG_LOOT_DROP_LIFETIME_MS = 60000;

// How long (ms) before a drop expires its countdown timer appears above it.
// Applies to every grid drop type: hearts, equipment, currency, items, maps.
export const EG_DROP_EXPIRE_WARNING_MS = 7000;

// Hard cap: how many currency orbs may sit on the board at the same time.
export const EG_CURRENCY_DROP_MAX_ON_BOARD = 4;

// Seconds removed from a randomly chosen ability slot's cooldown when the
// Arcane Surge pickup is claimed.
export const EG_COOLDOWN_SURGE_REDUCTION_SECS = 30;

// Hard cap: never place a loot drop if it would push pending loot +
// items already in the stash beyond this free-slot budget.
// Checked via _egStashHasFreeSlot() at drop time.








// ── Map-tier scaling for heart / mana pickups ───────────────────────────────
// Hearts and mana orbs become more potent in higher map tiers, on top of
// any gear bonuses. Mana scales slower than life so sustain stays balanced.
// Tier 1 is the baseline (1.0×). Each additional tier adds a fixed %.
//
//   heart: +12% per tier → T16 ≈ 2.8×  (e.g. 10/25/50 → ~28/70/140 at T16)
//   mana : + 7% per tier → T16 ≈ 2.05× (e.g. 20/50 → ~41/102 at T16, full restore unaffected)
export const EG_HEART_TIER_SCALE_PER_TIER = 0.12;
export const EG_MANA_TIER_SCALE_PER_TIER = 0.07;

export function _egGetPickupTier() {
    if (typeof _egActiveMapItem !== 'undefined' && _egActiveMapItem && _egActiveMapItem.mapTier != null) {
        const cap = (typeof EG_MAX_MAP_TIER !== 'undefined') ? EG_MAX_MAP_TIER : 16;
        const t = Math.max(1, Math.min(cap, Math.round(_egActiveMapItem.mapTier)));
        return t;
    }
    return 1;
}

export function _egHeartTierMult() {
    const tier = _egGetPickupTier();
    return 1 + EG_HEART_TIER_SCALE_PER_TIER * (tier - 1);
}

export function _egManaTierMult() {
    const tier = _egGetPickupTier();
    return 1 + EG_MANA_TIER_SCALE_PER_TIER * (tier - 1);
}

// Helper: computes the effective heart heal amount after map-tier and gear bonuses.
// Tier scaling is applied to the base heart value first, then gear adds on top:
//   scaledBase = round(base * tierMult)
//   effective  = (scaledBase + flat) * (1 + incPct/100)
// Gear provides two stats that modify heart healing:
//   heartHealFlat   - flat +# added to every heart (e.g. "+15 to Heart Heal Amount")
//   heartHealIncPct - #% increased Heart Heal Amount (multiplier on the total)
export function _egCalcHeartHeal(baseAmount) {
    let flat = 0;
    let incPct = 0;
    if (typeof _egComputePlayerStats === 'function') {
        try {
            const s = _egComputePlayerStats();
            flat = Number(s.heartHealFlat) || 0;
            incPct = Number(s.heartHealIncPct) || 0;
        } catch (e) { /* stats unavailable (e.g. outside endgame) - use base */ }
    }
    const tierMult = _egHeartTierMult();
    const scaledBase = Math.round(baseAmount * tierMult);
    const total = (scaledBase + flat) * (1 + incPct / 100);
    return Math.max(0, Math.round(total));
}

// Helper: computes the effective mana gain from a mana pickup after map-tier and gear bonuses.
// Mirrors _egCalcHeartHeal but with a lower tier multiplier so mana sustain grows
// more slowly than life sustain with map tier.
//   manaHealFlat   - flat +# added to every mana pickup (e.g. "+15 to Mana Gain")
//   manaHealIncPct - #% increased Mana Gained (multiplier on the total)
//   scaledBase = round(base * tierMult)  - skipped for the full-restore orb (base == maxMana)
//   effective  = (scaledBase + flat) * (1 + incPct/100)
export function _egCalcManaGain(baseAmount) {
    let flat = 0;
    let incPct = 0;
    if (typeof _egComputePlayerStats === 'function') {
        try {
            const s = _egComputePlayerStats();
            flat = Number(s.manaHealFlat) || 0;
            incPct = Number(s.manaHealIncPct) || 0;
        } catch (e) { /* stats unavailable (e.g. outside endgame) - use base */ }
    }
    let tierMult = _egManaTierMult();
    // Full-restore orb (base == maxMana) should not be tier-scaled - it already
    // restores the entire pool and gainMana() clamps to max anyway. Detect it
    // so the toast reflects the true gain instead of an inflated 2× value.
    if (typeof _getPlayerMaxMana === 'function') {
        try {
            const max = _getPlayerMaxMana();
            if (max > 0 && baseAmount >= max) tierMult = 1;
        } catch (e) { /* ignore */ }
    }
    const scaledBase = Math.round(baseAmount * tierMult);
    const total = (scaledBase + flat) * (1 + incPct / 100);
    return Math.max(0, Math.round(total));
}

// Pickup definitions
// Each entry describes one pickup type that can appear on grid tiles.
//   id        - unique key, referenced by EG_PICKUP_WEIGHTS
//   emoji     - shown on the tile overlay and in the claim toast
//   label     - human-readable name (for future UI use)
//   rarity    - 'common' | 'uncommon' | 'rare'  (controls glow CSS class)
//   onPickup  - called with (row, col) when the player claims the pickup
//
// To add new pickup types (items, currency, etc.) add an entry here and a
// corresponding weight entry in EG_PICKUP_WEIGHTS. No other code needs changing.
export const EG_PICKUP_DEFS = {
    heart_small: {
        id: 'heart_small', emoji: '💛', label: () => t('eg_pickup_heart_small'), rarity: 'common',
        onPickup(row, col) {
            const heal = _egCalcHeartHeal(10);
            globalThis.playerCurrentHP = Math.min(globalThis.playerMaxHP, globalThis.playerCurrentHP + heal);
            globalThis._renderPlayerHealth();
            globalThis.showToast(t('eg_pickup_heal_small').replace('{n}', heal), _egRarityToastColor(this.rarity));
            Audio_Manager.playSFX('heart_heals');
        },
    },
    heart_medium: {
        id: 'heart_medium', emoji: '🧡', label: () => t('eg_pickup_heart'), rarity: 'uncommon',
        onPickup(row, col) {
            const heal = _egCalcHeartHeal(25);
            globalThis.playerCurrentHP = Math.min(globalThis.playerMaxHP, globalThis.playerCurrentHP + heal);
            globalThis._renderPlayerHealth();
            globalThis.showToast(t('eg_pickup_heal_medium').replace('{n}', heal), _egRarityToastColor(this.rarity));
            Audio_Manager.playSFX('heart_heals');
        },
    },
    heart_large: {
        id: 'heart_large', emoji: '❤️', label: () => t('eg_pickup_heart_large'), rarity: 'rare',
        onPickup(row, col) {
            const heal = _egCalcHeartHeal(50);
            globalThis.playerCurrentHP = Math.min(globalThis.playerMaxHP, globalThis.playerCurrentHP + heal);
            globalThis._renderPlayerHealth();
            globalThis.showToast(t('eg_pickup_heal_large').replace('{n}', heal), _egRarityToastColor(this.rarity));
            Audio_Manager.playSFX('heart_heals');
        },
    },
    // Mana orbs - endgame only (mana system is gated to isEndgameLevel()).
    // gainMana() clamps to max mana, applies the map's "% reduced Mana
    // gained" mod and refreshes the HUD bar; it returns the amount actually
    // gained so the toast stays honest when the pool is nearly full.
    mana_small: {
        id: 'mana_small', emoji: '💧', label: () => t('eg_pickup_mana_small'), rarity: 'common',
        onPickup(row, col) {
            const gained = gainMana(_egCalcManaGain(20));
            if (gained > 0) {
                globalThis.showToast(t('eg_pickup_mana_gain_small').replace('{n}', gained),
                    _egRarityToastColor(this.rarity));
                Audio_Manager.playSFX('mana_pickup');
            } else {
                globalThis.showToast(t('eg_pickup_mana_full'), _egRarityToastColor(this.rarity));
            }
        },
    },
    mana_medium: {
        id: 'mana_medium', emoji: '🔵', label: () => t('eg_pickup_mana_medium'), rarity: 'uncommon',
        onPickup(row, col) {
            const gained = gainMana(_egCalcManaGain(50));
            if (gained > 0) {
                globalThis.showToast(t('eg_pickup_mana_gain_medium').replace('{n}', gained),
                    _egRarityToastColor(this.rarity));
                Audio_Manager.playSFX('mana_pickup');
            } else {
                globalThis.showToast(t('eg_pickup_mana_full'), _egRarityToastColor(this.rarity));
            }
        },
    },
    mana_full: {
        id: 'mana_full', emoji: '🔮', label: () => t('eg_pickup_mana_full_orb'), rarity: 'rare',
        onPickup(row, col) {
            const before = globalThis.playerCurrentMana;
            const gained = gainMana(_egCalcManaGain(_getPlayerMaxMana()));
            if (gained > 0) {
                globalThis.showToast(t('eg_pickup_mana_gain_full').replace('{n}', globalThis.playerCurrentMana - before),
                    _egRarityToastColor(this.rarity));
                Audio_Manager.playSFX('mana_pickup');
            } else {
                globalThis.showToast(t('eg_pickup_mana_full'), _egRarityToastColor(this.rarity));
            }
        },
    },
    // Erases one mistake from the current mistake counter. Somewhat rare.
    mistake_eraser: {
        id: 'mistake_eraser', emoji: '🧽', label: () => t('eg_pickup_mistake_eraser'), rarity: 'rare',
        onPickup(row, col) {
            if (globalThis.mistakeCount > 0) {
                globalThis.mistakeCount--;
                globalThis._levelMistakesErased++;
                if (typeof questStat_mistakesRemoved === 'function') questStat_mistakesRemoved(1);

                // Full HUD sync: refreshes the top-left mistake counter
                // (including "x / y" on endgame maps), the objectives strip,
                // and re-checks the map's mistake limit so the budget is restored.
                if (typeof _updateMistakeCounterHUD === 'function') {
                    _updateMistakeCounterHUD();
                } else if (typeof _setMistakeCounterText === 'function') {
                    globalThis._setMistakeCounterText();
                }
                globalThis.showToast(t('eg_pickup_mistake_erased'), _egRarityToastColor(this.rarity));
            } else {
                globalThis.showToast(t('eg_pickup_mistake_none'), _egRarityToastColor(this.rarity));
            }
        },
    },
    // Reduces the cooldown of one random ability slot (1-4) that currently has a cooldown.
    // A bit more common than the Mistake Eraser.
    cooldown_surge: {
        id: 'cooldown_surge', emoji: '⚡', label: () => t('eg_pickup_cooldown_surge'), rarity: 'uncommon',
        onPickup(row, col) {
            const slotsWithCooldown = ALL_SLOTS.filter(slot => {
                const state = cooldownState[slot];
                return state && state.remaining > 0;
            });

            if (slotsWithCooldown.length === 0) {
                globalThis.showToast(t('eg_pickup_cooldown_none_any'), _egRarityToastColor(this.rarity));
                return;
            }

            const slot = slotsWithCooldown[Math.floor(Math.random() * slotsWithCooldown.length)];
            const state = cooldownState[slot];
            const slotIndex = SLOT_DISPLAY_INDEX[slot] ?? slot;
            const abilityData = (typeof _getAbilityData === 'function') ? _getAbilityData(slot) : null;
            const displayName = `[${slotIndex}] ${abilityData ? _getAbilityName(abilityData) : ''}`.trim();

            const before = state.remaining;
            state.remaining = Math.max(0, state.remaining - EG_COOLDOWN_SURGE_REDUCTION_SECS);

            if (state.remaining === 0) {
                clearInterval(state.interval);
                state.interval = null;
                buildClassHUD();
            } else if (typeof _patchCooldownButton === 'function') {
                _patchCooldownButton(slot);
            }

            globalThis.showToast(t('eg_pickup_cooldown_reduced')
                .replace('{name}', displayName)
                .replace('{n}', before - state.remaining),
                _egRarityToastColor(this.rarity));

            if (state.remaining === 0 && typeof _showCooldownReadyToast === 'function') {
                _showCooldownReadyToast(slot);
            }
        },
    },
    // Future pickup types go here:
    // item_pickup: {
    //     id: 'item_pickup', emoji: '📦', label: 'Item', rarity: 'uncommon',
    //     onPickup(row, col) { /* grant random item to inventory */ },
    // },
};

// Weighted table for pickup type selection.
// Increase a weight value to make that pickup more common.
export const EG_PICKUP_WEIGHTS = [
    { id: 'heart_small', weight: 60 },
    { id: 'heart_medium', weight: 30 },
    { id: 'heart_large', weight: 10 },
    { id: 'mana_small', weight: 25 },      // ~17% - mana counterpart to hearts
    { id: 'mana_medium', weight: 12 },
    { id: 'mana_full', weight: 4 },        // full restore - rarest pickup
    { id: 'cooldown_surge', weight: 8 },   // ~7% - a bit more common than eraser
    { id: 'mistake_eraser', weight: 5 },   // ~4% - somewhat rare
];









//------------------------------------------------------------------------
//-------------------PICKUP HELPERS---------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Maps rarities to toast text colors so loot / pickup notifications
// are colorized by the item's rarity.
export function _egRarityToastColor(rarity) {
    return {
        common: '#b0b0b0',
        uncommon: '#2ecc71',
        rare: '#3498db',
        epic: '#c39bd3',
        legendary: '#f5b642',
        cursed: '#e74c3c',
        artifact: '#f1c40f',
        currency: '#aa9060',
    }[rarity] || '#ffffff';
}

// Returns a random pickup def selected by weighted random from EG_PICKUP_WEIGHTS.
export function _egPickRandomPickup() {
    const total = EG_PICKUP_WEIGHTS.reduce((sum, e) => sum + e.weight, 0);
    let roll = Math.random() * total;
    for (const entry of EG_PICKUP_WEIGHTS) {
        roll -= entry.weight;
        if (roll <= 0) return EG_PICKUP_DEFS[entry.id];
    }
    return EG_PICKUP_DEFS['heart_small']; // fallback - should never be reached
}

// Returns true if the cell at (row, col) is eligible to host a pickup.
// A cell is eligible when it is untouched, unrevealed, error-free, and not a lucky tile.
export function _egIsCellPickupEligible(row, col) {
    const key = `${row}-${col}`;
    if (_egPickups.has(key)) return false; // already has a pickup
    if (globalThis.userGrid[row][col] !== 0) return false; // player has touched this cell
    if (globalThis.revealedGrid[row][col]) return false; // item-revealed
    if (globalThis.wrongGrid[row][col]) return false; // mistake-marked
    if (globalThis.luckyTiles && globalThis.luckyTiles.has(key)) return false; // lucky tile
    return true;
}

// Builds the full list of pickup-eligible cells and returns it as [[row, col], ...].
export function _egBuildPickupEligiblePool() {
    if (!cur || !cur.grid) return [];
    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;
    const pool = [];
    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
            if (_egIsCellPickupEligible(r, c)) pool.push([r, c]);
    return pool;
}

// Returns true when ANY drop type (heart pickup, loot, currency, item,
// map) currently occupies the cell at (row, col). Used by every
// spawner so two different drops can never stack on the same cell -
// stacked overlays would leave a stuck visual behind after a claim.
export function _egCellHasAnyDrop(row, col) {
    const key = `${row}-${col}`;
    return _egPickups.has(key)
        || _egLootDrops.has(key)
        || _egCurrencyDrops.has(key)
        || _egItemDrops.has(key)
        || (typeof _egMapDrops !== 'undefined' && _egMapDrops.has(key))
        || (typeof _charmCellHasDrop === 'function' && _charmCellHasDrop(row, col));
}

// Injects the pickup overlay span into the cell's DOM element.
// Shows the pickup art (images/items/) once loaded, else the emoji.
export function _egRenderPickupOverlay(row, col, def) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;
    const span = document.createElement('span');
    span.className = `eg-pickup-overlay eg-pickup-rarity-${def.rarity}`;
    span.id = `eg-pickup-${row}-${col}`;
    const artUrl = (def && def.id) ? EG_ART.url('item', def.id) : null;
    if (artUrl) {
        const img = document.createElement('img');
        img.src = artUrl;
        img.alt = '';
        img.draggable = false;
        img.loading = 'lazy';
        img.decoding = 'async';
        img.style.cssText = 'width:100%;height:100%;object-fit:contain;pointer-events:none;';
        span.appendChild(img);
    } else {
        span.textContent = def.emoji;
    }
    el.appendChild(span);
}

// Removes the pickup overlay span from the DOM for the given key "row-col".
export function _egRemovePickupOverlay(key) {
    const [r, c] = key.split('-').map(Number);
    const span = document.getElementById(`eg-pickup-${r}-${c}`);
    if (span) span.remove();
}

// Plays the floating pickup animation when a pickup is claimed - art image
// when the manifest covers the pickup id, else the emoji (mirrors the
// overlay above, so the floater always matches what was sitting on the grid).
export function _egAnimatePickupClaim(row, col, def) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;
    const centre = _egGetElementCentre(el);

    const floater = document.createElement('div');
    floater.className = 'eg-pickup-floater';
    floater.innerHTML = EG_ART.html('item', def && def.id, (def && def.emoji) || '');
    floater.style.left = `${centre.x}px`;
    floater.style.top = `${centre.y}px`;
    document.body.appendChild(floater);
    setTimeout(() => floater.remove(), 800);
}

// ── Tracked expiry helpers (pause-aware) ────────────────────────────────
export function _egScheduleTrackedExpiry(map, key, value, lifetimeMs, overlayId, removeOverlayFn) {
    const expiresAt = Date.now() + lifetimeMs;
    const timer = setTimeout(() => {
        // remove tracking entry first
        const idx = globalThis._egDropExpiryEntries.findIndex(e => e.map === map && e.key === key && e.value === value);
        if (idx !== -1) globalThis._egDropExpiryEntries.splice(idx, 1);
        if (map.get(key) === value) {
            map.delete(key);
            removeOverlayFn(key);
        }
    }, lifetimeMs);
    globalThis._egPickupTimers.push(timer);
    const entry = { map, key, value, lifetimeMs, expiresAt, timer, overlayId, removeOverlayFn, remaining: null };
    globalThis._egDropExpiryEntries.push(entry);
    if (overlayId) _egStartDropExpireCountdown(overlayId, lifetimeMs, expiresAt);
    return timer;
}

export function _egCancelTrackedExpiry(map, key, value) {
    const idx = globalThis._egDropExpiryEntries.findIndex(e => e.map === map && e.key === key && e.value === value);
    if (idx === -1) return;
    const entry = globalThis._egDropExpiryEntries[idx];
    if (entry.timer) {
        clearTimeout(entry.timer);
        // also remove from _egPickupTimers so stop() doesn't double-clear
        const ti = globalThis._egPickupTimers.indexOf(entry.timer);
        if (ti !== -1) globalThis._egPickupTimers.splice(ti, 1);
    }
    globalThis._egDropExpiryEntries.splice(idx, 1);
    // also cancel its countdown if it was scheduled
    if (entry.overlayId) _egCancelExpireCountdown(entry.overlayId);
}

export function _egCancelExpireCountdown(overlayId) {
    const idx = globalThis._egExpireCountdownEntries.findIndex(e => e.overlayId === overlayId);
    if (idx === -1) return;
    const cd = globalThis._egExpireCountdownEntries[idx];
    if (cd.timeout) clearTimeout(cd.timeout);
    if (cd.interval) clearInterval(cd.interval);
    globalThis._egExpireCountdownEntries.splice(idx, 1);
}

// Schedules the auto-expiry timer for a placed pickup.
// Removes both the state entry and the DOM overlay when it fires.
export function _egSchedulePickupExpiry(key, def) {
    const [r, c] = key.split('-').map(Number);
    _egScheduleTrackedExpiry(_egPickups, key, def, EG_PICKUP_LIFETIME_MS, `eg-pickup-${r}-${c}`, _egRemovePickupOverlay);
}

// Shows a live countdown above a drop overlay during its final
// EG_DROP_EXPIRE_WARNING_MS milliseconds, so the player knows the drop is
// about to vanish. The badge lives INSIDE the overlay span, so removing the
// overlay (claim / discard / expiry) removes the countdown with it; the
// polling interval self-terminates once the overlay is gone.
// Call right after scheduling any drop's expiry timeout.
export function _egStartDropExpireCountdown(overlayId, lifetimeMs, knownExpiresAt) {
    if (_egExpireCountdownStylesInjected()) _egInjectExpireCountdownStyles();
    const startedAt = (knownExpiresAt != null) ? (knownExpiresAt - lifetimeMs) : Date.now();
    const expiresAt = (knownExpiresAt != null) ? knownExpiresAt : (startedAt + lifetimeMs);
    const delay = Math.max(0, lifetimeMs - EG_DROP_EXPIRE_WARNING_MS);
    const delayExpiresAt = startedAt + delay;

    const entry = { overlayId, lifetimeMs, startedAt, expiresAt, delayExpiresAt, timeout: null, interval: null, tick: null, remaining: null, delayRemaining: null, expiryRemaining: null };
    const tick = () => {
        const overlay = document.getElementById(overlayId);
        if (!overlay) {
            if (entry.interval) { clearInterval(entry.interval); entry.interval = null; }
            return;
        }
        const remaining = entry.expiresAt - Date.now();
        if (remaining <= 0) return;

        let badge = overlay.querySelector('.eg-drop-expire-timer');
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'eg-drop-expire-timer';
            overlay.appendChild(badge);
        }
        badge.textContent = Math.ceil(remaining / 1000);
    };
    entry.tick = tick;
    globalThis._egExpireCountdownEntries.push(entry);

    entry.timeout = setTimeout(() => {
        entry.timeout = null;
        tick();
        entry.interval = setInterval(tick, 250);
    }, delay);
}

export function _egExpireCountdownStylesInjected() {
    return !document.getElementById('eg-drop-expire-timer-styles');
}

export function _egInjectExpireCountdownStyles() {
    const style = document.createElement('style');
    style.id = 'eg-drop-expire-timer-styles';
    style.textContent = `
        .eg-drop-expire-timer {
            position: absolute;
            top: -1.4em;
            left: 50%;
            transform: translateX(-50%);
            font-size: 0.9em;
            font-weight: bold;
            font-family: var(--PX, monospace);
            color: #ff5a5a;
            text-shadow: 0 0 3px #000, 0 0 6px rgba(255,90,90,0.8);
            background: rgba(15, 10, 5, 0.75);
            border: 1px solid rgba(255, 90, 90, 0.6);
            border-radius: 4px;
            padding: 0 3px;
            line-height: 1.3;
            white-space: nowrap;
            pointer-events: none;
            animation: eg-expire-tick-pulse 1s ease-in-out infinite;
        }
        @keyframes eg-expire-tick-pulse {
            0%, 100% { opacity: 1; transform: translateX(-50%) scale(1); }
            50%      { opacity: 0.55; transform: translateX(-50%) scale(0.92); }
        }
    `;
    document.head.appendChild(style);
}


// Plays a broken-heart burst animation over the cell when a pickup is discarded via wrong input.
// Shard content for the destroy animation: an explicit artUrl wins
// (charms live outside the manifest), else the manifest art for artId/id,
// else the emoji - so the shards always match what was sitting on the grid.
function _egDiscardShardContent(def) {
    try {
        if (def && def.artUrl) {
            return '<img src="' + def.artUrl + '" alt="" class="eg-art-img" draggable="false">';
        }
        const artId = def && (def.artId || def.id);
        if (artId && typeof EG_ART !== 'undefined' && EG_ART) {
            const u = EG_ART.url('item', artId);
            if (u) return '<img src="' + u + '" alt="" class="eg-art-img" draggable="false">';
        }
    } catch (e) {}
    return (def && def.emoji) || '';
}

export function _egAnimatePickupDiscard(row, col, def) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;
    const centre = _egGetElementCentre(el);
    const content = _egDiscardShardContent(def);

    // Left shard
    const left = document.createElement('div');
    left.className = 'eg-pickup-broken-shard eg-pickup-broken-left';
    left.innerHTML = content;
    left.style.left = `${centre.x}px`;
    left.style.top = `${centre.y}px`;
    document.body.appendChild(left);

    // Right shard
    const right = document.createElement('div');
    right.className = 'eg-pickup-broken-shard eg-pickup-broken-right';
    right.innerHTML = content;
    right.style.left = `${centre.x}px`;
    right.style.top = `${centre.y}px`;
    document.body.appendChild(right);

    setTimeout(() => { left.remove(); right.remove(); }, 700);

}
