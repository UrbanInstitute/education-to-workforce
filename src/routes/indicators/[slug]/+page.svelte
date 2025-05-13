<script>
  // import { fetchData } from "$utils/fetch.svelte";
  import { Meta, logClickToGA } from "@urbaninstitute/dataviz-components";
  import MetricCard from "$components/MetricCard/MetricCard.svelte";
  import DownloadButton from "$components/MetricCard/DownloadButton.svelte";
  import cacheMap from "$utils/cacheMap";
  import BasicDropdown from "$components/BasicDropdown.svelte";
  import StickyFooter from "$components/Page2/StickyFooter.svelte";
  import ContextStats from "$components/Page2/ContextStats.svelte";
  import SelectComparisonGeo from "$components/SelectComparisonGeo.svelte";
  import GeocoderWrapper from "$components/Geocoder/GeocoderWrapper.svelte";
  import { getAbsoluteUrl } from "$utils/urls";
  import { formatDynamicText } from "$utils/dynamicText";
  import { constructQueryParams, buildQueryString } from "$utils/queryParameters";
  import ClearSelection from "$components/Geocoder/ClearSelection.svelte";
  import { getMetricCardData } from "$utils/getMetricCardData";
  import { DROPDOWN_WIDTH } from "$utils/consts";
  import MetricCardNoData from "$components/MetricCard/MetricCardNoData.svelte";
  import getSelectedIndicators from "$utils/getSelectedIndicators";
  import { intermediateMobileMediaQuery, mobileMediaQuery } from "$utils/mediaQuery.svelte";
  import { tick } from "svelte";

  /** @type {{ data: import('./$types').PageData }} */
  let { data } = $props();
  let pageSlug = $derived(data.slug);

  // define the query params to expect
  const params = constructQueryParams(pageSlug);

  // get selected eq metadata
  let selectedEq = $derived(
    data.archie.eqData.data.find((/** @type {{ id: string | null; }} */ d) => d.id == $params.eqid)
  );

  // if geoid1 and geoid2 are the same, set geoid2 to null
  $effect(() => {
    if ($params.geoid1 === $params.geoid2) {
      $params.geoid2 = null;
    }
  });

  // geoid state and derived data
  let geoid1 = $derived($params.geoid1); // read-only context (set $params.geoid1 if writing)

  /** @type {import("$utils/types/GeoidDataObject.js").GeoidDataObject | undefined} */
  let geoid1Data = $state();
  let loading = $state(false);
  let geoid1ContextData = $state();
  let contextLoading = $state(false);
  let geoid2ContextData = $state();
  let context2Loading = $state(false);

  $effect(() => {
    loading = true;
    cacheMap.fetchData(pageSlug, geoid1).then((res) => {
      geoid1Data = res[geoid1];
      loading = false;
    });
  });
  $effect(() => {
    // if geoid1 exists, get context data
    if ((geoid1 && !geoid1ContextData) || (geoid1 && geoid1ContextData?.geoid !== geoid1)) {
      contextLoading = true;
      cacheMap.fetchData("context", pageSlug, geoid1).then((res) => {
        if (res && res.length > 0) {
          const contextData = res.find((d) => d.geoid === geoid1);
          if (contextData) {
            geoid1ContextData = contextData;
          }
        }
        contextLoading = false;
      });
    }
  });
  $effect(() => {
    // if geoid1 exists, get context data
    if ((geoid2 && !geoid2ContextData) || (geoid2 && geoid2ContextData?.geoid !== geoid2)) {
      context2Loading = true;
      cacheMap.fetchData("context", pageSlug, geoid2).then((res) => {
        if (res && res.length > 0) {
          const contextData = res.find((d) => d.geoid === geoid2);
          if (contextData) {
            geoid2ContextData = contextData;
          }
        }
        context2Loading = false;
      });
    }
  });
  let locationMarkup = $derived(
    `in <span class="location">${geoid1Data ? geoid1Data.name : ""} ${geoid2Data ? "and " + geoid2Data.name : ""}</span>`
  );
  let geoid2 = $derived($params.geoid2); // read-only context (set $params.geoid2 if writing)
  let geoid2Data = $state();
  $effect(() => {
    // if geoid2 exists, get data
    if (geoid2) cacheMap.fetchData(pageSlug, geoid2).then((res) => (geoid2Data = res[geoid2]));
    // otherwise, set to undefined
    else {
      geoid2Data = undefined;
    }
  });

  // get selected indicator metadata and counts based on eq and geoid1Data
  let selectedIndicators = $derived(getSelectedIndicators(selectedEq, data, geoid1Data));
  let selectedIndicatorCounts = $derived({
    hasMetricData: selectedIndicators.filter((ind) => ind.hasMetricDataCount).length,
    noMetricData: selectedIndicators.filter((ind) => ind.noMetricDataCount).length
  });
  let selectedMetricCounts = $derived({
    hasMetricData: selectedIndicators
      .filter((ind) => ind.hasMetricDataCount)
      .reduce((total, next) => total + next.hasMetricData.length, 0),
    noMetricData: selectedIndicators
      .filter((ind) => ind.noMetricDataCount)
      .reduce((total, next) => total + next.noMetricData.length, 0)
  });

  // get the geoid data that goes into the metric card
  let metricCardData = $derived(getMetricCardData(geoid1Data, geoid2Data, data));

  let contextualDataVars = $derived(
    Array.from(data.metadata.context.entries()).map(([_, val]) => val.geo_id)
  );

  // holds references to each card component
  let cardRefs = {};

  async function downloadAllCharts() {
    for (let cardId in cardRefs) {
      const card = cardRefs[cardId];
      if (card) {
        await card.handleExport();
      }
    }
  }
</script>

<Meta
  title={data.archie.page.title}
  description={data.archie.page.description}
  authors={data.meta.authors}
  keywords={data.meta.keywords}
  url={data.meta.url}
  siteName={data.meta.siteName}
  publishDate={data.meta.publishDate}
  socialImage={getAbsoluteUrl(data.meta.socialImage)}
/>
<div class="page-container">
  <div class="sidebar-parent">
    <div class="sidebar-container">
      <GeocoderWrapper
        id="geoid1"
        geoLevel={pageSlug}
        eyebrowLabel={data.archie.page.controls.location}
        onresult={(/** @type {{ properties: { geoid: string; }; }} */ d) => {
          $params.geoid1 = d.properties.geoid;
          logClickToGA(null, "page-2-geocoder-search");
        }}
        input={geoid1Data ? geoid1Data.name : ""}
      />
      <BasicDropdown
        id="eq-dropdown"
        placeholder={null}
        inlineLabel={data.archie.page.controls.question}
        data={data.archie.eqData.data
          .map((/** @type {{ id: string | number; shorthand: string; }} */ d) => ({
            value: +d.id,
            label: d.shorthand
          }))
          .sort((/** @type {{ label: string; }} */ a, /** @type {{ label: string; }} */ b) =>
            a.label.localeCompare(b.label)
          )}
        on:change={(e) => {
          // when changing the eq, scroll back to top of page
          tick().then(() => window?.scrollTo(0, 0));
          logClickToGA(e.target, "page-2-eq-dropdown");
        }}
        bind:value={$params.eqid}
        showLabel
        dropdownWidth={DROPDOWN_WIDTH}
      />
      <BasicDropdown
        id="timeframe-dropdown"
        placeholder={null}
        inlineLabel={data.archie.page.controls.time}
        showLabel
        data={data.archie.timeframeData.dropdown}
        bind:value={$params.timeframe}
        dropdownWidth={DROPDOWN_WIDTH}
        on:change={(e) => {
          logClickToGA(e.target, "page-2-timeframe-dropdown");
        }}
      />
      <SelectComparisonGeo
        iconSize={38}
        horizontal={intermediateMobileMediaQuery.current}
        open={geoid2}
        onclick={(e) => {
          logClickToGA(e.target, "page-2-select-comparison");
        }}
      >
        <div>
          <GeocoderWrapper
            id="geoid2"
            geoLevel={pageSlug}
            eyebrowLabel="Comparison Geography"
            onresult={(/** @type {{ properties: { geoid: string | null; }; }} */ d) => {
              // if geoid of result is the same as geoid1, set geoid2 to null
              if (d.properties.geoid == geoid1) {
                $params.geoid2 = null;
              } else {
                // set geoid2 to the result
                $params.geoid2 = d.properties.geoid;
              }
            }}
            input={geoid2Data ? geoid2Data.name : ""}
          />

          {#if $params.geoid2}
            <ClearSelection
              onclick={(e) => {
                $params.geoid2 = null;
                logClickToGA(e.target, "page-2-geocoder-clear");
              }}
            />
          {/if}
        </div>
      </SelectComparisonGeo>
    </div>
  </div>

  <div class="main-content-container">
    <div class="has-data-section">
      <h1 class:loading={contextLoading}>
        {@html formatDynamicText(selectedEq?.question_template, { location: locationMarkup })}
      </h1>
      {#if geoid1ContextData && geoid1Data}
        <ContextStats
          contextData={geoid1ContextData}
          name={geoid1Data.name}
          contextVars={data.metadata.context}
        />
      {/if}
      {#if geoid2ContextData && geoid2Data}
        <ContextStats
          contextData={geoid2ContextData}
          name={geoid2Data.name}
          contextVars={data.metadata.context}
        />
      {/if}
      <div class="card-grid-title-container">
        <h2 class="card-grid-title">
          {#if selectedIndicatorCounts.hasMetricData === 1}
            {formatDynamicText(data.archie.page.availableData.labelSingular, {
              metricCount: selectedMetricCounts.hasMetricData.toString(),
              indicatorCount: selectedIndicatorCounts.hasMetricData.toString()
            })}
          {:else if selectedIndicatorCounts.hasMetricData > 1}
            {formatDynamicText(data.archie.page.availableData.label, {
              metricCount: selectedMetricCounts.hasMetricData.toString(),
              indicatorCount: selectedIndicatorCounts.hasMetricData.toString()
            })}
          {:else if selectedIndicatorCounts.hasMetricData === 0}
            {formatDynamicText(data.archie.page.availableData.labelNoData, {
              metricCount: "No",
              indicatorCount: "No"
            })}
          {/if}
        </h2>
        {#if selectedIndicatorCounts.hasMetricData && selectedIndicatorCounts.hasMetricData > 0 && !mobileMediaQuery.current}
          <div class="download-all-container">
            <DownloadButton
              multi={true}
              onclick={(e) => {
                downloadAllCharts(e);
                logClickToGA(e.target, "page-2-download-all-charts");
              }}
            />
          </div>
        {/if}
      </div>
      <div class="card-grid">
        {#if geoid1Data && !loading && selectedIndicators}
          <!-- destructure indicator number, indicator name, and associated metrics -->
          {#each selectedIndicators as { hasMetricData, indicator_number, indicator_name } (indicator_number)}
            {#if hasMetricData && hasMetricData.length > 0}
              {#each hasMetricData as metricMetadata (metricMetadata.metric_id)}
                {#if metricMetadata.years_available}
                  <MetricCard
                    eyebrowText={indicator_name}
                    data={metricCardData}
                    metadata={metricMetadata}
                    stateOnly={pageSlug == "states"}
                    {loading}
                    timeframe={$params.timeframe}
                    selectable={false}
                    bind:this={cardRefs[metricMetadata.metric_id]}
                  />
                {/if}
              {/each}
            {/if}
          {/each}
        {:else}
          <!-- loading state -->
          {#each { length: 4 }}
            <MetricCardNoData height={300} loading={true} />
          {/each}
        {/if}
      </div>
    </div>
    <hr />
    <div class="no-data-section">
      <h2>
        {#if selectedIndicatorCounts.noMetricData === 1}
          {formatDynamicText(data.archie.page.unavailableData.labelSingular, {
            metricCount: selectedMetricCounts.noMetricData.toString(),
            indicatorCount: selectedIndicatorCounts.noMetricData.toString()
          })}
        {:else if selectedIndicatorCounts.noMetricData > 1}
          {formatDynamicText(data.archie.page.unavailableData.label, {
            metricCount: selectedMetricCounts.noMetricData.toString(),
            indicatorCount: selectedIndicatorCounts.noMetricData.toString()
          })}
        {:else if selectedIndicatorCounts.noMetricData === 0}
          {formatDynamicText(data.archie.page.unavailableData.label, {
            metricCount: "No",
            indicatorCount: "No"
          })}
        {/if}
      </h2>
      <p class="explainer-text">
        {@html data.archie.page.unavailableData.copy}
      </p>
      <div class="card-grid">
        {#if geoid1Data && !loading && selectedIndicators}
          <!-- destructure indicator number, indicator name, and associated metrics -->
          {#each selectedIndicators as { noMetricData, indicator_number, indicator_name } (indicator_number)}
            {#if noMetricData && noMetricData.length > 0}
              {#each noMetricData as metricMetadata (metricMetadata.metric_id)}
                <MetricCardNoData
                  cardTitle={metricMetadata.metric_full_name}
                  eyebrowText={indicator_name}
                  metadata={metricMetadata}
                />
              {/each}
            {/if}
          {/each}
        {/if}
      </div>
    </div>
  </div>
</div>
<!-- remove eqid from query string -->
<StickyFooter
  href={getAbsoluteUrl(`map/${pageSlug}?${buildQueryString($params)}`)}
  buttonText={data.archie.page.button_text}
  copy={geoid1Data
    ? formatDynamicText(data.archie.page.footer, { location: geoid1Data.name })
    : null}
/>

<style>
  .page-container {
    display: flex;
    gap: var(--spacing-16);
    max-width: 90rem;
    padding: 0 var(--spacing-12);
    margin: 0 auto;
  }

  .sidebar-parent {
    position: sticky;
    top: 5.625rem; /* offset from top to match vertical space with next column over */
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
    max-width: 16.3125rem;
    height: fit-content;
    z-index: 500;
  }

  .sidebar-container {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-7);
    justify-content: space-between;
    background-color: var(--color-gray-shade-lightest);
    padding: var(--spacing-8) var(--spacing-6);
  }

  h1 {
    font-weight: var(--font-weight-medium) !important;
    color: var(--color-gray-shade-darkest) !important;
    font-size: var(--font-size-4xl) !important;
  }

  h1 :global(.location) {
    font-weight: var(--font-weight-semibold) !important;
    text-decoration: underline;
    text-decoration-color: var(--color-magenta-shade-dark);
    text-decoration-thickness: 0.375rem;
    text-underline-offset: var(--spacing-2);
  }

  .card-grid-title-container {
    margin-bottom: var(--spacing-8);
    margin-top: var(--spacing-12);
  }

  .card-grid-title {
    margin-bottom: var(--spacing-2);
    margin-top: 0;
  }

  h2 {
    font-weight: var(--font-weight-semibold) !important;
    font-size: 1.75rem !important;
  }

  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: var(--spacing-10);
  }

  hr {
    margin: var(--spacing-16) 0;
  }

  .explainer-text {
    font-style: italic;
  }

  .no-data-section {
    margin-bottom: var(--spacing-16);
  }

  .loading .location {
    text-decoration-color: var(--color-magenta-shade-darker);
    color: var(--color-gray-shade-light);
    transition:
      color 0.1s,
      text-decoration 0.1s;
  }
  @media (min-width: 768px) {
    .card-grid-title-container {
      margin-top: var(--spacing-16);
    }
  }

  @media (max-width: 56rem) {
    .page-container {
      flex-direction: column;
      gap: var(--spacing-8);
      padding: 0;
    }

    .sidebar-parent {
      position: default;
      top: auto;
      max-width: 100%;
      margin-top: 0;
    }

    .sidebar-container {
      flex-direction: row;
      flex-wrap: wrap;
      justify-content: flex-start;
    }

    .main-content-container {
      margin: 0 var(--spacing-8);
    }

    .no-data-section {
      margin-bottom: var(--spacing-12);
    }

    h1 {
      font-size: 1.75rem !important;
    }

    h2 {
      font-size: var(--font-size-2xl) !important;
    }
  }
</style>
