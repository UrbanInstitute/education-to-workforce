// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

import { describe, it, expect } from "vitest";
import { scaleLinear } from "d3-scale";
import { barGeometry, labelPlacement } from "./barGeometry.js";

const percentScale = scaleLinear().domain([0, 1]).range([0, 100]);
// the m83 representation-gap fixture domain (dev-plan §8.1)
const divergingScale = scaleLinear().domain([-0.06, 0.07]).range([0, 100]);

describe("barGeometry", () => {
  it("extends positive bars right from zero", () => {
    expect(barGeometry(0.4, percentScale)).toEqual({
      fillLeft: 0,
      fillWidth: 40,
      negative: false,
      valueX: 40
    });
  });

  it("extends negative bars left from an off-center zero baseline", () => {
    const zeroX = divergingScale(0);
    const geometry = barGeometry(-0.06, divergingScale);
    expect(geometry.negative).toBe(true);
    expect(geometry.fillLeft).toBe(0);
    expect(geometry.fillWidth).toBeCloseTo(zeroX);
    expect(geometry.valueX).toBe(0);
  });

  it("anchors positive bars at the diverging zero baseline, not the track edge", () => {
    const zeroX = divergingScale(0);
    const geometry = barGeometry(0.07, divergingScale);
    expect(geometry.fillLeft).toBeCloseTo(zeroX);
    expect(geometry.fillWidth).toBeCloseTo(100 - zeroX);
    expect(geometry.negative).toBe(false);
  });

  it("renders zero values as a zero-width fill at the baseline", () => {
    expect(barGeometry(0, divergingScale)).toEqual({
      fillLeft: divergingScale(0),
      fillWidth: 0,
      negative: false,
      valueX: divergingScale(0)
    });
  });

  it("treats null/undefined as no fill anchored at zero", () => {
    for (const value of [null, undefined]) {
      expect(barGeometry(value, percentScale)).toEqual({
        fillLeft: 0,
        fillWidth: 0,
        negative: false,
        valueX: 0
      });
    }
  });
});

// 400px track, 40px label; percent coords convert at 4px per point.
const base = { negative: false, zeroX: 0, tickXs: [], trackWidth: 400, labelWidth: 40 };

describe("labelPlacement", () => {
  it("sits outside the bar end when nothing collides", () => {
    const result = labelPlacement({ ...base, valueX: 50 });
    expect(result).toEqual({ inside: false, left: 206 });
  });

  it("flips inside when a tick lands on the outside span", () => {
    const result = labelPlacement({ ...base, valueX: 50, tickXs: [52] });
    expect(result).toEqual({ inside: true, left: 154 });
  });

  it("ignores a tick beyond the label's reach", () => {
    const result = labelPlacement({ ...base, valueX: 50, tickXs: [63] });
    expect(result.inside).toBe(false);
  });

  it("ignores a tick left of the bar end", () => {
    const result = labelPlacement({ ...base, valueX: 50, tickXs: [30] });
    expect(result.inside).toBe(false);
  });

  it("flips inside when the outside span would overflow the track, tick or no tick", () => {
    const result = labelPlacement({ ...base, valueX: 95 });
    expect(result).toEqual({ inside: true, left: 334 });
  });

  it("stays outside over the tick when a short bar can't hold the label", () => {
    const result = labelPlacement({ ...base, valueX: 5, tickXs: [8] });
    expect(result).toEqual({ inside: false, left: 26 });
  });

  it("mirrors the flip for negative bars overflowing the track start", () => {
    const result = labelPlacement({ ...base, valueX: 10, negative: true, zeroX: 50 });
    expect(result).toEqual({ inside: true, left: 46 });
  });

  it("mirrors tick collision for negative bars", () => {
    const result = labelPlacement({ ...base, valueX: 25, negative: true, zeroX: 50, tickXs: [20] });
    expect(result).toEqual({ inside: true, left: 106 });
  });

  it("keeps a diverging inside label from crossing the zero line", () => {
    const result = labelPlacement({ ...base, valueX: 60, zeroX: 50, tickXs: [62] });
    expect(result.inside).toBe(false);
  });
});
