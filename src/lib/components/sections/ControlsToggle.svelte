<!-- A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review. -->

<!-- @component
Mobile-only "Show controls" / "Hide controls" button (italic label + filter icon). Rendered
in three places below 64rem: at the top of the control-panel column, at the top of the
all-data section, and pinned inside the open control sheet as its close button. The
parent owns the dark-blue bar around it; the label flips on `open`.
-->
<script>
  import pageContent from "$data/archie-ml/page-tool.aml";
  import IconFilter from "$icons/IconFilter.svelte";

  /**
   * @typedef {Object} Props
   * @property {boolean} open - whether the control sheet is currently open
   * @property {(e: MouseEvent) => void} onclick
   */

  /** @type {Props} */
  let { open, onclick } = $props();
</script>

<button
  type="button"
  class="controls-toggle"
  class:open
  aria-expanded={open}
  aria-controls="control-panel-sheet"
  {onclick}
>
  <span>{open ? pageContent.controls.hide : pageContent.controls.show}</span>
  <span class="toggle-icon">
    <IconFilter />
  </span>
</button>

<style>
  .controls-toggle {
    display: flex;
    appearance: none;
    background: none;
    border: none;
    font: inherit;
    color: var(--color-white);
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-3);
    width: 100%;
    padding: 0;
    cursor: pointer;
  }

  /* the close button inside the open sheet hugs its label so the icon sits beside it,
     rather than being pushed to the far edge like the in-layout "show" trigger */
  .controls-toggle.open {
    width: auto;
    justify-content: flex-start;
  }

  .controls-toggle span:first-child {
    font-size: var(--font-size-large);
    font-style: italic;
    /* the label is one word; in the narrow gutter bar it must not wrap under the icon */
    white-space: nowrap;
  }

  .controls-toggle:hover span:first-child {
    text-decoration: underline;
  }

  .controls-toggle:focus-visible {
    outline: 2px solid var(--color-white);
    outline-offset: 2px;
  }

  .toggle-icon {
    line-height: 0;
  }
</style>
