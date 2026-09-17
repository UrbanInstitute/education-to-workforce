<!-- A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review. -->

<!-- @component
Chart image export (requirements §4.10; replaces MetricCard/Download.svelte and its
setTimeout(50) render-wait). The children snippet receives a ready-callback and is
rendered into a fixed-width offscreen container only while an export runs; renderToBlob
awaits the callback (charts signal it via readySignal once layout settles, raced against
a 15s safety timeout), captures with html2canvas, and returns a PNG Blob. handleExport
adds the download side effect. renderToBlob is exported for the EQ section's
zip-based download-all, which captures every card without firing per-card downloads.

Usage:
  <Download id={metricId} filename="…" bind:this={download}>
    {#snippet children(onready)}
      <BarGroup … {onready} />
    {/snippet}
  </Download>
-->
<script>
  import { tick } from "svelte";
  import { logClickToGA } from "@urbaninstitute/dataviz-components";
  import DownloadButton from "./DownloadButton.svelte";
  import { triggerDownload } from "./triggerDownload.js";

  /**
   * @type {{
   *   id: string | number,
   *   filename: string,
   *   label?: string,
   *   children?: import("svelte").Snippet<[(() => void) | undefined]>
   * }}
   */
  let { id, filename, label = "Download chart image", children } = $props();

  // gates the offscreen render; doubles as the button's isLoading state
  let exportFlag = $state(false);
  /** @type {(() => void) | undefined} the current export's deferred resolver */
  let onreadyCallback = $state(undefined);
  /** @type {HTMLElement | undefined} */
  let exportRef = $state();
  /** @type {Promise<Blob> | undefined} the capture currently running, if any */
  let inFlight = undefined;

  const READY_TIMEOUT_MS = 15000;

  /**
   * Exclude interactive chrome and every offscreen export container except our own
   * (prevents capturing other cards' in-flight exports).
   * @param {Element} element
   */
  export function ignoreElements(element) {
    return (
      element.classList.contains("button-container") ||
      (element.classList.contains("download-image-container") && element !== exportRef)
    );
  }

  /**
   * Render the children offscreen, await their ready signal, and capture a PNG.
   *
   * Not reentrant: `exportFlag` and `onreadyCallback` are per-component, so overlapping
   * captures would share them and the first completion's `finally` would unmount the
   * offscreen render out from under the second — a blank PNG or a 15s timeout when a card's
   * own download button is clicked while "download all" is capturing it. Concurrent callers
   * get the running capture instead; they want the same card's PNG either way.
   * @returns {Promise<Blob>}
   */
  export function renderToBlob() {
    inFlight ??= capture().finally(() => (inFlight = undefined));
    return inFlight;
  }

  /**
   * One offscreen render → PNG cycle. Always call through renderToBlob.
   * @returns {Promise<Blob>}
   */
  async function capture() {
    /** @type {() => void} */
    let resolveReady;
    const ready = new Promise((resolve) => (resolveReady = () => resolve(undefined)));
    /** @type {ReturnType<typeof setTimeout> | undefined} */
    let timer = undefined;
    const timeout = new Promise((resolve) => (timer = setTimeout(resolve, READY_TIMEOUT_MS)));
    onreadyCallback = () => resolveReady();
    exportFlag = true;
    // html2canvas (~50 KB gzip) only runs on an export, so it's a lazy chunk (dev-plan
    // §12.5 #1). Requested here rather than at the await below so it downloads alongside
    // the offscreen render and ready handshake; the module cache makes later exports free.
    const html2canvasLoad = import("html2canvas");
    // a load failure is surfaced by the await below — this only keeps an earlier throw
    // (missing export container) from leaving it unhandled
    html2canvasLoad.catch(() => {});
    try {
      await tick();
      await Promise.race([ready, timeout]);
      if (!exportRef) throw new Error("export container missing");
      const { default: html2canvas } = await html2canvasLoad;
      const canvas = await html2canvas(exportRef, { scale: 2, ignoreElements });
      return await new Promise((resolve, reject) =>
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("canvas.toBlob failed"))),
          "image/png"
        )
      );
    } finally {
      // reset on success AND failure — the old version could leave the flag stuck true
      clearTimeout(timer);
      exportFlag = false;
      onreadyCallback = undefined;
    }
  }

  /**
   * Render and trigger the single-file download.
   * @returns {Promise<{ success: boolean }>}
   */
  export async function handleExport() {
    try {
      const blob = await renderToBlob();
      triggerDownload(blob, `${filename}.png`);
      return { success: true };
    } catch (error) {
      console.error("chart image export failed", error);
      return { success: false };
    }
  }

  /** @param {MouseEvent} e */
  function handleButtonClick(e) {
    logClickToGA(/** @type {HTMLElement} */ (e.currentTarget), "metric-card-download");
    handleExport();
  }
</script>

<DownloadButton {label} onclick={handleButtonClick} isLoading={exportFlag} />

<div class="download-image-container" id="exported-chart-{id}" bind:this={exportRef}>
  {#if exportFlag}
    {@render children?.(onreadyCallback)}
  {/if}
</div>

<style>
  .download-image-container {
    position: absolute;
    left: -50000px;
    /* fixed width defines the export layout independent of viewport */
    width: 800px;
    padding: var(--spacing-4);
    /* explicit background so the PNG isn't transparent */
    background-color: var(--color-white);
  }
</style>
