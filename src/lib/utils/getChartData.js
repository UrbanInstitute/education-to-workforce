// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

import { urbanColors } from "@urbaninstitute/dataviz-components/utils";
import { formatFun } from "./formatFun";
import { formatDynamicText } from "./dynamicText";
import disaggregateMetadata from "$data/metadata/disaggregates.json";
import { getDisaggOnlyPrefix } from "$utils/disaggregates";

/**
 * Role-tagged chart data shaping for the v2 chart family (see .agent/docs/v2-dev-plan.md §3.5,
 * v2-component-requirements.md §1.3). Replaces the positional arrays of getMetricCardData.js:
 * every geography in a card is tagged with an explicit role instead of being identified by
 * array position and length.
 *
 * @typedef {"primary" | "comparison" | "primaryState" | "comparisonState" | "national"} SeriesRole
 *
 * @typedef {import("$utils/types/GeoidDataObject.js").GeoidDataObject} GeoidDataObject
 *
 * @typedef {Object} CardGeography
 * @property {SeriesRole} role
 * @property {string} name
 * @property {string} [short_name]
 * @property {string} [s_id] - parent state fips (sub-state geographies only)
 * @property {Object<string, Object<string, number>>} [data] - metric accessor → year → value
 *
 * @typedef {Object} ChartMetricMetadata - the metrics.json fields the shapers consume
 * @property {number | string} metric_id - number for base metrics; getDisaggregatedData
 *   derives string ids ("83_d1_white") for subgroup accessors
 * @property {string} [metric_full_name]
 * @property {string} [metric_type]
 * @property {string | string[]} years_available
 * @property {string | string[]} [disag_available]
 *
 * @typedef {Object} BarRef - a reference tick on a bar's track
 * @property {SeriesRole} role
 * @property {string} label
 * @property {number | null} value
 * @property {"solid" | "dotted"} variant - solid = parent state, dotted = national
 * @property {string} color - tick color (ROLE_STYLES[role].tickColor)
 *
 * @typedef {Object} BarRow
 * @property {SeriesRole} role
 * @property {string} name
 * @property {number | null} value
 * @property {string} color
 * @property {BarRef[]} refs
 *
 * @typedef {Object} TrendSeries
 * @property {SeriesRole} role
 * @property {string} name
 * @property {string} color
 * @property {string | null} dash - stroke-dasharray, null = solid
 * @property {{ year: number, value: number | null }[]} values
 *
 * @typedef {Object} LegendItem - one ChartLegend entry
 * @property {string} label
 * @property {"swatch" | "tick" | "line"} glyph - filled swatch (bar geo), track tick (bar ref),
 *   line-style stroke (trend series)
 * @property {string} color
 * @property {"solid" | "dotted"} [variant] - tick glyphs only
 * @property {string | null} [dash] - line glyphs only (stroke-dasharray)
 */

/** Roles in display/legend order. */
export const ROLES = ["primary", "comparison", "primaryState", "comparisonState", "national"];

/**
 * Per-role visual styles (colors per lines.jpg / mockups 3–8; exact dash patterns are
 * refined with the Phase 3 chart components). Each role carries only the color fields for
 * the mediums it actually renders in, so every field is live:
 * - barColor  → the filled bar (subject roles; national in the national-only view)
 * - lineColor → the trend-line stroke (every role)
 * - tickColor → the bar-track reference tick (reference roles) — darker than the line so
 *   the tick reads against the bar fill (mockup 3 shows the state tick in dark navy)
 * - dash      → trend-line stroke-dasharray (null = solid); bars ignore it
 * Subject roles (primary/comparison) never render as a tick; reference roles
 * (primaryState/comparisonState) never render as a bar fill; national does all three.
 * @type {Object<SeriesRole, { barColor?: string, lineColor: string, tickColor?: string, dash: string | null }>}
 */
export const ROLE_STYLES = {
  // subject roles: a filled bar + a solid trend line
  primary: { barColor: urbanColors.blue_shade_light, lineColor: urbanColors.blue, dash: null },
  comparison: {
    barColor: urbanColors.yellow_shade_medium,
    lineColor: urbanColors.yellow,
    dash: null
  },
  // reference roles: a bar-track tick + a dashed trend line (never a bar fill)
  primaryState: {
    lineColor: urbanColors.blue_shade_light,
    tickColor: urbanColors.blue_shade_darker,
    dash: "6 4"
  },
  comparisonState: {
    lineColor: urbanColors.yellow_shade_light,
    tickColor: urbanColors.yellow_shade_darker,
    dash: "6 4"
  },
  // national does all three: a tick + dashed line whenever a location is selected, but the
  // bar fill itself in the national-only view — where its trend line is likewise promoted
  // to the solid primary style (see getTrendSeriesData)
  national: {
    barColor: urbanColors.blue_shade_light,
    lineColor: urbanColors.space_gray_shade_light,
    tickColor: urbanColors.space_gray_shade_light,
    dash: "6 4"
  }
};

const displayName = (/** @type {CardGeography} */ geo) => geo.short_name || geo.name;

/**
 * Normalize metadata.years_available (string for single-year metrics, string[] otherwise)
 * to a numerically ascending number array.
 * @param {string | string[]} yearsAvailable
 * @returns {number[]}
 */
export const normalizeYears = (yearsAvailable) => {
  const years =
    typeof yearsAvailable === "string" ? [+yearsAvailable] : yearsAvailable.map((d) => +d);
  return years.slice().sort((a, b) => a - b);
};

/**
 * Build the role-tagged geography list for a card. Ports the rules from getMetricCardData:
 * - no primary geography → national only (the v2 national view; never returns undefined)
 * - state level → no parent-state roles (national reference only)
 * - sub-state comparison sharing the primary's parent state → dedupe to a single primaryState
 * Parent states missing from the states lookup are omitted rather than emitted as undefined.
 *
 * @param {GeoidDataObject | undefined} geoid1Data
 * @param {GeoidDataObject | undefined} geoid2Data
 * @param {Object<string, GeoidDataObject> | undefined} states - state geoid → geography object
 * @param {GeoidDataObject} national
 * @param {string} level - internal level id ("states", "counties", "tracts", "school_districts")
 * @returns {CardGeography[]}
 */
export const getCardGeographies = (geoid1Data, geoid2Data, states, national, level) => {
  /** @type {CardGeography[]} */
  const geographies = [];
  if (!geoid1Data) {
    return [{ role: "national", ...national }];
  }
  geographies.push({ role: "primary", ...geoid1Data });
  const state1 = geoid1Data.s_id ? states?.[geoid1Data.s_id] : undefined;
  const state2 = geoid2Data?.s_id ? states?.[geoid2Data.s_id] : undefined;
  if (geoid2Data) {
    geographies.push({ role: "comparison", ...geoid2Data });
  }
  if (level !== "states") {
    if (state1) {
      geographies.push({ role: "primaryState", ...state1 });
    }
    // same parent state dedupes to the single primaryState reference
    if (geoid2Data && state2 && geoid2Data.s_id !== geoid1Data.s_id) {
      geographies.push({ role: "comparisonState", ...state2 });
    }
  }
  geographies.push({ role: "national", ...national });
  return geographies;
};

/**
 * The accessors to consult when probing a metric for data presence. Normally just the
 * base accessor — but a disaggregate-only metric (m190) has no base column at all, so
 * fall back to its subgroup keys. Scoped to "the base accessor is entirely absent" rather
 * than "this year is missing", so a metric that has a base column keeps resolving against
 * it alone and its behaviour is unchanged (dev-plan §11.4).
 *
 * @param {CardGeography | undefined} geo
 * @param {string} metricAccessor - e.g. "m11"
 * @returns {string[]}
 */
const probeAccessors = (geo, metricAccessor) => {
  const data = geo?.data;
  if (!data) return [metricAccessor];
  if (Object.hasOwn(data, metricAccessor)) return [metricAccessor];
  const subgroupPrefix = `${metricAccessor}_`;
  const subgroups = Object.keys(data).filter((key) => key.startsWith(subgroupPrefix));
  return subgroups.length ? subgroups : [metricAccessor];
};

/**
 * Resolve the effective display year for a card: the most recent year of yearsAvailable
 * that the primary geography actually has data for (port of the recentYear fallback from
 * the deleted v1 MetricCard). Falls back to the most recent year overall when the geography has
 * no data at all (the card then renders N/A values).
 *
 * @param {CardGeography | undefined} primaryGeo
 * @param {string} metricAccessor - e.g. "m11" or "m11_d1_white"
 * @param {string | string[]} yearsAvailable
 * @returns {string}
 */
export const resolveDisplayYear = (primaryGeo, metricAccessor, yearsAvailable) => {
  const years = normalizeYears(yearsAvailable);
  const mostRecent = years[years.length - 1];
  const accessors = probeAccessors(primaryGeo, metricAccessor);
  const withData = years
    .slice()
    .reverse()
    .find((year) =>
      accessors.some((accessor) => primaryGeo?.data?.[accessor]?.[year] !== undefined)
    );
  return (withData ?? mostRecent).toString();
};

/** Headroom factor so an extreme bar never spans the full track — label room stays. */
export const DOMAIN_PADDING = 0.2;

/**
 * Compute the shared card domain from every plotted value (bars and reference ticks).
 * Domains are padded so no bar reaches the track's visual extent (labels need the room):
 * - diverging data (any negative value): data-driven [min, max(0, max)] padded by 20% of
 *   the span on BOTH sides, keeping an off-center zero baseline with label room at each
 *   end (dev-plan §8.1 / bars-negative.png)
 * - "percent" (bounded 0–100% shares): [0, min(1, max * 1.2)] — data-driven like any other
 *   metric, but the domain never exceeds 100%, so a full-scale value fills the track exactly
 *   (its label flips inside via labelPlacement) rather than leaving phantom room past the bar.
 *   Only the exact "percent" type is bounded; "percent_hundredths" metrics are participation
 *   ratios that legitimately exceed 100% (up to ~1550%), so they fall through to the
 *   data-driven branch below (or the diverging branch when negative).
 * - everything else (incl. percent_hundredths): [0, max * 1.2]
 *
 * @param {(number | null | undefined)[]} values
 * @param {string} [metricType]
 * @returns {{ domain: [number, number], diverging: boolean }}
 */
export const computeDomain = (values, metricType) => {
  const nums = values.filter((d) => d !== null && d !== undefined);
  if (nums.length === 0) {
    return { domain: [0, 0], diverging: false };
  }
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  if (min < 0) {
    const top = Math.max(0, max);
    const pad = DOMAIN_PADDING * (top - min);
    return { domain: [min - pad, top + pad], diverging: true };
  }
  if (metricType === "percent") {
    return { domain: [0, Math.min(1, max * (1 + DOMAIN_PADDING))], diverging: false };
  }
  return { domain: [0, max * (1 + DOMAIN_PADDING)], diverging: false };
};

/**
 * Find the reference-state geography for a bar. The comparison bar falls back to the
 * shared primaryState in the same-parent-state dedup case.
 * @param {CardGeography[]} geos
 * @param {CardGeography} barGeo
 * @returns {CardGeography | undefined}
 */
const getStateRef = (geos, barGeo) => {
  if (barGeo.role === "primary") {
    return geos.find((d) => d.role === "primaryState");
  }
  if (barGeo.role === "comparison") {
    const own = geos.find((d) => d.role === "comparisonState");
    if (own) return own;
    const primary = geos.find((d) => d.role === "primary");
    if (primary && barGeo.s_id && barGeo.s_id === primary.s_id) {
      return geos.find((d) => d.role === "primaryState");
    }
  }
  return undefined;
};

/**
 * Build the reference ticks (parent state = solid, national = dotted) for one bar.
 * @param {CardGeography[]} geos
 * @param {CardGeography} barGeo
 * @param {string} metricAccessor
 * @param {string} year
 * @returns {BarRef[]}
 */
const getBarRefs = (geos, barGeo, metricAccessor, year) => {
  /** @type {BarRef[]} */
  const refs = [];
  const stateRef = getStateRef(geos, barGeo);
  if (stateRef) {
    // tick color follows the BAR's family, not the reference geography's role — in the
    // same-parent-state dedup case the comparison bar points at the shared primaryState
    // but its tick must still render in the comparison (yellow) family
    const tickRole = barGeo.role === "comparison" ? "comparisonState" : stateRef.role;
    refs.push({
      role: stateRef.role,
      label: displayName(stateRef),
      value: stateRef.data?.[metricAccessor]?.[year] ?? null,
      variant: "solid",
      color: /** @type {string} */ (ROLE_STYLES[tickRole].tickColor)
    });
  }
  const national = geos.find((d) => d.role === "national");
  // a national-only card is its own bar; it doesn't reference itself
  if (national && barGeo.role !== "national") {
    refs.push({
      role: "national",
      label: displayName(national),
      value: national.data?.[metricAccessor]?.[year] ?? null,
      variant: "dotted",
      color: /** @type {string} */ (ROLE_STYLES.national.tickColor)
    });
  }
  return refs;
};

/**
 * Shape the bar-group (most recent year) data for a card. Owns the display-year
 * resolution; the card renders displayYear, it never computes it.
 *
 * @param {CardGeography[]} geos - from getCardGeographies
 * @param {ChartMetricMetadata} metadata - metric metadata object
 * @param {{ year?: string }} [options] - pin to a specific year instead of resolving
 *   (used by getDisaggregatedData so every subgroup shares the card-level year)
 * @returns {{ bars: BarRow[], domain: [number, number], diverging: boolean, displayYear: string }}
 */
export const getBarGroupData = (geos, metadata, { year = undefined } = {}) => {
  const metricAccessor = "m" + metadata.metric_id;
  // in the national view the national series is the bar itself
  const barGeos = geos.filter((d) => d.role === "primary" || d.role === "comparison");
  if (barGeos.length === 0) {
    const national = geos.find((d) => d.role === "national");
    if (national) barGeos.push(national);
  }
  const displayYear =
    year ?? resolveDisplayYear(barGeos[0], metricAccessor, metadata.years_available);
  const bars = barGeos.map((geo) => {
    return {
      role: geo.role,
      name: displayName(geo),
      value: geo.data?.[metricAccessor]?.[displayYear] ?? null,
      color: ROLE_STYLES[geo.role].barColor,
      refs: getBarRefs(geos, geo, metricAccessor, displayYear)
    };
  });
  const allValues = bars.flatMap((bar) => [bar.value, ...bar.refs.map((ref) => ref.value)]);
  const { domain, diverging } = computeDomain(allValues, metadata.metric_type);
  return { bars, domain, diverging, displayYear };
};

/**
 * Shape the combined multi-series trendline data for a card (lines.jpg), ordered
 * primary → comparison → primaryState → comparisonState → national with per-role styles.
 *
 * In the national-only view (no location selected) national is the card's subject rather
 * than a reference, so it takes the primary style — a solid blue line, which downstream
 * (dash === null) also earns it point markers and first/last value labels. This mirrors
 * getBarGroupData, where national becomes the bar itself. Selecting a location puts a
 * primary series back on the card and national reverts to its gray dashed reference line.
 *
 * @param {CardGeography[]} geos - from getCardGeographies
 * @param {string | number} metricId
 * @param {string | string[]} yearsAvailable
 * @returns {TrendSeries[]}
 */
export const getTrendSeriesData = (geos, metricId, yearsAvailable) => {
  const metricAccessor = "m" + metricId;
  const years = normalizeYears(yearsAvailable);
  const nationalIsSubject = !geos.some((d) => d.role === "primary" || d.role === "comparison");
  return geos
    .slice()
    .sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role))
    .map((geo) => {
      const style =
        geo.role === "national" && nationalIsSubject ? ROLE_STYLES.primary : ROLE_STYLES[geo.role];
      return {
        role: geo.role,
        name: displayName(geo),
        color: style.lineColor,
        dash: style.dash,
        values: years.map((year) => {
          return { year, value: geo.data?.[metricAccessor]?.[year] ?? null };
        })
      };
    });
};

/**
 * Legend entries for a bar-group card (mockups 3, 4, 8): for each bar its swatch, then its
 * solid parent-state tick; a single gray dotted national entry always comes last. Ticks
 * dedupe by label + color, so the same-parent-state comparison case lists the shared state
 * once per family (its tick renders blue on the primary bar, yellow on the comparison bar).
 * The cross-state comparison case yields five entries (the two-row wrap case, mockup 8).
 *
 * @param {BarRow[]} bars - from getBarGroupData
 * @returns {LegendItem[]}
 */
export const getBarLegendItems = (bars) => {
  /** @type {LegendItem[]} */
  const items = [];
  const seenTicks = new Set();
  /** @type {LegendItem | null} */
  let national = null;
  for (const bar of bars) {
    items.push({ label: bar.name, glyph: "swatch", color: bar.color });
    for (const ref of bar.refs) {
      if (ref.variant === "dotted") {
        national ??= { label: ref.label, glyph: "tick", variant: "dotted", color: ref.color };
      } else if (!seenTicks.has(`${ref.label}|${ref.color}`)) {
        seenTicks.add(`${ref.label}|${ref.color}`);
        items.push({ label: ref.label, glyph: "tick", variant: "solid", color: ref.color });
      }
    }
  }
  if (national) items.push(national);
  return items;
};

/**
 * Legend entries for a trend card (lines.jpg): one line-style glyph per series, in the
 * series' existing role order.
 *
 * @param {TrendSeries[]} series - from getTrendSeriesData
 * @returns {LegendItem[]}
 */
export const getTrendLegendItems = (series) =>
  series.map((s) => ({ label: s.name, glyph: "line", color: s.color, dash: s.dash }));

/**
 * Cheap availability probe for a metric × disaggregate across a card's geographies,
 * without full shaping: does ANY subgroup have a value for any geography and year?
 * False when the metric doesn't offer the disaggregate (its shard columns don't
 * exist), when it claims it but publishes nothing (audit A4 m222, A5 m167 at school
 * districts), or for an unknown prefix. Cards without disaggregate data show the
 * no-data message instead of a chart (settled 2026-07-15, uniform across all cards).
 *
 * @param {CardGeography[]} geos - from getCardGeographies
 * @param {ChartMetricMetadata} metadata - metric metadata object
 * @param {string} disaggPrefix - e.g. "d1"
 * @returns {boolean}
 */
export const hasDisaggregateData = (geos, metadata, disaggPrefix) => {
  const category = disaggregateMetadata.find((d) => "d" + d.prefix === disaggPrefix);
  const years = normalizeYears(metadata.years_available);
  for (const field of category?.fields ?? []) {
    for (const geo of geos) {
      const byYear = geo.data?.[`m${metadata.metric_id}_${field.value}`];
      if (!byYear) continue;
      if (years.some((y) => byYear[y] !== undefined && byYear[y] !== null)) return true;
    }
  }
  return false;
};

/** Every plotted value of one subgroup — bars + reference ticks, or all series points. */
const subgroupValues = (/** @type {{ bars?: BarRow[], series?: TrendSeries[] }} */ subgroup) =>
  subgroup.series
    ? subgroup.series.flatMap((s) => s.values.map((v) => v.value))
    : (subgroup.bars ?? []).flatMap((bar) => [bar.value, ...bar.refs.map((ref) => ref.value)]);

/**
 * Shape per-subgroup small-multiple data for a disaggregated card (mockups 7–8,
 * lines.jpg bottom half). Every field of the disaggregate category yields a subgroup;
 * ones with no values across all geographies (bars and refs alike) carry noData: true
 * and render as N/A rows rather than being omitted (settled 2026-07-15). The domain is
 * shared card-wide across every subgroup — this is where the representation-gap
 * metrics (m83, m85, m86, m104, m231–m234) produce negative values and diverging: true.
 *
 * @param {CardGeography[]} geos - from getCardGeographies
 * @param {ChartMetricMetadata} metadata - metric metadata object
 * @param {string} disaggPrefix - e.g. "d1"
 * @param {{ timeframe?: string }} [options] - "recent" → bars per subgroup, "all" → series
 * @returns {{
 *   subgroups: { field: string, label: string, bars?: BarRow[], series?: TrendSeries[], noData: boolean }[],
 *   domain: [number, number],
 *   diverging: boolean,
 *   displayYear: string
 * }}
 */
export const getDisaggregatedData = (
  geos,
  metadata,
  disaggPrefix,
  { timeframe = "recent" } = {}
) => {
  const category = disaggregateMetadata.find((d) => "d" + d.prefix === disaggPrefix);
  const fields = category ? category.fields : [];
  // card-level year: resolved from the base metric so the year subtitle matches the
  // non-disaggregated view of the same card
  const primary = geos.find((d) => d.role === "primary") ?? geos.find((d) => d.role === "national");
  const displayYear = resolveDisplayYear(
    primary,
    "m" + metadata.metric_id,
    metadata.years_available
  );

  const subgroups = fields.map((field) => {
    const fieldMetadata = { ...metadata, metric_id: `${metadata.metric_id}_${field.value}` };
    const subgroup =
      timeframe === "all"
        ? {
            field: field.value,
            label: field.label,
            series: getTrendSeriesData(geos, fieldMetadata.metric_id, metadata.years_available)
          }
        : {
            field: field.value,
            label: field.label,
            bars: getBarGroupData(geos, fieldMetadata, { year: displayYear }).bars
          };
    const noData = !subgroupValues(subgroup).some((d) => d !== null && d !== undefined);
    return { ...subgroup, noData };
  });

  const allValues = subgroups.flatMap(subgroupValues);
  const { domain, diverging } = computeDomain(allValues, metadata.metric_type);
  return { subgroups, domain, diverging, displayYear };
};

/**
 * The disaggregate prefix a card actually renders, which is not always the one the
 * section's filter asked for (dev-plan §11.4).
 *
 * A disaggregate-only metric has no base column, so "no disaggregation" would render an
 * empty chart — it substitutes its own disaggregate instead. When the filter *does* name
 * a prefix it wins, so these cards behave exactly like their peers under an active
 * filter: m190 shows race under Race, and shows the no-data message under Gender rather
 * than ignoring the filter.
 *
 * @param {string} disagg - "none" or a disaggregate prefix ("d1"…)
 * @param {ChartMetricMetadata | undefined} [metadata] - metric metadata object
 * @returns {string | undefined} the prefix to render, or undefined for the base chart
 */
export const resolveDisaggPrefix = (disagg, metadata = undefined) => {
  if (disagg && disagg !== "none") return disagg;
  return getDisaggOnlyPrefix(metadata);
};

/**
 * The single source of truth for which visualization a card renders (MetricCard's viz
 * area is one {#if} chain over this result): the pure timeframe × disaggregate matrix.
 * There are deliberately no data-driven fallbacks (settled 2026-07-15): single-year
 * metrics under "all" render the trend chart as circles-only points, and disaggregated
 * variants without subgroup data render the card-level no-data message — the variant
 * never silently changes shape.
 *
 * Passing `metadata` lets a disaggregate-only metric resolve to a disaggregated variant
 * even under "none" (see resolveDisaggPrefix); omitting it keeps the original pure
 * timeframe × disagg behaviour.
 *
 * @param {string} timeframe - "recent" | "all"
 * @param {string} disagg - "none" or a disaggregate prefix ("d1"…)
 * @param {ChartMetricMetadata | undefined} [metadata] - metric metadata object
 * @returns {"bars" | "disaggBars" | "trend" | "disaggTrends"}
 */
export const selectChartVariant = (timeframe, disagg, metadata = undefined) => {
  const disaggregated = Boolean(resolveDisaggPrefix(disagg, metadata));
  if (timeframe === "all") {
    return disaggregated ? "disaggTrends" : "trend";
  }
  return disaggregated ? "disaggBars" : "bars";
};

/**
 * Template key for the roles present in a card. Replaces the array-length heuristics of
 * the old getAltTemplate.
 * @param {SeriesRole[]} roles
 * @returns {"national" | "primary" | "primary_state" | "primary_comparison" | "primary_state_comparison"}
 */
export const getAltTemplateKey = (roles) => {
  if (!roles.includes("primary")) return "national";
  let key = "primary";
  if (roles.includes("primaryState") || roles.includes("comparisonState")) key += "_state";
  if (roles.includes("comparison")) key += "_comparison";
  return /** @type {"primary" | "primary_state" | "primary_comparison" | "primary_state_comparison"} */ (
    key
  );
};

/**
 * The metric id to build a representative series from. Normally the metric's own id — but
 * a disaggregate-only metric has no base series, so return the first subgroup id any
 * geography has data for. Used only for alt-text year ranges, never for what is plotted.
 *
 * @param {CardGeography[]} geos
 * @param {ChartMetricMetadata} metadata
 * @returns {string | number}
 */
const firstPopulatedAccessorId = (geos, metadata) => {
  const prefix = getDisaggOnlyPrefix(metadata);
  if (!prefix) return metadata.metric_id;
  const category = disaggregateMetadata.find((d) => "d" + d.prefix === prefix);
  for (const field of category?.fields ?? []) {
    const id = `${metadata.metric_id}_${field.value}`;
    if (geos.some((geo) => geo.data?.[`m${id}`])) return id;
  }
  return metadata.metric_id;
};

const firstNonNull = (/** @type {{year: number, value: number | null}[]} */ values) =>
  values.find((v) => v.value !== null);
const lastNonNull = (/** @type {{year: number, value: number | null}[]} */ values) =>
  values
    .slice()
    .reverse()
    .find((v) => v.value !== null);

/**
 * Generate the card aria-label from role-tagged geographies. Replaces the inline
 * getAltTemplate/getChartLabel pair in the old MetricCard (not ported).
 *
 * Expected template shape (lands in chart-alt.aml in Phase 5; tested against fixture
 * objects until then):
 *   {
 *     barsAlt:         { national, primary, primary_state, primary_comparison, primary_state_comparison },
 *     trendAlt:        { …same keys… },
 *     disaggBarsAlt:   { …same keys… },
 *     disaggTrendsAlt: { …same keys… }
 *   }
 * Bar variables: {{year}} {{metric}} {{primary_name}} {{primary_value}} {{state_name}}
 * {{state_value}} {{comparison_name}} {{comparison_value}} {{national_value}}.
 * Trend variables: same names with _first/_last suffixes on values, plus
 * {{year_first}}/{{year_last}}.
 *
 * @param {CardGeography[]} geos - from getCardGeographies
 * @param {ChartMetricMetadata} metadata - metric metadata object
 * @param {Object<string, Object<string, string>>} templates - see shape above
 * @param {{ variant?: "bars" | "disaggBars" | "trend" | "disaggTrends" }} [options]
 * @returns {string}
 */
export const getChartAltText = (geos, metadata, templates, { variant = "bars" } = {}) => {
  const sections = {
    bars: templates.barsAlt,
    trend: templates.trendAlt,
    disaggBars: templates.disaggBarsAlt,
    disaggTrends: templates.disaggTrendsAlt
  };
  const section = sections[variant];
  const template = section?.[getAltTemplateKey(geos.map((d) => d.role))];
  if (!template) return "";

  const format = (/** @type {number | null | undefined} */ d) =>
    formatFun(/** @type {*} */ (d ?? null), metadata.metric_type);
  /** @type {Object<string, string>} */
  const variables = { metric: metadata.metric_full_name ?? "" };
  /** @type {Object<string, string>} */
  const varPrefixes = {
    primary: "primary",
    comparison: "comparison",
    primaryState: "state",
    national: "national"
  };

  if (variant === "trend" || variant === "disaggTrends") {
    // A disaggregate-only metric has no base series, so the year range would come back
    // empty; read it off the first subgroup that has data instead (every subgroup shares
    // the card's year set, so any of them dates the card correctly).
    const trendSeries = getTrendSeriesData(
      geos,
      firstPopulatedAccessorId(geos, metadata),
      metadata.years_available
    );
    for (const series of trendSeries) {
      const prefix = varPrefixes[series.role];
      if (!prefix) continue;
      const first = firstNonNull(series.values);
      const last = lastNonNull(series.values);
      variables[`${prefix}_name`] = series.name;
      variables[`${prefix}_value_first`] = format(first?.value);
      variables[`${prefix}_value_last`] = format(last?.value);
      if (series.role === "primary" || (series.role === "national" && !variables.year_first)) {
        variables.year_first = (first?.year ?? "").toString();
        variables.year_last = (last?.year ?? "").toString();
      }
    }
  } else {
    const { bars, displayYear } = getBarGroupData(geos, metadata);
    variables.year = displayYear;
    for (const geo of geos) {
      const prefix = varPrefixes[geo.role];
      if (!prefix) continue;
      variables[`${prefix}_name`] = displayName(geo);
      variables[`${prefix}_value`] = format(
        geo.data?.["m" + metadata.metric_id]?.[displayYear] ?? null
      );
    }
    // national-only cards label the national series as the primary subject
    if (bars.length === 1 && bars[0].role === "national") {
      variables.primary_name = bars[0].name;
      variables.primary_value = format(bars[0].value);
    }
  }
  return formatDynamicText(template, variables);
};
