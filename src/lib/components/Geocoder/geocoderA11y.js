// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

/**
 * ARIA decoration for the mapbox-gl-geocoder input and its `suggestions` typeahead list.
 *
 * Neither library ships any ARIA (verified against @mapbox/mapbox-gl-geocoder 5.0.3 +
 * suggestions 1.7.1): the input is a bare text field and the popup is a plain
 * `<ul class="suggestions">`. Both are built by the library, so we decorate the DOM it
 * produces rather than forking it.
 *
 * What the library does that this has to keep up with:
 * - `List.draw()` wipes and rebuilds the `<ul>`'s `innerHTML` on every keystroke **and**
 *   on every arrow-key move, so decoration cannot be one-shot — a MutationObserver
 *   re-applies it after each redraw.
 * - The `<li>` that Enter/Tab would select carries an `active` class (index 0 by default,
 *   which is why the first suggestion is announced as soon as results appear — pressing
 *   Enter really would pick it).
 * - `List.show()`/`hide()` toggle `style.display` on the `<ul>`, which is the only signal
 *   for whether the popup is open.
 * - "No results found" and server errors are drawn by `List.drawError()` as a bare `<li>`
 *   with no `<a>` inside. Those rows are not selectable, so they are not options — they
 *   are announced through the live region instead.
 * - The geocoder appends its "Powered by Mapbox" attribution — a `<div>`, not an `<li>` —
 *   into the same `<ul>` after every draw. It is a row of the list only by accident of
 *   markup (and this project hides it in CSS), so only `<li>`s are considered here.
 *
 * Implements the WAI-ARIA combobox-with-listbox-popup pattern (APG 1.2).
 */

/**
 * @param {HTMLInputElement} input - the `.mapboxgl-ctrl-geocoder--input` element
 * @param {HTMLElement} list - the `<ul class="suggestions">` the typeahead draws into
 * @param {Object} options
 * @param {string} options.id - id of the input; namespaces the listbox/option ids
 * @param {(message: string) => void} [options.onAnnounce] - called with polite live-region
 *   text whenever it changes ("" when the popup closes, which lets the same count announce
 *   again next time the popup opens)
 * @returns {() => void} detach function — disconnects the observer
 */
export function attachGeocoderA11y(input, list, { id, onAnnounce = () => {} }) {
  const listboxId = `${id}-listbox`;

  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-haspopup", "listbox");
  input.setAttribute("aria-controls", listboxId);
  input.setAttribute("aria-expanded", "false");

  list.id = listboxId;
  list.setAttribute("role", "listbox");

  let announced = "";

  function sync() {
    // <li>s only — the attribution footer is a <div> the geocoder re-appends on every draw
    const rows = /** @type {HTMLElement[]} */ ([...list.children]).filter(
      (row) => row.tagName === "LI"
    );
    // suggestions are drawn as <li><a>…</a></li>; a bare <li> is a message row
    const options = rows.filter((row) => row.querySelector("a"));
    const messages = rows.filter((row) => !row.querySelector("a"));

    options.forEach((option, i) => {
      option.setAttribute("role", "option");
      option.id = `${id}-option-${i}`;
      option.setAttribute("aria-selected", option.classList.contains("active") ? "true" : "false");
    });
    // a listbox's children must be options — hide the message rows from the tree and let
    // the live region carry their text
    messages.forEach((message) => message.setAttribute("role", "presentation"));

    // the popup is displayed when the list is shown and has drawn something into it
    const expanded = rows.length > 0 && list.style.display !== "none";
    input.setAttribute("aria-expanded", expanded ? "true" : "false");

    const active = expanded ? options.find((option) => option.classList.contains("active")) : null;
    if (active) {
      input.setAttribute("aria-activedescendant", active.id);
    } else {
      input.removeAttribute("aria-activedescendant");
    }

    let message = "";
    if (expanded) {
      message = messages.length
        ? messages.map((row) => row.textContent?.trim()).join(" ")
        : `${options.length} ${options.length === 1 ? "result" : "results"} available.`;
    }
    if (message !== announced) {
      announced = message;
      onAnnounce(message);
    }
  }

  const observer = new MutationObserver(sync);
  observer.observe(list, { childList: true, attributes: true, attributeFilter: ["style"] });
  sync();

  return () => observer.disconnect();
}
