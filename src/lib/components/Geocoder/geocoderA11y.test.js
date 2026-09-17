// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { attachGeocoderA11y } from "./geocoderA11y";

/**
 * The DOM these tests build mirrors what @mapbox/mapbox-gl-geocoder 5.0.3 + suggestions
 * 1.7.1 actually produce, so the decoration is exercised against the real shapes:
 * `List.drawItem` writes `<li><a>…</a></li>` (plus an `active` class on the item Enter
 * would pick) and `List.drawError` writes a bare `<li>` holding an error div.
 */

/** @type {HTMLInputElement} */ let input;
/** @type {HTMLUListElement} */ let list;
/** @type {() => void} */ let detach;
/** @type {string[]} */ let announced;

/**
 * The geocoder wraps `List.draw` to re-append its attribution — a <div>, not an <li>,
 * carrying a link — into the same <ul> after every draw.
 */
function appendFooter() {
  const footer = document.createElement("div");
  footer.className = "mapboxgl-ctrl-geocoder--powered-by";
  footer.innerHTML = '<a href="https://www.mapbox.com/search-service">Powered by Mapbox</a>';
  list.appendChild(footer);
}

/**
 * Redraw the list the way `List.draw()` does — full innerHTML replacement.
 * @param {string[]} labels
 * @param {number} [activeIndex]
 */
function draw(labels, activeIndex = 0) {
  list.innerHTML = "";
  labels.forEach((label, i) => {
    const li = document.createElement("li");
    if (i === activeIndex) li.className += " active";
    const a = document.createElement("a");
    a.innerHTML = `<div class="mapboxgl-ctrl-geocoder--suggestion-title">${label}</div>`;
    li.appendChild(a);
    list.appendChild(li);
  });
  list.style.display = labels.length ? "block" : "none";
  appendFooter();
}

/**
 * Mirror of `List.drawError` — a bare <li>, no anchor. The lib draws an empty list first,
 * so the footer is already sitting there when the message row is appended.
 * @param {string} text
 */
function drawMessage(text) {
  list.innerHTML = "";
  appendFooter();
  const li = document.createElement("li");
  li.innerHTML = `<div class='mapbox-gl-geocoder--error'>${text}</div>`;
  list.appendChild(li);
  list.style.display = "block";
}

/** MutationObserver callbacks are microtasks — let them run. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const rows = () => [...list.querySelectorAll("li")];

beforeEach(() => {
  input = document.createElement("input");
  input.type = "text";
  list = document.createElement("ul");
  list.className = "suggestions";
  list.style.display = "none";
  document.body.append(input, list);

  announced = [];
  detach = attachGeocoderA11y(input, list, {
    id: "geoid1",
    onAnnounce: (message) => announced.push(message)
  });
});

afterEach(() => {
  detach();
  document.body.innerHTML = "";
});

describe("attachGeocoderA11y", () => {
  it("gives the input combobox semantics pointing at the listbox", () => {
    expect(input.getAttribute("role")).toBe("combobox");
    expect(input.getAttribute("aria-autocomplete")).toBe("list");
    expect(input.getAttribute("aria-haspopup")).toBe("listbox");
    expect(input.getAttribute("aria-controls")).toBe("geoid1-listbox");
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(list.id).toBe("geoid1-listbox");
    expect(list.getAttribute("role")).toBe("listbox");
  });

  it("namespaces ids per input so two geocoders can coexist", () => {
    const otherInput = document.createElement("input");
    const otherList = document.createElement("ul");
    document.body.append(otherInput, otherList);
    const detachOther = attachGeocoderA11y(otherInput, otherList, { id: "geoid2" });

    expect(otherList.id).toBe("geoid2-listbox");
    expect(otherInput.getAttribute("aria-controls")).toBe("geoid2-listbox");
    expect(otherList.id).not.toBe(list.id);
    detachOther();
  });

  it("marks drawn suggestions as options and expands the combobox", async () => {
    draw(["Alameda County", "Alpine County"]);
    await settle();

    expect(input.getAttribute("aria-expanded")).toBe("true");
    const options = rows();
    expect(options.map((li) => li.getAttribute("role"))).toEqual(["option", "option"]);
    expect(options.map((li) => li.id)).toEqual(["geoid1-option-0", "geoid1-option-1"]);
    expect(options.map((li) => li.getAttribute("aria-selected"))).toEqual(["true", "false"]);
    // index 0 is active on draw — Enter really would pick it
    expect(input.getAttribute("aria-activedescendant")).toBe("geoid1-option-0");
  });

  it("follows the active item as the arrow keys move it", async () => {
    draw(["Alameda County", "Alpine County", "Amador County"]);
    await settle();
    draw(["Alameda County", "Alpine County", "Amador County"], 2);
    await settle();

    expect(input.getAttribute("aria-activedescendant")).toBe("geoid1-option-2");
    expect(rows().map((li) => li.getAttribute("aria-selected"))).toEqual([
      "false",
      "false",
      "true"
    ]);
  });

  it("collapses and drops the active descendant when the list hides", async () => {
    draw(["Alameda County"]);
    await settle();
    list.style.display = "none";
    await settle();

    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(input.hasAttribute("aria-activedescendant")).toBe(false);
  });

  it("announces the result count, pluralized", async () => {
    draw(["Alameda County", "Alpine County"]);
    await settle();
    expect(announced.at(-1)).toBe("2 results available.");

    draw(["Alameda County"]);
    await settle();
    expect(announced.at(-1)).toBe("1 result available.");
  });

  it("does not re-announce while only the active item changes", async () => {
    draw(["Alameda County", "Alpine County"]);
    await settle();
    const count = announced.length;

    draw(["Alameda County", "Alpine County"], 1);
    await settle();
    expect(announced.length).toBe(count);
  });

  it("re-announces the same count after the popup closes in between", async () => {
    draw(["Alameda County", "Alpine County"]);
    await settle();
    list.style.display = "none";
    await settle();
    draw(["Alameda County", "Alpine County"]);
    await settle();

    expect(announced).toEqual(["2 results available.", "", "2 results available."]);
  });

  it("announces message rows and keeps them out of the listbox", async () => {
    drawMessage("No results found");
    await settle();

    expect(announced.at(-1)).toBe("No results found");
    expect(rows()[0].getAttribute("role")).toBe("presentation");
    expect(list.querySelector('[role="option"]')).toBe(null);
    expect(input.hasAttribute("aria-activedescendant")).toBe(false);
  });

  it("ignores the attribution footer the geocoder appends to the list", async () => {
    draw(["Alameda County", "Alpine County"]);
    await settle();

    // the footer is a <div><a>Powered by Mapbox</a></div> — counting it as a suggestion
    // inflated the announced total and left a phantom option in the no-results state
    expect(list.querySelectorAll('[role="option"]').length).toBe(2);
    expect(list.querySelector(".mapboxgl-ctrl-geocoder--powered-by")?.hasAttribute("role")).toBe(
      false
    );
    expect(announced.at(-1)).toBe("2 results available.");
  });

  it("stays collapsed when the footer is the only thing in the list", async () => {
    appendFooter();
    await settle();

    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(announced).toEqual([]);
  });

  it("stops decorating after detach", async () => {
    detach();
    draw(["Alameda County"]);
    await settle();

    expect(rows()[0].hasAttribute("role")).toBe(false);
    expect(announced).toEqual([]);
  });

  it("survives a list that is never drawn into", () => {
    const onAnnounce = vi.fn();
    const bare = document.createElement("ul");
    document.body.append(bare);
    const detachBare = attachGeocoderA11y(document.createElement("input"), bare, {
      id: "geoid3",
      onAnnounce
    });

    expect(onAnnounce).not.toHaveBeenCalled();
    detachBare();
  });
});
