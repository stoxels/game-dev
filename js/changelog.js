//------------------------------------------------------------------------
//-------------------CONSTANTS & DATA-------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Version history shown in the Changelog modal, newest first.
// Each version has a list of category groups (translation keys, e.g.
// 'cl_cat_bf'), each holding a flat list of change-note translation keys
// resolved via t() at render time (see _buildCategoryGroupHtml below).
const CHANGELOG_DATA = [

    {
        version: "v0.27 BETA",
        date: "22.08.2026",
        changes: [
            {
                category: "cl_cat_nf",
                items: [
                    "cl_27_1", "cl_27_2", "cl_27_3", "cl_27_4", "cl_27_5",
                    "cl_27_6", "cl_27_7", "cl_27_8", "cl_27_9", "cl_27_10",
                    "cl_27_11", "cl_27_12", "cl_27_13", "cl_27_14", "cl_27_15",
                    "cl_27_16", "cl_27_17", "cl_27_18",
                    "cl_27_63", "cl_27_64",
                    "cl_27_66", "cl_27_67", "cl_27_68", "cl_27_69", "cl_27_70",
                    "cl_27_74",
                ],

            },
            {
                category: "cl_cat_ga",
                items: [
                    "cl_27_19", "cl_27_20", "cl_27_21", "cl_27_22", "cl_27_23",
                    "cl_27_24", "cl_27_25", "cl_27_26", "cl_27_27", "cl_27_28",
                    "cl_27_29", "cl_27_30", "cl_27_31", "cl_27_32", "cl_27_33",
                    "cl_27_34", "cl_27_35", "cl_27_36", "cl_27_37", "cl_27_38",
                ],

            },

            {
                category: "cl_cat_cc",
                items: [
                    "cl_27_39", "cl_27_40", "cl_27_41", "cl_27_42", "cl_27_43", "cl_27_44",
                    "cl_27_71",
                ],

            },
            {
                category: "cl_cat_bf",
                items: [
                    "cl_27_45", "cl_27_46", "cl_27_47", "cl_27_48", "cl_27_49",
                    "cl_27_50", "cl_27_51", "cl_27_52", "cl_27_53", "cl_27_54",
                    "cl_27_55", "cl_27_56", "cl_27_57", "cl_27_58", "cl_27_59",
                    "cl_27_60", "cl_27_61", "cl_27_62",
                    "cl_27_65",
                    "cl_27_72", "cl_27_73", "cl_27_75",
                ],

            },


        ],


    },

    {
        version: "v0.26 BETA",
        date: "13.07.2026",
        changes: [
            {
                category: "cl_cat_nf",
                items: [
                    "cl_26_1", "cl_26_2", "cl_26_3", "cl_26_4", "cl_26_5",
                ],

            },
            {
                category: "cl_cat_ga",
                items: [
                    "cl_26_6", "cl_26_7", "cl_26_8", "cl_26_9", "cl_26_10",
                    "cl_26_11", "cl_26_12", "cl_26_13", "cl_26_14", "cl_26_15",
                ],

            },
            {
                category: "cl_cat_bf",
                items: [
                    "cl_26_16", "cl_26_17", "cl_26_18", "cl_26_19", "cl_26_20", "cl_26_21",
                ],

            },


        ],


    },


    {
        version: "v0.25.1 BETA",
        date: "09.07.2026",
        changes: [
            {
                category: "cl_cat_nf",
                items: [
                    "cl_251_1", "cl_251_2",
                ],

            },
            {
                category: "cl_cat_ga",
                items: [
                    "cl_251_3", "cl_251_4", "cl_251_5", "cl_251_6", "cl_251_7",
                ],

            },
            {
                category: "cl_cat_bf",
                items: [
                    "cl_251_8", "cl_251_9",
                ],

            },


        ],


    },


    {
        version: "v0.25 BETA - CARTOGRAPHERS OF CHANCE Expansion",
        date: "06.07.2026",
        changes: [
            {
                category: "cl_cat_nf",
                items: [
                    "cl_25_1", "cl_25_2", "cl_25_3", "cl_25_4", "cl_25_5",
                    "cl_25_6", "cl_25_7", "cl_25_8", "cl_25_9", "cl_25_10",
                    "cl_25_11", "cl_25_12", "cl_25_13", "cl_25_14", "cl_25_15",
                    "cl_25_16", "cl_25_17", "cl_25_18", "cl_25_19", "cl_25_20",
                    "cl_25_21", "cl_25_22", "cl_25_23", "cl_25_24", "cl_25_25",
                    "cl_25_26",
                ],
            },

            {
                category: "cl_cat_ga",
                items: [
                    "cl_25_27", "cl_25_28", "cl_25_29", "cl_25_30", "cl_25_31",
                    "cl_25_32", "cl_25_33", "cl_25_34", "cl_25_35", "cl_25_36",
                    "cl_25_37", "cl_25_38", "cl_25_39", "cl_25_40", "cl_25_41",
                    "cl_25_42", "cl_25_43", "cl_25_44",
                ],
            },

            {
                category: "cl_cat_bf",
                items: [
                    "cl_25_45", "cl_25_46", "cl_25_47", "cl_25_48",
                ],


            }



        ],


    },
    {
        version: "v0.24 BETA",
        date: "08.06.2026",
        changes: [
            {
                category: "cl_cat_nf",
                items: [
                    "cl_24_1", "cl_24_2", "cl_24_3", "cl_24_4", "cl_24_5",
                ],
            },
            {
                category: "cl_cat_ga",
                items: [
                    "cl_24_6", "cl_24_7", "cl_24_8", "cl_24_9", "cl_24_10",
                    "cl_24_11", "cl_24_12", "cl_24_13", "cl_24_14", "cl_24_15",
                    "cl_24_16", "cl_24_17", "cl_24_18", "cl_24_19", "cl_24_20",
                    "cl_24_21", "cl_24_22",
                ],
            },
            {
                category: "cl_cat_cc",
                items: [
                    "cl_24_23", "cl_24_24", "cl_24_25", "cl_24_26", "cl_24_27",
                    "cl_24_28", "cl_24_29", "cl_24_30", "cl_24_31", "cl_24_32",
                    "cl_24_33",
                ],
            },
            {
                category: "cl_cat_pt",
                items: [
                    "cl_24_34", "cl_24_35", "cl_24_36", "cl_24_37", "cl_24_38",
                    "cl_24_39", "cl_24_40", "cl_24_41", "cl_24_42", "cl_24_43",
                    "cl_24_44",
                ],
            },
            {
                category: "cl_cat_bf",
                items: [
                    "cl_24_45", "cl_24_46", "cl_24_47", "cl_24_48", "cl_24_49",
                ],
            }
        ]
    }
];


//------------------------------------------------------------------------
//-------------------CHANGELOG RENDERING----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Renders one category group (e.g. "Bug Fixes") as a labeled <ul> block.
// Category labels and items are translation keys resolved via t().
function _buildCategoryGroupHtml(group) {
    const items = group.items
        .map(item => `<li>${t(item)}</li>`)
        .join("");

    return `
        <div class="cl-category-group">
            <div class="cl-category-label">${t(group.category)}</div>
            <ul class="cl-list">${items}</ul>
        </div>`;
}

// Renders one full version entry (header + all its category groups).
function _buildVersionBlockHtml(update) {
    const categoryGroupsHtml = update.changes
        .map(_buildCategoryGroupHtml)
        .join("");

    return `
        <div class="cl-version-block">
            <div class="cl-header">
                <span class="cl-version-num">${update.version}</span>
                <span class="cl-date">${update.date}</span>
            </div>
            ${categoryGroupsHtml}
        </div>`;
}

// Renders the full changelog into the DOM. Re-renders every time so a
// mid-session language switch is reflected on the next modal open.
function renderChangelog() {
    const container = document.getElementById("changelog-content");

    container.innerHTML = CHANGELOG_DATA
        .map(_buildVersionBlockHtml)
        .join("");
}


//------------------------------------------------------------------------
//-------------------CHANGELOG MODAL--------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Opens the changelog modal, rendering its content first if needed.
function openChangelog() {
    renderChangelog();
    document.getElementById("changelog-modal").classList.add("show");
}