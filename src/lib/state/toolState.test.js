// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

// @ts-nocheck — vitest-verified; skip strict-null noise on fixture lookups
import { describe, it, expect } from "vitest";
// importing the module also verifies the runes class compiles; effect behavior is
// exercised when the class is wired into the page in Phase 2
import {
  makeChoroplethScale,
  computeCombinedBbox,
  getInitialMetric,
  isValidMetricSelection,
  isMetricAvailableAtLevel,
  metricDropdownOptions
} from "./toolState.svelte.js";
import { COLOR_RANGE, geoidMatchesLevel } from "$utils/consts";

describe("makeChoroplethScale", () => {
  it("returns undefined without breaks", () => {
    expect(makeChoroplethScale(undefined)).toBeUndefined();
  });

  it("uses the full color range when there are enough breaks", () => {
    const scale = makeChoroplethScale([0.2, 0.4, 0.6, 0.8, 1]);
    expect(scale.range()).toEqual(COLOR_RANGE);
    expect(scale(0.5)).toBe(COLOR_RANGE[2]);
  });

  it("slices the color range to breaks + 1 when there are fewer breaks", () => {
    const scale = makeChoroplethScale([0.5, 1]);
    expect(scale.range()).toEqual(COLOR_RANGE.slice(0, 3));
  });
});

describe("computeCombinedBbox", () => {
  it("returns the bbox covering both input bboxes", () => {
    expect(computeCombinedBbox([0, 0, 1, 1], [2, 2, 3, 3])).toEqual([0, 0, 3, 3]);
    expect(computeCombinedBbox([-10, -5, 1, 1], [0, 0, 3, 8])).toEqual([-10, -5, 3, 8]);
  });
});

const INDICATORS = [
  { hasMetricDataCount: false, hasMetricData: [], noMetricDataCount: true },
  {
    hasMetricDataCount: true,
    hasMetricData: [{ metric_id: 11 }, { metric_id: 12 }],
    noMetricDataCount: false
  },
  { hasMetricDataCount: true, hasMetricData: [{ metric_id: 20 }], noMetricDataCount: false }
];

// Disaggregate-only metrics have data (so they reach hasMetricData and render cards) but
// no map shard, so every path into effectiveMetric must skip them or the shard fetch 404s
// — the A12 failure mode (dev-plan §11.4).
const DISAGG_ONLY_INDICATORS = [
  {
    hasMetricDataCount: true,
    hasMetricData: [{ metric_id: 190, disagg_only: true, metric_full_name: "Composition" }],
    noMetricDataCount: false
  },
  {
    hasMetricDataCount: true,
    hasMetricData: [{ metric_id: 12, metric_full_name: "Enrollment" }],
    noMetricDataCount: false
  }
];

describe("getInitialMetric", () => {
  it("returns the first metric with data", () => {
    expect(getInitialMetric(INDICATORS)).toBe(11);
  });

  it("returns null when nothing has data or the list is missing", () => {
    expect(getInitialMetric([{ hasMetricDataCount: false, hasMetricData: [] }])).toBeNull();
    expect(getInitialMetric(undefined)).toBeNull();
  });

  it("skips a disaggregate-only metric and falls through to a mappable one", () => {
    // EQ 10's indicator 87 holds only m190, so without this the auto-selected map metric
    // would be unmappable
    expect(getInitialMetric(DISAGG_ONLY_INDICATORS)).toBe(12);
  });

  it("returns null when every metric with data is disaggregate-only", () => {
    expect(getInitialMetric([DISAGG_ONLY_INDICATORS[0]])).toBeNull();
  });
});

describe("metricDropdownOptions", () => {
  it("lists mappable metrics only — both dropdowns select the map layer", () => {
    expect(metricDropdownOptions(DISAGG_ONLY_INDICATORS)).toEqual([
      { value: 12, label: "Enrollment" }
    ]);
  });

  it("returns an empty list when there are no indicators", () => {
    expect(metricDropdownOptions(undefined)).toEqual([]);
  });

  it("emits one option per metric even when two indicators list it", () => {
    // m231 sits under indicators 49 and 92; an invalid ?eqid= falls selectedIndicators back
    // to every indicator, which put the same metric in the dropdown twice
    const shared = { metric_id: 231, metric_full_name: "Median earnings" };
    expect(
      metricDropdownOptions([
        { hasMetricData: [shared, { metric_id: 12, metric_full_name: "Enrollment" }] },
        { hasMetricData: [shared] }
      ])
    ).toEqual([
      { value: 231, label: "Median earnings" },
      { value: 12, label: "Enrollment" }
    ]);
  });
});

describe("isValidMetricSelection", () => {
  it("accepts metrics present in some indicator's hasMetricData (number or string)", () => {
    expect(isValidMetricSelection(12, INDICATORS)).toBe(true);
    expect(isValidMetricSelection("20", INDICATORS)).toBe(true);
  });

  it("rejects a disaggregate-only metric — it has no map shard to select", () => {
    expect(isValidMetricSelection(190, DISAGG_ONLY_INDICATORS)).toBe(false);
  });

  it("rejects missing metrics and empty selections", () => {
    expect(isValidMetricSelection(99, INDICATORS)).toBe(false);
    expect(isValidMetricSelection(null, INDICATORS)).toBe(false);
    expect(isValidMetricSelection(undefined, INDICATORS)).toBe(false);
    expect(isValidMetricSelection(11, undefined)).toBe(false);
  });
});

// metricMetadataList is populated whether or not geography data has loaded, which is what
// lets isMetricAvailableAtLevel gate the map fetch before geoid1Data lands
const METADATA_INDICATORS = [
  {
    metricMetadataList: [
      { metric_id: 11, in_tool: true, geo_counties: true, geo_tracts: false },
      { metric_id: 12, in_tool: false, geo_counties: true, geo_tracts: true }
    ]
  },
  { metricMetadataList: [{ metric_id: 20, in_tool: true, geo_counties: false, geo_tracts: true }] },
  {
    metricMetadataList: [
      { metric_id: 190, in_tool: true, geo_counties: true, geo_tracts: true, disagg_only: true }
    ]
  }
];

describe("isMetricAvailableAtLevel", () => {
  it("accepts an in_tool metric published at the level, without consulting geography data", () => {
    expect(isMetricAvailableAtLevel(11, METADATA_INDICATORS, "counties")).toBe(true);
    expect(isMetricAvailableAtLevel("20", METADATA_INDICATORS, "tracts")).toBe(true);
  });

  it("rejects a disaggregate-only metric even where its level flags are true", () => {
    // this is the deep-link path (?metric=190) that fires before geoid1Data lands, so it
    // is the one gate that can't rely on data presence
    expect(isMetricAvailableAtLevel(190, METADATA_INDICATORS, "counties")).toBe(false);
  });

  it("rejects metrics not published at the level", () => {
    expect(isMetricAvailableAtLevel(11, METADATA_INDICATORS, "tracts")).toBe(false);
    expect(isMetricAvailableAtLevel(20, METADATA_INDICATORS, "counties")).toBe(false);
  });

  it("rejects metrics that aren't in_tool, absent metrics, and empty selections", () => {
    expect(isMetricAvailableAtLevel(12, METADATA_INDICATORS, "counties")).toBe(false);
    expect(isMetricAvailableAtLevel(99, METADATA_INDICATORS, "counties")).toBe(false);
    expect(isMetricAvailableAtLevel(null, METADATA_INDICATORS, "counties")).toBe(false);
    expect(isMetricAvailableAtLevel(11, undefined, "counties")).toBe(false);
  });
});

describe("geoidMatchesLevel", () => {
  it("matches a geoid to the level with its fips width", () => {
    expect(geoidMatchesLevel("08", "states")).toBe(true);
    expect(geoidMatchesLevel("08031", "counties")).toBe(true);
    expect(geoidMatchesLevel("0803150", "school_districts")).toBe(true);
    expect(geoidMatchesLevel("08031004501", "tracts")).toBe(true);
  });

  it("rejects a geoid carried over from another level, and empty values", () => {
    expect(geoidMatchesLevel("08031", "tracts")).toBe(false);
    expect(geoidMatchesLevel("08", "counties")).toBe(false);
    expect(geoidMatchesLevel("", "states")).toBe(false);
    expect(geoidMatchesLevel(null, "states")).toBe(false);
    expect(geoidMatchesLevel(false, "states")).toBe(false);
    expect(geoidMatchesLevel("08", "not_a_level")).toBe(false);
  });
});
