// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

// @ts-nocheck — vitest-verified; skip strict-null noise on DOM queries
// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { mount, unmount, flushSync } from "svelte";
import BarGroup from "./BarGroup.svelte";
import { getCardGeographies, getBarGroupData } from "$utils/getChartData";
import {
  NATIONAL,
  STATES,
  COUNTY_01001,
  COUNTY_02013,
  METRIC_PERCENT
} from "$utils/__fixtures__/chartData";

/** @type {ReturnType<typeof mount>[]} */
let mounted = [];
const render = (props) => {
  const component = mount(BarGroup, { target: document.body, props });
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

const comparisonProps = () => {
  const geos = getCardGeographies(COUNTY_01001, COUNTY_02013, STATES, NATIONAL, "counties");
  const { bars, domain, diverging } = getBarGroupData(geos, METRIC_PERCENT);
  return { bars, domain, diverging, formatType: METRIC_PERCENT.metric_type };
};

describe("BarGroup", () => {
  it("renders one row per bar with a full contextual aria-label", () => {
    const body = render(comparisonProps());
    const rows = [...body.querySelectorAll(".bar-row")];
    expect(rows).toHaveLength(2);
    expect(rows[0].getAttribute("aria-label")).toBe(
      "Autauga County, AL: 44.0%. Alabama: 50.0%. National: 55.0%."
    );
    expect(rows[1].getAttribute("aria-label")).toContain("Aleutians East, AK");
  });

  it("shares one scale across rows (equal values align)", () => {
    const body = render({
      bars: [
        { role: "primary", name: "A", value: 0.5, color: "#1696D2", refs: [] },
        { role: "comparison", name: "B", value: 0.5, color: "#FDBF11", refs: [] }
      ],
      domain: [0, 1],
      formatType: "percent"
    });
    const widths = [...body.querySelectorAll(".fill")].map((el) => el.style.width);
    expect(widths).toEqual(["50%", "50%"]);
  });

  it("widens a degenerate all-null domain so the scale stays anchored at 0", () => {
    const body = render({
      bars: [{ role: "primary", name: "A", value: null, color: "#1696D2", refs: [] }],
      domain: [0, 0],
      formatType: "percent"
    });
    expect(body.querySelector(".value-label").style.left).toBe("calc(0% + 6px)");
  });
});

// jsdom has no layout, so the hover layer's getBoundingClientRect reads 0×0; stub a
// 200px track (1% = 2px) so pointer math resolves. The percentRange xScale itself is
// layout-independent, so mark positions are already correct without layout.
describe("BarGroup hover layer", () => {
  const TRACK = { left: 0, right: 200, width: 200, top: 0, bottom: 20, height: 20 };

  /** @param {Element} layer @param {number} clientX */
  const moveTo = (layer, clientX) => {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(TRACK);
    layer.dispatchEvent(new MouseEvent("mousemove", { clientX, bubbles: true }));
    flushSync();
  };

  // fixture domain is data-driven [0, 0.66] (max tick 55% × 1.2), so on the 200px track:
  // bar 44% → 133px, Alabama tick 50% → 152px, National tick 55% → 167px
  it("shows a tick-only tooltip when a ref tick is the nearest mark", () => {
    const body = render(comparisonProps());
    const layer = body.querySelector(".hover-layer");
    moveTo(layer, 152);
    const tooltip = document.querySelector(".tooltip-values");
    expect(tooltip).not.toBeNull();
    expect(tooltip.textContent).toContain("Alabama:");
    expect(tooltip.textContent).toContain("50.0%");
    expect(tooltip.textContent).not.toContain("Autauga County, AL");
    expect(tooltip.textContent).not.toContain("National:");
  });

  it("is a noop when the bar endpoint is the nearest mark", () => {
    const body = render(comparisonProps());
    const layer = body.querySelector(".hover-layer");
    moveTo(layer, 133);
    expect(document.querySelector(".tooltip-values")).toBeNull();
  });

  it("clears the tooltip on mouseleave", () => {
    const body = render(comparisonProps());
    const layer = body.querySelector(".hover-layer");
    moveTo(layer, 152);
    expect(document.querySelector(".tooltip-values")).not.toBeNull();
    layer.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    flushSync();
    expect(document.querySelector(".tooltip-values")).toBeNull();
  });

  it("lists every ref sharing the winning tick's position", () => {
    const body = render({
      bars: [
        {
          role: "primary",
          name: "A",
          value: 0.2,
          color: "#1696D2",
          refs: [
            {
              role: "primaryState",
              label: "Alabama",
              value: 0.5,
              variant: "solid",
              color: "#0A4C6A"
            },
            { role: "national", label: "National", value: 0.5, variant: "dotted", color: "#696969" }
          ]
        }
      ],
      domain: [0, 1],
      formatType: "percent"
    });
    const layer = body.querySelector(".hover-layer");
    moveTo(layer, 99);
    const tooltip = document.querySelector(".tooltip-values");
    expect(tooltip.textContent).toContain("Alabama:");
    expect(tooltip.textContent).toContain("National:");
  });

  it("dims the row's fill, value label, and non-active ticks while a tick is active", () => {
    const body = render(comparisonProps());
    const row = body.querySelector(".bar-row");
    const layer = row.querySelector(".hover-layer");
    // near the Alabama tick (50% = 152px); National (55% = 167px) stays inactive
    moveTo(layer, 152);
    expect(row.querySelector(".fill").classList.contains("dimmed")).toBe(true);
    expect(row.querySelector(".value-label").classList.contains("dimmed")).toBe(true);
    const ticks = [...row.querySelectorAll(".tick")];
    expect(ticks.map((t) => t.classList.contains("dimmed"))).toEqual([false, true]);
    // the other row is untouched
    const otherRow = [...body.querySelectorAll(".bar-row")][1];
    expect(otherRow.querySelector(".fill").classList.contains("dimmed")).toBe(false);

    layer.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    flushSync();
    expect(row.querySelector(".fill").classList.contains("dimmed")).toBe(false);
    expect(ticks.some((t) => t.classList.contains("dimmed"))).toBe(false);
  });

  it("ignores mousemove on an unmeasured (0-width) track", () => {
    const body = render(comparisonProps());
    const layer = body.querySelector(".hover-layer");
    // no rect stub: jsdom reports 0×0
    layer.dispatchEvent(new MouseEvent("mousemove", { clientX: 99, bubbles: true }));
    flushSync();
    expect(document.querySelector(".tooltip-values")).toBeNull();
  });
});

// per-row rendering detail, migrated from the pre-LayerCake BarTrack.svelte tests: the
// marks (BarFill, RefTick, ZeroLine, BarValueLabel) are exercised through BarGroup since
// they need a LayerCake context; the pure placement math is covered by barGeometry.test.js
describe("BarGroup row marks", () => {
  const REFS = [
    { role: "primaryState", label: "Alabama", value: 0.5, variant: "solid", color: "#0A4C6A" },
    { role: "national", label: "National", value: 0.55, variant: "dotted", color: "#696969" }
  ];

  const singleBar = (bar, props = {}) => ({
    bars: [{ role: "primary", refs: [], ...bar }],
    domain: [0, 1],
    ...props
  });

  it("sizes the fill from the shared scale and labels the bar end", () => {
    const body = render(
      singleBar(
        { name: "Autauga County, AL", value: 0.44, color: "#1696D2", refs: REFS },
        { formatType: "percent" }
      )
    );
    const fill = body.querySelector(".fill");
    expect(fill.style.left).toBe("0%");
    expect(fill.style.width).toBe("44%");
    expect(fill.style.backgroundColor).toBe("rgb(22, 150, 210)");
    const label = body.querySelector(".value-label");
    expect(label.textContent.trim()).toBe("44.0%");
    expect(label.style.left).toBe("calc(44% + 6px)");
    expect(body.querySelector(".name").textContent).toBe("Autauga County, AL");
  });

  it("positions one tick per ref, solid as a colored bar and dotted as an svg dash line", () => {
    const body = render(singleBar({ name: "x", value: 0.44, color: "#1696D2", refs: REFS }));
    const ticks = [...body.querySelectorAll(".tick")];
    expect(ticks.map((t) => parseFloat(t.style.left))).toEqual([50, expect.closeTo(55, 5)]);
    // solid tick: colored via background, no dash svg
    expect(ticks[0].style.backgroundColor).toBe("rgb(10, 76, 106)");
    expect(ticks[0].querySelector("svg.tick-line")).toBeNull();
    // dotted tick: no background, drawn as an inline svg <line> with per-tick stroke
    expect(ticks[1].style.backgroundColor).toBe("");
    const dash = ticks[1].querySelector("svg.tick-line line");
    expect(dash).not.toBeNull();
    expect(dash.getAttribute("stroke")).toBe("#696969");
    expect(dash.getAttribute("stroke-dasharray")).toBe("4 9");
    expect(dash.getAttribute("stroke-linecap")).toBe("round");
  });

  it("skips ticks for refs without values", () => {
    const body = render(
      singleBar({
        name: "x",
        value: 0.44,
        color: "#1696D2",
        refs: [{ ...REFS[0], value: null }, REFS[1]]
      })
    );
    expect(body.querySelectorAll(".tick")).toHaveLength(1);
  });

  it("renders N/A with no fill for null values", () => {
    const body = render(singleBar({ name: "x", value: null, color: "#1696D2" }));
    expect(body.querySelector(".fill")).toBeNull();
    expect(body.querySelector(".value-label").textContent.trim()).toBe("N/A");
  });

  it("hides the name label when showLabels is false", () => {
    const body = render(
      singleBar({ name: "x", value: 0.4, color: "#1696D2" }, { showLabels: false })
    );
    expect(body.querySelector(".name")).toBeNull();
  });

  it("draws diverging negative bars leftward with the label at the outer end", () => {
    const domain = [-0.06, 0.07];
    const body = render(
      singleBar(
        { name: "Black", value: -0.06, color: "#1696D2" },
        { domain, formatType: "percent_hundredths", diverging: true }
      )
    );
    // scale(0) as a percent of the [-0.06, 0.07] domain
    const zeroX = (100 * (0 - domain[0])) / (domain[1] - domain[0]);
    const zeroLine = body.querySelector(".zero-line");
    expect(parseFloat(zeroLine.style.left)).toBeCloseTo(zeroX, 5);
    const fill = body.querySelector(".fill");
    expect(fill.style.left).toBe("0%");
    expect(parseFloat(fill.style.width)).toBeCloseTo(zeroX, 5);
    const label = body.querySelector(".value-label");
    expect(label.classList.contains("negative")).toBe(true);
    expect(label.style.left).toBe("0%");
    // d3-format renders negatives with a Unicode minus (U+2212)
    expect(label.textContent.trim()).toBe("−6.00%");
  });
});
