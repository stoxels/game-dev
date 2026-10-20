import { _charmAutoClaimOnReveal } from '../skills/skill-charms.js';
import { _egCheckMapDropClaim, _egMapDrops } from '../loot/loot-map-drops.js';
import { _currencyDrops, _isActive, _itemDrops, _lootDrops, _pickups } from './combat-state.js';
import { _checkLootClaim } from './combat-grid-pickups-loot.js';
import { _checkCurrencyDropClaim } from './combat-grid-pickups-currency.js';
import { _checkItemDropClaim } from './combat-grid-pickups-items.js';
import { _checkPickupClaim } from './combat-grid-pickups-spawner.js';
import { _computePlayerStats } from '../endgame/endgame-player-stats.js';
import { _lifeGain } from '../endgame/endgame-leveling.js';
import { gainMana } from '../classes/class-mana.js';
import { _renderPlayerHealth } from '../sprite/player_sprite.js';
import { _gainEnduranceCharge, _gainFrenzyCharge, _gainPowerCharge, _getEnduranceCharges, _getFrenzyCharges, _getPowerCharges } from './combat-ailments-state.js';

// Called from renderCell whenever a cell becomes visually revealed
// (via an ability, passive ability, or item reveal effect).
// Revealed cells can no longer be filled by the player, so any drop
// sitting there would be permanently unclaimable - instead it is
// automatically picked up using the normal claim flow.
export function _autoClaimDropsOnReveal(row, col) {
    if (!_isActive()) return;
    const key = `${row}-${col}`;

    // Claim every drop type present (not else-if) - spawn guards now keep
    // drops from stacking, but this stays defensive so a stacked legacy
    // state can never leave a stuck overlay behind.
    if (_pickups.has(key)) _checkPickupClaim(row, col);
    if (_lootDrops.has(key)) _checkLootClaim(row, col);
    if (_currencyDrops.has(key)) _checkCurrencyDropClaim(row, col);
    if (_itemDrops.has(key)) _checkItemDropClaim(row, col);
    if (typeof _egMapDrops !== 'undefined' && _egMapDrops.has(key)) _egCheckMapDropClaim(row, col);
    if (typeof _charmAutoClaimOnReveal === 'function') _charmAutoClaimOnReveal(row, col);
}

// Puzzle <-> combat crossover (tree lines life_on_line / absorption_on_line /
// mana_on_line / charge_on_line): `lines` rows or columns were just completed
// for the first time this level (called from grid.js). Gains follow the same
// rules as on-kill gains: Life only below the maximum and subject to
// Sanguine Pact, Absorption only while a map run is active, Mana only with a
// mana pool, and a charge of a random kind that has room under its cap.
export function _onLinesCompleted(lines) {
    const n = Math.max(0, Math.floor(Number(lines) || 0));
    if (n === 0) return;
    const s = _computePlayerStats();
    if (!s) return;

    // damage_after_line (tree): 5 seconds of increased Damage per completed line.
    if ((s.damageAfterLinePct || 0) > 0 && globalThis.LEVEL_FLAGS) {
        globalThis.LEVEL_FLAGS.damageAfterLineUntil = Date.now() + 5000;
    }

    const life = Math.round((s.lifeOnLine || 0) * n);
    if (life > 0 && globalThis.playerCurrentHP > 0 && globalThis.playerCurrentHP < globalThis.playerMaxHP) {
        globalThis.playerCurrentHP = Math.min(globalThis.playerMaxHP, globalThis.playerCurrentHP + _lifeGain(life));
        _renderPlayerHealth();
    }

    const absorption = Math.round((s.absorptionOnLine || 0) * n);
    if (absorption > 0 && _isActive() && globalThis._playerAbsorptionCurrent < s.absorption) {
        globalThis._playerAbsorptionCurrent = Math.min(s.absorption, globalThis._playerAbsorptionCurrent + absorption);
    }

    const mana = Math.round((s.manaOnLine || 0) * n);
    if (mana > 0 && globalThis.playerMaxMana > 0) gainMana(mana);

    const chance = Math.min(100, s.chargeOnLinePct || 0);
    // Generic charge_on_line rolls a random kind among those with room under
    // their cap; the charge-specific nodes roll their own charge.
    const gainers = [
        { pct: s.enduranceOnLinePct, room: () => _getEnduranceCharges() < Math.max(1, Math.floor(Number(s.enduranceChargesMax) || 0)), gain: () => _gainEnduranceCharge(s.enduranceChargesMax, s.enduranceDurationPct) },
        { pct: s.frenzyOnLinePct, room: () => _getFrenzyCharges() < Math.max(1, Math.floor(Number(s.frenzyChargesMax) || 0)), gain: () => _gainFrenzyCharge(s.frenzyChargesMax, s.frenzyDurationPct) },
        { pct: s.powerOnLinePct, room: () => _getPowerCharges() < Math.max(1, Math.floor(Number(s.powerChargesMax) || 0)), gain: () => _gainPowerCharge(s.powerChargesMax, s.powerDurationPct) },
    ];
    for (let i = 0; i < n; i++) {
        for (const g of gainers) {
            if ((Number(g.pct) || 0) > 0 && Math.random() * 100 < Math.min(100, g.pct)) g.gain();
        }
        if (chance > 0 && Math.random() * 100 < chance) {
            const open = gainers.filter(g => g.room());
            const pool = open.length ? open : gainers;
            pool[Math.floor(Math.random() * pool.length)].gain();
        }
    }
}

// lucky_tile_reward (tree): claiming a Lucky Tile also restores Life and Mana
// (same amount for both). Called from handleLuckyTileClaim in
// mouse-button-handlers.js.
export function _onLuckyTileClaimed() {
    const amount = Math.round(Number(_computePlayerStats().luckyTileRewardAmount) || 0);
    if (amount <= 0) return;
    if (globalThis.playerCurrentHP > 0 && globalThis.playerCurrentHP < globalThis.playerMaxHP) {
        globalThis.playerCurrentHP = Math.min(globalThis.playerMaxHP, globalThis.playerCurrentHP + _lifeGain(amount));
        _renderPlayerHealth();
    }
    if (globalThis.playerMaxMana > 0) gainMana(amount);
}
