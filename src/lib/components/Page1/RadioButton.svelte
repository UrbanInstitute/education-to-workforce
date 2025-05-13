<script>
  let { title, subtitle = undefined, value, disabled, group = $bindable(), onchange } = $props();
</script>

<input name="eqid" type="radio" id={value} {value} {disabled} bind:group onchange={(e) => onchange(e)}/>
<label for={value} class:disabled>
  <span class="title">{title}</span>
  {#if subtitle}
    <span class="subtitle">{subtitle}</span>
  {/if}</label
>

<style>
  /* set input to be invisible (but still present) */
  input {
    opacity: 0;
    position: fixed;
    width: 0;
  }

  /* style based on checked state */
  input:checked + label {
    color: white;
    background-color: var(--color-blue-shade-dark);
  }

  /* style based on focused state */
  input:focus-visible + label {
    padding: calc(0.75rem - 2px);
    border: 2px solid var(--color-blue-shade-darkest);
  }

  label {
    border-radius: 0.625rem;
    padding: 0.75rem;
    background-color: white;
    color: #353535;
    font-family: "Lato";
    font-size: 0.875rem;
    border: none;
  }

  label:hover {
    cursor: pointer;
    color: white;
    background-color: var(--color-blue-shade-dark);
  }

  label.disabled {
    background-color: #f2f2f2;
    color: var(--color-gray-shade-dark);
    cursor: not-allowed;
  }

  label .title {
    font-weight: bold;
  }
</style>
