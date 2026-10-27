param(
    [string]$ConnectionFile,
    [string]$OutputName = (Get-Date -Format 'yyyyMMdd-HHmmss')
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$secretRoot = Join-Path $projectRoot 'deployment-secrets'
New-Item -ItemType Directory -Path $secretRoot -Force | Out-Null
$credentialsPath = Join-Path $secretRoot 'admin-credentials.json'
if (-not (Test-Path -LiteralPath $credentialsPath)) {
    $password = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(24))
    $salt = [Security.Cryptography.RandomNumberGenerator]::GetBytes(16)
    $hash = [Security.Cryptography.Rfc2898DeriveBytes]::Pbkdf2($password, $salt, 210000, [Security.Cryptography.HashAlgorithmName]::SHA256, 32)
    @{
        Username = 'admin'
        Password = $password
        PasswordHash = '210000:' + [Convert]::ToBase64String($salt) + ':' + [Convert]::ToBase64String($hash)
    } | ConvertTo-Json | Set-Content -LiteralPath $credentialsPath -Encoding utf8
}
$credentials = Get-Content -LiteralPath $credentialsPath -Raw | ConvertFrom-Json
$outputRoot = Join-Path $projectRoot "artifacts/$OutputName"
if (Test-Path -LiteralPath $outputRoot) { throw "Output already exists: $outputRoot" }
$publishRoot = Join-Path $outputRoot 'publish'
dotnet publish (Join-Path $projectRoot 'backend/AlHawdAlHadi.Api') -c Release -o $publishRoot --nologo -p:UseAppHost=false -p:AspNetCoreHostingModel=OutOfProcess
if ($LASTEXITCODE -ne 0) { throw 'dotnet publish failed' }

# IIS settings are included in the project's web.config for both VS and ZIP deployment.

# Current CMS edits are the initial production content. Do not ship sample bookings.
$seedRoot = Join-Path $publishRoot 'SeedData'
New-Item -ItemType Directory -Path $seedRoot -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $projectRoot 'backend/AlHawdAlHadi.Api/SeedData/runtime-cms.json') -Destination (Join-Path $seedRoot 'default-cms.json')
foreach ($relative in @('appsettings.Development.json', 'SeedData/default-bookings.json', 'SeedData/runtime-cms.json')) {
    $targetFile = Join-Path $publishRoot $relative
    if (Test-Path -LiteralPath $targetFile) { Remove-Item -LiteralPath $targetFile }
}
$production = @{
    Frontend = @{ RootPath = 'frontend'; AllowedOrigins = @() }
    Admin = @{ Enabled = $true; Username = $credentials.Username; PasswordHash = $credentials.PasswordHash }
    ConnectionStrings = @{ DefaultConnection = '' }
}
if ($ConnectionFile) {
    $production.ConnectionStrings.DefaultConnection = (Get-Content -LiteralPath $ConnectionFile -Raw).Trim()
    if ([string]::IsNullOrWhiteSpace($production.ConnectionStrings.DefaultConnection)) { throw 'Empty database connection string' }
}
$production | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $publishRoot 'appsettings.Production.json') -Encoding utf8
if ($ConnectionFile) {
    Copy-Item -LiteralPath (Join-Path $publishRoot 'appsettings.Production.json') -Destination (Join-Path $secretRoot 'appsettings.SmarterASP.json') -Force
    Compress-Archive -Path (Join-Path $publishRoot '*') -DestinationPath (Join-Path $outputRoot 'AlHawd-SmarterASP.zip')
    Write-Output "Deployment archive: $outputRoot/AlHawd-SmarterASP.zip"
} else {
    Write-Output "Prepared files: $publishRoot (database connection required before upload)"
}
Write-Output "Local admin credentials: $credentialsPath (keep private; do not upload)"
