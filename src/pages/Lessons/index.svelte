<script>
  import { db } from "../../common/stores";
  import { onMount } from "svelte";
  import { transaction } from "../../common/helpers.js";
  import Error from "../../components/Error.svelte";

  let lessons;
  let error = null;
  let deleteErrorID = null;
  let deleteError = null;
  let value = "";
  let sortOption = "Song-down";
  const sortOptions = ["Song", "Artist"];

  function computePracticeTime(totalTime) {
    const time = {
      d: Math.floor(totalTime / (60 * 60 * 24)),
      h: Math.floor((totalTime % (60 * 60 * 24)) / 3600),
      m: Math.floor((totalTime % 3600) / 60),
      s: Math.floor(totalTime % 60),
    };

    return Object.keys(time).reduce((acc, cV) => {
      return acc.concat(time[cV] ? `${time[cV]}${cV} ` : "");
    }, "");
  }

  async function exportData() {
    try {
      const stringifiedLessons = JSON.stringify(lessons);
      const blob = new Blob([stringifiedLessons], { type: "text/json" });
      const link = document.createElement("a");

      link.download = "lessons.json";
      link.href = window.URL.createObjectURL(blob);
      link.dataset.downloadurl = `text/json:${link.download}${link.href}`;

      const event = new MouseEvent("click", {
        view: window,
        bubbles: true,
        cancelable: true,
      });

      link.dispatchEvent(event);
      link.remove();
    } catch (err) {
      error = err.message;
    }
  }

  async function importData(e) {
    try {
      error = null;
      const files = e.target.files;

      if (files.length == 0) {
        return;
      }

      const file = files[0];
      if (file.type != "application/json") {
        throw new Error("Only JSON files allowed!");
      }

      let reader = new FileReader();

      reader.onload = e => {
        const stringifiedLessons = e.target.result;
        const importedLessons = JSON.parse(stringifiedLessons);

        const lessonStore = $db
          .transaction("lessons", "readwrite")
          .objectStore("lessons");

        importedLessons.forEach(lesson => lessonStore.put(lesson));
        lessons = importedLessons;
      };

      reader.onerror = e => {
        throw new Error(e.target.error.name);
      };

      reader.readAsText(file);
    } catch (err) {
      error = err.message;
    }
  }

  async function deleteLesson(id) {
    try {
      await transaction("delete", id, "readwrite");
      lessons = lessons.filter(lesson => lesson.id != id);
    } catch (err) {
      deleteError = err;
      deleteErrorID = id;
    }
  }

  onMount(() => {
    (async function setup() {
      lessons = (await transaction("getAll")) || null;
    })();
  });

  $: filteredSongs =
    lessons
      ?.sort((a, b) => {
        const [option, direction] = sortOption.split("-");
        const itemA = a[option == "Song" ? "title" : "artist"].toLowerCase();
        const itemB = b[option == "Song" ? "title" : "artist"].toLowerCase();

        if (itemA < itemB) {
          return direction == "up" ? 1 : -1;
        }

        if (itemA > itemB) {
          return direction == "up" ? -1 : 1;
        }

        return 0;
      })
      .filter(lesson => lesson.title?.toLowerCase().includes(value)) || [];
</script>

<section>
  <h1>Click a Lesson to start practicing</h1>
  <button
    on:click={() => {
      const lessonStore = $db.transaction("lessons", "readwrite").objectStore("lessons");
      lessons.forEach(lesson => {
        lessonStore.put(lesson);
      });
    }}>UPDATE</button>

  {#if lessons && lessons.length > 0}
    <div class="filter-sort">
      <input placeholder="Filter Songs" bind:value />

      <div class="sort">
        <span>Sort By: </span>
        {#each sortOptions as option}
          <span>{option}</span>
          {#each ["down", "up"] as direction}
            <button
              aria-label={`Sort ${option} a-z`}
              title={`Sort ${option} a-z`}
              on:click={() => (sortOption = `${option}-${direction}`)}
              class="naked-button"
              class:button-active={sortOption == `${option}-${direction}`}>
              <i class={`fa-solid fa-arrow-${direction}-a-z`} />
            </button>
          {/each}
        {/each}
      </div>
    </div>

    <ul>
      {#each filteredSongs as { id, title, totalTime, artist, finished }}
        <li class="lesson">
          <a class="fancy-link" href={`#/lesson/${id}`}>
            {title} - {artist}
          </a>
          <div class="time">
            {#if totalTime}
              <i title="Keep practicing" class="fa fa-hourglass-half" />
              {computePracticeTime(totalTime)}
            {:else if finished}
              <i
                title="Keep goin. The way to mastery is long."
                class="fa fa-hourglass-end" />
            {:else}
              <i title="Start practicing" class="fa fa-hourglass-start" />
            {/if}
          </div>
          {#if finished}
            <i title="Congrats, you finished this lesson" class="fa fa-trophy" />
          {/if}
          <button
            on:click={() => deleteLesson(id)}
            title="Delete Lesson"
            class="naked-button">
            <i class="fa fa-trash-alt" />
          </button>

          <Error
            error={deleteErrorID == id ? deleteError : null}
            errorMessage={`Sorry, couldn't delete ${title}`} />
        </li>
      {/each}
    </ul>
    <button on:click={exportData}>Export Data</button>
  {:else}
    <div>No lessons yet</div>
    <a href="#/new-lesson">Create a new One</a>
  {/if}
  <label
    >Import lessons: <input
      on:change|preventDefault={importData}
      accept=".json"
      type="file" /></label>

  {#if error}
    <div class="error">{error}</div>
  {/if}
</section>

<style lang="scss">
  h1 {
    font-size: 1.3rem;
    margin-bottom: 1rem;
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

  .filter-sort {
    display: flex;
    flex-flow: column;
  }

  .sort {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .button-active {
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
  }

  @media screen and (min-width: 640px) {
    .filter-sort {
      flex-flow: row;
      gap: 1rem;
    }
  }
</style>
