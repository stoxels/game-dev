//------------------------------------------------------------------------
//-------------------SHARED BOSS ABILITIES--------------------------------
//------------------------------------------------------------------------
// Mechanics used by TWO OR MORE bosses live here so they are defined once.
// Rule of thumb:
//   shared (here) — corrupt_cells, probability_shift, prior_bomb (+ summon
//     helpers), clue_swap, frozen_cells, grid_invert, plus the shared engines
//     (generic screen-blast engine, _egNk dodge kit).
//   per-boss file — everything only ONE boss uses.
//
// Boss files reference these by handler-name string, e.g.
//   { name: 'corrupt_cells', handler: '_egMechCorruptCells', ... }
//------------------------------------------------------------------------

// ── Corrupt cell expiry time ─────────────────────────────────────────────────
const EG_CORRUPT_CELL_LIFETIME_MS = 15000; // ms before corruption auto-expires


// Returns all grid cells that are valid targets for the Corrupt Cells mechanic.
// Only targets correct cells (sol=1) that the player hasn't already filled or revealed.
function _egBuildCorruptibleCellPool() {
    if (!cur || !cur.grid) return [];
    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;
    const pool = [];

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (sol[r][c] !== 1) continue; // only corrupt correct cells
            if (userGrid[r][c] === 1 || revealedGrid[r][c]) continue; // already filled
            if (_egBossCorrupted.has(`${r}-${c}`)) continue; // already corrupted
            pool.push([r, c]);
        }
    }
    return pool;
}


// Places the 🚫 corruption overlay on a cell and registers its expiry timer.
function _egApplyCellCorruption(r, c) {
    const key = `${r}-${c}`;
    const el = document.getElementById(`g-${r}-${c}`);
    if (!el) return;

    const overlay = document.createElement('span');
    overlay.className = 'eg-corrupt-overlay';
    overlay.id = `eg-corrupt-${r}-${c}`;
    overlay.textContent = '🚫';
    el.appendChild(overlay);

    const expireTimer = setTimeout(() => _egRemoveCellCorruption(key), EG_CORRUPT_CELL_LIFETIME_MS);
    _egBossCorrupted.set(key, { timer: expireTimer });
}


// Removes the corruption overlay from the DOM and clears its state entry.
function _egRemoveCellCorruption(key) {
    const [r, c] = key.split('-').map(Number);
    const span = document.getElementById(`eg-corrupt-${r}-${c}`);
    if (span) span.remove();
    _egBossCorrupted.delete(key);
}


// Removes all currently active corrupted cells.
// Called on boss death or encounter stop to avoid leaving orphaned overlays.
function _egClearAllCorruptedCells() {
    _egBossCorrupted.forEach((data, key) => {
        clearTimeout(data.timer);
        _egRemoveCellCorruption(key);
    });
    _egBossCorrupted.clear();
}


// Returns true if the cell at (row, col) currently has an active corruption overlay.
// Called from mouse-button-handlers.js before allowing a cell fill.
function _egIsCellCorrupted(row, col) {
    return _egBossCorrupted.has(`${row}-${col}`);
}


// Dispels the corruption on a cell when the player clicks it.
// Returns true if the cell was corrupted (caller should block the normal fill action
// and require a second click to actually fill).
function _egDispelCorruption(row, col) {
    const key = `${row}-${col}`;
    if (!_egBossCorrupted.has(key)) return false;

    clearTimeout(_egBossCorrupted.get(key).timer);
    _egRemoveCellCorruption(key);
    showToast(t('eg_corruption_dispelled'));
    return true;
}


// Boss mechanic handler — called by the boss mechanic scheduler.
// Corrupts 2 (phase 1) or 3 (phase 2+) random eligible cells.
function _egMechCorruptCells(monster, phase) {
    const pool = _egBuildCorruptibleCellPool();
    if (pool.length === 0) return;

    const count = phase >= 2 ? 3 : 2;
    const targets = pool.sort(() => Math.random() - 0.5).slice(0, Math.min(count, pool.length));

    showToast(t('eg_mech_corrupt_cells').replace('{n}', targets.length));
    targets.forEach(([r, c]) => _egApplyCellCorruption(r, c));
}


// Returns all cells the player has correctly marked as ✕ (userGrid=2, sol=0).
function _egBuildProbabilityShiftPool() {
    if (!cur || !cur.grid) return [];
    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;
    const pool = [];
    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
            if (sol[r][c] === 0 && userGrid[r][c] === 2 && !wrongGrid[r][c])
                pool.push([r, c]);
    return pool;
}


// Boss mechanic handler — erases 2 or 3 player marks from the grid.
function _egMechProbabilityShift(monster, phase) {
    const pool = _egBuildProbabilityShiftPool();
    if (pool.length === 0) return;

    const count = phase >= 2 ? 3 : 2;
    const targets = pool.sort(() => Math.random() - 0.5).slice(0, Math.min(count, pool.length));

    showToast(t('eg_mech_probability_shift').replace('{n}', targets.length));
    targets.forEach(([r, c]) => {
        userGrid[r][c] = 0;
        renderCell(r, c);
    });
}


// Removes a specific [row, col] entry from the recent-fills tracker.
function _egRemoveFromRecentFills(row, col) {
    const idx = _egRecentFills.findIndex(([fr, fc]) => fr === row && fc === col);
    if (idx !== -1) _egRecentFills.splice(idx, 1);
}


// Plays the burst visual on a cell unfilled by Prior Bomb.
function _egFlashPriorBombCell(row, col) {
    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;
    el.classList.add('eg-prior-bomb-flash');
    setTimeout(() => el.classList.remove('eg-prior-bomb-flash'), 600);
}


// Unfills a single cell and removes it from the recent-fills tracker.
function _egUnfillCell(row, col) {
    userGrid[row][col] = 0;
    _egRemoveFromRecentFills(row, col);
    renderCell(row, col);
    updClues(row, col);
    _egFlashPriorBombCell(row, col);
}


// Boss mechanic handler — deliberately SUMMONS monster reinforcements into
// the arena. This is the one spawn path that stays open inside the boss
// arena (natural respawns are suppressed there — see _egShouldSuppressRespawn
// in endgame-encounter.js): the spawn here is a purposeful boss ability, not
// ambient repopulation. Summons 2 minions in phase 3, 1 otherwise, at the
// boss's own level, capped by the global concurrent-monster cap. Slain
// minions pay out normal XP/loot on top of the boss reward.
const EG_SUMMON_POOL = ['slime', 'ghost', 'rat', 'bat', 'bee'];


function _egMechSummonAdds(monster, phase) {
    if (typeof _egSpawnMonster !== 'function') return;
    const count = phase >= 3 ? 2 : 1;
    const level = Math.max(1, Math.round(monster.level || 1));
    const name = monster.name || monster.baseId || '?';

    let summoned = 0;
    for (let i = 0; i < count; i++) {
        if (typeof _egMonsters !== 'undefined' && _egMonsters.length >= EG_MAX_CONCURRENT_MONSTERS) break;
        const defId = EG_SUMMON_POOL[Math.floor(Math.random() * EG_SUMMON_POOL.length)];
        _egSpawnMonster(defId, level);
        summoned++;
    }
    if (summoned > 0) {
        showToast(t('eg_boss_summon').replace('{name}', name).replace('{n}', summoned), '#f87171');
        if (typeof _egUpdateObjectivesHUD === 'function') _egUpdateObjectivesHUD();
    }
}


// Boss mechanic handler — unfills 1 or 2 of the most recently filled cells.
function _egMechPriorBomb(monster, phase) {
    if (!cur || !cur.grid) return;
    const sol = cur.grid;

    // Build pool from most-recent fills, filtering cells already cleared
    const pool = [..._egRecentFills].reverse().filter(([r, c]) =>
        userGrid[r][c] === 1 && !revealedGrid[r][c] && sol[r][c] === 1
    );
    if (pool.length === 0) return;

    const count = phase >= 2 ? 2 : 1;
    const targets = pool.slice(0, Math.min(count, pool.length));

    showToast(t('eg_mech_prior_bomb').replace('{n}', targets.length));
    targets.forEach(([r, c]) => _egUnfillCell(r, c));
}


// Restores the two swapped row-clue spans. Defers while a Clue Blackout is
// active so the blackout's own text snapshot/restore isn't fought over.
function _egRestoreClueSwap(a, b) {
    if (_egBlackoutActive) {
        // Blackout in progress — retry shortly until it clears.
        _egClueSwapRestoreTimer = setTimeout(() => _egRestoreClueSwap(a, b), 2000);
        return;
    }
    const elA = document.getElementById(`rn-${a}`);
    const elB = document.getElementById(`rn-${b}`);
    if (!elA || !elB) return; // grid was rebuilt; nothing to restore
    const tmp = elA.textContent;
    elA.textContent = elB.textContent;
    elB.textContent = tmp;
}


// Boss mechanic handler — scrambles two random row clues.
function _egMechClueSwap(monster, phase) {
    const rows = (cur && cur.grid) ? cur.grid.length : 0;
    if (rows < 2) return;

    let a = Math.floor(Math.random() * rows);
    let b = Math.floor(Math.random() * rows);
    while (b === a) b = Math.floor(Math.random() * rows);

    const elA = document.getElementById(`rn-${a}`);
    const elB = document.getElementById(`rn-${b}`);
    if (!elA || !elB || _egBlackoutActive) return; // don't stack with blackout

    const tmp = elA.textContent;
    elA.textContent = elB.textContent;
    elB.textContent = tmp;

    const duration = phase >= 3 ? 12000 : 8000;
    showToast(t('eg_mech_clue_swap').replace('{n}', duration / 1000));

    clearTimeout(_egClueSwapRestoreTimer);
    _egActiveClueSwap = [a, b];
    _egClueSwapRestoreTimer = setTimeout(() => {
        _egRestoreClueSwap(a, b);
        _egActiveClueSwap = null;
    }, duration);
}


// Full cleanup — undoes an active swap immediately if one is pending.
// Called from _egBossCleanup on boss death / encounter stop.
function _egRemoveClueSwap() {
    clearTimeout(_egClueSwapRestoreTimer);
    _egClueSwapRestoreTimer = null;
    if (_egActiveClueSwap) {
        _egRestoreClueSwap(_egActiveClueSwap[0], _egActiveClueSwap[1]);
        _egActiveClueSwap = null;
    }
}


// ── Frozen cell thaw time ────────────────────────────────────────────────────
const EG_FROZEN_CELL_LIFETIME_MS = 9000; // ms before frozen cells thaw on their own


// Returns all grid cells that are valid freeze targets (correct + unfilled).
function _egBuildFreezableCellPool() {
    if (!cur || !cur.grid) return [];
    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;
    const pool = [];

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (sol[r][c] !== 1) continue;         // only freeze correct cells
            if (userGrid[r][c] === 1 || revealedGrid[r][c]) continue; // already filled
            if (_egBossFrozen.has(`${r}-${c}`)) continue; // already frozen
            if (_egBossCorrupted.has(`${r}-${c}`)) continue; // already corrupted
            pool.push([r, c]);
        }
    }
    return pool;
}


// Places the ❄ freeze overlay on a cell and registers its thaw timer.
function _egApplyCellFreeze(r, c) {
    const key = `${r}-${c}`;
    const el = document.getElementById(`g-${r}-${c}`);
    if (!el) return;

    const overlay = document.createElement('span');
    overlay.className = 'eg-freeze-overlay';
    overlay.id = `eg-freeze-${r}-${c}`;
    overlay.textContent = '❄️';
    el.appendChild(overlay);

    const thawTimer = setTimeout(() => _egRemoveCellFreeze(key), EG_FROZEN_CELL_LIFETIME_MS);
    _egBossFrozen.set(key, { timer: thawTimer });
}


// Removes the freeze overlay from the DOM and clears its state entry.
function _egRemoveCellFreeze(key) {
    const span = document.getElementById(`eg-freeze-${key}`);
    if (span) span.remove();
    _egBossFrozen.delete(key);
}


// Removes all currently frozen cells. Called on boss death / encounter stop.
function _egClearAllFrozenCells() {
    _egBossFrozen.forEach((data, key) => {
        clearTimeout(data.timer);
        _egRemoveCellFreeze(key);
    });
    _egBossFrozen.clear();
}


// Returns true if the cell at (row, col) is currently frozen.
// Called from mouse-button-handlers.js before allowing a cell fill.
function _egIsCellFrozen(row, col) {
    return _egBossFrozen.has(`${row}-${col}`);
}


// Boss mechanic handler — freezes 2 (phase 1) or 3 (phase 2+) cells.
function _egMechFrozenCells(monster, phase) {
    const pool = _egBuildFreezableCellPool();
    if (pool.length === 0) return;

    const count = phase >= 2 ? 3 : 2;
    const targets = pool.sort(() => Math.random() - 0.5).slice(0, Math.min(count, pool.length));

    showToast(t('eg_mech_frozen_cells').replace('{n}', targets.length));
    targets.forEach(([r, c]) => _egApplyCellFreeze(r, c));
}


// Removes the invert filter from the puzzle table and clears its timer.
function _egRemoveGridInvert() {
    clearTimeout(_egGridInvertTimer);
    _egGridInvertTimer = null;
    const tbl = document.getElementById('ptable');
    if (tbl) tbl.classList.remove('eg-grid-invert');
}


// Boss mechanic handler — applies the Inversion Field for a phase-scaled duration.
function _egMechGridInvert(monster, phase) {
    if (_egGridInvertTimer) return; // already active
    const tbl = document.getElementById('ptable');
    if (!tbl) return;

    tbl.classList.add('eg-grid-invert');

    const duration = phase >= 3 ? 9000 : 6000;
    showToast(t('eg_mech_grid_invert').replace('{n}', duration / 1000));
    _egGridInvertTimer = setTimeout(_egRemoveGridInvert, duration);
}


const EG_BLAST_WARN_MS = 1500;


const EG_BLAST_ACTIVE_MS = 5000;


const EG_BLAST_DAMAGE_PCT = 0.30;


// Picks a screen position for a zone, biased away from edges so the circle
// is always fully visible and reachable.
function _egBlastPickPos(radius) {
    const margin = radius + 40;
    const x = margin + Math.random() * Math.max(1, window.innerWidth - margin * 2);
    const y = margin + Math.random() * Math.max(1, window.innerHeight - margin * 2);
    return { x, y };
}


// Returns true if the player character sprite is inside the safe zone.
// Entropy's Heat Bloom (and all generic blasts) are dodge mechanics where the
// player must move their draggable avatar sprite — not the class HUD — into
// the circle. Uses the tight sprite image rect (hazard-style) with tolerance.
function _egBlastHudInZone(zone) {
    const rect = _egBlastGetPlayerRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) return false;
    const closestX = Math.max(rect.left, Math.min(zone.x, rect.right));
    const closestY = Math.max(rect.top, Math.min(zone.y, rect.bottom));
    const dx = closestX - zone.x;
    const dy = closestY - zone.y;
    const tolerance = 8; // visual border + glow forgiveness
    return Math.sqrt(dx * dx + dy * dy) <= zone.radius + tolerance;
}


// Tight hitbox derived from the visible avatar sprite image, not the wrapper.
// Mirrors the hazard system's _egHzPlayerRect logic: the wrapper is taller than
// the artwork (HP/charge bars), so using its bounds misaligns collision.
// Falls back to HUD only if no avatar is present (non-endgame screen).
function _egBlastGetPlayerRect() {
    // Reuse the hazard helper if it is already loaded for exact parity
    if (typeof _egHzPlayerRect === 'function') {
        const hr = _egHzPlayerRect();
        if (hr && hr.width && hr.height) return hr;
    }
    if (typeof _egHzPlayerSpriteRect === 'function') {
        const sr = _egHzPlayerSpriteRect();
        if (sr && sr.width && sr.height) return sr;
    }
    let img = document.getElementById('avatar-sprite-img');
    let r = img ? img.getBoundingClientRect() : null;
    if (!r || (!r.width && !r.height)) {
        img = document.getElementById('avatar-sprite-img-simple');
        r = img ? img.getBoundingClientRect() : null;
    }
    if (r && r.width && r.height) return r;
    const el = document.getElementById('player-avatar-wrapper')
        || document.getElementById('player-avatar-simple');
    if (el) {
        const wr = el.getBoundingClientRect();
        if (wr.width || wr.height) {
            // Crop the HP/charge bar area at the top for the endgame wrapper
            if (el.id === 'player-avatar-wrapper') {
                const barH = wr.height * 0.38;
                const insetX = Math.min(16, wr.width * 0.18);
                const insetY = Math.min(12, (wr.height - barH) * 0.14);
                const left = wr.left + insetX;
                const right = wr.right - insetX;
                const top = wr.top + barH + insetY;
                const bottom = wr.bottom - Math.min(8, (wr.height - barH) * 0.08);
                if (right > left && bottom > top) {
                    return { left, right, top, bottom, width: right - left, height: bottom - top };
                }
            }
            return wr;
        }
    }
    // Last resort: HUD (keeps Void Surge functional on screens without avatar)
    const hud = document.getElementById('class-hud-drag-handle')
        || document.getElementById('class-hud-panel');
    if (!hud) return null;
    return hud.getBoundingClientRect();
}


// DOM helpers — each blast gets uniquely suffixed elements.
function _egBlastGetOverlay(id) {
    let el = document.getElementById(`eg-blast-overlay-${id}`);
    if (!el) {
        el = document.createElement('div');
        el.id = `eg-blast-overlay-${id}`;
        document.body.appendChild(el);
    }
    return el;
}


function _egBlastPositionCircle(el, zone) {
    el.style.left = zone.x + 'px';
    el.style.top = zone.y + 'px';
    el.style.width = (zone.radius * 2) + 'px';
    el.style.height = (zone.radius * 2) + 'px';
    el.style.marginLeft = (-zone.radius) + 'px';
    el.style.marginTop = (-zone.radius) + 'px';
}


function _egBlastGetCircle(id, idx, zone) {
    let el = document.getElementById(`eg-blast-circle-${id}-${idx}`);
    if (!el) {
        el = document.createElement('div');
        el.id = `eg-blast-circle-${id}-${idx}`;
        document.body.appendChild(el);
    }
    _egBlastPositionCircle(el, zone);
    return el;
}


function _egBlastGetCountdownLabel(id, zone) {
    let el = document.getElementById(`eg-blast-countdown-${id}`);
    if (!el) {
        el = document.createElement('div');
        el.id = `eg-blast-countdown-${id}`;
        document.body.appendChild(el);
    }
    // Mirror the real circle's position so the number sits centred inside it
    el.style.left = zone.x + 'px';
    el.style.top = zone.y + 'px';
    return el;
}


function _egBlastGetGhost(id, pos, radius) {
    let el = document.getElementById(`eg-blast-ghost-${id}`);
    if (!el) {
        el = document.createElement('div');
        el.id = `eg-blast-ghost-${id}`;
        document.body.appendChild(el);
    }
    _egBlastPositionCircle(el, { x: pos.x, y: pos.y, radius });
    return el;
}


// Removes every element and timer belonging to one blast.
function _egBlastTeardown(id) {
    const state = _egActiveBlasts.get(id);
    if (state) {
        state.timers.forEach(t => { clearTimeout(t); clearInterval(t); });
        if (state.poll) clearInterval(state.poll);
        _egActiveBlasts.delete(id);
    }
    [
        `eg-blast-overlay-${id}`, `eg-blast-countdown-${id}`, `eg-blast-ghost-${id}`,
        `eg-blast-circle-${id}-0`, `eg-blast-circle-${id}-1`, `eg-blast-circle-${id}-2`,
    ].forEach(elId => { const el = document.getElementById(elId); if (el) el.remove(); });
}


// Tears down ALL active blasts. Called from _egBossCleanup on boss death /
// encounter stop so no overlay can outlive its boss.
function _egBlastTeardownAll() {
    Array.from(_egActiveBlasts.keys()).forEach(id => _egBlastTeardown(id));
}


// Runs one full blast sequence with the given options (see block comment).
function _egRunScreenBlast(opts) {
    // Never stack two blasts — the last thing the player needs is two
    // overlapping blackout screens fighting over the same dodge.
    if (_egActiveBlasts.size > 0) return;

    const id = ++_egBlastSeq;
    const state = { timers: [], poll: null };
    _egActiveBlasts.set(id, state);

    const warnMs = opts.warnMs != null ? opts.warnMs : EG_BLAST_WARN_MS;
    const activeMs = opts.activeMs != null ? opts.activeMs : EG_BLAST_ACTIVE_MS;
    const damagePct = opts.damagePct != null ? opts.damagePct : EG_BLAST_DAMAGE_PCT;
    const realIndex = opts.realIndex != null ? opts.realIndex : 0;
    const accent = opts.accent || '#ffd93c';

    const zones = opts.zones.map(z => ({ ...z }));
    let real = zones[realIndex];
    const startRadius = real.radius;

    const schedule = (fn, ms) => {
        const t = setTimeout(fn, ms);
        state.timers.push(t);
    };

    // ── Warning phase: red tint fades in, all candidate zones appear ────────
    const overlay = _egBlastGetOverlay(id);
    overlay.className = 'eg-blast-overlay eg-blast-warning';
    if (opts.accent) overlay.style.setProperty('--blast-accent', accent);

    zones.forEach((z, i) => {
        const circle = _egBlastGetCircle(id, i, z);
        circle.className = 'eg-blast-circle' + (i === realIndex ? '' : ' eg-blast-fake');
        // Prior Collapse tell: the REAL zone sparkles throughout the warning
        // so the choice is always readable — never a coin flip.
        if (opts.revealFakeAtActive && i === realIndex) circle.classList.add('eg-blast-true');
        circle.style.setProperty('--blast-accent', accent);
    });

    if (opts.ghost) {
        const ghost = _egBlastGetGhost(id, opts.ghost, startRadius);
        ghost.className = 'eg-blast-ghost';
        ghost.style.setProperty('--blast-accent', accent);
    }

    const label = _egBlastGetCountdownLabel(id, real);
    label.className = 'eg-blast-countdown';
    label.style.setProperty('--blast-accent', accent);
    label.textContent = Math.ceil(activeMs / 1000);

    if (opts.toastKey && typeof showToast === 'function') showToast(t(opts.toastKey));

    // ── Active phase: blackout, countdown starts ────────────────────────────
    schedule(() => {
        overlay.className = 'eg-blast-overlay eg-blast-active';

        // Prior Collapse: the fake zones visibly collapse the instant the
        // blast hits — by then the player has had the whole warning to note
        // which zone carried the tell.
        if (opts.revealFakeAtActive) {
            zones.forEach((z, i) => {
                if (i === realIndex) return;
                const c = document.getElementById(`eg-blast-circle-${id}-${i}`);
                if (c) {
                    c.classList.add('eg-blast-collapsed');
                    schedule(() => c.remove(), 500);
                }
            });
        }

        const startedAt = Date.now();

        // Rewrite Fate: mid-window jump to the pre-shown ghost position.
        if (opts.relocateAtMs != null && opts.ghost) {
            schedule(() => {
                real = { x: opts.ghost.x, y: opts.ghost.y, radius: real.radius };
                const circle = _egBlastGetCircle(id, realIndex, real);
                circle.classList.add('eg-blast-jump');
                schedule(() => circle.classList.remove('eg-blast-jump'), 400);
                label.style.left = real.x + 'px';
                label.style.top = real.y + 'px';
                const ghostEl = document.getElementById(`eg-blast-ghost-${id}`);
                if (ghostEl) ghostEl.remove();
            }, opts.relocateAtMs);
        }

        // 100ms poll: in-zone glow, shrinking radius, countdown text.
        state.poll = setInterval(() => {
            const progress = Math.min(1, (Date.now() - startedAt) / activeMs);

            // Heat Death Bloom: the zone collapses as time runs out.
            if (opts.shrinkToRadius != null) {
                real.radius = Math.round(startRadius + (opts.shrinkToRadius - startRadius) * progress);
                _egBlastPositionCircle(_egBlastGetCircle(id, realIndex, real), real);
            }

            const remaining = Math.max(0, Math.ceil((activeMs - (Date.now() - startedAt)) / 1000));
            const lbl = document.getElementById(`eg-blast-countdown-${id}`);
            if (lbl) lbl.textContent = remaining;

            const circle = document.getElementById(`eg-blast-circle-${id}-${realIndex}`);
            if (circle && !circle.classList.contains('eg-blast-collapsed')) {
                circle.classList.toggle('eg-blast-safe', _egBlastHudInZone(real));
            }
        }, 100);

        // ── Resolve: check position, apply damage, tear down ────────────────
        schedule(() => {
            if (state.poll) { clearInterval(state.poll); state.poll = null; }
            // Ensure the logical radius matches the intended final size at resolve
            // so the last poll's 100ms quantization doesn't cause a visual/logical mismatch.
            if (opts.shrinkToRadius != null) {
                real.radius = opts.shrinkToRadius;
                _egBlastPositionCircle(_egBlastGetCircle(id, realIndex, real), real);
            }

            const survived = _egBlastHudInZone(real);
            const circle = document.getElementById(`eg-blast-circle-${id}-${realIndex}`);
            if (circle) circle.classList.add(survived ? 'eg-blast-survived' : 'eg-blast-hit');

            if (!survived) {
                // Percentage of max HP — survivable even at full health, but it
                // stings enough that ignoring the mechanic loses fights.
                const damage = Math.round(playerMaxHP * damagePct);
                const dealt = typeof _egPlayerTakeDamage === 'function'
                    ? _egPlayerTakeDamage(damage, true) : 0;
                if (dealt > 0 && typeof _egApplyPlayerHitFeedback === 'function') {
                    _egApplyPlayerHitFeedback(dealt);
                }
                showToast(t('eg_blast_hit').replace('{n}', dealt), '#f87171');
            } else {
                showToast(t('eg_blast_dodged'), '#4ade80');
            }

            // Brief resolve pause so the outcome flash is readable
            schedule(() => _egBlastTeardown(id), 500);
        }, activeMs);
    }, warnMs);
}


const _egNkRuns = new Map(); // runId → { bossId, dodge, raf, timers, els, dotAcc }


let _egNkSeq = 0;


// True while any dodge run, crush corridor or screen blast is active.
function _egNkDodgeBusy() {
    if (typeof _egCrushState !== 'undefined' && _egCrushState) return true;
    if (typeof _egActiveBlasts !== 'undefined' && _egActiveBlasts.size > 0) return true;
    for (const r of _egNkRuns.values()) if (r.dodge) return true;
    return false;
}


function _egNkNewRun(bossId, isDodge) {
    const id = ++_egNkSeq;
    const run = { id, bossId: bossId || null, dodge: !!isDodge, raf: 0, timers: [], els: [], dotAcc: 0 };
    _egNkRuns.set(id, run);
    return run;
}


function _egNkEl(run, tag, cls, text) {
    const el = document.createElement(tag || 'div');
    if (cls) el.className = cls;
    if (text != null) el.textContent = text;
    document.body.appendChild(el);
    run.els.push(el);
    return el;
}


function _egNkKillRun(run) {
    if (!run) return;
    if (run.raf) cancelAnimationFrame(run.raf);
    run.timers.forEach(t => { clearTimeout(t); clearInterval(t); });
    run.els.forEach(el => { try { el.remove(); } catch (e) {} });
    _egNkRuns.delete(run.id);
}


// Cancels only runs owned by one boss — add deaths must never nuke the
// boss's own active mechanic. Called from _egBossCleanup.
function _egNkTeardownBoss(bossId) {
    Array.from(_egNkRuns.values()).forEach(r => {
        if (r.bossId === bossId) _egNkKillRun(r);
    });
    document.querySelectorAll('.eg-nk-shielded').forEach(el => el.classList.remove('eg-nk-shielded'));
}


function _egNkTeardownAll() {
    Array.from(_egNkRuns.values()).forEach(_egNkKillRun);
    document.querySelectorAll('.eg-nk-shielded').forEach(el => el.classList.remove('eg-nk-shielded'));
}


// Pause / encounter / death guard — loops freeze instead of advancing.
function _egNkFrozen() {
    if (typeof _gamePaused !== 'undefined' && _gamePaused) return true;
    if (typeof _egIsActive === 'function' && !_egIsActive()) return true;
    if (typeof dead !== 'undefined' && dead) return true;
    return false;
}


function _egNkBossAlive(bossId) {
    if (!bossId || typeof _egMonsters === 'undefined') return true;
    return !!_egMonsters.find(m => m.id === bossId);
}


// Pause-safe rAF driver. tick(dtS, now) returns true to continue.
// Boss death ends the run silently (visuals vanish with their owner).
function _egNkLoop(run, tick) {
    let last = performance.now();
    const step = (now) => {
        if (!_egNkRuns.has(run.id)) return;
        if (!_egNkBossAlive(run.bossId)) { _egNkKillRun(run); return; }
        if (_egNkFrozen()) {
            last = now;
            run.raf = requestAnimationFrame(step);
            return;
        }
        const dtS = Math.max(0, Math.min(0.05, (now - last) / 1000));
        last = now;
        let cont = true;
        try { cont = tick(dtS, now); } catch (e) { cont = false; }
        if (cont && _egNkRuns.has(run.id)) run.raf = requestAnimationFrame(step);
        else _egNkKillRun(run);
    };
    run.raf = requestAnimationFrame(step);
}


function _egNkPlayerRect() {
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


function _egNkPlayerCenter() {
    const r = _egNkPlayerRect();
    if (!r) return null;
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}


function _egNkMaxHP() {
    return (typeof playerMaxHP !== 'undefined' && playerMaxHP > 0) ? playerMaxHP : 100;
}


function _egNkCircleHit(x, y, r, pr, pad) {
    if (!pr) return false;
    const p = pad || 0;
    const cx = Math.max(pr.left, Math.min(x, pr.right));
    const cy = Math.max(pr.top, Math.min(y, pr.bottom));
    const dx = cx - x, dy = cy - y;
    return Math.sqrt(dx * dx + dy * dy) <= r + p;
}


function _egNkRectsOverlap(a, b) {
    return !!a && !!b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}


// Direct %maxHP hit through the normal intake (resists apply).
function _egNkHit(pct, element, level) {
    const dmg = Math.max(1, Math.round(_egNkMaxHP() * pct));
    const dealt = (typeof _egPlayerTakeDamage === 'function')
        ? _egPlayerTakeDamage(dmg, true, element || null, level || 1) : 0;
    if (dealt > 0 && typeof _egApplyPlayerHitFeedback === 'function') {
        try { _egApplyPlayerHitFeedback(dealt); } catch (e) {}
    }
    return dealt;
}


// DoT chunking: accumulates fractional damage, applies whole-HP ticks.
function _egNkDotTick(run, pctPerSec, dtS, level, element) {
    run.dotAcc = (run.dotAcc || 0) + (_egNkMaxHP() * pctPerSec / 100) * dtS;
    const unit = Math.max(1, _egNkMaxHP() * 0.01);
    if (run.dotAcc >= unit) {
        const tick = Math.floor(run.dotAcc);
        run.dotAcc -= tick;
        if (typeof _egPlayerTakeDamage === 'function') {
            _egPlayerTakeDamage(tick, true, element || null, level || 1);
        }
    }
}


function _egNkToast(key, fallback, color) {
    let msg = fallback;
    try {
        const raw = t(key);
        if (raw && raw !== key) msg = raw;
    } catch (e) {}
    if (typeof showToast === 'function') showToast(msg, color);
}


// Gently displaces the avatar (polarity field). Composes with WASD
// movement, which reads the same style offsets every frame.
function _egNkNudgeAvatar(dx, dy) {
    const el = document.getElementById('player-avatar-wrapper')
        || document.getElementById('player-avatar-simple');
    if (!el) return;
    const l = (parseInt(el.style.left) || 0) + dx;
    const tp = (parseInt(el.style.top) || 0) + dy;
    if (typeof _setAvatarPos === 'function') {
        try { _setAvatarPos(el, l, tp); } catch (e) {}
    } else {
        el.style.left = Math.max(0, Math.min(window.innerWidth - 40, l)) + 'px';
        el.style.top = Math.max(0, Math.min(window.innerHeight - 40, tp)) + 'px';
    }
}


//------------------------------------------------------------------------
//-------------------SHARED PUZZLE MECHANICS (PACK 4)----------------------
//------------------------------------------------------------------------
// Grid/puzzle disruption usable by any boss (referenced by handler-name
// string like the older shared mechanics above):
//   fated_cell    — fill the marked cell(s) in time or lose recent progress
//   fog_bank      — a wandering fog bank hides a chunk of the grid
//   clue_scramble — shuffles the numbers inside 2 clue lines (reverts)
//   soul_tithe    — boss shields until the player fills N correct cells
//
// fated_cell and soul_tithe observe correct fills through
// _egNotifyCorrectFill(), which endgame-encounter.js calls from the central
// _egOnCorrectCell() fill path.
//------------------------------------------------------------------------

// ── Fill observer ─────────────────────────────────────────────────────────────
// Called from _egOnCorrectCell on every correct fill. Lets active boss
// mechanics react (resolve fate marks, count tithe progress). No-op unless
// a mechanic is currently listening.
function _egNotifyCorrectFill(row, col) {
    const key = row + '-' + col;
    if (typeof _egFateMarks !== 'undefined' && _egFateMarks.has(key)) {
        _egResolveFateMark(key, true);
    }
    if (typeof _egMonsters === 'undefined') return;
    _egMonsters.forEach(m => {
        if (m.soulTithe && m.soulTithe.active) {
            m.soulTithe.have++;
            if (m.soulTithe.have >= m.soulTithe.need) {
                _egBreakSoulTithe(m);
            } else if (typeof _egRenderPanel === 'function') {
                try { _egRenderPanel(); } catch (e) {}
            }
        }
    });
}


//------------------------------------------------------------------------
//-------------------SHARED MECHANIC: FATED CELL---------------------------
//------------------------------------------------------------------------
// Marks 1 (phase 3: 2) correct unfilled cell(s) with ⏳. Fill each before its
// doom clock runs out and the boss's curse fizzles — fail, and it eats your
// 2 most recent fills per missed mark. Unlike Corrupt Cells the mark never
// blocks filling; it is a race, not a lock.

let _egFateMarks = new Map(); // key:"row-col" → { timer }

// Places the ⏳ mark on a cell and starts its doom clock.
function _egApplyFateMark(r, c, windowMs) {
    const key = r + '-' + c;
    if (_egFateMarks.has(key)) return;
    const el = document.getElementById(`g-${r}-${c}`);
    if (!el) return;

    const overlay = document.createElement('span');
    overlay.className = 'eg-fate-overlay';
    overlay.id = `eg-fate-${r}-${c}`;
    overlay.textContent = '⏳';
    el.appendChild(overlay);

    const timer = setTimeout(() => _egResolveFateMark(key, false), windowMs);
    _egFateMarks.set(key, { timer });
}

// Removes the mark overlay and clears its doom clock.
function _egRemoveFateMark(key) {
    const data = _egFateMarks.get(key);
    if (data) clearTimeout(data.timer);
    _egFateMarks.delete(key);
    const span = document.getElementById(`eg-fate-${key}`);
    if (span) span.remove();
}

// Resolves one mark: filled=true rewards, filled=false (doom clock expired)
// punishes by unfilling the 2 most recent correct fills.
function _egResolveFateMark(key, filled) {
    if (!_egFateMarks.has(key)) return;
    _egRemoveFateMark(key);
    if (filled) {
        showToast(t('eg_fate_done'), '#4ade80');
        return;
    }
    showToast(t('eg_fate_fail'), '#f87171');
    if (!cur || !cur.grid || typeof _egUnfillCell !== 'function') return;
    const sol = cur.grid;
    const pool = [..._egRecentFills].reverse().filter(([r, c]) =>
        userGrid[r][c] === 1 && !revealedGrid[r][c] && sol[r][c] === 1
    );
    pool.slice(0, 2).forEach(([r, c]) => _egUnfillCell(r, c));
}

// Removes all pending fate marks. Called on boss death / encounter stop.
function _egClearFateMarks() {
    Array.from(_egFateMarks.keys()).forEach(k => _egRemoveFateMark(k));
}

// Boss mechanic handler — marks 1 (phase 3: 2) random correct unfilled cells.
function _egMechFatedCell(monster, phase) {
    if (!cur || !cur.grid) return;
    const sol = cur.grid;
    const rows = sol.length, cols = sol[0].length;
    const pool = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (sol[r][c] !== 1) continue;
            if (userGrid[r][c] === 1 || revealedGrid[r][c]) continue;
            if (_egFateMarks.has(`${r}-${c}`)) continue;
            pool.push([r, c]);
        }
    }
    if (pool.length === 0) return;

    const count = phase >= 3 ? 2 : 1;
    const windowMs = phase >= 3 ? 5000 : 6000;
    const targets = pool.sort(() => Math.random() - 0.5).slice(0, Math.min(count, pool.length));

    showToast(t('eg_mech_fate').replace('{n}', targets.length).replace('{s}', windowMs / 1000));
    targets.forEach(([r, c]) => _egApplyFateMark(r, c, windowMs));
}


//------------------------------------------------------------------------
//-------------------SHARED MECHANIC: FOG BANK-----------------------------
//------------------------------------------------------------------------
// A wandering fog bank rolls over a random ~4x4 chunk of the grid, hiding
// cells and clues beneath it for several seconds. The puzzle stays fully
// playable underneath (pointer-events pass through) — you just cannot see
// that region. Never stacks with itself.

let _egFogBankTimer = null;

// Removes the fog overlay and clears its timer.
function _egRemoveFogBank() {
    clearTimeout(_egFogBankTimer);
    _egFogBankTimer = null;
    const fog = document.getElementById('eg-fog-bank');
    if (fog) fog.remove();
}

// Boss mechanic handler — fogs a random grid region for a phase-scaled duration.
function _egMechFogBank(monster, phase) {
    if (document.getElementById('eg-fog-bank')) return; // already fogged
    if (!cur || !cur.grid) return;
    const rows = cur.grid.length, cols = cur.grid[0].length;
    const w = Math.min(4, cols), h = Math.min(4, rows);
    const r0 = Math.floor(Math.random() * (rows - h + 1));
    const c0 = Math.floor(Math.random() * (cols - w + 1));

    const tbl = document.getElementById('ptable');
    const cellA = document.getElementById(`g-${r0}-${c0}`);
    const cellB = document.getElementById(`g-${r0 + h - 1}-${c0 + w - 1}`);
    if (!tbl || !cellA || !cellB) return;
    const parent = tbl.parentElement;
    if (!parent) return;

    const pr = parent.getBoundingClientRect();
    const ra = cellA.getBoundingClientRect();
    const rb = cellB.getBoundingClientRect();

    const fog = document.createElement('div');
    fog.id = 'eg-fog-bank';
    fog.className = 'eg-fog-bank';
    fog.textContent = '🌫️';
    fog.style.left = (ra.left - pr.left) + 'px';
    fog.style.top = (ra.top - pr.top) + 'px';
    fog.style.width = (rb.right - ra.left) + 'px';
    fog.style.height = (rb.bottom - ra.top) + 'px';
    parent.style.position = 'relative';
    parent.appendChild(fog);

    const duration = phase >= 3 ? 9000 : 7000;
    showToast(t('eg_mech_fog').replace('{n}', duration / 1000));
    _egFogBankTimer = setTimeout(_egRemoveFogBank, duration);
}


//------------------------------------------------------------------------
//-------------------SHARED MECHANIC: CLUE SCRAMBLE------------------------
//------------------------------------------------------------------------
// Shuffles the order of the numbers inside 2 random clue lines (rows and/or
// columns). No information is destroyed — the same numbers, just reordered —
// and everything reverts after a phase-scaled duration. Clue number spans
// are per-number elements (rn-{row}-{i} / cn-{col}-{i}); the scramble swaps
// their text among themselves, so solved-state styling is untouched.

let _egClueScrambleRestoreTimer = null;
let _egActiveClueScramble = null; // [{ spans:[el...], orig:[text...] }]

// Collects the per-number clue spans of one line ('r', idx) or ('c', idx).
// Filters by exact id pattern so row 1 never catches row 11's spans.
function _egCollectClueSpans(kind, idx) {
    const prefix = kind === 'r' ? `rn-${idx}-` : `cn-${idx}-`;
    const re = kind === 'r'
        ? new RegExp(`^rn-${idx}-\\d+$`)
        : new RegExp(`^cn-${idx}-\\d+$`);
    return Array.from(document.querySelectorAll('[id^="' + prefix + '"]'))
        .filter(el => re.test(el.id));
}

// Restores scrambled lines to their original number order. Defers while a
// Clue Blackout owns the clue text, same as the Clue Swap restore.
function _egRestoreClueScramble() {
    if (_egBlackoutActive) {
        _egClueScrambleRestoreTimer = setTimeout(_egRestoreClueScramble, 2000);
        return;
    }
    (_egActiveClueScramble || []).forEach(line => {
        line.spans.forEach((el, i) => {
            if (el.isConnected) el.textContent = line.orig[i];
        });
    });
    _egActiveClueScramble = null;
    document.querySelectorAll('.eg-scramble-clue').forEach(el => el.classList.remove('eg-scramble-clue'));
}

// Boss mechanic handler — scrambles 2 random clue lines, then reverts.
function _egMechClueScramble(monster, phase) {
    if (_egBlackoutActive || _egActiveClueScramble) return; // don't stack
    const rows = (cur && cur.grid) ? cur.grid.length : 0;
    const cols = (cur && cur.grid && cur.grid[0]) ? cur.grid[0].length : 0;
    if (!rows || !cols) return;

    // Pick 2 distinct lines across rows + columns.
    const total = rows + cols;
    const picks = [];
    let guard = 0;
    while (picks.length < 2 && guard++ < 40) {
        const k = Math.floor(Math.random() * total);
        const line = k < rows ? { kind: 'r', idx: k } : { kind: 'c', idx: k - rows };
        if (!picks.some(q => q.kind === line.kind && q.idx === line.idx)) picks.push(line);
    }

    const scrambled = [];
    picks.forEach(line => {
        const spans = _egCollectClueSpans(line.kind, line.idx).filter(el => el.isConnected);
        if (spans.length < 2) return;
        const orig = spans.map(el => el.textContent);
        // Fisher-Yates on a copy, insisting on a visibly changed order.
        let order = orig.slice(), tries = 0;
        do {
            order = orig.slice();
            for (let i = order.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [order[i], order[j]] = [order[j], order[i]];
            }
            tries++;
        } while (order.join('|') === orig.join('|') && tries < 10);
        if (order.join('|') === orig.join('|')) return; // all identical — nothing to do
        spans.forEach((el, i) => {
            el.textContent = order[i];
            el.classList.add('eg-scramble-clue');
        });
        scrambled.push({ spans, orig });
    });
    if (scrambled.length === 0) return;

    _egActiveClueScramble = scrambled;
    const duration = phase >= 3 ? 12000 : 8000;
    showToast(t('eg_mech_scramble').replace('{n}', duration / 1000));

    clearTimeout(_egClueScrambleRestoreTimer);
    _egClueScrambleRestoreTimer = setTimeout(_egRestoreClueScramble, duration);
}

// Full cleanup — restores originals immediately (unless a blackout owns the
// text, in which case the blackout's own restore wins anyway) and clears styling.
function _egRemoveClueScramble() {
    clearTimeout(_egClueScrambleRestoreTimer);
    _egClueScrambleRestoreTimer = null;
    if (_egActiveClueScramble && !_egBlackoutActive) {
        _egActiveClueScramble.forEach(line => {
            line.spans.forEach((el, i) => {
                if (el.isConnected) el.textContent = line.orig[i];
            });
        });
    }
    _egActiveClueScramble = null;
    document.querySelectorAll('.eg-scramble-clue').forEach(el => el.classList.remove('eg-scramble-clue'));
}


//------------------------------------------------------------------------
//-------------------SHARED MECHANIC: SOUL TITHE---------------------------
//------------------------------------------------------------------------
// The boss raises a damage shield that only yields to puzzle progress: fill
// N correct cells (3/4/5 by phase) to break it. Failsafe: the shield decays
// after 25s so it can never soft-lock the fight. Progress is observed via
// _egNotifyCorrectFill. Mirrors the Aegis Protocol pattern (bossImmune +
// shielded card badge) but counts fills instead of add kills.

function _egMechSoulTithe(monster, phase) {
    if (!monster || monster.soulTithe || monster.aegisUp || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const need = [0, 3, 4, 5][p];

    monster.soulTithe = { active: true, need, have: 0, timer: null };
    monster.bossImmune = true;
    const card = document.getElementById('eg-card-' + monster.id);
    if (card) card.classList.add('eg-nk-shielded');
    _egNkToast('eg_mech_tithe', `💀 Soul Tithe! Fill ${need} correct cells to break the shield!`);
    if (typeof _egRenderPanel === 'function') { try { _egRenderPanel(); } catch (e) {} }

    monster.soulTithe.timer = setTimeout(() => {
        if (!monster.soulTithe) return;
        monster.soulTithe = null;
        monster.bossImmune = false;
        const c2 = document.getElementById('eg-card-' + monster.id);
        if (c2) c2.classList.remove('eg-nk-shielded');
        _egNkToast('eg_tithe_timeout', '💀 The tithe holds... for now. The shield fades.', '#f87171');
        if (typeof _egRenderPanel === 'function') { try { _egRenderPanel(); } catch (e2) {} }
    }, 25000);
}

// Breaks an active tithe early (fill quota met). Called from _egNotifyCorrectFill.
function _egBreakSoulTithe(monster) {
    if (!monster.soulTithe) return;
    clearTimeout(monster.soulTithe.timer);
    monster.soulTithe = null;
    monster.bossImmune = false;
    const card = document.getElementById('eg-card-' + monster.id);
    if (card) card.classList.remove('eg-nk-shielded');
    _egNkToast('eg_tithe_broken', '💥 Tithe paid — shield broken! Burn the boss!', '#4ade80');
    if (typeof _egRenderPanel === 'function') { try { _egRenderPanel(); } catch (e) {} }
}

// Per-boss teardown — drops an active tithe silently. Called from _egBossCleanup.
function _egTitheTeardown(monsterId) {
    if (typeof _egMonsters !== 'undefined') {
        const m = _egMonsters.find(x => x.id === monsterId);
        if (m && m.soulTithe) {
            clearTimeout(m.soulTithe.timer);
            m.soulTithe = null;
            m.bossImmune = false;
        }
    }
    const card = document.getElementById('eg-card-' + monsterId);
    if (card) card.classList.remove('eg-nk-shielded');
}
