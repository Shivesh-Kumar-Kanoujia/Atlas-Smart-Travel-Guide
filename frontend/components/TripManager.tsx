// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { Plus, X, Loader2, Download, MapPin, Calendar, DollarSign, Sparkles, Wallet, Luggage, Share2 } from 'lucide-react';
import { getTrips, createTrip, updateTrip, deleteTrip, addExpense, updatePacking, estimateBudget, suggestPacking, createShareLink } from '../lib/api';
import toast from 'react-hot-toast';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Textarea } from './ui/textarea';
import { cn } from '../lib/utils';
import TravelCard from './TravelCard';
import ItineraryPanel from './ItineraryPanel';
import TripPDFExport from './TripPDFExport';

const PACKING_TEMPLATES = ['Passport', 'Flight tickets', 'Travel insurance', 'Phone charger', 'Power adapter', 'First aid kit', 'Sunscreen', 'Camera', 'Headphones', 'Medications', 'Toiletries', 'Local cash'];
const EXPENSE_CATS = ['Accommodation', 'Transport', 'Food', 'Activities', 'Shopping', 'Communications', 'Medical', 'Other'];

const STATUS_STYLES = {
  planned: 'bg-secondary text-secondary-foreground',
  active: 'bg-primary/10 text-primary',
  completed: 'bg-forest-500/10 text-forest-500',
  cancelled: 'bg-destructive/10 text-destructive',
};

export default function TripManager() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [activePanel, setActivePanel] = useState('details');
  const [editingTrip, setEditingTrip] = useState(null);

  const [form, setForm] = useState({
    name: '', destination: '', start_date: '', end_date: '', budget: '', notes: '', status: 'planned',
    latitude: null, longitude: null,
  });
  const [expense, setExpense] = useState({ category: 'Food', description: '', amount: '' });
  const [packingInput, setPackingInput] = useState('');
  const [budgetEstimate, setBudgetEstimate] = useState(null);
  const [budgetEstimating, setBudgetEstimating] = useState(false);
  const [packingSuggest, setPackingSuggest] = useState(null);
  const [packingSuggesting, setPackingSuggesting] = useState(false);
  const [geoStatus, setGeoStatus] = useState(null);
  const [showManualCoords, setShowManualCoords] = useState(false);
  const [shareLink, setShareLink] = useState(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const geocodeDestination = useCallback(async (destination) => {
    if (!destination || destination.trim().length < 2) return;
    setGeoStatus('loading');
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(destination.trim())}`,
        { headers: { 'User-Agent': 'AtlasTravelGuide/2.0' } }
      );
      const data = await res.json();
      if (data.length > 0) {
        setForm(prev => ({ ...prev, latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) }));
        setGeoStatus('found');
        setShowManualCoords(false);
      } else {
        setGeoStatus('failed');
        setShowManualCoords(true);
      }
    } catch {
      setGeoStatus('failed');
      setShowManualCoords(true);
    }
  }, []);

  const load = async () => {
    try {
      const r = await getTrips();
      setTrips(r.data);
    } catch {
      toast.error('Failed to load trips');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    if (!form.name || !form.destination) return toast.error('Name and destination required');
    try {
      if (editingTrip) {
        const r = await updateTrip(editingTrip.id, { ...form, budget: parseFloat(form.budget) || 0 });
        if (selectedTrip?.id === editingTrip.id) setSelectedTrip(r.data);
        toast.success('Trip updated!');
      } else {
        await createTrip({ ...form, budget: parseFloat(form.budget) || 0 });
        toast.success('Trip created!');
      }
      setShowForm(false);
      setEditingTrip(null);
      setForm({ name: '', destination: '', start_date: '', end_date: '', budget: '', notes: '', status: 'planned', latitude: null, longitude: null });
      load();
    } catch {
      toast.error('Save failed. Is the backend running?');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this trip?')) return;
    await deleteTrip(id);
    toast.success('Deleted');
    if (selectedTrip?.id === id) setSelectedTrip(null);
    load();
  };

  const handleEdit = (trip) => {
    setEditingTrip(trip);
    setForm({ name: trip.name, destination: trip.destination, start_date: trip.start_date || '', end_date: trip.end_date || '', budget: trip.budget || '', notes: trip.notes || '', status: trip.status, latitude: trip.latitude, longitude: trip.longitude });
    setShowForm(true);
  };

  const refreshSelected = async (id) => {
    const r = await getTrips();
    setTrips(r.data);
    const found = r.data.find(t => t.id === id);
    if (found) setSelectedTrip(found);
  };

  const handleAddExpense = async () => {
    if (!expense.description || !expense.amount) return toast.error('Fill description and amount');
    try {
      await addExpense(selectedTrip.id, { ...expense, amount: parseFloat(expense.amount) });
      toast.success('Expense added');
      setExpense({ category: 'Food', description: '', amount: '' });
      refreshSelected(selectedTrip.id);
    } catch {
      toast.error('Failed');
    }
  };

  const handlePackingToggle = async (idx) => {
    const updated = selectedTrip.packing_list.map((it, i) =>
      i === idx ? { ...it, packed: !it.packed } : it
    );
    await updatePacking(selectedTrip.id, updated);
    refreshSelected(selectedTrip.id);
  };

  const handleAddPackingItem = async () => {
    if (!packingInput.trim()) return;
    const updated = [...(selectedTrip.packing_list || []), { item: packingInput, packed: false, category: 'General' }];
    await updatePacking(selectedTrip.id, updated);
    setPackingInput('');
    refreshSelected(selectedTrip.id);
  };

  const handleEstimateBudget = async () => {
    setBudgetEstimating(true);
    setBudgetEstimate(null);
    try {
      const res = await estimateBudget({
        destination: selectedTrip.destination,
        days: Math.max(1, selectedTrip.start_date && selectedTrip.end_date
          ? Math.round((new Date(selectedTrip.end_date) - new Date(selectedTrip.start_date)) / (1000 * 60 * 60 * 24)) + 1
          : 5),
        travelers: 1,
        budget: 'mid-range',
      });
      setBudgetEstimate(res.data);
    } catch {
      toast.error('Failed to estimate budget. Check backend.');
    } finally {
      setBudgetEstimating(false);
    }
  };

  const handleSuggestPacking = async () => {
    setPackingSuggesting(true);
    setPackingSuggest(null);
    try {
      const res = await suggestPacking({
        destination: selectedTrip.destination,
        days: Math.max(1, selectedTrip.start_date && selectedTrip.end_date
          ? Math.round((new Date(selectedTrip.end_date) - new Date(selectedTrip.start_date)) / (1000 * 60 * 60 * 24)) + 1
          : 5),
      });
      setPackingSuggest(res.data);
      toast.success('AI packing suggestions ready!');
    } catch {
      toast.error('Failed to get packing suggestions. Check backend.');
    } finally {
      setPackingSuggesting(false);
    }
  };

  const handleShare = async (trip) => {
    setShareLoading(true);
    setShareLink(null);
    try {
      const res = await createShareLink(trip.id);
      const code = res.data.code;
      const url = `${window.location.origin}/shared/${code}`;
      setShareLink(url);
      setShowShareModal(true);
    } catch {
      toast.error('Failed to create share link');
    } finally {
      setShareLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      toast.success('Link copied to clipboard!');
    }
  };

  const exportTrip = (trip) => {
    const data = {
      exported: new Date().toISOString(),
      name: trip.name,
      destination: trip.destination,
      dates: { start: trip.start_date, end: trip.end_date },
      budget: { total: trip.budget, spent: trip.spent },
      status: trip.status,
      notes: trip.notes,
      itinerary: trip.itinerary,
      expenses: trip.expenses,
      packing_list: trip.packing_list,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${trip.name.replace(/\s+/g, '_')}_trip.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Trip exported!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const PANELS = [
    { id: 'details', label: 'Details' },
    { id: 'itinerary', label: 'Itinerary' },
    { id: 'expenses', label: 'Budget' },
    { id: 'packing', label: 'Packing' },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-muted-foreground">{trips.length} trip{trips.length !== 1 ? 's' : ''}</p>
        </div>
        <Button
          onClick={() => {
            setShowForm(true);
            setEditingTrip(null);
            setForm({ name: '', destination: '', start_date: '', end_date: '', budget: '', notes: '', status: 'planned', latitude: null, longitude: null });
          }}
          size="sm"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          New Trip
        </Button>
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in slide-in-from-bottom-4 max-h-[90vh] overflow-y-auto border border-border">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-xl font-semibold text-foreground">
                {editingTrip ? 'Edit Trip' : 'New Trip'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-accent transition-all">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Trip Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Tokyo Adventure"
                  className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Destination *</label>
                <input
                  value={form.destination}
                  onChange={(e) => setForm(prev => ({ ...prev, destination: e.target.value }))}
                  onBlur={(e) => geocodeDestination(e.target.value)}
                  placeholder="e.g. Tokyo, Japan"
                  className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Start</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm(prev => ({ ...prev, start_date: e.target.value }))}
                    className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">End</label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm(prev => ({ ...prev, end_date: e.target.value }))}
                    className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Budget (USD)</label>
                <input
                  type="number"
                  value={form.budget}
                  onChange={(e) => setForm(prev => ({ ...prev, budget: e.target.value }))}
                  placeholder="e.g. 2000"
                  className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                >
                  {['planned', 'active', 'completed', 'cancelled'].map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Notes</label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  placeholder="Notes..."
                />
              </div>

              {showManualCoords && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-xl">
                  <div className="col-span-2">
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                      Geocoding failed — enter coordinates manually:
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={form.latitude ?? ''}
                      onChange={(e) => setForm(prev => ({ ...prev, latitude: e.target.value ? parseFloat(e.target.value) : null }))}
                      placeholder="e.g. 48.8566"
                      className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={form.longitude ?? ''}
                      onChange={(e) => setForm(prev => ({ ...prev, longitude: e.target.value ? parseFloat(e.target.value) : null }))}
                      placeholder="e.g. 2.3522"
                      className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                    />
                  </div>
                </div>
              )}
              {geoStatus === 'found' && (
                <p className="text-xs text-forest-500 flex items-center gap-1">
                  Coordinates found: {form.latitude?.toFixed(4)}, {form.longitude?.toFixed(4)}
                </p>
              )}
              {geoStatus === 'loading' && (
                <p className="text-xs text-muted-foreground">Looking up coordinates...</p>
              )}
            </div>
            <div className="flex gap-2 mt-5">
              <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSubmit} className="flex-1">
                {editingTrip ? 'Save' : 'Create Trip'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trip list */}
        <div className="lg:col-span-1 space-y-3">
          {trips.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-2xl">
              <div className="text-4xl mb-2">✈️</div>
              <p className="text-sm font-medium">No trips yet</p>
              <p className="text-xs mt-1">Click &quot;New Trip&quot; to start planning</p>
            </div>
          ) : (
            trips.map((t) => (
              <TravelCard
                key={t.id}
                trip={t}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onSelect={() => { setSelectedTrip(t); setActivePanel('details'); }}
              />
            ))
          )}
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2">
          {selectedTrip ? (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              {/* Trip header */}
              <div className="p-5 border-b border-border bg-secondary/50">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-xl font-semibold text-foreground">
                        {selectedTrip.name}
                      </h3>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs px-1.5 py-0 font-normal',
                          STATUS_STYLES[selectedTrip.status] || ''
                        )}
                      >
                        {selectedTrip.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {selectedTrip.destination}
                      </span>
                      {selectedTrip.start_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(selectedTrip.start_date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                          {selectedTrip.end_date && ` - ${new Date(selectedTrip.end_date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <TripPDFExport trip={selectedTrip} />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShare(selectedTrip)}
                      disabled={shareLoading}
                    >
                      {shareLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Share2 className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      Share
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportTrip(selectedTrip)}
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      JSON
                    </Button>
                  </div>
                </div>
              </div>

              {/* Panel tabs */}
              <div className="flex border-b border-border overflow-x-auto no-scrollbar">
                {PANELS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setActivePanel(p.id)}
                    className={cn(
                      'px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all',
                      activePanel === p.id
                        ? 'border-primary text-foreground'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="p-5">
                {/* Details panel */}
                {activePanel === 'details' && (
                  <div className="space-y-4">
                    {selectedTrip.notes && (
                      <p className="text-sm text-card-foreground/80 bg-secondary p-4 rounded-xl leading-relaxed">
                        {selectedTrip.notes}
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                        <div className="text-xs text-primary/70 mb-1 font-medium">Budget</div>
                        <div className="text-2xl font-semibold text-primary">
                          ${(selectedTrip.budget || 0).toLocaleString()}
                        </div>
                      </div>
                      <div className={cn(
                        'rounded-xl p-4 border',
                        (selectedTrip.spent || 0) > (selectedTrip.budget || 0)
                          ? 'bg-destructive/5 border-destructive/10'
                          : 'bg-forest-500/5 border-forest-500/10'
                      )}>
                        <div className={cn(
                          'text-xs mb-1 font-medium',
                          (selectedTrip.spent || 0) > (selectedTrip.budget || 0)
                            ? 'text-destructive'
                            : 'text-forest-500'
                        )}>Spent</div>
                        <div className={cn(
                          'text-2xl font-semibold',
                          (selectedTrip.spent || 0) > (selectedTrip.budget || 0)
                            ? 'text-destructive'
                            : 'text-forest-500'
                        )}>${(selectedTrip.spent || 0).toLocaleString()}</div>
                      </div>
                    </div>
                    {selectedTrip.budget > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Budget used</span>
                          <span>{Math.min(Math.round((selectedTrip.spent / selectedTrip.budget) * 100), 100)}%</span>
                        </div>
                        <Progress
                          value={Math.min((selectedTrip.spent / selectedTrip.budget) * 100, 100)}
                          className={cn(
                            (selectedTrip.spent || 0) > (selectedTrip.budget || 0) && '[&>div]:bg-destructive'
                          )}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Itinerary panel */}
                {activePanel === 'itinerary' && (
                  <ItineraryPanel
                    trip={selectedTrip}
                    onUpdate={() => refreshSelected(selectedTrip.id)}
                  />
                )}

                {/* Expenses panel */}
                {activePanel === 'expenses' && (
                  <div>
                    {/* AI Budget Estimator */}
                    <div className="bg-card border border-border rounded-xl p-4 mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Wallet className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium text-foreground">AI Budget Estimate</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleEstimateBudget}
                          disabled={budgetEstimating}
                        >
                          {budgetEstimating ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                          )}
                          {budgetEstimating ? 'Estimating...' : 'Get AI Estimate'}
                        </Button>
                      </div>

                      {budgetEstimate && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                          <div className="flex items-end justify-between">
                            <div>
                              <div className="text-xs text-muted-foreground">Estimated Total</div>
                              <div className="text-3xl font-display font-semibold text-foreground">
                                ${budgetEstimate.estimated_total?.toLocaleString()}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                ~${budgetEstimate.daily_per_person}/day per person
                              </div>
                            </div>
                            <Badge variant="outline" className="capitalize">
                              {budgetEstimate.budget_tier}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {budgetEstimate.breakdown && Object.entries(budgetEstimate.breakdown).map(([key, val]: [string, any]) => (
                              <div key={key} className="bg-secondary rounded-lg p-2.5">
                                <div className="text-xs text-muted-foreground capitalize mb-0.5">
                                  {key.replace(/_/g, ' ')}
                                </div>
                                <div className="text-sm font-semibold text-foreground">
                                  ${val.amount?.toLocaleString()}
                                </div>
                                <div className="text-xs text-muted-foreground line-clamp-1">{val.details}</div>
                              </div>
                            ))}
                          </div>

                          {budgetEstimate.tip && (
                            <p className="text-xs text-muted-foreground bg-accent/50 p-2.5 rounded-lg">
                              {budgetEstimate.tip}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Manual expense entry */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-4">
                      <select
                        value={expense.category}
                        onChange={(e) => setExpense(prev => ({ ...prev, category: e.target.value }))}
                        className="h-10 px-3 rounded-xl border border-input bg-background text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                      >
                        {EXPENSE_CATS.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                      <input
                        value={expense.description}
                        onChange={(e) => setExpense(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Description"
                        className="h-10 px-3 rounded-xl border border-input bg-background text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                      />
                      <input
                        type="number"
                        value={expense.amount}
                        onChange={(e) => setExpense(prev => ({ ...prev, amount: e.target.value }))}
                        placeholder="$0.00"
                        className="h-10 px-3 rounded-xl border border-input bg-background text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                      />
                      <Button onClick={handleAddExpense} size="sm">
                        <Plus className="w-4 h-4 mr-1.5" />
                        Add
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {(selectedTrip.expenses || []).length === 0 ? (
                        <p className="text-center text-muted-foreground text-sm py-8">No expenses yet</p>
                      ) : (
                        selectedTrip.expenses.map((ex, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between p-3 bg-secondary rounded-xl text-sm"
                          >
                            <div>
                              <span className="font-medium text-foreground">{ex.category}</span>
                              <span className="text-muted-foreground ml-2">{ex.description}</span>
                            </div>
                            <span className="font-semibold text-foreground">${ex.amount}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Packing panel */}
                {activePanel === 'packing' && (
                  <div>
                    {/* AI Packing Assistant */}
                    <div className="bg-card border border-border rounded-xl p-4 mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Luggage className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium text-foreground">AI Packing Assistant</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSuggestPacking}
                          disabled={packingSuggesting}
                        >
                          {packingSuggesting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                          )}
                          {packingSuggesting ? 'Suggesting...' : 'Get AI Suggestions'}
                        </Button>
                      </div>

                      {packingSuggest && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="w-3.5 h-3.5" />
                            {packingSuggest.destination} &middot; {packingSuggest.duration_days} days &middot; {packingSuggest.season}
                            <Badge variant="outline" className="text-xs ml-auto">
                              {packingSuggest.total_items} items ({packingSuggest.essential_count} essential)
                            </Badge>
                          </div>

                          <div className="space-y-3 max-h-80 overflow-y-auto">
                            {packingSuggest.categories?.map((cat: any, ci: number) => (
                              <div key={ci}>
                                <h4 className="text-xs font-semibold text-foreground mb-1.5">{cat.name}</h4>
                                <div className="space-y-1">
                                  {cat.items?.map((item: any, ii: number) => (
                                    <div
                                      key={ii}
                                      className={cn(
                                        'flex items-center gap-2 p-2 rounded-lg text-xs',
                                        item.essential
                                          ? 'bg-secondary'
                                          : 'bg-background'
                                      )}
                                    >
                                      <div className={cn(
                                        'w-1.5 h-1.5 rounded-full shrink-0',
                                        item.essential ? 'bg-primary' : 'bg-muted-foreground/40'
                                      )} />
                                      <span className="text-foreground flex-1">{item.item}</span>
                                      {item.tip && (
                                        <span className="text-muted-foreground text-xs hidden sm:inline max-w-[200px] truncate">
                                          {item.tip}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="flex gap-2 text-xs">
                            {packingSuggest.luggage_tip && (
                              <span className="text-muted-foreground bg-secondary p-2 rounded-lg flex-1">
                                {packingSuggest.luggage_tip}
                              </span>
                            )}
                            {packingSuggest.destination_tip && (
                              <span className="text-muted-foreground bg-secondary p-2 rounded-lg flex-1">
                                {packingSuggest.destination_tip}
                              </span>
                            )}
                          </div>

                          <Button
                            size="sm"
                            variant="secondary"
                            className="w-full"
                            onClick={async () => {
                              const essentials = packingSuggest.categories?.flatMap((c: any) =>
                                c.items?.filter((i: any) => i.essential).map((i: any) => i.item.split(' (')[0]) || []
                              ) || [];
                              for (const item of essentials) {
                                await updatePacking(selectedTrip.id, [
                                  ...(selectedTrip.packing_list || []),
                                  { item, packed: false, category: 'General' },
                                ]);
                              }
                              toast.success(`${essentials.length} essential items added!`);
                              refreshSelected(selectedTrip.id);
                            }}
                          >
                            <Plus className="w-3.5 h-3.5 mr-1.5" />
                            Add Essentials to Packing List
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Manual packing */}
                    <div className="flex gap-2 mb-3">
                      <input
                        value={packingInput}
                        onChange={(e) => setPackingInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddPackingItem()}
                        placeholder="Add item..."
                        className="flex-1 h-10 px-3 rounded-xl border border-input bg-background text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                      />
                      <Button onClick={handleAddPackingItem} size="sm">
                        <Plus className="w-4 h-4 mr-1.5" />
                        Add
                      </Button>
                    </div>
                    <div className="flex gap-1.5 flex-wrap mb-4">
                      {PACKING_TEMPLATES.map((t) => (
                        <button
                          key={t}
                          onClick={() => setPackingInput(t)}
                          className="px-3 py-2 bg-secondary border border-border text-xs text-secondary-foreground rounded-full hover:bg-accent transition-all"
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {(selectedTrip.packing_list || []).length === 0 ? (
                        <p className="text-center text-muted-foreground text-sm py-8">No packing items yet</p>
                      ) : (
                        selectedTrip.packing_list.map((it, i) => (
                          <div
                            key={i}
                            onClick={() => handlePackingToggle(i)}
                            className={cn(
                              'flex items-center gap-3 p-3 rounded-xl cursor-pointer text-sm transition-all',
                              it.packed
                                ? 'bg-forest-500/5 border border-forest-500/20'
                                : 'bg-secondary hover:bg-accent border border-transparent'
                            )}
                          >
                            <div
                              className={cn(
                                'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                                it.packed
                                  ? 'bg-forest-500 border-forest-500'
                                  : 'border-muted-foreground/30'
                              )}
                            >
                              {it.packed && <span className="text-background text-xs font-bold">✓</span>}
                            </div>
                            <span className={cn(it.packed && 'line-through text-muted-foreground')}>
                              {it.item}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl flex flex-col items-center justify-center h-64 text-muted-foreground">
              <div className="text-4xl mb-2">🗺️</div>
              <p className="text-sm font-medium">Select a trip to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Share modal */}
      {showShareModal && shareLink && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setShowShareModal(false)}
        >
          <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl border border-border animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold text-foreground">Share Trip</h3>
              <button onClick={() => setShowShareModal(false)} className="p-1 rounded-lg hover:bg-accent transition-all">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Anyone with this link can view your trip details.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareLink}
                readOnly
                className="flex-1 h-10 px-3 rounded-xl border border-input bg-background text-sm text-foreground outline-none"
                onClick={(e) => e.target.select()}
              />
              <Button onClick={handleCopyLink}>Copy</Button>
            </div>
            <Button
              variant="outline"
              className="w-full mt-3"
              onClick={() => setShowShareModal(false)}
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
