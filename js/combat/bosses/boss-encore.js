import { _renderPanel } from '../encounter.js';
import { BOSS_DEFS, BOSS_MECHANICS, _bossScheduleMechanics } from './boss-framework.js';
import { _nkAbilityHitToast, _nkDodgeBusy, _nkEl, _nkFrozen, _nkHit, _nkKillRun, _nkLoop, _nkNewRun, _nkPlayerCenter, _nkPlayerRect, _nkRuns, _nkToast } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE ENCORE (boss_encore)-----------------------
//------------------------------------------------------------------------
// Rework stage production: be INSIDE closing encore circles, dodge rising
// sound bars, break from locking spotlights, and stand between sequential
// beat mines. CURTAIN CALL at ≤10% plays musical chairs with a spotlight
// - follow the light to the final safe circle.
//------------------------------------------------------------------------

export const _EN_DEBUG_SLOW = false;
export const _EN_DEBUG_MULT = _EN_DEBUG_SLOW ? 2.5 : 1;

Object.assign(BOSS_DEFS, {
    boss_encore: {
        id: 'boss_encore', name: 'The Encore', emoji: '🎵',
        baseHP: 1000, baseDamage: 22, chargeMax: 12,
        element: 'lightning', resistances: { fire: 15, cold: 15, lightning: 30, shadow: 15 }
    },
});

Object.assign(BOSS_MECHANICS, {
    boss_encore: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.00 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'encore_circles', intervalBase: 16000, intervalVariance: 4000, handler: '_mechEnEncoreCircles' },
            { name: 'sound_bars', intervalBase: 18000, intervalVariance: 4000, handler: '_mechEnSoundBars' },
            { name: 'stage_lights', intervalBase: 20000, intervalVariance: 5000, handler: '_mechEnStageLights', phase2Only: true },
            { name: 'beat_mines', intervalBase: 21000, intervalVariance: 5000, handler: '_mechEnBeatMines', phase2Only: true },
        ],
        onPhaseEnter: _enOnPhaseEnter,
    },
});


// ── Shared tuning (per-mechanic constants live with their mechanics) ────────
export const EN_CIRCLE_DMG  = [0, 0.14, 0.17, 0.20];   // missed encore circle
export const EN_EQ_DMG      = [0, 0.18, 0.22, 0.26];   // EQ bar contact
export const EN_SPOT_DMG    = [0, 0, 0.22, 0.25];      // stage light blast
export const EN_MINE_DMG    = [0, 0, 0.16, 0.19];      // beat mine pop
export const EN_FINAL_DMG   = 0.32;                    // THE OVATION full hit
export const EN_TICK_DMG    = 0.12;                    // per-beat applause clip
export const EN_HIT_CD_MS   = 700;                     // shared touch cooldown


//------------------------------------------------------------------------
//-------------------SHARED VISUAL HELPERS---------------------------------
//------------------------------------------------------------------------

// Touch damage helper shared by all Encore numbers. Returns true if a hit
// was rolled (respects the per-touch cooldown).
export let _enHitCd = 0;
export function _enTouch(pct, level, label) {
    const now = performance.now();
    if (now < _enHitCd) return false;
    const pr = _nkPlayerRect();
    if (!pr) return false;
    _enHitCd = now + EN_HIT_CD_MS;
    const dealt = _nkHit(pct, 'lightning', level);
    _nkAbilityHitToast(dealt, 'The Encore', label);
    return true;
}

// Confetti burst where the show lands a beat (visual only, body-level so it
// survives the run ending in the same frame).
export function _enConfetti(x, y, big) {
    const layer = document.createElement('div');
    layer.className = 'sx-en-confetti' + (big ? ' sx-en-confetti-big' : '');
    layer.style.left = Math.round(x) + 'px';
    layer.style.top = Math.round(y) + 'px';
    document.body.appendChild(layer);
    const colors = ['#fbbf24', '#f472b6', '#a78bfa', '#4ade80', '#e2e8f0'];
    for (let i = 0; i < (big ? 12 : 7); i++) {
        const s = document.createElement('div');
        s.className = 'sx-en-conf';
        s.style.background = colors[i % colors.length];
        const ang = Math.random() * Math.PI * 2;
        const dist = 24 + Math.random() * (big ? 90 : 55);
        s.style.setProperty('--dx', Math.round(Math.cos(ang) * dist) + 'px');
        s.style.setProperty('--dy', Math.round(Math.sin(ang) * dist - 30) + 'px');
        s.style.setProperty('--rot', Math.round((Math.random() * 2 - 1) * 540) + 'deg');
        s.style.animationDelay = (Math.random() * 120) + 'ms';
        layer.appendChild(s);
    }
    setTimeout(() => { try { layer.remove(); } catch (e) {} }, _EN_DEBUG_SLOW ? 1800 : 1000);
}

// One applause nova: an expanding gold ring from (x, y). Visual only -
// damage is rolled by the caller at the beat the ring launches.
export function _enApplause(x, y, big) {
    const ring = document.createElement('div');
    ring.className = 'sx-en-applause' + (big ? ' sx-en-applause-big' : '');
    ring.style.left = Math.round(x) + 'px';
    ring.style.top = Math.round(y) + 'px';
    document.body.appendChild(ring);
    setTimeout(() => { try { ring.remove(); } catch (e) {} }, big ? 1600 : 950);
}


//------------------------------------------------------------------------
//-------------------MECHANIC: ENCORE CIRCLES-------------------------------
//------------------------------------------------------------------------
// The signature inversion: gold rings close in on marked spots - be INSIDE
// the circle the moment each ring lands. Rings land sequentially with a
// stagger. Phase 2 throws a fourth, phase 3 a fifth, all faster.
export const EN_CIRCLE_STAGGER_MS = 900;

export function _mechEnEncoreCircles(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const rings = [0, 3, 4, 5][p];
    const closeMs = [0, 1800, 1600, 1400][p] * _EN_DEBUG_MULT;
    const radius = 70;
    const dmgPct = EN_CIRCLE_DMG[p];
    const run = _nkNewRun(monster && monster.id, true);

    const pts = [];
    let guard = 0;
    while (pts.length < rings && guard++ < 80) {
        const x = 110 + Math.random() * Math.max(60, window.innerWidth - 220);
        const y = 130 + Math.random() * Math.max(60, window.innerHeight - 260);
        if (pts.every(q => Math.hypot(q.x - x, q.y - y) > 260)) pts.push({ x, y });
    }

    _nkToast('eg_mech_encore', '🎵 The Encore: Encore Circles! Be inside when the ring lands!', '#fbbf24');

    const queue = pts.map((q, i) => {
        const spot = _nkEl(run, 'div', 'sx-en-spot');
        spot.style.left = Math.round(q.x - radius) + 'px';
        spot.style.top = Math.round(q.y - radius) + 'px';
        spot.style.width = radius * 2 + 'px';
        spot.style.height = radius * 2 + 'px';
        const ring = _nkEl(run, 'div', 'sx-en-ring');
        return { x: q.x, y: q.y, t: -i * EN_CIRCLE_STAGGER_MS * _EN_DEBUG_MULT, judged: false, spot, ring };
    });

    _nkLoop(run, (dtS) => {
        let pending = false;
        queue.forEach(r => {
            if (r.judged) return;
            pending = true;
            r.t += dtS * 1000;
            if (r.t < 0) return;
            const f = Math.min(1, r.t / closeMs);
            const rr = Math.max(radius, Math.round(260 - (260 - radius) * f));
            r.ring.style.left = Math.round(r.x - rr) + 'px';
            r.ring.style.top = Math.round(r.y - rr) + 'px';
            r.ring.style.width = rr * 2 + 'px';
            r.ring.style.height = rr * 2 + 'px';
            if (f >= 1) {
                r.judged = true;
                r.ring.remove();
                const c = _nkPlayerCenter();
                if (c && Math.hypot(c.x - r.x, c.y - r.y) <= radius + 10) {
                    r.spot.classList.add('sx-en-land-ok');
                    _nkToast('eg_blast_dodged', '✅ Perfect!', '#4ade80');
                } else {
                    r.spot.classList.add('sx-en-land-hit');
                    const dealt = _nkHit(dmgPct, 'lightning', level);
                    _nkAbilityHitToast(dealt, 'The Encore', 'Encore Circles');
                }
                const el = r.spot;
                setTimeout(() => { try { el.remove(); } catch (e) {} }, 500);
            }
        });
        return pending;
    });
}


//------------------------------------------------------------------------
//-------------------MECHANIC: SOUND BARS-----------------------------------
//------------------------------------------------------------------------
// Equalizer lanes telegraph on the floor, then slam UP as solid sound bars
// that hold a beat before retracting. Bars anchor to the floor under the
// player's feet, so the dodge is lateral: OUT of the lane. Phase 2 throws
// three, phase 3 four, all faster.
export const EN_BAR_W = 88;

export function _mechEnSoundBars(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const level = monster ? monster.level : 1;
    const run = _nkNewRun(monster && monster.id, true);
    const W = window.innerWidth, H = window.innerHeight;
    const count = [0, 2, 3, 4][p];
    const warnMs = 1300 * _EN_DEBUG_MULT;
    const riseMs = 260 * _EN_DEBUG_MULT;
    const holdMs = 700 * _EN_DEBUG_MULT;
    // Bars rise from the floor at the player's feet so the lane always bites.
    const pr0 = _nkPlayerRect();
    const floorY = pr0 ? pr0.bottom + 6 : H;
    const barH = Math.round(Math.min(H, [0, 0.52, 0.58, 0.64][p] * H + 120));
    const dmgPct = EN_EQ_DMG[p];

    const lanes = [];
    let guard = 0;
    while (lanes.length < count && guard++ < 60) {
        const x = 130 + Math.random() * Math.max(80, W - 260);
        if (lanes.every(l => Math.abs(l - x) > 210)) lanes.push(x);
    }

    _nkToast('eg_mech_en_bars', '🎵 The Encore: EQ SLAM - out of the lane!', '#e2e8f0');

    const bars = lanes.map(x => {
        const warn = _nkEl(run, 'div', 'sx-en-eqwarn');
        warn.style.left = Math.round(x - EN_BAR_W / 2) + 'px';
        warn.style.top = Math.round(floorY - barH) + 'px';
        warn.style.width = EN_BAR_W + 'px';
        warn.style.height = barH + 'px';
        return { x, warn, bar: null, up: false };
    });

    let t = 0, touchCd = 0, retracting = false;
    _nkLoop(run, (dtS, now) => {
        t += dtS * 1000;
        if (t >= warnMs && !retracting) {
            bars.forEach(b => {
                if (b.up) return;
                b.up = true;
                b.bar = _nkEl(run, 'div', 'sx-en-eq');
                b.bar.style.left = Math.round(b.x - EN_BAR_W / 2) + 'px';
                b.bar.style.top = Math.round(floorY - barH) + 'px';
                b.bar.style.width = EN_BAR_W + 'px';
                b.bar.style.height = '0px';
                b.bar.style.transformOrigin = 'bottom';
                b.bar.style.transition = 'height ' + (riseMs / 1000) + 's ease-out';
                const el = b.bar;
                requestAnimationFrame(() => { el.style.height = barH + 'px'; });
                try { b.warn.remove(); } catch (e) {}
            });
        }
        // Contact while any bar is up (rise + hold): lane overlap bites.
        if (t >= warnMs && t < warnMs + riseMs + holdMs) {
            const pr = _nkPlayerRect();
            if (pr && now >= touchCd) {
                const inLane = bars.some(b =>
                    b.bar && Math.abs(pr.left + pr.width / 2 - b.x) < EN_BAR_W / 2 + 14);
                if (inLane) {
                    touchCd = now + EN_HIT_CD_MS;
                    _enTouch(dmgPct, level, 'EQ Bar');
                }
            }
        }
        if (t >= warnMs + riseMs + holdMs && !retracting) {
            retracting = true;
            bars.forEach(b => {
                if (!b.bar) return;
                b.bar.classList.add('sx-en-eq-retract');
                const el = b.bar; b.bar = null;
                setTimeout(() => { try { el.remove(); } catch (e) {} }, 450);
            });
        }
        return t < warnMs + riseMs + holdMs + 500;
    });
}


//------------------------------------------------------------------------
//-------------------MECHANIC: STAGE LIGHTS (phase 2+)----------------------
//------------------------------------------------------------------------
// Spotlights drift after the player like a chasing rig, then LOCK (ring
// hardens) - a beat later they flash and burn everyone still inside.
// Phase 2 runs one light; phase 3 staggers two so the locks desync.
export const EN_LIGHT_TRACK_MS = 1500;
export const EN_LIGHT_LOCK_MS  = 600;
export const EN_LIGHT_BLAST_R  = 95;

export function _mechEnStageLights(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(2, Math.min(3, Number(phase) || 2));
    const level = monster ? monster.level : 1;
    const run = _nkNewRun(monster && monster.id, true);
    const trackMs = EN_LIGHT_TRACK_MS * _EN_DEBUG_MULT;
    const lockMs = EN_LIGHT_LOCK_MS * _EN_DEBUG_MULT;
    const dmgPct = EN_SPOT_DMG[p];
    const count = [0, 0, 1, 2][p];

    _nkToast('eg_mech_en_spot', '🎵 The Encore: STAGE LIGHTS - out of the lock!', '#fbbf24');

    const lights = [];
    for (let i = 0; i < count; i++) {
        const c = _nkPlayerCenter() || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        const el = _nkEl(run, 'div', 'sx-en-light');
        el.style.left = Math.round(c.x) + 'px';
        el.style.top = Math.round(c.y) + 'px';
        lights.push({ el, x: c.x, y: c.y, t: -i * 900 * _EN_DEBUG_MULT, locked: false, blasted: false });
    }

    let touchCd = 0;
    _nkLoop(run, (dtS, now) => {
        let pending = false;
        lights.forEach(L => {
            if (L.blasted) return;
            pending = true;
            L.t += dtS * 1000;
            if (L.t < 0) return;
            if (L.t < trackMs) {
                // Track: drift toward the player's current position.
                const c = _nkPlayerCenter();
                if (c) { L.x += (c.x - L.x) * 0.14; L.y += (c.y - L.y) * 0.14; }
                L.el.style.left = Math.round(L.x) + 'px';
                L.el.style.top = Math.round(L.y) + 'px';
                return;
            }
            if (!L.locked) {
                L.locked = true;
                L.el.classList.add('sx-en-light-locked');
            }
            if (L.t >= trackMs + lockMs) {
                L.blasted = true;
                L.el.classList.add('sx-en-light-blast');
                _enConfetti(L.x, L.y, false);
                const c = _nkPlayerCenter();
                if (c && now >= touchCd && Math.hypot(c.x - L.x, c.y - L.y) <= EN_LIGHT_BLAST_R + 14) {
                    touchCd = now + EN_HIT_CD_MS;
                    _enTouch(dmgPct, level, 'Stage Light');
                }
                const el = L.el;
                setTimeout(() => { try { el.remove(); } catch (e) {} }, 450);
            }
        });
        return pending;
    });
}


//------------------------------------------------------------------------
//-------------------MECHANIC: BEAT MINES (field, passive)------------------
//------------------------------------------------------------------------
// Mines pulse on the beat like metronomes, then pop one after another in
// sequence with small novas. The run is PASSIVE (field hazard - never
// blocks other mechanics).
export const EN_MINE_COUNT  = [0, 0, 4, 6];
export const EN_MINE_BEAT_MS = 550;
export const EN_MINE_STAGGER_MS = 260;
export const EN_MINE_POP_BEATS = 4;
export const EN_MINE_NOVA_R = 110;

export function _mechEnBeatMines(monster, phase) {
    if (_nkFrozen()) return;
    const p = Math.max(2, Math.min(3, Number(phase) || 2));
    const level = monster ? monster.level : 1;
    const run = _nkNewRun(monster && monster.id, true);
    run.passive = true;
    const W = window.innerWidth, H = window.innerHeight;
    const count = EN_MINE_COUNT[p];
    const beatMs = EN_MINE_BEAT_MS * _EN_DEBUG_MULT;
    const popBase = beatMs * EN_MINE_POP_BEATS;
    const stagger = EN_MINE_STAGGER_MS * _EN_DEBUG_MULT;
    const dmgPct = EN_MINE_DMG[p];

    _nkToast('eg_mech_en_mines', '🎵 The Encore: BEAT MINES popping - mind the rhythm!', '#fbbf24');

    const mines = [];
    let guard = 0;
    while (mines.length < count && guard++ < 80) {
        const x = 100 + Math.random() * Math.max(60, W - 200);
        const y = 120 + Math.random() * Math.max(60, H - 240);
        if (mines.every(m => Math.hypot(m.x - x, m.y - y) > 180)) {
            const el = _nkEl(run, 'div', 'sx-en-mine');
            el.style.left = Math.round(x) + 'px';
            el.style.top = Math.round(y) + 'px';
            el.style.animationDuration = (EN_MINE_BEAT_MS / 1000 * _EN_DEBUG_MULT) + 's';
            mines.push({ x, y, el, popAt: popBase + mines.length * stagger, popped: false });
        }
    }

    let t = 0, touchCd = 0;
    _nkLoop(run, (dtS, now) => {
        t += dtS * 1000;
        mines.forEach(m => {
            if (m.popped || t < m.popAt) return;
            m.popped = true;
            try { m.el.remove(); } catch (e) {}
            const nova = _nkEl(run, 'div', 'sx-en-mine-pop');
            nova.style.left = Math.round(m.x) + 'px';
            nova.style.top = Math.round(m.y) + 'px';
            _enConfetti(m.x, m.y, false);
            const c = _nkPlayerCenter();
            if (c && now >= touchCd && Math.hypot(c.x - m.x, c.y - m.y) <= EN_MINE_NOVA_R + 12) {
                touchCd = now + EN_HIT_CD_MS;
                _enTouch(dmgPct, level, 'Beat Mine');
            }
            const el = nova;
            setTimeout(() => { try { el.remove(); } catch (e) {} }, 550);
        });
        return mines.some(m => !m.popped) || t < popBase + count * stagger + 600;
    });
}


//------------------------------------------------------------------------
//-------------------♪♪… CURTAIN CALL (≤10% HP one-shot finale)-------------
//------------------------------------------------------------------------
// The boss goes immune + shielded and TAKES A BOW while the house goes
// dark and a single spotlight plays MUSICAL CHAIRS: on every metronome
// beat the current light erupts in an applause nova (everyone outside is
// clipped), then the light JUMPS somewhere new. At zero: THE OVATION - a
// white-out flash and a triple applause nova; only the final spotlight
// circle is safe. Charge bar frozen for the whole set-piece (gate in
// _tickPlayer via _enFinalActive).
export const EN_FINAL_TICK_MS = 1200;
export const EN_FINAL_TICKS = 3;
export const EN_FINAL_SPOT_R = 150;   // safe spotlight radius, px

// Set while the finale runs (read by _tickPlayer's charge-freeze gate).
export let _enFinal = null;

export function _enFinalActive() {
    return !!_enFinal && !_enFinal.finished;
}

// Phase-enter hook: starts the ≤10% HP watcher (the framework only calls
// onPhaseEnter on transitions, so a dive from 30% → 10% needs its own gate).
export function _enOnPhaseEnter(monster, newPhase) {
    if (newPhase !== 3) return false;
    try { _enStartFinalWatcher(monster); } catch (e) {}
    return false;
}

export function _enStartFinalWatcher(monster) {
    if (!monster || _enFinal) return;
    const run = _nkNewRun(monster.id, true);
    run.passive = true;
    _nkLoop(run, () => {
        if (_enFinal) return false;
        try {
            if (monster.currentHP <= monster.maxHP * 0.10) {
                _enFinalStart(monster);
                return false;
            }
        } catch (e) { return false; }
        return true;
    });
}

// Random spotlight position (centre coords), at least 340px from the last
// one so every jump is a real chase.
export function _enPlaceSpotlight(g, spot, prev) {
    const W = window.innerWidth, H = window.innerHeight;
    const m = 190;
    let x = 0, y = 0, guard = 0;
    do {
        x = m + Math.random() * Math.max(60, W - m * 2);
        y = m + 40 + Math.random() * Math.max(60, H - m * 2 - 80);
        guard++;
    } while (prev && Math.hypot(x - prev.x, y - prev.y) < 340 && guard < 40);
    g.sx = x; g.sy = y;
    spot.style.left = Math.round(x) + 'px';
    spot.style.top = Math.round(y) + 'px';
}

export function _enFinalStart(monster) {
    if (_enFinal || !monster) return;

    // The house goes quiet: kill every other run of this boss.
    Array.from(_nkRuns.values()).forEach(r => {
        if (r.bossId === monster.id) { try { _nkKillRun(r); } catch (e) {} }
    });

    const g = {
        monsterId: monster.id,
        finished: false,
        count: EN_FINAL_TICKS,
        sx: 0, sy: 0,
        spotR: EN_FINAL_SPOT_R,
        blackout: null,
        spotlight: null,
        overlay: null,
        run: null,
        cdTimer: null,
    };
    _enFinal = g;

    // Freeze the auto-attack charge bar for the whole set-piece (the gate
    // lives in _tickPlayer; this class is the visual twin).
    ['avatar-charge-fill', 'sx-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('sx-charge-paused');
    });

    // House lights down.
    const bo = document.createElement('div');
    bo.className = 'sx-en-blackout';
    document.body.appendChild(bo);
    g.blackout = bo;
    requestAnimationFrame(() => bo.classList.add('sx-en-blackout-on'));

    // The one safe light. First placement is instant; jumps transition.
    const spot = document.createElement('div');
    spot.className = 'sx-en-spotlight';
    spot.style.width = (EN_FINAL_SPOT_R * 2) + 'px';
    spot.style.height = (EN_FINAL_SPOT_R * 2) + 'px';
    _enPlaceSpotlight(g, spot, null);
    document.body.appendChild(spot);
    g.spotlight = spot;
    const jumpS = _EN_DEBUG_SLOW ? 1.2 : 0.4;
    spot.style.transition = 'left ' + jumpS + 's cubic-bezier(.2,.8,.3,1), top ' + jumpS + 's cubic-bezier(.2,.8,.3,1)';

    // Boss takes a bow: the card rocks like a showman milking the applause.
    const card = document.getElementById('sx-card-' + monster.id);
    const wrap = card ? (card.querySelector('.sx-emoji-wrapper') || card) : null;
    if (wrap) {
        wrap.classList.add('sx-en-bowing');
        wrap.classList.add('sx-nk-shielded');
    }

    // Metronome overlay.
    const ov = document.createElement('div');
    ov.className = 'sx-en-cd';
    ov.innerHTML =
        '<div class="sx-en-cd-label">🎵 CURTAIN CALL</div>' +
        '<div class="sx-en-cd-num sx-bmb-cd-pop">' + g.count + '</div>' +
        '<div class="sx-en-cd-hint">Musical chairs - be INSIDE the spotlight when each beat drops!</div>';
    document.body.appendChild(ov);
    g.overlay = ov;

    _nkToast('eg_mech_en_final_cd', '🎵💀 CURTAIN CALL - follow the spotlight!', '#e2e8f0');

    // Boss immunity so the set-piece reads as a performance (released at the end).
    monster.bossImmune = true;

    // Metronome: each beat, the current light erupts (everyone outside is
    // clipped), the count ticks, and the light JUMPS before the next beat.
    // Pause / death / inactive hold the count (debug: extra-long beats).
    const cdTick = EN_FINAL_TICK_MS * (_EN_DEBUG_SLOW ? 8 : 1);
    g.cdTimer = setInterval(() => {
        if (!_enFinal || _enFinal !== g || g.finished) return;
        if (_nkFrozen()) return;
        // Beat: erupt from the CURRENT spotlight - the one you were told to reach.
        _enApplause(g.sx, g.sy, false);
        const pr = _nkPlayerRect();
        if (pr) {
            const px = pr.left + pr.width / 2, py = pr.top + pr.height / 2;
            if (Math.hypot(px - g.sx, py - g.sy) > g.spotR + 12) {
                _enTouch(EN_TICK_DMG, monster.level, 'CURTAIN CALL');
            }
        }
        g.count--;
        if (g.count <= 0) {
            clearInterval(g.cdTimer);
            g.cdTimer = null;
            try { g.overlay.remove(); } catch (e) {}
            g.overlay = null;
            _enFinalBang(g, monster);
            return;
        }
        // Jump the light BEFORE the next beat (musical chairs).
        _enPlaceSpotlight(g, spot, { x: g.sx, y: g.sy });
        const num = g.overlay && g.overlay.querySelector('.sx-en-cd-num');
        if (num) {
            num.textContent = g.count;
            num.classList.remove('sx-bmb-cd-pop');
            void num.offsetWidth;
            num.classList.add('sx-bmb-cd-pop');
        }
    }, cdTick);
}

// THE OVATION: white-out flash, triple applause nova from the final
// spotlight. Everyone OUTSIDE that final circle takes the big hit.
export function _enFinalBang(g, monster) {
    const level = monster ? monster.level : 1;
    const run = _nkNewRun(g.monsterId, true);
    g.run = run;
    run.onKill = () => { if (_enFinal === g) { try { _enFinalEnd(g); } catch (e) {} } };

    _nkToast('eg_mech_en_final_bang', '🎵💀 THE OVATION!', '#e2e8f0');

    // Screen flash at the moment of the ovation.
    document.body.classList.add('sx-en-flash');
    setTimeout(() => document.body.classList.remove('sx-en-flash'), 700);

    // Triple applause nova from the final spotlight (big first ring leads).
    [0, 140, 280].forEach((d, i) => {
        const id = setTimeout(() => _enApplause(g.sx, g.sy, i === 0), d);
        run.timers.push(id);
    });
    _enConfetti(g.sx, g.sy, true);

    // Everyone outside the final spotlight takes the OVATION.
    const pr = _nkPlayerRect();
    if (pr) {
        const px = pr.left + pr.width / 2, py = pr.top + pr.height / 2;
        if (Math.hypot(px - g.sx, py - g.sy) > g.spotR + 12) {
            const dealt = _nkHit(EN_FINAL_DMG, 'lightning', level);
            _nkAbilityHitToast(dealt, 'The Encore', 'THE OVATION');
        }
    }

    // Lights up shortly after (debug: linger long enough to be captured).
    const id2 = setTimeout(() => _enFinalEnd(g), _EN_DEBUG_SLOW ? 7000 : 1400);
    run.timers.push(id2);
}

export function _enFinalEnd(g) {
    if (!g || g.finished) return;
    g.finished = true;
    if (g.cdTimer) { clearInterval(g.cdTimer); g.cdTimer = null; }
    if (g.overlay) { try { g.overlay.remove(); } catch (e) {} g.overlay = null; }
    if (g.blackout) { try { g.blackout.remove(); } catch (e) {} g.blackout = null; }
    if (g.spotlight) { try { g.spotlight.remove(); } catch (e) {} g.spotlight = null; }
    if (g.run) { try { _nkKillRun(g.run); } catch (e) {} g.run = null; }
    ['avatar-charge-fill', 'sx-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('sx-charge-paused');
    });
    document.body.classList.remove('sx-en-flash');
    document.querySelectorAll('.sx-en-bowing').forEach(el => el.classList.remove('sx-en-bowing'));

    const m = (g.monsterId && typeof _monsters !== 'undefined')
        ? globalThis._monsters.find(x => x && x.id === g.monsterId) : null;
    if (m && m.bossImmune) {
        m.bossImmune = false;
        if (typeof _bossScheduleMechanics === 'function') {
            try { _bossScheduleMechanics(m, 3); } catch (e) {}
        }
        if (typeof _renderPanel === 'function') { try { _renderPanel(); } catch (e) {} }
    }
    if (_enFinal === g) _enFinal = null;
}


//------------------------------------------------------------------------
//-------------------TEARDOWN-----------------------------------------------
//------------------------------------------------------------------------
// Called from _bossCleanup on boss death AND from the encounter stop -
// removes every run element, overlay and body class this boss ever created.
export function _enTeardown() {
    if (_enFinal) { try { _enFinalEnd(_enFinal); } catch (e) {} _enFinal = null; }
    document.querySelectorAll('.sx-en-spot, .sx-en-ring, .sx-en-eqwarn, .sx-en-eq, ' +
        '.sx-en-light, .sx-en-mine, .sx-en-mine-pop, .sx-en-applause, .sx-en-confetti, ' +
        '.sx-en-blackout, .sx-en-spotlight, .sx-en-cd').forEach(el => {
        try { el.remove(); } catch (e) {}
    });
    document.body.classList.remove('sx-en-flash');
    document.querySelectorAll('.sx-en-bowing').forEach(el => el.classList.remove('sx-en-bowing'));
    ['avatar-charge-fill', 'sx-player-charge-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('sx-charge-paused');
    });
}


//------------------------------------------------------------------------
//-------------------PLAYTEST CONSOLE HOOK (dev only)----------------------
//------------------------------------------------------------------------
// Tiny console API for playtesting with stretched debug timings:
//   _EN_DEBUG.fire('circles'|'bars'|'spot'|'mines') - runs one now
//   _EN_DEBUG.final()                               - CURTAIN CALL now
if (typeof window !== 'undefined') {
    window._EN_DEBUG = {
        fire: (name, phase) => {
            const monster = (typeof _monsters !== 'undefined')
                ? globalThis._monsters.find(m => m && m.baseId === 'boss_encore') : null;
            if (!monster) return 'no encore alive';
            const fn = name === 'circles' ? _mechEnEncoreCircles
                : name === 'bars' ? _mechEnSoundBars
                : name === 'spot' ? _mechEnStageLights
                : name === 'mines' ? _mechEnBeatMines : null;
            if (!fn) return 'unknown: ' + name;
            if (name !== 'mines' && _nkDodgeBusy()) return 'BLOCKED: dodge-busy (wait for the field to clear)';
            fn(monster, phase || monster.bossPhase || 1);
            return 'fired ' + name;
        },
        final: () => {
            const monster = (typeof _monsters !== 'undefined')
                ? globalThis._monsters.find(m => m && m.baseId === 'boss_encore') : null;
            if (!monster) return 'no encore alive';
            _enFinalStart(monster);
            return 'CURTAIN CALL started';
        },
    };
}
