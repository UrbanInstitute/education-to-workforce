<!-- @component Generates a value label placed at the end of the bar for the bar chart -->
<script>
  import { getContext } from "svelte";
  import { formatFun } from "$utils/formatFun";

  const { data, xGet, yGet, xScale, custom, x } = getContext("LayerCake");
</script>

<g class="value-label-group" aria-hidden="true" focusable="false" tabindex="-1">
  {#each $data as d, i}
    {@const yOffset = $custom?.offsets?.[i] || 0}
    {@const y = $yGet(d) + 34.25 + yOffset}
    {#if $x(d) !== null}
      {#if !$custom.negativeFlag}
        <text data-id={i} x={$xGet(d) + 3} {y}>{formatFun($x(d), $custom.formatType)}</text>
      {:else}
        <text
          data-id={i}
          x={$x(d) < 0 ? $xGet(d) - 3 : $xGet(d) + 3}
          {y}
          text-anchor={$x(d) < 0 ? "end" : "start"}
          >{formatFun($x(d), $custom.formatType)}
        </text>
      {/if}
    {:else}
      <text class="no-data" x={$xScale.range()[0]} {y}>No data available</text>
    {/if}
  {/each}
</g>

<style>
  text {
    font-family: var(--font-family-sans);
    font-size: var(--font-size-small);
    paint-order: stroke;
    fill: var(--color-black);
    stroke: var(--color-gray-shade-lightest);
    stroke-width: 4px;
    stroke-linejoin: round;
    stroke-linecap: round;
  }

  .no-data {
    fill: var(--color-gray-shade-darker);
    font-size: var(--font-size-normal);
  }
</style>
