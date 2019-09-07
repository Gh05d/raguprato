<script>
  import NavItems from "./NavItems.svelte";
  let show = false;
</script>

<style lang="scss">
  nav {
    position: fixed;
    height: 100vh;
    width: 100vw;
    visibility: hidden;
    background: black;
    opacity: 0.8;
    transform: translateX(400px);
    transition: all 300ms ease-in-out;
    z-index: 2;
  }

  .show {
    visibility: visible;
    transform: translateX(0);
  }

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

<button on:click={() => (show = !show)} class="nav-button">
  <div class={show ? 'close' : ''}>
    <div class="nav-button-line" />
    {#if !show}
      <div class="nav-button-line" />
    {/if}
    <div class="nav-button-line" />
  </div>
</button>

<nav class={show ? 'show' : ''}>
  <NavItems
    close={() => {
      show = false;
    }} />
</nav>
