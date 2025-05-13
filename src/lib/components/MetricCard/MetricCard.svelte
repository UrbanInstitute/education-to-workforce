<script>
  import IconInformation from "$icons/IconInformation.svelte";
  import { Tooltip, logClickToGA } from "@urbaninstitute/dataviz-components";
  import { formatFun } from "$utils/formatFun";
  import altTemplates from "$data/archie-ml/chart-alt.aml";
  import { urbanColors } from "@urbaninstitute/dataviz-components/utils";
  import ViewBreakdowns from "./ViewBreakdowns.svelte";
  import BarChart from "$components/BarChart/BarChart.svelte";
  import Table from "$components/Table.svelte";
  import BasicDropdown from "$components/BasicDropdown.svelte";
  import { DROPDOWN_WIDTH } from "$utils/consts";
  import { formatDynamicText } from "$utils/dynamicText";
  import TrendlineChartWrapper from "$components/TrendlineChart/TrendlineChartWrapper.svelte";
  import getTableData from "$utils/getTableData";
  import Download from "./Download.svelte";
  import Self from "./MetricCard.svelte";
  import { LogoUrbanWide } from "@urbaninstitute/dataviz-components";
  import { getBarData, getTrendData } from "$utils/getMetricCardData";
  import getDisaggregateDropdownData from "$utils/getDisaggregateDropdownData";
  import { Previous } from "runed";

  /**
   * @property {Array<import("$utils/types/GeoidDataObject.js").GeoidDataObject>} [data] - The data to be displayed in the card.
   * @property {import("$utils/types/MetricMetadataObject.js").MetricMetadataObject} metadata - The metadata for the card.
   * @property {string} [titleText=null] - The title of the card.
   * @property {string} eyebrowText - The eyebrow text of the card.
   * @property {boolean} [noData=false] - A flag to indicate if the card has no data.
   * @property {boolean} [selected=false] - A flag to indicate if the card has been selected (map page only).
   * @property {boolean} [stateOnly=false] - A flag to indicate if the card is only displaying states.
   * @property {boolean} [loading=false] - A flag to indicate if the card is loading.
   * @property {string|undefined} [downloadedFlag=undefined] - A flag to indicate if the card has been downloaded.
   * @property {function} [onclick=() => {}] - The function to be called when the card is clicked.
   * @property {boolean} [selectable=false] - A flag to indicate if the card is selectable/clickable (for map page only).
   */
  let {
    data,
    metadata = {},
    titleText = null,
    eyebrowText,
    noData = false,
    selectedFlag = false,
    stateOnly = false,
    loading = false,
    timeframe = "recent",
    downloadedFlag = false,
    breakdownsOpenFlag = $bindable(false),
    dropdownValue = undefined,
    onclick = () => {},
    selectable = false,
    pinYear = false
  } = $props();

  const metricAccessor = "m" + metadata.metric_id;
  const hasDisaggregatesFlag = metadata.disag_available && metadata.disag_available !== "FALSE";

  // if string, convert to single value array
  const yearsAvailable =
    typeof metadata.years_available == "string"
      ? [+metadata.years_available]
      : metadata.years_available.map((/** @type {string | number} */ d) => +d);
  // get most recent year available
  let recentYear = $derived.by(() => {
    let result = Math.max(...yearsAvailable).toString();
    // if the most recent year specified in metadata doesn't exist in this selection,
    // find the most recent year that does exist and display it
    // this functionality can be circumvented by setting `pinYear = false`
    if (data[0].data[metricAccessor][result] === undefined && !pinYear) {
      // reverse the years array (with slice for new copy) to find the most recent year with data
      result = yearsAvailable
        .slice()
        .reverse()
        .find((year) => data[0].data[metricAccessor][year] !== undefined)
        .toString();
    }
    return result;
  });

  // visualization data
  let barData = $derived(getBarData(data, metricAccessor, recentYear));
  let trendData = $derived(getTrendData(data, metricAccessor, yearsAvailable));
  let hasTrendData = $derived(trendData.reduce((acc, curr) => curr.data.length > 1 || acc, false));

  // setup tooltip elements
  let pinEl = $state();
  let showInfo = $state(false);

  // get disaggregate dropdown data
  const disaggregateDropdownData = getDisaggregateDropdownData(metadata.disag_available);

  // get the appropriate dropdown data based on timeframe
  let dropdownData = $derived(
    timeframe === "recent" ? disaggregateDropdownData.recent : disaggregateDropdownData.all
  );

  const previousTimeframe = new Previous(() => timeframe);

  // if the timeframe changes while the breakdowns flag is open, reset the dropdown value
  $effect(() => {
    if (previousTimeframe.current && breakdownsOpenFlag)
      dropdownValue =
        timeframe === "recent"
          ? disaggregateDropdownData.recent[0].value
          : disaggregateDropdownData.all[0].value;
  });

  // if disaggregates flag is true and dropdown value is undefined (by default), set to first value
  // if the dropdownValue has a value, that means it's been initialized/interacted with
  // we don't want the value to reset when the image is being downloaded
  $effect(() => {
    if (hasDisaggregatesFlag && dropdownValue == undefined)
      dropdownValue =
        timeframe === "recent"
          ? disaggregateDropdownData.recent[0].value
          : disaggregateDropdownData.all[0].value;
  });

  // setup the table data
  let tableData = $derived(
    getTableData(
      data,
      timeframe,
      "m" + metadata.metric_id,
      yearsAvailable,
      recentYear,
      dropdownValue,
      metadata.metric_type
    )
  );

  // setup the hover flag
  let hoverFlag = $state(false);

  let cardDownload = $state();

  export async function handleExport() {
    if (cardDownload) {
      return cardDownload.handleExport();
    }
  }

  let chartLabel = $derived.by(getChartLabel);

  function getAltTemplate() {
    if (timeframe === "recent" || !hasTrendData) {
      let options = altTemplates.barchart;
      if (stateOnly) {
        if (data.length > 2) {
          return options.state_compare;
        }
        return options.state;
      }
      // else this is county or tract
      if (data.length > 3) {
        // multiple counties or tracts
        return options.county_tract_compare;
      }
      return options.county_tract;
      // single county or tract
    } else {
      let options = altTemplates.linechart;
      if (stateOnly) {
        if (data.length > 2) {
          return options.state_compare;
        } else {
          return options.state;
        }
      } else {
        if (data.length > 3) {
          return options.county_tract_compare;
        } else {
          return options.county_tract;
        }
      }
    }
  }

  function getChartLabel() {
    const template = getAltTemplate();
    // for bar charts
    if (timeframe === "recent" || !hasTrendData) {
      // state level
      let data = {
        year: recentYear,
        metric: metadata.metric_full_name,
        location: barData[0].name,
        value: formatFun(barData[0].value, metadata.metric_type),
        national_value: formatFun(barData[barData.length - 1].value, metadata.metric_type)
      };
      if (!stateOnly) {
        // county or tract
        data.state = barData[1].name;
        data.state_value = formatFun(barData[1].value, metadata.metric_type);
        if (barData.length > 3) {
          // comparison present
          data.comparison_location = barData[2].name;
          data.comparison_value = formatFun(barData[2].value, metadata.metric_type);
        }
      } else if (barData.length > 2) {
        data.comparison_location = barData[1].name;
        data.comparison_value = formatFun(barData[1].value, metadata.metric_type);
      }
      return formatDynamicText(template, data);
    } else {
      // for line charts
      let year_first = trendData[0].data[0].year;
      let year_last = trendData[0].data[trendData[0].data.length - 1].year;
      let value_first = formatFun(trendData[0]?.data[0]?.value, metadata.metric_type);
      let value_last = formatFun(
        trendData[0]?.data[trendData[0].data.length - 1]?.value,
        metadata.metric_type
      );
      let metric = metadata.metric_full_name;
      let location = trendData[0].name;
      let national_value_first = formatFun(
        trendData[trendData.length - 1].data[0].value,
        metadata.metric_type
      );
      let national_value_last = formatFun(
        trendData[trendData.length - 1].data[trendData[trendData.length - 1].data.length - 1].value,
        metadata.metric_type
      );
      let data = {
        year_first,
        year_last,
        metric,
        location,
        value_first,
        value_last,
        national_value_first,
        national_value_last
      };
      if (!stateOnly) {
        data.state = trendData[1].name;
        data.state_value_first = formatFun(trendData[1].data[0].value, metadata.metric_type);
        data.state_value_last = formatFun(
          trendData[1].data[trendData[1].data.length - 1].value,
          metadata.metric_type
        );
        if (trendData.length > 3) {
          // comparison present
          data.comparison_location = trendData[2].name;
          data.comparison_value_first = formatFun(trendData[2].data[0].value, metadata.metric_type);
          data.comparison_value_last = formatFun(
            trendData[2].data[trendData[2].data.length - 1].value,
            metadata.metric_type
          );
        }
      } else if (trendData.length > 2) {
        // state only but comparison present
        data.comparison_location = trendData[1].name;
        data.comparison_value_first = formatFun(trendData[1].data[0].value, metadata.metric_type);
        data.comparison_value_last = formatFun(
          trendData[1].data[trendData[1].data.length - 1].value,
          metadata.metric_type
        );
      } else {
      }
      return formatDynamicText(template, data);
    }
  }
</script>

{#snippet cardTitle()}
  <div class="card-title-container">
    <div class="card-title" class:no-data={noData} class:underlined={hoverFlag && selectable}>
      {metadata.metric_full_name}
    </div>
    {#if !noData && (timeframe == "recent" || !hasTrendData)}
      <div class="card-subtitle">{recentYear}</div>
    {/if}
  </div>
{/snippet}

{#snippet viz()}
  {#if timeframe == "recent" || !hasTrendData}
    <BarChart
      data={barData}
      {stateOnly}
      formatType={metadata.metric_type}
      {downloadedFlag}
      ariaLabel={chartLabel}
    />
  {:else if timeframe == "all"}
    <TrendlineChartWrapper
      data={trendData}
      formatType={metadata.metric_type}
      {downloadedFlag}
      ariaLabel={chartLabel}
    />
  {/if}
{/snippet}

<div class="{metadata.metric_id}-card-container" id="{metadata.metric_id}-card-container">
  {#if titleText}
    <div class="title-text">{titleText}</div>
  {/if}
  {#if eyebrowText}
    <div class="eyebrow-text" class:no-data={noData}>{@html eyebrowText}</div>
  {/if}

  <!-- apply selected container if it's selectable, selected/hovered, and not downloaded -->
  <div
    class="content"
    class:selected={selectable && (selectedFlag || hoverFlag) && !downloadedFlag}
  >
    {@render cardTitle()}

    {#if !noData}
      {@render viz()}

      {#if selectable}
        <button
          aria-label="Select metric: {metadata.metric_full_name}"
          class="card-base-interaction-layer"
          onmouseenter={() => (hoverFlag = true)}
          onmouseleave={() => (hoverFlag = false)}
          onclick={() => onclick(metadata.metric_id)}
          style:cursor={selectable ? "pointer" : "default"}
          style:pointer-events={"auto"}
        ></button>
      {/if}
      {#if downloadedFlag}
        <div style="display:flex; justify-content:end; margin-right:.25rem;">
          <LogoUrbanWide />
        </div>
        {#if metadata.source_label}
          <div style:color="var(--color-gray-shade-darker)">
            <b>Source:</b>
            {@html metadata.source_label}
          </div>
        {/if}
        {#if metadata.notes_label}
          <div style:color="var(--color-gray-shade-darker)">
            <b>Notes:</b>
            {@html metadata.notes_label}
          </div>
        {/if}
      {:else}
        <div class="source-container card-interactive">
          <div class="source">Source</div>
          <button
            bind:this={pinEl}
            aria-label="Source"
            onclick={(e) => {
              showInfo = !showInfo;
              logClickToGA(e.target, "metric-card-source-toggle");
            }}
            style:height="20px"
          >
            <IconInformation />
          </button>
        </div>
      {/if}
      <div class="card-interactive card-full-width">
        <Download id={metadata.metric_id} bind:this={cardDownload} filename={`${metadata.metric_full_name} in ${barData[0].name}`}>
          <Self
            {metadata}
            {titleText}
            {eyebrowText}
            {noData}
            {selectedFlag}
            {stateOnly}
            {loading}
            {timeframe}
            {data}
            downloadedFlag={true}
            {breakdownsOpenFlag}
            {dropdownValue}
          />
        </Download>
      </div>
      <!-- if disaggregates exist, show the content -->
      {#if hasDisaggregatesFlag}
        {#if !downloadedFlag || (downloadedFlag && breakdownsOpenFlag)}
          <hr
            style="height:1px;border-width:0;margin:0;"
            style:width="100%"
            style:background-color={urbanColors.gray_shade_medium}
            style:color={urbanColors.gray_shade_medium}
          />
        {/if}
        {#if downloadedFlag && breakdownsOpenFlag}
          <div style:color="var(--color-gray-shade-darker)">
            {dropdownData.find((d) => d.value === dropdownValue)?.label}
          </div>
          <Table header={tableData.header} rows={tableData.rows} />
        {:else if !downloadedFlag}
          <div class="card-interactive card-full-width">
            <ViewBreakdowns bind:open={breakdownsOpenFlag} plural={dropdownData.length > 1}>
              <div>
                {#if dropdownData.length > 1}
                  <BasicDropdown
                    id={"breakdown-" + metadata.metric_id}
                    bind:value={dropdownValue}
                    data={dropdownData}
                    inlineLabel="Breakdown"
                    placeholder={null}
                    dropdownWidth={DROPDOWN_WIDTH}
                  ></BasicDropdown>
                {:else}
                  <span style:color="var(--color-gray-shade-darker)">{dropdownData[0].label}</span>
                {/if}

                <div style="margin-top: var(--spacing-7);">
                  <Table header={tableData.header} rows={tableData.rows} />
                </div>
              </div>
            </ViewBreakdowns>
          </div>
        {/if}
      {/if}
    {/if}
  </div>
</div>
<div class="card-tooltip">
  {#if showInfo}
    <Tooltip elOffset={0} el={pinEl} size="large">
      {#if metadata.source_label}
        <div>
          <b>Source:</b>
          {@html metadata.source_label}
        </div>
      {/if}
      {#if metadata.notes_label}
        <div>
          <b>Notes:</b>
          {@html metadata.notes_label}
        </div>
      {/if}
    </Tooltip>
  {/if}
</div>

<style>
  .card-tooltip {
    position: absolute;
  }
  .card-tooltip :global(.tooltip-outer) {
    pointer-events: all !important;
  }
  .card-container {
    width: 100%;
  }

  .title-text {
    font-family: var(--font-family-sans-alt);
    font-size: 28px;
    font-weight: var(--font-weight-semibold);
    line-height: 137.5%;
    margin-bottom: var(--spacing-1);
    color: var(--color-gray-shade-darkest);
  }

  .eyebrow-text {
    font-size: var(--font-size-small);
    text-transform: uppercase;
    margin-bottom: 1rem;
    color: var(--color-gray-shade-darkest);
  }

  .eyebrow-text :global(.divider) {
    color: var(--color-gray);
    margin: 0 var(--spacing-1);
  }

  .content {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: var(--spacing-4);
    background-color: var(--color-gray-shade-lightest);
    border: 1px solid var(--color-gray-shade-medium);
    padding: var(--spacing-4) var(--spacing-4) var(--spacing-4) var(--spacing-6);
    position: relative;
  }

  .content.selected {
    box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.25);
  }

  .content.selected::before {
    content: "";
    position: absolute;
    left: 0px;
    top: 0;
    width: var(--spacing-2);
    height: 100%;
    background-color: var(--color-magenta-shade-dark);
  }

  .content:has(.no-data) {
    padding: var(--spacing-8);
  }

  .card-title {
    color: var(--color-black);
    font-weight: var(--font-weight-bold);
  }

  .card-subtitle {
    font-size: var(--font-size-small);
    color: var(--color-gray-shade-darker);
  }

  button.content-header {
    padding: 0;
    background: none;
    border: none;
    font: inherit;
    cursor: pointer;
    text-align: left;
    padding-bottom: var(--spacing-3);
  }

  /* fix inherited styles from button */
  :global(button.metric-chart div) {
    color: var(--color-black);
    font: inherit;
    text-align: left;
  }

  .underlined {
    text-decoration: underline;
  }

  .no-data {
    color: var(--color-gray-shade-darker);
  }

  .metric-chart {
    position: relative;
    display: flex;
    flex-direction: column;
    align-content: start;
    padding: 0;
    background: none;
    border: none;
    font: inherit;
    cursor: pointer;
    margin-top: calc(var(--spacing-3) * -1);
  }

  .overlay {
    position: absolute;
    left: calc(var(--spacing-4) * -1);
    width: calc(100% + var(--spacing-8));
    height: 100%;
    background: rgba(245, 245, 245, 0.8); /* #f5f5f5 transparent */
    pointer-events: none; /* allow clicks to pass through overlay */
  }

  .source-container {
    display: flex;
    gap: var(--spacing-2);
    align-items: center;
  }

  .source-container .source {
    color: var(--color-gray-shade-darker);
    font-weight: var(--font-weight-bold);
    font-size: 0.75rem;
  }

  .source-container button {
    padding: 0;
    background: none;
    border: none;
    font: inherit;
    cursor: pointer;
  }

  .card-interactive {
    z-index: 300;
  }

  .card-base-interaction-layer {
    width: 100%;
    height: 100%;
    position: absolute;
    background: none;
    opacity: 0.5;
    top: 0;
    left: 0;
    z-index: 200;
    appearance: none;
    border: none;
  }

  .card-base-interaction-layer:focus-visible {
    outline: 1px solid var(--color-magenta-shade-dark);
    outline-offset: 0;
  }

  .card-full-width {
    width: 100%;
  }

  /* override tooltip font size */
  :global(.tooltip-text) {
    font-size: 12px !important;
  }
</style>
