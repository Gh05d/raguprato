<script>
  let values = {
    song: "",
    youtube: ""
  };

  let youtubeData;

  function handleSubmit(e) {
    let lessons = localStorage.getItem("lessons");

    if (lessons) {
      lessons.push(values);
    } else {
      lessons = [values];
    }
  }

  async function searchYoutube() {
    if (values.song.length > 2) {
    }
  }
</script>

<style lang="scss">
  $inputColor: #ff6f91;

  h1 {
    text-align: center;
    margin-bottom: 20px;
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
    }
  }
</style>

<section>
  <h1>Create a new Lesson</h1>

  <form on:submit|preventDefault={handleSubmit}>
    <div class="input-container">
      <input on:input={searchYoutube} bind:value={values.song} id="song" />
      <label class={values.song ? 'flying-label' : ''}>Song</label>
    </div>

    <div class="input-container">
      <input bind:value={values.youtube} id="youtube" />
      <label class={values.youtube ? 'flying-label' : ''}>Search Youtube</label>
    </div>

    <div class={`youtube-search ${youtubeData ? 'show' : ''}`} />

    <button disabled={!values.name} type="submit">Save Lesson</button>
  </form>
</section>
