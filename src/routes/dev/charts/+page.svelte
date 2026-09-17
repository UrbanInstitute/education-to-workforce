<!-- A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review. -->

<!-- @component
Dev-only shell for the chart QA harness. The harness (and the fixture data it imports)
lives in ChartsHarness.svelte behind a DEV-guarded dynamic import: in production builds
import.meta.env.DEV is statically false, so rollup drops the branch and never emits the
harness chunk — a plain template guard alone still shipped the module-scope fixtures.
-->
<script>
  /** @type {typeof import("./ChartsHarness.svelte").default | null} */
  let ChartsHarness = $state(null);

  $effect(() => {
    if (import.meta.env.DEV) {
      import("./ChartsHarness.svelte").then((module) => (ChartsHarness = module.default));
    }
  });
</script>

{#if ChartsHarness}
  <ChartsHarness />
{/if}
