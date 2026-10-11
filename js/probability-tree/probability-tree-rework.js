import { TALENT_TREE_DATA } from './probability-tree-data.js';

// Only nodes WITHOUT an effects list live here: the three class start
// nodes. Every stat node is authored through the effects pipeline (below)
// and counts as reworked by definition.
export const PT_REWORKED_NODE_IDS = Object.freeze([1002, 1001, 1003, 20104, 30848, 30849, 30115, 30117, 31193, 31194, 20022, 20019, 176, 30147, 30148, 20024, 34, 30121, 30122, 31182, 31181, 31180, 6, 20214, 20025, 31174, 30134, 30135, 30140, 31175, 30937, 30936, 30935, 30934, 20118, 30973, 30972, 30963, 30964, 30960, 30961, 30962, 30770, 30768, 30769, 30761, 30771, 12, 20123, 31010, 30980, 30981, 30982, 20171, 196, 2, 167, 309, 101, 20133, 30991, 30992, 30994, 30993, 30995, 30772]);

// Nodes authored through the effects pipeline (pt-effects.js) are reworked
// BY DEFINITION - their channels and both localised descriptions come from
// the registry, which is exactly the "fully wired" contract the manual list
// tracks. Building the set lazily keeps module init order irrelevant and
// costs one pass over the node array on first use.
let _effectsReworkedIds = null;
function _effectReworkedIdSet() {
    if (!_effectsReworkedIds) {
        _effectsReworkedIds = new Set(
            (TALENT_TREE_DATA?.nodes || [])
                .filter(node => Array.isArray(node.effects) && node.effects.length > 0)
                .map(node => Number(node.id))
        );
    }
    return _effectsReworkedIds;
}

export function isPassiveTreeNodeReworked(id) {
    return PT_REWORKED_NODE_IDS.includes(id) || _effectReworkedIdSet().has(Number(id));
}

// Progress of the tree-wide rework for the counter in the passive tree top
// bar: how many nodes are reworked out of all nodes in the tree data.
export function getPassiveTreeReworkProgress() {
    const nodes = TALENT_TREE_DATA?.nodes || [];
    let done = 0;
    for (const node of nodes) if (isPassiveTreeNodeReworked(node.id)) done++;
    return { done, total: nodes.length };
}

// PoE-port review overlay. While a batch of nodes is waiting for the
// owner's approval, each one has an entry here describing the Path of
// Exile 1 original and the planned Stoxels effect. The tree draws these
// nodes with a BLUE marker and the tooltip shows both texts. The map is
// emptied again as soon as a batch is approved and implemented, so a
// published game never carries pending proposals. Presentation only: it
// does not change allocation, stats or the reworked status.
//   id -> { poe: { name, stats: [...] },
//           plan: { name, lines: [...] | [], note? } }
// An empty `lines` array means "deliberately left empty for now" (a PoE
// mechanic the game does not have yet - reserved for future puzzle work).
export const PT_REWORK_PROPOSALS = Object.freeze({});

export function getPassiveTreeNodeProposal(id) {
    return PT_REWORK_PROPOSALS[Number(id)] || null;
}
