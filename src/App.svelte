<script>
  import Navigation from "./Navigation.svelte";
  import { Router, Route } from "svelte-routing";
  import Main from "./Main.svelte";
  import Lessons from "./Lessons.svelte";
  import NewLesson from "./NewLesson.svelte";

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
  let showNav = true;
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
    background: #f5f5f5;
    grid-template-rows: 50px 1fr 40px;
    grid-template-areas:
      "header"
      "main"
      "footer";

    header {
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

      a {
        margin-left: 3px;

        &:hover {
          color: black;
          transition: all 300ms ease-in-out;
        }
      }
    }
  }
</style>

<div class="wrapper">
  <header>
    <h1>raguprato</h1>
    <h2>
      <i class="fa fa-guitar" />
      Rad Guitar Practice Tool
    </h2>
  </header>

  <Router {url}>
    <Navigation show={showNav} />
    <main>
      <Route path="/">
        <Main />
      </Route>

      <Route path="practice">
        <Lessons />
      </Route>

      <Route path="practice/new">
        <NewLesson />
      </Route>
    </main>
  </Router>

  <footer>
    <span>
      Created by
      <a class="fancy-link" href="http://gh05d.de">Gh05d</a>
    </span>
    <ul>
      {#each socialIcons as { link, symbol }}
        <a target="_blank" href={link} key={symbol}>
          <i class={`fab fa-${symbol}`} />
        </a>
      {/each}
    </ul>
  </footer>
</div>
