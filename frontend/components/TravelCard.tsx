// @ts-nocheck
import { MapPin, Calendar, DollarSign, Trash2, Edit3 } from 'lucide-react';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { cn } from '../lib/utils';

const STATUS_CONFIG = {
  planned: { label: 'Planned', className: 'bg-secondary text-secondary-foreground' },
  active: { label: 'Active', className: 'bg-primary/10 text-primary' },
  completed: { label: 'Completed', className: 'bg-forest-500/10 text-forest-500' },
  cancelled: { label: 'Cancelled', className: 'bg-destructive/10 text-destructive' },
};

export default function TravelCard({ trip, onEdit, onDelete, onSelect }) {
  const { label, className: statusClass } = STATUS_CONFIG[trip.status] || STATUS_CONFIG.planned;
  const budgetUsed = trip.budget > 0 ? Math.min((trip.spent / trip.budget) * 100, 100) : 0;
  const isOverBudget = budgetUsed > 90;

  return (
    <div
      onClick={onSelect}
      className="bg-card border border-border rounded-2xl p-5 hover:shadow-md hover:border-primary/20 transition-all cursor-pointer group"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-foreground text-lg truncate">
            {trip.name}
          </h3>
          <div className="flex items-center gap-1.5 mt-1">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground truncate">{trip.destination}</span>
          </div>
        </div>
        <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 ml-3 shrink-0', statusClass)}>
          {label}
        </Badge>
      </div>

      {(trip.start_date || trip.end_date) && (
        <div className="flex items-center gap-1.5 mb-3 text-xs text-muted-foreground">
          <Calendar className="w-3.5 h-3.5" />
          <span>{trip.start_date || '?'} → {trip.end_date || '?'}</span>
        </div>
      )}

      {trip.budget > 0 && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              Budget
            </span>
            <span>
              ${(trip.spent || 0).toFixed(0)} / ${trip.budget.toFixed(0)}
            </span>
          </div>
          <Progress
            value={budgetUsed}
            className={cn(isOverBudget && '[&>div]:bg-destructive')}
          />
        </div>
      )}

      {trip.packing_list?.length > 0 && (
        <p className="text-xs text-muted-foreground mb-3">
          {trip.packing_list.filter((i) => i.packed).length}/{trip.packing_list.length} items packed
        </p>
      )}

      <div className="flex gap-2 mt-4 pt-3 border-t border-border">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(trip); }}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-muted-foreground bg-secondary hover:bg-accent rounded-lg transition-all"
        >
          <Edit3 className="w-3.5 h-3.5" /> Edit
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(trip.id); }}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-destructive bg-destructive/10 hover:bg-destructive/20 rounded-lg transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" /> Delete
        </button>
      </div>
    </div>
  );
}
