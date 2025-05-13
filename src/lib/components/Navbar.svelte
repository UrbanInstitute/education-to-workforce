<script>
  import { LogoUrbanBadge, LogoTPCBadge } from "@urbaninstitute/dataviz-components";

  /**
   * Title to display in the navbar
   * @type {string}
   */
  export let title = "";

  /**
   * URL to link to from the title
   * @type {string}
   */
  export let projectUrl = "";

  /**
   * Brand to use for the logo
   * @type {"urban" | "tpc"}
   */
  export let brand = "urban";

  /**
   * Option to make the navbar sticky
   * @type {boolean} [sticky=false]
   */
  export let sticky = false;

  $: homeURL = brand == "tpc" ? "https://www.taxpolicycenter.org" : "https://www.urban.org";
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
    {#if projectUrl}
      <a href="{projectUrl}/">
        <p class="nav--page-title">{title}</p>
      </a>
    {:else}
      <p class="nav--page-title">{title}</p>
    {/if}
  {/if}
  <div class="links">
    <slot name="links" />
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
    justify-content: space-between;
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
  .nav--page-title {
    margin-left: var(--spacing-8);
    margin-bottom: 0;
    margin-top: 0;
    font-weight: var(--font-weight-regular);
    font-size: var(--font-size-small);
    color: var(--color-gray-shade-darkest);
  }
  .links {
    margin-right: var(--spacing-6);
    display: flex;
    gap: var(--spacing-4);
  }
  :global(.links a) {
    color: var(--color-black) !important;
    font-size: var(--font-size-large);
  }
  :global(.links a:hover) {
    color: var(--color-blue) !important;
  }
</style>
