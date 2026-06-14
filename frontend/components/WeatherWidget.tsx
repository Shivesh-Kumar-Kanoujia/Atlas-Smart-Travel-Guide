// @ts-nocheck
/* eslint-disable @next/next/no-img-element */
import { useState } from 'react';
import { Search, Wind, Droplets, Eye, Loader2, AlertCircle } from 'lucide-react';
import { getWeather, getForecast } from '../lib/api';
import toast from 'react-hot-toast';
import { Button } from './ui/button';
import { Input } from './ui/input';

export default function WeatherWidget() {
  const [city, setCity] = useState('');
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!city.trim()) return;
    setLoading(true);
    setError('');
    try {
      const [wRes, fRes] = await Promise.all([getWeather(city), getForecast(city)]);
      setWeather(wRes.data);
      setForecast(fRes.data.forecast || []);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 429) {
        setError('Weather API rate limit reached. Please wait a moment and try again.');
        toast.error('Rate limit reached');
      } else if (status === 404) {
        setError(`City "${city}" not found. Check the spelling and try again.`);
        toast.error('City not found');
      } else if (status === 502) {
        setError('Weather service is temporarily unavailable. Try again later.');
        toast.error('Weather service unavailable');
      } else if (err?.code === 'ERR_NETWORK') {
        setError('Cannot connect to server. Make sure the backend is running.');
        toast.error('Server unreachable');
      } else {
        setError('Failed to fetch weather data. Try again.');
        toast.error('Weather fetch failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex gap-2 mb-6">
        <Input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Enter city name (e.g. Tokyo, Paris, Mumbai)..."
          className="flex-1"
        />
        <Button onClick={handleSearch} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </Button>
      </div>

      {weather && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
          <div className="bg-gradient-to-br from-primary to-primary/70 rounded-2xl p-6 text-primary-foreground">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-display text-2xl font-semibold">{weather.city}, {weather.country}</h3>
                <p className="text-primary-foreground/70 text-sm mt-1">{weather.description}</p>
                <div className="text-6xl font-light mt-3">{Math.round(weather.temperature)}°</div>
                <div className="text-primary-foreground/70 text-sm mt-1">
                  Feels like {Math.round(weather.feels_like)}°C
                </div>
              </div>
              {weather.icon && (
                <img
                  src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
                  alt=""
                  className="w-20 h-20 opacity-90"
                />
              )}
            </div>
            <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-primary-foreground/20">
              <div className="flex items-center gap-2 text-sm">
                <Droplets className="w-4 h-4 text-primary-foreground/70" />
                <div>
                  <div className="font-medium">{weather.humidity}%</div>
                  <div className="text-primary-foreground/60 text-xs">Humidity</div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Wind className="w-4 h-4 text-primary-foreground/70" />
                <div>
                  <div className="font-medium">{weather.wind_speed} m/s</div>
                  <div className="text-primary-foreground/60 text-xs">Wind</div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Eye className="w-4 h-4 text-primary-foreground/70" />
                <div>
                  <div className="font-medium">{(weather.visibility / 1000).toFixed(1)} km</div>
                  <div className="text-primary-foreground/60 text-xs">Visibility</div>
                </div>
              </div>
            </div>
          </div>

          {forecast.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-4">
              <h4 className="text-sm font-semibold text-foreground mb-3">5-Day Forecast</h4>
              <div className="grid grid-cols-5 gap-2">
                {forecast.map((day) => (
                  <div key={day.date} className="text-center">
                    <div className="text-xs text-muted-foreground">
                      {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                    </div>
                    <img
                      src={`https://openweathermap.org/img/wn/${day.icon}.png`}
                      alt=""
                      className="w-10 h-10 mx-auto"
                    />
                    <div className="text-xs font-medium text-foreground">{Math.round(day.temp_max)}°</div>
                    <div className="text-xs text-muted-foreground">{Math.round(day.temp_min)}°</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20 mb-4">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!weather && !loading && !error && (
        <div className="text-center py-16 text-muted-foreground">
          <div className="text-5xl mb-3">🌤️</div>
          <p className="text-sm">Search a city to see weather conditions</p>
        </div>
      )}
    </div>
  );
}
