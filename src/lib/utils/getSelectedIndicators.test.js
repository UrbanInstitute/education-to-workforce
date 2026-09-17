// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

// @ts-nocheck — vitest-verified; skip strict-null noise on fixture lookups
import { describe, it, expect } from "vitest";
import getSelectedIndicators from "./getSelectedIndicators.js";

const metrics = [
  { metric_id: 11, in_tool: true, geo_counties: true },
  { metric_id: 12, in_tool: true, geo_counties: true },
  { metric_id: 20, in_tool: true, geo_counties: false },
  { metric_id: 30, in_tool: false, geo_counties: true },
  // disaggregate-only: subgroup columns but no base m190 accessor (dev-plan §11.4)
  { metric_id: 190, in_tool: true, geo_counties: true, disagg_only: true, disag_available: "1" },
  // claims disaggregate-only but the geography has no subgroup columns either
  { metric_id: 191, in_tool: true, geo_counties: true, disagg_only: true, disag_available: "1" }
];

/** fresh metadata per test — the point of several of these is that it isn't mutated */
const makePageData = () => ({
  slug: "counties",
  metadata: {
    indicators: [
      { indicator_number: 1, metrics: ["11", "12"] },
      { indicator_number: 2, metrics: ["20", "30"] },
      { indicator_number: 3, metrics: "11" }, // single-metric indicators carry a bare string
      { indicator_number: 4, metrics: ["190", "191"] }
    ],
    metrics
  }
});

// m11 and m20 have values; m12 does not. m190 has only subgroup columns (no base
// accessor), m191 has nothing at all.
const GEOID_DATA = {
  data: {
    m11: { 2022: 0.5 },
    m20: { 2022: 0.1 },
    m190_d1_white: { 2022: 0.6 },
    m190_d1_black: { 2022: 0.2 }
  }
};

describe("getSelectedIndicators", () => {
  it("splits metrics into has/no data using level and in_tool flags", () => {
    const [ind1, ind2] = getSelectedIndicators(undefined, makePageData(), GEOID_DATA);

    expect(ind1.hasMetricData.map((m) => m.metric_id)).toEqual([11]);
    expect(ind1.noMetricData.map((m) => m.metric_id)).toEqual([12]);
    expect(ind1.hasMetricDataCount).toBe(true);
    expect(ind1.noMetricDataCount).toBe(true);

    // m20 has values but isn't published at counties; m30 isn't in_tool
    expect(ind2.hasMetricData).toEqual([]);
    expect(ind2.noMetricData.map((m) => m.metric_id)).toEqual([20, 30]);
    expect(ind2.hasMetricDataCount).toBe(false);
  });

  it("counts a disaggregate-only metric as having data via its subgroup keys", () => {
    // the base-accessor check alone would strand m190 in the no-data bucket forever, so
    // its card could never render (dev-plan §11.4)
    const ind4 = getSelectedIndicators(undefined, makePageData(), GEOID_DATA)[3];
    expect(ind4.hasMetricData.map((m) => m.metric_id)).toEqual([190]);
    // m191 claims the same shape but the geography publishes nothing for it
    expect(ind4.noMetricData.map((m) => m.metric_id)).toEqual([191]);
  });

  it("normalizes a single-metric indicator's string `metrics` without mutating it", () => {
    const pageData = makePageData();
    const result = getSelectedIndicators(undefined, pageData, GEOID_DATA);

    expect(result[2].metricMetadataList.map((m) => m.metric_id)).toEqual([11]);
    expect(pageData.metadata.indicators[2].metrics).toBe("11");
  });

  it("treats absent geography data as unknown, not as absent data", () => {
    const [ind1] = getSelectedIndicators(undefined, makePageData(), undefined);

    // both lists empty so the grids keep their skeleton state
    expect(ind1.hasMetricData).toEqual([]);
    expect(ind1.noMetricData).toEqual([]);
    expect(ind1.hasMetricDataCount).toBe(false);
    expect(ind1.noMetricDataCount).toBe(false);
    // metadata is still resolved — this is what gates the map fetch before geoid1Data lands
    expect(ind1.metricMetadataList.map((m) => m.metric_id)).toEqual([11, 12]);
  });

  it("does not carry counts across calls, and does not mutate shared metadata", () => {
    const pageData = makePageData();

    const withData = getSelectedIndicators(undefined, pageData, GEOID_DATA);
    expect(withData[0].hasMetricDataCount).toBe(true);

    // a geography change that clears geoid1Data must not leave a stale `true` count
    // sitting next to an empty hasMetricData list
    const withoutData = getSelectedIndicators(undefined, pageData, undefined);
    expect(withoutData[0].hasMetricDataCount).toBe(false);
    expect(withoutData[0].hasMetricData).toEqual([]);

    // the first result is untouched by the second call
    expect(withData[0].hasMetricDataCount).toBe(true);
    expect(withData[0].hasMetricData.map((m) => m.metric_id)).toEqual([11]);

    // and the source metadata was never annotated
    expect(pageData.metadata.indicators[0]).not.toHaveProperty("hasMetricData");
    expect(pageData.metadata.indicators[0]).not.toHaveProperty("hasMetricDataCount");
  });

  it("scopes to the EQ's indicator_list, preserving its ordering", () => {
    const eq = { indicator_list: ["2", "1"] };
    const result = getSelectedIndicators(eq, makePageData(), GEOID_DATA);
    expect(result.map((ind) => ind.indicator_number)).toEqual([2, 1]);
  });

  it("drops an EQ indicator that is missing from the metadata rather than throwing", () => {
    const eq = { indicator_list: ["1", "99"] };
    const result = getSelectedIndicators(eq, makePageData(), GEOID_DATA);
    expect(result.map((ind) => ind.indicator_number)).toEqual([1]);
  });
});
