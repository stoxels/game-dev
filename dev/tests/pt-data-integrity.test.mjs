// Passive-tree data integrity: the node table, the connection graph and the
// passive-tree -> gameplay bonus maps in endgame-leveling.js must stay in
// sync (a renamed/removed statKey silently stops granting its bonus).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TALENT_TREE_DATA } from '../../js/probability-tree/probability-tree-data.js';
import { PT_REWORKED_NODE_IDS } from '../../js/probability-tree/probability-tree-rework.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const nodes = TALENT_TREE_DATA.nodes;
const VALID_TIERS = new Set(['small', 'notable', 'travel', 'keystone', 'start']);

test('node ids are unique', () => {
    const ids = nodes.map(n => n.id);
    assert.equal(new Set(ids).size, ids.length, 'duplicate node ids in TALENT_TREE_DATA');
});

test('every node carries complete display data', () => {
    for (const n of nodes) {
        assert.ok(Number.isFinite(n.id), `node missing id: ${JSON.stringify(n).slice(0, 120)}`);
        assert.ok(typeof n.statKey === 'string' && n.statKey.length > 0, `node ${n.id} has no statKey`);
        assert.ok(VALID_TIERS.has(n.tier), `node ${n.id} has invalid tier: ${n.tier}`);
        assert.ok(typeof n.nameEn === 'string' && n.nameEn.length > 0, `node ${n.id} missing nameEn`);
        assert.ok(typeof n.nameDe === 'string' && n.nameDe.length > 0, `node ${n.id} missing nameDe`);
        assert.ok(typeof n.descEn === 'string' && n.descEn.length > 0, `node ${n.id} missing descEn`);
        assert.ok(typeof n.descDe === 'string' && n.descDe.length > 0, `node ${n.id} missing descDe`);
        assert.ok(typeof n.icon === 'string', `node ${n.id} icon must be a string ("" = art deferred, never an emoji literal)`);
    }
});

test('every connection endpoint exists', () => {
    const ids = new Set(nodes.map(n => n.id));
    for (const c of TALENT_TREE_DATA.connections) {
        assert.ok(ids.has(c.from), `connection ${c.id} references missing node ${c.from}`);
        assert.ok(ids.has(c.to), `connection ${c.id} references missing node ${c.to}`);
    }
});

test('PT_REWORKED_NODE_IDS only references real nodes', () => {
    const ids = new Set(nodes.map(n => n.id));
    for (const id of PT_REWORKED_NODE_IDS) {
        assert.ok(ids.has(id), `PT_REWORKED_NODE_IDS contains unknown node ${id}`);
    }
    assert.equal(new Set(PT_REWORKED_NODE_IDS).size, PT_REWORKED_NODE_IDS.length, 'duplicate ids in PT_REWORKED_NODE_IDS');
});

// The three bonus maps are read by _egGetPassiveTreeTravelBonuses() to grant
// real stats. A key that no longer exists in the tree grants nothing, so the
// maps must only mention statKeys that are actually present.
test('every passive-tree bonus map key maps to a real node statKey', () => {
    const statKeys = new Set(nodes.map(n => n.statKey));
    const src = fs.readFileSync(path.join(ROOT, 'js', 'endgame', 'endgame-leveling.js'), 'utf8');
    const maps = [
        '_EG_PASSIVE_TREE_TRAVEL_BONUSES',
        '_EG_PASSIVE_TREE_NOTABLE_BONUSES',
        '_EG_PASSIVE_TREE_SMALL_BONUSES',
    ];
    for (const name of maps) {
        const start = src.indexOf(`const ${name} = {`);
        assert.notEqual(start, -1, `${name} not found in endgame-leveling.js`);
        const end = src.indexOf('\n};', start);
        assert.notEqual(end, -1, `${name} closing brace not found`);
        const body = src.slice(start, end);
        const keys = [...body.matchAll(/^\s{4}([A-Za-z_][\w]*)\s*:/gm)].map(m => m[1]);
        assert.ok(keys.length > 0, `${name} parsed no keys`);
        for (const key of keys) {
            assert.ok(statKeys.has(key), `${name} references statKey "${key}" that no node grants`);
        }
    }
});
