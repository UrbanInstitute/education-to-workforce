<!-- A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review. -->

<!-- @component
Floating return-to-top button (requirements §3.15; mockup 6): magenta circle + label,
visible while the user is inside the all-data section (the page passes that section's
element). Lives at the bottom of the control-panel column: bottom-sticky so it floats
at the viewport bottom mid-scroll and settles at the column's end at the page bottom.
Smooth-scrolls to the top of the page.
-->
<script>
  import IntersectionObserver from "svelte-intersection-observer";
  import { logClickToGA } from "@urbaninstitute/dataviz-components";
  import { urbanColors } from "@urbaninstitute/dataviz-components/utils";
  import pageContent from "$data/archie-ml/page-tool.aml";
  import IconArrowLeft from "$icons/IconArrowLeft.svelte";

  /**
   * @typedef {Object} Props
   * @property {HTMLElement | undefined} element - the section whose visibility shows the button
   */

  /** @type {Props} */
  let { element } = $props();

  let intersecting = $state(false);

  /** @param {MouseEvent} e */
  function scrollToTop(e) {
    logClickToGA(/** @type {HTMLElement} */ (e.currentTarget), "tool-return-to-top");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  }
</script>

<IntersectionObserver {element} bind:intersecting />

{#if intersecting}
  <button type="button" class="return-to-top" onclick={scrollToTop}>
    <span class="circle" aria-hidden="true">
      <IconArrowLeft fill={urbanColors.magenta_shade_lightest} />
    </span>
    <span class="label">{pageContent.allData.returnToTop}</span>
  </button>
{/if}

<style>
  .return-to-top {
    /* pushed to the bottom of the panel column; sticky floats it at the viewport
       bottom until its natural position at the column's end scrolls into view */
    position: sticky;
    bottom: var(--spacing-8);
    margin-top: auto;
    z-index: 400;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-2);
    padding: 0;
    background: none;
    border: none;
    cursor: pointer;
  }

  .circle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    border-radius: 50%;
    background-color: var(--color-magenta-shade-dark);
  }

  /* the repo only ships a left arrow — point it up */
  .circle :global(svg) {
    transform: rotate(90deg);
    width: 2rem;
    height: 2rem;
  }

  .label {
    font-weight: var(--font-weight-bold);
    font-size: 16px;
    color: var(--color-magenta-shade-dark);
  }

  .return-to-top:focus-visible {
    outline: 2px solid var(--color-blue, #1696d2);
    outline-offset: 2px;
  }

  /* phones: the button floats fixed in the lower-left corner over the scrolling cards. A
     separate full-width gradient band is pinned across the viewport bottom behind it —
     solid white at the bottom fading to transparent at the top — so the fade is seamless
     edge-to-edge (no button-width seam) and the magenta label stays legible. */
  @media (max-width: 33.75rem) {
    .return-to-top {
      position: fixed;
      bottom: var(--spacing-4);
      left: var(--spacing-4);
    }

    .return-to-top::before {
      content: "";
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      height: 9rem;
      background: linear-gradient(to top, rgba(255, 255, 255, 0.95) 40%, rgba(255, 255, 255, 0));
      z-index: -1;
      pointer-events: none;
    }
  }
</style>
