<script>
  import { onMount, afterUpdate } from "svelte";
  import { navigate } from "svelte-routing";
  import Stopwatch from "./Stopwatch.svelte";
  import { createID, LESSONS, ARROW_SRC } from "./helpers.js";

  export let id;
  let lesson;
  let lessons;
  let selectedChord = "";
  let notes = "";
  let editNotes = false;
  let chordToUpdate = "";
  const basicChords = ["A", "B", "C", "D", "E", "F", "G"];
  let chords = [];
  basicChords.forEach(chord => {
    chords.push(`${chord}b`);
    chords.push(chord);
    chords.push(`${chord}#`);
  });

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
    e.stopPropagation();
  }

  async function removeStrum(e) {
    const position = e.dataTransfer.getData("position");

    if (position && lesson.strumming) {
      lesson.strumming = [
        ...lesson.strumming.slice(0, position),
        ...lesson.strumming.slice(parseInt(position) + 1)
      ];
    }

    await updateLesson();
  }

  async function finish() {
    lesson.finished = true;

    await updateLesson();
    navigate("/practice");
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

  .iframe-wrapper {
    height: 200px;
    width: 100%;
    resize: both;
    overflow: auto;

    iframe {
      width: 100%;
      height: 100%;
    }
  }

  .songsterr {
    margin: 20px 0;
  }
  .naked-button {
    background: 0;
  }

  .re-open {
    background-color: orange;
  }

  .chord-holder {
    position: relative;
    display: inline-block;

    .naked-button {
      position: absolute;
      top: -18px;
      right: -10px;
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

  form {
    display: grid;
    grid-template-areas:
      "text text text"
      "button1 button2 .";

    textarea {
      grid-area: text;
    }

    button {
      grid-area: button2;

      &:first-of-type {
        grid-area: button1;
      }
    }
  }

  button {
    background: green;

    &:hover {
      color: #ff6f91;
    }
  }

  @media screen and (min-width: 760px) {
    .iframe-wrapper {
      height: 300px;
    }

    .chord-wrapper {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }
  }
</style>

<section on:dragover|preventDefault on:drop|preventDefault={removeStrum}>
  {#if lesson}
    <h1>{lesson.title}</h1>
    {#if lesson.video}
      <div class="iframe-wrapper">
        <iframe
          allowfullscreen
          title={lesson.video.kind}
          class="video"
          src={`https://www.youtube.com/embed/${lesson.video.videoId}`} />
      </div>
    {/if}

    {#if lesson.tab}
      <span class="songsterr">
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

    <Stopwatch />

    <h2>Chords</h2>
    {#if lesson.chords && lesson.chords.length > 0}
      <div class="chord-wrapper">
        {#each lesson.chords as { id, chord }, i}
          <div class="chord-holder">
            <button class="naked-button" on:click={() => deleteChord(i)}>
              <i class="fa fa-times" />
            </button>
            <ins customid={id} class="scales_chords_api" {chord} />
          </div>
        {/each}
      </div>
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
          {#each lesson.strumming as strum, i}
            <li>
              <img
                alt="Arrow"
                on:dragstart={e => e.dataTransfer.setData('position', i)}
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
        alt="Arrow down"
        class="arrow-down"
        on:dragstart={e => e.dataTransfer.setData('direction', 'down')}
        src={ARROW_SRC} />
      <img
        class="arrow-up"
        alt="Arrow down"
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
    <button on:click={finish} class={lesson.finished ? 're-open' : ''}>
      {#if lesson.finished}Open Lesson{:else}Finish Lesson{/if}
    </button>
  {:else}
    <div>Sorry, could not load lesson</div>
  {/if}

</section>
