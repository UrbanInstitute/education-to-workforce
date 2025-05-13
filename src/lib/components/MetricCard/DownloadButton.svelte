<script>
  import IconDownload from "$components/Icons/IconDownload.svelte";
  let { onclick, multi = false } = $props();
</script>
<div class="button-container">
  <!-- button -->
  <button onclick={onclick}
    >{multi ? "Download all chart images" : "Download chart image"}<IconDownload /></button
  >
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

  button:hover {
    cursor: pointer;
    text-decoration: underline;
  }

</style>
