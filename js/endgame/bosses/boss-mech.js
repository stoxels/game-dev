//------------------------------------------------------------------------
//-------------------BOSS: THE MECH (boss_mech)---------------------------------
//------------------------------------------------------------------------
// Self-destruct homage: the Mech primes a nuke and shows you the blast
// radius — plus the concrete pillars that can save you. When the countdown
// ends, be behind cover: anything with open sky to the blast is ash.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_mech: {
        id: 'boss_mech', name: 'The Mech', emoji: '🤖',
        baseHP: 1100, baseDamage: 24, chargeMax: 12,
        element: 'fire', resistances: { fire: 30, cold: 15, lightning: 15, shadow: 15 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_mech: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'self_destruct', intervalBase: 22000, intervalVariance: 5000, handler: '_egMechSelfDestruct' },
            { name: 'soul_tithe', intervalBase: 23000, intervalVariance: 5000, handler: '_egMechSoulTithe' },
        ],
    },
});


// True when segment (ax,ay)-(bx,by) intersects rect r (line-of-sight block).
function _egMechSegHitsRect(ax, ay, bx, by, r) {
    const inside = (x, y) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    if (inside(ax, ay) || inside(bx, by)) return true;
    // Segment-segment intersection against the four rect edges.
    const seg = (x1, y1, x2, y2, x3, y3, x4, y4) => {
        const d = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
        if (!d) return false;
        const u = ((x3 - x1) * (y4 - y3) - (y3 - y1) * (x4 - x3)) / d;
        const v = ((x3 - x1) * (y2 - y1) - (y3 - y1) * (x2 - x1)) / d;
        return u >= 0 && u <= 1 && v >= 0 && v <= 1;
    };
    return seg(ax, ay, bx, by, r.left, r.top, r.right, r.top)
        || seg(ax, ay, bx, by, r.right, r.top, r.right, r.bottom)
        || seg(ax, ay, bx, by, r.right, r.bottom, r.left, r.bottom)
        || seg(ax, ay, bx, by, r.left, r.bottom, r.left, r.top);
}

function _egMechSelfDestruct(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const countdownMs = [0, 3200, 2800, 2400][p];
    const dmgPct = [0, 0.28, 0.32, 0.38][p];
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const bx = window.innerWidth * 0.5, by = window.innerHeight * 0.3;
    const bomb = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-nuke', '🤖');
    bomb.style.transform = 'translate(' + Math.round(bx - 30) + 'px,' + Math.round(by - 30) + 'px)';
    // Two (phase 3: three) concrete pillars between you and the blast.
    const covers = [];
    const nCover = p >= 3 ? 3 : 2;
    for (let i = 0; i < nCover; i++) {
        const w = 60, h = 170;
        const x = window.innerWidth * (0.25 + 0.25 * i) + (Math.random() * 60 - 30);
        const y = window.innerHeight * 0.55 + (Math.random() * 60 - 30);
        const el = _egNkEl(run, 'div', 'eg-nk-cover');
        el.style.left = Math.round(x) + 'px';
        el.style.top = Math.round(y) + 'px';
        el.style.width = w + 'px';
        el.style.height = h + 'px';
        covers.push({ left: x, right: x + w, top: y, bottom: y + h });
    }
    const label = _egNkEl(run, 'div', 'eg-nk-trial-label', '☢️ TAKE COVER!');
    _egNkToast('eg_mech_mech', '🤖 The Mech: Self-Destruct! Get behind cover!');
    let e = 0, done = false;
    _egNkLoop(run, (dtS) => {
        e += dtS * 1000;
        const remain = Math.max(0, Math.ceil((countdownMs - e) / 1000));
        if (label) label.textContent = remain > 0 ? '☢️ ' + remain + '!' : '☢️ NOW!';
        bomb.classList.toggle('eg-nk-fuse', true);
        if (!done && e >= countdownMs) {
            done = true;
            if (label) label.remove();
            bomb.classList.add('eg-nk-boom');
            const c = _egNkPlayerCenter();
            let covered = false;
            if (c) {
                covered = covers.some(r => _egMechSegHitsRect(bx, by, c.x, c.y, r));
            }
            if (!covered) {
                const dealt = _egNkHit(dmgPct, 'fire', level);
                _egNkAbilityHitToast(dealt, 'The Mech', 'Self-Destruct');
            } else {
                _egNkToast('eg_blast_dodged', '✅ Cover held!', '#4ade80');
            }
        }
        return e < countdownMs + 700;
    });
}
