<script>
  import { onMount, afterUpdate } from "svelte";
  import { createID, apiCall, LESSONS, ARROW_SRC } from "./helpers.js";
  import { YOUTUBE_API } from "../apiKeys.js";
  import ChordGrid from "./ChordGrid.svelte";
  import VideoSnippet from "./VideoSnippet.svelte";
  import Stopwatch from "./Stopwatch.svelte";
  import Visualizer from "./Visualizer.svelte";

  export let id;
  let videoSearch;
  let addVideos;
  let videoError;
  let lesson;
  let lessons;
  let showVideo = 0;
  let selectedChord = "";
  let chordToUpdate = "";
  let notes = "";

  async function updateLesson() {
    try {
      const newLessons = lessons.filter(item => item.id != lesson.id);
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
      selectedChord = "";
      await updateLesson();
    } catch (error) {
      console.error(error);
    }
  }

  async function deleteChord(chordPosition) {
    try {
      const newChords = [
        ...lesson.chords.slice(0, chordPosition),
        ...lesson.chords.slice(chordPosition + 1),
      ];
      lesson.chords = [...newChords];

      await updateLesson();
    } catch (error) {
      console.error(error);
    }
  }

  async function addNotes(notes) {
    try {
      lesson.notes = notes;

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
        ...lesson.strumming.slice(parseInt(position) + 1),
      ];
    }

    await updateLesson();
  }

  async function finish() {
    if ("finished" in lesson) {
      lesson.finished = !lesson.finished;
    } else {
      lesson.finished = true;
    }

    await updateLesson();
    navigate("/");
  }

  async function searchYoutube() {
    if (videoSearch && videoSearch.length > 3) {
      try {
        const res = await apiCall(
          "https://www.googleapis.com/youtube/v3/search",
          {
            q: videoSearch,
            type: "video",
            key: YOUTUBE_API,
            part: "snippet",
            maxResults: 7,
            topicId: "/m/04rlf",
          }
        );

        addVideos = res.items;
        videoError = null;
      } catch (error) {
        videoError = "Oops, couldn't get data from youtube. Sorry :-(";
      }
    }
  }

  async function addVideo(videoID) {
    lesson.videos = [...lesson.videos, videoID];
    addVideos = null;
    await updateLesson();
  }

  function changeVideo(count) {
    if (lesson.videos.length > 1) {
      if (showVideo + count < 0) {
        showVideo = lesson.videos.length - 1;
      } else if (showVideo + count > lesson.videos.length - 1) {
        showVideo = 0;
      } else {
        showVideo += count;
      }
    }
  }

  async function addTab() {
    lesson.coordinates = [
      ...lesson.coordinates,
      {
        0: {},
        1: {},
        2: {},
        3: {},
        4: {},
        5: {},
      },
    ];

    await updateLesson();
  }

  async function deleteTab(position) {
    lesson.coordinates = [
      ...lesson.coordinates.slice(0, position),
      ...lesson.coordinates.slice(position + 1),
    ];
    await updateLesson();
  }

  async function showPreview() {
    scales_chords_api_refresh("chord-preview");
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

<section on:dragover|preventDefault on:drop|preventDefault={removeStrum}>
  {#if lesson}
    <h1>{`${lesson.title} - ${lesson.artist}`}</h1>
    {#if lesson.videos.length > 0}
      <div class="iframe-wrapper">
        <button on:click={() => changeVideo(-1)} class="naked-button">
          <i class="fa fa-caret-left" />
        </button>
        <iframe
          allowfullscreen
          class="video"
          src={`https://www.youtube.com/embed/${lesson.videos[showVideo]}`}
        />
        <button on:click={() => changeVideo(1)} class="naked-button">
          <i class="fa fa-caret-right" />
        </button>
      </div>

      <!-- <label class={videoSearch ? 'flying-label' : ''}>
        Search another Video
      </label> -->
      {#if addVideos}
        <ul class="video-container">
          {#each addVideos as video}
            <li role="button" on:click={() => addVideo(video.id.videoId)}>
              <VideoSnippet snippet={video.snippet} />
            </li>
          {/each}
        </ul>
      {/if}
    {/if}

    <input
      placeholder="Search for another Video"
      on:input={searchYoutube}
      bind:value={videoSearch}
    />

    {#if lesson.tab}
      <span class="songsterr">
        Go to Songsterr for a tab of
        <a
          target="_blank"
          class="fancy-link"
          href={`http://www.songsterr.com/a/wa/song?id=${lesson.tab.id}`}
        >
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

    <label for="chord-preview-input">
      Search for a chord and click on it to add it
    </label>
    <input
      id="chord-preview-input"
      bind:value={selectedChord}
      placeholder="D#m(maj9)"
      on:change={showPreview}
    />

    {#if selectedChord}
      <button
        class="chord-preview-button"
        on:click={() => addChord(selectedChord)}
      >
        <ins
          customid="chord-preview"
          class="scales_chords_api"
          chord={selectedChord}
        />
      </button>
    {/if}

    <h2 style="margin-top: 20px;">Tab</h2>
    {#each lesson.coordinates as coordinates, i}
      <ChordGrid {coordinates} {updateLesson} {deleteTab} position={i} />
    {/each}
    <button on:click={addTab}>add another tab</button>

    <h2>Strumming Pattern</h2>
    <div
      class="strumming"
      on:dragover|preventDefault
      on:drop|preventDefault={handleDrop}
    >
      {#each [...Array(6)] as i}
        <hr />
      {/each}

      {#if lesson && lesson.strumming}
        <ul>
          {#each lesson.strumming as strum, i}
            <li>
              <img
                alt="Arrow"
                on:dragstart={e => e.dataTransfer.setData("position", i)}
                width={60}
                height={80}
                class={`arrow-${strum}`}
                src={ARROW_SRC}
              />
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
        on:dragstart={e => e.dataTransfer.setData("direction", "down")}
        src={ARROW_SRC}
      />
      <img
        class="arrow-up"
        alt="Arrow down"
        on:dragstart={e => e.dataTransfer.setData("direction", "up")}
        src={ARROW_SRC}
      />
    </div>

    <label for="notes">Notes about the Song</label>
    <textarea
      bind:value={notes}
      on:change={e => addNotes(e.target.value)}
      id="notes"
      rows={5}
      placeholder="Your notes for the song"
    />

    <button on:click={finish} class={lesson.finished ? "re-open" : ""}>
      {#if lesson.finished}Open Lesson{:else}Finish Lesson{/if}
    </button>

    <Visualizer />
  {:else}
    <div>Sorry, could not load lesson</div>
  {/if}
</section>

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
    display: flex;

    button {
      font-size: 2rem;
      color: black;

      &:hover {
        color: #ff6f91;
      }
    }

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

  .video-container {
    display: flex;
    max-width: 93vw;
    overflow: auto;

    li:not(:last-of-type) {
      margin-right: 50px;
    }
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

  #chord-preview-input {
    margin: 0;
  }

  .chord-preview-button {
    background: 0;
    text-align: left;

    &:hover {
      box-shadow: unset;
    }
  }

  @media screen and (min-width: 760px) {
    .iframe-wrapper {
      height: 500px;
    }

    .chord-wrapper {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }
  }
</style>
