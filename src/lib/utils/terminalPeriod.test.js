// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

import { describe, it, expect } from "vitest";
import { withTerminalPeriod } from "./terminalPeriod.js";

describe("withTerminalPeriod", () => {
  it("appends a period to a plain source label", () => {
    expect(withTerminalPeriod("American Community Survey")).toBe("American Community Survey.");
  });

  it("does not double up when the line already ends in terminal punctuation", () => {
    expect(withTerminalPeriod("Values are estimates.")).toBe("Values are estimates.");
    expect(withTerminalPeriod("Is this counted?")).toBe("Is this counted?");
    expect(withTerminalPeriod("See note!")).toBe("See note!");
  });

  it("appends after trailing HTML tags, checking the last visible character", () => {
    expect(withTerminalPeriod('See <a href="#">the source</a>')).toBe(
      'See <a href="#">the source</a>.'
    );
    expect(withTerminalPeriod('See <a href="#">the source.</a>')).toBe(
      'See <a href="#">the source.</a>'
    );
  });

  it("ignores trailing whitespace when deciding and appending", () => {
    expect(withTerminalPeriod("EdFacts  ")).toBe("EdFacts.");
    expect(withTerminalPeriod("Done.  ")).toBe("Done.  ");
  });

  it("passes through empty/nullish values", () => {
    expect(withTerminalPeriod("")).toBe("");
    expect(withTerminalPeriod(null)).toBe("");
    expect(withTerminalPeriod(undefined)).toBe("");
  });
});
