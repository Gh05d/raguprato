<script>
  import { onMount } from "svelte";
  import { LESSONS } from "./helpers.js";

  export let navigate;
  let lessons;

  function computePracticeTime(totalTime) {
    const time = {
      d: Math.floor(totalTime / (60 * 60 * 24)),
      h: Math.floor((totalTime % (60 * 60 * 24)) / 3600),
      m: Math.floor((totalTime % 3600) / 60),
      s: Math.floor(totalTime % 60),
    };
    console.log(time);
    return Object.keys(time).reduce((acc, cV) => {
      return acc.concat(time[cV] ? `${time[cV]}${cV} ` : "");
    }, "");

    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }

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
      {#each lessons as { id, title, totalTime, artist, finished }}
        <li class="lesson">
          <button class="fancy-link" on:click={() => navigate("lesson", id)}>
            {title} - {artist}
          </button>
          <div class="time">
            {#if totalTime}
              <i title="Keep practicing" class="fa fa-hourglass-half" />
              {computePracticeTime(totalTime)}
            {:else if finished}
              <i
                title="Keep goin. The way to mastery is long."
                class="fa fa-hourglass-end"
              />
            {:else}
              <i title="Start practicing" class="fa fa-hourglass-start" />
            {/if}
          </div>
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
  h1 {
    font-size: 1rem;
    margin-bottom: 20px;
  }

  li {
    display: flex;
    align-items: center;
    gap: 0.5rem;

    button {
      margin-bottom: 0;
    }
  }

  .fa-trophy {
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
