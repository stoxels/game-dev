//------------------------------------------------------------------------
//-------------------BOSS: THE DYNAMO (boss_dynamo)---------------------------
//------------------------------------------------------------------------
// Spark-Mandrill homage: jagged lightning pillars crackle through the
// arena — vertical in P1, horizontal from 50% HP, diagonal from 25% HP.
// Every pillar is independently randomized (stratified lanes + per-bolt
// timing offsets) so casts never line up into a grid.
//
// Lightning Conductors: attackable socket monsters the boss charges with a
// live beam network. Beams arc boss→conductor and conductor↔conductor; the
// field inside the network shocks heavily. Kill conductors to reclaim
// ground, or risk the field and burn the boss down.
//
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics (corrupt_cells, probability_shift, prior_bomb, …)
// live in shared-boss-abilities.js and are referenced by handler name.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_dynamo: {
        id: 'boss_dynamo', name: 'The Dynamo', emoji: '⚡',
        baseHP: 1200, baseDamage: 26, chargeMax: 11,
        element: 'lightning', resistances: { fire: 15, cold: 15, lightning: 30, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_dynamo: {
        phases: [
            { threshold: 1.00, chargeMax: 11, damageMultiplier: 1.00 },
            { threshold: 0.50, chargeMax: 8, damageMultiplier: 1.40 },
            { threshold: 0.25, chargeMax: 6, damageMultiplier: 1.80 },
            { threshold: 0.15, chargeMax: 4, damageMultiplier: 2.30 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'spark_pillars', intervalBase: 18000, intervalVariance: 5000, handler: '_egMechSparkPillars' },
            { name: 'lightning_conductors', intervalBase: 22000, intervalVariance: 6000, handler: '_egMechLightningConductors' },
            { name: 'prior_bomb', intervalBase: 17000, intervalVariance: 4000, handler: '_egMechPriorBomb' },
        ],
        // Phase-sting extras: announce the new pillar orientations the moment
        // they come online. Returning false keeps the standard immunity
        // window + mechanic rescheduling (this hook only adds toasts).
        onPhaseEnter(monster, newPhase) {
            try {
                if (newPhase === 2) {
                    showToast(t('eg_dynamo_phase2') || '⚡ The Dynamo: HORIZONTAL storm pillars online!');
                } else if (newPhase === 3) {
                    showToast(t('eg_dynamo_phase3') || '⚡ The Dynamo: DIAGONAL storm pillars online!');
                }
            } catch (e) {}
            return false;
        },
    },
});

// Lightning Conductor base def — real conductors are built per-spawn below
// (HP scales off the live boss's max HP). This entry keeps any def lookup
// (art, tooltips) working for the baseId.
Object.assign(EG_MONSTER_DEFS, {
    dynamo_conductor: {
        id: 'dynamo_conductor', name: 'Lightning Conductor', emoji: '🔌',
        baseHP: 350, baseDamage: 0, chargeMax: 9999,
        element: 'lightning', resistances: { lightning: 85, fire: 10, cold: 10, shadow: 10 },
        attackType: 'none'
    },
});


// ════════════════════════════════════════════════════════════════════════
// ── Spark Pillars: jagged lightning bolts ────────────────────────────────
// ════════════════════════════════════════════════════════════════════════
// P1 (100–50%): vertical only
// P2 (50–25%):  vertical + horizontal
// P3 (25–15%):  vertical + horizontal + diagonal
// P4 (<15%):    all three, faster, more pillars
//
// Randomization: pillar lanes are STRATIFIED — the arena is split into one
// band per pillar and each pillar lands randomly inside its own band, so
// positions are properly random while guaranteed to spread across the whole
// screen with sane minimum gaps (no clumping, no perfect grids). Every
// pillar also gets its own random start offset, so bolts never all fire at
// the same instant.

const EG_PILLAR_WIDTH = 46;          // hitbox + bolt width (px)
const EG_PILLAR_WARN_MS = 1000;      // crackling telegraph before the strike
const EG_PILLAR_ACTIVE_MS = 620;     // how long the live bolt deals damage
const EG_PILLAR_STAGGER_SPREAD = 900; // max per-pillar start offset (ms)
// Shape re-jitter cadence per stage. Warn arcs re-crackle slower (still
// lively); live bolts crackle faster. Cheaper than the old ~12x/second for
// EVERY bolt — with 18 pillars up that was 200+ path rebuilds per second.
const EG_BOLT_CRACKLE_WARN_MS = [180, 360];
const EG_BOLT_CRACKLE_ACTIVE_MS = [90, 180];

function _egMechSparkPillars(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(4, Number(phase) || 1));
    const W = window.innerWidth;
    const H = window.innerHeight;

    const nV = [0, 5, 6, 7, 8][p];
    const nH = [0, 0, 4, 5, 6][p];
    const nD = [0, 0, 0, 3, 4][p];
    if (nV + nH + nD <= 0) return;

    const dmgPct = [0, 0.12, 0.14, 0.16, 0.18][p];
    const level = monster ? monster.level : 1;
    const run = _egNkNewRun(monster && monster.id, true);

    // Stratified lane positions with minimum-gap padding.
    const vPos = _egDynamoStratifiedPositions(nV, 70, W - 140);
    const hPos = _egDynamoStratifiedPositions(nH, 95, H - 190);
    // Diagonals run at ±45° through offset anchors; offsets are stratified
    // across ±maxOff. maxOff is the largest perpendicular distance at which
    // a 45° line still visibly crosses the viewport.
    const diagMaxOff = (W + H) * 0.32;
    const dPosRaw = _egDynamoStratifiedPositions(nD, 0, diagMaxOff * 2);

    // Build the shuffled orientation list, then hand out the lane positions.
    const types = [];
    for (let i = 0; i < nV; i++) types.push('vertical');
    for (let i = 0; i < nH; i++) types.push('horizontal');
    for (let i = 0; i < nD; i++) types.push('diagonal');
    for (let i = types.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [types[i], types[j]] = [types[j], types[i]];
    }

    let vi = 0, hi = 0, di = 0;
    const pillars = [];
    const diagLen = Math.hypot(W, H) + 120;

    types.forEach((type) => {
        let ax, ay, rot, len, pos, angle = 0, nx = 0, ny = 0;

        if (type === 'vertical') {
            pos = vPos[vi++];
            ax = pos; ay = H / 2;
            rot = 0; len = H + 80;
        } else if (type === 'horizontal') {
            pos = hPos[hi++];
            ax = W / 2; ay = pos;
            rot = Math.PI / 2; len = W + 80;
        } else {
            angle = Math.random() < 0.5 ? Math.PI / 4 : -Math.PI / 4;
            pos = dPosRaw[di++] - diagMaxOff;
            // Perpendicular unit normal — offsetting along it actually moves
            // the LINE (offsetting along the line direction would not).
            nx = -Math.sin(angle); ny = Math.cos(angle);
            ax = W / 2 + nx * pos;
            ay = H / 2 + ny * pos;
            // A vertical bolt container rotated by (angle − 90°) points along
            // the line direction (screen coords, y down).
            rot = angle - Math.PI / 2;
            len = diagLen;
        }

        const el = _egDynamoBoltEl(run, len);
        el.classList.add('eg-bolt-warn');
        el.style.left = Math.round(ax - EG_PILLAR_WIDTH / 2) + 'px';
        el.style.top = Math.round(ay - len / 2) + 'px';
        el.style.transform = `rotate(${rot}rad)`;

        const core = el.querySelector('.bolt-core');
        const glow = el.querySelector('.bolt-glow');
        const halo = el.querySelector('.bolt-halo');
        const paintBolt = () => {
            const d = _egDynamoBoltPath(len);
            halo.setAttribute('d', d);
            core.setAttribute('d', d);
            glow.setAttribute('d', d);
        };
        paintBolt();

        pillars.push({
            type, pos, angle, nx, ny, len,
            t: -(Math.random() * EG_PILLAR_STAGGER_SPREAD), // per-bolt offset
            stage: 'warn', hitDone: false,
            crackleIn: 60 + Math.random() * 120,
            paintBolt, el, core, glow,
        });
    });

    const modeNames = [];
    if (nV) modeNames.push('vertical');
    if (nH) modeNames.push('horizontal');
    if (nD) modeNames.push('diagonal');
    _egNkToast('eg_mech_pillars',
        `⚡ The Dynamo: Spark Pillars (${modeNames.join(' · ')})! Watch the warnings!`);

    _egNkLoop(run, (dtS) => {
        let allDone = true;
        const pr = _egNkPlayerRect();
        const dtMs = dtS * 1000;

        pillars.forEach((pl) => {
            if (pl.stage === 'done') return;
            allDone = false;
            pl.t += dtMs;
            if (pl.t < 0) return; // still waiting out its personal offset

            // Living lightning: re-jitter the bolt shape (cadence per stage).
            pl.crackleIn -= dtMs;
            if (pl.crackleIn <= 0) {
                pl.paintBolt();
                const [lo, hi] = pl.stage === 'active' ? EG_BOLT_CRACKLE_ACTIVE_MS : EG_BOLT_CRACKLE_WARN_MS;
                pl.crackleIn = lo + Math.random() * (hi - lo);
            }

            if (pl.stage === 'warn') {
                if (pl.t >= EG_PILLAR_WARN_MS) {
                    pl.stage = 'active';
                    pl.el.classList.remove('eg-bolt-warn');
                    pl.el.classList.add('eg-bolt-active');
                }
                return;
            }

            // Active bolt — damage window.
            if (!pl.hitDone && pr && _egDynamoPillarHits(pl, pr)) {
                pl.hitDone = true;
                const dealt = _egNkHit(dmgPct, 'lightning', level);
                _egNkAbilityHitToast(dealt, 'The Dynamo', 'Spark Pillars');
            }
            if (pl.t >= EG_PILLAR_WARN_MS + EG_PILLAR_ACTIVE_MS) {
                pl.stage = 'done';
                pl.el.style.display = 'none';
            }
        });
        return !allDone;
    });
}

// Splits [inset, inset+span] into `count` equal bands and picks one random
// position per band, padded inward so adjacent pillars keep a minimum gap.
// Bands are shuffled so the draw order carries no positional bias.
function _egDynamoStratifiedPositions(count, inset, span) {
    const out = [];
    if (count <= 0) return out;
    const usable = Math.max(40, span - inset * 2);
    const band = usable / count;
    const pad = Math.min(42, band * 0.18);
    for (let i = 0; i < count; i++) {
        const lo = inset + band * i + pad;
        const hi = inset + band * (i + 1) - pad;
        out.push(lo + Math.random() * Math.max(4, hi - lo));
    }
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

// Builds the bolt container: a fixed div holding an SVG with a glow path and
// a bright core path (both re-jittered while the pillar lives).
function _egDynamoBoltEl(run, len) {
    const el = _egNkEl(run, 'div', 'eg-nk-bolt');
    const L = Math.round(len);
    el.style.width = EG_PILLAR_WIDTH + 'px';
    el.style.height = L + 'px';
    el.innerHTML =
        `<svg width="${EG_PILLAR_WIDTH}" height="${L}" viewBox="0 0 ${EG_PILLAR_WIDTH} ${L}" overflow="visible">` +
        '<path class="bolt-halo"></path>' +
        '<path class="bolt-glow"></path>' +
        '<path class="bolt-core"></path>' +
        '</svg>';
    return el;
}

// Zigzag path for one bolt: midpoint jitter around the container's central
// axis, calming down at the endpoints so the arc meets its anchor cleanly.
function _egDynamoBoltPath(len) {
    const cx = EG_PILLAR_WIDTH / 2;
    const steps = Math.max(8, Math.round(len / 90));
    const amp = EG_PILLAR_WIDTH * 0.36;
    let d = `M ${cx.toFixed(1)} 0`;
    for (let i = 1; i <= steps; i++) {
        const y = (len * i) / steps;
        const jitter = (i === steps) ? amp * 0.3 : amp;
        const x = cx + (Math.random() * 2 - 1) * jitter;
        d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return d;
}

// Rendered-box hit test for one pillar against the player rect.
function _egDynamoPillarHits(pl, pr) {
    const half = EG_PILLAR_WIDTH / 2;
    if (pl.type === 'vertical') {
        return pr.right > pl.pos - half && pr.left < pl.pos + half;
    }
    if (pl.type === 'horizontal') {
        return pr.bottom > pl.pos - half && pr.top < pl.pos + half;
    }
    // Diagonal: perpendicular distance from the line through (ax,ay).
    const ax = window.innerWidth / 2 + pl.nx * pl.pos;
    const ay = window.innerHeight / 2 + pl.ny * pl.pos;
    const pts = [
        [pr.left + pr.width / 2, pr.top + pr.height / 2],
        [pr.left, pr.top], [pr.right, pr.top],
        [pr.left, pr.bottom], [pr.right, pr.bottom],
    ];
    for (const [px, py] of pts) {
        const dist = Math.abs((px - ax) * pl.nx + (py - ay) * pl.ny);
        if (dist < half + 6) return true;
    }
    return false;
}


// ════════════════════════════════════════════════════════════════════════
// ── Lightning Conductors: charged sockets + beam network ─────────────────
// ════════════════════════════════════════════════════════════════════════
// Real monsters (tab-targetable, attackable) rendered on a fixed roaming
// layer — the panel rebuild skips them, same pattern as Brutus's zombies.
// One fixed SVG draws every jagged beam (boss↔conductor, conductor↔
// conductor) plus the filled convex hull of the network; the hull interior
// and the beam lines themselves shock the player while the boss lives.

const EG_CONDUCTOR_MAX = 4;            // hard cap on fielded conductors
const EG_CONDUCTOR_HP_FRACTION = 0.18; // of the boss's live max HP each
const EG_CONDUCTOR_HP_MIN = 200;       // floor at low levels
const EG_BEAM_HIT_PAD = 9;             // px forgiveness around a beam line
const EG_BEAM_DPS = 0.06;              // % maxHP per second ON a beam line
const EG_BEAM_HULL_DPS = 0.10;         // % maxHP per second INSIDE the field
const EG_DYNAMO_TICK_MS = 250;         // damage + card-sync cadence
const EG_DYNAMO_CRACKLE_MS = 240;      // beam re-jitter cadence (was 130ms + full innerHTML churn)
const EG_DYNAMO_JITTER_BUDGET = 2;     // conductor↔conductor arcs re-struck per crackle tick

const EG_DYNAMO_LAYER_ID = 'eg-dynamo-layer';
const EG_DYNAMO_SVG_ID = 'eg-dynamo-net';

let _egDynamoConductors = new Map(); // monsterId → { monsterId, x, y, card }
let _egDynamoSeq = 0;
let _egDynamoDamageTimer = null;
let _egDynamoCrackleTimer = null;
let _egDynamoLastBeamToast = 0;
let _egDynamoLastHullToast = 0;

// Mechanic trigger: spawn one conductor if the phase cap allows it.
function _egMechLightningConductors(monster, phase) {
    if (_egNkFrozen()) return;
    const boss = monster || _egDynamoFindBoss();
    if (!boss) return;
    const p = Math.max(1, Math.min(4, Number(phase) || 1));
    const cap = Math.min(EG_CONDUCTOR_MAX, 1 + p); // P1:2 P2:3 P3:4 P4:4
    if (_egDynamoConductors.size >= cap) return;

    const m = _egDynamoSpawnConductor(boss);
    if (!m) return;
    _egNkToast('eg_mech_conductor_spawn',
        '⚡ The Dynamo summons a Lightning Conductor! Destroy it to break the network!');
}

// Builds the conductor monster + card. HP scales off the LIVE boss max HP so
// conductors stay a real time investment at every level and with the 500k
// test boost.
function _egDynamoSpawnConductor(boss) {
    const spot = _egDynamoPickSpot(boss);
    if (!spot) return null;

    const maxHP = Math.max(EG_CONDUCTOR_HP_MIN, Math.round(boss.maxHP * EG_CONDUCTOR_HP_FRACTION));
    const nameRes = (typeof t === 'function') ? t('eg_mon_dynamo_conductor') : null;
    const m = {
        id: `dynamo_conductor_${++_egDynamoSeq}`,
        baseId: 'dynamo_conductor',
        name: (nameRes && nameRes !== 'eg_mon_dynamo_conductor') ? nameRes : 'Lightning Conductor',
        emoji: '🔌',
        level: boss.level || 1,
        maxHP,
        currentHP: maxHP,
        chargeMax: 9999, // charge bar can never fill — conductors never attack
        currentCharge: 0,
        damageValue: 0,
        attackType: 'none',
        element: 'lightning',
        resistances: { lightning: 85, fire: 10, cold: 10, shadow: 10 },
        isDynamoConductor: true,
        noLoot: true,
        zoneId: 'eg-monster-panel', // present but never rendered there
    };

    _egMonsters.push(m);
    if (!_egTargetId) _egTargetId = m.id;

    const rec = { monsterId: m.id, x: spot.x, y: spot.y, card: null };
    _egDynamoConductors.set(m.id, rec);
    rec.card = _egDynamoRenderConductorCard(m, rec);

    _egDynamoDeathBurst(spot.x, spot.y, true); // charged arrival pop
    _egDynamoRebuildNet();
    _egDynamoStartTicks();
    return m;
}

// Random spawn spot with soft exclusion zones (boss, other conductors,
// player), relaxing when cramped screens force it.
function _egDynamoPickSpot(boss) {
    const W = window.innerWidth, H = window.innerHeight;
    const bc = _egDynamoCardCenter(boss.id) || { x: W / 2, y: H * 0.35 };
    const others = Array.from(_egDynamoConductors.values());
    const player = (typeof _egNkPlayerCenter === 'function') ? _egNkPlayerCenter() : null;

    for (let i = 0; i < 30; i++) {
        const x = 90 + Math.random() * Math.max(60, W - 180);
        const y = 150 + Math.random() * Math.max(60, H - 250);
        const skipBossDist = i > 12;
        const skipPlayerDist = i > 22;
        if (!skipBossDist && Math.hypot(x - bc.x, y - bc.y) < 200) continue;
        if (others.some(r => Math.hypot(x - r.x, y - r.y) < 220)) continue;
        if (!skipPlayerDist && player && Math.hypot(x - player.x, y - player.y) < 150) continue;
        return { x, y };
    }
    return { x: W * 0.5 + (Math.random() - 0.5) * 200, y: H * 0.55 };
}

// Builds the roaming conductor card (same ids as panel cards so the engine's
// 10Hz bar updater, damage numbers and kill flash all work untouched).
function _egDynamoRenderConductorCard(m, rec) {
    let layer = document.getElementById(EG_DYNAMO_LAYER_ID);
    if (!layer) {
        layer = document.createElement('div');
        layer.id = EG_DYNAMO_LAYER_ID;
        document.body.appendChild(layer);
    }

    const hpPct = Math.max(0, Math.round((m.currentHP / m.maxHP) * 100));
    const art = (typeof EG_ART !== 'undefined' && EG_ART.html)
        ? EG_ART.html('monster', m.baseId, m.emoji) : m.emoji;

    const card = document.createElement('div');
    card.className = 'eg-monster-card-compact eg-dynamo-conductor-card';
    card.id = 'eg-card-' + m.id;
    card.style.left = Math.round(rec.x) + 'px';
    card.style.top = Math.round(rec.y) + 'px';
    card.setAttribute('onclick', `_egSelectTarget('${m.id}')`);
    card.innerHTML =
        '<span class="eg-target-arrow eg-dynamo-target-pill" style="display:none">' +
            '<span class="eg-target-arrow-icon">▼</span> TARGET <span class="eg-target-arrow-icon">▼</span>' +
        '</span>' +
        '<div class="eg-compact-bars">' +
            '<div class="eg-charge-track-compact"><div class="eg-charge-bar" id="eg-charge-bar-' + m.id + '" style="width:0%"></div></div>' +
            '<div class="eg-hp-track-compact"><div class="eg-hp-bar-compact ' + _egHpBarClass(hpPct) + '" id="eg-hp-bar-' + m.id + '" style="width:' + hpPct + '%"></div></div>' +
        '</div>' +
        '<div class="eg-status-strip" id="eg-status-' + m.id + '"></div>' +
        '<div class="eg-emoji-wrapper">' +
            '<span class="eg-monster-emoji-compact">' + art + '</span>' +
            '<span class="eg-level-bottom-left">' + m.level + '</span>' +
            '<div class="eg-monster-compact-tooltip">' +
                '<div class="eg-tooltip-name">' + m.name + '</div>' +
                '<div class="eg-tooltip-hp" id="eg-hp-label-' + m.id + '">' + m.currentHP + ' / ' + m.maxHP + ' HP</div>' +
            '</div>' +
        '</div>';
    layer.appendChild(card);
    return card;
}

// Keeps target feedback on roaming cards current (the panel rebuild never
// touches this layer). Runs on the damage tick — cheap class toggles.
function _egDynamoSyncCards() {
    if (typeof _egTargetId === 'undefined') return;
    _egDynamoConductors.forEach((rec) => {
        const card = rec.card || document.getElementById('eg-card-' + rec.monsterId);
        if (!card) return;
        const targeted = _egTargetId === rec.monsterId;
        const pill = card.querySelector('.eg-dynamo-target-pill');
        if (pill) pill.style.display = targeted ? '' : 'none';
        const wrap = card.querySelector('.eg-emoji-wrapper');
        if (wrap) wrap.classList.toggle('eg-compact-targeted', targeted);
    });
}

// ── Network geometry + rendering ──────────────────────────────────────────

function _egDynamoFindBoss() {
    if (typeof _egMonsters === 'undefined') return null;
    return _egMonsters.find(m => m && m.isBoss && m.baseId === 'boss_dynamo') || null;
}

// Centre of any monster's card, or null when it has no rendered card.
function _egDynamoCardCenter(monsterId) {
    const el = document.getElementById('eg-card-' + monsterId);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) return null;
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

// Network nodes: the boss card centre + every conductor anchor.
function _egDynamoNodes() {
    const boss = _egDynamoFindBoss();
    if (!boss) return null;
    const b = _egDynamoCardCenter(boss.id);
    if (!b) return null;
    const nodes = [b];
    _egDynamoConductors.forEach((rec) => nodes.push({ x: rec.x, y: rec.y }));
    return nodes;
}

// Beam pairs: boss→every conductor, plus every conductor↔conductor pair.
function _egDynamoBeamSegs(nodes) {
    const segs = [];
    for (let i = 1; i < nodes.length; i++) segs.push([nodes[0], nodes[i]]);
    for (let i = 1; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) segs.push([nodes[i], nodes[j]]);
    }
    return segs;
}

// Jagged lightning between two points. Perf: the D (path data) strings are
// rebuilt from a stored per-segment offset array, so a crackle tick only
// rewrites the `d` attribute of existing <path> nodes — the SVG structure is
// NEVER torn down per tick (innerHTML churn at 130ms was the old FPS sink).
const EG_DYNAMO_JAG_STEP_PX = 45;   // zigzag resolution per beam length

function _egDynamoSegSteps(len) {
    return Math.max(5, Math.min(16, Math.round(len / EG_DYNAMO_JAG_STEP_PX)));
}

// Random perpendicular offsets for a segment's interior zigzag points.
function _egDynamoNewOffsets(len) {
    const steps = _egDynamoSegSteps(len);
    const offs = [];
    for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const midBias = Math.max(0.25, 1 - Math.abs(t - 0.5) * 1.2);
        offs.push((Math.random() * 2 - 1) * 14 * midBias);
    }
    return offs;
}

// Builds a jagged path `d` from endpoints + stored offsets (no randomness —
// so position updates can reuse the exact same lightning shape).
function _egDynamoBuildSegD(a, b, offs) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const steps = offs.length + 1;
    let d = `M ${a.x.toFixed(1)} ${a.y.toFixed(1)}`;
    for (let i = 0; i < offs.length; i++) {
        const t = (i + 1) / steps;
        d += ` L ${(a.x + dx * t + nx * offs[i]).toFixed(1)} ${(a.y + dy * t + ny * offs[i]).toFixed(1)}`;
    }
    d += ` L ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
    return d;
}

function _egDynamoEnsureSvg() {
    let svg = document.getElementById(EG_DYNAMO_SVG_ID);
    if (!svg) {
        svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.id = EG_DYNAMO_SVG_ID;
        document.body.appendChild(svg);
    }
    return svg;
}

function _egDynamoRemoveNet() {
    _egDynamoNet = null;
    const svg = document.getElementById(EG_DYNAMO_SVG_ID);
    if (svg) svg.remove();
}

function _egDynamoEmptySvg(svg) {
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
}

// Persistent network render state. The SVG element tree is built ONCE per
// topology (which conductors exist) and then only mutated in place:
//   fieldPoly/fieldEdge — hull polygons, `points` updated per tick
//   beams               — 's<idx>' → {halo, mid, core} path triplets
//   segs                — [{a, b, key, isBossArc, offs}]
//   p2pIdx/jitterCursor — round-robin budget so conductor↔conductor arcs
//                         re-strike a few per tick instead of all at once
let _egDynamoNet = null;

function _egDynamoSvgEl(tag, cls) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    if (cls) el.setAttribute('class', cls);
    return el;
}

function _egDynamoTopoKey() {
    const ids = [];
    _egDynamoConductors.forEach((r, id) => ids.push(id));
    return ids.join('|');
}

// (Re)creates the SVG structure for the current conductor topology.
function _egDynamoBuildNetStructure(svg, topoKey, nodes) {
    _egDynamoEmptySvg(svg);
    const st = { svg, topoKey, fieldPoly: null, fieldEdge: null, beams: new Map(), segs: [], p2pIdx: [], jitterCursor: 0 };

    if (nodes.length >= 3) {
        const hull = _egConvexHull(nodes);
        if (hull && hull.length >= 3) {
            st.fieldPoly = _egDynamoSvgEl('polygon', 'eg-dynamo-field');
            st.fieldEdge = _egDynamoSvgEl('polygon', 'eg-dynamo-field-edge');
            svg.appendChild(st.fieldPoly);
            svg.appendChild(st.fieldEdge);
        }
    }

    _egDynamoBeamSegs(nodes).forEach(([a, b], i) => {
        const key = 's' + i;
        const halo = _egDynamoSvgEl('path', 'eg-dynamo-beam-halo');
        const mid = _egDynamoSvgEl('path', 'eg-dynamo-beam-mid');
        const core = _egDynamoSvgEl('path', 'eg-dynamo-beam-core');
        svg.appendChild(halo); svg.appendChild(mid); svg.appendChild(core);
        st.beams.set(key, { halo, mid, core });
        st.segs.push({
            a, b, key, ia: i === 0 ? -1 : Math.ceil(i / 1), ib: -1,
            isBossArc: a === nodes[0] || b === nodes[0],
            offs: _egDynamoNewOffsets(Math.hypot(b.x - a.x, b.y - a.y)),
        });
        if (!(a === nodes[0] || b === nodes[0])) st.p2pIdx.push(st.segs.length - 1);
    });
    // Record which node indices each segment connects so per-tick refreshes
    // can re-read CURRENT anchor positions (the boss card can move).
    const n = nodes.length;
    let si = 0;
    for (let i = 1; i < n; i++, si++) { st.segs[si].ia = 0; st.segs[si].ib = i; }
    for (let i = 1; i < n; i++) {
        for (let j = i + 1; j < n; j++, si++) { st.segs[si].ia = i; st.segs[si].ib = j; }
    }
    _egDynamoNet = st;
}

// Updates the network in place. Called on the crackle timer and on any
// roster change. Per tick: 1 getBoundingClientRect (boss anchor), hull math
// on ≤5 points, and `d` rewrites for the boss arcs + a small round-robin
// budget of conductor↔conductor arcs. No element creation, no innerHTML.
function _egDynamoRebuildNet() {
    if (!_egDynamoConductors.size) { _egDynamoRemoveNet(); return; }
    const nodes = _egDynamoNodes();
    const svg = _egDynamoEnsureSvg();
    if (!nodes || nodes.length < 2) { _egDynamoEmptySvg(svg); _egDynamoNet = null; return; }

    const topoKey = _egDynamoTopoKey();
    if (!_egDynamoNet || _egDynamoNet.svg !== svg || _egDynamoNet.topoKey !== topoKey) {
        _egDynamoBuildNetStructure(svg, topoKey, nodes);
    }
    const st = _egDynamoNet;

    // Hull polygons follow the anchors (positions can shift with the boss card).
    if (st.fieldPoly && nodes.length >= 3) {
        const hull = _egConvexHull(nodes);
        if (hull && hull.length >= 3) {
            const pts = hull.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
            st.fieldPoly.setAttribute('points', pts);
            st.fieldEdge.setAttribute('points', pts);
        }
    }

    // Boss arcs re-strike every tick; conductor↔conductor arcs take a
    // round-robin budget so each still re-strikes every ~1–1.5s while the
    // per-tick DOM writes stay flat no matter how many arcs exist.
    const segs = st.segs;
    for (let k = 0; k < EG_DYNAMO_JITTER_BUDGET && st.p2pIdx.length; k++) {
        const s = segs[st.p2pIdx[st.jitterCursor % st.p2pIdx.length]];
        s.offs = _egDynamoNewOffsets(Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y));
        st.jitterCursor++;
    }
    for (const s of segs) {
        s.a = nodes[s.ia]; s.b = nodes[s.ib]; // fresh anchor positions
        if (s.isBossArc) s.offs = _egDynamoNewOffsets(Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y));
        const entry = st.beams.get(s.key);
        const d = _egDynamoBuildSegD(s.a, s.b, s.offs);
        entry.halo.setAttribute('d', d);
        entry.mid.setAttribute('d', d);
        entry.core.setAttribute('d', d);
    }
}

// ── Damage ticks ──────────────────────────────────────────────────────────

function _egDynamoStartTicks() {
    if (!_egDynamoDamageTimer) _egDynamoDamageTimer = setInterval(_egDynamoDamageTick, EG_DYNAMO_TICK_MS);
    if (!_egDynamoCrackleTimer) _egDynamoCrackleTimer = setInterval(_egDynamoRebuildNet, EG_DYNAMO_CRACKLE_MS);
}

function _egDynamoStopTicks() {
    if (_egDynamoDamageTimer) { clearInterval(_egDynamoDamageTimer); _egDynamoDamageTimer = null; }
    if (_egDynamoCrackleTimer) { clearInterval(_egDynamoCrackleTimer); _egDynamoCrackleTimer = null; }
}

function _egDynamoDamageTick() {
    if (typeof _egIsActive === 'function' && !_egIsActive()) { _egClearDynamoConductors(); return; }
    if (typeof dead !== 'undefined' && dead) { _egClearDynamoConductors(); return; }
    if (_egNkFrozen()) return; // paused — hold damage, keep visuals
    if (!_egDynamoConductors.size) { _egDynamoStopTicks(); _egDynamoRemoveNet(); return; }

    _egDynamoSyncCards();

    const nodes = _egDynamoNodes();
    if (!nodes || nodes.length < 2) return;
    const boss = _egDynamoFindBoss();
    const level = boss ? boss.level : 1;
    const pr = _egNkPlayerRect();
    if (!pr) return;
    const dt = EG_DYNAMO_TICK_MS / 1000;
    const now = Date.now();

    // Inner field (convex hull of boss + conductors) — the heavy zone.
    if (nodes.length >= 3) {
        const hull = _egConvexHull(nodes);
        if (hull && hull.length >= 3) {
            const c = { x: pr.left + pr.width / 2, y: pr.top + pr.height / 2 };
            if (_egPointInPolygon(c, hull)) {
                const dealt = _egNkHit(EG_BEAM_HULL_DPS * dt, 'lightning', level);
                if (dealt > 0 && now - _egDynamoLastHullToast > 1000) {
                    _egDynamoLastHullToast = now;
                    _egNkAbilityHitToast(dealt, 'The Dynamo', 'Conduit Field');
                }
            }
        }
    }

    // Beam lines themselves. Reuses the persistent net segments when the
    // renderer has them (same anchors the visuals draw — no duplicate work).
    const segs = (_egDynamoNet && _egDynamoNet.segs.length)
        ? _egDynamoNet.segs.map(s => [s.a, s.b])
        : _egDynamoBeamSegs(nodes);
    const pts = [
        [pr.left + pr.width / 2, pr.top + pr.height / 2],
        [pr.left, pr.top], [pr.right, pr.top],
        [pr.left, pr.bottom], [pr.right, pr.bottom],
    ];
    let onBeam = false;
    for (const [a, b] of segs) {
        for (const [px, py] of pts) {
            if (_egPtSegDist(px, py, a.x, a.y, b.x, b.y) < EG_BEAM_HIT_PAD) { onBeam = true; break; }
        }
        if (onBeam) break;
    }
    if (onBeam) {
        const dealt = _egNkHit(EG_BEAM_DPS * dt, 'lightning', level);
        if (dealt > 0 && now - _egDynamoLastBeamToast > 1000) {
            _egDynamoLastBeamToast = now;
            _egNkAbilityHitToast(dealt, 'The Dynamo', 'Lightning Network');
        }
    }
}

// ── Death / teardown ──────────────────────────────────────────────────────

function _egDynamoDeathBurst(x, y, small) {
    const el = document.createElement('div');
    el.className = 'eg-dynamo-burst' + (small ? ' eg-dynamo-burst-small' : '');
    el.textContent = small ? '✦' : '⚡';
    el.style.left = Math.round(x) + 'px';
    el.style.top = Math.round(y) + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 750);
}

// One conductor died (player kill). Tears down its record + beams; the card
// lingers briefly so the engine's kill-flash animation can play.
function _egRemoveConductor(monsterId) {
    const rec = _egDynamoConductors.get(monsterId);
    if (!rec) return;
    _egDynamoConductors.delete(monsterId);

    _egDynamoDeathBurst(rec.x, rec.y, false);

    const card = rec.card || document.getElementById('eg-card-' + monsterId);
    if (card) {
        card.style.pointerEvents = 'none';
        setTimeout(() => { if (card && card.parentNode) card.parentNode.removeChild(card); }, 850);
    }

    _egDynamoRebuildNet();
    if (!_egDynamoConductors.size) {
        _egDynamoStopTicks();
        _egDynamoRemoveNet();
    }

    try {
        const raw = (typeof t === 'function') ? t('eg_mech_conductor_destroyed') : null;
        showToast(raw && raw !== 'eg_mech_conductor_destroyed'
            ? raw : '⚡ Lightning Conductor destroyed — the network weakens!');
    } catch (e) {}
}

// Full teardown: boss death, encounter stop, or the damage-tick guard.
// Pops every conductor and drops them from the encounter (their charge
// source is gone — no loot, no kill credit).
function _egClearDynamoConductors() {
    _egDynamoStopTicks();

    const cards = [];
    _egDynamoConductors.forEach((rec) => {
        _egDynamoDeathBurst(rec.x, rec.y, false);
        const card = rec.card || document.getElementById('eg-card-' + rec.monsterId);
        if (card) cards.push(card);
    });
    cards.forEach(c => c.remove());

    if (typeof _egMonsters !== 'undefined') {
        _egMonsters = _egMonsters.filter(m => !m || !m.isDynamoConductor);
    }
    _egDynamoConductors.clear();

    const layer = document.getElementById(EG_DYNAMO_LAYER_ID);
    if (layer) layer.remove();
    _egDynamoRemoveNet();
}

// Expose for boss cleanup (boss-framework.js _egBossCleanup).
window._egDynamoTeardown = _egClearDynamoConductors;


// ── Shared geometry helpers (Dynamo-local) ────────────────────────────────

function _egConvexHull(points) {
    if (points.length < 3) return points;
    const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
    const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const lower = [];
    for (const p of sorted) {
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
            lower.pop();
        }
        lower.push(p);
    }
    const upper = [];
    for (let i = sorted.length - 1; i >= 0; i--) {
        const p = sorted[i];
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
            upper.pop();
        }
        upper.push(p);
    }
    lower.pop();
    upper.pop();
    return [...lower, ...upper];
}

function _egPointInPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;
        const intersect = ((yi > point.y) !== (yj > point.y))
            && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

function _egPtSegDist(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const len2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
    return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}
