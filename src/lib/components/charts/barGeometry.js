// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

/**
 * Pure geometry for one bar row on the shared card scale (LayerCake percentRange, so the
 * scale maps the data domain to [0, 100] track-percent positions). Fills always
 * grow away from the zero baseline: positive values extend right of scale(0), negative
 * values extend left (the diverging representation-gap case, bars-negative.png).
 *
 * @param {number | null | undefined} value
 * @param {import("d3-scale").ScaleLinear<number, number>} scale - shared card scale
 * @returns {{ fillLeft: number, fillWidth: number, negative: boolean, valueX: number }}
 *   percentages along the track; valueX is the bar-end position (label anchor)
 */
export const barGeometry = (value, scale) => {
  const zeroX = scale(0);
  if (value === null || value === undefined) {
    return { fillLeft: zeroX, fillWidth: 0, negative: false, valueX: zeroX };
  }
  const valueX = scale(value);
  return {
    fillLeft: Math.min(zeroX, valueX),
    fillWidth: Math.abs(valueX - zeroX),
    negative: value < 0,
    valueX
  };
};

/** Gap between the bar's end and the label, outside / inside it. */
const OUTSIDE_GAP = 6;
const INSIDE_GAP = 6;
/** Clearance an inside label keeps from the fill's zero-baseline end. */
const INSIDE_MIN_INSET = 6;
/** Half a tick's rendered box: 3px wide, centered on its value. */
const TICK_HALF_WIDTH = 1.5;
/** Clearance an outside label keeps from a tick, so it never butts against it. */
const TICK_CLEARANCE = 4;

/**
 * Value-label placement for one bar row: outside the bar end by default, flipped inside
 * (aligned to the bar end) when the outside span would land on a reference tick or
 * overflow the track. Layout integrity outranks tick avoidance — a label that fits
 * nowhere stays outside, where the halo keeps it legible over a tick and at worst it
 * crowds the card rather than breaking the track's baseline edge. Callers must have
 * real measurements; with zero widths no collision can register, so keep the
 * pre-layout placement instead.
 *
 * @param {{
 *   valueX: number,
 *   negative: boolean,
 *   zeroX: number,
 *   tickXs: number[],
 *   trackWidth: number,
 *   labelWidth: number
 * }} args - valueX/zeroX/tickXs are track percentages; widths are px
 * @returns {{ inside: boolean, left: number }} left is px within the track
 */
export const labelPlacement = ({ valueX, negative, zeroX, tickXs, trackWidth, labelWidth }) => {
  const toPx = (/** @type {number} */ pct) => (pct / 100) * trackWidth;
  const barEnd = toPx(valueX);
  const fillStart = toPx(zeroX);
  const reach = TICK_HALF_WIDTH + TICK_CLEARANCE;

  const outsideLeft = negative ? barEnd - OUTSIDE_GAP - labelWidth : barEnd + OUTSIDE_GAP;
  const collidesWithTick = tickXs.some((x) => {
    const center = toPx(x);
    return center + reach > outsideLeft && center - reach < outsideLeft + labelWidth;
  });
  const fitsOutside = negative ? outsideLeft >= 0 : outsideLeft + labelWidth <= trackWidth;
  const fitsInside = negative
    ? barEnd + INSIDE_GAP + labelWidth <= fillStart - INSIDE_MIN_INSET
    : barEnd - INSIDE_GAP - labelWidth >= fillStart + INSIDE_MIN_INSET;

  const inside = (collidesWithTick || !fitsOutside) && fitsInside;
  if (!inside) {
    return { inside, left: outsideLeft };
  }
  return { inside, left: negative ? barEnd + INSIDE_GAP : barEnd - INSIDE_GAP - labelWidth };
};
