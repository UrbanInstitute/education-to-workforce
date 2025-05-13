<script>
  import { LayerCake, Svg, calcExtents } from "layercake";

  import Line from "./Line.svelte";
  import Voronoi from "./Voronoi.svelte";
  import Area from "./Area.svelte";
  import ValueLabel from "./ValueLabel.svelte";
  import AxisLabel from "./AxisLabel.svelte";
  import ZeroAxisMarker from "./ZeroAxisMarker.svelte";
  import SvgDownloadFonts from "../SvgDownloadFonts.svelte";
  let { data, extentGetters, formatType, downloadedFlag, ariaLabel } = $props();

  let extents = $derived(calcExtents(data, extentGetters));

  // let negativeFlag = $state(false);
  let bothPositiveNegativeFlag = $derived.by(() => {
    return (
      data.some((d) => (d["value"] ? d["value"] > 0 : null)) &&
      data.some((d) => (d["value"] ? d["value"] < 0 : null))
    );
  });

  let activeIndex = $state(null);
</script>

<!-- l/r padding to avoid svg cutoff on image download -->
<LayerCake
  padding={{ top: 22, right: bothPositiveNegativeFlag ? 20 : 3, bottom: 20, left: 3 }}
  x={extentGetters.x}
  y={extentGetters.y}
  {data}
  xDomain={extents.x}
  yDomain={extents.y}
  custom={{ formatType }}
>
  <Svg >
    {#if downloadedFlag}
      <SvgDownloadFonts />
    {/if}
    <g role="presentation">
      {#if bothPositiveNegativeFlag}
        <ZeroAxisMarker />
      {/if}
      {#if !bothPositiveNegativeFlag}
        <Area />
      {/if}
      <Line />
      <Voronoi bind:activeIndex />
      <ValueLabel highlightItem={activeIndex} showAllLabels={downloadedFlag} />
      <AxisLabel />
    </g>
  </Svg>
</LayerCake>
