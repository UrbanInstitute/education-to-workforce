<!-- A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review. -->

<script>
  /**
   * Three horizontal sliders (filter/controls icon) — the mobile "Show controls" trigger.
   *
   * @typedef {Object} Props
   * @property {string} [stroke] - line/knob outline color
   * @property {string} [knobFill] - knob fill (design: blue-shade-dark on the darker panel bar)
   */

  /** @type {Props} */
  let { stroke = "#ffffff", knobFill = "#12719E" } = $props();
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  width="26"
  height="23"
  viewBox="0 0 26 23"
  fill="none"
  aria-hidden="true"
>
  <line
    x1="0.75"
    y1="2.25"
    x2="25.25"
    y2="2.25"
    {stroke}
    stroke-width="1.5"
    stroke-linecap="round"
  />
  <line
    x1="0.75"
    y1="11.25"
    x2="25.25"
    y2="11.25"
    {stroke}
    stroke-width="1.5"
    stroke-linecap="round"
  />
  <line
    x1="0.75"
    y1="20.25"
    x2="25.25"
    y2="20.25"
    {stroke}
    stroke-width="1.5"
    stroke-linecap="round"
  />
  <circle cx="6.5" cy="2.5" r="2" fill={knobFill} {stroke} />
  <circle cx="19.5" cy="11.5" r="2" fill={knobFill} {stroke} />
  <circle cx="11.5" cy="20.5" r="2" fill={knobFill} {stroke} />
</svg>
