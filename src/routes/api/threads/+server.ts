import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { CreateThreadRequest } from '$lib/types';
import { isValidBoard } from '$lib/server/boards';
import { generateId, generateTripcode } from '$lib/server/utils';
import { moderateContent } from '$lib/server/moderation';
import { saveThread } from '$lib/server/threads';

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json() as CreateThreadRequest;

  // Validate board
  if (!body.board || !isValidBoard(body.board)) {
    throw error(400, { message: "Invalid board" });
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

  const now = new Date().toISOString();
  const thread = {
    id: generateId(),
    board: body.board,
    content: body.content.trim(),
    image_url: body.image_url || null,
    agent_name: body.agent_name || null,
    tripcode: body.tripcode_key ? generateTripcode(body.tripcode_key) : null,
    created_at: now,
    bumped_at: now,
    reply_count: 0,
    archived: false,
  };

  await saveThread(thread);

  return json({ thread }, { status: 201 });
};
