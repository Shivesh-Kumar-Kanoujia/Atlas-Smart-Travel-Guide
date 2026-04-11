import { useState } from "react";
import { Sparkles, Loader2, ChevronDown, ChevronUp, Trash2, Calendar, DollarSign, Lightbulb } from "lucide-react";
import { generateItinerary, clearItinerary } from "../lib/api";
import toast from "react-hot-toast";

function DayCard({ day, index }) {
  const [open, setOpen] = useState(index === 0);

  const slots = [
    { label: "Morning",   data: day.morning,   color: "bg-amber-50 border-amber-200",  dot: "bg-amber-400" },
    { label: "Afternoon", data: day.afternoon, color: "bg-ocean-50 border-ocean-100",  dot: "bg-ocean-400" },
    { label: "Evening",   data: day.evening,   color: "bg-sand-50 border-sand-200",    dot: "bg-sand-400" },
  ];

  return (
    <div className="bg-white border border-sand-200 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-sand-50 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sand-500 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
            {day.day}
          </div>
          <div className="text-left">
            <div className="font-medium text-sand-900 text-sm">{day.title}</div>
            <div className="text-xs text-sand-500">{day.theme} · {day.daily_budget}</div>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-sand-400" /> : <ChevronDown className="w-4 h-4 text-sand-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-sand-100 pt-3">
          {slots.map(({ label, data, color, dot }) => data && (
            <div key={label} className={`p-3 rounded-xl border ${color}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${dot}`} />
                <span className="text-xs font-semibold text-sand-600 uppercase tracking-wide">{label}</span>
                <span className="text-xs text-sand-400 ml-auto">{data.time}</span>
              </div>
              <div className="font-medium text-sand-900 text-sm mb-1">{data.activity}</div>
              <div className="text-xs text-sand-600 leading-relaxed mb-2">{data.description}</div>
              <div className="flex gap-3 text-xs">
                {data.tip && (
                  <span className="text-ocean-700 bg-ocean-50 border border-ocean-100 px-2 py-1 rounded-lg flex-1">
                    💡 {data.tip}
                  </span>
                )}
                {data.cost && (
                  <span className="text-sand-600 font-medium whitespace-nowrap flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />{data.cost}
                  </span>
                )}
              </div>
            </div>
          ))}

          {day.local_tip && (
            <div className="flex gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
              <Lightbulb className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-green-700 mb-1">Local insider tip</div>
                <div className="text-xs text-green-700 leading-relaxed">{day.local_tip}</div>
              </div>
            </div>
          )}

          {day.accommodation && (
            <div className="text-xs text-sand-500 bg-sand-50 p-2.5 rounded-lg">
              🏨 Stay in: <span className="text-sand-700 font-medium">{day.accommodation}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


export default function ItineraryPanel({ trip, onUpdate }) {
  const [loading, setLoading]     = useState(false);
  const [itinerary, setItinerary] = useState(trip.itinerary || []);
  const [config, setConfig]       = useState({
    mood: "adventurous",
    budget: "mid-range",
  });

  const duration = (() => {
    if (trip.start_date && trip.end_date) {
      const diff = (new Date(trip.end_date) - new Date(trip.start_date)) / (1000 * 60 * 60 * 24);
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
        notes: trip.notes || "",
        trip_id: trip.id,
      });
      setItinerary(res.data.itinerary);
      toast.success(`${res.data.days}-day itinerary generated!`);
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Generation failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!confirm("Clear this itinerary?")) return;
    await clearItinerary(trip.id);
    setItinerary([]);
    toast.success("Itinerary cleared");
    if (onUpdate) onUpdate();
  };

  const MOODS   = ["adventurous", "relaxing", "cultural", "budget", "luxury"];
  const BUDGETS = ["backpacker", "mid-range", "luxury"];

  return (
    <div>
      {/* Generate controls */}
      <div className="bg-sand-50 border border-sand-200 rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-sand-500" />
          <span className="text-sm font-medium text-sand-700">{trip.destination} · {duration} days</span>
          {itinerary.length > 0 && (
            <span className="ml-auto text-xs text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full font-medium">
              ✓ Generated
            </span>
          )}
        </div>

        <div className="flex gap-2 flex-wrap mb-3">
          {MOODS.map(m => (
            <button key={m} onClick={() => setConfig(p => ({ ...p, mood: m }))}
              className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize transition-all ${
                config.mood === m ? "bg-sand-500 text-white" : "bg-white border border-sand-200 text-sand-600 hover:bg-sand-100"
              }`}>{m}</button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap mb-4">
          {BUDGETS.map(b => (
            <button key={b} onClick={() => setConfig(p => ({ ...p, budget: b }))}
              className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize transition-all ${
                config.budget === b ? "bg-ocean-600 text-white" : "bg-white border border-sand-200 text-ocean-700 hover:bg-ocean-50"
              }`}>{b}</button>
          ))}
        </div>

        <div className="flex gap-2">
          <button onClick={handleGenerate} disabled={loading}
            className="flex-1 py-2.5 bg-sand-500 text-white rounded-xl text-sm font-medium hover:bg-sand-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating itinerary...</>
              : <><Sparkles className="w-4 h-4" /> {itinerary.length > 0 ? "Regenerate" : "Generate AI Itinerary"}</>
            }
          </button>
          {itinerary.length > 0 && (
            <button onClick={handleClear}
              className="p-2.5 border border-sand-200 text-sand-500 rounded-xl hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-all">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Days */}
      {itinerary.length > 0 ? (
        <div className="space-y-3">
          {itinerary.map((day, i) => (
            <DayCard key={i} day={day} index={i} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-sand-400">
          <Sparkles className="w-10 h-10 mx-auto mb-3 text-sand-300" />
          <p className="text-sm font-medium">No itinerary yet</p>
          <p className="text-xs mt-1">Click generate to get a day-by-day AI plan</p>
        </div>
      )}
    </div>
  );
}
