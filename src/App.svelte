<script>
  import { db } from "./common/stores";
  import { onMount } from "svelte";
  import Router, { replace } from "svelte-spa-router";
  import { wrap } from "svelte-spa-router/wrap";
  import Home from "./pages/Home/index.svelte";
  import NotFound from "./pages/404/index.svelte";
  import Error from "./pages/Error/index.svelte";
  import Header from "./components/Header.svelte";
  import Footer from "./components/Footer.svelte";
  import Loading from "./components/Loading.svelte";
  import { DB_NAME, DB_VERSION } from "./common/helpers";

  const routes = {
    "/": Home,
    "/links": wrap({ asyncComponent: () => import("./pages/Links/index.svelte") }),
    "/lessons": wrap({
      asyncComponent: () => import("./pages/Lessons/index.svelte"),
      conditions: [
        async () => {
          try {
            if (!$db.initialized) {
              await loadFromIndexedDB();
            }

            return true;
          } catch (error) {
            console.error(error.message);
            return false;
          }
        },
      ],
      loadingComponent: Loading,
      loadingParams: { text: "Loading lessons..." },
    }),
    "/lesson/:id": wrap({ asyncComponent: () => import("./pages/Lesson/index.svelte") }),
    "/new-lesson": wrap({
      asyncComponent: () => import("./pages/NewLesson/index.svelte"),
    }),
    "/error": Error,
    "*": NotFound,
  };

  async function initDB(event) {
    await db.update(d => {
      d = event.target.result;
      d.onerror = e => console.error("IndexedDB Error: ", e?.target);
      d.initialized = true;

      return d;
    });
  }

  function loadFromIndexedDB() {
    return new Promise((resolve, reject) => {
      const dbRequest = window.indexedDB.open(DB_NAME, DB_VERSION);

      dbRequest.onerror = event =>
        reject(Error(event?.target?.error || "Something bad happened"));

      dbRequest.onupgradeneeded = event => {
        const newDB = event.target.result;
        const objectStore = newDB.createObjectStore("lessons", { keyPath: "id" });
        objectStore.createIndex("title", "title", { unique: false });
        objectStore.createIndex("artist", "artist", { unique: false });

        console.info(`Initiated / Upgraded database ${DB_NAME} to version ${DB_VERSION}`);
      };

      dbRequest.onsuccess = async event => {
        await initDB(event);
        resolve();
      };
    });
  }

  function conditionsFailed(event) {
    console.error("conditionsFailed event", event.detail);

    // Perform any action, for example replacing the current route
    replace("/error");
  }

  onMount(() => {
    (async function init() {
      try {
        await loadFromIndexedDB();
      } catch (error) {
        console.error(error.message);
      }
    })();
  });
</script>

<div class="wrapper">
  <Header />

  <main>
    <Router {routes} on:conditionsFailed={conditionsFailed} />
  </main>

  <Footer />
</div>

<style type="text/scss">
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
