import { useState } from "react";
import { Search, Wind, Droplets, Eye, Loader2 } from "lucide-react";
import { getWeather, getForecast } from "../lib/api";
import toast from "react-hot-toast";

export default function WeatherWidget() {
  const [city, setCity] = useState("");
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!city.trim()) return;
    setLoading(true);
    try {
      const [wRes, fRes] = await Promise.all([getWeather(city), getForecast(city)]);
      setWeather(wRes.data);
      setForecast(fRes.data.forecast || []);
    } catch (err) {
      toast.error(err.response?.data?.detail || "City not found");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="font-display text-2xl font-semibold text-sand-900 mb-1">Weather Forecast</h2>
        <p className="text-sand-500 text-sm">Check conditions for your destination</p>
      </div>

      <div className="flex gap-2 mb-6">
        <input value={city} onChange={e => setCity(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSearch()}
          placeholder="Enter city name (e.g. Tokyo, Paris, Mumbai)..."
          className="flex-1 px-4 py-3 bg-white border border-sand-200 rounded-xl text-sm outline-none focus:border-sand-400 transition-all" />
        <button onClick={handleSearch} disabled={loading}
          className="px-5 py-3 bg-sand-500 text-white rounded-xl hover:bg-sand-600 disabled:opacity-50 transition-all flex items-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </button>
      </div>

      {weather && (
        <div className="animate-slide-up space-y-4">
          <div className="bg-gradient-to-br from-ocean-500 to-ocean-700 rounded-2xl p-6 text-white">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-display text-2xl font-semibold">{weather.city}, {weather.country}</h3>
                <p className="text-ocean-200 text-sm mt-1">{weather.description}</p>
                <div className="text-6xl font-light mt-3">{weather.temperature}°</div>
                <div className="text-ocean-200 text-sm mt-1">Feels like {weather.feels_like}°C</div>
              </div>
              {weather.icon && (
                <img src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`} alt="" className="w-20 h-20 opacity-90" />
              )}
            </div>
            <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-ocean-400/40">
              <div className="flex items-center gap-2 text-sm">
                <Droplets className="w-4 h-4 text-ocean-200" />
                <div><div className="font-medium">{weather.humidity}%</div><div className="text-ocean-200 text-xs">Humidity</div></div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Wind className="w-4 h-4 text-ocean-200" />
                <div><div className="font-medium">{weather.wind_speed} m/s</div><div className="text-ocean-200 text-xs">Wind</div></div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Eye className="w-4 h-4 text-ocean-200" />
                <div><div className="font-medium">{(weather.visibility / 1000).toFixed(1)} km</div><div className="text-ocean-200 text-xs">Visibility</div></div>
              </div>
            </div>
          </div>

          {forecast.length > 0 && (
            <div className="bg-white border border-sand-200 rounded-2xl p-4">
              <h4 className="text-sm font-semibold text-sand-700 mb-3">5-Day Forecast</h4>
              <div className="grid grid-cols-5 gap-2">
                {forecast.map(day => (
                  <div key={day.date} className="text-center">
                    <div className="text-xs text-sand-500">{new Date(day.date).toLocaleDateString("en", {weekday:"short"})}</div>
                    <img src={`https://openweathermap.org/img/wn/${day.icon}.png`} alt="" className="w-10 h-10 mx-auto" />
                    <div className="text-xs font-medium text-sand-900">{day.temp_max}°</div>
                    <div className="text-xs text-sand-400">{day.temp_min}°</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!weather && !loading && (
        <div className="text-center py-16 text-sand-400">
          <div className="text-5xl mb-3">🌤️</div>
          <p className="text-sm">Search a city to see weather conditions</p>
          <p className="text-xs mt-2 text-sand-300">Add OPENWEATHER_API_KEY in backend .env for live data</p>
        </div>
      )}
    </div>
  );
}
