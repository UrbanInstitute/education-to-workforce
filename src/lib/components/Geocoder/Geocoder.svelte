<!-- A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review. -->

<script module>
  import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";

  // The lib has no "added to the DOM" hook, and we need one: the input and the suggestion
  // list only exist once addTo() has run. Patch the prototype once per module — this used
  // to run in component scope, so every mount wrapped the previous wrapper and the Nth
  // geocoder on the page emitted the event N times. The marker makes the patch idempotent
  // even when a dev-time HMR reload re-executes this module against the same prototype.
  if (!(/** @type {*} */ (MapboxGeocoder.prototype.addTo).emitsAddedToDOM)) {
    const originalAddTo = MapboxGeocoder.prototype.addTo;
    /**
     * @this {*}
     * @param {string | HTMLElement} container
     */
    const addTo = function (container) {
      const result = originalAddTo.call(this, container);
      this._eventEmitter.emit("addedToDOM");
      return result;
    };
    /** @type {*} */ (addTo).emitsAddedToDOM = true;
    MapboxGeocoder.prototype.addTo = addTo;
  }
</script>

<script>
  import "./mapbox-gl-geocoder.css";
  import "./local-geocoder-styles.css";
  import localGeocoder from "$components/Geocoder/localGeocoder";
  import { attachGeocoderA11y } from "./geocoderA11y";
  import { getTractFromResult } from "$utils/tractLookup";
  import { PUBLIC_MAPBOX_API_KEY } from "$env/static/public";

  // jsdoc for these
  /**
   * @typedef {Object} Props
   * @property {string} types mapbox: a comma seperated list of types that filter results to match those specified
   * @property {string} placeholder mapbox: Override the default placeholder attribute value. (optional, default Search)
   * @property {{ features: any[], [key: string]: any }} customData custom data to be used for geocoder (GeoJSON FeatureCollection shape)
   * @property {string} [input] string to set the input to
   * @property {string} [id] id for the input element
   * @property {Function} [onresult] function to run on result selection
   * @property {Function} [onclear] function to run on clear
   * @property {number} [width] width of geocoder
   * @property {boolean} [localGeocoderOnly] if true, only use local geocoder
   * @property {Object} [results] object to bind the results to
   * @property {boolean} [disabled] if true, disable the input
   * @property {string | null} [eyebrowLabel] eyebrow text label for the input
   */

  /** @type {Props} */
  let {
    types,
    placeholder,
    customData,
    input = "",
    id = "geocoder",
    onresult = () => {},
    onclear = () => {},
    width = 213,
    localGeocoderOnly = false,
    disabled = false,
    eyebrowLabel = null
  } = $props();

  // initialize geocoder; the constructor options intentionally capture the props'
  // initial values — the instance is built once and never reconfigured
  // svelte-ignore state_referenced_locally
  const geocoder = new MapboxGeocoder({
    accessToken: PUBLIC_MAPBOX_API_KEY,
    types: types, // location types - region = state, district = county, address = address to be looked up to tract
    placeholder: placeholder, // placeholder text
    localGeocoder: localGeocoder(customData), // local geocoder function w/ custom data
    localGeocoderOnly: localGeocoderOnly, // flag for turning off mapbox geocoder
    countries: "US", // filter to the US
    limit: 10,

    // render function for the results mostly copied from source, just removed ", United States"
    render: function (item) {
      var placeName = item.place_name.replace(", United States", "").split(",");
      return (
        '<div class="mapboxgl-ctrl-geocoder--suggestion"><div class="mapboxgl-ctrl-geocoder--suggestion-title">' +
        placeName[0] +
        '</div><div class="mapboxgl-ctrl-geocoder--suggestion-address">' +
        placeName.splice(1, placeName.length).join(",") +
        "</div></div>"
      );
    }
  });

  /** @type {HTMLDivElement} */ let geocoderRef;
  /** @type {(() => void) | undefined} */ let detachA11y;

  // polite live region text; the a11y decoration drives it off what the list actually drew
  let announcement = $state("");

  // when geocoder is added to DOM, wire up ids, disabled state and ARIA
  geocoder.on("addedToDOM", () => {
    const container = /** @type {*} */ (geocoder).container;
    /** @type {HTMLInputElement} */
    const el = container.querySelector(".mapboxgl-ctrl-geocoder--input");

    // the lib builds the input, so its id — which the visible `<label for>` in the control
    // panel points at for the accessible name — has to be assigned here
    el.id = id;

    el.disabled = disabled;
    // reflect the actual state — this used to be hardcoded true, announcing every
    // enabled geocoder as disabled to assistive tech
    el.ariaDisabled = disabled ? "true" : "false";

    el.autocomplete = "off";

    // combobox semantics + polite result announcements; the suggestion list is drawn into
    // a `<ul>` the typeahead inserts next to the input
    const list = container.querySelector("ul.suggestions");
    if (list) {
      detachA11y = attachGeocoderA11y(el, list, {
        id,
        onAnnounce: (message) => (announcement = message)
      });
    }

    // handle width
    const inputWrapper = /** @type {HTMLElement} */ (el.parentNode);
    el.style.minWidth = `${width}px`;
    el.style.width = `${width}px`;
    inputWrapper.style.minWidth = `${width}px`;
    inputWrapper.style.width = `${width}px`;
  });

  // set input on result
  geocoder.on("result", async (e) => {
    // handle when ", United States" is at the end (will not be the case when the address is looked up)
    e.result.place_name = e.result.place_name.replace(", United States", "");

    // set geocoder input until we can set it from the outside via the input prop
    geocoder.setInput(e.result.place_name);

    // if result is a mapbox address search result, convert it to a tract
    if (e.result.id && e.result.id.includes("address") && e.result.center) {
      // get tract ID from mapbox result
      const tractId = await getTractFromResult(e.result);

      // find tract info from customData based on ID
      const tractInfo = customData.features.find(({ properties }) => properties.geoid === tractId);

      if (tractInfo) {
        // set input to the tract name
        geocoder.setInput(tractInfo.properties.title);
      }

      // call onresult handler with tract data
      onresult(tractInfo);
    } else {
      // otherwise call onresult handler with result
      onresult(e.result);
    }
  });

  geocoder.on("clear", () => {
    // run onclear handler
    onclear();
  });

  $effect(() => {
    // equivalent to onMount
    // add the geocoder to the DOM (the addedToDOM handler above decorates it)
    geocoder.addTo(geocoderRef);

    // equivalent to onDestroy
    return () => {
      // stop observing the suggestion list, then remove the geocoder from the DOM
      detachA11y?.();
      geocoderRef.remove();
    };
  });

  // set geocoder input when input prop changes
  $effect(() => {
    geocoder.setInput(input);
  });
</script>

<div class="geocoder-container">
  {#if eyebrowLabel}
    <label for={id}>{eyebrowLabel}</label>
  {/if}
  <div bind:this={geocoderRef}></div>
  <!-- announces how many suggestions were drawn, or the lib's no-results / error message -->
  <div class="visually-hidden" role="status" aria-live="polite">{announcement}</div>
</div>

<style>
  /* media query has been modified in the $components/Geocoder/mapbox-gl-geocoder.css file */
  /* this file is copied from @mapbox/mapbox-gl-geocoder/lib/mapbox-gl-geocoder.css */
  /* no modifications happen in the locally-copied file, they happen below: */

  /* remove left padding from <Theme> */
  .geocoder-container :global(ul) {
    padding-left: 0 !important;
  }

  .geocoder-container {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
    z-index: 1000;
  }

  .geocoder-container label {
    color: var(--color-gray-shade-darker);
    font-size: var(--font-size-small);
    text-transform: uppercase;
  }
</style>
