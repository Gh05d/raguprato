<script>
  import Router from "svelte-spa-router";
  import Lessons from "./pages/Lessons/index.svelte";
  import NewLesson from "./pages/NewLesson/index.svelte";
  import Lesson from "./pages/Lesson/index.svelte";
  import Home from "./pages/Home/index.svelte";
  import Links from "./pages/Links/index.svelte";
  import Header from "./components/Header.svelte";
  import Footer from "./components/Footer.svelte";

  const routes = {
    "/": Home,
    "/links": Links,
    "/lessons": Lessons,
    "/lesson/:id": Lesson,
    "/new-lesson": NewLesson,
  };
</script>

<div class="wrapper">
  <Header />

  <main>
    <Router {routes} />
  </main>

  <Footer />
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

  .wrapper {
    --header-height: 50px;
    --main-height: 1fr;
    --footer-height: 70px;
    height: 100%;
    display: grid;
    box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
    grid-template-rows: var(--header-height) var(--main-height) var(--footer-height);
    grid-template-areas:
      "header"
      "main"
      "footer";

    main {
      grid-area: main;
      padding: 20px;
      background: #f2f7fb;
      position: relative;
      overflow: auto;
    }
  }

  @media screen and (min-width: 480px) {
    .wrapper {
      --footer-height: 40px;
    }
  }
</style>
