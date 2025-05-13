<script>
  import "@urbaninstitute/dataviz-components/style"; // import _normalize.css and _typography.css (urban-specific classes)
  import { Button, Meta } from "@urbaninstitute/dataviz-components";
  import { getAbsoluteUrl } from "$lib/utils/urls.js";
  import Chart from "$components/Chart.svelte";

  /** @type {any[]} */
  let buttons = [];

  const triggerAll = async () => {
    for (let button of buttons) {
      await button.handleExport();
    }
  };
</script>

<Meta
  title="DataViz@URBAN"
  description="SvelteKit-powered starter template for data viz projects"
  publishDate="2024-01-01"
  socialImage={getAbsoluteUrl("social.jpg")}
/>
<main>
  {#each Array(3) as _, i}
    <Chart id={i + 1} bind:this={buttons[i]} />
  {/each}
  <div style="align-content:center;">
    <Button on:click={triggerAll}>Save all</Button>
  </div>
</main>

<style>
  main {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    margin: 0 auto;
  }
</style>
