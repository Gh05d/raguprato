<script>
  import { onMount } from "svelte";
  import { Link } from "svelte-routing";

  let lessons;

  onMount(() => {
    lessons = localStorage.getItem("lessons");
  });

  const style = `
    text-transform: uppercase;
    padding: 10px 5px;
    background: #ff6f91;
    color: white;
    border-radius: 4px;
    `;
</script>

<style lang="scss">
  div {
    margin-bottom: 20px;
  }
</style>

{#if lessons}
  {#each lessons as lesson}
    <div>{lesson}</div>
  {/each}
{:else}
  <div>No lessons yet</div>
  <Link getProps={() => ({ style })} to="/practice/new">Create a new One</Link>
{/if}
