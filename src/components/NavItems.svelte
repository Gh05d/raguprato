<script>
  export let header = false;
  export let close = null;

  const links = [
    { name: "Practice", path: "/", icon: "guitar" },
    { name: "Create new Practice", path: "#/new-lesson", icon: "plus" },
  ];
</script>

<ul class={header ? "header" : ""}>
  {#each links as { name, path, icon }}
    <li>
      <a
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
    }
  }

  button {
    background: 0;
    position: relative;
  }

  .modal-nav:hover {
    color: #ffc75f;
  }
</style>
