// Nodes 30194 (Lesser Champion's Might, +16% melee physical damage) and
// 30197 (Lesser Champion's Tempo, +5% melee charge-up speed) full reworks:
//   1. data shape - new names/EN-DE stats/own statKeys/icon "" (art deferred),
//   2. shared-statKey audit - the OLD key stays untouched on its four other
//      nodes and has no gameplay consumer the rename could break,
//   3. real gameplay wiring - boots the actual game (generated entry.mjs)
//      headless in a child process (same probe as the 30195 test).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TALENT_TREE_DATA } from '../../js/probability-tree/probability-tree-data.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MIGHT_ID = 30194;
const TEMPO_ID = 30197;
const MIGHT_KEY = 'small_lesser_champion_s_might';
const TEMPO_KEY = 'small_lesser_champion_s_tempo';
const OLD_KEY = 'small_lesser_champion_s_vigor';
// Nodes that keep the old shared key (not reworked).
const OLD_KEY_HOLDERS = [30349, 30350, 30364, 30366];

const byId = new Map(TALENT_TREE_DATA.nodes.map(n => [n.id, n]));

test('node 30194 reworked: Lesser Champion\'s Might, +16% melee physical damage', () => {
    const node = byId.get(MIGHT_ID);
    assert.ok(node, 'node 30194 missing from TALENT_TREE_DATA');
    assert.notEqual(node.nameEn, "Lesser Champion's Vigor", 'old name still present');
    assert.equal(node.nameEn, "Lesser Champion's Might");
    assert.equal(node.nameDe, 'Macht des Champions (klein)');
    assert.equal(node.statKey, MIGHT_KEY, 'node must carry its own new statKey');
    assert.equal(node.icon, '', 'art is deferred - icon must be "" (never an emoji)');
    assert.equal(node.descEn, '+16% increased melee physical damage.');
    assert.equal(node.descDe, '+16% physischer Nahkampfschaden.');
    assert.ok(!node.descEn.includes('\n') && !node.descDe.includes('\n'), 'one stat per line only');
    assert.equal(node.tier, 'small');
    const holders = TALENT_TREE_DATA.nodes.filter(n => n.statKey === MIGHT_KEY).map(n => n.id);
    assert.deepEqual(holders, [MIGHT_ID], `statKey ${MIGHT_KEY} must belong to node 30194 alone`);
});

test('node 30197 reworked: Lesser Champion\'s Tempo, +5% melee charge-up speed', () => {
    const node = byId.get(TEMPO_ID);
    assert.ok(node, 'node 30197 missing from TALENT_TREE_DATA');
    assert.notEqual(node.nameEn, "Lesser Champion's Vigor", 'old name still present');
    assert.equal(node.nameEn, "Lesser Champion's Tempo");
    assert.equal(node.nameDe, 'Tempo des Champions (klein)');
    assert.equal(node.statKey, TEMPO_KEY, 'node must carry its own new statKey');
    assert.equal(node.icon, '', 'art is deferred - icon must be "" (never an emoji)');
    assert.equal(node.descEn, '+5% increased melee attack charge-up speed.');
    assert.equal(node.descDe, '+5% Nahkampf-Aufladegeschwindigkeit.');
    assert.ok(!node.descEn.includes('\n') && !node.descDe.includes('\n'), 'one stat per line only');
    assert.equal(node.tier, 'small');
    const holders = TALENT_TREE_DATA.nodes.filter(n => n.statKey === TEMPO_KEY).map(n => n.id);
    assert.deepEqual(holders, [TEMPO_ID], `statKey ${TEMPO_KEY} must belong to node 30197 alone`);
});

test('old shared statKey audit - both reworked nodes renamed away, no consumers left', () => {
    const holders = TALENT_TREE_DATA.nodes.filter(n => n.statKey === OLD_KEY).map(n => n.id).sort((a, b) => a - b);
    assert.deepEqual(holders, OLD_KEY_HOLDERS.slice().sort((a, b) => a - b),
        'the old key must stay exactly on its four non-reworked nodes');
    assert.ok(!holders.includes(MIGHT_ID) && !holders.includes(TEMPO_ID));

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

// One game boot shared by the behavioural tests below.
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

test('30194: +16% flows into melee strikes only, and stacks with 30195', () => {
    const s = probe();
    assert.equal(s.bonusMight, 16, 'node 30194 must grant meleePhysIncPct 16');
    assert.equal(s.statsMight, 16);
    assert.ok(s.meleeWithout > 0, 'sanity: melee baseline should be positive');
    assert.equal(s.meleeWithMight, Math.round(s.meleeWithout * 1.16),
        `melee damage should be exactly 16% higher (without=${s.meleeWithout}, with=${s.meleeWithMight})`);

    // 30195 (12) + 30194 (16) = 28% on the same channel.
    assert.equal(s.statsBothMeleeNodes, 28);
    assert.equal(s.meleeWithBoth, Math.round(s.meleeWithout * 1.28));

    // Projectiles never gain either melee-only bonus.
    assert.equal(s.projWithMight, s.projWithout, 'projectile damage must not gain the melee bonus');
});

test('30197: +5% shortens the melee charge time and leaves gear attack speed alone', () => {
    const s = probe();
    assert.equal(s.chargeSpeedWithout, 0);
    assert.equal(s.chargeSpeedWith, 5, 'node 30197 must grant meleeChargeSpeedPct 5');
    assert.ok(s.intervalWithout > 0, 'sanity: charge interval should be positive');
    assert.equal(s.intervalWith, Math.round(s.intervalWithout * 0.95 * 10000) / 10000,
        `charge time should be 5% shorter (without=${s.intervalWithout}, with=${s.intervalWith})`);
    assert.ok(s.intervalWith < s.intervalWithout, 'a faster charge-up must shorten the timer');
    // The gear-driven absolute-seconds bucket stays untouched.
    assert.equal(s.attackSpeedWith, 0, 'the passive charge speed must not leak into stats.attackSpeed');
});

test('char sheet can display both new buckets (label + layout + tooltip keys, EN/DE)', () => {
    const stats = fs.readFileSync(path.join(ROOT, 'js', 'endgame', 'endgame-player-stats.js'), 'utf8');
    assert.ok(stats.includes("meleeChargeSpeedPct: { label: t('eg_stat_inc_melee_charge_speed')"), 'charge-speed label missing');
    const meleeLayout = stats.slice(stats.indexOf("catKey: 'eg_statcat_melee'"), stats.indexOf("catKey: 'eg_statcat_projectiles'"));
    for (const bucket of ["'meleePhysIncPct'", "'meleeChargeSpeedPct'"]) {
        assert.ok(meleeLayout.includes(bucket), `${bucket} missing from the Melee Strikes layout`);
    }
    assert.ok(stats.includes('MELEE_DESC_KEYS'), 'melee-only tooltip keys must override the shared melee derivation');

    const tr = fs.readFileSync(path.join(ROOT, 'js', 'translation', 'translations-strings.js'), 'utf8');
    for (const key of ['eg_stat_inc_melee_charge_speed:', 'eg_statdesc_meleeChargeSpeedPct:']) {
        const count = tr.split(key).length - 1;
        assert.equal(count, 2, `${key} must exist in EN and DE (found ${count})`);
    }
});

// Added only AFTER lint, tests, phase2:verify and build all passed for the
// reworks themselves (the gate order the in-game rework template prescribes).
test('nodes 30194 and 30197 are registered in PT_REWORKED_NODE_IDS', async () => {
    const { PT_REWORKED_NODE_IDS, isPassiveTreeNodeReworked } = await import('../../js/probability-tree/probability-tree-rework.js');
    for (const id of [MIGHT_ID, TEMPO_ID]) {
        assert.ok(PT_REWORKED_NODE_IDS.includes(id), `${id} missing from PT_REWORKED_NODE_IDS`);
        assert.equal(isPassiveTreeNodeReworked(id), true);
    }
});
