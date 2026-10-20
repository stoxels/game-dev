import { STATE } from '../state.js';

//------------------------------------------------------------------------
//-------------------CLASS PROJECTILE VISUAL DATA-------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Class projectile visuals - drawn entirely in code (nested DOM + CSS, see
// css/endgame/projectiles.css). No emojis: every shape is built pointing
// RIGHT (+x) inside a 44x28 px box so it can always be rotated exactly along
// the flight vector toward the targeted creature.
export const CLASS_PROJECTILES = {
    probabilist: {
        cssClass: 'sx-proj-arrow', duration: 900, easing: 'linear', rotOffset: 0,
        build(root) {
            root.innerHTML = '<div class="egp sx-projfx-arrow"><div class="sx-projfx-arrow-fletch sx-projfx-arrow-fletch-top"></div><div class="sx-projfx-arrow-fletch sx-projfx-arrow-fletch-bot"></div><div class="sx-projfx-arrow-shaft"></div><div class="sx-projfx-arrow-head"></div></div>';
        },
    },
    mathmagician: {
        cssClass: 'sx-proj-fireball', duration: 1000, easing: 'ease-in', rotOffset: 0,
        build(root) {
            root.innerHTML = '<div class="egp sx-projfx-firebolt"><div class="sx-projfx-firebolt-tail"></div><div class="sx-projfx-firebolt-core"></div><div class="sx-projfx-firebolt-spark sx-projfx-firebolt-spark-1"></div><div class="sx-projfx-firebolt-spark sx-projfx-firebolt-spark-2"></div></div>';
        },
    },
    statistician: {
        cssClass: 'sx-proj-sword', duration: 800, easing: 'ease-out', rotOffset: 0,
        build(root) {
            root.innerHTML = '<div class="egp sx-projfx-sword"><div class="sx-projfx-sword-pommel"></div><div class="sx-projfx-sword-hilt"></div><div class="sx-projfx-sword-guard"></div><div class="sx-projfx-sword-blade"></div></div>';
        },
    },
    outlier: {
        cssClass: 'sx-proj-dizzy', duration: 1000, easing: 'linear', rotOffset: 0, spin: 700,
        build(root) {
            root.innerHTML = '<div class="egp sx-projfx-star"><div class="sx-projfx-star-streak"></div><div class="sx-projfx-star-core sx-projfx-spin"></div></div>';
        },
    },
    actuary: {
        cssClass: 'sx-proj-scroll', duration: 1000, easing: 'ease-out', rotOffset: 0,
        build(root) {
            root.innerHTML = '<div class="egp sx-projfx-dart"><div class="sx-projfx-dart-wing sx-projfx-dart-wing-under"></div><div class="sx-projfx-dart-wing sx-projfx-dart-wing-over"></div><div class="sx-projfx-dart-seal"></div><div class="sx-projfx-dart-trail"></div></div>';
        },
    },
    recursionist: {
        cssClass: 'sx-proj-infinity', duration: 1000, easing: 'linear', rotOffset: 0,
        build(root) {
            root.innerHTML = '<div class="egp sx-projfx-shard"><div class="sx-projfx-shard-echo sx-projfx-shard-echo-2"></div><div class="sx-projfx-shard-echo sx-projfx-shard-echo-1"></div><div class="sx-projfx-shard-body"></div></div>';
        },
    },
    markovian: {
        cssClass: 'sx-proj-chain', duration: 1100, easing: 'ease-in', rotOffset: 0,
        build(root) {
            root.innerHTML = '<div class="egp sx-projfx-chain"><div class="sx-projfx-chain-link sx-projfx-chain-link-3"></div><div class="sx-projfx-chain-link sx-projfx-chain-link-2"></div><div class="sx-projfx-chain-link sx-projfx-chain-link-1"></div><div class="sx-projfx-chain-ball"></div></div>';
        },
    },
    bayesian: {
        cssClass: 'sx-proj-brain', duration: 1000, easing: 'ease-in', rotOffset: 0,
        build(root) {
            root.innerHTML = '<div class="egp sx-projfx-vial"><div class="sx-projfx-vial-drop sx-projfx-vial-drop-2"></div><div class="sx-projfx-vial-drop sx-projfx-vial-drop-1"></div><div class="sx-projfx-vial-glass"><div class="sx-projfx-vial-fluid"></div><div class="sx-projfx-vial-shine"></div></div></div>';
        },
    },
    random_walker: {
        cssClass: 'sx-proj-dice', duration: 1000, easing: 'linear', rotOffset: 0, spin: 850,
        build(root) {
            root.innerHTML = '<div class="egp sx-projfx-die"><div class="sx-projfx-die-streak"></div><div class="sx-projfx-die-body sx-projfx-spin"><div class="sx-projfx-pip sx-projfx-pip-tl"></div><div class="sx-projfx-pip sx-projfx-pip-tr"></div><div class="sx-projfx-pip sx-projfx-pip-c"></div><div class="sx-projfx-pip sx-projfx-pip-bl"></div><div class="sx-projfx-pip sx-projfx-pip-br"></div></div></div>';
        },
    },
    _default: {
        cssClass: 'sx-proj-default', duration: 1000, easing: 'ease-in', rotOffset: 0,
        build(root) { root.innerHTML = '<div class="egp sx-projfx-bolt"><div class="sx-projfx-bolt-body"></div></div>'; },
    },
};

//------------------------------------------------------------------------
//-------------------PROJECTILE HELPERS-----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

export function _getProjectileDef() {
    const cls = (typeof STATE !== 'undefined' && STATE.playerClass)
        ? STATE.playerClass.toLowerCase()
        : '_default';
    return CLASS_PROJECTILES[cls] || CLASS_PROJECTILES._default;
}

export function _getElementCentre(el) {
    const rect = el.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

// Centre of a monster card ignoring an in-progress melee lunge. The lunge is
// quicker than a projectile's flight, so aiming at the mid-dash position makes
// shots land in empty space between the monster and the player.
export function _getElementRestCentre(el) {
    const c = _getElementCentre(el);
    if (el.dataset && el.dataset.egLunging) {
        const m = new DOMMatrix(getComputedStyle(el).transform);
        c.x -= m.m41;
        c.y -= m.m42;
    }
    return c;
}

export function _fireProjectile(visual, cssClass, start, end, duration, easing, onArrive, orient, startScale) {
    const proj = document.createElement('div');
    proj.className = `sx-projectile ${cssClass}`;
    proj.style.left = '0px';
    proj.style.top = '0px';

    let rotate = !(orient && orient.rotate === false);
    let rotOffset = (orient && orient.rotOffset) || 0;

    if (typeof visual === 'string') {
        proj.textContent = visual;
    } else if (visual && typeof visual.build === 'function') {
        proj.classList.add('sx-built');
        visual.build(proj);
        rotate = visual.rotate !== false;
        rotOffset = visual.rotOffset || 0;
        if (visual.spin) proj.style.setProperty('--sx-projfx-spin-ms', `${visual.spin}ms`);
    }

    document.body.appendChild(proj);

    let rot = '';
    if (rotate) {
        const flightAngle = Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI;
        rot = `rotate(${flightAngle + rotOffset}deg) `;
    }

    const emojiScaleStart = startScale || 1.5;
    const anim = proj.animate([
        { transform: `translate(${start.x}px, ${start.y}px) ${rot}scale(${emojiScaleStart})` },
        { transform: `translate(${end.x}px,   ${end.y}px)   ${rot}scale(0.5)` },
    ], { duration, easing });

    anim.onfinish = () => { proj.remove(); onArrive(); };
}

// Reveal-triggered behavior is exposed by combat-class-projectiles-reveal.js.
