<script>
  export let header = false;
  export let close = null;

  const links = [
    { name: "Home", path: "/", icon: "home" },
    { name: "Lessons", path: "#/lessons", icon: "guitar" },
    { name: "Create new Lesson", path: "#/new-lesson", icon: "plus" },
    { name: "Links", path: "#/links", icon: "link" },
  ];
</script>

<ul class={header ? "header" : ""}>
  {#each links as { name, path, icon }}
    <li>
      <a
        aria-label={name}
        href={path}
        class={`${header ? "" : "fancy-link"} ${close ? "modal-nav" : ""}`}
        on:click={() => close?.()}>
        <i class={`fa fa-${icon}`} />
        {name}
      </a>
    </li>
  {/each}
</ul>

<style lang="scss">
  ul {
    display: flex;
    flex-flow: column;
    justify-content: space-around;
    align-items: center;
    height: 100%;
  }

  .header {
    flex-flow: row;
    justify-content: start;
    gap: 0.8rem;

    a {
      color: black;
      margin-bottom: 0;
      box-sizing: border-box;

      &:focus {
        border-bottom: 1px solid var(--tertiary-color);
      }
    }
  }

  .modal-nav:hover {
    color: #ffc75f;
  }
</style>
