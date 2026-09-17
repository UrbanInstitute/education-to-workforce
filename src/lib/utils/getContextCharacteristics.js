// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

import { formatFun } from "$utils/formatFun";
import { getDisaggregateMeta } from "$utils/disaggregates";

/**
 * @typedef {Object} CharacteristicValue
 * @property {string | undefined} label - subgroup label (undefined for a primary value)
 * @property {string} value - display-formatted value
 *
 * @typedef {Object} Characteristic
 * @property {string} label - the context variable's display name ("Population")
 * @property {CharacteristicValue[]} values
 * @property {boolean} primary - top-level stat (true) vs disaggregate breakdown group (false)
 *
 * @typedef {Object} Disaggregation
 * @property {string} label - the disaggregation's display name from disaggregates.json
 *   ("Race or ethnicity", "Gender")
 * @property {CharacteristicValue[]} values
 *
 * @typedef {Object} Breakdown
 * @property {string} label - the context variable's display name ("Population")
 * @property {Disaggregation[]} disaggregations - one entry per declared disaggregate prefix,
 *   in the order context.json declares them
 */

/**
 * Normalize a geo_levels token from the source workbook to an internal level id. The
 * workbook is written by hand and is inconsistent ("tract" singular, "states" plural), so
 * accept any reasonable spelling rather than failing silently.
 *
 * This deliberately mirrors `normalize_level` in data/R/audit-data-availability.R. The two
 * previously disagreed — the audit accepted "school districts"/"leaid"/"district" while
 * this only special-cased "tract" — which meant a claim could pass the audit and still
 * render nothing in the drawer (dev-plan §11.8).
 *
 * @param {string} level
 * @returns {string} internal level id
 */
const normalizeLevel = (level) => {
  const token = level.trim().toLowerCase();
  if (token === "state" || token === "states") return "states";
  if (token === "county" || token === "counties") return "counties";
  if (token === "tract" || token === "tracts") return "tracts";
  if (/school|leaid|district/.test(token)) return "school_districts";
  return token;
};

/**
 * Does a context variable apply at this level? (v1's ContextStats compared raw strings,
 * which silently hid Population at the tract level even though the tract context shards
 * carry the data.)
 * @param {string[] | undefined} geoLevels - parsed geo_levels list (see +page.js parseContextData)
 * @param {string} geoLevel - internal level id ("states", "counties", "tracts", "school_districts")
 * @returns {boolean}
 */
const appliesAtLevel = (geoLevels, geoLevel) => {
  if (!geoLevels) return true;
  return geoLevels.some((level) => normalizeLevel(level) === geoLevel);
};

/**
 * Shape a geography's context shard record into display-ready characteristics for the
 * "Local population characteristics" drawer. Pure port of Page2/ContextStats.svelte's
 * contextualDataVars derivation, split into its primary/breakdown halves.
 *
 * @param {Object<string, *>} contextData - the geography's context shard record
 * @param {Map<string, *>} contextVars - parsed context.json metadata (data.metadata.context)
 * @param {string} geoLevel - internal level id ("school_districts")
 * @param {{ ignoreLevelClaims?: boolean }} [options] - `true` for the national record, whose
 *   characteristics are level-independent: the drawer shows them whatever level the URL names,
 *   since no geography is selected to have a level (settled 2026-07-23, dev-plan §11.7).
 * @returns {{ primary: Characteristic[], breakdowns: Breakdown[] }}
 */
export default function getContextCharacteristics(
  contextData,
  contextVars,
  geoLevel,
  { ignoreLevelClaims = false } = {}
) {
  const contextDataKeys = Object.keys(contextData);
  /** @type {Characteristic[]} */
  const primary = [];
  /** @type {Breakdown[]} */
  const breakdowns = [];
  for (const d of contextVars.values()) {
    if (!ignoreLevelClaims) {
      if (!appliesAtLevel(d.geo_levels, geoLevel)) continue;
      // NOTE: a claimed variable the shard doesn't carry deliberately renders as N/A rather
      // than being hidden — geo_pctba at school districts is the live case (settled
      // 2026-07-23: it matches the published version; dev-plan §11.8).
    } else if (
      // the national record has no level, so presence in the record replaces the level
      // claim as the filter — otherwise bypassing the claims would surface every
      // variable, including school-district-only ones like geo_student_pop
      !contextDataKeys.some((key) => key === d.geo_id || key.startsWith(`${d.geo_id}_`))
    ) {
      continue;
    }
    // "metric"-prefixed context variables carry only disaggregates, no top-level value
    if (!d.geo_id.includes("metric")) {
      primary.push({
        label: d.geo_name,
        values: [{ label: undefined, value: formatFun(contextData[d.geo_id], d.type + "_axis") }],
        primary: true
      });
    }
    if (d.disaggregate && d.disaggregate.length > 0) {
      // one group per declared disaggregate prefix rather than one flat list per variable:
      // the drawer heads each with the prefix's category_name ("Race or ethnicity", "Gender")
      /** @type {Disaggregation[]} */
      const disaggregations = [];
      for (const dId of d.disaggregate) {
        const disaggMeta = getDisaggregateMeta(dId);
        if (!disaggMeta) continue;
        /** @type {CharacteristicValue[]} */
        const values = disaggMeta.fields.map((disagGroup) => {
          const metricKey = `${d.geo_id}_${disagGroup.value}`;
          return {
            label: disagGroup.label,
            // a subgroup key missing from the shard renders as formatFun's null display
            value: formatFun(
              contextDataKeys.includes(metricKey) ? contextData[metricKey] : null,
              d.type + "_axis"
            )
          };
        });
        if (values.length > 0) disaggregations.push({ label: disaggMeta.category_name, values });
      }
      // a variable whose every prefix is unresolvable contributes no heading at all
      if (disaggregations.length > 0) breakdowns.push({ label: d.geo_name, disaggregations });
    }
  }
  return { primary, breakdowns };
}
