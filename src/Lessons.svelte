<script>
  import { onMount } from "svelte";
  import { Link } from "svelte-routing";
  import { LESSONS } from "./helpers.js";

  let lessons;

  onMount(() => {
    const stringifiedLessons = localStorage.getItem(LESSONS);
    lessons = JSON.parse(stringifiedLessons);
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

  h1 {
    font-size: 1rem;
    margin-bottom: 20px;
  }
</style>

<section>
  <h1>Click a Lesson to start practicing</h1>
  {#if lessons}
    <ul>
      {#each lessons as { id, title }}
        <li>
          <Link to={`/practice/${id}`}>{title}</Link>
        </li>
      {/each}
    </ul>
  {:else}
    <div>No lessons yet</div>
    <Link getProps={() => ({ style })} to="/practice/new">
      Create a new One
    </Link>
  {/if}
</section>
