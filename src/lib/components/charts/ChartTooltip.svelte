<!-- A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review. -->

<!-- @component
Shared chart tooltip: thin wrapper over the dataviz-components Tooltip (white card,
caret, dynamic orientation). Anchor it to a DOM element via `el` — BarGroup passes the
hovered/focused row, MultiLineChart passes its active point marker — so keyboard focus
positions identically to hover; `x`/`y` (page coordinates) are the fallback when no
element is available.
-->
<script>
  import { Tooltip } from "@urbaninstitute/dataviz-components";

  /**
   * `el` accepts SVG anchors too (MultiLineChart's point marker) — the underlying
   * Tooltip only calls getBoundingClientRect, which both element kinds support.
   * @type {{
   *   el?: HTMLElement | SVGElement,
   *   x?: number,
   *   y?: number,
   *   children?: import("svelte").Snippet
   * }}
   */
  let { el = undefined, x = 0, y = 0, children } = $props();

  const anchor = $derived(/** @type {HTMLElement | undefined} */ (el));
</script>

<Tooltip el={anchor} {x} {y} orientation="dynamic">
  {@render children?.()}
</Tooltip>
