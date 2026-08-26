'use strict';

//------------------------------------------------------------------------
//-------------------ENDGAME GOLD------------------------------------------
//------------------------------------------------------------------------
// Gold is the endgame's soft trade currency. Monsters (and especially
// bosses) drop gold coins onto the grid like any other drop type; claiming
// a coin banks it into the player's persistent gold balance
// (STATE.egGold). The Map Vendor on the Nexus of Worlds screen sells
// Tier 1 maps for gold.
//
// Load AFTER endgame-maps.js (vendor needs _egGenerateMapDrop) and AFTER
// endgame-hub.js (needs egSaveHubState / _egMapStash helpers).
//
// Public API:
//   egGetGold()            — current gold balance
//   egSpendGold(n)         — try to spend, returns false when too poor
//   showEndgameVendor()    — opens the vendor screen (endgame-vendor.js)
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//-------------------CONSTANTS---------------------------------------------
//------------------------------------------------------------------------

// Chance (0–1) that a defeated monster drops a gold coin onto the grid.
const EG_GOLD_DROP_CHANCE_NORMAL = 0.30;  // 30% per normal monster kill
const EG_GOLD_DROP_CHANCE_BOSS = 1.00;    // bosses always drop gold

// Hard cap: how many gold coins may sit on the board at the same time.
const EG_GOLD_DROP_MAX_ON_BOARD = 4;

// Base gold amount range per claimed coin (before map-tier scaling).
const EG_GOLD_BASE_MIN = 4;
const EG_GOLD_BASE_MAX = 9;

// Boss coins multiply the rolled amount by this factor.
const EG_GOLD_BOSS_AMOUNT_MULT = 4;

// The active map's loot quantity bonus also scales the gold amount.


//------------------------------------------------------------------------
//-------------------PERSISTENT BALANCE------------------------------------
//------------------------------------------------------------------------

let _egGoldAmount = (typeof STATE !== 'undefined' && STATE.egGold) || 0;

function egGetGold() {
    return _egGoldAmount;
}

function _egSyncGoldToState() {
    if (typeof STATE === 'undefined') return;
    STATE.egGold = _egGoldAmount;
    if (typeof save === 'function') save();
}

function _egAddGold(amount) {
    amount = Math.max(0, Math.round(amount));
    _egGoldAmount += amount;
    _egSyncGoldToState();
}

// Attempts to spend `amount` gold. Returns false (without changing anything)
// when the balance is insufficient.
function egSpendGold(amount) {
    amount = Math.round(amount);
    if (amount < 0 || _egGoldAmount < amount) return false;
    _egGoldAmount -= amount;
    _egSyncGoldToState();
    return true;
}


//------------------------------------------------------------------------
//-------------------GRID DROPS--------------------------------------------
//------------------------------------------------------------------------

const _egGoldDrops = new Map(); // key "row-col" → { amount }

function _egRollGoldAmount(isBoss, monsterLevel) {
    let amount = EG_GOLD_BASE_MIN + Math.floor(Math.random() * (EG_GOLD_BASE_MAX - EG_GOLD_BASE_MIN + 1));

    // Higher-level monsters carry richer coins.
    const levelBonus = Math.max(0, Math.min(20, Math.round((monsterLevel || 1) - 1)) * 0.15);
    amount *= (1 + levelBonus);

    // Active map's loot quantity bonus also scales gold.
    if (typeof _egMapLootQuantityMult === 'function') {
        amount *= _egMapLootQuantityMult();
    }

    if (isBoss) amount *= EG_GOLD_BOSS_AMOUNT_MULT;

    return Math.max(1, Math.round(amount));
}

// Called by the kill handlers in endgame-encounter.js.
function _egTryDropGold(isBoss, monsterLevel) {
    const baseChance = isBoss ? EG_GOLD_DROP_CHANCE_BOSS : EG_GOLD_DROP_CHANCE_NORMAL;
    const qtyMult = (typeof _egMapLootQuantityMult === 'function') ? _egMapLootQuantityMult() : 1;
    const chance = Math.min(1, baseChance * qtyMult);
    if (!isBoss && Math.random() > chance) return;

    _egSpawnGoldDrop(_egRollGoldAmount(isBoss, monsterLevel));
}

function _egRenderGoldDropOverlay(row, col, drop) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;
    const span = document.createElement('span');
    span.className = `eg-pickup-overlay eg-pickup-rarity-legendary eg-gold-drop-overlay`;
    span.id = `eg-gold-drop-${row}-${col}`;
    span.textContent = '🪙';
    el.appendChild(span);
}

function _egRemoveGoldDropOverlay(key) {
    const [r, c] = key.split('-').map(Number);
    const span = document.getElementById(`eg-gold-drop-${r}-${c}`);
    if (span) span.remove();
}

function _egAnimateGoldDropClaim(row, col, drop) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;
    const centre = typeof _egGetElementCentre === 'function' ? _egGetElementCentre(el) : { x: 0, y: 0 };
    const floater = document.createElement('div');
    floater.className = 'eg-pickup-floater';
    floater.textContent = '🪙';
    floater.style.left = `${centre.x}px`;
    floater.style.top = `${centre.y}px`;
    document.body.appendChild(floater);
    setTimeout(() => floater.remove(), 800);
}

// Places one gold coin on an eligible grid cell (mirrors _egSpawnCurrencyDrop).
function _egSpawnGoldDrop(amount) {
    if (!_egIsActive() || !(amount > 0)) return;
    if (_egGoldDrops.size >= EG_GOLD_DROP_MAX_ON_BOARD) return;

    const pool = typeof _egBuildPickupEligiblePool === 'function'
        ? _egBuildPickupEligiblePool()
        : [];
    const filtered = typeof _egCellHasAnyDrop === 'function'
        ? pool.filter(([r, c]) => !_egCellHasAnyDrop(r, c))
        : pool;
    if (filtered.length === 0) return;

    const [r, c] = filtered[Math.floor(Math.random() * filtered.length)];
    const key = `${r}-${c}`;
    const drop = { amount };

    _egGoldDrops.set(key, drop);
    _egRenderGoldDropOverlay(r, c, drop);

    const lifetimeMs = EG_LOOT_DROP_LIFETIME_MS;
    const timer = setTimeout(() => {
        if (_egGoldDrops.get(key) === drop) {
            _egGoldDrops.delete(key);
            _egRemoveGoldDropOverlay(key);
        }
    }, lifetimeMs);
    if (typeof _egPickupTimers !== 'undefined') _egPickupTimers.push(timer);

    if (typeof _egStartDropExpireCountdown === 'function') {
        _egStartDropExpireCountdown(`eg-gold-drop-${r}-${c}`, lifetimeMs);
    }
}

// Called from _egCheckAllClaims (mouse-button-handlers.js),
// _egAutoClaimDropsOnReveal (endgame-grid-pickups.js).
function _egCheckGoldDropClaim(row, col) {
    if (!_egIsActive()) return false;
    const key = `${row}-${col}`;
    const drop = _egGoldDrops.get(key);
    if (!drop) return false;

    _egGoldDrops.delete(key);
    _egRemoveGoldDropOverlay(key);
    _egAnimateGoldDropClaim(row, col, drop);

    _egAddGold(drop.amount);

    Audio_Manager.playSFX('player_equip_pickup');
    showToast(t('eg_gold_acquired').replace('{n}', drop.amount));
    return true;
}

// Called from _egDiscardAllDrops (mouse-button-handlers.js).
function _egDiscardGoldDrop(row, col) {
    if (!_egIsActive()) return;
    const key = `${row}-${col}`;
    if (!_egGoldDrops.has(key)) return;
    const drop = _egGoldDrops.get(key);
    _egGoldDrops.delete(key);
    _egRemoveGoldDropOverlay(key);
    if (typeof _egAnimatePickupDiscard === 'function') {
        _egAnimatePickupDiscard(row, col, { emoji: '🪙' });
    }
    Audio_Manager.playSFX('player_equip_not_pickup');
}

// Clears all active gold drops (called by _egStopPickupSpawner).
function _egStopGoldDrops() {
    _egGoldDrops.forEach((drop, key) => _egRemoveGoldDropOverlay(key));
    _egGoldDrops.clear();
}

// Carries unclaimed gold coins into the next chained puzzle
// (mirrors _egReplaceCarriedCurrencyDrops).
function _egReplaceCarriedGoldDrops(drops) {
    if (!drops || drops.length === 0) return;

    drops.forEach(drop => {
        if (_egGoldDrops.size >= EG_GOLD_DROP_MAX_ON_BOARD) return;

        const pool = typeof _egBuildPickupEligiblePool === 'function'
            ? _egBuildPickupEligiblePool()
            : [];
        const filtered = typeof _egCellHasAnyDrop === 'function'
            ? pool.filter(([r, c]) => !_egCellHasAnyDrop(r, c))
            : pool;
        if (filtered.length === 0) return;

        const [r, c] = filtered[Math.floor(Math.random() * filtered.length)];
        const key = `${r}-${c}`;

        _egGoldDrops.set(key, drop);
        _egRenderGoldDropOverlay(r, c, drop);

        const lifetimeMs = EG_LOOT_DROP_LIFETIME_MS;
        const timer = setTimeout(() => {
            if (_egGoldDrops.get(key) === drop) {
                _egGoldDrops.delete(key);
                _egRemoveGoldDropOverlay(key);
            }
        }, lifetimeMs);
        if (typeof _egPickupTimers !== 'undefined') _egPickupTimers.push(timer);

        if (typeof _egStartDropExpireCountdown === 'function') {
            _egStartDropExpireCountdown(`eg-gold-drop-${r}-${c}`, lifetimeMs);
        }
    });
}
