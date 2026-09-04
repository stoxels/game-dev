//------------------------------------------------------------------------
//-------------------BOSS: THE WEAVER (boss_weaver)-----------------------------
//------------------------------------------------------------------------
// Thread-trap homage: the Weaver strings a live grid of tripwires — three
// horizontal, three vertical — and electrifies half of them at a time. Even
// threads one moment, odd the next; the warning flicker is your only friend.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_weaver: {
        id: 'boss_weaver', name: 'The Weaver', emoji: '🕸️',
        baseHP: 1060, baseDamage: 24, chargeMax: 12,
        element: 'shadow', resistances: { fire: 15, cold: 15, lightning: 15, shadow: 30 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_weaver: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'thread_grid', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechThreadGrid' },
            { name: 'prior_bomb', intervalBase: 19000, intervalVariance: 4000, handler: '_egMechPriorBomb' },
        ],
    },
});


function _egMechThreadGrid(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const cycles = [0, 3, 4, 5][p];
    const warnMs = 700, liveMs = [0, 2200, 1900, 1600][p];
    const thick = 12;
    const dmgPct = [0, 0.15, 0.18, 0.22][p];
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const W = window.innerWidth, H = window.innerHeight;
    const wires = [];
    [0.25, 0.5, 0.75].forEach((f, i) => {
        const h = _egNkEl(run, 'div', 'eg-nk-thread-h');
        h.style.top = Math.round(H * f) + 'px';
        const v = _egNkEl(run, 'div', 'eg-nk-thread-v');
        v.style.left = Math.round(W * f) + 'px';
        wires.push({ axis: 'h', pos: H * f, el: h, idx: i });
        wires.push({ axis: 'v', pos: W * f, el: v, idx: i + 3 });
    });
    const paint = (liveSet) => {
        wires.forEach((w, i) => {
            const live = liveSet.has(i);
            const warn = liveSet.warn && liveSet.warn.has(i);
            w.el.classList.toggle('eg-nk-thread-live', !!live);
            w.el.classList.toggle('eg-nk-thread-warn', !!warn && !live);
        });
    };
    _egNkToast('eg_mech_weaver', '🕸️ The Weaver: Thread Grid! Read the flicker!');
    let cycle = 0, stage = 'warn', t = 0, liveSet = new Set(), nextSet = new Set();
    const pickSet = () => {
        // Alternate even/odd wires, phase 3 sometimes electrifies everything.
        const parity = cycle % 2;
        const s = new Set();
        wires.forEach((w, i) => { if (i % 2 === parity) s.add(i); });
        if (p >= 3 && Math.random() < 0.3) wires.forEach((w, i) => s.add(i));
        return s;
    };
    nextSet = pickSet();
    nextSet.warn = nextSet;
    paint(nextSet);
    _egNkLoop(run, (dtS, now) => {
        if (cycle >= cycles) return false;
        t += dtS * 1000;
        if (stage === 'warn' && t >= warnMs) {
            stage = 'live';
            t = 0;
            liveSet = nextSet;
            liveSet.warn = null;
            paint(liveSet);
        } else if (stage === 'live') {
            const pr = _egNkPlayerRect();
            if (pr) {
                const caught = wires.some((w, i) => {
                    if (!liveSet.has(i)) return false;
                    return w.axis === 'h'
                        ? (pr.bottom > w.pos - thick / 2 && pr.top < w.pos + thick / 2)
                        : (pr.right > w.pos - thick / 2 && pr.left < w.pos + thick / 2);
                });
                if (caught && now >= (paint.cd || 0)) {
                    paint.cd = now + 900;
                    const dealt = _egNkHit(dmgPct, 'shadow', level);
                    _egNkAbilityHitToast(dealt, 'The Weaver', 'Thread Grid');
                }
            }
            if (t >= liveMs) {
                cycle++;
                if (cycle >= cycles) return false;
                stage = 'warn';
                t = 0;
                liveSet = new Set();
                nextSet = pickSet();
                nextSet.warn = nextSet;
                paint(nextSet);
            }
        }
        return true;
    });
}
