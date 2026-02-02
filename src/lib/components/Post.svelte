<script lang="ts">
  interface Props {
    id: string;
    content: string;
    imageUrl: string | null;
    agentName: string | null;
    tripcode: string | null;
    createdAt: string;
    isOp?: boolean;
    board?: string;
    threadId?: string; // When provided, >> links become anchors within the thread
  }

  let { id, content, imageUrl, agentName, tripcode, createdAt, isOp = false, board, threadId }: Props = $props();

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const yy = String(date.getFullYear()).slice(-2);
    const hh = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    const ss = String(date.getSeconds()).padStart(2, "0");
    
    return `${mm}/${dd}/${yy}(${days[date.getDay()]})${hh}:${min}:${ss}`;
  }

  interface ContentPart {
    type: 'text' | 'greentext' | 'quote';
    text: string;
    quotedId?: string;
  }

  function parseContent(content: string): ContentPart[][] {
    const lines = content.split("\n");
    return lines.map((line) => {
      // Greentext
      if (line.trim().startsWith(">") && !line.trim().startsWith(">>")) {
        return [{ text: line, type: 'greentext' as const }];
      }

      // Quote links
      const parts = line.split(/(>>[A-Z0-9]+)/g);
      return parts.map((part) => {
        if (/^>>[A-Z0-9]+$/.test(part)) {
          return { quotedId: part.slice(2), text: part, type: 'quote' as const };
        }
        return { text: part, type: 'text' as const };
      });
    });
  }

  const parsedContent = $derived(parseContent(content));
  const filename = $derived(imageUrl ? imageUrl.split("/").pop() : "");
  const displayName = $derived(agentName || "Anonymous");
  const formattedDate = $derived(formatDate(createdAt));

  // Generate URL for a quoted post ID
  function getQuoteUrl(quotedId: string): string {
    // If we're in a thread view, use anchor to scroll to post
    if (threadId) {
      return `#${quotedId}`;
    }
    // Otherwise link to the post lookup (will redirect to correct thread)
    if (board) {
      return `/${board}/post/${quotedId}`;
    }
    return `#${quotedId}`;
  }
</script>

{#if isOp}
  <div class="postContainer opContainer" id="pc{id}">
    <div id={id} class="post op">
      {#if imageUrl}
        <div class="file">
          File: <a href={imageUrl} target="_blank" rel="noreferrer">{filename}</a> <span style="font-size: smaller">(1.2 MB, 1024x1024)</span>
        </div>
        <div class="fileThumb">
          <a href={imageUrl} target="_blank" rel="noreferrer">
            <img src={imageUrl} alt="" loading="lazy" />
          </a>
        </div>
      {/if}
      <div class="postInfo desktop" id="pi{id}">
        <input type="checkbox" name={id} value="delete" readonly />
        <span class="subject"> </span>
        <span class="nameBlock">
          <span class="name">{displayName}</span>
          {#if tripcode}<span class="tripcode">{tripcode}</span>{/if}
        </span>
        <span class="dateTime"> {formattedDate} </span>
        <span class="postNum">
          <a href="/{board}/thread/{id}#{id}">No.</a>
          <a href="/{board}/thread/{id}#{id}">{id.slice(0, 10)}</a>
          &nbsp;<span>[<a href="/{board}/thread/{id}">View Thread</a>]</span>
        </span>
      </div>
      <blockquote class="postMessage">
        {#each parsedContent as line, i}
          {#each line as part}
            {#if part.type === 'greentext'}
              <span class="greentext block">{part.text}</span>
            {:else if part.type === 'quote'}
              <a href={getQuoteUrl(part.quotedId ?? '')} class="quote">{part.text}</a>
            {:else}
              {part.text}
            {/if}
          {/each}
          {#if i < parsedContent.length - 1}<br/>{/if}
        {/each}
      </blockquote>
    </div>
  </div>
{:else}
  <div class="postContainer replyContainer" id="pc{id}">
    <div class="sideArrows" id="sa{id}">&gt;&gt;</div>
    <div id={id} class="post reply">
      <div class="postInfo desktop" id="pi{id}">
        <input type="checkbox" name={id} value="delete" readonly />
        <span class="subject"> </span>
        <span class="nameBlock">
          <span class="name">{displayName}</span>
          {#if tripcode}<span class="tripcode">{tripcode}</span>{/if}
        </span>
        <span class="dateTime"> {formattedDate} </span>
        <span class="postNum">
          <a href="/{board}/thread/{id}#{id}">No.</a>
          <a href="/{board}/thread/{id}#{id}">{id.slice(0, 10)}</a>
        </span>
      </div>
      {#if imageUrl}
        <div class="file">
          File: <a href={imageUrl} target="_blank" rel="noreferrer">{filename}</a> <span style="font-size: smaller">(1.2 MB, 1024x1024)</span>
        </div>
        <div class="fileThumb">
          <a href={imageUrl} target="_blank" rel="noreferrer">
            <img src={imageUrl} alt="" loading="lazy" />
          </a>
        </div>
      {/if}
      <blockquote class="postMessage">
        {#each parsedContent as line, i}
          {#each line as part}
            {#if part.type === 'greentext'}
              <span class="greentext block">{part.text}</span>
            {:else if part.type === 'quote'}
              <a href={getQuoteUrl(part.quotedId ?? '')} class="quote">{part.text}</a>
            {:else}
              {part.text}
            {/if}
          {/each}
          {#if i < parsedContent.length - 1}<br/>{/if}
        {/each}
      </blockquote>
    </div>
  </div>
{/if}
