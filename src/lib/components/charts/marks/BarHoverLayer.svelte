<!-- A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review. -->

<!-- @component
Pointer interaction layer for one bar row: on mousemove, snaps to the nearest mark
along x (barHover.snapTarget). A reference tick as the nearest mark activates `active`
with that tick's refs (coincident ticks share one tooltip) and an anchor element pinned
to the tick's x; the bar endpoint as nearest is a deliberate noop — its direct value
label already shows the value. One persistent anchor renders per tick: the Tooltip only
recomputes its position when the `el` reference changes, so snapping to a different
tick must hand it a different element (moving a single shared anchor left the tooltip
stranded at the previous tick's x).
-->
<script>
  import { getContext } from "svelte";
  import { snapTarget } from "../barHover.js";

  const { xScale } = getContext("LayerCake");

  /**
   * @type {{
   *   rowRole: import("$utils/getChartData").SeriesRole,
   *   barValue: number | null,
   *   refs: import("$utils/getChartData").BarRef[],
   *   active?: import("../barHover.js").BarActive | null
   * }}
   */
  let { rowRole, barValue, refs, active = $bindable(null) } = $props();

  /** @type {HTMLElement[]} */
  let anchorEls = $state([]);

  /** @param {MouseEvent} e */
  function onmousemove(e) {
    const rect = /** @type {HTMLElement} */ (e.currentTarget).getBoundingClientRect();
    // unmeasured layout (jsdom/SSR/pre-paint): nothing to snap to
    if (rect.width === 0) return;
    const target = snapTarget({
      pointerPx: e.clientX - rect.left,
      trackWidth: rect.width,
      barPct: barValue === null || barValue === undefined ? null : $xScale(barValue),
      tickPcts: refs.map((ref) => $xScale(ref.value))
    });
    if (target?.kind === "ticks" && anchorEls[target.anchorIndex]) {
      active = {
        rowRole,
        refs: target.tickIndexes.map((i) => refs[i]),
        el: anchorEls[target.anchorIndex]
      };
    } else {
      active = null;
    }
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="hover-layer" {onmousemove} onmouseleave={() => (active = null)}></div>
{#each refs as ref, i (ref.role)}
  <div class="hover-anchor" style:left="{$xScale(ref.value)}%" bind:this={anchorEls[i]}></div>
{/each}

<style>
  /* above the ticks (z 3) and value label (z 4) so it owns all pointer events */
  .hover-layer {
    position: absolute;
    inset: 0;
    z-index: 5;
  }
  .hover-anchor {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 0;
    pointer-events: none;
  }
</style>
