//------------------------------------------------------------------------
//-------------------BOSS: THE ENCORE (boss_encore)-----------------------------
//------------------------------------------------------------------------
// Rhythm-click homage: approach rings close in on marked spots — be INSIDE
// the circle the moment each ring lands. Missing the moment stings. An
// inversion of every "stay out" instinct the other bosses taught you.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_encore: {
        id: 'boss_encore', name: 'The Encore', emoji: '🎵',
        baseHP: 1000, baseDamage: 22, chargeMax: 12,
        element: 'lightning', resistances: { fire: 15, cold: 15, lightning: 30, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_encore: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.00 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'encore_circles', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechEncoreCircles' },
            { name: 'fated_cell', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechFatedCell' },
        ],
    },
});


function _egMechEncoreCircles(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const rings = [0, 3, 4, 4][p];
    const closeMs = [0, 1800, 1600, 1400][p];
    const radius = 70;
    const dmgPct = [0, 0.13, 0.15, 0.18][p];
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const pts = [];
    let guard = 0;
    while (pts.length < rings && guard++ < 80) {
        const x = 110 + Math.random() * Math.max(60, window.innerWidth - 220);
        const y = 130 + Math.random() * Math.max(60, window.innerHeight - 260);
        if (pts.every(q => Math.hypot(q.x - x, q.y - y) > 260)) pts.push({ x, y });
    }
    const queue = pts.map((q, i) => {
        const spot = _egNkEl(run, 'div', 'eg-nk-mem', String(i + 1));
        spot.style.left = Math.round(q.x - radius) + 'px';
        spot.style.top = Math.round(q.y - radius) + 'px';
        spot.style.width = radius * 2 + 'px';
        spot.style.height = radius * 2 + 'px';
        const ring = _egNkEl(run, 'div', 'eg-nk-ring eg-nk-ring-warn');
        return { ...q, t: -i * 900, judged: false, spot, ring };
    });
    _egNkToast('eg_mech_encore', '🎵 The Encore: Encore Circles! Be inside when the ring lands!');
    _egNkLoop(run, (dtS) => {
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
                const c = _egNkPlayerCenter();
                if (c && Math.hypot(c.x - r.x, c.y - r.y) <= radius) {
                    r.spot.classList.add('eg-nk-mem-locked');
                    _egNkToast('eg_blast_dodged', '✅ Perfect!', '#4ade80');
                } else {
                    r.spot.classList.add('eg-nk-mark-hit');
                    const dealt = _egNkHit(dmgPct, 'lightning', level);
                    _egNkToast('eg_blast_hit', '💥 The blast hits you for ' + dealt + ' HP!', '#f87171');
                }
                setTimeout(() => r.spot.remove(), 500);
            }
        });
        return pending;
    });
}
