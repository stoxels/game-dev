//------------------------------------------------------------------------
//-------------------BOSS: THE VOIDBORN (boss_voidborn)-------------------------
//------------------------------------------------------------------------
// Pinnacle hunger: a collapsing choice — two zones, only the marked one
// real, and the choice comes fast — while void tendrils crawl after you
// from every corner. Choose quickly, then keep running from your choice.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_voidborn: {
        id: 'boss_voidborn', name: 'The Voidborn', emoji: '🌚',
        baseHP: 1200, baseDamage: 27, chargeMax: 10,
        element: 'shadow', resistances: { fire: 15, cold: 15, lightning: 15, shadow: 30 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_voidborn: {
        phases: [
            { threshold: 1.00, chargeMax: 10, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 7, damageMultiplier: 1.65 },
            { threshold: 0.30, chargeMax: 5, damageMultiplier: 2.30 },
        ],
        immunityDuration: 3000,
        mechanics: [
            { name: 'void_choice', intervalBase: 19000, intervalVariance: 4000, handler: '_egMechVoidChoice' },
            { name: 'void_tendrils', intervalBase: 20000, intervalVariance: 4000, handler: '_egMechVoidTendrils' },
            { name: 'prior_bomb', intervalBase: 19000, intervalVariance: 4000, handler: '_egMechPriorBomb' },
        ],
    },
});


function _egMechVoidChoice(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const radius = 95;
    const warnMs = [0, 2200, 1900, 1600][p];
    const activeMs = 3500;
    const dmgPct = [0, 0.26, 0.30, 0.36][p];
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const a = {
        x: 120 + Math.random() * Math.max(60, window.innerWidth - 240),
        y: 140 + Math.random() * Math.max(60, window.innerHeight - 280),
    };
    let b = {
        x: 120 + Math.random() * Math.max(60, window.innerWidth - 240),
        y: 140 + Math.random() * Math.max(60, window.innerHeight - 280),
    };
    let guard = 0;
    while (Math.hypot(b.x - a.x, b.y - a.y) < radius * 4 && guard++ < 20) {
        b = {
            x: 120 + Math.random() * Math.max(60, window.innerWidth - 240),
            y: 140 + Math.random() * Math.max(60, window.innerHeight - 280),
        };
    }
    const realFirst = Math.random() < 0.5;
    const mkZone = (z, real) => {
        const el = _egNkEl(run, 'div', 'eg-nk-mem' + (real ? ' eg-nk-mem-on' : ''));
        el.textContent = real ? '✨' : '';
        el.style.left = Math.round(z.x - radius) + 'px';
        el.style.top = Math.round(z.y - radius) + 'px';
        el.style.width = radius * 2 + 'px';
        el.style.height = radius * 2 + 'px';
        return el;
    };
    const elA = mkZone(a, realFirst);
    const elB = mkZone(b, !realFirst);
    _egNkToast('eg_mech_voidborn', '🌚 The Voidborn: Void Choice! Only the ✨ zone is real — hurry!');
    let e = 0, resolved = false;
    _egNkLoop(run, (dtS) => {
        e += dtS * 1000;
        if (!resolved && e >= warnMs) {
            // The false zone collapses; judgment begins.
            (realFirst ? elB : elA).classList.add('eg-nk-mark-hit');
            resolved = true;
        }
        if (e >= warnMs + activeMs) {
            const real = realFirst ? a : b;
            const c = _egNkPlayerCenter();
            if (!c || Math.hypot(c.x - real.x, c.y - real.y) > radius) {
                const dealt = _egNkHit(dmgPct, 'shadow', level);
                _egNkAbilityHitToast(dealt, 'The Voidborn', 'Void Choice');
            } else {
                _egNkToast('eg_blast_dodged', '✅ You chose... wisely.', '#4ade80');
            }
            return false;
        }
        return true;
    });
}

function _egMechVoidTendrils(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const count = [0, 3, 4, 4][p];
    const speed = [0, 68, 80, 95][p];
    const radius = 20;
    const dmgPct = [0, 0.10, 0.12, 0.15][p];
    const durMs = 11000;
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const corners = [
        [50, 80], [window.innerWidth - 50, 80],
        [50, window.innerHeight - 80], [window.innerWidth - 50, window.innerHeight - 80],
    ];
    const tendrils = [];
    for (let i = 0; i < count; i++) {
        const el = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-tendril', '🐙');
        const cn = corners[i % corners.length];
        tendrils.push({ x: cn[0], y: cn[1], wob: Math.random() * 6.28, cdUntil: 0, el });
    }
    _egNkToast('eg_mech_tendrils', '🌚 The Voidborn: Void Tendrils! They crawl from the corners!');
    let e = 0;
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        const c = _egNkPlayerCenter();
        const pr = _egNkPlayerRect();
        tendrils.forEach(td => {
            if (c) {
                const dx = c.x - td.x, dy = c.y - td.y;
                const d = Math.sqrt(dx * dx + dy * dy) || 1;
                td.x += (dx / d) * speed * dtS + Math.cos(e / 1000 * 2.4 + td.wob) * 20 * dtS;
                td.y += (dy / d) * speed * dtS + Math.sin(e / 1000 * 2.9 + td.wob) * 20 * dtS;
            }
            td.el.style.transform = 'translate(' + Math.round(td.x - 22) + 'px,' + Math.round(td.y - 22) + 'px)';
            if (pr && now >= td.cdUntil && _egNkDotHit(td.el, pr, 0)) {
                td.cdUntil = now + 800;
                _egNkHit(dmgPct, 'shadow', level);
            }
        });
        return e < durMs;
    });
}
