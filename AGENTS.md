# AGENTS.md — Restrições para Assistentes de IA

> Este arquivo define **regras obrigatórias** para qualquer assistente de IA que
> trabalhe no repositório **Ciclo Azul**. Vale para todos os colaboradores e suas
> ferramentas de IA. Leia antes de qualquer alteração.
>
> Documentos de referência: [`docs/README.md`](docs/README.md),
> [`docs/arquitetura.md`](docs/arquitetura.md),
> [`docs/decisoes/`](docs/decisoes/README.md),
> [`docs/contrato-iot.md`](docs/contrato-iot.md),
> [`CONTRIBUTING.md`](CONTRIBUTING.md).

## 1. Regras inegociáveis (NÃO FAÇA)

- **NÃO** faça commit ou push direto na branch `main`. Todo trabalho vai por
  **branch + Pull Request**.
- **NÃO** use `git push --force`, `reset --hard`, `clean -f` ou `branch -D` em
  branches compartilhadas.
- **NÃO** altere arquivos em `docs/decisoes/` (ADRs são imutáveis). Para mudar uma
  decisão, crie um **novo ADR** que supersede o anterior.
- **NÃO** viole a regra da dependência da arquitetura hexagonal: `domain/` não pode
  importar framework (NestJS), banco, cliente MQTT, Keycloak ou qualquer
  infraestrutura. (ver `docs/arquitetura.md`)
- **NÃO** importe de `ui/` dentro de `core/` no frontend. `core/` é agnóstico de
  plataforma.
- **NÃO** crie rotas de API sem autenticação. Toda rota exige token válido (Keycloak).
- **NÃO** exponha a API como produto a terceiros nem crie endpoints públicos de
  negócio. CORS restrito à origem da aplicação. (ver `docs/arquitetura.md`)
- **NÃO** comite segredos (`.env`, tokens, chaves, credenciais). Use `.env.example`.
- **NÃO** versione o export bruto do Notion (`_prd_export/`, `*.zip`) — já está no
  `.gitignore`.
- **NÃO** altere o contrato MQTT de forma incompatível sem versionar (`v2`). Ver
  seção 7 de `docs/contrato-iot.md`.
- **NÃO** adicione dependências com versões abertas; **fixe versões**. Prefira
  bibliotecas conhecidas e mantidas.
- **NÃO** abra PR sem testes para o código de comportamento adicionado/alterado,
  nem com a suíte de testes quebrada. **Testes são obrigatórios neste repositório**
  (ver seção 8).

## 2. Regras obrigatórias (FAÇA)

- **Trabalhe sempre a partir de uma issue.** Referencie a issue no PR (`Closes #N`).
- **Respeite a arquitetura:** Clean + Hexagonal no backend; `core/` vs `ui/` no
  frontend. Novos módulos seguem a estrutura `domain/ application/ infrastructure/`.
- **Escreva testes** para regras de negócio e casos de uso. Rode build e testes
  antes de abrir PR.
- **Atualize a documentação** em `docs/` quando mudar comportamento, contrato ou
  arquitetura.
- **Mantenha o escopo do PR pequeno** e ligado a uma issue/épico.
- **Valide payloads externos** (MQTT, HTTP, formulários) na borda, antes do domínio.

## 3. Convenções de código

- **Linguagem do código:** identificadores, nomes de variáveis/funções/classes em
  **inglês**.
- **Linguagem de documentação e comentários de negócio:** **português**.
- **TypeScript:** ESLint + Prettier (configuração do projeto). Tipagem estrita;
  evite `any`.
- **Python (mock-sensors):** formatação com black/ruff; type hints quando possível.
- **Tipos de contrato da API** centralizados e compartilhados entre back e front;
  não duplicar definições divergentes.

## 4. Fluxo de trabalho (resumo)

1. Pegue/abra uma **issue** (há épicos R01–R10 e fundação F1–F5; ver milestones
   `MVP` e `Fase 2`).
2. Crie uma **branch** a partir de `main`: `feat/<area>-<resumo>` ou
   `fix/<resumo>` (ver `CONTRIBUTING.md`).
3. Implemente respeitando a arquitetura e as restrições acima.
4. **Build + testes** verdes localmente.
5. Abra **PR** referenciando a issue. Não faça merge sozinho em trabalho
   compartilhado sem revisão combinada.

## 5. Commits

- **Conventional Commits** em **português**:
  `tipo(escopo): descrição` — ex.: `feat(iot): adiciona subscriber MQTT de leituras`.
- Tipos: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `build`, `ci`.

## 6. Ordem de execução (MVP primeiro)

Respeite as dependências entre issues:

1. **Fundação:** F1 (scaffolding) → F2 (Docker) / F3 (Keycloak) → F4 (MQTT) → F5 (WebSocket).
2. **MVP (Alta):** R07 e R04 → R06 (após R07) → R05 (após R04) → R09 (após R04/R06/R07).
3. **Fase 2 (Média/Baixa):** R01, R03, R02, R10, R08.

Não inicie um requisito cujas dependências ainda não estejam prontas.

## 7. Em caso de dúvida

- Se uma mudança exigir contrariar uma decisão registrada em `docs/decisoes/`,
  **pare e proponha um novo ADR** em vez de improvisar.
- Se faltar informação (regra de negócio, valor, prazo), **registre a pendência**
  (ex.: nos "pontos a confirmar" dos docs) em vez de inventar valores.

## 8. Testes (obrigatórios)

> **Este é um repositório dirigido a testes. Testes não são opcionais.**

- **Todo código de comportamento** (regras de negócio, casos de uso, endpoints,
  adapters, lógica de frontend) **deve vir acompanhado de testes automatizados**
  no mesmo PR.
- **Nenhum PR é aberto com a suíte de testes quebrada.** Build e testes precisam
  estar verdes localmente antes de abrir o PR.
- **Correção de bug** exige um teste que reproduz o bug (e passa após a correção).
- A cobertura deve focar nas regras de negócio e casos de uso do domínio; prefira
  testes rápidos e isolados (o domínio hexagonal é testável sem banco/broker).
- Validação de payloads externos (MQTT, HTTP, formulários) deve ter testes de
  casos válidos **e** inválidos.
- Mudanças que não alteram comportamento (ex.: `docs`, ajustes de formatação) estão
  dispensadas de novos testes, mas **não podem** quebrar a suíte existente.
- Pipelines de CI executarão a suíte a cada push/PR quando forem configurados; a
  ausência de CI **não** dispensa a obrigação de escrever e rodar testes.
