// spell-fx-kit.js
//------------------------------------------------------------------------
//---------------------------SPELL FX TOOLKIT-----------------------------
//------------------------------------------------------------------------
// Small building blocks the spell visuals are composed from: particles,
// rings, flashes, bespoke CSS pieces, screen shake and a projectile flight
// with a particle trail. Every element is cosmetic and removes itself.
// Styles: css/spell-fx-kit.css. Recipes: js/skills/spell-fx-recipes.js.
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//---------------------------CONSTANTS & STATE----------------------------
//------------------------------------------------------------------------

// Particle shapes known to the stylesheet (class `sfk-<shape>`).
const SFK_SHAPES = [
    'ember', 'spark', 'shard', 'smoke', 'mote', 'puff', 'leaf', 'feather', 'drop', 'rune',
    'petal', 'star', 'bolt', 'flake', 'rock', 'blade', 'bubble', 'ash', 'wisp', 'cross', 'note',
];

// Glyphs drawn by the `rune` shape (plain text, no emoji).
const SFK_RUNES = ['ᚠ', 'ᚱ', 'ᛉ', 'ᛟ', 'ᚦ', 'ᛞ', 'ᛗ', 'ᚹ', 'ᛇ', 'ᛒ', '✶', '⟁', '∑', '∫', 'π', 'Ω'];

// Upper bound of live kit elements, so a spell storm can never flood the DOM.
const SFK_MAX_LIVE = 900;
let _sfkLive = 0;


//------------------------------------------------------------------------
//---------------------------LOW-LEVEL HELPERS----------------------------
//------------------------------------------------------------------------

// A random number between a and b (a [min, max] pair, or one number).
function _sfkRange(r, fallback) {
    if (r == null) return fallback;
    if (typeof r === 'number') return r;
    return r[0] + Math.random() * (r[1] - r[0]);
}

// Picks one entry of a list (or returns a plain value as-is).
function _sfkPick(list) {
    if (!Array.isArray(list)) return list;
    return list[Math.floor(Math.random() * list.length)];
}

// Removes an element after ms and keeps the live-element count honest.
function _sfkExpire(el, ms) {
    _sfkLive++;
    setTimeout(() => {
        _sfkLive--;
        try { el.remove(); } catch (e) { /* already gone */ }
    }, Math.max(60, ms));
}

// Creates one span with the given classes and CSS custom properties.
function _sfkSpan(parent, cls, vars, text) {
    const el = document.createElement('span');
    el.className = cls;
    let css = '';
    for (const k in vars) css += `--${k}:${vars[k]};`;
    el.style.cssText = css;
    if (text) el.textContent = text;
    parent.appendChild(el);
    return el;
}

// Viewport centre of an element (null when it is hidden / detached).
function _sfkCentre(el) {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (!(r.width > 0) || !(r.height > 0)) return null;
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}


//------------------------------------------------------------------------
//-----------------------------LAYERS-------------------------------------
//------------------------------------------------------------------------

// A layer covering a monster card (rides along with the card). Null when
// the card is not on screen.
export function sfkCardLayer(monsterId, ms) {
    try {
        const card = document.getElementById(`sx-card-${monsterId}`);
        if (!card) return null;
        const layer = document.createElement('div');
        layer.className = 'sfk-layer sfk-layer-card';
        card.appendChild(layer);
        _sfkExpire(layer, ms || 1500);
        return layer;
    } catch (e) { return null; }
}

// A zero-size layer pinned at a viewport point; children centre on it.
export function sfkPointLayer(x, y, ms, extraClass) {
    try {
        const layer = document.createElement('div');
        layer.className = 'sfk-layer sfk-layer-point' + (extraClass ? ' ' + extraClass : '');
        layer.style.left = `${x}px`;
        layer.style.top = `${y}px`;
        document.body.appendChild(layer);
        _sfkExpire(layer, ms || 1500);
        return layer;
    } catch (e) { return null; }
}

// Where the hero stands (viewport px), or null when no avatar is visible.
export function sfkHeroPoint() {
    const avatar = document.getElementById('player-avatar-wrapper')
        || document.getElementById('player-avatar-simple');
    const img = document.getElementById('avatar-sprite-img')
        || document.getElementById('avatar-sprite-img-simple');
    return _sfkCentre(img) || _sfkCentre(avatar);
}

// Viewport centre of a monster card, or null.
export function sfkCardPoint(monsterId) {
    return _sfkCentre(document.getElementById(`sx-card-${monsterId}`));
}


//------------------------------------------------------------------------
//---------------------------PRIMITIVES-----------------------------------
//------------------------------------------------------------------------

// A burst of particles. Recipe fields (all optional):
//   p      shape (see SFK_SHAPES)          n     how many
//   motion burst | streak | rise | fall | implode | orbit | arc | drift
//   colors list of colours                  glow  glow colour (else colour)
//   size   [min,max] px                     dist  [min,max] travel px
//   dur    [min,max] ms                     delay [min,max] ms
//   angle  [from,to] degrees (0 = right, -90 = up)
//   at     [x%, y%] origin inside the layer spread origin jitter px
//   atX/atY [min,max] % - a random origin per particle (rain, sparkles)
//   lift   arc height px (arc)              grav  extra drop px (arc)
//   spin   degrees of rotation              end   end scale
//   stretch length/width ratio (spark, bolt, blade)
function sfkParticles(layer, r) {
    if (!layer || _sfkLive > SFK_MAX_LIVE) return;
    const shape = SFK_SHAPES.indexOf(r.p) !== -1 ? r.p : 'ember';
    const n = Math.round(_sfkRange(r.n, 10));
    const motion = r.motion || 'burst';
    const a0 = r.angle ? r.angle[0] : 0;
    const a1 = r.angle ? r.angle[1] : 360;
    for (let i = 0; i < n; i++) {
        const ang = a0 + ((n > 1 && r.even) ? (i / n) : Math.random()) * (a1 - a0);
        const rad = ang * Math.PI / 180;
        const dist = _sfkRange(r.dist, 60);
        const size = _sfkRange(r.size, 5);
        const dur = _sfkRange(r.dur, 700);
        const delay = _sfkRange(r.delay, 0);
        const col = _sfkPick(r.colors || ['#ffffff']);
        const ox = r.atX ? _sfkRange(r.atX) : (r.at ? r.at[0] : 50);
        const oy = r.atY ? _sfkRange(r.atY) : (r.at ? r.at[1] : 50);
        const sp = r.spread || 0;
        const vars = {
            x0: `calc(${ox}% + ${((Math.random() * 2 - 1) * sp).toFixed(1)}px)`,
            y0: `calc(${oy}% + ${((Math.random() * 2 - 1) * sp).toFixed(1)}px)`,
            s: `${size.toFixed(1)}px`,
            c: col,
            g: r.glow ? _sfkPick(r.glow) : col,
            d: `${dur.toFixed(0)}ms`,
            dl: `${delay.toFixed(0)}ms`,
            dx: `${(Math.cos(rad) * dist).toFixed(1)}px`,
            dy: `${(Math.sin(rad) * dist).toFixed(1)}px`,
            ang: `${ang.toFixed(1)}deg`,
            dist: `${dist.toFixed(1)}px`,
            lift: `${_sfkRange(r.lift, 30).toFixed(1)}px`,
            grav: `${_sfkRange(r.grav, 0).toFixed(1)}px`,
            spin: `${(_sfkRange(r.spin, 0) * (Math.random() < 0.5 ? -1 : 1)).toFixed(0)}deg`,
            end: `${_sfkRange(r.end, 0.2)}`,
            st: `${_sfkRange(r.stretch, 4)}`,
            sway: `${((Math.random() * 2 - 1) * _sfkRange(r.sway, 16)).toFixed(1)}px`,
            o: `${_sfkRange(r.opacity, 1)}`,
        };
        const text = shape === 'rune' ? _sfkPick(r.glyphs || SFK_RUNES) : (shape === 'note' ? _sfkPick(r.glyphs || ['♪']) : '');
        const el = _sfkSpan(layer, `sfk-p sfk-${shape} sfk-m-${motion}${r.blend ? ' sfk-add' : ''}`, vars, text);
        _sfkExpire(el, dur + delay + 80);
    }
}

// An expanding ring. Fields: color, size px (final diameter), width px,
// dur, delay, squash (height/width ratio, 1 = circle), from (start scale),
// fill (inner wash colour), dashed.
function sfkRing(layer, r) {
    if (!layer) return;
    const dur = _sfkRange(r.dur, 600);
    const delay = _sfkRange(r.delay, 0);
    const el = _sfkSpan(layer, 'sfk-ring' + (r.dashed ? ' is-dashed' : '') + (r.blend ? ' sfk-add' : ''), {
        c: r.color || '#fff', g: r.glow || r.color || '#fff', sz: `${_sfkRange(r.size, 120)}px`,
        w: `${_sfkRange(r.width, 3)}px`, d: `${dur}ms`, dl: `${delay}ms`, sq: `${r.squash || 1}`,
        from: `${r.from == null ? 0.15 : r.from}`, fill: r.fill || 'transparent',
        x0: `${r.at ? r.at[0] : 50}%`, y0: `${r.at ? r.at[1] : 50}%`,
    });
    _sfkExpire(el, dur + delay + 60);
}

// A soft radial flash. Fields: color (core), color2 (edge), size px, dur,
// delay, at.
function sfkFlash(layer, r) {
    if (!layer) return;
    const dur = _sfkRange(r.dur, 380);
    const delay = _sfkRange(r.delay, 0);
    const el = _sfkSpan(layer, 'sfk-flash' + (r.blend ? ' sfk-add' : ''), {
        c: r.color || 'rgba(255,255,255,.95)', c2: r.color2 || 'rgba(255,255,255,0)',
        sz: `${_sfkRange(r.size, 160)}px`, d: `${dur}ms`, dl: `${delay}ms`,
        x0: `${r.at ? r.at[0] : 50}%`, y0: `${r.at ? r.at[1] : 50}%`, sq: `${r.squash || 1}`,
    });
    _sfkExpire(el, dur + delay + 60);
}

// A bespoke CSS piece: one element with the given class (its look and
// animation live in the stylesheet). Fields: css, ms, delay, vars, html.
function sfkPiece(layer, r) {
    if (!layer) return null;
    const vars = Object.assign({ dl: `${_sfkRange(r.delay, 0)}ms` }, r.vars || {});
    const el = _sfkSpan(layer, 'sfk-piece ' + r.css, vars);
    // Inline, because a piece's own `animation` shorthand would reset it.
    el.style.animationDelay = vars.dl;
    if (r.html) el.innerHTML = r.html;
    _sfkExpire(el, (r.ms || 900) + _sfkRange(r.delay, 0));
    return el;
}

// Shakes the game screen. power 1 (tap) .. 6 (cataclysm).
export function sfkShake(power, ms) {
    try {
        const scr = document.getElementById('screen-game');
        if (!scr || !(power > 0)) return;
        scr.style.setProperty('--sfk-shake', `${Math.min(10, power * 1.6).toFixed(1)}px`);
        scr.style.setProperty('--sfk-shake-ms', `${ms || (240 + power * 50)}ms`);
        scr.classList.remove('sfk-shaking');
        void scr.offsetWidth;
        scr.classList.add('sfk-shaking');
        clearTimeout(scr._sfkShakeT);
        scr._sfkShakeT = setTimeout(() => scr.classList.remove('sfk-shaking'), (ms || (240 + power * 50)) + 30);
    } catch (e) { /* cosmetic */ }
}

// Tints the whole screen for a moment (big hits). Fields: color, dur.
function sfkScreenTint(r) {
    try {
        const el = document.createElement('div');
        el.className = 'sfk-screen-tint';
        el.style.cssText = `--c:${r.color || 'rgba(255,255,255,.25)'};--d:${r.dur || 380}ms`;
        document.body.appendChild(el);
        _sfkExpire(el, (r.dur || 380) + 40);
    } catch (e) { /* cosmetic */ }
}


//------------------------------------------------------------------------
//---------------------------RECIPE PLAYER--------------------------------
//------------------------------------------------------------------------

// Plays a list of steps into a layer. A step is one of
//   { p: 'ember', ... }      particles      { ring: {...} }    ring
//   { flash: {...} }         flash          { css: 'cls', ms } bespoke piece
//   { shake: n }             screen shake   { tint: {...} }    screen tint
// Any step may carry `delay` (ms) - it is applied to every element in it.
export function sfkPlay(layer, steps, scale) {
    if (!layer || !Array.isArray(steps)) return;
    const k = scale || 1;
    for (const step of steps) {
        try {
            if (step.p) sfkParticles(layer, k === 1 ? step : _sfkScaled(step, k));
            else if (step.ring) sfkRing(layer, k === 1 ? step.ring : Object.assign({}, step.ring, { size: _sfkRange(step.ring.size, 120) * k }));
            else if (step.flash) sfkFlash(layer, k === 1 ? step.flash : Object.assign({}, step.flash, { size: _sfkRange(step.flash.size, 160) * k }));
            else if (step.css) sfkPiece(layer, step);
            else if (step.shake) sfkShake(step.shake, step.ms);
            else if (step.tint) sfkScreenTint(step.tint);
        } catch (e) { /* one broken step never stops the rest */ }
    }
}

// Copy of a particle step with its travel distance and size scaled by k.
function _sfkScaled(step, k) {
    const out = Object.assign({}, step);
    const mul = (r) => (r == null ? r : (typeof r === 'number' ? r * k : [r[0] * k, r[1] * k]));
    out.dist = mul(step.dist);
    out.size = mul(step.size);
    return out;
}

// Plays steps on a monster card (layer lives `ms`).
export function sfkOnCard(monsterId, steps, ms, scale) {
    const layer = sfkCardLayer(monsterId, ms || 1600);
    sfkPlay(layer, steps, scale);
    return layer;
}

// Plays steps at a viewport point (layer lives `ms`).
export function sfkAtPoint(x, y, steps, ms, extraClass) {
    const layer = sfkPointLayer(x, y, ms || 1600, extraClass);
    sfkPlay(layer, steps);
    return layer;
}


//------------------------------------------------------------------------
//---------------------------PROJECTILE FLIGHT----------------------------
//------------------------------------------------------------------------

// Flies a built projectile from start to end and calls onArrive on landing.
// Unlike the shared class-projectile flight it keeps its size (scaleTo),
// can curve (arc px, sideways bulge) and sheds a particle trail.
//   o = { def, cssClass, start, end, ms, easing, scale, scaleTo, arc,
//         trail: { every, steps }, onArrive }
export function sfkFly(o) {
    const proj = document.createElement('div');
    proj.className = `sx-projectile sx-built sfk-proj ${o.cssClass || ''}`;
    proj.style.left = '0px';
    proj.style.top = '0px';
    if (o.def && typeof o.def.build === 'function') o.def.build(proj);
    if (o.def && o.def.spin) proj.style.setProperty('--sx-projfx-spin-ms', `${o.def.spin}ms`);
    document.body.appendChild(proj);

    const s = o.start, e = o.end;
    const dx = e.x - s.x, dy = e.y - s.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const bulge = o.arc || 0;
    const s0 = o.scale || 1.5;
    const s1 = (o.scaleTo == null) ? s0 * 0.85 : o.scaleTo;
    const steps = bulge ? 12 : 1;
    const frames = [];
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        // Quadratic bend: offset peaks mid-flight; heading follows the tangent.
        const off = bulge * 4 * t * (1 - t);
        const x = s.x + dx * t + nx * off;
        const y = s.y + dy * t + ny * off;
        const dOff = bulge * 4 * (1 - 2 * t);
        const ang = Math.atan2(dy + ny * dOff, dx + nx * dOff) * 180 / Math.PI + ((o.def && o.def.rotOffset) || 0);
        const sc = s0 + (s1 - s0) * t;
        frames.push({ transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${ang.toFixed(1)}deg) scale(${sc.toFixed(3)})` });
    }
    const anim = proj.animate(frames, { duration: o.ms || 600, easing: o.easing || 'linear' });

    let trailTimer = null;
    if (o.trail && o.trail.steps) {
        const every = Math.max(14, o.trail.every || 26);
        trailTimer = setInterval(() => {
            try {
                const c = _sfkCentre(proj);
                if (c) sfkAtPoint(c.x, c.y, o.trail.steps, o.trail.ms || 900, 'sfk-trail');
            } catch (err) { /* trail is cosmetic */ }
        }, every);
    }
    let done = false;
    const finish = () => {
        if (done) return;
        done = true;
        if (trailTimer) clearInterval(trailTimer);
        try { proj.remove(); } catch (err) { /* already gone */ }
        try { o.onArrive && o.onArrive(); } catch (err) { /* arrival is the caller's */ }
    };
    anim.onfinish = finish;
    anim.oncancel = finish;
    return proj;
}


//------------------------------------------------------------------------
//---------------------------BEAMS----------------------------------------
//------------------------------------------------------------------------

// A straight beam element between two viewport points (its look comes from
// `css`; the element is rotated onto the line). Lives `ms`.
export function sfkBeam(from, to, css, ms, html) {
    if (!from || !to) return null;
    try {
        const len = Math.hypot(to.x - from.x, to.y - from.y);
        if (!(len > 6)) return null;
        const el = document.createElement('div');
        el.className = 'sfk-beam ' + (css || '');
        el.style.left = `${from.x}px`;
        el.style.top = `${from.y}px`;
        el.style.width = `${len}px`;
        el.style.transform = `rotate(${Math.atan2(to.y - from.y, to.x - from.x)}rad)`;
        if (html) el.innerHTML = html;
        document.body.appendChild(el);
        _sfkExpire(el, ms || 400);
        return el;
    } catch (e) { return null; }
}

// A jagged lightning path between two viewport points, drawn as an SVG
// polyline with `segments` kinks (re-randomised each call). Lives `ms`.
export function sfkLightning(from, to, color, ms, width, segments) {
    if (!from || !to) return null;
    try {
        const pad = 30;
        const minX = Math.min(from.x, to.x) - pad, minY = Math.min(from.y, to.y) - pad;
        const w = Math.abs(to.x - from.x) + pad * 2, h = Math.abs(to.y - from.y) + pad * 2;
        const n = segments || 9;
        const dx = to.x - from.x, dy = to.y - from.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len, ny = dx / len;
        const jag = Math.min(22, len * 0.08);
        let pts = '';
        for (let i = 0; i <= n; i++) {
            const t = i / n;
            const j = (i === 0 || i === n) ? 0 : (Math.random() * 2 - 1) * jag;
            pts += `${(from.x + dx * t + nx * j - minX).toFixed(1)},${(from.y + dy * t + ny * j - minY).toFixed(1)} `;
        }
        const el = document.createElement('div');
        el.className = 'sfk-bolt-svg';
        el.style.cssText = `left:${minX}px;top:${minY}px;width:${w}px;height:${h}px;--c:${color || '#9fd8ff'};--d:${ms || 260}ms`;
        el.innerHTML = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`
            + `<polyline points="${pts}" fill="none" stroke="var(--c)" stroke-width="${(width || 3) * 3}" stroke-linejoin="round" opacity=".35"/>`
            + `<polyline points="${pts}" fill="none" stroke="var(--c)" stroke-width="${(width || 3) * 1.5}" stroke-linejoin="round"/>`
            + `<polyline points="${pts}" fill="none" stroke="#fff" stroke-width="${width || 3}" stroke-linejoin="round"/></svg>`;
        document.body.appendChild(el);
        _sfkExpire(el, ms || 260);
        return el;
    } catch (e) { return null; }
}
