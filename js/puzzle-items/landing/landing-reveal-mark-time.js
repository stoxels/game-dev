import { bar, cellWave, glow, glyph, later, piece, ring, rnd, shake, sparks, tint } from './landing-toolkit.js';

//------------------------------------------------------------------------
//-------------------LANDING EFFECTS: REVEAL, MARK, TIME------------------
//------------------------------------------------------------------------
// What happens on the grid when each Reveal / Mark / Time item lands. One
// entry per item id; each receives the grid box (see gridBox()).

// A glyph that pops in, holds and fades (rotation optional).
const POP = (spin = 0, hold = 0.7) => [
    { transform: 'scale(0) rotate(' + (-spin) + 'deg)', opacity: 0 },
    { transform: 'scale(1.25) rotate(0deg)', opacity: 1, offset: 0.2 },
    { transform: 'scale(1) rotate(0deg)', opacity: 1, offset: hold },
    { transform: 'scale(1.1) rotate(' + spin + 'deg)', opacity: 0 },
];

export const LANDING_REVEAL_MARK_TIME = {

    // 🕯️ Candle: a flickering flame and warm light that spreads, embers rising.
    reveal1(G) {
        glow(G.cx, G.cy, G.width * 1.1, 'rgba(255,170,60,0.85)', { dur: 1500, peak: 0.8 });
        const flame = glyph('🔥', G.cx, G.cy - 10, 70, [
            { transform: 'scale(0.2)', opacity: 0, filter: 'brightness(1)' },
            { transform: 'scale(1.1) rotate(-6deg)', opacity: 1, offset: 0.15, filter: 'brightness(1.4)' },
            { transform: 'scale(0.95) rotate(5deg)', opacity: 1, offset: 0.35 },
            { transform: 'scale(1.08) rotate(-4deg)', opacity: 1, offset: 0.55, filter: 'brightness(1.3)' },
            { transform: 'scale(0.98) rotate(3deg)', opacity: 1, offset: 0.75 },
            { transform: 'scale(0.4) translateY(-30px)', opacity: 0 },
        ], { duration: 1500 });
        flame.style.filter = 'drop-shadow(0 0 18px #ffb347)';
        sparks(G.cx, G.cy, 14, { colors: ['#ffb347', '#ffd27a', '#ff7a2f'], dist: 40, rise: 120, size: 5, dur: 1400, spread: Math.PI * 0.8, angle: -Math.PI * 0.9 });
    },

    // 🔍 Magnifier: a glass lens drifts over the grid in a loop, glinting.
    reveal2(G) {
        const size = Math.min(G.width, G.height) * 0.32;
        const path = [];
        for (let i = 0; i <= 12; i++) {
            const t = (i / 12) * Math.PI * 2;
            path.push({
                transform: `translate(${Math.cos(t) * G.width * 0.28 + Math.sin(t * 2) * 20}px,${Math.sin(t * 2) * G.height * 0.22}px) scale(${i === 0 || i === 12 ? 0.3 : 1})`,
                opacity: i === 0 || i === 12 ? 0 : 1,
            });
        }
        piece(`left:${G.cx - size / 2}px; top:${G.cy - size / 2}px; width:${size}px; height:${size}px; border-radius:50%;`
            + 'border:6px solid #d9b45a; background:radial-gradient(circle at 32% 28%, rgba(255,255,255,0.75) 0 10%, rgba(180,230,255,0.18) 35%, rgba(180,230,255,0.08) 70%);'
            + 'box-shadow:0 0 22px rgba(255,230,150,0.8), inset 0 0 20px rgba(255,255,255,0.35);',
        path, { duration: 1700, easing: 'ease-in-out' });
        later(250, () => ring(G.cx, G.cy, size * 1.6, '#ffe6a0', { dur: 900 }));
    },

    // 🔭 Spyglass: a radar ping - rotating sweep, sonar rings, crosshair.
    reveal3(G) {
        const size = Math.min(G.width, G.height) * 0.95;
        piece(`left:${G.cx - size / 2}px; top:${G.cy - size / 2}px; width:${size}px; height:${size}px; border-radius:50%;`
            + 'background:conic-gradient(from 0deg, rgba(80,255,170,0) 0deg, rgba(80,255,170,0.55) 70deg, rgba(80,255,170,0) 71deg);'
            + 'border:2px solid rgba(80,255,170,0.7); box-shadow:0 0 24px rgba(80,255,170,0.5);',
        [{ transform: 'rotate(0deg) scale(0.6)', opacity: 0 }, { transform: 'rotate(180deg) scale(1)', opacity: 1, offset: 0.15 }, { transform: 'rotate(720deg) scale(1)', opacity: 1, offset: 0.85 }, { transform: 'rotate(900deg) scale(1)', opacity: 0 }],
        { duration: 1500, easing: 'linear' });
        for (let i = 0; i < 3; i++) ring(G.cx, G.cy, size, '#5dffb0', { dur: 900, delay: i * 320, dashed: i === 1 });
        bar(G.cx - size / 2, G.cy - 1, size, 2, 'rgba(80,255,170,0.8)', [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 0 }], { duration: 1400 });
        bar(G.cx - 1, G.cy - size / 2, 2, size, 'rgba(80,255,170,0.8)', [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 0 }], { duration: 1400 });
    },

    // 📡 Scanner: digital row scan - a laser drops down, rows light up behind it.
    reveal4(G) {
        cellWave(G, c => c.r, { step: Math.max(30, 600 / G.rows), hold: 600, paint: 'rgba(60,255,150,0.28)', glowColor: '#3cff96' });
        const laser = bar(G.left - 8, G.top, G.width + 16, 4, 'linear-gradient(90deg, transparent, #7dffc0, #fff, #7dffc0, transparent)',
            [{ transform: 'translateY(0)', opacity: 1 }, { transform: `translateY(${G.height}px)`, opacity: 1 }], { duration: 650, easing: 'linear' },
            'box-shadow:0 0 18px 4px #3cff96;');
        void laser;
        bar(G.left, G.top, G.width, G.height, 'repeating-linear-gradient(0deg, rgba(60,255,150,0.18) 0 1px, transparent 1px 6px)',
            [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 0 }], { duration: 1100 });
    },

    // Eraser: a pink rubber scrubs back and forth, leaving dust.
    markWrong2(G) {
        const w = G.width * 0.5;
        const e = glyph('🧽', G.cx, G.cy, 60, [
            { transform: `translate(${-w / 2}px,-30px) rotate(-20deg) scale(0.4)`, opacity: 0 },
            { transform: `translate(${-w / 2}px,-30px) rotate(-20deg) scale(1)`, opacity: 1, offset: 0.12 },
            { transform: `translate(${w / 2}px,20px) rotate(15deg)`, offset: 0.35 },
            { transform: `translate(${-w / 2}px,45px) rotate(-15deg)`, offset: 0.6 },
            { transform: `translate(${w / 2}px,70px) rotate(15deg)`, opacity: 1, offset: 0.85 },
            { transform: `translate(${w / 2}px,70px) rotate(15deg) scale(0.5)`, opacity: 0 },
        ], { duration: 1200 });
        e.style.filter = 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))';
        for (let i = 0; i < 4; i++) {
            const y = G.cy - 20 + i * 30;
            bar(G.cx - w / 2, y, w, 22, 'linear-gradient(90deg, transparent, rgba(255,150,190,0.45), transparent)',
                [{ clipPath: 'inset(0 100% 0 0)', opacity: 1 }, { clipPath: 'inset(0 0% 0 0)', opacity: 1, offset: 0.6 }, { clipPath: 'inset(0 0 0 0)', opacity: 0 }],
                { duration: 700, delay: 150 + i * 220, easing: 'ease-out' });
            sparks(G.cx + (i % 2 ? w / 2 : -w / 2), y + 10, 5, { colors: ['#ffc2d6', '#ffe0ea'], dist: 30, size: 4, dur: 600, delay: 200 + i * 220 });
        }
    },

    // Sweeper: a broom pushes a dust cloud across the grid left to right.
    markWrong4(G) {
        glyph('🧹', G.left, G.cy, 64, [
            { transform: 'translate(0,0) rotate(-35deg) scale(0.5)', opacity: 0 },
            { transform: 'translate(40px,0) rotate(-35deg) scale(1)', opacity: 1, offset: 0.12 },
            { transform: `translate(${G.width}px,0) rotate(-35deg)`, opacity: 1, offset: 0.85 },
            { transform: `translate(${G.width + 50}px,0) rotate(-35deg)`, opacity: 0 },
        ], { duration: 1100, easing: 'ease-in-out' });
        for (let i = 0; i < 16; i++) {
            const y = G.top + (i / 15) * G.height;
            const s = rnd(18, 34);
            piece(`left:${G.left - 20}px; top:${y - s / 2}px; width:${s}px; height:${s}px; border-radius:50%;`
                + 'background:radial-gradient(circle, rgba(220,200,170,0.8), rgba(220,200,170,0) 70%);',
            [{ transform: 'translate(0,0) scale(0.3)', opacity: 0 }, { transform: `translate(${G.width * 0.55}px,${rnd(-14, 14)}px) scale(1)`, opacity: 0.9, offset: 0.5 }, { transform: `translate(${G.width + 40}px,${rnd(-20, 20)}px) scale(1.5)`, opacity: 0 }],
            { duration: 1100, delay: rnd(0, 250), easing: 'ease-in' });
        }
    },

    // Error Magnet: red field lines are pulled inward, iron filings fly in.
    markWrong6(G) {
        const size = Math.max(G.width, G.height) * 1.1;
        for (let i = 0; i < 4; i++) ring(G.cx, G.cy, size, i % 2 ? '#ff5a5a' : '#ff9a9a', { from: 1, to: 0.08, dur: 900, delay: i * 190, width: 2, dashed: true });
        glyph('🧲', G.cx, G.cy, 62, POP(25, 0.75), { duration: 1300 }).style.filter = 'drop-shadow(0 0 14px #ff4040)';
        for (let i = 0; i < 18; i++) {
            const a = (i / 18) * Math.PI * 2, d = Math.max(G.width, G.height) * rnd(0.45, 0.7);
            piece(`left:${G.cx - 2}px; top:${G.cy - 2}px; width:${rnd(3, 6)}px; height:2px; background:#6b6f78; box-shadow:0 0 4px #ff6a6a; transform-origin:center;`,
                [{ transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d}px) rotate(${a}rad)`, opacity: 0 },
                    { opacity: 1, offset: 0.2 },
                    { transform: `translate(0,0) rotate(${a}rad)`, opacity: 0 }],
                { duration: 800, delay: rnd(0, 500), easing: 'ease-in' });
        }
    },

    // Error Gem: a purple gem swells, cracks and bursts into shards.
    markWrong8(G) {
        const gem = glyph('💎', G.cx, G.cy, 56, [
            { transform: 'scale(0)', opacity: 0 },
            { transform: 'scale(1.3)', opacity: 1, offset: 0.25, filter: 'hue-rotate(250deg) brightness(1.4)' },
            { transform: 'scale(1.5)', opacity: 1, offset: 0.5, filter: 'hue-rotate(250deg) brightness(2)' },
            { transform: 'scale(2.2)', opacity: 0, filter: 'hue-rotate(250deg) brightness(3)' },
        ], { duration: 700 });
        gem.style.filter = 'hue-rotate(250deg)';
        later(520, () => {
            glow(G.cx, G.cy, G.width * 0.9, 'rgba(190,90,255,0.9)', { dur: 700 });
            shake(5, 300);
            for (let i = 0; i < 16; i++) {
                const a = (i / 16) * Math.PI * 2 + rnd(-0.2, 0.2), d = rnd(60, G.width * 0.55), s = rnd(10, 22);
                piece(`left:${G.cx - s / 2}px; top:${G.cy - s / 2}px; width:${s}px; height:${s}px; background:linear-gradient(135deg, #f1d2ff, #a64bff 60%, #5b1d99);`
                    + 'clip-path:polygon(50% 0, 100% 80%, 0 100%); box-shadow:0 0 8px #c07bff;',
                [{ transform: 'translate(0,0) rotate(0deg) scale(1)', opacity: 1 }, { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d}px) rotate(${rnd(180, 540)}deg) scale(0.4)`, opacity: 0 }],
                { duration: 800, easing: 'cubic-bezier(.1,.7,.3,1)' });
            }
        });
    },

    // Hourglass: it flips over while grains of sand pour down; a blue ripple.
    addTime60(G) {
        glyph('⏳', G.cx, G.cy, 70, [
            { transform: 'scale(0) rotate(0deg)', opacity: 0 },
            { transform: 'scale(1.1) rotate(0deg)', opacity: 1, offset: 0.2 },
            { transform: 'scale(1.1) rotate(180deg)', opacity: 1, offset: 0.55 },
            { transform: 'scale(1) rotate(180deg)', opacity: 1, offset: 0.85 },
            { transform: 'scale(0.8) rotate(180deg)', opacity: 0 },
        ], { duration: 1400, easing: 'ease-in-out' });
        for (let i = 0; i < 26; i++) {
            piece(`left:${G.cx + rnd(-3, 3)}px; top:${G.cy - 10}px; width:3px; height:3px; border-radius:50%; background:#f3d58a; box-shadow:0 0 5px #e8b94a;`,
                [{ transform: 'translateY(0)', opacity: 0 }, { opacity: 1, offset: 0.2 }, { transform: `translateY(${rnd(60, 110)}px)`, opacity: 0 }],
                { duration: 650, delay: 450 + i * 28, easing: 'ease-in' });
        }
        ring(G.cx, G.cy, G.width * 0.8, '#7ec8ff', { dur: 1000, delay: 500 });
    },

    // Stopwatch: a dial with a hand that sweeps a full turn, ticks pulse out.
    addTime300(G) {
        const size = Math.min(G.width, G.height) * 0.55;
        const dial = piece(`left:${G.cx - size / 2}px; top:${G.cy - size / 2}px; width:${size}px; height:${size}px; border-radius:50%;`
            + 'border:5px solid #8fe0ff; background:radial-gradient(circle, rgba(20,60,90,0.75), rgba(10,30,50,0.55));'
            + 'box-shadow:0 0 24px #4fc3f7, inset 0 0 18px rgba(79,195,247,0.5);',
        [{ transform: 'scale(0.2)', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: 0.15 }, { transform: 'scale(1)', opacity: 1, offset: 0.85 }, { transform: 'scale(1.15)', opacity: 0 }],
        { duration: 1300, easing: 'ease-out' });
        for (let i = 0; i < 12; i++) {
            const tick = document.createElement('i');
            tick.style.cssText = `position:absolute; left:50%; top:0; width:3px; height:${i % 3 === 0 ? 12 : 7}px; margin-left:-1.5px; background:#cdf3ff; transform-origin:50% ${size / 2 - 5}px; transform:rotate(${i * 30}deg);`;
            dial.appendChild(tick);
        }
        const hand = document.createElement('i');
        hand.style.cssText = `position:absolute; left:50%; top:12%; width:3px; height:38%; margin-left:-1.5px; background:#fff; box-shadow:0 0 8px #4fc3f7; transform-origin:50% 100%;`;
        dial.appendChild(hand);
        hand.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 900, delay: 200, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' });
        for (let i = 0; i < 5; i++) ring(G.cx, G.cy, size * 1.4, '#4fc3f7', { dur: 500, delay: 200 + i * 180, width: 2 });
    },

    // Clock: the hands spin backwards (rewind) while rings contract inward.
    addTime600(G) {
        const size = Math.min(G.width, G.height) * 0.62;
        for (let i = 0; i < 4; i++) ring(G.cx, G.cy, size * 1.5, '#9ad7ff', { from: 1, to: 0.15, dur: 700, delay: i * 200, width: 2, dashed: true });
        const face = piece(`left:${G.cx - size / 2}px; top:${G.cy - size / 2}px; width:${size}px; height:${size}px; border-radius:50%;`
            + 'background:radial-gradient(circle, #f8fcff 0 52%, #bfe3ff 100%); border:5px solid #5aa8e0; box-shadow:0 0 28px #6ec1ff;',
        [{ transform: 'scale(0.2) rotate(40deg)', opacity: 0 }, { transform: 'scale(1) rotate(0deg)', opacity: 1, offset: 0.2 }, { transform: 'scale(1)', opacity: 1, offset: 0.85 }, { transform: 'scale(0.4)', opacity: 0 }],
        { duration: 1500, easing: 'ease-out' });
        const hand = (len, w, turns, color) => {
            const h = document.createElement('i');
            h.style.cssText = `position:absolute; left:50%; top:${50 - len}%; width:${w}px; height:${len}%; margin-left:${-w / 2}px; background:${color}; border-radius:2px; transform-origin:50% 100%;`;
            face.appendChild(h);
            h.animate([{ transform: 'rotate(0deg)' }, { transform: `rotate(${-360 * turns}deg)` }], { duration: 1100, delay: 200, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
        };
        hand(38, 4, 3, '#1d4f7a');
        hand(28, 6, 1, '#1d4f7a');
        glyph('⏪', G.cx, G.cy + size * 0.28, 22, [{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 0 }], { duration: 1200, delay: 150 });
    },

    // Chronobolt: three lightning bolts strike down and the grid flashes blue-white.
    addTime900(G) {
        tint(G, '#cfe9ff', { alpha: 0.6, dur: 600, delay: 150, blend: 'screen' });
        shake(7, 450);
        [0.2, 0.5, 0.8].forEach((f, i) => {
            const x = G.left + G.width * f + rnd(-12, 12);
            const h = G.height * 1.25;
            piece(`left:${x - 40}px; top:${G.top - G.height * 0.25}px; width:80px; height:${h}px;`
                + 'background:url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 80 400\' preserveAspectRatio=\'none\'><polyline points=\'40,0 26,80 56,150 24,230 54,300 34,360 44,400\' fill=\'none\' stroke=\'%23ffffff\' stroke-width=\'5\' stroke-linejoin=\'bevel\'/></svg>") center/100% 100% no-repeat;'
                + 'filter:drop-shadow(0 0 8px #8fd0ff) drop-shadow(0 0 20px #3a9bff);',
            [{ opacity: 0, transform: 'scaleY(0.3)', transformOrigin: 'top' }, { opacity: 1, transform: 'scaleY(1)', transformOrigin: 'top', offset: 0.2 }, { opacity: 0.2, offset: 0.4 }, { opacity: 1, offset: 0.5 }, { opacity: 0 }],
            { duration: 650, delay: i * 140 });
            sparks(x, G.top + G.height * 0.85, 10, { colors: ['#bfe3ff', '#fff', '#5aa8ff'], dist: 60, dur: 600, delay: 120 + i * 140, spread: Math.PI, angle: Math.PI });
            ring(x, G.top + G.height * 0.85, 120, '#8fd0ff', { dur: 500, delay: 120 + i * 140, width: 2 });
        });
    },
};

