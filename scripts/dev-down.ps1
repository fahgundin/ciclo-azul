<#
.SYNOPSIS
  Derruba o ambiente de desenvolvimento do Ciclo Azul.

.DESCRIPTION
  Encerra o backend (porta 3000) e o frontend (porta 5173) e derruba os containers.
  Os dados dos volumes sao mantidos, a menos que use -Reset.

.PARAMETER Reset
  Apaga tambem os volumes (banco, Keycloak e broker). O proximo dev-up reimporta o
  realm do Keycloak e recomeca sem dados.

.EXAMPLE
  .\scripts\dev-down.ps1
  .\scripts\dev-down.ps1 -Reset
#>
[CmdletBinding()]
param(
    [switch]$Reset
)

$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

foreach ($port in 3000, 5173) {
    $pids = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($procId in $pids) {
        Write-Host "Encerrando processo $procId (porta $port)"
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
}

# Container avulso da RS-05 (docker compose run), se existir.
docker rm -f ciclo-azul-rs05 *> $null

if ($Reset) {
    docker compose --profile mock down -v
} else {
    docker compose --profile mock down
}
Write-Host 'Ambiente derrubado.' -ForegroundColor Green
Write-Host 'As janelas do PowerShell do backend/frontend ficam abertas; pode fecha-las.'
