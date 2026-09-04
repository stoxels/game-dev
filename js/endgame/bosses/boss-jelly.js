//------------------------------------------------------------------------
//-------------------BOSS: THE JELLY (boss_jelly)-------------------------------
//------------------------------------------------------------------------
// Dragon-Quest homage and first-steps fight — a cold-element blob boss
// that teaches dodging hop shadows. The fight has three acts:
//   Phase 1 (100–50%): Jelly Hops — the classic chained hop attack. The
//     Jelly telegraphs slow hops toward where you stand. Watch the shadow,
//     leave before it lands.
//   Phase 2 (50–20%): ICE SHELL. At 50% the Jelly hardens behind a green
//     immunity shield — projectiles and auto attacks deal nothing. The
//     floor ices over while the Jelly lobs single hop blobs at you. Lure a
//     hop blob onto an icy cell: it slips on the frost and jumps straight
//     into the Jelly, shattering the shell so the fight can continue.
//   Phase 3 (≤20%): JELLY ARMY. The Jelly erupts: ten hop blobs pour out in
//     a row (short delay between spawns) and each leaps at the player with
//     the usual hop-blob mechanic. Dodge as many shadows as you can.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule + onPhaseEnter)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_jelly: {
        id: 'boss_jelly', name: 'The Jelly', emoji: '🟢',
        baseHP: 880, baseDamage: 20, chargeMax: 13,
        element: 'cold', resistances: { fire: 15, cold: 30, lightning: 15, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    // boss_jelly — "The Jelly"
    // The phase thresholds double as the fight's signature moments:
    //   ≤50% HP enters the Ice Shell immunity gate (held until a hop blob
    //   slips on ice — see _egJellyOnPhaseEnter) and ≤20% triggers the
    //   one-shot Jelly Army wave.
    boss_jelly: {
        phases: [
            { threshold: 1.00, chargeMax: 13, damageMultiplier: 1.00 },
            { threshold: 0.50, chargeMax: 10, damageMultiplier: 1.35 },
            { threshold: 0.20, chargeMax: 8, damageMultiplier: 1.75 },
        ],
        immunityDuration: 2000,
        mechanics: [
            { name: 'jelly_hops', intervalBase: 18000, intervalVariance: 4000, handler: '_egMechJellyHops' },
            { name: 'probability_shift', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechProbabilityShift' },
        ],
        // Phase-enter hook — see _egJellyOnPhaseEnter below.
        onPhaseEnter: _egJellyOnPhaseEnter,
    },
});


// ── Shared hop-blob tuning ──────────────────────────────────────────────────
const EG_JELLY_HOP_ARC_PX = 90;           // arc height of a hop flight
const EG_JELLY_SLIP_TO_BOSS_MS = 750;     // glide duration once a blob slips on ice
const EG_JELLY_SLIP_ARC_PX = 70;          // second small arc of the slip launch

// Ice Shell (P2) knobs. Times are run-clock ms — dodge runs run on the
// tier-scaled clock (gentler on tier 1, see _egNkNewRun), so these feel
// the same on every boss tier.
const EG_JELLY_GATE_DMG_PCT = 0.12;       // damage when a shell-phase blob lands on you
const EG_JELLY_GATE_REST_MS = 1100;       // blob squishes in place before it locks a target
const EG_JELLY_GATE_WARN_MS = 950;        // shadow telegraph + flight duration
const EG_JELLY_GATE_RADIUS = 60;          // mark radius + landing hitbox
const EG_JELLY_GATE_FIRST_BLOB_MS = 2600; // first blob after the shell goes up
const EG_JELLY_GATE_BLOB_GAP_MS = [3600, 5200]; // gap between blobs after one resolves
const EG_JELLY_ICE_TARGET = 3;            // icy cells kept on the floor while shielded
const EG_JELLY_ICE_LIFETIME_MS = 15000;   // before a patch of ice melts
const EG_JELLY_ICE_REFILL_MS = [2200, 3400];    // delay before re-icing under target

// Jelly Army (P3) knobs
const EG_JELLY_ARMY_COUNT = 10;           // blobs spawned per army
const EG_JELLY_ARMY_STAGGER_MS = 780;     // delay between consecutive spawns
const EG_JELLY_ARMY_DMG_PCT = 0.085;      // per-blob damage when one lands on you
const EG_JELLY_ARMY_REST_MS = 420;        // blob readies itself before targeting
const EG_JELLY_ARMY_WARN_MS = 850;        // shadow telegraph + flight duration
const EG_JELLY_ARMY_RADIUS = 46;          // tighter mark/hitbox — a weave, not a single jump


// ── Module-level state ──────────────────────────────────────────────────────
// One jelly fight at a time. Both fields are torn down through their run's
// onKill (boss death / encounter stop) or by their own completion paths.
let _egJellyGate = null; // { monsterId, run, ice: Map, bubble, blob, blobAt, refillAt, pruneAt }
let _egJellyArmy = null; // { run, blobs: [], spawned, nextSpawnAt, monsterId }


// Small helpers ---------------------------------------------------------------

function _egJellyRand(range) {
    return range[0] + Math.random() * (range[1] - range[0]);
}


// Finds the live monster behind a jelly run (boss may be re-identified).
function _egJellyMonsterById(id) {
    if (!id || typeof _egMonsters === 'undefined') return null;
    return _egMonsters.find(m => m.id === id) || null;
}


// Centre of the boss card on screen (falls back to a mid-screen point).
function _egJellyBossCenter(monster) {
    const id = monster && monster.id;
    if (!id) return null;
    const card = document.getElementById('eg-card-' + id);
    const wrap = card ? card.querySelector('.eg-emoji-wrapper') : null;
    const el = wrap || card;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) return null;
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}


// ── Hop blob state machine ──────────────────────────────────────────────────
// One blob = one hop: it spawns at (x, y), squishes in place for restMs, then
// a shadow mark locks onto the player's CURRENT position, and after warnMs it
// hops there in an arc. Step it from a _egNkLoop tick via _egJellyStepBlob.
// slipOk (Ice Shell blobs): if the blob lands ON an icy cell it slips on the
// frost and launches itself at the boss instead of striking the player.
function _egJellySpawnBlob(run, monster, x, y, restMs, warnMs, radius, dmgPct) {
    const body = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-jelly', '🟢');
    body.style.transform = 'translate(' + Math.round(x - 22) + 'px,' + Math.round(y - 22) + 'px)';
    const mark = _egNkEl(run, 'div', 'eg-nk-mark');
    mark.style.display = 'none';
    return {
        body, mark,
        x, y, tx: 0, ty: 0,
        restMs, warnMs, radius, dmgPct,
        mode: 'rest', t: 0,
        ability: 'Hop Blob',
        monsterId: monster ? monster.id : null,
        level: monster ? monster.level : 1,
        slipDone: false, gone: false,
    };
}


// Advances one blob by dtMs (run-scaled). Returns true while the blob still
// needs stepping, false once it resolved (landed, slipped or removed).
function _egJellyStepBlob(b, dtMs, slipOk) {
    if (b.gone) return false;
    b.t += dtMs;

    if (b.mode === 'rest') {
        if (b.t >= b.restMs) {
            b.mode = 'warn';
            b.t = 0;
            const c = _egNkPlayerCenter();
            b.tx = c ? c.x : window.innerWidth / 2;
            b.ty = c ? c.y : window.innerHeight / 2;
            b.mark.style.display = '';
            b.mark.style.width = (b.radius * 2) + 'px';
            b.mark.style.height = (b.radius * 2) + 'px';
            b.mark.style.left = Math.round(b.tx - b.radius) + 'px';
            b.mark.style.top = Math.round(b.ty - b.radius) + 'px';
            // Shell blobs only: the moment the hop locks, every icy patch
            // pulses so the "ice = where it breaks" cue is unmistakable.
            if (slipOk) _egJellyBlobLockedCue();
        }
        return true;
    }

    if (b.mode === 'warn') {
        if (b.t >= b.warnMs) { b.mode = 'fly'; b.t = 0; }
        return true;
    }

    if (b.mode === 'fly') {
        const f = Math.min(1, b.t / b.warnMs);
        const bx = b.x + (b.tx - b.x) * f;
        const by = b.y + (b.ty - b.y) * f - Math.sin(f * Math.PI) * EG_JELLY_HOP_ARC_PX;
        b.body.style.transform = 'translate(' + Math.round(bx - 22) + 'px,' + Math.round(by - 22) + 'px)';
        if (f >= 1) {
            b.x = b.tx;
            b.y = b.ty;
            b.mark.classList.add('eg-nk-mark-hit');
            setTimeout(() => { try { b.mark.remove(); } catch (e) {} }, 450);
            // Landed on ice → the blob slips and leaps into The Jelly.
            if (slipOk && _egJellyIceContains(b.tx, b.ty)) {
                b.mode = 'slip';
                b.t = 0;
                b.body.classList.add('eg-nk-jelly-slip');
                const target = _egJellyBossCenter(_egJellyMonsterById(b.monsterId));
                b.slipX = target ? target.x : window.innerWidth / 2;
                b.slipY = target ? target.y : window.innerHeight * 0.2;
                return true;
            }
            b.gone = true;
            b.body.remove();
            if (_egNkCircleHit(b.tx, b.ty, b.radius, _egNkPlayerRect(), 0)) {
                const dealt = _egNkHit(b.dmgPct, 'cold', b.level);
                _egNkAbilityHitToast(dealt, 'The Jelly', b.ability);
            }
            return false;
        }
        return true;
    }

    if (b.mode === 'slip') {
        const f = Math.min(1, b.t / EG_JELLY_SLIP_TO_BOSS_MS);
        const sx = b.x + (b.slipX - b.x) * f;
        const sy = b.y + (b.slipY - b.y) * f - Math.sin(f * Math.PI) * EG_JELLY_SLIP_ARC_PX;
        b.body.style.transform = 'translate(' + Math.round(sx - 22) + 'px,' + Math.round(sy - 22) + 'px)';
        if (f >= 1) {
            b.slipDone = true;
            b.gone = true;
            b.body.remove();
        }
        return true;
    }

    return false;
}


// ── Ice on the ground (Ice Shell) ───────────────────────────────────────────
// While the shell is up the Jelly ices random EMPTY grid cells — purely
// visual floor patches (cells stay fully playable). A hop blob that lands on
// one slips. Ice melts on a timer and is topped back up so the player always
// has a patch to lure a blob onto.

function _egJellyIcePickTargets(gate, count) {
    if (!cur || !cur.grid || typeof userGrid === 'undefined') return [];
    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;
    const clean = [];   // untouched cells — ideal ice spots
    const any = [];     // fallback so a solved grid can never soft-lock the shell
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (gate.ice.has(r + '-' + c)) continue;
            if (userGrid[r][c] === 0
                && (typeof revealedGrid === 'undefined' || !revealedGrid[r][c])) clean.push([r, c]);
            else any.push([r, c]);
        }
    }
    const shuffle = (arr) => {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
        }
        return arr;
    };
    return shuffle(clean).concat(shuffle(any)).slice(0, Math.max(0, count));
}


function _egJellyTopUpIce(gate, count) {
    if (!gate || !count || count <= 0) return;
    _egJellyIcePickTargets(gate, count).forEach(([r, c]) => {
        const cell = document.getElementById('g-' + r + '-' + c);
        if (!cell) return;
        const key = r + '-' + c;
        if (gate.ice.has(key)) return;
        const ov = document.createElement('span');
        ov.className = 'eg-jelly-ice';
        ov.textContent = '❄️';
        ov.style.fontSize = Math.max(7, Math.min(11, Math.round(cell.offsetWidth * 0.26))) + 'px';
        cell.appendChild(ov);
        gate.ice.set(key, { el: ov, r, c, remain: EG_JELLY_ICE_LIFETIME_MS });
    });
}


// Melts expired patches and decrements the rest (called on a short cadence).
function _egJellyPruneIce(gate, dtMs) {
    if (!gate) return;
    gate.ice.forEach((entry, key) => {
        entry.remain -= dtMs;
        if (entry.remain <= 0) {
            try { entry.el.remove(); } catch (e) {}
            gate.ice.delete(key);
        }
    });
}


// Finds the icy patch (if any) sitting under the point (x, y) — with
// forgiving padding so a blob landing at a cell's edge still slips.
function _egJellyIceAt(x, y) {
    const g = _egJellyGate;
    if (!g || g.ice.size === 0) return null;
    const pad = 8;
    let found = null;
    g.ice.forEach(entry => {
        if (found) return;
        const cell = document.getElementById('g-' + entry.r + '-' + entry.c);
        if (!cell || !cell.isConnected) return;
        const r = cell.getBoundingClientRect();
        if (x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad) found = entry;
    });
    return found;
}


// True when the point (x, y) sits on an icy cell (with forgiving padding).
function _egJellyIceContains(x, y) {
    return !!_egJellyIceAt(x, y);
}


// Removes the green hold-spot marker from every icy patch.
function _egJellyClearSafeMark(g) {
    if (!g) return;
    g.ice.forEach(entry => {
        if (entry.el) entry.el.classList.remove('eg-jelly-ice-safe');
    });
}


// While a shell blob is alive, keeps the green hold-spot marker truthful:
// during the blob's rest phase (before it locks) the marker follows the icy
// cell under the avatar — "hold here and the blob will lock onto ice" — and
// once the blob locks (warn/fly) it marks the locked landing cell, so the
// player sees exactly where the blob will slip. No marker = not on ice.
function _egJellySyncSafeMark(g) {
    if (!g || !g.blob) return;
    const b = g.blob;
    _egJellyClearSafeMark(g);
    if (b.mode === 'rest') {
        const c = _egNkPlayerCenter();
        const under = c ? _egJellyIceAt(c.x, c.y) : null;
        if (under && under.el) under.el.classList.add('eg-jelly-ice-safe');
    } else if (b.mode === 'warn' || b.mode === 'fly') {
        const at = _egJellyIceAt(b.tx, b.ty);
        if (at && at.el) at.el.classList.add('eg-jelly-ice-safe');
    }
}


// A shell blob just locked onto the player (its shadow mark appeared): every
// icy patch pulses once — "a hop is incoming — ice is where it breaks".
function _egJellyBlobLockedCue() {
    const g = _egJellyGate;
    if (!g || !g.ice || g.ice.size === 0) return;
    g.ice.forEach(entry => {
        const el = entry.el;
        if (!el || !el.isConnected) return;
        el.classList.remove('eg-jelly-ice-flash');
        void el.offsetWidth;   // restart the pulse on consecutive locks
        el.classList.add('eg-jelly-ice-flash');
        // Let the base glint resume once the pulse finishes.
        setTimeout(() => { try { el.classList.remove('eg-jelly-ice-flash'); } catch (e) {} }, 950);
    });
}


// ── Ice Shell shield gate (P2, at 50% HP) ───────────────────────────────────
// Keeps the boss immune and runs its own mini-loop: keep the floor iced and
// lob single hop blobs at the player. When one slips on ice it flies into
// the boss and the shell shatters → bossImmune drops and the normal phase-2
// mechanic schedule (hops + probability shift) starts.

function _egJellyStartShieldGate(monster) {
    if (!monster || monster.jellyShieldUp) return;
    monster.bossImmune = true;              // the transition set this — keep it held
    monster.jellyShieldUp = true;

    const run = _egNkNewRun(monster.id, true);
    const gate = {
        monsterId: monster.id,
        run,
        ice: new Map(),
        bubble: null,
        blob: null,
        blobAt: EG_JELLY_GATE_FIRST_BLOB_MS,
        refillAt: 200,
    };
    _egJellyGate = gate;

    gate.bubble = _egNkEl(run, 'div', 'eg-jelly-bubble', '');
    gate.bubble.style.display = 'none';

    run.onKill = () => {
        const m = _egJellyMonsterById(gate.monsterId);
        if (m) m.jellyShieldUp = false;
        _egJellyDropGateVisuals(gate);
    };

    _egJellyTopUpIce(gate, EG_JELLY_ICE_TARGET);
    _egNkToast('eg_jelly_ice_shell',
        '🟢 The Jelly: Ice Shell! Lure a hop blob onto the ice to break it!', '#4ade80');
    if (typeof _egRenderPanel === 'function') { try { _egRenderPanel(); } catch (e) {} }

    _egNkLoop(run, (dtS) => {
        const g = _egJellyGate;
        if (!g || g.run !== run) return false;
        const m = _egJellyMonsterById(g.monsterId);
        if (!m) return false;
        const dtMs = dtS * 1000;

        _egJellyPlaceBubble(g);

        // Floor upkeep: melt expired ice (per-frame — at most 3 patches)
        // and top the floor back up to the target count on a short cadence.
        _egJellyPruneIce(g, dtMs);
        g.refillAt -= dtMs;
        if (g.refillAt <= 0) {
            if (g.ice.size < EG_JELLY_ICE_TARGET) {
                _egJellyTopUpIce(g, EG_JELLY_ICE_TARGET - g.ice.size);
                g.refillAt = _egJellyRand(EG_JELLY_ICE_REFILL_MS);
            } else {
                g.refillAt = 600;
            }
        }

        // Lob the next hop blob when the field is clear.
        if (!g.blob) {
            g.blobAt -= dtMs;
            if (g.blobAt <= 0) {
                const p = _egJellyBossCenter(m)
                    || { x: window.innerWidth / 2, y: window.innerHeight * 0.3 };
                g.blob = _egJellySpawnBlob(run, m, p.x, p.y,
                    EG_JELLY_GATE_REST_MS, EG_JELLY_GATE_WARN_MS,
                    EG_JELLY_GATE_RADIUS, EG_JELLY_GATE_DMG_PCT);
                g.blob.ability = 'Hop Blob';
            }
        } else {
            const alive = _egJellyStepBlob(g.blob, dtMs, true);
            if (!alive) {
                _egJellyClearSafeMark(g);
                const broke = g.blob.slipDone;
                g.blob = null;
                if (broke) {
                    _egJellyShieldBroken(m, run);
                    return false;
                }
                g.blobAt = _egJellyRand(EG_JELLY_GATE_BLOB_GAP_MS);
            } else {
                // Keep the hold-spot marker truthful frame by frame.
                _egJellySyncSafeMark(g);
            }
        }
        return true;
    });
}


// Green immunity bubble hugging the Jelly's card (survives panel re-renders).
function _egJellyPlaceBubble(g) {
    const b = g && g.bubble;
    if (!b) return;
    const card = document.getElementById('eg-card-' + g.monsterId);
    const wrap = card ? card.querySelector('.eg-emoji-wrapper') : null;
    const el = wrap || card;
    const r = el ? el.getBoundingClientRect() : null;
    if (!r || !r.width || !r.height) { b.style.display = 'none'; return; }
    const size = Math.max(r.width, r.height) + 34;
    b.style.display = '';
    b.style.left = Math.round(r.left + r.width / 2 - size / 2) + 'px';
    b.style.top = Math.round(r.top + r.height / 2 - size / 2) + 'px';
    b.style.width = size + 'px';
    b.style.height = size + 'px';
}


// A hop blob slipped on the ice and slammed into the boss — break the shell.
function _egJellyShieldBroken(monster, run) {
    if (!monster) return;
    monster.bossImmune = false;
    monster.jellyShieldUp = false;
    _egJellyDropGateVisuals(_egJellyGate);
    _egJellyShatterBurst(monster);
    _egNkToast('eg_jelly_ice_broken',
        '💥 The Ice Shell shatters — The Jelly is vulnerable!', '#4ade80');
    if (typeof _egRenderPanel === 'function') { try { _egRenderPanel(); } catch (e) {} }
    // The shell was the phase-2 opener — now the fight runs normally.
    if (monster.bossPhase === 2 && typeof _egBossScheduleMechanics === 'function') {
        try { _egBossScheduleMechanics(monster, 2); } catch (e) {}
    }
}


// Tears down a gate's visuals + state. Called by the run's onKill and when
// the shell breaks (the run is killed right after, so this is idempotent).
function _egJellyDropGateVisuals(gate) {
    if (_egJellyGate === gate) _egJellyGate = null;
    if (!gate) return;
    gate.ice.forEach(entry => { try { entry.el.remove(); } catch (e) {} });
    gate.ice.clear();
    gate.blob = null;
}


// Expanding green shatter ring where the boss was struck by the slipping blob.
function _egJellyShatterBurst(monster) {
    const p = _egJellyBossCenter(monster)
        || { x: window.innerWidth / 2, y: window.innerHeight * 0.2 };
    const s = document.createElement('div');
    s.className = 'eg-jelly-shatter';
    s.style.left = Math.round(p.x) + 'px';
    s.style.top = Math.round(p.y) + 'px';
    document.body.appendChild(s);
    setTimeout(() => { try { s.remove(); } catch (e) {} }, 700);
}


// ── Jelly Army (P3, at 20% HP) ──────────────────────────────────────────────
// The Jelly erupts: ten hop blobs pour out one after another (short delay
// between spawns), each leaping at the player with the usual hop-blob
// mechanic. Runs once, on top of the standard phase-3 transition.

function _egJellyStartArmy(monster) {
    if (!monster || _egJellyArmy) return;
    const run = _egNkNewRun(monster.id, true);
    const army = { run, monsterId: monster.id, blobs: [], spawned: 0, nextSpawnAt: 0 };
    _egJellyArmy = army;
    run.onKill = () => { if (_egJellyArmy && _egJellyArmy.run === run) _egJellyArmy = null; };

    _egNkToast('eg_mech_jelly_army',
        '🟢 The Jelly: Jelly Army! 10 hop blobs incoming — dodge the shadows!', '#7dd3fc');

    _egNkLoop(run, (dtS) => {
        const a = _egJellyArmy;
        if (!a || a.run !== run) return false;
        const m = _egJellyMonsterById(a.monsterId);
        if (!m) return false;
        const dtMs = dtS * 1000;

        a.nextSpawnAt -= dtMs;
        if (a.spawned < EG_JELLY_ARMY_COUNT && a.nextSpawnAt <= 0) {
            const p = _egJellyBossCenter(m)
                || { x: window.innerWidth / 2, y: window.innerHeight * 0.3 };
            const jx = p.x + (Math.random() * 2 - 1) * 14;
            const jy = p.y + (Math.random() * 2 - 1) * 14;
            const b = _egJellySpawnBlob(run, m, jx, jy,
                EG_JELLY_ARMY_REST_MS, EG_JELLY_ARMY_WARN_MS,
                EG_JELLY_ARMY_RADIUS, EG_JELLY_ARMY_DMG_PCT);
            b.ability = 'Jelly Army';
            a.blobs.push(b);
            a.spawned++;
            a.nextSpawnAt = EG_JELLY_ARMY_STAGGER_MS;
        }

        a.blobs = a.blobs.filter(blob => _egJellyStepBlob(blob, dtMs, false));

        return a.spawned < EG_JELLY_ARMY_COUNT || a.blobs.length > 0;
    });
}


// ── Phase-enter hook ─────────────────────────────────────────────────────────
// The Jelly's phases line up with its signature moments. Returning true from
// phase 2 hands phase ownership to the Ice Shell gate: the framework skips
// its generic immunity timer and the gate releases immunity itself.
function _egJellyOnPhaseEnter(monster, newPhase) {
    if (!monster) return false;
    if (newPhase === 2) {
        _egJellyStartShieldGate(monster);
        return true; // hold immunity until a hop blob slips on the ice
    }
    if (newPhase >= 3) _egJellyStartArmy(monster);
    return false;
}


//------------------------------------------------------------------------
//-------------------MECHANIC: JELLY HOPS (phase 1 + after the shell) -----
//------------------------------------------------------------------------
// The classic act: one chained hop blob follows you for 3–4 hops, each hop
// re-telegraphing to where you stand at that moment. Watch the shadow,
// leave before it lands. Not used while the Ice Shell holds — the shell
// phase only lobs single hop blobs (see _egJellyStartShieldGate).

function _egMechJellyHops(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const hops = [0, 3, 3, 4][p];
    const warnMs = 1000, radius = 70;
    const dmgPct = [0, 0.12, 0.14, 0.18][p];
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    let x = window.innerWidth * 0.5, y = window.innerHeight * 0.3;
    const body = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-jelly', '🟢');
    const queue = [];
    for (let i = 0; i < hops; i++) {
        const mark = _egNkEl(run, 'div', 'eg-nk-mark');
        mark.style.display = 'none';
        mark.style.width = radius * 2 + 'px';
        mark.style.height = radius * 2 + 'px';
        queue.push({ tx: 0, ty: 0, t: -i * 1400, warned: false, done: false, mark });
    }
    body.style.transform = 'translate(' + Math.round(x - 22) + 'px,' + Math.round(y - 22) + 'px)';
    _egNkToast('eg_mech_jelly', '🟢 The Jelly: Jelly Hops! Watch the shadow!');
    _egNkLoop(run, (dtS) => {
        let pending = false;
        queue.forEach(h => {
            if (h.done) return;
            pending = true;
            h.t += dtS * 1000;
            if (h.t < 0) return;
            if (!h.warned) {
                h.warned = true;
                const c = _egNkPlayerCenter();
                h.tx = c ? c.x : window.innerWidth / 2;
                h.ty = c ? c.y : window.innerHeight / 2;
                h.mark.style.display = '';
                h.mark.style.left = Math.round(h.tx - radius) + 'px';
                h.mark.style.top = Math.round(h.ty - radius) + 'px';
            }
            // Hop arc: body flies from its spot to the target over warnMs.
            const f = Math.min(1, h.t / warnMs);
            const bx = x + (h.tx - x) * f;
            const by = y + (h.ty - y) * f - Math.sin(f * Math.PI) * 90;
            body.style.transform = 'translate(' + Math.round(bx - 22) + 'px,' + Math.round(by - 22) + 'px)';
            if (f >= 1) {
                h.done = true;
                x = h.tx;
                y = h.ty;
                h.mark.classList.add('eg-nk-mark-hit');
                setTimeout(() => h.mark.remove(), 400);
                if (_egNkCircleHit(h.tx, h.ty, radius, _egNkPlayerRect(), 0)) {
                    const dealt = _egNkHit(dmgPct, 'cold', level);
                    _egNkAbilityHitToast(dealt, 'The Jelly', 'Jelly Hops');
                }
            }
        });
        return pending;
    });
}
