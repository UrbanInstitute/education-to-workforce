<script>
  let { children, disabled = false } = $props();
</script>

<fieldset {disabled}>
  {@render children?.()}
</fieldset>

<style>
  fieldset {
    border: none;
    margin: 0;
    padding: 0;

    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
  }
</style>
