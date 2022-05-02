<script>
  const socialIcons = [
    { link: "https://github.com/Gh05d", symbol: "github" },
    { link: "https://www.freecodecamp.org/gh05d", symbol: "free-code-camp" },
    {
      link: "https://www.linkedin.com/in/pascal-clanget-545956ba/",
      symbol: "linkedin",
    },
    {
      link: "https://stackoverflow.com/users/7490871/gh05d",
      symbol: "stack-overflow",
    },
    { link: "https://www.instagram.com/gh05d/?hl=de", symbol: "instagram" },
  ];
</script>

<footer>
  <div>
    <span>
      Created by
      <a class="fancy-link" href="https://github.com/Gh05d">Gh05d</a>
    </span>
    <a href="https://icons8.com/icon/45289/down-arrow"> Down Arrow icon by Icons8 </a>
  </div>
  <ul>
    {#each socialIcons as { link, symbol }}
      <li>
        <a aria-label={symbol} target="_blank" href={link} key={symbol}>
          <i class={`fab fa-${symbol}`} />
        </a>
      </li>
    {/each}
  </ul>
</footer>

<style type="scss">
  footer {
    grid-area: footer;
    color: black;
    padding: 10px;
    background-color: var(--main-color);
    display: flex;
    flex-flow: column;

    div {
      display: flex;
      flex-flow: column;

      & > a {
        font-size: 0.6rem;
      }
    }

    ul {
      display: flex;
      gap: 1rem;

      li {
        a {
          font-size: 1.5rem;
        }
      }
    }

    a:hover {
      color: black;
      transition: all 300ms ease-in-out;
    }
  }

  @media screen and (min-width: 400px) {
    .wrapper {
      color: red;
    }
    footer {
      flex-flow: row;
      align-items: center;
      justify-content: space-between;
    }
  }
</style>
