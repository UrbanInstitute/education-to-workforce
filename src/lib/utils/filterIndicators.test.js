// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

// @ts-nocheck — vitest-verified; fixtures use the minimal indicator shape
import { describe, it, expect } from "vitest";
import filterIndicators from "./filterIndicators.js";

// selection order deliberately non-ascending (type) to prove the aml order drives the sort
const FILTER_BY = [
  {
    value: "sector",
    label: "Sector",
    selections: [
      { value: "prek", label: "Pre-K" },
      { value: "k12", label: "K-12" },
      { value: "postsec", label: "Postsecondary" },
      { value: "work", label: "Workforce" }
    ]
  },
  {
    value: "domain",
    label: "Domain",
    selections: [
      { value: "1", label: "Academic" },
      { value: "2", label: "Career" },
      { value: "3", label: "Well-being" }
    ]
  },
  {
    value: "type",
    label: "Type",
    selections: [
      { value: "3", label: "Adjacent System Conditions" },
      { value: "2", label: "E-W System Conditions" },
      { value: "1", label: "Outcomes and Milestones" }
    ]
  }
];

const INDICATORS = [
  { indicator_number: 1, sector_prek: true, sector_k12: false, domain: 1, type: 1 },
  { indicator_number: 2, sector_prek: true, sector_k12: true, domain: 2, type: 2 },
  { indicator_number: 3, sector_prek: false, sector_k12: false, sector_work: true, type: 3 } // no domain field
];

const numbers = (result) => result.map((ind) => ind.indicator_number);

describe("filterIndicators", () => {
  it("sector: keeps any-match indicators, most matching sectors first", () => {
    const result = filterIndicators(INDICATORS, "sector", ["prek", "k12"], FILTER_BY);
    expect(numbers(result)).toEqual([2, 1]);
  });

  it("sector: single pill narrows to exact members", () => {
    expect(numbers(filterIndicators(INDICATORS, "sector", ["work"], FILTER_BY))).toEqual([3]);
  });

  it("type: filters numerically and sorts by the aml selection order", () => {
    const result = filterIndicators(INDICATORS, "type", ["1", "2", "3"], FILTER_BY);
    // aml order is 3, 2, 1 — not ascending
    expect(numbers(result)).toEqual([3, 2, 1]);
  });

  it("domain: indicators without a domain field are excluded", () => {
    const result = filterIndicators(INDICATORS, "domain", ["1", "2", "3"], FILTER_BY);
    expect(numbers(result)).toEqual([1, 2]);
  });

  it("empty or undefined selection yields an empty list", () => {
    expect(filterIndicators(INDICATORS, "sector", [], FILTER_BY)).toEqual([]);
    expect(filterIndicators(INDICATORS, "type", undefined, FILTER_BY)).toEqual([]);
  });

  it("unknown filter returns the input unchanged", () => {
    expect(filterIndicators(INDICATORS, "nope", ["prek"], FILTER_BY)).toEqual(INDICATORS);
  });
});
