import { t } from '../../translation/translations.js';
import { cur } from '../../state.js';
import { _renderPanel } from '../encounter.js';
import { BOSS_MECHANICS, _bossScheduleMechanics } from './boss-framework.js';
import { _nkBossAlive, _nkEl, _nkKillRun, _nkLoop, _nkNewRun, _nkRuns } from './shared-boss-abilities.js';
import { _crpBlast, _crpFuseRing, _crpPhaseOf, _crpPounce, _crpReset, _crpSetFuse, _mechCreeperPack } from './boss-creeper.js';
import { _mechFuseTrail } from './boss-creeper-fuse.js';

//------------------------------------------------------------------------
//-------------------CREEPER: SSSS…BOOM FINALE AND TEARDOWN----------------
//------------------------------------------------------------------------
// At 10% the Creeper turns immune and swells like a primed creeper. A giant
// red circle around the middle of the arena fills like a pie-timer while 3…2…1
// counts down; then it blows. Be OUTSIDE the circle. Also holds the teardown
// and the console hook for playtesting.
//------------------------------------------------------------------------

const CRP_FINAL_COUNT_MS = 3000;
const CRP_FINAL_AFTER_MS = 1400;
const CRP_FINAL_R_PCT = 0.40;                   // blast radius, share of the smaller screen side
const CRP_FINAL_DMG = 0.30;


//------------------------------------------------------------------------
//-------------------SMALL HELPERS-----------------------------------------
//------------------------------------------------------------------------

// Centre of the playable grid (from its corner cells), or the screen middle.
function _crpGridCenter() {
    if (cur && cur.grid && cur.grid.length && cur.grid[0]) {
        const a = document.getElementById('g-0-0');
        const b = document.getElementById('g-' + (cur.grid.length - 1) + '-' + (cur.grid[0].length - 1));
        if (a && b && a.isConnected && b.isConnected) {
            const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
            if (ra.width && rb.width) return { x: (ra.left + rb.right) / 2, y: (ra.top + rb.bottom) / 2 };
        }
    }
    return { x: window.innerWidth / 2, y: window.innerHeight * 0.42 };
}

// The card art of the boss (for the swell), or null.
function _crpCardWrap(monsterId) {
    const card = document.getElementById('sx-card-' + monsterId);
    return card ? (card.querySelector('.sx-emoji-wrapper') || card) : null;
}

// Reads a translation with an English fallback.
function _crpText(key, fallback) {
    try { const raw = t(key); if (raw && raw !== key) return raw; } catch (e) {}
    return fallback;
}


//------------------------------------------------------------------------
//-------------------THE FINALE--------------------------------------------
//------------------------------------------------------------------------

// Hands the boss back after the blast: immunity off, mechanics rescheduled.
function _crpFinaleRelease(monster, wrap) {
    if (wrap) wrap.classList.remove('sx-crp-swell', 'sx-nk-shielded');
    const live = globalThis._monsters ? globalThis._monsters.find(m => m && m.id === monster.id) : null;
    if (!live || !live.bossImmune) return;
    live.bossImmune = false;
    try { _bossScheduleMechanics(live, 3); } catch (e) {}
    try { _renderPanel(); } catch (e) {}
}

// Builds the banner, the giant pie-timer circle and the big number.
function _crpFinaleScene(run, center, R) {
    const banner = _nkEl(run, 'div', 'sx-nk-fin-banner sx-crp-fin');
    banner.innerHTML = '<div class="sx-nk-fin-title"></div><div class="sx-nk-fin-hint"></div>';
    banner.querySelector('.sx-nk-fin-title').textContent = _crpText('eg_crp_final_title', '💥 SSSS… BOOM');
    banner.querySelector('.sx-nk-fin-hint').textContent = _crpText('eg_crp_final_hint', 'The Creeper is about to burst - get OUTSIDE the red circle!');
    const ring = _crpFuseRing(run, center.x, center.y, R, 'final');
    const num = _nkEl(run, 'div', 'sx-crp-final-num', '3');
    num.style.left = Math.round(center.x) + 'px';
    num.style.top = Math.round(center.y) + 'px';
    return { ring, num };
}

// The blast itself: screen flash, the giant blast, and a few harmless echoes.
function _crpFinaleBang(run, center, R, level) {
    document.body.classList.add('sx-crp-flash');
    setTimeout(() => document.body.classList.remove('sx-crp-flash'), 700);
    _crpBlast(center.x, center.y, R, CRP_FINAL_DMG, level, 'SSSS…BOOM', true);
    for (let i = 1; i <= 3; i++) {
        run.timers.push(setTimeout(() => {
            _crpBlast(center.x + (Math.random() * 2 - 1) * R * 0.6, center.y + (Math.random() * 2 - 1) * R * 0.6, R * (0.4 + i * 0.18), 0, level, '');
        }, i * 160));
    }
}

// Starts SSSS…BOOM: the arena goes quiet, the boss swells, the circle fills.
function _crpFinaleStart(monster) {
    if (!monster || monster._crpFinaleDone) return;
    monster._crpFinaleDone = true;
    Array.from(_nkRuns.values()).forEach(r => { if (r.bossId === monster.id) { try { _nkKillRun(r); } catch (e) {} } });
    const level = monster.level || 1;
    const center = _crpGridCenter();
    const R = Math.min(window.innerWidth, window.innerHeight) * CRP_FINAL_R_PCT;
    const run = _nkNewRun(monster.id, true);
    run.passive = true;
    const wrap = _crpCardWrap(monster.id);
    if (wrap) wrap.classList.add('sx-crp-swell', 'sx-nk-shielded');
    monster.bossImmune = true;
    run.onKill = () => _crpFinaleRelease(monster, wrap);
    const scene = _crpFinaleScene(run, center, R);
    let t0 = 0, shown = 3, banged = false;
    _nkLoop(run, (dtS) => {
        t0 += dtS * 1000;
        if (!banged) {
            _crpSetFuse(scene.ring, t0 / CRP_FINAL_COUNT_MS);
            const left = Math.max(1, Math.ceil((CRP_FINAL_COUNT_MS - t0) / 1000));
            if (left !== shown) {
                shown = left;
                scene.num.textContent = String(left);
                scene.num.classList.remove('pop'); void scene.num.offsetWidth; scene.num.classList.add('pop');
            }
            if (t0 < CRP_FINAL_COUNT_MS) return true;
            banged = true; t0 = 0;
            scene.num.remove(); scene.ring.remove();
            _crpFinaleBang(run, center, R, level);
            return true;
        }
        return t0 < CRP_FINAL_AFTER_MS;
    });
}

// Watches the Creeper's life and starts the finale once, at 10% or less.
function _crpWatchFinale(monster) {
    if (!monster || monster._crpFinaleWatch) return;
    monster._crpFinaleWatch = true;
    const run = _nkNewRun(monster.id, true);
    run.passive = true;
    _nkLoop(run, () => {
        if (monster._crpFinaleDone || !_nkBossAlive(monster.id)) return false;
        if (monster.currentHP > 0 && monster.currentHP <= monster.maxHP * 0.10 && !monster.bossImmune) {
            _crpFinaleStart(monster);
            return false;
        }
        return true;
    });
}

// The framework calls onInit when the Creeper spawns.
BOSS_MECHANICS.boss_creeper.onInit = _crpWatchFinale;


//------------------------------------------------------------------------
//-------------------TEARDOWN AND PLAYTEST HOOK----------------------------
//------------------------------------------------------------------------

// Removes everything the Creeper has put on screen (registered in boss-teardown-hooks).
export function _crpTeardown() {
    document.body.classList.remove('sx-crp-flash');
    document.querySelectorAll('.sx-crp-swell').forEach(el => el.classList.remove('sx-crp-swell'));
    // Only our own loose elements: the card art carries sx-crp-* classes too and must stay.
    document.querySelectorAll('body > [class*="sx-crp-"]').forEach(el => { try { el.remove(); } catch (e) {} });
    _crpReset();
}

// Console hook for playtesting: _CRP_DEBUG.fire('pack'|'trail'|'pounce'|'final', phase).
if (typeof window !== 'undefined') {
    window._CRP_DEBUG = {
        fire: (name, phase) => {
            const monster = globalThis._monsters ? globalThis._monsters.find(m => m && m.baseId === 'boss_creeper') : null;
            if (!monster) return 'no creeper alive';
            const p = phase || _crpPhaseOf(monster);
            if (name === 'pack') _mechCreeperPack(monster, p);
            else if (name === 'trail') _mechFuseTrail(monster, Math.max(2, p));
            else if (name === 'pounce') _crpPounce(monster, p);
            else if (name === 'final') _crpFinaleStart(monster);
            else return 'unknown: ' + name;
            return 'fired ' + name;
        },
    };
}
