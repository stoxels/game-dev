//------------------------------------------------------------------------
//-------------------PLAYER DAMAGE CALCULATION----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

function _egCalcPlayerDamage() {
    const stats = _egComputePlayerStats();

    let dmg = EG_PLAYER_STATS.baseDamage;
    dmg += stats.physFlatMin + (stats.physFlatMax - stats.physFlatMin) * Math.random();
    dmg *= (1 + stats.physIncPct / 100);

    // Elemental damage adds after the physical multiplier — it isn't scaled by inc_physical_damage.
    dmg += _egGetElementalDamageBonus(stats);

    const critMult = _egRollCrit(stats);
    dmg *= critMult;
    dmg = Math.max(1, Math.round(dmg));

    if (critMult > 1 && typeof showToast === 'function') showToast('💥 Critical Hit!');

    // Life leech — heal the player for a % of the damage about to be dealt.
    if (stats.lifeLeechPct > 0 && typeof playerCurrentHP !== 'undefined') {
        const heal = Math.round(dmg * (stats.lifeLeechPct / 100));
        if (heal > 0) {
            playerCurrentHP = Math.min(playerMaxHP, playerCurrentHP + heal);
            if (typeof _renderPlayerHealth === 'function') _renderPlayerHealth();
        }
    }

    return dmg;
}