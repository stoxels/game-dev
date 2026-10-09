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
const NODE_ID = 30195;

function withAllocated(ids, fn) {
    const prev = STATE.passiveTreeAllocated;
    STATE.passiveTreeAllocated = ids;
    try { return fn(); } finally { STATE.passiveTreeAllocated = prev; }
}

const prevRandom = Math.random;
const prevEquipped = globalThis._egEquipped;
Math.random = () => 0; // deterministic: always roll the range minimum
globalThis._egEquipped = {
    weapon1: { slotType: 'weapon', damage: { min: 100, max: 150 }, mods: [], implicits: [] },
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
    };
} finally {
    Math.random = prevRandom;
    globalThis._egEquipped = prevEquipped;
}

console.log(JSON.stringify(out));
process.exit(0);
