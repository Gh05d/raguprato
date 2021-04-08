<script>
  import { onMount } from "svelte";
  import Stopwatch from "./Stopwatch.svelte";
  import { updateLesson } from "./helpers.js";

  export let lesson;
  let capo;
  let tuning;
  let editCapo = false;
  let editTuning = false;

  async function updateTime(seconds) {
    if (!lesson.totalTime) {
      lesson.totalTime = 0;
    }

    lesson.totalTime += seconds;
    await updateLesson(lesson);
  }

  async function setCapo() {
    editCapo = false;
    lesson.capo = capo;
    await updateLesson(lesson);
  }

  async function setTuning() {
    editTuning = false;
    lesson.tuning = tuning;
    await updateLesson(lesson);
  }

  onMount(() => {
    capo = lesson.capo;
    tuning = lesson.tuning;
  });
</script>

<header>
  <h1>{`${lesson.title} - ${lesson.artist}`}</h1>
  <Stopwatch {updateTime} />
  <form class="header-form" on:submit|preventDefault={setCapo}>
    {#if editCapo || (lesson.capo != 0 && !lesson.capo)}
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
      <button class="naked-button" on:click={() => (editCapo = true)}
        ><label for="capo">Capo:</label>{lesson.capo || "X"}</button
      >
    {/if}
  </form>

  <form class="header-form" on:submit|preventDefault={setTuning}>
    {#if editTuning}
      <label for="tuning">Tuning:</label>
      <input
        id="tuning"
        class="text-input"
        bind:value={tuning}
        placeholder="Standard"
      />
    {:else}
      <button class="naked-button" on:click={() => (editTuning = true)}>
        <label for="tuning">Tuning:</label>Standard</button
      >
    {/if}
  </form>
</header>

<style lang="scss">
  header {
    display: flex;
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
