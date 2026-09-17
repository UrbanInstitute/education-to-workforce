// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

/**
 * Pure geometry for line-chart endpoint value labels (the barGeometry.js pattern).
 *
 * Both solid trend series label their first/last non-null points above the point
 * (baseline at pointY - ABOVE_OFFSET), so converging lines collide. On collision
 * the vertically lower point's label flips below it — label stacking then always
 * matches line order — with ties going to whichever caller sets flipOnTie (the
 * comparison series). When the lower label has no room below (points hugging the
 * bottom axis), it keeps its spot and the higher label climbs just enough to
 * clear it instead; near the bottom axis there is always headroom above. Each
 * series instance computes its own placement from the same symmetric pair, so
 * the two sides agree without coordinating.
 *
 * Vertical anatomy, all relative to a point at y (SVG text baselines):
 *   above label spans [y - ABOVE_OFFSET - LABEL_HEIGHT, y - ABOVE_OFFSET]
 *   below label spans [y + BELOW_OFFSET - LABEL_HEIGHT, y + BELOW_OFFSET]
 * BELOW_OFFSET = 17 puts a flipped label's top edge at y + 6 — clear of the 4px
 * point marker, and just past the primary label's bottom edge even at the widest
 * y-gap that still registers as a collision.
 */

/** Baseline offset above the point (the default placement). */
export const ABOVE_OFFSET = 7;
/** Baseline offset below the point for a flipped label. */
export const BELOW_OFFSET = 17;
/** Rendered text height above the baseline, halo included. */
const LABEL_HEIGHT = 11;
/** Width heuristic at font-size-small Lato (same as MultiLineChart's leftPadding). */
const CHAR_WIDTH = 7.5;
/** Horizontal offset of the label from its point (render uses xGet + 3). */
const X_OFFSET = 3;
/** Breathing room added to the overlap tests on both axes. */
const COLLISION_PAD = 2;
/** A flipped baseline keeps this clearance above the plot bottom so descenders
 *  never reach the x-axis year labels below it. */
const BOTTOM_CLEARANCE = 4;

/**
 * @typedef {{ x: number, y: number, anchor: string, chars: number }} EndpointLabel
 *   point position in px plus the label's text-anchor ("start" | "end" | "middle";
 *   anything else reads as "start") and character count
 */

/**
 * Anchor-aware horizontal extent of one endpoint label.
 * @param {Pick<EndpointLabel, "x" | "anchor" | "chars">} label
 * @returns {[number, number]} px interval the label text occupies
 */
export const labelExtent = ({ x, anchor, chars }) => {
  const width = chars * CHAR_WIDTH;
  const labelX = x + X_OFFSET;
  if (anchor === "end") return [labelX - width, labelX];
  if (anchor === "middle") return [labelX - width / 2, labelX + width / 2];
  return [labelX, labelX + width];
};

/**
 * Baseline y for one endpoint label, dodging the other solid series' endpoint
 * labels. `avoid` holds 0-2 entries (like labelPlacement's tickXs): an all-null
 * series contributes none, a single-point series one, and testing against both
 * of its endpoints covers mismatched non-null year ranges for free.
 *
 * @param {{
 *   point: EndpointLabel,
 *   avoid: EndpointLabel[],
 *   plotHeight: number,
 *   flipOnTie?: boolean
 * }} args - flipOnTie marks the series that yields when both points share a y
 * @returns {{ y: number, flipped: boolean }}
 */
export const endpointLabelY = ({ point, avoid, plotHeight, flipOnTie = false }) => {
  const aboveY = point.y - ABOVE_OFFSET;
  const [ownStart, ownEnd] = labelExtent(point);

  const colliding = avoid.filter((a) => {
    const [aStart, aEnd] = labelExtent(a);
    const horizontal = ownStart < aEnd + COLLISION_PAD && aStart < ownEnd + COLLISION_PAD;
    const vertical = Math.abs(point.y - a.y) < LABEL_HEIGHT + COLLISION_PAD;
    return horizontal && vertical;
  });
  if (colliding.length === 0) {
    return { y: aboveY, flipped: false };
  }

  // resolve against the vertically nearest colliding label; the pairwise inputs
  // are symmetric, so the other series' instance reaches the complementary verdict
  const other = colliding.reduce((a, b) =>
    Math.abs(point.y - a.y) <= Math.abs(point.y - b.y) ? a : b
  );
  const ownIsLower = point.y > other.y || (point.y === other.y && flipOnTie);
  const lowerPointY = ownIsLower ? point.y : other.y;
  const lowerFitsBelow = lowerPointY + BELOW_OFFSET <= plotHeight - BOTTOM_CLEARANCE;

  if (ownIsLower) {
    // no room below means the higher label climbs instead, so keep the default spot
    return lowerFitsBelow
      ? { y: point.y + BELOW_OFFSET, flipped: true }
      : { y: aboveY, flipped: false };
  }
  if (lowerFitsBelow) {
    return { y: aboveY, flipped: false };
  }
  const deficit = LABEL_HEIGHT + COLLISION_PAD - Math.abs(point.y - other.y);
  return { y: aboveY - deficit, flipped: false };
};
