// Boots the REAL game (generated/phase2/entry.mjs) headless under jsdom,
// runs a few gameplay probes, prints one JSON line and exits.
// Run as a child process by pt-node-30195-wiring.test.mjs: booting the full
// module graph in-process leaves promises pending that keep node:test's
// file-level test from ever settling.
import { installBrowserEnv } from './browser-env.mjs';

installBrowserEnv();
await import('../../../generated/phase2/entry.mjs');

const leveling = await import('../../../js/endgame/endgame-leveling.js');
const playerStats = await import('../../../js/endgame/endgame-player-stats.js');
const combat = await import('../../../js/combat/combat-calculations.js');

const STATE = globalThis.STATE;
const NODE_ID = 30195;        // Lesser Melee Force    +12% melee physical damage
const NODE_MIGHT = 30194;     // Lesser Champion's Might  +16% melee physical damage
const NODE_TEMPO = 30197;     // Lesser Champion's Tempo  +5% melee charge-up speed
const NODE_WRATH = 30198;     // Lesser Warrior's Wrath   +12% melee physical damage
const NODE_ONSLAUGHT = 20032; // Champion's Onslaught    notable: str/attack speed/physical damage

function withAllocated(ids, fn) {
    const prev = STATE.passiveTreeAllocated;
    STATE.passiveTreeAllocated = ids;
    try { return fn(); } finally { STATE.passiveTreeAllocated = prev; }
}

const prevRandom = Math.random;
const prevEquipped = globalThis._egEquipped;
Math.random = () => 0; // deterministic: always roll the range minimum
globalThis._egEquipped = {
    // attackIntervalSeconds gives the manual-strike charge channel a clean
    // 4s base (interval = 4 * EG_PLAYER_CHARGE_TIME_MULT(0.65) = 2.6s).
    weapon1: {
        slotType: 'weapon', damage: { min: 100, max: 150 },
        attackIntervalSeconds: 4, mods: [], implicits: [],
    },
};

let out;
try {
    out = {
        bonusWithout: withAllocated([], () => leveling._egSyncBaseAttributes().meleePhysIncPct),
        bonusWith: withAllocated([NODE_ID], () => leveling._egSyncBaseAttributes().meleePhysIncPct),
        statsWithout: withAllocated([], () => playerStats._egComputePlayerStats().meleePhysIncPct),
        statsWith: withAllocated([NODE_ID], () => playerStats._egComputePlayerStats().meleePhysIncPct),
        statsDouble: withAllocated([NODE_ID, NODE_ID], () => playerStats._egComputePlayerStats().meleePhysIncPct),
        meleeWithout: withAllocated([], () => combat._egCalcPlayerMeleeDamage(1)),
        meleeWith: withAllocated([NODE_ID], () => combat._egCalcPlayerMeleeDamage(1)),
        projWithout: withAllocated([], () => combat._egCalcPlayerDamage()),
        projWith: withAllocated([NODE_ID], () => combat._egCalcPlayerDamage()),

        // Node 30194 (Lesser Champion's Might): same melee-only % channel.
        bonusMight: withAllocated([NODE_MIGHT], () => leveling._egSyncBaseAttributes().meleePhysIncPct),
        statsMight: withAllocated([NODE_MIGHT], () => playerStats._egComputePlayerStats().meleePhysIncPct),
        meleeWithMight: withAllocated([NODE_MIGHT], () => combat._egCalcPlayerMeleeDamage(1)),
        // Both melee-damage nodes allocated at once stack additively (12 + 16).
        statsBothMeleeNodes: withAllocated([NODE_ID, NODE_MIGHT], () => playerStats._egComputePlayerStats().meleePhysIncPct),
        meleeWithBoth: withAllocated([NODE_ID, NODE_MIGHT], () => combat._egCalcPlayerMeleeDamage(1)),
        projWithMight: withAllocated([NODE_MIGHT], () => combat._egCalcPlayerDamage()),

        // Notable 20032 (Champion's Onslaught): three advertised lines.
        strBonus: withAllocated([NODE_ONSLAUGHT], () => leveling._egSyncBaseAttributes().str),
        strengthWithout: withAllocated([], () => playerStats._egComputePlayerStats().strength),
        strengthWith: withAllocated([NODE_ONSLAUGHT], () => playerStats._egComputePlayerStats().strength),
        healthWithout: withAllocated([], () => playerStats._egComputePlayerStats().health),
        healthWith: withAllocated([NODE_ONSLAUGHT], () => playerStats._egComputePlayerStats().health),
        attackSpeedPctWithout: withAllocated([], () => playerStats._egComputePlayerStats().attackSpeedPct),
        attackSpeedPctWith: withAllocated([NODE_ONSLAUGHT], () => playerStats._egComputePlayerStats().attackSpeedPct),
        intervalWithOnslaught: withAllocated([NODE_ONSLAUGHT], () => playerStats._egGetPlayerAttackIntervalBreakdown().interval),
        intervalWithOnslaughtAndTempo: withAllocated([NODE_ONSLAUGHT, NODE_TEMPO], () => playerStats._egGetPlayerAttackIntervalBreakdown().interval),
        attackSpeedSecondsWith: withAllocated([NODE_ONSLAUGHT], () => playerStats._egComputePlayerStats().attackSpeed),
        physIncPctWithout: withAllocated([], () => playerStats._egComputePlayerStats().physIncPct),
        physIncPctWith: withAllocated([NODE_ONSLAUGHT], () => playerStats._egComputePlayerStats().physIncPct),
        meleePhysIncPctWith: withAllocated([NODE_ONSLAUGHT], () => playerStats._egComputePlayerStats().meleePhysIncPct),
        projWithOnslaught: withAllocated([NODE_ONSLAUGHT], () => combat._egCalcPlayerDamage()),
        meleeWithOnslaught: withAllocated([NODE_ONSLAUGHT], () => combat._egCalcPlayerMeleeDamage(1)),

        // Node 30198 (Lesser Warrior's Wrath): third melee-only % node.
        bonusWrath: withAllocated([NODE_WRATH], () => leveling._egSyncBaseAttributes().meleePhysIncPct),
        statsWrath: withAllocated([NODE_WRATH], () => playerStats._egComputePlayerStats().meleePhysIncPct),
        meleeWithWrath: withAllocated([NODE_WRATH], () => combat._egCalcPlayerMeleeDamage(1)),
        projWithWrath: withAllocated([NODE_WRATH], () => combat._egCalcPlayerDamage()),
        // All three melee-damage small nodes allocated at once: 12 + 16 + 12.
        statsAllMeleeNodes: withAllocated([NODE_ID, NODE_MIGHT, NODE_WRATH], () => playerStats._egComputePlayerStats().meleePhysIncPct),
        meleeWithAllMeleeNodes: withAllocated([NODE_ID, NODE_MIGHT, NODE_WRATH], () => combat._egCalcPlayerMeleeDamage(1)),

        // Node 30197 (Lesser Champion's Tempo): percentage faster melee charge.
        chargeSpeedWithout: withAllocated([], () => playerStats._egComputePlayerStats().meleeChargeSpeedPct),
        chargeSpeedWith: withAllocated([NODE_TEMPO], () => playerStats._egComputePlayerStats().meleeChargeSpeedPct),
        intervalWithout: withAllocated([], () => playerStats._egGetPlayerAttackIntervalBreakdown().interval),
        intervalWith: withAllocated([NODE_TEMPO], () => playerStats._egGetPlayerAttackIntervalBreakdown().interval),
        // The charge speed must not touch the gear-driven absolute-seconds
        // attackSpeed bucket (gear keeps its own channel).
        attackSpeedWith: withAllocated([NODE_TEMPO], () => playerStats._egComputePlayerStats().attackSpeed),
    };
} finally {
    Math.random = prevRandom;
    globalThis._egEquipped = prevEquipped;
}

console.log(JSON.stringify(out));
process.exit(0);
