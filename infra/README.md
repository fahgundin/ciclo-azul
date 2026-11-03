# Ambiente de desenvolvimento (Docker Compose)

Orquestra os servicos de apoio locais do Ciclo Azul. O `docker-compose.yml` fica na
raiz do repositorio. Ver tambem `docs/arquitetura.md`, secao 7.

## Servicos

| Servico        | Imagem                          | Porta (host)        | Papel |
|----------------|----------------------------------|---------------------|-------|
| `db`           | postgres:16-alpine               | `${POSTGRES_PORT}`  | Banco da aplicacao |
| `mqtt`         | eclipse-mosquitto:2              | 1883 / 9001 (ws)    | Broker de ingestao das leituras |
| `keycloak-db`  | postgres:16-alpine               | (interna)           | Banco do Keycloak |
| `keycloak`     | quay.io/keycloak/keycloak:26.0   | `${KEYCLOAK_HTTP_PORT}` | Identidade (OIDC) |
| `mock-sensors` | build `./mock-sensors`           | —                   | Publisher opcional (profile `mock`) |

O **backend** (NestJS) e o **frontend** (React) rodam **fora** do compose em dev
(ver `backend/README.md` e `frontend/README.md`).

## Pre-requisitos

- Docker e Docker Compose.
- Arquivo `.env` na raiz (copie de `.env.example`).

## Subir e derrubar

```bash
# 1. Criar o .env (apenas na primeira vez)
cp .env.example .env

# 2. Subir os servicos de apoio (db, mqtt, keycloak)
docker compose up -d

# 2b. Incluir o mock de sensores (opcional)
docker compose --profile mock up -d

# Ver status e logs
docker compose ps
docker compose logs -f keycloak

# Derrubar (mantem os dados nos volumes)
docker compose down

# Derrubar e APAGAR os dados (volumes)
docker compose down -v
```

## Acessos (valores padrao do .env.example)

- **Keycloak:** http://localhost:8080 — admin `admin` / `admin`.
- **PostgreSQL (app):** `localhost:5432` — base `ciclo_azul`.
- **MQTT:** `localhost:1883` (TCP) e `localhost:9001` (WebSocket).

## Notas

- Os healthchecks garantem que o Keycloak so inicia apos o `keycloak-db` estar
  saudavel (`depends_on: condition: service_healthy`).
- O broker aceita **conexoes anonimas** (apenas dev). Em producao, autenticacao do
  sensor e obrigatoria — ver `docs/contrato-iot.md`, secao 8.
- O Keycloak importa automaticamente o realm versionado
  `infra/keycloak/realm-ciclo-azul.json` (`start-dev --import-realm`), com o client
  `ciclo-azul-web` e os 4 roles (administrador, gestor-ambiental, operador,
  diretoria). A integracao de auth no backend (guard global + RBAC) faz parte da
  **F3** (issue #3), ja implementada.
- `.env` **nunca** e versionado. Apenas `.env.example`.
