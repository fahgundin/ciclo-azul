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
        in-memory-...           # repo in-memory (Postgres na F2)
      water-monitoring.module.ts
```

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

- F2: adapter Postgres (TypeORM) substituindo o repositorio in-memory.
- ~~F3: guard global de autenticacao (Keycloak/OIDC) + RBAC; `/health` publico.~~ **Concluido.**
- ~~F4: adapter de entrada MQTT alimentando `RegisterWaterReading`.~~ **Concluido.**
- ~~F5: gateway WebSocket emitindo atualizacoes ao frontend.~~ **Concluido.**
