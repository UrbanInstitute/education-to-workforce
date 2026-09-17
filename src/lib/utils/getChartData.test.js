// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

// @ts-nocheck — vitest-verified; skip strict-null noise on fixture lookups
import { describe, it, expect } from "vitest";
import {
  ROLES,
  ROLE_STYLES,
  normalizeYears,
  getCardGeographies,
  resolveDisplayYear,
  computeDomain,
  getBarGroupData,
  getTrendSeriesData,
  getBarLegendItems,
  getTrendLegendItems,
  hasDisaggregateData,
  getDisaggregatedData,
  selectChartVariant,
  resolveDisaggPrefix,
  getAltTemplateKey,
  getChartAltText
} from "./getChartData";
import {
  NATIONAL,
  STATES,
  COUNTY_01001,
  COUNTY_01003,
  COUNTY_02013,
  METRIC_PERCENT,
  METRIC_MISSING_RECENT,
  METRIC_GAP,
  METRIC_DISAGG_EMPTY,
  METRIC_DISAGG_SINGLE_YEAR,
  METRIC_DISAGG_ONLY,
  ALT_TEMPLATES
} from "./__fixtures__/chartData";
import { getDisaggregateMeta } from "./disaggregates";

const roles = (geos) => geos.map((d) => d.role);

// the race/ethnicity subgroup set the d1 fixtures exercise, read from the metadata: the
// field keys are the data contract, the labels and the count are not the test's business
const RACE_FIELDS = getDisaggregateMeta(1).fields;

describe("getCardGeographies", () => {
  it("returns national only when no primary geography is selected (national view)", () => {
    const geos = getCardGeographies(undefined, undefined, STATES, NATIONAL, "counties");
    expect(roles(geos)).toEqual(["national"]);
    expect(geos[0].name).toBe("National");
  });

  it("state level, no comparison: primary + national, no parent-state roles", () => {
    const geos = getCardGeographies(STATES["01"], undefined, STATES, NATIONAL, "states");
    expect(roles(geos)).toEqual(["primary", "national"]);
  });

  it("state level with comparison: primary + comparison + national", () => {
    const geos = getCardGeographies(STATES["01"], STATES["02"], STATES, NATIONAL, "states");
    expect(roles(geos)).toEqual(["primary", "comparison", "national"]);
  });

  it("sub-state, no comparison: primary + primaryState + national", () => {
    const geos = getCardGeographies(COUNTY_01001, undefined, STATES, NATIONAL, "counties");
    expect(roles(geos)).toEqual(["primary", "primaryState", "national"]);
    expect(geos[1].name).toBe("Alabama");
  });

  it("sub-state comparison in a different state: all five roles", () => {
    const geos = getCardGeographies(COUNTY_01001, COUNTY_02013, STATES, NATIONAL, "counties");
    expect(roles(geos)).toEqual([
      "primary",
      "comparison",
      "primaryState",
      "comparisonState",
      "national"
    ]);
    expect(geos.find((d) => d.role === "comparisonState").name).toBe("Alaska");
  });

  it("sub-state comparison sharing the parent state dedupes to one primaryState", () => {
    const geos = getCardGeographies(COUNTY_01001, COUNTY_01003, STATES, NATIONAL, "counties");
    expect(roles(geos)).toEqual(["primary", "comparison", "primaryState", "national"]);
  });

  it("omits parent-state roles when the state lookup is missing", () => {
    const geos = getCardGeographies(COUNTY_01001, undefined, {}, NATIONAL, "counties");
    expect(roles(geos)).toEqual(["primary", "national"]);
  });
});

describe("normalizeYears / resolveDisplayYear", () => {
  it("normalizes a single string year and sorts arrays ascending", () => {
    expect(normalizeYears("2020")).toEqual([2020]);
    expect(normalizeYears(["2021", "2019", "2020"])).toEqual([2019, 2020, 2021]);
  });

  it("returns the most recent year when the primary geography has data for it", () => {
    expect(resolveDisplayYear(COUNTY_01001, "m1", METRIC_PERCENT.years_available)).toBe("2021");
  });

  it("walks back to the most recent year with data when the latest is missing", () => {
    expect(resolveDisplayYear(COUNTY_01001, "m3", METRIC_MISSING_RECENT.years_available)).toBe(
      "2020"
    );
  });

  it("falls back to the most recent year when the geography has no data at all", () => {
    expect(resolveDisplayYear(COUNTY_01001, "m999", ["2019", "2020"])).toBe("2020");
  });

  it("resolves a disaggregate-only metric against its subgroup keys", () => {
    // m190 has no base accessor and its metadata claims a year past the published data;
    // without the subgroup probe this returns the phantom 2021 and every bar reads N/A
    expect(resolveDisplayYear(COUNTY_01001, "m190", METRIC_DISAGG_ONLY.years_available)).toBe(
      "2020"
    );
  });
});

describe("computeDomain", () => {
  it("pads a percent maximum by 20% like any other metric, data-driven below 100%", () => {
    expect(computeDomain([0.4, 0.5], "percent").domain).toEqual([0, 0.6]);
  });

  it("caps the percent domain at 100% so a full-scale bar fills the track exactly", () => {
    expect(computeDomain([0.4, 1], "percent").domain).toEqual([0, 1]);
    // padding would push past 1, but the cap holds it at 100%
    expect(computeDomain([0.9], "percent").domain).toEqual([0, 1]);
  });

  it("leaves percent_hundredths ratios data-driven so they can exceed 100%", () => {
    // participation-relative-to-share metrics run well past parity; no 100% cap
    expect(computeDomain([2, 8.5], "percent_hundredths").domain).toEqual([0, 10.2]);
  });

  it("pads currency/numeric maxima by 20% so the largest bar leaves label room", () => {
    expect(computeDomain([42000, 50000], "currency").domain).toEqual([0, 60000]);
  });

  it("flags diverging and pads both ends by 20% of the span when any value is negative", () => {
    const { domain, diverging } = computeDomain([-0.06, 0.07], "percent_hundredths");
    // span 0.13 → pad 0.026 on each side
    expect(domain[0]).toBeCloseTo(-0.086, 10);
    expect(domain[1]).toBeCloseTo(0.096, 10);
    expect(diverging).toBe(true);
  });

  it("pads above zero even when every value is negative (zero baseline off the edge)", () => {
    const { domain } = computeDomain([-0.06, -0.04], "percent_hundredths");
    expect(domain[0]).toBeCloseTo(-0.072, 10);
    expect(domain[1]).toBeCloseTo(0.012, 10);
  });

  it("handles all-null input", () => {
    expect(computeDomain([null, undefined], "percent")).toEqual({
      domain: [0, 0],
      diverging: false
    });
  });
});

describe("getBarGroupData", () => {
  it("renders the national series as the bar in the national view", () => {
    const geos = getCardGeographies(undefined, undefined, STATES, NATIONAL, "counties");
    const { bars, displayYear } = getBarGroupData(geos, METRIC_PERCENT);
    expect(bars).toHaveLength(1);
    expect(bars[0].role).toBe("national");
    expect(bars[0].value).toBe(0.55);
    expect(bars[0].refs).toEqual([]);
    expect(displayYear).toBe("2021");
  });

  it("gives a state-level bar a national ref only", () => {
    const geos = getCardGeographies(STATES["01"], undefined, STATES, NATIONAL, "states");
    const { bars } = getBarGroupData(geos, METRIC_PERCENT);
    expect(bars[0].refs.map((r) => r.variant)).toEqual(["dotted"]);
    expect(bars[0].refs[0].role).toBe("national");
  });

  it("gives each sub-state bar its own parent state (solid) + national (dotted) refs", () => {
    const geos = getCardGeographies(COUNTY_01001, COUNTY_02013, STATES, NATIONAL, "counties");
    const { bars } = getBarGroupData(geos, METRIC_PERCENT);
    expect(bars).toHaveLength(2);
    const [primaryBar, comparisonBar] = bars;
    expect(primaryBar.refs.map((r) => [r.role, r.variant])).toEqual([
      ["primaryState", "solid"],
      ["national", "dotted"]
    ]);
    expect(comparisonBar.refs.map((r) => [r.role, r.variant])).toEqual([
      ["comparisonState", "solid"],
      ["national", "dotted"]
    ]);
    expect(comparisonBar.refs[0].label).toBe("Alaska");
  });

  it("points the comparison bar at the shared primaryState in the dedup case", () => {
    const geos = getCardGeographies(COUNTY_01001, COUNTY_01003, STATES, NATIONAL, "counties");
    const { bars } = getBarGroupData(geos, METRIC_PERCENT);
    const comparisonBar = bars.find((b) => b.role === "comparison");
    expect(comparisonBar.refs[0].role).toBe("primaryState");
    expect(comparisonBar.refs[0].label).toBe("Alabama");
  });

  it("resolves displayYear from the primary geography with fallback", () => {
    const geos = getCardGeographies(COUNTY_01001, undefined, STATES, NATIONAL, "counties");
    const { displayYear, bars } = getBarGroupData(geos, METRIC_MISSING_RECENT);
    expect(displayYear).toBe("2020");
    expect(bars[0].value).toBe(0.27);
  });

  it("respects a pinned year", () => {
    const geos = getCardGeographies(COUNTY_01001, undefined, STATES, NATIONAL, "counties");
    const { displayYear, bars } = getBarGroupData(geos, METRIC_PERCENT, { year: "2019" });
    expect(displayYear).toBe("2019");
    expect(bars[0].value).toBe(0.4);
  });

  it("computes a data-driven percent domain across bars and refs, capped at 100%", () => {
    const geos = getCardGeographies(COUNTY_01001, undefined, STATES, NATIONAL, "counties");
    const { domain, diverging } = getBarGroupData(geos, METRIC_PERCENT);
    // max plotted value 0.55 → 0.55 * 1.2 = 0.66, still under the 100% cap
    expect(domain).toEqual([0, 0.66]);
    expect(diverging).toBe(false);
  });

  it("marks missing values as null", () => {
    const geos = getCardGeographies(STATES["02"], undefined, STATES, NATIONAL, "states");
    const { bars } = getBarGroupData(geos, { ...METRIC_PERCENT, metric_id: 999 });
    expect(bars[0].value).toBeNull();
  });

  it("colors each ref tick by its role", () => {
    const geos = getCardGeographies(COUNTY_01001, COUNTY_02013, STATES, NATIONAL, "counties");
    const { bars } = getBarGroupData(geos, METRIC_PERCENT);
    const [primaryBar, comparisonBar] = bars;
    expect(primaryBar.refs.map((r) => r.color)).toEqual([
      ROLE_STYLES.primaryState.tickColor,
      ROLE_STYLES.national.tickColor
    ]);
    expect(comparisonBar.refs.map((r) => r.color)).toEqual([
      ROLE_STYLES.comparisonState.tickColor,
      ROLE_STYLES.national.tickColor
    ]);
  });

  it("colors the shared-state tick by the bar's family in the dedup case", () => {
    const geos = getCardGeographies(COUNTY_01001, COUNTY_01003, STATES, NATIONAL, "counties");
    const { bars } = getBarGroupData(geos, METRIC_PERCENT);
    const primaryBar = bars.find((b) => b.role === "primary");
    const comparisonBar = bars.find((b) => b.role === "comparison");
    // both bars reference the same primaryState geography (same label + value)…
    expect(primaryBar.refs[0].label).toBe("Alabama");
    expect(comparisonBar.refs[0].label).toBe("Alabama");
    expect(comparisonBar.refs[0].value).toBe(primaryBar.refs[0].value);
    // …but each tick renders in its own bar's family color
    expect(primaryBar.refs[0].color).toBe(ROLE_STYLES.primaryState.tickColor);
    expect(comparisonBar.refs[0].color).toBe(ROLE_STYLES.comparisonState.tickColor);
  });
});

describe("getBarLegendItems", () => {
  const legend = (geoid1, geoid2, level = "counties") => {
    const geos = getCardGeographies(geoid1, geoid2, STATES, NATIONAL, level);
    return getBarLegendItems(getBarGroupData(geos, METRIC_PERCENT).bars);
  };

  it("national view: a single national swatch, no tick entries", () => {
    expect(legend(undefined, undefined)).toEqual([
      { label: "National", glyph: "swatch", color: ROLE_STYLES.national.barColor }
    ]);
  });

  it("state level: primary swatch + dotted national tick", () => {
    expect(legend(STATES["01"], undefined, "states")).toEqual([
      { label: "Alabama", glyph: "swatch", color: ROLE_STYLES.primary.barColor },
      {
        label: "National",
        glyph: "tick",
        variant: "dotted",
        color: ROLE_STYLES.national.tickColor
      }
    ]);
  });

  it("sub-state: swatch, solid state tick, dotted national last", () => {
    expect(legend(COUNTY_01001, undefined).map((d) => [d.label, d.glyph, d.variant])).toEqual([
      ["Autauga County, AL", "swatch", undefined],
      ["Alabama", "tick", "solid"],
      ["National", "tick", "dotted"]
    ]);
  });

  it("cross-state comparison: five entries in bar order, single national", () => {
    const items = legend(COUNTY_01001, COUNTY_02013);
    expect(items.map((d) => d.label)).toEqual([
      "Autauga County, AL",
      "Alabama",
      "Aleutians East, AK",
      "Alaska",
      "National"
    ]);
    expect(items.filter((d) => d.variant === "dotted")).toHaveLength(1);
    expect(items[3].color).toBe(ROLE_STYLES.comparisonState.tickColor);
  });

  it("same-parent-state comparison lists the shared state once per family color", () => {
    const items = legend(COUNTY_01001, COUNTY_01003);
    expect(items.map((d) => d.label)).toEqual([
      "Autauga County, AL",
      "Alabama",
      "Baldwin County, AL",
      "Alabama",
      "National"
    ]);
    expect(items[1].color).toBe(ROLE_STYLES.primaryState.tickColor);
    expect(items[3].color).toBe(ROLE_STYLES.comparisonState.tickColor);
  });
});

describe("getTrendLegendItems", () => {
  it("emits one line glyph per series in role order with color + dash", () => {
    const geos = getCardGeographies(COUNTY_01001, COUNTY_02013, STATES, NATIONAL, "counties");
    const series = getTrendSeriesData(
      geos,
      METRIC_PERCENT.metric_id,
      METRIC_PERCENT.years_available
    );
    const items = getTrendLegendItems(series);
    expect(items.map((d) => d.glyph)).toEqual(["line", "line", "line", "line", "line"]);
    expect(items[0]).toEqual({
      label: "Autauga County, AL",
      glyph: "line",
      color: ROLE_STYLES.primary.lineColor,
      dash: null
    });
    expect(items[4].dash).toBe(ROLE_STYLES.national.dash);
  });
});

describe("getTrendSeriesData", () => {
  it("orders series primary → comparison → primaryState → comparisonState → national with role styles", () => {
    const geos = getCardGeographies(COUNTY_01001, COUNTY_02013, STATES, NATIONAL, "counties");
    const series = getTrendSeriesData(
      geos,
      METRIC_PERCENT.metric_id,
      METRIC_PERCENT.years_available
    );
    expect(series.map((s) => s.role)).toEqual(ROLES);
    expect(series[0].color).toBe(ROLE_STYLES.primary.lineColor);
    expect(series[0].dash).toBeNull();
    expect(series[4].dash).toBe(ROLE_STYLES.national.dash);
  });

  it("promotes the national series to the solid primary style in the national-only view", () => {
    const geos = getCardGeographies(undefined, undefined, STATES, NATIONAL, "counties");
    const series = getTrendSeriesData(
      geos,
      METRIC_PERCENT.metric_id,
      METRIC_PERCENT.years_available
    );
    expect(series).toHaveLength(1);
    expect(series[0].role).toBe("national");
    expect(series[0].color).toBe(ROLE_STYLES.primary.lineColor);
    // dash === null is what earns it markers + endpoint labels downstream
    expect(series[0].dash).toBeNull();
  });

  it("reverts national to the gray dashed reference style once a location is selected", () => {
    const geos = getCardGeographies(COUNTY_01001, undefined, STATES, NATIONAL, "counties");
    const national = getTrendSeriesData(
      geos,
      METRIC_PERCENT.metric_id,
      METRIC_PERCENT.years_available
    ).find((s) => s.role === "national");
    expect(national.color).toBe(ROLE_STYLES.national.lineColor);
    expect(national.dash).toBe(ROLE_STYLES.national.dash);
  });

  it("emits one point per available year with null gaps", () => {
    const geos = getCardGeographies(COUNTY_01001, undefined, STATES, NATIONAL, "counties");
    const series = getTrendSeriesData(geos, 3, METRIC_MISSING_RECENT.years_available);
    const primary = series.find((s) => s.role === "primary");
    expect(primary.values).toEqual([
      { year: 2019, value: 0.25 },
      { year: 2020, value: 0.27 },
      { year: 2021, value: null }
    ]);
  });
});

describe("getDisaggregatedData", () => {
  it("builds per-subgroup bars with the m{id}_{field} accessors at the shared card year", () => {
    const geos = getCardGeographies(COUNTY_01001, undefined, STATES, NATIONAL, "counties");
    const { subgroups, displayYear } = getDisaggregatedData(geos, METRIC_PERCENT, "d1");
    expect(displayYear).toBe("2021");
    const white = subgroups.find((s) => s.field === "d1_white");
    // the label is display copy in disaggregates.json; the field key is the data contract
    expect(white.label).toBe(RACE_FIELDS.find((f) => f.value === "d1_white").label);
    expect(white.bars[0].value).toBe(0.48);
    expect(white.bars[0].refs.find((r) => r.role === "national").value).toBe(0.58);
  });

  it("keeps every declared subgroup, flagging empty ones with noData (N/A rows)", () => {
    const geos = getCardGeographies(COUNTY_01001, undefined, STATES, NATIONAL, "counties");
    const { subgroups } = getDisaggregatedData(geos, METRIC_PERCENT, "d1");
    // every race/ethnicity field from disaggregates.json is present…
    expect(subgroups).toHaveLength(RACE_FIELDS.length);
    // …but the fixtures only carry white + black values
    expect(
      subgroups
        .filter((s) => !s.noData)
        .map((s) => s.field)
        .sort()
    ).toEqual(["d1_black", "d1_white"]);
    // empty subgroups still carry bar rows (all-null) so they render as N/A tracks
    const empty = subgroups.find((s) => s.field === "d1_asian");
    expect(empty.noData).toBe(true);
    expect(empty.bars.length).toBeGreaterThan(0);
    expect(empty.bars.every((bar) => bar.value === null)).toBe(true);
  });

  it("flags noData per timeframe for trend subgroups too", () => {
    const geos = getCardGeographies(COUNTY_01001, undefined, STATES, NATIONAL, "counties");
    const { subgroups } = getDisaggregatedData(geos, METRIC_PERCENT, "d1", { timeframe: "all" });
    expect(subgroups).toHaveLength(RACE_FIELDS.length);
    const empty = subgroups.find((s) => s.field === "d1_hispanic");
    expect(empty.noData).toBe(true);
    expect(empty.series.every((s) => s.values.every((v) => v.value === null))).toBe(true);
  });

  it("keeps noData false when only some geographies lack the subgroup", () => {
    // Baldwin County has m1_d1_white but no m1_d1_black — the comparison bar is null
    // inside a subgroup that still has data
    const geos = getCardGeographies(COUNTY_01001, COUNTY_01003, STATES, NATIONAL, "counties");
    const { subgroups } = getDisaggregatedData(geos, METRIC_PERCENT, "d1");
    const black = subgroups.find((s) => s.field === "d1_black");
    expect(black.noData).toBe(false);
    expect(black.bars.find((b) => b.role === "primary").value).toBe(0.36);
    expect(black.bars.find((b) => b.role === "comparison").value).toBeNull();
  });

  it("flags diverging with a shared padded domain for representation-gap metrics", () => {
    const geos = getCardGeographies(COUNTY_01001, undefined, STATES, NATIONAL, "counties");
    const { domain, diverging } = getDisaggregatedData(geos, METRIC_GAP, "d1");
    expect(diverging).toBe(true);
    // raw extent [-0.06, 0.07] padded by 20% of the span on each side
    expect(domain[0]).toBeCloseTo(-0.086, 10);
    expect(domain[1]).toBeCloseTo(0.096, 10);
  });

  it("builds per-subgroup trend series for the all-years timeframe", () => {
    const geos = getCardGeographies(COUNTY_01001, undefined, STATES, NATIONAL, "counties");
    const { subgroups } = getDisaggregatedData(geos, METRIC_GAP, "d1", { timeframe: "all" });
    const black = subgroups.find((s) => s.field === "d1_black");
    expect(black.series.find((s) => s.role === "primary").values).toEqual([
      { year: 2019, value: -0.05 },
      { year: 2020, value: -0.06 }
    ]);
  });

  it("returns no subgroups for an unknown disaggregate prefix", () => {
    const geos = getCardGeographies(COUNTY_01001, undefined, STATES, NATIONAL, "counties");
    const { subgroups } = getDisaggregatedData(geos, METRIC_PERCENT, "d99");
    expect(subgroups).toEqual([]);
  });
});

describe("hasDisaggregateData", () => {
  const geos = getCardGeographies(COUNTY_01001, undefined, STATES, NATIONAL, "counties");

  it("reports subgroup data when any field has a value", () => {
    expect(hasDisaggregateData(geos, METRIC_PERCENT, "d1")).toBe(true);
    expect(hasDisaggregateData(geos, METRIC_DISAGG_SINGLE_YEAR, "d1")).toBe(true);
  });

  it("reports no data when the metric claims the disaggregate but publishes nothing (m222 case)", () => {
    expect(hasDisaggregateData(geos, METRIC_DISAGG_EMPTY, "d1")).toBe(false);
  });

  it("reports no data for a disaggregate the metric doesn't offer", () => {
    expect(hasDisaggregateData(geos, METRIC_MISSING_RECENT, "d1")).toBe(false);
  });

  it("reports no data for an unknown prefix", () => {
    expect(hasDisaggregateData(geos, METRIC_PERCENT, "d99")).toBe(false);
  });
});

describe("selectChartVariant", () => {
  it("is the pure timeframe × disaggregate matrix — no data-driven fallbacks", () => {
    expect(selectChartVariant("recent", "none")).toBe("bars");
    expect(selectChartVariant("recent", "d1")).toBe("disaggBars");
    expect(selectChartVariant("all", "none")).toBe("trend");
    expect(selectChartVariant("all", "d1")).toBe("disaggTrends");
  });

  it("keeps a disaggregate-only metric disaggregated under 'none'", () => {
    // the base chart would be empty — there is no m190 accessor to plot (§11.4)
    expect(selectChartVariant("recent", "none", METRIC_DISAGG_ONLY)).toBe("disaggBars");
    expect(selectChartVariant("all", "none", METRIC_DISAGG_ONLY)).toBe("disaggTrends");
  });

  it("leaves an ordinary metric's variant unchanged when metadata is supplied", () => {
    expect(selectChartVariant("recent", "none", METRIC_PERCENT)).toBe("bars");
    expect(selectChartVariant("all", "none", METRIC_PERCENT)).toBe("trend");
  });
});

describe("resolveDisaggPrefix", () => {
  it("substitutes a disaggregate-only metric's own prefix under 'none'", () => {
    expect(resolveDisaggPrefix("none", METRIC_DISAGG_ONLY)).toBe("d1");
  });

  it("lets an active filter win, so these cards behave like their peers", () => {
    // under Gender, m190 must reach the no-data message rather than silently showing race
    expect(resolveDisaggPrefix("d2", METRIC_DISAGG_ONLY)).toBe("d2");
  });

  it("returns undefined for an ordinary metric under 'none'", () => {
    expect(resolveDisaggPrefix("none", METRIC_PERCENT)).toBeUndefined();
    expect(resolveDisaggPrefix("none")).toBeUndefined();
  });
});

describe("getAltTemplateKey", () => {
  it("maps role sets to template keys", () => {
    expect(getAltTemplateKey(["national"])).toBe("national");
    expect(getAltTemplateKey(["primary", "national"])).toBe("primary");
    expect(getAltTemplateKey(["primary", "primaryState", "national"])).toBe("primary_state");
    expect(getAltTemplateKey(["primary", "comparison", "national"])).toBe("primary_comparison");
    expect(
      getAltTemplateKey(["primary", "comparison", "primaryState", "comparisonState", "national"])
    ).toBe("primary_state_comparison");
    // dedup case still counts as having a state reference
    expect(getAltTemplateKey(["primary", "comparison", "primaryState", "national"])).toBe(
      "primary_state_comparison"
    );
  });
});

describe("getChartAltText", () => {
  it("renders the bar template with role-keyed variables", () => {
    const geos = getCardGeographies(COUNTY_01001, undefined, STATES, NATIONAL, "counties");
    const text = getChartAltText(geos, METRIC_PERCENT, ALT_TEMPLATES);
    expect(text).toBe(
      "Bar chart of Share of students meeting the test benchmark in Autauga County, AL: 44.0% in 2021, compared to 50.0% in Alabama and 55.0% nationally."
    );
  });

  it("renders the national-only bar template", () => {
    const geos = getCardGeographies(undefined, undefined, STATES, NATIONAL, "counties");
    const text = getChartAltText(geos, METRIC_PERCENT, ALT_TEMPLATES);
    expect(text).toBe(
      "Bar chart of Share of students meeting the test benchmark nationally: 55.0% in 2021."
    );
  });

  it("renders the comparison bar template including comparison values", () => {
    const geos = getCardGeographies(STATES["01"], STATES["02"], STATES, NATIONAL, "states");
    const text = getChartAltText(geos, METRIC_PERCENT, ALT_TEMPLATES);
    expect(text).toContain("Alabama (50.0%)");
    expect(text).toContain("Alaska (53.0%)");
  });

  it("renders the trend template with first/last values", () => {
    const geos = getCardGeographies(COUNTY_01001, undefined, STATES, NATIONAL, "counties");
    const text = getChartAltText(geos, METRIC_PERCENT, ALT_TEMPLATES, { variant: "trend" });
    expect(text).toBe(
      "Line chart of Share of students meeting the test benchmark in Autauga County, AL, from 40.0% to 44.0% between 2019 and 2021, with Alabama and national reference lines."
    );
  });

  it("skips null gaps when picking trend first/last values", () => {
    const geos = getCardGeographies(COUNTY_01001, undefined, STATES, NATIONAL, "counties");
    const text = getChartAltText(geos, METRIC_MISSING_RECENT, ALT_TEMPLATES, { variant: "trend" });
    // county m3 has no 2021 value: last real point is 2020
    expect(text).toContain("from 25.0% to 27.0% between 2019 and 2020");
  });

  it("returns an empty string when no template matches", () => {
    const geos = getCardGeographies(COUNTY_01001, undefined, STATES, NATIONAL, "counties");
    expect(getChartAltText(geos, METRIC_PERCENT, {})).toBe("");
  });
});
