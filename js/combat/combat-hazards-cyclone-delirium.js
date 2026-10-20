import { Audio_Manager } from '../audio/audio.js';
import { _applyPlayerAilment } from './combat-ailments-core.js';
import {
    HZ_CYCLONE_BASE_DMG_PCT, HZ_CYCLONE_R_MAX, HZ_CYCLONE_R_MIN, HZ_CYCLONE_SPEED_MAX,
    HZ_CYCLONE_SPEED_MIN, HZ_CYCLONE_TICK_MS, HZ_DELIRIUM_FADE_IN_MS,
    HZ_DELIRIUM_FADE_OUT_MS, HZ_DELIRIUM_HOLD_MS, HZ_DELIRIUM_INTERVAL_MAX_MS,
    HZ_DELIRIUM_INTERVAL_MIN_MS, HZ_DELIRIUM_POLYMORPH_CHANCE_PCT,
    _hzApplyCircleHit, _hzLayer, _hzMult, _hzPlayerHitbox, _hzRand,
    _hzSweptCircleRectOverlap,
} from './combat-hazards.js';
import { _hzCyclone, _hzDelirium, _setHzCyclone, _setHzDelirium } from './combat-hazards.js';

//------------------------------------------------------------------------
//-------------------CYCLONES---------------------------------------------
//------------------------------------------------------------------------
// Fast wind vortices that race across the whole screen (grid included),
// damaging the player continuously while they stand inside one.

export function _hzInitCyclone(intensity) {
    const count = Math.min(5, 2 + Math.round(intensity / 33));
    const vortices = [];
    for (let i = 0; i < count; i++) {
        const r = _hzRand(HZ_CYCLONE_R_MIN, HZ_CYCLONE_R_MAX);
        const speed = _hzRand(HZ_CYCLONE_SPEED_MIN, HZ_CYCLONE_SPEED_MAX)
            * (1 + intensity / 200);
        const angle = Math.random() * Math.PI * 2;

        const el = document.createElement('div');
        el.className = 'sx-hz-cyclone';
        const size = r * 2;
        el.style.width = size + 'px';
        el.style.height = size * 1.6 + 'px';
        _hzLayer.appendChild(el);

        vortices.push({
            x: _hzRand(r, window.innerWidth - r),
            y: _hzRand(r, window.innerHeight - r),
            r,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            dmgAcc: 0, el,
        });
    }
    Audio_Manager.playSFX('hz_cyclone_loop');
    _setHzCyclone({ vortices, dmgMult: _hzMult(intensity) });
}

export function _hzTickCyclone(dtMs) {
    const st = _hzCyclone;
    const dtS = dtMs / 1000;
    const pr = _hzPlayerHitbox();

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
        if (v.dmgAcc >= HZ_CYCLONE_TICK_MS) {
            v.dmgAcc = 0;
            if (pr && _hzSweptCircleRectOverlap(prevX, prevY, v.x, v.y, v.r * 0.9, pr)) {
                _hzApplyCircleHit(v.x, v.y, v.r * 0.9, pr,
                    HZ_CYCLONE_BASE_DMG_PCT * st.dmgMult, 'cold', '#a8e6ff');
            }
        }
    });
}


//------------------------------------------------------------------------
//-------------------DELIRIUM MIST----------------------------------------
//------------------------------------------------------------------------
// Delirium: a purple mist periodically floods the screen. While it holds,
// there is one chance roll to polymorph the player into chaos.

export function _hzInitDelirium(intensity) {
    _setHzDelirium({
        phase: 'idle',
        nextIn: _hzRand(8000, 14000),
        t: 0,
        el: null,
        rolled: false,
        polyChance: Math.min(80, HZ_DELIRIUM_POLYMORPH_CHANCE_PCT * _hzMult(intensity)),
    });
}

export function _hzTickDelirium(dtMs) {
    const st = _hzDelirium;

    if (st.phase === 'idle') {
        st.nextIn -= dtMs;
        if (st.nextIn <= 0) {
            const mist = document.createElement('div');
            mist.className = 'sx-hz-delirium';
            mist.style.animationDuration =
                `${HZ_DELIRIUM_FADE_IN_MS}ms, ${HZ_DELIRIUM_FADE_OUT_MS}ms`;
            mist.style.animationDelay = `0ms, ${HZ_DELIRIUM_FADE_IN_MS + HZ_DELIRIUM_HOLD_MS}ms`;
            document.body.appendChild(mist);
            Audio_Manager.playSFX('hz_delirium_pulse');
            st.el = mist;
            st.phase = 'mist';
            st.t = HZ_DELIRIUM_FADE_IN_MS + HZ_DELIRIUM_HOLD_MS;
            st.rolled = false;
        }
        return;
    }

    // Mist phase
    st.t -= dtMs;
    if (!st.rolled && st.t <= HZ_DELIRIUM_HOLD_MS) {
        st.rolled = true;
        if (typeof _applyPlayerAilment === 'function'
            && Math.random() * 100 < st.polyChance) {
            _applyPlayerAilment('polymorph');
        }
    }
    if (st.t <= 0) {
        if (st.el) { st.el.remove(); st.el = null; }
        st.phase = 'idle';
        st.nextIn = _hzRand(
            HZ_DELIRIUM_INTERVAL_MIN_MS,
            HZ_DELIRIUM_INTERVAL_MAX_MS
        );
    }
}
