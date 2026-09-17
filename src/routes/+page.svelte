<!-- A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review. -->

<script>
  import { setContext, tick } from "svelte";
  import { afterNavigate } from "$app/navigation";
  import { Meta, logClickToGA } from "@urbaninstitute/dataviz-components";
  import { getAbsoluteUrl } from "$utils/urls";
  import { constructQueryParams } from "$utils/queryParameters";
  import { ToolState } from "$lib/state/toolState.svelte.js";
  import Hero from "$components/sections/Hero.svelte";
  import IntroModal from "$components/sections/IntroModal.svelte";
  import ControlPanel from "$components/sections/ControlPanel.svelte";
  import MapModule from "$components/sections/MapModule.svelte";
  import EqMetricsSection from "$components/sections/EqMetricsSection.svelte";
  import AllDataSection from "$components/sections/AllDataSection.svelte";
  import ReturnToTop from "$components/sections/ReturnToTop.svelte";
  import SelectionAnnouncer from "$components/sections/SelectionAnnouncer.svelte";

  let { data } = $props();

  /** @type {HTMLElement | undefined} */
  let allDataEl = $state();

  // mobile-only control sheet; opened from the panel column's trigger or the second
  // trigger at the top of the all-data section (inert at desktop widths)
  let controlsOpen = $state(false);

  // the modal scrims the tool region rather than the viewport, so the page owns the open
  // flag: it marks the scrimmed content inert while the modal is up (2026-09-02)
  let introOpen = $state(false);

  const openIntroModal = () => {
    introOpen = true;
    logClickToGA(/** @type {*} */ (undefined), "tool-intro-modal-open");
  };

  // must run during component init: ToolState's $effects need this effect root
  const params = constructQueryParams();
  // svelte-ignore state_referenced_locally -- the merged load has no dependencies, so `data` never changes after init
  const tool = new ToolState(params, data);
  setContext("tool", tool);

  /**
   * Scroll to a #map / #eq-metrics / #all-data anchor after the page has mounted.
   * The anchors live on the always-rendered section wrappers below, so the targets
   * exist as soon as the page renders even while section contents load async.
   * @param {string | undefined} hash
   */
  async function scrollToHash(hash) {
    if (!hash) return;
    await tick();
    document.getElementById(hash.slice(1))?.scrollIntoView();
  }

  afterNavigate((nav) => {
    // initial entry (deep link) or arrival from another route (old-route redirects,
    // nav links from /about). Same-route navigations are query-param writes from
    // sveltekit-search-params — never re-scroll on those.
    if (nav.type === "enter" || nav.from?.route.id !== nav.to?.route.id) {
      scrollToHash(nav.to?.url.hash);
    }
  });
</script>

<Meta
  title={data.archie.page.title}
  description={data.archie.page.description}
  authors={data.meta.authors}
  keywords={data.meta.keywords}
  url={data.meta.url}
  siteName={data.meta.siteName}
  publishDate={data.meta.publishDate}
  socialImage={getAbsoluteUrl(data.meta.socialImage)}
/>

<Hero content={data.archie.page} publishDate={data.meta.publishDate} shareUrl={data.meta.url} />
<SelectionAnnouncer />
<!-- everything below the hero: the intro modal's scrim fills this box, leaving the hero
     copy readable on load, and `inert` keeps the scrimmed controls out of reach (mouse
     and keyboard) for as long as it is up -->
<div class="tool-region">
  <IntroModal bind:open={introOpen} content={data.archie.page.modal} />
  <div class="tool-layout" inert={introOpen}>
    <div class="panel-col">
      <ControlPanel
        content={data.archie.page}
        eqData={data.archie.eqData.data}
        onInfoClick={openIntroModal}
        bind:open={controlsOpen}
      />
      <ReturnToTop element={allDataEl} />
    </div>
    <div class="right-col">
      <section id="map">
        <MapModule
          content={data.archie.page}
          contextVars={data.metadata.context}
          onInfoClick={openIntroModal}
        />
      </section>
      <section id="eq-metrics">
        <EqMetricsSection timeframeOptions={data.archie.timeframeData.dropdown} />
      </section>
      <section id="all-data" bind:this={allDataEl}>
        <AllDataSection
          timeframeOptions={data.archie.timeframeData.dropdown}
          onShowControls={() => (controlsOpen = true)}
        />
      </section>
    </div>
  </div>
</div>

<style>
  /* containing block for the intro modal's absolutely positioned scrim; --nav-height
     lives here so the modal's sticky offset and the control panel's share one value */
  .tool-region {
    position: relative;
    --nav-height: 56px;
  }

  /* One stacking context for the whole tool, so the intro modal's scrim covers every
     layer inside it — map legend card, accordion drawers, the return-to-top button —
     with a single z-index instead of having to out-rank each one. The button's z-index
     of 400 was the one that punched through the scrim before this. */
  .tool-layout {
    position: relative;
    z-index: 0;
    display: grid;
    grid-template-columns: 16.25rem minmax(0, 60rem); /* 260px | ≤960px */
    gap: 5.625rem; /* 90px */
    justify-content: center; /* grid content maxes out at 1310px */
    padding: var(--spacing-8) var(--spacing-4) 0;
  }

  /* .panel-col stretches the full grid height; the panel sticks to the top inside it
     and the return-to-top button (margin-top: auto) sticks to the bottom */
  .panel-col {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .panel-col > :global(.control-panel) {
    position: sticky;
    top: calc(var(--nav-height, 0) + var(--spacing-3, 0.75rem));
  }

  .right-col {
    min-width: 0;
  }

  /* basic stacking below the expanded-mobile breakpoint (full mobile treatment: Phase 8) */
  @media (max-width: 64rem) {
    .tool-layout {
      grid-template-columns: 1fr;
      gap: var(--spacing-6);
    }

    /* the panel column is just the natural-width "Show controls" bar here, left-aligned
       (the controls open in a fixed sheet from ControlPanel) */
    .panel-col {
      align-items: flex-start;
    }

    .panel-col > :global(.control-panel) {
      position: static;
    }
  }

  /* 540–1024px: wide enough to keep the trigger beside the content rather than above it,
     but not wide enough for the full panel (which returns above 64rem). The panel column
     narrows to a 100px gutter holding the "Filter" bar (sticky under the navbar, as on
     desktop) and the return-to-top button; the controls themselves still open in the
     mobile sheet. Must follow the 64rem block — same specificity, later wins. */
  @media (min-width: 33.75rem) and (max-width: 64rem) {
    .tool-layout {
      grid-template-columns: 6.25rem minmax(0, 1fr); /* 100px gutter | content */
      gap: var(--spacing-4);
    }

    /* the bar fills the gutter instead of taking its natural width */
    .panel-col {
      align-items: stretch;
    }

    .panel-col > :global(.control-panel) {
      position: sticky;
      top: calc(var(--nav-height, 0) + var(--spacing-3, 0.75rem));
    }
  }
</style>
