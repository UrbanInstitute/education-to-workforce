<!-- A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review. -->

<script>
  import { getContext } from "svelte";
  import getContextCharacteristics from "$utils/getContextCharacteristics";
  import { formatDynamicText } from "$utils/dynamicText";

  /**
   * Population-characteristics drawer body (mockup 5). Thin template over
   * getContextCharacteristics. Renders one block per subject: the primary geography (or
   * the nation when none is selected, dev-plan §11.4), plus the comparison geography when
   * one is picked — the two blocks are identical in shape.
   *
   * @typedef {Object} Props
   * @property {Map<string, *>} contextVars - parsed context.json metadata (data.metadata.context)
   * @property {{ asOf: string, nationalName: string }} content - page-tool.aml {localCharacteristics}
   */

  /** @type {Props} */
  let { contextVars, content } = $props();

  /** @type {import("$lib/state/toolState.svelte.js").ToolState} */
  const tool = getContext("tool");

  // The shards carry no year field, so the vintage is pinned here. Confirmed 2026-08-20:
  // the approved copy reads "As of 2023". The files are 2023-vintage at every level
  // except state (2022) — see dev-plan §11.4.
  const CONTEXT_YEAR = "2023";

  /**
   * @typedef {Object} Subject
   * @property {string} key - keyed-each identity, so a swapped geography rebuilds its block
   * @property {*} record - the geography's context shard record
   * @property {string} name - subject name for the "As of …" line
   * @property {boolean} loading - that subject's context fetch is in flight
   * @property {boolean} ignoreLevelClaims - see getContextCharacteristics; only the
   *   national record has no level of its own to claim
   */

  /** @type {Subject[]} */
  let subjects = $derived([
    {
      key: tool.geoid1 || "national",
      record: tool.contextRecord,
      // the national record names itself "United States", but the sentence wants the article
      // ("the United States"), so that name comes from content rather than the record;
      // a selected geography comes from its shard
      name: tool.contextIsNational ? content.nationalName : (tool.geoid1Data?.name ?? ""),
      loading: tool.contextLoading,
      ignoreLevelClaims: tool.contextIsNational
    },
    // the comparison geography is always a real geography at the current level, so its
    // level claims apply normally
    ...(tool.geoid2
      ? [
          {
            key: tool.geoid2,
            record: tool.geoid2ContextData,
            name: tool.geoid2Data?.name ?? "",
            loading: tool.context2Loading,
            ignoreLevelClaims: false
          }
        ]
      : [])
  ]);

  /** @param {Subject} subject */
  const characteristicsFor = (subject) =>
    subject.record
      ? getContextCharacteristics(subject.record, contextVars, tool.level, {
          ignoreLevelClaims: subject.ignoreLevelClaims
        })
      : undefined;

  /** @param {string} name */
  const asOfText = (name) => formatDynamicText(content.asOf, { year: CONTEXT_YEAR, name });
</script>

{#snippet valueList(/** @type {*} */ item)}
  {#each item.values as v, i}
    {#if v.label}<span class="subgroup-label">{v.label}:</span>{/if}
    <span class="value">{v.value}{i < item.values.length - 1 ? ", " : ""}</span>
  {/each}
{/snippet}

<div class="characteristics">
  {#each subjects as subject (subject.key)}
    {@const characteristics = characteristicsFor(subject)}
    {#if subject.loading}
      <p class="loading">Loading…</p>
    {:else if characteristics}
      <div class="subject">
        <p class="as-of">{asOfText(subject.name)}</p>
        <ul class="primary-list">
          {#each characteristics.primary as item}
            <li><span class="stat-label">{item.label}:</span> {@render valueList(item)}</li>
          {/each}
        </ul>
        {#each characteristics.breakdowns as group}
          <div class="breakdown-group">
            <div class="group-label">{group.label}</div>
            {#each group.disaggregations as disaggregation}
              <div class="disaggregation">
                <div class="disaggregation-label">{disaggregation.label}</div>
                <p class="group-values">{@render valueList(disaggregation)}</p>
              </div>
            {/each}
          </div>
        {/each}
      </div>
    {/if}
  {/each}
</div>

<style>
  .characteristics {
    font-size: var(--font-size-small) !important;
    color: var(--color-gray-shade-darkest);
  }

  /* the comparison block repeats the primary block verbatim, set off by a rule */
  .subject + .subject {
    margin-top: var(--spacing-4);
    padding-top: var(--spacing-4);
    border-top: 1px solid var(--color-gray);
  }

  .as-of {
    font-size: var(--font-size-small) !important;
    font-style: italic;
    margin: 0 0 var(--spacing-4);
  }

  .primary-list {
    list-style: none;
    margin: 0 0 var(--spacing-4);
    padding: 0 0 var(--spacing-3) !important;
    border-bottom: 1px solid var(--color-gray);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }

  .stat-label,
  .group-label,
  .disaggregation-label {
    font-weight: var(--font-weight-bold);
  }

  .breakdown-group {
    margin-bottom: var(--spacing-4);
  }

  /* one block per disaggregation ("Race or ethnicity", "Gender"), indented under the
     variable it breaks down */
  .disaggregation {
    margin-top: var(--spacing-3);
  }

  .group-values {
    margin: var(--spacing-1) 0 0;
    font-size: var(--font-size-small) !important;
  }

  /* the subgroup names ("AIAN", "Female") are the disaggregate's values, set in italics
     to read as labels rather than as part of the sentence */
  .subgroup-label {
    margin-right: 2px;
    font-style: italic;
  }

  .loading {
    font-size: var(--font-size-small);
    color: var(--color-gray-shade-darker);
    font-style: italic;
  }
</style>
