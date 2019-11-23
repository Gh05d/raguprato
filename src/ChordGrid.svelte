<script>
  export let coordinates;
  export let updateLesson;
  export let deleteTab;
  export let position;

  let tabOptions = [...Array(...Array(17)).map((_, i) => i), "x", "p", "h"];
  let edit = false;
  let showSelection = { x: null, y: null };
</script>

<style lang="scss">
  .chord-grid {
    position: relative;
    height: 120px;
    position: relative;
    display: grid;
    cursor: pointer;
    grid-template-columns: repeat(10, 1fr);
    grid-template-rows: repeat(6, 1fr);

    &:hover .delete {
      opacity: 1;
    }

    .cell {
      position: relative;
      border-bottom: 1px solid black;

      i {
        position: absolute;
        font-size: 1.2rem;
        top: 12px;
        left: 12px;
        opacity: 0;
      }

      span {
        position: absolute;
        color: white;
        top: 12px;
        left: 18px;
      }

      .more-space {
        left: 12px;
      }

      .show {
        opacity: 1;
      }

      .edit {
        cursor: pointer;

        &:hover {
          color: #ff6f91;
        }
      }

      .selected {
        color: #ff6f91;
      }

      .selection {
        position: absolute;
        bottom: 20px;
        left: -44px;
        border: 1px solid black;
        box-shadow: 0 0 3px rgba(0, 0, 0, 0.3);
        width: 100px;
        padding: 2px;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(15px, 1fr));
        grid-column-gap: 5px;
        z-index: 1;
        transform-origin: center 60px;
        animation: come-in 500ms ease-in-out forwards;
        background: white;

        li {
          width: 15px;
          text-align: center;
          cursor: pointer;
          transition: 300ms ease-in-out;

          &:hover,
          &:focus {
            background: #ff6f91;
          }
        }

        &:after {
          content: "";
          position: absolute;
          bottom: -16px;
          left: 49px;
          width: 0;
          height: 0;
          border-left: 15px solid transparent;
          border-right: 15px solid transparent;
          border-top: 16px solid black;
        }

        &-start {
          left: -15px;

          &:after {
            left: 20px;
          }
        }
      }
    }

    .delete {
      opacity: 0;
      background: 0;
      position: absolute;
      color: black;
      top: -12px;
      right: -8px;
    }
  }

  @keyframes come-in {
    0% {
      opacity: 0;
      transform: scale(0.1) rotate(70deg) translateY(50px);
    }

    50% {
      transform: rotate(-10deg);
      opacity: 1;
    }

    70% {
      transform: rotate(3deg);
    }

    100% {
      transform: scale(1);
    }
  }
</style>

<div
  role="button"
  tabindex="1"
  class="chord-grid"
  on:click={() => {
    edit = !edit;
    showSelection = { x: null, y: null };
  }}>
  {#each [...Array(6)] as lineX, x}
    {#each [...Array(10)] as lineY, y}
      <div class="cell">
        <div
          on:click|stopPropagation={() => {
            if (edit) {
              showSelection = { x, y };
            }
          }}
          role="button"
          class="note"
          class:edit>
          <i
            class={`fa fa-circle ${edit && showSelection.x == x && showSelection.y == y ? 'selected' : ''} ${coordinates[x][y] || edit ? 'show' : ''}`} />
          <span class={coordinates[x][y] > 9 ? 'more-space' : ''}>
            {coordinates[x][y] || ''}
          </span>
        </div>

        {#if edit && showSelection.x == x && showSelection.y == y}
          <ul class={`selection ${y == 0 ? 'selection-start' : ''}`}>
            {#each tabOptions as option}
              <li
                on:click={() => {
                  coordinates[x][y] = option;
                  updateLesson();
                }}
                role="button">
                {option}
              </li>
            {/each}

            {#if coordinates[x][y]}
              <li
                on:click={() => {
                  delete coordinates[x][y];
                  coordinates = { ...coordinates };
                  updateLesson();
                }}
                role="button">
                -
              </li>
            {/if}
          </ul>
        {/if}
      </div>
    {/each}
  {/each}

  <button on:click={() => deleteTab(position)} class="naked-button delete">
    <i class="fa fa-trash-alt" />
  </button>
</div>
