//------------------------------------------------------------------------
//-------------------BOSS: THE BUMPER (boss_bumper)------------------------
//------------------------------------------------------------------------
// Carnival-ring fight: the arena becomes a pinball table that fights you.
//
//   PERSISTENT (whole fight, watcher):
//   • ROAMING BUMPERS — 2–3 carnival bumpers drift around the arena.
//     Touching one THWACKS you: a heavy fling across the screen plus a
//     physical hit. They drift faster and fling harder every phase.
//   • PINBALL SHOWER — steel pinballs roll in from a screen edge on a
//     phase-scaled cadence, bouncing off the arena walls. Contact hurts.
//
//   HP GATES (watcher):
//   • 60% — TILT! FLIPPER FRENZY: giant flippers materialize in the bottom
//     corners and slap telegraphed arc bands across the lower arena
//     (warn → strike → retract, alternating). Contact is a heavy physical
//     hit. While the flippers rage, the bumpers go TILT: red-hot, drifting
//     faster, flinging farther.
//   • 30% — MULTIBALL RUSH: the machine coughs up 6–9 live pinballs that
//     ricochet off every wall at high speed for 12s. Survive the rush.
//
//   CHARGE ATTACK — BUMPER SLAM: when the boss's attack bar fills, a target
//   ring telegraphs on your position (~1s), then a giant bumper slams down:
//   anyone inside the ring takes a heavy hit AND gets flung away from the
//   impact. No generic projectile on top.
//
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule + onInit arena)
//   3. UNIQUE mechanic handlers + the persistent watcher
//
// Shared mechanics (fog_bank) live in shared-boss-abilities.js and are
// referenced by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_bumper: {
        id: 'boss_bumper', name: 'The Bumper', emoji: '🎪',
        baseHP: 950, baseDamage: 20, chargeMax: 12,
        element: null, resistances: { fire: 10, cold: 10, lightning: 10, shadow: 10 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_bumper: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.45 },
            { threshold: 0.30, chargeMax: 7, damageMultiplier: 1.90 },
        ],
        immunityDuration: 2200,
        mechanics: [
            { name: 'fog_bank', intervalBase: 24000, intervalVariance: 6000, handler: '_egMechFogBank' },
        ],
        onInit: _egBumperArenaInit,
    },
});


// ── Carnival tuning ─────────────────────────────────────────────────────
// Roaming bumpers
const EG_BUMP_BUMPER_N = [0, 2, 3, 3];      // alive at once per boss phase
const EG_BUMP_BUMPER_SPEED = [0, 34, 46, 60]; // px/s drift
const EG_BUMP_FLING = [0, 150, 180, 210];   // px fling impulse per thwack
const EG_BUMP_THWACK_DMG = [0, 0.06, 0.07, 0.09]; // %maxHP per bumper touch
const EG_BUMP_THWACK_CD_MS = 900;           // per-bumper touch cooldown
// Pinball shower
const EG_BUMP_SHOWER_INTERVAL_MS = [0, 4600, 3600, 2700]; // per boss phase
const EG_BUMP_BALL_SPEED = [0, 230, 280, 330]; // px/s
const EG_BUMP_BALL_DMG = 0.05;              // %maxHP per ball touch (physical)
const EG_BUMP_BALL_CD_MS = 450;             // global ball-hit cooldown
const EG_BUMP_BALL_R = 26;                  // ball radius
// Tilt! Flipper Frenzy (60% gate)
const EG_BUMP_FLIP_MS = 9000;               // whole frenzy duration
const EG_BUMP_FLIP_WARN_MS = 1000;          // arc band telegraph before a slap
const EG_BUMP_FLIP_STRIKE_MS = 380;         // the slap is live
const EG_BUMP_FLIP_CYCLE_MS = 1700;         // one flipper slaps per cycle (alternating)
const EG_BUMP_FLIP_DMG = 0.13;              // %maxHP per slap (physical)
const EG_BUMP_TILT_MS = 6500;               // bumper enrage while flippers rage
// Multiball Rush (30% gate)
const EG_BUMP_MULTIBALL_N = [0, 0, 0, 6];   // balls released (phase 3 gate)
const EG_BUMP_MULTIBALL_MS = 12000;         // rush duration
const EG_BUMP_MULTIBALL_SPEED = 340;        // px/s ricochet speed
// Bumper Slam (charge attack)
const EG_BUMP_SLAM_WARN_MS = 1050;          // target-ring telegraph
const EG_BUMP_SLAM_RING_MS = 420;           // shockwave flash after impact
const EG_BUMP_SLAM_R = 130;                 // slam radius (visual + hit)
const EG_BUMP_SLAM_DMG = [0, 0.12, 0.15, 0.18]; // %maxHP by boss phase
const EG_BUMP_SLAM_FLING = 220;             // px fling away from impact


let _egBumpWatcher = null; // per-fight carnival state
let _egBumpSlamActive = false; // a slam set-piece is running


// Sweep every carnival overlay off the screen. Safe to call twice.
function _egBumperSweep() {
    _egBumpSlamActive = false;
    try {
        document.querySelectorAll('.eg-bump-bumper, .eg-bump-ball, .eg-bump-flip, .eg-bump-slam-ring, .eg-bump-slam-core, .eg-bump-rail').forEach(el => el.remove());
    } catch (e) {}
}


// Called from _egBossCleanup (boss-framework.js) on boss death / stop.
function _egBumperTeardown() {
    const st = _egBumpWatcher;
    _egBumpWatcher = null;
    if (st && st.run) { try { _egNkKillRun(st.run); } catch (e) {} }
    // Always sweep: on boss death the run's onKill may have nulled the
    // watcher BEFORE this runs — the overlays must go either way.
    _egBumperSweep();
}


// One thwack: fling the player away from (x, y) and deal the touch damage.
function _egBumpFlingHit(st, x, y, flingPx, dmgPct, label) {
    const c = _egNkPlayerCenter();
    if (c) {
        const dx = c.x - x, dy = c.y - y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        _egNkNudgeAvatar((dx / d) * flingPx, (dy / d) * flingPx);
    }
    const dealt = _egNkHit(dmgPct, null, st.level);
    _egNkAbilityHitToast(dealt, 'The Bumper', label || 'Bumper');
}


function _egBumperArenaInit(monster) {
    if (_egBumpWatcher) return;
    const monsterId = monster ? monster.id : null;
    const st = {
        monsterId, level: monster ? monster.level : 1,
        bumpers: [], balls: [], showerAcc: 0, ballCd: 0,
        tiltUntil: 0, flip: null,
        gate60Done: false, gate30Done: false, rushDone: false,
        everLive: false, bornAt: performance.now(),
    };
    _egBumpWatcher = st;
    _egNkToast('eg_bump_intro', '🎪 The Bumper: The carnival ring is OPEN — mind the bumpers!');
    // Tier-scaled clock: the flipper-slap telegraph and the slam ring breathe
    // with tier like every other dodge telegraph. `now`-stamp hit cooldowns
    // stay real-time (fairness floor). Passive run: the watcher lives the
    // whole fight, so it must not hog _egNkDodgeBusy() — the slam and the
    // shared fog-bank mechanic check that flag.
    const run = _egNkNewRun(monsterId, true);
    run.passive = true;
    st.run = run;
    // Pinball-table side rails: pure decoration that frames the arena for
    // the whole fight (registered on the run → auto-removed on teardown).
    ['left', 'right', 'top'].forEach(side => _egNkEl(run, 'div', 'eg-bump-rail ' + side));
    run.onKill = () => {
        if (_egBumpWatcher && _egBumpWatcher.run === run) _egBumpWatcher = null;
        _egBumperSweep(); // boss died → clear the carnival immediately
    };

    _egNkLoop(run, (dtS, now) => {
        const live = (typeof _egMonsters !== 'undefined' && _egMonsters)
            ? (_egMonsters.find(m => m && m.id === st.monsterId) || null) : null;
        // Boss not registered yet → wait for it (spawn races the arena init);
        // boss vanished AFTER being live → the fight is over, tear down.
        if (!live) {
            if (!st.everLive) return (now - st.bornAt < 20000); // wait up to 20s for spawn
            return false;
        }
        st.everLive = true;

        const W = window.innerWidth, H = window.innerHeight;
        const pr = _egNkPlayerRect();
        const c = _egNkPlayerCenter();
        const p = Math.max(1, Math.min(3, Number(live.bossPhase) || 1));
        const tilting = now < st.tiltUntil;

        // ── HP gates ──
        const hpPct = live.maxHP > 0 ? live.currentHP / live.maxHP : 1;
        if (!st.gate60Done && hpPct <= 0.60) { st.gate60Done = true; _egBumperFlipperFrenzy(st, now); }
        if (!st.gate30Done && hpPct <= 0.30) { st.gate30Done = true; _egBumperMultiball(st, now); }

        // ── Roaming bumpers: drift, bounce, thwack ──
        const wantN = EG_BUMP_BUMPER_N[p] || EG_BUMP_BUMPER_N[1];
        while (st.bumpers.length < wantN) {
            const el = _egNkEl(run, 'div', 'eg-bump-bumper', '🎪');
            const b = {
                x: 90 + Math.random() * Math.max(120, W - 180),
                y: 90 + Math.random() * Math.max(120, H - 180),
                a: Math.random() * Math.PI * 2, cdUntil: 0, el,
            };
            st.bumpers.push(b);
        }
        const spd = EG_BUMP_BUMPER_SPEED[p] * (tilting ? 1.7 : 1);
        st.bumpers.forEach(b => {
            if (Math.random() < dtS * 1.1) b.a += (Math.random() - 0.5) * 2.2;
            b.x += Math.cos(b.a) * spd * dtS;
            b.y += Math.sin(b.a) * spd * dtS;
            if (b.x < 70 || b.x > W - 70) b.a = Math.PI - b.a;
            if (b.y < 70 || b.y > H - 70) b.a = -b.a;
            b.x = Math.max(70, Math.min(W - 70, b.x));
            b.y = Math.max(70, Math.min(H - 70, b.y));
            b.el.style.transform = 'translate(' + Math.round(b.x - 30) + 'px,' + Math.round(b.y - 30) + 'px)';
            if (c && pr && now >= b.cdUntil && _egNkDotHit(b.el, pr, 0)) {
                b.cdUntil = now + EG_BUMP_THWACK_CD_MS;
                b.el.classList.add('eg-nk-boom');
                setTimeout(() => b.el.classList.remove('eg-nk-boom'), 300);
                _egBumpFlingHit(st, b.x, b.y, EG_BUMP_FLING[p] * (tilting ? 1.25 : 1),
                    EG_BUMP_THWACK_DMG[p] * (tilting ? 1.3 : 1), tilting ? 'TILT Thwack' : 'Bumper Party');
            }
        });

        // ── Pinball shower: balls roll in and ricochet ──
        st.showerAcc += dtS * 1000;
        const sInt = EG_BUMP_SHOWER_INTERVAL_MS[p] || EG_BUMP_SHOWER_INTERVAL_MS[1];
        if (st.showerAcc >= sInt) {
            st.showerAcc = 0;
            const fromLeft = Math.random() < 0.5;
            const el = _egNkEl(run, 'div', 'eg-bump-ball', '🎱');
            st.balls.push({
                x: fromLeft ? -EG_BUMP_BALL_R : W + EG_BUMP_BALL_R,
                y: 70 + Math.random() * Math.max(120, H - 160),
                vx: (fromLeft ? 1 : -1) * EG_BUMP_BALL_SPEED[p] * (0.85 + Math.random() * 0.3),
                vy: (Math.random() - 0.5) * EG_BUMP_BALL_SPEED[p] * 0.6,
                life: 11000, el,
            });
        }
        for (let i = st.balls.length - 1; i >= 0; i--) {
            const b = st.balls[i];
            b.x += b.vx * dtS;
            b.y += b.vy * dtS;
            if (b.x < EG_BUMP_BALL_R || b.x > W - EG_BUMP_BALL_R) { b.vx = -b.vx; b.x = Math.max(EG_BUMP_BALL_R, Math.min(W - EG_BUMP_BALL_R, b.x)); }
            if (b.y < EG_BUMP_BALL_R || b.y > H - EG_BUMP_BALL_R) { b.vy = -b.vy; b.y = Math.max(EG_BUMP_BALL_R, Math.min(H - EG_BUMP_BALL_R, b.y)); }
            b.el.style.transform = 'translate(' + Math.round(b.x - EG_BUMP_BALL_R) + 'px,' + Math.round(b.y - EG_BUMP_BALL_R) + 'px)';
            if (c && pr && now >= st.ballCd && _egNkCircleHit(b.x, b.y, EG_BUMP_BALL_R, pr, 0)) {
                st.ballCd = now + EG_BUMP_BALL_CD_MS;
                const dealt = _egNkHit(EG_BUMP_BALL_DMG, null, st.level);
                _egNkAbilityHitToast(dealt, 'The Bumper', 'Pinball');
            }
            if ((b.life -= dtS * 1000) <= 0 || b.x < -60 || b.x > W + 60) {
                try { b.el.remove(); } catch (e) {}
                st.balls.splice(i, 1);
            }
        }

        // ── Tilt! Flipper Frenzy state machine (60% gate) ──
        if (st.flip) {
            const f = st.flip;
            f.t += dtS * 1000;
            // Each slap spawns its arc band lazily at its moment, so every
            // slap carries its own 1s warn → 380ms strike telegraph.
            while (f.nextIdx < f.slaps.length && f.t >= f.slaps[f.nextIdx].at) {
                _egBumperSpawnBand(st, f.slaps[f.nextIdx], W, H);
                f.nextIdx++;
            }
            f.bands.forEach(bd => {
                if (!bd || bd.done) return;
                bd.t += dtS * 1000;
                if (bd.t >= EG_BUMP_FLIP_WARN_MS && bd.t < EG_BUMP_FLIP_WARN_MS + EG_BUMP_FLIP_STRIKE_MS) {
                    if (!bd.hot) {
                        bd.hot = true;
                        bd.el.classList.add('hot');
                        // Heavy physical hit if the player stands in the arc.
                        if (pr && _egNkRectsOverlap(bd.rect(), pr)) {
                            const dealt = _egNkHit(EG_BUMP_FLIP_DMG, null, st.level);
                            _egNkAbilityHitToast(dealt, 'The Bumper', 'Flipper');
                        }
                    }
                } else if (bd.t >= EG_BUMP_FLIP_WARN_MS + EG_BUMP_FLIP_STRIKE_MS) {
                    bd.done = true;
                    try { bd.el.remove(); } catch (e) {}
                }
            });
            if (f.t >= EG_BUMP_FLIP_MS) {
                f.bands.forEach(bd => { if (bd && !bd.done) { try { bd.el.remove(); } catch (e) {} } });
                st.flip = null;
            }
        }
        if (!tilting && st.tiltUntil && now >= st.tiltUntil) st.tiltUntil = 0;

        return true;
    });
}


// ── 60% gate: Tilt! Flipper Frenzy ──────────────────────────────────────
// Flippers rage in the bottom corners; each slap sweeps a telegraphed arc
// band across the lower arena. Bumpers go TILT for the duration.

function _egBumperFlipperFrenzy(st, now) {
    if (st.flip) return;
    const slaps = [];
    const n = Math.floor(EG_BUMP_FLIP_MS / EG_BUMP_FLIP_CYCLE_MS);
    for (let i = 0; i < n; i++) slaps.push({ at: 600 + i * EG_BUMP_FLIP_CYCLE_MS, side: i % 2 });
    st.flip = { t: 0, slaps, nextIdx: 0, bands: [] };
    st.tiltUntil = now + EG_BUMP_TILT_MS;
    st.bumpers.forEach(b => b.el.classList.add('tilt'));
    document.querySelectorAll('.eg-bump-rail').forEach(r => r.classList.add('tilt'));
    setTimeout(() => {
        document.querySelectorAll('.eg-bump-bumper.tilt').forEach(b => { try { b.classList.remove('tilt'); } catch (e) {} });
        document.querySelectorAll('.eg-bump-rail.tilt').forEach(r => { try { r.classList.remove('tilt'); } catch (e) {} });
    }, EG_BUMP_TILT_MS + 400);
    _egNkToast('eg_bump_tilt', '⚠️ TILT! The flippers are furious — stay off the lower lanes!');
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('bump_thwack'); } catch (e) {}
}


// Spawns one flipper's arc band: warn (dashed) → hot strike → fade.
// A wide rotated strip pivoting from a bottom corner, sweeping up-inward.
function _egBumperSpawnBand(st, slap, W, H) {
    const pivotX = slap.side === 0 ? 60 : W - 60;
    const pivotY = H - 80;
    const len = Math.min(W * 0.62, 620);
    const angDeg = slap.side === 0 ? -32 : 212; // pointing up-inward
    const el = _egNkEl(st.run, 'div', 'eg-bump-flip');
    el.style.left = pivotX + 'px';
    el.style.top = pivotY + 'px';
    el.style.width = len + 'px';
    el.style.transformOrigin = '0 50%';
    el.style.transform = 'rotate(' + angDeg + 'deg)';
    const rad = angDeg * Math.PI / 180;
    const ex = pivotX + Math.cos(rad) * len, ey = pivotY + Math.sin(rad) * len;
    const pad = 22;
    st.flip.bands.push({
        t: 0, hot: false, done: false, el,
        rect: () => ({
            left: Math.min(pivotX, ex) - pad, right: Math.max(pivotX, ex) + pad,
            top: Math.min(pivotY, ey) - pad, bottom: Math.max(pivotY, ey) + pad,
        }),
    });
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('bump_thwack'); } catch (e) {}
}


// ── 30% gate: Multiball Rush ────────────────────────────────────────────
// The machine coughs up a storm of live pinballs that ricochet everywhere.

function _egBumperMultiball(st, now) {
    if (st.rushDone) return;
    st.rushDone = true;
    const W = window.innerWidth, H = window.innerHeight;
    const n = EG_BUMP_MULTIBALL_N[3] || 6;
    for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const el = _egNkEl(st.run, 'div', 'eg-bump-ball hot', '🎱');
        st.balls.push({
            x: W / 2, y: H * 0.4,
            vx: Math.cos(a) * EG_BUMP_MULTIBALL_SPEED,
            vy: Math.sin(a) * EG_BUMP_MULTIBALL_SPEED,
            life: EG_BUMP_MULTIBALL_MS, el,
        });
    }
    _egNkToast('eg_bump_multiball', '🎯 MULTIBALL! The machine is going wild — keep moving!');
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('bump_thwack'); } catch (e) {}
}


//------------------------------------------------------------------------
//-------------------CHARGE ATTACK: BUMPER SLAM----------------------------
//------------------------------------------------------------------------
// The boss's charged attack IS the set-piece: a giant bumper slams onto a
// telegraphed target ring at the player's position, flinging and hitting
// everything inside. Wired from _egFireMonsterAttack (endgame-encounter.js).

function _egBumperSlam(monster) {
    if (_egBumpSlamActive || _egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(monster && monster.bossPhase) || 1));
    const level = monster ? monster.level : 1;
    const monsterId = monster ? monster.id : null;
    const run = _egNkNewRun(monsterId, true);
    _egBumpSlamActive = true;
    run.onKill = () => { _egBumpSlamActive = false; };
    const c = _egNkPlayerCenter() || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const ring = _egNkEl(run, 'div', 'eg-bump-slam-ring');
    ring.style.left = c.x + 'px';
    ring.style.top = c.y + 'px';
    ring.style.width = ring.style.height = (EG_BUMP_SLAM_R * 2) + 'px';
    _egNkToast('eg_bump_slam', '🎪 BUMPER SLAM! Clear the target ring!');
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('bump_thwack'); } catch (e) {}
    let t = 0, slammed = false;
    _egNkLoop(run, (dtS) => {
        t += dtS * 1000;
        if (!slammed && t >= EG_BUMP_SLAM_WARN_MS) {
            slammed = true;
            ring.classList.add('hot');
            const core = _egNkEl(run, 'div', 'eg-bump-slam-core', '🎪');
            core.style.left = c.x + 'px';
            core.style.top = c.y + 'px';
            const pr = _egNkPlayerRect();
            if (pr) {
                const inside = c.x - EG_BUMP_SLAM_R < pr.right && c.x + EG_BUMP_SLAM_R > pr.left
                    && c.y - EG_BUMP_SLAM_R < pr.bottom && c.y + EG_BUMP_SLAM_R > pr.top;
                if (inside) _egBumpFlingHit({ level }, c.x, c.y, EG_BUMP_SLAM_FLING, EG_BUMP_SLAM_DMG[p], 'Slam');
            }
        }
        if (t >= EG_BUMP_SLAM_WARN_MS + EG_BUMP_SLAM_RING_MS) return false;
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------LEGACY COMPAT SHIM------------------------------------
//------------------------------------------------------------------------
// The old scheduled mechanic is now the persistent arena — keep the handler
// name alive so any stale schedule entry no-ops instead of erroring.
function _egMechBumperParty() { void 0; }
