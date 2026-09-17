<!-- A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review. -->

<!-- @component
The colored bar fill: anchored at the zero baseline via barGeometry, growing right for
positive values and left for negative (diverging) ones. Renders nothing for null values
— the row shows only the track and an "N/A" value label.
-->
<script>
  import { getContext } from "svelte";
  import { barGeometry } from "../barGeometry.js";

  const { xScale } = getContext("LayerCake");

  /**
   * @type {{
   *   value: number | null,
   *   color: string,
   *   dimmed?: boolean
   * }}
   */
  let { value, color, dimmed = false } = $props();

  const geometry = $derived(barGeometry(value, $xScale));
</script>

{#if value !== null && value !== undefined}
  <div
    class="fill"
    class:dimmed
    style:left="{geometry.fillLeft}%"
    style:width="{geometry.fillWidth}%"
    style:background-color={color}
  ></div>
{/if}

<style>
  .fill {
    position: absolute;
    top: 0;
    bottom: 0;
    z-index: 1;
    /* hover-dim to match the line chart's treatment; downloads never dim */
    transition: opacity 100ms ease-out;
  }
  .fill.dimmed {
    opacity: 0.33;
  }
</style>
