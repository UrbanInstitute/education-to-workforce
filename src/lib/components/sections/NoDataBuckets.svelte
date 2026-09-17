<!-- A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review. -->

<!-- @component
Bucketed listing of the selected EQ's metrics WITHOUT available data (requirements
§3.12; mockup 2). Categorization comes from the generated no-data-categories.json
keyed metric × state; sub-state geographies use the enclosing state (s_id). Bucket
labels/copy and the code→bucket mapping are content-configurable in page-tool.aml
[noDataBuckets]. National view or a missing/empty categories file falls back to a
single flat uncategorized list.

In a sub-state view the first bucket also collects every metric the tool publishes for the
enclosing state, so it reads "state-level data exists" and the second reads "nowhere" —
bucketing on the ECS codes alone put metrics visible in our own state view under a claim
that they were unavailable there. That merged meaning needs its own wording, so each bucket
may declare labelSubstate/copySubstate for sub-state views
(.agent/docs/no-data-section-issues-2026-09-02.md §2).
-->
<script>
  import { getContext } from "svelte";
  import pageContent from "$data/archie-ml/page-tool.aml";
  import noDataCategoriesJson from "$data/metadata/no-data-categories.json";
  import { formatDynamicText } from "$utils/dynamicText";
  import { formatCountPhrase, agreeWithMetrics } from "$utils/availabilityText";
  import { titleCaseEqName } from "$utils/titleCaseEqName";
  import { canBucket, groupMetricsByBucket } from "$utils/noDataCategories";

  /**
   * @typedef {Object} Props
   * @property {import("$utils/noDataCategories").NoDataCategories} [categories] - overridable for tests
   */

  /** @type {Props} */
  let { categories = noDataCategoriesJson } = $props();

  /** @type {import("$lib/state/toolState.svelte.js").ToolState} */
  const tool = getContext("tool");

  const content = pageContent.unavailableData;

  // the enclosing state keys the categorization for every sub-state geography
  let lookupState = $derived(
    tool.level === "states" ? tool.geoid1 || undefined : tool.geoid1Data?.s_id
  );

  let metrics = $derived(tool.selectedIndicators.flatMap((indicator) => indicator.noMetricData));
  let metricCount = $derived(tool.selectedMetricCounts.noMetricData);
  let indicatorCount = $derived(tool.selectedIndicatorCounts.noMetricData);

  // the metric count renders as its own large number beside this, so the phrase omits it;
  // the nouns and the verb still agree with their own counts (see availabilityText.js)
  let heading = $derived.by(() => {
    const phrase = formatCountPhrase(metricCount, indicatorCount, pageContent.availability, {
      leadWithCount: false
    });
    const suffix = formatDynamicText(
      agreeWithMetrics(
        metricCount,
        pageContent.availability.unavailableSuffix,
        pageContent.availability.unavailableSuffixSingular
      ),
      { eqName: titleCaseEqName(tool.selectedEq?.shorthand) }
    );
    return `${phrase} ${suffix}`;
  });

  // only sub-state views can have a metric that's missing here but present one level up
  let isSubState = $derived(tool.level !== "states");
  let stateData = $derived(
    isSubState && lookupState ? tool.states?.[lookupState]?.data : undefined
  );

  let bucketed = $derived(canBucket(categories, lookupState));
  let grouped = $derived(
    bucketed
      ? groupMetricsByBucket(metrics, categories, lookupState, pageContent.noDataBuckets, stateData)
      : undefined
  );

  // Bucket copy names the enclosing state. states.json is fetched on first geography
  // selection and buckets only render once one is picked, so it has landed by now — but
  // fall back to a generic noun rather than printing an empty gap if it hasn't.
  let stateName = $derived(
    (lookupState ? tool.states?.[lookupState]?.name : undefined) ?? "this state"
  );

  // cacheMap decorates every sub-state shard with a state-qualified name ("Anderson
  // County, Texas"); the generic noun keeps the sentence grammatical if it hasn't landed
  let geographyName = $derived(tool.geoid1Data?.name ?? "this geography");

  /** @param {string} template */
  const withNames = (template) =>
    formatDynamicText(template, { state: stateName, geography: geographyName });

  /**
   * Sub-state variant of a bucket's heading or description, where one is configured.
   * @param {import("$utils/noDataCategories").BucketConfig} bucket
   * @param {"label" | "copy"} field
   */
  const bucketText = (bucket, field) => (isSubState && bucket[`${field}Substate`]) || bucket[field];
</script>

{#if metricCount > 0 && metrics.length > 0}
  <div class="no-data-section">
    <div class="no-data-info">
      <div class="heading-group">
        <h3 class="count">{metricCount}</h3>
        <h3 class="heading">{@html heading}</h3>
      </div>
      <p class="explainer">{@html content.copy}</p>
    </div>

    {#if grouped}
      <div class="buckets">
        {#each grouped.filter((entry) => entry.metrics.length > 0) as entry (entry.bucket.value)}
          <div class="bucket">
            <h4>{withNames(bucketText(entry.bucket, "label"))}</h4>
            {#if bucketText(entry.bucket, "copy")}
              <p class="bucket-copy">{@html withNames(bucketText(entry.bucket, "copy"))}</p>
            {/if}
            <ul>
              {#each entry.metrics as metric (metric.metric_id)}
                <li>{metric.metric_full_name}</li>
              {/each}
            </ul>
          </div>
        {/each}
      </div>
    {:else}
      <!-- national view / missing categorization file: flat uncategorized list -->
      <ul class="flat-list">
        {#each metrics as metric (metric.metric_id)}
          <li>{metric.metric_full_name}</li>
        {/each}
      </ul>
    {/if}
  </div>
{/if}

<style>
  .no-data-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
    padding-block: var(--spacing-12);
  }

  .no-data-info {
    border-left: 8px solid var(--color-magenta-shade-dark);
    padding-left: var(--spacing-8);
  }

  .heading-group h3.heading {
    margin: 0;
    font-weight: var(--font-weight-bold);
    color: var(--color-gray-shade-darkest);
    text-transform: none;
    font-family: var(--font-family-sans-alt);
    font-size: 28px;
    line-height: 36px;
  }

  .heading-group {
    display: flex;
    justify-content: flex-start;
    align-items: flex-start;
    gap: var(--spacing-4);
    margin-bottom: var(--spacing-2);
  }

  /* below the mobile breakpoint the count and the heading no longer fit side by side */
  @media (max-width: 48rem) {
    .heading-group {
      flex-direction: column;
      gap: var(--spacing-2);
    }
  }

  .heading-group .count {
    display: block;
    font-size: 96px;
    line-height: 1;
    font-weight: var(--font-weight-bold);
    font-family: var(--font-family-sans-alt);
    color: var(--color-magenta-shade-medium);
    margin: 0;
  }

  .no-data-info p.explainer {
    margin: 0;
    font-size: 16px;
    line-height: 22px;
    font-style: italic;
    color: var(--color-gray-shade-darker);
  }
  .no-data-info p.explainer :global(a) {
    color: var(--color-gray-shade-darker);
    text-decoration: underline;
    font-weight: normal;
  }

  /* the flat list has no bucket heading to sit under, so it indents to line up with the
     explainer text instead of the section's magenta rule (2026-09-16) */
  .flat-list {
    margin-left: calc(8px + var(--spacing-8));
    font-size: 14px;
    padding-left: 1em;
  }

  .buckets {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
    gap: var(--spacing-6);
    margin-top: var(--spacing-4);
  }

  .no-data-section .bucket h4 {
    margin: 0 0 var(--spacing-4);
    font-weight: var(--font-weight-bold);
    font-family: var(--font-family-sans-alt);
  }

  .bucket-copy {
    margin: 0 0 var(--spacing-2);
    font-size: var(--font-size-small);
    color: var(--color-gray-shade-darker);
  }

  ul {
    margin: 0;
    padding-left: var(--spacing-5);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
  }

  li {
    color: var(--color-gray-shade-darkest) !important;
    font-weight: var(--font-weight-bold);
    font-size: 14px;
    line-height: 18px;
    position: relative;
    list-style: none;
  }
  li::before {
    color: var(--color-gray-shade-darker);
    content: "•";
    position: absolute;
    left: -1em;
    font-size: 1.2em;
    line-height: 18px;
  }
</style>
