<script>
  import { onDestroy } from "svelte";

  export let updateTime = null;
  let total = 0;
  let minutes = 0;
  let seconds = 0;
  let hours = 0;
  let running = false;
  let time;
  let updated = false;
  const audio = new Audio("Herbert-03.wav");

  $: normalizedHours = hours > 9 ? hours : `0${hours}`;
  $: normalizedMinutes = minutes > 9 ? minutes : `0${minutes}`;
  $: normalizedSeconds = seconds > 9 ? seconds : `0${seconds}`;
  $: title = `${normalizedHours}:${normalizedMinutes}:${normalizedSeconds}`;

  function run() {
    if (running) {
      return;
    }
    running = true;
    updated = false;

    timer();
  }

  function timer() {
    time = setInterval(() => {
      total++;

      if (seconds == 59) {
        seconds = 0;

        if (minutes == 9) {
          audio.play();
          minutes++;
        } else if (minutes == 59) {
          minutes = 0;

          if (hours == 23) {
            hours = 0;
          }
          hours++;
        } else {
          minutes++;
        }
      } else {
        seconds++;
      }
    }, 1000);
  }

  function pause() {
    clearInterval(time);
    time = null;

    if (updateTime && !updated) {
      updateTime(total);
      total = 0;
      updated = true;
    }

    running = false;
  }

  function reset() {
    pause();
    hours = 0;
    minutes = 0;
    seconds = 0;
  }

  onDestroy(() => {
    clearInterval(time);

    if (updateTime && !updated) {
      updateTime(total);
    }
    // Setting the title via the variable does not work
    document.title = "Raguprato";
  });

  const buttons = [
    { title: "Play", click: run, icon: "play" },
    { title: "Pause", click: pause, icon: "pause" },
    { title: "Reset", click: reset, icon: "stop" },
  ];
</script>

<svelte:head>
  <title>{title}</title>
</svelte:head>

<section>
  <form on:submit|preventDefault={run}>
    <div class="controls">
      {#each buttons as { title, click, icon }}
        <button type="button" {title} on:click={click}>
          <i class={`fa fa-${icon}-circle`} />
        </button>
      {/each}
    </div>
    <div class="time">{normalizedHours}</div>
    <span>:</span>
    <div class="time">{normalizedMinutes}</div>
    <span>:</span>
    <div class="time">{normalizedSeconds}</div>
  </form>
</section>

<style lang="scss">
  $width: 60px;

  form {
    position: relative;
    display: inline-flex;
    box-shadow: 5px 5px 2px rgba(0, 0, 0, 0.6);
    background: #ff6f91;

    .controls {
      position: absolute;
      left: 207px;
      background: #f5f5f5;

      button {
        padding: 0;
        background-color: unset;
      }
    }

    .time {
      background: #ff6f91;
      width: $width;
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

  @media screen and (min-width: 760px) {
    form {
      .controls {
        top: -27px;
        left: 70px;
      }
    }
  }
</style>
