<!-- A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review. -->

<!-- @component
The per-card bar set (mockups 3–4): computes the shared x-domain across all bars and
reference ticks, renders one LayerCake per bar row (primary, then comparison) composed
from the bar marks (Track, BarFill, ZeroLine, RefTick, BarValueLabel). Each row carries
a BarHoverLayer that snaps the pointer to the nearest mark: reference ticks get a
tooltip ("Virginia: 20%") pinned to the tick's x, while the bar itself is a noop — its
direct value label already shows the value. While a tick is active, the row's other
marks (bar fill + value label, non-active ticks) dim, matching the line chart's hover
treatment. Rows keep a full contextual aria-label for screen readers.

Each row's LayerCake runs percentRange with zero padding, so the marks position
themselves as percentages of the full-bleed 20px track — the shared xDomain keeps
equal values aligned across rows.

Accepts the spread of getBarGroupData (displayYear is card chrome, rendered by the
card, not here). Signals render-readiness for the download handshake via readySignal.
-->
<script>
  import { LayerCake, Html } from "layercake";
  import { formatFun } from "$utils/formatFun";
  import { readySignal } from "$utils/readySignal";
  import Track from "./marks/Track.svelte";
  import BarFill from "./marks/BarFill.svelte";
  import ZeroLine from "./marks/ZeroLine.svelte";
  import RefTick from "./marks/RefTick.svelte";
  import BarValueLabel from "./marks/BarValueLabel.svelte";
  import BarHoverLayer from "./marks/BarHoverLayer.svelte";
  import ChartTooltip from "./ChartTooltip.svelte";

  /**
   * @type {{
   *   bars: import("$utils/getChartData").BarRow[],
   *   domain: [number, number],
   *   diverging?: boolean,
   *   formatType?: string,
   *   showLabels?: boolean,
   *   onready?: () => void
   * }}
   */
  let {
    bars,
    domain,
    diverging = false,
    formatType = undefined,
    showLabels = true,
    onready = undefined
  } = $props();

  const BAR_HEIGHT = 24;

  // all-null cards produce a degenerate [0, 0] domain; widen it so scale(0) stays at 0%
  const xDomain = $derived(domain[0] === domain[1] ? [domain[0], domain[0] + 1] : domain);

  /** @param {import("$utils/getChartData").BarRow} bar */
  const visibleRefs = (bar) =>
    bar.refs.filter((ref) => ref.value !== null && ref.value !== undefined);

  /** @type {import("./barHover.js").BarActive | null} */
  let active = $state(null);

  /** @param {import("$utils/getChartData").BarRow} bar */
  const rowHasActive = (bar) => active !== null && active.rowRole === bar.role;

  /** @param {import("$utils/getChartData").BarRow} bar */
  const rowLabel = (bar) =>
    [bar, ...bar.refs]
      .map((d) => `${"name" in d ? d.name : d.label}: ${formatFun(d.value, formatType)}`)
      .join(". ") + ".";
</script>

<div class="bar-group" {@attach readySignal(onready)} style="--bar-height: {BAR_HEIGHT}px">
  {#each bars as bar (bar.role)}
    <div class="bar-row" role="img" aria-label={rowLabel(bar)}>
      {#if showLabels}
        <div class="name">{bar.name}</div>
      {/if}
      <div class="track-frame">
        <LayerCake percentRange={true} {xDomain} custom={{ formatType }}>
          <Html>
            <Track />
            <BarFill value={bar.value} color={bar.color} dimmed={rowHasActive(bar)} />
            {#if diverging}
              <ZeroLine />
            {/if}
            {#each visibleRefs(bar) as ref (ref.role)}
              <RefTick
                value={ref.value ?? 0}
                variant={ref.variant}
                color={ref.color}
                dimmed={rowHasActive(bar) && !(active?.refs ?? []).some((r) => r.role === ref.role)}
              />
            {/each}
            <BarValueLabel
              value={bar.value}
              tickValues={visibleRefs(bar).map((ref) => ref.value ?? 0)}
              dimmed={rowHasActive(bar)}
            />
            <BarHoverLayer
              rowRole={bar.role}
              barValue={bar.value}
              refs={visibleRefs(bar)}
              bind:active
            />
          </Html>
        </LayerCake>
      </div>
    </div>
  {/each}
  {#if active}
    <ChartTooltip el={active.el}>
      <div class="tooltip-values">
        {#each active.refs as ref (ref.role)}
          <div><strong>{ref.label}:</strong> {formatFun(ref.value, formatType)}</div>
        {/each}
      </div>
    </ChartTooltip>
  {/if}
</div>

<style>
  .bar-group {
    position: relative;
    display: flex;
    flex-direction: column;
    /* spacing between the two geography rows when comparing (single-geography charts have
       just one row, so this has no effect there) */
    gap: var(--spacing-4);
  }
  .name {
    font-size: var(--font-size-small);
    font-family: var(--font-family-sans);
    margin-bottom: var(--spacing-1);
  }
  .track-frame {
    height: var(--bar-height, 24px);
  }
  .tooltip-values {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
</style>
