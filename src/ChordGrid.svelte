<script>
  export let lesson;
  export let updateLesson;
  let { coordinates } = lesson;

  let tabOptions = [1, 2, 3, 4, 5, 6, "x", "p", "h"];

  let edit = false;
  let showSelection = { x: null, y: null };
</script>

<style lang="scss">
  h2 {
    font-size: 1.1rem;
  }

  .chord-grid {
    height: 120px;
    position: relative;
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    grid-template-rows: repeat(6, 1fr);

    .cell {
      position: relative;
      border-bottom: 1px solid black;

      i {
        position: absolute;
        font-size: 1.1rem;
        top: 12px;
        left: 12px;
        opacity: 0;
      }

      span {
        position: absolute;
        color: white;
        top: 12px;
        left: 16px;
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
        display: flex;
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
          top: 20px;
          left: 59px;
          width: 0;
          height: 0;
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-top: 10px solid black;
        }
      }
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

<h2>Tab</h2>

<div class="chord-grid">
  {#each [...Array(6)] as lineX, x}
    {#each [...Array(10)] as lineY, y}
      <div class="cell">
        <div
          on:click={() => {
            if (edit) {
              showSelection = { x, y };
            }
          }}
          role="button"
          class="note"
          class:edit>
          <i
            class={`fa fa-circle ${edit && showSelection.x == x && showSelection.y == y ? 'selected' : ''} ${coordinates[x][y] || edit ? 'show' : ''}`} />
          <span>{coordinates[x][y] || ''}</span>
        </div>

        {#if edit && showSelection.x == x && showSelection.y == y}
          <ul style={y == 0 ? 'left: -15px' : ''} class="selection">
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
</div>

<button
  on:click={() => {
    edit = !edit;
    showSelection = { x: null, y: null };
  }}>
  {edit ? 'confirm' : 'Edit tab'}
</button>
