$testProjects = @(
    @{ Name = "Identity Service"; Path = "backend/tests/SmartSure.Identity.Tests/SmartSure.Identity.Tests.csproj" },
    @{ Name = "Policy Service  "; Path = "backend/tests/SmartSure.Policy.Tests/SmartSure.Policy.Tests.csproj" },
    @{ Name = "Claims Service  "; Path = "backend/tests/SmartSure.Claims.Tests/SmartSure.Claims.Tests.csproj" },
    @{ Name = "Admin Service   "; Path = "backend/tests/SmartSure.Admin.Tests/SmartSure.Admin.Tests.csproj" }
)

Write-Host "`nCustom Test Summary Report" -ForegroundColor Cyan
Write-Host "==========================`n" -ForegroundColor Cyan

$totalPassed = 0
$totalCount = 0

foreach ($project in $testProjects) {
    # Run dotnet test and capture output
    $lines = dotnet test $project.Path --nologo -v quiet 2>&1
    
    $passed = 0
    $total = 0
    $found = $false

    foreach ($line in $lines) {
        if ($line -match "Passed!\s+-\s+Failed:\s+(\d+),\s+Passed:\s+(\d+),\s+Skipped:\s+(\d+),\s+Total:\s+(\d+)") {
            $failed = $matches[1]
            $passed = $matches[2]
            $total = $matches[4]
            $found = $true
            break
        }
    }

    if ($found) {
        $totalPassed += [int]$passed
        $totalCount += [int]$total
        
        $color = if ([int]$failed -gt 0) { "Red" } else { "Green" }
        Write-Host "$($project.Name) : " -NoNewline
        Write-Host "$passed / $total Passed" -ForegroundColor $color
    } else {
        Write-Host "$($project.Name) : " -NoNewline
        Write-Host "No results found" -ForegroundColor Yellow
    }
}

Write-Host "`n--------------------------"
$finalColor = if ($totalPassed -eq $totalCount) { "Green" } else { "Red" }
Write-Host "Overall Result    : " -NoNewline
Write-Host "$totalPassed / $totalCount Passed" -ForegroundColor $finalColor
Write-Host ""
