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

### API do R06 — destinacao de lotes de residuos

| Rota | Papeis | Descricao |
|---|---|---|
| `POST /waste-lots` | gestor-ambiental | Registra a destinacao de um lote; o lote nasce **Destinado**. |
| `GET /waste-lots` | gestor-ambiental, diretoria | Lista os lotes (data de destinacao mais recente primeiro). |

Corpo do `POST` (`RegisterDisposalInput`, em `@ciclo-azul/contracts`):
`wasteTypeId`, `location`, `receiverCompany`, `license`, `date`, `quantity`,
`proofReference`. Todos os erros de validacao respondem `400` com a mensagem do
dominio, na ordem: tipo, local, empresa, licenca, data, quantidade e comprovante.

- **Comprovante obrigatorio:** sem ele, `400` com
  `"O comprovante de destinação é obrigatório"` (criterio de aceitacao do R06). E uma
  **referencia** (texto ou URL do documento); upload de arquivo nao faz parte desta
  versao.
- `wasteTypeId` deve ser um tipo ja cadastrado (R07); senao `400`
  `"Tipo de resíduo não encontrado"`.
- `quantity` maior que zero; `date` valida e **nao futura**.

**Ainda nao cobre** (ver `docs/migracao-frontend.md`): licenca valida da empresa
receptora, dupla confirmacao para residuo perigoso, unidade de medida da quantidade
e lotes sem destinacao (R08).

### Fluxo de ingestao e tempo real

```
sensor/mock --MQTT--> MqttReadingSubscriber -> MqttReadingProcessor
  -> (valida + deduplica) -> RegisterWaterReading (persiste)
  -> ReadingPublisher (port) -> WaterMonitoringGateway --WS--> frontend (por unidade)
```

O gateway autentica o cliente no handshake (token OIDC) e emite o evento `reading`
apenas para a room `unit:<unitId>` assinada pelo cliente.

### API do R05 — estado de consumo por unidade

Complementa o WebSocket: o WebSocket entrega **cada leitura nova**; estas rotas dao o
**estado atual**, usado ao abrir o painel e para recalcular. Todas exigem token e sao
liberadas aos quatro perfis.

| Rota | Descricao |
|---|---|
| `GET /water-status` | Estado de cada unidade conhecida (com leitura ou com sensor vinculado), ordenado por `unitId`. |
| `GET /water-status/:unitId` | Estado de uma unidade. Sem nenhuma leitura devolve `no-data` (nao ha cadastro de unidades). |

Resposta (`UnitConsumptionStatus`, em `@ciclo-azul/contracts`): `unitId`, `state`,
`currentValueInLiters`, `lastReadingAt`, `lastReadingType` e `staleAfterMinutes`.

- **`live`:** a ultima leitura tem ate **15 minutos** (exatamente 15 ainda e `live`).
- **`stale`:** a ultima leitura tem **mais de 15 minutos** — exibir **"Sem dados
  recentes"**. O ultimo valor conhecido continua na resposta.
- **`no-data`:** a unidade nunca teve leitura (ex.: sensor vinculado que ainda nao
  enviou nada).
- "Ultima leitura" e a de maior **timestamp da medicao**, nao a ultima a chegar.
  Leituras manuais contam como qualquer outra.

**A transicao para "Sem dados recentes" nao e emitida pelo WebSocket** (a regra e
calculada na consulta, ver `docs/contrato-iot.md`, secao 5). O cliente deve recalcular
com `lastReadingAt` e `staleAfterMinutes` (ou consultar de novo) em intervalos curtos.

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
