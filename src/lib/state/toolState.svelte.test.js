// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

// @ts-nocheck — vitest-verified; skip strict-null noise on fixture lookups
// Rune-enabled test file (*.svelte.test.js) so ToolState's constructor $effects can run
// inside $effect.root. Covers the geoNames effect (per-level caching + stale-response
// guard); the fetch effects proper are exercised by the page wiring (dev-plan Phase 2).
import { describe, it, expect } from "vitest";
import { flushSync } from "svelte";
import { get, writable } from "svelte/store";
import { ToolState } from "./toolState.svelte.js";
import { UnknownGeographyError } from "$utils/cacheMap";
import { DEFAULT_US_BBOX } from "$utils/consts";

const PAGE_DATA = {
  archie: { eqData: { data: [] } },
  metadata: { indicators: [], metrics: [] },
  national: { data: {} }
};

const DEFAULT_PARAMS = {
  level: "states",
  geoid1: "",
  geoid2: false,
  eqid: 1,
  metric: null,
  timeframe: "recent",
  disagg: "none"
};

/** flush pending microtasks so async effect bodies settle */
const settle = () => new Promise((resolve) => setTimeout(resolve));

/** the key a cacheMap call is recorded and looked up under */
const callKey = (category, value, secondaryValue) =>
  secondaryValue == null ? `${category}/${value}` : `${category}/${value}/${secondaryValue}`;

/**
 * Mock cache: records calls and resolves each from the provided map. A function value is
 * invoked instead, so a test can hand back a promise it controls (stale-response tests).
 */
function makeCache(lookups = {}) {
  return {
    calls: [],
    fetchData(category, value, secondaryValue) {
      const key = callKey(category, value, secondaryValue);
      this.calls.push(key);
      const entry = lookups[key];
      return Promise.resolve(typeof entry === "function" ? entry() : entry);
    }
  };
}

/** a promise the test resolves by hand, for racing a superseded fetch */
function deferred() {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
}

describe("ToolState geoNames effect", () => {
  it("loads names for the current level and reuses cached instances on level changes", async () => {
    const cache = makeCache({
      "metadata/states": [{ geoid: "08", name: "Colorado" }],
      "metadata/counties": [{ geoid: "08031", name: "Denver County" }]
    });
    const params = writable({ ...DEFAULT_PARAMS });
    let tool;
    const cleanup = $effect.root(() => {
      tool = new ToolState(params, PAGE_DATA, { cache });
    });
    flushSync();
    expect(tool.geoNames).toBeUndefined();
    await settle();
    expect(tool.geoNames?.ready).toBe(true);
    expect(tool.geoNames.getName(8)).toBe("Colorado");

    params.update((p) => ({ ...p, level: "counties" }));
    flushSync();
    // not ready during the swap
    expect(tool.geoNames).toBeUndefined();
    await settle();
    expect(tool.geoNames?.geoLevel).toBe("counties");
    expect(tool.geoNames.getName(8031)).toBe("Denver County");

    // switching back reuses the cached instance without refetching
    params.update((p) => ({ ...p, level: "states" }));
    flushSync();
    await settle();
    expect(tool.geoNames?.geoLevel).toBe("states");
    expect(cache.calls.filter((c) => c === "metadata/states")).toHaveLength(1);

    cleanup();
  });

  it("ignores stale responses when the level changes mid-fetch", async () => {
    let releaseCounties;
    const cache = {
      calls: [],
      fetchData(category, value) {
        this.calls.push(`${category}/${value}`);
        if (value === "counties") {
          return new Promise((resolve) => {
            releaseCounties = () => resolve([{ geoid: "08031", name: "Denver County" }]);
          });
        }
        return Promise.resolve([{ geoid: "08", name: "Colorado" }]);
      }
    };
    const params = writable({ ...DEFAULT_PARAMS });
    let tool;
    const cleanup = $effect.root(() => {
      tool = new ToolState(params, PAGE_DATA, { cache });
    });
    flushSync();
    await settle();
    expect(tool.geoNames?.geoLevel).toBe("states");

    // switch to counties (fetch hangs), then back to states before it resolves
    params.update((p) => ({ ...p, level: "counties" }));
    flushSync();
    params.update((p) => ({ ...p, level: "states" }));
    flushSync();
    await settle();
    releaseCounties();
    await settle();

    // the stale counties response must not clobber the current level's instance
    expect(tool.geoNames?.geoLevel).toBe("states");

    cleanup();
  });
});

/* ---------------- fetch effects ---------------- */

const METRICS = [
  {
    metric_id: 11,
    metric_full_name: "Metric 11",
    in_tool: true,
    geo_states: true,
    geo_counties: true,
    geo_tracts: false
  }
];

const FETCH_PAGE_DATA = {
  archie: { eqData: { data: [{ id: 1, indicator_list: ["1"] }] } },
  metadata: { indicators: [{ indicator_number: 1, metrics: ["11"] }], metrics: METRICS },
  national: { data: { m11: { 2022: 0.5 } } }
};

const GEO_NAMES = { "metadata/states": [{ geoid: "08", name: "Colorado" }] };
const COUNTY_NAMES = { "metadata/counties": [{ geoid: "06075", name: "San Francisco County" }] };
const TRACT_NAMES = { "metadata/tracts": [{ geoid: "06075010100", name: "Tract 101" }] };

/** build a tool inside an effect root, returning it plus its cleanup */
function mountTool(params, cache, data = FETCH_PAGE_DATA) {
  let tool;
  const cleanup = $effect.root(() => {
    tool = new ToolState(params, data, { cache });
  });
  flushSync();
  return { tool: () => tool, cleanup };
}

describe("ToolState level-aware geoids", () => {
  it("drops a geoid that doesn't belong to the new level, without fetching its shard", async () => {
    const cache = makeCache({
      ...COUNTY_NAMES,
      ...TRACT_NAMES,
      "counties/06075": { "06075": { name: "San Francisco County", bbox: [0, 0, 1, 1] } }
    });
    const params = writable({ ...DEFAULT_PARAMS, level: "counties", geoid1: "06075" });
    const { tool, cleanup } = mountTool(params, cache);
    await settle();
    expect(tool().geoid1).toBe("06075");

    // level changes; the geoid1 param has not been rewritten yet (in the real app the
    // params store defers that write behind a setTimeout)
    params.update((p) => ({ ...p, level: "tracts" }));
    flushSync();

    // the derived geoid drops synchronously, so no doomed fetch is ever issued for the
    // 5-digit county id under the tracts level (tracts_06075.json is a real, large file)
    expect(tool().geoid1).toBe("");
    expect(cache.calls).not.toContain("tracts/06075");
    await settle();
    expect(cache.calls).not.toContain("tracts/06075");
    expect(tool().geoid1Data).toBeUndefined();

    cleanup();
  });

  it("resolves a mismatched deep link to the national view", async () => {
    const cache = makeCache(TRACT_NAMES);
    // a 2-digit state fips carried into the tracts level
    const params = writable({ ...DEFAULT_PARAMS, level: "tracts", geoid1: "06" });
    const { tool, cleanup } = mountTool(params, cache);
    await settle();

    expect(tool().geoid1).toBe("");
    expect(tool().error).toBeNull();
    expect(cache.calls).not.toContain("tracts/06");
    // and the stale param is scrubbed out of the URL
    expect(get(params).geoid1).toBe("");

    cleanup();
  });
});

describe("ToolState map shard effect", () => {
  it("ignores a stale response for the same metric at a superseded level", async () => {
    const countiesShard = deferred();
    const cache = makeCache({
      ...GEO_NAMES,
      ...COUNTY_NAMES,
      "map/counties/11": () => countiesShard.promise,
      "map/states/11": { breaks: [0.5], data: {}, level: "states" }
    });
    // national view so effectiveMetric doesn't wait on a geography fetch
    const params = writable({ ...DEFAULT_PARAMS, level: "counties", metric: 11 });
    const { tool, cleanup } = mountTool(params, cache);
    await settle();
    expect(cache.calls).toContain("map/counties/11");
    expect(tool().mapMetricData).toBeUndefined();

    // same metric, new level — the in-flight counties fetch is now stale even though
    // effectiveMetric never changed
    params.update((p) => ({ ...p, level: "states" }));
    flushSync();
    await settle();
    expect(tool().mapMetricData?.level).toBe("states");

    countiesShard.resolve({ breaks: [0.9], data: {}, level: "counties" });
    await settle();

    expect(tool().mapMetricData?.level).toBe("states");
    expect(tool().mapLoading).toBe(false);

    cleanup();
  });

  it("fetches the map shard in parallel with the geography shard on a deep link", async () => {
    const geography = deferred();
    const cache = makeCache({
      ...COUNTY_NAMES,
      "counties/06075": () => geography.promise,
      "map/counties/11": { breaks: [0.5], data: {} }
    });
    const params = writable({ ...DEFAULT_PARAMS, level: "counties", geoid1: "06075", metric: 11 });
    const { tool, cleanup } = mountTool(params, cache);

    // the map fetch is issued while the geography shard is still in flight: a URL metric
    // that metadata says exists at this level doesn't wait on geoid1Data
    expect(tool().effectiveMetric).toBe(11);
    expect(cache.calls).toContain("map/counties/11");
    expect(tool().geoid1Data).toBeUndefined();

    geography.resolve({
      "06075": { name: "San Francisco County", bbox: [0, 0, 1, 1], data: { m11: { 2022: 0.5 } } }
    });
    await settle();
    expect(tool().geoid1Data?.name).toBe("San Francisco County");
    expect(tool().effectiveMetric).toBe(11);

    cleanup();
  });

  it("falls back to initialMetric once the geography turns out to have no data for it", async () => {
    const cache = makeCache({
      ...COUNTY_NAMES,
      // the shard loads, but carries no m11 values for this county
      "counties/06075": { "06075": { name: "SF", bbox: [0, 0, 1, 1], data: {} } },
      "map/counties/11": { breaks: [0.5], data: {} }
    });
    const params = writable({ ...DEFAULT_PARAMS, level: "counties", geoid1: "06075", metric: 11 });
    const { tool, cleanup } = mountTool(params, cache);
    expect(tool().effectiveMetric).toBe(11);

    await settle();
    // nothing in the EQ has data here, so initialMetric is null and the map clears
    expect(tool().effectiveMetric).toBeNull();
    expect(tool().mapMetricData).toBeUndefined();

    cleanup();
  });

  it("does not trust a URL metric the level doesn't publish", async () => {
    const cache = makeCache({
      ...TRACT_NAMES,
      "tracts/06075010100": { "06075010100": { name: "Tract 101", bbox: [0, 0, 1, 1], data: {} } }
    });
    // m11 is geo_tracts: false
    const params = writable({
      ...DEFAULT_PARAMS,
      level: "tracts",
      geoid1: "06075010100",
      metric: 11
    });
    const { tool, cleanup } = mountTool(params, cache);

    expect(tool().effectiveMetric).toBeNull();
    expect(cache.calls).not.toContain("map/tracts/11");

    await settle();
    cleanup();
  });
});

describe("ToolState context effect", () => {
  it("ignores a stale response from a superseded geography", async () => {
    const first = deferred();
    const cache = makeCache({
      ...COUNTY_NAMES,
      "counties/06075": { "06075": { name: "SF", bbox: [0, 0, 1, 1] } },
      "counties/06001": { "06001": { name: "Alameda", bbox: [0, 0, 1, 1] } },
      "context/counties/06075": () => first.promise,
      "context/counties/06001": [{ geoid: "06001", pop: 2 }]
    });
    const params = writable({ ...DEFAULT_PARAMS, level: "counties", geoid1: "06075" });
    const { tool, cleanup } = mountTool(params, cache);
    expect(tool().contextLoading).toBe(true);

    params.update((p) => ({ ...p, geoid1: "06001" }));
    flushSync();
    await settle();
    expect(tool().geoid1ContextData?.geoid).toBe("06001");

    // the superseded 06075 response lands last and must not overwrite 06001
    first.resolve([{ geoid: "06075", pop: 1 }]);
    await settle();

    expect(tool().geoid1ContextData?.geoid).toBe("06001");
    expect(tool().contextLoading).toBe(false);

    cleanup();
  });

  it("clears context data when the geography is deselected", async () => {
    const cache = makeCache({
      ...GEO_NAMES,
      ...COUNTY_NAMES,
      "counties/06075": { "06075": { name: "SF", bbox: [0, 0, 1, 1] } },
      "context/counties/06075": [{ geoid: "06075", pop: 1 }]
    });
    const params = writable({ ...DEFAULT_PARAMS, level: "counties", geoid1: "06075" });
    const { tool, cleanup } = mountTool(params, cache);
    await settle();
    expect(tool().geoid1ContextData?.geoid).toBe("06075");

    tool().selectGeoid1(null);
    flushSync();
    await settle();

    expect(tool().geoid1ContextData).toBeUndefined();
    expect(tool().contextLoading).toBe(false);

    cleanup();
  });
});

describe("ToolState param-writing actions", () => {
  it("selectLevel writes the level slug and nothing else", async () => {
    const cache = makeCache(GEO_NAMES);
    const params = writable({ ...DEFAULT_PARAMS });
    const { tool, cleanup } = mountTool(params, cache);

    tool().selectLevel("school-districts");
    expect(get(params).level).toBe("school-districts");
    // geoid/metric invalidation is handled by the level-aware deriveds, not a reset patch
    expect(get(params).geoid1).toBe("");
    expect(get(params).metric).toBeNull();

    await settle();
    cleanup();
  });

  it("selectEq writes a numeric eqid and leaves the metric param alone", async () => {
    const cache = makeCache(GEO_NAMES);
    const params = writable({ ...DEFAULT_PARAMS, metric: 11 });
    const { tool, cleanup } = mountTool(params, cache);

    tool().selectEq("2");
    expect(get(params).eqid).toBe(2);
    expect(get(params).metric).toBe(11);

    await settle();
    cleanup();
  });

  it("setTimeframe and setDisagg write their params", async () => {
    const cache = makeCache(GEO_NAMES);
    const params = writable({ ...DEFAULT_PARAMS });
    const { tool, cleanup } = mountTool(params, cache);

    tool().setTimeframe("all");
    expect(get(params).timeframe).toBe("all");
    tool().setDisagg("d1");
    expect(get(params).disagg).toBe("d1");

    await settle();
    cleanup();
  });
});

describe("ToolState fetched payloads are raw", () => {
  it("stores shard records by identity rather than behind a deep $state proxy", async () => {
    // the shards are large and immutable — Mapbox's metricDataLookup reduce and the chart
    // shapers walk them whole on every change, so a proxy hop per property read is real
    // cost. $state.raw keeps the fetched object itself; plain $state would hand back a
    // proxy, which is not === the value cacheMap resolved.
    const geoRecord = {
      name: "San Francisco County",
      bbox: [0, 0, 1, 1],
      data: { m11: { 2022: 0.5 } }
    };
    const mapShard = { breaks: [0.5], data: [{ id: "06075", value: 0.5 }] };
    const contextRecord = { geoid: "06075", geo_medincome: 100 };
    const cache = makeCache({
      ...COUNTY_NAMES,
      "counties/06075": { "06075": geoRecord },
      "map/counties/11": mapShard,
      "context/counties/06075": [contextRecord]
    });
    const params = writable({ ...DEFAULT_PARAMS, level: "counties", geoid1: "06075", metric: 11 });
    const { tool, cleanup } = mountTool(params, cache);
    await settle();

    expect(tool().geoid1Data).toBe(geoRecord);
    expect(tool().mapMetricData).toBe(mapShard);
    expect(tool().geoid1ContextData).toBe(contextRecord);

    cleanup();
  });
});

describe("ToolState combinedBbox in the national view", () => {
  it("returns the US bbox for non-tract levels", async () => {
    const cache = makeCache(GEO_NAMES);
    const params = writable({ ...DEFAULT_PARAMS });
    const { tool, cleanup } = mountTool(params, cache);

    expect(tool().combinedBbox).toEqual(DEFAULT_US_BBOX);

    await settle();
    cleanup();
  });

  it("returns undefined for tracts so the map never fits the full nation", async () => {
    const cache = makeCache(TRACT_NAMES);
    const params = writable({ ...DEFAULT_PARAMS, level: "tracts" });
    const { tool, cleanup } = mountTool(params, cache);

    expect(tool().combinedBbox).toBeUndefined();

    await settle();
    cleanup();
  });
});

describe("ToolState states.json fetch", () => {
  const STATES_FILE = { "06": { name: "California", data: { m11: { 2022: 0.4 } } } };

  it("is never requested in the national view", async () => {
    const cache = makeCache(GEO_NAMES);
    const params = writable({ ...DEFAULT_PARAMS });
    const { tool, cleanup } = mountTool(params, cache);
    await settle();

    // the whole point of the split: no geography selected, so the 229 KB file is not paid for
    expect(cache.calls).not.toContain("statesFile/all");
    expect(tool().states).toBeUndefined();
    expect(tool().loading).toBe(false);
    // and the cards still build, from the national record alone
    expect(tool().cardGeographies.map((g) => g.role)).toEqual(["national"]);

    cleanup();
  });

  it("loads on geography selection and supplies the parent-state card role", async () => {
    const cache = makeCache({
      ...COUNTY_NAMES,
      "counties/06075": { "06075": { name: "San Francisco County", s_id: "06", data: {} } },
      "statesFile/all": STATES_FILE
    });
    const params = writable({ ...DEFAULT_PARAMS, level: "counties", geoid1: "06075" });
    const { tool, cleanup } = mountTool(params, cache);
    await settle();

    expect(cache.calls.filter((c) => c === "statesFile/all")).toHaveLength(1);
    expect(tool().states).toBe(STATES_FILE);
    expect(tool().cardGeographies.map((g) => g.role)).toEqual([
      "primary",
      "primaryState",
      "national"
    ]);

    cleanup();
  });

  it("keeps the grids dimmed until it lands, after the geography shard already has", async () => {
    const statesFile = deferred();
    const cache = makeCache({
      ...COUNTY_NAMES,
      "counties/06075": {
        "06075": { name: "San Francisco County", s_id: "06", data: {}, bbox: [0, 0, 1, 1] }
      },
      "statesFile/all": () => statesFile.promise
    });
    const params = writable({ ...DEFAULT_PARAMS, level: "counties", geoid1: "06075" });
    const { tool, cleanup } = mountTool(params, cache);
    await settle();

    // the geography is in, but a card drawn now would have no parent-state reference
    expect(tool().geoid1Data).toBeDefined();
    expect(tool().geoid1Loading).toBe(false);
    expect(tool().loading).toBe(true);
    // the map does not wait on states.json — it reads geoid1Loading, not the combined
    // flag, so the camera fits as soon as the geography shard lands
    expect(tool().combinedBbox).toEqual([0, 0, 1, 1]);

    statesFile.resolve(STATES_FILE);
    await settle();
    expect(tool().loading).toBe(false);

    cleanup();
  });

  it("is fetched once per session, not per selection", async () => {
    const cache = makeCache({
      ...COUNTY_NAMES,
      "counties/06075": { "06075": { name: "San Francisco County", s_id: "06", data: {} } },
      "counties/06001": { "06001": { name: "Alameda County", s_id: "06", data: {} } },
      "statesFile/all": STATES_FILE
    });
    const params = writable({ ...DEFAULT_PARAMS, level: "counties", geoid1: "06075" });
    const { tool, cleanup } = mountTool(params, cache);
    await settle();

    params.update((p) => ({ ...p, geoid1: "06001" }));
    flushSync();
    await settle();

    expect(tool().geoid1Data.name).toBe("Alameda County");
    expect(cache.calls.filter((c) => c === "statesFile/all")).toHaveLength(1);

    cleanup();
  });

  it("surfaces a failure inline and retries on the next selection", async () => {
    let attempt = 0;
    const cache = makeCache({
      ...COUNTY_NAMES,
      "counties/06075": { "06075": { name: "San Francisco County", s_id: "06", data: {} } },
      "counties/06001": { "06001": { name: "Alameda County", s_id: "06", data: {} } },
      "statesFile/all": () =>
        ++attempt === 1 ? Promise.reject(new Error("Failed to load states data")) : STATES_FILE
    });
    const params = writable({ ...DEFAULT_PARAMS, level: "counties", geoid1: "06075" });
    const { tool, cleanup } = mountTool(params, cache);
    await settle();

    expect(tool().error).toEqual({ scope: "states", message: "Failed to load states data" });
    expect(tool().loading).toBe(false);
    // degrades to cards without the parent-state reference rather than hanging
    expect(tool().cardGeographies.map((g) => g.role)).toEqual(["primary", "national"]);

    params.update((p) => ({ ...p, geoid1: "06001" }));
    flushSync();
    await settle();

    expect(tool().states).toBe(STATES_FILE);
    expect(tool().error).toBeNull();

    cleanup();
  });
});

describe("ToolState error state", () => {
  it("surfaces a failed geography fetch inline", async () => {
    // a plain Error is a real failure (transport, outage, malformed file) and still banners;
    // an UnknownGeographyError doesn't — see "ToolState unknown geoids" below
    const cache = makeCache({
      ...COUNTY_NAMES,
      "counties/06075": () => Promise.reject(new Error("No counties file matches the id: 06075"))
    });
    const params = writable({ ...DEFAULT_PARAMS, level: "counties", geoid1: "06075" });
    const { tool, cleanup } = mountTool(params, cache);
    await settle();

    expect(tool().error).toEqual({
      scope: "geoid1",
      message: "No counties file matches the id: 06075"
    });
    expect(tool().loading).toBe(false);

    cleanup();
  });

  it("surfaces a failed geoNames fetch instead of leaving an empty lookup ready", async () => {
    // an empty metadata payload used to leave GeoNames "ready" with nothing in it
    const cache = makeCache({ "metadata/states": [] });
    const params = writable({ ...DEFAULT_PARAMS });
    const { tool, cleanup } = mountTool(params, cache);
    await settle();

    expect(tool().geoNames).toBeUndefined();
    expect(tool().error?.scope).toBe("geoNames");

    cleanup();
  });
});

describe("ToolState unknown geoids", () => {
  // a geoid with the right width for the level but no data behind it — a mistyped or retired
  // deep link. It resolves to the default view with no banner, the same as a wrong-width
  // geoid, because it asks for a URL the tool never promised (settled 2026-08-17)
  const unknown = (message) => () => Promise.reject(new UnknownGeographyError(message));

  it("drops a nonexistent state fips to the national view without a banner", async () => {
    const cache = makeCache({
      ...GEO_NAMES,
      "states/99": unknown("99 not found in states dataset."),
      "statesFile/all": { "06": { name: "California", data: {} } }
    });
    const params = writable({ ...DEFAULT_PARAMS, geoid1: "99" });
    const { tool, cleanup } = mountTool(params, cache);
    await settle();

    expect(tool().error).toBeNull();
    expect(tool().geoid1).toBe("");
    expect(tool().geoid1Data).toBeUndefined();
    // the national view proper: cards from the national record, and the loading gate released
    expect(tool().cardGeographies.map((g) => g.role)).toEqual(["national"]);
    expect(tool().loading).toBe(false);
    // and the param is scrubbed, so a reload doesn't ask again
    expect(get(params).geoid1).toBe("");

    cleanup();
  });

  it("drops a nonexistent sub-state geoid without a banner from either shard", async () => {
    // ?level=counties&geoid1=99001 — the county shard and the context shard are both keyed
    // to the bogus state prefix, so both reject; neither may flash the banner
    const cache = makeCache({
      ...COUNTY_NAMES,
      "counties/99001": unknown("No counties file matches the id: 99001."),
      "context/counties/99001": unknown("Failed to load context data for counties (99001).")
    });
    const params = writable({ ...DEFAULT_PARAMS, level: "counties", geoid1: "99001" });
    const { tool, cleanup } = mountTool(params, cache);
    await settle();

    expect(tool().error).toBeNull();
    expect(tool().geoid1).toBe("");
    expect(tool().geoid1ContextData).toBeUndefined();
    // with no geography selected the drawer reads the bundled national record
    expect(tool().contextIsNational).toBe(true);
    expect(get(params).geoid1).toBe("");

    cleanup();
  });

  it("drops a nonexistent comparison geoid and keeps the primary selection", async () => {
    const cache = makeCache({
      ...GEO_NAMES,
      "states/06": { "06": { name: "California", bbox: [0, 0, 1, 1], data: {} } },
      "states/99": unknown("99 not found in states dataset."),
      "statesFile/all": { "06": { name: "California", data: {} } }
    });
    const params = writable({ ...DEFAULT_PARAMS, geoid1: "06", geoid2: "99" });
    const { tool, cleanup } = mountTool(params, cache);
    await settle();

    expect(tool().error).toBeNull();
    expect(tool().geoid2).toBeNull();
    expect(tool().geoid2Data).toBeUndefined();
    expect(tool().loading2).toBe(false);
    expect(tool().geoid1Data.name).toBe("California");
    expect(tool().cardGeographies.map((g) => g.role)).toEqual(["primary", "national"]);
    // the comparison param is cleared rather than left pointing at nothing
    expect(get(params).geoid2).toBeNull();

    cleanup();
  });

  it("does not re-request a geoid it has already dropped", async () => {
    // the drop is remembered per level, so the scrub write and any later re-render can't
    // start the fetch over
    const cache = makeCache({
      ...GEO_NAMES,
      "states/99": unknown("99 not found in states dataset."),
      "statesFile/all": { "06": { name: "California", data: {} } }
    });
    const params = writable({ ...DEFAULT_PARAMS, geoid1: "99" });
    const { tool, cleanup } = mountTool(params, cache);
    await settle();

    // re-asserting the same bad geoid in the URL is ignored without another fetch
    params.update((p) => ({ ...p, geoid1: "99" }));
    flushSync();
    await settle();

    expect(cache.calls.filter((c) => c === "states/99")).toHaveLength(1);
    expect(tool().geoid1).toBe("");
    expect(tool().error).toBeNull();

    cleanup();
  });

  it("leaves the rest of the level selectable after a drop", async () => {
    const cache = makeCache({
      ...GEO_NAMES,
      "states/99": unknown("99 not found in states dataset."),
      "states/06": { "06": { name: "California", bbox: [0, 0, 1, 1], data: {} } },
      "statesFile/all": { "06": { name: "California", data: {} } }
    });
    const params = writable({ ...DEFAULT_PARAMS, geoid1: "99" });
    const { tool, cleanup } = mountTool(params, cache);
    await settle();
    expect(tool().geoid1).toBe("");

    // only the dropped geoid is remembered — selecting a real one next works normally
    tool().selectGeoid1("06");
    flushSync();
    await settle();

    expect(tool().geoid1Data.name).toBe("California");
    expect(tool().error).toBeNull();

    cleanup();
  });
});

describe("ToolState metric counts", () => {
  it("allMetricCounts spans every indicator while selectedMetricCounts stays EQ-scoped", async () => {
    // EQ 1 covers only indicator 1; indicator 2's m12 lacks national data and m20
    // isn't published at states, so both land in the no-data total
    const data = {
      archie: { eqData: { data: [{ id: 1, indicator_list: ["1"] }] } },
      metadata: {
        indicators: [
          { indicator_number: 1, metrics: ["11"] },
          { indicator_number: 2, metrics: ["12", "20"] }
        ],
        metrics: [
          { metric_id: 11, in_tool: true, geo_states: true },
          { metric_id: 12, in_tool: true, geo_states: true },
          { metric_id: 20, in_tool: true, geo_states: false }
        ]
      },
      national: { data: { m11: { 2022: 0.5 }, m20: { 2022: 0.1 } } }
    };
    const cache = makeCache(GEO_NAMES);
    const params = writable({ ...DEFAULT_PARAMS });
    const { tool, cleanup } = mountTool(params, cache, data);
    await settle();

    expect(tool().selectedMetricCounts).toEqual({ hasMetricData: 1, noMetricData: 0 });
    expect(tool().allMetricCounts).toEqual({ hasMetricData: 1, noMetricData: 2 });

    cleanup();
  });

  it("counts a metric listed under two indicators once", async () => {
    // m231's real shape: indicators 49 and 92 both list it, so the all-data subtitle
    // ("{{x}} metrics of success have available data") reported one metric too many
    const data = {
      archie: { eqData: { data: [{ id: 1, indicator_list: ["49", "92"] }] } },
      metadata: {
        indicators: [
          { indicator_number: 49, metrics: ["231"] },
          { indicator_number: 92, metrics: ["231", "11"] }
        ],
        metrics: [
          { metric_id: 231, in_tool: true, geo_states: true },
          { metric_id: 11, in_tool: true, geo_states: true }
        ]
      },
      national: { data: { m231: { 2022: 1.2 }, m11: { 2022: 0.5 } } }
    };
    const cache = makeCache(GEO_NAMES);
    const params = writable({ ...DEFAULT_PARAMS });
    const { tool, cleanup } = mountTool(params, cache, data);
    await settle();

    // three listings across the two indicators, two distinct metrics
    expect(tool().allMetricCounts).toEqual({ hasMetricData: 2, noMetricData: 0 });
    expect(tool().selectedMetricCounts).toEqual({ hasMetricData: 2, noMetricData: 0 });

    cleanup();
  });

  it("allIndicatorCounts spans every indicator (the all-data subtitle's other half)", async () => {
    const data = {
      archie: { eqData: { data: [{ id: 1, indicator_list: ["1"] }] } },
      metadata: {
        indicators: [
          { indicator_number: 1, metrics: ["11"] },
          { indicator_number: 2, metrics: ["12"] }
        ],
        metrics: [
          { metric_id: 11, in_tool: true, geo_states: true },
          { metric_id: 12, in_tool: true, geo_states: true }
        ]
      },
      // only m11 has a value, so indicator 2 is an indicator without data
      national: { data: { m11: { 2022: 0.5 } } }
    };
    const cache = makeCache(GEO_NAMES);
    const params = writable({ ...DEFAULT_PARAMS });
    const { tool, cleanup } = mountTool(params, cache, data);
    await settle();

    expect(tool().allIndicatorCounts).toEqual({ hasMetricData: 1, noMetricData: 1 });
    expect(tool().selectedIndicatorCounts).toEqual({ hasMetricData: 1, noMetricData: 0 });

    cleanup();
  });
});

describe("ToolState hasMappableMetric", () => {
  /** @param {*} extraMetric */
  const eqWith = (extraMetric) => ({
    archie: { eqData: { data: [{ id: 1, indicator_list: ["1"] }] } },
    metadata: {
      indicators: [{ indicator_number: 1, metrics: ["11"] }],
      metrics: [extraMetric]
    },
    national: { data: { m11: { 2022: 0.5 }, m11_d1_white: { 2022: 0.5 } } }
  });

  it("is true when the EQ has a mappable metric with data", async () => {
    const cache = makeCache(GEO_NAMES);
    const params = writable({ ...DEFAULT_PARAMS });
    const { tool, cleanup } = mountTool(
      params,
      cache,
      eqWith({ metric_id: 11, in_tool: true, geo_states: true })
    );
    await settle();

    expect(tool().hasMappableMetric).toBe(true);
    expect(tool().mapMetricOptions).toHaveLength(1);

    cleanup();
  });

  it("is false when the EQ's only metric is disaggregate-only — it can never be a layer", async () => {
    const cache = makeCache(GEO_NAMES);
    const params = writable({ ...DEFAULT_PARAMS });
    const { tool, cleanup } = mountTool(
      params,
      cache,
      eqWith({ metric_id: 11, in_tool: true, geo_states: true, disagg_only: true })
    );
    await settle();

    expect(tool().mapMetricOptions).toEqual([]);
    expect(tool().hasMappableMetric).toBe(false);

    cleanup();
  });

  it("is false when the metric is not published at the current level", async () => {
    const cache = makeCache(GEO_NAMES);
    const params = writable({ ...DEFAULT_PARAMS });
    const { tool, cleanup } = mountTool(
      params,
      cache,
      eqWith({ metric_id: 11, in_tool: true, geo_states: false })
    );
    await settle();

    expect(tool().hasMappableMetric).toBe(false);

    cleanup();
  });

  it("is false while a selected geography's shard is still in flight, true once it lands", async () => {
    // the legend card used to render "Data not available" in this window, asserting a gap
    // the pending fetch had not established yet — ~120ms of it on every cold load
    const cache = makeCache({
      ...GEO_NAMES,
      "states/06": {
        "06": { name: "California", bbox: [0, 0, 1, 1], data: { m11: { 2022: 0.5 } } }
      },
      "statesFile/all": { "06": { name: "California", data: { m11: { 2022: 0.5 } } } }
    });
    const params = writable({ ...DEFAULT_PARAMS, geoid1: "06" });
    const { tool, cleanup } = mountTool(
      params,
      cache,
      eqWith({ metric_id: 11, in_tool: true, geo_states: true })
    );

    // before the geography resolves, availability is unknown — not absent
    expect(tool().geoid1Data).toBeUndefined();
    expect(tool().hasMappableMetric).toBe(false);

    await settle();

    expect(tool().geoid1Data.name).toBe("California");
    expect(tool().hasMappableMetric).toBe(true);

    cleanup();
  });
});

describe("ToolState indicator ordering", () => {
  it("orders an EQ's indicators by indicators.json row order, not the indicator_list cell", async () => {
    // indicators.json row order is canonical (the workbook's "ordered indicators" sheet);
    // the EQ's indicator_list is authored on a different sheet and carries its own order
    const data = {
      archie: { eqData: { data: [{ id: 1, indicator_list: ["3", "1", "2"] }] } },
      metadata: {
        indicators: [
          { indicator_number: 2, metrics: ["12"] },
          { indicator_number: 3, metrics: ["13"] },
          { indicator_number: 1, metrics: ["11"] }
        ],
        metrics: [
          { metric_id: 11, in_tool: true, geo_states: true },
          { metric_id: 12, in_tool: true, geo_states: true },
          { metric_id: 13, in_tool: true, geo_states: true }
        ]
      },
      national: { data: { m11: { 2022: 0.5 }, m12: { 2022: 0.5 }, m13: { 2022: 0.5 } } }
    };
    const cache = makeCache(GEO_NAMES);
    const params = writable({ ...DEFAULT_PARAMS });
    const { tool, cleanup } = mountTool(params, cache, data);
    await settle();

    expect(tool().selectedIndicators.map((ind) => ind.indicator_number)).toEqual([2, 3, 1]);

    cleanup();
  });

  it("drops an indicator the EQ names that the metadata does not have", async () => {
    const data = {
      archie: { eqData: { data: [{ id: 1, indicator_list: ["1", "99"] }] } },
      metadata: {
        indicators: [{ indicator_number: 1, metrics: ["11"] }],
        metrics: [{ metric_id: 11, in_tool: true, geo_states: true }]
      },
      national: { data: { m11: { 2022: 0.5 } } }
    };
    const cache = makeCache(GEO_NAMES);
    const params = writable({ ...DEFAULT_PARAMS });
    const { tool, cleanup } = mountTool(params, cache, data);
    await settle();

    expect(tool().selectedIndicators.map((ind) => ind.indicator_number)).toEqual([1]);

    cleanup();
  });
});
