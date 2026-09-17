// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

// @ts-nocheck — vitest-verified; skip strict-null noise on DOM queries
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, unmount, flushSync, createRawSnippet } from "svelte";

vi.mock("html2canvas", () => ({ default: vi.fn() }));
import html2canvas from "html2canvas";
import Download from "./Download.svelte";

const mockCanvas = {
  toBlob: (cb) => cb(new Blob(["png-bytes"], { type: "image/png" }))
};

/** captured ready-callback the children snippet receives */
let capturedOnready;
const childSnippet = () =>
  createRawSnippet((getOnready) => ({
    render: () => `<div class="test-child">chart</div>`,
    setup: () => {
      capturedOnready = getOnready();
    }
  }));

// the button's wording is a prop; the test supplies its own so the assertions below
// check the idle/busy state rather than the shipped default copy
const LABEL = "Export this chart";

let mounted = [];
const render = () => {
  const component = mount(Download, {
    target: document.body,
    props: { id: "m1", filename: "test-chart", label: LABEL, children: childSnippet() }
  });
  mounted.push(component);
  flushSync();
  return component;
};

beforeEach(() => {
  capturedOnready = undefined;
  html2canvas.mockReset();
  html2canvas.mockResolvedValue(mockCanvas);
  URL.createObjectURL = vi.fn(() => "blob:mock");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.useRealTimers();
  mounted.forEach((component) => unmount(component));
  mounted = [];
  document.body.innerHTML = "";
});

describe("Download", () => {
  it("renders children offscreen only during an export, passing a callable ready-callback", async () => {
    const download = render();
    expect(document.querySelector(".test-child")).toBeNull();

    const pending = download.renderToBlob();
    await Promise.resolve(); // let renderToBlob reach its awaits
    flushSync();
    const child = document.querySelector(".download-image-container .test-child");
    expect(child).not.toBeNull();
    expect(typeof capturedOnready).toBe("function");

    capturedOnready();
    const blob = await pending;
    expect(blob).toBeInstanceOf(Blob);
    flushSync();
    expect(document.querySelector(".test-child")).toBeNull();
  });

  it("resolves when the child signals ready (well before the 15s safety timeout)", async () => {
    const download = render();
    const pending = download.renderToBlob();
    await Promise.resolve();
    flushSync();
    capturedOnready();
    // vitest's 5s default test timeout proves we didn't wait out the 15s race
    await expect(pending).resolves.toBeInstanceOf(Blob);
    expect(html2canvas).toHaveBeenCalledOnce();
  });

  it("falls back to the safety timeout when the child never signals", async () => {
    vi.useFakeTimers();
    const download = render();
    const pending = download.renderToBlob();
    await Promise.resolve();
    flushSync();

    let settled = false;
    pending.then(() => (settled = true));
    await vi.advanceTimersByTimeAsync(14999);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await expect(pending).resolves.toBeInstanceOf(Blob);
  });

  it("resets the export state when html2canvas fails", async () => {
    html2canvas.mockRejectedValue(new Error("render failed"));
    const download = render();
    const pending = download.handleExport();
    await Promise.resolve();
    flushSync();
    capturedOnready();

    await expect(pending).resolves.toEqual({ success: false });
    flushSync();
    // exportFlag reset in finally: children unmounted, button back to idle
    expect(document.querySelector(".test-child")).toBeNull();
    expect(document.querySelector("button").disabled).toBe(false);
    expect(document.querySelector("button").textContent).toContain(LABEL);
  });

  it("downloads the blob on handleExport success", async () => {
    const download = render();
    const clicks = [];
    document.addEventListener("click", (e) => {
      if (e.target.tagName === "A") clicks.push(e.target.getAttribute("download"));
    });
    const pending = download.handleExport();
    await Promise.resolve();
    flushSync();
    capturedOnready();
    await expect(pending).resolves.toEqual({ success: true });
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock");
    expect(clicks).toEqual(["test-chart.png"]);
  });

  it("joins a second caller onto the capture already running", async () => {
    // "download all" captures every card in sequence; the card's own button stays enabled,
    // and a click used to start a second handshake that the first one's finally tore down
    const download = render();
    const first = download.renderToBlob();
    const second = download.renderToBlob();
    expect(second).toBe(first);

    await Promise.resolve();
    flushSync();
    capturedOnready();

    const [a, b] = await Promise.all([first, second]);
    expect(a).toBe(b);
    expect(html2canvas).toHaveBeenCalledOnce();
    flushSync();
    expect(document.querySelector(".test-child")).toBeNull();
  });

  it("starts a fresh capture once the previous one has settled", async () => {
    const download = render();
    const first = download.renderToBlob();
    await Promise.resolve();
    flushSync();
    capturedOnready();
    await first;

    const second = download.renderToBlob();
    expect(second).not.toBe(first);
    await Promise.resolve();
    flushSync();
    capturedOnready();
    await expect(second).resolves.toBeInstanceOf(Blob);
    expect(html2canvas).toHaveBeenCalledTimes(2);
  });

  it("releases the in-flight capture when it fails, so a retry can run", async () => {
    html2canvas.mockRejectedValueOnce(new Error("render failed"));
    const download = render();
    const failed = download.renderToBlob();
    await Promise.resolve();
    flushSync();
    capturedOnready();
    await expect(failed).rejects.toThrow(/render failed/);

    const retry = download.renderToBlob();
    expect(retry).not.toBe(failed);
    await Promise.resolve();
    flushSync();
    capturedOnready();
    await expect(retry).resolves.toBeInstanceOf(Blob);
  });

  it("ignoreElements skips button chrome and other cards' export containers", () => {
    const download = render();
    const button = document.createElement("div");
    button.className = "button-container";
    const otherExport = document.createElement("div");
    otherExport.className = "download-image-container";
    const ownExport = document.querySelector(".download-image-container");
    const plain = document.createElement("div");

    expect(download.ignoreElements(button)).toBe(true);
    expect(download.ignoreElements(otherExport)).toBe(true);
    expect(download.ignoreElements(ownExport)).toBe(false);
    expect(download.ignoreElements(plain)).toBe(false);
  });
});
