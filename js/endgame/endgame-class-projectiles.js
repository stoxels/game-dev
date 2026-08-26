//------------------------------------------------------------------------
//-------------------CONSTANTS & DATA DEFINITIONS-------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------



// Class projectile visuals — drawn entirely in code (nested DOM + CSS, see
// css/endgame/projectiles.css). No emojis: every shape is built pointing
// RIGHT (+x) inside a 44x28 px box so it can always be rotated exactly along
// the flight vector toward the targeted creature.
//
// Each def:
//   cssClass  — root element class (carries the glow filter / colour theme)
//   duration  — flight time in ms
//   easing    — Web Animations easing for the flight
//   rotOffset — extra degrees on top of the flight angle (shapes are drawn
//               tip-right, so this is normally 0)
//   spin      — optional ms for a continuous inner tumble while flying
//               (outer transform stays aimed at the target)
//   build(el) — populates the projectile root with the shape's DOM
const EG_CLASS_PROJECTILES = {
    // 🎯 Probabilist — golden hunting dart: needle shaft, steel tip, fletching
    probabilist: {
        cssClass: 'eg-proj-arrow', duration: 900, easing: 'linear', rotOffset: 0,
        build(root) {
            root.innerHTML =
                '<div class="egp egp-arrow">' +
                    '<div class="egp-arrow-fletch egp-arrow-fletch-top"></div>' +
                    '<div class="egp-arrow-fletch egp-arrow-fletch-bot"></div>' +
                    '<div class="egp-arrow-shaft"></div>' +
                    '<div class="egp-arrow-head"></div>' +
                '</div>';
        },
    },

    // 🔮 Mathmagician — arcane firebolt: white-hot core with a comet tail
    mathmagician: {
        cssClass: 'eg-proj-fireball', duration: 1000, easing: 'ease-in', rotOffset: 0,
        build(root) {
            root.innerHTML =
                '<div class="egp egp-firebolt">' +
                    '<div class="egp-firebolt-tail"></div>' +
                    '<div class="egp-firebolt-core"></div>' +
                    '<div class="egp-firebolt-spark egp-firebolt-spark-1"></div>' +
                    '<div class="egp-firebolt-spark egp-firebolt-spark-2"></div>' +
                '</div>';
        },
    },

    // ⚔️ Statistician — thrown blade: full sword silhouette, tip forward
    statistician: {
        cssClass: 'eg-proj-sword', duration: 800, easing: 'ease-out', rotOffset: 0,
        build(root) {
            root.innerHTML =
                '<div class="egp egp-sword">' +
                    '<div class="egp-sword-pommel"></div>' +
                    '<div class="egp-sword-hilt"></div>' +
                    '<div class="egp-sword-guard"></div>' +
                    '<div class="egp-sword-blade"></div>' +
                '</div>';
        },
    },

    // 📈 Outlier — rogue shooting star: spinning star with a violet streak.
    // The outer body stays aimed at the target; only the star tumbles.
    outlier: {
        cssClass: 'eg-proj-dizzy', duration: 1000, easing: 'linear', rotOffset: 0, spin: 700,
        build(root) {
            root.innerHTML =
                '<div class="egp egp-star">' +
                    '<div class="egp-star-streak"></div>' +
                    '<div class="egp-star-core egp-spin"></div>' +
                '</div>';
        },
    },

    // 🛡️ Actuary — served contract: a paper dart (the claim, filed at the enemy)
    actuary: {
        cssClass: 'eg-proj-scroll', duration: 1000, easing: 'ease-out', rotOffset: 0,
        build(root) {
            root.innerHTML =
                '<div class="egp egp-dart">' +
                    '<div class="egp-dart-wing egp-dart-wing-under"></div>' +
                    '<div class="egp-dart-wing egp-dart-wing-over"></div>' +
                    '<div class="egp-dart-seal"></div>' +
                    '<div class="egp-dart-trail"></div>' +
                '</div>';
        },
    },

    // 💀 Recursionist — fractal shard: a kite-shaped soul shard with smaller
    // self-similar echoes trailing behind it (recursion made visible)
    recursionist: {
        cssClass: 'eg-proj-infinity', duration: 1000, easing: 'linear', rotOffset: 0,
        build(root) {
            root.innerHTML =
                '<div class="egp egp-shard">' +
                    '<div class="egp-shard-echo egp-shard-echo-2"></div>' +
                    '<div class="egp-shard-echo egp-shard-echo-1"></div>' +
                    '<div class="egp-shard-body"></div>' +
                '</div>';
        },
    },

    // ⏳ Markovian — chain shot: heavy iron ball towing a short link chain
    markovian: {
        cssClass: 'eg-proj-chain', duration: 1100, easing: 'ease-in', rotOffset: 0,
        build(root) {
            root.innerHTML =
                '<div class="egp egp-chain">' +
                    '<div class="egp-chain-link egp-chain-link-3"></div>' +
                    '<div class="egp-chain-link egp-chain-link-2"></div>' +
                    '<div class="egp-chain-link egp-chain-link-1"></div>' +
                    '<div class="egp-chain-ball"></div>' +
                '</div>';
        },
    },

    // 🧪 Bayesian — alchemical vial: glass capsule dart, reactive green charge
    bayesian: {
        cssClass: 'eg-proj-brain', duration: 1000, easing: 'ease-in', rotOffset: 0,
        build(root) {
            root.innerHTML =
                '<div class="egp egp-vial">' +
                    '<div class="egp-vial-drop egp-vial-drop-2"></div>' +
                    '<div class="egp-vial-drop egp-vial-drop-1"></div>' +
                    '<div class="egp-vial-glass">' +
                        '<div class="egp-vial-fluid"></div>' +
                        '<div class="egp-vial-shine"></div>' +
                    '</div>' +
                '</div>';
        },
    },

    // 🐻 Random Walker — tumbling die: pipped cube that rolls as it flies;
    // the tumble is an inner animation so the flight vector stays true
    random_walker: {
        cssClass: 'eg-proj-dice', duration: 1000, easing: 'linear', rotOffset: 0, spin: 850,
        build(root) {
            root.innerHTML =
                '<div class="egp egp-die">' +
                    '<div class="egp-die-streak"></div>' +
                    '<div class="egp-die-body egp-spin">' +
                        '<div class="egp-pip egp-pip-tl"></div>' +
                        '<div class="egp-pip egp-pip-tr"></div>' +
                        '<div class="egp-pip egp-pip-c"></div>' +
                        '<div class="egp-pip egp-pip-bl"></div>' +
                        '<div class="egp-pip egp-pip-br"></div>' +
                    '</div>' +
                '</div>';
        },
    },

    _default: {
        cssClass: 'eg-proj-default', duration: 400, easing: 'ease-in', rotOffset: 0,
        build(root) {
            root.innerHTML =
                '<div class="egp egp-bolt">' +
                    '<div class="egp-bolt-body"></div>' +
                '</div>';
        },
    },
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

// Creates, animates, and auto-removes a projectile div travelling start → end.
// onArrive() is called when the animation completes (i.e. on impact).
//
// `visual` is either:
//   - a string (emoji) → legacy path used by monster attacks & polymorph
//   - a projectile def object with build() → code-drawn player projectile
//
// Orientation: EVERY projectile is rotated onto the flight vector
// atan2(dy, dx) so it always points at its target. Emoji callers may pass
// orient = { rotate:false } to opt out; code-built shapes are drawn
// tip-right and therefore aim correctly at rotOffset = 0.
//
// Optional startScale overrides the launch size (used by charged shots that
// grow while stacking). It is applied as a uniform scale in the flight
// keyframes, so it works identically for emoji and code-built visuals.
function _egFireProjectile(visual, cssClass, start, end, duration, easing, onArrive, orient, startScale) {
    const proj = document.createElement('div');
    proj.className = `eg-projectile ${cssClass}`;
    proj.style.left = '0px';
    proj.style.top = '0px';

    let rotate = !(orient && orient.rotate === false);
    let rotOffset = (orient && orient.rotOffset) || 0;

    if (typeof visual === 'string') {
        // Legacy emoji visual (monster attacks, polymorph confusion)
        proj.textContent = visual;
    } else if (visual && typeof visual.build === 'function') {
        // Code-built visual: drawn pointing right (+x), so it aims along the
        // flight vector with no offset unless the def says otherwise.
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

// Entry point for programmatic reveals (items, passives, class abilities).
// Fired from _applyCellEffect(..., 'reveal') so every non-manual reveal path
// is covered. `source` distinguishes 'item' reveals from 'ability' reveals
// (default) so the matching map damage penalty can be applied. Each revealed
// cell launches one reduced-damage projectile at the current target; no-op
// while no endgame encounter is running.
function _egOnProgrammaticReveal(cellIds, source) {
    if (typeof _egIsActive !== 'function' || !_egIsActive()) return;
    if (!Array.isArray(cellIds) || !cellIds.length) return;

    // Active map run: "Reveals from Items/Abilities deal #% less Damage".
    const isItemSource = source === 'item';
    let revealModMult = 1;
    if (isItemSource && typeof _egMapItemRevealMult === 'function') {
        revealModMult = _egMapItemRevealMult();
    } else if (!isItemSource && typeof _egMapAbilityRevealMult === 'function') {
        revealModMult = _egMapAbilityRevealMult();
    }

    cellIds.slice(0, EG_REVEAL_PROJECTILE_MAX).forEach((id, i) => {
        const sourceEl = document.getElementById(id);
        if (!sourceEl) return;
        setTimeout(() => {
            if (!_egIsActive()) return;
            const revealPct = (_egGetRevealProjectileDamagePct() / 100) * revealModMult;
            const rolled = _egCalcPlayerDamage();
            const damage = Math.max(1, Math.round(rolled * revealPct));
            // Keep the per-element share so monster resistances still apply
            const elements = _egScaleElements(_egLastHitElements, revealPct);
            const targetIdAtFire = _egTargetId; // snapshot — do not use _egTargetId in the callback
            _egAnimatePlayerProjectile(damage, targetIdAtFire, undefined, undefined, sourceEl, undefined, elements);
        }, i * EG_REVEAL_PROJECTILE_STAGGER_MS);
    });
}
