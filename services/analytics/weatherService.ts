import { WeatherInfo } from '../../types';

/**
 * Fetches current weather and 3-day forecast for given coordinates using Open-Meteo (Free API)
 */
export const fetchWeather = async (lat: number, lng: number): Promise<WeatherInfo> => {
    try {
        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=4`
        );
        
        if (!response.ok) throw new Error('Weather API failed');
        
        const data = await response.json();
        const current = data.current;
        const daily = data.daily;

        const interpretCode = (code: number): { condition: string; icon: 'Sun' | 'Cloud' | 'CloudFog' | 'CloudRain' | 'CloudSnow' | 'CloudLightning' } => {
            if (code === 0) return { condition: 'Sunny', icon: 'Sun' };
            if (code <= 3) return { condition: 'Cloudy', icon: 'Cloud' };
            if (code <= 48) return { condition: 'Foggy', icon: 'CloudFog' };
            if (code <= 67) return { condition: 'Rainy', icon: 'CloudRain' };
            if (code <= 77) return { condition: 'Snowy', icon: 'CloudSnow' };
            if (code <= 82) return { condition: 'Rainy', icon: 'CloudRain' };
            if (code <= 99) return { condition: 'Stormy', icon: 'CloudLightning' };
            return { condition: 'Unknown', icon: 'Cloud' };
        };

        const currentStatus = interpretCode(current.weather_code);
        
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const forecast = daily.time.slice(1).map((time: string, idx: number) => {
            const date = new Date(time);
            const status = interpretCode(daily.weather_code[idx + 1]);
            return {
                day: days[date.getDay()],
                temp: Math.round(daily.temperature_2m_max[idx + 1]),
                condition: status.condition
            };
        });

        // Calculate workability and risk factors
        const workableConditions = current.temperature_2m > 5 && current.temperature_2m < 35 && 
                                current.wind_speed_10m < 30 && 
                                current.weather_code < 50; // Not raining/snowing
        
        // Calculate risk factors (0-100 scale)
        const riskFactors = {
            precipitation: current.weather_code >= 50 && current.weather_code <= 99 ? 80 : 20, // High risk if precipitation
            wind: current.wind_speed_10m > 30 ? 80 : current.wind_speed_10m > 20 ? 50 : 20,
            temperature: current.temperature_2m < 0 || current.temperature_2m > 35 ? 70 : current.temperature_2m < 5 || current.temperature_2m > 30 ? 40 : 20,
            visibility: 20 // Simplified - would use actual visibility data if available
        };
        
        // Generate recommendations
        const recommendations = [];
        if (!workableConditions) {
            recommendations.push('Avoid outdoor work today');
        }
        if (riskFactors.precipitation > 50) {
            recommendations.push('Cover materials to protect from rain');
        }
        if (riskFactors.wind > 50) {
            recommendations.push('Secure loose materials and equipment');
        }
        if (riskFactors.temperature > 50) {
            recommendations.push('Provide extra water and shade for workers');
        }
        
        // Determine impact on schedule
        let impactOnSchedule: 'None' | 'Minor' | 'Moderate' | 'Severe' = 'None';
        if (riskFactors.precipitation > 70 || riskFactors.wind > 70) {
            impactOnSchedule = 'Severe';
        } else if (riskFactors.precipitation > 50 || riskFactors.wind > 50 || riskFactors.temperature > 50) {
            impactOnSchedule = 'Moderate';
        } else if (riskFactors.precipitation > 30 || riskFactors.wind > 30 || riskFactors.temperature > 30) {
            impactOnSchedule = 'Minor';
        }
        
        return {
            temp: Math.round(current.temperature_2m),
            condition: currentStatus.condition,
            description: `Winds at ${current.wind_speed_10m} km/h`,
            humidity: current.relative_humidity_2m,
            windSpeed: current.wind_speed_10m,
            icon: currentStatus.icon,
            lastUpdated: new Date().toISOString(),
            forecast,
            workableConditions,
            riskFactors,
            recommendations,
            impactOnSchedule
        };
} catch (error) {
        console.error("Weather Fetch Error:", error);
        // Return empty data with error flag when API fails - no mock data
        return {
            temp: 0,
            condition: 'Unavailable',
            description: 'Weather service unavailable. Please check your connection.',
            humidity: 0,
            windSpeed: 0,
            icon: 'Cloud',
            lastUpdated: new Date().toISOString(),
            forecast: [],
            workableConditions: false,
            riskFactors: {
                precipitation: 100,
                wind: 100,
                temperature: 100,
                visibility: 100
            },
            recommendations: ['Unable to fetch weather data. Please try again later.'],
            impactOnSchedule: 'Severe'
        };
    }
};

export interface MonthlyWeatherSummary {
    month: string;
    location: string;
    avgHigh: number;
    avgLow: number;
    avgRainfall: number;
    rainyDays: number;
    avgHumidity: number;
    avgWindSpeed: number;
    sunshineHours: number;
    summary: string;
    travelTip: string;
}

/**
 * Fetches monthly weather averages for a location.
 * Returns empty data with error flag - no mock/placeholder data
 */
export const fetchMonthlySummary = async (month: string, location: string): Promise<MonthlyWeatherSummary> => {
    // Return empty data with error flag - no mock/placeholder data
    return {
        month: month,
        location: location,
        avgHigh: 0,
        avgLow: 0,
        avgRainfall: 0,
        rainyDays: 0,
        avgHumidity: 0,
        avgWindSpeed: 0,
        sunshineHours: 0,
        summary: `Weather data unavailable for ${month}. Please check your connection or try again later.`,
        travelTip: "Unable to fetch weather data. Please try again later."
    };
};

export interface DailyWeatherRecord {
    date: string;
    tempMax: number;
    tempMin: number;
    condition: string;
    icon: string;
    rainfall: number;
    windSpeed: number;
    workable: boolean;
}

/**
 * Fetches daily weather history for a specific month and year using Open-Meteo API.
 * No mock data - returns empty array on failure.
 */
export const fetchDailyWeatherHistory = async (month: number, year: number, lat: number, lng: number): Promise<DailyWeatherRecord[]> => {
    try {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        const currentDay = now.getDate();
        
        // Determine if we need historical or forecast data
        const isHistorical = year < currentYear || (year === currentYear && month < currentMonth);
        
        // Calculate start date for the query
        const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
        
        // Calculate end date - limit to today if requesting current/future month
        let endDate: string;
        if (year > currentYear || (year === currentYear && month > currentMonth)) {
            // For future months, use forecast endpoint with a limit (e.g., 14 days ahead)
            const maxForecastDate = new Date(now);
            maxForecastDate.setDate(maxForecastDate.getDate() + 14);
            endDate = maxForecastDate.toISOString().split('T')[0];
        } else if (year === currentYear && month === currentMonth) {
            // For current month, limit to today
            endDate = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${currentDay.toString().padStart(2, '0')}`;
        } else {
            // For past months, use full month
            const lastDay = new Date(year, month, 0).getDate();
            endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
        }
        
        // Use archive API for past months, forecast API for current/future
        const baseUrl = isHistorical 
            ? 'https://archive-api.open-meteo.com/v1/archive'
            : 'https://api.open-meteo.com/v1/forecast';
        
        const response = await fetch(
            `${baseUrl}?latitude=${lat}&longitude=${lng}&start_date=${startDate}&end_date=${endDate}` +
            `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weather_code` +
            `&timezone=auto`
        );
        
        if (!response.ok) {
            console.error(`Weather history API failed with status ${response.status}`);
            return [];
        }
        
        const data = await response.json();
        const daily = data.daily;
        
        const interpretCode = (code: number): { condition: string; icon: string } => {
            if (code === 0) return { condition: 'Sunny', icon: 'Sun' };
            if (code <= 3) return { condition: 'Cloudy', icon: 'Cloud' };
            if (code <= 48) return { condition: 'Foggy', icon: 'CloudFog' };
            if (code <= 67) return { condition: 'Rainy', icon: 'CloudRain' };
            if (code <= 77) return { condition: 'Snowy', icon: 'CloudSnow' };
            if (code <= 82) return { condition: 'Rainy', icon: 'CloudRain' };
            return { condition: 'Stormy', icon: 'CloudLightning' };
        };
        
        const records: DailyWeatherRecord[] = daily.time.map((date: string, idx: number) => {
            const status = interpretCode(daily.weather_code[idx]);
            const windSpeed = daily.wind_speed_10m_max[idx] || 0;
            return {
                date,
                tempMax: Math.round(daily.temperature_2m_max[idx]),
                tempMin: Math.round(daily.temperature_2m_min[idx]),
                condition: status.condition,
                icon: status.icon,
                rainfall: daily.precipitation_sum[idx] || 0,
                windSpeed,
                workable: status.condition !== 'Rainy' && status.condition !== 'Snowy' && windSpeed < 30
            };
        });
        
        return records;
    } catch (error) {
        console.error("Failed to fetch weather history", error);
        // Return empty array on failure - no mock data
        return [];
    }
};
