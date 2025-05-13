<script>
  import { urbanColors } from "@urbaninstitute/dataviz-components/utils";
  /**
   * Hex color for arrow fill
   * @type {string}
   */
  export let bgFill = urbanColors.gray_shade_medium; //matches #DCDBDB
  export let fill = urbanColors.blue_shade_dark;
  export let size = 36;
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 36 36"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
>
  <ellipse cx={18} cy={18} rx={18} ry={18} fill={bgFill} />
  <path
    d="M27.9614 14.0297C28.0531 14.1534 28.0954 14.2915 28.0954 14.4443C28.0954 14.597 28.0531 14.7207 27.9614 14.8152L18.6165 24.4962C18.4966 24.5908 18.3626 24.6344 18.2144 24.6344C18.0663 24.6344 17.9464 24.5908 17.8548 24.4962L8.4675 14.8152C8.37581 14.7207 8.3335 14.597 8.3335 14.4443C8.3335 14.2915 8.37581 14.1534 8.4675 14.0297L9.3632 13.106C9.44784 13.0114 9.56773 12.9678 9.7229 12.9678C9.87806 12.9678 10.005 13.0114 10.1249 13.106L18.2215 21.4559L26.311 13.106C26.4309 13.0114 26.5649 12.9678 26.7131 12.9678C26.8612 12.9678 26.9811 13.0114 27.0728 13.106L27.9614 14.0297Z"
    {fill}
  />
</svg>
