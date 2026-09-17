// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

/**
 * Filter + sort indicators for the all-data section's sector/type/domain pills.
 * Port of the logic inlined in the v1 map page (`map/[slug]/+page.svelte`), pure so
 * the pill wiring stays testable outside the component.
 *
 * @param {import("$utils/types/IndicatorObject.js").IndicatorObject[]} indicators - annotated indicators (ToolState.allIndicators)
 * @param {string} selectedFilter - active filter dimension ("sector" | "type" | "domain")
 * @param {string[] | undefined} selectedFilterValues - active pill values for that dimension
 * @param {Array<{ value: string, label: string, selections: Array<{ value: string, label: string }> }>} filterBy - filter definitions from page-tool.aml `{allData}.filterBy`
 * @returns {import("$utils/types/IndicatorObject.js").IndicatorObject[]}
 */
const filterIndicators = (indicators, selectedFilter, selectedFilterValues, filterBy) => {
  const values = selectedFilterValues ?? [];

  if (selectedFilter === "sector") {
    // an indicator can belong to several sectors; keep any match, most matches first
    const matchCount = (/** @type {*} */ ind) =>
      values.filter((val) => ind[`sector_${val}`] == true).length;
    return indicators
      .filter((ind) => matchCount(ind) > 0)
      .sort((a, b) => matchCount(b) - matchCount(a));
  }

  if (selectedFilter === "type" || selectedFilter === "domain") {
    // single numeric field per indicator; sort follows the aml selection order
    const selections = filterBy.find((d) => d.value === selectedFilter)?.selections ?? [];
    const sortOrder = selections.map((d) => +d.value);
    const numericValues = values.map((d) => +d);
    return indicators
      .filter((ind) => numericValues.includes(/** @type {*} */ (ind)[selectedFilter]))
      .sort(
        (a, b) =>
          sortOrder.indexOf(/** @type {*} */ (a)[selectedFilter]) -
          sortOrder.indexOf(/** @type {*} */ (b)[selectedFilter])
      );
  }

  return indicators;
};

export default filterIndicators;
