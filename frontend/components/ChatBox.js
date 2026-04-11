import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Bot, User, Trash2, Mic, MicOff } from "lucide-react";
import { streamChat } from "../lib/api";
import { useAuth } from "../lib/auth";
import toast from "react-hot-toast";

const MOODS   = ["adventurous", "relaxing", "romantic", "cultural", "family", "budget"];
const BUDGETS = ["backpacker", "mid-range", "luxury"];
const STARTERS = [
  "Best hidden gems in Southeast Asia? 🌴",
  "Plan a 7-day Japan itinerary for ¥200k",
  "Safest solo travel destinations for women",
  "Budget Europe trip under $50/day",
];

export default function ChatBox() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hello! I'm **Atlas**, your AI travel guide 🌍\n\nTell me where you want to go, your mood, or budget — I'll craft the perfect journey for you." }
  ]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const [mood, setMood]       = useState("adventurous");
  const [budget, setBudget]   = useState("mid-range");
  const [listening, setListening] = useState(false);
  const bottomRef  = useRef(null);
  const streamRef  = useRef("");
  const recognitionRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Voice input setup
  useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";
      recognition.onresult = (e) => {
        setInput(e.results[0][0].transcript);
        setListening(false);
      };
      recognition.onerror  = () => setListening(false);
      recognition.onend    = () => setListening(false);
      recognitionRef.current = recognition;
    }
  }, []);

  const toggleVoice = () => {
    if (!recognitionRef.current) return toast.error("Voice not supported in this browser");
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      recognitionRef.current.start();
      setListening(true);
    }
  };

  const handleSend = async (text) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;
    setInput("");

    const userMsg = { role: "user", content: userText };
    const history = [...messages, userMsg];
    setMessages(history);
    setLoading(true);
    streamRef.current = "";

    // Add empty assistant message that we'll fill as tokens arrive
    setMessages(prev => [...prev, { role: "assistant", content: "", streaming: true }]);

    try {
      await streamChat(
        history.map(m => ({ role: m.role, content: m.content })),
        mood,
        budget,
        // onToken: append to last message
        (token) => {
          streamRef.current += token;
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content: streamRef.current,
              streaming: true,
            };
            return updated;
          });
          bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        },
        // onDone
        () => {
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content: streamRef.current,
              streaming: false,
            };
            return updated;
          });
          setLoading(false);
        },
        // onError
        (err) => {
          toast.error("AI error: " + err);
          setMessages(prev => prev.filter(m => !m.streaming));
          setLoading(false);
        }
      );
    } catch (err) {
      toast.error("Connection failed. Is the backend running?");
      setMessages(prev => prev.filter(m => !m.streaming));
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([{ role: "assistant", content: "Chat cleared! Ask me anything about travel ✈️" }]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] max-w-3xl mx-auto">

      {/* Mood + Budget toggles */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex gap-1.5 flex-wrap">
          {MOODS.map(m => (
            <button key={m} onClick={() => setMood(m)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all ${
                mood === m ? "bg-sand-500 text-white" : "bg-sand-100 text-sand-700 hover:bg-sand-200"
              }`}>{m}</button>
          ))}
        </div>
        <div className="flex gap-1.5 ml-auto items-center">
          {BUDGETS.map(b => (
            <button key={b} onClick={() => setBudget(b)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all ${
                budget === b ? "bg-ocean-600 text-white" : "bg-ocean-50 text-ocean-700 hover:bg-ocean-100"
              }`}>{b}</button>
          ))}
          <button onClick={clearChat} className="ml-2 p-1.5 rounded-lg text-sand-400 hover:text-red-500 hover:bg-red-50 transition-all">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 animate-slide-up ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
              msg.role === "user"
                ? "bg-sand-500 text-white"
                : "bg-gradient-to-br from-ocean-500 to-ocean-700 text-white"
            }`}>
              {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
              msg.role === "user"
                ? "bg-sand-500 text-white rounded-tr-sm"
                : "bg-white border border-sand-200 text-sand-900 rounded-tl-sm shadow-sm"
            }`}>
              {msg.role === "assistant" ? (
                <>
                  <ReactMarkdown className="prose prose-sm max-w-none">{msg.content}</ReactMarkdown>
                  {msg.streaming && (
                    <span className="inline-block w-2 h-4 bg-sand-400 animate-pulse ml-0.5 rounded-sm" />
                  )}
                </>
              ) : msg.content}
            </div>
          </div>
        ))}

        {/* Loading dots (only if no streaming message yet) */}
        {loading && messages[messages.length - 1]?.content === "" && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-ocean-500 to-ocean-700 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white border border-sand-200 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm">
              <div className="flex gap-1.5">
                {[0, 150, 300].map(d => (
                  <div key={d} className="w-2 h-2 bg-sand-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Starter prompts */}
      {messages.length <= 1 && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          {STARTERS.map(s => (
            <button key={s} onClick={() => handleSend(s)}
              className="text-left p-3 bg-white border border-sand-200 rounded-xl text-xs text-sand-700 hover:border-sand-400 hover:bg-sand-50 transition-all line-clamp-2">
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="flex gap-2 bg-white border border-sand-200 rounded-2xl p-1.5 shadow-sm">
        <button onClick={toggleVoice}
          className={`p-2 rounded-xl transition-all flex-shrink-0 ${
            listening ? "bg-red-500 text-white" : "text-sand-400 hover:bg-sand-100"
          }`}>
          {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>
        <input
          type="text" value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder={listening ? "Listening..." : "Ask me about any destination..."}
          className="flex-1 px-2 py-2 bg-transparent text-sm text-sand-900 placeholder-sand-400 outline-none"
        />
        <button onClick={() => handleSend()} disabled={!input.trim() || loading}
          className="px-4 py-2 bg-sand-500 text-white rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-sand-600 transition-all flex items-center gap-2">
          <Send className="w-4 h-4" />
        </button>
      </div>

      {user && (
        <p className="text-center text-xs text-sand-400 mt-2">
          Signed in as <span className="font-medium text-sand-600">{user.name}</span> — your preferences are remembered
        </p>
      )}
    </div>
  );
}
