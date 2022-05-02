<script>
  import { onMount } from "svelte";
  import Stopwatch from "./Stopwatch.svelte";
  import { authenticateSpotify, updateLesson } from "../common/helpers.js";
  import { spotifyToken } from "../common/stores";
  import axios from "axios";

  export let lesson;
  let capo;
  let tuning;
  let title;
  let artist;
  let key;
  let bpm;
  let edit;
  let loading;

  const keys = [
    "C",
    "C#/Db",
    "D",
    "D#/Eb",
    "E",
    "F",
    "F#/Gb",
    "G",
    "G#/Ab",
    "A",
    "A#/Bb",
    "B",
    "C",
  ];

  async function updateTime(seconds) {
    if (!lesson.totalTime) {
      lesson.totalTime = 0;
    }

    lesson.totalTime += seconds;
    await updateLesson(lesson);
  }

  async function update({ target: { name } }) {
    if (name == "key") {
      if (!lesson.audioFeatures) {
        lesson.audioFeatures = {};
      }

      const validKey = keys.findIndex(keyValue => keyValue == key.toUpperCase());

      lesson.audioFeatures.key = validKey !== -1 ? validKey : null;
    } else if (name == "bpm") {
      if (!lesson.audioFeatures) {
        lesson.audioFeatures = {};
      }

      lesson.audioFeatures.tempo = bpm;
    } else {
      lesson[name] =
        name == "title"
          ? title
          : name == "artist"
          ? artist
          : name == "capo"
          ? capo
          : tuning;
    }

    await updateLesson(lesson);
    edit = null;
  }

  function translateKey(key) {
    if (key === undefined || key === null) {
      return "Not set";
    }

    return keys[key];
  }

  async function sync() {
    try {
      loading = true;
      if (!$spotifyToken) {
        const credentials = await authenticateSpotify();
        await spotifyToken.set(credentials?.data?.access_token);
      }

      const res = await axios("https://api.spotify.com/v1/search", {
        headers: {
          Authorization: `Authorization: Bearer ${$spotifyToken}`,
        },
        params: { q: encodeURI(title), type: "track", limit: 1 },
      });

      const [spotifyResponse] = res?.data?.tracks?.items;

      const { data } = await axios("https://api.spotify.com/v1/audio-features", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Authorization: Bearer ${$spotifyToken}`,
        },
        params: { ids: spotifyResponse.id },
      });

      if (data?.audio_features[0]) {
        key = data?.audio_features[0]?.key;
        bpm = data?.audio_features[0]?.tempo;

        if (!lesson.audioFeatures) {
          lesson.audioFeatures = {};
        }

        lesson.audioFeatures.key = key;
        lesson.audioFeatures.tempo = bpm;
        await updateLesson(lesson);
      }
    } catch (error) {
      console.error(error);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    capo = lesson.capo;
    tuning = lesson.tuning;
    title = lesson.title;
    artist = lesson.artist;
    key = lesson.audioFeatures?.key;
    bpm = lesson.audioFeatures?.tempo;
  });
</script>

<header>
  <h1>
    {#if edit == 1}
      <form name="title" on:submit|preventDefault={update}>
        <input bind:value={title} />
      </form>
    {:else}
      <button class="naked-button" on:click={() => (edit = 1)}>{lesson.title}</button>
    {/if}
    <span>-</span>
    {#if edit == 2}
      <form name="artist" on:submit|preventDefault={update}>
        <input bind:value={artist} />
      </form>
    {:else}
      <button class="naked-button" on:click={() => (edit = 2)}>{lesson.artist}</button>
    {/if}
  </h1>

  <Stopwatch {updateTime} />

  <form name="capo" class="header-form" on:submit|preventDefault={update}>
    {#if edit == 3}
      <label for="capo">Capo:</label>
      <input id="capo" type="number" bind:value={capo} placeholder="X" min="0" max="12" />
    {:else}
      <button class="naked-button" on:click={() => (edit = 3)}
        ><label for="capo">Capo:</label>{lesson.capo || "No"}</button>
    {/if}
  </form>

  <form name="tuning" class="header-form" on:submit|preventDefault={update}>
    {#if edit == 4}
      <label for="tuning">Tuning:</label>
      <input id="tuning" class="text-input" bind:value={tuning} placeholder="Standard" />
    {:else}
      <button class="naked-button" on:click={() => (edit = 4)}>
        <label for="tuning">Tuning:</label>{lesson.tuning || "Standard"}</button>
    {/if}
  </form>

  <form name="key" class="header-form" on:submit|preventDefault={update}>
    {#if edit == 5}
      <label for="key">Key:</label>
      <input id="key" class="text-input" bind:value={key} placeholder="Key" />
    {:else}
      <button class="naked-button" on:click={() => (edit = 5)}>
        <label for="tuning">Key:</label>{translateKey(lesson.audioFeatures?.key)}</button>
    {/if}
  </form>

  <form name="bpm" class="header-form" on:submit|preventDefault={update}>
    {#if edit == 6}
      <label for="bpm">Bpm:</label>
      <input
        id="bpm"
        type="number"
        class="text-input"
        bind:value={bpm}
        placeholder="Enter tempo" />
    {:else}
      <button class="naked-button" on:click={() => (edit = 6)}>
        <label for="tuning">Bpm:</label>{lesson.audioFeatures?.tempo?.toFixed(0) ||
          "Not set"}</button>
    {/if}
  </form>

  <button class="sync-button" title="Sync Spotify" disabled={loading} on:click={sync}>
    <i class="fab fa-spotify" />
  </button>
</header>

<style lang="scss">
  header {
    display: flex;
    flex-flow: column;
  }

  h1 {
    display: flex;
    align-items: center;
    font-size: 1rem;

    .naked-button {
      background: unset;
      font-weight: 600;
      margin: 0;
    }
  }

  .header-form {
    display: flex;
    align-items: center;

    label {
      font-weight: 600;
      font-size: 1rem;
    }

    button {
      margin: 0;
      display: flex;
      gap: 0.5rem;
      background: 0;
    }

    input {
      width: 45px;
      margin: 0;
      padding-top: 3px;
    }

    .text-input {
      width: 100px;
    }
  }

  .sync-button {
    background-color: unset;
  }
  @media screen and (min-width: 760px) {
    header {
      flex-flow: row;
      margin: 20px 0 20px;
      align-items: center;
      justify-content: space-between;
    }

    h1 {
      font-size: 1.2rem;
    }

    label {
      font-size: 1rem;
    }
  }
</style>
