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

  const fetchWeather = useCallback(async () => {
    if (!mapCenter || loading) return;
    setLoading(true);
    try {
      const res = await getWeatherByCoords(mapCenter[0], mapCenter[1]);
      setWeather(res.data);
      setVisible(true);
    } catch {
      setWeather(null);
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
  const warningColors = {
    danger: { bg: '#fef2f2', text: '#dc2626', border: '#fca5a5' },
    warning: { bg: '#fffbeb', text: '#d97706', border: '#fcd34d' },
    info: { bg: '#eff6ff', text: '#2563eb', border: '#93c5fd' },
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
          <div className="text-[10px] text-muted-foreground truncate">{weather.description}</div>
        </div>
        {weather.city && (
          <div className="text-[9px] text-muted-foreground truncate max-w-[80px] text-right">{weather.city}</div>
        )}
        <button onClick={() => { setVisible(false); setWeather(null); if (onClose) onClose(); }} className="text-muted-foreground hover:text-foreground ml-1">
          ✕
        </button>
      </div>

      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
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
          className="mt-1.5 px-2 py-1 rounded-lg text-[10px] flex items-center gap-1.5"
          style={{
            backgroundColor: warningColors[warning.level].bg,
            color: warningColors[warning.level].text,
            border: `1px solid ${warningColors[warning.level].border}`,
          }}
        >
          <AlertTriangle className="w-3 h-3 shrink-0" />
          {warning.text}
        </div>
      )}

      <button
        onClick={fetchWeather}
        className="text-[9px] text-primary hover:text-primary/80 mt-1 block"
      >
        Refresh
      </button>
    </div>
  );
}
