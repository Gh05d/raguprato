<script>
  let minutes = 10;
  let seconds = 0;
  let running = false;
  let time;

  function run() {
    if (minutes > 0 || (minutes == 0 && seconds > 0)) {
      setInterval(() => {
        minutes--;
        seconds--;
      }, 1000);
    }
  }

  function stop() {
    clearInterval(time);
  }
</script>

<style lang="scss">
  $width: 60px;
  $height: $width * 2;

  form {
    position: relative;
    display: inline-flex;
    border: 1px solid black;
    border-radius: 50%;
    overflow: hidden;
    background: #ff6f91;

    .controls {
      position: absolute;
      top: 15px;
      left: 45px;

      button {
        padding: 0;

        &:hover {
          background-color: unset;
        }
      }
    }

    input {
      background: #ff6f91;
      font-size: 1.5rem;
      text-align: center;
      width: $width;
      height: $height;
      border: 0;
      margin: 0;
      padding: 0;
    }

    span {
      margin: auto;
      font-size: 1.5rem;
    }
  }
</style>

<section>
  <h1>Click to Start</h1>
  <form on:submit={() => console.log('fire')}>
    <div class="controls">
      <button type="button" on:click={run}>
        <i class="fa fa-play-circle" />
      </button>
      <button type="button" on:click={stop}>
        <i class="fa fa-stop-circle" />
      </button>
    </div>
    {#if running}
      <div class="minutes">{minutes > 9 ? minutes : `0${minutes}`}</div>
      <div class="seconds">{seconds > 9 ? seconds : `0${seconds}`}</div>
    {:else}
      <input type="number" bind:value={minutes} class="minutes" />
      <span>:</span>
      <input type="number" bind:value={seconds} class="seconds" />
    {/if}
  </form>
</section>
