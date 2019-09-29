<script>
  import { onMount, afterUpdate } from "svelte";
  import { createID, LESSONS } from "./helpers.js";

  export let id;
  let lesson;
  let lessons;
  let selectedChord = "";
  let notes = "";
  let editNotes = false;
  let chordToUpdate = "";
  const chords = ["A", "B", "C", "D", "E", "F", "G"];

  async function updateLesson() {
    try {
      const newLessons = lessons.filter(item => item.id == !lesson.id);
      await localStorage.setItem(
        LESSONS,
        JSON.stringify([...newLessons, lesson])
      );
    } catch (error) {
      console.error(error);
    }
  }

  async function addChord(chord) {
    if (!chord) {
      return;
    }

    try {
      const newChord = { id: createID, chord };

      if (lesson.chords) {
        lesson.chords = [...lesson.chords, newChord];
      } else {
        lesson.chords = [newChord];
      }

      chordToUpdate = newChord.id;
      await updateLesson();
    } catch (error) {
      console.error(error);
    }
  }

  async function deleteChord(chordPosition) {
    try {
      const newChords = [
        ...lesson.chords.slice(0, chordPosition),
        ...lesson.chords.slice(chordPosition + 1)
      ];
      lesson.chords = [...newChords];

      await updateLesson();
    } catch (error) {
      console.error(error);
    }
  }

  async function addNote() {
    try {
      lesson.notes = notes;
      editNotes = false;

      await updateLesson();
    } catch (error) {
      console.error(error);
    }
  }

  onMount(() => {
    try {
      const stringifiedLessons = localStorage.getItem(LESSONS);
      lessons = JSON.parse(stringifiedLessons);

      lesson = lessons.find(lesson => lesson.id == id);
      notes = lesson.notes;
    } catch (error) {
      console.error(error);
    }
  });

  afterUpdate(async () => {
    if (chordToUpdate) {
      scales_chords_api_refresh(chordToUpdate);
      chordToUpdate = "";
    }
  });

  $: console.log(lesson);
</script>

<style lang="scss">
  section {
    display: flex;
    flex-flow: column;
    height: 100%;
    justify-content: space-between;
    grid-row-gap: 10px;
  }

  h1 {
    text-align: center;
  }

  h2 {
    font-size: 1.1rem;
  }

  .naked-button {
    background: 0;
  }

  .chord-holder {
    position: relative;

    .naked-button {
      position: absolute;
      top: -18px;
      right: 17px;
      color: black;
      cursor: pointer;
      opacity: 0;
      transition: all 300ms ease-in-out;
    }

    &:hover .naked-button {
      opacity: 1;
    }
  }

  .notes {
    border-radius: 4px;
    outline: 2px solid #ff6f91;
    padding: 8px;
    transition: all 300ms ease-in-out;

    &:hover {
      cursor: pointer;
    }
  }

  .cancel {
    background: 0;
    color: black;
  }
</style>

<section>
  {#if lesson}
    <h1>{lesson.title}</h1>
    {#if lesson.video}
      <iframe
        title={lesson.video.kind}
        class="video"
        src={`https://www.youtube.com/embed/${lesson.video.videoId}`} />
    {/if}

    {#if lesson.tab}
      <span>
        Go to Songsterr for a tab of
        <a
          target="_blank"
          class="fancy-link"
          href={`http://www.songsterr.com/a/wa/song?id=${lesson.tab.id}`}>
          {lesson.title}
        </a>
      </span>
      <!-- Seems like direct embedding does not work -->
      <!-- <iframe
        title={lesson.tab.title}
        class="tab"
        src={`http://www.songsterr.com/a/wa/song?id=${lesson.tab.id}`} /> -->
    {/if}

    <h2>Chords</h2>
    {#if lesson.chords && lesson.chords.length > 0}
      {#each lesson.chords as { id, chord }, i}
        <div class="chord-holder">
          <button class="naked-button" on:click={() => deleteChord(i)}>
            <i class="fa fa-times" />
          </button>
          <ins customid={id} class="scales_chords_api" {chord} />
        </div>
      {/each}
    {:else}Select your first chord for the Song{/if}

    <select
      bind:value={selectedChord}
      id="chords"
      on:change={e => addChord(e.target.value)}>
      <option value="">Add a chord</option>
      {#each chords as chord}
        <option value={chord}>{chord}</option>
      {/each}
    </select>
  {:else}
    <div>Sorry, could not load lesson</div>
  {/if}

  <label for="notes">Notes about the Song</label>
  {#if lesson && lesson.notes && !editNotes}
    <div class="notes" on:click={() => (editNotes = true)}>{lesson.notes}</div>
  {:else}
    <form on:submit|preventDefault={addNote}>
      <textarea
        bind:value={notes}
        id="notes"
        defaultalue
        rows={5}
        placeholder="Your notes for the song" />
      <button disabled={!notes}>Add notes</button>
      <button class="cancel" type="button" on:click={() => (editNotes = false)}>
        Cancel
      </button>
    </form>
  {/if}
</section>
