<!-- A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review. -->

<!-- @component
All-data card section (requirements §3.13; mockups 2, 6): title + unfiltered metric
count, local timeframe/disaggregate filters (deliberately NOT URL params — dev-plan
§3.2), sector/type/domain FilterPills, and a 3-column MetricCard grid across every
EQ. Cards are not selectable — map-metric selection belongs to the EQ section. The
grid defers mounting until the user approaches (~200 cards), and each card wrapper
uses content-visibility so off-viewport cards skip rendering work. Below 48rem both
filter rows collapse into a full-width AccordionDrawer.
-->
<script>
  import { getContext } from "svelte";
  import IntersectionObserver from "svelte-intersection-observer";
  import { logClickToGA } from "@urbaninstitute/dataviz-components";
  import pageContent from "$data/archie-ml/page-tool.aml";
  import AccordionDrawer from "./AccordionDrawer.svelte";
  import SectionFilters from "./SectionFilters.svelte";
  import FilterPills from "./FilterPills.svelte";
  import MetricCard from "$components/MetricCard/MetricCard.svelte";
  import MetricCardNoData from "$components/MetricCard/MetricCardNoData.svelte";
  import ControlsToggle from "./ControlsToggle.svelte";
  import {
    mobileMediaQuery,
    expandedMobileMediaQuery,
    gutterMediaQuery
  } from "$utils/mediaQuery.svelte.js";
  import filterIndicators from "$utils/filterIndicators";
  import { formatCountPhrase, agreeWithMetrics } from "$utils/availabilityText";

  /**
   * @typedef {Object} Props
   * @property {{ value: string, label: string }[]} timeframeOptions - from timeframe.aml
   * @property {() => void} onShowControls - opens the mobile control sheet (second trigger)
   */

  /** @type {Props} */
  let { timeframeOptions, onShowControls } = $props();

  /** @type {import("$lib/state/toolState.svelte.js").ToolState} */
  const tool = getContext("tool");

  const filterBy = pageContent.allData.filterBy;

  /** @param {string} filter */
  const allValuesFor = (filter) =>
    filterBy
      .find((/** @type {*} */ d) => d.value === filter)
      ?.selections.map((/** @type {*} */ d) => d.value) ?? [];

  // section-local filter state; default = Sector with every pill active (§3.13)
  let timeframe = $state("recent");
  let disagg = $state("none");
  let selectedFilter = $state("sector");
  let selectedFilterValues = $state(allValuesFor("sector"));

  /** @param {string} value */
  function selectFilter(value) {
    selectedFilter = value;
    // v1 behavior: switching the filter dimension resets every pill to active
    selectedFilterValues = allValuesFor(value);
  }

  let filteredIndicators = $derived(
    filterIndicators(tool.allIndicators, selectedFilter, selectedFilterValues, filterBy)
  );

  // flattened {indicator, metric} pairs — allIndicators returns new objects on every
  // recompute, so key by ids, never object identity
  let cards = $derived(
    filteredIndicators.flatMap((indicator) =>
      (indicator.hasMetricData ?? []).map((metric) => ({ indicator, metric }))
    )
  );

  // unfiltered total (settled 2026-07-15): the subtitle describes the section, not the
  // current pill selection
  // same sentence as the EQ heading, built from the same content block (settled 2026-08-20)
  let subtitle = $derived.by(() => {
    const metricCount = tool.allMetricCounts.hasMetricData;
    const phrase = formatCountPhrase(
      metricCount,
      tool.allIndicatorCounts.hasMetricData,
      pageContent.availability
    );
    const suffix = agreeWithMetrics(
      metricCount,
      pageContent.availability.availableSuffix,
      pageContent.availability.availableSuffixSingular
    );
    return `${phrase} ${suffix}`;
  });

  // deferred mount: the header/filters render immediately (the #all-data anchor must
  // exist for nav jumps), but the card grid only mounts once the user approaches
  /** @type {HTMLElement | undefined} */
  let gridRegionEl = $state();
  let gridMounted = $state(false);
</script>

{#snippet filterControls()}
  <SectionFilters
    idPrefix="all-data"
    {timeframe}
    {disagg}
    {timeframeOptions}
    onTimeframe={(value) => (timeframe = value)}
    onDisagg={(value) => (disagg = value)}
  />
  <FilterPills
    idPrefix="all-data"
    filters={filterBy}
    label={pageContent.allData.filterByLabel}
    {selectedFilter}
    {selectedFilterValues}
    onFilter={selectFilter}
    onValues={(values) => (selectedFilterValues = values)}
  />
{/snippet}

<div class="all-data-section">
  <!-- everything but the section's top border shares one column, so that below 48rem —
       where the grid is a single card wide — the heading, filters and cards line up in the
       same centered, width-capped container the EQ section uses -->
  <div class="section-column">
    {#if expandedMobileMediaQuery.current && !gutterMediaQuery.current}
      <!-- second "Show controls" trigger (phones only): the panel column is far above by
           the time the user reaches this section. Not needed from 540px up — the panel
           column is a gutter there and its trigger stays sticky on screen the whole way
           down. -->
      <div class="controls-bar">
        <ControlsToggle open={false} onclick={onShowControls} />
      </div>
    {/if}
    <div class="section-header">
      <h2>{pageContent.allData.title}</h2>
      <p class="subtitle">{subtitle}</p>
      {#if mobileMediaQuery.current}
        <!-- the filter rows don't fit beside each other on a phone: they tuck into the same
             drawer treatment the map module uses, spanning the full section width -->
        <AccordionDrawer
          id="all-data-filters"
          label={pageContent.allData.filterDrawerLabel}
          maxHeight="none"
          onToggle={(open, e) =>
            logClickToGA(/** @type {*} */ (e.currentTarget), "tool-drawer-toggle")}
        >
          <div class="drawer-filters">
            {@render filterControls()}
          </div>
        </AccordionDrawer>
      {:else}
        {@render filterControls()}
      {/if}
    </div>

    <IntersectionObserver
      element={gridRegionEl}
      once={true}
      rootMargin="600px 0px"
      bind:intersecting={gridMounted}
    >
      <div class="grid-region" bind:this={gridRegionEl}>
        <!-- skeletons until the grid has mounted and has something to show; after that a
             geography change dims the grid in place rather than swapping ~200 cards (and
             their charts) out for skeletons and rebuilding them -->
        {#if !gridMounted || (tool.loading && cards.length === 0)}
          <div class="card-grid" aria-hidden="true">
            {#each { length: 6 } as _, i (i)}
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
                  {timeframe}
                  {disagg}
                  eyebrowText={indicator.indicator_name}
                  compact={true}
                />
              </div>
            {/each}
          </div>
        {:else}
          <p class="no-indicators">{pageContent.allData.noIndicators}</p>
        {/if}
      </div>
    </IntersectionObserver>
  </div>
</div>

<style>
  .all-data-section {
    /* horizontal gutter + column width come from the page-level tool layout; the top
       border stays full-bleed even when the column below it narrows */
    padding: var(--spacing-8) 0;
    border-top: 1px solid var(--color-black, #000000);
  }

  .section-column {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-8);
  }

  /* same natural-width dark bar as the control-panel column's trigger */
  .controls-bar {
    align-self: flex-start;
    background: var(--color-blue-shade-dark);
    color: var(--color-white);
    padding: var(--spacing-6) var(--spacing-4);
  }

  .section-header {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
  }

  h2 {
    margin: 0;
  }

  .all-data-section p.subtitle {
    margin: 0;
    font-style: italic;
    font-size: var(--font-size-small);
    color: var(--color-gray-shade-darkest);
  }

  /* the drawer body supplies the side and bottom padding; the filters only need the gap
     under the header, and the pills row's own bottom padding would double up on it */
  .drawer-filters {
    padding-top: var(--spacing-4);
  }

  .drawer-filters :global(.filter-pills) {
    margin-top: var(--spacing-4);
    padding-bottom: 0;
  }

  .no-indicators {
    margin: 0;
    font-style: italic;
    color: var(--color-gray-shade-darkest);
  }

  .card-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-10);
    /* cards keep their natural height — shorter cards leave empty space below
       themselves instead of stretching to the row's tallest card */
    align-items: start;
    /* matches the map's loading treatment: dim quickly, fade back in gently */
    transition: opacity 0.35s ease;
  }

  /* a geography change updates the cards in place; dim them while the shard loads */
  .card-grid.loading {
    opacity: 0.6;
    transition-duration: 0.15s;
    pointer-events: none;
  }

  /* .card-cell (content-visibility + the export escape hatch) lives in app.css — it is
     shared with EqMetricsSection and has to see into Download.svelte's scope */

  /* One column at the mobile breakpoint, where the filter rows also fold into the drawer:
     two across gets crowded below 768px (the panel gutter takes 100px of it from 540px up).
     Above it the grid stays two-up through the 64rem layout switch — unlike the EQ grid,
     which drops to a single 464px column there; this section's ~200 cards would run far
     too tall. */
  @media (max-width: 48rem) {
    .card-grid {
      grid-template-columns: 1fr;
    }

    /* single column: same centered, width-capped treatment as the EQ section — the
       heading, filters and cards share one column instead of running full-bleed */
    .section-column {
      width: 100%;
      max-width: var(--card-column-max-width);
      margin-inline: auto;
    }
  }

  @media (min-width: 75rem) {
    .card-grid {
      grid-template-columns: 1fr 1fr 1fr;
    }
  }
</style>
