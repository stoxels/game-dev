//------------------------------------------------------------------------
//-------------------ENDGAME ATLAS (POE-STYLE MAP GRAPH)------------------
//------------------------------------------------------------------------
// PoE-style atlas of the endgame map system, laid out like a classic
// two-continent atlas (faithful to the original Lua "Atlas of Azeroth"):
//   - 86 fixed map regions ("nodes") grouped into tiers 1..16
//   - Hand-authored node positions: an eastern and a western continent
//     (mirrored except for deliberate horizontal offsets that widen the
//     space around the centre), each winding from two tier-1 corner
//     regions inward to the four tier-16 pinnacle regions
//   - Hand-authored connection list: sparse linear paths per corner plus
//     same-tier links and cross-continent bridges at the high tiers
//   - Completing a node makes its connected maps available, so progress
//     flows along the paths towards the centre
//
// Every generated map item is stamped with an `atlasNodeId` so running it
// can be attributed to an atlas region. Completion state persists in
// STATE.egAtlasCompleted ({ nodeId: true }) and is saved together with the
// rest of the hub state via egSaveHubState().
//
// Legacy save compatibility: node ids are `atlas_t<tier>_<slot>` where
// slot is the index within the tier. The original region names keep their
// old slots (new regions are appended after them), so completed regions
// from saves made before the layout rework still resolve to the same map.
//
// Public API:
//   egAtlasNodeById(id)            — node lookup (null if unknown)
//   egAtlasIsCompleted(id)         — node already cleared?
//   egAtlasIsUnlocked(id)          — node reachable? (tier 1 or completed neighbour)
//   egAtlasPickNodeIdForTier(tier) — random node id of a tier, prefers unlocked
//   egAtlasDropNodeIds(id, isBoss) — PoE-style drop pool for kills in that node's map
//   egAtlasPickDropNodeId(id, isBoss) — pool pick; bosses favour the +1 climb
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

// Tier bands drive both the atlas colours (game rarity palette) and the
// difficulty a run must be finished on to clear the region:
//   tiers I–V   → uncommon (green)  → Easy
//   tiers VI–X  → rare     (blue)   → Normal
//   tiers XI–XVI→ epic     (purple) → Hard
const EG_ATLAS_TIER_BANDS = [
    { maxTier: 5,  rarity: 'uncommon', difficulty: 'easy' },
    { maxTier: 10, rarity: 'rare',     difficulty: 'normal' },
    { maxTier: 16, rarity: 'epic',     difficulty: 'hard' },
];

// Returns the tier band a tier belongs to.
function egAtlasTierBand(tier) {
    const t = Math.max(1, Math.min(EG_ATLAS_MAX_TIER, Math.round(tier || 1)));
    return EG_ATLAS_TIER_BANDS.find(b => t <= b.maxTier) || EG_ATLAS_TIER_BANDS[EG_ATLAS_TIER_BANDS.length - 1];
}

// Game difficulty ('easy' | 'normal' | 'hard') a region of this tier
// requires for its atlas clear.
function egAtlasTierDifficulty(tier) {
    return egAtlasTierBand(tier).difficulty;
}

// Map regions per tier: [nameEn, nameDe]. Array index = tier - 1.
// Counts follow the classic two-continent layout. NOTE: the first entries
// of every tier are the original regions in their original slot order —
// keep that order for save compatibility.
const EG_ATLAS_TIER_NAMES = [
    // ── Tier 1 — the four outer corners ──────────────────────────────
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
        ['Dispersion Downs', 'Streuungs-Weiden'],
        ['Histogram Highlands', 'Histogramm-Hochland'],
        ['Delta Dunes', 'Delta-Dünen'],
        ['Deviation Dales', 'Abweichungs-Täler'],
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
        ['Pearson Pass', 'Pearson-Pass'],
        ['Spearman Shoals', 'Spearman-Untiefen'],
        ['Kendall Key', 'Kendall-Riff'],
        ['Leverage Ledge', 'Hebel-Vorsprung'],
    ],
    // ── Tier 5 ───────────────────────────────────────────────────────
    [
        ['Hypothesis Hinterlands', 'Hypothesen-Hinterland'],
        ['Stochastic Stronghold', 'Stochastische Festung'],
        ['Entropy Excavation', 'Entropie-Ausgrabung'],
        ['Residual Ruins', 'Residuen-Ruinen'],
        ['P-Value Plateau', 'P-Wert-Plateau'],
        ['Confidence Coves', 'Konfidenz-Buchten'],
        ['Significance Sound', 'Signifikanz-Sund'],
        ['Posterior Peninsula', 'Posterior-Halbinsel'],
    ],
    // ── Tier 6 ───────────────────────────────────────────────────────
    [
        ['Quartile Quarry', 'Quartil-Steinbruch'],
        ['Covariance Caverns', 'Kovarianz-Höhlen'],
        ['Normality Nook', 'Normalitäts-Nische'],
        ['Interquartile Isles', 'Interquartil-Inseln'],
        ['Outlier Oasis', 'Ausreißer-Oase'],
        ['Z-Score Ziggurat', 'Z-Score-Ziggurat'],
    ],
    // ── Tier 7 ───────────────────────────────────────────────────────
    [
        ['Outpost of Odds', 'Außenposten der Chancen'],
        ['Skewness Summit', 'Schiefe-Gipfel'],
        ['Kurtosis Keep', 'Kurtosis-Festung'],
        ['Chebyshev Rampart', 'Tschebyschow-Wall'],
        ['Fat-Tail Fjord', 'Fettschwanz-Fjord'],
        ['Bayes Bastion', 'Bayes-Bastion'],
    ],
    // ── Tier 8 ───────────────────────────────────────────────────────
    [
        ['Moment Junction', 'Momenten-Knotenpunkt'],
        ['Monte Carlo Mines', 'Monte-Carlo-Minen'],
        ['Gibbs Grotto', 'Gibbs-Grotte'],
        ["Gambler's Gully", 'Schlucht des Spielers'],
        ['Rejection Reef', 'Ablehnungs-Riff'],
        ['Metropolis Haven', 'Metropolis-Hafen'],
        ['Cumulant Cliff', 'Kumulanten-Klippe'],
        ['Sampling Strait', 'Sampling-Sund'],
    ],
    // ── Tier 9 ───────────────────────────────────────────────────────
    [
        ['Null Hypothesis Void Pocket', 'Nullhypothesen-Leerenblase'],
        ['Distribution Den', 'Verteilungshöhle'],
        ['Alias Atoll', 'Alias-Atoll'],
        ['Stationary Shores', 'Stationäre Ufer'],
    ],
    // ── Tier 10 ──────────────────────────────────────────────────────
    [
        ['Markov Blanket Bazaar', 'Basar der Markow-Decke'],
        ['Ergodic Expanse', 'Ergodische Weite'],
        ['Aperiodic Abyss', 'Aperiodischer Abgrund'],
        ['Mixing Maze', 'Mischungs-Labyrinth'],
    ],
    // ── Tier 11 ──────────────────────────────────────────────────────
    [
        ['The Infinite Nexus', 'Der Unendliche Nexus'],
        ['Law of Large Numbers Landing', 'Landung der Großen Zahlen'],
        ['Glivenko Glacier', 'Glivenko-Gletscher'],
        ['Borel Bog', 'Borel-Moor'],
    ],
    // ── Tier 12 ──────────────────────────────────────────────────────
    [
        ['Central Limit Citadel', 'Zitadelle des Zentralen Grenzwerts'],
        ['Martingale Maw', 'Martingal-Maul'],
        ['Chernoff Chasm', 'Chernoff-Schlucht'],
        ['Hoeffding Hollows', 'Hoeffding-Mulden'],
    ],
    // ── Tier 13 ──────────────────────────────────────────────────────
    [
        ['Core of Convergence', 'Kern der Konvergenz'],
        ['Singularity Spiral', 'Singularitäts-Spirale'],
        ['Coupon Crater', 'Coupon-Krater'],
        ['Galton Gallery', 'Galton-Galerie'],
    ],
    // ── Tier 14 ──────────────────────────────────────────────────────
    [
        ['Vortex of Possibilities', 'Wirbel der Möglichkeiten'],
        ['Zenith of Chance', 'Zenit des Zufalls'],
        ['Ouroboros Orbit', 'Ouroboros-Orbit'],
        ['Fixed-Point Ford', 'Fixpunkt-Furt'],
    ],
    // ── Tier 15 ──────────────────────────────────────────────────────
    [
        ['The Final Theorem', 'Das Letzte Theorem'],
        ['Limit Lighthouse', 'Grenzwert-Leuchtturm'],
        ['Asymptote Anchorage', 'Asymptoten-Ankerplatz'],
        ["Cantor's Cape", 'Cantors Kap'],
        ['Measure-One Mesa', 'Mass-Eins-Mesa'],
        ['Epsilon Shore', 'Epsilon-Ufer'],
    ],
    // ── Tier 16 — the four pinnacle regions at the centre ────────────
    [
        ['Vortex of Possibilities: Overload', 'Wirbel der Möglichkeiten: Überladung'],
        ['The Final Null', 'Die Letzte Null'],
        ["Laplace's Demon", 'Laplaces Dämon'],
        ['The Absolute Inference', 'Die Absolute Inferenz'],
    ],
];

// Hand-authored node positions per tier, as offsets from the canvas
// centre ([x, y]), in the same order as the names above: the eastern
// continent first, then its western mirror. Layout tweaks vs the original
// mirrored grid:
//   - green/blue tiers (1-10) and the outer purple rows (11, 12, 14, 15):
//     pushed 50px further out per continent to open up the centre
//   - tier 13: kept at the original mirrored ±40 column
//   - tier 15 middle row (Limit Lighthouse / Measure-One Mesa): pulled
//     90px towards the centre so their wide labels clear the diagonal
//     neighbours' node squares (Asymptote Anchorage / Epsilon Shore)
//   - tier 16 pinnacles: untouched
const EG_ATLAS_TIER_POSITIONS = [
    /* T1 */ [[680, -300], [680, 300], [-680, -300], [-680, 300]],
    /* T2 */ [[580, 280], [665, 150], [665, -150], [580, -280], [-580, 280], [-665, 150], [-665, -150], [-580, -280]],
    /* T3 */ [[590, 190], [590, -190], [-590, 190], [-590, -190]],
    /* T4 */ [[620, 75], [680, 0], [560, 0], [620, -75], [-620, 75], [-680, 0], [-560, 0], [-620, -75]],
    /* T5 */ [[460, 180], [480, 50], [480, -50], [460, -180], [-460, 180], [-480, 50], [-480, -50], [-460, -180]],
    /* T6 */ [[380, 100], [410, 0], [380, -100], [-380, 100], [-410, 0], [-380, -100]],
    /* T7 */ [[420, 260], [310, -30], [420, -260], [-420, 260], [-310, -30], [-420, -260]],
    /* T8 */ [[325, 275], [280, 110], [280, -110], [325, -275], [-325, 275], [-280, 110], [-280, -110], [-325, -275]],
    /* T9 */ [[230, 192], [230, -192], [-230, 192], [-230, -192]],
    /* T10 */ [[180, 290], [180, -290], [-180, 290], [-180, -290]],
    /* T11 */ [[110, 255], [110, -255], [-110, 255], [-110, -255]],
    /* T12 */ [[145, 185], [145, -185], [-145, 185], [-145, -185]],
    /* T13 */ [[40, 150], [40, -150], [-40, 150], [-40, -150]],
    /* T14 */ [[180, 110], [180, -110], [-180, 110], [-180, -110]],
    /* T15 */ [[190, 50], [135, 0], [190, -50], [-190, 50], [-135, 0], [-190, -50]],
    /* T16 */ [[45, 40], [45, -40], [-45, 40], [-45, -40]],
];

// Slot offset between a continent and its mirror, per tier (array index
// = tier - 1). Half the tier's region count by construction.
const EG_ATLAS_TIER_MIRROR_OFFSET = [2, 4, 2, 4, 4, 3, 3, 4, 2, 2, 2, 2, 2, 2, 3, 2];


//------------------------------------------------------------------------
//-------------------GRAPH CONSTRUCTION-----------------------------------
//------------------------------------------------------------------------

// Flattened list of all atlas nodes:
//   { id, tier, slot, x, y, name, nameDe, links: [nodeId, ...] }
// x/y are offsets from the atlas centre, used directly by the atlas screen.
const EG_ATLAS_NODES = [];

function _egLinkAtlasNodes(a, b) {
    if (!a || !b || a === b) return;
    if (!a.links.includes(b.id)) a.links.push(b.id);
    if (!b.links.includes(a.id)) b.links.push(a.id);
}

// Hand-authored connections of the eastern continent as
// [tierA, slotA, tierB, slotB]. Same-tier links chain neighbouring
// regions; cross-tier links form the linear paths from the corners
// towards the centre. The western continent mirrors every entry.
const EG_ATLAS_EK_LINKS = [
    // ── same tier ────────────────────────────────────────────────────
    [4, 0, 4, 1], [4, 0, 4, 2], [4, 1, 4, 2], [4, 1, 4, 3], [4, 2, 4, 3],
    [5, 0, 5, 1], [5, 1, 5, 2], [5, 2, 5, 3],
    [6, 0, 6, 1], [6, 1, 6, 2],
    [8, 0, 8, 1], [8, 2, 8, 3],
    [15, 0, 15, 1], [15, 1, 15, 2],
    [16, 0, 16, 1],
    // ── one tier to the next ─────────────────────────────────────────
    [1, 0, 2, 2], [1, 0, 2, 3], [1, 1, 2, 0], [1, 1, 2, 1],
    [2, 0, 3, 0], [2, 1, 3, 0], [2, 2, 3, 1], [2, 3, 3, 1],
    [3, 0, 4, 0], [3, 1, 4, 3],
    [4, 0, 5, 0], [4, 0, 5, 1], [4, 2, 5, 1], [4, 2, 5, 2], [4, 3, 5, 2], [4, 3, 5, 3],
    [5, 0, 6, 0], [5, 1, 6, 0], [5, 1, 6, 1], [5, 2, 6, 1], [5, 2, 6, 2], [5, 3, 6, 2],
    [6, 0, 7, 0], [6, 1, 7, 1], [6, 2, 7, 1], [6, 2, 7, 2],
    [7, 0, 8, 0], [7, 0, 8, 1], [7, 1, 8, 1], [7, 1, 8, 2], [7, 2, 8, 3],
    [8, 0, 9, 0], [8, 1, 9, 0], [8, 2, 9, 1], [8, 3, 9, 1],
    [9, 0, 10, 0], [9, 1, 10, 1],
    [10, 0, 11, 0], [10, 1, 11, 1],
    [11, 0, 12, 0], [11, 1, 12, 1],
    [12, 0, 13, 0], [12, 1, 13, 1],
    [13, 0, 14, 0], [13, 1, 14, 1],
    [14, 0, 15, 0], [14, 1, 15, 2],
    [15, 0, 16, 0], [15, 2, 16, 1], [15, 1, 16, 0], [15, 1, 16, 1],
];

// Bridges between the two continents (same-tier pairs facing each other,
// and the fully cross-linked pinnacle cluster).
const EG_ATLAS_BRIDGE_LINKS = [
    [10, 2, 10, 0], [10, 3, 10, 1],
    [11, 2, 11, 0], [11, 3, 11, 1],
    [12, 2, 12, 0], [12, 3, 12, 1],
    [13, 2, 13, 0], [13, 3, 13, 1],
    [14, 2, 14, 0], [14, 3, 14, 1],
    [16, 2, 16, 0], [16, 2, 16, 1], [16, 3, 16, 0], [16, 3, 16, 1],
];

(function _egBuildAtlasGraph() {
    const rows = [];

    EG_ATLAS_TIER_NAMES.forEach((names, ti) => {
        const tier = ti + 1;
        const positions = EG_ATLAS_TIER_POSITIONS[ti] || [];
        const row = names.map(([name, nameDe], si) => {
            const pos = positions[si] || [0, 0];
            const node = {
                id: `atlas_t${tier}_${si}`,
                tier,
                slot: si,
                x: pos[0],
                y: pos[1],
                name,
                nameDe,
                difficulty: egAtlasTierDifficulty(tier),
                links: [],
            };
            EG_ATLAS_NODES.push(node);
            return node;
        });
        rows.push(row);
    });

    const addLink = (ta, sa, tb, sb) => {
        const a = (rows[ta - 1] || [])[sa];
        const b = (rows[tb - 1] || [])[sb];
        _egLinkAtlasNodes(a, b);
    };

    // Eastern continent + its western mirror.
    EG_ATLAS_EK_LINKS.forEach(([ta, sa, tb, sb]) => {
        addLink(ta, sa, tb, sb);
        addLink(ta, sa + EG_ATLAS_TIER_MIRROR_OFFSET[ta - 1], tb, sb + EG_ATLAS_TIER_MIRROR_OFFSET[tb - 1]);
    });

    // Cross-continent bridges.
    EG_ATLAS_BRIDGE_LINKS.forEach(([ta, sa, tb, sb]) => addLink(ta, sa, tb, sb));
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

// PoE-style map-drop pool for kills inside the given region's map.
//   normal kill:  the active region itself, every LINKED region of the
//                 same or a lower tier, plus every COMPLETED region whose
//                 tier is at most the active tier (a completed map drops
//                 from any map at or above its own tier, anywhere on the
//                 atlas)//    boss kill:    the same pool, plus linked regions exactly one tier
//                 HIGHER — bosses are the only source that climbs the
//                 atlas (this is how higher tiers are first reached)
// Returns an array of node ids, or null for unknown nodes.
function egAtlasDropNodeIds(activeNodeId, isBoss) {
    const active = egAtlasNodeById(activeNodeId);
    if (!active) return null;

    const cap = active.tier + (isBoss ? 1 : 0);
    const pool = [active.id];
    const seen = new Set(pool);

    // Linked regions (same-tier chain links and adjacent-tier links).
    active.links.forEach(linkId => {
        const other = egAtlasNodeById(linkId);
        if (other && other.tier <= cap && !seen.has(linkId)) {
            seen.add(linkId);
            pool.push(linkId);
        }
    });

    // Completed regions of the same or a lower tier drop everywhere at or
    // above their own tier. Stale ids from older layouts resolve to null
    // and are skipped.
    const completed = (typeof STATE !== 'undefined' && STATE.egAtlasCompleted) || {};
    Object.keys(completed).forEach(id => {
        if (!completed[id]) return;
        const other = egAtlasNodeById(id);
        if (other && other.tier <= active.tier && !seen.has(id)) {
            seen.add(id);
            pool.push(id);
        }
    });

    return pool;
}

// Bonus per completed atlas region for the independent adjacent-map drop
// (PoE-style atlas bonus): every completed region grants +1% chance that
// finishing a map awards one extra adjacent-region map on top of all
// regular drops. No cap needed (86 regions max = 86% max).
const EG_ATLAS_ADJACENT_BONUS_PER_MAP = 0.01;

// Number of atlas regions currently marked as completed.
function egAtlasCompletedCount() {
    if (typeof STATE === 'undefined' || !STATE.egAtlasCompleted) return 0;
    let n = 0;
    for (const id in STATE.egAtlasCompleted) {
        if (STATE.egAtlasCompleted[id] && egAtlasNodeById(id)) n++;
    }
    return n;
}

// Independent extra-drop chance (0..1) for the adjacent-map atlas bonus.
// Must be read AFTER _egAtlasOnMapCompleted() so a fresh first clear
// already counts towards the bonus of the run that earned it.
function egAtlasAdjacentBonusChance() {
    return egAtlasCompletedCount() * EG_ATLAS_ADJACENT_BONUS_PER_MAP;
}

// Whole-percent display value of the adjacent-map atlas bonus.
function egAtlasAdjacentBonusPercent() {
    return Math.round(egAtlasAdjacentBonusChance() * 100);
}

// Picks the region an atlas-bonus drop comes from: a node LINKED to
// (adjacent on the atlas graph) the just-completed run's region. Climb
// priority: when linked regions exactly one tier HIGHER exist that are not
// yet completed, the bonus targets one of those — so the stacking bonus is
// an alternate climb path beside boss kills and works on higher tiers too.
// Otherwise a uniform random linked region (same/lower sustain, or an
// already-completed +1). Falls back to the active region itself when it has
// no links / is unknown, and to a same-tier unlocked region when there is
// no active run at all.
function egAtlasPickAdjacentBonusNodeId(activeNodeId) {
    const active = activeNodeId ? egAtlasNodeById(activeNodeId) : null;
    if (active && Array.isArray(active.links) && active.links.length > 0) {
        const linked = active.links.filter(id => egAtlasNodeById(id));
        if (linked.length > 0) {
            // Links only ever span one tier by construction, so "higher"
            // always means exactly +1.
            const climb = linked.filter(id => {
                const n = egAtlasNodeById(id);
                return n && n.tier > active.tier && !egAtlasIsCompleted(id);
            });
            const pool = (climb.length > 0) ? climb : linked;
            return pool[Math.floor(Math.random() * pool.length)];
        }
        return active.id;
    }
    if (active) return active.id;
    if (typeof egAtlasPickNodeIdForTier === 'function') {
        return egAtlasPickNodeIdForTier(1);
    }
    return null;
}

// Share of boss drops that target a linked region exactly one tier higher
// (the atlas-climb path) when such regions exist and are not completed
// yet. The rest of the pool — the active region itself, linked same/lower
// tier regions and completed regions — shares the remaining weight, so
// boss kills still sustain the current tier most of the time.
const EG_ATLAS_BOSS_CLIMB_DROP_SHARE = 0.55;

// Picks a random atlas node id from the PoE-style drop pool. Boss kills
// are biased toward the +1-tier climb regions so reaching the next tier
// feels deliberate instead of a lucky uniform roll: EG_ATLAS_BOSS_CLIMB_DROP_SHARE
// of all boss drops target the climb, the rest come from the remaining
// pool (climb regions excluded so the split stays honest). Normal kills
// pick uniformly.
function egAtlasPickDropNodeId(activeNodeId, isBoss) {
    const pool = egAtlasDropNodeIds(activeNodeId, isBoss);
    if (!pool || pool.length === 0) return null;
    if (!isBoss) return pool[Math.floor(Math.random() * pool.length)];

    const active = egAtlasNodeById(activeNodeId);
    const climb = (active && active.tier < EG_ATLAS_MAX_TIER)
        ? pool.filter(id => {
            const n = egAtlasNodeById(id);
            return n && n.tier === active.tier + 1 && !egAtlasIsCompleted(id);
        })
        : [];
    if (climb.length > 0 && Math.random() < EG_ATLAS_BOSS_CLIMB_DROP_SHARE) {
        return climb[Math.floor(Math.random() * climb.length)];
    }
    // Fallback: the pool WITHOUT the climb regions (so the climb share is
    // exactly EG_ATLAS_BOSS_CLIMB_DROP_SHARE, not inflated by the uniform
    // roll also landing on them).
    const rest = pool.filter(id => !climb.includes(id));
    const source = (rest.length > 0) ? rest : pool;
    return source[Math.floor(Math.random() * source.length)];
}


//------------------------------------------------------------------------
//-------------------REGION CHAIN BLUEPRINTS------------------------------
//------------------------------------------------------------------------
// Every atlas region has a DETERMINISTIC puzzle-chain blueprint, derived
// purely from its id via a seeded PRNG: the same region always plays the
// same chain (story/generated mix, generator flavour, fixed boss), while
// different regions roll different blueprints. Map modifiers layer on top
// (extra puzzles / questions) without reshuffling the base chain.

// FNV-1a string hash → 32-bit seed.
function egAtlasChainSeed(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}

// mulberry32 seeded PRNG factory — small, fast, deterministic.
function egAtlasMakeRng(seed) {
    let a = (seed || 0) >>> 0;
    return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Chain flavours — each region deterministically rolls one, giving maps
// distinct personalities: some are generated-grid heavy, some lean on the
// classic story puzzles, some are pure sigil riddles.
const EG_ATLAS_CHAIN_FLAVORS = [
    { id: 'generated',  genShare: 0.85, genMode: 'mixed'   }, // mostly generated grids
    { id: 'sigils',     genShare: 0.70, genMode: 'symbol'  }, // symbol riddles
    { id: 'story',      genShare: 0.30, genMode: 'mixed'   }, // classic puzzle levels
    { id: 'balanced',   genShare: 0.55, genMode: 'mixed'   },
    { id: 'stochastic', genShare: 0.60, genMode: 'random'  }, // stochastic structures
];

// Builds the deterministic chain blueprint for a node (null when unknown).
//   { chainSeed, flavorId, genMode, genShare, bossId, stepSources }
// stepSources holds 24 'gen' | 'story' entries — enough for the base
// objectives (2–6 puzzles, see egMapBasePuzzlesForTier) plus fully modified
// runs (≤20 puzzles); runs
// consume the first N steps, so adding mods never reshuffles earlier steps.
function egAtlasChainBlueprint(node) {
    if (!node) return null;
    const seed = egAtlasChainSeed(node.id + '|' + node.tier);
    const rng = egAtlasMakeRng(seed);

    const flavor = EG_ATLAS_CHAIN_FLAVORS[Math.floor(rng() * EG_ATLAS_CHAIN_FLAVORS.length)];

    // One fixed boss per region — the map's own boss, fought in the arena
    // after the chain (like PoE's per-map bosses). The roster in
    // js/endgame/bosses/boss-rosters.js assigns each region its specific
    // boss (easy fights low, brutal fights at the pinnacle).
    const bossIds = (typeof EG_BOSS_DEFS !== 'undefined') ? Object.keys(EG_BOSS_DEFS) : [];
    // Always consume the roll so the PRNG stream — and therefore every
    // region's chain flavour and step sources — stays exactly as before,
    // whether or not the roster overrides the result.
    const rolledBossId = bossIds.length > 0 ? bossIds[Math.floor(rng() * bossIds.length)] : null;
    const bossId = (typeof EG_ATLAS_REGION_BOSSES !== 'undefined' && node && EG_ATLAS_REGION_BOSSES[node.id])
        ? EG_ATLAS_REGION_BOSSES[node.id]
        : rolledBossId;

    const stepSources = [];
    for (let i = 0; i < 24; i++) {
        stepSources.push(rng() < flavor.genShare ? 'gen' : 'story');
    }

    return {
        chainSeed: seed,
        flavorId: flavor.id,
        genMode: flavor.genMode,
        genShare: flavor.genShare,
        bossId,
        stepSources,
    };
}

// Blueprint for a map item (resolves its atlas region; null outside the atlas).
function egAtlasChainBlueprintForMap(mapItem) {
    if (!mapItem) return null;
    let node = null;
    if (mapItem.atlasNodeId) node = egAtlasNodeById(mapItem.atlasNodeId);
    if (!node && typeof _egAtlasResolveNodeForMap === 'function') {
        try { node = _egAtlasResolveNodeForMap(mapItem); } catch (e) { node = null; }
    }
    return egAtlasChainBlueprint(node);
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
//
// Completion gate: the region only counts as cleared when the run was
// finished on the region's own difficulty (its tier band: I–V Easy,
// VI–X Normal, XI–XVI Hard). Runs finished on any other difficulty keep
// all their loot but do NOT clear the atlas region.
// Returns { node, firstClear, newlyUnlocked } or null when there was
// nothing to record.
function _egAtlasOnMapCompleted(mapItem) {
    const node = _egAtlasResolveNodeForMap(mapItem);
    if (!node) return null;

    if (typeof STATE === 'undefined') return null;

    // Difficulty gate — the player's selected game difficulty (applies to
    // every map run) must exactly match the region's required difficulty.
    const runDiff = (typeof curDiff !== 'undefined' && curDiff) ? curDiff : 'normal';
    if (runDiff !== node.difficulty) {
        showToast(t('eg_atlas_diff_req_toast')
            .replace('{n}', egAtlasNodeName(node))
            .replace('{d}', t('diff_' + node.difficulty)), '#e07b7b');
        return { node, firstClear: false, newlyUnlocked: [], diffDenied: true };
    }

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

    // Endgame achievements — atlas progress
    if (typeof trackAchStat === 'function' && firstClear) {
        try {
            const prog = (typeof egAtlasProgress === 'function') ? egAtlasProgress() : null;
            if (prog) {
                if (typeof setAchStat === 'function') {
                    setAchStat('egAtlasRegions', prog.completed);
                    setAchStat('egAtlasHighestTier', prog.highestTier);
                }
            } else {
                trackAchStat('egAtlasRegions', 1);
            }
            if (node.tier === 16) trackAchStat('egAtlasPinnacle', 1);
        } catch (e) {}
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
