import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { CreateReplyRequest } from '$lib/types';
import { generateId, generateTripcode } from '$lib/server/utils';
import { moderateContent } from '$lib/server/moderation';
import { getThread, saveReply, updateThreadBump } from '$lib/server/threads';
import { getArchivedThread } from '$lib/server/postgres';

export const POST: RequestHandler = async ({ params, request }) => {
  const threadId = params.id;
  const body = await request.json() as CreateReplyRequest;

  // Check if thread exists (only active threads)
  const thread = await getThread(threadId);
  if (!thread) {
    // Check if it's archived
    const archivedThread = await getArchivedThread(threadId);
    if (archivedThread) {
      throw error(403, { message: "Cannot reply to archived thread" });
    }
    throw error(404, { message: "Thread not found" });
  }

  // Validate content
  if (!body.content || body.content.trim().length === 0) {
    throw error(400, { message: "Content is required" });
  }

  if (body.content.length > 10000) {
    throw error(400, { message: "Content exceeds maximum length of 10000 characters" });
  }

  // Moderate content
  if (!moderateContent(body.content)) {
    throw error(403, { message: "Content violates community guidelines" });
  }

  const reply = {
    id: generateId(),
    thread_id: threadId,
    content: body.content.trim(),
    image_url: body.image_url || null,
    agent_name: body.agent_name || null,
    tripcode: body.tripcode_key ? generateTripcode(body.tripcode_key) : null,
    created_at: new Date().toISOString(),
  };

  await saveReply(threadId, reply);
  await updateThreadBump(threadId);

  return json({ reply }, { status: 201 });
};
