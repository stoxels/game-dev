// universal-spell-fx.js
//------------------------------------------------------------------------
//-------------------UNIVERSAL SPELL VISUAL EFFECTS-----------------------
//------------------------------------------------------------------------
// Code-drawn combat visuals for the universal spell arsenal (no emoji):
// every projectile is built from nested divs pointing RIGHT (+x) inside a
// 44x28 px box - the shared _egFireProjectile() flight code rotates the
// whole box onto the flight vector, exactly like the class projectiles
// (see js/endgame/endgame-class-projectiles.js).
//
// Entry points used by universal-spells.js:
//   _uspFireThemedProjectile(spell, monsterId, hit, opts)
//   _uspTelegraph(spell, monsterId, delayMs)
// Impact / nova / DoT overlays are appended to the monster card
// (position:relative, both card variants) and auto-removed.
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//---------------------------PROJECTILE SHAPES----------------------------
//------------------------------------------------------------------------

const USP_THEME_PROJ = {
    fire: {
        cssClass: 'usp-proj-fire', duration: 750, easing: 'ease-in', rotOffset: 0,
        build(root) {
            root.innerHTML =
                '<div class="egp usp-p-fire">' +
                    '<div class="usp-p-fire-tail"></div>' +
                    '<div class="usp-p-fire-core"></div>' +
                    '<div class="usp-p-fire-spark usp-p-fire-spark-1"></div>' +
                    '<div class="usp-p-fire-spark usp-p-fire-spark-2"></div>' +
                '</div>';
        },
    },
    frost: {
        cssClass: 'usp-proj-frost', duration: 700, easing: 'ease-out', rotOffset: 0,
        build(root) {
            root.innerHTML =
                '<div class="egp usp-p-frost">' +
                    '<div class="usp-p-frost-trail"></div>' +
                    '<div class="usp-p-frost-shard"></div>' +
                    '<div class="usp-p-frost-glint"></div>' +
                '</div>';
        },
    },
    arcane: {
        cssClass: 'usp-proj-arcane', duration: 650, easing: 'linear', rotOffset: 0, spin: 900,
        build(root) {
            root.innerHTML =
                '<div class="egp usp-p-arc">' +
                    '<div class="usp-p-arc-trail"></div>' +
                    '<div class="usp-p-arc-ring egp-spin"></div>' +
                    '<div class="usp-p-arc-orb"></div>' +
                '</div>';
        },
    },
    shadow: {
        cssClass: 'usp-proj-shadow', duration: 800, easing: 'ease-in', rotOffset: 0,
        build(root) {
            root.innerHTML =
                '<div class="egp usp-p-sh">' +
                    '<div class="usp-p-sh-trail"></div>' +
                    '<div class="usp-p-sh-tendril usp-p-sh-tendril-1"></div>' +
                    '<div class="usp-p-sh-tendril usp-p-sh-tendril-2"></div>' +
                    '<div class="usp-p-sh-orb"></div>' +
                '</div>';
        },
    },
    holy: {
        cssClass: 'usp-proj-holy', duration: 650, easing: 'ease-out', rotOffset: 0,
        build(root) {
            root.innerHTML =
                '<div class="egp usp-p-holy">' +
                    '<div class="usp-p-holy-trail"></div>' +
                    '<div class="usp-p-holy-halo"></div>' +
                    '<div class="usp-p-holy-bolt"></div>' +
                '</div>';
        },
    },
    nature: {
        cssClass: 'usp-proj-nature', duration: 750, easing: 'linear', rotOffset: 0, spin: 1200,
        build(root) {
            root.innerHTML =
                '<div class="egp usp-p-nat">' +
                    '<div class="usp-p-nat-trail"></div>' +
                    '<div class="usp-p-nat-wisp"></div>' +
                    '<div class="usp-p-nat-leaf usp-p-nat-leaf-1 egp-spin"></div>' +
                    '<div class="usp-p-nat-leaf usp-p-nat-leaf-2 egp-spin"></div>' +
                '</div>';
        },
    },
    lightning: {
        cssClass: 'usp-proj-lightning', duration: 450, easing: 'linear', rotOffset: 0,
        build(root) {
            root.innerHTML =
                '<div class="egp usp-p-lt">' +
                    '<div class="usp-p-lt-glow"></div>' +
                    '<div class="usp-p-lt-bolt"></div>' +
                '</div>';
        },
    },
    // 🪓 Blade - hurled reaver: tumbling crimson-edged throwing blade.
    // Inner spin only; the outer body stays aimed at the target.
    blade: {
        cssClass: 'usp-proj-blade', duration: 700, easing: 'ease-out', rotOffset: 0, spin: 800,
        build(root) {
            root.innerHTML =
                '<div class="egp usp-p-blade">' +
                    '<div class="usp-p-blade-trail"></div>' +
                    '<div class="usp-p-blade-tumble egp-spin">' +
                        '<div class="usp-p-blade-edge"></div>' +
                        '<div class="usp-p-blade-spine"></div>' +
                    '</div>' +
                '</div>';
        },
    },
    // 🏹 Arrow - ranger shaft: wooden shaft, steel head, green fletching.
    // Leaner and earthier than the probabilist golden dart.
    arrow: {
        cssClass: 'usp-proj-arrow', duration: 600, easing: 'ease-out', rotOffset: 0,
        build(root) {
            root.innerHTML =
                '<div class="egp usp-p-arr">' +
                    '<div class="usp-p-arr-fletch usp-p-arr-fletch-top"></div>' +
                    '<div class="usp-p-arr-fletch usp-p-arr-fletch-bot"></div>' +
                    '<div class="usp-p-arr-shaft"></div>' +
                    '<div class="usp-p-arr-wrap"></div>' +
                    '<div class="usp-p-arr-head"></div>' +
                '</div>';
        },
    },
};

function _uspProjDefFor(spell) {
    const theme = (spell && spell.theme) || 'arcane';
    return USP_THEME_PROJ[theme] || USP_THEME_PROJ.arcane;
}


//------------------------------------------------------------------------
//---------------------------OVERLAY HELPERS------------------------------
//------------------------------------------------------------------------

// Appends a themed overlay div to a monster card; auto-removes after ms.
function _uspCardOverlay(monsterId, className, ms) {
    try {
        const card = document.getElementById(`eg-card-${monsterId}`);
        if (!card) return null;
        const el = document.createElement('div');
        el.className = className;
        card.appendChild(el);
        setTimeout(() => el.remove(), ms || 700);
        return el;
    } catch (e) { return null; }
}

// Impact flash + expanding ring in the spell's theme. Big hits (Meteor,
// Chaos Bolt, crits) get the .is-big treatment.
function _uspImpact(spell, monsterId, opts) {
    const theme = (spell && spell.theme) || 'arcane';
    const big = (opts && (opts.isBig || opts.isCrit)) ? ' is-big' : '';
    _uspCardOverlay(monsterId, `usp-impact usp-impact-${theme}${big}`, opts && opts.isBig ? 900 : 650);
    if (opts && opts.isAoE) {
        _uspCardOverlay(monsterId, `usp-nova usp-nova-${theme}`, 800);
    }
}

// Lingering burn / corruption / consecration sizzle on DoT ticks.
function _uspDotTick(spell, monsterId) {
    const theme = (spell && spell.theme) || 'arcane';
    _uspCardOverlay(monsterId, `usp-dot usp-dot-${theme}`, 850);
}

// Meteor / delayed-spell warning marker on the target card.
function _uspTelegraph(spell, monsterId, delayMs) {
    const theme = (spell && spell.theme) || 'fire';
    _uspCardOverlay(monsterId, `usp-telegraph usp-telegraph-${theme}`, Math.max(300, (delayMs || 900) + 250));
}


//------------------------------------------------------------------------
//---------------------------PROJECTILE FLIGHT----------------------------
//------------------------------------------------------------------------

// Source anchor: chain jumps fly card→card; sky strikes fall from above the
// card; everything else launches from the player avatar (the caster).
function _uspResolveStart(spell, targetCard, opts) {
    const centre = (typeof _egGetElementCentre === 'function') ? _egGetElementCentre : null;
    if (opts && opts.fromMonsterId && centre) {
        const from = document.getElementById(`eg-card-${opts.fromMonsterId}`);
        if (from) return centre(from);
    }
    if (opts && opts.fromSky && targetCard && centre) {
        const c = centre(targetCard);
        return { x: c.x + (Math.random() * 60 - 30), y: c.y - 340 };
    }
    if (centre) {
        const avatar = document.getElementById('player-avatar-wrapper')
            || document.getElementById('class-hud-drag-handle');
        if (avatar) return centre(avatar);
    }
    return null;
}

//------------------------------------------------------------------------
//-------------------------SELF-CAST SUPPORT FX---------------------------
//------------------------------------------------------------------------
// Support spells (heal / shield / buffs) have no target card, so their
// feedback is anchored on the PLAYER instead: a themed ring pulse around the
// avatar plus an optional floating value (`+38`, `-18%`, `×2`). Every element
// is position:fixed and self-removing, so nothing depends on the avatar
// wrapper being positioned.
//------------------------------------------------------------------------

// Resolves the avatar centre in viewport coordinates, or null when the avatar
// is not on screen (then the callers just skip the cosmetic layer).
function _uspSupportAnchor() {
    if (typeof _egGetElementCentre !== 'function') return null;
    const avatar = document.getElementById('player-avatar-wrapper')
        || document.getElementById('class-hud-drag-handle')
        || document.getElementById('ptable');
    if (!avatar) return null;
    try { return _egGetElementCentre(avatar); } catch (e) { return null; }
}

// Ring pulse + floating label over the player. `flavor` is one of
// 'heal' | 'shield' | 'buff' | 'wasted' and only tints the label.
function _uspSupportCastFX(spell, text, flavor) {
    const anchor = _uspSupportAnchor();
    if (!anchor) return;
    const theme = (spell && spell.theme) || 'holy';

    const ring = document.createElement('div');
    ring.className = `usp-support-ring usp-support-ring-${theme}`;
    ring.style.left = `${anchor.x}px`;
    ring.style.top = `${anchor.y}px`;
    document.body.appendChild(ring);
    setTimeout(() => ring.remove(), 900);

    if (!text) return;
    const color = {
        heal: '#7fe0b0', shield: '#7fd9ff', buff: '#ffd27f', wasted: '#ff8a65',
    }[flavor] || '#ffffff';
    // The outer wrapper owns the centring transform and the inner span owns
    // the float animation, so the two never fight over `transform`.
    const label = document.createElement('div');
    label.className = 'usp-support-label';
    const labelText = document.createElement('span');
    labelText.className = 'usp-support-label-text';
    labelText.textContent = text;
    label.appendChild(labelText);
    label.style.left = `${anchor.x}px`;
    label.style.top = `${anchor.y - 26}px`;
    label.style.color = color;
    document.body.appendChild(label);
    setTimeout(() => label.remove(), 1100);
}

// Light ring-only pulse - used by heal-over-time ticks and other repeats so
// the periodic effect is visible without spamming a number every second.
function _uspSupportPulseFX(spell) {
    _uspSupportCastFX(spell, '', 'heal');
}


//------------------------------------------------------------------------
//-------------------------MOVEMENT SPELL FX------------------------------
//------------------------------------------------------------------------
// The movement family has no target card and no fixed cast point: its
// feedback is the STREAK between where the sprite was and where it landed,
// plus - for the Rift Anchor - a marker pinned to the armed spot so the
// player can always see where "back" is.
//------------------------------------------------------------------------

// Where the visible sprite sits inside its wrapper, as an offset from the
// wrapper's top-left. The wrapper carries the HP/charge bars above the art and
// is wider than the sprite, so drawing FX at the raw position would smear the
// streak off the character. Measured live so it also holds on the simple
// (level-select style) avatar, which has neither.
function _uspMoveSpriteOffset() {
    const wrap = document.getElementById('player-avatar-wrapper')
        || document.getElementById('player-avatar-simple');
    const img = document.getElementById('avatar-sprite-img')
        || document.getElementById('avatar-sprite-img-simple');
    if (!wrap || !img) return { x: 36, y: 45 };
    try {
        const wr = wrap.getBoundingClientRect();
        const ir = img.getBoundingClientRect();
        if (!wr.width || !ir.width) return { x: wrap.offsetWidth / 2 || 36, y: wrap.offsetHeight / 2 || 45 };
        return {
            x: (ir.left - wr.left) + ir.width / 2,
            y: (ir.top - wr.top) + ir.height / 2,
        };
    } catch (e) {
        return { x: 36, y: 45 };
    }
}

// Streak from the cast origin to the landing point, in wrapper coordinates.
// `soft` is the travelling version (Dash / Disengage): thinner and dimmer, so
// a Blink still reads as the bigger event at a glance.
function _uspBlinkFX(spell, fromX, fromY, toX, toY, soft) {
    const off = _uspMoveSpriteOffset();
    const x1 = fromX + off.x;
    const y1 = fromY + off.y;
    const x2 = toX + off.x;
    const y2 = toY + off.y;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (!(len > 8)) return;

    const theme = (spell && spell.theme) || 'arcane';
    const streak = document.createElement('div');
    streak.className = `usp-move-streak usp-move-streak-${theme}${soft ? ' is-soft' : ''}`;
    streak.style.left = `${x1}px`;
    streak.style.top = `${y1}px`;
    streak.style.width = `${len}px`;
    streak.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
    document.body.appendChild(streak);
    setTimeout(() => { try { streak.remove(); } catch (e) {} }, 700);
}

// The armed Rift Anchor's world marker. One at a time (a second anchor
// replaces the first, matching the spell), removed on recall, on expiry and
// when the encounter ends.
let _uspAnchorMarkerEl = null;

// Where the sprite's FEET are, as an offset from the wrapper's top-left. The
// anchor is a ground point, and the marker must stay visible - centred on the
// sprite it would sit behind the character art, so it is pinned at the feet,
// just below the body, where the ground contact actually is.
function _uspMoveSpriteFootOffset() {
    const wrap = document.getElementById('player-avatar-wrapper')
        || document.getElementById('player-avatar-simple');
    const img = document.getElementById('avatar-sprite-img')
        || document.getElementById('avatar-sprite-img-simple');
    if (!wrap || !img) return { x: 36, y: 80 };
    try {
        const wr = wrap.getBoundingClientRect();
        const ir = img.getBoundingClientRect();
        if (!wr.width || !ir.width) {
            return { x: wrap.offsetWidth / 2 || 36, y: wrap.offsetHeight || 80 };
        }
        return {
            x: (ir.left - wr.left) + ir.width / 2,
            y: (ir.top - wr.top) + ir.height,
        };
    } catch (e) {
        return { x: 36, y: 80 };
    }
}

function _uspAnchorMarkerShow(spell, x, y, secs) {
    _uspAnchorMarkerClear();
    const off = _uspMoveSpriteFootOffset();
    const el = document.createElement('div');
    el.className = `usp-anchor-marker usp-anchor-marker-${(spell && spell.theme) || 'arcane'}`;
    el.textContent = (spell && spell.icon) || '📍';
    el.style.left = `${x + off.x}px`;
    el.style.top = `${y + off.y}px`;
    document.body.appendChild(el);
    _uspAnchorMarkerEl = el;
}

function _uspAnchorMarkerClear() {
    if (_uspAnchorMarkerEl) {
        try { _uspAnchorMarkerEl.remove(); } catch (e) { /* already gone */ }
    }
    _uspAnchorMarkerEl = null;
}


// Fires one themed projectile; damage lands via _egDamageTargetById so
// resistances, ailments, echo and kill detection all apply. DoT ticks skip
// the flight and sizzle directly on the card.
function _uspFireThemedProjectile(spell, monsterId, hit, opts) {
    opts = opts || {};
    const damageFn = (typeof _egDamageTargetById === 'function') ? _egDamageTargetById : null;
    if (!damageFn) return;

    // DoT ticks: no travel time, just the themed sizzle + damage.
    if (opts.isTick) {
        _uspDotTick(spell, monsterId);
        damageFn(monsterId, hit.amount, hit.elements, { isCrit: !!hit.isCrit });
        return;
    }

    const targetCard = document.getElementById(`eg-card-${monsterId}`);
    const start = _uspResolveStart(spell, targetCard, opts);
    const projDef = _uspProjDefFor(spell);

    const impact = () => {
        damageFn(monsterId, hit.amount, hit.elements, { isCrit: !!hit.isCrit });
        _uspImpact(spell, monsterId, opts);
    };

    // No visual path (card hidden / missing anchor) - apply instantly.
    if (!start || !targetCard || typeof _egFireProjectile !== 'function') {
        impact();
        return;
    }

    const centre = _egGetElementCentre(targetCard);
    const scale = opts.isBig ? 1.8 : (opts.volleyIndex ? 1.1 : 1.4);
    try {
        _egFireProjectile(
            projDef, projDef.cssClass,
            start, centre,
            opts.fromSky ? 550 : projDef.duration,
            opts.fromSky ? 'ease-in' : projDef.easing,
            impact, null, scale
        );
    } catch (e) {
        impact();
    }
}
