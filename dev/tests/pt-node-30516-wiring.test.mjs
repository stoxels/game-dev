// Small node 30516 (Bulwark Endurance) full rework - two advertised lines:
//   +30 Armour, +5% increased maximum Life
//   1. data shape - new name, one stat per line (EN/DE), own statKey,
//      icon "" (art deferred),
//   2. shared-statKey audit - the old key small_bulwark_march was held by this
//      node alone and had no gameplay consumer, so the rename retires it,
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
const NODE_ID = 30516;
const NEW_KEY = 'small_bulwark_endurance';
const OLD_KEY = 'small_bulwark_march';

const node = TALENT_TREE_DATA.nodes.find(n => n.id === NODE_ID);

test('small node 30516 reworked: two stat lines, own statKey, no art yet', () => {
    assert.ok(node, 'node 30516 missing from TALENT_TREE_DATA');
    assert.notEqual(node.nameEn, 'Bulwark March', 'old name still present');
    assert.equal(node.nameEn, 'Bulwark Endurance');
    assert.equal(node.nameDe, 'Bollwerk-Ausdauer');
    assert.equal(node.statKey, NEW_KEY, 'node must carry its own new statKey');
    assert.equal(node.icon, '', 'art is deferred - icon must be "" (never an emoji)');
    assert.equal(node.tier, 'small');

    // One stat per line, EN and DE, in the advertised order.
    assert.deepEqual(node.descEn.split('\n'), [
        '+30 Armour',
        '+5% increased maximum Life',
    ]);
    assert.deepEqual(node.descDe.split('\n'), [
        '+30 Rüstung',
        '+5% erhöhtes maximales Leben',
    ]);

    const holders = TALENT_TREE_DATA.nodes.filter(n => n.statKey === NEW_KEY).map(n => n.id);
    assert.deepEqual(holders, [NODE_ID], `statKey ${NEW_KEY} must belong to node 30516 alone`);
});

test('old statKey small_bulwark_march is fully retired, no consumer left behind', () => {
    const holders = TALENT_TREE_DATA.nodes.filter(n => n.statKey === OLD_KEY).map(n => n.id);
    assert.deepEqual(holders, [], `old statKey ${OLD_KEY} must not be granted by any node any more`);

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

test('30516 line 1: +30 Armour reaches the aggregated armour pool', () => {
    const s = probe();
    assert.equal(s.bonusArmourFlatWithout, 0, 'sanity: no flat Armour from the tree without the node');
    assert.equal(s.bonusArmourFlat, 30, 'the node must add 30 flat Armour to the tree totals');
    assert.equal(s.armourFlatWith - s.armourFlatWithout, 30, 'the flat Armour pool must rise by exactly 30');
    assert.equal(s.armourWith - s.armourWithout, 30,
        `computed Armour must rise by exactly 30 (without=${s.armourWithout}, with=${s.armourWith})`);
    assert.ok(s.armourWithout > 0, 'sanity: baseline Armour (Str side-effect) should be positive');
});

test('30516 line 1: the flat Armour is aggregated before the final armour formula', () => {
    const stats = fs.readFileSync(path.join(ROOT, 'js', 'endgame', 'endgame-player-stats.js'), 'utf8');
    const seed = stats.indexOf('armourFlat: passiveTreeBonuses.armourFlat');
    const gear = stats.indexOf('s.armourFlat += eff.armour;');
    const strength = stats.indexOf('s.armourFlat += s.strength;');
    const final = stats.indexOf('s.armour = Math.round(s.armourFlat * (1 + s.armourIncPct / 100));');
    assert.ok(seed > -1, 'passive flat Armour is not seeded into the stats object');
    assert.ok(seed < gear && gear < final, 'passive Armour must aggregate into armourFlat before the final formula');
    assert.ok(strength > -1 && strength < final, 'sanity: the Str side-effect feeds the same pool');

    // stats.armour is what the damage pipeline mitigates with.
    const dmg = fs.readFileSync(path.join(ROOT, 'js', 'combat', 'encounter-damage.js'), 'utf8');
    assert.ok(dmg.includes('stats.armour'), 'Armour is not consumed by the damage pipeline');
    const hub = fs.readFileSync(path.join(ROOT, 'js', 'endgame', 'endgame-hub.js'), 'utf8');
    assert.ok(hub.includes('_egCalcArmourReductionPct(stats.armour'), 'Armour is not consumed by the mitigation calculation');
});

test('30516 line 2: +5% increased maximum Life multiplies the aggregated pool', () => {
    const s = probe();
    assert.equal(s.healthIncPctWithout, 0, 'sanity: no increased-Life percentage without the node');
    assert.equal(s.bonusHealthIncPct, 5, 'the node must grant healthIncPct 5');
    assert.equal(s.healthIncPctWith, 5);
    assert.equal(s.healthWithBulwark, Math.round(s.healthWithout * 1.05),
        `maximum Life should be 5% higher (without=${s.healthWithout}, with=${s.healthWithBulwark})`);
});

test('30516 line 2: stacks additively with the pre-existing +5% max Life small node', () => {
    const s = probe();
    assert.equal(s.healthIncPctBulwarkAndVital, 10, 'two +5% nodes must add up to 10%');
    assert.equal(s.healthVitalOnly, Math.round(s.healthWithout * 1.05), 'sanity: node 31478 alone is +5%');
    assert.equal(s.healthBulwarkAndVital, Math.round(s.healthWithout * 1.10));
});

test('char sheet surfaces both advertised lines (existing buckets, EN/DE labels)', () => {
    const stats = fs.readFileSync(path.join(ROOT, 'js', 'endgame', 'endgame-player-stats.js'), 'utf8');
    const defences = stats.slice(stats.indexOf("catKey: 'eg_statcat_defences'"), stats.indexOf("catKey: 'eg_statcat_block_dodge'"));
    assert.ok(defences.includes("'armour'"), 'armour missing from the Defences char-sheet category');
    assert.ok(defences.includes("'evasion'") && defences.includes("'absorption'"), 'sanity: defences category intact');
    const lifeMana = stats.slice(stats.indexOf("catKey: 'eg_statcat_life_mana'"), stats.indexOf("catKey: 'eg_statcat_block_dodge'"));
    assert.ok(lifeMana.includes("'health'"), 'health missing from the Life & Mana char-sheet category');

    const tr = fs.readFileSync(path.join(ROOT, 'js', 'translation', 'translations-strings.js'), 'utf8');
    for (const key of ['eg_statdesc_armour:', 'eg_statdesc_health:']) {
        const count = tr.split(key).length - 1;
        assert.equal(count, 2, `${key} must exist in EN and DE (found ${count})`);
    }
});

// Added only AFTER lint, tests, phase2:verify and build all passed for the
// rework itself (the gate order the in-game rework template prescribes).
test('small node 30516 is registered in PT_REWORKED_NODE_IDS', async () => {
    const { PT_REWORKED_NODE_IDS, isPassiveTreeNodeReworked } = await import('../../js/probability-tree/probability-tree-rework.js');
    assert.ok(PT_REWORKED_NODE_IDS.includes(NODE_ID), '30516 missing from PT_REWORKED_NODE_IDS');
    assert.equal(isPassiveTreeNodeReworked(NODE_ID), true);
});
