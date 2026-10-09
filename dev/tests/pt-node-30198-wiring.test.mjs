// Node 30198 (Lesser Warrior's Wrath, +12% melee physical damage) full rework:
//   1. data shape - new name/EN-DE stats/own statKey/icon "" (art deferred),
//   2. retired-key audit - 30198 was the LAST node holding the old shared
//      small_lesser_moment_reserves key, so the key must now be gone from the
//      tree with no consumer referencing it,
//   3. real gameplay wiring - boots the actual game (generated entry.mjs)
//      headless in a child process (shared probe with the other node tests).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TALENT_TREE_DATA } from '../../js/probability-tree/probability-tree-data.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const NODE_ID = 30198;
const NEW_KEY = 'small_lesser_warrior_s_wrath';
const OLD_KEY = 'small_lesser_moment_reserves';
const node = TALENT_TREE_DATA.nodes.find(n => n.id === NODE_ID);

test('node 30198 reworked: Lesser Warrior\'s Wrath, +12% melee physical damage', () => {
    assert.ok(node, 'node 30198 missing from TALENT_TREE_DATA');
    assert.notEqual(node.nameEn, 'Lesser Moment Reserves', 'old name still present');
    assert.equal(node.nameEn, "Lesser Warrior's Wrath");
    assert.equal(node.nameDe, 'Zorn des Kriegers (klein)');
    assert.equal(node.statKey, NEW_KEY, 'node must carry its own new statKey');
    assert.equal(node.icon, '', 'art is deferred - icon must be "" (never an emoji)');
    assert.equal(node.descEn, '+12% increased melee physical damage.');
    assert.equal(node.descDe, '+12% physischer Nahkampfschaden.');
    assert.ok(!node.descEn.includes('\n') && !node.descDe.includes('\n'), 'one stat per line only');
    assert.equal(node.tier, 'small');
    const holders = TALENT_TREE_DATA.nodes.filter(n => n.statKey === NEW_KEY).map(n => n.id);
    assert.deepEqual(holders, [NODE_ID], `statKey ${NEW_KEY} must belong to node 30198 alone`);
});

test('old shared statKey fully retired from the tree, no consumer left', () => {
    const oldKeyHolders = TALENT_TREE_DATA.nodes.filter(n => n.statKey === OLD_KEY).map(n => n.id);
    assert.deepEqual(oldKeyHolders, [], `old statKey ${OLD_KEY} must be gone: still on ${oldKeyHolders}`);

    const offenders = [];
    const walk = (dir) => {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
            const p = path.join(dir, e.name);
            if (e.isDirectory()) walk(p);
            else if (e.name.endsWith('.js')) {
                const rel = path.relative(ROOT, p).split(path.sep).join('/');
                if (rel === 'js/probability-tree/probability-tree-data.js') continue;
                if (fs.readFileSync(p, 'utf8').includes(OLD_KEY)) offenders.push(rel);
            }
        }
    };
    walk(path.join(ROOT, 'js'));
    assert.deepEqual(offenders, [], `old statKey ${OLD_KEY} still referenced by: ${offenders.join(', ')}`);
});

let probeCache = null;
function probe() {
    if (probeCache) return probeCache;
    const res = spawnSync(process.execPath, [path.join(ROOT, 'dev', 'tests', 'helpers', 'boot-probe.mjs')],
        { encoding: 'utf8', timeout: 120_000 });
    assert.equal(res.status, 0, `game failed to boot:\n${res.stdout}\n${res.stderr}`);
    const lines = res.stdout.trim().split('\n');
    probeCache = JSON.parse(lines[lines.length - 1]);
    return probeCache;
}

test('30198: +12% flows into melee strikes only, and stacks with 30195 + 30194', () => {
    const s = probe();
    assert.equal(s.bonusWrath, 12, 'node 30198 must grant meleePhysIncPct 12');
    assert.equal(s.statsWrath, 12);
    assert.ok(s.meleeWithout > 0, 'sanity: melee baseline should be positive');
    assert.equal(s.meleeWithWrath, Math.round(s.meleeWithout * 1.12),
        `melee damage should be exactly 12% higher (without=${s.meleeWithout}, with=${s.meleeWithWrath})`);

    // 30195 (12) + 30194 (16) + 30198 (12) = 40% on the same melee-only channel.
    assert.equal(s.statsAllMeleeNodes, 40);
    assert.equal(s.meleeWithAllMeleeNodes, Math.round(s.meleeWithout * 1.40));

    // Projectiles never gain the melee-only bonus.
    assert.equal(s.projWithWrath, s.projWithout, 'projectile damage must not gain the melee bonus');
});

// Added only AFTER lint, tests, phase2:verify and build all passed for the
// rework itself (the gate order the in-game rework template prescribes).
test('node 30198 is registered in PT_REWORKED_NODE_IDS', async () => {
    const { PT_REWORKED_NODE_IDS, isPassiveTreeNodeReworked } = await import('../../js/probability-tree/probability-tree-rework.js');
    assert.ok(PT_REWORKED_NODE_IDS.includes(NODE_ID), '30198 missing from PT_REWORKED_NODE_IDS');
    assert.equal(isPassiveTreeNodeReworked(NODE_ID), true);
});
