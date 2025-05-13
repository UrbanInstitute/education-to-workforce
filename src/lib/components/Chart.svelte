<script>
  import { Button } from "@urbaninstitute/dataviz-components";
  import html2canvas from "html2canvas";
  import { LogoUrbanWide } from "@urbaninstitute/dataviz-components";

  /**
   * @typedef {Object} Props
   * @property {number} id id of the chart (used for export)
   */

  /** @type {Props} */
  let { id } = $props();

  // setup random bar heights
  const bar1Height = Math.floor(Math.random() * 100);
  const bar2Height = Math.floor(Math.random() * 100);

  // setup export flag and ref
  let exportFlag = $state(false);

  /** @type {HTMLElement} */
  let exportRef;

  // handle export flag and download
  export const handleExport = () => {
    // set export flag to true to show export div
    exportFlag = true;

    return new Promise((resolve, reject) => {
      // wait for export div to render
      setTimeout(() => {
        // if export flag is true and export ref is available, export the chart
        // if (exportFlag && exportRef) {
        html2canvas(exportRef, {
          scale: 2,
          // filter out elements that should not be included in the image
          ignoreElements: (el) => el.classList.contains("button-container")
        }).then((canvas) => {
          try {
            const a = document.createElement("a");
            a.href = canvas.toDataURL("image/png").replace("image/jpeg", "image/octet-stream");
            a.download = `test-id-${id}.png`;
            a.click();
            // turn off export flag when done
            exportFlag = false;
            resolve({ success: true });
          } catch {
            reject({ success: false });
          }
        });
        // }
      }, 50);
    });
  };
</script>

<!-- declare the chart snippet -->
{#snippet chart()}
  <div class="chart">
    <div class="bar-container">
      <div class="bar" style="width: {bar1Height}%;">1</div>
      <div class="bar" style="width: {bar2Height}%;">2</div>
    </div>
    <div class="button-container" style="margin-top:.5rem;">
      <Button variant="secondary" on:click={handleExport}>Save image</Button>
    </div>
  </div>
{/snippet}

<!-- render the chart -->
{@render chart()}

<!-- export chart zone (function filters out button) -->
<div id={`exported-chart-${id}`} class="offscreen-chart" bind:this={exportRef}>
  {#if exportFlag}
    {@render chart()}
    <div style="display:flex; float:right; margin-right:.25rem;">
      <LogoUrbanWide />
    </div>
    <div style="margin-left:.25rem;">
      <div>Source: Ea ut sunt do eiusmod est consectetur veniam ex.</div>
      <div>Notes: Sit nulla est tempor est ex.</div>
    </div>
  {/if}
</div>

<style>
  /* OFFSCREEN CHART POSITIONED ABSOLUTELY */
  .offscreen-chart {
    position: absolute;
    left: -50000px;
    width: 1000px;
  }

  .chart {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    height: fit-content;
    padding: 0.5rem;
    margin: 0.25rem;
    border: 1px solid grey;
  }

  .bar-container {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .bar {
    height: 50px;
    background-color: var(--color-blue);
    text-align: center;
    color: var(--color-white);
    align-content: center;
  }
</style>
