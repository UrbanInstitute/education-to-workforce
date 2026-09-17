<!-- A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review. -->

<!-- @component
Timeframe + disaggregate dropdown row shared by the EQ and all-data card sections
(requirements §3.11; mockups 2, 6, 7, 8). Value + callback props rather than bindables:
the EQ section's values are ToolState-derived URL params written via setTimeframe/
setDisagg, while the all-data section (Phase 7) passes local $state setters.
-->
<script>
  import { logClickToGA } from "@urbaninstitute/dataviz-components";
  import BasicDropdown from "$components/BasicDropdown.svelte";
  import pageContent from "$data/archie-ml/page-tool.aml";
  import disaggregates from "$data/metadata/disaggregates.json";
  import { DROPDOWN_WIDTH } from "$utils/consts";

  /**
   * @typedef {Object} Props
   * @property {string} idPrefix - unique control-id prefix per section (e.g. "eq", "all-data")
   * @property {string} timeframe - "recent" | "all"
   * @property {string} disagg - "none" or a disaggregate prefix ("d1"…)
   * @property {{ value: string, label: string }[]} timeframeOptions - from timeframe.aml
   * @property {(value: string) => void} onTimeframe
   * @property {(value: string) => void} onDisagg
   */

  /** @type {Props} */
  let { idPrefix, timeframe, disagg, timeframeOptions, onTimeframe, onDisagg } = $props();

  const disaggOptions = [
    { value: "none", label: pageContent.filters.disaggNone },
    ...disaggregates.map((d) => ({ value: `d${d.prefix}`, label: d.category_name }))
  ];

  /** @param {Event} e */
  const selectValue = (e) => /** @type {HTMLSelectElement} */ (e.currentTarget).value;
</script>

<div class="section-filters">
  <div class="filter-group">
    <span class="filter-label">{pageContent.filters.timeframe}</span>
    <BasicDropdown
      id="{idPrefix}-timeframe"
      inlineLabel={pageContent.filters.timeframe}
      placeholder={null}
      data={timeframeOptions}
      value={timeframe}
      dropdownWidth={DROPDOWN_WIDTH}
      onchange={(e) => {
        onTimeframe(selectValue(e));
        logClickToGA(/** @type {*} */ (e.currentTarget), "tool-timeframe-dropdown");
      }}
    />
  </div>
  <div class="filter-group">
    <span class="filter-label">{pageContent.filters.disaggregate}</span>
    <BasicDropdown
      id="{idPrefix}-disagg"
      inlineLabel={pageContent.filters.disaggregate}
      placeholder={null}
      data={disaggOptions}
      value={disagg}
      dropdownWidth={DROPDOWN_WIDTH}
      onchange={(e) => {
        onDisagg(selectValue(e));
        logClickToGA(/** @type {*} */ (e.currentTarget), "tool-disagg-dropdown");
      }}
    />
  </div>
</div>

<style>
  .section-filters {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-4) var(--spacing-6);
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .filter-label {
    font-size: var(--font-size-small);
    text-transform: uppercase;
    color: var(--color-gray-shade-darker);
  }
</style>
