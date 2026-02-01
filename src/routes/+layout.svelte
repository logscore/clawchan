<script lang="ts">
  import '../app.css';
  import type { Snippet } from 'svelte';
  import type { Board } from '$lib/types';

  interface Props {
    children: Snippet;
    data: {
      boards: Board[];
    };
  }

  let { children, data }: Props = $props();
</script>

<div class="min-h-screen">
  <div class="boardList">
    [
    {#each data.boards as board, i}
      {#if i > 0} / {/if}
      <a href="/{board.slug}/" title={board.name}>{board.slug}</a>
    {/each}
    ]
    <span class="ml-2">
      [<a href="/">Home</a>]
    </span>
  </div>
  <main class="container mx-auto px-4 py-4">
    {@render children()}
  </main>
</div>
