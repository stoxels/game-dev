//------------------------------------------------------------------------
//-------------------CONSTANTS & DATA DEFINITIONS-------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


// Pickup spawner timing 
const EG_PICKUP_SPAWN_INTERVAL_MIN = 8000;  // ms minimum between spawn attempts
const EG_PICKUP_SPAWN_INTERVAL_MAX = 18000; // ms maximum between spawn attempts
const EG_PICKUP_MAX_ON_BOARD = 1;     // hard cap on simultaneous pickups
const EG_PICKUP_LIFETIME_MS = 20000; // ms before an uncollected pickup disappears

// ── Monster loot drop constants ──────────────────────────────────────────────
// Chance (0–1) that a defeated monster drops a loot item onto the grid.
// Bosses always use EG_LOOT_DROP_CHANCE_BOSS.
const EG_LOOT_DROP_CHANCE_NORMAL = 0.35;  // 35% per normal monster kill
const EG_LOOT_DROP_CHANCE_BOSS = 1.00;  // bosses always drop

// Lifetime of an uncollected loot drop on the grid (ms).
// Intentionally longer than heart pickups — no rush to grab loot.
const EG_LOOT_DROP_LIFETIME_MS = 60000;

// How long (ms) before a drop expires its countdown timer appears above it.
// Applies to every grid drop type: hearts, equipment, currency, items, maps.
const EG_DROP_EXPIRE_WARNING_MS = 7000;

// Hard cap: how many currency orbs may sit on the board at the same time.
const EG_CURRENCY_DROP_MAX_ON_BOARD = 4;

// Seconds removed from a randomly chosen ability slot's cooldown when the
// Arcane Surge pickup is claimed.
const EG_COOLDOWN_SURGE_REDUCTION_SECS = 30;

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
const EG_HEART_TIER_SCALE_PER_TIER = 0.12;
const EG_MANA_TIER_SCALE_PER_TIER = 0.07;

function _egGetPickupTier() {
    if (typeof _egActiveMapItem !== 'undefined' && _egActiveMapItem && _egActiveMapItem.mapTier != null) {
        const cap = (typeof EG_MAX_MAP_TIER !== 'undefined') ? EG_MAX_MAP_TIER : 16;
        const t = Math.max(1, Math.min(cap, Math.round(_egActiveMapItem.mapTier)));
        return t;
    }
    return 1;
}

function _egHeartTierMult() {
    const tier = _egGetPickupTier();
    return 1 + EG_HEART_TIER_SCALE_PER_TIER * (tier - 1);
}

function _egManaTierMult() {
    const tier = _egGetPickupTier();
    return 1 + EG_MANA_TIER_SCALE_PER_TIER * (tier - 1);
}

// Helper: computes the effective heart heal amount after map-tier and gear bonuses.
// Tier scaling is applied to the base heart value first, then gear adds on top:
//   scaledBase = round(base * tierMult)
//   effective  = (scaledBase + flat) * (1 + incPct/100)
// Gear provides two stats that modify heart healing:
//   heartHealFlat   — flat +# added to every heart (e.g. "+15 to Heart Heal Amount")
//   heartHealIncPct — #% increased Heart Heal Amount (multiplier on the total)
function _egCalcHeartHeal(baseAmount) {
    let flat = 0;
    let incPct = 0;
    if (typeof _egComputePlayerStats === 'function') {
        try {
            const s = _egComputePlayerStats();
            flat = Number(s.heartHealFlat) || 0;
            incPct = Number(s.heartHealIncPct) || 0;
        } catch (e) { /* stats unavailable (e.g. outside endgame) — use base */ }
    }
    const tierMult = _egHeartTierMult();
    const scaledBase = Math.round(baseAmount * tierMult);
    const total = (scaledBase + flat) * (1 + incPct / 100);
    return Math.max(0, Math.round(total));
}

// Helper: computes the effective mana gain from a mana pickup after map-tier and gear bonuses.
// Mirrors _egCalcHeartHeal but with a lower tier multiplier so mana sustain grows
// more slowly than life sustain with map tier.
//   manaHealFlat   — flat +# added to every mana pickup (e.g. "+15 to Mana Gain")
//   manaHealIncPct — #% increased Mana Gained (multiplier on the total)
//   scaledBase = round(base * tierMult)  — skipped for the full-restore orb (base == maxMana)
//   effective  = (scaledBase + flat) * (1 + incPct/100)
function _egCalcManaGain(baseAmount) {
    let flat = 0;
    let incPct = 0;
    if (typeof _egComputePlayerStats === 'function') {
        try {
            const s = _egComputePlayerStats();
            flat = Number(s.manaHealFlat) || 0;
            incPct = Number(s.manaHealIncPct) || 0;
        } catch (e) { /* stats unavailable (e.g. outside endgame) — use base */ }
    }
    let tierMult = _egManaTierMult();
    // Full-restore orb (base == maxMana) should not be tier-scaled — it already
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
//   id        — unique key, referenced by EG_PICKUP_WEIGHTS
//   emoji     — shown on the tile overlay and in the claim toast
//   label     — human-readable name (for future UI use)
//   rarity    — 'common' | 'uncommon' | 'rare'  (controls glow CSS class)
//   onPickup  — called with (row, col) when the player claims the pickup
//
// To add new pickup types (items, currency, etc.) add an entry here and a
// corresponding weight entry in EG_PICKUP_WEIGHTS. No other code needs changing.
const EG_PICKUP_DEFS = {
    heart_small: {
        id: 'heart_small', emoji: '💛', label: () => t('eg_pickup_heart_small'), rarity: 'common',
        onPickup(row, col) {
            const heal = _egCalcHeartHeal(10);
            playerCurrentHP = Math.min(playerMaxHP, playerCurrentHP + heal);
            _renderPlayerHealth();
            showToast(t('eg_pickup_heal_small').replace('{n}', heal), _egRarityToastColor(this.rarity));
            Audio_Manager.playSFX('heart_heals');
        },
    },
    heart_medium: {
        id: 'heart_medium', emoji: '🧡', label: () => t('eg_pickup_heart'), rarity: 'uncommon',
        onPickup(row, col) {
            const heal = _egCalcHeartHeal(25);
            playerCurrentHP = Math.min(playerMaxHP, playerCurrentHP + heal);
            _renderPlayerHealth();
            showToast(t('eg_pickup_heal_medium').replace('{n}', heal), _egRarityToastColor(this.rarity));
            Audio_Manager.playSFX('heart_heals');
        },
    },
    heart_large: {
        id: 'heart_large', emoji: '❤️', label: () => t('eg_pickup_heart_large'), rarity: 'rare',
        onPickup(row, col) {
            const heal = _egCalcHeartHeal(50);
            playerCurrentHP = Math.min(playerMaxHP, playerCurrentHP + heal);
            _renderPlayerHealth();
            showToast(t('eg_pickup_heal_large').replace('{n}', heal), _egRarityToastColor(this.rarity));
            Audio_Manager.playSFX('heart_heals');
        },
    },
    // Mana orbs — endgame only (mana system is gated to isEndgameLevel()).
    // gainMana() clamps to max mana, applies the map's "% reduced Mana
    // gained" mod and refreshes the HUD bar; it returns the amount actually
    // gained so the toast stays honest when the pool is nearly full.
    mana_small: {
        id: 'mana_small', emoji: '💧', label: () => t('eg_pickup_mana_small'), rarity: 'common',
        onPickup(row, col) {
            const gained = gainMana(_egCalcManaGain(20));
            if (gained > 0) {
                showToast(t('eg_pickup_mana_gain_small').replace('{n}', gained),
                    _egRarityToastColor(this.rarity));
                Audio_Manager.playSFX('mana_pickup');
            } else {
                showToast(t('eg_pickup_mana_full'), _egRarityToastColor(this.rarity));
            }
        },
    },
    mana_medium: {
        id: 'mana_medium', emoji: '🔵', label: () => t('eg_pickup_mana_medium'), rarity: 'uncommon',
        onPickup(row, col) {
            const gained = gainMana(_egCalcManaGain(50));
            if (gained > 0) {
                showToast(t('eg_pickup_mana_gain_medium').replace('{n}', gained),
                    _egRarityToastColor(this.rarity));
                Audio_Manager.playSFX('mana_pickup');
            } else {
                showToast(t('eg_pickup_mana_full'), _egRarityToastColor(this.rarity));
            }
        },
    },
    mana_full: {
        id: 'mana_full', emoji: '🔮', label: () => t('eg_pickup_mana_full_orb'), rarity: 'rare',
        onPickup(row, col) {
            const before = playerCurrentMana;
            const gained = gainMana(_egCalcManaGain(_getPlayerMaxMana()));
            if (gained > 0) {
                showToast(t('eg_pickup_mana_gain_full').replace('{n}', playerCurrentMana - before),
                    _egRarityToastColor(this.rarity));
                Audio_Manager.playSFX('mana_pickup');
            } else {
                showToast(t('eg_pickup_mana_full'), _egRarityToastColor(this.rarity));
            }
        },
    },
    // Erases one mistake from the current mistake counter. Somewhat rare.
    mistake_eraser: {
        id: 'mistake_eraser', emoji: '🧽', label: () => t('eg_pickup_mistake_eraser'), rarity: 'rare',
        onPickup(row, col) {
            if (mistakeCount > 0) {
                mistakeCount--;
                _levelMistakesErased++;
                if (typeof questStat_mistakesRemoved === 'function') questStat_mistakesRemoved(1);

                // Full HUD sync: refreshes the top-left mistake counter
                // (including "x / y" on endgame maps), the objectives strip,
                // and re-checks the map's mistake limit so the budget is restored.
                if (typeof _updateMistakeCounterHUD === 'function') {
                    _updateMistakeCounterHUD();
                } else if (typeof _setMistakeCounterText === 'function') {
                    _setMistakeCounterText();
                }
                showToast(t('eg_pickup_mistake_erased'), _egRarityToastColor(this.rarity));
            } else {
                showToast(t('eg_pickup_mistake_none'), _egRarityToastColor(this.rarity));
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
                showToast(t('eg_pickup_cooldown_none_any'), _egRarityToastColor(this.rarity));
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

            showToast(t('eg_pickup_cooldown_reduced')
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
const EG_PICKUP_WEIGHTS = [
    { id: 'heart_small', weight: 60 },
    { id: 'heart_medium', weight: 30 },
    { id: 'heart_large', weight: 10 },
    { id: 'mana_small', weight: 25 },      // ~17% — mana counterpart to hearts
    { id: 'mana_medium', weight: 12 },
    { id: 'mana_full', weight: 4 },        // full restore — rarest pickup
    { id: 'cooldown_surge', weight: 8 },   // ~7% — a bit more common than eraser
    { id: 'mistake_eraser', weight: 5 },   // ~4% — somewhat rare
];









//------------------------------------------------------------------------
//-------------------PICKUP HELPERS---------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Maps rarities to toast text colors so loot / pickup notifications
// are colorized by the item's rarity.
function _egRarityToastColor(rarity) {
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
function _egPickRandomPickup() {
    const total = EG_PICKUP_WEIGHTS.reduce((sum, e) => sum + e.weight, 0);
    let roll = Math.random() * total;
    for (const entry of EG_PICKUP_WEIGHTS) {
        roll -= entry.weight;
        if (roll <= 0) return EG_PICKUP_DEFS[entry.id];
    }
    return EG_PICKUP_DEFS['heart_small']; // fallback — should never be reached
}

// Returns true if the cell at (row, col) is eligible to host a pickup.
// A cell is eligible when it is untouched, unrevealed, error-free, and not a lucky tile.
function _egIsCellPickupEligible(row, col) {
    const key = `${row}-${col}`;
    if (_egPickups.has(key)) return false; // already has a pickup
    if (userGrid[row][col] !== 0) return false; // player has touched this cell
    if (revealedGrid[row][col]) return false; // item-revealed
    if (wrongGrid[row][col]) return false; // mistake-marked
    if (luckyTiles && luckyTiles.has(key)) return false; // lucky tile
    return true;
}

// Builds the full list of pickup-eligible cells and returns it as [[row, col], ...].
function _egBuildPickupEligiblePool() {
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
// spawner so two different drops can never stack on the same cell —
// stacked overlays would leave a stuck visual behind after a claim.
function _egCellHasAnyDrop(row, col) {
    const key = `${row}-${col}`;
    return _egPickups.has(key)
        || _egLootDrops.has(key)
        || _egCurrencyDrops.has(key)
        || _egItemDrops.has(key)
        || (typeof _egMapDrops !== 'undefined' && _egMapDrops.has(key));
}

// Injects the pickup emoji overlay span into the cell's DOM element.
function _egRenderPickupOverlay(row, col, def) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;
    const span = document.createElement('span');
    span.className = `eg-pickup-overlay eg-pickup-rarity-${def.rarity}`;
    span.id = `eg-pickup-${row}-${col}`;
    span.textContent = def.emoji;
    el.appendChild(span);
}

// Removes the pickup overlay span from the DOM for the given key "row-col".
function _egRemovePickupOverlay(key) {
    const [r, c] = key.split('-').map(Number);
    const span = document.getElementById(`eg-pickup-${r}-${c}`);
    if (span) span.remove();
}

// Plays the floating emoji animation when a pickup is claimed.
function _egAnimatePickupClaim(row, col, def) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;
    const centre = _egGetElementCentre(el);

    const floater = document.createElement('div');
    floater.className = 'eg-pickup-floater';
    floater.textContent = def.emoji;
    floater.style.left = `${centre.x}px`;
    floater.style.top = `${centre.y}px`;
    document.body.appendChild(floater);
    setTimeout(() => floater.remove(), 800);
}

// ── Tracked expiry helpers (pause-aware) ────────────────────────────────
function _egScheduleTrackedExpiry(map, key, value, lifetimeMs, overlayId, removeOverlayFn) {
    const expiresAt = Date.now() + lifetimeMs;
    const timer = setTimeout(() => {
        // remove tracking entry first
        const idx = _egDropExpiryEntries.findIndex(e => e.map === map && e.key === key && e.value === value);
        if (idx !== -1) _egDropExpiryEntries.splice(idx, 1);
        if (map.get(key) === value) {
            map.delete(key);
            removeOverlayFn(key);
        }
    }, lifetimeMs);
    _egPickupTimers.push(timer);
    const entry = { map, key, value, lifetimeMs, expiresAt, timer, overlayId, removeOverlayFn, remaining: null };
    _egDropExpiryEntries.push(entry);
    if (overlayId) _egStartDropExpireCountdown(overlayId, lifetimeMs, expiresAt);
    return timer;
}

function _egCancelTrackedExpiry(map, key, value) {
    const idx = _egDropExpiryEntries.findIndex(e => e.map === map && e.key === key && e.value === value);
    if (idx === -1) return;
    const entry = _egDropExpiryEntries[idx];
    if (entry.timer) {
        clearTimeout(entry.timer);
        // also remove from _egPickupTimers so stop() doesn't double-clear
        const ti = _egPickupTimers.indexOf(entry.timer);
        if (ti !== -1) _egPickupTimers.splice(ti, 1);
    }
    _egDropExpiryEntries.splice(idx, 1);
    // also cancel its countdown if it was scheduled
    if (entry.overlayId) _egCancelExpireCountdown(entry.overlayId);
}

function _egCancelExpireCountdown(overlayId) {
    const idx = _egExpireCountdownEntries.findIndex(e => e.overlayId === overlayId);
    if (idx === -1) return;
    const cd = _egExpireCountdownEntries[idx];
    if (cd.timeout) clearTimeout(cd.timeout);
    if (cd.interval) clearInterval(cd.interval);
    _egExpireCountdownEntries.splice(idx, 1);
}

// Pause / resume for all grid drops (pickups, loot, currency, items, gold, maps).
// Called from _egOnPause / _egOnResume in endgame-encounter.js.
function _egPauseGridDrops() {
    const now = Date.now();
    // Pause pickup spawner
    if (_egPickupSpawnTimer && _egPickupSpawnerInfo.expiresAt) {
        const remaining = Math.max(0, _egPickupSpawnerInfo.expiresAt - now);
        clearTimeout(_egPickupSpawnTimer);
        const ti = _egPickupTimers.indexOf(_egPickupSpawnTimer);
        if (ti !== -1) _egPickupTimers.splice(ti, 1);
        _egPickupSpawnerInfo.remaining = remaining;
        _egPickupSpawnTimer = null;
        _egPickupSpawnerInfo.timer = null;
    }
    // Pause each drop expiry timer
    _egDropExpiryEntries.forEach(entry => {
        if (entry.timer) {
            clearTimeout(entry.timer);
            const ti = _egPickupTimers.indexOf(entry.timer);
            if (ti !== -1) _egPickupTimers.splice(ti, 1);
            entry.remaining = Math.max(0, entry.expiresAt - now);
            entry.timer = null;
        }
    });
    // Pause countdown badges
    _egExpireCountdownEntries.forEach(cd => {
        if (cd.timeout) { clearTimeout(cd.timeout); cd.timeout = null; }
        if (cd.interval) { clearInterval(cd.interval); cd.interval = null; }
        // remaining until the warning badge should appear, and remaining until expiry
        cd.delayRemaining = Math.max(0, cd.delayExpiresAt - now);
        cd.expiryRemaining = Math.max(0, cd.expiresAt - now);
    });
}

function _egResumeGridDrops() {
    const now = Date.now();
    // Resume pickup spawner
    if (_egPickupSpawnerInfo.remaining != null) {
        const remaining = _egPickupSpawnerInfo.remaining;
        _egPickupSpawnerInfo.remaining = null;
        _egPickupSpawnerInfo.expiresAt = now + remaining;
        const timer = setTimeout(() => {
            _egPickupSpawnerInfo.timer = null;
            _egPickupSpawnerInfo.expiresAt = 0;
            if (_egIsActive()) {
                _egSpawnPickup();
                _egScheduleNextPickupSpawn();
            }
        }, remaining);
        _egPickupSpawnTimer = timer;
        _egPickupSpawnerInfo.timer = timer;
        _egPickupTimers.push(timer);
    }
    // Resume each drop expiry timer
    _egDropExpiryEntries.forEach(entry => {
        if (entry.remaining != null && entry.timer == null) {
            const remaining = entry.remaining;
            entry.remaining = null;
            entry.expiresAt = now + remaining;
            const timer = setTimeout(() => {
                const idx = _egDropExpiryEntries.findIndex(e => e === entry);
                if (idx !== -1) _egDropExpiryEntries.splice(idx, 1);
                if (entry.map.get(entry.key) === entry.value) {
                    entry.map.delete(entry.key);
                    entry.removeOverlayFn(entry.key);
                }
            }, remaining);
            entry.timer = timer;
            _egPickupTimers.push(timer);
        }
    });
    // Resume countdown badges
    _egExpireCountdownEntries.forEach(cd => {
        // shift startedAt / expiresAt so tick math stays correct
        const elapsedBeforePause = cd.lifetimeMs - cd.expiryRemaining;
        cd.startedAt = now - elapsedBeforePause;
        cd.expiresAt = now + cd.expiryRemaining;
        cd.delayExpiresAt = now + cd.delayRemaining;
        const tick = cd.tick;
        const startInterval = () => {
            tick();
            cd.interval = setInterval(tick, 250);
        };
        if (cd.delayRemaining <= 0) {
            // warning period already started before pause — start ticking immediately
            startInterval();
        } else {
            cd.timeout = setTimeout(() => {
                cd.timeout = null;
                startInterval();
            }, cd.delayRemaining);
        }
    });
}

// Schedules the auto-expiry timer for a placed pickup.
// Removes both the state entry and the DOM overlay when it fires.
function _egSchedulePickupExpiry(key, def) {
    const [r, c] = key.split('-').map(Number);
    _egScheduleTrackedExpiry(_egPickups, key, def, EG_PICKUP_LIFETIME_MS, `eg-pickup-${r}-${c}`, _egRemovePickupOverlay);
}

// Shows a live countdown above a drop overlay during its final
// EG_DROP_EXPIRE_WARNING_MS milliseconds, so the player knows the drop is
// about to vanish. The badge lives INSIDE the overlay span, so removing the
// overlay (claim / discard / expiry) removes the countdown with it; the
// polling interval self-terminates once the overlay is gone.
// Call right after scheduling any drop's expiry timeout.
function _egStartDropExpireCountdown(overlayId, lifetimeMs, knownExpiresAt) {
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
    _egExpireCountdownEntries.push(entry);

    entry.timeout = setTimeout(() => {
        entry.timeout = null;
        tick();
        entry.interval = setInterval(tick, 250);
    }, delay);
}

function _egExpireCountdownStylesInjected() {
    return !document.getElementById('eg-drop-expire-timer-styles');
}

function _egInjectExpireCountdownStyles() {
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
function _egAnimatePickupDiscard(row, col, def) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;
    const centre = _egGetElementCentre(el);

    // Left shard
    const left = document.createElement('div');
    left.className = 'eg-pickup-broken-shard eg-pickup-broken-left';
    left.textContent = def.emoji;
    left.style.left = `${centre.x}px`;
    left.style.top = `${centre.y}px`;
    document.body.appendChild(left);

    // Right shard
    const right = document.createElement('div');
    right.className = 'eg-pickup-broken-shard eg-pickup-broken-right';
    right.textContent = def.emoji;
    right.style.left = `${centre.x}px`;
    right.style.top = `${centre.y}px`;
    document.body.appendChild(right);

    setTimeout(() => { left.remove(); right.remove(); }, 700);

    
}



//------------------------------------------------------------------------
//-------------------PICKUP SPAWN SYSTEM----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Schedules the next pickup spawn attempt with a random delay in the configured range.
// Recursively reschedules itself so pickups continue to appear throughout the encounter.
function _egScheduleNextPickupSpawn() {
    const delay = EG_PICKUP_SPAWN_INTERVAL_MIN
        + Math.random() * (EG_PICKUP_SPAWN_INTERVAL_MAX - EG_PICKUP_SPAWN_INTERVAL_MIN);

    _egPickupSpawnTimer = setTimeout(() => {
        _egPickupSpawnerInfo.timer = null;
        _egPickupSpawnerInfo.expiresAt = 0;
        if (_egIsActive()) {
            _egSpawnPickup();
            _egScheduleNextPickupSpawn();
        }
    }, delay);
    _egPickupSpawnerInfo.timer = _egPickupSpawnTimer;
    _egPickupSpawnerInfo.expiresAt = Date.now() + delay;
    // keep legacy timer array in sync for bulk cleanup on stop
    if (_egPickupTimers.indexOf(_egPickupSpawnTimer) === -1) _egPickupTimers.push(_egPickupSpawnTimer);
}

// Attempts to place one pickup on a random eligible grid tile.
// Does nothing if the board is already at max pickups or no eligible cells exist.
function _egSpawnPickup() {
    // Stop spawning hearts once all monsters have been defeated
    const req = _egGetMapRequirements();
    if (req.totalMonsters > 0 && _egChainKillCount >= req.totalMonsters) return;

    // Active map run: "#% fewer Pickups appear on the Grid".
    if (typeof _egGetActiveMapModValue === 'function') {
        const scarcity = _egGetActiveMapModValue('map_fewer_pickups');
        if (scarcity > 0 && Math.random() * 100 < scarcity) return;
    }

    if (_egPickups.size >= EG_PICKUP_MAX_ON_BOARD) return;

    const pool = _egBuildPickupEligiblePool();
    const filtered = pool.filter(([r, c]) => !_egCellHasAnyDrop(r, c));
    if (filtered.length === 0) return;

    const [r, c] = filtered[Math.floor(Math.random() * filtered.length)];
    const def = _egPickRandomPickup();
    const key = `${r}-${c}`;

    _egPickups.set(key, def);
    _egRenderPickupOverlay(r, c, def);
    _egSchedulePickupExpiry(key, def);
}

// Starts the recurring pickup spawn loop.
function _egStartPickupSpawner() {
    _egScheduleNextPickupSpawn();
}

// Cancels all pickup timers and clears every pickup from the board.
// Called on encounter stop or level exit.
function _egStopPickupSpawner() {
    if (_egPickupSpawnTimer) {
        clearTimeout(_egPickupSpawnTimer);
        _egPickupSpawnTimer = null;
    }
    _egPickupSpawnerInfo.timer = null;
    _egPickupSpawnerInfo.expiresAt = 0;
    _egPickupSpawnerInfo.remaining = null;
    _egPickupTimers.forEach(t => clearTimeout(t));
    _egPickupTimers = [];
    // also clear pause-aware tracking and countdowns
    _egDropExpiryEntries.forEach(e => { if (e.timer) clearTimeout(e.timer); });
    _egDropExpiryEntries = [];
    _egExpireCountdownEntries.forEach(cd => { if (cd.timeout) clearTimeout(cd.timeout); if (cd.interval) clearInterval(cd.interval); });
    _egExpireCountdownEntries = [];

    _egPickups.forEach((def, key) => _egRemovePickupOverlay(key));
    _egPickups.clear();

    if (typeof _egStopLootDrops === 'function') _egStopLootDrops();
    if (typeof _egStopCurrencyDrops === 'function') _egStopCurrencyDrops();
    if (typeof _egStopItemDrops === 'function') _egStopItemDrops();
    if (typeof _egStopGoldDrops === 'function') _egStopGoldDrops();
    if (typeof _egStopMapDrops === 'function') _egStopMapDrops();
}






//------------------------------------------------------------------------
//-------------------PICKUP INTERACTION-----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Called when the player makes the CORRECT action on a cell.
// (correct cell + left-click fill, or wrong cell + right-click mark)
// If a pickup sits on that cell, claims it and triggers its onPickup effect.
// Returns true if a pickup was present and claimed.
function _egCheckPickupClaim(row, col) {
    if (!_egIsActive()) return false;
    const key = `${row}-${col}`;
    const def = _egPickups.get(key);
    if (!def) return false;

    _egCancelTrackedExpiry(_egPickups, key, def);
    _egPickups.delete(key);
    _egRemovePickupOverlay(key);
    _egAnimatePickupClaim(row, col, def);
    def.onPickup(row, col);

    Audio_Manager.playSFX('player_equip_pickup');

    return true;
}





// Called when the player makes the WRONG action on a cell that has a pickup.
// (correct cell + right-click, or wrong cell + left-click)
// Silently discards the pickup — no reward, no animation.
function _egDiscardPickup(row, col) {
    if (!_egIsActive()) return;
    const key = `${row}-${col}`;
    if (!_egPickups.has(key)) return;
    const def = _egPickups.get(key);   // capture def before deleting
    _egCancelTrackedExpiry(_egPickups, key, def);
    _egPickups.delete(key);
    _egRemovePickupOverlay(key);
    _egAnimatePickupDiscard(row, col, def); 

    Audio_Manager.playSFX('heart_destroyed');
}





//------------------------------------------------------------------------
//-------------------MONSTER LOOT DROPS-----------------------------------
//------------------------------------------------------------------------
// Loot drops are placed on the grid when a monster dies (chance-based).
// They use the same eligible-cell pool as hearts but have their own
// lifetime, visual, and — on claim — go into a per-run temp inventory
// instead of granting immediate HP.
//------------------------------------------------------------------------

// Unlimited stash: always has space (grows on demand). Kept for compat — callers no longer need to gate drops.
function _egStashHasFreeSlot() {
    return true;
}

// Injects the loot overlay span into the cell's DOM element.
// Re-uses the pickup overlay class but adds a dedicated loot modifier class.
// The glow class is chosen from the item's own rarity so the drop shines
// in its rarity color.
function _egRenderLootOverlay(row, col, item) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;
    const span = document.createElement('span');
    // Uniques get an extra class for their signature golden ray/sparkle look.
    const uniqueCls = item.isUnique ? ' eg-unique-drop' : '';
    span.className = `eg-pickup-overlay eg-pickup-rarity-${item.rarity || 'common'} eg-loot-overlay${uniqueCls}`;
    span.id = `eg-loot-${row}-${col}`;
    EG_ART.fillElement(span, 'item', item.baseId, item.icon || '📦');
    el.appendChild(span);
}

// Removes the loot overlay from the DOM.
function _egRemoveLootOverlay(key) {
    const [r, c] = key.split('-').map(Number);
    const span = document.getElementById(`eg-loot-${r}-${c}`);
    if (span) span.remove();
}

// Plays the floating icon animation when a loot drop is claimed.
function _egAnimateLootClaim(row, col, item) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;
    const centre = _egGetElementCentre(el);
    const floater = document.createElement('div');
    floater.className = 'eg-pickup-floater';
    EG_ART.fillElement(floater, 'item', item.baseId, item.icon || '📦');
    floater.style.left = `${centre.x}px`;
    floater.style.top = `${centre.y}px`;
    document.body.appendChild(floater);
    setTimeout(() => floater.remove(), 800);
}

// Attempts to place one loot drop on the grid after a monster dies.
// isBoss — pass true for guaranteed drop chance.
function _egSpawnLootDrop(isBoss = false, monsterLevel = 1) {
    if (!_egIsActive()) return;

    // Unlimited stash: no longer gated — _egStashHasFreeSlot() always true

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
    // Uniques first — a small golden-tier chance replaces the regular roll.
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

const EG_LOOT_EXPLOSION_EQUIPMENT = 5;      // equipment pieces
const EG_LOOT_EXPLOSION_STAGGER_MS = 150;   // cascade delay between drops

// Places a single loot item on a free cell — no chance roll, no board cap.
// Used by the loot explosion. Returns true when the item was placed.
function _egPlaceLootDropForce(item) {
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
function _egSpawnLootExplosion(monsterLevel = 1) {
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

    showToast(t('eg_loot_explosion'), '#f5d98a');
}

// Called from renderCell whenever a cell becomes visually revealed
// (via an ability, passive ability, or item reveal effect).
// Revealed cells can no longer be filled by the player, so any drop
// sitting there would be permanently unclaimable — instead it is
// automatically picked up using the normal claim flow.
function _egAutoClaimDropsOnReveal(row, col) {
    if (!_egIsActive()) return;
    const key = `${row}-${col}`;

    // Claim every drop type present (not else-if) — spawn guards now keep
    // drops from stacking, but this stays defensive so a stacked legacy
    // state can never leave a stuck overlay behind.
    if (_egPickups.has(key)) _egCheckPickupClaim(row, col);
    if (_egLootDrops.has(key)) _egCheckLootClaim(row, col);
    if (_egCurrencyDrops.has(key)) _egCheckCurrencyDropClaim(row, col);
    if (_egItemDrops.has(key)) _egCheckItemDropClaim(row, col);
    if (typeof _egMapDrops !== 'undefined' && _egMapDrops.has(key)) _egCheckMapDropClaim(row, col);
}

// Called when the player correctly claims the cell that holds a loot drop.
// Adds the item to the run's temporary loot bag and refreshes the HUD.
// Returns true if a loot drop was present and claimed.
function _egCheckLootClaim(row, col) {
    if (!_egIsActive()) return false;
    const key = `${row}-${col}`;
    const item = _egLootDrops.get(key);
    if (!item) return false;

    _egCancelTrackedExpiry(_egLootDrops, key, item);
    _egLootDrops.delete(key);
    _egRemoveLootOverlay(key);
    _egAnimateLootClaim(row, col, item);

    _egRunLoot.push(item);
    _egUpdateObjectivesHUD();

    Audio_Manager.playSFX('player_equip_pickup');

    const nameSuffix = (item.category === 'equip' && Number.isFinite(item.itemLevel))
        ? ` [${item.itemLevel}]`
        : '';
    showToast(t('eg_loot_claimed')
        .replace('{icon}', item.isUnique ? '✨' : (item.icon || ''))
        .replace('{name}', item.name + nameSuffix), _egRarityToastColor(item.rarity));
    return true;
}

// Called when the player makes a WRONG action on a cell that has a loot drop.
// The drop is silently discarded.
function _egDiscardLootDrop(row, col) {
    if (!_egIsActive()) return;
    const key = `${row}-${col}`;
    if (!_egLootDrops.has(key)) return;
    const item = _egLootDrops.get(key);
    _egCancelTrackedExpiry(_egLootDrops, key, item);
    _egLootDrops.delete(key);
    _egRemoveLootOverlay(key);
    _egAnimatePickupDiscard(row, col, { emoji: item.icon || '📦' }); // reuse broken-heart anim

    Audio_Manager.playSFX('player_equip_not_pickup');
}

// Clears all active loot drops from the board (called by _egStopPickupSpawner).
function _egStopLootDrops() {
    Array.from(_egLootDrops.entries()).forEach(([key, item]) => _egCancelTrackedExpiry(_egLootDrops, key, item));
    _egLootDrops.forEach((item, key) => _egRemoveLootOverlay(key));
    _egLootDrops.clear();
}

// Flushes all run loot into the first available stash slots.
// Call this on successful map clear, BEFORE _egChainCleanup resets the state.
// Unlimited stash: grows rows as needed so nothing is ever lost.
function _egFlushRunLootToStash() {
    if (_egRunLoot.length === 0) return;

    let placed = 0;
    for (const item of _egRunLoot) {
        if (typeof _egAddItemToStash === 'function') {
            _egAddItemToStash(item);
            placed++;
        } else {
            // fallback if hub helpers not yet loaded
            let done = false;
            for (let r = 0; r < _egInventory.length && !done; r++) {
                for (let c = 0; c < EG_INV_COLS && !done; c++) if (!_egInventory[r][c]) { _egInventory[r][c] = item; done = true; placed++; }
            }
            if (!done) {
                _egInventory.push(Array(EG_INV_COLS).fill(null));
                _egInventory[_egInventory.length - 1][0] = item;
                placed++;
            }
        }
    }

    if (placed > 0) {
        showToast(placed === 1
            ? t('eg_stash_added_one')
            : t('eg_stash_added_many').replace('{n}', placed));
        // Re-render the stash grid if the hub screen is currently visible
        if (typeof _egRenderInventory === 'function') _egRenderInventory();
        if (typeof _egRebuildInventoryGrid === 'function') _egRebuildInventoryGrid();
        if (typeof egSaveHubState === 'function') egSaveHubState();
    }
}


// Re-places items that were on the grid when a chain transition happened.
// Called at the start of a new chained puzzle so loot is never silently lost.
function _egReplaceCarriedLootDrops(items) {
    if (!items || items.length === 0) return;

    items.forEach(item => {
        // Unlimited stash: no cap — always re-place carried loot

        // Carry-over must preserve every pending drop — even the 5-item
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

    if (items.length > 0) showToast(t('eg_loot_carried'));
}








//------------------------------------------------------------------------
//-------------------MONSTER CURRENCY DROPS--------------------------------
//------------------------------------------------------------------------
// Same idea as loot drops (above), but for currency orbs. Orbs land on
// the grid and must be claimed by filling the correct cell — they no
// longer go straight into the currency strip on kill.

function _egRenderCurrencyDropOverlay(row, col, def) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;
    const span = document.createElement('span');
    span.className = `eg-pickup-overlay eg-pickup-rarity-currency eg-currency-drop-overlay`;
    span.id = `eg-currency-drop-${row}-${col}`;
    span.textContent = def.icon || '💰';
    el.appendChild(span);
}

function _egRemoveCurrencyDropOverlay(key) {
    const [r, c] = key.split('-').map(Number);
    const span = document.getElementById(`eg-currency-drop-${r}-${c}`);
    if (span) span.remove();
}

function _egAnimateCurrencyDropClaim(row, col, def) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;
    const centre = _egGetElementCentre(el);
    const floater = document.createElement('div');
    floater.className = 'eg-pickup-floater';
    floater.textContent = def.icon || '💰';
    floater.style.left = `${centre.x}px`;
    floater.style.top = `${centre.y}px`;
    document.body.appendChild(floater);
    setTimeout(() => floater.remove(), 800);
}

// Called by _egTryDropCurrency() in endgame-currency.js instead of
// adding the orb straight to the stash.
function _egSpawnCurrencyDrop(def) {
    if (!_egIsActive() || !def) return;
    if (_egCurrencyDrops.size >= EG_CURRENCY_DROP_MAX_ON_BOARD) return;

    const pool = _egBuildPickupEligiblePool();
    const filtered = pool.filter(([r, c]) => !_egCellHasAnyDrop(r, c));
    if (filtered.length === 0) return;

    const [r, c] = filtered[Math.floor(Math.random() * filtered.length)];
    const key = `${r}-${c}`;

    _egCurrencyDrops.set(key, def);
    _egRenderCurrencyDropOverlay(r, c, def);

    _egScheduleTrackedExpiry(_egCurrencyDrops, key, def, EG_LOOT_DROP_LIFETIME_MS, `eg-currency-drop-${r}-${c}`, _egRemoveCurrencyDropOverlay);
}

// Tracks a claimed currency drop for the leave-map summary screen.
// Aggregates by currency id so stacks show one chip with a count.
function _egTrackRunCurrency(def) {
    const existing = _egRunCurrency.find(e => e.id === def.id);
    if (existing) existing.count++;
    else _egRunCurrency.push({ id: def.id, name: def.name, icon: def.icon, description: def.description, count: 1 });
}

// Tracks a claimed essence drop for the leave-map summary screen.
// Aggregates by essence id so stacks show one chip with a count.
function _egTrackRunEssence(def) {
    const existing = _egRunEssences.find(e => e.id === def.id);
    if (existing) existing.count++;
    else _egRunEssences.push({ id: def.id, name: def.name, icon: def.icon, description: def.description, count: 1 });
}


// Called on correct-cell-fill (mirrors _egCheckLootClaim). Adds the orb
// to the currency stash via egAddCurrency() and returns true if claimed.
function _egCheckCurrencyDropClaim(row, col) {
    if (!_egIsActive()) return false;
    const key = `${row}-${col}`;
    const def = _egCurrencyDrops.get(key);
    if (!def) return false;

    _egCancelTrackedExpiry(_egCurrencyDrops, key, def);
    _egCurrencyDrops.delete(key);
    _egRemoveCurrencyDropOverlay(key);
    _egAnimateCurrencyDropClaim(row, col, def);

    // Essences are claimed through the same drop pipeline but stack in the
    // essence tab instead of the runes & orbs strip.
    const isEssence = def.category === 'essence';
    const added = isEssence
        ? egAddEssence(def.id, 1, {
            name: def.name,
            icon: def.icon,
            rarity: 'essence',
            category: 'essence',
            description: def.description,
        })
        : egAddCurrency(def.id, 1, {
            name: def.name,
            icon: def.icon,
            rarity: 'currency',
            category: 'currency',
            description: def.description,
        });

    if (isEssence) {
        _egTrackRunEssence(def);
    } else {
        _egTrackRunCurrency(def);
    }

    Audio_Manager.playSFX('player_equip_pickup');
    if (added) showToast(t('eg_currency_acquired')
        .replace('{icon}', def.icon)
        .replace('{name}', def.name), _egRarityToastColor('currency'));
    return true;
}

// Called on wrong-action-on-cell (mirrors _egDiscardLootDrop).
function _egDiscardCurrencyDrop(row, col) {
    if (!_egIsActive()) return;
    const key = `${row}-${col}`;
    if (!_egCurrencyDrops.has(key)) return;
    const def = _egCurrencyDrops.get(key);
    _egCancelTrackedExpiry(_egCurrencyDrops, key, def);
    _egCurrencyDrops.delete(key);
    _egRemoveCurrencyDropOverlay(key);
    _egAnimatePickupDiscard(row, col, { emoji: def.icon || '💰' });

    Audio_Manager.playSFX('player_equip_not_pickup');
}

// Clears all active currency drops (called by _egStopPickupSpawner).
function _egStopCurrencyDrops() {
    Array.from(_egCurrencyDrops.entries()).forEach(([key, def]) => _egCancelTrackedExpiry(_egCurrencyDrops, key, def));
    _egCurrencyDrops.forEach((def, key) => _egRemoveCurrencyDropOverlay(key));
    _egCurrencyDrops.clear();
}

// Carries an unclaimed currency drop into the next chained puzzle
// (mirrors _egReplaceCarriedLootDrops).
function _egReplaceCarriedCurrencyDrops(defs) {
    if (!defs || defs.length === 0) return;

    defs.forEach(def => {
        if (_egCurrencyDrops.size >= EG_CURRENCY_DROP_MAX_ON_BOARD) return;

        const pool = _egBuildPickupEligiblePool();
        const filtered = pool.filter(([r, c]) => !_egCellHasAnyDrop(r, c));
        if (filtered.length === 0) return;

        const [r, c] = filtered[Math.floor(Math.random() * filtered.length)];
        const key = `${r}-${c}`;

        _egCurrencyDrops.set(key, def);
        _egRenderCurrencyDropOverlay(r, c, def);

        _egScheduleTrackedExpiry(_egCurrencyDrops, key, def, EG_LOOT_DROP_LIFETIME_MS, `eg-currency-drop-${r}-${c}`, _egRemoveCurrencyDropOverlay);
    });
}


//------------------------------------------------------------------------
//-------------------REGULAR ITEM DROPS------------------------------------
//------------------------------------------------------------------------
// Same idea as loot/currency drops (above), but for the regular puzzle
// items from ITEM_DEFS. A defeated monster has a small chance to drop a
// random weighted item onto the grid. Claiming it adds it directly to
// the player's persistent STATE.inventory.
//------------------------------------------------------------------------

// Chance (0–1) that a defeated monster drops a regular item onto the grid.
// Intentionally rare — items are a bonus, not the expected reward.
const EG_ITEM_DROP_CHANCE_NORMAL = 0.05;  // 5% per normal monster kill
const EG_ITEM_DROP_CHANCE_BOSS = 0.25;  // 25% per boss kill

// Hard cap: one regular-item drop on the board at a time.
const EG_ITEM_DROP_MAX_ON_BOARD = 1;

// Maps an ITEM_DEFS rarity to one of the overlay glow classes that exist
// in CSS. Falls back to common for unknown values.
function _egItemDropRarityClass(rarity) {
    return ['common', 'uncommon', 'rare', 'epic', 'legendary', 'cursed', 'artifact']
        .includes(rarity) ? rarity : 'common';
}

function _egRenderItemDropOverlay(row, col, drop) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;
    const def = ITEM_DEFS[drop.defId];
    const rarityCls = _egItemDropRarityClass(def && def.rarity);
    const span = document.createElement('span');
    span.className = `eg-pickup-overlay eg-pickup-rarity-${rarityCls} eg-item-drop-overlay`;
    span.id = `eg-item-drop-${row}-${col}`;
    span.textContent = (def && def.icon) || '📦';
    el.appendChild(span);
}

function _egRemoveItemDropOverlay(key) {
    const [r, c] = key.split('-').map(Number);
    const span = document.getElementById(`eg-item-drop-${r}-${c}`);
    if (span) span.remove();
}

function _egAnimateItemDropClaim(row, col, drop) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;
    const def = ITEM_DEFS[drop.defId];
    const centre = _egGetElementCentre(el);
    const floater = document.createElement('div');
    floater.className = 'eg-pickup-floater';
    floater.textContent = (def && def.icon) || '📦';
    floater.style.left = `${centre.x}px`;
    floater.style.top = `${centre.y}px`;
    document.body.appendChild(floater);
    setTimeout(() => floater.remove(), 800);
}

// Attempts to place one regular-item drop on the grid after a monster dies.
// isBoss — pass true for the higher boss drop chance.
function _egSpawnItemDrop(isBoss = false) {
    if (!_egIsActive()) return;

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
    const itemId = (typeof pickRandomItem === 'function') ? pickRandomItem() : null;
    if (!itemId || !ITEM_DEFS[itemId]) return;

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
function _egCheckItemDropClaim(row, col) {
    if (!_egIsActive()) return false;
    const key = `${row}-${col}`;
    const drop = _egItemDrops.get(key);
    if (!drop) return false;

    _egCancelTrackedExpiry(_egItemDrops, key, drop);
    _egItemDrops.delete(key);
    _egRemoveItemDropOverlay(key);
    _egAnimateItemDropClaim(row, col, drop);

    const def = ITEM_DEFS[drop.defId];
    STATE.inventory.push({
        uid: `item_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        defId: drop.defId,
    });
    save();
    buildInventoryPanel();

    // Track for the leave-map summary screen (mirrors _egTrackRunCurrency)
    _egRunItems.push({
        defId: drop.defId,
        icon: (def && def.icon) || '📦',
        name: def ? itemName(def) : '???',
        rarity: (def && def.rarity) || 'common',
    });

    Audio_Manager.playSFX('player_equip_pickup');
    showToast(t('eg_item_claimed')
        .replace('{icon}', (def && def.icon) || '')
        .replace('{name}', itemName(def)), _egRarityToastColor(def && def.rarity));
    return true;
}

// Called when the player makes a WRONG action on a cell with a regular-item
// drop. The drop is destroyed (mirrors the other drop types).
function _egDiscardItemDrop(row, col) {
    if (!_egIsActive()) return;
    const key = `${row}-${col}`;
    if (!_egItemDrops.has(key)) return;
    const drop = _egItemDrops.get(key);
    const def = ITEM_DEFS[drop.defId];
    _egCancelTrackedExpiry(_egItemDrops, key, drop);
    _egItemDrops.delete(key);
    _egRemoveItemDropOverlay(key);
    _egAnimatePickupDiscard(row, col, { emoji: (def && def.icon) || '📦' });

    Audio_Manager.playSFX('player_equip_not_pickup');
}

// Clears all active regular-item drops (called by _egStopPickupSpawner).
function _egStopItemDrops() {
    Array.from(_egItemDrops.entries()).forEach(([key, drop]) => _egCancelTrackedExpiry(_egItemDrops, key, drop));
    _egItemDrops.forEach((drop, key) => _egRemoveItemDropOverlay(key));
    _egItemDrops.clear();
}

// Carries an unclaimed regular-item drop into the next chained puzzle
// (mirrors _egReplaceCarriedCurrencyDrops).
function _egReplaceCarriedItemDrops(drops) {
    if (!drops || drops.length === 0) return;

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