# Test Notification System
Write-Host "Testing Notification System..." -ForegroundColor Green

# Test 1: Check if backend is running
Write-Host "`n1. Checking if backend is running..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/notifications/unread-count" -Method GET -Headers @{"Authorization" = "Bearer YOUR_TOKEN_HERE"} -ErrorAction Stop
    Write-Host "Backend is running" -ForegroundColor Green
} catch {
    Write-Host "Backend is not running or not accessible" -ForegroundColor Red
    Write-Host "Please start the backend first: cd backend && ./mvnw spring-boot:run" -ForegroundColor Yellow
    exit 1
}

# Test 2: Check WebSocket logs
Write-Host "`n2. Checking WebSocket logs..." -ForegroundColor Yellow
$websocketLogs = Get-Content backend/logs/application.log | Select-String -Pattern "WebSocket|STOMP|connected" | Select-Object -Last 5
if ($websocketLogs) {
    Write-Host "WebSocket logs found:" -ForegroundColor Green
    $websocketLogs | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
} else {
    Write-Host "No WebSocket logs found" -ForegroundColor Red
}

# Test 3: Check notification logs
Write-Host "`n3. Checking notification logs..." -ForegroundColor Yellow
$notificationLogs = Get-Content backend/logs/application.log | Select-String -Pattern "notification|sendRealTime" | Select-Object -Last 5
if ($notificationLogs) {
    Write-Host "Notification logs found:" -ForegroundColor Green
    $notificationLogs | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
} else {
    Write-Host "No notification logs found" -ForegroundColor Red
}

# Test 4: Check for errors
Write-Host "`n4. Checking for errors..." -ForegroundColor Yellow
$errorLogs = Get-Content backend/logs/application.log | Select-String -Pattern "ERROR|Exception|Failed" | Select-Object -Last 5
if ($errorLogs) {
    Write-Host "Errors found:" -ForegroundColor Yellow
    $errorLogs | ForEach-Object { Write-Host "   $_" -ForegroundColor Red }
} else {
    Write-Host "No recent errors found" -ForegroundColor Green
}

Write-Host "`nTest completed!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Open browser console and check for WebSocket connection" -ForegroundColor White
Write-Host "2. Send a test notification using: POST /api/notifications/test-realtime" -ForegroundColor White
Write-Host "3. Send a message between users to test automatic notifications" -ForegroundColor White 