import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { getRecommendations, type Recommendation } from '../lib/api';
import toast from 'react-hot-toast';
import { Sparkles, MapPin, Loader2, RefreshCw, DollarSign, Clock, Star } from 'lucide-react';
import { Badge } from './ui/badge';

export default function RecommendationsPanel() {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fetchRecommendations = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const { data } = await getRecommendations();
      setRecommendations(data.recommendations);
      setLoaded(true);
    } catch (err: any) {
      console.error('Recommendations failed:', err);
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail || err?.message || 'Failed to get recommendations';
      if (err.__isRateLimited || status === 429) {
        const wait = err.__retryAfter || 60;
        toast.error(`Too many requests. Please wait ${wait} seconds.`);
      } else if (status === 503) {
        toast.error('AI service unavailable. Please try again later.');
      } else if (status === 500) {
        toast.error(`Server error: ${detail}`);
      } else if (status === 401) {
        toast.error('Please sign in again to get recommendations.');
      } else {
        toast.error(detail);
      }
      setLoaded(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && !loaded) {
      fetchRecommendations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Recommended for You
          </h2>
          <p className="text-sm text-muted-foreground">AI-powered destinations based on your preferences</p>
        </div>
        <button
          onClick={fetchRecommendations}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (loaded ? <RefreshCw className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />)}
          {loaded ? 'Refresh' : 'Get Recommendations'}
        </button>
      </div>

      {!user && !loaded && (
        <div className="text-center py-12 text-muted-foreground">
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Sign in to get personalized travel recommendations</p>
        </div>
      )}

      {user && !loaded && !loading && (
        <div className="text-center py-12">
          <MapPin className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground mb-4">Discover your next adventure based on your travel style</p>
          <button
            onClick={fetchRecommendations}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Get Personalized Recommendations
          </button>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {loaded && recommendations.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No recommendations available. Try updating your preferences first.</p>
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {recommendations.map((rec, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-card p-4 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <h3 className="font-semibold text-foreground text-sm">{rec.destination}</h3>
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-yellow-600 dark:text-yellow-400">
                  <Star className="w-3 h-3 fill-current" />
                  {rec.match_score}
                </div>
              </div>

              <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{rec.why_it_matches}</p>

              <div className="flex flex-wrap gap-3 mb-3">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {rec.best_time_to_visit}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <DollarSign className="w-3 h-3" />
                  {rec.estimated_budget_per_day}
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {rec.highlights.map((h, j) => (
                  <Badge key={j} variant="secondary" className="text-xs">
                    {h}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
