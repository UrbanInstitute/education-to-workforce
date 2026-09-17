// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

// jsdom has no ResizeObserver; Svelte's bind:clientWidth (and readySignal's observer
// path) need at least a no-op implementation. Dimensions stay 0 in jsdom — components
// fall back to their measurement-free paths, which is what the tests assert.
if (typeof window !== "undefined" && typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// jsdom has no matchMedia; svelte/motion's prefersReducedMotion (AccordionDrawer's slide
// transition) and $utils/mediaQuery.svelte need a static stub. matches stays false —
// tests exercise the default (motion-allowed, desktop) branches.
if (typeof window !== "undefined" && typeof window.matchMedia === "undefined") {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() {
      return false;
    }
  });
}

// jsdom has no Web Animations API; Svelte transitions (AccordionDrawer's slide) call
// element.animate and wait on onfinish. Complete immediately so intros/outros are
// synchronous in tests.
if (typeof Element !== "undefined" && !Element.prototype.animate) {
  Element.prototype.animate = function () {
    return {
      cancel() {},
      finished: Promise.resolve(),
      set onfinish(cb) {
        cb?.();
      },
      get onfinish() {
        return null;
      },
      set oncancel(cb) {},
      get oncancel() {
        return null;
      }
    };
  };
}

// jsdom 29 still lacks <dialog>'s showModal/close methods; IntroModal needs the minimal
// contract (open flag + close() so focus/Esc paths compile). No focus trap emulation —
// that's browser behavior, covered by manual QA.
if (typeof window !== "undefined" && typeof HTMLDialogElement !== "undefined") {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute("open", "");
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    };
  }
}
