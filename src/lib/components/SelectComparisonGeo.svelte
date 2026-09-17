<!-- A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review. -->

<script>
  import IconPlusCircle from "$icons/IconPlusCircle.svelte";
  import { urbanColors } from "@urbaninstitute/dataviz-components/utils";
  import { tick } from "svelte";

  /**
   * @typedef {Object} Props
   * @property {boolean} open - bindable: true once a comparison exists, or once the user
   *   expands the control. The button writes it, so the parent has to own the state —
   *   before it was bindable the write stayed local and silently diverged from the parent
   * @property {(e: MouseEvent) => void} onclick
   * @property {boolean} [disabled] - no primary geography is selected yet, so there's
   *   nothing to compare against: the button stays visible but inert
   * @property {number} [iconSize]
   * @property {boolean} [horizontal]
   * @property {string} [childId] - id of the child geocoder input to focus on expand
   * @property {number | null} [width]
   * @property {boolean} [upperPadding]
   * @property {string} [label]
   * @property {"light" | "dark-panel"} [variant] - dark-panel = white-on-blue (control panel)
   * @property {import("svelte").Snippet} [children]
   */

  /** @type {Props} */
  let {
    open = $bindable(false),
    onclick,
    disabled = false,
    iconSize = 27,
    horizontal = true,
    childId = "geoid2",
    width = null,
    upperPadding = false,
    label = "Select a comparison geography",
    variant = "light",
    children
  } = $props();

  let elRef = $state();
</script>

<div bind:this={elRef} style:padding-top={!open && upperPadding ? "var(--spacing-4)" : "0"}>
  {#if !open}
    <!-- Not a disclosure: the button is replaced by the comparison controls rather than
       revealing a region beside itself, so it carried an `aria-expanded` that could only
       ever be false and an `aria-controls` pointing at an id that never existed. Moving
       focus into the geocoder below is what tells assistive tech the swap happened. -->
    <button
      class:horizontal
      class:dark-panel={variant === "dark-panel"}
      {disabled}
      onclick={(e) => {
        // reverse open state
        open = !open;
        // wait until next "svelte tick" to focus on the geocoder
        tick().then(() => {
          elRef.querySelector(`#${childId}`)?.focus();
        });
        onclick(e);
      }}
      style:width="{width}px"
    >
      <IconPlusCircle
        fill={variant === "dark-panel" ? urbanColors.blue_shade_light : urbanColors.blue_shade_dark}
        size={iconSize}
      />
      <span style:font-weight="var(--font-weight-bold)">{label}</span>
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

  button.dark-panel {
    color: var(--color-white);
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
