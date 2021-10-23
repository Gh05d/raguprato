<script>
  export let errorMessage = "Sorry, something went wrong 😔";
  export let error = null;

  $: error ? console.error(error) : null;
</script>

<div class:show={error}>{errorMessage}</div>

<style lang="scss">
  @import "../_mixins.scss";

  div {
    @include hide;
    color: red;
    transition: 600ms ease-in-out;
  }

  .show {
    height: initial;
    opacity: 1;
    pointer-events: initial;
    margin: initial;
    padding: initial;
  }
</style>
