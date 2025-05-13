<script>
  /**
   * @param {string[]} header - Array of strings for the table header
   * @param {string[][]} rows - Array of arrays for the table rows
   */
  let {
    header = [
      "Geography",
      "0 - X,XXX",
      "XX,XXX - XX,XXX",
      "XX,XXX - XXX,XXX",
      "XXX,XXX - XXX,XXX",
      "XXX,XXX - XXX,XXX"
    ],
    rows = [
      ["Fairfax County, VA", "xx", "xx", "xx", "xx", "xx"],
      ["Virginia", "xx", "xx", "xx", "xx", "xx"],
      ["National", "xx", "xx", "xx", "xx", "xx"]
    ]
  } = $props();
</script>

<!-- table component -->
<div class="table-container">
  <table>
    <thead>
      <tr>
        {#each header as value}
          <th>{value}</th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each rows as arr, i}
        <!-- if second to last row, add a bottom border -->
        <tr class:divider-row={i === arr.length - 1}>
          {#each arr as d}
            <td>{d}</td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .table-container {
    width: 100%;
    overflow-x: auto;
    scrollbar-color: var(--color-gray) var(--color-white);
  }

  /* .table-container::-webkit-scrollbar {
    height: var(--spacing-2) !important;
  }

  .table-container::-webkit-scrollbar-thumb {
    background: var(--color-gray-shade-dark) !important;
  } */

  /* table */
  table {
    border-spacing: 0;
    font-size: var(--font-size-small);
    margin-bottom: var(--spacing-1);
    text-align: right;
    color: var(--color-black);
  }

  thead tr:first-child th {
    padding-bottom: var(--spacing-3);
    vertical-align: bottom;
    font-weight: var(--font-weight-bold);
  }

  tbody tr:first-child td {
    border-top: 1px solid var(--color-black);
  }

  tbody tr td {
    min-width: var(--spacing-20);
    padding: var(--spacing-2) var(--spacing-1);
    border-top: 1px solid var(--color-gray);
  }

  th {
    min-width: var(--spacing-20);
  }

  tbody tr td:first-child {
    min-width: 7.5rem;
  }

  /* last row has a black border before it */
  tr.divider-row td {
    border-top: 1px solid var(--color-black);
  }
</style>
