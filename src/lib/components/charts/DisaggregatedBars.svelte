<!-- A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review. -->

<!-- @component
Per-subgroup bar small multiples (mockups 7–8): one labeled BarGroup per subgroup, all
sharing the card-wide domain/diverging so equal values — and the zero baseline on the
representation-gap metrics — align across subgroups. Empty subgroups are not omitted
(settled 2026-07-15): BarGroup's native null handling renders them as gray tracks with
"N/A" value labels, which also covers the mixed case where only one geography of a
comparison pair has subgroup data. Geography names live in the card legend, so the
per-row name labels are off and the subgroup label is the only text per group.

Signals render-readiness for the download handshake via readySignal on the root: the
container's size settles only after every subgroup's BarGroup lays out, so a single
root signal is equivalent to waiting on the last subgroup.
-->
<script>
  import BarGroup from "./BarGroup.svelte";
  import { readySignal } from "$utils/readySignal";

  /**
   * Accepts the spread of getDisaggregatedData (displayYear is card chrome, rendered
   * by the card, not here).
   * @type {{
   *   subgroups: {
   *     field: string,
   *     label: string,
   *     bars?: import("$utils/getChartData").BarRow[],
   *     noData: boolean
   *   }[],
   *   domain: [number, number],
   *   diverging?: boolean,
   *   formatType?: string,
   *   onready?: () => void
   * }}
   */
  let {
    subgroups,
    domain,
    diverging = false,
    formatType = undefined,
    onready = undefined
  } = $props();
</script>

<div class="disaggregated-bars" {@attach readySignal(onready)}>
  {#each subgroups as subgroup (subgroup.field)}
    <div class="subgroup" role="group" aria-label={subgroup.label}>
      <div class="subgroup-label">{subgroup.label}</div>
      <BarGroup bars={subgroup.bars ?? []} {domain} {diverging} {formatType} showLabels={false} />
    </div>
  {/each}
</div>

<style>
  .disaggregated-bars {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }
  .subgroup-label {
    font-size: var(--font-size-small);
    font-family: var(--font-family-sans);
    margin-bottom: var(--spacing-1);
  }
</style>
