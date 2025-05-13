<!--
  @component
  Generates a voronoi layer using [d3-delauney](https://github.com/d3/d3-delauney).
 -->
<script>
  import { getContext } from 'svelte';
  import { uniques } from 'layercake';
  import { Delaunay } from 'd3-delaunay';

  const { data, xGet, yGet, y, width, height } = getContext('LayerCake');

  let { stroke = undefined, activeIndex = $bindable(null) } = $props();

  let filteredData = $derived($data.filter((d) => $y(d) !== null));
  let points = $derived(filteredData.map(d => {
    const point = [$xGet(d), $yGet(d)];
    point.data = d;
    return point;
  }));

  let uniquePoints = $derived(uniques(points, d => d.join(), false));

  let voronoi = $derived(Delaunay.from(uniquePoints).voronoi([0, 0, $width, $height]));
</script>

{#each uniquePoints as point, i}
  <path
    style="stroke: {stroke}"
    class="voronoi-cell"
    d={voronoi.renderCell(i)}
    onmouseleave={() => {
      activeIndex = null;
    }}
    onmouseover={() => {
      activeIndex = i;
    }}
    onfocus={() => {
      activeIndex = i;
    }}
    role="tooltip"
  ></path>
{/each}

<style>
  .voronoi-cell {
    fill: none;
    stroke: none;
    pointer-events: all;
    outline: none;
  }
</style>
