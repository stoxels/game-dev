// Secret-of-Mana-style overcharge tiers and their weapon arts. This module
// owns charge mapping, secondary damage, labels, and synchronous visuals;
// encounter-melee-impact.js owns the impact pipeline. Sequenced avatar
// movement lives in encounter-melee-delivery.js.

import { Audio_Manager } from '../audio/audio.js';
import { t } from '../translation/translations.js';
import { _getElementCentre } from './combat-class-projectiles.js';
import { _meleeLeapTo } from './encounter-melee-delivery.js';
import { _damageTargetById, _showStatusLabel } from './encounter-monster-damage.js';
import { _restartFlashClass } from './encounter.js';
import { _facingFromVector, _getEquippedWeaponInfo } from './combat-weapon-swing-config.js';
import { _meleeImpactThump, _showWeaponSwing, _weaponSwingSound } from './combat-weapon-swing.js';

// Overcharge tuning (Secret-of-Mana-style weapon arts): the charge bar
// auto-fills to 100% on its own (see _tickPlayer in
// encounter-tick.js) and, while the attack key is HELD past full, keeps
// filling through the overcharge tiers up to this multiplier (5 = up to
// 500% / 5x damage for a patient player). Releasing E inside a tier band
// unleashes that tier's weapon art (see _meleeTierForCharge /
// _meleeTierArt): 200% dash-through, 300% + sky leap onto a second
// monster, 400% + weapon nova around the target, 500% grand nova that
// strikes every monster on screen.
export const MELEE_OVERCHARGE_MULT = 5;
export const MELEE_OVERCHARGE_RATIO = 5;

// Overcharge climb rates per milestone band (Secret-of-Mana-style: each
// weapon level takes longer than the last). Index = the tier of the
// CURRENT charge (see _meleeTierForCharge): band 0 fills 100→200% at
// full speed, band 1 fills 200→300% at 80%, band 2 at 62%, band 3
// (400→500%) at 48% - reaching the 500% grand nova is a real commitment.
// Pure data + pure helper - safe to unit-test.
export const MELEE_OVERCHARGE_RATE_PER_TIER = [1, 0.8, 0.62, 0.48];
export function _overchargeRateForTier(tier) {
    const bands = MELEE_OVERCHARGE_RATE_PER_TIER;
    let t = Math.floor(Number(tier) || 0);
    if (t < 0) t = 0;
    if (t >= bands.length) t = bands.length - 1;
    return bands[t];
}

// Weapon-art tier for a spent charge share (0..5): 0 = plain hit (below
// 200%), 1 = released at 200-299%, 2 = 300-399%, 3 = 400-499%,
// 4 = 500% (fully overcharged). Pure - safe to unit-test.
export function _meleeTierForCharge(chargePct) {
    const c = Math.max(0, Number(chargePct) || 0);
    if (c >= MELEE_OVERCHARGE_RATIO - 0.001) return 4;
    if (c >= 4) return 3;
    if (c >= 3) return 2;
    if (c >= 2) return 1;
    return 0;
}

// Tier display name: translated when the key exists, English fallback
// otherwise (same guard shape as the parry feedback labels).
export function _meleeTierLabel(key, fallback) {
    try {
        if (typeof t === 'function') {
            const txt = t(key);
            if (txt && txt !== key) return txt;
        }
    } catch (e) {}
    return fallback;
}

//-------------------WEAPON ARTS (overcharge tiers)------------------------
// Secret-of-Mana-style payoff for holding E past full charge. Tiers stack
// upward - a 400% release dashes AND leaps AND novas:
//   tier 1 (200-299%): the sprite charges the target and back (dash-through)
//   tier 2 (300-399%): dash + a jump attack onto one random other monster
//   tier 3 (400-499%): dash + leap + weapon nova: every other monster
//                      sharing the target's spawn location takes the same
//                      hit, with a ring of the equipped weapon bursting
//                      around the target
//   tier 4 (500%):     dash + leap + GRAND nova: EVERY other living monster
//                      takes the hit, with a bigger nova + fullscreen flash
// Secondary victims take rawHit (no exec finisher - that is the primary
// target's privilege).
//
// Two playouts: SYNCHRONOUS (default - tests, reduced-motion, teardown:
// damage applies immediately, visuals are pure theatre) and SEQUENCED
// (opts.sequenced, after a visible delivery dash: the avatar is already
// parked on the target, so no dash visual and no labels here - those were
// the launch telegraph. The sky leap travels leg by leg with its hit on
// arrival, then novas burst). Sequenced mode returns a Promise that
// resolves when the follow-through lands (the caller glides the avatar
// home afterwards); sync mode returns undefined. Never throws; damage
// always applies even without DOM.
export function _meleeTierArt(targetId, tier, rawHit, elements, wasCrit, opts) {
    if (!tier || tier < 1) return undefined;
    if (opts && opts.sequenced) return _meleeTierArtSequenced(targetId, tier, rawHit, elements, wasCrit);
    const hitOpts = { isCrit: !!wasCrit, isMelee: true };
    const othersAlive = () => {
        try {
            return globalThis._monsters.filter(m => m && m.id !== targetId && m.currentHP > 0);
        } catch (e) { return []; }
    };

    // Tier 1+ reads on the primary target: the dash visual always plays,
    // but the label names the HIGHEST art unlocked (tiers 3/4 rename it).
    _meleeDashVisual(targetId);
    if (tier <= 2) _showStatusLabel(targetId, _meleeTierLabel('eg_melee_tier1', 'Dash Strike!'));

    // Tier 2+: leap onto one random other living monster for the same hit.
    if (tier >= 2) {
        const others = othersAlive();
        if (others.length) {
            const victim = others[Math.floor(Math.random() * others.length)];
            _meleeLeapVisual(victim.id);
            _showStatusLabel(victim.id, _meleeTierLabel('eg_melee_tier2', 'Sky Leap!'));
            _damageTargetById(victim.id, rawHit, elements, hitOpts);
            if (typeof _meleeImpactThump === 'function') {
                try { _meleeImpactThump(victim.id); } catch (e) {}
            }
        }
    }

    // Tier 3+: weapon nova around the primary target. Tier 3 splashes the
    // target's spawn location (zone panel); tier 4 (grand nova) strikes
    // every other living monster on screen.
    if (tier >= 3) {
        const grand = tier >= 4;
        let zoneId = null;
        try {
            const primary = globalThis._monsters.find(m => m && m.id === targetId);
            zoneId = primary ? primary.zoneId : null;
        } catch (e) {}
        _meleeNovaVisual(targetId, grand);
        _showStatusLabel(targetId, grand
            ? _meleeTierLabel('eg_melee_tier4', 'MANA STRIKE!')
            : _meleeTierLabel('eg_melee_tier3', 'Weapon Nova!'));
        const victims = grand
            ? othersAlive()
            : othersAlive().filter(m => zoneId == null || m.zoneId === zoneId);
        victims.forEach(m => {
            try {
                const card = (typeof document !== 'undefined')
                    ? document.getElementById(`eg-card-${m.id}`) : null;
                if (card) _restartFlashClass(card, 'eg-flash-cleave');
            } catch (e) {}
            _damageTargetById(m.id, rawHit, elements, hitOpts);
            if (typeof _meleeImpactThump === 'function') {
                try { _meleeImpactThump(m.id); } catch (e) {}
            }
        });
        if (grand) _meleeGrandFlash();
    }
}

// Waits for a frozen presentation beat inside the sequenced follow-through.
// This private timing helper is separate from the avatar movement owner.
function _meleeWaitMs(ms) {
    return new Promise((resolve) => {
        try { setTimeout(resolve, Math.max(0, ms || 0)); }
        catch (e) { resolve(); }
    });
}

// Sequenced follow-through for a delivered art (see _meleeTierArt): the
// avatar is already parked on the primary target and the telegraph labels
// were shown at launch. Tier 2+ travels a visible sky-leap arc onto the
// second victim with the swing + damage ON ARRIVAL there; tier 3+ bursts
// the nova around the primary target. Resolves when the follow-through
// lands (damage applied even without DOM); never rejects, never throws.
function _meleeTierArtSequenced(targetId, tier, rawHit, elements, wasCrit) {
    const run = async () => {
        const hitOpts = { isCrit: !!wasCrit, isMelee: true };
        const othersAlive = () => {
            try {
                return globalThis._monsters.filter(m => m && m.id !== targetId && m.currentHP > 0);
            } catch (e) { return []; }
        };
        // Tier 2+: leap onto one random other living monster - picked NOW
        // (it may have died while the hero dashed in) and struck on
        // arrival, with the equipped weapon swinging at it mid-flight.
        if (tier >= 2) {
            const others = othersAlive();
            if (others.length) {
                const victim = others[Math.floor(Math.random() * others.length)];
                _showStatusLabel(victim.id, _meleeTierLabel('eg_melee_tier2', 'Sky Leap!'));
                await _meleeLeapTo(victim.id);
                Audio_Manager.playSFX('art_land_thud');
                _meleeLeapVisual(victim.id, { swingOnly: true });
                _damageTargetById(victim.id, rawHit, elements, hitOpts);
                if (typeof _meleeImpactThump === 'function') {
                    try { _meleeImpactThump(victim.id); } catch (e) {}
                }
                await _meleeWaitMs(120);
            }
        }

        // Tier 3+: weapon nova around the primary target (same victim rules
        // as the synchronous playout - zone splash, or everything on grand).
        if (tier >= 3) {
            const grand = tier >= 4;
            let zoneId = null;
            try {
                const primary = globalThis._monsters.find(m => m && m.id === targetId);
                zoneId = primary ? primary.zoneId : null;
            } catch (e) {}
            _meleeNovaVisual(targetId, grand);
            const victims = grand
                ? othersAlive()
                : othersAlive().filter(m => zoneId == null || m.zoneId === zoneId);
            victims.forEach(m => {
                try {
                    const card = (typeof document !== 'undefined')
                        ? document.getElementById(`eg-card-${m.id}`) : null;
                    if (card) _restartFlashClass(card, 'eg-flash-cleave');
                } catch (e) {}
                _damageTargetById(m.id, rawHit, elements, hitOpts);
                if (typeof _meleeImpactThump === 'function') {
                    try { _meleeImpactThump(m.id); } catch (e) {}
                }
            });
            if (grand) _meleeGrandFlash();
            // Let the burst read before the hero glides home.
            await _meleeWaitMs(320);
        }
    };
    try {
        const p = run();
        if (p && typeof p.catch === 'function') return p.catch(() => {});
        return Promise.resolve();
    } catch (e) { return Promise.resolve(); }
}

// Dash-through visual (synchronous playout only - sequenced deliveries fly
// via _meleeDashOut instead): lunges the avatar toward the target card
// and snaps back (the hit already landed - this is pure theatre). The
// clamped so the sprite never leaves the screen on far-away cards.
// No-op without DOM; skipped under prefers-reduced-motion. Never throws.
export function _meleeDashVisual(targetId) {
    try {
        if (typeof document === 'undefined') return;
        const avatar = document.getElementById('player-avatar-wrapper');
        const card = (targetId != null) ? document.getElementById(`eg-card-${targetId}`) : null;
        if (card) Audio_Manager.playSFX('art_dash_strike');
        if (!avatar || !card || typeof avatar.animate !== 'function') return;
        if (typeof window !== 'undefined' && window.matchMedia
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const a = _getElementCentre(avatar);
        const b = _getElementCentre(card);
        let dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 1;
        // Dash-through: the sprite charges the target across the screen and
        // back, from ANY distance (strikes are range-independent) - always
        // visibly, even point-blank (a pure dist-scaled lunge shrank to
        // ~20px up close and connected dashes were invisible). Duration
        // scales with the travel so far dashes don't look like teleports.
        const lunge = Math.max(90, dist + 40);
        dx = (dx / dist * lunge).toFixed(1);
        dy = (dy / dist * lunge).toFixed(1);
        const duration = Math.min(900, Math.round(300 + dist * 0.55));
        avatar.animate([
            { transform: 'translate(0px, 0px)' },
            { transform: `translate(${dx}px, ${dy}px)` },
            { transform: 'translate(0px, 0px)' },
        ], { duration, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' });
    } catch (e) {}
}

// Sky-leap visual: the avatar hops high toward the second victim while the
// equipped weapon swings at it. Damage is applied by the caller - this is
// pure theatre. No-op without DOM; never throws.
// opts.swingOnly (sequenced deliveries): skip the in-place hop - the avatar
// was FLOWN here by _meleeLeapTo and a fresh from-origin bounce would
// snap it back to its laid-out spot; only the weapon swing + sound play.
export function _meleeLeapVisual(victimId, opts) {
    try {
        if (typeof document === 'undefined') return;
        const avatar = document.getElementById('player-avatar-wrapper');
        const card = (victimId != null) ? document.getElementById(`eg-card-${victimId}`) : null;
        if (card && !(opts && opts.swingOnly)) Audio_Manager.playSFX('art_sky_leap');
        if (avatar && typeof avatar.animate === 'function' && !(opts && opts.swingOnly)) {
            let reduce = false;
            try {
                reduce = !!(typeof window !== 'undefined' && window.matchMedia
                    && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
            } catch (e) {}
            if (!reduce) {
                avatar.animate([
                    { transform: 'translate(0px, 0px) scale(1)' },
                    { transform: 'translate(0px, -70px) scale(1.12)' },
                    { transform: 'translate(0px, 0px) scale(1)' },
                ], { duration: 480, easing: 'cubic-bezier(0.3, 0.6, 0.4, 1)' });
            }
        }
        if (!card) return;
        try {
            const fam = (typeof _getEquippedWeaponInfo === 'function')
                ? _getEquippedWeaponInfo().family : 'sword';
            let face = 'down';
            if (avatar && typeof _facingFromVector === 'function') {
                const a = _getElementCentre(avatar);
                const b = _getElementCentre(card);
                face = _facingFromVector(b.x - a.x, b.y - a.y);
            }
            if (typeof _showWeaponSwing === 'function') _showWeaponSwing(fam, face);
            if (typeof _weaponSwingSound === 'function') _weaponSwingSound(fam);
        } catch (e) {}
    } catch (e) {}
}

// Weapon-nova visual: a ring of the EQUIPPED weapon's icon bursts outward
// around the target card (styles in css/endgame/weapon-swing.css). Falls
// back to ⚔️ without a weapon. Never throws.
export function _meleeNovaVisual(targetId, grand) {
    try {
        if (typeof document === 'undefined') return;
        const card = (targetId != null) ? document.getElementById(`eg-card-${targetId}`) : null;
        if (!card) return;
        Audio_Manager.playSFX(grand ? 'art_grand_nova' : 'art_nova');
        let icon = '⚔️';
        try {
            const info = (typeof _getEquippedWeaponInfo === 'function')
                ? _getEquippedWeaponInfo() : null;
            if (info && info.item && info.item.icon) icon = String(info.item.icon);
        } catch (e) {}
        const c = _getElementCentre(card);
        const el = document.createElement('div');
        el.className = 'eg-melee-nova' + (grand ? ' eg-melee-nova-grand' : '');
        const bits = grand ? 12 : 8;
        for (let i = 0; i < bits; i++) {
            const s = document.createElement('span');
            s.className = 'eg-melee-nova-bit';
            s.textContent = icon;
            const ang = (i / bits) * Math.PI * 2;
            s.style.setProperty('--eg-nova-x', Math.cos(ang).toFixed(3));
            s.style.setProperty('--eg-nova-y', Math.sin(ang).toFixed(3));
            el.appendChild(s);
        }
        el.style.left = `${c.x}px`;
        el.style.top = `${c.y}px`;
        document.body.appendChild(el);
        setTimeout(() => { try { el.remove(); } catch (e) {} }, grand ? 900 : 650);
    } catch (e) {}
}

// Fullscreen gold flash for the 500% grand nova (styles in
// css/endgame/weapon-swing.css). Skipped under prefers-reduced-motion.
export function _meleeGrandFlash() {
    try {
        if (typeof document === 'undefined') return;
        if (typeof window !== 'undefined' && window.matchMedia
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const el = document.createElement('div');
        el.className = 'eg-melee-grand-flash';
        document.body.appendChild(el);
        setTimeout(() => { try { el.remove(); } catch (e) {} }, 750);
    } catch (e) {}
}
