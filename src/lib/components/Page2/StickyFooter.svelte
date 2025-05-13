<script>
  import { slide } from "svelte/transition";
  import Button from "$components/Button.svelte";
  import IntersectionObserver from "svelte-intersection-observer";

  let { href, copy, buttonText } = $props();

  // declare element
  /** @type {HTMLDivElement | undefined} */
  let element = $state();

  // declare intersecting var
  let intersecting = $state(false);
</script>

<IntersectionObserver {element} bind:intersecting rootMargin="0px">
  <div aria-hidden="true" bind:this={element}>&nbsp;</div>
</IntersectionObserver>

<!-- {#if intersecting} -->
<!-- <footer transition:slide> -->
<!--   {#if copy} -->
<!--     <div>{copy}</div> -->
<!--   {/if} -->
<!--   <Button {href}>{buttonText}</Button> -->
<!-- </footer> -->
<!-- {/if} -->
<footer>
{#if intersecting}
    <div transition:slide>{copy}</div>
{/if}
  <Button {href}>{buttonText}</Button>
</footer>

<style>
  footer {
    position: sticky;
    width: 100%;
    bottom: 0;
    display: flex;
    justify-content: center;
    padding: var(--spacing-8) var(--spacing-8);
    background-color: var(--color-black);
    display: flex;
    gap: var(--spacing-6);
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: fit-content;
    z-index: 400;
  }

  footer div {
    font-family: var(--font-family-sans-alt);
    font-weight: var(--font-weight-bold);
    font-size: var(--font-size-3xl);
    color: var(--color-white);
    text-align: center;
    max-width: 41rem;
  }

  @media (max-width: 36rem) {
    footer {
      padding: var(--spacing-4) var(--spacing-4);
    }
  }
</style>
