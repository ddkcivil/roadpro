# TODO - Fix Weather API and Recharts Warnings

## Status: COMPLETED ✅

## Issues Fixed:
1. [DONE] Open-Meteo API 400 Error - Weather history API fails with future dates
2. [DONE] Recharts Warning - width(-1) and height(-1) of chart should be greater than 0

## Fix Implementation Summary:

### Fix 1: Weather Service (services/analytics/weatherService.ts)
- Fixed `fetchDailyWeatherHistory` to properly handle date boundaries:
  - For past months: Uses archive API with full month data
  - For current month: Limits to today (current date)
  - For future months: Uses forecast API with 14-day limit
- Added better error logging
- Returns empty array on failure (no mock data)

### Fix 2: Dashboard Chart (components/core/Dashboard.tsx)
- Added `min-h-[300px]` to S-Curve chart CardContent wrapper
- Added defensive check for empty data with placeholder chart
- Charts now always render with valid data structure
