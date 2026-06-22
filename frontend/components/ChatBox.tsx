// @ts-nocheck
import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Send, Bot, User, Trash2, Sparkles, Plus, MessageSquare,
  ChevronLeft, ChevronRight, Loader2
} from 'lucide-react';
import { streamChat, listConversations, createConversation, getConversationMessages, saveChatMessage, deleteConversation, updateConversation } from '../lib/api';
import { useAuth } from '../lib/auth';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';

const MOODS = ['adventurous', 'relaxing', 'romantic', 'cultural', 'family', 'budget'];
const BUDGETS = ['backpacker', 'mid-range', 'luxury'];

const STARTERS = [
  'Best hidden gems in Southeast Asia?',
  'Plan a 7-day Japan itinerary for ¥200k',
  'Safest solo travel destinations for women',
  'Budget Europe trip under $50/day',
];

const WELCOME_MSG = {
  role: 'assistant' as const,
  content: "Hello! I'm **Atlas**, your AI travel guide.\n\nTell me where you want to go, your mood, or budget — I'll craft the perfect journey for you.",
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

export default function ChatBox({ initialConvId }: { initialConvId?: string }) {
  const { user, loading: authLoading, travelMemory } = useAuth();

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mood, setMood] = useState('adventurous');
  const [budget, setBudget] = useState('mid-range');
  const bottomRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef('');
  const abortRef = useRef<AbortController | null>(null);

  // Conversation state
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [convLoading, setConvLoading] = useState(false);
  // Track which conv's messages are currently displayed to avoid redundant fetches
  const loadedConvId = useRef<string | null>(null);

  // Load conversations whenever user auth settles
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setMessages([WELCOME_MSG]);
      setConversations([]);
      setActiveConvId(null);
      loadedConvId.current = null;
      return;
    }
    loadConversations(initialConvId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading]);

  // If initialConvId changes (e.g. deep-link from another page), select it
  useEffect(() => {
    if (initialConvId && conversations.length > 0) {
      const exists = conversations.find((c: any) => c.id === initialConvId);
      if (exists) selectConversation(initialConvId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialConvId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const loadConversations = async (selectConvId?: string) => {
    try {
      const res = await listConversations();
      const convs = res.data.conversations || [];
      setConversations(convs);
      if (convs.length > 0) {
        const targetId = selectConvId && convs.find((c: any) => c.id === selectConvId)
          ? selectConvId
          : convs[0].id;
        await selectConversation(targetId, true);
      } else {
        // No conversations yet — show welcome
        setMessages([WELCOME_MSG]);
      }
    } catch (err: any) {
      console.error('Failed to load conversations:', err);
      const msg = err?.response?.data?.detail || err?.message || 'Failed to load conversations';
      toast.error(msg);
      setMessages([WELCOME_MSG]);
    }
  };

  const selectConversation = async (convId: string, force = false) => {
    // Allow re-selecting if forced (e.g. after initial load) or if the conv changed
    if (!force && loadedConvId.current === convId) return;

    setActiveConvId(convId);
    setConvLoading(true);
    loadedConvId.current = null; // mark as loading
    try {
      const res = await getConversationMessages(convId);
      const msgs = (res.data.messages || []).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
      setMessages(msgs.length === 0 ? [WELCOME_MSG] : msgs);
      loadedConvId.current = convId;
    } catch (err: any) {
      console.error('Failed to load messages:', err);
      const msg = err?.response?.data?.detail || err?.message || 'Failed to load messages';
      toast.error(msg);
      setMessages([WELCOME_MSG]);
      loadedConvId.current = convId; // still mark loaded to avoid infinite retries
    } finally {
      setConvLoading(false);
    }
  };

  const handleNewChat = async () => {
    if (!user) {
      setMessages([WELCOME_MSG]);
      setActiveConvId(null);
      loadedConvId.current = null;
      return;
    }
    try {
      const res = await createConversation({ title: 'New Chat' });
      const newConv = res.data;
      setActiveConvId(newConv.id);
      loadedConvId.current = newConv.id;
      setConversations(prev => [newConv, ...prev]);
      setMessages([WELCOME_MSG]);
    } catch {
      toast.error('Failed to create conversation');
    }
  };

  const handleDeleteConv = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    if (!confirm('Delete this conversation?')) return;
    try {
      await deleteConversation(convId);
      const remaining = conversations.filter((c: any) => c.id !== convId);
      setConversations(remaining);
      if (activeConvId === convId) {
        if (remaining.length > 0) {
          await selectConversation(remaining[0].id, true);
        } else {
          setActiveConvId(null);
          loadedConvId.current = null;
          setMessages([WELCOME_MSG]);
        }
      }
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleSend = async (text: string) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setInput('');

    // Auto-create conversation for signed-in users
    let convId = activeConvId;
    let isNewConv = false;

    if (!convId && user) {
      try {
        // Pass first_message so the backend saves it — we won't save it again below
        const res = await createConversation({ title: userText.slice(0, 50), first_message: userText });
        convId = res.data.id;
        isNewConv = true;
        setActiveConvId(convId);
        loadedConvId.current = convId;
        setConversations(prev => [res.data, ...prev]);
      } catch { /* fall through to guest mode */ }
    } else if (convId && user && !isNewConv) {
      // Save user message before streaming
      try {
        await saveChatMessage(convId, { role: 'user', content: userText });
      } catch { /* silent */ }
    }

    const userMsg: Message = { role: 'user', content: userText };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setLoading(true);
    streamRef.current = '';

    setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }]);

    const truncated = updatedMessages.length > 20
      ? [updatedMessages[0], ...updatedMessages.slice(-19)]
      : updatedMessages;

    try {
      await streamChat(
        truncated.map(m => ({ role: m.role, content: m.content })),
        mood,
        budget,
        travelMemory,
        {
          onToken: (token: string) => {
            streamRef.current += token;
            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: 'assistant', content: streamRef.current, streaming: true };
              return updated;
            });
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
          },
          onDone: async () => {
            const finalContent = streamRef.current;
            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: 'assistant', content: finalContent, streaming: false };
              return updated;
            });
            setLoading(false);

            if (convId && user) {
              // Save assistant reply
              try {
                await saveChatMessage(convId, { role: 'assistant', content: finalContent });
              } catch {}

              // Auto-update title if still "New Chat"
              const conv = conversations.find((c: any) => c.id === convId);
              if (conv?.title === 'New Chat' && userText.length > 0) {
                const title = userText.length > 45 ? userText.slice(0, 45) + '...' : userText;
                try {
                  await updateConversation(convId, title);
                  setConversations(prev => prev.map((c: any) => c.id === convId ? { ...c, title } : c));
                } catch {}
              }
            }
          },
          onError: (err: string) => {
            toast.error('AI error: ' + err);
            setMessages(prev => prev.filter(m => !m.streaming));
            setLoading(false);
          },
        },
        abortRef.current?.signal
      );
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        toast.error('Connection failed. Is the backend running?');
      }
      setMessages(prev => prev.filter(m => !m.streaming));
      setLoading(false);
    }
  };

  const clearChat = async () => {
    if (activeConvId && user) {
      try {
        await deleteConversation(activeConvId);
        setConversations(prev => prev.filter((c: any) => c.id !== activeConvId));
      } catch {}
    }
    setActiveConvId(null);
    loadedConvId.current = null;
    setMessages([{ role: 'assistant', content: 'Chat cleared! Ask me anything about travel.' }]);
  };

  const isFirstMessage = messages.length <= 1 || (messages.length === 1 && messages[0].role === 'assistant');

  return (
    <div className="flex h-[calc(100vh-8rem)] h-[calc(100dvh-8rem)] max-w-5xl mx-auto gap-0">
      {/* Conversation sidebar */}
      {user && (
        <>
          {/* Mobile overlay backdrop */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
          <div className={cn(
            'flex flex-col border-r border-border bg-card transition-all duration-200 overflow-hidden shrink-0',
            'md:relative md:z-0',
            sidebarOpen
              ? 'w-56 fixed left-0 top-14 bottom-0 z-40 md:static md:w-56'
              : 'w-0'
          )}>
            <div className="p-3 border-b border-border">
              <button
                onClick={handleNewChat}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90 transition-all"
              >
                <Plus className="w-4 h-4" />
                New Chat
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {conversations.map((conv: any) => (
                <div
                  key={conv.id}
                  onClick={() => {
                    selectConversation(conv.id);
                    if (window.innerWidth < 768) setSidebarOpen(false);
                  }}
                  className={cn(
                    'group flex items-center gap-2 px-3 py-3 rounded-lg cursor-pointer transition-all text-xs',
                    activeConvId === conv.id
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <MessageSquare className="w-4 h-4 shrink-0" />
                  <span className="truncate flex-1">{conv.title}</span>
                  <button
                    onClick={(e) => handleDeleteConv(e, conv.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-destructive/10 hover:text-destructive transition-all shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {conversations.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No conversations yet</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Toggle sidebar */}
      {user && (
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex items-center justify-center w-8 md:w-5 h-8 md:h-auto border-r border-border bg-card hover:bg-accent transition-colors shrink-0"
          title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          {sidebarOpen ? <ChevronLeft className="w-4 h-4 md:w-3 md:h-3 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 md:w-3 md:h-3 text-muted-foreground" />}
        </button>
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0 px-4">
        {/* Mood & Budget chips */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-3 shrink-0 pt-1">
          <div className="flex gap-1 flex-wrap">
            {MOODS.map(m => (
              <button
                key={m}
                onClick={() => setMood(m)}
                className={cn(
                  'px-3 py-1.5 md:px-2.5 md:py-1 rounded-full text-xs font-medium capitalize transition-all',
                  mood === m
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-accent'
                )}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="flex gap-1 items-center sm:ml-auto">
            {BUDGETS.map(b => (
              <button
                key={b}
                onClick={() => setBudget(b)}
                className={cn(
                  'px-3 py-1.5 md:px-2.5 md:py-1 rounded-full text-xs font-medium capitalize transition-all',
                  budget === b
                    ? 'bg-foreground/10 text-foreground ring-1 ring-foreground/20'
                    : 'bg-secondary text-secondary-foreground hover:bg-accent'
                )}
              >
                {b}
              </button>
            ))}
            <button
              onClick={clearChat}
              className="ml-1 p-2 md:p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
              title="Clear chat"
            >
              <Trash2 className="w-4 h-4 md:w-3.5 md:h-3.5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4">
          {convLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300',
                    msg.role === 'user' && 'flex-row-reverse'
                  )}
                >
                  <div
                    className={cn(
                      'w-8 h-8 md:w-7 md:h-7 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-gradient-to-br from-foreground/80 to-foreground text-background'
                    )}
                  >
                    {msg.role === 'user' ? <User className="w-4 h-4 md:w-3.5 md:h-3.5" /> : <Bot className="w-4 h-4 md:w-3.5 md:h-3.5" />}
                  </div>

                  <div
                    className={cn(
                      'max-w-[90%] md:max-w-[85%] px-3 py-2.5 md:px-4 md:py-3 rounded-2xl text-sm leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-card text-card-foreground border border-border rounded-tl-sm shadow-sm'
                    )}
                  >
                    {msg.role === 'assistant' ? (
                      <>
                        <ReactMarkdown className="prose prose-sm max-w-none dark:prose-invert">
                          {msg.content}
                        </ReactMarkdown>
                        {msg.streaming && (
                          <span className="inline-block w-2 h-4 bg-foreground/40 animate-pulse ml-0.5 rounded-sm" />
                        )}
                      </>
                    ) : (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    )}
                  </div>
                </div>
              ))}

              {/* Loading skeleton */}
              {loading && !messages[messages.length - 1]?.content && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 md:w-7 md:h-7 rounded-full bg-gradient-to-br from-foreground/80 to-foreground flex items-center justify-center">
                    <Bot className="w-4 h-4 md:w-3.5 md:h-3.5 text-background" />
                  </div>
                  <div className="bg-card border border-border px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm">
                    <div className="flex gap-1.5">
                      {[0, 200, 400].map(d => (
                        <div key={d} className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Starter prompts */}
        {isFirstMessage && !loading && !convLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3 shrink-0">
            {STARTERS.map(s => (
              <button
                key={s}
                onClick={() => handleSend(s)}
                className="text-left p-3 bg-card border border-border rounded-xl text-xs text-card-foreground/70 hover:border-primary/30 hover:bg-accent/50 transition-all line-clamp-2"
              >
                <Sparkles className="w-3.5 h-3.5 md:w-3 md:h-3 text-primary inline mr-1.5 mb-0.5" />
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input bar */}
        <div className="flex gap-2 bg-card border border-border rounded-2xl p-2 md:p-1.5 shadow-sm shrink-0 mb-1">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend('')}
            placeholder="Ask me about any destination..."
            className="flex-1 px-3 py-3 md:py-2.5 bg-transparent text-sm text-foreground placeholder-muted-foreground outline-none"
          />
          <button
            onClick={() => handleSend('')}
            disabled={!input.trim() || loading}
            className="px-5 py-3 md:px-4 md:py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-all flex items-center gap-2 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {user ? (
          <p className="text-center text-xs text-muted-foreground shrink-0">
            Signed in as <span className="font-medium text-foreground/70">{user.name}</span>
            {conversations.length > 0 && ` · ${conversations.length} conversation${conversations.length !== 1 ? 's' : ''}`}
          </p>
        ) : (
          <p className="text-center text-xs text-muted-foreground shrink-0">
            Sign in to save your chat history
          </p>
        )}
      </div>
    </div>
  );
}
