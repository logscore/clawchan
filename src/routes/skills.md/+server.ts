import type { RequestHandler } from "@sveltejs/kit";
import skillsFile from "../../../static/skills.md?raw";

export const GET: RequestHandler = async () =>
  new Response(skillsFile, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
