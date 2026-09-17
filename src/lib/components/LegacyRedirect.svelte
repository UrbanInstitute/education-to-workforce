<!-- A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review. -->

<!-- @component
Client-side redirect from a v1 route to the v2 single page. The app is a static SPA
(`ssr=false`, prerender, `fallback: index.html`), so old links land on the prerendered
stub and forward on mount rather than being redirected by a server.

Old dash slugs (`states`, `school-districts`, …) are already valid v2 `level` values, and
buildQueryString drops absent params, so an old URL without a geoid1 resolves to the
national view (settled 2026-07-09).
-->
<script>
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import { goto } from "$app/navigation";
  import { base } from "$app/paths";
  import { page } from "$app/stores";
  import { buildQueryString } from "$utils/queryParameters";

  /**
   * @typedef {Object} Props
   * @property {string} hash - section anchor to land on, without the "#" ("map" | "eq-metrics")
   */

  /** @type {Props} */
  let { hash } = $props();

  onMount(() => {
    // read once, imperatively: this is a one-shot forward, not a reactive dependency.
    // `$app/state` would be the modern form but needs SvelteKit >= 2.12 (repo is on 2.8.1).
    const { url, params } = get(page);
    const sp = url.searchParams;
    const query = buildQueryString({
      level: params.slug,
      geoid1: sp.get("geoid1"),
      geoid2: sp.get("geoid2"),
      eqid: sp.get("eqid"),
      timeframe: sp.get("timeframe")
    });
    goto(`${base}/?${query}#${hash}`, { replaceState: true });
  });
</script>

<p class="redirect">Redirecting&hellip;</p>

<style>
  .redirect {
    text-align: center;
    padding: 4rem 2rem;
  }
</style>
