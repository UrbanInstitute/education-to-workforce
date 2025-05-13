<!-- @component Generates an SVG line shape. -->
<script>
  import { getContext } from "svelte";
  import { urbanColors } from "@urbaninstitute/dataviz-components/utils";
  import { area } from "d3-shape";

  const { data, xGet, yGet, yScale, y } = getContext("LayerCake");

  let path = $derived(
    area()
      .x($xGet)
      .y1($yGet)
      .y0((d) => $yScale.range()[0])
      .defined((d) => !isNaN($yGet(d)))
  );

  // filter out missing values for continuous area
  let filteredData = $derived($data.filter((d) => !isNaN($yGet(d))));
</script>

<g class="area">
  <path class="path-area" d={path(filteredData)} fill={urbanColors.blue_shade_lightest}></path>
</g>
