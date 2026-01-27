# PowerShell Diagnostic Script for RoadPro API

Write-Host "🔍 RoadPro API Diagnostic Tool" -ForegroundColor Green
Write-Host "==============================" -ForegroundColor Green

$API_URL = "https://baa26027-8f6b-42f7-86d2-1bbfbb30fc13.up.railway.app"

Write-Host "Testing current API URL: $API_URL" -ForegroundColor Yellow
Write-Host ""

# Test health endpoint
Write-Host "1. Testing /api/health endpoint..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$API_URL/api/health" -Method GET -ErrorAction Stop
    Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor White
} catch {
    Write-Host "❌ Failed to reach health endpoint" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "2. Testing /api/users endpoint..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$API_URL/api/users" -Method GET -ErrorAction Stop
    Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor White
} catch {
    Write-Host "❌ Failed to reach users endpoint" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "1. If endpoints return 404, redeploy your Railway application" -ForegroundColor White
Write-Host "2. Check Railway dashboard for deployment status" -ForegroundColor White
Write-Host "3. Verify environment variables are set correctly" -ForegroundColor White
Write-Host "4. Check Railway logs for any error messages" -ForegroundColor White

Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")