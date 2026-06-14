// @ts-nocheck
import { useState, useMemo } from 'react';
import { MapPin, Sun, CloudMoon, Sunset, DollarSign, Lightbulb, Navigation, Bed } from 'lucide-react';
import { cn } from '../lib/utils';

const DAY_COLORS = ['#378ADD', '#1D9E75', '#D85A30', '#7F77DD', '#D4537E', '#BA7517', '#1E4D8C', '#2D6A4F'];

const SLOT_CONFIG = {
  morning: { label: 'Morning', icon: Sun, dot: '#fbbf24' },
  afternoon: { label: 'Afternoon', icon: Sunset, dot: '#f97316' },
  evening: { label: 'Evening', icon: CloudMoon, dot: '#6366f1' },
};

export default function ItinerarySidebar({
  itinerary = [],
  onItemClick,
  selectedDay = null,
  selectedSlot = null,
}) {
  const [expandedDays, setExpandedDays] = useState([0]);

  const toggleDay = (dayIndex) => {
    setExpandedDays((prev) =>
      prev.includes(dayIndex)
        ? prev.filter((d) => d !== dayIndex)
        : [...prev, dayIndex]
    );
  };

  const flatItems = useMemo(() => {
    const items = [];
    itinerary.forEach((day, dayIdx) => {
      ['morning', 'afternoon', 'evening'].forEach((slot) => {
        const s = day[slot];
        if (s && (s.latitude || s.longitude)) {
          items.push({
            day,
            dayIdx,
            slot,
            ...s,
            color: DAY_COLORS[dayIdx % DAY_COLORS.length],
          });
        }
      });
    });
    return items;
  }, [itinerary]);

  if (!itinerary.length) return null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 border-b border-border shrink-0">
        <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-primary" />
          Itinerary
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5">
          {itinerary.length} day{itinerary.length > 1 ? 's' : ''} &middot; {flatItems.length} stops
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {itinerary.map((day, dayIdx) => {
          const color = DAY_COLORS[dayIdx % DAY_COLORS.length];
          const isExpanded = expandedDays.includes(dayIdx);

          const slotKeys = ['morning', 'afternoon', 'evening'].filter(
            (s) => day[s] && day[s].activity
          );

          return (
            <div key={dayIdx} className="border-b border-border last:border-b-0">
              {/* Day header */}
              <button
                onClick={() => toggleDay(dayIdx)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent/50 transition-colors text-left"
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                  style={{ backgroundColor: color }}
                >
                  {day.day}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-medium text-foreground truncate">{day.title}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{day.theme}</div>
                </div>
                <div className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-secondary shrink-0">
                  {day.daily_budget}
                </div>
              </button>

              {/* Day activities */}
              {isExpanded && (
                <div className="pb-2">
                  {slotKeys.map((slot) => {
                    const s = day[slot];
                    const cfg = SLOT_CONFIG[slot];
                    const Icon = cfg.icon;
                    const isSelected = selectedDay === dayIdx && selectedSlot === slot;
                    const hasCoords = s.latitude && s.longitude;

                    return (
                      <button
                        key={slot}
                        onClick={() => hasCoords && onItemClick && onItemClick(dayIdx, slot, s)}
                        disabled={!hasCoords}
                        className={cn(
                          'w-full flex items-start gap-2 px-3 py-1.5 transition-colors text-left',
                          isSelected
                            ? 'bg-accent border-l-2 border-l-primary'
                            : 'hover:bg-accent/30 border-l-2 border-l-transparent',
                          !hasCoords && 'opacity-50 cursor-default'
                        )}
                      >
                        <div className="flex items-center gap-1.5 pt-0.5 shrink-0">
                          <Icon className="w-3 h-3" style={{ color: cfg.dot }} />
                          <div className="w-0.5 h-4 rounded-full" style={{ backgroundColor: cfg.dot }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-medium text-foreground truncate">{s.activity}</div>
                          <div className="text-[9px] text-muted-foreground mt-0.5 line-clamp-1">{s.description}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] text-muted-foreground">{s.time}</span>
                            {s.cost && (
                              <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                                <DollarSign className="w-2.5 h-2.5" />
                                {s.cost}
                              </span>
                            )}
                            {hasCoords && (
                              <span className="text-[9px] text-primary flex items-center gap-0.5">
                                <MapPin className="w-2.5 h-2.5" />
                                View
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {/* Accommodation */}
                  {day.accommodation && (
                    <div className="flex items-start gap-2 px-3 py-1.5 opacity-60">
                      <Bed className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] text-foreground truncate">Stay: {day.accommodation}</div>
                      </div>
                    </div>
                  )}

                  {day.local_tip && (
                    <div className="mx-3 mt-1 p-1.5 bg-forest-500/5 border border-forest-500/10 rounded-lg flex gap-1.5">
                      <Lightbulb className="w-2.5 h-2.5 text-forest-500 shrink-0 mt-0.5" />
                      <div className="text-[9px] text-forest-500 leading-relaxed">{day.local_tip}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function getItineraryFlatItems(itinerary) {
  const items = [];
  itinerary.forEach((day, dayIdx) => {
    ['morning', 'afternoon', 'evening'].forEach((slot) => {
      const s = day[slot];
      if (s && s.latitude && s.longitude && s.activity) {
        items.push({
          dayIdx,
          slot,
          dayNumber: day.day,
          color: DAY_COLORS[dayIdx % DAY_COLORS.length],
          lat: s.latitude,
          lon: s.longitude,
          activity: s.activity,
          time: s.time,
          description: s.description,
          cost: s.cost,
        });
      }
    });
  });
  return items;
}
