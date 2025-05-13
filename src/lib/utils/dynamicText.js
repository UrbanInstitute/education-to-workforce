/**
 * @param {string} textTemplate - The raw template to be formatted. Any replaceable variables should be wrapped in double curly-braces like: {{variableName}}
 * @param {Object<string, string>} variables - An object with keys that match the replaceable variables in the template, and values that represent the final output string to replace them with.
 * @param {string} [fallback=""] - The fallback string to use when a variable is not available. Defaults to an empty string.
 * @returns {string} The formatted template with all variables replaced with provided values or the fallback string.
 */
export function formatDynamicText(textTemplate, variables, fallback = "") {
  const templateMatches = textTemplate.matchAll(/{{(.*?)}}/g);
  let result = textTemplate;
  for ( let match of templateMatches) {
    const variableName = match[1];
    if (Object.keys(variables).includes(variableName)) {
      const variableValue = variables[variableName];
      result = result.replace(match[0], variableValue);
    } else {
      result = result.replace(match[0], fallback);
    }
  };
  return result;
}
