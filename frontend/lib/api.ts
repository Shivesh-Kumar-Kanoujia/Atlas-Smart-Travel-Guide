import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import type { Trip, TripCreate, TripUpdate, ExpenseItem, PackingItem, WeatherData, ForecastData } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api: AxiosInstance = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('atlas_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (typeof window === 'undefined') return Promise.reject(err);
    if (err.response?.status === 401) {
      localStorage.removeItem('atlas_token');
      localStorage.removeItem('atlas_user');
    }
    if (err.response?.status === 429) {
      err.__isRateLimited = true;
      err.__retryAfter = err.response.headers?.['retry-after'] || 60;
    }
    return Promise.reject(err);
  }
);

export const registerUser = (data: { email: string; password: string; name: string }) =>
  api.post('/auth/register', data);

export const loginUser = (data: { email: string; password: string }) =>
  api.post('/auth/login', data);

export const googleAuth = (data: { email: string; name: string; avatar?: string; google_id_token: string }) =>
  api.post('/auth/google', data);

export const getMe = () => api.get('/auth/me');

export const checkCookie = () => api.get('/auth/check-cookie');

export const logoutUser = () => api.post('/auth/logout');

export const updateMemory = (memory: string) => api.put('/auth/memory', { memory });

export interface StreamChatCallbacks {
  onToken: (token: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}

export const streamChat = async (
  messages: { role: string; content: string }[],
  mood: string,
  budget: string,
  memory: string | undefined,
  callbacks: StreamChatCallbacks,
  signal?: AbortSignal
) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('atlas_token') : null;
  const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('atlas_user') || '{}') : {};

  const res = await fetch(`${API_URL}/api/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ messages, mood, budget, user_id: user?.id, memory }),
    signal,
  });

  if (!res.ok) {
    let msg = 'Connection failed';
    try { const err = await res.json(); msg = err.detail || msg; } catch {}
    callbacks.onError(msg);
    return;
  }

  const reader = res.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) return;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value);
    const lines = text.split('\n');

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const data = JSON.parse(line.slice(6));
        if (data.token) callbacks.onToken(data.token);
        if (data.done) callbacks.onDone();
        if (data.error) callbacks.onError(data.error);
      } catch {}
    }
  }
};

export const sendMessage = (messages: { role: string; content: string }[], mood: string, budget: string) =>
  api.post('/chat/', { messages, mood, budget });

export const generateItinerary = (data: Record<string, unknown>) => api.post('/itinerary/generate', data);
export const getTripItinerary = (tripId: number) => api.get(`/itinerary/${tripId}`);
export const clearItinerary = (tripId: number) => api.delete(`/itinerary/${tripId}`);

export const getWeather = (city: string) => api.get<WeatherData>(`/weather/?city=${encodeURIComponent(city)}`);
export const getForecast = (city: string) => api.get<ForecastData>(`/weather/forecast?city=${encodeURIComponent(city)}`);
export const getWeatherByCoords = (lat: number, lon: number) => api.get<any>(`/weather/by-coords?lat=${lat}&lon=${lon}`);

export const convertCurrency = (amount: number, from_currency: string, to_currency: string) =>
  api.post('/currency/convert', { amount, from_currency, to_currency });
export const getCurrencies = () => api.get<string[]>('/currency/currencies');

export const getTrips = () => api.get<Trip[]>('/trips/');
export const getTrip = (id: number) => api.get<Trip>(`/trips/${id}`);
export const createTrip = (data: TripCreate) => api.post<Trip>('/trips/', data);
export const updateTrip = (id: number, data: TripUpdate) => api.put<Trip>(`/trips/${id}`, data);
export const deleteTrip = (id: number) => api.delete(`/trips/${id}`);
export const addExpense = (id: number, data: ExpenseItem) => api.post(`/trips/${id}/expenses`, data);
export const updatePacking = (id: number, items: PackingItem[]) => api.post(`/trips/${id}/packing`, items);

export const getSavedMaps = () => api.get('/maps/');
export const saveMap = (data: { name: string; map_state: object; trip_id?: number }) => api.post('/maps/', data);
export const getSavedMap = (id: number) => api.get(`/maps/${id}`);
export const updateSavedMap = (id: number, data: { name?: string; map_state?: object }) => api.put(`/maps/${id}`, data);
export const deleteSavedMap = (id: number) => api.delete(`/maps/${id}`);

export const analyzeImage = (imageBase64: string, mediaType: string, question: string) =>
  api.post('/images/analyze', { image_base64: imageBase64, media_type: mediaType, question });

export const getEmergencyInfo = (dest: string) => api.get(`/emergency/info?destination=${encodeURIComponent(dest)}`);
export const getEmergencyNumbers = (code: string) => api.get(`/emergency/numbers?country_code=${code}`);

// ── AI Trip Planning ──────────────────────────────────────────────────────

export interface BudgetEstimateRequest {
  destination: string;
  days: number;
  travelers?: number;
  budget?: string;
  mood?: string;
  notes?: string;
}

export interface PackingSuggestRequest {
  destination: string;
  days: number;
  budget?: string;
  activities?: string;
  season?: string;
  notes?: string;
}

export const estimateBudget = (data: BudgetEstimateRequest) =>
  api.post('/planning/budget-estimate', data);

export const suggestPacking = (data: PackingSuggestRequest) =>
  api.post('/planning/packing-suggest', data);

// ── Places (Nearby Attractions & Restaurants) ─────────────────────────────

export interface Place {
  id: number;
  name: string;
  type: string;
  lat: number;
  lon: number;
  address: string;
  phone: string;
  website: string;
  opening_hours: string;
  rating: number | null;
  cuisine: string;
  description: string;
}

export interface NearbyPlacesResponse {
  lat: number;
  lon: number;
  radius: number;
  category: string;
  count: number;
  places: Place[];
}

export const getNearbyPlaces = (
  lat: number,
  lon: number,
  radius?: number,
  category?: string
) =>
  api.get<NearbyPlacesResponse>('/places/nearby', {
    params: { lat, lon, radius, category },
  });

// ── Analytics ─────────────────────────────────────────────────────────────

export interface AnalyticsOverview {
  trips_count: number;
  total_budget: number;
  total_spent: number;
  remaining_budget: number;
  status_counts: Record<string, number>;
  expense_categories: Record<string, number>;
  destinations: { name: string; budget: number; spent: number }[];
  monthly_spending: { month: string; amount: number }[];
  avg_budget_per_trip: number;
  avg_spent_per_trip: number;
}

export const getAnalyticsOverview = () =>
  api.get<AnalyticsOverview>('/analytics/overview');

// ── Chat History ──────────────────────────────────────────────────────────

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id?: number;
  role: string;
  content: string;
  created_at?: string;
}

export const listConversations = () =>
  api.get<{ conversations: Conversation[] }>('/chat/conversations');

export const createConversation = (data: { title?: string; first_message?: string }) =>
  api.post<{ id: string; title: string; created_at: string }>('/chat/conversations', data);

export const getConversationMessages = (convId: string) =>
  api.get<{ conversation_id: string; messages: ChatMessage[] }>(`/chat/conversations/${convId}/messages`);

export const saveChatMessage = (convId: string, data: { role: string; content: string }) =>
  api.post(`/chat/conversations/${convId}/messages`, data);

export const updateConversation = (convId: string, title: string) =>
  api.put(`/chat/conversations/${convId}?title=${encodeURIComponent(title)}`);

export const deleteConversation = (convId: string) =>
  api.delete(`/chat/conversations/${convId}`);

// ── Trip Sharing ──────────────────────────────────────────────────────────

export const createShareLink = (tripId: number, expiresInDays?: number) =>
  api.post<{ code: string; existing: boolean }>('/share/trips', {
    trip_id: tripId,
    expires_in_days: expiresInDays || 7,
  });

export const getSharedTrip = (code: string) =>
  api.get<{ trip: Trip; sharer: string; shared_at: string }>(`/share/trips/${code}`);

// ── Personalization ───────────────────────────────────────────────────────

export interface UserPreferences {
  id?: number;
  user_id?: string;
  preferred_moods: string[];
  preferred_budget: string;
  favorite_destinations: string[];
  bucket_list: string[];
  travel_style: string;
  interests: string[];
  dietary_preferences: string;
  accommodation_preference: string;
  pace: string;
  created_at?: string;
  updated_at?: string;
}

export interface Recommendation {
  destination: string;
  why_it_matches: string;
  best_time_to_visit: string;
  estimated_budget_per_day: string;
  highlights: string[];
  match_score: number;
}

export const extractPreferences = (data?: { chat_history?: string; trip_data?: string }) =>
  api.post<{ preferences: UserPreferences; travel_memory: string }>('/personalize/extract-preferences', data || {});

export const getPreferences = () =>
  api.get<UserPreferences>('/personalize/preferences');

export const updatePreferences = (data: Omit<UserPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>) =>
  api.put('/personalize/preferences', data);

export const getRecommendations = () =>
  api.get<{ recommendations: Recommendation[] }>('/personalize/recommendations');

export default api;