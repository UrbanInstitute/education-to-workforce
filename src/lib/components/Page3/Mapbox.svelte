<script>
  import mapboxgl from "mapbox-gl";
  import "mapbox-gl/dist/mapbox-gl.css";
  import { PUBLIC_MAPBOX_API_KEY } from "$env/static/public";
  import { MAPBOX_BASEMAP, MAPBOX_TILESETS } from "$utils/consts";
  import { formatFun } from "$utils/formatFun";
  import { urbanColors } from "@urbaninstitute/dataviz-components/utils";
  import { untrack } from "svelte";
  import { expandedMobileMediaQuery, mobileMediaQuery } from "$utils/mediaQuery.svelte";

  /**
   * @property {string} geoLevel the level of geography to display (based on page slug)
   * @property {function} onclick function to run on map click
   * @property {Object[]} metricData the data for the map
   * @property {Object} metricMetadata the data for the map
   * @proeprty {import("$utils/geoNames).GeoNames")} geoNames
   * @property {function} scale the color scale for the choropleth
   * @property {string} geoid1 the geoid for the first geography
   * @property {string | undefined} [geoid2=undefined] the data for the second geography
   * @property {number[]} bbox the bounding box for the map
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
    bbox
  } = $props();

  /** @type {HTMLDivElement} */
  let mapEl;
  /** @type {import("mapbox-gl").Map} */
  let map;

  let mapLoaded = $state(false);
  let mapLayersLoaded = $state(false);

  //geoid of hovered feature
  /** @type {number | undefined} */
  let mapHoverFeature = $state(undefined);

  // derived versions of geoids, converted to numbers to match mapbox format
  let currentGeoid1 = $derived(+geoid1);
  let currentGeoid2 = $derived(geoid2 ? +geoid2 : undefined);

  // map source layer name
  let sourceLayer = $derived(
    geoLevel === "tracts" && mobileMediaQuery.current ? "tracts_simplified" : geoLevel
  );

  // has the map set the initial bbox yet?
  let initialBbox = $state(false);

  const fitBoundsPaddingObj = {
    padding: {
      // add more top padding on desktop since the metric info box is at the top
      top: !expandedMobileMediaQuery.current ? 100 : 50,
      bottom: 50,
      left: 50,
      right: 50
    }
  };

  const metricDataLookup = $derived(
    metricData.reduce((acc, curr) => {
      acc.set(+curr.id, curr);
      return acc;
    }, new Map())
  );

  /**
   * @param {Object[]} data
   * @returns {string[] | string}
   */
  function getMatchExpression(data) {
    if (typeof data === "undefined") {
      return urbanColors.blue;
    }
    let result = metricData.reduce(
      (acc, d) => {
        acc.push([+d.id]);
        acc.push(scale(d.value));
        return acc;
      },
      ["match", ["id"]]
    );
    result.push(urbanColors.gray);
    return result;
  }

  // create a fill layer based on the metric data
  // this is used on intial load and when the metric data changes
  /** @returns {import("mapbox-gl").Layer} */
  const getFillLayer = () => {
    let matchExpression = getMatchExpression(metricData);

    return {
      id: "fill-layer",
      type: "fill",
      source: "tile-source",
      "source-layer": sourceLayer,
      paint: {
        "fill-color": matchExpression,
        "fill-opacity": 0.7
      }
    };
  };

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

  /** @param {number} id */
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
  /** @param {import("mapbox-gl").MapMouseEvent} e */
  const updatePopup = (e) => {
    // get hovered feature and associated value
    let selectedGeoid = metricDataLookup.get(e.features[0].id);
    let geoName = geoNames.getName(e.features[0].id);
    popup.setLngLat(e.lngLat);
    // update popup with value
    popup.setHTML(
      `<p class="title">${geoName}</p><p class="value">${formatFun(selectedGeoid ? selectedGeoid.value : null, metricMetadata.metric_type)}</p>`
    );
  };

  const removePopup = () => {
    const popupElement = popup.getElement();
    if (popupElement && popupElement.style.opacity !== "0") popupElement.style.opacity = "0";
  };

  $effect(() => {
    if (!map) {
      // define the layer to serve as the insertion point for the new layers
      const insertionLayerId = "water";

      // if geolevel is tracts, and screen is mobile size, use simplified map boundaries, otherwise use normal boundaries
      const tileSet = MAPBOX_TILESETS[sourceLayer];

      mapboxgl.accessToken = PUBLIC_MAPBOX_API_KEY;
      map = new mapboxgl.Map({
        container: mapEl, // container ID
        // @ts-ignore
        style: MAPBOX_BASEMAP,
        center: bbox ? undefined : [-98, 40], // starting position [lng, lat]
        bounds: bbox ? bbox : undefined, // start at bbox if defined
        zoom: geoLevel === "tracts" ? 8 : 3, // starting zoom
        minZoom: geoLevel === "tracts" ? 8 : 3,
        antialias: true,
        dragPan: true,
        dragRotate: false,
        cooperativeGestures: true //maybe only for tablet
      }).addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");
      //.addControl(customControl, "bottom-right");

      map.on("load", () => {
        popup.addTo(map);

        // @ts-ignore
        map
          .addSource("tile-source", {
            type: "vector",
            // @ts-ignore
            url: tileSet
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

        mapLoaded = true;
      });

      // mouse hover interactions
      // add the hover stroke to the fill layer
      map.on("mouseenter", "hover-fill-layer", (e) => {
        showPopup();
        // if (e.features && e.features[0] && typeof e.features[0].id === "number") {
        //   outlineGeo(e.features[0].id);
        // }
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
        let selectedGeoid = metricDataLookup.get(e?.features[0]?.id);

        if (selectedGeoid && selectedGeoid.value) {
          // @ts-ignore
          // case when for tract, county, state for adding a 0 to the geoid
          onclick(selectedGeoid.id);
        }
      });
    }
  });

  // react to changing bbox
  $effect(() => {
    if (bbox && mapLoaded && !initialBbox) {
      map.fitBounds(bbox, fitBoundsPaddingObj);
      // set the initial bbox to true
      initialBbox = true;
    }
  });

  // outline the active geoid
  $effect(() => {
    if ((currentGeoid1 || currentGeoid2) && mapLoaded) {
      disableOutlineGeo();
    }
    if (currentGeoid1 && mapLoaded) outlineGeo(currentGeoid1);
    if (currentGeoid2 && mapLoaded) outlineGeo(currentGeoid2);
    if (mapHoverFeature && mapLoaded) hoverGeo(mapHoverFeature);
  });

  $effect(() => {
    if (metricData && map.loaded()) {
      const matchExpression = getMatchExpression(metricData);
      map.setPaintProperty("fill-layer", "fill-color", matchExpression);
    }
  });
</script>

<div id="map" bind:this={mapEl}></div>

<style>
  #map {
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
