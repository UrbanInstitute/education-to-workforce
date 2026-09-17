// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

// @ts-nocheck — vitest-verified
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import cacheMap, { UnknownGeographyError } from "./cacheMap.js";

const ok = (body) => ({ ok: true, json: async () => body });
const notFound = { ok: false, status: 404 };
const serverError = { ok: false, status: 503 };

beforeEach(() => {
  cacheMap.cacheMap.clear();
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("cacheMap.fetchData error handling", () => {
  // these three categories used to fall through the error branches and resolve undefined,
  // which left GeoNames "ready" with an empty lookup and ToolState's catch blocks unreachable
  it.each(["metadata", "context", "autocomplete"])(
    "rejects when a %s fetch 404s",
    async (category) => {
      fetch.mockResolvedValue(notFound);
      await expect(cacheMap.fetchData(category, "counties", "08031")).rejects.toThrow(
        /Failed to load/
      );
    }
  );

  it("rejects with a geography-specific message when a shard 404s", async () => {
    fetch.mockResolvedValue(notFound);
    await expect(cacheMap.fetchData("counties", "08031")).rejects.toThrow(
      /No counties file matches the id: 08031/
    );
  });

  it("rejects with a map-specific message when a map shard 404s", async () => {
    fetch.mockResolvedValue(notFound);
    await expect(cacheMap.fetchData("map", "counties", 11)).rejects.toThrow(
      /No map file matches the metric id: 11/
    );
  });

  it("rejects when the shard loads but doesn't contain the requested geoid", async () => {
    // the counties_06 shard exists, but a 5-digit id from another level isn't in it
    fetch.mockResolvedValue(ok({ "06075": { name: "San Francisco County" } }));
    await expect(cacheMap.fetchData("counties", "06001")).rejects.toThrow(
      /06001 not found in counties dataset/
    );
  });

  it("rejects a state fips that isn't in the file", async () => {
    // states were the one geoid-keyed level this check skipped: a bad fips resolved
    // undefined and rendered a tool with "0 metrics" everywhere and no explanation
    fetch.mockResolvedValue(ok({ "08": { name: "Colorado" } }));
    await expect(cacheMap.fetchData("states", "99")).rejects.toThrow(
      /99 not found in states dataset/
    );
  });

  describe("unknown geography vs. real failure", () => {
    // ToolState drops the selection silently for the first kind and raises the error banner
    // for the second, so which class comes back is the whole contract

    it("classifies a geoid the loaded file doesn't have as an unknown geography", async () => {
      fetch.mockResolvedValue(ok({ "08": { name: "Colorado" } }));
      await expect(cacheMap.fetchData("states", "99")).rejects.toThrow(UnknownGeographyError);
    });

    it("classifies a 404 on a geoid-derived shard path as an unknown geography", async () => {
      // counties_99.json: the filename comes from the geoid's state prefix, so its absence
      // says the geography doesn't exist
      fetch.mockResolvedValue(notFound);
      await expect(cacheMap.fetchData("counties", "99001")).rejects.toThrow(UnknownGeographyError);
    });

    it("classifies a 404 on a sub-state context shard as an unknown geography", async () => {
      fetch.mockResolvedValue(notFound);
      await expect(cacheMap.fetchData("context", "counties", "99001")).rejects.toThrow(
        UnknownGeographyError
      );
    });

    it.each([
      ["states.json", ["states", "08"]],
      ["the states context file", ["context", "states", "08"]],
      ["a map shard", ["map", "counties", 11]],
      ["level metadata", ["metadata", "counties"]]
    ])("keeps a 404 on %s a plain failure", async (_label, args) => {
      // universal files and the map shard aren't described by any geoid: missing means broken
      fetch.mockResolvedValue(notFound);
      const rejection = cacheMap.fetchData(...args);
      await expect(rejection).rejects.toThrow(Error);
      await expect(rejection).rejects.not.toThrow(UnknownGeographyError);
    });

    it("keeps a non-404 status on a shard path a plain failure", async () => {
      // an outage while loading a real geography's shard must still surface, not vanish
      fetch.mockResolvedValue(serverError);
      const rejection = cacheMap.fetchData("counties", "06001");
      await expect(rejection).rejects.toThrow(Error);
      await expect(rejection).rejects.not.toThrow(UnknownGeographyError);
    });

    it("keeps a transport failure a plain failure", async () => {
      fetch.mockRejectedValue(new TypeError("Failed to fetch"));
      const rejection = cacheMap.fetchData("counties", "06001");
      await expect(rejection).rejects.toThrow(/Failed to fetch/);
      await expect(rejection).rejects.not.toThrow(UnknownGeographyError);
    });
  });

  it("does not geoid-check the whole-file category", async () => {
    // "statesFile" asks for the lookup itself, which no geoid describes
    fetch.mockResolvedValue(ok({ "08": { name: "Colorado" } }));
    await expect(cacheMap.fetchData("statesFile", "all")).resolves.toHaveProperty("08");
  });

  it("rejects on an unknown category instead of resolving undefined", async () => {
    await expect(cacheMap.fetchData("nonsense", "08")).rejects.toThrow(/Unknown data category/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("resolves undefined without fetching when value is empty", async () => {
    await expect(cacheMap.fetchData("counties", "")).resolves.toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("cacheMap.fetchData success paths", () => {
  it("decorates geography shards with parent state and display names", async () => {
    fetch.mockResolvedValue(ok({ "06075": { name: "San Francisco County" } }));
    const data = await cacheMap.fetchData("counties", "06075");

    expect(data["06075"]).toMatchObject({
      init_name: "San Francisco County",
      s_id: "06",
      name: "San Francisco County, California",
      short_name: "San Francisco County, CA"
    });
  });

  it("names tracts through their county", async () => {
    fetch.mockResolvedValue(ok({ "06075010100": { name: "101", c_name: "San Francisco County" } }));
    const data = await cacheMap.fetchData("tracts", "06075010100");

    expect(data["06075010100"].name).toBe("Tract 101 - San Francisco County, California");
    expect(data["06075010100"].short_name).toBe("Tract 101 - San Francisco County, CA");
  });

  it("serves states.json from static, at one path for both categories", async () => {
    // it stopped being a bundled import in the code-splitting pass (dev-plan §12.5 #1).
    // ToolState asks for the whole file via "statesFile" while the geoid1 effect asks for
    // one record via "states" — both resolve to the same path, so a states-level load
    // makes one request
    fetch.mockResolvedValue(ok({ "08": { name: "Colorado" } }));
    const [whole, one] = await Promise.all([
      cacheMap.fetchData("statesFile", "all"),
      cacheMap.fetchData("states", "08")
    ]);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toBe("/data/metrics/states.json");
    expect(whole).toBe(one);
  });

  it("leaves state records undecorated so their names aren't doubled", async () => {
    // states arrive already fully named; running addGeographyNames over them would make
    // "Colorado, Colorado" / "Colorado, CO" and displayName() prefers short_name
    fetch.mockResolvedValue(ok({ "08": { name: "Colorado" } }));
    const data = await cacheMap.fetchData("states", "08");

    expect(data["08"]).toEqual({ name: "Colorado" });
    expect(data["08"].short_name).toBeUndefined();
    expect(data["08"].s_id).toBeUndefined();
  });

  it("serves a second request for the same path from cache", async () => {
    fetch.mockResolvedValue(ok([{ geoid: "08", name: "Colorado" }]));
    await cacheMap.fetchData("metadata", "states");
    await cacheMap.fetchData("metadata", "states");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe("cacheMap.fetchData promise caching", () => {
  it("dedupes concurrent requests for the same path into one fetch", async () => {
    // geoid1 and geoid2 in the same state hit the same multi-MB shard in the same tick
    let release;
    const inFlight = new Promise((resolve) => (release = resolve));
    fetch.mockImplementation(async () => {
      await inFlight;
      return ok({ "06075": { name: "San Francisco County" }, "06001": { name: "Alameda County" } });
    });

    const both = Promise.all([
      cacheMap.fetchData("counties", "06075"),
      cacheMap.fetchData("counties", "06001")
    ]);
    release();
    const [first, second] = await both;

    expect(fetch).toHaveBeenCalledTimes(1);
    // both callers see the same decorated shard, applied exactly once
    expect(first).toBe(second);
    expect(first["06075"].name).toBe("San Francisco County, California");
  });

  it("still validates the geoid when the shard comes from cache", async () => {
    // #3: a stale deep link on a warm cache used to resolve undefined and hang in skeleton state
    fetch.mockResolvedValue(ok({ "06075": { name: "San Francisco County" } }));
    await cacheMap.fetchData("counties", "06075");

    await expect(cacheMap.fetchData("counties", "06001")).rejects.toThrow(
      /06001 not found in counties dataset/
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("evicts a rejected path so a retry can succeed", async () => {
    fetch.mockResolvedValueOnce(notFound);
    await expect(cacheMap.fetchData("counties", "06075")).rejects.toThrow(/No counties file/);

    fetch.mockResolvedValueOnce(ok({ "06075": { name: "San Francisco County" } }));
    await expect(cacheMap.fetchData("counties", "06075")).resolves.toMatchObject({
      "06075": { s_id: "06" }
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("rejects every concurrent caller when the shared fetch fails", async () => {
    fetch.mockResolvedValue(notFound);
    const results = await Promise.allSettled([
      cacheMap.fetchData("counties", "06075"),
      cacheMap.fetchData("counties", "06001")
    ]);

    expect(results.map((r) => r.status)).toEqual(["rejected", "rejected"]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
