# SmartSure - Create distributable zip (original project untouched)
$projectName = "SmartSure"
$source      = $PSScriptRoot
$temp        = Join-Path $env:TEMP "$projectName-export"
$output      = Join-Path $source "$projectName.zip"

# Folders/files to exclude from the zip
$exclude = @(
    "node_modules",
    "bin",
    "obj",
    ".angular",
    ".git",
    "Logs",
    ".env",           # exclude your personal credentials
    "*.zip"
)

Write-Host "Preparing export..." -ForegroundColor Cyan

# Clean temp if exists
if (Test-Path $temp) { Remove-Item $temp -Recurse -Force }
New-Item -ItemType Directory -Path $temp | Out-Null

# Copy files excluding unwanted folders
Get-ChildItem -Path $source -Recurse | Where-Object {
    $item = $_.FullName
    $skip = $false
    foreach ($ex in $exclude) {
        if ($item -like "*\$ex" -or $item -like "*\$ex\*" -or $item -like "*/$ex" -or $item -like "*/$ex/*") {
            $skip = $true
            break
        }
    }
    -not $skip
} | ForEach-Object {
    $dest = $_.FullName.Replace($source, $temp)
    if ($_.PSIsContainer) {
        New-Item -ItemType Directory -Path $dest -Force | Out-Null
    } else {
        $destDir = Split-Path $dest -Parent
        if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
        Copy-Item $_.FullName -Destination $dest -Force
    }
}

# Also copy .env.example so receiver knows what's needed
$envExample = Join-Path $source ".env.example"
if (Test-Path $envExample) {
    Copy-Item $envExample -Destination (Join-Path $temp ".env.example") -Force
}

# Create zip
if (Test-Path $output) { Remove-Item $output -Force }
Compress-Archive -Path "$temp\*" -DestinationPath $output

# Cleanup temp
Remove-Item $temp -Recurse -Force

Write-Host "Done! Zip created at: $output" -ForegroundColor Green
Write-Host "Note: .env was excluded. Share it separately if needed." -ForegroundColor Yellow
