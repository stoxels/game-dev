import { _egGetElementCentre } from '../combat/combat-class-projectiles.js';
import { EG_LOOT_DROP_LIFETIME_MS, _egBuildPickupEligiblePool, _egCancelTrackedExpiry, _egCellHasAnyDrop, _egScheduleTrackedExpiry, _egStartDropExpireCountdown } from '../combat/combat-grid-pickups.js';
import { _egMapLootQuantityMult } from '../endgame/endgame-map-launch.js';
import { _egIsActive } from '../combat/combat-state.js';
import { EG_ART } from '../endgame/endgame-art.js';

//------------------------------------------------------------------------
//-------------------ENDGAME GOLD COIN DROPS------------------------------
//------------------------------------------------------------------------
// Gold stopped dropping from monsters: it is now an innate map-completion
// reward. This file keeps the coin machinery and its API so existing call
// sites keep working.
//------------------------------------------------------------------------

//------------------------------------------------------------------------
//-------------------CONSTANTS & STATE-------------------------------------
//------------------------------------------------------------------------

// Chance (0-1) that a defeated monster drops a gold coin. Retained from the
// monster-drop era; the drop itself is no longer rolled.
export const EG_GOLD_DROP_CHANCE_NORMAL = 0.30;  // 30% per normal monster kill
export const EG_GOLD_DROP_CHANCE_BOSS = 1.00;    // bosses always drop gold

// Hard cap: how many gold coins may sit on the board at the same time.
const EG_GOLD_DROP_MAX_ON_BOARD = 4;

// Base gold amount range per claimed coin (before map-tier scaling).
const EG_GOLD_BASE_MIN = 4;
const EG_GOLD_BASE_MAX = 9;

// Boss coins multiply the rolled amount by this factor.
const EG_GOLD_BOSS_AMOUNT_MULT = 4;

// Live gold coins on the board, keyed by "row-col" to { amount }.
export const _egGoldDrops = new Map();

//------------------------------------------------------------------------
//-------------------AMOUNT ROLLING---------------------------------------
//------------------------------------------------------------------------

// Rolls one coin's worth of gold, scaled by monster level, map loot bonus,
// and whether the source was a boss. Kept exported for API compatibility;
// the monster drop that used it is now a no-op.
export function _egRollGoldAmount(isBoss, monsterLevel) {
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

// Gold no longer drops from monsters - it's now an innate map completion
// reward. This function is kept as a no-op for API compatibility.
export function _egTryDropGold(isBoss, monsterLevel) {
    return;
}

//------------------------------------------------------------------------
//-------------------COIN OVERLAYS--------------------------------------
//------------------------------------------------------------------------

// Draws the coin art on a grid cell.
function _egRenderGoldDropOverlay(row, col, drop) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;
    const span = document.createElement('span');
    span.className = `eg-pickup-overlay eg-pickup-rarity-legendary eg-gold-drop-overlay`;
    span.id = `eg-gold-drop-${row}-${col}`;
    // Gold coin art (images/items/, id 'gold') when available, else emoji.
    EG_ART.fillElement(span, 'item', 'gold', '🪙');
    el.appendChild(span);
}

// Takes the coin art off a grid cell.
function _egRemoveGoldDropOverlay(key) {
    const [r, c] = key.split('-').map(Number);
    const span = document.getElementById(`eg-gold-drop-${r}-${c}`);
    if (span) span.remove();
}

// Floats a spinning coin over the cell that was just claimed. Kept exported
// for API compatibility; claiming a coin no longer happens.
export function _egAnimateGoldDropClaim(row, col, drop) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;
    const centre = typeof _egGetElementCentre === 'function' ? _egGetElementCentre(el) : { x: 0, y: 0 };
    const floater = document.createElement('div');
    floater.className = 'eg-pickup-floater';
    EG_ART.fillElement(floater, 'item', 'gold', '🪙');
    floater.style.left = `${centre.x}px`;
    floater.style.top = `${centre.y}px`;
    document.body.appendChild(floater);
    setTimeout(() => floater.remove(), 800);
}

//------------------------------------------------------------------------
//-------------------COIN PLACEMENT---------------------------------------
//------------------------------------------------------------------------

// Places one gold coin on an eligible grid cell (mirrors _egSpawnCurrencyDrop).
export function _egSpawnGoldDrop(amount) {
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
    if (typeof _egScheduleTrackedExpiry === 'function') {
        _egScheduleTrackedExpiry(_egGoldDrops, key, drop, lifetimeMs, `eg-gold-drop-${r}-${c}`, _egRemoveGoldDropOverlay);
    } else {
        const timer = setTimeout(() => {
            if (_egGoldDrops.get(key) === drop) {
                _egGoldDrops.delete(key);
                _egRemoveGoldDropOverlay(key);
            }
        }, lifetimeMs);
        if (typeof _egPickupTimers !== 'undefined') globalThis._egPickupTimers.push(timer);
        if (typeof _egStartDropExpireCountdown === 'function') {
            _egStartDropExpireCountdown(`eg-gold-drop-${r}-${c}`, lifetimeMs);
        }
    }
}

//------------------------------------------------------------------------
//-------------------LEGACY CALL SITES--------------------------------------
//------------------------------------------------------------------------
// Gold no longer drops on the grid, so claiming and discarding a coin do
// nothing. These stay so the shared drop code keeps calling the same names.
//------------------------------------------------------------------------

// Always reports "no coin here".
export function _egCheckGoldDropClaim(row, col) { return false; }

// Does nothing: there is no coin to throw away.
export function _egDiscardGoldDrop(row, col) {}

// Clears every coin still on the board.
export function _egStopGoldDrops() {
    if (typeof _egCancelTrackedExpiry === 'function') {
        Array.from(_egGoldDrops.entries()).forEach(([key, drop]) => _egCancelTrackedExpiry(_egGoldDrops, key, drop));
    }
    _egGoldDrops.forEach((drop, key) => _egRemoveGoldDropOverlay(key));
    _egGoldDrops.clear();
}

// Does nothing: gold is no longer a carried drop type.
export function _egReplaceCarriedGoldDrops(drops) {}
