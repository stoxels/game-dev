import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkAbilityHitToast, _nkDodgeBusy, _nkEl, _nkFrozen, _nkHit, _nkLoop, _nkNewRun, _nkPlayerCenter, _nkToast } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE MECH (boss_mech)---------------------------------
//------------------------------------------------------------------------
// Self-destruct homage: the Mech primes a nuke and shows the blast radius
// plus the concrete pillars that can save you. When the countdown ends,
// be behind cover: open sky to the blast is ash.
//
// Shared mechanics (soul_tithe) live in shared-boss-abilities.js and are
// referenced by handler-name string.
//------------------------------------------------------------------------

Object.assign(BOSS_DEFS, {
    boss_mech: {
        id: 'boss_mech', name: 'The Mech', emoji: '🤖',
        baseHP: 1100, baseDamage: 24, chargeMax: 12,
        element: 'fire', resistances: { fire: 30, cold: 15, lightning: 15, shadow: 15 }
    },
});

Object.assign(BOSS_MECHANICS, {
    boss_mech: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'self_destruct', intervalBase: 22000, intervalVariance: 5000, handler: '_mechSelfDestruct' },
            { name: 'soul_tithe', intervalBase: 23000, intervalVariance: 5000, handler: '_mechSoulTithe' },
        ],
    },
});


// True when a blast ray from the bomb crosses a cover rectangle.
// Used to judge whether a pillar blocks the line of sight.
export function _mechSegHitsRect(ax, ay, bx, by, r) {
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

// A countdown nuke with pillar cover; anyone without a pillar between
// them and the blast burns when the timer ends. Watch the counter.
export function _mechSelfDestruct(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const countdownMs = [0, 3200, 2800, 2400][p];
    const dmgPct = [0, 0.28, 0.32, 0.38][p];
    const run = _nkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const bx = window.innerWidth * 0.5, by = window.innerHeight * 0.3;
    const bomb = _nkEl(run, 'div', 'sx-nk-dot sx-nk-nuke', '🤖');
    bomb.style.transform = 'translate(' + Math.round(bx - 30) + 'px,' + Math.round(by - 30) + 'px)';
    // Two (phase 3: three) concrete pillars between you and the blast.
    const covers = [];
    const nCover = p >= 3 ? 3 : 2;
    for (let i = 0; i < nCover; i++) {
        const w = 60, h = 170;
        const x = window.innerWidth * (0.25 + 0.25 * i) + (Math.random() * 60 - 30);
        const y = window.innerHeight * 0.55 + (Math.random() * 60 - 30);
        const el = _nkEl(run, 'div', 'sx-nk-cover');
        el.style.left = Math.round(x) + 'px';
        el.style.top = Math.round(y) + 'px';
        el.style.width = w + 'px';
        el.style.height = h + 'px';
        covers.push({ left: x, right: x + w, top: y, bottom: y + h });
    }
    const label = _nkEl(run, 'div', 'sx-nk-trial-label', '☢️ TAKE COVER!');
    _nkToast('eg_mech_mech', '🤖 The Mech: Self-Destruct! Get behind cover!');
    let e = 0, done = false;
    _nkLoop(run, (dtS) => {
        e += dtS * 1000;
        const remain = Math.max(0, Math.ceil((countdownMs - e) / 1000));
        if (label) label.textContent = remain > 0 ? '☢️ ' + remain + '!' : '☢️ NOW!';
        bomb.classList.toggle('sx-nk-fuse', true);
        if (!done && e >= countdownMs) {
            done = true;
            if (label) label.remove();
            bomb.classList.add('sx-nk-boom');
            const c = _nkPlayerCenter();
            let covered = false;
            if (c) {
                covered = covers.some(r => _mechSegHitsRect(bx, by, c.x, c.y, r));
            }
            if (!covered) {
                const dealt = _nkHit(dmgPct, 'fire', level);
                _nkAbilityHitToast(dealt, 'The Mech', 'Self-Destruct');
            } else {
                _nkToast('eg_blast_dodged', '✅ Cover held!', '#4ade80');
            }
        }
        return e < countdownMs + 700;
    });
}
