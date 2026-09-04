//------------------------------------------------------------------------
//-------------------BOSS: THE DANCER (boss_dancer)-----------------------------
//------------------------------------------------------------------------
// Rhythm-game homage: numbered footprints light up one after another —
// stand on each before its beat fades or take a zap. A dance, not a chase.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_dancer: {
        id: 'boss_dancer', name: 'The Dancer', emoji: '💃',
        baseHP: 940, baseDamage: 20, chargeMax: 12,
        element: 'lightning', resistances: { fire: 15, cold: 15, lightning: 30, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_dancer: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.00 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'dance_steps', intervalBase: 20000, intervalVariance: 5000, handler: '_egMechDanceSteps' },
            { name: 'fated_cell', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechFatedCell' },
        ],
    },
});


function _egMechDanceSteps(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const steps = [0, 4, 5, 6][p];
    const beatMs = [0, 2600, 2300, 2000][p];
    const radius = 55;
    const dmgPct = [0, 0.08, 0.10, 0.12][p];
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const pts = [];
    let guard = 0;
    while (pts.length < steps && guard++ < 80) {
        const x = 100 + Math.random() * Math.max(60, window.innerWidth - 200);
        const y = 120 + Math.random() * Math.max(60, window.innerHeight - 240);
        if (pts.every(q => Math.hypot(q.x - x, q.y - y) > 220)) pts.push({ x, y });
    }
    const els = pts.map((q, i) => {
        const el = _egNkEl(run, 'div', 'eg-nk-mem', String(i + 1));
        el.style.display = 'none';
        el.style.left = Math.round(q.x - radius) + 'px';
        el.style.top = Math.round(q.y - radius) + 'px';
        el.style.width = radius * 2 + 'px';
        el.style.height = radius * 2 + 'px';
        return el;
    });
    _egNkToast('eg_mech_dancer', '💃 The Dancer: Dance Steps! Follow the beat!');
    let idx = 0, t = 0, lit = false;
    _egNkLoop(run, (dtS) => {
        if (idx >= pts.length) return false;
        t += dtS * 1000;
        const el = els[idx];
        if (!lit) {
            lit = true;
            t = 0;
            el.style.display = '';
            el.classList.add('eg-nk-mem-on');
        }
        const c = _egNkPlayerCenter();
        if (c && Math.hypot(c.x - pts[idx].x, c.y - pts[idx].y) <= radius) {
            el.classList.remove('eg-nk-mem-on');
            el.classList.add('eg-nk-mem-locked');
            setTimeout(() => el.remove(), 400);
            idx++;
            lit = false;
            t = 0;
            return true;
        }
        if (t >= beatMs) {
            // Missed the beat — zap, then move on.
            const dealt = _egNkHit(dmgPct, 'lightning', level);
            _egNkAbilityHitToast(dealt, 'The Dancer', 'Dance Steps');
            el.classList.remove('eg-nk-mem-on');
            setTimeout(() => el.remove(), 400);
            idx++;
            lit = false;
            t = 0;
        }
        return true;
    });
}
