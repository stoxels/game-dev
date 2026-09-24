export const PASSIVE_TREE_LAYOUT_VERSION = 1;

const LAYOUT_START_ID = 1;
const LAYOUT_SCALE = 1.8;
const LAYOUT_MIN_EDGE = 84;
const LAYOUT_NODE_GAP = 12;
const LAYOUT_ITERATIONS = 180;
const LAYOUT_ANCHOR = 0.035;
const LAYOUT_MAX_STEP = 32;
const LAYOUT_CELL_SIZE = 180;
const INNER_CIRCLE_SCALE = 0.7;
const INNER_CIRCLE_APPROACH_RADIUS = 700;
const INNER_CIRCLE_APPROACH_ANGLE = 65;
const INNER_CIRCLE_HUB_IDS = Object.freeze([55, 72, 88]);
const INNER_CIRCLE_HUB_ANGLES = Object.freeze([240, 0, 120]);
const LAYOUT_CLEANUP_ITERATIONS = 160;
const LAYOUT_ROUND_SAFETY = 1.5;
const LAYOUT_RADII = Object.freeze({
    start: 61.6,
    keystone: 33,
    notable: 28.6,
    travel: 17.6,
    small: 16.5,
});
const CLASS_START_IDS = new Set([1001, 1002, 1003]);

function layoutRadius(node) {
    return LAYOUT_RADII[node && node.tier] || LAYOUT_RADII.notable;
}

function innerCircleLayoutScale(node, nodesById) {
    if (node.id === LAYOUT_START_ID) return 1;
    if (CLASS_START_IDS.has(node.id)) return LAYOUT_SCALE;

    let nearest = null;
    for (let i = 0; i < INNER_CIRCLE_HUB_IDS.length; i++) {
        const hub = nodesById.get(INNER_CIRCLE_HUB_IDS[i]);
        if (!hub) continue;
        const distance = Math.hypot(Number(node.x) - Number(hub.x), Number(node.y) - Number(hub.y));
        if (distance > INNER_CIRCLE_APPROACH_RADIUS) continue;
        const angle = Math.atan2(Number(node.x), -Number(node.y)) * 180 / Math.PI;
        const wanted = INNER_CIRCLE_HUB_ANGLES[i];
        const angularDistance = Math.abs(((angle - wanted + 540) % 360) - 180);
        if (angularDistance > INNER_CIRCLE_APPROACH_ANGLE) continue;
        const score = distance + angularDistance * 8;
        if (!nearest || score < nearest.score) nearest = { distance, score };
    }
    if (!nearest) return LAYOUT_SCALE;

    const t = Math.max(0, Math.min(1,
        (nearest.distance - 250) / (INNER_CIRCLE_APPROACH_RADIUS - 250)));
    const smoothT = t * t * (3 - 2 * t);
    return INNER_CIRCLE_SCALE + (LAYOUT_SCALE - INNER_CIRCLE_SCALE) * smoothT;
}

function enforceLayoutConstraints(xs, ys, radii, fixed, edgePairs) {
    const count = xs.length;
    const minimumGap = LAYOUT_NODE_GAP + LAYOUT_ROUND_SAFETY;
    const minimumEdge = LAYOUT_MIN_EDGE + LAYOUT_ROUND_SAFETY;

    for (let iteration = 0; iteration < LAYOUT_CLEANUP_ITERATIONS; iteration++) {
        const grid = new Map();
        for (let i = 0; i < count; i++) {
            const cellX = Math.floor(xs[i] / LAYOUT_CELL_SIZE);
            const cellY = Math.floor(ys[i] / LAYOUT_CELL_SIZE);
            const key = `${cellX}:${cellY}`;
            const bucket = grid.get(key);
            if (bucket) bucket.push(i);
            else grid.set(key, [i]);
        }

        for (let i = 0; i < count; i++) {
            const cellX = Math.floor(xs[i] / LAYOUT_CELL_SIZE);
            const cellY = Math.floor(ys[i] / LAYOUT_CELL_SIZE);
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const bucket = grid.get(`${cellX + dx}:${cellY + dy}`);
                    if (!bucket) continue;
                    for (const j of bucket) {
                        if (j <= i) continue;
                        let deltaX = xs[j] - xs[i];
                        let deltaY = ys[j] - ys[i];
                        let distance = Math.hypot(deltaX, deltaY);
                        const required = radii[i] + radii[j] + minimumGap;
                        if (distance >= required) continue;
                        if (distance < 0.001) {
                            const angle = (i * 2.399963 + j * 0.7) % (Math.PI * 2);
                            deltaX = Math.cos(angle);
                            deltaY = Math.sin(angle);
                            distance = 1;
                        }
                        const push = (required - distance) * 0.51;
                        const unitX = deltaX / distance;
                        const unitY = deltaY / distance;
                        if (!fixed[i] && !fixed[j]) {
                            xs[i] -= unitX * push;
                            ys[i] -= unitY * push;
                            xs[j] += unitX * push;
                            ys[j] += unitY * push;
                        } else if (!fixed[i]) {
                            xs[i] -= unitX * push * 2;
                            ys[i] -= unitY * push * 2;
                        } else if (!fixed[j]) {
                            xs[j] += unitX * push * 2;
                            ys[j] += unitY * push * 2;
                        }
                    }
                }
            }
        }

        for (const [from, to] of edgePairs) {
            let deltaX = xs[to] - xs[from];
            let deltaY = ys[to] - ys[from];
            let distance = Math.hypot(deltaX, deltaY);
            const required = Math.max(minimumEdge, radii[from] + radii[to] + minimumGap);
            if (distance >= required) continue;
            if (distance < 0.001) {
                const angle = (from * 2.399963 + to * 0.7) % (Math.PI * 2);
                deltaX = Math.cos(angle);
                deltaY = Math.sin(angle);
                distance = 1;
            }
            const push = (required - distance) * 0.51;
            const unitX = deltaX / distance;
            const unitY = deltaY / distance;
            if (!fixed[from] && !fixed[to]) {
                xs[from] -= unitX * push;
                ys[from] -= unitY * push;
                xs[to] += unitX * push;
                ys[to] += unitY * push;
            } else if (!fixed[from]) {
                xs[from] -= unitX * push * 2;
                ys[from] -= unitY * push * 2;
            } else if (!fixed[to]) {
                xs[to] += unitX * push * 2;
                ys[to] += unitY * push * 2;
            }
        }
    }
}

export function relaxPassiveTreeLayout(nodes, connections) {
    if (!Array.isArray(nodes) || nodes.length < 2) return nodes;

    const count = nodes.length;
    const indexById = new Map(nodes.map((node, index) => [node.id, index]));
    const nodesById = new Map(nodes.map(node => [node.id, node]));
    const xs = new Float64Array(count);
    const ys = new Float64Array(count);
    const targetXs = new Float64Array(count);
    const targetYs = new Float64Array(count);
    const radii = new Float64Array(count);
    const fixed = new Uint8Array(count);

    nodes.forEach((node, index) => {
        const scale = innerCircleLayoutScale(node, nodesById);
        const x = Number(node.x) * scale;
        const y = Number(node.y) * scale;
        xs[index] = x;
        ys[index] = y;
        targetXs[index] = x;
        targetYs[index] = y;
        radii[index] = layoutRadius(node);
        fixed[index] = node.id === LAYOUT_START_ID || CLASS_START_IDS.has(node.id) ? 1 : 0;
    });

    const edgePairs = [];
    if (Array.isArray(connections)) {
        connections.forEach(connection => {
            const from = indexById.get(connection && connection.from);
            const to = indexById.get(connection && connection.to);
            if (from === undefined || to === undefined || from === to) return;
            edgePairs.push([from, to]);
        });
    }

    for (let iteration = 0; iteration < LAYOUT_ITERATIONS; iteration++) {
        const forceX = new Float64Array(count);
        const forceY = new Float64Array(count);
        const grid = new Map();

        for (let i = 0; i < count; i++) {
            const cellX = Math.floor(xs[i] / LAYOUT_CELL_SIZE);
            const cellY = Math.floor(ys[i] / LAYOUT_CELL_SIZE);
            const key = `${cellX}:${cellY}`;
            const bucket = grid.get(key);
            if (bucket) bucket.push(i);
            else grid.set(key, [i]);
        }

        for (let i = 0; i < count; i++) {
            const cellX = Math.floor(xs[i] / LAYOUT_CELL_SIZE);
            const cellY = Math.floor(ys[i] / LAYOUT_CELL_SIZE);
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const bucket = grid.get(`${cellX + dx}:${cellY + dy}`);
                    if (!bucket) continue;
                    for (const j of bucket) {
                        if (j <= i) continue;
                        let deltaX = xs[j] - xs[i];
                        let deltaY = ys[j] - ys[i];
                        let distance = Math.hypot(deltaX, deltaY);
                        const required = radii[i] + radii[j] + LAYOUT_NODE_GAP;
                        if (distance >= required) continue;
                        if (distance < 0.001) {
                            const angle = (i * 2.399963 + j * 0.7) % (Math.PI * 2);
                            deltaX = Math.cos(angle);
                            deltaY = Math.sin(angle);
                            distance = 1;
                        }
                        const push = (required - distance) * 0.5;
                        const unitX = deltaX / distance;
                        const unitY = deltaY / distance;
                        if (!fixed[i]) {
                            forceX[i] -= unitX * push;
                            forceY[i] -= unitY * push;
                        }
                        if (!fixed[j]) {
                            forceX[j] += unitX * push;
                            forceY[j] += unitY * push;
                        }
                    }
                }
            }
        }

        for (const [from, to] of edgePairs) {
            let deltaX = xs[to] - xs[from];
            let deltaY = ys[to] - ys[from];
            let distance = Math.hypot(deltaX, deltaY);
            if (distance >= LAYOUT_MIN_EDGE) continue;
            if (distance < 0.001) {
                const angle = (from * 2.399963 + to * 0.7) % (Math.PI * 2);
                deltaX = Math.cos(angle);
                deltaY = Math.sin(angle);
                distance = 1;
            }
            const push = (LAYOUT_MIN_EDGE - distance) * 0.5;
            const unitX = deltaX / distance;
            const unitY = deltaY / distance;
            if (!fixed[from]) {
                forceX[from] -= unitX * push;
                forceY[from] -= unitY * push;
            }
            if (!fixed[to]) {
                forceX[to] += unitX * push;
                forceY[to] += unitY * push;
            }
        }

        for (let i = 0; i < count; i++) {
            if (fixed[i]) continue;
            let stepX = forceX[i];
            let stepY = forceY[i];
            const stepLength = Math.hypot(stepX, stepY);
            if (stepLength > LAYOUT_MAX_STEP) {
                const stepScale = LAYOUT_MAX_STEP / stepLength;
                stepX *= stepScale;
                stepY *= stepScale;
            }
            const nextX = xs[i] + stepX;
            const nextY = ys[i] + stepY;
            xs[i] = nextX * (1 - LAYOUT_ANCHOR) + targetXs[i] * LAYOUT_ANCHOR;
            ys[i] = nextY * (1 - LAYOUT_ANCHOR) + targetYs[i] * LAYOUT_ANCHOR;
        }
    }

    enforceLayoutConstraints(xs, ys, radii, fixed, edgePairs);

    return nodes.map((node, index) => ({
        ...node,
        x: Math.round(xs[index]),
        y: Math.round(ys[index]),
    }));
}

function hashLayoutText(text, seed) {
    let hash = seed >>> 0;
    for (let i = 0; i < text.length; i += 1) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 16777619) >>> 0;
    }
    return hash >>> 0;
}

export function passiveTreeLayoutFingerprint(nodes, connections) {
    const geometry = JSON.stringify({
        nodes: (Array.isArray(nodes) ? nodes : []).map(node => [node.id, node.x, node.y, node.tier || '']),
        connections: (Array.isArray(connections) ? connections : []).map(connection => [connection.from, connection.to]),
    });
    const first = hashLayoutText(geometry, 2166136261).toString(16).padStart(8, '0');
    const second = hashLayoutText(geometry, 3339675911).toString(16).padStart(8, '0');
    return first + second;
}

export function isPassiveTreeLayoutCacheValid(data) {
    const cache = data && data.precomputedLayout;
    if (!cache || cache.version !== PASSIVE_TREE_LAYOUT_VERSION || !Array.isArray(cache.positions)) return false;
    if (!Array.isArray(data.nodes) || cache.positions.length !== data.nodes.length) return false;
    if (cache.fingerprint !== passiveTreeLayoutFingerprint(data.nodes, data.connections)) return false;

    const ids = new Set();
    for (const position of cache.positions) {
        if (!Array.isArray(position) || position.length !== 3) return false;
        const [id, x, y] = position;
        if (!Number.isInteger(id) || ids.has(id) || !Number.isFinite(x) || !Number.isFinite(y)) return false;
        ids.add(id);
    }
    return data.nodes.every(node => ids.has(node.id));
}

export function precomputePassiveTreeLayoutData(data) {
    if (isPassiveTreeLayoutCacheValid(data)) {
        return { ...data, precomputedLayout: data.precomputedLayout };
    }
    const layoutNodes = relaxPassiveTreeLayout(data.nodes, data.connections);
    return {
        ...data,
        precomputedLayout: {
            version: PASSIVE_TREE_LAYOUT_VERSION,
            fingerprint: passiveTreeLayoutFingerprint(data.nodes, data.connections),
            positions: layoutNodes.map(node => [node.id, node.x, node.y]),
        },
    };
}

export function resolvePassiveTreeLayout(data) {
    if (!isPassiveTreeLayoutCacheValid(data)) {
        return relaxPassiveTreeLayout(data.nodes, data.connections);
    }
    const positions = new Map(data.precomputedLayout.positions.map(position => [position[0], position]));
    return data.nodes.map(node => {
        const position = positions.get(node.id);
        return { ...node, x: position[1], y: position[2] };
    });
}
