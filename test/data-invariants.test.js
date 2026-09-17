// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

import { describe, it, expect } from "vitest";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import metrics from "../src/data/metadata/metrics.json";

// Committed-artifact invariants (dev plan §5.4 A12, §11.3). The frontend gates metric
// selection on the geo_{level} flags and fetches the map shard unconditionally for the
// selected metric, so every flag claim must be backed by a published shard.
// `npm run data:reconcile` repairs violations; these tests keep drift from landing in a
// commit unnoticed (the R audit is manual and slow).

const LEVELS = ["states", "counties", "school_districts", "tracts"];

/** @param {string} level */
const shardIdsFor = (level) => {
  const dir = fileURLToPath(new URL(`../static/data/map/${level}`, import.meta.url));
  return new Set(
    readdirSync(dir)
      .map((f) => f.match(new RegExp(`^map_${level}_m(\\d+)\\.json$`))?.[1])
      .filter(Boolean)
      .map(Number)
  );
};

// Disaggregate-only metrics (m190; m50 once its data lands) publish subgroup columns but
// no base column, and preprocess-map-data.R drops every `_d` column — so they can never
// have a map shard, and reconcile deliberately leaves their flags alone. They are
// exempt from the claim→shard rule and subject to its inverse instead.
const disaggOnly = metrics.filter((m) => m.disagg_only === true);
const mappable = metrics.filter((m) => m.disagg_only !== true);

describe("metrics.json geo_{level} flags vs static/data/map shards", () => {
  it.each(LEVELS)("every geo_%s claim has a map shard", (level) => {
    const shardIds = shardIdsFor(level);
    const claimedWithoutShard = mappable
      .filter((m) => m[`geo_${level}`] === true && !shardIds.has(m.metric_id))
      .map((m) => m.metric_id);
    expect(claimedWithoutShard).toEqual([]);
  });

  // A stale shard for a metric that has since become disaggregate-only would let the
  // frontend offer it as a map layer again — the exact A12 failure, from the other side.
  it.each(LEVELS)("no disagg_only metric has a %s map shard", (level) => {
    const shardIds = shardIdsFor(level);
    const unexpectedShard = disaggOnly
      .filter((m) => shardIds.has(m.metric_id))
      .map((m) => m.metric_id);
    expect(unexpectedShard).toEqual([]);
  });
});

describe("disaggregate-only metrics", () => {
  // A disagg-only card renders its subgroups and nothing else, so it has no chart at all
  // without a disaggregate prefix to key off. in_tool scoped: m160 is disagg_only but
  // never enabled, and carries no disag_available claim.
  it("every in_tool disagg_only metric declares disag_available", () => {
    const missing = disaggOnly
      .filter((m) => m.in_tool === true)
      .filter((m) => !m.disag_available || m.disag_available === "FALSE")
      .map((m) => m.metric_id);
    expect(missing).toEqual([]);
  });
});
