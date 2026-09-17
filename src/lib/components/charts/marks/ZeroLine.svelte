<!-- A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review. -->

<!-- @component
The zero baseline for diverging bars (bars-negative.png): a vertical black line at
scale(0), which sits off-center whenever the domain spans negative and positive values.
-->
<script>
  import { getContext } from "svelte";

  const { xScale } = getContext("LayerCake");
</script>

<div class="zero-line" style:left="{$xScale(0)}%"></div>

<style>
  .zero-line {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    transform: translateX(-50%);
    background-color: var(--color-black);
    z-index: 2;
  }
</style>
