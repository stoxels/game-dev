// Notable 20032 (Champion's Onslaught) full rework - three advertised lines:
//   +4% increased Attack Speed, +20 to Strength, +26% increased Physical Damage
//   1. data shape - new name, one stat per line (EN/DE), own statKey,
//      icon "" (art deferred),
//   2. shared-statKey audit - notable_champion_s_vigor stays on its two other
//      nodes and has no gameplay consumer the rename could break,
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
const NODE_ID = 20032;
const NEW_KEY = 'notable_champion_s_onslaught';
const OLD_KEY = 'notable_champion_s_vigor';
const OLD_KEY_HOLDERS = [20003, 20033];

const node = TALENT_TREE_DATA.nodes.find(n => n.id === NODE_ID);

test('notable 20032 reworked: three stat lines, own statKey, no art yet', () => {
    assert.ok(node, 'node 20032 missing from TALENT_TREE_DATA');
    assert.notEqual(node.nameEn, "Champion's Vigor", 'old name still present');
    assert.equal(node.nameEn, "Champion's Onslaught");
    assert.equal(node.nameDe, 'Ansturm des Champions');
    assert.equal(node.statKey, NEW_KEY, 'node must carry its own new statKey');
    assert.equal(node.icon, '', 'art is deferred - icon must be "" (never an emoji)');
    assert.equal(node.tier, 'notable');

    // One stat per line, EN and DE, in the advertised order.
    assert.deepEqual(node.descEn.split('\n'), [
        '+4% increased Attack Speed',
        '+20 to Strength',
        '+26% increased Physical Damage',
    ]);
    assert.deepEqual(node.descDe.split('\n'), [
        '+4% erhöhte Angriffsgeschwindigkeit',
        '+20 Stärke',
        '+26% erhöhter physischer Schaden',
    ]);

    const holders = TALENT_TREE_DATA.nodes.filter(n => n.statKey === NEW_KEY).map(n => n.id);
    assert.deepEqual(holders, [NODE_ID], `statKey ${NEW_KEY} must belong to node 20032 alone`);
});

test('old shared statKey audit - 20032 renamed away, no consumer left behind', () => {
    const holders = TALENT_TREE_DATA.nodes.filter(n => n.statKey === OLD_KEY).map(n => n.id).sort((a, b) => a - b);
    assert.deepEqual(holders, OLD_KEY_HOLDERS.slice().sort((a, b) => a - b),
        'the old key must stay exactly on its two non-reworked nodes');
    assert.ok(!holders.includes(NODE_ID));

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

test('20032 line 1: +20 Strength reaches attributes (and its Life/Armour side-effects)', () => {
    const s = probe();
    assert.equal(s.strBonus, 20, 'the notable must add 20 Strength to the tree totals');
    assert.equal(s.strengthWith - s.strengthWithout, 20, 'Strength total must rise by exactly 20');
    // Str grants +2 Life per point.
    assert.equal(s.healthWith - s.healthWithout, 40, 'the +20 Str must add 40 maximum Life');
});

test('20032 line 2: +4% increased Attack Speed shortens the melee charge', () => {
    const s = probe();
    assert.equal(s.attackSpeedPctWithout, 0);
    assert.equal(s.attackSpeedPctWith, 4, 'the notable must grant attackSpeedPct 4');
    assert.equal(s.intervalWithOnslaught, Math.round(s.intervalWithout * 0.96 * 10000) / 10000,
        `charge time should be 4% shorter (without=${s.intervalWithout}, with=${s.intervalWithOnslaught})`);
    // Stacks with 30197's melee charge-up speed (4% + 5% = 9%).
    assert.equal(s.intervalWithOnslaughtAndTempo, Math.round(s.intervalWithout * 0.91 * 10000) / 10000);
    // The gear-driven seconds bucket stays untouched by the passive percentage.
    assert.equal(s.attackSpeedSecondsWith, 0, 'the passive attack speed must not leak into stats.attackSpeed');
});

test('20032 line 3: +26% increased Physical Damage reaches melee, projectiles and spells', () => {
    const s = probe();
    assert.equal(s.physIncPctWithout, 0);
    assert.equal(s.physIncPctWith, 26, 'the shared projectile/spell bucket must gain 26%');
    assert.equal(s.meleePhysIncPctWith, 26, 'the melee bucket must gain the same 26%');
    assert.ok(s.projWithout > 0, 'sanity: projectile baseline should be positive');
    assert.equal(s.projWithOnslaught, Math.round(s.projWithout * 1.26),
        `projectile damage should be 26% higher (without=${s.projWithout}, with=${s.projWithOnslaught})`);
    assert.equal(s.meleeWithOnslaught, Math.round(s.meleeWithout * 1.26),
        `melee damage should be 26% higher (without=${s.meleeWithout}, with=${s.meleeWithOnslaught})`);
});

test('char sheet can display the new attack-speed bucket (label + layout + tooltip, EN/DE)', () => {
    const stats = fs.readFileSync(path.join(ROOT, 'js', 'endgame', 'endgame-player-stats.js'), 'utf8');
    assert.ok(stats.includes("attackSpeedPct: { label: t('eg_stat_inc_attack_speed')"), 'attack-speed label missing');
    const meleeLayout = stats.slice(stats.indexOf("catKey: 'eg_statcat_melee'"), stats.indexOf("catKey: 'eg_statcat_projectiles'"));
    assert.ok(meleeLayout.includes("'attackSpeedPct'"), 'attackSpeedPct missing from the Melee Strikes layout');
    const tr = fs.readFileSync(path.join(ROOT, 'js', 'translation', 'translations-strings.js'), 'utf8');
    for (const key of ['eg_stat_inc_attack_speed:', 'eg_statdesc_attackSpeedPct:']) {
        const count = tr.split(key).length - 1;
        assert.equal(count, 2, `${key} must exist in EN and DE (found ${count})`);
    }
});

// Added only AFTER lint, tests, phase2:verify and build all passed for the
// rework itself (the gate order the in-game rework template prescribes).
test('notable 20032 is registered in PT_REWORKED_NODE_IDS', async () => {
    const { PT_REWORKED_NODE_IDS, isPassiveTreeNodeReworked } = await import('../../js/probability-tree/probability-tree-rework.js');
    assert.ok(PT_REWORKED_NODE_IDS.includes(NODE_ID), '20032 missing from PT_REWORKED_NODE_IDS');
    assert.equal(isPassiveTreeNodeReworked(NODE_ID), true);
});
