<script>
  let { onclick, color = "var(--color-gray-shade-darker)" } = $props();
</script>

<div style="display: flex;justify-content: end; margin-top: var(--spacing-2);">
  <button class="clear-selection" {onclick} style:color> Clear selection </button>
</div>

<style>
  .clear-selection {
    padding: 0;
    background: none;
    border: none;
    font: inherit;

    font-style: italic;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: var(--spacing-1);
  }
</style>
