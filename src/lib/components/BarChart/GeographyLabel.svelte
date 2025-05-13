<!-- @component Generates a geography label placed above the bar for the bar chart -->
<script>
  import { urbanColors } from "@urbaninstitute/dataviz-components/utils";
  import { getContext } from "svelte";
  const { data, xGet, yGet, custom, x } = getContext("LayerCake");
  /**
   * @property {Number} containerWidth - The width of the chart container to be used for determining how to best display chart elements.
   */
  let { containerWidth } = $props();
</script>

<g class="geo-label-group" aria-hidden="true" focusable="false" tabindex="-1">
  {#each $data as d, i}
    {@const yOffset = $custom?.offsets?.[i] || 0}
    {@const yPos = $yGet(d) + 15 + yOffset}
    {@const nameLength = d.name.length}
    <text
      fill={urbanColors.black}
      data-id={i}
      x={$custom.negativeFlag ? $xGet({ value: 0 }) : 0}
      text-anchor={$custom.negativeFlag && $x(d) < 0 ? "end" : "start"}
      y={yPos}
      transform={`translate(${$custom.negativeFlag && $x(d) < 0 ? -3 : 3}, 0)`}
      stroke={urbanColors.gray_shade_lightest}
    >
      <!-- if name is above 40 characters and width is small, add ellipsis -->
      {#if nameLength >= 40 && containerWidth < 285}
        {d.name.slice(0, 40 - 3)}...
      {:else}
        <!-- otherwise display as usual -->
        {d.name}
      {/if}
    </text>
  {/each}
</g>

<style>
  text {
    font-size: var(--font-size-small);
    font-family: Lato, sans-serif;
    paint-order: stroke;
    stroke-width: 4px;
    stroke-linejoin: round;
    stroke-linecap: round;
  }
</style>
