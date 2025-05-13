<script>
  import Button from "$components/Button.svelte";
  import RadioGroup from "$components/Page1/RadioGroup.svelte";
  import RadioButton from "$components/Page1/RadioButton.svelte";
  import GeocoderWrapper from "$components/Geocoder/GeocoderWrapper.svelte";
  import BasicDropdown from "$components/BasicDropdown.svelte";
  import { INIT_GEOCODER_OBJ } from "$utils/consts";
  import { getAbsoluteUrl } from "$utils/urls";
  import { expandedMobileMediaQuery } from "$utils/mediaQuery.svelte.js";
  import cacheMap from "$utils/cacheMap";
  import getSelectedIndicators from "$utils/getSelectedIndicators.js";
  import { Meta, logClickToGA } from "@urbaninstitute/dataviz-components";

  let { data } = $props();

  // @ts-ignore
  let eqDataSorted = $state(
    data.archie.eqData.data.sort(
      (/** @type {{ shorthand: string; }} */ a, /** @type {{ shorthand: string; }} */ b) =>
        a.shorthand.localeCompare(b.shorthand)
    )
  );
  let eqAvailability = $state();

  /** @type {number}*/
  let selectionsHeight = $state(0);

  // application state
  /** @type {string | null} */
  let geoLevel = $state(null);

  // create results and derived geoid pieces of state
  let selectedLocation = $state(INIT_GEOCODER_OBJ);
  let geoid = $derived(selectedLocation.properties.geoid);

  // create the eqid
  let eqid = $state(null);

  // create the state to load geoid data
  let geoidData = $state(undefined);
  let loading = $state(false);

  // function to get geoid data based on geoLevel and geoid
  const getGeoidData = () => {
    if (geoid !== "init" && geoLevel) {
      loading = true;
      cacheMap.fetchData(geoLevel, geoid).then((res) => {
        geoidData = res[geoid];
        loading = false;
      });
    }
  };

  // get all indicator availability based on the selected geoid
  let allIndicators = $derived.by(() => {
    if (geoidData && !loading) {
      // force the pageData arg to take in a slug (even thought we're not on pages 2 and 3)
      // @ts-ignore
      return getSelectedIndicators(undefined, { ...data, slug: geoLevel }, geoidData);
    }
  });

  $effect(() => {
    // if there's geoid data, done loading, indicators are available
    if (geoidData && !loading && allIndicators) {
      // create a new array of eqData with the total number of indicators and the number of indicators with metric data
      eqAvailability = eqDataSorted.map(
        (
          /** @type {{ total_indicators: number; id: string; in_tool_indicators: number; }} */ eq
        ) => {
          eq.total_indicators = allIndicators?.filter((ind) => {
            if (typeof ind.eq_id == "string") ind.eq_id = [ind.eq_id];
            return ind.eq_id.includes(eq.id);
          }).length;
          eq.in_tool_indicators = allIndicators?.filter((ind) => {
            if (typeof ind.eq_id == "string") ind.eq_id = [ind.eq_id];
            let hasMetricDataLength = ind.hasOwnProperty("hasMetricData")
              ? ind?.hasMetricData?.length
              : 0;
            if (hasMetricDataLength) {
              return ind.eq_id.includes(eq.id) && hasMetricDataLength > 0;
            } else {
              return false;
            }
          }).length;
          return eq;
        }
      );
    }
  });
</script>

{#snippet selectionsSection()}
  <h2><span class="number">1.</span> {data.archie.page.directions[0]}</h2>
  <div class="dropdowns-container">
    <BasicDropdown
      id="geo-level-dropdown"
      bind:value={geoLevel}
      placeholder={"Choose data level"}
      inlineLabel="Choose data level"
      data={data.archie.page.geoLevelDropdownData}
      on:change={(e) => {
        selectedLocation = INIT_GEOCODER_OBJ;
        geoidData = undefined;
        loading = false;
        eqid = null;
        logClickToGA(e.target, "page-1-select-data-level");
      }}
    />
    <GeocoderWrapper
      {geoLevel}
      onresult={(
        /** @type {{ properties: { geoid: string; title: string; }; place_name: string; }} */ d
      ) => {
        selectedLocation = d;
        getGeoidData();
        logClickToGA(null, "page-1-geocoder-search");
      }}
      onclear={() => {
        selectedLocation = INIT_GEOCODER_OBJ;
      }}
      width={260}
    />
  </div>

  <hr />
  <div class="title-2-container">
    <h2>
      <span class="number">2.</span><span>
        {`${data.archie.page.directions[1]}${geoid == "init" ? "" : ` in ${selectedLocation.properties.title}`}`}
        <span class="see-more">{@html data.archie.page.seeMoreCopy}</span>
      </span>
    </h2>
  </div>
  <RadioGroup disabled={geoid === "init"}>
    {#each eqDataSorted as d (d.id)}
      {@const availability = eqAvailability?.find(
        (/** @type {{ id: number; }} */ eq) => eq.id === d.id
      )}
      <RadioButton title={d.shorthand} value={d.id} disabled={geoid === "init"} bind:group={eqid} onchange={(e) => {
        logClickToGA(e.target, `page-1-select-eq-${d.id}`);
      }}/>
    {/each}
  </RadioGroup>
  <div style="display:flex; justify-content: end; margin-top: var(--spacing-6);">
    {#if geoLevel && geoid !== "init" && eqid}
      <Button href={getAbsoluteUrl(`indicators/${geoLevel}?geoid1=${geoid}&eqid=${eqid}`)}
        >{data.archie.page.submit_button}</Button
      >
    {:else}
      <Button buttonMode disabled>{data.archie.page.submit_button}</Button>
    {/if}
  </div>
{/snippet}

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
<div class="parent">
  <div class="intro-text">
    <div class="intro-text-content">
      <h1>{data.archie.page.title}</h1>
      <Button href={data.archie.page.data_download_link} target="_blank"
        >{data.archie.page.data_download_text}</Button
      >
      {#each data.archie.page.copy as copy}
        <p>
          {@html copy}
        </p>
      {/each}
    </div>
  </div>
  <div class="selections" bind:clientHeight={selectionsHeight}>
    <div class="selections-content">
      {@render selectionsSection()}
    </div>
    <!-- video on mute, autoplay -->
    <video
      style:height={expandedMobileMediaQuery.current ? `${selectionsHeight}px` : "unset"}
      class={expandedMobileMediaQuery.current ? "mobile" : "desktop"}
      autoplay
      loop
      muted
      playsinline
      aria-hidden="true"
    >
      <!-- fallback list -->
      <source src="./video/video.webm" type="video/webm; codecs=vp9" />
      <source src="./video/video-265.mp4" type="video/mp4; codecs=hevc" />
      <source src="./video/video-264.mp4" type="video/mp4; codecs=avc1" />
    </video>
  </div>
</div>

<style>
  /* parent containing .intro-text and .selections */
  .parent {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: stretch;
    min-height: calc(100vh - var(--navbar-height));
  }

  /* intro text (left pane) */
  .intro-text {
    background-color: rgba(0, 0, 0, 0.8);
    color: white !important;
    padding: 4.875rem;
    width: 42vw;
    background-clip: padding-box;
    display: flex;
    justify-content: center;
  }

  .intro-text-content {
    max-width: 30rem;
  }

  .intro-text-content h1 {
    color: white !important;
    margin-top: 0;
    font-size: 44px;
  }

  .intro-text-content p {
    color: white !important;
    font-size: 14px !important;
    line-height: var(--line-height-normal) !important;
  }

  .intro-text-content p :global(a) {
    color: white !important;
    text-decoration: underline;
  }

  /* selections area (right pane) */
  .selections {
    width: 58vw;
    padding: 3rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    background-color: rgba(227, 227, 227, 0.8);
  }

  .selections-content {
    max-width: 35rem;
  }

  /* video */
  video.desktop {
    position: fixed;
    right: 0;
    top: var(--navbar-height, 56px);
    min-width: 100%;
    min-height: calc(100vh - var(--navbar-height));
    width: auto;
    height: auto;
    z-index: -1000;
    background-size: cover;
    transition: 1s opacity;
  }

  video.mobile {
    position: absolute;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: -1000;
  }

  hr {
    border: 0;
    border-top: 1px solid #9d9d9d;
    margin: 3rem 0;
  }

  .dropdowns-container {
    display: flex;
    flex-direction: row;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
  }

  h2 {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    font-size: 1.375rem !important;
    font-weight: var(--font-weight-semibold) !important;
  }

  h2 .number {
    align-self: start;
    font-family: var(--font-family-sans);
    font-weight: var(--font-weight-light);
    font-size: var(--font-size-3xl);
  }

  .title-2-container .see-more :global(a) {
    font-weight: var(--font-weight-normal) !important;
    color: var(--color-blue-shade-dark);
  }
  .title-2-container .see-more {
    white-space: nowrap;
    font-size: var(--font-size-small);
    font-family: var(--font-family-sans);
    font-weight: var(--font-weight-normal) !important;
    font-style: italic;
    /* text-decoration: none; */
  }
  .title-2-container .see-more:hover {
    text-decoration: underline;
    text-decoration-color: var(--color-blue-shade-dark);
  }

  .title-2-container {
    margin-bottom: 2.5rem;
  }

  /* set max-width manually */
  @media (max-width: 60rem) {
    .parent {
      flex-direction: column;
      height: unset;
    }

    .intro-text {
      width: 100%;
      height: fit-content;
      padding: 3.25rem 2rem;
    }

    .intro-text-content {
      max-width: 39rem;
    }

    h1 {
      font-size: var(--font-size-4xl) !important;
      font-weight: var(--font-weight-semibold) !important;
    }

    .selections {
      width: 100%;
      height: fit-content;
      overflow: unset;
      padding: unset;
    }

    .selections-content {
      max-width: 39rem;
      margin: 3.25rem 2rem;
    }
  }
</style>
