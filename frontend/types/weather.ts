export interface WeatherData {
  city: string;
  country: string;
  temperature: number;
  feels_like: number;
  humidity: number;
  description: string;
  icon: string;
  wind_speed: number;
  visibility: number;
  mock?: boolean;
}

export interface ForecastData {
  city: string;
  forecast: ForecastDay[];
  mock?: boolean;
}

export interface ForecastDay {
  date: string;
  temp_min: number;
  temp_max: number;
  description: string;
  icon: string;
  humidity: number;
}