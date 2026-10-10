import { TALENT_TREE_DATA } from './probability-tree-data.js';

export const PT_REWORKED_NODE_IDS = Object.freeze([31217, 31244, 1002, 1001, 1003, 31211, 31212, 31213, 31214, 31215, 31216, 256, 355, 31242, 31241, 31239, 31243, 133, 31240, 31474, 31219, 31209, 31237, 31238, 31478, 31479, 134, 31220, 31236, 31477, 130, 20174, 31480, 20175, 110, 31230, 31235, 31234, 31232, 31233, 30192, 30193, 30363, 30196, 30195, 30194, 30197, 30198, 20032, 30516, 20036, 20033]);

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
