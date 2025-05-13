<script>
  import IconDownload from "$components/Icons/IconDownload.svelte";
  import html2canvas from "html2canvas";
  import DownloadButton from "$components/MetricCard/DownloadButton.svelte";
  import { logClickToGA } from "@urbaninstitute/dataviz-components";

  /**
   * @property {number} id id of the chart (used for export)
   * @property {boolean} multi whether to show the text in plural form or not
   */
  let { id, filename, multi = false, children } = $props();

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
            a.download = `${filename}.png`;
            a.click();
            // turn off export flag when done
            exportFlag = false;
            resolve({success: true});
          } catch {
            reject({success: false});
          }
        });
        // }download
      }, 50);
    });
  };
</script>

<DownloadButton {multi} onclick={(e) => {
  handleExport(e);
  logClickToGA(e.target, "metric-card-download")
  }} />
<!-- exported chart container -->
<div id={`exported-chart-${id}`} class="offscreen-container" bind:this={exportRef}>
  {#if exportFlag}
    {@render children?.()}
  {/if}
</div>

<style>
  /* OFFSCREEN CHART POSITIONED ABSOLUTELY */
  .offscreen-container {
    padding: var(--spacing-4);
    position: absolute;
    left: -50000px;
    width: 1000px;
  }
</style>
