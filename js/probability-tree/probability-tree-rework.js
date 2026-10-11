import { TALENT_TREE_DATA } from './probability-tree-data.js';

// Only nodes WITHOUT an effects list live here: the three class start
// nodes. Every stat node is authored through the effects pipeline (below)
// and counts as reworked by definition.
export const PT_REWORKED_NODE_IDS = Object.freeze([1002, 1001, 1003, 30115, 30117, 31193, 31194, 20022, 20019, 30147, 30148, 34, 30121, 30122, 31182, 31181, 31180, 6, 20214, 20025, 31174, 30134, 30135, 30140, 31175, 30973, 30972, 30963, 30964, 30961, 30962, 20123, 31010, 30980, 30981, 30982, 20171, 196, 2, 20150, 150, 30731, 30151, 30150, 30719, 30717, 30718, 20166, 30715, 30716, 30714, 30245, 31027, 31028, 31140, 31141, 26, 107, 119, 128, 139, 144, 146, 174, 189, 193, 215, 233, 235, 239, 242, 244, 245, 257, 303, 314, 315, 318, 319, 325, 332, 342, 359, 363, 379, 389, 391, 20017, 20027, 20028, 20048, 20053, 20057, 20060, 20080, 20081, 20082, 20085, 20128, 20141, 20159, 20161, 20168, 20169, 20170, 20176, 20177, 20180, 20185, 20188, 20189, 20190, 20191, 20198, 20204, 20205, 20227, 20228, 20234, 20235, 30075, 30076, 30077, 30078, 30079, 30087, 30088, 30089, 30090, 30091, 30092, 30093, 30094, 30095, 30096, 30098, 30136, 30137, 30138, 30139, 30141, 30142, 30143, 30226, 30227, 30233, 30234, 30320, 30321, 30322, 30336, 30337, 30359, 30360, 30361, 30386, 30387, 30388, 30389, 30390, 30391, 30392, 30426, 30427, 30428, 30429, 30444, 30445, 30446, 30447, 30456, 30457, 30489, 30491, 30532, 30533, 30571, 30594, 30595, 30600, 30601, 30662, 30663, 30689, 30690, 30691, 30701, 30702, 30703, 30704, 30705, 30706, 30707, 30877, 30878, 30945, 30946, 30947, 31015, 31016, 31017, 31018, 31019, 31020, 31021, 31022, 31037, 31038, 31045, 31062, 31063, 31079, 31080, 31084, 31085, 31091, 31092, 31126, 31127, 31133, 31134, 31135, 31136, 31137, 31138, 31139, 31142, 31160, 31161, 31227, 31228, 31272, 31273, 31276, 31277, 31278, 31279, 31280, 31281, 31282, 31286, 31287, 31288, 31346, 31347, 31348, 31349, 31350, 31351, 31352, 31356, 31357, 31359, 31360, 31361, 31362, 31363, 31392, 31393, 31394, 31395, 31396, 31397, 31398, 31410, 31417, 31423, 31424, 31425, 31427, 31428, 31429, 31453, 31454, 31456, 31457, 31458, 31459, 31460, 31462, 31466, 31467, 31468, 31469, 96, 326, 347, 20049, 20069, 20094, 30224, 30225, 30275, 30276, 30288, 30289, 30290, 30291, 30530, 30531, 30534, 30535, 30536, 30563, 108, 117, 283, 20046, 20078, 20088, 20092, 20130, 20196, 20203, 20229, 30246, 30264, 30265, 30345, 30732, 31081, 31082]);

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
