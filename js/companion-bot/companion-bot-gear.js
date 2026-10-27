//------------------------------------------------------------------------
//-------------------COMPANION BOT GEAR------------------------------------
//------------------------------------------------------------------------
// The weapon and shield each summoned friend carries, getting better as the
// player's story moves on (so the friends "progress" too). Plain data and
// pure functions: the sprite code turns a loadout into drawn gear through the
// game's gear overlay system (js/sprite/gear_overlays.js). Every id is a base
// item that already has art and tuned grips for all three heroes.
//
// Stox is the melee fighter (sword and shield, later a heavy greatsword), Trix
// the caster (wand and ward, later staves) and Syla a one-hand fighter (axe
// or sword and shield; her reveal shots come from her fills, not from a bow).

//------------------------------------------------------------------------
// CONSTANTS
//------------------------------------------------------------------------

// World progress (number of the highest world finished) at which each of the
// five gear stages starts. Stage 3 starts after world 8, when the ascendency is chosen.
export const BOT_GEAR_WORLDS = [0, 3, 6, 8, 11];

// One loadout per stage: { main, off? } where `off` is a shield id. A
// two-handed main weapon has no off hand.
const GEAR = {
    stox: [
        { main: 'wpn_1h_1', off: 'shield_str_1' },
        { main: 'wpn_1h_3', off: 'shield_str_2' },
        { main: 'wpn_1h_4', off: 'shield_str_3' },
        { main: 'wpn_2h_1' },
        { main: 'wpn_2h_4' },
    ],
    trix: [
        { main: 'wpn_int_1', off: 'shield_int_1' },
        { main: 'wpn_int_3', off: 'shield_int_2' },
        { main: 'wpn_int_2' },
        { main: 'wpn_int_4' },
        { main: 'wpn_int_5', off: 'shield_int_4' },
    ],
    syla: [
        { main: 'wpn_1h_2', off: 'shield_str_1' },
        { main: 'wpn_1h_5', off: 'shield_str_2' },
        { main: 'wpn_1h_6', off: 'shield_str_3' },
        { main: 'wpn_1h_7', off: 'shield_str_5' },
        { main: 'wpn_1h_8', off: 'shield_str_8' },
    ],
};

// Weapons held in two hands (so nothing is drawn in the off hand).
const TWO_HANDED = new Set(['wpn_2h_1', 'wpn_2h_4', 'wpn_int_2', 'wpn_int_4']);

//------------------------------------------------------------------------
// ENTRY POINTS
//------------------------------------------------------------------------

// Number of the highest world the player has finished (0 when none), read
// from the Ascension Trial and Trial records in the save ('asc_6', 'trial_6').
export function highestWorldFinished(state) {
    let best = 0;
    for (const list of [state && state.ascensionTrialsDone, state && state.trialsDone]) {
        if (!Array.isArray(list)) continue;
        for (const id of list) {
            const n = Number(String(id).match(/(\d+)$/)?.[1]);
            if (Number.isFinite(n) && n > best) best = n;
        }
    }
    return best;
}

// Gear stage 0-4 for a number of finished worlds.
export function botGearStage(worldsFinished) {
    let stage = 0;
    BOT_GEAR_WORLDS.forEach((from, i) => { if (worldsFinished >= from) stage = i; });
    return stage;
}

// The loadout a friend carries at a gear stage, in the shape the gear
// overlay system reads: { mainId, offId, offRole, mode }. Null for an unknown hero.
export function botLoadout(heroId, stage) {
    const rows = GEAR[heroId];
    if (!rows) return null;
    const row = rows[Math.max(0, Math.min(rows.length - 1, stage))];
    if (TWO_HANDED.has(row.main)) return { mainId: row.main, offId: null, offRole: null, mode: '2h' };
    if (row.off) return { mainId: row.main, offId: row.off, offRole: 'shield', mode: '1h' };
    return { mainId: row.main, offId: null, offRole: null, mode: 'main' };
}
