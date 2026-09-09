//------------------------------------------------------------------------
//-------------------BOSS: THE JESTER (boss_jester)------------------------
//------------------------------------------------------------------------
// REWORK — Boshy homage, rebuilt as a three-act stage performance. The
// Jester never stops showboating: every mechanic is a NUMBERED ACT, and the
// fight literally plays on a stage — a spotlight follows the show, cards
// deal a hand you must survive, and the finale is the show of shows.
//
//   Phase 1 (100–60%) — BOUNCING MAYHEM (signature, upgraded). The juggling
//                       orbs now BOUNCE IN RHYTHM: they stay calm between
//                       beats, then all HOP on the beat, teleporting their
//                       velocity to a fresh random angle — the dodge rhythm
//                       is the skill. Dense but fair; every orb is slow
//                       enough to track.
//                       Plus CLUE SWAP (shared).
//   Phase 2 ( ≤60%)   — ACT II: CARD TOSS. A fan of oversized playing cards
//                       arcs across the stage and STICKS where they land,
//                       face-up, as hazards — the arena becomes the Jester's
//                       card table. Two volleys; the second aims at you.
//                       Plus JUGGLER'S Jinx. Three cursed balls (🟣 jinx,
//                       💛 luck) orbit the stage; touching the JINX ball
//                       costs a hit, touching the LUCK ball pops a small
//                       heal — greed bait in the middle of the chaos.
//   Phase 3 ( ≤30%)   — ACT III: THE ENCORE. Mayhem orbs multiply (8), the
//                       card volleys triple, and the jinx orbit tightens.
//                       The audience is on its feet.
//   Finale ( ≤10%)    — 🎪 THE GRAND FINALE (one-shot set-piece): the stage
//                       curtain drops, the boss bows (immune), and the
//                       FULL HOUSE builds: cards deal onto the grid in a
//                       closing spiral — every card face is a hazard, and
//                       the pattern spells one safe suit. STAND ON THE SAFE
//                       SUIT when the reveal lands — wrong suit = hit, and
//                       each reveal comes faster. The last reveal is the
//                       BLACKOUT: all cards flip down except the safe suit,
//                       then the CURTAIN CALL barrage sweeps the safe lanes.
//                       Charge bar frozen for the whole set-piece (gate in
//                       _egTickPlayer via _egJsFinalActive).
//
// Tier scaling: every dodge run uses the shared EG_NK_TIER_FACTOR clock,
// so gentle tiers get longer telegraphs and brutal tiers tighter ones.
//
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule + hooks)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics (clue_swap) live in shared-boss-abilities.js and are
// referenced by handler-name string.
//
// DEBUG_SLOW: while true, telegraphs/windups are stretched 2.5× so
// screenshots can catch mid-animation states. Flip to false for ship.
//------------------------------------------------------------------------

const _EG_JS_DEBUG_SLOW = true;
const _EG_JS_DEBUG_MULT = _EG_JS_DEBUG_SLOW ? 2.5 : 1;

Object.assign(EG_BOSS_DEFS, {
    boss_jester: {
        id: 'boss_jester', name: 'The Jester', emoji: '🤹',
        baseHP: 960, baseDamage: 22, chargeMax: 10,
        element: 'shadow', resistances: { fire: 15, cold: 15, lightning: 15, shadow: 30 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_jester: {
        phases: [
            { threshold: 1.00, chargeMax: 10, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 8, damageMultiplier: 1.55 },
            { threshold: 0.30, chargeMax: 5, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'bouncing_mayhem', intervalBase: 19000, intervalVariance: 4500, handler: '_egMechJsOrbs' },
            { name: 'clue_swap', intervalBase: 18000, intervalVariance: 4000, handler: '_egMechClueSwap' },
            { name: 'card_toss', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechJsCards', phase2Only: true },
            { name: 'jugglers_jinx', intervalBase: 23000, intervalVariance: 5000, handler: '_egMechJsJinx', phase2Only: true },
        ],
        onPhaseEnter: _egJsOnPhaseEnter,
    },
});


// ── Shared tuning (per-mechanic constants live with their mechanics) ────────
const EG_JS_ORB_COUNT   = [0, 5, 6, 8];       // mayhem orbs per cast
const EG_JS_ORB_SPEED   = [0, 200, 230, 260]; // px/s per phase
const EG_JS_ORB_DMG     = [0, 0.05, 0.06, 0.08]; // %maxHP per orb touch
const EG_JS_CARD_DMG    = [0, 0, 0.07, 0.09];    // %maxHP per card touch
const EG_JS_JINX_DMG    = [0, 0, 0.09, 0.11];    // %maxHP jinx-ball touch
const EG_JS_LUCK_HEAL   = 0.05;               // %maxHP per luck-ball touch
const EG_JS_REVEAL_DMG  = 0.10;               // %maxHP wrong suit at a reveal
const EG_JS_SWEEP_DMG   = 0.12;               // %maxHP curtain-call sweep
const EG_JS_HIT_CD_MS   = 600;                // shared touch cooldown


//------------------------------------------------------------------------
//-------------------SHARED VISUAL HELPERS---------------------------------
//------------------------------------------------------------------------

// Flat heal + HUD refresh (mirrors the Dancer — no shared helper exists).
function _egJsHeal(amount) {
    try {
        if (typeof playerCurrentHP === 'undefined' || typeof playerMaxHP === 'undefined') return;
        if (playerCurrentHP <= 0) return;
        const before = playerCurrentHP;
        playerCurrentHP = Math.min(playerMaxHP, playerCurrentHP + amount);
        if (playerCurrentHP !== before && typeof _renderPlayerHealth === 'function') _renderPlayerHealth();
    } catch (e) {}
}

// Touch damage helper shared by all Jester hazards. Returns true if a hit
// was rolled (respects the per-touch cooldown).
let _egJsHitCd = 0;
function _egJsTouch(pct, level, label) {
    const now = performance.now();
    if (now < _egJsHitCd) return false;
    const pr = _egNkPlayerRect();
    if (!pr) return false;
    _egJsHitCd = now + EG_JS_HIT_CD_MS;
    const dealt = _egNkHit(pct, 'shadow', level);
    _egNkAbilityHitToast(dealt, 'The Jester', label);
    return true;
}

// Confetti puff where a show event lands (visual only, body-level so it
// survives the run ending in the same frame).
function _egJsConfetti(x, y, big) {
    const layer = document.createElement('div');
    layer.className = 'eg-js-confetti' + (big ? ' eg-js-confetti-big' : '');
    layer.style.left = Math.round(x) + 'px';
    layer.style.top = Math.round(y) + 'px';
    document.body.appendChild(layer);
    const colors = ['#f472b6', '#facc15', '#4ade80', '#60a5fa', '#c084fc'];
    for (let i = 0; i < (big ? 14 : 8); i++) {
        const s = document.createElement('div');
        s.className = 'eg-js-bit';
        s.style.background = colors[Math.floor(Math.random() * colors.length)];
        const ang = Math.random() * Math.PI * 2;
        const dist = 18 + Math.random() * (big ? 84 : 46);
        s.style.setProperty('--dx', Math.round(Math.cos(ang) * dist) + 'px');
        s.style.setProperty('--dy', Math.round(Math.sin(ang) * dist - 24) + 'px');
        s.style.setProperty('--rot', Math.round((Math.random() * 2 - 1) * 520) + 'deg');
        s.style.animationDelay = (Math.random() * 110) + 'ms';
        layer.appendChild(s);
    }
    setTimeout(() => { try { layer.remove(); } catch (e) {} }, _EG_JS_DEBUG_SLOW ? 1900 : 950);
}


//------------------------------------------------------------------------
//-------------------MECHANIC: BOUNCING MAYHEM (signature, upgraded)--------
//------------------------------------------------------------------------
// The juggling orbs now bounce IN RHYTHM: between beats they glide calmly
// (easy to track); on each beat (every ~1.1s) they all HOP at once and
// re-randomize their velocity — the swarm reshuffles its pattern on the
// beat, so dodging is about reading the rhythm, not just the vectors.
const EG_JS_MAYHEM_BEAT = 1100;

function _egMechJsOrbs(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const count = EG_JS_ORB_COUNT[p];
    const speed = EG_JS_ORB_SPEED[p] / _EG_JS_DEBUG_MULT;
    const radius = 12;
    const dmgPct = EG_JS_ORB_DMG[p];
    const durMs = 9500 * _EG_JS_DEBUG_MULT;
    const beatMs = EG_JS_MAYHEM_BEAT * _EG_JS_DEBUG_MULT;
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const orbs = [];
    for (let i = 0; i < count; i++) {
        const el = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-orb-jester');
        const a = Math.random() * Math.PI * 2;
        orbs.push({
            x: 60 + Math.random() * Math.max(60, W - 120),
            y: 60 + Math.random() * Math.max(60, H - 120),
            vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
            hop: 0, cdUntil: 0, el,
        });
    }
    _egNkToast('eg_mech_juggle', '🤹 The Jester: Bouncing Mayhem! Watch every angle!');
    let e = 0, nextBeat = beatMs, touchCd = 0;
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        const pr = _egNkPlayerRect();
        // The BEAT: every orb hops at once — a little squash-and-hop pulse
        // plus a fresh random velocity. Reading the rhythm IS the dodge.
        if (e >= nextBeat) {
            nextBeat = e + beatMs;
            orbs.forEach(o => {
                const a = Math.random() * Math.PI * 2;
                o.vx = Math.cos(a) * speed;
                o.vy = Math.sin(a) * speed;
                o.hop = 320;
                o.el.classList.remove('eg-js-orb-hop');
                void o.el.offsetWidth;
                o.el.classList.add('eg-js-orb-hop');
            });
        }
        orbs.forEach(o => {
            if (o.hop > 0) o.hop -= dtS * 1000;
            o.x += o.vx * dtS;
            o.y += o.vy * dtS;
            if (o.x < radius || o.x > W - radius) o.vx *= -1;
            if (o.y < radius || o.y > H - radius) o.vy *= -1;
            o.x = Math.max(radius, Math.min(W - radius, o.x));
            o.y = Math.max(radius, Math.min(H - radius, o.y));
            o.el.style.transform = 'translate(' + Math.round(o.x - 9) + 'px,' + Math.round(o.y - 9) + 'px)';
            if (pr && now >= touchCd && _egNkDotHit(o.el, pr, 2)) {
                touchCd = now + EG_JS_HIT_CD_MS;
                _egJsTouch(dmgPct, level, 'Bouncing Mayhem');
            }
        });
        return e < durMs;
    });
}


//------------------------------------------------------------------------
//-------------------MECHANIC: ACT II — CARD TOSS (phase 2+)----------------
//------------------------------------------------------------------------
// A fan of oversized playing cards arcs across the stage and STICKS where
// they land, face-up, as hazards for a while — the arena becomes the
// Jester's card table. Volley 1 litters the middle; volley 2 aims at your
// position. Phase 3 throws a third volley.
const EG_JS_CARD_LIFE = 6500;
const EG_JS_CARD_W = 46;
const EG_JS_CARD_H = 64;

function _egMechJsCards(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(2, Math.min(3, Number(phase) || 2));
    const level = monster ? monster.level : 1;
    const run = _egNkNewRun(monster && monster.id, true);
    const W = window.innerWidth, H = window.innerHeight;
    const volleys = p >= 3 ? 3 : 2;
    const volleyGap = 2400 * _EG_JS_DEBUG_MULT;
    const warnMs = 1000 * _EG_JS_DEBUG_MULT;
    const lifeMs = EG_JS_CARD_LIFE * _EG_JS_DEBUG_MULT;
    const dmgPct = EG_JS_CARD_DMG[p];

    const suits = ['♠', '♥', '♦', '♣'];
    const cards = [];   // { el, x0, y0, tx, ty, born, stuck, until }
    let volley = 0, vt = 0, nextVolleyAt = 600 * _EG_JS_DEBUG_MULT;

    const throwVolley = (aimX, aimY) => {
        const n = 5;
        for (let i = 0; i < n; i++) {
            // A fan: spread around the aim with growing offset.
            const spread = (i - (n - 1) / 2) * 130;
            const tx = Math.max(60, Math.min(W - 60, aimX + spread + (Math.random() * 40 - 20)));
            const ty = Math.max(90, Math.min(H - 90, aimY + (Math.random() * 200 - 100)));
            const el = _egNkEl(run, 'div', 'eg-js-card', suits[Math.floor(Math.random() * 4)]);
            const startX = i % 2 === 0 ? -70 : W + 70;
            const startY = 90 + Math.random() * 120;
            el.style.left = Math.round(startX) + 'px';
            el.style.top = Math.round(startY) + 'px';
            cards.push({ el, x0: startX, y0: startY, tx, ty, born: 0, stuck: false, until: 0 });
        }
    };

    _egNkToast('eg_mech_js_cards', '🤹 The Jester: CARD TOSS — the table is set!', '#e9d5ff');

    let touchCd = 0;
    _egNkLoop(run, (dtS, now) => {
        vt += dtS * 1000;
        let active = false;
        if (volley < volleys && vt >= nextVolleyAt) {
            volley++;
            nextVolleyAt = vt + volleyGap;
            const aim = (volley === 1)
                ? { x: W * (0.3 + Math.random() * 0.4), y: H * (0.35 + Math.random() * 0.3) }
                : (_egNkPlayerCenter() || { x: W / 2, y: H / 2 });
            throwVolley(aim.x, aim.y);
        }
        const pr = _egNkPlayerRect();
        const flightMs = 900 * _EG_JS_DEBUG_MULT;
        for (let i = cards.length - 1; i >= 0; i--) {
            const c = cards[i];
            if (!c.born) c.born = vt;
            const age = vt - c.born;
            if (!c.stuck) {
                active = true;
                const k = Math.min(1, age / flightMs);
                const ex = k * k; // ease-in (a tossed card accelerates)
                c.el.style.left = Math.round(c.x0 + (c.tx - c.x0) * ex) + 'px';
                c.el.style.top = Math.round(c.y0 + (c.ty - c.y0) * ex - Math.sin(k * Math.PI) * 120) + 'px';
                c.el.style.rotate = (k * 540) + 'deg';
                if (k >= 1) {
                    c.stuck = true;
                    // Expiry is stored RELATIVE to the card's age (age runs
                    // from the card's own birth), so volley timing never
                    // drifts with when the volley was thrown.
                    c.until = age + lifeMs;
                    c.el.classList.add('eg-js-card-stuck');
                    c.el.style.left = Math.round(c.tx) + 'px';
                    c.el.style.top = Math.round(c.ty) + 'px';
                    c.el.style.rotate = ((Math.random() * 2 - 1) * 26) + 'deg';
                    _egJsConfetti(c.tx, c.ty, false);
                }
            } else {
                active = true;
                if (pr && now >= touchCd) {
                    const pc = { x: pr.left + pr.width / 2, y: pr.top + pr.height / 2 };
                    if (Math.abs(pc.x - c.tx) < EG_JS_CARD_W / 2 + 10 && Math.abs(pc.y - c.ty) < EG_JS_CARD_H / 2 + 10) {
                        touchCd = now + EG_JS_HIT_CD_MS;
                        _egJsTouch(dmgPct, level, 'Card Toss');
                    }
                }
                if (age >= c.until) {
                    c.el.classList.add('eg-js-card-out');
                    cards.splice(i, 1);
                    const rm = setTimeout(() => { try { c.el.remove(); } catch (e2) {} }, 320);
                    run.timers.push(rm);
                    continue;
                }
            }
        }
        if (volley >= volleys && cards.length === 0) return false;
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------MECHANIC: JUGGLER'S JINX (phase 2+)--------------------
//------------------------------------------------------------------------
// Three balls orbit the stage in wide loops: two JINX balls (🟣, touching
// them bites) and one LUCK ball (💛, touching it heals a little). The luck
// ball drifts deliberately THROUGH the mayhem — greed bait. Phase 3 adds a
// third jinx ball and tightens the loops.
const EG_JS_JINX_LIFE = 8000;
const EG_JS_ORBIT_TURN = 1.4;   // rad/s course change (readable loops)

function _egMechJsJinx(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(2, Math.min(3, Number(phase) || 2));
    const level = monster ? monster.level : 1;
    const run = _egNkNewRun(monster && monster.id, true);
    const W = window.innerWidth, H = window.innerHeight;
    const lifeMs = EG_JS_JINX_LIFE * _EG_JS_DEBUG_MULT;
    const jinxSpeed = (p >= 3 ? 190 : 160) / _EG_JS_DEBUG_MULT;
    const luckSpeed = 150 / _EG_JS_DEBUG_MULT;
    const turn = EG_JS_ORBIT_TURN * (p >= 3 ? 1.25 : 1);

    const mk = (emoji, cls, speed) => {
        const el = _egNkEl(run, 'div', 'eg-js-ball ' + cls, emoji);
        const side = Math.floor(Math.random() * 4);
        return {
            x: side === 0 ? 50 : side === 1 ? W - 50 : W * (0.2 + Math.random() * 0.6),
            y: side === 2 ? 60 : side === 3 ? H - 60 : H * (0.2 + Math.random() * 0.6),
            ang: Math.random() * Math.PI * 2, speed, el, done: false,
        };
    };
    const balls = [];
    const nJinx = p >= 3 ? 3 : 2;
    for (let i = 0; i < nJinx; i++) balls.push(mk('🟣', 'eg-js-ball-jinx', jinxSpeed));
    balls.push(mk('💛', 'eg-js-ball-luck', luckSpeed));

    _egNkToast('eg_mech_js_jinx', '🤹 The Jester: JUGGLER\u2019S JINX — grab the gold, dodge the purple!', '#e9d5ff');

    let t = 0, touchCd = 0;
    _egNkLoop(run, (dtS, now) => {
        t += dtS * 1000;
        const c = _egNkPlayerCenter();
        const pr = _egNkPlayerRect();
        let active = false;
        balls.forEach(b => {
            if (b.done) return;
            active = true;
            // Wide looping course: steer toward the player but only slowly
            // (the cap makes them draw loops, not chase lines).
            if (c) {
                const want = Math.atan2(c.y - b.y, c.x - b.x);
                let diff = ((want - b.ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
                const max = turn * dtS;
                b.ang += Math.max(-max, Math.min(max, diff));
            }
            b.x += Math.cos(b.ang) * b.speed * dtS;
            b.y += Math.sin(b.ang) * b.speed * dtS;
            if (b.x < 34 || b.x > W - 34) { b.ang = Math.PI - b.ang; b.x = Math.max(34, Math.min(W - 34, b.x)); }
            if (b.y < 34 || b.y > H - 34) { b.ang = -b.ang; b.y = Math.max(34, Math.min(H - 34, b.y)); }
            b.el.style.left = Math.round(b.x - 16) + 'px';
            b.el.style.top = Math.round(b.y - 16) + 'px';
            if (pr && now >= touchCd && _egNkCircleHit(b.x, b.y, 16, pr, 0)) {
                touchCd = now + EG_JS_HIT_CD_MS;
                if (b.speed === luckSpeed) {
                    // The LUCK ball: a small heal, then it pops.
                    const maxHP = ((typeof _egNkMaxHP === 'function') ? _egNkMaxHP() : 0) || 100;
                    const heal = Math.max(1, Math.round(maxHP * EG_JS_LUCK_HEAL));
                    _egJsHeal(heal);
                    showToast('💛 +' + heal);
                    _egJsConfetti(b.x, b.y, false);
                    b.done = true;
                    try { b.el.remove(); } catch (e) {}
                    return;
                }
                _egJsTouch(EG_JS_JINX_DMG[p], level, 'Jinx Ball');
                _egJsConfetti(b.x, b.y, false);
            }
        });
        if (t >= lifeMs || !active) {
            balls.forEach(b => { if (!b.done) { b.done = true; try { b.el.remove(); } catch (e) {} } });
            return false;
        }
        return true;
    });
}


//------------------------------------------------------------------------
//-------------------🎪… THE GRAND FINALE (≤10% HP one-shot finale)---------
//------------------------------------------------------------------------
// The stage curtain drops, the boss bows (immune), and the FULL HOUSE
// builds: oversized cards deal onto the grid in a closing spiral — every
// card shows a suit, and each REVEAL names one SAFE suit. Stand on the
// safe suit when the reveal lands; wrong suit = hit. Reveals accelerate,
// then the BLACKOUT: all cards flip face-down except the safe suit, and
// the CURTAIN CALL sweeps barrage lanes across the stage. Charge bar
// frozen for the whole set-piece (gate in _egTickPlayer via _egJsFinalActive).
const EG_JS_FINAL_SHOWS = 3;      // suit reveals
const EG_JS_SHOW_CHARGE = 1400;   // ms telegraph per reveal (shrinks)
const EG_JS_SHOW_CHARGE_MIN = 800;
const EG_JS_CARD_COLS = 6;
const EG_JS_CARD_ROWS = 4;

// Set while the finale runs (read by _egTickPlayer's charge-freeze gate).
let _egJsFinal = null;

// Pause-safe timeout: while the game is frozen the callback retries every
// 200ms instead of firing mid-pause (the freeze guard the other finales
// run inside their loop ticks — this show runs on timeouts instead).
function _egJsAfter(g, fn, ms) {
    const id = setTimeout(() => {
        if (!g || g.finished || _egJsFinal !== g) return;
        if (_egNkFrozen()) { _egJsAfter(g, fn, 200); return; }
        fn();
    }, ms);
    if (g && g.timers) g.timers.push(id);
    return id;
}

function _egJsFinalActive() {
    return !!_egJsFinal && !_egJsFinal.finished;
}

// Phase-enter hook: starts the ≤10% HP watcher (the framework only calls
// onPhaseEnter on transitions, so a dive from 30% → 10% needs its own gate).
function _egJsOnPhaseEnter(monster, newPhase) {
    if (newPhase !== 3) return false;
    try { _egJsStartFinalWatcher(monster); } catch (e) {}
    return false;
}

function _egJsStartFinalWatcher(monster) {
    if (!monster || _egJsFinal) return;
    const run = _egNkNewRun(monster.id, true);
    run.passive = true;
    _egNkLoop(run, () => {
        if (_egJsFinal) return false;
        try {
            if (monster.currentHP <= monster.maxHP * 0.10) {
                _egJsFinalStart(monster);
                return false;
            }
        } catch (e) { return false; }
        return true;
    });
}

function _egJsFinalStart(monster) {
    if (_egJsFinal || !monster) return;

    // The house lights dim: kill every other run of this boss (the finale
    // owns the stage).
    Array.from(_egNkRuns.values()).forEach(r => {
        if (r.bossId === monster.id) { try { _egNkKillRun(r); } catch (e) {} }
    });

    const W = window.innerWidth, H = window.innerHeight;
    const g = {
        monsterId: monster.id,
        finished: false,
        fxRun: null, curtain: null, overlay: null, gridEl: null,
        cards: [], showTimer: null, sweepEls: [], timers: [],
    };
    _egJsFinal = g;

    // Freeze the auto-attack charge bar for the whole set-piece (the gate
    // lives in _egTickPlayer; this class is the visual twin).
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('eg-charge-paused');
    });

    // FX run (passive): holds curtain, cards and the show timeline.
    g.fxRun = _egNkNewRun(monster.id, true);
    g.fxRun.passive = true;

    // The curtain drops.
    const curtain = document.createElement('div');
    curtain.className = 'eg-js-curtain';
    document.body.appendChild(curtain);
    g.curtain = curtain;
    requestAnimationFrame(() => curtain.classList.add('eg-js-curtain-on'));

    // The card table: an evenly spaced grid of face-down cards.
    const grid = document.createElement('div');
    grid.className = 'eg-js-table';
    document.body.appendChild(grid);
    g.gridEl = grid;
    g.fxRun.els.push(grid);
    const padX = W * 0.09, padY = H * 0.16;
    for (let r = 0; r < EG_JS_CARD_ROWS; r++) {
        for (let c2 = 0; c2 < EG_JS_CARD_COLS; c2++) {
            const el = document.createElement('div');
            el.className = 'eg-js-card eg-js-tablecard';
            el.style.left = Math.round(padX + (W - 2 * padX) * c2 / (EG_JS_CARD_COLS - 1) - EG_JS_CARD_W / 2) + 'px';
            el.style.top = Math.round(padY + (H - 2 * padY) * r / (EG_JS_CARD_ROWS - 1) - EG_JS_CARD_H / 2) + 'px';
            grid.appendChild(el);
            g.cards.push({ el, col: c2, row: r });
        }
    }

    // Countdown overlay.
    const ov = document.createElement('div');
    ov.className = 'eg-js-cd';
    ov.innerHTML =
        '<div class="eg-js-cd-label">🎪 THE GRAND FINALE</div>' +
        '<div class="eg-js-cd-hint">Read the reveal — stand on the safe suit!</div>';
    document.body.appendChild(ov);
    g.overlay = ov;

    _egNkToast('eg_mech_js_final_cd', '🎪💀 THE GRAND FINALE — mind the reveal!', '#e9d5ff');

    // Boss immunity for the whole set-piece (released at the end).
    monster.bossImmune = true;

    // The boss bows.
    const card = document.getElementById('eg-card-' + monster.id);
    const wrap = card ? (card.querySelector('.eg-emoji-wrapper') || card) : null;
    if (wrap) {
        wrap.classList.add('eg-js-bowing');
        wrap.classList.add('eg-nk-shielded');
    }

    const level = monster.level || 1;
    const suits = ['♠', '♥', '♦', '♣'];
    const reds = { '♥': 1, '♦': 1 };
    const show = (idx) => {
        if (!_egJsFinal || _egJsFinal !== g || g.finished) return;
        if (idx >= EG_JS_FINAL_SHOWS) {
            _egJsBlackout(g, monster, level);
            return;
        }
        const charge = Math.max(EG_JS_SHOW_CHARGE_MIN,
            EG_JS_SHOW_CHARGE - idx * 250) * (_EG_JS_DEBUG_SLOW ? 8 : 1);
        // Deal the safe suit onto a random third of the table.
        const safe = suits[Math.floor(Math.random() * suits.length)];
        g.cards.forEach(cd => {
            const face = Math.random() < 0.34 ? safe : suits[Math.floor(Math.random() * suits.length)];
            cd.el.textContent = face;
            cd.el.classList.toggle('eg-js-card-red', !!reds[face]);
            cd.el.classList.remove('eg-js-card-safe');
            if (face === safe) cd.el.classList.add('eg-js-card-faceup');
        });
        g.cards.forEach(cd => cd.el.classList.add('eg-js-card-dealt'));
        _egNkToast('eg_mech_js_reveal', '🎪 The reveal is coming — stand on the glowing suit!', '#e9d5ff');
        _egJsAfter(g, () => {
            // REVEAL: cards flip down; the SAFE suit stays lit and judges.
            const pr = _egNkPlayerRect();
            let onSafe = false;
            g.cards.forEach(cd => {
                cd.el.classList.remove('eg-js-card-faceup');
                cd.el.classList.add('eg-js-card-down');
                if (cd.el.textContent === safe) {
                    cd.el.classList.add('eg-js-card-safe');
                    if (pr) {
                        const pc = { x: pr.left + pr.width / 2, y: pr.top + pr.height / 2 };
                        const cx = parseFloat(cd.el.style.left) + EG_JS_CARD_W / 2;
                        const cy = parseFloat(cd.el.style.top) + EG_JS_CARD_H / 2;
                        if (Math.abs(pc.x - cx) < EG_JS_CARD_W / 2 + 14 && Math.abs(pc.y - cy) < EG_JS_CARD_H / 2 + 14) onSafe = true;
                    }
                }
            });
            _egJsConfetti(W / 2, H / 2, !onSafe);
            if (pr && !onSafe) {
                _egJsTouch(EG_JS_REVEAL_DMG, level, 'Wrong Suit');
            }
            _egJsAfter(g, () => {
                g.cards.forEach(cd => cd.el.classList.remove('eg-js-card-safe', 'eg-js-card-down'));
                show(idx + 1);
            }, EG_JS_DEBUG_SLOW ? 1400 : 700);
        }, charge);
    };
    g.showTimer = _egJsAfter(g, () => show(0), EG_JS_DEBUG_SLOW ? 4000 : 1600);
}

// The BLACKOUT + CURTAIN CALL: all cards flip face-down except the safe
// suit; sweeping barrage lanes cross the stage — the last show of shows.
function _egJsBlackout(g, monster, level) {
    if (!g || g.finished) return;
    g.phase = 'blackout';
    const W = window.innerWidth, H = window.innerHeight;
    const safeSuit = ['♠', '♥', '♦', '♣'][Math.floor(Math.random() * 4)];
    g.cards.forEach(cd => {
        cd.el.textContent = '🂠';
        cd.el.classList.add('eg-js-card-down');
        cd.el.classList.remove('eg-js-card-safe');
    });
    // Light up only the safe-suit columns (2 of 6 columns per row).
    const safeCols = new Set([Math.floor(Math.random() * 3), 3 + Math.floor(Math.random() * 3)]);
    const safeCells = [];
    g.cards.forEach(cd => {
        if (safeCols.has(cd.col)) {
            cd.el.classList.add('eg-js-card-safe');
            cd.el.textContent = safeSuit;
            cd.el.classList.remove('eg-js-card-down');
            safeCells.push(cd);
        }
    });
    _egNkToast('eg_mech_js_blackout', '🎪💀 BLACKOUT + CURTAIN CALL — stand in the lit columns!', '#e9d5ff');

    // CURTAIN CALL: 3 barrage waves sweep the rows; standing on a safe cell
    // inside the swept row shelters you — the show's final read.
    const rows = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
    const waveGap = 900 * _EG_JS_DEBUG_MULT;
    let wi = 0;
    const sweepNext = () => {
        if (!_egJsFinal || _egJsFinal !== g || g.finished) return;
        if (wi >= rows.length) {
            _egJsAfter(g, () => _egJsFinalEnd(g), _EG_JS_DEBUG_SLOW ? 5500 : 1200);
            return;
        }
        const r = rows[wi++];
        const y = H * 0.16 + (H - 2 * H * 0.16) * r / (EG_JS_CARD_ROWS - 1);
        const fromLeft = Math.random() < 0.5;
        const bandH = 110;
        const warn = document.createElement('div');
        warn.className = 'eg-js-sweepwarn';
        warn.style.left = '0px';
        warn.style.width = W + 'px';
        warn.style.top = Math.round(y - bandH / 2) + 'px';
        warn.style.height = bandH + 'px';
        document.body.appendChild(warn);
        g.sweepEls.push(warn);
        _egJsAfter(g, () => {
            const idxW = g.sweepEls.indexOf(warn);
            if (idxW >= 0) g.sweepEls.splice(idxW, 1);
            try { warn.remove(); } catch (e) {}
            if (!_egJsFinal || _egJsFinal !== g || g.finished) return;
            const sweep = document.createElement('div');
            sweep.className = 'eg-js-sweep' + (fromLeft ? ' eg-js-from-left' : ' eg-js-from-right');
            sweep.style.top = Math.round(y - bandH * 0.4) + 'px';
            sweep.style.height = Math.round(bandH * 0.8) + 'px';
            document.body.appendChild(sweep);
            g.sweepEls.push(sweep);
            const speed = 760 / _EG_JS_DEBUG_MULT;
            let sx = fromLeft ? -160 : W + 40;
            sweep.style.left = Math.round(sx) + 'px';
            let touchCd = 0;
            _egNkLoop(g.fxRun, (dtS, now) => {
                sx += (fromLeft ? 1 : -1) * speed * dtS;
                sweep.style.left = Math.round(sx) + 'px';
                const pr = _egNkPlayerRect();
                if (pr && now >= touchCd) {
                    const pc = { x: pr.left + pr.width / 2, y: pr.top + pr.height / 2 };
                    if (Math.abs(pc.y - y) < bandH / 2 + 6) {
                        let sheltered = false;
                        safeCells.forEach(cd => {
                            const cy = parseFloat(cd.el.style.top) + EG_JS_CARD_H / 2;
                            const cx = parseFloat(cd.el.style.left) + EG_JS_CARD_W / 2;
                            if (Math.abs(pc.y - cy) < EG_JS_CARD_H / 2 + 14 && Math.abs(pc.x - cx) < EG_JS_CARD_W / 2 + 14) sheltered = true;
                        });
                        if (!sheltered) {
                            touchCd = now + EG_JS_HIT_CD_MS;
                            _egJsTouch(EG_JS_SWEEP_DMG, level, 'Curtain Call');
                        }
                    }
                }
                if ((!fromLeft && sx < -200) || (fromLeft && sx > W + 200)) {
                    try { sweep.remove(); } catch (e) {}
                    _egJsAfter(g, sweepNext, waveGap);
                    return false;
                }
                return true;
            });
        }, 1000 * _EG_JS_DEBUG_MULT);
    };
    sweepNext();
}

function _egJsFinalEnd(g) {
    if (!g || g.finished) return;
    g.finished = true;
    if (g.showTimer) { clearTimeout(g.showTimer); g.showTimer = null; }
    (g.timers || []).forEach(id => { clearTimeout(id); });
    g.timers = [];
    if (g.overlay) { try { g.overlay.remove(); } catch (e) {} g.overlay = null; }
    if (g.curtain) { try { g.curtain.remove(); } catch (e) {} g.curtain = null; }
    if (g.gridEl) { try { g.gridEl.remove(); } catch (e) {} g.gridEl = null; }
    g.sweepEls.forEach(el => { try { el.remove(); } catch (e) {} });
    g.sweepEls = [];
    if (g.fxRun) { try { _egNkKillRun(g.fxRun); } catch (e) {} g.fxRun = null; }
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('eg-charge-paused');
    });
    document.querySelectorAll('.eg-js-bowing').forEach(el => el.classList.remove('eg-js-bowing'));

    const m = (g.monsterId && typeof _egMonsters !== 'undefined')
        ? _egMonsters.find(x => x && x.id === g.monsterId) : null;
    if (m && m.bossImmune) {
        m.bossImmune = false;
        if (typeof _egBossScheduleMechanics === 'function') {
            try { _egBossScheduleMechanics(m, 3); } catch (e) {}
        }
        if (typeof _egRenderPanel === 'function') { try { _egRenderPanel(); } catch (e2) {} }
    }
    if (_egJsFinal === g) _egJsFinal = null;
}


//------------------------------------------------------------------------
//-------------------TEARDOWN-----------------------------------------------
//------------------------------------------------------------------------
// Called from _egBossCleanup on boss death AND from the encounter stop —
// removes every run element, overlay and body class this boss ever created.
function _egJsTeardown() {
    if (_egJsFinal) { try { _egJsFinalEnd(_egJsFinal); } catch (e) {} _egJsFinal = null; }
    document.querySelectorAll('.eg-nk-orb-jester, .eg-js-card, .eg-js-ball, ' +
        '.eg-js-curtain, .eg-js-table, .eg-js-cd, .eg-js-sweepwarn, .eg-js-sweep, ' +
        '.eg-js-confetti').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    document.querySelectorAll('.eg-js-bowing').forEach(el => el.classList.remove('eg-js-bowing'));
    ['avatar-charge-fill', 'eg-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('eg-charge-paused');
    });
}


//------------------------------------------------------------------------
//-------------------PLAYTEST CONSOLE HOOK (dev only)----------------------
//------------------------------------------------------------------------
// Tiny console API for playtesting with stretched debug timings:
//   _EG_JS_DEBUG.fire('orbs'|'cards'|'jinx', phase) — runs one now
//   _EG_JS_DEBUG.final()                            — GRAND FINALE now
if (typeof window !== 'undefined') {
    window._EG_JS_DEBUG = {
        fire: (name, phase) => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? _egMonsters.find(m => m && m.baseId === 'boss_jester') : null;
            if (!monster) return 'no jester alive';
            const fn = name === 'orbs' ? _egMechJsOrbs
                : name === 'cards' ? _egMechJsCards
                : name === 'jinx' ? _egMechJsJinx : null;
            if (!fn) return 'unknown: ' + name;
            if (name !== 'orbs' && _egNkDodgeBusy()) return 'BLOCKED: dodge-busy (wait for the field to clear)';
            fn(monster, phase || monster.bossPhase || 1);
            return 'fired ' + name;
        },
        final: () => {
            const monster = (typeof _egMonsters !== 'undefined')
                ? _egMonsters.find(m => m && m.baseId === 'boss_jester') : null;
            if (!monster) return 'no jester alive';
            _egJsFinalStart(monster);
            return 'THE GRAND FINALE started';
        },
    };
}
