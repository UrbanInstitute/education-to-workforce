<!-- A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review. -->

<!-- @component
Per-subgroup facet line charts (lines.jpg, bottom half): one compact MultiLineChart per
subgroup, all sharing the card-wide y-domain so values compare across subgroups. The
role legend renders once at the card level, not here. Subgroups with no data anywhere
(noData) render a compact "N/A" box instead of mounting a chart — a bare-axes facet
reads as broken rather than empty. isDownload passes through to every facet for SVG
font embedding and all-point labels.

Signals render-readiness for the download handshake via readySignal on the root: the
container's size settles only after every facet lays out, so a single root signal is
equivalent to waiting on the last subgroup.
-->
<script>
  import MultiLineChart from "./MultiLineChart.svelte";
  import { readySignal } from "$utils/readySignal";

  /**
   * Accepts the spread of getDisaggregatedData (timeframe "all").
   * @type {{
   *   subgroups: {
   *     field: string,
   *     label: string,
   *     series?: import("$utils/getChartData").TrendSeries[],
   *     noData: boolean
   *   }[],
   *   domain: [number, number],
   *   formatType?: string,
   *   isDownload?: boolean,
   *   onready?: () => void
   * }}
   */
  let {
    subgroups,
    domain,
    formatType = undefined,
    isDownload = false,
    onready = undefined
  } = $props();
</script>

<div class="disaggregated-trends" {@attach readySignal(onready)}>
  {#each subgroups as subgroup (subgroup.field)}
    <div class="subgroup" role="group" aria-label={subgroup.label}>
      <div class="subgroup-label">{subgroup.label}</div>
      {#if subgroup.noData}
        <div class="facet-empty">N/A</div>
      {:else}
        <MultiLineChart
          series={subgroup.series ?? []}
          yDomain={domain}
          {formatType}
          variant="facet"
          {isDownload}
        />
      {/if}
    </div>
  {/each}
</div>

<style>
  .disaggregated-trends {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }
  .subgroup-label {
    font-size: var(--font-size-small);
    font-family: var(--font-family-sans);
    margin-bottom: var(--spacing-1);
  }
  .facet-empty {
    min-height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-gray-shade-lightest);
    color: var(--color-gray-shade-darker);
    font-size: var(--font-size-small);
    font-family: var(--font-family-sans);
  }
</style>
