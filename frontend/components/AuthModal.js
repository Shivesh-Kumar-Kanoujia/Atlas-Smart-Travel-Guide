import { useState } from "react";
import { X, Mail, Lock, User, Loader2, Eye, EyeOff } from "lucide-react";
import { registerUser, loginUser } from "../lib/api";
import { useAuth } from "../lib/auth";
import toast from "react-hot-toast";

export default function AuthModal({ onClose }) {
  const { saveAuth } = useAuth();
  const [mode, setMode]         = useState("login"); // login | register
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm]         = useState({ email: "", password: "", name: "" });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.email || !form.password) return toast.error("Fill in all fields");
    if (mode === "register" && !form.name) return toast.error("Enter your name");
    setLoading(true);
    try {
      const fn = mode === "login" ? loginUser : registerUser;
      const res = await fn(form);
      saveAuth(res.data.token, res.data.user);
      toast.success(mode === "login" ? `Welcome back, ${res.data.user.name}!` : `Welcome to Atlas, ${res.data.user.name}!`);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{ minHeight: 420, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}
      className="fixed inset-0 z-50"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl p-7 w-full max-w-sm mx-4 shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="font-display text-xl font-semibold text-sand-900">
              {mode === "login" ? "Welcome back" : "Create account"}
            </h2>
            <p className="text-xs text-sand-500 mt-0.5">
              {mode === "login" ? "Sign in to access your trips" : "Start planning smarter"}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-sand-100 rounded-lg transition-all">
            <X className="w-4 h-4 text-sand-500" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-3">
          {mode === "register" && (
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400" />
              <input
                type="text" placeholder="Full name" value={form.name}
                onChange={e => set("name", e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-sand-50 border border-sand-200 rounded-xl text-sm outline-none focus:border-sand-400 transition-all"
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400" />
            <input
              type="email" placeholder="Email address" value={form.email}
              onChange={e => set("email", e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              className="w-full pl-10 pr-4 py-3 bg-sand-50 border border-sand-200 rounded-xl text-sm outline-none focus:border-sand-400 transition-all"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400" />
            <input
              type={showPass ? "text" : "password"} placeholder="Password" value={form.password}
              onChange={e => set("password", e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              className="w-full pl-10 pr-10 py-3 bg-sand-50 border border-sand-200 rounded-xl text-sm outline-none focus:border-sand-400 transition-all"
            />
            <button onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2">
              {showPass
                ? <EyeOff className="w-4 h-4 text-sand-400" />
                : <Eye    className="w-4 h-4 text-sand-400" />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button onClick={handleSubmit} disabled={loading}
          className="w-full mt-5 py-3 bg-sand-500 text-white rounded-xl font-medium hover:bg-sand-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> {mode === "login" ? "Signing in..." : "Creating account..."}</>
            : mode === "login" ? "Sign in" : "Create account"}
        </button>

        {/* Toggle mode */}
        <p className="text-center text-xs text-sand-500 mt-4">
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => setMode(mode === "login" ? "register" : "login")}
            className="text-sand-700 font-medium hover:text-sand-900 underline">
            {mode === "login" ? "Sign up" : "Sign in"}
          </button>
        </p>

        {/* Guest notice */}
        <p className="text-center text-xs text-sand-400 mt-3">
          or{" "}
          <button onClick={onClose} className="underline hover:text-sand-600">
            continue as guest
          </button>
          {" "}(trips won't be saved)
        </p>
      </div>
    </div>
  );
}
