// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

/**
 * Render-readiness signal for the chart → download handshake (see
 * .agent/docs/v2-component-requirements.md §1.4). Charts signal "layout settled" by
 * attaching this to their outermost element; the Download component awaits the
 * callback before running html2canvas — replacing the old setTimeout(50) guess.
 *
 * Usage in a chart component:
 *   <div {@attach readySignal(onready)}>…</div>
 * where `onready` is the (optional, no-op by default) callback prop every chart accepts.
 */

/**
 * Observe an element with ResizeObserver and call `onready` once its dimensions have
 * been stable for `stability` ms, then disconnect. Fires at most once.
 *
 * @param {Element} node
 * @param {(() => void) | undefined} onready
 * @param {{ stability?: number }} [options]
 * @returns {() => void} cleanup
 */
export function observeStability(node, onready, { stability = 100 } = {}) {
  if (!onready) return () => {};

  /** @type {ReturnType<typeof setTimeout>} */
  let timeout;
  let done = false;

  const finish = () => {
    if (done) return;
    done = true;
    observer?.disconnect();
    onready();
  };

  /** @type {ResizeObserver | undefined} */
  let observer;
  if (typeof ResizeObserver === "undefined") {
    // no observer available: degrade to a plain delay
    timeout = setTimeout(finish, stability);
  } else {
    observer = new ResizeObserver(() => {
      // every size change (including the initial delivery) restarts the stability window
      clearTimeout(timeout);
      timeout = setTimeout(finish, stability);
    });
    observer.observe(node);
  }

  return () => {
    done = true;
    clearTimeout(timeout);
    observer?.disconnect();
  };
}

/**
 * Attachment factory: `<div {@attach readySignal(onready)}>`.
 * @param {(() => void) | undefined} onready
 * @param {{ stability?: number }} [options]
 * @returns {(node: Element) => () => void}
 */
export function readySignal(onready, options) {
  return (node) => observeStability(node, onready, options);
}
