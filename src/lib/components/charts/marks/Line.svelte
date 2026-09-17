<!-- A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review. -->

<!-- @component
One trend series line (ported from TrendlineChart/Line.svelte, generalized for the
multi-series combined chart): receives its series' values/color/dash as props instead of
iterating LayerCake's context data, which now holds the flat concat of every series.
Solid series draw a dashed connector across null gaps under the solid segments; dashed
reference series draw one continuous path (a gap connector would be indistinguishable
from the dash pattern). Point markers render on solid series only.
-->
<script>
  import { getContext } from "svelte";

  const { xGet, yGet } = getContext("LayerCake");

  /**
   * @type {{
   *   values: { year: number, value: number | null }[],
   *   color: string,
   *   dash?: string | null,
   *   markers?: boolean,
   *   dimmed?: boolean
   * }}
   */
  let { values, color, dash = null, markers = true, dimmed = false } = $props();

  const hasValue = (/** @type {{ value: number | null }} */ v) =>
    v.value !== null && v.value !== undefined;

  const nonNull = $derived(values.filter(hasValue));

  // continuous path through every non-null point (solid series' gap connector; the
  // whole path for dashed reference series)
  const pathContinuous = $derived(
    nonNull.map((v, i) => (i === 0 ? "M" : "L") + $xGet(v) + "," + $yGet(v)).join("")
  );

  // path broken at null gaps (the solid segments)
  const pathBroken = $derived.by(() => {
    const path = values.reduce((acc, v) => {
      if (!hasValue(v)) {
        return acc + (acc.endsWith("M") ? "" : "M");
      }
      return acc + (acc.endsWith("M") ? "" : acc === "" ? "M" : "L") + $xGet(v) + "," + $yGet(v);
    }, "");
    return path.endsWith("M") ? path.slice(0, -1) : path;
  });
</script>

<g class="line" class:dimmed>
  {#if dash === null}
    <path class="path-line" d={pathContinuous} stroke={color} stroke-dasharray="4 4"></path>
    <path class="path-line" d={pathBroken} stroke={color}></path>
  {:else}
    <path class="path-line dash" d={pathContinuous} stroke={color} stroke-dasharray={dash}></path>
  {/if}
  {#if markers}
    {#each nonNull as v (v.year)}
      <circle cx={$xGet(v)} cy={$yGet(v)} r="3" fill={color} />
    {/each}
  {/if}
</g>

<style>
  .path-line {
    fill: none;
    stroke-linejoin: round;
    stroke-linecap: round;
    stroke-width: 3;
  }
  .path-line.dash {
    stroke-width: 2;
  }
  /* group opacity dims the markers along with the paths; downloads never dim */
  .line {
    transition: opacity 100ms ease-out;
  }
  .line.dimmed {
    opacity: 0.33;
  }
</style>
