import { useState } from "react";
import { AlertTriangle, Phone, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { getEmergencyInfo } from "../lib/api";
import toast from "react-hot-toast";

const QUICK_COUNTRIES = ["United States","United Kingdom","Japan","Thailand","France","India","Australia","Singapore","Germany","Italy","Spain","UAE"];

export default function EmergencyInfo() {
  const [destination, setDestination] = useState("");
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (dest) => {
    const q = (dest || destination).trim();
    if (!q) return;
    setLoading(true);
    setInfo(null);
    try {
      const res = await getEmergencyInfo(q);
      setInfo(res.data);
    } catch {
      toast.error("Failed to fetch emergency info. Check backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 flex items-start gap-3">
        <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
          <AlertTriangle className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h2 className="font-display text-2xl font-semibold text-sand-900">Emergency Information</h2>
          <p className="text-sand-500 text-sm">Critical safety info, emergency numbers, and scam warnings for any destination</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <input value={destination} onChange={e => setDestination(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSearch()}
          placeholder="Enter country or destination..."
          className="flex-1 px-4 py-3 bg-white border border-sand-200 rounded-xl text-sm outline-none focus:border-red-300 transition-all" />
        <button onClick={() => handleSearch()} disabled={loading}
          className="px-5 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-50 transition-all flex items-center gap-2 font-medium">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {QUICK_COUNTRIES.map(c => (
          <button key={c} onClick={() => { setDestination(c); handleSearch(c); }}
            className="px-3 py-1.5 bg-white border border-sand-200 text-xs text-sand-600 rounded-full hover:border-red-300 hover:bg-red-50 hover:text-red-600 transition-all font-medium">
            {c}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center py-12 text-sand-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
          <p className="text-sm">Fetching emergency information via Groq AI...</p>
        </div>
      )}

      {info && !loading && (
        <div className="bg-white border border-red-200 rounded-2xl p-6 animate-slide-up shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <h3 className="font-display text-lg font-semibold text-red-700">Emergency Info: {info.destination}</h3>
          </div>
          <ReactMarkdown className="prose prose-sm max-w-none text-sand-700">{info.info}</ReactMarkdown>
          <p className="text-xs text-sand-400 mt-4 pt-4 border-t border-sand-100">
            ⚠️ AI-generated information. Always verify critical details with official government travel advisories.
          </p>
        </div>
      )}

      {!info && !loading && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <h4 className="text-sm font-semibold text-amber-800 mb-2">📌 Before you travel</h4>
          <ul className="text-sm text-amber-700 space-y-1.5">
            <li>• Save local emergency numbers offline before departure</li>
            <li>• Register with your country's embassy in the destination</li>
            <li>• Keep a digital & physical copy of your passport</li>
            <li>• Purchase comprehensive travel insurance</li>
            <li>• Share your itinerary with a trusted person at home</li>
          </ul>
        </div>
      )}
    </div>
  );
}
