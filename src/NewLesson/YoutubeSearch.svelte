<script>
  import VideoSnippet from "../components/VideoSnippet.svelte";
  import Input from "../components/Input.svelte";
  import Error from "../components/Error.svelte";
  import { debounce, apiCall } from "../helpers";

  export let videos;
  export let videoSearch;
  export let startSearch = false;
  let searchResult = [];
  let videoError;

  async function searchYoutube() {
    if (videoSearch?.length > 2) {
      try {
        const res = await apiCall("https://www.googleapis.com/youtube/v3/search", {
          q: videoSearch,
          type: "video",
          key: YOUTUBE_API,
          part: "snippet",
          maxResults: 7,
          topicId: "/m/04rlf",
        });

        searchResult = res.items;
        videoError = null;
        startSearch = false;
      } catch (error) {
        videoError = error;
      }
    }
  }

  function handleClick(video) {
    if (videos.length > 0) {
      const alreadyIn = findID(video.id.videoId);

      if (alreadyIn) {
        videos = videos.filter(vid => vid != alreadyIn);
      } else {
        videos = [...videos, video.id.videoId];
      }
    } else {
      videos = [video.id.videoId];
    }
  }

  $: findID = id => videos?.find(videoID => id == videoID);
  $: startSearch ? searchYoutube() : null;
</script>

<Input
  bind:value={videoSearch}
  label="Search Youtube"
  onInput={debounce(searchYoutube)} />

<Error error={videoError} />

<ul class="search-result" class:show={searchResult}>
  {#each searchResult as video}
    <li
      title={`Click to ${findID(video.id.videoId) ? "un" : ""}select`}
      class="empty-button"
      class:selected={findID(video.id.videoId)}
      role="button"
      on:click={() => handleClick(video)}>
      <VideoSnippet snippet={video.snippet} />
    </li>
  {/each}
</ul>

<style lang="scss">
  @import "../_mixins.scss";

  .search-result {
    @include hide;
    overflow-y: scroll;
    display: flex;
    gap: 16px;
    transition: all 300ms ease-in-out;
  }

  .show {
    height: initial;
    min-height: 0;
    opacity: 1;
    pointer-events: initial;
  }

  .empty-button {
    transition: 600ms ease-in-out;
  }

  .selected {
    transform: translateY(-8px);
    box-shadow: 7px 7px 4px 2px var(--main-color);
  }
</style>
