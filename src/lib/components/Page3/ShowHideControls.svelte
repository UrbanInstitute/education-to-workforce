<script>
  import IconChevronOutline from "$icons/IconChevronOutline.svelte";
  import { urbanColors } from "@urbaninstitute/dataviz-components/utils";

  let { children, onclick = () => {} } = $props();
  let expanded = $state(false);
</script>

{#if children && expanded}
  <div>
    {@render children()}
  </div>
{/if}
<button
  onclick={(e) => {
    expanded = !expanded;
    onclick(e);
  }}
>
  <div class="control">
    <hr />
    <span class="control-text">{expanded ? "Hide" : "Show"} controls</span>
    <hr />
  </div>
  <div
    style:transform={!expanded ? "rotate(0deg) translateY(0px)" : "rotate(180deg) translateY(4px)"}
  >
    <IconChevronOutline fill={urbanColors.blue_shade_dark} />
  </div>
</button>

<style>
  button {
    padding: 0;
    background: none;
    border: none;
    font: inherit;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  button:hover {
    cursor: pointer;
  }

  button:hover .control-text {
    text-decoration: underline;
  }

  .control {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-4); /* Space between the text and the lines */
  }

  hr {
    flex: 1; /* Make the lines flexible to fill the space */
    border: none;
    border-top: 1px solid var(--color-gray);
  }

  .control-text {
    font-size: var(--font-size-large);
    color: var(--color-blue-shade-dark);
    font-style: italic;
  }
</style>
