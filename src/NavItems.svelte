<script>
  export let header = false;
  export let close = null;
  export let navigate;

  const links = [
    { name: "Practice", path: "/", icon: "guitar" },
    { name: "Create new Practice", path: "new", icon: "plus" },
  ];
</script>

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

    button {
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

<ul class={header ? 'header' : ''}>
  {#each links as { name, path, icon }}
    <li>
      <button
        class={`${header ? '' : 'fancy-link'} ${close ? 'modal-nav' : ''}`}
        on:click={() => {
          navigate(path);
          if (close) {
            close();
          }
        }}>
        <i class={`fa fa-${icon}`} />
        {name}
      </button>
    </li>
  {/each}
</ul>
