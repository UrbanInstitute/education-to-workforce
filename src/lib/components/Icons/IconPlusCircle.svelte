<script>
  import { urbanColors } from "@urbaninstitute/dataviz-components/utils";
  /**
   * Hex color for arrow fill
   * @type {string}
   */
  export let fill = urbanColors.blue;
  export let size = 27;
</script>

<svg
  width={size * 1.1}
  height={size}
  viewBox="0 0 {size * 1.1} {size}"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
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
