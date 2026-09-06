//------------------------------------------------------------------------
//-------------------BOSS: THE TACTICIAN (boss_tactician)------------------
//------------------------------------------------------------------------
// A rework of the old one-shot Battle Intent into a persistent chess
// siege. The Tactician plays the board and the board is the arena.
// Fight identity: READ THE BOARD — every attack is a chess move, declared
// in advance, and every declared move is dodgeable if you read it.
//
//   PERSISTENT (whole fight, watcher):
//   • THE QUEEN'S GUARD — the boss's arena body: a black ♛ queen that
//     glides around the board like a queen move (axis + diagonal lines).
//     Touching it is a ROOK'S CHARGE: animated fling + physical damage.
//   • BATTLE INTENT — the Tactician still telegraphs its plans (the old
//     identity, now constant): a banner declares ⚔️ VOLLEY, 🛡️ TITHE or
//     😡 ENRAGE, then executes 2s later. Volleys are aimed knight-orbs.
//   • PAWN MARCHES — ♟️ pawns periodically advance up the board in rank
//     columns (telegraphed lane, then a marching wall with one gap).
//     Physical hits; the gap is the answer.
//
//   60% GATE — CHECK: the queen calls CHECK — four rook-slide lanes pin
//   the board (two horizontal, two vertical, telegraphed), then charge
//   along them. Each lane is a full-screen rook dash.
//
//   30% GATE — ZUGZWANG: every position is losing. Chess-piece hazards
//   occupy cells: bishop diagonals scorch the board (telegraphed diagonal
//   beams), and a knight ♞ appears and leaps in L-shapes at your position,
//   each landing a burst. Forced movement, forced reads.
//
//   CHARGE ATTACK — CHECKMATE: the board flashes, the four board edges
//   slam inward as castle walls (like a rook castle from all sides),
//   crushing anyone caught in the shrinking ring. Escape through the
//   narrowing gaps before the walls meet.
//
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule + onInit arena)
//   3. UNIQUE mechanic handlers + the persistent watcher
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string. Damage flows through the shared tier curve.
// NOTE: exactly ONE _egNkLoop runs on the watcher's run — every state
// machine (intent, pawns, check lanes, zugzwang, checkmate) lives in
// that single tick.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_tactician: {
        id: 'boss_tactician', name: 'The Tactician', emoji: '♟️',
        baseHP: 980, baseDamage: 22, chargeMax: 12,
        element: null, resistances: { fire: 10, cold: 10, lightning: 10, shadow: 10 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_tactician: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.00 },
        ],
        immunityDuration: 2500,
        mechanics: [
            // Kept for schedule compatibility — the persistent watcher now
            // owns the intent cadence; the handler no-ops (same shim
            // pattern as the other reworked bosses).
            { name: 'battle_intent', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechBattleIntent' },
            { name: 'fog_bank', intervalBase: 22000, intervalVariance: 5000, handler: '_egMechFogBank' },
        ],
        onInit: _egTacticianArenaInit,
    },
});


// ── Board tuning ─────────────────────────────────────────────────────────
// The Queen's Guard (boss body)
const EG_TCT_R = 38;                          // queen visual radius
const EG_TCT_GLIDE_SPEED = [0, 42, 58, 76];   // px/s queen glide (queen-fast)
const EG_TCT_GLIDE_REPICK_MS = 4200;
const EG_TCT_ROOK_DMG = [0, 0.06, 0.07, 0.09]; // %maxHP touching the queen
const EG_TCT_ROOK_CD_MS = 1000;
const EG_TCT_ROOK_FLING = [0, 140, 165, 190];
// Battle intent (persistent cadence)
const EG_TCT_INTENT_EVERY_MS = [0, 8200, 7000, 5600];
const EG_TCT_INTENT_DECLARE_MS = 2000;
const EG_TCT_ORB_SPEED = 210;
const EG_TCT_ORB_DMG = 0.05;                  // %maxHP per orb
// Pawn marches
const EG_TCT_PAWN_EVERY_MS = [0, 8600, 7300, 5900];
const EG_TCT_PAWN_WARN_MS = 800;
const EG_TCT_PAWN_SPEED = 130;                // px/s march
const EG_TCT_PAWN_DMG = 0.07;                 // %maxHP per pawn touch
const EG_TCT_PAWN_GAP_W = 130;                // the safe gap column
// Check (60% gate)
const EG_TCT_CHECK_LANES = 4;                 // 2 horiz + 2 vert
const EG_TCT_CHECK_WARN_MS = 1200;
const EG_TCT_CHECK_DASH_SPEED = 560;
const EG_TCT_CHECK_LANE_H = 76;
const EG_TCT_CHECK_DMG = [0, 0.13, 0.15, 0.18];
const EG_TCT_CHECK_FLING = [0, 170, 195, 220];
const EG_TCT_CHECK_GAP_MS = 1500;
// Zugzwang (30% gate)
const EG_TCT_ZUG_MS = 9000;
const EG_TCT_BISHOP_EVERY_MS = 2100;
const EG_TCT_BISHOP_WARN_MS = 950;
const EG_TCT_BISHOP_DMG = 0.10;               // %maxHP per diagonal beam
const EG_TCT_KNIGHT_LEAPS = 4;
const EG_TCT_KNIGHT_WARN_MS = 800;
const EG_TCT_KNIGHT_R = 130;
const EG_TCT_KNIGHT_DMG = [0, 0.11, 0.13, 0.16];
const EG_TCT_KNIGHT_FLING = [0, 150, 175, 200];
// Checkmate (charge attack)
const EG_TCT_CM_WARN_MS = 1100;
const EG_TCT_CM_CLOSE_MS = 2600;              // walls meet in 2.6s
const EG_TCT_CM_THICK = 90;                   // wall thickness px
const EG_TCT_CM_DMG = [0, 0.17, 0.20, 0.24];
const EG_TCT_CM_FLING = [0, 200, 230, 260];   // inward crush fling


let _egTacticianWatcher = null; // per-fight chess state

// Phase lookup helper — resolves the boss's current phase (default 1).
function _egTctPhase(st) {
    if (typeof _egMonsters !== 'undefined') {
        const m = _egMonsters.find(x => x && x.id === st.monsterId);
        if (m) return Math.max(1, Math.min(3, Number(m.bossPhase) || 1));
    }
    return 1;
}

// Removes every chess overlay (registered in boss-framework teardown).
function _egTacticianTeardown() {
    if (_egTacticianWatcher) {
        const st = _egTacticianWatcher;
        _egTacticianWatcher = null;
        (st.orbs || []).forEach(o => { try { if (o.el) o.el.remove(); } catch (e) {} });
        (st.pawns || []).forEach(p => { try { if (p.el) p.el.remove(); } catch (e) {} try { if (p.warnEl) p.warnEl.remove(); } catch (e) {} });
        (st.lanes || []).forEach(l => { try { if (l.el) l.el.remove(); } catch (e) {} });
        (st.beams || []).forEach(b => { try { if (b.el) b.el.remove(); } catch (e) {} });
        (st.leaps || []).forEach(l => { try { if (l.el) l.el.remove(); } catch (e) {} try { if (l.knightEl) l.knightEl.remove(); } catch (e) {} });
        (st.walls || []).forEach(w => { try { if (w.el) w.el.remove(); } catch (e) {} });
        if (st.intent) { try { if (st.intent.banner) st.intent.banner.remove(); } catch (e) {} }
        if (st.checkmate) { try { if (st.checkmate.els) st.checkmate.els.forEach(w => w.remove()); } catch (e) {} }
        try { if (st.run) _egNkKillRun(st.run); } catch (e) {} // removes the queen
    }
    document.querySelectorAll('.eg-tct-queen, .eg-tct-intent, .eg-tct-orb, .eg-tct-pawn, .eg-tct-pawnwarn, .eg-tct-lane, .eg-tct-beam, .eg-tct-knight, .eg-tct-leap, .eg-tct-wall').forEach(el => el.remove());
}


// ── Persistent arena: the queen, the plans, the pawns ───────────────────
function _egTacticianArenaInit(monster) {
    if (_egTacticianWatcher) return;
    const monsterId = monster ? monster.id : null;
    const st = {
        monsterId, level: monster ? monster.level : 1,
        run: null,
        queen: null,
        intent: null, intentAcc: 0,
        orbs: [],
        pawns: [], pawnAcc: 0,
        lanes: [], check: null,
        beams: [], leaps: [], zug: null, zugAcc: 0, zugKnight: 0,
        checkmate: null,
        gate60Done: false, gate30Done: false,
        everLive: false, bornAt: performance.now(),
    };
    _egTacticianWatcher = st;

    // Persistent watcher FIRST (elements must hang off a run).
    const run = _egNkNewRun(monsterId, true);
    run.passive = true;
    run.onKill = () => { if (_egTacticianWatcher === st) _egTacticianWatcher = null; };
    st.run = run;

    // The Queen's Guard: the boss's arena body.
    const el = _egNkEl(run, 'div', 'eg-tct-queen', '♛');
    el.style.width = el.style.height = (EG_TCT_R * 2) + 'px';
    st.queen = {
        x: window.innerWidth * 0.5, y: window.innerHeight * 0.3,
        tx: window.innerWidth * 0.5, ty: window.innerHeight * 0.3,
        repickAt: EG_TCT_GLIDE_REPICK_MS, cdUntil: 0, el,
    };
    el.style.transform = 'translate(' + Math.round(st.queen.x - EG_TCT_R) + 'px,' + Math.round(st.queen.y - EG_TCT_R) + 'px)';

    if (monster) st.everLive = true;

    _egNkLoop(run, (dtS, now) => {
        if (_egTacticianWatcher !== st) return false;
        const live = _egMonsters ? _egMonsters.find(m => m.id === st.monsterId) : null;
        if (!live) return false;
        const W = window.innerWidth, H = window.innerHeight;
        const c = _egNkPlayerCenter();
        const pr = _egNkPlayerRect();
        const p = Math.max(1, Math.min(3, Number(live.bossPhase) || 1));

        // ── HP gates ──
        const hpPct = live.maxHP > 0 ? live.currentHP / live.maxHP : 1;
        if (!st.gate60Done && hpPct <= 0.60) { st.gate60Done = true; _egTctCheck(st, W, H); }
        if (!st.gate30Done && hpPct <= 0.30) { st.gate30Done = true; _egTctZugzwang(st, p); }

        // ── The Queen's Guard: queen-move glide + ROOK'S CHARGE on touch ──
        const qn = st.queen;
        qn.repickAt -= dtS * 1000;
        const qdx = qn.tx - qn.x, qdy = qn.ty - qn.y;
        const qd = Math.hypot(qdx, qdy) || 1;
        const qstep = EG_TCT_GLIDE_SPEED[p] * dtS;
        if (qd <= qstep || qn.repickAt <= 0) {
            // Queen moves: pick a new target that shares an axis or diagonal
            // with the current square (glide along queen lines).
            const axis = Math.random() < 0.5;
            if (axis) {
                qn.tx = 80 + Math.random() * Math.max(60, W - 160);
                qn.ty = qn.y;
            } else {
                const diag = (Math.random() < 0.5 ? 1 : -1) * (200 + Math.random() * 300);
                qn.tx = Math.max(80, Math.min(W - 80, qn.x + diag));
                qn.ty = Math.max(80, Math.min(H - 160, qn.y + (Math.random() < 0.5 ? 1 : -1) * Math.abs(diag)));
            }
            qn.repickAt = EG_TCT_GLIDE_REPICK_MS;
        } else {
            qn.x += (qdx / qd) * qstep;
            qn.y += (qdy / qd) * qstep;
        }
        qn.el.style.transform = 'translate(' + Math.round(qn.x - EG_TCT_R) + 'px,' + Math.round(qn.y - EG_TCT_R) + 'px)';
        if (c && pr && now >= qn.cdUntil && !st.checkmate && _egNkCircleHit(qn.x, qn.y, EG_TCT_R * 0.9, pr, 0)) {
            qn.cdUntil = now + EG_TCT_ROOK_CD_MS;
            const dx = c.x - qn.x, dy = c.y - qn.y;
            const d = Math.hypot(dx, dy) || 1;
            _egNkFlingAvatar((dx / d) * EG_TCT_ROOK_FLING[p], (dy / d) * EG_TCT_ROOK_FLING[p], qn.x, qn.y);
            const dealt = _egNkHit(EG_TCT_ROOK_DMG[p], null, st.level);
            _egNkAbilityHitToast(dealt, 'The Tactician', "Rook's Charge");
            try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('tct_move'); } catch (e2) {}
        }

        // ── Battle Intent (persistent cadence): declare → execute ──
        st.intentAcc += dtS * 1000;
        if (!st.intent && st.intentAcc >= EG_TCT_INTENT_EVERY_MS[p]) {
            st.intentAcc = 0;
            const kinds = p >= 3 ? ['swords', 'shield', 'rage'] : (p === 2 ? ['swords', 'rage', 'swords'] : ['swords', 'shield']);
            _egTctDeclare(st, kinds[Math.floor(Math.random() * kinds.length)], live, p);
        }
        if (st.intent) {
            const it = st.intent;
            it.t += dtS * 1000;
            if (it.t >= EG_TCT_INTENT_DECLARE_MS) {
                try { if (it.banner) it.banner.remove(); } catch (e) {}
                st.intent = null;
                _egTctExecute(st, it, live, p, W, H);
            }
        }
        // Intent orbs: aimed knight-orbs from the top corners.
        for (let i = st.orbs.length - 1; i >= 0; i--) {
            const o = st.orbs[i];
            o.t += dtS * 1000;
            o.x += o.vx * dtS;
            o.y += o.vy * dtS;
            o.el.style.transform = 'translate(' + Math.round(o.x - 10) + 'px,' + Math.round(o.y - 10) + 'px)';
            if (pr && !o.hit && _egNkCircleHit(o.x, o.y, 13, pr, 0)) {
                o.hit = true;
                const dealt = _egNkHit(EG_TCT_ORB_DMG, null, st.level);
                _egNkAbilityHitToast(dealt, 'The Tactician', 'Volley');
                try { o.el.remove(); } catch (e) {}
                st.orbs.splice(i, 1);
                continue;
            }
            if (o.t > 6000 || o.x < -30 || o.x > W + 30 || o.y < -30 || o.y > H + 30) {
                try { o.el.remove(); } catch (e) {}
                st.orbs.splice(i, 1);
            }
        }

        // ── Pawn marches: lane warn → wall with one gap advances ──
        st.pawnAcc += dtS * 1000;
        if (!st.checkmate && st.pawnAcc >= EG_TCT_PAWN_EVERY_MS[p]) {
            st.pawnAcc = 0;
            _egTctQueuePawn(st, W, H);
        }
        for (let i = st.pawns.length - 1; i >= 0; i--) {
            const pw = st.pawns[i];
            if (!pw.live) {
                pw.warnT += dtS * 1000;
                if (pw.warnT >= EG_TCT_PAWN_WARN_MS) {
                    pw.live = true;
                    try { pw.warnEl.remove(); } catch (e) {}
                    // The marching rank: pawns across the width except the gap.
                    const el2 = _egNkEl(st.run, 'div', 'eg-tct-pawn');
                    const n = Math.max(2, Math.floor(W / 90));
                    const gapIdx = Math.floor(pw.gapX / (W / n));
                    pw.cellW = W / n;
                    pw.el = el2;
                    pw.cells = [];
                    for (let k = 0; k < n; k++) {
                        if (k === gapIdx) continue; // the safe gap
                        const pel = document.createElement('div');
                        pel.className = 'eg-tct-pawn-cell';
                        pel.textContent = '♟️';
                        el2.appendChild(pel);
                        pw.cells.push(pel);
                    }
                    pw.gapIdx = gapIdx;
                    pw.n = n;
                    // Fill non-gap cells' text; hide the gap cell via visibility.
                    const pelAll = el2.children;
                    for (let k = 0; k < pelAll.length; k++) pelAll[k].style.visibility = 'visible';
                }
                continue;
            }
            // March upward.
            pw.y -= EG_TCT_PAWN_SPEED * dtS;
            pw.el.style.transform = 'translateY(' + Math.round(pw.y) + 'px)';
            if (pr && now >= pw.hitCd) {
                // Rect vs the rank row (skip the gap column).
                const inRow = pr.bottom > pw.y && pr.top < pw.y + 54;
                const col = Math.floor(((c ? c.x : W / 2)) / pw.cellW);
                if (inRow && col !== pw.gapIdx) {
                    pw.hitCd = now + 900;
                    const dealt = _egNkHit(EG_TCT_PAWN_DMG, null, st.level);
                    _egNkAbilityHitToast(dealt, 'The Tactician', 'Pawn March');
                }
            }
            if (pw.y < -80) {
                try { pw.el.remove(); } catch (e) {}
                st.pawns.splice(i, 1);
            }
        }

        // ── CHECK (60% gate): rook-slide lanes warn, then dash ──
        for (let i = st.lanes.length - 1; i >= 0; i--) {
            const ln = st.lanes[i];
            ln.t += dtS * 1000;
            if (ln.t < EG_TCT_CHECK_WARN_MS) continue;
            if (!ln.fired) {
                ln.fired = true;
                ln.el.classList.add('hot');
                ln.pos = ln.horiz ? ln.y : ln.x; // dash start at screen edge
                try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('tct_move'); } catch (e) {}
            }
            // The lane dashes along its axis.
            if (ln.horiz) ln.x += ln.dir * EG_TCT_CHECK_DASH_SPEED * dtS;
            else ln.y += ln.dir * EG_TCT_CHECK_DASH_SPEED * dtS;
            ln.el.style.left = Math.round(ln.x) + 'px';
            ln.el.style.top = Math.round(ln.y) + 'px';
            // Ride the lane: hit test the moving band.
            if (pr && now >= ln.hitCd) {
                const bandX = ln.horiz ? ln.x : ln.x - EG_TCT_CHECK_LANE_H / 2;
                const bandY = ln.horiz ? ln.y - EG_TCT_CHECK_LANE_H / 2 : ln.y;
                const bw = ln.horiz ? EG_TCT_CHECK_LANE_H : EG_TCT_CHECK_LANE_H;
                const inBand = pr.right > bandX && pr.left < bandX + bw && pr.bottom > bandY && pr.top < bandY + bw;
                if (inBand) {
                    ln.hitCd = now + 900;
                    const dx = ln.horiz ? ln.dir : 0, dy = ln.horiz ? 0 : ln.dir;
                    _egNkFlingAvatar(dx * EG_TCT_CHECK_FLING[p], dy * EG_TCT_CHECK_FLING[p], ln.horiz ? (c ? c.x : W / 2) : ln.x, ln.horiz ? ln.y : (c ? c.y : H / 2));
                    const dealt = _egNkHit(EG_TCT_CHECK_DMG[p], null, st.level);
                    _egNkAbilityHitToast(dealt, 'The Tactician', 'Check');
                }
            }
            if (ln.x < -EG_TCT_CHECK_LANE_H * 2 || ln.x > W + EG_TCT_CHECK_LANE_H * 2 || ln.y < -EG_TCT_CHECK_LANE_H * 2 || ln.y > H + EG_TCT_CHECK_LANE_H * 2) {
                try { ln.el.remove(); } catch (e) {}
                st.lanes.splice(i, 1);
            }
        }
        if (st.check) {
            st.check.t += dtS * 1000;
            if (st.check.t >= st.check.wave * EG_TCT_CHECK_GAP_MS && st.check.wave < EG_TCT_CHECK_LANES) {
                _egTctSpawnLane(st, W, H, st.check.wave);
                st.check.wave++;
            }
            if (st.check.wave >= EG_TCT_CHECK_LANES && st.lanes.length === 0) {
                st.check = null;
                _egNkToast('eg_tct_check_end', '♟️ Check resolved. Your move.', '#93c5fd');
            }
        }

        // ── ZUGZWANG (30% gate): bishop diagonals + knight leaps ──
        if (st.zug) {
            st.zug.t += dtS * 1000;
            st.zugAcc += dtS * 1000;
            if (st.zugAcc >= EG_TCT_BISHOP_EVERY_MS && st.beams.length < 3) {
                st.zugAcc = 0;
                _egTctQueueBeam(st, qn, W, H);
            }
            st.zugKnight += dtS * 1000;
            if (st.zugKnight >= EG_TCT_ZUG_MS / EG_TCT_KNIGHT_LEAPS && st.leaps.length < 2) {
                st.zugKnight = 0;
                _egTctQueueLeap(st, qn, W, H);
            }
            if (st.zug.t >= EG_TCT_ZUG_MS) {
                st.zug = null;
                _egNkToast('eg_tct_zug_end', '♟️ The position resolves.', '#93c5fd');
            }
        }
        // Bishop beams: warn then flash.
        for (let i = st.beams.length - 1; i >= 0; i--) {
            const b = st.beams[i];
            b.t += dtS * 1000;
            if (b.t < EG_TCT_BISHOP_WARN_MS) {
                b.el.style.opacity = String(0.35 + 0.4 * Math.abs(Math.sin(b.t / 100)));
                continue;
            }
            if (!b.fired) {
                b.fired = true;
                b.el.classList.add('hot');
                const pr5 = _egNkPlayerRect();
                if (pr5 && _egTctBeamHits(b, pr5)) {
                    const dealt = _egNkHit(EG_TCT_BISHOP_DMG, null, st.level);
                    _egNkAbilityHitToast(dealt, 'The Tactician', 'Bishop Pin');
                }
            }
            if (b.t >= EG_TCT_BISHOP_WARN_MS + 300) {
                try { b.el.remove(); } catch (e) {}
                st.beams.splice(i, 1);
            }
        }
        // Knight leaps: warn ring at the landing square, then burst.
        for (let i = st.leaps.length - 1; i >= 0; i--) {
            const lp = st.leaps[i];
            lp.t += dtS * 1000;
            if (lp.t < EG_TCT_KNIGHT_WARN_MS) {
                // The knight piece visibly travels toward the landing square.
                const k = lp.t / EG_TCT_KNIGHT_WARN_MS;
                const kx = lp.fromX + (lp.x - lp.fromX) * k;
                const ky = lp.fromY + (lp.y - lp.fromY) * k;
                if (lp.knightEl) lp.knightEl.style.transform = 'translate(' + Math.round(kx - 22) + 'px,' + Math.round(ky - 22) + 'px) scale(' + (1 + 0.4 * Math.sin(k * Math.PI)) + ')';
                continue;
            }
            // LAND: burst.
            const pr6 = _egNkPlayerRect();
            const c6 = _egNkPlayerCenter();
            if (pr6 && _egNkCircleHit(lp.x, lp.y, EG_TCT_KNIGHT_R, pr6, 0)) {
                const dx = (c6 ? c6.x : lp.x) - lp.x, dy = (c6 ? c6.y : lp.y) - lp.y;
                const d = Math.hypot(dx, dy) || 1;
                _egNkFlingAvatar((dx / d) * EG_TCT_KNIGHT_FLING[p], (dy / d) * EG_TCT_KNIGHT_FLING[p], lp.x, lp.y);
                const dealt = _egNkHit(EG_TCT_KNIGHT_DMG[p], null, st.level);
                _egNkAbilityHitToast(dealt, 'The Tactician', 'Knight Fork');
            }
            try { if (lp.knightEl) lp.knightEl.remove(); } catch (e) {}
            try { lp.el.remove(); } catch (e) {}
            st.leaps.splice(i, 1);
            try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('tct_move'); } catch (e) {}
        }

        // ── CHECKMATE (charge attack): four castle walls close in ──
        if (st.checkmate) {
            const cm = st.checkmate;
            cm.t += dtS * 1000;
            if (cm.phase === 'warn' && cm.t >= EG_TCT_CM_WARN_MS) {
                cm.phase = 'close';
                cm.t = 0;
                cm.els.forEach(w2 => w2.classList.add('closing'));
            }
            if (cm.phase === 'close') {
                const k = Math.min(1, cm.t / EG_TCT_CM_CLOSE_MS);
                const inset = Math.round((Math.min(W, H) * 0.42) * k);
                // Four walls: top, bottom, left, right.
                cm.els[0].style.transform = 'translateY(' + inset + 'px)';
                cm.els[1].style.transform = 'translateY(' + (-inset) + 'px)';
                cm.els[2].style.transform = 'translateX(' + inset + 'px)';
                cm.els[3].style.transform = 'translateX(' + (-inset) + 'px)';
                // Crush check: anyone outside the safe rect takes the crush.
                if (pr && now >= cm.hitCd) {
                    const safeL = inset, safeR = W - inset, safeT = inset, safeB = H - inset;
                    const outside = pr.left < safeL || pr.right > safeR || pr.top < safeT || pr.bottom > safeB;
                    if (outside) {
                        cm.hitCd = now + 800;
                        const dx = (c ? c.x : W / 2) - W / 2, dy = (c ? c.y : H / 2) - H / 2;
                        const d = Math.hypot(dx, dy) || 1;
                        _egNkFlingAvatar((dx / d) * EG_TCT_CM_FLING[p], (dy / d) * EG_TCT_CM_FLING[p], W / 2, H / 2);
                        const dealt = _egNkHit(EG_TCT_CM_DMG[p], null, st.level);
                        _egNkAbilityHitToast(dealt, 'The Tactician', 'Checkmate');
                    }
                }
                if (k >= 1) {
                    cm.els.forEach(w2 => { try { w2.remove(); } catch (e) {} });
                    st.checkmate = null;
                    _egNkToast('eg_tct_cm_end', '♛ The walls rest. Stalemate.', '#93c5fd');
                }
            }
        }

        return true;
    });
}


// Declares an intent with a floating banner at the queen.
function _egTctDeclare(st, kind, live, p) {
    const txt = kind === 'swords' ? '⚔️ VOLLEY' : kind === 'shield' ? '🛡️ TITHE' : '😡 ENRAGE';
    const banner = _egNkEl(st.run, 'div', 'eg-tct-intent', txt);
    banner.style.left = Math.round(st.queen.x) + 'px';
    banner.style.top = Math.round(st.queen.y - EG_TCT_R - 34) + 'px';
    st.intent = { kind, t: 0, banner, live, p };
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('tct_move'); } catch (e) {}
}


// Executes a declared intent.
function _egTctExecute(st, it, live, p, W, H) {
    if (it.kind === 'swords') {
        // Aimed volley of knight-orbs from the top corners.
        const c = _egNkPlayerCenter();
        const tx = c ? c.x : W / 2, ty = c ? c.y : H / 2;
        const corners = [[70, 80], [W - 70, 80]];
        corners.forEach(([ox, oy]) => {
            for (let k = -1; k <= 1; k++) {
                const dx = tx - ox, dy = ty - oy;
                const base = Math.atan2(dy, dx) + k * 0.22;
                const el = _egNkEl(st.run, 'div', 'eg-tct-orb', '♞');
                st.orbs.push({ x: ox, y: oy, vx: Math.cos(base) * EG_TCT_ORB_SPEED, vy: Math.sin(base) * EG_TCT_ORB_SPEED, t: 0, hit: false, el });
            }
        });
    } else if (it.kind === 'shield') {
        // Tithe: the shared soul-tithe drain.
        if (typeof _egMechSoulTithe === 'function') { try { _egMechSoulTithe(live, p); } catch (e) {} }
    } else {
        // Rage: +1 soft-enrage stack.
        live.enrageStacks = Math.min(10, (live.enrageStacks || 0) + 1);
        if (typeof _egBossRecalcDamage === 'function') { try { _egBossRecalcDamage(live); } catch (e) {} }
        _egNkToast('eg_tactician_rage', '😡 The Tactician rages! Boss damage rises!', '#f87171');
    }
}


// Queues a pawn rank advancing from the bottom edge.
function _egTctQueuePawn(st, W, H) {
    const gapX = 80 + Math.random() * Math.max(80, W - 160);
    const warnEl = _egNkEl(st.run, 'div', 'eg-tct-pawnwarn');
    warnEl.style.left = Math.round(gapX - EG_TCT_PAWN_GAP_W / 2) + 'px';
    warnEl.style.width = EG_TCT_PAWN_GAP_W + 'px';
    warnEl.style.top = '0px';
    st.pawns.push({ y: H - 40, gapX, warnT: 0, live: false, warnEl, el: null, cells: [], hitCd: 0, cellW: 0, gapIdx: 0, n: 0 });
}


// ── 60% gate: CHECK — four rook-slide lanes ──────────────────────────────
function _egTctCheck(st, W, H) {
    if (st.check) return;
    st.check = { t: 0, wave: 0 };
    _egNkToast('eg_tct_check', '♟️ CHECK! Read the rook lanes — do not stand in them!');
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('tct_move'); } catch (e) {}
}


function _egTctSpawnLane(st, W, H, waveIdx) {
    const horiz = waveIdx % 2 === 0; // first two waves horizontal, then vertical
    const c = _egNkPlayerCenter();
    const y = horiz ? (c ? c.y : H * 0.4) : 0;
    const x = horiz ? 0 : (c ? c.x : W * 0.6);
    const el = _egNkEl(st.run, 'div', 'eg-tct-lane' + (horiz ? ' horiz' : ' vert'));
    if (horiz) {
        el.style.top = Math.round(y - EG_TCT_CHECK_LANE_H / 2) + 'px';
        el.style.left = '0px';
        el.style.width = W + 'px';
    } else {
        el.style.left = Math.round(x - EG_TCT_CHECK_LANE_H / 2) + 'px';
        el.style.top = '0px';
        el.style.height = H + 'px';
    }
    const dir = horiz ? (Math.random() < 0.5 ? 1 : -1) : (Math.random() < 0.5 ? 1 : -1);
    st.lanes.push({ horiz, x, y, dir, t: 0, fired: false, hitCd: 0, el });
    void y; void x;
}


// ── 30% gate: ZUGZWANG ───────────────────────────────────────────────────
function _egTctZugzwang(st, p) {
    if (st.zug) return;
    st.zug = { t: 0 };
    st.zugAcc = 0;
    st.zugKnight = 0;
    _egNkToast('eg_tct_zug', '♟️ ZUGZWANG! Every move loses — read the bishop lines!');
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('tct_move'); } catch (e) {}
}


// One bishop diagonal beam through the queen's current square.
function _egTctQueueBeam(st, qn, W, H) {
    const diag = Math.random() < 0.5 ? 1 : -1;
    const el = _egNkEl(st.run, 'div', 'eg-tct-beam');
    // The beam is a rotated long rectangle through the queen square.
    el.style.left = Math.round(qn.x) + 'px';
    el.style.top = Math.round(qn.y) + 'px';
    el.style.width = Math.round(Math.hypot(W, H)) + 'px';
    el.style.transform = 'rotate(' + (diag > 0 ? 35 : -35) + 'deg)';
    st.beams.push({ t: 0, fired: false, ang: diag > 0 ? 35 : -35, ox: qn.x, oy: qn.y, len: Math.hypot(W, H), el });
}


// Rect vs rotated beam: approximate by projecting the player center onto
// the beam axis and measuring the perpendicular distance.
function _egTctBeamHits(b, pr) {
    const c = _egNkPlayerCenter();
    if (!c) return false;
    const rad = b.ang * Math.PI / 180;
    const px = c.x - b.ox, py = c.y - b.oy;
    const along = px * Math.cos(rad) + py * Math.sin(rad);
    const perp = Math.abs(-px * Math.sin(rad) + py * Math.cos(rad));
    return along > -40 && along < b.len && perp < 34;
}


// One knight leap: the piece jumps an L to a landing square near the player.
function _egTctQueueLeap(st, qn, W, H) {
    const c = _egNkPlayerCenter();
    const tx = c ? c.x : W / 2, ty = c ? c.y : H / 2;
    // L offsets (knight moves).
    const Ls = [[2, 1], [1, 2], [-2, 1], [-1, 2], [2, -1], [1, -2], [-2, -1], [-1, -2]];
    const [lx, ly] = Ls[Math.floor(Math.random() * Ls.length)];
    const cell = Math.min(W, H) / 8;
    const x = Math.max(60, Math.min(W - 60, tx + lx * cell));
    const y = Math.max(60, Math.min(H - 120, ty + ly * cell));
    const warnEl = _egNkEl(st.run, 'div', 'eg-tct-leap');
    warnEl.style.left = Math.round(x) + 'px';
    warnEl.style.top = Math.round(y) + 'px';
    warnEl.style.width = warnEl.style.height = Math.round(EG_TCT_KNIGHT_R * 2) + 'px';
    warnEl.style.marginLeft = warnEl.style.marginTop = (-EG_TCT_KNIGHT_R) + 'px';
    const knightEl = _egNkEl(st.run, 'div', 'eg-tct-knight', '♞');
    st.leaps.push({ x, y, fromX: qn.x, fromY: qn.y, t: 0, warnEl, knightEl });
}


// ── Charge attack: CHECKMATE ─────────────────────────────────────────────
function _egTacticianCheckmate(monster) {
    const st = _egTacticianWatcher;
    if (!st || st.checkmate || _egNkDodgeBusy() || _egNkFrozen()) return;
    const W = window.innerWidth, H = window.innerHeight;
    const els = [];
    const specs = [
        { left: '0px', top: '0px', width: W + 'px', height: EG_TCT_CM_THICK + 'px' },
        { left: '0px', top: (H - EG_TCT_CM_THICK) + 'px', width: W + 'px', height: EG_TCT_CM_THICK + 'px' },
        { left: '0px', top: '0px', width: EG_TCT_CM_THICK + 'px', height: H + 'px' },
        { left: (W - EG_TCT_CM_THICK) + 'px', top: '0px', width: EG_TCT_CM_THICK + 'px', height: H + 'px' },
    ];
    specs.forEach(spec => {
        const w = _egNkEl(st.run, 'div', 'eg-tct-wall');
        w.style.left = spec.left;
        w.style.top = spec.top;
        w.style.width = spec.width;
        w.style.height = spec.height;
        els.push(w);
    });
    st.checkmate = { phase: 'warn', t: 0, els, hitCd: 0 };
    _egNkToast('eg_tct_checkmate', '♛ CHECKMATE! The castle closes — get inside the ring!');
    try { if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('tct_move'); } catch (e) {}
}


//------------------------------------------------------------------------
//-------------------LEGACY COMPAT SHIM------------------------------------
//------------------------------------------------------------------------
// The old scheduled mechanic is now the persistent intent cadence —
// keep the handler name alive so any stale schedule entry no-ops instead
// of erroring.
function _egMechBattleIntent(monster, phase) { void monster; void phase; }
