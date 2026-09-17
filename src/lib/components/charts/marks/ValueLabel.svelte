<!-- A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review. -->

<!-- @component
Value labels for one trend series (ported from TrendlineChart/ValueLabel.svelte):
receives its series' values as a prop, labels the first and last non-null points when
`showEndpoints` (solid series; dashed reference series pass false and only ever label
on hover), reveals the hovered year's label via `activeYear` (passed only when this
series is the active one), dims via `dimmed` when another series is active, and shows
every label when `showAllLabels` (image download). Keeps the stroke-halo pattern for
legibility over lines. When `avoidValues` carries another series' points (each solid
series receives the other's), a colliding label flips below its point when its point
is the lower of the pair — ties yield to the `flipOnTie` instance — so label stacking
always matches line order (lineLabelGeometry.js). Endpoint labels dodge the other
series' endpoints; under `showAllLabels` (download) every label dodges every point.
-->
<script>
  import { getContext } from "svelte";
  import { raise } from "layercake";
  import { formatFun } from "$utils/formatFun";
  import { endpointLabelY, ABOVE_OFFSET } from "../lineLabelGeometry.js";

  const { xGet, yGet, width, height } = getContext("LayerCake");

  /**
   * @type {{
   *   values: { year: number, value: number | null }[],
   *   formatType?: string,
   *   activeYear?: number | null,
   *   showAllLabels?: boolean,
   *   showEndpoints?: boolean,
   *   dimmed?: boolean,
   *   avoidValues?: { year: number, value: number | null }[],
   *   flipOnTie?: boolean
   * }}
   */
  let {
    values,
    formatType = undefined,
    activeYear = null,
    showAllLabels = false,
    showEndpoints = true,
    dimmed = false,
    avoidValues = undefined,
    flipOnTie = false
  } = $props();

  /** @type {SVGGElement | undefined} */
  let el = $state();

  const nonNull = $derived(values.filter((v) => v.value !== null && v.value !== undefined));

  /** @param {number} i @param {{ year: number, value: number | null }[]} all */
  const textAnchor = (i, all) => {
    if (all.length === 1) {
      // single-point series sit on the full-dataset x-domain; anchor the label away
      // from whichever edge the point is nearest so it never clips
      return $xGet(all[0]) > $width / 2 ? "end" : "start";
    }
    return i === 0 ? "start" : i === all.length - 1 ? "end" : "middle";
  };

  /** @param {{ year: number }} v @param {number} i @param {unknown[]} all */
  const showLabel = (v, i, all) =>
    showAllLabels || (showEndpoints && (i === 0 || i === all.length - 1)) || v.year === activeYear;

  // The other solid series' labels this series must dodge (MultiLineChart passes
  // each solid series the other's values): its endpoints normally, every point
  // under showAllLabels since downloads render them all. On collision the lower
  // point's label flips below it. Hover labels stay above regardless — they show
  // one at a time, so they have nothing to collide with.
  const avoidNonNull = $derived(
    (avoidValues ?? []).filter((v) => v.value !== null && v.value !== undefined)
  );
  const avoidIndices = $derived(
    avoidNonNull.length === 0
      ? []
      : showAllLabels
        ? avoidNonNull.map((_, i) => i)
        : [...new Set([0, avoidNonNull.length - 1])]
  );
  const avoidLabels = $derived(
    avoidIndices.map((i) => ({
      x: $xGet(avoidNonNull[i]),
      y: $yGet(avoidNonNull[i]),
      anchor: textAnchor(i, avoidNonNull),
      chars: formatFun(avoidNonNull[i].value, formatType).length
    }))
  );

  /** @param {{ year: number, value: number | null }} v @param {number} i */
  const labelY = (v, i) => {
    const dodges = showAllLabels || i === 0 || i === nonNull.length - 1;
    if (!dodges || avoidLabels.length === 0) return $yGet(v) - ABOVE_OFFSET;
    return endpointLabelY({
      point: {
        x: $xGet(v),
        y: $yGet(v),
        anchor: textAnchor(i, nonNull),
        chars: formatFun(v.value, formatType).length
      },
      avoid: avoidLabels,
      plotHeight: $height,
      flipOnTie
    }).y;
  };

  $effect(() => {
    if (activeYear !== null && el) {
      const highlightEl = el.querySelector("text.highlight");
      if (highlightEl) {
        raise(highlightEl);
      }
    }
  });
</script>

<!-- the active series dims its own endpoint labels too, leaving only the hovered-year
     label (.highlight) at full opacity; non-active series dim everything via `dimmed` -->
<g class="value-label-group" class:dimmed={dimmed || activeYear !== null} bind:this={el}>
  {#each nonNull as v, i (v.year)}
    {#if showLabel(v, i, nonNull)}
      <text
        x={$xGet(v) + 3}
        y={labelY(v, i)}
        text-anchor={textAnchor(i, nonNull)}
        class:highlight={v.year === activeYear}>{formatFun(v.value, formatType)}</text
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
  .dimmed text {
    opacity: 0.33;
  }
  .dimmed text.highlight {
    opacity: 1;
  }
</style>
