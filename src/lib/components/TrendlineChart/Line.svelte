<!-- @component Generates an SVG line shape. -->
<script>
  import { getContext } from "svelte";
  import { urbanColors } from "@urbaninstitute/dataviz-components/utils";

  const { data, xGet, yGet } = getContext("LayerCake");

  function cleanPath(pathString) {
    let result = pathString.replaceAll("ML", "M");
    if (!result.startsWith("M")) {
      result = "M" + result;
    }
    if (result.endsWith("M")) {
      return result.slice(0, -1);
    } else {
      return result;
    }
  }

  let pathMissing = $derived(
    cleanPath(
      $data
        .map((d, i) => {
          if (isNaN($yGet(d))) {
            return i === 0 ? "M" : "";
          }
          return (i === 0 ? "M" : "L") + $xGet(d) + "," + $yGet(d);
        })
        .join("")
    )
  );

  let pathGaps = $derived(
    cleanPath(
      $data.reduce((acc, curr) => {
        if (isNaN($yGet(curr))) {
          return acc + (acc.endsWith("M") ? "" : "M");
        } else {
          return acc + (acc.endsWith("M") ? "" : "L") + $xGet(curr) + "," + $yGet(curr);
        }
      }, "M")
    )
  );
</script>

<g class="line">
  <!-- line -->
  <path class="path-line" d={pathMissing} stroke={urbanColors.blue} stroke-dasharray="4 4"></path>
  <path class="path-line" d={pathGaps} stroke={urbanColors.blue}></path>
  <!-- points -->
  {#each $data as d, i}
    {#if !isNaN($yGet(d))}
      <circle
        cx={$xGet(d)}
        cy={$yGet(d)}
        r="3"
        fill={urbanColors.blue}
      />
    {/if}
  {/each}
</g>

<style>
  .path-line {
    fill: none;
    stroke-linejoin: round;
    stroke-linecap: round;
    stroke-width: 2;
  }

  circle {
    cursor: pointer;
  }
</style>
