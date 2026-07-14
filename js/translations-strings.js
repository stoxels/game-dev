
//------------------------------------------------------------------------
//---------------------TRANSLATIONS STRINGS TABLE ------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


const T = {
    en: {
        // Title screen
        tagline: 'STOCHASTICS & STATISTICS NONOGRAMS',

        // Navigation buttons (used across multiple screens)
        btn_play: '▶ PLAY', btn_howtoplay: '? HOW TO PLAY',
        btn_highscores: '🏆 HIGHSCORES', btn_codes: '🔑 MOODLE CODES',
        btn_confirm: '▶ SELECT LEVEL', btn_back: '◀ BACK',
        btn_setup: 'SETUP', btn_menu: 'MENU', btn_levels: '◀ LEVELS',
        btn_next: 'NEXT ▶', btn_retry: 'RETRY', btn_retry2: 'TRY AGAIN',
        btn_settings: '⚙️ SETTINGS',
        btn_achievements: '🏅 ACHIEVEMENTS',

        // Reset
        toast_reset: '🗑 All Progress has been reset.',

        // Tutorial modal — section headings (h) and paragraphs (p)
        tut_title: '▸ HOW TO PLAY STOXELS',

        tut_s1h: 'WHAT IS A NONOGRAM?',
        tut_s1p: 'A nonogram is a grid puzzle. Numbers on row and columns tell you how many consecutive filled cells exist. Reveal the full symbol to win!',

        tut_s2h: 'CONTROLS',
        tut_s2p: '<strong>Left click</strong> — fill a cell<br><strong>Right click</strong> — mark a cell as empty<br><strong>Hold Left Click and Drag</strong> - fill multiple cells<br>< strong > CTRL + MouseWheel</strong> — Zoom in & out to scale <br> <strong>Left & Right Arrow Keys</strong> — Move the row clue headers towards the left/right<br> <strong>1,2,3,4</strong> - use Class Abilities <br> <strong>Escape</strong> - Pause the Game',

        tut_s3h: 'DIFFICULTY',
        tut_s3p: '<strong style="color:var(--green)">Easy</strong> — low time penalties for mistakes, 50% less Score<br><strong style="color:var(--yellow)">Normal</strong> — standard time penalties for mistakes<br><strong style="color:var(--red)">Hard</strong> — heavy time penalties for mistakes, 50% more score',

        tut_s4h: 'GAME MODIFIERS',
        tut_s4p: '<strong style="color:var(--orange)">Time Trial</strong> — 50% less time per level, but 20% more Score <br> < strong style="color:var(--red)" > Hardcore</strong> — one mistake fails the level, but 30% more Score<br>< strong style = "color:var(--purple)" > Ironman</strong> — items cannot be used, but 15 % more Score < br > <strong style="color:var(--accent)">Classless</strong> — Class Abilities cannot be used, but 20 % more Score < br > <strong style="color:var(--green)">Treeless</strong> — Probability Tree nodes have no effect, but 25 % more Score < br > Modifiers can be combined with each other.',

        tut_s5h: 'ITEMS & INVENTORY',
        tut_s5p: 'Complete a level\'s bonus objective to earn a random item. Cursed items are powerful but also have a negative effect.',

        tut_s6h: 'QUIZ & Probability Gates',
        tut_s6p: 'Some levels require answering a quiz correctly after finishing a level in order to achieve the bonus objective, and some levels have a Probability Gate that can be unlocked by solving an excercise.',

        tut_s7h: 'ACHIEVEMENT CODES',
        tut_s7p: 'Reach score milestones to unlock Moodle Codes. You can see your progress towards the next achievement in the Highscores tab. More score can be earned by replaying levels on higher difficulties or by adding more game modifiers.',

        tut_s8h: 'CLASSES & CLASS ABILITIES',
        tut_s8p: 'Completing Ascension - Levels allows you to select one out of three possible classes. Each class has a passive ability and two active abilities, which can heavily alter the way you approach a Stoxel and help in case you get stuck. Abilities can be upgraded by playing more Ascension - Levels.',

        tut_s9h: 'CONVERGENCE, INFERENCE & PROBABILITY TREE',
        tut_9p: 'Completing Convergence - Levels grants Convergence Points, which can be spent on the Probability Tree to customize the way you play the game. Completing Inference - Objectives rewards additional Convergence Points.',

        // Setup screen
        setup_title: 'GAME SETUP',
        setup_diff: 'DIFFICULTY',
        setup_mod: 'GAME MODIFIERS (OPTIONAL)',

        // Difficulty button labels and one-line descriptions (shown below the buttons)
        diff_easy: 'EASY', diff_normal: 'NORMAL', diff_hard: 'HARD',
        diff_desc_easy: 'Low Time Penalties for Mistakes, but 50% less Score',
        diff_desc_normal: 'Standard Time Penalties for Mistakes',
        diff_desc_hard: 'Strong Time Penalties for Mistakes, but 50% more Score',

        // Modifier button labels and descriptions
        mod_tt: 'TIME TRIAL', mod_hc: 'HARDCORE', mod_im: 'IRONMAN',
        mod_desc_none: 'No modifiers selected.',
        mod_desc_tt: '50% less time',
        mod_desc_hc: 'Game Over after one mistake',
        mod_desc_im: 'No Items',

        // In-game HUD
        score_lbl: 'SCORE',
        ls_title: 'SELECT LEVEL',

        // Inventory panel
        inv_title: '🎒 INVENTORY',
        item_cost: 'Use: −',   // prefix before the score cost of using an item
        item_sell: 'Sell +',   // prefix before the sell value of an item
        inv_empty: '<strong style="color:var(--white)">No items yet. Complete bonus objectives or repeat levels to earn items!</strong>',

        // Win / lose overlays
        ov_win: 'STOXEL SOLVED!',
        ov_lose: "TIME'S UP!",

        // Highscore screen
        hs_title: 'HIGHSCORES',
        hs_total: 'TOTAL SCORE', hs_level: 'Level',
        hs_best: 'Best Score', hs_diff: 'Difficulty',
        no_hs: '<strong style="color:var(--orange)">No highscores yet.</strong>',
        hs_mods: 'Mods',
        hs_code_unlocked: 'CODE UNLOCKED',

        // Codes screen
        codes_title: 'MOODLE CODES',
        no_codes: 'No codes unlocked yet.\nEarn points to unlock achievement codes!',

        // Password / Moodle code modal
        pw_title: '🔑 NEW CODE UNLOCKED!',
        pw_intro: 'You unlocked a Moodle code. Enter it in Moodle to claim your badge!',
        pw_hint: 'Enter this code in Moodle to receive your badge.',

        // Level select — dynamic strings
        ls_total: '',
        ls_bonus_claimed: 'Bonus claimed',
        ls_complete_level: 'Complete level',
        ls_locked_hint: '🔓 Beat the Probability Gate to unlock this puzzle!',
        ls_no_score: 'Complete this puzzle!',
        ls_max_score: '🏆 Maximum score reached!',
        ls_tip_harder: 'Try {diff} difficulty to reach a higher score!',
        ls_tip_mods: 'Add {mods} modifier for bonus score!',
        ls_tip_mods_plural: 'Add {mods} modifiers for bonus score!',
        ls_hs_best: 'BEST',

        // In-game HUD
        lvl_prefix: 'LEVEL',
        zoom_hint: '',

        // Penalty / mistake feedback
        pen_shield: '🛡️ Shield absorbed the mistake!',
        pen_display: '−{n}s (#{m})',

        // Hardcore fail overlay
        hc_fail_title: 'HARDCORE FAIL!',
        hc_fail_sub: 'One mistake = game over in Hardcore mode!',

        // Item use toasts
        item_revealed: 'Revealed {n} tile',
        item_revealed_pl: 'Revealed {n} tiles',
        item_cursed_reset: '☠️ CURSED! Board was reset!',
        item_cursed_lucky: '☠️ Lucky! Revealed 6 tiles!',
        item_marked: 'Marked {n} empty tiles!',
        item_demon_title: '👁️ DEMON EYE TRIGGERED!',
        item_demon_sub: 'The cursed item sealed your fate!',
        item_demon_shield: '👁️ Risky shield activated!',
        item_cursed_time_bad: '💀 CURSED! −4 minutes!',
        item_cursed_time_good: '💀 Lucky! +5 minutes!',
        item_time_added: '+{n}s added!',
        item_freeze_msg: 'Timer frozen 30s!',
        item_shield_msg: 'Shield active!',
        item_cursed_locked: '☠️ Cursed items unlock after {n} more min',
        item_discarded: 'Item discarded',
        item_sell_btn: 'x',
        inv_cursed_locked_label: '🔒 LOCKED {n}min',
        item_row_solved: 'Row fully revealed!',
        item_row_solved_none: 'All rows already solved!',
        item_col_solved: 'Column fully revealed!',
        item_col_solved_none: 'All columns already solved!',
        item_mistake_erased: 'Erased {n} mistake(s) from your count!',
        item_mistake_erased_none: 'No mistakes to erase!',
        item_cursed_row_lucky: '🌊 Lucky! {n} row(s) revealed!',
        item_cursed_row_bad: '🌊 CURSED! {n} row(s) erased!',
        item_cursed_col_lucky: '🌪️ Lucky! {n} column(s) revealed!',
        item_cursed_col_bad: '🌪️ CURSED! {n} column(s) erased!',
        item_cursed_rowcol_lucky: '💥 JACKPOT! {r} rows + {c} cols revealed!',
        item_cursed_rowcol_bad: '💥 CHAOS! {n} rows/cols erased!',
        item_artifact_complete: '🌟 CODEX activated! Puzzle solved instantly!',
        item_primer_activated: "📜 Scout's Primer activated! Question fires on your next level.",
        item_primer_headstart: "Headstart applied! 2 rows + 2 columns pre-solved.",

        item_cursed_reveal_both: 'Revealed 6 tiles! But all ✕ marks were cleared.',
        item_cursed_time_both: '+20 min added, but Row and Columns are hidden for 30s',
        item_cursed_shield_both: 'Shield active + 2 tiles revealed! Row clues hidden for 30s.',
        item_cursed_row_both: '🌊 {r} row(s) revealed · {e} row erased!',
        item_cursed_col_both: '🌪️ {r} col(s) revealed · {e} col erased!',
        item_cursed_rowcol_both: '💥 {r} rows + {c} cols revealed! Column clues hidden for 45s.',

        // Inventory rarity labels
        rar_common: 'COMMON', rar_uncommon: 'UNCOMMON', rar_rare: 'RARE',
        rar_legendary: 'LEGENDARY', rar_cursed: 'CURSED',

        // Win overlay
        ov_win_pts: 'Score',
        ov_win_left: 'left',
        ov_win_multiplier: 'Multiplier:',
        ov_win_solved_in: 'solved in',
        ov_win_mistake: 'mistake',
        ov_win_mistakes: 'mistakes',
        ov_win_absorbed: 'absorbed by shield/skill',
        ov_win_new: 'new',
        ov_win_best_was: 'Level Highscore:',
        ov_bonus_met: '🎯 BONUS MET!',
        ov_item_earned: '🎁 Item earned',
        ov_bonus_claimed_note: '✓ Bonus objective already claimed.',
        ov_lucky_drop: '🍀 Lucky drop!',
        ov_quiz_reward: '🧠 Quiz reward',

        // Quiz overlay
        quiz_title: '⭐ BONUS QUESTION',
        quiz_correct: '✓ CORRECT! +50 Score & Item reward!',
        quiz_correct_claimed: '✓ Correct!',
        quiz_wrong: '✗ Wrong answer. No bonus.',
        quiz_continue: 'CONTINUE ▶',
        quiz_skip: 'SKIP',

        // Inventory strip header
        inv_strip_header: '🎒 INVENTORY - Left Click to use an item - Right Click to add to the reshuffle pile',
        inv_strip_header_static: '🎒 INVENTORY',
        inv_strip_header_mouseover: 'Left Click to use an item - Right Click to add to the reshuffle pile',

        // Tutorial steps
        tut2_s0_title: 'Welcome to STOXELS!',
        tut2_s0_text: 'This quick tutorial walks you through the game interface. Use <strong>NEXT ▶</strong> to advance or skip straight to playing.<br><br>STOXELS is a nonogram puzzle game themed around <strong>stochastics & statistics</strong>. Solve puzzles, earn items, choose a class, advance the Probability Tree and unlock Achievements to earn Moodle Badges!',

        tut2_s1_title: 'The Game Screen',
        tut2_s1_text: 'Here is what a typical game session looks like. You will see:<br>• A <strong>puzzle grid</strong> in the centre<br>• <strong>Clue numbers</strong> on the rows and columns<br>• A <strong>timer</strong> counting down<br>• Your <strong>inventory</strong> of items below<br><br>Let\'s go through each part.',

        tut2_s2_title: 'The Puzzle Grid',
        tut2_s2_text: '<strong>Left-click</strong> a cell to fill it.<br><strong>Right-click</strong> to mark it empty (✕).<br><strong>Drag</strong> to paint multiple cells at once.<br><br>Filling a cell that should be <em>empty</em> costs you time — so think before you click!',

        tut2_s3_title: 'Row Clues',
        tut2_s3_text: 'The numbers on the <strong>left of each row</strong> tell you how many consecutive filled cells exist in that row, and in what order.<br><br>Example: <strong>1 1</strong> means there is one filled cell, then a gap, then another filled cell.',

        tut2_s4_title: 'Column Clues',
        tut2_s4_text: 'The numbers <strong>above each column</strong> work the same way — they describe runs of filled cells from top to bottom.<br><br>Use both the row and column clues together to deduce which cells must be filled.',

        tut2_s5_title: 'The Timer',
        tut2_s5_text: 'You have a limited amount of time to complete each puzzle. The clock starts as soon as the level loads.<br><br>⚠️ <strong>Wrong fills cost time!</strong> Each mistake subtracts seconds from the clock. The harsher the selected difficulty, the bigger the penalty.<br><br>The timer turns orange at 3 minutes remaining and red at 1 minute.',

        tut2_s6_title: 'Penalties',
        tut2_s6_text: 'When you fill a wrong cell:<br>• The cell turns <strong>red ✕</strong><br>• Seconds are subtracted from your timer<br>• The penalty amount is shown here briefly<br><br>On <strong>Easy</strong> difficulty penalties are small. On <strong>Hard</strong> they are brutal. <strong>Hardcore</strong> mode ends the level on the very first mistake!',

        tut2_s7_title: 'Bonus Objective',
        tut2_s7_text: 'Every level has a <strong>bonus objective</strong> shown here — for example: finish in under 20 seconds, or make no mistakes.<br><br>Meet the objective ➜ earn a random item when you finish.<br>If the bonus type is <strong>Quiz</strong>, answering a statistics question correctly gives +50 points and an extra item.',

        tut2_s8_title: 'Inventory',
        tut2_s8_text: 'Items you have earned are shown here. <strong>Click an item to use it</strong> during a level.<br><br>Items include:<br>• 🔦 <em>Reveal</em> — shows correct tiles in green<br>• 🛡️ <em>Shield</em> — absorbs your next mistake<br>• ⏳ <em>+Time</em> — adds seconds to the clock<br>• ☠️ <em>Cursed</em> — powerful but risky, locked for 3 min<br><br><strong>Ironman</strong> mode disables all items for a score bonus.',

        tut2_s9_title: 'Probability Tree',
        tut2_s9_text: 'While adventuring through the world of Stoxels you will earn points to spend on the Probability Tree. You can obtain up to 66 points in total and can refund points at any time. Points can only be spend or refundded on adjacent nodes.',

        tut2_s10_title: 'Inference',
        tut2_s10_text: 'Complete Inference - Tasks to earn items and collect more points for the Probability Tree!',

        tut2_s11_title: 'Classes',
        tut2_s11_text: 'Complete Ascension - Levels in order to unlock a class. Classes have abilities that can be used to help you solve puzzles!',

        tut2_s12_title: '',
        tut2_s12_text: '',

        tut2_s13_title: '',
        tut2_s13_text: '',

        tut2_s14_title: '',
        tut2_s14_text: '',

        tut2_s15_title: '',
        tut2_s15_text: '',

        // Math gate modal
        mg_gate_badge: 'PROBABILITY GATE',
        mg_instruction: 'Solve this exercise to unlock the level:',
        mg_submit: 'CHECK',
        mg_correct: '✓ Correct! Unlocking level…',
        mg_wrong: '✗ Not quite. Attempt {n} — try again!',
        mg_not_a_number: '⚠ Please enter a numeric value.',
        mg_new_q: '🔄 TRY A DIFFERENT QUESTION',
        mg_footer: 'Solve it once and this level stays unlocked permanently.',

        ls_to_next: 'to next code',
        ls_all_codes: 'All codes unlocked!',

        reset_close: '✕ CLOSE',
        reset_title: 'RESET ALL PROGRESS',
        reset_body: 'This will permanently erase:<br><strong style="color:var(--accent2)">· All completed levels<br>· All highscores<br>· All bonus claims<br>· All inventory items<br>· All Moodle codes<br>· Your selected class <br>· Your completed Inference tasks <br>· Your collected Convergence Points<br><br>This will NOT reset your collected achievements.</strong><br><br>Your current playthrough will be gone. This cannot be undone.',
        reset_confirm: '🗑 YES, RESET EVERYTHING',
        reset_cancel: 'CANCEL',

        item_freeze_msg: '❄️ TIME FREEZE!',
        item_freeze_ended: '❄️ Freeze ended',


        btn_inference: 'INFERENCE',

        mod_cl: 'CLASSLESS',
        mod_tl: 'TREELESS',
        mod_desc_cl: 'No Class Abilities',
        mod_desc_tl: 'No Tree Effects',

        setup_controls: 'CONTROLS',
        axis_lock_label: '🔒 AXIS LOCK — Lock mouse drag direction to current row or column',


        btn_settings_close: '✕ CLOSE',

        // Settings Modal
        settings_title: 'SETTINGS',
        settings_audio: 'AUDIO',
        settings_bgm: 'Background Music',
        settings_sfx: 'Sound Effects',
        settings_controls: 'CONTROLS',
        settings_axis_lock: 'Axis Lock',
        settings_axis_lock_hint: 'Lock drag to starting row or column',
        settings_qmark: 'Question Mark',
        settings_qmark_hint: 'Right Click a X - marked cell to add a yellow ?',
        stt_on: 'ON',
        stt_off: 'OFF',

        game_paused: 'GAME PAUSED',
        game_paused_hint: 'Press Esc to continue',

        // Math Gate Units
        elements: 'elements',
        events: 'events',
        outcomes: 'outcomes',

        subsets: "Subsets",
        elementary_events: "Elementary Events",
        cards: "Cards",
        meals: "Meals",
        passwords: "Passwords",
        ways: "Ways",
        combinations: "Combinations",
        terms: "Terms",
        paths: "Paths",

        mg_placeholder: 'your answer',

        codes_req_score: 'Required Score:',
        codes_req_ach: 'Required Achievement Milestones:',
        ls_tip_optimize: 'Completed on Hard with all Modifiers, but you can still gain more Score by completing the level faster!',

        convergence: 'Convergence',
        convergence_desc_1: 'You haveve reached a milestone and earned 1 Convergence Point.',
        convergence_open_tree: '🌿 Open Probability Tree',
        convergence_next_level: '▶ Next Level',
        convergence_level_Select: '☰ Select Level',

        settings_touchpad: 'Touchpad Mode',
        settings_touchpad_hint: 'Adds an in-game button to swap left-click between Fill and Mark',
        touchpad_btn_fill: '🖊️ FILL',
        touchpad_btn_mark: '✕ MARK',

        tree: 'TREE',

        reset_item_levels: 'All completed levels',
        reset_item_highscores: 'All highscores',
        reset_item_bonus: 'All bonus claims',
        reset_item_inventory: 'All inventory items',
        reset_item_codes: 'All Moodle codes',
        reset_item_class: 'Your selected class',
        reset_item_inference: 'Your completed Inference tasks',
        reset_item_convergence: 'Your collected Convergence Points',
        reset_note_1: 'This will NOT reset your collected achievements.',
        reset_note_2: 'Your current playthrough will be gone. This cannot be undone.',



    },

    de: {
        // Title screen
        tagline: 'STOCHASTIK & STATISTIK NONOGRAMME',

        // Navigation buttons
        btn_play: '▶ SPIELEN', btn_howtoplay: '? ANLEITUNG',
        btn_highscores: '🏆 HIGHSCORES', btn_codes: '🔑 MOODLE CODES',
        btn_confirm: '▶ LEVEL WÄHLEN', btn_back: '◀ ZURÜCK',
        btn_setup: 'Setup', btn_menu: 'MENÜ', btn_levels: '◀ LEVELS',
        btn_next: 'WEITER ▶', btn_retry: 'NOCHMAL', btn_retry2: 'NOCHMAL',
        btn_settings: '⚙️ EINSTELLUNGEN',
        btn_achievements: '🏅 Erfolge',

        // Reset:
        toast_reset: '🗑 Fortschritt zurückgesetzt. Neuer Start!',

        // Tutorial modal
        tut_title: '▸ SO SPIELST DU STOXELS',
        tut_s1h: 'WAS IST EIN NONOGRAMM?',
        tut_s1p: 'Ein Nonogramm ist ein Gitterpuzzle. Zahlen an Zeilen und Spalten stellen die Anzahl aufeinanderfolgend gefüllter Zellen dar. Enthülle das gesamte Symbol um zu gewinnen!',

        tut_s2h: 'STEUERUNG',
        tut_s2p: '<strong>Linksklick</strong> — Zelle füllen<br><strong>Rechtsklick</strong> — Zelle als leer markieren<br><strong>Linksklick gedrückt halten & Ziehen</strong> — Mehrere Zellen füllen<br><strong>STRG + Mausrad</strong> — Hinein- & herauszoomen zum Skalieren<br><strong>Linke - und - Rechte Pfeiltaste</strong> — Zeilenhinweise nach links/rechts bewegen<br> <strong>1,2,3,4</strong> - Klassenfähigkeiten verwenden <br>  <strong>Escape</strong> — Spiel pausieren',

        tut_s3h: 'SCHWIERIGKEIT',
        tut_s3p: '<strong style="color:var(--green)">Leicht</strong> — geringe Zeitstrafen bei Fehlern, 50% weniger Punkte<br><strong style="color:var(--yellow)">Normal</strong> — normale Zeitstrafen bei Fehlern <br> <strong style="color:var(--red)">Schwer</strong> — schwere Zeitstrafen bei Fehlern, 50% mehr Punkte',

        tut_s4h: 'SPIELMODIFIKATOREN',
        tut_s4p: '<strong style="color:var(--orange)">Time Trial</strong> — 50% weniger Zeit pro Level — 20% mehr Punkte<br><strong style="color:var(--red)">Hardcore</strong> — ein Fehler = sofort verloren — 30% mehr Punkte<br><strong style="color:var(--purple)">Ironman</strong> — Items können nicht verwendet werden — 15% mehr Punkte <br><strong style="color:var(--accent)">Klassenlos</strong> — Keine aktiven oder passiven Klassenfähigkeiten, aber dafür 20% mehr Punkte <br><strong style="color:var(--green)">Baumlos</strong> — Probability Alle Effekte vom Wahrscheinlichkeitsbaum sind deaktiviert, aber dafür 25% mehr Punkte <br>Modifikatoren können miteinander kombiniert werden.',

        tut_s5h: 'ITEMS & INVENTAR',
        tut_s5p: 'Erfülle das Bonusziel eines Levels, um ein zufälliges Item zu erhalten. Verfluchte Items sind mächtig, aber haben auch negative Effekte.',

        tut_s6h: 'QUIZ & WAHRSCHEINLICHKEITSTORE',
        tut_s6p: 'Manche Level erfordern nach dem Abschluss eine korrekt beantwortete Quizfrage, um das Bonusziel zu erreichen. Außerdem haben einige Level ein Wahrscheinlichkeitstor, das durch Lösen einer Aufgabe freigeschaltet werden kann.',

        tut_s7h: 'ACHIEVEMENT CODES',
        tut_s7p: 'Erreiche Punktemeilensteine, um Moodle-Codes freizuschalten. Deinen Fortschritt zum nächsten Achievement siehst du im Highscores-Tab. Mehr Punkte lassen sich durch Wiederholen von Levels auf höheren Schwierigkeitsstufen oder durch zusätzliche Modifikatoren verdienen.',

        tut_s8h: 'KLASSEN & KLASSEN FÄHIGKEITEN',
        tut_s8p: 'Nach dem Beenden eines Aufstiegs - Levels kann eine von drei möglichen Klassen ausgewählt werden. Jede Klasse hat eine passive und zwei aktive Fähigkeiten, die deine Spielweise beeinflussen können und dir helfen, wenn du nicht weiter weißt. Fähigkeiten können durch das Abschließen von weiteren Aufstieg - Levels verbessert werden.',

        tut_s9h: 'KONVERGENZ, INFERENZ & WAHRSCHEINLICHKEITSBAUM',
        tut_s9p: 'Nach dem Beenden eines Konvergenz - Levels erhältst du Konvergenzpunkte, die im Wahrscheinlichkeitsbaum ausgegeben werden können, um deine Spielweise anzupassen. Das Abschließen von Inferenz - Zielen gibt zusätzliche Konvergenzpunkte.',




        // Setup screen
        setup_title: 'SPIELEINRICHTUNG',
        setup_diff: 'SCHWIERIGKEIT',
        setup_mod: 'MODIFIKATOREN (OPTIONAL)',

        // Difficulty
        diff_easy: 'LEICHT', diff_normal: 'NORMAL', diff_hard: 'SCHWER',
        diff_desc_easy: 'Geringe Zeitstrafen bei Fehlern, aber dafür 50% weniger Punkte',
        diff_desc_normal: 'Normale Zeitstrafen bei Fehlern',
        diff_desc_hard: 'Starke Zeitstrafen bei Fehlern, aber dafür 50% mehr Punkte',

        // Modifiers
        mod_tt: 'TIME TRIAL', mod_hc: 'HARDCORE', mod_im: 'IRONMAN',
        mod_desc_none: 'Keine Modifikatoren. Normaler Puzzlemodus.',
        mod_desc_tt: '50% weniger Zeit pro Level',
        mod_desc_hc: 'Game Over nach einem Fehler',
        mod_desc_im: 'Keine Gegenstände',

        // In-game HUD
        score_lbl: 'PUNKTE',
        ls_title: 'LEVEL WÄHLEN',

        // Inventory panel
        inv_title: '🎒 INVENTAR',
        item_cost: 'Nutzung: −',
        item_sell: 'Verkauf +',
        inv_empty: '<strong style="color:var(--white)">Noch keine Items. Erfülle Bonusziele oder löse bereits abgeschlossene Levels nochmal!</strong>',

        // Win / lose overlays
        ov_win: 'STOXEL GELÖST!',
        ov_lose: 'ZEIT VORBEI!',

        // Highscore screen
        hs_title: 'Highscores',
        hs_total: 'GESAMTPUNKTE', hs_level: 'Level',
        hs_best: 'Bestes Ergebnis', hs_diff: 'Schwierigkeit',
        no_hs: '<strong style="color:var(--orange)">Noch keine Einträge.</strong>',
        hs_mods: 'Mods',
        hs_code_unlocked: 'CODE FREIGESCHALTET',

        // Codes screen
        codes_title: 'MOODLE CODES',
        no_codes: 'Noch keine Codes freigeschaltet.\nSammle Punkte, um Achievement-Codes freizuschalten!',

        // Password / Moodle code modal
        pw_title: '🔑 NEUER CODE FREIGESCHALTET!',
        pw_intro: 'Du hast einen Moodle-Code freigeschaltet. Gib ihn in Moodle ein, um dein Abzeichen zu erhalten!',
        pw_hint: 'Gib diesen Code in Moodle ein.',

        // Level select — dynamic strings
        ls_total: '',
        ls_bonus_claimed: 'Bonus erhalten!',
        ls_complete_level: 'Level abschließen',
        ls_locked_hint: '🔓 Überwinde das Wahrscheinlichkeitstor, um dieses Puzzle freizuschalten!',
        ls_no_score: 'Löse dieses Puzzle!',
        ls_max_score: '🏆 Maximale Punktzahl erreicht!',
        ls_tip_harder: 'Löse dieses Puzzle in der {diff} Schwierigkeit für mehr Punkte!',
        ls_tip_mods: 'Füge {mods} Modifikator für mehr Punkte hinzu!',
        ls_tip_mods_plural: 'Füge {mods} Modifikatoren für mehr Punkte hinzu!',
        ls_hs_best: 'REKORD',

        // In-game HUD
        lvl_prefix: 'Level',
        zoom_hint: '',

        // Penalty / mistake feedback
        pen_shield: '🛡️ Schild hat den Fehler absorbiert!',
        pen_display: '−{n}s (#{m})',

        // Hardcore fail overlay
        hc_fail_title: 'HARDCORE GESCHEITERT!',
        hc_fail_sub: 'Ein Fehler = Spielende im Hardcore-Modus!',

        // Item use toasts
        item_revealed: '{n} Feld enthüllt!',
        item_revealed_pl: '{n} Felder enthüllt!',
        item_cursed_reset: '☠️ VERFLUCHT! Das Brett wurde zurückgesetzt!',
        item_cursed_lucky: '☠️ Glück! 6 Felder enthüllt!',
        item_marked: '{n} leere Felder markiert!',
        item_demon_title: '👁️ DÄMONENAUGE AUSGELÖST!',
        item_demon_sub: 'Das verfluchte Item hat dein Schicksal besiegelt!',
        item_demon_shield: '👁️ Riskanter Schild aktiviert!',
        item_cursed_time_bad: '💀 VERFLUCHT! −4 Minuten!',
        item_cursed_time_good: '💀 Glück! +5 Minuten!',
        item_time_added: '+{n}s hinzugefügt!',
        item_freeze_msg: 'Timer eingefroren 30s!',
        item_shield_msg: 'Schild aktiv!',
        item_cursed_locked: '☠️ Verfluchte Items entsperren nach {n} weiteren Min.',
        item_discarded: 'Item verworfen',
        item_sell_btn: 'x',
        inv_cursed_locked_label: '🔒 GESPERRT {n}min',
        item_row_solved: 'Zeile vollständig enthüllt!',
        item_row_solved_none: 'Alle Zeilen bereits gelöst!',
        item_col_solved: 'Spalte vollständig enthüllt!',
        item_col_solved_none: 'Alle Spalten bereits gelöst!',
        item_mistake_erased: '{n} Fehler aus deiner Zählung gelöscht!',
        item_mistake_erased_none: 'Keine Fehler zum Löschen!',
        item_cursed_row_lucky: '🌊 Glück! {n} Zeile(n) enthüllt!',
        item_cursed_row_bad: '🌊 VERFLUCHT! {n} Zeile(n) gelöscht!',
        item_cursed_col_lucky: '🌪️ Glück! {n} Spalte(n) enthüllt!',
        item_cursed_col_bad: '🌪️ VERFLUCHT! {n} Spalte(n) gelöscht!',
        item_cursed_rowcol_lucky: '💥 JACKPOT! {r} Zeilen + {c} Spalten enthüllt!',
        item_cursed_rowcol_bad: '💥 CHAOS! {n} Zeilen/Spalten gelöscht!',
        item_artifact_complete: '🌟 KODEX aktiviert! Puzzle sofort gelöst!',
        item_primer_activated: "📜 Pfadfinder-Kompass aktiviert! Frage erscheint beim nächsten Level.",
        item_primer_headstart: "Vorsprung angewendet! 2 Zeilen + 2 Spalten vorgelöst.",

        item_cursed_reveal_both: '6 Felder enthüllt! Aber alle ✕-Markierungen gelöscht',
        item_cursed_time_both: '+20 Minuten, aber Zeilen - und Spaltenhinweise sind für 30s nicht sichtbar',
        item_cursed_shield_both: 'Schild aktiv + 2 Felder enthüllt! Zeilenhinweise sind für 30s nicht sichtbar',
        item_cursed_row_both: '🌊 {r} Zeile(n) enthüllt · {e} Zeile gelöscht!',
        item_cursed_col_both: '🌪️ {r} Spalte(n) enthüllt · {e} Spalte gelöscht!',
        item_cursed_rowcol_both: '💥 {r} Zeilen + {c} Spalten enthüllt! Spaltenhinweise sind für 45s nicht sichtbar.',

        // Inventory rarity labels
        rar_common: 'GEWÖHNLICH', rar_uncommon: 'UNGEWÖHNLICH', rar_rare: 'SELTEN',
        rar_legendary: 'LEGENDÄR', rar_cursed: 'VERFLUCHT',

        // Win overlay
        ov_win_pts: 'Punkte',
        ov_win_left: 'übrig',
        ov_win_multiplier: 'Multiplikator:',
        ov_win_solved_in: 'gelöst in',
        ov_win_mistake: 'Fehler',
        ov_win_mistakes: 'Fehler',
        ov_win_absorbed: 'absorbiert durch Schild/Fähigkeit',
        ov_win_new: 'neu',
        ov_win_best_was: 'Level Highscore:',
        ov_bonus_met: '🎯 BONUS ERFÜLLT!',
        ov_item_earned: '🎁 Gegenstand erhalten',
        ov_bonus_claimed_note: '✓ Bonusziel bereits geschafft.',
        ov_lucky_drop: '🍀 Glücksfund!',
        ov_quiz_reward: '🧠 Quiz-Belohnung',

        // Quiz overlay
        quiz_title: '⭐ BONUSFRAGE',
        quiz_correct: '✓ RICHTIG! +50 Punkte & Item Belohnung!',
        quiz_correct_claimed: '✓ Richtig!',
        quiz_wrong: '✗ Falsche Antwort. Kein Bonus.',
        quiz_continue: 'WEITER ▶',
        quiz_skip: 'SKIP',

        // Inventory strip header
        inv_strip_header: '🎒 INVENTAR - Links Klick um ein Item zu verwenden - Rechts Klick um ein Item zum Tausch-Stapel hinzuzufügen ',
        inv_strip_header_static: '🎒 INVENTAR',
        inv_strip_header_mouseover: 'Links Klick um ein Item zu verwenden - Rechts Klick um ein Item zum Tausch-Stapel hinzuzufügen',

        // Tutorial steps
        tut2_s0_title: 'Willkommen bei STOXELS!',
        tut2_s0_text: 'Dieses kurze Tutorial führt dich durch die Spieloberfläche. Nutze <strong>WEITER ▶</strong> oder überspringe es gleich.<br><br>STOXELS ist ein Nonogramm-Puzzle-Spiel zum Thema <strong> Stochastik & Statistik</strong>. Löse Puzzles, sammle Items, wähle eine Klasse, baue den Wahrscheinlichkeitsbaum aus und schalte Achievements für Moodle Badges frei!',

        tut2_s1_title: 'Der Spielbildschirm',
        tut2_s1_text: 'So sieht eine typische Spielsitzung aus:<br>• Ein <strong>Puzzlegitter</strong> in der Mitte<br>• <strong>Hinweiszahlen</strong> an Zeilen und Spalten<br>• Ein <strong>Timer</strong>, der herunterläuft<br>• Dein <strong>Inventar</strong> unten<br><br>Gehen wir jeden Bereich durch.',

        tut2_s2_title: 'Das Puzzlegitter',
        tut2_s2_text: '<strong>Linksklick</strong> füllt ein Feld.<br><strong>Rechtsklick</strong> markiert es als leer (✕).<br><strong>Ziehen</strong> malt mehrere Felder auf einmal.<br><br>Ein falsch gefülltes Feld kostet Zeit — also erst denken, dann klicken!',

        tut2_s3_title: 'Zeilenhinweise',
        tut2_s3_text: 'Die Zahlen <strong>links jeder Zeile</strong> zeigen, wie viele aufeinanderfolgende gefüllte Felder in dieser Zeile existieren und in welcher Reihenfolge.<br><br>Beispiel: <strong>1 1</strong> bedeutet 1 Feld, dann eine Lücke, dann wieder 1 Feld.',

        tut2_s4_title: 'Spaltenhinweise',
        tut2_s4_text: 'Die Zahlen <strong>über jeder Spalte</strong> funktionieren genauso — sie beschreiben Blöcke von oben nach unten.<br><br>Nutze Zeilen- und Spaltenhinweise zusammen, um die richtigen Felder zu bestimmen.',

        tut2_s5_title: 'Der Timer',
        tut2_s5_text: 'Du hast begrenzte Zeit für jedes Puzzle. Die Uhr startet sofort mit dem Level.<br><br>⚠️ <strong>Falsche Felder kosten Zeit!</strong> Jeder Fehler zieht Sekunden ab. Je schwerer der gewählte Schwierigkeitsgrad, desto größer die Strafe.<br><br>Der Timer wird bei 3 Minuten orange und bei 1 Minute rot.',

        tut2_s6_title: 'Strafen',
        tut2_s6_text: 'Bei einem falschen Feld:<br>• Das Feld wird <strong>rot ✕</strong><br>• Sekunden werden abgezogen<br>• Die Strafe wird kurz hier angezeigt<br><br>Bei <strong>Leicht</strong> sind Strafen klein. Bei <strong>Schwer</strong> brutal. <strong>Hardcore</strong> beendet das Level beim ersten Fehler!',

        tut2_s7_title: 'Bonusziel',
        tut2_s7_text: 'Jedes Level hat ein <strong>Bonusziel</strong> — z.B. unter 20 Sekunden fertig werden oder keine Fehler machen.<br><br>Ziel erreicht ➜ zufälliges Item als Belohnung, wenn du fertig bist.<br>Beim Typ <strong>Quiz</strong> gibt eine korrekte Antwort auf eine Statistikfrage +50 Punkte und ein Extra-Item.',

        tut2_s8_title: 'Inventar',
        tut2_s8_text: 'Hier werden deine Items angezeigt. <strong>Klicke ein Item um es zu benutzen</strong>.<br><br>Items umfassen:<br>• 🔦 <em>Enthüllen</em> — zeigt richtige Felder grün<br>• 🛡️ <em>Schild</em> — absorbiert den nächsten Fehler<br>• ⏳ <em>+Zeit</em> — fügt Sekunden hinzu<br>• ☠️ <em>Verflucht</em> — mächtig, aber riskant.<br><br><strong>Ironman</strong>-Modus deaktiviert alle Items für einen Punktebonus.',

        tut2_s9_title: 'Wahrscheinlichkeitsbaum',
        tut2_s9_text: 'Während du Abenteuer in der Welt von Stoxels bestreitest wirst du Punkte für den Wahrscheinlichkeitsbaum erhalten. Du kannst insgesamt bis zu 66 Punkte erhalten und kannst sie jederzeit zurückerstatten. Punkte können nur an adjazenten Knoten verteilt oder entfernt werden.',

        tut2_s10_title: 'Inferenz',
        tut2_s10_text: 'Schließe Inferenz - Aufgaben ab um Gegenstände und weitere Punkte für den Wahrscheinlichkeitsbaum zu erhalten!',

        tut2_s11_title: 'Klassen',
        tut2_s11_text: 'Schließe Aufstiegs - Level ab um eine Klasse zu wählen. Klassen haben Fähigkeiten die dir helfen können Puzzles zu lösen!',

        tut2_s12_title: '',
        tut2_s12_text: '',

        tut2_s13_title: '',
        tut2_s13_text: '',

        tut2_s14_title: '',
        tut2_s14_text: '',

        tut2_s15_title: '',
        tut2_s15_text: '',












        // Math gate modal
        mg_gate_badge: 'WAHRSCHEINLICHKEITSTOR',
        mg_instruction: 'Löse diese Aufgabe, um das Level freizuschalten:',
        mg_submit: 'PRÜFEN',
        mg_correct: '✓ Richtig! Level wird geöffnet…',
        mg_wrong: '✗ Nicht ganz. Versuch {n} — nochmals!',
        mg_not_a_number: '⚠ Bitte gib einen numerischen Wert ein.',
        mg_new_q: '🔄 ANDERE AUFGABE VERSUCHEN',
        mg_footer: 'Löse es einmal und das Level bleibt dauerhaft freigeschaltet.',

        ls_to_next: 'bis Code',
        ls_all_codes: 'Alle Codes freigeschaltet!',

        reset_close: '✕ SCHLIESSEN',
        reset_title: 'RESETTE DEINEN FORTSCHRITT',
        reset_body: 'Folgendes wird dauerhaft gelöscht:<br><strong style="color:var(--accent2)">· Alle abgeschlossenen Level<br>· Alle Highscores<br>· Alle Bonus-Erfolge<br>· Alle Inventar-Gegenstände<br>· Alle Moodle-Codes<br>· Deine ausgewählte Klasse<br>· Deine abgeschlossenen Inferenz-Aufgaben<br>· Deine gesammelten Konvergenz-Punkte</strong><br><br>Dein aktueller Spielstand geht verloren. Dies kann nicht rückgängig gemacht werden.',
        reset_confirm: '🗑 JA, ALLES LÖSCHEN',
        reset_cancel: 'ABBRECHEN',

        item_freeze_msg: '❄️ ZEITFRIEREN!',
        item_freeze_ended: '❄️ Zeitfrieren vorbei!',

        btn_inference: 'INFERENZ',
        tree: 'BAUM',

        mod_cl: 'KLASSENLOS',
        mod_tl: 'BAUMLOS',
        mod_desc_cl: 'Keine Klassenfähigkeiten',
        mod_desc_tl: 'Keine Baum-Effekte',

        setup_controls: 'STEUERUNG',
        axis_lock_label: '🔒 ACHSENSPERRE — Maus-Zug-Richtung auf aktuelle Zeile oder Spalte beschränken',

        btn_settings_close: '✕ SCHLIESSEN',

        // Settings Modal
        settings_title: 'EINSTELLUNGEN',
        settings_audio: 'AUDIO',
        settings_bgm: 'Hintergrundmusik',
        settings_sfx: 'Soundeffekte',
        settings_controls: 'STEUERUNG',
        settings_axis_lock: 'Achsensperre',
        settings_axis_lock_hint: 'Ziehen auf die Startzeile oder Startspalte beschränken',
        settings_qmark: 'Fragezeichen',
        settings_qmark_hint: 'Rechtsklick auf ein mit ✕ markiertes Feld fügt ein gelbes ? hinzu',
        stt_on: 'AN',
        stt_off: 'AUS',

        game_paused: 'SPIEL PAUSIERT',
        game_paused_hint: 'Esc zum Fortfahren',

        // Math Gate Units
        elements: 'Elemente',
        events: 'Ereignisse',
        outcomes: 'Ergebnisse',
        subsets: 'Teilmengen',
        elementary_events: 'Elementarereignisse',
        cards: 'Karten',
        meals: 'Menüs',
        passwords: 'Passwörter',
        ways: 'Möglichkeiten',
        combinations: 'Kombinationen',
        terms: 'Terme',
        paths: 'Pfade',

        mg_placeholder: 'Deine Antwort',

        codes_req_score: 'Benötigte Punkte:',
        codes_req_ach: 'Benötigte Erfolgsmeilensteine:',
        ls_tip_optimize: 'Auf Schwer mit allen Modifikatoren geschafft, aber wenn du das Level schneller schaffst kannst du noch mehr Punkte bekommen!',

        convergence: 'Konvergenz',
        convergence_desc_1: 'Du hast einen Meilenstein erreicht und 1 Konvergenzpunkt erhalten.',
        convergence_open_tree: '🌿 Wahrscheinlichkeitsbaum öffnen',
        convergence_next_level: '▶ Nächstes Level',
        convergence_level_select: '☰ Level wählen',

        settings_touchpad: 'Touchpad-Modus',
        settings_touchpad_hint: 'Fügt einen Button hinzu, der Linksklick zwischen Füllen und Markieren umschaltet',
        touchpad_btn_fill: '🖊️ FÜLLEN',
        touchpad_btn_mark: '✕ MARKIEREN',


        reset_item_levels: 'Alle abgeschlossenen Level',
        reset_item_highscores: 'Alle Highscores',
        reset_item_bonus: 'Alle Bonus-Erfolge',
        reset_item_inventory: 'Alle Inventar-Gegenstände',
        reset_item_codes: 'Alle Moodle-Codes',
        reset_item_class: 'Deine ausgewählte Klasse',
        reset_item_inference: 'Deine abgeschlossenen Inferenz-Aufgaben',
        reset_item_convergence: 'Deine gesammelten Konvergenz-Punkte',
        reset_note_1: 'Dies wird deine gesammelten Erfolge NICHT zurücksetzen.',
        reset_note_2: 'Dein aktueller Spielstand geht verloren. Dies kann nicht rückgängig gemacht werden.',

    }
};
















