<script>
  import IconPlusCircle from "$icons/IconPlusCircle.svelte";
  import { urbanColors } from "@urbaninstitute/dataviz-components/utils";
  import { tick } from "svelte";

  let {
    open,
    onclick,
    iconSize = 27,
    horizontal = true,
    childId = "geoid2",
    width = null,
    upperPadding = false,
    children
  } = $props();

  let elRef = $state();
</script>

<div bind:this={elRef} style:padding-top={!open && upperPadding ? "var(--spacing-4)" : "0"}>
  {#if !open}
    <button
      class:horizontal
      onclick={(e) => {
        // reverse open state
        open = !open;
        // wait until next "svelte tick" to focus on the geocoder
        tick().then(() => {
          elRef.querySelector(`#${childId}`)?.focus();
        });
        onclick(e);
      }}
      aria-controls="geocoder-wrapper"
      style:width="{width}px"
      aria-expanded={open}
    >
      <IconPlusCircle fill={urbanColors.blue_shade_dark} size={iconSize} />
      <span style:font-weight="var(--font-weight-bold)">Select a comparison geography</span>
    </button>
  {:else}
    {@render children?.()}
  {/if}
</div>

<style>
  button {
    padding: 0;
    background: none;
    border: none;
    font: inherit;

    color: var(--color-black);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-2);
    cursor: pointer;
  }

  button:not(.horizontal) {
    text-align: center;
  }

  button.horizontal {
    flex-direction: row;
    text-align: left;
  }
</style>
