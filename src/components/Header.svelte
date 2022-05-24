<script>
  import { push } from "svelte-spa-router";
  import Navigation from "./Navigation.svelte";
  import NavItems from "./NavItems.svelte";

  let windowSize;
  let showNav = false;
</script>

<header>
  <div class="slogan">
    <i class="fa fa-guitar" />
    <button class="naked-button" on:click={() => push(ROOT)}>raguprato</button>
    {#if windowSize > 830}
      <span>Rad Guitar Practice Tool</span>
    {/if}
  </div>
  {#if windowSize > 750}
    <NavItems header={true} />
  {:else}
    <Navigation show={showNav} toggle={() => (showNav = !showNav)} />
  {/if}
</header>

<nav class:show={showNav}>
  <NavItems close={() => (showNav = false)} />
</nav>

<svelte:window bind:innerWidth={windowSize} />

<style type="text/scss">
  header {
    padding: 0 10px;
    grid-area: header;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 2px rgba($color: #000000, $alpha: 0.2);
    background-image: var(--gradient);
    background-size: 400%;
    animation: color-change 20s infinite alternate;

    .slogan {
      display: flex;
      align-items: center;

      i {
        font-size: 1.3rem;
      }

      .naked-button {
        all: unset;
        text-transform: uppercase;
        color: black;
        font-weight: 900;
        font-style: italic;
        cursor: pointer;
        box-sizing: border-box;

        &:focus {
          border-bottom: 2px solid var(--tertiary-color);
        }
      }

      span {
        margin-left: 10px;
        font-size: 0.7rem;
        font-style: italic;
      }
    }

    @keyframes color-change {
      from {
        background-position: left;
      }
      to {
        background-position: right;
      }
    }
  }

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

    &.show {
      visibility: visible;
      transform: translateX(0);
    }
  }

  @media screen and (min-width: 480px) {
    header {
      justify-content: space-between;
    }
  }
</style>
