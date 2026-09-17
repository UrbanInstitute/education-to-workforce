<!-- A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review. -->

<script>
  import { getContext } from "svelte";
  import { logClickToGA } from "@urbaninstitute/dataviz-components";
  import { formatDynamicText } from "$utils/dynamicText";
  import EqHeading from "$components/sections/EqHeading.svelte";
  import AccordionDrawer from "$components/sections/AccordionDrawer.svelte";
  import LocalCharacteristics from "$components/sections/LocalCharacteristics.svelte";
  import MapLegendCard from "$components/sections/MapLegendCard.svelte";

  /**
   * Map module (mockups 1, 2, 4, 5): the EQ heading, the two accordion drawers, and the
   * Mapbox choropleth with the floating legend card. Sits in the right column of the
   * page-level tool layout, beside the global control panel.
   * State flows exclusively through ToolState (context "tool").
   *
   * @typedef {Object} Props
   * @property {*} content - page-tool.aml (controls, eqSection, mapLegend, …)
   * @property {Map<string, *>} contextVars - parsed context.json metadata
   * @property {(e: MouseEvent) => void} onInfoClick - opens the intro modal
   */

  /** @type {Props} */
  let { content, contextVars, onInfoClick } = $props();

  /** @type {import("$lib/state/toolState.svelte.js").ToolState} */
  const tool = getContext("tool");

  // mapbox-gl plus its CSS is ~386 KB gzip — over a third of the eager bundle — and the
  // map already mounts late, so Mapbox.svelte is a lazy chunk (dev-plan §12.5 #1). The
  // import is issued during init rather than when mapMounted flips, so the library
  // downloads in parallel with the geoNames fetch that gates the mount; splitting the
  // component rather than the library keeps `new mapboxgl.Popup()` in component init and
  // the stylesheet out of the eager CSS.
  /** @type {typeof import("$components/sections/Mapbox.svelte").default | undefined} */
  let Mapbox = $state();
  /** the chunk itself failed to load — without this the loading badge would spin forever */
  let mapLoadFailed = $state(false);
  import("$components/sections/Mapbox.svelte")
    .then((m) => (Mapbox = m.default))
    .catch((err) => {
      console.error("map failed to load", err);
      mapLoadFailed = true;
    });

  // The map mounts once geoNames for the initial level is ready, then stays mounted for
  // the life of the page: level changes swap the boundary source in place inside Mapbox
  // (geoNames goes undefined during the per-level refetch; the wrapper's loading
  // treatment covers that window instead of unmounting the map).
  let mapMounted = $state(false);
  $effect(() => {
    if (tool.geoNames) mapMounted = true;
  });

  /** both halves ready: the lazy component and the level's geography-name lookup */
  const mapReady = $derived(mapMounted && Mapbox !== undefined);

  /** @param {string} geoid */
  const handleMapClick = (geoid) => {
    tool.mapClickHandler(geoid);
    logClickToGA(/** @type {*} */ (undefined), "tool-map-click");
  };
</script>

<div class="map-module">
  <EqHeading content={content.eqSection} {onInfoClick} />

  {#if tool.error}
    <p class="tool-error" role="alert">
      Something went wrong loading data ({tool.error.scope}): {tool.error.message}
    </p>
  {/if}

  <div class="drawer-row">
    <AccordionDrawer
      id="eq-learn-more"
      label={content.eqSection.learnMoreLabel}
      onToggle={(open, e) => logClickToGA(/** @type {*} */ (e.currentTarget), "tool-drawer-toggle")}
    >
      {#if tool.selectedEq?.learn_more_intro}
        <div class="learn-more-copy">
          <p>
            {@html tool.selectedEq.learn_more_intro}
            {formatDynamicText(content.eqSection.learnMoreCountTemplate, {
              count: `${tool.selectedIndicators.length}`
            })}
          </p>
          <ul>
            <!-- the full indicator list for the EQ, data or not: selectedIndicators maps
                 over indicator_list without filtering on availability -->
            {#each tool.selectedIndicators as indicator (indicator.indicator_number)}
              <li>{indicator.indicator_name}</li>
            {/each}
          </ul>
          <p>{@html tool.selectedEq.learn_more_use}</p>
        </div>
      {/if}
    </AccordionDrawer>
    <!-- mounted in the national view too: the nation has its own contextual data as of
         the 2026-07-23 refresh, so the drawer no longer needs a selected geography -->
    <AccordionDrawer
      id="local-characteristics"
      label={tool.contextIsNational
        ? content.eqSection.populationLabelNational
        : content.eqSection.populationLabel}
      onToggle={(open, e) => logClickToGA(/** @type {*} */ (e.currentTarget), "tool-drawer-toggle")}
    >
      <LocalCharacteristics {contextVars} content={content.localCharacteristics} />
    </AccordionDrawer>
  </div>

  <div class="map-area">
    <!-- no card at all when the EQ has nothing mappable at this level, or while a
         geography's shard is still in flight: the control panel's "No metrics available at
         this level" is the single place that says so (settled 2026-08-21) -->
    {#if tool.hasMappableMetric}
      <div class="legend-overlay">
        <MapLegendCard content={content.mapLegend} />
      </div>
    {/if}
    {#if mapReady}
      <div class="map-wrapper" class:loading={tool.mapVisuallyLoading}>
        <Mapbox
          geoLevel={tool.level}
          metricData={tool.mapMetricData?.data}
          metricMetadata={tool.selectedMetricMetadata}
          geoNames={tool.geoNames}
          scale={tool.choroplethScale}
          geoid1={tool.geoid1}
          geoid2={tool.geoid2}
          bbox={tool.combinedBbox}
          nationalView={!tool.geoid1}
          onclick={handleMapClick}
          onRenderStateChange={(/** @type {boolean} */ pending) =>
            (tool.mapRenderPending = pending)}
        />
      </div>
    {:else if mapLoadFailed}
      <div class="map-placeholder">
        <p class="tool-error" role="alert">The map could not be loaded.</p>
      </div>
    {:else}
      <!-- the map chunk and/or geoNames for the initial level still loading -->
      <div class="map-placeholder"></div>
    {/if}
    <!-- always mounted so the show transition-delay works (suppresses flash on fast switches) -->
    <div
      class="map-loading-badge"
      class:visible={!mapLoadFailed && (tool.mapVisuallyLoading || !mapReady)}
      role="status"
    >
      Loading&hellip;
    </div>
  </div>
</div>

<style>
  .map-module {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-6);
    /* no top padding: the page-level tool layout provides the shared top offset so the
       EQ heading aligns with the control panel */
    padding: 0 0 var(--spacing-8);
  }

  .drawer-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-6);
    align-items: start;
  }

  .learn-more-copy {
    font-size: var(--font-size-small) !important;
    color: var(--color-gray-shade-darkest);
  }

  .learn-more-copy p {
    margin: 0;
    font-size: inherit !important;
  }

  .learn-more-copy ul {
    margin: var(--spacing-2) 0;
    padding-left: var(--spacing-5);
  }

  .learn-more-copy li {
    font-size: inherit;
    line-height: 1.4;
  }

  .tool-error {
    margin: 0;
    padding: var(--spacing-3) var(--spacing-4);
    background: var(--color-red-shade-lightest);
    color: var(--color-red-shade-darker);
    font-size: var(--font-size-small);
  }

  .map-area {
    position: relative;
    height: 37.5rem;
  }

  .legend-overlay {
    position: absolute;
    top: var(--spacing-4);
    left: var(--spacing-4);
    z-index: 10;
  }

  .map-wrapper,
  .map-placeholder {
    height: 100%;
    transition: opacity 0.35s ease; /* fade back in gently */
  }

  .map-wrapper.loading {
    opacity: 0.6;
    transition-duration: 0.15s; /* dim quickly */
    pointer-events: none;
  }

  .map-loading-badge {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 20;
    background: var(--color-white);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
    padding: var(--spacing-3) var(--spacing-6);
    font-size: var(--font-size-regular);
    color: var(--color-gray-shade-darkest);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease; /* hide immediately when ready */
  }

  .map-loading-badge.visible {
    opacity: 1;
    transition-delay: 300ms; /* suppress flash on fast/cached switches */
  }

  .map-placeholder {
    background: var(--color-gray-shade-lightest);
  }

  /* basic stacking below the expanded-mobile breakpoint (full mobile treatment: Phase 8) */
  @media (max-width: 64rem) {
    .drawer-row {
      grid-template-columns: 1fr;
    }

    /* a floor against a degenerate frame on any short viewport — 60vh alone can hand the
       map less height than the legend card needs, at which point the national fit has
       nowhere to go. Inert above ~500px of viewport height, so tablets are untouched (iPad
       portrait keeps its 614px); it binds on a landscape phone or a short desktop window.
       vh, not dvh, on purpose: at 60% the large-viewport value already fits inside the
       small viewport, so dvh would only add a resize on every URL-bar collapse. */
    .map-area {
      height: max(18.75rem, 60vh);
    }
  }

  /* phones (Phase 8). Must follow the 64rem block — same specificity, later wins. */
  @media (max-width: 33.75rem) {
    /* pin the right edge too: the card is shrink-to-fit while only `left` is set, so
       MapLegendCard's fluid width has nothing to resolve against without this */
    .legend-overlay {
      right: var(--spacing-4);
    }

    /* a fixed frame rather than 60vh. The continental US is ~1.9:1 against a portrait
       phone column, so a correctly-fitted national map only needs ~134px of height here —
       60vh (506px at 390x844) left the country stranded in ~270px of empty Canada and
       Central America. 300px is the compromise with the selected-geography view, which
       wants the height: one value for both, so the frame never jumps when a user picks
       or clears a geography. */
    .map-area {
      height: 18.75rem;
    }
  }
</style>
