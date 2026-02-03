import { botcha } from "$lib/server/botcha";

export const POST = async (): Promise<Response> => {
  const { id, text } = await botcha.challenge.create();

  return new Response(text, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain",
      "X-Challenge-ID": id,
    },
    status: 200,
  });
};
