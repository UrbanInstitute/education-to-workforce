<script>
  import Geocoder from "./Geocoder.svelte";
  import cacheMap from "$utils/cacheMap";
  import stateData from "$data/autocomplete/states.json";
  // @ts-ignore
  import archieData from "$archie/geocoder.aml";

  let { geoLevel, ...rest } = $props();
</script>

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
  {/await}
{:else}
  {@render disabledGeocoder()}
{/if}
