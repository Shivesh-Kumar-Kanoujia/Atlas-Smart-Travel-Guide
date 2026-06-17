// @ts-nocheck
import { useState, useCallback } from 'react';
import { getWeatherByCoords } from '../lib/api';
import { Loader2, Wind, Droplets, Thermometer, Sun, CloudRain, Cloud, AlertTriangle } from 'lucide-react';

const WEATHER_ICONS = {
  '01d': { icon: Sun, color: '#fbbf24', bg: '#fef3c7' },
  '02d': { icon: Cloud, color: '#6b7280', bg: '#f3f4f6' },
  '03d': { icon: Cloud, color: '#6b7280', bg: '#e5e7eb' },
  '04d': { icon: Cloud, color: '#4b5563', bg: '#d1d5db' },
  '09d': { icon: CloudRain, color: '#3b82f6', bg: '#dbeafe' },
  '10d': { icon: CloudRain, color: '#2563eb', bg: '#bfdbfe' },
  '11d': { icon: AlertTriangle, color: '#f59e0b', bg: '#fef3c7' },
  '13d': { icon: Cloud, color: '#60a5fa', bg: '#e0f2fe' },
  '50d': { icon: Cloud, color: '#9ca3af', bg: '#f9fafb' },
  '01n': { icon: Sun, color: '#fbbf24', bg: '#1e1b4b' },
  '02n': { icon: Cloud, color: '#6b7280', bg: '#1f2937' },
};

function getWeatherWarning(temp, wind, desc) {
  if (temp >= 40) return { level: 'danger', text: 'Extreme heat — stay hydrated' };
  if (temp <= 0) return { level: 'danger', text: 'Freezing — dress warmly' };
  if (wind >= 15) return { level: 'warning', text: 'Strong winds — secure loose items' };
  if (desc?.toLowerCase().includes('storm') || desc?.toLowerCase().includes('thunder')) {
    return { level: 'danger', text: 'Thunderstorm — stay indoors' };
  }
  if (desc?.toLowerCase().includes('rain') || desc?.toLowerCase().includes('drizzle')) {
    return { level: 'info', text: 'Rain expected — bring an umbrella' };
  }
  if (temp >= 35) return { level: 'warning', text: 'Very hot — avoid midday sun' };
  return null;
}

export default function MapWeatherOverlay({ mapCenter, onClose }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState(null);

  const fetchWeather = useCallback(async () => {
    if (!mapCenter || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getWeatherByCoords(mapCenter[0], mapCenter[1]);
      setWeather(res.data);
      setVisible(true);
    } catch {
      setWeather(null);
      setError('Failed to load weather data');
    } finally {
      setLoading(false);
    }
  }, [mapCenter, loading]);

  if (!visible && !loading) {
    return (
      <button
        onClick={fetchWeather}
        className="map-weather-toggle"
        title="Weather"
        aria-label="Toggle weather overlay"
      >
        <Sun className="w-4 h-4" />
      </button>
    );
  }

  if (error) {
    return (
      <div className="map-weather-panel">
        <div className="flex items-center gap-2 text-xs text-destructive mb-2">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          {error}
        </div>
        <button onClick={fetchWeather} className="text-xs text-primary hover:text-primary/80">Retry</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="map-weather-panel">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!weather) return null;

  const iconCfg = WEATHER_ICONS[weather.icon] || WEATHER_ICONS['01d'];
  const WeatherIcon = iconCfg.icon;
  const warning = getWeatherWarning(weather.temperature, weather.wind_speed, weather.description);
  const warningClasses = {
    danger: 'bg-red-50 text-red-600 border-red-300 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
    warning: 'bg-amber-50 text-amber-600 border-amber-300 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
    info: 'bg-blue-50 text-blue-600 border-blue-300 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800',
  };

  return (
    <div className="map-weather-panel">
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: iconCfg.bg }}
        >
          <WeatherIcon className="w-4 h-4" style={{ color: iconCfg.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-foreground">{weather.temperature}°C</div>
          <div className="text-xs text-muted-foreground truncate">{weather.description}</div>
        </div>
        {weather.city && (
          <div className="text-xs text-muted-foreground truncate max-w-[80px] text-right">{weather.city}</div>
        )}
        <button onClick={() => { setVisible(false); setWeather(null); if (onClose) onClose(); }} className="text-muted-foreground hover:text-foreground ml-1">
          ✕
        </button>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Thermometer className="w-3 h-3" />
          Feels {weather.feels_like}°
        </span>
        <span className="flex items-center gap-1">
          <Wind className="w-3 h-3" />
          {weather.wind_speed} m/s
        </span>
        <span className="flex items-center gap-1">
          <Droplets className="w-3 h-3" />
          {weather.humidity}%
        </span>
      </div>

      {warning && (
        <div
          className={`mt-1.5 px-2 py-1 rounded-lg text-xs flex items-center gap-1.5 border ${warningClasses[warning.level]}`}
        >
          <AlertTriangle className="w-3 h-3 shrink-0" />
          {warning.text}
        </div>
      )}

      <button
        onClick={fetchWeather}
        className="text-xs text-primary hover:text-primary/80 mt-1 block"
      >
        Refresh
      </button>
    </div>
  );
}
