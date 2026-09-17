<!-- A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review. -->

<!-- @component
Hover layer for the combined multi-series line chart (ported from
TrendlineChart/Voronoi.svelte): cells are computed from every non-null point across all
series, and hovering a cell activates that single nearest point — the chart highlights
its series (dimming the rest) and reveals its value as a direct label. `active` carries
the point's series and chart coordinates so the chart can render the ring marker and
route the highlight.
-->
<script>
  import { getContext } from "svelte";
  import { uniques } from "layercake";
  import { Delaunay } from "d3-delaunay";

  const { xGet, yGet, width, height } = getContext("LayerCake");

  /**
   * @type {{
   *   series: import("$utils/getChartData").TrendSeries[],
   *   active?: { year: number, x: number, y: number, series: import("$utils/getChartData").TrendSeries } | null
   * }}
   */
  let { series, active = $bindable(null) } = $props();

  const points = $derived(
    series.flatMap((s) =>
      s.values
        .filter((v) => v.value !== null && v.value !== undefined)
        .map((v) => Object.assign([$xGet(v), $yGet(v)], { data: v, series: s }))
    )
  );

  // Delaunay breaks on duplicate coordinates, so coincident cross-series points dedupe
  // to the first in series order (primary → comparison → references) — hovering an
  // exact overlap attributes it to the highest-priority series, which is what we want.
  const uniquePoints = $derived(uniques(points, (/** @type {number[]} */ d) => d.join(), false));

  // d3-delaunay rejects degenerate bounds — skip while the container has no size
  // (initial mount, hidden/deferred cards, jsdom)
  const voronoi = $derived(
    uniquePoints.length > 0 && $width > 0 && $height > 0
      ? Delaunay.from(uniquePoints).voronoi([0, 0, $width, $height])
      : null
  );
</script>

{#if voronoi}
  {#each uniquePoints as point, i (point.join())}
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <path
      class="voronoi-cell"
      d={voronoi.renderCell(i)}
      role="presentation"
      onmouseleave={() => (active = null)}
      onmouseover={() =>
        (active = { year: point.data.year, x: point[0], y: point[1], series: point.series })}
      onfocus={() =>
        (active = { year: point.data.year, x: point[0], y: point[1], series: point.series })}
    ></path>
  {/each}
{/if}

<style>
  .voronoi-cell {
    fill: none;
    stroke: none;
    pointer-events: all;
    outline: none;
  }
</style>
