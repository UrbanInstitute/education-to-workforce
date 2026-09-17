// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

import { describe, it, expect } from "vitest";
import { formatFun, formatFunAxis, formatFunLegend } from "./formatFun.js";

describe("formatFun", () => {
  it("formats by metric type", () => {
    expect(formatFun(0.4567, "percent")).toBe("45.7%");
    expect(formatFun(52340, "currency")).toBe("$52,340");
    expect(formatFun(1234, "integer")).toBe("1,234");
  });

  it("returns N/A for null and undefined", () => {
    expect(formatFun(null, "percent")).toBe("N/A");
    expect(formatFun(undefined, "percent")).toBe("N/A");
  });

  it("falls back to numeric for an unknown or missing type", () => {
    expect(formatFun(1234.56, undefined)).toBe("1,234.6");
    expect(formatFun(1234.56, "nonsense")).toBe("1,234.6");
  });
});

describe("formatFunAxis", () => {
  it("formats axis ticks by metric type", () => {
    expect(formatFunAxis(0.4567, "percent")).toBe("46%");
    expect(formatFunAxis(52340, "currency")).toBe("$52K");
  });

  it("uppercases the SI kilo suffix for currency thousands", () => {
    expect(formatFunAxis(24800, "currency")).toBe("$25K");
    expect(formatFunAxis(1500000, "currency")).toBe("$1.5M");
  });

  it("returns N/A for null and undefined", () => {
    expect(formatFunAxis(null, "percent")).toBe("N/A");
    expect(formatFunAxis(undefined, "percent")).toBe("N/A");
  });

  it("falls back to the axis numeric format, not the value format", () => {
    // metrics with no metric_type (m222) rendered axis ticks with a decimal place
    expect(formatFunAxis(1234.56, undefined)).toBe("1,235");
    expect(formatFunAxis(1234.56, "nonsense")).toBe("1,235");
  });
});

describe("formatFunLegend", () => {
  it("narrows the types whose value format overflowed the legend's tick spacing", () => {
    // "119.23%" / "22,899.0" / "$270,400" collided with the neighbouring tick
    expect(formatFunLegend(1.4896, "percent_hundredths")).toBe("149.0%");
    expect(formatFunLegend(22899.4, "numeric")).toBe("22,899");
    expect(formatFunLegend(270400, "currency")).toBe("$270K");
  });

  it("leaves the types that already fit on the value format", () => {
    // compacting these produced duplicate ticks on real shards
    expect(formatFunLegend(0.4567, "percent")).toBe(formatFun(0.4567, "percent"));
    expect(formatFunLegend(0.1234, "hundredths")).toBe(formatFun(0.1234, "hundredths"));
    expect(formatFunLegend(1234, "integer")).toBe(formatFun(1234, "integer"));
  });

  it("returns N/A for null and undefined", () => {
    expect(formatFunLegend(null, "currency")).toBe("N/A");
    expect(formatFunLegend(undefined, "currency")).toBe("N/A");
  });

  it("falls back to the numeric value format for an unknown or missing type", () => {
    expect(formatFunLegend(1234.56, undefined)).toBe("1,234.6");
    expect(formatFunLegend(1234.56, "nonsense")).toBe("1,234.6");
  });
});
