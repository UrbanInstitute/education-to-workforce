// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

/**
 * Append a trailing period to a source/notes line unless it already ends in terminal
 * punctuation. The inputs are HTML strings (rendered with {@html}) and may end in a tag
 * such as `</a>`, so we ignore trailing tags and whitespace when checking the last
 * visible character, then append the period after the original markup.
 *
 * @param {string | null | undefined} html - The source/notes HTML string.
 * @returns {string} The string with a single trailing period, or the original unchanged.
 */
export const withTerminalPeriod = (html) => {
  if (!html) {
    return html ?? "";
  }
  // Drop trailing whitespace and any trailing HTML tags to find the last visible glyph.
  const visible = html.replace(/(\s|<[^>]*>)+$/g, "");
  if (visible === "" || /[.!?]$/.test(visible)) {
    return html;
  }
  return html.trimEnd() + ".";
};
