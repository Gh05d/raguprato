<script>
  export let show;
  export let toggle;
</script>

<button aria-label="Navigation Button" on:click={toggle} class="nav-button">
  <div class:close={show}>
    <div class="nav-button-line" />
    {#if !show}
      <div class="nav-button-line" />
    {/if}
    <div class="nav-button-line" />
  </div>
</button>

<style lang="scss">
  .nav-button {
    position: absolute;
    background: transparent;
    border: 0;
    right: 10px;
    top: 5px;
    color: white;
    z-index: 3;
    padding: 10px;

    &:hover,
    &:focus {
      background: #ff6f91;
    }

    &-line {
      transition: all 0.5s ease-out;
      background: black;
      height: 3px;
      width: 20px;

      &:first-of-type {
        margin-bottom: 5px;
      }

      &:last-child {
        margin-top: 5px;
      }
    }
  }

  .close {
    transform: rotate(180deg);

    div {
      &:first-of-type {
        transform: rotate(45deg) translate(3px, 1px);
      }

      &:nth-of-type(2) {
        transform: rotate(-45deg) translate(5px, -3px);
      }
    }
  }
</style>
