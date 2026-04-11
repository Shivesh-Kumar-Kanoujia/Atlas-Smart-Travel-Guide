import { MapPin, Calendar, DollarSign, Trash2, Edit3 } from "lucide-react";

const STATUS_CONFIG = {
  planned:   { label:"Planned",   color:"bg-blue-100 text-blue-700" },
  active:    { label:"Active",    color:"bg-green-100 text-green-700" },
  completed: { label:"Completed", color:"bg-sand-100 text-sand-700" },
  cancelled: { label:"Cancelled", color:"bg-red-100 text-red-600" },
};

export default function TravelCard({ trip, onEdit, onDelete, onSelect }) {
  const { label, color } = STATUS_CONFIG[trip.status] || STATUS_CONFIG.planned;
  const budgetUsed = trip.budget > 0 ? Math.min((trip.spent / trip.budget) * 100, 100) : 0;
  const barColor = budgetUsed > 90 ? "bg-red-500" : budgetUsed > 70 ? "bg-yellow-500" : "bg-green-500";

  return (
    <div onClick={onSelect}
      className="bg-white border border-sand-200 rounded-2xl p-5 hover:shadow-md hover:border-sand-300 transition-all cursor-pointer group">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-sand-900 text-lg truncate">{trip.name}</h3>
          <div className="flex items-center gap-1.5 mt-1">
            <MapPin className="w-3.5 h-3.5 text-sand-400 flex-shrink-0" />
            <span className="text-sm text-sand-600 truncate">{trip.destination}</span>
          </div>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ml-3 flex-shrink-0 ${color}`}>{label}</span>
      </div>

      {(trip.start_date || trip.end_date) && (
        <div className="flex items-center gap-1.5 mb-3 text-xs text-sand-500">
          <Calendar className="w-3.5 h-3.5" />
          <span>{trip.start_date || "?"} → {trip.end_date || "?"}</span>
        </div>
      )}

      {trip.budget > 0 && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-sand-500 mb-1.5">
            <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />Budget</span>
            <span>${(trip.spent || 0).toFixed(0)} / ${trip.budget.toFixed(0)}</span>
          </div>
          <div className="h-1.5 bg-sand-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width:`${budgetUsed}%` }} />
          </div>
        </div>
      )}

      {trip.packing_list?.length > 0 && (
        <p className="text-xs text-sand-500 mb-3">🎒 {trip.packing_list.filter(i=>i.packed).length}/{trip.packing_list.length} items packed</p>
      )}

      <div className="flex gap-2 mt-4 pt-3 border-t border-sand-100">
        <button onClick={e => { e.stopPropagation(); onEdit(trip); }}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-sand-600 bg-sand-50 hover:bg-sand-100 rounded-lg transition-all">
          <Edit3 className="w-3.5 h-3.5" /> Edit
        </button>
        <button onClick={e => { e.stopPropagation(); onDelete(trip.id); }}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-all">
          <Trash2 className="w-3.5 h-3.5" /> Delete
        </button>
      </div>
    </div>
  );
}
