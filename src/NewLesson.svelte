<script>
  import VideoSnippet from "./VideoSnippet.svelte";
  import { debounce, apiCall, createID, LESSONS } from "./helpers.js";

  export let navigate;

  let values = {
    artist: "",
    title: null,
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

  let videoSearch;
  let tabSearch;
  let videos;
  let tabs;
  let videoError;
  let tabError;

  const inputs = [
    {
      label: "Song",
      get value() {
        return values.title;
      },
      set value(val) {
        values.title = val;
      },
    },
    {
      label: "Artist",
      get value() {
        return values.artist;
      },
      set value(val) {
        values.artist = val;
      },
    },
    {
      label: "Search Youtube",
      get value() {
        return videoSearch;
      },
      set value(val) {
        videoSearch = val;
      },
      func: debounce(searchYoutube, 300),
      get error() {
        return videoError;
      },
      set error(err) {
        videoError = err;
      },
    },
    {
      label: "Enter Guitartab url",
      get value() {
        return values.tab;
      },
      set value(val) {
        values.tab = val;
      },
      // func: debounce(searchSongsterr, 300),
      // error: tabError,
    },
  ];

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

        tabs = null;
        videos = res.items;
        videoError = null;
      } catch (error) {
        videoError = "Oops, couldn't get data from youtube. Sorry :-(";
      }
    }
  }

  // async function searchSongsterr() {
  //   if (tabSearch && tabSearch.length > 3) {
  //     values.tab = null;
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
    try {
      values.id = `${values.title}-${createID}`;
      let lessons;
      const stringifiedLessons = await localStorage.getItem(LESSONS);

      if (stringifiedLessons) {
        lessons = JSON.parse(stringifiedLessons);
        lessons.push(values);
      } else {
        lessons = [values];
      }

      await localStorage.setItem(LESSONS, JSON.stringify(lessons));

      navigate("lesson", values.id);
    } catch (err) {
      console.error(err);
    }
  };
</script>

<section id="container">
  <h1>Create a new Lesson</h1>

  <form on:submit|preventDefault={handleSubmit}>
    {#each inputs as { value, label, func, error }}
      <div class="input-container">
        <input on:input={func} bind:value />
        <label class={value ? "flying-label" : ""}>{label}</label>
        {#if error}
          <div class="error">{error}</div>
        {/if}
      </div>
    {/each}

    <ul class={`search-result ${videos ? "search-result-show" : ""}`}>
      {#if videos}
        {#each videos as video}
          <li
            title={`Click to ${
              values.videos.length > 0 &&
              values.videos.find(videoID => videoID == video.id.videoId)
                ? "un"
                : ""
            }select`}
            class="empty-button"
            class:selected={values.videos.length > 0 &&
              values.videos.find(videoID => videoID == video.id.videoId)}
            role="button"
            on:click={() => {
              if (values.videos.length > 0) {
                const alreadyIn = values.videos.find(
                  vid => vid == video.id.videoId
                );
                if (alreadyIn) {
                  values.videos = values.videos.filter(vid => vid != alreadyIn);
                } else {
                  values.videos = [...values.videos, video.id.videoId];
                }
              } else {
                values.videos = [video.id.videoId];
              }
            }}
          >
            <VideoSnippet snippet={video.snippet} />
          </li>
        {/each}
      {/if}
    </ul>

    <!-- <ul class="search-result" class:search-result-show={tabs}>
      {#if tabs}
        {#each tabs as tab}
          <button
            class="empty-button"
            class:selected={values.tab == tab}
            title={`Click to ${values.tab == tab ? "un" : ""}select`}
            type="button"
            on:click={() => {
              if (values.tab == tab) {
                values.tab = null;
              } else {
                values.tab = tab;
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

    <button disabled={!values.title || values.title == ""} type="submit">
      Save Lesson
    </button>
  </form>
</section>

<style lang="scss">
  $inputColor: #ff6f91;

  #container {
    height: 100%;
  }

  form {
    height: 100%;
    display: flex;
    flex-flow: column;
    justify-content: space-around;
  }

  .input-container {
    position: relative;

    input {
      &:focus + label {
        bottom: 45px;
        font-size: 0.6rem;
        color: $inputColor;
      }
    }

    .flying-label {
      bottom: 45px;
      font-size: 0.6rem;
      color: $inputColor;
    }

    label {
      position: absolute;
      bottom: 27px;
      color: #888;
      left: 14px;
      transition: all 300ms ease-in-out;
      pointer-events: none;
    }

    .error {
      color: red;
      font-size: 0.8rem;
      position: absolute;
      bottom: 1px;
      left: 2px;
    }
  }

  .search-result {
    height: 0;
    overflow: auto;
    margin-bottom: 10px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    grid-gap: 15px;
    transition: all 300ms ease-in-out;

    &-show {
      height: 300px;
    }
  }

  .selected {
    position: relative;

    &::after {
      content: "\f058";
      font-size: 1.5rem;
      font-family: "FontAwesome";
      color: #845ec2;
      position: absolute;
      top: -1px;
      left: 225px;
      background: rgba(0, 0, 0, 0.3);
    }
  }
</style>
