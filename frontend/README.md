# @ciclo-azul/frontend

Frontend React (TypeScript) como **PWA**, com separacao estrita entre logica
reutilizavel e UI de plataforma. Ver `docs/decisoes/0005-pwa-frontend-desacoplado.md`.

## Estrutura

```
src/
  core/        # logica agnostica de plataforma (reutilizavel, inclusive em RN)
    api/       # cliente HTTP
    domain/    # modelos de apresentacao
    (realtime/ auth/ hooks/ chegam nas proximas issues)
  ui/          # componentes e paginas especificos da web
  main.tsx     # entrada
```

### Regra de dependencia

`ui/` consome `core/`. **`core/` nunca importa de `ui/`.** Numa futura migracao
para React Native, `core/` migra e apenas `ui/` e reescrito.

## Scripts

```bash
pnpm --filter @ciclo-azul/frontend dev     # dev server
pnpm --filter @ciclo-azul/frontend build
pnpm --filter @ciclo-azul/frontend test    # vitest
pnpm --filter @ciclo-azul/frontend lint
```

Variavel `VITE_API_URL` define a origem da API (default `http://localhost:3000`).
