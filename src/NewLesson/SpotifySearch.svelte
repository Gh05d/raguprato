<script>
  import { spotifyToken } from "../common/stores";
  import { onMount } from "svelte";
  import axios from "axios";
  import SpotifyResponse from "./SpotifyResponse.svelte";
  import Input from "../components/Input.svelte";
  import Loading from "../components/Loading.svelte";
  import Error from "../components/Error.svelte";
  import { authenticateSpotify, debounce } from "../common/helpers.js";

  export let songName = "";
  let loading = false;
  let error = null;
  let spotifyResponse = null;

  async function searchSpotify() {
    if ($spotifyToken && songName.length > 1) {
      error = null;
      loading = true;

      try {
        const { data } = await axios("https://api.spotify.com/v1/search", {
          headers: {
            Authorization: `Authorization: Bearer ${$spotifyToken}`,
          },
          params: { q: songName, type: "track", limit: 5 },
        });

        spotifyResponse = data?.tracks?.items;
      } catch (err) {
        error = err;
      } finally {
        loading = false;
      }
    }
  }

  onMount(() => {
    (async function init() {
      if (!$spotifyToken) {
        const credentials = await authenticateSpotify();
        spotifyToken.set(credentials?.data?.access_token);
      }
    })();
  });
</script>

<Input bind:value={songName} label="Song" onInput={debounce(searchSpotify)} />

<div>
  {#if loading}
    <Loading text="Searching Spotify..." />
  {/if}

  <Error {error} />

  {#if spotifyResponse}
    <div class="search-results">
      <SpotifyResponse data={spotifyResponse} on:song />
    </div>
  {/if}
</div>

<style lang="scss">
  .search-results {
    display: flex;
    gap: 8px;
    overflow-x: scroll;
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
