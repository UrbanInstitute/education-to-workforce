// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { transformMetricData, localFileRead, localFileWrite } from "../data/transformMetricData.js";

/** @type {string} */
let tmpDir;
/** @type {string} */
let outFile;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "transform-metric-"));
  outFile = path.join(tmpDir, "out.json");
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

/** run the transform and read back what it wrote */
const run = (rows) => {
  transformMetricData(rows, outFile);
  return JSON.parse(fs.readFileSync(outFile, "utf8"));
};

describe("transformMetricData", () => {
  it("keys the output by geoid and nests dotted data columns", () => {
    const output = run([
      { geoid: "08", name: "Colorado", "data.m11.2021": 0.4, "data.m11.2022": 0.5 }
    ]);

    expect(output).toEqual({
      "08": { name: "Colorado", data: { m11: { 2021: 0.4, 2022: 0.5 } } }
    });
  });

  it("coerces numeric strings and leaves non-data columns alone", () => {
    const output = run([{ geoid: "08", s_id: "08", "data.m11.2022": "1234.5" }]);

    expect(output["08"].data.m11[2022]).toBe(1234.5);
    expect(output["08"].s_id).toBe("08");
  });

  it("omits empty cells instead of coercing them to a measured zero", () => {
    // R's write_json drops NA fields today, but `na = \"null\"` upstream would send nulls
    // through here — `+null` is 0, which reads downstream as real data
    const output = run([
      {
        geoid: "08",
        "data.m11.2020": null,
        "data.m11.2021": "",
        "data.m11.2022": 0.5,
        "data.m12.2022": undefined
      }
    ]);

    expect(output["08"].data).toEqual({ m11: { 2022: 0.5 } });
    expect(output["08"].data.m11).not.toHaveProperty("2020");
    expect(output["08"].data).not.toHaveProperty("m12");
  });

  it("drops a metric entirely when every year is empty", () => {
    const output = run([{ geoid: "08", name: "Colorado", "data.m11.2022": null }]);

    expect(output["08"]).toEqual({ name: "Colorado" });
  });

  it("throws on a non-empty value that isn't a number", () => {
    expect(() => run([{ geoid: "08", "data.m11.2022": "N/A" }])).toThrow(
      /Non-numeric value "N\/A" for data\.m11\.2022 at geoid 08/
    );
  });
});

describe("localFileRead / localFileWrite", () => {
  it("round-trips JSON", () => {
    localFileWrite({ a: 1 }, outFile);
    expect(localFileRead(outFile)).toEqual({ a: 1 });
  });

  it("preserves the underlying error as a cause when a read fails", () => {
    const missing = path.join(tmpDir, "nope.json");
    try {
      localFileRead(missing);
      expect.unreachable("localFileRead should throw");
    } catch (error) {
      expect(error.message).toContain("Error reading or parsing file");
      // `new Error(msg, error)` silently discarded the second argument
      expect(error.cause).toBeInstanceOf(Error);
      expect(error.cause.code).toBe("ENOENT");
    }
  });

  it("preserves the underlying error as a cause when a write fails", () => {
    const unwritable = path.join(tmpDir, "missing-dir", "out.json");
    try {
      localFileWrite({ a: 1 }, unwritable);
      expect.unreachable("localFileWrite should throw");
    } catch (error) {
      expect(error.message).toContain("Error writing file");
      expect(error.cause).toBeInstanceOf(Error);
      expect(error.cause.code).toBe("ENOENT");
    }
  });
});
