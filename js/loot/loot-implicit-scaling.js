import { LANG } from '../translation/translations.js';

//----------------------------------------------------------------------
//------------------------IMPLICIT LEVEL SCALING------------------------
//----------------------------------------------------------------------

// Pure math over the family table: clamping a required level onto the 1-90
// ladder, interpolating a family's lo/hi pair into a concrete range (hybrid
// and float families included), and sampling a value out of that range. No
// item shapes live here.

export const EG_IMPLICIT_LEVEL_MIN = 1;
export const EG_IMPLICIT_LEVEL_MAX = 90;

export function _egImplicitClampLevel(lvl) {
    const n = Number(lvl) || 1;
    return Math.max(EG_IMPLICIT_LEVEL_MIN, Math.min(EG_IMPLICIT_LEVEL_MAX, n));
}

export function _egImplicitLerp(a, b, t) {
    return a + (b - a) * t;
}

export function _egImplicitIsLocalDefense(familyId) {
    return familyId === 'inc_armour' || familyId === 'inc_evasion' || familyId === 'inc_absorption';
}

export function _egImplicitAllowedOnBase(familyId, defenses) {
    if (!_egImplicitIsLocalDefense(familyId)) return true;
    if (!defenses) return false;
    if (familyId === 'inc_armour') return (defenses.armour || 0) > 0;
    if (familyId === 'inc_evasion') return (defenses.evasion || 0) > 0;
    if (familyId === 'inc_absorption') return (defenses.absorption || 0) > 0;
    return true;
}

// Returns { min, max } or { min1,max1,min2,max2 } interpolated for reqLevel
export function _egGetImplicitRange(family, reqLevel) {
    const lvl = _egImplicitClampLevel(reqLevel);
    const t = (lvl - EG_IMPLICIT_LEVEL_MIN) / (EG_IMPLICIT_LEVEL_MAX - EG_IMPLICIT_LEVEL_MIN);
    const lo = family.lo, hi = family.hi;
    if (lo.min1 !== undefined) {
        return {
            min1: Math.round(_egImplicitLerp(lo.min1, hi.min1, t)),
            max1: Math.round(_egImplicitLerp(lo.max1, hi.max1, t)),
            min2: Math.round(_egImplicitLerp(lo.min2, hi.min2, t)),
            max2: Math.round(_egImplicitLerp(lo.max2, hi.max2, t)),
        };
    }
    if (family.isFloat) {
        return {
            min: Math.round(_egImplicitLerp(lo.min, hi.min, t) * 10) / 10,
            max: Math.round(_egImplicitLerp(lo.max, hi.max, t) * 10) / 10,
        };
    }
    return {
        min: Math.round(_egImplicitLerp(lo.min, hi.min, t)),
        max: Math.round(_egImplicitLerp(lo.max, hi.max, t)),
    };
}

export function _egRollImplicitValue(range) {
    if (range.min1 !== undefined) {
        const v1 = range.min1 + Math.floor(Math.random() * (range.max1 - range.min1 + 1));
        const v2 = range.min2 + Math.floor(Math.random() * (range.max2 - range.min2 + 1));
        return { v1, v2 };
    }
    if (Number.isFinite(range.min) && range.min % 1 !== 0 || range.max % 1 !== 0) {
        // float range (attack_speed)
        const lo = Math.min(range.min, range.max);
        const hi = Math.max(range.min, range.max);
        const v = Math.round((lo + Math.random() * (hi - lo)) * 10) / 10;
        return { v };
    }
    const lo = Math.min(range.min, range.max);
    const hi = Math.max(range.min, range.max);
    const v = lo + Math.floor(Math.random() * (hi - lo + 1));
    return { v };
}

export function _egBuildImplicitRolledStats(family, reqLevel) {
    const range = _egGetImplicitRange(family, reqLevel);
    const label = (typeof LANG !== 'undefined' && LANG === 'de' && family.labelDe) ? family.labelDe : family.label;
    if (range.min1 !== undefined) {
        const { v1, v2 } = _egRollImplicitValue(range);
        // hybrid: label contains both # and @
        return [
            { key: family.id + '_1', label: label.replace('#', v1).replace('@', v2), value: v1 },
            { key: family.id + '_2', label: label.replace('#', v1).replace('@', v2), value: v2 },
        ];
    }
    const { v } = _egRollImplicitValue(range);
    return [
        { key: family.id, label: label.replace('#', v), value: v },
    ];
}
