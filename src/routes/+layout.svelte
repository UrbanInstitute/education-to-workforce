<!-- A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review. -->

<script>
  import "../app.css";
  import { Theme, FontsUrban, Analytics } from "@urbaninstitute/dataviz-components";
  import Navbar from "$components/Navbar.svelte";
  import { base } from "$app/paths";
  import { getAbsoluteUrl } from "$utils/urls";

  let { children, data } = $props();
</script>

<FontsUrban />
<Analytics title={data.meta.title} mode={import.meta.env.MODE} />
<Theme>
  <!-- the title doubles as the way back to the tool from /about (Navbar appends the
       trailing slash the app's trailingSlash: "always" expects) -->
  <Navbar sticky={true} title={data.nav.toolTitle} projectUrl={base}>
    {#snippet links()}
      <a href={getAbsoluteUrl("about")}>{data.nav.aboutText}</a>
      <a href="{base}/#all-data">{data.nav.allDataText}</a>
      <!-- the download link leaves the tool; warn screen readers and sever the opener -->
      <a href={data.nav.downloadLink} target="_blank" rel="noopener noreferrer">
        {data.nav.downloadText}<span class="visually-hidden"> (opens in a new tab)</span>
      </a>
    {/snippet}
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
