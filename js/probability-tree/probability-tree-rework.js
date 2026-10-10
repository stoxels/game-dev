import { TALENT_TREE_DATA } from './probability-tree-data.js';

// Only nodes WITHOUT an effects list live here: the three class start
// nodes. Every stat node is authored through the effects pipeline (below)
// and counts as reworked by definition.
export const PT_REWORKED_NODE_IDS = Object.freeze([1002, 1001, 1003]);

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
