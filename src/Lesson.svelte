<script>
  import { onMount, afterUpdate } from "svelte";
  import { createID, LESSONS, ARROW_SRC } from "./helpers.js";

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

  async function handleDrop(e) {
    e.preventDefault();
    const direction = e.dataTransfer.getData("direction");

    if (lesson.strumming) {
      lesson.strumming = [...lesson.strumming, direction];
    } else {
      lesson.strumming = [direction];
    }

    await updateLesson();
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

  // Needed so that the chord chart gets rerendered
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

  .strumming {
    position: relative;
    height: 80px;
    background: white;
    display: flex;
    flex-flow: column;
    justify-content: space-between;

    ul {
      position: absolute;
      height: 100%;
      width: 100%;
      display: flex;
    }
  }

  .arrow-up {
    transform: rotate(180deg);
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

    <h2>Strumming Pattern</h2>
    <div
      on:dragover|preventDefault
      on:drop|preventDefault={handleDrop}
      class="strumming">
      {#each [...Array(6)] as i}
        <hr />
      {/each}

      {#if lesson && lesson.strumming}
        <ul>
          {#each lesson.strumming as strum}
            <li>
              <img
                width={60}
                height={80}
                class={`arrow-${strum}`}
                src={ARROW_SRC} />
            </li>
          {/each}
        </ul>
      {/if}
    </div>
    <div>Drag and Drop the Arrows to create a Strumming Pattern</div>
    <div>
      <img
        draggable={true}
        class="arrow-down"
        on:dragstart={e => e.dataTransfer.setData('direction', 'down')}
        src={ARROW_SRC} />
      <img
        class="arrow-up"
        on:dragstart={e => e.dataTransfer.setData('direction', 'up')}
        src={ARROW_SRC} />
    </div>

    <label for="notes">Notes about the Song</label>
    {#if lesson && lesson.notes && !editNotes}
      <div class="notes" on:click={() => (editNotes = true)}>
        {lesson.notes}
      </div>
    {:else}
      <form on:submit|preventDefault={addNote}>
        <textarea
          bind:value={notes}
          id="notes"
          defaultalue
          rows={5}
          placeholder="Your notes for the song" />
        <button disabled={!notes}>Add notes</button>
        <button
          class="cancel"
          type="button"
          on:click={() => (editNotes = false)}>
          Cancel
        </button>
      </form>
    {/if}
  {:else}
    <div>Sorry, could not load lesson</div>
  {/if}

</section>
