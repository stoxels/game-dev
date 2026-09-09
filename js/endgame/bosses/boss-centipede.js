//------------------------------------------------------------------------
//-------------------BOSS: THE CENTIPEDE (boss_centipede)------------------
//------------------------------------------------------------------------
// Arcade-siege fight: the colony INFESTS the arena and keeps coming no
// matter how many pieces you cut off.
//
//   PERSISTENT (whole fight, watcher):
//   • THE WINDING COLONY — the centipede itself never leaves: a segmented
//     body (5/7/9 segments per phase) sinuously winds around the arena,
//     homing loosely toward the player. Touching any segment is a physical
//     hit. Cutting through the fight means dodging it constantly.
//   • BURROW HOLES — after Molt, dirt holes surface at random spots and
//     stay open for a while. Stand on one to bait the molt mini-centipede
//     (it homes onto you): if it reaches the hole you're in, it buries
//     itself and is gone for 15s. Standing in a hole while it BURIES is
//     harmless — but the hole then collapses and closes for a while.
//
//   HP GATES (watcher):
//   • 60% — EXOSKELETON: the boss sheds chitin plates that orbit it in a
//     wide ring (visible telegraph) — the plates spin outward in a
//     rotating spiral wave you have to weave through, twice.
//   • 30% — MOLT: the centipede STOPS, swells visibly, then splits: the
//     back half detaches and becomes a second, faster mini-centipede for
//     the rest of the fight, while the main body enrages (faster winding,
//     more segments).
//
//   FINALE — every phase, the boss periodically spits a VENOM BURST: a
//   target ring on the player, then a splash of venom blobs that leave
//   short-lived toxic pools. At 30%+, venom rain joins in (falling drops
//   with target rings).
//
//   CHARGE ATTACK — CENTIPEDE STAMPEDE: the boss's charged attack is a
//   full-screen horizontal dash: a 1s telegraph band at the player's row,
//   then the whole colony stampedes across it (heavy physical hit).
//
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule + onInit arena)
//   3. UNIQUE mechanic handlers + the persistent watcher
//
// Shared mechanics (clue_scramble) live in shared-boss-abilities.js and are
// referenced by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_centipede: {
        id: 'boss_centipede', name: 'The Centipede', emoji: '🐛',
        baseHP: 960, baseDamage: 20, chargeMax: 12,
        element: null, resistances: { fire: 10, cold: 10, lightning: 10, shadow: 10 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_centipede: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.45 },
            { threshold: 0.30, chargeMax: 7, damageMultiplier: 1.90 },
        ],
        immunityDuration: 2200,
        mechanics: [
            { name: 'clue_scramble', intervalBase: 26000, intervalVariance: 6000, handler: '_egMechClueScramble' },
        ],
        onInit: _egCentipedeArenaInit,
    },
});


// ── Colony tuning ───────────────────────────────────────────────────────
// The winding colony
const EG_CENT_SEGS = [0, 5, 7, 9];        // segments per boss phase
const EG_CENT_SEG_GAP = 36;               // px between segments
const EG_CENT_SPEED = [0, 95, 120, 150];  // px/s winding speed
const EG_CENT_MOLT_SPEED = 1.35;          // main body speed × after molt
const EG_CENT_SEG_DMG = [0, 0.05, 0.06, 0.07]; // %maxHP per segment touch
const EG_CENT_SEG_CD_MS = 700;            // global segment-touch cooldown
// Burrow holes (post-molt): safe holes that bait the molt mini-centipede
// into burying itself. Standing on one is harmless — but the hole collapses
// when the mini buries (or expires) and reopens after a while.
const EG_CENT_MOUND_INTERVAL_MS = [0, 8000, 6200, 4600]; // per boss phase
const EG_CENT_MOUND_R = 58;               // hole radius (visual + bait check)
const EG_CENT_MOUND_LIFE_MS = 9000;       // how long a hole stays open
const EG_CENT_MOUND_CLOSED_MS = 6000;     // collapsed hole reopens after this
const EG_CENT_MOLT_BURY_MS = 15000;       // the mini-centipede is buried for 15s
const EG_CENT_RESURFACE_WARN_MS = 1000;   // dirt-mound telegraph before it pops out
const EG_CENT_RESURFACE_DMG = 0.07;       // %maxHP burst if you stand on the pop-out
const EG_CENT_RESURF_BAIT_R = 280;        // stand within this of the mound to bait the pop-out
const EG_CENT_RESURF_BAIT_LOCK_MS = 600;  // committed straight-line charge at the baiter
// Exoskeleton (60% gate)
const EG_CENT_SHELL_MS = 8000;            // whole shell set-piece duration
const EG_CENT_SHELL_WAVES = 2;            // rotating spiral waves
const EG_CENT_SHELL_N = 8;                // plates per wave
const EG_CENT_SHELL_DMG = 0.11;           // %maxHP per plate hit (physical)
const EG_CENT_SHELL_CD_MS = 500;          // global plate-hit cooldown
// Molt (30% gate)
const EG_CENT_MOLT_SWELL_MS = 2200;       // visible swell telegraph
const EG_CENT_MOLT_MINI_SEGS = 4;         // the detached back half
const EG_CENT_MOLT_MINI_SPEED = 175;      // px/s — faster than base phase 1
// Venom
const EG_CENT_VENOM_INTERVAL_MS = [0, 11000, 8500, 6000]; // per boss phase
const EG_CENT_VENOM_WARN_MS = 1050;       // target ring telegraph
const EG_CENT_VENOM_R = 110;              // splash radius
const EG_CENT_VENOM_BLOBS = 5;            // blobs per burst
const EG_CENT_VENOM_DMG = 0.08;           // %maxHP per blob hit (physical)
const EG_CENT_POOL_DPS = 6;               // %maxHP/s standing in a pool
const EG_CENT_POOL_MS = 4200;             // pool lifetime
// Stampede (charge attack)
const EG_CENT_STAMPEDE_WARN_MS = 1050;    // band telegraph
const EG_CENT_STAMPEDE_STRIKE_MS = 400;   // the dash is live
const EG_CENT_STAMPEDE_H = 72;            // band height
const EG_CENT_STAMPEDE_DMG = [0, 0.12, 0.15, 0.18]; // %maxHP by phase


let _egCentWatcher = null; // per-fight colony state
let _egCentStampedeActive = false; // a stampede set-piece is running


// Sweep every colony overlay off the screen. Safe to call twice.
function _egCentipedeSweep() {
    _egCentStampedeActive = false;
    try {
        document.querySelectorAll('.eg-cent-seg, .eg-cent-mini, .eg-cent-mound, .eg-cent-resurf, .eg-cent-ring, .eg-cent-blob, .eg-cent-pool, .eg-cent-stampede, .eg-cent-shell').forEach(el => el.remove());
    } catch (e) {}
}


// Called from _egBossCleanup (boss-framework.js) on boss death / stop.
function _egCentipedeTeardown() {
    const st = _egCentWatcher;
    _egCentWatcher = null;
    if (st && st.run) { try { _egNkKillRun(st.run); } catch (e) {} }
    // Always sweep: on boss death the run's onKill may have nulled the
    // watcher BEFORE this runs — the overlays must go either way.
    _egCentipedeSweep();
}


// Spawns one centipede body (main or molt mini). Returns its part objects.
function _egCentSpawnBody(st, cls, n, label, anchor) {
    const parts = [];
    const ax = (anchor && anchor.x != null) ? anchor.x : window.innerWidth * (0.25 + Math.random() * 0.5);
    const ay = (anchor && anchor.y != null) ? anchor.y : window.innerHeight * (0.2 + Math.random() * 0.5);
    for (let i = 0; i < n; i++) {
        const el = _egNkEl(st.run, 'div', cls, i === 0 ? '🐛' : '🟤');
        parts.push({ x: ax - i * EG_CENT_SEG_GAP, y: ay, cdUntil: 0, el });
    }
    return { parts, label };
}


// Advances one body along a sine path biased toward the player.
// segHitDmg: %maxHP per touch; null = visual only.
// body.lock (set on a baited resurface) makes the head charge STRAIGHT at
// the locked point at full speed — no wobble, no turn delay — so a player
// who baited the pop-out gets a crisp, funnelable charge out of it.
function _egCentAdvance(st, body, dtS, now, pr, speed, hitPct) {
    const W = window.innerWidth, H = window.innerHeight;
    const head = body.parts[0];
    const c = _egNkPlayerCenter();
    let ang;
    if (body.lock && now < body.lock.until) {
        // Committed bait charge: straight at the spot the player stood when
        // the mini popped out.
        const lx = body.lock.x - head.x, ly = body.lock.y - head.y;
        const ld = Math.hypot(lx, ly) || 1;
        head.a = Math.atan2(ly, lx);
        ang = head.a;
    } else {
        body.lock = null;
        // Head steers loosely toward the player, wobbling as it goes.
        if (c) {
            const dx = c.x - head.x, dy = c.y - head.y;
            const d = Math.hypot(dx, dy) || 1;
            head.a = head.a == null ? Math.atan2(dy, dx) : head.a;
            let want = Math.atan2(dy, dx);
            let diff = want - head.a;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            head.a += Math.max(-2.4 * dtS, Math.min(2.4 * dtS, diff)); // turn rate cap
        } else if (head.a == null) head.a = Math.random() * Math.PI * 2;
        const wob = Math.sin(now / 260) * 0.55;
        ang = head.a + wob * 0.4;
    }
    head.x += Math.cos(ang) * speed * dtS;
    head.y += Math.sin(ang) * speed * dtS + Math.sin(now / 300) * 26 * dtS * 10 * 0.1;
    // Bounce off walls.
    if (head.x < 60 || head.x > W - 60) { head.a = Math.PI - head.a; head.x = Math.max(60, Math.min(W - 60, head.x)); }
    if (head.y < 60 || head.y > H - 60) { head.a = -head.a; head.y = Math.max(60, Math.min(H - 60, head.y)); }
    body.parts.forEach((sg, i) => {
        if (i > 0) {
            // Each segment trails the one ahead at a fixed gap (follow chain).
            const prev = body.parts[i - 1];
            const dx = prev.x - sg.x, dy = prev.y - sg.y;
            const d = Math.hypot(dx, dy) || 1;
            if (d > EG_CENT_SEG_GAP) {
                sg.x += (dx / d) * (d - EG_CENT_SEG_GAP);
                sg.y += (dy / d) * (d - EG_CENT_SEG_GAP);
            }
        }
        sg.el.style.transform = 'translate(' + Math.round(sg.x - 14) + 'px,' + Math.round(sg.y - 14) + 'px)';
        if (hitPct != null && pr && now >= st.segCd && _egNkDotHit(sg.el, pr, 0)) {
            st.segCd = now + EG_CENT_SEG_CD_MS;
            const dealt = _egNkHit(hitPct, null, st.level);
            _egNkAbilityHitToast(dealt, 'The Centipede', body.label);
        }
    });
}


function _egCentipedeArenaInit(monster) {
    if (_egCentWatcher) return;
    const monsterId = monster ? monster.id : null;
    const st = {
        monsterId, level: monster ? monster.level : 1,
        segCd: 0, moundAcc: 0, venomAcc: 0,
        mounds: [], pools: [], blobs: [], shell: null,
        body: null, mini: null,
        miniBuriedUntil: 0, miniBuryGraceUntil: 0,
        resurfWarned: false, resurfAnchor: null, resurfEl: null,
        resurfBait: null, resurfBaitWarned: false,
        gate60Done: false, gate30Done: false, molted: false,
        everLive: false, bornAt: performance.now(),
    };
    _egCentWatcher = st;        _egNkToast('eg_cent_intro', '🐛 The Centipede: The colony infests the arena — cut it down!');
    // Tier-scaled clock: mound/venom/shell telegraphs breathe with tier.
    // Passive run: lives the whole fight without hogging _egNkDodgeBusy().
    const run = _egNkNewRun(monsterId, true);
    run.passive = true;
    st.run = run;
    run.onKill = () => {
        if (_egCentWatcher && _egCentWatcher.run === run) _egCentWatcher = null;
        _egCentipedeSweep();
    };
    st.body = _egCentSpawnBody(st, 'eg-cent-seg', EG_CENT_SEGS[1], 'Colony');

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

        const W = window.innerWidth, H = window.innerHeight;
        const pr = _egNkPlayerRect();
        const p = Math.max(1, Math.min(3, Number(live.bossPhase) || 1));

        // ── HP gates ──
        const hpPct = live.maxHP > 0 ? live.currentHP / live.maxHP : 1;
        if (!st.gate60Done && hpPct <= 0.60) { st.gate60Done = true; _egCentShell(st, now); }
        if (!st.gate30Done && hpPct <= 0.30) { st.gate30Done = true; _egCentMolt(st, now); }

        // ── The winding colony ──
        const wantN = st.molted ? EG_CENT_SEGS[p] + 2 : EG_CENT_SEGS[p];
        while (st.body.parts.length < wantN) {
            const tail = st.body.parts[st.body.parts.length - 1];
            const el = _egNkEl(st.run, 'div', 'eg-cent-seg', '🟤');
            st.body.parts.push({ x: tail.x, y: tail.y, cdUntil: 0, el });
        }
        const spd = EG_CENT_SPEED[p] * (st.molted ? EG_CENT_MOLT_SPEED : 1);
        _egCentAdvance(st, st.body, dtS, now, pr, spd, EG_CENT_SEG_DMG[p]);
        if (st.mini) _egCentAdvance(st, st.mini, dtS, now, pr, EG_CENT_MOLT_MINI_SPEED, EG_CENT_SEG_DMG[p] * 0.8);
        // The mini-centipede crawling over an OPEN hole buries itself for
        // EG_CENT_MOLT_BURY_MS — the rewarded relief from the chase. It
        // homes onto the player, so guide it by standing in a hole.
        if (st.mini && now >= (st.miniBuryGraceUntil || 0)) {
            const hole = _egCentMoundHit(st, st.mini);
            if (hole) {
                _egCentCloseMound(hole);
                st.mini.parts.forEach(sg => { try { sg.el.remove(); } catch (e) {} });
                st.mini = null;
                st.miniBuriedUntil = now + EG_CENT_MOLT_BURY_MS;
                st.resurfWarned = false; // re-arm the resurface telegraph
                _egNkToast('eg_cent_buried', '🕳️ BURIED! The mini centipede is gone for 15s!');
                try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('cent_skitter'); } catch (e) {}
            }
        }
        // After a burial, the mini breaks back out at a random edge — a
        // rumbling dirt mound telegraphs the exact spot 1s before it pops
        // out. Steer clear (the pop-out bursts for damage if you stand on
        // it) or use the warning to pre-position your next bait.
        if (st.miniBuriedUntil && !st.resurfWarned
            && now >= st.miniBuriedUntil - EG_CENT_RESURFACE_WARN_MS) {
            st.resurfWarned = true;
            const side = Math.floor(Math.random() * 4);
            st.resurfAnchor = side === 0 ? { x: 70, y: 90 + Math.random() * Math.max(120, H - 200) }
                : side === 1 ? { x: W - 70, y: 90 + Math.random() * Math.max(120, H - 200) }
                : side === 2 ? { x: 90 + Math.random() * Math.max(120, W - 200), y: 70 }
                : { x: 90 + Math.random() * Math.max(120, W - 200), y: H - 70 };
            st.resurfEl = _egNkEl(st.run, 'div', 'eg-cent-resurf', '🕳️');
            st.resurfEl.style.left = Math.round(st.resurfAnchor.x) + 'px';
            st.resurfEl.style.top = Math.round(st.resurfAnchor.y) + 'px';
            st.resurfBaitWarned = false; // re-arm the bait hint for this mound
            try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('cent_skitter'); } catch (e) {}
        }
        // Bait: while the telegraph is live, standing NEAR the mound primes
        // the pop-out — the mini bursts out in a committed straight charge
        // at you, so you can funnel it over a nearby open hole. (Standing ON
        // the mound still eats the pop-out burst — bait from just outside.)
        if (st.resurfEl && st.miniBuriedUntil && now < st.miniBuriedUntil) {
            const c = _egNkPlayerCenter();
            const bait = c && Math.hypot(c.x - st.resurfAnchor.x, c.y - st.resurfAnchor.y) <= EG_CENT_RESURF_BAIT_R;
            st.resurfEl.classList.toggle('bait', !!bait);
            if (bait) {
                st.resurfBait = { x: c.x, y: c.y };
                if (!st.resurfBaitWarned) {
                    st.resurfBaitWarned = true;
                    _egNkToast('eg_cent_resurf_bait', '🧲 Bait ready! The mini will pop out straight at you — lure it into a hole!');
                }
            } else {
                st.resurfBait = null;
            }
        }
        if (st.miniBuriedUntil && now >= st.miniBuriedUntil) {
            st.miniBuriedUntil = 0;
            const anchor = st.resurfAnchor || { x: W / 2, y: H / 2 };
            const baitLock = st.resurfBait || null;
            st.resurfBait = null;
            try { if (st.resurfEl) st.resurfEl.remove(); } catch (e) {}
            st.resurfEl = null;
            st.resurfAnchor = null;
            st.resurfWarned = false;
            // Pop-out burst: standing on the telegraphed spot when it
            // erupts hurts — the old geyser language (dodge the rumble or
            // eat the hit), now punishing camping the resurface point.
            if (pr && _egNkCircleHit(anchor.x, anchor.y, EG_CENT_MOUND_R, pr, 0)) {
                const dealt = _egNkHit(EG_CENT_RESURFACE_DMG, null, st.level);
                _egNkAbilityHitToast(dealt, 'The Centipede', 'Resurface');
            }
            try { _egFlingBurst(anchor.x, anchor.y, -Math.PI / 2); } catch (e) {}
            st.mini = _egCentSpawnBody(st, 'eg-cent-mini', EG_CENT_MOLT_MINI_SEGS, 'Molt', anchor);
            if (baitLock) {
                // Baited: committed straight charge at the player's spot.
                st.mini.lock = { x: baitLock.x, y: baitLock.y, until: now + EG_CENT_RESURF_BAIT_LOCK_MS };
            }
            st.miniBuryGraceUntil = now + 2500; // can't instantly re-bury on the spot
            _egNkToast('eg_cent_resurfaced', '🐛 The mini centipede breaks back out of the ground!');
            try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('cent_skitter'); } catch (e) {}
        }

        // ── Burrow holes (post-molt): bait the mini into burying itself ──
        st.moundAcc += dtS * 1000;
        if (st.molted) {
            const mInt = EG_CENT_MOUND_INTERVAL_MS[p] || EG_CENT_MOUND_INTERVAL_MS[1];
            if (st.moundAcc >= mInt) {
                st.moundAcc = 0;
                _egCentMound(st, now);
            }
        }
        for (let i = st.mounds.length - 1; i >= 0; i--) {
            const m = st.mounds[i];
            m.t += dtS * 1000;
            if (m.closed) {
                // Collapsed: the visual shrinks shut, then the spot reopens
                // as a fresh hole after the closed window.
                if (m.t >= EG_CENT_MOUND_CLOSED_MS) {
                    m.closed = false;
                    m.t = 0;
                    m.el.classList.remove('closed');
                    m.el.classList.add('fresh');
                }
            } else if (m.t >= EG_CENT_MOUND_LIFE_MS) {
                _egCentCloseMound(m);
            }
        }

        // ── Venom burst (phase cadence) ──
        st.venomAcc += dtS * 1000;
        const vInt = EG_CENT_VENOM_INTERVAL_MS[p] || EG_CENT_VENOM_INTERVAL_MS[1];
        if (st.venomAcc >= vInt) {
            st.venomAcc = 0;
            _egCentVenomBurst(st, now);
        }
        // Venom blobs fly out then become pools.
        for (let i = st.blobs.length - 1; i >= 0; i--) {
            const b = st.blobs[i];
            b.t += dtS * 1000;
            b.x += b.vx * dtS;
            b.y += b.vy * dtS;
            b.vy += 260 * dtS; // gravity
            b.el.style.transform = 'translate(' + Math.round(b.x) + 'px,' + Math.round(b.y) + 'px)';
            if (pr && !b.hit && b.t > 120 && _egNkCircleHit(b.x, b.y, 14, pr, 0)) {
                b.hit = true;
                const dealt = _egNkHit(EG_CENT_VENOM_DMG, null, st.level);
                _egNkAbilityHitToast(dealt, 'The Centipede', 'Venom');
            }
            const landed = b.t >= EG_CENT_VENOM_WARN_MS + 500 || b.y > H - 30;
            if (landed) {
                try { b.el.remove(); } catch (e) {}
                st.blobs.splice(i, 1);
                // Leave a toxic pool where it lands.
                const pool = _egNkEl(st.run, 'div', 'eg-cent-pool');
                pool.style.left = Math.round(b.x) + 'px';
                pool.style.top = Math.round(Math.min(b.y, H - 40)) + 'px';
                st.pools.push({ x: b.x, y: Math.min(b.y, H - 40), t: 0, el: pool });
            }
        }
        // Toxic pools tick.
        for (let i = st.pools.length - 1; i >= 0; i--) {
            const pl = st.pools[i];
            pl.t += dtS * 1000;
            if (pr && _egNkCircleHit(pl.x, pl.y, 46, pr, 0)) {
                _egNkDotTick(st.run, EG_CENT_POOL_DPS, dtS, st.level, null);
            }
            if (pl.t >= EG_CENT_POOL_MS) {
                try { pl.el.remove(); } catch (e) {}
                st.pools.splice(i, 1);
            }
        }

        // ── Exoskeleton spiral waves (60% gate) ──
        if (st.shell) {
            const sh = st.shell;
            sh.t += dtS * 1000;
            sh.plates.forEach(pl => {
                if (pl.done) return;
                pl.a += pl.spin * dtS;
                pl.r += pl.vr * dtS;
                if (pl.r > Math.max(W, H)) { pl.done = true; try { pl.el.remove(); } catch (e) {} return; }
                pl.x = sh.cx + Math.cos(pl.a) * pl.r;
                pl.y = sh.cy + Math.sin(pl.a) * pl.r;
                pl.el.style.transform = 'translate(' + Math.round(pl.x - 16) + 'px,' + Math.round(pl.y - 16) + 'px) rotate(' + Math.round(pl.a * 57.3) + 'deg)';
                if (pr && now >= st.shellCd && _egNkCircleHit(pl.x, pl.y, 20, pr, 0)) {
                    st.shellCd = now + EG_CENT_SHELL_CD_MS;
                    const dealt = _egNkHit(EG_CENT_SHELL_DMG, null, st.level);
                    _egNkAbilityHitToast(dealt, 'The Centipede', 'Chitin');
                }
            });
            if (sh.t >= EG_CENT_SHELL_MS) {
                sh.plates.forEach(pl => { if (!pl.done) { try { pl.el.remove(); } catch (e) {} } });
                st.shell = null;
            }
        }

        return true;
    });
}


// ── Burrow holes ────────────────────────────────────────────────────────
function _egCentMound(st, now) {
    const W = window.innerWidth, H = window.innerHeight;
    const x = 90 + Math.random() * Math.max(120, W - 180);
    const y = 90 + Math.random() * Math.max(120, H - 180);
    const el = _egNkEl(st.run, 'div', 'eg-cent-mound fresh', '🕳️');
    el.style.left = Math.round(x) + 'px';
    el.style.top = Math.round(y) + 'px';
    // First hole ever → teach the mechanic once, right where it becomes
    // relevant (holes only exist after the Molt).
    if (!st.mounds.length) {
        _egNkToast('eg_cent_holes_hint', '🕳️ Burrow holes open — lure the mini centipede into one!');
    }
    st.mounds.push({ x, y, t: 0, closed: false, el });
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('cent_skitter'); } catch (e) {}
}


// A hole collapses shut (mini buried in it, or it expired empty). It
// reopens as a fresh hole after EG_CENT_MOUND_CLOSED_MS.
function _egCentCloseMound(m) {
    if (m.closed) return;
    m.closed = true;
    m.t = 0;
    m.el.classList.remove('fresh');
    m.el.classList.add('closed');
}


// Does any part of the body sit inside an open burrow hole? Returns it or null.
function _egCentMoundHit(st, body) {
    for (let i = 0; i < st.mounds.length; i++) {
        const m = st.mounds[i];
        if (m.closed) continue;
        for (let j = 0; j < body.parts.length; j++) {
            const sg = body.parts[j];
            if (Math.hypot(sg.x - m.x, sg.y - m.y) <= EG_CENT_MOUND_R) return m;
        }
    }
    return null;
}


// ── 60% gate: Exoskeleton ───────────────────────────────────────────────
// Chitin plates orbit the boss, then spiral outward — weave the gaps.
function _egCentShell(st, now) {
    if (st.shell) return;
    const c = _egNkPlayerCenter();
    const cx = c ? c.x : window.innerWidth / 2;
    const cy = c ? c.y : window.innerHeight / 2;
    const plates = [];
    for (let w = 0; w < EG_CENT_SHELL_WAVES; w++) {
        for (let i = 0; i < EG_CENT_SHELL_N; i++) {
            const el = _egNkEl(st.run, 'div', 'eg-cent-shell', '🛡️');
            const a0 = (i / EG_CENT_SHELL_N) * Math.PI * 2 + w * 0.4;
            plates.push({
                a: a0, r: 40 + w * 70, spin: 1.6 * (w % 2 ? -1 : 1),
                vr: 120 + w * 60, delay: w * 1600, t0: now, done: false, el,
                x: cx, y: cy,
            });
        }
    }
    st.shell = { t: 0, cx, cy, plates, cdStart: now };
    st.shellCd = 0;
    // Delay: plates start expanding after a short beat.
    st.shell.plates.forEach(pl => { pl.vrStart = performance.now() + pl.delay; });
    _egNkToast('eg_cent_shell', '🛡️ EXOSKELETON! Chitin plates spiral out — weave the gaps!');
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('cent_skitter'); } catch (e) {}
}


// ── 30% gate: Molt ──────────────────────────────────────────────────────
// The body stops and swells, then the back half detaches into a faster
// mini-centipede while the main body enrages.
function _egCentMolt(st, now) {
    if (st.molted) return;
    st.molted = true;
    // Visible swell: pulse every living segment.
    st.body.parts.forEach(sg => sg.el.classList.add('swell'));
    setTimeout(() => {
        const s = _egCentWatcher;
        if (!s) return;
        s.body.parts.forEach(sg => { try { sg.el.classList.remove('swell'); } catch (e) {} });
        // Detach the back half into the mini.
        const cut = Math.min(EG_CENT_MOLT_MINI_SEGS, Math.max(1, s.body.parts.length - 3));
        const detached = s.body.parts.splice(s.body.parts.length - cut, cut);
        detached.forEach(sg => sg.el.className = 'eg-cent-mini');
        s.mini = { parts: detached, label: 'Molt' };
        // Short grace so a hole that happens to open right on the fresh
        // mini can't bury it before the player ever baited it.
        s.miniBuryGraceUntil = performance.now() + 2500;
        _egNkToast('eg_cent_molt', '🦋 MOLT! The colony splits — lure the mini into a burrow hole!');
        try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('cent_skitter'); } catch (e) {}
    }, EG_CENT_MOLT_SWELL_MS);
    _egNkToast('eg_cent_molt_swell', '🐛 The Centipede swells — its shell is cracking!');
}


// ── Venom burst ─────────────────────────────────────────────────────────
function _egCentVenomBurst(st, now) {
    const c = _egNkPlayerCenter() || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    _egNkToast('eg_cent_venom', '🟢 VENOM BURST! Clear the ring — the splash leaves pools!');
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('cent_venom'); } catch (e) {}
    const ring = _egNkEl(st.run, 'div', 'eg-cent-ring');
    ring.style.left = c.x + 'px';
    ring.style.top = c.y + 'px';
    ring.style.width = ring.style.height = (EG_CENT_VENOM_R * 2) + 'px';
    setTimeout(() => { try { ring.remove(); } catch (e) {} }, EG_CENT_VENOM_WARN_MS);
    // Blobs spray out after the telegraph.
    setTimeout(() => {
        const s = _egCentWatcher;
        if (!s) return;
        for (let i = 0; i < EG_CENT_VENOM_BLOBS; i++) {
            const a = (i / EG_CENT_VENOM_BLOBS) * Math.PI * 2 + Math.random() * 0.6;
            const el = _egNkEl(s.run, 'div', 'eg-cent-blob', '🟢');
            el.style.left = '0'; el.style.top = '0';
            s.blobs.push({
                x: c.x, y: c.y,
                vx: Math.cos(a) * (150 + Math.random() * 120),
                vy: Math.sin(a) * (150 + Math.random() * 120) - 120,
                t: 0, hit: false, el,
            });
        }
    }, EG_CENT_VENOM_WARN_MS);
}


//------------------------------------------------------------------------
//-------------------CHARGE ATTACK: CENTIPEDE STAMPEDE---------------------
//------------------------------------------------------------------------
// The boss's charged attack IS the set-piece: a full-screen horizontal dash
// band telegraphs at the player's row, then the colony stampedes across.
// Wired from _egFireMonsterAttack (endgame-encounter.js).

function _egCentStampede(monster) {
    if (_egCentStampedeActive || _egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(monster && monster.bossPhase) || 1));
    const level = monster ? monster.level : 1;
    const run = _egNkNewRun(monster ? monster.id : null, true);
    _egCentStampedeActive = true;
    run.onKill = () => { _egCentStampedeActive = false; };
    const c = _egNkPlayerCenter();
    const cy = c ? c.y : window.innerHeight / 2;
    const fromLeft = Math.random() < 0.5;
    const band = _egNkEl(run, 'div', 'eg-cent-stampede' + (fromLeft ? '' : ' flip'));
    band.style.top = Math.round(cy - EG_CENT_STAMPEDE_H / 2) + 'px';
    band.style.height = EG_CENT_STAMPEDE_H + 'px';
    _egNkToast('eg_cent_stampede', '🐛 STAMPEDE! Get out of its lane!');
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('cent_skitter'); } catch (e) {}
    let t = 0, hit = false;
    _egNkLoop(run, (dtS) => {
        t += dtS * 1000;
        if (t >= EG_CENT_STAMPEDE_WARN_MS && !hit) {
            band.classList.add('hot');
            const pr = _egNkPlayerRect();
            if (pr) {
                const top = cy - EG_CENT_STAMPEDE_H / 2, bottom = cy + EG_CENT_STAMPEDE_H / 2;
                if (pr.bottom > top && pr.top < bottom) {
                    hit = true;
                    const dealt = _egNkHit(EG_CENT_STAMPEDE_DMG[p], null, level);
                    _egNkAbilityHitToast(dealt, 'The Centipede', 'Stampede');
                }
            }
        }
        if (t >= EG_CENT_STAMPEDE_WARN_MS + EG_CENT_STAMPEDE_STRIKE_MS) return false;
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------LEGACY COMPAT SHIM------------------------------------
//------------------------------------------------------------------------
// The old scheduled crossing is now the persistent arena — keep the handler
// name alive so any stale schedule entry no-ops instead of erroring.
function _egMechCentipedeCross() { void 0; }
