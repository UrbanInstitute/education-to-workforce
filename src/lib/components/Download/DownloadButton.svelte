<!-- A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review. -->

<!-- @component
Italic "Download chart image" link-button (mockups 2–8, bottom-right of the card).
The wrapper keeps the button-container class — Download's ignoreElements contract
excludes it from html2canvas captures.
-->
<script>
  import IconDownload from "$components/Icons/IconDownload.svelte";

  /**
   * @type {{
   *   label?: string,
   *   onclick: (e: MouseEvent) => void,
   *   isLoading?: boolean,
   *   loadingLabel?: string
   * }}
   */
  let {
    label = "Download chart image",
    onclick,
    isLoading = false,
    loadingLabel = "Preparing image…"
  } = $props();
</script>

<div class="button-container">
  <button {onclick} disabled={isLoading}>{isLoading ? loadingLabel : label}<IconDownload /></button>
</div>

<style>
  button {
    display: inline-flex;
    gap: var(--spacing-1);
    align-items: start;
    justify-content: start;
    color: var(--color-blue-shade-dark);
    font-size: var(--font-size-small);
    font-style: italic;
    font-family: inherit;
    padding: 0;
    background-color: transparent;
    border: none;
  }

  button:hover:not(:disabled) {
    cursor: pointer;
    text-decoration: underline;
  }

  button:disabled {
    opacity: 0.6;
  }
</style>
