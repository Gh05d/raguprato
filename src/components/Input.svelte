<script>
  import { createID } from "../common/helpers";

  export let value;
  export let label;
  export let error = null;
  export let onInput = null;

  let inputID = `${label}-${createID()}`;
</script>

<div class="input-container">
  <input id={inputID} on:input={onInput} bind:value />
  <label for={inputID} class:flying-label={value}>{label}</label>

  {#if error}
    <div class="error">{error}</div>
  {/if}
</div>

<style type="text/scss">
  .input-container {
    --input-color: #ff6f91;
    position: relative;

    input {
      width: 300px;

      &:focus + label {
        bottom: 45px;
        font-size: 0.6rem;
        color: var(--input-color);
      }
    }

    .flying-label {
      bottom: 45px;
      font-size: 0.6rem;
      color: var(--input-color);
    }

    label {
      position: absolute;
      bottom: 27px;
      color: #888;
      left: 14px;
      transition: all 300ms ease-in-out;
      pointer-events: none;
    }

    .error {
      color: red;
      font-size: 0.8rem;
      position: absolute;
      bottom: 1px;
      left: 2px;
    }
  }
</style>
