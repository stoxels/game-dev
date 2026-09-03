//------------------------------------------------------------------------
//-------------------BOSS: THE WORMHOLE (boss_wormhole)-------------------------
//------------------------------------------------------------------------
// Portal homage: two wormholes tear open — step into one and you fall out
// of the other. A hungry wisp rides you down the whole time, and it does
// not do doors. Lose it through the holes.
// This file holds EVERYTHING this boss needs in one place:
//   1. EG_BOSS_DEFS entry (stats, element, resistances)
//   2. EG_BOSS_MECHANICS entry (phases + mechanic schedule)
//   3. UNIQUE mechanic handlers (only this boss uses them)
//
// Shared mechanics live in shared-boss-abilities.js and are referenced
// by handler-name string.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    boss_wormhole: {
        id: 'boss_wormhole', name: 'The Wormhole', emoji: '🕳️',
        baseHP: 1080, baseDamage: 24, chargeMax: 12,
        element: 'shadow', resistances: { fire: 15, cold: 15, lightning: 15, shadow: 30 }
    },
});

Object.assign(EG_BOSS_MECHANICS, {
    boss_wormhole: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'portal_wisp', intervalBase: 21000, intervalVariance: 5000, handler: '_egMechPortalWisp' },
            { name: 'clue_scramble', intervalBase: 22000, intervalVariance: 5000, handler: '_egMechClueScramble' },
        ],
    },
});


function _egTeleportAvatarTo(x, y) {
    const el = document.getElementById('player-avatar-wrapper')
        || document.getElementById('player-avatar-simple');
    if (!el) return;
    if (typeof _setAvatarPos === 'function') {
        try { _setAvatarPos(el, Math.round(x), Math.round(y)); } catch (e) {}
    } else {
        el.style.left = Math.round(x) + 'px';
        el.style.top = Math.round(y) + 'px';
    }
}

function _egMechPortalWisp(monster, phase) {
    if (_egNkDodgeBusy() || _egNkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const wispSpeed = [0, 85, 100, 118][p];
    const portalR = 46, wispR = 22;
    const dmgPct = [0, 0.16, 0.19, 0.24][p];
    const durMs = 12000;
    const run = _egNkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const mkPortal = (fx, fy, emoji) => {
        const el = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-portal', emoji);
        const pt = { x: window.innerWidth * fx, y: window.innerHeight * fy, el };
        el.style.transform = 'translate(' + Math.round(pt.x - 30) + 'px,' + Math.round(pt.y - 30) + 'px)';
        return pt;
    };
    const pa = mkPortal(0.2, 0.35, '🟦');
    const pb = mkPortal(0.8, 0.7, '🟧');
    const wisp = _egNkEl(run, 'div', 'eg-nk-dot eg-nk-wisp', '👁️');
    const w = { x: window.innerWidth * 0.5, y: 90 };
    _egNkToast('eg_mech_wormhole', '🕳️ The Wormhole: Portal Wisp! Lose it through the holes!');
    let e = 0, cdUntil = 0, portalCdUntil = 0;
    _egNkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        const c = _egNkPlayerCenter();
        const pr = _egNkPlayerRect();
        if (c) {
            // Portal hop (cooldown-gated so you cannot flicker).
            if (now >= portalCdUntil) {
                const inA = Math.hypot(c.x - pa.x, c.y - pa.y) < portalR;
                const inB = Math.hypot(c.x - pb.x, c.y - pb.y) < portalR;
                if (inA || inB) {
                    const dst = inA ? pb : pa;
                    portalCdUntil = now + 1500;
                    _egTeleportAvatarTo(dst.x - (pr ? pr.width / 2 : 20), dst.y - (pr ? pr.height / 2 : 20));
                    _egNkToast('eg_blast_dodged', '🌀 Warped!', '#7dd3fc');
                }
            }
            const dx = c.x - w.x, dy = c.y - w.y;
            const d = Math.sqrt(dx * dx + dy * dy) || 1;
            w.x += (dx / d) * wispSpeed * dtS;
            w.y += (dy / d) * wispSpeed * dtS;
        }
        wisp.style.transform = 'translate(' + Math.round(w.x - 22) + 'px,' + Math.round(w.y - 22) + 'px)';
        if (c && now >= cdUntil && _egNkCircleHit(w.x, w.y, wispR, pr, 0)) {
            cdUntil = now + 1000;
            const dealt = _egNkHit(dmgPct, 'shadow', level);
            _egNkToast('eg_blast_hit', '💥 The blast hits you for ' + dealt + ' HP!', '#f87171');
        }
        return e < durMs;
    });
}
