<!-- A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review. -->

<script>
  /**
   * @typedef {Object} Props
   * @property {(e: MouseEvent) => void} onclick
   * @property {string} [color]
   * @property {string} [label] - defaults to "Clear selection"; the control panel passes
   *   "Remove comparison" so both geocoders' clear links look identical
   */

  /** @type {Props} */
  let { onclick, color = "var(--color-gray-shade-darker)", label = "Clear selection" } = $props();
</script>

<div style="display: flex;justify-content: end; margin-top: var(--spacing-2);">
  <button class="clear-selection" {onclick} style:color>{label}</button>
</div>

<style>
  .clear-selection {
    padding: 0;
    background: none;
    border: none;
    font: inherit;

    font-size: var(--font-size-small);
    font-style: italic;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: var(--spacing-1);
  }
</style>
