// @ts-nocheck
import { useState, useEffect } from 'react';
import { ArrowRightLeft, Loader2, AlertTriangle } from 'lucide-react';
import { convertCurrency, getCurrencies } from '../lib/api';
import toast from 'react-hot-toast';
import { Button } from './ui/button';
import { Input } from './ui/input';

const QUICK_PAIRS = [
  ['USD', 'INR'], ['EUR', 'USD'], ['GBP', 'JPY'],
  ['USD', 'THB'], ['AUD', 'EUR'], ['USD', 'JPY'],
];

export default function CurrencyConverter() {
  const [amount, setAmount] = useState(100);
  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState('INR');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currencies, setCurrencies] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    getCurrencies().then((r) => setCurrencies(r.data.currencies)).catch(() => {});
  }, []);

  const handleConvert = async () => {
    if (!amount || amount <= 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await convertCurrency(parseFloat(amount), from, to);
      setResult(res.data);
    } catch {
      toast.error('Conversion failed. Try again.');
      setError('Conversion failed. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const swap = () => {
    setFrom(to);
    setTo(from);
    setResult(null);
  };

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="mb-4">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
            Amount
          </label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="text-lg font-medium"
          />
        </div>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
              From
            </label>
            <select
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
            >
              {currencies.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <button
            onClick={swap}
            className="mt-5 p-2.5 bg-secondary hover:bg-accent rounded-xl transition-all"
          >
            <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
              To
            </label>
            <select
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
            >
              {currencies.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <Button onClick={handleConvert} disabled={loading} className="w-full">
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Converting...</>
          ) : (
            'Convert'
          )}
        </Button>

        {error && (
          <div className="mt-4 p-3 bg-destructive/10 text-destructive text-sm rounded-xl border border-destructive/20 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {result && (
          <div className="mt-5 p-5 bg-gradient-to-r from-secondary to-primary/5 border border-border rounded-xl animate-in fade-in slide-in-from-bottom-2 text-center">
            <div className="text-3xl font-display font-semibold text-foreground">
              {result.converted.toLocaleString()}{' '}
              <span className="text-muted-foreground text-xl">{result.to}</span>
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {result.amount} {result.from} = {result.converted.toLocaleString()} {result.to}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              1 {result.from} = {result.rate} {result.to}
            </div>
            {result.source === 'fallback' && (
              <div className="text-xs text-amber-600 dark:text-amber-400 mt-2 bg-amber-50 dark:bg-amber-950/30 px-3 py-1 rounded-full inline-block">
                Using offline rates
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <p className="text-xs text-muted-foreground mb-2 font-medium">Quick pairs</p>
        <div className="grid grid-cols-3 gap-2">
          {QUICK_PAIRS.map(([f, t]) => (
            <button
              key={f + t}
              onClick={() => { setFrom(f); setTo(t); setResult(null); }}
              className="p-2.5 bg-card border border-border rounded-xl text-xs text-card-foreground/70 hover:border-primary/30 hover:bg-accent/50 transition-all font-medium"
            >
              {f} → {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
