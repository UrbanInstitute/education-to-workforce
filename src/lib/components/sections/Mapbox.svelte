<!-- A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review. -->

<script>
  import mapboxgl from "mapbox-gl";
  import "mapbox-gl/dist/mapbox-gl.css";
  import { PUBLIC_MAPBOX_API_KEY } from "$env/static/public";
  import {
    DEFAULT_US_BBOX,
    MAPBOX_BASEMAP,
    MAPBOX_TILESETS,
    MAPBOX_SOURCE_LAYERS
  } from "$utils/consts";
  import { formatFun } from "$utils/formatFun";
  import { urbanColors } from "@urbaninstitute/dataviz-components/utils";
  import { onDestroy, onMount } from "svelte";
  import {
    expandedMobileMediaQuery,
    mobileMediaQuery,
    phoneMediaQuery
  } from "$utils/mediaQuery.svelte";

  /**
   * One map instance lives for the whole page: a level change swaps the boundary
   * source/layers in place (the sourceLayer swap $effect) and keeps the camera where the
   * user left it — only geography-driven bbox changes re-fit. Early v2 remounted per
   * level via `{#key tool.level}` (mirroring v1's per-level routes), which reset the
   * view to national on every swap.
   *
   * @property {string} geoLevel the level of geography to display (internal id)
   * @property {function} onclick function to run on map click
   * @property {Object[] | undefined} metricData the map shard's data array (undefined while loading / no metric)
   * @property {Object | undefined} metricMetadata metadata for the displayed metric
   * @proeprty {import("$utils/geoNames).GeoNames") | undefined} geoNames undefined while a level swap refetches names
   * @property {function | undefined} scale the color scale for the choropleth
   * @property {string} geoid1 the geoid for the first geography
   * @property {string | null | undefined} [geoid2=undefined] the geoid for the comparison geography
   * @property {number[] | undefined} bbox the bounding box for the map (undefined = leave the camera alone)
   * @property {boolean} [nationalView=false] no geography selected — fit with extra room for the legend card
   * @property {(pending: boolean) => void} [onRenderStateChange] reports whether the map has
   *   pending visual work (layer swap / choropleth repaint not yet rendered to screen)
   */
  let {
    geoLevel,
    onclick,
    metricData,
    metricMetadata,
    geoNames,
    scale,
    geoid1,
    geoid2 = undefined,
    bbox,
    nationalView = false,
    onRenderStateChange = () => {}
  } = $props();

  /** @type {HTMLDivElement} */
  let mapEl;
  /** @type {import("mapbox-gl").Map} */
  let map;

  let mapLoaded = $state(false);

  //geoid of hovered feature
  /** @type {number | undefined} */
  let mapHoverFeature = $state(undefined);

  // derived versions of geoids, converted to numbers to match mapbox format
  let currentGeoid1 = $derived(+geoid1);
  let currentGeoid2 = $derived(geoid2 ? +geoid2 : undefined);

  // internal geo level
  let internalGeoLevel = $derived(geoLevel);
  // map source layer name
  let sourceLayer = $derived(
    internalGeoLevel === "tracts" && mobileMediaQuery.current
      ? "tracts_simplified"
      : MAPBOX_SOURCE_LAYERS[internalGeoLevel]
  );

  // last bounds the camera was fitted to, as a join key. v1 fitted exactly once per mount
  // (per-level routes remounted constantly); on the v2 single page the geography changes
  // many times within one mount, so re-fit whenever the bbox actually changes. Plain
  // variable on purpose — writing it must not re-trigger the effect that reads bbox.
  /** @type {string | undefined} */
  let lastFittedBbox;

  // source-layer the map's source/layers are currently built for. Plain variable: the
  // swap effect must only respond to sourceLayer changes, not to the reactive values
  // (metricData, scale) the rebuild reads.
  /** @type {string | undefined} */
  let builtSourceLayer;

  // pending-visual-work handshake: armed when a swap or colored repaint is issued, settled
  // by the map's `idle` event (no camera/tile/paint work remaining). Plain variables — the
  // parent renders from the callback, nothing here does.
  let renderPending = false;
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let renderFallbackTimer;

  const settleRender = () => {
    clearTimeout(renderFallbackTimer);
    if (renderPending) {
      renderPending = false;
      onRenderStateChange(false);
    }
  };
  const armRenderWait = () => {
    clearTimeout(renderFallbackTimer);
    // escape hatch: if `idle` never fires (tile error, offline), don't strand the loading UI
    renderFallbackTimer = setTimeout(settleRender, 8000);
    if (!renderPending) {
      renderPending = true;
      onRenderStateChange(true);
    }
  };

  // level the camera was last (not) fitted for — lets the fit effect tell a level-swap
  // bbox change apart from a geography-driven one. Plain variable, same reasoning as
  // lastFittedBbox; the initial value is deliberately a snapshot (mount is not a swap).
  // svelte-ignore state_referenced_locally
  let lastFitLevel = geoLevel;

  // The legend card floats over the map's top-left corner (MapModule's .legend-overlay).
  // Every fit leaves top room for it; the default national view leaves enough to drop the
  // continental US's northwest corner clear of the card altogether, so it is readable
  // before the user interacts (2026-09-02 design review). Top is the lever that does the
  // work: at the tool's column width the national fit is height-constrained, so left
  // padding below ~85px moves nothing. A selected geography keeps the tighter padding —
  // its extent overlapping the card is expected, and re-fitting around the card there
  // would spend viewport the user asked to zoom into.
  // On a phone the card spans the map's width (MapLegendCard's 33.75rem block) inside a
  // 300px frame, so it can't be cleared sideways and the edge inset has to give way
  // instead: at 50px the national fit went height-constrained and shrank the country to
  // 188px wide, against 245px at 16px. 150px of top clears the whole card (16px overlay
  // inset + ~122px of card) — letting it overlap instead buys a 33% bigger country and
  // hides everything north of Colorado, which is the wrong trade for a choropleth.
  const fitBoundsPaddingObj = $derived.by(() => {
    const compact = expandedMobileMediaQuery.current;
    const phone = phoneMediaQuery.current;
    const edge = phone ? 16 : 50;
    const top = nationalView ? (phone ? 150 : compact ? 120 : 180) : compact ? 50 : 100;
    return { padding: { top, bottom: edge, left: edge, right: edge } };
  });

  // Zoom floors. Tracts keep a hard one: the tract tileset is only legible zoomed in, and
  // the tracts national view never fits bounds at all (combinedBbox is undefined there, so
  // these defaults are the whole camera story for it).
  const TRACT_MIN_ZOOM = 8;
  const NATIONAL_MIN_ZOOM = 3;

  /**
   * The floor for a non-tract level: never above the zoom the national fit actually needs.
   * `minZoom: 3` was a constant picked for the desktop map, but the national fit needs less
   * than 3 at every viewport under ~1180px wide — 1.6 in a 390px phone column, 2.7 at
   * 1025px, 2.9 at 1100px — so fitBounds was clamped and the national view opened on a
   * fragment of the middle of the country (22.7° of the country's 58.1° at 390px). Note
   * this was never a phone-only bug: it clipped Maine and the northwest corner in the
   * two-column desktop layout too, undoing the 2026-09-02 fit-padding review fix there.
   * Deriving the floor from the fit is correct at every width without adding a breakpoint,
   * and keeps what the constant was really for: you can never zoom out past the nation.
   * cameraForBounds is not itself clamped by minZoom, so this is safe to call while the
   * old floor is still in effect. The tilesets impose nothing here — states, counties and
   * school districts all publish minzoom 0.
   * @param {*} padding a fitBounds padding option object
   * @returns {number}
   */
  const nationalFloor = (padding) => {
    // cameraForBounds returns undefined for a degenerate box, and types its zoom as
    // optional besides — either way, fall back to the constant rather than to no floor
    const zoom = map.cameraForBounds(/** @type {*} */ (DEFAULT_US_BBOX), padding)?.zoom;
    return zoom === undefined ? NATIONAL_MIN_ZOOM : Math.min(NATIONAL_MIN_ZOOM, zoom);
  };

  /** the floor for the current level and container size */
  const currentMinZoom = () =>
    geoLevel === "tracts" ? TRACT_MIN_ZOOM : nationalFloor(fitBoundsPaddingObj);

  const metricDataLookup = $derived(
    (metricData ?? []).reduce((/** @type {Map<number, *>} */ acc, /** @type {*} */ curr) => {
      acc.set(+curr.id, curr);
      return acc;
    }, new Map())
  );

  /**
   * Choropleth fill: a match expression over the shard's values, or a flat no-data gray
   * while the shard is loading / no metric is displayable (scale and metricData both come
   * from the shard, so they appear together).
   * @param {Array<{ id: string | number, value: number }> | undefined} data
   * @returns {*} a mapbox paint expression or color string
   */
  function getMatchExpression(data) {
    if (!data?.length || !scale) {
      return urbanColors.gray;
    }
    /** @type {*[]} */
    const result = ["match", ["id"]];
    for (const d of data) {
      result.push([+d.id], scale(d.value));
    }
    result.push(urbanColors.gray);
    return result;
  }

  // setup the outline function based on feature id (NOT GEOID)
  /** @param {number} id */
  const outlineGeo = (id) => {
    map?.setFeatureState(
      {
        source: "tile-source",
        sourceLayer: sourceLayer,
        id: id
      },
      { featureOutline: true }
    );
  };

  /** @param {number} id */
  const hoverGeo = (id) => {
    map?.setFeatureState(
      {
        source: "tile-source",
        sourceLayer: sourceLayer,
        id: id
      },
      { featureHover: true }
    );
  };

  const disableOutlineGeo = () => {
    map?.removeFeatureState({
      source: "tile-source",
      sourceLayer: sourceLayer
    });
  };

  // POPUP
  let popup = new mapboxgl.Popup({
    className: "mapbox-pointer",
    closeButton: false,
    closeOnClick: false
  });

  const showPopup = () => {
    const popupElement = popup.getElement();
    if (popupElement && popupElement.style.opacity !== "1") popupElement.style.opacity = "1";
  };

  // the inputs the popup's current markup was built from. mousemove fires many times per
  // feature, but the content is a pure function of these three — only the position changes
  // as the cursor travels within one geography, so setHTML (which rebuilds the popup's DOM
  // and reflows it) can be skipped until one of them actually differs. Identities, not a
  // string key, so a shard arriving under an unchanged metric id still refreshes the value.
  // Plain variables: nothing reactive reads them.
  /** @type {string | number | undefined} */
  let popupFeatureId;
  /** @type {Object[] | undefined} */
  let popupMetricData;
  /** @type {Object | undefined} */
  let popupMetricMetadata;

  /** @param {import("mapbox-gl").MapMouseEvent} e */
  const updatePopup = (e) => {
    // geoNames refetches per level and is undefined mid-swap — nothing to show yet
    if (!geoNames || !e.features?.length) return;
    const featureId = e.features[0].id;
    popup.setLngLat(e.lngLat);
    if (
      featureId === popupFeatureId &&
      metricData === popupMetricData &&
      metricMetadata === popupMetricMetadata
    ) {
      return;
    }
    popupFeatureId = featureId;
    popupMetricData = metricData;
    popupMetricMetadata = metricMetadata;
    // get hovered feature and associated value
    const selectedGeoid = metricDataLookup.get(featureId);
    const geoName = geoNames.getName(featureId);
    // update popup: always the name; a value line only while a metric is displayed
    const valueLine = metricMetadata
      ? `<p class="value">${formatFun(selectedGeoid ? selectedGeoid.value : null, metricMetadata.metric_type)}</p>`
      : "";
    popup.setHTML(`<p class="title">${geoName}</p>${valueLine}`);
  };

  const removePopup = () => {
    const popupElement = popup.getElement();
    if (popupElement && popupElement.style.opacity !== "0") popupElement.style.opacity = "0";
  };

  /**
   * (Re)build the boundary source + the four layers for the current sourceLayer. Runs on
   * style load and again on every in-place level swap, reading sourceLayer/metricData at
   * call time. The insertion anchors ("water", "settlement-minor-label") belong to the
   * basemap style, which is never reloaded.
   */
  const addSourceAndLayers = () => {
    // define the layer to serve as the insertion point for the new layers
    const insertionLayerId = "water";

    // @ts-ignore
    map
      .addSource("tile-source", {
        type: "vector",
        // if geolevel is tracts, and screen is mobile size, sourceLayer points at the
        // simplified boundaries tileset
        url: MAPBOX_TILESETS[sourceLayer]
      })
      .addLayer(
        {
          id: "fill-layer",
          type: "fill",
          source: "tile-source",
          "source-layer": sourceLayer,
          paint: {
            "fill-color": getMatchExpression(metricData),
            "fill-opacity": ["interpolate", ["linear"], ["zoom"], 3, 0.95, 7, 0.75]
          }
        },
        insertionLayerId
      )
      .addLayer(
        {
          id: "stroke-layer",
          type: "line",
          source: "tile-source",
          "source-layer": sourceLayer,
          paint: {
            // https://github.com/mapbox/mapbox-gl-js/issues/5861#issuecomment-352033339
            "line-width": ["step", ["zoom"], 0, 6, 0.25, 8, 0.5, 12, 0.75, 16, 1],
            "line-color": urbanColors.white
          }
        },
        insertionLayerId
      )

      // add hover fill layer (for mouse interactions)
      .addLayer(
        {
          id: "hover-fill-layer",
          type: "fill",
          source: "tile-source",
          "source-layer": sourceLayer,
          paint: {
            "fill-color": "transparent",
            "fill-opacity": 0
          }
        },
        insertionLayerId
      )

      // add hover stroke layer (thick magenta stroke)
      .addLayer(
        {
          id: "hover-stroke-layer",
          type: "line",
          source: "tile-source",
          "source-layer": sourceLayer,
          paint: {
            "line-width": 3,
            "line-color": urbanColors.magenta_shade_darker,
            "line-opacity": [
              "case",
              ["boolean", ["feature-state", "featureOutline"], false],
              1,
              ["boolean", ["feature-state", "featureHover"], false],
              1,
              0
            ]
          }
        },
        "settlement-minor-label"
      );
  };

  // construction is a one-time side effect, not a reaction: bbox and geoLevel are read for
  // the camera's starting position only, and everything after mount goes through the swap /
  // fit / paint effects below. As an `$effect` guarded by `if (!map)` this re-ran to a no-op
  // on every bbox and level change. onMount already untracks its callback, so the reads here
  // register no dependencies.
  onMount(() => {
    mapboxgl.accessToken = PUBLIC_MAPBOX_API_KEY;
    map = new mapboxgl.Map({
      container: mapEl, // container ID
      // @ts-ignore
      style: MAPBOX_BASEMAP,
      center: bbox ? undefined : [-98, 40], // starting position [lng, lat]
      bounds: bbox ? bbox : undefined, // start at bbox if defined
      // without this the opening camera was fitted with no padding at all and the fit
      // effect below re-fitted it (a visible jump) once the style had loaded
      fitBoundsOptions: fitBoundsPaddingObj,
      zoom: geoLevel === "tracts" ? TRACT_MIN_ZOOM : NATIONAL_MIN_ZOOM, // starting zoom
      // the real floor needs the instance (nationalFloor calls map.cameraForBounds), so
      // construction opens at the permissive end and the floor is applied on the next
      // statement. Constructing at 3 instead would clamp the constructor's own fitBounds
      // (the `bounds` option above) before there was any chance to lower it.
      minZoom: geoLevel === "tracts" ? TRACT_MIN_ZOOM : 0,
      antialias: true,
      dragPan: true,
      dragRotate: false,
      cooperativeGestures: true //maybe only for tablet
    }).addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");
    //.addControl(customControl, "bottom-right");

    map.setMinZoom(currentMinZoom());

    // the constructor just fitted these bounds; without recording it the fit effect would
    // re-fit the same box the moment mapLoaded flips
    lastFittedBbox = bbox?.join(",");

    if (import.meta.env.DEV) {
      // expose the instance for headless QA scripts (dev server only)
      /** @type {*} */ (window).__e2wMap = map;
    }

    map.on("load", () => {
      popup.addTo(map);
      // built for whatever the level is by the time the style loads (a swap during
      // style load supersedes the construction-time level)
      addSourceAndLayers();
      builtSourceLayer = sourceLayer;
      mapLoaded = true;
    });

    // settles the pending-visual-work handshake; a no-op when nothing is armed, so
    // routine post-pan idles cost nothing
    map.on("idle", settleRender);

    // the container's size is an input to the floor, and mapbox's own trackResize resizes
    // the canvas on a window resize without having any opinion about minZoom — so an
    // orientation change or a dragged desktop window has to re-derive it here. Nothing
    // reactive fires for a container that changed size on its own, which is why this is a
    // map listener rather than part of the effect below.
    map.on("resize", () => map.setMinZoom(currentMinZoom()));
    // arm through the initial style load + first render: without this the loading UI
    // drops during the blank window between mount and the style's first paint
    armRenderWait();

    // mouse hover interactions
    map.on("mouseenter", "hover-fill-layer", () => {
      showPopup();
    });
    map.on("mousemove", "hover-fill-layer", (e) => {
      updatePopup(e);
      if (e.features && e.features[0] && typeof e.features[0].id === "number") {
        mapHoverFeature = e.features[0].id;
      }
    });
    map.on("mouseleave", "hover-fill-layer", (e) => {
      removePopup();
      mapHoverFeature = undefined;
    });

    // insert the onclick function on the fill layer
    map.on("click", "hover-fill-layer", (e) => {
      let selectedGeoid = metricDataLookup.get(e.features?.[0]?.id);

      if (selectedGeoid && selectedGeoid.value) {
        // @ts-ignore
        // case when for tract, county, state for adding a 0 to the geoid
        onclick(selectedGeoid.id);
      }
    });
  });

  // the floor, in one place. Reacts to the level and to the fit padding, since the padding
  // is what the national fit — and so the floor derived from it — is measured against.
  // Declared before the swap and fit effects so both see the new floor: effects run in
  // declaration order, and a fit issued under a stale floor is exactly the clamp this
  // whole change is about. The reads happen before the mapLoaded guard so the effect stays
  // subscribed on the early runs where the map isn't built yet.
  // setMinZoom auto-zooms the map up to a violated minimum (a jumpTo, not an animation),
  // which is what lands a zoomed-out camera at zoom 8 when the user enters tracts.
  $effect(() => {
    const padding = fitBoundsPaddingObj;
    const level = geoLevel;
    if (!mapLoaded) return;
    map.setMinZoom(level === "tracts" ? TRACT_MIN_ZOOM : nationalFloor(padding));
  });

  // in-place level swap: when the source-layer changes (level change, or the mobile
  // simplified-tracts variant), tear down the boundary source/layers and rebuild them for
  // the new tileset. The camera stays put (the fit effect below suppresses the
  // level-driven bbox change); the floor moves with the level in the effect above.
  // Removing the source discards the old layer's feature-states, so the hover state and
  // popup are reset alongside.
  $effect(() => {
    if (!mapLoaded || sourceLayer === builtSourceLayer) return;
    mapHoverFeature = undefined;
    removePopup();
    for (const layerId of [
      "fill-layer",
      "stroke-layer",
      "hover-fill-layer",
      "hover-stroke-layer"
    ]) {
      map.removeLayer(layerId);
    }
    map.removeSource("tile-source");
    addSourceAndLayers();
    builtSourceLayer = sourceLayer;
    armRenderWait();
  });

  // fit the camera whenever the bounds actually change (geocoder selection, comparison
  // add/remove, deep link). An undefined bbox (shard loading, or tracts national view)
  // leaves the camera alone. A bbox change arriving with a level change is marked
  // already-fitted instead of fitted: the swap dropped the geoids and collapsed the bbox
  // to the national default, and re-orienting is exactly what in-place swapping avoids.
  $effect(() => {
    const key = bbox?.join(",");
    if (geoLevel !== lastFitLevel) {
      lastFitLevel = geoLevel;
      lastFittedBbox = key;
      return;
    }
    if (bbox && mapLoaded && key !== lastFittedBbox) {
      map.fitBounds(/** @type {*} */ (bbox), fitBoundsPaddingObj);
      lastFittedBbox = key;
    }
  });

  // outline the active geoids + hovered feature. Always clear first: gating the clear on a
  // selection let hover feature-states accumulate in the national view (every state the
  // cursor crossed kept its outline).
  $effect(() => {
    if (!mapLoaded) return;
    disableOutlineGeo();
    if (currentGeoid1) outlineGeo(currentGeoid1);
    if (currentGeoid2) outlineGeo(currentGeoid2);
    if (mapHoverFeature) hoverGeo(mapHoverFeature);
  });

  // repaint the choropleth when the shard changes. Guarded on mapLoaded state, not
  // map.loaded(): `map` is undefined on the first run and mid-style-load repaints were
  // silently skipped (v1 leaned on remounts to recover).
  $effect(() => {
    if (mapLoaded) {
      const matchExpression = getMatchExpression(metricData);
      map.setPaintProperty("fill-layer", "fill-color", matchExpression);
      // only colored expressions arm the wait: setPaintProperty short-circuits on
      // deep-equal values (gray → gray issues no render pass, so no `idle` would follow),
      // and the gray phases are already covered by mapLoading / !geoNames upstream
      if (Array.isArray(matchExpression)) armRenderWait();
    }
  });

  // one long-lived instance per page now, but still clean up the GL context on unmount
  onDestroy(() => {
    clearTimeout(renderFallbackTimer);
    popup.remove();
    map?.remove();
  });
</script>

<!-- class, not id="map": the page's #map section anchor owns that id -->
<div class="map-container" bind:this={mapEl}></div>

<style>
  .map-container {
    width: 100%;
    height: 100%;
  }

  :global(.mapboxgl-ctrl-attrib-inner) {
    display: none;
  }

  :global(.mapbox-pointer) {
    font-family: var(--font-family-sans);
    color: var(--color-gray-shade-darkest);
    /* text-align: center; */
    animation: fadeIn 0.25s;
  }
  :global(.mapboxgl-popup-content p) {
    font-size: var(--font-size-small) !important;
    margin: 0;
  }
  :global(.mapboxgl-popup-content p.title) {
    font-weight: var(--font-weight-bold);
    font-weight: var(--font-weight-bold) !important;
  }
  :global(.mapboxgl-popup-content p.value) {
    font-weight: var(--font-weight-normal);
  }
</style>
