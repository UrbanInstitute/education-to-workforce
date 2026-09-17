<!-- A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review. -->

<!-- @component
Dev-only visual QA harness for the v2 chart family (dev-plan §6 Phase 3). Renders every
chart variant against the vitest fixtures so tick geometry, dotted rendering, legend
wrapping, tooltips, and (in later sections) downloads can be checked against the mockups
without wiring up the real page. Kept permanently; unreachable and tree-shaken in prod.
-->
<script>
  import ChartLegend from "$components/charts/ChartLegend.svelte";
  import BarGroup from "$components/charts/BarGroup.svelte";
  import MultiLineChart from "$components/charts/MultiLineChart.svelte";
  import DisaggregatedBars from "$components/charts/DisaggregatedBars.svelte";
  import DisaggregatedTrends from "$components/charts/DisaggregatedTrends.svelte";
  import Download from "$components/Download/Download.svelte";
  import { createZip } from "$components/Download/downloadZip.js";
  import { triggerDownload } from "$components/Download/triggerDownload.js";
  import {
    getCardGeographies,
    getBarGroupData,
    getBarLegendItems,
    getTrendSeriesData,
    getTrendLegendItems,
    getDisaggregatedData,
    hasDisaggregateData
  } from "$utils/getChartData";
  import {
    NATIONAL,
    STATES,
    COUNTY_01001,
    COUNTY_01003,
    COUNTY_02013,
    METRIC_PERCENT,
    METRIC_CURRENCY_SINGLE_YEAR,
    METRIC_MISSING_RECENT,
    METRIC_GAP,
    METRIC_DISAGG_EMPTY,
    METRIC_DISAGG_SINGLE_YEAR
  } from "$utils/__fixtures__/chartData";

  const SCENARIOS = [
    {
      key: "national",
      label: "National view",
      geos: getCardGeographies(undefined, undefined, STATES, NATIONAL, "counties")
    },
    {
      key: "state",
      label: "State primary",
      geos: getCardGeographies(STATES["01"], undefined, STATES, NATIONAL, "states")
    },
    {
      key: "county",
      label: "County primary",
      geos: getCardGeographies(COUNTY_01001, undefined, STATES, NATIONAL, "counties")
    },
    {
      key: "same-state",
      label: "Comparison, same parent state (shared tick, per-family colors)",
      geos: getCardGeographies(COUNTY_01001, COUNTY_01003, STATES, NATIONAL, "counties")
    },
    {
      key: "cross-state",
      label: "Comparison, cross-state (5 roles / legend wrap)",
      geos: getCardGeographies(COUNTY_01001, COUNTY_02013, STATES, NATIONAL, "counties")
    }
  ];

  const countyGeos = SCENARIOS[2].geos;
  const BAR_EDGE_CASES = [
    {
      label: "Missing recent year (displayYear fallback)",
      geos: countyGeos,
      metric: METRIC_MISSING_RECENT
    },
    { label: "Single-year currency metric", geos: countyGeos, metric: METRIC_CURRENCY_SINGLE_YEAR },
    {
      label: "No data for geography (N/A row)",
      geos: SCENARIOS[1].geos,
      metric: { ...METRIC_PERCENT, metric_id: 999 }
    }
  ];

  // Disaggregated views (Phase 6): the diverging representation-gap card shares one
  // domain across all subgroups; m1 exercises the N/A-row and empty-facet treatments
  // (6 of its 8 race/ethnicity subgroups have no fixture data)
  const disaggBars = getDisaggregatedData(countyGeos, METRIC_GAP, "d1");
  const disaggTrends = getDisaggregatedData(countyGeos, METRIC_GAP, "d1", { timeframe: "all" });
  const disaggBarsNA = getDisaggregatedData(countyGeos, METRIC_PERCENT, "d1");
  const disaggTrendsNA = getDisaggregatedData(countyGeos, METRIC_PERCENT, "d1", {
    timeframe: "all"
  });

  // audit-driven edge cases: A4 (no subgroup data at all) → the card shows the
  // no-data message, driven by hasDisaggregateData; A6 (single-year subgroup data)
  // → trend facets rendered as circles-only points
  const emptyDisaggHasData = hasDisaggregateData(countyGeos, METRIC_DISAGG_EMPTY, "d1");
  const disaggTrendsSingleYear = getDisaggregatedData(countyGeos, METRIC_DISAGG_SINGLE_YEAR, "d1", {
    timeframe: "all"
  });

  const LINE_CASES = [
    { label: "Cross-state comparison (5 series)", geos: SCENARIOS[4].geos, metric: METRIC_PERCENT },
    {
      label: "County primary (gap in series, m3)",
      geos: countyGeos,
      metric: METRIC_MISSING_RECENT
    },
    { label: "National only", geos: SCENARIOS[0].geos, metric: METRIC_PERCENT },
    { label: "Two-year series", geos: countyGeos, metric: METRIC_GAP },
    {
      label: "Single-year metric (circles only, references incl.)",
      geos: countyGeos,
      metric: METRIC_CURRENCY_SINGLE_YEAR
    }
  ].map((lineCase) => ({
    ...lineCase,
    series: getTrendSeriesData(
      lineCase.geos,
      lineCase.metric.metric_id,
      lineCase.metric.years_available
    )
  }));

  const WIDTHS = [320, 480, 800];
  let width = $state(480);

  // Download section: one card per chart variant, exercising the onready handshake and
  // html2canvas fidelity (dotted gradient ticks, absolute positioning, SVG dash + fonts)
  const crossStateBarGroup = getBarGroupData(SCENARIOS[4].geos, METRIC_PERCENT);
  const crossStateTrend = getTrendSeriesData(
    SCENARIOS[4].geos,
    METRIC_PERCENT.metric_id,
    METRIC_PERCENT.years_available
  );

  // "Save all" = the Phase-5 download-all flow: sequential renderToBlob per card
  // (one offscreen render alive at a time), one zip, one click
  /** @type {Record<string, ReturnType<typeof Download> | undefined>} */
  let downloadRefs = $state({});
  let zipProgress = $state("");

  async function saveAllAsZip() {
    const cards = Object.entries(downloadRefs).filter(([, ref]) => ref);
    const entries = [];
    let index = 0;
    for (const [name, ref] of cards) {
      index += 1;
      zipProgress = `Rendering ${index} of ${cards.length}…`;
      entries.push({ filename: `${name}.png`, blob: await /** @type {*} */ (ref).renderToBlob() });
    }
    zipProgress = "Zipping…";
    triggerDownload(await createZip(entries), "qa-charts.zip");
    zipProgress = "";
  }
</script>

<div class="harness">
  <h1>Chart QA harness</h1>
  <p>
    Fixture-driven gallery of the v2 chart family. Compare against
    <code>.agent/mockups/</code> 3, 4, 8, <code>lines.jpg</code>, and
    <code>bars-negative.png</code>.
  </p>
  <div class="width-toggle">
    Card width:
    {#each WIDTHS as w (w)}
      <button class:active={width === w} onclick={() => (width = w)}>{w}px</button>
    {/each}
  </div>

  <h2>Legends + bar groups</h2>
  <div class="cards">
    {#each SCENARIOS as scenario (scenario.key)}
      {@const barGroup = getBarGroupData(scenario.geos, METRIC_PERCENT)}
      <section class="card" style:width="{width}px">
        <h3>{scenario.label}</h3>
        <p class="meta">{METRIC_PERCENT.metric_full_name} — {barGroup.displayYear}</p>
        <ChartLegend items={getBarLegendItems(barGroup.bars)} />
        <BarGroup
          bars={barGroup.bars}
          domain={barGroup.domain}
          diverging={barGroup.diverging}
          formatType={METRIC_PERCENT.metric_type}
        />
      </section>
    {/each}
  </div>

  <h2>Combined line charts</h2>
  <p class="meta">
    Single-year metrics render under "all years" as circles-only points — see the "Single-year
    metric" case below (every series gets its point, references included).
  </p>
  <div class="cards">
    {#each LINE_CASES as lineCase (lineCase.label)}
      <section class="card" style:width="{width}px">
        <h3>{lineCase.label}</h3>
        <p class="meta">{lineCase.metric.metric_full_name}</p>
        <ChartLegend items={getTrendLegendItems(lineCase.series)} />
        <MultiLineChart series={lineCase.series} formatType={lineCase.metric.metric_type} />
      </section>
    {/each}
  </div>

  <h2>Disaggregated views (mockups 7–8, lines.jpg bottom)</h2>
  <p class="meta">
    A4 all-empty (m4): <code>hasDisaggregateData(…)</code> is
    <strong>{String(emptyDisaggHasData)}</strong> (expected: false — the card shows the "no data available
    for this disaggregation" message, rendered by MetricCard). A6 single-year (m5): trend facets render
    as circles-only points — see the card below.
  </p>
  <div class="cards">
    <section class="card" style:width="{width}px">
      <h3>Diverging disaggregated bars (m83 × race/ethnicity) — {disaggBars.displayYear}</h3>
      <p class="meta">
        Zero baseline at the same x on every row; negative bars extend left, labels at their outer
        end (bars-negative.png). Subgroups without data render N/A tracks.
      </p>
      <ChartLegend items={getBarLegendItems(getBarGroupData(countyGeos, METRIC_GAP).bars)} />
      <DisaggregatedBars
        subgroups={disaggBars.subgroups}
        domain={disaggBars.domain}
        diverging={disaggBars.diverging}
        formatType={METRIC_GAP.metric_type}
      />
    </section>
    <section class="card" style:width="{width}px">
      <h3>Diverging disaggregated trends (m83 × race/ethnicity)</h3>
      <p class="meta">
        Shared y-domain across facets; zero marker where it crosses; empty subgroups render the
        compact N/A box.
      </p>
      <ChartLegend
        items={getTrendLegendItems(
          getTrendSeriesData(countyGeos, METRIC_GAP.metric_id, METRIC_GAP.years_available)
        )}
      />
      <DisaggregatedTrends
        subgroups={disaggTrends.subgroups}
        domain={disaggTrends.domain}
        formatType={METRIC_GAP.metric_type}
      />
    </section>
    <section class="card" style:width="{width}px">
      <h3>N/A rows (m1 × race/ethnicity) — {disaggBarsNA.displayYear}</h3>
      <p class="meta">8 declared subgroups, 6 without data → gray tracks with N/A labels.</p>
      <ChartLegend items={getBarLegendItems(getBarGroupData(countyGeos, METRIC_PERCENT).bars)} />
      <DisaggregatedBars
        subgroups={disaggBarsNA.subgroups}
        domain={disaggBarsNA.domain}
        diverging={disaggBarsNA.diverging}
        formatType={METRIC_PERCENT.metric_type}
      />
    </section>
    <section class="card" style:width="{width}px">
      <h3>Empty facets (m1 × race/ethnicity, all years)</h3>
      <p class="meta">2 data facets + 6 compact N/A boxes.</p>
      <ChartLegend
        items={getTrendLegendItems(
          getTrendSeriesData(countyGeos, METRIC_PERCENT.metric_id, METRIC_PERCENT.years_available)
        )}
      />
      <DisaggregatedTrends
        subgroups={disaggTrendsNA.subgroups}
        domain={disaggTrendsNA.domain}
        formatType={METRIC_PERCENT.metric_type}
      />
    </section>
    <section class="card" style:width="{width}px">
      <h3>Single-year facets (m5 × race/ethnicity, all years)</h3>
      <p class="meta">A6: one year of subgroup data → circles-only points per facet.</p>
      <ChartLegend
        items={getTrendLegendItems(
          getTrendSeriesData(
            countyGeos,
            METRIC_DISAGG_SINGLE_YEAR.metric_id,
            METRIC_DISAGG_SINGLE_YEAR.years_available
          )
        )}
      />
      <DisaggregatedTrends
        subgroups={disaggTrendsSingleYear.subgroups}
        domain={disaggTrendsSingleYear.domain}
        formatType={METRIC_DISAGG_SINGLE_YEAR.metric_type}
      />
    </section>
  </div>

  <h2>Downloads (onready handshake + html2canvas fidelity)</h2>
  <p class="meta">
    <button class="save-all" onclick={saveAllAsZip} disabled={zipProgress !== ""}>
      {zipProgress || "Save all as zip"}
    </button>
  </p>
  <div class="cards">
    <section class="card" style:width="{width}px">
      <h3>Bar card export (dotted-tick canary)</h3>
      <ChartLegend items={getBarLegendItems(crossStateBarGroup.bars)} />
      <BarGroup
        bars={crossStateBarGroup.bars}
        domain={crossStateBarGroup.domain}
        formatType={METRIC_PERCENT.metric_type}
      />
      <Download
        id="bars-cross-state"
        filename="qa-bars-cross-state"
        bind:this={downloadRefs["qa-bars-cross-state"]}
      >
        {#snippet children(onready)}
          <h3>{METRIC_PERCENT.metric_full_name} — {crossStateBarGroup.displayYear}</h3>
          <ChartLegend items={getBarLegendItems(crossStateBarGroup.bars)} />
          <BarGroup
            bars={crossStateBarGroup.bars}
            domain={crossStateBarGroup.domain}
            formatType={METRIC_PERCENT.metric_type}
            {onready}
          />
        {/snippet}
      </Download>
    </section>
    <section class="card" style:width="{width}px">
      <h3>Trend card export (SVG dash + fonts)</h3>
      <ChartLegend items={getTrendLegendItems(crossStateTrend)} />
      <MultiLineChart series={crossStateTrend} formatType={METRIC_PERCENT.metric_type} />
      <Download
        id="trend-cross-state"
        filename="qa-trend-cross-state"
        bind:this={downloadRefs["qa-trend-cross-state"]}
      >
        {#snippet children(onready)}
          <h3>{METRIC_PERCENT.metric_full_name}</h3>
          <ChartLegend items={getTrendLegendItems(crossStateTrend)} />
          <MultiLineChart
            series={crossStateTrend}
            formatType={METRIC_PERCENT.metric_type}
            isDownload={true}
            {onready}
          />
        {/snippet}
      </Download>
    </section>
    <section class="card" style:width="{width}px">
      <h3>Diverging disaggregated export (root-attach onready)</h3>
      <DisaggregatedBars
        subgroups={disaggBars.subgroups}
        domain={disaggBars.domain}
        diverging={disaggBars.diverging}
        formatType={METRIC_GAP.metric_type}
      />
      <Download
        id="bars-diverging"
        filename="qa-bars-diverging"
        bind:this={downloadRefs["qa-bars-diverging"]}
      >
        {#snippet children(onready)}
          <h3>{METRIC_GAP.metric_full_name} — {disaggBars.displayYear}</h3>
          <DisaggregatedBars
            subgroups={disaggBars.subgroups}
            domain={disaggBars.domain}
            diverging={disaggBars.diverging}
            formatType={METRIC_GAP.metric_type}
            {onready}
          />
        {/snippet}
      </Download>
    </section>
  </div>

  <h2>Bar edge cases</h2>
  <div class="cards">
    {#each BAR_EDGE_CASES as edgeCase (edgeCase.label)}
      {@const barGroup = getBarGroupData(edgeCase.geos, edgeCase.metric)}
      <section class="card" style:width="{width}px">
        <h3>{edgeCase.label}</h3>
        <p class="meta">{edgeCase.metric.metric_full_name} — {barGroup.displayYear}</p>
        <ChartLegend items={getBarLegendItems(barGroup.bars)} />
        <BarGroup
          bars={barGroup.bars}
          domain={barGroup.domain}
          diverging={barGroup.diverging}
          formatType={edgeCase.metric.metric_type}
        />
      </section>
    {/each}
  </div>
</div>

<style>
  .harness {
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--spacing-6) var(--spacing-4);
  }
  .width-toggle {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    margin-bottom: var(--spacing-4);
  }
  .width-toggle button.active {
    font-weight: var(--font-weight-semibold);
    text-decoration: underline;
  }
  .cards {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-4);
    align-items: flex-start;
  }
  .card {
    border: 1px solid var(--color-gray-shade-light);
    background: var(--color-gray-shade-lightest);
    padding: var(--spacing-4);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }
  .card h3 {
    margin: 0;
    font-size: var(--font-size-normal);
  }
  .meta {
    margin: 0;
    font-size: var(--font-size-small);
    color: var(--color-gray-shade-darker);
  }
</style>
