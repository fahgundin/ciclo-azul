# @ciclo-azul/backend

Backend NestJS (TypeScript) com **Arquitetura Limpa + Hexagonal**. Ver
`docs/arquitetura.md` e `docs/decisoes/0002-arquitetura-limpa-hexagonal.md`.

## Estrutura

```
src/
  main.ts                       # bootstrap (CORS restrito a origem da app)
  app.module.ts                 # modulo raiz
  health/                       # endpoint de verificacao (@Public)
  auth/                         # autenticacao/autorizacao (Keycloak/OIDC)
    jwt-auth.guard.ts           # guard global: exige token OIDC valido
    roles.guard.ts              # RBAC conforme @Roles
    public.decorator.ts         # @Public isenta rota do guard global
    roles.decorator.ts          # @Roles exige papeis
    oidc-token.verifier.ts      # valida JWT via JWKS (jose)
    roles.ts                    # os 4 roles do sistema
  modules/
    water-monitoring/           # R04/R05 (exemplo de modulo hexagonal)
      domain/                   # entidades + ports (sem framework/infra)
      application/              # casos de uso + port ReadingPublisher
      infrastructure/
        mqtt/                   # ingestao: subscriber, validacao, dedup, processor
        ws/                     # gateway WebSocket (tempo real, implementa o port)
        persistence/            # entidade ORM + mapper + adapter Postgres
        in-memory-...           # repo in-memory (fallback sem DATABASE_URL)
      water-monitoring.module.ts
    waste-management/           # R07 (tipos de residuo)
      domain/ application/ infrastructure/ (mesma estrutura)
  database/                     # DatabaseModule (TypeORM/Postgres por env)
```

### Persistencia (Postgres via TypeORM)

Os modulos escolhem o adapter de repositorio por ambiente: com `DATABASE_URL`
definido usam **Postgres** (TypeORM); sem ele, caem no **in-memory** (dev/testes/CI).
As entidades ORM e mappers ficam em `infrastructure/persistence/` — o dominio nao
conhece o ORM. `synchronize` so em dev; migrations reais para producao sao pendencia.

### API do R04 — sensores e leituras manuais

Toda rota exige token (guard global); o papel e checado por `@Roles`.

| Rota | Papeis | Descricao |
|---|---|---|
| `POST /sensors` | operador, administrador | Vincula um sensor a uma unidade (`{ sensorId, unitId }`); fica "Conectado". |
| `GET /sensors` | todos | Lista os sensores vinculados. |
| `POST /water-readings/manual` | operador | Lanca leitura manual (`{ unitId, valueInLiters, date }`). |
| `GET /water-readings?unitId=` | todos | Historico de consumo da unidade (mais recente primeiro). |

Regras da leitura manual (dominio, `domain/manual-reading.ts`):

- so em unidade **sem sensor vinculado** (senao `409`);
- volume **maior que zero** (senao `400`);
- data **entre hoje e 28 dias atras**, contados do inicio do dia UTC (senao `400`).

Tambem `409` ao vincular um sensor ja vinculado e `400` para identificador de sensor
invalido (3 a 64 caracteres; `manual` e reservado). O contrato dos payloads esta em
`@ciclo-azul/contracts` (`sensor.ts`).

**Ainda nao cobre** (ver `docs/migracao-frontend.md`): cadastro de unidades,
vinculo operador↔unidade, retificacao de leitura com justificativa e desvinculo de
sensor.

### Fluxo de ingestao e tempo real

```
sensor/mock --MQTT--> MqttReadingSubscriber -> MqttReadingProcessor
  -> (valida + deduplica) -> RegisterWaterReading (persiste)
  -> ReadingPublisher (port) -> WaterMonitoringGateway --WS--> frontend (por unidade)
```

O gateway autentica o cliente no handshake (token OIDC) e emite o evento `reading`
apenas para a room `unit:<unitId>` assinada pelo cliente.

### Autenticacao e autorizacao

- **Toda rota exige token OIDC valido** (Keycloak), via `JwtAuthGuard` global.
  Excecao unica: rotas marcadas com `@Public()` (ex.: `/health`).
- O token e validado por **JWKS** (chaves publicas do realm), com checagem de
  `issuer` e `audience` — sem introspeccao remota por request.
- **RBAC:** anote a rota com `@Roles(APP_ROLES.OPERADOR)` (ou varios) e o
  `RolesGuard` exige ao menos um dos papeis.
- Config por ambiente: `OIDC_ISSUER`, `OIDC_AUDIENCE`, `WEB_APP_ORIGIN` (CORS).
- O realm, client e os 4 roles ficam versionados em
  `infra/keycloak/realm-ciclo-azul.json` (importado pelo Keycloak no compose).

### Regra da dependencia

`domain/` **nao importa** NestJS, banco, cliente MQTT, Keycloak ou qualquer
infraestrutura. Os ports (interfaces) ficam no dominio; os adapters os implementam
em `infrastructure/` e sao ligados via DI no `*.module.ts`.

## Scripts

```bash
pnpm --filter @ciclo-azul/backend start:dev   # dev com watch
pnpm --filter @ciclo-azul/backend build
pnpm --filter @ciclo-azul/backend test        # jest
pnpm --filter @ciclo-azul/backend lint
```

## Pendencias das proximas issues

- ~~F2: adapter Postgres (TypeORM) substituindo o repositorio in-memory.~~ **Concluido** (#23); migrations de producao pendentes.
- ~~F3: guard global de autenticacao (Keycloak/OIDC) + RBAC; `/health` publico.~~ **Concluido.**
- ~~F4: adapter de entrada MQTT alimentando `RegisterWaterReading`.~~ **Concluido.**
- ~~F5: gateway WebSocket emitindo atualizacoes ao frontend.~~ **Concluido.**
