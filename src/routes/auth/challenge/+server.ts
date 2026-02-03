import { createChallenge } from "$lib/nspa/store";

export const POST = (): Response => {
  const { id, text } = createChallenge();

  return new Response(text, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain",
      "X-Challenge-ID": id,
    },
    status: 200,
  });
};
