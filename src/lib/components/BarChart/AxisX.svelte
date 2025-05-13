<!--
  @component
  Generates an SVG x-axis. This component is also configured to detect if your x-scale is an ordinal scale. If so, it will place the markers in the middle of the bandwidth.
 -->
<script>
  import { getContext } from "svelte";
  import { formatFunAxis } from "$utils/formatFun";

  const { width, height, xScale, xDomain, yRange, custom, data } = getContext("LayerCake");

  /** @type {boolean} [tickMarks=false] - Show a vertical mark for each tick. */
  export let tickMarks = false;

  /** @type {boolean} [gridlines=true] - Show gridlines extending into the chart area. */
  export let gridlines = true;

  /** @type {Number} [tickMarkLength=6] - The length of the tick mark. */
  export let tickMarkLength = 6;

  /** @type {boolean} [baseline=false] – Show a solid line at the bottom. */
  export let baseline = false;

  /** @type {boolean} [snapLabels=false] - Instead of centering the text labels on the first and the last items, align them to the edges of the chart. */
  export let snapLabels = false;

  /** @type {Number|Array<any>|Function|undefined} [ticks] - If this is a number, it passes that along to the [d3Scale.ticks](https://github.com/d3/d3-scale) function. If this is an array, hardcodes the ticks to those values. If it's a function, passes along the default tick values and expects an array of tick values in return. If nothing, it uses the default ticks supplied by the D3 function. */
  export let ticks = undefined;

  /** @type {Number} [tickGutter=0] - The amount of whitespace between the start of the tick and the chart drawing area (the yRange min). */
  export let tickGutter = 2;

  /** @type {Number} [dx=0] - Any optional value passed to the `dx` attribute on the text label. */
  export let dx = 0;

  /** @type {Number} [dy=12] - Any optional value passed to the `dy` attribute on the text label. */
  export let dy = 12;

  /**@param {Number} i
   * @param {boolean} sl */
  function textAnchor(i, sl) {
    if (sl === true) {
      if (i === 0 && !$custom.negativeFlag) {
        return "start";
      }
      // MANUAL NOTE: removed "end formatting since there is right padding"
      // if (i === tickVals.length - 1) {
      //   return "end";
      // }
    }
    return "middle";
  }

  $: tickLen = tickMarks === true ? (tickMarkLength ?? 6) : 0;

  $: isBandwidth = typeof $xScale.bandwidth === "function";

  /** @type {Array<any>} */
  $: tickVals = Array.isArray(ticks)
    ? ticks
    : isBandwidth
      ? $xScale.domain()
      : typeof ticks === "function"
        ? ticks($xScale.ticks())
        : $xScale.ticks(ticks);

  $: halfBand = isBandwidth ? $xScale.bandwidth() / 2 : 0;

  /**
   * @param {Array<number>} ticks
   * @returns {boolean}
   */
  function checkSmall(ticks) {
    const testTicks = ticks.map((t) => {
      if ($custom.formatType.includes("percent")) {
        return t * 100;
      }
      return t;
    });
    const isSmall = testTicks.map((t, i) => {
      if (t === 0) {
        return false;
      }
      let prev = ticks[i - 1];
      return t - prev < 1;
    });
    return isSmall.reduce((acc, curr) => acc || curr, false);
  }
</script>

<g class="axis x-axis" class:snapLabels aria-hidden="true" focusable="false" tabindex="-1">
  {#each tickVals as tick, i (tick)}
    {#if baseline === true}
      <line class="baseline" y1={$height} y2={$height} x1="0" x2={$width} />
    {/if}

    <g class="tick tick-{i}" transform="translate({$xScale(tick)},{Math.max(...$yRange)})">
      {#if gridlines === true}
        <line
          class="gridline"
          class:baseline={$custom.negativeFlag ? tick === 0 : tick === $xDomain[0]}
          x1={halfBand}
          x2={halfBand}
          y1={-$height}
          y2="0"
        />
      {/if}
      {#if tickMarks === true}
        <line
          class="tick-mark"
          x1={halfBand}
          x2={halfBand}
          y1={tickGutter}
          y2={tickGutter + tickLen}
        />
      {/if}
      <text x={halfBand} y={tickGutter + tickLen} {dx} {dy} text-anchor={textAnchor(i, snapLabels)}
        >{formatFunAxis(tick, $custom.formatType)}</text
      >
    </g>
  {/each}
</g>

<style>
  text {
    font-family: Lato, sans-serif;
  }
  .tick {
    font-size: var(--font-size-small);
  }

  line,
  .tick line {
    stroke: var(--color-gray-shade-dark);
    stroke-dasharray: 4 4;
  }

  .tick text {
    fill: var(--color-gray-shade-darker);
  }

  .tick .tick-mark,
  line.baseline {
    stroke-dasharray: 0;
    stroke: var(--color-black);
  }
  /* This looks slightly better */
  .axis.snapLabels .tick:last-child text {
    transform: translateX(3px);
  }
  .axis.snapLabels .tick.tick-0 text {
    transform: translateX(-3px);
  }
</style>
