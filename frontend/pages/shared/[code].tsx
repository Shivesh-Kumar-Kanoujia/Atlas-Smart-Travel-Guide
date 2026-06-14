import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { getSharedTrip } from '../../lib/api';
import { Loader2, MapPin, Calendar, DollarSign, Compass, Share2 } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { cn } from '../../lib/utils';

const STATUS_STYLES: Record<string, string> = {
  planned: 'bg-secondary text-secondary-foreground',
  active: 'bg-primary/10 text-primary',
  completed: 'bg-forest-500/10 text-forest-500',
  cancelled: 'bg-destructive/10 text-destructive',
};

export default function SharedTripPage() {
  const router = useRouter();
  const { code } = router.query;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) return;
    const fetchTrip = async () => {
      try {
        const res = await getSharedTrip(code as string);
        setData(res.data);
      } catch (err: any) {
        setError(err.response?.status === 410
          ? 'This share link has expired'
          : 'Trip not found or link is invalid');
      } finally {
        setLoading(false);
      }
    };
    fetchTrip();
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center p-8">
        <Compass className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h1 className="font-display text-2xl font-semibold text-foreground mb-2">
          {error || 'Trip not found'}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          The share link may have expired or the trip was deleted.
        </p>
        <Link
          href="/"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-all"
        >
          Go to Atlas
        </Link>
      </div>
    );
  }

  const { trip, sharer } = data;
  const totalExpenses = (trip.expenses || []).reduce((sum: number, ex: any) => sum + (ex.amount || 0), 0);

  return (
    <>
      <Head>
        <title>{trip.name} — Shared Trip · Atlas</title>
        <meta name="description" content={`${sharer} shared a trip to ${trip.destination} with Atlas Travel AI`} />
        <meta property="og:title" content={`${trip.name} — ${trip.destination}`} />
        <meta property="og:description" content={`${sharer} shared this trip via Atlas Travel AI`} />
        <meta name="robots" content="noindex" />
      </Head>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-card border-b border-border">
          <div className="max-w-3xl mx-auto px-4 py-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
              <Compass className="w-3.5 h-3.5 text-primary" />
              Shared via Atlas Travel AI
            </div>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="font-display text-2xl font-semibold text-foreground">{trip.name}</h1>
                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {trip.destination}
                  </span>
                  {trip.start_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(trip.start_date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                      {trip.end_date && ` - ${new Date(trip.end_date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}`}
                    </span>
                  )}
                </div>
              </div>
              <Badge variant="outline" className={cn(STATUS_STYLES[trip.status] || '')}>
                {trip.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Shared by <span className="font-medium text-foreground">{sharer}</span>
            </p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {/* Budget overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="text-xs text-muted-foreground mb-1">Budget</div>
              <div className="text-2xl font-semibold text-primary">
                ${(trip.budget || 0).toLocaleString()}
              </div>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="text-xs text-muted-foreground mb-1">Spent</div>
              <div className={cn(
                'text-2xl font-semibold',
                (trip.spent || 0) > (trip.budget || 0) ? 'text-destructive' : 'text-forest-500'
              )}>
                ${(trip.spent || 0).toLocaleString()}
              </div>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="text-xs text-muted-foreground mb-1">Expenses</div>
              <div className="text-2xl font-semibold text-foreground">
                {trip.expenses?.length || 0}
              </div>
            </div>
          </div>

          {/* Notes */}
          {trip.notes && (
            <div className="bg-secondary rounded-2xl p-4 text-sm text-foreground/80 leading-relaxed">
              {trip.notes}
            </div>
          )}

          {/* Itinerary */}
          {(trip.itinerary || []).length > 0 && (
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-3">Itinerary</h2>
              <div className="space-y-3">
                {trip.itinerary.map((day: any, i: number) => (
                  <div key={i} className="bg-card border border-border rounded-2xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                        {day.day}
                      </div>
                      <div>
                        <div className="font-medium text-foreground text-sm">{day.title}</div>
                        <div className="text-xs text-muted-foreground">{day.theme} · {day.daily_budget}</div>
                      </div>
                    </div>
                    {day.local_tip && (
                      <p className="text-xs text-forest-500 bg-forest-500/5 p-2 rounded-lg">
                        {day.local_tip}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expenses */}
          {(trip.expenses || []).length > 0 && (
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-3">
                Expenses (${totalExpenses.toLocaleString()})
              </h2>
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wide">
                      <th className="text-left py-3 px-4 font-medium">Category</th>
                      <th className="text-left py-3 px-4 font-medium">Description</th>
                      <th className="text-right py-3 px-4 font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trip.expenses.map((ex: any, i: number) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-3 px-4 text-foreground">{ex.category}</td>
                        <td className="py-3 px-4 text-muted-foreground">{ex.description}</td>
                        <td className="py-3 px-4 text-right text-foreground font-medium">
                          ${ex.amount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Packing List */}
          {(trip.packing_list || []).length > 0 && (
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-3">
                Packing List ({trip.packing_list.filter((i: any) => i.packed).length}/{trip.packing_list.length})
              </h2>
              <div className="flex flex-wrap gap-2">
                {trip.packing_list.map((it: any, i: number) => (
                  <span
                    key={i}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium border',
                      it.packed
                        ? 'bg-forest-500/10 text-forest-500 border-forest-500/20'
                        : 'bg-secondary text-secondary-foreground border-border'
                    )}
                  >
                    {it.packed ? '✓' : '○'} {it.item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="text-center py-6 text-xs text-muted-foreground border-t border-border">
            <span className="flex items-center justify-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-primary" />
              Built with Atlas Travel AI
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
