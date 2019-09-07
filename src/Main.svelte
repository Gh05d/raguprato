<script>
  import NavItems from "./NavItems.svelte";
</script>

<style>
  section {
    height: 100%;
    display: flex;
    flex-flow: column;
  }

  p {
    text-align: center;
  }
</style>

<section>
  <p>
    Welcome dear Friend. Click on Practice to train the songs in your library.
    Or create a new practice lessons. Or if you feel like it, indulge in your
    victories a.k.a. the songs you have mastered. Have fun.
  </p>
  <NavItems />
</section>
