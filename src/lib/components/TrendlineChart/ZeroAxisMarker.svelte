<!-- @component Generates an SVG line shape. -->
<script>
  import { getContext } from "svelte";
  import { urbanColors } from "@urbaninstitute/dataviz-components/utils";
  import { formatFunAxis } from "$utils/formatFun";

  const { xGet, yGet, extents, custom } = getContext("LayerCake");
</script>

<g class="zero-axis-marker" aria-hidden="true" focusable="false" tabindex="-1">
  <line
    x1={$xGet({ year: $extents["x"][0] })}
    y1={$yGet({ value: 0 })}
    x2={$xGet({ year: $extents["x"][1] }) + 3}
    y2={$yGet({ value: 0 })}
    stroke={urbanColors.gray_shade_dark}
  />
  <text x={$xGet({ year: $extents["x"][1] }) + 8} y={$yGet({ value: 0 }) + 4.5} text-anchor="start"
    >{formatFunAxis(0, $custom.formatType)}</text
  >
</g>

<style>
  line {
    fill: none;
    stroke-linejoin: round;
    stroke-linecap: round;
    stroke-width: 1;
  }

  text {
    font-family: var(--font-family-sans);
    font-size: var(--font-size-small);
    fill: var(--color-black);
  }
</style>
