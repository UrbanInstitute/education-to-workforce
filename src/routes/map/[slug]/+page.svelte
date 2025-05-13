<script>
  import IconArrowLeft from "$icons/IconArrowLeft.svelte";
  import MetricCard from "$components/MetricCard/MetricCard.svelte";
  import ShowHideControls from "$components/Page3/ShowHideControls.svelte";
  import { urbanColors } from "@urbaninstitute/dataviz-components/utils";
  import { Meta, logClickToGA } from "@urbaninstitute/dataviz-components";
  import BasicDropdown from "$components/BasicDropdown.svelte";
  import SelectComparisonGeo from "$components/SelectComparisonGeo.svelte";
  import GeocoderWrapper from "$components/Geocoder/GeocoderWrapper.svelte";
  import { expandedMobileMediaQuery } from "$utils/mediaQuery.svelte.js";
  import { getAbsoluteUrl } from "$utils/urls";
  import { constructQueryParams, buildQueryString } from "$utils/queryParameters";
  import cacheMap from "$utils/cacheMap";
  import ClearSelection from "$components/Geocoder/ClearSelection.svelte";
  import { getMetricCardData } from "$utils/getMetricCardData";
  import { DROPDOWN_WIDTH } from "$utils/consts";
  import Mapbox from "$components/Page3/Mapbox.svelte";
  import MapInfo from "$components/Page3/MapInfo.svelte";
  import getSelectedIndicators from "$utils/getSelectedIndicators";
  import { formatDynamicText } from "$utils/dynamicText";
  import getEyebrowText from "$utils/getEyebrowText";
  import { tick } from "svelte";
  import MetricCardNoData from "$components/MetricCard/MetricCardNoData.svelte";
  import { scaleThreshold } from "d3-scale";
  import { COLOR_RANGE } from "$utils/consts";
  import { prefersReducedMotion } from "svelte/motion";
  import { bboxPolygon } from "@turf/bbox-polygon";
  import { featureCollection } from "@turf/helpers";
  import { bbox } from "@turf/bbox";

  /**
   * setup indicator object type
   * @typedef {import("../../../lib/utils/types/IndicatorObject").IndicatorObject} IndicatorObject
   */

  /** @type {{ data: import('./$types').PageData }} */
  let { data } = $props();
  let pageSlug = $derived(data.slug);

  /** @type {HTMLElement | undefined} */
  // card container element for use when auto scrolling after changing dropdowns
  let cardContainerEl = $state();

  /** @type {HTMLElement | undefined} */
  // map info element for use (on mobile) when auto scroll after changing metrics
  let mobileMapInfoEl = $state();

  /*
  QUERY PARAMS
  */
  // define the query params to expect
  const params = constructQueryParams(pageSlug, false);

  // if geoid1 and geoid2 are the same, set geoid2 to null
  $effect(() => {
    if ($params.geoid1 === $params.geoid2) {
      $params.geoid2 = null;
    }
  });

  /*
  LOCATION DATA
  */

  // geoid state and derived data
  let geoid1 = $derived($params.geoid1); // read-only context (set $params.geoid1 if writing)
  let geoid1Data = $state();
  let loading = $state(false);
  $effect(() => {
    loading = true;
    cacheMap.fetchData(pageSlug, geoid1).then((res) => {
      // setTimeout(() => {
      geoid1Data = res[geoid1];
      loading = false;
      // }, 1000);
    });
  });
  let geoid2 = $derived($params.geoid2); // read-only context (set $params.geoid2 if writing)
  let geoid2Data = $state();
  let loading2 = $state(false);
  $effect(() => {
    if (geoid2) {
      // if geoid2 exists, get data
      loading2 = true;
      cacheMap.fetchData(pageSlug, geoid2).then((res) => {
        loading2 = false;
        geoid2Data = res[geoid2];
      });
    } else {
      // otherwise, set to undefined
      geoid2Data = undefined;
    }
  });

  let combinedBbox = $derived.by(() => {
    // if neither geoid1 nor geoid2 data is loaded, return undefined
    // or if any data are in the process of loading, return undefined
    if ((!geoid1Data && !geoid2Data) || loading || loading2) return undefined;

    // if geoid1 data is loaded but geoid2 doesn't exist, load geoid1 bbox
    if (geoid1Data && !geoid2) {
      return geoid1Data.bbox;
    }

    // if geoid1 data is loaded and geoid2 exists and data is loaded, return the bbox of the two bboxes
    if (geoid1Data && geoid2 && geoid2Data && !loading) {
      // Create the overall bounding box
      // Convert bounding boxes to polygons
      const poly1 = bboxPolygon(geoid1Data.bbox);
      const poly2 = bboxPolygon(geoid2Data.bbox);

      // Get the bbox of both bboxes
      // @ts-ignore
      return bbox(featureCollection([poly1, poly2]));
    }
  });

  /*
  FILTERING FUNCTIONALITY
  */

  // declare state for dropdowns/filters
  let selectedFilter = $state("sector");

  /** @type {Array<{ value: string; label: string; }>} */
  let filterPills = $derived(
    data.archie.page.filters.find(
      (/** @type {{ label: string; value: string; }} */ d) => d.value === selectedFilter
    ).selections
  );

  /** @type {string[] | undefined} */
  let selectedFilterValues = $state(undefined);

  $effect(() => {
    // if filterPills is changed, update filterValues to be all the values
    if (filterPills) {
      selectedFilterValues = filterPills.map((d) => d.value);
    }
  });

  // get selected indicator metadata based on eq and geoid1Data
  let allIndicators = $derived(getSelectedIndicators(undefined, data, geoid1Data));
  let selectedIndicators = $derived.by(() => {
    // IF FILTER IS "SECTOR"
    if (selectedFilter === "sector") {
      // filter all indicators that include all values as fields
      return (
        allIndicators
          .filter((ind) =>
            // @ts-ignore
            selectedFilterValues?.some((val) => ind[`sector_${val}`] == true)
          )
          // sort by the number of sector_ values that are true
          .sort((a, b) => {
            // @ts-ignore
            let aCount = selectedFilterValues?.filter((val) => a[`sector_${val}`] == true).length;
            // @ts-ignore
            let bCount = selectedFilterValues?.filter((val) => b[`sector_${val}`] == true).length;
            // @ts-ignore
            return bCount - aCount;
          })
      );
      // IF FILTER IS "TYPE"
    } else if (selectedFilter === "type") {
      // setup sort based on type
      let sortOrder = filterPills.map((d) => +d.value);
      let customSort = (/** @type {IndicatorObject} */ a, /** @type {IndicatorObject} */ b) => {
        return sortOrder.indexOf(a.type) - sortOrder.indexOf(b.type);
      };

      // filter and sort
      return allIndicators
        .filter((ind) => selectedFilterValues?.map((d) => +d).includes(ind.type))
        .sort(customSort);
      // IF FILTER IS "DOMAIN"
    } else if (selectedFilter === "domain") {
      // setup sort based on domain
      let sortOrder = filterPills.map((d) => +d.value);
      let customSort = (/** @type {IndicatorObject} */ a, /** @type {IndicatorObject} */ b) => {
        return sortOrder.indexOf(a.domain) - sortOrder.indexOf(b.domain);
      };

      // filter and sort
      return allIndicators
        .filter((ind) => selectedFilterValues?.map((d) => +d).includes(ind.domain))
        .sort(customSort);
    } else {
      allIndicators;
    }
  });
  let selectedIndicatorsHasDataCount = $derived(
    selectedIndicators ? selectedIndicators.filter((ind) => ind.hasMetricDataCount).length : 0
  );
  let selectedMetricCounts = $derived({
    hasMetricData: selectedIndicators
      .filter((ind) => ind.hasMetricDataCount)
      .reduce((total, next) => total + next.hasMetricData.length, 0),
    noMetricData: selectedIndicators
      .filter((ind) => ind.noMetricDataCount)
      .reduce((total, next) => total + next.noMetricData.length, 0)
  });
  // look through selected indicators and find the first metric that has data for the selected geo
  let initialMetric = $derived(
    selectedIndicators?.filter((ind) => ind.hasMetricDataCount)[0]?.hasMetricData[0]?.metric_id ||
      null
  );

  /*
  METRIC CARD DATA
  */

  // get the geoid data that goes into the metric card
  let metricCardData = $derived(getMetricCardData(geoid1Data, geoid2Data, data));

  /*
  MAPBOX FUNCTIONALITY
  */

  // whether or not the map is loading (aka changing metrics)
  let mapLoading = $state(false);

  // selected metric id for the map
  let selectedMetric = $state();
  // effect to set selectedMetric initially
  $effect(() => {
    if (initialMetric && !selectedMetric) {
      selectedMetric = initialMetric;
    }
  });
  // derived metadata
  let selectedMetricMetadata = $derived(
    selectedMetric ? data.metadata.metrics.find((d) => d.metric_id === +selectedMetric) : undefined
  );

  // the data that goes into the choropleth map
  let selectedMetricData = $state();

  // create a scale based on metric data
  let choroplethScale = $derived.by(() => {
    if (selectedMetricData) {
      // @ts-ignore
      const scaleColors =
        selectedMetricData.breaks.length < COLOR_RANGE.length
          ? COLOR_RANGE.slice(0, selectedMetricData.breaks.length + 1)
          : COLOR_RANGE;
      return scaleThreshold().domain(selectedMetricData.breaks).range(scaleColors);
    }
  });

  // loading the metric data for the map
  $effect(() => {
    if (selectedMetric) {
      mapLoading = true;
      cacheMap.fetchData("map", pageSlug, selectedMetric).then((res) => {
        selectedMetricData = res;
        mapLoading = false;
      });
    }
  });

  const scrollMetricCardIntoView = (/** @type {number} */ metric) => {
    if (!expandedMobileMediaQuery.current) {
      tick().then(() => {
        if (!loading && selectedIndicators) {
          setTimeout(() => {
            document
              .getElementById(`${metric}-card-container`)
              ?.scrollIntoView({ behavior: prefersReducedMotion.current ? "instant" : "smooth" });
          }, 50);
        }
      });
    }
  };

  const mapClickHandler = (/** @type {string} */ d) => {
    // if data matches existing params, don't do anything
    if (d === $params.geoid1 || d === $params.geoid2) {
      return;
    }
    // if geoid2 exists, click should update geoid2a user has two locations selected, a click updates the second location
    if ($params.geoid2) {
      $params.geoid2 = d;
    } else {
      // if geoid2 doesn't exist, set geoid1
      $params.geoid1 = d;
    }

    // if not mobile, scroll to indicator
    scrollMetricCardIntoView(selectedMetric);
    logClickToGA(undefined, "page-3-map-click");
  };

  // page meta

  let pageTitleGeo = $derived(
    pageSlug === "states" ? "State" : pageSlug === "counties" ? "County" : "Neighborhood"
  );
  let pageDescriptionGeo = $derived(
    pageSlug === "states" ? "state" : pageSlug === "counties" ? "county" : "neighborhood"
  );
</script>

<!-- CARDS SNIPPET -->
{#snippet cards()}
  <div class="card-container scroll-shadows" bind:this={cardContainerEl}>
    <!-- if geoid data and selected indicators exist -->
    {#if geoid1Data && !loading && selectedIndicators}
      <!-- destructure indicator number, indicator name, and associated metrics -->
      {#each selectedIndicators as ind (ind.indicator_number)}
        <!-- if indicator contains "hasMetricData" array and it's greater than 0 -->
        {#if ind.hasMetricData && ind.hasMetricData.length > 0}
          {#each ind.hasMetricData as metricMetadata, i (metricMetadata.metric_id)}
            {#if metricMetadata.years_available}
              <!-- if first metric in the indicator list, show the titles, if not remove them -->
              {@const eyebrowText = getEyebrowText(data, ind, selectedFilter)}
              <MetricCard
                titleText={i === 0 ? ind.indicator_name : null}
                eyebrowText={i === 0 ? eyebrowText : null}
                data={metricCardData}
                metadata={metricMetadata}
                stateOnly={pageSlug == "states"}
                {loading}
                timeframe={$params.timeframe}
                onclick={(/** @type {number} */ d) => {
                  selectedMetric = d;
                  if (expandedMobileMediaQuery.current) {
                    mobileMapInfoEl?.scrollIntoView();
                  } else {
                    scrollMetricCardIntoView(selectedMetric);
                  }
                  logClickToGA(undefined, "page-3-metric-card-click");
                }}
                selectedFlag={selectedMetric === metricMetadata.metric_id}
                selectable={true}
                pinYear={true}
              />
            {/if}
          {/each}
        {/if}
      {/each}
    {:else}
      <!-- loading state -->
      {#each { length: 6 }}
        <MetricCardNoData height={300} loading={true} />
      {/each}
    {/if}
  </div>
{/snippet}

<!-- CONTROLS SNIPPET -->
{#snippet controls()}
  <div class="controls-container">
    <div class="geos-timeframe">
      <GeocoderWrapper
        geoLevel={pageSlug}
        eyebrowLabel="Geography"
        onresult={(/** @type {{ properties: { geoid: string; }; }} */ d) =>
          ($params.geoid1 = d.properties.geoid)}
        input={geoid1Data ? geoid1Data.name : ""}
      />
      <SelectComparisonGeo
        open={geoid2}
        width={DROPDOWN_WIDTH}
        horizontal={true}
        upperPadding={true}
        onclick={(e) => {
          logClickToGA(e.target, "page-3-add-comparison-geography");
        }}
      >
        <div>
          <GeocoderWrapper
            geoLevel={pageSlug}
            eyebrowLabel="Comparison Geography"
            id="geoid2"
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
                logClickToGA(e.target, "page-3-clear-comparison");
              }}
              color="var(--color-black)"
            />
          {/if}
        </div>
      </SelectComparisonGeo>
      <BasicDropdown
        id="timeframe-dropdown"
        placeholder={null}
        inlineLabel="Timeframe"
        showLabel
        on:change={(e) => {
          logClickToGA(e.target, "page-3-timeframe-dropdown");
        }}
        data={data.archie.timeframeData.dropdown}
        bind:value={$params.timeframe}
        dropdownWidth={DROPDOWN_WIDTH}
      />
    </div>
    <div>
      <BasicDropdown
        id="filter-dropdown"
        placeholder={null}
        inlineLabel="Filter by"
        showLabel
        data={data.archie.page.filters.map((/** @type {{ value: string; label: string; }} */ d) => {
          return { value: d.value, label: d.label };
        })}
        bind:value={selectedFilter}
        on:change={(e) => {
          // when changing the type, scroll back to top of page
          tick().then(() => cardContainerEl?.scrollTo(0, 0));
          logClickToGA(e.target, "page-3-filter-dropdown");
        }}
        dropdownWidth={DROPDOWN_WIDTH}
      />
      <div class="filter-pill-container">
        {#each filterPills as { value, label } (value)}
          <label class="filter-pill">
            <input
              type="checkbox"
              bind:group={selectedFilterValues}
              onchange={(e) => {
                logClickToGA(e.target, "page-3-filter-pill-toggle");
              }}
              {value}
              oninput={() =>
                // when changing the type, scroll back to top of page
                tick().then(() => cardContainerEl?.scrollTo(0, 0))}
            />
            <div>
              <span>{label}</span>
              {#if selectedFilterValues && selectedFilterValues.includes(value)}
                <span class="deselect">x</span>
              {/if}
            </div>
          </label>
        {/each}
      </div>
    </div>
  </div>
{/snippet}

{#snippet mapInfo()}
  <div class="map-info">
    {#if selectedMetricMetadata && choroplethScale}
      <MapInfo
        metricMetadata={selectedMetricMetadata}
        geoid1Name={geoid1Data ? geoid1Data.name : ""}
        geoid2Name={geoid2Data ? geoid2Data.name : null}
        metricData={selectedMetricData.data}
        scale={choroplethScale}
      />
    {/if}
  </div>
{/snippet}

<Meta
  title={formatDynamicText(data.archie.page.meta.title, { geo: pageTitleGeo })}
  description={formatDynamicText(data.archie.page.meta.description, { geo: pageDescriptionGeo })}
  authors={data.meta.authors}
  keywords={data.meta.keywords}
  url={data.meta.url}
  siteName={data.meta.siteName}
  publishDate={data.meta.publishDate}
  socialImage={getAbsoluteUrl(data.meta.socialImage)}
/>
<div class="page-container">
  <div class="sidebar-container">
    <div class="non-card-container">
      <a
        class="return"
        href={getAbsoluteUrl(`indicators/${pageSlug}?${buildQueryString($params)}`)}
      >
        <IconArrowLeft fill={urbanColors.gray_shade_darkest} />
        <span>{data.archie.page.return}</span>
      </a>

      <h1>{data.archie.page.title}</h1>
      <div class="indicator-number-label">
        {#if selectedMetricCounts.hasMetricData > 1}
          {@html formatDynamicText(data.archie.page.subtitle, {
            x: `<span class="number">${selectedMetricCounts.hasMetricData}</span>`
          })}
        {:else}
          {@html formatDynamicText(data.archie.page.subtitleSingular, {
            x: `<span class="number">${selectedMetricCounts.hasMetricData}</span>`
          })}
        {/if}
      </div>

      <div class="show-hide-controls">
        <ShowHideControls
          onclick={(e) => {
            logClickToGA(e.target, "page-3-show-hide-controls");
          }}
        >
          {@render controls()}
        </ShowHideControls>
      </div>
    </div>
    <!-- if desktop, render before the map -->
    {#if !expandedMobileMediaQuery.current}
      {#if geoid1Data}
        {#if selectedIndicatorsHasDataCount > 0}
          {@render cards()}
        {:else}
          <div style="font-style: italic; margin-top:var(--spacing-2);">
            {data.archie.page.noIndicators}
          </div>
        {/if}
      {/if}
    {/if}
  </div>
  <!-- if mobile, display above map -->
  {#if expandedMobileMediaQuery.current}
    <div bind:this={mobileMapInfoEl} style="scroll-margin-top: var(--navbar-height);">
      {@render mapInfo()}
    </div>
  {/if}
  <div
    class="map-container"
    style:opacity={mapLoading ? "0.7" : ""}
    style:pointer-events={mapLoading ? "none" : "auto"}
  >
    <!-- if desktop, display within map container -->
    {#if !expandedMobileMediaQuery.current}
      {@render mapInfo()}
    {/if}
    {#if geoid1Data}
      <Mapbox
        geoLevel={pageSlug}
        geoNames={data.geoNames}
        onclick={mapClickHandler}
        metricData={selectedMetricData?.data}
        metricMetadata={selectedMetricMetadata}
        scale={choroplethScale}
        {geoid1}
        {geoid2}
        bbox={combinedBbox}
      />
    {/if}
  </div>
  <!-- if mobile, render after the map -->
  {#if expandedMobileMediaQuery.current}
    {#if geoid1Data}
      {@render cards()}
    {/if}
  {/if}
</div>

<style>
  .page-container {
    /* max-width: 90rem; */
    margin: 0 auto;
    display: flex;
    flex-direction: row;
  }

  .sidebar-container {
    width: 35rem;
    height: calc(100vh - var(--navbar-height));
    display: grid; /* use grid/template to dictate height of children */
    grid-template-rows: min-content auto;
    grid-template-columns: 1fr;

    padding: var(--spacing-12);
    padding-top: var(--spacing-2);
    padding-bottom: 0;
  }

  .sidebar-container .return {
    color: var(--color-gray-shade-darkest);
    font-weight: var(--font-weight-normal);
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    font-size: var(--font-size-small);
  }

  .sidebar-container .return:hover {
    color: var(--color-gray-shade-darkest);
    font-weight: var(--font-weight-normal);
    cursor: pointer;
    text-decoration: underline;
  }

  .sidebar-container .non-card-container {
    grid-row: 1;
  }

  .sidebar-container h1 {
    text-align: center;
    font-size: var(--font-size-4xl) !important;
    margin: var(--spacing-10) 0 var(--spacing-4) 0;
  }

  .sidebar-container .indicator-number-label {
    text-align: center;
    color: var(--color-gray-shade-darker);
    font-style: italic;
    margin-bottom: var(--spacing-4);
  }

  .sidebar-container .indicator-number-label :global(.number) {
    font-weight: var(--font-weight-bold);
  }

  .controls-container .geos-timeframe {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: var(--spacing-4);
    margin-bottom: var(--spacing-4);
  }

  .card-container {
    margin-top: var(--spacing-4);
    grid-row: 2;
    overflow-y: scroll;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-8);
    padding-bottom: var(--spacing-12);
    scrollbar-color: var(--color-gray) var(--color-white);
  }

  /* hide scrollbar */
  /* .card-container::-webkit-scrollbar {
    display: none;
  } */

  .map-container {
    width: calc(100% - 35rem);
    height: calc(100vh - var(--navbar-height));
    transition: opacity 200ms ease;
  }

  .map-info {
    position: fixed;
    z-index: 1;
    background-color: var(--color-white);
    margin: var(--spacing-4);
    padding: var(--spacing-4);
    border-radius: var(--border-radius-2);
    box-shadow: var(--shadow-2);
    min-width: var(--spacing-12);
    max-width: 22.5rem;
  }

  .filter-pill-container {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-3);
    margin-top: var(--spacing-4);
    margin-bottom: var(--spacing-2);
  }

  /* Hiding class, making content visible only to screen readers but not visually
  * https://css-tricks.com/inclusively-hidden/
 */
  label.filter-pill input[type="checkbox"] {
    appearance: none;
    -webkit-appearance: none;
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    height: 1px;
    overflow: hidden;
    position: absolute;
    white-space: nowrap;
    width: 1px;
  }

  label.filter-pill {
    cursor: pointer;
    padding: var(--spacing-2) var(--spacing-4);
    border-radius: 0.3125rem;
    font-weight: var(--font-weight-bold);
    font-size: var(--font-size-normal);
    color: var(--color-gray-shade-dark);
    background-color: var(--color-gray-shade-lightest);
    border: 1px solid var(--color-gray-shade-medium, #dcdbdb);
  }

  label.filter-pill div {
    display: inline-flex;
    gap: var(--spacing-3);
  }

  label.filter-pill:has(input[type="checkbox"]:checked) {
    border: 1px solid var(--color-blue-shade-light, #a2d4ec);
    color: var(--color-gray-shade-darkest);
    background-color: #cfe8f3;
  }

  @media (max-width: 60rem) {
    .page-container {
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: var(--spacing-4);
      padding: 0;
      margin: 0 auto;
    }

    .sidebar-container {
      width: 100%;
      height: fit-content;
      display: block;
      padding: 0;
      padding-top: var(--spacing-2);
    }

    .sidebar-container .return {
      padding-left: var(--spacing-6);
    }

    .sidebar-container h1 {
      font-size: 1.75rem !important;
      margin-top: var(--spacing-7);
      margin-right: var(--spacing-4);
      margin-left: var(--spacing-4);
    }

    .controls-container {
      margin: 0 var(--spacing-5) var(--spacing-4) var(--spacing-5);
    }

    .show-hide-controls {
      margin: 0 var(--spacing-4);
    }

    .map-container {
      width: 100%;
      max-width: 57rem;
      height: 31.1875rem;
    }

    .map-info {
      margin: 0;
      padding: 0 var(--spacing-4);
      max-width: 100%;
      position: inherit;
    }

    .card-container {
      width: 100%;
      max-width: 35.25rem;
      margin-top: var(--spacing-8);
      padding-left: var(--spacing-5);
      padding-right: var(--spacing-5);
      padding-bottom: var(--spacing-5);
    }
  }
</style>
