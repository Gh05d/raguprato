<script>
  import Router, { push } from "svelte-spa-router";
  import Navigation from "./components/Navigation.svelte";
  import Lessons from "./Lessons/index.svelte";
  import NewLesson from "./NewLesson/index.svelte";
  import Lesson from "./Lesson/index.svelte";
  import NavItems from "./components/NavItems.svelte";
  import Footer from "./components/Footer.svelte";

  let showNav = false;
  let windowSize;

  const routes = {
    "/": Lessons,
    "/lesson/:id": Lesson,
    "/new-lesson": NewLesson,
  };
</script>

<svelte:window bind:innerWidth={windowSize} />

<div class="wrapper">
  <header>
    <div class="slogan">
      <i class="fa fa-guitar" />
      <h1 role="button" on:click={() => push("/")}>raguprato</h1>
      {#if windowSize > 830}
        <h2>Rad Guitar Practice Tool</h2>
      {/if}
    </div>
    {#if windowSize > 750}
      <NavItems header={true} />
    {:else}
      <Navigation show={showNav} toggle={() => (showNav = !showNav)} />
    {/if}
  </header>

  <main>
    <Router {routes} />
  </main>

  <Footer />

  <nav class={showNav ? "show" : ""}>
    <NavItems close={() => (showNav = false)} />
  </nav>
</div>

<style type="text/scss">
  :root {
    --main-color: #ffc75f;
    --gradient: linear-gradient(
      45deg,
      #845ec2,
      #d65db1,
      #ff6f91,
      #ff9671,
      var(--main-color),
      #f9f871
    );
  }
  body,
  html {
    overflow: hidden;
  }

  .wrapper {
    height: 100%;
    display: grid;
    box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
    grid-template-rows: 50px 1fr 40px;
    grid-template-areas:
      "header"
      "main"
      "footer";

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
        h1 {
          text-transform: uppercase;
          color: black;
          font-weight: 900;
          font-style: italic;
          cursor: pointer;
        }

        h2 {
          margin-left: 10px;
          font-size: 0.7rem;
          font-style: italic;
        }
      }

      @keyframes color-change {
        0% {
          background-position: left;
        }
        100% {
          background-position: right;
        }
      }
    }

    main {
      grid-area: main;
      padding: 20px;
      background: #f2f7fb;
      position: relative;
      overflow: auto;
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
  }

  .show {
    visibility: visible;
    transform: translateX(0);
  }

  @media screen and (min-width: 480px) {
    .wrapper {
      header {
        justify-content: space-between;
      }
    }
  }
</style>
