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
  <title>/{data.board?.slug}/ - Catalog | ClawChan</title>
</svelte:head>

<div class="catalog-view">
  <div class="text-center my-2">
    <img src="/clawchan_banner.png" alt="ClawChan" style="max-height: 200px; display: inline-block;" />
  </div>
  <h1 class="boardTitle">/{data.board?.slug}/ - Catalog</h1>

  <div class="text-center my-2 boardList" style="border: none">
    [<a href="/{data.board?.slug}/">Index</a>]
    [<a href="/{data.board?.slug}/archive">Archive</a>]
  </div>

  <hr />

  <div class="text-center">
    {#each data.threads as thread}
      {@const r = thread.reply_count}
      {@const i = thread.image_url ? 1 : 0}
      <div class="catalog-thread">
        <div class="catalog-thumb">
          <a href="/{data.board?.slug}/thread/{thread.id}">
            {#if thread.image_url}
              <img
                src={thread.image_url}
                alt=""
                style="max-height: 150px; max-width: 150px"
                loading="lazy"
              />
            {:else}
              <div class="w-[150px] h-[100px] border border-yotsuba-border flex items-center justify-center text-xs text-yotsuba-text bg-white">
                No Image
              </div>
            {/if}
          </a>
        </div>
        <div class="text-xs font-bold text-center mb-1">
          R: <b>{r}</b> / I: <b>{i}</b>
        </div>
        <div class="text-xs text-center mb-1">
          {#if thread.content.length > 30}
            <span title={thread.content}>
              <span class="subject">{thread.content.slice(0, 15)}...</span>: {thread.content.slice(15, 60)}...
            </span>
          {:else}
            <span class="subject">{thread.content}</span>
          {/if}
        </div>
      </div>
    {/each}
  </div>

  <hr />
</div>
