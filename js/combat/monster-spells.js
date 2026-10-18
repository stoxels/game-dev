//------------------------------------------------------------------------
// Monster spells: regular (non-boss) monsters may cast an elemental or
// support spell instead of their plain melee/projectile attack. Hooked in
// from _egFireMonsterAttack (encounter-monster-attacks.js) when the charge
// bar fills.
//
// Damage goes through _egPlayerTakeDamage with isSpell = true and the
// spell's element, so the player's resistances, spell block, armour and
// absorption all apply; elemental hits also roll the normal ailments
// (ignite / chill / shock / shadow) - spells roll them an extra time.
// Bosses keep their own ability sets and never cast these.
//------------------------------------------------------------------------

import { Audio_Manager } from '../audio/audio.js';
import { LANG } from '../translation/translations.js';
import { updateClassHUDManaBar } from '../classes/class-mana.js';
import { _egCircleOverlapsRect, _egGetPlayerRectForAilment, _egRollMonsterHitAilment } from './combat-ailments-core.js';
import { _egFireProjectile, _egGetElementCentre } from './combat-class-projectiles.js';
import { EG_MAX_CONCURRENT_MONSTERS } from './combat-monsters.js';
import { _egIsActive } from './combat-state.js';
import { _egPlayerTakeDamage } from './encounter-damage.js';
import { _egApplyPlayerHitFeedback } from './encounter-monster-attack-feedback.js';
import { _egSpawnMonster } from './encounter-monster-spawning.js';
import { _egRenderPanel, _egUpdateBars } from './encounter.js';
import { cur } from '../state.js';

//------------------------------------------------------------------------
//-------------------TUNING-----------------------------------------------
//------------------------------------------------------------------------

export const EG_MONSTER_SPELL_CONFIG = {
    baseChance: 0.16,        // cast chance per full charge bar at monster level 1
    chancePerLevel: 0.004,   // + per monster level (capped at levelCap)
    levelCap: 60,
    maxChance: 0.42,
    eliteMult: 1.35,
    gauntletMult: 1.5,       // arenas are spell-heavier
    cooldownMs: 6000,        // per monster, between casts
    windupMs: 550,
    novaRadiusPx: 84,
    novaTelegraphMs: 1000,
    mendWoundedBelow: 0.7,   // an ally must be below this life share
    mendHealPct: 0.28,
    drainManaPct: 0.15,
    drainManaMin: 6,
};

// Which spells each element can roll. Non-elemental monsters are support
// casters. `mult` scales monster.damageValue.
const SPELLS = {
    fire_bolt:       { el: 'fire',      mult: 1.3,  en: 'Fire Bolt',       de: 'Feuerblitz' },
    frost_nova:      { el: 'cold',      mult: 1.7,  en: 'Cold Eruption',   de: 'Kälteausbruch' },
    chain_lightning: { el: 'lightning', mult: 0.7,  en: 'Chain Lightning', de: 'Kettenblitz' },
    soul_drain:      { el: 'shadow',    mult: 1.0,  en: 'Spirit Siphon',   de: 'Geistersog' },
    mend:            { el: 'heal',      mult: 0,    en: 'Mend',            de: 'Heilung' },
    summon:          { el: 'summon',    mult: 0,    en: 'Summon',          de: 'Beschwörung' },
    meteor:          { el: 'fire',      mult: 2.2,  en: 'Meteor',          de: 'Meteor' },
    ember_rain:      { el: 'fire',      mult: 0.8,  en: 'Ember Rain',      de: 'Glutregen' },
    ice_lance:       { el: 'cold',      mult: 1.5,  en: 'Icicle Dart',     de: 'Eiszapfen' },
    hailstorm:       { el: 'cold',      mult: 0.8,  en: 'Hailstorm',       de: 'Hagelsturm' },
    thunder_strike:  { el: 'lightning', mult: 1.1,  en: 'Skybolt',         de: 'Himmelsblitz' },
    doom_orb:        { el: 'shadow',    mult: 2.0,  en: 'Doom Orb',        de: 'Verderbniskugel' },
    shadow_volley:   { el: 'shadow',    mult: 0.6,  en: 'Shadow Volley',   de: 'Schattensalve' },
    enrage:          { el: 'rage',      mult: 0,    en: 'Enrage',          de: 'Wutanfall' },
    inferno_ring:    { el: 'fire',      mult: 1.0,  en: 'Ring of Fire',    de: 'Feuerring' },
    flame_wall:      { el: 'fire',      mult: 0.75, en: 'Wall of Flame',   de: 'Flammenwand' },
    glacial_spikes:  { el: 'cold',      mult: 0.9,  en: 'Glacial Spikes',  de: 'Gletscherzacken' },
    frozen_orb:      { el: 'cold',      mult: 1.6,  en: 'Winter Sphere',   de: 'Wintersphäre' },
    static_field:    { el: 'lightning', mult: 0.8,  en: 'Static Field',    de: 'Statisches Feld' },
    ball_lightning:  { el: 'lightning', mult: 1.9,  en: 'Thunder Orb',     de: 'Donnerkugel' },
    void_rift:       { el: 'shadow',    mult: 2.1,  en: 'Void Rift',       de: 'Leerenriss' },
    grasping_shadows: { el: 'shadow',   mult: 0.85, en: 'Grasping Shadows', de: 'Greifende Schatten' },
};

const POOLS = {
    fire: ['fire_bolt', 'meteor', 'ember_rain', 'inferno_ring', 'flame_wall', 'mend', 'enrage'],
    cold: ['frost_nova', 'ice_lance', 'hailstorm', 'glacial_spikes', 'frozen_orb', 'mend'],
    lightning: ['chain_lightning', 'thunder_strike', 'static_field', 'ball_lightning', 'enrage'],
    shadow: ['soul_drain', 'summon', 'doom_orb', 'shadow_volley', 'void_rift', 'grasping_shadows'],
    none: ['mend', 'summon', 'enrage'],
};

const ENRAGE_MULT = 1.35;
const ENRAGE_MS = 9000;

const SUMMON_DEFS = ['rat', 'bat', 'beetle'];

//------------------------------------------------------------------------
//-------------------SMALL HELPERS----------------------------------------
//------------------------------------------------------------------------

// Pause-aware setTimeout: only un-paused time counts, so wind-ups, telegraphs
// and volleys freeze with the game (a plain timer would fire - and play its
// sound - straight through the pause menu).
function _msTimeout(fn, ms) {
    let left = Math.max(0, ms);
    let last = performance.now();
    const step = () => {
        const now = performance.now();
        if (!globalThis._gamePaused) left -= now - last;
        last = now;
        if (left <= 0) { fn(); return; }
        setTimeout(step, globalThis._gamePaused ? 100 : Math.min(left, 100));
    };
    setTimeout(step, Math.min(left, 100));
}

function _msName(id) {
    const s = SPELLS[id];
    return LANG === 'de' ? s.de : s.en;
}

function _msAlive(monster) {
    return !!(monster && _egIsActive() && (globalThis._egMonsters || []).some(m => m.id === monster.id && m.currentHP > 0));
}

function _msCard(monster) {
    return document.getElementById(`eg-card-${monster.id}`);
}

function _msPlayerEl() {
    return document.getElementById('player-avatar-wrapper');
}

function _msCentre(el) {
    return el ? _egGetElementCentre(el) : null;
}

// Fixed-position holder at (x, y). `inner` is appended; removed after ms.
function _msFx(el, x, y, ms, inner) {
    const holder = document.createElement('div');
    holder.className = `ms-fx ms-el-${el}`;
    holder.style.left = `${x}px`;
    holder.style.top = `${y}px`;
    holder.innerHTML = inner;
    document.body.appendChild(holder);
    _msTimeout(() => holder.remove(), ms);
    return holder;
}

function _msParticles(el, x, y, count, extraClass, spread) {
    let html = '';
    for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = (spread || 46) * (0.5 + Math.random() * 0.8);
        html += `<span class="ms-particle ${extraClass || ''}" style="--dx:${(Math.cos(a) * d).toFixed(1)}px;--dy:${(Math.sin(a) * d).toFixed(1)}px"></span>`;
    }
    return _msFx(el, x, y, 800, html);
}

function _msImpact(el, pos) {
    if (!pos) return;
    _msFx(el, pos.x, pos.y, 700,
        '<span class="ms-burst-flash"></span><span class="ms-burst-ring"></span>');
    _msParticles(el, pos.x, pos.y, el === 'cold' ? 9 : 12, el === 'cold' ? 'ms-shard' : '', 52);
}

// Glow the caster for the wind-up and pop its name banner.
function _msWindup(monster, id, ms, then) {
    const spell = SPELLS[id];
    const card = _msCard(monster);
    if (card) {
        card.classList.add('ms-casting', `ms-el-${spell.el}`);
        const tag = document.createElement('div');
        tag.className = `ms-spell-name ms-el-${spell.el}`;
        tag.textContent = _msName(id);
        card.appendChild(tag);
        _msTimeout(() => tag.remove(), 1600);
    }
    Audio_Manager.playSFX('monster_charge_windup');
    _msTimeout(() => {
        const c = _msCard(monster);
        if (c) c.classList.remove('ms-casting', `ms-el-${spell.el}`);
        if (_msAlive(monster)) then();
    }, ms);
}

// One damaging hit on the player through the normal mitigation pipeline.
// Returns HP actually lost. Shows a small "resisted" tag when resistances
// ate a large share of the hit.
// `inFlight`: the hit comes from a projectile already launched - it still
// lands if its caster died meanwhile (only a finished encounter cancels it).
function _msHit(monster, mult, element, rollAilment, inFlight) {
    if (inFlight ? !_egIsActive() : !_msAlive(monster)) return 0;
    const raw = Math.max(1, Math.round(monster.damageValue * mult));
    const dealt = _egPlayerTakeDamage(raw, true, element, monster.level, { attacker: monster, isMonsterSpell: true });
    if (dealt > 0) {
        _egApplyPlayerHitFeedback(dealt, false, element);
        if (rollAilment) _egRollMonsterHitAilment(element, dealt, monster);
    }
    if (raw >= 4 && dealt < raw * 0.6) {
        const hud = _msPlayerEl();
        if (hud) {
            const tag = document.createElement('div');
            tag.className = 'ms-resist-tag';
            const pct = Math.round((1 - dealt / raw) * 100);
            tag.textContent = LANG === 'de' ? `🛡 Resistiert −${pct}%` : `🛡 Resisted −${pct}%`;
            hud.appendChild(tag);
            _msTimeout(() => tag.remove(), 1300);
        }
    }
    return dealt;
}

// Projectile with a built orb + trail visual.
function _msProjectile(orbClass, trailClass, from, to, ms, easing, onArrive) {
    const visual = {
        build(el) {
            el.classList.add('ms-proj');
            el.innerHTML = `<span class="ms-trail ${trailClass}"></span><span class="ms-orb ${orbClass}"></span>`;
        },
        rotate: true,
    };
    _egFireProjectile(visual, 'ms-proj', from, to, ms, easing, onArrive, undefined, 1);
}

//------------------------------------------------------------------------
//-------------------THE SPELLS-------------------------------------------
//------------------------------------------------------------------------

function _castFireBolt(monster) {
    const cfg = EG_MONSTER_SPELL_CONFIG;
    _msWindup(monster, 'fire_bolt', cfg.windupMs, () => {
        const from = _msCentre(_msCard(monster));
        const to = _msCentre(_msPlayerEl());
        if (!from || !to) return;
        Audio_Manager.playSFX('monster_projectile_launch');
        _msProjectile('ms-orb-fire', 'ms-trail-fire', from, to, 620, 'ease-in', () => {
            Audio_Manager.playSFX('monster_projectile_hit');
            _msImpact('fire', _msCentre(_msPlayerEl()) || to);
            _msHit(monster, SPELLS.fire_bolt.mult, 'fire', true, true);
        });
    });
}

function _castFrostNova(monster) {
    const cfg = EG_MONSTER_SPELL_CONFIG;
    _msWindup(monster, 'frost_nova', cfg.windupMs, () => {
        const centre = _msCentre(_msPlayerEl());
        if (!centre) return;
        const r = cfg.novaRadiusPx;
        // The telegraph is planted where the player stands NOW - moving
        // out of the circle before it detonates avoids the hit.
        const tele = _msFx('cold', centre.x, centre.y, cfg.novaTelegraphMs + 80,
            `<div class="ms-nova-tele" style="left:${-r}px;top:${-r}px;width:${r * 2}px;height:${r * 2}px;--ms-nova-ms:${cfg.novaTelegraphMs}ms"></div>`);
        Audio_Manager.playSFX('monster_charge_windup');
        _msTimeout(() => {
            tele.remove();
            _msFx('cold', centre.x, centre.y, 650,
                `<div class="ms-nova-blast" style="left:${-r}px;top:${-r}px;width:${r * 2}px;height:${r * 2}px"></div>`);
            _msParticles('cold', centre.x, centre.y, 14, 'ms-shard', r);
            Audio_Manager.playSFX('monster_projectile_hit');
            if (!_msAlive(monster)) return;
            const rect = _egGetPlayerRectForAilment();
            if (rect && _egCircleOverlapsRect(centre.x, centre.y, r, rect)) {
                _msHit(monster, SPELLS.frost_nova.mult, 'cold', true);
            } else if (typeof globalThis.showToast === 'function') {
                globalThis.showCombatToast(LANG === 'de' ? '💨 Dem Kälteausbruch ausgewichen!' : '💨 Dodged the Cold Eruption!');
            }
        }, cfg.novaTelegraphMs);
    });
}

function _boltSvg(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const segs = Math.max(5, Math.round(len / 36));
    const pts = [];
    for (let i = 0; i <= segs; i++) {
        const k = i / segs;
        const jitter = (i === 0 || i === segs) ? 0 : (Math.random() * 2 - 1) * 16;
        pts.push(`${(a.x + dx * k + nx * jitter).toFixed(1)},${(a.y + dy * k + ny * jitter).toFixed(1)}`);
    }
    const p = pts.join(' ');
    return `<svg class="ms-bolt" xmlns="http://www.w3.org/2000/svg"><polyline class="ms-bolt-glow" points="${p}"/><polyline class="ms-bolt-core" points="${p}"/></svg>`;
}

function _castChainLightning(monster) {
    const cfg = EG_MONSTER_SPELL_CONFIG;
    _msWindup(monster, 'chain_lightning', cfg.windupMs - 150, () => {
        const strikes = 3;
        for (let i = 0; i < strikes; i++) {
            _msTimeout(() => {
                if (!_msAlive(monster)) return;
                const from = _msCentre(_msCard(monster));
                const to = _msCentre(_msPlayerEl());
                if (!from || !to) return;
                const wrap = document.createElement('div');
                wrap.innerHTML = _boltSvg(from, to);
                const svg = wrap.firstChild;
                document.body.appendChild(svg);
                _msTimeout(() => svg.remove(), 300);
                Audio_Manager.playSFX('monster_projectile_hit');
                _msImpact('lightning', to);
                _msHit(monster, SPELLS.chain_lightning.mult, 'lightning', i === strikes - 1);
            }, i * 170);
        }
    });
}

function _castSoulDrain(monster) {
    const cfg = EG_MONSTER_SPELL_CONFIG;
    _msWindup(monster, 'soul_drain', cfg.windupMs, () => {
        const from = _msCentre(_msCard(monster));
        const to = _msCentre(_msPlayerEl());
        if (!from || !to) return;
        Audio_Manager.playSFX('monster_projectile_launch');
        _msProjectile('ms-orb-shadow', 'ms-trail-shadow', from, to, 820, 'ease-in-out', () => {
            Audio_Manager.playSFX('monster_projectile_hit');
            const hit = _msCentre(_msPlayerEl()) || to;
            _msFx('shadow', hit.x, hit.y, 1000, '<span class="ms-vortex"></span>');
            _msImpact('shadow', hit);
            const dealt = _msHit(monster, SPELLS.soul_drain.mult, 'shadow', true, true);

            // Mana burn: the player loses a slice of their mana pool.
            let drained = 0;
            const max = Number(globalThis.playerMaxMana) || 0;
            if (max > 0) {
                drained = Math.min(Math.round(globalThis.playerCurrentMana || 0),
                    Math.max(cfg.drainManaMin, Math.round(max * cfg.drainManaPct)));
                if (drained > 0) {
                    globalThis.playerCurrentMana = Math.max(0, Math.round(globalThis.playerCurrentMana) - drained);
                    try { updateClassHUDManaBar(); } catch (e) { /* HUD optional */ }
                }
            }
            if (dealt <= 0 && drained <= 0) return;
            if (drained > 0 && typeof globalThis.showToast === 'function') {
                globalThis.showCombatToast(LANG === 'de' ? `🌑 −${drained} Mana entzogen` : `🌑 −${drained} mana drained`);
            }
            // The stolen essence flows back to the caster as life.
            const heal = Math.max(1, Math.round((dealt + drained) * 0.6));
            if (_msAlive(monster)) {
                const back = _msCentre(_msCard(monster));
                if (back) {
                    _msProjectile('ms-orb-shadow', 'ms-trail-shadow', hit, back, 600, 'ease-out', () => {
                        if (!_msAlive(monster)) return;
                        monster.currentHP = Math.min(monster.maxHP, monster.currentHP + heal);
                        _egUpdateBars();
                    });
                }
            }
        });
    });
}

function _woundedAlly(monster) {
    const cfg = EG_MONSTER_SPELL_CONFIG;
    let best = null;
    let bestRatio = cfg.mendWoundedBelow;
    (globalThis._egMonsters || []).forEach(m => {
        if (m.isBoss || m.isSacrificialZombie || !(m.maxHP > 0) || !(m.currentHP > 0)) return;
        const ratio = m.currentHP / m.maxHP;
        if (ratio < bestRatio) { best = m; bestRatio = ratio; }
    });
    return best || (monster.currentHP < monster.maxHP * cfg.mendWoundedBelow ? monster : null);
}

function _castMend(monster) {
    const cfg = EG_MONSTER_SPELL_CONFIG;
    const target = _woundedAlly(monster);
    if (!target) return;
    _msWindup(monster, 'mend', cfg.windupMs, () => {
        const apply = () => {
            if (!(globalThis._egMonsters || []).some(m => m.id === target.id && m.currentHP > 0)) return;
            const heal = Math.max(1, Math.round(target.maxHP * cfg.mendHealPct));
            target.currentHP = Math.min(target.maxHP, target.currentHP + heal);
            _egUpdateBars();
            const pos = _msCentre(_msCard(target));
            if (!pos) return;
            let html = `<span class="ms-burst-ring"></span><span class="ms-heal-num">+${heal}</span>`;
            for (let i = 0; i < 6; i++) {
                html += `<span class="ms-rise" style="--dx:${(Math.random() * 56 - 28).toFixed(0)}px;animation-delay:${(i * 0.08).toFixed(2)}s">✚</span>`;
            }
            _msFx('heal', pos.x, pos.y, 1400, html);
            Audio_Manager.playSFX('mana_restored_full');
        };
        if (target.id === monster.id) { apply(); return; }
        const from = _msCentre(_msCard(monster));
        const to = _msCentre(_msCard(target));
        if (!from || !to) { apply(); return; }
        _msProjectile('ms-orb-heal', 'ms-trail-heal', from, to, 450, 'ease-in-out', apply);
    });
}

function _castSummon(monster) {
    const cfg = EG_MONSTER_SPELL_CONFIG;
    _msWindup(monster, 'summon', cfg.windupMs + 150, () => {
        if ((globalThis._egMonsters || []).length >= EG_MAX_CONCURRENT_MONSTERS) return;
        const pos = _msCentre(_msCard(monster));
        if (pos) _msFx('summon', pos.x, pos.y + 40, 1200, '<span class="ms-portal"></span>');
        monster._summonsCast = (monster._summonsCast || 0) + 1;
        const defId = SUMMON_DEFS[Math.floor(Math.random() * SUMMON_DEFS.length)];
        _msTimeout(() => {
            if (!_msAlive(monster)) return;
            if ((globalThis._egMonsters || []).length >= EG_MAX_CONCURRENT_MONSTERS) return;
            const before = new Set((globalThis._egMonsters || []).map(m => m.id));
            _egSpawnMonster(defId, Math.max(1, (monster.level || 1) - 2));
            (globalThis._egMonsters || []).forEach(m => { if (!before.has(m.id)) { m._summoned = true; m.noLoot = true; } });
            _egRenderPanel();
        }, 500);
    });
}

// Telegraphed ground circle that lands after `teleMs`. Hits only when the
// player is still inside it (moving out dodges). `fall` adds a falling
// meteor visual. Returns nothing; `onResolve(hit)` runs after detonation.
function _msGroundStrike(monster, el, x, y, r, teleMs, mult, fall, onResolve) {
    const falling = fall ? `<span class="ms-meteor" style="--ms-tele-ms:${teleMs}ms"></span>` : '';
    const tele = _msFx(el, x, y, teleMs + 80,
        `<div class="ms-ground-tele" style="left:${-r}px;top:${-r}px;width:${r * 2}px;height:${r * 2}px;--ms-tele-ms:${teleMs}ms"></div>${falling}`);
    _msTimeout(() => {
        tele.remove();
        _msFx(el, x, y, 650,
            `<div class="ms-ground-blast" style="left:${-r}px;top:${-r}px;width:${r * 2}px;height:${r * 2}px"></div>`);
        _msParticles(el, x, y, fall ? 16 : 8, el === 'cold' ? 'ms-shard' : '', r);
        Audio_Manager.playSFX('monster_projectile_hit');
        if (!_msAlive(monster)) return;
        const rect = _egGetPlayerRectForAilment();
        const hit = !!(rect && _egCircleOverlapsRect(x, y, r, rect));
        if (hit) _msHit(monster, mult, el, true);
        else if (cur && cur.gauntlet && typeof globalThis.gainMana === 'function') {
            // Gauntlet reward for reading the telegraph: a dodge restores a little mana.
            globalThis.gainMana(Math.max(1, Math.round((Number(globalThis.playerMaxMana) || 0) * 0.02)));
        }
        if (onResolve) onResolve(hit);
    }, teleMs);
}

function _msDodgeToast() {
    if (typeof globalThis.showToast === 'function') {
        globalThis.showCombatToast(LANG === 'de' ? '💨 Ausgewichen!' : '💨 Dodged!');
    }
}

function _msScatter(centre, spread) {
    const a = Math.random() * Math.PI * 2;
    const d = spread * Math.sqrt(Math.random());
    return { x: centre.x + Math.cos(a) * d, y: centre.y + Math.sin(a) * d };
}

function _castMeteor(monster) {
    _msWindup(monster, 'meteor', EG_MONSTER_SPELL_CONFIG.windupMs + 150, () => {
        const c = _msCentre(_msPlayerEl());
        if (!c) return;
        Audio_Manager.playSFX('monster_charge_windup');
        _msGroundStrike(monster, 'fire', c.x, c.y, 76, 1150, SPELLS.meteor.mult, true,
            hit => { if (!hit) _msDodgeToast(); });
    });
}

function _castEmberRain(monster) {
    _msWindup(monster, 'ember_rain', EG_MONSTER_SPELL_CONFIG.windupMs, () => {
        const c = _msCentre(_msPlayerEl());
        if (!c) return;
        for (let i = 0; i < 4; i++) {
            _msTimeout(() => {
                if (!_msAlive(monster)) return;
                const p = i === 0 ? c : _msScatter(c, 150);
                _msGroundStrike(monster, 'fire', p.x, p.y, 42, 850, SPELLS.ember_rain.mult, true);
            }, i * 220);
        }
    });
}

function _castIceLance(monster) {
    _msWindup(monster, 'ice_lance', EG_MONSTER_SPELL_CONFIG.windupMs - 150, () => {
        const from = _msCentre(_msCard(monster));
        const to = _msCentre(_msPlayerEl());
        if (!from || !to) return;
        Audio_Manager.playSFX('monster_projectile_launch');
        _msProjectile('ms-orb-cold', 'ms-trail-cold', from, to, 360, 'linear', () => {
            Audio_Manager.playSFX('monster_projectile_hit');
            _msImpact('cold', _msCentre(_msPlayerEl()) || to);
            _msHit(monster, SPELLS.ice_lance.mult, 'cold', true, true);
        });
    });
}

function _castHailstorm(monster) {
    _msWindup(monster, 'hailstorm', EG_MONSTER_SPELL_CONFIG.windupMs, () => {
        const c = _msCentre(_msPlayerEl());
        if (!c) return;
        for (let i = 0; i < 5; i++) {
            _msTimeout(() => {
                if (!_msAlive(monster)) return;
                const p = i === 0 ? c : _msScatter(c, 170);
                _msGroundStrike(monster, 'cold', p.x, p.y, 38, 800, SPELLS.hailstorm.mult, false);
            }, i * 160);
        }
    });
}

function _castThunderStrike(monster) {
    _msWindup(monster, 'thunder_strike', EG_MONSTER_SPELL_CONFIG.windupMs - 100, () => {
        // Three strikes, each aimed where the player stands at that moment:
        // keep moving.
        for (let i = 0; i < 3; i++) {
            _msTimeout(() => {
                if (!_msAlive(monster)) return;
                const c = _msCentre(_msPlayerEl());
                if (!c) return;
                _msGroundStrike(monster, 'lightning', c.x, c.y, 50, 650, SPELLS.thunder_strike.mult, false);
            }, i * 620);
        }
    });
}

function _castDoomOrb(monster) {
    _msWindup(monster, 'doom_orb', EG_MONSTER_SPELL_CONFIG.windupMs + 250, () => {
        const from = _msCentre(_msCard(monster));
        const to = _msCentre(_msPlayerEl());
        if (!from || !to) return;
        Audio_Manager.playSFX('monster_projectile_launch');
        _msProjectile('ms-orb-shadow ms-orb-big', 'ms-trail-shadow', from, to, 1400, 'linear', () => {
            Audio_Manager.playSFX('monster_projectile_hit');
            const hit = _msCentre(_msPlayerEl()) || to;
            _msFx('shadow', hit.x, hit.y, 1000, '<span class="ms-vortex"></span>');
            _msImpact('shadow', hit);
            _msHit(monster, SPELLS.doom_orb.mult, 'shadow', true, true);
        });
    });
}

function _castShadowVolley(monster) {
    _msWindup(monster, 'shadow_volley', EG_MONSTER_SPELL_CONFIG.windupMs, () => {
        for (let i = 0; i < 3; i++) {
            _msTimeout(() => {
                if (!_msAlive(monster)) return;
                const from = _msCentre(_msCard(monster));
                const to = _msCentre(_msPlayerEl());
                if (!from || !to) return;
                const aim = { x: to.x + (i - 1) * 34, y: to.y + (i - 1) * 18 };
                Audio_Manager.playSFX('monster_projectile_launch');
                _msProjectile('ms-orb-shadow', 'ms-trail-shadow', from, aim, 520, 'ease-in', () => {
                    Audio_Manager.playSFX('monster_projectile_hit');
                    _msImpact('shadow', _msCentre(_msPlayerEl()) || aim);
                    _msHit(monster, SPELLS.shadow_volley.mult, 'shadow', i === 2, true);
                });
            }, i * 150);
        }
    });
}

// Seven blasts ring the player's position; the middle stays safe.
function _castInfernoRing(monster) {
    _msWindup(monster, 'inferno_ring', EG_MONSTER_SPELL_CONFIG.windupMs + 150, () => {
        const c = _msCentre(_msPlayerEl());
        if (!c) return;
        Audio_Manager.playSFX('monster_charge_windup');
        const n = 7;
        const radius = 120;
        for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2;
            const x = c.x + Math.cos(a) * radius;
            const y = c.y + Math.sin(a) * radius;
            _msTimeout(() => {
                if (!_msAlive(monster)) return;
                _msGroundStrike(monster, 'fire', x, y, 44, 1000, SPELLS.inferno_ring.mult, true);
            }, i * 70);
        }
    });
}

// A horizontal line of fire sweeps across the player's row: step out of it.
function _castFlameWall(monster) {
    _msWindup(monster, 'flame_wall', EG_MONSTER_SPELL_CONFIG.windupMs, () => {
        const c = _msCentre(_msPlayerEl());
        if (!c) return;
        const fromLeft = Math.random() < 0.5;
        for (let i = 0; i < 5; i++) {
            const x = c.x + (fromLeft ? i - 2 : 2 - i) * 70;
            _msTimeout(() => {
                if (!_msAlive(monster)) return;
                _msGroundStrike(monster, 'fire', x, c.y, 40, 900, SPELLS.flame_wall.mult, false);
            }, i * 110);
        }
    });
}

// Ice erupts from the caster toward the player in a line of spikes.
function _castGlacialSpikes(monster) {
    _msWindup(monster, 'glacial_spikes', EG_MONSTER_SPELL_CONFIG.windupMs, () => {
        const from = _msCentre(_msCard(monster));
        const to = _msCentre(_msPlayerEl());
        if (!from || !to) return;
        for (let i = 0; i < 5; i++) {
            const k = 0.3 + i * 0.18;
            const x = from.x + (to.x - from.x) * k;
            const y = from.y + (to.y - from.y) * k;
            _msTimeout(() => {
                if (!_msAlive(monster)) return;
                _msGroundStrike(monster, 'cold', x, y, 34, 700, SPELLS.glacial_spikes.mult, false);
            }, i * 130);
        }
    });
}

// A slow orb of ice that bursts into a wide frost blast when it arrives.
function _castFrozenOrb(monster) {
    _msWindup(monster, 'frozen_orb', EG_MONSTER_SPELL_CONFIG.windupMs, () => {
        const from = _msCentre(_msCard(monster));
        const to = _msCentre(_msPlayerEl());
        if (!from || !to) return;
        Audio_Manager.playSFX('monster_projectile_launch');
        _msProjectile('ms-orb-cold ms-orb-big', 'ms-trail-cold', from, to, 1100, 'linear', () => {
            if (!_egIsActive()) return;
            Audio_Manager.playSFX('monster_charge_windup');
            _msGroundStrike(monster, 'cold', to.x, to.y, 90, 650, SPELLS.frozen_orb.mult, false);
        });
    });
}

// A wide charged circle that discharges twice in a row.
function _castStaticField(monster) {
    _msWindup(monster, 'static_field', EG_MONSTER_SPELL_CONFIG.windupMs, () => {
        const c = _msCentre(_msPlayerEl());
        if (!c) return;
        Audio_Manager.playSFX('monster_charge_windup');
        _msGroundStrike(monster, 'lightning', c.x, c.y, 118, 1300, SPELLS.static_field.mult, false, () => {
            if (!_msAlive(monster)) return;
            _msGroundStrike(monster, 'lightning', c.x, c.y, 118, 450, SPELLS.static_field.mult, false);
        });
    });
}

// A heavy, slow sphere of lightning that hits hard if you do not dodge it.
function _castBallLightning(monster) {
    _msWindup(monster, 'ball_lightning', EG_MONSTER_SPELL_CONFIG.windupMs + 100, () => {
        const from = _msCentre(_msCard(monster));
        const to = _msCentre(_msPlayerEl());
        if (!from || !to) return;
        Audio_Manager.playSFX('monster_projectile_launch');
        _msProjectile('ms-orb-lightning ms-orb-big', 'ms-trail-lightning', from, to, 1500, 'ease-in-out', () => {
            Audio_Manager.playSFX('monster_projectile_hit');
            const hit = _msCentre(_msPlayerEl()) || to;
            const wrap = document.createElement('div');
            wrap.innerHTML = _boltSvg({ x: hit.x, y: hit.y - 90 }, hit);
            const svg = wrap.firstChild;
            document.body.appendChild(svg);
            _msTimeout(() => svg.remove(), 300);
            _msImpact('lightning', hit);
            _msHit(monster, SPELLS.ball_lightning.mult, 'lightning', true, true);
        });
    });
}

// A large tear in reality that collapses after a long, readable warning.
function _castVoidRift(monster) {
    _msWindup(monster, 'void_rift', EG_MONSTER_SPELL_CONFIG.windupMs + 250, () => {
        const c = _msCentre(_msPlayerEl());
        if (!c) return;
        Audio_Manager.playSFX('monster_charge_windup');
        _msFx('shadow', c.x, c.y, 1500, '<span class="ms-vortex ms-vortex-slow"></span>');
        _msGroundStrike(monster, 'shadow', c.x, c.y, 105, 1500, SPELLS.void_rift.mult, false, () => {
            _msFx('shadow', c.x, c.y, 1000, '<span class="ms-vortex"></span>');
        });
    });
}

// Three dark hands grab at wherever the player stands right now.
function _castGraspingShadows(monster) {
    _msWindup(monster, 'grasping_shadows', EG_MONSTER_SPELL_CONFIG.windupMs, () => {
        for (let i = 0; i < 3; i++) {
            _msTimeout(() => {
                if (!_msAlive(monster)) return;
                const c = _msCentre(_msPlayerEl());
                if (!c) return;
                _msGroundStrike(monster, 'shadow', c.x, c.y, 46, 900, SPELLS.grasping_shadows.mult, false, () => {
                    _msFx('shadow', c.x, c.y, 900, '<span class="ms-vortex"></span>');
                });
            }, i * 500);
        }
    });
}

// Support: an ally (or the caster) hits harder for a few seconds.
function _castEnrage(monster) {
    _msWindup(monster, 'enrage', EG_MONSTER_SPELL_CONFIG.windupMs, () => {
        const pool = (globalThis._egMonsters || []).filter(m =>
            !m.isBoss && !m.isSacrificialZombie && m.currentHP > 0 && !m._enraged);
        const target = pool.find(m => m.id !== monster.id) || pool[0];
        if (!target) return;
        target._enraged = true;
        target._preEnrageDamage = target.damageValue;
        target.damageValue = Math.round(target.damageValue * ENRAGE_MULT);
        const card = _msCard(target);
        if (card) card.classList.add('ms-enraged');
        const pos = _msCentre(card);
        if (pos) {
            _msFx('rage', pos.x, pos.y, 1100,
                '<span class="ms-burst-ring"></span><span class="ms-heal-num ms-rage-num">⚔ ' + (LANG === 'de' ? 'WÜTEND!' : 'ENRAGED!') + '</span>');
            _msParticles('rage', pos.x, pos.y, 10, '', 48);
        }
        Audio_Manager.playSFX('monster_charge_windup');
        _msTimeout(() => {
            target._enraged = false;
            if (target._preEnrageDamage != null) target.damageValue = target._preEnrageDamage;
            const c = _msCard(target);
            if (c) c.classList.remove('ms-enraged');
        }, ENRAGE_MS);
    });
}

const CASTERS = {
    fire_bolt: _castFireBolt,
    frost_nova: _castFrostNova,
    chain_lightning: _castChainLightning,
    soul_drain: _castSoulDrain,
    mend: _castMend,
    summon: _castSummon,
    meteor: _castMeteor,
    ember_rain: _castEmberRain,
    ice_lance: _castIceLance,
    hailstorm: _castHailstorm,
    thunder_strike: _castThunderStrike,
    doom_orb: _castDoomOrb,
    shadow_volley: _castShadowVolley,
    enrage: _castEnrage,
    inferno_ring: _castInfernoRing,
    flame_wall: _castFlameWall,
    glacial_spikes: _castGlacialSpikes,
    frozen_orb: _castFrozenOrb,
    static_field: _castStaticField,
    ball_lightning: _castBallLightning,
    void_rift: _castVoidRift,
    grasping_shadows: _castGraspingShadows,
};

//------------------------------------------------------------------------
//-------------------SELECTION / ENTRY POINT------------------------------
//------------------------------------------------------------------------

export function _egMonsterSpellChance(monster) {
    const cfg = EG_MONSTER_SPELL_CONFIG;
    const lvl = Math.min(cfg.levelCap, Math.max(1, Number(monster.level) || 1));
    let chance = cfg.baseChance + cfg.chancePerLevel * (lvl - 1);
    if (monster.isElite) chance *= cfg.eliteMult;
    if (cur && cur.gauntlet) chance *= cfg.gauntletMult;
    return Math.min(cfg.maxChance * (cur && cur.gauntlet ? cfg.gauntletMult : 1), chance);
}

function _msCanUse(id, monster) {
    if (id === 'mend') return !!_woundedAlly(monster);
    if (id === 'enrage') {
        return (globalThis._egMonsters || []).some(m => !m.isBoss && !m.isSacrificialZombie && m.currentHP > 0 && !m._enraged);
    }
    if (id === 'summon') {
        if (monster._summoned) return false;                       // minions never chain-summon
        if ((monster._summonsCast || 0) >= 1) return false;        // one summon per caster
        return (globalThis._egMonsters || []).length < EG_MAX_CONCURRENT_MONSTERS - 1;
    }
    return true;
}

function _msPick(monster) {
    const pool = (POOLS[monster.element] || POOLS.none).filter(id => _msCanUse(id, monster));
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
}

// Called when a monster's charge bar fills. Returns true when a spell was
// started (the caller must then skip the plain attack).
export function _egMaybeCastMonsterSpell(monster) {
    if (!monster || monster.isBoss || monster.isSacrificialZombie || !_egIsActive()) return false;
    if (cur && cur.isTutorialQuest) return false;   // tutorial monsters only ever attack plainly
    const now = Date.now();
    if (monster._spellReadyAt && now < monster._spellReadyAt) return false;
    if (Math.random() >= _egMonsterSpellChance(monster)) return false;
    const id = _msPick(monster);
    if (!id) return false;
    monster._spellReadyAt = now + EG_MONSTER_SPELL_CONFIG.cooldownMs;
    CASTERS[id](monster);
    return true;
}
