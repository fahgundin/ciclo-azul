# Migração do protótipo de frontend (React + TypeScript)

> Acompanha o épico #37. Registra como as telas do protótipo em JavaScript puro
> (`ciclo_azul`) estão sendo reescritas no frontend oficial (`frontend/`), respeitando
> o [ADR 0005](decisoes/0005-pwa-frontend-desacoplado.md), e as **pendências** que a
> migração expõe (AGENTS §7).

## Diretrizes

- O protótipo é **referência de regras e fluxos**, não é copiado. Cada tela é
  reescrita em React + TypeScript.
- `core/` (agnóstico de plataforma) nunca importa de `ui/`. Regras e acesso a dados
  ficam em `core/`; componentes e páginas em `ui/`.
- **Login:** o login simulado do protótipo (senha de demonstração) **não** é portado.
  A autenticação é o Keycloak (OIDC + PKCE).
- **Perfis e permissões:** vêm das roles do realm no access token
  (`administrador`, `gestor-ambiental`, `operador`, `diretoria`). A matriz de
  permissões (`core/auth/permissions.ts`) só decide o que a interface **mostra**;
  a autorização real é do backend em cada rota.
- **Dados:** onde o backend ainda não tem endpoint, cada tela usa uma porta
  (interface) em `core/` com um **adapter em memória** derivado do seed do
  protótipo, marcado como pendência abaixo. Quando o endpoint existir, troca-se só
  o adapter.

## Como entregar uma tela

1. Regras de negócio e acesso a dados em `src/core/<feature>/`, com testes.
2. Página em `src/ui/`, com testes.
3. Registrar a página em `src/ui/pages.tsx`. Ela passa a aparecer no menu dos perfis
   com permissão para a rota (`src/core/navigation/routes.ts`).

## Estado das telas

| Tela | Rota | Issue | Estado |
|---|---|---|---|
| Shell, navegação e rotas por perfil | — | #38 | Entregue |
| Tipos de resíduo (R07) | `/residuos` | #25 | Entregue (antes da migração) |
| Sensores e leitura manual (R04) | `/sensores` | #39 | A fazer |
| Água em tempo real (R05) | `/agua` | #40 | A fazer |
| Lotes e destinação (R06) | `/residuos` | #41 | A fazer |
| Relatórios (R09) | `/relatorios` | #42 | A fazer |
| Limites e alertas (R03/R08) | `/alertas` | #43 | A fazer |
| Reuso (R02) | `/insights` | #44 | A fazer |
| Painel de KPIs (R10) | `/painel` | #45 | A fazer |
| Usuários (R01) | `/usuarios` | #46 | A fazer |
| Auditoria (RNF02) | `/auditoria` | #47 | A fazer |

Telas sem página registrada não aparecem no menu. Perfil sem nenhuma tela
disponível vê "Em construção".

## Pendências

### Backend sem endpoints para as telas

Hoje o backend expõe apenas tipos de resíduo (R07) e a ingestão de leituras de água
por MQTT com o canal WebSocket (R04/R05). Não existem endpoints REST para:

- listagem de sensores e de leituras, e lançamento de leitura manual (R04);
- histórico de consumo por unidade (R05);
- lotes de resíduo e destinação (R06);
- limites, alertas e prazo de destinação (R03/R08);
- relatórios (R09);
- oportunidades de reuso (R02);
- KPIs (R10);
- gestão de usuários além do que o Keycloak já oferece (R01);
- trilha de auditoria (RNF02).

Cada tela correspondente usará um adapter em memória até o endpoint existir.

### Classificação dos tipos de resíduo

O seed do protótipo classifica resíduos por **classe** (I, IIA, IIB) e **categoria**
(Químico, Metal pesado, Sólido, Efluente). O contrato atual
(`packages/contracts`, `WasteTypeView`) tem apenas `name` e `classification`.
Alterar o contrato e o backend é decisão de outra issue; **não faz parte** desta
migração.

### Leitura de tipos de resíduo pela Diretoria

No protótipo, a Diretoria consulta os resíduos (somente leitura). No backend,
`GET /waste-types` é restrito ao perfil Gestor Ambiental (`@Roles`). Por isso a rota
`/residuos` exige a permissão `waste.types` (somente Gestor). Quando o backend
liberar a leitura à Diretoria, passar a rota para `waste.view`.

### Prazo de destinação (R08)

O "prazo definido" de destinação de lotes ainda não tem valor oficial
(ver [escopo.md](escopo.md)). Os 15 e 30 dias do seed do protótipo são fictícios.

### Gráficos e telemetria

A telemetria do protótipo é simulada em tempo acelerado. Na migração, o tempo real
usa o `realtime-client` (WebSocket) já existente; a simulação não é portada.
