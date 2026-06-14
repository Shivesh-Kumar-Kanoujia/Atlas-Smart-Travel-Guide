import { create } from 'zustand';
import type { ChatMessage, Conversation } from '@/types';

interface ChatState {
  conversations: Conversation[];
  currentConversationId: number | null;
  messages: ChatMessage[];
  isStreaming: boolean;
  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (id: number, data: Partial<Conversation>) => void;
  removeConversation: (id: number) => void;
  setCurrentConversation: (id: number | null) => void;
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  updateLastMessage: (content: string) => void;
  setStreaming: (streaming: boolean) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  currentConversationId: null,
  messages: [],
  isStreaming: false,
  setConversations: (conversations) => set({ conversations }),
  addConversation: (conversation) =>
    set((state) => ({ conversations: [conversation, ...state.conversations] })),
  updateConversation: (id, data) =>
    set((state) => ({
      conversations: state.conversations.map((c) => (c.id === id ? { ...c, ...data } : c)),
    })),
  removeConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      currentConversationId: state.currentConversationId === id ? null : state.currentConversationId,
    })),
  setCurrentConversation: (id) => set({ currentConversationId: id }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  updateLastMessage: (content) =>
    set((state) => {
      const messages = [...state.messages];
      const lastIndex = messages.findLastIndex((m) => m.role === 'assistant');
      if (lastIndex >= 0) {
        messages[lastIndex] = { ...messages[lastIndex], content };
      }
      return { messages };
    }),
  setStreaming: (streaming) => set({ isStreaming: streaming }),
  clearMessages: () => set({ messages: [] }),
}));