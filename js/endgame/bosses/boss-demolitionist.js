//------------------------------------------------------------------------
//-------------------BOSS: THE DEMOLITIONIST (boss_demolitionist)-------------------
//------------------------------------------------------------------------
// The Demolitionist — a three-act demolition show:
//   Phase 1 (100–75%) — corrupt cells + Sticky Bomb volleys (keep moving).
//   Phase 2 ( 75–50%) — a MEGA BOMB is lobbed onto the grid: a big
//                       telegraphed ring, then a huge detonation. Any
//                       corrupted cell caught inside its radius re-fuses
//                       and blows up a beat later (fire damage).
//   Phase 3 ( 50–25%) — TWO mega bombs land on separated spots you must
//                       slip between, plus a 5-bomb sticky volley lobbed
//                       at YOU roughly every 2 s — never stand still.
//   Phase 4 (≤ 25% )  — THE BOMB MAZE, a one-shot pinnacle set-piece:
//                       a serpentine corridor walled by solid bombs that
//                       detonate from the start and chase the player to
//                       the exit — with a giant SUPER BOMB hurled onto
//                       your start ~1s in that rolls the corridor behind
//                       the explosions and one-shots you if it catches
//                       you (auto-attack charge bar frozen).
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule + phase hook)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics (corrupt_cells, probability_shift, prior_bomb,
// frozen_cells, clue_swap, grid_invert, summons) live in
// shared-boss-abilities.js and are referenced by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_demolitionist: {
        id: 'boss_demolitionist', name: 'The Demolitionist', emoji: '💣',
        baseHP: 1080, baseDamage: 23, chargeMax: 12,
        element: 'fire', resistances: { fire: 30, cold: 15, lightning: 15, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_demolitionist: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.75, chargeMax: 10, damageMultiplier: 1.35 },
            { threshold: 0.50, chargeMax: 8, damageMultiplier: 1.70 },
            { threshold: 0.25, chargeMax: 6, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'sticky_bombs', intervalBase: 19000, intervalVariance: 4000, handler: '_egMechStickyBombs' },
            { name: 'big_bomb', intervalBase: 26000, intervalVariance: 6000, handler: '_egMechBigBomb', phase2Only: true },
            { name: 'corrupt_cells', intervalBase: 17000, intervalVariance: 4000, handler: '_egMechCorruptCells' },
        ],
        // Phase 4 (≤25% HP) hands the fight to the Bomb Maze until it
        // resolves — the boss owns its immunity release (Snail-style).
        onPhaseEnter: _egCrashOnPhaseEnter,
    },
});


// ── Shared tuning ───────────────────────────────────────────────────────────
const EG_CRASH_DMG = [0, 0.13, 0.15, 0.17];      // per small sticky bomb, by phase (p≥3 → 0.17)
const EG_CRASH_STICKY_BLAST_R = 96;              // small-bomb damage radius (px)

const EG_CRASH_MEGA_DMG = [0, 0, 0.22, 0.26];    // per mega bomb, by phase
const EG_CRASH_MEGA_WARN_MS = 1750;              // ring telegraph before detonation
const EG_CRASH_MEGA_BLAST_R = 185;               // mega-bomb damage radius (px)
const EG_CRASH_MEGA_R_MIN_PLAYER = 150;          // never arm closer than this to the avatar
const EG_CRASH_CELL_CHAIN_DMG = [0, 0, 0.16, 0.19];
const EG_CRASH_CELL_CHAIN_R = 150;               // corrupted-cell detonation radius (px)
const EG_CRASH_CELL_CHAIN_DELAY = [1100, 2000];  // ms window after the mega bomb pops


// Phase value tables are indexed by boss phase (clamped 1–3 for the rows
// that predate the new 4-phase structure).
function _egCrashP(phase) {
    return Math.max(1, Math.min(3, Number(phase) || 1));
}

function _egCrashRand(a, b) {
    return a + Math.random() * (b - a);
}

// Center of a grid cell (g-{r}-{c}) in viewport coords, or null.
function _egCrashCellCenter(r, c) {
    const el = document.getElementById('g-' + r + '-' + c);
    if (!el || !el.isConnected) return null;
    const b = el.getBoundingClientRect();
    if (!b.width || !b.height) return null;
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
}

// Center of the whole playable grid (from the corner cells), or null.
function _egCrashGridRect() {
    if (typeof cur === 'undefined' || !cur || !cur.grid || !cur.grid.length || !cur.grid[0]) return null;
    const rows = cur.grid.length;
    const cols = cur.grid[0].length;
    const a = document.getElementById('g-0-0');
    const b = document.getElementById('g-' + (rows - 1) + '-' + (cols - 1));
    if (!a || !b || !a.isConnected || !b.isConnected) return null;
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    if (!ra.width || !ra.height || !rb.width || !rb.height) return null;
    return { left: ra.left, top: ra.top, right: rb.right, bottom: rb.bottom, w: rb.right - ra.left, h: rb.bottom - ra.top };
}


// One shared explosion visual: fireball core + expanding shockwave ring +
// ember sparks, spawned as a body-level wrapper (left/top based) so the
// scale animations run on children and can never fight a translate().
// The wrapper is sized to `radius` — the REAL blast disc — so the flash
// and ring visibly mark the area that just hit. Pass pct > 0 to damage the
// player (fire %maxHP) when their hitbox overlaps the disc.
function _egCrashBoom(run, x, y, radius, pct, level, label) {
    const R = Math.max(10, radius);
    // Orphan booms (run == null) are not owned by an nk run, so they survive
    // the run being killed in the same frame (the super-bomb catch / end
    // detonation). The layer still self-removes ~0.9s below.
    let layer;
    if (run) layer = _egNkEl(run, 'div', 'eg-crash-burst');
    else {
        layer = document.createElement('div');
        layer.className = 'eg-crash-burst';
        document.body.appendChild(layer);
    }
    layer.style.left = Math.round(x - R) + 'px';
    layer.style.top = Math.round(y - R) + 'px';
    layer.style.width = (R * 2) + 'px';
    layer.style.height = (R * 2) + 'px';

    const core = document.createElement('div');
    core.className = 'eg-crash-core';
    layer.appendChild(core);
    const ring = document.createElement('div');
    ring.className = 'eg-crash-ring';
    layer.appendChild(ring);
    const sparks = 7;
    for (let i = 0; i < sparks; i++) {
        const s = document.createElement('div');
        s.className = 'eg-crash-spark';
        const ang = Math.random() * Math.PI * 2;
        const dist = _egCrashRand(R * 0.35, R * 1.15);
        s.style.setProperty('--dx', Math.round(Math.cos(ang) * dist) + 'px');
        s.style.setProperty('--dy', Math.round(Math.sin(ang) * dist) + 'px');
        s.style.animationDelay = _egCrashRand(0, 90) + 'ms';
        layer.appendChild(s);
    }
    setTimeout(() => { try { layer.remove(); } catch (e) {} }, 900);

    if (pct > 0) {
        const pr = _egNkPlayerRect();
        if (pr && _egNkCircleHit(x, y, R, pr, 0)) {
            const dealt = _egNkHit(pct, 'fire', level);
            _egNkAbilityHitToast(dealt, 'The Demolitionist', label);
        }
    }
}

// Places a visible bomb dot + its dashed danger ring at (x, y).
function _egCrashArmDot(run, x, y, cls, sizePx, ringR, text) {
    const el = _egNkEl(run, 'div', 'eg-nk-dot ' + cls, text || '💣');
    el.style.width = sizePx + 'px';
    el.style.height = sizePx + 'px';
    el.style.transform = 'translate(' + Math.round(x - sizePx / 2) + 'px,' + Math.round(y - sizePx / 2) + 'px)';
    const ring = _egNkEl(run, 'div', 'eg-crash-warn');
    ring.style.width = (ringR * 2) + 'px';
    ring.style.height = (ringR * 2) + 'px';
    ring.style.left = Math.round(x - ringR) + 'px';
    ring.style.top = Math.round(y - ringR) + 'px';
    return { el, ring };
}


//------------------------------------------------------------------------
//-------------------STICKY BOMBS (all phases)----------------------------
//------------------------------------------------------------------------
// Small bombs lobbed at the player's position — they "stick" where you
// were standing, so the only answer is to keep moving.
//   P1–P2 — three quick sticks around you (3 short volleys).
//   P3+   — five sticks, one lobbed every ~2 s at wherever you are right
//           then; every bomb shows its blast ring while it fuses.
function _egMechStickyBombs(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = _egCrashP(phase);
    const level = monster ? monster.level : 1;
    const run = _egNkNewRun(monster && monster.id, true);
    const count = p >= 3 ? 5 : 3;
    const dropGapMs = p >= 3 ? 2000 : 340;   // P3+: a throw roughly every 2 s
    const fuseMs = p >= 3 ? 1250 : 1500;
    const blastR = EG_CRASH_STICKY_BLAST_R;
    const dmgPct = EG_CRASH_DMG[p];
    const bombs = [];                        // index = bomb slot
    let t = -150;                            // ms since the cast (allows the loop to settle)

    _egNkToast('eg_mech_sticky', '💣 The Demolitionist: Sticky Bombs! Keep moving!', '#fb923c');

    _egNkLoop(run, (dtS) => {
        t += dtS * 1000;
        let pending = false;

        // Lob the next bomb(s) on schedule — each targets the avatar's
        // CURRENT position at throw time, so standing still = standing in
        // the next ring.
        for (let i = 0; i < count; i++) {
            if (bombs[i]) continue;
            if (t < i * dropGapMs) { pending = true; continue; }
            const c = _egNkPlayerCenter();
            const cx = c ? c.x : window.innerWidth / 2;
            const cy = c ? c.y : window.innerHeight / 2;
            const x = Math.max(50, Math.min(window.innerWidth - 50, cx + _egCrashRand(-55, 55)));
            const y = Math.max(60, Math.min(window.innerHeight - 60, cy + _egCrashRand(-55, 55)));
            bombs[i] = _egCrashArmDot(run, x, y, 'eg-nk-bomb eg-crash-mini', 44, blastR, '💣');
            bombs[i].x = x;
            bombs[i].y = y;
            bombs[i].t = 0;
            bombs[i].exploded = false;
        }

        const pr = _egNkPlayerRect();
        bombs.forEach(b => {
            if (!b) return;
            if (b.exploded) return;
            pending = true;
            b.t += dtS * 1000;
            // Fuse blink for the final stretch of the fuse.
            if (b.t >= fuseMs - 450 && !b.blink) {
                b.blink = true;
                if (b.el) b.el.classList.add('eg-nk-fuse');
            }
            if (b.t >= fuseMs) {
                b.exploded = true;
                if (b.ring) { try { b.ring.remove(); } catch (e) {} b.ring = null; }
                if (b.el) { try { b.el.remove(); } catch (e) {} b.el = null; }
                // Real detonation: the flash + ring are sized to the blast
                // radius so the danger area is readable.
                _egCrashBoom(run, b.x, b.y, blastR, dmgPct, level, 'Sticky Bombs');
            }
        });

        return pending || (count > 0 && t < (count - 1) * dropGapMs + fuseMs + 600);
    });
}


//------------------------------------------------------------------------
//-------------------MEGA BOMB (phase ≥ 2)--------------------------------
//------------------------------------------------------------------------
// A huge bomb is lobbed onto the GRID. A dashed ring the size of the real
// blast radius telegraphs the impact zone; when it detonates, corrupted
// cells caught inside the radius re-fuse for a beat and then blow up on
// their own (dispelling one before its fuse ends defuses it).
//   P2 — one mega bomb.   P3+ — two, kept far enough apart to thread.
function _egMechBigBomb(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = _egCrashP(phase);
    if (p < 2) return;
    const level = monster ? monster.level : 1;
    const run = _egNkNewRun(monster && monster.id, true);
    const count = p >= 3 ? 2 : 1;
    const blastR = EG_CRASH_MEGA_BLAST_R + (p >= 3 ? 10 : 0);
    const dmgPct = EG_CRASH_MEGA_DMG[p];
    const spots = _egCrashPickMegaSpots(count, blastR);
    const bombs = spots.map(s => {
        const armed = _egCrashArmDot(run, s.x, s.y, 'eg-crash-mega', 84, blastR, '💣');
        return { x: s.x, y: s.y, t: 0, exploded: false, armed };
    });

    _egNkToast('eg_mech_crash_mega',
        '💣 The Demolitionist: MEGA BOMB on the grid! Get clear of the ring!',
        '#f87171');

    let t = 0;
    const chainDelays = [];   // corrupted-cell detonation delays (ms after the boom)
    _egNkLoop(run, (dtS) => {
        t += dtS * 1000;
        let pending = false;
        bombs.forEach(b => {
            if (b.exploded) return;
            pending = true;
            if (t < EG_CRASH_MEGA_WARN_MS) return;
            b.exploded = true;
            if (b.armed) {
                if (b.armed.ring) { try { b.armed.ring.remove(); } catch (e) {} }
                if (b.armed.el) { try { b.armed.el.remove(); } catch (e) {} }
                b.armed = null;
            }
            // Main detonation — huge radius, heavy fire damage.
            _egCrashBoom(run, b.x, b.y, blastR, dmgPct, level, 'Mega Bomb');
            // Chain reaction: corrupted cells inside the blast re-fuse.
            _egCrashChainCells(run, b.x, b.y, blastR, level, p, chainDelays);
        });
        // Keep the run alive until the last delayed cell detonation has
        // fired (plus a short tail), so chain timers are never cancelled
        // by an early run teardown.
        if (pending) return true;
        const lastChain = chainDelays.length ? Math.max.apply(null, chainDelays) : 0;
        return t < EG_CRASH_MEGA_WARN_MS + Math.max(1000, lastChain + 900);
    });
}

// Picks `count` bomb landing spots biased near the avatar but on-grid, and
// kept far enough apart (and from the avatar) that a player never faces an
// overlapping double ring with no way out.
function _egCrashPickMegaSpots(count, blastR) {
    const spots = [];
    const minSep = blastR * 2 + 50;
    const pc = _egNkPlayerCenter();

    // Candidate cell centers (or viewport points when the grid is gone).
    const cands = [];
    if (typeof cur !== 'undefined' && cur && cur.grid) {
        const rows = cur.grid.length;
        const cols = cur.grid[0].length;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cc = _egCrashCellCenter(r, c);
                if (cc) cands.push(cc);
            }
        }
    }
    if (cands.length === 0) {
        for (let i = 0; i < 40; i++) {
            cands.push({ x: _egCrashRand(120, window.innerWidth - 120), y: _egCrashRand(140, window.innerHeight - 120) });
        }
    }

    // Score: prefer a ring 160–420 px from the player (threatening but
    // escapable). Fall back to anything after enough tries.
    const score = (s) => {
        if (!pc) return 0;
        const d = Math.hypot(s.x - pc.x, s.y - pc.y);
        return Math.abs(d - 280);
    };
    cands.sort((a, b) => score(a) - score(b));

    const okSpot = (s) => {
        if (pc && Math.hypot(s.x - pc.x, s.y - pc.y) < EG_CRASH_MEGA_R_MIN_PLAYER) return false;
        for (const ex of spots) {
            if (Math.hypot(s.x - ex.x, s.y - ex.y) < minSep) return false;
        }
        return true;
    };
    for (const s of cands) {
        if (spots.length >= count) break;
        if (okSpot(s)) spots.push({ x: Math.round(s.x), y: Math.round(s.y) });
    }
    // Extremely tight arenas: drop the separation requirement rather than
    // fire fewer bombs than the phase promises.
    let extra = 0;
    while (spots.length < count && extra < cands.length) {
        const s = cands[cands.length - 1 - extra];
        if (pc && Math.hypot(s.x - pc.x, s.y - pc.y) < 60) { extra++; continue; }
        spots.push({ x: Math.round(s.x), y: Math.round(s.y) });
        extra++;
    }
    return spots.slice(0, count);
}

// After a mega bomb pops: every corrupted cell inside `r` of (x, y) gets a
// pulsing fuse, then detonates on a short random delay (dispelled cells
// are saved). Each blast removes the corruption and deals fire damage.
// `chainDelays` (optional) collects each delay so the caller's run can stay
// alive until every detonation has fired.
function _egCrashChainCells(run, x, y, r, level, phase, chainDelays) {
    if (!_egBossCorrupted || _egBossCorrupted.size === 0) return;
    if (typeof cur === 'undefined' || !cur || !cur.grid) return;
    const p = Math.max(2, _egCrashP(phase));
    const rows = cur.grid.length;
    const cols = cur.grid[0].length;
    const inside = [];
    for (const key of Array.from(_egBossCorrupted.keys())) {
        const [cr, cc] = key.split('-').map(Number);
        if (cr < 0 || cc < 0 || cr >= rows || cc >= cols) continue;
        const ctr = _egCrashCellCenter(cr, cc);
        if (!ctr) continue;
        if (Math.hypot(ctr.x - x, ctr.y - y) <= r + EG_CRASH_CELL_CHAIN_R * 0.15) {
            inside.push({ key, cr, cc, ctr });
        }
    }
    if (inside.length === 0) return;

    inside.forEach((cell, i) => {
        const delay = EG_CRASH_CELL_CHAIN_DELAY[0]
            + Math.random() * (EG_CRASH_CELL_CHAIN_DELAY[1] - EG_CRASH_CELL_CHAIN_DELAY[0])
            + i * 120;
        if (Array.isArray(chainDelays)) chainDelays.push(delay);
        const fuseEl = document.createElement('span');
        fuseEl.className = 'eg-crash-cell-fuse';
        fuseEl.textContent = '💥';
        const host = document.getElementById('g-' + cell.cr + '-' + cell.cc);
        if (host) host.appendChild(fuseEl);
        const timer = setTimeout(() => {
            try { fuseEl.remove(); } catch (e) {}
            // Dispelled (or otherwise gone) before the fuse ran out → saved.
            if (!_egBossCorrupted || !_egBossCorrupted.has(cell.key)) return;
            // The run may have died (boss death / cleanup) — never append
            // visuals to a torn-down run.
            if (!_egNkRuns.has(run.id)) return;
            if (typeof _egRemoveCellCorruption === 'function') {
                try { _egRemoveCellCorruption(cell.key); } catch (e) {}
            }
            _egCrashBoom(run, cell.ctr.x, cell.ctr.y,
                EG_CRASH_CELL_CHAIN_R, EG_CRASH_CELL_CHAIN_DMG[p], level, 'Corrupted Cell');
        }, delay);
        run.timers.push(timer);
        // Independent watcher: even if the run is killed before this cell
        // detonates, the fuse visual never outlives its own window.
        setTimeout(() => { try { fuseEl.remove(); } catch (e) {} }, delay + 800);
    });
}


//------------------------------------------------------------------------
//-------------------THE BOMB MAZE (phase 4 finisher)---------------------
//------------------------------------------------------------------------
// One-shot pinnacle (like The Snail's Snailgeddon). On crossing ≤25% HP:
//   1. Boss goes immune; the auto-attack charge bar freezes.
//   2. A 5…1 countdown covers the arena.
//   3. The player is dropped at the top-left of a serpentine corridor
//      walled by SOLID bombs (you cannot walk through them, and touching
//      one hurts). A faint arrow underfoot shows the single path.
//   4. Bombs detonate from the start and chase you down the corridor —
//      run! ~1s in, the boss hurls a SUPER BOMB onto your start that rolls
//      the corridor behind the explosions: it never stops, and if it
//      catches you it's instant defeat. Reaching the exit triggers a
//      full-maze fireworks finale — the super bomb rolls on and detonates
//      there as the closing bang — and the set-piece ends.
// The boss owns its immunity for the whole set-piece and only releases it
// (and resumes its phase-4 schedule) when the maze resolves.
//------------------------------------------------------------------------

const EG_CRASH_MAZE_CD_MS = 800;              // per countdown tick
const EG_CRASH_MAZE_TICKS = 5;                // 5 … 1
const EG_CRASH_MAZE_GRACE_MS = 1300;          // wave waits this long at the start
// Chase speed (~87% of the avatar's 320 px/s top speed, tier-scaled clock).
// Slow enough that a moving player always gains ground, fast enough that the
// detonation wave rides their heels the whole corridor: standing still for
// ~1.3 s lets it catch you; a clean sprint finishes with the wave ~1.5 s
// (3-4 tiles of popping bombs) behind you at the goal.
const EG_CRASH_MAZE_WAVE_PXPS = 280;
const EG_CRASH_MAZE_WALL_DMG_PCT = 0.09;      // contact damage per wall bump
const EG_CRASH_MAZE_BLAST_DMG_PCT = 0.14;     // caught-in-the-wave damage
const EG_CRASH_MAZE_HIT_CD_MS = 800;          // shared cooldown for maze damage
const EG_CRASH_MAZE_CONTACT_PAD_PX = 7;       // forgiveness for wall contact
const EG_CRASH_MAZE_BLAST_R_MULT = 1.3;       // wave blast radius × pitch
const EG_CRASH_MAZE_PAD = 70;                 // maze sits this far outside the grid
const EG_CRASH_MAZE_PITCH_TARGET = 138;       // preferred corridor tile pitch
const EG_CRASH_MAZE_PITCH_MIN = 104;          // smallest pitch before shrinking the maze
const EG_CRASH_MAZE_PITCH_ABS_MIN = 92;       // hard floor (tiny screens)
const EG_CRASH_MAZE_REGION_MIN_W = 560;
const EG_CRASH_MAZE_REGION_MIN_H = 420;
const EG_CRASH_MAZE_FINALE_WALL_MS = 42;      // cascade spacing during the finale
const EG_CRASH_MAZE_FINALE_TAIL_MS = 900;     // hold after the last cascade pop

// ── The SUPER BOMB ────────────────────────────────────────────────────────
// ~1s after the maze starts, the boss hurls a giant bomb onto the START
// tile (where the player just was). It then rolls the corridor along the
// path at the SAME tier-scaled speed as the wall detonations (which pop
// right behind it as it passes) and never slows down: if its leading edge
// reaches the player, that's instant defeat. Outrun it to the goal; once
// the maze resolves it keeps rolling and detonates at the end as the
// finale's closing bang.
const EG_CRASH_SUPER_DROP_MS = 1000;     // internal-clock ms after GO: slams onto the start tile
const EG_CRASH_SUPER_FALL_PX = 420;      // spawn height above the start (falling telegraph)
const EG_CRASH_SUPER_SIZE_MULT = 1.18;   // bomb diameter × tile pitch (giant)
const EG_CRASH_SUPER_CATCH_MULT = 0.75;  // along-path gap (× pitch) at which it catches you
const EG_CRASH_SUPER_BOOM_MULT = 2.4;    // catch / end-of-maze detonation radius × pitch

let _egCrashMaze = null;
// { monsterId, phase: 'countdown'|'run'|'finale', cdTimer, overlay, banner,
//   tint, shieldCard, finished, startedAt, wT, wavePx, walls, floors,
//   path, goal, P, hitCdUntil, ... }

// True from countdown start until the maze resolves. Read by _egTickPlayer
// (endgame-encounter.js) to freeze the auto-attack charge bar.
function _egCrashMazeActive() {
    return !!_egCrashMaze && !_egCrashMaze.finished;
}

// Toggles the charge-bar pause style (visual twin of the charge freeze).
function _egCrashSetChargePause(active) {
    const bar = document.getElementById('avatar-charge-fill');
    if (bar) bar.classList.toggle('eg-charge-paused', !!active);
    const alt = document.getElementById('eg-player-charge-bar');
    if (alt) alt.classList.toggle('eg-charge-paused', !!active);
}

// Card shield: amber/red "immune dome" over the boss while the maze runs,
// so the long immunity is readable at a glance (same pattern as Snail).
function _egCrashMazeSetShield(on) {
    if (!_egCrashMaze) return;
    const card = document.getElementById('eg-card-' + _egCrashMaze.monsterId);
    const wrap = card ? (card.querySelector('.eg-emoji-wrapper') || card) : null;
    if (wrap) wrap.classList.toggle('eg-nk-shielded', !!on);
}

// Arena rect for the maze: the puzzle grid inflated by a pad (falling back
// to a large viewport zone when the grid is tiny or missing), clamped to
// the screen with room for the top HUD.
function _egCrashMazeRegion() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const g = _egCrashGridRect();
    let bw = g ? g.w : 0;
    let bh = g ? g.h : 0;
    if (!g || bw < EG_CRASH_MAZE_REGION_MIN_W || bh < EG_CRASH_MAZE_REGION_MIN_H) {
        bw = Math.max(bw, Math.min(vw - 80, 900));
        bh = Math.max(bh, Math.min(vh - 200, 560));
    }
    bw = Math.min(bw + EG_CRASH_MAZE_PAD * 2, vw - 24);
    bh = Math.min(bh + EG_CRASH_MAZE_PAD * 2, vh - 130);
    bw = Math.max(bw, EG_CRASH_MAZE_REGION_MIN_W);
    bh = Math.max(bh, EG_CRASH_MAZE_REGION_MIN_H);
    bw = Math.min(bw, vw - 24);
    bh = Math.min(bh, vh - 140);
    bw = Math.max(bw, Math.min(EG_CRASH_MAZE_REGION_MIN_W, vw - 24));
    bh = Math.max(bh, Math.min(EG_CRASH_MAZE_REGION_MIN_H, vh - 140));
    const wantX = g ? (g.left + g.right) / 2 : vw / 2;
    const wantY = g ? (g.top + g.bottom) / 2 : (vh - 90) / 2;
    // Center the arena so the whole maze (region bw × bh) stays on screen.
    const cx = Math.max(bw / 2 + 14, Math.min(vw - bw / 2 - 14, wantX));
    const cy = Math.max(bh / 2 + 40, Math.min(vh - bh / 2 - 40, wantY));
    return { cx, cy, bw, bh };
}

// Fits the serpentine tile grid into the arena. Returns pitch P, corridor
// count C and interior row count R (the maze is 2C+1 lanes × R+2 rows).
function _egCrashMazeGeometry(region) {
    let C = 3;
    let R = Math.max(3, Math.min(6, Math.round((region.bh - 2 * EG_CRASH_MAZE_PITCH_TARGET) / EG_CRASH_MAZE_PITCH_TARGET)));
    let P = Math.min(EG_CRASH_MAZE_PITCH_TARGET,
        Math.floor(region.bw / (2 * C + 1)),
        Math.floor(region.bh / (R + 2)));
    // Shrink the layout when the arena is cramped.
    while (P < EG_CRASH_MAZE_PITCH_MIN && (C > 2 || R > 3)) {
        if (R > 3) R--;
        else C--;
        P = Math.min(EG_CRASH_MAZE_PITCH_TARGET,
            Math.floor(region.bw / (2 * C + 1)),
            Math.floor(region.bh / (R + 2)));
    }
    P = Math.max(EG_CRASH_MAZE_PITCH_ABS_MIN, P);
    return { P, C, R, lanes: 2 * C + 1, rows: R + 2 };
}

// Builds the serpentine path over the lane/row grid. Lane 0 is a border
// wall; corridor lanes are odd (1, 3, …); wall lanes between them carry a
// single "door" gap at the turn row. Returns { path, walls } where path is
// an ordered list of {x, y, lane, row, dir} tiles and walls are {x, y}
// tile centers not on the path (each tagged with the path index of its
// nearest path tile — that index drives the chase explosion wave).
// Expects g.lanes / g.rows (set by _egCrashMazeGo) alongside g.P.
function _egCrashMazeBuild(g) {
    const { P, lanes, rows } = g;
    const R = rows - 2; // interior rows (1 .. R, borders at 0 and rows-1)
    const x0 = g.originX + P / 2;
    const y0 = g.originY + P / 2;
    const tileAt = (lane, row) => ({
        x: Math.round(x0 + lane * P),
        y: Math.round(y0 + row * P),
        lane, row,
    });

    const path = [];
    const pathIdx = {}; // "lane,row" -> path order
    // Corridor lanes walk vertically, alternating direction.
    const firstLane = 1;
    const lastLane = lanes - 2; // lanes-1 is the right border
    let lane = firstLane;
    let dir = 1; // 1 = down, -1 = up
    let row = 1; // interior start row (top)
    while (lane <= lastLane) {
        for (let i = 0; i < R; i++) {
            const t = tileAt(lane, row);
            pathIdx[lane + ',' + row] = path.length;
            path.push({ x: t.x, y: t.y, lane, row });
            row += dir;
        }
        row -= dir; // back inside after the run
        if (lane < lastLane) {
            // Door through the next wall lane at the far end (row already
            // sits on the far interior row after the step-back above).
            const gapLane = lane + 1;
            const gapRow = row;
            const t = tileAt(gapLane, gapRow);
            pathIdx[gapLane + ',' + gapRow] = path.length;
            path.push({ x: t.x, y: t.y, lane: gapLane, row: gapRow });
            lane += 2;
            dir *= -1;
        } else {
            lane += 2;
        }
    }
    // Direction hint per path tile (for the underfoot arrows).
    for (let i = 0; i < path.length - 1; i++) {
        const a = path[i], b = path[i + 1];
        a.dir = (b.y < a.y) ? 'up' : ((b.y > a.y) ? 'down' : ((b.x > a.x) ? 'right' : 'left'));
    }

    // Walls: every tile not on the path, tagged with the nearest path index.
    const walls = [];
    for (let lane = 0; lane < lanes; lane++) {
        for (let row = 0; row < rows; row++) {
            const key = lane + ',' + row;
            if (pathIdx[key] != null) continue;
            const t = tileAt(lane, row);
            // Nearest path index by Manhattan distance.
            let best = Infinity;
            let bestI = 0;
            for (let i = 0; i < path.length; i++) {
                const d = Math.abs(path[i].lane - lane) + Math.abs(path[i].row - row);
                if (d < best) { best = d; bestI = i; }
            }
            walls.push({ x: t.x, y: t.y, lane, row, nearest: bestI, gone: false });
        }
    }
    return { path, walls, pathIdx };
}

// Phase-enter hook: phase 4 (≤25% HP) is the Bomb Maze takeover.
function _egCrashOnPhaseEnter(monster, newPhase) {
    if (newPhase !== 4) return false;
    try {
        _egCrashMazeStart(monster);
    } catch (e) {
        // A buggy start must never wedge the boss immune forever.
        try { _egCrashMazeEnd(_egCrashMaze); } catch (e2) {}
        if (monster && monster.bossImmune) {
            monster.bossImmune = false;
            try { _egBossScheduleMechanics(monster, 4); } catch (e3) {}
        }
    }
    return true; // take over the phase either way
}

// Starts the countdown; the boss stays immune (set by the phase
// transition) until the whole set-piece finishes.
function _egCrashMazeStart(monster) {
    if (_egCrashMaze || !monster) return;

    // No half-finished hazards of our own during the set-piece: kill any
    // other Demolitionist dodge runs (sticky volleys, mega bombs).
    Array.from(_egNkRuns.values()).forEach(r => {
        if (r.bossId === monster.id) { try { _egNkKillRun(r); } catch (e) {} }
    });

    // The auto-attack charge bar freezes for the whole set-piece —
    // countdown included. The gate lives in _egTickPlayer.
    _egCrashSetChargePause(true);

    const g = {
        monsterId: monster.id,
        phase: 'countdown',
        cdTimer: null,
        overlay: null,
        banner: null,
        tint: null,
        finished: false,
        count: EG_CRASH_MAZE_TICKS,
        region: _egCrashMazeRegion(),
        run: null,
        walls: [],
        path: [],
        goal: null,
        P: EG_CRASH_MAZE_PITCH_TARGET,
        wT: 0,
        wavePx: 0,
        startedAt: 0,
        finaleAt: 0,
        cascadeI: 0,
        cascadeT: 0,
        won: false,
        super: null,      // SUPER BOMB chase state, built in _egCrashMazeGo
        offL: 0,
        offT: 0,
    };
    _egCrashMaze = g;
    _egCrashMazeSetShield(true);
    _egCrashMazeShowOverlay(g);
    _egNkToast('eg_mech_crash_maze_cd',
        '💣 The Demolitionist: BOMB MAZE IN 5…1 — the corridor is the only safe place!',
        '#fb923c');

    g.cdTimer = setInterval(() => {
        if (!_egCrashMaze || _egCrashMaze !== g || g.finished) return;
        if (_egNkFrozen()) return; // pause / death / inactive hold the count
        g.count--;
        if (g.count <= 0) {
            clearInterval(g.cdTimer);
            g.cdTimer = null;
            _egCrashMazeGo(g, monster);
            return;
        }
        const num = g.overlay && g.overlay.querySelector('.eg-crash-cd-num');
        if (num) {
            num.textContent = g.count;
            // Restart the pop animation on each tick.
            num.classList.remove('eg-crash-cd-pop');
            void num.offsetWidth;
            num.classList.add('eg-crash-cd-pop');
        }
    }, EG_CRASH_MAZE_CD_MS);
}

// Countdown finished: drop the player at the top-left, build the maze and
// start the chase.
function _egCrashMazeGo(g, monster) {
    if (!g || g.finished) return;
    g.phase = 'run';
    g.region = _egCrashMazeRegion();
    if (g.overlay) { try { g.overlay.remove(); } catch (e) {} g.overlay = null; }

    const geom = _egCrashMazeGeometry(g.region);
    const lanes = geom.lanes;
    const rows = geom.rows;
    const mazeW = lanes * geom.P;
    const mazeH = rows * geom.P;
    g.P = geom.P;
    g.geom = geom;
    g.lanes = lanes;
    g.rows = rows;
    g.originX = Math.round(g.region.cx - mazeW / 2);
    g.originY = Math.round(g.region.cy - mazeH / 2);
    _egCrashMazeShowBanner(g);

    const built = _egCrashMazeBuild(g);
    g.path = built.path;
    g.walls = built.walls;
    g.goal = g.path[g.path.length - 1];
    const level = monster ? monster.level : 1;

    // Teleport the player onto the start tile (top-left inside the maze),
    // then measure the wrapper↔hitbox offset once for clamping. The first
    // placement lands the WRAPPER's corner; a centre re-measure corrects
    // the HP-bar offset above the sprite (same trick as the Snail).
    const start = g.path[0];
    if (typeof _egTeleportAvatarTo === 'function') {
        const pr = _egNkPlayerRect();
        const bw = pr ? pr.width / 2 : 22;
        const bh = pr ? pr.height / 2 : 22;
        try {
            _egTeleportAvatarTo(start.x - bw, start.y - bh);
            const pc = _egNkPlayerCenter();
            if (pc) _egTeleportAvatarTo(start.x - bw + (start.x - pc.x), start.y - bh + (start.y - pc.y));
        } catch (e) {}
    }
    const pr0 = _egNkPlayerRect();
    const el0 = document.getElementById('player-avatar-wrapper')
        || document.getElementById('player-avatar-simple');
    if (pr0 && el0) {
        const er = el0.getBoundingClientRect();
        g.offL = er.left - pr0.left;
        g.offT = er.top - pr0.top;
    }

    // Floor tiles (arrows) + wall bombs.
    const run = _egNkNewRun(g.monsterId, true);
    g.run = run;
    // Any kill path (boss death, encounter stop, loop exit) resolves the
    // whole set-piece: charge bar back, overlays gone, immunity released
    // (only if the boss is still around to care).
    run.onKill = () => {
        if (_egCrashMaze === g) { try { _egCrashMazeEnd(g); } catch (e) {} }
    };
    g.startedAt = performance.now();
    g.wT = 0;

    const ARROW = { up: '↑', down: '↓', right: '→', left: '←' };
    g.path.forEach((t, i) => {
        const floorCls = 'eg-nk-dot eg-crash-floor'
            + (i === 0 ? ' eg-crash-floor-start' : '')
            + (i === g.path.length - 1 ? ' eg-crash-goal' : '');
        const floor = _egNkEl(run, 'div', floorCls);
        floor.style.width = (g.P * 0.9) + 'px';
        floor.style.height = (g.P * 0.9) + 'px';
        floor.style.transform = 'translate(' + Math.round(t.x - g.P * 0.45) + 'px,' + Math.round(t.y - g.P * 0.45) + 'px)';
        if (i === 0) floor.textContent = '⬇';                 // start: go down
        else if (i === g.path.length - 1) floor.textContent = '🏁'; // exit marker
        else floor.textContent = ARROW[t.dir] || '·';
        t.floor = floor;
    });

    g.walls.forEach(w => {
        const size = Math.max(52, Math.round(g.P * 0.62));
        const el = _egNkEl(run, 'div', 'eg-nk-dot eg-crash-wall', '💣');
        el.style.width = size + 'px';
        el.style.height = size + 'px';
        el.style.transform = 'translate(' + Math.round(w.x - size / 2) + 'px,' + Math.round(w.y - size / 2) + 'px)';
        w.el = el;
    });

    // ── SUPER BOMB: spawns high above the start tile, slams down ~1s in,
    // then rolls the corridor after the player for the rest of the maze.
    // Run-owned, so every kill path (death, encounter stop, teardown)
    // removes it with everything else.
    const supStart = _egCrashSuperPos(g, 0);
    const supSize = Math.max(96, Math.round(g.P * EG_CRASH_SUPER_SIZE_MULT));
    const supEl = _egNkEl(run, 'div', 'eg-crash-super eg-crash-super-falling', '💣');
    supEl.style.width = supSize + 'px';
    supEl.style.height = supSize + 'px';
    supEl.style.fontSize = Math.round(supSize * 0.94) + 'px';
    supEl.style.left = Math.round(supStart.x - supSize / 2) + 'px';
    supEl.style.top = Math.round(supStart.y - EG_CRASH_SUPER_FALL_PX - supSize / 2) + 'px';
    const supWarn = _egNkEl(run, 'div', 'eg-crash-warn eg-crash-super-warn');
    const warnR = g.P * 1.35;
    supWarn.style.width = (warnR * 2) + 'px';
    supWarn.style.height = (warnR * 2) + 'px';
    supWarn.style.left = Math.round(supStart.x - warnR) + 'px';
    supWarn.style.top = Math.round(supStart.y - warnR) + 'px';
    g.super = {
        el: supEl, warn: supWarn, size: supSize,
        landed: false, done: false, caught: false,
        rollPx: 0, fallX: supStart.x, fallY: supStart.y,
    };

    _egNkToast('eg_mech_crash_maze_go',
        '💣💥 BOMB MAZE — RUN! The bombs behind you are going off!',
        '#f87171');

    // One hit cooldown shared by wall contact AND wave blasts, so a player
    // caught in several overlapping detonations never melts in a single
    // frame (mirrors the Snail ring's global cooldown).
    let nextHitAt = performance.now() + 500;

    _egNkLoop(run, (dtS, now) => {
        if (!_egCrashMaze || _egCrashMaze !== g || g.finished) return false;
        const pr = _egNkPlayerRect();
        const pc = pr ? { x: (pr.left + pr.right) / 2, y: (pr.top + pr.bottom) / 2 } : null;
        const pathLenPx = (g.path.length - 1) * g.P;

        // ── Finale already running → just animate the cascade, then end. ──
        if (g.phase === 'finale') {
            g.cascadeT += dtS * 1000;
            // The super bomb keeps rolling through the finale and detonates
            // at the goal as the closing bang (pure spectacle — the outcome
            // was decided when the player crossed the exit or got caught).
            const supFin = g.super;
            if (supFin && !supFin.done && !supFin.caught) {
                if (!supFin.landed) _egCrashSuperLand(g, level);
                supFin.rollPx = Math.min(pathLenPx, supFin.rollPx + dtS * EG_CRASH_MAZE_WAVE_PXPS);
                const pFin = _egCrashSuperMove(g);
                if (supFin.rollPx >= pathLenPx) {
                    supFin.done = true;
                    if (supFin.el) { try { supFin.el.remove(); } catch (e) {} supFin.el = null; }
                    _egCrashBoom(null, pFin.x, pFin.y, g.P * EG_CRASH_SUPER_BOOM_MULT, 0, level, '');
                }
            }
            while (g.cascadeI < g.walls.length
                && g.cascadeT >= g.cascadeI * EG_CRASH_MAZE_FINALE_WALL_MS) {
                const w = g.walls[g.cascadeI];
                g.cascadeI++;
                if (w.gone) continue;
                w.gone = true;
                if (w.el) { try { w.el.remove(); } catch (e) {} w.el = null; }
                // Pure spectacle — no damage checks. Every remaining bomb
                // goes up exactly as big as the chase detonations (the real
                // blast disc), so the fireworks read as "all of those bombs".
                _egCrashBoom(run, w.x, w.y, g.P * EG_CRASH_MAZE_BLAST_R_MULT, 0, level, 'Bomb Maze');
            }
            if (g.cascadeI >= g.walls.length
                && g.cascadeT >= g.walls.length * EG_CRASH_MAZE_FINALE_WALL_MS + EG_CRASH_MAZE_FINALE_TAIL_MS
                && (!g.super || g.super.done || g.super.caught)) {
                _egCrashMazeEnd(g);
                return false;
            }
            return true;
        }

        // ── Solid wall collision: never walk above a bomb. ───────────────
        // Resolve against every intact wall tile with an axis-separated
        // push-out; contact (with a little forgiveness) deals damage on a
        // shared cooldown. The push reuses the wrapper↔hitbox offset
        // measured at spawn.
        let contact = false;
        if (pr) {
            let dL = pr.left, dT = pr.top, dR = pr.right, dB = pr.bottom;
            for (const w of g.walls) {
                if (w.gone) continue;
                const half = g.P / 2;
                const tL = w.x - half, tT = w.y - half, tR = w.x + half, tB = w.y + half;
                const ovW = Math.min(dR, tR) - Math.max(dL, tL);
                const ovH = Math.min(dB, tB) - Math.max(dT, tT);
                if (ovW <= 0 || ovH <= 0) continue;
                contact = true;
                if (ovW < ovH) {
                    const sign = ((dL + dR) / 2 < w.x) ? -1 : 1;
                    dL += sign * ovW; dR += sign * ovW;
                } else {
                    const sign = ((dT + dB) / 2 < w.y) ? -1 : 1;
                    dT += sign * ovH; dB += sign * ovH;
                }
            }
            if (contact) {
                // Damage on contact (generous overlap test catches sub-frame
                // penetration from WASD writes).
                const pad = EG_CRASH_MAZE_CONTACT_PAD_PX;
                const testL = pr.left - pad, testR = pr.right + pad;
                const testT = pr.top - pad, testB = pr.bottom + pad;
                let touched = false;
                for (const w of g.walls) {
                    if (w.gone) continue;
                    const half = g.P / 2;
                    if (testL < w.x + half && testR > w.x - half
                        && testT < w.y + half && testB > w.y - half) { touched = true; break; }
                }
                if (touched && now >= nextHitAt) {
                    nextHitAt = now + EG_CRASH_MAZE_HIT_CD_MS;
                    const dealt = _egNkHit(EG_CRASH_MAZE_WALL_DMG_PCT, 'fire', level);
                    _egNkAbilityHitToast(dealt, 'The Demolitionist', 'Bomb Maze Walls');
                }
                if (dL !== pr.left || dT !== pr.top || dR !== pr.right || dB !== pr.bottom) {
                    const x = dL + g.offL;
                    const y = dT + g.offT;
                    if (typeof _egTeleportAvatarTo === 'function') {
                        try { _egTeleportAvatarTo(x, y); } catch (e) {}
                    }
                }
            }
        }

        // ── Chase wave: wall bombs explode from the start onward. ────────
        g.wT += dtS * 1000;
        if (g.wT > EG_CRASH_MAZE_GRACE_MS) {
            g.wavePx = (g.wT - EG_CRASH_MAZE_GRACE_MS) * EG_CRASH_MAZE_WAVE_PXPS / 1000;
        }
        const frontIdx = Math.floor(g.wavePx / g.P);
        if (g.wavePx > 0) {
            let popped = false;
            for (const w of g.walls) {
                if (w.gone) continue;
                if (w.nearest * g.P <= g.wavePx) {
                    popped = true;
                    w.gone = true;
                    if (w.el) { try { w.el.remove(); } catch (e) {} w.el = null; }
                    if (pr && pc && now >= nextHitAt) {
                        const dmgR = g.P * EG_CRASH_MAZE_BLAST_R_MULT;
                        if (Math.hypot(w.x - pc.x, w.y - pc.y) <= dmgR) {
                            nextHitAt = now + EG_CRASH_MAZE_HIT_CD_MS;
                            const dealt = _egNkHit(EG_CRASH_MAZE_BLAST_DMG_PCT, 'fire', level);
                            _egNkAbilityHitToast(dealt, 'The Demolitionist', 'Bomb Maze');
                        }
                    }
                    // Visual matches the lethal disc (1.3×P) so the pop
                    // honestly shows the area that would have hurt you.
                    _egCrashBoom(run, w.x, w.y, g.P * EG_CRASH_MAZE_BLAST_R_MULT, 0, level, '');
                }
            }
            // Keep the front moving; wave done = let the finale finish it.
            if (frontIdx >= g.path.length - 1 && !popped && g.wavePx > pathLenPx + g.P) {
                _egCrashMazeFinale(g, false);
                return true;
            }
        }

        // ── SUPER BOMB: slams onto the start ~1s after GO, then rolls the
        // corridor ahead of the wall-detonation front. Reaching the end of
        // the maze means it auto-explodes there — the player should have
        // crossed the goal by then (the win check below) or been caught.
        const supRun = g.super;
        if (supRun && !supRun.done && !supRun.caught) {
            if (!supRun.landed) {
                if (g.wT >= EG_CRASH_SUPER_DROP_MS) {
                    _egCrashSuperLand(g, level);
                } else {
                    // Falling telegraph: accelerate from above onto the
                    // start tile (the whole maze's clock pauses together,
                    // so a pause/freeze holds the bomb in the sky too).
                    const frac = g.wT / EG_CRASH_SUPER_DROP_MS;
                    const ease = frac * frac;
                    const y = supRun.fallY - EG_CRASH_SUPER_FALL_PX * (1 - ease);
                    if (supRun.el) supRun.el.style.top = Math.round(y - supRun.size / 2) + 'px';
                }
            }
            if (supRun.landed) {
                supRun.rollPx = Math.min(pathLenPx,
                    (g.wT - EG_CRASH_SUPER_DROP_MS) * EG_CRASH_MAZE_WAVE_PXPS / 1000);
                const pRun = _egCrashSuperMove(g);
                if (supRun.rollPx >= pathLenPx) {
                    // Auto-explode at the end of the maze. The goal-win check
                    // below normally fires first; this is the deterministic
                    // resolution for anyone still short of the exit.
                    supRun.done = true;
                    if (supRun.el) { try { supRun.el.remove(); } catch (e) {} supRun.el = null; }
                    _egCrashBoom(null, pRun.x, pRun.y, g.P * EG_CRASH_SUPER_BOOM_MULT, 0, level, '');
                    if (!g.won) {
                        _egCrashMazeFinale(g, false);
                        return true;
                    }
                }
            }
        }

        // ── Reached the exit → full-maze fireworks finale. ───────────────
        if (pc && !g.won) {
            const d = Math.hypot(pc.x - g.goal.x, pc.y - g.goal.y);
            if (d <= g.P * 0.55) {
                g.won = true;
                _egCrashMazeFinale(g, true);
                return true;
            }
        }

        // ── SUPER BOMB catch: if its leading edge reaches you, it's over. ──
        // Checked AFTER the goal reach above, so crossing the line always
        // beats being caught at the tape (a photo finish is a win).
        const supCatch = g.super;
        if (supCatch && !supCatch.done && !supCatch.caught && supCatch.landed && pc && !g.won) {
            const playerPx = _egCrashPlayerPathPx(g, pc.x, pc.y);
            if (playerPx - supCatch.rollPx <= g.P * EG_CRASH_SUPER_CATCH_MULT) {
                _egCrashSuperCatch(g, level);
                return false; // one-hit defeat — the run is over
            }
        }

        // Hard safety net: even a frozen/stalled player never holds the
        // boss immune forever.
        if (g.wT > EG_CRASH_MAZE_GRACE_MS + 24000) {
            _egCrashMazeFinale(g, false);
            return true;
        }
        return true;
    });
}

// ── SUPER BOMB helpers ─────────────────────────────────────────────────────

// X/Y of the corridor centre at `px` along the path (0 = start tile centre,
// (path.length-1)*P = the goal tile centre). The path is Manhattan — every
// consecutive tile sits exactly one pitch away on a single axis — so a lerp
// along the segment is exact.
function _egCrashSuperPos(g, px) {
    const path = g.path, P = g.P;
    const maxPx = (path.length - 1) * P;
    const q = Math.max(0, Math.min(maxPx, px));
    const i = Math.min(path.length - 2, Math.floor(q / P));
    const a = path[i], b = path[i + 1];
    const frac = (q - i * P) / P;
    return { x: a.x + (b.x - a.x) * frac, y: a.y + (b.y - a.y) * frac };
}

// The player's progress along the corridor (px from the start tile), by
// projecting the avatar centre onto the nearest path segment. The maze is a
// single lane, so this is the fair distance a rolling bomb must close (a
// raw Euclidean gap would cut corners and kill "through" a bend).
function _egCrashPlayerPathPx(g, x, y) {
    const path = g.path, P = g.P;
    let bestD2 = Infinity, bestPx = 0;
    for (let i = 0; i < path.length - 1; i++) {
        const a = path[i], b = path[i + 1];
        const ax = b.x - a.x, ay = b.y - a.y;
        const dx = x - a.x, dy = y - a.y;
        const t = Math.max(0, Math.min(1, (dx * ax + dy * ay) / (P * P)));
        const cx = a.x + ax * t, cy = a.y + ay * t;
        const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy);
        if (d2 < bestD2) { bestD2 = d2; bestPx = i * P + t * P; }
    }
    return bestPx;
}

// Parks the bomb element at its current roll position; returns that point.
function _egCrashSuperMove(g) {
    const sup = g.super;
    const p = _egCrashSuperPos(g, sup.rollPx);
    if (sup.el) {
        sup.el.style.left = Math.round(p.x - sup.size / 2) + 'px';
        sup.el.style.top = Math.round(p.y - sup.size / 2) + 'px';
    }
    return p;
}

// Impact: the bomb slams onto the start tile and starts rolling.
function _egCrashSuperLand(g, level) {
    const sup = g.super;
    if (!sup || sup.landed) return;
    sup.landed = true;
    sup.rollPx = 0;
    if (sup.warn) { try { sup.warn.remove(); } catch (e) {} sup.warn = null; }
    if (sup.el) {
        sup.el.classList.remove('eg-crash-super-falling');
        sup.el.classList.add('eg-crash-super-armed');
    }
    _egCrashSuperMove(g);
    _egCrashBoom(g.run, sup.fallX, sup.fallY, g.P * 0.95, 0, level, '');
    _egNkToast('eg_mech_crash_super_land',
        '💣💥 The Demolitionist hurls a SUPER BOMB onto your start — RUN!',
        '#fb923c');
}

// The bomb caught the player: one-hit defeat. A colossal fire hit runs the
// normal intake (boss specials always land; resists/armour still mitigate,
// the absorption shield can eat part of it), then a hard kill guarantees
// the outcome — no shield, ward or mitigation edge case survives the super
// bomb. Godmode stays exempt (dev/test toggle).
function _egCrashSuperCatch(g, level) {
    const sup = g.super;
    if (!sup || sup.caught || !g || g.finished) return;
    sup.caught = true;
    if (sup.el) { try { sup.el.remove(); } catch (e) {} sup.el = null; }
    const p = _egCrashSuperMove(g);
    _egCrashBoom(null, p.x, p.y, g.P * EG_CRASH_SUPER_BOOM_MULT, 0, level, '');
    _egNkToast('eg_mech_crash_super_catch',
        '💥💀 THE SUPER BOMB CATCHES YOU — instant defeat!',
        '#f87171');
    if (!window._egGodMode) {
        try { _egNkHit(2.5, 'fire', level); } catch (e) {}
        const stillAlive = (typeof playerCurrentHP !== 'undefined' && playerCurrentHP > 0);
        if (stillAlive) {
            try {
                playerCurrentHP = 0;
                if (typeof _egRenderPlayerHealth === 'function') _egRenderPlayerHealth();
            } catch (e) {}
            if (typeof _egGameOver === 'function') { try { _egGameOver(); } catch (e) {} }
        }
    }
}

// Fireworks finale: every remaining wall detonates from the start to the
// end of the maze (visual-only), then the set-piece ends.
function _egCrashMazeFinale(g, won) {
    if (!g || g.phase === 'finale') return;
    g.phase = 'finale';
    g.won = !!won;
    g.finaleAt = performance.now();
    g.cascadeI = 0;
    g.cascadeT = 0;
    // Order the cascade along the chase direction for the biggest show.
    g.walls.sort((a, b) => a.nearest - b.nearest);
    _egNkToast(won ? 'eg_mech_crash_maze_clear' : 'eg_mech_crash_maze_over',
        won
            ? '💥💣 You outran the SUPER BOMB — the whole corridor goes up behind you!'
            : '💥 The Bomb Maze detonates completely.',
        won ? '#4ade80' : '#f59e0b');
}

// Ends the set-piece and hands the phase back to the boss. Safe on every
// path: normal finish, boss death mid-maze, encounter stop, teardown.
function _egCrashMazeEnd(g) {
    if (!g || g.finished) return;
    g.finished = true;
    if (g.cdTimer) { clearInterval(g.cdTimer); g.cdTimer = null; }
    if (g.overlay) { try { g.overlay.remove(); } catch (e) {} g.overlay = null; }
    if (g.banner) { try { g.banner.remove(); } catch (e) {} g.banner = null; }
    if (g.tint) { try { g.tint.remove(); } catch (e) {} g.tint = null; }
    if (g.run) { try { _egNkKillRun(g.run); } catch (e) {} g.run = null; }

    const m = (g.monsterId && typeof _egMonsters !== 'undefined')
        ? _egMonsters.find(x => x && x.id === g.monsterId) : null;
    if (m && m.bossPhase === 4 && m.bossImmune) {
        m.bossImmune = false;
        if (typeof _egBossScheduleMechanics === 'function') {
            try { _egBossScheduleMechanics(m, 4); } catch (e) {}
        }
        if (typeof _egRenderPanel === 'function') { try { _egRenderPanel(); } catch (e) {} }
    }
    // Charge bar unfreezes — the mechanic is over (also cleared
    // defensively by _egCrashTeardown if the encounter dies mid-maze).
    _egCrashSetChargePause(false);
    _egCrashMazeSetShield(false);
    if (_egCrashMaze === g) _egCrashMaze = null;
}

// Defensive teardown for any mid-set-piece death/stop. Registered in
// boss-framework.js cleanup.
function _egCrashTeardown() {
    if (!_egCrashMaze) return;
    const g = _egCrashMaze;
    if (g.cdTimer) { clearInterval(g.cdTimer); g.cdTimer = null; }
    g.finished = true;
    if (g.overlay) { try { g.overlay.remove(); } catch (e) {} g.overlay = null; }
    if (g.banner) { try { g.banner.remove(); } catch (e) {} g.banner = null; }
    if (g.tint) { try { g.tint.remove(); } catch (e) {} g.tint = null; }
    if (g.run) { try { _egNkKillRun(g.run); } catch (e) {} g.run = null; }
    _egCrashSetChargePause(false);
    _egCrashMazeSetShield(false);
    _egCrashMaze = null;
}

// ── Countdown / banner overlays ───────────────────────────────────────────

function _egCrashMazeShowOverlay(g) {
    const ov = document.createElement('div');
    ov.className = 'eg-crash-cd';
    ov.id = 'eg-crash-cd';
    ov.innerHTML =
        '<div class="eg-crash-cd-label">💣 BOMB MAZE IN</div>' +
        '<div class="eg-crash-cd-num eg-crash-cd-pop">' + g.count + '</div>' +
        '<div class="eg-crash-cd-hint">Run the corridor — the bombs detonate from the start!</div>';
    document.body.appendChild(ov);
    g.overlay = ov;
    const r = g.region;
    ov.style.left = Math.round(r.cx) + 'px';
    ov.style.top = Math.round(r.cy) + 'px';
}

function _egCrashMazeShowBanner(g) {
    const r = g.region;
    const banner = document.createElement('div');
    banner.className = 'eg-crash-run-banner';
    banner.textContent = '💣 BOMB MAZE — RUN!';
    document.body.appendChild(banner);
    banner.style.left = Math.round(r.cx) + 'px';
    banner.style.top = Math.round(Math.max(120, r.cy - (g.geom ? g.geom.rows * g.P : 400) / 2 - 70)) + 'px';
    g.banner = banner;

    const tint = document.createElement('div');
    tint.className = 'eg-crash-maze-tint';
    document.body.appendChild(tint);
    g.tint = tint;
}
