<#
.SYNOPSIS
  Sobe o Ciclo Azul inteiro em desenvolvimento (Windows / PowerShell).

.DESCRIPTION
  1. Confere Docker, Node e pnpm
  2. Cria o .env a partir do .env.example (se nao existir)
  3. Instala dependencias (se faltarem) e compila o pacote de contratos
  4. Sobe db, mqtt e keycloak (Docker Compose) e espera o Keycloak ficar pronto
  5. Sobe o backend (NestJS) numa nova janela e espera o /health responder
  6. Apaga do banco as leituras antigas do mock e o sobe (publica 48 h de historico
     e segue ao vivo)
  7. Sobe o frontend (Vite) numa nova janela

  O backend sobe ANTES do mock de proposito: o historico so e recebido se o backend
  ja estiver assinando o topico MQTT.

.PARAMETER NoMock
  Nao sobe o mock de sensores.

.PARAMETER InMemory
  Backend sem Postgres (dados em memoria, perdidos ao reiniciar).

.PARAMETER Rs05
  Sobe tambem a unidade data-center-rs-05 SEM historico (para o cenario "menos de 24 h
  de dados" da HU05). Como o dev-up limpa as leituras do mock a cada subida, use este
  parametro sempre que quiser a RS-05 de volta.

.PARAMETER Lan
  Permite acessar o app de outro dispositivo da rede local. Detecta o IP do PC, aponta
  frontend, backend e Keycloak para ele, sobe o Vite com --host e registra a origem
  http://<ip>:5173 no client do Keycloak. Acesse pelo IP (nao por localhost), inclusive
  neste PC. Exige liberar as portas 5173, 3000 e 8080 no firewall (veja a saida final).

.EXAMPLE
  .\scripts\dev-up.ps1
  .\scripts\dev-up.ps1 -NoMock
  .\scripts\dev-up.ps1 -Lan
#>
[CmdletBinding()]
param(
    [switch]$NoMock,
    [switch]$InMemory,
    [switch]$Rs05,
    [switch]$Lan
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Write-Step($text) { Write-Host "`n==> $text" -ForegroundColor Cyan }

function Test-Port($port) {
    [bool](Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue)
}

function Wait-Http($url, $label, $timeoutSeconds) {
    $deadline = (Get-Date).AddSeconds($timeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3
            if ($r.StatusCode -lt 500) { Write-Host "    $label pronto." -ForegroundColor Green; return }
        } catch {
            # Resposta HTTP 4xx tambem prova que o servico esta de pe.
            if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -lt 500) {
                Write-Host "    $label pronto." -ForegroundColor Green; return
            }
        }
        Start-Sleep -Seconds 3
    }
    throw "$label nao respondeu em $timeoutSeconds s ($url). Veja os logs."
}

function Get-LanIp {
    # IPv4 da interface ativa que tem gateway padrao (a que sai para a rede local).
    $cfg = Get-NetIPConfiguration |
        Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq 'Up' } |
        Select-Object -First 1
    if (-not $cfg) { throw 'Nao encontrei uma rede ativa com gateway para o modo -Lan.' }
    return @($cfg.IPv4Address)[0].IPAddress
}

function Get-DotEnvValue($key, $default) {
    if (Test-Path .env) {
        $line = Get-Content .env | Where-Object { $_ -match "^\s*$key=" } | Select-Object -First 1
        if ($line) { return ($line -split '=', 2)[1].Trim() }
    }
    return $default
}

function Add-KeycloakOrigin($origin) {
    # O realm importado so conhece http://localhost:5173. No modo -Lan registra tambem a
    # origem pelo IP, direto no client (idempotente), sem recriar o realm.
    $base = 'http://localhost:8080'
    $body = @{
        grant_type = 'password'
        client_id  = 'admin-cli'
        username   = Get-DotEnvValue 'KEYCLOAK_ADMIN' 'admin'
        password   = Get-DotEnvValue 'KEYCLOAK_ADMIN_PASSWORD' 'admin'
    }
    $token = (Invoke-RestMethod -Method Post -Uri "$base/realms/master/protocol/openid-connect/token" -Body $body).access_token
    $headers = @{ Authorization = "Bearer $token" }
    $clientUri = "$base/admin/realms/ciclo-azul/clients"
    $found = Invoke-RestMethod -Uri "${clientUri}?clientId=ciclo-azul-web" -Headers $headers
    # Filtra pelo clientId (a lista pode vir como array ou como objeto unico, conforme o PS).
    $client = @($found | Where-Object { $_.clientId -eq 'ciclo-azul-web' })[0]
    if (-not $client) {
        throw "Client ciclo-azul-web nao encontrado no Keycloak (resposta: $($found | ConvertTo-Json -Depth 3 -Compress))"
    }

    # Le os valores atuais sem assumir que as propriedades existem.
    $uris = @($client.PSObject.Properties['redirectUris'].Value)
    $origins = @($client.PSObject.Properties['webOrigins'].Value)
    $attrs = $client.PSObject.Properties['attributes'].Value
    $logoutRaw = if ($attrs) { $attrs.PSObject.Properties['post.logout.redirect.uris'].Value } else { '' }

    # Atualizacao parcial: o Keycloak so altera os campos enviados (o resto fica como esta).
    $update = @{
        redirectUris = @(($uris + "$origin/*") | Where-Object { $_ } | Select-Object -Unique)
        webOrigins   = @(($origins + $origin) | Where-Object { $_ } | Select-Object -Unique)
        attributes   = @{
            'post.logout.redirect.uris' = ((@("$logoutRaw" -split '##') + "$origin/*") |
                Where-Object { $_ } | Select-Object -Unique) -join '##'
        }
    }
    Invoke-RestMethod -Method Put -Uri "$clientUri/$($client.id)" -Headers $headers `
        -ContentType 'application/json' -Body ($update | ConvertTo-Json -Depth 5) | Out-Null
    Write-Host "    Origem $origin registrada no Keycloak." -ForegroundColor Green
}

# --- 1. Pre-requisitos -------------------------------------------------------
Write-Step 'Conferindo pre-requisitos'
foreach ($cmd in 'docker', 'node', 'pnpm') {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        throw "'$cmd' nao encontrado no PATH."
    }
}
docker info *> $null
if ($LASTEXITCODE -ne 0) {
    throw 'O Docker nao esta rodando. Abra o Docker Desktop, espere o engine iniciar e rode de novo.'
}
$ports = @{ 3000 = 'backend'; 5173 = 'frontend' }
foreach ($p in $ports.Keys) {
    if (Test-Port $p) {
        throw "A porta $p ($($ports[$p])) ja esta em uso. Rode .\scripts\dev-down.ps1 ou libere a porta."
    }
}

# --- 2. .env -----------------------------------------------------------------
Write-Step 'Preparando .env'
if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
    Write-Host '    .env criado a partir do .env.example.'
} else {
    Write-Host '    .env ja existe, mantido.'
}

# --- 3. Dependencias e contratos --------------------------------------------
Write-Step 'Dependencias e pacote de contratos'
if (-not (Test-Path node_modules)) {
    pnpm install --frozen-lockfile
    if ($LASTEXITCODE -ne 0) { throw 'pnpm install falhou.' }
}
pnpm --filter '@ciclo-azul/contracts' build
if ($LASTEXITCODE -ne 0) { throw 'Build de @ciclo-azul/contracts falhou.' }

# --- 4. Infraestrutura (Docker) ---------------------------------------------
Write-Step 'Subindo db, mqtt e keycloak'
docker compose up -d
if ($LASTEXITCODE -ne 0) { throw 'docker compose up falhou.' }
Write-Host '    Esperando o Keycloak (na primeira vez demora, importa o realm)...'
Wait-Http 'http://localhost:8080/realms/ciclo-azul' 'Keycloak' 240

$lanIp = $null
$backendEnv = ''
$frontendEnv = ''
if ($Lan) {
    $lanIp = Get-LanIp
    Write-Step "Modo rede local: usando o IP $lanIp"
    Add-KeycloakOrigin "http://${lanIp}:5173"
    $issuer = "http://${lanIp}:8080/realms/ciclo-azul"
    $backendEnv = "`$env:WEB_APP_ORIGIN='http://${lanIp}:5173'; `$env:OIDC_ISSUER='$issuer'; "
    $frontendEnv = "`$env:VITE_API_URL='http://${lanIp}:3000'; `$env:VITE_OIDC_ISSUER='$issuer'; " +
        "`$env:VITE_OIDC_REDIRECT_URI='http://${lanIp}:5173/callback'; "
}

# --- 5. Backend --------------------------------------------------------------
Write-Step 'Subindo o backend (nova janela)'
$dbUrl = 'postgres://ciclo_azul:ciclo_azul_dev@localhost:5432/ciclo_azul'
if ($InMemory) {
    $backendCmd = "${backendEnv}`$env:DATABASE_URL=''; pnpm --filter '@ciclo-azul/backend' start:dev"
} else {
    $backendCmd = "${backendEnv}`$env:DATABASE_URL='$dbUrl'; pnpm --filter '@ciclo-azul/backend' start:dev"
}
Start-Process powershell -WorkingDirectory $root -ArgumentList '-NoExit', '-Command', "`$Host.UI.RawUI.WindowTitle='Ciclo Azul - backend'; $backendCmd"
Wait-Http 'http://localhost:3000/health' 'Backend' 180

# --- 6. Mock de sensores -----------------------------------------------------
if (-not $NoMock) {
    if (-not $InMemory) {
        # O historico e republicado a cada subida; sem limpar, o banco persistente
        # acumularia varias series sobrepostas (grafico serrilhado). Apaga so o que o
        # mock gerou (sensorId 'mock-*'); leituras manuais/de sensores reais ficam.
        Write-Step 'Limpando leituras antigas do mock no banco'
        $cleanup = 'DO $$ BEGIN IF to_regclass(''public.water_readings'') IS NOT NULL THEN ' +
            'DELETE FROM water_readings WHERE "sensorId" LIKE ''mock-%''; END IF; END $$;'
        $cleanup | docker compose exec -T db psql -U ciclo_azul -d ciclo_azul -q
        if ($LASTEXITCODE -ne 0) { throw 'Falha ao limpar as leituras antigas do mock.' }
    }
    Write-Step 'Subindo o mock de sensores (48 h de historico + ao vivo)'
    docker compose --profile mock up -d --build mock-sensors
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao subir o mock-sensors.' }
}

if ($Rs05) {
    Write-Step 'Subindo a RS-05 (sem historico)'
    docker rm -f ciclo-azul-rs05 *> $null
    docker compose --profile mock run --rm -d --name ciclo-azul-rs05 `
        -e MOCK_UNIT_IDS=data-center-rs-05 -e MOCK_BACKFILL_HOURS=0 mock-sensors
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao subir a RS-05.' }
}

# --- 7. Frontend -------------------------------------------------------------
Write-Step 'Subindo o frontend (nova janela)'
$viteArgs = if ($Lan) { 'dev --host' } else { 'dev' }
Start-Process powershell -WorkingDirectory $root -ArgumentList '-NoExit', '-Command', "`$Host.UI.RawUI.WindowTitle='Ciclo Azul - frontend'; ${frontendEnv}pnpm --filter '@ciclo-azul/frontend' $viteArgs"
Wait-Http 'http://localhost:5173' 'Frontend' 90

$hostName = if ($Lan) { $lanIp } else { 'localhost' }
Write-Host "`nTudo no ar:" -ForegroundColor Green
Write-Host "  App       http://${hostName}:5173   (login: gestor / gestor)"
Write-Host "  API       http://${hostName}:3000"
Write-Host "  Keycloak  http://${hostName}:8080   (admin / admin)"
if ($Lan) {
    Write-Host "`nNo outro dispositivo, abra http://${lanIp}:5173" -ForegroundColor Yellow
    $fw = Get-NetFirewallRule -DisplayName 'Ciclo Azul (dev)' -ErrorAction SilentlyContinue
    if (-not $fw) {
        Write-Host 'Falta liberar as portas no firewall. PowerShell como administrador:' -ForegroundColor Yellow
        Write-Host '  New-NetFirewallRule -DisplayName "Ciclo Azul (dev)" -Direction Inbound -Protocol TCP -LocalPort 5173,3000,8080 -Action Allow -Profile Private -RemoteAddress LocalSubnet'
    }
}
Write-Host "`nPara derrubar: .\scripts\dev-down.ps1"
Start-Process "http://${hostName}:5173"
