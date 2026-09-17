// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

// @ts-nocheck — vitest-verified; skip strict-null noise on DOM queries
// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { mount, unmount, flushSync } from "svelte";
import DisaggregatedBars from "./DisaggregatedBars.svelte";
import { getCardGeographies, getDisaggregatedData } from "$utils/getChartData";
import { getDisaggregateMeta } from "$utils/disaggregates";
import {
  NATIONAL,
  STATES,
  COUNTY_01001,
  COUNTY_01003,
  METRIC_PERCENT,
  METRIC_GAP
} from "$utils/__fixtures__/chartData";

/** @type {ReturnType<typeof mount>[]} */
let mounted = [];
const render = (props) => {
  const component = mount(DisaggregatedBars, { target: document.body, props });
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

// row labels are display copy in disaggregates.json — look them up by field key so
// relabeling a subgroup is a data change rather than a test failure
const RACE_FIELDS = getDisaggregateMeta(1).fields;
/** @param {string} value - a disaggregates.json field key, e.g. "d1_white" */
const raceLabel = (value) => RACE_FIELDS.find((f) => f.value === value)?.label;

const props = (geos, metric) => {
  const { subgroups, domain, diverging } = getDisaggregatedData(geos, metric, "d1");
  return { subgroups, domain, diverging, formatType: metric.metric_type };
};

describe("DisaggregatedBars", () => {
  it("renders one labeled group per declared subgroup, without per-row geo names", () => {
    const body = render(props(countyGeos, METRIC_PERCENT));
    const groups = [...body.querySelectorAll(".subgroup")];
    expect(groups).toHaveLength(RACE_FIELDS.length);
    // one group per declared field, labeled and ordered by the metadata
    expect(groups.map((g) => g.getAttribute("aria-label"))).toEqual(
      RACE_FIELDS.map((f) => f.label)
    );
    expect(groups.every((g) => g.getAttribute("role") === "group")).toBe(true);
    expect(groups.map((g) => g.querySelector(".subgroup-label").textContent)).toEqual(
      groups.map((g) => g.getAttribute("aria-label"))
    );
    // geography names live in the card legend, not the rows
    expect(body.querySelector(".name")).toBeNull();
  });

  it("renders empty subgroups as N/A rows on the shared track", () => {
    const body = render(props(countyGeos, METRIC_PERCENT));
    const asian = [...body.querySelectorAll(".subgroup")].find(
      (g) => g.getAttribute("aria-label") === raceLabel("d1_asian")
    );
    expect(asian.querySelector(".fill")).toBeNull();
    expect(asian.querySelector(".value-label").textContent.trim()).toBe("N/A");
    // rows with data still fill normally
    const white = [...body.querySelectorAll(".subgroup")].find(
      (g) => g.getAttribute("aria-label") === raceLabel("d1_white")
    );
    expect(white.querySelector(".fill")).not.toBeNull();
  });

  it("shares one scale across subgroups (widths reflect the card-wide domain)", () => {
    const body = render(props(countyGeos, METRIC_PERCENT));
    const fillWidth = (label) =>
      parseFloat(
        [...body.querySelectorAll(".subgroup")]
          .find((g) => g.getAttribute("aria-label") === label)
          .querySelector(".fill").style.width
      );
    // shared data-driven percent domain [0, 0.696] (card max 0.58 × 1.2, under the 100% cap):
    // county m1_d1_white 0.48 → 0.48/0.696, m1_d1_black 0.36 → 0.36/0.696
    expect(fillWidth(raceLabel("d1_white"))).toBeCloseTo((0.48 / 0.696) * 100, 4);
    expect(fillWidth(raceLabel("d1_black"))).toBeCloseTo((0.36 / 0.696) * 100, 4);
  });

  it("renders a null bar inside a subgroup where only one geography has data", () => {
    const geos = getCardGeographies(COUNTY_01001, COUNTY_01003, STATES, NATIONAL, "counties");
    const body = render(props(geos, METRIC_PERCENT));
    const black = [...body.querySelectorAll(".subgroup")].find(
      (g) => g.getAttribute("aria-label") === raceLabel("d1_black")
    );
    const labels = [...black.querySelectorAll(".value-label")].map((l) => l.textContent.trim());
    // primary (Autauga) has a value; comparison (Baldwin) lacks m1_d1_black
    expect(labels).toEqual(["36.0%", "N/A"]);
  });

  it("aligns the diverging zero baseline at the same x on every row", () => {
    const body = render(props(countyGeos, METRIC_GAP));
    const zeroLines = [...body.querySelectorAll(".zero-line")];
    // every row in every subgroup (incl. N/A rows) carries the baseline
    expect(zeroLines.length).toBeGreaterThanOrEqual(RACE_FIELDS.length);
    const positions = new Set(zeroLines.map((z) => z.style.left));
    expect(positions.size).toBe(1);
  });
});
