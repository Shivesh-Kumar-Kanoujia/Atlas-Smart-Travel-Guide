// @ts-nocheck
import { useMemo, useRef, useEffect } from 'react';
import { Sun, Sunset, CloudMoon, MapPin, DollarSign, Navigation } from 'lucide-react';
import { cn } from '../lib/utils';

const DAY_COLORS = ['#378ADD', '#1D9E75', '#D85A30', '#7F77DD', '#D4537E', '#BA7517', '#1E4D8C', '#2D6A4F'];

const SLOT_META = {
  morning: { icon: Sun, label: 'Morning', color: '#fbbf24' },
  afternoon: { icon: Sunset, label: 'Afternoon', color: '#f97316' },
  evening: { icon: CloudMoon, label: 'Evening', color: '#6366f1' },
};

export default function TravelTimeline({
  itinerary = [],
  selectedDay = null,
  selectedSlot = null,
  onItemClick,
}) {
  const timelineRef = useRef(null);
  const activeRef = useRef(null);

  const timelineItems = useMemo(() => {
    const items = [];
    (itinerary || []).forEach((day, dayIdx) => {
      ['morning', 'afternoon', 'evening'].forEach((slot) => {
        const s = day[slot];
        if (s && s.activity) {
          items.push({
            key: `${dayIdx}-${slot}`,
            dayIdx,
            slot,
            dayNumber: day.day,
            dayTitle: day.title,
            color: DAY_COLORS[dayIdx % DAY_COLORS.length],
            time: s.time || '',
            activity: s.activity,
            description: s.description || '',
            cost: s.cost || '',
            tip: s.tip || '',
            lat: s.latitude,
            lon: s.longitude,
            hasCoords: !!(s.latitude && s.longitude),
            meta: SLOT_META[slot] || { icon: MapPin, label: slot, color: '#888' },
          });
        }
      });
    });
    return items;
  }, [itinerary]);

  // Auto-scroll to active item
  useEffect(() => {
    if (activeRef.current && timelineRef.current) {
      const container = timelineRef.current;
      const el = activeRef.current;
      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const offset = elRect.top - containerRect.top - containerRect.height / 2 + elRect.height / 2;
      container.scrollBy({ top: offset, behavior: 'smooth' });
    }
  }, [selectedDay, selectedSlot]);

  if (!timelineItems.length) return null;

  return (
    <div ref={timelineRef} className="flex flex-col h-full overflow-y-auto">
      <div className="px-4 py-3 border-b border-border shrink-0 bg-card sticky top-0 z-10">
        <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-primary" />
          Travel Timeline
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {timelineItems.length} activities across {itinerary.length} day{itinerary.length > 1 ? 's' : ''}
        </div>
      </div>

      {/* Vertical timeline */}
      <div className="relative px-4 py-3">
        {/* Vertical line */}
        <div className="absolute left-[17px] top-0 bottom-0 w-px bg-border" />

        {timelineItems.map((item, i) => {
          const Icon = item.meta.icon;
          const isActive = selectedDay === item.dayIdx && selectedSlot === item.slot;

          return (
            <div
              key={item.key}
              ref={(el) => {
                if (isActive) activeRef.current = el;
              }}
              className={cn(
                'relative flex gap-3 pb-4 last:pb-0 cursor-pointer transition-all group',
                !item.hasCoords && 'opacity-50 cursor-default'
              )}
              onClick={() => {
                if (item.hasCoords && onItemClick) {
                  onItemClick(item.dayIdx, item.slot);
                }
              }}
            >
              {/* Timeline dot */}
              <div className="relative z-10 shrink-0 mt-0.5">
                <div
                  className={cn(
                    'w-[34px] h-[34px] rounded-full flex items-center justify-center transition-all',
                    isActive
                      ? 'ring-4 ring-primary/20 scale-110'
                      : 'group-hover:scale-105'
                  )}
                  style={{ backgroundColor: isActive ? item.color : `${item.color}20` }}
                >
                  <Icon className="w-3.5 h-3.5 text-white" style={{ color: isActive ? undefined : item.color }} />
                </div>
              </div>

              {/* Content card */}
              <div className={cn(
                'flex-1 min-w-0 rounded-xl p-3 min-h-[44px] transition-all border',
                isActive
                  ? 'bg-accent border-primary/20 shadow-sm'
                  : 'bg-secondary/50 border-transparent group-hover:bg-secondary'
              )}>
                {/* Time + day badge */}
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-mono font-bold text-foreground">{item.time || '--:--'}</span>
                  <div
                    className="text-xs text-white font-semibold px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: item.color }}
                  >
                    Day {item.dayNumber}
                  </div>
                  <span className="text-xs text-muted-foreground ml-auto">{item.meta.label}</span>
                </div>

                {/* Activity name */}
                <div className="text-sm font-semibold text-foreground mb-0.5">{item.activity}</div>

                {/* Description */}
                {item.description && (
                  <div className="text-xs text-muted-foreground leading-relaxed mb-1.5 line-clamp-2">
                    {item.description}
                  </div>
                )}

                {/* Cost + tip */}
                <div className="flex items-center gap-2 flex-wrap">
                  {item.cost && (
                    <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                      <DollarSign className="w-2.5 h-2.5" />
                      {item.cost}
                    </span>
                  )}
                  {item.tip && (
                    <span className="text-xs text-muted-foreground/60 italic">💡 {item.tip}</span>
                  )}
                  {item.hasCoords && (
                    <span className="text-xs text-primary flex items-center gap-0.5 ml-auto">
                      <MapPin className="w-2.5 h-2.5" />
                      View on map
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
