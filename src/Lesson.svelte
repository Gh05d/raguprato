<script>
  import { onMount } from "svelte";
  import { apiCall, LESSONS, ARROW_SRC, updateLesson } from "./helpers.js";
  //import ChordGrid from "./ChordGrid.svelte";
  import VideoSnippet from "./VideoSnippet.svelte";
  import LessonHeader from "./LessonHeader.svelte";
  import Visualizer from "./Visualizer.svelte";

  export let id;
  let videoSearch;
  let addVideos;
  let lesson;
  let showVideo = 0;
  let selectedChord = "";
  let notes = "";
  let tab = "";

  async function addChord() {
    if (!selectedChord) {
      return;
    }

    try {
      if (lesson.chords) {
        lesson.chords = [...lesson.chords, selectedChord];
      } else {
        lesson.chords = [selectedChord];
      }

      selectedChord = "";

      await updateLesson(lesson);
      renderChords();
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

      await updateLesson(lesson);
      renderChords();
    } catch (error) {
      console.error(error);
    }
  }

  async function addNotes(notes) {
    try {
      lesson.notes = notes;

      await updateLesson(lesson);
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

    await updateLesson(lesson);
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

    await updateLesson(lesson);
  }

  async function finish() {
    if ("finished" in lesson) {
      lesson.finished = !lesson.finished;
    } else {
      lesson.finished = true;
    }

    await updateLesson(lesson);
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
      } catch (error) {
        console.log(error.message);
      }
    }
  }

  async function updateTab() {
    lesson.tab = tab;
    await updateLesson(lesson);
  }

  async function addVideo(videoID) {
    lesson.videos = [...lesson.videos, videoID];
    addVideos = null;
    await updateLesson(lesson);
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
      [...new Array(6).keys()].reduce((acc, cV) => {
        acc[cV] = {};
        return acc;
      }, {}),
    ];

    await updateLesson(lesson);
  }

  async function deleteTab(position) {
    lesson.coordinates = [
      ...lesson.coordinates.slice(0, position),
      ...lesson.coordinates.slice(position + 1),
    ];
    await updateLesson(lesson);
  }

  function renderChords() {
    if (lesson.chords?.length > 0) {
      lesson.chords.forEach((chord, i) => {
        jtab.render(document.getElementById(`chord-${i}`), chord);
      });
    }
  }

  onMount(() => {
    try {
      const stringifiedLessons = localStorage.getItem(LESSONS);
      const lessons = JSON.parse(stringifiedLessons);

      lesson = lessons.find(lesson => lesson.id == id);
      notes = lesson.notes;

      setTimeout(renderChords, 500);
    } catch (error) {
      console.error(error);
    }
  });
</script>

<section on:dragover|preventDefault on:drop|preventDefault={removeStrum}>
  {#if lesson}
    <LessonHeader {lesson} />

    <div class="media-wrapper">
      <form on:submit|preventDefault={() => {}}>
        <input
          placeholder="Search for another Video"
          on:input={searchYoutube}
          bind:value={videoSearch}
        />
      </form>

      <form on:submit|preventDefault={updateTab}>
        <input placeholder="Update Guitar Tab" bind:value={tab} />
      </form>

      {#if lesson.videos?.length > 0}
        <div class="iframe-wrapper">
          <button on:click={() => changeVideo(-1)} class="naked-button">
            <i class="fa fa-caret-left" />
          </button>
          <iframe
            title={`Lesson video of ${tab.title}`}
            allowfullscreen
            class="video"
            src={`https://www.youtube.com/embed/${lesson.videos[showVideo]}`}
          />
          <button on:click={() => changeVideo(1)} class="naked-button">
            <i class="fa fa-caret-right" />
          </button>
        </div>
      {/if}

      {#if lesson.tab}
        <iframe
          allow="fullscreen"
          referrerpolicy="no-referrer"
          loading="lazy"
          height="100%"
          width="100%"
          title="Hopefully some lyrics"
          src={lesson.tab || "https://www.guitaretab.com"}
        />
      {/if}
    </div>

    {#if addVideos}
      <ul class="video-container">
        {#each addVideos as video}
          <li role="button" on:click={() => addVideo(video.id.videoId)}>
            <VideoSnippet snippet={video.snippet} />
          </li>
        {/each}
      </ul>
    {/if}

    <h2>Chords</h2>

    <form on:submit|preventDefault={addChord}>
      <input bind:value={selectedChord} placeholder="Am" />
    </form>

    {#if lesson.chords?.length > 0}
      <div class="chord-wrapper">
        {#each lesson.chords as chord, i}
          <div class="chord-holder">
            <button class="naked-button" on:click={() => deleteChord(i)}>
              <i class="fa fa-times" />
            </button>
            <div id={`chord-${i}`}>{chord}</div>
          </div>
        {/each}
      </div>
    {/if}

    <!-- <h2 style="margin-top: 20px;">Tab</h2>
    {#each lesson.coordinates as coordinates, i}
      <ChordGrid {coordinates} {lesson} {deleteTab} position={i} />
    {/each}
    <button on:click={addTab}>add another tab</button> -->

    <h2>Strumming Pattern</h2>
    <div
      class="strumming"
      on:dragover|preventDefault
      on:drop|preventDefault={handleDrop}
    >
      {#each [...Array(6)] as i}
        <hr />
      {/each}

      {#if lesson?.strumming}
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
  {:else}
    <div>Sorry, could not load lesson</div>
  {/if}
</section>

<Visualizer />

<style lang="scss">
  section {
    position: relative;
    display: flex;
    flex-flow: column;
    height: 100%;
    justify-content: space-between;
    grid-row-gap: 10px;
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
      background: none;
      &:hover {
        color: #ff6f91;
        box-shadow: none;
      }
    }

    iframe {
      width: 100%;
      height: 100%;
    }
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
      top: 0;
      right: 0;
      color: black;
      cursor: pointer;
      opacity: 0;
      transition: all 300ms ease-in-out;
    }

    &:hover .naked-button {
      opacity: 1;
      z-index: 1;
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
    flex-shrink: 0;
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

  .iframes-container {
    display: flex;
    flex-flow: column;
  }
  @media screen and (min-width: 760px) {
    .media-wrapper {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: auto 1fr;
    }

    .iframes-container {
      flex-flow: row;
    }
    .iframe-wrapper {
      height: 500px;
    }

    .chord-wrapper {
      display: flex;
    }
  }
</style>
