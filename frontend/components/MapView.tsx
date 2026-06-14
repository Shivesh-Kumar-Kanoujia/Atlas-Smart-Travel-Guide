// @ts-nocheck
import { useEffect, useRef, useCallback, useState } from 'react';
import { PLACE_MARKERS, buildMarkerHtml } from '../lib/mapMarkers';
import { buildPlacePopupHtml, buildTripPopupHtml } from '../lib/mapPopup';
import MapWeatherOverlay from './MapWeatherOverlay';

let leafletModule = null;
async function getLeaflet() {
  if (!leafletModule) leafletModule = await import('leaflet');
  return leafletModule.default;
}

const TILE_LAYERS = {
  Street: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  Dark: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png',
};

const TILE_ATTR = {
  Street: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>',
  Dark: '&copy; <a href="https://stadiamaps.com">Stadia Maps</a>',
};

const TRIP_COLORS = ['#1D9E75', '#378ADD', '#D85A30', '#7F77DD', '#BA7517', '#D4537E'];
const DAY_COLORS = TRIP_COLORS;

export default function MapView({
  trips = [],
  places = [],
  itinerary = [],
  selectedPlace = null,
  selectedItineraryItem = null,
  onMarkerClick,
  onPlaceClick,
  onItineraryClick,
  editMode = false,
  directions = null,
  onDirectionsReady,
  onMapStateChange,
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tripMarkersRef = useRef(null);
  const placeMarkersRef = useRef(null);
  const routeRef = useRef(null);
  const clickMarkerRef = useRef(null);
  const layersControlRef = useRef(null);
  const routingControlRef = useRef(null);
  const myLocationMarkerRef = useRef(null);
  const myLocationCircleRef = useRef(null);
  const tileLayersRef = useRef({});
  const itineraryMarkersRef = useRef(null);
  const itineraryRoutesRef = useRef([]);
  const heatmapLayerRef = useRef(null);
  const heatmapVisibleRef = useRef(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [locating, setLocating] = useState(false);
  const [itinerarySummary, setItinerarySummary] = useState(null);
  const [mapCenter, setMapCenter] = useState([20, 0]);
  const [heatmapActive, setHeatmapActive] = useState(false);
  const [pinMode, setPinMode] = useState(false);
  const [pins, setPins] = useState([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [capturing, setCapturing] = useState(false);
  const pinsLayerRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const searchInputRef = useRef(null);

  // Keyboard shortcut for search focus
  useEffect(() => {
    const handler = (e) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const initMap = useCallback(async () => {
    if (mapInstanceRef.current || typeof window === 'undefined') return;

    const L = await getLeaflet();

    // Clear stale Leaflet container ID from React Strict Mode double-mounts
    if (mapRef.current._leaflet_id) {
      delete mapRef.current._leaflet_id;
    }

    await Promise.all([
      import('leaflet.markercluster'),
      import('leaflet-fullscreen'),
      import('leaflet-gesture-handling'),
    ]);

    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const map = L.map(mapRef.current, {
      center: [20, 0],
      zoom: 2,
      zoomControl: false,
      gestureHandling: true,
      fullscreenControl: true,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const baseMaps = {};
    Object.entries(TILE_LAYERS).forEach(([name, url]) => {
      const layer = L.tileLayer(url, {
        attribution: TILE_ATTR[name],
        maxZoom: 19,
      });
      baseMaps[name] = layer;
      tileLayersRef.current[name] = layer;
    });

    baseMaps.Street.addTo(map);
    layersControlRef.current = L.control
      .layers(baseMaps, null, { position: 'topleft', collapsed: true })
      .addTo(map);

    // Trip markers cluster group
    const tripCluster = L.markerClusterGroup({
      chunkedLoading: true,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      maxClusterRadius: 50,
    });
    tripMarkersRef.current = tripCluster;
    map.addLayer(tripCluster);

    // Place markers cluster group
    const placeCluster = L.markerClusterGroup({
      chunkedLoading: true,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      maxClusterRadius: 40,
    });
    placeMarkersRef.current = placeCluster;
    map.addLayer(placeCluster);

    // Itinerary markers layer (not clustered — day markers should be visible)
    itineraryMarkersRef.current = L.featureGroup();
    itineraryMarkersRef.current.addTo(map);

    map.on('click', (e) => {
      if (!editMode) return;
      if (clickMarkerRef.current) {
        map.removeLayer(clickMarkerRef.current);
      }
      clickMarkerRef.current = L.marker([e.latlng.lat, e.latlng.lng], {
        draggable: true,
      })
        .addTo(map)
        .bindPopup(
          `<div style="font-family:'DM Sans',sans-serif;min-width:180px">
            <div style="font-weight:600;font-size:14px;margin-bottom:6px">New Location</div>
            <div style="font-size:12px;color:#666">${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}</div>
            <div style="font-size:11px;color:#999;margin-top:4px">Drag to adjust &bull; Save in trip form</div>
          </div>`
        )
        .openPopup();
    });

    // Track map center for weather + saved maps
    const updateCenter = () => {
      const c = map.getCenter();
      const state = { lat: c.lat, lng: c.lng, zoom: map.getZoom() };
      setMapCenter([c.lat, c.lng]);
      if (onMapStateChange) onMapStateChange(state);
    };
    map.on('load', updateCenter);
    map.on('moveend', updateCenter);
    updateCenter();

    // Handle shared map URL: ?map=lat,lng,zoom
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const mapParam = params.get('map');
      if (mapParam) {
        const parts = mapParam.split(',').map(Number);
        if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
          map.setView([parts[0], parts[1]], Math.min(Math.max(Math.round(parts[2]), 1), 19));
        }
      }
    }

    mapInstanceRef.current = map;
    setMapReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode]);

  const switchLayer = useCallback((name) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    Object.entries(tileLayersRef.current).forEach(([key, layer]) => {
      if (key === name) {
        map.addLayer(layer);
      } else {
        map.removeLayer(layer);
      }
    });
  }, []);

  const handleSearchChange = useCallback((e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`,
          {
            headers: {
              'User-Agent': 'AtlasTravelAI/2.0 (smart-travel-guide)',
              'Accept': 'application/json',
            },
          }
        );
        if (!res.ok) throw new Error(`Nominatim ${res.status}`);
        const data = await res.json();
        setSearchResults(data || []);
        setShowSearchResults(true);
      } catch (err) {
        console.error('Map search failed:', err);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 400);
  }, []);

  const handleSelectResult = useCallback((result) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    map.flyTo([lat, lon], 14, { duration: 1 });

    setSearchQuery(result.display_name.split(',')[0]);
    setShowSearchResults(false);
    if (searchInputRef.current) searchInputRef.current.blur();
  }, []);

  const handleMyLocation = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || typeof window === 'undefined') return;

    if (locating) return;
    setLocating(true);

    if (!navigator.geolocation) {
      setLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const L = await getLeaflet();
        const { lat, lng } = pos.coords;

        // Remove existing marker/circle
        if (myLocationMarkerRef.current) {
          map.removeLayer(myLocationMarkerRef.current);
        }
        if (myLocationCircleRef.current) {
          map.removeLayer(myLocationCircleRef.current);
        }

        const pulseIcon = L.divIcon({
          className: '',
          html: `<div style="
            width:20px;height:20px;
            background:#1D9E75;
            border:3px solid #fff;
            border-radius:50%;
            box-shadow:0 0 0 4px rgba(29,158,117,0.3);
          "></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        myLocationMarkerRef.current = L.marker([lat, lng], { icon: pulseIcon }).addTo(map);
        myLocationCircleRef.current = L.circle([lat, lng], {
          radius: 50,
          color: '#1D9E75',
          fillColor: '#1D9E75',
          fillOpacity: 0.1,
          weight: 1,
        }).addTo(map);

        map.flyTo([lat, lng], 15, { duration: 1 });
        setLocating(false);
      },
      () => {
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [locating]);

  const toggleHeatmap = useCallback(async () => {
    const map = mapInstanceRef.current;
    if (!map || typeof window === 'undefined') return;

    const L = await getLeaflet();

    if (heatmapActive) {
      if (heatmapLayerRef.current) {
        map.removeLayer(heatmapLayerRef.current);
        heatmapLayerRef.current = null;
      }
      heatmapVisibleRef.current = false;
      setHeatmapActive(false);
      return;
    }

    // Collect all place coordinates as heatmap points
    const points = [];
    places.forEach((p) => {
      const lat = p.lat || p.latitude;
      const lon = p.lon || p.longitude;
      if (lat && lon) {
        // Weighted: higher rating = brighter
        const weight = p.rating ? p.rating / 5 : 0.5;
        points.push([lat, lon, weight]);
      }
    });
    // Also add trip coordinates
    trips.forEach((t) => {
      if (t.latitude && t.longitude) {
        points.push([parseFloat(t.latitude), parseFloat(t.longitude), 1]);
      }
    });

    if (!points.length) return;

    try {
      // @ts-ignore - leaflet.heat doesn't have types
      const heat = L.heatLayer(points, {
        radius: 30,
        blur: 20,
        maxZoom: 17,
        max: 1.0,
        gradient: { 0.4: '#378ADD', 0.6: '#D85A30', 0.8: '#e8a317', 1.0: '#D4537E' },
      });
      heat.addTo(map);
      heatmapLayerRef.current = heat;
      heatmapVisibleRef.current = true;
      setHeatmapActive(true);
    } catch (e) {
      // leaflet.heat not loaded
    }
  }, [places, trips, heatmapActive]);

  const captureScreenshot = useCallback(async () => {
    if (!mapRef.current || typeof window === 'undefined') return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(mapRef.current, {
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#fff',
      });
      const link = document.createElement('a');
      link.download = 'atlas-map-view.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      // silent
    }
  }, []);

  const updateTripMarkers = useCallback(async () => {
    const map = mapInstanceRef.current;
    if (!map || typeof window === 'undefined') return;

    const L = await getLeaflet();

    if (tripMarkersRef.current) {
      tripMarkersRef.current.clearLayers();
    }
    if (routeRef.current) {
      routeRef.current.remove();
      routeRef.current = null;
    }

    if (!trips.length) return;

    const coords = [];

    trips.forEach((trip, i) => {
      if (!trip.latitude || !trip.longitude) return;
      const lat = parseFloat(trip.latitude);
      const lng = parseFloat(trip.longitude);
      coords.push([lat, lng]);

      const color = TRIP_COLORS[i % TRIP_COLORS.length];

      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width:32px;height:32px;
          background:${color};
          border:3px solid #fff;
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          box-shadow:0 2px 8px rgba(0,0,0,0.25);
          cursor:pointer;
          transition:transform 0.2s;
        "></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -36],
      });

      const marker = L.marker([lat, lng], { icon });

      marker.bindPopup(buildTripPopupHtml(trip, color), {
        maxWidth: 260,
        className: 'custom-map-popup',
      });

      if (onMarkerClick) {
        marker.on('click', () => onMarkerClick(trip));
      }

      tripMarkersRef.current.addLayer(marker);
    });

    if (coords.length >= 2) {
      routeRef.current = L.polyline(coords, {
        color: '#1D9E75',
        weight: 3,
        opacity: 0.8,
        dashArray: '8 6',
      }).addTo(map);
    }

    if (coords.length) {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [60, 60] });
    }
  }, [trips, onMarkerClick]);

  const updatePlaceMarkers = useCallback(async () => {
    const map = mapInstanceRef.current;
    if (!map || typeof window === 'undefined') return;

    const L = await getLeaflet();

    if (placeMarkersRef.current) {
      placeMarkersRef.current.clearLayers();
    }

    if (!places.length) return;

    const placeCoords = [];

    places.forEach((place) => {
      if (!place.lat && !place.latitude) return;
      const lat = place.lat || place.latitude;
      const lon = place.lon || place.longitude;
      placeCoords.push([lat, lon]);

      const config = PLACE_MARKERS[place.type] || PLACE_MARKERS.other;
      place._markerColor = config.color;

      const icon = L.divIcon({
        className: '',
        html: buildMarkerHtml(config),
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -20],
      });

      const marker = L.marker([lat, lon], { icon });

      marker.bindPopup(buildPlacePopupHtml(place, config.color), {
        maxWidth: 260,
        className: 'custom-map-popup',
      });

      if (onPlaceClick) {
        marker.on('click', () => onPlaceClick(place));
      }

      placeMarkersRef.current.addLayer(marker);
    });

    if (!trips.length && placeCoords.length) {
      const bounds = L.latLngBounds(placeCoords);
      map.fitBounds(bounds, { padding: [60, 60] });
    }
  }, [places, trips.length, onPlaceClick]);

  const getItineraryItems = useCallback(() => {
    const items = [];
    (itinerary || []).forEach((day, dayIdx) => {
      ['morning', 'afternoon', 'evening'].forEach((slot) => {
        const s = day[slot];
        if (s && s.latitude && s.longitude && s.activity) {
          items.push({
            dayIdx,
            slot,
            dayNumber: day.day,
            lat: s.latitude,
            lon: s.longitude,
            activity: s.activity,
            time: s.time,
            description: s.description,
            cost: s.cost,
            color: DAY_COLORS[dayIdx % DAY_COLORS.length],
          });
        }
      });
    });
    return items;
  }, [itinerary]);

  const updateItineraryMarkers = useCallback(async () => {
    const map = mapInstanceRef.current;
    if (!map || typeof window === 'undefined') return;

    const L = await getLeaflet();

    // Clear previous markers
    if (itineraryMarkersRef.current) {
      itineraryMarkersRef.current.clearLayers();
    }
    itineraryRoutesRef.current.forEach((r) => r.remove());
    itineraryRoutesRef.current = [];

    const items = getItineraryItems();
    if (!items.length) {
      setItinerarySummary(null);
      return;
    }

    // Group items by day for route drawing
    const byDay = {};
    items.forEach((item) => {
      if (!byDay[item.dayIdx]) byDay[item.dayIdx] = [];
      byDay[item.dayIdx].push(item);
    });

    let totalStops = 0;
    let totalKm = 0;

    Object.entries(byDay).forEach(([dayIdxStr, dayItems]) => {
      const dayIdx = Number(dayIdxStr);
      const color = DAY_COLORS[dayIdx % DAY_COLORS.length];
      const coords = [];

      dayItems.forEach((item, seqIdx) => {
        const lat = typeof item.lat === 'number' ? item.lat : parseFloat(item.lat);
        const lon = typeof item.lon === 'number' ? item.lon : parseFloat(item.lon);
        if (isNaN(lat) || isNaN(lon)) return;
        coords.push([lat, lon]);
        totalStops++;

        const seq = seqIdx + 1;
        const label = `${item.dayNumber}.${seq}`;

        const icon = L.divIcon({
          className: '',
          html: `<div style="
            width:28px;height:28px;
            background:${color};
            border:2px solid #fff;
            border-radius:8px;
            box-shadow:0 2px 8px rgba(0,0,0,0.25);
            display:flex;
            align-items:center;
            justify-content:center;
            color:white;
            font-size:11px;
            font-weight:700;
            font-family:'DM Sans',sans-serif;
            cursor:pointer;
            transition:transform 0.15s;
          ">${seq}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
          popupAnchor: [0, -16],
        });

        const marker = L.marker([lat, lon], { icon });

        const slotLabel = item.slot.charAt(0).toUpperCase() + item.slot.slice(1);
        marker.bindPopup(
          `<div style="font-family:'DM Sans',sans-serif;min-width:190px">
            <div style="height:3px;background:${color};border-radius:3px 3px 0 0;margin:-12px -12px 8px -12px"></div>
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
              <div style="width:18px;height:18px;border-radius:5px;background:${color};color:white;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700">${seq}</div>
              <div style="font-size:10px;color:#888;font-weight:500">Day ${item.dayNumber} &middot; ${slotLabel}</div>
            </div>
            <div style="font-weight:700;font-size:13px;color:#1a1a1a;margin-bottom:2px">${item.activity}</div>
            ${item.description ? `<div style="font-size:10px;color:#666;margin-bottom:4px">${item.description}</div>` : ''}
            <div style="display:flex;align-items:center;gap:8px;font-size:10px;color:#888">
              <span>⏰ ${item.time || ''}</span>
              ${item.cost ? `<span>💰 ${item.cost}</span>` : ''}
            </div>
          </div>`,
          { maxWidth: 240, className: 'custom-map-popup' }
        );

        marker.on('click', () => {
          if (onItineraryClick) onItineraryClick(item.dayIdx, item.slot);
        });

        itineraryMarkersRef.current.addLayer(marker);
      });

      // Draw route between same-day activities (need 2+ points)
      if (coords.length >= 2) {
        const route = L.polyline(coords, {
          color,
          weight: 3,
          opacity: 0.6,
          dashArray: '6 4',
        }).addTo(map);
        itineraryRoutesRef.current.push(route);

        // Calculate rough distance (Haversine)
        for (let i = 1; i < coords.length; i++) {
          const [lat1, lon1] = coords[i - 1];
          const [lat2, lon2] = coords[i];
          const R = 6371;
          const dLat = ((lat2 - lat1) * Math.PI) / 180;
          const dLon = ((lon2 - lon1) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos((lat1 * Math.PI) / 180) *
              Math.cos((lat2 * Math.PI) / 180) *
              Math.sin(dLon / 2) ** 2;
          totalKm += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        }
      }
    });

    setItinerarySummary({
      stops: totalStops,
      distance: totalKm,
      days: Object.keys(byDay).length,
    });

    // Fit bounds to itinerary items
    if (items.length && !trips.length && !places.length) {
      const bounds = L.latLngBounds(items.map((i) => [i.lat, i.lon]));
      map.fitBounds(bounds, { padding: [60, 60] });
    }
  }, [getItineraryItems, onItineraryClick, trips.length, places.length]);

  const updateDirections = useCallback(async () => {
    const map = mapInstanceRef.current;
    if (!map || typeof window === 'undefined') return;

    if (routingControlRef.current) {
      map.removeControl(routingControlRef.current);
      routingControlRef.current = null;
    }

    if (!directions) return;

    const L = await getLeaflet();
    const Routing = (await import('leaflet-routing-machine')).default;

    const waypoints = [
      L.latLng(directions.startLat, directions.startLon),
      L.latLng(directions.endLat, directions.endLon),
    ];

    routingControlRef.current = Routing.control({
      waypoints,
      routeWhileDragging: true,
      showAlternatives: true,
      fitSelectedRoutes: true,
      show: true,
      lineOptions: {
        styles: [
          { color: '#1D9E75', weight: 5, opacity: 0.8 },
          { color: '#1D9E75', weight: 3, opacity: 0.5, dashArray: '8 8' },
        ],
      },
      plan: Routing.plan(waypoints, {
        draggableWaypoints: true,
        addWaypoints: false,
      }),
    }).addTo(map);

    if (onDirectionsReady) {
      routingControlRef.current.on('routesfound', (e) => {
        const route = e.routes[0];
        onDirectionsReady({
          distance: route.summary.totalDistance,
          duration: route.summary.totalTime,
          instructions: route.instructions,
        });
      });
    }
  }, [directions, onDirectionsReady]);

  const highlightPlace = useCallback(async () => {
    const map = mapInstanceRef.current;
    if (!map || !selectedPlace || typeof window === 'undefined') return;

    const L = await getLeaflet();

    if (clickMarkerRef.current) {
      map.removeLayer(clickMarkerRef.current);
    }

    if (selectedPlace.lat && selectedPlace.lon) {
      const pulseIcon = L.divIcon({
        className: '',
        html: `<div style="
          width:40px;height:40px;
          background:rgba(29,158,117,0.3);
          border:3px solid #1D9E75;
          border-radius:50%;
          animation:map-pulse 1.5s infinite;
        "></div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      clickMarkerRef.current = L.marker([selectedPlace.lat, selectedPlace.lon], {
        icon: pulseIcon,
      }).addTo(map);

      map.setView([selectedPlace.lat, selectedPlace.lon], map.getZoom() < 15 ? 15 : map.getZoom());
    }
  }, [selectedPlace]);

  const highlightItineraryItem = useCallback(async () => {
    const map = mapInstanceRef.current;
    if (!map || !selectedItineraryItem || typeof window === 'undefined') return;

    const L = await getLeaflet();
    const items = getItineraryItems();
    const target = items.find(
      (i) => i.dayIdx === selectedItineraryItem.dayIdx && i.slot === selectedItineraryItem.slot
    );
    if (!target) return;

    if (clickMarkerRef.current) {
      map.removeLayer(clickMarkerRef.current);
    }

    const pulseIcon = L.divIcon({
      className: '',
      html: `<div style="
        width:44px;height:44px;
        background:rgba(55,138,221,0.2);
        border:3px solid ${target.color};
        border-radius:50%;
        animation:map-pulse 1.5s infinite;
        display:flex;
        align-items:center;
        justify-content:center;
      "><div style="
        width:8px;height:8px;
        border-radius:50%;
        background:${target.color};
      "></div></div>`,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    clickMarkerRef.current = L.marker([target.lat, target.lon], { icon: pulseIcon }).addTo(map);
    map.setView([target.lat, target.lon], Math.max(map.getZoom(), 14));
  }, [selectedItineraryItem, getItineraryItems]);

  useEffect(() => {
    initMap();
  }, [initMap]);

  useEffect(() => {
    if (mapInstanceRef.current) {
      updateTripMarkers();
    }
  }, [trips, updateTripMarkers]);

  useEffect(() => {
    if (mapInstanceRef.current) {
      updatePlaceMarkers();
    }
  }, [places, updatePlaceMarkers]);

  useEffect(() => {
    if (mapInstanceRef.current && selectedPlace) {
      highlightPlace();
    }
  }, [selectedPlace, highlightPlace]);

  useEffect(() => {
    if (mapInstanceRef.current && selectedItineraryItem) {
      highlightItineraryItem();
    }
  }, [selectedItineraryItem, highlightItineraryItem]);

  useEffect(() => {
    if (mapInstanceRef.current) {
      updateItineraryMarkers();
    }
  }, [itinerary, updateItineraryMarkers]);

  // ── User pins ──────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('atlas_map_pins');
      if (saved) setPins(JSON.parse(saved));
    } catch { /* ignore corrupt data */ }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('atlas_map_pins', JSON.stringify(pins));
  }, [pins]);

  const renderPins = useCallback(async () => {
    const map = mapInstanceRef.current;
    if (!map || typeof window === 'undefined') return;
    const L = await getLeaflet();

    if (pinsLayerRef.current) {
      pinsLayerRef.current.clearLayers();
      map.removeLayer(pinsLayerRef.current);
    }

    if (!pins.length) return;

    pinsLayerRef.current = L.featureGroup();
    pins.forEach((pin) => {
      const icon = L.divIcon({
        className: '',
        html: `<svg viewBox="0 0 24 24" width="28" height="28" fill="#E74C3C" stroke="#fff" stroke-width="2">
          <path d="M12 2C8.1 2 5 5.1 5 9c0 5.3 7 13 7 13s7-7.7 7-13c0-3.9-3.1-7-7-7z"/>
          <circle cx="12" cy="9" r="3" fill="#fff"/>
        </svg>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -28],
      });

      const pinId = pin.id || `${pin.lat}_${pin.lng}`;
      const marker = L.marker([pin.lat, pin.lng], { icon })
        .addTo(pinsLayerRef.current)
        .bindPopup(
          `<div style="font-family:'DM Sans',sans-serif;min-width:160px">
            <div style="font-weight:600;font-size:13px;margin-bottom:4px">${pin.label || 'Pinned Location'}</div>
            <div style="font-size:11px;color:#888">${pin.lat.toFixed(4)}, ${pin.lng.toFixed(4)}</div>
            <button data-pin-id="${pinId}" class="map-delete-pin-btn"
              style="margin-top:6px;padding:2px 8px;font-size:11px;border:1px solid #ddd;border-radius:4px;background:#fff;cursor:pointer;color:#E74C3C">
              Delete Pin
            </button>
          </div>`
        );
    });
    map.addLayer(pinsLayerRef.current);
  }, [pins]);

  useEffect(() => {
    if (mapInstanceRef.current) renderPins();
  }, [pins, renderPins]);

  // Listen for delete-pin clicks from popups
  useEffect(() => {
    const handler = (e) => {
      const btn = e.target.closest('.map-delete-pin-btn');
      if (!btn) return;
      const pinId = btn.getAttribute('data-pin-id');
      setPins((prev) => prev.filter((p) => {
        const id = p.id || `${p.lat}_${p.lng}`;
        return id !== pinId;
      }));
    };
    if (typeof window !== 'undefined') {
      document.addEventListener('click', handler);
      return () => document.removeEventListener('click', handler);
    }
  }, []);

  const handleMapClick = useCallback((e) => {
    if (!pinMode) return;
    const name = prompt('Name this pinned location:', 'My Pin');
    if (name === null) return;
    setPins((prev) => [...prev, { lat: e.latlng.lat, lng: e.latlng.lng, label: name.trim() || 'My Pin', id: Date.now() }]);
    setPinMode(false);
  }, [pinMode]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.off('click', handleMapClick);
    if (pinMode) {
      map.on('click', handleMapClick);
      map.getContainer().style.cursor = 'crosshair';
    } else {
      map.getContainer().style.cursor = '';
    }
    return () => {
      if (map) map.off('click', handleMapClick);
    };
  }, [pinMode, handleMapClick]);

  useEffect(() => {
    if (mapInstanceRef.current) {
      updateDirections();
    }
  }, [directions, updateDirections]);

  useEffect(() => {
    const currentMapRef = mapRef.current;
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      // Clear Leaflet's internal container ID so Strict Mode re-mount won't error
      if (currentMapRef && currentMapRef._leaflet_id) {
        delete currentMapRef._leaflet_id;
      }
      tripMarkersRef.current = null;
      placeMarkersRef.current = null;
      itineraryMarkersRef.current = null;
      itineraryRoutesRef.current.forEach((r) => r.remove());
      itineraryRoutesRef.current = [];
      if (pinsLayerRef.current) {
        pinsLayerRef.current.clearLayers();
        pinsLayerRef.current = null;
      }
      routeRef.current = null;
      if (routingControlRef.current) {
        routingControlRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '400px' }}>
      {/* Search bar */}
      <div className="map-search-container">
        <div className="map-search-bar">
          <svg className="map-search-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search cities, attractions..."
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
            onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setFocusedIndex((i) => Math.min(i + 1, searchResults.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setFocusedIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === 'Enter' && focusedIndex >= 0) {
                e.preventDefault();
                handleSelectResult(searchResults[focusedIndex]);
              }
            }}
            className="map-search-input"
          />
          {searchLoading && <div className="map-search-spinner" />}
        </div>
        {showSearchResults && searchResults.length > 0 && (
          <div className="map-search-results" role="listbox">
            {searchResults.map((r, i) => (
              <button
                key={i}
                role="option"
                aria-selected={i === focusedIndex}
                className={`map-search-result-item ${i === focusedIndex ? 'map-search-result-focused' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectResult(r);
                }}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#888" strokeWidth="2" style={{ flexShrink: 0 }}>
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <div className="map-search-result-text">
                  <span className="map-search-result-name">{r.display_name.split(',')[0]}</span>
                  <span className="map-search-result-addr">{r.display_name.split(',').slice(1).join(',').trim()}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* My Location button */}
      <button
        className={`map-my-location-btn ${locating ? 'map-my-location-locating' : ''}`}
        onClick={handleMyLocation}
        title="My Location"
        aria-label="My Location"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v4m0 12v4m10-10h-4M6 12H2" />
        </svg>
      </button>

      {/* Weather overlay */}
      <MapWeatherOverlay mapCenter={mapCenter} onClose={() => {}} />

      {/* Share map view button */}
      <button
        className="map-share-btn"
        onClick={() => {
          const url = `${window.location.origin}/?map=${mapCenter[0].toFixed(4)},${mapCenter[1].toFixed(4)},${mapInstanceRef.current?.getZoom() || 12}`;
          try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(url);
            } else {
              const ta = document.createElement('textarea');
              ta.value = url;
              ta.style.position = 'fixed';
              ta.style.opacity = '0';
              document.body.appendChild(ta);
              ta.select();
              document.execCommand('copy');
              document.body.removeChild(ta);
            }
          } catch {}
          const el = document.createElement('div');
          el.className = 'map-share-toast';
          el.textContent = 'Map link copied!';
          document.body.appendChild(el);
          setTimeout(() => el.remove(), 2000);
        }}
        title="Copy map view link"
        aria-label="Copy map view link"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      </button>



      {/* Pin Location toggle button */}
      <button
        className={`map-pin-btn ${pinMode ? 'map-pin-active' : ''}`}
        onClick={() => setPinMode((p) => !p)}
        title={pinMode ? 'Exit pin mode' : 'Pin a location'}
        aria-label={pinMode ? 'Exit pin mode' : 'Pin a location'}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2C8.1 2 5 5.1 5 9c0 5.3 7 13 7 13s7-7.7 7-13c0-3.9-3.1-7-7-7z" />
          <circle cx="12" cy="9" r="3" />
        </svg>
      </button>

      {/* Pin instruction overlay */}
      {pinMode && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-20 z-[1001] bg-card px-4 py-2 rounded-full shadow-lg border border-border text-xs font-medium animate-bounce pointer-events-none">
          Click anywhere on the map to drop a pin
        </div>
      )}

      {/* Screenshot button */}
      <button
        className={`map-screenshot-btn ${capturing ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={async () => {
          if (capturing) return;
          setCapturing(true);
          await captureScreenshot();
          setCapturing(false);
        }}
        title="Export map as image"
        aria-label="Export map as image"
      >
        {capturing ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        )}
      </button>

      {/* Map container */}
      <div
        ref={mapRef}
        style={{ width: '100%', height: '100%', minHeight: '400px' }}
      />

      {/* Stats bar for itinerary */}
      {itinerarySummary && (
        <div className="absolute bottom-4 left-4 bg-card rounded-lg px-3 py-2 text-xs text-muted-foreground border border-border z-[1000] flex items-center gap-3">
          <span className="font-medium text-foreground">
            {itinerarySummary.days} day{itinerarySummary.days > 1 ? 's' : ''}
          </span>
          <span className="font-medium text-foreground">
            {itinerarySummary.stops} stop{itinerarySummary.stops > 1 ? 's' : ''}
          </span>
          <span>
            <span className="font-medium text-foreground">
              {itinerarySummary.distance < 1
                ? `${Math.round(itinerarySummary.distance * 1000)} m`
                : `${itinerarySummary.distance.toFixed(1)} km`}
            </span> route
          </span>
        </div>
      )}

      {/* Empty state */}
      {mapReady && !trips.length && !places.length && !directions && !itinerary.length && (
        <div className="map-empty-state">
          <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <div className="map-empty-title">No destinations yet</div>
          <div className="map-empty-desc">Add a trip or search for places to get started</div>
        </div>
      )}
    </div>
  );
}
