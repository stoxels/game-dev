import { STATE } from '../state.js';

//------------------------------------------------------------------------
//-------------------CLASS PROJECTILE VISUAL DATA-------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Class projectile visuals - drawn entirely in code (nested DOM + CSS, see
// css/endgame/projectiles.css). No emojis: every shape is built pointing
// RIGHT (+x) inside a 44x28 px box so it can always be rotated exactly along
// the flight vector toward the targeted creature.
export const EG_CLASS_PROJECTILES = {
    probabilist: {
        cssClass: 'eg-proj-arrow', duration: 900, easing: 'linear', rotOffset: 0,
        build(root) {
            root.innerHTML = '<div class="egp egp-arrow"><div class="egp-arrow-fletch egp-arrow-fletch-top"></div><div class="egp-arrow-fletch egp-arrow-fletch-bot"></div><div class="egp-arrow-shaft"></div><div class="egp-arrow-head"></div></div>';
        },
    },
    mathmagician: {
        cssClass: 'eg-proj-fireball', duration: 1000, easing: 'ease-in', rotOffset: 0,
        build(root) {
            root.innerHTML = '<div class="egp egp-firebolt"><div class="egp-firebolt-tail"></div><div class="egp-firebolt-core"></div><div class="egp-firebolt-spark egp-firebolt-spark-1"></div><div class="egp-firebolt-spark egp-firebolt-spark-2"></div></div>';
        },
    },
    statistician: {
        cssClass: 'eg-proj-sword', duration: 800, easing: 'ease-out', rotOffset: 0,
        build(root) {
            root.innerHTML = '<div class="egp egp-sword"><div class="egp-sword-pommel"></div><div class="egp-sword-hilt"></div><div class="egp-sword-guard"></div><div class="egp-sword-blade"></div></div>';
        },
    },
    outlier: {
        cssClass: 'eg-proj-dizzy', duration: 1000, easing: 'linear', rotOffset: 0, spin: 700,
        build(root) {
            root.innerHTML = '<div class="egp egp-star"><div class="egp-star-streak"></div><div class="egp-star-core egp-spin"></div></div>';
        },
    },
    actuary: {
        cssClass: 'eg-proj-scroll', duration: 1000, easing: 'ease-out', rotOffset: 0,
        build(root) {
            root.innerHTML = '<div class="egp egp-dart"><div class="egp-dart-wing egp-dart-wing-under"></div><div class="egp-dart-wing egp-dart-wing-over"></div><div class="egp-dart-seal"></div><div class="egp-dart-trail"></div></div>';
        },
    },
    recursionist: {
        cssClass: 'eg-proj-infinity', duration: 1000, easing: 'linear', rotOffset: 0,
        build(root) {
            root.innerHTML = '<div class="egp egp-shard"><div class="egp-shard-echo egp-shard-echo-2"></div><div class="egp-shard-echo egp-shard-echo-1"></div><div class="egp-shard-body"></div></div>';
        },
    },
    markovian: {
        cssClass: 'eg-proj-chain', duration: 1100, easing: 'ease-in', rotOffset: 0,
        build(root) {
            root.innerHTML = '<div class="egp egp-chain"><div class="egp-chain-link egp-chain-link-3"></div><div class="egp-chain-link egp-chain-link-2"></div><div class="egp-chain-link egp-chain-link-1"></div><div class="egp-chain-ball"></div></div>';
        },
    },
    bayesian: {
        cssClass: 'eg-proj-brain', duration: 1000, easing: 'ease-in', rotOffset: 0,
        build(root) {
            root.innerHTML = '<div class="egp egp-vial"><div class="egp-vial-drop egp-vial-drop-2"></div><div class="egp-vial-drop egp-vial-drop-1"></div><div class="egp-vial-glass"><div class="egp-vial-fluid"></div><div class="egp-vial-shine"></div></div></div>';
        },
    },
    random_walker: {
        cssClass: 'eg-proj-dice', duration: 1000, easing: 'linear', rotOffset: 0, spin: 850,
        build(root) {
            root.innerHTML = '<div class="egp egp-die"><div class="egp-die-streak"></div><div class="egp-die-body egp-spin"><div class="egp-pip egp-pip-tl"></div><div class="egp-pip egp-pip-tr"></div><div class="egp-pip egp-pip-c"></div><div class="egp-pip egp-pip-bl"></div><div class="egp-pip egp-pip-br"></div></div></div>';
        },
    },
    _default: {
        cssClass: 'eg-proj-default', duration: 400, easing: 'ease-in', rotOffset: 0,
        build(root) { root.innerHTML = '<div class="egp egp-bolt"><div class="egp-bolt-body"></div></div>'; },
    },
};

//------------------------------------------------------------------------
//-------------------PROJECTILE HELPERS-----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

export function _egGetProjectileDef() {
    const cls = (typeof STATE !== 'undefined' && STATE.playerClass)
        ? STATE.playerClass.toLowerCase()
        : '_default';
    return EG_CLASS_PROJECTILES[cls] || EG_CLASS_PROJECTILES._default;
}

export function _egGetElementCentre(el) {
    const rect = el.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

export function _egFireProjectile(visual, cssClass, start, end, duration, easing, onArrive, orient, startScale) {
    const proj = document.createElement('div');
    proj.className = `eg-projectile ${cssClass}`;
    proj.style.left = '0px';
    proj.style.top = '0px';

    let rotate = !(orient && orient.rotate === false);
    let rotOffset = (orient && orient.rotOffset) || 0;

    if (typeof visual === 'string') {
        proj.textContent = visual;
    } else if (visual && typeof visual.build === 'function') {
        proj.classList.add('eg-built');
        visual.build(proj);
        rotate = visual.rotate !== false;
        rotOffset = visual.rotOffset || 0;
        if (visual.spin) proj.style.setProperty('--egp-spin-ms', `${visual.spin}ms`);
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
