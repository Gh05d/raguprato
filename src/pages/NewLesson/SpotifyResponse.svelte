<script>
  import { createEventDispatcher } from "svelte";
  import { getArtists } from "../../common/helpers";
  export let data;

  function transformSongLength(ms) {
    const seconds = ms / 1000;
    const minutes = seconds / 60;
    const remainingSeconds = seconds % 60;

    return `${minutes.toFixed(0)}:${
      remainingSeconds.toFixed(0) < 10 ? "0" : ""
    }${remainingSeconds.toFixed(0)}`;
  }

  const dispatch = createEventDispatcher();

  const returnData = song => dispatch("song", song);
</script>

{#each data as song}
  <section
    role="button"
    tabindex="0"
    class:show={song}
    on:keydown={() => returnData(song)}
    on:click={() => returnData(song)}>
    <h3>
      <span>{song?.name}</span> by
      <span>{getArtists(song.artists)}</span>
    </h3>

    <div class="info">
      <div class="length">
        {transformSongLength(song?.duration_ms)}
      </div>
      <a on:click|stopPropagation target="_blank" href={song?.external_urls?.spotify}>
        <i class="fab fa-spotify" />
      </a>
    </div>

    <img
      src={song.album?.images[1]?.url}
      height={song.album?.images[1]?.height}
      width={song.album?.images[1]?.height}
      alt={`Album cover of ${song.name}`} />

    <audio controls="controls">
      <source src={song.preview_url} type="audio/mpeg" />
    </audio>
  </section>
{/each}

<style lang="scss">
  section {
    height: 0;
    opacity: 0;
    pointer-events: none;
    transition: 500ms ease-in-out;

    &:focus,
    &:hover {
      transform: translate(5px, -5px);
    }
  }

  .show {
    height: unset;
    opacity: 1;
    pointer-events: auto;
    background: white;
    border-radius: 10px;
    box-shadow: 3px 3px 5px 0 var(--main-color);
    padding: 8px;
    cursor: pointer;
    display: flex;
    flex-flow: column;
    justify-content: space-around;

    @for $i from 1 through 5 {
      &:nth-of-type(#{$i}) {
        animation: fadeIn #{$i * 100 + 400}ms ease-in-out;
      }
    }

    h3 {
      font-size: 0.8rem;

      span:first-of-type {
        font-style: italic;
      }
    }

    .info {
      display: flex;
      gap: 8px;
    }

    a {
      color: #1db954;

      &:hover,
      &:focus {
        color: var(--main-color);
      }
    }
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
</style>
