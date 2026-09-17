// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

import { format } from "d3-format";

/** @type {Record<string, string>} */
const FORMATS = {
  percent: ".1%",
  percent_hundredths: ".2%",
  currency: "$,.0f",
  integer: ",.0f",
  numeric: ",.1f",
  hundredths: ",.2f",
  percent_axis: ".0%",
  percent_hundredths_axis: ".2%",
  currency_axis: "$,.2s",
  numeric_axis: ",.0f",
  hundredths_axis: ",.2f",
  // Map-legend ticks only. The threshold legend gives each of its 5 buckets ~56px, so a
  // label wider than that collides with its neighbour (2026-09-02 design review). These
  // three types are the ones that overflowed: "$270,400", "22,899.0", "119.23%". Every
  // other type is already narrow enough, and compacting them further produced *duplicate*
  // tick labels on real shards (percent: "11% | 11%", hundredths: "0.1 | 0.1"), so they
  // fall through to the value format. Checked against all committed map shards: with
  // these three, no metric at any level has two ticks that format alike.
  percent_hundredths_legend: ".1%",
  currency_legend: "$.3~s",
  numeric_legend: ",.0f"
};
/**
 * @param {number | null | undefined} d - The number to format (null/undefined → "N/A")
 * @param {string | undefined} formatType - The format type to use. Currently supports "percent","percent negative", "currency", and undefined for "numeric"
 * @returns {string} The formatted number as a string
 */
export const formatFun = (d, formatType) => {
  if (d === null || d === undefined) {
    return "N/A";
  }
  const formatString = (formatType && FORMATS[formatType]) || FORMATS.numeric;
  return format(formatString)(d);
};

/**
 * Uppercase the SI "kilo" suffix on currency output so thousands read "$24.8K" rather
 * than d3-format's lowercase "$24.8k". Only currency types use the SI (`s`/`~s`) format,
 * and only the kilo prefix is lowercase (M/G/T are already uppercase), so a trailing `k`
 * is unambiguous.
 * @param {string} formatted
 * @param {string | undefined} formatType
 * @returns {string}
 */
const capitalizeCurrencyThousands = (formatted, formatType) =>
  formatType && formatType.startsWith("currency") ? formatted.replace(/k$/, "K") : formatted;

/**
 * @param {number | null | undefined} d - The number to format (null/undefined → "N/A")
 * @param {string | undefined} formatType - The format type to use. Currently supports "percent","percent negative", "currency", and undefined for "numeric"
 * @returns {string} The formatted number as a string
 */
export const formatFunAxis = (d, formatType) => {
  if (d === null || d === undefined) {
    return "N/A";
  }
  const formatKey = formatType + "_axis";
  const formatString = FORMATS[formatKey] || FORMATS.numeric_axis;
  return capitalizeCurrencyThousands(format(formatString)(d), formatType);
};

/**
 * Map-legend tick format: the value format for most types, a narrower one for the few
 * that overflow the legend's tick spacing (see the `_legend` entries above). Precision is
 * only reduced here — cards, tooltips and tables keep formatFun.
 * @param {number | null | undefined} d - The number to format (null/undefined → "N/A")
 * @param {string | undefined} formatType - The metric_type to format for
 * @returns {string} The formatted number as a string
 */
export const formatFunLegend = (d, formatType) => {
  if (d === null || d === undefined) {
    return "N/A";
  }
  const compact = formatType && FORMATS[`${formatType}_legend`];
  return compact
    ? capitalizeCurrencyThousands(format(compact)(d), formatType)
    : formatFun(d, formatType);
};
