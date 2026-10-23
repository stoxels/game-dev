import { bar, cellWave, glow, glyph, later, piece, ring, rnd, shake, sparks, tint } from './landing-toolkit.js';

//------------------------------------------------------------------------
//-------------------LANDING EFFECTS: UTILITY AND POWER ITEMS-------------
//------------------------------------------------------------------------
// What happens on the grid when Freeze, Shield, the four Tutors, the Scout
// Primer, Row/Column Solve, Survey Scope and the Artifact land.

// A glyph that pops in, holds and fades.
const POP = [
    { transform: 'scale(0)', opacity: 0 },
    { transform: 'scale(1.25)', opacity: 1, offset: 0.2 },
    { transform: 'scale(1)', opacity: 1, offset: 0.75 },
    { transform: 'scale(1.15)', opacity: 0 },
];

// Rays: a ring of thin bars turning slowly around (x, y).
function rays(x, y, size, color, { count = 14, dur = 1200, spin = 60 } = {}) {
    piece(`left:${x - size / 2}px; top:${y - size / 2}px; width:${size}px; height:${size}px; border-radius:50%;`
        + `background:repeating-conic-gradient(from 0deg, ${color} 0 5deg, transparent 5deg ${360 / count}deg);`
        + '-webkit-mask:radial-gradient(circle, transparent 12%, #000 30%, transparent 70%); mask:radial-gradient(circle, transparent 12%, #000 30%, transparent 70%);',
    [{ transform: 'rotate(0deg) scale(0.3)', opacity: 0 }, { transform: `rotate(${spin / 3}deg) scale(1)`, opacity: 0.9, offset: 0.25 }, { transform: `rotate(${spin}deg) scale(1.1)`, opacity: 0 }],
    { duration: dur, easing: 'ease-out' });
}

export const LANDING_UTILITY = {

    // Freeze: frost creeps in from the edges toward the middle; snow drifts.
    freeze(G) {
        const maxD = Math.max(G.rows, G.cols) / 2;
        cellWave(G, c => maxD - Math.min(c.r, G.rows - 1 - c.r, c.c, G.cols - 1 - c.c), {
            step: 90, hold: 1100, paint: 'linear-gradient(135deg, rgba(235,248,255,0.75), rgba(150,210,255,0.55))', glowColor: '#bfe6ff',
        });
        piece(`left:${G.left}px; top:${G.top}px; width:${G.width}px; height:${G.height}px; border-radius:4px;`
            + 'box-shadow:inset 0 0 50px 14px rgba(190,230,255,0.85);',
        [{ opacity: 0 }, { opacity: 1, offset: 0.35 }, { opacity: 0 }], { duration: 1500 });
        for (let i = 0; i < 16; i++) {
            const x = G.left + rnd(0, G.width), y = G.top - 10;
            glyph(i % 3 ? '❄' : '❅', x, y, rnd(14, 24), [
                { transform: 'translate(0,0) rotate(0deg)', opacity: 0 },
                { opacity: 0.95, offset: 0.2 },
                { transform: `translate(${rnd(-30, 30)}px,${G.height * rnd(0.5, 1)}px) rotate(${rnd(90, 300)}deg)`, opacity: 0 },
            ], { duration: 1400, delay: rnd(0, 500) }, 'color:#dff3ff; text-shadow:0 0 8px #7cc7ff;');
        }
    },

    // Shield: a translucent dome with a hex pattern swells over the whole grid.
    shield(G) {
        const size = Math.max(G.width, G.height) * 1.25;
        piece(`left:${G.cx - size / 2}px; top:${G.cy - size / 2}px; width:${size}px; height:${size}px; border-radius:50%;`
            + 'background:radial-gradient(circle at 35% 28%, rgba(255,255,255,0.45), rgba(80,150,255,0.18) 38%, rgba(60,120,255,0.28) 78%, rgba(120,190,255,0.7) 100%),'
            + 'repeating-linear-gradient(60deg, rgba(180,220,255,0.18) 0 2px, transparent 2px 22px), repeating-linear-gradient(-60deg, rgba(180,220,255,0.18) 0 2px, transparent 2px 22px);'
            + 'border:3px solid rgba(190,225,255,0.95); box-shadow:0 0 34px 6px rgba(90,160,255,0.8), inset 0 0 40px rgba(120,180,255,0.5);',
        [{ transform: 'scale(0.1)', opacity: 0 }, { transform: 'scale(1.05)', opacity: 1, offset: 0.3 }, { transform: 'scale(1)', opacity: 0.95, offset: 0.7 }, { transform: 'scale(1.06)', opacity: 0 }],
        { duration: 1500, easing: 'cubic-bezier(.2,.8,.3,1)' });
        ring(G.cx, G.cy, size, '#9fd0ff', { dur: 700, delay: 250, width: 4 });
        glyph('🛡️', G.cx, G.cy, 52, POP, { duration: 1300, delay: 150 });
    },

    // Tutor: a lightbulb pings on, golden rays turn behind it.
    tutor(G) {
        rays(G.cx, G.cy, G.width * 0.9, 'rgba(255,225,90,0.8)', { count: 12 });
        glow(G.cx, G.cy, G.width * 0.7, 'rgba(255,236,120,0.9)', { dur: 1100 });
        glyph('💡', G.cx, G.cy, 62, POP, { duration: 1300 }).style.filter = 'drop-shadow(0 0 16px #ffe45a)';
    },

    // Professor: pages of a book flutter up in curving paths.
    tutor4(G) {
        glyph('📖', G.cx, G.cy + 20, 58, POP, { duration: 1500 });
        for (let i = 0; i < 12; i++) {
            const side = i % 2 ? 1 : -1;
            glyph('📄', G.cx, G.cy, 22, [
                { transform: 'translate(0,0) rotate(0deg) scale(0.5)', opacity: 0 },
                { transform: `translate(${side * rnd(40, 90)}px,${-rnd(50, 100)}px) rotate(${side * 40}deg) scale(1)`, opacity: 1, offset: 0.4 },
                { transform: `translate(${side * rnd(100, 190)}px,${-rnd(130, 230)}px) rotate(${side * 160}deg) scale(0.8)`, opacity: 0 },
            ], { duration: 1300, delay: 150 + i * 70, easing: 'ease-out' });
        }
        glow(G.cx, G.cy, G.width * 0.6, 'rgba(160,200,255,0.7)', { dur: 1200 });
    },

    // Scholar: a graduation cap is tossed up spinning, confetti rains down.
    tutor6(G) {
        glyph('🎓', G.cx, G.cy, 62, [
            { transform: 'translateY(40px) rotate(0deg) scale(0.4)', opacity: 0 },
            { transform: 'translateY(0) rotate(0deg) scale(1)', opacity: 1, offset: 0.15 },
            { transform: `translateY(${-G.height * 0.45}px) rotate(540deg) scale(1.3)`, opacity: 1, offset: 0.6 },
            { transform: 'translateY(10px) rotate(720deg) scale(1)', opacity: 0 },
        ], { duration: 1500, easing: 'cubic-bezier(.3,.7,.4,1)' });
        const colors = ['#ff6b8b', '#ffd34d', '#5ad1ff', '#8aff7a', '#c58bff'];
        for (let i = 0; i < 30; i++) {
            const x = G.left + rnd(0, G.width);
            piece(`left:${x}px; top:${G.top}px; width:7px; height:12px; background:${colors[i % colors.length]};`,
                [{ transform: 'translateY(-10px) rotate(0deg)', opacity: 0 }, { opacity: 1, offset: 0.15 }, { transform: `translate(${rnd(-40, 40)}px,${G.height * rnd(0.6, 1)}px) rotate(${rnd(200, 700)}deg)`, opacity: 0 }],
                { duration: 1300, delay: 500 + rnd(0, 450), easing: 'ease-in' });
        }
    },

    // Grand Mentor: a golden rune circle, a pillar of light, a wave over every cell.
    tutorAll(G) {
        const size = Math.min(G.width, G.height) * 0.85;
        piece(`left:${G.cx - size / 2}px; top:${G.cy - size / 2}px; width:${size}px; height:${size}px; border-radius:50%;`
            + 'border:3px solid #ffd76a; box-shadow:0 0 26px #ffcf4a, inset 0 0 26px rgba(255,207,74,0.5);'
            + 'background:repeating-conic-gradient(from 0deg, rgba(255,215,106,0.35) 0 4deg, transparent 4deg 30deg);',
        [{ transform: 'rotate(0deg) scale(0.2)', opacity: 0 }, { transform: 'rotate(120deg) scale(1)', opacity: 1, offset: 0.25 }, { transform: 'rotate(360deg) scale(1)', opacity: 1, offset: 0.8 }, { transform: 'rotate(420deg) scale(1.1)', opacity: 0 }],
        { duration: 1700, easing: 'ease-in-out' });
        ring(G.cx, G.cy, size * 0.62, '#fff2b0', { from: 1, to: 1, dur: 1500, dashed: true, width: 2 });
        bar(G.cx - 26, G.top - G.height * 0.6, 52, G.height * 1.8, 'linear-gradient(90deg, transparent, rgba(255,240,170,0.95), transparent)',
            [{ opacity: 0, transform: 'scaleX(0)' }, { opacity: 1, transform: 'scaleX(1)', offset: 0.25 }, { opacity: 0, transform: 'scaleX(1.6)' }], { duration: 1200, delay: 250 },
            'mix-blend-mode:screen;');
        cellWave(G, c => Math.hypot(c.r - G.rows / 2, c.c - G.cols / 2), { step: 70, hold: 600, paint: 'rgba(255,225,120,0.4)', glowColor: '#ffd76a' });
        sparks(G.cx, G.cy, 18, { colors: ['#ffd76a', '#fff2b0'], dist: G.width * 0.5, chars: ['✦', '✧', '★'], size: 10, dur: 1200, delay: 300 });
    },

    // Scout Primer: a compass spins and settles, dotted routes fan out with pins.
    scoutPrimer(G) {
        glyph('🧭', G.cx, G.cy, 58, [
            { transform: 'scale(0) rotate(0deg)', opacity: 0 },
            { transform: 'scale(1.2) rotate(360deg)', opacity: 1, offset: 0.35 },
            { transform: 'scale(1) rotate(300deg)', opacity: 1, offset: 0.55 },
            { transform: 'scale(1) rotate(330deg)', opacity: 1, offset: 0.85 },
            { transform: 'scale(0.8) rotate(330deg)', opacity: 0 },
        ], { duration: 1500, easing: 'ease-out' });
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + 0.3, len = Math.min(G.width, G.height) * 0.46;
            piece(`left:${G.cx}px; top:${G.cy - 1}px; width:${len}px; height:0; border-top:3px dotted #f6d58a; transform-origin:0 50%; filter:drop-shadow(0 0 4px #c9892a);`,
                [{ transform: `rotate(${a}rad) scaleX(0)`, opacity: 0 }, { transform: `rotate(${a}rad) scaleX(1)`, opacity: 1, offset: 0.45 }, { transform: `rotate(${a}rad) scaleX(1)`, opacity: 0 }],
                { duration: 1200, delay: 250 + i * 80 });
            glyph('📍', G.cx + Math.cos(a) * len, G.cy + Math.sin(a) * len, 18, [
                { transform: 'translateY(-40px) scale(0.5)', opacity: 0 },
                { transform: 'translateY(0) scale(1.2)', opacity: 1, offset: 0.2 },
                { transform: 'translateY(0) scale(1)', opacity: 1, offset: 0.7 },
                { opacity: 0 },
            ], { duration: 1000, delay: 600 + i * 80 });
        }
    },

    // Row Solve: a golden band races along the middle row, chevrons chasing.
    rowSolve(G) {
        const rowH = G.height / G.rows, midR = Math.floor(G.rows / 2);
        const y = G.top + midR * rowH;
        cellWave(G, c => c.c, { step: Math.max(30, 500 / G.cols), hold: 600, paint: 'rgba(255,205,60,0.45)', glowColor: '#ffcd3c', filter: c => c.r === midR, scale: true });
        bar(G.left - 10, y, 90, rowH, 'linear-gradient(90deg, transparent, rgba(255,230,120,0.95), #fff)',
            [{ transform: 'translateX(0)', opacity: 1 }, { transform: `translateX(${G.width + 20}px)`, opacity: 1, offset: 0.9 }, { transform: `translateX(${G.width + 40}px)`, opacity: 0 }],
            { duration: 750, easing: 'cubic-bezier(.6,0,.4,1)' }, 'box-shadow:0 0 22px 6px #ffcd3c; border-radius:6px;');
        for (let i = 0; i < 5; i++) glyph('»', G.left, y + rowH / 2, 26, [{ transform: 'translateX(0)', opacity: 0 }, { opacity: 1, offset: 0.2 }, { transform: `translateX(${G.width}px)`, opacity: 0 }], { duration: 800, delay: i * 90 }, 'color:#fff3b0; font-weight:900; text-shadow:0 0 8px #ffcd3c;');
        shake(3, 250);
    },

    // Column Solve: a violet-teal curtain drops down the middle column.
    colSolve(G) {
        const colW = G.width / G.cols, midC = Math.floor(G.cols / 2);
        const x = G.left + midC * colW;
        cellWave(G, c => c.r, { step: Math.max(30, 500 / G.rows), hold: 600, paint: 'rgba(120,255,230,0.4)', glowColor: '#6dffe0', filter: c => c.c === midC, scale: true });
        bar(x, G.top - 10, colW, 90, 'linear-gradient(180deg, transparent, rgba(150,255,235,0.95), #fff)',
            [{ transform: 'translateY(0)', opacity: 1 }, { transform: `translateY(${G.height + 20}px)`, opacity: 1, offset: 0.9 }, { transform: `translateY(${G.height + 40}px)`, opacity: 0 }],
            { duration: 750, easing: 'cubic-bezier(.6,0,.4,1)' }, 'box-shadow:0 0 22px 6px #6dffe0; border-radius:6px;');
        for (let i = 0; i < 5; i++) glyph('⌄', x + colW / 2, G.top, 30, [{ transform: 'translateY(0)', opacity: 0 }, { opacity: 1, offset: 0.2 }, { transform: `translateY(${G.height}px)`, opacity: 0 }], { duration: 800, delay: i * 90 }, 'color:#d8fff7; font-weight:900; text-shadow:0 0 8px #6dffe0;');
        shake(3, 250);
    },

    // Survey Scope: a dark iris closes to a reticle, then pulses to mark the area.
    surveyScope(G) {
        const size = Math.min(G.width, G.height) * 0.7;
        piece(`left:${G.cx - size / 2}px; top:${G.cy - size / 2}px; width:${size}px; height:${size}px; border-radius:50%;`
            + 'border:3px solid #ffb86b; box-shadow:0 0 0 160vmax rgba(5,8,20,0.55), 0 0 24px #ff9a3c, inset 0 0 22px rgba(255,154,60,0.5);',
        [{ transform: 'scale(3.2)', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: 0.35 }, { transform: 'scale(1)', opacity: 1, offset: 0.75 }, { transform: 'scale(0.9)', opacity: 0 }],
        { duration: 1500, easing: 'cubic-bezier(.3,.8,.3,1)' });
        const line = (css) => bar(0, 0, 1, 1, '#ffb86b', [{ opacity: 0 }, { opacity: 1, offset: 0.35 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }], { duration: 1500 }, 'box-shadow:0 0 6px #ff9a3c;' + css);
        line(`left:${G.cx - size / 2 - 14}px; top:${G.cy}px; width:${size + 28}px; height:2px;`);
        line(`left:${G.cx}px; top:${G.cy - size / 2 - 14}px; width:2px; height:${size + 28}px;`);
        ring(G.cx, G.cy, size * 0.45, '#ffb86b', { from: 1, to: 1, dur: 1500, width: 2, dashed: true });
        later(600, () => { ring(G.cx, G.cy, size * 1.2, '#ffd9a8', { dur: 700 }); sparks(G.cx, G.cy, 12, { colors: ['#ffb86b', '#fff'], dist: size * 0.6, dur: 700 }); });
    },

    // Artifact: a golden sunburst - spinning rays, a big star, coins and stars rising.
    artifactComplete(G) {
        const size = Math.max(G.width, G.height) * 1.3;
        piece(`left:${G.cx - size / 2}px; top:${G.cy - size / 2}px; width:${size}px; height:${size}px; border-radius:50%;`
            + 'background:repeating-conic-gradient(from 0deg, rgba(255,215,0,0.55) 0 6deg, transparent 6deg 24deg);'
            + '-webkit-mask:radial-gradient(circle, #000 5%, transparent 68%); mask:radial-gradient(circle, #000 5%, transparent 68%); mix-blend-mode:screen;',
        [{ transform: 'rotate(0deg) scale(0.2)', opacity: 0 }, { transform: 'rotate(60deg) scale(0.9)', opacity: 1, offset: 0.25 }, { transform: 'rotate(200deg) scale(1.1)', opacity: 1, offset: 0.7 }, { transform: 'rotate(260deg) scale(1.2)', opacity: 0 }],
        { duration: 2000, easing: 'ease-out' });
        glow(G.cx, G.cy, G.width * 1.1, 'rgba(255,230,120,0.95)', { dur: 1600 });
        glyph('🏺', G.cx, G.cy, 74, [
            { transform: 'scale(0) rotate(-20deg)', opacity: 0 },
            { transform: 'scale(1.3) rotate(8deg)', opacity: 1, offset: 0.25 },
            { transform: 'scale(1.15) rotate(0deg)', opacity: 1, offset: 0.8 },
            { transform: 'scale(1.5)', opacity: 0 },
        ], { duration: 1800 }).style.filter = 'drop-shadow(0 0 22px #ffd700)';
        ring(G.cx, G.cy, size, '#ffe066', { dur: 1100, delay: 200, width: 4 });
        ring(G.cx, G.cy, size * 0.7, '#fff2b0', { dur: 900, delay: 400, width: 3 });
        for (let i = 0; i < 22; i++) {
            glyph(i % 2 ? '🪙' : '✦', G.cx + rnd(-30, 30), G.cy, rnd(12, 20), [
                { transform: 'translate(0,0) scale(0.4)', opacity: 0 },
                { opacity: 1, offset: 0.2 },
                { transform: `translate(${rnd(-G.width * 0.45, G.width * 0.45)}px,${-rnd(G.height * 0.3, G.height * 0.8)}px) rotate(${rnd(-360, 360)}deg) scale(1)`, opacity: 0 },
            ], { duration: 1400, delay: 250 + rnd(0, 500), easing: 'cubic-bezier(.2,.8,.4,1)' }, 'color:#ffe066; text-shadow:0 0 8px #ffd700;');
        }
        tint(G, '#ffe9a0', { alpha: 0.35, dur: 1200, blend: 'screen' });
    },
};
