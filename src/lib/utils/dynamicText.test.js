// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

import { describe, it, expect } from "vitest";
import { formatDynamicText } from "./dynamicText.js";

describe("formatDynamicText", () => {
  it("substitutes known variables", () => {
    expect(
      formatDynamicText("Data for {{geo}} in {{year}}", { geo: "Colorado", year: "2022" })
    ).toBe("Data for Colorado in 2022");
  });

  it("uses the fallback for unknown variables", () => {
    expect(formatDynamicText("Data for {{geo}}", {}, "your area")).toBe("Data for your area");
    expect(formatDynamicText("Data for {{geo}}", {})).toBe("Data for ");
  });

  it("replaces repeated occurrences of the same variable", () => {
    expect(formatDynamicText("{{geo}} vs {{geo}}", { geo: "Colorado" })).toBe(
      "Colorado vs Colorado"
    );
  });

  it("treats $-sequences in values as literal text", () => {
    // string-form .replace() reads these as substitution patterns: `$&` would insert the
    // matched "{{label}}" back into the output and `$$` would collapse to a single "$"
    expect(formatDynamicText("Median: {{label}}", { label: "$& per capita" })).toBe(
      "Median: $& per capita"
    );
    expect(formatDynamicText("Median: {{label}}", { label: "$$50,000" })).toBe("Median: $$50,000");
    expect(formatDynamicText("Median: {{label}}", { label: "$1 trillion" })).toBe(
      "Median: $1 trillion"
    );
  });

  it("treats $-sequences in the fallback as literal text", () => {
    expect(formatDynamicText("Median: {{label}}", {}, "$&")).toBe("Median: $&");
  });
});
