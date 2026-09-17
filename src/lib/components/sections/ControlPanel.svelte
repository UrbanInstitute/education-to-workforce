<!-- A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review. -->

<script>
  import { getContext } from "svelte";
  import { logClickToGA } from "@urbaninstitute/dataviz-components";
  import BasicDropdown from "$components/BasicDropdown.svelte";
  import GeocoderWrapper from "$components/Geocoder/GeocoderWrapper.svelte";
  import ClearSelection from "$components/Geocoder/ClearSelection.svelte";
  import SelectComparisonGeo from "$components/SelectComparisonGeo.svelte";
  import IconInformation from "$icons/IconInformation.svelte";
  import ControlsToggle from "./ControlsToggle.svelte";
  import { expandedMobileMediaQuery } from "$utils/mediaQuery.svelte.js";
  import { internalToSlug, DROPDOWN_WIDTH } from "$utils/consts";

  /**
   * Sticky dark-blue control panel (mockups 1–8): data level, geography geocoder,
   * essential question, metric, comparison geography. All writes go through ToolState
   * actions — no raw params access.
   *
   * GA naming: all interactions use the tool-* namespace (dev-plan Phase 8 rename).
   *
   * @typedef {Object} Props
   * @property {*} content - page-tool.aml (controls + geoLevelDropdownData)
   * @property {Array<*>} eqData - archie EQ list (id + shorthand)
   * @property {(e: MouseEvent) => void} onInfoClick - opens the intro modal
   * @property {boolean} [open] - mobile only: whether the control sheet is open (bindable,
   *   so the page can open it from the second trigger in the all-data section)
   */

  /** @type {Props} */
  let { content, eqData, onInfoClick, open = $bindable(false) } = $props();

  const tool = getContext("tool");

  // Mobile (<64rem): the panel column collapses to a dark "Show controls" bar and the
  // controls live in a native <dialog> that opens as a full-height sheet below the navbar
  // (showModal gives the focus trap, Esc-to-close, focus return to the trigger, and
  // top-layer stacking above the sticky nav / map / return-to-top). Desktop renders the
  // body inline exactly as before; `open` is inert there.
  let isMobile = $derived(expandedMobileMediaQuery.current);

  /** @type {HTMLDialogElement | undefined} */
  let sheet = $state();

  $effect(() => {
    if (!isMobile) {
      // leaving mobile unmounts the sheet — don't auto-reopen it on the way back
      open = false;
      return;
    }
    if (!sheet) return;
    if (open && !sheet.open) sheet.showModal();
    else if (!open && sheet.open) sheet.close();
  });

  // The sheet is a scroll container, so a geocoder suggestion list opening near its bottom
  // would otherwise sit clipped in the scrollable overflow. The list is laid out in flow
  // inside the sheet (CSS below); this reveals it as soon as the typeahead shows it. The
  // typeahead toggles the list with an inline display style, which is the only hook it
  // gives us — hence a MutationObserver rather than a geocoder event.
  $effect(() => {
    if (!sheet) return;
    const observer = new MutationObserver((mutations) => {
      for (const { target } of mutations) {
        const list = /** @type {HTMLElement} */ (target);
        if (list.matches("ul.suggestions") && list.style.display === "block") {
          list.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
      }
    });
    observer.observe(sheet, { subtree: true, attributes: true, attributeFilter: ["style"] });
    return () => observer.disconnect();
  });

  // The comparison controls are open when a comparison geography exists (deep link, map
  // click) or when the user expanded them — `bind:open` lets SelectComparisonGeo's button
  // set the flag. Syncing from `tool.geoid2` runs only when geoid2 itself changes, so the
  // user's expand survives, and removing the comparison collapses back to the button.
  let comparisonOpen = $state(false);
  $effect(() => {
    comparisonOpen = Boolean(tool.geoid2);
  });

  let eqOptions = $derived(
    eqData.map((/** @type {*} */ d) => ({ value: +d.id, label: d.shorthand }))
  );
  // same list the legend card's dropdown uses; derived once in ToolState so the panel's
  // "no metrics" message and the legend card's visibility can never disagree
  let metricOptions = $derived(tool.mapMetricOptions);

  /** @param {Event} e */
  const selectValue = (e) => /** @type {HTMLSelectElement} */ (e.currentTarget).value;
</script>

{#snippet panelBody()}
  <div class="panel-body">
    <div class="control-group">
      <span class="control-label">{content.controls.dataLevel}</span>
      <BasicDropdown
        id="control-level"
        inlineLabel={content.controls.dataLevel}
        placeholder={null}
        data={content.geoLevelDropdownData}
        value={tool.level}
        dropdownWidth={DROPDOWN_WIDTH}
        onchange={(e) => {
          tool.selectLevel(internalToSlug(selectValue(e)));
          logClickToGA(/** @type {*} */ (e.currentTarget), "tool-level-dropdown");
        }}
      />
    </div>

    <div class="control-group">
      <label class="control-label" for="geoid1">{content.controls.location}</label>
      <div class="dark-panel">
        <GeocoderWrapper
          geoLevel={tool.level}
          id="geoid1"
          onresult={(/** @type {*} */ d) => {
            if (d?.properties?.geoid) tool.selectGeoid1(d.properties.geoid);
          }}
          input={tool.geoid1Data ? tool.geoid1Data.name : ""}
        />
        {#if tool.geoid1}
          <ClearSelection
            color="var(--color-white)"
            onclick={(/** @type {MouseEvent} */ e) => {
              tool.selectGeoid1(null);
              logClickToGA(/** @type {*} */ (e.currentTarget), "tool-clear-geography");
            }}
          />
        {/if}
      </div>
    </div>

    <div class="control-group">
      <span class="control-label">
        {content.controls.question}
        <button class="info-button" aria-label="How to interpret this tool" onclick={onInfoClick}>
          <IconInformation bgFill="#d2d2d2" fill="#000000" />
        </button>
      </span>
      <BasicDropdown
        id="control-eq"
        inlineLabel={content.controls.question}
        placeholder={null}
        data={eqOptions}
        value={tool.eqid}
        dropdownWidth={DROPDOWN_WIDTH}
        onchange={(e) => {
          tool.selectEq(+selectValue(e));
          logClickToGA(/** @type {*} */ (e.currentTarget), "tool-eq-dropdown");
        }}
      />
    </div>

    <div class="control-group">
      <span class="control-label">{content.controls.metric}</span>
      {#if metricOptions.length}
        <!-- value is one-way on purpose: effectiveMetric is derived; the tool action keeps
           this dropdown, the legend card's, and the map in sync -->
        <BasicDropdown
          id="control-metric"
          inlineLabel={content.controls.metric}
          placeholder={null}
          data={metricOptions}
          value={tool.effectiveMetric}
          dropdownWidth={DROPDOWN_WIDTH}
          onchange={(e) => {
            tool.selectMetric(+selectValue(e));
            logClickToGA(/** @type {*} */ (e.currentTarget), "tool-metric-dropdown");
          }}
        />
      {:else}
        <p class="no-metrics">{content.controls.noMetrics}</p>
      {/if}
    </div>

    <div class="control-group comparison">
      <SelectComparisonGeo
        variant="dark-panel"
        horizontal={false}
        iconSize={38}
        disabled={!tool.geoid1}
        bind:open={comparisonOpen}
        label={content.controls.comparison}
        onclick={(e) => {
          logClickToGA(/** @type {*} */ (e.target), "tool-add-comparison-geography");
        }}
      >
        <div class="comparison-open">
          <label class="control-label" for="geoid2">{content.controls.comparisonLabel}</label>
          <div class="dark-panel">
            <GeocoderWrapper
              geoLevel={tool.level}
              id="geoid2"
              onresult={(/** @type {*} */ d) => {
                if (d?.properties?.geoid) tool.selectGeoid2(d.properties.geoid);
              }}
              input={tool.geoid2Data ? tool.geoid2Data.name : ""}
            />
            {#if tool.geoid2}
              <ClearSelection
                color="var(--color-white)"
                label={content.controls.removeComparison}
                onclick={(/** @type {MouseEvent} */ e) => {
                  tool.removeComparison();
                  logClickToGA(/** @type {*} */ (e.currentTarget), "tool-clear-comparison");
                }}
              />
            {/if}
          </div>
        </div>
      </SelectComparisonGeo>
    </div>
  </div>
{/snippet}

<div class="control-panel">
  {#if isMobile}
    <!-- the in-layout trigger always reads "Show controls": while the sheet is open it
         sits under the backdrop, inert -->
    <ControlsToggle open={false} onclick={() => (open = true)} />
    <dialog
      id="control-panel-sheet"
      class="control-sheet"
      aria-label={content.controls.sheetLabel}
      bind:this={sheet}
      onclose={() => (open = false)}
      onclick={(e) => {
        // a click on the dialog element itself is the backdrop (the dialog has no padding)
        if (e.target === sheet) open = false;
      }}
    >
      <div class="sheet-header">
        <ControlsToggle open={true} onclick={() => (open = false)} />
      </div>
      <div class="sheet-body">
        {@render panelBody()}
      </div>
    </dialog>
  {:else}
    {@render panelBody()}
  {/if}
</div>

<style>
  .control-panel {
    background: var(--color-blue-shade-dark);
    color: var(--color-white);
    padding: var(--spacing-10) var(--spacing-8) var(--spacing-6);
    display: flex;
    flex-direction: column;
  }

  .panel-body {
    display: flex;
    flex-direction: column;
  }

  .control-group {
    padding: var(--spacing-4) 0;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .control-group:not(:last-child) {
    border-bottom: 1px solid var(--color-blue-shade-darker);
  }

  .control-group:first-child {
    padding-top: 0;
  }

  .control-label {
    font-size: var(--font-size-small);
    text-transform: uppercase;
    color: var(--color-blue-shade-lightest);
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }

  .info-button {
    appearance: none;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    line-height: 0;
  }

  /* info "i" recolors on hover; CSS `fill` outranks the SVG presentation attribute */
  .info-button :global(svg circle),
  .info-button :global(svg path) {
    transition: fill 0.15s ease;
  }

  .info-button:hover :global(svg circle) {
    fill: var(--color-magenta-shade-darker);
  }

  .info-button:hover :global(svg path) {
    fill: var(--color-white);
  }

  .control-panel p.no-metrics {
    margin: 0;
    font-size: var(--font-size-small);
    font-style: italic;
    color: var(--color-blue-shade-lighter);
  }

  /* the group stretches so the open comparison controls left-align with the other inputs;
     the closed-state button centers its own icon + label */
  .comparison {
    align-items: stretch;
  }

  .comparison-open {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
    width: 100%;
  }

  /* the mobile sheet: a native <dialog> opened with showModal(), pinned below the navbar
     and stretching (at most) to the viewport bottom; the controls scroll inside it */
  .control-sheet {
    position: fixed;
    inset: var(--nav-height, 3.5rem) 0 auto 0;
    width: 100%;
    max-width: none;
    max-height: calc(100dvh - var(--nav-height, 3.5rem));
    margin: 0;
    padding: 0;
    border: none;
    background: var(--color-blue-shade-dark);
    color: var(--color-white);
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  .control-sheet::backdrop {
    background: rgba(0, 0, 0, 0.5);
  }

  /* the page underneath is inert while the sheet is open — stop it scrolling too */
  :global(body:has(.control-sheet:modal)) {
    overflow: hidden;
  }

  /* geocoder suggestion lists lay out in flow inside the sheet (they're absolutely
     positioned dropdowns elsewhere) so they extend the sheet instead of overflowing it */
  .control-sheet :global(.mapboxgl-ctrl-geocoder .suggestions) {
    position: static;
    box-shadow: none;
    scroll-margin-bottom: var(--spacing-6);
  }

  /* the close toggle stays pinned while the controls scroll under it, with the same
     divider the control groups use to separate it from the controls below */
  .sheet-header {
    position: sticky;
    top: 0;
    z-index: 1;
    background: var(--color-blue-shade-darker);
    padding: var(--spacing-6) var(--spacing-4) var(--spacing-3);
    border-bottom: 1px solid var(--color-blue-shade-darker);
  }

  .sheet-body {
    padding: var(--spacing-3) var(--spacing-4) var(--spacing-6);
  }

  /* Full-width controls up to the 48rem (768px) breakpoint; beyond it, hold the content at
     the width it reaches there (48rem minus the sheet-body's 1rem side padding = 46rem) and
     center it, rather than letting the inputs keep stretching across a wide tablet sheet. */
  .sheet-body .panel-body {
    max-width: 46rem;
    margin-inline: auto;
  }

  /* Below 540px the control-panel column collapses to the full-width dark "Show controls"
     bar; the bar hugs the toggle with an even spacing-3 all around (the desktop sidebar
     padding above would swamp it). */
  @media (max-width: 33.75rem) {
    .control-panel {
      padding: var(--spacing-3);
    }
  }

  /* Inside the mobile sheet, center the labels and let every input run the full width of
     the sheet. The groups keep their default cross-axis stretch so the inputs have a
     full-width parent to fill — centering the group instead would shrink each child to its
     content width and the inputs would size to their longest option. */
  .sheet-body .control-label {
    justify-content: center;
    text-align: center;
  }

  .sheet-body .comparison {
    align-items: stretch;
  }

  .sheet-body :global(.dropdown-container),
  .sheet-body :global(.dark-panel),
  .sheet-body :global(.geocoder-placeholder),
  .sheet-body :global(.geocoder-placeholder input),
  .sheet-body :global(.mapboxgl-ctrl-geocoder),
  .sheet-body :global(.mapboxgl-ctrl-geocoder--input) {
    /* the geocoder pins inline width + min-width (213px) on both its wrapper and its input
       and its stylesheet caps the wrapper at max-width 360px, so override all three — with
       min-width reset — to match the full-width dropdowns */
    width: 100% !important;
    min-width: 0 !important;
    max-width: none !important;
  }

  /* 540–1024px: the bar sits in the page layout's 100px gutter (+page.svelte). Trim its
     horizontal padding and the trigger's gap so the label and icon still fit on one row;
     the child combinator keeps this off the sheet's own close toggle. */
  @media (min-width: 33.75rem) and (max-width: 64rem) {
    .control-panel {
      padding: var(--spacing-4) var(--spacing-2);
    }

    .control-panel > :global(.controls-toggle) {
      gap: var(--spacing-2);
    }
  }
</style>
