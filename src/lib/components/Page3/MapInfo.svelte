<script>
  import { ColorLegend } from "@urbaninstitute/dataviz-components/maps";
  import { urbanColors } from "@urbaninstitute/dataviz-components/utils";
  import { formatFun } from "$utils/formatFun";

  /**
   * @property {import('../../utils/types/MetricMetadataObject.js').MetricMetadataObject} metricMetadata - the metadata for the metric (containing title and type)
   * @property {string} geoid1Name - the name of the first geography
   * @property {function} scale - the scale for the metric data
   * @property {string} [geoid2Name] - the name of the second geography
   * @property {Object[] | undefined} metricData - the data for the metric
   */
  let { metricMetadata, geoid1Name, scale, geoid2Name = null, metricData = undefined } = $props();

  // check if the page is loading, aka metricData hasn't come in yet
  let loading = $derived(metricData === undefined || metricData.length === 0);

  // declare the tick format based on the metric metadata
  let tickFormat = $derived((/** @type {number} */ d) => formatFun(d, metricMetadata.metric_type));
</script>

<div>
  <div class="currently-showing">Currently showing</div>
  <div class="metric-name">{metricMetadata.metric_full_name}</div>
  {#if !loading && scale}
    <ColorLegend
      {scale}
      height={16}
      tickLineColor={"white"}
      tickLineWidth={2}
      {tickFormat}
      naFill={urbanColors.gray}
      naSpacing={30}
      margin={{ top: 0, right: 3, bottom: 5, left: 0 }}
      maxWidth={500}
    />
  {/if}
  <ul class="geoid-names">
    {#if geoid1Name}
      <li>{geoid1Name}</li>
    {/if}
    {#if geoid2Name}
      <li>{geoid2Name}</li>
    {/if}
  </ul>
</div>

<style>
  .currently-showing {
    font-size: var(--font-size-small);
    color: var(--color-gray-shade-darkest);
    font-weight: var(--font-weight-normal);
    font-style: italic;
  }

  .metric-name {
    font-size: var(--font-size-normal);
    color: var(--color-black);
    font-weight: var(--font-weight-bold);
    margin-bottom: var(--spacing-4);
  }

  .geoid-names {
    font-size: var(--font-size-normal);
    color: var(--color-gray-shade-darkest);
    font-weight: var(--font-weight-normal);
    margin: 0;
  }

  ul {
    /* margin: 0; */
    margin-top: var(--spacing-1);
    /* spacing between li elements */
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }

  ul li {
    list-style-type: none;
  }

  li::before {
    content: "";
    background: var(--color-magenta-shade-dark);
    padding-inline: var(--spacing-1);
    margin-inline-end: var(--spacing-1);
  }
</style>
