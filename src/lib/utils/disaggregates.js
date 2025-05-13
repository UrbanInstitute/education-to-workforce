import disaggregateMetadata from "$data/metadata/disaggregates.json";

/**
 * Looks up the disaggregate metadata based on the id
 * @param {string} number
 * @returns {import("$utils/types/DisaggregateMetadata").DisaggregateMetadata | undefined}
 */
export function getDisaggregateMeta(id) {
  return disaggregateMetadata?.find((d) => +d.prefix === id);
}

/**
 * Looks up the disaggregate label based on the prefix
 *@param { string } prefix
 *@returns { string | undefined }
 */
export function getDisaggregateLabel(prefix) {
  const id = prefix.replace("d", "");
  const disaggregate = getDisaggregateMeta(prefix);
  return disaggregate?.fields.find((field) => field.value == id)?.label;
}
