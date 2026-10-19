import { TALENT_TREE_DATA } from './probability-tree-data.js';

// Only nodes WITHOUT an effects list live here: the three class start
// nodes, deliberately reserved empty nodes, and the 84 CLASS-WHEEL nodes
// (ids 36-89 and 41001-41078: the three god keystones, their gear, cooldown
// and ability notables, the 30 class-wheel extension notables and the 48
// ascendency wheel notables 41031-41078). The wheel nodes are bespoke puzzle-class mechanics wired by
// stat key (ptHasSkill) in js/classes/, so they keep hand-written EN/DE text.
// Every other stat node is authored through the effects pipeline (below)
// and counts as reworked by definition.
export const PT_REWORKED_NODE_IDS = Object.freeze([1002, 1001, 1003, 31193, 31194, 20166, 30245, 107, 146, 193, 233, 239, 242, 244, 257, 314, 318, 319, 325, 363, 379, 391, 20017, 20027, 20028, 20048, 20053, 20060, 20169, 20170, 20185, 20188, 20189, 20190, 20191, 20198, 20205, 20227, 20228, 20234, 30079, 30091, 30092, 30141, 30233, 30234, 30336, 30337, 30389, 30390, 30600, 30601, 30701, 30702, 30705, 30706, 30877, 30878, 30945, 31037, 31038, 31062, 31063, 31160, 31161, 31272, 31273, 31287, 31288, 31346, 31349, 31350, 31392, 31397, 31398, 31424, 31425, 31429, 326, 347, 20049, 30275, 30276, 108, 20078, 30246, 160, 162, 220, 264, 265, 289, 290, 293, 333, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 41001, 41002, 41003, 41004, 41005, 41006, 41007, 41008, 41009, 41010, 41011, 41012, 41013, 41014, 41015, 41016, 41017, 41018, 41019, 41020, 41021, 41022, 41023, 41024, 41025, 41026, 41027, 41028, 41029, 41030, 41031, 41032, 41033, 41034, 41035, 41036, 41037, 41038, 41039, 41040, 41041, 41042, 41043, 41044, 41045, 41046, 41047, 41048, 41049, 41050, 41051, 41052, 41053, 41054, 41055, 41056, 41057, 41058, 41059, 41060, 41061, 41062, 41063, 41064, 41065, 41066, 41067, 41068, 41069, 41070, 41071, 41072, 41073, 41074, 41075, 41076, 41077, 41078, 41101, 41102, 41103, 41104, 41105, 41106, 41107, 41108, 41109, 41110, 41111, 41112, 41113, 41114, 41115, 41116, 41117, 41118, 41119, 41120, 41121, 41122, 41123, 41124, 41125, 41126, 41127, 41128, 41129, 41130, 41131, 41132, 41133, 41134, 41135, 41136, 41137, 41138, 41139, 41140, 41141, 41142, 41143, 41144, 41145, 41146, 41147, 41148, 41149, 41150, 41151, 41152, 41153, 41154, 41155, 41156, 41157, 41158, 41159, 41160, 41161, 41162, 41163, 41164, 41165, 41166, 41167, 41168, 41169, 41170, 41171, 41172, 41173, 41174, 41175]);

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


// ARPG-port review overlay. While a batch of nodes is waiting for the
// owner's approval, each one has an entry here describing the original
// design and the planned Stoxels effect. The tree draws these
// nodes with a BLUE marker and the tooltip shows both texts. The map is
// emptied again as soon as a batch is approved and implemented, so a
// published game never carries pending proposals. Presentation only: it
// does not change allocation, stats or the reworked status.
//   id -> { reference: { name, stats: [...] },
//           plan: { name, lines: [...] | [], note? } }
// An empty `lines` array means "deliberately left empty for now" (a genre
// mechanic the game does not have yet - reserved for future puzzle work).
export const PT_REWORK_PROPOSALS = Object.freeze({});

export function getPassiveTreeNodeProposal(id) {
    return PT_REWORK_PROPOSALS[Number(id)] || null;
}
