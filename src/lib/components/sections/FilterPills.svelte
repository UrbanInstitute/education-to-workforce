<!-- A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review. -->

<!-- @component
Sector/type/domain filter dropdown + removable pill tags for the all-data section
(requirements §3.14; mockups 2, 6). Markup/CSS ported from the v1 map page. Value +
callback props rather than bindables, matching SectionFilters — the section owns the
local $state and resets the pill values when the filter dimension changes.
-->
<script>
  import { logClickToGA } from "@urbaninstitute/dataviz-components";
  import BasicDropdown from "$components/BasicDropdown.svelte";
  import { DROPDOWN_WIDTH } from "$utils/consts";

  /**
   * @typedef {Object} Props
   * @property {string} idPrefix - unique control-id prefix (e.g. "all-data")
   * @property {Array<{ value: string, label: string, selections: Array<{ value: string, label: string }> }>} filters - from page-tool.aml `{allData}.filterBy`
   * @property {string} label - "Filter by" label text
   * @property {string} selectedFilter - active dimension ("sector" | "type" | "domain")
   * @property {string[]} selectedFilterValues - active pill values
   * @property {(value: string) => void} onFilter
   * @property {(values: string[]) => void} onValues
   */

  /** @type {Props} */
  let { idPrefix, filters, label, selectedFilter, selectedFilterValues, onFilter, onValues } =
    $props();

  let pills = $derived(filters.find((d) => d.value === selectedFilter)?.selections ?? []);

  /** @param {string} value */
  function togglePill(value) {
    onValues(
      selectedFilterValues.includes(value)
        ? selectedFilterValues.filter((d) => d !== value)
        : [...selectedFilterValues, value]
    );
  }
</script>

<div class="filter-pills">
  <span class="filter-label">{label}</span>
  <BasicDropdown
    id="{idPrefix}-filter-by"
    inlineLabel={label}
    placeholder={null}
    data={filters.map((d) => ({ value: d.value, label: d.label }))}
    value={selectedFilter}
    dropdownWidth={DROPDOWN_WIDTH}
    onchange={(e) => {
      onFilter(/** @type {HTMLSelectElement} */ (e.currentTarget).value);
      logClickToGA(/** @type {*} */ (e.currentTarget), "tool-filter-dropdown");
    }}
  />
  <div class="filter-pill-container">
    {#each pills as { value, label: pillLabel } (value)}
      <label class="filter-pill">
        <input
          type="checkbox"
          {value}
          checked={selectedFilterValues.includes(value)}
          onchange={(e) => {
            togglePill(value);
            logClickToGA(/** @type {*} */ (e.currentTarget), "tool-filter-pill-toggle");
          }}
        />
        <div>
          <span>{pillLabel}</span>
          {#if selectedFilterValues.includes(value)}
            <!-- decorative: the checkbox already carries the checked state -->
            <span class="deselect" aria-hidden="true">x</span>
          {/if}
        </div>
      </label>
    {/each}
  </div>
</div>

<style>
  .filter-pills {
    border-top: solid 1px var(--color-gray);
    padding-block: var(--spacing-6);
    margin-top: var(--spacing-6);
  }

  .filter-label {
    display: block;
    margin-bottom: var(--spacing-2);
    font-size: var(--font-size-small);
    text-transform: uppercase;
    color: var(--color-gray-shade-darker);
  }

  .filter-pill-container {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-3);
    margin-top: var(--spacing-4);
    margin-bottom: var(--spacing-2);
  }

  /* Hiding class, making content visible only to screen readers but not visually
   * https://css-tricks.com/inclusively-hidden/
   */
  label.filter-pill input[type="checkbox"] {
    appearance: none;
    -webkit-appearance: none;
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    height: 1px;
    overflow: hidden;
    position: absolute;
    white-space: nowrap;
    width: 1px;
  }

  label.filter-pill {
    cursor: pointer;
    padding: var(--spacing-2) var(--spacing-4);
    border-radius: 0.3125rem;
    font-weight: var(--font-weight-bold);
    font-size: var(--font-size-normal);
    color: var(--color-gray-shade-dark);
    background-color: var(--color-gray-shade-lightest);
    border: 1px solid var(--color-gray-shade-medium, #dcdbdb);
  }

  label.filter-pill div {
    display: inline-flex;
    gap: var(--spacing-3);
  }

  label.filter-pill:has(input[type="checkbox"]:checked) {
    border: 1px solid var(--color-blue-shade-light, #a2d4ec);
    color: var(--color-gray-shade-darkest);
    background-color: var(--color-blue-shade-lightest, #cfe8f3);
  }

  label.filter-pill:has(input[type="checkbox"]:focus-visible) {
    outline: 2px solid var(--color-blue, #1696d2);
    outline-offset: 2px;
  }
</style>
