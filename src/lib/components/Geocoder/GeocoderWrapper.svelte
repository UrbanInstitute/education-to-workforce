<!-- A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review. -->

<script>
  import cacheMap from "$utils/cacheMap";
  import stateData from "$data/autocomplete/states.json";
  // @ts-ignore
  import archieData from "$archie/geocoder.aml";

  let { geoLevel, ...rest } = $props();

  // @mapbox/mapbox-gl-geocoder, its two stylesheets and the tract lookup are only needed
  // once the search box is interactive, so Geocoder.svelte is a lazy chunk (dev-plan
  // §12.5 #1). The whole component defers, not just the library import: the lib patches
  // its own prototype from `<script module>` and the instance is constructed during
  // component init, so there is no seam inside Geocoder.svelte to split at. Requested
  // during init so it downloads alongside the autocomplete fetch below.
  /** @type {typeof import("./Geocoder.svelte").default | undefined} */
  let Geocoder = $state();
  /** the chunk itself failed to load — the placeholder becomes the permanent state */
  let loadFailed = $state(false);
  import("./Geocoder.svelte")
    .then((m) => (Geocoder = m.default))
    .catch((err) => {
      console.error("geocoder failed to load", err);
      loadFailed = true;
    });
</script>

<!-- Stands in while the chunk loads, and permanently if it fails. Plain markup on purpose:
     disabledGeocoder below renders a real Geocoder, so it can't cover its own load. Sized
     and styled to match the lib's box so the panel doesn't shift when the real input
     arrives, and it carries the caller's id so ControlPanel's `<label for>` stays attached. -->
{#snippet placeholderInput(/** @type {string} */ text)}
  <div class="geocoder-placeholder">
    <input id={rest.id} type="text" placeholder={text} disabled value="" />
  </div>
{/snippet}

{#if !Geocoder}
  {@render placeholderInput(
    loadFailed ? "Search unavailable" : archieData.searchPlaceholders.disabled
  )}
{:else}
  {#snippet disabledGeocoder(placeholder = archieData.searchPlaceholders.disabled)}
    <Geocoder
      types="region"
      {placeholder}
      customData={{
        features: [],
        type: "FeatureCollection"
      }}
      disabled={true}
      {...rest}
    />
  {/snippet}

  {#if geoLevel == "states"}
    <Geocoder
      types="region"
      placeholder={archieData.searchPlaceholders.states}
      customData={stateData}
      localGeocoderOnly={true}
      {...rest}
    />
  {:else if geoLevel == "counties"}
    {#await cacheMap.fetchData("autocomplete", "counties")}
      {@render disabledGeocoder("Loading...")}
    {:then customData}
      <Geocoder
        types="district"
        placeholder={archieData.searchPlaceholders.counties}
        {customData}
        localGeocoderOnly
        {...rest}
      />
    {:catch}
      {@render disabledGeocoder("Search unavailable")}
    {/await}
  {:else if geoLevel == "tracts"}
    {#await cacheMap.fetchData("autocomplete", "tracts")}
      {@render disabledGeocoder("Loading...")}
    {:then customData}
      <Geocoder
        types="address"
        placeholder={archieData.searchPlaceholders.tracts}
        {customData}
        {...rest}
      />
    {:catch}
      {@render disabledGeocoder("Search unavailable")}
    {/await}
  {:else if geoLevel == "school_districts"}
    {#await cacheMap.fetchData("autocomplete", "school_districts")}
      {@render disabledGeocoder("Loading...")}
    {:then customData}
      <Geocoder
        types="address"
        placeholder={archieData.searchPlaceholders.school_districts}
        {customData}
        localGeocoderOnly
        {...rest}
      />
    {:catch}
      {@render disabledGeocoder("Search unavailable")}
    {/await}
  {:else}
    {@render disabledGeocoder()}
  {/if}
{/if}

<style>
  /* mirrors .mapboxgl-ctrl-geocoder + --input from the vendor stylesheet and
     local-geocoder-styles.css, both of which ship in the lazy chunk */
  .geocoder-placeholder {
    width: 260px;
    background-color: var(--color-white);
  }

  .geocoder-placeholder input {
    font-family: "Lato";
    font-size: 18px;
    line-height: 24px;
    width: 100%;
    height: 50px;
    margin: 0;
    border: 0;
    background-color: transparent;
    padding-left: var(--spacing-7);
    padding-right: var(--spacing-3);
    color: var(--color-gray-shade-darker);
    cursor: not-allowed;
    text-overflow: ellipsis;
  }

  .geocoder-placeholder input::placeholder {
    color: var(--color-gray-shade-darker);
  }
</style>
