//------------------------------------------------------------------------
//-------------------BOSS: THE SPROUT (boss_sprout)-----------------------
//------------------------------------------------------------------------
// Garden-siege fight: the Sprout overgrows the PUZZLE itself. You fight
// by filling cells — it fights by claiming them back.
//
//   PERSISTENT (whole fight):
//   • ROOT NETWORK — living vines periodically claim unsolved cells. A
//     vined cell can't be filled; clicking it PRUNES the vine (one extra
//     click) before you can fill. Vines wither on their own after a while.
//   • SPORE DRIFT — puffball spores drift across the screen in wavy lines;
//     touching one is a light physical hit.
//
//   HP GATES (watcher, like Puddle/Marksman):
//   • 60% — BRAMBLE WALL: thorned brambles grow along all four grid edges.
//     The grid's outermost ring of cells is locked for ~10s, and thorned
//     whips lash outward from the brambles — heavy physical hit on contact.
//   • 30% — BLOOMING DOOM: a giant flower bud grows over the grid, then
//     BURSTS: pollen motes shower outward (contact damage) and nearby cells
//     get pollen-dusted — disturbing (clicking) a dusted cell bursts pollen
//     around YOU. The bud re-grows while phase 3 lasts.
//
//   CHARGE ATTACK — VINE LUNGE: when The Sprout's own attack bar fills, it
//   doesn't fire a generic projectile — it LUNGES: a thorned tendril
//   telegraphs across the whole screen along a line through your current
//   position (~1s), then whips. Heavy physical hit if it catches you.
//
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule + onInit arena)
//   3. UNIQUE mechanic handlers + the persistent watcher
//
// Shared mechanics (prior_bomb) live in shared-boss-abilities.js and are
// referenced by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_sprout: {
        id: 'boss_sprout', name: 'The Sprout', emoji: '🌱',
        baseHP: 900, baseDamage: 18, chargeMax: 13,
        element: null, resistances: { fire: 10, cold: 10, lightning: 10, shadow: 10 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_sprout: {
        phases: [
            { threshold: 1.00, chargeMax: 13, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 10, damageMultiplier: 1.35 },
            { threshold: 0.30, chargeMax: 8, damageMultiplier: 1.75 },
        ],
        immunityDuration: 2000,
        mechanics: [
            { name: 'sproutlings', intervalBase: 19000, intervalVariance: 5000, handler: '_egMechSproutlings' },
            { name: 'prior_bomb', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechPriorBomb' },
        ],
        onInit: _egSproutArenaInit,
    },
});


// ── Garden tuning ───────────────────────────────────────────────────────
// Root Network (vines on cells)
const EG_SPROUT_VINE_INTERVAL_MS = [0, 4500, 3600, 2800]; // per boss phase
const EG_SPROUT_VINE_CAP = [0, 3, 5, 7];     // vines alive at once per phase
const EG_SPROUT_VINE_LIFETIME_MS = 12000;    // withers on its own
// Spore Drift (screen hazard)
const EG_SPROUT_SPORE_INTERVAL_MS = [0, 3200, 2400, 1800];
const EG_SPROUT_SPORE_DMG = 0.025;   // %maxHP per spore (physical)
const EG_SPROUT_SPORE_CD_MS = 500;   // global spore-hit cooldown
const EG_SPROUT_SPORE_SPEED = [0, 70, 90, 110]; // px/s drift
// Bramble Wall (60% gate)
const EG_SPROUT_BRAMBLE_MS = 10000;  // wall lifetime
const EG_SPROUT_WHIP_DMG = 0.12;     // %maxHP per whip (physical)
const EG_SPROUT_WHIP_LEN = 230;      // px a lash reaches beyond the grid edge
const EG_SPROUT_WHIP_OUT_MS = 500;   // extend time
const EG_SPROUT_WHIP_HOLD_MS = 800;  // fully extended
const EG_SPROUT_WHIP_BACK_MS = 400;  // retract
const EG_SPROUT_WHIP_TIMES = [1400, 4600, 7800]; // lash moments inside the wall
// Blooming Doom (30% gate)
const EG_SPROUT_BUD_MS = 3200;       // bud growth (telegraph)
const EG_SPROUT_BUD_R = 34;          // bud visual radius
const EG_SPROUT_MOTE_N = 8;          // pollen motes per bloom
const EG_SPROUT_MOTE_SPEED = 260;    // px/s
const EG_SPROUT_MOTE_DMG = 0.025;    // %maxHP per mote (physical)
const EG_SPROUT_MOTE_CD_MS = 450;    // global mote-hit cooldown
const EG_SPROUT_MOTE_LIFE_MS = 2200;
const EG_SPROUT_DUST_MS = 6500;      // pollen dust on cells
const EG_SPROUT_DUST_BURST = 0.06;   // %maxHP when a dusted cell is disturbed
const EG_SPROUT_DUST_BURST_CD_MS = 1200; // min gap between bursts (naive sweeps bleed, not die)
const EG_SPROUT_DUST_WARN_MS = 1600; // dust visibly blinks this long before clearing
const EG_SPROUT_REBLOOM_MS = 8000;   // next bud after a bloom (phase 3)
const EG_SPROUT_BUDS_MAX = 3;        // buds per fight at most
// Vine Lunge (the boss's charge-bar attack)
const EG_SPROUT_LUNGE_WARN_MS = 1050; // telegraph before the whip
const EG_SPROUT_LUNGE_STRIKE_MS = 350; // the tendril is live (hot)
const EG_SPROUT_LUNGE_FADE_MS = 700;  // tendril retracts
const EG_SPROUT_LUNGE_H = 56;         // tendril band width (px)
const EG_SPROUT_LUNGE_DMG = [0, 0.11, 0.14, 0.17]; // %maxHP by boss phase


let _egSproutWatcher = null; // per-fight garden state
let _egSproutLungeActive = false; // a vine lunge set-piece is running


// Sweep every garden overlay off the grid and screen. Safe to call twice.
function _egSproutSweep() {
    _egSproutLungeActive = false;
    try {
        document.querySelectorAll('.eg-sprout-vine, .eg-sprout-dust, .eg-sprout-bramble, .eg-sprout-whip, .eg-sprout-bud, .eg-sprout-spore, .eg-sprout-mote, .eg-sprout-lunge, .eg-sprout-conn, .eg-sprout-ringlock').forEach(el => el.remove());
        document.querySelectorAll('.eg-brambled').forEach(el => el.classList.remove('eg-brambled'));
    } catch (e) {}
}


// Called from _egBossCleanup (boss-framework.js) on boss death / stop.
function _egSproutTeardown() {
    const st = _egSproutWatcher;
    _egSproutWatcher = null;
    if (st && st.run) { try { _egNkKillRun(st.run); } catch (e) {} }
    // Always sweep: on boss death the run's onKill may have nulled the
    // watcher BEFORE this runs — the overlays must go either way.
    _egSproutSweep();
}


// Unsolved cells (player value ≠ solution value) — the vine pool.
function _egSproutVinePool() {
    if (typeof cur === 'undefined' || !cur || !cur.grid) return [];
    const sol = cur.grid, usr = (typeof userGrid !== 'undefined') ? userGrid : null;
    if (!usr) return [];
    const pool = [];
    for (let r = 0; r < sol.length; r++)
        for (let c = 0; c < sol[r].length; c++)
            if (usr[r] && usr[r][c] !== sol[r][c] && !document.getElementById(`eg-vine-${r}-${c}`))
                pool.push([r, c]);
    return pool;
}


function _egSproutAddVine(r, c) {
    const key = `eg-vine-${r}-${c}`;
    if (document.getElementById(key)) return;
    const cell = document.getElementById(`g-${r}-${c}`);
    if (!cell) return;
    const el = document.createElement('span');
    el.className = 'eg-sprout-vine';
    el.id = key;
    el.textContent = '🌿';
    cell.appendChild(el);
    setTimeout(() => { try { el.remove(); } catch (e) {} }, EG_SPROUT_VINE_LIFETIME_MS);
}


// Click intercept (mouse-button-handlers.js): prune vines, block brambled
// ring cells, and burst pollen when a dusted cell is disturbed.
// Returns true when the click is consumed (no fill/mark happens).
function _egSproutCellIntercept(row, col) {
    const st = _egSproutWatcher;
    if (!st) return false;
    // Vined cell: this click prunes the vine only.
    if (document.getElementById(`eg-vine-${row}-${col}`)) {
        const el = document.getElementById(`eg-vine-${row}-${col}`);
        el.classList.add('prune');
        setTimeout(() => { try { el.remove(); } catch (e) {} }, 240);
        try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('sprout_prune'); } catch (e) {}
        showToast(t('eg_sprout_pruned'));
        return true;
    }
    // Bramble Wall: outermost ring of the grid is sealed while it lives.
    if (st.bramble && typeof cur !== 'undefined' && cur && cur.grid) {
        const rows = cur.grid.length, cols = cur.grid[0] ? cur.grid[0].length : 0;
        if (rows && cols && (row === 0 || col === 0 || row === rows - 1 || col === cols - 1)) {
            showToast(t('eg_sprout_bramble_locked'));
            return true;
        }
    }
    // Pollen dust: disturbing the cell bursts pollen around the player.
    // Returns false — the fill/mark itself still happens (tempo pressure).
    if (st.dust.has(`${row}-${col}`)) _egSproutPollenBurst(st);
    return false;
}


function _egSproutPollenBurst(st) {
    const now = performance.now();
    if (now < st.dustCd) return;
    st.dustCd = now + EG_SPROUT_DUST_BURST_CD_MS;
    const level = st.level;
    const dealt = _egNkHit(EG_SPROUT_DUST_BURST, null, level);
    _egNkAbilityHitToast(dealt, 'The Sprout', 'Pollen');
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('sprout_bloom'); } catch (e) {}
    // Visual puff around the player.
    const c = _egNkPlayerCenter();
    if (c) {
        const puff = _egNkEl(st.run, 'div', 'eg-sprout-puff');
        puff.style.left = Math.round(c.x) + 'px';
        puff.style.top = Math.round(c.y) + 'px';
        setTimeout(() => { try { puff.remove(); } catch (e) {} }, 600);
    }
}


//------------------------------------------------------------------------
//-------------------CHARGE ATTACK: VINE LUNGE-----------------------------
//------------------------------------------------------------------------
// The Sprout's own charge-bar attack. A thorned tendril telegraphs across
// the whole screen along a band through the player's CURRENT position,
// then whips — Brutus's Ground Slam pattern, but a line instead of a band.
// Own dodge-type run: dodge-busy holds so no other mechanic overlaps, and
// pause-safe (the telegraph freezes with the rest of the game).
function _egSproutVineLunge(monster) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(monster && monster.bossPhase) || 1));
    const level = monster ? monster.level : 1;
    const dmgPct = EG_SPROUT_LUNGE_DMG[p] || EG_SPROUT_LUNGE_DMG[1];
    const run = _egNkNewRun(monster ? monster.id : 'boss_sprout', true);
    run.onKill = () => { _egSproutLungeActive = false; };
    _egSproutLungeActive = true;

    // Aim: full-screen band through the player's CURRENT center.
    const c = _egNkPlayerCenter();
    const W = window.innerWidth, H = window.innerHeight;
    const angle = (Math.random() < 0.5 ? 0 : Math.PI / 2); // horizontal or vertical
    const px = c ? c.x : W / 2, py = c ? c.y : H / 2;
    const cx = angle === 0 ? W / 2 : px;
    const cy = angle === 0 ? py : H / 2;

    const band = _egNkEl(run, 'div', 'eg-sprout-lunge');
    const len = (angle === 0 ? W + 80 : H + 80);
    band.style.width = Math.round(len) + 'px';
    band.style.height = EG_SPROUT_LUNGE_H + 'px';
    band.style.left = Math.round(cx - len / 2) + 'px';
    band.style.top = Math.round(cy - EG_SPROUT_LUNGE_H / 2) + 'px';
    if (angle !== 0) {
        // Vertical tendril: rotate the horizontal band 90° around its center.
        band.style.transformOrigin = '50% 50%';
        band.style.transform = 'rotate(90deg)';
    }

    _egNkToast('eg_sprout_lunge', '🌱 The Sprout LUNGES — a thorned tendril whips across the screen!');
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('sprout_thorn'); } catch (e) {}

    // warn → strike → fade (Brutus slam state machine).
    let t = 0, state = 'warn', hit = false;
    _egNkLoop(run, (dtS, now) => {
        t += dtS * 1000;
        if (state === 'warn' && t >= EG_SPROUT_LUNGE_WARN_MS) {
            state = 'strike';
            band.classList.add('hit'); // hot tendril
            const pr = _egNkPlayerRect();
            const b = band.getBoundingClientRect();
            if (pr && _egNkRectsOverlap(
                { left: b.left, right: b.right, top: b.top, bottom: b.bottom }, pr)) {
                hit = true;
                const dealt = _egNkHit(dmgPct, null, level);
                _egNkAbilityHitToast(dealt, 'The Sprout', 'Vine Lunge');
            }
        } else if (state === 'strike' && t >= EG_SPROUT_LUNGE_WARN_MS + EG_SPROUT_LUNGE_STRIKE_MS) {
            state = 'fade';
            band.classList.add('fade'); // retract
        } else if (state === 'fade' && t >= EG_SPROUT_LUNGE_WARN_MS + EG_SPROUT_LUNGE_STRIKE_MS + EG_SPROUT_LUNGE_FADE_MS) {
            try { band.remove(); } catch (e) {}
            _egSproutLungeActive = false;
            return false; // end the set-piece
        }
        return true;
    });
}


// ── the persistent garden watcher ───────────────────────────────────────

function _egSproutArenaInit(monster) {
    if (_egSproutWatcher) return;
    const monsterId = monster ? monster.id : null;
    const level = monster ? monster.level : 1;
    const st = {
        monsterId, level, run: null,
        vines: [], spores: [], motes: [],
        vineAcc: 0, sporeAcc: 0, sporeCd: 0, dustCd: 0, moteCd: 0,
        dustWarn: new Set(),
        bramble: null, bud: null, dust: new Map(),
        gate60Done: false, gate30Done: false, budsGrown: 0, rebloomAt: 0,
        everLive: false, bornAt: performance.now(),
    };
    _egSproutWatcher = st;
    _egNkToast('eg_sprout_intro', '🌱 The Sprout: The garden is overgrowing your puzzle!');
    // Tier-scaled clock: the bramble whip's 500ms extend telegraph and the
    // wall/bloom pacing breathe with tier, like the Marksman's aim and the
    // lunge. `now`-stamp hit cooldowns stay real-time (fairness floor).
    // Passive run: the watcher lives the whole fight, so it must not hog
    // _egNkDodgeBusy() — sproutlings, the lunge, and other set-pieces
    // check that flag to avoid stacking on an active dodge set-piece.
    const run = _egNkNewRun(monsterId, true);
    run.passive = true;
    st.run = run;
    run.onKill = () => {
        if (_egSproutWatcher && _egSproutWatcher.run === run) _egSproutWatcher = null;
        _egSproutSweep(); // boss died → clear the garden immediately
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
        const p = Math.max(1, Math.min(3, Number(live.bossPhase) || 1));

        // ── HP gates ──
        const hpPct = live.currentHP / live.maxHP;
        if (!st.gate60Done && hpPct <= 0.60) { st.gate60Done = true; _egSproutBrambleWall(st); }
        if (!st.gate30Done && hpPct <= 0.30) { st.gate30Done = true; st.rebloomAt = 0.01; }

        // ── Root Network: vines claim unsolved cells ──
        st.vineAcc += dtS * 1000;
        const vInt = EG_SPROUT_VINE_INTERVAL_MS[p] || EG_SPROUT_VINE_INTERVAL_MS[1];
        if (st.vineAcc >= vInt) {
            st.vineAcc = 0;
            const alive = document.querySelectorAll('.eg-sprout-vine:not(.prune)').length;
            const cap = EG_SPROUT_VINE_CAP[p] || EG_SPROUT_VINE_CAP[1];
            if (alive < cap) {
                const pool = _egSproutVinePool();
                if (pool.length) {
                    const [r, c] = pool[Math.floor(Math.random() * pool.length)];
                    _egSproutAddVine(r, c);
                }
            }
        }

        // ── Spore Drift: puffballs waft across the screen ──
        st.sporeAcc += dtS * 1000;
        const sInt = EG_SPROUT_SPORE_INTERVAL_MS[p] || EG_SPROUT_SPORE_INTERVAL_MS[1];
        if (st.sporeAcc >= sInt && st.spores.length < 8) {
            st.sporeAcc = 0;
            const fromLeft = Math.random() < 0.5;
            const el = _egNkEl(run, 'div', 'eg-sprout-spore', '🟢');
            st.spores.push({
                x: fromLeft ? -20 : W + 20,
                dir: fromLeft ? 1 : -1,
                y: 80 + Math.random() * Math.max(120, H - 220),
                phase: Math.random() * 6.28,
                spd: EG_SPROUT_SPORE_SPEED[p] || EG_SPROUT_SPORE_SPEED[1],
                cdUntil: 0, el, life: 14000, // internal-clock lifetime
            });
        }
        for (let i = st.spores.length - 1; i >= 0; i--) {
            const s = st.spores[i];
            s.x += s.dir * s.spd * dtS;
            s.phase += dtS * 2.2;
            const y = s.y + Math.sin(s.phase) * 26; // wavy drift
            s.el.style.transform = 'translate(' + Math.round(s.x) + 'px,' + Math.round(y) + 'px)';
            if (pr && now >= st.sporeCd && _egNkCircleHit(s.x, y, 10, pr, 0)) {
                st.sporeCd = now + EG_SPROUT_SPORE_CD_MS;
                s.cdUntil = now + 900;
                const dealt = _egNkHit(EG_SPROUT_SPORE_DMG, null, level);
                _egNkAbilityHitToast(dealt, 'The Sprout', 'Spores');
            }
            if ((s.dir === 1 && s.x > W + 30) || (s.dir === -1 && s.x < -30) || (s.life -= dtS * 1000) <= 0) {
                try { s.el.remove(); } catch (e) {}
                st.spores.splice(i, 1);
            }
        }

        // ── Bramble Wall state machine ──
        if (st.bramble) {
            const b = st.bramble;
            b.t += dtS * 1000;
            // Whips: extend → hold → retract, once per scheduled moment.
            b.whips.forEach(w => {
                if (w.done) return;
                const t = b.t - w.at;
                if (t < 0) return;
                if (w.el.classList.contains('coiled')) w.el.classList.remove('coiled');
                let len = 0;
                if (t < EG_SPROUT_WHIP_OUT_MS) {
                    const k = t / EG_SPROUT_WHIP_OUT_MS;
                    len = EG_SPROUT_WHIP_LEN * (1 - Math.pow(1 - k, 2));
                } else if (t < EG_SPROUT_WHIP_OUT_MS + EG_SPROUT_WHIP_HOLD_MS) {
                    len = EG_SPROUT_WHIP_LEN * (0.96 + 0.04 * Math.sin(t / 90)); // strain
                } else if (t < EG_SPROUT_WHIP_OUT_MS + EG_SPROUT_WHIP_HOLD_MS + EG_SPROUT_WHIP_BACK_MS) {
                    const k = (t - EG_SPROUT_WHIP_OUT_MS - EG_SPROUT_WHIP_HOLD_MS) / EG_SPROUT_WHIP_BACK_MS;
                    len = EG_SPROUT_WHIP_LEN * (1 - k * k);
                } else {
                    w.done = true;
                    try { w.el.remove(); } catch (e) {}
                    return;
                }
                w.len = len;
                // Position along the outward normal of its grid edge.
                let x = w.bx, y = w.by, rot = w.rot;
                w.el.style.width = Math.round(len) + 'px';
                w.el.style.left = Math.round(x) + 'px';
                w.el.style.top = Math.round(y) + 'px';
                w.el.style.transform = 'rotate(' + rot + 'rad)';
                // Hitbox: rect from base to current tip.
                if (!w.hit && pr && len > 12) {
                    const tipX = w.bx + Math.cos(rot) * len, tipY = w.by + Math.sin(rot) * len;
                    const rect = {
                        left: Math.min(w.bx, tipX) - 6, right: Math.max(w.bx, tipX) + 6,
                        top: Math.min(w.by, tipY) - 6, bottom: Math.max(w.by, tipY) + 6,
                    };
                    if (_egNkRectsOverlap(rect, pr)) {
                        w.hit = true;
                        const dealt = _egNkHit(EG_SPROUT_WHIP_DMG, null, level);
                        _egNkAbilityHitToast(dealt, 'The Sprout', 'Bramble');
                        try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('sprout_thorn'); } catch (e) {}
                    }
                }
            });
            if (b.t >= EG_SPROUT_BRAMBLE_MS) {
                b.strips.forEach(el => { try { el.remove(); } catch (e) {} });
                b.whips.forEach(w => { if (!w.done) { try { w.el.remove(); } catch (e) {} } });
                (b.connEls || []).forEach(el => { try { el.remove(); } catch (e) {} });
                (b.lockEls || []).forEach(el => { try { el.remove(); } catch (e) {} });
                document.querySelectorAll('.eg-brambled').forEach(el => el.classList.remove('eg-brambled'));
                st.bramble = null;
            }
        }

        // ── Blooming Doom state machine ──
        if (st.bud) {
            const bd = st.bud;
            bd.t += dtS * 1000;
            const k = Math.min(1, bd.t / EG_SPROUT_BUD_MS);
            bd.el.style.transform = 'translate(-50%,-50%) scale(' + (0.15 + 0.85 * k).toFixed(3) + ')';
            bd.el.style.opacity = String(0.5 + 0.5 * k);
            if (bd.t >= EG_SPROUT_BUD_MS) {
                // BLOOM: dust the region + pollen motes everywhere.
                try { bd.el.remove(); } catch (e) {}
                st.bud = null;
                _egSproutBloom(st, bd.r, bd.c, 0);
                st.budsGrown++;
                st.rebloomAt = EG_SPROUT_REBLOOM_MS;
            }
        } else if (st.gate30Done && st.budsGrown < EG_SPROUT_BUDS_MAX && st.rebloomAt > 0) {
            st.rebloomAcc = (st.rebloomAcc || 0) + dtS * 1000;
            if (st.rebloomAt <= st.rebloomAcc) { st.rebloomAt = 0; _egSproutGrowBud(st); }
        }

        // Pollen dust expiry — blinks while about to clear so "wait it out"
        // is a visible, planned option rather than a hidden timer.
        // Dust lives on the run's internal clock (tier-scaled), so the
        // wait-it-out window breathes with difficulty like every telegraph.
        st.dustAcc = (st.dustAcc || 0) + dtS * 1000;
        st.dust.forEach((timer, key) => {
            if (st.dustAcc >= timer) {
                const el = document.getElementById(`eg-dust-${key}`);
                if (el) { el.classList.add('fade'); setTimeout(() => { try { el.remove(); } catch (e) {} }, 300); }
                st.dust.delete(key);
                st.dustWarn.delete(key);
            } else if (timer - st.dustAcc < EG_SPROUT_DUST_WARN_MS) {
                if (!st.dustWarn.has(key)) {
                    st.dustWarn.add(key);
                    const el = document.getElementById(`eg-dust-${key}`);
                    if (el) el.classList.add('expiring');
                }
            }
        });

        // Pollen motes: radial shower, contact damage.
        for (let i = st.motes.length - 1; i >= 0; i--) {
            const m = st.motes[i];
            m.x += m.vx * dtS;
            m.y += m.vy * dtS;
            m.el.style.transform = 'translate(' + Math.round(m.x) + 'px,' + Math.round(m.y) + 'px)';
            if (pr && now >= st.moteCd && _egNkCircleHit(m.x, m.y, 8, pr, 0)) {
                st.moteCd = now + EG_SPROUT_MOTE_CD_MS;
                const dealt = _egNkHit(EG_SPROUT_MOTE_DMG, null, level);
                _egNkAbilityHitToast(dealt, 'The Sprout', 'Pollen');
            }
            if (m.x < -30 || m.x > W + 30 || m.y < -30 || m.y > H + 30 || (m.life -= dtS * 1000) <= 0) {
                try { m.el.remove(); } catch (e) {}
                st.motes.splice(i, 1);
            }
        }

        return true;
    });
}


// ── 60% gate: Bramble Wall ──────────────────────────────────────────────

function _egSproutBrambleWall(st) {
    if (st.bramble) return;
    const gridR = (typeof _egHzGridRect === 'function') ? _egHzGridRect() : null;
    if (!gridR) return;
    const T = 14; // bramble strip thickness
    const mk = (x, y, w, h) => {
        const el = _egNkEl(st.run, 'div', 'eg-sprout-bramble');
        el.style.left = Math.round(x) + 'px';
        el.style.top = Math.round(y) + 'px';
        el.style.width = Math.round(w) + 'px';
        el.style.height = Math.round(h) + 'px';
        return el;
    };
    const strips = [
        mk(gridR.left, gridR.top - T, gridR.width, T),          // top edge
        mk(gridR.left, gridR.bottom, gridR.width, T),           // bottom edge
        mk(gridR.left - T, gridR.top, T, gridR.height),         // left edge
        mk(gridR.right, gridR.top, T, gridR.height),            // right edge
    ];
    // Three thorned whips lash outward from random grid-edge points.
    const whips = EG_SPROUT_WHIP_TIMES.map(at => {
        const side = Math.floor(Math.random() * 4);
        let bx, by, rot;
        if (side === 0) { bx = gridR.left + Math.random() * gridR.width; by = gridR.top - T; rot = -Math.PI / 2; }       // up
        else if (side === 1) { bx = gridR.left + Math.random() * gridR.width; by = gridR.bottom + T; rot = Math.PI / 2; } // down
        else if (side === 2) { bx = gridR.left - T; by = gridR.top + Math.random() * gridR.height; rot = Math.PI; }       // left
        else { bx = gridR.right + T; by = gridR.top + Math.random() * gridR.height; rot = 0; }                            // right
        const el = _egNkEl(st.run, 'div', 'eg-sprout-whip');
        el.style.transformOrigin = '0 50%';
        el.style.transform = 'rotate(' + rot + 'rad)';
        // Pre-lash telegraph: a coiled thorn nub marks each lash point from
        // spawn, so every whip has a visible "coming from here" tell.
        el.style.width = '10px';
        el.classList.add('coiled');
        return { at, bx, by, rot, len: 0, hit: false, done: false, el };
    });
    // Root tendrils + cell locks: the wall visibly roots into the outermost
    // ring of cells (connector from the strip into each ring cell) and every
    // ring cell gets a thorn badge + pulsing green seal — so "these cells are
    // the ones the wall is blocking" reads at a glance.
    const rows = (typeof cur !== 'undefined' && cur && cur.grid) ? cur.grid.length : 0;
    const cols = rows ? (cur.grid[0] ? cur.grid[0].length : 0) : 0;
    const connEls = [], lockEls = [];
    if (rows && cols) {
        let i = 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (r !== 0 && c !== 0 && r !== rows - 1 && c !== cols - 1) continue;
                const cell = document.getElementById(`g-${r}-${c}`);
                if (!cell) continue;
                const cr = cell.getBoundingClientRect();
                const cx = cr.left + cr.width / 2, cy = cr.top + cr.height / 2;
                // Connector: a thin thorned root from the wall strip into the cell.
                const conn = _egNkEl(st.run, 'div', 'eg-sprout-conn');
                conn.style.animationDelay = ((i * 26) % 520) + 'ms'; // staggered grow-in wave
                if (r === 0) {
                    conn.style.left = Math.round(cx - 2) + 'px'; conn.style.top = Math.round(gridR.top) + 'px';
                    conn.style.width = '4px'; conn.style.height = Math.max(4, Math.round(cy - gridR.top)) + 'px';
                } else if (r === rows - 1) {
                    conn.style.left = Math.round(cx - 2) + 'px'; conn.style.top = Math.round(cy) + 'px';
                    conn.style.width = '4px'; conn.style.height = Math.max(4, Math.round(gridR.bottom - cy)) + 'px';
                } else if (c === 0) {
                    conn.style.left = Math.round(gridR.left) + 'px'; conn.style.top = Math.round(cy - 2) + 'px';
                    conn.style.width = Math.max(4, Math.round(cx - gridR.left)) + 'px'; conn.style.height = '4px';
                } else {
                    conn.style.left = Math.round(cx) + 'px'; conn.style.top = Math.round(cy - 2) + 'px';
                    conn.style.width = Math.max(4, Math.round(gridR.right - cx)) + 'px'; conn.style.height = '4px';
                }
                connEls.push(conn);
                // Cell lock: thorn badge + green seal tint on the cell itself.
                cell.classList.add('eg-brambled');
                const lock = document.createElement('span');
                lock.className = 'eg-sprout-ringlock';
                lock.id = `eg-ringlock-${r}-${c}`;
                lock.textContent = '🌵';
                cell.appendChild(lock);
                lockEls.push(lock);
                i++;
            }
        }
    }
    st.bramble = { t: 0, strips, whips, connEls, lockEls };
    _egNkToast('eg_sprout_bramble', '🌿 Bramble Wall! The edges are overgrown — mind the thorns!');
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('sprout_thorn'); } catch (e) {}
}


// ── 30% gate: Blooming Doom ─────────────────────────────────────────────

function _egSproutGrowBud(st) {
    const pool = _egSproutVinePool();
    const all = [];
    if (typeof cur !== 'undefined' && cur && cur.grid) {
        for (let r = 0; r < cur.grid.length; r++)
            for (let c = 0; c < cur.grid[r].length; c++)
                all.push([r, c]);
    }
    const spot = (pool.length ? pool : all)[Math.floor(Math.random() * Math.max(1, (pool.length ? pool : all).length))];
    if (!spot) return;
    const [r, c] = spot;
    const cell = document.getElementById(`g-${r}-${c}`);
    if (!cell) return;
    const cr = cell.getBoundingClientRect();
    const el = _egNkEl(st.run, 'div', 'eg-sprout-bud', '🌸');
    el.style.left = Math.round(cr.left + cr.width / 2) + 'px';
    el.style.top = Math.round(cr.top + cr.height / 2) + 'px';
    el.style.fontSize = EG_SPROUT_BUD_R + 'px';
    el.style.transform = 'translate(-50%,-50%) scale(0.15)';
    st.bud = { r, c, t: 0, el };
    _egNkToast('eg_sprout_bud', '🌸 A doom bud is swelling — something is about to bloom!');
}


function _egSproutBloom(st, br, bc, tNow) {
    // Dust deadlines are stored relative to the run's internal (tier-scaled)
    // clock, and the accumulator resets here so this bloom's dust counts its
    // full 6.5s from now (buds are 8s apart, so earlier dust has always
    // expired before a reset can shift its deadline).
    st.dustAcc = 0;
    void tNow;
    // 1) Pollen-dust a 5x5 region around the bloom (unsolved cells only).
    let dusted = 0;
    if (typeof cur !== 'undefined' && cur && cur.grid && (typeof userGrid !== 'undefined')) {
        const sol = cur.grid, usr = userGrid;
        for (let r = br - 2; r <= br + 2; r++) {
            for (let c = bc - 2; c <= bc + 2; c++) {
                if (r < 0 || c < 0 || r >= sol.length || c >= sol[r].length) continue;
                if (usr[r][c] === sol[r][c]) continue;             // solved cells immune
                const key = `${r}-${c}`;
                if (st.dust.has(key)) continue;
                const cell = document.getElementById(`g-${r}-${c}`);
                if (!cell) continue;
                const el = document.createElement('span');
                el.className = 'eg-sprout-dust';
                el.id = `eg-dust-${key}`;
                el.textContent = '🌼';
                cell.appendChild(el);
                st.dust.set(key, tNow + EG_SPROUT_DUST_MS);
                dusted++;
            }
        }
    }
    // 2) Radial pollen mote shower from the bloom point.
    const cell = document.getElementById(`g-${br}-${bc}`);
    const cr = cell ? cell.getBoundingClientRect() : null;
    const cx = cr ? cr.left + cr.width / 2 : window.innerWidth / 2;
    const cy = cr ? cr.top + cr.height / 2 : window.innerHeight / 2;
    for (let i = 0; i < EG_SPROUT_MOTE_N; i++) {
        const a = (i / EG_SPROUT_MOTE_N) * Math.PI * 2 + Math.random() * 0.5;
        const el = _egNkEl(st.run, 'div', 'eg-sprout-mote', '🌼');
        st.motes.push({
            x: cx, y: cy,
            vx: Math.cos(a) * EG_SPROUT_MOTE_SPEED * (0.8 + Math.random() * 0.4),
            vy: Math.sin(a) * EG_SPROUT_MOTE_SPEED * (0.8 + Math.random() * 0.4),
            born: 0, life: EG_SPROUT_MOTE_LIFE_MS, el,
        });
    }
    _egNkToast('eg_sprout_bloom', '🌼 The doom bud bursts — ' + dusted + ' cells are dusted! Fill them and the pollen finds you!');
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('sprout_bloom'); } catch (e) {}
}


//------------------------------------------------------------------------
//-------------------MECHANIC: SPROUTLINGS---------------------------------
//------------------------------------------------------------------------
// The classic chase — a pack of sproutlings scuttles after the player for
// a while. Kept from the original fight, now phase-scaled and with the
// polished leaf-wiggle visual.
function _egMechSproutlings(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const count = [0, 6, 7, 8][p];
    const speed = [0, 55, 65, 78][p];
    const dmgPct = [0, 0.035, 0.04, 0.05][p];
    const durMs = 10000;
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const minis = [];
    for (let i = 0; i < count; i++) {
        const el = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-sprout', '🌱');
        const m = {
            x: i % 2 === 0 ? 50 : window.innerWidth - 50,
            y: window.innerHeight - 60 - i * 30,
            wob: Math.random() * 6.28, cdUntil: 0, el,
        };
        minis.push(m);
    }
    _egNkToast('eg_mech_sprout', '🌱 The Sprout: Sproutlings! They just want a hug!');
    let e = 0;
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        const c = _egNkPlayerCenter();
        const pr = _egNkPlayerRect();
        minis.forEach(m => {
            if (c) {
                const dx = c.x - m.x, dy = c.y - m.y;
                const d = Math.sqrt(dx * dx + dy * dy) || 1;
                m.x += (dx / d) * speed * dtS + Math.cos(e / 1000 * 3 + m.wob) * 12 * dtS;
                m.y += (dy / d) * speed * dtS;
            }
            m.el.style.transform = 'translate(' + Math.round(m.x - 14) + 'px,' + Math.round(m.y - 14) + 'px)';
            if (pr && now >= m.cdUntil && _egNkDotHit(m.el, pr, 2)) {
                m.cdUntil = now + 700;
                _egNkHit(dmgPct, null, level);
            }
        });
        return e < durMs;
    });
}
