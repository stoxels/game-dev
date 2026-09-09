//------------------------------------------------------------------------
//-------------------BOSS: THE SIREN (boss_siren)--------------------------
//------------------------------------------------------------------------
// REWORK — PoE Merveil homage, rebuilt as a full stage concert. The Siren
// fights like her myth: her voice IS the weapon. Every mechanic is sung —
// sweeping wail beams that pin the arena, an undertow whirlpool that drags
// the whole stage toward her, and the finale is her DEADLY ARIA: the
// audience of bubbles sings along, and the last note kills anyone who
// sings it wrong.
//
//   Phase 1 (100–60%) — WAIL BEAM (signature, upgraded). The beam still
//                       sweeps from its anchor — now in a variable pattern
//                       (wide swing / narrow flick / stutter reversals),
//                       and glowing ECHO ZONES spawn along its path:
//                       standing in one while the beam passes = a small
//                       heal (the sea sings with you). Bait = learn.
//                       Plus FROZEN CELLS (shared).
//   Phase 2 ( ≤60%)   — UNDERTOW. A whirlpool spins up at the anchor and
//                       DRAGS the whole arena toward it (the avatar glides
//                       in slow pulls you must fight); flotsam chunks orbit
//                       in and bite. The whirlpool then NOVAS — get out of
//                       the ring before the pull becomes a blast.
//                       Plus SIREN'S REPLY. The beam splits: a second,
//                       thinner beam mirrors the first from the opposite
//                       side — one sweeps with it, one against it. Read
//                       both.
//   Phase 3 ( ≤30%)   — Everything faster: the undertow pulls harder and
//                       novas sooner, the reply beam adds a third arc, and
//                       the wail sweeps reverse mid-song. The concert
//                       crescendos.
//   Finale ( ≤10%)    — 🌀 THE DEADLY ARIA (one-shot set-piece): the arena
//                       floods with her audience of bubbles, three rings
//                       deep. The Siren sings SONG LINES — each line
//                       lights up a chain of bubbles through the rings, and
//                       you must follow the far end: reach the last lit
//                       bubble of the line before the note lands and the
//                       rest of the song pops around you. Lines get longer
//                       and faster. The final note is the KILLER CRESSENDO:
//                       every bubble in the arena detonates EXCEPT the one
//                       far bubble — stand on it or be hit hard. Charge
//                       bar frozen for the whole set-piece (gate in
//                       _egTickPlayer via _egSireFinalActive).
//
// Tier scaling: every dodge run uses the shared EG_NK_TIER_FACTOR clock,
// so gentle tiers get longer telegraphs and brutal tiers tighter ones.
//
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule + hooks)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics (frozen_cells) live in shared-boss-abilities.js and are
// referenced by handler-name string.
//
// DEBUG_SLOW: while true, telegraphs/windups are stretched 2.5× so
// screenshots can catch mid-animation states. Flip to false for ship.
//------------------------------------------------------------------------

const _EG_SIRE_DEBUG_SLOW = true;
const _EG_SIRE_DEBUG_MULT = _EG_SIRE_DEBUG_SLOW ? 2.5 : 1;

Object.assign(EG_BOSS_DEFS, {
    boss_siren: {
        id: 'boss_siren', name: 'The Siren', emoji: '🌀',
        baseHP: 1000, baseDamage: 23, chargeMax: 11,
        element: 'cold', resistances: { fire: 15, cold: 30, lightning: 15, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_siren: {
        phases: [
            { threshold: 1.00, chargeMax: 11, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 8, damageMultiplier: 1.55 },
            { threshold: 0.30, chargeMax: 5, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'wail_beam', intervalBase: 19000, intervalVariance: 4500, handler: '_egMechSireWail' },
            { name: 'frozen_cells', intervalBase: 18000, intervalVariance: 4000, handler: '_egMechFrozenCells' },
            { name: 'undertow', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechSireUndertow', phase2Only: true },
            { name: 'sirens_reply', intervalBase: 23000, intervalVariance: 5000, handler: '_egMechSireReply', phase2Only: true },
        ],
        onPhaseEnter: _egSireOnPhaseEnter,
    },
});


// ── Shared tuning (per-mechanic constants live with their mechanics) ────────
const EG_SIRE_BEAM_DMG   = [0, 0.14, 0.16, 0.19]; // %maxHP beam touch
const EG_SIRE_ECHO_HEAL  = 0.04;                  // %maxHP echo-zone heal
const EG_SIRE_PULL_DMG   = 0.09;                  // %maxHP flotsam contact
const EG_SIRE_NOVA_DMG   = [0, 0, 0.14, 0.17];    // %maxHP whirlpool nova
const EG_SIRE_BUBBLE_DMG = 0.12;                  // %maxHP popped bubble
const EG_SIRE_CRESC_DMG  = 0.30;                  // %maxHP the killer note
const EG_SIRE_HIT_CD_MS  = 700;                   // shared touch cooldown


//------------------------------------------------------------------------
//-------------------SHARED VISUAL HELPERS---------------------------------
//------------------------------------------------------------------------

// Touch damage helper shared by all Siren hazards. Returns true if a hit
// was rolled (respects the per-touch cooldown).
let _egSireHitCd = 0;
function _egSireTouch(pct, level, label) {
    const now = performance.now();
    if (now < _egSireHitCd) return false;
    const pr = _egNkPlayerRect();
    if (!pr) return false;
    _egSireHitCd = now + EG_SIRE_HIT_CD_MS;
    const dealt = _egNkHit(pct, 'cold', level);
    _egNkAbilityHitToast(dealt, 'The Siren', label);
    return true;
}

// Flat heal + HUD refresh (mirrors the Dancer/Jester — no shared helper).
function _egSireHeal(amount) {
    try {
        if (typeof playerCurrentHP === 'undefined' || typeof playerMaxHP === 'undefined') return;
        if (playerCurrentHP <= 0) return;
        const before = playerCurrentHP;
        playerCurrentHP = Math.min(playerMaxHP, playerCurrentHP + amount);
        if (playerCurrentHP !== before && typeof _renderPlayerHealth === 'function') _renderPlayerHealth();
    } catch (e) {}
}

// Water-sparkle burst where a pop/eruption lands (visual only, body-level
// so it survives the run ending in the same frame).
function _egSireSplash(x, y, big) {
    const layer = document.createElement('div');
    layer.className = 'eg-sire-splash' + (big ? ' eg-sire-splash-big' : '');
    layer.style.left = Math.round(x) + 'px';
    layer.style.top = Math.round(y) + 'px';
    document.body.appendChild(layer);
    for (let i = 0; i < (big ? 12 : 7); i++) {
        const s = document.createElement('div');
        s.className = 'eg-sire-droplet';
        const ang = Math.random() * Math.PI * 2;
        const dist = 18 + Math.random() * (big ? 86 : 46);
        s.style.setProperty('--dx', Math.round(Math.cos(ang) * dist) + 'px');
        s.style.setProperty('--dy', Math.round(Math.sin(ang) * dist - 24) + 'px');
        s.style.animationDelay = (Math.random() * 100) + 'ms';
        layer.appendChild(s);
    }
    setTimeout(() => { try { layer.remove(); } catch (e) {} }, _EG_SIRE_DEBUG_SLOW ? 1900 : 950);
}

// The shared anchor: the Siren sings from the right side of the stage.
function _egSireAnchor() {
    return { x: window.innerWidth * 0.84, y: window.innerHeight * 0.45 };
}

// Point-in-rotated-beam hit (kept local; mirrors the old _egNkBeamHit).
function _egSireBeamHit(ax, ay, ang, len, halfW, pr, pad) {
    const pts = [
        [pr.left + pr.width / 2, pr.top + pr.height / 2],
        [pr.left, pr.top], [pr.right, pr.top],
        [pr.left, pr.bottom], [pr.right, pr.bottom],
    ];
    const c = Math.cos(ang), s = Math.sin(ang);
    for (const pt of pts) {
        const dx = pt[0] - ax, dy = pt[1] - ay;
        const al = dx * c + dy * s;
        const pe = -dx * s + dy * c;
        if (al > -20 && al < len && Math.abs(pe) < halfW + (pad || 0)) return true;
    }
    return false;
}


//------------------------------------------------------------------------
//-------------------MECHANIC: WAIL BEAM (signature, upgraded)--------------
//------------------------------------------------------------------------
// The sweeping beam returns with SONG PATTERNS: each cast picks wide
// swing / narrow flick / stutter reversals (phase 3 may reverse mid-song).
// Glowing ECHO ZONES bloom along the swept arc — standing in one while the
// beam passes heals you a little. The bait that teaches the sweep.
const EG_SIRE_BEAM_PATTERNS = ['wide', 'flick', 'stutter'];

function _egMechSireWail(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const run = _egNkNewRun(monster && monster.id, true);
    const W = window.innerWidth, H = window.innerHeight;
    const a = _egSireAnchor();
    const len = Math.hypot(W, H);
    const halfW = 20;
    const warnMs = 1200 * _EG_SIRE_DEBUG_MULT;
    const dmgPct = EG_SIRE_BEAM_DMG[p];
    const pattern = EG_SIRE_BEAM_PATTERNS[Math.floor(Math.random() * (p >= 3 ? 3 : 2))];
    const sweepMs = [0, 3400, 3000, 2600][p] * _EG_SIRE_DEBUG_MULT;
    const a0 = -0.65, a1 = 0.65;

    const beam = _egNkEl(run, 'div', 'eg-nk-beam');
    beam.style.width = Math.round(len) + 'px';
    beam.style.height = halfW * 2 + 'px';
    beam.style.left = Math.round(a.x) + 'px';
    beam.style.top = Math.round(a.y - halfW) + 'px';

    // Echo zones: 3 soft rings seeded along the swept arc at mid radius.
    const echoes = [];
    for (let i = 0; i < 3; i++) {
        const rr = 180 + i * 190;
        const ea = a0 + (a1 - a0) * (0.25 + 0.25 * i);
        const ex = a.x + Math.cos(ea) * rr;
        const ey = a.y + Math.sin(ea) * rr;
        const el = _egNkEl(run, 'div', 'eg-sire-echo', '🎵');
        el.style.width = '120px';
        el.style.height = '120px';
        el.style.transform = 'translate(' + Math.round(ex - 60) + 'px,' + Math.round(ey - 60) + 'px)';
        echoes.push({ x: ex, y: ey, r: 60, used: false, el });
    }

    _egNkToast('eg_mech_sire_wail', '🌀 The Siren: WAIL BEAM — track the song!', '#7dd3fc');

    let e = 0, cdUntil = 0;
    const angleAt = (t) => {
        // Stutter: piecewise back-and-forth; others are eased sweeps.
        if (pattern === 'stutter') {
            const seg = Math.floor(t / (sweepMs / 4)) % 2;
            const local = (t % (sweepMs / 4)) / (sweepMs / 4);
            const k = seg === 0 ? local : 1 - local;
            return a0 + (a1 - a0) * k;
        }
        const k = Math.min(1, t / sweepMs);
        const eased = pattern === 'flick' ? (k < 0.5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k)) : k;
        return a0 + (a1 - a0) * eased;
    };
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        const ang = e < warnMs ? a0 : angleAt(e - warnMs);
        beam.style.transform = 'rotate(' + ang + 'rad)';
        beam.classList.toggle('eg-nk-beam-warn', e < warnMs);
        const pr = _egNkPlayerRect();
        if (e >= warnMs) {
            if (pr && now >= cdUntil && _egSireBeamHit(a.x, a.y, ang, len, halfW, pr, 6)) {
                cdUntil = now + 1000;
                const dealt = _egNkHit(dmgPct, 'cold', level);
                _egNkAbilityHitToast(dealt, 'The Siren', 'Wail Beam');
            }
            // Echo zones: singing along heals (once each, while the beam lives).
            if (pr) {
                const pc = { x: pr.left + pr.width / 2, y: pr.top + pr.height / 2 };
                echoes.forEach(ez => {
                    if (ez.used) return;
                    if (Math.hypot(pc.x - ez.x, pc.y - ez.y) < ez.r) {
                        ez.used = true;
                        const maxHP = ((typeof _egNkMaxHP === 'function') ? _egNkMaxHP() : 0) || 100;
                        const heal = Math.max(1, Math.round(maxHP * EG_SIRE_ECHO_HEAL));
                        _egSireHeal(heal);
                        showToast('🎵 +' + heal);
                        _egSireSplash(ez.x, ez.y, false);
                        try { ez.el.remove(); } catch (e2) {}
                    }
                });
            }
        }
        return e < warnMs + sweepMs + 400;
    });
}


//------------------------------------------------------------------------
//-------------------MECHANIC: UNDERTOW (phase 2+)--------------------------
//------------------------------------------------------------------------
// A whirlpool spins up at the anchor and DRAGS the whole arena toward it
// in slow pulls you must fight; flotsam chunks spiral inward and bite.
// Then the whirlpool NOVAS — be out of the ring before the pull becomes
// the blast.
const EG_SIRE_PULL_CYCLE = 700;
const EG_SIRE_PULL_STEP = 26;      // px per pull
const EG_SIRE_UNDERTOW_LIFE = 6000;

function _egMechSireUndertow(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(2, Math.min(3, Number(phase) || 2));
    const level = monster ? monster.level : 1;
    const run = _egNkNewRun(monster && monster.id, true);
    const W = window.innerWidth, H = window.innerHeight;
    const a = _egSireAnchor();
    const lifeMs = EG_SIRE_UNDERTOW_LIFE * _EG_SIRE_DEBUG_MULT;
    const cycleMs = EG_SIRE_PULL_CYCLE * _EG_SIRE_DEBUG_MULT;
    const stepPx = EG_SIRE_PULL_STEP * (p >= 3 ? 1.3 : 1);
    const novaDmg = EG_SIRE_NOVA_DMG[p];

    const pool = _egNkEl(run, 'div', 'eg-sire-pool');
    pool.style.width = '340px';
    pool.style.height = '340px';
    pool.style.transform = 'translate(' + Math.round(a.x - 170) + 'px,' + Math.round(a.y - 170) + 'px)';

    // Flotsam: chunks that spiral in toward the whirlpool.
    const flotsam = [];
    for (let i = 0; i < 4; i++) {
        const aa = Math.random() * Math.PI * 2;
        const rr = 320 + Math.random() * 160;
        const el = _egNkEl(run, 'div', 'eg-sire-flotsam', '🪵');
        el.style.left = Math.round(a.x + Math.cos(aa) * rr - 14) + 'px';
        el.style.top = Math.round(a.y + Math.sin(aa) * rr - 14) + 'px';
        flotsam.push({ ang: aa, r: rr, el });
    }

    _egNkToast('eg_mech_sire_undertow', '🌀 The Siren: UNDERTOW — fight the pull!', '#7dd3fc');

    let t = 0, nextPull = 0, novaDone = false, touchCd = 0, novaCd = 0;
    _egNkLoop(run, (dtS, now) => {
        t += dtS * 1000;
        // The pull: every cycle, drag the avatar a step toward the anchor —
        // unless the player is moving (input overrides the sea).
        if (t >= nextPull && t < lifeMs * 0.75) {
            nextPull = t + cycleMs;
            const moving = (typeof _avatarMoveState !== 'undefined' && _avatarMoveState
                && _avatarMoveState.held && _avatarMoveState.held.size > 0);
            if (!moving) {
                const el = document.getElementById('player-avatar-wrapper')
                    || document.getElementById('player-avatar-simple');
                if (el && !el.dataset.egFlingActive) {
                    let x = parseFloat(el.style.left);
                    let y = parseFloat(el.style.top);
                    if (isFinite(x) && isFinite(y)) {
                        const dx = a.x - x, dy = a.y - y;
                        const d = Math.hypot(dx, dy) || 1;
                        const pull = Math.min(stepPx, Math.max(0, d - 190));
                        if (pull > 0) {
                            x += dx / d * pull;
                            y += dy / d * pull;
                            el.dataset.avatarFx = String(x);
                            el.dataset.avatarFy = String(y);
                            el.style.left = Math.round(x) + 'px';
                            el.style.top = Math.round(y) + 'px';
                        }
                    }
                }
            }
        }
        // Flotsam spirals in and bites.
        const pr = _egNkPlayerRect();
        flotsam.forEach(f => {
            if (f.done) return;
            f.r -= 60 * dtS;
            f.ang += 1.1 * dtS;
            const fx = a.x + Math.cos(f.ang) * f.r;
            const fy = a.y + Math.sin(f.ang) * f.r;
            f.el.style.left = Math.round(fx - 14) + 'px';
            f.el.style.top = Math.round(fy - 14) + 'px';
            if (pr && now >= touchCd && _egNkCircleHit(fx, fy, 15, pr, 0)) {
                touchCd = now + EG_SIRE_HIT_CD_MS;
                _egSireTouch(EG_SIRE_PULL_DMG, level, 'Undertow');
            }
            if (f.r < 30) { f.done = true; try { f.el.remove(); } catch (e) {} }
        });
        // THE NOVA: the whirlpool detonates near the end of the song.
        if (!novaDone && t >= lifeMs * 0.75) {
            novaDone = true;
            pool.classList.add('eg-sire-pool-nova');
            _egSireSplash(a.x, a.y, true);
            const c = _egNkPlayerCenter();
            if (c && Math.hypot(c.x - a.x, c.y - a.y) < 200) {
                if (now >= novaCd) {
                    novaCd = now + EG_SIRE_HIT_CD_MS;
                    _egSireTouch(novaDmg, level, 'Whirlpool Nova');
                }
            }
            flotsam.forEach(f => { if (!f.done) { f.done = true; try { f.el.remove(); } catch (e) {} } });
        }
        return t < lifeMs + 600;
    });
}


//------------------------------------------------------------------------
//-------------------MECHANIC: SIREN'S REPLY (phase 2+)---------------------
//------------------------------------------------------------------------
// The beam splits: a second, thinner beam mirrors the first from the same
// anchor — one sweeps with the song, one against it. Phase 3 adds a third
// slow arc. Read both (all three) before crossing.
const EG_SIRE_REPLY_LIFE = 5200;

function _egMechSireReply(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(2, Math.min(3, Number(phase) || 2));
    const level = monster ? monster.level : 1;
    const run = _egNkNewRun(monster && monster.id, true);
    const W = window.innerWidth, H = window.innerHeight;
    const a = _egSireAnchor();
    const len = Math.hypot(W, H);
    const lifeMs = EG_SIRE_REPLY_LIFE * _EG_SIRE_DEBUG_MULT;
    const warnMs = 1100 * _EG_SIRE_DEBUG_MULT;
    const sweepMs = 3000 * _EG_SIRE_DEBUG_MULT;
    const dmgPct = EG_SIRE_BEAM_DMG[p] * 0.75;

    // Primary: thin, sweeps down. Mirror: thin, sweeps up. Third (p3): slow.
    const mk = (halfW, cls) => {
        const el = _egNkEl(run, 'div', 'eg-nk-beam ' + cls);
        el.style.width = Math.round(len) + 'px';
        el.style.height = halfW * 2 + 'px';
        el.style.left = Math.round(a.x) + 'px';
        el.style.top = Math.round(a.y - halfW) + 'px';
        return el;
    };
    const b1 = mk(10, 'eg-sire-beam-thin');
    const b2 = mk(10, 'eg-sire-beam-thin');
    const b3 = p >= 3 ? mk(13, 'eg-sire-beam-fat') : null;

    _egNkToast('eg_mech_sire_reply', '🌀 The Siren: SIREN\u2019S REPLY — two songs at once!', '#7dd3fc');

    let e = 0, cdUntil = 0;
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        const live = e >= warnMs;
        const k = live ? Math.min(1, (e - warnMs) / sweepMs) : 0;
        // b1 sweeps down (a0→a1), b2 mirrors up (a1→a0), b3 drifts slowly.
        const ang1 = -0.65 + 1.3 * k;
        const ang2 = 0.65 - 1.3 * k;
        b1.style.transform = 'rotate(' + ang1 + 'rad)';
        b2.style.transform = 'rotate(' + ang2 + 'rad)';
        if (b3) {
            const ang3 = -0.2 + 0.5 * k;
            b3.style.transform = 'rotate(' + ang3 + 'rad)';
        }
        b1.classList.toggle('eg-nk-beam-warn', !live);
        b2.classList.toggle('eg-nk-beam-warn', !live);
        if (b3) b3.classList.toggle('eg-nk-beam-warn', !live);
        if (live) {
            const pr = _egNkPlayerRect();
            if (pr && now >= cdUntil) {
                const hit = _egSireBeamHit(a.x, a.y, ang1, len, 10, pr, 6)
                    || _egSireBeamHit(a.x, a.y, ang2, len, 10, pr, 6)
                    || (b3 && _egSireBeamHit(a.x, a.y, ang3, len, 13, pr, 6));
                if (hit) {
                    cdUntil = now + 1000;
                    const dealt = _egNkHit(dmgPct, 'cold', level);
                    _egNkAbilityHitToast(dealt, 'The Siren', 'Siren\u2019s Reply');
                }
            }
        }
        return e < warnMs + sweepMs + 400;
    });
}


//------------------------------------------------------------------------
//-------------------🌀… THE DEADLY ARIA (≤10% HP one-shot finale)----------
//------------------------------------------------------------------------
// The arena floods with her audience of bubbles, three rings deep. The
// Siren sings SONG LINES — each line lights a chain of bubbles through
// the rings; reach the FAR end of the line before the note lands (the
// rest of the song pops around you). Lines lengthen and quicken. The
// final note is the KILLER CRESSEND0: every bubble detonates EXCEPT the
// far one — stand on it. Charge bar frozen for the whole set-piece (gate
// in _egTickPlayer via _egSireFinalActive).
const EG_SIRE_FINALE_LINES = 3;
const EG_SIRE_LINE_CHARGE = 3600;   // ms to reach the far bubble (per line, shrinks)
const EG_SIRE_LINE_CHARGE_MIN = 2400;

// Set while the finale runs (read by _egTickPlayer's charge-freeze gate).
let _egSireFinal = null;

function _egSireFinalActive() {
    return !!_egSireFinal && !_egSireFinal.finished;
}

// Phase-enter hook: starts the ≤10% HP watcher (the framework only calls
// onPhaseEnter on transitions, so a dive from 30% → 10% needs its own gate).
function _egSireOnPhaseEnter(monster, newPhase) {
    if (newPhase !== 3) return false;
    try { _egSireStartFinalWatcher(monster); } catch (e) {}
    return false;
}

function _egSireStartFinalWatcher(monster) {
    if (!monster || _egSireFinal) return;
    const run = _egNkNewRun(monster.id, true);
    run.passive = true;
    _egNkLoop(run, () => {
        if (_egSireFinal) return false;
        try {
            if (monster.currentHP <= monster.maxHP * 0.10) {
                _egSireFinalStart(monster);
                return false;
            }
        } catch (e) { return false; }
        return true;
    });
}

function _egSireFinalStart(monster) {
    if (_egSireFinal || !monster) return;

    // The hall goes quiet: kill every other run of this boss (the finale
    // owns the concert hall).
    Array.from(_egNkRuns.values()).forEach(r => {
        if (r.bossId === monster.id) { try { _egNkKillRun(r); } catch (e) {} }
    });

    const W = window.innerWidth, H = window.innerHeight;
    const cx = W / 2, cy = H / 2;
    const g = {
        monsterId: monster.id,
        finished: false,
        line: 0,
        bubbles: [],        // { ring, idx, x, y, el, popped }
        fxRun: null, stage: null, overlay: null, lineTimer: null,
    };
    _egSireFinal = g;

    // Freeze the auto-attack charge bar for the whole set-piece (the gate
    // lives in _egTickPlayer; this class is the visual twin).
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('eg-charge-paused');
    });

    // FX run (passive): holds the stage and the song timeline.
    g.fxRun = _egNkNewRun(monster.id, true);
    g.fxRun.passive = true;

    // The concert-hall water.
    const stage = document.createElement('div');
    stage.className = 'eg-sire-stage';
    document.body.appendChild(stage);
    g.stage = stage;
    requestAnimationFrame(() => stage.classList.add('eg-sire-stage-on'));

    // The audience: bubbles in three rings around the centre (8/10/12).
    const ringCounts = [8, 10, 12];
    const ringRadii = [170, 300, 430];
    ringCounts.forEach((n, ring) => {
        for (let i = 0; i < n; i++) {
            const ang = (i / n) * Math.PI * 2 + ring * 0.31;
            const x = cx + Math.cos(ang) * ringRadii[ring];
            const y = cy + Math.sin(ang) * ringRadii[ring];
            if (y < 70 || y > H - 70 || x < 70 || x > W - 70) continue;
            const el = document.createElement('div');
            el.className = 'eg-sire-bubble';
            el.style.left = Math.round(x - 26) + 'px';
            el.style.top = Math.round(y - 26) + 'px';
            document.body.appendChild(el);
            g.fxRun.els.push(el);
            g.bubbles.push({ ring, idx: i, x, y, el, popped: false });
        }
    });

    // Countdown overlay.
    const ov = document.createElement('div');
    ov.className = 'eg-sire-cd';
    ov.innerHTML =
        '<div class="eg-sire-cd-label">🌀 THE DEADLY ARIA</div>' +
        '<div class="eg-sire-cd-hint">Follow the song line — reach the far bubble!</div>';
    document.body.appendChild(ov);
    g.overlay = ov;

    _egNkToast('eg_mech_sire_final_cd', '🌀💀 THE DEADLY ARIA — follow the song line!', '#7dd3fc');

    // Boss immunity for the whole set-piece (released at the end).
    monster.bossImmune = true;

    // The boss sings.
    const card = document.getElementById('eg-card-' + monster.id);
    const wrap = card ? (card.querySelector('.eg-emoji-wrapper') || card) : null;
    if (wrap) {
        wrap.classList.add('eg-sire-singing');
        wrap.classList.add('eg-nk-shielded');
    }

    const level = monster.level || 1;

    // Pick a song line: a chain of 4→6 bubbles from an inner ring to the
    // outer ring (nearest-neighbour hops outward).
    const singLine = (len) => {
        const inner = g.bubbles.filter(b => b.ring === 0 && !b.popped);
        if (!inner.length) return null;
        const chain = [inner[Math.floor(Math.random() * inner.length)]];
        let cur = chain[0];
        for (let r = 1; r <= 2; r++) {
            const cands = g.bubbles.filter(b => b.ring === r && !b.popped);
            if (!cands.length) break;
            cands.sort((a, b) => Math.hypot(a.x - cur.x, a.y - cur.y) - Math.hypot(b.x - cur.x, b.y - cur.y));
            const step = Math.min(len - chain.length, 2);
            const take = cands.slice(0, Math.max(1, step));
            take.forEach(nb => chain.push(nb));
            cur = chain[chain.length - 1];
        }
        return chain;
    };

    // One song line per beat: light the chain, then judge.
    const sing = () => {
        if (!_egSireFinal || _egSireFinal !== g || g.finished) return;
        if (_egNkFrozen()) { g.lineTimer = setTimeout(sing, 200); return; }
        if (g.line >= EG_SIRE_FINALE_LINES) {
            _egSireCrescendo(g, monster, level);
            return;
        }
        const charge = Math.max(EG_SIRE_LINE_CHARGE_MIN,
            EG_SIRE_LINE_CHARGE - g.line * 600) * (_EG_SIRE_DEBUG_SLOW ? 8 : 1);
        const chain = singLine(4 + g.line);
        if (!chain || chain.length < 2) {
            _egSireCrescendo(g, monster, level);
            return;
        }
        chain.forEach((b, i) => {
            b.el.classList.add('eg-sire-bubble-lit');
            b.el.style.setProperty('--lit-delay', (i * 90) + 'ms');
        });
        const far = chain[chain.length - 1];
        _egNkToast('eg_mech_sire_line', '🌀 The line is sung — reach the far bubble!', '#7dd3fc');
        // The judge: the note lands — every bubble pops EXCEPT the far one;
        // standing on the far bubble is safe, otherwise the pop-storm bites.
        const judge = () => {
            if (!_egSireFinal || _egSireFinal !== g || g.finished) return;
            const c = _egNkPlayerCenter();
            const onFar = c && Math.hypot(c.x - far.x, c.y - far.y) < 66;
            g.bubbles.forEach(b => {
                if (b === far || b.popped) return;
                if (b.el.classList.contains('eg-sire-bubble-lit') || Math.random() < 0.25) {
                    b.popped = true;
                    try { b.el.remove(); } catch (e) {}
                    _egSireSplash(b.x, b.y, false);
                }
                b.el.classList.remove('eg-sire-bubble-lit');
            });
            if (!onFar) _egSireTouch(EG_SIRE_BUBBLE_DMG, level, 'Deadly Aria');
            g.line++;
            g.lineTimer = setTimeout(sing, EG_SIRE_DEBUG_SLOW ? 1800 : 900);
        };
        g.lineTimer = setTimeout(() => {
            if (!_egSireFinal || _egSireFinal !== g || g.finished) return;
            if (_egNkFrozen()) { g.lineTimer = setTimeout(() => { if (_egSireFinal === g && !g.finished) judge(); }, 200); return; }
            judge();
        }, charge);
    };
    g.lineTimer = setTimeout(sing, EG_SIRE_DEBUG_SLOW ? 4000 : 1800);
}

// THE KILLER CRESCENDO: every remaining bubble detonates EXCEPT one far
// bubble — the last note of the aria.
function _egSireCrescendo(g, monster, level) {
    if (!g || g.finished) return;
    const alive = g.bubbles.filter(b => !b.popped);
    if (!alive.length) { _egSireFinalEnd(g); return; }
    const c0 = _egNkPlayerCenter() || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    // The safe bubble: the farthest ALIVE bubble from the player (the "far"
    // note — the aria always gives you a place to run to).
    const far = alive.reduce((best, b) =>
        Math.hypot(b.x - c0.x, b.y - c0.y) > Math.hypot(best.x - c0.x, best.y - c0.y) ? b : best, alive[0]);
    far.el.classList.add('eg-sire-bubble-safe');
    alive.forEach(b => { if (b !== far) b.el.classList.add('eg-sire-bubble-doom'); });
    _egNkToast('eg_mech_sire_crescendo', '🌀💀 THE KILLER CRESCENDO — stand on the last bubble!', '#7dd3fc');
    const warnMs = 2600 * (_EG_SIRE_DEBUG_SLOW ? 8 : 1);
    g.lineTimer = setTimeout(() => {
        if (!_egSireFinal || _egSireFinal !== g || g.finished) return;
        // Everything but the safe bubble detonates.
        g.bubbles.forEach(b => {
            if (b.popped || b === far) return;
            b.popped = true;
            try { b.el.remove(); } catch (e) {}
            _egSireSplash(b.x, b.y, b !== far);
        });
        _egSireSplash(far.x, far.y, true);
        const c = _egNkPlayerCenter();
        if (c && Math.hypot(c.x - far.x, c.y - far.y) >= 66) {
            _egSireTouch(EG_SIRE_CRESC_DMG, level, 'Killer Crescendo');
        }
        setTimeout(() => _egSireFinalEnd(g), _EG_SIRE_DEBUG_SLOW ? 5500 : 1200);
    }, warnMs);
}

function _egSireFinalEnd(g) {
    if (!g || g.finished) return;
    g.finished = true;
    if (g.lineTimer) { clearTimeout(g.lineTimer); g.lineTimer = null; }
    if (g.overlay) { try { g.overlay.remove(); } catch (e) {} g.overlay = null; }
    if (g.stage) { try { g.stage.remove(); } catch (e) {} g.stage = null; }
    if (g.fxRun) { try { _egNkKillRun(g.fxRun); } catch (e) {} g.fxRun = null; }
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('eg-charge-paused');
    });
    document.querySelectorAll('.eg-sire-singing').forEach(el => el.classList.remove('eg-sire-singing'));

    const m = (g.monsterId && typeof _egMonsters !== 'undefined')
        ? _egMonsters.find(x => x && x.id === g.monsterId) : null;
    if (m && m.bossImmune) {
        m.bossImmune = false;
        if (typeof _egBossScheduleMechanics === 'function') {
            try { _egBossScheduleMechanics(m, 3); } catch (e) {}
        }
        if (typeof _egRenderPanel === 'function') { try { _egRenderPanel(); } catch (e2) {} }
    }
    if (_egSireFinal === g) _egSireFinal = null;
}


//------------------------------------------------------------------------
//-------------------TEARDOWN-----------------------------------------------
//------------------------------------------------------------------------
// Called from _egBossCleanup on boss death AND from the encounter stop —
// removes every run element, overlay and body class this boss ever created.
function _egSireTeardown() {
    if (_egSireFinal) { try { _egSireFinalEnd(_egSireFinal); } catch (e) {} _egSireFinal = null; }
    document.querySelectorAll('.eg-sire-echo, .eg-sire-pool, .eg-sire-flotsam, ' +
        '.eg-sire-beam-thin, .eg-sire-beam-fat, .eg-sire-stage, .eg-sire-bubble, ' +
        '.eg-sire-cd, .eg-sire-splash').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    document.querySelectorAll('.eg-sire-singing').forEach(el => el.classList.remove('eg-sire-singing'));
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('eg-charge-paused');
    });
}


//------------------------------------------------------------------------
//-------------------PLAYTEST CONSOLE HOOK (dev only)----------------------
//------------------------------------------------------------------------
// Tiny console API for playtesting with stretched debug timings:
//   _EG_SIRE_DEBUG.fire('wail'|'undertow'|'reply', phase) — runs one now
//   _EG_SIRE_DEBUG.final()                                — DEADLY ARIA now
if (typeof window !== 'undefined') {
    window._EG_SIRE_DEBUG = {
        fire: (name, phase) => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? _egMonsters.find(m => m && m.baseId === 'boss_siren') : null;
            if (!monster) return 'no siren alive';
            const fn = name === 'wail' ? _egMechSireWail
                : name === 'undertow' ? _egMechSireUndertow
                : name === 'reply' ? _egMechSireReply : null;
            if (!fn) return 'unknown: ' + name;
            if (name !== 'wail' && _egNkDodgeBusy()) return 'BLOCKED: dodge-busy (wait for the field to clear)';
            fn(monster, phase || monster.bossPhase || 1);
            return 'fired ' + name;
        },
        final: () => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? _egMonsters.find(m => m && m.baseId === 'boss_siren') : null;
            if (!monster) return 'no siren alive';
            _egSireFinalStart(monster);
            return 'THE DEADLY ARIA started';
        },
    };
}
