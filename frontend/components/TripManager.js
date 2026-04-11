import { useState, useEffect } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import TravelCard from "./TravelCard";
import ItineraryPanel from "./ItineraryPanel";
import { getTrips, createTrip, updateTrip, deleteTrip, addExpense, updatePacking } from "../lib/api";
import toast from "react-hot-toast";

const PACKING_TEMPLATES = ["Passport","Flight tickets","Travel insurance","Phone charger","Power adapter","First aid kit","Sunscreen","Camera","Headphones","Medications","Toiletries","Local cash"];
const EXPENSE_CATS = ["🏨 Accommodation","✈️ Transport","🍽️ Food","🎭 Activities","🛍️ Shopping","📱 Communications","🏥 Medical","💡 Other"];

export default function TripManager() {
  const [trips, setTrips]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [activePanel, setActivePanel] = useState("details");
  const [editingTrip, setEditingTrip] = useState(null);
  const [form, setForm] = useState({ name:"", destination:"", start_date:"", end_date:"", budget:"", notes:"", status:"planned" });
  const [expense, setExpense] = useState({ category:"🍽️ Food", description:"", amount:"" });
  const [packingInput, setPackingInput] = useState("");

  const load = async () => {
    try { const r = await getTrips(); setTrips(r.data); }
    catch { toast.error("Failed to load trips"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    if (!form.name || !form.destination) return toast.error("Name and destination required");
    try {
      if (editingTrip) {
        const r = await updateTrip(editingTrip.id, { ...form, budget: parseFloat(form.budget) || 0 });
        if (selectedTrip?.id === editingTrip.id) setSelectedTrip(r.data);
        toast.success("Trip updated!");
      } else {
        await createTrip({ ...form, budget: parseFloat(form.budget) || 0 });
        toast.success("Trip created! ✈️");
      }
      setShowForm(false); setEditingTrip(null);
      setForm({ name:"", destination:"", start_date:"", end_date:"", budget:"", notes:"", status:"planned" });
      load();
    } catch { toast.error("Save failed. Is the backend running?"); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this trip?")) return;
    await deleteTrip(id);
    toast.success("Deleted");
    if (selectedTrip?.id === id) setSelectedTrip(null);
    load();
  };

  const handleEdit = (trip) => {
    setEditingTrip(trip);
    setForm({ name:trip.name, destination:trip.destination, start_date:trip.start_date||"", end_date:trip.end_date||"", budget:trip.budget||"", notes:trip.notes||"", status:trip.status });
    setShowForm(true);
  };

  const refreshSelected = async (id) => {
    const r = await getTrips(); setTrips(r.data);
    const found = r.data.find(t => t.id === id);
    if (found) setSelectedTrip(found);
  };

  const handleAddExpense = async () => {
    if (!expense.description || !expense.amount) return toast.error("Fill description and amount");
    try {
      await addExpense(selectedTrip.id, { ...expense, amount: parseFloat(expense.amount) });
      toast.success("Expense added");
      setExpense({ category:"🍽️ Food", description:"", amount:"" });
      refreshSelected(selectedTrip.id);
    } catch { toast.error("Failed"); }
  };

  const handlePackingToggle = async (idx) => {
    const updated = selectedTrip.packing_list.map((it, i) => i === idx ? { ...it, packed: !it.packed } : it);
    await updatePacking(selectedTrip.id, updated);
    refreshSelected(selectedTrip.id);
  };

  const handleAddPackingItem = async () => {
    if (!packingInput.trim()) return;
    const updated = [...(selectedTrip.packing_list || []), { item: packingInput, packed: false, category: "General" }];
    await updatePacking(selectedTrip.id, updated);
    setPackingInput("");
    refreshSelected(selectedTrip.id);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-sand-400 animate-spin" /></div>;

  const PANELS = [
    { id: "details",   label: "📋 Details"   },
    { id: "itinerary", label: "🗓️ Itinerary"  },
    { id: "expenses",  label: "💰 Budget"     },
    { id: "packing",   label: "🎒 Packing"    },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="font-display text-2xl font-semibold text-sand-900">My Trips</h2>
          <p className="text-sand-500 text-sm">{trips.length} trip{trips.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditingTrip(null); setForm({ name:"", destination:"", start_date:"", end_date:"", budget:"", notes:"", status:"planned" }); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-sand-500 text-white rounded-xl text-sm font-medium hover:bg-sand-600 transition-all shadow-sm">
          <Plus className="w-4 h-4" /> New Trip
        </button>
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-display text-xl font-semibold">{editingTrip ? "Edit Trip" : "New Trip"}</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-sand-500" /></button>
            </div>
            <div className="space-y-3">
              {[["name","Trip Name","e.g. Tokyo Adventure"],["destination","Destination","e.g. Tokyo, Japan"]].map(([f,l,p]) => (
                <div key={f}>
                  <label className="text-xs font-medium text-sand-600 mb-1 block">{l} *</label>
                  <input value={form[f]} onChange={e => setForm(prev => ({ ...prev, [f]: e.target.value }))} placeholder={p}
                    className="w-full px-3 py-2.5 bg-sand-50 border border-sand-200 rounded-xl text-sm outline-none focus:border-sand-400" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-sand-600 mb-1 block">Start</label>
                  <input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-sand-50 border border-sand-200 rounded-xl text-sm outline-none focus:border-sand-400" /></div>
                <div><label className="text-xs font-medium text-sand-600 mb-1 block">End</label>
                  <input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-sand-50 border border-sand-200 rounded-xl text-sm outline-none focus:border-sand-400" /></div>
              </div>
              <div><label className="text-xs font-medium text-sand-600 mb-1 block">Budget (USD)</label>
                <input type="number" value={form.budget} onChange={e => setForm(p => ({ ...p, budget: e.target.value }))} placeholder="e.g. 2000"
                  className="w-full px-3 py-2.5 bg-sand-50 border border-sand-200 rounded-xl text-sm outline-none focus:border-sand-400" /></div>
              <div><label className="text-xs font-medium text-sand-600 mb-1 block">Status</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-sand-50 border border-sand-200 rounded-xl text-sm outline-none">
                  {["planned","active","completed","cancelled"].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                </select></div>
              <div><label className="text-xs font-medium text-sand-600 mb-1 block">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Notes..."
                  className="w-full px-3 py-2.5 bg-sand-50 border border-sand-200 rounded-xl text-sm outline-none resize-none" /></div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-sand-200 text-sand-600 rounded-xl text-sm font-medium hover:bg-sand-50">Cancel</button>
              <button onClick={handleSubmit} className="flex-1 py-2.5 bg-sand-500 text-white rounded-xl text-sm font-medium hover:bg-sand-600">
                {editingTrip ? "Save" : "Create Trip"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trip list */}
        <div className="lg:col-span-1 space-y-4">
          {trips.length === 0 ? (
            <div className="text-center py-12 text-sand-400 bg-white border border-sand-200 rounded-2xl">
              <div className="text-4xl mb-2">✈️</div>
              <p className="text-sm font-medium">No trips yet</p>
              <p className="text-xs mt-1">Click "New Trip" to start</p>
            </div>
          ) : trips.map(t => (
            <TravelCard key={t.id} trip={t} onEdit={handleEdit} onDelete={handleDelete}
              onSelect={() => { setSelectedTrip(t); setActivePanel("details"); }} />
          ))}
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2">
          {selectedTrip ? (
            <div className="bg-white border border-sand-200 rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-sand-100 bg-sand-50">
                <h3 className="font-display text-xl font-semibold text-sand-900">{selectedTrip.name}</h3>
                <p className="text-sand-500 text-sm">📍 {selectedTrip.destination}</p>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-sand-100 overflow-x-auto no-scrollbar">
                {PANELS.map(p => (
                  <button key={p.id} onClick={() => setActivePanel(p.id)}
                    className={`px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                      activePanel === p.id
                        ? "border-sand-500 text-sand-900"
                        : "border-transparent text-sand-500 hover:text-sand-700"
                    }`}>
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="p-5">
                {/* Details */}
                {activePanel === "details" && (
                  <div className="space-y-4">
                    {selectedTrip.notes && (
                      <p className="text-sand-700 text-sm bg-sand-50 p-4 rounded-xl leading-relaxed">{selectedTrip.notes}</p>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-ocean-50 rounded-xl p-4 border border-ocean-100">
                        <div className="text-xs text-ocean-600 mb-1 font-medium">Budget</div>
                        <div className="text-2xl font-semibold text-ocean-800">${(selectedTrip.budget || 0).toLocaleString()}</div>
                      </div>
                      <div className={`rounded-xl p-4 border ${selectedTrip.spent > selectedTrip.budget ? "bg-red-50 border-red-100" : "bg-green-50 border-green-100"}`}>
                        <div className={`text-xs mb-1 font-medium ${selectedTrip.spent > selectedTrip.budget ? "text-red-600" : "text-green-600"}`}>Spent</div>
                        <div className={`text-2xl font-semibold ${selectedTrip.spent > selectedTrip.budget ? "text-red-700" : "text-green-700"}`}>${(selectedTrip.spent || 0).toLocaleString()}</div>
                      </div>
                    </div>
                    {selectedTrip.budget > 0 && (
                      <div>
                        <div className="flex justify-between text-xs text-sand-500 mb-1.5">
                          <span>Budget used</span>
                          <span>{Math.min(Math.round((selectedTrip.spent / selectedTrip.budget) * 100), 100)}%</span>
                        </div>
                        <div className="h-2 bg-sand-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${selectedTrip.spent > selectedTrip.budget ? "bg-red-500" : "bg-green-500"}`}
                            style={{ width: `${Math.min((selectedTrip.spent / selectedTrip.budget) * 100, 100)}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Itinerary */}
                {activePanel === "itinerary" && (
                  <ItineraryPanel
                    trip={selectedTrip}
                    onUpdate={() => refreshSelected(selectedTrip.id)}
                  />
                )}

                {/* Expenses */}
                {activePanel === "expenses" && (
                  <div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
                      <select value={expense.category} onChange={e => setExpense(p => ({ ...p, category: e.target.value }))}
                        className="px-3 py-2.5 bg-sand-50 border border-sand-200 rounded-xl text-sm outline-none">
                        {EXPENSE_CATS.map(c => <option key={c}>{c}</option>)}
                      </select>
                      <input value={expense.description} onChange={e => setExpense(p => ({ ...p, description: e.target.value }))} placeholder="Description"
                        className="px-3 py-2.5 bg-sand-50 border border-sand-200 rounded-xl text-sm outline-none focus:border-sand-400" />
                      <div className="flex gap-2">
                        <input type="number" value={expense.amount} onChange={e => setExpense(p => ({ ...p, amount: e.target.value }))} placeholder="$"
                          className="flex-1 px-3 py-2.5 bg-sand-50 border border-sand-200 rounded-xl text-sm outline-none" />
                        <button onClick={handleAddExpense} className="px-3 py-2.5 bg-sand-500 text-white rounded-xl hover:bg-sand-600"><Plus className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {(selectedTrip.expenses || []).length === 0
                        ? <p className="text-center text-sand-400 text-sm py-8">No expenses yet</p>
                        : selectedTrip.expenses.map((ex, i) => (
                          <div key={i} className="flex justify-between items-center p-3 bg-sand-50 rounded-xl text-sm">
                            <div><span className="font-medium text-sand-700">{ex.category}</span><span className="text-sand-500 ml-2">{ex.description}</span></div>
                            <span className="font-semibold text-sand-900">${ex.amount}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Packing */}
                {activePanel === "packing" && (
                  <div>
                    <div className="flex gap-2 mb-3">
                      <input value={packingInput} onChange={e => setPackingInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleAddPackingItem()} placeholder="Add item..."
                        className="flex-1 px-3 py-2.5 bg-sand-50 border border-sand-200 rounded-xl text-sm outline-none focus:border-sand-400" />
                      <button onClick={handleAddPackingItem} className="px-3 py-2.5 bg-sand-500 text-white rounded-xl hover:bg-sand-600"><Plus className="w-4 h-4" /></button>
                    </div>
                    <div className="flex gap-1.5 flex-wrap mb-4">
                      {PACKING_TEMPLATES.map(t => (
                        <button key={t} onClick={() => setPackingInput(t)}
                          className="px-2.5 py-1 bg-sand-50 border border-sand-200 text-xs text-sand-600 rounded-full hover:bg-sand-100">{t}</button>
                      ))}
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {(selectedTrip.packing_list || []).map((it, i) => (
                        <div key={i} onClick={() => handlePackingToggle(i)}
                          className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer text-sm transition-all ${it.packed ? "bg-green-50 border border-green-200" : "bg-sand-50 hover:bg-sand-100 border border-transparent"}`}>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${it.packed ? "bg-green-500 border-green-500" : "border-sand-300"}`}>
                            {it.packed && <span className="text-white text-xs font-bold">✓</span>}
                          </div>
                          <span className={it.packed ? "line-through text-sand-400" : "text-sand-700"}>{it.item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-sand-200 rounded-2xl flex flex-col items-center justify-center h-64 text-sand-400">
              <div className="text-4xl mb-2">🗺️</div>
              <p className="text-sm font-medium">Select a trip to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
