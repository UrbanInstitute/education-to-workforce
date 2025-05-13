<!-- @component Generates a fixed height bar for the bar chart -->
<script>
  import { urbanColors } from "@urbaninstitute/dataviz-components/utils";
  import { getContext } from "svelte";

  const { data, xGet, yGet, xScale, custom, x, } = getContext("LayerCake");

</script>

<g class="bar-group" aria-hidden="true" focusable="false" tabindex="-1">
  {#each $data as d, i}
    {@const yOffset = $custom?.offsets?.[i] || 0}
    {@const y = $yGet(d) + 20 + yOffset}
    {@const height = 18}
    {@const fill = urbanColors.blue}
    {#if $x(d) !== null}
      {#if !$custom.negativeFlag}
        <rect data-id={i} x={$xScale.range()[0]} {y} {height} width={$xGet(d)} {fill}></rect>
      {:else}
        <rect
          data-id={i}
          x={$x(d) < 0 ? $xGet(d) : $xGet({ value: 0 })}
          {y}
          {height}
          width={$x(d) < 0 ? $xGet({ value: 0 }) - $xGet(d) : $xGet(d) - $xGet({ value: 0 })}
          {fill}
        ></rect>
      {/if}
    {/if}
  {/each}
</g>
