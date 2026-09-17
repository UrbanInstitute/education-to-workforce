<!-- A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review. -->

<script>
  import { slide } from "svelte/transition";
  import { prefersReducedMotion } from "svelte/motion";
  import IconChevronCircle from "$icons/IconChevronCircle.svelte";
  import { urbanColors } from "@urbaninstitute/dataviz-components/utils";

  /**
   * Generic collapsible drawer (mockups 2, 5): header button with label + chevron circle,
   * slide-open body. Used for "Learn more about this essential question" and
   * "Local population characteristics".
   *
   * @typedef {Object} Props
   * @property {string} label - header button text
   * @property {string} id - id of the body element (aria-controls pairing)
   * @property {boolean} [open]
   * @property {string} [maxHeight] - cap on the body before it scrolls internally. The
   *   default keeps a long body from overhanging the map it floats over; pass "none" where
   *   the body only covers cards and an internal scrollbar would just be in the way.
   * @property {(open: boolean, event: MouseEvent) => void} [onToggle] - after-toggle callback (GA)
   * @property {import("svelte").Snippet} [children]
   */

  /** @type {Props} */
  let {
    label,
    id,
    open = $bindable(false),
    maxHeight = "500px",
    onToggle = undefined,
    children
  } = $props();
</script>

<div class="drawer">
  <button
    class="drawer-header"
    aria-expanded={open}
    aria-controls={id}
    onclick={(e) => {
      open = !open;
      onToggle?.(open, e);
    }}
  >
    <span class="drawer-label">{label}</span>
    <span class="drawer-icon" class:flipped={open}>
      <IconChevronCircle size={26} bgFill={urbanColors.blue_shade_dark} fill="#ffffff" />
    </span>
  </button>
  {#if open}
    <div
      {id}
      class="drawer-body"
      style:max-height={maxHeight}
      transition:slide={{ duration: prefersReducedMotion.current ? 0 : 250 }}
    >
      {@render children?.()}
    </div>
  {/if}
</div>

<style>
  .drawer {
    /* containing block for the overlaid body; only the header stays in flow */
    position: relative;
    background: var(--color-gray-shade-lightest);
    border: 1px solid var(--color-gray-shade-light);
    box-shadow: var(--box-shadow);
  }

  .drawer-header {
    appearance: none;
    background: none;
    border: none;
    font: inherit;
    cursor: pointer;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-3);
    padding: var(--spacing-4) var(--spacing-6);
    text-align: left;
  }

  .drawer-label {
    font-weight: var(--font-weight-bold);
    font-size: 14px;
    line-height: 21px;
    color: var(--color-black);
  }

  .drawer-icon {
    flex-shrink: 0;
    height: 26px;
  }

  .drawer-icon.flipped {
    transform: rotateX(180deg);
    transform-origin: center;
  }

  .drawer-body {
    /* floats over whatever follows (the map) instead of pushing it down: the header keeps
       the drawer's footprint in flow and the body is pulled out of it. left/right -1px and
       top 100% line the body's borders up with the header's, so an open drawer still reads
       as one continuous panel. */
    position: absolute;
    top: 100%;
    left: -1px;
    right: -1px;
    /* above the map's legend card (10) and loading badge (20) in MapModule */
    z-index: 30;
    background: var(--color-gray-shade-lightest);
    border: 1px solid var(--color-gray-shade-light);
    border-top: none;
    box-shadow: var(--box-shadow);
    padding: 0 var(--spacing-6) var(--spacing-4);
    /* a long body (two comparison blocks) would otherwise overhang the map it floats
       over — hence the `maxHeight` cap set inline above; overscroll-behavior keeps a wheel
       past the end off the page behind it */
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-width: thin;
    scrollbar-color: var(--color-gray) transparent;
  }

  /* Chrome/Safari fallback for browsers predating scrollbar-width/-color */
  .drawer-body::-webkit-scrollbar {
    width: 6px;
  }

  .drawer-body::-webkit-scrollbar-track {
    background: transparent;
  }

  .drawer-body::-webkit-scrollbar-thumb {
    background: var(--color-gray);
    border-radius: 3px;
  }
</style>
