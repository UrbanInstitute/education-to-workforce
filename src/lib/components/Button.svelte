<!-- A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review. -->

<!-- @component Button a basic HTML button with Urban styling-->
<script>
  let { disabled = false, buttonMode = false, children, ...rest } = $props();

  // A disabled <a> has no native disabled state: aria-disabled announces it but the link
  // stays focusable and still navigates. Dropping the href is what actually disables it;
  // role="link" keeps it announced as one so the disabled state still makes sense.
  let linkHref = $derived(disabled ? undefined : rest.href);
</script>

{#if buttonMode}
  <button {disabled} aria-disabled={disabled} {...rest} class="button">
    {@render children()}
  </button>
{:else}
  <a
    class:disabled
    aria-disabled={disabled}
    {...rest}
    href={linkHref}
    role={disabled ? "link" : undefined}
    class="button"
  >
    {@render children()}
  </a>
{/if}

<style>
  .button {
    display: inline-block;
    --border-size: 2px;
    appearance: none;
    border: none;
    cursor: pointer;
    line-height: normal !important;
    color: var(--button-color, var(--color-white)) !important;
    font-family: var(--font-family-sans);
    font-size: var(--font-size-large);
    font-weight: var(--font-weight-bold);
    padding: calc(1rem - var(--border-size) * 2);
    background-color: var(--button-background, var(--color-magenta-shade-dark));
  }

  .button:disabled,
  .button.disabled {
    cursor: not-allowed;
    --button-color: var(--color-white);
    background-color: var(--color-gray-shade-dark);
    border: solid var(--border-size) var(--color-gray-shade-dark);
  }

  .button:hover:not(:disabled) {
    background-color: var(--button-hover-background, transparent);
  }
</style>
