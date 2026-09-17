<!-- A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review. -->

<script>
  import { getContext } from "svelte";

  /**
   * One page-level polite live region for the tool's selection state (cleanup #34).
   *
   * Changing the essential question, geography or data level silently rewrites the EQ
   * heading and both card grids — sighted users see the counts update, screen reader
   * users got nothing. This announces the same sentence the heading shows.
   *
   * Deliberately the only live region for selection: the map, grids and filters all
   * reflect the same three-part state, so separate regions would talk over each other.
   * Content present when a live region is first inserted is not announced, so the state
   * the page loads with stays quiet — only subsequent changes speak.
   */

  const tool = getContext("tool");

  let message = $derived.by(() => {
    // mid-fetch the counts read 0; announcing that then correcting it is worse than silence
    if (tool.loading || (tool.geoid1 && !tool.geoid1Data)) return "";

    const eq = tool.selectedEq?.shorthand;
    if (!eq) return "";

    const count = tool.selectedMetricCounts.hasMetricData;
    const metrics = `${count} ${count === 1 ? "metric" : "metrics"}`;
    const geography = tool.geoid1Data?.name;

    return geography
      ? `${metrics} available for ${eq} in ${geography}.`
      : `${metrics} available for ${eq} nationally.`;
  });
</script>

<div class="visually-hidden" role="status" aria-live="polite">{message}</div>
