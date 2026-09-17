// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

// @ts-nocheck — vitest-verified; skip strict-null noise on DOM queries
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, unmount, flushSync } from "svelte";

vi.mock("html2canvas", () => ({ default: vi.fn() }));
// logClickToGA reads analytics context that doesn't exist in jsdom
vi.mock("@urbaninstitute/dataviz-components", async (importOriginal) => ({
  ...(await importOriginal()),
  logClickToGA: vi.fn()
}));
import html2canvas from "html2canvas";
import MetricCard from "./MetricCard.svelte";
import altTemplates from "$data/archie-ml/chart-alt.aml";
import pageContent from "$data/archie-ml/page-tool.aml";
import { getCardGeographies, getChartAltText } from "$utils/getChartData";
import { getDisaggregateMeta } from "$utils/disaggregates";
import {
  NATIONAL,
  STATES,
  COUNTY_01001,
  METRIC_PERCENT,
  METRIC_CURRENCY_SINGLE_YEAR,
  METRIC_MISSING_RECENT,
  METRIC_DISAGG_EMPTY,
  METRIC_DISAGG_SINGLE_YEAR
} from "$utils/__fixtures__/chartData";

const COUNTY_GEOS = getCardGeographies(COUNTY_01001, undefined, STATES, NATIONAL, "counties");
// the race/ethnicity subgroup set the d1 fixtures render, read from the metadata rather
// than restated — adding or relabeling a subgroup is a data change, not a test failure
const RACE_FIELDS = getDisaggregateMeta(1).fields;

let mounted = [];
const render = (props = {}) => {
  const component = mount(MetricCard, {
    target: document.body,
    props: {
      metadata: METRIC_PERCENT,
      geographies: COUNTY_GEOS,
      ...props
    }
  });
  mounted.push(component);
  flushSync();
  return component;
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
  vi.useRealTimers();
  vi.restoreAllMocks();
  mounted.forEach((component) => unmount(component));
  mounted = [];
  document.body.innerHTML = "";
});

describe("MetricCard", () => {
  it("renders the bars variant with title, year subtitle, legend, and card aria-label", () => {
    render();
    expect(document.querySelector(".card-title").textContent).toContain(
      METRIC_PERCENT.metric_full_name
    );
    expect(document.querySelector(".card-subtitle").textContent).toBe("2021");
    expect(document.querySelector(".chart-legend, .legend")).not.toBeNull();
    expect(document.querySelectorAll(".bar-row").length).toBeGreaterThan(0);
    const viz = document.querySelector(".viz");
    expect(viz.getAttribute("aria-label")).toBe(
      getChartAltText(COUNTY_GEOS, METRIC_PERCENT, altTemplates, { variant: "bars" })
    );
  });

  it("renders the trend variant for timeframe=all with a multi-year metric (no year subtitle)", () => {
    render({ timeframe: "all" });
    expect(document.querySelector(".multi-line-chart")).not.toBeNull();
    expect(document.querySelector(".bar-row")).toBeNull();
    expect(document.querySelector(".card-subtitle")).toBeNull();
    // the trend template, not the bar one — compared against the content rather than a
    // hard-coded opening phrase, which would only be pinning chart-alt.aml's wording
    expect(document.querySelector(".viz").getAttribute("aria-label")).toBe(
      getChartAltText(COUNTY_GEOS, METRIC_PERCENT, altTemplates, { variant: "trend" })
    );
  });

  it("renders disaggregated bars with year subtitle, legend, and card aria-label", () => {
    render({ disagg: "d1" });
    const disagg = document.querySelector(".disaggregated-bars");
    expect(disagg).not.toBeNull();
    // every race/ethnicity subgroup, each a row-set of the card's geographies
    expect(disagg.querySelectorAll(".subgroup")).toHaveLength(RACE_FIELDS.length);
    expect(document.querySelector(".card-subtitle").textContent).toBe("2021");
    expect(document.querySelector(".legend-container, .chart-legend, .legend")).not.toBeNull();
    const viz = document.querySelector(".viz");
    expect(viz.getAttribute("aria-label")).toBe(
      getChartAltText(COUNTY_GEOS, METRIC_PERCENT, altTemplates, { variant: "disaggBars" })
    );
  });

  it("renders disaggregated trend facets for timeframe=all (no year subtitle)", () => {
    render({ disagg: "d1", timeframe: "all" });
    const disagg = document.querySelector(".disaggregated-trends");
    expect(disagg).not.toBeNull();
    expect(disagg.querySelectorAll(".multi-line-chart").length).toBeGreaterThan(0);
    expect(document.querySelector(".card-subtitle")).toBeNull();
    expect(document.querySelector(".viz").getAttribute("aria-label")).toBe(
      getChartAltText(COUNTY_GEOS, METRIC_PERCENT, altTemplates, { variant: "disaggTrends" })
    );
  });

  it("shows the no-data message when the metric doesn't offer the selected disaggregate", () => {
    render({ metadata: METRIC_MISSING_RECENT, disagg: "d1" });
    const message = document.querySelector(".disagg-no-data");
    expect(message).not.toBeNull();
    // the sentence itself is editorial copy — assert the card shows what page-tool.aml says
    expect(message.textContent.trim()).toBe(pageContent.filters.disaggNoData);
    // never falls back to the base chart, and drops the chart chrome
    expect(document.querySelector(".bar-row")).toBeNull();
    expect(document.querySelector(".card-subtitle")).toBeNull();
    expect(document.querySelector(".chart-legend")).toBeNull();
  });

  it("shows the no-data message when the metric claims the disaggregate but has no subgroup data (A4)", () => {
    render({ metadata: METRIC_DISAGG_EMPTY, disagg: "d1" });
    expect(document.querySelector(".disagg-no-data")).not.toBeNull();
    expect(document.querySelector(".bar-row")).toBeNull();
    render({ metadata: METRIC_DISAGG_EMPTY, disagg: "d1", timeframe: "all" });
    expect(document.querySelectorAll(".disagg-no-data")).toHaveLength(2);
    expect(document.querySelector(".multi-line-chart")).toBeNull();
  });

  it("renders single-year disaggregates as circles-only trend facets (A6)", () => {
    render({ metadata: METRIC_DISAGG_SINGLE_YEAR, disagg: "d1", timeframe: "all" });
    const disagg = document.querySelector(".disaggregated-trends");
    expect(disagg).not.toBeNull();
    expect(document.querySelector(".disaggregated-bars")).toBeNull();
    // every series in a data facet renders its point as a circle, references included
    const facet = disagg.querySelector(".multi-line-chart");
    expect(facet.querySelectorAll(".line circle").length).toBeGreaterThanOrEqual(3);
    // one point draws no path segments
    const paths = [...facet.querySelectorAll(".path-line")].map((p) => p.getAttribute("d"));
    expect(paths.every((d) => !d.includes("L"))).toBe(true);
  });

  it("renders a single-year base metric as circles-only on the trend chart", () => {
    render({ metadata: METRIC_CURRENCY_SINGLE_YEAR, timeframe: "all" });
    const chart = document.querySelector(".multi-line-chart");
    expect(chart).not.toBeNull();
    expect(document.querySelector(".bar-row")).toBeNull();
    // primary + primaryState + national all render their single point as a circle
    expect(chart.querySelectorAll(".line circle")).toHaveLength(3);
    const paths = [...chart.querySelectorAll(".path-line")].map((p) => p.getAttribute("d"));
    expect(paths.every((d) => !d.includes("L"))).toBe(true);
  });

  it("shows the selection bar and forwards clicks when selectable", () => {
    const onclick = vi.fn();
    render({ selectable: true, selected: true, onclick });
    expect(document.querySelector(".content.selected")).not.toBeNull();
    const layer = document.querySelector(".card-base-interaction-layer");
    expect(layer.getAttribute("aria-pressed")).toBe("true");
    layer.click(); // keyboard/AT path (button is pointer-events: none for mice)
    expect(onclick).toHaveBeenCalledWith(METRIC_PERCENT.metric_id);
  });

  it("selects on container clicks (charts included) but not on interactive chrome", () => {
    const onclick = vi.fn();
    render({ selectable: true, onclick });
    // a click anywhere in the body — e.g. bubbling up from a chart hover layer
    document.querySelector(".viz").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onclick).toHaveBeenCalledTimes(1);
    // the source ⓘ and download chrome must not select
    document
      .querySelector(".source-container button")
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    document
      .querySelector(".button-container button")
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onclick).toHaveBeenCalledTimes(1);
  });

  it("is not selected or clickable by default", () => {
    render();
    expect(document.querySelector(".content.selected")).toBeNull();
    expect(document.querySelector(".card-base-interaction-layer")).toBeNull();
  });

  it("renders the eyebrow when provided", () => {
    render({ eyebrowText: "College readiness" });
    expect(document.querySelector(".eyebrow-text").textContent).toBe("College readiness");
  });

  it("renderToBlob renders the export copy with download chrome and resolves to a PNG blob", async () => {
    vi.useFakeTimers();
    html2canvas.mockResolvedValue({
      toBlob: (cb) => cb(new Blob(["png"], { type: "image/png" }))
    });
    const card = render({ eyebrowText: "College readiness" });
    const pending = card.renderToBlob();
    await Promise.resolve();
    flushSync();

    const offscreen = document.querySelector(".download-image-container");
    expect(offscreen.querySelector(".download-logo")).not.toBeNull();
    expect(offscreen.querySelector(".bar-row")).not.toBeNull();
    // the export mirrors the on-screen card chrome: eyebrow + framed .content box
    expect(offscreen.querySelector(".eyebrow-text").textContent).toBe("College readiness");
    expect(offscreen.querySelector(".content .card-body")).not.toBeNull();
    // interactive chrome stays out of the export copy
    expect(offscreen.querySelector(".card-base-interaction-layer")).toBeNull();

    // jsdom's ResizeObserver stub never fires readySignal; the 15s safety race resolves
    await vi.advanceTimersByTimeAsync(15000);
    await expect(pending).resolves.toBeInstanceOf(Blob);
    expect(html2canvas).toHaveBeenCalledOnce();
  });

  it("renderToBlob export copy carries the disaggregated view when a disaggregate is active", async () => {
    vi.useFakeTimers();
    html2canvas.mockResolvedValue({
      toBlob: (cb) => cb(new Blob(["png"], { type: "image/png" }))
    });
    const card = render({ disagg: "d1" });
    const pending = card.renderToBlob();
    await Promise.resolve();
    flushSync();

    const offscreen = document.querySelector(".download-image-container");
    expect(offscreen.querySelector(".disaggregated-bars")).not.toBeNull();
    expect(offscreen.querySelectorAll(".subgroup")).toHaveLength(RACE_FIELDS.length);

    await vi.advanceTimersByTimeAsync(15000);
    await expect(pending).resolves.toBeInstanceOf(Blob);
  });
});
