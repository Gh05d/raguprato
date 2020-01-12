<script>
  import { onDestroy } from "svelte";

  let minutes = 10;
  let seconds = 0;
  let running = false;
  let time;
  let alarm;
  var audio = new Audio(
    "https://interactive-examples.mdn.mozilla.net/media/examples/t-rex-roar.mp3"
  );

  function run() {
    if (running) {
      return;
    }
    running = true;
    clearInterval(alarm);

    timer();
  }

  function timer() {
    if (minutes > 0 || (minutes == 0 && seconds > 0)) {
      time = setInterval(() => {
        if (minutes == 0 && seconds == 0) {
          return stop();
        }

        if (seconds > 0) {
          return seconds--;
        } else if (minutes != 0 && seconds == 0) {
          seconds = 59;
        }

        if (minutes > 0) {
          minutes--;
        }
      }, 1000);
    }
  }

  function stop() {
    clearInterval(time);
    clearInterval(alarm);

    if (minutes == 0 && seconds == 0) {
      alarm = setInterval(() => audio.play(), 1000);
    }

    running = false;
    minutes = 10;
    seconds = 0;
  }

  function pauseAlarm() {
    if (running) {
      clearInterval(time);
      running = false;
    } else {
      running = true;
      timer();
    }
  }

  function stopAlarm() {
    minutes = 10;
  }

  onDestroy(() => clearInterval(time));
</script>

<style lang="scss">
  $width: 60px;
  $height: $width * 2;

  form {
    position: relative;
    display: inline-flex;
    box-shadow: 5px 5px 2px rgba(0, 0, 0, 0.6);
    overflow: hidden;
    background: #ff6f91;

    .controls {
      position: absolute;
      top: 15px;
      left: 35px;

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

    .time {
      background: #ff6f91;
      width: $width;
      height: $height;
      font-size: 1.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    span {
      margin: auto;
      font-size: 1.5rem;
    }
  }
</style>

<section>
  <form on:submit|preventDefault={() => run()}>
    <div class="controls">
      <button on:click={alarm ? stopAlarm : run}>
        <i class="fa fa-play-circle" />
      </button>
      <button type="button" on:click={pauseAlarm}>
        <i class="fa fa-pause-circle" />
      </button>
      <button type="button" on:click={alarm ? stopAlarm : stop}>
        <i class="fa fa-stop-circle" />
      </button>
    </div>
    {#if running}
      <div class="time">{minutes > 9 ? minutes : `0${minutes}`}</div>
      <span>:</span>
      <div class="time">{seconds > 9 ? seconds : `0${seconds}`}</div>
    {:else}
      <input min={0} max={60} type="number" bind:value={minutes} />
      <span>:</span>
      <input min={0} max={60} type="number" bind:value={seconds} />
    {/if}
  </form>
</section>
