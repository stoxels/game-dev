//------------------------------------------------------------------------
//-------------------BOSS: THE CREEPER (boss_creeper)---------------------
//------------------------------------------------------------------------
// REWORK — green-thing homage. The boss is a nest mother: it sics packs of
// stalking creepers on you, chains primed TNT under your feet and, at the
// very end, swells up and mega-detonates itself.
//
//   Phase 1 (100–60%) — CREEPER PACK. 2–3 creepers scuttle in from the
//                       edges and stalk you: their fuse HEATS while you are
//                       close (white flash + swelling body) and COOLS while
//                       you keep your distance. Fuse ≥ 1 = detonation.
//                       Plus FUSE POUNCE: a creeper drops onto your current
//                       position, hisses briefly, and blows.
//   Phase 2 ( ≤60%)   — TNT CHAIN. A cluster of primed TNT blocks rains
//                       down around you, flashes faster and faster, then
//                       detonates in a rolling chain reaction outward from
//                       the centre block. Leave the cluster entirely!
//   Phase 3 ( ≤30%)   — bigger packs (one CHARGED creeper with a blue aura,
//                       faster heat, bigger boom), double pounces, double
//                       TNT clusters.
//   Finale ( ≤10%)    — SSSS… BOOM (one-shot set-piece, Bomb-Maze style):
//                       the boss goes immune and shields, a 3…2…1 fuse
//                       counts down while a huge red blast ring telegraph
//                       grows around it, then it mega-detonates (huge
//                       radius + screen flash + lingering crater). Be
//                       outside the ring! Charge bar frozen for the whole
//                       set-piece (gate in _egTickPlayer).
//
// Tier scaling: every dodge run uses the shared EG_NK_TIER_FACTOR clock,
// so gentle tiers get longer telegraphs and brutal tiers tighter ones.
//
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule + hooks)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//
// DEBUG_SLOW: while true, telegraphs/fuses are stretched 2.5× so
// screenshots can catch mid-animation states. Flip to false for ship.
//------------------------------------------------------------------------

const _EG_CRP_DEBUG_SLOW = true;
const _EG_CRP_DEBUG_MULT = _EG_CRP_DEBUG_SLOW ? 2.5 : 1;

Object.assign(EG_BOSS_DEFS, {
    boss_creeper: {
        id: 'boss_creeper', name: 'The Creeper', emoji: '💥',
        baseHP: 1020, baseDamage: 23, chargeMax: 12,
        element: 'fire', resistances: { fire: 30, cold: 15, lightning: 15, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_creeper: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.00 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'creeper_pack', intervalBase: 17000, intervalVariance: 4000, handler: '_egMechCreeperPack' },
            { name: 'fuse_pounce', intervalBase: 15000, intervalVariance: 4000, handler: '_egMechCreeperPounce' },
            { name: 'tnt_chain', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechTntChain', phase2Only: true },
        ],
        onPhaseEnter: _egCrpOnPhaseEnter,
    },
});


// ── Shared tuning (per-mechanic constants live with their mechanics) ────────
const EG_CRP_PACK_DMG = [0, 0.20, 0.24, 0.28];      // per creeper blast, by phase
const EG_CRP_PACK_DMG_CHARGED = 0.34;               // charged creeper blast (P3)
const EG_CRP_TNT_DMG = [0, 0, 0.15, 0.18];          // per TNT block, by phase
const EG_CRP_POUNCE_DMG = [0, 0.17, 0.20, 0.23];    // per pounce blast, by phase
const EG_CRP_FINAL_DMG = 0.32;                      // SSSS…BOOM mega blast
const EG_CRP_HIT_CD_MS = 700;                       // shared blast-hit cooldown


//------------------------------------------------------------------------
//-------------------SHARED VISUAL HELPERS---------------------------------
//------------------------------------------------------------------------

// Center of the playable grid (from corner cells), or viewport fallback.
function _egCrpGridCenter() {
    if (typeof cur !== 'undefined' && cur && cur.grid && cur.grid.length && cur.grid[0]) {
        const a = document.getElementById('g-0-0');
        const b = document.getElementById('g-' + (cur.grid.length - 1) + '-' + (cur.grid[0].length - 1));
        if (a && b && a.isConnected && b.isConnected) {
            const ra = a.getBoundingClientRect();
            const rb = b.getBoundingClientRect();
            if (ra.width && rb.width) {
                return { x: (ra.left + rb.right) / 2, y: (ra.top + rb.bottom) / 2 };
            }
        }
    }
    return { x: window.innerWidth / 2, y: window.innerHeight * 0.42 };
}

// One creeper detonation: white-hot flash + orange core + smoke ring, plus
// a lingering scorch crater (the creeper signature). Always spawned
// body-level (run-independent) so the visuals survive the run ending in
// the same frame — the layer self-removes. pct > 0 damages the player when
// their hitbox overlaps the blast disc.
function _egCrpBoom(x, y, radius, pct, level, label) {
    const R = Math.max(10, radius);
    const layer = document.createElement('div');
    layer.className = 'eg-crp-burst';
    layer.style.left = Math.round(x - R) + 'px';
    layer.style.top = Math.round(y - R) + 'px';
    layer.style.width = (R * 2) + 'px';
    layer.style.height = (R * 2) + 'px';
    document.body.appendChild(layer);

    const core = document.createElement('div');
    core.className = 'eg-crp-core';
    layer.appendChild(core);
    const ring = document.createElement('div');
    ring.className = 'eg-crp-ring';
    layer.appendChild(ring);
    for (let i = 0; i < 6; i++) {
        const s = document.createElement('div');
        s.className = 'eg-crp-smoke';
        const ang = Math.random() * Math.PI * 2;
        const dist = (R * 0.3) + Math.random() * (R * 0.8);
        s.style.setProperty('--dx', Math.round(Math.cos(ang) * dist) + 'px');
        s.style.setProperty('--dy', Math.round(Math.sin(ang) * dist) + 'px');
        s.style.animationDelay = (Math.random() * 120) + 'ms';
        layer.appendChild(s);
    }
    // Lingering scorch crater: a dark circle that fades out slowly.
    const crater = document.createElement('div');
    crater.className = 'eg-crp-crater';
    crater.style.width = Math.round(R * 1.1) + 'px';
    crater.style.height = Math.round(R * 1.1) + 'px';
    crater.style.left = Math.round(x - R * 0.55) + 'px';
    crater.style.top = Math.round(y - R * 0.55) + 'px';
    document.body.appendChild(crater);
    setTimeout(() => { try { crater.remove(); } catch (e) {} }, _EG_CRP_DEBUG_SLOW ? 6000 : 4200);

    setTimeout(() => { try { layer.remove(); } catch (e) {} }, _EG_CRP_DEBUG_SLOW ? 2600 : 950);

    if (pct > 0) {
        const pr = _egNkPlayerRect();
        if (pr && _egNkCircleHit(x, y, R, pr, 0)) {
            const dealt = _egNkHit(pct, 'fire', level);
            _egNkAbilityHitToast(dealt, 'The Creeper', label);
        }
    }
}

// Builds one creeper sprite: a fixed outer dot (translate-positioned) with
// the classic green cube + face as CHILD elements (scale/filter animations
// run on the child — never on the fixed wrapper).
function _egCrpSprite(run, charged) {
    const dot = _egNkEl(run, 'div', 'eg-nk-dot eg-crp-creeper' + (charged ? ' eg-crp-charged' : ''));
    const body = document.createElement('div');
    body.className = 'eg-crp-body';
    dot.appendChild(body);
    return { dot, body };
}

// Updates a creeper sprite from its fuse (0..1): swell + white flash as the
// fuse climbs. All style writes go on the body child.
function _egCrpFuseVisual(sprite, fuse) {
    if (!sprite.body) return;
    const swell = 1 + fuse * 0.4;
    sprite.body.style.scale = swell.toFixed(3);
    if (fuse > 0.35) {
        // Blink faster the hotter the fuse gets.
        const blinkMs = Math.max(70, 260 - fuse * 190);
        sprite.body.style.animation = 'eg-crp-flash ' + blinkMs + 'ms steps(2) infinite';
    } else {
        sprite.body.style.animation = '';
    }
}

// Teardown — registered in boss-framework.js cleanup chain (startsWith
// 'boss_creeper'; runtime ids are suffixed). Clears the set-piece.
function _egCrpTeardown() {
    if (_egCrpFinal) _egCrpFinalEnd(_egCrpFinal);
    document.body.classList.remove('eg-crp-flash');
    document.querySelectorAll('.eg-crp-flying').forEach(el => el.classList.remove('eg-crp-flying'));
}


//------------------------------------------------------------------------
//-------------------CREEPER PACK (all phases, signature)------------------
//------------------------------------------------------------------------
// 2–4 creepers scuttle in from the screen edges and stalk the player: the
// fuse HEATS while the player is close (hiss: white flash + swell) and
// COOLS while they keep their distance. Fuse ≥ 1 → detonation. Standing
// still = surrounded by simultaneous booms; perfect kiting = they cool off
// and wander away when the pack window ends.
const EG_CRP_PACK_COUNT = [0, 2, 3, 4];
const EG_CRP_PACK_SPEED = [0, 80, 95, 112];
const EG_CRP_PACK_HEAT_RATE = [0, 0.40, 0.50, 0.62];    // fuse/s inside range
const EG_CRP_PACK_COOL_RATE = 0.35;                     // fuse/s outside range
const EG_CRP_PACK_RANGE = 130;
const EG_CRP_PACK_BLAST_R = [0, 150, 170, 190];
const EG_CRP_PACK_DUR_MS = 14000;

function _egMechCreeperPack(monster, phase) {
    if (_egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const run = _egNkNewRun(monster && monster.id, true);
    // Field mechanic: passive so it never trips _egNkDodgeBusy() — packs
    // overlap TNT chains and pounces instead of starving them (same fix as
    // the Bomber's Mine Collar).
    run.passive = true;
    const speed = EG_CRP_PACK_SPEED[p];
    const heatRate = EG_CRP_PACK_HEAT_RATE[p];
    const blastR = EG_CRP_PACK_BLAST_R[p];
    const durMs = EG_CRP_PACK_DUR_MS * _EG_CRP_DEBUG_MULT;
    const dmgPct = EG_CRP_PACK_DMG[p];

    _egNkToast('eg_mech_creeper_pack', '💥 The Creeper: CREEPER PACK — mind the fuses!', '#22c55e');

    const creepers = [];
    for (let i = 0; i < EG_CRP_PACK_COUNT[p]; i++) {
        // One CHARGED creeper joins the pack in phase 3 (blue aura, faster,
        // bigger boom) — the Minecraft lightning-charged homage.
        const charged = p >= 3 && i === EG_CRP_PACK_COUNT[p] - 1;
        const sprite = _egCrpSprite(run, charged);
        const side = i % 4;
        const x = side === 0 ? 60 : side === 2 ? window.innerWidth - 60 : Math.random() * window.innerWidth;
        const y = side === 1 ? 90 : side === 3 ? window.innerHeight - 120 : Math.random() * (window.innerHeight - 200) + 90;
        creepers.push({
            sprite, x, y, fuse: 0, blown: false,
            rate: heatRate * (charged ? 1.6 : 1),
            speed: speed * (charged ? 1.25 : 1),
            radius: blastR + (charged ? 55 : 0),
            dmg: charged ? EG_CRP_PACK_DMG_CHARGED : dmgPct,
        });
    }

    let t = 0;
    let lastBlastAt = 0;
    _egNkLoop(run, (dtS) => {
        t += dtS * 1000;
        let pending = false;
        const c = _egNkPlayerCenter();

        creepers.forEach(s => {
            if (s.blown) return;
            // Creepers despawn un-blown when the pack window ends.
            if (t >= durMs) {
                s.blown = true;
                if (s.sprite.dot) { s.sprite.dot.classList.add('eg-crp-flee'); }
                setTimeout(() => { try { s.sprite.dot.remove(); } catch (e) {} }, 600);
                return;
            }
            pending = true;
            if (c) {
                const dx = c.x - s.x, dy = c.y - s.y;
                const d = Math.sqrt(dx * dx + dy * dy) || 1;
                s.x += (dx / d) * s.speed * dtS;
                s.y += (dy / d) * s.speed * dtS;
                s.fuse += (d < EG_CRP_PACK_RANGE ? s.rate : -EG_CRP_PACK_COOL_RATE) * dtS;
                s.fuse = Math.max(0, Math.min(1, s.fuse));
            }
            if (s.sprite.dot) s.sprite.dot.style.transform = 'translate(' + Math.round(s.x - 22) + 'px,' + Math.round(s.y - 22) + 'px)';
            _egCrpFuseVisual(s.sprite, s.fuse);
            if (s.fuse >= 1) {
                s.blown = true;
                _egCrpBoom(s.x, s.y, s.radius, s.dmg, level, 'Creeper Pack');
                setTimeout(() => { try { s.sprite.dot.remove(); } catch (e) {} }, 300);
            }
        });

        return pending;
    });
}


//------------------------------------------------------------------------
//-------------------FUSE POUNCE (all phases)------------------------------
//------------------------------------------------------------------------
// A creeper leaps from above onto your CURRENT position: a shadow marker
// grows while it falls, it lands, hisses (fast white blink + swell) for a
// short fuse, then blows. One pounce per trigger; two staggered in P3.
const EG_CRP_POUNCE_FALL_MS = 550;
const EG_CRP_POUNCE_FUSE_MS = 1500;
const EG_CRP_POUNCE_BLAST_R = 140;

function _egMechCreeperPounce(monster, phase) {
    if (_egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const run = _egNkNewRun(monster && monster.id, true);
    const pounces = p >= 3 ? 2 : 1;
    const gapMs = p >= 3 ? 2500 * _EG_CRP_DEBUG_MULT : 0;
    const fallMs = EG_CRP_POUNCE_FALL_MS * _EG_CRP_DEBUG_MULT;
    const fuseMs = EG_CRP_POUNCE_FUSE_MS * _EG_CRP_DEBUG_MULT;
    const dmgPct = EG_CRP_POUNCE_DMG[p];

    _egNkToast('eg_mech_creeper_pounce', '💥 The Creeper: FUSE POUNCE — move from your spot!', '#22c55e');

    for (let i = 0; i < pounces; i++) {
        const at = i * gapMs;
        const pc = _egNkPlayerCenter() || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        const x = Math.max(70, Math.min(window.innerWidth - 70, pc.x));
        const y = Math.max(110, Math.min(window.innerHeight - 110, pc.y));
        const sprite = _egCrpSprite(run, false);
        const marker = _egNkEl(run, 'div', 'eg-crp-marker');
        marker.style.width = '84px';
        marker.style.height = '84px';
        marker.style.left = Math.round(x - 42) + 'px';
        marker.style.top = Math.round(y - 42) + 'px';

        const state = { phase: 'wait', t: -at };
        _egNkLoop(run, (dtS) => {
            if (state.phase === 'done') return false;
            state.t += dtS * 1000;
            let t2 = state.t;
            if (t2 < 0) return true;

            if (state.phase === 'wait') {
                state.phase = 'fall';
            }
            if (state.phase === 'fall') {
                // Creeper descends onto the marker while it grows.
                const k = Math.min(1, t2 / fallMs);
                const ease = k * k;
                if (sprite.dot) sprite.dot.style.transform = 'translate(' + Math.round(x - 22) + 'px,' + Math.round(y - 190 * (1 - ease) - 22) + 'px)';
                marker.style.opacity = String(0.35 + ease * 0.65);
                if (k >= 1) {
                    state.phase = 'hiss';
                    state.t = 0;
                    t2 = 0;
                }
                return true;
            }
            if (state.phase === 'hiss') {
                _egCrpFuseVisual(sprite, Math.min(1, t2 / fuseMs) * 1.15);
                if (t2 >= fuseMs) {
                    state.phase = 'done';
                    _egCrpBoom(x, y, EG_CRP_POUNCE_BLAST_R, dmgPct, level, 'Fuse Pounce');
                    setTimeout(() => {
                        try { sprite.dot.remove(); marker.remove(); } catch (e) {}
                    }, 200);
                }
                return true;
            }
            return true;
        });
    }
}


//------------------------------------------------------------------------
//-------------------TNT CHAIN (phase 2+, signature)-----------------------
//------------------------------------------------------------------------
// A cluster of primed TNT blocks rains down around your position. The
// blocks flash faster and faster during the wind-up, then detonate in a
// rolling CHAIN REACTION outward from the centre block (~85 ms steps).
// The blast wave travels visibly — leave the cluster entirely.
const EG_CRP_TNT_COUNT = [0, 0, 6, 9];
const EG_CRP_TNT_CLUSTER_R = [0, 0, 190, 230];
const EG_CRP_TNT_WINDUP_MS = 2100;
const EG_CRP_TNT_CASCADE_MS = 85;
const EG_CRP_TNT_BLAST_R = 110;

function _egMechTntChain(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(2, Math.min(3, Number(phase) || 2));
    const level = monster ? monster.level : 1;
    const run = _egNkNewRun(monster && monster.id, true);
    const count = EG_CRP_TNT_COUNT[p];
    const clusterR = EG_CRP_TNT_CLUSTER_R[p];
    const windupMs = EG_CRP_TNT_WINDUP_MS * _EG_CRP_DEBUG_MULT;
    const dmgPct = EG_CRP_TNT_DMG[p];
    const pc = _egNkPlayerCenter() || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    // Cluster centre biased toward the player, clamped on-screen.
    const cx = Math.max(clusterR * 0.7, Math.min(window.innerWidth - clusterR * 0.7, pc.x + (Math.random() * 2 - 1) * 60));
    const cy = Math.max(clusterR * 0.7 + 40, Math.min(window.innerHeight - clusterR * 0.7 - 30, pc.y + (Math.random() * 2 - 1) * 60));

    _egNkToast('eg_mech_creeper_tnt', '💥 The Creeper: TNT CHAIN — get out of the cluster!', '#f87171');

    const blocks = [];
    for (let i = 0; i < count; i++) {
        const ang = (Math.PI * 2 * i) / count + Math.random() * 0.5;
        const dist = clusterR * (0.25 + Math.random() * 0.75);
        const x = Math.max(60, Math.min(window.innerWidth - 60, cx + Math.cos(ang) * dist));
        const y = Math.max(90, Math.min(window.innerHeight - 90, cy + Math.sin(ang) * dist));
        const el = _egNkEl(run, 'div', 'eg-nk-dot eg-crp-tnt', 'TNT');
        el.style.transform = 'translate(' + Math.round(x - 24) + 'px,' + Math.round(y - 16) + 'px)';
        blocks.push({ x, y, el, dCenter: Math.hypot(x - cx, y - cy), blown: false });
    }
    blocks.sort((a, b) => a.dCenter - b.dCenter);

    let t = 0;
    let boomIdx = 0;
    _egNkLoop(run, (dtS) => {
        t += dtS * 1000;
        let pending = false;

        // Wind-up: flash accelerates; CSS handles the blink rate ramp.
        if (t < windupMs) {
            pending = true;
            const frac = t / windupMs;
            blocks.forEach(b => {
                if (b.el) b.el.style.animationDuration = (0.9 - frac * 0.62).toFixed(2) + 's';
            });
            return true;
        }

        // Chain reaction: centre block first, cascading outward.
        while (boomIdx < blocks.length && t >= windupMs + boomIdx * EG_CRP_TNT_CASCADE_MS) {
            const b = blocks[boomIdx];
            boomIdx++;
            if (b.blown) continue;
            b.blown = true;
            if (b.el) { try { b.el.remove(); } catch (e) {} b.el = null; }
            _egCrpBoom(b.x, b.y, EG_CRP_TNT_BLAST_R, dmgPct, level, 'TNT Chain');
        }
        // Keep the run alive for the tail of the last blasts.
        return boomIdx < blocks.length || t < windupMs + blocks.length * EG_CRP_TNT_CASCADE_MS + 800;
    });
}


//------------------------------------------------------------------------
//-------------------SSSS… BOOM (≤10% HP one-shot finale)------------------
//------------------------------------------------------------------------
// The boss swells, goes immune + shielded, and a 3…2…1 fuse counts down
// while a huge red blast ring grows around it. At zero: MEGA detonation
// (huge radius + screen flash + a long-lasting crater) and the immunity
// releases. The auto-attack charge bar freezes for the whole set-piece
// (gate in _egTickPlayer, endgame-encounter.js — _egCrpFinalActive).
const EG_CRP_FINAL_CD_TICK_MS = 800;
const EG_CRP_FINAL_CD_TICKS = 3;
const EG_CRP_FINAL_BLAST_R_PCT = 0.42;              // of min(vw, vh)

// Set while the finale runs (read by _egTickPlayer's charge-freeze gate).
let _egCrpFinal = null;

function _egCrpFinalActive() {
    return !!_egCrpFinal && !_egCrpFinal.finished;
}

// Phase-enter hook: starts the ≤10% HP watcher (the framework only calls
// onPhaseEnter on transitions, so a dive from 30% → 10% needs its own gate).
function _egCrpOnPhaseEnter(monster, newPhase) {
    if (newPhase !== 3) return false;
    try { _egCrpStartFinalWatcher(monster); } catch (e) {}
    return false;
}

function _egCrpStartFinalWatcher(monster) {
    if (!monster || _egCrpFinal) return;
    const run = _egNkNewRun(monster.id, true);
    run.passive = true;
    _egNkLoop(run, () => {
        if (_egCrpFinal) return false;
        try {
            if (monster.currentHP <= monster.maxHP * 0.10) {
                _egCrpFinalStart(monster);
                return false;
            }
        } catch (e) { return false; }
        return true;
    });
}

function _egCrpFinalStart(monster) {
    if (_egCrpFinal || !monster) return;

    // The arena goes quiet: kill every other run of this boss.
    Array.from(_egNkRuns.values()).forEach(r => {
        if (r.bossId === monster.id) { try { _egNkKillRun(r); } catch (e) {} }
    });

    const g = {
        monsterId: monster.id,
        finished: false,
        count: EG_CRP_FINAL_CD_TICKS,
        overlay: null,
        ringEl: null,
        run: null,
        cdTimer: null,
        bangAt: 0,
        boomed: false,
        center: _egCrpGridCenter(),
        blastR: Math.min(window.innerWidth, window.innerHeight) * EG_CRP_FINAL_BLAST_R_PCT,
    };
    _egCrpFinal = g;

    // Freeze the auto-attack charge bar for the whole set-piece (the gate
    // lives in _egTickPlayer; this class is the visual twin).
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('eg-charge-paused');
    });

    // Growing blast-radius ring (red, dashed) centred on the boss.
    const ring = document.createElement('div');
    ring.className = 'eg-crp-finalring';
    ring.style.width = '0px';
    ring.style.height = '0px';
    ring.style.left = Math.round(g.center.x) + 'px';
    ring.style.top = Math.round(g.center.y) + 'px';
    document.body.appendChild(ring);
    g.ringEl = ring;
    // Animate to full size over the countdown (debug-stretched so it can
    // be screenshot mid-growth).
    const growS = _EG_CRP_DEBUG_SLOW ? 8 : 2.6;
    requestAnimationFrame(() => {
        ring.style.transition = 'width ' + growS + 's ease-in, height ' + growS + 's ease-in, margin ' + growS + 's ease-in';
        ring.style.width = Math.round(g.blastR * 2) + 'px';
        ring.style.height = Math.round(g.blastR * 2) + 'px';
        ring.style.marginLeft = Math.round(-g.blastR) + 'px';
        ring.style.marginTop = Math.round(-g.blastR) + 'px';
    });

    // Boss swell: the card grows and pulses like a primed creeper.
    const card = document.getElementById('eg-card-' + monster.id);
    const wrap = card ? (card.querySelector('.eg-emoji-wrapper') || card) : null;
    if (wrap) {
        wrap.classList.add('eg-crp-flying');
        wrap.classList.add('eg-nk-shielded');
    }

    // Countdown overlay.
    const ov = document.createElement('div');
    ov.className = 'eg-crp-cd';
    ov.innerHTML =
        '<div class="eg-crp-cd-label">💥 SSSS…</div>' +
        '<div class="eg-crp-cd-num eg-crp-cd-pop">' + g.count + '</div>' +
        '<div class="eg-crp-cd-hint">The Creeper is priming — get OUT of the red ring!</div>';
    document.body.appendChild(ov);
    g.overlay = ov;

    _egNkToast('eg_mech_creeper_final_cd', '💥 SSSS… BOOM INCOMING — flee the red ring!', '#f87171');

    // Boss immunity so the set-piece reads as a hold (released at the end).
    monster.bossImmune = true;

    // Debug: extra-long ticks so screenshots can catch the ring + countdown.
    const cdTick = EG_CRP_FINAL_CD_TICK_MS * (_EG_CRP_DEBUG_SLOW ? 10 : 1);
    g.cdTimer = setInterval(() => {
        if (!_egCrpFinal || _egCrpFinal !== g || g.finished) return;
        if (_egNkFrozen()) return;   // pause / death / inactive hold the count
        g.count--;
        if (g.count <= 0) {
            clearInterval(g.cdTimer);
            g.cdTimer = null;
            try { g.overlay.remove(); } catch (e) {}
            g.overlay = null;
            _egCrpFinalBang(g, monster);
            return;
        }
        const num = g.overlay && g.overlay.querySelector('.eg-crp-cd-num');
        if (num) {
            num.textContent = g.count;
            num.classList.remove('eg-crp-cd-pop');
            void num.offsetWidth;
            num.classList.add('eg-crp-cd-pop');
        }
    }, cdTick);
}

// The BOOM: one gigantic blast around the boss position + screen flash +
// a long crater. Damage test once, globally (outside the ring = hit).
function _egCrpFinalBang(g, monster) {
    const level = monster ? monster.level : 1;
    const run = _egNkNewRun(g.monsterId, true);
    g.run = run;
    run.onKill = () => { if (_egCrpFinal === g) { try { _egCrpFinalEnd(g); } catch (e) {} } };
    g.bangAt = performance.now();

    _egNkToast('eg_mech_creeper_final_bang', '💥💀 SSSS… BOOM!', '#f87171');

    // Screen flash at the moment of the bang.
    document.body.classList.add('eg-crp-flash');
    setTimeout(() => document.body.classList.remove('eg-crp-flash'), 700);

    // Mega blast, centred on the boss (run-independent visuals).
    _egCrpBoom(g.center.x, g.center.y, g.blastR, EG_CRP_FINAL_DMG, level, 'SSSS…BOOM');

    // Small shockwave ring expanding past the blast edge (visual only).
    for (let i = 1; i <= 3; i++) {
        const id = setTimeout(() => {
            _egCrpBoom(g.center.x + (Math.random() * 2 - 1) * g.blastR * 0.6,
                g.center.y + (Math.random() * 2 - 1) * g.blastR * 0.6,
                g.blastR * (0.4 + i * 0.18), 0, level, '');
        }, i * 160);
        run.timers.push(id);
    }

    // Wind down, then hand control back to the boss (debug: linger long
    // enough for the blast visuals to be captured).
    const id2 = setTimeout(() => _egCrpFinalEnd(g), _EG_CRP_DEBUG_SLOW ? 7000 : 1400);
    run.timers.push(id2);
}

function _egCrpFinalEnd(g) {
    if (!g || g.finished) return;
    g.finished = true;
    if (g.cdTimer) { clearInterval(g.cdTimer); g.cdTimer = null; }
    if (g.overlay) { try { g.overlay.remove(); } catch (e) {} g.overlay = null; }
    if (g.ringEl) { try { g.ringEl.remove(); } catch (e) {} g.ringEl = null; }
    if (g.run) { try { _egNkKillRun(g.run); } catch (e) {} g.run = null; }
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('eg-charge-paused');
    });
    document.body.classList.remove('eg-crp-flash');
    document.querySelectorAll('.eg-crp-flying').forEach(el => el.classList.remove('eg-crp-flying'));

    const m = (g.monsterId && typeof _egMonsters !== 'undefined')
        ? _egMonsters.find(x => x && x.id === g.monsterId) : null;
    if (m && m.bossImmune) {
        m.bossImmune = false;
        if (typeof _egBossScheduleMechanics === 'function') {
            try { _egBossScheduleMechanics(m, 3); } catch (e) {}
        }
        if (typeof _egRenderPanel === 'function') { try { _egRenderPanel(); } catch (e) {} }
    }
    if (_egCrpFinal === g) _egCrpFinal = null;
}


//------------------------------------------------------------------------
//-------------------PLAYTEST CONSOLE HOOK (dev only)----------------------
//------------------------------------------------------------------------
// Tiny console API for playtesting with stretched debug timings:
//   _EG_CRP_DEBUG.fire('pack'|'chain'|'pounce') — runs one mechanic now
//   _EG_CRP_DEBUG.final()                       — SSSS…BOOM now
if (typeof window !== 'undefined') {
    window._EG_CRP_DEBUG = {
        fire: (name, phase) => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? _egMonsters.find(m => m && m.baseId === 'boss_creeper') : null;
            if (!monster) return 'no creeper alive';
            const fn = name === 'pack' ? _egMechCreeperPack
                : name === 'chain' ? _egMechTntChain
                : name === 'pounce' ? _egMechCreeperPounce : null;
            if (!fn) return 'unknown: ' + name;
            if (name === 'chain' && _egNkDodgeBusy()) return 'BLOCKED: dodge-busy (wait for pounces to land)';
            fn(monster, phase || monster.bossPhase || 1);
            return 'fired ' + name;
        },
        final: () => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? _egMonsters.find(m => m && m.baseId === 'boss_creeper') : null;
            if (!monster) return 'no creeper alive';
            _egCrpFinalStart(monster);
            return 'SSSS…BOOM started';
        },
    };
}
