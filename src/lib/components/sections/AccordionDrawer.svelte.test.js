// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

// @ts-nocheck — vitest-verified; skip strict-null noise on DOM queries
// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { mount, unmount, flushSync } from "svelte";
import AccordionDrawer from "./AccordionDrawer.svelte";

/** @type {ReturnType<typeof mount>[]} */
let mounted = [];
const render = (props) => {
  const component = mount(AccordionDrawer, { target: document.body, props });
  mounted.push(component);
  flushSync();
  return document.body;
};

afterEach(() => {
  mounted.forEach((component) => unmount(component));
  mounted = [];
  document.body.innerHTML = "";
});

describe("AccordionDrawer", () => {
  it("starts closed with the aria wiring pointing at the body id", () => {
    const body = render({ label: "Learn more", id: "eq-learn-more" });
    const button = body.querySelector("button");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(button.getAttribute("aria-controls")).toBe("eq-learn-more");
    expect(button.textContent).toContain("Learn more");
    expect(body.querySelector("#eq-learn-more")).toBeNull();
  });

  it("toggles open/closed, mounting and unmounting the body", () => {
    const onToggle = vi.fn();
    const body = render({ label: "Learn more", id: "eq-learn-more", onToggle });
    const button = body.querySelector("button");

    button.click();
    flushSync();
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(body.querySelector("#eq-learn-more")).not.toBeNull();
    expect(onToggle).toHaveBeenLastCalledWith(true, expect.anything());

    button.click();
    flushSync();
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(onToggle).toHaveBeenLastCalledWith(false, expect.anything());
  });

  it("respects an initial open prop", () => {
    const body = render({ label: "Population", id: "local-chars", open: true });
    expect(body.querySelector("button").getAttribute("aria-expanded")).toBe("true");
    expect(body.querySelector("#local-chars")).not.toBeNull();
  });
});
