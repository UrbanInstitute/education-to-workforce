// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

import { describe, it, expect } from "vitest";
import {
  parseDisagAvailable,
  isDisaggOnly,
  getDisaggOnlyPrefix,
  hasMetricData
} from "$utils/disaggregates";

// Disaggregate-only metrics (dev-plan §11): m190 publishes m190_d1_* subgroup columns but
// no base m190 column, because the metric is inherently about how subgroups compare.

describe("parseDisagAvailable", () => {
  it("wraps the auto-unboxed single-prefix string", () => {
    // jsonlite writes a one-element list as a bare string
    expect(parseDisagAvailable("1")).toEqual(["1"]);
  });

  it("passes a multi-prefix array through", () => {
    expect(parseDisagAvailable(["1", "2", "3"])).toEqual(["1", "2", "3"]);
  });

  it("treats both 'no disaggregates' spellings as empty", () => {
    // metrics.json carries null for 152 metrics and the literal "FALSE" for 39
    expect(parseDisagAvailable("FALSE")).toEqual([]);
    expect(parseDisagAvailable(null)).toEqual([]);
    expect(parseDisagAvailable(undefined)).toEqual([]);
  });
});

describe("isDisaggOnly / getDisaggOnlyPrefix", () => {
  it("identifies a disaggregate-only metric and its prefix", () => {
    const metric = { metric_id: 190, disagg_only: true, disag_available: "1" };
    expect(isDisaggOnly(metric)).toBe(true);
    expect(getDisaggOnlyPrefix(metric)).toBe("d1");
  });

  it("returns no prefix for an ordinary metric that offers disaggregates", () => {
    // m1 has both a base column and race subgroups — the card renders the base chart
    // under "none", so there is nothing to substitute
    const metric = { metric_id: 1, disagg_only: false, disag_available: ["1"] };
    expect(isDisaggOnly(metric)).toBe(false);
    expect(getDisaggOnlyPrefix(metric)).toBeUndefined();
  });

  it("returns no prefix when the flag is set but no disaggregate is declared", () => {
    // the real m160: disaggregate-only in the data, never enabled in the workbook, so it
    // carries no disag_available claim. in_tool metrics are guarded in data-invariants.
    expect(getDisaggOnlyPrefix({ metric_id: 160, disagg_only: true })).toBeUndefined();
  });

  it("tolerates missing metadata", () => {
    expect(isDisaggOnly(undefined)).toBe(false);
    expect(getDisaggOnlyPrefix(undefined)).toBeUndefined();
  });
});

describe("hasMetricData", () => {
  const DISAGG_ONLY = { metric_id: 190, disagg_only: true, disag_available: "1" };
  const ORDINARY = { metric_id: 1 };

  it("finds a disaggregate-only metric through its subgroup keys", () => {
    // the whole point: the base accessor check would put m190 in the no-data bucket forever
    const data = { m190_d1_white: { 2020: 0.5 }, m190_d1_black: { 2020: 0.2 } };
    expect(hasMetricData(data, DISAGG_ONLY)).toBe(true);
  });

  it("reports no data when the geography has no subgroup keys either", () => {
    expect(hasMetricData({ m1: { 2020: 0.5 } }, DISAGG_ONLY)).toBe(false);
  });

  it("still requires the base accessor for an ordinary metric", () => {
    // subgroup keys alone must not promote an ordinary metric — its card renders the
    // base chart, which would be empty
    expect(hasMetricData({ m1_d1_white: { 2020: 0.5 } }, ORDINARY)).toBe(false);
    expect(hasMetricData({ m1: { 2020: 0.5 } }, ORDINARY)).toBe(true);
  });

  it("does not match a metric id that is a prefix of another", () => {
    // m19_* must never satisfy m190, nor m190_* satisfy m19
    expect(hasMetricData({ m19_d1_white: { 2020: 0.5 } }, DISAGG_ONLY)).toBe(false);
    expect(hasMetricData({ m190: { 2020: 0.5 } }, { metric_id: 19 })).toBe(false);
  });

  it("tolerates missing arguments", () => {
    expect(hasMetricData(undefined, DISAGG_ONLY)).toBe(false);
    expect(hasMetricData({}, undefined)).toBe(false);
  });
});
