//------------------------------------------------------------------------
//-------------------BOSS: THE MNEMONIC (boss_maven)---------------------------
//------------------------------------------------------------------------
// PoE Maven homage: memory rite — visit 3 circles in shown order.
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
    boss_maven: {
        id: 'boss_maven', name: 'The Mnemonic', emoji: '🔢',
        baseHP: 980, baseDamage: 22, chargeMax: 12,
        element: 'shadow', resistances: { fire: 15, cold: 15, lightning: 15, shadow: 30 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_maven: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.00 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'memory_rite', intervalBase: 23000, intervalVariance: 5000, handler: '_egMechMemoryRite' },
            { name: 'clue_swap', intervalBase: 18000, intervalVariance: 4000, handler: '_egMechClueSwap' },
        ],
    },
});


function _egMechMemoryRite(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const radius = p >= 3 ? 62 : 70;
    const showMs = 950, visitMs = 8000;
    const zapPct = 0.18;
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const pts = [];
    let guard = 0;
    while (pts.length < 3 && guard++ < 60) {
        const x = 120 + Math.random() * Math.max(60, W - 240);
        const y = 140 + Math.random() * Math.max(60, H - 280);
        if (pts.every(q => Math.hypot(q.x - x, q.y - y) > 260)) pts.push({ x, y });
    }
    while (pts.length < 3) {
        pts.push({ x: W * (0.25 + pts.length * 0.25), y: H * 0.5 });
    }
    pts.forEach((q, i) => {
        q.el = _egNkEl(run, 'div', 'eg-nk-mem', String(i + 1));
        q.el.style.left = Math.round(q.x - radius) + 'px';
        q.el.style.top = Math.round(q.y - radius) + 'px';
        q.el.style.width = radius * 2 + 'px';
        q.el.style.height = radius * 2 + 'px';
        q.locked = false;
    });
    _egNkToast('eg_mech_memory', '🔢 The Mnemonic: Memory Rite! Visit the circles in order!');
    let e = 0, next = 0;
    const showTotal = showMs * 3;
    _egNkLoop(run, (dtS) => {
        e += dtS * 1000;
        const lit = Math.min(3, Math.floor(e / showMs));
        pts.forEach((q, i) => q.el.classList.toggle('eg-nk-mem-on', i < lit));
        if (e >= showTotal) {
            const c = _egNkPlayerCenter();
            if (c && next < 3) {
                const q = pts[next];
                if (Math.hypot(c.x - q.x, c.y - q.y) <= radius) {
                    q.locked = true;
                    q.el.classList.add('eg-nk-mem-locked');
                    next++;
                }
            }
        }
        if (e >= showTotal + visitMs || next >= 3) {
            const missing = 3 - next;
            if (missing <= 0) {
                _egNkToast('eg_memory_done', '✅ Rite complete!', '#4ade80');
            } else {
                const dealt = _egNkHit(Math.min(0.4, zapPct * missing), 'shadow', level);
                let msg = '💥 The rite zaps you for ' + dealt + ' HP!';
                try {
                    const raw = t('eg_memory_fail');
                    if (raw && raw !== 'eg_memory_fail') msg = raw.replace('{n}', dealt);
                } catch (e2) {}
                if (typeof showToast === 'function') showToast(msg, '#f87171');
            }
            return false;
        }
        return true;
    });
}
