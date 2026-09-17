// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

// @ts-nocheck — vitest-verified; skip strict-null noise on DOM queries
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { mount, unmount, flushSync } from "svelte";
import NoDataBuckets from "./NoDataBuckets.svelte";
import pageContent from "$data/archie-ml/page-tool.aml";

const METRICS = [
  { metric_id: 1, metric_full_name: "Metric one", geo_states: true, in_tool: true },
  { metric_id: 2, metric_full_name: "Metric two", geo_states: true, in_tool: true },
  { metric_id: 3, metric_full_name: "Metric three", geo_states: true, in_tool: true }
];

// 1 → found (bucket 1), 2 → not_found (bucket 2), 3 → uncovered (defaults to not_found)
const CATEGORIES = {
  1: { "01": "found" },
  2: { "01": "not_found" }
};

const makeTool = (overrides = {}) => ({
  level: "counties",
  geoid1: "01001",
  geoid1Data: { s_id: "01", name: "Autauga County, Alabama" },
  // the states.json lookup, which supplies {{state}} in the bucket labels and copy.
  // `data` is absent here, so no bucket counts as state-available by default
  states: { "01": { name: "Alabama" } },
  selectedEq: { shorthand: "College Enrollment" },
  selectedIndicators: [
    { indicator_number: "10", noMetricData: [METRICS[0], METRICS[1]] },
    { indicator_number: "11", noMetricData: [METRICS[2]] }
  ],
  selectedMetricCounts: { hasMetricData: 5, noMetricData: 3 },
  selectedIndicatorCounts: { hasMetricData: 2, noMetricData: 2 },
  ...overrides
});

let mounted = [];
const render = (tool, props = {}) => {
  const component = mount(NoDataBuckets, {
    target: document.body,
    props: { categories: CATEGORIES, ...props },
    context: new Map([["tool", tool]])
  });
  mounted.push(component);
  flushSync();
  return component;
};

afterEach(() => {
  mounted.forEach((component) => unmount(component));
  mounted = [];
  document.body.innerHTML = "";
});

const bucketLabels = () => [...document.querySelectorAll(".bucket h4")].map((h) => h.textContent);
const bucketCopy = () => [...document.querySelectorAll(".bucket-copy")].map((p) => p.textContent);
const listItems = (root = document) => [...root.querySelectorAll("li")].map((li) => li.textContent);

/** the aml wording a bucket renders at each level, with {{state}} resolved */
const expected = (i, field, level = "substate") => {
  const bucket = pageContent.noDataBuckets[i];
  const raw = (level === "substate" && bucket[`${field}Substate`]) || bucket[field];
  return raw.replace(/<[^>]+>/g, "").replaceAll("{{state}}", "Alabama");
};

describe("NoDataBuckets", () => {
  it("buckets a sub-state geography's metrics by the enclosing state's codes", () => {
    render(makeTool());
    expect(document.querySelector(".heading-group .count").textContent).toBe("3");
    expect(document.querySelector(".heading").textContent).toContain("College Enrollment");
    expect(bucketLabels()).toEqual([expected(0, "label"), expected(1, "label")]);
    const buckets = document.querySelectorAll(".bucket");
    expect(listItems(buckets[0])).toEqual(["Metric one"]); // found
    // explicit not_found + uncovered default land together
    expect(listItems(buckets[1])).toEqual(["Metric two", "Metric three"]);
  });

  it("uses geoid1 directly at the states level", () => {
    render(makeTool({ level: "states", geoid1: "01", geoid1Data: { name: "Alabama" } }));
    expect(bucketLabels().length).toBe(pageContent.noDataBuckets.length);
  });

  it("names the selected geography and the enclosing state in the bucket copy", () => {
    render(makeTool());
    expect(bucketCopy()[0]).toContain("Autauga County, Alabama");
    // both sub-state buckets speak about the selected geography, not the enclosing state
    expect(bucketCopy().at(-1)).toContain("not available in Autauga County, Alabama");
    // the descriptions carry links, so they render as HTML
    expect(document.querySelector(".bucket-copy").querySelector("a")).not.toBeNull();
  });

  it("falls back to a generic noun when states.json has not landed", () => {
    render(makeTool({ states: undefined }));
    // {{state}} survives only in the first bucket's heading — the sub-state copy names
    // the selected geography instead
    expect(bucketLabels()[0]).toContain("this state");
    expect(bucketLabels()[0]).not.toContain("{{state}}");
  });

  it("falls back to a flat uncategorized list in the national view", () => {
    render(makeTool({ geoid1: "", geoid1Data: undefined, level: "states" }));
    expect(document.querySelector(".bucket")).toBeNull();
    expect(listItems(document.querySelector(".flat-list"))).toEqual([
      "Metric one",
      "Metric two",
      "Metric three"
    ]);
  });

  it("falls back to the flat list when the categories file is missing or empty", () => {
    render(makeTool(), { categories: {} });
    expect(document.querySelector(".bucket")).toBeNull();
    expect(document.querySelector(".flat-list")).not.toBeNull();
  });

  it("moves a metric the tool has for the state into the state-level bucket", () => {
    // metric two is not_found, but Alabama has it — it joins the found metric rather than
    // sitting under a claim the state view would disprove
    render(makeTool({ states: { "01": { name: "Alabama", data: { m2: { 2021: 1 } } } } }));
    const buckets = document.querySelectorAll(".bucket");
    expect(listItems(buckets[0])).toEqual(["Metric one", "Metric two"]);
    expect(listItems(buckets[1])).toEqual(["Metric three"]);
  });

  it("splits on the ECS codes and keeps the states-level wording at the states level", () => {
    render(
      makeTool({
        level: "states",
        geoid1: "01",
        geoid1Data: { name: "Alabama" },
        states: { "01": { name: "Alabama", data: { m2: { 2021: 1 } } } }
      })
    );
    // no enclosing state to promote against: metric two stays with the not_found group
    const buckets = document.querySelectorAll(".bucket");
    expect(listItems(buckets[0])).toEqual(["Metric one"]);
    expect(listItems(buckets[1])).toEqual(["Metric two", "Metric three"]);
    expect(bucketLabels()).toEqual([
      expected(0, "label", "states"),
      expected(1, "label", "states")
    ]);
    expect(bucketCopy()[0]).toBe(expected(0, "copy", "states"));
  });

  it("renders nothing when every metric has data", () => {
    render(
      makeTool({
        selectedIndicators: [{ indicator_number: "10", noMetricData: [] }],
        selectedMetricCounts: { hasMetricData: 5, noMetricData: 0 },
        selectedIndicatorCounts: { hasMetricData: 2, noMetricData: 0 }
      })
    );
    expect(document.querySelector(".no-data-section")).toBeNull();
  });
});
