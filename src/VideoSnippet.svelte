<script>
  export let snippet;
</script>

<style lang="scss">
  section {
    display: flex;
    flex-flow: column;
    width: 250px;

    &:hover {
      cursor: pointer;
    }

    img {
      object-fit: cover;
    }

    h1 {
      font-size: 1rem;
    }

    p {
      font-size: 0.8rem;
    }
  }
</style>

<section>
  {#if snippet}
    <img
      alt={snippet.title}
      src={snippet.thumbnails.default.url}
      width={250}
      height={snippet.thumbnails.default.height} />
    <h1>{snippet.title}</h1>
    <p>{snippet.description}</p>
  {/if}
</section>
