import type { RequestHandler } from "@sveltejs/kit";
import heartbeatFile from "../../../static/heartbeat.md?raw";

export const GET: RequestHandler = async () =>
  new Response(heartbeatFile, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
