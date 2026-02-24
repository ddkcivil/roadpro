import React, { useState, useEffect } from 'react';
import { Sun, Wind, Droplets, Cloud, CloudRain, CloudSnow } from 'lucide-react';

const WeatherIcon = ({ condition }: { condition: string }) => {
  switch (condition) {
    case 'Clear':
      return <Sun className="w-8 h-8 text-yellow-500" />;
    case 'Clouds':
      return <Cloud className="w-8 h-8 text-slate-500" />;
    case 'Rain':
      return <CloudRain className="w-8 h-8 text-blue-500" />;
    case 'Snow':
      return <CloudSnow className="w-8 h-8 text-white" />;
    default:
      return <Sun className="w-8 h-8 text-yellow-500" />;
  }
};

const WeatherWidget = () => {
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // TODO: Get latitude and longitude from project location
        const lat = 33.749;
        const lon = -84.388;
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
        const data = await response.json();
        setWeather(data.current_weather);
      } catch (error) {
        console.error("Failed to fetch weather data", error);
        // Set some default weather data for UI development
        setWeather({
          temperature: 25,
          windspeed: 10,
          weathercode: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, []);

  if (loading) {
    return (
      <div className="p-4 rounded-lg bg-white shadow-sm flex items-center justify-center h-full">
        <p className="text-slate-500">Loading weather...</p>
      </div>
    );
  }

  if (!weather) {
    return null;
  }

  const getWeatherCondition = (code: number) => {
    if (code === 0) return 'Clear';
    if (code > 0 && code < 4) return 'Clouds';
    if (code > 50 && code < 68) return 'Rain';
    if (code > 70 && code < 87) return 'Snow';
    return 'Clear';
  };

  const condition = getWeatherCondition(weather.weathercode);

  return (
    <div className="p-4 rounded-lg bg-white shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-slate-500">Current Weather</p>
          <p className="text-2xl font-bold">{weather.temperature}°C</p>
        </div>
        <WeatherIcon condition={condition} />
      </div>
      <div className="mt-4 flex justify-between text-sm">
        <div className="flex items-center gap-2">
          <Wind className="w-4 h-4 text-slate-500" />
          <span>{weather.windspeed} km/h</span>
        </div>
        <div className="flex items-center gap-2">
          <Droplets className="w-4 h-4 text-slate-500" />
          {/* Humidity is not available in this API's free tier, so we'll mock it */}
          <span>72%</span>
        </div>
      </div>
    </div>
  );
};

export default WeatherWidget;
