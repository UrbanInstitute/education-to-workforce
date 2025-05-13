<!-- @component Generates a value label placed at the end of the bar for the bar chart -->
<script>
  import { getContext } from "svelte";
  import { formatFun } from "$utils/formatFun";
  import { fade } from "svelte/transition";
  import { raise } from "layercake";

  const { data, xGet, yGet, custom, y } = getContext("LayerCake");

  const { highlightItem = null, showAllLabels = false } = $props();

  let el = $state();

  function textAnchor(item, allItems) {
    const i = allItems.indexOf(item);
    if (i === 0) {
      return "start";
    }
    if (i === allItems.length - 1) {
      return "end";
    }
    return "middle";
  }

  function showLabel(item, idx, allItems) {
    if (idx === 0 || idx === allItems.length - 1) {
      return true;
    }
    return false;
  }

  let filteredData = $derived($data.filter((d) => $y(d) !== null));
  $effect(() => {
    if (highlightItem !== null) {
      let highlightEl = el.querySelector("text.highlight");
      if (highlightEl) {
        raise(highlightEl)
      }
    }
  })
</script>

<g class="value-label-group" class:highlight={highlightItem !== null} bind:this={el}>
  {#each filteredData as d, i}
    {@const isHighlighted = highlightItem === i}
    {#if ($y(d) !== null && showLabel(d, i, filteredData)) || highlightItem == i || showAllLabels}
      <text
        data-id={i}
        x={$xGet(d) + 3}
        y={$yGet(d) - 7}
        text-anchor={textAnchor(d, $data)}
        class:highlight={isHighlighted}>{formatFun($y(d), $custom.formatType)}</text
      >
    {/if}
  {/each}
</g>

<style>
  text {
    font-size: var(--font-size-small);
    font-family: var(--font-family-sans);
    paint-order: stroke;
    fill: var(--color-black);
    stroke: var(--color-gray-shade-lightest);
    stroke-width: 4px;
    stroke-linejoin: round;
    stroke-linecap: round;
    pointer-events: none;
  }
  .highlight text {
    opacity: 0.33;
  }
  .highlight text.highlight {
    opacity: 1;
  }
</style>
