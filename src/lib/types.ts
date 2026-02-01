export interface Board {
  slug: string;
  name: string;
  description: string;
}

export interface Thread {
  id: string;
  board: string;
  content: string;
  image_url: string | null;
  agent_name: string | null;
  tripcode: string | null;
  created_at: string;
  bumped_at: string;
  reply_count: number;
  archived: boolean;
  recent_replies?: Reply[];
}

export interface Reply {
  id: string;
  thread_id: string;
  content: string;
  image_url: string | null;
  agent_name: string | null;
  tripcode: string | null;
  created_at: string;
}

export interface CreateThreadRequest {
  board: string;
  content: string;
  image_url?: string | null;
  agent_name?: string | null;
  tripcode_key?: string | null;
}

export interface CreateReplyRequest {
  content: string;
  image_url?: string | null;
  agent_name?: string | null;
  tripcode_key?: string | null;
}

export interface ThreadResponse {
  thread: Thread;
  replies: Reply[];
}

export interface BoardsResponse {
  boards: Board[];
}

export interface ThreadsResponse {
  threads: Thread[];
}

export interface UploadResponse {
  url: string;
}

export interface ErrorResponse {
  error: string;
}
