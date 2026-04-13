# SmartSure - Start All Services
Write-Host "Starting SmartSure services..." -ForegroundColor Cyan

$root = $PSScriptRoot

# ── Build all projects first to avoid parallel build locks ──────────────────
Write-Host "Building all backend projects..." -ForegroundColor Cyan
dotnet build backend -c Debug
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed. Please fix errors before starting services." -ForegroundColor Red
    exit $LASTEXITCODE
}

# Start backend services in separate windows
$services = @(
    @{ Name = "Identity API";  Project = "backend/services/identity/SmartSure.Identity.API/SmartSure.Identity.API.csproj" },
    @{ Name = "Claims API";    Project = "backend/services/claims/SmartSure.Claims.API/SmartSure.Claims.API.csproj" },
    @{ Name = "Policy API";    Project = "backend/services/policy/SmartSure.Policy.API/SmartSure.Policy.API.csproj" },
    @{ Name = "Admin API";     Project = "backend/services/admin/SmartSure.Admin.API/SmartSure.Admin.API.csproj" },
    @{ Name = "Gateway";       Project = "backend/gateway/SmartSure.Gateway/SmartSure.Gateway.csproj" }
)

foreach ($svc in $services) {
    Write-Host "  Starting $($svc.Name)..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; dotnet run --project $($svc.Project) --no-build" -WindowStyle Normal
}

# Start frontend
Write-Host "  Starting Frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root/frontend'; npx ng serve --port 4200" -WindowStyle Normal

Write-Host ""
Write-Host "All services started." -ForegroundColor Green
Write-Host ""
Write-Host "  Identity  -> http://localhost:5001" -ForegroundColor White
Write-Host "  Claims    -> http://localhost:5008" -ForegroundColor White
Write-Host "  Policy    -> http://localhost:5152" -ForegroundColor White
Write-Host "  Admin     -> http://localhost:5113" -ForegroundColor White
Write-Host "  Gateway   -> http://localhost:5083" -ForegroundColor White
Write-Host "  Frontend  -> http://localhost:4200" -ForegroundColor White
