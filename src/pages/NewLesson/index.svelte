<script>
  import axios from "axios";
  import { push } from "svelte-spa-router";
  import { spotifyToken } from "../../common/stores";
  import SpotifySearch from "./SpotifySearch.svelte";
  import YoutubeSearch from "./YoutubeSearch.svelte";
  import Input from "../../components/Input.svelte";
  import Loading from "../../components/Loading.svelte";
  import { getArtists, createID, transaction } from "../../common/helpers.js";

  let videoSearch;
  let startSearch = false;
  let loading = false;

  let songData = {
    title: null,
    artist: null,
    videos: [],
    tab: null,
    coordinates: [
      {
        0: {},
        1: {},
        2: {},
        3: {},
        4: {},
        5: {},
      },
    ],
  };

  // let tabSearch;
  // let tabs;
  // let tabError;

  // async function searchSongsterr() {
  //   if (tabSearch && tabSearch.length > 3) {
  //     songData.tab = null;
  //     videos = null;

  //     try {
  //       const res = await apiCall("http://www.songsterr.com/a/ra/songs.json", {
  //         pattern: tabSearch,
  //       });
  //       console.log("FIRE: searchSongsterr -> res", res);

  //       tabs = res > 7 ? res.slice(0, 7) : res;
  //       tabError = null;
  //     } catch (error) {
  //       tabError = "Oops, couldn't get data from songsterr. Sorry :-(";
  //     }
  //   }
  // }

  const handleSubmit = async () => {
    if ($spotifyToken) {
      try {
        loading = true;
        const { data } = await axios("https://api.spotify.com/v1/audio-features", {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Authorization: Bearer ${$spotifyToken}`,
          },
          params: { ids: songData.spotifyID },
        });

        if (data?.audio_features[0]) {
          songData = { ...songData, audioFeatures: data?.audio_features[0] };
        }
      } catch (err) {
        console.error(err);
      } finally {
        loading = false;
      }
    }

    try {
      songData.id = `${songData.title}-${createID()}`;
      await transaction("put", songData, "readwrite");

      push(`#/lesson/${encodeURIComponent(songData.id)}`);
    } catch (err) {
      console.error(err);
    }
  };

  function handleSpotifySearchClick(data) {
    songData = { ...songData, ...data, title: data.name, spotifyID: data.id };
    songData.artist = getArtists(data.artists);

    videoSearch = `${songData.name} guitar tutorial`;
    startSearch = true;
  }
</script>

<section id="container">
  <h1>Create a new Lesson</h1>

  <form on:submit|preventDefault={handleSubmit}>
    <SpotifySearch
      bind:songName={songData.title}
      on:song={e => handleSpotifySearchClick(e.detail)} />
    <Input bind:value={songData.artist} label="Artist" />
    <YoutubeSearch bind:videoSearch bind:startSearch bind:videos={songData.videos} />
    <Input
      bind:value={songData.tab}
      label="Enter Url of chord site like https://azchords.com/" />

    <!-- <ul class="search-result" class:search-result-show={tabs}>
      {#if tabs}
        {#each tabs as tab}
          <button
            class="empty-button"
            class:selected={songData.tab == tab}
            title={`Click to ${songData.tab == tab ? "un" : ""}select`}
            type="button"
            on:click={() => {
              if (songData.tab == tab) {
                songData.tab = null;
              } else {
                songData.tab = tab;
              }
            }}
          >
            <section class="tab-preview">
              <div>{tab.artist.name}</div>
              <div>{tab.title}</div>
            </section>
          </button>
        {/each}
      {/if}
    </ul> -->

    <button disabled={!songData.title || loading} type="submit">
      {#if loading}
        <Loading text="" />
      {:else}
        <span>Save Lesson</span>
      {/if}
    </button>
  </form>
</section>

<style lang="scss">
  #container {
    height: 100%;
  }

  form {
    min-height: 100%;
    display: flex;
    flex-flow: column;
    justify-content: space-between;
  }
</style>
