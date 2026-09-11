//  endgame-mod-tables-rebalance.js
//  Split out of endgame-mod-tables.js 2026-09-10 (Pass 3).
//  Post-load attribute affix rebalance — evals every EG_MOD_TABLE_*.
//  Load order matters only for endgame-mod-tables-rebalance.js,
//  which evals every EG_MOD_TABLE_* at load time — it MUST load last.
//
//========================================================================
//-------------------ATTRIBUTE AFFIX REBALANCE (2026)---------------------
//========================================================================
// For 100 lvl / 5 pts: gear str/agi/int was 43-50 T1 (~+60% of top pure req).
// Rebalanced to T1 30-35 (~+40%) so gear supplements but doesn't trivialize.
// Applied as post-load mutation so all tables stay in one place.
(() => {
    const FACTOR = 0.70;
    const FAMS = new Set(['strength','agility','intelligence']);
    const ALL_TABLES = [];
    // Collect every EG_MOD_TABLE_* already defined on window
    const names = ['HEAD','EARRING','AMULET','SHOULDERS','CLOAK','CHEST','BRACERS','GLOVES','BELT','PANTS','BOOTS','RING','ARCANE','TALISMAN','WEAPON1','WEAPON2','SHIELD','RANGED'];
    for (const n of names) {
        const key = 'EG_MOD_TABLE_' + n;
        try { const t = eval(key); if (t) ALL_TABLES.push(t); } catch(e) {}
    }
    for (const tbl of ALL_TABLES) {
        if (!tbl) continue;
        for (const sec of [tbl.prefixes, tbl.suffixes]) {
            if (!sec) continue;
            for (const [fid, fam] of Object.entries(sec)) {
                if (!FAMS.has(fid)) continue;
                for (const tier of (fam.tiers || [])) {
                    if (tier.min != null) tier.min = Math.max(1, Math.round(tier.min * FACTOR));
                    if (tier.max != null) tier.max = Math.max(tier.min || 1, Math.round(tier.max * FACTOR));
                }
            }
        }
    }
})();
