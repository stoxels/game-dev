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

// Hard cap: never place a loot drop if it would push pending loot +
// items already in the stash beyond this free-slot budget.
// Checked via _egStashHasFreeSlot() at drop time.








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
        id: 'heart_small', emoji: '💛', label: 'Small Heart', rarity: 'common',
        onPickup(row, col) {
            const heal = 10;
            playerCurrentHP = Math.min(playerMaxHP, playerCurrentHP + heal);
            _renderPlayerHealth();
            showToast(`💛 Small Heart! +${heal} HP`);
            Audio_Manager.playSFX('heart_heals');
        },
    },
    heart_medium: {
        id: 'heart_medium', emoji: '🧡', label: 'Heart', rarity: 'uncommon',
        onPickup(row, col) {
            const heal = 25;
            playerCurrentHP = Math.min(playerMaxHP, playerCurrentHP + heal);
            _renderPlayerHealth();
            showToast(`🧡 Heart! +${heal} HP`);
            Audio_Manager.playSFX('heart_heals');
        },
    },
    heart_large: {
        id: 'heart_large', emoji: '❤️', label: 'Large Heart', rarity: 'rare',
        onPickup(row, col) {
            const heal = 50;
            playerCurrentHP = Math.min(playerMaxHP, playerCurrentHP + heal);
            _renderPlayerHealth();
            showToast(`❤️ Large Heart! +${heal} HP`);
            Audio_Manager.playSFX('heart_heals');
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
];









//------------------------------------------------------------------------
//-------------------PICKUP HELPERS---------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

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

// Schedules the auto-expiry timer for a placed pickup.
// Removes both the state entry and the DOM overlay when it fires.
function _egSchedulePickupExpiry(key, def) {
    const timer = setTimeout(() => {
        // Only remove if this exact def is still sitting on the key
        // (prevents a race where the pickup was already claimed).
        if (_egPickups.get(key) === def) {
            _egPickups.delete(key);
            _egRemovePickupOverlay(key);
        }
    }, EG_PICKUP_LIFETIME_MS);
    _egPickupTimers.push(timer);
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
        if (_egIsActive()) {
            _egSpawnPickup();
            _egScheduleNextPickupSpawn();
        }
    }, delay);
}

// Attempts to place one pickup on a random eligible grid tile.
// Does nothing if the board is already at max pickups or no eligible cells exist.
function _egSpawnPickup() {
    // Stop spawning hearts once all monsters have been defeated
    const req = _egGetMapRequirements();
    if (req.totalMonsters > 0 && _egChainKillCount >= req.totalMonsters) return;

    if (_egPickups.size >= EG_PICKUP_MAX_ON_BOARD) return;

    const pool = _egBuildPickupEligiblePool();
    if (pool.length === 0) return;

    const [r, c] = pool[Math.floor(Math.random() * pool.length)];
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
    _egPickupTimers.forEach(t => clearTimeout(t));
    _egPickupTimers = [];

    _egPickups.forEach((def, key) => _egRemovePickupOverlay(key));
    _egPickups.clear();

    if (typeof _egStopLootDrops === 'function') _egStopLootDrops();
    if (typeof _egStopCurrencyDrops === 'function') _egStopCurrencyDrops();
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

// Returns true if the main stash has at least one free slot.
// Used to gate loot drops so the stash can never overflow.
function _egStashHasFreeSlot() {
    for (let r = 0; r < EG_INV_ROWS; r++)
        for (let c = 0; c < EG_INV_COLS; c++)
            if (!_egInventory[r][c]) return true;
    return false;
}

// Injects the loot overlay span into the cell's DOM element.
// Re-uses the pickup overlay class but adds a dedicated loot modifier class.
function _egRenderLootOverlay(row, col, item) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;
    const span = document.createElement('span');
    span.className = `eg-pickup-overlay eg-pickup-rarity-uncommon eg-loot-overlay`;
    span.id = `eg-loot-${row}-${col}`;
    span.textContent = item.icon || '📦';
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
    floater.textContent = item.icon || '📦';
    floater.style.left = `${centre.x}px`;
    floater.style.top = `${centre.y}px`;
    document.body.appendChild(floater);
    setTimeout(() => floater.remove(), 800);
}

// Attempts to place one loot drop on the grid after a monster dies.
// isBoss — pass true for guaranteed drop chance.
function _egSpawnLootDrop(isBoss = false, monsterLevel = 1) {
    if (!_egIsActive()) return;

    // Stash full? Skip entirely so we never exceed capacity.
    if (!_egStashHasFreeSlot()) return;

    const dropChance = isBoss ? EG_LOOT_DROP_CHANCE_BOSS : EG_LOOT_DROP_CHANCE_NORMAL;
    if (Math.random() > dropChance) return;

    // Don't place a second loot drop if one is already on the board.
    if (_egLootDrops.size >= 1) return;

    const pool = _egBuildPickupEligiblePool();
    // Also exclude cells that already have a heart pickup.
    const filtered = pool.filter(([r, c]) => !_egPickups.has(`${r}-${c}`));
    if (filtered.length === 0) return;

    const [r, c] = filtered[Math.floor(Math.random() * filtered.length)];
    const key = `${r}-${c}`;

    // Generate the item that will drop (uses the equipment generator if available,
    // otherwise falls back to a simple placeholder object).
    let item;
    if (typeof _egGenerateEquipmentDrop === 'function') {
        item = _egGenerateEquipmentDrop(monsterLevel);
    }

    _egLootDrops.set(key, item);
    _egRenderLootOverlay(r, c, item);

    // Auto-expire after the loot lifetime
    const timer = setTimeout(() => {
        if (_egLootDrops.get(key) === item) {
            _egLootDrops.delete(key);
            _egRemoveLootOverlay(key);
        }
    }, EG_LOOT_DROP_LIFETIME_MS);
    _egPickupTimers.push(timer); // reuse existing timer array so stop() cleans up
}

// Called when the player correctly claims the cell that holds a loot drop.
// Adds the item to the run's temporary loot bag and refreshes the HUD.
// Returns true if a loot drop was present and claimed.
function _egCheckLootClaim(row, col) {
    if (!_egIsActive()) return false;
    const key = `${row}-${col}`;
    const item = _egLootDrops.get(key);
    if (!item) return false;

    _egLootDrops.delete(key);
    _egRemoveLootOverlay(key);
    _egAnimateLootClaim(row, col, item);

    _egRunLoot.push(item);
    _egUpdateObjectivesHUD();

    Audio_Manager.playSFX('player_equip_pickup');

    showToast(`📦 Loot! ${item.icon || ''} ${item.name}`);
    return true;
}

// Called when the player makes a WRONG action on a cell that has a loot drop.
// The drop is silently discarded.
function _egDiscardLootDrop(row, col) {
    if (!_egIsActive()) return;
    const key = `${row}-${col}`;
    if (!_egLootDrops.has(key)) return;
    const item = _egLootDrops.get(key);
    _egLootDrops.delete(key);
    _egRemoveLootOverlay(key);
    _egAnimatePickupDiscard(row, col, { emoji: item.icon || '📦' }); // reuse broken-heart anim

    Audio_Manager.playSFX('player_equip_not_pickup');
}

// Clears all active loot drops from the board (called by _egStopPickupSpawner).
function _egStopLootDrops() {
    _egLootDrops.forEach((item, key) => _egRemoveLootOverlay(key));
    _egLootDrops.clear();
}

// Flushes all run loot into the first available stash slots.
// Call this on successful map clear, BEFORE _egChainCleanup resets the state.
function _egFlushRunLootToStash() {
    if (_egRunLoot.length === 0) return;

    let placed = 0;
    for (let r = 0; r < EG_INV_ROWS && placed < _egRunLoot.length; r++) {
        for (let c = 0; c < EG_INV_COLS && placed < _egRunLoot.length; c++) {
            if (!_egInventory[r][c]) {
                _egInventory[r][c] = _egRunLoot[placed];
                placed++;
            }
        }
    }

    if (placed > 0) {
        showToast(`🎒 ${placed} item${placed > 1 ? 's' : ''} added to your stash!`);
        // Re-render the stash grid if the hub screen is currently visible
        if (typeof _egRenderInventory === 'function') _egRenderInventory();
        if (typeof egSaveHubState === 'function') egSaveHubState();
    }
}


// Re-places items that were on the grid when a chain transition happened.
// Called at the start of a new chained puzzle so loot is never silently lost.
function _egReplaceCarriedLootDrops(items) {
    if (!items || items.length === 0) return;

    items.forEach(item => {
        // Respect the same stash-full guard as a normal drop
        if (!_egStashHasFreeSlot()) return;

        // Don't place if the board is already at the loot-drop cap
        if (_egLootDrops.size >= 1) return;

        const pool = _egBuildPickupEligiblePool();
        const filtered = pool.filter(([r, c]) => !_egPickups.has(`${r}-${c}`));
        if (filtered.length === 0) return;

        const [r, c] = filtered[Math.floor(Math.random() * filtered.length)];
        const key = `${r}-${c}`;

        _egLootDrops.set(key, item);
        _egRenderLootOverlay(r, c, item);

        const timer = setTimeout(() => {
            if (_egLootDrops.get(key) === item) {
                _egLootDrops.delete(key);
                _egRemoveLootOverlay(key);
            }
        }, EG_LOOT_DROP_LIFETIME_MS);
        _egPickupTimers.push(timer);
    });

    if (items.length > 0) showToast(`📦 Unclaimed loot carried to next puzzle!`);
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
    span.className = `eg-pickup-overlay eg-pickup-rarity-rare eg-currency-drop-overlay`;
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
    if (_egCurrencyDrops.size >= 1) return; // one currency drop on board at a time

    const pool = _egBuildPickupEligiblePool();
    const filtered = pool.filter(([r, c]) =>
        !_egPickups.has(`${r}-${c}`) && !_egLootDrops.has(`${r}-${c}`)
    );
    if (filtered.length === 0) return;

    const [r, c] = filtered[Math.floor(Math.random() * filtered.length)];
    const key = `${r}-${c}`;

    _egCurrencyDrops.set(key, def);
    _egRenderCurrencyDropOverlay(r, c, def);

    const timer = setTimeout(() => {
        if (_egCurrencyDrops.get(key) === def) {
            _egCurrencyDrops.delete(key);
            _egRemoveCurrencyDropOverlay(key);
        }
    }, EG_LOOT_DROP_LIFETIME_MS);
    _egPickupTimers.push(timer);
}

// Called on correct-cell-fill (mirrors _egCheckLootClaim). Adds the orb
// to the currency stash via egAddCurrency() and returns true if claimed.
function _egCheckCurrencyDropClaim(row, col) {
    if (!_egIsActive()) return false;
    const key = `${row}-${col}`;
    const def = _egCurrencyDrops.get(key);
    if (!def) return false;

    _egCurrencyDrops.delete(key);
    _egRemoveCurrencyDropOverlay(key);
    _egAnimateCurrencyDropClaim(row, col, def);

    const added = egAddCurrency(def.id, 1, {
        name: def.name,
        icon: def.icon,
        rarity: 'currency',
        category: 'currency',
        description: def.description,
    });

    Audio_Manager.playSFX('player_equip_pickup');
    if (added) showToast(`${def.icon} ${def.name} acquired!`);
    return true;
}

// Called on wrong-action-on-cell (mirrors _egDiscardLootDrop).
function _egDiscardCurrencyDrop(row, col) {
    if (!_egIsActive()) return;
    const key = `${row}-${col}`;
    if (!_egCurrencyDrops.has(key)) return;
    const def = _egCurrencyDrops.get(key);
    _egCurrencyDrops.delete(key);
    _egRemoveCurrencyDropOverlay(key);
    _egAnimatePickupDiscard(row, col, { emoji: def.icon || '💰' });

    Audio_Manager.playSFX('player_equip_not_pickup');
}

// Clears all active currency drops (called by _egStopPickupSpawner).
function _egStopCurrencyDrops() {
    _egCurrencyDrops.forEach((def, key) => _egRemoveCurrencyDropOverlay(key));
    _egCurrencyDrops.clear();
}

// Carries an unclaimed currency drop into the next chained puzzle
// (mirrors _egReplaceCarriedLootDrops).
function _egReplaceCarriedCurrencyDrops(defs) {
    if (!defs || defs.length === 0) return;

    defs.forEach(def => {
        if (_egCurrencyDrops.size >= 1) return;

        const pool = _egBuildPickupEligiblePool();
        const filtered = pool.filter(([r, c]) =>
            !_egPickups.has(`${r}-${c}`) && !_egLootDrops.has(`${r}-${c}`)
        );
        if (filtered.length === 0) return;

        const [r, c] = filtered[Math.floor(Math.random() * filtered.length)];
        const key = `${r}-${c}`;

        _egCurrencyDrops.set(key, def);
        _egRenderCurrencyDropOverlay(r, c, def);

        const timer = setTimeout(() => {
            if (_egCurrencyDrops.get(key) === def) {
                _egCurrencyDrops.delete(key);
                _egRemoveCurrencyDropOverlay(key);
            }
        }, EG_LOOT_DROP_LIFETIME_MS);
        _egPickupTimers.push(timer);
    });
}