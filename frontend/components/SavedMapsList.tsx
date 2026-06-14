// @ts-nocheck
import { useState, useEffect } from 'react';
import { getSavedMaps, saveMap, deleteSavedMap, updateSavedMap } from '../lib/api';
import { Map as MapIcon, Save, Trash2, Edit2, Check, X, Loader2, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';

export default function SavedMapsList({ currentMapState, tripId, onLoadMap }) {
  const [maps, setMaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [saveName, setSaveName] = useState('');

  const fetchMaps = async () => {
    try {
      const res = await getSavedMaps();
      setMaps(res.data.maps || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaps();
  }, []);

  const handleSave = async () => {
    if (!currentMapState) return;
    setSaving(true);
    try {
      const res = await saveMap({
        name: saveName || `Map ${maps.length + 1}`,
        map_state: currentMapState,
        trip_id: tripId,
      });
      setMaps((prev) => [res.data.map, ...prev]);
      setSaveName('');
      toast.success('Map saved');
    } catch {
      toast.error('Failed to save map');
    } finally {
      setSaving(false);
    }
  };

  const handleRename = async (id) => {
    if (!editName.trim()) return;
    try {
      await updateSavedMap(id, { name: editName });
      setMaps((prev) => prev.map((m) => (m.id === id ? { ...m, name: editName } : m)));
      setEditingId(null);
      toast.success('Renamed');
    } catch {
      toast.error('Failed to rename');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteSavedMap(id);
      setMaps((prev) => prev.filter((m) => m.id !== id));
      toast.success('Map deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border shrink-0">
        <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <MapIcon className="w-3.5 h-3.5 text-primary" />
          Saved Maps
        </div>
      </div>

      {/* Save current view */}
      {currentMapState && (
        <div className="px-3 py-2 border-b border-border space-y-1.5">
          <input
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Name this view..."
            className="w-full text-[10px] bg-secondary rounded px-2 py-1 border border-border outline-none"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-primary text-primary-foreground rounded-lg text-[10px] font-medium hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Save Current View
          </button>
        </div>
      )}

      {/* Saved maps list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-muted-foreground text-xs">
            <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" />
          </div>
        ) : maps.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-xs">
            <MapIcon className="w-6 h-6 mx-auto mb-1 opacity-40" />
            No saved maps yet
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {maps.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent transition-colors group"
              >
                <MapIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />

                {editingId === m.id ? (
                  <div className="flex-1 flex items-center gap-1 min-w-0">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 text-[10px] bg-secondary rounded px-1.5 py-0.5 border border-border outline-none min-w-0"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(m.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                    />
                    <button onClick={() => handleRename(m.id)} className="text-primary hover:text-primary/80">
                      <Check className="w-3 h-3" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => onLoadMap && onLoadMap(m)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="text-[11px] font-medium text-foreground truncate">{m.name}</div>
                      <div className="text-[9px] text-muted-foreground">
                        {m.created_at ? new Date(m.created_at).toLocaleDateString() : ''}
                      </div>
                    </button>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditingId(m.id); setEditName(m.name); }}
                        className="p-1 text-muted-foreground hover:text-foreground rounded"
                        title="Rename"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="p-1 text-muted-foreground hover:text-destructive rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
