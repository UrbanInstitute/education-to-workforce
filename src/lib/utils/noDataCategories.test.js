// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

import { describe, it, expect } from "vitest";
import {
  DEFAULT_CATEGORY,
  lookupCategory,
  canBucket,
  groupMetricsByBucket,
  availableAtState
} from "./noDataCategories.js";

const CATEGORIES = {
  1: { "01": "found", "06": "found" },
  22: { "01": "not_found" }
};

const BUCKETS = [
  {
    value: "state_reported",
    label: "States publicly report data",
    copy: "",
    codes: "found"
  },
  { value: "not_found", label: "No data available", copy: "", codes: "not_found" }
];

// same pair, with the first bucket also claiming everything the tool has for the state
const STATE_DATA_BUCKETS = [{ ...BUCKETS[0], stateData: "true" }, BUCKETS[1]];

describe("lookupCategory", () => {
  it("resolves the code for a covered metric × state pair", () => {
    expect(lookupCategory(CATEGORIES, 1, "01")).toBe("found");
    expect(lookupCategory(CATEGORIES, 22, "01")).toBe("not_found");
  });

  it("accepts numeric or string metric ids (JSON keys are strings)", () => {
    expect(lookupCategory(CATEGORIES, "1", "01")).toBe("found");
  });

  it("defaults to not_found for uncovered pairs", () => {
    expect(lookupCategory(CATEGORIES, 1, "56")).toBe(DEFAULT_CATEGORY);
    expect(lookupCategory(CATEGORIES, 999, "01")).toBe(DEFAULT_CATEGORY);
  });

  it("defaults to not_found with no categories or no state", () => {
    expect(lookupCategory(undefined, 1, "01")).toBe(DEFAULT_CATEGORY);
    expect(lookupCategory(CATEGORIES, 1, undefined)).toBe(DEFAULT_CATEGORY);
  });
});

describe("canBucket", () => {
  it("is true only with both a non-empty categories object and a state", () => {
    expect(canBucket(CATEGORIES, "01")).toBe(true);
    expect(canBucket(CATEGORIES, undefined)).toBe(false); // national view
    expect(canBucket(CATEGORIES, "")).toBe(false);
    expect(canBucket(undefined, "01")).toBe(false); // missing file
    expect(canBucket({}, "01")).toBe(false); // empty file
  });
});

describe("groupMetricsByBucket", () => {
  const metrics = [{ metric_id: 1 }, { metric_id: 22 }, { metric_id: 999 }];

  it("groups by code into buckets in aml order, applying the not_found default", () => {
    const buckets = groupMetricsByBucket(metrics, CATEGORIES, "01", BUCKETS);
    expect(buckets.map((b) => b.bucket.value)).toEqual(["state_reported", "not_found"]);
    expect(buckets[0].metrics.map((m) => m.metric_id)).toEqual([1]); // found
    // 22 is explicitly not_found; 999 is uncovered → defaults into the same bucket
    expect(buckets[1].metrics.map((m) => m.metric_id)).toEqual([22, 999]);
  });

  it("parses a bucket's comma-separated codes list", () => {
    const merged = [{ value: "all", label: "", copy: "", codes: "found, not_found" }];
    const buckets = groupMetricsByBucket(metrics, CATEGORIES, "01", merged);
    expect(buckets[0].metrics.map((m) => m.metric_id)).toEqual([1, 22, 999]);
  });

  it("routes a metric the tool has for the state into the stateData bucket", () => {
    const published = metrics.map((m) => ({ ...m, geo_states: true, in_tool: true }));
    // 22 is not_found, but the state record has it — the ECS code loses to that
    const buckets = groupMetricsByBucket(published, CATEGORIES, "01", STATE_DATA_BUCKETS, {
      m22: {}
    });
    expect(buckets[0].metrics.map((m) => m.metric_id)).toEqual([1, 22]);
    expect(buckets[1].metrics.map((m) => m.metric_id)).toEqual([999]);
  });

  it("splits on the ECS codes alone with no state record (states level, or not yet landed)", () => {
    const published = metrics.map((m) => ({ ...m, geo_states: true, in_tool: true }));
    const buckets = groupMetricsByBucket(published, CATEGORIES, "01", STATE_DATA_BUCKETS);
    expect(buckets[0].metrics.map((m) => m.metric_id)).toEqual([1]);
    expect(buckets[1].metrics.map((m) => m.metric_id)).toEqual([22, 999]);
  });

  it("ignores state data when no bucket claims it", () => {
    const published = metrics.map((m) => ({ ...m, geo_states: true, in_tool: true }));
    const buckets = groupMetricsByBucket(published, CATEGORIES, "01", BUCKETS, { m22: {} });
    expect(buckets[1].metrics.map((m) => m.metric_id)).toEqual([22, 999]);
  });
});

describe("availableAtState", () => {
  const metric = { metric_id: 22, geo_states: true, in_tool: true };

  it("is true only when the state record has the metric and it's published there", () => {
    expect(availableAtState({ m22: {} }, metric)).toBe(true);
    expect(availableAtState({ m1: {} }, metric)).toBe(false);
    expect(availableAtState(undefined, metric)).toBe(false);
    expect(availableAtState({ m22: {} }, { ...metric, geo_states: false })).toBe(false);
    expect(availableAtState({ m22: {} }, { ...metric, in_tool: false })).toBe(false);
  });

  it("probes subgroup keys for a disaggregate-only metric", () => {
    const disaggOnly = { ...metric, disagg_only: true };
    expect(availableAtState({ m22_d1_black: {} }, disaggOnly)).toBe(true);
    // no bare accessor to find — the base key alone doesn't count for these
    expect(availableAtState({ m22: {} }, disaggOnly)).toBe(false);
  });
});
