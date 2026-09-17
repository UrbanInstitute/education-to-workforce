// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

import { formatDynamicText } from "$utils/dynamicText";

/**
 * The "{n} metrics across {m} indicators of success" phrase, shared by the EQ heading, the
 * all-data subtitle and the unavailable-data heading (settled 2026-08-20: all three read the
 * same way).
 *
 * The two nouns pluralize **independently**. They used to share one singular template chosen
 * on a single count, which reads wrong whenever the counts disagree — a real case, not a
 * hypothetical: American Samoa, Guam, the Northern Marianas and Puerto Rico each have an
 * essential question whose only indicator with data carries several metrics, so the heading
 * rendered "2 metric across 1 indicator of success".
 *
 * @typedef {Object} AvailabilityContent - page-tool.aml {availability}
 * @property {string} template - leads with the metric count
 * @property {string} templateNoCount - omits it, for the layout that renders the number separately
 * @property {string} metricNoun
 * @property {string} metricNounSingular
 * @property {string} indicatorNoun
 * @property {string} indicatorNounSingular
 */

/**
 * @param {number} metricCount
 * @param {number} indicatorCount
 * @param {AvailabilityContent} content
 * @param {{ leadWithCount?: boolean }} [options] - false where the count renders as its own
 *   element beside the sentence (the unavailable-data heading's large number)
 * @returns {string}
 */
export function formatCountPhrase(metricCount, indicatorCount, content, options = {}) {
  const { leadWithCount = true } = options;
  return formatDynamicText(leadWithCount ? content.template : content.templateNoCount, {
    metricCount: `${metricCount}`,
    metricNoun: metricCount === 1 ? content.metricNounSingular : content.metricNoun,
    indicatorCount: `${indicatorCount}`,
    indicatorNoun: indicatorCount === 1 ? content.indicatorNounSingular : content.indicatorNoun
  });
}

/**
 * Pick the verb form that agrees with the metric count — "metrics" is the subject of every
 * sentence this phrase leads.
 *
 * @param {number} metricCount
 * @param {string} plural
 * @param {string} singular
 * @returns {string}
 */
export function agreeWithMetrics(metricCount, plural, singular) {
  return metricCount === 1 ? singular : plural;
}
