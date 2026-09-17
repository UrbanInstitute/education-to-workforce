<!-- A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review. -->

<script>
  import { base } from "$app/paths";
  import { prefersReducedMotion } from "svelte/motion";
  import { SocialShare, logClickToGA } from "@urbaninstitute/dataviz-components";
  import Button from "$components/Button.svelte";
  import page from "$archie/page-tool.aml";

  /**
   * Hero section (mockup 1): title, publish date, share icons, intro copy centered over a
   * dimmed autoplay background video (the same asset as the v1 landing page). `content`
   * keys follow page-tool.aml (title / copy); the share URL is the canonical tool URL.
   *
   * @typedef {Object} Props
   * @property {{ title: string, copy: string[] }} content - page-tool.aml hero keys
   * @property {string} publishDate - ISO date string from meta.aml
   * @property {string} shareUrl - canonical tool URL for social share links
   */

  /** @type {Props} */
  let { content, publishDate, shareUrl } = $props();

  // date-only strings parse as UTC; anchor to local midnight so the day doesn't shift
  let formattedDate = $derived(
    new Date(`${publishDate}T00:00:00`).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    })
  );
</script>

<header class="hero">
  <!-- Background video: muted/looping/decorative, same asset as the v1 landing page.
     Skipped entirely under prefers-reduced-motion (WCAG 2.2.2) — it is purely decorative,
     so dropping it leaves the hero on the scrim's flat wash and also spares those users
     the ~1.6 MB download during first paint. There is deliberately no pause control yet;
     that half of cleanup #4 is held for the design consult (dev-plan 12.3). -->
  {#if !prefersReducedMotion.current}
    <video class="hero-video" autoplay loop muted playsinline aria-hidden="true">
      <source src="{base}/video/video.webm" type="video/webm" />
      <source src="{base}/video/video-264.mp4" type="video/mp4" />
      <source src="{base}/video/video-265.mp4" type="video/mp4" />
    </video>
  {/if}
  <div class="hero-scrim"></div>

  <div class="hero-content">
    <h1>{content.title}</h1>
    <p class="publish-date">{formattedDate}</p>
    <hr />
    <div class="share">
      <SocialShare
        {shareUrl}
        variant="dark"
        iconSize={24}
        onClick={(/** @type {*} */ _evt, /** @type {string} */ platform) =>
          logClickToGA(/** @type {*} */ (undefined), `tool-hero-share-${platform}`)}
      />
    </div>
    <div class="intro-copy">
      {#each content.copy as copy, i (i)}
        <p>{@html copy}</p>
      {/each}
    </div>
    <div class="intro-download">
      <Button variant="primary" href={page.data_download_link} target="_blank"
        >{page.data_download_text}</Button
      >
    </div>
  </div>
</header>

<style>
  .hero {
    position: relative;
    overflow: hidden;
    display: flex;
    justify-content: center;
    padding: 4rem 2rem;
    --button-hover-background: var(--color-magenta-shade-dark);
    --button-hover-border: solid 1px var(--color-magenta-shade-dark);
  }

  /* full-bleed background video, faded to a light wash so the dark hero text stays legible */
  .hero-video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: 0;
  }

  .hero-scrim {
    position: absolute;
    inset: 0;
    background: rgba(255, 255, 255, 0.72);
    z-index: 1;
  }

  .hero-content {
    position: relative;
    z-index: 2;
    max-width: 48rem;
    width: 100%;
  }
  .hero-content :global(p a) {
    color: var(--color-gray-shade-darkest);
    text-decoration: underline;
    font-weight: var(--font-weight-normal);
  }

  h1 {
    margin: 0 0 0.5rem;
    text-align: center;
  }

  .publish-date {
    font-size: var(--font-size-small) !important;
    color: var(--color-gray-shade-darkest);
    text-align: center;
    margin: 0 0 1.5rem;
  }

  hr {
    border: 0;
    border-top: 1px solid var(--color-gray);
    margin: 0 0 1.25rem;
  }

  .share {
    display: flex;
    justify-content: center;
    margin-bottom: 2.5rem;
  }

  .intro-copy p {
    margin: 0 0 1rem;
  }

  .intro-copy :global(a) {
    text-decoration: underline;
  }
</style>
