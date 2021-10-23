<script>
  export let snippet;
</script>

<section>
  {#if snippet}
    <div class="image-wrapper">
      <img
        alt={snippet.title}
        src={snippet.thumbnails.medium.url}
        width={snippet.thumbnails.medium.width}
        height={snippet.thumbnails.medium.height}
      />
    </div>
    <h1>{snippet.title}</h1>
    <p>{snippet.description}</p>
  {/if}
</section>

<style lang="scss">
  section {
    display: flex;
    flex-flow: column;
    min-width: 150px;

    &:hover {
      cursor: pointer;
    }

    .image-wrapper {
      img {
        object-fit: cover;
        width: 100%;
        height: 100%;
      }
    }

    h1 {
      font-size: 1rem;
    }

    p {
      font-size: 0.8rem;
    }
  }
</style>
