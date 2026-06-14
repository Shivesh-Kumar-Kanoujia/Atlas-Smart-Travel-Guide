// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { X, Mail, Lock, User, Loader2, Eye, EyeOff } from 'lucide-react';
import { registerUser, loginUser, googleAuth } from '../lib/api';
import { useAuth } from '../lib/auth';
import toast from 'react-hot-toast';
import { Button } from './ui/button';
import { Input } from './ui/input';

const GOOGLE_CLIENT_ID =
  typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '' : '';

export default function AuthModal({ onClose }: { onClose: () => void }) {
  const { saveAuth } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus trap
  useEffect(() => {
    const prev = document.activeElement;
    const timer = setTimeout(() => {
      const first = modalRef.current?.querySelector('input, button, [tabindex]:not([tabindex="-1"])');
      if (first) (first as HTMLElement).focus();
    }, 50);
    return () => {
      clearTimeout(timer);
      if (prev && 'focus' in prev) (prev as HTMLElement).focus();
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !modalRef.current) return;
      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'input, button, [href], select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleGoogleResponse = async (credential: string) => {
    setLoading(true);
    try {
      const res = await googleAuth({ google_id_token: credential });
      saveAuth(res.data.token, res.data.user);
      toast.success(`Welcome, ${res.data.user.name}!`);
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || typeof window === 'undefined') return;
    const initGoogle = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (res: any) => res?.credential && handleGoogleResponse(res.credential),
        });
        if (googleBtnRef.current) {
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'outline',
            size: 'large',
            width: '100%',
            text: 'signin_with',
            shape: 'rectangular',
            logo_alignment: 'left',
          });
        }
      }
    };
    if (window.google?.accounts?.id) {
      initGoogle();
    } else {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      s.onload = initGoogle;
      document.head.appendChild(s);
      return () => s.remove();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async () => {
    if (!form.email || !form.password) return toast.error('Fill in all fields');
    if (mode === 'register' && !form.name) return toast.error('Enter your name');
    setLoading(true);
    try {
      const fn = mode === 'login' ? loginUser : registerUser;
      const res = await fn(form);
      saveAuth(res.data.token, res.data.user);
      toast.success(
        mode === 'login'
          ? `Welcome back, ${res.data.user.name}!`
          : `Welcome to Atlas, ${res.data.user.name}!`
      );
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div ref={modalRef} className="bg-card rounded-2xl p-7 w-full max-w-sm mx-4 shadow-2xl border border-border animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 id="auth-modal-title" className="font-display text-xl font-semibold text-foreground">
              {mode === 'login' ? 'Welcome back' : 'Create account'}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {mode === 'login' ? 'Sign in to access your trips' : 'Start planning smarter'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-accent rounded-lg transition-all"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-3">
          {mode === 'register' && (
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Full name"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                className="pl-10"
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="email"
              placeholder="Email address"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className="pl-10"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type={showPass ? 'text' : 'password'}
              placeholder="Password"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className="pl-10 pr-10"
            />
            <button
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {GOOGLE_CLIENT_ID && (
          <div className="mt-4">
            <div className="relative mb-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-2 text-muted-foreground">or continue with</span>
              </div>
            </div>
            <div ref={googleBtnRef} className="flex justify-center" />
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full mt-5"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> {mode === 'login' ? 'Signing in...' : 'Creating account...'}</>
          ) : (
            mode === 'login' ? 'Sign in' : 'Create account'
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground mt-4">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="text-foreground font-medium hover:text-primary underline"
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>

        <p className="text-center text-xs text-muted-foreground mt-3">
          or{' '}
          <button onClick={onClose} className="underline hover:text-foreground">
            continue as guest
          </button>
          {' '}(trips won&apos;t be saved)
        </p>
      </div>
    </div>
  );
}
