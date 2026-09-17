// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

import { describe, it, expect } from "vitest";
import { snapTarget } from "./barHover.js";

// percentages on a 200px track: 1% = 2px
const base = { trackWidth: 200, barPct: 44, tickPcts: [50, 55] };

describe("snapTarget", () => {
  it("snaps to the nearest tick", () => {
    // pointer at 104px: tick 50% (100px) is 4px away, bar 44% (88px) is 16px away
    expect(snapTarget({ ...base, pointerPx: 104 })).toEqual({
      kind: "ticks",
      tickIndexes: [0],
      anchorIndex: 0
    });
    // pointer at 150px: tick 55% (110px) wins over tick 50% (100px)
    expect(snapTarget({ ...base, pointerPx: 150 })).toEqual({
      kind: "ticks",
      tickIndexes: [1],
      anchorIndex: 1
    });
  });

  it("is a noop when the bar endpoint is nearest", () => {
    // pointer at 90px: bar (88px) is 2px away, tick 50% (100px) is 10px away
    expect(snapTarget({ ...base, pointerPx: 90 })).toEqual({ kind: "bar" });
  });

  it("prefers the tick on an exact bar/tick tie", () => {
    // bar and tick at the same value: equidistant from any pointer
    expect(snapTarget({ ...base, barPct: 50, tickPcts: [50], pointerPx: 120 })).toEqual({
      kind: "ticks",
      tickIndexes: [0],
      anchorIndex: 0
    });
  });

  it("groups ticks within overlapPx of the winner", () => {
    // ticks at 100px and 103px, pointer left of both — both join the tooltip
    expect(snapTarget({ ...base, tickPcts: [50, 51.5], pointerPx: 95 })).toEqual({
      kind: "ticks",
      tickIndexes: [0, 1],
      anchorIndex: 0
    });
    // 55% (110px) is 10px from the 50% winner — beyond overlapPx, excluded
    expect(snapTarget({ ...base, pointerPx: 95 })).toEqual({
      kind: "ticks",
      tickIndexes: [0],
      anchorIndex: 0
    });
  });

  it("snaps to ticks when the bar value is null", () => {
    expect(snapTarget({ ...base, barPct: null, pointerPx: 0 })).toEqual({
      kind: "ticks",
      tickIndexes: [0],
      anchorIndex: 0
    });
  });

  it("returns null with no candidates at all", () => {
    expect(snapTarget({ ...base, barPct: null, tickPcts: [], pointerPx: 100 })).toBeNull();
  });

  it("returns bar with a bar but no ticks", () => {
    expect(snapTarget({ ...base, tickPcts: [], pointerPx: 100 })).toEqual({ kind: "bar" });
  });

  it("returns null on an unmeasured track", () => {
    expect(snapTarget({ ...base, trackWidth: 0, pointerPx: 0 })).toBeNull();
  });
});
