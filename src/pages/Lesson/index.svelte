<script>
  import { onMount } from "svelte";
  import { location, push } from "svelte-spa-router";
  import * as svguitar from "svguitar";
  import {
    apiCall,
    ARROW_SRC,
    debounce,
    transaction,
    chords,
  } from "../../common/helpers.js";
  import VideoSnippet from "../../components/VideoSnippet.svelte";
  import LessonHeader from "./LessonHeader.svelte";
  //import ChordGrid from "./ChordGrid.svelte";
  // import Visualizer from "./Visualizer.svelte";

  const urlParts = $location.split("/");
  const id = decodeURIComponent(urlParts[urlParts.length - 1]);

  let videoSearch;
  let addVideos;
  let lesson;
  let showVideo = 0;
  let selectedChord = "";
  let notes = "";
  let tab = "";
  const chordNames = Object.keys(chords);

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

      await transaction("put", lesson, "readwrite");
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

      await transaction("put", lesson, "readwrite");
    } catch (error) {
      console.error(error);
    }
  }

  async function addNotes(notes) {
    try {
      lesson.notes = notes;

      await transaction("put", lesson, "readwrite");
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

    await transaction("put", lesson, "readwrite");
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

    await transaction("put", lesson, "readwrite");
  }

  async function finish() {
    if ("finished" in lesson) {
      lesson.finished = !lesson.finished;
    } else {
      lesson.finished = true;
    }

    await transaction("put", lesson, "readwrite");
    push("/");
  }

  async function searchYoutube() {
    if (videoSearch && videoSearch.length > 3) {
      try {
        const res = await apiCall("https://www.googleapis.com/youtube/v3/search", {
          q: videoSearch,
          type: "video",
          key: YOUTUBE_API,
          part: "snippet",
          maxResults: 7,
          topicId: "/m/04rlf",
        });

        addVideos = res.items;
      } catch (error) {
        console.log(error.message);
      }
    }
  }

  async function updateTab() {
    lesson.tab = tab;
    await transaction("put", lesson, "readwrite");
  }

  async function addVideo(videoID) {
    lesson.videos = [...lesson.videos, videoID];
    addVideos = null;
    await transaction("put", lesson, "readwrite");
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

  // async function addTab() {
  //   lesson.coordinates = [
  //     ...lesson.coordinates,
  //     [...new Array(6).keys()].reduce((acc, cV) => {
  //       acc[cV] = {};
  //       return acc;
  //     }, {}),
  //   ];

  //         await transaction("put", lesson, "readwrite");
  // }

  // async function deleteTab(position) {
  //   lesson.coordinates = [
  //     ...lesson.coordinates.slice(0, position),
  //     ...lesson.coordinates.slice(position + 1),
  //   ];
  //         await transaction("put", lesson, "readwrite");
  // }

  function renderChords() {
    if (lesson.chords?.length) {
      for (const [i, chordName] of lesson.chords.entries()) {
        if (chordName in chords) {
          const chart = new svguitar.SVGuitarChord(`#chord-${i}`);
          const { fingers, barre, position } = chords[chordName];

          chart
            .configure({
              tuning: ["E", "A", "D", "G", "B", "E"],
              frets: 4,
              position: position || 1,
            })
            .chord({
              fingers,
              barres: barre ? [barre] : [],
              title: chordName,
            })
            .draw();
        }
      }
    }
  }

  onMount(() => {
    try {
      (async function init() {
        lesson = await transaction("get", id);
        notes = lesson.notes;

        setTimeout(renderChords, 500);
      })();
    } catch (error) {
      console.error(error);
    }
  });

  const debouncedSearch = debounce(searchYoutube);
</script>

<section on:dragover|preventDefault on:drop|preventDefault={removeStrum}>
  {#if lesson}
    <LessonHeader {lesson} />

    {#if addVideos}
      <ul class="video-container">
        {#each addVideos as video}
          <li role="button" on:click={() => addVideo(video.id.videoId)}>
            <VideoSnippet snippet={video.snippet} />
          </li>
        {/each}
      </ul>
    {/if}

    <div class="media-wrapper">
      <form on:submit|preventDefault={debouncedSearch}>
        <input
          placeholder="Search for another Video"
          on:input={debouncedSearch}
          bind:value={videoSearch} />
      </form>

      <form on:submit|preventDefault={updateTab}>
        <input placeholder="Update Guitar Tab" bind:value={tab} />
      </form>

      {#if lesson.videos?.length}
        <div class="iframe-wrapper">
          <button on:click={() => changeVideo(-1)} class="naked-button">
            <i class="fa fa-caret-left" />
          </button>

          <iframe
            title={`Lesson video of ${lesson.title}`}
            allowfullscreen
            class="video"
            src={`https://www.youtube.com/embed/${lesson.videos[showVideo]}`} />

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
          src={lesson.tab || "https://www.guitaretab.com"} />
      {/if}
    </div>

    <h2>Chords</h2>

    <select bind:value={selectedChord} on:change={addChord}>
      <option value="">Add Chords</option>
      {#each chordNames as chordName}
        <option value={chordName}>{chordName}</option>
      {/each}
    </select>

    {#if lesson.chords?.length}
      <div class="chord-wrapper">
        {#each lesson.chords as _c, i}
          <div class="chord-holder">
            <button
              aria-label="Delete Chord"
              class="naked-button"
              on:click={() => deleteChord(i)}>
              <i class="fa fa-times" />
            </button>
            <div id={`chord-${i}`} />
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
    <div class="strumming" on:dragover|preventDefault on:drop|preventDefault={handleDrop}>
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
        on:dragstart={e => e.dataTransfer.setData("direction", "down")}
        src={ARROW_SRC} />
      <img
        class="arrow-up"
        alt="Arrow down"
        on:dragstart={e => e.dataTransfer.setData("direction", "up")}
        src={ARROW_SRC} />
    </div>

    <label for="notes">Notes about the Song</label>
    <textarea
      bind:value={notes}
      on:change={e => addNotes(e.target.value)}
      id="notes"
      rows={5}
      placeholder="Your notes for the song" />

    <button on:click={finish} class={lesson.finished ? "re-open" : ""}>
      {#if lesson.finished}Open Lesson{:else}Finish Lesson{/if}
    </button>
  {:else}
    <div>Sorry, could not load lesson</div>
  {/if}
</section>

<!-- <Visualizer /> -->
<style lang="scss">
  section {
    position: relative;
    display: flex;
    flex-flow: column;
    justify-content: space-between;
    gap: 1rem;
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
    overflow-x: auto;

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
    max-width: 19rem;

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

  select {
    max-width: 18rem;
    background-color: var(--secondary-color);
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
