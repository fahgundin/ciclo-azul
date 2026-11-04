# @ciclo-azul/frontend

Frontend React (TypeScript) como **PWA**, com separacao estrita entre logica
reutilizavel e UI de plataforma. Ver `docs/decisoes/0005-pwa-frontend-desacoplado.md`.

## Estrutura

```
src/
  core/        # logica agnostica de plataforma (reutilizavel, inclusive em RN)
    api/       # cliente HTTP
    auth/      # OIDC (authorization code + PKCE), roles do token e permissoes por perfil
    navigation/ # tabela de rotas e acesso por perfil
    realtime/  # cliente WebSocket (leituras em tempo real)
    domain/    # modelos de apresentacao
    (hooks/ chega nas proximas issues)
  ui/          # componentes e paginas especificos da web
    shell/     # casca do app: barra superior, navegacao inferior, conta
    components/ # Dialog, Flash (avisos), Icon
    pages.tsx  # registro das telas implementadas (aparecem no menu por perfil)
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

Os testes de `core/realtime/` dependem do pacote `@ciclo-azul/contracts`
compilado: rode `pnpm --filter @ciclo-azul/contracts build` antes (o `pnpm build`
da raiz ja faz isso na ordem certa). Use o Node da `.nvmrc` (22).

Navegacao e perfis: o menu mostra so as telas que o perfil do usuario (roles do
access token) pode acessar e que ja tem pagina registrada em `ui/pages.tsx`. Estado
da migracao do prototipo: `docs/migracao-frontend.md`.

Variavel `VITE_API_URL` define a origem da API (default `http://localhost:3000`).
