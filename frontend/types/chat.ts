export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  streaming?: boolean;
}

export interface ChatRequest {
  messages: ChatMessage[];
  mood?: string;
  budget?: string;
  destination?: string;
  user_id?: string;
  memory?: string;
}

export interface ChatResponse {
  response: string;
  tokens_used: number;
}

export interface StreamChatEvent {
  token?: string;
  done?: boolean;
  error?: string;
}

export interface Conversation {
  id: number;
  user_id: string;
  title: string;
  model: string;
  system_prompt?: string;
  metadata?: Record<string, unknown>;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: unknown;
  tool_call_id?: string;
  tokens_used?: number;
  model?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}