// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

import { describe, it, expect } from "vitest";
import { titleCaseEqName } from "./titleCaseEqName";
import eqContent from "$data/archie-ml/essential-questions.aml";

describe("titleCaseEqName", () => {
  it("capitalizes each significant word", () => {
    expect(titleCaseEqName("Neighborhood conditions")).toBe("Neighborhood Conditions");
    expect(titleCaseEqName("Postsecondary skills and outcomes")).toBe(
      "Postsecondary Skills and Outcomes"
    );
  });

  it("keeps short prepositions and conjunctions lowercase mid-title", () => {
    expect(titleCaseEqName("Readiness for early grades")).toBe("Readiness for Early Grades");
    expect(titleCaseEqName("Early grades on track")).toBe("Early Grades on Track");
    expect(titleCaseEqName("Applying to college")).toBe("Applying to College");
  });

  it("capitalizes a minor word in first or last position", () => {
    expect(titleCaseEqName("On track for the year")).toBe("On Track for the Year");
    expect(titleCaseEqName("Schools to apply to")).toBe("Schools to Apply To");
  });

  it("capitalizes both halves of a hyphenated compound", () => {
    expect(titleCaseEqName("Full-day prekindergarten")).toBe("Full-Day Prekindergarten");
    expect(titleCaseEqName("Early-grade reading and math")).toBe("Early-Grade Reading and Math");
  });

  it("leaves intentional casing inside a word alone", () => {
    expect(titleCaseEqName("pre-K enrollment")).toBe("Pre-K Enrollment");
  });

  it("returns an empty string when there is no name yet", () => {
    expect(titleCaseEqName(undefined)).toBe("");
    expect(titleCaseEqName("")).toBe("");
  });

  it("leaves no authored shorthand starting with a lowercase letter", () => {
    for (const eq of eqContent.data) {
      expect(titleCaseEqName(eq.shorthand)).toMatch(/^[A-Z]/);
    }
  });
});
