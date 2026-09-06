//------------------------------------------------------------------------
//-------------------BOSS: THE COIL (boss_coil)----------------------------
//------------------------------------------------------------------------
// Serpent-pit fight: the arena is the Coil's nest and it is crawling.
//
//   PERSISTENT (whole fight, watcher):
//   • THE COILED MAW — the boss itself is a spiral of serpent coils (a
//     rotating 😵-style spiral of 🐍) that slowly slithers around the
//     arena. Touching it is a BITE: shadow damage + a fling.
//   • SEEKER SERPENTS — snakes spawn from the maw on a phase cadence and
//     hunt the player. When one gets close it starts FUSING (blinking),
//     then detonates in a shadow blast. Its path sears a short VENOM
//     TRAIL that lingers and ticks shadow damage if you walk it.
//
//   HP GATES (watcher):
//   • 60% — CONSTRICTOR: the maw coils into a huge spiral pattern that
//     contracts toward the arena center in ring waves — stand in the gaps
//     between rings or be squeezed (heavy shadow damage per ring).
//   • 30% — SERPENT TIDE: the pit boils — a wave of fast chargers crosses
//     the arena from one edge, aimed at your live row/column. Three tides.
//
//   CHARGE ATTACK — COBRA STRIKE: when the boss's attack bar fills, a
//     wide hood-shadow telegraphs a lane through your position, then the
//     maw rears up and strikes across it in one lightning lash.
//
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule + onInit arena)
//   3. UNIQUE mechanic handlers + the persistent watcher
//
// Shared mechanics (frozen_cells) live in shared-boss-abilities.js and are
// referenced by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_coil: {
        id: 'boss_coil', name: 'The Coil', emoji: '🐍',
        baseHP: 1020, baseDamage: 23, chargeMax: 12,
        element: 'shadow', resistances: { fire: 15, cold: 15, lightning: 15, shadow: 30 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_coil: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'frozen_cells', intervalBase: 18000, intervalVariance: 4000, handler: '_egMechFrozenCells', phase2Only: true },
        ],
        onInit: _egCoilArenaInit,
    },
});


// ── Coil tuning ─────────────────────────────────────────────────────────
// The coiled maw
const EG_COIL_R = 56;                        // maw radius (visual + bite hit)
const EG_COIL_SLITHER = [0, 40, 52, 66];     // px/s drift per phase
const EG_COIL_BITE_DMG = [0, 0.05, 0.06, 0.08]; // %maxHP per bite
const EG_COIL_BITE_CD_MS = 900;              // per-touch cooldown
const EG_COIL_BITE_FLING = [0, 150, 175, 200]; // px fling per bite
// Seeker serpents + venom trails
const EG_COIL_SNAKE_INTERVAL_MS = [0, 5200, 4100, 3100]; // spawn cadence
const EG_COIL_SNAKE_ALIVE_MAX = [0, 2, 3, 4]; // concurrent serpent cap
const EG_COIL_SNAKE_SPEED = [0, 85, 100, 118]; // px/s hunt speed
const EG_COIL_SNAKE_TRIGGER_R = 95;          // start fusing when this close
const EG_COIL_FUSE_MS = 800;                 // blinking fuse time
const EG_COIL_BLAST_R = 105;                 // detonation radius
const EG_COIL_BLAST_DMG = [0, 0.12, 0.14, 0.17]; // %maxHP per blast (shadow)
const EG_COIL_TRAIL_LIFE_MS = 3400;          // venom trail lingers
const EG_COIL_TRAIL_DPS = 4;                 // %maxHP/s standing on a trail
// Constrictor (60% gate)
const EG_COIL_CON_RING_N = [0, 3, 4, 5];     // contracting ring waves
const EG_COIL_CON_WARN_MS = 1250;            // per-ring telegraph
const EG_COIL_CON_CONTRACT_MS = 1100;        // ring contracts over this
const EG_COIL_CON_DMG = 0.13;                // %maxHP per ring hit (shadow)
const EG_COIL_CON_GAP_MS = 700;              // between rings
// Serpent tide (30% gate)
const EG_COIL_TIDE_N = 3;                    // tides in the set-piece
const EG_COIL_TIDE_WARN_MS = 1100;           // edge band telegraph
const EG_COIL_TIDE_CHARGERS = [0, 5, 6, 8];  // chargers per tide
const EG_COIL_TIDE_SPEED = 300;              // px/s charger speed
const EG_COIL_TIDE_DMG = 0.09;               // %maxHP per charger hit
// Cobra strike (charge attack)
const EG_COIL_COBRA_WARN_MS = 1050;          // hood-shadow lane telegraph
const EG_COIL_COBRA_STRIKE_MS = 380;         // the lash is live
const EG_COIL_COBRA_H = 92;                  // lane width
const EG_COIL_COBRA_DMG = [0, 0.13, 0.15, 0.18]; // %maxHP by phase


let _egCoilWatcher = null;      // per-fight nest state
let _egCoilCobraActive = false; // a cobra strike set-piece is running


// Sweep every coil overlay off the screen. Safe to call twice.
function _egCoilSweep() {
    _egCoilCobraActive = false;
    try {
        document.querySelectorAll('.eg-coil-maw, .eg-coil-snake, .eg-coil-trail, .eg-coil-ring, .eg-coil-tideband, .eg-coil-charger, .eg-coil-cobra, .eg-coil-cobralash').forEach(el => el.remove());
    } catch (e) {}
}


// Called from _egBossCleanup (boss-framework.js) on boss death / stop.
function _egCoilTeardown() {
    const st = _egCoilWatcher;
    _egCoilWatcher = null;
    if (st && st.run) { try { _egNkKillRun(st.run); } catch (e) {} }
    // Always sweep: on boss death the run's onKill may have nulled the
    // watcher BEFORE this runs — the overlays must go either way.
    _egCoilSweep();
}


function _egCoilArenaInit(monster) {
    if (_egCoilWatcher) return;
    const monsterId = monster ? monster.id : null;
    const st = {
        monsterId, level: monster ? monster.level : 1,
        maw: null,
        snakes: [], trails: [],
        con: null, tide: null,
        snakeAcc: 0,
        gate60Done: false, gate30Done: false,
        everLive: false, bornAt: performance.now(),
    };
    _egCoilWatcher = st;
    _egNkToast('eg_coil_intro', '🐍 The Coil: The pit wakes — the nest is crawling!');
    // Tier-scaled clock: every telegraph breathes with tier.
    // Passive run: lives the whole fight without hogging _egNkDodgeBusy().
    const run = _egNkNewRun(monsterId, true);
    run.passive = true;
    st.run = run;
    run.onKill = () => {
        if (_egCoilWatcher && _egCoilWatcher.run === run) _egCoilWatcher = null;
        _egCoilSweep();
    };

    // The coiled maw: a spiral of coils with a glaring head, slithering
    // around the arena and picking fresh drift targets.
    const mawEl = _egNkEl(run, 'div', 'eg-coil-maw');
    for (let i = 0; i < 6; i++) {
        const coil = document.createElement('div');
        coil.className = 'eg-coil-loop';
        coil.textContent = '🐍';
        coil.style.setProperty('--i', String(i));
        mawEl.appendChild(coil);
    }
    const head = document.createElement('div');
    head.className = 'eg-coil-head';
    head.textContent = '🐍';
    mawEl.appendChild(head);
    const W0 = window.innerWidth, H0 = window.innerHeight;
    const maw = {
        x: W0 / 2, y: H0 * 0.3,
        hx: W0 / 2, hy: H0 * 0.3,
        biteCd: 0,
        el: mawEl,
    };
    st.maw = maw;
    _egCoilPickMawSpot(maw);

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
        const c = _egNkPlayerCenter();
        const p = Math.max(1, Math.min(3, Number(live.bossPhase) || 1));

        // ── HP gates ──
        const hpPct = live.maxHP > 0 ? live.currentHP / live.maxHP : 1;
        if (!st.gate60Done && hpPct <= 0.60) { st.gate60Done = true; _egCoilConstrictor(st, p); }
        if (!st.gate30Done && hpPct <= 0.30) { st.gate30Done = true; _egCoilTide(st, p); }

        // ── The coiled maw ──
        const mw = st.maw;
        const mdx = mw.hx - mw.x, mdy = mw.hy - mw.y;
        const md = Math.hypot(mdx, mdy) || 1;
        const mstep = EG_COIL_SLITHER[p] * dtS;
        if (md <= mstep) { _egCoilPickMawSpot(mw); }
        else { mw.x += (mdx / md) * mstep; mw.y += (mdy / md) * mstep; }
        mw.el.style.transform = 'translate(' + Math.round(mw.x - EG_COIL_R) + 'px,' + Math.round(mw.y - EG_COIL_R) + 'px)';
        if (pr && c && now >= mw.biteCd && _egNkCircleHit(mw.x, mw.y, EG_COIL_R * 0.85, pr, 0)) {
            mw.biteCd = now + EG_COIL_BITE_CD_MS;
            const bdx = c.x - mw.x, bdy = c.y - mw.y;
            const bd = Math.hypot(bdx, bdy) || 1;
            _egNkNudgeAvatar((bdx / bd) * EG_COIL_BITE_FLING[p], (bdy / bd) * EG_COIL_BITE_FLING[p]);
            const dealt = _egNkHit(EG_COIL_BITE_DMG[p], 'shadow', st.level);
            _egNkAbilityHitToast(dealt, 'The Coil', 'Bite');
            try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('coil_hiss'); } catch (e) {}
        }

        // ── Seeker serpents ──
        st.snakeAcc += dtS * 1000;
        const sInt = EG_COIL_SNAKE_INTERVAL_MS[p];
        const aliveMax = EG_COIL_SNAKE_ALIVE_MAX[p];
        if (st.snakeAcc >= sInt && st.snakes.length < aliveMax) {
            st.snakeAcc = 0;
            _egCoilSpawnSnake(st);
        }
        for (let i = st.snakes.length - 1; i >= 0; i--) {
            const s = st.snakes[i];
            s.t += dtS * 1000;
            if (s.state === 'hunt') {
                if (c) {
                    const dx = c.x - s.x, dy = c.y - s.y;
                    const d = Math.hypot(dx, dy) || 1;
                    s.x += (dx / d) * EG_COIL_SNAKE_SPEED[p] * dtS;
                    s.y += (dy / d) * EG_COIL_SNAKE_SPEED[p] * dtS;
                }
                s.el.style.transform = 'translate(' + Math.round(s.x - 22) + 'px,' + Math.round(s.y - 22) + 'px)';
                // Venom trail smear (spaced dots along the path).
                s.trailAcc = (s.trailAcc || 0) + dtS * 1000;
                if (s.trailAcc >= 260) {
                    s.trailAcc = 0;
                    const tr = _egNkEl(st.run, 'div', 'eg-coil-trail');
                    tr.style.left = Math.round(s.x) + 'px';
                    tr.style.top = Math.round(s.y) + 'px';
                    st.trails.push({ x: s.x, y: s.y, t: 0, el: tr });
                }
                const dist = c ? Math.hypot(c.x - s.x, c.y - s.y) : 9999;
                if (dist < EG_COIL_SNAKE_TRIGGER_R || s.t >= 9000) {
                    s.state = 'fuse';
                    s.t = 0;
                    s.el.classList.add('fuse');
                    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('coil_hiss'); } catch (e) {}
                }
            } else if (s.state === 'fuse') {
                if (s.t >= EG_COIL_FUSE_MS) {
                    s.state = 'dead';
                    s.el.classList.add('boom');
                    if (pr && _egNkCircleHit(s.x, s.y, EG_COIL_BLAST_R, pr, 0)) {
                        const dealt = _egNkHit(EG_COIL_BLAST_DMG[p], 'shadow', st.level);
                        _egNkAbilityHitToast(dealt, 'The Coil', 'Serpent Blast');
                    }
                    setTimeout(() => { try { s.el.remove(); } catch (e) {} }, 300);
                    st.snakes.splice(i, 1);
                }
            }
        }
        // Venom trails tick + expire.
        if (st.trails) {
            for (let i = st.trails.length - 1; i >= 0; i--) {
                const tr = st.trails[i];
                tr.t += dtS * 1000;
                if (pr && _egNkCircleHit(tr.x, tr.y, 26, pr, 0)) {
                    _egNkDotTick(st.run, EG_COIL_TRAIL_DPS, dtS, st.level, 'shadow');
                }
                if (tr.t >= EG_COIL_TRAIL_LIFE_MS) {
                    tr.el.classList.add('fade');
                    if (tr.t >= EG_COIL_TRAIL_LIFE_MS + 350) {
                        try { tr.el.remove(); } catch (e) {}
                        st.trails.splice(i, 1);
                    }
                }
            }
        }

        // ── Constrictor rings (60% gate) ──
        if (st.con) {
            const cn = st.con;
            cn.t += dtS * 1000;
            // Spawn the next ring when its slot comes up.
            const due = cn.spawned * (EG_COIL_CON_WARN_MS + EG_COIL_CON_GAP_MS);
            if (cn.spawned < cn.total && cn.t >= due) {
                const idx = cn.spawned;
                const ring = _egNkEl(st.run, 'div', 'eg-coil-ring');
                ring.style.width = ring.style.height = (cn.r0 * 2) + 'px';
                ring.style.left = (cn.cx - cn.r0) + 'px';
                ring.style.top = (cn.cy - cn.r0) + 'px';
                cn.rings.push({ r: cn.r0, t: 0, spawnedAt: cn.t, el: ring, hitDone: false });
                cn.spawned++;
            }
            // Contract active rings.
            let any = false;
            cn.rings.forEach(rg => {
                if (rg.done) return;
                any = true;
                rg.t += dtS * 1000;
                const k = Math.min(1, rg.t / EG_COIL_CON_CONTRACT_MS);
                const r = cn.r0 * (1 - k) + 30 * k;
                rg.el.style.width = rg.el.style.height = (r * 2) + 'px';
                rg.el.style.left = (cn.cx - r) + 'px';
                rg.el.style.top = (cn.cy - r) + 'px';
                if (!rg.hitDone && pr && Math.abs(Math.hypot(c.x - cn.cx, c.y - cn.cy) - r) < 34) {
                    rg.hitDone = true;
                    const dealt = _egNkHit(EG_COIL_CON_DMG, 'shadow', st.level);
                    _egNkAbilityHitToast(dealt, 'The Coil', 'Constrictor');
                }
                if (k >= 1) { rg.done = true; try { rg.el.remove(); } catch (e) {} }
            });
            if (!any && cn.spawned >= cn.total) st.con = null;
        }

        // ── Serpent tide (30% gate) ──
        if (st.tide) {
            const td = st.tide;
            td.t += dtS * 1000;
            if (td.phase === 'warn' && td.t >= EG_COIL_TIDE_WARN_MS) {
                td.phase = 'charge';
                td.t = 0;
                try { td.bandEl.classList.add('hot'); } catch (e) {}
                for (let i = 0; i < td.n; i++) {
                    const el = _egNkEl(st.run, 'div', 'eg-coil-charger', '🐍');
                    const spread = (i / Math.max(1, td.n - 1) - 0.5) * 240;
                    const ch = {
                        x: td.fx, y: td.fy + spread,
                        vx: td.dirX * EG_COIL_TIDE_SPEED, vy: 0,
                        el, hit: false,
                    };
                    td.chargers.push(ch);
                }
                try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('coil_hiss'); } catch (e) {}
            } else if (td.phase === 'charge') {
                for (let i = td.chargers.length - 1; i >= 0; i--) {
                    const ch = td.chargers[i];
                    ch.x += ch.vx * dtS;
                    ch.el.style.transform = 'translate(' + Math.round(ch.x - 18) + 'px,' + Math.round(ch.y - 18) + 'px)';
                    if (pr && !ch.hit && _egNkCircleHit(ch.x, ch.y, 18, pr, 0)) {
                        ch.hit = true;
                        const dealt = _egNkHit(EG_COIL_TIDE_DMG, 'shadow', st.level);
                        _egNkAbilityHitToast(dealt, 'The Coil', 'Serpent Tide');
                    }
                    const off = ch.x < -50 || ch.x > window.innerWidth + 50;
                    if (off || ch.hit) { try { ch.el.remove(); } catch (e) {} td.chargers.splice(i, 1); }
                }
                if (td.chargers.length === 0) {
                    try { td.bandEl.remove(); } catch (e) {}
                    td.tide++;
                    if (td.tide >= EG_COIL_TIDE_N) {
                        st.tide = null;
                    } else {
                        td.phase = 'warn';
                        td.t = 0;
                        td.dirX = Math.random() < 0.5 ? 1 : -1;
                        td.fx = td.dirX === 1 ? -30 : window.innerWidth + 30;
                        // Re-aim each tide at the player's live row.
                        const c2 = _egNkPlayerCenter();
                        td.fy = c2 ? Math.max(90, Math.min(window.innerHeight - 90, c2.y))
                                   : 80 + Math.random() * Math.max(60, window.innerHeight - 220);
                        const band = _egNkEl(st.run, 'div', 'eg-coil-tideband');
                        band.style.top = Math.round(td.fy - 70) + 'px';
                        band.style.height = '140px';
                        if (td.dirX === -1) band.classList.add('flip');
                        td.bandEl = band;
                    }
                }
            }
        }

        return true;
    });
}


// Picks a fresh maw drift spot a good distance from the current one.
function _egCoilPickMawSpot(mw) {
    const W = window.innerWidth, H = window.innerHeight;
    const pad = 120;
    let x = W / 2, y = H / 2;
    for (let tries = 0; tries < 8; tries++) {
        x = pad + Math.random() * Math.max(60, W - pad * 2);
        y = pad + Math.random() * Math.max(60, H - pad * 2);
        if (Math.hypot(x - mw.hx, y - mw.hy) > 240) break;
    }
    mw.hx = x; mw.hy = y;
}


function _egCoilSpawnSnake(st) {
    const el = _egNkEl(st.run, 'div', 'eg-coil-snake', '🐍');
    // Emerge from the maw.
    const s = {
        x: st.maw.x, y: st.maw.y,
        t: 0, trailAcc: 0, state: 'hunt', el,
    };
    st.snakes.push(s);
}


// ── 60% gate: Constrictor ───────────────────────────────────────────────
// Huge spiral rings contract toward the arena center — stand in the gaps.
function _egCoilConstrictor(st, p) {
    if (st.con) return; // re-entry guard: never orphan a running set-piece
    const c = _egNkPlayerCenter() || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const r0 = Math.hypot(window.innerWidth, window.innerHeight) * 0.42;
    st.con = {
        t: 0, spawned: 0,
        total: EG_COIL_CON_RING_N[p],
        r0, cx: c.x, cy: c.y,
        rings: [],
    };
    _egNkToast('eg_coil_constrictor', '🐍 CONSTRICTOR! Stand between the rings!');
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('coil_hiss'); } catch (e) {}
}


// ── 30% gate: Serpent Tide ──────────────────────────────────────────────
function _egCoilTide(st, p) {
    if (st.tide) return; // re-entry guard: never orphan a running set-piece
    const dirX = Math.random() < 0.5 ? 1 : -1;
    const fx = dirX === 1 ? -30 : window.innerWidth + 30;
    // Aim the tide lane at the player's live row — a real threat to dodge.
    const c = _egNkPlayerCenter();
    const fy = c ? Math.max(90, Math.min(window.innerHeight - 90, c.y))
                 : 80 + Math.random() * Math.max(60, window.innerHeight - 220);
    const band = _egNkEl(st.run, 'div', 'eg-coil-tideband');
    band.style.top = Math.round(fy - 70) + 'px';
    band.style.height = '140px';
    if (dirX === -1) band.classList.add('flip');
    st.tide = {
        phase: 'warn', t: 0, tide: 0,
        n: EG_COIL_TIDE_CHARGERS[p],
        dirX, fx, fy, bandEl: band, chargers: [],
    };
    _egNkToast('eg_coil_tide', '🐍 SERPENT TIDE! The pit boils — dodge the chargers!');
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('coil_hiss'); } catch (e) {}
}


//------------------------------------------------------------------------
//-------------------CHARGE ATTACK: COBRA STRIKE---------------------------
//------------------------------------------------------------------------
// A wide hood-shadow telegraphs a lane through your position, then the
// maw rears up and strikes across it in one lightning lash.
// Wired from _egFireMonsterAttack (endgame-encounter.js).

function _egCoilCobraStrike(monster) {
    if (_egCoilCobraActive || _egNkDodgeBusy() || _egNkFrozen()) return;
    const st = _egCoilWatcher;
    const p = Math.max(1, Math.min(3, Number(monster && monster.bossPhase) || 1));
    const level = monster ? monster.level : 1;
    const run = _egNkNewRun(monster ? monster.id : null, true);
    _egCoilCobraActive = true;
    run.onKill = () => { _egCoilCobraActive = false; };
    const c = _egNkPlayerCenter();
    const cy = c ? c.y : window.innerHeight / 2;
    const fromLeft = Math.random() < 0.5;
    const lane = _egNkEl(run, 'div', 'eg-coil-cobra' + (fromLeft ? '' : ' flip'));
    lane.style.top = Math.round(cy - EG_COIL_COBRA_H / 2) + 'px';
    lane.style.height = EG_COIL_COBRA_H + 'px';
    _egNkToast('eg_coil_cobra', '🐍 COBRA STRIKE! Get out of its lane!');
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('coil_hiss'); } catch (e) {}
    let t = 0, hit = false;
    _egNkLoop(run, (dtS) => {
        t += dtS * 1000;
        if (t >= EG_COIL_COBRA_WARN_MS && !hit) {
            lane.classList.add('strike');
            const pr = _egNkPlayerRect();
            if (pr) {
                const top = cy - EG_COIL_COBRA_H / 2, bottom = cy + EG_COIL_COBRA_H / 2;
                if (pr.bottom > top && pr.top < bottom) {
                    hit = true;
                    const dealt = _egNkHit(EG_COIL_COBRA_DMG[p], 'shadow', level);
                    _egNkAbilityHitToast(dealt, 'The Coil', 'Cobra Strike');
                }
            }
        }
        if (t >= EG_COIL_COBRA_WARN_MS + EG_COIL_COBRA_STRIKE_MS) return false;
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------LEGACY COMPAT SHIM------------------------------------
//------------------------------------------------------------------------
// The old scheduled Seeker Snakes are now the persistent nest — keep the
// handler name alive so any stale schedule entry no-ops instead of erroring.
function _egMechSeekerSnakes() { void 0; }
