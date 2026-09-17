// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

// @ts-nocheck — vitest-verified; skip strict-null noise on real-data lookups
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import metrics from "$data/metadata/metrics.json";
import indicators from "$data/metadata/indicators.json";
import national from "$data/metrics/national.json";

// states.json is served from static/ rather than bundled (dev-plan §12.5 #1), so it is
// read off disk here instead of imported — an import would put it back in the bundle
const states = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../../../static/data/metrics/states.json", import.meta.url)),
    "utf8"
  )
);
import getSelectedIndicators from "$utils/getSelectedIndicators";
import {
  getCardGeographies,
  selectChartVariant,
  resolveDisaggPrefix,
  getDisaggregatedData,
  hasDisaggregateData,
  getChartAltText
} from "$utils/getChartData";
import { metricDropdownOptions, getInitialMetric } from "$lib/state/toolState.svelte.js";
import altTemplates from "$data/archie-ml/chart-alt.aml";

// End-to-end check of the disaggregate-only path against the REAL committed artifacts
// (dev-plan §11). The unit tests use fixtures; this one would catch a metadata
// regeneration that silently drops disagg_only, or source data losing its subgroup
// columns — either of which makes m190's card vanish with every unit test still green.

const M190 = metrics.find((m) => m.metric_id === 190);
const INDICATOR_87 = indicators.find((d) => d.indicator_number === 87);

describe("m190 (disaggregate-only) against real data", () => {
  it("is published as a disaggregate-only in_tool metric with a race disaggregate", () => {
    expect(M190).toBeDefined();
    expect(M190.disagg_only).toBe(true);
    expect(M190.in_tool).toBe(true);
    expect(resolveDisaggPrefix("none", M190)).toBe("d1");
  });

  it("has subgroup columns but no base column, at every claimed level", () => {
    const alabama = states["01"].data;
    expect(Object.hasOwn(alabama, "m190")).toBe(false);
    expect(Object.hasOwn(alabama, "m190_d1_white")).toBe(true);
    expect(Object.hasOwn(national["00"].data, "m190_d1_white")).toBe(true);
  });

  it("reaches hasMetricData rather than the no-data bucket", () => {
    // the regression this whole feature turns on: the base-accessor check stranded it
    const result = getSelectedIndicators(
      undefined,
      { slug: "states", metadata: { indicators, metrics } },
      states["01"]
    );
    const ind87 = result.find((d) => d.indicator_number === 87);
    expect(ind87.hasMetricData.map((m) => m.metric_id)).toContain(190);
    expect(ind87.noMetricData.map((m) => m.metric_id)).not.toContain(190);
  });

  it("renders a disaggregated chart with real subgroup values under the default filter", () => {
    const geos = getCardGeographies(states["01"], undefined, states, national["00"], "states");
    expect(selectChartVariant("recent", "none", M190)).toBe("disaggBars");
    expect(hasDisaggregateData(geos, M190, "d1")).toBe(true);

    const { subgroups, displayYear } = getDisaggregatedData(geos, M190, "d1");
    // the year must come from the subgroup columns; the workbook claims 2023, and the
    // 2026-07-27 data drop backs that claim with real subgroup data (§11.2 A15, resolved)
    expect(displayYear).toBe("2023");
    const populated = subgroups.filter((s) => !s.noData);
    expect(populated.length).toBeGreaterThan(0);
    expect(populated[0].bars.some((bar) => typeof bar.value === "number")).toBe(true);
  });

  it("dates its alt text from the subgroup columns too", () => {
    const geos = getCardGeographies(states["01"], undefined, states, national["00"], "states");
    const label = getChartAltText(geos, M190, altTemplates, { variant: "disaggTrends" });
    // year_first/year_last come from a subgroup series; the base series is all-null
    expect(label).toContain("2013");
    expect(label).toContain("2023");
  });

  it("is excluded from the map metric dropdown and never auto-selected", () => {
    // indicator 87 holds only m190, so it is the whole of its hasMetricData list
    const result = getSelectedIndicators(
      undefined,
      { slug: "states", metadata: { indicators, metrics } },
      states["01"]
    );
    const ind87 = result.find((d) => d.indicator_number === 87);
    expect(metricDropdownOptions([ind87])).toEqual([]);
    expect(getInitialMetric([ind87])).toBeNull();
  });
});

describe("indicator 87", () => {
  it("carries m190 again now that it is a first-class metric", () => {
    // it resolved to an empty metrics list while m190 lived in the contextual variables
    expect([].concat(INDICATOR_87.metrics)).toContain("190");
  });
});
