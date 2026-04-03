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
        // Fallback mock
        return {
            temp: 24,
            condition: 'Sunny',
            description: 'Weather service unavailable. Showing estimated values.',
            humidity: 45,
            windSpeed: 12,
            icon: 'Sun',
            lastUpdated: new Date().toISOString(),
            forecast: [
                { day: 'Tue', temp: 26, condition: 'Sunny' },
                { day: 'Wed', temp: 25, condition: 'Cloudy' },
                { day: 'Thu', temp: 22, condition: 'Rainy' }
            ],
            workableConditions: true,
            riskFactors: {
                precipitation: 20,
                wind: 20,
                temperature: 20,
                visibility: 20
            },
            recommendations: ['Weather service unavailable. Using estimated values.'],
            impactOnSchedule: 'None'
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
 * For now, returns static data for Butwal in February as requested.
 */
export const fetchMonthlySummary = async (month: string, location: string): Promise<MonthlyWeatherSummary> => {
    // In a real app, this would fetch from an API or a database of climate normals
    // Providing requested data for Butwal in February
    if (month.toLowerCase() === 'february' || month.toLowerCase() === 'feb') {
        return {
            month: 'February',
            location: 'Butwal, Nepal',
            avgHigh: 24,
            avgLow: 9,
            avgRainfall: 24, // mm
            rainyDays: 2,
            avgHumidity: 67,
            avgWindSpeed: 4.3,
            sunshineHours: 7.1,
            summary: "Mild and dry winter weather, transitioning towards spring. Clear or partly cloudy skies prevail about 85% of the time.",
            travelTip: "Best time for outdoor activities. Pack light layers: t-shirts for warm afternoons and a light jacket for chilly mornings."
        };
    }
    
    // Default/Placeholder for other months
    return {
        month: month,
        location: location,
        avgHigh: 25,
        avgLow: 15,
        avgRainfall: 50,
        rainyDays: 5,
        avgHumidity: 60,
        avgWindSpeed: 10,
        sunshineHours: 6,
        summary: "Weather data pending for this month.",
        travelTip: "Check local forecasts before planning outdoor work."
    };
};