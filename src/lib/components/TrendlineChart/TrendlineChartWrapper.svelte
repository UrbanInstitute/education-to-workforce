<script>
  import { calcExtents, flatten } from "layercake";
  import TrendlineChart from "./TrendlineChart.svelte";
  let { data, formatType, ariaLabel, downloadedFlag = false } = $props();

  const extentGetters = {
    x: (d) => d.year,
    y: (d) => d.value
  };
  const fullExtents = calcExtents(flatten(data), extentGetters);
</script>

<div role="figure" aria-label={ariaLabel}>
  {#each data as d, i}
    {@const allEmptyFlag = d.data.every((d) => d.value === null)}
    <div class="name">{d.name}{allEmptyFlag ? ": No data available" : null}</div>
    {#if !allEmptyFlag}
      <div class="small-multiple-container" >
        <TrendlineChart data={d.data} {fullExtents} {extentGetters} {formatType} {downloadedFlag} />
      </div>
    {/if}
    {#if i !== data.length - 1}
      <hr />
    {/if}
  {/each}
</div>

<style>
  .small-multiple-container {
    display: inline-block;
    width: 100%;
    height: 6rem;
  }

  hr {
    flex: 1; /* Make the lines flexible to fill the space */
    border: none;
    border-top: 1px solid var(--color-gray-shade-medium);
    margin: var(--spacing-1) 0;
    margin-bottom: var(--spacing-2);
  }

  .name {
    margin-bottom: var(--spacing-1);
  }
</style>
