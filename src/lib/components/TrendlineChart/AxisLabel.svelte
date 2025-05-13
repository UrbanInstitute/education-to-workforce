<!-- @component Generates a value label placed at the end of the bar for the bar chart -->
<script>
  import { getContext } from "svelte";

  const { data, xGet, yScale, x, width } = getContext("LayerCake");

  function textAnchor(i) {
    if (i === 0) {
      return "start";
    }
    if (i === $data.length - 1) {
      return "end";
    }
    return "middle";
  }

  // convert year to 'XX format based on width
  /**
   * @param {{ year: { toString: () => string; }; }} d
   * @param {number} i
   */
  function yearLabel(d, i) {
    // if it's very large or it's the first tick and width is decently large, use full year
    if ($width > 600 || (i == 0 && $width > 350)) {
      return d.year;
    } else {
      return "'" + d.year.toString().substring(2, 4);
    }
  }
</script>

<g class="axis-label-group" aria-hidden="true" focusable="false" tabindex="-1">
  {#each $data as d, i}
    {#if $x(d) !== null}
      <text data-id={i} x={$xGet(d) + 3} y={$yScale.range()[0]} dy={15} text-anchor={textAnchor(i)}
        >{yearLabel(d, i)}</text
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
