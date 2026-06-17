// @ts-nocheck
import { useState, useEffect, useMemo } from 'react';
import {
  Compass, Plane, MapPin, Calendar, Wallet, TrendingUp,
  CloudSun, ShieldAlert, MessageSquare, Star, ArrowRight,
  Sparkles, Loader2, Search, X, LogIn, ChevronRight, User,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import {
  getTrips, getAnalyticsOverview, getWeather, getWeatherByCoords,
  getRecommendations, listConversations, getEmergencyNumbers,
} from '../lib/api';
import { cn } from '../lib/utils';

const SAFETY_TIPS = [
  'Save local emergency numbers before you travel.',
  'Share your itinerary with a friend or family member.',
  'Keep digital and physical copies of your passport.',
  'Register with your embassy when traveling abroad.',
  'Learn a few basic phrases in the local language.',
  'Keep a backup payment method separate from your main wallet.',
  'Check travel advisories for your destination before booking.',
  'Take photos of your luggage before checking it in.',
  'Download offline maps before you arrive.',
  'Keep emergency cash in a hidden money belt.',
];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function useRotatingTip(): string {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setIdx((i) => (i + 1) % SAFETY_TIPS.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);
  return SAFETY_TIPS[idx];
}

function StatCard({
  label, value, icon: Icon, color,
}: {
  label: string; value: string | number; icon: typeof Compass; color: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', color)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground truncate">{label}</div>
          <div className="text-xl font-semibold text-foreground">{value}</div>
        </div>
      </div>
    </div>
  );
}

function TripCard({
  trip, onView,
}: {
  trip: any; onView: () => void;
}) {
  const spent = trip.spent || 0;
  const budget = trip.budget || 0;
  const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const statusColor =
    trip.status === 'active' ? 'bg-forest-500' :
    trip.status === 'planned' ? 'bg-blue-500' : 'bg-muted-foreground';
  return (
    <button
      onClick={onView}
      className="w-full text-left bg-card border border-border rounded-2xl p-4 hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-semibold text-foreground text-sm">{trip.destination || trip.name}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            <Calendar className="w-3 h-3 inline mr-1" />
            {trip.start_date || 'TBD'} – {trip.end_date || 'TBD'}
          </div>
        </div>
        <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full text-white', statusColor)}>
          {trip.status}
        </span>
      </div>
      {budget > 0 && (
        <div className="mt-2">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>${spent.toLocaleString()} spent</span>
            <span>${budget.toLocaleString()} budget</span>
          </div>
          <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', pct > 80 ? 'bg-destructive' : 'bg-forest-500')}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
    </button>
  );
}

function SafetyTipBanner() {
  const tip = useRotatingTip();
  return (
    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-3 flex items-start gap-3">
      <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
      <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">{tip}</p>
    </div>
  );
}

function RecommendationCard({ rec, onViewAll }: { rec: any; onViewAll: () => void }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
        <span className="text-xs font-medium text-muted-foreground">Top Pick</span>
      </div>
      <div className="font-semibold text-foreground text-sm mb-1">{rec.destination}</div>
      <div className="text-xs text-muted-foreground mb-2 line-clamp-2">{rec.why_it_matches}</div>
      {rec.match_score && (
        <div className="flex items-center gap-1.5 mb-2">
          <div className="text-xs font-medium text-forest-600 dark:text-forest-400">{rec.match_score}% match</div>
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={cn('w-3 h-3', i < Math.round(rec.match_score / 20) ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground/30')}
              />
            ))}
          </div>
        </div>
      )}
      {rec.highlights?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {rec.highlights.slice(0, 3).map((h: string) => (
            <span key={h} className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">
              {h}
            </span>
          ))}
        </div>
      )}
      <button
        onClick={onViewAll}
        className="text-xs text-primary font-medium hover:underline mt-1 inline-flex items-center gap-1"
      >
        View all recommendations <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  );
}

function WeatherDisplay({ city, temp, icon, description }: { city: string; temp: number; icon: string; description: string }) {
  return (
    <div className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3">
      <div className="text-2xl">{temp}°</div>
      <div className="min-w-0">
        <div className="text-xs font-medium text-foreground">{city}</div>
        <div className="text-[11px] text-muted-foreground capitalize">{description}</div>
      </div>
    </div>
  );
}

export default function DashboardHome({ onNavigate }: { onNavigate: (tab: string, extra?: any) => void }) {
  const { user, loading: authLoading } = useAuth();
  const [greeting] = useState(getGreeting);
  const [analytics, setAnalytics] = useState<any>(null);
  const [trips, setTrips] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [weather, setWeather] = useState<{ city: string; temp: number; icon: string; description: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Anonymous mode state
  const [searchCity, setSearchCity] = useState('');
  const [searchWeather, setSearchWeather] = useState<any>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [emergencyCountry, setEmergencyCountry] = useState('');
  const [emergencyNumbers, setEmergencyNumbers] = useState<any>(null);
  const [anonRecs, setAnonRecs] = useState<any[]>([]);

  const isAuthenticated = !!user;

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      fetchAnonData();
      setLoading(false);
      return;
    }
    fetchAll();
  }, [user, authLoading]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [analyticsRes, tripsRes, recsRes, convsRes] = await Promise.allSettled([
        getAnalyticsOverview(),
        getTrips(),
        getRecommendations(),
        listConversations(),
      ]);

      if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value.data);
      if (tripsRes.status === 'fulfilled') setTrips(tripsRes.value.data || []);
      if (recsRes.status === 'fulfilled') setRecommendations(recsRes.value.data?.recommendations || []);
      if (convsRes.status === 'fulfilled') setConversations(convsRes.value.data?.conversations || []);

      // Weather from the first trip with coords
      const tripsData = tripsRes.status === 'fulfilled' ? (tripsRes.value.data || []) : [];
      const tripWithCoords = tripsData.find((t: any) => t.latitude && t.longitude);
      if (tripWithCoords) {
        try {
          const w = await getWeatherByCoords(tripWithCoords.latitude, tripWithCoords.longitude);
          setWeather(w.data);
        } catch {}
      }
    } catch {}
    setLoading(false);
  };

  const fetchAnonData = async () => {
    try {
      const recsRes = await getRecommendations();
      setAnonRecs(recsRes.data?.recommendations || []);
    } catch {}
    // Default emergency country
    setEmergencyCountry('US');
    try {
      const nums = await getEmergencyNumbers('US');
      setEmergencyNumbers(nums.data);
    } catch {}
  };

  const handleSearchWeather = async () => {
    if (!searchCity.trim()) return;
    setSearchLoading(true);
    setSearchError('');
    try {
      const res = await getWeather(searchCity.trim());
      setSearchWeather(res.data);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setSearchError('City not found');
      } else {
        setSearchError('Could not load weather');
      }
      setSearchWeather(null);
    }
    setSearchLoading(false);
  };

  const handleEmergencyCountryChange = async (code: string) => {
    setEmergencyCountry(code);
    try {
      const res = await getEmergencyNumbers(code);
      setEmergencyNumbers(res.data);
    } catch {}
  };

  const upcomingTrips = useMemo(
    () => trips.filter((t) => t.status === 'active' || t.status === 'planned').slice(0, 2),
    [trips],
  );

  const topRec = recommendations[0] || anonRecs[0];

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* ── Welcome / Hero ── */}
      {isAuthenticated ? (
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-xl font-semibold text-foreground">
              {greeting}, {user?.name?.split(' ')[0] || 'Traveler'}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Here&apos;s your travel overview</p>
          </div>
          {weather && (
            <WeatherDisplay
              city={weather.city}
              temp={weather.temperature}
              icon={weather.icon}
              description={weather.description}
            />
          )}
        </div>
      ) : (
        <div className="bg-gradient-to-br from-forest-500/10 via-primary/5 to-blue-500/10 border border-border rounded-3xl p-6 md:p-8 text-center">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Compass className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-1">
            Plan smarter. Travel further.
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
            AI-powered travel companion — plan trips, track budgets, get recommendations, and stay safe anywhere.
          </p>
          <button
            onClick={() => onNavigate('chat')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Get Started
          </button>
        </div>
      )}

      {/* ── Stats (authenticated only) ── */}
      {isAuthenticated && analytics && analytics.trips_count > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Trips" value={analytics.trips_count} icon={Plane} color="text-primary bg-primary/10" />
          <StatCard label="Total Budget" value={`$${(analytics.total_budget || 0).toLocaleString()}`} icon={Wallet} color="text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-950/30" />
          <StatCard label="Total Spent" value={`$${(analytics.total_spent || 0).toLocaleString()}`} icon={TrendingUp} color="text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-950/30" />
          <StatCard label="Avg / Trip" value={`$${(analytics.avg_spent_per_trip || 0).toLocaleString()}`} icon={TrendingUp} color="text-forest-600 bg-forest-100 dark:text-forest-400 dark:bg-forest-950/30" />
        </div>
      )}

      {/* ── Loading state ── */}
      {isAuthenticated && loading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Upcoming / Active Trips */}
        {isAuthenticated && (
          <>
            <div className="space-y-3">
              <h2 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                {upcomingTrips.length > 0 ? 'Upcoming Trips' : 'Your Trips'}
              </h2>
              {upcomingTrips.length > 0 ? (
                upcomingTrips.map((t) => (
                  <TripCard key={t.id} trip={t} onView={() => onNavigate('trips', t.id)} />
                ))
              ) : (
                <div className="bg-card border border-border rounded-2xl p-5 text-center">
                  <Plane className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No trips yet</p>
                  <button
                    onClick={() => onNavigate('trips')}
                    className="mt-2 text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
                  >
                    Create your first trip <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Top Recommendation */}
            <div className="space-y-3">
              <h2 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Recommended
              </h2>
              {topRec ? (
                <RecommendationCard rec={topRec} onViewAll={() => onNavigate('preferences')} />
              ) : (
                !loading && (
                  <div className="bg-card border border-border rounded-2xl p-5 text-center">
                    <Star className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No recommendations yet</p>
                    <button
                      onClick={() => onNavigate('preferences')}
                      className="mt-2 text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
                    >
                      Set your preferences <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )
              )}
            </div>

            {/* Recent Conversations */}
            <div className="space-y-3">
              <h2 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                Recent Chats
              </h2>
              {conversations.length > 0 ? (
                conversations.slice(0, 3).map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => onNavigate('chat', conv.id)}
                    className="w-full text-left bg-card border border-border rounded-xl p-3 hover:bg-accent/50 transition-colors"
                  >
                    <div className="text-sm font-medium text-foreground truncate">{conv.title}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(conv.updated_at || conv.created_at).toLocaleDateString()}
                    </div>
                  </button>
                ))
              ) : (
                !loading && (
                  <div className="bg-card border border-border rounded-2xl p-5 text-center">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No conversations yet</p>
                    <button
                      onClick={() => onNavigate('chat')}
                      className="mt-2 text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
                    >
                      Start a chat <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )
              )}
            </div>
          </>
        )}

        {/* Anonymous sections */}
        {!isAuthenticated && (
          <>
            {/* Weather Search */}
            <div className="space-y-3">
              <h2 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
                <CloudSun className="w-4 h-4 text-primary" />
                Check Weather
              </h2>
              <div className="bg-card border border-border rounded-2xl p-4">
                <div className="flex gap-2">
                  <input
                    value={searchCity}
                    onChange={(e) => setSearchCity(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchWeather()}
                    placeholder="Enter city name..."
                    className="flex-1 text-sm bg-secondary rounded-lg px-3 py-2 border border-border outline-none placeholder:text-muted-foreground/60"
                  />
                  <button
                    onClick={handleSearchWeather}
                    disabled={searchLoading}
                    className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50"
                  >
                    {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </button>
                </div>
                {searchError && <p className="text-xs text-destructive mt-2">{searchError}</p>}
                {searchWeather && (
                  <div className="mt-3 flex items-center gap-3 bg-secondary/50 rounded-xl px-3 py-2.5">
                    <span className="text-2xl">{searchWeather.temperature}°</span>
                    <div>
                      <div className="text-sm font-medium text-foreground">{searchWeather.city}</div>
                      <div className="text-xs text-muted-foreground capitalize">{searchWeather.description}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Emergency Quick Access */}
            <div className="space-y-3">
              <h2 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-primary" />
                Emergency Numbers
              </h2>
              <div className="bg-card border border-border rounded-2xl p-4">
                <select
                  value={emergencyCountry}
                  onChange={(e) => handleEmergencyCountryChange(e.target.value)}
                  className="w-full text-sm bg-secondary rounded-lg px-3 py-2 border border-border outline-none mb-2"
                >
                  <option value="US">United States</option>
                  <option value="GB">United Kingdom</option>
                  <option value="IN">India</option>
                  <option value="JP">Japan</option>
                  <option value="FR">France</option>
                  <option value="DE">Germany</option>
                  <option value="IT">Italy</option>
                  <option value="ES">Spain</option>
                  <option value="AU">Australia</option>
                  <option value="CA">Canada</option>
                  <option value="BR">Brazil</option>
                  <option value="MX">Mexico</option>
                </select>
                {emergencyNumbers?.numbers && (
                  <div className="space-y-1.5">
                    {emergencyNumbers.numbers.police && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Police</span>
                        <span className="font-medium text-foreground">{emergencyNumbers.numbers.police}</span>
                      </div>
                    )}
                    {emergencyNumbers.numbers.ambulance && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Ambulance</span>
                        <span className="font-medium text-foreground">{emergencyNumbers.numbers.ambulance}</span>
                      </div>
                    )}
                    {emergencyNumbers.numbers.fire && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Fire</span>
                        <span className="font-medium text-foreground">{emergencyNumbers.numbers.fire}</span>
                      </div>
                    )}
                  </div>
                )}
                <button
                  onClick={() => onNavigate('emergency')}
                  className="mt-2 text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
                >
                  More safety info <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Anonymous Recommendation */}
            <div className="space-y-3">
              <h2 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                AI Travel Pick
              </h2>
              {topRec ? (
                <RecommendationCard rec={topRec} onViewAll={() => onNavigate('preferences')} />
              ) : (
                <div className="bg-card border border-border rounded-2xl p-5 text-center">
                  <p className="text-sm text-muted-foreground">Sign in for personalized recommendations</p>
                </div>
              )}
            </div>

            {/* Sign In prompt */}
            <div className="space-y-3">
              <h2 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Account
              </h2>
              <div className="bg-card border border-border rounded-2xl p-5 text-center">
                <LogIn className="w-8 h-8 mx-auto mb-2 text-primary/60" />
                <p className="text-sm text-foreground font-medium mb-1">Sign in to unlock everything</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Save trips, track budgets, get AI recommendations, and more.
                </p>
                <button
                  onClick={() => onNavigate('chat')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  Get Started
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Safety Tip ── */}
      <SafetyTipBanner />
    </div>
  );
}
