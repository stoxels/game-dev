//------------------------------------------------------------------------
//-------------------BOSS: THE VISE (boss_vise)---------------------------
//------------------------------------------------------------------------
// Mega-Man corridor: two sweeping block walls with a travelling snake wiggle.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics (corrupt_cells, probability_shift, prior_bomb,
// frozen_cells, clue_swap, grid_invert, summons) live in
// shared-boss-abilities.js and are referenced by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_vise: {
        id: 'boss_vise', name: 'The Vise', emoji: '🧱',
        baseHP: 1020, baseDamage: 23, chargeMax: 12,
        element: 'lightning', resistances: { fire: 15, cold: 15, lightning: 30, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {

    // boss_vise — "The Vise"
    // Mega-Man style corridor: the boss anchors at center-right and extrudes
    // two continuous block walls (upper + lower) that sweep right → left with
    // a travelling snake wiggle. Touching a block is a heavy hit; standing
    // above the upper wall or below the lower wall burns heavy DoT.
    // Phase 1: wide gap, slow, gentle wiggle. Phase 2: narrower + faster.
    // Phase 3: tight corridor, fast sweep, violent snake.
    boss_vise: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.0 }, // Phase 1 — CALIBRATION
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.5 }, // Phase 2 — COMPRESSION
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.0 }, // Phase 3 — CRUSH
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'crushing_walls', intervalBase: 22000, intervalVariance: 5000, handler: '_egMechCrushingWalls' },
            { name: 'probability_shift', intervalBase: 18000, intervalVariance: 4000, handler: '_egMechProbabilityShift' },
        ],
    },
});


// ── Tuning (indexed by phase 1..3) ───────────────────────────────────────
const EG_CRUSH_WARN_MS = 1800;          // telegraph before walls start moving


const EG_CRUSH_BLOCK = 26;              // wall block size (px squares)


const EG_CRUSH_SPAWN_STEP = 15;         // head spawn spacing (overlap → continuous line)


const EG_CRUSH_GAP = [0, 340, 270, 210];       // corridor gap height per phase


const EG_CRUSH_SPEED = [0, 135, 175, 215];     // sweep speed px/s per phase


const EG_CRUSH_AMP = [0, 22, 34, 48];          // snake amplitude px per phase


const EG_CRUSH_TOUCH_PCT = [0, 0.22, 0.26, 0.32]; // direct-hit damage (% max HP)


const EG_CRUSH_DOT_PCT = [0, 9, 12, 15];       // outside-corridor DoT (% max HP / s)


const EG_CRUSH_ACTIVE_MS = [0, 11000, 11000, 12000];


const EG_CRUSH_TOUCH_COOLDOWN_MS = 900;


const EG_CRUSH_RESOLVE_MS = 500;


let _egCrushState = null; // active corridor or null


function _egCrushPhaseParams(phase) {
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    return {
        gap: EG_CRUSH_GAP[p],
        speed: EG_CRUSH_SPEED[p],
        amp: EG_CRUSH_AMP[p],
        touchPct: EG_CRUSH_TOUCH_PCT[p],
        dotPct: EG_CRUSH_DOT_PCT[p],
        activeMs: EG_CRUSH_ACTIVE_MS[p],
    };
}


// Interpolates a wall polyline at screen-x → wall y. Null when no coverage
// (walls haven't reached that x yet / already passed).
function _egCrushWallYAt(line, x) {
    if (!line || line.length === 0) return null;
    // Line is ordered newest-first (index 0 = at boss, rightmost).
    for (let i = 0; i < line.length - 1; i++) {
        const a = line[i], b = line[i + 1];
        const hi = Math.max(a.x, b.x), lo = Math.min(a.x, b.x);
        if (x <= hi && x >= lo) {
            const span = (hi - lo) || 1;
            const f = (hi - x) / span;
            return a.y + (b.y - a.y) * f;
        }
    }
    return null;
}


function _egCrushRectsOverlap(a, b) {
    return !!a && !!b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}


// Removes all corridor DOM + loop state. Safe to call anytime; called from
// _egBossCleanup on boss death / encounter stop.
function _egCrushTeardown() {
    const st = _egCrushState;
    _egCrushState = null;
    if (st) {
        if (st.raf) cancelAnimationFrame(st.raf);
        if (st.warnTimer) clearTimeout(st.warnTimer);
        if (st.resolveTimer) clearTimeout(st.resolveTimer);
    }
    ['eg-crush-layer', 'eg-crush-overlay', 'eg-crush-label'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.remove();
    });
}


function _egCrushGetPlayerRect() {
    if (typeof _egBlastGetPlayerRect === 'function') {
        const r = _egBlastGetPlayerRect();
        if (r && (r.width || r.height)) return r;
    }
    if (typeof _egHzPlayerHitbox === 'function') {
        const r = _egHzPlayerHitbox();
        if (r) return r;
    }
    return null;
}


function _egCrushEnsureLayer(st) {
    let layer = document.getElementById('eg-crush-layer');
    if (!layer) {
        layer = document.createElement('div');
        layer.id = 'eg-crush-layer';
        document.body.appendChild(layer);
    }
    if (!st.bossEl || !st.bossEl.isConnected) {
        const boss = document.createElement('div');
        boss.id = 'eg-crush-boss';
        boss.textContent = (st.emoji || '🧱');
        layer.appendChild(boss);
        st.bossEl = boss;
    }
    if (!st.overlayEl || !st.overlayEl.isConnected) {
        const ov = document.createElement('div');
        ov.id = 'eg-crush-overlay';
        document.body.appendChild(ov);
        st.overlayEl = ov;
    }
    if (!st.labelEl || !st.labelEl.isConnected) {
        const label = document.createElement('div');
        label.id = 'eg-crush-label';
        document.body.appendChild(label);
        st.labelEl = label;
    }
    // Position boss: slide-in from the right edge during warning (tier-scaled).
    const warnT = Math.min(1, (performance.now() - st.createdAt) / (st.params.warnMs || EG_CRUSH_WARN_MS));
    const startX = window.innerWidth + 80;
    const bx = startX + (st.bossX - startX) * Math.min(1, warnT * 1.15);
    st.bossEl.style.left = bx + 'px';
    st.bossEl.style.top = st.centerY + 'px';
    st.overlayEl.className = st.warnDone ? 'eg-crush-overlay-active' : 'eg-crush-overlay-warn';
    const labelKey = 'eg_crush_stay';
    const raw = (typeof t === 'function') ? t(labelKey) : '';
    st.labelEl.textContent = (raw && raw !== labelKey) ? raw : '↕ STAY BETWEEN THE WALLS ↕';
    st.labelEl.style.left = (window.innerWidth / 2) + 'px';
    st.labelEl.style.top = '12%';
}


// Syncs pooled block divs with the two polylines.
function _egCrushRenderBlocks(st) {
    let layer = document.getElementById('eg-crush-layer');
    if (!layer) return;
    const S = EG_CRUSH_BLOCK;
    const need = st.upper.length + st.lower.length;
    st.pool = st.pool || [];
    while (st.pool.length < need) {
        const d = document.createElement('div');
        d.className = 'eg-crush-block';
        layer.appendChild(d);
        st.pool.push(d);
    }
    let i = 0;
    const place = (p, isUpper) => {
        const el = st.pool[i++];
        el.style.display = '';
        el.style.transform = `translate(${Math.round(p.x - S / 2)}px, ${Math.round(p.y - S / 2)}px)`;
        el.classList.toggle('eg-crush-block-upper', !!isUpper);
        el.classList.toggle('eg-crush-block-hit', !!st.hitFlashUntil && performance.now() < st.hitFlashUntil);
    };
    st.upper.forEach(p => place(p, true));
    st.lower.forEach(p => place(p, false));
    for (let k = i; k < st.pool.length; k++) st.pool[k].style.display = 'none';
}


function _egCrushTick(now) {
    const st = _egCrushState;
    if (!st) return;
    // Freeze while paused / inactive / dead — keep lastTs fresh so resume doesn't jump.
    if ((typeof _gamePaused !== 'undefined' && _gamePaused)
        || (typeof _egIsActive === 'function' && !_egIsActive())
        || (typeof dead !== 'undefined' && dead)) {
        st.lastTs = now;
        st.raf = requestAnimationFrame(_egCrushTick);
        return;
    }
    // Boss gone (killed mid-corridor) → resolve early.
    if (typeof _egMonsters !== 'undefined' && !_egMonsters.find(m => m.id === st.monsterId)) {
        _egCrushFinish(true);
        return;
    }
    let dtS = (now - (st.lastTs || now)) / 1000;
    st.lastTs = now;
    if (!(dtS > 0)) { st.raf = requestAnimationFrame(_egCrushTick); return; }
    dtS = Math.min(dtS, 0.05);
    st.tActive += dtS * 1000;

    // Corridor center drifts slowly so the safe band itself travels up/down.
    st.centerY = st.centerBase
        + Math.sin(st.tActive / 1000 * 0.55) * Math.min(60, st.params.gap * 0.18);
    st.centerY = Math.max(120, Math.min(window.innerHeight - 120, st.centerY));

    // Advance existing blocks leftwards, cull off-screen.
    const dx = st.params.speed * dtS;
    [st.upper, st.lower].forEach(line => {
        for (const p of line) p.x -= dx;
        while (line.length && line[line.length - 1].x < -EG_CRUSH_BLOCK) line.pop();
    });

    // Spawn new head segments at the boss with the travelling snake offset.
    // Same-phase snake on both walls → the corridor snakes as a whole
    // (gap stays roughly constant, player must ride it up/down).
    st.distAcc += dx;
    while (st.distAcc >= EG_CRUSH_SPAWN_STEP) {
        st.distAcc -= EG_CRUSH_SPAWN_STEP;
        const t = st.tActive / 1000;
        const snake = Math.sin(t * 2.2) * st.params.amp
            + Math.sin(t * 3.7 + 1.3) * st.params.amp * 0.35;
        st.upper.unshift({ x: st.bossX, y: st.centerY - st.params.gap / 2 + snake });
        st.lower.unshift({ x: st.bossX, y: st.centerY + st.params.gap / 2 + snake });
    }

    _egCrushEnsureLayer(st);
    if (st.bossEl && st.bossEl.isConnected) {
        st.bossEl.style.left = st.bossX + 'px';
        st.bossEl.style.top = st.centerY + 'px';
    }
    _egCrushRenderBlocks(st);

    // ── Collision ───────────────────────────────────────────────
    const pr = _egCrushGetPlayerRect();
    if (pr) {
        const S = EG_CRUSH_BLOCK;
        const pad = 4; // slight forgiveness on block edges
        let touched = false;
        const testLine = (line) => {
            for (const p of line) {
                // Broadphase: skip blocks far from the player.
                if (p.x < pr.left - S || p.x > pr.right + S) continue;
                if (p.y < pr.top - S || p.y > pr.bottom + S) continue;
                if (_egCrushRectsOverlap(
                    { left: p.x - S / 2 + pad, right: p.x + S / 2 - pad, top: p.y - S / 2 + pad, bottom: p.y + S / 2 - pad },
                    pr)) { touched = true; break; }
            }
        };
        testLine(st.upper);
        if (!touched) testLine(st.lower);
        if (touched && now >= (st.touchCooldownUntil || 0)
            && typeof playerMaxHP !== 'undefined' && playerMaxHP > 0) {
            st.touchCooldownUntil = now + EG_CRUSH_TOUCH_COOLDOWN_MS;
            st.hitFlashUntil = now + 350;
            const damage = Math.max(1, Math.round(playerMaxHP * st.params.touchPct));
            const shielded = (typeof _egNkShieldUp === 'function') && _egNkShieldUp();
            const dealt = (typeof _egPlayerTakeDamage === 'function')
                ? _egPlayerTakeDamage(damage, true, 'lightning', st.monsterLevel, { isBossAbility: true }) : 0;
            if (dealt > 0 && typeof _egApplyPlayerHitFeedback === 'function') {
                try { _egApplyPlayerHitFeedback(dealt); } catch (e) {}
            }
            if (typeof _egNkAbilityHitToast === 'function') {
                _egNkLastHitAbsorbed = shielded && dealt <= 0;
                _egNkAbilityHitToast(dealt, 'The Vise', 'Crushing Walls');
            }
        }

        // Outside-corridor DoT: compare player center against wall Y at player X.
        const cx = pr.left + pr.width / 2;
        const cy = pr.top + pr.height / 2;
        const upY = _egCrushWallYAt(st.upper, cx);
        const loY = _egCrushWallYAt(st.lower, cx);
        // Only apply once walls actually cover the player's x (grace while sweeping in).
        const covered = (upY != null && loY != null);
        const outside = covered && (cy < upY + pr.height * 0.15 || cy > loY - pr.height * 0.15);
        st.outside = outside;
        if (st.overlayEl) st.overlayEl.classList.toggle('eg-crush-outside', !!outside);
        if (outside && typeof playerMaxHP !== 'undefined' && playerMaxHP > 0) {
            st.dotAcc = (st.dotAcc || 0) + (playerMaxHP * st.params.dotPct / 100) * dtS;
            st.dotToastAt = st.dotToastAt || 0;
            if (st.dotAcc >= Math.max(1, playerMaxHP * 0.01)) {
                const tick = Math.floor(st.dotAcc);
                st.dotAcc -= tick;
                if (typeof _egPlayerTakeDamage === 'function') _egPlayerTakeDamage(tick, true, 'lightning', st.monsterLevel, { isBossAbility: true });
            }
            if (now - st.dotToastAt > 2500) {
                st.dotToastAt = now;
                const dkey = 'eg_crush_dot';
                const draw = (typeof t === 'function') ? t(dkey) : '';
                const dmsg = (draw && draw !== dkey) ? draw : '⚡ Outside the corridor! Get back between the walls!';
                if (typeof showToast === 'function') showToast(dmsg, '#fb923c');
            }
        } else {
            st.dotAcc = 0;
        }
    }

    if (st.tActive >= st.params.activeMs) {
        _egCrushFinish(false);
        return;
    }
    st.raf = requestAnimationFrame(_egCrushTick);
}


function _egCrushFinish(silent) {
    const st = _egCrushState;
    if (!st) return;
    if (st.raf) cancelAnimationFrame(st.raf);
    st.raf = null;
    const layer = document.getElementById('eg-crush-layer');
    const overlay = document.getElementById('eg-crush-overlay');
    const label = document.getElementById('eg-crush-label');
    if (layer) layer.classList.add('eg-crush-done');
    if (overlay) overlay.classList.add('eg-crush-done');
    if (label) label.classList.add('eg-crush-done');
    st.resolveTimer = setTimeout(() => _egCrushTeardown(), EG_CRUSH_RESOLVE_MS);
    _egCrushState = null;
    // Null the handle AFTER capturing so double-finish can't double-teardown.
    if (!silent) { /* resolve flash plays via CSS, teardown follows */ }
}


// Main handler — called by the boss mechanic scheduler.
function _egMechCrushingWalls(monster, phase) {
    if (_egCrushState) return; // never stack corridors
    if (typeof _egActiveBlasts !== 'undefined' && _egActiveBlasts.size > 0) return; // yield to blasts
    if ((typeof _gamePaused !== 'undefined' && _gamePaused)) return;
    if (typeof _egIsActive === 'function' && !_egIsActive()) return;

    const params = _egCrushPhaseParams(phase);
    // Same difficulty curve as every other dodge mechanic: gentle tiers get
    // more warning + a slower, longer corridor; brutal tiers compress it.
    // Speed scales inversely (1/factor) so the wall's time-to-cross matches
    // the curve. Tier 8 is the anchor — factor 1.0, pre-scaling timing.
    const crushTimeF = _egBossTierFactor(_egBossTierNorm(monster), EG_NK_TIER_FACTOR);
    params.warnMs = Math.max(600, Math.round(EG_CRUSH_WARN_MS * crushTimeF));
    params.speed = Math.max(60, Math.round(params.speed / crushTimeF));
    params.activeMs = Math.round(params.activeMs * crushTimeF);
    // Damage companion: wall-touch %maxHP and outside-corridor DoT %/s scale
    // with tier like every other failed-dodge nk engine (tier 8 anchor ×1.0).
    const crushDmgF = _egBossTierFactor(_egBossTierNorm(monster), EG_NK_DAMAGE_TIER);
    params.touchPct = params.touchPct * crushDmgF;
    params.dotPct = params.dotPct * crushDmgF;
    const bossX = Math.round(window.innerWidth * 0.78);
    const centerBase = Math.round(window.innerHeight * 0.5);

    _egCrushState = {
        raf: null,
        warnTimer: null,
        resolveTimer: null,
        monsterId: monster ? monster.id : null,
        monsterLevel: monster ? monster.level : 1,
        emoji: (monster && monster.emoji) ? monster.emoji : '🧱',
        params,
        bossX,
        centerBase,
        centerY: centerBase,
        upper: [],
        lower: [],
        pool: [],
        bossEl: null,
        overlayEl: null,
        labelEl: null,
        tActive: -params.warnMs, // warning counts down inside the same loop clock
        distAcc: 0,
        dotAcc: 0,
        touchCooldownUntil: 0,
        hitFlashUntil: 0,
        warnDone: false,
        createdAt: performance.now(),
        lastTs: performance.now(),
        outside: false,
    };
    const st = _egCrushState;
    _egCrushEnsureLayer(st);

    const key = 'eg_mech_crushing_walls';
    const raw = (typeof t === 'function') ? t(key) : '';
    const msg = (raw && raw !== key) ? raw : '🧱 The Vise: Crushing Walls! Stay between the walls!';
    if (typeof showToast === 'function') showToast(msg);

    // Warning → active transition inside the same rAF clock (pause-safe:
    // tActive only advances while unpaused, warnDone flips at 0).
    const warnTick = (now) => {
        if (_egCrushState !== st) return;
        if ((typeof _gamePaused !== 'undefined' && _gamePaused)
            || (typeof _egIsActive === 'function' && !_egIsActive())) {
            st.lastTs = now;
            st.raf = requestAnimationFrame(warnTick);
            return;
        }
        let dtS = (now - (st.lastTs || now)) / 1000;
        st.lastTs = now;
        dtS = Math.max(0, Math.min(dtS, 0.05));
        st.tActive += dtS * 1000;
        _egCrushEnsureLayer(st);
        if (st.tActive >= 0) {
            st.warnDone = true;
            st.tActive = 0;
            st.lastTs = performance.now();
            st.raf = requestAnimationFrame(_egCrushTick);
            return;
        }
        st.raf = requestAnimationFrame(warnTick);
    };
    st.raf = requestAnimationFrame(warnTick);
}
