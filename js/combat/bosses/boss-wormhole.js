import { Audio_Manager } from '../../audio/audio.js';
import { BOSS_DEFS, BOSS_MECHANICS } from './boss-framework.js';
import { _nkAbilityHitToast, _nkDodgeBusy, _nkDotHit, _nkEl, _nkFrozen, _nkHit, _nkLoop, _nkNewRun, _nkPlayerCenter, _nkPlayerRect, _nkToast } from './shared-boss-abilities.js';

//------------------------------------------------------------------------
//-------------------BOSS: THE WORMHOLE (boss_wormhole)-------------------------
//------------------------------------------------------------------------
// Portal homage: two wormholes tear open - step into one and fall out of
// the other. A hungry wisp rides you the whole time, and it does not do
// doors. Lose it through the holes.
//
// Shared mechanics (clue_scramble) live in shared-boss-abilities.js and
// are referenced by handler-name string.
//------------------------------------------------------------------------

Object.assign(BOSS_DEFS, {
    boss_wormhole: {
        id: 'boss_wormhole', name: 'The Wormhole', emoji: '🕳️',
        baseHP: 1080, baseDamage: 24, chargeMax: 12,
        element: 'shadow', resistances: { fire: 15, cold: 15, lightning: 15, shadow: 30 }
    },
});

Object.assign(BOSS_MECHANICS, {
    boss_wormhole: {
        phases: [
            { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.00 },
            { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.50 },
            { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.10 },
        ],
        immunityDuration: 2500,
        mechanics: [
            { name: 'portal_wisp', intervalBase: 21000, intervalVariance: 5000, handler: '_mechPortalWisp' },
            { name: 'clue_scramble', intervalBase: 22000, intervalVariance: 5000, handler: '_mechClueScramble' },
        ],
    },
});


// Moves the avatar sprite to a point, through the game's own mover when
// present. Plain fallback keeps portals working without that system.
export function _teleportAvatarTo(x, y) {
    const el = document.getElementById('player-avatar-wrapper')
        || document.getElementById('player-avatar-simple');
    if (!el) return;
    Audio_Manager.playSFX('boss_teleport');
    if (typeof _setAvatarPos === 'function') {
        try { globalThis._setAvatarPos(el, Math.round(x), Math.round(y)); } catch (e) {}
    } else {
        el.style.left = Math.round(x) + 'px';
        el.style.top = Math.round(y) + 'px';
    }
}

// Linked portal pair plus a chasing wisp. Hop through to shake the wisp;
// the hop cooldown stops flickering back and forth.
export function _mechPortalWisp(monster, phase) {
    if (_nkDodgeBusy() || _nkFrozen()) return;
    const p = Math.max(1, Math.min(3, Number(phase) || 1));
    const wispSpeed = [0, 85, 100, 118][p];
    const portalR = 46;
    const dmgPct = [0, 0.16, 0.19, 0.24][p];
    const durMs = 12000;
    const run = _nkNewRun(monster && monster.id, true);
    const level = monster ? monster.level : 1;
    const mkPortal = (fx, fy, emoji) => {
        const el = _nkEl(run, 'div', 'eg-nk-dot eg-nk-portal', emoji);
        const pt = { x: window.innerWidth * fx, y: window.innerHeight * fy, el };
        el.style.transform = 'translate(' + Math.round(pt.x - 30) + 'px,' + Math.round(pt.y - 30) + 'px)';
        return pt;
    };
    const pa = mkPortal(0.2, 0.35, '🟦');
    const pb = mkPortal(0.8, 0.7, '🟧');
    const wisp = _nkEl(run, 'div', 'eg-nk-dot eg-nk-wisp', '👁️');
    const w = { x: window.innerWidth * 0.5, y: 90 };
    _nkToast('eg_mech_wormhole', '🕳️ The Wormhole: Portal Wisp! Lose it through the holes!');
    let e = 0, cdUntil = 0, portalCdUntil = 0;
    _nkLoop(run, (dtS, now) => {
        e += dtS * 1000;
        const c = _nkPlayerCenter();
        const pr = _nkPlayerRect();
        if (c) {
            // Portal hop (cooldown-gated so you cannot flicker).
            if (now >= portalCdUntil) {
                const inA = Math.hypot(c.x - pa.x, c.y - pa.y) < portalR;
                const inB = Math.hypot(c.x - pb.x, c.y - pb.y) < portalR;
                if (inA || inB) {
                    const dst = inA ? pb : pa;
                    portalCdUntil = now + 1500;
                    _teleportAvatarTo(dst.x - (pr ? pr.width / 2 : 20), dst.y - (pr ? pr.height / 2 : 20));
                    _nkToast('eg_blast_dodged', '🌀 Warped!', '#7dd3fc');
                }
            }
            const dx = c.x - w.x, dy = c.y - w.y;
            const d = Math.sqrt(dx * dx + dy * dy) || 1;
            w.x += (dx / d) * wispSpeed * dtS;
            w.y += (dy / d) * wispSpeed * dtS;
        }
        wisp.style.transform = 'translate(' + Math.round(w.x - 22) + 'px,' + Math.round(w.y - 22) + 'px)';
        if (c && now >= cdUntil && _nkDotHit(wisp, pr, 0)) {
            cdUntil = now + 1000;
            const dealt = _nkHit(dmgPct, 'shadow', level);
            _nkAbilityHitToast(dealt, 'The Wormhole', 'Portal Wisp');
        }
        return e < durMs;
    });
}
