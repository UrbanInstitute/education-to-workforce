// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

import { fromStore } from "svelte/store";
import { scaleThreshold } from "d3-scale";
import { bboxPolygon } from "@turf/bbox-polygon";
import { featureCollection } from "@turf/helpers";
import { bbox } from "@turf/bbox";
import cacheMap, { UnknownGeographyError } from "$utils/cacheMap";
import GeoNames from "$utils/geoNames";
import { COLOR_RANGE, DEFAULT_US_BBOX, geoidMatchesLevel, slugToInternal } from "$utils/consts";
import getSelectedIndicators from "$utils/getSelectedIndicators";
import { getCardGeographies } from "$utils/getChartData";

/**
 * Build the choropleth threshold scale from a map shard's breaks (port of the map page's
 * inline scale logic).
 * @param {number[] | undefined} breaks
 * @param {string[]} [colorRange]
 * @returns {import("d3-scale").ScaleThreshold<number, string> | undefined}
 */
export const makeChoroplethScale = (breaks, colorRange = COLOR_RANGE) => {
  if (!breaks) return undefined;
  const scaleColors =
    breaks.length < colorRange.length ? colorRange.slice(0, breaks.length + 1) : colorRange;
  const scale = /** @type {*} */ (scaleThreshold());
  return scale.domain(breaks).range(scaleColors);
};

/**
 * Bbox covering two geography bboxes (port of the map page's combine — bbox of the two
 * bbox polygons, not a geometric union).
 * @param {number[]} bbox1
 * @param {number[]} bbox2
 * @returns {number[]}
 */
export const computeCombinedBbox = (bbox1, bbox2) => {
  return bbox(
    featureCollection([
      bboxPolygon(/** @type {*} */ (bbox1)),
      bboxPolygon(/** @type {*} */ (bbox2))
    ])
  );
};

/**
 * Can this metric be the map layer? Disaggregate-only metrics (m190) have no base column,
 * and preprocess-map-data.R drops every `_d` column, so no map shard exists for them —
 * selecting one would 404 the shard fetch and raise the error banner (dev-plan §11.4, the
 * A12 failure mode). They still render as cards; they just can't drive the choropleth.
 *
 * This is the gate for every path into `effectiveMetric`, which is what the map fetch,
 * the two metric dropdowns, and the selected-card highlight all read.
 *
 * @param {*} metric - metrics.json entry
 * @returns {boolean}
 */
const isMappable = (metric) => metric?.disagg_only !== true;

/**
 * First mappable metric with data for the current selection (port of the map page's
 * initialMetric).
 * @param {Array<*> | undefined} selectedIndicators
 * @returns {number | null}
 */
export const getInitialMetric = (selectedIndicators) => {
  for (const ind of selectedIndicators ?? []) {
    const metric = (ind.hasMetricData ?? []).find(isMappable);
    if (metric) return metric.metric_id;
  }
  return null;
};

/**
 * A metric param value is valid when it belongs to some selected indicator's hasMetricData —
 * that list already encodes the geo_{level} flag, EQ membership, and data presence — and it
 * can actually be mapped.
 * @param {number | string | null | undefined} metricId
 * @param {Array<*> | undefined} selectedIndicators
 * @returns {boolean}
 */
export const isValidMetricSelection = (metricId, selectedIndicators) => {
  if (metricId === null || metricId === undefined) return false;
  return Boolean(
    selectedIndicators?.some((ind) =>
      ind.hasMetricData?.some(
        (/** @type {*} */ metric) => metric.metric_id === +metricId && isMappable(metric)
      )
    )
  );
};

/**
 * Is this metric offered at all for the current EQ and level? Everything
 * isValidMetricSelection checks except data presence for the selected geography — so unlike
 * that function it consults metadata only, and can gate the map fetch before geoid1Data lands.
 * @param {number | string | null | undefined} metricId
 * @param {Array<*> | undefined} selectedIndicators
 * @param {string} level - internal level id ("school_districts")
 * @returns {boolean}
 */
export const isMetricAvailableAtLevel = (metricId, selectedIndicators, level) => {
  if (metricId === null || metricId === undefined) return false;
  return Boolean(
    selectedIndicators?.some((ind) =>
      ind.metricMetadataList?.some(
        (/** @type {*} */ metric) =>
          metric.metric_id === +metricId &&
          metric.in_tool === true &&
          metric["geo_" + level] === true &&
          isMappable(metric)
      )
    )
  );
};

/**
 * How many *distinct* metrics a set of indicators holds. A metric can be listed under more
 * than one indicator — m231 sits under both 49 and 92 — so summing per-indicator list lengths
 * counts it once per listing. The section subtitles describe metrics, not listings.
 * @param {Array<*>} indicators
 * @param {"hasMetricData" | "noMetricData"} key
 * @returns {number}
 */
const countDistinctMetrics = (indicators, key) =>
  new Set(indicators.flatMap((ind) => (ind[key] ?? []).map((/** @type {*} */ m) => m.metric_id)))
    .size;

/**
 * Dropdown options for the selected EQ's mappable metrics with data — shared by the control
 * panel and the map legend card so the two metric dropdowns can never disagree. Both
 * dropdowns select the map layer, so disaggregate-only metrics are excluded (they have no
 * shard); their cards still render in the grid below.
 *
 * Deduped by metric_id: a multi-indicator metric would otherwise emit two identical options,
 * which an invalid `?eqid=` deep link (selectedIndicators falls back to all of them) makes
 * reachable.
 * @param {Array<*> | undefined} selectedIndicators
 * @returns {{ value: number, label: string }[]}
 */
export const metricDropdownOptions = (selectedIndicators) => {
  /** @type {Set<number>} */
  const seen = new Set();
  return (selectedIndicators ?? []).flatMap((ind) =>
    (ind.hasMetricData ?? [])
      .filter(isMappable)
      .filter((/** @type {*} */ metric) => {
        if (seen.has(metric.metric_id)) return false;
        seen.add(metric.metric_id);
        return true;
      })
      .map((/** @type {*} */ metric) => ({
        value: metric.metric_id,
        label: metric.metric_full_name
      }))
  );
};

/**
 * Shared tool state for the v2 single page (dev-plan §3.3, requirements §1.2).
 * Consolidates the URL-derived state, cacheMap fetch effects, and derived selections
 * previously duplicated across indicators/[slug] and map/[slug].
 *
 * Instantiate once during component init in +page.svelte (the $effects need an effect
 * root) and provide via setContext("tool"):
 *
 *   const params = constructQueryParams();
 *   const tool = new ToolState(params, data);
 *   setContext("tool", tool);
 *
 * @typedef {Object} ToolPageData - the merged +page.js load data the class consumes
 * @property {*} archie
 * @property {*} metadata
 * @property {*} national
 * @property {*} [nationalContext] - bundled national context record (dev-plan §11.3)
 *
 * @typedef {Object} ToolParams - the v2 query-param schema (constructQueryParams)
 * @property {string} level
 * @property {string} geoid1
 * @property {string | null | false} geoid2
 * @property {number} eqid
 * @property {number | null} metric
 * @property {string} timeframe
 * @property {string} disagg
 */
export class ToolState {
  #paramsStore;
  /** @type {{ current: ToolParams }} */
  #params;
  /** @type {ToolPageData} */
  #data;
  #cache;
  /** @type {Promise<*> | undefined} in-flight or settled states.json fetch (once per session) */
  #statesRequest;
  /**
   * "{level}:{geoid}" for every geoid the data layer has reported as nonexistent. Read by the
   * geoid1/geoid2 derivations, so a fetch that comes back "no such geography" drops the
   * selection synchronously — same fallback as a wrong-length geoid, and the scrub effect
   * takes the param out of the URL from there. Level-keyed so an id dropped at one level
   * can't suppress another level's fetch: today the fips widths are distinct enough that the
   * width gate gets there first, but nothing about the record should depend on that.
   * @type {Set<string>}
   */
  #unknownGeoids = $state.raw(new Set());

  /* ---------------- fetched state ---------------- */

  // the fetched payloads are $state.raw, not $state: every one is an immutable fetch result
  // replaced wholesale (cacheMap's in-place geography decoration runs before the value is
  // assigned here), and they are large — a geography shard holds hundreds of metric×year
  // records, a map shard one entry per geography at the level. Deep proxying them charges a
  // proxy hop for every property read in Mapbox's metricDataLookup reduce and in the chart
  // shapers, which walk the whole record on every change.

  /** primary geography shard record */
  geoid1Data = $state.raw();
  /** comparison geography shard record */
  geoid2Data = $state.raw();
  /**
   * All 51 state records, supplying every sub-state card's parent-state reference bar and
   * tick. 1.3 MB raw / 229 KB gzip, so it is fetched on the first geography selection
   * rather than bundled (dev-plan §12.5 #1) — the national view never pays for it.
   */
  states = $state.raw();
  /** primary geography shard fetch in flight */
  geoid1Loading = $state(false);
  statesLoading = $state(false);
  /**
   * Card-grid gate: a card isn't complete until both the primary geography shard and
   * `states` have landed, so the grids dim through the whole window rather than briefly
   * drawing bars with no parent-state reference. `combinedBbox` reads `geoid1Loading`
   * directly — map bounds don't depend on states.json.
   */
  loading = $derived(this.geoid1Loading || this.statesLoading);
  loading2 = $state(false);
  geoid1ContextData = $state.raw();
  geoid2ContextData = $state.raw();
  contextLoading = $state(false);
  context2Loading = $state(false);
  /** map shard ({ breaks, data, … }) for the effective metric */
  mapMetricData = $state.raw();
  mapLoading = $state(false);
  /** @type {{ scope: string, message: string } | null} inline error state (replaces cacheMap alert()s) */
  error = $state(null);
  /**
   * GeoNames lookup for the current level (map hover tooltips). Assigned only once the
   * level's metadata has loaded, so a non-undefined handle is always ready to `getName()`.
   * @type {GeoNames | undefined}
   */
  geoNames = $state();
  /** @type {Map<string, GeoNames>} level → loaded instance (cacheMap dedupes the underlying fetch) */
  #geoNamesCache = new Map();
  /** the map reported pending visual work (layer swap / choropleth repaint not yet rendered) */
  mapRenderPending = $state(false);

  /* ---------------- URL-derived ---------------- */

  // note: $derived.by, not $derived, only to satisfy svelte-check — both compile to the same
  // lazy thunk, but TS reads a plain `$derived(this.#params…)` field initializer as an eager
  // expression and reports #params as used before the constructor assigns it

  /** dash-slug level as it appears in the URL ("school-districts") */
  levelSlug = $derived.by(() => this.#params.current.level);
  /** internal level id ("school_districts") — use for cacheMap categories and geo_{level} flags */
  level = $derived.by(() => slugToInternal(this.#params.current.level));

  // geoids are level-specific. Rather than reset the params on a level change — the params
  // store defers every write behind a setTimeout, so the fetch effects would fire first and
  // request the old geoid's shard under the new level — derive the geoid away synchronously.
  // Same shape as effectiveMetric: an invalid param falls back rather than being written.
  // This also makes a mismatched deep link (?level=tracts&geoid1=06) resolve to the
  // national view instead of fetching a large wrong file.

  /** primary geoid, or "" (national view) when the param isn't a geography at this level */
  geoid1 = $derived.by(() => {
    const geoid = this.#params.current.geoid1;
    return this.#isSelectableGeoid(geoid) ? geoid : "";
  });
  /** comparison geoid, or null when absent or not a geography at this level */
  geoid2 = $derived.by(() => {
    const geoid = this.#params.current.geoid2;
    return this.#isSelectableGeoid(geoid) ? geoid : null;
  });
  /**
   * Is this param a geography a user could have selected at the current level? Two gates,
   * both non-writing: the level's fips width, and anything a fetch has already reported as
   * nonexistent.
   * @param {*} geoid
   * @returns {boolean}
   */
  #isSelectableGeoid(geoid) {
    if (!geoidMatchesLevel(geoid, this.level)) return false;
    return !this.#unknownGeoids.has(`${this.level}:${geoid}`);
  }

  eqid = $derived.by(() => this.#params.current.eqid);
  timeframe = $derived.by(() => this.#params.current.timeframe);
  disagg = $derived.by(() => this.#params.current.disagg);

  /* ---------------- derived selections ---------------- */

  selectedEq = $derived.by(() =>
    this.#data.archie?.eqData?.data.find((/** @type {{ id: * }} */ d) => d.id == this.eqid)
  );

  /** role-tagged geography list for the card grids ([national] when no geography is selected) */
  cardGeographies = $derived.by(() =>
    getCardGeographies(
      this.geoid1Data,
      this.geoid2Data,
      this.states,
      this.#data.national,
      this.level
    )
  );

  /**
   * Context record for the population-characteristics drawer: the selected geography's
   * fetched shard record, or the bundled national record in the national view. Before v2
   * the drawer only existed with a geography selected; the national view now has its own
   * contextual data (dev-plan §11.3).
   */
  contextRecord = $derived.by(() =>
    this.geoid1 ? this.geoid1ContextData : this.#data.nationalContext
  );
  /**
   * Is `contextRecord` the national record? The national record has no level, so the
   * drawer shows it whatever level the URL names (settled 2026-07-23, §11.7).
   */
  contextIsNational = $derived.by(() => !this.geoid1);

  /**
   * geography whose data presence drives indicator/metric availability: the primary
   * geography, or national in the national view (geoid1 empty). While a selected
   * geography is still loading this stays undefined so grids keep their skeleton state.
   */
  #indicatorGeo = $derived.by(() => (this.geoid1 ? this.geoid1Data : this.#data.national));
  #indicatorPageData = $derived.by(() => ({ metadata: this.#data.metadata, slug: this.level }));

  /** all indicators (EQ-agnostic — the all-data section; port of the map page call) */
  allIndicators = $derived(
    getSelectedIndicators(undefined, /** @type {*} */ (this.#indicatorPageData), this.#indicatorGeo)
  );
  /**
   * indicators scoped to the selected EQ (the EQ section). Filtered out of allIndicators
   * rather than recomputed, so the two lists can't disagree.
   * @type {import("$utils/types/IndicatorObject.js").IndicatorObject[]}
   */
  selectedIndicators = $derived.by(() => {
    /** @type {string[] | undefined} */
    const list = this.selectedEq?.indicator_list;
    if (!list) return this.allIndicators;
    const members = new Set(list.map(Number));
    // Filter allIndicators rather than mapping over indicator_list: allIndicators is in
    // indicators.json row order, which the pipeline sets from the workbook's "ordered
    // indicators" sheet (2026-08-20). The indicator_list cell carries its own ordering,
    // authored on a different sheet, and following it made the EQ grid and the all-data
    // grid disagree. Filtering also drops any indicator the EQ names that the metadata
    // doesn't have, which the old map+filter did explicitly.
    return this.allIndicators.filter((ind) => members.has(ind.indicator_number));
  });
  selectedIndicatorCounts = $derived({
    hasMetricData: this.selectedIndicators.filter((ind) => ind.hasMetricDataCount).length,
    noMetricData: this.selectedIndicators.filter((ind) => ind.noMetricDataCount).length
  });
  selectedMetricCounts = $derived({
    hasMetricData: countDistinctMetrics(this.selectedIndicators, "hasMetricData"),
    noMetricData: countDistinctMetrics(this.selectedIndicators, "noMetricData")
  });
  /** EQ-agnostic metric totals (the all-data section's subtitle count) */
  allMetricCounts = $derived({
    hasMetricData: countDistinctMetrics(this.allIndicators, "hasMetricData"),
    noMetricData: countDistinctMetrics(this.allIndicators, "noMetricData")
  });
  /** EQ-agnostic indicator totals — the other half of the all-data subtitle */
  allIndicatorCounts = $derived({
    hasMetricData: this.allIndicators.filter((ind) => ind.hasMetricDataCount).length,
    noMetricData: this.allIndicators.filter((ind) => ind.noMetricDataCount).length
  });

  /** auto-selected metric: first with data for the current EQ/level/geography */
  initialMetric = $derived(getInitialMetric(this.selectedIndicators));

  /**
   * The single source of truth for the selected metric: an explicit, still-valid URL
   * selection, else initialMetric. The fallback never writes the URL, so EQ/level
   * changes don't churn it.
   */
  effectiveMetric = $derived.by(() => {
    const requested = this.#params.current.metric;
    if (requested == null) return this.initialMetric;
    // While the geography loads, isValidMetricSelection can't see data presence yet and
    // initialMetric is null anyway. Trust a metadata-valid URL metric so a deep link's map
    // shard fetch runs alongside the geography fetch rather than queued behind it.
    if (this.geoid1 && !this.geoid1Data) {
      return isMetricAvailableAtLevel(requested, this.selectedIndicators, this.level)
        ? +requested
        : null;
    }
    if (isValidMetricSelection(requested, this.selectedIndicators)) return +requested;
    return this.initialMetric;
  });
  selectedMetricMetadata = $derived.by(() => {
    const metricId = this.effectiveMetric;
    if (metricId == null) return undefined;
    return this.#data.metadata.metrics.find(
      (/** @type {{ metric_id: number }} */ d) => d.metric_id === +metricId
    );
  });

  /**
   * Map-layer candidates for the current EQ / level / geography: metrics that are in_tool,
   * published at this level, present for this geography, and not disaggregate-only (those
   * carry no single value, so they can never be a choropleth). One source for the control
   * panel's METRIC dropdown and the legend card's, which used to derive it separately.
   */
  mapMetricOptions = $derived(metricDropdownOptions(this.selectedIndicators));

  /**
   * Whether the map has anything to draw. False in two cases the UI treats alike: the EQ has
   * no mappable metric at this level (EQ 4, 15 and 20 for every geography; many more in the
   * territories), or a selected geography's shard is still in flight so availability isn't
   * known yet. The legend card renders only when this is true — it used to show a "Data not
   * available" message instead, which asserted the wrong thing for ~120ms on every cold load
   * and duplicated the control panel's own "No metrics available at this level" (2026-08-21).
   */
  hasMappableMetric = $derived(this.mapMetricOptions.length > 0 && this.effectiveMetric != null);

  choroplethScale = $derived(makeChoroplethScale(this.mapMetricData?.breaks));

  /** true until the map is visually settled: shard fetched, names ready, tiles/paint rendered */
  mapVisuallyLoading = $derived(this.mapLoading || !this.geoNames || this.mapRenderPending);

  /**
   * map bounds: DEFAULT_US_BBOX in the national view, else the selected geographies' extent.
   * Exception: tracts in the national view fit nothing — the map must never show the full
   * national tract geometry (it starts at its regional zoom/minZoom instead; settled 2026-07-15).
   */
  combinedBbox = $derived.by(() => {
    if (!this.geoid1) return this.level === "tracts" ? undefined : DEFAULT_US_BBOX;
    if ((!this.geoid1Data && !this.geoid2Data) || this.geoid1Loading || this.loading2)
      return undefined;
    if (this.geoid1Data && !this.geoid2) {
      return this.geoid1Data.bbox;
    }
    if (this.geoid1Data && this.geoid2Data) {
      return computeCombinedBbox(this.geoid1Data.bbox, this.geoid2Data.bbox);
    }
    // a comparison is selected but its shard failed to load — no bounds to fit
    return undefined;
  });

  /**
   * @param {import("svelte/store").Writable<Object>} paramsStore - from constructQueryParams()
   * @param {ToolPageData} data - merged +page.js load data
   * @param {{ cache?: typeof cacheMap }} [options]
   */
  constructor(paramsStore, data, { cache = cacheMap } = {}) {
    this.#paramsStore = paramsStore;
    this.#params = /** @type {{ current: ToolParams }} */ (fromStore(paramsStore));
    this.#data = data;
    this.#cache = cache;

    // validation: selecting the primary geography as the comparison clears the comparison
    $effect(() => {
      if (this.geoid1 && this.geoid1 === this.geoid2) {
        this.#updateParams({ geoid2: null });
      }
    });

    // cosmetic: scrub a geoid the derivations have already dropped (wrong width for the
    // level, or reported nonexistent by its fetch) out of the URL. Not load-bearing —
    // geoid1/geoid2 ignore the stale param synchronously — so it's fine that this write
    // lands a macrotask later. One merged patch, per #updateParams' one-per-tick rule.
    $effect(() => {
      /** @type {Object<string, *>} */
      const patch = {};
      if (this.#params.current.geoid1 && !this.geoid1) patch.geoid1 = "";
      if (this.#params.current.geoid2 && !this.geoid2) patch.geoid2 = null;
      if (Object.keys(patch).length) this.#updateParams(patch);
    });

    // geography shards
    $effect(() => {
      this.#fetchGeoid1(this.level, this.geoid1);
    });
    // parent-state reference rows, needed as soon as any geography is selected. At states
    // level this is the same file #fetchGeoid1 asks for, and cacheMap's promise cache
    // collapses the two into one request.
    $effect(() => {
      this.#fetchStates(Boolean(this.geoid1 || this.geoid2));
    });
    $effect(() => {
      this.#fetchGeoid2(this.level, this.geoid2);
    });

    // context shards (deselecting a geography clears its context data — the old pages
    // always had a geoid1, the v2 national view doesn't)
    $effect(() => {
      this.#fetchContext(this.level, this.geoid1, 1);
    });
    $effect(() => {
      this.#fetchContext(this.level, this.geoid2, 2);
    });

    // map shard for the effective metric
    $effect(() => {
      this.#fetchMapMetric(this.level, this.effectiveMetric);
    });

    // geography-name lookup for the current level (lazy: tracts metadata is ~6 MB)
    $effect(() => {
      this.#fetchGeoNames(this.level);
    });
  }

  /**
   * The params store defers writes behind a setTimeout and `update` re-reads the
   * pre-update value, so two patches in the same tick lose the first. Call this at most
   * once per tick, or merge the patches yourself.
   * @param {Object} patch
   */
  #updateParams(patch) {
    this.#paramsStore.update((params) => ({ ...params, ...patch }));
  }

  /**
   * @param {string} scope
   * @param {*} err
   */
  #setError(scope, err) {
    this.error = { scope, message: err instanceof Error ? err.message : String(err) };
  }

  /** @param {string} scope */
  #clearError(scope) {
    if (this.error?.scope === scope) this.error = null;
  }

  /**
   * Absorb a geoid the data doesn't have. Remembering it flips geoid1/geoid2 to the
   * national-view fallback synchronously, which unmounts the selection everywhere and lets
   * the scrub effect clear the param — no banner, because a mistyped deep link asks for a URL
   * the tool never promised (settled 2026-08-17). Logged, not silent, so it stays debuggable.
   * @param {string} level
   * @param {string} geoid
   * @param {*} err
   */
  #dropUnknownGeoid(level, geoid, err) {
    console.warn(
      `dropping unknown geoid ${geoid} at ${level}:`,
      err instanceof Error ? err.message : err
    );
    // replaced wholesale, not mutated: a plain Set isn't reactive, and these hold a handful
    // of entries at most (one per bad geoid a session is asked for)
    this.#unknownGeoids = new Set(this.#unknownGeoids).add(`${level}:${geoid}`);
  }

  /**
   * Is the selection this fetch was issued for still the current one? Called after `await`,
   * where the effect's dependency tracking no longer applies, so these are plain reads.
   * Both halves matter: the same metric id is fetched at two levels, and a level change can
   * supersede a fetch without changing the selection it was keyed to.
   * @param {string} level
   * @param {"geoid1" | "geoid2" | "effectiveMetric"} selection
   * @param {*} value
   * @returns {boolean}
   */
  #isCurrent(level, selection, value) {
    return this.level === level && this[selection] === value;
  }

  /**
   * @param {string} level
   * @param {string} geoid
   */
  async #fetchGeoid1(level, geoid) {
    if (!geoid) {
      // national view: no primary geography
      this.geoid1Data = undefined;
      this.geoid1Loading = false;
      this.#clearError("geoid1");
      return;
    }
    this.geoid1Loading = true;
    try {
      const res = await this.#cache.fetchData(level, geoid);
      // ignore stale responses from superseded selections
      if (!this.#isCurrent(level, "geoid1", geoid)) return;
      this.geoid1Data = res?.[geoid];
      this.#clearError("geoid1");
    } catch (err) {
      if (!this.#isCurrent(level, "geoid1", geoid)) return;
      if (err instanceof UnknownGeographyError) {
        this.geoid1Data = undefined;
        // cleared here rather than in the `finally`, whose #isCurrent guard stops holding the
        // moment the drop takes effect
        this.geoid1Loading = false;
        this.#clearError("geoid1");
        this.#dropUnknownGeoid(level, geoid, err);
      } else {
        this.#setError("geoid1", err);
      }
    } finally {
      if (this.#isCurrent(level, "geoid1", geoid)) this.geoid1Loading = false;
    }
  }

  /**
   * states.json, once any geography is selected. Unlike the geography shards there is
   * nothing to supersede — it's one file for the whole session — so a landed value is
   * kept and deselecting a geography doesn't clear it.
   * @param {boolean} needed
   */
  async #fetchStates(needed) {
    // guarded on a plain field, not on `states`/`statesLoading`: the effect would
    // otherwise read the state it writes and cost an extra pass per load, the same
    // problem the context fetches had in Phase 2
    if (!needed || this.#statesRequest) return;
    this.statesLoading = true;
    // "statesFile", not "states": this wants the whole lookup, which no geoid describes,
    // and the "states" category is geoid-checked. Same path, so the promise cache still
    // shares one request with the geoid1 fetch at states level.
    this.#statesRequest = this.#cache.fetchData("statesFile", "all");
    try {
      this.states = await this.#statesRequest;
      this.#clearError("states");
    } catch (err) {
      // drop the handle so a later selection can retry, mirroring cacheMap's eviction
      this.#statesRequest = undefined;
      this.#setError("states", err);
    } finally {
      this.statesLoading = false;
    }
  }

  /**
   * @param {string} level
   * @param {string | null | false} geoid
   */
  async #fetchGeoid2(level, geoid) {
    if (!geoid) {
      this.geoid2Data = undefined;
      this.loading2 = false;
      this.#clearError("geoid2");
      return;
    }
    this.loading2 = true;
    try {
      const res = await this.#cache.fetchData(level, geoid);
      if (!this.#isCurrent(level, "geoid2", geoid)) return;
      this.geoid2Data = res?.[geoid];
      this.#clearError("geoid2");
    } catch (err) {
      if (!this.#isCurrent(level, "geoid2", geoid)) return;
      if (err instanceof UnknownGeographyError) {
        this.geoid2Data = undefined;
        this.loading2 = false;
        this.#clearError("geoid2");
        this.#dropUnknownGeoid(level, geoid, err);
      } else {
        this.#setError("geoid2", err);
      }
    } finally {
      if (this.#isCurrent(level, "geoid2", geoid)) this.loading2 = false;
    }
  }

  /**
   * @param {string} level
   * @param {string | null | false} geoid
   * @param {1 | 2} which
   */
  async #fetchContext(level, geoid, which) {
    const loadingKey = which === 1 ? "contextLoading" : "context2Loading";
    const dataKey = which === 1 ? "geoid1ContextData" : "geoid2ContextData";
    const selection = /** @type {"geoid1" | "geoid2"} */ (`geoid${which}`);
    if (!geoid) {
      this[dataKey] = undefined;
      this[loadingKey] = false;
      this.#clearError(`context${which}`);
      return;
    }
    this[loadingKey] = true;
    try {
      const res = await this.#cache.fetchData("context", level, geoid);
      if (!this.#isCurrent(level, selection, geoid)) return;
      this[dataKey] = res?.find((/** @type {{ geoid: string }} */ d) => d.geoid === geoid);
      this.#clearError(`context${which}`);
    } catch (err) {
      if (!this.#isCurrent(level, selection, geoid)) return;
      // the geography-shard fetch owns the drop decision for a nonexistent geoid (its path
      // identifies the geoid more precisely than the context shard's state prefix does).
      // Swallowing it here only keeps the banner from flashing in the window before the
      // geoid falls back.
      if (err instanceof UnknownGeographyError) {
        this[dataKey] = undefined;
        this.#clearError(`context${which}`);
      } else {
        this.#setError(`context${which}`, err);
      }
    } finally {
      if (this.#isCurrent(level, selection, geoid)) this[loadingKey] = false;
    }
  }

  /**
   * @param {string} level
   * @param {number | null} metric
   */
  async #fetchMapMetric(level, metric) {
    if (metric == null) {
      this.mapMetricData = undefined;
      this.mapLoading = false;
      this.#clearError("map");
      return;
    }
    this.mapLoading = true;
    try {
      const res = await this.#cache.fetchData("map", level, metric);
      // the level matters as much as the metric: the same metric is fetched at two levels
      if (!this.#isCurrent(level, "effectiveMetric", metric)) return;
      this.mapMetricData = res;
      this.#clearError("map");
    } catch (err) {
      if (this.#isCurrent(level, "effectiveMetric", metric)) this.#setError("map", err);
    } finally {
      if (this.#isCurrent(level, "effectiveMetric", metric)) this.mapLoading = false;
    }
  }

  /** @param {string} level - internal form ("school_districts") */
  async #fetchGeoNames(level) {
    const cached = this.#geoNamesCache.get(level);
    if (cached) {
      this.geoNames = cached;
      return;
    }
    // not ready for the new level; consumers see undefined during the swap
    this.geoNames = undefined;
    const geoNames = new GeoNames(/** @type {*} */ (level), this.#cache);
    try {
      await geoNames.fetchData();
      // ignore stale responses from superseded level changes
      if (this.level !== level) return;
      this.#geoNamesCache.set(level, geoNames);
      this.geoNames = geoNames;
      this.#clearError("geoNames");
    } catch (err) {
      if (this.level === level) this.#setError("geoNames", err);
    }
  }

  /* ---------------- actions ---------------- */

  /**
   * Change the data level. Takes the dash-slug URL form ("school-districts") — callers
   * convert internal ids at the boundary with internalToSlug. No geoid/metric reset patch:
   * geoid1/geoid2 derive the stale params away synchronously and effectiveMetric falls back.
   * @param {string} slug
   */
  selectLevel(slug) {
    this.#updateParams({ level: slug });
  }

  /** @param {number | string} eqid */
  selectEq(eqid) {
    // no metric reset: effectiveMetric keeps a still-valid explicit selection and
    // falls back to initialMetric otherwise (documented semantics)
    this.#updateParams({ eqid: +eqid });
  }

  /** @param {string} value - "recent" | "all" (timeframe.aml dropdown values) */
  setTimeframe(value) {
    this.#updateParams({ timeframe: value });
  }

  /** @param {string} value - "none" or a disaggregate prefix from disaggregates.json */
  setDisagg(value) {
    this.#updateParams({ disagg: value });
  }

  /** @param {string | null | undefined} geoid - empty/null returns to the national view */
  selectGeoid1(geoid) {
    this.#updateParams({ geoid1: geoid || "" });
  }

  /** @param {string | null} geoid - selecting the primary geography clears the comparison */
  selectGeoid2(geoid) {
    if (geoid === this.geoid1) {
      this.#updateParams({ geoid2: null });
    } else {
      this.#updateParams({ geoid2: geoid });
    }
  }

  removeComparison() {
    this.#updateParams({ geoid2: null });
  }

  /** @param {number} metricId - an explicit user selection (writes the URL param) */
  selectMetric(metricId) {
    this.#updateParams({ metric: metricId });
  }

  /**
   * Map click: first click in the national view selects the primary geography; with a
   * comparison active a click moves the comparison; otherwise it moves the primary
   * (port of the map page rule).
   * @param {string} geoid
   */
  mapClickHandler(geoid) {
    if (geoid === this.geoid1 || geoid === this.geoid2) {
      return;
    }
    if (!this.geoid1) {
      this.#updateParams({ geoid1: geoid });
    } else if (this.geoid2) {
      this.#updateParams({ geoid2: geoid });
    } else {
      this.#updateParams({ geoid1: geoid });
    }
  }
}
