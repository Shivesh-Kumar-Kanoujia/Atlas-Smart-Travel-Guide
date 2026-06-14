// @ts-nocheck
import { useState } from 'react';
import { AlertTriangle, Phone, Loader2, Shield } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { getEmergencyInfo } from '../lib/api';
import toast from 'react-hot-toast';
import { Button } from './ui/button';
import { Input } from './ui/input';

const QUICK_COUNTRIES = [
  'United States', 'United Kingdom', 'Japan', 'Thailand', 'France',
  'India', 'Australia', 'Singapore', 'Germany', 'Italy', 'Spain', 'UAE',
];

export default function EmergencyInfo() {
  const [destination, setDestination] = useState('');
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (dest?: string) => {
    const q = (dest || destination).trim();
    if (!q) return;
    setLoading(true);
    setInfo(null);
    try {
      const res = await getEmergencyInfo(q);
      setInfo(res.data);
    } catch {
      toast.error('Failed to fetch emergency info. Check backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 flex items-start gap-3">
        <div className="w-9 h-9 bg-destructive/10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
          <Shield className="w-5 h-5 text-destructive" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">
            Critical safety info, emergency numbers, and scam warnings for any destination
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <Input
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Enter country or destination..."
          className="flex-1"
        />
        <Button
          onClick={() => handleSearch()}
          disabled={loading}
          variant="destructive"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Phone className="w-4 h-4" />
          )}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {QUICK_COUNTRIES.map((c) => (
          <button
            key={c}
            onClick={() => {
              setDestination(c);
              handleSearch(c);
            }}
            className="px-3 py-1.5 bg-card border border-border text-xs text-card-foreground/70 rounded-full hover:border-destructive/30 hover:bg-destructive/5 hover:text-destructive transition-all font-medium"
          >
            {c}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center py-12 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
          <p className="text-sm">Fetching emergency information via Groq AI...</p>
        </div>
      )}

      {info && !loading && (
        <div className="bg-card border border-destructive/20 rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 bg-destructive rounded-full" />
            <h3 className="font-display text-lg font-semibold text-destructive">
              Emergency Info: {info.destination}
            </h3>
          </div>
          <ReactMarkdown className="prose prose-sm max-w-none dark:prose-invert">
            {info.info}
          </ReactMarkdown>
          <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border">
            AI-generated information. Always verify critical details with official government travel advisories.
          </p>
        </div>
      )}

      {!info && !loading && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-5">
          <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2">
            Before you travel
          </h4>
          <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1.5">
            <li>• Save local emergency numbers offline before departure</li>
            <li>• Register with your country&apos;s embassy in the destination</li>
            <li>• Keep a digital & physical copy of your passport</li>
            <li>• Purchase comprehensive travel insurance</li>
            <li>• Share your itinerary with a trusted person at home</li>
          </ul>
        </div>
      )}
    </div>
  );
}
