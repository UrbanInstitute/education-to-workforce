// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

// @ts-nocheck — vitest-verified; skip strict-null noise on DOM queries
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { mount, unmount, flushSync } from "svelte";
import ChartLegend from "./ChartLegend.svelte";

/** @type {ReturnType<typeof mount>[]} */
let mounted = [];
const render = (props) => {
  const component = mount(ChartLegend, { target: document.body, props });
  mounted.push(component);
  flushSync();
  return document.body;
};

afterEach(() => {
  mounted.forEach((component) => unmount(component));
  mounted = [];
  document.body.innerHTML = "";
});

describe("ChartLegend", () => {
  it("renders swatch, tick, and line glyphs with their labels", () => {
    const body = render({
      items: [
        { label: "Autauga County, AL", glyph: "swatch", color: "#1696D2" },
        { label: "Alabama", glyph: "tick", variant: "solid", color: "#0A4C6A" },
        { label: "National", glyph: "tick", variant: "dotted", color: "#696969" },
        { label: "Trend", glyph: "line", color: "#1696D2", dash: "6 4" }
      ]
    });
    const entries = [...body.querySelectorAll("li")];
    expect(entries).toHaveLength(4);
    expect(entries.map((li) => li.querySelector(".label").textContent)).toEqual([
      "Autauga County, AL",
      "Alabama",
      "National",
      "Trend"
    ]);

    const swatch = entries[0].querySelector(".glyph");
    expect(swatch.classList.contains("swatch")).toBe(true);
    expect(swatch.style.backgroundColor).toBe("rgb(22, 150, 210)");

    // solid tick: a colored span, no dash svg
    const solid = entries[1].querySelector(".tick");
    expect(solid.style.backgroundColor).toBe("rgb(10, 76, 106)");
    expect(entries[1].querySelector("svg")).toBeNull();
    // dotted tick: inline svg dash line matching the chart mark (marks/RefTick.svelte)
    const dotted = entries[2].querySelector("svg.tick-line line");
    expect(dotted.getAttribute("stroke")).toBe("#696969");
    expect(dotted.getAttribute("stroke-dasharray")).toBe("4 9");
    expect(dotted.getAttribute("stroke-linecap")).toBe("round");

    const line = entries[3].querySelector("svg line");
    expect(line.getAttribute("stroke")).toBe("#1696D2");
    expect(line.getAttribute("stroke-dasharray")).toBe("6 4");
  });

  it("omits stroke-dasharray for solid line glyphs", () => {
    const body = render({
      items: [{ label: "Solid", glyph: "line", color: "#1696D2", dash: null }]
    });
    expect(body.querySelector("svg line").getAttribute("stroke-dasharray")).toBeNull();
  });
});
