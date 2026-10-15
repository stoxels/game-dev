//------------------------------------------------------------------------
//-------------------BOSS RIG ANIMATIONS (ability cues)-------------------------
//------------------------------------------------------------------------
// Cosmetic only. When a boss mechanic fires, boss-framework.js dispatches
// an 'eg-boss-mechanic' event; for the bosses listed in RIGS this module
// swaps the boss card's flat art for a small canvas that plays a skeletal
// animation (arms raise, wings flap, shockwaves...) and then puts the
// original <img> back. Nothing here touches combat state, timing or damage,
// and every failure path degrades to "no animation".
//
// Art: images/endgame/monsters/rigs/<boss>/<part>.webp, cut from the normal
// boss art by dev/scratch/rigger/cut_ingame.py (authoring demo: boss.html).
// Pose numbers below are in the units of the large source art (px); each
// rig's S converts them to the 512px in-game art.
//------------------------------------------------------------------------

const RIG_DIR = 'images/endgame/monsters/rigs/';

const RIGS = {
    boss_mech: {
        S: 0.418, ox: 2, oy: 106,
        parts: [
            { n: 'legL', x: 157, y: 310, px: 218.1, py: 317.1, par: 'torso' },
            { n: 'legR', x: 288, y: 313, px: 333.5, py: 317.1, par: 'torso' },
            { n: 'torso', x: 170, y: 125, px: 275.8, py: 315.0, par: null },
            { n: 'pauldronL', x: 109, y: 122, px: 189.3, py: 216.1, par: 'torso' },
            { n: 'pauldronR', x: 313, y: 125, px: 362.3, py: 216.1, par: 'torso' },
            { n: 'fistL', x: 12, y: 225, px: 185.2, py: 271.8, par: 'torso' },
            { n: 'fistR', x: 353, y: 221, px: 352.0, py: 271.8, par: 'torso' },
        ],
        // mechanic name -> animation + length (ms); the charge anim releases
        // at 82% of its length, so it is stretched to land on the blast.
        mechanics: {
            self_destruct: { anim: 'charge', ms: (p) => ([0, 3200, 2800, 2400][p] || 3000) / 0.82 },
            soul_tithe: { anim: 'slam', ms: () => 1500 },
        },
    },
    boss_abyss: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 45, y: 100, px: 267, py: 330, par: null },
            { n: 'clawArm', x: 364, y: 188, px: 385, py: 295, par: 'body' },
            { n: 'staffArm', x: 8, y: 93, px: 150, py: 295, par: 'body' },
        ],
        mechanics: {
            fading_light: { anim: 'darkfall', ms: () => 2400 },
            frozen_cells: { anim: 'frostclaw', ms: () => 1800 },
        },
    },
    boss_aegis: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 142, y: 114, px: 260, py: 330, par: null },
            { n: 'hammerArm', x: 50, y: 229, px: 175, py: 238, par: 'body' },
            { n: 'shield', x: 357, y: 150, px: 366, py: 262, par: 'body' },
        ],
        mechanics: {
            aegis_protocol: { anim: 'bulwark', ms: () => 2200 },
            shield_charge: { anim: 'shieldrush', ms: () => 1500 },
            sentry_shields: { anim: 'sentry', ms: () => 1900 },
            guard_rotor: { anim: 'rotor', ms: () => 2200 },
        },
    },
    boss_arbiter: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 143, y: 105, px: 262, py: 340, par: null },
            { n: 'staff', x: 12, y: 134, px: 140, py: 288, par: 'body' },
            { n: 'scales', x: 305, y: 161, px: 405, py: 180, par: 'body' },
        ],
        mechanics: {
            stillness_trial: { anim: 'verdict', ms: () => 2400 },
            fated_cell: { anim: 'fate', ms: () => 1900 },
            probability_shift: { anim: 'dieshift', ms: () => 1600 },
        },
    },
    boss_architect: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 153, y: 118, px: 275, py: 330, par: null },
            { n: 'compassArm', x: 6, y: 123, px: 180, py: 265, par: 'body' },
            { n: 'blueprintArm', x: 305, y: 225, px: 400, py: 255, par: 'body' },
        ],
        mechanics: {
            sinking_platforms: { anim: 'platforms', ms: () => 2200 },
            probability_shift: { anim: 'blueprintshift', ms: () => 1700 },
        },
    },
    // >>> rig boss_barricade
    boss_barricade: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 66, y: 63, px: 255, py: 300, par: null },
            { n: 'leftArm', x: 8, y: 113, px: 130, py: 150, par: 'body' },
            { n: 'rightArm', x: 383, y: 130, px: 435, py: 150, par: 'body' },
        ],
        mechanics: {
            bullet_walls: { anim: 'bcd_walls', ms: () => 2400 },
            soul_tithe: { anim: 'bcd_tithe', ms: () => 2400 },
        },
    },
    // <<< rig boss_barricade
    // >>> rig boss_barrage
    boss_barrage: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 220, y: 87, px: 340, py: 330, par: null },
            { n: 'gatling', x: 98, y: 206, px: 240, py: 290, par: 'body' },
            { n: 'clawArm', x: 417, y: 267, px: 445, py: 285, par: 'body' },
            { n: 'shells', x: 3, y: 96, px: 215, py: 250, par: 'body' },
        ],
        mechanics: {
            shelling_curtain: { anim: 'bar_curtain', ms: () => 2400 },
            corrupt_cells: { anim: 'bar_corrupt', ms: () => 2000 },
            supply_drop: { anim: 'bar_supply', ms: () => 2200 },
            shot_shells: { anim: 'bar_shells', ms: () => 2000 },
        },
    },
    // <<< rig boss_barrage
    // >>> rig boss_bayes
    boss_bayes: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 110, y: 16, px: 250, py: 330, par: null },
            { n: 'capeL', x: 26, y: 331, px: 100, py: 340, par: 'body' },
            { n: 'staff', x: 8, y: 22, px: 95, py: 265, par: 'body' },
            { n: 'orb', x: 348, y: 99, px: 375, py: 300, par: 'body' },
        ],
        mechanics: {
            posterior_bolts: { anim: 'bay_bolts', ms: () => 2200 },
            prior_bomb: { anim: 'bay_bomb', ms: () => 1800 },
            evidence_wisps: { anim: 'bay_wisps', ms: () => 2400 },
            belief_veil: { anim: 'bay_veil', ms: () => 2600 },
        },
    },
    // <<< rig boss_bayes
    boss_guardian: {
        S: 0.382, ox: 1, oy: 115,
        parts: [
            { n: 'wingL', x: 3, y: 136, px: 174.2, py: 229.9, par: 'body' },
            { n: 'wingR', x: 341, y: 137, px: 337.8, py: 229.9, par: 'body' },
            { n: 'body', x: 128, y: 148, px: 256.2, py: 275.0, par: null },
            { n: 'dice', x: 157, y: 115, px: 256.2, py: 158.4, par: 'body' },
        ],
        mechanics: {
            lock_on: { anim: 'nova', ms: () => 2200 },
            clue_scramble: { anim: 'flap', ms: () => 1600 },
        },
    },
};

const ease = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

// ---- poses (pose objects: rot deg, dx/dy source-art px, sc scale) --------
const POSES = {
    slam(P, u) {
        let h;
        if (u < 0.4) h = ease(u / 0.4); else if (u < 0.5) h = 1 - Math.pow((u - 0.4) / 0.1, 2); else h = 0;
        const pulse = u >= 0.5 ? Math.max(0, 1 - (u - 0.5) * 4) : 0;
        P.fistL.rot = 62 * h; P.fistR.rot = -62 * h; P.fistL.dy = -14 * h; P.fistR.dy = -14 * h;
        P.fistL.sc = P.fistR.sc = 1 + 0.2 * pulse + 0.05 * h;
        P.pauldronL.rot = 7 * h; P.pauldronR.rot = -7 * h;
        P.torso.rot = -3 * h + 1.5 * pulse; P.torso.dy = -12 * h + 18 * pulse;
        P.legL.dy = P.legR.dy = 6 * pulse;
    },
    charge(P, u) {
        const g = ease(u / 0.7), pl = Math.sin(u * 38) * 0.5 + 0.5;
        P.torso.sc = 1 + 0.035 * g * pl; P.torso.dy = -4 * g;
        P.fistL.rot = 16 * g; P.fistR.rot = -16 * g;
        P.fistL.dx = Math.sin(u * 70) * 3 * g; P.fistR.dx = -Math.sin(u * 70) * 3 * g;
        P.legL.dy = P.legR.dy = 4 * g; P.pauldronL.rot = 4 * g; P.pauldronR.rot = -4 * g;
    },
    nova(P, u) {
        const c = ease(u / 0.62), rel = u > 0.62 ? Math.exp(-(u - 0.62) * 6) : 0, fl = Math.sin(u * 55) * 0.5 + 0.5;
        if (u < 0.66) {
            P.body.dy = -26 * c + Math.sin(u * 50) * 2 * c;
            P.wingL.rot = 32 * c + fl * 5 * c; P.wingR.rot = -32 * c - fl * 5 * c;
            P.dice.dy = -22 * c; P.dice.sc = 1 + 0.09 * c; P.dice.rot = Math.sin(u * 40) * 4 * c;
        } else {
            P.body.dy = -26 * rel + 10 * (1 - rel) * Math.exp(-(u - 0.66) * 3);
            P.wingL.rot = 32 * rel - 18 * (1 - rel) * Math.exp(-(u - 0.66) * 4); P.wingR.rot = -P.wingL.rot;
            P.dice.dy = -22 * rel; P.dice.sc = 1 + 0.09 * rel;
        }
    },
    flap(P, u) {
        const g = ease(Math.min(u / 0.25, 1, (1 - u) / 0.2));
        P.body.dy = -14 * g + Math.sin(u * 30) * 3 * g;
        P.wingL.rot = Math.sin(u * 70) * 26 * g + 8 * g; P.wingR.rot = -Math.sin(u * 70) * 26 * g - 8 * g;
        P.dice.rot = Math.sin(u * 45) * 9 * g; P.dice.dy = Math.sin(u * 55) * 8 * g;
    },
};

// ---- effects, drawn in source-art space on top of the parts ---------------
const FX = {
    slam(ctx, u) {
        if (u < 0.5) return 0;
        const v = (u - 0.5) / 0.5;
        for (let i = 0; i < 3; i++) {
            const r = v - i * 0.12; if (r <= 0) continue;
            ctx.strokeStyle = 'rgba(255,235,190,' + (0.7 * (1 - r)) + ')'; ctx.lineWidth = 14 * (1 - r) + 2;
            ctx.beginPath(); ctx.ellipse(610, 690, 60 + r * 620, 18 + r * 120, 0, 0, 7); ctx.stroke();
        }
        for (let i = 0; i < 14; i++) {
            const a = i * 0.9 + 1, d = v * (180 + (i % 5) * 40), y = 690 - Math.sin(v * 3) * 60 * (1 + (i % 3) * 0.3);
            ctx.fillStyle = 'rgba(190,170,140,' + (0.6 * (1 - v)) + ')'; ctx.beginPath();
            ctx.arc(610 + Math.cos(a) * d * (i % 2 ? 1 : -1), y - Math.abs(Math.sin(a)) * 30, 8 + (i % 4) * 4 * (1 - v), 0, 7); ctx.fill();
        }
        return 0;
    },
    charge(ctx, u, dy) {
        const g = ease(u / 0.7), pl = Math.sin(u * 38) * 0.5 + 0.5;
        const gr = ctx.createRadialGradient(640, 160 + dy, 10, 640, 160 + dy, 170 + 60 * pl);
        gr.addColorStop(0, 'rgba(180,255,150,' + (0.8 * g) + ')'); gr.addColorStop(1, 'rgba(120,255,120,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(640, 160 + dy, 230, 0, 7); ctx.fill();
        for (let i = 0; i < 26; i++) {
            const ph = ((u * 1.4 + i / 26) % 1), ang = i * 2.399, rr = (1 - ph) * 520 * Math.min(1, g * 1.4);
            ctx.fillStyle = 'rgba(190,255,170,' + (g * ph) + ')'; ctx.beginPath();
            ctx.arc(650 + Math.cos(ang) * rr, 300 + dy + Math.sin(ang) * rr * 0.7, 5 + 6 * ph, 0, 7); ctx.fill();
        }
        if (u > 0.82) {
            const v = (u - 0.82) / 0.18;
            ctx.strokeStyle = 'rgba(210,255,190,' + (1 - v) + ')'; ctx.lineWidth = 26 * (1 - v) + 3;
            ctx.beginPath(); ctx.arc(650, 300 + dy, 60 + v * 620, 0, 7); ctx.stroke();
            return 0.45 * (1 - v);
        }
        return 0;
    },
    nova(ctx, u, dy) {
        const ex = 694, ey = 300 + dy, c = ease(u / 0.62), fl = Math.sin(u * 55) * 0.5 + 0.5;
        if (u < 0.66) {
            const gr = ctx.createRadialGradient(ex, ey, 5, ex, ey, 90 + 170 * c);
            gr.addColorStop(0, 'rgba(200,255,255,' + (0.95 * c) + ')'); gr.addColorStop(1, 'rgba(40,220,255,0)');
            ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(ex, ey, 90 + 170 * c + fl * 20, 0, 7); ctx.fill();
            for (let i = 0; i < 30; i++) {
                const ph = ((u * 1.6 + i / 30) % 1), ang = i * 2.399, rr = (1 - ph) * 600 * Math.min(1, c * 1.5);
                ctx.fillStyle = 'rgba(150,240,255,' + (c * ph) + ')'; ctx.beginPath();
                ctx.arc(ex + Math.cos(ang) * rr, ey + Math.sin(ang) * rr * 0.8, 4 + 6 * ph, 0, 7); ctx.fill();
            }
            return 0;
        }
        const v = (u - 0.66) / 0.34;
        for (let i = 0; i < 3; i++) {
            const r = v - i * 0.1; if (r <= 0) continue;
            ctx.strokeStyle = 'rgba(190,250,255,' + (0.9 * (1 - r)) + ')'; ctx.lineWidth = 30 * (1 - r) + 3;
            ctx.beginPath(); ctx.arc(ex, ey, 40 + r * 1100, 0, 7); ctx.stroke();
        }
        return 0.55 * Math.max(0, 1 - v * 2.5);
    },
    flap(ctx, u) {
        const g = ease(Math.min(u / 0.25, 1, (1 - u) / 0.2));
        for (let i = 0; i < 10; i++) {
            const ph = ((u * 2 + i / 10) % 1), side = i % 2 ? 1 : -1;
            ctx.strokeStyle = 'rgba(190,240,255,' + (0.5 * g * (1 - ph)) + ')'; ctx.lineWidth = 5;
            ctx.beginPath(); ctx.moveTo(668 + side * (330 + ph * 380), 200 + ph * 260);
            ctx.lineTo(668 + side * (380 + ph * 470), 240 + ph * 300); ctx.stroke();
        }
        return 0;
    },
};

// ---- The Abyss -------------------------------------------------------------
// Fading Light: the Abyss raises its staff and inhales the light (motes spiral
// into its mouth, eyes flare), then exhales a wave of darkness.
// Frozen Cells: the clawed hand rises, then snaps down in a freezing slash.
Object.assign(POSES, {
    darkfall(P, u) {
        const c = ease(u / 0.55), rel = u > 0.6 ? Math.exp(-(u - 0.6) * 5) : 0;
        const exhale = u > 0.58 ? Math.sin(Math.min(1, (u - 0.58) / 0.25) * Math.PI) : 0;
        P.body.sc = 1 - 0.04 * c * (u < 0.58 ? 1 : 0) + 0.07 * exhale;
        P.body.dy = 2 * c - 4 * exhale;
        const hold = u < 0.62 ? 1 : rel / Math.exp(-0.02 * 5);   // staff stays up, then drops back
        P.staffArm.rot = 24 * c * hold + Math.sin(u * 45) * 1.5 * c;
        P.staffArm.dy = -8 * c * hold;
        P.clawArm.rot = -8 * c * hold;
    },
    frostclaw(P, u) {
        const g = ease(u / 0.5), slash = ease((u - 0.5) / 0.12), back = ease((u - 0.62) / 0.38);
        const rot = u < 0.5 ? -26 * g : (u < 0.62 ? -26 + 40 * slash : 14 * (1 - back));
        P.clawArm.rot = rot + (u < 0.5 ? Math.sin(u * 60) * 1.2 * g : 0);
        P.body.rot = u < 0.5 ? -2 * g : -2 + 4 * slash * (1 - back);
        P.body.dx = u < 0.5 ? -3 * g : -3 + 8 * slash * (1 - back);
        P.body.sc = 1 + 0.04 * slash * (1 - back);
        P.staffArm.rot = 4 * g * (1 - back);
    },
});
Object.assign(FX, {
    darkfall(ctx, u) {
        const c = ease(u / 0.55);
        // light motes streaming into the mouth
        if (u < 0.6) {
            for (let i = 0; i < 28; i++) {
                const ph = ((u * 1.5 + i / 28) % 1), ang = i * 2.399, rr = (1 - ph) * 300 * Math.min(1, c * 1.6);
                ctx.fillStyle = 'rgba(220,205,255,' + (c * ph * 0.9) + ')'; ctx.beginPath();
                ctx.arc(267 + Math.cos(ang) * rr, 262 + Math.sin(ang) * rr * 0.7, 2 + 3 * ph, 0, 7); ctx.fill();
            }
        }
        // eyes flare
        [[230, 207], [307, 207]].forEach((e) => {
            const g = ctx.createRadialGradient(e[0], e[1], 2, e[0], e[1], 14 + 34 * c);
            g.addColorStop(0, 'rgba(190,170,255,' + (0.9 * c) + ')'); g.addColorStop(1, 'rgba(120,90,255,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(e[0], e[1], 14 + 34 * c, 0, 7); ctx.fill();
        });
        // darkness wells out of the body after the exhale
        if (u > 0.58) {
            const v = Math.min(1, (u - 0.58) / 0.42), r = 60 + v * 330;
            const g = ctx.createRadialGradient(267, 240, r * 0.3, 267, 240, r);
            g.addColorStop(0, 'rgba(8,4,18,' + (0.55 * (1 - v)) + ')'); g.addColorStop(1, 'rgba(8,4,18,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(267, 240, r, 0, 7); ctx.fill();
            ctx.strokeStyle = 'rgba(150,110,255,' + (0.8 * (1 - v)) + ')'; ctx.lineWidth = 8 * (1 - v) + 1;
            ctx.beginPath(); ctx.arc(267, 240, 40 + v * 300, 0, 7); ctx.stroke();
        }
        return 0;
    },
    frostclaw(ctx, u) {
        const g = ease(u / 0.5);
        // frost gathering round the claw while it rises
        if (u < 0.62) {
            const gr = ctx.createRadialGradient(448, 215, 3, 448, 215, 20 + 50 * g);
            gr.addColorStop(0, 'rgba(210,245,255,' + (0.85 * g) + ')'); gr.addColorStop(1, 'rgba(120,200,255,0)');
            ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(448, 215, 20 + 50 * g, 0, 7); ctx.fill();
            for (let i = 0; i < 14; i++) {
                const a = i * 0.9 + u * 6, r = 14 + 40 * g * (0.5 + 0.5 * ((i * 37) % 10) / 10);
                ctx.fillStyle = 'rgba(225,248,255,' + (0.8 * g) + ')'; ctx.beginPath();
                ctx.arc(448 + Math.cos(a) * r, 215 + Math.sin(a) * r, 2 + (i % 3), 0, 7); ctx.fill();
            }
        }
        // the slash: ice shards fan out and a frost ring spreads along the floor
        if (u >= 0.5) {
            const v = Math.min(1, (u - 0.5) / 0.5);
            for (let i = 0; i < 7; i++) {
                const a = -2.6 + i * 0.32, len = 20 + v * (120 + (i % 3) * 30);
                const x = 448 + Math.cos(a) * 20, y = 230 + Math.sin(a) * 20 + v * 40;
                ctx.strokeStyle = 'rgba(200,240,255,' + (0.9 * (1 - v)) + ')'; ctx.lineWidth = 5 * (1 - v) + 1;
                ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a + 0.5) * -len * 0.6 + 0, y - Math.sin(a) * len * 0.5 + len * 0.8); ctx.stroke();
            }
            ctx.strokeStyle = 'rgba(170,225,255,' + (0.7 * (1 - v)) + ')'; ctx.lineWidth = 8 * (1 - v) + 1;
            ctx.beginPath(); ctx.ellipse(267, 405, 30 + v * 250, 8 + v * 40, 0, 0, 7); ctx.stroke();
            return 0.3 * Math.max(0, 1 - v * 3);
        }
        return 0;
    },
});

// ---- The Aegis -------------------------------------------------------------
// Aegis Protocol: shield and hammer go up, a ward bubble forms and the guard
//   squad rises from the floor.   Shield Charge: dig in, then lunge.
// Sentry Shields: hammer slam launches two homing orbs.   Guard Rotor: the
//   hammer sweeps while two orbs orbit and tether a radar beam.
Object.assign(POSES, {
    bulwark(P, u) {
        const g = ease(u / 0.35) * (1 - ease((u - 0.85) / 0.15)), pl = Math.sin(u * 20);
        P.shield.dy = -12 * g; P.shield.sc = 1 + 0.05 * g; P.shield.rot = -4 * g;
        P.hammerArm.rot = -20 * g; P.hammerArm.dy = -8 * g;
        P.body.dy = -3 * g; P.body.sc = 1 + 0.015 * pl * g;
    },
    shieldrush(P, u) {
        const back = ease(u / 0.35), l = ease((u - 0.35) / 0.25), r = ease((u - 0.6) / 0.4);
        let dx, rot;
        if (u < 0.35) { dx = 8 * back; rot = -3 * back; }
        else if (u < 0.6) { dx = 8 - 44 * l; rot = -3 + 12 * l; }
        else { dx = -36 * (1 - r); rot = 9 * (1 - r); }
        P.body.dx = dx; P.body.rot = rot;
        P.shield.sc = 1 + 0.16 * l * (1 - r); P.shield.dx = -8 * l * (1 - r);
        P.hammerArm.rot = 8 * back * (1 - l) - 6 * l * (1 - r);
    },
    sentry(P, u) {
        const g = ease(u / 0.4), s = ease((u - 0.4) / 0.1), r = ease((u - 0.5) / 0.5);
        let arm, lean;
        if (u < 0.4) { arm = -34 * g; lean = -2 * g; }
        else if (u < 0.5) { arm = -34 + 46 * s; lean = -2 + 4 * s; }
        else { arm = 12 * (1 - r); lean = 2 * (1 - r); }
        P.hammerArm.rot = arm; P.hammerArm.dy = u < 0.4 ? -10 * g : -10 * (1 - s);
        P.body.rot = lean; P.body.dy = 6 * s * (1 - r);
        P.shield.rot = 2 * s * (1 - r);
    },
    rotor(P, u) {
        const env = ease(Math.min(u / 0.2, 1, (1 - u) / 0.2)), w = Math.sin(u * Math.PI * 3);
        P.hammerArm.rot = 50 * w * env; P.hammerArm.dy = -6 * Math.abs(w) * env;
        P.body.rot = -4 * w * env; P.body.dy = -2 * Math.abs(w) * env;
        P.shield.rot = 3 * w * env;
    },
});
Object.assign(FX, {
    bulwark(ctx, u) {
        const g = ease(u / 0.35) * (1 - ease((u - 0.85) / 0.15)), pl = 0.7 + 0.3 * Math.sin(u * 22);
        const sg = ctx.createRadialGradient(428, 262, 5, 428, 262, 60 + 30 * pl);
        sg.addColorStop(0, 'rgba(120,240,255,' + (0.75 * g) + ')'); sg.addColorStop(1, 'rgba(60,200,255,0)');
        ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(428, 262, 60 + 30 * pl, 0, 7); ctx.fill();
        // ward bubble around the whole boss
        ctx.strokeStyle = 'rgba(140,235,255,' + (0.55 * g * pl) + ')'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.ellipse(265, 260, 200, 150, 0, 0, 7); ctx.stroke();
        ctx.fillStyle = 'rgba(100,220,255,' + (0.1 * g) + ')'; ctx.fill();
        // guard squad rising from the floor
        for (let i = 0; i < 3; i++) {
            const ring = u * 1.6 - i * 0.25;
            if (ring > 0 && ring < 1) {
                ctx.strokeStyle = 'rgba(140,235,255,' + (0.8 * (1 - ring)) + ')'; ctx.lineWidth = 5;
                ctx.beginPath(); ctx.ellipse(265, 392, 40 + ring * 220, 10 + ring * 40, 0, 0, 7); ctx.stroke();
            }
        }
        if (u > 0.45) {
            const k = ease((u - 0.45) / 0.3) * (1 - ease((u - 0.9) / 0.1));
            [[130, 392], [400, 396], [265, 405]].forEach((p) => {
                ctx.fillStyle = 'rgba(150,235,255,' + (0.85 * k) + ')'; ctx.beginPath();
                ctx.arc(p[0], p[1] - 24 * k, 13 * k, 0, 7); ctx.fill();
                ctx.fillRect(p[0] - 8 * k, p[1] - 24 * k + 6, 16 * k, 22 * k);
            });
        }
        return 0;
    },
    shieldrush(ctx, u) {
        const l = ease((u - 0.35) / 0.25), r = ease((u - 0.6) / 0.4), a = l * (1 - r);
        if (u > 0.2 && u < 0.45) {   // digging in: dust kicks up behind the heels
            const k = (u - 0.2) / 0.25;
            for (let i = 0; i < 6; i++) {
                ctx.fillStyle = 'rgba(200,190,170,' + (0.5 * (1 - k)) + ')'; ctx.beginPath();
                ctx.arc(330 + i * 12 + k * 20, 392 - k * 18 - (i % 3) * 6, 7 + 5 * k, 0, 7); ctx.fill();
            }
        }
        for (let i = 0; i < 7; i++) {   // speed streaks trailing behind the lunge
            const y = 170 + i * 36, len = 90 + (i % 3) * 40;
            ctx.strokeStyle = 'rgba(225,240,255,' + (0.95 * a) + ')'; ctx.lineWidth = 6;
            ctx.beginPath(); ctx.moveTo(380 + (i % 2) * 20, y); ctx.lineTo(380 + len + (i % 2) * 20, y); ctx.stroke();
        }
        if (u > 0.6) {   // stone shards where the charge finishes
            const k = (u - 0.6) / 0.4;
            for (let i = 0; i < 8; i++) {
                const ang = -Math.PI * (0.15 + 0.7 * i / 8);
                ctx.fillStyle = 'rgba(190,190,200,' + (0.8 * (1 - k)) + ')'; ctx.beginPath();
                ctx.arc(240 - Math.cos(ang) * k * 90, 392 + Math.sin(ang) * k * 70, 4, 0, 7); ctx.fill();
            }
        }
        return 0;
    },
    sentry(ctx, u) {
        if (u < 0.4) {   // shield charges while the hammer is up
            const g = ease(u / 0.4);
            const sg = ctx.createRadialGradient(428, 262, 5, 428, 262, 70);
            sg.addColorStop(0, 'rgba(120,240,255,' + (0.6 * g) + ')'); sg.addColorStop(1, 'rgba(60,200,255,0)');
            ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(428, 262, 70, 0, 7); ctx.fill();
            return 0;
        }
        const v = Math.min(1, (u - 0.45) / 0.55);
        if (u > 0.42) {
            const k = Math.min(1, (u - 0.42) / 0.5);
            ctx.strokeStyle = 'rgba(210,230,255,' + (0.7 * (1 - k)) + ')'; ctx.lineWidth = 8 * (1 - k) + 1;
            ctx.beginPath(); ctx.ellipse(96, 376, 20 + k * 140, 6 + k * 24, 0, 0, 7); ctx.stroke();
        }
        if (u > 0.45) {   // two orbs fly out from the sentry shields
            [[96, 330, -1], [428, 262, 1]].forEach((o) => {
                const x = o[0] + o[2] * v * 190, y = o[1] - v * 150;
                for (let t = 0; t < 6; t++) {
                    const tv = Math.max(0, v - t * 0.04);
                    ctx.fillStyle = 'rgba(120,235,255,' + (0.5 * (1 - t / 6)) + ')'; ctx.beginPath();
                    ctx.arc(o[0] + o[2] * tv * 190, o[1] - tv * 150, 11 - t, 0, 7); ctx.fill();
                }
                const g = ctx.createRadialGradient(x, y, 2, x, y, 24);
                g.addColorStop(0, 'rgba(230,255,255,0.95)'); g.addColorStop(1, 'rgba(80,210,255,0)');
                ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 24, 0, 7); ctx.fill();
            });
        }
        return 0;
    },
    rotor(ctx, u) {
        const env = ease(Math.min(u / 0.2, 1, (1 - u) / 0.2)), a = u * 16;
        const cx = 265, cy = 262, R = 170, ry = 0.55;
        const ax = cx + Math.cos(a) * R, ay = cy + Math.sin(a) * R * ry, bx = cx - Math.cos(a) * R, by = cy - Math.sin(a) * R * ry;
        for (let t = 1; t <= 6; t++) {   // fading sweep trail
            const a0 = a - t * 0.18;
            ctx.strokeStyle = 'rgba(110,230,255,' + (0.35 * env * (1 - t / 7)) + ')'; ctx.lineWidth = 7;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(a0) * R, cy + Math.sin(a0) * R * ry); ctx.lineTo(cx - Math.cos(a0) * R, cy - Math.sin(a0) * R * ry);
            ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(210,255,255,' + (0.9 * env) + ')'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
        [[ax, ay], [bx, by]].forEach((o) => {
            const g = ctx.createRadialGradient(o[0], o[1], 2, o[0], o[1], 26);
            g.addColorStop(0, 'rgba(235,255,255,' + env + ')'); g.addColorStop(1, 'rgba(80,210,255,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(o[0], o[1], 26, 0, 7); ctx.fill();
        });
        return 0;
    },
});


// ---- The Arbiter -----------------------------------------------------------
// Stillness Trial: staff and scales rise, a BLUE judgment wave rolls out, then
//   an ORANGE one (blue = do not move, orange = keep moving).
// Fated Cell: the staff points, a doom-clock ring closes in on its crystal.
// Probability Shift: the scales lurch and the dice jump between the pans.
Object.assign(POSES, {
    verdict(P, u) {
        const g = ease(Math.min(u / 0.2, 1, (1 - u) / 0.15));
        const sway = Math.sin(u * Math.PI * 4) * 8 * g;
        P.staff.rot = -14 * g; P.staff.dy = -6 * g;
        P.scales.rot = sway; P.scales.dy = -4 * g;
        P.body.dy = -2 * g; P.body.sc = 1 + 0.012 * g;
    },
    fate(P, u) {
        const g = ease(u / 0.3) * (1 - ease((u - 0.85) / 0.15));
        P.staff.rot = -20 * g + Math.sin(u * 40) * 1.2 * g; P.staff.dy = -8 * g;
        P.body.rot = -2 * g; P.body.dx = -3 * g;
        P.scales.rot = 3 * g;
    },
    dieshift(P, u) {
        const env = ease(Math.min(u / 0.1, 1, (1 - u) / 0.2));
        const w = Math.sin(u * Math.PI * 6);
        P.scales.rot = 16 * w * env; P.scales.dy = -6 * Math.abs(w) * env;
        P.body.dy = -2 * Math.abs(w) * env; P.body.rot = 1.5 * w * env;
        P.staff.rot = 4 * -w * env;
    },
});
Object.assign(FX, {
    verdict(ctx, u) {
        const g = ease(Math.min(u / 0.2, 1, (1 - u) / 0.15));
        // crystal charges at the top of the staff
        const cg = ctx.createRadialGradient(85, 195, 4, 85, 195, 70);
        cg.addColorStop(0, 'rgba(180,240,255,' + (0.7 * g) + ')'); cg.addColorStop(1, 'rgba(80,170,255,0)');
        ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(85, 195, 70, 0, 7); ctx.fill();
        // first the blue wave (do not move), then the orange wave (keep moving)
        [[0.15, 0.55, '80,160,255'], [0.5, 0.92, '255,160,60']].forEach((w) => {
            if (u < w[0] || u > w[1]) return;
            const v = (u - w[0]) / (w[1] - w[0]);
            for (let i = 0; i < 2; i++) {
                const r = v - i * 0.15; if (r <= 0) continue;
                ctx.strokeStyle = 'rgba(' + w[2] + ',' + (0.85 * (1 - r)) + ')'; ctx.lineWidth = 14 * (1 - r) + 2;
                ctx.beginPath(); ctx.ellipse(262, 300, 40 + r * 330, 20 + r * 170, 0, 0, 7); ctx.stroke();
            }
            const eg = ctx.createRadialGradient(252, 205, 2, 252, 205, 40);
            eg.addColorStop(0, 'rgba(' + w[2] + ',0.9)'); eg.addColorStop(1, 'rgba(' + w[2] + ',0)');
            ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(252, 205, 40, 0, 7); ctx.fill();
        });
        // the two judgment colours shown on the pans while the scales sway
        ctx.fillStyle = 'rgba(80,160,255,' + (0.5 * g) + ')'; ctx.beginPath(); ctx.arc(350, 262, 22, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(255,160,60,' + (0.5 * g) + ')'; ctx.beginPath(); ctx.arc(450, 296, 22, 0, 7); ctx.fill();
        return 0;
    },
    fate(ctx, u) {
        const g = ease(u / 0.3) * (1 - ease((u - 0.85) / 0.15));
        const cx = 85, cy = 195;
        const cg = ctx.createRadialGradient(cx, cy, 4, cx, cy, 80);
        cg.addColorStop(0, 'rgba(255,180,180,' + (0.8 * g) + ')'); cg.addColorStop(1, 'rgba(255,60,90,0)');
        ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, 80, 0, 7); ctx.fill();
        // doom clock: a ring that burns down around the crystal
        const left = Math.max(0, 1 - (u - 0.25) / 0.65);
        ctx.strokeStyle = 'rgba(255,90,110,' + (0.9 * g) + ')'; ctx.lineWidth = 9;
        ctx.beginPath(); ctx.arc(cx, cy, 70, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 * g) + ')'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, cy, 82, 0, 7); ctx.stroke();
        // the fated mark appears out in front of the boss
        if (u > 0.3) {
            const k = ease((u - 0.3) / 0.2) * (1 - ease((u - 0.9) / 0.1)), mx = 300, my = 420;
            ctx.strokeStyle = 'rgba(255,90,110,' + (0.9 * k) + ')'; ctx.lineWidth = 5;
            ctx.beginPath(); ctx.arc(mx, my, 28 * k, 0, 7); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(mx - 40 * k, my); ctx.lineTo(mx + 40 * k, my);
            ctx.moveTo(mx, my - 40 * k); ctx.lineTo(mx, my + 40 * k); ctx.stroke();
        }
        return 0;
    },
    dieshift(ctx, u) {
        const env = ease(Math.min(u / 0.1, 1, (1 - u) / 0.2));
        // dice jumping from one pan to the other
        for (let i = 0; i < 5; i++) {
            const ph = ((u * 3 + i * 0.2) % 1), dir = i % 2 ? 1 : -1;
            const t = dir > 0 ? ph : 1 - ph;
            const x = 350 + t * 100, y = 262 + t * 36 - Math.sin(t * Math.PI) * 70;
            ctx.save(); ctx.translate(x, y); ctx.rotate(ph * 12 + i);
            ctx.fillStyle = 'rgba(245,245,255,' + (0.95 * env) + ')'; ctx.fillRect(-8, -8, 16, 16);
            ctx.fillStyle = 'rgba(40,50,90,' + env + ')'; ctx.fillRect(-3, -3, 4, 4);
            ctx.restore();
        }
        // glitch bars where the marks flicker
        for (let i = 0; i < 6; i++) {
            if (((u * 14 + i * 0.37) % 1) > 0.4) continue;
            ctx.fillStyle = 'rgba(120,220,255,' + (0.5 * env) + ')';
            ctx.fillRect(150 + ((i * 97) % 230), 150 + ((i * 53) % 220), 60 + (i % 3) * 30, 4);
        }
        return 0.18 * env * (Math.sin(u * 50) > 0.7 ? 1 : 0);
    },
});


// ---- The Architect ---------------------------------------------------------
// Sinking Platforms: the compass is thrust up, the blueprints lift, then the
//   fist stamps down - four floor tiles light up, one sinks and another rises.
// Probability Shift: the blueprints flutter as marks vanish and reappear.
Object.assign(POSES, {
    platforms(P, u) {
        const up = ease(u / 0.35), stamp = ease((u - 0.45) / 0.08), rec = ease((u - 0.55) / 0.45);
        const raise = u < 0.45 ? up : 1 - stamp;
        P.compassArm.rot = -22 * raise * (1 - rec * (u > 0.55 ? 1 : 0));
        P.compassArm.dy = -12 * raise * (1 - rec * (u > 0.55 ? 1 : 0));
        P.blueprintArm.rot = 16 * raise * (1 - rec * (u > 0.55 ? 1 : 0));
        P.blueprintArm.dy = -14 * raise * (1 - rec * (u > 0.55 ? 1 : 0));
        const hit = u > 0.5 ? Math.max(0, 1 - (u - 0.5) * 4) : 0;
        P.body.dy = -4 * raise + 8 * hit;
        P.body.sc = 1 + 0.02 * hit;
    },
    blueprintshift(P, u) {
        const env = ease(Math.min(u / 0.12, 1, (1 - u) / 0.2)), w = Math.sin(u * Math.PI * 7);
        P.blueprintArm.rot = 9 * w * env; P.blueprintArm.dy = -5 * Math.abs(w) * env;
        P.compassArm.rot = -5 * w * env; P.compassArm.dy = 3 * w * env;
        P.body.dy = -2 * Math.abs(w) * env; P.body.rot = 1.2 * w * env;
    },
});
Object.assign(FX, {
    platforms(ctx, u) {
        // compass needle glow while the arm is up
        const raise = u < 0.45 ? ease(u / 0.35) : 1 - ease((u - 0.45) / 0.08);
        const cg = ctx.createRadialGradient(85, 190, 4, 85, 190, 90);
        cg.addColorStop(0, 'rgba(120,255,240,' + (0.65 * raise) + ')'); cg.addColorStop(1, 'rgba(60,200,230,0)');
        ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(85, 190, 90, 0, 7); ctx.fill();
        // four floor tiles light up (isometric diamonds); one sinks, one rises elsewhere
        const tiles = [[110, 400], [270, 432], [430, 410], [330, 395]];
        const show = ease((u - 0.1) / 0.25);
        tiles.forEach((t, i) => {
            let a = show, s = 1;
            if (i === 1 && u > 0.5) { const k = ease((u - 0.5) / 0.4); s = 1 - 0.85 * k; a = show * (1 - k); }
            if (i === 3 && u > 0.55) { const k = ease((u - 0.55) / 0.4); s = 0.15 + 0.85 * k; a = show * (0.3 + 0.7 * k); }
            if (i === 3 && u <= 0.55) { s = 0.15; a = show * 0.3; }
            ctx.fillStyle = 'rgba(80,200,210,' + (0.28 * a) + ')'; ctx.strokeStyle = 'rgba(150,255,245,' + (0.85 * a) + ')'; ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(t[0], t[1] - 26 * s); ctx.lineTo(t[0] + 60 * s, t[1]); ctx.lineTo(t[0], t[1] + 26 * s); ctx.lineTo(t[0] - 60 * s, t[1]);
            ctx.closePath(); ctx.fill(); ctx.stroke();
        });
        // stamp shock
        if (u > 0.5) {
            const k = Math.min(1, (u - 0.5) / 0.45);
            ctx.strokeStyle = 'rgba(200,255,250,' + (0.8 * (1 - k)) + ')'; ctx.lineWidth = 8 * (1 - k) + 1;
            ctx.beginPath(); ctx.ellipse(400, 380, 20 + k * 200, 6 + k * 50, 0, 0, 7); ctx.stroke();
        }
        return 0;
    },
    blueprintshift(ctx, u) {
        const env = ease(Math.min(u / 0.12, 1, (1 - u) / 0.2));
        // marks (crosses) fade out in one place and blink back in another
        for (let i = 0; i < 4; i++) {
            const ph = ((u * 2 + i * 0.25) % 1);
            const ax = 320 + i * 40, ay = 150 + (i % 2) * 40, bx = 120 + i * 50, by = 420 - (i % 2) * 30;
            const out = 1 - ease(ph / 0.4), inn = ease((ph - 0.5) / 0.3);
            ctx.strokeStyle = 'rgba(255,230,120,' + (0.9 * out * env) + ')'; ctx.lineWidth = 8;
            ctx.beginPath(); ctx.moveTo(ax - 17, ay - 17); ctx.lineTo(ax + 17, ay + 17); ctx.moveTo(ax + 17, ay - 17); ctx.lineTo(ax - 17, ay + 17); ctx.stroke();
            ctx.strokeStyle = 'rgba(120,255,240,' + (0.9 * inn * env) + ')';
            ctx.beginPath(); ctx.moveTo(bx - 17, by - 17); ctx.lineTo(bx + 17, by + 17); ctx.moveTo(bx + 17, by - 17); ctx.lineTo(bx - 17, by + 17); ctx.stroke();
        }
        for (let i = 0; i < 5; i++) {
            if (((u * 12 + i * 0.41) % 1) > 0.35) continue;
            ctx.fillStyle = 'rgba(120,255,240,' + (0.5 * env) + ')';
            ctx.fillRect(330 + ((i * 53) % 150), 230 + ((i * 41) % 110), 40 + (i % 3) * 20, 4);
        }
        return 0;
    },
});

// >>> poses boss_barricade
// ---- The Barricade ---------------------------------------------------------
// Bullet Walls: both arms heave up, then slam down; rows of shot fall with a
//   drifting gap.
// Soul Tithe: arms sweep wide, souls stream into the chest and a violet
//   shield dome forms.
Object.assign(POSES, {
    bcd_walls(P, u) {
        const up = ease(u / 0.3), slam = ease((u - 0.38) / 0.1), rec = ease((u - 0.6) / 0.4);
        let k = u < 0.38 ? up : 1 - slam;
        if (u > 0.48) k = -0.25 * (1 - rec);
        P.leftArm.rot = 38 * k; P.leftArm.dy = -16 * k;
        P.rightArm.rot = -38 * k; P.rightArm.dy = -16 * k;
        const hit = u > 0.48 ? Math.max(0, 1 - (u - 0.48) * 4) : 0;
        P.body.dy = -5 * up * (u < 0.38 ? 1 : 0) + 8 * hit;
    },
    bcd_tithe(P, u) {
        const env = ease(Math.min(u / 0.2, 1, (1 - u) / 0.2)), w = Math.sin(u * Math.PI * 6);
        P.leftArm.rot = (30 + 8 * w) * env; P.leftArm.dy = -8 * env;
        P.rightArm.rot = (-30 - 8 * w) * env; P.rightArm.dy = -8 * env;
        P.body.dy = -3 * env + 2 * w * env;
        P.body.rot = 1.5 * w * env;
    },
});
Object.assign(FX, {
    bcd_walls(ctx, u) {
        // two rows of shot fall; each has a gap that drifts sideways
        for (let r = 0; r < 2; r++) {
            const t = (u - 0.4 - r * 0.18) / 0.55;
            if (t <= 0 || t >= 1) continue;
            const y = -20 + t * 540, gap = 120 + 150 * r + Math.sin(t * 4 + r) * 70 + t * 40 * (r ? -1 : 1);
            const a = Math.min(1, t * 6) * (1 - Math.max(0, (t - 0.85) / 0.15));
            for (let x = 0; x < 512; x += 36) {
                if (x + 32 > gap && x < gap + 110) continue;
                ctx.fillStyle = 'rgba(255,140,30,' + (0.9 * a) + ')'; ctx.fillRect(x + 2, y, 30, 30);
                ctx.strokeStyle = 'rgba(255,240,170,' + a + ')'; ctx.lineWidth = 3; ctx.strokeRect(x + 2, y, 30, 30);
            }
        }
        // slam shock
        if (u > 0.48 && u < 0.8) {
            const k = (u - 0.48) / 0.32;
            ctx.strokeStyle = 'rgba(255,200,100,' + (0.8 * (1 - k)) + ')'; ctx.lineWidth = 8 * (1 - k) + 1;
            ctx.beginPath(); ctx.ellipse(256, 430, 40 + k * 260, 10 + k * 40, 0, 0, 7); ctx.stroke();
        }
        return 0;
    },
    bcd_tithe(ctx, u) {
        const env = ease(Math.min(u / 0.25, 1, (1 - u) / 0.2));
        // violet shield dome
        const g = ctx.createRadialGradient(256, 290, 120, 256, 290, 250);
        g.addColorStop(0, 'rgba(170,80,255,0)'); g.addColorStop(1, 'rgba(170,80,255,' + (0.45 * env) + ')');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(256, 290, 250, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(210,150,255,' + (0.8 * env) + ')'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(256, 290, 250, 0, 7); ctx.stroke();
        // souls spiral inward to the chest
        for (let i = 0; i < 9; i++) {
            const ph = (u * 2.2 + i / 9) % 1, ang = i * 0.7 + ph * 2.5, r = 260 * (1 - ph);
            const x = 256 + Math.cos(ang) * r * 1.2, y = 260 + Math.sin(ang) * r * 0.8;
            ctx.fillStyle = 'rgba(190,255,230,' + (0.9 * env * Math.min(1, ph * 4)) + ')';
            ctx.beginPath(); ctx.arc(x, y, 9 * (1 - ph * 0.5), 0, 7); ctx.fill();
        }
        return 0.12 * Math.max(0, Math.sin(u * Math.PI * 6)) * env;
    },
});
// <<< poses boss_barricade

// >>> poses boss_barrage
// ---- The Barrage -----------------------------------------------------------
// Shelling Curtain: gatling hoisted skyward, pumps; a wall of shells rains across.
// Corrupt Cells: gatling aims at the floor, claw slams; floor tiles corrupt.
// Supply Drop: claw signals up, gatling tilts to the sky; a crate parachutes in.
// Shot Shells: gatling fires in recoiling bursts; shells burst into shrapnel.
Object.assign(POSES, {
    bar_curtain(P, u) {
        const up = ease(u / 0.25), dn = ease((u - 0.8) / 0.2), k = up * (1 - dn);
        const pump = Math.sin(u * Math.PI * 10) * (u > 0.25 && u < 0.8 ? 1 : 0);
        P.gatling.rot = 30 * k + 5 * pump; P.gatling.dy = -8 * k; P.gatling.dx = 4 * pump;
        P.clawArm.rot = -22 * k; P.clawArm.dy = -6 * k;
        P.shells.rot = -8 * k + 3 * pump; P.shells.dy = -6 * k;
        P.body.dy = 2 * Math.abs(pump) * 0.6; P.body.rot = -1.5 * k;
    },
    bar_corrupt(P, u) {
        const aim = ease(u / 0.25), slam = ease((u - 0.5) / 0.1), rec = ease((u - 0.75) / 0.25);
        const k = aim * (1 - rec);
        P.gatling.rot = -22 * k; P.gatling.dy = 6 * k;
        const raise = u < 0.5 ? ease(u / 0.4) : 1 - slam;
        const r = u < 0.5 ? raise : raise * (1 - rec);
        P.clawArm.rot = -38 * r + 18 * (u > 0.55 ? (1 - rec) * slam : 0);
        P.clawArm.dy = -14 * r;
        const hit = u > 0.55 ? Math.max(0, 1 - (u - 0.55) * 4) : 0;
        P.body.dy = 9 * hit - 3 * r; P.shells.rot = 4 * Math.sin(u * 30) * k;
    },
    bar_supply(P, u) {
        const up = ease(u / 0.25), dn = ease((u - 0.75) / 0.25), k = up * (1 - dn);
        const wave = Math.sin(u * Math.PI * 8) * k;
        P.clawArm.rot = -42 * k + 10 * wave; P.clawArm.dy = -18 * k;
        P.gatling.rot = 24 * k; P.gatling.dy = -5 * k;
        P.shells.rot = 6 * wave; P.shells.dy = -4 * k;
        P.body.rot = 2 * wave; P.body.dy = -3 * k;
    },
    bar_shells(P, u) {
        const env = ease(Math.min(u / 0.1, 1, (1 - u) / 0.15));
        const burst = Math.max(0, Math.sin(u * Math.PI * 8));
        const f = Math.pow(burst, 2) * env;
        P.gatling.rot = 8 * env - 16 * f; P.gatling.dx = 12 * f; P.gatling.dy = 5 * f;
        P.shells.rot = -6 * f; P.shells.dx = 4 * f;
        P.clawArm.rot = 8 * f - 5 * env; P.clawArm.dy = 2 * f;
        P.body.dx = 3 * f; P.body.rot = 1.5 * f; P.body.dy = -2 * f;
    },
});
Object.assign(FX, {
    bar_curtain(ctx, u) {
        const env = ease(Math.min(u / 0.12, 1, (1 - u) / 0.12));
        // advancing wall of falling shells, sweeping left -> right, with a gap
        const front = -40 + u * 640, gap = 330;
        for (let i = 0; i < 22; i++) {
            const x = front - i * 22;
            if (x < -20 || x > 560 || Math.abs(x - gap) < 55) continue;
            const ph = ((u * 3 + i * 0.37) % 1), y = -30 + ph * 470;
            const a = env * (1 - i / 26);
            ctx.strokeStyle = 'rgba(255,150,40,' + (0.55 * a) + ')'; ctx.lineWidth = 5;
            ctx.beginPath(); ctx.moveTo(x - 6, y - 50); ctx.lineTo(x, y); ctx.stroke();
            ctx.fillStyle = 'rgba(255,230,120,' + a + ')';
            ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fill();
            if (ph > 0.88) {
                const g = (ph - 0.88) / 0.12;
                ctx.strokeStyle = 'rgba(255,120,30,' + (0.8 * a * (1 - g)) + ')'; ctx.lineWidth = 4;
                ctx.beginPath(); ctx.ellipse(x, 440, 8 + g * 26, 4 + g * 10, 0, 0, 7); ctx.stroke();
            }
        }
        // muzzle glow while the gun is hoisted
        const gl = ctx.createRadialGradient(110, 205, 3, 110, 205, 60);
        gl.addColorStop(0, 'rgba(255,170,60,' + (0.7 * env) + ')'); gl.addColorStop(1, 'rgba(255,100,20,0)');
        ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(110, 205, 60, 0, 7); ctx.fill();
        return 0;
    },
    bar_corrupt(ctx, u) {
        const env = ease(Math.min(u / 0.2, 1, (1 - u) / 0.15));
        // aim beam from the muzzle to the floor
        const aim = ease(u / 0.3);
        ctx.strokeStyle = 'rgba(190,80,255,' + (0.7 * aim * env) + ')'; ctx.lineWidth = 6;
        ctx.setLineDash([14, 10]); ctx.beginPath(); ctx.moveTo(105, 300); ctx.lineTo(60 + aim * 90, 300 + aim * 130); ctx.stroke(); ctx.setLineDash([]);
        // floor grid tiles corrupting one after another
        for (let i = 0; i < 12; i++) {
            const cx = 70 + (i % 4) * 110 + (Math.floor(i / 4) % 2) * 25, cy = 380 + Math.floor(i / 4) * 24;
            const t = ease((u - 0.2 - i * 0.04) / 0.2);
            const fl = (Math.sin(u * 40 + i * 2) * 0.5 + 0.5);
            ctx.fillStyle = 'rgba(' + (120 + 60 * fl | 0) + ',40,220,' + (0.45 * t * env) + ')';
            ctx.strokeStyle = 'rgba(230,140,255,' + (0.9 * t * env) + ')'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(cx, cy - 11); ctx.lineTo(cx + 40, cy); ctx.lineTo(cx, cy + 11); ctx.lineTo(cx - 40, cy); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        // slam shock
        if (u > 0.55) {
            const k = Math.min(1, (u - 0.55) / 0.4);
            ctx.strokeStyle = 'rgba(210,130,255,' + (0.8 * (1 - k)) + ')'; ctx.lineWidth = 7 * (1 - k) + 1;
            ctx.beginPath(); ctx.ellipse(455, 405, 20 + k * 180, 6 + k * 40, 0, 0, 7); ctx.stroke();
        }
        return u > 0.55 && u < 0.62 ? 0.25 * (1 - (u - 0.55) / 0.07) : 0;
    },
    bar_supply(ctx, u) {
        const env = ease(Math.min(u / 0.1, 1, (1 - u) / 0.12));
        // signal flare above the claw
        const fl = ease(u / 0.25) * env;
        const g = ctx.createRadialGradient(470, 200, 2, 470, 200, 60);
        g.addColorStop(0, 'rgba(255,230,120,' + (0.8 * fl) + ')'); g.addColorStop(1, 'rgba(255,160,40,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(470, 200, 60, 0, 7); ctx.fill();
        // crate parachutes in: lands at (340,430)
        const t = ease((u - 0.2) / 0.5), cx = 340 + 30 * (1 - t), cy = -60 + t * 480;
        if (u > 0.2) {
            const land = u > 0.7 ? 1 : 0;
            if (!land) {
                ctx.strokeStyle = 'rgba(230,230,200,0.8)'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(cx - 34, cy - 70); ctx.lineTo(cx - 18, cy); ctx.moveTo(cx + 34, cy - 70); ctx.lineTo(cx + 18, cy); ctx.stroke();
                ctx.fillStyle = 'rgba(220,70,50,0.9)'; ctx.beginPath(); ctx.ellipse(cx, cy - 74, 44, 22, 0, Math.PI, 0); ctx.fill();
            }
            ctx.fillStyle = '#8a5a2a'; ctx.fillRect(cx - 20, cy - 4, 40, 34);
            ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 3; ctx.strokeRect(cx - 20, cy - 4, 40, 34);
            ctx.beginPath(); ctx.moveTo(cx - 20, cy - 4); ctx.lineTo(cx + 20, cy + 30); ctx.moveTo(cx + 20, cy - 4); ctx.lineTo(cx - 20, cy + 30); ctx.stroke();
        }
        if (u > 0.7) {
            const k = Math.min(1, (u - 0.7) / 0.3);
            ctx.strokeStyle = 'rgba(255,220,150,' + (0.8 * (1 - k)) + ')'; ctx.lineWidth = 6 * (1 - k) + 1;
            ctx.beginPath(); ctx.ellipse(340, 430, 20 + k * 130, 6 + k * 26, 0, 0, 7); ctx.stroke();
        }
        return u > 0.7 && u < 0.76 ? 0.22 * (1 - (u - 0.7) / 0.06) : 0;
    },
    bar_shells(ctx, u) {
        const env = ease(Math.min(u / 0.1, 1, (1 - u) / 0.15));
        const burst = Math.max(0, Math.sin(u * Math.PI * 8));
        // muzzle flash
        const f = Math.pow(burst, 2) * env;
        const g = ctx.createRadialGradient(100, 225, 2, 100, 225, 70);
        g.addColorStop(0, 'rgba(255,240,160,' + (0.9 * f) + ')'); g.addColorStop(0.5, 'rgba(255,150,40,' + (0.5 * f) + ')'); g.addColorStop(1, 'rgba(255,80,20,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(100, 225, 70, 0, 7); ctx.fill();
        // shells fly out and burst into shrapnel spokes
        for (let i = 0; i < 3; i++) {
            const ph = (u * 2 + i / 3) % 1;
            const sx = 90 - ph * 60, sy = 225 + ph * ph * 190 - ph * 40;
            if (ph < 0.6) {
                ctx.fillStyle = 'rgba(255,220,100,' + env + ')'; ctx.beginPath(); ctx.arc(sx, sy, 8, 0, 7); ctx.fill();
            } else {
                const k = (ph - 0.6) / 0.4, bx = 90 - 0.6 * 60 - 20 * i, by = 225 + 0.36 * 190 - 24 + 60;
                ctx.strokeStyle = 'rgba(255,170,50,' + (0.9 * (1 - k) * env) + ')'; ctx.lineWidth = 4;
                ctx.beginPath(); ctx.ellipse(bx, by, 14 + k * 50, 8 + k * 24, 0, 0, 7); ctx.stroke();
                for (let s = 0; s < 6; s++) {
                    const an = s * Math.PI / 3 + i;
                    ctx.fillStyle = 'rgba(255,200,80,' + (0.9 * (1 - k) * env) + ')';
                    ctx.beginPath(); ctx.arc(bx + Math.cos(an) * k * 70, by + Math.sin(an) * k * 42, 4, 0, 7); ctx.fill();
                }
            }
        }
        return 0;
    },
});
// <<< poses boss_barrage

// >>> poses boss_bayes
// ---- Bayes -----------------------------------------------------------------
// Posterior Bolts: the staff is thrust up and charges, then slams down; lightning
//   columns crash onto one side (the favoured belief).
// Prior Bomb: the orb hand lobs a fuse-lit bomb in an arc to the floor.
// Evidence Wisps: the staff sweeps side to side, releasing drifting wisps.
// Belief Veil: both arms rise, a shimmering violet veil drapes over the scene.
Object.assign(POSES, {
    bay_bolts(P, u) {
        const up = ease(u / 0.4), slam = ease((u - 0.5) / 0.1), rec = ease((u - 0.65) / 0.35);
        const k = u < 0.5 ? up : 1 - slam;
        P.staff.rot = (-30 * k + 18 * slam) * (1 - rec);
        P.staff.dy = -14 * k * (1 - rec);
        P.orb.rot = 14 * up * (1 - rec);
        P.orb.dy = -10 * up * (1 - rec);
        P.body.dy = (-3 * up + 5 * slam) * (1 - rec);
        P.capeL.rot = -4 * up * (1 - rec);
    },
    bay_bomb(P, u) {
        const wind = ease(u / 0.3), toss = ease((u - 0.3) / 0.12), rec = ease((u - 0.55) / 0.45);
        P.orb.rot = (28 * wind - 62 * toss) * (1 - rec);
        P.orb.dy = (6 * wind - 18 * toss) * (1 - rec);
        P.orb.dx = (-8 * wind + 10 * toss) * (1 - rec);
        P.body.rot = (-2 * wind + 3 * toss) * (1 - rec);
        P.staff.rot = 6 * toss * (1 - rec);
    },
    bay_wisps(P, u) {
        const env = ease(Math.min(u / 0.12, 1, (1 - u) / 0.15)), w = Math.sin(u * Math.PI * 4);
        P.staff.rot = 24 * w * env;
        P.staff.dx = 6 * w * env;
        P.orb.rot = -8 * Math.sin(u * Math.PI * 4 + 1.2) * env;
        P.orb.dy = -6 * Math.abs(w) * env;
        P.capeL.rot = -5 * w * env;
        P.body.rot = 1.5 * w * env;
    },
    bay_veil(P, u) {
        const up = ease(u / 0.35), rec = ease((u - 0.75) / 0.25), k = up * (1 - rec);
        const sh = Math.sin(u * Math.PI * 6) * 3 * k;
        P.staff.rot = -26 * k + sh;
        P.staff.dy = -10 * k;
        P.orb.rot = 22 * k - sh;
        P.orb.dy = -16 * k;
        P.body.dy = -5 * k;
        P.capeL.rot = 6 * k;
    },
});
Object.assign(FX, {
    bay_bolts(ctx, u) {
        const charge = ease(u / 0.45);
        const cx = 55, cy = 90;
        const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 110);
        g.addColorStop(0, 'rgba(230,220,255,' + (0.9 * charge * (u < 0.55 ? 1 : 0.3)) + ')');
        g.addColorStop(1, 'rgba(140,90,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 110, 0, 7); ctx.fill();
        // warning strip on the favoured (right) half
        if (u > 0.2 && u < 0.5) {
            ctx.fillStyle = 'rgba(180,140,255,' + (0.18 * ease((u - 0.2) / 0.1)) + ')';
            ctx.fillRect(256, 0, 256, 512);
        }
        let flash = 0;
        if (u > 0.5 && u < 0.85) {
            const k = (u - 0.5) / 0.35, a = 1 - k;
            [300, 360, 420, 480].forEach((x0, i) => {
                if (k < i * 0.06) return;
                ctx.strokeStyle = 'rgba(210,190,255,' + a + ')'; ctx.lineWidth = 8 * a + 2;
                ctx.shadowColor = '#a78bfa'; ctx.shadowBlur = 16;
                ctx.beginPath(); let x = x0, y = -20; ctx.moveTo(x, y);
                for (let j = 0; j < 9; j++) { y += 60; x = x0 + (((j * 37 + i * 19) % 30) - 15); ctx.lineTo(x, y); }
                ctx.stroke(); ctx.shadowBlur = 0;
                ctx.fillStyle = 'rgba(255,255,255,' + (0.5 * a) + ')';
                ctx.beginPath(); ctx.ellipse(x0, 470, 40 * (0.4 + k), 12, 0, 0, 7); ctx.fill();
            });
            flash = 0.3 * (1 - k);
        }
        return flash;
    },
    bay_bomb(ctx, u) {
        // bomb leaves the orb hand at u~0.38, arcs to the floor at (460, 430)
        const t = (u - 0.38) / 0.4;
        if (t > 0 && t < 1) {
            const x = 420 + 40 * t, y = 250 + 190 * t - 220 * Math.sin(t * Math.PI);
            ctx.fillStyle = '#1b1530'; ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(x, y, 22, 0, 7); ctx.fill(); ctx.stroke();
            ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(x, y - 22); ctx.lineTo(x + 8, y - 34); ctx.stroke();
            ctx.fillStyle = 'rgba(255,200,60,0.9)';
            ctx.beginPath(); ctx.arc(x + 8, y - 36, 5 + (Math.sin(u * 90) + 1) * 2, 0, 7); ctx.fill();
        }
        if (t >= 1) {
            const k = Math.min(1, (t - 1) / 0.5);
            ctx.strokeStyle = 'rgba(200,170,255,' + (0.8 * (1 - k)) + ')'; ctx.lineWidth = 6 * (1 - k) + 1;
            ctx.beginPath(); ctx.ellipse(460, 440, 20 + k * 90, 8 + k * 26, 0, 0, 7); ctx.stroke();
            ctx.fillStyle = 'rgba(255,200,60,' + (0.8 * (1 - k)) + ')';
            ctx.beginPath(); ctx.arc(460, 432, 10, 0, 7); ctx.fill();
        }
        return 0;
    },
    bay_wisps(ctx, u) {
        const env = ease(Math.min(u / 0.12, 1, (1 - u) / 0.15));
        for (let i = 0; i < 6; i++) {
            const ph = (u * 1.6 + i / 6) % 1;
            const x = 60 + ph * 380 + Math.sin(ph * 9 + i) * 24;
            const y = 120 + 65 * (i % 3) - 70 * Math.sin(ph * Math.PI) + Math.cos(ph * 7 + i) * 18;
            const a = env * Math.sin(ph * Math.PI);
            const gr = ctx.createRadialGradient(x, y, 1, x, y, 26);
            gr.addColorStop(0, 'rgba(240,255,250,' + a + ')');
            gr.addColorStop(0.4, 'rgba(110,255,200,' + (0.6 * a) + ')');
            gr.addColorStop(1, 'rgba(60,200,160,0)');
            ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, 26, 0, 7); ctx.fill();
        }
        const p = 0.5 + 0.5 * Math.sin(u * Math.PI * 8);
        ctx.fillStyle = 'rgba(110,255,200,' + (0.25 * p * env) + ')';
        ctx.beginPath(); ctx.arc(425, 190, 85, 0, 7); ctx.fill();
        return 0;
    },
    bay_veil(ctx, u) {
        const fall = ease((u - 0.2) / 0.4), out = 1 - ease((u - 0.8) / 0.2);
        const a = out * fall;
        if (a > 0) {
            const h = 560 * fall;
            const gr = ctx.createLinearGradient(0, -50, 0, h);
            gr.addColorStop(0, 'rgba(120,70,220,' + (0.55 * a) + ')');
            gr.addColorStop(1, 'rgba(170,120,255,' + (0.15 * a) + ')');
            ctx.fillStyle = gr; ctx.fillRect(-40, -50, 592, h + 50);
            ctx.strokeStyle = 'rgba(230,210,255,' + (0.5 * a) + ')'; ctx.lineWidth = 3;
            for (let i = 0; i < 9; i++) {
                const x = i * 64 - 10 + Math.sin(u * 14 + i) * 8;
                ctx.beginPath(); ctx.moveTo(x, -50); ctx.lineTo(x + 10, Math.min(h, 520)); ctx.stroke();
            }
        }
        const k = ease(u / 0.35) * out;
        [[60, 90], [425, 190]].forEach((c) => {
            const g = ctx.createRadialGradient(c[0], c[1], 2, c[0], c[1], 90);
            g.addColorStop(0, 'rgba(230,210,255,' + (0.6 * k) + ')'); g.addColorStop(1, 'rgba(140,90,255,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c[0], c[1], 90, 0, 7); ctx.fill();
        });
        return u < 0.25 ? 0.25 * ease(u / 0.25) : 0;
    },
});
// <<< poses boss_bayes

const SHAKE = { slam: (u) => (u >= 0.5 ? 9 * Math.max(0, 1 - (u - 0.5) * 4) : 0) };

// ---- plumbing ------------------------------------------------------------
const _imgCache = {};
function _partImg(bossId, part) {
    const key = bossId + '/' + part;
    if (!_imgCache[key]) {
        const im = new Image();
        im.src = RIG_DIR + bossId + '/' + part + '.webp';
        _imgCache[key] = im;
    }
    return _imgCache[key];
}

const _running = {};   // monsterId -> true while an animation owns that card

function _findArt(monsterId) {
    const card = document.getElementById('eg-card-' + monsterId);
    return card ? card.querySelector('.eg-monster-emoji-compact') : null;
}

// Draws one frame of an animation (progress u in 0..1) into a 1024px canvas
// context: the 512px art sits in the middle, effects may spill into the margin.
function _renderFrame(ctx, rig, imgs, animName, u) {
    const S = rig.S, by = {}, poses = {};
    rig.parts.forEach((p) => { by[p.n] = p; poses[p.n] = { rot: 0, dx: 0, dy: 0, sc: 1 }; });
    const chainOf = (p) => { const c = []; for (let q = p; q; q = q.par ? by[q.par] : null) c.unshift(q); return c; };
    const rootName = rig.parts.find((p) => !p.par).n;
    POSES[animName](poses, u);
    ctx.clearRect(0, 0, 1024, 1024);
    ctx.save();
    ctx.translate(256, 256);                      // the 512px art sits in the middle of the canvas
    const sh = SHAKE[animName] ? SHAKE[animName](u) : 0;
    if (sh) ctx.translate((Math.random() - 0.5) * sh * S, (Math.random() - 0.5) * sh * S);
    rig.parts.forEach((p, i) => {
        ctx.save();
        for (const q of chainOf(p)) {
            const o = poses[q.n];
            ctx.translate(o.dx * S, o.dy * S);
            ctx.translate(q.px, q.py); ctx.rotate(o.rot * Math.PI / 180); ctx.scale(o.sc, o.sc); ctx.translate(-q.px, -q.py);
        }
        ctx.drawImage(imgs[i], p.x, p.y);
        ctx.restore();
    });
    ctx.save();
    ctx.translate(rig.ox, rig.oy); ctx.scale(S, S);
    const flash = FX[animName](ctx, u, poses[rootName].dy);
    ctx.restore();
    ctx.restore();
    if (flash > 0) {
        const g = ctx.createRadialGradient(512, 512, 10, 512, 512, 420);
        g.addColorStop(0, 'rgba(255,255,255,' + flash + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 1024, 1024);
    }
}

function _play(monsterId, bossId, animName, ms) {
    const rig = RIGS[bossId];
    if (!rig || !POSES[animName] || _running[monsterId]) return;
    const imgs = rig.parts.map((p) => _partImg(bossId, p.n));
    // Art not decoded yet (first use): skip this cue, it will be ready next time.
    if (!imgs.every((im) => im.complete && im.naturalWidth)) return;
    let art = _findArt(monsterId);
    if (!art) return;

    _running[monsterId] = true;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1024;           // art centred in a 2x area so rings can spill out
    canvas.style.cssText = 'position:absolute;left:50%;top:50%;width:200%;height:200%;'
        + 'transform:translate(-50%,-50%);pointer-events:none;z-index:6;';
    const ctx = canvas.getContext('2d');
    let hiddenImg = null;

    const attach = () => {
        art = _findArt(monsterId);
        if (!art) return false;
        if (getComputedStyle(art).position === 'static') art.style.position = 'relative';
        hiddenImg = art.querySelector('img');
        if (hiddenImg) hiddenImg.style.visibility = 'hidden';
        art.appendChild(canvas);
        return true;
    };
    const finish = () => {
        if (hiddenImg) hiddenImg.style.visibility = '';
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
        const a = _findArt(monsterId);
        if (a) { const im = a.querySelector('img'); if (im) im.style.visibility = ''; }
        delete _running[monsterId];
    };
    if (!attach()) { delete _running[monsterId]; return; }

    const t0 = performance.now();
    const frame = (now) => {
        const u = (now - t0) / ms;
        if (u >= 1) return finish();
        // The encounter re-renders cards; follow the live one if ours was dropped.
        if (!canvas.isConnected && !attach()) return finish();
        _renderFrame(ctx, rig, imgs, animName, u);
        requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
}

function _onBossMechanic(ev) {
    try {
        const d = (ev && ev.detail) || {};
        const art = _findArt(d.monsterId);
        if (!art) return;
        const img = art.querySelector('img');
        const src = img ? String(img.getAttribute('src') || '') : '';
        const bossId = Object.keys(RIGS).find((id) => src.indexOf('/' + id + '.') !== -1);
        if (!bossId) return;
        const m = RIGS[bossId].mechanics[d.mech];
        if (!m) return;
        _play(d.monsterId, bossId, m.anim, m.ms(Number(d.phase) || 1));
    } catch (e) { /* purely cosmetic - never let it surface */ }
}

document.addEventListener('eg-boss-mechanic', _onBossMechanic);

// Warm the part images shortly after boot (~170 KB total) so the very first
// ability of a fight already has its art decoded and is not skipped.
setTimeout(() => {
    try { Object.keys(RIGS).forEach((id) => RIGS[id].parts.forEach((p) => _partImg(id, p.n))); } catch (e) { /* cosmetic only */ }
}, 4000);

// Review hook for the rigging tool (dev/scratch/rigger): draw frame u of an
// animation into any 1024px canvas. Not used by the game itself.
globalThis.EG_BOSS_RIG_REVIEW = {
    anims: () => Object.keys(POSES),
    render(ctx, bossId, animName, u) {
        const rig = RIGS[bossId];
        if (!rig || !POSES[animName]) return false;
        const imgs = rig.parts.map((p) => _partImg(bossId, p.n));
        if (!imgs.every((im) => im.complete && im.naturalWidth)) return false;
        _renderFrame(ctx, rig, imgs, animName, u);
        return true;
    },
    mechanics: (bossId) => (RIGS[bossId] ? RIGS[bossId].mechanics : null),
};
