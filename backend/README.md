# @ciclo-azul/backend

Backend NestJS (TypeScript) com **Arquitetura Limpa + Hexagonal**. Ver
`docs/arquitetura.md` e `docs/decisoes/0002-arquitetura-limpa-hexagonal.md`.

## Estrutura

```
src/
  main.ts                       # bootstrap (CORS restrito a origem da app)
  app.module.ts                 # modulo raiz
  health/                       # endpoint de verificacao
  modules/
    water-monitoring/           # R04/R05 (exemplo de modulo hexagonal)
      domain/                   # entidades + ports (sem framework/infra)
      application/              # casos de uso
      infrastructure/           # adapters (in-memory por ora; Postgres na F2)
      water-monitoring.module.ts
```

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
- F3: guard global de autenticacao (Keycloak/OIDC) + RBAC; `/health` vira publico.
- F4: adapter de entrada MQTT alimentando `RegisterWaterReading`.
- F5: gateway WebSocket emitindo atualizacoes ao frontend.
