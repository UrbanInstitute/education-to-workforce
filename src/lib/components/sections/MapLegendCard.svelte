<!-- A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review. -->

<script>
  import { getContext } from "svelte";
  // vendored, not @urbaninstitute/dataviz-components/maps: see the note in that file —
  // 0.12.4's ColorLegend renders one NaN-attribute pass per mount
  import ColorLegend from "$components/ColorLegend.svelte";
  import { urbanColors } from "@urbaninstitute/dataviz-components/utils";
  import { logClickToGA } from "@urbaninstitute/dataviz-components";
  import BasicDropdown from "$components/BasicDropdown.svelte";
  import { formatFunLegend } from "$utils/formatFun";

  /**
   * Floating "Currently showing" card over the map (mockups 2, 4, 5): metric dropdown
   * bound to the effective metric + threshold color legend. Supersedes the v1 MapInfo.
   *
   * Mounted only when `tool.hasMappableMetric` — MapModule owns that gate — so this
   * component can assume there is a metric to show and needs no empty state of its own.
   *
   * @typedef {Object} Props
   * @property {{ currentlyShowing: string }} content - page-tool.aml {mapLegend}
   */

  /** @type {Props} */
  let { content } = $props();

  const tool = getContext("tool");

  // formatFunLegend, not formatFun: a few metric types carry more precision than the
  // legend's ~56px of tick spacing can hold, and their labels overlapped (2026-09-02)
  // `*`, not `number`: ColorLegend types the tick value as `Object` (it passes a threshold
  // index for threshold scales and a domain value otherwise)
  let tickFormat = $derived((/** @type {*} */ d) =>
    formatFunLegend(d, tool.selectedMetricMetadata?.metric_type)
  );

  // wider than the default 16 so the NA swatch reads as separate from the color ramp
  const naSpacing = 30;
</script>

<div class="map-legend-card">
  <div class="currently-showing">{content.currentlyShowing}</div>
  <!-- value is one-way on purpose: effectiveMetric is derived; selection goes through
       the tool action so this dropdown, the control panel's, and the map stay in sync -->
  <BasicDropdown
    id="map-legend-metric"
    inlineLabel="Metric shown on the map"
    placeholder={null}
    border={false}
    data={tool.mapMetricOptions}
    value={tool.effectiveMetric}
    dropdownWidth={340}
    onchange={(e) => {
      tool.selectMetric(+(/** @type {HTMLSelectElement} */ (e.currentTarget).value));
      logClickToGA(/** @type {*} */ (e.currentTarget), "tool-map-legend-metric-dropdown");
    }}
  />
  {#if tool.choroplethScale && !tool.mapVisuallyLoading}
    <div class="legend">
      <ColorLegend
        scale={tool.choroplethScale}
        height={12}
        tickLineColor={"white"}
        tickLineWidth={2}
        {tickFormat}
        naFill={urbanColors.gray}
        {naSpacing}
        margin={{ top: 0, right: 3, bottom: 0, left: 0 }}
        maxWidth={500}
      />
    </div>
  {/if}
</div>

<style>
  .map-legend-card {
    background: var(--color-white);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
    padding: var(--spacing-4);
    max-width: 22.5rem;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }

  .currently-showing {
    font-size: var(--font-size-small);
    color: var(--color-gray-shade-darkest);
    font-style: italic;
  }

  .map-legend-card :global(.legend-wrapper) {
    padding-bottom: 0 !important;
  }

  /* phones: the card spans the map's width instead of floating at a fixed 22.5rem. At a
     ~330px column the fixed card ran off the page (32px of horizontal scroll at 360px wide,
     with the NA swatch clipped out of view entirely). MapModule's .legend-overlay pins both
     edges here, which is what gives the card a definite width to fill.
     The tighter padding/gap is not cosmetic: it takes the card from ~138px to ~122px tall,
     and every pixel of it comes off the top of Mapbox's national fit padding, which has to
     clear the whole card inside a 300px frame. */
  @media (max-width: 33.75rem) {
    .map-legend-card {
      max-width: none;
      padding: var(--spacing-3);
      gap: var(--spacing-2);
    }
  }
</style>
