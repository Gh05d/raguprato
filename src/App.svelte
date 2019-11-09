<script>
  import Navigation from "./Navigation.svelte";
  import { Router, Route, navigate } from "svelte-routing";
  import Main from "./Main.svelte";
  import Lessons from "./Lessons.svelte";
  import NewLesson from "./NewLesson.svelte";
  import Lesson from "./Lesson.svelte";
  import NavItems from "./NavItems.svelte";

  const socialIcons = [
    { link: "https://github.com/Gh05d", symbol: "github" },
    { link: "https://www.freecodecamp.org/gh05d", symbol: "free-code-camp" },
    {
      link: "https://www.linkedin.com/in/pascal-clanget-545956ba/",
      symbol: "linkedin"
    },
    { link: "https://www.instagram.com/gh05d/?hl=de", symbol: "instagram" }
  ];

  let url = "";
  let showNav = false;
</script>

<style lang="scss">
  :root {
    --gradient: linear-gradient(
      45deg,
      #845ec2,
      #d65db1,
      #ff6f91,
      #ff9671,
      #ffc75f,
      #f9f871
    );
  }

  .wrapper {
    display: grid;
    height: 100vh;
    grid-template-rows: 50px 1fr 40px;
    grid-template-areas:
      "header"
      "main"
      "footer";

    header {
      position: relative;
      grid-area: header;
      display: flex;
      flex-flow: column;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 2px rgba($color: #000000, $alpha: 0.2);
      background-image: var(--gradient);
      background-size: 400%;
      animation: color-change 20s infinite alternate;

      h1 {
        text-transform: uppercase;
        color: black;
        font-weight: 900;
        font-style: italic;
        cursor: pointer;
      }

      h2 {
        font-size: 0.7rem;
        font-style: italic;
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
    }

    footer {
      grid-area: footer;
      color: black;
      padding: 0 20px;
      background-color: #ffc75f;
      display: flex;
      align-items: center;
      justify-content: space-between;

      div {
        display: flex;
        flex-flow: column;

        & > a {
          font-size: 0.6rem;
        }
      }
      a {
        margin-left: 3px;

        &:hover {
          color: black;
          transition: all 300ms ease-in-out;
        }
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
  }

  .show {
    visibility: visible;
    transform: translateX(0);
  }

  @media screen and (min-width: 1200px) {
    .wrapper {
      max-width: 1100px;
      margin: 0 auto;
    }
  }
</style>

<div class="wrapper">
  <header>
    <h1 role="button" on:click={() => navigate('/')}>raguprato</h1>
    <h2>
      <i class="fa fa-guitar" />
      Rad Guitar Practice Tool
    </h2>
    <Navigation show={showNav} toggle={() => (showNav = !showNav)} />
  </header>

  <Router {url}>
    <main>
      <Route path="/" component={Main} />
      <Route path="practice" component={Lessons} />
      <Route path="practice/new" component={NewLesson} />
      <Route path="practice/:id" let:params>
        <Lesson id={params.id} />
      </Route>
    </main>
  </Router>

  <footer>
    <div>
      <span>
        Created by
        <a class="fancy-link" href="http://gh05d.de">Gh05d</a>
      </span>
      <a href="https://icons8.com/icon/45289/down-arrow">
        Down Arrow icon by Icons8
      </a>
    </div>
    <ul>
      {#each socialIcons as { link, symbol }}
        <a target="_blank" href={link} key={symbol}>
          <i class={`fab fa-${symbol}`} />
        </a>
      {/each}
    </ul>
  </footer>

  <nav class={showNav ? 'show' : ''}>
    <NavItems close={() => (showNav = false)} />
  </nav>
</div>
