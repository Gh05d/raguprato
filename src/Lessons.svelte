<script>
  import { onMount } from "svelte";
  import { Link } from "svelte-routing";
  import { LESSONS } from "./helpers.js";

  let lessons;

  onMount(() => {
    const stringifiedLessons = localStorage.getItem(LESSONS);

    if (stringifiedLessons) {
      lessons = JSON.parse(stringifiedLessons);
    }
  });

  function deleteLesson(id) {
    const newLessons = lessons.filter(lesson => lesson.id != id);

    lessons = newLessons;
    localStorage.setItem(LESSONS, newLessons);
  }

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

  .lesson {
    color: gold;
  }

  .naked-button {
    color: black;
    background: 0;

    &:hover {
      transform: translate(1px, -2px);
    }
  }
</style>

<section>
  <h1>Click a Lesson to start practicing</h1>
  {#if lessons && lessons.length > 0}
    <ul>
      {#each lessons as { id, title, finished }}
        <li class="lesson">
          <Link to={`/practice/${id}`}>{title}</Link>
          {#if finished}
            <i
              title="Congrats, you finished this lesson"
              class="fa fa-trophy" />
          {/if}
          <button
            on:click={() => deleteLesson(id)}
            title="Delete Lesson"
            class="naked-button">
            <i class="fa fa-trash-alt" />
          </button>
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
