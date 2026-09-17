<!-- A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review. -->

<!-- @component
One reference tick on a bar's track, positioned at its value (solid = parent state,
dotted = national).

The dotted variant draws a real dash pattern as an inline <svg> <line> with
stroke-dasharray + round caps, not a CSS dashed border or gradient: html2canvas 1.4.1
renders dashed/dotted CSS borders as solid and ignores repeating-linear-gradient, but
inline SVG strokes (dash pattern and round caps included) rasterize faithfully through
capture — the same technique the line chart (marks/Line.svelte) and ChartLegend use.
-->
<script>
  import { getContext } from "svelte";

  const { xScale } = getContext("LayerCake");

  /**
   * @type {{
   *   value: number,
   *   variant: "solid" | "dotted",
   *   color: string,
   *   height?: number,
   *   dimmed?: boolean
   * }}
   */
  let { value, variant, color, height = 24, dimmed = false } = $props();
</script>

<div
  class="tick"
  class:dimmed
  style:left="{$xScale(value)}%"
  style:background-color={variant === "solid" ? color : undefined}
>
  {#if variant === "dotted"}
    <!-- viewBox height matches the height prop track so dash units resolve 1:1 to px
         (dasharray "4 9" -> 4px dashes / 9px gaps). preserveAspectRatio="none" lets the
         line span the full wrapper height if the track height ever changes, degrading
         gracefully instead of leaving a gap; non-scaling-stroke keeps the dash crisp. -->
    <svg class="tick-line" viewBox="0 0 4 {height}" preserveAspectRatio="none" aria-hidden="true">
      <line
        x1="2"
        y1="0"
        x2="2"
        y2={height}
        stroke={color}
        stroke-width="4"
        stroke-linecap="round"
        stroke-dasharray="4 9"
        stroke-dashoffset="-2"
        vector-effect="non-scaling-stroke"
      />
    </svg>
  {/if}
</div>

<style>
  /* ticks span exactly the track/bar height */
  .tick {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 4px;
    transform: translateX(-50%);
    z-index: 3;
    /* hover-dim to match the line chart's treatment; downloads never dim */
    transition: opacity 100ms ease-out;
  }
  .tick.dimmed {
    opacity: 0.33;
  }
  /* fill the 4px wrapper; the extra width around the 2px stroke leaves room for the
     round dash caps */
  .tick-line {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
