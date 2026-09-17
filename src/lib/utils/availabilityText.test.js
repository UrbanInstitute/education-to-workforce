// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

import { describe, it, expect } from "vitest";
import { formatCountPhrase, agreeWithMetrics } from "./availabilityText";
import pageContent from "$data/archie-ml/page-tool.aml";

const content = pageContent.availability;

/**
 * Expectations are built from the same content the code reads, so rewording the templates
 * or the nouns in page-tool.aml can never fail these tests. What they pin is the behavior:
 * which template and which noun/verb form get picked for a given pair of counts. The
 * {{...}} substitution itself is covered by dynamicText.test.js.
 *
 * @param {string} template
 * @param {Object<string, string | number>} vars
 */
const fill = (template, vars) =>
  Object.entries(vars).reduce(
    (text, [key, value]) => text.replaceAll(`{{${key}}}`, `${value}`),
    template
  );

/**
 * Independent restatement of the noun agreement rule — each noun follows its own count.
 * @param {number} metricCount
 * @param {number} indicatorCount
 * @param {{ leadWithCount?: boolean }} [options]
 */
const expected = (metricCount, indicatorCount, { leadWithCount = true } = {}) =>
  fill(leadWithCount ? content.template : content.templateNoCount, {
    metricCount,
    metricNoun: metricCount === 1 ? content.metricNounSingular : content.metricNoun,
    indicatorCount,
    indicatorNoun: indicatorCount === 1 ? content.indicatorNounSingular : content.indicatorNoun
  });

describe("formatCountPhrase", () => {
  it("pluralizes both nouns when both counts are plural", () => {
    expect(formatCountPhrase(8, 3, content)).toBe(expected(8, 3));
    expect(formatCountPhrase(8, 3, content)).toContain(content.metricNoun);
    expect(formatCountPhrase(8, 3, content)).toContain(content.indicatorNoun);
  });

  it("singularizes both nouns when both counts are 1", () => {
    expect(formatCountPhrase(1, 1, content)).toBe(expected(1, 1));
    expect(formatCountPhrase(1, 1, content)).toContain(content.metricNounSingular);
    expect(formatCountPhrase(1, 1, content)).toContain(content.indicatorNounSingular);
  });

  it("pluralizes each noun on its own count", () => {
    // the case the single shared singular template got wrong — real data: American Samoa,
    // Guam, the Northern Marianas and Puerto Rico each have an EQ whose only indicator with
    // data carries several metrics
    expect(formatCountPhrase(2, 1, content)).toBe(expected(2, 1));
    expect(formatCountPhrase(1, 2, content)).toBe(expected(1, 2));
    // the two nouns really do disagree here, whatever the wording is
    expect(formatCountPhrase(2, 1, content)).toContain(content.metricNoun);
    expect(formatCountPhrase(2, 1, content)).toContain(content.indicatorNounSingular);
  });

  it("omits the leading count when the layout renders it separately", () => {
    expect(formatCountPhrase(4, 2, content, { leadWithCount: false })).toBe(
      expected(4, 2, { leadWithCount: false })
    );
    expect(formatCountPhrase(1, 1, content, { leadWithCount: false })).toBe(
      expected(1, 1, { leadWithCount: false })
    );
    // the count leads the with-count form and not this one
    expect(formatCountPhrase(4, 2, content, { leadWithCount: false })).not.toMatch(/^4\b/);
    expect(formatCountPhrase(4, 2, content)).toMatch(/^4\b/);
  });
});

describe("agreeWithMetrics", () => {
  it("agrees with the metric count, not the indicator count", () => {
    expect(agreeWithMetrics(1, content.availableSuffix, content.availableSuffixSingular)).toBe(
      content.availableSuffixSingular
    );
    expect(agreeWithMetrics(3, content.availableSuffix, content.availableSuffixSingular)).toBe(
      content.availableSuffix
    );
  });
});

describe("the EQ heading and the all-data subtitle read identically", () => {
  it("builds the same sentence from the same content for the same counts", () => {
    const sentence = (/** @type {number} */ m, /** @type {number} */ i) =>
      `${formatCountPhrase(m, i, content)} ${agreeWithMetrics(m, content.availableSuffix, content.availableSuffixSingular)}`;
    expect(sentence(68, 29)).toBe(`${expected(68, 29)} ${content.availableSuffix}`);
    expect(sentence(1, 1)).toBe(`${expected(1, 1)} ${content.availableSuffixSingular}`);
  });
});
