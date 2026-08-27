//------------------------------------------------------------------------
//-------------------ENDGAME ATLAS (POE-STYLE MAP GRAPH)------------------
//------------------------------------------------------------------------
// PoE-style atlas of the endgame map system:
//   - 45 fixed map regions ("nodes") grouped into tiers 1..16
//   - Nodes are connected to same-tier neighbours and to nodes of the
//     next tier — completing a node makes its connected maps available
//   - Tier 16 holds a single pinnacle region with the hardest monsters
//
// Every generated map item is stamped with an `atlasNodeId` so running it
// can be attributed to an atlas region. Completion state persists in
// STATE.egAtlasCompleted ({ nodeId: true }) and is saved together with the
// rest of the hub state via egSaveHubState().
//
// Public API:
//   egAtlasNodeById(id)            — node lookup (null if unknown)
//   egAtlasIsCompleted(id)         — node already cleared?
//   egAtlasIsUnlocked(id)          — node reachable? (tier 1 or completed neighbour)
//   egAtlasPickNodeIdForTier(tier) — random node id of a tier, prefers unlocked
//   egAtlasAllowedDropTiers(id)    — tiers droppable while inside that node's map
//   egAtlasProgress()              — { completed, total, highestTier }
//   _egAtlasOnMapCompleted(map)    — completion hook (called from _egEndMap)
//
// Load order: this file runs BEFORE endgame-maps.js / endgame-hub.js, so no
// top-level code may touch their symbols — everything below only uses LANG,
// STATE and its own data at load time.
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//-------------------CONFIGURATION----------------------------------------
//------------------------------------------------------------------------

const EG_ATLAS_MAX_TIER = 16;

// Map regions per tier: [nameEn, nameDe]. Array index = tier - 1.
// Counts per tier intentionally shrink toward the pinnacle so the late
// atlas funnels into a single tier-16 challenge region.
const EG_ATLAS_TIER_NAMES = [
    // ── Tier 1 ───────────────────────────────────────────────────────
    [
        ['Gaussian Grasslands', 'Gaußsche Graslande'],
        ['Variance Valley', 'Varianztal'],
        ['Frequency Fields', 'Frequenzfelder'],
        ['Sampling Savanna', 'Sampling-Savanne'],
    ],
    // ── Tier 2 ───────────────────────────────────────────────────────
    [
        ['Median Meadows', 'Median-Wiesen'],
        ['Percentile Plains', 'Perzentil-Ebenen'],
        ['Bootstrap Basin', 'Bootstrap-Becken'],
        ['Random Ridge', 'Zufallsrücken'],
    ],
    // ── Tier 3 ───────────────────────────────────────────────────────
    [
        ['Bayesian Bayou', 'Bayes-Bucht'],
        ['Markov Marsh', 'Markow-Sumpf'],
        ['Poisson Ponds', 'Poisson-Teiche'],
        ['Binomial Bluffs', 'Binomial-Klippen'],
    ],
    // ── Tier 4 ───────────────────────────────────────────────────────
    [
        ['Regression Rift', 'Regressions-Rift'],
        ['Correlation Canyon', 'Korrelations-Canyon'],
        ['Likelihood Lagoon', 'Likelihood-Lagune'],
        ['Estimator Estates', 'Schätzer-Güter'],
    ],
    // ── Tier 5 ───────────────────────────────────────────────────────
    [
        ['Hypothesis Hinterlands', 'Hypothesen-Hinterland'],
        ['Stochastic Stronghold', 'Stochastische Festung'],
        ['Entropy Excavation', 'Entropie-Ausgrabung'],
        ['Residual Ruins', 'Residuen-Ruinen'],
    ],
    // ── Tier 6 ───────────────────────────────────────────────────────
    [
        ['Quartile Quarry', 'Quartil-Steinbruch'],
        ['Covariance Caverns', 'Kovarianz-Höhlen'],
        ['Normality Nook', 'Normalitäts-Nische'],
    ],
    // ── Tier 7 ───────────────────────────────────────────────────────
    [
        ['Outpost of Odds', 'Außenposten der Chancen'],
        ['Skewness Summit', 'Schiefe-Gipfel'],
        ['Kurtosis Keep', 'Kurtosis-Festung'],
    ],
    // ── Tier 8 ───────────────────────────────────────────────────────
    [
        ['Moment Junction', 'Momenten-Knotenpunkt'],
        ['Monte Carlo Mines', 'Monte-Carlo-Minen'],
        ['Gibbs Grotto', 'Gibbs-Grotte'],
    ],
    // ── Tier 9 ───────────────────────────────────────────────────────
    [
        ['Null Hypothesis Void Pocket', 'Nullhypothesen-Leerenblase'],
        ['Distribution Den', 'Verteilungshöhle'],
        ['Alias Atoll', 'Alias-Atoll'],
    ],
    // ── Tier 10 ──────────────────────────────────────────────────────
    [
        ['Markov Blanket Bazaar', 'Basar der Markow-Decke'],
        ['Ergodic Expanse', 'Ergodische Weite'],
        ['Aperiodic Abyss', 'Aperiodischer Abgrund'],
    ],
    // ── Tier 11 ──────────────────────────────────────────────────────
    [
        ['The Infinite Nexus', 'Der Unendliche Nexus'],
        ['Law of Large Numbers Landing', 'Landung der Großen Zahlen'],
    ],
    // ── Tier 12 ──────────────────────────────────────────────────────
    [
        ['Central Limit Citadel', 'Zitadelle des Zentralen Grenzwerts'],
        ['Martingale Maw', 'Martingal-Maul'],
    ],
    // ── Tier 13 ──────────────────────────────────────────────────────
    [
        ['Core of Convergence', 'Kern der Konvergenz'],
        ['Singularity Spiral', 'Singularitäts-Spirale'],
    ],
    // ── Tier 14 ──────────────────────────────────────────────────────
    [
        ['Vortex of Possibilities', 'Wirbel der Möglichkeiten'],
        ['Zenith of Chance', 'Zenit des Zufalls'],
    ],
    // ── Tier 15 ──────────────────────────────────────────────────────
    [
        ['The Final Theorem', 'Das Letzte Theorem'],
    ],
    // ── Tier 16 — pinnacle ───────────────────────────────────────────
    [
        ['Vortex of Possibilities: Overload', 'Wirbel der Möglichkeiten: Überladung'],
    ],
];


//------------------------------------------------------------------------
//-------------------GRAPH CONSTRUCTION-----------------------------------
//------------------------------------------------------------------------

// Flattened list of all atlas nodes:
//   { id, tier, slot, name, nameDe, links: [nodeId, ...] }
const EG_ATLAS_NODES = [];

function _egLinkAtlasNodes(a, b) {
    if (!a || !b || a === b) return;
    if (!a.links.includes(b.id)) a.links.push(b.id);
    if (!b.links.includes(a.id)) b.links.push(a.id);
}

(function _egBuildAtlasGraph() {
    let prevRow = [];
    EG_ATLAS_TIER_NAMES.forEach((names, ti) => {
        const tier = ti + 1;
        const row = names.map(([name, nameDe], si) => {
            const node = {
                id: `atlas_t${tier}_${si}`,
                tier,
                slot: si,
                name,
                nameDe,
                links: [],
            };
            EG_ATLAS_NODES.push(node);
            return node;
        });

        // Chain same-tier neighbours horizontally.
        for (let i = 0; i < row.length - 1; i++) {
            _egLinkAtlasNodes(row[i], row[i + 1]);
        }

        // Connect every node of this tier to nearby nodes of the previous
        // tier. The proportional index mapping keeps the graph tidy when
        // row lengths shrink towards the higher tiers.
        if (prevRow.length > 0) {
            row.forEach((node, si) => {
                const srcIdx = prevRow.length === 1
                    ? 0
                    : Math.round(si * (prevRow.length - 1) / Math.max(1, row.length - 1));
                const sources = new Set([srcIdx]);
                if (srcIdx > 0) sources.add(srcIdx - 1);
                if (srcIdx < prevRow.length - 1) sources.add(srcIdx + 1);
                sources.forEach(i2 => _egLinkAtlasNodes(prevRow[i2], node));
            });
        }

        prevRow = row;
    });
})();

const EG_ATLAS_NODE_BY_ID = (() => {
    const m = new Map();
    EG_ATLAS_NODES.forEach(n => m.set(n.id, n));
    return m;
})();


//------------------------------------------------------------------------
//-------------------LOOKUP + STATUS HELPERS------------------------------
//------------------------------------------------------------------------

function egAtlasNodeById(id) {
    return EG_ATLAS_NODE_BY_ID.get(id) || null;
}

function egAtlasIsCompleted(id) {
    return !!(typeof STATE !== 'undefined' && STATE.egAtlasCompleted && STATE.egAtlasCompleted[id]);
}

// A node is reachable when it sits in tier 1 or when ANY connected node has
// been completed (links only exist between equal / adjacent tiers).
function egAtlasIsUnlocked(id) {
    const node = egAtlasNodeById(id);
    if (!node) return false;
    if (node.tier <= 1) return true;
    return node.links.some(linkId => egAtlasIsCompleted(linkId));
}

// Highest tier with at least one completed node (0 when nothing cleared yet).
function egAtlasHighestCompletedTier() {
    if (typeof STATE === 'undefined' || !STATE.egAtlasCompleted) return 0;
    let highest = 0;
    for (const id in STATE.egAtlasCompleted) {
        const node = egAtlasNodeById(id);
        if (node && STATE.egAtlasCompleted[id] && node.tier > highest) {
            highest = node.tier;
        }
    }
    return highest;
}

function egAtlasProgress() {
    let completed = 0;
    for (const id in (STATE.egAtlasCompleted || {})) {
        if (STATE.egAtlasCompleted[id] && egAtlasNodeById(id)) completed++;
    }
    return {
        completed,
        total: EG_ATLAS_NODES.length,
        highestTier: egAtlasHighestCompletedTier(),
    };
}


//------------------------------------------------------------------------
//-------------------MAP DROP INTEGRATION---------------------------------
//------------------------------------------------------------------------

// Picks a random atlas node id of the given tier. Prefers currently
// unlocked regions so dropped maps stay runnable; falls back to any node
// of that tier. Returns null for invalid tiers.
function egAtlasPickNodeIdForTier(tier) {
    const clamped = Math.max(1, Math.min(EG_ATLAS_MAX_TIER, Math.round(tier || 1)));
    const all = EG_ATLAS_NODES.filter(n => n.tier === clamped);
    if (all.length === 0) return null;
    const unlocked = all.filter(n => egAtlasIsUnlocked(n.id));
    const pool = (unlocked.length > 0) ? unlocked : all;
    return pool[Math.floor(Math.random() * pool.length)].id;
}

// Localized display name of a node.
function egAtlasNodeName(node) {
    if (!node) return '';
    return (typeof LANG !== 'undefined' && LANG === 'de') ? node.nameDe : node.name;
}

// Tiers whose maps can drop while playing inside the given node's map:
// the node's own tier plus the tiers of all directly connected regions
// (by construction: own tier ± 1). Returns null for unknown nodes so the
// caller can fall back to unrestricted rolling.
function egAtlasAllowedDropTiers(nodeId) {
    const node = egAtlasNodeById(nodeId);
    if (!node) return null;
    const tiers = new Set([node.tier]);
    node.links.forEach(linkId => {
        const other = egAtlasNodeById(linkId);
        if (other) tiers.add(other.tier);
    });
    return [...tiers].sort((a, b) => a - b);
}


//------------------------------------------------------------------------
//-------------------COMPLETION-------------------------------------------
//------------------------------------------------------------------------

// Persists the atlas completion state through the shared save pipeline.
function _egAtlasPersist() {
    if (typeof egSaveHubState === 'function') egSaveHubState();
    else if (typeof save === 'function') save();
}

// Resolves the atlas node a completed map run belongs to. Prefers the
// stamped `atlasNodeId`; legacy maps (created before the atlas system)
// have none, so fall back to a name match against the region list and
// finally to any region of the map's tier. Returns null only when the
// map item itself is unusable.
function _egAtlasResolveNodeForMap(mapItem) {
    if (!mapItem) return null;
    if (mapItem.atlasNodeId) {
        const stamped = egAtlasNodeById(mapItem.atlasNodeId);
        if (stamped) return stamped;
    }
    const name = mapItem.baseName || '';
    if (name) {
        const byName = EG_ATLAS_NODES.find(n =>
            n.name === name || n.nameDe === name ||
            n.name.startsWith(name) || name.startsWith(n.name) ||
            n.nameDe.startsWith(name) || name.startsWith(n.nameDe));
        // Legacy band names covered several tiers (e.g. tiers 1-4); only
        // trust the match when the tier also lines up.
        if (byName && (mapItem.mapTier == null || byName.tier === mapItem.mapTier)) return byName;
    }
    if (mapItem.mapTier != null) {
        const pickedId = egAtlasPickNodeIdForTier(mapItem.mapTier);
        return pickedId ? egAtlasNodeById(pickedId) : null;
    }
    return null;
}

// Marks the atlas node belonging to a successfully completed map run as
// cleared and unlocks its connected regions. Called from _egEndMap()
// (endgame-encounter-chain.js) while _egActiveMapItem is still set.
// Returns { node, firstClear, newlyUnlocked } or null when there was nothing to record.
function _egAtlasOnMapCompleted(mapItem) {
    const node = _egAtlasResolveNodeForMap(mapItem);
    if (!node) return null;

    if (typeof STATE === 'undefined') return null;
    if (!STATE.egAtlasCompleted) STATE.egAtlasCompleted = {};

    const firstClear = !STATE.egAtlasCompleted[node.id];
    const wasUnlocked = {};
    node.links.forEach(l => { wasUnlocked[l] = egAtlasIsUnlocked(l); });

    STATE.egAtlasCompleted[node.id] = true;

    // Freshly reached regions (cap the spam on dense rows).
    const newlyUnlocked = node.links
        .filter(l => !wasUnlocked[l] && egAtlasIsUnlocked(l))
        .slice(0, 3);

    if (firstClear) {
        showToast(t('eg_atlas_completed_toast')
            .replace('{n}', egAtlasNodeName(node)), '#f5d98a');

        newlyUnlocked.forEach(l => {
            showToast(t('eg_atlas_unlocked_toast')
                .replace('{n}', `${egAtlasNodeName(egAtlasNodeById(l))} (${t('eg_map_tier_tt').replace('{n}', egAtlasNodeById(l).tier)})`), '#7fd67f');
        });
    }

    _egAtlasPersist();

    // Notify the Inference quest system — atlas tier completion quests check
    // STATE.egAtlasCompleted live via _atlasTierCheck(). Trigger a ledger
    // evaluation so a just-completed tier auto-claims immediately (banner +
    // 2 Convergence Points) without requiring an extra level/event.
    if (typeof updateQuestStats === 'function') {
        try { updateQuestStats('atlasTierCompleted', { nodeId: node.id, tier: node.tier }); } catch (e) {}
    }

    return { node, firstClear, newlyUnlocked };
}
