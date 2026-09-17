<!-- A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review. -->

<!-- @component
Y axis with horizontal gridlines and left-side tick labels; a fork of the
@urbaninstitute/dataviz-components AxisY (following the BarChart/AxisX.svelte precedent)
trimmed to linear pixel-mode scales, with ticks formatted through formatFunAxis. Light
gray gridlines and labels; the zero gridline is black (the emphasized baseline).
-->
<script>
  import { getContext } from "svelte";
  import { formatFunAxis } from "$utils/formatFun";

  const { yScale, width, custom } = getContext("LayerCake");

  /**
   * @type {{
   *   ticks?: number | number[]
   * }}
   */
  let { ticks = 4 } = $props();

  const tickVals = $derived(Array.isArray(ticks) ? ticks : $yScale.ticks(ticks));
</script>

<g class="axis y-axis" aria-hidden="true" focusable="false" tabindex="-1">
  {#each tickVals as tick (tick)}
    <g class="tick" transform="translate(0, {$yScale(tick)})">
      <line class="gridline" class:baseline={tick === 0} x1="0" x2={$width} />
      <text x="-8" dy="0.32em" text-anchor="end">{formatFunAxis(tick, $custom.formatType)}</text>
    </g>
  {/each}
</g>

<style>
  .tick line {
    stroke: var(--color-gray);
    stroke-width: 1;
  }

  .tick line.baseline {
    stroke: var(--color-black);
  }

  .tick text {
    font-family: var(--font-family-sans);
    font-size: var(--font-size-small);
    fill: var(--color-black);
  }
</style>
