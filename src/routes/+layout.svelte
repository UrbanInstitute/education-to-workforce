<script>
  import "../app.css";
  import { Theme, FontsUrban, Analytics } from "@urbaninstitute/dataviz-components";
  import Navbar from "$components/Navbar.svelte";
  import { page } from "$app/stores";
  import { getAbsoluteUrl } from "$utils/urls";

  let { children, data } = $props();
</script>

<FontsUrban />
<Analytics title={data.meta.title} mode={import.meta.env.MODE} />
<Theme>
  <Navbar sticky={true}>
    <svelte:fragment slot="links">
      {#if $page.route.id !== "/"}
        <a href={getAbsoluteUrl("")}>Restart</a>
      {/if}
      <a href={getAbsoluteUrl("about")}>About</a>
    </svelte:fragment>
  </Navbar>
  <main>
    {@render children()}
  </main>
</Theme>

<style>
  /* turn off padding on body */
  :global(body) {
    padding: 0;
    margin: 0 auto;
  }

  /* theme overrides */
  :global(h1, h2) {
    font-family: var(--font-family-sans-alt) !important;
  }
</style>
