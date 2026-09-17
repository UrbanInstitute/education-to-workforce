// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

import { describe, it, expect } from "vitest";
import getContextCharacteristics from "./getContextCharacteristics";
import { getDisaggregateMeta } from "./disaggregates";

// Subgroup and category names are display labels in disaggregates.json. Read them from the
// metadata instead of restating them here, so relabeling a subgroup stays a data change.
const RACE = getDisaggregateMeta(1);
const GENDER = getDisaggregateMeta(2);
/** @param {{ fields: { value: string, label: string }[] }} meta */
const labels = (meta) => meta.fields.map((f) => f.label);
/** @param {string} value - a disaggregates.json field key, e.g. "d2_male" */
const genderLabel = (value) => GENDER.fields.find((f) => f.value === value)?.label;

// contextVars fixture mirrors data.metadata.context: context.json entries after
// +page.js parseContextData (disaggregate → number[], geo_levels → string[]),
// keyed by geo_id. Disaggregate prefixes resolve against the real disaggregates.json
// (prefix 1 = race/ethnicity with 8 fields, prefix 2 = sex with 3).
const CONTEXT_VARS = new Map([
  [
    "geo_population",
    {
      geo_id: "geo_population",
      geo_name: "Population",
      type: "numeric",
      disaggregate: [2],
      geo_levels: ["states", "counties", "tract"]
    }
  ],
  ["geo_medincome", { geo_id: "geo_medincome", geo_name: "Median income", type: "currency" }],
  [
    "metric50",
    {
      geo_id: "metric50",
      geo_name: "K-12 students",
      type: "percent",
      disaggregate: [2],
      geo_levels: ["states", "counties", "tract"]
    }
  ]
]);

const CONTEXT_DATA = {
  geoid: "06075",
  geo_population: 815201,
  geo_population_d2_male: 420000,
  geo_population_d2_female: 395201,
  geo_medincome: 126187,
  metric50_d2_male: 0.51
  // metric50_d2_female deliberately missing
};

describe("getContextCharacteristics", () => {
  it("splits primary stats from breakdown groups and formats values", () => {
    const { primary, breakdowns } = getContextCharacteristics(
      CONTEXT_DATA,
      CONTEXT_VARS,
      "counties"
    );

    expect(primary.map((d) => d.label)).toEqual(["Population", "Median income"]);
    expect(primary[0].values).toEqual([{ label: undefined, value: "815,201" }]);
    expect(primary[1].values[0].value).toBe("$130k");

    // Population's sex breakdown + metric50's (metric-prefixed vars are breakdown-only)
    expect(breakdowns.map((d) => d.label)).toEqual(["Population", "K-12 students"]);
    // one group per declared prefix, headed by the disaggregate's category_name
    expect(breakdowns[0].disaggregations.map((d) => d.label)).toEqual([GENDER.category_name]);
    expect(breakdowns[0].disaggregations[0].values.map((v) => v.label)).toEqual(labels(GENDER));
    expect(breakdowns[0].disaggregations[0].values[0].value).toBe("420,000");
  });

  it("gives each declared disaggregate prefix its own group, in declaration order", () => {
    const vars = new Map([
      [
        "geo_population",
        {
          geo_id: "geo_population",
          geo_name: "Population",
          type: "numeric",
          disaggregate: [1, 2],
          geo_levels: ["states", "counties", "tract"]
        }
      ]
    ]);

    const { breakdowns } = getContextCharacteristics(CONTEXT_DATA, vars, "counties");

    expect(breakdowns).toHaveLength(1);
    expect(breakdowns[0].label).toBe("Population");
    expect(breakdowns[0].disaggregations.map((d) => d.label)).toEqual([
      RACE.category_name,
      GENDER.category_name
    ]);
    // the race group carries only race subgroups — the flat list this replaced mixed both
    expect(breakdowns[0].disaggregations[0].values.map((v) => v.label)).toEqual(labels(RACE));
    expect(breakdowns[0].disaggregations[1].values.map((v) => v.value)).toEqual([
      "420,000",
      "395,201",
      "N/A"
    ]);
  });

  it("renders a missing subgroup key as N/A instead of dropping it", () => {
    const { breakdowns } = getContextCharacteristics(CONTEXT_DATA, CONTEXT_VARS, "counties");
    const k12 = breakdowns.find((d) => d.label === "K-12 students");
    expect(k12?.disaggregations[0].values).toEqual([
      { label: genderLabel("d2_male"), value: "51%" },
      { label: genderLabel("d2_female"), value: "N/A" },
      { label: genderLabel("d2_unk"), value: "N/A" }
    ]);
  });

  it("filters out variables not offered at the current level", () => {
    const { primary, breakdowns } = getContextCharacteristics(
      CONTEXT_DATA,
      CONTEXT_VARS,
      "school_districts"
    );
    // geo_population and metric50 are limited to states/counties/tract
    expect(primary.map((d) => d.label)).toEqual(["Median income"]);
    expect(breakdowns).toEqual([]);
  });

  it('treats the metadata\'s singular "tract" as the "tracts" level', () => {
    // v1 compared raw strings, hiding Population at the tract level despite the shards
    // carrying the data
    const { primary } = getContextCharacteristics(CONTEXT_DATA, CONTEXT_VARS, "tracts");
    expect(primary.map((d) => d.label)).toContain("Population");
  });

  // The workbook is hand-written and inconsistent, and audit-data-availability.R already
  // accepted all of these spellings — so a claim could pass the audit and still render
  // nothing here (dev-plan §11.8).
  it.each(["school_districts", "school districts", "school-districts", "leaid"])(
    'accepts "%s" as the school-districts level',
    (token) => {
      const vars = new Map([
        [
          "geo_student_pop",
          {
            geo_id: "geo_student_pop",
            geo_name: "Student population",
            type: "numeric",
            geo_levels: [token]
          }
        ]
      ]);
      const { primary } = getContextCharacteristics(
        { geoid: "0100005", geo_student_pop: 5338 },
        vars,
        "school_districts"
      );
      expect(primary.map((d) => d.label)).toEqual(["Student population"]);
    }
  );
});

// The national record has no level of its own, so the drawer shows it whatever level the
// URL names, and presence in the record replaces the level claim as the filter
// (settled 2026-07-23, dev-plan §11.7).
describe("getContextCharacteristics — national record (ignoreLevelClaims)", () => {
  const NATIONAL_VARS = new Map([
    [
      "geo_population",
      {
        geo_id: "geo_population",
        geo_name: "Population",
        type: "numeric",
        geo_levels: ["states", "counties", "tract"]
      }
    ],
    ["geo_medincome", { geo_id: "geo_medincome", geo_name: "Median income", type: "currency" }],
    [
      "geo_student_pop",
      {
        geo_id: "geo_student_pop",
        geo_name: "Student population",
        type: "numeric",
        geo_levels: ["school_districts"]
      }
    ]
  ]);

  const NATIONAL_DATA = {
    geoid: "00",
    name: "United States",
    geo_population: 332387540,
    geo_medincome: 78538
    // no geo_student_pop — the nation has no school-district student count
  };

  it("shows level-claimed variables at a level the claim excludes", () => {
    // a user at the school-districts level with no geography selected still sees Population
    const { primary } = getContextCharacteristics(
      NATIONAL_DATA,
      NATIONAL_VARS,
      "school_districts",
      {
        ignoreLevelClaims: true
      }
    );
    expect(primary.map((d) => d.label)).toEqual(["Population", "Median income"]);
  });

  it("omits variables the national record doesn't carry", () => {
    // bypassing the claims must not surface school-district-only variables as N/A rows
    const { primary } = getContextCharacteristics(NATIONAL_DATA, NATIONAL_VARS, "states", {
      ignoreLevelClaims: true
    });
    expect(primary.map((d) => d.label)).not.toContain("Student population");
  });

  it("still renders a claimed-but-absent variable as N/A for a real geography", () => {
    // geo_pctba at school districts is the live case — deliberately N/A, not hidden
    // (settled 2026-07-23; this is the behaviour ignoreLevelClaims must NOT change)
    const vars = new Map([
      ["geo_pctba", { geo_id: "geo_pctba", geo_name: "College educated", type: "percent" }]
    ]);
    const { primary } = getContextCharacteristics(
      { geoid: "0100005", geo_medincome: 57103 },
      vars,
      "school_districts"
    );
    expect(primary).toEqual([
      { label: "College educated", values: [{ label: undefined, value: "N/A" }], primary: true }
    ]);
  });
});
