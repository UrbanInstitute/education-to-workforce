<!-- A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review. -->

<!-- @component
X-axis year labels (ported from TrendlineChart/AxisLabel.svelte): iterates a `years`
prop instead of the LayerCake context data, which now holds every series' points and so
duplicates each year. Keeps the width-responsive year format ('21 vs 2021).
-->
<script>
  import { getContext } from "svelte";

  const { xScale, yScale, width } = getContext("LayerCake");

  /** @type {{ years: number[] }} */
  let { years } = $props();

  // Approx. horizontal room each label needs to clear its neighbour. Full four-digit
  // years (shown when wide) are wider than the '21 short form used on narrow cards.
  const minLabelPx = $derived($width > 600 ? 52 : 38);

  // On narrow cards every year would collide (e.g. 2013–2022 overlapping at the edges),
  // so thin to as many evenly-spaced labels as fit, always keeping the first and last.
  const shownIndices = $derived.by(() => {
    const n = years.length;
    const maxLabels = Math.max(2, Math.floor($width / minLabelPx));
    if (n <= maxLabels) {
      return new Set(years.map((_, i) => i));
    }
    const chosen = new Set();
    for (let k = 0; k < maxLabels; k++) {
      chosen.add(Math.round((k * (n - 1)) / (maxLabels - 1)));
    }
    return chosen;
  });

  /** @param {number} i */
  function textAnchor(i) {
    if (years.length === 1) {
      // single-year charts run the full-dataset x-domain (MultiLineChart), so the lone
      // label anchors away from whichever edge its year is nearest
      return $xScale(years[0]) > $width / 2 ? "end" : "start";
    }
    if (i === 0) {
      return "start";
    }
    if (i === years.length - 1) {
      return "end";
    }
    return "middle";
  }

  // convert year to 'XX format based on width
  /**
   * @param {number} year
   * @param {number} i
   */
  function yearLabel(year, i) {
    // if it's very large or it's the first tick and width is decently large, use full year
    if ($width > 600 || (i == 0 && $width > 350)) {
      return year;
    }
    return "'" + year.toString().substring(2, 4);
  }
</script>

<g class="axis-label-group" aria-hidden="true">
  {#each years as year, i (year)}
    {#if shownIndices.has(i)}
      <text x={$xScale(year) + 3} y={$yScale.range()[0]} dy={15} text-anchor={textAnchor(i)}
        >{yearLabel(year, i)}</text
      >
    {/if}
  {/each}
</g>

<style>
  text {
    font-size: var(--font-size-small);
    font-family: var(--font-family-sans);
    paint-order: stroke;
    fill: var(--color-gray-shade-darker);
    stroke: var(--color-gray-shade-lightest);
    stroke-width: 4px;
    stroke-linejoin: round;
    stroke-linecap: round;
  }
</style>
