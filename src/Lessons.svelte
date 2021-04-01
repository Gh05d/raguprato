<script>
  import { onMount } from "svelte";
  import { LESSONS } from "./helpers.js";

  export let navigate;
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
</script>

<section>
  <h1>Click a Lesson to start practicing</h1>
  {#if lessons && lessons.length > 0}
    <ul>
      {#each lessons as { id, title, finished }}
        <li class="lesson">
          <button class="fancy-link" on:click={() => navigate("lesson", id)}>
            {title}
          </button>
          {#if finished}
            <i
              title="Congrats, you finished this lesson"
              class="fa fa-trophy"
            />
          {/if}
          <button
            on:click={() => deleteLesson(id)}
            title="Delete Lesson"
            class="naked-button"
          >
            <i class="fa fa-trash-alt" />
          </button>
        </li>
      {/each}
    </ul>
  {:else}
    <div>No lessons yet</div>
    <button on:click={() => navigate("new")}>Create a new One</button>
  {/if}
</section>

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
    background: unset;

    &:hover {
      transform: translate(1px, -2px);
    }
  }

  .fancy-link {
    background-color: unset;
    padding: 0;
  }
</style>
