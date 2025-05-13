<script>
  import { formatFun } from "$utils/formatFun";
  import { getDisaggregateMeta } from "$utils/disaggregates";
  import Icon from "$icons/IconChevronCircle.svelte";
  import { logClickToGA } from "@urbaninstitute/dataviz-components";

  let { contextData, contextVars, name } = $props();
  let showMoreContext = $state(false);

  let contextualDataVars = $derived.by(() => {
    const contextDataKeys = Object.keys(contextData);
    let result = [];
    for (let d of contextVars.values()) {
      const isPrimary = !d.geo_id.includes("metric");
      let varItem = {
        label: d.geo_name,
        values: [],
        primary: false // default to false, override later if necessary
      };
      // assume that context variables that are labelled with the "metric" only include disaggregates and not a top-level variable
      // if variable doesn't start with "metric", add top level, and set primary to true
      if (isPrimary) {
        // set to primary
        varItem.primary = true;
        varItem.values.push({
          label: undefined,
          value: formatFun(contextData[d.geo_id], d.type + "_axis")
        });

        // for the primary metrics, with disaggregates include extra item without disaggregates in primary
        if (d.disaggregate && d.disaggregate.length > 0) {
          result.push(varItem);
        }
      }
      // check if item has disaggregates, add them if so
      if (d.disaggregate && d.disaggregate.length > 0) {
        // create new item for non-primary entry
        varItem = {
          label: d.geo_name,
          values: [],
          primary: false
        };
        // loop through each disaggregate id
        for (let dId of d.disaggregate) {
          // get all metadata for a given disaggregate
          const disaggMeta = getDisaggregateMeta(dId);
          if (disaggMeta) {
            for (let disagGroup of disaggMeta.fields) {
              const metricKey = `${d.geo_id}_${disagGroup.value}`;
              // check if this key exists in the context data map
              if (contextDataKeys.includes(metricKey)) {
                varItem.values.push({
                  label: disagGroup.label,
                  value: formatFun(contextData[metricKey], d.type + "_axis")
                });
              } else {
                // if it doesn't exist, include it as a missing value
                varItem.values.push({
                  label: disagGroup.label,
                  value: formatFun(null)
                });
              }
            }
          }
        }
      }
      result.push(varItem);
    }
    return result;
  });
  let primaryContextVars = $derived(contextualDataVars.filter((item) => item.primary));
  let moreContextVars = $derived(contextualDataVars.filter((item) => !item.primary));
</script>

{#snippet contextVar(d)}
  <span
    ><span class="context-variable-label">{d.label}: </span>
    {#each d.values as v, i}
      <span class="context-variable-subgroup-label">{v.label ? v.label + ":" : ""} </span>
      <span class="context-variable-value">{v.value}{i < d.values.length - 1 ? ", " : ""}</span>
    {/each}
  </span>
  {#if d.values.length > 1}
    <br />
  {/if}
{/snippet}

<div class="contextual-data">
  <div class="contextual-data-primary">
    {#if name}
      <span class="contextual-data-title">As of 2022, {name} had </span>
    {/if}
    {#each primaryContextVars as item, i}
      {@render contextVar(item)}{i < primaryContextVars.length - 1 ? " " : ""}
    {/each}
  </div>
  <button
    onclick={(e) => {
      showMoreContext = !showMoreContext;
      logClickToGA(e.target, "page-2-context-toggle");
    }}
    class="contextual-show-more"
    >{showMoreContext ? "Hide" : "Show"} demographic breakdowns
    <span class="contextual-show-more-icon" class:flipped={showMoreContext}><Icon size={24} /></span
    ></button
  >
  {#if showMoreContext}
    <div class="contextual-data-more">
      {#each moreContextVars as item, i}
        <div class="contextual-data-breakdown-item">{@render contextVar(item)}</div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .contextual-data {
    font-size: var(--font-size-normal) !important;
    color: var(--color-gray-shade-darker) !important;
    margin: 0 !important;
  }
  .contextual-data:nth-of-type(2) {
    margin-top: var(--spacing-6) !important;
  }
  .contextual-data-title {
    /* text-decoration: underline; */
    /* font-weight: var(--font-weight-bold); */
  }
  .contextual-data-breakdown-item {
    margin-bottom: var(--spacing-2);
  }
  .contextual-show-more {
    appearance: none;
    font-family: inherit;
    font-size: var(--font-size-small);
    color: var(--color-blue-shade-dark);
    font-weight: var(--font-weight-bold);
    padding: 0;
    border: none;
    background: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-2);
    margin-top: var(--spacing-2);
    cursor: pointer;
  }
  .contextual-show-more-icon {
    flex-grow: 0;
    height: 24px;
  }
  .contextual-show-more-icon.flipped {
    transform: rotateX(180deg);
    transform-origin: center;
  }
  .context-variable-label {
    font-weight: var(--font-weight-bold);
  }
  .context-variable-value {
    font-style: italic;
  }
  .contextual-data-more {
    margin-top: var(--spacing-2);
  }
  @media (min-width: 768px) {
    .contextual-data:nth-of-type(2) {
      margin-top: var(--spacing-8) !important;
    }
  }
</style>
