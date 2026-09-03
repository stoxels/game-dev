//------------------------------------------------------------------------
//-------------------BOSS: THE STORMQUEEN (boss_stormqueen)---------------------
//------------------------------------------------------------------------
// Pinnacle tempest: three hunting storms that never tire, under a ceaseless
// shrapnel downpour. The storms herd you; the sky finishes the job. Keep
// your distance from everything, all at once.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_stormqueen: {
        id: 'boss_stormqueen', name: 'The Stormqueen', emoji: '🌩️',
        baseHP: 1180, baseDamage: 26, chargeMax: 11,
        element: 'lightning', resistances: { fire: 15, cold: 15, lightning: 30, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_stormqueen: {
        phases: [
            { threshold: 1.00, chargeMax: 11, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 8, damageMultiplier: 1.60 },
            { threshold: 0.30, chargeMax: 5, damageMultiplier: 2.20 },
        ],
        immunityDuration: 3000,
        mechanics: [
            { name: 'queen_storms', intervalBase: 19000, intervalVariance: 4000, handler: '_egMechQueenStorms' },
            { name: 'shrapnel_downpour', intervalBase: 20000, intervalVariance: 4000, handler: '_egMechShrapnelDownpour' },
            { name: 'fated_cell', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechFatedCell' },
        ],
    },
});


function _egMechQueenStorms(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const speed = [0, 62, 75, 92][p];
    const dotPct = [0, 11, 13, 16][p];
    const radius = 100;
    const durMs = 10000;
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const storms = [];
    for (let i = 0; i < 3; i++) {
        const el = _egNkEl(run, 'div', 'eg-nk-storm');
        el.style.width = radius * 2 + 'px';
        el.style.height = radius * 2 + 'px';
        const s = {
            x: window.innerWidth * (0.2 + 0.3 * i),
            y: 80 + (i % 2) * (window.innerHeight - 160),
            el,
        };
        el.style.transform = 'translate(' + Math.round(s.x - radius) + 'px,' + Math.round(s.y - radius) + 'px)';
        storms.push(s);
    }
    _egNkToast('eg_mech_stormqueen', '🌩️ The Stormqueen: Queen Storms! No distance is safe!');
    let e = 0, dotWarnAt = 0;
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        const c = _egNkPlayerCenter();
        storms.forEach(s => {
            if (c) {
                const dx = c.x - s.x, dy = c.y - s.y;
                const d = Math.sqrt(dx * dx + dy * dy) || 1;
                s.x += (dx / d) * speed * dtS;
                s.y += (dy / d) * speed * dtS;
            }
            s.el.style.transform = 'translate(' + Math.round(s.x - radius) + 'px,' + Math.round(s.y - radius) + 'px)';
        });
        const pr = _egNkPlayerRect();
        if (pr) {
            const inside = storms.some(s => _egNkCircleHit(s.x, s.y, radius, pr, 0));
            if (inside) {
                _egNkDotTick(run, dotPct, dtS, level, 'lightning');
                if (now - dotWarnAt > 3000) {
                    dotWarnAt = now;
                    _egNkToast('eg_nk_move', '⚠️ Move!', '#f87171');
                }
            } else {
                run.dotAcc = 0;
            }
        }
        return e < durMs;
    });
}

function _egMechShrapnelDownpour(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const total = [0, 14, 16, 20][p];
    const emitMs = 2200;
    const warnMs = 700, radius = 26;
    const dmgPct = [0, 0.06, 0.07, 0.09][p];
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const drops = [];
    let emitted = 0, emitAcc = 0, cdUntil = 0;
    _egNkToast('eg_mech_downpour', '🌩️ The Stormqueen: Shrapnel Downpour! The sky falls!');
    _egNkLoop(run, (dtS, now) => {
        emitAcc += dtS * 1000;
        const step = emitMs / total;
        while (emitted < total && emitAcc >= step) {
            emitAcc -= step;
            emitted++;
            let x, y;
            if (Math.random() < 0.7) {
                const c = _egNkPlayerCenter();
                x = (c ? c.x : window.innerWidth / 2) + (Math.random() * 220 - 110);
                y = (c ? c.y : window.innerHeight / 2) + (Math.random() * 220 - 110);
            } else {
                x = 40 + Math.random() * Math.max(40, window.innerWidth - 80);
                y = 40 + Math.random() * Math.max(40, window.innerHeight - 80);
            }
            const el = _egNkEl(run, 'div', 'eg-nk-mark');
            el.style.left = Math.round(x - radius) + 'px';
            el.style.top = Math.round(y - radius) + 'px';
            el.style.width = radius * 2 + 'px';
            el.style.height = radius * 2 + 'px';
            drops.push({ x, y, t: 0, struck: false, el });
        }
        const pr = _egNkPlayerRect();
        for (let i = drops.length - 1; i >= 0; i--) {
            const d = drops[i];
            d.t += dtS * 1000;
            if (!d.struck && d.t >= warnMs) {
                d.struck = true;
                d.el.classList.add('eg-nk-mark-hit');
                if (pr && now >= cdUntil && _egNkCircleHit(d.x, d.y, radius, pr, 0)) {
                    cdUntil = now + 350;
                    _egNkHit(dmgPct, 'lightning', level);
                }
            }
            if (d.t >= warnMs + 400) {
                d.el.remove();
                drops.splice(i, 1);
            }
        }
        return emitted < total || drops.length > 0;
    });
}
