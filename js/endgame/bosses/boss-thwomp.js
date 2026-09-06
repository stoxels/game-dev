//------------------------------------------------------------------------
//-------------------BOSS: THE THWOMP (boss_thwomp)------------------------
//------------------------------------------------------------------------
// Mario-homage siege fight: the fortress guardian — a giant stone block
// that hovers over the arena and never stops trying to flatten you.
//
//   PERSISTENT (whole fight, watcher):
//   • THE HOVERING BLOCK — the Thwomp itself hangs mid-arena, bobbing and
//     glaring (angry face). It never attacks directly; it ORCHESTRATES.
//   • QUAKE STOMPS — the block periodically SLAMS DOWN where it hovers:
//     a growing dust ring telegraphs, then the whole block crashes down
//     with a shockwave. Anyone in the impact circle takes heavy damage and
//     gets flung outward. It then floats back up, drifting to a new spot.
//
//   HP GATES (watcher):
//   • 60% — CEILING COLLAPSE: rubble warning marks bloom across the arena,
//     then stones rain down in sequence. Aftershock dust clouds linger.
//   • 30% — MINI-THWOMP SIEGE: the guardian summons 3–5 mini blocks that
//     hop after you Mario-style, each slamming where it lands. While the
//     siege runs, the big block quake-stomps on a faster cadence.
//
//   CHARGE ATTACK — GRAND SLAM: when the boss's attack bar fills, a shadow
//   marker stalks your avatar and LOCKS (the classic Thwomp tell), then
//   the whole block teleports overhead and crashes down on the mark with
//   a huge shockwave ring. The block's signature kill move.
//
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule + onInit arena)
//   3. UNIQUE mechanic handlers + the persistent watcher
//
// Shared mechanics (soul_tithe, corrupt_cells) live in
// shared-boss-abilities.js and are referenced by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_thwomp: {
        id: 'boss_thwomp', name: 'The Thwomp', emoji: '🪨',
        baseHP: 1120, baseDamage: 25, chargeMax: 13,
        element: null, resistances: { fire: 10, cold: 10, lightning: 10, shadow: 10 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_thwomp: {
        phases: [
            { threshold: 1.00, chargeMax: 13, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'soul_tithe', intervalBase: 23000, intervalVariance: 5000, handler: '_egMechSoulTithe' },
            { name: 'corrupt_cells', intervalBase: 17000, intervalVariance: 4000, handler: '_egMechCorruptCells' },
        ],
        onInit: _egThwompArenaInit,
    },
});


// ── Thwomp tuning ───────────────────────────────────────────────────────
// The hovering block
const EG_THW_R = 62;                          // half-size of the block (visual + hit)
const EG_THW_HOVER_SPEED = [0, 26, 34, 44];   // px/s drift while hovering
const EG_THW_STOMP_INTERVAL_MS = [0, 8200, 6400, 4800]; // quake stomp cadence
const EG_THW_STOMP_WARN_MS = 1000;            // dust-ring telegraph
const EG_THW_STOMP_CRASH_MS = 320;            // the drop itself
const EG_THW_STOMP_R = 120;                   // impact circle radius
const EG_THW_STOMP_DMG = [0, 0.14, 0.16, 0.19]; // %maxHP per quake stomp
const EG_THW_STOMP_FLING = [0, 190, 220, 250];  // px outward fling
// Ceiling collapse (60% gate)
const EG_THW_COLLAPSE_MARKS = [0, 6, 8, 10];  // rubble marks per boss phase
const EG_THW_COLLAPSE_MARK_MS = 1150;         // per-mark telegraph
const EG_THW_COLLAPSE_STAGGER_MS = 380;       // between marks
const EG_THW_COLLAPSE_DMG = 0.11;             // %maxHP per falling stone
const EG_THW_AFTERSHOCK_MS = 2600;            // dust cloud lingers (visual)
// Mini-thwomp siege (30% gate)
const EG_THW_MINI_N = [0, 3, 4, 5];           // minis per boss phase
const EG_THW_MINI_HOP_MS = 700;               // per hop
const EG_THW_MINI_SPEED = [0, 150, 165, 180]; // px/s hop-chase speed
const EG_THW_MINI_R = 34;                     // impact radius per mini slam
const EG_THW_MINI_DMG = 0.08;                 // %maxHP per mini slam
const EG_THW_MINI_SIEGE_MS = 12000;           // siege duration
// Grand Slam (charge attack)
const EG_THW_GS_FOLLOW_MS = 1000;             // shadow marker stalks you
const EG_THW_GS_LOCK_MS = 550;                // the lock tell
const EG_THW_GS_FALL_MS = 420;                // block drop time
const EG_THW_GS_DMG = [0, 0.24, 0.28, 0.34];  // %maxHP (the signature hit)
const EG_THW_GS_SHOCK_R = 200;                // shockwave ring radius
const EG_THW_GS_SHOCK_DMG = [0, 0.08, 0.09, 0.11]; // %maxHP shockwave edge


let _egThwWatcher = null;      // per-fight guardian state
let _egThwGrandSlamActive = false;


// Sweep every thwomp overlay off the screen. Safe to call twice.
function _egThwompSweep() {
    _egThwGrandSlamActive = false;
    try {
        document.querySelectorAll('.eg-thw-block, .eg-thw-ring, .eg-thw-mark, .eg-thw-stone, .eg-thw-cloud, .eg-thw-mini, .eg-thw-gs-mark, .eg-thw-shock, .eg-thw-crash').forEach(el => el.remove());
    } catch (e) {}
}


// Called from _egBossCleanup (boss-framework.js) on boss death / stop.
function _egThwompTeardown() {
    const st = _egThwWatcher;
    _egThwWatcher = null;
    if (st && st.run) { try { _egNkKillRun(st.run); } catch (e) {} }
    // Always sweep: on boss death the run's onKill may have nulled the
    // watcher BEFORE this runs — the overlays must go either way.
    _egThwompSweep();
}


function _egThwompArenaInit(monster) {
    if (_egThwWatcher) return;
    const monsterId = monster ? monster.id : null;
    const st = {
        monsterId, level: monster ? monster.level : 1,
        block: null,
        quakeAcc: 0, collapse: null, siege: null,
        gate60Done: false, gate30Done: false,
        everLive: false, bornAt: performance.now(),
    };
    _egThwWatcher = st;
    _egNkToast('eg_thwomp_intro', '🪨 The Thwomp: The guardian wakes — respect the block!');
    // Tier-scaled clock: every telegraph breathes with tier.
    // Passive run: lives the whole fight without hogging _egNkDodgeBusy().
    const run = _egNkNewRun(monsterId, true);
    run.passive = true;
    st.run = run;
    run.onKill = () => {
        if (_egThwWatcher && _egThwWatcher.run === run) _egThwWatcher = null;
        _egThwompSweep();
    };

    // The hovering block: big angry stone face, drifts to a new hover spot
    // after every stomp.
    const blockEl = _egNkEl(run, 'div', 'eg-thw-block', '🪨');
    const W0 = window.innerWidth, H0 = window.innerHeight;
    const block = {
        x: W0 / 2, y: H0 * 0.28,
        hx: W0 / 2, hy: H0 * 0.28, // current hover target
        phase: 'hover', t: 0,
        el: blockEl,
    };
    st.block = block;
    _egThwPickHoverSpot(block);

    _egNkLoop(run, (dtS, now) => {
        const live = (typeof _egMonsters !== 'undefined' && _egMonsters)
            ? (_egMonsters.find(m => m && m.id === st.monsterId) || null) : null;
        // Boss not registered yet → wait for it (spawn races the arena init);
        // boss vanished AFTER being live → the fight is over, tear down.
        if (!live) {
            if (!st.everLive) return (now - st.bornAt < 20000);
            return false;
        }
        st.everLive = true;

        const pr = _egNkPlayerRect();
        const p = Math.max(1, Math.min(3, Number(live.bossPhase) || 1));

        // ── HP gates ──
        const hpPct = live.maxHP > 0 ? live.currentHP / live.maxHP : 1;
        if (!st.gate60Done && hpPct <= 0.60) { st.gate60Done = true; _egThwCollapse(st, p); }
        if (!st.gate30Done && hpPct <= 0.30) { st.gate30Done = true; _egThwSiege(st, p); }

        // ── The hovering block + quake stomps ──
        const b = st.block;
        b.t += dtS * 1000;
        if (b.phase === 'hover') {
            // Drift toward the hover spot; pick a new one on arrival.
            const dx = b.hx - b.x, dy = b.hy - b.y;
            const d = Math.hypot(dx, dy) || 1;
            const step = EG_THW_HOVER_SPEED[p] * dtS;
            if (d <= step) {
                b.x = b.hx; b.y = b.hy;
                if (b.t >= 1200) _egThwPickHoverSpot(b);
            } else {
                b.x += (dx / d) * step;
                b.y += (dy / d) * step;
            }
            // Quake stomp cadence.
            st.quakeAcc += dtS * 1000;
            const qInt = (st.siege ? EG_THW_STOMP_INTERVAL_MS[p] * 0.6 : EG_THW_STOMP_INTERVAL_MS[p]);
            if (st.quakeAcc >= qInt) {
                st.quakeAcc = 0;
                b.phase = 'stomp-warn';
                b.t = 0;
                const ring = _egNkEl(st.run, 'div', 'eg-thw-ring');
                ring.style.left = Math.round(b.x) + 'px';
                ring.style.top = Math.round(b.y) + 'px';
                ring.style.width = ring.style.height = (EG_THW_STOMP_R * 2) + 'px';
                st.quakeRing = ring;
                _egNkToast('eg_thwomp_quake', '🪨 QUAKE STOMP! Clear the dust ring!');
                try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('thwomp_slam'); } catch (e) {}
            }
        } else if (b.phase === 'stomp-warn') {
            if (b.t >= EG_THW_STOMP_WARN_MS) {
                b.phase = 'crash';
                b.t = 0;
                b.el.classList.add('crash');
                try { if (st.quakeRing) st.quakeRing.classList.add('hot'); } catch (e) {}
            }
        } else if (b.phase === 'crash') {
            if (b.t >= EG_THW_STOMP_CRASH_MS) {
                // Impact: damage circle + fling outward, then rise again.
                b.el.classList.remove('crash');
                try { if (st.quakeRing) { st.quakeRing.remove(); st.quakeRing = null; } } catch (e) {}
                const c = _egNkPlayerCenter();
                if (pr && _egNkCircleHit(b.x, b.y, EG_THW_STOMP_R, pr, 0)) {
                    const dealt = _egNkHit(EG_THW_STOMP_DMG[p], null, st.level);
                    _egNkAbilityHitToast(dealt, 'The Thwomp', 'Quake Stomp');
                    if (c) {
                        const dx = c.x - b.x, dy = c.y - b.y;
                        const d = Math.hypot(dx, dy) || 1;
                        // Animated fling (contact at the impact): glide +
                        // tumble + burst instead of a raw teleport.
                        _egNkFlingAvatar((dx / d) * EG_THW_STOMP_FLING[p], (dy / d) * EG_THW_STOMP_FLING[p], b.x, b.y);
                    }
                }
                _egThwShockRing(st, b.x, b.y, EG_THW_STOMP_R, 0.5);
                try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('thwomp_slam'); } catch (e) {}
                b.phase = 'hover';
                b.t = 0;
                _egThwPickHoverSpot(b);
            }
        }
        b.el.style.transform = 'translate(' + Math.round(b.x - EG_THW_R) + 'px,' + Math.round(b.y - EG_THW_R) + 'px)' + (b.phase === 'crash' ? ' scale(1.12)' : '');

        // ── Ceiling collapse (60% gate) ──
        if (st.collapse) {
            const cl = st.collapse;
            cl.t += dtS * 1000;
            // Spawn marks on the stagger schedule.
            while (cl.next < cl.marks.length && cl.t >= cl.next * EG_THW_COLLAPSE_STAGGER_MS) {
                const mk = cl.marks[cl.next];
                mk.stage = 'warn';
                mk.t = 0;
                mk.el = _egNkEl(st.run, 'div', 'eg-thw-mark');
                mk.el.style.left = Math.round(mk.x - 44) + 'px';
                mk.el.style.top = Math.round(mk.y - 44) + 'px';
                cl.next++;
            }
            // Advance active marks.
            cl.marks.forEach(mk => {
                if (mk.stage === 'warn') {
                    mk.t += dtS * 1000;
                    if (mk.t >= EG_THW_COLLAPSE_MARK_MS) {
                        mk.stage = 'done';
                        try { mk.el.remove(); } catch (e) {}
                        const stone = _egNkEl(st.run, 'div', 'eg-thw-stone', '🪨');
                        stone.style.left = Math.round(mk.x) + 'px';
                        stone.style.top = Math.round(mk.y) + 'px';
                        setTimeout(() => { try { stone.remove(); } catch (e) {} }, 320);
                        if (pr && _egNkCircleHit(mk.x, mk.y, 46, pr, 0)) {
                            const dealt = _egNkHit(EG_THW_COLLAPSE_DMG, null, st.level);
                            _egNkAbilityHitToast(dealt, 'The Thwomp', 'Collapse');
                        }
                        // Aftershock dust cloud.
                        const cloud = _egNkEl(st.run, 'div', 'eg-thw-cloud');
                        cloud.style.left = Math.round(mk.x) + 'px';
                        cloud.style.top = Math.round(mk.y) + 'px';
                        setTimeout(() => { try { cloud.remove(); } catch (e) {} }, EG_THW_AFTERSHOCK_MS);
                    }
                }
            });
            if (cl.next >= cl.marks.length && cl.marks.every(mk => mk.stage === 'done')) {
                st.collapse = null;
            }
        }

        // ── Mini-thwomp siege (30% gate) ──
        if (st.siege) {
            const sg = st.siege;
            sg.t += dtS * 1000;
            let active = false;
            sg.minis.forEach(mn => {
                if (mn.dead) return;
                active = true;
                mn.t += dtS * 1000;
                if (mn.phase === 'chase') {
                    // Hop-chase: move toward the player in hops.
                    mn.hopAcc += dtS * 1000;
                    const c = _egNkPlayerCenter();
                    if (c) {
                        const dx = c.x - mn.x, dy = c.y - mn.y;
                        const d = Math.hypot(dx, dy) || 1;
                        if (mn.hopAcc >= EG_THW_MINI_HOP_MS) {
                            mn.hopAcc = 0;
                            mn.hopVx = (dx / d) * EG_THW_MINI_SPEED[p];
                            mn.hopVy = (dy / d) * EG_THW_MINI_SPEED[p];
                            mn.hopZ = 1; // hop arc trigger
                        }
                        if (mn.hopVx != null) {
                            mn.x += mn.hopVx * dtS;
                            mn.y += mn.hopVy * dtS;
                        }
                    }
                    const hopScale = mn.hopZ > 0 ? 1 + Math.sin(Math.min(1, mn.hopAcc / EG_THW_MINI_HOP_MS) * Math.PI) * 0.22 : 1;
                    mn.el.style.transform = 'translate(' + Math.round(mn.x - 20) + 'px,' + Math.round(mn.y - 20 - hopScale * 10) + 'px) scale(' + hopScale.toFixed(2) + ')';
                    if (mn.hopAcc >= EG_THW_MINI_HOP_MS * 0.9 && c && Math.hypot(c.x - mn.x, c.y - mn.y) < 130) {
                        mn.phase = 'slam-warn';
                        mn.t = 0;
                        mn.ring = _egNkEl(st.run, 'div', 'eg-thw-ring mini');
                        mn.ring.style.left = Math.round(mn.x) + 'px';
                        mn.ring.style.top = Math.round(mn.y) + 'px';
                        mn.ring.style.width = mn.ring.style.height = (EG_THW_MINI_R * 2) + 'px';
                    }
                } else if (mn.phase === 'slam-warn') {
                    mn.t += dtS * 1000;
                    if (mn.t >= EG_THW_STOMP_WARN_MS) {
                        mn.phase = 'chase';
                        mn.t = 0;
                        try { if (mn.ring) { mn.ring.remove(); mn.ring = null; } } catch (e) {}
                        const prNow = _egNkPlayerRect();
                        if (prNow && _egNkCircleHit(mn.x, mn.y, EG_THW_MINI_R, prNow, 0)) {
                            const dealt = _egNkHit(EG_THW_MINI_DMG, null, st.level);
                            _egNkAbilityHitToast(dealt, 'The Thwomp', 'Mini Slam');
                        }
                        _egThwShockRing(st, mn.x, mn.y, EG_THW_MINI_R, 0.3);
                        try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('thwomp_slam'); } catch (e) {}
                    }
                }
            });
            if (sg.t >= EG_THW_MINI_SIEGE_MS || !active) {
                sg.minis.forEach(mn => {
                    try { if (mn.ring) mn.ring.remove(); } catch (e) {}
                    try { mn.el.remove(); } catch (e) {}
                });
                st.siege = null;
            }
        }

        return true;
    });
}


// Picks a fresh hover spot away from the current one, inside the arena.
function _egThwPickHoverSpot(b) {
    const W = window.innerWidth, H = window.innerHeight;
    const pad = 130;
    let x = W / 2, y = H / 2;
    for (let tries = 0; tries < 8; tries++) {
        x = pad + Math.random() * Math.max(60, W - pad * 2);
        y = pad + Math.random() * Math.max(60, H - pad * 2);
        if (Math.hypot(x - b.hx, y - b.hy) > 260) break;
    }
    b.hx = x; b.hy = y; b.t = 0;
}


// Expanding shockwave ring (visual punctuation for any slam).
function _egThwShockRing(st, x, y, r, power) {
    const ring = _egNkEl(st.run, 'div', 'eg-thw-shock');
    ring.style.left = Math.round(x) + 'px';
    ring.style.top = Math.round(y) + 'px';
    ring.style.setProperty('--eg-thw-r', (r * 2.4) + 'px');
    ring.style.setProperty('--eg-thw-pow', String(power));
    setTimeout(() => { try { ring.remove(); } catch (e) {} }, 600);
}


// ── 60% gate: Ceiling Collapse ──────────────────────────────────────────
function _egThwCollapse(st, p) {
    const W = window.innerWidth, H = window.innerHeight;
    const n = EG_THW_COLLAPSE_MARKS[p];
    const marks = [];
    for (let i = 0; i < n; i++) {
        marks.push({
            x: 90 + Math.random() * Math.max(120, W - 180),
            y: 90 + Math.random() * Math.max(120, H - 180),
            stage: 'idle', t: 0, el: null,
        });
    }
    st.collapse = { t: 0, marks, next: 0 };
    _egNkToast('eg_thwomp_collapse', '🪨 CEILING COLLAPSE! Watch the rubble marks!');
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('thwomp_slam'); } catch (e) {}
}


// ── 30% gate: Mini-thwomp Siege ─────────────────────────────────────────
function _egThwSiege(st, p) {
    const n = EG_THW_MINI_N[p];
    const minis = [];
    for (let i = 0; i < n; i++) {
        const el = _egNkEl(st.run, 'div', 'eg-thw-mini', '🪨');
        const mn = {
            x: window.innerWidth * (0.2 + Math.random() * 0.6),
            y: window.innerHeight * (0.2 + Math.random() * 0.6),
            phase: 'chase', t: 0, hopAcc: 0, hopVx: null, hopVy: null, hopZ: 0,
            el,
        };
        minis.push(mn);
    }
    st.siege = { t: 0, minis };
    _egNkToast('eg_thwomp_siege', '🪨 MINI-THWOMP SIEGE! The blocks multiply!');
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('thwomp_slam'); } catch (e) {}
}


//------------------------------------------------------------------------
//-------------------CHARGE ATTACK: GRAND SLAM-----------------------------
//------------------------------------------------------------------------
// A shadow marker stalks your avatar and locks (the classic Thwomp tell),
// then the whole block teleports overhead and crashes onto the mark with a
// huge shockwave ring. Wired from _egFireMonsterAttack (endgame-encounter.js).

function _egThwompGrandSlam(monster) {
    if (_egThwGrandSlamActive || _egNkDodgeBusy() || _egNkFrozen()) return;
    const st = _egThwWatcher;
    const p = Math.max(1, Math.min(3, Number(monster && monster.bossPhase) || 1));
    const level = monster ? monster.level : 1;
    const run = _egNkNewRun(monster ? monster.id : null, true);
    _egThwGrandSlamActive = true;
    run.onKill = () => { _egThwGrandSlamActive = false; };
    const mark = _egNkEl(run, 'div', 'eg-thw-gs-mark');
    mark.style.width = mark.style.height = (EG_THW_STOMP_R * 1.9) + 'px';
    _egNkToast('eg_thwomp_gs', '🪨 GRAND SLAM! Get out from under the block!');
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('thwomp_slam'); } catch (e) {}
    let t = 0, stage = 'follow', x = 0, y = 0, hit = false, shocked = false;
    const crashEl = _egNkEl(run, 'div', 'eg-thw-crash', '🪨');
    crashEl.style.opacity = '0';
    _egNkLoop(run, (dtS) => {
        t += dtS * 1000;
        if (stage === 'follow') {
            const c = _egNkPlayerCenter();
            if (c) { x = c.x; y = c.y; }
            mark.style.left = Math.round(x - EG_THW_STOMP_R * 0.95) + 'px';
            mark.style.top = Math.round(y - EG_THW_STOMP_R * 0.95) + 'px';
            if (t >= EG_THW_GS_FOLLOW_MS) { stage = 'lock'; t = 0; mark.classList.add('lock'); }
        } else if (stage === 'lock') {
            if (t >= EG_THW_GS_LOCK_MS) {
                stage = 'fall';
                t = 0;
                mark.classList.add('hot');
                crashEl.style.opacity = '1';
            }
        } else if (stage === 'fall') {
            // Drop: animate the crash block from above the mark.
            const k = Math.min(1, t / EG_THW_GS_FALL_MS);
            crashEl.style.left = Math.round(x - EG_THW_R) + 'px';
            crashEl.style.top = Math.round(y - EG_THW_R - (1 - k) * 420) + 'px';
            if (k >= 1 && !shocked) {
                shocked = true;
                _egThwShockRing(st, x, y, EG_THW_GS_SHOCK_R * 0.55, 0.9);
            }
            if (t >= EG_THW_GS_FALL_MS + 120) {
                const pr = _egNkPlayerRect();
                if (!hit && _egNkCircleHit(x, y, EG_THW_STOMP_R, pr, 0)) {
                    hit = true;
                    const dealt = _egNkHit(EG_THW_GS_DMG[p], null, level);
                    _egNkAbilityHitToast(dealt, 'The Thwomp', 'Grand Slam');
                }
                // Shockwave edge: anyone just outside the core still gets clipped.
                const c = _egNkPlayerCenter();
                if (c && !hit) {
                    const d = Math.hypot(c.x - x, c.y - y);
                    if (d <= EG_THW_GS_SHOCK_R && d > EG_THW_STOMP_R) {
                        const dealt = _egNkHit(EG_THW_GS_SHOCK_DMG[p], null, level);
                        _egNkAbilityHitToast(dealt, 'The Thwomp', 'Shockwave');
                    }
                }
                mark.remove();
                crashEl.remove();
                _egThwShockRing(st, x, y, EG_THW_GS_SHOCK_R * 0.55, 0.9);
                if (st && st.block) {
                    // The guardian reappears at its hover spot after the slam.
                    st.block.phase = 'hover';
                    st.block.t = 0;
                    _egThwPickHoverSpot(st.block);
                }
                return false;
            }
        }
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------LEGACY COMPAT SHIM------------------------------------
//------------------------------------------------------------------------
// The old scheduled Crushing Slam is now the persistent arena — keep the
// handler name alive so any stale schedule entry no-ops instead of erroring.
function _egMechThwompSlam() { void 0; }
