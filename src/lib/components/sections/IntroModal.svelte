<!-- A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review. -->

<script>
  import { onMount, tick } from "svelte";

  /**
   * "How to interpret this tool" modal (mockups 1, 9). Scoped to the tool region rather
   * than the viewport: the scrim fills the page's `.tool-region` wrapper — everything
   * below the hero — so the intro copy stays legible on load and the user meets the modal
   * as they scroll into the map (2026-09-02 design review). The panel is sticky inside
   * that box, so it stays in view for the whole scrimmed stretch and is already on screen
   * when reopened from an info icon further down.
   *
   * That placement rules out `<dialog showModal()>`, which always renders full-viewport in
   * the top layer, so the pieces it provided come from here instead: Esc-to-close on the
   * window, focus moved to the panel (and returned to the trigger) only for icon-triggered
   * opens, and `inert` on the surrounding content — applied by the page, since the scrimmed
   * content is this component's sibling. Opens once per session on load; reopens from the
   * info icons next to the EQ heading and the control panel's ESSENTIAL QUESTION label.
   *
   * @typedef {{ type: string, value?: string, items?: string[] }} CopyBlock
   *   An ordered block of modal copy from page-tool.aml: `type: list` renders `items`
   *   as a <ul>, anything else renders `value` as a paragraph. Values carry inline HTML.
   *
   * @typedef {Object} Props
   * @property {{ title: string, copy: CopyBlock[] }} content - page-tool.aml {modal}
   * @property {boolean} [open] - bindable; the page reads it to mark the tool content inert
   */

  /** @type {Props} */
  let { content, open = $bindable(false) } = $props();

  const SESSION_KEY = "e2w-intro-seen";

  /** @type {HTMLElement | undefined} */
  let panelEl = $state();

  // the info icon the modal was opened from, to hand focus back on close. Plain variable:
  // nothing renders from it, and writing it must not re-run the focus effect.
  /** @type {HTMLElement | null} */
  let trigger = null;

  const close = () => (open = false);

  onMount(() => {
    // once per session; try/catch for storage-disabled browsers
    try {
      if (!sessionStorage.getItem(SESSION_KEY)) {
        sessionStorage.setItem(SESSION_KEY, "1");
        open = true;
      }
    } catch {
      // no sessionStorage — skip the on-load open rather than nag on every reload
    }
  });

  // Focus follows an icon-triggered open only. The on-load open leaves focus alone on
  // purpose: pulling it into the panel would scroll the hero — the one section this modal
  // is meant to leave readable — out of view.
  $effect(() => {
    if (open) {
      const active = document.activeElement;
      if (active instanceof HTMLElement && active !== document.body) {
        trigger = active;
        // preventScroll: the panel is sticky, so it is already on screen
        tick().then(() => panelEl?.focus({ preventScroll: true }));
      }
    } else if (trigger) {
      // the page drops `inert` in the same update, so the trigger is focusable again
      const el = trigger;
      trigger = null;
      tick().then(() => el.focus());
    }
  });
</script>

<svelte:window
  onkeydown={(e) => {
    if (open && e.key === "Escape") close();
  }}
/>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="intro-overlay"
    onclick={(e) => {
      // a click on the overlay itself is the scrim, not the panel
      if (e.target === e.currentTarget) close();
    }}
  >
    <div
      class="intro-panel"
      bind:this={panelEl}
      role="dialog"
      aria-labelledby="intro-modal-title"
      tabindex="-1"
    >
      <button class="close-button" aria-label="Close" onclick={close}>
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
          <path
            d="M2 2 L18 18 M18 2 L2 18"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
          />
        </svg>
      </button>
      <h2 id="intro-modal-title">{content.title}</h2>
      {#each content.copy as block, i (i)}
        {#if block.type === "list"}
          <ul>
            {#each block.items ?? [] as item, j (j)}
              <li>{@html item}</li>
            {/each}
          </ul>
        {:else}
          <p>{@html block.value}</p>
        {/if}
      {/each}
    </div>
  </div>
{/if}

<style>
  /* fills the page's .tool-region (position: relative), which starts below the hero */
  .intro-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    /* the page gives .tool-layout its own stacking context at z-index 0, so this single
       step covers everything inside it. Still below the navbar (400), which stays usable
       — as it would have been under a native dialog's backdrop. */
    z-index: 1;
  }

  .intro-panel {
    position: sticky;
    top: calc(var(--nav-height, 3.5rem) + var(--spacing-4));
    margin: var(--spacing-6) auto 0;
    max-width: 580px;
    /* the page keeps scrolling behind the modal, so the panel can't grow past the
       viewport — long copy on a short screen scrolls inside the panel instead */
    max-height: calc(100vh - var(--nav-height, 3.5rem) - var(--spacing-8));
    overflow-y: auto;
    background: var(--color-magenta-shade-darker);
    color: var(--color-white);
    padding: 80px 64px 64px;
  }

  .intro-panel:focus {
    outline: none;
  }

  h2 {
    color: var(--color-white) !important;
    font-size: 28px !important;
    line-height: 36px !important;
    margin: 0 0 var(--spacing-4) !important;
  }

  p,
  ul {
    margin: 0 0 var(--spacing-3) !important;
    font-size: var(--font-size-normal) !important;
    line-height: 1.5 !important;
    color: var(--color-white) !important;
  }

  ul {
    padding-left: var(--spacing-4);
  }

  li {
    margin-bottom: var(--spacing-2);
  }

  li:last-child {
    margin-bottom: 0;
  }

  p :global(a),
  li :global(a) {
    color: var(--color-white) !important;
    text-decoration: underline !important;
  }

  .close-button {
    appearance: none;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-white);
    position: absolute;
    top: var(--spacing-4);
    right: var(--spacing-4);
    padding: var(--spacing-1);
    line-height: 0;
  }

  /* the desktop padding is most of a phone's width; the close button stays clear of the
     heading either way */
  @media (max-width: 40rem) {
    .intro-panel {
      margin-left: var(--spacing-3);
      margin-right: var(--spacing-3);
      padding: 56px var(--spacing-4) var(--spacing-5);
    }
  }
</style>
