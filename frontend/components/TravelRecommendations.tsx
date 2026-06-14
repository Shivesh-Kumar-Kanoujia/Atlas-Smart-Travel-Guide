// @ts-nocheck
import { useMemo, useState } from 'react';
import { Lightbulb, Sun, CloudMoon, Umbrella, Sun as SunHigh, DollarSign, Navigation } from 'lucide-react';

const RECOMMENDATIONS = [
  {
    id: 'sunset',
    icon: CloudMoon,
    color: '#7C3AED',
    bg: '#f5f3ff',
    title: 'Best sunset spots nearby',
    description: 'Head to a viewpoint or rooftop cafe to catch golden hour around your destination.',
  },
  {
    id: 'morning',
    icon: Sun,
    color: '#f59e0b',
    bg: '#fffbeb',
    title: 'Early bird tips',
    description: 'Popular attractions are less crowded right after opening. Plan to arrive early.',
  },
  {
    id: 'budget',
    icon: DollarSign,
    color: '#059669',
    bg: '#ecfdf5',
    title: 'Budget-friendly dining',
    description: 'Eat where locals eat — street food and neighbourhood restaurants offer the best value.',
  },
  {
    id: 'walk',
    icon: Navigation,
    color: '#2563eb',
    bg: '#eff6ff',
    title: 'Walkable routes',
    description: 'Many city centres are best explored on foot. Download offline maps before you go.',
  },
  {
    id: 'weather',
    icon: Umbrella,
    color: '#dc2626',
    bg: '#fef2f2',
    title: 'Weather-wise travel',
    description: 'Check the forecast and plan indoor activities for rainy afternoons.',
  },
];

const WEATHER_RECS = {
  clear: {
    icon: SunHigh,
    color: '#f59e0b',
    title: 'Perfect weather for exploring',
    description: 'Clear skies — ideal for outdoor attractions and walking tours.',
  },
  rain: {
    icon: Umbrella,
    color: '#2563eb',
    title: 'Rainy day activities',
    description: 'Great time to visit museums, indoor markets, and try local cafes.',
  },
  cloudy: {
    icon: CloudMoon,
    color: '#6b7280',
    title: 'Comfortable for sightseeing',
    description: 'Overcast but pleasant — perfect for long walks without the heat.',
  },
};

export default function TravelRecommendations({ places = [], weather = null }) {
  const [dismissed, setDismissed] = useState(new Set());

  const activeRecs = useMemo(() => {
    const recs = [...RECOMMENDATIONS];

    // Add weather-based recommendation
    if (weather) {
      const desc = (weather.description || '').toLowerCase();
      let wRec = null;
      if (desc.includes('clear') || desc.includes('sun')) wRec = WEATHER_RECS.clear;
      else if (desc.includes('rain') || desc.includes('drizzle') || desc.includes('thunder')) wRec = WEATHER_RECS.rain;
      else wRec = WEATHER_RECS.cloudy;

      if (wRec) {
        recs.unshift({ id: 'weather-tip', ...wRec });
      }
    }

    // Add budget tip if we have places with cost data
    const hasCostData = places.some((p) => p.cost);
    if (hasCostData && !recs.some((r) => r.id === 'budget')) {
      const avgCost = places
        .filter((p) => p.cost)
        .reduce((sum, p) => sum + (parseFloat(p.cost) || 0), 0) / places.filter((p) => p.cost).length;
      if (avgCost > 0) {
        recs.push({
          id: 'avg-cost',
          icon: DollarSign,
          color: '#059669',
          bg: '#ecfdf5',
          title: avgCost > 50 ? 'Premium destination' : 'Budget-friendly area',
          description: avgCost > 50
            ? 'This area tends to be pricier. Look for nearby neighbourhoods for budget options.'
            : `Most places here cost around $${Math.round(avgCost)}. Great for budget-conscious travellers.`,
        });
      }
    }

    return recs.filter((r) => !dismissed.has(r.id));
  }, [places, weather, dismissed]);

  if (!activeRecs.length) return null;

  return (
    <div className="px-3 py-2 border-b border-border">
      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
        <Lightbulb className="w-3 h-3" />
        Travel Tips
      </div>
      <div className="space-y-1.5">
        {activeRecs.map((rec) => (
          <div
            key={rec.id}
            className="rounded-lg p-2 flex items-start gap-2 relative group"
            style={{ backgroundColor: rec.bg }}
          >
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
              style={{ backgroundColor: `${rec.color}20` }}
            >
              <rec.icon className="w-3 h-3" style={{ color: rec.color }} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold" style={{ color: rec.color }}>
                {rec.title}
              </div>
              <div className="text-[9px] text-muted-foreground leading-relaxed mt-0.5">
                {rec.description}
              </div>
            </div>
            <button
              onClick={() => setDismissed((prev) => new Set(prev).add(rec.id))}
              className="absolute top-1 right-1 text-muted-foreground/40 hover:text-muted-foreground text-[9px] opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
