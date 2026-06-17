// @ts-nocheck
import { useState } from 'react';
import { Sparkles, Loader2, ChevronDown, ChevronUp, Trash2, Calendar, DollarSign, Lightbulb, MapPin } from 'lucide-react';
import { generateItinerary, clearItinerary } from '../lib/api';
import toast from 'react-hot-toast';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';

function DayCard({ day, index }: { day: any; index: number }) {
  const [open, setOpen] = useState(index === 0);

  const slots = [
    { label: 'Morning', data: day.morning, color: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800', dot: 'bg-amber-400' },
    { label: 'Afternoon', data: day.afternoon, color: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800', dot: 'bg-blue-400' },
    { label: 'Evening', data: day.evening, color: 'bg-secondary border-border', dot: 'bg-muted-foreground' },
  ];

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0">
            {day.day}
          </div>
          <div className="text-left">
            <div className="font-medium text-foreground text-sm">{day.title}</div>
            <div className="text-xs text-muted-foreground">
              {day.theme} &middot; {day.daily_budget}
            </div>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          {slots.map(({ label, data, color, dot }) =>
            data ? (
              <div key={label} className={`p-3 rounded-xl border ${color}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${dot}`} />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {label}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">{data.time}</span>
                </div>
                <div className="font-medium text-foreground text-sm mb-1">{data.activity}</div>
                <div className="text-xs text-muted-foreground leading-relaxed mb-2">{data.description}</div>
                <div className="flex gap-3 text-xs">
                  {data.tip && (
                    <span className="text-primary bg-primary/5 border border-primary/10 px-2 py-1 rounded-lg flex-1">
                      <Lightbulb className="w-3 h-3 inline mr-1 mb-0.5" />
                      {data.tip}
                    </span>
                  )}
                  {data.cost && (
                    <span className="text-muted-foreground font-medium whitespace-nowrap flex items-center gap-1 shrink-0">
                      <DollarSign className="w-3 h-3" />
                      {data.cost}
                    </span>
                  )}
                </div>
              </div>
            ) : null
          )}

          {day.local_tip && (
            <div className="flex gap-2 p-3 bg-forest-500/5 border border-forest-500/20 rounded-xl">
              <Lightbulb className="w-4 h-4 text-forest-500 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-forest-500 mb-1">Local insider tip</div>
                <div className="text-xs text-foreground/80 leading-relaxed">{day.local_tip}</div>
              </div>
            </div>
          )}

          {day.accommodation && (
            <div className="text-xs text-muted-foreground bg-secondary p-2.5 rounded-lg">
              <MapPin className="w-3 h-3 inline mr-1 mb-0.5" />
              Stay in: <span className="text-foreground font-medium">{day.accommodation}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ItineraryPanel({ trip, onUpdate }: { trip: any; onUpdate: () => void }) {
  const [loading, setLoading] = useState(false);
  const [itinerary, setItinerary] = useState(trip.itinerary || []);
  const [config, setConfig] = useState({
    mood: 'adventurous',
    budget: 'mid-range',
  });

  const duration = (() => {
    if (trip.start_date && trip.end_date) {
      const diff =
        (new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) /
        (1000 * 60 * 60 * 24);
      return Math.max(1, Math.min(14, Math.round(diff) + 1));
    }
    return 5;
  })();

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await generateItinerary({
        destination: trip.destination,
        days: duration,
        budget: config.budget,
        mood: config.mood,
        notes: trip.notes || '',
        trip_id: trip.id,
      });
      setItinerary(res.data.itinerary);
      toast.success(`${res.data.days}-day itinerary generated!`);
      if (onUpdate) onUpdate();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Generation failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('Clear this itinerary?')) return;
    await clearItinerary(trip.id);
    setItinerary([]);
    toast.success('Itinerary cleared');
    if (onUpdate) onUpdate();
  };

  const MOODS = ['adventurous', 'relaxing', 'cultural', 'budget', 'luxury'];
  const BUDGETS = ['backpacker', 'mid-range', 'luxury'];

  return (
    <div>
      {/* Generate controls */}
      <div className="bg-card border border-border rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            <MapPin className="w-3.5 h-3.5 inline mr-1 mb-0.5" />
            {trip.destination} &middot; {duration} days
          </span>
          {itinerary.length > 0 && (
            <Badge variant="outline" className="ml-auto text-xs px-1.5 py-0 bg-forest-500/10 text-forest-500 border-forest-500/20">
              Generated
            </Badge>
          )}
        </div>

        <div className="flex gap-2 flex-wrap mb-3">
          {MOODS.map((m) => (
            <button
              key={m}
              onClick={() => setConfig((p) => ({ ...p, mood: m }))}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium capitalize transition-all',
                config.mood === m
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent border border-border'
              )}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap mb-4">
          {BUDGETS.map((b) => (
            <button
              key={b}
              onClick={() => setConfig((p) => ({ ...p, budget: b }))}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium capitalize transition-all',
                config.budget === b
                  ? 'bg-foreground/10 text-foreground ring-1 ring-foreground/20'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent border border-border'
              )}
            >
              {b}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Button onClick={handleGenerate} disabled={loading} className="flex-1">
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Generating itinerary...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> {itinerary.length > 0 ? 'Regenerate' : 'Generate AI Itinerary'}</>
            )}
          </Button>
          {itinerary.length > 0 && (
            <Button onClick={handleClear} variant="outline" size="icon">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Days */}
      {itinerary.length > 0 ? (
        <div className="space-y-3">
          {itinerary.map((day: any, i: number) => (
            <DayCard key={i} day={day} index={i} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Sparkles className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm font-medium">No itinerary yet</p>
          <p className="text-xs mt-1">Click generate to get a day-by-day AI plan</p>
        </div>
      )}
    </div>
  );
}
