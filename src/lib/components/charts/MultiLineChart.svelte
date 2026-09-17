<!-- A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review. -->

<!-- @component
The combined multi-series trendline chart (lines.jpg): one LayerCake instance fed the
flat concat of every series' points (so x/y domains are the cross-series union), with
per-series marks receiving their series as props. Solid series (primary/comparison) get
point markers and first/last value labels; dashed reference series (states, national)
draw lines only. A voronoi layer across all series snaps hover to the single nearest
point: its series stays at full strength while the others dim, and the point's value
appears as a direct label above a ring marker — no tooltip (direct-label convention).

variant selects the sizing: "single" (default) for the standalone shared-axes chart,
"facet" for the compact per-subgroup small multiples (shorter, with slimmer top padding
since the domain headroom keeps value labels clear of the edge). The height prop
overrides either default; showValueLabels / showMarkers are further compact hooks.
-->
<script>
  import { LayerCake, Svg } from "layercake";
  import Line from "./marks/Line.svelte";
  import Voronoi from "./marks/Voronoi.svelte";
  import ValueLabel from "./marks/ValueLabel.svelte";
  import AxisLabel from "./marks/AxisLabel.svelte";
  import AxisY from "./marks/AxisY.svelte";
  import SvgDownloadFonts from "$components/SvgDownloadFonts.svelte";
  import { formatFunAxis } from "$utils/formatFun";
  import { readySignal } from "$utils/readySignal";
  import { FULL_DATA_YEAR_RANGE } from "$utils/consts";
  import { ticks as d3Ticks } from "d3-array";

  /**
   * @type {{
   *   series: import("$utils/getChartData").TrendSeries[],
   *   formatType?: string,
   *   yDomain?: [number, number],
   *   variant?: "single" | "facet",
   *   showValueLabels?: boolean,
   *   showMarkers?: boolean,
   *   height?: number,
   *   isDownload?: boolean,
   *   onready?: () => void
   * }}
   */
  let {
    series,
    formatType = undefined,
    yDomain = undefined,
    variant = "single",
    showValueLabels = true,
    showMarkers = true,
    height = undefined,
    isDownload = false,
    onready = undefined
  } = $props();

  // downloads render into the export container's fixed 800px width, so the single
  // variant takes a taller default there to keep roughly the on-screen aspect ratio
  const effectiveHeight = $derived(height ?? (variant === "facet" ? 150 : isDownload ? 300 : 180));
  // Facets can run a slimmer top gutter: the y-domain always carries ≥ ~17% headroom
  // above the max point (computeDomain / the fallback below), which absorbs most of a
  // value label's ~19px reach above its point.
  const topPadding = $derived(variant === "facet" ? 12 : 22);

  const points = $derived(series.flatMap((s) => s.values));
  const plottedValues = $derived(
    points.map((p) => p.value).filter((v) => v !== null && v !== undefined)
  );
  // Zero-anchored with 20% headroom, so the always-on zero baseline has meaning and the
  // extreme lines never touch the plot edges: positive-only data pins the bottom at 0
  // (the baseline is the chart floor, per lines.jpg); once negatives are present both
  // ends get padding and the baseline sits mid-chart. The yDomain prop overrides for
  // shared-domain small multiples (Phase 6 disaggregated trends).
  const effectiveYDomain = $derived.by(() => {
    if (yDomain) return yDomain;
    if (plottedValues.length === 0) return [0, 1];
    const dataMin = Math.min(...plottedValues);
    const dataMax = Math.max(...plottedValues);
    if (dataMin >= 0) {
      if (dataMax <= 0) return [0, 1];
      // Mirror computeDomain: true "percent" metrics cap at 100% (their logical max),
      // while "percent_hundredths" ratios can legitimately exceed 100% and stay uncapped.
      const top = dataMax * 1.2;
      return [0, formatType === "percent" ? Math.min(1, top) : top];
    }
    const top = Math.max(0, dataMax);
    const pad = 0.2 * (top - dataMin);
    return [dataMin - pad, top + pad];
  });
  // Same tick algorithm as the linear yScale's ticks(4), computed here so the left
  // padding can be sized to the widest formatted label ("−5.00%" needs far more room
  // than "60%"). Passed to AxisY so the axis and the padding never disagree.
  const yTicks = $derived(d3Ticks(effectiveYDomain[0], effectiveYDomain[1], 4));
  const leftPadding = $derived.by(() => {
    const maxChars = Math.max(0, ...yTicks.map((t) => formatFunAxis(t, formatType).length));
    // ~7.5px per character at font-size-small Lato, plus the 8px label gap and a buffer
    return Math.max(24, Math.ceil(14 + maxChars * 7.5));
  });
  const uniqueYears = $derived([...new Set(points.map((p) => p.year))].sort((a, b) => a - b));
  // a single-year chart would otherwise get a degenerate [year, year] x-domain that
  // centers the point; pin it to the dataset's full year range so the point sits at
  // its true position on the shared timeline (settled 2026-07-15)
  const xDomain = $derived(uniqueYears.length > 1 ? undefined : FULL_DATA_YEAR_RANGE);
  // draw order: references first so the primary series renders on top
  const drawSeries = $derived(series.slice().reverse());

  // each solid series' endpoint labels must dodge the other solid series' (primary
  // and comparison are the only two); dashed references label on hover only
  const endpointLabelSeries = $derived(
    showValueLabels ? series.filter((s) => s.dash === null) : []
  );
  /** @param {import("$utils/getChartData").TrendSeries} s */
  const avoidValuesFor = (s) =>
    s.dash === null ? endpointLabelSeries.find((o) => o.role !== s.role)?.values : undefined;

  // A single non-null point draws no path segment, so it must render as a circle or the
  // series is invisible — this is how single-year metrics appear under the all-years
  // timeframe (settled 2026-07-15: circles-only points for every series, references
  // included, instead of falling back to bars).
  /** @param {import("$utils/getChartData").TrendSeries} s */
  const seriesMarkers = (s) =>
    (s.dash === null && showMarkers) ||
    s.values.filter((v) => v.value !== null && v.value !== undefined).length === 1;

  /** @type {{ year: number, x: number, y: number, series: import("$utils/getChartData").TrendSeries } | null} */
  let active = $state(null);
</script>

<div class="multi-line-chart" style:height="{effectiveHeight}px" {@attach readySignal(onready)}>
  <!-- l/r padding avoids svg cutoff on image download; left room fits the y-axis tick labels -->
  <LayerCake
    padding={{ top: topPadding, right: 8, bottom: 20, left: leftPadding }}
    x={(/** @type {{ year: number }} */ d) => d.year}
    y={(/** @type {{ value: number | null }} */ d) => d.value}
    data={points}
    {xDomain}
    yDomain={effectiveYDomain}
    custom={{ formatType }}
  >
    <Svg>
      {#if isDownload}
        <SvgDownloadFonts />
      {/if}
      <g role="presentation">
        <AxisY ticks={yTicks} />
        {#each drawSeries as s (s.role)}
          <Line
            values={s.values}
            color={s.color}
            dash={s.dash}
            markers={seriesMarkers(s)}
            dimmed={active !== null && s.role !== active.series.role}
          />
        {/each}
        <Voronoi {series} bind:active />
        <!-- every series gets a label mark (outside the showValueLabels gate) so the
             hovered point can always show its value; endpoint/download labels stay a
             solid-series, labels-enabled affair -->
        {#each series as s (s.role)}
          <ValueLabel
            values={s.values}
            {formatType}
            activeYear={active?.series.role === s.role ? active.year : null}
            dimmed={active !== null && active.series.role !== s.role}
            showEndpoints={showValueLabels && s.dash === null}
            showAllLabels={isDownload && showValueLabels && s.dash === null}
            avoidValues={avoidValuesFor(s)}
            flipOnTie={s.role === "comparison"}
          />
        {/each}
        <AxisLabel years={uniqueYears} />
        {#if active}
          <circle class="active-marker" cx={active.x} cy={active.y} r="4" />
        {/if}
      </g>
    </Svg>
  </LayerCake>
</div>

<style>
  .multi-line-chart {
    position: relative;
    width: 100%;
  }
  .active-marker {
    fill: none;
    stroke: var(--color-gray-shade-darkest);
    stroke-width: 1.5;
    pointer-events: none;
  }
</style>
