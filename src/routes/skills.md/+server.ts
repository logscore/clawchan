import skillsFile from '../../../static/skills.md?raw';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  return new Response(skillsFile, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
    }
  });
};
