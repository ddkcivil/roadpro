# TODO - Remove Mock Data and Return Empty Data with Error Flags

## Task Description
Remove mock/fallback data from weatherService.ts and ocrService.ts, and instead return empty data with error flags when external APIs fail.

## Implementation Steps

- [x] 1. Update weatherService.ts - fetchWeather() to return empty data with error flag when Open-Meteo API fails
- [x] 2. Update weatherService.ts - fetchMonthlySummary() to return empty data with error flag for unhandled months
- [x] 3. Update weatherService.ts - fetchDailyWeatherHistory() to use real Open-Meteo API (no pseudo-random)
- [x] 4. Update ocrService.ts - extractTextFromImageFile() to use real Tesseract.js OCR
- [x] 5. All mock data removed

## Files Edited
1. `services/analytics/weatherService.ts` - Removed all mock/fallback data
2. `services/ai/ocrService.ts` - Removed mock data, added real Tesseract.js OCR

## Changes Made

### weatherService.ts:
- `fetchWeather()`: Returns empty data with condition: 'Unavailable' when Open-Meteo fails
- `fetchMonthlySummary()`: Returns empty data with error message 
- `fetchDailyWeatherHistory()`: Uses real Open-Meteo archive/forecast API (not pseudo-random)

### ocrService.ts:
- `extractTextFromImageFile()`: Uses real Tesseract.js OCR, returns empty on failure
- `extractTextFromPDF()`: Returns empty on failure

## Expected Behavior After Changes
- When weather API fails: Return { temp: 0, condition: 'Unavailable', workableConditions: false }
- When OCR fails: Return { text: '', confidence: 0, boundingBoxes: [] }
- Components handle empty states and show appropriate UI messages
