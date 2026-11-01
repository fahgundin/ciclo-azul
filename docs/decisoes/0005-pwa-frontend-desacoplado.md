# ADR 0005 — Frontend PWA React com camadas desacopladas

- **Status:** Aceito
- **Data:** 2026-11-01

## Contexto

O frontend será uma PWA em React, com possibilidade futura de migração para React
Native. React web e React Native não compartilham componentes de UI, mas podem
compartilhar lógica (hooks, serviços de API, tipos, estado).

## Decisão

Construir a PWA em React mantendo uma separação estrita entre:

- `core/` — lógica reutilizável (API client, realtime, hooks, auth OIDC, modelos),
  sem qualquer dependência de componentes web.
- `ui/` — componentes e páginas específicos da plataforma web.

Regra: `ui/` consome `core/`; `core/` nunca importa de `ui/`.

## Justificativa

- Numa futura migração para RN, `core/` migra e apenas `ui/` é reescrito.
- Reduz acoplamento e facilita testes da lógica isoladamente.

## Consequências

- Disciplina de imports entre camadas (verificável em revisão/lint).
- Tipos de contrato da API centralizados e compartilhados com o backend.
- PWA exige service worker, manifest e estratégia offline (`pwa/`).
