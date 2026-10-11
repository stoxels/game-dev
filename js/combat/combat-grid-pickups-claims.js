import { _charmAutoClaimOnReveal } from '../skills/skill-charms.js';
import { _egCheckMapDropClaim, _egMapDrops } from '../loot/loot-map-drops.js';
import { _egCurrencyDrops, _egIsActive, _egItemDrops, _egLootDrops, _egPickups } from './combat-state.js';
import { _egCheckLootClaim } from './combat-grid-pickups-loot.js';
import { _egCheckCurrencyDropClaim } from './combat-grid-pickups-currency.js';
import { _egCheckItemDropClaim } from './combat-grid-pickups-items.js';
import { _egCheckPickupClaim } from './combat-grid-pickups-spawner.js';
import { _egComputePlayerStats } from '../endgame/endgame-player-stats.js';
import { _egLifeGain } from '../endgame/endgame-leveling.js';
import { gainMana } from '../classes/class-mana.js';
import { _renderPlayerHealth } from '../sprite/player_sprite.js';
import { _egGainEnduranceCharge, _egGainFrenzyCharge, _egGainPowerCharge } from './combat-ailments-state.js';

// Called from renderCell whenever a cell becomes visually revealed
// (via an ability, passive ability, or item reveal effect).
// Revealed cells can no longer be filled by the player, so any drop
// sitting there would be permanently unclaimable - instead it is
// automatically picked up using the normal claim flow.
export function _egAutoClaimDropsOnReveal(row, col) {
    if (!_egIsActive()) return;
    const key = `${row}-${col}`;

    // Claim every drop type present (not else-if) - spawn guards now keep
    // drops from stacking, but this stays defensive so a stacked legacy
    // state can never leave a stuck overlay behind.
    if (_egPickups.has(key)) _egCheckPickupClaim(row, col);
    if (_egLootDrops.has(key)) _egCheckLootClaim(row, col);
    if (_egCurrencyDrops.has(key)) _egCheckCurrencyDropClaim(row, col);
    if (_egItemDrops.has(key)) _egCheckItemDropClaim(row, col);
    if (typeof _egMapDrops !== 'undefined' && _egMapDrops.has(key)) _egCheckMapDropClaim(row, col);
    if (typeof _charmAutoClaimOnReveal === 'function') _charmAutoClaimOnReveal(row, col);
}

// Puzzle <-> combat crossover (tree lines life_on_line / absorption_on_line /
// mana_on_line / charge_on_line): `lines` rows or columns were just completed
// for the first time this level (called from grid.js). Gains follow the same
// rules as on-kill gains: Life only below the maximum and subject to
// Sanguine Pact, Absorption only while a map run is active, Mana only with a
// mana pool, and a charge of a random kind that has room under its cap.
export function _egOnLinesCompleted(lines) {
    const n = Math.max(0, Math.floor(Number(lines) || 0));
    if (n === 0) return;
    const s = _egComputePlayerStats();
    if (!s) return;

    // damage_after_line (tree): 5 seconds of increased Damage per completed line.
    if ((s.damageAfterLinePct || 0) > 0 && globalThis.LEVEL_FLAGS) {
        globalThis.LEVEL_FLAGS.damageAfterLineUntil = Date.now() + 5000;
    }

    const life = Math.round((s.lifeOnLine || 0) * n);
    if (life > 0 && globalThis.playerCurrentHP > 0 && globalThis.playerCurrentHP < globalThis.playerMaxHP) {
        globalThis.playerCurrentHP = Math.min(globalThis.playerMaxHP, globalThis.playerCurrentHP + _egLifeGain(life));
        _renderPlayerHealth();
    }

    const absorption = Math.round((s.absorptionOnLine || 0) * n);
    if (absorption > 0 && _egIsActive() && globalThis._egPlayerAbsorptionCurrent < s.absorption) {
        globalThis._egPlayerAbsorptionCurrent = Math.min(s.absorption, globalThis._egPlayerAbsorptionCurrent + absorption);
    }

    const mana = Math.round((s.manaOnLine || 0) * n);
    if (mana > 0 && globalThis.playerMaxMana > 0) gainMana(mana);

    const chance = Math.min(100, s.chargeOnLinePct || 0);
    if (chance > 0) {
        const kinds = [
            () => _egGainEnduranceCharge(s.enduranceChargesMax, s.enduranceDurationPct),
            () => _egGainFrenzyCharge(s.frenzyChargesMax, s.frenzyDurationPct),
            () => _egGainPowerCharge(s.powerChargesMax, s.powerDurationPct),
        ];
        for (let i = 0; i < n; i++) {
            if (Math.random() * 100 < chance) kinds[Math.floor(Math.random() * kinds.length)]();
        }
    }
}

// lucky_tile_reward (tree): claiming a Lucky Tile also restores Life and Mana
// (same amount for both). Called from handleLuckyTileClaim in
// mouse-button-handlers.js.
export function _egOnLuckyTileClaimed() {
    const amount = Math.round(Number(_egComputePlayerStats().luckyTileRewardAmount) || 0);
    if (amount <= 0) return;
    if (globalThis.playerCurrentHP > 0 && globalThis.playerCurrentHP < globalThis.playerMaxHP) {
        globalThis.playerCurrentHP = Math.min(globalThis.playerMaxHP, globalThis.playerCurrentHP + _egLifeGain(amount));
        _renderPlayerHealth();
    }
    if (globalThis.playerMaxMana > 0) gainMana(amount);
}
