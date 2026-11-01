# Contribuindo com o Ciclo Azul

Guia de contribuição para a equipe. Regras específicas para assistentes de IA
estão em [`AGENTS.md`](AGENTS.md).

## Pré-requisitos

- Node.js (versão fixada no projeto), gerenciador de pacotes do repositório.
- Python (para `mock-sensors/`).
- Docker + Docker Compose (ambiente local: PostgreSQL, MQTT, Keycloak).

## Fluxo de trabalho

1. **Issue primeiro.** Todo trabalho parte de uma issue. Épicos (R01–R10) e
   fundação (F1–F5) já estão criados; veja os milestones `MVP` e `Fase 2`.
2. **Branch a partir de `main`:**
   - `feat/<area>-<resumo>` — nova funcionalidade (ex.: `feat/iot-mqtt-subscriber`)
   - `fix/<resumo>` — correção
   - `docs/<resumo>` / `chore/<resumo>` / `refactor/<resumo>`
3. **Implemente** respeitando a arquitetura (`docs/arquitetura.md`) e as restrições
   de `AGENTS.md`.
4. **Build + testes** verdes localmente antes de abrir PR.
5. **Abra o PR** referenciando a issue (`Closes #N`), com escopo pequeno.
6. **Revisão:** não faça merge sozinho em trabalho compartilhado sem revisão
   combinada com a equipe.

## Branch `main` protegida

- **Sem commit/push direto na `main`.** Apenas via Pull Request.
- Sem operações destrutivas (`push --force`, `reset --hard`) em branches
  compartilhadas.

## Commits

Usamos **Conventional Commits** em português:

```
tipo(escopo): descrição no imperativo

feat(iot): adiciona subscriber MQTT de leituras
fix(auth): corrige validação de token expirado
docs(arquitetura): atualiza diagrama hexagonal
```

Tipos: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `build`, `ci`.

## Pull Requests

- Título curto (< 70 caracteres).
- Descrição com: resumo das mudanças, o que foi testado, pendências.
- Referencie a issue (`Closes #N`).
- Mantenha o PR pequeno e ligado a uma issue/épico.

## Código

- **Identificadores em inglês**; documentação e comentários de negócio em português.
- **TypeScript:** ESLint + Prettier; tipagem estrita, evite `any`.
- **Python:** black/ruff; type hints quando possível.
- Escreva **testes** para regras de negócio e casos de uso.

## Arquitetura (resumo)

- **Backend:** Clean + Hexagonal. `domain/` não conhece framework/infra.
- **Frontend:** PWA React com `core/` (reutilizável) separado de `ui/` (web).
- **IoT:** contrato MQTT em `docs/contrato-iot.md` — mudanças incompatíveis exigem
  nova versão (`v2`).
- **Auth:** Keycloak; toda rota autenticada.

Decisões registradas em [`docs/decisoes/`](docs/decisoes/README.md) são imutáveis;
para mudá-las, abra um novo ADR.

## Segredos

Nunca comite `.env`, tokens ou credenciais. Use `.env.example` como modelo.
