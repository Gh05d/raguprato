<script>
  export let text = "Loading...";
</script>

<div class="loading">
  <span>{text}</span> <i class="fa fa-spinner fa-spin" />
</div>

<style lang="scss">
  .loading {
    animation: fadeIn 300ms ease-in-out;
  }
</style>
