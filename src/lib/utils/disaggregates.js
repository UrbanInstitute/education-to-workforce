// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

import disaggregateMetadata from "$data/metadata/disaggregates.json";

/**
 * Looks up the disaggregate metadata based on the id
 * @param {number} id
 * @returns {import("$utils/types/DisaggregateMetadata").DisaggregateMetadata | undefined}
 */
export function getDisaggregateMeta(id) {
  return disaggregateMetadata?.find((d) => +d.prefix === id);
}

/**
 * Normalize metrics.json `disag_available` to a list of prefix ids. jsonlite auto-unboxes
 * a single-element list to a bare string, and metrics with no disaggregates carry either
 * `null` or the literal string "FALSE" — all four shapes appear in the published file.
 * @param {string | string[] | null | undefined} disagAvailable
 * @returns {string[]}
 */
export function parseDisagAvailable(disagAvailable) {
  if (!disagAvailable || disagAvailable === "FALSE") return [];
  return Array.isArray(disagAvailable) ? disagAvailable : [disagAvailable];
}

/**
 * A disaggregate-only metric publishes subgroup columns but no base `m{id}` column,
 * because the metric is inherently about how subgroups compare (m190 student-body
 * composition by race; m50 workforce composition by income). The pipeline derives the
 * flag from the source columns — see preprocess-metadata.R / dev-plan §11.
 *
 * These cards always render their own disaggregate, never the plain bar/trend chart,
 * and can never be a map layer (preprocess-map-data.R drops every `_d` column).
 *
 * @param {{ metric_id?: number | string, disagg_only?: boolean } | undefined} metadata -
 *   metrics.json entry
 * @returns {boolean}
 */
export function isDisaggOnly(metadata) {
  return metadata?.disagg_only === true;
}

/**
 * The disaggregate prefix a disaggregate-only card renders ("d1", "d7"). Such a metric
 * has exactly one meaningful disaggregate — the one its columns are published under — so
 * the first declared prefix is it. Returns undefined for anything else, including a
 * disagg-only metric with no `disag_available` claim (m160, never enabled; guarded by
 * test/data-invariants.test.js for in_tool metrics).
 *
 * @param {{ metric_id?: number | string, disagg_only?: boolean,
 *   disag_available?: string | string[] | null } | undefined} metadata
 * @returns {string | undefined}
 */
export function getDisaggOnlyPrefix(metadata) {
  if (!isDisaggOnly(metadata)) return undefined;
  const prefixes = parseDisagAvailable(metadata?.disag_available);
  return prefixes.length ? `d${prefixes[0]}` : undefined;
}

/**
 * Does a geography have any value for this metric? Data presence normally means the base
 * `m{id}` accessor exists, but a disaggregate-only metric never has one — probe its
 * subgroup keys instead, or it can never leave the "no data" bucket (dev-plan §11.4).
 *
 * Key presence only, matching the previous `Object.hasOwn` check: the shards omit the key
 * entirely when a geography has no data, and a present-but-all-null series is a card that
 * renders N/A rather than one that is absent.
 *
 * @param {Object<string, *> | undefined} geoData - a geography's `data` object
 * @param {{ metric_id: number | string, disagg_only?: boolean } | undefined} metadata
 * @returns {boolean}
 */
export function hasMetricData(geoData, metadata) {
  if (!geoData || !metadata) return false;
  if (!isDisaggOnly(metadata)) {
    return Object.hasOwn(geoData, `m${metadata.metric_id}`);
  }
  const prefix = `m${metadata.metric_id}_`;
  return Object.keys(geoData).some((key) => key.startsWith(prefix));
}
