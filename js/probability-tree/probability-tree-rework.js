export const PT_REWORKED_NODE_IDS = Object.freeze([31217, 31244, 1002, 31211, 31212]);

export function isPassiveTreeNodeReworked(id) {
    return PT_REWORKED_NODE_IDS.includes(id);
}
