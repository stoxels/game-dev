//------------------------------------------------------------------------
//-------------------CONSTANTS & DATA DEFINITIONS-------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------



// Class projectile visuals
// Maps playerClass to the visual appearance of the outgoing player projectile.
// _default is used when the player's class is null or unrecognised.
//
// rotOffset: extra degrees added on top of the flight angle so the emoji's
// tip lines up with its direction of travel (tweak per platform rendering).
// rotate: false marks symmetric/amorphous emojis that should not spin.
const EG_CLASS_PROJECTILES = {
    probabilist:   { emoji: '➤',  cssClass: 'eg-proj-arrow',    duration: 1000, easing: 'linear',   rotOffset: 0 },
    mathmagician:  { emoji: '🔥', cssClass: 'eg-proj-fireball', duration: 1000, easing: 'ease-in',  rotOffset: 90 },
    statistician:  { emoji: '🗡️', cssClass: 'eg-proj-sword',    duration: 1000, easing: 'ease-out', rotOffset: -135 },
    outlier:       { emoji: '💫', cssClass: 'eg-proj-dizzy',    duration: 1000, easing: 'linear',   rotate: false },
    actuary:       { emoji: '📜', cssClass: 'eg-proj-scroll',   duration: 1000, easing: 'ease-out', rotate: false },
    recursionist:  { emoji: '♾️', cssClass: 'eg-proj-infinity', duration: 1000, easing: 'linear',   rotate: false },
    markovian:     { emoji: '⛓️', cssClass: 'eg-proj-chain',    duration: 1000, easing: 'ease-in',  rotate: false },
    bayesian:      { emoji: '🧠', cssClass: 'eg-proj-brain',    duration: 1000, easing: 'ease-in',  rotate: false },
    random_walker: { emoji: '🎲', cssClass: 'eg-proj-dice',     duration: 1000, easing: 'linear',   rotate: false },
    _default:      { emoji: '⚡', cssClass: 'eg-proj-default',  duration: 400,  easing: 'ease-in',  rotate: false },
};

// Reveal-triggered projectiles: item / passive / class-ability reveals during
// an active endgame encounter fire reduced-damage projectiles from every
// revealed cell toward the currently targeted monster.
const EG_REVEAL_PROJECTILE_DAMAGE_PCT = 30; // % of a full correct-fill hit
const EG_REVEAL_PROJECTILE_MAX = 12;        // safety cap per reveal event
const EG_REVEAL_PROJECTILE_STAGGER_MS = 60; // delay between consecutive shots

// Spell Damage scales how hard reveal projectiles hit, on top of the base %:
//   flat Spell Damage      → +0.5 percentage points per point
//   increased Spell Damage → +1 percentage point per 1%
const EG_REVEAL_PCT_PER_FLAT_SPELL_DMG = 0.5;
const EG_REVEAL_PCT_PER_INC_SPELL_DMG = 1;

// Resolves the current reveal-projectile damage percentage from the player's
// live gear stats (recomputed on demand, so equips apply instantly).
function _egGetRevealProjectileDamagePct() {
    const stats = _egComputePlayerStats();
    return EG_REVEAL_PROJECTILE_DAMAGE_PCT
        + (stats.spellDamageFlat || 0) * EG_REVEAL_PCT_PER_FLAT_SPELL_DMG
        + (stats.spellDamageIncPct || 0) * EG_REVEAL_PCT_PER_INC_SPELL_DMG;
}

//------------------------------------------------------------------------
//-------------------PROJECTILE HELPERS-----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns the projectile definition for the player's current class.
// Falls back to _default when class is null or unrecognised.
function _egGetProjectileDef() {
    const cls = (typeof STATE !== 'undefined' && STATE.playerClass)
        ? STATE.playerClass.toLowerCase()
        : '_default';
    return EG_CLASS_PROJECTILES[cls] || EG_CLASS_PROJECTILES._default;
}

// Returns the screen-centre coordinates of a DOM element as { x, y }.
function _egGetElementCentre(el) {
    const rect = el.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

// Creates, animates, and auto-removes a projectile div travelling from start to end.
// onArrive() is called when the animation completes (i.e. on impact).
// Optional orient = { rotate: bool, rotOffset: deg } points the emoji along
// the flight vector instead of keeping its upright resting orientation.
function _egFireProjectile(emoji, cssClass, start, end, duration, easing, onArrive, orient) {
    const proj = document.createElement('div');
    proj.className = `eg-projectile ${cssClass}`;
    proj.textContent = emoji;
    proj.style.left = '0px';
    proj.style.top = '0px';
    document.body.appendChild(proj);

    let rot = '';
    if (orient && orient.rotate) {
        const flightAngle = Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI;
        rot = `rotate(${flightAngle + (orient.rotOffset || 0)}deg) `;
    }

    const anim = proj.animate([
        { transform: `translate(${start.x}px, ${start.y}px) ${rot}scale(1.5)` },
        { transform: `translate(${end.x}px,   ${end.y}px)   ${rot}scale(0.5)` },
    ], { duration, easing });

    anim.onfinish = () => { proj.remove(); onArrive(); };
}

// Entry point for programmatic reveals (items, passives, class abilities).
// Fired from _applyCellEffect(..., 'reveal') so every non-manual reveal path
// is covered. Each revealed cell launches one reduced-damage projectile at
// the current target; no-op while no endgame encounter is running.
function _egOnProgrammaticReveal(cellIds) {
    if (typeof _egIsActive !== 'function' || !_egIsActive()) return;
    if (!Array.isArray(cellIds) || !cellIds.length) return;

    cellIds.slice(0, EG_REVEAL_PROJECTILE_MAX).forEach((id, i) => {
        const sourceEl = document.getElementById(id);
        if (!sourceEl) return;
        setTimeout(() => {
            if (!_egIsActive()) return;
            const damage = Math.max(1, Math.round(
                _egCalcPlayerDamage() * _egGetRevealProjectileDamagePct() / 100));
            const targetIdAtFire = _egTargetId; // snapshot — do not use _egTargetId in the callback
            _egAnimatePlayerProjectile(damage, targetIdAtFire, undefined, undefined, sourceEl);
        }, i * EG_REVEAL_PROJECTILE_STAGGER_MS);
    });
}
