//----------------------------------------------------------------------
// GENERATED FILE - DO NOT EDIT BY HAND
// Produced by: node tools/prepare-bundle.mjs
// Source of truth: index.html script order (LOAD-ORDER SENSITIVE!)
// Regenerate after ANY change to js/ or index.html.
//
// Phase 2: all files concatenated into ONE ES module scope, in exact
// index.html order. Implicit cross-file globals keep working (one
// shared scope, like the classic-script era). The globalThis bridge
// after each file re-exposes top-level declarations the way classic
// scripts did (function/var as window properties; let/const via live
// accessors so window.X reads and boot-loader.js indirect-eval probes
// keep working). Modules are implicitly strict; see report.md for the
// pre-verified strict-mode hazard scan.
//
// Phase 3: files listed in tools/module-manifest.json are REAL ES modules
// imported above the concatenated body. Their exports are entry-scope
// bindings; concatenated files may reference them bare. See MIGRATION.md.
//----------------------------------------------------------------------

//--- Phase 3: real ES module imports (tools/module-manifest.json) ---
import { BGM_TRACKS, BOSS_BGM, TUTORIAL_BGM, LEVEL_BGM, WORLD_BGM, SFX, SFX_LOOPS } from '../../js/audio/audio-data.js';
import { Audio_Manager } from '../../js/audio/audio.js';
import { T } from '../../js/translation/translations-strings.js';
import { getActiveDictionary, t, updateLangButtons, stripTitleButtonIcon, applyTranslationsToDOM, updateTitleExpansionLogos, setLang } from '../../js/translation/translations.js';
import { ACHIEVEMENT_DEFS } from '../../js/achievements/achievements-data.js';
import { ACH_STATE, _doResetAchievements, checkWorldCompleteAch, onLevelCompleteAch, saveAchState, setAchStat, showResetAchievementsModal, trackAchStat, trackAchUnique } from '../../js/achievements/achievements.js';
import { SAVE_SLOT_COUNT, _migrateAscendencyFields, _migrateCharmFields, _migrateClassFields, _migrateCoreFields, _migrateEndgameFields, _migratePassiveTreeFields, _resetLevelFlags, buildFreshState, beginPassiveTreeCharacterPreview, endPassiveTreeCharacterPreview, getActiveSlot, getPassiveTreeCharacterRootId, getSlotName, getSlotSummary, initState, loadRawSaveFromSlot, loadStateFromSlot, migrateOldSave, reconcilePassiveTreeForClass, save, setActiveSlot, setSlotName, wipeSlot } from '../../js/state.js';
import { _applyLowHealthVignette, _applyLowTimeVignette, _calcEmergencyScanDuration, _clearCenterGridBanners, _resetLowTimeWarningState, _trackTimerDelta, resumeTimer, timerInterval, timesUp, updTimer } from '../../js/timer/timer.js';
import { addTimeSecs, previewGainSecs, setTimeSecs, subtractTimeSecs } from '../../js/timer/timer-adjust.js';
import { bumpFreezeCorrFills, endTimerFreeze, resetFreezeCorrFills, startTimerFreeze } from '../../js/timer/timer-freeze.js';
import { _adjacencyMatrixRefreshAll, _clueColCount, _clueColWidth, _isColSolved, _isRowSolved, _rowCluesOnRight, buildReveal, clues } from '../../js/grid.js';
import { _getAsymptoticMasteryReduction, _getPenaltySecondsAtCount, _updateMistakeCounterHUD } from '../../js/penalty.js';
import '../../js/scoring/scoring.js';
import { _getLevelSpecialStatus, awardAtlasClearScore, calculateScore, checkIsConvergenceLevel, checkIsLargeAdjMatrix, checkWorldJustCompleted, computeMonsterPointsAwarded, computePointsAwarded, computeRawScore, countFilledCells, countMarkedCells, evaluateBonusObjective, fireAchievements, isConvergenceLevel, isPuzzleSolved, maybeUpdateHighScore, monsterKillScore, recordMonsterKillScore } from '../../js/scoring/scoring-core.js';
import { renderWinOverlay, rollLuckyDrops, formatTime } from '../../js/scoring/scoring-rewards.js';
import { ITEM_DEFS, ITEM_GROUPS } from '../../js/puzzle-items/item-definitions.js';
import { RARITY_COLOR_MAP, itemDesc, itemName, pickLuckyItem, pickRandomItem, rarityColors } from '../../js/puzzle-items/item-pool.js';
import { CELL_FX_DURATION, _applyCellEffect, _ensureCellEffectCSS } from '../../js/puzzle-mechanics/cell-fx.js';
import { CHAOS_BLAST_COLOURS, CHRONOBOLT_X_FRACTIONS, FX_Z, PARTICLES, PEARL_VARIANTS, TUTOR_ITEM_SFX, _ensureFreezeCountdownStyles, _fxItemUse, _fxSlotRect, _fxClock, _fxGetGridCorners, _fxGetPuzzleRect, _fxGetPuzzleRectForWrap, _fxMakeClockBurst, _fxMakeClockRays, _fxMakeElement, _fxMakeGoldTintFill, _fxMakeIcon, _fxMakeRing, _fxOverlay, _fxShieldBorderAdd, _fxShieldBorderRemove, _fxSpawnParticles, playFreezeCountdownOverlay } from '../../js/puzzle-mechanics/fx-helpers.js';
import { rnd, pick, later, gridBox, piece, glyph, ring, glow, sparks, bar, cellRects, cellWave, tint, shake } from '../../js/puzzle-items/landing/landing-toolkit.js';
import { LANDING_REVEAL_MARK_TIME } from '../../js/puzzle-items/landing/landing-reveal-mark-time.js';
import { LANDING_UTILITY } from '../../js/puzzle-items/landing/landing-utility.js';
import { LANDING_CURSED_SPECIAL } from '../../js/puzzle-items/landing/landing-cursed-special.js';
import { _fxItemLanding } from '../../js/puzzle-items/landing/item-landing.js';
import { _applyDenseMarkerBias, _applyTargetedRevealBias, _getPreFilledCols, _getPreFilledRows, shuffle } from '../../js/puzzle-mechanics/puzzle-helpers.js';
import { _trackWitchImmuneCursedUse } from '../../js/puzzle-mechanics/quest-tracking.js';
import { _clearBlackoutCountdown, applyCursedRowBlackout, applyCursedColBlackout } from '../../js/puzzle-mechanics/clue-blackout.js';
import { _eraseFilledCellsInCol, _eraseFilledCellsInRow, solveCols, solveRows, unsolveCols, unsolveColsExcluding, unsolveRows, unsolveRowsExcluding } from '../../js/puzzle-mechanics/grid-actions.js';
import { _cursedDownsideSuppressed, _resolveCursedBlackoutDownside, _resolveCursedColErasureDownside, _resolveCursedRowErasureDownside } from '../../js/puzzle-mechanics/cursed-downside.js';
import { _calcAddTimeSecs, _calcMarkWrongCount, _calcTutorItemCount, _calcRevealCount } from '../../js/puzzle-mechanics/effect-modifiers.js';
import { attachItemTooltip, buildInventoryPanel, closeInventoryFlyout, openInventoryFlyout, pinInventoryFlyout, unpinInventoryFlyout } from '../../js/puzzle-item-inventory/puzzle-item-inventory-panel.js';
import { _fxCandle, _fxCandleGlow, _fxMagnifier, _fxMakeScanBar, _fxScanner, _fxSpawnExpandingRings, _fxSpyglass, _useReveal } from '../../js/puzzle-items/reveal/reveal.js';
import { _fxEraser, _fxErrorGem, _fxErrorMagnet, _fxSweeper, _useMarkWrong } from '../../js/puzzle-items/mark-wrong.js';
import { _fxChronobolt, _fxHourglass, _fxStopwatch, _useAddTime } from '../../js/puzzle-items/add-time/add-time.js';
import { _fxMakeShieldOverlay, _fxShield, _useShield, playShieldBreakEffect } from '../../js/puzzle-items/shield/shield.js';
import { FREEZE_DURATION_MS, _fxFreeze, _useFreeze } from '../../js/puzzle-items/freeze/freeze.js';
import { _fxMakeChalkSmears, _fxTutorItem, _useTutorItem } from '../../js/puzzle-items/tutor-item/tutor-item.js';
import { _fxMakePrimerArrows, _fxScoutPrimer, _useScoutPrimer } from '../../js/puzzle-items/scouts-primer/scouts-primer-item.js';
import { _fxColSolve, _fxMakeColSolveLines, _fxMakeColSolveSweep, _fxMakeRowSolveLines, _fxMakeRowSolveSweep, _fxRowSolve, _useColSolve, _useRowSolve } from '../../js/puzzle-items/row-col-solve/row-col-solve.js';
import { _collectScopeCells, _ensureSurveyScopeStyles, _fxSurveyScope, _useSurveyScope } from '../../js/puzzle-items/survey-scope/survey-scope.js';
import { _fxArtifact, _fxMakeArtifactFill, _fxMakeArtifactRays, _useArtifactComplete } from '../../js/puzzle-items/artifact-complete/artifact-complete.js';
import { _fxCursedReveal, _fxMakeCursedTint, _useCursedReveal } from '../../js/puzzle-items/cursed/cursed-reveal.js';
import { _fxCursedTime, _useCursedTime } from '../../js/puzzle-items/cursed/cursed-time.js';
import { _fxCursedShield, _fxMakeEyeScanLines, _useCursedShield } from '../../js/puzzle-items/cursed/cursed-shield.js';
import { _fxMakeWave, _fxTidalWave, _useCursedRowSolve } from '../../js/puzzle-items/cursed/cursed-row-solve.js';
import { _fxMakeVortexStrips, _fxVortex, _useCursedColSolve } from '../../js/puzzle-items/cursed/cursed-col-solve.js';
import { _fxChaosGrid, _fxDetonateBlast, _useCursedRowCol } from '../../js/puzzle-items/cursed/cursed-row-col.js';
import { _fxMakePearlRings, _fxPearl, _resetCooldownSlot, _useGrandPearl, _usePearlOfHaste, _usePearlOfSwiftness } from '../../js/puzzle-items/pearls/pearls.js';
import { _fxTheWitch, _useTheWitch } from '../../js/puzzle-items/the-witch/the-witch.js';
import { _fxGoldenClock, _useGoldenClock } from '../../js/puzzle-items/golden-clock/golden-clock.js';
import { _fxMakeShadowVeil, _fxShadowSeal, _useShadowSeal } from '../../js/puzzle-items/shadow-seal/shadow-seal.js';
import { _fxChronoFracture, _useChronoFracture } from '../../js/puzzle-items/chrono-fracture/chrono-fracture.js';
import { playItemEffect } from '../../js/puzzle-items/item-fx-dispatcher.js';
import { _consumeItem } from '../../js/puzzle-items/use-item.js';
import { RESHUFFLE_GOAL, RESHUFFLE_MAX_ATTEMPTS, RESHUFFLE_PICK_COUNT, applyReshuffleChoice, attachReshuffleCardHandlers, buildReshuffleCardHtml, buildReshuffleModalElement, checkReshuffleGoalReached, openReshuffleModal, pickReshuffleRewardItems, removeItemFromInventory, reshuffleCount, reshuffleRightClickItem, updateReshuffleCounter } from '../../js/puzzle-item-inventory/puzzle-item-reshuffle.js';
import { HOARDER_THRESHOLD, ITEM_GAIN_POPUP_FADE_MS, ITEM_GAIN_POPUP_HOLD_MS, RARITY_TIERS, TOAST_DISPLAY_DURATION_MS, TOAST_MAX_VISIBLE, _checkCollectorAchievement, _checkHoarderAchievement, _clearItemGainPopup, _discardToastEntry, _ensureItemGainPopupStyle, _escapeToastHtml, _findInvSlotEl, _hasAllRarityTiers, _itemGainPopupState, _itemGainPopupStyleInjected, _positionItemGainPopup, _removeToast, _scheduleItemGainPopupDismiss, activeToasts, checkInventoryAchievements, puzzleItemIconHtml, resetToastQueue, showCombatToast, showHtmlToast, showItemGainPopup, showItemToast, showToast } from '../../js/puzzle-mechanics/toasts-and-popups.js';
import { primerUseTutor, showPrimerModal, skipPrimer, submitPrimerAnswer } from '../../js/puzzle-items/scouts-primer/scouts-primer.js';
import { PRIMER_COL_BONUS_TABLE, PRIMER_MAX, PRIMER_ROW_BONUS_TABLE, PRIMER_TIER_COLOURS, applyPerfectPrimerReveal, applyPrimerHeadstart } from '../../js/puzzle-items/scouts-primer/scouts-primer-reveal.js';
import { _achToastQueue, _drainAchToastQueue, backToAchCategories, buildAchievementsScreen, showAchResetModal, showAchievements } from '../../js/achievements/achievements-ui.js';
import '../../js/title-bindings.js';
import { pval, dragStartRow, dragStartCol, isCombatLevel, _checkAllClaims, handleWrongFill, applyCell, cellDown, stopPainting, updateTouchpadModeButtonVisibility, _refreshTouchpadModeButtonLabel, toggleTouchpadMarkMode } from '../../js/mouse-button-handlers.js';
import { clearHover, _countAdjacentPrefillRun, onHover, onHoverOut, dragCounterApply, dragCounterClear } from '../../js/mouse-over.js';
import { showHS } from '../../js/screens/screens-highscore.js';
import { MOD_LABELS, MOD_CLASSES, buildNextTitleStr, applyClassStatusActiveStyle, applyClassStatusEmptyStyle, renderLevelSelect, isLevelConvergence, isMaxCleared } from '../../js/screens/screens-level-select.js';
import { _ensureTooltipElement, _trackTooltipToMouse, _hideWorldTooltip, _renderTopBarScore, _renderTopBarNextCode, _renderTopBarClassStatus, _renderTopBarQuestBadge, _renderTopBarTreePoints, _wireTopBarButtons, initMapViewToggle, showMapView } from '../../js/screens/screens-map-view.js';
import { onSaveSlotChosen, renderSaveSlotScreen, showSaveSlotSelect, confirmSlotName, cancelSlotName } from '../../js/screens/screens-save-slots.js';
import { WD_WORLD_CONFIGS } from '../../js/screens/screens-world-levels-config.js';
import { _wdCurrentWi, wdGoBackToMap, _wdSyncSpriteToLevel, showWorldDetail } from '../../js/screens/screens-world-levels.js';
import { switchScreen, showModal, hideModal, _refreshQuestionModalFlag, hideResultOverlays, _maybeShowConvergenceModal, showTitle, enterNexusFromSetup, showSetup, confirmSetup, launchExistingGame, launchEndgameTestMode, launchVendor, goToLevelSelect, goToPreviousScreen, goToNextLevel } from '../../js/screens/screens.js';
import { initWorldProto, showWorldProto } from '../../js/world-proto/world-proto.js';
import { CLASS_DEFS, CLASS_LIST, CLASS_SPELL_ICONS, COMBAT_HEARTBLOOM_DEF } from '../../js/classes/class-defs.js';
import { ASCENDENCY_DEFS, ASCENDENCY_SPELL_ICONS } from '../../js/classes/ascendency-defs.js';
import { ALL_SLOTS, ASCENDENCY_LIST, SLOT_DISPLAY_INDEX, _abilityHotkeysBlocked, _formatCooldown, _getAbilityData, _getAbilityName, _getGlobalCooldownReduction, _isModalOpen, _patchCooldownButton, _showCooldownReadyToast, cooldownState, getEffectiveCooldown, hasAscendency, isAscendencyMaxed, isBaseClassMaxed, reduceSlotCooldown, startSlotCooldown } from '../../js/classes/class-cooldown-state.js';
import { _clsGetLocalizedName, applyAscendencyUpgrade, applyClassUpgrade, areAllWorldLevelsDone, checkWorldCompletion, closeClassOverlay, confirmAscendencySelection, confirmClassChange, confirmClassSelection, grantClassChangeToken, hideClassTooltip, positionClassTooltip, showAscendencyTooltip, showAscendencyUpgradeTooltip, showClassChange, showClassTooltip, showUpgradeTooltip, triggerClassEventIfPending, updateClassChangeButtons } from '../../js/classes/class-ui.js';
import { CLASS_HUD_HINT_MAX_USES, HUD_COLOR_PASSIVE, _applyTooltipPosition, _formatCooldownLabel, _getAscendencySkillLevel, _getRankWord, buildClassHUD, getLocalDesc, getLocalName, handleHUDTip, handleHUDTipMove, hideHUDTooltip, moveHUDTooltip, showHUDTooltip, updateMomentumBar } from '../../js/classes/class-hud.js';
import { hideLsClassTooltip, moveLsClassTooltip, showLsClassTooltip } from '../../js/classes/class-hud-levelselect-tooltip.js';
import { _applyProbabilistPassive, _filterMarkedIds, _filterRevealedIds, _getAscendencySlotData, _getPassiveEffect, _resolveCell, _revealFilledCell, _setAbilityMode, applyClassPassiveOnLevelStart, executeActiveAbility, getClassPenaltyMultiplier, onCorrectFill, onMistake } from '../../js/classes/class-abilities.js';
import '../../js/classes/class-skill-fx.js';
import { _scaleAbilityManaCost, _applyManaCostModifiers, _getPlayerMaxMana, _getAbilityManaCost, canAffordMana, _bloodMagicActive, canAffordLifeCost, _abilityCanAfford, gainMana, spendMana, payAbilityCost, updateClassHUDManaBar, _resetPlayerMana } from '../../js/classes/class-mana.js';
import { HEARTBLOOM_SKILL_ID, SKILL_HOTBAR_COLS, SKILL_HOTBAR_SIZE, SKILL_REGISTRY, _defaultSkillHotbar, activateHotbarSlot, activateSkill, canAffordSkill, getHotbarSkill, getPassiveSkillDef, getPlayerTraits, getSkillCooldown, getSkillCooldownRemaining, getSkillDamage, getSkillDef, getSkillDesc, getSkillEffect, getSkillImage, getSkillLevel, getSkillManaCost, getSkillName, isSkillPassive, isSkillUsableNow } from '../../js/skills/skill-registry.js';
import { handleSkillTip, handleSkillTipLeave, handleSkillTipRank, handleSkillTipMove } from '../../js/skills/skill-tooltip.js';
import { _hotbarClasslessHasSpells, _isGameScreenActive, initSkillHotbar, patchHotbarCooldownForLegacySlot, patchHotbarSlotCooldown, refreshSkillUI, renderSkillHotbar, setHotbarAboveModal } from '../../js/skills/skill-hotbar.js';
import { buildSpellbookHeadHTML, closeSpellbook, isSpellbookOpen, openSpellbook, renderSpellbook, toggleSpellbook, _sbSpellSchoolKey } from '../../js/skills/skill-spellbook.js';
import { USP_THEME_PROJ, _uspProjDefFor, _uspTelegraph, _uspSupportCastFX, _uspSupportPulseFX, _uspBlinkFX, _uspMoveSpriteOffset, _uspAnchorMarkerShow, _uspAnchorMarkerClear, _uspFireThemedProjectile, _uspZoneRain, _uspZoneBlast, _uspMeleeSwing, _uspArrowFan, _uspBladeBlastPlant, _uspMendHearts, _uspRenewalBloom, _uspRenewalClear, _uspRenewalPulse, _uspBarrierRaise, _uspBarrierStart, _uspBarrierStop, _uspBulwarkWall, _uspBulwarkClear, _uspWindwardGale, _uspWindwardClear, _uspAegisWardShow, _uspAegisWardHit, _uspAegisWardClear, _uspRetributionShow, _uspRetributionFlare, _uspRetributionClear, _uspWindstepTailwind, _uspWindstepClear } from '../../js/skills/universal-spell-fx.js';
import '../../js/skills/spell-fx-kit.js';
import '../../js/skills/spell-fx-recipes.js';
import '../../js/skills/spell-charge-fx.js';
import { UNIVERSAL_SPELL_DEFS, UNIVERSAL_SPELL_MAP, noteUniversalReaction, isUniversalReactionReady, getUniversalSpellReaction, clearUniversalReactions, USP_WARD_MIN_HIT_PCT, _registerUniversalSpells, _uspApplyHealingPower, _uspApplySupportMitigation, _uspBuildSupportStatusIconsHTML, _uspCalcAbsorb, _uspCalcArmourPct, _uspCalcDodgePct, _uspCalcDrPct, _uspCalcHeal, _uspCalcHotTick, _uspCalcThornsPct, _uspCalcWardCharges, _uspClearSupportBuffs, _uspGetSupportMitigation, _uspGroupTitle, _uspHealingPower, _uspMaxAbsorption, _uspMaxLife, _uspMovementGroupTitle, _uspMovementSpeedMult, _uspRankAdditive, _uspReflectThorns, _uspSupportGroupTitle, _uspSupportRankMult, _uspSupportStatusSignature, _uspTryWardNegate, canAffordUniversalSpell, castUniversalSpell, endUniversalChannel, fireUniversalChannelTick, getUniversalSpellChargeRechargeRemaining, getUniversalSpellCastKind, getUniversalSpellCharges, getUniversalSpellCooldownRemaining, getUniversalSpellDamageEstimate, getUniversalSpellDef, getUniversalSpellEffectiveCooldown, getUniversalSpellManaCost, getUniversalSpellMovementEstimate, getUniversalSpellSupportEstimate, isUniversalAuraActive, isUniversalMovementSpell, isUniversalSpellUnlocked, isUniversalSupportSpell, isUspAnchorArmed, stopAllUniversalAuras } from '../../js/skills/universal-spells.js';
import { getSkillCastTimeSeconds, isSkillHoldCast, isHoldCasting, tryBeginHoldCast, getCursorPoint, resolveGroundShape, shapeHitsRect, getAvatarCentre, showSpellZone, isSpellTargeting, cancelSpellTargeting, beginSpellTargeting } from '../../js/skills/spell-casttime.js';
import { CHARM_ORB_DAMAGE_PCT, CHARM_BASE_ICON, CHARM_SLOT_COUNT, SPELL_MAX_RANK, SPELL_RANK_DAMAGE_MULT, SPELL_RANK_MANA_MULT, SPELL_MANA_COST_OVERRIDES, _charmAutoClaimOnReveal, _charmCellHasDrop, _charmCheckClaim, _charmDiscardDrop, _charmMake, _charmRenderOverlay, _charmReplaceCarriedDrops, _charmStopDrops, _charmTryMonsterDrop, _charmDrops, charmKeyFor, charmRankMeetsPlayerLevel, ensureCharmState, getCharmArtForSkill, getCharmByKey, getCharmCastingDamageMult, getCharmLockedSkillForLegacySlot, getCharmRankMinPlayerLevel, getCharmNextRankGate, getCharmSkillDamageMult, getCharmSkillOrbBonusPct, getCharmSlottedRank, getSkillCastRankClamped, getSkillCastRankClampedForSlot, getSkillCastRankFull, getSkillIdForLegacySlot, getSkillMaxRank, getSkillRankManaMultForSlot, getSpellRankDamageMult, getSpellRankDamageMultForSkill, getSpellRankManaMult, getSpellRankManaMultForSkill, getSpellManaCostOverride, getSkillManaCostOverrideForSlot, getSpellManaCostOverrideForSkill, grantCharm, handleCharmCurrencyTip, handleCharmEmptySlotTip, handleCharmMaxRankToggle, initCharmPanelInteractions, isSkillCharmUnlocked, noteCharmCast, promoteCharmSlotToRank, renderSpellbookCharmPanel, setCharmSlot } from '../../js/skills/skill-charms.js';
import { _dataStrikeCancel, _dataStrikeResolve, _diagStrikeClearPreview, _diagStrikeUpdatePreview, _executeDataStrike, _executeDiagonalStrike, _momentumClearParticlesImmediate, _momentumParticlesOnMistake, _momentumSpawnParticle, _playDivineProcEffect, _statisticianTriggerMomentum } from '../../js/classes/class-statistician.js';
import { _executeArcaneReveal, _arcaneReveal_clearPreview, _arcaneReveal_updatePreview } from '../../js/classes/class-mathmagician.js';
import { _varianceShield_removeBubble, _varianceShield_updateVisibility, _varianceShield_playCometImpact, _varianceShield_absorbMistake } from '../../js/classes/class-mathmagician-variance-shield.js';
import { _executeArcaneFreeze, _startBlizzardEffect, _arcaneFreeze_applyPersistentFrost, _arcaneFreeze_spawnStalagmite, _arcaneFreeze_clearStalagmiteIfWrongMarkGone, _arcaneFreeze_clearAllFrostAndStalagmites } from '../../js/classes/class-mathmagician-absolute-zero.js';
import { _executeFieldScan, _executeFieldScanLegacy, _executePrecisionMark, _fieldScanClearPreview, _fieldScanUpdatePreview, _playBayesianInsightAnimation, _playBayesianRevealEffect, _shuffleArray } from '../../js/classes/class-probabilist.js';
import { _executeTailRisk, _formatTimeCost, _tailRiskApplyTimeCost, _tailRiskBindSliderCost, _tailRiskBuildOverlayHTML, _tailRiskCancel, _tailRiskGetCandidateCells, _tailRiskPostReveal, _tailRiskRefundCooldown, _tailRiskRemoveOverlay, _tailRiskResolve, _tailRiskRevealCells, _tailRiskShowOverlay } from '../../js/classes/class-outlier.js';
import { _endBlackSwan, _executeBlackSwan } from '../../js/classes/class-outlier-black-swan.js';
import { _executeRegressionToPrior, _executeSignificanceThreshold, _refundCooldown, _sigThresholdIntercept, actuaryLogMistake } from '../../js/classes/class-actuary.js';
import { _executeDegreesOfFreedom, _executeResidual, _fadeOutElement, resetRecursionistState } from '../../js/classes/class-recursionist.js';
import { _executeBrownianMotion, _executeSummonDrifter } from '../../js/classes/class-random-walker.js';
import { _executeStateRollback, _markovSnapshotTick, resetMarkovianState } from '../../js/classes/class-markovian.js';
import { _clearTransitionMatrix, _executeTransitionMatrix, _transitionMatrixCascade } from '../../js/classes/class-markovian-transition.js';
import { _bayesTrapsSelectType, _bayesTrapsCancel, _bayesTrapsCleanup, _bayesTrapPlacementClick, _executeBayesTraps, _bayesTrapProtectionIntercept } from '../../js/classes/class-bayesian.js';
import { _executeTypeIShield, _typeIShieldIntercept } from '../../js/classes/class-bayesian-type-i.js';
import { TALENT_TREE_DATA } from '../../js/probability-tree/probability-tree-data.js';
import { isPassiveTreeLayoutCacheValid, passiveTreeLayoutFingerprint, precomputePassiveTreeLayoutData, relaxPassiveTreeLayout, resolvePassiveTreeLayout } from '../../js/probability-tree/probability-tree-layout.js';
import { PT_REWORKED_NODE_IDS, isPassiveTreeNodeReworked } from '../../js/probability-tree/probability-tree-rework.js';
import { PT_EFFECT_DEFS, ptParseEffectSpec, ptEffectChannels, ptNodeHasEffects, ptGenerateNodeDesc, ptResolveNodeDesc } from '../../js/probability-tree/pt-effects.js';
import { PT_BRANCH_STATISTICIAN, PT_CLUSTER_CHECKS, PT_LUCKY_BUILD_KEYS, PT_OUTER_RIM_KEYS, _ptAllocated, _ptBfsReachable, _ptBuildAdjacency, _ptCheckCluster, _ptGetNodeVisualState, _ptHandleAllocation, _ptIsDeallocatable, _ptIsUnlockable, _ptLang, _ptOnNodeClick, _ptPoints, _ptRefreshPointsDisplay, _ptRefundAllPoints, _ptTrackAllocationAchievements, _ptTrackBranchCompletions, _ptTrackGodNodeAchievements, _ptTrackKeystoneAchievements, _ptTrackOuterRimCount, _ptTrackSimpleAchievements, _pt_adjacency, ensurePassiveTreeRoot, ptHasSkill, _ptTrackClusterCompletions } from '../../js/probability-tree/probability-tree-state-points.js';
import { _ptAppendNodeIcon, _ptApplySearch, _ptBindNodeEvents, _ptClearSearch, _ptDrawConnections, _ptDrawNodes, _ptHideTooltip, _ptRefreshAllStyles, _ptRender, _ptUpdateVirtualViewport, _pt_container, _pt_world } from '../../js/probability-tree/probability-tree-ui.js';
import { PT_FIT_OFFSET_X, PT_FIT_OFFSET_Y, _ptBindEvents, _ptFitToView, _ptFocusNode, _ptOnWheel, _ptSuspendViewport, _pt_scale, _pt_tx, _pt_ty } from '../../js/probability-tree/probability-tree-viewport.js';
import { _applyDegreesOfFreedom, _applyFrequentistsBurden, _applyMaximumLikelihood, _applySignalToNoise, _applySparsePrior, _applyTheOracle, _binomialBurstOnCorrectFill, _degreesOfFreedomTick, _dofChoose, _dofNudge, _entropyDrainInit, _entropyDrainTick, _entropyDrainUpdateProgress, _ergodicFieldInit, _ergodicFieldTick, _frequentistsBurdenOnCorrectFill, _gamblersRuinOnCorrectFill, _gamblersRuinOnMistake, _getBayesianBonus, _hideColClues, _hideRowClues, _interquartileVisionDuration, _onMistakeBayesianUpdate, _overfittingGetPhase, _overfittingPenaltyMultiplier, _poissonProcessTick, _randomWalkInit, _randomWalkTick, _resetBayesianBonus, _resetNewNodeState, _revealAllClues, _signalToNoiseCheckRestore, _sparsePriorOnLineComplete, resetOverfittingTracker } from '../../js/probability-tree/probability-tree-special-nodes-logic.js';
import { PT, PT_COL_ALLOCATED_BG, PT_COL_ALLOCATED_BORDER, PT_COL_ALLOCATED_DOT, PT_COL_LOCKED_BG, PT_COL_LOCKED_BORDER, PT_COL_LOCKED_DOT, PT_COL_START, PT_COL_UNLOCKED_BG, PT_COL_UNLOCKED_BORDER, PT_COL_UNLOCKED_DOT, PT_CONN_ALLOCATED, PT_CONN_LOCKED, PT_CONN_UNLOCKED, PT_CONN_WIDTH, PT_FOCUS_SCALE, PT_NODE_RADIUS, PT_PADDING, PT_START_ID, PT_ZOOM_MAX, PT_ZOOM_MIN, PT_ZOOM_STEP, _ptApplyLevelCompleteRewards, _ptInitConnections, _ptInitSkills, _ptInitTreeData, _ptShowLoadingPlaceholder, closeTreeToGame, getPassiveTreeRootId, isPassiveTreeStartNode, isTreeGameOverlay, openTreeFromGame, ptGoBack, showPassiveTree, showPassiveTreeAsCharacter } from '../../js/probability-tree/probability-tree.js';
import { PassiveTracker } from '../../js/probability-tree/probability-tree-tracker.js';
import '../../js/probability-tree/probability-tree-tracker-state.js';
import '../../js/probability-tree/probability-tree-tracker-rows.js';
import { createBeamEffect, playConfidenceIntervalEffect, playResidualAnalysisEffect, playSampleEfficiencyEffect, playShieldChargePulseEffect, playStasisOverlayEffect, playStochasticResonanceEffect, playTimeGainEffect } from '../../js/probability-tree/probability-tree-effects.js';
import { _ptxRunExpansion } from '../../js/probability-tree/probability-tree-expansion.js';
import '../../js/probability-tree/ptx-core.js';
import '../../js/probability-tree/ptx-start-effects.js';
import '../../js/probability-tree/ptx-fill-mistake-effects.js';
import '../../js/probability-tree/ptx-line-tick-effects.js';
import '../../js/probability-tree/ptx-misc-effects.js';
import { activateTargetingReticle } from '../../js/classes/targeting-reticle.js';
import { _sraAfter, _sraAuthoredLevels, _sraBuildLayoutHTML, _sraBuildModel, _sraClassProjDef, _sraClearStage, _sraCreateScreen, _sraDamage, _sraDef, _sraDmgMult, _sraEffects, _sraEl, _sraEnsureStyles, _sraFireFlight, _sraFooterHTML, _sraFxNote, _sraFxTimers, _sraHitBurst, _sraMana, _sraManaMult, _sraMaxRank, _sraOnPick, _sraPickerOptionsHTML, _sraPlayVisual, _sraPushRosterEntry, _sraRank, _sraRankAdditive, _sraRankClampFor, _sraRefreshChrome, _sraRender, _sraRoster, _sraSelected, _sraSetRank, _sraStageFlash, _sraStageOverlay, _sraStagePoints, _sraStep, _sraSupportLabelText, _sraSyncPicker, _sraUniversal, _sraWireDevTest, authorsEffects, ensureSpellRankAuditScreen, showSpellRankAudit } from '../../js/dev/spell-rank-audit.js';
import { LEDGER_GROUPS, _atlasTierCheck, LEDGER_CATEGORIES, _MILESTONE_MAP } from '../../js/inference/inference-data.js';
import { _PT_TRACKED_NODES, _PT_REPLAY_NODES, _TUTOR_ITEM_IDS, _GRID_SIZE_THRESHOLDS, _GRID_SIZE_ORDER, _qs, _ensureQuestStats, _incDirect, _inc, _gridSizeBucket, _gridSizeAtLeast, _getCurrentGridInfo, _ptNodeActive, _ptAvailable, _ptCurrentSpentCount, _evalComboCondition, _allComboConditionsMet, _checkComboConditions, migrateQuestState, resetQuestLevelCounters, resetWitchImmunityLevelCounter, questStat_mistakesRemoved, questStat_curseBlocked, questStat_timerItemUsed, questStat_revealItemUsed, questStat_hasManuallyFilledCell, questStat_luckyDropClaimed, questStat_classRevealUsed, questStat_classMarkUsed, questStat_shadowSealUsed, questStat_rowsErased, questStat_tutorAnsweredCorrect, questStat_mcWrongAnswerEliminated, questStat_primerHintShown, questStat_primerRowsColsRevealed, questStat_sampleEfficiencyReveal, questStat_gamblersRuinTimeAdded, questStat_fieldScanCellRevealed, questStat_confidenceIntervalIgnored, _questStats_onClassAbilityThisLevel, _questStats_trackBasicFlags, _questStats_trackModifierFlags, _questStats_trackFullGauntlet, _questStats_trackPerLevelReplay, _questStats_trackActivePTNodes, _questStats_trackSpecialLevelTypes, _questStats_commitWitchImmunity, _questStats_trackComboQuests, _questStats_onLevelComplete, _questStats_onQuestionCorrect, _questStats_onItemUsed, _questStats_onClassChosen, _questStats_onAscendencyChosen, _questStats_checkNewlyCompleted, updateQuestStats } from '../../js/inference/inference-stats.js';
import { _milestone_isComplete, _milestone_isClaimed, _milestone_getProgress, _refreshQuestBadge, buildQuestLogButton, claimQuest } from '../../js/inference/inference-logic.js';
import '../../js/inference/inference-styles.js';
import { _hideQuestRewardTooltip, _ledger_openCategory, _ledger_switchGroup, _questChipHover, renderQuestLog, showQuestLog, showQuestToast } from '../../js/inference/inference-ui.js';
import { SPELL_DEBUFFS, COMBO_TUNING, COMBO_REACTIONS, SPELL_COMBOS, comboStatusName, getSpellComboSections, comboStatusTip, getStatusRecord } from '../../js/combat/combat-spell-debuff-defs.js';
import { CLASS_STAGGER_SECONDS, CLASS_SKILL_MONSTER_EFFECTS, getClassSkillMonsterRows } from '../../js/classes/class-monster-effects-defs.js';
import { _ailmentsReset, _ailmentsCleanup } from '../../js/combat/combat-ailments.js';
import { _playerStatuses, _puzzleEffects, _iceRedirectDepth, _sparkFollowerEl, _sparkMoveHandler, _sparkSpawnTimer, _sparkLastX, _sparkLastY, SPARK_GLYPHS, _groundFireAcc, _playerStatusBarTicker, _replacePuzzleEffects, _setPlayerStatusBarTicker, _addGroundFireAcc, _setIceRedirectDepth, _setSparkFollowerEl, _setSparkMoveHandler, _setSparkSpawnTimer, _setSparkLastPosition, _resetPlayerStatuses, _resetAilmentCounters } from '../../js/combat/combat-ailments-state.js';
import { AIL_IGNITE_DMG_SHARE, AIL_MIN_DOT_DAMAGE, PUZZLE_ATTACK_CHANCE_PCT, PUZZLE_EFFECT_DURATION_MS, PUZZLE_HAZARD_CELLS, ICE_SLIP_CHANCE, SHOCK_MARK_STRIP_CHANCE, _applyMonsterAilment, _applyPlayerAilment, _cleansePlayerAilments, _ensurePlayerStatusBar, _freezeAllMonsters, _isPolymorphActive, _getPolymorphVictim, _playerHasAilment, _getPlayerChargeMultiplier, _getMonsterChargeMultiplier, _applyAilmentShockAmpOnMonster, _applyPlayerShockAmp, _rollPlayerHitAilments, _rollMonsterHitAilment, _tickAilments, _renderMonsterStatusStrip, _refreshPlayerStatusIcons, _stopPlayerStatusBarTicker, _getPlayerRectForAilment, _circleOverlapsRect, _isPlayerInsideFire, _isPlayerInsideCloud, _dropPlayerGround, _startPlayerFireDrops, _startPlayerShadowClouds, _applyStatusToMap, _hasStatus } from '../../js/combat/combat-ailments-core.js';
import { _maybePuzzleAttack, _applyPuzzleAilment, _pickHazardCell, _registerPuzzleEffect, _removePuzzleEffect, _clearAllPuzzleEffects, _puzzleLava, _isLavaCell, _puzzleIce, _isIceCell, _puzzleIceRedirect, _puzzleShockedCursor, _startShockedCursor, _spawnCursorSpark, _spawnCrossZapFX, _stopShockedCursor, _onCorrectCellPuzzleFX, _applyPuzzleArcaneBomb, _puzzleShadowBlackout, _restoreLineClues } from '../../js/combat/combat-ailments-puzzle.js';
import { _spellComboPre, _spellComboPost, _spellComboOnKill, _tickSpellDebuffs, _applyWitheredDamageLess, _applySpellDebuff } from '../../js/combat/combat-spell-combos.js';
import { _applyClassSkillMonsterEffects } from '../../js/classes/class-monster-effects.js';
import { GAME_ART } from '../../js/combat/combat-art.js';
import { EG_ATLAS_CANVAS_W, EG_ATLAS_CANVAS_H, EG_ATLAS_CX, EG_ATLAS_CY, EG_ATLAS_LABEL_H, _egAtlasBackFn, _egAtlasSelectedNodeId, _egAtlasSearchQuery, _egAtlasStashCounts, _egAtlasZoom, _egAtlasZoomIsFit, EG_ATLAS_ZOOM_MIN, EG_ATLAS_ZOOM_MAX, _egAtlasNodeCenter, _egAtlasNodeSize, _egAtlasTierGroupColor, _egAtlasRoman, _egAtlasNodeStatus, _egAtlasStatusColor, _egAtlasStatusLabel, _egAtlasNodeBoss, egAtlasCountStashedMaps, _egAtlasBuildNodeHTML, _egAtlasBuildNodeTooltipHTML, _egAtlasBuildLinksSVG, _egAtlasBuildHeaderHTML, _egAtlasBuildTierProgressHTML, _egAtlasBuildTierTooltipHTML, _egAtlasBuildFullScreenHTML, _egAtlasRender, _egAtlasCenterViewport, _egAtlasViewportEl, _egAtlasComputeFitZoom, _egAtlasApplyZoomStyles, _egAtlasSetZoom, _egAtlasZoomStep, _egAtlasZoomFit, _egAtlasAttachViewHandlers, _egAtlasPanEndedAt, _egAtlasRefreshSelection, _egAtlasSelectNode, _egAtlasSearch, _egAtlasQueryTier, _egAtlasApplySearch, _egAtlasEnsureStyles, _egAtlasCreateScreen, ensureEndgameAtlasScreen, showEndgameAtlas } from '../../js/endgame/endgame-atlas-ui.js';
import { EG_ATLAS_MAX_TIER, EG_ATLAS_TIER_BANDS, egAtlasTierBand, egAtlasTierDifficulty, EG_ATLAS_TIER_NAMES, EG_ATLAS_TIER_POSITIONS, EG_ATLAS_TIER_MIRROR_OFFSET, EG_ATLAS_NODES, _egLinkAtlasNodes, EG_ATLAS_EK_LINKS, EG_ATLAS_BRIDGE_LINKS, EG_ATLAS_NODE_BY_ID, egAtlasNodeById, egAtlasIsCompleted, egAtlasIsUnlocked, egAtlasHighestCompletedTier, egAtlasProgress, egAtlasPickNodeIdForTier, egAtlasNodeName, egAtlasDropNodeIds, EG_ATLAS_ADJACENT_BONUS_PER_MAP, egAtlasCompletedCount, egAtlasAdjacentBonusChance, egAtlasAdjacentBonusPercent, egAtlasPickAdjacentBonusNodeId, EG_ATLAS_BOSS_CLIMB_DROP_SHARE, egAtlasPickDropNodeId, egAtlasChainSeed, egAtlasMakeRng, EG_ATLAS_CHAIN_FLAVORS, egAtlasChainBlueprint, egAtlasChainBlueprintForMap, _egAtlasPersist, _egAtlasResolveNodeForMap, _egAtlasOnMapCompleted } from '../../js/endgame/endgame-atlas.js';
import { _bossTestApplyGodMode, _bossTestInitGodMode, _bossTestToggleGodMode, _bossTestSyncGodModeUI, ensureEndgameBossTestScreen, showEndgameBossTest } from '../../js/combat/combat-boss-test.js';
import { BOSS_TEST_TIME_LIMIT, BOSS_TEST_DEFAULT_LEVEL, BOSS_TEST_ARENA_MAX_ROWS, BOSS_TEST_ARENA_MAX_COLS, BOSS_TEST_ARENA_MIN_CELLS, _bossTestBossTier, _bossTestTierMonsterLevel, _bossTestLevelForBoss, _bossTestCalcTestHPMultiplier, _bossTestScaledPreview } from '../../js/combat/combat-boss-test-core.js';
import { _bossTestTr, _bossTestGetSpecialPhaseInfo } from '../../js/combat/combat-boss-test-phases.js';
import { _cleanupBossTestSeedLevel, _bossTestPickArenaGi, _launchBossTest } from '../../js/combat/combat-boss-test-launch.js';
import { _bossTestBuildBossTooltipHTML, _bossTestRenderGrid, _bossTestBuildFullScreenHTML, _bossTestEnsureStyles, _bossTestShowTooltip, _bossTestToggleTestHP } from '../../js/combat/combat-boss-test-ui.js';
import { CLASS_PROJECTILES, _getProjectileDef, _getElementCentre, _getElementRestCentre, _fireProjectile } from '../../js/combat/combat-class-projectiles.js';
import { REVEAL_PROJECTILE_DAMAGE_PCT, REVEAL_PROJECTILE_MAX, REVEAL_PROJECTILE_STAGGER_MS, REVEAL_PCT_PER_FLAT_SPELL_DMG, REVEAL_PCT_PER_INC_SPELL_DMG, _getRevealProjectileDamagePct, _onProgrammaticReveal, _flushPendingRevealProjectiles } from '../../js/combat/combat-class-projectiles-reveal.js';
import { _lastHitElements, _lastHitWasCrit, _lastHitCritMult, _crossoverDamageMult, _calcPlayerDamage, _lastMeleeElements, _lastMeleeWasCrit, _lastMeleeCritMult, _calcPlayerMeleeDamage } from '../../js/combat/combat-calculations.js';
import { RESIST_CAP_PCT, _getPlayerResistCap, DAMAGE_ELEMENTS, _rollElementalBreakdown, _getElementalDamageBonus, _scaleElements, _applyTargetResistances, _calcPlayerResistanceReduction, RESIST_PENALTY_PER_STAGE, RESIST_PENALTY_MAX_STAGE, RESIST_FLOOR_PCT, _getResistPenaltyPct, _advanceResistPenaltyStage, _showResistPenaltyNotice } from '../../js/combat/combat-calculations-resistances.js';
import { _openCraftingBench, _closeCraftingBench, _craftingBenchSelect, _craftingBenchApply } from '../../js/loot/loot-crafting-bench.js';
import '../../js/loot/loot-crafting-bench-state.js';
import '../../js/loot/loot-crafting-bench-rules.js';
import '../../js/loot/loot-crafting-bench-render.js';
import '../../js/loot/loot-crafting-bench-overlay.js';
import '../../js/loot/loot-crafting-bench-apply.js';
import { _craftingBenchCostFor } from '../../js/loot/loot-crafting-costs.js';
import '../../js/loot/loot-currency.js';
import '../../js/loot/loot-currency-item-edits.js';
import '../../js/loot/loot-currency-drops.js';
import '../../js/loot/loot-currency-use.js';
import '../../js/loot/loot-currency-input.js';
import { _showHubTooltip } from '../../js/loot/loot-currency-tooltip.js';
import '../../js/loot/loot-currency-boot.js';
import { _chainCurrentGi, _chainPuzzleSolvedCount, _questionsAnswered, _chainTransitioning, _chainCountdownTimer, _puzzleCompleteFired, _mapClearedShown, _bossArenaAvailableShown, _pendingPuzzleBonusGain, _pendingQuestionBonusGain, _bonusLootChance, _getMapRequirements, _nonBossObjectivesComplete, _canLeaveMap, _onQuestionAnswered, _onPuzzleComplete, _hasBoss, _bossDefeated, _showInterstitialQuestion, _pickInterstitialWorldNum, _triggerQuestionNow, _startChainCountdown, _cancelChainCountdown, _loadNextChainPuzzle, _transitionToChainPuzzle, BOSS_ARENA_MAX_ROWS, BOSS_ARENA_MAX_COLS, _enterBossArena, BOSS_ARENA_MIN_CELLS, _findBossArenaPuzzleGi, _advanceBossArena, _arenaAdvanceTimer, _scheduleArenaAdvance, _spawnNextArenaBoss, _onAllBossesDead, _pickMapRunPuzzleGi, _findNextChainPuzzleGi, BONUS_LOOT_CHANCE_BY_GRID_SIZE, BONUS_LOOT_CHANCE_PER_QUESTION, BONUS_LOOT_CHANCE_MAX, _getPuzzleBonusLootGain, _getBonusLootChance, _rollBonusMapLoot, _grantMapCompletionReward, _buildBonusLootTooltipHTML, _bindBonusLootHUDTooltip, _updateBonusLootHUD, _buildChainBonusGainHTML, _endMap, _tryLeaveMap, _getBossTotalForHUD, _updateObjectivesHUD, _showMapClearedBanner, _showBossArenaAvailableBanner, OBJ_STRIP_STORAGE_KEY, _loadObjectivesStripState, _saveObjectivesStripState, _applySavedObjectivesStripState, _bindObjectivesStripBehaviour, _buildLootItem, _objItem, _showChainCountdownOverlay, _updateChainCountdownOverlay, _hideChainCountdownOverlay, _chainCleanup, _buildLeaveMapSummaryHTML, _leaveRarityClass, _buildCurrencyTooltipHTML, _buildEssenceTooltipHTML, _buildLeaveItemTooltipHTML, _leaveRarityLabel, _buildLeaveChipTooltipHTML, _wireLeaveMapSummaryTooltips, _renderPauseLootSummary, _showLeaveMapTransition, _clearBonusLootFlags, _hideLeaveMapTransition, _endMapDefeated, _injectLeaveMapTransitionStyles } from '../../js/combat/encounter-chain.js';
import { _chainPuzzleSizeAllowed, _buildChainPool, _trackChainRecentGi, _pickStoryChainPuzzleGi, _bucketCriteria, _resetChainRecentGis } from '../../js/combat/encounter-chain-pool.js';
import { _showMistakesWarningBanner, _maybeShowMistakesWarning, _resetMistakesWarningState, _lastHealthPct, _lastLowHealthWarningShown, _getHealthPct, _getLowHealthWarningTier, _showLowHealthWarningBanner, _maybeShowLowHealthWarning, _resetLowHealthWarningState, _showAbsorptionBrokenBanner, _maybeShowAbsorptionBroken, _resetAbsorptionBrokenState } from '../../js/combat/encounter-overlays.js';
import { _ensureLoseOverlayCombatUI } from '../../js/combat/encounter-defeat-overlay.js';
import { CARD_TOOLTIP_VIEW_MARGIN, _consumePlayerCharge, _getHandChargePct, _getLeadHand, _getPlayerChargePct, _isPlayerChargePaused, _setHoldEPauseVisual, _tickLoop, _tickMonster, _tickPlayer, _updatePlayerChargeBar, _initEgHoldEPauseHotkey } from '../../js/combat/encounter-tick.js';
import { _checkMistakeLimit, _getMaxAllowedMistakes, _getMistakesRemaining, _lastLifeRegenAt, _onPause, _onResume, _pauseStartedAt, _tickLifeRegen } from '../../js/combat/encounter-tick-support.js';
import { HIT_BURST_DURATION_MS, HIT_BURST_SPARK_COUNT, HIT_ELEMENT_COLORS, _buildMonsterBadgesHTML, _buildMonsterCardHTML, _calcBarPercentages, _clearAllZones, _flashDamageCard, _flashImmune, _flashKillCard, _hideMonsterPanel, _renderMonstersIntoZones, _renderPanel, _restartFlashClass, _showDamageNumber, _spawnHitBurst, _updateBars, _updateMonsterBars } from '../../js/combat/encounter.js';
import '../../js/loot/equipment-base-items.js';
import '../../js/loot/loot-equipment-generator.js';
import '../../js/loot/loot-equipment-mod-tables.js';
import { ESSENCE_COLS, ESSENCE_ROWS } from '../../js/loot/loot-essences.js';
import '../../js/loot/loot-essences-names.js';
import '../../js/loot/loot-essences-defs.js';
import '../../js/loot/loot-essences-craft.js';
import '../../js/loot/loot-essences-drops.js';
import '../../js/loot/loot-essences-stash.js';
import { _onEssenceCellEnter, _onEssenceCellLeave, _onEssenceCellMove, _setEssenceFilter } from '../../js/loot/loot-essences-render.js';
import '../../js/loot/loot-essences-styles.js';
import '../../js/loot/loot-essences-tooltip.js';
import '../../js/loot/loot-essences-use.js';
import { _egBuildMapOrbRingHTML, _egBuildMapSocketRowHTML, _egBuildMapOrbSlotHTML, _egBuildMapDeviceHTML, _egOnDropRulesEnter, _egOnDropRulesMove, _egOnDropRulesLeave, _egPotentialDropEntries, _egBuildPotentialDropsBodyHTML, _egBuildPotentialDropsPanelHTML, _egRenderPotentialDrops, _egInjectPotentialDropsStyles, _egBuildMapStashCellHTML, _egBuildMapStashGridHTMLForTier, _egBuildMapStashGridHTML, _egBuildMapStashTabsHTML, _egCountMapsInTier, _egUpdateMapStashTabCounts, _egSwitchMapStashTier, _egBuildGatePanelHTML, _egBuildGateCurrencyCellHTML, _egBuildGateCurrencyGridHTML, _egBuildGateCurrencyStripHTML, _egOnGateCurrencyCellEnter, _egOnGateCurrencyCellMove, _egOnGateCurrencyCellLeave, _egInjectGateLevelChipStyles, _egRenderGateLevelChip, _egBuildGateTopbarHTML, _egBuildGateFullScreenHTML, _egInjectGateTierStripStyles, _egRenderGateTierStrip, _egGetMapAtlasNode, _egIsMapAtlasIncomplete, _egInjectAtlasHighlightStyles, _egInjectMapStashTabStyles, _egRenderMapDeviceButton, _egRenderMapSlot, _egRenderMapStashCell, _egRenderMapStashForTier, _egRenderMapStash, egActivateMap, EG_MM_CATEGORY_COLORS, _egMapModsCategoryLabel, _egMapModFallbackStatLabel, _egGetActiveMapModValueFor, _egBuildMapModEntryHTML, _egBuildMapModsOverlayContentHTML, _egEnsureMapModsOverlay, egOpenMapModsOverlay, egCloseMapModsOverlay, _egInjectMapModsOverlayStyles, _egCreateGateScreen, ensureEndgameGateScreen, _egGateBackFn, showEndgameGate } from '../../js/endgame/endgame-gate.js';
import '../../js/loot/loot-gold.js';
import { _checkGoldDropClaim, _discardGoldDrop, _replaceCarriedGoldDrops } from '../../js/loot/loot-gold-drops.js';
import { PICKUP_SPAWN_INTERVAL_MIN, PICKUP_SPAWN_INTERVAL_MAX, PICKUP_MAX_ON_BOARD, PICKUP_LIFETIME_MS, PICKUP_CRITICAL_HP_RATIO, LOOT_DROP_CHANCE_NORMAL, LOOT_DROP_CHANCE_BOSS, LOOT_DROP_LIFETIME_MS, DROP_EXPIRE_WARNING_MS, CURRENCY_DROP_MAX_ON_BOARD, COOLDOWN_SURGE_REDUCTION_SECS, HEART_TIER_SCALE_PER_TIER, MANA_TIER_SCALE_PER_TIER, _getPickupTier, _heartTierMult, _manaTierMult, _calcHeartHeal, _calcManaGain, PICKUP_DEFS, PICKUP_WEIGHTS, _rarityToastColor, _pickRandomPickup, _isCellPickupEligible, _buildPickupEligiblePool, _cellHasAnyDrop, _renderPickupOverlay, _removePickupOverlay, _animatePickupClaim, _scheduleTrackedExpiry, _cancelTrackedExpiry, _cancelExpireCountdown, _schedulePickupExpiry, _startDropExpireCountdown, _expireCountdownStylesInjected, _injectExpireCountdownStyles, _animatePickupDiscard } from '../../js/combat/combat-grid-pickups.js';
import { _pauseGridDrops, _resumeGridDrops, _scheduleNextPickupSpawn, _dropHeartPickup, _startPickupSpawner, _stopPickupSpawner, _checkPickupClaim, _discardPickup } from '../../js/combat/combat-grid-pickups-spawner.js';
import { _stashHasFreeSlot, _renderLootOverlay, _removeLootOverlay, _animateLootClaim, LOOT_EXPLOSION_EQUIPMENT, LOOT_EXPLOSION_STAGGER_MS, _placeLootDropForce, _spawnLootExplosion, _discardLootDrop, _stopLootDrops, _flushRunLootToStash, _replaceCarriedLootDrops } from '../../js/combat/combat-grid-pickups-loot.js';
import { _autoClaimDropsOnReveal, _onLinesCompleted, _onLuckyTileClaimed } from '../../js/combat/combat-grid-pickups-claims.js';
import { _renderCurrencyDropOverlay, _removeCurrencyDropOverlay, _animateCurrencyDropClaim, _spawnCurrencyDrop, _trackRunCurrency, _trackRunEssence, _checkCurrencyDropClaim, _discardCurrencyDrop, _stopCurrencyDrops, _replaceCarriedCurrencyDrops } from '../../js/combat/combat-grid-pickups-currency.js';
import { ITEM_DROP_CHANCE_NORMAL, ITEM_DROP_CHANCE_BOSS, ITEM_DROP_MAX_ON_BOARD, _itemDropRarityClass, _renderItemDropOverlay, _removeItemDropOverlay, _animateItemDropClaim, _spawnItemDrop, _checkItemDropClaim, _discardItemDrop, _stopItemDrops, _replaceCarriedItemDrops } from '../../js/combat/combat-grid-pickups-items.js';
import { HZ_LAVA_BASE_DMG_PCT, HZ_LAVA_TICK_MS, HZ_LAVA_MIN_R, HZ_LAVA_MAX_R, HZ_LAVA_SPEED_MIN, HZ_LAVA_SPEED_MAX, HZ_LAVA_EXPLOSION_BASE_DMG_PCT, HZ_LAVA_FUSE_MS, HZ_LAVA_RESPAWN_MS, HZ_LAVA_BLAST_R, HZ_LAVA_IGNITE_CHANCE_PCT, HZ_LIGHTNING_BASE_DMG_PCT, HZ_LIGHTNING_WARNING_MS, HZ_LIGHTNING_RADIUS, HZ_LIGHTNING_INTERVAL_MIN_MS, HZ_LIGHTNING_INTERVAL_MAX_MS, HZ_ICICLE_BASE_DMG_PCT, HZ_ICICLE_FALL_SPEED, HZ_ICICLE_SHAKE_MS, HZ_ICICLE_SPAWN_MIN_MS, HZ_ICICLE_SPAWN_MAX_MS, HZ_ARCANE_BASE_DMG_PCT, HZ_ARCANE_CHARGE_MIN_MS, HZ_ARCANE_CHARGE_MAX_MS, HZ_ARCANE_BEAM_TRAVEL_MS, HZ_ARCANE_BEAM_HEIGHT, HZ_ARCANE_POLYMORPH_CHANCE_PCT, HZ_ARCANE_INTERVAL_MIN_MS, HZ_ARCANE_INTERVAL_MAX_MS, HZ_METEOR_BASE_DMG_PCT, HZ_METEOR_WARNING_MS, HZ_METEOR_FALL_MS, HZ_METEOR_RADIUS, HZ_METEOR_VOLLEY_MIN, HZ_METEOR_VOLLEY_MAX, HZ_METEOR_IGNITE_CHANCE_PCT, HZ_METEOR_INTERVAL_MIN_MS, HZ_METEOR_INTERVAL_MAX_MS, HZ_VOLATILE_BASE_DMG_PCT, HZ_VOLATILE_SPEED_MIN, HZ_VOLATILE_SPEED_MAX, HZ_VOLATILE_TRIGGER_R, HZ_VOLATILE_FUSE_MS, HZ_VOLATILE_BLAST_R, HZ_VOLATILE_LIFETIME_MS, HZ_VOLATILE_SHADOWBURN_CHANCE_PCT, HZ_VOLATILE_RESPAWN_MIN_MS, HZ_VOLATILE_RESPAWN_MAX_MS, HZ_FROSTNOVA_BASE_DMG_PCT, HZ_FROSTNOVA_EXPAND_MS, HZ_FROSTNOVA_MAX_R, HZ_FROSTNOVA_BAND, HZ_FROSTNOVA_FREEZE_CHANCE_PCT, HZ_FROSTNOVA_INTERVAL_MIN_MS, HZ_FROSTNOVA_INTERVAL_MAX_MS, HZ_FIREWALL_BASE_DMG_PCT, HZ_FIREWALL_HEIGHT, HZ_FIREWALL_WARNING_MS, HZ_FIREWALL_SWEEP_MS, HZ_FIREWALL_IGNITE_CHANCE_PCT, HZ_FIREWALL_INTERVAL_MIN_MS, HZ_FIREWALL_INTERVAL_MAX_MS, HZ_FIREWALL_SAFE_MIN, HZ_FIREWALL_SAFE_MAX, HZ_FIREWALL_TOP_SAFE_MIN, HZ_FIREWALL_TOP_SAFE_MAX, HZ_FIREWALL_BOTTOM_SAFE_MIN, HZ_FIREWALL_BOTTOM_SAFE_MAX, HZ_FIREWALL_GAP_MIN_W, HZ_FIREWALL_GAP_MAX_W, HZ_FIREWALL_GAP_MARGIN, HZ_CYCLONE_BASE_DMG_PCT, HZ_CYCLONE_TICK_MS, HZ_CYCLONE_R_MIN, HZ_CYCLONE_R_MAX, HZ_CYCLONE_SPEED_MIN, HZ_CYCLONE_SPEED_MAX, HZ_DELIRIUM_INTERVAL_MIN_MS, HZ_DELIRIUM_INTERVAL_MAX_MS, HZ_DELIRIUM_FADE_IN_MS, HZ_DELIRIUM_HOLD_MS, HZ_DELIRIUM_FADE_OUT_MS, HZ_DELIRIUM_POLYMORPH_CHANCE_PCT, HZ_LAYER_Z, _hzActive, _hzLayer, _hzPausedForQuiz, _hzLava, _hzLightning, _hzBlizzard, _hzDarkness, _hzArcane, _hzMeteor, _hzVolatile, _hzFrostNova, _hzFirewall, _hzCyclone, _hzDelirium, _setHzActive, _setHzLayer, _setHzPausedForQuiz, _setHzLava, _setHzLightning, _setHzBlizzard, _setHzDarkness, _setHzArcane, _setHzMeteor, _setHzVolatile, _setHzFrostNova, _setHzFirewall, _setHzCyclone, _setHzDelirium, _hzIntensity, _hzMult, _hzTierMult, _hzRand, _hzPlayerEl, _hzPlayerSpriteRect, _hzPlayerRect, _hzPlayerHitbox, _hzGridRect, _hzRectsOverlap, _hzCircleRectOverlap, _hzApplyCircleHit, _hzRectInsideCircle, _hzRingRectOverlap, _hzSweptCircleRectOverlap, _hzPointOutsideGrid, _hzDamage, _hzShowHitText } from '../../js/combat/combat-hazards.js';
import { _hzCreateLavaPool, _hzTriggerLavaFuse, _hzDetonateLava, _hzRespawnLavaPool, _hzInitLava, _hzTickLava } from '../../js/combat/combat-hazards-lava.js';
import { _hzInitLightning, _hzTickLightning, _hzInitBlizzard, _hzSpawnIcicle, _hzTickBlizzard, _hzInitDarkness, _hzTickDarkness, _isPlayerInDarknessCloud, _hzInitArcane, _hzStartArcaneCharge, _hzTickArcane, _hzFireArcaneBeam, _hzInitMeteor, _hzSpawnMeteor, _hzTickMeteor } from '../../js/combat/combat-hazards-storms.js';
import { _hzInitVolatile, _hzActivateVolatileWisp, _hzDetonateVolatile, _hzTickVolatile, _hzInitFrostNova, _hzSpawnFrostNova, _hzTickFrostNova, _hzInitFirewall, _hzCreateFirewallWallEls, _hzCreateFirewallWarningEls, _hzTickFirewall } from '../../js/combat/combat-hazards-auras.js';
import { _hzInitCyclone, _hzTickCyclone, _hzInitDelirium, _hzTickDelirium } from '../../js/combat/combat-hazards-cyclone-delirium.js';
import { _hazardsReset, _hazardsCleanup, _hazardsHideForQuiz, _hazardsShowAfterQuiz, _hazardsTick } from '../../js/combat/combat-hazards-lifecycle.js';
import { _layoutSpawnZones, _pickRoomyZone, _roamShouldRoam, _roamSync, _roamTeardown, _tryMonsterMeleeSidestep } from '../../js/combat/combat-monster-roam.js';
import { MAX_CONCURRENT_MONSTERS, _buildMonster } from '../../js/combat/combat-monsters.js';
import { MONSTER_DEFS } from '../../js/combat/combat-monsters-data.js';
import { _egnBuildTopbarHTML, _egnBuildDoorHTML, _egnBuildFullScreenHTML, _egnEnsureStyles, _egnCreateScreen, ensureEndgameNexusScreen, showEndgameNexus } from '../../js/endgame/endgame-nexus.js';
import { PLAYER_STATS, DUAL_WIELD_PARRY_PCT, STAT_KEY_MAP, _buildMergedModLines, _getAllEquippedItems, _getItemEffectiveDefenses, _getItemEffectiveDamage, _getItemEffectiveAttackInterval, _getItemEffectiveBlockChance, _computePlayerStats, _getPlayerAttackInterval, _getPlayerAttackIntervalForHand, _getDualHandWeapon, _strikeHandMult, _calcArmourReductionPct, _calcArmourMitigation, _calcEvasionDodgeChance, _getDragAccuracyBonus, _getDragMissReduction, _getDragTier, _getDragTierLabelKey, _calcAccuracyMissChance, _rollCrit, _cancelAbsorptionRegen, _scheduleAbsorptionRegen, _formatStatValue, STAT_LAYOUT, _buildStatLine, _buildGroupedStats } from '../../js/combat/combat-player-stats.js';
import { _createGeneratedLevel } from '../../js/combat/combat-puzzle-generator.js';
import { QUIZ_BUFF_DAMAGE_MULT, _quizDamageBuffStacks, _quizDamageBuffMult, _resetQuizDamageBuff, _consumePendingQuizRewardHTML, _applyQuizRewardBuff } from '../../js/combat/combat-quiz-buffs.js';
import '../../js/loot/loot-requirements-core.js';
import '../../js/loot/loot-requirements-weapons.js';
import '../../js/loot/loot-requirements-actions.js';
import { PLAYER_BASE_ATTRIBUTES, _sumAttributeBonuses, _computeLoadoutAttributes, _findUnmetRequirements, _simulateAndCheck, _checkMoveAllowed, _canEquipInSlot, _checkUnequipSlot, _formatRequirementPart, _getUnmetRequirementsText, _showRequirementsToast, _previewEquipAttributes, _getSwapChainBreak, _isItemBlocked, _getWeaponHands, _isTwoHandedWeapon, _isOneHandedWeapon, _isDualWielding, _hasShieldEquipped, _checkHandCompatibilityInSlot, _handErrorMessage, _healWeaponHands, _tryAutoUnequipOffhandForTwoHander, _migrateIllegalHandsToStash } from '../../js/loot/loot-requirements.js';
import { SHARD_DEFS, _rollShardForItem, addShard } from '../../js/loot/loot-shards.js';
import { SCREEN_NAV, _resolveBackFn } from '../../js/combat/combat-state-navigation.js';
import { MELEE_DAMAGE_MULT, PLAYER_CHARGE_TIME_MULT, PLAYER_DEFAULT_ATTACK_INTERVAL, PLAYER_MELEE_ANIM_DURATION_MS, PLAYER_MELEE_DAMAGE, PLAYER_MIN_ATTACK_INTERVAL, _activeBlasts, _bossCorrupted, _bossFrozen, _bossTimers, _cellInBounds, _currencyDrops, _dragChargeElements, _isActive, _isCampaignRun, _isMapRun, _itemDrops, _lootDrops, _pickupSpawnerInfo, _pickups, _recentFills } from '../../js/combat/combat-state.js';
import '../../js/loot/unique-items.js';
import { _vendorSwitchTab, showVendor } from '../../js/loot/loot-vendor.js';
import { _vendorSetCharmFilter, _vendorSetEssenceFilter, _vendorSetItemFilter } from '../../js/loot/loot-vendor-shared.js';
import { _vendorBuyTierMap } from '../../js/loot/loot-vendor-maps.js';
import { _vendorBuyCharm, _vendorBuyCurrency, _vendorBuyEssence, _vendorBuyPuzzleItem } from '../../js/loot/loot-vendor-supplies.js';
import { _vendorSetBaseFilter, _vendorSetWeaponTypeFilter, _vendorSetDefenseFilter, _vendorToggleUsableFilter, _vendorShowBaseTooltip, _vendorHideBaseTooltip, _vendorBuyBaseItem } from '../../js/loot/loot-vendor-equipment.js';
import '../../js/loot/loot-vendor-styles.js';
import { _meleeImpactThump, _showWeaponSwing, _weaponSwingSound, _doWeaponAttack, _initEgWeaponAttackHotkey } from '../../js/combat/combat-weapon-swing.js';
import { WEAPON_SWING_COOLDOWN_MS, WEAPON_SWING_DURATION_MS, _getAttackFacing, _facingFromVector, _getEquippedWeaponInfo, _meleeTargetInRange, _meleeFindVictim } from '../../js/combat/combat-weapon-swing-config.js';
import { BOSS_DEFS, BOSS_MECHANICS, BOSS_LEVEL_HP_SCALE, BOSS_LEVEL_DAMAGE_SCALE, BOSS_LATE_HP_ANCHORS, _getBossLateHpMult, BOSS_SOFT_ENRAGE_DELAY_MS, BOSS_SOFT_ENRAGE_INTERVAL_MS, BOSS_SOFT_ENRAGE_DMG_STEP, BOSS_SOFT_ENRAGE_MAX_STACKS, BOSS_PHASE_NAMES, RECENT_FILLS_CAPACITY, BOSS_CHARGE_SPEED_MULT, _scaleBossChargeMax, _buildBoss, _bossEnrageMultiplier, _bossRecalcDamage, _bossTick, _bossInit, _bossCleanup, _bossCleanupAll, _bossCalcTargetPhase, _bossApplyPhaseStats, _bossClearMechanicTimers, _bossPlayTransitionFeedback, _bossTransition, _bossCheckPhase, _calcMechanicInterval, _MECH_CATEGORY, _bossMechCategory, _bossScheduleSingleMechanic, _bossScheduleMechanics, _validateAllBossHandlers } from '../../js/combat/bosses/boss-framework.js';
import { BOSS_TEARDOWN_HOOKS } from '../../js/combat/bosses/boss-teardown-hooks.js';
import { CORRUPT_CELL_LIFETIME_MS, BRUTUS_CORRUPT_LIFETIME_MS, SNAIL_CORRUPT_LIFETIME_MS, CORRUPT_SPREAD_INTERVAL_P2, CORRUPT_SPREAD_INTERVAL_P3, CORRUPT_SPREAD_CAP_P2, CORRUPT_SPREAD_CAP_P3, CORRUPT_TELEGRAPH_MS, CORRUPT_CAST_P1, CORRUPT_CAST_P2, CORRUPT_CAST_P3, PRIOR_BOMB_COUNT_P1, PRIOR_BOMB_COUNT_P2, PRIOR_BOMB_COUNT_P3, PRIOR_BOMB_FUSE_RANGE, PRIOR_BOMB_DEFUSE_MS, PRIOR_BOMB_STAND_PAD_PX, PRIOR_BOMB_TICK_MS, PRIOR_BOMB_CASCADE_DELAY_MS, SHIFT_ERASE_P1, SHIFT_RELOCATE_P2, SHIFT_RELOCATE_P3, SHIFT_ERASE_P3, _bossTierLerp, _bossTierFactor, _bossTierNorm, _corruptSpreadIntervalMs, _corruptSpreadCap, _corruptConfig, _buildCorruptibleCellPool, _corruptPickNeighbor, _corruptTelegraphSpread, _corruptSpreadLand, _corruptSpreadTick, _applyCellCorruption, _removeCellCorruption, _clearAllCorruptedCells, _isCellCorrupted, _dispelCorruption, _mechCorruptCells, _buildProbabilityShiftPool, _buildMarkDestinations, SHIFT_FLY_MS, _shiftFlyNodes, _shiftFlyEase, _shiftSpawnFlyer, _relocateMarks, _mechProbabilityShift, _clearShiftGlows, _removeFromRecentFills, _flashPriorBombCell, _priorBombBoom, _priorBombDetonationFX, _unfillCell, SUMMON_POOL, _mechSummonAdds, _priorBombPool, _priorBombs, _priorBombTimer, _priorBombDefusingActive, _priorBombChargePauseShown, _priorBombDefusing, _syncDefuseChargePause, _syncDefuseLabel, _priorBombStanding, _priorBombArmCell, _priorBombExplode, _priorBombDefuse, _priorBombTick, _clearPriorBombFuses, _mechPriorBomb, _swapPickRows, _swapRowGroup, _swapApplyGroup, _restoreClueSwap, SWAP_DURATION_F, _mechClueSwap, _removeClueSwap, FROZEN_CELL_LIFETIME_MS, FROZEN_CELL_LIFETIME_P3_MS, FROZEN_CREEP_DELAY_MS, FROZEN_CREEP_DELAY_P3_MS, FROZEN_TELEGRAPH_MS, FROZEN_CAST_P1, FROZEN_CAST_P2, FROZEN_CAST_P3, FROZEN_CAP_P2, FROZEN_CAP_P3, FROZEN_LIFE_F, FROZEN_CREEP_F, _frozenCastCount, _frozenLifeMs, _frozenCreepDelayMs, _buildFreezableCellPool, _applyCellFreeze, _frozenPickNeighbor, _frozenCap, _frozenTelegraphCreep, _frozenCreepLand, _frozenCreepTick, _removeCellFreeze, _clearAllFrozenCells, _isCellFrozen, _mechFrozenCells, _removeGridInvert, _mechGridInvert, BLAST_WARN_MS, BLAST_ACTIVE_MS, BLAST_DAMAGE_PCT, BLAST_LASTCALL_MS, BLAST_SHRINK_SETTLE, BLAST_TRANSITION_FLASH_MS, BLAST_CHARGE_MS, BLAST_TIER_WARN_F, BLAST_TIER_HOLD_F, BLAST_TIER_LASTCALL_F, _blastTierFactor, NK_TIER_FACTOR, NK_DAMAGE_TIER, _nkTierDamageFactor, _blastPickPos, _blastHudInZone, _blastGetPlayerRect, _blastGetOverlay, _blastPositionCircle, _blastGetCircle, _blastGetCountdownLabel, _blastGetGhost, _blastGetStatus, _blastTeardown, _blastTeardownAll, _runScreenBlast, _nkRuns, _nkSeq, _nkDodgeBusy, _nkNewRun, _nkEl, _nkKillRun, _nkTeardownBoss, _nkTeardownAll, _nkFrozen, _nkBossAlive, _nkLoop, _nkPlayerRect, _nkPlayerCenter, _nkMaxHP, _nkCircleHit, _nkRectsOverlap, _nkDotHit, _nkShieldUp, _nkLastHitAbsorbed, _nkHit, _ptSegDist, _nkDotTick, NK_ELEMENT_TOAST_COLORS, NK_BOSS_SIGNATURE_COLORS, _nkBossToastColor, _nkAbilityHitToast, _nkToast, _nkSlamPaths, _nkSlamShatter, _nkNudgeAvatar, _flingSeq, _nkFlingAvatar, _flingBurst, _collectClueSpans, _nkWatchFinale, _nkFinaleWaves } from '../../js/combat/bosses/shared-boss-abilities.js';
import { _notifyCorrectFill, _fateMarks, _fateChain, _buildFatePool, _applyFateMark, _removeFateMark, _fateSpawnOne, _resolveFateMark, _clearFateMarks, FATE_WINDOW_F, FATE_INITIAL_P2, FATE_BUDGET_P2, FATE_INITIAL_P3, FATE_BUDGET_P3, _mechFatedCell, _fogBanks, _fogSeq, FOG_DRIFT_P2_MS, FOG_DRIFT_P3_MS, FOG_DURATION_F, FOG_DRIFT_F, _fogProbe, _fogPlace, _fogPickRegion, _fogDrift, _fogSpawnBank, _fogKillBank, _removeFogBank, _mechFogBank, _restoreClueScramble, _scramblePickLines, _scrambleLineTexts, _clueScrambleReshuffle, SCRAMBLE_LINES_P1, SCRAMBLE_LINES_P23, SCRAMBLE_DURATION_F, _mechClueScramble, _removeClueScramble, TITHE_NEED_P1, TITHE_NEED_P2, TITHE_NEED_P3, TITHE_DECAY_F, _titheArmDecay, _titheDrop, _mechSoulTithe, _breakSoulTithe, _titheTeardown, _removeVeil } from '../../js/combat/bosses/shared-puzzle-mechanics.js';
import { _NUL_DEBUG_SLOW, _NUL_DEBUG_MULT, NUL_LINE_DPS, NUL_LATTICE_R, NUL_LINE_W, NUL_RECONTRACT, NUL_ERASE_MS, NUL_RAY_HIT, NUL_RAYS, NUL_RAY_SPEED, NUL_STRIKE_HIT, NUL_EXPOSE_R, NUL_WINDOW_MS, NUL_NULLIFY, NUL_RING_R, NUL_HIT_CD_MS, _nulHitCd, _nulTouch, _nulPC, _nulDelay, _nulRecBuf, _nulRecRun, _nulEnsureRecRun, _nulLatRun, _nulLines, _nulRing, _mechNulLattice, _applyBlackout, _removeBlackout, _voidSurgeTeardown, NUL_ERASE_TARGETS, _mechNulErasure, _mechNulRays, NUL_EXPOSE_GOAL, NUL_STRIKE_WALK, NUL_STRIKE_DELAY, NUL_STRIKE_LEN, _nulFinal, _nulFinalActive, _nulOnPhaseEnter, _nulStartFinalWatcher, _nulAfter, _nulFinalStart, _nulCollapse, _nulNullification, _nulFinalEnd, _nulTeardown } from '../../js/combat/bosses/boss-null.js';
import { _BAY_DEBUG_SLOW, _BAY_DEBUG_MULT, BAY_BOLT_DMG, BAY_WISP_DMG, BAY_WISP_FLIP, BAY_WISP_LIFE, BAY_DISTRICT_HIT, BAY_WAVES, BAY_WAVE_GAP, BAY_HIT_CD_MS, _bayLean, _bayMeterEl, _bayMeterApply, _bayMeterShift, _bayMeterShow, _bayMeterHide, _bayFavouredSide, _baySideX, _bayHitCd, _bayTouch, _bayPC, BAY_BOLTS, BAY_BOLT_W, BAY_BOLT_WARN_MS, BAY_BOLT_GAP_MS, BAY_EVIDENCE_SHIFT, BAY_SELF_UPDATE, _mechBayBolts, BAY_WISP_COUNT, BAY_WISP_SPEED, _mechBayWisps, _activateVeil, _mechBayVeil, BAY_DISTRICT_COLS, BAY_DISTRICT_ROWS, BAY_STRIKES_PER_WAVE, _bayFinal, _bayFinalActive, _bayOnPhaseEnter, _bayStartFinalWatcher, _bayAfter, _bayFinalStart, _bayConcede, _bayFinalEnd, _bayTeardown } from '../../js/combat/bosses/boss-bayes.js';
import { _ENTR_DEBUG_SLOW, _ENTR_DEBUG_MULT, ENTR_POOL_DPS, ENTR_POOL_LIFE, ENTR_ZONE_LIFE, ENTR_ORDER_FILL, ENTR_ORDER_DRAIN, ENTR_SPEED_MIN, ENTR_BURN_DPS, ENTR_CELL_SPREAD, ENTR_CELL_LIFE, ENTR_DOOR_STATE, ENTR_SHARD_DMG, ENTR_SHARDS, ENTR_FINAL_TIME, ENTR_HEATDEATH, ENTR_SINGULAR_R, ENTR_HIT_CD_MS, _entrZones, _entrPools, _entrCells, _entrOrderRun, _entrOrder, _entrHotUntil, _entrColdUntil, _entrHotAuraTimer, _entrColdAuraTimer, _entrMoveMult, _entrHeal, _entrPC, _entrHitCd, _entrTouch, _entrHudEl, _entrHudApply, _entrEnsureOrderRun, ENTR_DRIFT_BLOOMS, ENTR_POOL_R, ENTR_BLOOM_MS, _mechEntrDrift, _entrSpawnPool, _entrSpawnZone, ENTR_DECAY_SEEDS, ENTR_CELL_CAP, _mechEntrDecay, _entrSpawnCell, _mechEntrDoor, _entrApplyHot, _entrApplyCold, _entrAura, ENTR_SHARD_LIFE, ENTR_SHARD_WARN, _entrFinal, _entrFinalActive, _entrOnPhaseEnter, _entrStartFinalWatcher, _entrAfter, _entrFinalStart, _entrDeliver, _entrSpawnShardFn, _entrDropNext, _entrHeatDeath, _entrRestart, _entrFinalEnd, _entrTeardown } from '../../js/combat/bosses/boss-entropy.js';
import { _LAP_DEBUG_SLOW, _LAP_DEBUG_MULT, LAP_LANCE_W, LAP_LANCE_SPEED, LAP_LANCE_HIT, LAP_LANCE_END, LAP_GHOST_LEAD, LAP_BRANCH_HIT, LAP_GHOST_FORM, LAP_FRAY_RECALL, LAP_FRAY_CD_MS, LAP_TOUCH_MS, LAP_NODE_STAND, LAP_LOOP_TIME, LAP_FAIL_EXTEND, LAP_NODE_GOAL, _lapHitCd, _lapTouch, _lapGhostUntil, _lapGhostForm, _lapDamageable, _lapPC, LAP_FATE_PHASE3, _mechLapFate, _lapLancePair, _lapRealLance, _lapPlaceCorridor, LAP_BRANCH_WALK, LAP_BRANCH_R, _mechLapBranches, _lapDelay, _lapRecBuf, _lapRecRun, _lapFrayCd, _lapEnsureRecRun, _mechLapFray, LAP_LOOP_LANCE_Y, LAP_LOOP_BRANCH_X, LAP_LOOP_BRANCH_TRUE, _lapFinal, _lapFinalActive, _lapOnPhaseEnter, _lapStartFinalWatcher, _lapAfter, _lapFinalStart, _lapFinalLance, _lapFinalPhantom, _lapFailPunish, _lapCloseLoop, _lapFinalEnd, _lapTeardown } from '../../js/combat/bosses/boss-laplace.js';
import { _OVR_DEBUG_SLOW, _OVR_DEBUG_MULT, OVR_TOUCH_CD_MS, _ovrHitCd, _ovrTouch, _ovrPC, _ovrHeal, _ovrHistory, _ovrRecRun, _ovrEnsureRecorder, OVR_STEPS, OVR_BAND_W, OVR_BAND_DPS, OVR_MIN_R, OVR_MIN_DMG, OVR_MIN_WARN_MS, _mechOvrGradient, _mechPatternBreak, OVR_LOCK_REC_MS, OVR_LOCK_SAMPLE_MS, OVR_ECHO_R, OVR_ECHO_DMG, OVR_STRIKE_DMG, OVR_UNLEARN_HEAL, _mechOvrPatternLock, OVR_VAL_R, OVR_VAL_HOLD_MS, OVR_VAL_DMG, OVR_VAL_SPACING, OVR_VAL_CLEAR, OVR_VAL_TIE, _mechOvrValidation, OVR_HEAT_COLS, OVR_HEAT_ROWS, OVR_WAVES, OVR_WAVE_DMG, OVR_FUSE_MS, OVR_REHEAT_MS, _ovrFinal, _ovrFinalActive, _ovrOnPhaseEnter, _ovrEnsureFinalWatcher, _ovrWatcherRun, _ovrAfter, _ovrHeatCounts, _ovrFinalStart, _ovrFinalEnd, _ovrTeardown } from '../../js/combat/bosses/boss-overfitter.js';
import { _VIS_DEBUG_SLOW, _VIS_DEBUG_MULT, VIS_TOUCH_CD_MS, _visHitCd, _visTouch, _visPC, _visHeal, VIS_WALL_BLOCK, VIS_WALL_STEP, VIS_WALL_GAP, VIS_WALL_AMP, VIS_WALL_RATE, VIS_WALL_SPD, VIS_WALL_TOUCH, VIS_WALL_DOT, VIS_WALL_LIFE, _mechVisWalls, VIS_BENCH_WARN, VIS_BENCH_CRAWL, VIS_BENCH_BAND, VIS_BENCH_JAW, VIS_BENCH_STRAIN, VIS_BENCH_STRAIN_MS, _mechVisBench, VIS_QUEN_MS, VIS_QUEN_R, VIS_QUEN_HP, VIS_HAMMER_DMG, VIS_QUEN_SPARK_DPS, VIS_BLOCK_DMG, VIS_BLOCK_SPD, VIS_BLOCK_WARN, VIS_HEAL_CANCEL, _mechVisQuench, VIS_FIN_SQUEEZES, VIS_FIN_COLS, VIS_FIN_ROWS, VIS_FIN_WARN, VIS_FIN_SQUEEZE_MS, VIS_FIN_DMG, VIS_FIN_IRON_DMG, VIS_FIN_FAILSAFE_MS, _visFinal, _visFinalActive, _visOnPhaseEnter, _visEnsureFinalWatcher, _visWatcherRun, _visAfter, _visFinalStart, _visFinalEnd, _visTeardown } from '../../js/combat/bosses/boss-vise.js';
import { GAL_EYE_R, GAL_EYE_SPEED, GAL_EYE_REPICK_MS, GAL_UPDRAFT_DMG, GAL_UPDRAFT_CD_MS, GAL_UPDRAFT_FLING, GAL_WIND_INTERVAL_MS, GAL_WIND_PUSH, GAL_WIND_STREAKS, GAL_FUNNEL_N, GAL_FUNNEL_SPAWN_MS, GAL_FUNNEL_SPEED, GAL_FUNNEL_DMG, GAL_FUNNEL_R, GAL_LADDER_N, GAL_LADDER_WARN_MS, GAL_LADDER_RISE_MS, GAL_LADDER_W, GAL_LADDER_DMG, GAL_LADDER_GAP_MS, GAL_CONTRACT_RINGS, GAL_CONTRACT_START_R, GAL_CONTRACT_MIN_R, GAL_CONTRACT_TIME_MS, GAL_CONTRACT_GAP_MS, GAL_CONTRACT_DMG, GAL_LANCE_WARN_MS, GAL_LANCE_FLIGHT_MS, GAL_LANCE_DMG, GAL_LANCE_FLING, _galeWatcher, _galPhase, _galeTeardown, _galeArenaInit, _galeShowWindBanner, _galeTickStreaks, _galeSpawnFunnel, _galeTickFunnels, _galeLadder, _galeTickLadder, _galeContract, _galeTickRings, _galeCycloneLance, _galeLance, _galeTickLances, _mechGaleVault } from '../../js/combat/bosses/boss-gale.js';
import { PILLAR_WIDTH, PILLAR_WARN_MS, PILLAR_ACTIVE_MS, PILLAR_STAGGER_SPREAD, BOLT_CRACKLE_WARN_MS, BOLT_CRACKLE_ACTIVE_MS, _mechSparkPillars, _dynamoStratifiedPositions, _dynamoBoltEl, _dynamoBoltPath, _dynamoPillarHits, CONDUCTOR_MAX, CONDUCTOR_HP_FRACTION, CONDUCTOR_HP_MIN, BEAM_HIT_PAD, BEAM_DPS, BEAM_HULL_DPS, DYNAMO_TICK_MS, DYNAMO_CRACKLE_MS, DYNAMO_JITTER_BUDGET, DYNAMO_LAYER_ID, DYNAMO_SVG_ID, _dynamoConductors, _dynamoSeq, _dynamoDamageTimer, _dynamoCrackleTimer, _dynamoLastBeamToast, _dynamoLastHullToast, _mechLightningConductors, _dynamoSpawnConductor, _dynamoPickSpot, _dynamoRenderConductorCard, _dynamoSyncCards, _dynamoFindBoss, _dynamoCardCenter, _dynamoNodes, _dynamoBeamSegs, DYNAMO_JAG_STEP_PX, _dynamoSegSteps, _dynamoNewOffsets, _dynamoBuildSegD, _dynamoEnsureSvg, _dynamoRemoveNet, _dynamoEmptySvg, _dynamoNet, _dynamoSvgEl, _dynamoTopoKey, _dynamoBuildNetStructure, _dynamoRebuildNet, _dynamoStartTicks, _dynamoStopTicks, _dynamoDamageTick, _dynamoDeathBurst, _removeConductor, _clearDynamoConductors, _convexHull, _pointInPolygon } from '../../js/combat/bosses/boss-dynamo.js';
import { CRASH_DMG, CRASH_STICKY_BLAST_R, CRASH_MEGA_DMG, CRASH_MEGA_WARN_MS, CRASH_MEGA_BLAST_R, CRASH_MEGA_R_MIN_PLAYER, CRASH_CELL_CHAIN_DMG, CRASH_CELL_CHAIN_R, CRASH_CELL_CHAIN_DELAY, _crashP, _crashRand, _crashCellCenter, _crashGridRect, _crashBoom, _crashArmDot, _mechStickyBombs, _mechBigBomb, _crashPickMegaSpots, _crashChainCells, CRASH_MAZE_CD_MS, CRASH_MAZE_TICKS, CRASH_MAZE_GRACE_MS, CRASH_MAZE_WAVE_PXPS, CRASH_MAZE_WALL_DMG_PCT, CRASH_MAZE_BLAST_DMG_PCT, CRASH_MAZE_HIT_CD_MS, CRASH_MAZE_CONTACT_PAD_PX, CRASH_MAZE_BLAST_R_MULT, CRASH_MAZE_PAD, CRASH_MAZE_PITCH_TARGET, CRASH_MAZE_PITCH_MIN, CRASH_MAZE_PITCH_ABS_MIN, CRASH_MAZE_REGION_MIN_W, CRASH_MAZE_REGION_MIN_H, CRASH_MAZE_FINALE_WALL_MS, CRASH_MAZE_FINALE_TAIL_MS, CRASH_SUPER_DROP_MS, CRASH_SUPER_FALL_PX, CRASH_SUPER_SIZE_MULT, CRASH_SUPER_CATCH_MULT, CRASH_SUPER_BOOM_MULT, _crashMaze, _crashMazeActive, _crashSetChargePause, _crashMazeSetShield, _crashMazeRegion, _crashMazeGeometry, _crashMazeBuild, _crashOnPhaseEnter, _crashMazeStart, _crashMazeGo, _crashSuperPos, _crashPlayerPathPx, _crashSuperMove, _crashSuperLand, _crashSuperCatch, _crashMazeFinale, _crashMazeEnd, _crashTeardown, _crashMazeShowOverlay, _crashMazeShowBanner } from '../../js/combat/bosses/boss-demolitionist.js';
import { LDS_R, LDS_DRIFT_SPEED, LDS_DRIFT_REPICK_MS, LDS_CLAMP_DMG, LDS_CLAMP_CD_MS, LDS_CLAMP_FLING, LDS_ATTRACT_SPEED, LDS_FLIP_MS, LDS_PULSE_SPEED, LDS_FILINGS_EVERY_MS, LDS_FILING_SPEED, LDS_FILING_DMG, LDS_VORTEX_MS, LDS_VORTEX_PULL, LDS_VORTEX_GRIND_R, LDS_VORTEX_GRIND_PCT, LDS_RAIL_N, LDS_RAIL_GAP_MS, LDS_RAIL_WARN_MS, LDS_RAIL_SLUG_SPEED, LDS_RAIL_DMG, LDS_RAIL_FLING, LDS_LEASH_WARN_MS, LDS_LEASH_CORRIDOR, LDS_LEASH_REEL_MS, LDS_LEASH_REEL_SPEED, LDS_LEASH_CLAMP_R, LDS_LEASH_DMG, LDS_LEASH_FLING, _lodestoneWatcher, _ldsPhase, _lodestoneTeardown, _lodestoneArenaInit, _ldsApplyPolarity, _ldsPulseRing, _ldsGrindTick, _ldsSpawnFiling, _ldsVortex, _ldsRailgun, _ldsFireRail, _lodestoneLeash, _ldsPlaceLine, _ldsDistToSegment, _mechPolarityField } from '../../js/combat/bosses/boss-lodestone.js';
import { COIL_R, COIL_SLITHER, COIL_BITE_DMG, COIL_BITE_CD_MS, COIL_BITE_FLING, COIL_SNAKE_INTERVAL_MS, COIL_SNAKE_ALIVE_MAX, COIL_SNAKE_SPEED, COIL_SNAKE_TRIGGER_R, COIL_FUSE_MS, COIL_BLAST_R, COIL_BLAST_DMG, COIL_TRAIL_LIFE_MS, COIL_TRAIL_DPS, COIL_CON_RING_N, COIL_CON_WARN_MS, COIL_CON_CONTRACT_MS, COIL_CON_DMG, COIL_CON_GAP_MS, COIL_TIDE_N, COIL_TIDE_WARN_MS, COIL_TIDE_CHARGERS, COIL_TIDE_SPEED, COIL_TIDE_DMG, COIL_COBRA_WARN_MS, COIL_COBRA_STRIKE_MS, COIL_COBRA_H, COIL_COBRA_DMG, _coilWatcher, _coilCobraActive, _coilSweep, _coilTeardown, _coilArenaInit, _coilPickMawSpot, _coilSpawnSnake, _coilConstrictor, _coilTide, _coilCobraStrike, _mechSeekerSnakes } from '../../js/combat/bosses/boss-coil.js';
import { _ND_DEBUG_SLOW, _ND_DEBUG_MULT, ND_GATE_DMG, ND_PIN_DMG, ND_STITCH_DMG, ND_PINB_DMG, ND_STAB_DMG, ND_FINAL_DMG, ND_HIT_CD_MS, _ndHitCd, _ndTouch, _ndThreadBurst, ND_GATE_GAP, ND_GATE_SPEED, ND_GATE_W, _mechNdNeedleGates, ND_PIN_COUNT, ND_PIN_LIFE, ND_PIN_R, _mechNdPinDrops, ND_WAVE_LANES, ND_WAVE_LANE_MS, ND_WAVE_GAP_MS, _mechNdStitchWave, ND_CUSHION_SPOKES, _mechNdPincushionBurst, ND_FINAL_TICK_MS, ND_FINAL_TICKS, ND_EYE_R, ND_EYE_R_FINAL, _ndFinal, _ndFinalActive, _ndOnPhaseEnter, _ndStartFinalWatcher, _ndMarkEye, _ndStab, _ndFinalStart, _ndFinalEnd, _ndTeardown } from '../../js/combat/bosses/boss-needle.js';
import { _BAR_DEBUG_SLOW, _BAR_DEBUG_MULT, BAR_TOUCH_CD_MS, BAR_HEAL_PCT, _barHitCd, _barTouch, _barPC, _barHeal, BAR_CURTAIN_W, BAR_CURTAIN_DMG, BAR_CURTAIN_ROWS, _barCurtainGapSize, _mechBarCurtain, BAR_DROP_WARN_MS, BAR_JAMMER_LIFE, BAR_JAMMER_SHELL_DMG, BAR_JAMMER_SHELL_SPD, BAR_JAMMER_LOB_MS, _mechBarSupplyDrop, BAR_SHELL_COUNT, BAR_SHELL_WARN_MS, BAR_SHELL_DMG, BAR_SHRAP_DMG, BAR_SHRAP_SPD, BAR_SHRAP_LIFE, _barCrates, BAR_BOMB_DMG, BAR_BOMB_WARN_MS, BAR_BOMB_TOTAL, BAR_BOMB_EVERY_MS, _barBombLive, _mechBarBombBarrage, _mechBarShotShells, _barShrapCd, BAR_VOLLEYS, BAR_VOLLEY_GAP, _barFinal, _barFinalActive, _barOnPhaseEnter, _barStartFinalWatcher, _barAfter, _barFinalStart, _barFinalEnd, _barTeardown } from '../../js/combat/bosses/boss-barrage.js';
import { MARKS_SHOTS, MARKS_INTERVAL_MS, MARKS_AIM_MS, MARKS_FLIGHT_MS, MARKS_RADIUS, MARKS_DMG, GAUNTLET_PCTS, GAUNTLET_CD_SEC, GAUNTLET_SPEED, GAUNTLET_HIT, GAUNTLET_HIT_CD_MS, GAUNTLET_ARROW_GAP, GAUNTLET_WALL_T, GAUNTLET_ARM_LEAD_MS, _marksWatcher, _marksGauntlet, _marksGauntletChargePaused, _marksGauntletApplyImmunity, _marksGauntletReleaseImmunity, _marksGauntletActive, _mechMarkedStrikes, _marksmanArenaInit, _marksGauntletWaves, _marksGauntletGridRect, _marksGauntletBuildBox, _marksGauntletBuildWalls, _marksGauntletArmBows, _marksGauntletDisarmBows, _marksGauntletVolleySfx, _marksGauntletGridLockToast, _marksGauntletStart, _marksGauntletClampPlayer, _marksGauntletFireWall, _marksGauntletEnd, _marksmanTeardown } from '../../js/combat/bosses/boss-marksman.js';
import { _AG_DEBUG_SLOW, _AG_DEBUG_MULT, AG_CHARGE_DMG, AG_ORB_DMG, AG_ROTOR_DMG, AG_BEAM_DMG, AG_VANG_DMG, AG_FINAL_DMG, AG_HIT_CD_MS, _agHitCd, _agTouch, _agGlowEl, _agAegisGlow, _agDebris, _mechAgAegisProtocol, AG_CHARGE_COUNT, AG_CHARGE_BAND, AG_CHARGE_SPEED, _mechAgShieldCharge, AG_SENTRY_COUNT, AG_SENTRY_LIFE, AG_ORB_SPEED, AG_ORB_LIFE, _mechAgSentries, AG_ROTOR_LIFE, AG_ROTOR_OMEGA, AG_ROTOR_INNER, _mechAgGuardRotor, AG_FINAL_TICK_MS, AG_FINAL_TICKS, AG_BEAM_OMEGAS, AG_VANG_GAP, AG_VANG_WARN, _agFinal, _agFinalActive, _agOnPhaseEnter, _agStartFinalWatcher, _agFinalStart, _agVanguard, _agFinalEnd, _agTeardown } from '../../js/combat/bosses/boss-aegis.js';
import { BRUTUS_SLAM_CHAIN_MAX_EXTRA, BRUTUS_SPRITE_HOIST_PX, BRUTUS_SPRITE_SMASH_MS, _brutusEaseInOut, _brutusSlamOffset, _mechGroundSlam, _brutusSlamBand, _brutusZombies, _brutusZombieTimer, _brutusFeedExpiries, _brutusWavePending, _brutusFeedHudTimer, _brutusFeedHudCount, _brutusBossCardId, BRUTUS_ZOMBIE_HEART_CHANCE, BRUTUS_ZOMBIE_LIFETIME_MS, BRUTUS_ZOMBIE_RISE_MS, BRUTUS_FEED_WINDOW_MS, BRUTUS_FEED_CHARGE_PCT, BRUTUS_FEED_MAX_STACKS, BRUTUS_ZOMBIES_MAX_FIELD, BRUTUS_ZOMBIE_DEF, _bossFeedChargeMult, _brutusEnsureFeedHudTimer, _brutusFeedHudTick, _brutusRenderFeedHud, _mechSacrificialZombies, _brutusSpawnZombie, _brutusRenderZombieCard, _brutusSyncZombieCard, _brutusEnsureTick, _brutusZombieTick, _brutusFeedZombies, _brutusRemoveZombie, _brutusPoof, _brutusZombieTeardown } from '../../js/combat/bosses/boss-brutus.js';
import { __SIRE_DEBUG_SLOW, _SIRE_DEBUG_MULT, SIRE_BEAM_DMG, SIRE_ECHO_HEAL, SIRE_PULL_DMG, SIRE_NOVA_DMG, SIRE_BUBBLE_DMG, SIRE_CRESC_DMG, SIRE_HIT_CD_MS, _sireHitCd, _sireTouch, _sireHeal, _sireSplash, _sireAnchor, _sireBeamHit, SIRE_BEAM_PATTERNS, _mechSireWail, SIRE_PULL_CYCLE, SIRE_PULL_STEP, SIRE_UNDERTOW_LIFE, _mechSireUndertow, SIRE_REPLY_LIFE, _mechSireReply, SIRE_FINALE_LINES, SIRE_LINE_CHARGE, SIRE_LINE_CHARGE_MIN, _sireFinal, _sireFinalActive, _sireOnPhaseEnter, _sireStartFinalWatcher, _sireFinalStart, _sireCrescendo, _sireFinalEnd, _sireTeardown } from '../../js/combat/bosses/boss-siren.js';
import { _SIR_DEBUG_SLOW, _SIR_DEBUG_MULT, SIR_TOUCH_CD_MS, _sirHitCd, _sirTouch, _sirPC, _sirHeal, SIR_ION_N, SIR_ION_WARN, SIR_ION_SPD, SIR_ION_HOT, SIR_TANGENT_MS, SIR_CHARGE_MAX, SIR_CHARGE_DECAY_MS, SIR_AURA_DPS, _sirCharge, _sirChipRun, _sirEnsureChip, _sirChargeNow, _mechSirIon, _mechSirStrikes, SIR_BOLT_SPD, SIR_BOLT_DMG, SIR_BOLT_LIFE, SIR_GROUND_R, _mechSirChain, SIR_EYE_DPS, SIR_EYE_LIFE, SIR_EYE_IMMUNE, _mechSirEye, SIR_FIN_BOXES, SIR_FIN_BOX_DMG, SIR_FIN_BULLET_DMG, SIR_FIN_BULLET_SPD, SIR_FIN_BULLET_DPS, SIR_FIN_FAILSAFE_MS, _sirFinal, _sirFinalActive, _sirOnPhaseEnter, _sirEnsureFinalWatcher, _sirWatcherRun, _sirAfter, _sirFinalStart, _sirFinalEnd, _sirTeardown } from '../../js/combat/bosses/boss-sirus.js';
import { _mechMemoryRite } from '../../js/combat/bosses/boss-maven.js';
import { _mechConstriction } from '../../js/combat/bosses/boss-exarch.js';
import { _INFV_DEBUG_SLOW, _INFV_DEBUG_MULT, INFV_LAVA_DPS, INFV_HEAT_MAX, INFV_HEAT_STILL, INFV_HEAT_MOVE, INFV_TILE_COOL, INFV_HAZE_MULT, INFV_BURST, INFV_TILE_LIFE, INFV_SURGE_HIT, INFV_SURGE_GAPS, INFV_VENTS, INFV_VENT_HIT, INFV_VENT_HAZE, INFV_BOMB_HIT, INFV_SURGE_GOAL, INFV_WINTER_TIME, INFV_LASTSTAND, INFV_DRIFT_DECAY, INFV_HIT_CD_MS, _infVHitCd, _infVTouch, _infVPC, _infVDelay, _infVHeat, _infVHeatRun, _infVHeatHudEl, _infVLavaZones, _infVTiles, _infVHazes, _infVLastX, _infVHotAuraTimer, _infVHudApply, _infVEnsureHeatRun, INFV_TIDE_MS, _mechInfVTides, INFV_TIDE_WARN, _infVSpawnTile, INFV_SURGE_MS, INFV_SURGE_GH, INFV_WALL_H, _mechInfVSurge, _mechInfVVents, INFV_WINTER_SURGE_Y, INFV_WINTER_VENT_X, _infVFinal, _infVFinalActive, _infVDrift, _infVDriftRun, _infVOnPhaseEnter, _infVStartFinalWatcher, _infVAfter, _infVFinalStart, _infVFallBombs, _infVLastStand, _infVCapBlown, _infVFinalEnd, _infVTeardown } from '../../js/combat/bosses/boss-inferno.js';
import { _MN_DEBUG_SLOW, _MN_DEBUG_MULT, MN_BAND_DMG, MN_BOLT_DMG, MN_SURGE_DMG, MN_HAIL_DMG, MN_SURGE_CLIP, MN_FLOOD_DMG, MN_HIT_CD_MS, _mnHitCd, _mnTouch, _mnRing, MN_BAND_W, MN_BAND_LIFE, _mechMnRainBands, MN_BOLT_COUNT, MN_BOLT_R, _mechMnThunderbolts, MN_SURGE_PEAK, MN_SURGE_RISE, MN_SURGE_HOLD, MN_SURGE_FALL, _mechMnStormSurge, MN_HAIL_COUNT, MN_HAIL_R, _mechMnHailBarrage, MN_FINAL_TICK_MS, MN_FINAL_TICKS, MN_ISLAND_R, MN_ISLAND_R_FINAL, MN_SURGE_STAGES, _mnFinal, _mnFinalActive, _mnOnPhaseEnter, _mnStartFinalWatcher, _mnPlaceIsland, _mnFinalStart, _mnFinalEnd, _mnTeardown } from '../../js/combat/bosses/boss-monsoon.js';
import { _BZ_DEBUG_SLOW, _BZ_DEBUG_MULT, BZ_RICOCHET_DMG, BZ_FLOOR_DMG, BZ_CUT_DMG, BZ_TRAP_DMG, BZ_PEND_DMG, BZ_FINAL_DMG, BZ_WALL_DMG, BZ_HIT_CD_MS, _bzGridCenter, _bzSawEl, _bzSparks, _bzHitCd, _bzTouch, BZ_RIC_BOUNCE_MS, BZ_FLOOR_LIFE_MS, _mechBzRicochetSaws, BZ_CUT_WINDUP_MS, BZ_CUT_BAND_W, _mechBzCutLine, BZ_TRAP_COUNT, BZ_TRAP_WINDUP_MS, BZ_TRAP_LIFE_MS, _mechBzSawTraps, BZ_PEND_SWINGS, _mechBzPendulumBlades, BZ_FINAL_CD_TICK_MS, BZ_FINAL_CD_TICKS, BZ_FINAL_POCKET_PCT, _bzFinal, _bzFinalActive, _bzOnPhaseEnter, _bzStartFinalWatcher, _bzFinalStart, _bzFinalBang, _bzFinalEnd, _bzTeardown } from '../../js/combat/bosses/boss-buzz.js';
import { _COLO_DEBUG_SLOW, _COLO_DEBUG_MULT, COLO_FOOT_DMG, COLO_WAVE_DMG, COLO_BOULDER_DMG, COLO_FRAG_DMG, COLO_GOLEM_DMG, COLO_GOLEM_BOOM_DMG, COLO_AVALANCHE_DMG, COLO_CHUTE_DMG, COLO_SEAL_HITS, COLO_CHARGE_DMG, COLO_CAVEIN_DMG, COLO_HIT_CD_MS, _coloHitCd, _coloTouch, _coloPC, _coloRubble, _coloShake, COLO_STRIDE_STEPS, COLO_FOOT_WARN_MS, COLO_WAVE_SPEED, COLO_WAVE_MAX_FRAC, _mechSeismicSlam, BOULDER_COUNT, BOULDER_FALL_MS, BOULDER_FRAGS, _mechColoBoulders, AVALANCHE_WALLS, _mechColoAvalanche, GOLEM_COUNT, GOLEM_SPEED, GOLEM_HITS, GOLEM_LIFE_MS, _mechColoGolems, COLO_FINALE_SEAL_MS, COLO_CHUTE_PERIOD_MS, COLO_CHUTE_WARN_MS, _coloFinal, _coloFinalActive, _coloOnPhaseEnter, _coloStartFinalWatcher, _coloAfter, _coloFinalStart, _coloCaveIn, _coloFinalEnd, _coloTeardown } from '../../js/combat/bosses/boss-colossus.js';
import { _GL_DEBUG_SLOW, _GL_DEBUG_MULT, GL_LATTICE_WAVES, GL_LATTICE_DMG, GL_LATTICE_STAGGER, GL_TOWER_COUNT, GL_TOWER_DMG, GL_ORB_SPEED, GL_ORB_DMG, GL_TRAIL_DMG, GL_TRAIL_LIFE, GL_WIRE_DMG, GL_JAM_DMG, GL_SURGE_DMG, GL_HIT_CD_MS, _glHitCd, _glTouch, _glSpark, _glDistToSeg, _mechGlLattice, GL_SCRAMBLE_WARN, GL_SCRAMBLE_LIVE, _mechGlScramble, GL_SURGE_LIFE, GL_SURGE_TURN, _mechGlSurge, GL_FINAL_BEATS, GL_BEAT_CHARGE, GL_BEAT_LIVE, GL_JAM_CHARGE, GL_JAM_LIVE, GL_WIRE_COUNT_H, GL_WIRE_COUNT_V, _glFinal, _glFinalActive, _glOnPhaseEnter, _glStartFinalWatcher, _glFinalStart, _glFinalEnd, _glTeardown } from '../../js/combat/bosses/boss-gridlock.js';
import { __JS_DEBUG_SLOW, _JS_DEBUG_MULT, JS_ORB_COUNT, JS_ORB_SPEED, JS_ORB_DMG, JS_CARD_DMG, JS_JINX_DMG, JS_LUCK_HEAL, JS_REVEAL_DMG, JS_SWEEP_DMG, JS_HIT_CD_MS, _jsHeal, _jsHitCd, _jsTouch, _jsConfetti, JS_MAYHEM_BEAT, _mechJsOrbs, JS_CARD_LIFE, JS_CARD_W, JS_CARD_H, _mechJsCards, JS_JINX_LIFE, JS_ORBIT_TURN, _mechJsJinx, JS_FINAL_SHOWS, JS_SHOW_CHARGE, JS_SHOW_CHARGE_MIN, JS_CARD_COLS, JS_CARD_ROWS, _jsFinal, _jsAfter, _jsFinalActive, _jsOnPhaseEnter, _jsStartFinalWatcher, _jsFinalStart, _jsBlackout, _jsFinalEnd, _jsTeardown } from '../../js/combat/bosses/boss-jester.js';
import { _mechAbyssDark } from '../../js/combat/bosses/boss-abyss.js';
import { _architectSpotTaken, _architectNewSpot, _mechRisingPlats } from '../../js/combat/bosses/boss-architect.js';
import { _mechTotemPulse, WARDEN_COLOR, _wardenAngDiff, _wardenPC, _wardenPlace, _wardenSetGap, _wardenSparks, _wardenTouch } from '../../js/combat/bosses/boss-warden.js';
import { _mechWardenSentries, _mechWardenSolitary } from '../../js/combat/bosses/boss-warden-hazards.js';
import '../../js/combat/bosses/boss-warden-lockdown.js';
import { _mechMaelstromVortex } from '../../js/combat/bosses/boss-maelstrom.js';
import { _mechStillnessTrial } from '../../js/combat/bosses/boss-arbiter.js';
import { THW_R, THW_HOVER_SPEED, THW_STOMP_INTERVAL_MS, THW_STOMP_WARN_MS, THW_STOMP_CRASH_MS, THW_STOMP_R, THW_STOMP_DMG, THW_STOMP_FLING, THW_COLLAPSE_MARKS, THW_COLLAPSE_MARK_MS, THW_COLLAPSE_STAGGER_MS, THW_COLLAPSE_DMG, THW_AFTERSHOCK_MS, THW_MINI_N, THW_MINI_HOP_MS, THW_MINI_SPEED, THW_MINI_R, THW_MINI_DMG, THW_MINI_SIEGE_MS, THW_GS_FOLLOW_MS, THW_GS_LOCK_MS, THW_GS_FALL_MS, THW_GS_DMG, THW_GS_SHOCK_R, THW_GS_SHOCK_DMG, _thwWatcher, _thwGrandSlamActive, _thwompSweep, _thwompTeardown, _thwompArenaInit, _thwPickHoverSpot, _thwShockRing, _thwCollapse, _thwSiege, _thwompGrandSlam, _mechThwompSlam } from '../../js/combat/bosses/boss-thwomp.js';
import { _MD_DEBUG_SLOW, _MD_DEBUG_MULT, MD_GAZE_DMG, MD_SNAKE_DMG, MD_WAVE_DMG, MD_COIL_DMG, MD_STARE_DMG, MD_HIT_CD_MS, _mdHitCd, _mdTouch, _mdEyesEl, _mdShards, MD_GAZE_W, MD_GAZE_SPEED, _mechMdStoneGaze, MD_SNAKE_COUNT, MD_SNAKE_BITES, MD_BITE_R, _mechMdSnakeStrikes, MD_WAVE_COUNT, MD_WAVE_SPEED, MD_WAVE_GAP, MD_WAVE_ROT, _mechMdPetrifyWaves, MD_COIL_SEGS, MD_COIL_R0, MD_COIL_R1, MD_COIL_LIFE, MD_COIL_ROT, MD_COIL_GAP, _mechMdCoilCage, MD_FINAL_TICK_MS, MD_FINAL_TICKS, MD_SHADOW_H, _mdFinal, _mdFinalActive, _mdOnPhaseEnter, _mdStartFinalWatcher, _mdRaiseStatue, _mdFinalStart, _mdStartGazeSweep, _mdFinalEnd, _mdTeardown } from '../../js/combat/bosses/boss-medusa.js';
import { _RZR_DEBUG_SLOW, _RZR_DEBUG_MULT, RZR_TOUCH_CD_MS, _rzrHitCd, _rzrTouch, _rzrPC, _rzrHeal, RZR_FAN_N, RZR_OUT_SPD, RZR_BACK_SPD, RZR_STAGGER_MS, RZR_OUT_DMG, RZR_BACK_DMG, _mechRzrCyclone, RZR_WIRE_N, RZR_WIRE_WARN, RZR_WIRE_HOLD, RZR_WIRE_DPS, RZR_WIRE_WHIP, RZR_WHIP_R, _mechRzrWires, RZR_HONE_MS, RZR_STONE_R, RZR_STONE_HP, RZR_GRIND_R, RZR_GRIND_DPS, RZR_SCYTHE_DMG, RZR_SCYTHE_WARN, RZR_SCYTHE_SPD, RZR_HEAL_CANCEL, _mechRzrHone, RZR_SPOKES, RZR_SPOKE_LEN_F, RZR_SPOKE_DPS, RZR_CYCLES, RZR_CYCLE_MS, RZR_REV_SPD, RZR_FAN_BLADES, RZR_LAST_DMG, RZR_POCKET_R, RZR_POCKET_DPS, RZR_FAILSAFE_MS, _rzrFinal, _rzrFinalActive, _rzrOnPhaseEnter, _rzrEnsureFinalWatcher, _rzrWatcherRun, _rzrAfter, _rzrFinalStart, _rzrFinalEnd, _rzrTeardown } from '../../js/combat/bosses/boss-razor.js';
import { _SHP_DEBUG_SLOW, _SHP_DEBUG_MULT, SHP_COLOR, _shpPC, _shpTouch, _shpShards, _shpPlace, _mechShpRift } from '../../js/combat/bosses/boss-shaper.js';
import { _mechShpIcicles, _mechShpBlizzard } from '../../js/combat/bosses/boss-shaper-ice.js';
import { _mechShpMonoliths, _mechShpWalker } from '../../js/combat/bosses/boss-shaper-guards.js';
import { _shpTeardown } from '../../js/combat/bosses/boss-shaper-winter.js';
import { _BLM_DEBUG_SLOW, _BLM_DEBUG_MULT, BLM_TOUCH_CD_MS, BLM_MAX_GARDENS, _blmHitCd, _blmTouch, _blmPC, BLM_FREEZE_MS, BLM_PAIR_FALLBACK_MS, BLM_WARN_MS, BLM_RADIUS, BLM_BURST_DMG, BLM_ROT_DPS, BLM_ROTOR_DMG, BLM_ROTOR_SPD, BLM_GARDEN_R, BLM_CRIT_AT, BLM_WITHER_AT, BLM_POD_DMG, BLM_POD_SPD, BLM_PODS, BLM_POD_PLANTS, _blmGardens, _mechBlmBlooms, _blmPlantGarden, _blmRotorHit, _blmSeedBurst, BLM_VOLLEY_N, _mechBlmVolley, _mechBlmVeil, BLM_JUDGMENTS, _blmFinal, _blmFinalActive, _blmOnPhaseEnter, _blmStartFinalWatcher, _blmAfter, _blmFinalStart, _blmFinalEnd, _blmTeardown } from '../../js/combat/bosses/boss-bloom.js';
import { _MNT_DEBUG_SLOW, _MNT_DEBUG_MULT, MNT_TOUCH_CD_MS, _mntHitCd, _mntTouch, _mntPC, _mntHeal, MNT_WALL_W, MNT_WALL_RISE_MS, MNT_WALL_HOLD_MS, MNT_CHARGE_WARN_MS, MNT_CHARGE_SPD, MNT_LANE_H, MNT_RUSH_DMG, MNT_WALL_BREAK_DMG, _mechMntLabyrinth, MNT_CRATERS, MNT_CRATER_WARN_MS, MNT_CRATER_DMG, MNT_DUST_DPS, MNT_DUST_LIFE, _mechMntHoofterrain, MNT_THREAD_LIFE, MNT_THREAD_HEAL, _mechMntThread, MNT_GENWALLS, MNT_STONES, MNT_STONE_HP, MNT_STONE_HIT_R, MNT_TRAMPLE_DMG, _mntFinal, _mntFinalActive, _mntOnPhaseEnter, _mntStartFinalWatcher, _mntAfter, _mntFinalStart, _mntFinalEnd, _mntTeardown } from '../../js/combat/bosses/boss-minotaur.js';
import { _SHR_DEBUG_SLOW, _SHR_DEBUG_MULT, SHR_TOUCH_CD_MS, _shrHitCd, _shrTouch, _shrPC, _shrHeal, SHR_BARS_N, SHR_HUM_MS, SHR_LIT_MS, SHR_BAR_DPS, SHR_KNOT_MS, SHR_KNOT_DPS, SHR_KNOT_R, SHR_BURN_DMG, _mechShrBarriers, SHR_FAN_N, SHR_FAN_SPD, SHR_FAN_DMG, SHR_REC_MS, SHR_ROUTE_MS, SHR_SHARD_DMG, SHR_STOP_DMG, _mechShrMirrors, SHR_WARD_MS, SHR_WARD_R, SHR_WARD_HP, SHR_CHAN_DPS, SHR_SEAL_DMG, SHR_SEAL_WARN, SHR_SEAL_SPD, SHR_HEAL_CANCEL, _mechShrWard, SHR_ARMS, SHR_ARM_LEN_F, SHR_ARM_DPS, SHR_BEAM_SPD, SHR_KNOCKS, SHR_KNOCK_MS, SHR_GRID_COLS, SHR_GRID_ROWS, SHR_GRID_WARN, SHR_GRID_DMG, SHR_THOUS_DMG, SHR_SAFE_R, SHR_FAILSAFE_MS, _shrFinal, _shrFinalActive, _shrOnPhaseEnter, _shrEnsureFinalWatcher, _shrWatcherRun, _shrAfter, _shrFinalStart, _shrFinalEnd, _shrTeardown } from '../../js/combat/bosses/boss-shrine.js';
import { _SW_DEBUG_SLOW, _SW_DEBUG_MULT, SW_ARC_DMG, SW_ARC_DPS, SW_LARVA_HEAL, SW_MIMIC_DMG, SW_CLOUD_DPS, SW_EDGE_DPS, SW_BLOOM_DMG, SW_CHARGE_DMG, SW_FUNNEL_DMG, SW_HIT_CD_MS, _swHitCd, _swTouch, _swPC, _swHeal, _swHatchPing, SW_WEDGE, SW_ARC_SPEED, SW_ARC_RADIUS, SW_TRAIL_LIFE, _mechSwSwarmArc, MIMIC_OPEN_MS, MIMIC_CLOUD_LIFE, _mechSwMimicQueen, _swFlareEl, BLOOM_LIFE, BLOOM_HOLE, _mechSwHiveEye, SW_FINALE_CHARGES, SW_FINALE_CHARGE_MS, SW_FINALE_CHARGE_MIN, SW_FUNNEL_ROWS, SW_FUNNEL_ROW_MS, _swFinal, _swFinalActive, _swOnPhaseEnter, _swStartFinalWatcher, _swAfter, _swFinalStart, _swFinalEnd, _swTeardown } from '../../js/combat/bosses/boss-swarm.js';
import { STK_CELL, STK_DRIFT_SPEED, STK_DRIFT_REPICK_MS, STK_SLAM_DMG, STK_SLAM_CD_MS, STK_SLAM_FLING, STK_SOFT_EVERY_MS, STK_PIECE_FALL, STK_LAND_R, STK_LAND_DMG, STK_FLOOR_DMG, STK_FLOOR_TTL, STK_HD_N, STK_HD_WARN_MS, STK_HD_FALL, STK_HD_SHOCK_R, STK_HD_DMG, STK_HD_FLING, STK_HD_GAP_MS, STK_HD_FLOOR_TTL, STK_LC_ROWS, STK_LC_ROW_H, STK_LC_WARN_MS, STK_LC_DET_MS, STK_LC_DMG, STK_LC_GAP_MS, STK_GR_RISE_MS, STK_GR_HOLD_MS, STK_GR_SINK_MS, STK_GR_FLOOD, STK_GR_TOP_CAP, STK_GR_DMG, STK_GR_TICK_MS, STK_GR_FLING_UP, STK_COLORS, _stackWatcher, _stkPhase, _stackTeardown, _stkRemoveCells, _stackArenaInit, _stkPlaceCore, _stkCoreHit, _stkCellsHit, _stkPieceHit, _stkQueuePiece, _stkMakePiece, _stkLand, _stkGhost, _stkHardDrop, _stkLineClear, _stkQueueRow, _stackGarbage, _mechBlockFall } from '../../js/combat/bosses/boss-stack.js';
import { _mechEmberDrift } from '../../js/combat/bosses/boss-ember.js';
import { _snailDoom, _snailSlimed, _snailBroooms, _snailBroomTickTimer, _snailNextDoomAt, SNAIL_SLIME_CHANCE, SNAIL_SLIME_COOLDOWN_MS, SNAIL_SLIME_PER_SNAIL, SNAIL_SLIME_MAX_TOTAL, SNAIL_SWEEP_MS, SNAIL_BROOM_TICK_MS, SNAIL_BROOM_COUNT, SNAIL_BROOM_MARGIN, SNAIL_DOOM_BANISH_COOLDOWN_MS, _snailHeldBroom, _snailBroomHeld, _snailSweeping, _snailIsCellSlimed, _snailCellFromPoint, _snailSlimeCell, _snailRemoveSlime, _snailTrySlime, _snailCrashIntoCorruption, SNAIL_BROOM_BOX_W, SNAIL_BROOM_BOX_H, _snailBroomHomes, _snailRestingBroomOverlapsGrid, _snailRehomeBroooms, _snailEnsureBroom, _snailPickupBroom, _snailDropBroom, _snailSyncSweepLabel, _snailSetChargePauseClass, _snailSyncBroomChargePause, _snailSweepTarget, _snailBroomTick, _snailCleanCell, _snailOnPuzzleTransition, _snailTeardown, _mechDoomSnail, SNAILGEDDON_CD_MS, SNAILGEDDON_TICKS, SNAILGEDDON_FRAME_PAD, SNAILGEDDON_CORNER_R, SNAILGEDDON_SPACING_PX, SNAILGEDDON_N_MIN, SNAILGEDDON_N_MAX, SNAILGEDDON_CLOSE_S, SNAILGEDDON_SLOW_MULT, SNAILGEDDON_SLOW_ARC_MIN, SNAILGEDDON_SLOW_ARC_MAX, SNAILGEDDON_GAP_MARGIN_PX, SNAILGEDDON_RUN_SPEED_PX, SNAILGEDDON_MAX_MS, SNAILGEDDON_DMG_PCT, SNAILGEDDON_HIT_CD_MS, SNAILGEDDON_NUDGE_PX, SNAILGEDDON_NUDGE_MIN_DIST, SNAILGEDDON_SNAIL_RECOIL_PX, SNAILGEDDON_ESCAPE_PX, _snailgeddon, _snailgeddonActive, _snailgeddonPlaceShield, _snailgeddonShowShield, _snailgeddonDropShield, _snailGridCentre, _snailRRPerimeter, _snailFramePoint, _snailRRContains, _snailgeddonBurst, _snailgeddonPlaceOverlay, _snailgeddonShowOverlay, _snailOnPhaseEnter, _snailgeddonStart, _snailgeddonGo, _snailgeddonEnd } from '../../js/combat/bosses/boss-snail.js';
import { JELLY_HOP_ARC_PX, JELLY_SLIP_TO_BOSS_MS, JELLY_SLIP_ARC_PX, JELLY_GATE_DMG_PCT, JELLY_GATE_REST_MS, JELLY_GATE_WARN_MS, JELLY_GATE_RADIUS, JELLY_GATE_FIRST_BLOB_MS, JELLY_GATE_BLOB_GAP_MS, JELLY_ICE_TARGET, JELLY_ICE_LIFETIME_MS, JELLY_ICE_REFILL_MS, JELLY_ARMY_COUNT, JELLY_ARMY_STAGGER_MS, JELLY_ARMY_DMG_PCT, JELLY_ARMY_REST_MS, JELLY_ARMY_WARN_MS, JELLY_ARMY_RADIUS, _jellyGate, _jellyArmy, _jellyRand, _jellyMonsterById, _jellyBossCenter, _jellySpawnBlob, _jellyStepBlob, _jellyIcePickTargets, _jellyTopUpIce, _jellyPruneIce, _jellyIceAt, _jellyIceContains, _jellyClearSafeMark, _jellyHideGuide, _jellyShowGuide, _jellySyncSafeMark, _jellyBlobLockedCue, _jellyStartShieldGate, _jellyPlaceBubble, _jellyShieldBroken, _jellyDropGateVisuals, _jellyShatterBurst, _jellyStartArmy, _jellyOnPhaseEnter, _mechJellyHops } from '../../js/combat/bosses/boss-jelly.js';
import { GUST_WIND_EVERY_MS, GUST_WIND_WARN_MS, GUST_WIND_RAMP_MS, GUST_WIND_DUR, GUST_STORM_WARN_LEAD_MS, GUST_PUSH, GUST_RIDE_MULT, GUST_RESIST_MULT, GUST_MIN_NET_DRIFT, GUST_SPIKE_W, GUST_SPIKE_HIT, GUST_SPIKE_DOT, GUST_SPIKE_CD_MS, GUST_BREAK_W, GUST_BREAK_H, GUST_BREAK_CATCH, GUST_BREAK_FADE_MS, GUST_BLADE_INTERVAL, GUST_BLADE_SPEED, GUST_BLADE_R, GUST_BLADE_DMG, GUST_BLADE_TELL_MS, GUST_BLADE_TWIN_P, GUST_TORNADO_SPEED, GUST_TORNADO_W, GUST_TORNADO_H, GUST_TORNADO_HIT_W, GUST_TORNADO_HIT_H, GUST_TORNADO_DMG, GUST_TORNADO_CD_MS, GUST_TORNADO_WARN_MS, GUST_TORNADO_PULL, GUST_TORNADO_PULL_INNER, GUST_TORNADO_PULL_OUTER, GUST_BOSS_X_PAD, _gustArena, _gustWindPause, _gustChargePaused, _gustSetChargePause, _gustLastPX, _gustPlayerSteer, _gustPhaseOf, _gustLiveMonster, _gustWindToast, _gustArenaInit, _gustArenaTick, _gustLightningWarn, _gustWindStart, _gustBlade, _gustFireVolley, GUST_DAGGER_EVERY_MS, GUST_DAGGER_CHANCE, GUST_DAGGER_SPEED, GUST_DAGGER_R, GUST_DAGGER_HIT, GUST_DAGGER_CD_MS, _gustDaggerLaunch, _gustDaggerFly, _gustTeardown } from '../../js/combat/bosses/boss-gust.js';
import { SPROUT_VINE_INTERVAL_MS, SPROUT_VINE_CAP, SPROUT_VINE_LIFETIME_MS, SPROUT_SPORE_INTERVAL_MS, SPROUT_SPORE_DMG, SPROUT_SPORE_CD_MS, SPROUT_SPORE_SPEED, SPROUT_BRAMBLE_MS, SPROUT_WHIP_DMG, SPROUT_WHIP_LEN, SPROUT_WHIP_OUT_MS, SPROUT_WHIP_HOLD_MS, SPROUT_WHIP_BACK_MS, SPROUT_WHIP_TIMES, SPROUT_BUD_MS, SPROUT_BUD_R, SPROUT_MOTE_N, SPROUT_MOTE_SPEED, SPROUT_MOTE_DMG, SPROUT_MOTE_CD_MS, SPROUT_MOTE_LIFE_MS, SPROUT_DUST_MS, SPROUT_DUST_BURST, SPROUT_DUST_BURST_CD_MS, SPROUT_DUST_WARN_MS, SPROUT_REBLOOM_MS, SPROUT_BUDS_MAX, SPROUT_LUNGE_WARN_MS, SPROUT_LUNGE_STRIKE_MS, SPROUT_LUNGE_FADE_MS, SPROUT_LUNGE_H, SPROUT_LUNGE_DMG, _sproutWatcher, _sproutLungeActive, _sproutSweep, _sproutTeardown, _sproutVinePool, _sproutAddVine, _sproutCellIntercept, _sproutPollenBurst, _sproutVineLunge, _sproutArenaInit, _sproutBrambleWall, _sproutGrowBud, _sproutBloom, _mechSproutlings } from '../../js/combat/bosses/boss-sprout.js';
import { CLOCK_SUMMON_WARN_MS, CLOCK_HAND_OMEGA, CLOCK_PHASE_SPEED_STEP, CLOCK_HIT_SLACK_PX, CLOCK_HURTBOX_INSET_PX, CLOCK_SPAWN_GRACE_MS, CLOCK_HIT_CD_MS, CLOCK_SPAWN_STAGGER_RAD, CLOCK_SPAWN_JITTER_RAD, CLOCK_FREEZE_WARN_MS, CLOCK_FREEZE_TRIGGER_PCT, CLOCK_FREEZE_DURATION_MS, CLOCK_FREEZE_STRIKE_MS, CLOCK_FREEZE_BEAMS, CLOCK_FREEZE_HOLD_PX, CLOCK_FREEZE_LUNGE_PX, CLOCK_FREEZE_DMG_PCT, CLOCK_FREEZE_COLOR, CLOCK_FREEZE_RING_RADIUS, CLOCK_HAND_SECONDS, CLOCK_HAND_MINUTES, CLOCK_HAND_HOURS, _clockUnitLabel, _clockValueFromAngle, _clockMakeHand, _clockPlayerPts, _clockShowCall, _mechClockHands, _clockClearFreezeWarn, _clockTimeFreezeEnd, _clockL10n, _clockRayEdgeDist, _clockFreezeApplyStrike, _clockShowFreezeWarnBanner, _clockStartTimeFreezeWarn, _clockStartTimeFreeze } from '../../js/combat/bosses/boss-clock.js';
import { PUD_RAIN_INTERVAL_MS, PUD_RAIN_SPEED, PUD_RAIN_R, PUD_RAIN_DMG, PUD_RAIN_HIT_CD_MS, PUD_WATER_PCT, PUD_WATER_RISE, PUD_WATER_DOT, PUD_FOUNTAIN_DMG, PUD_FOUNTAIN_MS, PUD_FOUNTAIN_H, PUD_FOUNTAIN_CANOPY_W, PUD_FOUNTAIN_W, PUD_BUBBLE_N, PUD_BUBBLE_R, PUD_BUBBLE_SPEED, PUD_BUBBLE_RESPAWN_MS, PUD_SHARD_SPEED, PUD_SHARD_DMG, PUD_SHARD_CD_MS, PUD_WAVE_TELEGRAPH_MS, PUD_WAVE_SPEED, PUD_WAVE_W, PUD_WAVE_H, PUD_WAVE_DMG, _pudWatcher, _puddleTeardown, _pudSpawnDrop, _pudSpawnBubble, _pudBurstBubble, _pudSpawnFountain, _pudSplash, _pudConsumeDrop, _pudFountainHeight, _pudFountainWidth, _puddleArenaInit } from '../../js/combat/bosses/boss-puddle.js';
import { FIREFLY_COUNT, FIREFLY_MAX_HP, FIREFLY_RESPAWN_MS, FIREFLY_NAMES, _fireflyName, FIREFLY_ORBIT_SPEED, FIREFLY_FLY_SPEED, FIREFLY_DARK_PCT, FIREFLY_BURST_TELL_MS, FIREFLY_BURST_R, FIREFLY_BURST_PLAYER_PCT, FIREFLY_BURST_CHIP, FIREFLY_BURST_CADENCE, FIREFLY_BURST_TWINS, FIREFLY_HOLE_R, FIREFLY_FEATHER_R, FIREFLY_CLUSTER_BONUS_R, FIREFLY_EMOJIS, FIREFLY_TRIAL_TOL, FIREFLY_FAIL_PLAYER_PCT, FIREFLY_FAIL_LIGHT_PCT, _fireflyRuns, _fireflyMouse, _fireflyText, _fireflyToast, _fireflyStart, _fireflyTick, _fireflyPaintMask, _fireflyCommand, _initEgFireflyHotkeys, _fireflyCycle, _fireflyRecallAll, _fireflyDragStart, _fireflyBurstPhase, _fireflyBurstRemove, _fireflyBurstSchedule, _fireflyBurstCast, _fireflyTrialLayout, FIREFLY_TRIALS, _fireflyTrialActive, _fireflyStartTrial, _fireflyInTarget, _fireflyAssignToCircles, _fireflyResolveTrial, _fireflyTeardown } from '../../js/combat/bosses/boss-firefly.js';
import { BUMP_BUMPER_N, BUMP_BUMPER_R, BUMP_BUMPER_SPEED, BUMP_FLING, BUMP_THWACK_DMG, BUMP_THWACK_CD_MS, BUMP_SHOWER_INTERVAL_MS, BUMP_BALL_SPEED, BUMP_BALL_DMG, BUMP_BALL_CD_MS, BUMP_BALL_R, BUMP_BALL_BOUNCE_BOOST, BUMP_BALL_MAX_SPEED, BUMP_SLING_LEN, BUMP_SLING_T, BUMP_SLING_KICK, BUMP_SLING_TILT_KICK, BUMP_FLIP_MS, BUMP_FLIP_WARN_MS, BUMP_FLIP_STRIKE_MS, BUMP_FLIP_CYCLE_MS, BUMP_FLIP_DMG, BUMP_TILT_MS, BUMP_MULTIBALL_N, BUMP_MULTIBALL_MS, BUMP_MULTIBALL_SPEED, BUMP_SLAM_WARN_MS, BUMP_SLAM_RING_MS, BUMP_SLAM_R, BUMP_SLAM_DMG, BUMP_SLAM_FLING, _bumpWatcher, _bumpSlamActive, _bumpCapBallSpeed, _bumperSweep, _bumperTeardown, _bumpFlingHit, _bumpSpawnSlings, _bumpSlingBall, _bumperArenaInit, _bumperFlipperFrenzy, _bumperSpawnBand, _bumperMultiball, _bumperSlam, _mechBumperParty } from '../../js/combat/bosses/boss-bumper.js';
import { STRK_BALL_SPEED, STRK_BALL_TURN, STRK_BALL_R, STRK_TACKLE_DMG, STRK_TACKLE_FLING, STRK_TACKLE_CD_MS, STRK_PARRY_KICK_SPEED, STRK_PARRY_KICK_MS, STRK_GOAL_MOUTH_W, STRK_GOAL_OUT_MS, STRK_GOAL_RESPAWN_GRACE_MS, STRK_KEEPER_THROW_SPEED, STRK_KEEPER_THROW_MS, STRK_KICK_BUDGET_G1, STRK_KICK_BUDGET_G3, STRK_KICK_RADIUS, STRK_KICK_CHARGE_MS, STRK_KICK_SPEED_MIN, STRK_KICK_SPEED_MAX, STRK_KICK_DECEL, STRK_KICK_BOUNCE, STRK_KICK_STOP, STRK_GOAL_DMG_MIN, STRK_GOAL_DMG_MAX, STRK_FK_WARN_MS, STRK_FK_FLIGHT_MS, STRK_FK_DMG, STRK_FK_WALL_N, _strkWatcher, _strkFkActive, _strikerSweep, _strikerTeardown, _strkSpawnBall, _strkSpawnGoal, _strkScoreGoal, _strkGoalTimerTick, _strkKickoff, _strkKickTrail, _strkBallGhost, _strkAdvanceBall, _strikerArenaInit, _strkScoringStart, _strkScoringBallSpawn, _strkScoringDrawBall, _strkScoringPotentialDmg, _strkScoringKick, _strkScoringTick, _strkScoringGoal, _strkScoringEnd, _strkScoringActive, _strkGoalPop, _strkFreeKick, _mechStrikerBall } from '../../js/combat/bosses/boss-striker.js';
import { CENT_SEGS, CENT_SEG_GAP, CENT_SPEED, CENT_MOLT_SPEED, CENT_SEG_DMG, CENT_SEG_CD_MS, CENT_MOUND_INTERVAL_MS, CENT_MOUND_R, CENT_MOUND_LIFE_MS, CENT_MOUND_CLOSED_MS, CENT_MOLT_BURY_MS, CENT_RESURFACE_WARN_MS, CENT_RESURFACE_DMG, CENT_RESURF_BAIT_R, CENT_RESURF_BAIT_LOCK_MS, CENT_SHELL_MS, CENT_SHELL_WAVES, CENT_SHELL_N, CENT_SHELL_DMG, CENT_SHELL_CD_MS, CENT_MOLT_SWELL_MS, CENT_MOLT_MINI_SEGS, CENT_MOLT_MINI_SPEED, CENT_VENOM_INTERVAL_MS, CENT_VENOM_WARN_MS, CENT_VENOM_R, CENT_VENOM_BLOBS, CENT_VENOM_DMG, CENT_POOL_DPS, CENT_POOL_MS, CENT_STAMPEDE_WARN_MS, CENT_STAMPEDE_STRIKE_MS, CENT_STAMPEDE_H, CENT_STAMPEDE_DMG, _centWatcher, _centStampedeActive, _centipedeSweep, _centipedeTeardown, _centSpawnBody, _centAdvance, _centipedeArenaInit, _centMound, _centCloseMound, _centMoundHit, _centShell, _centMolt, _centVenomBurst, _centStampede, _mechCentipedeCross } from '../../js/combat/bosses/boss-centipede.js';
import { DAN_BALL_R, DAN_WALTZ_SPEED, DAN_WALTZ_REPICK_MS, DAN_TWIRL_DMG, DAN_TWIRL_CD_MS, DAN_TWIRL_FLING, DAN_STEPS_N, DAN_BEAT_MS, DAN_STEP_SEQ_GAP_MS, DAN_STEP_DMG, DAN_STEP_HEAL, DAN_RIBBON_N, DAN_RIBBON_WARN_MS, DAN_RIBBON_SWEEP_MS, DAN_RIBBON_GAP_MS, DAN_RIBBON_DMG, DAN_RIBBON_HIT_CD_MS, DAN_RIBBON_HALF_W, DAN_CURTAIN_N, DAN_CURTAIN_WARN_MS, DAN_CURTAIN_DMG, DAN_CURTAIN_R, DAN_CURTAIN_SLOW_MS, DAN_CURTAIN_DRAG, DAN_CURTAIN_PULL_R, DAN_PETAL_WAVES, DAN_PETAL_PER_WAVE, DAN_PETAL_WAVE_GAP_MS, DAN_PETAL_SPEED, DAN_PETAL_DMG, DAN_PETAL_MS, DAN_PETAL_AMBIENT_MS, DAN_PIRO_MS, DAN_PIRO_WARN_MS, DAN_PIRO_RING_R, DAN_PIRO_RING_TRAVEL_MS, DAN_PIRO_RING_GAP_MS, DAN_PIRO_RINGS, DAN_PIRO_EDGE, DAN_PIRO_RING_DMG, DAN_PIRO_HIT_CD_MS, _dancerWatcher, _danPhase, _danHeal, _dancerTeardown, _dancerArenaInit, _dancerStartSteps, _dancerTickSteps, _dancerSpawnRibbon, _dancerTickRibbons, _dancerBeamHit, _dancerCurtainCall, _dancerTickCurtains, _dancerPetalStorm, _dancerTickStorm, _dancerTickPetals, _dancerSpawnPetal, _dancerPirouette, _dancerPiroRing, _mechDanceSteps } from '../../js/combat/bosses/boss-dancer.js';
import { GMB_CHIP_R, GMB_DRIFT_SPEED, GMB_DRIFT_REPICK_MS, GMB_SLAM_DMG, GMB_SLAM_CD_MS, GMB_SLAM_FLING, GMB_VOLLEY_N, GMB_VOLLEY_MS, GMB_CHIP_SPEED, GMB_CHIP_DMG, GMB_WHEEL_SPIN_MS, GMB_WHEEL_SNAKE_DMG, GMB_WHEEL_HEAL_BOSS, GMB_WHEEL_HEAL_PLAYER, GMB_RUSH_WAVES, GMB_RUSH_PER_WAVE, GMB_RUSH_WAVE_GAP_MS, GMB_SYMBOL_SPEED, GMB_SYMBOL_DMG, GMB_SEVEN_BURST_DMG, GMB_SEVEN_BURST_R, GMB_RUSH_MS, GMB_RR_MARK_MS, GMB_RR_DMG, GMB_RR_R, _gamblerWatcher, _gmbPhase, _gmbHealPct, _gmbHealBoss, _gamblerTeardown, _gamblerArenaInit, _gamblerThrowCard, _gamblerTickCards, GMB_WHEEL_FACES, GMB_WHEEL_KEYS, _gamblerWheel, _gamblerWheelResolve, _gamblerRush, _gamblerTickRush, GMB_SYMBOL_FACES, _gamblerSpawnSymbol, _gamblerTickSymbols, _gamblerBurst, _gamblerTickBursts, _gamblerRoulette, _gamblerShellPop, _mechLoadedDice } from '../../js/combat/bosses/boss-gambler.js';
import { TCT_R, TCT_GLIDE_SPEED, TCT_GLIDE_REPICK_MS, TCT_ROOK_DMG, TCT_ROOK_CD_MS, TCT_ROOK_FLING, TCT_INTENT_EVERY_MS, TCT_INTENT_DECLARE_MS, TCT_ORB_SPEED, TCT_ORB_DMG, TCT_PAWN_EVERY_MS, TCT_PAWN_WARN_MS, TCT_PAWN_SPEED, TCT_PAWN_DMG, TCT_PAWN_GAP_W, TCT_CHECK_LANES, TCT_CHECK_WARN_MS, TCT_CHECK_DASH_SPEED, TCT_CHECK_LANE_H, TCT_CHECK_DMG, TCT_CHECK_FLING, TCT_CHECK_GAP_MS, TCT_ZUG_MS, TCT_BISHOP_EVERY_MS, TCT_BISHOP_WARN_MS, TCT_BISHOP_DMG, TCT_KNIGHT_LEAPS, TCT_KNIGHT_WARN_MS, TCT_KNIGHT_R, TCT_KNIGHT_DMG, TCT_KNIGHT_FLING, TCT_CM_WARN_MS, TCT_CM_CLOSE_MS, TCT_CM_THICK, TCT_CM_DMG, TCT_CM_FLING, _tacticianWatcher, _tctPhase, _tacticianTeardown, _tacticianArenaInit, _tctDeclare, _tctExecute, _tctQueuePawn, _tctCheck, _tctSpawnLane, _tctZugzwang, _tctQueueBeam, _tctBeamHits, _tctQueueLeap, _tacticianCheckmate, _mechBattleIntent } from '../../js/combat/bosses/boss-tactician.js';
import { GMT_MOUTH_R, GMT_DRIFT_SPEED, GMT_DRIFT_REPICK_MS, GMT_CHOMP_DMG, GMT_CHOMP_CD_MS, GMT_CHOMP_FLING, GMT_CHOMP_HEAL, GMT_INHALE_IDLE_MS, GMT_INHALE_MS, GMT_PULL_SPEED, GMT_SPIT_N, GMT_FOOD_SPEED, GMT_FOOD_DMG, GMT_PLATE_SPEED, GMT_PLATE_DMG, GMT_PLATE_CD_MS, GMT_TRAIL_TTL_MS, GMT_TRAIL_GAP_MS, GMT_TRAIL_DMG, GMT_TRAIL_TICK_MS, GMT_TRAIL_MAX, GMT_CLOCHE_N, GMT_CLOCHE_WARN_MS, GMT_CLOCHE_R, GMT_CLOCHE_DMG, GMT_CLOCHE_GAP_MS, GMT_CLOCHE_POOL_TTL, GMT_BANQUET_WAVES, GMT_BANQUET_PER_WAVE, GMT_BANQUET_GAP_MS, GMT_DISH_SPEED, GMT_DISH_DMG, GMT_BANQUET_MS, GMT_DEVOUR_LOCK_MS, GMT_DEVOUR_SUCK_MS, GMT_DEVOUR_SUCK_SPEED, GMT_DEVOUR_R, GMT_DEVOUR_DMG, GMT_DEVOUR_FLING, _gourmetWatcher, _gmtPhase, _gmtHealBoss, _gourmetTeardown, _gourmetArenaInit, _gmtWarn, _gmtSpitFood, _gmtDropPool, _gourmetDinnerService, _gourmetBanquet, _gmtDropDish, _gourmetDevour, _mechGourmetGulp } from '../../js/combat/bosses/boss-gourmet.js';
import { _EN_DEBUG_SLOW, _EN_DEBUG_MULT, EN_CIRCLE_DMG, EN_EQ_DMG, EN_SPOT_DMG, EN_MINE_DMG, EN_FINAL_DMG, EN_TICK_DMG, EN_HIT_CD_MS, _enHitCd, _enTouch, _enConfetti, _enApplause, EN_CIRCLE_STAGGER_MS, _mechEnEncoreCircles, EN_BAR_W, _mechEnSoundBars, EN_LIGHT_TRACK_MS, EN_LIGHT_LOCK_MS, EN_LIGHT_BLAST_R, _mechEnStageLights, EN_MINE_COUNT, EN_MINE_BEAT_MS, EN_MINE_STAGGER_MS, EN_MINE_POP_BEATS, EN_MINE_NOVA_R, _mechEnBeatMines, EN_FINAL_TICK_MS, EN_FINAL_TICKS, EN_FINAL_SPOT_R, _enFinal, _enFinalActive, _enOnPhaseEnter, _enStartFinalWatcher, _enPlaceSpotlight, _enFinalStart, _enFinalBang, _enFinalEnd, _enTeardown } from '../../js/combat/bosses/boss-encore.js';
import { _BOMBER_DEBUG_SLOW, _BOMBER_DEBUG_MULT, BMB_MINE_DMG, BMB_CARPET_DMG, BMB_CLUSTER_DMG, BMB_FINAL_WAVE_DMG, BMB_FINAL_AFTERTICK_DMG, BMB_MINE_LIFE_MS, BMB_MAX_LIVE_MINES, BMB_HIT_CD_MS, _bmbMines, _bmbMineKeeper, _bmbKeeperRun, _bomberFinal, _bomberFinalActive, _bomberApplyFlightStyle, _bomberOnInit, _bmbPlantMine, _bmbDetonateMine, _bmbFizzleMine, _bmbClearMines, _bmbMineWatch, _bmbBoom, _bmbTeardown, _bmbEnsureKeeper, _bmbFieldRun, BMB_COLLAR_MINES, BMB_COLLAR_ORBIT_MS, BMB_COLLAR_DRIFT_MS, BMB_COLLAR_RING_R, _bmbGridCenter, _mechMineCollar, BMB_CARPET_SPACING, BMB_CARPET_FUSE_MS, BMB_CARPET_SPEED, BMB_CARPET_BLAST_R, BMB_CARPET_TRAIL_W, _mechCarpetRun, BMB_CLUSTER_SHELLS, BMB_CLUSTER_BOMBLETS, BMB_CLUSTER_SCATTER_R, BMB_CLUSTER_FUSE_MS, BMB_CLUSTER_SHELL_GAP_MS, BMB_CLUSTER_BLAST_R, _mechClusterShells, BMB_FINAL_CD_TICK_MS, BMB_FINAL_CD_TICKS, BMB_FINAL_WAVE_MS, BMB_FINAL_SAFE_R_PCT, _bomberOnPhaseEnter, _bmbStartFinalWatcher, _bomberFinalStart, _bomberFinalBang, _bomberFinalEnd } from '../../js/combat/bosses/boss-bomber.js';
import { _CRP_DEBUG_SLOW, _CRP_DEBUG_MULT, CRP_PACK_DMG, CRP_PACK_DMG_CHARGED, CRP_TNT_DMG, CRP_POUNCE_DMG, CRP_FINAL_DMG, CRP_HIT_CD_MS, _crpGridCenter, _crpBoom, _crpSprite, _crpFuseVisual, _crpTeardown, CRP_PACK_COUNT, CRP_PACK_SPEED, CRP_PACK_HEAT_RATE, CRP_PACK_COOL_RATE, CRP_PACK_RANGE, CRP_PACK_BLAST_R, CRP_PACK_DUR_MS, _mechCreeperPack, CRP_POUNCE_FALL_MS, CRP_POUNCE_FUSE_MS, CRP_POUNCE_BLAST_R, _mechCreeperPounce, CRP_TNT_COUNT, CRP_TNT_CLUSTER_R, CRP_TNT_WINDUP_MS, CRP_TNT_CASCADE_MS, CRP_TNT_BLAST_R, _mechTntChain, CRP_FINAL_CD_TICK_MS, CRP_FINAL_CD_TICKS, CRP_FINAL_BLAST_R_PCT, _crpFinal, _crpFinalActive, _crpOnPhaseEnter, _crpStartFinalWatcher, _crpFinalStart, _crpFinalBang, _crpFinalEnd } from '../../js/combat/bosses/boss-creeper.js';
import { _MZ_DEBUG_SLOW, _MZ_DEBUG_MULT, MZ_GANG_DMG, MZ_WALL_DMG, MZ_MAZEWALL_DMG, MZ_EYES_DMG, MZ_SLAM_DMG, MZ_FINAL_DMG, MZ_HIT_CD_MS, _mzHitCd, _mzTouch, _mzGhostEl, _mzSpookBurst, MZ_GANG_DUR_MS, MZ_SCATTER_EVERY, MZ_SCATTER_DUR, _mechMzGhostGang, MZ_WALL_GAP, MZ_WALL_THICK, _mechMzDotWalls, MZ_MAZE_COUNT, MZ_MAZE_LIFE, _mechMzMazeWalls, MZ_DARK_COUNT, MZ_DARK_LIFE, _mechMzLightsOut, MZ_FINAL_TICK_MS, MZ_FINAL_TICKS, MZ_TARGET_R, MZ_CHOMP_R, _mzFinal, _mzFinalActive, _mzOnPhaseEnter, _mzStartFinalWatcher, _mzMarkTarget, _mzSlam, _mzFinalStart, _mzFinalEnd, _mzTeardown } from '../../js/combat/bosses/boss-maze.js';
import { _mechLightCycle } from '../../js/combat/bosses/boss-tron.js';
import { _mechSplitterRocks } from '../../js/combat/bosses/boss-belt.js';
import { _mechDormantSeekers } from '../../js/combat/bosses/boss-hunter.js';
import { _mechEyeBursts, _mechCyclopsGaze } from '../../js/combat/bosses/boss-cyclops.js';
import { _mechBulletWalls } from '../../js/combat/bosses/boss-barricade.js';
import { _mechLockOn } from '../../js/combat/bosses/boss-guardian.js';
import { _mechFlurry } from '../../js/combat/bosses/boss-duelist.js';
import { _mechSegHitsRect, _mechSelfDestruct } from '../../js/combat/bosses/boss-mech.js';
import { _mechVentAmbush } from '../../js/combat/bosses/boss-phantom.js';
import { _mechThreadGrid } from '../../js/combat/bosses/boss-weaver.js';
import { _mechSpeedLanes } from '../../js/combat/bosses/boss-velocity.js';
import { _teleportAvatarTo, _mechPortalWisp } from '../../js/combat/bosses/boss-wormhole.js';
import { _mechUmbralDashes } from '../../js/combat/bosses/boss-eclipse.js';
import { _mechDarkHunt } from '../../js/combat/bosses/boss-nightmare.js';
import { _mechTentacleSweep } from '../../js/combat/bosses/boss-kraken.js';
import { _mechAxePendulum } from '../../js/combat/bosses/boss-executioner.js';
import { _mechRisingTide } from '../../js/combat/bosses/boss-leviathan.js';
import { _mechSpiralStorm, _mechReaperFans } from '../../js/combat/bosses/boss-nemesis.js';
import { _mechSingularity, _mechEventBeams } from '../../js/combat/bosses/boss-oblivion.js';
import { _mechBullBarrage, _mechThwompTrio } from '../../js/combat/bosses/boss-juggernaut.js';
import { _mechQueenStorms, _mechShrapnelDownpour } from '../../js/combat/bosses/boss-stormqueen.js';
import { _mechBroadsides, _mechSearchlight } from '../../js/combat/bosses/boss-dreadnought.js';
import { _mechGuardCall, _mechTripleRings } from '../../js/combat/bosses/boss-warlord.js';
import { _mechJudgmentPillars, _mechRadiantFans } from '../../js/combat/bosses/boss-seraph.js';
import { _chaosDrop, _chaosOrb, _mechChaosRoulette, _mechWarShout } from '../../js/combat/bosses/boss-chaos.js';
import { _mechVoidChoice, _mechVoidTendrils } from '../../js/combat/bosses/boss-voidborn.js';
import { _mechRoyalDecree, _mechCrownRings } from '../../js/combat/bosses/boss-zenith.js';
import { EG_ATLAS_REGION_BOSSES } from '../../js/combat/bosses/boss-rosters.js';
import { SETTINGS, SETTINGS_DEFAULTS, applySettings, initSettingsControls, loadSettingsUI, saveSettings } from '../../js/settings.js';
import { _keybindNormalize, closeKeybindsModal, keybindDisplayLabel, keybindKeyFor, keybindMatches, onKeybindAction, openKeybindsModal, resetKeybinds, tutUpdateKeybinds } from '../../js/keybinds.js';
import { DIFF_CFG, beginRetrySetupRun, cancelRetrySetupModal, curDiff, curMods, isClassless, isMonsterless, isTreeless, openRetrySetupModal, retrySetupDefer, retrySetupIsActive, retrySetupResolve, scoreMultiplier, selDiff, syncDiffModButtons, togMod, updDiffDesc, updModDesc, updateRetryKeepModal } from '../../js/difficulty-modifiers.js';
import { GAUNTLET_HINT, GAUNTLET_HINT_DE, GAUNTLET_MIN_LEVEL_INDEX, GAUNTLET_MIN_SPACING, GAUNTLET_SKIP_WORLDS, applyGauntletBonuses, pickGauntletLevelIndices } from '../../js/levels/gauntlet-levels.js';
import { G, W1, W10, W11, W12, W13, W14, W15, W16, W17, W18, W19, W2, W20, W21, W22, W3, W4, W5, W6, W7, W8, W9, WORLDS, W_ENDGAME } from '../../js/levels/level-world-data.js';
import { ALL, NEXUS_WORLD_INDEX, WORLD_START_GI, getNexusPointGi, isAscensionLevel, isNexusPointLevel, isNexusUnlocked, isNexusWorld, isNexusWorldUnlocked, lvText, setNexusUnlocked } from '../../js/levels/levels.js';
import { BONUS_QUIZ_POOLS } from '../../js/quiz-exercise/quiz-questions.js';
import { _quizCalcEliminationChance, answerQuizInput, closeQuiz, finishQuiz, quizUseTutor, showQuiz, skipQuiz } from '../../js/quiz-exercise/quiz.js';
import { _getWrap, currentZoom, resetZoom, scalePuzzle, setPuzzleMonsterRoom, setPuzzleZoom, zoomInBtn, zoomOutBtn } from '../../js/grid-scaling.js';
import { WORLD_CODES, checkWorldCodes, checkWorldCodesSync, showCodes } from '../../js/codes.js';
import { TITLE_DEFS, checkTitleUnlocks, getActiveTitle, getActiveTitleName, getEarnedTitleTotalLines, getEarnedTitleTotals, getEarnedTitlesForScore, getNextTitle, getTitleEffectSpecs, getTitleForScore, getTitleName, getTitleStatLines, showTitlesModal, titleProgressText, titlesCollectedText, withTitle } from '../../js/titles.js';
import { _getGridSizeTier, _initLuckyTiles, _applySylaForestAffinity, _hideCompletionGlimpseBar, _applyCompletionGlimpse } from '../../js/start-level-passives.js';
import { _doStartLevel, _setMistakeCounterText } from '../../js/start-level.js';
import { confirmReset } from '../../js/save-reset.js';
import { advanceTutStep, finishTutorial, prevTutStep, replayTutorialFromTitle, showTutorial } from '../../js/tutorial.js';
import { _tqIsTutorialActive, startTutorialQuest } from '../../js/tutorial-quest.js';
import { MATH_GATE_POOLS } from '../../js/quiz-exercise/mathgate-questions.js';
import { isGatedLevel, isMathGatePassed, mgCalcHintThreshold, mgCloseToLevelSelect, mgContinueToLevel, mgFormatTutorAnswer, mgNewQuestion, mgUseTutor, submitMathGate, tryStartGatedLevel } from '../../js/quiz-exercise/mathgate.js';
import { CHARACTERS, maybeShowCharacterSelect, renderLSCharacterAvatar, renderMapViewCharacterPortrait } from '../../js/sprite/character-select.js';
import { getGameTooltip, _calcGameTooltipPos, showGameTooltip, moveGameTooltip, hideGameTooltip, _tipAttr, _buildSaveSlotTooltipHTML } from '../../js/tooltips-hud.js';
import { CHANGELOG_DATA, _buildCategoryGroupHtml, _buildVersionBlockHtml, _changelogLangIndex, openChangelog, renderChangelog } from '../../js/changelog.js';
import { ANIM_DIRECTIONS, _animHasDirectionalWalkSync, _animRefreshCacheFor, _animSetDefaultDownImage, _animShouldMirrorFor, _animWalkIsDirectionalFor, _animWarmCacheFor, _getPlayerPuzzleDefaultImage, _lastFacingDir, _playAvatarSkillAnimationForSlot, _playAvatarWalkAnimation, _scheduleAvatarWalkIdle, _startAvatarIdleAnimation, _startAvatarWalkAnimation, _stopAvatarWalkAnimation, _walkState } from '../../js/sprite/sprite_animations.js';
import { AVATAR_MOVE_SPEED_PX_PER_SEC, _avatarBarsHTML, _avatarGetMoveSpeed, _avatarMoveState, _avatarMoveTick, _charIs, _chargeCompanionToCell, _getAvatarCharacterName, _getPlayerCharacterImage, _hidePlayerAvatar, _hidePlayerAvatarSimple, _renderPlayerAvatar, _renderPlayerAvatarSimple, _renderPlayerHealth, _setAvatarPos, _showPlayerAvatar, _showPlayerAvatarSimple, _updateLSAvatarImage, _updateSetupScreenCharacter, getAvatarLastMoveDir } from '../../js/sprite/player_sprite.js';
import { _CHAR_LAB_CHARS, _CHAR_LAB_ICONS, _CHAR_LAB_LABELS, _CHAR_LAB_VARIANTS, _charLabApply, _charLabArtState, _charLabArtTip, _charLabParentOf, _charLabPortraitSrc, _charLabPreview, _charLabRefreshBadges, _charLabRenderGrid, _charLabRenderPreview, _charLabSaveCurrent, _charLabStartWalk, _charLabStopPreview, _charLabWalkDir, closeCharLab, showCharLab } from '../../js/dev/cheat-combo-picker.js';
import { _banterRepositionBubbleIfVisible, hideCharacterBanter, resetBanterState, triggerAilmentBanter, triggerAvoidBanter, triggerBanter, triggerHitTakenBanter, triggerItemBanter, triggerKillBanter, triggerLowTimeBanterIfNeeded, triggerSkillBanter, triggerSpellBanter } from '../../js/sprite/character-banter.js';
import { STOX_COMBAT_LINES } from '../../js/sprite/character-banter-combat-stox.js';
import { TRIX_COMBAT_LINES } from '../../js/sprite/character-banter-combat-trix.js';
import { SYLA_COMBAT_LINES } from '../../js/sprite/character-banter-combat-syla.js';
import { GRIP_DATA_VERSION, ITEM_CATEGORIES, categoryForId, looksTwoHanded, resolveItemMeta, defaultLayers, defaultHands, defaultRot, setDir, setState, mirrorPoint, mirrorSlotCfg, mirrorFrame, wrapDeg, spriteChain, resolveFrames, frameAt, resolvePlacement, placeItem, solveTwoHandRot } from '../../js/sprite/grip-render.js';
import { GEAR_GRIP_DATA } from '../../js/sprite/gear-overlays-data.js';
import { _SPRITE_IMG_IDS, _framesFor, _isMirrored, _parseAnimSrc, _readLoadout, stopGearOverlays } from '../../js/sprite/gear_overlays.js';
import { _isReplayGloballyUnlocked, _replayGlobalKey, _seenKey, _setReplayGloballyUnlocked, getUnlockedReplayEntries, hasSeen, isReplayEntryUnlocked, markSeen, resetAllBeats, resetAllBeatsForSlot, resetBeat, unlockReplayIntroBundle } from '../../js/storyline/storyline-progress.js';
import { DEFAULT_SLIDE_DURATION_MS, SLIDE_FADE_MS, StorylineRenderer, _imgCache, _preloadImage, _wordsFromLine, showBeat } from '../../js/storyline/storyline-engine.js';
import { INTRO_CINEMATIC_IMAGE_PATH, INTRO_CINEMATIC_SLIDES, INTRO_SONG } from '../../js/storyline/storyline-intro.js';
import { STOX_INTRO_IMAGE_PATH, STOX_INTRO_SONG } from '../../js/storyline/storyline-intro-stox.js';
import { TRIX_INTRO_IMAGE_PATH, TRIX_INTRO_SONG } from '../../js/storyline/storyline-intro-trix.js';
import { SYLA_INTRO_IMAGE_PATH, SYLA_INTRO_SONG } from '../../js/storyline/storyline-intro-syla.js';
import { REGION_BEAT_TRIGGER_LEVEL, REPLAY_GALLERY_ENTRIES, STORY_BEATS } from '../../js/storyline/storyline-beats.js';
import { EG_TEST_MAPS, _egtEnsureStyles, _egtPickSeedGi, showEndgameTestHub, _egLaunchTestMap } from '../../js/dev/endgame-testing-screen.js';
import { _ascensionTrialName, _cleanupCampaignTrialSeed, _endCampaignTrial, _ensureTrialState, _grantAscensionTrialReward, _grantConvergenceTrialReward, _isAscensionTrialDone, _isAscensionTrialRun, _isAscensionTrialUnlocked, _isConvergenceTrialRun, _isTrialDone, _isTrialRun, _isTrialUnlocked, _launchAscensionTrial, _launchCampaignTrial, _launchTrialRun, _retitleLeaveMapTransition, _routeTrialReturn, _servePostTrialFlows, _trialBossId, _trialChainParams, _trialCount, _trialIdForWorld, _trialMonsterLevel, _trialName, _trialTriggerLevels, _trialWorldStartGi, _trialWorlds } from '../../js/campaign-trials.js';
import { AssetPreload } from '../../js/asset-preload.js';
import '../../js/boot-loader.js';
import { DevTest, _devTestNormalizeScale, _devTestParam } from '../../js/dev/dev-testing.js';
import { pauseGame, unpauseGame } from '../../main.js';
import '../../js/loot/equipment-slot-icons.js';
import '../../js/loot/equipment-base-types.js';
import { UNIQUE_REWORKS, applyUniqueReworks } from '../../js/loot/unique-item-reworks.js';
import { UNIQUE_DROP_CHANCE, UNIQUE_ITEMS, UNIQUE_ZERO_AUTOMARK_DE, UNIQUE_ZERO_AUTOMARK_EN } from '../../js/loot/unique-item-data.js';
import { applyUniqueRequirementRebalance } from '../../js/loot/unique-item-requirements.js';
import { _applyUniqueZeroLineAutomark, _buildUniqueImplicits, _buildUniqueItem, _buildUniqueMods, _getUniqueSpecialLines, _inferWeaponHands, _tryGenerateUniqueDrop, _uniqueContentSig, _uniqueDownsideValue, _uniqueFallbackBlockChance, _uniqueFallbackDamage, _uniqueFallbackDefenses, _uniqueStatLabel } from '../../js/loot/unique-item-logic.js';
import { _healUniqueItem } from '../../js/loot/unique-item-heal.js';
import { INV_COLS, INV_INITIAL_ROWS, INV_ROWS, _addItemToStash, _ensureInvRows, _expandStashByOneRow, _findFreeInvCell, _getInvCapacity, _getInvRows, _rebuildInventoryGrid } from '../../js/hub/hub-stash.js';
import '../../js/loot/hub-currency-layout.js';
import '../../js/loot/hub-currency-state.js';
import '../../js/loot/hub-currency-ui.js';
import { CURRENCY_COLS, CURRENCY_ROWS, CURRENCY_SLOT_MAP, CURRENCY_SLOT_REVERSE, _buildCraftingBenchSlotHTML, _currencyDefForId, _currencyIdForSlot, _currencySlotForId, _currencyStash } from '../../js/loot/hub-currency.js';
import { EG_MAP_STASH_COLS, EG_MAP_STASH_INITIAL_ROWS, EG_MAP_STASH_ROWS, EG_MAP_TIER_COUNT, EG_MAP_TIER_ROMANS, _egEnsureMapTierRows, _egFindFreeMapCellForTier, _egGetMapStashRowsForTier, _egGetMapTierGrid, _egIsLegacyFlatMapStash, _egIsTieredMapStash, _egMakeAllMapStashes, _egMakeMapTierGrid, _egMapTierToIndex, _egRebuildMapStashGrid } from '../../js/endgame/endgame-map-stash.js';
import { MASS_SELL_RARITIES, _buildItemChipHTML, _chipCounter, _chipRegistry, _defaultMassSellKeep, _handleChipMouseDown, _isProtectedFromMassSell, _loadMassSellSettings, _massSellCounts, _normaliseMassSellKeep, _saveMassSellSettings, _showTooltipFromChip } from '../../js/hub/hub-mass-sell.js';
import { _buildHubInfoTooltipHTML, _buildTopbarHTML, _exportBuildSnapshot, _hideHubInfoTooltip, _showHubInfoTooltip, _showItemLevelToggleTooltip, _showMassSellConfigTooltip, _showMassSellTooltip, _toggleItemLevelDisplay, _updateItemLevelToggleButton, _updatePassiveTreeButton } from '../../js/hub/hub-topbar.js';
import { _healCurrencyItem, _healEssenceItem, _showHandMigrationToast, saveHubState } from '../../js/hub/hub-save.js';
import { _cancelMassSellConfirm, _closeMassSellModal, _confirmMassSell, _ensureMassSellModal, _executeMassSell, _massSellRenderStaticText, _openMassSellModal, _rarityColor, _itemRarityLabel, _renderMassSellModalContent, _requestMassSell, _saveMassSellModal, _updateMassSellPreview } from '../../js/hub/hub-mass-sell-modal.js';
import { _injectMassSellStyles } from '../../js/hub/hub-mass-sell-styles.js';
import { BLOCK_LOCKOUT_BASE_MS, BOSS_SPAWN_DELAY_MS, DAMAGE_NUMBER_DURATION_MS, DEFAULT_MONSTER_CAP, DEFLECT_BASE_DMG_PCT, DEFLECT_BASE_PCT, IMMUNE_FLASH_DURATION_MS, IMMUNE_LABEL_DURATION_MS, INITIAL_SPAWN_STAGGER_BASE_MS, MELEE_ANIM_DURATION_MS, MONSTER_PROJ_DURATION_MS, MONSTER_ZONES, PANEL_RERENDER_DELAY_MS, PARRY_BASE_PCT, PLAYER_DAMAGE_NUMBER_DURATION_MS, PLAYER_HIT_FLASH_MS, RESPAWN_DELAY_MIN_MS, RESPAWN_DELAY_RANGE_MS, _getDefaultMonsterCap, _getRespawnDelayMs } from '../../js/combat/encounter-constants.js';
import { EARLY_VARIANCE_FREE_LEVEL, MONSTER_VARIANCE_DOWN, MONSTER_VARIANCE_UP_MAX, MONSTER_VARIANCE_UP_MIN, _buildBossSpawnList, _buildBossSpawnListFromDef, _buildFixedBossList, _buildFixedNormalList, _buildNormalSpawnList, _buildRandomBossList, _buildRandomNormalList, _buildSpawnList, _categorizeMonsterTier, _getEncounterBaseLevel, _isPuzzleSolved, _pickWeightedMonster, _rollMonsterLevel } from '../../js/combat/encounter-spawn-rules.js';
import { CAMPAIGN_MONSTER_CONFIG, CAMPAIGN_STAMPED_FIELDS, _buildCampaignMonsterList, _campaignRefDamage, _countSolutionCells, _earlyEaseBlend, _prepareCampaignEncounter } from '../../js/combat/encounter-campaign-spawns.js';
import { INITIAL_SPAWN_STAGGER_STEP_MS, _calcSpawnDelay, _respawnRandomMonster, _scheduleMonsterSpawns, _scheduleRespawn, _shouldSuppressRespawn } from '../../js/combat/encounter-spawn-scheduler.js';
import { LIFE_REGEN_INTERVAL_MS, STAGGER_DURATION_MS, _attachBossStylesheet, _cancelSpawnTimers, _resetEncounterState, _startEncounter, _startTickLoop, _stopEncounter, _stopTickLoop } from '../../js/combat/encounter-lifecycle.js';
import { _animateMonsterMelee, _animateMonsterProjectile, _applyMeleeImpact, _fireMonsterAttack, _flashMonsterAttackCard, _resolveAttackType, _rollPreemptiveDodge } from '../../js/combat/encounter-monster-attacks.js';
import { MONSTER_SPELL_CONFIG, _maybeCastMonsterSpell, _monsterSpellChance } from '../../js/combat/monster-spells.js';
import { _gauntletActive, _gauntletFighting, _gauntletSummonRevealCells, _gauntletOnDefeat, _gauntletPlayable, startGauntlet, startParryTutorial } from '../../js/combat/gauntlet.js';
import { _applyPlayerBlockFeedback, _applyPlayerBlockLockoutFeedback, _applyPlayerHitFeedback, _applyPlayerMissFeedback, _blockLockoutOverlayTimer, _hideBlockLockoutOverlay, _showBlockLockoutOverlay } from '../../js/combat/encounter-monster-attack-feedback.js';
import { _animatePlayerProjectile, _consumeOnHitGearBonus, _onMistake, _releaseChannelAtMax, _resolveProjectileImpact, _tickCorrectCellGearProcs, _trackRecentFill } from '../../js/combat/encounter-player-attacks.js';
import { _applyGroundedReduction, _applyPlayerDeflectFeedback, _applyPlayerParryFeedback, _getDeflectChancePct, _getDeflectDamagePct, _getDualWieldParryChancePct, _getParryChancePct, _isDualWieldParryActive, _rollFateNegation, _rollParry, _tryDeflectProjectile } from '../../js/combat/encounter-player-mitigation.js';
import { DRAG_CHARGE_BASE_SIZE_PX, DRAG_CHARGE_MAX_VISUAL_STACKS, DRAG_CHARGE_SCALE_PER_STACK, DRAG_CHARGE_SIZE_PER_STACK_PX, _aimChargingProjectile, _clearChargedProjectileVisual, _clearDragBonusLabel, _getTarget, _releaseChargedShot, _rollPlayerMiss, _tryMultishot, _updateChargedProjectileVisual, _updateDragBonusLabel } from '../../js/combat/encounter-charged-shot.js';
import { MELEE_EXECUTE_HP_PCT, MELEE_EXECUTE_MULT, _animatePlayerMelee, _applyPlayerMeleeImpact, _currentMeleeDamage, _tryCleaveHit } from '../../js/combat/encounter-melee-impact.js';
import { MELEE_OVERCHARGE_MULT, MELEE_OVERCHARGE_RATE_PER_TIER, MELEE_OVERCHARGE_RATIO, _meleeDashVisual, _meleeGrandFlash, _meleeLeapVisual, _meleeNovaVisual, _meleeTierArt, _meleeTierForCharge, _meleeTierLabel, _overchargeRateForTier } from '../../js/combat/encounter-melee-arts.js';
import { MELEE_DELIVERY_ARRIVAL_BEAT_MS, MELEE_DELIVERY_LEAP_MS, MELEE_DELIVERY_OUT_MAX_MS, MELEE_DELIVERY_OUT_MIN_MS, MELEE_DELIVERY_RETURN_MS, _meleeDashOut, _meleeDeliveryAvailable, _meleeGlideHome, _meleeLeapTo, _meleeRaiseAvatar } from '../../js/combat/encounter-melee-delivery.js';
import { MELEE_HOLD_VULNERABILITY_MULT, _cycleTarget, _playerTakeDamage, _selectTarget, _initEgTargetHotkeys } from '../../js/combat/encounter-damage.js';
import '../../js/combat/combat-run-stats.js';
import '../../js/touch/touch-viewport.js';
import '../../js/touch/touch-controls.js';
import '../../js/touch/touch-layout.js';
import '../../js/touch/touch-longpress.js';
import '../../js/touch/touch-grid.js';
import '../../js/touch/touch-clues.js';
import { _gameOver, _killMonster, _onAllMonstersDead, _updateTargetAfterKill } from '../../js/combat/encounter-kills.js';
import { _handleBossKill, _handleNormalMonsterKill } from '../../js/combat/encounter-kill-rewards.js';
import { _assignRandomSpawnZone, _buildMonsterOrBoss, _notifyMonsterArrival, _spawnMonster } from '../../js/combat/encounter-monster-spawning.js';
import { SLOT_ACCEPTS, _dndPickUp, hubDropOnCraftingBench, _dndFindTargetSlot, _dndBuildCurrencyChipHTML, _renderCurrencyCell, addCurrency, _dndChipScreenEl, hubDragOver, initHubDnD, _bindDragEvents } from '../../js/hub/hub-drag-and-drop.js';
import { _buildTooltipBodyHTML, _clearTooltip, _moveTooltip, _lastMouse, _updateCompareTooltip, _hideCompareTooltip } from '../../js/hub/hub-tooltips.js';
import { _ensureUniqueStash, _addUniqueToCollection, _getUniqueCount, _isUniqueCollected, _updateUniqueTabBadge, _moveUniqueToInventory } from '../../js/hub/hub-uniques.js';
import { EQUIP_SLOTS, _buildEquipSlotHTML, _buildEquipColHTML, _buildCharPanelHTML, _buildCurrencyCellHTML, _buildCurrencyGridHTML, _buildCurrencyPanelHTML, _buildCurrencyStripHTML, _onCurrencyCellEnter, _onCurrencyCellMove, _onCurrencyCellLeave, _buildInventoryCellHTML, _buildInventoryGridHTML, _buildStashPanelHTML, _stashInfoTimer, _ensureStashInfoEl, _showStashInfo, _clearStashInfo, _buildFullScreenHTML, _renderEquipSlot, _renderEquipSlots, RARITY_CELL_FILL, REQ_BLOCKED_FILL, _getCellFill, _renderInventoryCell, _renderInventory, _updateInvCount, _renderCurrencyStash, _updateCraftingBenchLauncherSlot, _renderAll, _createScreen, ensureHubScreen, showHub, safeGoBackFromHub, _hubGameOverlay, _hubOverlayPaused, isHubGameOverlay, _applyOverlayChrome, _hubOverlayPause, _hubOverlayResume, _hubHideAvatars, _hubShowAvatars, openHubFromGame, _syncOverlayGearPools, closeHubToGame, addTestItems } from '../../js/hub/hub.js';
import { _switchStashTab, _buildUniqueGridHTML, _renderUniqueStash, _onUniqueCellClick, _onUniqueCellRightClick, _onUniqueCellEnter, _onUniqueCellMove, _onUniqueCellLeave } from '../../js/hub/hub-unique-ui.js';
import { _renderStatsList, _buildStatDescTooltipHTML, _bindStatTooltips } from '../../js/hub/hub-stats-panel.js';
import { LEVELING_CONFIG, _getTreeTimerStartSecs, _getTreeChannel, _lifeGain, _getPlayerLevel, _getPlayerXP, _getUnspentPoints, _getXpForNextLevel, _syncBaseAttributes, _calcXpMultiplier, _awardXP, _grantMonsterXP, _showXpGainText, _campaignExpectedLevel, _campaignMonsterLevel, _grantCampaignLevelXP, _allocateAttribute, _refundAttribute, _loadLevelingState, _renderLevelHUD, _showLevelBtnTooltip } from '../../js/hub/hub-leveling.js';
import { _egActiveMapItem, EG_TIER1_MAX_MONSTERS, EG_LOW_TIER_MONSTER_STEPS, EG_MAP_BASE_BOSS_CHANCE, EG_TIER1_MAX_TOTAL_MONSTERS, EG_TIER2_MAX_TOTAL_MONSTERS, _egGetActiveMapModValue, _egHasActiveMapMod, _egMapHasBloodMagic, _egMapPlayerLifeMult, _egMapPlayerDamageMult, _egMapPlayerDefenceMult, _egMapManaGainMult, _egMapPlayerMeleeMult, _egMapPlayerProjectileMult, _egMapItemRevealMult, _egMapAbilityRevealMult, _egMapSpellDamageMult, _egMapTimeGainMult, _egMapResistMult, _egMapDamageTakenAmpMult, _egMapKillRecoveryMult, _egMapEvasionMult, _egMapAbsorptionMult, _egMapBlockMult, _egMapActionSlowMult, _egRollMonsterCritMult, _egOnQuizWrongAnswer, _egMapAccuracyMult, _egMapAttackSpeedMult, _egApplyMonsterHitMods, _egApplyMapModsToMonster, _egMapQuestionsPerInterstitial, _egActiveMapRewardBonuses, _egMapXpMult, _egMapLootQuantityMult, _egMapLootRarityWeightMult, _egBuildSizeQueue, _egRollMapRunBaseline, _egApplyModsToBaseline, _egPickMapRunSeedGi, _egCleanupMapRunSeedLevel, _egLaunchMapFromDevice } from '../../js/endgame/endgame-map-launch.js';
import '../../js/loot/loot-filter-state.js';
import '../../js/loot/loot-filter-rules.js';
import '../../js/loot/loot-filter-styles.js';
import '../../js/loot/loot-filter-editor.js';
import { _lootFilter, _lootFilterDefaultState, _lootFilterNormaliseRule, _lootFilterNormaliseState, _loadLootFilter, _saveLootFilter, _lootFilterRuleMatches, _lootFilterShouldVendor, _lootFilterKeeps, _lootFilterAutoVendor, _lootFilterSlotTypes, _lootFilterBasesForSlot, _lootFilterModFamiliesForSlot, _lootFilterAllModFamilies, _lootFilterWorking, _lootFilterEscapeHTML, _injectLootFilterStyles, _ensureLootFilterModal, _lootFilterRuleHTML, _lootFilterRenderRules, _lootFilterUpdatePreview, _lootFilterRenderModalContent, _lootFilterSyncChrome, _lootFilterRenderStaticText, _openLootFilterModal, _lootFilterCloseModal, _lootFilterSaveModal, _lootFilterSetRule, _lootFilterAddRule, _lootFilterDelRule, _showLootFilterTooltip } from '../../js/loot/loot-filter.js';
import '../../js/loot/loot-implicits.js';
import '../../js/loot/loot-implicit-families.js';
import '../../js/loot/loot-implicit-scaling.js';
import { EG_MAX_MAP_TIER, egMapBasePuzzlesForTier, egMapBaseQuestionsForTier, egMapBaseDurationForTier, egMapBaseMistakesForTier, EG_MAP_TIER_MONSTER_LEVELS, EG_ENDGAME_MONSTER_LEVEL_CAP, _egRollMapTier } from '../../js/loot/loot-map-config.js';
import { EG_MAP_MOD_PREFIXES } from '../../js/loot/loot-map-mod-prefixes.js';
import { EG_MAP_MOD_SUFFIXES } from '../../js/loot/loot-map-mod-suffixes.js';
import { EG_MAP_MOD_TABLES, _egMapModAffects } from '../../js/loot/loot-map-mod-tables.js';
import { EG_MAP_MOD_REWARDS, _egGetMapModRewards, _egGetMapGoldRewardRange } from '../../js/loot/loot-map-mod-rewards.js';
import { _egGetCompletionRewardDef, _egGetMapCompletionRewardPool } from '../../js/loot/loot-map-completion-reward.js';
import { _egRollMapSizeMix, _egRollMapBossStatus, _egResolveMapBoss } from '../../js/loot/loot-map-implicit-parts.js';
import { _egWithImplicits, _egRollMapImplicits } from '../../js/loot/loot-map-implicits.js';
import { _egGenerateMapDrop, _egRerollMapMods, _egAddOneModToMap, _egRemoveOneModFromMap } from '../../js/loot/loot-maps.js';
import { EG_MAP_CURRENCY_RULES } from '../../js/loot/loot-map-orbs.js';
import { _egRollAtlasAdjacentBonusDrop, _egTryDropMap } from '../../js/loot/loot-map-drops.js';
import { _egBuildMapTooltipBodyHTML } from '../../js/loot/loot-map-tooltip.js';
import { _egHealMapBossImplicits, _egMigrateMapBossImplicits } from '../../js/loot/loot-map-legacy-heal.js';
import { LOCAL_DEFENSE_FAMILY_STATS, _familyAllowedOnBase, _eligibleTiers, _pickTier, _rollInt, _isHybrid, _buildRolledStats, _buildModPool, _pickModFromPool, _rollMods } from '../../js/loot/loot-mod-application.js';
import { RARE_NAME_WORDS_FIRST, RARE_NAME_WORDS_SECOND, _pickRareItemName } from '../../js/loot/loot-mod-rare-names.js';
import { _modNameEntry, _modFallbackWord, _modAdjective, _modOfPhrase, _modDeGenitive, _buildItemName } from '../../js/loot/loot-mod-naming.js';
import { MOD_NAME_WORDS } from '../../js/loot/loot-mod-name-words.js';
import { MOD_TABLE_AMULET } from '../../js/loot/loot-mod-tables-amulet.js';
import { MOD_TABLE_ARCANE } from '../../js/loot/loot-mod-tables-arcane.js';
import { MOD_TABLE_BELT } from '../../js/loot/loot-mod-tables-belt.js';
import { MOD_TABLE_BOOTS } from '../../js/loot/loot-mod-tables-boots.js';
import { MOD_TABLE_BRACERS } from '../../js/loot/loot-mod-tables-bracers.js';
import { MOD_TABLE_CHEST } from '../../js/loot/loot-mod-tables-chest.js';
import { MOD_TABLE_CLOAK } from '../../js/loot/loot-mod-tables-cloak.js';
import { MOD_TABLE_EARRING } from '../../js/loot/loot-mod-tables-earring.js';
import { MOD_TABLE_GLOVES } from '../../js/loot/loot-mod-tables-gloves.js';
import { MOD_TABLE_HEAD } from '../../js/loot/loot-mod-tables-head.js';
import { MOD_TABLE_PANTS } from '../../js/loot/loot-mod-tables-pants.js';
import { MOD_TABLE_RING } from '../../js/loot/loot-mod-tables-ring.js';
import { MOD_TABLE_SHIELD, MOD_TABLE_RANGED } from '../../js/loot/loot-mod-tables-shield.js';
import { MOD_TABLE_SHOULDERS } from '../../js/loot/loot-mod-tables-shoulders.js';
import { MOD_TABLE_TALISMAN } from '../../js/loot/loot-mod-tables-talisman.js';
import { MOD_TABLE_WEAPON_2H } from '../../js/loot/loot-mod-tables-weapon-2h.js';
import { MOD_TABLE_WEAPON1, MOD_TABLE_WEAPON_1H } from '../../js/loot/loot-mod-tables-weapon1.js';
import { MOD_TABLE_WEAPON2 } from '../../js/loot/loot-mod-tables-weapon2.js';
import '../../js/loot/loot-mod-tables-rebalance.js';
import { GEN_SYMBOLS, GEN_SIZES, GEN_BUCKETS, GEN_FONT_STACK, GEN_RANDOM_REVEALS } from '../../js/combat/combat-puzzle-generator-data.js';
import { CHARGED_RICOCHET_DURATION_MS, CHARGED_RICOCHET_SCALE, ECHO_DELAY_MS, _applyHitToMonster, _damageTarget, _damageTargetById, _getDominantElement, _showStatusLabel, _tryChargedOverkillRicochet, _tryEchoHit, _tryOverkillSpread } from '../../js/combat/encounter-monster-damage.js';
import '../../js/combat/boss-rig-anim.js';

//--- PHASE3 pass-through getters: module exports referenced as
//--- globalThis.X / window.X members by concatenated code. Getter
//--- form stays live with owner-module reassignments (patch()).
try { Object.defineProperty(globalThis, "ALL", { get() { return ALL; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "ASCENDENCY_DEFS", { get() { return ASCENDENCY_DEFS; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "AVATAR_MOVE_SPEED_PX_PER_SEC", { get() { return AVATAR_MOVE_SPEED_PX_PER_SEC; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "Audio_Manager", { get() { return Audio_Manager; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "BONUS_QUIZ_POOLS", { get() { return BONUS_QUIZ_POOLS; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "BOSS_DEFS", { get() { return BOSS_DEFS; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "BOSS_LEVEL_DAMAGE_SCALE", { get() { return BOSS_LEVEL_DAMAGE_SCALE; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "BOSS_LEVEL_HP_SCALE", { get() { return BOSS_LEVEL_HP_SCALE; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "BOSS_MECHANICS", { get() { return BOSS_MECHANICS; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "BOSS_SOFT_ENRAGE_DELAY_MS", { get() { return BOSS_SOFT_ENRAGE_DELAY_MS; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "BOSS_SOFT_ENRAGE_DMG_STEP", { get() { return BOSS_SOFT_ENRAGE_DMG_STEP; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "CHARACTERS", { get() { return CHARACTERS; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "CLASS_DEFS", { get() { return CLASS_DEFS; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "CLASS_PROJECTILES", { get() { return CLASS_PROJECTILES; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "CURRENCY_COLS", { get() { return CURRENCY_COLS; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "CURRENCY_ROWS", { get() { return CURRENCY_ROWS; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "DIFF_CFG", { get() { return DIFF_CFG; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "DevTest", { get() { return DevTest; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "EG_ATLAS_NODES", { get() { return EG_ATLAS_NODES; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "EG_ATLAS_REGION_BOSSES", { get() { return EG_ATLAS_REGION_BOSSES; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "EG_MAP_STASH_COLS", { get() { return EG_MAP_STASH_COLS; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "EG_MAP_STASH_INITIAL_ROWS", { get() { return EG_MAP_STASH_INITIAL_ROWS; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "EG_MAP_STASH_ROWS", { get() { return EG_MAP_STASH_ROWS; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "EG_MAP_TIER_COUNT", { get() { return EG_MAP_TIER_COUNT; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "ESSENCE_COLS", { get() { return ESSENCE_COLS; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "ESSENCE_ROWS", { get() { return ESSENCE_ROWS; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "G", { get() { return G; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "GAME_ART", { get() { return GAME_ART; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "HIT_BURST_SPARK_COUNT", { get() { return HIT_BURST_SPARK_COUNT; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "HIT_ELEMENT_COLORS", { get() { return HIT_ELEMENT_COLORS; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "INV_COLS", { get() { return INV_COLS; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "INV_ROWS", { get() { return INV_ROWS; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "ITEM_DEFS", { get() { return ITEM_DEFS; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "MATH_GATE_POOLS", { get() { return MATH_GATE_POOLS; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "NEXUS_WORLD_INDEX", { get() { return NEXUS_WORLD_INDEX; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "PICKUP_DEFS", { get() { return PICKUP_DEFS; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "PICKUP_LIFETIME_MS", { get() { return PICKUP_LIFETIME_MS; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "PLAYER_STATS", { get() { return PLAYER_STATS; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "PassiveTracker", { get() { return PassiveTracker; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "RECENT_FILLS_CAPACITY", { get() { return RECENT_FILLS_CAPACITY; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "REPLAY_GALLERY_ENTRIES", { get() { return REPLAY_GALLERY_ENTRIES; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "REVEAL_PROJECTILE_STAGGER_MS", { get() { return REVEAL_PROJECTILE_STAGGER_MS; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "SETTINGS", { get() { return SETTINGS; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "UNIVERSAL_SPELL_DEFS", { get() { return UNIVERSAL_SPELL_DEFS; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "WORLDS", { get() { return WORLDS; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "WORLD_START_GI", { get() { return WORLD_START_GI; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_advanceResistPenaltyStage", { get() { return _advanceResistPenaltyStage; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_animHasDirectionalWalkSync", { get() { return _animHasDirectionalWalkSync; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_animSetDefaultDownImage", { get() { return _animSetDefaultDownImage; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_animWalkIsDirectionalFor", { get() { return _animWalkIsDirectionalFor; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_animWarmCacheFor", { get() { return _animWarmCacheFor; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_animatePickupDiscard", { get() { return _animatePickupDiscard; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_applyCellEffect", { get() { return _applyCellEffect; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_applyMonsterAilment", { get() { return _applyMonsterAilment; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_applySpellDebuff", { get() { return _applySpellDebuff; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_applySylaForestAffinity", { get() { return _applySylaForestAffinity; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_arcaneFreeze_applyPersistentFrost", { get() { return _arcaneFreeze_applyPersistentFrost; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_arcaneFreeze_clearAllFrostAndStalagmites", { get() { return _arcaneFreeze_clearAllFrostAndStalagmites; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_arcaneFreeze_clearStalagmiteIfWrongMarkGone", { get() { return _arcaneFreeze_clearStalagmiteIfWrongMarkGone; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_arcaneFreeze_spawnStalagmite", { get() { return _arcaneFreeze_spawnStalagmite; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_ascensionTrialName", { get() { return _ascensionTrialName; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_autoClaimDropsOnReveal", { get() { return _autoClaimDropsOnReveal; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_avatarGetMoveSpeed", { get() { return _avatarGetMoveSpeed; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_avatarMoveState", { get() { return _avatarMoveState; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_bayesTrapPlacementClick", { get() { return _bayesTrapPlacementClick; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_bayesTrapProtectionIntercept", { get() { return _bayesTrapProtectionIntercept; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_bayesTrapsCancel", { get() { return _bayesTrapsCancel; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_bayesTrapsSelectType", { get() { return _bayesTrapsSelectType; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_bossCheckPhase", { get() { return _bossCheckPhase; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_bossCleanup", { get() { return _bossCleanup; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_bossCleanupAll", { get() { return _bossCleanupAll; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_bossFeedChargeMult", { get() { return _bossFeedChargeMult; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_bossInit", { get() { return _bossInit; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_bossTestRenderGrid", { get() { return _bossTestRenderGrid; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_bossTestShowTooltip", { get() { return _bossTestShowTooltip; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_bossTestToggleGodMode", { get() { return _bossTestToggleGodMode; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_bossTestToggleTestHP", { get() { return _bossTestToggleTestHP; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_bossTick", { get() { return _bossTick; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_bossTierNorm", { get() { return _bossTierNorm; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_buildBoss", { get() { return _buildBoss; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_buildPickupEligiblePool", { get() { return _buildPickupEligiblePool; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_buildSaveSlotTooltipHTML", { get() { return _buildSaveSlotTooltipHTML; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_bumperSlam", { get() { return _bumperSlam; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_calcGameTooltipPos", { get() { return _calcGameTooltipPos; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_calcPlayerDamage", { get() { return _calcPlayerDamage; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_cancelMassSellConfirm", { get() { return _cancelMassSellConfirm; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_cancelTrackedExpiry", { get() { return _cancelTrackedExpiry; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_cellHasAnyDrop", { get() { return _cellHasAnyDrop; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_centStampede", { get() { return _centStampede; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_charIs", { get() { return _charIs; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_charLabApply", { get() { return _charLabApply; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_chargeCompanionToCell", { get() { return _chargeCompanionToCell; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_charmCheckClaim", { get() { return _charmCheckClaim; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_charmDiscardDrop", { get() { return _charmDiscardDrop; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_charmDrops", { get() { return _charmDrops; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_charmReplaceCarriedDrops", { get() { return _charmReplaceCarriedDrops; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_checkAllClaims", { get() { return _checkAllClaims; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_checkCurrencyDropClaim", { get() { return _checkCurrencyDropClaim; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_checkGoldDropClaim", { get() { return _checkGoldDropClaim; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_checkItemDropClaim", { get() { return _checkItemDropClaim; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_checkMistakeLimit", { get() { return _checkMistakeLimit; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_cleansePlayerAilments", { get() { return _cleansePlayerAilments; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_cleanupCampaignTrialSeed", { get() { return _cleanupCampaignTrialSeed; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_clearAllPuzzleEffects", { get() { return _clearAllPuzzleEffects; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_clearBlackoutCountdown", { get() { return _clearBlackoutCountdown; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_clearTooltip", { get() { return _clearTooltip; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_closeCraftingBench", { get() { return _closeCraftingBench; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_closeMassSellModal", { get() { return _closeMassSellModal; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_coilCobraStrike", { get() { return _coilCobraStrike; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_computePlayerStats", { get() { return _computePlayerStats; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_confirmMassSell", { get() { return _confirmMassSell; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_corruptSpreadCap", { get() { return _corruptSpreadCap; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_craftingBenchApply", { get() { return _craftingBenchApply; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_craftingBenchSelect", { get() { return _craftingBenchSelect; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_crashTeardown", { get() { return _crashTeardown; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_currencyDrops", { get() { return _currencyDrops; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_damageTargetById", { get() { return _damageTargetById; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_dancerPirouette", { get() { return _dancerPirouette; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_dataStrikeCancel", { get() { return _dataStrikeCancel; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_dataStrikeResolve", { get() { return _dataStrikeResolve; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_defaultSkillHotbar", { get() { return _defaultSkillHotbar; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_degreesOfFreedomTick", { get() { return _degreesOfFreedomTick; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_discardCurrencyDrop", { get() { return _discardCurrencyDrop; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_discardGoldDrop", { get() { return _discardGoldDrop; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_discardItemDrop", { get() { return _discardItemDrop; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_discardLootDrop", { get() { return _discardLootDrop; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_discardPickup", { get() { return _discardPickup; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_dispelCorruption", { get() { return _dispelCorruption; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_doStartLevel", { get() { return _doStartLevel; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_dofChoose", { get() { return _dofChoose; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_dofNudge", { get() { return _dofNudge; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_egActiveMapItem", { get() { return _egActiveMapItem; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_egAtlasBuildNodeTooltipHTML", { get() { return _egAtlasBuildNodeTooltipHTML; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_egAtlasBuildTierTooltipHTML", { get() { return _egAtlasBuildTierTooltipHTML; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_egAtlasSearch", { get() { return _egAtlasSearch; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_egAtlasSelectNode", { get() { return _egAtlasSelectNode; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_egAtlasZoomFit", { get() { return _egAtlasZoomFit; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_egAtlasZoomStep", { get() { return _egAtlasZoomStep; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_egGetActiveMapModValue", { get() { return _egGetActiveMapModValue; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_egLaunchTestMap", { get() { return _egLaunchTestMap; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_egMakeAllMapStashes", { get() { return _egMakeAllMapStashes; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_egMapHasBloodMagic", { get() { return _egMapHasBloodMagic; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_egMapManaGainMult", { get() { return _egMapManaGainMult; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_egMapPlayerDamageMult", { get() { return _egMapPlayerDamageMult; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_egMapResistMult", { get() { return _egMapResistMult; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_egMapTimeGainMult", { get() { return _egMapTimeGainMult; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_egOnDropRulesEnter", { get() { return _egOnDropRulesEnter; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_egOnDropRulesLeave", { get() { return _egOnDropRulesLeave; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_egOnDropRulesMove", { get() { return _egOnDropRulesMove; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_egOnGateCurrencyCellEnter", { get() { return _egOnGateCurrencyCellEnter; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_egOnGateCurrencyCellLeave", { get() { return _egOnGateCurrencyCellLeave; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_egOnGateCurrencyCellMove", { get() { return _egOnGateCurrencyCellMove; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_egSwitchMapStashTier", { get() { return _egSwitchMapStashTier; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_egtPickSeedGi", { get() { return _egtPickSeedGi; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_endBlackSwan", { get() { return _endBlackSwan; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_endCampaignTrial", { get() { return _endCampaignTrial; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_endMapDefeated", { get() { return _endMapDefeated; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_enterBossArena", { get() { return _enterBossArena; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_entropyDrainTick", { get() { return _entropyDrainTick; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_entropyDrainUpdateProgress", { get() { return _entropyDrainUpdateProgress; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_ergodicFieldInit", { get() { return _ergodicFieldInit; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_ergodicFieldTick", { get() { return _ergodicFieldTick; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_executeFieldScan", { get() { return _executeFieldScan; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_exportBuildSnapshot", { get() { return _exportBuildSnapshot; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_fireProjectile", { get() { return _fireProjectile; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_fireflyTeardown", { get() { return _fireflyTeardown; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_fireflyTrialActive", { get() { return _fireflyTrialActive; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_flushRunLootToStash", { get() { return _flushRunLootToStash; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_freezeAllMonsters", { get() { return _freezeAllMonsters; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_fxGetPuzzleRectForWrap", { get() { return _fxGetPuzzleRectForWrap; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_fxOverlay", { get() { return _fxOverlay; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_fxSpawnParticles", { get() { return _fxSpawnParticles; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_galeCycloneLance", { get() { return _galeCycloneLance; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_gamblerRoulette", { get() { return _gamblerRoulette; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_gamblersRuinOnMistake", { get() { return _gamblersRuinOnMistake; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_gauntletFighting", { get() { return _gauntletFighting; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_gauntletSummonRevealCells", { get() { return _gauntletSummonRevealCells; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_getBayesianBonus", { get() { return _getBayesianBonus; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_getBossLateHpMult", { get() { return _getBossLateHpMult; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_getElementCentre", { get() { return _getElementCentre; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_getEncounterBaseLevel", { get() { return _getEncounterBaseLevel; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_getPlayerCharacterImage", { get() { return _getPlayerCharacterImage; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_getPlayerLevel", { get() { return _getPlayerLevel; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_getPlayerPuzzleDefaultImage", { get() { return _getPlayerPuzzleDefaultImage; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_getResistPenaltyPct", { get() { return _getResistPenaltyPct; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_getRevealProjectileDamagePct", { get() { return _getRevealProjectileDamagePct; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_getTarget", { get() { return _getTarget; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_getTreeChannel", { get() { return _getTreeChannel; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_getUnmetRequirementsText", { get() { return _getUnmetRequirementsText; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_getWrap", { get() { return _getWrap; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_gourmetDevour", { get() { return _gourmetDevour; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_handleChipMouseDown", { get() { return _handleChipMouseDown; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_hideHubInfoTooltip", { get() { return _hideHubInfoTooltip; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_hidePlayerAvatar", { get() { return _hidePlayerAvatar; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_hidePlayerAvatarSimple", { get() { return _hidePlayerAvatarSimple; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_hideQuestRewardTooltip", { get() { return _hideQuestRewardTooltip; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_incDirect", { get() { return _incDirect; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_isActive", { get() { return _isActive; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_isAscensionTrialDone", { get() { return _isAscensionTrialDone; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_isAscensionTrialUnlocked", { get() { return _isAscensionTrialUnlocked; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_isCampaignRun", { get() { return _isCampaignRun; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_isCellCorrupted", { get() { return _isCellCorrupted; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_isCellFrozen", { get() { return _isCellFrozen; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_isCellPickupEligible", { get() { return _isCellPickupEligible; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_isConvergenceTrialRun", { get() { return _isConvergenceTrialRun; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_isLavaCell", { get() { return _isLavaCell; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_isMapRun", { get() { return _isMapRun; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_isTrialDone", { get() { return _isTrialDone; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_isTrialRun", { get() { return _isTrialRun; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_isTrialUnlocked", { get() { return _isTrialUnlocked; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_itemDrops", { get() { return _itemDrops; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_keybindNormalize", { get() { return _keybindNormalize; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_lapFailPunish", { get() { return _lapFailPunish; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_lapGhostForm", { get() { return _lapGhostForm; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_lastFacingDir", { get() { return _lastFacingDir; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_launchAscensionTrial", { get() { return _launchAscensionTrial; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_launchBossTest", { get() { return _launchBossTest; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_launchCampaignTrial", { get() { return _launchCampaignTrial; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_ledger_openCategory", { get() { return _ledger_openCategory; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_ledger_switchGroup", { get() { return _ledger_switchGroup; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_lifeGain", { get() { return _lifeGain; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_loadLevelingState", { get() { return _loadLevelingState; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_lodestoneLeash", { get() { return _lodestoneLeash; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_lootDrops", { get() { return _lootDrops; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_lootFilterAddRule", { get() { return _lootFilterAddRule; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_lootFilterCloseModal", { get() { return _lootFilterCloseModal; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_lootFilterDelRule", { get() { return _lootFilterDelRule; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_lootFilterSaveModal", { get() { return _lootFilterSaveModal; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_lootFilterSetRule", { get() { return _lootFilterSetRule; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_markovSnapshotTick", { get() { return _markovSnapshotTick; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_marksGauntletActive", { get() { return _marksGauntletActive; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_marksGauntletChargePaused", { get() { return _marksGauntletChargePaused; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_marksGauntletGridLockToast", { get() { return _marksGauntletGridLockToast; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_meleeFindVictim", { get() { return _meleeFindVictim; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_moveTooltip", { get() { return _moveTooltip; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_notifyCorrectFill", { get() { return _notifyCorrectFill; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_onCorrectCellPuzzleFX", { get() { return _onCorrectCellPuzzleFX; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_onCurrencyCellEnter", { get() { return _onCurrencyCellEnter; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_onCurrencyCellLeave", { get() { return _onCurrencyCellLeave; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_onCurrencyCellMove", { get() { return _onCurrencyCellMove; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_onEssenceCellEnter", { get() { return _onEssenceCellEnter; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_onEssenceCellLeave", { get() { return _onEssenceCellLeave; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_onEssenceCellMove", { get() { return _onEssenceCellMove; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_onLinesCompleted", { get() { return _onLinesCompleted; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_onLuckyTileClaimed", { get() { return _onLuckyTileClaimed; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_onMistake", { get() { return _onMistake; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_onMistakeBayesianUpdate", { get() { return _onMistakeBayesianUpdate; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_onPause", { get() { return _onPause; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_onProgrammaticReveal", { get() { return _onProgrammaticReveal; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_onResume", { get() { return _onResume; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_onUniqueCellClick", { get() { return _onUniqueCellClick; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_onUniqueCellEnter", { get() { return _onUniqueCellEnter; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_onUniqueCellLeave", { get() { return _onUniqueCellLeave; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_onUniqueCellMove", { get() { return _onUniqueCellMove; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_onUniqueCellRightClick", { get() { return _onUniqueCellRightClick; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_openCraftingBench", { get() { return _openCraftingBench; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_openLootFilterModal", { get() { return _openLootFilterModal; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_openMassSellModal", { get() { return _openMassSellModal; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_overfittingPenaltyMultiplier", { get() { return _overfittingPenaltyMultiplier; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_pickups", { get() { return _pickups; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_playAvatarSkillAnimationForSlot", { get() { return _playAvatarSkillAnimationForSlot; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_playAvatarWalkAnimation", { get() { return _playAvatarWalkAnimation; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_poissonProcessTick", { get() { return _poissonProcessTick; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_puzzleIceRedirect", { get() { return _puzzleIceRedirect; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_questChipHover", { get() { return _questChipHover; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_quizCalcEliminationChance", { get() { return _quizCalcEliminationChance; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_quizDamageBuffMult", { get() { return _quizDamageBuffMult; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_randomWalkInit", { get() { return _randomWalkInit; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_randomWalkTick", { get() { return _randomWalkTick; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_releaseChargedShot", { get() { return _releaseChargedShot; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_removeBlackout", { get() { return _removeBlackout; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_removeConductor", { get() { return _removeConductor; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_removePickupOverlay", { get() { return _removePickupOverlay; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_renderCurrencyCell", { get() { return _renderCurrencyCell; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_renderPickupOverlay", { get() { return _renderPickupOverlay; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_renderPlayerAvatar", { get() { return _renderPlayerAvatar; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_renderPlayerHealth", { get() { return _renderPlayerHealth; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_replaceCarriedCurrencyDrops", { get() { return _replaceCarriedCurrencyDrops; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_replaceCarriedGoldDrops", { get() { return _replaceCarriedGoldDrops; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_replaceCarriedItemDrops", { get() { return _replaceCarriedItemDrops; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_replaceCarriedLootDrops", { get() { return _replaceCarriedLootDrops; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_requestMassSell", { get() { return _requestMassSell; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_resetBayesianBonus", { get() { return _resetBayesianBonus; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_resetQuizDamageBuff", { get() { return _resetQuizDamageBuff; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_rollCrit", { get() { return _rollCrit; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_routeTrialReturn", { get() { return _routeTrialReturn; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_saveMassSellModal", { get() { return _saveMassSellModal; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_schedulePickupExpiry", { get() { return _schedulePickupExpiry; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_scheduleTrackedExpiry", { get() { return _scheduleTrackedExpiry; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_selectTarget", { get() { return _selectTarget; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_servePostTrialFlows", { get() { return _servePostTrialFlows; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_setAvatarPos", { get() { return _setAvatarPos; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_setEssenceFilter", { get() { return _setEssenceFilter; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_setMistakeCounterText", { get() { return _setMistakeCounterText; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_showHubInfoTooltip", { get() { return _showHubInfoTooltip; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_showHubTooltip", { get() { return _showHubTooltip; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_showItemLevelToggleTooltip", { get() { return _showItemLevelToggleTooltip; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_showLevelBtnTooltip", { get() { return _showLevelBtnTooltip; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_showLootFilterTooltip", { get() { return _showLootFilterTooltip; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_showMassSellConfigTooltip", { get() { return _showMassSellConfigTooltip; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_showMassSellTooltip", { get() { return _showMassSellTooltip; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_showPlayerAvatar", { get() { return _showPlayerAvatar; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_showPlayerAvatarSimple", { get() { return _showPlayerAvatarSimple; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_showStatusLabel", { get() { return _showStatusLabel; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_showTooltipFromChip", { get() { return _showTooltipFromChip; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_sigThresholdIntercept", { get() { return _sigThresholdIntercept; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_signalToNoiseCheckRestore", { get() { return _signalToNoiseCheckRestore; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_snailDropBroom", { get() { return _snailDropBroom; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_snailIsCellSlimed", { get() { return _snailIsCellSlimed; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_snailOnPuzzleTransition", { get() { return _snailOnPuzzleTransition; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_snailTeardown", { get() { return _snailTeardown; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_sparsePriorOnLineComplete", { get() { return _sparsePriorOnLineComplete; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_sproutCellIntercept", { get() { return _sproutCellIntercept; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_sproutVineLunge", { get() { return _sproutVineLunge; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_sraDmgMult", { get() { return _sraDmgMult; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_sraManaMult", { get() { return _sraManaMult; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_sraOnPick", { get() { return _sraOnPick; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_sraPlayVisual", { get() { return _sraPlayVisual; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_sraStep", { get() { return _sraStep; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_stackGarbage", { get() { return _stackGarbage; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_startAvatarIdleAnimation", { get() { return _startAvatarIdleAnimation; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_startAvatarWalkAnimation", { get() { return _startAvatarWalkAnimation; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_stopAvatarWalkAnimation", { get() { return _stopAvatarWalkAnimation; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_stopEncounter", { get() { return _stopEncounter; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_strkFreeKick", { get() { return _strkFreeKick; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_switchStashTab", { get() { return _switchStashTab; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_syncBaseAttributes", { get() { return _syncBaseAttributes; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_syncOverlayGearPools", { get() { return _syncOverlayGearPools; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_tacticianCheckmate", { get() { return _tacticianCheckmate; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_tailRiskCancel", { get() { return _tailRiskCancel; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_tailRiskResolve", { get() { return _tailRiskResolve; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_thwompGrandSlam", { get() { return _thwompGrandSlam; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_tipAttr", { get() { return _tipAttr; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_toggleItemLevelDisplay", { get() { return _toggleItemLevelDisplay; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_tqIsTutorialActive", { get() { return _tqIsTutorialActive; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_trialBossId", { get() { return _trialBossId; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_trialCount", { get() { return _trialCount; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_trialIdForWorld", { get() { return _trialIdForWorld; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_trialMonsterLevel", { get() { return _trialMonsterLevel; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_trialName", { get() { return _trialName; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_trialTriggerLevels", { get() { return _trialTriggerLevels; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_trialWorlds", { get() { return _trialWorlds; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_triggerQuestionNow", { get() { return _triggerQuestionNow; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_tryLeaveMap", { get() { return _tryLeaveMap; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_typeIShieldIntercept", { get() { return _typeIShieldIntercept; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_updateObjectivesHUD", { get() { return _updateObjectivesHUD; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_updateSetupScreenCharacter", { get() { return _updateSetupScreenCharacter; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_varianceShield_absorbMistake", { get() { return _varianceShield_absorbMistake; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_vendorBuyBaseItem", { get() { return _vendorBuyBaseItem; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_vendorBuyCharm", { get() { return _vendorBuyCharm; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_vendorBuyCurrency", { get() { return _vendorBuyCurrency; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_vendorBuyEssence", { get() { return _vendorBuyEssence; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_vendorBuyPuzzleItem", { get() { return _vendorBuyPuzzleItem; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_vendorBuyTierMap", { get() { return _vendorBuyTierMap; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_vendorHideBaseTooltip", { get() { return _vendorHideBaseTooltip; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_vendorSetBaseFilter", { get() { return _vendorSetBaseFilter; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_vendorSetCharmFilter", { get() { return _vendorSetCharmFilter; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_vendorSetDefenseFilter", { get() { return _vendorSetDefenseFilter; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_vendorSetWeaponTypeFilter", { get() { return _vendorSetWeaponTypeFilter; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_vendorShowBaseTooltip", { get() { return _vendorShowBaseTooltip; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_vendorSwitchTab", { get() { return _vendorSwitchTab; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_vendorToggleUsableFilter", { get() { return _vendorToggleUsableFilter; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_voidSurgeTeardown", { get() { return _voidSurgeTeardown; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "_walkState", { get() { return _walkState; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "actuaryLogMistake", { get() { return actuaryLogMistake; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "advanceTutStep", { get() { return advanceTutStep; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "answerQuizInput", { get() { return answerQuizInput; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "applyAscendencyUpgrade", { get() { return applyAscendencyUpgrade; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "applyClassUpgrade", { get() { return applyClassUpgrade; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "awardAtlasClearScore", { get() { return awardAtlasClearScore; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "bar", { get() { return bar; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "beginRetrySetupRun", { get() { return beginRetrySetupRun; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "buildInventoryPanel", { get() { return buildInventoryPanel; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "cancelRetrySetupModal", { get() { return cancelRetrySetupModal; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "cellDown", { get() { return cellDown; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "charmKeyFor", { get() { return charmKeyFor; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "checkTitleUnlocks", { get() { return checkTitleUnlocks; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "checkWorldCodes", { get() { return checkWorldCodes; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "claimQuest", { get() { return claimQuest; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "clearUniversalReactions", { get() { return clearUniversalReactions; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "closeClassOverlay", { get() { return closeClassOverlay; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "closeKeybindsModal", { get() { return closeKeybindsModal; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "closeQuiz", { get() { return closeQuiz; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "confirmAscendencySelection", { get() { return confirmAscendencySelection; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "confirmClassChange", { get() { return confirmClassChange; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "confirmClassSelection", { get() { return confirmClassSelection; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "confirmReset", { get() { return confirmReset; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "createBeamEffect", { get() { return createBeamEffect; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "curDiff", { get() { return curDiff; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "curMods", { get() { return curMods; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "currentZoom", { get() { return currentZoom; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "egActivateMap", { get() { return egActivateMap; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "egAtlasNodeById", { get() { return egAtlasNodeById; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "egAtlasNodeName", { get() { return egAtlasNodeName; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "egCloseMapModsOverlay", { get() { return egCloseMapModsOverlay; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "egOpenMapModsOverlay", { get() { return egOpenMapModsOverlay; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "executeActiveAbility", { get() { return executeActiveAbility; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "finishQuiz", { get() { return finishQuiz; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "finishTutorial", { get() { return finishTutorial; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "gainMana", { get() { return gainMana; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "getActiveTitleName", { get() { return getActiveTitleName; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "getAvatarLastMoveDir", { get() { return getAvatarLastMoveDir; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "getCharmArtForSkill", { get() { return getCharmArtForSkill; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "getCharmByKey", { get() { return getCharmByKey; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "getCharmRankMinPlayerLevel", { get() { return getCharmRankMinPlayerLevel; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "getClassPenaltyMultiplier", { get() { return getClassPenaltyMultiplier; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "getGameTooltip", { get() { return getGameTooltip; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "getSkillCastRankFull", { get() { return getSkillCastRankFull; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "getSkillDef", { get() { return getSkillDef; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "getSkillName", { get() { return getSkillName; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "getTitleEffectSpecs", { get() { return getTitleEffectSpecs; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "getTitleForScore", { get() { return getTitleForScore; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "getTitleName", { get() { return getTitleName; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "goToPreviousScreen", { get() { return goToPreviousScreen; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "grantCharm", { get() { return grantCharm; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "handleCharmCurrencyTip", { get() { return handleCharmCurrencyTip; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "handleCharmEmptySlotTip", { get() { return handleCharmEmptySlotTip; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "handleCharmMaxRankToggle", { get() { return handleCharmMaxRankToggle; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "handleHUDTip", { get() { return handleHUDTip; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "handleHUDTipMove", { get() { return handleHUDTipMove; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "handleSkillTip", { get() { return handleSkillTip; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "handleSkillTipLeave", { get() { return handleSkillTipLeave; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "handleSkillTipMove", { get() { return handleSkillTipMove; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "handleSkillTipRank", { get() { return handleSkillTipRank; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "hasSeen", { get() { return hasSeen; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "hideClassTooltip", { get() { return hideClassTooltip; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "hideGameTooltip", { get() { return hideGameTooltip; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "hideHUDTooltip", { get() { return hideHUDTooltip; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "hideLsClassTooltip", { get() { return hideLsClassTooltip; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "hubDragOver", { get() { return hubDragOver; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "hubDropOnCraftingBench", { get() { return hubDropOnCraftingBench; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "initHubDnD", { get() { return initHubDnD; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "isBaseClassMaxed", { get() { return isBaseClassMaxed; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "isClassless", { get() { return isClassless; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "isCombatLevel", { get() { return isCombatLevel; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "isGatedLevel", { get() { return isGatedLevel; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "isHubGameOverlay", { get() { return isHubGameOverlay; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "isMathGatePassed", { get() { return isMathGatePassed; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "isMonsterless", { get() { return isMonsterless; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "isNexusPointLevel", { get() { return isNexusPointLevel; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "isNexusUnlocked", { get() { return isNexusUnlocked; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "isNexusWorld", { get() { return isNexusWorld; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "isNexusWorldUnlocked", { get() { return isNexusWorldUnlocked; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "isReplayEntryUnlocked", { get() { return isReplayEntryUnlocked; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "isTreeless", { get() { return isTreeless; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "isUniversalMovementSpell", { get() { return isUniversalMovementSpell; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "isUniversalSupportSpell", { get() { return isUniversalSupportSpell; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "itemDesc", { get() { return itemDesc; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "itemName", { get() { return itemName; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "keybindDisplayLabel", { get() { return keybindDisplayLabel; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "keybindKeyFor", { get() { return keybindKeyFor; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "keybindMatches", { get() { return keybindMatches; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "loadSettingsUI", { get() { return loadSettingsUI; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "lvText", { get() { return lvText; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "markSeen", { get() { return markSeen; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "maybeShowCharacterSelect", { get() { return maybeShowCharacterSelect; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "mgCalcHintThreshold", { get() { return mgCalcHintThreshold; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "mgCloseToLevelSelect", { get() { return mgCloseToLevelSelect; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "mgContinueToLevel", { get() { return mgContinueToLevel; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "mgFormatTutorAnswer", { get() { return mgFormatTutorAnswer; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "mgNewQuestion", { get() { return mgNewQuestion; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "mgUseTutor", { get() { return mgUseTutor; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "moveGameTooltip", { get() { return moveGameTooltip; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "moveLsClassTooltip", { get() { return moveLsClassTooltip; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "noteUniversalReaction", { get() { return noteUniversalReaction; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "onCorrectFill", { get() { return onCorrectFill; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "onHover", { get() { return onHover; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "onHoverOut", { get() { return onHoverOut; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "onKeybindAction", { get() { return onKeybindAction; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "onMistake", { get() { return onMistake; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "openChangelog", { get() { return openChangelog; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "openKeybindsModal", { get() { return openKeybindsModal; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "openRetrySetupModal", { get() { return openRetrySetupModal; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "openSpellbook", { get() { return openSpellbook; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "pauseGame", { get() { return pauseGame; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "pickLuckyItem", { get() { return pickLuckyItem; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "pickRandomItem", { get() { return pickRandomItem; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "playConfidenceIntervalEffect", { get() { return playConfidenceIntervalEffect; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "playResidualAnalysisEffect", { get() { return playResidualAnalysisEffect; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "playSampleEfficiencyEffect", { get() { return playSampleEfficiencyEffect; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "playShieldBreakEffect", { get() { return playShieldBreakEffect; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "playStasisOverlayEffect", { get() { return playStasisOverlayEffect; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "playStochasticResonanceEffect", { get() { return playStochasticResonanceEffect; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "playTimeGainEffect", { get() { return playTimeGainEffect; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "positionClassTooltip", { get() { return positionClassTooltip; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "prevTutStep", { get() { return prevTutStep; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "primerUseTutor", { get() { return primerUseTutor; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "ptHasSkill", { get() { return ptHasSkill; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "quizUseTutor", { get() { return quizUseTutor; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "recordMonsterKillScore", { get() { return recordMonsterKillScore; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "renderLSCharacterAvatar", { get() { return renderLSCharacterAvatar; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "renderMapViewCharacterPortrait", { get() { return renderMapViewCharacterPortrait; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "renderSkillHotbar", { get() { return renderSkillHotbar; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "replayTutorialFromTitle", { get() { return replayTutorialFromTitle; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "resetAllBeatsForSlot", { get() { return resetAllBeatsForSlot; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "resetKeybinds", { get() { return resetKeybinds; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "resetMarkovianState", { get() { return resetMarkovianState; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "resetZoom", { get() { return resetZoom; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "retrySetupDefer", { get() { return retrySetupDefer; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "retrySetupIsActive", { get() { return retrySetupIsActive; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "retrySetupResolve", { get() { return retrySetupResolve; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "ring", { get() { return ring; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "safeGoBackFromHub", { get() { return safeGoBackFromHub; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "save", { get() { return save; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "saveHubState", { get() { return saveHubState; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "saveSettings", { get() { return saveSettings; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "scalePuzzle", { get() { return scalePuzzle; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "selDiff", { get() { return selDiff; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "setPuzzleZoom", { get() { return setPuzzleZoom; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "showAscendencyTooltip", { get() { return showAscendencyTooltip; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "showAscendencyUpgradeTooltip", { get() { return showAscendencyUpgradeTooltip; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "showBeat", { get() { return showBeat; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "showClassChange", { get() { return showClassChange; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "showClassTooltip", { get() { return showClassTooltip; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "showCodes", { get() { return showCodes; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "showCombatToast", { get() { return showCombatToast; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "showEndgameAtlas", { get() { return showEndgameAtlas; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "showEndgameBossTest", { get() { return showEndgameBossTest; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "showEndgameGate", { get() { return showEndgameGate; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "showEndgameNexus", { get() { return showEndgameNexus; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "showEndgameTestHub", { get() { return showEndgameTestHub; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "showGameTooltip", { get() { return showGameTooltip; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "showHub", { get() { return showHub; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "showItemGainPopup", { get() { return showItemGainPopup; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "showLsClassTooltip", { get() { return showLsClassTooltip; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "showModal", { get() { return showModal; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "showPassiveTree", { get() { return showPassiveTree; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "showQuiz", { get() { return showQuiz; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "showToast", { get() { return showToast; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "showTutorial", { get() { return showTutorial; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "showUpgradeTooltip", { get() { return showUpgradeTooltip; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "showVendor", { get() { return showVendor; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "shuffle", { get() { return shuffle; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "skipPrimer", { get() { return skipPrimer; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "skipQuiz", { get() { return skipQuiz; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "stopPainting", { get() { return stopPainting; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "submitMathGate", { get() { return submitMathGate; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "submitPrimerAnswer", { get() { return submitPrimerAnswer; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "syncDiffModButtons", { get() { return syncDiffModButtons; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "t", { get() { return t; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "titleProgressText", { get() { return titleProgressText; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "titlesCollectedText", { get() { return titlesCollectedText; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "togMod", { get() { return togMod; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "triggerAilmentBanter", { get() { return triggerAilmentBanter; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "triggerAvoidBanter", { get() { return triggerAvoidBanter; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "triggerBanter", { get() { return triggerBanter; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "triggerClassEventIfPending", { get() { return triggerClassEventIfPending; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "triggerHitTakenBanter", { get() { return triggerHitTakenBanter; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "triggerItemBanter", { get() { return triggerItemBanter; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "triggerKillBanter", { get() { return triggerKillBanter; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "triggerLowTimeBanterIfNeeded", { get() { return triggerLowTimeBanterIfNeeded; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "triggerSkillBanter", { get() { return triggerSkillBanter; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "triggerSpellBanter", { get() { return triggerSpellBanter; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "tutUpdateKeybinds", { get() { return tutUpdateKeybinds; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "unpauseGame", { get() { return unpauseGame; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "updDiffDesc", { get() { return updDiffDesc; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "updModDesc", { get() { return updModDesc; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "updTimer", { get() { return updTimer; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "updateClassChangeButtons", { get() { return updateClassChangeButtons; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "updateClassHUDManaBar", { get() { return updateClassHUDManaBar; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "updateQuestStats", { get() { return updateQuestStats; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "updateRetryKeepModal", { get() { return updateRetryKeepModal; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "wdGoBackToMap", { get() { return wdGoBackToMap; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "withTitle", { get() { return withTitle; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "zoomInBtn", { get() { return zoomInBtn; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE
try { Object.defineProperty(globalThis, "zoomOutBtn", { get() { return zoomOutBtn; }, configurable: true }); } catch (e) {} // PHASE3-BRIDGE


//=======[ PHASE 3 module-import shims ]=========================================
try { globalThis["t"] = t; } catch (e) {} // PHASE3-SHIM (js/translation/translations.js)
try { globalThis["_varianceShield_removeBubble"] = _varianceShield_removeBubble; } catch (e) {} // PHASE3-SHIM (js/classes/class-mathmagician-variance-shield.js)
try { globalThis["_varianceShield_absorbMistake"] = _varianceShield_absorbMistake; } catch (e) {} // PHASE3-SHIM (js/classes/class-mathmagician-variance-shield.js)
try { globalThis["_arcaneFreeze_applyPersistentFrost"] = _arcaneFreeze_applyPersistentFrost; } catch (e) {} // PHASE3-SHIM (js/classes/class-mathmagician-absolute-zero.js)
try { globalThis["_arcaneFreeze_spawnStalagmite"] = _arcaneFreeze_spawnStalagmite; } catch (e) {} // PHASE3-SHIM (js/classes/class-mathmagician-absolute-zero.js)
try { globalThis["_arcaneFreeze_clearStalagmiteIfWrongMarkGone"] = _arcaneFreeze_clearStalagmiteIfWrongMarkGone; } catch (e) {} // PHASE3-SHIM (js/classes/class-mathmagician-absolute-zero.js)
try { globalThis["_arcaneFreeze_clearAllFrostAndStalagmites"] = _arcaneFreeze_clearAllFrostAndStalagmites; } catch (e) {} // PHASE3-SHIM (js/classes/class-mathmagician-absolute-zero.js)
try { globalThis["_executeFieldScan"] = _executeFieldScan; } catch (e) {} // PHASE3-SHIM (js/classes/class-probabilist.js)
try { globalThis["_tailRiskCancel"] = _tailRiskCancel; } catch (e) {} // PHASE3-SHIM (js/classes/class-outlier.js)
try { globalThis["_tailRiskResolve"] = _tailRiskResolve; } catch (e) {} // PHASE3-SHIM (js/classes/class-outlier.js)
try { globalThis["_endBlackSwan"] = _endBlackSwan; } catch (e) {} // PHASE3-SHIM (js/classes/class-outlier-black-swan.js)
try { globalThis["_markovSnapshotTick"] = _markovSnapshotTick; } catch (e) {} // PHASE3-SHIM (js/classes/class-markovian.js)
try { globalThis["resetMarkovianState"] = resetMarkovianState; } catch (e) {} // PHASE3-SHIM (js/classes/class-markovian.js)
try { globalThis["_bayesTrapsCleanup"] = _bayesTrapsCleanup; } catch (e) {} // PHASE3-SHIM (js/classes/class-bayesian.js)
try { globalThis["_openCraftingBench"] = _openCraftingBench; } catch (e) {} // PHASE3-SHIM (js/loot/loot-crafting-bench.js)
try { globalThis["_closeCraftingBench"] = _closeCraftingBench; } catch (e) {} // PHASE3-SHIM (js/loot/loot-crafting-bench.js)
try { globalThis["_craftingBenchSelect"] = _craftingBenchSelect; } catch (e) {} // PHASE3-SHIM (js/loot/loot-crafting-bench.js)
try { globalThis["_craftingBenchApply"] = _craftingBenchApply; } catch (e) {} // PHASE3-SHIM (js/loot/loot-crafting-bench.js)
try { globalThis["_vendorSwitchTab"] = _vendorSwitchTab; } catch (e) {} // PHASE3-SHIM (js/loot/loot-vendor.js)
try { globalThis["showVendor"] = showVendor; } catch (e) {} // PHASE3-SHIM (js/loot/loot-vendor.js)
try { globalThis["_vendorSetCharmFilter"] = _vendorSetCharmFilter; } catch (e) {} // PHASE3-SHIM (js/loot/loot-vendor-shared.js)
try { globalThis["_vendorSetEssenceFilter"] = _vendorSetEssenceFilter; } catch (e) {} // PHASE3-SHIM (js/loot/loot-vendor-shared.js)
try { globalThis["_vendorSetItemFilter"] = _vendorSetItemFilter; } catch (e) {} // PHASE3-SHIM (js/loot/loot-vendor-shared.js)
try { globalThis["_vendorBuyTierMap"] = _vendorBuyTierMap; } catch (e) {} // PHASE3-SHIM (js/loot/loot-vendor-maps.js)
try { globalThis["_vendorBuyCharm"] = _vendorBuyCharm; } catch (e) {} // PHASE3-SHIM (js/loot/loot-vendor-supplies.js)
try { globalThis["_vendorBuyCurrency"] = _vendorBuyCurrency; } catch (e) {} // PHASE3-SHIM (js/loot/loot-vendor-supplies.js)
try { globalThis["_vendorBuyEssence"] = _vendorBuyEssence; } catch (e) {} // PHASE3-SHIM (js/loot/loot-vendor-supplies.js)
try { globalThis["_vendorBuyPuzzleItem"] = _vendorBuyPuzzleItem; } catch (e) {} // PHASE3-SHIM (js/loot/loot-vendor-supplies.js)
try { globalThis["_vendorSetBaseFilter"] = _vendorSetBaseFilter; } catch (e) {} // PHASE3-SHIM (js/loot/loot-vendor-equipment.js)
try { globalThis["_vendorSetWeaponTypeFilter"] = _vendorSetWeaponTypeFilter; } catch (e) {} // PHASE3-SHIM (js/loot/loot-vendor-equipment.js)
try { globalThis["_vendorSetDefenseFilter"] = _vendorSetDefenseFilter; } catch (e) {} // PHASE3-SHIM (js/loot/loot-vendor-equipment.js)
try { globalThis["_vendorToggleUsableFilter"] = _vendorToggleUsableFilter; } catch (e) {} // PHASE3-SHIM (js/loot/loot-vendor-equipment.js)
try { globalThis["_vendorShowBaseTooltip"] = _vendorShowBaseTooltip; } catch (e) {} // PHASE3-SHIM (js/loot/loot-vendor-equipment.js)
try { globalThis["_vendorHideBaseTooltip"] = _vendorHideBaseTooltip; } catch (e) {} // PHASE3-SHIM (js/loot/loot-vendor-equipment.js)
try { globalThis["_vendorBuyBaseItem"] = _vendorBuyBaseItem; } catch (e) {} // PHASE3-SHIM (js/loot/loot-vendor-equipment.js)
try { globalThis["_mechClueSwap"] = _mechClueSwap; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/shared-boss-abilities.js)
try { globalThis["_mechCorruptCells"] = _mechCorruptCells; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/shared-boss-abilities.js)
try { globalThis["_mechFrozenCells"] = _mechFrozenCells; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/shared-boss-abilities.js)
try { globalThis["_mechPriorBomb"] = _mechPriorBomb; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/shared-boss-abilities.js)
try { globalThis["_mechProbabilityShift"] = _mechProbabilityShift; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/shared-boss-abilities.js)
try { globalThis["_mechFatedCell"] = _mechFatedCell; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/shared-puzzle-mechanics.js)
try { globalThis["_mechFogBank"] = _mechFogBank; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/shared-puzzle-mechanics.js)
try { globalThis["_mechClueScramble"] = _mechClueScramble; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/shared-puzzle-mechanics.js)
try { globalThis["_mechSoulTithe"] = _mechSoulTithe; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/shared-puzzle-mechanics.js)
try { globalThis["_mechNulErasure"] = _mechNulErasure; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-null.js)
try { globalThis["_mechNulLattice"] = _mechNulLattice; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-null.js)
try { globalThis["_mechNulRays"] = _mechNulRays; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-null.js)
try { globalThis["_nulTeardown"] = _nulTeardown; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-null.js)
try { globalThis["_bayTeardown"] = _bayTeardown; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-bayes.js)
try { globalThis["_mechBayBolts"] = _mechBayBolts; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-bayes.js)
try { globalThis["_mechBayVeil"] = _mechBayVeil; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-bayes.js)
try { globalThis["_mechBayWisps"] = _mechBayWisps; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-bayes.js)
try { globalThis["_entrTeardown"] = _entrTeardown; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-entropy.js)
try { globalThis["_mechEntrDecay"] = _mechEntrDecay; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-entropy.js)
try { globalThis["_mechEntrDoor"] = _mechEntrDoor; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-entropy.js)
try { globalThis["_mechEntrDrift"] = _mechEntrDrift; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-entropy.js)
try { globalThis["_lapTeardown"] = _lapTeardown; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-laplace.js)
try { globalThis["_mechLapBranches"] = _mechLapBranches; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-laplace.js)
try { globalThis["_mechLapFate"] = _mechLapFate; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-laplace.js)
try { globalThis["_mechLapFray"] = _mechLapFray; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-laplace.js)
try { globalThis["_mechOvrGradient"] = _mechOvrGradient; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-overfitter.js)
try { globalThis["_mechOvrPatternLock"] = _mechOvrPatternLock; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-overfitter.js)
try { globalThis["_mechOvrValidation"] = _mechOvrValidation; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-overfitter.js)
try { globalThis["_mechPatternBreak"] = _mechPatternBreak; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-overfitter.js)
try { globalThis["_ovrTeardown"] = _ovrTeardown; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-overfitter.js)
try { globalThis["_mechVisBench"] = _mechVisBench; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-vise.js)
try { globalThis["_mechVisQuench"] = _mechVisQuench; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-vise.js)
try { globalThis["_mechVisWalls"] = _mechVisWalls; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-vise.js)
try { globalThis["_visTeardown"] = _visTeardown; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-vise.js)
try { globalThis["_galeTeardown"] = _galeTeardown; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-gale.js)
try { globalThis["_mechGaleVault"] = _mechGaleVault; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-gale.js)
try { globalThis["_mechLightningConductors"] = _mechLightningConductors; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-dynamo.js)
try { globalThis["_mechSparkPillars"] = _mechSparkPillars; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-dynamo.js)
try { globalThis["_mechBigBomb"] = _mechBigBomb; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-demolitionist.js)
try { globalThis["_mechStickyBombs"] = _mechStickyBombs; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-demolitionist.js)
try { globalThis["_lodestoneTeardown"] = _lodestoneTeardown; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-lodestone.js)
try { globalThis["_mechPolarityField"] = _mechPolarityField; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-lodestone.js)
try { globalThis["_coilTeardown"] = _coilTeardown; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-coil.js)
try { globalThis["_mechNdNeedleGates"] = _mechNdNeedleGates; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-needle.js)
try { globalThis["_mechNdPinDrops"] = _mechNdPinDrops; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-needle.js)
try { globalThis["_mechNdPincushionBurst"] = _mechNdPincushionBurst; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-needle.js)
try { globalThis["_mechNdStitchWave"] = _mechNdStitchWave; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-needle.js)
try { globalThis["_ndTeardown"] = _ndTeardown; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-needle.js)
try { globalThis["_barTeardown"] = _barTeardown; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-barrage.js)
try { globalThis["_mechBarBombBarrage"] = _mechBarBombBarrage; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-barrage.js)
try { globalThis["_mechBarCurtain"] = _mechBarCurtain; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-barrage.js)
try { globalThis["_mechBarShotShells"] = _mechBarShotShells; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-barrage.js)
try { globalThis["_mechBarSupplyDrop"] = _mechBarSupplyDrop; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-barrage.js)
try { globalThis["_marksmanTeardown"] = _marksmanTeardown; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-marksman.js)
try { globalThis["_mechMarkedStrikes"] = _mechMarkedStrikes; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-marksman.js)
try { globalThis["_agTeardown"] = _agTeardown; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-aegis.js)
try { globalThis["_mechAgAegisProtocol"] = _mechAgAegisProtocol; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-aegis.js)
try { globalThis["_mechAgGuardRotor"] = _mechAgGuardRotor; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-aegis.js)
try { globalThis["_mechAgSentries"] = _mechAgSentries; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-aegis.js)
try { globalThis["_mechAgShieldCharge"] = _mechAgShieldCharge; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-aegis.js)
try { globalThis["_brutusZombieTeardown"] = _brutusZombieTeardown; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-brutus.js)
try { globalThis["_mechGroundSlam"] = _mechGroundSlam; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-brutus.js)
try { globalThis["_mechSacrificialZombies"] = _mechSacrificialZombies; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-brutus.js)
try { globalThis["_mechSireReply"] = _mechSireReply; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-siren.js)
try { globalThis["_mechSireUndertow"] = _mechSireUndertow; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-siren.js)
try { globalThis["_mechSireWail"] = _mechSireWail; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-siren.js)
try { globalThis["_sireTeardown"] = _sireTeardown; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-siren.js)
try { globalThis["_mechSirChain"] = _mechSirChain; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-sirus.js)
try { globalThis["_mechSirEye"] = _mechSirEye; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-sirus.js)
try { globalThis["_mechSirIon"] = _mechSirIon; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-sirus.js)
try { globalThis["_mechSirStrikes"] = _mechSirStrikes; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-sirus.js)
try { globalThis["_sirTeardown"] = _sirTeardown; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-sirus.js)
try { globalThis["_mechMemoryRite"] = _mechMemoryRite; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-maven.js)
try { globalThis["_mechConstriction"] = _mechConstriction; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-exarch.js)
try { globalThis["_infVTeardown"] = _infVTeardown; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-inferno.js)
try { globalThis["_mechInfVSurge"] = _mechInfVSurge; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-inferno.js)
try { globalThis["_mechInfVTides"] = _mechInfVTides; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-inferno.js)
try { globalThis["_mechInfVVents"] = _mechInfVVents; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-inferno.js)
try { globalThis["_mechMnHailBarrage"] = _mechMnHailBarrage; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-monsoon.js)
try { globalThis["_mechMnRainBands"] = _mechMnRainBands; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-monsoon.js)
try { globalThis["_mechMnStormSurge"] = _mechMnStormSurge; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-monsoon.js)
try { globalThis["_mechMnThunderbolts"] = _mechMnThunderbolts; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-monsoon.js)
try { globalThis["_mnTeardown"] = _mnTeardown; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-monsoon.js)
try { globalThis["_bzTeardown"] = _bzTeardown; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-buzz.js)
try { globalThis["_mechBzCutLine"] = _mechBzCutLine; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-buzz.js)
try { globalThis["_mechBzPendulumBlades"] = _mechBzPendulumBlades; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-buzz.js)
try { globalThis["_mechBzRicochetSaws"] = _mechBzRicochetSaws; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-buzz.js)
try { globalThis["_mechBzSawTraps"] = _mechBzSawTraps; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-buzz.js)
try { globalThis["_coloTeardown"] = _coloTeardown; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-colossus.js)
try { globalThis["_mechColoAvalanche"] = _mechColoAvalanche; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-colossus.js)
try { globalThis["_mechColoBoulders"] = _mechColoBoulders; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-colossus.js)
try { globalThis["_mechColoGolems"] = _mechColoGolems; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-colossus.js)
try { globalThis["_mechSeismicSlam"] = _mechSeismicSlam; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-colossus.js)
try { globalThis["_glTeardown"] = _glTeardown; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-gridlock.js)
try { globalThis["_mechGlLattice"] = _mechGlLattice; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-gridlock.js)
try { globalThis["_mechGlScramble"] = _mechGlScramble; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-gridlock.js)
try { globalThis["_mechGlSurge"] = _mechGlSurge; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-gridlock.js)
try { globalThis["_jsTeardown"] = _jsTeardown; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-jester.js)
try { globalThis["_mechJsCards"] = _mechJsCards; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-jester.js)
try { globalThis["_mechJsJinx"] = _mechJsJinx; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-jester.js)
try { globalThis["_mechJsOrbs"] = _mechJsOrbs; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-jester.js)
try { globalThis["_mechAbyssDark"] = _mechAbyssDark; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-abyss.js)
try { globalThis["_mechRisingPlats"] = _mechRisingPlats; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-architect.js)
try { globalThis["_mechTotemPulse"] = _mechTotemPulse; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-warden.js)
try { globalThis["_mechWardenSentries"] = _mechWardenSentries; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-warden-hazards.js)
try { globalThis["_mechWardenSolitary"] = _mechWardenSolitary; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-warden-hazards.js)
try { globalThis["_mechMaelstromVortex"] = _mechMaelstromVortex; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-maelstrom.js)
try { globalThis["_mechStillnessTrial"] = _mechStillnessTrial; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-arbiter.js)
try { globalThis["_thwompTeardown"] = _thwompTeardown; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-thwomp.js)
try { globalThis["_mdTeardown"] = _mdTeardown; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-medusa.js)
try { globalThis["_mechMdCoilCage"] = _mechMdCoilCage; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-medusa.js)
try { globalThis["_mechMdPetrifyWaves"] = _mechMdPetrifyWaves; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-medusa.js)
try { globalThis["_mechMdSnakeStrikes"] = _mechMdSnakeStrikes; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-medusa.js)
try { globalThis["_mechMdStoneGaze"] = _mechMdStoneGaze; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-medusa.js)
try { globalThis["_mechRzrCyclone"] = _mechRzrCyclone; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-razor.js)
try { globalThis["_mechRzrHone"] = _mechRzrHone; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-razor.js)
try { globalThis["_mechRzrWires"] = _mechRzrWires; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-razor.js)
try { globalThis["_rzrTeardown"] = _rzrTeardown; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-razor.js)
try { globalThis["_mechShpRift"] = _mechShpRift; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-shaper.js)
try { globalThis["_mechShpIcicles"] = _mechShpIcicles; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-shaper-ice.js)
try { globalThis["_mechShpBlizzard"] = _mechShpBlizzard; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-shaper-ice.js)
try { globalThis["_mechShpMonoliths"] = _mechShpMonoliths; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-shaper-guards.js)
try { globalThis["_mechShpWalker"] = _mechShpWalker; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-shaper-guards.js)
try { globalThis["_shpTeardown"] = _shpTeardown; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-shaper-winter.js)
try { globalThis["_blmTeardown"] = _blmTeardown; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-bloom.js)
try { globalThis["_mechBlmBlooms"] = _mechBlmBlooms; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-bloom.js)
try { globalThis["_mechBlmVeil"] = _mechBlmVeil; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-bloom.js)
try { globalThis["_mechBlmVolley"] = _mechBlmVolley; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-bloom.js)
try { globalThis["_mechMntHoofterrain"] = _mechMntHoofterrain; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-minotaur.js)
try { globalThis["_mechMntLabyrinth"] = _mechMntLabyrinth; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-minotaur.js)
try { globalThis["_mechMntThread"] = _mechMntThread; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-minotaur.js)
try { globalThis["_mntTeardown"] = _mntTeardown; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-minotaur.js)
try { globalThis["_mechShrBarriers"] = _mechShrBarriers; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-shrine.js)
try { globalThis["_mechShrMirrors"] = _mechShrMirrors; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-shrine.js)
try { globalThis["_mechShrWard"] = _mechShrWard; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-shrine.js)
try { globalThis["_shrTeardown"] = _shrTeardown; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-shrine.js)
try { globalThis["_mechSwHiveEye"] = _mechSwHiveEye; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-swarm.js)
try { globalThis["_mechSwMimicQueen"] = _mechSwMimicQueen; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-swarm.js)
try { globalThis["_mechSwSwarmArc"] = _mechSwSwarmArc; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-swarm.js)
try { globalThis["_swTeardown"] = _swTeardown; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-swarm.js)
try { globalThis["_mechBlockFall"] = _mechBlockFall; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-stack.js)
try { globalThis["_stackTeardown"] = _stackTeardown; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-stack.js)
try { globalThis["_mechEmberDrift"] = _mechEmberDrift; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-ember.js)
try { globalThis["_mechDoomSnail"] = _mechDoomSnail; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-snail.js)
try { globalThis["_mechJellyHops"] = _mechJellyHops; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-jelly.js)
try { globalThis["_gustTeardown"] = _gustTeardown; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-gust.js)
try { globalThis["_mechSproutlings"] = _mechSproutlings; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-sprout.js)
try { globalThis["_sproutTeardown"] = _sproutTeardown; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-sprout.js)
try { globalThis["_mechClockHands"] = _mechClockHands; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-clock.js)
try { globalThis["_puddleTeardown"] = _puddleTeardown; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-puddle.js)
try { globalThis["_bumperTeardown"] = _bumperTeardown; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-bumper.js)
try { globalThis["_strikerTeardown"] = _strikerTeardown; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-striker.js)
try { globalThis["_centipedeTeardown"] = _centipedeTeardown; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-centipede.js)
try { globalThis["_dancerTeardown"] = _dancerTeardown; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-dancer.js)
try { globalThis["_mechDanceSteps"] = _mechDanceSteps; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-dancer.js)
try { globalThis["_gamblerTeardown"] = _gamblerTeardown; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-gambler.js)
try { globalThis["_mechLoadedDice"] = _mechLoadedDice; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-gambler.js)
try { globalThis["_mechBattleIntent"] = _mechBattleIntent; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-tactician.js)
try { globalThis["_tacticianTeardown"] = _tacticianTeardown; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-tactician.js)
try { globalThis["_gourmetTeardown"] = _gourmetTeardown; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-gourmet.js)
try { globalThis["_mechGourmetGulp"] = _mechGourmetGulp; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-gourmet.js)
try { globalThis["_enTeardown"] = _enTeardown; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-encore.js)
try { globalThis["_mechEnBeatMines"] = _mechEnBeatMines; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-encore.js)
try { globalThis["_mechEnEncoreCircles"] = _mechEnEncoreCircles; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-encore.js)
try { globalThis["_mechEnSoundBars"] = _mechEnSoundBars; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-encore.js)
try { globalThis["_mechEnStageLights"] = _mechEnStageLights; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-encore.js)
try { globalThis["_bmbTeardown"] = _bmbTeardown; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-bomber.js)
try { globalThis["_mechCarpetRun"] = _mechCarpetRun; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-bomber.js)
try { globalThis["_mechClusterShells"] = _mechClusterShells; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-bomber.js)
try { globalThis["_mechMineCollar"] = _mechMineCollar; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-bomber.js)
try { globalThis["_crpTeardown"] = _crpTeardown; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-creeper.js)
try { globalThis["_mechCreeperPack"] = _mechCreeperPack; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-creeper.js)
try { globalThis["_mechCreeperPounce"] = _mechCreeperPounce; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-creeper.js)
try { globalThis["_mechTntChain"] = _mechTntChain; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-creeper.js)
try { globalThis["_mechMzDotWalls"] = _mechMzDotWalls; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-maze.js)
try { globalThis["_mechMzGhostGang"] = _mechMzGhostGang; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-maze.js)
try { globalThis["_mechMzLightsOut"] = _mechMzLightsOut; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-maze.js)
try { globalThis["_mechMzMazeWalls"] = _mechMzMazeWalls; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-maze.js)
try { globalThis["_mzTeardown"] = _mzTeardown; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-maze.js)
try { globalThis["_mechLightCycle"] = _mechLightCycle; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-tron.js)
try { globalThis["_mechSplitterRocks"] = _mechSplitterRocks; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-belt.js)
try { globalThis["_mechDormantSeekers"] = _mechDormantSeekers; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-hunter.js)
try { globalThis["_mechEyeBursts"] = _mechEyeBursts; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-cyclops.js)
try { globalThis["_mechCyclopsGaze"] = _mechCyclopsGaze; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-cyclops.js)
try { globalThis["_mechBulletWalls"] = _mechBulletWalls; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-barricade.js)
try { globalThis["_mechLockOn"] = _mechLockOn; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-guardian.js)
try { globalThis["_mechFlurry"] = _mechFlurry; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-duelist.js)
try { globalThis["_mechSelfDestruct"] = _mechSelfDestruct; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-mech.js)
try { globalThis["_mechVentAmbush"] = _mechVentAmbush; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-phantom.js)
try { globalThis["_mechThreadGrid"] = _mechThreadGrid; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-weaver.js)
try { globalThis["_mechSpeedLanes"] = _mechSpeedLanes; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-velocity.js)
try { globalThis["_mechPortalWisp"] = _mechPortalWisp; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-wormhole.js)
try { globalThis["_mechUmbralDashes"] = _mechUmbralDashes; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-eclipse.js)
try { globalThis["_mechDarkHunt"] = _mechDarkHunt; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-nightmare.js)
try { globalThis["_mechTentacleSweep"] = _mechTentacleSweep; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-kraken.js)
try { globalThis["_mechAxePendulum"] = _mechAxePendulum; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-executioner.js)
try { globalThis["_mechRisingTide"] = _mechRisingTide; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-leviathan.js)
try { globalThis["_mechReaperFans"] = _mechReaperFans; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-nemesis.js)
try { globalThis["_mechSpiralStorm"] = _mechSpiralStorm; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-nemesis.js)
try { globalThis["_mechEventBeams"] = _mechEventBeams; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-oblivion.js)
try { globalThis["_mechSingularity"] = _mechSingularity; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-oblivion.js)
try { globalThis["_mechBullBarrage"] = _mechBullBarrage; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-juggernaut.js)
try { globalThis["_mechThwompTrio"] = _mechThwompTrio; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-juggernaut.js)
try { globalThis["_mechQueenStorms"] = _mechQueenStorms; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-stormqueen.js)
try { globalThis["_mechShrapnelDownpour"] = _mechShrapnelDownpour; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-stormqueen.js)
try { globalThis["_mechBroadsides"] = _mechBroadsides; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-dreadnought.js)
try { globalThis["_mechSearchlight"] = _mechSearchlight; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-dreadnought.js)
try { globalThis["_mechGuardCall"] = _mechGuardCall; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-warlord.js)
try { globalThis["_mechTripleRings"] = _mechTripleRings; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-warlord.js)
try { globalThis["_mechJudgmentPillars"] = _mechJudgmentPillars; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-seraph.js)
try { globalThis["_mechRadiantFans"] = _mechRadiantFans; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-seraph.js)
try { globalThis["_mechChaosRoulette"] = _mechChaosRoulette; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-chaos.js)
try { globalThis["_mechWarShout"] = _mechWarShout; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-chaos.js)
try { globalThis["_mechVoidChoice"] = _mechVoidChoice; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-voidborn.js)
try { globalThis["_mechVoidTendrils"] = _mechVoidTendrils; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-voidborn.js)
try { globalThis["_mechCrownRings"] = _mechCrownRings; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-zenith.js)
try { globalThis["_mechRoyalDecree"] = _mechRoyalDecree; } catch (e) {} // PHASE3-SHIM (js/combat/bosses/boss-zenith.js)
try { globalThis["_lootFilterCloseModal"] = _lootFilterCloseModal; } catch (e) {} // PHASE3-SHIM (js/loot/loot-filter.js)
try { globalThis["_lootFilterAddRule"] = _lootFilterAddRule; } catch (e) {} // PHASE3-SHIM (js/loot/loot-filter.js)
try { globalThis["_lootFilterSaveModal"] = _lootFilterSaveModal; } catch (e) {} // PHASE3-SHIM (js/loot/loot-filter.js)
try { globalThis["_lootFilterSetRule"] = _lootFilterSetRule; } catch (e) {} // PHASE3-SHIM (js/loot/loot-filter.js)
try { globalThis["_lootFilterDelRule"] = _lootFilterDelRule; } catch (e) {} // PHASE3-SHIM (js/loot/loot-filter.js)

//=======[ end of generated module ]=============================================
