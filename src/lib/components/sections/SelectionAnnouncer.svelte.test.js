// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

// @ts-nocheck — vitest-verified; skip strict-null noise on DOM queries
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { mount, unmount, flushSync } from "svelte";
import SelectionAnnouncer from "./SelectionAnnouncer.svelte";

/** Minimal ToolState stand-in — only the fields the announcer reads. */
function makeTool(overrides = {}) {
  let tool = $state({
    loading: false,
    geoid1: "",
    geoid1Data: undefined,
    selectedEq: { shorthand: "Kindergarten readiness" },
    selectedMetricCounts: { hasMetricData: 12, noMetricData: 3 },
    ...overrides
  });
  return tool;
}

/** @type {ReturnType<typeof mount>[]} */
let mounted = [];
const render = (tool) => {
  const component = mount(SelectionAnnouncer, {
    target: document.body,
    context: new Map([["tool", tool]])
  });
  mounted.push(component);
  flushSync();
  return component;
};

const region = () => document.querySelector('[role="status"]');

afterEach(() => {
  mounted.forEach((component) => unmount(component));
  mounted = [];
  document.body.innerHTML = "";
});

describe("SelectionAnnouncer", () => {
  it("renders one polite, visually hidden status region", () => {
    render(makeTool());
    expect(region().getAttribute("aria-live")).toBe("polite");
    expect(region().className).toBe("visually-hidden");
    expect(document.querySelectorAll('[role="status"]').length).toBe(1);
  });

  it("announces the national view without a geography clause", () => {
    render(makeTool());
    expect(region().textContent).toBe(
      "12 metrics available for Kindergarten readiness nationally."
    );
  });

  it("names the selected geography once its data lands", () => {
    const tool = makeTool();
    render(tool);

    tool.geoid1 = "06";
    tool.geoid1Data = { name: "California" };
    flushSync();

    expect(region().textContent).toBe(
      "12 metrics available for Kindergarten readiness in California."
    );
  });

  it("stays silent while the selected geography is still loading", () => {
    const tool = makeTool();
    render(tool);

    tool.geoid1 = "06";
    tool.loading = true;
    tool.selectedMetricCounts = { hasMetricData: 0, noMetricData: 0 };
    flushSync();
    expect(region().textContent).toBe("");

    tool.loading = false;
    tool.geoid1Data = { name: "California" };
    tool.selectedMetricCounts = { hasMetricData: 9, noMetricData: 6 };
    flushSync();
    expect(region().textContent).toBe(
      "9 metrics available for Kindergarten readiness in California."
    );
  });

  it("stays silent when a geoid is selected but its data has not arrived", () => {
    const tool = makeTool({ geoid1: "06" });
    render(tool);
    expect(region().textContent).toBe("");
  });

  it("follows the essential question", () => {
    const tool = makeTool();
    render(tool);

    tool.selectedEq = { shorthand: "Postsecondary attainment" };
    tool.selectedMetricCounts = { hasMetricData: 1, noMetricData: 0 };
    flushSync();

    expect(region().textContent).toBe(
      "1 metric available for Postsecondary attainment nationally."
    );
  });
});
