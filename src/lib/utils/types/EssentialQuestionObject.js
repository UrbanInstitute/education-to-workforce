// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

/**
 * @typedef {Object} EssentialQuestionObject
 * @property {string} full_question - The full essential question
 * @property {number} geo_counties - The number of indicators that have data for counties
 * @property {number} geo_states - The number of indicators that have data for states
 * @property {number} geo_tracts - The number of indicators that have data for tracts
 * @property {number} geo_school_districts - The number of indicators that have data for school districts
 * @property {string} id - The essential question ID
 * @property {string[]} indicator_list - The indicator IDs associated with the essential question
 * @property {string} [learn_more_intro] - "About this Essential Question" opening sentence (HTML)
 * @property {string} [learn_more_use] - "About this Essential Question" closing sentence (HTML)
 * @property {string} shorthand - The short version of the essential question
 * @property {number} total_indicators - The total number of indicators associated with the essential question.
 *   Sourced from a different workbook sheet than `indicator_list` and disagrees with it for six EQs —
 *   use `indicator_list.length` for anything user-facing (dev-plan appendix H)
 */
module.exports = {};
