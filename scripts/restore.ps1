param(
  [Parameter(Mandatory = $true)]
  [string]$BackupFile
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$resolvedBackup = (Resolve-Path (Join-Path $projectRoot $BackupFile)).Path
if (-not $resolvedBackup.EndsWith('.sql')) { throw 'El respaldo debe ser un archivo .sql.' }

Write-Warning 'La restauración sobrescribirá datos de la base costa_sur.'
$confirmation = Read-Host 'Escribe RESTAURAR para continuar'
if ($confirmation -cne 'RESTAURAR') { throw 'Restauración cancelada.' }

Get-Content -Raw $resolvedBackup | docker compose -f (Join-Path $projectRoot 'docker-compose.yml') exec -T postgres psql -U costa_sur -d costa_sur
Write-Output "Restauración completada desde: $resolvedBackup"
