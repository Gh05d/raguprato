<script>
  import { onMount } from "svelte";
  import Stopwatch from "./Stopwatch.svelte";
  import { updateLesson } from "./helpers.js";

  export let lesson;
  let capo;
  let tuning;
  let title;
  let artist;
  let edit;

  async function updateTime(seconds) {
    if (!lesson.totalTime) {
      lesson.totalTime = 0;
    }

    lesson.totalTime += seconds;
    await updateLesson(lesson);
  }

  async function update({ target: { name } }) {
    lesson[name] =
      name == "title"
        ? title
        : name == "artist"
        ? artist
        : name == "capo"
        ? capo
        : tuning;

    await updateLesson(lesson);
    edit = null;
  }

  onMount(() => {
    capo = lesson.capo;
    tuning = lesson.tuning;
    title = lesson.title;
    artist = lesson.artist;
  });
</script>

<header>
  <h1>
    {#if edit == 1}
      <form name="title" on:submit|preventDefault={update}>
        <input bind:value={title} />
      </form>
    {:else}
      <button class="naked-button" on:click={() => (edit = 1)}
        >{lesson.title}</button
      >
    {/if}
    <span>-</span>
    {#if edit == 2}
      <form name="artist" on:submit|preventDefault={update}>
        <input bind:value={artist} />
      </form>
    {:else}
      <button class="naked-button" on:click={() => (edit = 2)}
        >{lesson.artist}</button
      >
    {/if}
  </h1>

  <Stopwatch {updateTime} />

  <form name="capo" class="header-form" on:submit|preventDefault={update}>
    {#if edit == 3}
      <label for="capo">Capo:</label>
      <input
        id="capo"
        type="number"
        bind:value={capo}
        placeholder="X"
        min="0"
        max="12"
      />
    {:else}
      <button class="naked-button" on:click={() => (edit = 3)}
        ><label for="capo">Capo:</label>{lesson.capo || "X"}</button
      >
    {/if}
  </form>

  <form name="tuning" class="header-form" on:submit|preventDefault={update}>
    {#if edit == 4}
      <label for="tuning">Tuning:</label>
      <input
        id="tuning"
        class="text-input"
        bind:value={tuning}
        placeholder="Standard"
      />
    {:else}
      <button class="naked-button" on:click={() => (edit = 4)}>
        <label for="tuning">Tuning:</label>Standard</button
      >
    {/if}
  </form>
</header>

<style lang="scss">
  header {
    display: flex;
  }

  h1 {
    display: flex;
    align-items: center;

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
    }

    button {
      margin: 0;
      display: flex;
      gap: 0.5rem;
      background: 0;
    }

    input {
      width: 24px;
      margin: 0;
      padding-top: 3px;
    }

    .text-input {
      width: 100px;
    }
  }

  @media screen and (min-width: 760px) {
    header {
      margin: 20px 0 20px;
      align-items: center;
      justify-content: space-between;
    }
  }
</style>
