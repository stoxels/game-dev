import { _egApplyPlayerAilment } from './combat-ailments-core.js';
import {
    EG_HZ_CYCLONE_BASE_DMG_PCT, EG_HZ_CYCLONE_R_MAX, EG_HZ_CYCLONE_R_MIN, EG_HZ_CYCLONE_SPEED_MAX,
    EG_HZ_CYCLONE_SPEED_MIN, EG_HZ_CYCLONE_TICK_MS, EG_HZ_DELIRIUM_FADE_IN_MS,
    EG_HZ_DELIRIUM_FADE_OUT_MS, EG_HZ_DELIRIUM_HOLD_MS, EG_HZ_DELIRIUM_INTERVAL_MAX_MS,
    EG_HZ_DELIRIUM_INTERVAL_MIN_MS, EG_HZ_DELIRIUM_POLYMORPH_CHANCE_PCT,
    _egHzApplyCircleHit, _egHzLayer, _egHzMult, _egHzPlayerHitbox, _egHzRand,
    _egHzSweptCircleRectOverlap,
} from './combat-hazards.js';
import { _egHzCyclone, _egHzDelirium, _egSetHzCyclone, _egSetHzDelirium } from './combat-hazards.js';

//------------------------------------------------------------------------
//-------------------CYCLONES---------------------------------------------
//------------------------------------------------------------------------
// Fast wind vortices that race across the whole screen (grid included),
// damaging the player continuously while they stand inside one.

export function _egHzInitCyclone(intensity) {
    const count = Math.min(5, 2 + Math.round(intensity / 33));
    const vortices = [];
    for (let i = 0; i < count; i++) {
        const r = _egHzRand(EG_HZ_CYCLONE_R_MIN, EG_HZ_CYCLONE_R_MAX);
        const speed = _egHzRand(EG_HZ_CYCLONE_SPEED_MIN, EG_HZ_CYCLONE_SPEED_MAX)
            * (1 + intensity / 200);
        const angle = Math.random() * Math.PI * 2;

        const el = document.createElement('div');
        el.className = 'eg-hz-cyclone';
        const size = r * 2;
        el.style.width = size + 'px';
        el.style.height = size * 1.6 + 'px';
        _egHzLayer.appendChild(el);

        vortices.push({
            x: _egHzRand(r, window.innerWidth - r),
            y: _egHzRand(r, window.innerHeight - r),
            r,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            dmgAcc: 0, el,
        });
    }
    _egSetHzCyclone({ vortices, dmgMult: _egHzMult(intensity) });
}

export function _egHzTickCyclone(dtMs) {
    const st = _egHzCyclone;
    const dtS = dtMs / 1000;
    const pr = _egHzPlayerHitbox();

    st.vortices.forEach(v => {
        if (!v.el.isConnected) return;

        const prevX = v.x, prevY = v.y;
        let nx = v.x + v.vx * dtS;
        let ny = v.y + v.vy * dtS;
        if (nx < v.r || nx > window.innerWidth - v.r) { v.vx *= -1; nx = v.x; }
        if (ny < v.r || ny > window.innerHeight - v.r) { v.vy *= -1; ny = v.y; }
        v.x = nx; v.y = ny;
        v.el.style.transform =
            `translate(${Math.round(v.x - v.r)}px, ${Math.round(v.y - v.r * 1.6)}px) rotate(${(v.x + v.y) % 360}deg)`;

        // Continuous cold damage while the player stands in the funnel.
        v.dmgAcc += dtMs;
        if (v.dmgAcc >= EG_HZ_CYCLONE_TICK_MS) {
            v.dmgAcc = 0;
            if (pr && _egHzSweptCircleRectOverlap(prevX, prevY, v.x, v.y, v.r * 0.9, pr)) {
                _egHzApplyCircleHit(v.x, v.y, v.r * 0.9, pr,
                    EG_HZ_CYCLONE_BASE_DMG_PCT * st.dmgMult, 'cold', '#a8e6ff');
            }
        }
    });
}


//------------------------------------------------------------------------
//-------------------DELIRIUM MIST----------------------------------------
//------------------------------------------------------------------------
// PoE Delirium: a purple mist periodically floods the screen. While it holds,
// there is one chance roll to polymorph the player into chaos.

export function _egHzInitDelirium(intensity) {
    _egSetHzDelirium({
        phase: 'idle',
        nextIn: _egHzRand(8000, 14000),
        t: 0,
        el: null,
        rolled: false,
        polyChance: Math.min(80, EG_HZ_DELIRIUM_POLYMORPH_CHANCE_PCT * _egHzMult(intensity)),
    });
}

export function _egHzTickDelirium(dtMs) {
    const st = _egHzDelirium;

    if (st.phase === 'idle') {
        st.nextIn -= dtMs;
        if (st.nextIn <= 0) {
            const mist = document.createElement('div');
            mist.className = 'eg-hz-delirium';
            mist.style.animationDuration =
                `${EG_HZ_DELIRIUM_FADE_IN_MS}ms, ${EG_HZ_DELIRIUM_FADE_OUT_MS}ms`;
            mist.style.animationDelay = `0ms, ${EG_HZ_DELIRIUM_FADE_IN_MS + EG_HZ_DELIRIUM_HOLD_MS}ms`;
            document.body.appendChild(mist);
            st.el = mist;
            st.phase = 'mist';
            st.t = EG_HZ_DELIRIUM_FADE_IN_MS + EG_HZ_DELIRIUM_HOLD_MS;
            st.rolled = false;
        }
        return;
    }

    // Mist phase
    st.t -= dtMs;
    if (!st.rolled && st.t <= EG_HZ_DELIRIUM_HOLD_MS) {
        st.rolled = true;
        if (typeof _egApplyPlayerAilment === 'function'
            && Math.random() * 100 < st.polyChance) {
            _egApplyPlayerAilment('polymorph');
        }
    }
    if (st.t <= 0) {
        if (st.el) { st.el.remove(); st.el = null; }
        st.phase = 'idle';
        st.nextIn = _egHzRand(
            EG_HZ_DELIRIUM_INTERVAL_MIN_MS,
            EG_HZ_DELIRIUM_INTERVAL_MAX_MS
        );
    }
}
