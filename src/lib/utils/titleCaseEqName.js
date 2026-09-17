// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

/**
 * Words that stay lowercase inside a title (AP style: conjunctions, articles and
 * prepositions of three letters or fewer). Only ever applied mid-title — the first and
 * last words are always capitalized.
 */
const MINOR_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "but",
  "by",
  "for",
  "in",
  "nor",
  "of",
  "on",
  "or",
  "the",
  "to",
  "up",
  "via"
]);

/**
 * Capitalize the first letter and leave the rest alone, so intentional casing inside a
 * word survives ("pre-K" → "Pre-K", not "Pre-k").
 * @param {string} word
 * @returns {string}
 */
const capitalize = (word) => word.charAt(0).toUpperCase() + word.slice(1);

/**
 * Both halves of a hyphenated compound are capitalized ("full-day" → "Full-Day").
 * @param {string} word
 * @returns {string}
 */
const capitalizeCompound = (word) => word.split("-").map(capitalize).join("-");

/**
 * Title-case an essential question's shorthand name.
 *
 * The EQ shorthands are authored in sentence case in essential-questions.aml, which is how
 * the EQ dropdown reads them. Everywhere the name is a label rather than a list option —
 * the heading above the map, the metrics filter lead, the unavailable-data heading — the
 * copy desk wants title case (requested 2026-08-21). Transforming at the display sites
 * keeps one authored string in the content file instead of two that can drift.
 *
 * @param {string | undefined} name
 * @returns {string} title-cased name, or "" when there is no name to case
 */
export function titleCaseEqName(name) {
  if (!name) return "";
  const words = name.split(" ");
  return words
    .map((word, index) => {
      const isMinor = MINOR_WORDS.has(word.toLowerCase());
      const isFirstOrLast = index === 0 || index === words.length - 1;
      return isMinor && !isFirstOrLast ? word.toLowerCase() : capitalizeCompound(word);
    })
    .join(" ");
}
