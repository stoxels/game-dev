//------------------------------------------------------------------------
//-------------------BOSS TEMPLATE (copy to boss-<id>.js)-----------------
//------------------------------------------------------------------------
// HOW TO ADD A NEW BOSS:
//   1. Copy this file to js/endgame/bosses/boss-<yourid>.js
//   2. Replace 'boss_template' with your id in BOTH Object.assign blocks
//   3. Tune baseHP / baseDamage / chargeMax / element / resistances
//   4. Define phases (threshold 1.00 → 0.00) + immunityDuration
//   5. Schedule mechanics: shared ones by handler-name string, unique ones
//      as new _egMech<Name> functions in this file
//   6. Add a <script src="js/endgame/bosses/boss-<yourid>.js"></script> tag
//      in index.html AFTER shared-boss-abilities.js
//
// Handler-name strings are resolved via window[handler] at fire time, so a
// typo fails silently (mechanic never fires) — double-check the names.
//------------------------------------------------------------------------

Object.assign(EG_BOSS_DEFS, {
    // boss_template: {
    //     id: 'boss_template', name: 'Template', emoji: '❓',
    //     baseHP: 1000, baseDamage: 22, chargeMax: 12,
    //     element: null, resistances: { fire: 10, cold: 10, lightning: 10, shadow: 10 }
    // },
});

Object.assign(EG_BOSS_MECHANICS, {
    // boss_template: {
    //     phases: [
    //         { threshold: 1.00, chargeMax: 12, damageMultiplier: 1.0 },
    //         { threshold: 0.60, chargeMax: 9, damageMultiplier: 1.5 },
    //         { threshold: 0.30, chargeMax: 6, damageMultiplier: 2.0 },
    //     ],
    //     immunityDuration: 2500,
    //     mechanics: [
    //         // Shared example (defined in shared-boss-abilities.js):
    //         // { name: 'corrupt_cells', intervalBase: 17000, intervalVariance: 4000, handler: '_egMechCorruptCells' },
    //         // Unique example (define _egMechTemplateSlam below):
    //         // { name: 'template_slam', intervalBase: 19000, intervalVariance: 4000, handler: '_egMechTemplateSlam' },
    //     ],
    // },
});

// function _egMechTemplateSlam(monster, phase) {
//     // Unique boss mechanic goes here. Use the _egNk* helpers from
//     // shared-boss-abilities.js for dodge-style mechanics.
// }
