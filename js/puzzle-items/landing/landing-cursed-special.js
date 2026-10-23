import { bar, cellRects, cellWave, glow, glyph, later, piece, pick, ring, rnd, shake, sparks, tint } from './landing-toolkit.js';

//------------------------------------------------------------------------
//-------------------LANDING EFFECTS: CURSED AND SPECIAL ITEMS------------
//------------------------------------------------------------------------
// What happens on the grid when the Cursed items, Chrono Fracture, the three
// Pearls, the Witch, the Golden Clock and the Shadow Seal land.

// A glyph that pops in, holds and fades.
const POP = [
    { transform: 'scale(0)', opacity: 0 },
    { transform: 'scale(1.25)', opacity: 1, offset: 0.2 },
    { transform: 'scale(1)', opacity: 1, offset: 0.75 },
    { transform: 'scale(1.15)', opacity: 0 },
];

// A dark vignette that closes in around the edges of the grid and fades.
function darkEdges(G, color, { dur = 1400, strength = 0.8 } = {}) {
    piece(`left:${G.left}px; top:${G.top}px; width:${G.width}px; height:${G.height}px; border-radius:4px; box-shadow:inset 0 0 70px 24px ${color};`,
        [{ opacity: 0 }, { opacity: strength, offset: 0.3 }, { opacity: 0 }], { duration: dur });
}

export const LANDING_CURSED_SPECIAL = {

    // Cursed Lens: a purple eye opens in the middle and stares; the edges darken.
    cursedReveal(G) {
        darkEdges(G, 'rgba(60,0,90,0.95)');
        const w = Math.min(G.width, G.height) * 0.7, h = w * 0.42;
        piece(`left:${G.cx - w / 2}px; top:${G.cy - h / 2}px; width:${w}px; height:${h}px; border-radius:50%/100%;`
            + 'background:radial-gradient(circle, #1a001f 0 22%, #c77dff 24% 46%, #f4e3ff 48%); border:3px solid #7a2cc0; box-shadow:0 0 30px #b04cff;',
        [{ transform: 'scaleY(0.05)', opacity: 0 }, { transform: 'scaleY(1)', opacity: 1, offset: 0.25 }, { transform: 'scaleY(1) translateX(10px)', offset: 0.45 }, { transform: 'scaleY(1) translateX(-10px)', offset: 0.65 }, { transform: 'scaleY(1)', opacity: 1, offset: 0.8 }, { transform: 'scaleY(0.05)', opacity: 0 }],
        { duration: 1500, easing: 'ease-in-out' });
        ring(G.cx, G.cy, w * 1.4, '#c77dff', { dur: 900, delay: 300 });
        sparks(G.cx, G.cy, 10, { colors: ['#c77dff', '#fff'], dist: w * 0.6, dur: 900, delay: 300, chars: ['·', '✦'], size: 8 });
    },

    // Cursed Clock: a black dial whose hands spin ever faster while red rings drain inward.
    cursedTime(G) {
        darkEdges(G, 'rgba(120,0,20,0.9)', { dur: 1600 });
        const size = Math.min(G.width, G.height) * 0.6;
        const face = piece(`left:${G.cx - size / 2}px; top:${G.cy - size / 2}px; width:${size}px; height:${size}px; border-radius:50%;`
            + 'background:radial-gradient(circle, #1b0509, #0a0204); border:5px solid #b3202e; box-shadow:0 0 30px #e0283c, inset 0 0 24px rgba(224,40,60,0.5);',
        [{ transform: 'scale(0.2) rotate(-60deg)', opacity: 0 }, { transform: 'scale(1) rotate(0deg)', opacity: 1, offset: 0.2 }, { transform: 'scale(1)', opacity: 1, offset: 0.85 }, { transform: 'scale(0.3)', opacity: 0 }],
        { duration: 1600 });
        const hand = (len, w, turns) => {
            const h = document.createElement('i');
            h.style.cssText = `position:absolute; left:50%; top:${50 - len}%; width:${w}px; height:${len}%; margin-left:${-w / 2}px; background:#ff4a5c; box-shadow:0 0 8px #ff2a40; transform-origin:50% 100%;`;
            face.appendChild(h);
            h.animate([{ transform: 'rotate(0deg)' }, { transform: `rotate(${turns * 360}deg)` }], { duration: 1200, delay: 150, easing: 'cubic-bezier(.6,0,1,1)', fill: 'forwards' });
        };
        hand(40, 3, 6); hand(28, 5, 1.5);
        for (let i = 0; i < 4; i++) ring(G.cx, G.cy, size * 1.7, '#ff2a40', { from: 1, to: 0.2, dur: 800, delay: i * 230, width: 2 });
        shake(4, 500);
    },

    // Demon Eye: a red slit-pupil eye with spikes, heartbeat pulses.
    cursedShield(G) {
        const w = Math.min(G.width, G.height) * 0.62, h = w * 0.55;
        for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2;
            piece(`left:${G.cx - 6}px; top:${G.cy - w * 0.62}px; width:12px; height:${w * 0.3}px; background:linear-gradient(180deg, #ff2a3c, transparent); clip-path:polygon(50% 0, 100% 100%, 0 100%); transform-origin:50% ${w * 0.62}px;`,
                [{ transform: `rotate(${a}rad) scaleY(0)`, opacity: 0 }, { transform: `rotate(${a}rad) scaleY(1)`, opacity: 1, offset: 0.3 }, { transform: `rotate(${a}rad) scaleY(1)`, opacity: 1, offset: 0.75 }, { opacity: 0 }],
                { duration: 1500, delay: 100 });
        }
        piece(`left:${G.cx - w / 2}px; top:${G.cy - h / 2}px; width:${w}px; height:${h}px; border-radius:50%/100%;`
            + 'background:radial-gradient(ellipse 12% 55% at 50% 50%, #000 0 80%, transparent 82%), radial-gradient(circle, #ff6a3c 0 40%, #b3001b 62%, #2a0006 100%); border:4px solid #5a0010; box-shadow:0 0 34px #ff1a35, inset 0 0 18px #ff1a35;',
        [{ transform: 'scale(0.1)', opacity: 0 }, { transform: 'scale(1.1)', opacity: 1, offset: 0.2 }, { transform: 'scale(1)', offset: 0.35 }, { transform: 'scale(1.12)', offset: 0.5 }, { transform: 'scale(1)', offset: 0.65 }, { transform: 'scale(1.05)', opacity: 1, offset: 0.85 }, { opacity: 0 }],
        { duration: 1500 });
        for (let i = 0; i < 3; i++) ring(G.cx, G.cy, w * 1.6, '#ff2a3c', { dur: 700, delay: 250 + i * 330, width: 4 });
        glow(G.cx, G.cy, G.width, 'rgba(255,30,60,0.7)', { dur: 1400 });
    },

    // Tidal Wave: a wall of dark water with foam sweeps across the whole grid.
    cursedRowSolve(G) {
        const wave = bar(G.left - G.width * 0.3, G.top - 20, G.width * 0.3, G.height + 40,
            'linear-gradient(90deg, transparent, rgba(10,60,120,0.85) 30%, rgba(20,120,190,0.9) 80%, #d9f5ff 96%, #fff)',
            [{ transform: 'translateX(0)', opacity: 1 }, { transform: `translateX(${G.width * 1.6}px)`, opacity: 1, offset: 0.9 }, { transform: `translateX(${G.width * 1.7}px)`, opacity: 0 }],
            { duration: 1300, easing: 'cubic-bezier(.5,0,.5,1)' }, 'box-shadow:0 0 30px #3aa8e8; border-radius:0 60px 60px 0 / 0 30px 30px 0;');
        void wave;
        cellWave(G, c => c.c, { step: Math.max(30, 650 / G.cols), hold: 800, paint: 'rgba(40,140,220,0.4)', glowColor: '#3aa8e8' });
        for (let i = 0; i < 26; i++) {
            const y = G.top + rnd(0, G.height), s = rnd(8, 18);
            piece(`left:${G.left - 40}px; top:${y}px; width:${s}px; height:${s}px; border-radius:50%; background:#eafaff; box-shadow:0 0 8px #9fe0ff;`,
                [{ transform: 'translate(0,0)', opacity: 0 }, { opacity: 1, offset: 0.2 }, { transform: `translate(${G.width * 1.25}px,${rnd(-60, 20)}px)`, opacity: 0 }],
                { duration: 1200, delay: rnd(0, 350), easing: 'ease-in' });
        }
        shake(4, 600);
    },

    // Vortex: a dark spiral turns and sucks sparks and debris into the middle.
    cursedColSolve(G) {
        const size = Math.max(G.width, G.height) * 1.1;
        piece(`left:${G.cx - size / 2}px; top:${G.cy - size / 2}px; width:${size}px; height:${size}px; border-radius:50%;`
            + 'background:repeating-conic-gradient(from 0deg, rgba(40,20,70,0.85) 0 18deg, rgba(120,70,190,0.55) 18deg 36deg);'
            + '-webkit-mask:radial-gradient(circle, transparent 4%, #000 14%, transparent 70%); mask:radial-gradient(circle, transparent 4%, #000 14%, transparent 70%);',
        [{ transform: 'rotate(0deg) scale(1.3)', opacity: 0 }, { transform: 'rotate(240deg) scale(1)', opacity: 1, offset: 0.3 }, { transform: 'rotate(900deg) scale(0.55)', opacity: 1, offset: 0.85 }, { transform: 'rotate(1100deg) scale(0.1)', opacity: 0 }],
        { duration: 1500, easing: 'cubic-bezier(.4,0,.6,1)' });
        for (let i = 0; i < 22; i++) {
            const r0 = size * rnd(0.3, 0.5), a0 = rnd(0, 360), s = rnd(4, 10);
            const holder = piece(`left:${G.cx}px; top:${G.cy}px; width:0; height:0;`, [{ transform: `rotate(${a0}deg)`, opacity: 0 }, { opacity: 1, offset: 0.2 }, { transform: `rotate(${a0 + 540}deg)`, opacity: 0 }],
                { duration: 1200, delay: rnd(0, 400), easing: 'ease-in' });
            const dot = document.createElement('i');
            dot.style.cssText = `position:absolute; left:${r0}px; top:0; width:${s}px; height:${s}px; border-radius:50%; background:${pick(['#b894ff', '#e7d8ff', '#7a4fd0'])}; box-shadow:0 0 8px #a070ff;`;
            holder.appendChild(dot);
            dot.animate([{ left: r0 + 'px' }, { left: '0px' }], { duration: 1200, easing: 'ease-in', fill: 'forwards' });
        }
        later(900, () => { glow(G.cx, G.cy, 120, 'rgba(255,255,255,0.9)', { dur: 500 }); ring(G.cx, G.cy, G.width * 0.5, '#b894ff', { dur: 600 }); });
    },

    // Chaos Grid: coloured explosions pop at random cells, the picture splits into RGB.
    cursedRowCol(G) {
        const cells = cellRects(G);
        const colors = ['#ff4040', '#ffa030', '#a050ff', '#3aa0ff', '#40e070', '#ff40a0'];
        for (let i = 0; i < 10; i++) {
            const c = pick(cells);
            if (!c) break;
            const x = c.x + c.w / 2, y = c.y + c.h / 2, col = colors[i % colors.length], d = rnd(0, 700);
            ring(x, y, c.w * 3, col, { dur: 500, delay: d, width: 3 });
            glow(x, y, c.w * 3.2, col, { dur: 600, delay: d });
            sparks(x, y, 9, { colors: [col, '#fff'], dist: c.w * 1.6, dur: 600, delay: d, chars: ['★', '✦', '▪'], size: 9 });
        }
        ['#ff0040', '#00ff80', '#2040ff'].forEach((col, i) => tint(G, col, { alpha: 0.28, dur: 900, delay: 100 + i * 70, blend: 'screen' }));
        piece(`left:${G.left}px; top:${G.top}px; width:${G.width}px; height:${G.height}px; background:repeating-linear-gradient(0deg, rgba(255,255,255,0.12) 0 2px, transparent 2px 7px);`,
            [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 0 }], { duration: 900 });
        shake(8, 650);
    },

    // Chrono Fracture: the moment cracks - glass lines radiate, shards fall away.
    chronoFracture(G) {
        glow(G.cx, G.cy, G.width * 0.8, 'rgba(180,240,255,0.95)', { dur: 500 });
        for (let i = 0; i < 9; i++) {
            const a = (i / 9) * 360 + rnd(-10, 10), len = G.reach * rnd(0.4, 0.62);
            piece(`left:${G.cx}px; top:${G.cy - 1}px; width:${len}px; height:2px; background:linear-gradient(90deg, #fff, rgba(150,230,255,0.9) 60%, transparent); box-shadow:0 0 8px #8fe0ff; transform-origin:0 50%;`,
                [{ transform: `rotate(${a}deg) scaleX(0)`, opacity: 1 }, { transform: `rotate(${a}deg) scaleX(1)`, opacity: 1, offset: 0.25 }, { transform: `rotate(${a}deg) scaleX(1)`, opacity: 1, offset: 0.6 }, { opacity: 0 }],
                { duration: 1200, easing: 'ease-out' });
        }
        glyph('🕰️', G.cx, G.cy, 48, [{ transform: 'scale(1)', opacity: 0 }, { opacity: 1, offset: 0.2 }, { transform: 'scale(1.05) rotate(4deg)', opacity: 1, offset: 0.5 }, { transform: 'scale(1.3) rotate(-8deg)', opacity: 0 }], { duration: 1000 });
        later(550, () => {
            shake(6, 300);
            for (let i = 0; i < 18; i++) {
                const s = rnd(18, 46), x = G.cx + rnd(-G.width * 0.4, G.width * 0.4), y = G.cy + rnd(-G.height * 0.4, G.height * 0.4);
                piece(`left:${x}px; top:${y}px; width:${s}px; height:${s}px; background:linear-gradient(135deg, rgba(255,255,255,0.7), rgba(120,210,255,0.35)); clip-path:polygon(${rnd(0, 40)}% 0, 100% ${rnd(10, 50)}%, ${rnd(50, 100)}% 100%, 0 ${rnd(50, 100)}%); border:1px solid #fff;`,
                    [{ transform: 'translate(0,0) rotate(0deg)', opacity: 1 }, { transform: `translate(${rnd(-30, 30)}px,${G.height * rnd(0.3, 0.8)}px) rotate(${rnd(-200, 200)}deg)`, opacity: 0 }],
                    { duration: 900, easing: 'ease-in' });
            }
        });
    },

    // Pearl of Haste: a blue pearl with quick water ripples and speed lines.
    pearlOfHaste(G) {
        glyph('🔵', G.cx, G.cy, 48, POP, { duration: 1100 }).style.filter = 'drop-shadow(0 0 16px #5a8cff)';
        for (let i = 0; i < 5; i++) ring(G.cx, G.cy, G.width * 0.9, '#7aa2ff', { dur: 600, delay: i * 130, width: 3 });
        for (let i = 0; i < 12; i++) {
            const y = G.top + rnd(0, G.height), len = rnd(60, 160);
            bar(G.left - len, y, len, 2, 'linear-gradient(90deg, transparent, #9fc0ff, #fff)',
                [{ transform: 'translateX(0)', opacity: 0 }, { opacity: 1, offset: 0.2 }, { transform: `translateX(${G.width + len * 2}px)`, opacity: 0 }],
                { duration: 650, delay: 150 + rnd(0, 450), easing: 'ease-in' }, 'box-shadow:0 0 6px #5a8cff;');
        }
    },

    // Pearl of Swiftness: a violet pearl trailing spiral arms of light.
    pearlOfSwiftness(G) {
        glyph('🟣', G.cx, G.cy, 48, POP, { duration: 1200 }).style.filter = 'drop-shadow(0 0 16px #b45aff)';
        const size = G.width * 0.95;
        for (let arm = 0; arm < 3; arm++) {
            piece(`left:${G.cx - size / 2}px; top:${G.cy - size / 2}px; width:${size}px; height:${size}px; border-radius:50%;`
                + `background:conic-gradient(from ${arm * 120}deg, rgba(190,110,255,0) 0deg, rgba(190,110,255,0.7) 55deg, rgba(190,110,255,0) 56deg);`
                + '-webkit-mask:radial-gradient(circle, transparent 10%, #000 30%, transparent 72%); mask:radial-gradient(circle, transparent 10%, #000 30%, transparent 72%);',
            [{ transform: 'rotate(0deg) scale(0.3)', opacity: 0 }, { transform: 'rotate(240deg) scale(1)', opacity: 1, offset: 0.4 }, { transform: 'rotate(520deg) scale(1.15)', opacity: 0 }],
            { duration: 1200, easing: 'ease-out' });
        }
        sparks(G.cx, G.cy, 14, { colors: ['#d9a8ff', '#fff'], dist: size * 0.5, dur: 900, delay: 200, chars: ['✧', '·'], size: 9 });
    },

    // Grand Pearl: a radiant white bloom with an iridescent rainbow ring.
    grandPearl(G) {
        glow(G.cx, G.cy, G.width * 1.2, 'rgba(255,255,255,0.95)', { dur: 1400 });
        const size = Math.min(G.width, G.height) * 0.8;
        piece(`left:${G.cx - size / 2}px; top:${G.cy - size / 2}px; width:${size}px; height:${size}px; border-radius:50%;`
            + 'background:conic-gradient(#ff8aa8, #ffd27a, #b8ff8a, #7affe0, #8ab4ff, #d28aff, #ff8aa8);'
            + '-webkit-mask:radial-gradient(circle, transparent 60%, #000 64%, #000 76%, transparent 80%); mask:radial-gradient(circle, transparent 60%, #000 64%, #000 76%, transparent 80%);',
        [{ transform: 'rotate(0deg) scale(0.2)', opacity: 0 }, { transform: 'rotate(120deg) scale(1)', opacity: 1, offset: 0.35 }, { transform: 'rotate(280deg) scale(1.2)', opacity: 0 }],
        { duration: 1500, easing: 'ease-out' });
        glyph('⚪', G.cx, G.cy, 56, POP, { duration: 1300 }).style.filter = 'drop-shadow(0 0 22px #fff)';
        sparks(G.cx, G.cy, 20, { colors: ['#fff', '#ffe6f2', '#e6f4ff'], dist: G.width * 0.55, dur: 1200, delay: 250, chars: ['✦', '✧', '·'], size: 10 });
        tint(G, '#ffffff', { alpha: 0.3, dur: 900, delay: 100, blend: 'screen' });
    },

    // The Witch: a magic circle flares, smoke billows up and bats fly out.
    theWitch(G) {
        const size = Math.min(G.width, G.height) * 0.85;
        piece(`left:${G.cx - size / 2}px; top:${G.cy - size / 2}px; width:${size}px; height:${size}px; border-radius:50%;`
            + 'border:3px solid #b45aff; box-shadow:0 0 26px #9b3dff, inset 0 0 26px rgba(155,61,255,0.5);'
            + 'background:repeating-conic-gradient(from 0deg, rgba(180,90,255,0.3) 0 3deg, transparent 3deg 36deg);',
        [{ transform: 'rotate(0deg) scale(0.2)', opacity: 0 }, { transform: 'rotate(-90deg) scale(1)', opacity: 1, offset: 0.25 }, { transform: 'rotate(-250deg) scale(1)', opacity: 1, offset: 0.8 }, { opacity: 0 }],
        { duration: 1700 });
        glyph('🧙', G.cx, G.cy, 60, [
            { transform: 'translateY(30px) scale(0)', opacity: 0 }, { transform: 'translateY(0) scale(1.2)', opacity: 1, offset: 0.25 }, { transform: 'translateY(0) scale(1)', opacity: 1, offset: 0.8 }, { transform: 'translateY(-20px) scale(0.8)', opacity: 0 }], { duration: 1500 });
        for (let i = 0; i < 14; i++) {
            const s = rnd(40, 90);
            piece(`left:${G.cx + rnd(-size * 0.3, size * 0.3) - s / 2}px; top:${G.cy + size * 0.2}px; width:${s}px; height:${s}px; border-radius:50%; background:radial-gradient(circle, rgba(150,70,220,0.6), rgba(80,20,140,0) 70%); filter:blur(5px);`,
                [{ transform: 'translateY(0) scale(0.4)', opacity: 0 }, { opacity: 0.9, offset: 0.3 }, { transform: `translateY(${-G.height * rnd(0.5, 0.9)}px) scale(1.5)`, opacity: 0 }],
                { duration: 1400, delay: rnd(0, 500), easing: 'ease-out' });
        }
        for (let i = 0; i < 6; i++) {
            glyph('🦇', G.cx, G.cy, 22, [
                { transform: 'translate(0,0) scale(0.4)', opacity: 0 },
                { opacity: 1, offset: 0.15 },
                { transform: `translate(${rnd(-G.width, G.width) * 0.6}px,${-rnd(G.height * 0.3, G.height * 0.7)}px) scale(1.1)`, opacity: 0 },
            ], { duration: 1200, delay: 300 + i * 110, easing: 'ease-out' });
        }
    },

    // Golden Clock: a gold dial chimes three times, coins rain over a golden wash.
    goldenClock(G) {
        const size = Math.min(G.width, G.height) * 0.55;
        const face = piece(`left:${G.cx - size / 2}px; top:${G.cy - size / 2}px; width:${size}px; height:${size}px; border-radius:50%;`
            + 'background:radial-gradient(circle, #fff6c8 0 50%, #f5c542 100%); border:6px solid #d99a1c; box-shadow:0 0 32px #ffd24a, inset 0 0 18px rgba(255,255,255,0.6);',
        [{ transform: 'scale(0.2)', opacity: 0 }, { transform: 'scale(1.1)', opacity: 1, offset: 0.2 }, { transform: 'scale(1)', opacity: 1, offset: 0.85 }, { transform: 'scale(1.2)', opacity: 0 }],
        { duration: 1700, easing: 'ease-out' });
        for (let i = 0; i < 12; i++) {
            const t = document.createElement('i');
            t.style.cssText = `position:absolute; left:50%; top:0; width:3px; height:${i % 3 === 0 ? 14 : 8}px; margin-left:-1.5px; background:#8a5a0a; transform-origin:50% ${size / 2 - 6}px; transform:rotate(${i * 30}deg);`;
            face.appendChild(t);
        }
        const hand = document.createElement('i');
        hand.style.cssText = 'position:absolute; left:50%; top:14%; width:4px; height:36%; margin-left:-2px; background:#6b4206; transform-origin:50% 100%;';
        face.appendChild(hand);
        hand.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 900, delay: 150, easing: 'ease-in-out', fill: 'forwards' });
        for (let i = 0; i < 3; i++) ring(G.cx, G.cy, size * 2.2, '#ffd24a', { dur: 700, delay: 500 + i * 300, width: 4 });
        tint(G, '#ffd24a', { alpha: 0.35, dur: 1400, blend: 'screen' });
        for (let i = 0; i < 20; i++) {
            glyph('🪙', G.left + rnd(0, G.width), G.top - 10, rnd(13, 20), [
                { transform: 'translateY(0) rotateY(0deg)', opacity: 0 },
                { opacity: 1, offset: 0.1 },
                { transform: `translateY(${G.height * rnd(0.6, 1)}px) rotateY(${rnd(360, 900)}deg)`, opacity: 0 },
            ], { duration: 1300, delay: 500 + rnd(0, 600), easing: 'ease-in' });
        }
    },

    // Shadow Seal: a black sigil blooms, tendrils of shadow creep out and swallow the cells.
    shadowSeal(G) {
        darkEdges(G, 'rgba(10,0,20,0.98)', { dur: 1800, strength: 1 });
        cellWave(G, c => Math.hypot(c.r - G.rows / 2, c.c - G.cols / 2), { step: 80, hold: 900, paint: 'rgba(8,0,18,0.7)' });
        const size = Math.min(G.width, G.height) * 0.7;
        piece(`left:${G.cx - size / 2}px; top:${G.cy - size / 2}px; width:${size}px; height:${size}px; border-radius:50%;`
            + 'background:radial-gradient(circle, #000 0 40%, #1a0030 70%); border:3px solid #6a22b8; box-shadow:0 0 30px #4a0a8a, inset 0 0 26px #8a3ae8;'
            + 'outline:2px dashed #8a3ae8; outline-offset:8px;',
        [{ transform: 'scale(0.1) rotate(0deg)', opacity: 0 }, { transform: 'scale(1) rotate(160deg)', opacity: 1, offset: 0.3 }, { transform: 'scale(1) rotate(420deg)', opacity: 1, offset: 0.8 }, { transform: 'scale(1.2) rotate(500deg)', opacity: 0 }],
        { duration: 1800, easing: 'ease-out' });
        glyph('☠', G.cx, G.cy, 44, POP, { duration: 1500, delay: 250 }, 'color:#c8a0ff; text-shadow:0 0 14px #8a3ae8;');
        for (let i = 0; i < 12; i++) {
            const a = (i / 12) * 360 + rnd(-8, 8), len = G.reach * rnd(0.35, 0.6);
            piece(`left:${G.cx}px; top:${G.cy - 5}px; width:${len}px; height:10px; background:linear-gradient(90deg, #000, rgba(40,0,80,0.8) 70%, transparent); clip-path:polygon(0 30%, 100% 50%, 0 70%); transform-origin:0 50%;`,
                [{ transform: `rotate(${a}deg) scaleX(0)`, opacity: 1 }, { transform: `rotate(${a}deg) scaleX(1)`, opacity: 1, offset: 0.45 }, { transform: `rotate(${a}deg) scaleX(1)`, opacity: 1, offset: 0.7 }, { opacity: 0 }],
                { duration: 1500, delay: 200, easing: 'ease-out' });
        }
    },
};
