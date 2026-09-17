// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

// @ts-nocheck — vitest-verified; skip strict-null noise on DOM queries
// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { mount, unmount, flushSync } from "svelte";
import DisaggregatedTrends from "./DisaggregatedTrends.svelte";
import { getCardGeographies, getDisaggregatedData } from "$utils/getChartData";
import { getDisaggregateMeta } from "$utils/disaggregates";
import { NATIONAL, STATES, COUNTY_01001, METRIC_GAP } from "$utils/__fixtures__/chartData";

/** @type {ReturnType<typeof mount>[]} */
let mounted = [];
const render = (props) => {
  const component = mount(DisaggregatedTrends, { target: document.body, props });
  mounted.push(component);
  flushSync();
  return document.body;
};

// jsdom's layoutless 0×0 containers trip LayerCake's zero-size warnings on every mount;
// drop just those, letting anything else through
const realWarn = console.warn;
beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation((...args) => {
    if (typeof args[0] === "string" && args[0].startsWith("[LayerCake]")) return;
    realWarn(...args);
  });
});

afterEach(() => {
  mounted.forEach((component) => unmount(component));
  mounted = [];
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

const countyGeos = getCardGeographies(COUNTY_01001, undefined, STATES, NATIONAL, "counties");

// facet labels are display copy in disaggregates.json — look them up by field key
const RACE_FIELDS = getDisaggregateMeta(1).fields;
/** @param {string} value - a disaggregates.json field key, e.g. "d1_asian" */
const raceLabel = (value) => RACE_FIELDS.find((f) => f.value === value)?.label;

const props = (extra = {}) => {
  const { subgroups, domain } = getDisaggregatedData(countyGeos, METRIC_GAP, "d1", {
    timeframe: "all"
  });
  return { subgroups, domain, formatType: METRIC_GAP.metric_type, ...extra };
};

describe("DisaggregatedTrends", () => {
  it("renders a facet chart per data subgroup and an N/A box per empty one", () => {
    const body = render(props());
    const groups = [...body.querySelectorAll(".subgroup")];
    expect(groups).toHaveLength(RACE_FIELDS.length);
    expect(groups.every((g) => g.getAttribute("role") === "group")).toBe(true);
    // fixtures only carry white + black m83 subgroup values
    expect(body.querySelectorAll(".multi-line-chart")).toHaveLength(2);
    const empties = [...body.querySelectorAll(".facet-empty")];
    expect(empties).toHaveLength(RACE_FIELDS.length - 2);
    expect(empties.every((e) => e.textContent.trim() === "N/A")).toBe(true);
    // an empty subgroup gets the box, not a bare-axes chart
    const asian = groups.find((g) => g.getAttribute("aria-label") === raceLabel("d1_asian"));
    expect(asian.querySelector(".multi-line-chart")).toBeNull();
    expect(asian.querySelector(".facet-empty")).not.toBeNull();
  });

  it("shares the card y-domain across facets (identical axis ticks)", () => {
    const body = render(props());
    const tickTexts = [...body.querySelectorAll(".multi-line-chart")].map((chart) =>
      [...chart.querySelectorAll(".y-axis .tick text")].map((t) => t.textContent.trim()).join("|")
    );
    expect(tickTexts).toHaveLength(2);
    expect(tickTexts[0]).not.toBe("");
    expect(tickTexts[1]).toBe(tickTexts[0]);
  });

  it("passes isDownload through to every facet chart", () => {
    const body = render(props({ isDownload: true }));
    const charts = [...body.querySelectorAll(".multi-line-chart")];
    expect(charts.every((chart) => chart.querySelector("svg defs style") !== null)).toBe(true);
  });
});
