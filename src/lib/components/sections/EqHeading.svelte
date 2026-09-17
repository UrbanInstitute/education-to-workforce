<!-- A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review. -->

<script>
  import { getContext } from "svelte";
  import { urbanColors } from "@urbaninstitute/dataviz-components/utils";
  import IconInformation from "$icons/IconInformation.svelte";
  import pageContent from "$data/archie-ml/page-tool.aml";
  import { formatCountPhrase, agreeWithMetrics } from "$utils/availabilityText";
  import { titleCaseEqName } from "$utils/titleCaseEqName";

  /**
   * EQ heading row (mockups 2, 4, 5): EQ short name (bold) + selected geography name
   * (light), info icon → intro modal, italic full question, and the availability
   * jump-link to #eq-metrics.
   *
   * @typedef {Object} Props
   * @property {*} content - page-tool.aml {eqSection}
   * @property {(e: MouseEvent) => void} onInfoClick
   */

  /** @type {Props} */
  let { content, onInfoClick } = $props();

  const tool = getContext("tool");

  let metricCount = $derived(tool.selectedMetricCounts.hasMetricData);
  let indicatorCount = $derived(tool.selectedIndicatorCounts.hasMetricData);

  const availability = pageContent.availability;

  // the link carries the counts; the verb that follows sits outside it as plain text
  let jumpLinkText = $derived(formatCountPhrase(metricCount, indicatorCount, availability));
  let availableSuffix = $derived(
    agreeWithMetrics(
      metricCount,
      availability.availableSuffix,
      availability.availableSuffixSingular
    )
  );
</script>

<div class="eq-heading">
  <h2>
    <span class="eq-name">{titleCaseEqName(tool.selectedEq?.shorthand)}</span>
    <button class="info-button" aria-label="How to interpret this tool" onclick={onInfoClick}>
      <IconInformation bgFill={urbanColors.gray} fill="#ffffff" />
    </button>
    {#if tool.geoid1Data}
      <span class="geo-name">{tool.geoid1Data.name}</span>
    {/if}
  </h2>
  <p class="full-question">
    <em>{tool.selectedEq?.full_question}</em>
  </p>
  <p class="availability">
    {#if indicatorCount > 0}
      <a class="jump-link" href="#eq-metrics">{jumpLinkText}</a>
      <span class="suffix">{availableSuffix}</span>
    {:else}
      <span class="suffix">{availability.noneAvailable}</span>
    {/if}
  </p>
</div>

<style>
  .eq-heading h2 {
    margin: 0;
    display: flex;
    align-items: baseline;
    gap: var(--spacing-3);
    flex-wrap: wrap;
  }

  .eq-name {
    font-weight: var(--font-weight-bold);
  }

  .geo-name {
    font-weight: var(--font-weight-light);
    color: var(--color-gray-shade-darkest);
  }

  .info-button {
    appearance: none;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    line-height: 0;
    align-self: center;
  }

  .full-question {
    margin: var(--spacing-2) 0 0;
    color: var(--color-gray-shade-darker) !important;
  }

  /* the availability sentence sits on its own line under the question (2026-09-16) */
  .availability {
    margin: var(--spacing-2) 0 0;
  }

  .availability a.jump-link {
    color: var(--color-blue-shade-dark);
    font-weight: var(--font-weight-bold);
    text-decoration: none;
  }
  .availability a.jump-link,
  .availability .suffix {
    font-size: 16px !important;
  }

  .jump-link:hover {
    text-decoration: underline;
  }

  .suffix {
    color: var(--color-gray-shade-darker);
  }
</style>
