// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

import { describe, it, expect } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { createZip, sanitizeFilename, dedupeFilenames } from "./downloadZip.js";

describe("sanitizeFilename", () => {
  it("strips reserved characters and collapses whitespace", () => {
    expect(sanitizeFilename('a/b\\c:d*e?f"g<h>i|j.png')).toBe("abcdefghij.png");
    expect(sanitizeFilename("  College   Enrollment — Fairfax  .png")).toBe(
      "College Enrollment — Fairfax .png"
    );
  });
});

describe("dedupeFilenames", () => {
  it("suffixes collisions while preserving extensions", () => {
    const blob = new Blob(["x"]);
    const entries = dedupeFilenames([
      { filename: "chart.png", blob },
      { filename: "chart.png", blob },
      { filename: "chart.png", blob },
      { filename: "other.png", blob }
    ]);
    expect(entries.map((e) => e.filename)).toEqual([
      "chart.png",
      "chart (2).png",
      "chart (3).png",
      "other.png"
    ]);
  });

  it("falls back to a stem for names sanitized to nothing", () => {
    const blob = new Blob(["x"]);
    expect(dedupeFilenames([{ filename: "///", blob }])[0].filename).toBe("chart");
  });

  it("re-probes generated names against later originals", () => {
    // two cards named "chart" plus one genuinely named "chart (2)" used to collide,
    // and the zip silently kept only one of them. The third keeps its own stem rather
    // than being renumbered into the "chart" series — it is a different card.
    const blob = new Blob(["x"]);
    const entries = dedupeFilenames([
      { filename: "chart.png", blob },
      { filename: "chart.png", blob },
      { filename: "chart (2).png", blob }
    ]);
    expect(entries.map((e) => e.filename)).toEqual([
      "chart.png",
      "chart (2).png",
      "chart (2) (2).png"
    ]);
  });

  it("never emits a duplicate name", () => {
    const blob = new Blob(["x"]);
    const names = dedupeFilenames(
      ["a.png", "a.png", "a (2).png", "a (2).png", "a (3).png", "a.png"].map((filename) => ({
        filename,
        blob
      }))
    ).map((e) => e.filename);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("createZip", () => {
  it("round-trips blobs through a store-mode zip", async () => {
    const zipBlob = await createZip([
      { filename: "a.png", blob: new Blob(["first-png-bytes"]) },
      { filename: "b.png", blob: new Blob(["second-png-bytes"]) }
    ]);
    expect(zipBlob.type).toBe("application/zip");

    const unzipped = unzipSync(new Uint8Array(await zipBlob.arrayBuffer()));
    expect(Object.keys(unzipped).sort()).toEqual(["a.png", "b.png"]);
    expect(strFromU8(unzipped["a.png"])).toBe("first-png-bytes");
    expect(strFromU8(unzipped["b.png"])).toBe("second-png-bytes");
  });

  it("stores rather than deflates (store mode: content bytes appear verbatim)", async () => {
    const content = "already-compressed-png-payload";
    const zipBlob = await createZip([{ filename: "x.png", blob: new Blob([content]) }]);
    const raw = new TextDecoder("latin1").decode(await zipBlob.arrayBuffer());
    expect(raw).toContain(content);
  });
});
