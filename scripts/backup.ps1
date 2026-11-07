param(
  [string]$OutputDirectory = "backups"
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$outputPath = Join-Path $projectRoot $OutputDirectory
New-Item -ItemType Directory -Force -Path $outputPath | Out-Null

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupFile = Join-Path $outputPath "costa-sur-$timestamp.sql"
docker compose -f (Join-Path $projectRoot 'docker-compose.yml') exec -T postgres pg_dump -U costa_sur -d costa_sur > $backupFile
Write-Output "Respaldo creado: $backupFile"
