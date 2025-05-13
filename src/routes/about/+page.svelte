<script>
  import {
    Meta,
    ProjectCredits,
    HeadingAlt,
    TextBlock,
    Block
  } from "@urbaninstitute/dataviz-components";
  // @ts-ignore
  import page from "$archie/page-about.aml";
  import { getAbsoluteUrl } from "$utils/urls";
  const { data } = $props();
</script>

<Meta
  title={page.meta.title}
  description={page.meta.description}
  authors={data.meta.authors}
  keywords={data.meta.keywords}
  url={data.meta.url}
  siteName={data.meta.siteName}
  publishDate={data.meta.publishDate}
  socialImage={getAbsoluteUrl(data.meta.socialImage)}
/>
<div style="margin-top:2rem;">
  <Block>
    <HeadingAlt content="About" />
    {#each page.about_a as item}
      {@html item.value}
    {/each}
    <ul>
      {#each page.about_sources as source}
        {@html source.value}
      {/each}
    </ul>
    {#each page.about_b as item}
      {@html item.value}
    {/each}
  </Block>

  <ProjectCredits
    heading="Project credits"
    items={page.credits.items}
    githubUrl="https://github.com/urbaninstitute/education-to-workforce"
  >
    <div slot="intro">
      <TextBlock>
        {@html page.credits.intro}
      </TextBlock>
    </div>
  </ProjectCredits>
</div>

<style>
  div :global(ul) {
    font-size: var(--font-size-large);
    padding-left: 1em;
  }

  @media (min-width: 769px) {
    div :global(ul) {
      font-size: var(--font-size-xl);
    }
  }
</style>
