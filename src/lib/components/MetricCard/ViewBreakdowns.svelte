<script>
  import { logClickToGA } from "@urbaninstitute/dataviz-components";
  import IconChevronCircle from "$icons/IconChevronCircle.svelte";

  let { open = $bindable(false), iconSize = 36, children, plural = true } = $props();
</script>

<button
  onclick={(e) => {
    logClickToGA(e.target, "metric-card-view-data-breakdown");
    open = !open;
  }}
  aria-expanded={open}
>
  <span style:font-weight="var(--font-weight-bold)">View data breakdown{plural ? "s" : null}</span>
  <div class:flipped={open} style="display: flex; align-items: center;">
    <IconChevronCircle size={iconSize} />
  </div>
</button>
{#if open}
  {@render children?.()}
{/if}

<style>
  button {
    padding: 0;
    border: none;
    font: inherit;
    width: 100%;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: var(--spacing-2);
    cursor: pointer;
    background-color: var(--color-gray-shade-lightest);
    color: var(--color-blue-shade-dark);
  }

  button:hover {
    text-decoration: underline;
  }

  .flipped {
    transform: rotateX(180deg);
    transform-origin: center;
  }
</style>
