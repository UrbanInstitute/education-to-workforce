<!-- A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review. -->

<!-- @component
Selected-EQ card section (requirements §3.10; mockup 2): filter lead + SectionFilters
(timeframe/disagg URL params), zip-based download-all, 2-column MetricCard grid over
the EQ's metrics with data (card click selects the map metric — the magenta highlight,
control-panel dropdown, legend card, and choropleth all follow effectiveMetric), and
the NoDataBuckets listing below.
-->
<script>
  import { getContext } from "svelte";
  import { logClickToGA } from "@urbaninstitute/dataviz-components";
  import pageContent from "$data/archie-ml/page-tool.aml";
  import SectionFilters from "./SectionFilters.svelte";
  import NoDataBuckets from "./NoDataBuckets.svelte";
  import MetricCard from "$components/MetricCard/MetricCard.svelte";
  import MetricCardNoData from "$components/MetricCard/MetricCardNoData.svelte";
  import DownloadButton from "$components/Download/DownloadButton.svelte";
  import { createZip } from "$components/Download/downloadZip.js";
  import { triggerDownload } from "$components/Download/triggerDownload.js";
  import { formatDynamicText } from "$utils/dynamicText";
  import { titleCaseEqName } from "$utils/titleCaseEqName";

  /**
   * @typedef {Object} Props
   * @property {{ value: string, label: string }[]} timeframeOptions - from timeframe.aml
   */

  /** @type {Props} */
  let { timeframeOptions } = $props();

  /** @type {import("$lib/state/toolState.svelte.js").ToolState} */
  const tool = getContext("tool");

  // flattened {indicator, metric} pairs — selectedIndicators returns new objects on
  // every recompute, so key by ids, never object identity
  let cards = $derived(
    tool.selectedIndicators.flatMap((indicator) =>
      (indicator.hasMetricData ?? []).map((metric) => ({ indicator, metric }))
    )
  );

  let lead = $derived(
    formatDynamicText(
      tool.selectedMetricCounts.hasMetricData === 1
        ? pageContent.filters.sectionLeadTemplateSingular
        : pageContent.filters.sectionLeadTemplate,
      {
        metricCount: `${tool.selectedMetricCounts.hasMetricData}`,
        eqName: titleCaseEqName(tool.selectedEq?.shorthand)
      }
    )
  );

  // ---- download-all: sequential renderToBlob per card → one zip → one click ----
  // (requirements §3.10 — never one a.click() per card)

  /** @type {Record<number, ReturnType<typeof MetricCard> | undefined>} */
  let cardRefs = $state({});
  let zipRunning = $state(false);
  let zipProgress = $state("");

  /** @param {MouseEvent} e */
  async function downloadAll(e) {
    logClickToGA(/** @type {HTMLElement} */ (e.currentTarget), "tool-download-all-charts");
    const targets = cards
      .map(({ metric }) => ({ metric, ref: cardRefs[metric.metric_id] }))
      .filter((target) => target.ref);
    if (targets.length === 0) return;
    zipRunning = true;
    try {
      const entries = [];
      for (const [index, { metric, ref }] of targets.entries()) {
        zipProgress = formatDynamicText(pageContent.downloadAll.progress, {
          n: `${index + 1}`,
          total: `${targets.length}`
        });
        // sequential on purpose: one offscreen html2canvas render alive at a time
        entries.push({
          filename: `${metric.metric_full_name}.png`,
          blob: await /** @type {NonNullable<typeof ref>} */ (ref).renderToBlob()
        });
      }
      const geography = tool.cardGeographies[0]?.short_name ?? tool.cardGeographies[0]?.name ?? "";
      triggerDownload(
        await createZip(entries),
        `${tool.selectedEq?.shorthand ?? "metrics"}-${geography}-charts.zip`
      );
    } catch (error) {
      console.error("download all charts failed", error);
    } finally {
      zipRunning = false;
      zipProgress = "";
    }
  }
</script>

<div class="eq-metrics-section">
  <!-- header + grid share one column so that below 64rem, where the grid is a single
       464px-wide card, the lead, filters and download-all line up with the cards in the
       same centered container (the no-data listing below stays full width) -->
  <div class="cards-column">
    <div class="section-header">
      <p class="lead">{@html lead}</p>
      <div class="filters-row">
        <SectionFilters
          idPrefix="eq"
          timeframe={tool.timeframe}
          disagg={tool.disagg}
          {timeframeOptions}
          onTimeframe={(value) => tool.setTimeframe(value)}
          onDisagg={(value) => tool.setDisagg(value)}
        />
        {#if cards.length > 0}
          <DownloadButton
            label={pageContent.downloadAll.label}
            loadingLabel={zipProgress}
            isLoading={zipRunning}
            onclick={downloadAll}
          />
        {/if}
      </div>
    </div>

    <!-- skeletons only when there is nothing to dim (first load / a fresh EQ with no cards
         yet). Once cards exist, a geography change dims the grid in place instead of swapping
         it out, so keyed diffing updates each card rather than destroying and rebuilding every
         chart in it. -->
    {#if tool.loading && cards.length === 0}
      <div class="card-grid" aria-hidden="true">
        {#each { length: 4 } as _, i (i)}
          <MetricCardNoData loading={true} height={220} />
        {/each}
      </div>
    {:else if cards.length > 0}
      <div class="card-grid" class:loading={tool.loading} aria-busy={tool.loading}>
        {#each cards as { indicator, metric } (`${indicator.indicator_number}-${metric.metric_id}`)}
          <div class="card-cell">
            <MetricCard
              metadata={metric}
              geographies={tool.cardGeographies}
              timeframe={tool.timeframe}
              disagg={tool.disagg}
              eyebrowText={indicator.indicator_name}
              elevated={true}
              selectable={true}
              selected={metric.metric_id === tool.effectiveMetric}
              onclick={(metricId) => tool.selectMetric(metricId)}
              bind:this={cardRefs[metric.metric_id]}
            />
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <NoDataBuckets />
</div>

<style>
  .eq-metrics-section {
    /* horizontal gutter + column width come from the page-level tool layout */
    padding: 0 0 var(--spacing-8);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-8);
  }

  .cards-column {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-8);
  }

  .section-header {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-8);
  }

  /* filters on the left, download-all right-aligned in the same row so it adds no vertical
     height on wider screens; when the row wraps on narrow screens the button drops below
     the dropdowns, left-aligned with the cards */
  .filters-row {
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: flex-end;
    gap: var(--spacing-4) var(--spacing-6);
  }

  .lead {
    margin: 0;
    font-style: italic;
    color: var(--color-gray-shade-darkest);
    font-size: var(--font-size-small) !important;
  }

  .lead :global(strong) {
    font-style: normal;
  }

  .card-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-8);
    /* cards keep their natural height (settled 2026-07-15): shorter cards leave empty
       space below themselves instead of stretching to the row's tallest card */
    align-items: start;
    /* matches the map's loading treatment: dim quickly, fade back in gently */
    transition: opacity 0.35s ease;
  }

  /* a geography change updates the cards in place; dim them while the shard loads rather
     than accepting a click that would select a metric against the outgoing data */
  .card-grid.loading {
    opacity: 0.6;
    transition-duration: 0.15s;
    pointer-events: none;
  }

  /* Stacked/gutter layout: one card's width (464px, matching the two-column card width at
     the layout's widest) centered under the map, with the header along for the ride so the
     filters and download button share the cards' left and right edges. Max-width rather
     than a min-width desktop rule so the switch lands on the same side of 64rem as the page
     layout and expandedMobileMediaQuery — at exactly 1024px a min-width pair left the grid
     two-up inside the narrow layout. */
  @media (max-width: 64rem) {
    .cards-column {
      width: 100%;
      max-width: var(--card-column-max-width);
      margin-inline: auto;
    }

    .card-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
