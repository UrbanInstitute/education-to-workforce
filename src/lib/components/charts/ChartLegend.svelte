<!-- A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review. -->

<!-- @component
Chart legend (mockups 3, 4, 8; lines.jpg): one entry per LegendItem from
getBarLegendItems/getTrendLegendItems — filled swatches for bar geographies, solid/dotted
tick glyphs for bar references, line-style strokes for trend series. Wraps to a second
row when entries overflow the card width (mockup 8's five-entry comparison case).

The dotted tick glyph is an inline <svg> <line> with stroke-dasharray + round caps,
mirroring marks/RefTick.svelte so the legend matches the chart mark: a CSS dashed border
or gradient would render solid through html2canvas capture, but inline SVG strokes survive.
-->
<script>
  /** @type {{ items: import("$utils/getChartData").LegendItem[] }} */
  let { items } = $props();
</script>

<ul class="chart-legend">
  {#each items as item}
    <li>
      {#if item.glyph === "swatch"}
        <span class="glyph swatch" style:background-color={item.color}></span>
      {:else if item.glyph === "tick"}
        {#if item.variant === "dotted"}
          <!-- inline svg dash mirrors marks/RefTick.svelte (stroke-dasharray "4 9" + round
               caps); a CSS dashed border/gradient would render solid through html2canvas -->
          <svg
            class="glyph tick-line"
            viewBox="0 0 4 20"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <line
              x1="2"
              y1="0"
              x2="2"
              y2="20"
              stroke={item.color}
              stroke-width="4"
              stroke-linecap="round"
              stroke-dasharray="4 9"
              stroke-dashoffset="-2"
              vector-effect="non-scaling-stroke"
            />
          </svg>
        {:else}
          <span class="glyph tick" style:background-color={item.color}></span>
        {/if}
      {:else}
        <svg class="glyph line" width="20" height="12" aria-hidden="true">
          <line
            x1="0"
            y1="6"
            x2="20"
            y2="6"
            stroke={item.color}
            stroke-width="2"
            stroke-dasharray={item.dash}
          />
        </svg>
      {/if}
      <span class="label">{item.label}</span>
    </li>
  {/each}
</ul>

<style>
  /* doubled class outguns the Theme's `.theme ul { padding-left: 1em }` — Svelte 5's
     :where() scoping keeps a single class at (0,1,0), which loses to it */
  .chart-legend.chart-legend {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    column-gap: var(--spacing-4);
    row-gap: var(--spacing-2);
  }
  li {
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
  }
  .label {
    font-size: 0.75rem;
    font-family: var(--font-family-sans);
    color: var(--color-gray-shade-darkest);
    white-space: nowrap;
  }
  .glyph {
    flex-shrink: 0;
  }
  .swatch {
    width: 14px;
    height: 14px;
  }
  /* solid tick: a colored bar, matching marks/RefTick.svelte's solid variant */
  .tick {
    width: 4px;
    height: 20px;
  }
  /* dotted tick: inline svg dash line, sized 1:1 to its viewBox so "4 9" renders true.
     Taller than the swatch so enough of the dash pattern shows to read as dotted. */
  .tick-line {
    display: block;
    width: 4px;
    height: 20px;
  }
  .line {
    display: block;
  }
</style>
