import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { getPreferences, updatePreferences, extractPreferences, type UserPreferences } from '../lib/api';
import toast from 'react-hot-toast';
import { Sparkles, Save, Loader2, Brain } from 'lucide-react';
import { Badge } from './ui/badge';

const BUDGET_OPTIONS = ['budget', 'mid-range', 'luxury'];
const PACE_OPTIONS = ['slow', 'moderate', 'fast'];
const MOOD_OPTIONS = ['adventurous', 'relaxing', 'cultural', 'romantic', 'family', 'solo', 'luxury', 'eco-friendly', 'nightlife', 'nature'];

export default function PreferenceSettings() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);

  useEffect(() => {
    if (user) {
      loadPreferences();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadPreferences = async () => {
    try {
      const { data } = await getPreferences();
      setPrefs(data);
    } catch {
      setPrefs({
        preferred_moods: [],
        preferred_budget: 'mid-range',
        favorite_destinations: [],
        bucket_list: [],
        travel_style: '',
        interests: [],
        dietary_preferences: '',
        accommodation_preference: '',
        pace: 'moderate',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!prefs) return;
    setSaving(true);
    try {
      await updatePreferences(prefs);
      toast.success('Preferences saved');
    } catch (err: any) {
      console.error('Save preferences failed:', err);
      toast.error(err?.response?.data?.detail || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleExtract = async () => {
    setExtracting(true);
    try {
      const { data } = await extractPreferences();
      setPrefs(data.preferences);
      toast.success('Preferences extracted from your activity');
    } catch (err: any) {
      console.error('Extract preferences failed:', err);
      toast.error(err?.response?.data?.detail || 'Failed to extract preferences from your activity');
    } finally {
      setExtracting(false);
    }
  };

  const toggleMood = (mood: string) => {
    if (!prefs) return;
    const moods = prefs.preferred_moods.includes(mood)
      ? prefs.preferred_moods.filter((m: string) => m !== mood)
      : [...prefs.preferred_moods, mood];
    setPrefs({ ...prefs, preferred_moods: moods });
  };

  const addArrayItem = (field: 'favorite_destinations' | 'bucket_list' | 'interests') => {
    const val = prompt(`Add ${field === 'favorite_destinations' ? 'a destination' : field === 'bucket_list' ? 'a bucket list item' : 'an interest'}:`);
    if (val && prefs) {
      setPrefs({ ...prefs, [field]: [...prefs[field], val.trim()] });
    }
  };

  const removeArrayItem = (field: 'favorite_destinations' | 'bucket_list' | 'interests', index: number) => {
    if (!prefs) return;
    const arr = [...prefs[field]];
    arr.splice(index, 1);
    setPrefs({ ...prefs, [field]: arr });
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Sign in to set your travel preferences
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!prefs) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Travel Preferences</h2>
          <p className="text-sm text-muted-foreground">Let Atlas learn your travel style for better recommendations</p>
        </div>
        <button
          onClick={handleExtract}
          disabled={extracting}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50"
        >
          {extracting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
          Auto-detect
        </button>
      </div>

      {/* Mood tags */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">Travel Mood</label>
        <div className="flex flex-wrap gap-1.5">
          {MOOD_OPTIONS.map((mood) => (
            <button
              key={mood}
              onClick={() => toggleMood(mood)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                prefs.preferred_moods.includes(mood)
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {mood}
            </button>
          ))}
        </div>
      </div>

      {/* Budget + Pace row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">Budget</label>
          <div className="flex gap-1.5">
            {BUDGET_OPTIONS.map((b) => (
              <button
                key={b}
                onClick={() => setPrefs({ ...prefs, preferred_budget: b })}
                className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  prefs.preferred_budget === b
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">Pace</label>
          <div className="flex gap-1.5">
            {PACE_OPTIONS.map((p) => (
              <button
                key={p}
                onClick={() => setPrefs({ ...prefs, pace: p })}
                className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  prefs.pace === p
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Favorite Destinations */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">Favorite Destinations</label>
        <div className="flex flex-wrap gap-1.5">
          {prefs.favorite_destinations.map((d: string, i: number) => (
            <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => removeArrayItem('favorite_destinations', i)}>
              {d} ✕
            </Badge>
          ))}
          <button
            onClick={() => addArrayItem('favorite_destinations')}
            className="text-xs text-primary hover:underline"
          >
            + Add
          </button>
        </div>
      </div>

      {/* Bucket List */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">Bucket List</label>
        <div className="flex flex-wrap gap-1.5">
          {prefs.bucket_list.map((item: string, i: number) => (
            <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => removeArrayItem('bucket_list', i)}>
              {item} ✕
            </Badge>
          ))}
          <button
            onClick={() => addArrayItem('bucket_list')}
            className="text-xs text-primary hover:underline"
          >
            + Add
          </button>
        </div>
      </div>

      {/* Interests */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">Interests</label>
        <div className="flex flex-wrap gap-1.5">
          {prefs.interests.map((item: string, i: number) => (
            <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => removeArrayItem('interests', i)}>
              {item} ✕
            </Badge>
          ))}
          <button
            onClick={() => addArrayItem('interests')}
            className="text-xs text-primary hover:underline"
          >
            + Add
          </button>
        </div>
      </div>

      {/* Travel style text */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">Travel Style Description</label>
        <textarea
          value={prefs.travel_style}
          onChange={(e) => setPrefs({ ...prefs, travel_style: e.target.value })}
          placeholder="Describe your ideal travel style — e.g., Immersive cultural experiences with hiking and local food..."
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground resize-none h-20 focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Dietary + Accommodation */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">Dietary Preferences</label>
          <input
            value={prefs.dietary_preferences}
            onChange={(e) => setPrefs({ ...prefs, dietary_preferences: e.target.value })}
            placeholder="Vegetarian, no restrictions..."
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">Accommodation</label>
          <input
            value={prefs.accommodation_preference}
            onChange={(e) => setPrefs({ ...prefs, accommodation_preference: e.target.value })}
            placeholder="Boutique hotels, hostels..."
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Preferences
        </button>
      </div>
    </div>
  );
}
