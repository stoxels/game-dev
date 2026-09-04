//------------------------------------------------------------------------
//-------------------BOSS: THE CLOCK (boss_clock)---------------------------
//------------------------------------------------------------------------
// Clockwork duel: The Clock summons three hands as the fight progresses —
// the seconds hand at 90% HP, the minutes hand at 60%, the hours hand at
// 30%. Every hand is a single SOLID THIN BEAM (a line from the pivot
// outward to the screen edge) that sweeps the arena — anywhere on the
// beam hurts, so you must stay off every hand's line. Each hand is
// announced by calling the time in the center of the grid ("35 seconds",
// "27 minutes", "5 hours") 3 seconds before it appears, and once summoned
// the hands NEVER stop — they rotate at the SAME speed until the boss is
// won or lost, and they spawn staggered ~120° apart so the three beams
// keep permanent gaps between them instead of bunching into a single
// blade.
// Phase 1 runs a single hand (seconds), phase 2 adds the minute hand,
// phase 3 adds the hour hand. Getting caught by a beam is punishing:
// hits deal a large % of max HP, scaled per hand.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_clock: {
        id: 'boss_clock', name: 'The Clock', emoji: '🕐',
        baseHP: 940, baseDamage: 20, chargeMax: 13,
        element: 'lightning', resistances: { fire: 15, cold: 15, lightning: 30, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_clock: {
        phases: [
            { threshold: 1.00, chargeMax: 13, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 10, damageMultiplier: 1.35 },
            { threshold: 0.30, chargeMax: 8, damageMultiplier: 1.75 },
        ],
        immunityDuration: 2000,
        mechanics: [
            // clock_hands is only a START trigger: the first fire creates the
            // permanent watcher run that summons each hand at its HP threshold;
            // later fires (every 10 min) are cheap no-ops while it is alive.
            { name: 'clock_hands', intervalBase: 600000, intervalVariance: 0, handler: '_egMechClockHands' },
            { name: 'probability_shift', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechProbabilityShift' },
        ],
    },
});


// ── Tunables ──────────────────────────────────────────────────────────────
const EG_CLOCK_SUMMON_WARN_MS = 3000;            // center call → hand appears
// All three hands share ONE rotation speed so the staggered spawn positions
// keep their relative gaps forever (a rigid three-hand clock). Every boss
// phase (2 at 60% HP, 3 at 30%) speeds all beams up by 33% more (16s → 12s
// → 9s per revolution). Tuned against the avatar's ~320 px/s WASD speed:
// phase 3's sweep can be outrun at any radius inside the grid area only
// with movement-speed boots — far from the pivot the beams outrun a
// base-speed avatar, so the fight funnels you toward the clock's center.
const EG_CLOCK_HAND_OMEGA = (2 * Math.PI) / 16;  // one full revolution per 16s in phase 1
const EG_CLOCK_PHASE_SPEED_STEP = 0.33;          // +33% rotation speed per boss phase
const EG_CLOCK_HIT_SLACK_PX = 2;                 // beam hit width ≈ its visual thickness
const EG_CLOCK_HURTBOX_INSET_PX = 3;             // extra inset on the damage sample box
const EG_CLOCK_SPAWN_GRACE_MS = 400;             // grace window after a hand spawns
const EG_CLOCK_HIT_CD_MS = 1000;                 // per-hand cooldown while caught
const EG_CLOCK_SPAWN_STAGGER_RAD = (2 * Math.PI) / 3; // new hands spawn ~120° apart → three equal safe wedges
const EG_CLOCK_SPAWN_JITTER_RAD = (5 * Math.PI) / 180;  // ±5° randomness on top

// ── Time Freeze tunables (the 15% HP last-stand) ─────────────────────────
const EG_CLOCK_FREEZE_TRIGGER_PCT = 0.15;   // boss HP% that stops time
const EG_CLOCK_FREEZE_DURATION_MS = 30000;  // the frozen window (30s)
const EG_CLOCK_FREEZE_STRIKE_MS = 800;      // beams lunge through the player
const EG_CLOCK_FREEZE_BEAMS = 12;           // beams ringed all around the screen
const EG_CLOCK_FREEZE_HOLD_PX = 68;         // hover radius from player center
const EG_CLOCK_FREEZE_LUNGE_PX = 220;       // strike punches this far past the player
const EG_CLOCK_FREEZE_DMG_PCT = 0.28;       // combined heavy damage on failure
const EG_CLOCK_FREEZE_COLOR = '#ffe536';    // lightning yellow

// Global freeze flag — true while The Clock holds time. Written BEFORE any
// side effect so a single frame can never slip between the freeze starting
// and the timer / mistakes / movement freezing. Read in:
//   start-level.js   keeps timerFrozen alive across arena puzzle transitions
//   penalty.js       mistake counter frozen
//   player_sprite.js avatar can't move
// Cleared by _egClockTimeFreezeEnd, which every freeze-run kill path runs.
window._egClockTimeFreezeActive = false;


// ── Hand unit metadata ────────────────────────────────────────────────────
// Each hand maps a dial reading to an angle (scale = unit per full turn),
// like a real clock. Hands are told apart by color + thickness + the
// announced unit (seconds red/thin, minutes cyan/medium, hours amber/thick).
// Every beam is SOLID from the pivot to the screen edge — no safe hole —
// so the whole fight is reading the three beams' rhythm and staying off
// their lines.
const EG_CLOCK_HAND_SECONDS = {
    keyS: 'eg_clock_second', keyP: 'eg_clock_seconds', fbS: 'second', fbP: 'seconds',
    max: 59, scale: 60,
    summonPct: 0.90, dmgPct: 0.10,
    cls: 'eg-nk-clock-second', callCls: 'eg-nk-clock-call-second',
    height: 6, halfW: 4,
};
const EG_CLOCK_HAND_MINUTES = {
    keyS: 'eg_clock_minute', keyP: 'eg_clock_minutes', fbS: 'minute', fbP: 'minutes',
    max: 59, scale: 60,
    summonPct: 0.60, dmgPct: 0.13,
    cls: 'eg-nk-clock-minute', callCls: 'eg-nk-clock-call-minute',
    height: 12, halfW: 7,
};
const EG_CLOCK_HAND_HOURS = {
    keyS: 'eg_clock_hour', keyP: 'eg_clock_hours', fbS: 'hour', fbP: 'hours',
    max: 12, scale: 12,
    summonPct: 0.30, dmgPct: 0.16,
    cls: 'eg-nk-clock-hour', callCls: 'eg-nk-clock-call-hour',
    height: 20, halfW: 11,
};


// Localized "seconds / minutes / hours" label (singular form for value 1).
function _egClockUnitLabel(h, value) {
    const key = value === 1 ? h.keyS : h.keyP;
    let unit = value === 1 ? h.fbS : h.fbP;
    try {
        const r = t(key);
        if (r && r !== key) unit = r;
    } catch (e) {}
    return value + ' ' + unit;
}


// Nearest dial reading (1..max) for an angle — used to announce a spawn
// position as a human-readable clock number. Angles follow the dial
// convention (12 o'clock = 0 units, clockwise positive).
function _egClockValueFromAngle(cfg, a) {
    let v = Math.round(((a + Math.PI / 2) / (2 * Math.PI)) * cfg.scale);
    v = ((v - 1) % cfg.max + cfg.max) % cfg.max + 1;
    return v;
}


// Builds one hand: a solid beam from the pivot (left end) to the screen
// edge that rotates about the pivot. Returns the element.
function _egClockMakeHand(run, cfg, cx, cy, len) {
    const el = _egNkEl(run, 'div', 'eg-nk-clock-hand');
    el.style.width = Math.round(len) + 'px';
    el.style.height = cfg.height + 'px';
    el.style.left = Math.round(cx) + 'px';
    el.style.top = Math.round(cy - cfg.height / 2) + 'px';
    el.style.animation = 'eg-clock-hand-in 0.45s ease-out';

    const beam = document.createElement('div');
    beam.className = 'eg-nk-clock-seg ' + cfg.cls;
    beam.style.width = Math.round(len) + 'px';
    el.appendChild(beam);
    return { el };
}


// Sample points for the damage test, inset a few px toward the sprite
// center — the avatar's visible artwork carries transparent padding, so a
// grazing corner shouldn't register as a hit. Returns the inset box's four
// corners + center for the beam line tests.
function _egClockPlayerPts(pr) {
    const ix = Math.min(EG_CLOCK_HURTBOX_INSET_PX, Math.max(0, pr.width / 2 - 8));
    const iy = Math.min(EG_CLOCK_HURTBOX_INSET_PX, Math.max(0, pr.height / 2 - 8));
    const l = pr.left + ix, r = pr.right - ix, t = pr.top + iy, b = pr.bottom - iy;
    const cx = (l + r) / 2, cy = (t + b) / 2;
    return [[cx, cy], [l, t], [r, t], [l, b], [r, b]];
}


// ── Center-grid call banner (same slot as the low-time / mistakes /
//    low-health warnings). One colored line per summoned hand, each line
//    colored like its beam (red seconds, cyan minutes, amber hours).
function _egClockShowCall(plan) {
    if (typeof _egClearCenterGridBanners === 'function') {
        _egClearCenterGridBanners('eg-clock-call-banner');
    }
    const banner = document.createElement('div');
    banner.id = 'eg-clock-call-banner';
    banner.className = 'eg-clock-call-banner';
    plan.forEach(p => {
        const line = document.createElement('div');
        line.className = 'eg-nk-clock-call-line ' + p.cfg.callCls;
        line.textContent = _egClockUnitLabel(p.cfg, p.value);
        banner.appendChild(line);
    });
    document.body.appendChild(banner);
    const board = document.getElementById('ptable');
    if (board) {
        const r = board.getBoundingClientRect();
        banner.style.left = (r.left + r.width / 2) + 'px';
        banner.style.top = (r.top + r.height / 2) + 'px';
    } else {
        banner.style.left = '50%';
        banner.style.top = '50%';
    }
    return banner;
}


// Watcher run that lives for the whole boss fight (created by the
// clock_hands start trigger): watches boss HP and summons each hand at its
// threshold — center call, 3s later the beam appears and rotates forever.
// Hands only stop when the run dies with the boss (win or loss).
function _egMechClockHands(monster, phase) {
    if (typeof _egNkNewRun !== 'function' || typeof _egNkEl !== 'function') return;
    // The face element doubles as the "hands already running" flag — it is
    // removed with the run's elements when the boss dies or the encounter
    // stops, so a fresh fight always starts clean.
    if (document.getElementById('eg-nk-clock-face')) return;

    const bossId = monster && monster.id;
    const run = _egNkNewRun(bossId, false);
    const level = monster ? monster.level : 1;
    const cx = window.innerWidth * 0.5, cy = window.innerHeight * 0.45;
    const len = Math.hypot(window.innerWidth, window.innerHeight);

    // Clock face (pivot). The .eg-nk-anchor pulse animates the independent
    // `scale` property, so the inline translate below is preserved.
    const face = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-anchor', '🕐');
    face.id = 'eg-nk-clock-face';
    face.style.transform = 'translate(' + Math.round(cx - 26) + 'px,' + Math.round(cy - 26) + 'px)';

    const roster = [EG_CLOCK_HAND_SECONDS, EG_CLOCK_HAND_MINUTES, EG_CLOCK_HAND_HOURS];
    const live = [];     // spawned hands { cfg, a, el, cdUntil }
    const armed = {};    // summonPct → true once the threshold was crossed
    const pending = [];  // hand cfgs waiting for their center call
    let announced = [];  // { cfg, a, value } during the 3s call window
    let callBanner = null;
    let callMsLeft = 0;

    function beginAnnounce() {
        const batch = pending.splice(0);
        if (!batch.length) return;
        // Plan spawn angles in order — each new hand starts ~120° past the
        // previous planned one (or past the last live hand). Because every
        // hand rotates at the SAME speed, those gaps stay open forever.
        announced = [];
        let lastAngle = live.length ? live[live.length - 1].a : -Math.PI / 2;
        batch.forEach(cfg => {
            const a = lastAngle + EG_CLOCK_SPAWN_STAGGER_RAD
                + (Math.random() * 2 - 1) * EG_CLOCK_SPAWN_JITTER_RAD;
            lastAngle = a;
            announced.push({ cfg, a, value: _egClockValueFromAngle(cfg, a) });
        });
        callMsLeft = EG_CLOCK_SUMMON_WARN_MS;
        callBanner = _egClockShowCall(announced);
        run.els.push(callBanner);
    }

    function spawnAnnounced(now) {
        announced.forEach(p => {
            const made = _egClockMakeHand(run, p.cfg, cx, cy, len);
            made.el.style.transform = 'rotate(' + p.a + 'rad)';
            // safeSince = spawn moment → a hand that appears right on top of
            // the player gets the same short grace window before first hit.
            live.push({ cfg: p.cfg, a: p.a, el: made.el, cdUntil: 0, safeSince: now });
            // The mechanic intro toast rides along with the first hand.
            if (p.cfg.fbP === 'seconds') {
                _egNkToast('eg_mech_clock', '🕐 The Clock: Clock Hand! Count the rhythm!');
            }
        });
        if (callBanner) { callBanner.remove(); callBanner = null; }
        announced = [];
    }

    _egNkLoop(run, (dtS, now) => {
        // HP polling — the run's aliveness check already kills it when the
        // boss dies; this lookup only feeds the summon thresholds.
        const m = (typeof _egMonsters !== 'undefined' && _egMonsters)
            ? _egMonsters.find(x => x && x.id === bossId) : null;
        const pct = (m && m.maxHP > 0) ? (m.currentHP / m.maxHP) : 1;

        // Arm hands whose HP threshold was crossed (each exactly once).
        roster.forEach(cfg => {
            if (!armed[cfg.summonPct] && pct <= cfg.summonPct) {
                armed[cfg.summonPct] = true;
                pending.push(cfg);
            }
        });
        if (!announced.length && pending.length) beginAnnounce();

        // 3s call window → the announced hand(s) spawn and start rotating.
        if (announced.length) {
            callMsLeft -= dtS * 1000;
            if (callMsLeft <= 0) spawnAnnounced(now);
        }

        const pr = _egNkPlayerRect();
        const pts = pr ? _egClockPlayerPts(pr) : null;

        // Time Freeze (≤15% HP): the clock stops — the hands freeze mid-sweep
        // while the player races to slay the boss inside the 30s window.
        if (!window._egClockTimeFreezeActive && pct <= EG_CLOCK_FREEZE_TRIGGER_PCT) {
            _egClockStartTimeFreeze(m || monster, level);
        }

        // Phase scaling: phase 1 spins at base speed, phase 2 +20%,
        // phase 3 +40% — all hands share it, so their gaps stay fixed.
        const timeStopped = !!window._egClockTimeFreezeActive;
        const phaseNo = pct <= 0.30 ? 3 : pct <= 0.60 ? 2 : 1;
        const speed = EG_CLOCK_HAND_OMEGA
            * Math.pow(1 + EG_CLOCK_PHASE_SPEED_STEP, phaseNo - 1);
        for (const h of live) {
            // Frozen hands stand dead still (and stop hurting) during Time Freeze.
            if (timeStopped) continue;
            h.a += dtS * speed;
            h.el.style.transform = 'rotate(' + h.a + 'rad)';
            if (!pts) continue;
            // Spawn grace: a hand that appears right on top of the player
            // gets a short window before its first hit (set at spawn).
            if (now < h.cdUntil || now - h.safeSince < EG_CLOCK_SPAWN_GRACE_MS) continue;
            const bx = cx + Math.cos(h.a) * len, by = cy + Math.sin(h.a) * len;
            for (const pt of pts) {
                if (_egInfernoPtSegDist(pt[0], pt[1], cx, cy, bx, by) < h.cfg.halfW + EG_CLOCK_HIT_SLACK_PX) {
                    h.cdUntil = now + EG_CLOCK_HIT_CD_MS;
                    const dealt = _egNkHit(h.cfg.dmgPct, 'lightning', level);
                    _egNkAbilityHitToast(dealt, 'The Clock', 'Clock Hand');
                    break;
                }
            }
        }
        return true; // rotate until the boss dies or the encounter stops
    });
}


//------------------------------------------------------------------------
//-------------------TIME FREEZE (15% HP LAST-STAND)----------------------
//------------------------------------------------------------------------
// Below 15% HP The Clock freezes time for 30 seconds:
//   • the three rotating hands stop dead in the air (see the hands loop)
//   • the map timer (timerFrozen) and the mistake counter freeze
//   • the avatar cannot move (player_sprite.js / penalty.js read the flag)
//   • a ring of 12 frozen beams rushes in from all sides of the screen and
//     hovers just short of the player, aimed straight at them
// The player must slay the boss inside the window. If the freeze expires
// with the boss still standing — even on a NEW PUZZLE when the arena grid
// was solved mid-freeze (the countdown never resets) — every beam lunges
// through the player for heavy damage.
// The freeze lives in its OWN nk run owned by the boss id: it survives
// boss-arena puzzle transitions (the boss is carried to the next grid), is
// killed with the fight when the boss dies (success → no strike) or when
// the encounter stops, and run.onKill always restores the frozen systems so
// the game can never stay frozen.


// Restores every system the Time Freeze pinned. Idempotent and safe to call
// from onKill AND from the kill loop — the run is only ever killed once.
function _egClockTimeFreezeEnd() {
    if (!window._egClockTimeFreezeActive) return;
    window._egClockTimeFreezeActive = false;
    if (typeof timerFrozen !== 'undefined') timerFrozen = false;
    if (typeof updTimer === 'function') updTimer();
}


// Localized helper with {n} placeholder support (English fallback).
function _egClockL10n(key, fallback, n) {
    let msg = fallback;
    try {
        const raw = t(key);
        if (raw && raw !== key) msg = raw;
    } catch (e) {}
    if (n != null && msg.indexOf('{n}') !== -1) msg = msg.replace('{n}', n);
    return msg;
}


// Distance from a point to the viewport edge along a unit direction — the
// beam's outer end sits on that edge, its tip hovers just short of the
// player.
function _egClockRayEdgeDist(px, py, ux, uy) {
    const w = window.innerWidth, h = window.innerHeight;
    let t = Infinity;
    if (ux > 0) t = Math.min(t, (w - px) / ux);
    else if (ux < 0) t = Math.min(t, -px / ux);
    if (uy > 0) t = Math.min(t, (h - py) / uy);
    else if (uy < 0) t = Math.min(t, -py / uy);
    return Math.max(0, t);
}


// Applies the combined strike damage + failed-freeze toast.
function _egClockFreezeApplyStrike(level) {
    const dealt = _egNkHit(EG_CLOCK_FREEZE_DMG_PCT, 'lightning', level);
    _egNkAbilityHitToast(dealt, 'The Clock', 'Time Freeze');
}


// Kicks off the Time Freeze. Single-flight: the global flag is raised before
// any side effect, and the hands loop only ever calls this once per fight.
function _egClockStartTimeFreeze(monster, level) {
    if (typeof _egNkNewRun !== 'function' || typeof _egNkEl !== 'function') return;
    if (window._egClockTimeFreezeActive) return;

    const bossId = (monster && monster.id) || 'boss_clock';
    const lvl = (monster && monster.level) ? monster.level : (level || 1);

    // Freeze the global systems BEFORE any visual lands — one synchronous
    // block, so nothing else (timer tick, mistake penalty, WASD) can fire
    // between the flag and the freeze taking hold.
    window._egClockTimeFreezeActive = true;
    if (typeof timerFrozen !== 'undefined') timerFrozen = true;
    if (typeof updTimer === 'function') updTimer();

    // Clear center-grid banners so the frozen arena reads clean.
    if (typeof _egClearCenterGridBanners === 'function') {
        _egClearCenterGridBanners('eg-clock-freeze-banner');
    }

    // Own run owned by the boss id — boss death / encounter stop tears it
    // down with the fight, and onKill always restores the frozen systems.
    const run = _egNkNewRun(bossId, false);
    run.onKill = _egClockTimeFreezeEnd;

    // Full-screen cold tint (transparent centre so the grid stays readable).
    _egNkEl(run, 'div', 'eg-clock-freeze-tint');

    // Top-centre countdown banner.
    const banner = document.createElement('div');
    banner.id = 'eg-clock-freeze-banner';
    banner.className = 'eg-clock-freeze-banner';
    banner.style.left = '50%';
    banner.style.top = '14px';
    document.body.appendChild(banner);
    run.els.push(banner);

    // Ring of beams: one from every side, aimed straight at the avatar.
    // The avatar can't move during the freeze (nor across a mid-freeze
    // puzzle transition), so each beam's geometry is computed once and
    // stays correct for the whole window.
    const pc = _egNkPlayerCenter()
        || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const beams = [];
    for (let i = 0; i < EG_CLOCK_FREEZE_BEAMS; i++) {
        const ang = (i / EG_CLOCK_FREEZE_BEAMS) * Math.PI * 2 + (Math.random() * 4 - 2) * (Math.PI / 180);
        const ux = Math.cos(ang), uy = Math.sin(ang);
        const edge = Math.max(0, _egClockRayEdgeDist(pc.x, pc.y, ux, uy) - 6);
        const len = Math.max(40, edge - EG_CLOCK_FREEZE_HOLD_PX);
        const ax = pc.x - ux * edge;   // outer end sits just off the screen edge
        const ay = pc.y - uy * edge;

        const outer = _egNkEl(run, 'div', 'eg-nk-clock-freeze-beam');
        outer.style.left = Math.round(ax) + 'px';
        outer.style.top = Math.round(ay - 1) + 'px';   // 2px tall → centre on the ray
        outer.style.width = Math.round(len) + 'px';
        outer.style.transform = 'rotate(' + Math.atan2(uy, ux) + 'rad)';

        const seg = document.createElement('div');
        seg.className = 'eg-nk-clock-freeze-beam-seg';
        seg.style.setProperty('--eg-freeze-strike-scale',
            (1 + (EG_CLOCK_FREEZE_HOLD_PX + EG_CLOCK_FREEZE_LUNGE_PX) / Math.max(40, len)).toFixed(3));
        outer.appendChild(seg);

        beams.push({ el: outer, seg, len });
    }

    _egNkToast('eg_mech_clock_freeze',
        '🕐 The Clock: TIME FREEZE! Slay it before the hands strike!',
        EG_CLOCK_FREEZE_COLOR);

    // Countdown runs on the nk loop's scaled clock (dtS accumulates only
    // ACTIVE time) — it pauses with the game (Escape) and through a
    // mid-freeze arena transition, and it NEVER resets on a new puzzle.
    // If the player dies, the encounter teardown kills this run (onKill
    // restores everything) — no explicit `dead` check needed here, and one
    // would wrongly end the freeze across the grid-solve transition.
    const bannerEl = banner;
    let elapsedMs = 0;
    let struck = false;
    let lastShownSec = -1;

    function renderBanner(secs) {
        bannerEl.innerHTML = '';
        const title = document.createElement('div');
        title.className = 'eg-clock-freeze-banner-title';
        title.textContent = (secs < 0 ? '💥 ' : '⏸️ ')
            + _egClockL10n('eg_clock_freeze_title', 'TIME FREEZE');
        bannerEl.appendChild(title);
        const count = document.createElement('div');
        count.className = 'eg-clock-freeze-banner-count';
        count.textContent = (secs < 0)
            ? _egClockL10n('eg_clock_freeze_strike', 'THE HANDS STRIKE!')
            : _egClockL10n('eg_clock_freeze_count', '{n}s — finish the boss before the hands strike!', String(secs));
        bannerEl.appendChild(count);
        bannerEl.classList.toggle('eg-clock-freeze-banner-urgent', secs >= 0 && secs <= 5);
    }

    renderBanner(Math.ceil(EG_CLOCK_FREEZE_DURATION_MS / 1000));

    _egNkLoop(run, (dtS) => {
        elapsedMs += dtS * 1000;

        // Freeze expired with the boss still standing → every beam lunges.
        if (!struck && elapsedMs >= EG_CLOCK_FREEZE_DURATION_MS) {
            struck = true;
            _egClockFreezeApplyStrike(lvl);
            beams.forEach(b => b.seg.classList.add('eg-clock-freeze-strike'));
            renderBanner(-1);
            return true; // keep looping so the strike animation plays out
        }
        if (struck && elapsedMs >= EG_CLOCK_FREEZE_DURATION_MS + EG_CLOCK_FREEZE_STRIKE_MS) {
            return false; // run dies → onKill restores the frozen systems
        }

        const secs = Math.max(0, Math.ceil((EG_CLOCK_FREEZE_DURATION_MS - elapsedMs) / 1000));
        if (secs !== lastShownSec) {
            lastShownSec = secs;
            renderBanner(secs);
        }
        return true;
    });
}
