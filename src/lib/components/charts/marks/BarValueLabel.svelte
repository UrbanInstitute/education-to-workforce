<!-- A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review. -->

<!-- @component
The value label at the bar's end, formatted via the LayerCake custom context's
formatType. The label sits outside the bar end, unless its measured span would land on
a reference tick or overflow the track — then it flips inside the fill, aligned to the
bar end (labelPlacement). Track width comes from LayerCake's width store; before the
label's first measurement (and under SSR/jsdom) labelWidth reads 0, so no collision can
register — the percent fallback keeps the outside placement, the one that can never
break the layout.
-->
<script>
  import { getContext } from "svelte";
  import { formatFun } from "$utils/formatFun";
  import { barGeometry, labelPlacement } from "../barGeometry.js";

  const { xScale, width, custom } = getContext("LayerCake");

  /**
   * @type {{
   *   value: number | null,
   *   tickValues?: number[],
   *   dimmed?: boolean
   * }}
   */
  let { value, tickValues = [], dimmed = false } = $props();

  const geometry = $derived(barGeometry(value, $xScale));

  let labelWidth = $state(0);
  const labelStyle = $derived.by(() => {
    if ($width > 0 && labelWidth > 0) {
      const { left } = labelPlacement({
        valueX: geometry.valueX,
        negative: geometry.negative,
        zeroX: $xScale(0),
        tickXs: tickValues.map((v) => $xScale(v)),
        trackWidth: $width,
        labelWidth
      });
      return `left: ${left}px`;
    }
    return geometry.negative
      ? `left: ${geometry.valueX}%; transform: translateX(calc(-100% - 6px))`
      : `left: calc(${geometry.valueX}% + 6px)`;
  });
</script>

<div
  class="value-label"
  class:negative={geometry.negative}
  class:dimmed
  style={labelStyle}
  bind:clientWidth={labelWidth}
>
  {formatFun(value, $custom.formatType)}
</div>

<style>
  .value-label {
    position: absolute;
    top: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    font-size: var(--font-size-small);
    font-family: var(--font-family-sans);
    font-weight: var(--font-weight-semibold);
    white-space: nowrap;
    z-index: 4;
    pointer-events: none;
    /* halo for legibility when the label sits inside the fill or over a tick */
    text-shadow:
      0 1px 0 var(--color-gray-shade-lightest),
      0 -1px 0 var(--color-gray-shade-lightest),
      1px 0 0 var(--color-gray-shade-lightest),
      -1px 0 0 var(--color-gray-shade-lightest);
    /* dims with the fill it labels (hover-dim); downloads never dim */
    transition: opacity 100ms ease-out;
  }
  .value-label.dimmed {
    opacity: 0.33;
  }
</style>
