// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

import { describe, it, expect } from "vitest";
import { labelExtent, endpointLabelY } from "./lineLabelGeometry.js";

describe("labelExtent", () => {
  it("extends right of the point for start anchors", () => {
    expect(labelExtent({ x: 20, anchor: "start", chars: 4 })).toEqual([23, 53]);
  });

  it("extends left of the point for end anchors", () => {
    expect(labelExtent({ x: 300, anchor: "end", chars: 4 })).toEqual([273, 303]);
  });

  it("centers on the point for middle anchors", () => {
    expect(labelExtent({ x: 100, anchor: "middle", chars: 4 })).toEqual([88, 118]);
  });
});

// single-variant plot height: 180 chart − 22 top − 20 bottom padding. A 4-char
// label is 30px wide; the own point anchors "start" like a first-year label.
const base = {
  point: { x: 20, y: 60, anchor: "start", chars: 4 },
  avoid: [],
  plotHeight: 138
};

describe("endpointLabelY", () => {
  it("sits above the point when there is nothing to avoid", () => {
    expect(endpointLabelY(base)).toEqual({ y: 53, flipped: false });
  });

  it("stays above when the avoid label is vertically distant", () => {
    const avoid = [{ x: 20, y: 100, anchor: "start", chars: 4 }];
    expect(endpointLabelY({ ...base, avoid })).toEqual({ y: 53, flipped: false });
  });

  it("flips the lower point's label below on a near-shared y", () => {
    const avoid = [{ x: 20, y: 55, anchor: "start", chars: 4 }];
    expect(endpointLabelY({ ...base, avoid })).toEqual({ y: 77, flipped: true });
  });

  it("keeps the higher point's label above on the same collision", () => {
    const avoid = [{ x: 20, y: 65, anchor: "start", chars: 4 }];
    expect(endpointLabelY({ ...base, avoid })).toEqual({ y: 53, flipped: false });
  });

  it("breaks exact ties with flipOnTie", () => {
    const avoid = [{ x: 20, y: 60, anchor: "start", chars: 4 }];
    expect(endpointLabelY({ ...base, avoid, flipOnTie: true })).toEqual({ y: 77, flipped: true });
    expect(endpointLabelY({ ...base, avoid })).toEqual({ y: 53, flipped: false });
  });

  it("treats the 13px vertical gap as clear (strict threshold)", () => {
    const avoid = [{ x: 20, y: 73, anchor: "start", chars: 4 }];
    expect(endpointLabelY({ ...base, avoid })).toEqual({ y: 53, flipped: false });
  });

  it("stays above when a same-y avoid label sits far to the right", () => {
    const avoid = [{ x: 200, y: 60, anchor: "start", chars: 4 }];
    expect(endpointLabelY({ ...base, avoid })).toEqual({ y: 53, flipped: false });
  });

  it("stays above on a horizontal near-miss between extents", () => {
    // own extent ends at 53; avoid starting at x 52 begins at 55, past the 2px pad
    const avoid = [{ x: 52, y: 60, anchor: "start", chars: 4 }];
    expect(endpointLabelY({ ...base, avoid })).toEqual({ y: 53, flipped: false });
  });

  it("overlaps through end anchors extending leftward", () => {
    const point = { x: 300, y: 60, anchor: "end", chars: 4 };
    const avoid = [{ x: 302, y: 58, anchor: "end", chars: 4 }];
    expect(endpointLabelY({ ...base, point, avoid })).toEqual({ y: 77, flipped: true });
  });

  it("keeps the lower label in place when flipping would crowd the bottom axis", () => {
    const point = { ...base.point, y: 125 };
    const avoid = [{ x: 20, y: 123, anchor: "start", chars: 4 }];
    expect(endpointLabelY({ ...base, point, avoid })).toEqual({ y: 118, flipped: false });
  });

  it("climbs the higher label clear when the lower one can't flip", () => {
    // lower point at 125 can't fit below (142 > 134); the higher label at 123
    // shifts up by the 11px separation deficit instead of overprinting
    const point = { ...base.point, y: 123 };
    const avoid = [{ x: 20, y: 125, anchor: "start", chars: 4 }];
    expect(endpointLabelY({ ...base, point, avoid })).toEqual({ y: 105, flipped: false });
  });

  it("hits the bottom limit sooner at facet height", () => {
    const point = { ...base.point, y: 105 };
    const avoid = [{ x: 20, y: 103, anchor: "start", chars: 4 }];
    expect(endpointLabelY({ ...base, point, avoid, plotHeight: 118 })).toEqual({
      y: 98,
      flipped: false
    });
  });

  it("decides each endpoint independently against the same avoid list", () => {
    const avoid = [
      { x: 20, y: 58, anchor: "start", chars: 4 },
      { x: 320, y: 100, anchor: "end", chars: 4 }
    ];
    const start = { x: 20, y: 60, anchor: "start", chars: 4 };
    const end = { x: 320, y: 60, anchor: "end", chars: 4 };
    expect(endpointLabelY({ ...base, point: start, avoid })).toEqual({ y: 77, flipped: true });
    expect(endpointLabelY({ ...base, point: end, avoid })).toEqual({ y: 53, flipped: false });
  });

  it("flips against the avoid series' other endpoint when year ranges differ", () => {
    // own first-year label landing beside (and below) the other series' *last* label
    const point = { x: 150, y: 60, anchor: "start", chars: 4 };
    const avoid = [
      { x: 20, y: 90, anchor: "start", chars: 4 },
      { x: 160, y: 58, anchor: "end", chars: 4 }
    ];
    expect(endpointLabelY({ ...base, point, avoid })).toEqual({ y: 77, flipped: true });
  });
});
