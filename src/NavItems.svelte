<script>
  import { Link, navigate } from "svelte-routing";

  const links = [
    { name: "Home", link: "/", icon: "home" },
    { name: "Practice", link: "/practice", icon: "guitar" },
    { name: "Create new Practice", link: "/practice/new", icon: "plus" }
  ];

  export let close;
</script>

<style>
  ul {
    display: flex;
    flex-flow: column;
    justify-content: space-around;
    align-items: center;
    height: 100%;
  }

  button {
    background: 0;
  }

  .modal-nav:hover {
    color: #ffc75f;
  }
</style>

<ul>
  {#each links as { name, link, icon }}
    <li>
      <button
        class={`fancy-link ${close ? 'modal-nav' : ''}`}
        on:click={() => {
          navigate(link);
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
