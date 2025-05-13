<script>
  import IconInformation from "$components/Icons/IconInformation.svelte";
  import { Tooltip } from "@urbaninstitute/dataviz-components";
  /**
   * @property {import("$utils/types/MetricMetadataObject.js").MetricMetadataObject | undefined} metadata - The metadata for the card.
   * @property {string  | undefined} eyebrowText - The eyebrow text of the card
   * @property {number | undefined} height - The height of the card (for skelecton state)
   * @property {boolean} loading - Whether the card is in a loading state or not
   */
  let {
    metadata = undefined,
    eyebrowText = undefined,
    height = undefined,
    loading = false
  } = $props();

  let pinEl = $state();
  let showInfo = $state(false);
</script>

<div class="card-container">
  <div class="eyebrow-text">
    {#if eyebrowText}
      {eyebrowText}
    {:else}
      {@html "&nbsp;"}
    {/if}
  </div>

  <div class="content" style:height={height ? `${height}px` : "auto"} class:loading>
    {#if metadata}
      <div class="card-title">{metadata.metric_full_name}</div>
    {/if}
    {#if metadata && (metadata.source_label || metadata.notes_label)}
      <div class="source-container">
        <div class="source">Notes</div>
        <button
          bind:this={pinEl}
          aria-label="Source"
          onclick={() => (showInfo = !showInfo)}
          style:height="20px"
        >
          <IconInformation />
        </button>
        {#if showInfo}
          <Tooltip elOffset={5} el={pinEl} size="large">
            {#if metadata.source_label?.trim()}
              <div>
                <b>Source:</b>
                {@html metadata.source_label}
              </div>
            {/if}
            {#if metadata.notes_label?.trim()}
              <div>
                <b>Notes:</b>
                {@html metadata.notes_label}
              </div>
            {/if}
          </Tooltip>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .card-container {
    width: 100%;
  }
  .card-container :global(.tooltip-outer) {
    pointer-events: all !important;
  }

  .eyebrow-text {
    font-size: var(--font-size-small);
    text-transform: uppercase;
    margin-bottom: 1rem;
    color: var(--color-gray-shade-darker);
  }

  .content {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: var(--spacing-3);
    background-color: var(--color-gray-shade-lightest);
    border: 1px solid var(--color-gray-shade-medium);
    padding: var(--spacing-4);
  }

  .card-title {
    color: var(--color-black);
    font-weight: var(--font-weight-bold);
    color: var(--color-gray-shade-darker);
  }

  .source-container {
    display: flex;
    gap: var(--spacing-2);
    align-items: center;
  }

  .source-container .source {
    color: var(--color-gray-shade-darker);
    font-weight: var(--font-weight-bold);
    font-size: 0.75rem;
  }

  .source-container button {
    padding: 0;
    background: none;
    border: none;
    font: inherit;
    cursor: pointer;
  }

  .loading {
    background: linear-gradient(
      90deg,
      var(--color-gray-shade-lightest) 10%,
      var(--color-gray-shade-light) 50%,
      var(--color-gray-shade-lightest) 90%
    );
    background-size: 200% 100%;
    animation: gradientAnimation 1.5s infinite;
  }

  @keyframes gradientAnimation {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
</style>
