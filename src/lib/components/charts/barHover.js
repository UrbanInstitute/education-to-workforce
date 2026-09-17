// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

/**
 * Pure snapping math for the bar-row hover layer: given the pointer's px position along
 * the track, decide which mark it is closest to. Candidates are the bar's endpoint and
 * each reference tick, all expressed as track percentages (percentRange scale output).
 * The bar endpoint is a dead zone — its direct value label already shows the value — so
 * the caller shows a tooltip only for tick targets.
 */

/**
 * The bar group's shared hover state: the row the snapped tick belongs to, the refs
 * whose values the tooltip lists (coincident ticks share one), and the anchor element
 * (at the winning tick's x) the tooltip pins to.
 * @typedef {{
 *   rowRole: import("$utils/getChartData").SeriesRole,
 *   refs: import("$utils/getChartData").BarRef[],
 *   el: HTMLElement
 * }} BarActive
 */

/** Ticks within this px distance of the winning tick join its tooltip. */
const OVERLAP_PX = 4;

/**
 * @param {{
 *   pointerPx: number,
 *   trackWidth: number,
 *   barPct: number | null,
 *   tickPcts: number[],
 *   overlapPx?: number
 * }} args - barPct/tickPcts are track percentages; pointer/track/overlap are px
 * @returns {{ kind: "bar" } | { kind: "ticks", tickIndexes: number[], anchorIndex: number } | null}
 *   null when nothing is hoverable (no candidates, or an unmeasured track);
 *   anchorIndex is the winning (nearest) tick, the one the tooltip pins to
 */
export const snapTarget = ({ pointerPx, trackWidth, barPct, tickPcts, overlapPx = OVERLAP_PX }) => {
  if (trackWidth <= 0) return null;
  const toPx = (/** @type {number} */ pct) => (pct / 100) * trackWidth;

  const tickDists = tickPcts.map((pct) => Math.abs(toPx(pct) - pointerPx));
  const nearestTick = tickDists.reduce(
    (best, dist, i) => (best === -1 || dist < tickDists[best] ? i : best),
    -1
  );
  if (nearestTick === -1) {
    return barPct === null ? null : { kind: "bar" };
  }

  // a tie goes to the tick: the bar end already carries a direct label, the tick doesn't
  const barDist = barPct === null ? Infinity : Math.abs(toPx(barPct) - pointerPx);
  if (barDist < tickDists[nearestTick]) {
    return { kind: "bar" };
  }

  const winnerPx = toPx(tickPcts[nearestTick]);
  const tickIndexes = tickPcts
    .map((pct, i) => i)
    .filter((i) => Math.abs(toPx(tickPcts[i]) - winnerPx) <= overlapPx);
  return { kind: "ticks", tickIndexes, anchorIndex: nearestTick };
};
