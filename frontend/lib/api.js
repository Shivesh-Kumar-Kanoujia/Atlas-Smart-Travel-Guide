import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

// Attach auth token from localStorage on every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("atlas_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("atlas_token");
      localStorage.removeItem("atlas_user");
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const registerUser   = (data)  => api.post("/auth/register", data);
export const loginUser      = (data)  => api.post("/auth/login", data);
export const googleAuth     = (data)  => api.post("/auth/google", data);
export const getMe          = ()      => api.get("/auth/me");
export const logoutUser     = ()      => api.post("/auth/logout");
export const updateMemory   = (memory) => api.put("/auth/memory", { memory });

// ── Chat (streaming) ──────────────────────────────────────────────────────────
export const streamChat = async (messages, mood, budget, onToken, onDone, onError) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("atlas_token") : null;
  const user  = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("atlas_user") || "{}") : {};
  const memory = typeof window !== "undefined" ? localStorage.getItem("atlas_memory") || "" : "";

  const res = await fetch(`${API_URL}/api/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ messages, mood, budget, user_id: user?.id, memory }),
  });

  if (!res.ok) { onError("Connection failed"); return; }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value);
    const lines = text.split("\n");

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const data = JSON.parse(line.slice(6));
        if (data.token) onToken(data.token);
        if (data.done)  onDone();
        if (data.error) onError(data.error);
      } catch {}
    }
  }
};

export const sendMessage = (messages, mood, budget) =>
  api.post("/chat/", { messages, mood, budget });

// ── Itinerary ─────────────────────────────────────────────────────────────────
export const generateItinerary  = (data)    => api.post("/itinerary/generate", data);
export const getTripItinerary   = (tripId)  => api.get(`/itinerary/${tripId}`);
export const clearItinerary     = (tripId)  => api.delete(`/itinerary/${tripId}`);

// ── Weather ───────────────────────────────────────────────────────────────────
export const getWeather  = (city) => api.get(`/weather/?city=${encodeURIComponent(city)}`);
export const getForecast = (city) => api.get(`/weather/forecast?city=${encodeURIComponent(city)}`);

// ── Currency ──────────────────────────────────────────────────────────────────
export const convertCurrency = (amount, from_currency, to_currency) =>
  api.post("/currency/convert", { amount, from_currency, to_currency });
export const getCurrencies = () => api.get("/currency/currencies");

// ── Trips ─────────────────────────────────────────────────────────────────────
export const getTrips      = ()           => api.get("/trips/");
export const getTrip       = (id)         => api.get(`/trips/${id}`);
export const createTrip    = (data)       => api.post("/trips/", data);
export const updateTrip    = (id, data)   => api.put(`/trips/${id}`, data);
export const deleteTrip    = (id)         => api.delete(`/trips/${id}`);
export const addExpense    = (id, data)   => api.post(`/trips/${id}/expenses`, data);
export const updatePacking = (id, items)  => api.post(`/trips/${id}/packing`, items);

// ── Images ────────────────────────────────────────────────────────────────────
export const analyzeImage = (imageBase64, mediaType, question) =>
  api.post("/images/analyze", { image_base64: imageBase64, media_type: mediaType, question });

// ── Emergency ─────────────────────────────────────────────────────────────────
export const getEmergencyInfo    = (dest)    => api.get(`/emergency/info?destination=${encodeURIComponent(dest)}`);
export const getEmergencyNumbers = (code)    => api.get(`/emergency/numbers?country_code=${code}`);

export default api;
