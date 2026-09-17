// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

// @ts-nocheck — vitest-verified; skip strict-null noise on DOM queries
// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { mount, unmount, flushSync } from "svelte";
import IntroModal from "./IntroModal.svelte";

const CONTENT = {
  title: "How to interpret this tool",
  copy: [
    { type: "p", value: 'Intro with a <a href="https://example.org">link</a>:' },
    { type: "list", items: ["<strong>First</strong> bullet.", "Second bullet.", "Third bullet."] },
    { type: "p", value: "Closing paragraph." }
  ]
};

/** @type {ReturnType<typeof mount>[]} */
let mounted = [];
const render = (props = {}) => {
  const component = mount(IntroModal, {
    target: document.body,
    props: { content: CONTENT, ...props }
  });
  mounted.push(component);
  flushSync();
  return component;
};

const overlay = () => document.querySelector(".intro-overlay");
const panel = () => document.querySelector(".intro-panel");

beforeEach(() => {
  sessionStorage.clear();
});

afterEach(() => {
  mounted.forEach((component) => unmount(component));
  mounted = [];
  document.body.innerHTML = "";
});

describe("IntroModal", () => {
  it("opens on first mount of a session and records the visit", () => {
    render();
    expect(overlay()).not.toBeNull();
    expect(sessionStorage.getItem("e2w-intro-seen")).toBe("1");
    expect(panel().getAttribute("role")).toBe("dialog");
    expect(panel().getAttribute("aria-labelledby")).toBe("intro-modal-title");
    expect(document.getElementById("intro-modal-title").textContent).toBe(CONTENT.title);
  });

  it("stays closed once the session has seen it", () => {
    sessionStorage.setItem("e2w-intro-seen", "1");
    render();
    expect(overlay()).toBeNull();
  });

  it("renders nothing until the page opens it", () => {
    sessionStorage.setItem("e2w-intro-seen", "1");
    render({ open: true });
    expect(overlay()).not.toBeNull();
  });

  it("renders each copy block, with lists as <li>s and inline HTML intact", () => {
    render();
    const content = panel();
    expect(content.querySelectorAll("p")).toHaveLength(2);
    expect(content.querySelector("p a").getAttribute("href")).toBe("https://example.org");
    const items = content.querySelectorAll("ul li");
    expect(items).toHaveLength(3);
    expect(items[0].querySelector("strong").textContent).toBe("First");
    // blocks keep their authored order: p, ul, p
    expect([...content.children].map((el) => el.tagName)).toEqual(["BUTTON", "H2", "P", "UL", "P"]);
  });

  it("closes from the close button", () => {
    render();
    document.querySelector(".close-button").click();
    flushSync();
    expect(overlay()).toBeNull();
  });

  it("closes on Escape", () => {
    render();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    flushSync();
    expect(overlay()).toBeNull();
  });

  it("closes on a scrim click but not on a click inside the panel", () => {
    render();
    panel().click();
    flushSync();
    expect(overlay()).not.toBeNull();

    overlay().click();
    flushSync();
    expect(overlay()).toBeNull();
  });
});
