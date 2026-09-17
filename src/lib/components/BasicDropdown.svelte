<!-- A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review. -->

<script>
  import IconChevronFull from "$icons/IconChevronFull.svelte";
  import IconChevronOutline from "$icons/IconChevronOutline.svelte";
  import { urbanColors } from "@urbaninstitute/dataviz-components/utils";

  /**
   * @typedef {Object} Props
   * @property {string} [variant="primary"] - variant of dropdown: "primary" | "secondary-blue" | "secondary-black" | "secondary-yellow"
   * @property {string} id - unique id given to the dropdown DOM node
   * @property {string | number | null} [value] - bindable current value (data.value)
   * @property {{ value: string | number, label: string }[]} data - source data (value and label attributes)
   * @property {string} inlineLabel - label for the dropdown (used for accessibility even if showLabel is false)
   * @property {boolean} [showLabel=false] - show label above dropdown
   * @property {string | null} [placeholder="Select..."] - placeholder when no option is selected (null to omit)
   * @property {boolean} [border=true] - show border around dropdown
   * @property {number} [dropdownWidth=260] - width (px) of the dropdown, capped at the
   *   container's own width so a narrow parent shrinks it instead of being overflowed
   * @property {(event: Event) => void} [onchange] - change callback (replaces the Svelte 4 on:change forwarding)
   * @property {import("svelte").Snippet} [icon] - custom chevron icon (defaults to the per-variant chevron)
   */

  /** @type {Props} */
  let {
    variant = "primary",
    id,
    value = $bindable(),
    data,
    inlineLabel,
    showLabel = false,
    placeholder = "Select...",
    dropdownWidth = 260,
    border = true,
    onchange = undefined,
    icon = undefined
  } = $props();
</script>

<div class="dropdown-parent">
  <label aria-hidden="true" hidden={!showLabel} for={id}>{inlineLabel} </label>
  <div class="dropdown-container" class:border style:width={`${dropdownWidth}px`}>
    <select
      bind:value
      name={id}
      {id}
      class={`dropdown-select ${variant}`}
      aria-label={inlineLabel}
      {onchange}
    >
      <!-- options -->
      {#if placeholder}
        <option value={null}>{placeholder}</option>
      {/if}
      {#each data as d (d.value)}
        {#if d.value !== ""}
          <option value={d.value}>{d.label}</option>
        {/if}
      {/each}
    </select>
    <div class="icons" aria-hidden="true">
      <span class="dropdown-chevron">
        {#if icon}
          {@render icon()}
        {:else if variant === "primary"}
          <IconChevronFull fill={urbanColors.blue_shade_dark} />
        {:else if variant === "secondary-blue" || variant === "secondary-black"}
          <IconChevronOutline />
        {:else if variant === "secondary-yellow"}
          <IconChevronOutline fill={urbanColors.black} />
        {/if}
      </span>
    </div>
  </div>
</div>

<style>
  .dropdown-parent {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .dropdown-container {
    position: relative;
    /* dropdownWidth is applied inline above, which as a hard width overflowed any parent
       narrower than it with no way for the parent to claw it back — the map legend card on
       a phone was the live case, a 340px dropdown in a ~300px card pushing 32px of
       horizontal page scroll at 360px wide. This clamps that case and nothing else: a
       parent at least dropdownWidth wide is untouched.
       max-width rather than folding the cap into the inline `width: min(100%, Npx)` — a
       percentage width resolves to auto for intrinsic sizing, so that shrank shrink-to-fit
       parents (the section-filter groups) to the select's own text and then resolved 100%
       against that, taking the timeframe dropdowns from 213px to 172px everywhere. */
    max-width: 100%;
  }

  label {
    font-size: var(--font-size-small);
    text-transform: uppercase;
    color: var(--color-gray-shade-darker);
  }

  select {
    cursor: pointer;
    text-overflow: ellipsis;
    font-size: var(--font-size-normal);
    font-family: Lato, helvetica, sans-serif;
    background-image: var(--bg-img);
    background-size: var(--spacing-4) var(--spacing-4);
    background-repeat: no-repeat;
    background-position: 95% center;
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    width: 100%;
    border-radius: 0;
  }

  .dropdown-select.primary {
    color: var(--color-black);
    font-weight: var(--font-weight-bold);
    background-color: var(--color-white);
    border: none;
    padding-right: var(--spacing-8);
  }

  .border .dropdown-select.primary {
    color: var(--color-gray-shade-darker);
    font-weight: var(--font-weight-normal);
    border: 1px solid var(--color-gray);
    padding: var(--spacing-2) var(--spacing-8) var(--spacing-2) var(--spacing-3);
  }

  .dropdown-select[class*="secondary-"] {
    padding: var(--spacing-1) var(--spacing-4);
    font-size: var(--font-size-normal);
    font-weight: var(--font-weight-bold);
    border-width: 1px;
    border-style: solid;
    line-height: 150%;
  }

  .dropdown-select.secondary-blue {
    color: var(--color-white);
    background-color: var(--color-blue);
    border-color: var(--color-blue);
  }

  .dropdown-select.secondary-black {
    color: var(--color-white);
    background-color: var(--color-black);
    border-color: var(--color-black);
  }

  .dropdown-select.secondary-yellow {
    color: var(--color-black);
    background-color: var(--color-yellow);
    border-color: var(--color-yellow);
  }

  .icons {
    pointer-events: none;
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    top: 0;
    display: flex;
    flex-direction: row-reverse;
    align-items: center;
    padding: 0 var(--spacing-3);
  }

  .dropdown-chevron {
    width: var(--spacing-4);
    height: var(--spacing-4);
  }
</style>
