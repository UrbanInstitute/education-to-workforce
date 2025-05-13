<!-- @component Button a basic HTML button with Urban styling-->
<script>
  let { disabled = false, buttonMode = false, children, ...rest } = $props();
</script>

{#if buttonMode}
  <button {disabled} aria-disabled={disabled} {...rest} class="button">
    {@render children()}
  </button>
{:else}
  <a class:disabled aria-disabled={disabled} {...rest} class="button">
    {@render children()}
  </a>
{/if}

<style>
  .button {
    display: inline-block;
    --border-size: 2px;
    --button-color: var(--color-white);
    appearance: none;
    border: none;
    cursor: pointer;
    line-height: normal !important;
    color: var(--button-color) !important;
    font-family: var(--font-family-sans);
    font-size: var(--font-size-large);
    font-weight: var(--font-weight-bold);
    padding: calc(1rem - var(--border-size) * 2);
    background-color: var(--color-magenta-shade-dark);
    border: solid var(--border-size) var(--color-magenta-shade-dark);
  }

  .button:disabled,
  .button.disabled {
    cursor: not-allowed;
    --button-color: var(--color-white);
    background-color: var(--color-gray-shade-dark);
    border: solid var(--border-size) var(--color-gray-shade-dark);
  }

  .button:hover:not(:disabled) {
    background-color: transparent;
    border: solid var(--border-size) var(--color-white);
  }
</style>
