//  endgame-mod-tables-weapon-2h.js
//  Split out of endgame-mod-tables.js 2026-09-10 (Pass 3).
//  Slot modifier table(s) — data only, no logic.
//  Load order matters only for endgame-mod-tables-rebalance.js,
//  which evals every EG_MOD_TABLE_* at load time — it MUST load last.
//
//------------------------------------------------------------------------
//-------------------TWO-HANDED MELEE MODIFIER TABLE----------------------
//------------------------------------------------------------------------
// PoE-style: 2H weapons roll the same families as 1H but hit ~45% harder on
// flat damage (physical + elemental) and ~25% harder on % increased physical.
// Attack speed / crit / accuracy / status / cleave pools are unchanged, so a
// 2H weapon feels like a bigger version of a 1H — not a different item class.
const EG_MOD_TABLE_WEAPON_2H = (() => {
    const clone = JSON.parse(JSON.stringify(EG_MOD_TABLE_WEAPON1));
    const scaleTierList = (tiers, factor) => {
        for (const tr of tiers) {
            for (const k of ['min', 'max', 'min1', 'max1', 'min2', 'max2']) {
                if (typeof tr[k] === 'number') tr[k] = Math.round(tr[k] * factor * 10) / 10;
            }
        }
    };
    const FLAT_2H = 1.45, INC_2H = 1.25;
    try {
        const p = clone.prefixes || {};
        if (p.flat_physical_damage) scaleTierList(p.flat_physical_damage.tiers, FLAT_2H);
        if (p.inc_physical_damage) scaleTierList(p.inc_physical_damage.tiers, INC_2H);
        for (const id of ['fire_damage', 'cold_damage', 'lightning_damage', 'shadow_damage']) {
            if (p[id]) scaleTierList(p[id].tiers, FLAT_2H);
        }
    } catch (e) {}
    // 2H is pure offense: strip the 1H-exclusive parry suffix (cloned above).
    try { if (clone.suffixes && clone.suffixes.parry) delete clone.suffixes.parry; } catch (e) {}
    return clone;
})();

