// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

/**
 * Hand-written shard/metadata fixtures for getChartData tests, mirroring the real
 * shapes: geography objects `{ name, short_name?, s_id?, data }` where data is
 * metric accessor → year → value, and metrics.json metadata objects.
 *
 * Metric fixtures:
 * - m1: percent, three years, race/ethnicity disaggregates (mirrors a typical in-tool metric)
 * - m2: currency, single string year (exercises the trend → bars fallback)
 * - m3: percent where sub-state geographies lack the most recent year (displayYear fallback)
 * - m83: percent_hundredths representation-gap metric with negative disaggregated values
 *   (mirrors the real m83/m85/m86/m104/m231–m234 family, dev-plan §8.1)
 * - m4: claims the race disaggregate but publishes no subgroup columns anywhere
 *   (mirrors the real m222, audit A4 — all-empty → base-chart fallback)
 * - m5: multi-year base but single-year disaggregates
 *   (mirrors the real m63/m106, audit A6 — disaggTrends → disaggBars fallback)
 * - m190: disaggregate-only — race subgroups but NO base m190 accessor, and its declared
 *   years_available runs one year past the published data (mirrors the real m190 exactly,
 *   dev-plan §11: the 2023 claim with data only through 2022)
 */

export const NATIONAL = {
  name: "National",
  data: {
    m1: { 2019: 0.5, 2020: 0.52, 2021: 0.55 },
    m1_d1_white: { 2019: 0.55, 2020: 0.56, 2021: 0.58 },
    m1_d1_black: { 2019: 0.42, 2020: 0.44, 2021: 0.45 },
    m2: { 2020: 50000 },
    m3: { 2019: 0.3, 2020: 0.32, 2021: 0.35 },
    m83: { 2019: 0.01, 2020: 0.02 },
    m83_d1_white: { 2019: 0.05, 2020: 0.06 },
    m83_d1_black: { 2019: -0.04, 2020: -0.05 },
    m4: { 2019: 0.6, 2020: 0.62 },
    m5: { 2019: 0.7, 2020: 0.72 },
    m5_d1_white: { 2020: 0.75 },
    m5_d1_black: { 2020: 0.65 },
    // no base m190 accessor on purpose
    m190_d1_white: { 2019: 0.5, 2020: 0.51 },
    m190_d1_black: { 2019: 0.15, 2020: 0.16 }
  }
};

export const STATES = {
  "01": {
    name: "Alabama",
    short_name: "Alabama",
    data: {
      m1: { 2019: 0.45, 2020: 0.47, 2021: 0.5 },
      m1_d1_white: { 2019: 0.5, 2020: 0.52, 2021: 0.53 },
      m1_d1_black: { 2019: 0.38, 2020: 0.4, 2021: 0.41 },
      m2: { 2020: 45000 },
      m3: { 2019: 0.28, 2020: 0.3, 2021: 0.31 },
      m83: { 2019: 0.015, 2020: 0.02 },
      m83_d1_white: { 2019: 0.04, 2020: 0.05 },
      m83_d1_black: { 2019: -0.03, 2020: -0.04 },
      m4: { 2019: 0.58, 2020: 0.6 },
      m5: { 2019: 0.68, 2020: 0.7 },
      m5_d1_white: { 2020: 0.73 },
      m5_d1_black: { 2020: 0.63 },
      m190_d1_white: { 2019: 0.6, 2020: 0.61 },
      m190_d1_black: { 2019: 0.26, 2020: 0.27 }
    }
  },
  "02": {
    name: "Alaska",
    short_name: "Alaska",
    data: {
      m1: { 2019: 0.48, 2020: 0.5, 2021: 0.53 },
      m2: { 2020: 52000 },
      m3: { 2019: 0.29, 2020: 0.31, 2021: 0.33 },
      m83: { 2019: 0.01, 2020: 0.015 }
    }
  }
};

export const COUNTY_01001 = {
  name: "Autauga County, Alabama",
  short_name: "Autauga County, AL",
  s_id: "01",
  data: {
    m1: { 2019: 0.4, 2020: 0.42, 2021: 0.44 },
    m1_d1_white: { 2019: 0.46, 2020: 0.47, 2021: 0.48 },
    m1_d1_black: { 2019: 0.33, 2020: 0.35, 2021: 0.36 },
    m2: { 2020: 42000 },
    // m3: no 2021 value — exercises the displayYear fallback walk
    m3: { 2019: 0.25, 2020: 0.27 },
    m83: { 2019: 0.02, 2020: 0.03 },
    m83_d1_white: { 2019: 0.06, 2020: 0.07 },
    m83_d1_black: { 2019: -0.05, 2020: -0.06 },
    m4: { 2019: 0.55, 2020: 0.57 },
    m5: { 2019: 0.66, 2020: 0.68 },
    m5_d1_white: { 2020: 0.71 },
    m5_d1_black: { 2020: 0.61 },
    m190_d1_white: { 2019: 0.7, 2020: 0.71 },
    m190_d1_black: { 2019: 0.2, 2020: 0.21 }
  }
};

// same parent state as COUNTY_01001 (dedup case)
export const COUNTY_01003 = {
  name: "Baldwin County, Alabama",
  short_name: "Baldwin County, AL",
  s_id: "01",
  data: {
    m1: { 2019: 0.43, 2020: 0.45, 2021: 0.47 },
    m1_d1_white: { 2019: 0.48, 2020: 0.49, 2021: 0.5 },
    m2: { 2020: 44000 },
    m3: { 2019: 0.26, 2020: 0.28, 2021: 0.29 },
    m83: { 2019: 0.01, 2020: 0.02 }
  }
};

// different parent state (full five-role case)
export const COUNTY_02013 = {
  name: "Aleutians East Borough, Alaska",
  short_name: "Aleutians East, AK",
  s_id: "02",
  data: {
    m1: { 2019: 0.46, 2020: 0.48, 2021: 0.51 },
    m2: { 2020: 48000 },
    m3: { 2019: 0.27, 2020: 0.29, 2021: 0.3 }
  }
};

export const METRIC_PERCENT = {
  metric_id: 1,
  metric_full_name: "Share of students meeting the test benchmark",
  metric_type: "percent",
  years_available: ["2019", "2020", "2021"],
  disag_available: ["1"]
};

export const METRIC_CURRENCY_SINGLE_YEAR = {
  metric_id: 2,
  metric_full_name: "Median household income",
  metric_type: "currency",
  years_available: "2020",
  disag_available: "FALSE"
};

export const METRIC_MISSING_RECENT = {
  metric_id: 3,
  metric_full_name: "Share of adults with a credential",
  metric_type: "percent",
  years_available: ["2019", "2020", "2021"],
  disag_available: "FALSE"
};

export const METRIC_GAP = {
  metric_id: 83,
  metric_full_name: "Teachers of color relative to share of student body",
  metric_type: "percent_hundredths",
  years_available: ["2019", "2020"],
  disag_available: ["1"]
};

export const METRIC_DISAGG_EMPTY = {
  metric_id: 4,
  metric_full_name: "Students in schools offering AP courses",
  metric_type: "percent",
  years_available: ["2019", "2020"],
  disag_available: ["1"]
};

export const METRIC_DISAGG_SINGLE_YEAR = {
  metric_id: 5,
  metric_full_name: "Students meeting grade-level standards",
  metric_type: "percent",
  years_available: ["2019", "2020"],
  disag_available: ["1"]
};

export const METRIC_DISAGG_ONLY = {
  metric_id: 190,
  metric_full_name: "Student body composition by race and ethnicity",
  metric_type: "percent",
  // declares one year past the published data, like the real m190
  years_available: ["2019", "2020", "2021"],
  disag_available: "1",
  disagg_only: true
};

export const ALT_TEMPLATES = {
  barsAlt: {
    national: "Bar chart of {{metric}} nationally: {{national_value}} in {{year}}.",
    primary:
      "Bar chart of {{metric}} in {{primary_name}}: {{primary_value}} in {{year}}, compared to {{national_value}} nationally.",
    primary_state:
      "Bar chart of {{metric}} in {{primary_name}}: {{primary_value}} in {{year}}, compared to {{state_value}} in {{state_name}} and {{national_value}} nationally.",
    primary_comparison:
      "Bar chart of {{metric}} in {{primary_name}} ({{primary_value}}) and {{comparison_name}} ({{comparison_value}}) in {{year}}, compared to {{national_value}} nationally.",
    primary_state_comparison:
      "Bar chart of {{metric}} in {{primary_name}} ({{primary_value}}) and {{comparison_name}} ({{comparison_value}}) in {{year}}, compared to {{state_value}} in {{state_name}} and {{national_value}} nationally."
  },
  trendAlt: {
    national:
      "Line chart of {{metric}} nationally, from {{national_value_first}} in {{year_first}} to {{national_value_last}} in {{year_last}}.",
    primary:
      "Line chart of {{metric}} in {{primary_name}}, from {{primary_value_first}} in {{year_first}} to {{primary_value_last}} in {{year_last}}.",
    primary_state:
      "Line chart of {{metric}} in {{primary_name}}, from {{primary_value_first}} to {{primary_value_last}} between {{year_first}} and {{year_last}}, with {{state_name}} and national reference lines.",
    primary_comparison:
      "Line chart of {{metric}} in {{primary_name}} ({{primary_value_first}} to {{primary_value_last}}) and {{comparison_name}} ({{comparison_value_first}} to {{comparison_value_last}}) between {{year_first}} and {{year_last}}.",
    primary_state_comparison:
      "Line chart of {{metric}} in {{primary_name}} ({{primary_value_first}} to {{primary_value_last}}) and {{comparison_name}} ({{comparison_value_first}} to {{comparison_value_last}}) between {{year_first}} and {{year_last}}, with state and national reference lines."
  },
  disaggBarsAlt: {
    national: "Disaggregated bar chart of {{metric}} nationally in {{year}}.",
    primary: "Disaggregated bar chart of {{metric}} in {{primary_name}} in {{year}}.",
    primary_state:
      "Disaggregated bar chart of {{metric}} in {{primary_name}} in {{year}}, with state and national references.",
    primary_comparison:
      "Disaggregated bar chart of {{metric}} in {{primary_name}} and {{comparison_name}} in {{year}}.",
    primary_state_comparison:
      "Disaggregated bar chart of {{metric}} in {{primary_name}} and {{comparison_name}} in {{year}}, with state and national references."
  },
  disaggTrendsAlt: {
    national:
      "Disaggregated line charts of {{metric}} nationally, {{year_first}} to {{year_last}}.",
    primary:
      "Disaggregated line charts of {{metric}} in {{primary_name}}, {{year_first}} to {{year_last}}.",
    primary_state:
      "Disaggregated line charts of {{metric}} in {{primary_name}}, {{year_first}} to {{year_last}}, with state and national reference lines.",
    primary_comparison:
      "Disaggregated line charts of {{metric}} in {{primary_name}} and {{comparison_name}}, {{year_first}} to {{year_last}}.",
    primary_state_comparison:
      "Disaggregated line charts of {{metric}} in {{primary_name}} and {{comparison_name}}, {{year_first}} to {{year_last}}, with state and national reference lines."
  }
};
