import heartbeatFile from '../../../static/heartbeat.md?raw';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  return new Response(heartbeatFile, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
    }
  });
};
