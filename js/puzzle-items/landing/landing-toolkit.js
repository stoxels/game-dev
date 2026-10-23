import { cur } from '../../state.js';

//------------------------------------------------------------------------
//-------------------LANDING TOOLKIT--------------------------------------
//------------------------------------------------------------------------
// Small building blocks for the per-item landing effects: positions are in
// window pixels, every piece is a short-lived element that plays its own
// animation and removes itself. Nothing here knows about a specific item.

export const rnd = (a, b) => a + Math.random() * (b - a);
export const pick = (list) => list[Math.floor(Math.random() * list.length)];

// Runs `fn` after `ms` milliseconds.
export function later(ms, fn) { setTimeout(fn, ms); }

// The puzzle grid on screen: its box, centre, a distance that reaches every
// corner, and the cell counts. Null when no grid is showing.
export function gridBox() {
    const sol = cur && cur.grid;
    if (!sol || !sol.length) return null;
    const rows = sol.length, cols = sol[0].length;
    const first = document.getElementById('g-0-0');
    const last = document.getElementById(`g-${rows - 1}-${cols - 1}`);
    if (!first || !last) return null;
    const f = first.getBoundingClientRect(), l = last.getBoundingClientRect();
    const width = l.right - f.left, height = l.bottom - f.top;
    return {
        left: f.left, top: f.top, width, height, rows, cols,
        cx: f.left + width / 2, cy: f.top + height / 2,
        reach: Math.hypot(width, height),
    };
}

// Adds a fixed-position element, plays `keyframes` on it and removes it when
// the animation ends. `css` positions and paints it. Returns the element.
export function piece(css, keyframes, options) {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed; pointer-events:none; z-index:9400;' + css;
    document.body.appendChild(el);
    const anim = el.animate(keyframes, { fill: 'forwards', ...options });
    anim.onfinish = () => el.remove();
    return el;
}

// A character / emoji centred on (x, y) that plays `keyframes`.
export function glyph(ch, x, y, size, keyframes, options, extraCss = '') {
    const el = piece(`left:${x - size}px; top:${y - size}px; width:${size * 2}px; height:${size * 2}px;`
        + `display:flex; align-items:center; justify-content:center; font-size:${size}px; line-height:1;` + extraCss,
    keyframes, options);
    el.textContent = ch;
    return el;
}

// A circle outline centred on (x, y) that grows (or shrinks, with from > to).
export function ring(x, y, size, color, { from = 0.1, to = 1, dur = 800, delay = 0, width = 3, dashed = false, fade = true } = {}) {
    return piece(`left:${x - size / 2}px; top:${y - size / 2}px; width:${size}px; height:${size}px; border-radius:50%;`
        + `border:${width}px ${dashed ? 'dashed' : 'solid'} ${color}; box-shadow:0 0 14px ${color}, inset 0 0 14px ${color};`,
        [{ transform: `scale(${from})`, opacity: fade && from < to ? 1 : 0.9 }, { transform: `scale(${to})`, opacity: fade && from < to ? 0 : 1 }],
        { duration: dur, delay, easing: 'ease-out' });
}

// A soft glowing disc centred on (x, y) that swells and fades.
export function glow(x, y, size, color, { dur = 900, delay = 0, peak = 0.9 } = {}) {
    return piece(`left:${x - size / 2}px; top:${y - size / 2}px; width:${size}px; height:${size}px; border-radius:50%;`
        + `background:radial-gradient(circle, ${color} 0%, transparent 68%); mix-blend-mode:screen;`,
        [{ transform: 'scale(0.3)', opacity: 0 }, { transform: 'scale(1)', opacity: peak, offset: 0.3 }, { transform: 'scale(1.25)', opacity: 0 }],
        { duration: dur, delay, easing: 'ease-out' });
}

// Little glowing dots (or characters) flying out of (x, y).
export function sparks(x, y, count, { colors = ['#fff'], dist = 90, size = 6, dur = 800, delay = 0, rise = 0, chars = null, spread = Math.PI * 2, angle = 0 } = {}) {
    for (let i = 0; i < count; i++) {
        const a = angle + (i / count) * spread + rnd(-0.2, 0.2);
        const d = dist * rnd(0.5, 1.1);
        const col = pick(colors);
        const css = chars
            ? `left:${x - size}px; top:${y - size}px; font-size:${size * 2}px; color:${col}; text-shadow:0 0 8px ${col};`
            : `left:${x - size / 2}px; top:${y - size / 2}px; width:${size}px; height:${size}px; border-radius:50%; background:#fff; box-shadow:0 0 9px 3px ${col};`;
        const p = piece(css,
            [{ transform: 'translate(0,0) scale(1)', opacity: 1 },
                { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d - rise}px) scale(0.2)`, opacity: 0 }],
            { duration: dur * rnd(0.7, 1.2), delay: delay + rnd(0, 120), easing: 'ease-out' });
        if (chars) p.textContent = pick(chars);
    }
}

// A straight bar from (x, y) with its own size, e.g. a laser or a ray.
export function bar(x, y, w, h, background, keyframes, options, extraCss = '') {
    return piece(`left:${x}px; top:${y}px; width:${w}px; height:${h}px; background:${background};` + extraCss, keyframes, options);
}

// Every cell of the grid as { r, c, x, y, w, h } (window pixels).
export function cellRects(G) {
    const out = [];
    for (let r = 0; r < G.rows; r++) {
        for (let c = 0; c < G.cols; c++) {
            const e = document.getElementById(`g-${r}-${c}`);
            if (!e) continue;
            const b = e.getBoundingClientRect();
            out.push({ r, c, x: b.left, y: b.top, w: b.width, h: b.height });
        }
    }
    return out;
}

// Lights the cells one after another. `order(cell)` gives each cell its
// turn (smaller = earlier); `step` is the delay per unit, `hold` how long a
// cell stays lit, `filter(cell)` can skip cells, `paint` is the cell colour.
export function cellWave(G, order, { step = 40, hold = 450, paint = 'rgba(255,255,255,0.5)', glowColor = null, filter = null, scale = false } = {}) {
    const cells = cellRects(G).filter(c => !filter || filter(c));
    cells.forEach(c => {
        const keys = [{ opacity: 0, transform: 'scale(1)' }, { opacity: 1, transform: scale ? 'scale(1.12)' : 'scale(1)', offset: 0.25 }, { opacity: 0, transform: 'scale(1)' }];
        piece(`left:${c.x}px; top:${c.y}px; width:${c.w}px; height:${c.h}px; background:${paint}; border-radius:3px;`
            + (glowColor ? `box-shadow:0 0 12px 2px ${glowColor}, inset 0 0 8px ${glowColor};` : ''),
        keys, { duration: hold, delay: order(c) * step, easing: 'ease-out' });
    });
}

// Washes a colour over the whole grid and fades it out.
export function tint(G, color, { alpha = 0.35, dur = 700, delay = 0, blend = 'normal', radius = 4 } = {}) {
    return piece(`left:${G.left}px; top:${G.top}px; width:${G.width}px; height:${G.height}px; background:${color}; border-radius:${radius}px; mix-blend-mode:${blend};`,
        [{ opacity: 0 }, { opacity: alpha, offset: 0.2 }, { opacity: 0 }], { duration: dur, delay });
}

// Rattles the whole puzzle area for a moment.
export function shake(amp = 6, dur = 400) {
    const wrap = document.getElementById('puzzle-scaler-wrap');
    if (!wrap || !wrap.animate) return;
    const k = [];
    for (let i = 0; i <= 8; i++) k.push({ transform: i === 8 ? 'translate(0,0)' : `translate(${rnd(-amp, amp)}px,${rnd(-amp, amp)}px)` });
    wrap.animate(k, { duration: dur, easing: 'linear' });
}
