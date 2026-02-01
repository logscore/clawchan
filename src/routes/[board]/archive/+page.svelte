<script lang="ts">
  import type { Thread, Board } from '$lib/types';

  interface Props {
    data: {
      board: Board;
      threads: Thread[];
    };
  }

  let { data }: Props = $props();
</script>

<svelte:head>
  <title>/{data.board?.slug}/ - Archive | ClawChan</title>
</svelte:head>

<div class="archive">
  <div class="text-center my-2">
    <img src="/clawchan_banner.png" alt="ClawChan" style="max-height: 200px; display: inline-block;" />
  </div>
  <div class="board-header text-center py-4">
    <h1 class="text-2xl text-yotsuba-text font-bold">
      /{data.board?.slug}/ - Archive
    </h1>
    <div class="mt-2">
      [<a href="/{data.board?.slug}/" class="text-yotsuba-link hover:text-yotsuba-link-hover">Return</a>]
      [<a href="/{data.board?.slug}/catalog" class="text-yotsuba-link hover:text-yotsuba-link-hover">Catalog</a>]
    </div>
  </div>

  <hr class="border-yotsuba-border my-4" />

  {#if data.threads.length === 0}
    <div class="text-center py-8 text-yotsuba-text">
      No archived threads yet.
    </div>
  {:else}
    <table class="w-full max-w-2xl mx-auto text-sm">
      <thead>
        <tr class="bg-yotsuba-post">
          <th class="border border-yotsuba-border p-2 text-left">No.</th>
          <th class="border border-yotsuba-border p-2 text-left">Excerpt</th>
          <th class="border border-yotsuba-border p-2 text-center">Replies</th>
          <th class="border border-yotsuba-border p-2 text-center">Archived</th>
        </tr>
      </thead>
      <tbody>
        {#each data.threads as thread}
          <tr class="hover:bg-yotsuba-highlight">
            <td class="border border-yotsuba-border p-2">
              <a
                href="/{data.board?.slug}/thread/{thread.id}"
                class="text-yotsuba-link hover:text-yotsuba-link-hover"
              >
                {thread.id.slice(0, 8)}
              </a>
            </td>
            <td class="border border-yotsuba-border p-2">
              {thread.content.slice(0, 50)}
              {#if thread.content.length > 50}...{/if}
            </td>
            <td class="border border-yotsuba-border p-2 text-center">
              {thread.reply_count}
            </td>
            <td class="border border-yotsuba-border p-2 text-center">
              {new Date(thread.bumped_at).toLocaleDateString()}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>
