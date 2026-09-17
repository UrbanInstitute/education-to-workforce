<!-- A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review. -->

<script>
  import { LogoUrbanBadge, LogoTPCBadge } from "@urbaninstitute/dataviz-components";

  /**
   * @typedef {Object} Props
   * @property {string} [title=""] - title to display in the navbar
   * @property {string} [projectUrl] - base path to link the title back to; may be the
   *   empty string (SvelteKit's `base` outside a subpath deploy), so pass it or omit it
   * @property {"urban" | "tpc"} [brand="urban"] - brand to use for the logo
   * @property {boolean} [sticky=false] - option to make the navbar sticky
   * @property {import("svelte").Snippet} [links] - nav links rendered on the right
   */

  /** @type {Props} */
  let { title = "", projectUrl = undefined, brand = "urban", sticky = false, links } = $props();

  let homeURL = $derived(
    brand == "tpc" ? "https://www.taxpolicycenter.org" : "https://www.urban.org"
  );
</script>

<nav class:sticky>
  <div class="logo">
    <a href={homeURL}>
      {#if brand === "urban"}
        <LogoUrbanBadge width={30} />
      {:else if brand === "tpc"}
        <LogoTPCBadge width={47} />
      {/if}
    </a>
  </div>
  {#if title}
    <!-- `projectUrl != null`, not a truthiness test: `base` is "" on a root deploy (and in
         dev), which left the title unlinked -->
    {#if projectUrl != null}
      <a href="{projectUrl}/">
        <p class="nav--page-title">{title}</p>
      </a>
    {:else}
      <p class="nav--page-title">{title}</p>
    {/if}
  {/if}
  <div class="links">
    {@render links?.()}
  </div>
</nav>

<style>
  :global(:root) {
    --navbar-height: 3.5rem;
  }

  nav {
    background: var(--color-white);
    color: var(--color-white, #ffffff);
    display: flex;
    align-items: center;
    border-bottom: solid 1px var(--color-gray);
    padding: var(--spacing-2) 0;
    position: relative;
    min-height: 48px;
    height: var(--navbar-height);
    z-index: 400;
  }
  nav.sticky {
    position: sticky;
    top: 0;
  }
  .logo {
    margin-left: var(--spacing-6);
  }
  a {
    text-decoration: none;
  }
  /* sits beside the logo, not centred in the bar: the title belongs to the brand, and
     spacing it off the content well would put it somewhere different on every page */
  .nav--page-title {
    margin-left: var(--spacing-4);
    margin-bottom: 0;
    margin-top: 0;
    font-weight: var(--font-weight-regular);
    font-size: var(--font-size-small);
    color: var(--color-gray-shade-darkest);
    /* one line or nothing — the bar is a fixed 56px tall */
    white-space: nowrap;
  }
  /* takes all the free space, so the logo and title stay packed at the left. Replaces
     justify-content: space-between, which pushed the title into the middle of the bar. */
  .links {
    margin-left: auto;
    margin-right: var(--spacing-6);
    display: flex;
    --gap: var(--spacing-8);
    gap: var(--gap);
  }
  .links :global(a:not(:last-child)) {
    /* padding-right: var(--spacing-2); */
    position: relative;
  }
  .links :global(a:not(:last-child)::after) {
    content: "";
    position: absolute;
    right: calc(var(--gap) / -2); /* sits in the middle of the gap */
    top: 50%;
    transform: translateY(-50%);
    width: 1px;
    height: 12px;
    background: var(--color-gray);
  }
  :global(.links a) {
    color: var(--color-black) !important;
    font-size: var(--font-size-large);
    white-space: nowrap;
  }
  :global(.links a:hover) {
    color: var(--color-blue) !important;
  }

  /* The title is a convenience route home, not the only one (the logo and the nav links
     remain). It needs ~865px to sit beside the links without overflowing the bar, so it
     is a desktop-width affordance — 64rem is the same line the tool layout uses to drop
     to its stacked treatment. */
  @media (max-width: 64rem) {
    .nav--page-title {
      display: none;
    }
  }

  /* keep the three links on one row on narrow screens */
  @media (max-width: 40rem) {
    .logo {
      margin-left: var(--spacing-3);
    }
    .links {
      margin-right: var(--spacing-3);
      gap: var(--spacing-3);
    }
    :global(.links a) {
      font-size: var(--font-size-small);
    }
  }
</style>
