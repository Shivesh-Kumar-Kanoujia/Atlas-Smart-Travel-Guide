// @ts-nocheck
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import MapWrapper from './MapWrapper';
import { getTrips as apiGetTrips } from '../lib/api';
import { getNearbyPlaces } from '../lib/api';
import ItinerarySidebar from './ItinerarySidebar';
import TravelTimeline from './TravelTimeline';
import TravelRecommendations from './TravelRecommendations';
import SavedMapsList from './SavedMapsList';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Loader2, MapPin, MapIcon, Utensils, Landmark, ShoppingBag, Train, Star, Clock, Phone, Globe, Navigation, Route, Crosshair, Target, ArrowRight, ListOrdered } from 'lucide-react';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

const DEMO_TRIPS = [
  { id: 1, name: 'Paris', destination: 'Paris, France', latitude: 48.8566, longitude: 2.3522, start_date: '2024-06-01' },
  { id: 2, name: 'Tokyo', destination: 'Tokyo, Japan', latitude: 35.6762, longitude: 139.6503, start_date: '2024-08-15' },
  { id: 3, name: 'New York', destination: 'New York, USA', latitude: 40.7128, longitude: -74.006, start_date: '2024-10-20' },
];

const tripColors = ['#1D9E75', '#378ADD', '#D85A30', '#7F77DD', '#BA7517', '#D4537E'];

// API returns singular type names, but config uses plural keys
const PLACE_TYPE_TO_CONFIG_KEY = {
  restaurant: 'restaurants',
  attraction: 'attractions',
  shopping: 'shopping',
  transport: 'transport',
  other: 'attractions',
};

const CATEGORY_CONFIG = {
  attractions: { label: 'Attractions', icon: Landmark, color: '#D85A30' },
  restaurants: { label: 'Restaurants', icon: Utensils, color: '#378ADD' },
  shopping: { label: 'Shopping', icon: ShoppingBag, color: '#7F77DD' },
  transport: { label: 'Transport', icon: Train, color: '#BA7517' },
};

function getPlaceConfig(placeType) {
  const key = PLACE_TYPE_TO_CONFIG_KEY[placeType] || 'attractions';
  return CATEGORY_CONFIG[key] || CATEGORY_CONFIG.attractions;
}

export default function MapTab() {
  const router = useRouter();
  const [trips, setTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Nearby places state
  const [places, setPlaces] = useState([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [radius, setRadius] = useState(1000);

  // Itinerary state
  const [itineraryMode, setItineraryMode] = useState(false);
  const [timelineMode, setTimelineMode] = useState(false);
  const [selectedItineraryItem, setSelectedItineraryItem] = useState(null);

  // Saved maps state
  const [savedMapsMode, setSavedMapsMode] = useState(false);
  const [mapState, setMapState] = useState(null);

  // Directions state
  const [directionsMode, setDirectionsMode] = useState(false);
  const [startLat, setStartLat] = useState('');
  const [startLon, setStartLon] = useState('');
  const [endLat, setEndLat] = useState('');
  const [endLon, setEndLon] = useState('');
  const [routeInfo, setRouteInfo] = useState(null);
  const [locating, setLocating] = useState(false);

  const directions = useMemo(() => {
    if (!startLat || !startLon || !endLat || !endLon) return null;
    return {
      startLat: parseFloat(startLat),
      startLon: parseFloat(startLon),
      endLat: parseFloat(endLat),
      endLon: parseFloat(endLon),
    };
  }, [startLat, startLon, endLat, endLon]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStartLat(pos.coords.latitude.toFixed(6));
        setStartLon(pos.coords.longitude.toFixed(6));
        setLocating(false);
        toast.success('Location acquired');
      },
      () => {
        toast.error('Could not get location');
        setLocating(false);
      }
    );
  };

  const fillEndFromTrip = () => {
    if (!selectedTrip || !selectedTrip.latitude || !selectedTrip.longitude) {
      toast.error('Select a trip with coordinates first');
      return;
    }
    setEndLat(String(parseFloat(selectedTrip.latitude)));
    setEndLon(String(parseFloat(selectedTrip.longitude)));
  };

  const handleDirectionsReady = (info) => {
    setRouteInfo(info);
  };

  const handleItineraryClick = (dayIdx, slot) => {
    setSelectedItineraryItem({ dayIdx, slot });
  };

  const clearRoute = () => {
    setStartLat('');
    setStartLon('');
    setEndLat('');
    setEndLon('');
    setRouteInfo(null);
    setDirectionsMode(false);
  };

  function formatDistance(meters) {
    if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
    return `${Math.round(meters)} m`;
  }

  function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m} min`;
  }

  // Ref to track latest fetch params to avoid stale closures
  const fetchParamsRef = useRef({ lat: null, lon: null });

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      const res = await apiGetTrips();
      const data = res.data || [];
      setTrips(data);
    } catch {
      console.error('Could not load trips, using demo data');
      setTrips(DEMO_TRIPS);
    } finally {
      setLoading(false);
    }
  };

  const doFetch = useCallback(async (lat: number, lon: number, cat: string | null, rad: number) => {
    fetchParamsRef.current = { lat, lon };
    setPlacesLoading(true);
    setPlaces([]);
    try {
      const res = await getNearbyPlaces(lat, lon, rad, cat || undefined);
      setPlaces(res.data.places || []);
    } catch {
      toast.error('Failed to load nearby places');
    } finally {
      setPlacesLoading(false);
    }
  }, []);

  // Auto-refetch when radius or category changes but trip is still selected
  useEffect(() => {
    const { lat, lon } = fetchParamsRef.current;
    if (lat != null && lon != null) {
      doFetch(lat, lon, activeCategory, radius);
    }
  }, [radius, activeCategory, doFetch]);

  const handleTripSelect = (trip) => {
    setSelectedTrip(trip);
    setPlaces([]);
    setSelectedPlace(null);
    if (trip.latitude && trip.longitude) {
      const lat = parseFloat(trip.latitude);
      const lon = parseFloat(trip.longitude);
      doFetch(lat, lon, activeCategory, radius);
    }
  };

  const handleMarkerClick = (trip) => {
    setSelectedTrip(trip);
    if (trip.latitude && trip.longitude) {
      const lat = parseFloat(trip.latitude);
      const lon = parseFloat(trip.longitude);
      doFetch(lat, lon, activeCategory, radius);
    }
  };

  const filteredTrips = useMemo(() =>
    trips.filter((t) =>
      (t.destination || t.name || '').toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [trips, searchQuery]
  );

  const CategoryIcon = activeCategory ? CATEGORY_CONFIG[activeCategory]?.icon : MapPin;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col lg:flex-row gap-4" style={{ minHeight: '600px' }}>
        {/* Left sidebar */}
        <div className="flex flex-col bg-card rounded-xl border border-border overflow-hidden lg:w-72 shrink-0">
          {/* Trips section */}
          <div className="p-3 border-b border-border">
            <Input
              type="text"
              placeholder="Search trips..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-sm"
            />
          </div>

          <div className="max-h-48 overflow-y-auto border-b border-border">
            {loading ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              </div>
            ) : filteredTrips.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">No trips found</div>
            ) : (
              filteredTrips.map((trip, i) => (
                <div
                  key={trip.id || i}
                  onClick={() => handleTripSelect(trip)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors border-l-[3px]',
                    selectedTrip?.id === trip.id
                      ? 'bg-secondary border-l-primary'
                      : 'hover:bg-accent border-l-transparent'
                  )}
                >
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ background: tripColors[i % tripColors.length] }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground truncate">
                      {trip.destination || trip.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {trip.start_date || 'No date set'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Mode toggle + Nearby places / Directions section */}
          {selectedTrip && selectedTrip.latitude && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-3 border-b border-border space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    <button
                      onClick={() => { setDirectionsMode(false); setItineraryMode(false); setTimelineMode(false); }}
                      className={cn(
                        'px-2 py-1 rounded text-[10px] font-medium transition-all',
                        !directionsMode && !itineraryMode && !timelineMode
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      Places
                    </button>
                    <button
                      onClick={() => { setDirectionsMode(true); setItineraryMode(false); }}
                      className={cn(
                        'px-2 py-1 rounded text-[10px] font-medium transition-all',
                        directionsMode
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Route className="w-3 h-3 inline mr-1" />
                      Directions
                    </button>
                    <button
                      onClick={() => { setItineraryMode((p) => !p); setDirectionsMode(false); setTimelineMode(false); }}
                      className={cn(
                        'px-2 py-1 rounded text-[10px] font-medium transition-all',
                        itineraryMode
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                      disabled={!selectedTrip?.itinerary?.length}
                      title={selectedTrip?.itinerary?.length ? 'Day view' : 'Generate an itinerary first'}
                    >
                      <ListOrdered className="w-3 h-3 inline mr-1" />
                      Days
                    </button>
                    <button
                      onClick={() => { setTimelineMode((p) => !p); setDirectionsMode(false); setItineraryMode(false); }}
                      className={cn(
                        'px-2 py-1 rounded text-[10px] font-medium transition-all',
                        timelineMode
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                      disabled={!selectedTrip?.itinerary?.length}
                      title={selectedTrip?.itinerary?.length ? 'Timeline view' : 'Generate an itinerary first'}
                    >
                      <Clock className="w-3 h-3 inline mr-1" />
                      Timeline
                    </button>
                    <button
                      onClick={() => { setSavedMapsMode((p) => !p); setDirectionsMode(false); setItineraryMode(false); setTimelineMode(false); }}
                      className={cn(
                        'px-2 py-1 rounded text-[10px] font-medium transition-all',
                        savedMapsMode
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                      title="Saved map views"
                    >
                      <MapIcon className="w-3 h-3 inline mr-1" />
                      Saved
                    </button>
                  </div>
                  {!directionsMode && (
                    <select
                      value={radius}
                      onChange={(e) => setRadius(Number(e.target.value))}
                      className="text-xs bg-secondary rounded-md px-1.5 py-0.5 border border-border outline-none"
                    >
                      <option value={500}>500m</option>
                      <option value={1000}>1km</option>
                      <option value={2000}>2km</option>
                      <option value={5000}>5km</option>
                    </select>
                  )}
                </div>

                {!directionsMode && (
                  <div className="flex gap-1 flex-wrap">
                    {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => {
                      const Icon = cfg.icon;
                      return (
                        <button
                          key={key}
                          onClick={() => {
                            const next = activeCategory === key ? null : key;
                            setActiveCategory(next);
                            setSelectedPlace(null);
                          }}
                          className={cn(
                            'flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-all border',
                            activeCategory === key
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-secondary text-secondary-foreground border-border hover:bg-accent'
                          )}
                        >
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                {directionsMode && (
                  <div className="space-y-2 pt-1">
                    {/* Start point */}
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-1">Start</label>
                      <div className="flex gap-1">
                        <input
                          value={startLat}
                          onChange={(e) => setStartLat(e.target.value)}
                          placeholder="Latitude"
                          className="flex-1 text-[10px] bg-secondary rounded px-1.5 py-1 border border-border outline-none w-0"
                        />
                        <input
                          value={startLon}
                          onChange={(e) => setStartLon(e.target.value)}
                          placeholder="Longitude"
                          className="flex-1 text-[10px] bg-secondary rounded px-1.5 py-1 border border-border outline-none w-0"
                        />
                        <button
                          onClick={useMyLocation}
                          disabled={locating}
                          className="px-1.5 py-1 bg-secondary rounded text-[10px] font-medium hover:bg-accent transition-all shrink-0 disabled:opacity-50"
                          title="Use my location"
                        >
                          {locating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Crosshair className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                    {/* End point */}
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-1">Destination</label>
                      <div className="flex gap-1">
                        <input
                          value={endLat}
                          onChange={(e) => setEndLat(e.target.value)}
                          placeholder="Latitude"
                          className="flex-1 text-[10px] bg-secondary rounded px-1.5 py-1 border border-border outline-none w-0"
                        />
                        <input
                          value={endLon}
                          onChange={(e) => setEndLon(e.target.value)}
                          placeholder="Longitude"
                          className="flex-1 text-[10px] bg-secondary rounded px-1.5 py-1 border border-border outline-none w-0"
                        />
                        <button
                          onClick={fillEndFromTrip}
                          className="px-1.5 py-1 bg-secondary rounded text-[10px] font-medium hover:bg-accent transition-all shrink-0"
                          title="Use trip coordinates"
                        >
                          <Target className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        <button
                          onClick={fillEndFromTrip}
                          className="text-primary hover:underline"
                        >
                          Use trip: {selectedTrip.destination || selectedTrip.name}
                        </button>
                      </div>
                    </div>
                    {/* Route info */}
                    {routeInfo && (
                      <div className="bg-secondary rounded-lg p-2 text-[10px] space-y-1">
                        <div className="flex items-center gap-2 text-foreground font-medium">
                          <Route className="w-3 h-3 text-primary" />
                          <span>{formatDistance(routeInfo.distance)}</span>
                          <ArrowRight className="w-3 h-3 text-muted-foreground" />
                          <span>{formatDuration(routeInfo.duration)}</span>
                        </div>
                      </div>
                    )}
                    <div className="flex gap-1">
                      {(!startLat || !endLat) && (
                        <p className="text-[10px] text-muted-foreground">
                          Enter coordinates or use location buttons above
                        </p>
                      )}
                      {routeInfo && (
                        <button
                          onClick={clearRoute}
                          className="text-[10px] text-destructive hover:underline"
                        >
                          Clear route
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Travel recommendations */}
              {!directionsMode && !itineraryMode && !timelineMode && !savedMapsMode && (
                <TravelRecommendations places={places} />
              )}

              {/* Content area: saved maps, timeline, itinerary, or places */}
              {savedMapsMode ? (
                <div className="flex-1 overflow-hidden">
                  <SavedMapsList
                    currentMapState={mapState}
                    tripId={selectedTrip?.id}
                    onLoadMap={(savedMap) => {
                      // Will be enhanced to restore full map state
                      setSavedMapsMode(false);
                    }}
                  />
                </div>
              ) : timelineMode && selectedTrip?.itinerary?.length > 0 ? (
                <div className="flex-1 overflow-hidden">
                  <TravelTimeline
                    itinerary={selectedTrip.itinerary}
                    onItemClick={(dayIdx, slot) => handleItineraryClick(dayIdx, slot)}
                    selectedDay={selectedItineraryItem?.dayIdx ?? null}
                    selectedSlot={selectedItineraryItem?.slot ?? null}
                  />
                </div>
              ) : itineraryMode && selectedTrip?.itinerary?.length > 0 ? (
                <div className="flex-1 overflow-hidden">
                  <ItinerarySidebar
                    itinerary={selectedTrip.itinerary}
                    onItemClick={(dayIdx, slot) => handleItineraryClick(dayIdx, slot)}
                    selectedDay={selectedItineraryItem?.dayIdx ?? null}
                    selectedSlot={selectedItineraryItem?.slot ?? null}
                  />
                </div>
              ) : (itineraryMode || timelineMode) && (!selectedTrip?.itinerary || selectedTrip.itinerary.length === 0) ? (
                <div className="flex-1 flex items-center justify-center p-4 text-center">
                  <div>
                    <ListOrdered className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-xs text-muted-foreground">No itinerary yet</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Generate one in the Trip Manager</p>
                  </div>
                </div>
              ) : !directionsMode && (
                <div className="flex-1 overflow-y-auto">
                  {placesLoading ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" />
                      Loading places...
                    </div>
                  ) : places.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      <MapPin className="w-6 h-6 mx-auto mb-1 opacity-40" />
                      {activeCategory
                        ? `No ${CATEGORY_CONFIG[activeCategory]?.label.toLowerCase()} found nearby`
                        : 'Select a category to explore'}
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      <p className="text-[10px] text-muted-foreground px-1 mb-1">
                        {places.length} place{places.length !== 1 ? 's' : ''} found
                      </p>
                      {places.map((place) => {
                        const cfg = getPlaceConfig(place.type);
                        const Icon = cfg.icon;
                        return (
                          <div
                            key={place.id}
                            onClick={() => { setSelectedPlace(place); setEndLat(String(place.lat)); setEndLon(String(place.lon)); setDirectionsMode(true); }}
                            className={cn(
                              'flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-all text-xs',
                              selectedPlace?.id === place.id
                                ? 'bg-accent border border-border'
                                : 'hover:bg-secondary border border-transparent'
                            )}
                          >
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                              style={{ background: `${cfg.color}20`, color: cfg.color }}
                            >
                              <Icon className="w-3 h-3" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-foreground truncate">{place.name}</div>
                              {place.cuisine && (
                                <div className="text-muted-foreground">{place.cuisine}</div>
                              )}
                              {place.address && (
                                <div className="text-muted-foreground truncate">{place.address}</div>
                              )}
                              {place.rating && (
                                <div className="flex items-center gap-1 text-amber-500 mt-0.5">
                                  <Star className="w-3 h-3 fill-current" />
                                  <span>{place.rating.toFixed(1)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Trip summary footer */}
          {selectedTrip && (
            <div className="p-3 border-t border-border bg-secondary/50 shrink-0">
              <div className="text-xs font-medium text-foreground mb-1">
                {selectedTrip.destination || selectedTrip.name}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {selectedTrip.budget ? `Budget: $${selectedTrip.budget}` : 'No budget set'}
              </div>
              <button
                onClick={() => { setSelectedTrip(null); setPlaces([]); setSelectedPlace(null); }}
                className="text-[10px] text-primary hover:text-primary/80 transition-colors mt-1"
              >
                Clear selection
              </button>
            </div>
          )}
        </div>

        {/* Map */}
        <div className="flex-1 rounded-xl overflow-hidden border border-border relative">
          <MapWrapper
            trips={filteredTrips.map((t, i) => ({ ...t, _color: tripColors[i % tripColors.length] }))}
            places={places}
            itinerary={itineraryMode && selectedTrip?.itinerary ? selectedTrip.itinerary : []}
            selectedPlace={selectedPlace}
            selectedItineraryItem={selectedItineraryItem}
            onMarkerClick={handleMarkerClick}
            onPlaceClick={setSelectedPlace}
            onItineraryClick={handleItineraryClick}
            editMode={!!selectedTrip}
            directions={directions}
            onDirectionsReady={handleDirectionsReady}
            onMapStateChange={setMapState}
          />

          {/* Stats bar */}
          <div className="absolute bottom-4 left-4 bg-card rounded-lg px-3 py-2 text-xs text-muted-foreground border border-border z-[1000] flex items-center gap-3">
            <span>
              <span className="font-medium text-foreground">{trips.length}</span> trips
            </span>
            {places.length > 0 && !directionsMode && (
              <span>
                <span className="font-medium text-foreground">{places.length}</span> nearby
              </span>
            )}
            {routeInfo && (
              <span className="flex items-center gap-1">
                <Route className="w-3 h-3 text-primary" />
                <span className="font-medium text-foreground">{formatDistance(routeInfo.distance)}</span>
                <span className="text-[10px]">&middot;</span>
                <span>{formatDuration(routeInfo.duration)}</span>
              </span>
            )}
          </div>

          {/* Mobile bottom-sheet for timeline */}
          {selectedTrip?.itinerary?.length > 0 && selectedItineraryItem && (
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-[2000] animate-in slide-in-from-bottom-4 duration-300">
              <div className="bg-card border-t border-border rounded-t-2xl shadow-2xl max-h-[50vh] flex flex-col">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-5 rounded-full bg-primary" />
                    <span className="text-xs font-semibold text-foreground">Activity</span>
                  </div>
                  <button
                    onClick={() => setSelectedItineraryItem(null)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Close
                  </button>
                </div>
                <div className="overflow-y-auto flex-1 px-1">
                  <TravelTimeline
                    itinerary={selectedTrip.itinerary}
                    onItemClick={(dayIdx, slot) => handleItineraryClick(dayIdx, slot)}
                    selectedDay={selectedItineraryItem?.dayIdx ?? null}
                    selectedSlot={selectedItineraryItem?.slot ?? null}
                  />
                </div>
              </div>
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-black/20 -z-10"
                onClick={() => setSelectedItineraryItem(null)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Place detail panel */}
      {selectedPlace && (
        <div className="bg-card border border-border rounded-2xl p-5 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: `${getPlaceConfig(selectedPlace.type).color}20`,
                  color: getPlaceConfig(selectedPlace.type).color,
                }}
              >
                <CategoryIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold text-foreground">
                  {selectedPlace.name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {selectedPlace.type}
                  </Badge>
                  {selectedPlace.cuisine && (
                    <span>{selectedPlace.cuisine}</span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setSelectedPlace(null)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {selectedPlace.address && (
              <div className="bg-secondary rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <MapPin className="w-3.5 h-3.5" />
                  Address
                </div>
                <div className="text-sm text-foreground">{selectedPlace.address}</div>
              </div>
            )}
            {selectedPlace.phone && (
              <div className="bg-secondary rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Phone className="w-3.5 h-3.5" />
                  Phone
                </div>
                <div className="text-sm text-foreground">{selectedPlace.phone}</div>
              </div>
            )}
            {selectedPlace.opening_hours && (
              <div className="bg-secondary rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Clock className="w-3.5 h-3.5" />
                  Hours
                </div>
                <div className="text-sm text-foreground">{selectedPlace.opening_hours}</div>
              </div>
            )}
            {selectedPlace.rating && (
              <div className="bg-secondary rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Star className="w-3.5 h-3.5" />
                  Rating
                </div>
                <div className="text-sm text-foreground font-semibold flex items-center gap-1">
                  <Star className="w-4 h-4 text-amber-500 fill-current" />
                  {selectedPlace.rating.toFixed(1)}
                </div>
              </div>
            )}
          </div>

          {selectedPlace.description && (
            <p className="mt-3 text-sm text-muted-foreground bg-secondary rounded-xl p-3">
              {selectedPlace.description}
            </p>
          )}

          <div className="flex gap-2 mt-4">
            {selectedPlace.lat && selectedPlace.lon && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  window.open(
                    `https://www.google.com/maps/dir/?api=1&destination=${selectedPlace.lat},${selectedPlace.lon}`,
                    '_blank'
                  );
                }}
              >
                <Navigation className="w-4 h-4 mr-1.5" />
                Open in Google Maps
              </Button>
            )}
            {selectedPlace.website && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(selectedPlace.website, '_blank')}
              >
                <Globe className="w-4 h-4 mr-1.5" />
                Website
              </Button>
            )}
          </div>
        </div>
      )}

      {trips.some((t) => !t.latitude) && (
        <div className="text-xs text-muted-foreground bg-secondary rounded-lg px-4 py-2 border border-border">
          Some trips don&apos;t have coordinates yet. Edit a trip and add a location to pin it on the map and explore nearby places.
        </div>
      )}
    </div>
  );
}
