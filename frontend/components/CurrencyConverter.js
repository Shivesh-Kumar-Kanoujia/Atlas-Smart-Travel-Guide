import { useState, useEffect } from "react";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { convertCurrency, getCurrencies } from "../lib/api";
import toast from "react-hot-toast";

const QUICK_PAIRS = [["USD","INR"],["EUR","USD"],["GBP","JPY"],["USD","THB"],["AUD","EUR"],["USD","JPY"]];

export default function CurrencyConverter() {
  const [amount, setAmount] = useState(100);
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("INR");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currencies, setCurrencies] = useState([]);

  useEffect(() => {
    getCurrencies().then(r => setCurrencies(r.data.currencies)).catch(() => {});
  }, []);

  const handleConvert = async () => {
    if (!amount || amount <= 0) return;
    setLoading(true);
    try {
      const res = await convertCurrency(parseFloat(amount), from, to);
      setResult(res.data);
    } catch (err) {
      toast.error("Conversion failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const swap = () => { setFrom(to); setTo(from); setResult(null); };

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h2 className="font-display text-2xl font-semibold text-sand-900 mb-1">Currency Converter</h2>
        <p className="text-sand-500 text-sm">Quick conversion for your travel budget</p>
      </div>

      <div className="bg-white border border-sand-200 rounded-2xl p-6 shadow-sm">
        <div className="mb-4">
          <label className="text-xs font-medium text-sand-500 uppercase tracking-wide mb-1.5 block">Amount</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
            className="w-full px-4 py-3 bg-sand-50 border border-sand-200 rounded-xl text-lg font-medium text-sand-900 outline-none focus:border-sand-400 transition-all" />
        </div>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1">
            <label className="text-xs font-medium text-sand-500 uppercase tracking-wide mb-1.5 block">From</label>
            <select value={from} onChange={e => setFrom(e.target.value)}
              className="w-full px-4 py-3 bg-sand-50 border border-sand-200 rounded-xl text-sm font-medium text-sand-900 outline-none focus:border-sand-400">
              {currencies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button onClick={swap} className="mt-5 p-3 bg-sand-100 hover:bg-sand-200 rounded-xl transition-all">
            <ArrowRightLeft className="w-4 h-4 text-sand-600" />
          </button>
          <div className="flex-1">
            <label className="text-xs font-medium text-sand-500 uppercase tracking-wide mb-1.5 block">To</label>
            <select value={to} onChange={e => setTo(e.target.value)}
              className="w-full px-4 py-3 bg-sand-50 border border-sand-200 rounded-xl text-sm font-medium text-sand-900 outline-none focus:border-sand-400">
              {currencies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <button onClick={handleConvert} disabled={loading}
          className="w-full py-3 bg-sand-500 text-white rounded-xl font-medium hover:bg-sand-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Converting...</> : "Convert"}
        </button>

        {result && (
          <div className="mt-5 p-5 bg-gradient-to-r from-sand-50 to-ocean-50 border border-sand-200 rounded-xl animate-slide-up text-center">
            <div className="text-3xl font-display font-semibold text-sand-900">
              {result.converted.toLocaleString()} <span className="text-sand-500 text-xl">{result.to}</span>
            </div>
            <div className="text-sm text-sand-500 mt-1">{result.amount} {result.from} = {result.converted.toLocaleString()} {result.to}</div>
            <div className="text-xs text-sand-400 mt-1">1 {result.from} = {result.rate} {result.to}</div>
            {result.source === "fallback" && (
              <div className="text-xs text-amber-500 mt-2 bg-amber-50 px-3 py-1 rounded-full inline-block">⚠️ Using offline rates — add EXCHANGE_API_KEY for live rates</div>
            )}
          </div>
        )}
      </div>

      <div className="mt-4">
        <p className="text-xs text-sand-400 mb-2 font-medium">Quick pairs</p>
        <div className="grid grid-cols-3 gap-2">
          {QUICK_PAIRS.map(([f, t]) => (
            <button key={f+t} onClick={() => { setFrom(f); setTo(t); setResult(null); }}
              className="p-2.5 bg-white border border-sand-200 rounded-xl text-xs text-sand-600 hover:border-sand-400 hover:bg-sand-50 transition-all font-medium">
              {f} → {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
