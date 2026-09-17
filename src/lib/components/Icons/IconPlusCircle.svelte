<!-- A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review. -->

<script>
  import { urbanColors } from "@urbaninstitute/dataviz-components/utils";

  /**
   * @typedef {Object} Props
   * @property {string} [fill] - hex color for the circle fill
   * @property {number} [size] - height in px; the viewBox is 1.1x as wide
   */

  /** @type {Props} */
  let { fill = urbanColors.blue, size = 27 } = $props();
</script>

<svg
  width={size * 1.1}
  height={size}
  viewBox="0 0 {size * 1.1} {size}"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
  aria-hidden="true"
>
  <circle cx={size / 2} cy={size / 2} r={size / 2} {fill} />
  <path
    d={`M${size * 0.188} ${size * 0.544}V${size * 0.469}H${size * 0.781}V${size * 0.544}H${size * 0.188}Z`}
    fill="white"
  />
  <path
    d={`M${size * 0.535} ${size * 0.804}H${size * 0.461}V${size * 0.211}H${size * 0.535}V${size * 0.804}Z`}
    fill="white"
  />
</svg>
