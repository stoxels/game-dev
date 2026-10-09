// Node 30195 (Lesser Melee Force) full rework:
//   1. data shape - new name/EN-DE stats/own statKey/icon "" (art deferred),
//   2. shared-statKey audit - the OLD key is untouched everywhere else and
//      has no gameplay consumer the rename could break,
//   3. real gameplay wiring - boots the actual game (generated entry.mjs)
//      headless in a child process and asserts the +12% flows through the
//      passive-tree bonus map into the melee strike roll, and ONLY there.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TALENT_TREE_DATA } from '../../js/probability-tree/probability-tree-data.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const NODE_ID = 30195;
const NEW_KEY = 'small_lesser_melee_force';
const OLD_KEY = 'small_lesser_moment_reserves';

const node = TALENT_TREE_DATA.nodes.find(n => n.id === NODE_ID);

test('node 30195 was reworked from scratch (name, stats, own statKey, no icon)', () => {
    assert.ok(node, 'node 30195 missing from TALENT_TREE_DATA');
    assert.notEqual(node.nameEn, 'Lesser Moment Reserves', 'old name still present');
    assert.equal(node.statKey, NEW_KEY, 'node must carry its own new statKey');
    assert.equal(node.icon, '', 'art is deferred to the art pass - icon must be "" (never an emoji)');

    // One stat per line, EN and DE.
    assert.equal(node.descEn, '+12% increased melee physical damage.');
    assert.equal(node.descDe, '+12% physischer Nahkampfschaden.');
    assert.ok(!node.descEn.includes('\n'), 'descEn must stay a single stat line');
    assert.ok(!node.descDe.includes('\n'), 'descDe must stay a single stat line');

    // "its own statKey": no other node may share it.
    const holders = TALENT_TREE_DATA.nodes.filter(n => n.statKey === NEW_KEY).map(n => n.id);
    assert.deepEqual(holders, [NODE_ID], `statKey ${NEW_KEY} must belong to node 30195 alone`);

    // Position/id/tier untouched by the rework.
    assert.equal(node.tier, 'small');
});

test('old shared statKey audit - retired from the tree, no consumer left', () => {
    // The key was SHARED with node 30198 (the rework of 30195 renamed only
    // this node); 30198 has since been reworked too, so the key is now fully
    // retired - nothing in the tree may still carry it.
    const oldKeyHolders = TALENT_TREE_DATA.nodes.filter(n => n.statKey === OLD_KEY).map(n => n.id);
    assert.ok(!oldKeyHolders.includes(NODE_ID), '30195 must not keep the old statKey');
    assert.deepEqual(oldKeyHolders, [], `old statKey ${OLD_KEY} must be retired: still on ${oldKeyHolders}`);

    // No consumer anywhere may reference the old key for gameplay - the
    // rename has to be a no-op for every other system.
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

test('boot probe: +12% flows into melee strikes and nowhere else', () => {
    const probe = path.join(ROOT, 'dev', 'tests', 'helpers', 'boot-probe.mjs');
    const res = spawnSync(process.execPath, [probe], { encoding: 'utf8', timeout: 120_000 });
    assert.equal(res.status, 0, `game failed to boot:\n${res.stdout}\n${res.stderr}`);
    const lines = res.stdout.trim().split('\n');
    const stats = JSON.parse(lines[lines.length - 1]);

    // Passive-tree bonus map -> totals
    assert.equal(stats.bonusWithout, 0);
    assert.equal(stats.bonusWith, 12, 'node 30195 must grant meleePhysIncPct 12');

    // Totals -> aggregated player stats (stacks additively per allocated node)
    assert.equal(stats.statsWithout, 0);
    assert.equal(stats.statsWith, 12);
    assert.equal(stats.statsDouble, 24);

    // Aggregated stats -> combat: melee strikes hit exactly 12% harder.
    assert.ok(stats.meleeWithout > 0, 'sanity: melee baseline damage should be positive');
    assert.equal(stats.meleeWith, Math.round(stats.meleeWithout * 1.12),
        `melee damage should be exactly 12% higher (without=${stats.meleeWithout}, with=${stats.meleeWith})`);

    // ...and projectile damage is untouched (the bonus is melee-only).
    assert.equal(stats.projWith, stats.projWithout,
        'projectile damage must NOT gain the melee-only bonus');
});

test('char sheet can display the new bucket (label + layout + tooltip key, EN/DE)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'js', 'endgame', 'endgame-player-stats.js'), 'utf8');
    assert.ok(src.includes("meleePhysIncPct: { label: t('eg_stat_inc_melee_phys_dmg')"), 'display label missing');
    assert.ok(src.includes("'meleePhysIncPct',"), 'bucket missing from EG_STAT_LAYOUT');
    const tr = fs.readFileSync(path.join(ROOT, 'js', 'translation', 'translations-strings.js'), 'utf8');
    for (const key of ['eg_stat_inc_melee_phys_dmg:', 'eg_statdesc_meleePhysIncPct:']) {
        const count = tr.split(key).length - 1;
        assert.equal(count, 2, `${key} must exist in EN and DE (found ${count})`);
    }
});

// Added only AFTER lint, tests, phase2:verify and build all passed for the
// rework itself (the gate order the in-game rework template prescribes).
test('node 30195 is registered in PT_REWORKED_NODE_IDS', async () => {
    const { PT_REWORKED_NODE_IDS, isPassiveTreeNodeReworked } = await import('../../js/probability-tree/probability-tree-rework.js');
    assert.ok(PT_REWORKED_NODE_IDS.includes(NODE_ID), '30195 missing from PT_REWORKED_NODE_IDS');
    assert.equal(isPassiveTreeNodeReworked(NODE_ID), true);
});
