<!-- A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review. -->

<!-- @component
Shared metric card for the EQ and all-data grids (requirements §4.8; mockups 2–8,
lines.jpg). All decision logic lives in getChartData.js — this is chrome plus one
{#if} chain over selectChartVariant. The single cardBody snippet renders twice:
once for the screen and once (isDownload=true, with the ready callback) as the
Download component's offscreen export copy.
-->
<script>
  import IconInformation from "$icons/IconInformation.svelte";
  import { Tooltip, LogoUrbanWide, logClickToGA } from "@urbaninstitute/dataviz-components";
  import altTemplates from "$data/archie-ml/chart-alt.aml";
  import pageContent from "$data/archie-ml/page-tool.aml";
  import ChartLegend from "$components/charts/ChartLegend.svelte";
  import BarGroup from "$components/charts/BarGroup.svelte";
  import MultiLineChart from "$components/charts/MultiLineChart.svelte";
  import DisaggregatedBars from "$components/charts/DisaggregatedBars.svelte";
  import DisaggregatedTrends from "$components/charts/DisaggregatedTrends.svelte";
  import Download from "$components/Download/Download.svelte";
  import { readySignal } from "$utils/readySignal";
  import {
    getBarGroupData,
    getTrendSeriesData,
    getBarLegendItems,
    getTrendLegendItems,
    hasDisaggregateData,
    getDisaggregatedData,
    selectChartVariant,
    resolveDisaggPrefix,
    getChartAltText
  } from "$utils/getChartData";
  import { isDisaggOnly } from "$utils/disaggregates";
  import { withTerminalPeriod } from "$utils/terminalPeriod.js";

  /**
   * @typedef {Object} Props
   * @property {import("$utils/types/MetricMetadataObject.js").MetricMetadataObject} metadata
   * @property {import("$utils/getChartData").CardGeography[]} geographies - role-tagged, from ToolState.cardGeographies
   * @property {string} [timeframe]
   * @property {string} [disagg]
   * @property {string} [eyebrowText] - the parent indicator's name (both grids — settled 2026-07-15)
   * @property {boolean} [selectable] - EQ grid only: card click selects the map metric
   * @property {boolean} [selected]
   * @property {boolean} [elevated] - EQ grid only: resting drop shadow. Separate from
   *   `selectable` because disagg-only cards sit in that grid without being selectable.
   * @property {boolean} [compact] - all-data grid: tighter padding for the smaller cards
   * @property {(metricId: number) => void} [onclick]
   */

  /** @type {Props} */
  let {
    metadata,
    geographies,
    timeframe = "recent",
    disagg = "none",
    eyebrowText = undefined,
    selectable = false,
    selected = false,
    elevated = false,
    compact = false,
    onclick = () => {}
  } = $props();

  // metrics.json entries always carry years_available; the shared MetricMetadataObject
  // typedef marks it optional, so cast to the chart-data shape once
  const chartMetadata = $derived(
    /** @type {import("$utils/getChartData").ChartMetricMetadata} */ (/** @type {*} */ (metadata))
  );

  let barGroup = $derived(getBarGroupData(geographies, chartMetadata));
  let trendSeries = $derived(
    getTrendSeriesData(geographies, metadata.metric_id, chartMetadata.years_available)
  );
  let variant = $derived(selectChartVariant(timeframe, disagg, chartMetadata));
  let isDisaggVariant = $derived(variant === "disaggBars" || variant === "disaggTrends");
  // the prefix actually rendered, which differs from `disagg` only for disaggregate-only
  // metrics under "none" — they substitute their own rather than render an empty base
  // chart (dev-plan §11.4)
  let disaggPrefix = $derived(resolveDisaggPrefix(disagg, chartMetadata));
  // a disaggregate filter never swaps a card back to its base chart: cards without
  // subgroup data — whether the metric doesn't offer the disaggregate or claims it but
  // publishes nothing — show the no-data message instead (settled 2026-07-15)
  let showDisaggNoData = $derived(
    isDisaggVariant &&
      !hasDisaggregateData(geographies, chartMetadata, /** @type {string} */ (disaggPrefix))
  );
  let disaggData = $derived(
    isDisaggVariant && !showDisaggNoData
      ? getDisaggregatedData(geographies, chartMetadata, /** @type {string} */ (disaggPrefix), {
          timeframe: variant === "disaggTrends" ? "all" : "recent"
        })
      : null
  );
  // disaggregate-only metrics can't be the map layer (no shard exists), so their cards
  // must not offer click-to-select even in the EQ grid
  let isSelectable = $derived(selectable && !isDisaggOnly(metadata));
  // legend items describe roles (geography + style), identical across subgroups, so the
  // disaggregated variants reuse the base bar/trend legends
  let legendItems = $derived(
    variant === "trend" || variant === "disaggTrends"
      ? getTrendLegendItems(trendSeries)
      : getBarLegendItems(barGroup.bars)
  );
  let chartLabel = $derived(getChartAltText(geographies, chartMetadata, altTemplates, { variant }));

  let hoverFlag = $state(false);
  let showInfo = $state(false);
  /** @type {HTMLElement | undefined} */
  let pinEl = $state();
  /** @type {ReturnType<typeof Download> | undefined} */
  let download = $state();

  const primaryName = $derived(geographies[0]?.short_name ?? geographies[0]?.name ?? "");

  /**
   * Container-level click-to-select: ignore clicks on the card's own interactive
   * chrome (source tooltip, download) — everything else, including the charts,
   * selects the metric.
   * @param {MouseEvent} e
   */
  function handleContentClick(e) {
    if (/** @type {HTMLElement} */ (e.target).closest(".card-interactive")) return;
    onclick(metadata.metric_id);
  }

  /** Capture the card as a PNG Blob without downloading (EQ-section download-all). */
  export function renderToBlob() {
    return /** @type {NonNullable<typeof download>} */ (download).renderToBlob();
  }

  /** Capture and download the card image. */
  export function handleExport() {
    return /** @type {NonNullable<typeof download>} */ (download).handleExport();
  }
</script>

{#snippet cardBody(
  /** @type {boolean} */ isDownload,
  /** @type {(() => void) | undefined} */ onready = undefined
)}
  <div class="card-body">
    <div class="card-title-container">
      <div class="card-title" class:underlined={!isDownload && hoverFlag && isSelectable}>
        {metadata.metric_full_name}
      </div>
      {#if (variant === "bars" || variant === "disaggBars") && !showDisaggNoData}
        <div class="card-subtitle">{barGroup.displayYear}</div>
      {/if}
    </div>
    {#if !showDisaggNoData}
      <ChartLegend items={legendItems} />
    {/if}
    {#if showDisaggNoData}
      <div class="disagg-no-data" {@attach readySignal(onready)}>
        {pageContent.filters.disaggNoData}
      </div>
    {:else if variant === "bars"}
      <div class="viz" role="group" aria-label={chartLabel}>
        <BarGroup
          bars={barGroup.bars}
          domain={barGroup.domain}
          diverging={barGroup.diverging}
          formatType={metadata.metric_type}
          {onready}
        />
      </div>
    {:else if variant === "trend"}
      <div class="viz" role="img" aria-label={chartLabel}>
        <MultiLineChart
          series={trendSeries}
          formatType={metadata.metric_type}
          {isDownload}
          {onready}
        />
      </div>
    {:else if variant === "disaggBars" && disaggData}
      <div class="viz" role="group" aria-label={chartLabel}>
        <DisaggregatedBars
          subgroups={disaggData.subgroups}
          domain={disaggData.domain}
          diverging={disaggData.diverging}
          formatType={metadata.metric_type}
          {onready}
        />
      </div>
    {:else if disaggData}
      <div class="viz" role="group" aria-label={chartLabel}>
        <DisaggregatedTrends
          subgroups={disaggData.subgroups}
          domain={disaggData.domain}
          formatType={metadata.metric_type}
          {isDownload}
          {onready}
        />
      </div>
    {/if}
    {#if isDownload}
      <div class="download-logo">
        <LogoUrbanWide />
      </div>
      {#if metadata.source_label}
        <div class="download-source">
          <b>Source:</b>
          {@html withTerminalPeriod(metadata.source_label)}
        </div>
      {/if}
      {#if metadata.notes_label}
        <div class="download-source">
          <b>Notes:</b>
          {@html withTerminalPeriod(metadata.notes_label)}
        </div>
      {/if}
    {/if}
  </div>
{/snippet}

<div class="metric-card-v2">
  {#if eyebrowText}
    <div class="eyebrow-text">{@html eyebrowText}</div>
  {/if}
  <!-- Mouse selection lives on the container so the chart hover layers (BarHoverLayer,
       Voronoi) underneath still receive pointer events; clicks on them bubble up here.
       Keyboard/AT selection goes through the pointer-events:none overlay button below. -->
  <!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
  <div
    class="content"
    class:elevated
    class:compact
    class:selectable={isSelectable}
    class:selected={isSelectable && (selected || hoverFlag)}
    onmouseenter={isSelectable ? () => (hoverFlag = true) : undefined}
    onmouseleave={isSelectable ? () => (hoverFlag = false) : undefined}
    onclick={isSelectable ? handleContentClick : undefined}
  >
    {@render cardBody(false)}

    {#if isSelectable}
      <button
        aria-label="Select metric: {metadata.metric_full_name}"
        aria-pressed={selected}
        class="card-base-interaction-layer"
        onclick={() => onclick(metadata.metric_id)}
      ></button>
    {/if}

    <div class="card-footer card-interactive">
      <div class="source-container">
        <div class="source">Source</div>
        <button
          bind:this={pinEl}
          aria-label="Source"
          aria-expanded={showInfo}
          onclick={(e) => {
            showInfo = !showInfo;
            logClickToGA(/** @type {HTMLElement} */ (e.currentTarget), "metric-card-source-toggle");
          }}
        >
          <IconInformation />
        </button>
      </div>
      <Download
        id={metadata.metric_id}
        bind:this={download}
        filename="{metadata.metric_full_name} in {primaryName}"
      >
        {#snippet children(onready)}
          <!-- export copy mirrors the on-screen card: eyebrow above the framed box
               (v1's downloaded image included both) -->
          {#if eyebrowText}
            <div class="eyebrow-text">{@html eyebrowText}</div>
          {/if}
          <div class="content">
            {@render cardBody(true, onready)}
          </div>
        {/snippet}
      </Download>
    </div>
  </div>
</div>
<div class="card-tooltip">
  {#if showInfo}
    <Tooltip elOffset={0} el={pinEl} size="large">
      {#if metadata.source_label}
        <div>
          <b>Source:</b>
          {@html withTerminalPeriod(metadata.source_label)}
        </div>
      {/if}
      {#if metadata.notes_label}
        <div>
          <b>Notes:</b>
          {@html withTerminalPeriod(metadata.notes_label)}
        </div>
      {/if}
    </Tooltip>
  {/if}
</div>

<style>
  .metric-card-v2 {
    width: 100%;
    display: flex;
    flex-direction: column;
  }

  /* one shared body for the screen card and the offscreen export copy, so the
     export keeps the same vertical rhythm without relying on .content */
  .card-body {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
  }

  /* card layout owns the extra space below the legend: the shared card-body gap gives
     spacing-4, and this adds spacing-2 to reach spacing-6 (24px) beneath the legend only,
     without widening the title→legend gap above it */
  .card-body :global(.chart-legend) {
    margin-bottom: var(--spacing-2);
  }

  .eyebrow-text {
    font-size: var(--font-size-small);
    text-transform: uppercase;
    margin-bottom: var(--spacing-3);
    color: var(--color-gray-shade-darker);
  }

  .eyebrow-text :global(.divider) {
    color: var(--color-gray);
    margin: 0 var(--spacing-1);
  }

  .content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
    background-color: var(--color-gray-shade-lightest);
    border: 1px solid var(--color-gray-shade-medium);
    /* extra left padding leaves room for the magenta selection bar (mockup 2) */
    padding: var(--spacing-10) var(--spacing-10) var(--spacing-10) var(--spacing-11);
    position: relative;
    /* cards keep their natural height (settled 2026-07-15): a shorter card leaves
       empty space below itself in the grid row instead of stretching to match its
       row neighbors */
  }

  /* all-data grid: smaller cards get tighter, even padding */
  .content.compact {
    padding: var(--spacing-6);
  }

  .content.elevated {
    box-shadow: var(--box-shadow);
  }

  /* deeper than the resting .elevated shadow — must stay after it to win the cascade */
  .content.selected {
    box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.25);
  }

  /* magenta left-edge selection bar (mockup 2; ported from MetricCard v1) */
  .content.selected::before {
    content: "";
    position: absolute;
    left: 0px;
    top: 0;
    width: var(--spacing-2);
    height: 100%;
    background-color: var(--color-magenta-shade-dark);
  }

  .card-title {
    color: var(--color-black);
    font-family: var(--font-family-sans-alt);
    font-weight: 700;
    font-size: 18px;
    line-height: 24px;
  }

  .card-title.underlined {
    text-decoration: underline;
  }

  .card-subtitle {
    font-size: var(--font-size-small);
    color: var(--color-gray-shade-darker);
  }

  .disagg-no-data {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 6rem;
    padding: var(--spacing-4);
    background: var(--color-gray-shade-light);
    color: var(--color-gray-shade-darker);
    font-size: var(--font-size-small);
    text-align: center;
  }

  .card-footer {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-2);
    margin-top: auto;
  }

  /* source stays left; the download button aligns to the card's right edge below it */
  .card-footer :global(.button-container) {
    align-self: flex-end;
  }

  .source-container {
    display: flex;
    gap: var(--spacing-2);
    align-items: center;
  }

  .source-container .source {
    color: var(--color-gray-shade-darker);
    font-weight: var(--font-weight-bold);
    font-size: 0.75rem;
  }

  .source-container button {
    padding: 0;
    background: none;
    border: none;
    font: inherit;
    cursor: pointer;
    height: 20px;
  }

  /* interactive chrome sits above the full-card interaction layer */
  .card-interactive {
    z-index: 300;
    position: relative;
  }

  .content.selectable {
    cursor: pointer;
  }

  /* keyboard/AT affordance only — pointer events go to the container and the chart
     hover layers beneath (a covering button would swallow chart tooltips) */
  .card-base-interaction-layer {
    width: 100%;
    height: 100%;
    position: absolute;
    background: none;
    top: 0;
    left: 0;
    z-index: 200;
    appearance: none;
    border: none;
    pointer-events: none;
  }

  .card-base-interaction-layer:focus-visible {
    outline: 1px solid var(--color-magenta-shade-dark);
    outline-offset: 0;
  }

  .download-logo {
    display: flex;
    justify-content: end;
    margin-right: var(--spacing-1);
  }

  .download-source {
    color: var(--color-gray-shade-darker);
    font-size: var(--font-size-small);
  }

  .card-tooltip {
    position: absolute;
  }

  .card-tooltip :global(.tooltip-outer) {
    pointer-events: all !important;
  }
</style>
