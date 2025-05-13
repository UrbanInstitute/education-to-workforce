<!-- @component Generates a bar for the bar chart -->
<script>
  import { LayerCake, Svg } from "layercake";
  import { scaleBand } from "d3-scale";
  import Bar from "./Bar.svelte";
  import ValueLabel from "./ValueLabel.svelte";
  import GeographyLabel from "./GeographyLabel.svelte";
  import AxisX from "./AxisX.svelte";
  import { getOffset } from "./getOffset.js";
  import SvgDownloadFonts from "../SvgDownloadFonts.svelte";

  /**
   * @property {Array<{name: string, value: number}>} data - The data to be displayed in the bar chart
   * @property {boolean} stateOnly - A flag to indicate if the dataset is only displaying states
   * @property {boolean} downloadedFlag - A flag to indicate if the chart is being downloaded (controls extra padding)
  * @property {string} ariaLabel - The aria label for the chart
   * @property {string | undefined} [formatType="percent"] - The format type for the values (accepts: "percent", "currency", and undefined for "numeric").
   */
  let { data, stateOnly, downloadedFlag, ariaLabel, formatType = undefined } = $props();

  let offsets = $derived(data.map((_, i) => getOffset(i, data.length, stateOnly)));
  let cumulativeOffsets = $derived(offsets.map((offset, i) => {
    let previousItems = offsets.slice(0, i);
    let previousTotal = previousItems.reduce((acc, val) => acc + val, 0);
    return previousTotal + offset;
  }));
  let totalOffset = cumulativeOffsets[cumulativeOffsets.length - 1] || 0;

  const xKey = "value";
  const yKey = "name";
  let xDomain = $state([0, null]);
  let negativeFlag = $state(false);

  $effect(() => {
    // setup negativeFlag to detect if there are any negative values
    negativeFlag = data.some((d) => (d[xKey] ? d[xKey] < 0 : null));
    let somePositive = data.some((d) => (d[xKey] ? d[xKey] > 0 : null));
    // if there are only negative values, stop the x axis at 0
    if (negativeFlag && !somePositive) xDomain = [null, 0];
    // if there are a mix of positive and negative values, set the x axis to the max and min values
    if (negativeFlag && somePositive) xDomain = [null, null];
  });

  // get tick count based on width
  const getTickCount = (
    /** @type {{ ticks: (arg0: number) => any; }} */ xScale,
    /** @type {number} */ width
  ) => {
    let ticks;
    switch (true) {
      case width < 320:
        ticks = 3;
        break;
      case width >= 300 && width < 500:
        ticks = 5;
        break;
      case width >= 500:
        ticks = 8;
        break;
      default:
        ticks = 5;
    }
    return xScale.ticks(ticks);
  };
</script>

<div class="chart-container" style:height={(data.length * 60 ) + "px"}>
  <!-- l/r padding to avoid svg cutoff on image download -->
  <!-- scaleBand: align(0) sets alignment to top, paddingOuter(0.1) sets bottom padding -->
  <LayerCake
    {data}
    padding={{ right: downloadedFlag ? 47.5 : 40, bottom: 20, left: negativeFlag ? 40 : 3 }}
    x={xKey}
    y={yKey}
    yScale={scaleBand().align(0).paddingOuter(0)}
    yDomainSort={false}
    {xDomain}
    custom={{ stateOnly, formatType, negativeFlag, offsets: cumulativeOffsets }}
    let:xScale
    let:containerWidth
  >
    <Svg label={ariaLabel}>
      <!-- {#if downloadedFlag} -->
      <!--   <SvgDownloadFonts /> -->
      <!-- {/if} -->
      <g role="presentation">
        <AxisX ticks={getTickCount(xScale, containerWidth)} snapLabels />
        <GeographyLabel {containerWidth} />
        <Bar />
        <ValueLabel />
      </g>
    </Svg>
  </LayerCake>
</div>

<style>
  .chart-container {
    width: 100%;
  }
</style>
