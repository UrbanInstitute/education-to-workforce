// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

/**
 * @param {string} textTemplate - The raw template to be formatted. Any replaceable variables should be wrapped in double curly-braces like: {{variableName}}
 * @param {Object<string, string>} variables - An object with keys that match the replaceable variables in the template, and values that represent the final output string to replace them with.
 * @param {string} [fallback=""] - The fallback string to use when a variable is not available. Defaults to an empty string.
 * @returns {string} The formatted template with all variables replaced with provided values or the fallback string.
 */
export function formatDynamicText(textTemplate, variables, fallback = "") {
  const templateMatches = textTemplate.matchAll(/{{(.*?)}}/g);
  let result = textTemplate;
  for (let match of templateMatches) {
    const variableName = match[1];
    // function form: a `$&`/`$$`/`$1` sequence in a value is a substitution pattern to
    // String.replace's string form, which would corrupt the output
    const replacement = Object.keys(variables).includes(variableName)
      ? variables[variableName]
      : fallback;
    result = result.replace(match[0], () => replacement);
  }
  return result;
}
